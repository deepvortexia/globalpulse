import { TwitterApi } from "twitter-api-v2";
import { getTopStories } from "@/lib/articles";
import { getServiceRoleClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import type { Article } from "@/types";

// Background job — posts one EN Top Story to X (@GlobeVortex) per run, triggered
// on a schedule by .github/workflows/post-to-x.yml. Never user-facing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// X calls are quick, but keep a comfortable budget for the two-call post + reply.
export const maxDuration = 60;

// X's 2026 algorithm suppresses tweets with external links for non-Premium
// accounts. Workaround: tweet the headline as link-free text, then reply to that
// tweet with the bare article URL (replies are far less suppressed). This is the
// documented 2-call pattern: POST /2/tweets, then POST /2/tweets with
// reply.in_reply_to_tweet_id. Auth is OAuth 1.0a user-context (posts AS the
// account), which twitter-api-v2 handles natively from the four X_* secrets.

const TWEET_MAX = 280;
const ELLIPSIS = "…";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // GitHub Actions sends `Authorization: Bearer <CRON_SECRET>` (see workflow).
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// OAuth 1.0a user-context client built from the four X app/user credentials.
// Throws (rather than posting anonymously) if any secret is missing.
function getXClient(): TwitterApi {
  const appKey = process.env.X_CONSUMER_KEY;
  const appSecret = process.env.X_CONSUMER_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error(
      "Missing X credentials: X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET are all required.",
    );
  }
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
}

function categoryEmoji(category: Article["category"]): string {
  return CATEGORIES.find((c) => c.id === category)?.emoji ?? "";
}

// Headline text only — no URL, no hashtags (X treats 3+ as spam and 0-1 adds
// nothing). Prefixes a category emoji and truncates to stay under 280. The emoji
// weighs 2 in X's counter, so we budget conservatively rather than by JS length.
export function formatTweet(article: Article): string {
  const emoji = categoryEmoji(article.category);
  const prefix = emoji ? `${emoji} ` : "";
  // Reserve 2 for the emoji's weighted width plus its trailing space.
  const budget = TWEET_MAX - (emoji ? 3 : 0);
  const title = article.title.trim();
  const clipped =
    title.length > budget ? title.slice(0, budget - ELLIPSIS.length).trimEnd() + ELLIPSIS : title;
  return prefix + clipped;
}

// Which of the ranked Top Stories haven't been posted yet. One DB round-trip:
// look up only the candidate URLs in x_posts, then filter in memory preserving
// the incoming (best-first) order.
async function firstUnposted(
  db: ReturnType<typeof getServiceRoleClient>,
  stories: Article[],
): Promise<Article | null> {
  if (stories.length === 0) return null;
  const urls = stories.map((s) => s.url);
  const { data, error } = await db.from("x_posts").select("article_url").in("article_url", urls);
  if (error) throw new Error(`Supabase x_posts read failed: ${error.message}`);
  const posted = new Set((data ?? []).map((r) => (r as { article_url: string }).article_url));
  return stories.find((s) => !posted.has(s.url)) ?? null;
}

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorized(req)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Dry-run (?dryRun=1): run the full selection + formatting pipeline but skip
  // the X post/reply and the x_posts insert. Lets you preview what would be
  // tweeted without spending a post or marking the story as used. Trigger via
  // the workflow's manual "Run workflow" button or a one-off curl.
  const dryRun = /^(1|true)$/i.test(new URL(req.url).searchParams.get("dryRun") ?? "");

  try {
    const db = getServiceRoleClient();

    // 1. Current EN Top Stories, best-first, minus anything already tweeted.
    const stories = await getTopStories("en");
    const article = await firstUnposted(db, stories);

    if (!article) {
      return Response.json({
        success: true,
        dryRun,
        posted: false,
        reason: stories.length === 0 ? "no top stories available" : "all top stories already posted",
        candidates: stories.length,
        duration: Date.now() - start,
      });
    }

    // 2. Format the link-free headline. In dry-run we stop here and report what
    //    would go out — no X calls, no x_posts write, story stays repostable.
    const text = formatTweet(article);

    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        posted: false,
        articleId: article.id,
        articleUrl: article.url,
        wouldTweet: text,
        tweetLength: text.length,
        wouldReplyWith: article.url,
        candidates: stories.length,
        duration: Date.now() - start,
      });
    }

    // 3. Post the link-free headline, then reply with the bare URL.
    const client = getXClient();
    const rw = client.readWrite;

    const tweet = await rw.v2.tweet(text);
    const tweetId = tweet.data.id;

    // The reply carries the link. If it fails we still consider the story posted
    // (the headline is out) — we log loudly and record with a null reply id
    // rather than reposting the headline on the next run.
    let replyTweetId: string | null = null;
    try {
      const reply = await rw.v2.tweet(article.url, {
        reply: { in_reply_to_tweet_id: tweetId },
      });
      replyTweetId = reply.data.id;
    } catch (replyError) {
      console.error(
        `[cron/post-to-x] Headline tweet ${tweetId} posted but link reply failed for "${article.url}":`,
        replyError,
      );
    }

    // 3. Record so we never repost. UNIQUE(article_url) is the final guard
    //    against a double-post race; a conflict here means it's already logged.
    const { error: insertError } = await db.from("x_posts").insert({
      article_id: article.id,
      article_url: article.url,
      tweet_id: tweetId,
      reply_tweet_id: replyTweetId,
    });
    if (insertError) {
      // The tweet is already public at this point — surface the bookkeeping
      // failure without failing the whole run.
      console.error(
        `[cron/post-to-x] Posted tweet ${tweetId} but failed to record x_posts row:`,
        insertError.message,
      );
    }

    return Response.json({
      success: true,
      posted: true,
      articleId: article.id,
      articleUrl: article.url,
      tweetId,
      replyTweetId,
      recorded: !insertError,
      duration: Date.now() - start,
    });
  } catch (error) {
    // Do NOT retry in a loop — protect the budget. Log and exit non-200.
    console.error("[cron/post-to-x] Run failed:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Post-to-X run failed",
        duration: Date.now() - start,
      },
      { status: 500 },
    );
  }
}

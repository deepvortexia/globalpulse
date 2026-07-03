import { ApiResponseError, TwitterApi } from "twitter-api-v2";
import { getTopStories } from "@/lib/articles";
import { getServiceRoleClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import { canonicalizeUrl } from "@/lib/dedup";
import type { Article } from "@/types";

// Background job — posts one EN Top Story to X (@GlobeVortex) per run, triggered
// on a schedule by .github/workflows/post-to-x.yml. Never user-facing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// X calls are quick, but keep a comfortable budget for the two-call post + reply.
export const maxDuration = 60;

// X's 2026 algorithm suppresses tweets with external links for non-Premium
// accounts. Workaround: tweet the headline as link-free text, then reply to that
// tweet with our own article-page link (replies are far less suppressed, and the
// link drives traffic to GlobeVortex, not the publisher). This is the documented
// 2-call pattern: POST /2/tweets, then POST /2/tweets with
// reply.in_reply_to_tweet_id. Auth is OAuth 1.0a user-context (posts AS the
// account), which twitter-api-v2 handles natively from the four X_* secrets.

const TWEET_MAX = 280;
const ELLIPSIS = "…";

// Our own site, so the reply link drives traffic to GlobeVortex's article page
// (which carries the "read original source" outbound link) rather than straight
// to the publisher. Must match the canonical pattern in
// src/app/article/[slug]/page.tsx: `${SITE}/article/${article.id}`.
const SITE = "https://globevortex.com";

// Internal article-page URL for an article — never the external source
// (`article.url`), which only appears as the outbound link on that page.
function articlePageUrl(article: Article): string {
  return `${SITE}/article/${article.id}`;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // GitHub Actions sends `Authorization: Bearer <CRON_SECRET>` (see workflow).
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// The four OAuth 1.0a user-context credentials, keyed by their env var name so
// missing ones can be named explicitly (never their values — those never get
// logged or returned).
const X_CREDENTIAL_ENV_VARS = [
  "X_CONSUMER_KEY",
  "X_CONSUMER_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
] as const;

// Names (not values) of any of the four required X credentials that are absent
// or empty. Empty array means all four are present.
function missingXCredentials(): string[] {
  return X_CREDENTIAL_ENV_VARS.filter((name) => !process.env[name]);
}

// OAuth 1.0a user-context client built from the four X app/user credentials.
// Callers must check missingXCredentials() first — this assumes all four exist.
function getXClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.X_CONSUMER_KEY!,
    appSecret: process.env.X_CONSUMER_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  });
}

// Pulls X's actual error payload (code, message, detail) out of a twitter-api-v2
// exception so failures are debuggable instead of a bare "Request failed with
// code 403". ApiResponseError carries the parsed response body in `.data`
// (X's ErrorV1/ErrorV2 shape); anything else falls back to its message.
function describeXError(error: unknown): { message: string; detail: unknown } {
  if (error instanceof ApiResponseError) {
    return {
      message: `X API error ${error.code}: ${error.message}`,
      detail: { code: error.code, data: error.data, rateLimit: error.rateLimit },
    };
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    detail: null,
  };
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
  // Canonicalize before comparing/storing so a Google-News-sourced story that
  // reappears under a fresh (but otherwise identical after canonicalization)
  // redirect URL doesn't get treated as new and re-tweeted.
  const urls = stories.map((s) => canonicalizeUrl(s.url));
  const { data, error } = await db.from("x_posts").select("article_url").in("article_url", urls);
  if (error) throw new Error(`Supabase x_posts read failed: ${error.message}`);
  const posted = new Set((data ?? []).map((r) => (r as { article_url: string }).article_url));
  return stories.find((s) => !posted.has(canonicalizeUrl(s.url))) ?? null;
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

    // 2. Format the link-free headline + our internal article-page link. In
    //    dry-run we stop here and report what would go out — no X calls, no
    //    x_posts write, story stays repostable.
    const text = formatTweet(article);
    const replyLink = articlePageUrl(article);

    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        posted: false,
        articleId: article.id,
        articleUrl: article.url,
        wouldTweet: text,
        tweetLength: text.length,
        wouldReplyWith: replyLink,
        candidates: stories.length,
        duration: Date.now() - start,
      });
    }

    // 3. Verify credentials are present before touching the X API, so a missing
    //    secret produces a clear "which one" error instead of an opaque 403 from
    //    OAuth signing with an undefined value. Names only — never values.
    const missingCreds = missingXCredentials();
    if (missingCreds.length > 0) {
      console.error(`[cron/post-to-x] Missing X credentials: ${missingCreds.join(", ")}`);
      return Response.json(
        {
          success: false,
          error: `Missing X credentials: ${missingCreds.join(", ")}`,
          missingCredentials: missingCreds,
          duration: Date.now() - start,
        },
        { status: 500 },
      );
    }

    // 4. Post the link-free headline, then reply with our article-page link.
    const client = getXClient();
    const rw = client.readWrite;

    const tweet = await rw.v2.tweet(text);
    const tweetId = tweet.data.id;

    // The reply carries the link. If it fails we still consider the story posted
    // (the headline is out) — we log loudly and record with a null reply id
    // rather than reposting the headline on the next run.
    let replyTweetId: string | null = null;
    try {
      const reply = await rw.v2.tweet(replyLink, {
        reply: { in_reply_to_tweet_id: tweetId },
      });
      replyTweetId = reply.data.id;
    } catch (replyError) {
      const { message, detail } = describeXError(replyError);
      console.error(
        `[cron/post-to-x] Headline tweet ${tweetId} posted but link reply failed for "${replyLink}": ${message}`,
        detail ?? replyError,
      );
    }

    // 5. Record so we never repost. UNIQUE(article_url) is the final guard
    //    against a double-post race; a conflict here means it's already logged.
    const { error: insertError } = await db.from("x_posts").insert({
      article_id: article.id,
      article_url: canonicalizeUrl(article.url),
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
    // Do NOT retry in a loop — protect the budget. Log and exit non-200. For X
    // API failures (e.g. the headline tweet itself), surface X's actual error
    // payload (code/message/detail) rather than the generic
    // "Request failed with code 403" — that's what makes the GitHub Actions log
    // actionable instead of a dead end.
    const { message, detail } = describeXError(error);
    console.error("[cron/post-to-x] Run failed:", message, detail ?? error);
    return Response.json(
      {
        success: false,
        error: message,
        errorDetail: detail,
        duration: Date.now() - start,
      },
      { status: 500 },
    );
  }
}

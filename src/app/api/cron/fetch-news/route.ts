import Anthropic from "@anthropic-ai/sdk";
import { fetchAllFeedsRaw, inferCategory } from "@/lib/rss-fetcher";
import { getServiceRoleClient } from "@/lib/supabase";
import { submitToIndexNow } from "@/lib/indexnow";
import { findBestMatch, NEAR_DUP_AUTO_DROP, type TitledCandidate } from "@/lib/dedup";
import { mapPool } from "@/lib/async-pool";
import type { Article, CategoryId, Language } from "@/types";

// Background job — runs on a schedule (see vercel.json), never user-facing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous budget: batched RSS parsing + a bounded number of Haiku calls.
export const maxDuration = 300;

const SUMMARY_MODEL = "claude-haiku-4-5";
// Bound per-run work so the first run against an empty DB (≈500-1000 articles)
// doesn't blow the time/cost budget. Successive 15-min runs backfill the rest.
const MAX_NEW_PER_RUN = Number(process.env.CRON_MAX_ARTICLES ?? 60);
// Cap the candidate set handed to the near-dup pass. That pass is O(N×M) in
// title-similarity comparisons and makes a sequential Haiku tie-break call per
// borderline pair, so running it over the full fresh set is fine at steady
// state (a few new articles) but explodes on a backlog — e.g. after an outage,
// ~5000 fresh articles produced ~90s+ of serial Haiku calls and ran the
// function to its 300s limit. Trimming to the newest N (comfortably above
// MAX_NEW_PER_RUN so dedup still has room to fill a full batch of uniques)
// bounds the cost; the rest backfills over successive 15-min runs.
const MAX_DEDUP_CANDIDATES = 180;
// Hard ceiling on sequential Haiku tie-break calls in one near-dup pass. Beyond
// it, borderline pairs fall back to "keep" (fail open — same policy as a failed
// Haiku call), so a pathological batch can never serialize hundreds of calls.
const MAX_DEDUP_HAIKU_CALLS = 25;
// Worst case (every call stalls and exhausts its retry): ceil(60/8) * 20s =
// 160s, leaving headroom under maxDuration alongside the RSS fetch stage.
const HAIKU_CONCURRENCY = 8;
const URL_PAGE_SIZE = 1000;
// Same-event stories from different outlets (or the same story re-served by
// an unresolvable Google News redirect, see src/lib/dedup.ts) are only
// compared against recent same-language coverage — old stories that happen
// to share vocabulary shouldn't suppress a genuinely new article.
const NEAR_DUP_WINDOW_HOURS = 36;

type ArticleCategory = Exclude<CategoryId, "all" | "top">;

const VALID_CATEGORIES: ReadonlySet<string> = new Set<ArticleCategory>([
  "world", "politics", "economy", "science", "climate",
  "conflicts", "health", "culture", "sports", "fifa",
]);

// Explicit timeout, well under maxDuration: the SDK's own default (10 min)
// outlives this whole function's 300s budget, so a stalled/black-holed
// connection to the API would otherwise hang every Haiku call until Vercel
// kills the run — the same failure mode just fixed for RSS fetches above.
// maxRetries is capped too: the SDK retries timed-out requests by default
// (maxRetries: 2), which would let one stalled call consume timeout * 3 — a
// single retry is enough headroom since a hung call already falls back to
// keyword classification (see processArticleWithHaiku's catch block).
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 10_000,
  maxRetries: 1,
});

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

interface Classification {
  category: ArticleCategory;
  summary: string;
}

interface Processed {
  classification: Classification;
  importanceScore: number;
  failed: boolean;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

// Only articles published within this window are worth a Haiku call; older ones
// are unlikely to surface as top news, so we skip the model and save the cost.
const RECENCY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

// Single Haiku call returning category + 2-sentence summary + 0-100 importance
// score in one JSON response (merged from what used to be two sequential calls).
// Falls back to keyword classification + the raw RSS description on any failure
// so a flaky model call never drops an article entirely (counted as an error).
async function processArticleWithHaiku(article: Article): Promise<Processed> {
  const languageName = article.language === "fr" ? "French" : "English";
  try {
    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 260,
      stream: false,
      messages: [
        {
          role: "user",
          content: `You classify, summarize, and rate a news article for a bilingual news site.
Choose exactly one category from this list: world, politics, economy, science, climate, conflicts, health, culture, sports, fifa.
Write a concise 2-sentence summary in ${languageName} (the article's own language).
Rate the article's global importance on a 0-100 scale:
90-100 = global breaking news (war, major crisis, world leader event).
75-89 = major national politics or economy.
50-74 = notable regional, tech, or science story.
0-49 = routine or local news.

Title: ${article.title}
Description: ${article.description}

Respond with ONLY a JSON object, no markdown formatting:
{"category": "<one allowed category>", "summary": "<2 sentences in ${languageName}>", "score": <integer 0-100>}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text content from Claude");

    const parsed = extractJson(textBlock.text) as Partial<Classification> & { score?: unknown };
    const category = (parsed.category && VALID_CATEGORIES.has(parsed.category)
      ? parsed.category
      : inferCategory(article.title, article.description)) as ArticleCategory;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : article.description;
    const rawScore = typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
    const importanceScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;

    return { classification: { category, summary }, importanceScore, failed: false };
  } catch (error) {
    console.error(`[cron/fetch-news] Haiku failed for "${article.url}":`, error);
    return {
      classification: {
        category: inferCategory(article.title, article.description),
        summary: article.description,
      },
      importanceScore: 0,
      failed: true,
    };
  }
}

// Full per-article pipeline. Recent articles (published within RECENCY_WINDOW_MS)
// get a single Haiku call for category + summary + importance score. Older
// articles skip Haiku entirely — keyword classification, no importance score, and
// the raw RSS description — so the cron only spends model budget on fresh news.
async function processArticle(article: Article): Promise<Processed> {
  const publishedMs = new Date(article.publishedAt).getTime();
  const isRecent = Number.isFinite(publishedMs) && Date.now() - publishedMs < RECENCY_WINDOW_MS;

  if (!isRecent) {
    return {
      classification: {
        category: inferCategory(article.title, article.description),
        summary: article.description,
      },
      importanceScore: 0,
      failed: false,
    };
  }

  return processArticleWithHaiku(article);
}

// Loads every stored URL into a Set for O(1) dedup. Pages through the table
// (column-only) rather than sending candidate URLs in a giant `IN (...)` query
// string, which PostgREST rejects. The table is capped at 7 days of retention,
// so this stays bounded.
async function loadStoredUrls(
  db: ReturnType<typeof getServiceRoleClient>,
): Promise<Set<string>> {
  const stored = new Set<string>();
  for (let page = 0; ; page++) {
    const from = page * URL_PAGE_SIZE;
    const { data, error } = await db
      .from("articles")
      .select("url")
      .range(from, from + URL_PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase dedup query failed: ${error.message}`);
    const rows = (data ?? []) as { url: string }[];
    for (const row of rows) stored.add(row.url);
    if (rows.length < URL_PAGE_SIZE) break;
  }
  return stored;
}

// Loads title + publishedAt + language for every article published within
// NEAR_DUP_WINDOW_HOURS, to seed the near-duplicate check below. Small
// column set, bounded time window, so this stays cheap even against the
// full 7-day-retention table.
async function loadRecentTitles(
  db: ReturnType<typeof getServiceRoleClient>,
): Promise<(TitledCandidate & { language: Language })[]> {
  const since = new Date(Date.now() - NEAR_DUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("articles")
    .select("title, published_at, language")
    .gte("published_at", since);
  if (error) throw new Error(`Supabase near-dup query failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    title: (row as { title: string }).title,
    publishedAt: (row as { published_at: string }).published_at,
    language: (row as { language: string }).language as Language,
  }));
}

// Single cheap Haiku call for a borderline title-similarity pair (see
// NEAR_DUP_AUTO_DROP/_KEEP in src/lib/dedup.ts for why this band needs a
// judgment call rather than a fixed cutoff). Tiny prompt, 1-token answer —
// this only runs for pairs scoring in the contested 0.25-0.55 range, which
// empirical testing showed is rare (a handful per day, not per article).
async function isSameStoryHaiku(titleA: string, titleB: string): Promise<boolean> {
  try {
    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 5,
      stream: false,
      messages: [
        {
          role: "user",
          content: `Are these two news headlines about the same specific real-world event/story (not just the same general topic)? Answer with exactly one word: "yes" or "no".\n\nA: ${titleA}\nB: ${titleB}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    return !!textBlock && textBlock.type === "text" && /^yes/i.test(textBlock.text.trim());
  } catch (error) {
    // Fail open (treat as not-a-duplicate) — losing a near-dup catch is far
    // cheaper than dropping a genuinely new story over a flaky API call.
    console.error("[cron/fetch-news] Haiku same-story check failed:", error);
    return false;
  }
}

// Drops near-duplicate stories (same event, different outlet — or the same
// Google-News-sourced story re-served under a fresh redirect URL) before
// they're ever classified/inserted.
//
// Keep-policy: earliest-published wins. Any candidate that matches an
// *already-stored* recent article (`recentExisting`) is dropped outright —
// that story already has a card, and the stored row is definitionally no
// later than a newly-fetched candidate, so there's nothing to replace.
// Within the current batch, candidates are walked oldest-first so the first
// (earliest-published) copy of a story is kept and later copies from other
// sources are dropped. This is the simpler of the two policies described in
// the task (earliest-published vs. highest-importance-score) — it needs no
// Haiku call up front, unlike importance score.
async function dropNearDuplicates(
  candidates: Article[],
  recentExisting: (TitledCandidate & { language: Language })[],
): Promise<Article[]> {
  const seenByLanguage: Record<Language, TitledCandidate[]> = {
    en: recentExisting.filter((r) => r.language === "en"),
    fr: recentExisting.filter((r) => r.language === "fr"),
  };

  const oldestFirst = [...candidates].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );

  const kept: Article[] = [];
  // The loop is strictly sequential (each candidate is compared against buckets
  // built from earlier-kept candidates in the same run). The borderline branch
  // makes a Haiku call, so it's capped at MAX_DEDUP_HAIKU_CALLS per run; beyond
  // that, borderline pairs default to "keep" (fail open) rather than serializing
  // an unbounded number of ~1s calls. Callers should also cap `candidates`
  // (see MAX_DEDUP_CANDIDATES) so the O(N×M) similarity scan stays bounded.
  let haikuTieBreaks = 0;
  for (const candidate of oldestFirst) {
    const bucket = seenByLanguage[candidate.language];
    const match = findBestMatch(candidate.title, bucket, candidate.language);

    let isDuplicate = false;
    if (match) {
      if (match.score >= NEAR_DUP_AUTO_DROP) {
        isDuplicate = true;
      } else if (haikuTieBreaks < MAX_DEDUP_HAIKU_CALLS) {
        haikuTieBreaks++;
        isDuplicate = await isSameStoryHaiku(candidate.title, match.item.title);
      }
      // else: tie-break budget spent — leave isDuplicate false (keep).
    }

    if (isDuplicate) continue;
    kept.push(candidate);
    bucket.push({ title: candidate.title, publishedAt: candidate.publishedAt });
  }

  // Restore newest-first order to match the rest of the pipeline's convention.
  return kept.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

// Maps an Article + its classification + importance score to a DB insert row.
function toRow(article: Article, c: Classification, importanceScore: number) {
  return {
    title: article.title,
    summary: c.summary,
    url: article.url,
    image_url: article.imageUrl,
    category: c.category,
    source: article.source,
    language: article.language,
    published_at: article.publishedAt,
    score: 0,
    importance_score: importanceScore,
  };
}

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorized(req)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getServiceRoleClient();

    // 1. Fetch every source through a bounded worker pool, deduped + newest-first.
    const fetchRes = await fetchAllFeedsRaw();
    const fetched = fetchRes.articles;

    // 2. Drop anything already stored (exact URL match, post-canonicalization).
    const existing = await loadStoredUrls(db);
    const fresh = fetched.filter((a) => !existing.has(a.url));

    // 3. Drop near-duplicates: the same event covered by multiple outlets, or
    // the same story re-served under a fresh Google News redirect URL that
    // Layer 1 (URL canonicalization) can't resolve. Runs before the per-run cap
    // so semantic dedup isn't crowded out by near-duplicate noise. The input is
    // bounded (see below) so this pass can't O(N×M)-explode on a large backlog.
    const recentTitles = await loadRecentTitles(db);
    // fresh is newest-first; trim before the near-dup pass so a backlog can't
    // blow the time budget. The remainder backfills on successive 15-min runs.
    const dedupInput = fresh.slice(0, MAX_DEDUP_CANDIDATES);
    const deduped = await dropNearDuplicates(dedupInput, recentTitles);

    // 4. Bound per-run work (newest first); the rest backfills next run.
    const toProcess = deduped.slice(0, MAX_NEW_PER_RUN);

    // 5. Classify + summarize + importance-score with Haiku under a concurrency cap.
    const processed = await mapPool(toProcess, HAIKU_CONCURRENCY, processArticle);
    const errors = processed.filter((p) => p.failed).length;
    const rows = toProcess.map((article, i) =>
      toRow(article, processed[i].classification, processed[i].importanceScore),
    );

    // 6. Insert (upsert/ignore on the unique url to absorb any race).
    let inserted = 0;
    if (rows.length > 0) {
      const { data, error } = await db
        .from("articles")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
        .select("id, url, language");
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
      inserted = data?.length ?? 0;

      // Notify IndexNow once per run (not per article) so Bing/Yandex/Seznam/
      // Naver can crawl new articles immediately. Submit the locale-prefixed
      // canonical URL (/{lang}/article/{id}) so we don't push URLs that would
      // immediately 301. Never fails the cron.
      if (data && data.length > 0) {
        const articleUrls = data.map((row: { id: string; language: string }) => {
          const lang = row.language === "fr" ? "fr" : "en";
          return `https://globevortex.com/${lang}/article/${row.id}`;
        });
        await submitToIndexNow(articleUrls);
      }
    }

    // 7. Purge articles older than 7 days. Non-fatal: a cleanup failure must
    // not fail an otherwise-successful fetch run.
    let purged = true;
    const { error: purgeError } = await db.rpc("delete_old_articles");
    if (purgeError) {
      purged = false;
      console.error("[cron/fetch-news] delete_old_articles failed:", purgeError.message);
    }

    const duration = Date.now() - start;
    return Response.json({
      success: true,
      inserted,
      skippedUrl: fetched.length - fresh.length,
      skippedNearDuplicate: dedupInput.length - deduped.length,
      deferred: deduped.length - toProcess.length,
      fetched: fetched.length,
      sourcesFetched: fetchRes.sourcesFetched,
      sourcesFailed: fetchRes.sourcesFailed,
      errors,
      purged,
      duration,
    });
  } catch (error) {
    console.error("[cron/fetch-news] Run failed:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron run failed",
        duration: Date.now() - start,
      },
      { status: 500 },
    );
  }
}

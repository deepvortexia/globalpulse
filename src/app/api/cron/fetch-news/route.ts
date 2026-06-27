import Anthropic from "@anthropic-ai/sdk";
import { fetchAllFeedsRaw, inferCategory } from "@/lib/rss-fetcher";
import { getServiceRoleClient } from "@/lib/supabase";
import type { Article, CategoryId } from "@/types";

// Background job — runs on a schedule (see vercel.json), never user-facing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous budget: batched RSS parsing + a bounded number of Haiku calls.
export const maxDuration = 300;

const SUMMARY_MODEL = "claude-haiku-4-5";
const FETCH_BATCH_SIZE = 10;
// Bound per-run work so the first run against an empty DB (≈500-1000 articles)
// doesn't blow the time/cost budget. Successive 15-min runs backfill the rest.
const MAX_NEW_PER_RUN = Number(process.env.CRON_MAX_ARTICLES ?? 60);
const HAIKU_CONCURRENCY = 5;
const URL_PAGE_SIZE = 1000;

type ArticleCategory = Exclude<CategoryId, "all">;

const VALID_CATEGORIES: ReadonlySet<string> = new Set<ArticleCategory>([
  "world", "politics", "economy", "science", "climate",
  "conflicts", "health", "culture", "sports", "fifa",
]);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

// Asks Haiku for a category + 2-sentence summary in the article's language.
// Falls back to keyword classification + the raw RSS description on any failure
// so a flaky model call never drops an article entirely (counted as an error).
async function classifyAndSummarize(article: Article): Promise<{ result: Classification; failed: boolean }> {
  const languageName = article.language === "fr" ? "French" : "English";
  try {
    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 220,
      stream: false,
      messages: [
        {
          role: "user",
          content: `You classify and summarize a news article for a bilingual news site.
Choose exactly one category from this list: world, politics, economy, science, climate, conflicts, health, culture, sports, fifa.
Write a concise 2-sentence summary in ${languageName} (the article's own language).

Title: ${article.title}
Description: ${article.description}

Respond with ONLY a JSON object, no markdown formatting:
{"category": "<one allowed category>", "summary": "<2 sentences in ${languageName}>"}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text content from Claude");

    const parsed = extractJson(textBlock.text) as Partial<Classification>;
    const category = (parsed.category && VALID_CATEGORIES.has(parsed.category)
      ? parsed.category
      : inferCategory(article.title, article.description)) as ArticleCategory;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : article.description;

    return { result: { category, summary }, failed: false };
  } catch (error) {
    console.error(`[cron/fetch-news] Haiku failed for "${article.url}":`, error);
    return {
      result: {
        category: inferCategory(article.title, article.description),
        summary: article.description,
      },
      failed: true,
    };
  }
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

// Maps an Article + its classification to a DB insert row.
function toRow(article: Article, c: Classification) {
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
  };
}

// Runs an async mapper over items with a fixed concurrency ceiling.
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorized(req)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getServiceRoleClient();

    // 1. Fetch every source in batches of 10, deduped + newest-first.
    const fetched = await fetchAllFeedsRaw(FETCH_BATCH_SIZE);

    // 2. Drop anything already stored.
    const existing = await loadStoredUrls(db);
    const fresh = fetched.filter((a) => !existing.has(a.url));

    // 3. Bound per-run work (newest first); the rest backfills next run.
    const toProcess = fresh.slice(0, MAX_NEW_PER_RUN);

    // 4. Classify + summarize with Haiku under a concurrency cap.
    const classified = await mapPool(toProcess, HAIKU_CONCURRENCY, classifyAndSummarize);
    const errors = classified.filter((c) => c.failed).length;
    const rows = toProcess.map((article, i) => toRow(article, classified[i].result));

    // 5. Insert (upsert/ignore on the unique url to absorb any race).
    let inserted = 0;
    if (rows.length > 0) {
      const { data, error } = await db
        .from("articles")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
        .select("url");
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
      inserted = data?.length ?? 0;
    }

    // 6. Purge articles older than 7 days. Non-fatal: a cleanup failure must
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
      skipped: fetched.length - fresh.length,
      deferred: fresh.length - toProcess.length,
      fetched: fetched.length,
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

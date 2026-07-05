import Parser from "rss-parser";
import { RSS_SOURCES } from "./rss-sources";
import { canonicalizeUrl } from "./dedup";
import { mapPool } from "./async-pool";
import type { Article, CategoryId, RSSSource } from "@/types";

type ArticleCategory = Exclude<CategoryId, "all" | "top">;

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#39;/g, "'")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// Keyword-based classification run on every article's title + description. The
// first matching topic wins; anything unmatched falls back to "world". This
// overrides each source's static category, so a single feed can spread across
// topics (e.g. a war story from a generic "world" source lands in conflicts).
export function inferCategory(title: string, description: string): ArticleCategory {
  const raw = title + " " + (description ?? "");
  const text = raw.toLowerCase();

  // FIFA 2026 — highest priority: route any World Cup story to the live hub.
  if (/\b(FIFA|World Cup|coupe du monde|worldcup|world cup 2026|groupe [A-H]|group [A-H]|knockout|quarter.final|semi.final)\b/i.test(raw)) return "fifa";

  // CONFLICTS — must come first (high priority)
  if (/\b(war|warfare|military|attack|missile|troops|bombing|combat|ceasefire|weapon|army|nato|conflict|terrorism|isis|taliban|hamas|hezbollah|hostage|airstrike|siege|offensive|battalion|casualties|killed in action)\b/.test(text)) return "conflicts";

  // CLIMATE
  if (/\b(climate change|global warming|carbon emission|greenhouse|glacier|wildfire|hurricane|drought|renewable energy|solar power|wind energy|deforestation|biodiversity|sea level|fossil fuel|paris agreement|ipcc)\b/.test(text)) return "climate";

  // SCIENCE & TECH — strict: must mention actual tech/science topics
  if (/\b(artificial intelligence|machine learning|robotics|software|cybersecurity|semiconductor|quantum computing|space mission|nasa|rocket launch|satellite|genome|crispr|neuroscience|physics|astronomy)\b/.test(text)) return "science";
  if (/\b(apple inc|google|microsoft|meta platforms|openai|nvidia|tesla|spacex|amazon web|startup funding|tech company|silicon valley)\b/.test(text)) return "science";

  // HEALTH — broadened to single keywords (was too strict → 0 articles).
  // NOTE: "who" is intentionally matched as "world health organization" only;
  // a bare \bwho\b matches the everyday word "who" on lowercased text.
  if (/\b(health|disease|virus|cancer|vaccine|hospital|doctor|medicine|drug|pandemic|epidemic|world health organization|cdc|outbreak|medical|patient|surgeon|mental health|pharmaceutical|clinical trial|public health)\b/.test(text)) return "health";

  // POLITICS — strict: avoid catching general news
  if (/\b(election|presidential|parliament|senate|congress|democrat|republican|ballot|legislation|minister|prime minister|supreme court|white house|kremlin|sanctions|diplomatic|geopolitics)\b/.test(text)) return "politics";

  // ECONOMY — broadened to single keywords (was too strict → 0 articles).
  if (/\b(market|stock|inflation|recession|trade|tariff|bank|dollar|euro|fund|investor|gdp|economic|economy|financial|finance|budget|debt|central bank|federal reserve|interest rate|cryptocurrency|bitcoin|earnings|unemployment)\b/.test(text)) return "economy";

  // SPORTS — very specific, avoid "world cup of coffee" type false positives
  if (/\b(nba|nfl|nhl|mlb|premier league|champions league|world cup final|olympic games|grand slam|tour de france|formula 1|fifa|uefa|transfer fee|match result|scored|goalkeeper|touchdown|slam dunk)\b/.test(text)) return "sports";

  // CULTURE — last resort for arts/entertainment, NOT business
  if (/\b(film festival|box office|oscar|grammy|emmy|bafta|art exhibition|museum|theater|theatre|concert tour|album release|bestseller|literary prize|fashion week|streaming series|documentary)\b/.test(text)) return "culture";

  return "world";
}

interface FeedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string };
  "media:content"?: { $?: { url?: string } };
}

// Freshness window: prefer the last 4h, but widen to 8h if that leaves too
// few stories to fill the board.
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const MIN_FRESH_ARTICLES = 20;
// Network timeout, enforced by an AbortController that actually tears down the
// socket (see fetchSourceText) — unlike rss-parser's own `timeout`, which does
// not reliably abort a stalled connection.
const FETCH_TIMEOUT_MS = 12_000;
// Hard ceiling on the bytes we'll pull from a single feed before parsing it.
// The XML parse (xml2js, inside parser.parseString) is SYNCHRONOUS and
// CPU-bound: a source that returns a multi-megabyte or pathological body will
// block the entire Node event loop while it parses, freezing every other
// in-flight fetch, timer, and — on Vercel — the whole function until the
// platform kills it at maxDuration. Capping the download keeps the parser's
// input bounded so no single source can wedge the loop. Streaming the body and
// stopping at the cap is itself async (yields per chunk), so the cap check
// never blocks. 4 MB comfortably fits legitimate feeds (largest real ones seen
// are ~1-2 MB).
const MAX_FEED_BYTES = 4 * 1024 * 1024;
// TEMP DIAGNOSTIC: only fetch the first N sources. 0 = no cap (all sources).
const TEMP_SOURCE_CAP = 0;
// How many sources to fetch concurrently. Bounded (rather than all 100 at
// once) to avoid opening too many sockets at once; high enough that even if
// every source hits the network timeout, a full run stays well under the
// function's 300s budget: ceil(100 / 20) * 12s = 60s worst case.
// Moderate concurrency for the fetch stage (never the bottleneck — the fetch
// stage runs in ~1s; the near-dup pass was the real cost).
const FETCH_CONCURRENCY = 10;
// Wall-clock ceiling on the whole fetch stage. Once exceeded, workers stop
// starting new sources and return what they have, so the stage can never run
// the function to its 300s platform limit — whatever the cause (slow source,
// deadlock). Leaves ample budget for classification + insert afterwards.
const FETCH_STAGE_BUDGET_MS = 90_000;

const parser: Parser<unknown, FeedItem> = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  customFields: {
    item: [["media:content", "media:content"]],
  },
});

function makeId(url: string): string {
  return Buffer.from(url).toString("base64");
}

function extractImageUrl(item: FeedItem): string | null {
  if (item.enclosure?.url) return item.enclosure.url;

  const mediaUrl = item["media:content"]?.$?.url;
  if (mediaUrl) return mediaUrl;

  const html = item.content ?? "";
  const match = html.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
}

function toArticle(item: FeedItem, source: RSSSource): Article | null {
  if (!item.link || !item.title) return null;

  const rawDate = item.isoDate ?? item.pubDate;
  if (!rawDate) return null;

  const publishedTime = new Date(rawDate).getTime();
  if (Number.isNaN(publishedTime)) return null;

  const title = decodeHtmlEntities(item.title.trim());
  const description = decodeHtmlEntities((item.contentSnippet ?? item.content ?? "").trim());
  const url = canonicalizeUrl(item.link);

  return {
    id: makeId(url),
    title,
    description,
    url,
    source: source.name,
    language: source.language,
    category: inferCategory(title, description),
    country: source.country,
    publishedAt: new Date(publishedTime).toISOString(),
    imageUrl: extractImageUrl(item),
  };
}

// Fetches a feed's raw XML with two hard guarantees the previous
// parser.parseURL() path lacked:
//   1. Real cancellation — an AbortController tied to a timer actually aborts
//      the underlying request/socket on timeout, rather than leaving it running
//      orphaned in the background (the old Promise.race wrapper resolved the
//      race but never cancelled the operation, leaking the connection).
//   2. A byte cap — the body is streamed and we stop once MAX_FEED_BYTES is
//      exceeded, so an oversized response can never be handed whole to the
//      synchronous XML parser and wedge the event loop.
async function fetchSourceText(source: RSSSource): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        // Some feeds 403 the default undici UA; a browser-ish UA is more widely
        // accepted and matches how the feeds are meant to be consumed.
        "user-agent":
          "Mozilla/5.0 (compatible; GlobeVortexBot/1.0; +https://globevortex.com)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    if (!res.body) return await res.text();

    // Stream with a byte ceiling. Each read() yields to the event loop, so this
    // loop never blocks; hitting the cap aborts the request and bails.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error(`response exceeded ${MAX_FEED_BYTES}-byte cap`);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf-8");
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source: RSSSource): Promise<Article[]> {
  const xml = await fetchSourceText(source);
  // TEMP DIAGNOSTIC: log immediately BEFORE each synchronous step, tagged with
  // the source name. parser.parseString() and the toArticle loop are both
  // synchronous and CPU-bound; if either wedges the event loop, no *later* log
  // (or timer) can fire, so the previous "after" logging had a blind spot right
  // where the hang is. With before-logging, the last line before the silence
  // names both the culprit source and the exact stage. Remove once identified.
  console.error(`[rss-fetcher] TEMP pre-parse "${source.name}" ${xml.length}b`);
  const feed = await parser.parseString(xml);

  console.error(`[rss-fetcher] TEMP pre-items "${source.name}" items=${feed.items.length}`);
  const articles: Article[] = [];
  for (const item of feed.items) {
    const article = toArticle(item, source);
    if (article) articles.push(article);
  }

  console.error(`[rss-fetcher] TEMP done "${source.name}" kept=${articles.length}`);
  return articles;
}

export interface FetchAllResult {
  articles: Article[];
  sourcesTotal: number;
  sourcesFetched: number; // completed a fetch+parse (regardless of item count)
  sourcesFailed: number; // threw (bad status, timeout, cap, parse error)
  sourcesSkipped: number; // never started — the stage deadline had passed
}

// Concurrency-bounded variant for the background cron: fetches every source
// through a fixed-size worker pool (rather than sequential batches, where one
// slow batch delays every batch after it), dedupes by URL, and returns ALL
// parsed articles sorted newest-first WITHOUT the 4-8h freshness trim (the DB
// applies its own 7-day retention). Per-source failures are logged and skipped.
// A wall-clock deadline bounds the whole stage: once passed, remaining sources
// are skipped rather than started, so no source can push the run to the 300s
// platform limit. Returns per-source counts so the caller can report them.
export async function fetchAllFeedsRaw(
  concurrency = FETCH_CONCURRENCY,
  deadlineMs = Date.now() + FETCH_STAGE_BUDGET_MS,
): Promise<FetchAllResult> {
  let sourcesFetched = 0;
  let sourcesFailed = 0;
  let sourcesSkipped = 0;
  const sources = TEMP_SOURCE_CAP > 0 ? RSS_SOURCES.slice(0, TEMP_SOURCE_CAP) : RSS_SOURCES;
  const results = await mapPool(sources, concurrency, async (source) => {
    if (Date.now() > deadlineMs) {
      sourcesSkipped++;
      return [] as Article[];
    }
    try {
      const articles = await fetchSource(source);
      sourcesFetched++;
      return articles;
    } catch (error) {
      sourcesFailed++;
      console.error(`[rss-fetcher] Failed to fetch "${source.name}":`, error);
      return [] as Article[];
    }
  });

  const collected = results.flat();
  const deduped = new Map<string, Article>();
  for (const article of collected) {
    if (!deduped.has(article.url)) deduped.set(article.url, article);
  }

  const articles = Array.from(deduped.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return {
    articles,
    sourcesTotal: sources.length,
    sourcesFetched,
    sourcesFailed,
    sourcesSkipped,
  };
}

export async function fetchAllFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchSource));

  const articles: Article[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      console.error(`[rss-fetcher] Failed to fetch "${RSS_SOURCES[index].name}":`, result.reason);
    }
  });

  const deduped = new Map<string, Article>();
  for (const article of articles) {
    if (!deduped.has(article.url)) {
      deduped.set(article.url, article);
    }
  }

  const sorted = Array.from(deduped.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Keep only fresh stories; widen 4h → 8h if that leaves too few to fill out.
  const now = Date.now();
  const within = (maxAgeMs: number) =>
    sorted.filter((a) => now - new Date(a.publishedAt).getTime() <= maxAgeMs);

  const fresh = within(FOUR_HOURS_MS);
  return fresh.length >= MIN_FRESH_ARTICLES ? fresh : within(EIGHT_HOURS_MS);
}

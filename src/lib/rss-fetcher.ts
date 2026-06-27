import Parser from "rss-parser";
import { RSS_SOURCES } from "./rss-sources";
import type { Article, CategoryId, RSSSource } from "@/types";

type ArticleCategory = Exclude<CategoryId, "all">;

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
const FETCH_TIMEOUT_MS = 10_000;

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

  const title = item.title.trim();
  const description = (item.contentSnippet ?? item.content ?? "").trim();

  return {
    id: makeId(item.link),
    title,
    description,
    url: item.link,
    source: source.name,
    language: source.language,
    category: inferCategory(title, description),
    country: source.country,
    publishedAt: new Date(publishedTime).toISOString(),
    imageUrl: extractImageUrl(item),
  };
}

async function fetchSource(source: RSSSource): Promise<Article[]> {
  const feed = await parser.parseURL(source.url);
  const articles: Article[] = [];

  for (const item of feed.items) {
    const article = toArticle(item, source);
    if (article) articles.push(article);
  }

  return articles;
}

// Batched variant for the background cron: fetches every source in batches to
// bound memory/socket usage, dedupes by URL, and returns ALL parsed articles
// sorted newest-first WITHOUT the 4-8h freshness trim (the DB applies its own
// 7-day retention). Per-source failures are logged and skipped.
export async function fetchAllFeedsRaw(batchSize = 10): Promise<Article[]> {
  const collected: Article[] = [];

  for (let i = 0; i < RSS_SOURCES.length; i += batchSize) {
    const batch = RSS_SOURCES.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fetchSource));
    results.forEach((result, j) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value);
      } else {
        console.error(`[rss-fetcher] Failed to fetch "${batch[j].name}":`, result.reason);
      }
    });
  }

  const deduped = new Map<string, Article>();
  for (const article of collected) {
    if (!deduped.has(article.url)) deduped.set(article.url, article);
  }

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
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

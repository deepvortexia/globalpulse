import Parser from "rss-parser";
import { RSS_SOURCES } from "./rss-sources";
import type { Article, CategoryId, RSSSource } from "@/types";

type ArticleCategory = Exclude<CategoryId, "all">;

// Keyword-based classification run on every article's title + description. The
// first matching topic wins; anything unmatched falls back to "world". This
// overrides each source's static category, so a single feed can spread across
// topics (e.g. a war story from a generic "world" source lands in conflicts).
function inferCategory(title: string, description: string): ArticleCategory {
  const rawText = title + " " + (description ?? "");
  const text = rawText.toLowerCase();
  if (/\bwar\b|military|attack|missile|troops|bomb|combat|ceasefire|weapon|army|nato|conflict|terrorism|isis|taliban|hamas|hezbollah|hostage/i.test(text)) return "conflicts";
  if (/climate|carbon|emission|temperature|glacier|flood|wildfire|hurricane|drought|renewable|solar|wind energy|pollution|deforestation/i.test(text)) return "climate";
  if (/\bai\b|artificial intelligence|robot|\btech\b|software|apple|google|microsoft|meta|openai|startup|cyber|hack|chip|semiconductor|quantum|space|nasa|rocket|satellite/i.test(text)) return "science";
  if (/health|disease|virus|cancer|vaccine|hospital|doctor|medicine|mental health|obesity|drug|pandemic/i.test(text) || /\bWHO\b|\bCDC\b/.test(rawText)) return "health";
  if (/election|president|minister|parliament|senate|congress|democrat|republican|vote|policy|law|court|supreme|government|political/i.test(text)) return "politics";
  if (/economy|market|stock|gdp|inflation|recession|bank|trade|tariff|crypto|bitcoin|dollar|euro|interest rate|unemployment/i.test(text)) return "economy";
  if (/football|soccer|nba|nfl|nhl|tennis|golf|olympics|world cup|championship|tournament|athlete|coach|stadium|league/i.test(text)) return "sports";
  if (/film|movie|music|art|culture|festival|celebrity|fashion|book|award|oscar|grammy/i.test(text)) return "culture";
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

import Parser from "rss-parser";
import { RSS_SOURCES } from "./rss-sources";
import { ARTICLE_CATEGORY_IDS } from "./categories";
import type { Article, CategoryId, RSSSource } from "@/types";

type ArticleCategory = Exclude<CategoryId, "all">;

// Raw source categories that don't already match a CategoryId get aliased here;
// anything still unrecognized falls back to "world".
const CATEGORY_ALIASES: Record<string, ArticleCategory> = {
  business: "economy",
  technology: "science",
  environment: "climate",
};

const VALID_CATEGORY_IDS = new Set<string>(ARTICLE_CATEGORY_IDS);

function toCategoryId(raw: string): ArticleCategory {
  const key = raw.trim().toLowerCase();
  if (key in CATEGORY_ALIASES) return CATEGORY_ALIASES[key];
  if (VALID_CATEGORY_IDS.has(key)) return key as ArticleCategory;
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

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
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
  if (Date.now() - publishedTime > TWELVE_HOURS_MS) return null;

  return {
    id: makeId(item.link),
    title: item.title.trim(),
    description: (item.contentSnippet ?? item.content ?? "").trim(),
    url: item.link,
    source: source.name,
    language: source.language,
    category: toCategoryId(source.category),
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

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

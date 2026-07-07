import { getServiceRoleClient } from "./supabase";
import type { Article, CategoryId, Language } from "@/types";

// Row shape of the Supabase `articles` table (snake_case columns). The table
// stores a Haiku-generated `summary` in place of the raw RSS description and
// does not carry a `country` column, so the mapper fills sensible defaults.
export interface DbArticleRow {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  image_url: string | null;
  category: string;
  source: string;
  language: string;
  published_at: string | null;
  created_at: string;
  score: number | null;
  importance_score: number | null;
  meta_title: string | null;
  meta_description: string | null;
}

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SINCE_HOURS = 24;

// ── Top Stories tuning ───────────────────────────────────────────────────────
const TOP_STORIES_TARGET = 12;            // exact number of stories we aim to ship
const TOP_STORIES_HEADLINES = 3;          // top slots that ignore category diversity
const TOP_STORIES_MIN_SCORE = 60;         // preferred importance floor
const TOP_STORIES_FALLBACK_SCORE = 40;    // last-resort importance floor
const TOP_STORIES_MAX_AGE_HOURS = 7 * 24; // hard cap: never surface news older than 7 days

// Recency decay (points subtracted from importance per hour of article age). At
// 0.4/h a 24h-old story loses ~9.6 pts versus ~0.4 for a 1h-old one, so fresh
// stories outrank similarly-important older ones — yet a 7-day-old blockbuster
// only sheds ~67 pts, leaving a genuinely huge story able to surface when recent
// good stories run dry.
const TOP_STORIES_DECAY_PER_HOUR = 0.4;

// Cascading (importance floor, max age) tiers, strictest/freshest first. We walk
// these in order and stop at the first tier whose candidate pool already holds
// at least TOP_STORIES_TARGET articles. This keeps the rail as fresh and as
// high-importance as the data allows: we only widen the time window (6h → 24h →
// 7d) when there aren't 10 qualifying stories, and only relax the score floor
// (60 → 40) as a final resort once even the full 7-day window is too thin.
const TOP_STORIES_TIERS: ReadonlyArray<{ minScore: number; maxAgeHours: number }> = [
  { minScore: TOP_STORIES_MIN_SCORE, maxAgeHours: 6 },
  { minScore: TOP_STORIES_MIN_SCORE, maxAgeHours: 24 },
  { minScore: TOP_STORIES_MIN_SCORE, maxAgeHours: TOP_STORIES_MAX_AGE_HOURS },
  { minScore: TOP_STORIES_FALLBACK_SCORE, maxAgeHours: 6 },
  { minScore: TOP_STORIES_FALLBACK_SCORE, maxAgeHours: 24 },
  { minScore: TOP_STORIES_FALLBACK_SCORE, maxAgeHours: TOP_STORIES_MAX_AGE_HOURS },
];

type ArticleCategory = Exclude<CategoryId, "all" | "top">;

const VALID_CATEGORIES: ReadonlySet<string> = new Set<ArticleCategory>([
  "world", "politics", "economy", "science", "climate",
  "conflicts", "health", "culture", "sports", "fifa",
]);

// Maps a DB row to the Article shape the frontend already consumes. `summary`
// becomes `description`; `country` is unused by the UI so it defaults to "".
// `isBreaking` is stamped at mapping time (ISR revalidates every 60s, so the
// flag is always within a minute of accurate — fine for a breaking badge).
export function rowToArticle(row: DbArticleRow): Article {
  const category = (VALID_CATEGORIES.has(row.category) ? row.category : "world") as ArticleCategory;
  const ageHours = articleAgeHours(row, Date.now());
  return {
    id: row.id,
    title: row.title,
    description: row.summary ?? "",
    url: row.url,
    source: row.source,
    language: (row.language === "fr" ? "fr" : "en") as Language,
    category,
    country: "",
    publishedAt: row.published_at ?? row.created_at,
    imageUrl: row.image_url,
    isBreaking: (row.importance_score ?? 0) >= 75 && ageHours <= 2,
  };
}

export interface GetArticlesOptions {
  category?: CategoryId | null;
  page?: number;
  pageSize?: number;
  sinceHours?: number;
}

// Reads articles from Supabase. Uses the service-role client because the
// `articles` table has RLS enabled with no public read policy, and every caller
// here is server-side (page Server Component + /api/news route) — the key never
// reaches the browser. Defaults: last 24h, newest first, 24 per page. An
// explicit category filters to that topic; "all"/empty returns every category.
export async function getArticles({
  category,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sinceHours = DEFAULT_SINCE_HOURS,
}: GetArticlesOptions = {}): Promise<Article[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  // Window on created_at (ingestion time) so recently-seeded articles always
  // show, regardless of their original RSS publish date; still order newest-
  // published first for display.
  let query = getServiceRoleClient()
    .from("articles")
    .select("*")
    .gte("created_at", since)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  return (data as DbArticleRow[]).map(rowToArticle);
}

// Effective age of an article in hours, measured from its real publish time
// (published_at), falling back to ingestion time (created_at) when the feed gave
// no/garbled publish date. Future-dated feeds are clamped to "now" (age 0); rows
// whose timestamps are wholly unparseable report Infinity so the age windows
// drop them rather than letting a bad timestamp masquerade as breaking news.
function articleAgeHours(row: DbArticleRow, nowMs: number): number {
  let ts = row.published_at ? Date.parse(row.published_at) : Number.NaN;
  if (Number.isNaN(ts)) ts = Date.parse(row.created_at);
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - ts) / 3_600_000);
}

// Builds the Top Stories rail for the "Live" section, for a single UI language.
// Two problems this fixes: it must always ship 10 stories (when 10 exist in the
// last 7 days) and must not surface stale news. The rail is rendered strictly in
// the active language (NewsBoard never mixes languages), so the whole cascade
// below runs inside that one language's pool — that way each language gets its
// own 10, instead of 10 bilingual stories that halve once filtered client-side.
//
// Cascading window strategy: we pull one broad candidate pool (this language,
// importance >= the last-resort floor, ingested within 7 days), then walk
// TOP_STORIES_TIERS from strictest/freshest to widest and keep the first tier
// that already holds >= 10 candidates. So Top Stories prefers score >= 60 within
// 6h, expands the window to 24h then 7d if that's too thin, and only then lowers
// the floor to >= 40 across the same widening windows. If even the widest tier
// can't reach 10 we ship what qualifies — never anything older than 7 days.
//
// Ranking applies a recency-decay penalty (see TOP_STORIES_DECAY_PER_HOUR) so a
// fresh story beats an older one of similar importance, while diversification
// reserves 3 headline slots (any category) plus one best-in-category for breadth.
// The 10-story guarantee wins over diversity: leftover slots are filled by the
// next best-ranked articles regardless of category.
//
// page.tsx is an ISR Server Component and can't read the client-side language
// toggle, so it calls this once per language in parallel and hands NewsBoard both
// arrays keyed by language (see getTopStoriesByLanguage).
export async function getTopStories(language: Language): Promise<Article[]> {
  const db = getServiceRoleClient();
  const nowMs = Date.now();
  const since7d = new Date(nowMs - TOP_STORIES_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  // Broad gate on language + ingestion time; real publish-age filtering happens
  // in memory below so a recently-seeded but genuinely old article can't sneak in.
  const { data, error } = await db
    .from("articles")
    .select("*")
    .eq("language", language)
    .gte("created_at", since7d)
    .gte("importance_score", TOP_STORIES_FALLBACK_SCORE)
    .order("importance_score", { ascending: false })
    .limit(500);

  if (error) throw new Error(`Supabase top-stories read failed: ${error.message}`);

  const rows = (data as DbArticleRow[]).filter(
    (r) => articleAgeHours(r, nowMs) <= TOP_STORIES_MAX_AGE_HOURS,
  );

  // Pick the strictest tier that already yields enough candidates. `rows` is the
  // widest tier (floor 40, <= 7d), so it stays as the fallback pool if none hit
  // the target — guaranteeing we still ship whatever qualifies.
  let pool = rows;
  for (const tier of TOP_STORIES_TIERS) {
    const candidates = rows.filter(
      (r) =>
        (r.importance_score ?? 0) >= tier.minScore &&
        articleAgeHours(r, nowMs) <= tier.maxAgeHours,
    );
    if (candidates.length >= TOP_STORIES_TARGET) {
      pool = candidates;
      break;
    }
  }

  // Importance with a recency penalty so newer stories rank ahead of older ones
  // of comparable importance.
  const adjustedScore = (r: DbArticleRow) =>
    (r.importance_score ?? 0) - articleAgeHours(r, nowMs) * TOP_STORIES_DECAY_PER_HOUR;

  const ranked = [...pool].sort((a, b) => adjustedScore(b) - adjustedScore(a));

  // Diversify, then backfill to the 10-story target.
  const selected: DbArticleRow[] = [];
  const seenUrls = new Set<string>();
  const usedCategories = new Set<string>();

  // 1) Headlines: top 3 by adjusted score, any category.
  for (const r of ranked) {
    if (selected.length >= TOP_STORIES_HEADLINES) break;
    if (seenUrls.has(r.url)) continue;
    selected.push(r);
    seenUrls.add(r.url);
    usedCategories.add(r.category);
  }

  // 2) Breadth: best remaining article from each not-yet-represented category.
  for (const r of ranked) {
    if (selected.length >= TOP_STORIES_TARGET) break;
    if (seenUrls.has(r.url) || usedCategories.has(r.category)) continue;
    selected.push(r);
    seenUrls.add(r.url);
    usedCategories.add(r.category);
  }

  // 3) Backfill: next best-ranked articles regardless of category. The 10-story
  //    guarantee takes precedence over per-category diversity.
  for (const r of ranked) {
    if (selected.length >= TOP_STORIES_TARGET) break;
    if (seenUrls.has(r.url)) continue;
    selected.push(r);
    seenUrls.add(r.url);
  }

  // Final display order: best adjusted (importance + recency) score first.
  selected.sort((a, b) => adjustedScore(b) - adjustedScore(a));
  return selected.slice(0, TOP_STORIES_TARGET).map(rowToArticle);
}

// Top Stories for both UI languages, keyed by language. NewsBoard swaps between
// these arrays on the language toggle, so each is already a complete 10-story
// rail in its own language — no client-side language filtering required.
export type TopStoriesByLanguage = Record<Language, Article[]>;

// Convenience wrapper for the home Server Component: runs the per-language
// cascade for EN and FR in parallel (independent queries) and returns both.
export async function getTopStoriesByLanguage(): Promise<TopStoriesByLanguage> {
  const [en, fr] = await Promise.all([getTopStories("en"), getTopStories("fr")]);
  return { en, fr };
}

// Fetches a single article by its id (the public slug). Returns the raw DB row
// (snake_case) so the article page and its NewsArticle JSON-LD can read
// published_at / created_at / source directly. Null when not found — including
// when `slug` isn't a valid UUID, which makes Postgres reject the filter.
export async function getArticleBySlug(slug: string): Promise<DbArticleRow | null> {
  const { data, error } = await getServiceRoleClient()
    .from("articles")
    .select("*")
    .eq("id", slug)
    .single();
  if (error || !data) return null;
  return data as DbArticleRow;
}

// Lightweight id + timestamp + language list for the dynamic sitemap. Newest
// first, capped at 1000 to stay within Google's 50k-URL / 50MB per-file sitemap
// budget. `language` is needed so each article is listed under its own locale
// prefix (/{lang}/article/{id}) — an article exists in one locale only.
export async function getArticleIdsForSitemap(): Promise<
  Pick<DbArticleRow, "id" | "created_at" | "language">[]
> {
  const { data, error } = await getServiceRoleClient()
    .from("articles")
    .select("id, created_at, language")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error || !data) return [];
  return data as Pick<DbArticleRow, "id" | "created_at" | "language">[];
}

// Google News sitemap window: the spec caps entries at 48h old and 1000 URLs
// per file. A raw 48h cut alone runs well past 1000 at current volume, so this
// also filters to importance_score >= 50 — the same floor Top Stories uses —
// which both keeps us under the cap and limits the feed to stories actually
// worth surfacing to Google News rather than padding it with routine local
// news. `limit(1000)` stays as a hard safety net regardless.
const NEWS_SITEMAP_WINDOW_HOURS = 48;
const NEWS_SITEMAP_MIN_SCORE = 50;

export async function getArticlesForNewsSitemap(): Promise<
  Pick<DbArticleRow, "id" | "title" | "language" | "published_at">[]
> {
  const since = new Date(Date.now() - NEWS_SITEMAP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await getServiceRoleClient()
    .from("articles")
    .select("id, title, language, published_at")
    .gte("published_at", since)
    .gte("importance_score", NEWS_SITEMAP_MIN_SCORE)
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error || !data) return [];
  return data as Pick<DbArticleRow, "id" | "title" | "language" | "published_at">[];
}

// Most recently ingested articles for the RSS feed (Google Discover "Follow"
// support). Ordered by created_at (ingestion time), matching the sitemap's
// ordering — not published_at, so the feed always reflects what GlobeVortex
// just added rather than the original publish date. Pass a `language` to scope
// the feed to a single locale (each locale has its own /{lang}/feed.xml);
// omitting it returns both languages (legacy combined behaviour).
export async function getRecentArticlesForFeed(
  limit = 50,
  language?: Language,
): Promise<Pick<DbArticleRow, "id" | "title" | "summary" | "created_at">[]> {
  let query = getServiceRoleClient()
    .from("articles")
    .select("id, title, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (language) query = query.eq("language", language);
  const { data, error } = await query;
  if (error) throw new Error(`Supabase feed read failed: ${error.message}`);
  return data as Pick<DbArticleRow, "id" | "title" | "summary" | "created_at">[];
}

// Sibling articles in the same category, highest-importance first, excluding
// the one being viewed. Powers the "related" rail on the article page. Selects
// only the columns the related cards render — `url` is omitted because related
// links are internal (/article/[id]), never to the external source.
export async function getRelatedArticles(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<DbArticleRow[]> {
  const { data, error } = await getServiceRoleClient()
    .from("articles")
    .select("id, title, source, category, published_at, created_at, language, image_url, summary")
    .eq("category", category)
    .neq("id", excludeId)
    .order("importance_score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as DbArticleRow[];
}

export async function searchArticles({
  query,
  language,
  pageSize = 24,
}: {
  query: string;
  language: "en" | "fr";
  pageSize?: number;
}): Promise<Article[]> {
  if (!query.trim()) return [];
  const db = getServiceRoleClient();
  const term = `%${query.trim()}%`;
  const { data, error } = await db
    .from("articles")
    .select("*")
    .eq("language", language)
    .or(`title.ilike.${term},summary.ilike.${term}`)
    .order("published_at", { ascending: false })
    .limit(pageSize);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data as DbArticleRow[]).map(rowToArticle);
}

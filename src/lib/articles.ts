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
}

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SINCE_HOURS = 24;
const TOP_STORIES_MIN_SCORE = 60;
const TOP_STORIES_TARGET = 10;
const TOP_STORIES_FALLBACK_CATEGORIES: ReadonlyArray<ArticleCategory> = [
  "world", "politics", "economy", "science", "climate",
  "conflicts", "health", "culture", "sports",
];

type ArticleCategory = Exclude<CategoryId, "all" | "top">;

const VALID_CATEGORIES: ReadonlySet<string> = new Set<ArticleCategory>([
  "world", "politics", "economy", "science", "climate",
  "conflicts", "health", "culture", "sports", "fifa",
]);

// Maps a DB row to the Article shape the frontend already consumes. `summary`
// becomes `description`; `country` is unused by the UI so it defaults to "".
export function rowToArticle(row: DbArticleRow): Article {
  const category = (VALID_CATEGORIES.has(row.category) ? row.category : "world") as ArticleCategory;
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

// Reads the highest-importance recent articles for the Top Stories rail.
// Diversity strategy: guaranteed cross-category representation.
//   Step 1 — top 3 overall (any category, score >= 75, last 24h). These are
//             the headline slots and may share a category.
//   Step 2 — best article per category (9 categories, last 48h) not already
//             seen by URL. One slot per category ensures breadth.
//   Step 3 — merge, deduplicate by URL, sort by importance_score DESC, cap 10.
export async function getTopStories({
  sinceHours = DEFAULT_SINCE_HOURS,
}: { sinceHours?: number } = {}): Promise<Article[]> {
  const db = getServiceRoleClient();
  const since24h = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Step 1 — top 3 headlines (any category)
  const { data: headlineData, error: headlineError } = await db
    .from("articles")
    .select("*")
    .gte("created_at", since24h)
    .gte("importance_score", TOP_STORIES_MIN_SCORE)
    .order("importance_score", { ascending: false })
    .limit(3);

  if (headlineError) throw new Error(`Supabase top-stories read failed: ${headlineError.message}`);

  const headlines = headlineData as DbArticleRow[];
  const seenUrls = new Set(headlines.map((r) => r.url));

  // Step 2 — best article per category from last 48h, skipping seen URLs
  const categoryRows: DbArticleRow[] = [];

  await Promise.all(
    TOP_STORIES_FALLBACK_CATEGORIES.map(async (cat) => {
      const { data, error } = await db
        .from("articles")
        .select("*")
        .gte("created_at", since48h)
        .eq("category", cat)
        .order("importance_score", { ascending: false })
        .limit(5);

      if (error || !data) return;

      const best = (data as DbArticleRow[]).find((r) => !seenUrls.has(r.url));
      if (best) {
        seenUrls.add(best.url);
        categoryRows.push(best);
      }
    }),
  );

  // Step 3 — merge, deduplicate, sort, cap at TARGET
  const merged = [...headlines, ...categoryRows];
  merged.sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0));

  const seen = new Set<string>();
  const deduped = merged.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return deduped.slice(0, TOP_STORIES_TARGET).map(rowToArticle);
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

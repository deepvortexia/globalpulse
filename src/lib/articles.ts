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
}

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SINCE_HOURS = 24;

type ArticleCategory = Exclude<CategoryId, "all">;

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

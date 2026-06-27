import { getArticles } from "@/lib/articles";
import type { Article } from "@/types";
import NewsBoard from "@/components/NewsBoard";

// ISR: HTML is server-rendered with data baked in and revalidated every 60s.
// Articles are read from Supabase (populated by the /api/cron/fetch-news
// background job) rather than fetched live from RSS — instant page loads.
export const revalidate = 60;

// NewsBoard filters by language + category and paginates entirely client-side,
// so hand it a broad pool spanning both languages and every category.
const HOME_POOL_SIZE = 1000;
const HOME_WINDOW_HOURS = 48;

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    articles = await getArticles({
      category: "all",
      page: 1,
      pageSize: HOME_POOL_SIZE,
      sinceHours: HOME_WINDOW_HOURS,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load news";
  }

  return <NewsBoard articles={articles} error={error} />;
}

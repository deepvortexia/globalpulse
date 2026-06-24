import { fetchAllFeeds } from "@/lib/rss-fetcher";
import type { Article } from "@/types";
import NewsBoard from "@/components/NewsBoard";

// ISR: HTML is server-rendered with data baked in and revalidated every 60s,
// removing the client-side fetch waterfall and loading flash entirely.
export const revalidate = 60;

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  // Call the feed aggregator directly on the server — no self-HTTP round-trip.
  try {
    articles = await fetchAllFeeds();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load news";
  }

  return <NewsBoard articles={articles} error={error} />;
}

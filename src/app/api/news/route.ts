import { fetchAllFeeds } from "@/lib/rss-fetcher";
import type { Article, ApiResponse } from "@/types";

export const revalidate = 300;

export async function GET() {
  try {
    const articles = await fetchAllFeeds();
    return Response.json({ success: true, data: articles } satisfies ApiResponse<Article[]>, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[/api/news] Failed to fetch feeds:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch news feeds",
      } satisfies ApiResponse<Article[]>,
      { status: 500 }
    );
  }
}

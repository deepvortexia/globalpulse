import { getArticles } from "@/lib/articles";
import type { Article, ApiResponse, CategoryId } from "@/types";

// Reads from Supabase at request time (populated by the /api/cron/fetch-news
// background job). No live RSS fetching here — keeps responses fast.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") as CategoryId | null) ?? undefined;
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const articles = await getArticles({ category, page, pageSize: PAGE_SIZE });

    return Response.json({ success: true, data: articles } satisfies ApiResponse<Article[]>, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[/api/news] Failed to read articles:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read news articles",
      } satisfies ApiResponse<Article[]>,
      { status: 500 }
    );
  }
}

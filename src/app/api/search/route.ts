import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const lang = req.nextUrl.searchParams.get("lang") === "fr" ? "fr" : "en";
  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json([]);
  }
  try {
    const articles = await searchArticles({ query: q, language: lang, pageSize: 48 });
    return NextResponse.json(articles);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

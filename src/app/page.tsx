"use client";

import { useEffect, useState } from "react";
import type { Article, ApiResponse, Summary } from "@/types";

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json() as Promise<ApiResponse<Article[]>>)
      .then((json) => {
        if (json.success) {
          setArticles(json.data);
        } else {
          setNewsError(json.error);
        }
      })
      .catch((error) => setNewsError(error instanceof Error ? error.message : "Failed to load news"));
  }, []);

  async function testSummarize(article: Article) {
    setSummaryLoading(true);
    setSummary(null);
    setSummaryError(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, description: article.description }),
      });
      const json = (await res.json()) as ApiResponse<Summary>;
      if (json.success) {
        setSummary(json.data);
      } else {
        setSummaryError(json.error);
      }
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Failed to summarize article");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">GlobeVortex API check</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">/api/news</h2>
          {newsError && <p className="text-red-600 dark:text-red-400">Error: {newsError}</p>}
          {!newsError && articles === null && <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>}
          {!newsError && articles !== null && (
            <p className="text-zinc-600 dark:text-zinc-400">Fetched {articles.length} articles.</p>
          )}
          <ul className="flex flex-col gap-2">
            {articles?.slice(0, 5).map((article) => (
              <li key={article.id} className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-sm font-medium text-black dark:text-zinc-50">{article.title}</span>
                <span className="text-xs text-zinc-500">
                  {article.source} · {article.language.toUpperCase()} · {article.category}
                </span>
                <button
                  type="button"
                  onClick={() => testSummarize(article)}
                  className="mt-1 self-start rounded bg-black px-3 py-1 text-xs text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                >
                  Test /api/summarize
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">/api/summarize</h2>
          {summaryLoading && <p className="text-zinc-600 dark:text-zinc-400">Summarizing...</p>}
          {summaryError && <p className="text-red-600 dark:text-red-400">Error: {summaryError}</p>}
          {summary && (
            <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="text-black dark:text-zinc-50">
                <strong>EN:</strong> {summary.summaryEn}
              </p>
              <p className="text-black dark:text-zinc-50">
                <strong>FR:</strong> {summary.summaryFr}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Category: {summary.category} · Tags: {summary.tags.join(", ")}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

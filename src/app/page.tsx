"use client";

import { useEffect, useMemo, useState } from "react";
import type { Article, ApiResponse, Language } from "@/types";
import Header from "@/components/Header";
import NewsTicker from "@/components/NewsTicker";
import NewsGrid from "@/components/NewsGrid";

const UI_TEXT: Record<Language, { latest: string; loading: string; empty: string }> = {
  en: { latest: "World · Right Now", loading: "Loading the latest news…", empty: "No stories available right now." },
  fr: { latest: "Le Monde · En Direct", loading: "Chargement des dernières actualités…", empty: "Aucun article disponible pour le moment." },
};

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");

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
      .catch((error) =>
        setNewsError(error instanceof Error ? error.message : "Failed to load news"),
      );
  }, []);

  // Articles carry a per-source language; show those matching the toggle,
  // falling back to everything if the selected language has no stories yet.
  const visibleArticles = useMemo(() => {
    if (!articles) return [];
    const matching = articles.filter((article) => article.language === language);
    return matching.length > 0 ? matching : articles;
  }, [articles, language]);

  const headlines = useMemo(
    () => visibleArticles.slice(0, 15).map((article) => article.title),
    [visibleArticles],
  );

  const text = UI_TEXT[language];

  return (
    <div className="flex min-h-screen flex-col bg-gv-bg text-white">
      <Header language={language} onLanguageChange={setLanguage} />
      <NewsTicker headlines={headlines} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            {text.latest}
          </h1>
          <span className="mt-3 block h-0.5 w-20 rounded-full bg-gradient-to-r from-gv-gold to-transparent" />
        </div>

        {newsError && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-300">
            {newsError}
          </p>
        )}

        {!newsError && articles === null && (
          <p className="text-gv-muted">{text.loading}</p>
        )}

        {!newsError && articles !== null && visibleArticles.length === 0 && (
          <p className="text-gv-muted">{text.empty}</p>
        )}

        {visibleArticles.length > 0 && (
          <NewsGrid articles={visibleArticles} language={language} />
        )}
      </main>
    </div>
  );
}

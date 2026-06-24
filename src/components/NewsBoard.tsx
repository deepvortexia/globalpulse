"use client";

import { useMemo, useState } from "react";
import type { Article, CategoryId, Language } from "@/types";
import { CATEGORIES } from "@/lib/categories";
import Header from "@/components/Header";
import NewsTicker from "@/components/NewsTicker";
import NewsGrid from "@/components/NewsGrid";
import BreakingNewsFeed from "@/components/BreakingNewsFeed";
import CategoryNav from "@/components/CategoryNav";

interface NewsBoardProps {
  articles: Article[];
  error?: string | null;
}

const UI_TEXT: Record<Language, { latest: string; empty: string }> = {
  en: { latest: "World · Right Now", empty: "No stories available right now." },
  fr: { latest: "Le Monde · En Direct", empty: "Aucun article disponible pour le moment." },
};

// Client boundary that owns the language toggle and everything that reacts to
// it (header, ticker, heading, grid). Articles arrive pre-fetched from the
// Server Component as props — no data fetching happens here.
export default function NewsBoard({ articles, error }: NewsBoardProps) {
  const [language, setLanguage] = useState<Language>("en");
  const [categoryId, setCategoryId] = useState<CategoryId>("all");

  // Articles carry a per-source language; show those matching the toggle,
  // falling back to everything if the selected language has no stories yet.
  const languageArticles = useMemo(() => {
    const matching = articles.filter((article) => article.language === language);
    return matching.length > 0 ? matching : articles;
  }, [articles, language]);

  // Per-category counts within the current language pool ("all" = total),
  // shown as badges on each category pill.
  const counts = useMemo(() => {
    const tally = Object.fromEntries(
      CATEGORIES.map((cat) => [cat.id, 0]),
    ) as Record<CategoryId, number>;
    for (const article of languageArticles) {
      tally.all += 1;
      tally[article.category] += 1;
    }
    return tally;
  }, [languageArticles]);

  // Narrow the language pool to the selected category (all = no filter).
  const visibleArticles = useMemo(() => {
    if (categoryId === "all") return languageArticles;
    return languageArticles.filter((article) => article.category === categoryId);
  }, [languageArticles, categoryId]);

  const headlines = useMemo(
    () => visibleArticles.slice(0, 15).map((article) => article.title),
    [visibleArticles],
  );

  const text = UI_TEXT[language];

  return (
    <div className="flex min-h-screen flex-col text-white">
      <Header language={language} onLanguageChange={setLanguage} />
      <NewsTicker headlines={headlines} />

      <BreakingNewsFeed articles={articles} />

      <CategoryNav
        activeId={categoryId}
        onChange={setCategoryId}
        counts={counts}
        language={language}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-3xl">
            {text.latest}
          </h1>
          <span className="mt-3 block h-0.5 w-20 rounded-full bg-gradient-to-r from-gv-gold to-transparent" />
        </div>

        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-300">
            {error}
          </p>
        )}

        {!error && visibleArticles.length === 0 && (
          <p className="text-gv-muted">{text.empty}</p>
        )}

        {visibleArticles.length > 0 && (
          <NewsGrid articles={visibleArticles} language={language} />
        )}
      </main>
    </div>
  );
}

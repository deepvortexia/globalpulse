"use client";

import { useEffect, useMemo, useState } from "react";
import type { Article, CategoryId, Language } from "@/types";
import { CATEGORIES } from "@/lib/categories";
import Header from "@/components/Header";
import NewsGrid from "@/components/NewsGrid";
import CategoryNav from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import FifaSection from "@/components/FifaSection";
import Footer from "@/components/Footer";

interface NewsBoardProps {
  articles: Article[];
  // Prefetched high-importance set shown when the "top" category is selected.
  topStories?: Article[];
  error?: string | null;
}

const UI_TEXT: Record<Language, { latest: string; empty: string }> = {
  en: { latest: "World · Right Now", empty: "No stories available right now." },
  fr: { latest: "Le Monde · En Direct", empty: "Aucun article disponible pour le moment." },
};

const ARTICLES_PER_PAGE = 24;

// Client boundary that owns the language toggle and everything that reacts to
// it (header, heading, grid). Articles arrive pre-fetched from the Server
// Component as props — no data fetching happens here.
export default function NewsBoard({ articles, topStories = [], error }: NewsBoardProps) {
  const [language, setLanguage] = useState<Language>("en");
  const [categoryId, setCategoryId] = useState<CategoryId>("top");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Strict per-language view: only ever show articles whose source language
  // matches the toggle (no cross-language fallback).
  const languageArticles = useMemo(
    () => articles.filter((article) => article.language === language),
    [articles, language],
  );

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

  // Narrow the language pool to the selected category (all = no filter). "top"
  // is a virtual bucket served from the prefetched topStories set rather than
  // the main pool; still apply the strict per-language filter for consistency.
  const visibleArticles = useMemo(() => {
    if (categoryId === "top") {
      return topStories.filter((article) => article.language === language);
    }
    if (categoryId === "all") return languageArticles;
    return languageArticles.filter((article) => article.category === categoryId);
  }, [languageArticles, categoryId, topStories, language]);

  // Switching category or language invalidates the current page's slice.
  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [categoryId, language]);

  const paginatedArticles = visibleArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE,
  );
  const totalPages = Math.ceil(visibleArticles.length / ARTICLES_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const text = UI_TEXT[language];

  return (
    <div className="flex min-h-screen flex-col text-white">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onMenuClick={() => setMenuOpen(true)}
        articles={articles}
        onFifaClick={() => setCategoryId("fifa")}
        fifaActive={categoryId === "fifa"}
      />

      <CategoryNav
        activeId={categoryId}
        onChange={setCategoryId}
        counts={counts}
        language={language}
        menuOpen={menuOpen}
        onMenuClose={() => setMenuOpen(false)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        {categoryId === "fifa" ? (
          // FIFA hub has its own live-data pipeline and banner — it bypasses the
          // RSS article grid entirely.
          <FifaSection language={language} />
        ) : (
          <>
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
              <>
                <NewsGrid articles={paginatedArticles} language={language} />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </>
        )}
      </main>

      <Footer language={language} />
    </div>
  );
}

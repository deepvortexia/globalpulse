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

const UI_TEXT: Record<
  Language,
  {
    latest: string;
    empty: string;
    searchPlaceholder: string;
    searchResults: (n: number, q: string) => string;
    searchEmpty: (q: string) => string;
  }
> = {
  en: {
    latest: "World · Right Now",
    empty: "No stories available right now.",
    searchPlaceholder: "Search news...",
    searchResults: (n, q) => `${n} result${n !== 1 ? "s" : ""} for "${q}"`,
    searchEmpty: (q) => `No results for "${q}"`,
  },
  fr: {
    latest: "Le Monde · En Direct",
    empty: "Aucun article disponible pour le moment.",
    searchPlaceholder: "Rechercher...",
    searchResults: (n, q) => `${n} résultat${n !== 1 ? "s" : ""} pour "${q}"`,
    searchEmpty: (q) => `Aucun résultat pour "${q}"`,
  },
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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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

  // Debounced search: fires 400ms after the user stops typing.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&lang=${language}`,
        );
        const data: unknown = await res.json();
        setSearchResults(Array.isArray(data) ? (data as Article[]) : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  // Clicking a category pill exits search mode.
  function handleCategoryChange(id: CategoryId) {
    setCategoryId(id);
    setSearchQuery("");
    setSearchResults(null);
  }

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
  const isSearchActive = searchResults !== null || isSearching;

  return (
    <div className="flex min-h-screen flex-col text-white">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onMenuClick={() => setMenuOpen(true)}
        articles={articles}
        onFifaClick={() => handleCategoryChange("fifa")}
        fifaActive={categoryId === "fifa"}
      />

      {/* Search bar */}
      <div className="border-b border-gv-border/40 bg-gv-bg/60 px-4 py-3 sm:px-6">
        <div className="relative mx-auto max-w-xl">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gv-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={text.searchPlaceholder}
            className="w-full rounded-full border border-gv-border bg-transparent py-2.5 pl-10 pr-10 text-sm text-white placeholder-gv-muted transition-colors focus:border-gv-gold focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="absolute inset-y-0 right-4 flex items-center text-gv-muted transition-colors hover:text-white"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <CategoryNav
        activeId={categoryId}
        onChange={handleCategoryChange}
        counts={counts}
        language={language}
        menuOpen={menuOpen}
        onMenuClose={() => setMenuOpen(false)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        {/* Search results view */}
        {isSearchActive ? (
          <>
            <div className="mb-8">
              <p
                className={`text-sm text-gv-muted ${isSearching ? "animate-pulse" : ""}`}
              >
                {isSearching
                  ? text.searchPlaceholder
                  : searchResults && searchResults.length > 0
                    ? text.searchResults(searchResults.length, searchQuery.trim())
                    : text.searchEmpty(searchQuery.trim())}
              </p>
            </div>
            {!isSearching && searchResults && searchResults.length > 0 && (
              <NewsGrid articles={searchResults} language={language} />
            )}
          </>
        ) : categoryId === "fifa" ? (
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

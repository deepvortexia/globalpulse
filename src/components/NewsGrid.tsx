"use client";

import { useEffect, useRef, useState } from "react";
import type { Article, Language } from "@/types";
import NewsCard from "./NewsCard";

interface NewsGridProps {
  articles: Article[];
  language: Language;
}

// Cards reveal in waves; bounding the stagger keeps far-down cards from
// inheriting multi-second delays.
const STAGGER_MS = 80;
const STAGGER_WINDOW = 9;

// Render only the first PAGE_SIZE cards, then grow by PAGE_SIZE as the user
// scrolls — keeps the DOM small for 400+ article feeds.
const PAGE_SIZE = 30;

export default function NewsGrid({ articles, language }: NewsGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset the window when the article set changes (e.g. language switch).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [articles]);

  // Grow the window as the bottom sentinel approaches the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    if (visibleCount >= articles.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, articles.length));
        }
      },
      { rootMargin: "400px 0px" }, // load ahead of the fold for a seamless scroll
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, articles.length]);

  // Reveal-on-scroll animation for whatever cards are currently rendered.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reveal]:not(.gv-revealed)"),
    );

    if (typeof IntersectionObserver === "undefined") {
      items.forEach((item) => item.classList.add("gv-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("gv-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [visibleCount, articles]);

  const shown = articles.slice(0, visibleCount);

  return (
    <div
      className="rounded-2xl p-2 sm:p-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at center, #1a1a24 0%, #0a0a0f 70%)",
      }}
    >
      <div
        ref={containerRef}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {shown.map((article, index) => (
          <div
            key={article.id}
            data-reveal
            className="gv-reveal"
            style={{ transitionDelay: `${(index % STAGGER_WINDOW) * STAGGER_MS}ms` }}
          >
            {/* First card of each 3-col row sits slightly forward. */}
            <NewsCard
              article={article}
              language={language}
              featured={index % 3 === 0}
            />
          </div>
        ))}
      </div>

      {visibleCount < articles.length && (
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      )}
    </div>
  );
}

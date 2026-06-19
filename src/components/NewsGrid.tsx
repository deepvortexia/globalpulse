"use client";

import { useEffect, useRef } from "react";
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

export default function NewsGrid({ articles, language }: NewsGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reveal]"),
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
  }, [articles]);

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
        {articles.map((article, index) => (
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
    </div>
  );
}

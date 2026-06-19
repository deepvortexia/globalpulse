"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { Article, Language } from "@/types";

interface NewsCardProps {
  article: Article;
  language: Language;
}

const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  world: { en: "World", fr: "Monde" },
  business: { en: "Business", fr: "Économie" },
  politics: { en: "Politics", fr: "Politique" },
};

const MAX_TILT = 8; // degrees

function categoryLabel(category: string, language: Language): string {
  return CATEGORY_LABELS[category]?.[language] ?? category;
}

function formatPublished(publishedAt: string, language: Language): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === "fr" ? fr : enUS,
  });
}

export default function NewsCard({ article, language }: NewsCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  function handleMouseMove(event: React.MouseEvent<HTMLAnchorElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width; // 0..1
    const py = (event.clientY - rect.top) / rect.height; // 0..1
    setTilt({
      rotateX: (0.5 - py) * 2 * MAX_TILT,
      rotateY: (px - 0.5) * 2 * MAX_TILT,
    });
  }

  function handleMouseLeave() {
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  const time = formatPublished(article.publishedAt, language);

  return (
    <a
      ref={cardRef}
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
      }}
      className="group flex h-full flex-col gap-3 rounded-xl border border-gv-border bg-gv-card p-5 transition-[border-color,box-shadow] duration-200 [transform-style:preserve-3d] hover:border-gv-gold hover:shadow-lg hover:shadow-black/40"
    >
      <span className="self-start rounded-full bg-gv-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gv-gold">
        {categoryLabel(article.category, language)}
      </span>

      <h3 className="font-display text-lg font-semibold leading-snug text-white">
        {article.title}
      </h3>

      {article.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-gv-muted">
          {article.description}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-gv-muted">
        <span className="font-medium text-gv-muted">{article.source}</span>
        {time && (
          <>
            <span aria-hidden>·</span>
            <span>{time}</span>
          </>
        )}
      </div>
    </a>
  );
}

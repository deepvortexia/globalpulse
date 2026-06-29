"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { Article, Language } from "@/types";
import { categoryLabel } from "@/lib/categories";

interface NewsCardProps {
  article: Article;
  language: Language;
  featured?: boolean;
}

const MAX_TILT = 8; // degrees

function formatPublished(publishedAt: string, language: Language): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === "fr" ? fr : enUS,
  });
}

function NewsCard({ article, language, featured = false }: NewsCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [hovering, setHovering] = useState(false);

  // Relative "time ago" depends on the current clock, so it must not be
  // computed during render — that diverges between the SSR snapshot and the
  // hydration render (React error #418). Start empty (matching SSR) and fill
  // it in after mount.
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setTime(formatPublished(article.publishedAt, language));
  }, [article.publishedAt, language]);

  // Only enable the 3D tilt on devices with a fine pointer that can hover
  // (mouse/trackpad). Touch devices skip it entirely — they can't hover, and
  // the tilt would otherwise stick after a tap. Starts false so SSR and touch
  // render identically (no hydration mismatch, no layout shift).
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setCanHover(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function handleMouseMove(event: React.MouseEvent<HTMLAnchorElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width; // 0..1
    const py = (event.clientY - rect.top) / rect.height; // 0..1
    setHovering(true);
    setTilt({
      rotateX: (0.5 - py) * 2 * MAX_TILT,
      rotateY: (px - 0.5) * 2 * MAX_TILT,
    });
  }

  function handleMouseLeave() {
    setHovering(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  // Featured cards sit slightly forward; hovering lifts any card to 1.03.
  const baseScale = featured ? 1.02 : 1;
  const tiltActive = canHover && hovering;
  const scale = tiltActive ? 1.03 : baseScale;
  const rotateX = tiltActive ? tilt.rotateX : 0;
  const rotateY = tiltActive ? tilt.rotateY : 0;

  return (
    <Link
      ref={cardRef}
      href={`/article/${article.id}`}
      onMouseMove={canHover ? handleMouseMove : undefined}
      onMouseLeave={canHover ? handleMouseLeave : undefined}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
        // Fast follow while tracking the cursor, slower easing back to rest.
        // Transform-only (no box-shadow) keeps the hover compositor-cheap.
        transition: tiltActive
          ? "transform 0.1s ease, border-color 0.3s ease"
          : "transform 0.4s ease, border-color 0.3s ease",
        willChange: "transform",
      }}
      className="group flex h-full flex-col gap-3 rounded-xl border border-gv-border bg-gv-card p-3 [transform-style:preserve-3d] hover:border-gv-gold sm:p-4 lg:p-5"
    >
      <span className="self-start rounded-full bg-gv-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gv-gold">
        {categoryLabel(article.category, language)}
      </span>

      <h3 className="font-display text-base font-semibold leading-snug text-white sm:text-lg">
        {article.title}
      </h3>

      {article.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-gv-muted">
          {article.description}
        </p>
      )}

      <div
        className="mt-auto flex items-center gap-2 pt-2 text-xs text-gv-muted"
        suppressHydrationWarning
      >
        <span className="font-medium text-gv-muted">{article.source}</span>
        {time && (
          <>
            <span aria-hidden>·</span>
            <span>{time}</span>
          </>
        )}
      </div>
    </Link>
  );
}

// Memoized: when the grid grows, already-rendered cards keep the same
// article/language props and skip re-rendering.
export default memo(NewsCard);

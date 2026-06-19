"use client";

import { useEffect, useRef, useState } from "react";
import type { Article } from "@/types";

interface BreakingNewsFeedProps {
  articles: Article[];
}

interface BreakingItem {
  key: number;
  article: Article;
}

const ROTATE_INTERVAL_MS = 8000;
const DISPLAY_MS = 3000;
const EXIT_ANIM_MS = 400;
const MAX_ITEMS = 5;

export default function BreakingNewsFeed({ articles }: BreakingNewsFeedProps) {
  const [items, setItems] = useState<BreakingItem[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    if (articles.length === 0) return;

    const interval = setInterval(() => {
      const article = articles[Math.floor(Math.random() * articles.length)];
      keyRef.current += 1;
      setItems((current) => [{ key: keyRef.current, article }, ...current].slice(0, MAX_ITEMS));
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [articles]);

  function handleExpire(key: number) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  return (
    <aside
      className="fixed top-0 right-0 z-40 hidden h-screen w-[280px] flex-col overflow-hidden border-l-2 border-gv-gold bg-[#0d0b10] lg:flex"
      aria-label="Breaking news"
    >
      <div className="px-4 pt-5 pb-3">
        <span className="text-xs font-bold tracking-[0.2em] text-gv-gold">⚡ BREAKING</span>
      </div>

      <div className="flex flex-col gap-3 px-3">
        {items.map((item) => (
          <BreakingNewsCard key={item.key} item={item} onExpire={handleExpire} />
        ))}
      </div>
    </aside>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  world: "World",
  business: "Business",
  politics: "Politics",
};

function BreakingNewsCard({
  item,
  onExpire,
}: {
  item: BreakingItem;
  onExpire: (key: number) => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const displayTimer = setTimeout(() => setExiting(true), DISPLAY_MS);
    return () => clearTimeout(displayTimer);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const removeTimer = setTimeout(() => onExpire(item.key), EXIT_ANIM_MS);
    return () => clearTimeout(removeTimer);
  }, [exiting, item.key, onExpire]);

  const { article } = item;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border border-gv-border bg-gv-card p-3 ${
        exiting ? "animate-card-flip-out" : "animate-slide-in-right"
      }`}
    >
      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-gv-gold">
        {CATEGORY_LABELS[article.category] ?? article.category}
      </span>

      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-white">
        {article.title}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-gv-muted">
        <span>{article.source}</span>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-1 font-semibold text-red-500">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
          LIVE
        </span>
      </div>
    </a>
  );
}

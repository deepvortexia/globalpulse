"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Article, Language } from "@/types";
import { CATEGORIES } from "@/lib/categories";

interface BreakingNewsFeedProps {
  articles: Article[];
  language: Language;
}

type Score = 1 | 2 | 3;

interface ScoredArticle {
  key: number;
  article: Article;
  score: Score;
  emoji: string;
}

const QUEUE_INTERVAL_MS = 12000;
const MAX_QUEUE = 5;
// Per-score on-screen hold duration; higher scores linger longer so a
// "breaking" (3) item gets the most reading time. Floor raised to 10s so
// even a calm (1) item gives the reader enough time to read it.
const HOLD_MS: Record<Score, number> = { 1: 10000, 2: 12000, 3: 18000 };
const EXIT_ANIM_MS = 500;

const EMOJI_POOL = ["📰", "🌍", "💰", "🏛️", "📊", "🔥", "🚨", "⚡"];

// No real-time AI scoring pipeline exists yet (articles carry no score/emoji
// field, and adding a per-article Haiku call is out of scope for this UI
// pass). Scores are simulated client-side, weighted toward calmer 1s/2s so a
// 3 ("breaking") feels rare.
function rollScore(): Score {
  const roll = Math.random();
  if (roll < 0.6) return 1;
  if (roll < 0.9) return 2;
  return 3;
}

function rollEmoji(): string {
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.label]),
);

function timeAgo(publishedAt: string): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export default function BreakingNewsFeed({ articles, language }: BreakingNewsFeedProps) {
  return null; // temp: disabled — causes layout shift (re-enable when fixed)
  const [queue, setQueue] = useState<ScoredArticle[]>([]);
  const [current, setCurrent] = useState<ScoredArticle | null>(null);
  const [exiting, setExiting] = useState(false);
  const keyRef = useRef(0);

  // Only surface stories in the currently selected language.
  const langArticles = useMemo(
    () => articles.filter((article) => article.language === language),
    [articles, language],
  );

  // On a language switch, drop anything queued/showing so we don't flash a
  // story from the previous language before the new feed takes over.
  useEffect(() => {
    setQueue([]);
    setCurrent(null);
    setExiting(false);
    keyRef.current = 0;
  }, [language]);

  // Producer: every 12s, score a random article and append it to the queue.
  useEffect(() => {
    if (langArticles.length === 0) return;

    const interval = setInterval(() => {
      const article = langArticles[Math.floor(Math.random() * langArticles.length)];
      keyRef.current += 1;
      setQueue((q) =>
        [...q, { key: keyRef.current, article, score: rollScore(), emoji: rollEmoji() }].slice(
          -MAX_QUEUE,
        ),
      );
    }, QUEUE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [langArticles]);

  // Consumer: when nothing is showing, pull the next item off the queue.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setExiting(false);
    setQueue(rest);
  }, [current, queue]);

  // Hold the current item, then slide it out and clear it so the consumer
  // effect above advances to the next queued item.
  useEffect(() => {
    if (!current) return;
    const holdMs = HOLD_MS[current.score];
    const holdTimer = setTimeout(() => setExiting(true), holdMs);
    return () => clearTimeout(holdTimer);
  }, [current]);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(() => setCurrent(null), EXIT_ANIM_MS);
    return () => clearTimeout(exitTimer);
  }, [exiting]);

  if (!current) return null;

  const { article, score, emoji } = current!;
  const isBreaking = score === 3;

  return (
    <div
      className={`overflow-hidden transition-[max-height] duration-[400ms] ease-in-out ${
        current && !exiting ? "max-h-[110px] sm:max-h-[72px]" : "max-h-0"
      }`}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full cursor-pointer hover:brightness-110"
        style={{
          backgroundColor: "#0d0b10",
          backgroundImage: isBreaking
            ? "radial-gradient(ellipse at 50% 50%, rgba(220, 38, 38, 0.18) 0%, transparent 70%)"
            : undefined,
          borderTop: "2px solid #C9A84C",
          borderBottom: "2px solid #C9A84C",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          {/* MOBILE layout: stacked */}
          <div className="flex flex-col gap-1 sm:hidden">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 text-xl">{emoji}</span>
              <span className="line-clamp-2 whitespace-normal font-display text-sm font-semibold text-white">
                {article.title}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gv-muted opacity-60">
              <span>{article.source}</span>
              <span>·</span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
          </div>

          {/* DESKTOP layout: single row */}
          <div className="hidden min-h-[48px] items-center gap-4 sm:flex">
            <span className="flex-shrink-0 text-xl">{emoji}</span>

            <span className="hidden flex-shrink-0 rounded-full bg-gv-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gv-gold sm:inline-block">
              {CATEGORY_LABELS[article.category] ?? article.category}
            </span>

            {isBreaking && (
              <span className="hidden flex-shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold tracking-wide text-white sm:inline-block">
                ⚡ BREAKING
              </span>
            )}

            <span className="line-clamp-1 flex-1 font-display text-sm font-semibold text-white transition-colors group-hover:text-gv-gold">
              {article.title}
            </span>

            <div className="flex flex-shrink-0 items-center gap-2 text-xs text-gv-muted">
              <span className="font-medium">{article.source}</span>
              <span>·</span>
              <span className="flex items-center gap-1 font-semibold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
              <span>·</span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
          </div>
        </div>

        {/* Score-3 only: time-remaining bar shrinking from full width to 0 over
            the hold duration, signalling how long the breaking item stays. */}
        {isBreaking && (
          <span
            aria-hidden
            className="animate-banner-progress absolute bottom-0 left-0 h-0.5 w-full bg-gv-gold"
            style={{ animationDuration: `${HOLD_MS[score]}ms` }}
          />
        )}
      </a>
    </div>
  );
}

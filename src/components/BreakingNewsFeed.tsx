"use client";

import { useEffect, useRef, useState } from "react";
import type { Article } from "@/types";

interface BreakingNewsFeedProps {
  articles: Article[];
}

type Score = 1 | 2 | 3;

interface ScoredArticle {
  key: number;
  article: Article;
  score: Score;
  emoji: string;
}

const QUEUE_INTERVAL_MS = 8000;
const MAX_QUEUE = 5;
const HOLD_MS = 5000;
const HOLD_MS_BREAKING = 8000;
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

const SCORE_BADGE_CLASSES: Record<Score, string> = {
  1: "bg-gv-gold text-gv-bg",
  2: "bg-orange-500 text-white",
  3: "bg-red-600 text-white animate-pulse",
};

const CATEGORY_LABELS: Record<string, string> = {
  world: "World",
  business: "Business",
  politics: "Politics",
};

function timeAgo(publishedAt: string): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export default function BreakingNewsFeed({ articles }: BreakingNewsFeedProps) {
  const [queue, setQueue] = useState<ScoredArticle[]>([]);
  const [current, setCurrent] = useState<ScoredArticle | null>(null);
  const [exiting, setExiting] = useState(false);
  const keyRef = useRef(0);

  // Producer: every 8s, score a random article and append it to the queue.
  useEffect(() => {
    if (articles.length === 0) return;

    const interval = setInterval(() => {
      const article = articles[Math.floor(Math.random() * articles.length)];
      keyRef.current += 1;
      setQueue((q) =>
        [...q, { key: keyRef.current, article, score: rollScore(), emoji: rollEmoji() }].slice(
          -MAX_QUEUE,
        ),
      );
    }, QUEUE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [articles]);

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
    const holdMs = current.score === 3 ? HOLD_MS_BREAKING : HOLD_MS;
    const holdTimer = setTimeout(() => setExiting(true), holdMs);
    return () => clearTimeout(holdTimer);
  }, [current]);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(() => setCurrent(null), EXIT_ANIM_MS);
    return () => clearTimeout(exitTimer);
  }, [exiting]);

  if (!current) return null;

  const { article, score, emoji } = current;
  const isBreaking = score === 3;

  return (
    <div
      className={`w-full overflow-hidden border-b border-gv-border ${
        exiting ? "animate-banner-slide-up" : "animate-banner-slide-down"
      }`}
      style={{
        backgroundColor: "#0d0b10",
        backgroundImage: isBreaking
          ? "radial-gradient(ellipse at 50% 50%, rgba(220, 38, 38, 0.18) 0%, transparent 70%)"
          : undefined,
      }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Left: score badge + emoji */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${SCORE_BADGE_CLASSES[score]}`}
          >
            {score}
          </span>
          <span className="text-xl" aria-hidden>
            {emoji}
          </span>
        </div>

        {/* Center: category + breaking badge + headline */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden flex-shrink-0 rounded-full bg-gv-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gv-gold sm:inline-block">
            {CATEGORY_LABELS[article.category] ?? article.category}
          </span>

          {isBreaking && (
            <span className="flex-shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold tracking-wide text-white">
              ⚡ BREAKING
            </span>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-display text-base font-semibold text-white hover:text-gv-gold"
          >
            {article.title}
          </a>
        </div>

        {/* Right: source + live + time */}
        <div className="flex flex-shrink-0 items-center gap-2 text-xs text-gv-muted">
          <span className="hidden font-medium sm:inline">{article.source}</span>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <span className="flex items-center gap-1 font-semibold text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
            LIVE
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}

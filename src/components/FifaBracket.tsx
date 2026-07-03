"use client";

import { useMemo, useState } from "react";
import type { Language } from "@/types";
import type { FifaMatch } from "@/lib/fifa-api";
import { KNOCKOUT_ROUNDS } from "@/lib/fifa-api";

// Knockout progression view. Fed the full tournament match list, it buckets the
// knockout matches by ESPN round slug (`match.round`) and presents one round at a
// time behind a tab row — the same UX on desktop and mobile (a responsive grid of
// compact matchup cards), which reads far cleaner than a giant horizontal tree and
// avoids asserting feeder connections ESPN doesn't reliably expose.

interface FifaBracketProps {
  matches: FifaMatch[];
  language: Language;
}

// Full label (tab, desktop) + short label (tab, mobile) per round slug.
const ROUND_LABELS: Record<Language, Record<string, { full: string; short: string }>> = {
  en: {
    "round-of-32": { full: "Round of 32", short: "R32" },
    "round-of-16": { full: "Round of 16", short: "R16" },
    quarterfinals: { full: "Quarter-finals", short: "QF" },
    semifinals: { full: "Semi-finals", short: "SF" },
    "3rd-place-match": { full: "Third place", short: "3rd" },
    final: { full: "Final", short: "Final" },
  },
  fr: {
    "round-of-32": { full: "16es de finale", short: "16es" },
    "round-of-16": { full: "8es de finale", short: "8es" },
    quarterfinals: { full: "Quarts", short: "Quarts" },
    semifinals: { full: "Demies", short: "Demies" },
    "3rd-place-match": { full: "Petite finale", short: "3e" },
    final: { full: "Finale", short: "Finale" },
  },
};

const UI = {
  en: { tbd: "TBD", live: "Live", ht: "HT", ft: "FT" },
  fr: { tbd: "À déf.", live: "En direct", ht: "MT", ft: "Terminé" },
} as const;

// ESPN names an undetermined knockout slot after its feeder, e.g. "Round of 16 1
// Winner" or "Quarterfinal 2 Winner". Real nations never contain these words, so
// this cleanly separates a placeholder from a determined team. Exported so other
// sections (e.g. Upcoming) can hide fixtures whose teams aren't known yet.
const PLACEHOLDER_RE = /\b(winner|loser|runner)\b/i;
export const isPlaceholderTeam = (name: string) => PLACEHOLDER_RE.test(name);

function shortKickoff(match: FifaMatch, language: Language): string {
  if (match.kickoffMs == null) return "";
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(match.kickoffMs));
}

function TeamLine({
  flag,
  name,
  score,
  won,
  loser,
  tbd,
  tbdLabel,
}: {
  flag: string;
  name: string;
  score: number | null;
  won: boolean;
  loser: boolean;
  tbd: boolean;
  tbdLabel: string;
}) {
  if (tbd) {
    return (
      <div className="flex items-center gap-2 py-0.5 text-sm text-gv-muted/70">
        <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-gv-border text-[10px]" aria-hidden>
          ?
        </span>
        <span className="italic">{tbdLabel}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {flag}
        </span>
        <span className={`truncate text-sm ${won ? "font-bold text-white" : loser ? "text-gv-muted" : "text-white"}`}>
          {name}
        </span>
      </span>
      <span className={`tabular-nums text-sm ${won ? "font-bold text-gv-gold" : "text-gv-muted"}`}>
        {score ?? "–"}
      </span>
    </div>
  );
}

function MatchupCard({ match, language }: { match: FifaMatch; language: Language }) {
  const ui = UI[language];
  const finished = match.status === "finished";
  const live = match.status === "live";
  const homeTbd = isPlaceholderTeam(match.homeName);
  const awayTbd = isPlaceholderTeam(match.awayName);
  const decided = finished && !homeTbd && !awayTbd && match.homeScore != null && match.awayScore != null;
  const homeWon = decided && match.homeScore! > match.awayScore!;
  const awayWon = decided && match.awayScore! > match.homeScore!;

  const footer = live ? (
    <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide text-red-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />
      {match.isHalftime ? ui.ht : match.minute || ui.live}
    </span>
  ) : finished ? (
    <span className="uppercase tracking-wide text-gv-muted">{ui.ft}</span>
  ) : (
    <span className="text-gv-muted">{shortKickoff(match, language)}</span>
  );

  return (
    <div
      className={`flex flex-col rounded-xl border bg-gv-card/60 px-3.5 py-2.5 transition-colors ${
        live ? "border-red-700/50 shadow-lg shadow-red-950/20" : "border-gv-border hover:border-gv-gold/40"
      }`}
    >
      <div className="divide-y divide-gv-border/50">
        <TeamLine
          flag={match.homeFlag}
          name={match.homeName}
          score={match.homeScore}
          won={homeWon}
          loser={awayWon}
          tbd={homeTbd}
          tbdLabel={ui.tbd}
        />
        <TeamLine
          flag={match.awayFlag}
          name={match.awayName}
          score={match.awayScore}
          won={awayWon}
          loser={homeWon}
          tbd={awayTbd}
          tbdLabel={ui.tbd}
        />
      </div>
      <div className="mt-2 border-t border-gv-border/60 pt-1.5 text-[11px]">{footer}</div>
    </div>
  );
}

export default function FifaBracket({ matches, language }: FifaBracketProps) {
  // Bucket knockout matches by round, keeping only rounds that have fixtures and
  // preserving progression order.
  const rounds = useMemo(() => {
    const byRound = new Map<string, FifaMatch[]>();
    for (const m of matches) {
      if (!(KNOCKOUT_ROUNDS as readonly string[]).includes(m.round)) continue;
      const list = byRound.get(m.round) ?? [];
      list.push(m);
      byRound.set(m.round, list);
    }
    return KNOCKOUT_ROUNDS.filter((slug) => byRound.has(slug)).map((slug) => ({
      slug,
      labels: ROUND_LABELS[language][slug] ?? { full: slug, short: slug },
      matches: (byRound.get(slug) ?? []).sort(
        (a, b) => (a.kickoffMs ?? Infinity) - (b.kickoffMs ?? Infinity),
      ),
    }));
  }, [matches, language]);

  // Land the user on the round that's actually in play: the earliest round still
  // holding a live or upcoming match, else the last round with fixtures.
  const activeSlug = useMemo(() => {
    const inPlay = rounds.find((r) => r.matches.some((m) => m.status === "live" || m.status === "notstarted"));
    return inPlay?.slug ?? rounds[rounds.length - 1]?.slug ?? "";
  }, [rounds]);

  // null = no explicit choice yet, so follow the active round. A user tap sticks
  // unless that round later disappears, in which case we fall back to active —
  // all resolved during render, no state-syncing effect needed.
  const [selected, setSelected] = useState<string | null>(null);

  if (rounds.length === 0) return null;
  const current =
    rounds.find((r) => r.slug === selected) ??
    rounds.find((r) => r.slug === activeSlug) ??
    rounds[0];

  return (
    <div>
      {/* Round tabs — house segmented-control style, scrollable on narrow screens */}
      <div className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1">
        <div
          role="tablist"
          aria-label="Knockout round"
          className="inline-flex w-max gap-0.5 rounded-full border border-gv-border bg-gv-bg/70 p-0.5"
        >
          {rounds.map((r) => {
            const active = r.slug === current.slug;
            return (
              <button
                key={r.slug}
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(r.slug)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  active ? "bg-gv-gold text-gv-bg" : "text-gv-muted hover:text-white"
                }`}
              >
                <span className="sm:hidden">{r.labels.short}</span>
                <span className="hidden sm:inline">{r.labels.full}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected round — responsive grid of matchups */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {current.matches.map((m) => (
          <MatchupCard key={m.id} match={m} language={language} />
        ))}
      </div>
    </div>
  );
}

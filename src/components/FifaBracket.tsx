"use client";

import { useMemo } from "react";
import type { Language } from "@/types";
import type { FifaMatch } from "@/lib/fifa-api";
import { KNOCKOUT_ROUNDS } from "@/lib/fifa-api";

// Progression bracket for the knockout stage. Fed the full tournament match list
// and buckets it by ESPN round slug (`match.round`) into ordered columns. Only
// rounds that actually have fixtures are rendered, so the bracket fills in as the
// tournament advances rather than showing empty future columns.

interface FifaBracketProps {
  matches: FifaMatch[];
  language: Language;
}

// Display names per round slug. Keyed by the same slugs as KNOCKOUT_ROUNDS.
const ROUND_LABELS: Record<Language, Record<string, string>> = {
  en: {
    "round-of-32": "Round of 32",
    "round-of-16": "Round of 16",
    quarterfinals: "Quarter-finals",
    semifinals: "Semi-finals",
    "3rd-place-match": "Third place",
    final: "Final",
  },
  fr: {
    "round-of-32": "16es de finale",
    "round-of-16": "8es de finale",
    quarterfinals: "Quarts de finale",
    semifinals: "Demi-finales",
    "3rd-place-match": "Petite finale",
    final: "Finale",
  },
};

function shortKickoff(match: FifaMatch, language: Language): string {
  if (match.kickoffMs == null) return match.kickoff;
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(match.kickoffMs));
}

function BracketTeam({
  flag,
  name,
  score,
  won,
  dim,
}: {
  flag: string;
  name: string;
  score: number | null;
  won: boolean;
  dim: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-base leading-none" aria-hidden>
          {flag}
        </span>
        <span
          className={`truncate text-sm ${
            won ? "font-bold text-white" : dim ? "text-gv-muted" : "text-white"
          }`}
        >
          {name}
        </span>
      </span>
      <span
        className={`tabular-nums text-sm ${
          won ? "font-bold text-gv-gold" : "text-gv-muted"
        }`}
      >
        {score ?? "–"}
      </span>
    </div>
  );
}

function BracketMatch({ match, language }: { match: FifaMatch; language: Language }) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  // Emphasise the advancing side once a knockout tie is decided.
  const homeWon = finished && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore;
  const awayWon = finished && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore;

  const stateLine = live ? (
    <span className="inline-flex items-center gap-1 font-bold uppercase text-red-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />
      {match.isHalftime ? "HT" : match.minute || "Live"}
    </span>
  ) : finished ? (
    <span className="uppercase tracking-wide text-gv-muted">FT</span>
  ) : (
    <span className="text-gv-muted">{shortKickoff(match, language)}</span>
  );

  return (
    <div
      className={`rounded-lg border bg-gv-card/60 px-3 py-2 ${
        live ? "border-red-700/50" : "border-gv-border"
      }`}
    >
      <div className="space-y-1.5">
        <BracketTeam
          flag={match.homeFlag}
          name={match.homeName}
          score={match.homeScore}
          won={homeWon}
          dim={awayWon}
        />
        <BracketTeam
          flag={match.awayFlag}
          name={match.awayName}
          score={match.awayScore}
          won={awayWon}
          dim={homeWon}
        />
      </div>
      <div className="mt-1.5 border-t border-gv-border/50 pt-1 text-[11px]">{stateLine}</div>
    </div>
  );
}

export default function FifaBracket({ matches, language }: FifaBracketProps) {
  // Bucket knockout matches by round slug, preserving progression order and
  // dropping rounds with no fixtures yet.
  const columns = useMemo(() => {
    const byRound = new Map<string, FifaMatch[]>();
    for (const m of matches) {
      if (!(KNOCKOUT_ROUNDS as readonly string[]).includes(m.round)) continue;
      const list = byRound.get(m.round) ?? [];
      list.push(m);
      byRound.set(m.round, list);
    }
    return KNOCKOUT_ROUNDS.filter((slug) => byRound.has(slug)).map((slug) => ({
      slug,
      label: ROUND_LABELS[language][slug] ?? slug,
      matches: (byRound.get(slug) ?? []).sort(
        (a, b) => (a.kickoffMs ?? Infinity) - (b.kickoffMs ?? Infinity),
      ),
    }));
  }, [matches, language]);

  if (columns.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {columns.map((col) => (
          <div key={col.slug} className="w-56 shrink-0">
            <div className="mb-2 rounded-md bg-gv-gold/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-gv-gold">
              {col.label}
              <span className="ml-1.5 font-normal text-gv-muted">{col.matches.length}</span>
            </div>
            <div className="space-y-2">
              {col.matches.map((m) => (
                <BracketMatch key={m.id} match={m} language={language} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

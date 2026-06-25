"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language } from "@/types";
import type { ApiResponse } from "@/types";
import type { FifaData, FifaMatch, FifaGroup, FifaScorer } from "@/lib/fifa-api";

interface FifaSectionProps {
  language: Language;
}

// Client-side polling interval. The /api/fifa route is itself cached for 30s,
// so polling at 30s keeps the board live without hammering the upstream API.
const POLL_MS = 30_000;
const MAX_UPCOMING = 12;
const MAX_RESULTS = 12;

const T = {
  en: {
    title: "FIFA World Cup 2026",
    subtitle: "Live scores · Canada · USA · Mexico",
    live: "Live Now",
    upcoming: "Upcoming",
    results: "Recent Results",
    standings: "Group Standings",
    noLive: "No matches in progress right now.",
    loading: "Loading live scores…",
    error: "Couldn’t load FIFA data. Retrying…",
    group: "Group",
    ht: "HT",
    firstHalf: "1st Half",
    secondHalf: "2nd Half",
    cols: { mp: "MP", w: "W", d: "D", l: "L", gf: "GF", ga: "GA", gd: "GD", pts: "Pts" },
    scorers: { title: "Top Scorers", goals: "Goals", assists: "Assists", team: "Team" },
  },
  fr: {
    title: "Coupe du Monde FIFA 2026",
    subtitle: "Scores en direct · Canada · États-Unis · Mexique",
    live: "En Direct",
    upcoming: "À venir",
    results: "Résultats récents",
    standings: "Classements des groupes",
    noLive: "Aucun match en cours actuellement.",
    loading: "Chargement des scores…",
    error: "Impossible de charger les données FIFA. Nouvel essai…",
    group: "Groupe",
    ht: "MT",
    firstHalf: "1re mi-temps",
    secondHalf: "2e mi-temps",
    cols: { mp: "J", w: "G", d: "N", l: "P", gf: "BP", ga: "BC", gd: "Diff", pts: "Pts" },
    scorers: { title: "Meilleurs Buteurs", goals: "Buts", assists: "Passes D.", team: "Équipe" },
  },
} as const;

function formatKickoff(match: FifaMatch, language: Language): string {
  if (match.kickoffMs == null) return match.kickoff;
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(match.kickoffMs));
}

function LiveBadge({ label, detail }: { label: string; detail?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
      {label}
      {detail ? <span className="tabular-nums opacity-90">{detail}</span> : null}
    </span>
  );
}

// "1st Half" / "2nd Half" for the live period; null for extra time or unknown.
function halfLabel(period: number | null, t: (typeof T)[Language]): string | null {
  if (period === 1) return t.firstHalf;
  if (period === 2) return t.secondHalf;
  return null;
}

function TeamRow({ flag, name, score }: { flag: string; name: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {flag}
        </span>
        <span className="truncate text-base font-semibold text-white">{name}</span>
      </span>
      <span className="text-3xl font-extrabold tabular-nums text-gv-gold sm:text-4xl">
        {score ?? "–"}
      </span>
    </div>
  );
}

function LiveCard({ match, t }: { match: FifaMatch; t: (typeof T)[Language] }) {
  // At the interval show "HT"; otherwise the live clock (e.g. "45'+2'").
  const detail = match.isHalftime ? t.ht : match.minute;
  // The current half is only meaningful while play is ongoing, not at HT.
  const half = match.isHalftime ? null : halfLabel(match.period, t);
  return (
    <div className="rounded-xl border border-red-700/40 bg-gv-card p-4 shadow-lg shadow-red-900/10">
      <div className="mb-3 flex items-center justify-between">
        <LiveBadge label={t.live} detail={detail} />
        <span className="text-xs text-gv-muted">
          {match.group ? `${t.group} ${match.group}` : match.type}
          {half ? ` · ${half}` : ""}
        </span>
      </div>
      <div className="space-y-2.5">
        <TeamRow flag={match.homeFlag} name={match.homeName} score={match.homeScore} />
        <TeamRow flag={match.awayFlag} name={match.awayName} score={match.awayScore} />
      </div>
    </div>
  );
}

function UpcomingCard({ match, language }: { match: FifaMatch; language: Language }) {
  return (
    <div className="rounded-xl border border-gv-border bg-gv-card/70 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-gv-muted">
        <span>{match.group ? `Group ${match.group}` : match.type}</span>
        <span>{formatKickoff(match, language)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xl" aria-hidden>
            {match.homeFlag}
          </span>
          <span className="truncate text-sm font-medium text-white">{match.homeName}</span>
        </span>
        <span className="px-2 text-xs font-semibold text-gv-muted">vs</span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-medium text-white">{match.awayName}</span>
          <span className="text-xl" aria-hidden>
            {match.awayFlag}
          </span>
        </span>
      </div>
    </div>
  );
}

function ResultCard({ match }: { match: FifaMatch }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gv-border bg-gv-card/50 px-3 py-2.5">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-lg" aria-hidden>
          {match.homeFlag}
        </span>
        <span className="truncate text-sm text-white">{match.homeName}</span>
      </span>
      <span className="rounded bg-black/30 px-2 py-0.5 text-sm font-bold tabular-nums text-gv-gold">
        {match.homeScore ?? "–"} : {match.awayScore ?? "–"}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="truncate text-right text-sm text-white">{match.awayName}</span>
        <span className="text-lg" aria-hidden>
          {match.awayFlag}
        </span>
      </span>
    </div>
  );
}

function GroupTable({ group, t }: { group: FifaGroup; t: (typeof T)[Language] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gv-border bg-gv-card/60">
      <div className="border-b border-gv-border bg-gv-gold/10 px-3 py-2 text-sm font-bold text-gv-gold">
        {t.group} {group.name}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-gv-muted">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-1 py-2 font-medium">Team</th>
            <th className="px-1.5 py-2 text-center font-medium">{t.cols.mp}</th>
            <th className="px-1.5 py-2 text-center font-medium">{t.cols.w}</th>
            <th className="px-1.5 py-2 text-center font-medium">{t.cols.d}</th>
            <th className="px-1.5 py-2 text-center font-medium">{t.cols.l}</th>
            <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{t.cols.gf}</th>
            <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{t.cols.ga}</th>
            <th className="px-1.5 py-2 text-center font-medium">{t.cols.gd}</th>
            <th className="px-3 py-2 text-center font-bold text-gv-gold">{t.cols.pts}</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((s, i) => (
            <tr
              key={s.teamId}
              className={`border-t border-gv-border/60 ${i < 2 ? "bg-gv-gold/5" : ""}`}
            >
              <td className="px-3 py-2 tabular-nums text-gv-muted">{i + 1}</td>
              <td className="px-1 py-2">
                <span className="flex items-center gap-2">
                  <span className="text-base" aria-hidden>
                    {s.flag}
                  </span>
                  <span className="truncate font-medium text-white">{s.name}</span>
                </span>
              </td>
              <td className="px-1.5 py-2 text-center tabular-nums text-gv-muted">{s.mp}</td>
              <td className="px-1.5 py-2 text-center tabular-nums text-white">{s.w}</td>
              <td className="px-1.5 py-2 text-center tabular-nums text-white">{s.d}</td>
              <td className="px-1.5 py-2 text-center tabular-nums text-white">{s.l}</td>
              <td className="hidden px-1.5 py-2 text-center tabular-nums text-gv-muted sm:table-cell">{s.gf}</td>
              <td className="hidden px-1.5 py-2 text-center tabular-nums text-gv-muted sm:table-cell">{s.ga}</td>
              <td className="px-1.5 py-2 text-center tabular-nums text-white">
                {s.gd > 0 ? `+${s.gd}` : s.gd}
              </td>
              <td className="px-3 py-2 text-center font-bold tabular-nums text-gv-gold">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopScorers({
  scorers,
  t,
}: {
  scorers: FifaScorer[];
  t: (typeof T)[Language];
}) {
  const labels = t.scorers;
  return (
    <div className="overflow-hidden rounded-xl border border-gv-border bg-gv-card/60">
      <div className="border-b border-gv-border bg-gv-gold/10 px-3 py-2 text-sm font-bold text-gv-gold">
        {labels.title}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-gv-muted">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-1 py-2 font-medium">Player</th>
            <th className="hidden px-2 py-2 font-medium sm:table-cell">{labels.team}</th>
            <th className="px-2 py-2 text-center font-bold text-gv-gold">{labels.goals}</th>
            <th className="px-3 py-2 text-center font-medium">{labels.assists}</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s) => {
            const isTop3 = s.rank <= 3;
            return (
              <tr key={s.athleteId} className="border-t border-gv-border/60">
                <td className="px-3 py-2 tabular-nums">
                  <span className={isTop3 ? "font-bold text-gv-gold" : "text-gv-muted"}>
                    {s.rank}
                  </span>
                </td>
                <td className="px-1 py-2">
                  <span className="flex items-center gap-2">
                    <span className="text-base" aria-hidden>
                      {s.teamFlag}
                    </span>
                    <span className="truncate font-medium text-white">{s.name}</span>
                  </span>
                </td>
                <td className="hidden px-2 py-2 text-gv-muted sm:table-cell">{s.team}</td>
                <td className="px-2 py-2 text-center">
                  <span className="font-bold tabular-nums text-gv-gold">{s.goals}</span>
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-gv-muted">
                  {s.assists > 0 ? s.assists : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
      <span className="h-4 w-1 rounded-full bg-gv-gold" aria-hidden />
      {children}
    </h2>
  );
}

export default function FifaSection({ language }: FifaSectionProps) {
  const t = T[language];
  const [data, setData] = useState<FifaData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/fifa");
        const json = (await res.json()) as ApiResponse<FifaData>;
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
          setStatus("ready");
        } else {
          setStatus((prev) => (prev === "ready" ? "ready" : "error"));
        }
      } catch {
        if (!cancelled) setStatus((prev) => (prev === "ready" ? "ready" : "error"));
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const live = useMemo(
    () => (data?.matches ?? []).filter((m) => m.status === "live"),
    [data],
  );
  const upcoming = useMemo(
    () =>
      (data?.matches ?? [])
        .filter((m) => m.status === "notstarted")
        .sort((a, b) => (a.kickoffMs ?? Infinity) - (b.kickoffMs ?? Infinity))
        .slice(0, MAX_UPCOMING),
    [data],
  );
  const results = useMemo(
    () =>
      (data?.matches ?? [])
        .filter((m) => m.status === "finished")
        .sort((a, b) => (b.kickoffMs ?? 0) - (a.kickoffMs ?? 0))
        .slice(0, MAX_RESULTS),
    [data],
  );

  return (
    <section className="rounded-2xl border border-gv-border bg-gv-bg/60 p-4 sm:p-6">
      {/* Banner */}
      <div className="mb-6 flex items-end justify-between gap-3 border-b border-gv-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gv-gold sm:text-3xl">
            ⚽ {t.title}
          </h1>
          <p className="mt-1 text-sm text-gv-muted">{t.subtitle}</p>
        </div>
        {live.length > 0 && <LiveBadge label={t.live} />}
      </div>

      {status === "loading" && <p className="text-gv-muted">{t.loading}</p>}
      {status === "error" && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-300">
          {t.error}
        </p>
      )}

      {data && (
        <div className="space-y-8">
          {/* Live */}
          <div>
            <SectionHeading>{t.live}</SectionHeading>
            {live.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {live.map((m) => (
                  <LiveCard key={m.id} match={m} t={t} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gv-muted">{t.noLive}</p>
            )}
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <SectionHeading>{t.upcoming}</SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((m) => (
                  <UpcomingCard key={m.id} match={m} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Recent results */}
          {results.length > 0 && (
            <div>
              <SectionHeading>{t.results}</SectionHeading>
              <div className="grid gap-2 sm:grid-cols-2">
                {results.map((m) => (
                  <ResultCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}

          {/* Standings */}
          {data.groups.length > 0 && (
            <div>
              <SectionHeading>{t.standings}</SectionHeading>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.groups.map((g) => (
                  <GroupTable key={g.name} group={g} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* Top Scorers */}
          {data.scorers.length > 0 && (
            <div>
              <SectionHeading>{t.scorers.title}</SectionHeading>
              <TopScorers scorers={data.scorers} t={t} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

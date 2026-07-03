// FIFA World Cup 2026 live data.
//
// Live matches come from ESPN's unofficial scoreboard API
// (site.api.espn.com/.../soccer/fifa.world/scoreboard) — no key required, with
// real per-match state (status, live clock, period) refreshed every few
// seconds. ESPN does not expose group standings, so those (and the canonical
// team list used for emoji flags) still come from worldcup26.ir, a free no-auth
// REST API verified live on 2026-06-24.
//
// ESPN identifies teams by display name / abbreviation rather than the
// worldcup26 ids, so we recover the emoji flag and group letter by matching the
// ESPN team against the worldcup26 team list (falling back to a white flag).
//
// worldcup26 fetches use `revalidate: 60`; the live ESPN scoreboard uses a
// shorter window so the board stays fresh without hammering upstream.

const WC_BASE = "https://worldcup26.ir";
const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_STATISTICS =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?limit=20";
const REVALIDATE_SECONDS = 60;

// ESPN's scoreboard defaults to the current day and caps each response at 100
// events, so the full tournament is fetched as two `?dates=` ranges and merged.
// Ranges come straight from ESPN's own league calendar (Group: Jun 11–27,
// knockouts Jun 28 → Final Jul 19). Group-stage results are final and cacheable;
// the knockout range holds the currently-live round and stays uncached.
const GROUP_STAGE_RANGE = "20260611-20260627";
const KNOCKOUT_RANGE = "20260628-20260719";

// Knockout rounds in progression order, keyed by ESPN's `season.slug`. Drives the
// bracket column order; the group stage (slug "group-stage") is handled separately.
export const KNOCKOUT_ROUNDS = [
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
  "3rd-place-match",
  "final",
] as const;

export type MatchStatus = "notstarted" | "live" | "finished";

export interface FifaTeam {
  id: string;
  name: string;
  flag: string; // emoji flag derived from ISO-2 (e.g. 🇲🇽)
  flagUrl: string; // bitmap fallback from the API
  fifaCode: string;
  group: string;
}

export interface FifaMatch {
  id: string;
  group: string;
  matchday: string;
  type: string; // coarse bucket: "group" or "World Cup" (see `round` for the exact stage)
  round: string; // ESPN season slug: "group-stage" | "round-of-32" | … | "final" ("" if unknown)
  status: MatchStatus;
  minute: string | null; // populated while live, e.g. "45'+2'" (ESPN displayClock)
  isHalftime: boolean; // true while the match is at the interval (STATUS_HALFTIME)
  period: number | null; // half number while live (1 or 2), null otherwise
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string; // raw local date string from the API
  kickoffMs: number | null; // parsed timestamp for sorting, when parseable
}

export interface FifaStanding {
  teamId: string;
  name: string;
  flag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface FifaGroup {
  name: string;
  standings: FifaStanding[];
}

export interface FifaScorer {
  rank: number;
  athleteId: string;
  name: string;
  team: string;
  teamFlag: string;
  goals: number;
  assists: number;
}

export interface FifaData {
  matches: FifaMatch[];
  groups: FifaGroup[];
  teams: FifaTeam[];
  scorers: FifaScorer[];
}

// ── Raw worldcup26 shapes (every field arrives as a string) ────────────────
interface RawTeam {
  id: string;
  name_en: string;
  name_fa?: string;
  flag?: string;
  fifa_code?: string;
  iso2?: string;
  groups?: string;
}
// Group standings are no longer fetched from worldcup26.ir — they're computed
// from ESPN match results in computeGroupStandings(), so the standings survive a
// worldcup26 outage (only team flags/group labels still come from there).

// ── Raw ESPN statistics shapes ─────────────────────────────────────────────
interface EspnStatAthlete {
  id?: string;
  displayName?: string;
  team?: {
    displayName?: string;
    abbreviation?: string;
  };
}
interface EspnStatLeader {
  value?: number;
  athlete?: EspnStatAthlete;
}
interface EspnStatCategory {
  name?: string; // "goalsLeaders" | "assistsLeaders"
  leaders?: EspnStatLeader[];
}
interface EspnStatistics {
  stats?: EspnStatCategory[];
}

// ── Raw ESPN scoreboard shapes ─────────────────────────────────────────────
interface EspnTeam {
  id?: string;
  displayName?: string;
  abbreviation?: string;
}
interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: EspnTeam;
}
interface EspnStatusType {
  name?: string; // e.g. "STATUS_IN_PROGRESS"
  state?: string; // "pre" | "in" | "post"
  completed?: boolean;
}
interface EspnStatus {
  type?: EspnStatusType;
  displayClock?: string; // live clock, e.g. "45'+5'"
  period?: number; // 1 or 2
}
interface EspnCompetition {
  competitors?: EspnCompetitor[];
}
interface EspnSeason {
  slug?: string; // round identifier, e.g. "group-stage" | "round-of-32" | "final"
}
interface EspnEvent {
  id?: string;
  date?: string;
  season?: EspnSeason;
  status?: EspnStatus;
  competitions?: EspnCompetition[];
}
interface EspnScoreboard {
  events?: EspnEvent[];
}

async function getJson<T>(url: string, revalidate: number | null): Promise<T> {
  const res = await fetch(url, {
    ...(revalidate === null ? { cache: "no-store" } : { next: { revalidate } }),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function scoreOrNull(v: string | undefined | null): number | null {
  if (v == null || v === "" || v.toLowerCase() === "null") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// "MX" → 🇲🇽 via regional-indicator codepoints; falls back to a white flag.
function isoToFlag(iso2?: string): string {
  const cc = (iso2 ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function toMs(localDate?: string): number | null {
  if (!localDate) return null;
  const t = new Date(localDate).getTime();
  return Number.isNaN(t) ? null : t;
}

function asArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key])) {
    return (value as Record<string, T[]>)[key];
  }
  return [];
}

// Strip accents/punctuation/case so ESPN display names line up with the
// worldcup26 team list (e.g. "Côte d'Ivoire" → "cotedivoire").
function normName(s?: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Map ESPN's status to our coarse status, preferring the documented type names
// and falling back to the `state`/`completed` flags for anything unexpected.
function parseEspnStatus(type?: EspnStatusType): {
  status: MatchStatus;
  isHalftime: boolean;
} {
  const name = (type?.name ?? "").toUpperCase();
  const state = (type?.state ?? "").toLowerCase();
  const isHalftime = name === "STATUS_HALFTIME";
  if (name === "STATUS_IN_PROGRESS" || isHalftime) return { status: "live", isHalftime };
  if (name === "STATUS_FINAL" || type?.completed || state === "post")
    return { status: "finished", isHalftime: false };
  if (name === "STATUS_SCHEDULED" || state === "pre")
    return { status: "notstarted", isHalftime: false };
  if (state === "in") return { status: "live", isHalftime };
  return { status: "notstarted", isHalftime: false };
}

export async function fetchTeams(): Promise<FifaTeam[]> {
  const data = await getJson<unknown>(`${WC_BASE}/get/teams`, REVALIDATE_SECONDS);
  const raw = asArray<RawTeam>(data, "teams");
  return raw.map((t) => ({
    id: t.id,
    name: t.name_en,
    flag: isoToFlag(t.iso2),
    flagUrl: t.flag ?? "",
    fifaCode: t.fifa_code ?? "",
    group: t.groups ?? "",
  }));
}

export async function fetchMatches(teams?: FifaTeam[]): Promise<FifaMatch[]> {
  // The whole tournament in two ranged calls (ESPN caps a response at 100
  // events). Group-stage results are final so they can be cached; the knockout
  // range carries the live round and is fetched uncached for freshness.
  const [groupEvents, knockoutEvents, teamList] = await Promise.all([
    getJson<EspnScoreboard>(`${ESPN_SCOREBOARD}?dates=${GROUP_STAGE_RANGE}`, REVALIDATE_SECONDS),
    getJson<EspnScoreboard>(`${ESPN_SCOREBOARD}?dates=${KNOCKOUT_RANGE}`, null),
    teams ? Promise.resolve(teams) : fetchTeams(),
  ]);

  // Index worldcup26 teams so we can recover the emoji flag + group letter for
  // an ESPN team by name first, then by FIFA/abbreviation code.
  const byName = new Map<string, FifaTeam>();
  const byCode = new Map<string, FifaTeam>();
  for (const t of teamList) {
    if (t.name) byName.set(normName(t.name), t);
    if (t.fifaCode) byCode.set(t.fifaCode.toUpperCase(), t);
  }
  const lookup = (et?: EspnTeam): FifaTeam | undefined => {
    if (!et) return undefined;
    if (et.displayName) {
      const m = byName.get(normName(et.displayName));
      if (m) return m;
    }
    if (et.abbreviation) {
      const m = byCode.get(et.abbreviation.toUpperCase());
      if (m) return m;
    }
    return undefined;
  };

  const toMatch = (ev: EspnEvent): FifaMatch => {
    const competitors = ev.competitions?.[0]?.competitors ?? [];
    const homeC = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
    const awayC = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
    const { status, isHalftime } = parseEspnStatus(ev.status?.type);
    const home = lookup(homeC?.team);
    const away = lookup(awayC?.team);
    // Both teams sharing a group letter means this is a group-stage fixture.
    const group =
      home && away && home.group && home.group === away.group ? home.group : "";
    const clock = (ev.status?.displayClock ?? "").trim();
    const period =
      typeof ev.status?.period === "number" && ev.status.period > 0
        ? ev.status.period
        : null;
    return {
      id: ev.id ?? `${homeC?.team?.id ?? "?"}-${awayC?.team?.id ?? "?"}`,
      group,
      matchday: "",
      type: group ? "group" : "World Cup",
      round: ev.season?.slug ?? "",
      status,
      minute: status === "live" ? clock || null : null,
      isHalftime,
      period: status === "live" ? period : null,
      homeId: homeC?.team?.id ?? "",
      awayId: awayC?.team?.id ?? "",
      homeName: homeC?.team?.displayName || home?.name || "TBD",
      awayName: awayC?.team?.displayName || away?.name || "TBD",
      homeFlag: home?.flag ?? "🏳️",
      awayFlag: away?.flag ?? "🏳️",
      homeScore: scoreOrNull(homeC?.score),
      awayScore: scoreOrNull(awayC?.score),
      kickoff: ev.date ?? "",
      kickoffMs: toMs(ev.date),
    };
  };

  return [...(groupEvents.events ?? []), ...(knockoutEvents.events ?? [])].map(toMatch);
}

// Group standings computed entirely from finished ESPN group-stage results, so
// they no longer depend on worldcup26.ir being reachable. The group LETTER still
// comes from the team→group mapping baked into each match's `group` field (via
// fetchMatches); when worldcup26 is down that's empty, so every group-stage match
// collapses into a single unlabeled table rather than being dropped.
export function computeGroupStandings(matches: FifaMatch[]): FifaGroup[] {
  interface Acc {
    teamId: string;
    name: string;
    flag: string;
    mp: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
  }
  const groups = new Map<string, Map<string, Acc>>();
  const ensure = (table: Map<string, Acc>, id: string, name: string, flag: string): Acc => {
    let acc = table.get(id);
    if (!acc) {
      acc = { teamId: id, name, flag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      table.set(id, acc);
    }
    return acc;
  };

  for (const m of matches) {
    if (m.round !== "group-stage" || m.status !== "finished") continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    const key = m.group; // "" when the group letter is unknown → single "Group Stage" table
    let table = groups.get(key);
    if (!table) {
      table = new Map<string, Acc>();
      groups.set(key, table);
    }
    const home = ensure(table, m.homeId, m.homeName, m.homeFlag);
    const away = ensure(table, m.awayId, m.awayName, m.awayFlag);
    home.mp++;
    away.mp++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.w++;
      away.l++;
    } else if (m.homeScore < m.awayScore) {
      away.w++;
      home.l++;
    } else {
      home.d++;
      away.d++;
    }
  }

  return [...groups.entries()]
    .map(([name, table]) => ({
      name,
      standings: [...table.values()]
        .map((a) => ({
          teamId: a.teamId,
          name: a.name,
          flag: a.flag,
          mp: a.mp,
          w: a.w,
          d: a.d,
          l: a.l,
          pts: a.w * 3 + a.d,
          gf: a.gf,
          ga: a.ga,
          gd: a.gf - a.ga,
        }))
        // Standard group ordering: points, then goal difference, then goals for.
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Top scorers from the ESPN /statistics endpoint. Goals leaders are the primary
// list; assists are joined in by athlete id so each row is complete.
// Teams are matched by FIFA abbreviation code against the worldcup26 team list
// to recover the emoji flag.
export async function fetchScorers(teams?: FifaTeam[]): Promise<FifaScorer[]> {
  const [data, teamList] = await Promise.all([
    getJson<EspnStatistics>(ESPN_STATISTICS, REVALIDATE_SECONDS),
    teams ? Promise.resolve(teams) : fetchTeams(),
  ]);

  // Index worldcup26 teams by FIFA abbreviation code for flag lookup.
  const byCode = new Map<string, FifaTeam>();
  for (const t of teamList) {
    if (t.fifaCode) byCode.set(t.fifaCode.toUpperCase(), t);
  }
  // Also index by normalized name as a fallback.
  const byName = new Map<string, FifaTeam>();
  for (const t of teamList) {
    if (t.name) byName.set(normName(t.name), t);
  }
  const flagFor = (abbr?: string, teamName?: string): string => {
    if (abbr) {
      const t = byCode.get(abbr.toUpperCase());
      if (t) return t.flag;
    }
    if (teamName) {
      const t = byName.get(normName(teamName));
      if (t) return t.flag;
    }
    return "🏳️";
  };

  const cats = data.stats ?? [];
  const goalscat = cats.find((c) => c.name === "goalsLeaders");
  const assistsCat = cats.find((c) => c.name === "assistsLeaders");

  // Build athlete-id → assists count from the assists category.
  const assistsById = new Map<string, number>();
  for (const ldr of assistsCat?.leaders ?? []) {
    const id = ldr.athlete?.id;
    if (id && ldr.value != null) assistsById.set(id, ldr.value);
  }

  return (goalscat?.leaders ?? [])
    .slice(0, 10)
    .map((ldr, i) => {
      const ath = ldr.athlete ?? {};
      const id = ath.id ?? String(i);
      const abbr = ath.team?.abbreviation;
      const teamName = ath.team?.displayName;
      return {
        rank: i + 1,
        athleteId: id,
        name: ath.displayName ?? "Unknown",
        team: teamName ?? abbr ?? "",
        teamFlag: flagFor(abbr, teamName),
        goals: ldr.value ?? 0,
        assists: assistsById.get(id) ?? 0,
      };
    });
}

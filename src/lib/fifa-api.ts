// FIFA World Cup 2026 live data.
//
// Backend: worldcup26.ir — a free, no-API-key REST API that (verified live on
// 2026-06-24) serves /get/games, /get/groups and /get/teams without any auth,
// and crucially exposes per-match live state (time_elapsed) plus pre-computed
// group standings. openfootball/worldcup.json also works key-free but is a
// static file refreshed ~once a day with no live state or standings — so it
// can't power a live board.
//
// All fetches use Next.js `revalidate: 60` so upstream is hit at most once a
// minute and shared across requests.

const BASE = "https://worldcup26.ir";
const REVALIDATE_SECONDS = 60;

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
  type: string; // "group" or a knockout round
  status: MatchStatus;
  minute: string | null; // populated while live, e.g. "63'"
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

export interface FifaData {
  matches: FifaMatch[];
  groups: FifaGroup[];
  teams: FifaTeam[];
}

// ── Raw upstream shapes (every field arrives as a string) ──────────────────
interface RawTeam {
  id: string;
  name_en: string;
  name_fa?: string;
  flag?: string;
  fifa_code?: string;
  iso2?: string;
  groups?: string;
}
interface RawGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score?: string;
  away_score?: string;
  group?: string;
  matchday?: string;
  local_date?: string;
  finished?: string;
  time_elapsed?: string;
  type?: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
}
interface RawStanding {
  team_id: string;
  mp?: string;
  w?: string;
  d?: string;
  l?: string;
  pts?: string;
  gf?: string;
  ga?: string;
  gd?: string;
}
interface RawGroup {
  name: string;
  teams?: RawStanding[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`worldcup26.ir ${path} → ${res.status}`);
  return (await res.json()) as T;
}

function intOr0(v: string | undefined | null): number {
  const n = parseInt(v ?? "", 10);
  return Number.isNaN(n) ? 0 : n;
}

function scoreOrNull(v: string | undefined | null): number | null {
  if (v == null || v === "" || v.toLowerCase() === "null") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// time_elapsed is "notstarted" / "finished" (mixed case) while pending or done,
// and otherwise holds an in-play minute — which is exactly when a match is live.
function parseStatus(finished?: string, timeElapsed?: string): MatchStatus {
  const te = (timeElapsed ?? "").trim().toLowerCase();
  if (te === "finished" || (finished ?? "").trim().toUpperCase() === "TRUE") return "finished";
  if (te === "" || te === "notstarted" || te === "not started") return "notstarted";
  return "live";
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

export async function fetchTeams(): Promise<FifaTeam[]> {
  const data = await getJson<unknown>("/get/teams");
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
  const [data, teamList] = await Promise.all([
    getJson<unknown>("/get/games"),
    teams ? Promise.resolve(teams) : fetchTeams(),
  ]);
  const byId = new Map(teamList.map((t) => [t.id, t]));
  return asArray<RawGame>(data, "games").map((g) => {
    const status = parseStatus(g.finished, g.time_elapsed);
    const home = byId.get(g.home_team_id);
    const away = byId.get(g.away_team_id);
    return {
      id: g.id,
      group: g.group ?? "",
      matchday: g.matchday ?? "",
      type: g.type ?? "group",
      status,
      minute: status === "live" ? (g.time_elapsed ?? null) : null,
      homeId: g.home_team_id,
      awayId: g.away_team_id,
      homeName: g.home_team_name_en || home?.name || "TBD",
      awayName: g.away_team_name_en || away?.name || "TBD",
      homeFlag: home?.flag ?? "🏳️",
      awayFlag: away?.flag ?? "🏳️",
      homeScore: scoreOrNull(g.home_score),
      awayScore: scoreOrNull(g.away_score),
      kickoff: g.local_date ?? "",
      kickoffMs: toMs(g.local_date),
    };
  });
}

export async function fetchGroups(teams?: FifaTeam[]): Promise<FifaGroup[]> {
  const [data, teamList] = await Promise.all([
    getJson<unknown>("/get/groups"),
    teams ? Promise.resolve(teams) : fetchTeams(),
  ]);
  const byId = new Map(teamList.map((t) => [t.id, t]));
  return asArray<RawGroup>(data, "groups")
    .map((grp) => ({
      name: grp.name,
      standings: (grp.teams ?? [])
        .map((s) => {
          const t = byId.get(s.team_id);
          return {
            teamId: s.team_id,
            name: t?.name ?? s.team_id,
            flag: t?.flag ?? "🏳️",
            mp: intOr0(s.mp),
            w: intOr0(s.w),
            d: intOr0(s.d),
            l: intOr0(s.l),
            pts: intOr0(s.pts),
            gf: intOr0(s.gf),
            ga: intOr0(s.ga),
            gd: intOr0(s.gd),
          };
        })
        // Standard group ordering: points, then goal difference, then goals for.
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

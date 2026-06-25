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
const REVALIDATE_SECONDS = 60;
const LIVE_REVALIDATE_SECONDS = 15;

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

export interface FifaData {
  matches: FifaMatch[];
  groups: FifaGroup[];
  teams: FifaTeam[];
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
interface EspnEvent {
  id?: string;
  date?: string;
  status?: EspnStatus;
  competitions?: EspnCompetition[];
}
interface EspnScoreboard {
  events?: EspnEvent[];
}

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
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
  const [board, teamList] = await Promise.all([
    getJson<EspnScoreboard>(ESPN_SCOREBOARD, LIVE_REVALIDATE_SECONDS),
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

  return (board.events ?? []).map((ev) => {
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
  });
}

export async function fetchGroups(teams?: FifaTeam[]): Promise<FifaGroup[]> {
  const [data, teamList] = await Promise.all([
    getJson<unknown>(`${WC_BASE}/get/groups`, REVALIDATE_SECONDS),
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

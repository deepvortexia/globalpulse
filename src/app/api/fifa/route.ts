import { fetchTeams, fetchMatches, fetchScorers, computeGroupStandings } from "@/lib/fifa-api";
import type { FifaData } from "@/lib/fifa-api";
import type { ApiResponse } from "@/types";

// Cached for 30s at the route level. Everything (live scores, the full-tournament
// match list, and the group standings computed from it) comes from ESPN;
// worldcup26.ir is only consulted for team flags/group labels. Each fetch's own
// revalidate window caps upstream hits, and this route caps how often any of them
// is hit at all.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Teams come from worldcup26.ir, a third-party free API with no uptime
  // guarantee, so its failure must not take down the board: flags/group labels
  // just degrade. The live scores, bracket and standings all derive from ESPN.
  const teams = await fetchTeams().catch((error) => {
    console.error("[/api/fifa] fetchTeams failed, falling back to empty team list:", error);
    return [];
  });

  try {
    const [matches, scorers] = await Promise.all([
      fetchMatches(teams),
      fetchScorers(teams),
    ]);

    // Standings are derived from finished ESPN group-stage results rather than
    // fetched from worldcup26.ir, so they stay correct even when it's down.
    const groups = computeGroupStandings(matches);

    return Response.json(
      { success: true, data: { matches, groups, teams, scorers } } satisfies ApiResponse<FifaData>,
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[/api/fifa] Failed to fetch FIFA data:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch FIFA data",
      } satisfies ApiResponse<FifaData>,
      { status: 502 },
    );
  }
}

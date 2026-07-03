import { fetchTeams, fetchMatches, fetchGroups, fetchScorers } from "@/lib/fifa-api";
import type { FifaData } from "@/lib/fifa-api";
import type { ApiResponse } from "@/types";

// Cached for 30s at the route level. Live scores come from ESPN and standings
// from worldcup26.ir (see fifa-api); their own revalidate windows cap how often
// each upstream is hit, and this route caps how often any of them is hit at all.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Teams (and the groups they feed into) come from worldcup26.ir, a
  // third-party free API with no uptime guarantee. Live scores from ESPN are
  // the reason this route exists, so an outage there should still let the
  // board render with blank flags/groups rather than 502ing everything.
  const teams = await fetchTeams().catch((error) => {
    console.error("[/api/fifa] fetchTeams failed, falling back to empty team list:", error);
    return [];
  });

  try {
    const [matches, groups, scorers] = await Promise.all([
      fetchMatches(teams),
      fetchGroups(teams).catch((error) => {
        console.error("[/api/fifa] fetchGroups failed, falling back to empty groups:", error);
        return [];
      }),
      fetchScorers(teams),
    ]);

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

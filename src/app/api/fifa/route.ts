import { fetchTeams, fetchMatches, fetchGroups } from "@/lib/fifa-api";
import type { FifaData } from "@/lib/fifa-api";
import type { ApiResponse } from "@/types";

// Cached for 30s at the route level. Live scores come from ESPN and standings
// from worldcup26.ir (see fifa-api); their own revalidate windows cap how often
// each upstream is hit, and this route caps how often any of them is hit at all.
export const revalidate = 30;

export async function GET() {
  try {
    // Fetch teams once and feed the map into both builders to avoid refetching
    // (Route Handlers don't get fetch memoization).
    const teams = await fetchTeams();
    const [matches, groups] = await Promise.all([
      fetchMatches(teams),
      fetchGroups(teams),
    ]);

    return Response.json(
      { success: true, data: { matches, groups, teams } } satisfies ApiResponse<FifaData>,
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

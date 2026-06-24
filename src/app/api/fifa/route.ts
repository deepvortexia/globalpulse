import { fetchTeams, fetchMatches, fetchGroups } from "@/lib/fifa-api";
import type { FifaData } from "@/lib/fifa-api";
import type { ApiResponse } from "@/types";

// Cached for 60s at the route level; the upstream fetches in fifa-api carry the
// same revalidate, so worldcup26.ir is hit at most once a minute.
export const revalidate = 60;

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
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
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

import { getServiceRoleClient } from "./supabase";
import type { Language } from "@/types";

// Row shape of the permanent `yearly_highlights` table (see migration 0004).
// Unlike `articles`, rows here are bilingual: one row carries both languages
// and the page picks the right pair at render time.
export interface YearlyHighlightRow {
  id: string;
  year: number;
  month: number;
  headline_fr: string;
  headline_en: string;
  description_fr: string;
  description_en: string;
  category: string;
  event_date: string;
  display_order: number;
  image_url: string | null;
  created_at: string;
}

// Localized, display-ready highlight handed to the client component — only
// what the cards render, in the one language the page is being served in.
export interface Highlight {
  id: string;
  headline: string;
  description: string;
  category: string;
  eventDate: string;
  imageUrl: string | null;
}

export interface MonthChapter {
  month: number; // 1-12
  highlights: Highlight[];
}

// All highlights for a year, as 12 month chapters (empty months included —
// the Year in Review page renders every month of the journey even before its
// data exists). Uses the service-role client like every other read here:
// the table has RLS with no public policy and callers are Server Components.
export async function getYearChapters(
  year: number,
  language: Language,
): Promise<MonthChapter[]> {
  const { data, error } = await getServiceRoleClient()
    .from("yearly_highlights")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Supabase yearly_highlights read failed: ${error.message}`);

  const rows = (data ?? []) as YearlyHighlightRow[];
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      highlights: rows
        .filter((r) => r.month === month)
        .map((r) => ({
          id: r.id,
          headline: language === "fr" ? r.headline_fr : r.headline_en,
          description: language === "fr" ? r.description_fr : r.description_en,
          category: r.category,
          eventDate: r.event_date,
          imageUrl: r.image_url,
        })),
    };
  });
}

// Ceilings enforced both when parsing Haiku's meta_title/meta_description
// (src/app/api/cron/fetch-news/route.ts) and again at render time for the
// fallback path (generateMetadata below never trusts stored length either).
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 155;

// Shared title/description cleanup for SEO-facing surfaces. Applied at
// ingestion time (rss-fetcher, for freshly-fetched titles) and again at render
// time as a fallback for older rows ingested before this cleanup existed, or
// for articles that never got a Haiku meta_title (see generateMetadata in
// src/app/[lang]/article/[slug]/page.tsx).

// "Live updates: " status prefixes are never part of the substantive
// headline, so stripping is safe across every source.
export function stripLiveUpdatesPrefix(title: string): string {
  return title.replace(/^live\s+updates?\s*:\s*/i, "");
}

// Google News RSS/aggregation titles are formatted "<headline> - <Publisher>"
// (the per-article originating publisher, which varies within a single feed).
// Only apply this to Google-News-sourced items: on direct publisher feeds the
// same " - X" shape can be part of the real headline (e.g. a quote
// attribution like "Red Bull wing failure 'super-dangerous' - Verstappen"),
// so stripping it there would corrupt the title.
export function stripGoogleNewsSourceSuffix(title: string): string {
  const match = title.match(/^(.{10,}) - ([^-]{2,40})$/);
  return match ? match[1] : title;
}

export function isGoogleNewsUrl(url: string): boolean {
  return url.includes("news.google.com");
}

// Our own source labels for Google-News-backed feeds are all formatted
// "Google News — <region/topic>" (see src/lib/rss-sources.ts), so a simple
// substring check identifies them without needing the original feed URL.
export function isGoogleNewsSourceName(sourceName: string): boolean {
  return sourceName.includes("Google News");
}

export function cleanDisplayTitle(title: string, isGoogleNews: boolean): string {
  let cleaned = stripLiveUpdatesPrefix(title.trim());
  if (isGoogleNews) cleaned = stripGoogleNewsSourceSuffix(cleaned);
  return cleaned.trim();
}

// Truncates to a word boundary at/under maxLen, so a meta description never
// cuts off mid-word or mid-sentence with no indication it was cut.
export function truncateAtWordBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return trimmed.trim() + "…";
}

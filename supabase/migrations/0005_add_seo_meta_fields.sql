-- GlobeVortex: add Haiku-generated SEO meta title/description to articles.
-- Nullable: older rows (pre-dating this change) and articles that skipped the
-- Haiku call (outside the 6h recency window) have no value here, and
-- generateMetadata falls back to the cleaned article.title / summary.
-- Run in Supabase Dashboard -> SQL Editor (or via the Supabase CLI).

ALTER TABLE articles
  ADD COLUMN meta_title TEXT,
  ADD COLUMN meta_description TEXT;

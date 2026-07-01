-- GlobeVortex: yearly_highlights — permanent curated archive that powers the
-- "Year in Review" page (/{lang}/2026). One row per highlight, bilingual FR/EN.
--
-- PERMANENT TABLE: unlike `articles` (purged after 7 days by
-- delete_old_articles(), which deletes ONLY from `articles`), this table must
-- never be cleaned up — it is the long-term memory of the site. A future
-- monthly cron will snapshot top Haiku-scored articles into this table before
-- the 7-day purge removes them from `articles`.
-- Run in Supabase Dashboard -> SQL Editor (or via the Supabase CLI).

CREATE TABLE yearly_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  headline_fr TEXT NOT NULL,
  headline_en TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date DATE NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The page reads WHERE year = ? ORDER BY month, display_order. This unique
-- index serves that filter via its (year, month) btree prefix AND makes the
-- seed script idempotent (upsert on year,month,display_order).
CREATE UNIQUE INDEX idx_yearly_highlights_year_month_order
  ON yearly_highlights (year, month, display_order);

-- Same lockdown as x_posts: RLS enabled with no public policy, so anon clients
-- can't read or write; only the server-side service-role key (which bypasses
-- RLS) can. The Year in Review page is a Server Component, so that's fine.
ALTER TABLE yearly_highlights ENABLE ROW LEVEL SECURITY;

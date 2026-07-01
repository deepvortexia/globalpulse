-- GlobeVortex: tracking table for articles posted to X (Twitter).
-- One row per article we've tweeted, so the /api/cron/post-to-x job never
-- reposts the same story. Deduped on article_url (the stable identifier):
-- articles.id is regenerated when a URL is re-ingested after the 7-day purge,
-- but the URL is stable, so we key on it. This table is intentionally NOT
-- purged — it is our permanent "already posted" ledger.
-- Run in Supabase Dashboard -> SQL Editor (or via the Supabase CLI).

CREATE TABLE x_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL,          -- articles.id at post time (may later be purged)
  article_url TEXT UNIQUE NOT NULL,  -- dedup key; UNIQUE guards against double-posting races
  tweet_id TEXT,                     -- id of the headline tweet (null if the post call failed)
  reply_tweet_id TEXT,               -- id of the link reply (null if the reply call failed)
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- The job checks candidate URLs against this table on every run.
CREATE INDEX idx_x_posts_article_url ON x_posts(article_url);

-- Lock the table down like `articles`: no public policy means anon/authenticated
-- clients can't read or write it; only the service-role key (which bypasses RLS)
-- can, and that key lives server-side in the cron route.
ALTER TABLE x_posts ENABLE ROW LEVEL SECURITY;

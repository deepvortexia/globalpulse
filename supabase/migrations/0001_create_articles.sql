-- GlobeVortex: articles table for the bilingual FR/EN news aggregator.
-- Run in Supabase Dashboard -> SQL Editor (or via the Supabase CLI).

CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT UNIQUE NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'World',
  source TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  score INTEGER DEFAULT 0
);

CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_language ON articles(language);
CREATE INDEX idx_articles_url ON articles(url);

-- Auto-delete articles older than 7 days (keep DB clean)
CREATE OR REPLACE FUNCTION delete_old_articles()
RETURNS void AS $$
BEGIN
  DELETE FROM articles WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

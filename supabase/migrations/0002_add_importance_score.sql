-- GlobeVortex: add Haiku-generated importance scoring to articles.
-- A new column (rather than reusing `score`, which is reserved/unused and on a
-- different scale) holding a 0-100 global-importance rating. Powers Top Stories.
-- Run in Supabase Dashboard -> SQL Editor (or via the Supabase CLI).

ALTER TABLE articles
  ADD COLUMN importance_score INTEGER NOT NULL DEFAULT 0;

-- Top Stories reads filter on a high importance_score within a recent window and
-- order by importance_score desc; index supports both the filter and the sort.
CREATE INDEX idx_articles_importance_score ON articles(importance_score DESC);

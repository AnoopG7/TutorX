-- ============================================================================
-- Supabase RPC Functions
-- Run this in the Supabase SQL editor AFTER applying db_schema.sql
-- ============================================================================

-- match_textbook_chunks: cosine similarity search with optional filters
CREATE OR REPLACE FUNCTION match_textbook_chunks(
  query_embedding  vector(768),
  match_threshold  float   DEFAULT 0.65,
  match_count      int     DEFAULT 5,
  filter_subject   text    DEFAULT NULL,
  filter_grade     int     DEFAULT NULL
)
RETURNS TABLE (
  id             bigint,
  chapter        text,
  section        text,
  subject        text,
  grade          int,
  content        text,
  page_reference text,
  similarity     float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tc.id,
    tc.chapter,
    tc.section,
    tc.subject,
    tc.grade,
    tc.content,
    tc.page_reference,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM textbook_chunks tc
  WHERE
    tc.is_verified = TRUE
    AND (filter_subject IS NULL OR tc.subject = filter_subject)
    AND (filter_grade   IS NULL OR tc.grade   = filter_grade)
    AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- match_qa_cache: check if this question was asked before
CREATE OR REPLACE FUNCTION match_qa_cache(
  query_embedding  vector(768),
  match_threshold  float DEFAULT 0.90,
  match_count      int   DEFAULT 1
)
RETURNS TABLE (
  id          uuid,
  question    text,
  answer      text,
  citations   jsonb,
  hits        int,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    qac.id,
    qac.question,
    qac.answer,
    qac.citations,
    qac.hits,
    1 - (qac.question_embedding <=> query_embedding) AS similarity
  FROM qa_cache qac
  WHERE 1 - (qac.question_embedding <=> query_embedding) > match_threshold
  ORDER BY qac.question_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Increment cache hit counter
CREATE OR REPLACE FUNCTION increment_cache_hits(cache_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE qa_cache
  SET hits = hits + 1, last_accessed = NOW()
  WHERE id = cache_id;
$$;

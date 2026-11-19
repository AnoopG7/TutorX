-- ============================================================================
-- 001: replace the IVFFlat vector index with HNSW
--
-- Why: IVFFlat clusters vectors when the index is built (lists = 100) and, by
-- default, searches 1 cluster per query. With ~1,600 rows that is ~16 rows per
-- cluster, and after the textbook re-ingest the clusters were trained on
-- deleted data. Measured on scripts/eval_retrieval.py (58 questions):
--     IVFFlat (current)      hit@5 55%   (many queries return nothing)
--     exact search           hit@5 91%
-- HNSW needs no training and gives near-exact recall at this size.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

DROP INDEX IF EXISTS textbook_chunks_embedding_idx;

CREATE INDEX IF NOT EXISTS textbook_chunks_embedding_hnsw
ON textbook_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

ANALYZE textbook_chunks;

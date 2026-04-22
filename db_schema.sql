-- ============================================================================
-- CBSE Study Agent - Database Schema
-- Supabase PostgreSQL + pgvector
-- Embeddings: nomic-embed-text (768-dim via Ollama) — NOT Groq
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. STUDENT PROFILES (Agent memory — persists across sessions)
-- ============================================================================
CREATE TABLE student_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255),                -- Optional: only set if using email auth
  grade        INTEGER NOT NULL CHECK (grade IN (9, 10)),
  subjects     TEXT[]  DEFAULT '{}',
  -- Agent memory fields
  teaching_style VARCHAR(50) DEFAULT 'definition_first'
    CHECK (teaching_style IN ('definition_first', 'analogy_first', 'example_first', 'socratic')),
  custom_instructions TEXT DEFAULT '',  -- User's personalized instructions to the AI tutor
  weak_areas   JSONB   DEFAULT '[]',   -- [{topic, score, last_attempted}]
  mastered_topics TEXT[] DEFAULT '{}',
  quiz_history JSONB   DEFAULT '[]',   -- [{topic, score, date}]
  total_sessions INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sp_user_id ON student_profiles(user_id);
CREATE INDEX idx_sp_grade   ON student_profiles(grade);

-- ============================================================================
-- 2. TEXTBOOK CHUNKS (Core RAG data)
-- ============================================================================
CREATE TABLE textbook_chunks (
  id              BIGSERIAL PRIMARY KEY,
  chapter         VARCHAR(255) NOT NULL,  -- "Chapter 1: Chemical Reactions"
  section         VARCHAR(255),           -- "1.2 Types of Reactions"
  subject         VARCHAR(100) NOT NULL,  -- "Science", "Mathematics", etc.
  grade           INTEGER NOT NULL CHECK (grade IN (9, 10)),
  content         TEXT NOT NULL,          -- 400-500 token chunk
  embedding       vector(768),            -- nomic-embed-text (768-dim)
  chunk_index     INTEGER NOT NULL,       -- Sequential position in chapter
  page_reference  VARCHAR(50),            -- "Page 12"
  is_verified     BOOLEAN DEFAULT FALSE,
  quality_score   DECIMAL(3, 2) CHECK (quality_score BETWEEN 0 AND 1),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tc_subject_grade ON textbook_chunks(subject, grade);
CREATE INDEX idx_tc_chapter       ON textbook_chunks(chapter);
CREATE INDEX idx_tc_verified      ON textbook_chunks(is_verified);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX textbook_chunks_embedding_idx
ON textbook_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================================================
-- 3. QA CACHE (Frequently asked questions — built automatically)
-- ============================================================================
CREATE TABLE qa_cache (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question           TEXT NOT NULL,
  question_embedding vector(768),          -- nomic-embed-text (768-dim)
  answer             TEXT NOT NULL,
  citations          JSONB,                -- [{chunk_id, chapter, section, page}]
  subject            VARCHAR(100),
  grade              INTEGER,
  hits               INTEGER DEFAULT 1,
  confidence_score   DECIMAL(3, 2),
  last_accessed      TIMESTAMP DEFAULT NOW(),
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qac_hits       ON qa_cache(hits DESC);
CREATE INDEX idx_qac_subject    ON qa_cache(subject);

CREATE INDEX qa_cache_embedding_idx
ON qa_cache USING ivfflat (question_embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================================================
-- 4. SESSIONS (Agent conversation history — full tool call trace)
-- ============================================================================
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       VARCHAR(255),
  subject     VARCHAR(100),
  chapter     VARCHAR(255),
  -- Each message: {role, content, tool_name?, tool_input?, tool_output?, timestamp}
  messages    JSONB DEFAULT '[]',
  started_at  TIMESTAMP DEFAULT NOW(),
  ended_at    TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sess_user_id    ON sessions(user_id);
CREATE INDEX idx_sess_created    ON sessions(started_at DESC);
CREATE INDEX idx_sess_subject    ON sessions(subject);

-- ============================================================================
-- 5. USER QUESTIONS (Individual Q&A log)
-- ============================================================================
CREATE TABLE user_questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES sessions(id) ON DELETE SET NULL,
  question           TEXT NOT NULL,
  question_embedding vector(768),          -- For cache lookup
  chapter            VARCHAR(255),
  subject            VARCHAR(100),
  grade              INTEGER,
  answer             TEXT,
  citations          JSONB,
  tool_used          VARCHAR(100),         -- Which agent tool generated this answer
  was_helpful        BOOLEAN,              -- Student feedback
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uq_user_id   ON user_questions(user_id);
CREATE INDEX idx_uq_session   ON user_questions(session_id);
CREATE INDEX idx_uq_subject   ON user_questions(subject);

-- ============================================================================
-- 6. PRACTICE QUESTIONS (Static question bank per chapter)
-- ============================================================================
CREATE TABLE practice_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter          VARCHAR(255) NOT NULL,
  section          VARCHAR(255),
  subject          VARCHAR(100) NOT NULL,
  grade            INTEGER NOT NULL,
  question_text    TEXT NOT NULL,
  question_type    VARCHAR(50) CHECK (question_type IN
                     ('multiple_choice', 'short_answer', 'long_answer', 'true_false')),
  options          JSONB,                   -- For MCQ: [{label, text}]
  correct_answer   TEXT NOT NULL,
  explanation      TEXT,
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  source           VARCHAR(100),            -- "NCERT Exercise", "Board 2023", etc.
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pq_chapter    ON practice_questions(chapter);
CREATE INDEX idx_pq_subject    ON practice_questions(subject, grade);
CREATE INDEX idx_pq_difficulty ON practice_questions(difficulty_level);

-- ============================================================================
-- 7. QUIZ ATTEMPTS
-- ============================================================================
CREATE TABLE quiz_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id          UUID REFERENCES sessions(id) ON DELETE SET NULL,
  chapter             VARCHAR(255) NOT NULL,
  subject             VARCHAR(100) NOT NULL,
  grade               INTEGER,
  questions_answered  INTEGER NOT NULL,
  correct_answers     INTEGER NOT NULL,
  score_percentage    DECIMAL(5, 2),
  time_taken_seconds  INTEGER,
  questions_detail    JSONB,               -- [{question_id, student_answer, correct, was_hint_used}]
  attempt_date        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qa_user_id       ON quiz_attempts(user_id);
CREATE INDEX idx_qa_subject       ON quiz_attempts(subject, chapter);
CREATE INDEX idx_qa_date          ON quiz_attempts(user_id, attempt_date DESC);

-- ============================================================================
-- 8. USER PROGRESS (Per subject-chapter tracking)
-- ============================================================================
CREATE TABLE user_progress (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject              VARCHAR(100) NOT NULL,
  chapter              VARCHAR(255) NOT NULL,
  grade                INTEGER,
  topics_completed     TEXT[] DEFAULT '{}',
  topics_pending       TEXT[] DEFAULT '{}',
  best_quiz_score      DECIMAL(5, 2),
  time_spent_minutes   INTEGER DEFAULT 0,
  last_accessed        TIMESTAMP,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject, chapter)
);

CREATE INDEX idx_up_user_id        ON user_progress(user_id);
CREATE INDEX idx_up_subject_chap   ON user_progress(subject, chapter);
CREATE INDEX idx_up_latest         ON user_progress(user_id, updated_at DESC);

-- ============================================================================
-- Row-Level Security (RLS)
-- ============================================================================
ALTER TABLE student_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts     ENABLE ROW LEVEL SECURITY;

-- Students see only their own data
CREATE POLICY "Own profile"     ON student_profiles  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own sessions"    ON sessions          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own questions"   ON user_questions    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own progress"    ON user_progress     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own attempts"    ON quiz_attempts     FOR ALL USING (auth.uid() = user_id);

-- Reference tables are public read
CREATE POLICY "Public textbook chunks"     ON textbook_chunks     FOR SELECT USING (true);
CREATE POLICY "Public practice questions"  ON practice_questions  FOR SELECT USING (true);
CREATE POLICY "Public qa cache read"       ON qa_cache            FOR SELECT USING (true);

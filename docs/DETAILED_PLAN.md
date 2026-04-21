# CBSE Study Agent — Detailed Plan

## 1. Project Overview
An intelligent tutoring agent designed specifically for 9th and 10th grade CBSE (Central Board of Secondary Education) students. Unlike a simple Q&A bot, the agent actively *teaches* — assessing the student's understanding, adapting its explanation style, checking comprehension, and remembering weak areas across sessions. It operates on a continuous Observe → Think → Act → Reflect loop rather than a one-shot question-answer pipeline.

**Target Users:** 9th & 10th grade CBSE students
**Primary Goal:** Personalized, adaptive tutoring grounded in NCERT textbooks — not just answering questions, but ensuring the student *actually understands*
**Agent Type:** RAG-powered tutoring agent with single-shot LLM generation
**Framework:** LlamaIndex (embeddings) + Groq LLM (`llama-3.3-70b-versatile`) + Supabase (pgvector + auth + persistence)

---

## 2. Agent Architecture

### 2.1 The Agent Loop (Current Implementation)

> **Architecture Decision (April 2026):** We replaced the original ReAct multi-tool agent (which caused 14+ Groq API calls per question, hitting rate limits and timeouts) with a **direct RAG + single LLM call** architecture. The agent now:
> 1. Loads student profile + session history from Supabase
> 2. Retrieves relevant NCERT chunks via pgvector RPC (with query reformulation + chunk enrichment)
> 3. Builds a single rich prompt with context + student profile + conversation history
> 4. Calls Groq **once** → structured pedagogical response
> 5. Persists messages to session history

```
OBSERVE
  ├─ Student's current message
  ├─ Conversation history (last 6 messages from session)
  ├─ Student profile (grade, weak areas, mastered topics, teaching style)
  └─ Retrieved textbook context (pgvector RPC + enrichment)
        ↓
RETRIEVE (RAG Pipeline)
  ├─ Embed query via Ollama nomic-embed-text (768-dim)
  ├─ pgvector RPC match_textbook_chunks (cosine similarity)
  ├─ [Optional] LLM query reformulation if <3 results
  ├─ Deduplicate chunks
  └─ [Optional] LLM chunk enrichment (examples, misconceptions)
        ↓
GENERATE (Single Groq Call)
  ├─ System prompt with teaching style, weak areas, mastered topics
  ├─ Formatted context from retrieved chunks
  ├─ Last 6 conversation messages for continuity
  └─ Current user message
        ↓
PERSIST
  ├─ Store user message in session
  ├─ Store assistant response in session
  └─ Session ID returned to client for continuity
```

### 2.2 Enhancement Strategies

| Strategy | Trigger | Action | Groq Cost |
|----------|---------|--------|-----------|
| Query Reformulation | `chunks < 3` or `avg_sim < 0.60` | LLM generates 4 search variants, retry best | +1 call (~150 tokens) |
| Chunk Enrichment | `chunks > 0` and `avg_sim > 0.50` | LLM adds examples, misconceptions, connections | +1 call (~300 tokens) |
| Contextual Citations | Always | Citations woven into response text (not bibliography) | Within main call |

### 2.3 Pedagogical Strategy (Unchanged)
The agent adapts its teaching style based on the student's profile and in-session responses:

| Student State | Teaching Action |
|---|---|
| First time asking about a topic | Definition → Working Principle → Key Points → Example → Quick Check |
| Struggling (wrong answers / confused) | Simplify → Different analogy → Break into smaller steps |
| Getting it right | Deepen → Harder example → Edge cases → Quiz |
| Advanced / fast learner | Socratic questioning → Guide to self-discover |
| Exam preparation mode | Practice questions → Timed quiz → Weak area review |

### 2.4 Teaching Styles Supported
1. **Definition-First** ⭐ (Default) — Definition → Principle → Key Points → Example → Check
2. **Analogy-First** — Relatable analogy first, then explanation
3. **Example-First** — Concrete example first, then concept
4. **Socratic** — Guiding questions to help student think

---

## 3. Technical Architecture

### 3.1 Backend System — Current Implementation
```
Student Message (Web / CLI / Telegram)
        ↓
API Gateway (FastAPI — /api/chat)
  ├─ Dual auth: Bearer JWT (production) or user_id in body (dev mode)
        ↓
Agent Loop (app/agent/loop.py)
  ├─ 1. LOAD: Student profile + session from Supabase
  ├─ 2. RETRIEVE: pgvector RPC → query reformulation → chunk enrichment
  ├─ 3. BUILD: System prompt + context + history + message
  ├─ 4. GENERATE: Single Groq achat() call → llama-3.3-70b-versatile
  └─ 5. PERSIST: Append user msg + assistant response to session
        ↓
Supabase PostgreSQL
  ├─ textbook_chunks (768-dim pgvector, IVFFlat index)
  ├─ qa_cache (question→answer pairs, hit counting)
  ├─ student_profiles (weak areas, mastered topics, teaching style)
  ├─ sessions (JSONB message array per session)
  ├─ user_progress (per subject-chapter tracking)
  ├─ practice_questions (MCQ, short answer bank)
  └─ quiz_attempts (score history)
        ↓
Response to Client
  { response, session_id, citations[], tools_used[] }
```

### 3.2 Data Pipeline — NCERT Textbook Ingestion
> **Copyright Note:** NCERT books are Government of India publications released for free public use. Confirm this for your specific use-case and document it.

1. **Textbook Ingestion:** Admin downloads NCERT PDFs from ncert.nic.in (official, free)
2. **Parsing:** Extract chapters, sections, examples, questions using `pdfplumber`
3. **Chunking:** Split into 400-500 token chunks with 50-token overlap
4. **Embedding Generation:** Use `nomic-embed-text` via Ollama (local, free, 768-dim)
5. **Storage:** Insert chunks + embeddings into Supabase pgvector
6. **Indexing:** IVFFlat index on Supabase for fast similarity search
7. **Quality Control:** Test with sample questions per chapter before going live
8. **Caching:** QA cache is automatically populated as students ask questions

### 3.3 Key Technologies
- **Agent Framework:** LlamaIndex (LLM wrapper + embedding integration)
- **LLM:** Groq API (`llama-3.3-70b-versatile`) — free tier
- **Embeddings:** `nomic-embed-text` via Ollama — 768-dim, free, local
- **Backend:** FastAPI/Python
- **Database:** Supabase PostgreSQL + pgvector + Auth + Storage
- **Frontend:** React + Vite (TypeScript)
- **Telegram Bot:** python-telegram-bot (webhook integration)

> ⚠️ **Important:** Groq does NOT provide embedding models. All embeddings use `nomic-embed-text` via Ollama. Do not confuse Groq (LLM inference) with embedding generation.

---

## 4. Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Project structure and development environment
- [x] PDF processing and textbook ingestion (`scripts/ingest.py`, `scripts/batch_ingest.py`)
- [x] RAG pipeline (embedder → pgvector RPC → retriever with fallback)
- [x] Agent loop — single Groq call architecture (`app/agent/loop.py`)
- [x] Session management + student profiles (`app/agent/memory.py`)
- [x] Chat API endpoint with dual auth (`app/api/routes/chat.py`)
- [x] Profile/progress endpoints (`app/api/routes/profile.py`)
- [x] System prompt with teaching style support (`app/prompts/system_prompt_v1.txt`)
- [x] Query reformulation strategy (`app/rag/query_reformulation.py`)
- [x] Chunk enrichment strategy (`app/rag/chunk_enrichment.py`)
- [x] QA cache infrastructure (`app/rag/cache.py`)
- [x] Supabase service with SERVICE_ROLE_KEY (`app/services/supabase_service.py`)
- [x] Groq service singleton (`app/services/groq_service.py`)
- [x] DB schema with all 8 tables + RLS + RPC functions
- [x] Seed data script (`scripts/seed_tutorx.py`)
- [x] CLI chat interface (`scripts/chat_cli.py`)
- [x] Full backend audit — 21 issues found and fixed (models, auth, retriever, etc.)

### Phase 2: Core Features — 🔜 NEXT
- [ ] **Quiz generation endpoint** — `POST /api/quiz/generate`
  - Accept: subject, chapter, difficulty, num_questions
  - Return: MCQ questions from practice_questions table + LLM-generated ones
  - Track attempts in `quiz_attempts` table
- [ ] **Answer checking endpoint** — `POST /api/quiz/check`
  - Accept: question_id, student_answer
  - Return: correct/incorrect, explanation, update weak_areas
- [ ] **Chapter summary endpoint** — `GET /api/chapters/{chapter_id}/summary`
  - Retrieve all chunks for a chapter, use LLM to generate concise summary
- [ ] **QA cache integration in agent loop** — check cache before Groq call
  - Match via embedding similarity (>0.90 threshold)
  - Auto-populate cache after successful responses
- [ ] **Weak area auto-detection** — after quiz/wrong answers, update profile
- [ ] **Response metadata** — latency breakdown, strategies applied, similarity scores

### Phase 3: Enhancement — PLANNED
- [ ] **Evaluation framework** (`evals/` directory)
  - `golden_dataset.json` — 50+ Q&A pairs with expected answers
  - `eval_retrieval.py` — RAG hit rate, MRR
  - `eval_answer_quality.py` — LLM-as-judge accuracy scoring
  - Run via `run_evals.sh`
- [ ] **Concept mapping** — show related topics across chapters
- [ ] **Progress dashboard API** — aggregate stats for frontend
- [ ] **Teaching style auto-adaptation** — detect student's learning pattern
- [ ] **Telegram bot integration** — complete webhook handler
- [ ] **Streaming responses** — SSE from Groq for real-time output

### Phase 4: Polish & Deploy — PLANNED
- [ ] **Production auth** — migrate from SERVICE_ROLE_KEY to strict RLS policies
- [ ] **Rate limiting** — per-user request throttling
- [ ] **Error monitoring** — structured logging, alerts
- [ ] **Performance optimization** — response caching, connection pooling
- [ ] **Deploy** — Backend on Render, Frontend on Vercel
- [ ] **Mobile responsiveness** in frontend

---

## 5. Current File Structure

```
cbse-study-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                       # FastAPI entry, CORS, routers
│   │   ├── config.py                     # Pydantic settings (env vars)
│   │   │
│   │   ├── agent/
│   │   │   ├── loop.py                   # ✅ Direct RAG + single Groq call
│   │   │   ├── memory.py                 # ✅ Profile + session persistence
│   │   │   └── __init__.py
│   │   │
│   │   ├── rag/
│   │   │   ├── retriever.py              # ✅ pgvector RPC + local fallback
│   │   │   ├── embedder.py               # ✅ Ollama nomic-embed-text
│   │   │   ├── query_reformulation.py    # ✅ LLM query variants
│   │   │   ├── chunk_enrichment.py       # ✅ LLM content enrichment
│   │   │   ├── cache.py                  # ✅ QA cache manager
│   │   │   ├── rpc_functions.sql         # ✅ pgvector match functions
│   │   │   └── __init__.py
│   │   │
│   │   ├── api/
│   │   │   ├── auth.py                   # ✅ Dual auth (JWT + dev mode)
│   │   │   ├── routes/
│   │   │   │   ├── chat.py               # ✅ POST /api/chat
│   │   │   │   ├── profile.py            # ✅ Profile + progress endpoints
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── services/
│   │   │   ├── supabase_service.py       # ✅ Singleton with SERVICE_ROLE_KEY
│   │   │   ├── groq_service.py           # ✅ Client + model from settings
│   │   │   └── __init__.py
│   │   │
│   │   ├── models/
│   │   │   ├── schemas.py                # ✅ Pydantic schemas (aligned)
│   │   │   └── __init__.py
│   │   │
│   │   ├── prompts/
│   │   │   ├── system_prompt_v1.txt      # ✅ Versioned system prompt
│   │   │   └── __init__.py
│   │   │
│   │   ├── background_tasks/
│   │   │   ├── telegram_webhook.py       # ⏳ Placeholder (Phase 3)
│   │   │   └── __init__.py
│   │   │
│   │   └── utils/
│   │       ├── errors.py                 # ✅ Custom exceptions
│   │       ├── logger.py                 # ✅ Logger helper
│   │       └── __init__.py
│   │
│   ├── scripts/
│   │   ├── ingest.py                     # ✅ Single PDF → pgvector
│   │   ├── batch_ingest.py               # ✅ All PDFs by subject
│   │   ├── batch_ingest_new.py           # ✅ New subjects only
│   │   ├── seed_tutorx.py                # ✅ Sample data (Ollama embeds)
│   │   └── chat_cli.py                   # ✅ Interactive CLI
│   │
│   ├── requirements.txt                  # ✅ All deps specified
│   ├── .env / .env.example               # ✅ Environment config
│   └── README.md                         # ✅ Architecture + setup docs
│
├── frontend/                             # ⏳ Needs rebuild (Phase 2+)
│   ├── src/
│   │   ├── App.tsx                       # Skeleton
│   │   └── main.tsx                      # Entry point
│   ├── .env                              # Supabase + API URL configured
│   └── vite.config.ts
│
├── docs/
│   └── DETAILED_PLAN.md                  # This file
│
├── db_schema.sql                         # ✅ Full schema (8 tables, RLS)
├── DETAILED_FLOW.md                      # ✅ Complete request flow diagram
└── CLEANUP_REPORT.md                     # ✅ Audit results
```

---

## 6. API Endpoints — Current Status

### Implemented ✅
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Main chat — runs agent loop, returns response + citations |
| `GET` | `/api/chat/sessions/{user_id}` | List recent sessions |
| `GET` | `/api/chat/sessions/{user_id}/{session_id}/history` | Full session history |
| `POST` | `/api/chat/sessions/{session_id}/close` | Mark session ended |
| `GET` | `/api/student/profile` | Get student profile (auth required) |
| `GET` | `/api/student/weak-areas` | Get weak areas + mastered topics |
| `GET` | `/api/student/progress` | Per-subject progress data |
| `PUT` | `/api/student/preference` | Update teaching style |
| `GET` | `/api/chapters/{subject}/{grade}` | List available chapters |

### Planned (Phase 2) 🔜
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/quiz/generate` | Generate quiz for a chapter/topic |
| `POST` | `/api/quiz/check` | Check answer, return feedback |
| `GET` | `/api/chapters/{chapter_id}/summary` | LLM-generated chapter summary |
| `GET` | `/api/recommendations` | Personalized study recommendations |
| `POST` | `/api/student/profile` | Create student profile from frontend |

### Planned (Phase 3) 📋
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook/telegram` | Telegram bot webhook |
| `GET` | `/api/concepts/{topic}/related` | Related concept mapping |
| `GET` | `/api/evals/run` | Run evaluation suite |

---

## 7. Database Schema

### Tables (8 total — all in `db_schema.sql`)
1. **student_profiles** — User identity, grade, teaching style, weak areas, mastered topics
2. **textbook_chunks** — NCERT content with 768-dim pgvector embeddings
3. **qa_cache** — Cached question→answer pairs with hit counting
4. **sessions** — Conversation history (JSONB messages array)
5. **user_questions** — Individual Q&A log with feedback
6. **practice_questions** — Static question bank (MCQ, short answer)
7. **quiz_attempts** — Score tracking per quiz attempt
8. **user_progress** — Per subject-chapter completion tracking

### RPC Functions (in `rpc_functions.sql`)
- `match_textbook_chunks()` — pgvector cosine similarity with subject/grade filters
- `match_qa_cache()` — QA cache lookup by embedding similarity
- `increment_cache_hits()` — Update cache hit counter

### RLS Policies
- Students see only their own data (profiles, sessions, questions, progress, attempts)
- Textbook chunks, practice questions, QA cache are public-read

---

## 8. Quality Assurance

### 8.1 Backend Audit (Completed April 20, 2026)
Full audit of all 24 backend files. Issues found and fixed:
- **7 critical bugs**: Decommissioned models, missing functions, wrong embedding dimensions, full-table scan retriever
- **9 warnings**: Duplicate chunks, stale scores, sync-in-async, route nesting, auth in dev mode
- **5 best practices**: f-string logging, recreated clients, conflicting loggers, schema mismatches

### 8.2 Testing Strategy
- Unit tests for RAG retrieval accuracy
- Integration tests for agent loop (query → response)
- CLI testing via `scripts/chat_cli.py`
- Eval framework planned (Phase 3)

---

## 9. Configuration

### Environment Variables
```env
# Groq LLM
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.3-70b-versatile   # ← Updated from decommissioned mixtral

# Supabase
SUPABASE_URL=your_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Ollama (local embeddings)
# Runs on http://localhost:11434 by default

# Telegram (optional)
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain/webhook/telegram

# Environment
ENVIRONMENT=development
DEBUG=true
```

### Feature Flags (in `retriever.py`)
```python
USE_QUERY_REFORMULATION = True   # Strategy 2 — LLM reformulates low-quality queries
USE_CHUNK_ENRICHMENT = True      # Strategy 3 — LLM enriches top chunk with examples
```

### RAG Parameters
```python
TOP_K = 5                    # Return top 5 chunks
MIN_SIMILARITY = 0.65        # Minimum cosine similarity threshold
EMBED_DIM = 768              # nomic-embed-text dimension
CHUNK_SIZE = 450             # Target tokens per chunk
CHUNK_OVERLAP = 50           # Overlap between chunks
```

---

## 10. Performance Characteristics

| Stage | Time | Notes |
|-------|------|-------|
| Session + Profile load | ~15ms | Supabase query |
| Query embedding | ~50ms | Ollama local |
| pgvector RPC search | ~20ms | Server-side similarity |
| Query Reformulation | ~500ms | Only if <3 results (optional) |
| Chunk Enrichment | ~500ms | Only if sim>0.50 (optional) |
| LLM Generation | ~1000ms | Single Groq call |
| Persistence | ~20ms | Supabase write |
| **Total** | **~1.5–2.5s** | Depends on strategies triggered |

**Key metric:** 1 Groq call per message (vs. 14+ with old ReAct agent)

---

## 11. Known Limitations & Technical Debt

1. **Sync-in-async**: supabase-py is synchronous — blocks event loop during DB calls. Acceptable for dev, needs async client for production load.
2. **FK constraints**: `student_profiles.user_id` references `auth.users` — dev-mode UUIDs may not exist. Backend handles with graceful fallback.
3. **QA cache not integrated in loop**: Cache infrastructure exists but isn't queried before Groq calls yet (Phase 2 task).
4. **Telegram webhook placeholder**: Handler structure exists but `process_webhook_update()` is empty.
5. **No streaming**: Responses are returned in full — no SSE/streaming support yet.

---

## 12. Next Backend Tasks (Priority Order)

### Immediate (Phase 2 Start)
1. **Wire QA cache into agent loop** — check `match_qa_cache` RPC before calling Groq, save responses after successful generation
2. **Quiz generation route** — `POST /api/quiz/generate` using practice_questions + LLM fallback
3. **Answer checking route** — `POST /api/quiz/check` with weak_area auto-update
4. **Profile creation route** — `POST /api/student/profile` for frontend onboarding

### Short-term
5. **Chapter summary route** — aggregate chunks per chapter, LLM-summarize
6. **Response metadata** — return latency breakdown, similarity scores, strategies used
7. **CLI testing** — verify full end-to-end flow with `scripts/chat_cli.py`

### Medium-term (Phase 3)
8. **Eval framework** — golden dataset, retrieval eval, answer quality eval
9. **Telegram webhook** — complete message processing
10. **Streaming** — SSE support for real-time response rendering

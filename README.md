<div align="center">

# TutorX

### AI-Powered CBSE Study Agent

**A RAG-grounded intelligent tutoring system that reads your NCERT textbooks, understands your learning gaps, and teaches you like a personal tutor would -- all for $0/month.**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-GPT_OSS_120B-FF6B00?style=for-the-badge&logoColor=white)](https://groq.com)

</div>

---

## What is TutorX?

TutorX is a full-stack AI tutoring platform built for **CBSE Grade 9 & 10 students**. It ingests **80 NCERT textbook PDFs** across 8 subjects, chunks them into a vector database, and answers student questions using a **3-stage Retrieval-Augmented Generation pipeline** that goes far beyond naive similarity search.

The system doesn't just retrieve text -- it **reformulates queries** when retrieval is weak, **enriches chunks** with pedagogical context (examples, misconceptions, real-world connections), and delivers **personalized responses** adapted to each student's teaching style, weak areas, and mastery level.

---

## Architecture

```
                          ┌──────────────────────┐
                          │    React Frontend     │
                          │    Vercel (CDN)       │
                          └──────────┬───────────┘
                                     │ REST API
                          ┌──────────▼───────────┐
                          │   FastAPI Backend     │
                          │   Render (Free Tier)  │
                          └──┬───────┬───────┬───┘
                             │       │       │
              ┌──────────────┘       │       └──────────────┐
              │                      │                      │
    ┌─────────▼──────────┐  ┌───────▼────────┐  ┌─────────▼──────────┐
    │  Groq Cloud (LLM)  │  │  Supabase DB   │  │  Ollama (Local)    │
    │  LLaMA 3.3 70B     │  │  PostgreSQL +   │  │  nomic-embed-text  │
    │  ~1 call/question  │  │  pgvector       │  │  768-dim embeddings│
    └────────────────────┘  └────────────────┘  └────────────────────┘
```

---

## The RAG Pipeline -- How It Actually Works

This is not a "stuff everything into the prompt" RAG. TutorX implements a **3-stage intelligent retrieval pipeline** that actively compensates for weak embeddings and poor initial retrieval:

### Stage 1 -- Query Reformulation

When initial vector search returns **fewer than 3 chunks** or **average similarity drops below 0.60**, the system doesn't just return bad results. It triggers a Groq LLM call that generates **4 alternative search phrasings** -- different keyword combinations, semantic variations, related concept phrasings, and technical term variants -- and retries retrieval against all of them.

```
Student asks: "how does photosynthesis work"
  → Initial search: 2 chunks, avg sim 0.58 (WEAK)
  → Reformulation generates:
      "light dependent reactions chloroplast"
      "Calvin cycle carbon fixation"
      "photolysis of water photosystem II"
      "photosynthesis equation reactants products"
  → Retry search across all variants → 5 chunks, avg sim 0.78 (STRONG)
```

### Stage 2 -- Vector Search with Graceful Fallback

Search executes against a **pgvector IVFFlat index** (cosine similarity, 100 lists) via a Supabase RPC function. If the RPC fails or returns nothing, the system **degrades gracefully** through three fallback tiers:

1. **Server-side RPC** -- pgvector cosine search with subject/grade filters
2. **Local cosine fallback** -- Python-side similarity computation on candidate chunks
3. **Empty context** -- LLM responds using general knowledge (never crashes)

### Stage 3 -- Chunk Enrichment

The top-matching chunk doesn't go straight to the LLM. It gets **enriched** with pedagogical context via a targeted Groq call that adds:

- **ONE concrete example** -- a relatable, real-world analogy a Grade 9 student would understand
- **ONE common misconception** -- the mistake students typically make about this concept
- **ONE real-world connection** -- how this links to other topics or everyday life

This transforms raw textbook excerpts into **teaching-ready context** before the LLM ever sees it.

### Final Generation

The enriched context, student profile, conversation history, and teaching style instructions are assembled into a single prompt. **One Groq LLM call** generates the final response with natural citations woven into the text (not numbered footnotes).

---

## Agent Tool Calls & Orchestration

TutorX's agent loop (`backend/app/agent/loop.py`) orchestrates the entire pipeline in a deterministic sequence -- not a ReAct-style agent that burns 14+ LLM calls per question:

```
User Message
  │
  ▼
┌─────────────────────────┐
│ 1. Embed Query          │ ← Ollama nomic-embed-text (768-dim)
│ 2. Vector Search        │ ← pgvector RPC with fallback chain
│ 3. Query Reformulation  │ ← Groq LLM (conditional: if retrieval weak)
│ 4. Chunk Enrichment     │ ← Groq LLM (conditional: if match found)
│ 5. Build Context        │ ← Profile + history + enriched chunks
│ 6. Generate Response    │ ← Groq LLM (1 call, always)
│ 7. Cache Result         │ ← SHA256 hash → qa_cache table
└─────────────────────────┘
```

**Worst case: 1 LLM call. Best case: 1 LLM call. Typical case: 1 LLM call.** The reformulation and enrichment calls are conditional and lightweight -- they only fire when needed and use lower token budgets (150 and 300 tokens respectively).

This architecture **eliminates timeouts and rate limits** entirely. The original ReAct agent design required 14+ Groq calls per question and frequently hit timeouts. The current design completes in under 3 seconds.

---

## Features

### Intelligent Tutoring

| Feature | Details |
|---------|---------|
| **4 Teaching Styles** | Definition-first, Analogy-first, Example-first, Socratic -- each with distinct response structure |
| **Personalized Responses** | Adapts to student name, grade, weak areas, mastered topics |
| **Custom Instructions** | Students can add personal directives (e.g., "Use simple Hindi-English mixed sentences") |
| **Comprehension Checks** | Every response ends with a single comprehension check question |
| **CBSE-Aligned Format** | Definition -> Working Principle -> Key Points -> Example -> Quick Check |
| **Natural Citations** | Contextual references ("Your NCERT textbook explains...") not numbered footnotes |

### Content Intelligence

| Feature | Details |
|---------|---------|
| **80 NCERT PDFs Ingested** | Science (13), Math (15), Economics (4), English (18), Geography (6), Hindi (14), History (5), Political Science (5) |
| **702 Textbook Chunks** | 450-token overlapping chunks with 50-token overlap for context continuity |
| **Chapter/Section Detection** | Regex-based heading extraction from NCERT PDF structure |
| **Verification System** | All chunks inserted as `is_verified=FALSE` for manual review before production |
| **QA Cache** | SHA256-hashed query caching to avoid redundant LLM calls for repeated questions |

### Student Profile & Progress

| Feature | Details |
|---------|---------|
| **Auto Profile Creation** | Profile created seamlessly on first interaction, zero setup friction |
| **Weak Areas Tracking** | JSONB array of `{topic, score, last_attempted}` updated per quiz |
| **Mastered Topics** | Text array of topics the student has demonstrated understanding of |
| **Quiz History** | Last 50 quiz attempts with topic, score, and date |
| **Total Sessions** | Running count of student engagement |
| **Progress Schema** | Per subject-chapter tracking with `topics_completed`, `topics_pending`, `best_quiz_score` |

### Chat & Sessions

| Feature | Details |
|---------|---------|
| **Session Management** | Each conversation creates a session with subject, chapter, and message history |
| **Auto-Titling** | Sessions auto-titled from first user message (like ChatGPT/Claude) |
| **Sliding Window** | Last 50 messages kept per session for context management |
| **Conversation Continuity** | Last 6 messages included in LLM prompt for coherent multi-turn dialogue |
| **Session Grouping** | Frontend groups sessions by Today / Yesterday / This week / Earlier |

### Authentication & Security

| Feature | Details |
|---------|---------|
| **Supabase Auth** | Email/password with email confirmation flow |
| **JWT Bearer Tokens** | Backend validates via `client.auth.get_user(token)` |
| **Dual Client Architecture** | Admin client (service_role) for DB writes, Auth client (anon) for sign-in |
| **Row-Level Security** | RLS enabled on 5 tables ensuring users only access own data |
| **Dev Mode Fallback** | `user_id` query param when no JWT (with warning in non-dev) |

### Telegram Bot

| Feature | Details |
|---------|---------|
| **Webhook Integration** | `POST /webhook/telegram` registered in FastAPI |
| **Natural Language** | Non-command messages passed directly to agent |
| **Typing Indicator** | Shows "typing..." while processing |
| **Citation Display** | Sources appended to responses in Markdown |

### Frontend

| Feature | Details |
|---------|---------|
| **Responsive Design** | Mobile-first with hamburger menu, adaptive layouts |
| **Dark/Light/System Theme** | Three-way toggle with localStorage persistence |
| **Markdown Rendering** | AI responses rendered with `react-markdown` + GitHub Flavored Markdown |
| **Citation Tags** | Expandable citation badges showing chapter references |
| **Auto-Resize Textarea** | Chat input grows/shrinks with content |
| **Suggestion Chips** | Clickable suggestion prompts on dashboard and empty chat |
| **Subject Quick-Start** | Subject-colored cards for instant chat initiation |
| **URL-based Prefill** | `/chat?subject=Science&q=Explain photosynthesis` pre-fills and sends |
| **Cold-Start Detection** | `BackendStartupBanner` shows "Server waking up..." when Render cold starts |
| **Health Check Polling** | Monitors backend availability every 10 seconds |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 8 + TypeScript | SPA with HMR |
| Styling | TailwindCSS 4 + shadcn/ui | Design system |
| Forms | react-hook-form + Zod | Validation |
| Backend | FastAPI + Python 3.12 | REST API |
| LLM | Groq `openai/gpt-oss-120b` | Response generation |
| Embeddings | Ollama `nomic-embed-text` (768-dim) | Local vector embeddings |
| Database | Supabase PostgreSQL + pgvector | Storage + vector search |
| Auth | Supabase Auth | JWT-based authentication |
| Telegram | python-telegram-bot | Bot integration |
| Deployment | Vercel (FE) + Render (BE) | Free tier hosting |

---

## Database Schema

```
student_profiles          user_profiles, preferences, weak areas, quiz history
textbook_chunks           NCERT content with 768-dim pgvector embeddings
qa_cache                  SHA256-hashed query cache with similarity scoring
sessions                  Chat sessions with JSONB message history
user_questions            Per-question audit log with embeddings
practice_questions        MCQ/short/long answer questions with explanations
quiz_attempts             Quiz scores with per-question detail JSONB
user_progress             Per subject-chapter progress tracking
```

**3 Server-Side RPC Functions:**
- `match_textbook_chunks()` -- pgvector cosine similarity with subject/grade filters
- `match_qa_cache()` -- QA cache lookup with 0.90 similarity threshold
- `increment_cache_hits()` -- Atomic cache hit counter

---

## Project Structure

```
cbse-study-agent/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI entry point
│   │   ├── config.py                        # pydantic-settings
│   │   ├── agent/
│   │   │   ├── loop.py                      # Core agent orchestration (276 lines)
│   │   │   └── memory.py                    # Profile + session CRUD
│   │   ├── rag/
│   │   │   ├── retriever.py                 # 3-stage RAG pipeline (288 lines)
│   │   │   ├── embedder.py                  # Ollama embedding wrapper
│   │   │   ├── query_reformulation.py       # Strategy 2: LLM query variants
│   │   │   ├── chunk_enrichment.py          # Strategy 3: Pedagogical enrichment
│   │   │   ├── cache.py                     # QA cache manager
│   │   │   └── rpc_functions.sql            # Supabase RPC functions
│   │   ├── api/routes/
│   │   │   ├── chat.py                      # POST /api/chat + sessions
│   │   │   ├── profile.py                   # Profile CRUD + chapters
│   │   │   └── auth.py                      # Signup + login
│   │   ├── services/
│   │   │   ├── groq_service.py              # Groq LLM wrapper
│   │   │   └── supabase_service.py          # Dual Supabase client
│   │   ├── prompts/system_prompt_v1.txt     # System prompt template
│   │   └── background_tasks/
│   │       └── telegram_webhook.py          # Telegram bot
│   └── scripts/
│       ├── ingest.py                        # Single PDF ingestion
│       ├── batch_ingest.py                  # Batch all subjects
│       ├── batch_ingest_new.py              # Incremental ingest
│       ├── seed_tutorx.py                   # DB seeding
│       └── chat_cli.py                      # Interactive terminal chat
├── frontend/
│   └── src/
│       ├── pages/                           # Home, Login, Signup, Dashboard, Chat, Settings
│       ├── components/
│       │   ├── chat/                        # ChatInterface, MessageBubble, CitationTag
│       │   ├── dashboard/                   # RecentSessions
│       │   └── layout/                      # Navbar
│       ├── providers/                       # AuthProvider, ThemeProvider
│       ├── hooks/                           # useProfile, useBackendHealth, useTheme
│       └── lib/                             # API client, constants, schemas, utils
├── Pdfs/                                    # 80 NCERT textbook PDFs (8 subjects)
├── docs/                                    # Architecture docs, cost breakdown, workflow
└── db_schema.sql                            # Complete database schema
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [Ollama](https://ollama.ai) installed and running locally
- Supabase project (free tier)
- Groq API key (free tier)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start Ollama (separate terminal)
ollama serve
ollama pull nomic-embed-text

# Configure environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY

# Apply database schema
# Run db_schema.sql + rag/rpc_functions.sql in Supabase SQL Editor

# Ingest PDFs
python -m scripts.batch_ingest          # All subjects
python -m scripts.batch_ingest_new      # Only new subjects

# Start backend
python -m app.main
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000 (or omit for dev proxy)

npm run dev
# → http://localhost:5173 (proxies /api to :8000)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Ask a question (main agent endpoint) |
| `GET` | `/api/chat/sessions/{user_id}` | List recent sessions |
| `GET` | `/api/chat/sessions/{user_id}/{session_id}/history` | Session message history |
| `POST` | `/api/chat/sessions/{session_id}/close` | Close a session |
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/profile/{user_id}` | Get student profile |
| `PUT` | `/api/profile/{user_id}` | Update profile |
| `GET` | `/api/student/weak-areas` | Get weak areas + mastered topics |
| `GET` | `/api/student/progress` | Get progress by subject |
| `GET` | `/api/chapters/{subject}/{grade}` | List available chapters |
| `GET` | `/health` | Health check |

---

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Groq (LLM) | Free | $0/month |
| Ollama (Embeddings) | Local | $0/month |
| Supabase (Database) | Free (500MB) | $0/month |
| Vercel (Frontend) | Free | $0/month |
| Render (Backend) | Free (750 hrs) | $0/month |
| **Total** | | **$0/month** |

---

## Deployment

- **Frontend**: `cd frontend && npm run build` → deploy to Vercel
- **Backend**: Push to GitHub → Render auto-deploys via `Procfile`
- **Database**: Supabase SQL Editor for schema + RPC functions
- **Embeddings**: Requires Ollama running on the same machine as the backend

---

## License

MIT

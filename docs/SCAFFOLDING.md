# 🏗️ Project Scaffolding Plan - CBSE Study Agent

## Phase 1: Repository Structure

### Directory Layout
```
cbse-study-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py (FastAPI app entry)
│   │   ├── config.py (environment config)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py (Supabase auth endpoints)
│   │   │   │   ├── questions.py (RAG query endpoints)
│   │   │   │   ├── chapters.py (textbook navigation)
│   │   │   │   ├── progress.py (user progress tracking)
│   │   │   │   └── websocket.py (real-time updates)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py (Pydantic request/response schemas)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── rag_service.py (RAG pipeline: embed → search → generate)
│   │   │   ├── supabase_service.py (Supabase client wrapper)
│   │   │   ├── groq_service.py (Groq API wrapper)
│   │   │   └── telegram_service.py (Telegram bot handler)
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── logger.py (logging setup)
│   │   │   ├── errors.py (custom exceptions)
│   │   │   └── validators.py (input validation)
│   │   └── background_tasks/
│   │       ├── __init__.py
│   │       ├── scheduled_jobs.py (APScheduler jobs)
│   │       └── telegram_webhooks.py (async webhook handler)
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_rag_service.py
│   │   ├── test_api_endpoints.py
│   │   ├── conftest.py (pytest fixtures)
│   │   └── fixtures/
│   │       ├── sample_queries.py
│   │       └── mock_supabase.py
│   ├── requirements.txt (Python dependencies)
│   ├── .env.example (environment template)
│   ├── Dockerfile (optional, for containerization)
│   └── wsgi.py (Gunicorn entry point for Render)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx (Vite entry)
│   │   ├── App.jsx (root component)
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── SignUp.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── Study/
│   │   │   │   ├── SubjectSelector.jsx
│   │   │   │   ├── ChapterList.jsx
│   │   │   │   ├── ConceptExplainer.jsx
│   │   │   │   └── QuestionInput.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   ├── ProgressTracker.jsx
│   │   │   │   └── WeakTopics.jsx
│   │   │   ├── Common/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   └── RAG/
│   │   │       ├── RAGResponse.jsx
│   │   │       ├── CitationViewer.jsx
│   │   │       └── ResponseStreamer.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── StudyPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   ├── supabaseClient.js (Supabase initialization)
│   │   │   ├── apiClient.js (REST API wrapper)
│   │   │   ├── websocketClient.js (WebSocket handler)
│   │   │   └── authService.js (Supabase Auth wrapper)
│   │   ├── hooks/
│   │   │   ├── useAuth.js (auth context hook)
│   │   │   ├── useSupabase.js (Supabase query hook)
│   │   │   └── useRAG.js (RAG query state management)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── UIContext.jsx
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   └── tailwind.css
│   │   └── utils/
│   │       ├── formatters.js
│   │       └── validators.js
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── .env.local (ignored in git)
│
└── docs/
    ├── DETAILED_PLAN.md (existing)
    ├── RAG_VECTOR_DB.md (existing - implementation guide)
    ├── WORKFLOW.md (existing)
    ├── COST_BREAKDOWN.md (existing)
    ├── MULTI_CHANNEL_INTEGRATION_PLAN.md (existing)
    └── SCAFFOLDING.md (this file)
```

---

## Phase 2: Backend Scaffolding (FastAPI)

### Core Dependencies (requirements.txt)
```
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
supabase==2.3.4
groq==0.4.2
python-socketio==5.10.0
python-engineio==4.8.0
aiohttp==3.9.1
pydantic==2.5.0
pydantic-settings==2.1.0
httpx==0.25.2
python-telegram-bot==21.0
apscheduler==3.10.4
sqlalchemy==2.0.23  # optional, for type hints
pytest==7.4.3
pytest-asyncio==0.21.1
```

### main.py Structure
```python
# FastAPI app initialization
# ├─ CORS setup (Vercel frontend + localhost)
# ├─ Event handlers (startup/shutdown for Supabase connection)
# ├─ Router includes (auth, questions, chapters, progress, websocket)
# ├─ Error handlers (custom exceptions)
# ├─ Middleware (logging, auth verification)
# ├─ Background tasks (APScheduler for recurring jobs)
# └─ Telegram webhook route (POST /webhook/telegram)
```

### config.py Structure
```python
# Settings management
# ├─ Supabase credentials (URL, key, service role key)
# ├─ Groq API key
# ├─ Telegram bot token
# ├─ CORS allowed origins
# ├─ JWT secret (for optional custom tokens)
# ├─ Environment detection (dev/prod)
# └─ Logging level
```

### API Routes Breakdown

**auth.py**
```
POST /auth/signup            → Supabase auth signup
POST /auth/login             → Supabase auth login
POST /auth/logout            → Invalidate session
POST /auth/refresh-token     → Refresh JWT
GET  /auth/user              → Get current user profile
POST /auth/link-telegram     → Link Telegram to account
```

**questions.py**
```
POST /api/questions/ask                    → Ask RAG question
  ├─ Input: question, subject, chapter
  ├─ Process: Groq embed → pgvector search → Groq generate
  └─ Output: answer, citations, sources
  
GET  /api/questions/history                → User's past questions
GET  /api/questions/{id}                   → Get specific question
POST /api/questions/{id}/save-to-notes     → Save question to notes
```

**chapters.py**
```
GET  /api/chapters                         → List all chapters
GET  /api/chapters/{subject}               → Chapters for subject
GET  /api/chapters/{subject}/{chapter}     → Chapter details
POST /api/chapters/{id}/mark-studied       → Mark chapter as studied
```

**progress.py**
```
GET  /api/progress/dashboard               → User progress summary
GET  /api/progress/weak-topics             → Topics needing work
POST /api/progress/update-quiz-score       → Record quiz attempt
GET  /api/progress/analytics               → Detailed analytics
```

**websocket.py**
```
WebSocket /ws                → Real-time updates
  ├─ Streaming RAG responses
  ├─ Progress updates
  └─ Real-time notifications
```

### Database Layer (supabase_service.py)
```python
# Supabase wrapper
# ├─ Connection initialization
# ├─ Auth helpers (user verification)
# ├─ CRUD operations (generic query/insert/update/delete)
# ├─ pgvector operations (similarity search)
# ├─ Real-time subscription setup
# └─ Error handling & retry logic
```

### RAG Service (rag_service.py)
```python
# RAG pipeline orchestration
# ├─ Phase 1: Query embedding (Groq API)
# ├─ Phase 2: Vector search (Supabase pgvector IVFFlat)
# ├─ Phase 3: Context assembly (merge top-k chunks)
# ├─ Phase 4: LLM answer generation (Groq with context)
# ├─ Phase 5: Citation extraction
# └─ Error handling (no results, timeout, etc.)
```

### Telegram Service (telegram_service.py)
```python
# Telegram bot handler
# ├─ Command parsing (/start, /ask, /progress, etc.)
# ├─ User authentication (link Telegram to app account)
# ├─ Message routing (send to RAG or other services)
# ├─ Keyboard/inline button generation
# └─ Webhook handler for Telegram messages
```

### Background Tasks (scheduled_jobs.py)
```python
# APScheduler jobs
# ├─ Daily reminders (morning study time)
# ├─ Weekly progress summaries
# ├─ Telegram bot state cleanup
# └─ Database maintenance (old sessions cleanup)
```

---

## Phase 3: Frontend Scaffolding (React + Vite)

### Core Dependencies (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "supabase": "^2.38.1",
    "@supabase/auth-helpers-react": "^0.4.5",
    "@supabase/supabase-js": "^2.38.1",
    "axios": "^1.6.2",
    "socket.io-client": "^4.7.2",
    "zustand": "^4.4.1",
    "tailwindcss": "^3.3.6",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

### App Structure (React)
```
App.jsx
├─ AuthContext (Supabase session)
├─ Router
│  ├─ PublicRoutes
│  │  ├─ HomePage
│  │  ├─ LoginPage
│  │  └─ SignUpPage
│  └─ ProtectedRoutes
│     ├─ StudyPage
│     │  ├─ SubjectSelector
│     │  ├─ ChapterList
│     │  └─ StudyInterface
│     │     ├─ QuestionInput
│     │     ├─ RAGResponse (streaming)
│     │     └─ CitationViewer
│     └─ DashboardPage
│        ├─ ProgressSummary
│        ├─ WeakTopics
│        └─ StudyStats
└─ Header + Sidebar (navigation)
```

### State Management (Zustand)
```javascript
// authStore.js
// ├─ user (current logged-in user)
// ├─ session (Supabase session)
// ├─ setUser(user)
// ├─ setSession(session)
// └─ logout()

// ragStore.js
// ├─ currentQuestion (string)
// ├─ ragResponse (answer, citations, sources)
// ├─ isLoading (boolean)
// ├─ error (error message)
// ├─ setQuestion(q)
// ├─ askQuestion(q) [async]
// └─ clearResponse()

// progressStore.js
// ├─ userProgress (dashboard data)
// ├─ weakTopics (array)
// ├─ studyStats (analytics)
// └─ fetchProgress() [async]
```

### Service Layer

**apiClient.js**
```javascript
// Axios wrapper
// ├─ Base URL from env
// ├─ Auth header injection (Supabase token)
// ├─ Error handling & retry logic
// ├─ Request/response interceptors
// └─ Methods: get(url), post(url, data), etc.
```

**supabaseClient.js**
```javascript
// Supabase initialization
// ├─ Client creation with URL & key
// ├─ Auth state listener
// ├─ Real-time subscriptions setup
// └─ Error handling
```

**websocketClient.js**
```javascript
// Socket.io client
// ├─ Connection to /ws endpoint
// ├─ Event listeners (receive data)
// ├─ Event emitters (send data)
// └─ Reconnection logic
```

### Key Hooks

**useAuth.js**
```javascript
// Returns: { user, session, login, logout, signup }
// ├─ Manages Supabase auth state
// ├─ Persists session in localStorage
// └─ Auto-login on page refresh
```

**useRAG.js**
```javascript
// Returns: { response, isLoading, error, askQuestion }
// ├─ Calls /api/questions/ask endpoint
// ├─ Streams response via WebSocket
// ├─ Error handling
// └─ Cache recent questions
```

**useSupabase.js**
```javascript
// Returns: { data, isLoading, error, refetch }
// ├─ Generic hook for Supabase queries
// ├─ Real-time subscription support
// └─ Cache management
```

### Component Patterns

**RAGResponse.jsx** (complex)
```javascript
// Displays streamed RAG answer
// ├─ Markdown rendering
// ├─ Citation links
// ├─ Copy to clipboard button
// ├─ Save to notes button
// └─ Loading skeleton while streaming
```

**CitationViewer.jsx**
```javascript
// Shows source citations
// ├─ Chapter name
// ├─ Page number
// ├─ Highlighted excerpt
// └─ Link to full chapter
```

**QuestionInput.jsx**
```javascript
// Question input form
// ├─ Text field
// ├─ Subject selector dropdown
// ├─ Chapter selector dropdown
// ├─ Submit button
// └─ Error display
```

---

## Phase 4: Database (Supabase) Schema

### Tables to Create

**1. users** (managed by Supabase Auth - auto-created)
```sql
id (UUID, PK)
email (string)
created_at (timestamp)
```

**2. student_profiles** (CBSE-specific)
```sql
user_id (UUID, FK) - points to auth.users
name (string)
class (integer) - CBSE class (10-12)
school (string, nullable)
created_at (timestamp)
updated_at (timestamp)
```

**3. textbook_chunks** (CBSE RAG data)
```sql
id (UUID, PK)
subject (string) - "math", "science", etc.
chapter (string)
page_number (integer)
content (text) - chunk of textbook
embedding (vector(1536)) - Groq embeddings
created_at (timestamp)
```

**4. user_questions** (CBSE question history)
```sql
id (UUID, PK)
user_id (UUID, FK)
question (text)
subject (string)
chapter (string)
answer (text)
sources (jsonb) - array of {chunk_id, chapter, page}
created_at (timestamp)
```

**5. user_progress** (CBSE progress tracking)
```sql
id (UUID, PK)
user_id (UUID, FK)
subject (string)
chapter (string)
progress_percent (integer) - 0-100
quiz_attempts (integer)
quiz_average_score (float)
last_studied (timestamp)
```

**6. study_sessions** (real-time sync)
```sql
id (UUID, PK)
user_id (UUID, FK)
device_id (string) - for multi-device sync
last_active (timestamp)
active (boolean)
```

**7. notifications** (future feature)
```sql
id (UUID, PK)
user_id (UUID, FK)
type (string) - "reminder", "achievement", etc.
message (text)
read (boolean)
created_at (timestamp)
```

### Indexes to Create
```sql
-- pgvector similarity search index
CREATE INDEX ON textbook_chunks USING ivfflat (embedding vector_cosine_ops);

-- User queries lookup
CREATE INDEX ON user_questions(user_id, created_at DESC);

-- Progress tracking
CREATE INDEX ON user_progress(user_id, subject);

-- Session active lookups
CREATE INDEX ON study_sessions(user_id, active);
```

---

## Phase 5: Environment Configuration

### Backend (.env.example)
```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (keep secret!)

# Groq
GROQ_API_KEY=gsk_xxxxx

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_URL=https://api.cbse-study.onrender.com/webhook/telegram

# Environment
ENVIRONMENT=development  # or production
CORS_ORIGINS=http://localhost:5173,https://cbse-study.vercel.app
LOG_LEVEL=info
```

### Frontend (.env.example)
```
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# API
VITE_API_URL=http://localhost:8000  # or https://api.cbse-study.onrender.com
VITE_WS_URL=ws://localhost:8000     # or wss://api.cbse-study.onrender.com

# Environment
VITE_ENVIRONMENT=development  # or production
```

---

## Phase 6: Deployment Configuration

### Render Deployment (backend)

**render.yaml**
```yaml
services:
  - type: web
    name: cbse-study-backend
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
    envVars:
      - key: SUPABASE_URL
        value: ${SUPABASE_URL}
      - key: SUPABASE_KEY
        value: ${SUPABASE_KEY}
      # ... other env vars
```

**Dockerfile** (optional for consistency)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Vercel Deployment (frontend)

**vercel.json**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_API_URL": "@api_url"
  }
}
```

---

## Phase 7: CI/CD Pipelines

### GitHub Actions (backend tests + deploy)

**workflow: backend-test-deploy.yml**
```
On: push to main/develop

Steps:
1. Checkout code
2. Setup Python 3.11
3. Install dependencies
4. Run pytest
5. Build Docker image (optional)
6. Deploy to Render (if tests pass)
```

### GitHub Actions (frontend build + deploy)

**workflow: frontend-build-deploy.yml**
```
On: push to main/develop

Steps:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run npm run build
5. Run npm run preview (optional test)
6. Deploy to Vercel (if build succeeds)
```

---

## Phase 8: Local Development Setup

### docker-compose.yml (Supabase emulator locally)
```yaml
version: '3.8'
services:
  supabase:
    image: supabase/supabase:latest
    ports:
      - "54321:54321"  # PostgreSQL
      - "54322:54322"  # PostgREST
    environment:
      - POSTGRES_PASSWORD=password
      - SUPABASE_JWT_SECRET=super-secret-jwt-token
```

### Startup Commands
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
export $(cat .env | xargs)
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # runs on http://localhost:5173
```

---

## Phase 9: Testing Strategy

### Backend Tests
```
tests/
├── test_rag_service.py
│  ├─ test_embedding_generation
│  ├─ test_vector_search
│  ├─ test_rag_pipeline
│  └─ test_error_handling
├── test_api_endpoints.py
│  ├─ test_ask_question_endpoint
│  ├─ test_auth_endpoints
│  └─ test_unauthorized_access
└── conftest.py
   ├─ Fixtures for Supabase mock
   ├─ Fixtures for Groq mock
   └─ Fixtures for test data
```

### Frontend Tests (Vitest)
```
tests/
├── components/
│  ├─ RAGResponse.test.jsx
│  ├─ QuestionInput.test.jsx
│  └─ CitationViewer.test.jsx
├── hooks/
│  ├─ useRAG.test.js
│  ├─ useAuth.test.js
│  └─ useSupabase.test.js
└── services/
   ├─ apiClient.test.js
   └─ websocketClient.test.js
```

---

## Phase 10: Implementation Order (Recommended)

### Week 1: Setup & Foundation
1. Create GitHub repository
2. Initialize backend (FastAPI scaffold)
3. Initialize frontend (React + Vite scaffold)
4. Create Supabase project & database schemas
5. Get API keys (Groq, Telegram)

### Week 2: Authentication & Core APIs
1. Setup Supabase Auth (frontend + backend)
2. Create auth endpoints
3. Create protected routes
4. Setup CORS & error handling

### Week 3: RAG Pipeline
1. Implement RAG service (embedding → search → generate)
2. Create question endpoint
3. Upload sample textbook data to Supabase
4. Test end-to-end RAG

### Week 4: UI & Real-time
1. Build Study page UI components
2. Implement WebSocket streaming (responses)
3. Build Dashboard UI
4. Connect frontend to API

### Week 5: Telegram Integration
1. Create Telegram bot commands
2. Implement Telegram webhook handler
3. Setup account linking (Telegram ↔ app)
4. Test Telegram end-to-end

### Week 6: Testing & Optimization
1. Write unit tests
2. Write integration tests
3. Performance optimization
4. Load testing (simulated users)

### Week 7: Deployment
1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Set environment variables
4. Test in production
5. Monitor logs & errors

---

## Quick Scaffolding Commands

### Backend Setup
```bash
# Create FastAPI structure
mkdir -p app/{api/routes,models,services,utils,background_tasks}
mkdir -p tests/fixtures
touch app/__init__.py
touch app/main.py
touch app/config.py
# ... create all __init__.py files
```

### Frontend Setup
```bash
# Create React structure
npm create vite@latest frontend -- --template react
cd frontend
mkdir -p src/{components/{Auth,Study,Dashboard,Common,RAG},pages,services,hooks,context,styles,utils}
npm install
npm install -D tailwindcss postcss autoprefixer
```

---

## Key Files to Create First (Priority Order)

1. **Backend Priority**
   - `backend/requirements.txt` (dependencies locked)
   - `backend/app/config.py` (environment setup)
   - `backend/app/main.py` (FastAPI app)
   - `backend/app/services/supabase_service.py` (DB wrapper)
   - `backend/app/services/groq_service.py` (LLM wrapper)

2. **Frontend Priority**
   - `frontend/package.json` (dependencies)
   - `frontend/src/main.jsx` (React entry)
   - `frontend/src/App.jsx` (routing)
   - `frontend/src/services/supabaseClient.js` (Supabase init)
   - `frontend/src/services/apiClient.js` (API wrapper)

3. **Database Priority**
   - Supabase project created
   - All schemas migrated
   - pgvector extension enabled
   - IVFFlat indexes created

4. **Deployment Priority**
   - GitHub repo created
   - Render project configured
   - Vercel project configured
   - Environment variables set

---

**Ready to start building? 🚀**

# CBSE Study Agent — Detailed Plan

## 1. Project Overview
An intelligent tutoring agent designed specifically for 9th and 10th grade CBSE (Central Board of Secondary Education) students. Unlike a simple Q&A bot, the agent actively *teaches* — assessing the student's understanding, adapting its explanation style, checking comprehension, and remembering weak areas across sessions. It operates on a continuous Observe → Think → Act → Reflect loop rather than a one-shot question-answer pipeline.

**Target Users:** 9th & 10th grade CBSE students
**Primary Goal:** Personalized, adaptive tutoring grounded in NCERT textbooks — not just answering questions, but ensuring the student *actually understands*
**Agent Type:** RAG-powered tutoring agent with single-shot LLM generation
**Framework:** LlamaIndex (embeddings) + Groq LLM (`llama-3.3-70b-versatile`) + Supabase (pgvector + auth + persistence)

---

## 2. Agent Architecture

### 2.1 The Agent Loop
Every interaction runs through this reasoning cycle — not a one-shot RAG call:

```
OBSERVE
  ├─ Student's current message
  ├─ Conversation history (this session)
  ├─ Student profile (grade, weak areas, mastered topics, teaching style)
  └─ Retrieved textbook context (RAG)
        ↓
THINK (LLM Reasoning Step)
  ├─ What concept is the student struggling with?
  ├─ How well do they understand it? (probe if unclear)
  ├─ What teaching action is most appropriate right now?
  └─ Is this a new topic or a follow-up?
        ↓
ACT (Tool Selection)
  ├─ explain_concept()     → if student needs explanation
  ├─ generate_quiz()       → if concept was explained, check understanding
  ├─ check_answer()        → if student answered a quiz question
  ├─ get_chapter_summary() → if student wants overview
  ├─ suggest_next_topic()  → if student has finished a concept
  └─ probe_understanding() → if the agent is unsure of student's level
        ↓
REFLECT
  ├─ Did the student understand? (based on their response)
  ├─ Update student profile: weak_areas, mastered_topics
  └─ Decide: explain again differently / move on / quiz
```

### 2.2 Agent Tools (Function Calling)
The agent calls these discrete tools — never does everything in one LLM call:

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `search_textbook` | query, subject, grade | Top 5 textbook chunks + citations | Core RAG tool |
| `explain_concept` | concept, student_level, teaching_style | Structured explanation + example | Uses RAG context |
| `probe_understanding` | concept, student_response | Assessment + follow-up question | Socratic check |
| `generate_quiz` | topic, difficulty, num_questions | Quiz questions with answers | Practice mode |
| `check_answer` | question, student_answer | Correct/incorrect + explanation | Instant feedback |
| `get_chapter_summary` | chapter_id | Bullet-point summary | Quick overview |
| `get_related_concepts` | topic | List of linked topics | Concept mapping |
| `update_student_profile` | weak_areas, mastered_topics | Confirmation | Memory write |
| `suggest_next_topic` | student_history, subject | Recommended next topic | Proactive guidance |

### 2.3 Pedagogical Strategy
The agent adapts its teaching style based on the student's profile and in-session responses:

| Student State | Teaching Action |
|---|---|
| First time asking about a topic | Analogy → Core concept → Example → Quick check |
| Struggling (wrong answers / confused) | Simplify → Different analogy → Break into smaller steps |
| Getting it right | Deepen → Harder example → Edge cases → Quiz |
| Advanced / fast learner | Socratic questioning → Guide to self-discover |
| Exam preparation mode | Practice questions → Timed quiz → Weak area review |

### 2.4 Core Features

#### Concept Explanation
- **AI-powered topic breakdown:** Retrieve and explain textbook concepts in student-friendly language
- **Multi-level explanations:** Basic, intermediate, advanced — agent chooses based on student profile
- **Example-based learning:** Real-world examples for abstract concepts
- **Subject coverage:** Science, Mathematics, Social Studies, English (NCERT 9th & 10th)

#### Question Answering
- **Textbook-grounded answers:** Every answer cites the NCERT chapter/section it came from
- **Citation tracking:** Page reference shown alongside answer
- **Follow-up handling:** Agent remembers the last question — student can say "why?" without re-stating context

#### Study Support
- **Chapter summaries:** Concise, structured summaries of chapters
- **Practice questions:** Chapter-end questions with model answers
- **Exam prep mode:** Previous year questions, important topic weighting
- **Concept mapping:** Show how topics connect across chapters

#### Personalization & Memory
- **Session memory:** Full conversation history within a session
- **Cross-session memory:** Weak areas, mastered topics, quiz scores persist across sessions
- **Weak area identification:** Agent proactively revisits topics the student struggled with
- **Teaching style preference:** Stored per student (analogy-first / example-first / Socratic)

---

## 3. Technical Architecture

### 3.1 Backend System - Agent + RAG Architecture
```
Student Message
        ↓
API Gateway (Supabase Auth)
        ↓
LlamaIndex Agent (Agent Loop)
    ├─ Load: session history + student profile from Supabase
    ├─ THINK: Groq LLM decides which tool to call
    ├─ ACT: Call tool (search_textbook / generate_quiz / etc.)
    │       └─ search_textbook → pgvector similarity search
    ├─ RESPOND: Format response with citations
    └─ REFLECT: Update student profile (weak areas, mastered topics)
        ↓
Supabase PostgreSQL
    ├─ textbook_chunks (with 768-dim embeddings)
    ├─ qa_cache (frequently asked Q&A pairs)
    ├─ student_profiles (weak areas, mastered topics, style)
    └─ sessions (full conversation history)
        ↓
Response to Student with Citations
```

### 3.2 Data Pipeline - NCERT Textbook Ingestion
> **Copyright Note:** NCERT books are Government of India publications released for free public use. Confirm this for your specific use-case and document it.

1. **Textbook Ingestion:** Admin downloads NCERT PDFs from ncert.nic.in (official, free)
2. **Parsing:** Extract chapters, sections, examples, questions using `pdfplumber`
3. **Chunking:** Split into 400-500 token chunks with 50-token overlap
4. **Embedding Generation:** Use `nomic-embed-text` via Ollama (local, free, 768-dim)
5. **Storage:** Insert chunks + embeddings into Supabase pgvector
6. **Indexing:** Create IVFFlat index on Supabase for fast similarity search
7. **Quality Control:** Test with 20+ sample questions per chapter before going live
8. **Caching:** Store Q&A pairs in qa_cache as students ask questions

### 3.3 Key Technologies
- **Agent Framework:** LlamaIndex (agent loop + tool calling + RAG pipeline)
- **Backend:** FastAPI/Python on Render (free tier)
- **Frontend:** React + Vite on Vercel (free tier)
- **Database:** Supabase PostgreSQL (500MB free tier) - all data centralized
- **Vector Search:** Supabase pgvector (built-in, no extra cost)
- **Embeddings:** `nomic-embed-text` via Ollama — **768-dimensional, free, runs locally during ingestion**
- **LLM:** Groq API (Mixtral 8x7B) — unlimited free tier for reasoning
- **Authentication:** Supabase Auth (included, battle-tested)
- **Telegram Bot:** Telegram Bot API (free) — quick question interface
- **File Storage:** Supabase Storage (500MB free) — for study notes, progress exports

> ⚠️ **Important:** Groq does NOT provide embedding models directly. All embeddings use `nomic-embed-text`. Do not confuse Groq (LLM inference) with embedding generation.

---

## 4. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
- [ ] Set up project structure and development environment
- [ ] Integrate PDF processing for textbook uploads
- [ ] Build basic RAG pipeline
- [ ] Create simple Q&A interface
- [ ] Set up user authentication

### Phase 2: Core Features (Weeks 4-6)
- [ ] Implement concept explanation engine
- [ ] Build multi-level explanation system
- [ ] Create chapter summary generator
- [ ] Develop question practice module
- [ ] Add conversation history tracking

### Phase 3: Enhancement (Weeks 7-9)
- [ ] Implement visual aid generation
- [ ] Build concept mapping feature
- [ ] Add personalization engine
- [ ] Create progress dashboard
- [ ] Develop weak area identification

### Phase 4: Polish & Deploy (Weeks 10-12)
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Testing and bug fixes
- [ ] User feedback integration
- [ ] Production deployment

---

## 5. Data Management

### 5.1 Textbook Data Structure - Supabase Schema
```sql
-- Textbook chunks stored with embeddings in Supabase pgvector
CREATE TABLE textbook_chunks (
  id BIGSERIAL PRIMARY KEY,
  chapter VARCHAR(255),           -- "Chapter 1: Chemical Reactions"
  section VARCHAR(255),           -- "1.2 Types of Reactions"
  subject VARCHAR(100),           -- "Science", "Mathematics", etc
  grade INTEGER,                  -- 9 or 10
  content TEXT NOT NULL,          -- 400-500 token chunk
  embedding vector(768),          -- nomic-embed-text (768-dim, NOT Groq)
  chunk_index INTEGER,            -- Sequential position in chapter
  page_reference VARCHAR(50),     -- "Page 12"
  is_verified BOOLEAN DEFAULT FALSE,
  quality_score DECIMAL(3, 2),    -- 0.00 to 1.00
  created_at TIMESTAMP
);

-- Create pgvector index for fast similarity search
CREATE INDEX textbook_chunks_embedding_idx 
ON textbook_chunks USING ivfflat (embedding vector_cosine_ops);

-- Question-Answer cache for frequently asked questions
CREATE TABLE qa_cache (
  id BIGSERIAL PRIMARY KEY,
  question TEXT,
  question_embedding vector(768),  -- nomic-embed-text
  answer TEXT,
  citations JSONB,
  hits INTEGER DEFAULT 0,          -- How many times asked
  created_at TIMESTAMP
);

-- Student memory: persists across sessions
CREATE TABLE student_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  grade INTEGER,
  teaching_style VARCHAR(50) DEFAULT 'analogy_first',  -- 'analogy_first' | 'example_first' | 'socratic'
  weak_areas JSONB DEFAULT '[]',       -- [{"topic": "photosynthesis", "score": 0.4}]
  mastered_topics JSONB DEFAULT '[]',  -- ["oxidation", "reduction"]
  quiz_history JSONB DEFAULT '[]',     -- [{"topic", "score", "date"}]
  total_sessions INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session history (conversation memory within + across sessions)
CREATE TABLE sessions (
  session_id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  messages JSONB NOT NULL DEFAULT '[]',  -- [{role, content, tool_calls, timestamp}]
  subject VARCHAR(100),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

### 5.2 User Progress Tracking
```json
{
  "user_id": "student_123",
  "grade": "10",
  "progress": {
    "chapters_visited": ["ch1", "ch2"],
    "topics_completed": ["oxidation", "reduction"],
    "weak_areas": ["organic_chemistry"],
    "quiz_scores": [...]
  },
  "conversation_history": [...]
}
```

---

## 6. API Endpoints

### Question Answering
- `POST /api/ask` - Submit a question
- `GET /api/answer/{question_id}` - Get answer with sources
- `POST /api/ask/follow-up` - Ask follow-up questions

### Study Material
- `GET /api/chapters/{subject}/{grade}` - List available chapters
- `GET /api/chapter/{chapter_id}/summary` - Get chapter summary
- `GET /api/chapter/{chapter_id}/questions` - Get practice questions
- `GET /api/topic/{topic_id}/concepts` - Get concept explanations

### Personalization
- `GET /api/student/progress` - Get learning progress
- `GET /api/student/weak-areas` - Identify weak topics
- `POST /api/student/learning-preference` - Set learning style
- `GET /api/recommendations` - Get personalized study recommendations

---

## 7. User Interface

### 7.1 Main Dashboard
- Welcome section with recent topics
- Quick search bar for questions
- Subject/chapter navigation
- Progress overview widget
- Recent conversations

### 7.2 Study Interface
- Left sidebar: Chapter/Topic navigation
- Main area: Content display and explanation
- Right sidebar: Related concepts and quick links
- Bottom: Question input and chat

### 7.3 Practice/Quiz Interface
- Question display with options
- Real-time feedback
- Progress bar
- Answer explanation
- Performance analytics

### 7.4 Progress Dashboard
- Topics completed/pending
- Weak areas highlighted
- Learning timeline
- Performance metrics
- Goals and targets

---

## 8. Quality Assurance

### 8.1 Content Validation
- Manual review of textbook extraction
- Accuracy checking against original sources
- Regular updates with curriculum changes
- Expert review by CBSE educators

### 8.2 Response Quality
- Fact-checking mechanisms
- Citation verification
- Difficulty level appropriateness
- Clarity and comprehensiveness checks

### 8.3 Testing Strategy
- Unit tests for all agent tools (`search_textbook`, `generate_quiz`, `check_answer`, etc.)
- Integration tests for RAG pipeline:
  - Test Supabase pgvector similarity search accuracy (cosine similarity threshold)
  - Test citation accuracy and relevance against known textbook passages
  - Measure query response time (< 2 seconds target)
- Agent loop tests: does the agent correctly choose the right tool for each student state?
- User acceptance testing with real students
- Performance testing for response time and vector search precision (> 90% target)

### 8.4 Evaluation Framework (Evals)
Add an `evals/` directory from day one. Without evals, you can't know if a prompt change made the agent better or worse.

```
evals/
  golden_dataset.json        # 50+ {question, expected_answer, citation} pairs
  eval_retrieval.py          # Tests RAG retrieval quality (hit rate, MRR)
  eval_answer_quality.py     # LLM-as-judge: is the answer accurate + age-appropriate?
  eval_agent_loop.py         # Does agent pick the right tool for each scenario?
  run_evals.sh               # Run all evals, output score report
```

Use **RAGAS** metrics for RAG evaluation: faithfulness, answer relevancy, context precision.

---

## 9. Textbook Integration

### 9.1 Supported Formats
- PDF textbooks (primary)
- EPUB for digital books
- Plain text documents

### 9.2 Upload Process - RAG Pipeline
1. Admin downloads NCERT PDFs from ncert.nic.in (free, official)
2. Run ingestion script: extracts chapters/sections using `pdfplumber`
3. Manual spot-check of extraction accuracy (compare 5-10 pages to source)
4. **Chunking:** Split into 400-500 token chunks with 50-token overlap
5. **Embedding Generation:** For each chunk:
   - Run `nomic-embed-text` via Ollama locally
   - Generate **768-dimensional** embedding
   - Cost: $0 (runs locally, no API)
6. **Storage:** Insert into Supabase pgvector with metadata
7. **Indexing:** Create IVFFlat index for similarity search
8. **Verification:** Run eval suite against 20+ sample questions per chapter
9. Quality checks and manual review before going live
10. QA cache is automatically populated as students ask questions

### 9.3 Supported CBSE Books (10th Grade - Example)
- **Science:** Physics, Chemistry, Biology (NCERT)
- **Mathematics:** Algebra, Geometry, Statistics (NCERT)
- **Social Studies:** History, Geography, Political Science (NCERT)
- **English:** Literature and Language books

---

## 10. Success Metrics

### 10.1 User Engagement
- Daily active users
- Average session duration
- Questions answered per user
- Return user rate

### 10.2 Learning Outcomes
- Student reported improvement in grades
- Topics mastered tracking
- Quiz performance improvement
- Time spent on weak areas

### 10.3 System Performance
- Response time < 2 seconds
- Answer accuracy > 95%
- API uptime > 99.5%
- Vector search precision > 90%

---

## 11. Future Enhancements

- **Peer Learning:** Connect students for collaborative learning
- **Teacher Dashboard:** For educators to track student progress
- **Voice Interface:** Audio questions and explanations
- **AR Visualization:** Augmented reality for complex concepts
- **Adaptive Learning Paths:** AI-generated personalized study plans
- **Offline Mode:** Download content for offline learning
- **Multi-language Support:** Support for regional languages
- **Board Expansion:** Extend to other boards (IB, A-Levels, etc.)

---

## 12. Dependencies & Requirements

### 12.1 External APIs & Libraries (All FREE Tier)
- **Groq API:** LLM inference (Mixtral 8x7B) — Unlimited free tier
- **Supabase:** PostgreSQL with pgvector — 500MB free tier
- **Ollama + nomic-embed-text:** Local embedding generation — free, no API key needed
- **LlamaIndex:** Agent framework + RAG pipeline — open source, free
- **Telegram Bot API:** Quick question interface — free
- **No embedded LLM from Groq:** Groq is for generation only, not embeddings

### 12.2 Project Directory Structure
```
cbse-study-agent/
  backend/
    agent/
      loop.py          # Main agent reasoning loop
      tools.py         # All tool definitions (search_textbook, quiz, etc.)
      memory.py        # Student profile read/write
    rag/
      ingest.py        # PDF → chunks → embeddings pipeline
      retriever.py     # pgvector similarity search
    prompts/
      system_prompt_v1.txt    # Versioned system prompt
      explain_template_v1.txt # Explanation template
    evals/
      golden_dataset.json     # Test Q&A pairs
      eval_retrieval.py
      eval_answer_quality.py
      eval_agent_loop.py
  frontend/
  docs/
```

### 12.3 Infrastructure
- **Backend:** Render (FastAPI, free tier)
- **Frontend:** Vercel (React + Vite, free tier)
- **Database:** Supabase (PostgreSQL + pgvector + Auth + Storage)

### 12.3 Legal & Compliance
- CBSE textbook rights verification
- FERPA/student data privacy compliance
- Terms of service and privacy policy
- Data protection (GDPR, local regulations)

---

## 13. Deployment Strategy

### 13.1 MVP (Minimum Viable Product)
- Single subject (Science)
- 10th grade only
- Basic Q&A functionality
- Limited to 100 concurrent users
- Web interface only

### 13.2 Production Rollout
- Multi-subject support
- Both 9th and 10th grades
- Advanced features
- Mobile app launch
- Scale to 10K+ concurrent users

---

## 14. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Textbook copyright issues | Legal | Verify rights, seek permissions |
| Low user adoption | Business | Beta testing, marketing |
| AI hallucination/incorrect answers | Quality | Manual verification, citations |
| High infrastructure costs | Financial | Optimize queries, caching |
| Data privacy concerns | Legal | GDPR compliance, encryption |
| Fast curriculum changes | Maintenance | Frequent content updates |

---

## 15. Timeline & Milestones

- **Month 1:** MVP with Science subject, basic Q&A
- **Month 2:** Multi-subject support, explanation features
- **Month 3:** Personalization & progress tracking
- **Month 4:** Mobile app, advanced features
- **Month 5-6:** Beta launch with real users, feedback collection
- **Month 6+:** Production launch, continuous improvement

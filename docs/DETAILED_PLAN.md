# CBSE Study Agent - Detailed Plan

## 1. Project Overview
An intelligent tutoring system designed specifically for 9th and 10th grade CBSE (Central Board of Secondary Education) students. The agent serves as a personal tutor that explains concepts, answers questions, and helps students understand topics directly from CBSE textbooks.

**Target Users:** 9th & 10th grade CBSE students
**Primary Goal:** Enhance learning through personalized concept explanation and doubt resolution

---

## 2. Core Features

### 2.1 Concept Explanation
- **AI-powered topic breakdown:** Extract and explain concepts from CBSE textbooks in simple, student-friendly language
- **Multi-level explanations:** Provide basic, intermediate, and advanced understanding levels
- **Visual aids generation:** Create diagrams, flowcharts, and visual representations to aid understanding
- **Example-based learning:** Provide relevant real-world examples for abstract concepts
- **Subject coverage:** Science, Mathematics, Social Studies, English, and other CBSE subjects

### 2.2 Question Answering
- **Direct textbook queries:** Answer questions sourced directly from textbook chapters
- **Smart search:** Find relevant information across multiple chapters/subjects
- **Answer verification:** Cross-reference answers with CBSE curriculum standards
- **Citation tracking:** Show which textbook section/page the answer comes from

### 2.3 Study Support
- **Chapter summaries:** Generate concise summaries of chapters
- **Question practice:** Provide chapter-end questions and model answers
- **Doubt resolution:** Interactive Q&A for complex topics
- **Concept mapping:** Show connections between related topics
- **Exam preparation:** Help with previous year questions and important topics

### 2.4 Personalization
- **Learning pace tracking:** Adapt explanations based on student's comprehension level
- **Progress monitoring:** Track which topics the student has studied
- **Weak area identification:** Identify and focus on difficult topics
- **Learning history:** Maintain conversation history for context

---

## 3. Technical Architecture

### 3.1 Backend System - RAG Architecture
```
Student Question
        ↓
API Gateway (Supabase Auth)
        ↓
RAG Pipeline (Groq Embeddings)
    1. Generate embedding for question
    2. Search Supabase pgvector for similar chunks
    3. Retrieve top 5 most relevant textbook chunks
        ↓
Groq API (Mixtral 8x7B)
    ├─ Receives: Question + Retrieved Chunks
    ├─ Generates: Textbook-accurate answer
    └─ Output: Answer + Citations
        ↓
Supabase PostgreSQL
    ├─ textbook_chunks table (with embeddings)
    ├─ qa_cache table (frequently asked questions)
    ├─ user_progress table (student tracking)
    └─ conversations table (chat history)
        ↓
Response to Student with Citations
```

### 3.2 Data Pipeline - Supabase pgvector
1. **Textbook Ingestion:** Convert CBSE PDFs into structured data
2. **Parsing:** Extract chapters, sections, examples, questions
3. **Chunking:** Split into 500-600 character chunks with overlap
4. **Embedding Generation:** Use Groq API to generate 1536-dimensional embeddings
5. **Storage:** Insert chunks + embeddings into Supabase pgvector
6. **Indexing:** Create IVFFlat index on Supabase for fast similarity search
7. **Quality Control:** Manual verification of extraction accuracy
8. **Caching:** Store frequently asked questions in qa_cache table

### 3.3 Key Technologies
- **Backend:** FastAPI/Python on Render (free tier)
- **Frontend:** React + Vite on Vercel (free tier)
- **Database:** Supabase PostgreSQL (500MB free tier) - all data centralized
- **Vector Search:** Supabase pgvector - built-in, no additional cost
- **LLM:** Groq API (Mixtral 8x7B) - unlimited free tier
- **Authentication:** Supabase Auth (included, battle-tested)
- **Email:** AWS SES - 62K emails/month free
- **Real-time:** python-socketio (runs on Render)
- **Telegram Bot:** Telegram Bot API (free)
- **File Storage:** Supabase Storage (500MB free) - for study materials, progress notes

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
  content TEXT NOT NULL,          -- 500-600 character chunk
  embedding vector(1536),         -- Generated via Groq API
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
  question_embedding vector(1536),
  answer TEXT,
  citations JSONB,
  hits INTEGER DEFAULT 0,         -- How many times asked
  created_at TIMESTAMP
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
- Unit tests for core modules
- Integration tests for RAG pipeline:
  - Test Supabase pgvector similarity search accuracy
  - Verify Groq API embedding generation
  - Test citation accuracy and relevance
  - Measure query response time (<2 seconds target)
- User acceptance testing with real students
- Performance testing for response time and vector search precision (>90% target)

---

## 9. Textbook Integration

### 9.1 Supported Formats
- PDF textbooks (primary)
- EPUB for digital books
- Plain text documents

### 9.2 Upload Process - RAG Pipeline
1. Admin uploads textbook PDF to Supabase Storage
2. Automatic extraction of chapters/sections using pdf-parse
3. Manual verification of extraction accuracy
4. **Chunking:** Split into 500-600 character chunks with 100 char overlap
5. **Embedding Generation:** For each chunk:
   - Call Groq Embedding API
   - Generate 1536-dimensional embedding
   - Cost: $0 (free tier unlimited)
6. **Storage:** Insert into Supabase pgvector with metadata
7. **Indexing:** Create IVFFlat index for similarity search
8. **Verification:** Test with 20+ sample questions
9. Quality checks and manual review before going live
10. Cache is automatically built as students ask questions

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

### 12.1 External APIs (All FREE Tier)
- **Groq API:** LLM (Mixtral 8x7B) + Embeddings - Unlimited free tier
- **Supabase:** PostgreSQL with pgvector - 500MB free tier included
- **AWS SES:** Email service - 62,000 emails/month free
- **No separate vector database needed:** pgvector built into PostgreSQL

### 12.2 Infrastructure
- Cloud hosting (AWS, GCP, Azure)
- CDN for content delivery
- Email/notification service
- Analytics platform

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

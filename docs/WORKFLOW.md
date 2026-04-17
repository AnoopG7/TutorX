# CBSE Study Agent - Detailed Workflow

## Overview
Complete step-by-step workflow showing how the CBSE Study Agent works from user query to semantic answer with textbook citations.

---

## 1. User Query Flow (Web, Telegram, Email)

### 1.1 Web Interface Flow
```
User enters question on website
    ↓
React frontend validates input
    ↓
Frontend calls: POST /api/ask-question
    ↓
Request includes: { question: string, topic: string, chapter: number }
    ↓
Backend receives & authenticates via Supabase Auth token
    ↓
Process RAG pipeline (see Section 2)
    ↓
WebSocket pushes response in real-time to frontend
    ↓
UI displays: [Answer] + [Source Textbook Chunks] + [Confidence Score]
```

### 1.2 Telegram Bot Flow
```
User sends message to CBSE Study Bot
    ↓
Telegram sends webhook to Render backend
    ↓
FastAPI endpoint: POST /telegram/webhook
    ↓
Parse message: "/ask chapter 5 what is photosynthesis"
    ↓
Extract: question="what is photosynthesis", chapter=5, topic="Biology"
    ↓
Run RAG pipeline (same as Section 2)
    ↓
Format response for Telegram (shorter, button menu)
    ↓
Telegram bot replies with answer + [View Full] button
    ↓
Button links to website for detailed answer with sources
```

### 1.3 Email Query Flow
```
User sends email: ask@cbse-agent.com
    ↓
AWS SES receives email
    ↓
Lambda function (or Render webhook) parses email
    ↓
Extract question from email body
    ↓
Run RAG pipeline
    ↓
Email formatter creates HTML response email
    ↓
AWS SES sends email back to user with answer + sources
    ↓
User can reply to email to ask follow-up question
```

---

## 2. RAG Pipeline (Core Processing)

### 2.1 High-Level RAG Flow
```
User Query Input
    ↓
Step 1: Query Embedding
    - Groq API converts question to 384-dim vector
    - Example: "what is photosynthesis" → [0.23, -0.41, 0.89, ...]
    ↓
Step 2: Vector Similarity Search
    - Supabase pgvector queries textbook_chunks table
    - Finds 5 most similar textbook chunks using cosine similarity
    - Returns: [Chunk_ID, Chapter, Section, Text, Score]
    ↓
Step 3: Context Assembly
    - Takes top 5 chunks
    - Sorts by relevance score
    - Creates context window: up to 3000 tokens
    - Prepends chunk metadata: "Chapter 5, Section: Photosynthesis"
    ↓
Step 4: LLM Generation
    - Groq API receives: [Question] + [Context from textbook]
    - LLM generates answer using textbook content
    - LLM adds inline citations: "As stated in Chapter 5..."
    ↓
Step 5: Response Assembly
    - Format answer with markdown
    - Add source citations with chapter/section references
    - Calculate confidence score (based on vector similarity)
    - Return to frontend/Telegram/Email
```

### 2.2 Detailed RAG API Endpoint

**Endpoint:** `POST /api/ask-question`

**Request:**
```json
{
  "question": "What is photosynthesis and its importance for life on Earth?",
  "chapter": 5,
  "topic": "Biology",
  "difficulty": "intermediate"
}
```

**Backend Processing (Step-by-Step Code Logic):**

```python
# Step 1: Create question embedding
groq_client = Groq()
question_embedding = groq_client.embeddings.create(
    model="mixtral-8x7b",
    input=question,
    dimensions=384
)

# Step 2: Search Supabase vector DB
search_results = supabase.rpc('search_textbook_chunks', {
    'query_embedding': question_embedding,
    'similarity_threshold': 0.6,
    'match_count': 5
})

# Step 3: Build context from top chunks
context = ""
sources = []
for chunk in search_results:
    context += f"Chapter {chunk['chapter']}, {chunk['section']}:\n{chunk['text']}\n\n"
    sources.append({
        'chapter': chunk['chapter'],
        'section': chunk['section'],
        'confidence': chunk['similarity_score']
    })

# Step 4: Generate answer using Groq LLM
system_prompt = """You are a CBSE exam tutor. Answer using ONLY information from the provided textbook chunks.
For every claim, cite the source: "As mentioned in Chapter X, Section Y..."
If you cannot answer from textbook, say "This is not covered in provided textbook sections."
Keep answer concise but comprehensive."""

response = groq_client.chat.completions.create(
    model="mixtral-8x7b",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Textbook Context:\n{context}\n\nQuestion: {question}"}
    ],
    temperature=0.3,
    max_tokens=1000
)

# Step 5: Calculate confidence (average of top chunk similarities)
confidence = sum([s['similarity_score'] for s in sources]) / len(sources)

# Step 6: Return formatted response
return {
    "answer": response.choices[0].message.content,
    "sources": sources,
    "confidence": confidence,
    "answer_time_ms": elapsed_time
}
```

**Response:**
```json
{
  "answer": "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen. As stated in Chapter 5, Section 1, this process occurs primarily in the leaves' chloroplasts. The importance lies in three aspects:\n\n1. **Oxygen Production**: The reaction produces oxygen gas (O₂) released into the atmosphere, which is essential for aerobic respiration in most organisms.\n\n2. **Energy Conversion**: Photosynthesis converts light energy into chemical energy stored in glucose, forming the base of most food chains on Earth.\n\n3. **Carbon Cycle**: By consuming CO₂, plants regulate atmospheric carbon dioxide levels and prevent climate extremes.\n\nAs emphasized in Chapter 5, Section 3, without photosynthesis, life as we know it would not exist on Earth.",
  
  "sources": [
    {
      "chapter": 5,
      "section": "Photosynthesis Overview",
      "confidence": 0.94,
      "text_preview": "Photosynthesis is the process by which green plants manufacture their own food..."
    },
    {
      "chapter": 5,
      "section": "Role in Oxygen Production",
      "confidence": 0.89,
      "text_preview": "The light-dependent reactions produce oxygen as a byproduct..."
    },
    {
      "chapter": 5,
      "section": "Energy Importance",
      "confidence": 0.85,
      "text_preview": "The chemical energy stored in glucose is used by all organisms..."
    }
  ],
  
  "confidence": 0.89,
  "answer_time_ms": 2341
}
```

---

## 3. Complete User Journey - Web Interface

### 3.1 Student logs into website

```
1. Student navigates to cbse-agent.com
2. Frontend detects no Supabase Auth token
3. Redirect to login page
4. Student enters email + password
5. Frontend calls: Supabase.auth.signInWithPassword(email, password)
6. Supabase Auth verifies credentials
7. Returns JWT token + user session
8. Frontend stores token in secure localStorage
9. Redirect to dashboard
10. Frontend fetches user profile: GET /api/user/profile
    ↓
    Returns: { name, grade, subjects, recentQuestions }
11. Display personalized dashboard
```

### 3.2 Student selects subject & chapter

```
1. Student clicks on "Biology"
2. Frontend shows: [Chapter 1] [Chapter 2] ... [Chapter 15]
3. Student clicks "Chapter 5 - Photosynthesis"
4. Frontend loads:
   - Chapter overview
   - Learning objectives
   - Related previous questions from Supabase
   - Sample exam questions
```

### 3.3 Student asks first question

```
1. Student types: "What is photosynthesis?"
2. Frontend validates:
   - Min 10 characters ✓
   - Max 500 characters ✓
   - Not a duplicate question ✓
3. Frontend shows loading spinner
4. Frontend calls: POST /api/ask-question
   Request: { question: "What is photosynthesis?", chapter: 5, topic: "Biology" }
   Headers: { "Authorization": "Bearer {jwt_token}" }

5. Backend authenticates token via Supabase
6. Backend runs RAG pipeline (see Section 2.2)
   - Embeds question (384 dims)
   - Searches top 5 textbook chunks
   - Generates LLM answer with citations
   - Calculates confidence
   - All in ~2.3 seconds

7. Backend streams response via WebSocket in real-time:
   PROGRESS: "Embedding question..."
   PROGRESS: "Searching textbooks..."
   PROGRESS: "Generating answer..."
   COMPLETE: { answer, sources, confidence }

8. Frontend receives real-time updates:
   - Shows progress bar
   - Displays answer incrementally as it arrives
   - Highlights source citations
   - Shows confidence score (89% confident)

9. Backend logs to Supabase:
   - Inserts into questions table:
     { user_id, question_text, chapter_id, answer, confidence, timestamp }

10. Frontend displays:
    ✓ Answer with formatted text
    ✓ [View Source 1] [View Source 2] [View Source 3] buttons
    ✓ Confidence meter: ████████░ 89%
    ✓ Similar questions: [Show 3 other questions on this topic]
    ✓ Buttons: [Save to Notes] [Print] [Share]
```

### 3.4 Student asks follow-up question

```
1. Student types: "What is the role of chlorophyll?"
2. Frontend detects this is a follow-up (same chapter, same session)
3. Frontend includes context: { question, parentQuestionId: previous_id }
4. Backend receives follow-up indicator
5. Backend can optionally use previous context to improve next answer
6. Same RAG pipeline runs
7. Answer displayed with source context

Frontend UI shows:
├─ Original Question: "What is photosynthesis?"
│  └─ Answer: [original answer]
├─ Follow-up: "What is the role of chlorophyll?"
│  └─ Answer: [new answer]
```

### 3.5 Student saves question to notes

```
1. Student clicks [Save to Notes]
2. Frontend calls: POST /api/questions/{question_id}/save
3. Backend inserts into saved_questions table:
   { user_id, question_id, saved_at }
4. Frontend shows toast: "✓ Saved to your notes"
5. Student can later access via [My Notes] section
6. Notes page shows all saved questions with filters:
   [All] [Chapter 5] [Chapter 6] [High Confidence]
```

### 3.6 Exam preparation feature

```
Student clicks [Practice Exam Mode]
    ↓
Backend fetches random questions from textbook
    ↓
Shows question → User answers → Compares with RAG answer
    ↓
Calculates accuracy %
    ↓
Suggests weak chapters based on wrong answers
    ↓
All progress saved to Supabase
    ↓
Displays: "You got 8/10 correct. Strong in Chapters 3,5. Review Chapter 7."
```

---

## 4. Telegram Bot Workflow

### 4.1 Bot Commands

```
/start → Subscribe to bot, show menu
/ask [question] → Ask a question about current chapter
/chapter [number] → Switch to a chapter
/save → Show all saved answers
/practice → Quick practice mode
/help → Show all commands
```

### 4.2 Example Telegram Conversation

```
User: /start
Bot: "Welcome to CBSE Study Agent 📚\nWhich grade are you in? [9] [10] [11] [12]"

User: (clicks [10])
Bot: "Great! Choose your subject: [Biology] [Chemistry] [Physics] [Math]"

User: (clicks [Biology])
Bot: "Biology Grade 10 ✓\nWhich chapter? [1-15]"

User: 5
Bot: "Chapter 5 - Photosynthesis selected ✓\nNow ask me anything about this chapter!"

User: what is photosynthesis
Bot: "🤔 Searching textbooks... (2-3 sec)
     
Photosynthesis is the process by which plants convert sunlight, water, and CO₂ into glucose and oxygen. It occurs primarily in the chloroplasts of leaf cells.

📍 Source: Chapter 5, Section 1
Confidence: 89%

[View Full Answer on Website] [Save] [Ask Follow-up]"

User: (clicks [Ask Follow-up])
Bot: "What's your follow-up question?"

User: why is it important
Bot: "🤔 Searching...
     
Photosynthesis is important because:
1️⃣ Produces oxygen for respiration
2️⃣ Creates glucose (food) for the plant
3️⃣ Forms base of most food chains

📍 Source: Chapter 5, Sections 2-3
Confidence: 91%

[View Full] [Save] [Another Question]"
```

### 4.3 Telegram Real-Time Sync

```
User asks question on Website
    ↓
Backend stores in Supabase
    ↓
Backend sends Telegram notification:
   "Your website question on Chapter 5 got 89% confidence answer ✓"
    ↓
User on Telegram sees notification with quick access

User asks on Telegram
    ↓
Backend stores in Supabase
    ↓
User's website dashboard auto-updates:
   "New answer available from Telegram query"
    ↓
Same answer available on both platforms
```

---

## 5. Email Workflow

### 5.1 Email Query Processing

```
User sends email to: ask@cbse-agent.com
Subject: "Chapter 5: What is photosynthesis?"
Body: "Hi, I'm studying chapter 5. What is photosynthesis and why is it important?"

    ↓
AWS SES receives email
    ↓
Backend Lambda/Render webhook parses email
    ↓
Extract: 
  - From: user@gmail.com
  - Subject: Extract chapter number (Chapter 5)
  - Body: Extract question

    ↓
Verify user exists in Supabase by email
    ↓
If first time: Auto-create account with Supabase Auth
    ↓
Run RAG pipeline
    ↓
HTML email formatter creates response:

===========================================
Subject: Re: Chapter 5: What is photosynthesis?

Hi [Student Name],

Thanks for your question! Here's the answer:

**Question:** What is photosynthesis and why is it important?

**Answer:**
Photosynthesis is the process by which plants convert sunlight, water, and CO₂ into glucose and oxygen...
[full answer with citations]

**Sources:**
📚 Chapter 5, Section 1: Photosynthesis Overview - Confidence: 94%
📚 Chapter 5, Section 2: Role in Oxygen Production - Confidence: 89%
📚 Chapter 5, Section 3: Energy Importance - Confidence: 85%

**View Full Details:** [Link to Website]

Want to ask another question? Just reply to this email!

Best regards,
CBSE Study Agent 📚
===========================================

    ↓
AWS SES sends email via SMTP
    ↓
User receives answer in inbox
```

### 5.2 Email Reply (Follow-up Question)

```
User replies to email:
"Thanks! Can you explain the light-dependent reactions?"

    ↓
Backend detects email is reply to previous answer
    ↓
Links to original question via Message-ID headers
    ↓
Extracts follow-up question
    ↓
Runs RAG pipeline with parent context
    ↓
Sends reply email with new answer
```

---

## 6. Database Operations During Query

### 6.1 Supabase Tables Updated

When student asks a question:

**1. questions table** (INSERT)
```sql
INSERT INTO questions (user_id, question_text, chapter_id, answer_text, confidence_score, created_at)
VALUES (
  'user_123',
  'What is photosynthesis?',
  5,
  'Photosynthesis is the process...',
  0.89,
  '2026-04-17 10:30:45'
);
```

**2. search_log table** (INSERT) - for analytics
```sql
INSERT INTO search_log (user_id, question_id, query_time_ms, chunks_searched, model_used)
VALUES ('user_123', 'q_456', 2341, 5, 'mixtral-8x7b');
```

**3. user_activity table** (UPDATE)
```sql
UPDATE user_activity 
SET last_question_at = NOW(), 
    question_count = question_count + 1
WHERE user_id = 'user_123';
```

### 6.2 Vector Search Query

```sql
SELECT 
  id, 
  chapter, 
  section, 
  text,
  1 - (embedding <=> query_embedding) as similarity
FROM textbook_chunks
WHERE chapter = 5  -- Filter by chapter first (faster)
ORDER BY embedding <=> query_embedding  -- IVFFlat index used
LIMIT 5;
```

**What happens:**
1. Query embedding is passed (384-dim vector)
2. IVFFlat index divides 1M chunks into ~100 buckets
3. Finds closest bucket to query (fast, ~50ms)
4. Searches within bucket using exact cosine similarity
5. Returns top 5 with similarity scores
6. Total time: ~150-300ms

---

## 7. Real-Time WebSocket Updates

### 7.1 WebSocket Connection Flow

```
Frontend connects:
ws://render-backend.com/ws?token=jwt_token

    ↓
Backend authenticates token via Supabase
    ↓
Backend creates WebSocket connection
    ↓
Backend stores connection in active_connections[user_id]

User asks question via REST API
    ↓
Backend processes RAG
    ↓
While processing, Backend sends WebSocket updates:

1. {"type": "progress", "step": 1, "message": "Embedding question..."}
2. {"type": "progress", "step": 2, "message": "Searching 1M textbook chunks..."}
3. {"type": "progress", "step": 3, "message": "Generating answer with Groq..."}
4. {"type": "progress", "step": 4, "message": "Formatting response..."}
5. {"type": "complete", "answer": {...}, "sources": [...]}

    ↓
Frontend receives updates in real-time
    ↓
Updates progress bar: 25% → 50% → 75% → 100%
    ↓
Displays answer as complete
```

### 7.2 Multi-Tab Sync

If student has multiple browser tabs open:

```
Tab 1: Asks question → Backend processes
    ↓
Backend broadcasts to user_id via all active WebSocket connections
    ↓
Tab 1: Receives answer + displays
    ↓
Tab 2: Also receives answer + displays
    ↓
Both tabs stay in sync
```

---

## 8. Performance Timeline

From question to answer:

```
T+0ms:     User hits Enter
T+50ms:    Question transmitted to backend
T+100ms:   Supabase Auth token verified
T+150ms:   Question embedded via Groq (384 dims)
T+300ms:   Vector search in pgvector completes (IVFFlat index)
T+400ms:   Top 5 chunks retrieved from Supabase
T+500ms:   Context assembled (3000 tokens max)
T+1200ms:  Groq LLM generates answer (streaming)
T+2300ms:  Full answer received
T+2350ms:  WebSocket sends complete response
T+2400ms:  Frontend receives & displays answer
Total:     ~2.4 seconds from question to visible answer
```

---

## 9. Error Handling

### 9.1 Error Scenarios

**Scenario 1: No matching textbook chunks**
```
Vector search returns: []
    ↓
Backend LLM still tries to answer from general knowledge
    ↓
Response: "This topic isn't covered in the CBSE syllabus chunks provided. 
          However, general knowledge suggests..."
    ↓
Confidence: 0% (marked as "Not from textbook")
    ↓
UI warns user: "⚠️ Answer is not from official CBSE textbooks"
```

**Scenario 2: Groq API timeout**
```
LLM doesn't respond within 5 seconds
    ↓
Backend catches timeout exception
    ↓
Fallback: Return top 5 chunks without LLM summary
    ↓
Frontend shows: "Here are relevant textbook sections (summary unavailable)"
```

**Scenario 3: User not authenticated**
```
Request comes without JWT token
    ↓
Supabase Auth verification fails
    ↓
Backend returns: 401 Unauthorized
    ↓
Frontend redirects to login page
```

**Scenario 4: Duplicate question asked**
```
User asks: "What is photosynthesis?"
    ↓
Backend checks: SELECT * FROM questions WHERE user_id = X AND question_text = "What is photosynthesis?"
    ↓
If asked in last 24 hours: Return cached answer
    ↓
Save to database but show: "Here's your previous answer to this question (updated)"
```

---

## 10. Analytics & Tracking

### 10.1 Data Collected

```
Per Question:
├─ Question text
├─ Chapter & topic
├─ Timestamp
├─ Confidence score
├─ Response time (ms)
├─ Number of chunks searched
├─ User engagement (saved? shared? printed?)
└─ Follow-up questions

Per User:
├─ Login patterns
├─ Questions per day
├─ Favorite chapters
├─ Weak chapters (wrong practice answers)
├─ Session duration
├─ Device (web/Telegram/email)
└─ Exam performance (if available)
```

### 10.2 Dashboard Insights

Student can view:
```
📊 My Learning Dashboard

Questions Asked This Week: 12
├─ Chapter 5 (Photosynthesis): 5 questions
├─ Chapter 3 (Ecosystems): 4 questions
└─ Chapter 7 (Reproduction): 3 questions

Average Confidence Score: 87%
Weak Chapters (accuracy <70%): [Chapter 7] [Chapter 9]
Strong Chapters (accuracy >85%): [Chapter 3] [Chapter 5]

Time Spent: 3 hrs 45 mins this week

Practice Exam Performance: 8/10 (80%)
Recommended: Focus on Chapter 7 photosynthesis applications
```

---

## 11. Summary Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CBSE STUDY AGENT COMPLETE FLOW                  │
└─────────────────────────────────────────────────────────────────────┘

USER INPUT (3 channels)
├─ Web (React + Vite on Vercel)
├─ Telegram (Telegram Bot API)
└─ Email (AWS SES webhook)
         ↓
AUTHENTICATION
├─ Supabase Auth verifies token/creates session
└─ User profile loaded
         ↓
QUESTION PROCESSING
├─ Validate input (length, language, duplicates)
└─ Extract metadata (chapter, subject, difficulty)
         ↓
RAG PIPELINE
├─ Groq: Embed question → 384-dim vector
├─ Supabase: pgvector search top 5 chunks (IVFFlat index)
├─ Assembly: Build context from chunks
├─ Groq: LLM generates answer with citations
└─ Calculate: Confidence score from chunk similarities
         ↓
RESPONSE FORMATTING
├─ Add markdown formatting
├─ Highlight source citations
├─ Include confidence meter
└─ Generate related questions suggestions
         ↓
DELIVERY (3 channels)
├─ Web: WebSocket real-time streaming
├─ Telegram: Formatted message + buttons
└─ Email: HTML email with sources
         ↓
STORAGE & ANALYTICS
├─ Supabase: questions table (for history)
├─ Supabase: search_log table (for analytics)
├─ Supabase: user_activity table (for dashboard)
└─ Supabase: AI learns user patterns
         ↓
FOLLOW-UP
├─ Student can ask follow-up question
├─ Can save to notes
├─ Can see similar questions
└─ Can practice exam mode
```

This workflow ensures every student gets accurate, well-sourced answers in <2.5 seconds across any channel!

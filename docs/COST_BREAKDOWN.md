# CBSE Study Agent - Cost Breakdown

**Monthly Cost: $0/month**

## Services Used

| Service | Free Tier | Cost | Usage |
|---|---|---|---|
| **Supabase PostgreSQL** | 500 MB storage | $0/month | Student profiles, study materials, progress tracking |
| **Supabase Storage** | 500 MB included | $0/month | PDF textbooks, images, notes |
| **Supabase pgvector** | Included with PostgreSQL | $0/month | Vector embeddings for textbook chunks (RAG) |
| **Render** | 750 hrs/month | $0/month | FastAPI backend hosting (~50 hrs/month used) |
| **Vercel** | Unlimited | $0/month | React + Vite frontend hosting |
| **python-socketio** | Included with Render | $0/month | Real-time study updates |
| **Groq API** | Unlimited free | $0/month | LLM (explanations) + Embeddings (RAG vectors) |
| **Telegram Bot API** | Free | $0/month | Telegram bot for quick queries |
| **Supabase Auth** | Included with PostgreSQL | $0/month | Student login/signup (email verification, password reset, OAuth)

## Breakdown by Feature

### Study Content Delivery (RAG Pipeline)
- **LLM:** Groq API (generate explanations, summaries)
- **Embeddings:** Groq Embedding API (create vectors for semantic search)
- **Vector Storage:** Supabase pgvector (store textbook chunks with embeddings)
- **Similarity Search:** PostgreSQL pgvector indexing (find relevant chunks)
- **Storage:** Supabase Storage (textbook PDFs, concept images)
- **Database:** Supabase PostgreSQL (track which chapters covered)

### User Progress Tracking
- Database: Supabase PostgreSQL (quiz attempts, scores, weak topics)
- Real-time: python-socketio (sync progress across devices)

### Communication Channels
- Website: React on Vercel
- Telegram: Telegram Bot API
- In-app: python-socketio notifications

## RAG (Retrieval-Augmented Generation) Architecture
The system uses Supabase pgvector for semantic search:
1. Textbook chunks stored with 1536-dimensional embeddings
2. Student question → Groq generates embedding
3. Supabase similarity search finds top 5 relevant chunks
4. Groq LLM generates answer from those chunks
5. Citations show exact chapter/page source
6. **Result:** Accurate, hallucination-free answers sourced from textbooks

## Storage Needs
- Textbook PDFs: ~50-100 MB
- Student notes/uploads: ~50-100 MB
- Total: **~100-200 MB** (well under 500 MB limit)

## LLM Usage (Groq)
- Student concept queries: 50-200/day per agent
- Generate practice questions: 50-100/day
- Auto-summarize chapters: 20-50/day
- **Embedding generation** (for RAG): 50-100/day during ingestion, <5/day during runtime
- Total: **~200-450 requests/day** (well under Groq's free limits)

## Vector Database Usage (Supabase pgvector)
- Textbook chunks: ~50,000 chunks across 10 textbooks
- Average chunk size: 600 characters
- Total vectors storage: ~75 MB (well under 500 MB free tier)
- Similarity searches/day: ~100-200 (from student questions)
- Query response time: <1 second per search

## Scaling Notes
- Upgrade Supabase when > 500 MB data: $35/month
- Upgrade Render when > 1000 concurrent users: $7/month
- Groq stays free unless > 30 req/min consistently: ($5+/month)

**Total: $0/month forever** ✅

# CBSE Study Agent - AI Context Guide

## Project Overview
RAG-powered AI tutoring system helping CBSE students understand complex topics through intelligent concept search and AI-generated explanations.

## Architecture
- **Frontend**: React + Vite + Supabase Auth
- **Backend**: FastAPI (Python 3.12) on Render
- **Database**: Supabase PostgreSQL with pgvector
- **AI**: Groq LLM (Mixtral 8x7B) + Embeddings

## Key Features
1. **RAG Pipeline**: Query → Embedding → pgvector Search → LLM Answer
2. **Student Profiles**: Track weak/strong topics
3. **Practice Mode**: AI-generated quiz questions
4. **Multi-Device Sync**: WebSocket real-time updates
5. **Telegram Bot**: Mobile question asking

## Important Files
- `backend/app/services/supabase_service.py` - Vector DB operations
- `backend/app/services/groq_service.py` - LLM integration
- `docs/RAG_VECTOR_DB.md` - Complete RAG implementation guide
- `docs/WORKFLOW.md` - User journey documentation

## Database Schema
```sql
-- Core tables (see docs/SCAFFOLDING.md for details)
student_profiles(user_id, name, grade, subjects)
textbook_chunks(id, content, embedding vector(1536))
user_questions(id, user_id, question, response, chapter)
user_progress(user_id, weak_topics, strong_topics)
```

## Getting Started
```bash
# Backend
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

## Key Endpoints
- `POST /api/questions/ask` - Ask question with RAG
- `GET /api/student/profile` - Get progress
- `GET /api/questions/history` - Question history
- `WebSocket /ws` - Real-time sync

## Cost & Deployment
- **Cost**: $0/month (free tiers only)
- **Frontend**: Vercel (cbse-study.vercel.app)
- **Backend**: Render (cbse-api.onrender.com)
- **Database**: Supabase (500MB free)

## Next Steps
1. Setup Supabase project with pgvector extension
2. Implement RAG ingestion pipeline (textbook PDFs → embeddings)
3. Test question answering flow end-to-end
4. Setup Telegram bot webhook
5. Deploy to Vercel + Render

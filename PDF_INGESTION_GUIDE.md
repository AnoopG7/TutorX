# 📚 PDF Ingestion Guide — TutorX RAG Pipeline

## Overview

This guide explains how to ingest additional textbook PDFs into the TutorX RAG (Retrieval-Augmented Generation) system. The system automatically:
- **Extracts text** from PDFs using pdfplumber
- **Creates chunks** (~450 tokens each, with 50-token overlap)
- **Embeds chunks** using Ollama (nomic-embed-text, 768-dimensional vectors)
- **Stores in database** with metadata (Supabase PostgreSQL + pgvector)
- **Enables RAG** for semantic search and citation generation

---

## Current Status

✅ **Ingested: 702 chunks** from 32 Grade 9 CBSE PDFs
- **Science**: 360 chunks (51.3%)
- **Mathematics**: 239 chunks (34.0%)
- **Social Science**: 103 chunks (14.7%)

📊 **Average**: ~22 chunks per PDF

---

## Prerequisites

### 1. **Ollama Running Locally**
The system requires the local Ollama embedding service:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags | grep nomic-embed-text

# If not found, pull the model
ollama pull nomic-embed-text

# Start Ollama (if not already running)
ollama serve
```

✅ **Verify**: Should return 768-dimensional vectors

### 2. **Python Environment Configured**
```bash
cd /Users/anoop/Developer/Projects/Agents/cbse-study-agent/backend

# Activate virtual environment
source .venv/bin/activate

# Verify dependencies installed
pip list | grep -E "pdfplumber|supabase|ollama|llama-index"
```

### 3. **Supabase Credentials**
Ensure `.env` file has valid credentials:
```bash
cat backend/.env
# Should show:
# SUPABASE_URL=https://ylnnqlwbsenxkfcavrnz.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

---

## Quick Start: Ingest Single PDF

### Option 1: Ingest One PDF

```bash
cd /Users/anoop/Developer/Projects/Agents/cbse-study-agent/backend
source .venv/bin/activate

python -m scripts.ingest \
  --pdf ../Pdfs/9-Physics/9-Physics-1.pdf \
  --subject "Science" \
  --grade 9
```

**Parameters:**
- `--pdf`: Path to PDF file (relative or absolute)
- `--subject`: One of: `"Science"`, `"Mathematics"`, `"Social Science"`, `"English"`, etc.
- `--grade`: Integer (9, 10, 11, 12)
- `--dry-run` (optional): Preview chunks without uploading

**Output:**
```
2026-04-20 00:01:15,082 | INFO | Opening PDF: path/to/pdf
2026-04-20 00:01:16,123 | INFO | Extracted text from 14 pages
2026-04-20 00:01:16,125 | INFO | Created 28 chunks from PDF
2026-04-20 00:01:16,456 | INFO | Batch 1/4: uploaded 8 chunks (total: 8/28)
2026-04-20 00:01:17,234 | INFO | ✅ Done! Uploaded 28/28 chunks.
```

---

## Batch Ingestion: Multiple PDFs

### Option 2: Ingest All PDFs in a Folder

**Step 1: Organize PDFs by subject**
```
Pdfs/
├── 9-Science/
│   ├── 9-Science-1.pdf
│   ├── 9-Science-2.pdf
│   └── ... (up to 14 PDFs)
├── 9-Math/
│   ├── 9-Math-1.pdf
│   ├── 9-Math-2.pdf
│   └── ... (up to 14 PDFs)
└── 9-Economics/
    ├── 9-Economics-1.pdf
    └── ... (up to 5 PDFs)
```

**Step 2: Update batch script**

Edit `backend/scripts/batch_ingest.py`:

```python
# Line ~30-40: Update folder mapping
SUBJECT_MAP = {
    "9-Science":   "Science",
    "9-Math":      "Mathematics",
    "9-Economics": "Social Science",
    "9-English":   "English",           # ← Add new subjects
    "9-Physics":   "Science",
    # ... add more as needed
}
```

**Step 3: Run batch ingestion**

```bash
cd /Users/anoop/Developer/Projects/Agents/cbse-study-agent/backend
source .venv/bin/activate
python -m scripts.batch_ingest
```

**Output:**
```
============================================================
📚 Science (14 PDFs)
============================================================
[1/14] 9-Science-1.pdf... ✓
[2/14] 9-Science-2.pdf... ✓
... [continue through all PDFs]

============================================================
📊 SUMMARY
============================================================
Total:      42
Successful: 42 ✓
Failed:     0 ✗
Success rate: 100%
```

---

## Advanced: Custom Ingestion

### Ingest with Custom Metadata

**For special PDFs or custom chapters:**

```bash
# Edit backend/scripts/ingest.py and modify:
# - CHUNK_SIZE (default: 450 tokens)
# - CHUNK_OVERLAP (default: 50 tokens)
# - BATCH_SIZE (default: 8 chunks/request)

# Then run:
python -m scripts.ingest --pdf path/to/pdf --subject "Subject" --grade 9
```

### Test Before Full Ingestion

```bash
# Use --dry-run to preview chunks
python -m scripts.ingest \
  --pdf ../Pdfs/9-Science/new-textbook.pdf \
  --subject "Science" \
  --grade 9 \
  --dry-run

# Output shows:
# - Number of chunks
# - Sample chunk content
# - No database upload
```

---

## Verification & Quality Checks

### 1. **Verify Ingestion Success**

```bash
cd backend
source .venv/bin/activate

python3 << 'EOF'
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Check total chunks
resp = supabase.table("textbook_chunks").select("count", count="exact").execute()
print(f"✅ Total chunks: {resp.count}")

# Check by subject
for subject in ["Science", "Mathematics", "Social Science"]:
    resp = supabase.table("textbook_chunks").select("count", count="exact").eq("subject", subject).execute()
    print(f"   {subject}: {resp.count} chunks")

# Check for embeddings
resp = supabase.table("textbook_chunks").select("id, embedding").limit(1).execute()
if resp.data and resp.data[0]['embedding']:
    print(f"✅ Sample embedding dimension: {len(resp.data[0]['embedding'])}")
EOF
```

### 2. **Test RAG with New Content**

```bash
# Start backend
pkill -f "app.main"
cd backend && source .venv/bin/activate && python -m app.main &

# Wait 3 seconds, then test
sleep 3

# Query the new content
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "message": "Your question about the new textbook content",
    "subject": "Science"
  }' | jq '.citations'

# Should show citations from your newly ingested PDFs
```

### 3. **Mark Chunks as Verified**

After manual review in Supabase, mark chunks as production-ready:

```sql
-- In Supabase SQL Editor:
UPDATE textbook_chunks 
SET is_verified = TRUE 
WHERE subject = 'Science' AND grade = 9;
```

---

## Troubleshooting

### Issue: `is_verified=FALSE` Warning

**Cause**: Newly ingested chunks default to unverified
**Solution**: Manually review 10-20 sample chunks, then mark as verified:
```bash
cd backend && source .venv/bin/activate

python3 << 'EOF'
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Mark all as verified (after manual review)
supabase.table("textbook_chunks").update({"is_verified": True}).execute()
EOF
```

### Issue: "Embedding failed" Error

**Cause**: Ollama not running or model not available
**Solution**:
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# If not running:
ollama serve

# Ensure model available:
ollama pull nomic-embed-text
```

### Issue: "PDF extraction timeout"

**Cause**: Large PDFs take >60 seconds to parse
**Solution**: Edit `batch_ingest.py` line 30:
```python
TIMEOUT_PER_PDF = 600  # Increase from 300 to 600 seconds
```

### Issue: "Supabase connection failed"

**Cause**: Invalid .env credentials or network issue
**Solution**:
```bash
# Verify credentials
cat backend/.env

# Test connection
python3 << 'EOF'
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
print("✅ Connected to Supabase!")
EOF
```

---

## Performance Notes

| Metric | Value |
|--------|-------|
| Avg chunks per PDF | 20-30 |
| Embedding time per chunk | 50-100ms |
| Batch size | 8 chunks |
| Upload time per batch | 500-800ms |
| Total time per PDF | 5-15 seconds |
| Time for 32 PDFs | ~3-5 minutes |

**For 100+ PDFs**: Consider running batch ingestion in background during off-hours.

---

## File Structure Reference

```
backend/
├── scripts/
│   ├── ingest.py         ← Single PDF ingestion
│   ├── batch_ingest.py   ← Multiple PDF ingestion
│   └── seed_*.py         ← Data seeding scripts
├── app/
│   ├── rag/
│   │   ├── embedder.py   ← Ollama embedding service
│   │   └── retriever.py  ← Vector similarity search
│   ├── services/
│   │   └── supabase_service.py  ← DB client
│   └── api/
│       └── routes/
│           └── chat.py   ← Chat endpoint
└── .env                  ← Credentials
```

---

## Next Steps

1. **Add Grade 10 PDFs**: Use same scripts, update `--grade 10`
2. **Add Regional Languages**: Update subject names in `batch_ingest.py`
3. **Optimize Retrieval**: Adjust `TOP_K` and `MIN_SIMILARITY` in `retriever.py`
4. **Enable Caching**: Populate `qa_cache` table for frequently asked questions
5. **Monitor Performance**: Track retrieval latency and citation accuracy

---

## Support & Debugging

**View backend logs:**
```bash
tail -100 /tmp/backend.log
```

**View batch ingestion progress:**
```bash
ps aux | grep batch_ingest
```

**Query database directly:**
```bash
# In Supabase dashboard: SQL Editor
SELECT subject, COUNT(*) as chunks 
FROM textbook_chunks 
GROUP BY subject;
```

---

**Last Updated**: 2026-04-20  
**Status**: ✅ Production Ready  
**Total PDFs Ingested**: 32 | **Total Chunks**: 702

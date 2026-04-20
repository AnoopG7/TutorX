"""
NCERT Textbook Ingestion Script
================================
Run this to ingest a NCERT PDF into Supabase pgvector.

Usage:
  cd backend
  python -m scripts.ingest \
    --pdf "path/to/Science_Grade10.pdf" \
    --subject "Science" \
    --grade 10

Requirements:
  - Ollama running locally with nomic-embed-text pulled:
      ollama serve  (in a separate terminal)
      ollama pull nomic-embed-text
  - .env file with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import asyncio
import json
import re
import sys
import logging
from pathlib import Path
from dataclasses import dataclass

import pdfplumber
from supabase import create_client

# Add parent to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.rag.embedder import embed_batch, EMBED_DIM
from dotenv import load_dotenv
import os

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
CHUNK_SIZE    = 450   # Target tokens per chunk (≈ 1800 chars)
CHUNK_OVERLAP = 50    # Overlap tokens between chunks
BATCH_SIZE    = 8     # Embed this many chunks per Ollama call


# ── Data structures ──────────────────────────────────────────────────────────
@dataclass
class Chunk:
    chapter:        str
    section:        str
    subject:        str
    grade:          int
    content:        str
    chunk_index:    int
    page_reference: str


# ── PDF Parsing ──────────────────────────────────────────────────────────────
def extract_chunks(pdf_path: str, subject: str, grade: int) -> list[Chunk]:
    """
    Extract text from a NCERT PDF and split into overlapping chunks.
    Attempts to detect chapter/section headings from the text.
    """
    chunks    = []
    all_pages = []

    logger.info("Opening PDF: %s", pdf_path)
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text and text.strip():
                all_pages.append((page_num, text.strip()))

    logger.info("Extracted text from %d pages", len(all_pages))

    # Simple chapter/section detector
    chapter_pattern = re.compile(r"^(Chapter\s+\d+[:\s].+)$", re.MULTILINE | re.IGNORECASE)
    section_pattern = re.compile(r"^(\d+\.\d+\s+.+)$",        re.MULTILINE)

    current_chapter = "Introduction"
    current_section = ""
    chunk_idx       = 0

    for page_num, text in all_pages:
        # Update chapter/section from headings found in this page
        chap_match = chapter_pattern.search(text)
        if chap_match:
            current_chapter = chap_match.group(1).strip()
            current_section = ""

        sec_match = section_pattern.search(text)
        if sec_match:
            current_section = sec_match.group(1).strip()

        # Split page text into chunks of ~CHUNK_SIZE tokens (approx 4 chars/token)
        words     = text.split()
        token_est = len(words)   # rough token estimate
        step      = max(1, CHUNK_SIZE - CHUNK_OVERLAP)

        i = 0
        while i < len(words):
            chunk_words = words[i : i + CHUNK_SIZE]
            chunk_text  = " ".join(chunk_words).strip()

            if len(chunk_text) > 50:   # Skip very short fragments
                chunks.append(Chunk(
                    chapter        = current_chapter,
                    section        = current_section,
                    subject        = subject,
                    grade          = grade,
                    content        = chunk_text,
                    chunk_index    = chunk_idx,
                    page_reference = f"Page {page_num}",
                ))
                chunk_idx += 1

            i += step

    logger.info("Created %d chunks from PDF", len(chunks))
    return chunks


# ── Embedding + Upload ───────────────────────────────────────────────────────
async def embed_and_upload(chunks: list[Chunk], dry_run: bool = False) -> None:
    """Embed all chunks and insert into Supabase pgvector."""
    client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY"),  # Service role for admin write
    )

    total    = len(chunks)
    uploaded = 0

    logger.info("Embedding %d chunks in batches of %d...", total, BATCH_SIZE)

    for batch_start in range(0, total, BATCH_SIZE):
        batch  = chunks[batch_start : batch_start + BATCH_SIZE]
        texts  = [c.content for c in batch]

        try:
            embeddings = await embed_batch(texts)
        except Exception as e:
            logger.error("Embedding failed for batch %d: %s", batch_start, e)
            continue

        rows = []
        for chunk, embedding in zip(batch, embeddings):
            if len(embedding) != EMBED_DIM:
                logger.warning("Skipping chunk — wrong embedding dim: %d", len(embedding))
                continue
            rows.append({
                "chapter":        chunk.chapter,
                "section":        chunk.section,
                "subject":        chunk.subject,
                "grade":          chunk.grade,
                "content":        chunk.content,
                "embedding":      embedding,
                "chunk_index":    chunk.chunk_index,
                "page_reference": chunk.page_reference,
                "is_verified":    False,  # Manually set to true after review
            })

        if dry_run:
            logger.info("[DRY RUN] Would insert %d rows (batch %d)", len(rows), batch_start // BATCH_SIZE + 1)
        else:
            res = client.table("textbook_chunks").insert(rows).execute()
            uploaded += len(rows)
            logger.info(
                "Batch %d/%d: uploaded %d chunks (total: %d/%d)",
                batch_start // BATCH_SIZE + 1,
                (total + BATCH_SIZE - 1) // BATCH_SIZE,
                len(rows),
                uploaded,
                total,
            )

    if not dry_run:
        logger.info("✅ Done! Uploaded %d/%d chunks.", uploaded, total)
        logger.info(
            "⚠️  Chunks are marked is_verified=FALSE. "
            "Review them in Supabase and set is_verified=TRUE for production use."
        )


# ── CLI ──────────────────────────────────────────────────────────────────────
async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NCERT PDF into Supabase pgvector")
    parser.add_argument("--pdf",     required=True,           help="Path to NCERT PDF")
    parser.add_argument("--subject", required=True,           help="Subject name (e.g. 'Science')")
    parser.add_argument("--grade",   required=True, type=int, help="Grade: 9 or 10")
    parser.add_argument("--dry-run", action="store_true",     help="Parse and embed but don't upload")
    args = parser.parse_args()

    if args.grade not in (9, 10):
        print("Error: grade must be 9 or 10")
        sys.exit(1)

    if not Path(args.pdf).exists():
        print(f"Error: PDF not found at {args.pdf}")
        sys.exit(1)

    chunks = extract_chunks(args.pdf, args.subject, args.grade)

    if not chunks:
        print("Error: no text extracted from PDF. Check the file is not scanned/image-only.")
        sys.exit(1)

    print(f"\nExtracted {len(chunks)} chunks from {args.pdf}")
    print(f"Sample chunk:\n  Chapter: {chunks[0].chapter}\n  Content: {chunks[0].content[:150]}...\n")

    await embed_and_upload(chunks, dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())

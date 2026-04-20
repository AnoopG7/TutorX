#!/usr/bin/env python3
"""
TUTORX (CBSE Study Agent) — Database Seeding Script
Populates sample textbook chunks with Ollama nomic-embed-text embeddings (768-dim).

Usage:
  cd backend
  python -m scripts.seed_tutorx

Requirements:
  - Ollama running locally: ollama serve
  - nomic-embed-text pulled: ollama pull nomic-embed-text
  - .env with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
"""
import asyncio
import sys
from pathlib import Path

# Add parent to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import os
from supabase import create_client
from app.rag.embedder import embed_text, EMBED_DIM

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Sample textbook chunks for CBSE (Science Grade 10)
SAMPLE_CHUNKS = [
    {
        "chapter": "Chapter 1: Chemical Reactions and Equations",
        "section": "1.1 What is a Chemical Reaction?",
        "subject": "Science",
        "grade": 10,
        "content": "A chemical reaction is a process that leads to the transformation of one set of chemical substances to another. Classically, chemical reactions encompass changes that only involve the positions of electrons in the forming and breaking of chemical bonds between atoms.",
        "page_reference": "Page 2",
    },
    {
        "chapter": "Chapter 1: Chemical Reactions and Equations",
        "section": "1.2 Types of Chemical Reactions",
        "subject": "Science",
        "grade": 10,
        "content": "Chemical reactions can be classified into different types: combustion reactions, decomposition reactions, combination reactions, and displacement reactions. In a combustion reaction, a substance reacts with oxygen and releases energy in the form of heat and light.",
        "page_reference": "Page 4",
    },
    {
        "chapter": "Chapter 1: Chemical Reactions and Equations",
        "section": "1.3 Oxidation and Reduction",
        "subject": "Science",
        "grade": 10,
        "content": "Oxidation is the loss of electrons by a substance. Reduction is the gain of electrons by a substance. In any chemical reaction, if oxidation occurs, reduction must also occur. Such reactions are called redox reactions or oxidation-reduction reactions.",
        "page_reference": "Page 6",
    },
    {
        "chapter": "Chapter 2: Acids, Bases and Salts",
        "section": "2.1 Acids",
        "subject": "Science",
        "grade": 10,
        "content": "An acid is a substance that donates hydrogen ions (H+) when dissolved in water. Acids have a sour taste and turn blue litmus paper red. Common examples include hydrochloric acid (HCl), sulfuric acid (H2SO4), and acetic acid (CH3COOH).",
        "page_reference": "Page 20",
    },
    {
        "chapter": "Chapter 2: Acids, Bases and Salts",
        "section": "2.2 Bases",
        "subject": "Science",
        "grade": 10,
        "content": "A base is a substance that accepts hydrogen ions (H+) when dissolved in water. Bases have a bitter taste and turn red litmus paper blue. Common examples include sodium hydroxide (NaOH), potassium hydroxide (KOH), and ammonia (NH3).",
        "page_reference": "Page 22",
    },
]


async def get_embedding(text: str) -> list[float]:
    """Generate embedding using Ollama nomic-embed-text (768-dim)."""
    try:
        embedding = await embed_text(text)
        assert len(embedding) == EMBED_DIM, f"Expected {EMBED_DIM}-dim, got {len(embedding)}"
        return embedding
    except Exception as e:
        print(f"⚠️  Embedding failed: {e}")
        print("    Make sure Ollama is running: ollama serve")
        print("    And model is pulled: ollama pull nomic-embed-text")
        raise


async def seed_textbook_chunks():
    """Insert sample textbook chunks with embeddings."""
    print("🌱 Seeding TutorX textbook chunks...")

    for i, chunk in enumerate(SAMPLE_CHUNKS):
        print(f"  [{i + 1}/{len(SAMPLE_CHUNKS)}] Processing: {chunk['section']}")

        # Generate embedding with Ollama (768-dim)
        embedding_text = f"{chunk['section']} {chunk['content']}"
        embedding = await get_embedding(embedding_text)

        try:
            chunk_data = {
                **chunk,
                "chunk_index": i,
                "embedding": embedding,
                "is_verified": True,
                "quality_score": 0.95,
            }

            supabase.table("textbook_chunks").insert(chunk_data).execute()
            print(f"    ✓ Inserted: {chunk['section']}")
        except Exception as e:
            print(f"    ✗ Error: {e}")

    print(f"\n✅ Seeding complete! Inserted {len(SAMPLE_CHUNKS)} textbook chunks")


async def seed_practice_questions():
    """Insert sample practice questions."""
    print("\n🌱 Seeding practice questions...")

    questions = [
        {
            "chapter": "Chapter 1: Chemical Reactions and Equations",
            "subject": "Science",
            "grade": 10,
            "question_text": "Which of the following is a combination reaction?",
            "question_type": "multiple_choice",
            "options": [
                "C + O2 → CO2",
                "CuO + H2 → Cu + H2O",
                "Fe + CuSO4 → FeSO4 + Cu",
                "H2 + Cl2 → 2HCl",
            ],
            "correct_answer": "H2 + Cl2 → 2HCl",
            "explanation": (
                "A combination reaction is when two or more substances combine "
                "to form a single new substance."
            ),
            "difficulty_level": "medium",
        },
        {
            "chapter": "Chapter 2: Acids, Bases and Salts",
            "subject": "Science",
            "grade": 10,
            "question_text": "What is the pH of a neutral solution?",
            "question_type": "short_answer",
            "correct_answer": "7",
            "explanation": (
                "The pH scale ranges from 0 to 14. A pH of 7 is neutral, "
                "below 7 is acidic, and above 7 is basic."
            ),
            "difficulty_level": "easy",
        },
    ]

    for q in questions:
        try:
            supabase.table("practice_questions").insert(q).execute()
            print(f"  ✓ Inserted: {q['question_text'][:50]}...")
        except Exception as e:
            print(f"  ✗ Error: {e}")

    print(f"✅ Seeded {len(questions)} practice questions")


async def main():
    print("=" * 60)
    print("TUTORX Database Seeding Script")
    print(f"Embedding model: nomic-embed-text ({EMBED_DIM}-dim via Ollama)")
    print("=" * 60)

    await seed_textbook_chunks()
    await seed_practice_questions()

    print("\n" + "=" * 60)
    print("✅ Database seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

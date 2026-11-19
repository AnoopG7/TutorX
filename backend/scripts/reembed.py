"""
Re-embed every textbook passage with the configured embedding provider.

Use this after changing EMBEDDING_PROVIDER or FASTEMBED_MODEL, so stored
vectors and live query vectors come from exactly the same model. It reads
the passage text already in Supabase, so it doesn't need the PDFs. It runs
in GitHub Actions (.github/workflows/reembed.yml) so the model downloads on
GitHub's network, not yours.

    cd backend
    python -m scripts.reembed --dry-run     # embed 16 passages, write nothing
    python -m scripts.reembed               # re-embed and update all rows
"""
import argparse
import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.rag.embedder import EMBED_DIM, embed_batch, provider_name  # noqa: E402
from app.services.supabase_service import get_supabase_client, init_supabase  # noqa: E402

BATCH = 32
COLUMNS = "id, chapter, section, subject, grade, content, chunk_index, page_reference, is_verified"


def load_rows(db) -> list[dict]:
    rows, start = [], 0
    while True:
        page = db.table("textbook_chunks").select(COLUMNS).order("id").range(start, start + 999).execute().data
        rows += page
        if len(page) < 1000:
            return rows
        start += 1000


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="embed one batch and write nothing")
    args = ap.parse_args()

    settings = get_settings()
    model = settings.fastembed_model if provider_name() == "fastembed" else provider_name()
    print(f"provider: {provider_name()} | model: {model}")

    init_supabase()
    db = get_supabase_client()
    rows = load_rows(db)
    print(f"passages: {len(rows)}")
    if args.dry_run:
        rows = rows[:16]

    started, done = time.time(), 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        vectors = await embed_batch([r["content"] for r in batch])
        assert all(len(v) == EMBED_DIM for v in vectors)
        if not args.dry_run:
            db.table("textbook_chunks").upsert(
                [{**r, "embedding": v} for r, v in zip(batch, vectors)], on_conflict="id"
            ).execute()
        done += len(batch)
        print(f"  {done}/{len(rows)}  ({time.time() - started:.0f}s)", flush=True)

    print("dry run: nothing written" if args.dry_run else f"re-embedded {done} passages with {model}")


if __name__ == "__main__":
    asyncio.run(main())

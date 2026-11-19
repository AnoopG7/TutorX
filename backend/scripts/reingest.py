"""
Rebuild textbook_chunks from the NCERT PDFs with correct metadata.

Fixes in the original ingestion:
  - chapter titles: every chunk was "Introduction" (NCERT PDFs have no
    "Chapter N:" lines); now taken from the file name + the PDF's title
  - pages: were the page index inside each chapter file; now the printed
    book page number when it can be read reliably
  - Hindi: Kruti Dev text was stored as ASCII mojibake; now Unicode
  - is_verified: rows were inserted FALSE and the search RPC only returns
    TRUE rows, so retrieval always returned nothing

Safe to re-run: new rows are inserted first, and the previous rows are
deleted only after every file uploaded.

    cd backend && source .venv/bin/activate     # Ollama running with nomic-embed-text
    python -m scripts.reingest --dry-run        # print the chapter table, no writes
    python -m scripts.reingest                  # embed + replace
"""
import argparse
import asyncio
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.rag.embedder import EMBED_DIM, embed_batch  # noqa: E402
from app.services.supabase_service import get_supabase_client, init_supabase  # noqa: E402
from krutidev import krutidev_to_unicode, looks_like_krutidev  # noqa: E402
from ncert_pdf import extract_title, parse_filename  # noqa: E402

PDF_DIR = ROOT.parent / "Pdfs"
CHUNK_WORDS, OVERLAP_WORDS, BATCH = 300, 50, 16

# Titles the shadow-font extraction can't recover (it yields e.g. "RAVITATION"),
# checked against those fragments and the NCERT 2025-26 Class 9 books.
TITLE_OVERRIDES = {
    "9-Sci-1.pdf": "Matter in Our Surroundings",
    "9-Sci-2.pdf": "Is Matter Around Us Pure?",
    "9-Sci-3.pdf": "Atoms and Molecules",
    "9-Sci-4.pdf": "Structure of the Atom",
    "9-Sci-5.pdf": "The Fundamental Unit of Life",
    "9-Sci-6.pdf": "Tissues",
    "9-Sci-7.pdf": "Motion",
    "9-Sci-8.pdf": "Force and Laws of Motion",
    "9-Sci-9.pdf": "Gravitation",
    "9-Sci-10.pdf": "Work and Energy",
    "9-Sci-11.pdf": "Sound",
    "9-Sci-12.pdf": "Improvement in Food Resources",
    "9-Geography-1.pdf": "India – Size and Location",
    "9-Geography-2.pdf": "Physical Features of India",
    "9-Geography-3.pdf": "Drainage",
    "9-Geography-4.pdf": "Climate",
    "9-Geography-5.pdf": "Natural Vegetation and Wildlife",
    "9-Geography-6.pdf": "Population",
    "9-History-1.pdf": "The French Revolution",
    "9-History-2.pdf": "Socialism in Europe and the Russian Revolution",
    "9-History-3.pdf": "Nazism and the Rise of Hitler",
    "9-History-4.pdf": "Forest Society and Colonialism",
    "9-History-5.pdf": "Pastoralists in the Modern World",
    "9-Eng-Beehive-1.pdf": "The Fun They Had",
    "9-Eng-Beehive-4.pdf": "A Truly Beautiful Mind",
    "9-Eng-Beehive-7.pdf": "Reach for the Top",
    "9-Eng-Beehive-8.pdf": "Kathmandu",
    "9-Eng-Beehive-9.pdf": "If I Were You",
    "9-Eng-Moments-8.pdf": "A House Is Not a Home",
    "9-Hindi-Sparsh-1.pdf": "दुख का अधिकार",
    "9-Hindi-Sparsh-2.pdf": "एवरेस्ट: मेरी शिखर यात्रा",
    "9-Hindi-Sparsh-3.pdf": "तुम कब जाओगे, अतिथि",
    "9-Hindi-Sparsh-4.pdf": "वैज्ञानिक चेतना के वाहक: चंद्रशेखर वेंकट रामन",
    "9-Hindi-Sparsh-5.pdf": "शुक्रतारे के समान",
    "9-Hindi-Sparsh-6.pdf": "काव्य खंड: कविता का पठन-पाठन",
    # Poetry chapters open with the poet's name (रहीम, अरुण कमल, …); keep those, fixing two glitches.
    "9-Hindi-Sparsh-8.pdf": "रामधारी सिंह दिनकर",
    "9-Hindi-Sparsh-9.pdf": "हरिवंशराय बच्चन",
}

_SHADOW = re.compile(r"(\w)\1{3,}")
_REPRINT = re.compile(r"reprint\s+\d{4}", re.I)
_SECTION = re.compile(r"^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+([A-Z][^\n]{3,80})$")
_PAGE_PATTERNS = [
    re.compile(r"^(\d{1,3})\s*/\s*\S"),           # "18 / Beehive", "80/स्पर्श"
    re.compile(r"\S\s*/\s*(\d{1,3})$"),           # "गिल्लू/1"
    re.compile(r"^(\d{1,3})\s+[A-Z][A-Z ,&()-]{3,}$"),  # "2 SCIENCE"
    re.compile(r"^[A-Z][A-Z ,&()-]{3,}\s+(\d{1,3})$"),  # "MATHEMATICS 15"
    re.compile(r"^(\d{1,3})$"),
]


@dataclass
class Chunk:
    subject: str
    chapter: str
    section: str
    page: int | None
    content: str
    index: int


def _title_case(t: str) -> str:
    if t.isupper():
        small = {"and", "of", "the", "in", "to", "a", "an", "for", "on", "as"}
        words = t.lower().split()
        return " ".join(w if (i and w in small) else w[:1].upper() + w[1:] for i, w in enumerate(words))
    return t


def chapter_label(path: Path, pdf, meta: dict) -> str:
    title = TITLE_OVERRIDES.get(path.name)
    if not title:
        raw = extract_title(pdf)
        if meta["subject"] == "Hindi" and looks_like_krutidev(raw + " ks ks ks"):
            raw = krutidev_to_unicode(raw)
        # Maths titles start with a decorative "C"/"A" drop letter, e.g. "C POLYNOMIALS".
        if raw.isupper():
            raw = re.sub(r"^[CA]\s+", "", raw)
        title = _title_case(raw).strip()
    if meta["label"]:  # Answers / Appendix
        return meta["label"] if meta["label"] == "Answers" else f"{meta['label']}: {title}"
    return f"Chapter {meta['number']}: {title}"


def _page_candidates(lines: list[str]) -> list[int]:
    found = []
    for line in lines[:2] + lines[-2:]:
        for pat in _PAGE_PATTERNS:
            m = pat.search(line.strip())
            if m:
                found.append(int(m.group(1)))
                break
    return found


def printed_page_offset(pages_lines: list[list[str]]) -> int | None:
    """Printed page = file page index + offset. Vote across pages; trust only a clear majority."""
    votes = Counter()
    for i, lines in enumerate(pages_lines):
        for n in _page_candidates(lines):
            votes[n - i] += 1
    if not votes:
        return None
    offset, count = votes.most_common(1)[0]
    return offset if count >= max(2, len(pages_lines) // 3) else None


def clean_lines(text: str, hindi: bool) -> list[str]:
    if hindi and looks_like_krutidev(text):
        text = krutidev_to_unicode(text)
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line or _REPRINT.search(line) or _SHADOW.search(line):
            continue
        out.append(line)
    return out


def book_key(path: Path) -> tuple:
    """Files of the same book, in chapter order (back matter last)."""
    meta = parse_filename(path) or {}
    return (path.parent.name, meta.get("book", ""), meta.get("number") or 1000, path.name)


def fill_missing_offsets(files: list[Path], offsets: dict, page_counts: dict) -> None:
    """
    A chapter whose own page numbers can't be read sits between two chapters
    whose numbers can. If the gap fits its page count exactly, use it.
    """
    for i, f in enumerate(files):
        if offsets.get(f) is not None or i == 0:
            continue
        prev = files[i - 1]
        if book_key(prev)[:2] != book_key(f)[:2] or offsets.get(prev) is None:
            continue
        start = offsets[prev] + page_counts[prev]
        nxt = files[i + 1] if i + 1 < len(files) else None
        if nxt and book_key(nxt)[:2] == book_key(f)[:2] and offsets.get(nxt) is not None:
            if offsets[nxt] - start != page_counts[f]:
                continue  # doesn't fit: leave pages unknown rather than guess
        offsets[f] = start


def chunks_for(path: Path, offset: int | None = None) -> list[Chunk]:
    meta = parse_filename(path)
    if not meta or not meta["subject"]:
        print(f"  skip {path.name}: unrecognised file name")
        return []
    hindi = meta["subject"] == "Hindi"
    with pdfplumber.open(path) as pdf:
        chapter = chapter_label(path, pdf, meta)
        pages_lines = [clean_lines(p.extract_text() or "", hindi) for p in pdf.pages]

    chunks, section, idx = [], "", 0
    for i, lines in enumerate(pages_lines):
        page = (i + offset) if offset is not None and i + offset > 0 else None
        body = []
        for line in lines:
            m = _SECTION.match(line)
            if m and not hindi:
                section = f"{m.group(1)} {_title_case(m.group(2).strip())}"
            if page is not None and line.strip() in {str(page)} :
                continue
            body.append(line)
        words = " ".join(body).split()
        step = CHUNK_WORDS - OVERLAP_WORDS
        for start in range(0, max(len(words), 1), step):
            piece = " ".join(words[start:start + CHUNK_WORDS])
            if len(piece) >= 80:
                chunks.append(Chunk(meta["subject"], chapter, section, page, piece, idx))
                idx += 1
            if start + CHUNK_WORDS >= len(words):
                break
    return chunks


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="print what would be ingested; no embeddings, no writes")
    args = ap.parse_args()

    files = sorted(PDF_DIR.glob("*/*.pdf"), key=book_key)
    offsets, page_counts = {}, {}
    for f in files:
        meta = parse_filename(f)
        with pdfplumber.open(f) as pdf:
            hindi = bool(meta) and meta["subject"] == "Hindi"
            lines = [clean_lines(p.extract_text() or "", hindi) for p in pdf.pages]
        offsets[f], page_counts[f] = printed_page_offset(lines), len(lines)
    fill_missing_offsets(files, offsets, page_counts)

    all_chunks: list[Chunk] = []
    for f in files:
        cs = chunks_for(f, offsets[f])
        pages = sorted({c.page for c in cs if c.page})
        print(f"{f.name:26} {len(cs):3} chunks  pages {pages[0] if pages else '-'}–{pages[-1] if pages else '-'}  {cs[0].chapter if cs else ''}")
        all_chunks.extend(cs)
    print(f"\n{len(all_chunks)} chunks from {len(files)} files: {dict(Counter(c.subject for c in all_chunks))}")
    if args.dry_run:
        return

    init_supabase()
    db = get_supabase_client()
    old_ids = []
    page_from = 0
    while True:
        rows = db.table("textbook_chunks").select("id").range(page_from, page_from + 999).execute().data
        old_ids += [r["id"] for r in rows]
        if len(rows) < 1000:
            break
        page_from += 1000
    print(f"existing rows to replace: {len(old_ids)}")

    inserted = 0
    for b in range(0, len(all_chunks), BATCH):
        batch = all_chunks[b:b + BATCH]
        vectors = await embed_batch([c.content for c in batch])
        rows = [
            {
                "subject": c.subject, "grade": 9, "chapter": c.chapter, "section": c.section or None,
                "content": c.content, "embedding": v, "chunk_index": c.index,
                "page_reference": f"Page {c.page}" if c.page else None, "is_verified": True,
            }
            for c, v in zip(batch, vectors) if len(v) == EMBED_DIM
        ]
        db.table("textbook_chunks").insert(rows).execute()
        inserted += len(rows)
        print(f"\r  embedded + inserted {inserted}/{len(all_chunks)}", end="", flush=True)
    print()

    if inserted < len(all_chunks) * 0.98:
        print(f"Only {inserted}/{len(all_chunks)} inserted; keeping the old rows. Investigate before re-running.")
        return
    for b in range(0, len(old_ids), 200):
        db.table("textbook_chunks").delete().in_("id", old_ids[b:b + 200]).execute()
    print(f"deleted {len(old_ids)} old rows. textbook_chunks now has {inserted} rows.")


if __name__ == "__main__":
    asyncio.run(main())

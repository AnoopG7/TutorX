"""
Helpers for reading NCERT chapter PDFs (one chapter per file).

NCERT PDFs draw chapter titles with a shadow effect, so plain text
extraction repeats every letter ("MMMMM OOOOO…"). Titles are rebuilt from
the large-font characters on the first pages, de-duplicated by position.
Printed book page numbers sit on the page's first or last line
("2 SCIENCE", "MATHEMATICS 15"), and are used instead of the file's page index.
"""
import re
from pathlib import Path

FILE_RE = re.compile(r"^9-(?P<book>[A-Za-z]+)(?:-(?P<series>[A-Za-z]+?))?-(?P<num>\d+|Answers|Appendix\d)\.pdf$")

# Folder prefix → ingested subject name (must match app/utils/subjects.py)
SUBJECT_BY_BOOK = {
    "Sci": "Science",
    "Math": "Mathematics",
    "Eco": "Social Science",
    "Geography": "Social Science",
    "History": "Social Science",
    "PoliticalScience": "Social Science",
    "Eng": "English",
    "Hindi": "Hindi",
}

BOOK_LABEL = {
    "Eco": "Economics",
    "Geography": "Contemporary India (Geography)",
    "History": "India and the Contemporary World (History)",
    "PoliticalScience": "Democratic Politics (Political Science)",
}

_RUNNING_HEAD = re.compile(r"^\s*(\d{1,3})\s+[A-Z][A-Za-z ,()&-]{2,}$|^[A-Z][A-Za-z ,()&-]{2,}\s+(\d{1,3})\s*$")
_IGNORE_LINE = re.compile(r"reprint\s+\d{4}", re.I)


def parse_filename(path: Path) -> dict | None:
    """
    9-Sci-3.pdf → chapter 3; 9-Eng-Beehive-2.pdf → Beehive chapter 2;
    9-Math-Answers.pdf / 9-Math-Appendix1.pdf / iesc1an.pdf → back matter.
    """
    if path.name == "iesc1an.pdf":  # NCERT's code for the Class 9 Science answers
        return {"subject": "Science", "book": "Sci", "number": None, "label": "Answers"}
    m = FILE_RE.match(path.name)
    if not m:
        return None
    book, num = m.group("book"), m.group("num")
    info = {
        "subject": SUBJECT_BY_BOOK.get(book),
        "book": BOOK_LABEL.get(book) or m.group("series") or book,
        "number": int(num) if num.isdigit() else None,
        "label": None,
    }
    if num == "Answers":
        info["label"] = "Answers"
    elif num.startswith("Appendix"):
        info["label"] = f"Appendix {num[-1]}"
    return info


def _dedupe_chars(chars: list[dict]) -> str:
    seen, kept = set(), []
    for c in sorted(chars, key=lambda c: (round(c["top"]), c["x0"])):
        key = (round(c["x0"]), round(c["top"]), c["text"])
        if key in seen:
            continue
        # shadowed glyphs are offset by a fraction of a point
        if kept and kept[-1]["text"] == c["text"] and abs(kept[-1]["x0"] - c["x0"]) < 1.5 and abs(kept[-1]["top"] - c["top"]) < 1.5:
            continue
        seen.add(key)
        kept.append(c)

    lines: list[list[dict]] = []
    for c in kept:
        if lines and abs(lines[-1][-1]["top"] - c["top"]) < 4:
            lines[-1].append(c)
        else:
            lines.append([c])

    out = []
    for line in lines:
        line.sort(key=lambda c: c["x0"])
        text = ""
        for prev, c in zip([None] + line[:-1], line):
            if prev is not None and c["x0"] - prev["x1"] > c["size"] * 0.25:
                text += " "
            text += c["text"]
        out.append(text.strip())
    return " ".join(t for t in out if t)


def extract_title(pdf) -> str:
    """Largest-font text on the first page(s), excluding chapter numbers and the word 'Chapter'."""
    for page in pdf.pages[:2]:
        chars = [c for c in page.chars if c["text"].strip()]
        if not chars:
            continue
        sizes = sorted({round(c["size"], 1) for c in chars}, reverse=True)
        for size in sizes[:4]:
            big = [c for c in chars if round(c["size"], 1) == size]
            text = _dedupe_chars(big)
            text = re.sub(r"\b(c\s*hapter|unit|lesson)\b", "", text, flags=re.I)
            text = re.sub(r"^\W*\d+\W*|\W*\d+\W*$", "", text).strip(" :.-–")
            if len(re.sub(r"\W", "", text)) >= 3 and not text.isdigit():
                return re.sub(r"\s+", " ", text)
    return ""


def printed_page_number(text: str) -> int | None:
    """Find the book's printed page number on a page's first/last lines."""
    lines = [l for l in text.splitlines() if l.strip() and not _IGNORE_LINE.search(l)]
    for line in lines[-2:] + lines[:2]:
        m = _RUNNING_HEAD.match(line.strip())
        if m:
            return int(m.group(1) or m.group(2))
        if re.fullmatch(r"\s*\d{1,3}\s*", line):
            return int(line)
    return None

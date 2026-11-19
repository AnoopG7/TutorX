"""
Subject names.

`textbook_chunks.subject` is written by scripts/batch_ingest.py and used as an
exact-match filter during retrieval, so every subject coming from a client or
an old profile row must be normalised to one of these names first.
"""

CANONICAL_SUBJECTS = ("Science", "Mathematics", "Social Science", "English", "Hindi")

_ALIASES = {
    "social studies": "Social Science",
    "sst": "Social Science",
    "social science": "Social Science",
    "math": "Mathematics",
    "maths": "Mathematics",
    "mathematics": "Mathematics",
    "science": "Science",
    "english": "English",
    "hindi": "Hindi",
}


def normalize_subject(value: str | None) -> str | None:
    """Map aliases and casing to the ingested subject name. Unknown values pass through."""
    if not value or not value.strip():
        return None
    return _ALIASES.get(value.strip().lower(), value.strip())


def normalize_subjects(values: list[str] | None) -> list[str]:
    """Normalise and de-duplicate a list of subjects, keeping order."""
    out: list[str] = []
    for v in values or []:
        n = normalize_subject(v)
        if n and n not in out:
            out.append(n)
    return out

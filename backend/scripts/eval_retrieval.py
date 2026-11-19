"""
Retrieval evaluation: does search find the right NCERT chapter?

Each case is a student-style question and the chapter that answers it.
Reports hit@1 and hit@5 (the right chapter is the top result / in the top 5),
overall and per subject. Read-only: it only runs searches.

    cd backend && source .venv/bin/activate     # same embedding provider as production
    python -m scripts.eval_retrieval
    python -m scripts.eval_retrieval --no-filter   # search all subjects at once
    python -m scripts.eval_retrieval --exact       # exact cosine search in Python (ignores the DB index)
"""
import argparse
import asyncio
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rag import retriever  # noqa: E402
from app.rag.embedder import embed_text  # noqa: E402
from app.services.supabase_service import get_supabase_client, init_supabase  # noqa: E402

# (subject, question, substring of the expected chapter label)
CASES = [
    ("Science", "Why is the cell called the basic unit of life?", "Fundamental Unit of Life"),
    ("Science", "What is the difference between evaporation and boiling?", "Matter in Our Surroundings"),
    ("Science", "How do I separate a mixture of salt and sand?", "Is Matter Around Us Pure"),
    ("Science", "What is the law of conservation of mass?", "Atoms and Molecules"),
    ("Science", "Explain Rutherford's alpha particle scattering experiment", "Structure of the Atom"),
    ("Science", "What are the types of connective tissue?", "Tissues"),
    ("Science", "What is the difference between distance and displacement?", "Motion"),
    ("Science", "State Newton's third law of motion with an example", "Force and Laws of Motion"),
    ("Science", "Why does an object weigh less on the moon?", "Gravitation"),
    ("Science", "What is kinetic energy and how is it calculated?", "Work and Energy"),
    ("Science", "How does an echo work?", "Sound"),
    ("Science", "What is intercropping and why do farmers use it?", "Improvement in Food Resources"),
    ("Mathematics", "Prove that root 2 is irrational", "Number Systems"),
    ("Mathematics", "What is the remainder theorem?", "Polynomials"),
    ("Mathematics", "How do I plot a point on the Cartesian plane?", "Coordinate Geometry"),
    ("Mathematics", "How many solutions does a linear equation in two variables have?", "Linear Equations"),
    ("Mathematics", "What are Euclid's axioms and postulates?", "Euclid"),
    ("Mathematics", "If two lines intersect, are the vertically opposite angles equal?", "Lines and Angles"),
    ("Mathematics", "What is the SAS congruence rule?", "Triangles"),
    ("Mathematics", "Properties of a parallelogram's diagonals", "Quadrilaterals"),
    ("Mathematics", "Equal chords of a circle are equidistant from the centre", "Circles"),
    ("Mathematics", "Find the area of a triangle when all three sides are given", "Heron"),
    ("Mathematics", "Volume of a cone and a sphere", "Surface Areas and Volumes"),
    ("Mathematics", "How do I draw a histogram from grouped data?", "Statistics"),
    ("Social Science", "What were the causes of the French Revolution?", "French Revolution"),
    ("Social Science", "Who were the Bolsheviks and what did Lenin want?", "Russian Revolution"),
    ("Social Science", "How did Hitler come to power in Germany?", "Nazism"),
    ("Social Science", "How did colonial rule change forests in India?", "Forest Society"),
    ("Social Science", "How do pastoral nomads like the Maasai move with their herds?", "Pastoralists"),
    ("Social Science", "What are the latitudinal and longitudinal extents of India?", "Size and Location"),
    ("Social Science", "What are the major physiographic divisions of India?", "Physical Features"),
    ("Social Science", "Which rivers belong to the Himalayan river system?", "Drainage"),
    ("Social Science", "What causes the monsoon in India?", "Climate"),
    ("Social Science", "What are the different types of forests in India?", "Natural Vegetation"),
    ("Social Science", "What is the sex ratio and why does it matter?", "Population"),
    ("Social Science", "What are the factors of production in Palampur?", "Village Palampur"),
    ("Social Science", "How does education make people a resource?", "People as Resource"),
    ("Social Science", "How is the poverty line estimated in India?", "Poverty"),
    ("Social Science", "What is the public distribution system and buffer stock?", "Food Security"),
    ("Social Science", "Why is democracy a better form of government?", "What is Democracy"),
    ("Social Science", "How was the Indian Constitution made?", "Constitutional Design"),
    ("Social Science", "What does the Election Commission do?", "Electoral Politics"),
    ("Social Science", "What is the role of the Prime Minister and the Parliament?", "Working of Institutions"),
    ("Social Science", "What fundamental rights does the Constitution give us?", "Democratic Rights"),
    ("English", "Summarise The Fun They Had", "Fun They Had"),
    ("English", "How did Evelyn Glennie overcome her deafness?", "Sound of Music"),
    ("English", "Why was Kezia afraid of her father?", "Little Girl"),
    ("English", "What happened when the snake coiled around the doctor's arm?", "Snake and the Mirror"),
    ("English", "Describe A.P.J. Abdul Kalam's childhood in Rameswaram", "My Childhood"),
    ("English", "What did Vikram Seth see at Pashupatinath temple?", "Kathmandu"),
    ("English", "Why did the child get lost at the fair?", "Lost Child"),
    ("English", "What mischief did Toto the monkey do?", "Toto"),
    ("English", "Why did the Happy Prince give away his jewels?", "Happy Prince"),
    ("English", "How did Prashant help the people of Ersama after the cyclone?", "Ersama"),
    ("Hindi", "गिल्लू कौन था और महादेवी वर्मा से उसका क्या संबंध था?", "गिल्लू"),
    ("Hindi", "बचेंद्री पाल ने एवरेस्ट की चढ़ाई कैसे की?", "एवरेस्ट"),
    ("Hindi", "लेखक अतिथि से कब जाने को कहता है?", "अतिथि"),
    ("Hindi", "चंद्रशेखर वेंकट रामन ने कौन सी खोज की थी?", "रामन"),
]


def _unit(v):
    v = json.loads(v) if isinstance(v, str) else v
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def _load_all():
    db, rows, start = get_supabase_client(), [], 0
    while True:
        batch = db.table("textbook_chunks").select("subject, chapter, embedding").range(start, start + 999).execute().data
        rows += [{"subject": r["subject"], "chapter": r["chapter"], "v": _unit(r["embedding"])} for r in batch]
        if len(batch) < 1000:
            return rows
        start += 1000


async def _exact_top5(rows, question, subject):
    q = _unit(await embed_text(question))
    scored = sorted(
        ((sum(a * b for a, b in zip(q, r["v"])), r["chapter"]) for r in rows if subject is None or r["subject"] == subject),
        reverse=True,
    )
    return [ch for _, ch in scored[:5]]


async def run(filter_subject: bool, exact: bool) -> None:
    init_supabase()
    rows = _load_all() if exact else None
    hits1, hits5, per = 0, 0, defaultdict(lambda: [0, 0, 0])
    misses = []
    for subject, question, expected in CASES:
        subj = subject if filter_subject else None
        if exact:
            chapters = await _exact_top5(rows, question, subj)
        else:
            chapters = [c.chapter for c in await retriever._retrieve_chunks_internal(question, subj, None, 5)]
        h1 = bool(chapters) and expected in chapters[0]
        h5 = any(expected in ch for ch in chapters)
        hits1 += h1
        hits5 += h5
        per[subject][0] += 1
        per[subject][1] += h1
        per[subject][2] += h5
        if not h5:
            misses.append((question, expected, chapters[:2]))

    n = len(CASES)
    print(f"{'subject':16} {'cases':>5} {'hit@1':>7} {'hit@5':>7}")
    for subject, (total, a, b) in per.items():
        print(f"{subject:16} {total:5} {a / total:7.0%} {b / total:7.0%}")
    print(f"{'overall':16} {n:5} {hits1 / n:7.0%} {hits5 / n:7.0%}")
    if misses:
        print("\nmisses:")
        for q, exp, got in misses:
            print(f"  {q[:60]!r}: expected {exp!r}, got {[g[:40] for g in got] or 'nothing'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-filter", action="store_true", help="don't filter by subject")
    ap.add_argument("--exact", action="store_true", help="exact cosine search in Python instead of the DB index")
    args = ap.parse_args()
    print("mode:", "exact search" if args.exact else "database index (RPC)", "| subject filter:", not args.no_filter)
    asyncio.run(run(filter_subject=not args.no_filter, exact=args.exact))

"""
Chunk Enrichment (Strategy 3)

Takes the best-matching chunk and enriches it with:
1. Concrete, relatable examples
2. Common misconceptions students have
3. Real-world connections or related concepts

This makes textbook excerpts more engaging and understandable for students.
Only enriches the TOP chunk (cost: ~50ms) to save tokens.
"""
import logging
from dataclasses import dataclass

from app.services.groq_service import get_groq_client, get_groq_model

logger = logging.getLogger(__name__)

ENRICHMENT_PROMPT = """You are a Grade {grade} {subject} tutor. A student asked about: "{query}"

Here's a textbook excerpt that answers it:

{chunk_content}

Enhance this excerpt by adding (keep it Grade {grade} level, under 250 words):

1. ONE concrete, relatable example (something students see daily)
2. ONE common misconception students have
3. ONE connection to real life OR other concepts

Format:
[Original content]

**Example:** [Your concrete example]
**Common Misconception:** [Myth students believe]
**Connection:** [How it relates to real life or other concepts]

DO NOT change the original content. Just add these 3 things after it."""


@dataclass
class EnrichedChunk:
    """Chunk with enrichment metadata."""

    original_content: str
    enriched_content: str
    example: str
    misconception: str
    connection: str
    was_enriched: bool = True


async def enrich_chunk(
    chunk_content: str,
    query: str,
    subject: str = "Science",
    grade: int = 9,
) -> EnrichedChunk:
    """
    Enrich a single chunk with examples, misconceptions, and connections.

    Args:
        chunk_content: The textbook chunk to enrich
        query: The student's original query (for context)
        subject: Subject area
        grade: Grade level

    Returns:
        EnrichedChunk with original + enriched content
    """
    try:
        client = get_groq_client()
        model = get_groq_model()

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a {grade} grade {subject} teacher. "
                        "Make concepts clear and relatable."
                    ),
                },
                {
                    "role": "user",
                    "content": ENRICHMENT_PROMPT.format(
                        grade=grade,
                        subject=subject,
                        query=query,
                        chunk_content=chunk_content,
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=300,
        )

        enriched_text = response.choices[0].message.content.strip()

        # Parse the enrichment (simple extraction)
        example = ""
        misconception = ""
        connection = ""

        for line in enriched_text.split("\n"):
            if "**Example:**" in line:
                example = line.replace("**Example:**", "").strip()
            elif "**Common Misconception:**" in line:
                misconception = line.replace("**Common Misconception:**", "").strip()
            elif "**Connection:**" in line:
                connection = line.replace("**Connection:**", "").strip()

        logger.info("Enriched chunk with example, misconception, and connection")

        return EnrichedChunk(
            original_content=chunk_content,
            enriched_content=enriched_text,
            example=example,
            misconception=misconception,
            connection=connection,
            was_enriched=True,
        )

    except Exception as e:
        logger.warning("Chunk enrichment failed: %s", e)
        return EnrichedChunk(
            original_content=chunk_content,
            enriched_content=chunk_content,
            example="",
            misconception="",
            connection="",
            was_enriched=False,
        )


def should_enrich_chunks(chunks_count: int, avg_similarity: float) -> bool:
    """
    Decide if we should enrich chunks.

    Enrich if:
    - We have at least 1 chunk
    - Similarity is decent (> 0.50)

    This adds educational value without wasting tokens on bad matches.
    """
    if chunks_count == 0:
        return False

    if avg_similarity < 0.50:
        return False  # Don't enrich low-quality matches

    return True

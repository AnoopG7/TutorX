"""
LLM-based Query Reformulation (Strategy 2)

Uses Groq to intelligently reformulate user queries into multiple search variants.
Much better than manual synonyms — understands intent and generates contextually relevant alternatives.

Example:
  Input: "Why do plants look green?"
  Output: [
    "Why do plants look green?",
    "chlorophyll color light absorption",
    "photosynthesis light spectrum wavelength",
    "green pigment plants leaves",
  ]
"""
import logging
from typing import List

from app.services.groq_service import get_groq_client, get_groq_model

logger = logging.getLogger(__name__)

REFORMULATION_PROMPT = """Given a student's question about CBSE curriculum, generate 4 alternative ways to search for the same information.

These should be:
1. Different keyword combinations
2. Semantic variations
3. Related concept phrasings
4. Technical term variants

Return ONLY the search phrases, one per line, no numbering or explanation.
Make them short (3-8 words each) and focused on key concepts.

Question: {query}

Alternative search phrases:"""


async def reformulate_query(query: str, subject: str = "Science", grade: int = 9) -> List[str]:
    """
    Use Groq to generate alternative query formulations.

    Args:
        query: Original student query
        subject: Subject area for context
        grade: Grade level for context

    Returns:
        List of reformulated queries including original
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
                        f"You are a CBSE curriculum expert for Grade {grade} "
                        f"{subject}. Generate concise search phrases."
                    ),
                },
                {
                    "role": "user",
                    "content": REFORMULATION_PROMPT.format(query=query),
                },
            ],
            temperature=0.5,
            max_tokens=150,
        )

        response_text = response.choices[0].message.content.strip()
        reformulated = [line.strip() for line in response_text.split("\n") if line.strip()]

        # Always include original as first
        result = [query] + reformulated[:4]

        logger.info("Reformulated '%s' into %d variants", query[:50], len(result))
        return result[:5]

    except Exception as e:
        logger.warning("Query reformulation failed: %s", e)
        return [query]  # Fallback to original


def should_reformulate(chunks_found: int, similarity_scores: List[float]) -> bool:
    """
    Decide if we should try reformulating the query.

    Returns True if:
    - Few chunks found (< 3)
    - Low average similarity (< 0.60)

    This prevents unnecessary reformulations when we already have good results.
    """
    if chunks_found < 3:
        return True

    if chunks_found > 0 and similarity_scores:
        avg_similarity = sum(similarity_scores) / len(similarity_scores)
        if avg_similarity < 0.60:
            logger.info("Low similarity (%.3f), will reformulate", avg_similarity)
            return True

    return False

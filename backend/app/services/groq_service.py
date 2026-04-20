"""
Groq Service — singleton wrapper for LLM calls.

Uses the model from settings (defaults to llama-3.3-70b-versatile).
Does NOT provide embeddings — use Ollama nomic-embed-text for that.
"""
import logging
import json
from groq import Groq
from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Groq | None = None


def get_groq_client() -> Groq:
    """Return a cached Groq client singleton."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY must be set in .env")
        _client = Groq(api_key=settings.groq_api_key)
        logger.info("Groq client initialised")
    return _client


def get_groq_model() -> str:
    """Return the configured model name from settings."""
    return get_settings().groq_model


def generate_answer(question: str, context: str) -> str:
    """Generate a RAG-powered answer using Groq LLM."""
    try:
        client = get_groq_client()
        model = get_groq_model()

        system_prompt = (
            "You are an expert CBSE tutor. Answer the student's question using "
            "the provided textbook context. Be clear, concise, and educational."
        )
        user_message = (
            f"Context from textbook:\n{context}\n\n"
            f"Student Question:\n{question}\n\n"
            "Please provide a comprehensive answer:"
        )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content

    except Exception as e:
        logger.error("Error generating answer: %s", e)
        return "I encountered an error processing your question. Please try again."


def generate_quiz_question(chapter: str, topic: str) -> dict:
    """Generate a quiz question for a given chapter/topic."""
    try:
        client = get_groq_client()
        model = get_groq_model()

        prompt = (
            f"Generate a CBSE-level multiple choice question about {topic} "
            f"from {chapter}.\n"
            "Format your response as JSON with keys: question, options "
            "(array of 4), correct_answer (index 0-3), explanation"
        )

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=512,
        )

        response_text = response.choices[0].message.content
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            return json.loads(response_text[json_start:json_end])
        return {"error": "Could not parse response"}

    except Exception as e:
        logger.error("Error generating quiz: %s", e)
        return {"error": str(e)}


# Backwards-compatible alias
def get_groq_service():
    """Deprecated — use get_groq_client() instead."""
    return get_groq_client()

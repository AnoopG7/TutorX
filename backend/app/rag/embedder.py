"""
Embedder — produces 768-dim nomic-embed-text vectors for retrieval.

The textbook chunks were ingested with Ollama's `nomic-embed-text` (v1.5).
Query vectors must come from the same model, so pick a provider that serves it:

  EMBEDDING_PROVIDER=ollama  (default)  OLLAMA_BASE_URL, e.g. http://localhost:11434
  EMBEDDING_PROVIDER=nomic              NOMIC_API_KEY, Nomic's hosted nomic-embed-text-v1.5

On Render there is no local Ollama, so production needs `nomic` (or an
OLLAMA_BASE_URL pointing at a hosted Ollama). Without one, every search fails
and answers fall back to the LLM's general knowledge.
"""
from functools import lru_cache

import httpx

from app.config import get_settings

EMBED_MODEL = "nomic-embed-text"
NOMIC_MODEL = "nomic-embed-text-v1.5"
EMBED_DIM = 768
NOMIC_URL = "https://api-atlas.nomic.ai/v1/embedding/text"


class EmbeddingUnavailable(RuntimeError):
    """The configured embedding service couldn't be reached or misbehaved."""


@lru_cache(maxsize=1)
def _ollama():
    from llama_index.embeddings.ollama import OllamaEmbedding

    return OllamaEmbedding(
        model_name=EMBED_MODEL,
        base_url=get_settings().ollama_base_url,
        embed_batch_size=10,
    )


def _check(vectors: list[list[float]]) -> list[list[float]]:
    for v in vectors:
        if len(v) != EMBED_DIM:
            raise EmbeddingUnavailable(f"Expected {EMBED_DIM}-dim embeddings, got {len(v)}.")
    return vectors


async def _nomic(texts: list[str], task_type: str) -> list[list[float]]:
    key = get_settings().nomic_api_key
    if not key:
        raise EmbeddingUnavailable("EMBEDDING_PROVIDER=nomic but NOMIC_API_KEY is not set.")
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            NOMIC_URL,
            headers={"Authorization": f"Bearer {key}"},
            json={"model": NOMIC_MODEL, "texts": texts, "task_type": task_type, "dimensionality": EMBED_DIM},
        )
    if res.status_code != 200:
        raise EmbeddingUnavailable(f"Nomic API returned {res.status_code}: {res.text[:200]}")
    return _check(res.json()["embeddings"])


async def embed_text(text: str) -> list[float]:
    """Embed one search query."""
    provider = get_settings().embedding_provider.lower()
    if provider == "nomic":
        return (await _nomic([text], "search_query"))[0]
    try:
        return _check([_ollama().get_text_embedding(text)])[0]
    except EmbeddingUnavailable:
        raise
    except Exception as e:
        raise EmbeddingUnavailable(f"Ollama at {get_settings().ollama_base_url} is unreachable: {e}") from e


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed document passages (used by ingestion)."""
    provider = get_settings().embedding_provider.lower()
    if provider == "nomic":
        return await _nomic(texts, "search_document")
    return _check(_ollama().get_text_embedding_batch(texts))

"""
Embedder — 768-dim nomic-embed-text-v1.5 vectors for retrieval.

Stored passages and live queries must come from the same model, so the
provider used to embed the textbook (scripts/reembed.py, scripts/reingest.py)
must match the one the API uses.

  EMBEDDING_PROVIDER=fastembed  (default)  runs the model in-process with FastEmbed
                                          (ONNX, CPU, no API key). FASTEMBED_MODEL picks
                                          the variant; the quantized one (~130 MB) fits
                                          Render's free 512 MB instance.
  EMBEDDING_PROVIDER=ollama               local Ollama (OLLAMA_BASE_URL), for development
  EMBEDDING_PROVIDER=nomic                Nomic's hosted API (NOMIC_API_KEY)
"""
import asyncio
import logging
import threading
from functools import lru_cache

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

EMBED_MODEL = "nomic-embed-text"
NOMIC_MODEL = "nomic-embed-text-v1.5"
EMBED_DIM = 768
NOMIC_URL = "https://api-atlas.nomic.ai/v1/embedding/text"

# nomic-embed-text is trained with task prefixes. Nomic's API adds them from
# task_type; for FastEmbed and Ollama we add them ourselves.
QUERY_PREFIX = "search_query: "
DOCUMENT_PREFIX = "search_document: "


class EmbeddingUnavailable(RuntimeError):
    """The configured embedding service couldn't be reached or misbehaved."""


def provider_name() -> str:
    return get_settings().embedding_provider.lower()


def _check(vectors: list[list[float]]) -> list[list[float]]:
    for v in vectors:
        if len(v) != EMBED_DIM:
            raise EmbeddingUnavailable(f"Expected {EMBED_DIM}-dim embeddings, got {len(v)}.")
    return vectors


# ── FastEmbed (in-process) ──────────────────────────────────────────────────
_fastembed_lock = threading.Lock()


@lru_cache(maxsize=1)
def _fastembed():
    """Load once; the first call downloads the model into FASTEMBED_CACHE_DIR."""
    from fastembed import TextEmbedding

    settings = get_settings()
    logger.info("Loading FastEmbed model %s", settings.fastembed_model)
    return TextEmbedding(settings.fastembed_model, cache_dir=settings.fastembed_cache_dir, threads=1)


def _fastembed_sync(texts: list[str]) -> list[list[float]]:
    with _fastembed_lock:  # ONNX session isn't shared across threads safely on tiny instances
        model = _fastembed()
        return _check([v.tolist() for v in model.embed(texts, batch_size=16)])


def warm_up() -> None:
    """Load the model ahead of the first question (called in a background thread at startup)."""
    if provider_name() != "fastembed":
        return
    try:
        _fastembed_sync([QUERY_PREFIX + "warm up"])
        logger.info("FastEmbed model ready")
    except Exception as e:  # never block startup
        logger.error("FastEmbed warm-up failed: %s", e)


# ── Ollama (local development) ──────────────────────────────────────────────
@lru_cache(maxsize=1)
def _ollama():
    from llama_index.embeddings.ollama import OllamaEmbedding

    return OllamaEmbedding(model_name=EMBED_MODEL, base_url=get_settings().ollama_base_url, embed_batch_size=10)


# ── Nomic API ───────────────────────────────────────────────────────────────
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


# ── Public API ──────────────────────────────────────────────────────────────
async def _embed(texts: list[str], document: bool) -> list[list[float]]:
    provider = provider_name()
    prefix = DOCUMENT_PREFIX if document else QUERY_PREFIX
    try:
        if provider == "fastembed":
            return await asyncio.to_thread(_fastembed_sync, [prefix + t for t in texts])
        if provider == "nomic":
            return await _nomic(texts, "search_document" if document else "search_query")
        if provider == "ollama":
            model = _ollama()
            prefixed = [prefix + t for t in texts]
            vectors = model.get_text_embedding_batch(prefixed) if document else [model.get_text_embedding(prefixed[0])]
            return _check(vectors)
    except EmbeddingUnavailable:
        raise
    except Exception as e:
        raise EmbeddingUnavailable(f"{provider} embeddings failed: {e}") from e
    raise EmbeddingUnavailable(f"Unknown EMBEDDING_PROVIDER {provider!r}")


async def embed_text(text: str) -> list[float]:
    """Embed one search query."""
    return (await _embed([text], document=False))[0]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed textbook passages (ingestion and re-embedding)."""
    return await _embed(texts, document=True)

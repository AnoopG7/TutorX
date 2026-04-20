"""
Embedder — wraps Ollama nomic-embed-text (768-dim).
Run `ollama pull nomic-embed-text` once before using this.
"""
from llama_index.embeddings.ollama import OllamaEmbedding
from functools import lru_cache

EMBED_MODEL = "nomic-embed-text"
EMBED_DIM   = 768


@lru_cache(maxsize=1)
def get_embedder() -> OllamaEmbedding:
    """Singleton embedder — connects to local Ollama instance."""
    return OllamaEmbedding(
        model_name=EMBED_MODEL,
        base_url="http://localhost:11434",
        embed_batch_size=10,
    )


async def embed_text(text: str) -> list[float]:
    """Embed a single string. Returns 768-dim vector."""
    embedder = get_embedder()
    result = embedder.get_text_embedding(text)
    if len(result) != EMBED_DIM:
        raise ValueError(
            f"Expected {EMBED_DIM}-dim embedding, got {len(result)}. "
            f"Is nomic-embed-text pulled? Run: ollama pull nomic-embed-text"
        )
    return result


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple strings at once for efficiency."""
    embedder = get_embedder()
    return embedder.get_text_embedding_batch(texts)

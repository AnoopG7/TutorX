"""
Retriever — pgvector similarity search via Supabase RPC.
Returns top-k textbook chunks with metadata for agent context.

Graceful fallback chain:
  1. Try RPC `match_textbook_chunks` (fast, server-side pgvector)
  2. Fall back to local cosine similarity if RPC doesn't exist
  3. Return empty list if Ollama or DB is down

Enhancement strategies:
  - Strategy 2: LLM Query Reformulation (if initial results are low-quality)
  - Strategy 3: Chunk Enrichment (for best matching chunk)
"""
from dataclasses import dataclass
import logging
import time
import json
import math

logger = logging.getLogger(__name__)

TOP_K          = 5
MIN_SIMILARITY = 0.65

# Feature flags
USE_QUERY_REFORMULATION = True   # Strategy 2: LLM-based query reformulation
USE_CHUNK_ENRICHMENT = True      # Strategy 3: Enrich top chunk with examples


@dataclass
class RetrievedChunk:
    chunk_id:       int
    chapter:        str
    section:        str
    subject:        str
    grade:          int
    content:        str
    page_reference: str | None
    similarity:     float

    def citation_label(self) -> str:
        base = f"{self.subject} — {self.chapter}"
        if self.section:
            base += f", {self.section}"
        if self.page_reference:
            base += f" ({self.page_reference})"
        return base


def _deduplicate_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Remove duplicate chunks by chunk_id, keeping highest similarity."""
    seen: dict[int, RetrievedChunk] = {}
    for c in chunks:
        if c.chunk_id not in seen or c.similarity > seen[c.chunk_id].similarity:
            seen[c.chunk_id] = c
    # Return sorted by similarity descending
    return sorted(seen.values(), key=lambda c: c.similarity, reverse=True)


async def retrieve_chunks(
    query: str,
    subject: str | None = None,
    grade:   int | None = None,
    top_k:   int = TOP_K,
) -> list[RetrievedChunk]:
    """
    Enhanced retriever with query reformulation and chunk enrichment.

    Strategy 2: If initial search returns few results or low similarity,
               use Groq to reformulate query and try alternatives.

    Strategy 3: Enrich the best chunk with examples, misconceptions,
               and real-world connections.
    """
    start_time = time.time()

    # Try main query first
    chunks = await _retrieve_chunks_internal(query, subject, grade, top_k)

    # If few results or low quality, try reformulated queries (Strategy 2)
    if USE_QUERY_REFORMULATION and len(chunks) < 3:
        try:
            from app.rag.query_reformulation import reformulate_query, should_reformulate

            similarity_scores = [c.similarity for c in chunks]
            if should_reformulate(len(chunks), similarity_scores):
                logger.info("Low results (got %d chunks), reformulating query...", len(chunks))

                reformulated = await reformulate_query(query, subject or "Science", grade or 9)

                for reformed_query in reformulated[1:]:  # Skip original
                    logger.info("Trying reformulated query: %s", reformed_query)
                    new_chunks = await _retrieve_chunks_internal(reformed_query, subject, grade, top_k)
                    if new_chunks:
                        logger.info("Found %d chunks with reformulated query", len(new_chunks))
                        chunks.extend(new_chunks)
                        break
        except Exception as e:
            logger.warning("Query reformulation failed: %s", e)

    # Deduplicate after potential reformulation extension
    chunks = _deduplicate_chunks(chunks)[:top_k]

    # Enrich the best chunk if available (Strategy 3)
    if USE_CHUNK_ENRICHMENT and chunks:
        try:
            from app.rag.chunk_enrichment import enrich_chunk, should_enrich_chunks

            # Use current (post-dedup) similarity scores
            current_scores = [c.similarity for c in chunks]
            avg_sim = sum(current_scores) / len(current_scores)

            if should_enrich_chunks(len(chunks), avg_sim):
                logger.info("Enriching best chunk (similarity: %.3f)", chunks[0].similarity)

                enriched = await enrich_chunk(
                    chunk_content=chunks[0].content,
                    query=query,
                    subject=subject or "Science",
                    grade=grade or 9,
                )

                if enriched.was_enriched:
                    # Replace original content with enriched version
                    chunks[0] = RetrievedChunk(
                        chunk_id=chunks[0].chunk_id,
                        chapter=chunks[0].chapter,
                        section=chunks[0].section,
                        subject=chunks[0].subject,
                        grade=chunks[0].grade,
                        content=enriched.enriched_content,
                        page_reference=chunks[0].page_reference,
                        similarity=chunks[0].similarity,
                    )
                    logger.info("Chunk enriched with examples and context")
        except Exception as e:
            logger.warning("Chunk enrichment failed: %s", e)

    elapsed_ms = (time.time() - start_time) * 1000
    logger.info("Retrieved %d chunks in %.2fms", len(chunks), elapsed_ms)
    return chunks


async def _retrieve_chunks_internal(
    query: str,
    subject: str | None = None,
    grade: int | None = None,
    top_k: int = TOP_K,
) -> list[RetrievedChunk]:
    """
    Internal retrieval: tries pgvector RPC first, falls back to local cosine sim.
    """
    try:
        from app.rag.embedder import embed_text
        query_embedding = await embed_text(query)
    except Exception as e:
        logger.warning("Embedding failed (is Ollama running?): %s", e)
        return []

    # ── Strategy A: Use pgvector RPC (fast, server-side) ─────────────────
    try:
        from app.services.supabase_service import get_supabase_client
        client = get_supabase_client()

        rpc_params = {
            "query_embedding": query_embedding,
            "match_threshold": MIN_SIMILARITY,
            "match_count": top_k,
            "filter_subject": subject,
            "filter_grade": grade,
        }

        response = client.rpc("match_textbook_chunks", rpc_params).execute()

        if response.data:
            chunks = []
            for row in response.data:
                chunks.append(RetrievedChunk(
                    chunk_id       = row["id"],
                    chapter        = row["chapter"],
                    section        = row.get("section", ""),
                    subject        = row["subject"],
                    grade          = row["grade"],
                    content        = row["content"],
                    page_reference = row.get("page_reference"),
                    similarity     = row["similarity"],
                ))
            logger.info(
                "RPC retrieved %d chunks (top sim: %.3f)",
                len(chunks),
                chunks[0].similarity if chunks else 0,
            )
            return chunks

        logger.info("RPC returned 0 chunks for query: %s", query[:80])
        return []

    except Exception as e:
        logger.warning("RPC match_textbook_chunks failed: %s — falling back to local search", e)

    # ── Strategy B: Fallback — fetch rows locally and compute cosine sim ──
    try:
        from app.services.supabase_service import get_supabase_client
        client = get_supabase_client()

        # Only fetch when RPC is unavailable
        query_builder = client.table("textbook_chunks").select("*")
        if subject:
            query_builder = query_builder.eq("subject", subject)
        if grade:
            query_builder = query_builder.eq("grade", grade)

        response = query_builder.execute()
    except Exception as e:
        logger.warning("DB fetch failed: %s", e)
        return []

    if not response.data:
        logger.info("No chunks found for query: %s", query[:80])
        return []

    # Compute similarity locally
    scored = []
    for row in response.data:
        try:
            embedding_raw = row.get("embedding")
            if embedding_raw is None:
                continue

            if isinstance(embedding_raw, str):
                chunk_embedding = json.loads(embedding_raw)
            else:
                chunk_embedding = embedding_raw

            similarity = _cosine_similarity(query_embedding, chunk_embedding)

            if similarity >= MIN_SIMILARITY:
                scored.append((row, similarity))
        except Exception as e:
            logger.debug("Failed to score chunk %s: %s", row.get("id"), e)
            continue

    # Sort by similarity and take top-k
    scored.sort(key=lambda x: x[1], reverse=True)
    scored = scored[:top_k]

    chunks = []
    for row, similarity in scored:
        chunks.append(RetrievedChunk(
            chunk_id       = row["id"],
            chapter        = row["chapter"],
            section        = row.get("section", ""),
            subject        = row["subject"],
            grade          = row["grade"],
            content        = row["content"],
            page_reference = row.get("page_reference"),
            similarity     = similarity,
        ))

    logger.info(
        "Local fallback retrieved %d chunks (top sim: %.3f)",
        len(chunks),
        chunks[0].similarity if chunks else 0,
    )
    return chunks


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def format_context(chunks: list[RetrievedChunk]) -> str:
    """Format retrieved chunks into a context string for the LLM prompt."""
    if not chunks:
        return "No textbook content found for this query. Use your general knowledge about CBSE curriculum."

    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[Source {i}: {c.citation_label()}]\n{c.content}"
        )
    return "\n\n---\n\n".join(parts)

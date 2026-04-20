"""
QA Cache management for caching frequent queries and responses.
Improves performance by avoiding redundant LLM calls.

Uses the app-wide Supabase singleton — not its own client.
"""
import hashlib
import json
import logging
from typing import Optional

from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


class QACacheManager:
    """Manages QA cache for storing and retrieving cached responses."""

    def __init__(self):
        # Uses the global singleton — no separate client creation
        try:
            self._client = get_supabase_client()
            self._enabled = True
        except RuntimeError:
            logger.warning("Supabase not initialised — QA cache disabled")
            self._client = None
            self._enabled = False

    @staticmethod
    def compute_query_hash(query: str, subject: str = "", grade: int = 9) -> str:
        """Compute a hash for a query to use as cache key."""
        cache_key = f"{query.lower().strip()}|{subject}|{grade}"
        return hashlib.sha256(cache_key.encode()).hexdigest()

    def get_cached_response(
        self,
        query: str,
        subject: str = "",
        grade: int = 9,
    ) -> Optional[dict]:
        """
        Retrieve a cached response if it exists.

        Args:
            query: User query
            subject: Subject area
            grade: Grade level

        Returns:
            Cached response dict or None if not found
        """
        if not self._enabled:
            return None

        try:
            query_hash = self.compute_query_hash(query, subject, grade)

            response = (
                self._client.table("qa_cache")
                .select("query_text, response_text, citations, hit_count, quality_score")
                .eq("query_hash", query_hash)
                .single()
                .execute()
            )

            if response.data:
                # Update hit count and last_accessed
                try:
                    self._client.table("qa_cache").update(
                        {
                            "hit_count": response.data.get("hit_count", 0) + 1,
                            "last_accessed": "now()",
                        }
                    ).eq("query_hash", query_hash).execute()
                except Exception:
                    pass  # Ignore update errors

                return response.data

            return None
        except Exception as e:
            logger.debug("Cache lookup missed or failed: %s", e)
            return None

    def cache_response(
        self,
        query: str,
        response: str,
        citations: list[dict],
        subject: str = "",
        grade: int = 9,
        quality_score: float = 0.0,
    ) -> bool:
        """
        Cache a response for a query.

        Args:
            query: User query
            response: LLM response text
            citations: List of citation dicts
            subject: Subject area
            grade: Grade level
            quality_score: Quality rating (0-1)

        Returns:
            True if cached successfully, False otherwise
        """
        if not self._enabled:
            return False

        try:
            query_hash = self.compute_query_hash(query, subject, grade)

            data = {
                "query_hash": query_hash,
                "query_text": query,
                "response_text": response,
                "citations": json.dumps(citations),
                "subject": subject,
                "grade": grade,
                "quality_score": quality_score,
                "hit_count": 1,
            }

            result = self._client.table("qa_cache").upsert(data).execute()
            return result.data is not None
        except Exception as e:
            logger.warning("Error caching response: %s", e)
            return False

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        if not self._enabled:
            return {}

        try:
            total = (
                self._client.table("qa_cache")
                .select("count", count="exact")
                .execute()
            )

            popular = (
                self._client.table("qa_cache")
                .select("query_text, hit_count")
                .order("hit_count", desc=True)
                .limit(10)
                .execute()
            )

            all_entries = (
                self._client.table("qa_cache")
                .select("quality_score")
                .execute()
            )

            avg_quality = 0.0
            if all_entries.data:
                valid_scores = [
                    e.get("quality_score", 0)
                    for e in all_entries.data
                    if e.get("quality_score")
                ]
                avg_quality = (
                    sum(valid_scores) / len(valid_scores) if valid_scores else 0
                )

            return {
                "total_cached": total.count or 0,
                "most_popular": [
                    {"query": item["query_text"], "hits": item["hit_count"]}
                    for item in (popular.data or [])
                ],
                "avg_quality_score": avg_quality,
            }
        except Exception as e:
            logger.warning("Error getting cache stats: %s", e)
            return {}

    def clear_low_quality_cache(self, min_quality: float = 0.5) -> int:
        """
        Remove cached entries below a quality threshold.

        Args:
            min_quality: Minimum quality score to keep

        Returns:
            Number of entries deleted
        """
        if not self._enabled:
            return 0

        try:
            result = (
                self._client.table("qa_cache")
                .delete()
                .lt("quality_score", min_quality)
                .execute()
            )
            return len(result.data) if result.data else 0
        except Exception as e:
            logger.warning("Error clearing low quality cache: %s", e)
            return 0


# Global cache manager instance
_cache_manager: QACacheManager | None = None


def get_cache_manager() -> QACacheManager:
    """Get or create the global cache manager."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = QACacheManager()
    return _cache_manager

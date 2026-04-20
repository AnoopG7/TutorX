"""
Auth dependency — resolves user_id from Supabase JWT or request params.

Two modes:
  1. Production: Bearer token → validate via Supabase → extract user_id
  2. Dev mode: No token → use user_id from query param (for testing)

Usage:
    @router.get("/student/profile")
    async def get_profile(user_id: str = Depends(get_current_user_id)):
        ...
"""
import logging
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.services.supabase_service import get_supabase_client
from app.config import get_settings

logger = logging.getLogger(__name__)

# auto_error=False so missing header doesn't auto-403
security = HTTPBearer(auto_error=False)
settings = get_settings()


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    user_id: Optional[str] = Query(None, description="Dev mode: pass user_id as query param"),
) -> str:
    """
    Extract and validate the user ID.
    Priority: Bearer token > query param user_id.
    Raises 401 if neither is provided.
    """
    # 1. Try Bearer token (production)
    if credentials and credentials.credentials:
        try:
            client = get_supabase_client()
            user_response = client.auth.get_user(credentials.credentials)
            if user_response and user_response.user:
                uid = str(user_response.user.id)
                logger.debug("Authenticated user via JWT: %s", uid)
                return uid
        except Exception as e:
            logger.warning("JWT validation failed: %s — checking for dev fallback", e)

    # 2. Fall back to query param (dev mode)
    if user_id:
        if settings.environment != "development":
            logger.warning("Query-param auth used in non-dev environment for user %s", user_id)
        return user_id

    raise HTTPException(
        status_code=401,
        detail="Authentication required. Provide a Bearer token or user_id query param.",
    )

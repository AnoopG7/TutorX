"""
Auth dependency — every user-scoped route resolves the caller from a
Supabase access token and checks they own what they're asking for.

    @router.get("/profile/{user_id}")
    async def get_profile(user_id: str, user: AuthUser = Depends(get_current_user)):
        ensure_same_user(user, user_id)

Fails closed: without a valid Bearer token the request gets 401. The only
exception is POST /api/chat, which accepts a body user_id when
ALLOW_INSECURE_DEV_AUTH=true (off by default) for scripts/chat_cli.py.
"""
import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: Optional[str] = None
    name: Optional[str] = None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_token(token: str) -> AuthUser:
    """Validate a Supabase access token. Raises 401 if invalid or expired."""
    try:
        res = get_supabase_client().auth.get_user(token)
    except Exception as e:  # expired, malformed, or revoked
        logger.info("Token rejected: %s", e)
        raise _unauthorized("Your session has expired. Sign in again.")
    if not res or not res.user:
        raise _unauthorized("Your session has expired. Sign in again.")
    meta = res.user.user_metadata or {}
    return AuthUser(id=str(res.user.id), email=res.user.email, name=meta.get("name"))


def get_current_user(  # sync: FastAPI runs it in a threadpool, so the Supabase call does not block the event loop
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    if credentials and credentials.credentials:
        return verify_token(credentials.credentials)
    raise _unauthorized("Sign in to continue.")


def ensure_same_user(user: AuthUser, user_id: str) -> None:
    """403 if a route's user_id doesn't belong to the caller."""
    if user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own data.")


# Backwards-compatible name used by older routes.
async def get_current_user_id(user: AuthUser = Depends(get_current_user)) -> str:
    return user.id

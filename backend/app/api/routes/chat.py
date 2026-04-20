"""
Chat route — main agent endpoint.
POST /api/chat  →  runs the agent loop, returns response + citations.

Auth strategy:
  - If Authorization: Bearer <token> is present → validate via Supabase, use that user_id
  - If no token but user_id in body → use it (dev mode / no-auth flow)
  - If neither → 401
"""
from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from app.agent.loop import run_agent
from app.agent.memory import get_session_history, close_session
from app.services.supabase_service import get_supabase_client
import logging

logger   = logging.getLogger(__name__)
router   = APIRouter()
security = HTTPBearer(auto_error=False)  # auto_error=False means no 403 when header missing


class ChatRequest(BaseModel):
    user_id:  Optional[str]  = Field(None, description="User ID — required if not using Bearer token")
    message:  str            = Field(..., min_length=1, max_length=2000)
    subject:  Optional[str]  = Field(None, description="e.g. 'Science', 'Mathematics'")
    chapter:  Optional[str]  = Field(None, description="e.g. 'Chapter 1: Chemical Reactions'")


class ChatResponse(BaseModel):
    response:   str
    session_id: Optional[str]
    citations:  list[str]
    tools_used: list[str]


def _resolve_user_id(
    req: ChatRequest,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> str:
    """
    Resolve user_id from JWT token OR request body.
    Priority: Bearer token > request body user_id.
    """
    if credentials and credentials.credentials:
        # Validate Supabase JWT
        try:
            client = get_supabase_client()
            user_response = client.auth.get_user(credentials.credentials)
            if user_response and user_response.user:
                return str(user_response.user.id)
        except Exception as e:
            logger.warning("JWT validation failed: %s — falling back to body user_id", e)

    # Fall back to body user_id (dev mode)
    if req.user_id:
        return req.user_id

    raise HTTPException(
        status_code=401,
        detail="Authentication required. Provide a Bearer token or user_id in the request body.",
    )


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """
    Main tutoring endpoint. Runs the full agent loop:
      OBSERVE → THINK → ACT (tool calls) → REFLECT (memory write)

    Accepts auth via Bearer token (production) or user_id in body (dev mode).
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = _resolve_user_id(req, credentials)

    result = await run_agent(
        user_id = user_id,
        message = req.message.strip(),
        subject = req.subject,
        chapter = req.chapter,
    )
    return ChatResponse(**result)


@router.get("/sessions/{user_id}")
async def list_sessions(user_id: str, limit: int = 10):
    """Return recent sessions for a student."""
    client = get_supabase_client()
    res = (
        client.table("sessions")
        .select("id, title, subject, chapter, started_at, updated_at")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"sessions": res.data or []}


@router.get("/sessions/{user_id}/{session_id}/history")
async def session_history(user_id: str, session_id: str):
    """Return full message history for a session."""
    messages = await get_session_history(session_id)
    return {"session_id": session_id, "messages": messages}


@router.post("/sessions/{session_id}/close")
async def end_session(session_id: str):
    """Mark a session as ended."""
    await close_session(session_id)
    return {"status": "closed", "session_id": session_id}

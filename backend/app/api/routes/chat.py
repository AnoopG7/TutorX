"""
Chat routes.

  POST /api/chat                                   ask a question (RAG + one LLM call)
  GET  /api/chat/sessions/{user_id}                the caller's recent sessions
  GET  /api/chat/sessions/{user_id}/{sid}/history  messages in one of the caller's sessions
  POST /api/chat/sessions/{sid}/close              end one of the caller's sessions

Identity always comes from the Supabase access token. A `user_id` in the
body is only honoured when ALLOW_INSECURE_DEV_AUTH=true (local scripts).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.agent.loop import run_agent
from app.agent.memory import close_session, get_session_history
from app.api.auth import AuthUser, ensure_same_user, get_current_user, verify_token
from app.config import get_settings
from app.services.supabase_service import get_supabase_client
from app.utils.subjects import normalize_subject

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)


class ChatRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Ignored unless ALLOW_INSECURE_DEV_AUTH=true")
    message: str = Field(..., min_length=1, max_length=2000)
    subject: Optional[str] = Field(None, description="e.g. 'Science', 'Mathematics', 'Social Science'")
    chapter: Optional[str] = None
    session_id: Optional[str] = Field(None, description="Continue this session; omit to start a new one")


class Source(BaseModel):
    subject: Optional[str] = None
    chapter: str
    section: Optional[str] = None
    pages: list[str] = []
    similarity: Optional[float] = None
    label: str


class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str]
    citations: list[str] = Field(default_factory=list, description="Plain labels, kept for older clients")
    sources: list[Source] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    grounded: bool = Field(False, description="True when the answer used retrieved textbook passages")


def _resolve_chat_user(req: ChatRequest, credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    if credentials and credentials.credentials:
        return verify_token(credentials.credentials).id
    if req.user_id and get_settings().allow_insecure_dev_auth:
        return req.user_id
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sign in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _require_own_session(session_id: str, user_id: str) -> dict:
    """404 (not 403) for someone else's session, so ids can't be probed."""
    res = (
        get_supabase_client().table("sessions")
        .select("id, user_id, subject")
        .eq("id", session_id).limit(1).execute()
    )
    if not res.data or str(res.data[0].get("user_id")) != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return res.data[0]


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = _resolve_chat_user(req, credentials)
    if req.session_id:
        _require_own_session(req.session_id, user_id)

    result = await run_agent(
        user_id=user_id,
        message=message,
        subject=normalize_subject(req.subject),
        chapter=req.chapter,
        session_id=req.session_id,
    )
    return ChatResponse(**result)


@router.get("/sessions/{user_id}")
def list_sessions(user_id: str, limit: int = 20, user: AuthUser = Depends(get_current_user)):
    ensure_same_user(user, user_id)
    res = (
        get_supabase_client().table("sessions")
        .select("id, title, subject, chapter, started_at, ended_at, updated_at")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(max(1, min(limit, 100)))
        .execute()
    )
    return {
        "sessions": [
            {
                "id": s.get("id"),
                "title": s.get("title"),
                "subject": normalize_subject(s.get("subject")),
                "chapter": s.get("chapter"),
                "created_at": s.get("started_at"),
                "updated_at": s.get("updated_at"),
                "ended_at": s.get("ended_at"),
            }
            for s in (res.data or [])
        ]
    }


@router.get("/sessions/{user_id}/{session_id}/history")
async def session_history(session_id: str, user_id: str, user: AuthUser = Depends(get_current_user)):
    ensure_same_user(user, user_id)
    _require_own_session(session_id, user.id)
    messages = await get_session_history(session_id)
    return {
        "session_id": session_id,
        "messages": [
            {
                "role": m.get("role"),
                "content": m.get("content", ""),
                "timestamp": m.get("timestamp"),
                "sources": m.get("sources") or [],
            }
            for m in messages
            if m.get("role") in ("user", "assistant")
        ],
    }


@router.post("/sessions/{session_id}/close")
async def end_session(session_id: str, user: AuthUser = Depends(get_current_user)):
    _require_own_session(session_id, user.id)
    await close_session(session_id)
    return {"status": "closed", "session_id": session_id}

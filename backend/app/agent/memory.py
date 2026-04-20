"""
Agent Memory — reads and writes student_profiles + sessions in Supabase.
The agent calls these to remember students across conversations.

NOTE: supabase-py's .execute() is synchronous. These async functions block
the event loop during DB calls. Acceptable for dev/low-traffic, but for
production scale, switch to an async Supabase client or wrap in run_in_executor.

NOTE: In dev mode, user_ids may not exist in auth.users (FK constraint).
The backend handles this with try/except — profile creation may fail silently.
"""
import logging
from uuid import UUID
from datetime import datetime
from postgrest.exceptions import APIError
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Student Profile
# ---------------------------------------------------------------------------

async def get_student_profile(user_id: str) -> dict | None:
    """Fetch the full student profile (weak areas, teaching style, etc.)."""
    client = get_supabase_client()
    try:
        res = (
            client.table("student_profiles")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return res.data
    except APIError as e:
        if "PGRST116" in str(e) or "0 rows" in str(e):
            return None  # No profile exists yet
        raise


async def update_student_profile(
    user_id:        str,
    weak_areas:     list[dict] | None = None,
    mastered_topics: list[str] | None = None,
    teaching_style: str | None = None,
) -> None:
    """
    Partial update of the student profile.
    Call this at the end of every REFLECT step.
    """
    client  = get_supabase_client()
    payload: dict = {"updated_at": datetime.utcnow().isoformat()}

    if weak_areas is not None:
        payload["weak_areas"] = weak_areas
    if mastered_topics is not None:
        payload["mastered_topics"] = mastered_topics
    if teaching_style is not None:
        payload["teaching_style"] = teaching_style

    client.table("student_profiles").update(payload).eq("user_id", user_id).execute()
    logger.info("Updated student profile for user %s", user_id)


async def append_quiz_result(user_id: str, topic: str, score: float) -> None:
    """Append a quiz score to the student's history."""
    profile = await get_student_profile(user_id)
    if not profile:
        return

    history: list = profile.get("quiz_history") or []
    history.append({"topic": topic, "score": score, "date": datetime.utcnow().isoformat()})
    # Keep last 50 quiz entries
    history = history[-50:]

    get_supabase_client().table("student_profiles").update(
        {"quiz_history": history, "updated_at": datetime.utcnow().isoformat()}
    ).eq("user_id", user_id).execute()


# ---------------------------------------------------------------------------
# Sessions (Conversation history — the agent's short-term memory)
# ---------------------------------------------------------------------------

async def get_or_create_session(
    user_id: str,
    subject: str | None = None,
    chapter: str | None = None,
) -> dict:
    """
    Return the most recent open session for the user, or create a new one.
    A session is 'open' if it has no ended_at timestamp.
    """
    client = get_supabase_client()

    # Try to find an open session
    res = (
        client.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .is_("ended_at", "null")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if res.data:
        return res.data[0]

    # Create new session
    new_session = {
        "user_id":  user_id,
        "subject":  subject,
        "chapter":  chapter,
        "messages": [],
        "title":    f"{subject or 'Study'} session — {datetime.utcnow().strftime('%d %b')}",
    }
    created = client.table("sessions").insert(new_session).execute()
    return created.data[0]


async def append_message(
    session_id: str,
    role:       str,           # "user" | "assistant" | "tool"
    content:    str,
    tool_name:  str | None = None,
    tool_input: dict | None = None,
) -> None:
    """
    Append a single message to the session's messages JSONB array.
    Keeps the last 50 messages to stay within LLM context limits.
    """
    client  = get_supabase_client()
    session = client.table("sessions").select("messages").eq("id", session_id).single().execute()
    messages: list = session.data.get("messages") or []

    entry: dict = {
        "role":      role,
        "content":   content,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if tool_name:
        entry["tool_name"]  = tool_name
    if tool_input:
        entry["tool_input"] = tool_input

    messages.append(entry)
    messages = messages[-50:]  # Sliding window

    client.table("sessions").update(
        {"messages": messages, "updated_at": datetime.utcnow().isoformat()}
    ).eq("id", session_id).execute()


async def get_session_history(session_id: str) -> list[dict]:
    """Return the full message list for a session."""
    client = get_supabase_client()
    res = client.table("sessions").select("messages").eq("id", session_id).single().execute()
    return res.data.get("messages") or []


async def close_session(session_id: str) -> None:
    """Mark a session as ended."""
    get_supabase_client().table("sessions").update(
        {"ended_at": datetime.utcnow().isoformat()}
    ).eq("id", session_id).execute()

"""
Agent Loop — Direct RAG + LLM (no ReAct loop).

Architecture change: replaced ReActAgent (14+ Groq calls/question) with:
  1. Retrieve relevant NCERT chunks from Supabase (1 Ollama embed call)
  2. Build a rich prompt with context + student profile
  3. Call Groq ONCE → return answer

Result: 1 Groq call per message instead of 14+. No rate limits, no timeouts.
"""

import logging
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.llms.groq import Groq
from app.agent.memory import (
    get_student_profile,
    create_new_session,
    append_message,
    get_session_history,
    update_session_title,
)
from app.config import get_settings
from app.services.supabase_service import get_supabase_client
from pathlib import Path

logger = logging.getLogger(__name__)
settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Cached LLM client — avoid recreating per request
_llm: Groq | None = None


def _get_llm() -> Groq:
    """Return a cached Groq LLM client singleton."""
    global _llm
    if _llm is None:
        _llm = Groq(model=settings.groq_model, api_key=settings.groq_api_key)
    return _llm


def _get_prompt_template() -> str:
    """Load system prompt template from file (cached on module load)."""
    try:
        path = PROMPTS_DIR / "system_prompt_v1.txt"
        return path.read_text()
    except FileNotFoundError:
        logger.warning("Prompt template not found, using fallback")
        return (
            "You are TutorX, a friendly CBSE tutor. Use the context provided to answer."
        )


def _teaching_style_instruction(style: str) -> str:
    return {
        "definition_first": """Structure your response as follows:
1. **Definition**: Start with a clear, concise definition of the concept
2. **Working Principle**: Explain how it works or the mechanism
3. **Key Points**: List important characteristics or properties  
4. **Real-World Example**: End with a relevant, concrete example (brief)
5. **Quick Check**: Ask a comprehension question
Keep the tone encouraging and grade-appropriate. Avoid vague analogies at the start.""",
        "analogy_first": "Start with a relatable everyday analogy, then explain the concept step by step.",
        "example_first": "Start with a concrete real-world example, then build up to the concept.",
        "socratic": "Ask a guiding question to help the student think, then explain.",
    }.get(
        style,
        """Structure your response as follows:
1. **Definition**: Start with a clear definition
2. **Working Principle**: Explain the mechanism
3. **Key Points**: List important characteristics
4. **Example**: End with a concrete example
5. **Quick Check**: Ask a comprehension question""",
    )


# Load template once on module initialization
PROMPT_TEMPLATE = _get_prompt_template()


def _build_prompt(
    message: str, profile: dict, context: str, history: list[dict]
) -> list[ChatMessage]:
    """Build the full prompt as a ChatMessage list for one Groq call."""
    grade = profile.get("grade", 9)
    name = profile.get("name", "Student")
    style = profile.get("teaching_style", "analogy_first")
    custom_instructions = profile.get("custom_instructions") or ""
    weak_areas = [
        w["topic"] if isinstance(w, dict) else str(w)
        for w in (profile.get("weak_areas") or [])
    ]
    mastered = profile.get("mastered_topics") or []

    # Format values for template
    weak_areas_str = ", ".join(weak_areas) if weak_areas else "none identified yet"
    mastered_str = ", ".join(mastered) if mastered else "none yet"
    context_str = (
        context
        if context
        else f"No textbook content available. Use your knowledge of CBSE Grade {grade} curriculum."
    )

    custom_section = ""
    if custom_instructions.strip():
        custom_section = f"\n\n## Custom Instructions\n{custom_instructions}\n"

    system = (
        PROMPT_TEMPLATE.format(
            grade=grade,
            name=name,
            teaching_style_instruction=_teaching_style_instruction(style),
            weak_areas=weak_areas_str,
            mastered=mastered_str,
            context=context_str,
        )
        + custom_section
    )

    messages: list[ChatMessage] = [ChatMessage(role=MessageRole.SYSTEM, content=system)]

    # Add last 6 history messages for context (keep it short to save tokens)
    for msg in history[-6:]:
        role = msg.get("role", "user")
        if role == "user":
            messages.append(ChatMessage(role=MessageRole.USER, content=msg["content"]))
        elif role == "assistant":
            messages.append(
                ChatMessage(role=MessageRole.ASSISTANT, content=msg["content"])
            )

    messages.append(ChatMessage(role=MessageRole.USER, content=message))
    return messages


async def _get_or_create_profile(user_id: str) -> dict:
    """Get existing profile or create a minimal in-memory one — never crashes."""
    try:
        profile = await get_student_profile(user_id)
        if profile:
            return profile
    except Exception as e:
        logger.warning("get_student_profile failed: %s", e)

    logger.info("Auto-creating profile for user %s", user_id)
    default = {
        "user_id": user_id,
        "name": "Student",
        "grade": 9,
        "subjects": ["Science"],
        "teaching_style": "definition_first",  # ← ENHANCED: Start with clear definitions
        "weak_areas": [],
        "mastered_topics": [],
        "quiz_history": [],
        "total_sessions": 0,
    }

    try:
        client = get_supabase_client()
        result = (
            client.table("student_profiles")
            .upsert(default, on_conflict="user_id")
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.warning("Profile upsert failed: %s — using in-memory profile", e)

    return default


async def run_agent(
    user_id: str,
    message: str,
    subject: str | None = None,
    chapter: str | None = None,
    session_id: str | None = None,
) -> dict:
    """
    Main entry point. One Groq call per message — no agent loop.

    Returns:
      {
        "response":    str,
        "session_id":  str | None,
        "citations":   list[str],
        "tools_used":  list[str],
      }
    """
    # ── 1. LOAD PROFILE & SESSION ────────────────────────────────────────────
    profile = await _get_or_create_profile(user_id)

    retrieved_session_id = None
    history: list[dict] = []
    try:
        if session_id:
            # If session_id provided in request, use it (continuing an existing chat)
            client = get_supabase_client()
            session = (
                client.table("sessions")
                .select("*")
                .eq("id", session_id)
                .single()
                .execute()
            )
            if session.data:
                retrieved_session_id = session.data["id"]
        else:
            # No session_id provided: create a NEW session (never reuse an old one)
            session = await create_new_session(
                user_id, subject=subject, chapter=chapter
            )
            retrieved_session_id = session["id"]

        history = await get_session_history(retrieved_session_id)
    except Exception as e:
        logger.warning("Session setup failed: %s — continuing without persistence", e)

    # ── 2. RETRIEVE RELEVANT NCERT CHUNKS ────────────────────────────────────
    citations: list[str] = []
    context = ""
    try:
        from app.rag.retriever import retrieve_chunks, format_context

        chunks = await retrieve_chunks(message, subject=subject)
        context = format_context(chunks)
        citations = [c.citation_label() for c in chunks]
    except Exception as e:
        logger.warning("RAG retrieval failed (Ollama down?): %s", e)
        # Continue without context — LLM will use curriculum knowledge

    # ── 3. LOG USER MESSAGE ──────────────────────────────────────────────────
    if retrieved_session_id:
        try:
            await append_message(retrieved_session_id, role="user", content=message)
        except Exception:
            pass

    # ── 4. SINGLE LLM CALL ───────────────────────────────────────────────────
    response_text = ""
    try:
        llm = _get_llm()
        messages = _build_prompt(message, profile, context, history)
        response = await llm.achat(messages)
        response_text = response.message.content or str(response)
    except Exception as e:
        logger.error("LLM call failed for user %s: %s", user_id, e, exc_info=True)
        response_text = (
            "I couldn't process that right now. Please try again in a moment! "
            "Tip: Try 'Explain photosynthesis' or 'Quiz me on Chapter 1'."
        )

    # ── 5. LOG RESPONSE ──────────────────────────────────────────────────────
    if retrieved_session_id:
        try:
            await append_message(
                retrieved_session_id, role="assistant", content=response_text
            )
        except Exception:
            pass

        # Auto-title new sessions from the first user message (like ChatGPT/Claude)
        if not history:  # First message in this session
            try:
                await update_session_title(retrieved_session_id, message)
            except Exception:
                pass

    return {
        "response": response_text,
        "session_id": retrieved_session_id,
        "citations": citations,
        "tools_used": ["rag_search"] if citations else [],
    }

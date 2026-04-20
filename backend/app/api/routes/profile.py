"""
Progress routes — student profile, weak areas, chapter/subject listing.
All routes authenticated via Supabase JWT.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from app.agent.memory import get_student_profile, update_student_profile
from app.api.auth import get_current_user_id
from app.services.supabase_service import get_supabase_client
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/student/profile")
async def get_profile(user_id: str = Depends(get_current_user_id)):
    profile = await get_student_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile


@router.get("/student/weak-areas")
async def get_weak_areas(user_id: str = Depends(get_current_user_id)):
    profile = await get_student_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {
        "weak_areas":       profile.get("weak_areas", []),
        "mastered_topics":  profile.get("mastered_topics", []),
        "teaching_style":   profile.get("teaching_style", "analogy_first"),
        "total_sessions":   profile.get("total_sessions", 0),
    }


@router.get("/student/progress")
async def get_progress(
    user_id: str = Depends(get_current_user_id),
    subject: Optional[str] = None,
):
    client = get_supabase_client()
    query  = client.table("user_progress").select("*").eq("user_id", user_id)
    if subject:
        query = query.eq("subject", subject)
    res = query.order("updated_at", desc=True).execute()
    return {"progress": res.data or []}


@router.get("/chapters/{subject}/{grade}")
async def list_chapters(subject: str, grade: int):
    """List all chapters available in the textbook chunks for a subject+grade."""
    client = get_supabase_client()
    res = (
        client.table("textbook_chunks")
        .select("chapter")
        .eq("subject", subject)
        .eq("grade", grade)
        .eq("is_verified", True)
        .execute()
    )
    if not res.data:
        return {"chapters": [], "message": f"No verified content for {subject} Grade {grade} yet"}

    # Deduplicate and preserve order
    seen, chapters = set(), []
    for row in res.data:
        ch = row["chapter"]
        if ch not in seen:
            seen.add(ch)
            chapters.append(ch)
    return {"subject": subject, "grade": grade, "chapters": chapters}


class ProfileUpdateRequest(BaseModel):
    teaching_style: Optional[str] = Field(None, description="'analogy_first' | 'example_first' | 'socratic'")

@router.put("/student/preference")
async def set_teaching_preference(
    req: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    await update_student_profile(user_id, teaching_style=req.teaching_style)
    return {"status": "updated", "teaching_style": req.teaching_style}

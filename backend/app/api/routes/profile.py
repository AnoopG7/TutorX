"""
Profile routes — student profile management, weak areas, chapter/subject listing.
All routes authenticated via Supabase JWT.
"""
from fastapi import APIRouter, HTTPException, Depends, Path, Body
from pydantic import BaseModel, Field
from typing import Optional
from app.agent.memory import get_student_profile, update_student_profile
from app.api.auth import get_current_user_id
from app.services.supabase_service import get_supabase_client
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Profile Models ──────────────────────────────────────────────────────────
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    grade: Optional[int] = Field(None, ge=9, le=12)
    subjects: Optional[list[str]] = Field(None, min_items=1)
    teaching_style: Optional[str] = Field(
        None,
        description="One of: 'definition_first', 'analogy_first', 'example_first', 'socratic'"
    )


# ── Profile Endpoints ──────────────────────────────────────────────────────
@router.get("/profile/{user_id}")
async def get_profile(user_id: str = Path(...)):
    """Get student profile by user_id. Auto-create if doesn't exist."""
    try:
        client = get_supabase_client()
        res = client.table("student_profiles").select("*").eq("user_id", user_id).execute()
        
        if res.data:
            profile = res.data[0]
            return {
                "user_id": profile["user_id"],
                "name": profile.get("name", ""),
                "grade": profile.get("grade", 9),
                "subjects": profile.get("subjects", []),
                "teaching_style": profile.get("teaching_style", "example_first"),
                "weak_areas": profile.get("weak_areas", []),
                "mastered_topics": profile.get("mastered_topics", []),
                "total_sessions": profile.get("total_sessions", 0),
            }
        
        # Profile doesn't exist - create one automatically
        logger.info(f"Creating new profile for user {user_id}")
        new_profile = {
            "user_id": user_id,
            "email": f"user_{user_id}@tutorx.local",  # Generate default email
            "name": "",
            "grade": 9,
            "subjects": [],
            "teaching_style": "example_first",
            "weak_areas": [],
            "mastered_topics": [],
            "total_sessions": 0,
        }
        
        insert_res = client.table("student_profiles").insert([new_profile]).execute()
        if not insert_res.data:
            raise Exception("Failed to create profile")
        
        created = insert_res.data[0]
        return {
            "user_id": created["user_id"],
            "name": created.get("name", ""),
            "grade": created.get("grade", 9),
            "subjects": created.get("subjects", []),
            "teaching_style": created.get("teaching_style", "example_first"),
            "weak_areas": created.get("weak_areas", []),
            "mastered_topics": created.get("mastered_topics", []),
            "total_sessions": created.get("total_sessions", 0),
        }
    except Exception as e:
        logger.error(f"Error handling profile for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error handling profile: {str(e)}")


@router.put("/profile/{user_id}")
async def update_profile(
    user_id: str = Path(...),
    req: ProfileUpdateRequest = Body(...),
):
    """Update student profile (name, grade, subjects, teaching_style)."""
    try:
        client = get_supabase_client()
        
        # Check if profile exists
        existing = client.table("student_profiles").select("*").eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Build update payload (only include fields that were provided)
        update_data = {}
        if req.name is not None:
            update_data["name"] = req.name
        if req.grade is not None:
            update_data["grade"] = req.grade
        if req.subjects is not None:
            update_data["subjects"] = req.subjects
        if req.teaching_style is not None:
            update_data["teaching_style"] = req.teaching_style
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Perform update
        res = (
            client.table("student_profiles")
            .update(update_data)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        updated = res.data[0]
        return {
            "user_id": updated["user_id"],
            "name": updated.get("name", ""),
            "grade": updated.get("grade", 9),
            "subjects": updated.get("subjects", []),
            "teaching_style": updated.get("teaching_style", "example_first"),
            "weak_areas": updated.get("weak_areas", []),
            "mastered_topics": updated.get("mastered_topics", []),
            "total_sessions": updated.get("total_sessions", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")


@router.get("/student/weak-areas")
async def get_weak_areas(user_id: str = Depends(get_current_user_id)):
    """Get weak areas and mastered topics for authenticated user."""
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
    """Get progress data for authenticated user."""
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

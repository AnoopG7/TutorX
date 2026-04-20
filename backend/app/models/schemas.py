"""
Pydantic schemas — shared request/response models.
Aligned with actual DB schema and backend usage.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class StudentProfile(BaseModel):
    """Student profile as stored in Supabase."""
    user_id: str
    name: str
    grade: int = Field(..., ge=9, le=10)
    subjects: list[str] = []
    teaching_style: str = "definition_first"
    weak_areas: list[dict] = []            # [{topic, score, last_attempted}]
    mastered_topics: list[str] = []
    quiz_history: list[dict] = []          # [{topic, score, date}]
    total_sessions: int = 0


class StudentProfileUpdate(BaseModel):
    """Partial update for student profile."""
    name: Optional[str] = None
    grade: Optional[int] = Field(None, ge=9, le=10)
    teaching_style: Optional[str] = None
    weak_areas: Optional[list[dict]] = None
    mastered_topics: Optional[list[str]] = None

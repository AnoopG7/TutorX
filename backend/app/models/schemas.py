from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QuestionRequest(BaseModel):
    """Request schema for asking a question"""
    question: str = Field(..., min_length=5, max_length=1000)
    chapter: str
    subject: str


class QuestionResponse(BaseModel):
    """Response schema for question answer"""
    question_id: str
    question: str
    answer: str
    sources: List[str]
    confidence: float


class StudentProfile(BaseModel):
    """Student profile schema"""
    user_id: str
    name: str
    grade: str
    subjects: List[str]
    weak_topics: List[str] = []
    strong_topics: List[str] = []

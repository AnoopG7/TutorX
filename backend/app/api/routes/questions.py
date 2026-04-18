from fastapi import APIRouter

router = APIRouter()


@router.post("/ask")
async def ask_question():
    """Ask question using RAG"""
    return {"message": "Not yet implemented"}


@router.get("/history")
async def get_question_history():
    """Get question history"""
    return {"message": "Not yet implemented"}


@router.get("/{question_id}")
async def get_question():
    """Get specific question"""
    return {"message": "Not yet implemented"}

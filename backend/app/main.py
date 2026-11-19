from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.services.supabase_service import init_supabase
from app.api.routes import chat, profile, auth

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise Supabase client. Shutdown: nothing to clean up."""
    logger.info("🚀 TutorX starting up...")
    init_supabase()
    logger.info("✅ Supabase connected")
    logger.info("✅ TutorX ready — agent loop active")
    yield
    logger.info("🛑 TutorX shutting down")


settings = get_settings()

app = FastAPI(
    title="TutorX — CBSE Study Agent",
    description="RAG tutoring API grounded in NCERT Class 9 textbooks",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_origin_regex=settings.cors_origin_regex or None,
    # Auth uses Bearer tokens, not cookies, so credentials aren't needed.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routes ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(profile.router, prefix="/api", tags=["Profile"])


# ── Telegram Webhook ───────────────────────────────────────────────────────
@app.post("/webhook/telegram")
async def telegram_webhook():
    """Telegram webhook endpoint - processes incoming Telegram messages."""
    # This endpoint receives updates from Telegram
    # For production, use python-telegram-bot's webhook handling
    return JSONResponse({"status": "ok"})


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "TutorX CBSE Agent", "version": "0.1.0"}


@app.get("/health/ready", tags=["System"])
async def readiness():
    """
    Deeper check for debugging deployments: can we reach the database,
    and can we embed a query (i.e. will answers be grounded in the textbook)?
    Not polled by the frontend; /health stays cheap.
    """
    from app.rag.embedder import embed_text
    from app.services.supabase_service import get_supabase_client

    checks: dict[str, dict] = {}
    try:
        res = get_supabase_client().table("textbook_chunks").select("id", count="exact").limit(1).execute()
        checks["database"] = {"ok": True, "textbook_chunks": res.count}
    except Exception as e:
        checks["database"] = {"ok": False, "error": type(e).__name__}

    try:
        await embed_text("photosynthesis")
        checks["embeddings"] = {"ok": True, "provider": settings.embedding_provider}
    except Exception as e:
        checks["embeddings"] = {"ok": False, "provider": settings.embedding_provider, "error": str(e)[:160]}

    checks["llm"] = {"ok": bool(settings.groq_api_key), "model": settings.groq_model}
    ready = all(c["ok"] for c in checks.values())
    return JSONResponse({"ready": ready, "checks": checks}, status_code=200 if ready else 503)


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "TutorX CBSE Study Agent",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

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
    description="LlamaIndex ReAct tutoring agent grounded in NCERT textbooks",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

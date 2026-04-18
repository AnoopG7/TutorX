from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store Supabase client and other resources
app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Startup
    logger.info("Application starting...")
    yield
    # Shutdown
    logger.info("Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title="CBSE Study Agent API",
    description="RAG-powered AI tutoring system for CBSE students",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (to be added as we build routes)
# from app.api.routes import auth, questions, chapters, progress, websocket
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
# etc.


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "CBSE Study Agent"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "CBSE Study Agent API",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration from environment variables.

    pydantic-settings automatically reads from env vars and .env file —
    no manual os.getenv() needed.
    """

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""

    # Groq
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Telegram
    telegram_token: str = ""
    telegram_webhook_url: str = ""

    # CORS - from CORS_ORIGINS env var (comma-separated URLs on Render dashboard)
    cors_origins: str = ""
    # Optional regex for preview deployments, e.g. ^https://tutor-[a-z0-9]+-anoop-guptas-projects-[a-z0-9]+\.vercel\.app$
    cors_origin_regex: str = ""

    # Public URL of the frontend, used in password-reset emails.
    frontend_url: str = "http://localhost:5173"

    # Auth. When False (the default), every user-scoped route requires a valid
    # Supabase Bearer token. Only enable for local scripts like chat_cli.py.
    allow_insecure_dev_auth: bool = False

    # Embeddings for query-time retrieval. Must produce the same 768-dim
    # nomic-embed-text vectors the textbook chunks were ingested with.
    #   "ollama" — local/self-hosted Ollama (OLLAMA_BASE_URL)
    #   "nomic"  — Nomic's hosted API (NOMIC_API_KEY), same model family
    embedding_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    nomic_api_key: str = ""

    # Environment
    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False

    def get_cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins from env var."""
        if not self.cors_origins:
            return ["http://localhost:3000", "http://localhost:5173"]
        # Browsers send Origin without a trailing slash, so "https://x.app/" would never match.
        return [url.strip().rstrip("/") for url in self.cors_origins.split(",") if url.strip()]


@lru_cache()
def get_settings():
    """Get cached settings instance."""
    return Settings()

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
        origins = [url.strip() for url in self.cors_origins.split(",")]
        return origins


@lru_cache()
def get_settings():
    """Get cached settings instance."""
    return Settings()

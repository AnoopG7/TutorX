"""
Supabase client — singleton, used throughout the app.

Uses SERVICE_ROLE_KEY for backend operations (bypasses RLS).
The frontend uses the ANON key for client-side auth.
"""
from supabase import create_client, Client
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def init_supabase() -> None:
    """Initialise the Supabase client. Call once at startup."""
    global _client
    settings = get_settings()

    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL must be set in .env")

    # Use service role key for backend (bypasses RLS)
    # Falls back to anon key if service role not set
    key = settings.supabase_service_role_key or settings.supabase_key
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY must be set in .env")

    _client = create_client(settings.supabase_url, key)

    key_type = "service_role" if settings.supabase_service_role_key else "anon"
    logger.info("Supabase client initialised (key type: %s, project: %s...)", key_type, settings.supabase_url[:40])


def get_supabase_client() -> Client:
    """Return the singleton Supabase client. Raises if not initialised."""
    if _client is None:
        raise RuntimeError("Supabase not initialised. Call init_supabase() first (done at startup).")
    return _client

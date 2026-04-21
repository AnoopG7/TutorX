"""
Supabase client — singleton, used throughout the app.

Two clients:
  - _admin_client (SERVICE_ROLE_KEY) — for backend DB ops, admin.create_user, bypasses RLS
  - _auth_client (ANON_KEY) — for sign_in_with_password (requires anon key, not service role)

The frontend uses the ANON key for client-side auth.
"""
from supabase import create_client, Client
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

_admin_client: Client | None = None
_auth_client: Client | None = None


def init_supabase() -> None:
    """Initialise both Supabase clients. Call once at startup."""
    global _admin_client, _auth_client
    settings = get_settings()

    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL must be set in .env")

    # Admin client — SERVICE_ROLE_KEY for DB operations, admin API, bypasses RLS
    if settings.supabase_service_role_key:
        _admin_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        logger.info("Supabase admin client initialised (service_role key)")
    elif settings.supabase_key:
        _admin_client = create_client(settings.supabase_url, settings.supabase_key)
        logger.warning("Supabase admin client using anon key — admin operations may fail")
    else:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY must be set in .env")

    # Auth client — ANON_KEY for sign_in_with_password (service role key doesn't work for this)
    if settings.supabase_key:
        _auth_client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Supabase auth client initialised (anon key)")
    else:
        # Fallback: use admin client for auth too (may not work for sign_in_with_password)
        _auth_client = _admin_client
        logger.warning("No SUPABASE_KEY set — auth client using service_role key (sign_in may fail)")

    logger.info("Supabase connected (project: %s...)", settings.supabase_url[:40])


def get_supabase_client() -> Client:
    """Return the admin Supabase client (SERVICE_ROLE_KEY). For DB ops, admin API."""
    if _admin_client is None:
        raise RuntimeError("Supabase not initialised. Call init_supabase() first (done at startup).")
    return _admin_client


def get_supabase_auth_client() -> Client:
    """Return the auth Supabase client (ANON_KEY). For sign_in_with_password."""
    if _auth_client is None:
        raise RuntimeError("Supabase not initialised. Call init_supabase() first (done at startup).")
    return _auth_client

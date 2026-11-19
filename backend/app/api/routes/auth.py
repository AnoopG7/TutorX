"""
Auth routes — Supabase Auth behind a small REST surface.

  POST /api/auth/signup           create account (+ profile), auto-confirm when possible
  POST /api/auth/login            email + password → access + refresh token
  POST /api/auth/refresh          refresh token → new access token (access tokens expire after ~1h)
  POST /api/auth/forgot-password  email a reset link that opens {FRONTEND_URL}/reset-password
  POST /api/auth/reset-password   recovery token from that link + new password

Every auth call uses a fresh, stateless ANON client (see new_auth_client) so
one user's session can never leak into another request.
"""
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.config import get_settings
from app.services.supabase_service import get_supabase_client, new_auth_client
from app.utils.subjects import CANONICAL_SUBJECTS

try:  # supabase-py >= 2.18 renamed the auth package
    from supabase_auth.errors import AuthApiError, AuthRetryableError
except ImportError:  # pragma: no cover - older installs
    from gotrue.errors import AuthApiError, AuthRetryableError

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Models ──────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    access_token: str = Field(..., min_length=1, description="Recovery token from the reset email link")
    password: str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    token: str = Field(..., description="Access token (JWT)")
    refresh_token: str | None = None
    expires_at: int | None = Field(None, description="Unix seconds when the access token expires")
    user_id: str
    name: str


class SignupResponse(BaseModel):
    status: str = Field(..., description="'confirm_email' or 'logged_in'")
    message: str
    user_id: str | None = None
    token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    name: str | None = None


# ── Helpers ─────────────────────────────────────────────────────────────────
def _service_unavailable(e: Exception) -> HTTPException:
    logger.error("Auth provider unreachable: %s", e)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="The sign-in service is unreachable right now. Try again in a minute.",
    )


def _profile_name(user_id: str, fallback: str = "Student") -> str:
    try:
        res = (
            get_supabase_client().table("student_profiles")
            .select("name").eq("user_id", user_id).limit(1).execute()
        )
        if res.data and res.data[0].get("name"):
            return res.data[0]["name"]
    except Exception as e:
        logger.warning("Could not fetch profile name for %s: %s", user_id, e)
    return fallback


# ── Routes ──────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=SignupResponse)
def signup(req: SignupRequest):
    auth = new_auth_client()
    admin = get_supabase_client()

    try:
        res = auth.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"name": req.name}},
        })
    except AuthRetryableError as e:
        raise _service_unavailable(e)
    except AuthApiError as e:
        msg = str(e).lower()
        if "already" in msg and "regist" in msg:
            raise HTTPException(status_code=409, detail="This email already has an account. Sign in instead.")
        if "password" in msg:
            raise HTTPException(status_code=400, detail="Choose a stronger password, with at least 8 characters.")
        logger.warning("Signup rejected: %s", e)
        raise HTTPException(status_code=400, detail="Sign-up didn't work. Check your details and try again.")

    if not res.user:
        raise HTTPException(status_code=400, detail="Sign-up didn't work. Try again.")
    user_id = str(res.user.id)

    # Profile row (exists before email confirmation). Only Class 9 books are ingested today.
    try:
        admin.table("student_profiles").upsert({
            "user_id": user_id,
            "name": req.name,
            "email": req.email,
            "grade": 9,
            "subjects": list(CANONICAL_SUBJECTS),
            "teaching_style": "example_first",
            "weak_areas": [],
            "mastered_topics": [],
            "total_sessions": 0,
        }, on_conflict="user_id").execute()
    except Exception as e:
        logger.warning("Profile creation failed (non-blocking): %s", e)

    session = res.session
    if not session:
        # Email confirmation is on in Supabase: confirm via the admin API, then sign in.
        try:
            admin.auth.admin.update_user_by_id(user_id, {"email_confirm": True})
            session = new_auth_client().auth.sign_in_with_password(
                {"email": req.email, "password": req.password}
            ).session
        except Exception as e:
            logger.warning("Auto-confirm failed: %s", e)

    if session:
        return SignupResponse(
            status="logged_in",
            message="Account created.",
            user_id=user_id,
            token=session.access_token,
            refresh_token=session.refresh_token,
            expires_at=session.expires_at,
            name=req.name,
        )

    return SignupResponse(
        status="confirm_email",
        message="Account created. Check your email to confirm it, then sign in.",
        user_id=user_id,
        name=req.name,
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    try:
        res = new_auth_client().auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
    except AuthRetryableError as e:
        raise _service_unavailable(e)
    except AuthApiError as e:
        msg = str(e).lower()
        if "not confirmed" in msg:
            raise HTTPException(status_code=403, detail="Confirm your email first. Open the link we sent you, then sign in.")
        if e.status == 429 or "rate limit" in msg:
            raise HTTPException(status_code=429, detail="Too many sign-in attempts. Wait a few minutes and try again.")
        logger.info("Login failed for %s: %s", req.email, e)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    except Exception as e:
        raise _service_unavailable(e)

    if not res.user or not res.session:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(res.user.id)
    meta_name = (res.user.user_metadata or {}).get("name") or "Student"
    return AuthResponse(
        token=res.session.access_token,
        refresh_token=res.session.refresh_token,
        expires_at=res.session.expires_at,
        user_id=user_id,
        name=_profile_name(user_id, meta_name),
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh(req: RefreshRequest):
    try:
        res = new_auth_client().auth.refresh_session(req.refresh_token)
    except AuthRetryableError as e:
        raise _service_unavailable(e)
    except Exception as e:
        logger.info("Refresh rejected: %s", e)
        raise HTTPException(status_code=401, detail="Your session has expired. Sign in again.")

    if not res.user or not res.session:
        raise HTTPException(status_code=401, detail="Your session has expired. Sign in again.")

    user_id = str(res.user.id)
    return AuthResponse(
        token=res.session.access_token,
        refresh_token=res.session.refresh_token,
        expires_at=res.session.expires_at,
        user_id=user_id,
        name=_profile_name(user_id, (res.user.user_metadata or {}).get("name") or "Student"),
    )


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """
    Always answers the same way, so the endpoint can't be used to find out
    which emails have accounts. Add {FRONTEND_URL}/reset-password to
    Supabase → Authentication → URL Configuration → Redirect URLs.
    """
    redirect = get_settings().frontend_url.rstrip("/") + "/reset-password"
    try:
        new_auth_client().auth.reset_password_for_email(req.email, {"redirect_to": redirect})
    except AuthApiError as e:
        if e.status == 429:
            raise HTTPException(status_code=429, detail="Too many reset requests. Wait a few minutes and try again.")
        logger.info("Reset email not sent for %s: %s", req.email, e)
    except Exception as e:
        raise _service_unavailable(e)
    return {"status": "sent", "message": "If that email has an account, a reset link is on its way."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    admin = get_supabase_client()
    try:
        user = admin.auth.get_user(req.access_token)
    except Exception:
        user = None
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="This reset link has expired. Request a new one.")

    try:
        admin.auth.admin.update_user_by_id(str(user.user.id), {"password": req.password})
    except AuthApiError as e:
        logger.warning("Password update rejected: %s", e)
        raise HTTPException(status_code=400, detail="Choose a stronger password, with at least 8 characters.")
    except Exception as e:
        raise _service_unavailable(e)
    return {"status": "updated", "message": "Password updated. Sign in with your new password."}

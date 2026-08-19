"""
Auth routes — signup and login via Supabase Auth.

Signup flow:
  1. auth.sign_up() via ANON client → triggers confirmation email
  2. Insert student_profiles row (profile exists before email is confirmed)
  3. Return success message — user must confirm email before logging in

Login flow:
  1. sign_in_with_password() via ANON client → get JWT token
  2. Fetch profile name
  3. Return { token, user_id, name }
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from app.services.supabase_service import get_supabase_client, get_supabase_auth_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    name: str = Field(..., min_length=1, description="User's full name")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    token: str = Field(..., description="JWT access token")
    user_id: str = Field(..., description="User UUID")
    name: str = Field(..., description="User's full name")


class SignupResponse(BaseModel):
    status: str = Field(..., description="'confirm_email' or 'logged_in'")
    message: str = Field(..., description="Human-readable message")
    user_id: str | None = Field(None, description="User UUID if available")
    token: str | None = Field(None, description="JWT token if auto-confirmed")
    name: str | None = Field(None, description="User name")


@router.post("/signup", response_model=SignupResponse)
async def signup(req: SignupRequest):
    """
    Create a new user account via Supabase Auth.

    Uses auth.sign_up() which triggers Supabase's email confirmation flow.
    If email confirmation is enabled in Supabase settings, user must verify
    their email before they can log in.
    """
    try:
        auth_client = get_supabase_auth_client()    # ANON_KEY
        admin_client = get_supabase_client()         # SERVICE_ROLE_KEY

        # 1. Sign up via ANON client — this triggers the confirmation email
        try:
            signup_response = auth_client.auth.sign_up({
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "name": req.name,
                    }
                }
            })
        except Exception as signup_error:
            error_msg = str(signup_error).lower()
            if "already registered" in error_msg or "already been registered" in error_msg:
                raise HTTPException(
                    status_code=409,
                    detail="This email is already registered. Try signing in instead."
                )
            logger.error("Signup failed: %s", signup_error)
            raise HTTPException(status_code=400, detail=f"Signup failed: {signup_error}")

        if not signup_response.user:
            raise HTTPException(status_code=400, detail="Signup failed — could not create user")

        user_id = str(signup_response.user.id)
        logger.info("Created user: %s (email: %s)", user_id, req.email)

        # 2. Create student profile (can exist before email confirmation)
        try:
            admin_client.table("student_profiles").insert({
                "user_id": user_id,
                "name": req.name,
                "grade": 10,
                "subjects": ["Science", "Mathematics"],
                "email": req.email,
                "teaching_style": "definition_first",
                "weak_areas": [],
                "mastered_topics": [],
                "total_sessions": 0,
            }).execute()
            logger.info("Created profile for user: %s", user_id)
        except Exception as profile_error:
            logger.warning("Profile creation failed (non-blocking): %s", profile_error)

        # 3. Check if we got a session (means email confirmation is disabled)
        if signup_response.session:
            # Auto-confirmed — return token directly
            return SignupResponse(
                status="logged_in",
                message="Account created successfully!",
                user_id=user_id,
                token=signup_response.session.access_token,
                name=req.name,
            )

        # Email confirmation required — try auto-confirm via admin API
        try:
            admin_client.auth.admin.update_user_by_id(
                user_id,
                attributes={"email_confirm": True},
            )
            logger.info("Auto-confirmed user: %s", user_id)

            # Re-sign in to get a valid session token
            auto_login = auth_client.auth.sign_in_with_password({
                "email": req.email,
                "password": req.password,
            })
            if auto_login.session:
                return SignupResponse(
                    status="logged_in",
                    message="Account created successfully!",
                    user_id=user_id,
                    token=auto_login.session.access_token,
                    name=req.name,
                )
        except Exception as confirm_error:
            logger.warning("Auto-confirm failed: %s", confirm_error)

        # Fallback — email confirmation still needed
        return SignupResponse(
            status="confirm_email",
            message="Account created! Please check your email to verify your account.",
            user_id=user_id,
            token=None,
            name=req.name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Signup failed: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=f"Signup failed: {e}")


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Login with email and password."""
    try:
        auth_client = get_supabase_auth_client()    # ANON_KEY for sign_in
        admin_client = get_supabase_client()         # SERVICE_ROLE for profile lookup

        # Sign in via ANON client
        try:
            response = auth_client.auth.sign_in_with_password({
                "email": req.email,
                "password": req.password,
            })
        except Exception as auth_error:
            error_msg = str(auth_error).lower()
            if "email not confirmed" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="Please confirm your email before signing in. Check your inbox."
                )
            logger.warning("Login failed for %s: %s", req.email, auth_error)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = str(response.user.id)

        # Fetch profile name
        name = "Student"
        try:
            profile_res = (
                admin_client.table("student_profiles")
                .select("name")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            if profile_res.data:
                name = profile_res.data.get("name", "Student")
        except Exception as profile_error:
            logger.warning("Could not fetch profile for %s: %s", user_id, profile_error)

        return AuthResponse(
            token=response.session.access_token,
            user_id=user_id,
            name=name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error: %s", e)
        raise HTTPException(status_code=401, detail="Invalid email or password")

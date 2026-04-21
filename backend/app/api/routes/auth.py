from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from app.services.supabase_service import get_supabase_client
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


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    """Create a new user account via Supabase Auth using admin API"""
    try:
        client = get_supabase_client()

        logger.info(f"=== SIGNUP FLOW STARTED ===")
        logger.info(f"Email: {req.email}, Name: {req.name}")

        # Use admin API to create user (must use SERVICE_ROLE_KEY)
        logger.info(f"Calling admin.create_user() with attributes:")
        logger.info(f"  - email: {req.email}")
        logger.info(f"  - password: ••••••••••")
        logger.info(f"  - email_confirm: True")
        try:
            auth_response = client.auth.admin.create_user(
                attributes={
                    "email": req.email,
                    "password": req.password,
                    "email_confirm": True,  # Auto-confirm email in dev mode
                }
            )
            logger.info(f"✅ Admin API call succeeded")
        except Exception as admin_error:
            logger.error(f"❌ Admin API call failed")
            logger.error(f"   Error type: {type(admin_error).__name__}")
            logger.error(f"   Error message: {str(admin_error)}")
            logger.error(f"   Full exception: {admin_error}")
            raise

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed - could not create user")

        user_id = str(auth_response.user.id)
        logger.info(f"✅ Created user via admin API: {user_id}")

        # Create student profile in database
        try:
            client.table("student_profiles").insert({
                "user_id": user_id,
                "name": req.name,
                "grade": 9,
                "subjects": ["Math", "English", "Science"],
                "email": req.email,
                "teaching_style": "example_first",
                "weak_areas": [],
                "mastered_topics": [],
                "total_sessions": 0,
            }).execute()
            logger.info(f"Created profile for user: {user_id}")
        except Exception as profile_error:
            logger.error(f"Failed to create profile: {profile_error}")
            # Continue anyway - profile creation failure shouldn't block login

        # Generate a session token for the newly created user
        # Get a fresh auth token by signing in with the credentials
        signin_response = client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not signin_response.user or not signin_response.session:
            raise HTTPException(status_code=400, detail="Signup succeeded but login failed - please try signing in")

        return AuthResponse(
            token=signin_response.session.access_token,
            user_id=user_id,
            name=req.name,
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__

        logger.error(f"")
        logger.error(f"❌ SIGNUP FAILED")
        logger.error(f"   Error Type: {error_type}")
        logger.error(f"   Error Message: {error_msg}")
        logger.error(f"   Full Exception: {e}")

        # Try to extract more details
        if hasattr(e, '__dict__'):
            logger.error(f"   Exception Attributes: {e.__dict__}")

        import traceback
        logger.error(f"   Traceback:\n{traceback.format_exc()}")
        logger.error(f"")

        raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Login with email and password"""
    try:
        client = get_supabase_client()

        # Sign in with Supabase Auth
        response = client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = response.user.id
        session = response.session

        # Fetch user's profile to get name
        try:
            profile_response = client.table("student_profiles") \
                .select("name") \
                .eq("user_id", user_id) \
                .single() \
                .execute()

            name = profile_response.data.get("name", "Student") if profile_response.data else "Student"
        except Exception as profile_error:
            logger.warning(f"Could not fetch profile: {profile_error}")
            name = "Student"

        return AuthResponse(
            token=session.access_token,
            user_id=user_id,
            name=name,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

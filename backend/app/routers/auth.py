from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user_from_request,
    get_current_user_with_password,
    get_password_hash,
)
from ..config import get_settings
from ..models import Token, UserCreate, UserLogin, UserResponse, UserUpdate
from ..repositories import UserRepository

settings = get_settings()
router = APIRouter()


# Success response model
class SuccessResponse:
    def __init__(self, message: str, success: bool = True):
        self.message = message
        self.success = success


@router.post("/register")
async def register_user(user: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await UserRepository.get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        hashed_password = get_password_hash(user.password)
        db_user = await UserRepository.create_user(user, hashed_password)

        return {"message": "User registered successfully", "success": True}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login")
async def login_user(user: UserLogin, response: Response):
    """Authenticate user and set secure cookie"""
    authenticated_user = await authenticate_user(user.email, user.password)
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

    # Create token with comprehensive user data
    user_data = {
        "id": authenticated_user.id,
        "name": authenticated_user.name,
        "email": authenticated_user.email,
        "is_admin": authenticated_user.is_admin,
        "is_active": authenticated_user.is_active,
    }

    access_token = create_access_token(
        user_data=user_data, expires_delta=access_token_expires
    )

    return {
        "message": "Login successful",
        "access_token": access_token,  # Send token in response for frontend to use
        "token_type": "bearer",
        "user": {
            "id": authenticated_user.id,
            "name": authenticated_user.name,
            "email": authenticated_user.email,
            "is_admin": authenticated_user.is_admin,
            "is_active": authenticated_user.is_active,
        },
    }


@router.post("/logout")
async def logout_user(response: Response):
    """Logout user by clearing the access token cookie"""
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    return {"message": "Logout successful"}


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

    # Create token with comprehensive user data
    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
    }

    access_token = create_access_token(
        user_data=user_data, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/debug-auth")
async def debug_auth(request: Request):
    """Debug authentication - check cookies and token"""
    from ..auth import get_token_from_request, verify_token

    # Check what cookies we received
    cookies = dict(request.cookies)

    # Try to get token
    token = get_token_from_request(request)

    debug_info = {
        "cookies_received": cookies,
        "access_token_found": "access_token" in cookies,
        "token_extracted": bool(token),
        "token_length": len(token) if token else 0,
    }

    if token:
        try:
            credentials_exception = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
            token_data = verify_token(token, credentials_exception)
            debug_info["token_valid"] = True
            debug_info["token_data"] = {
                "email": token_data.email,
                "user_id": token_data.user_id,
                "name": token_data.name,
                "is_admin": token_data.is_admin,
                "is_active": token_data.is_active,
            }
        except Exception as e:
            debug_info["token_valid"] = False
            debug_info["token_error"] = str(e)

    return debug_info


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
):
    """Get current user information"""
    current_user = await get_current_active_user_from_request(request)

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    request: Request,
):
    """Update current user's profile information"""
    current_user = await get_current_active_user_from_request(request)

    try:
        # Check if email is being changed and if it already exists
        if user_update.email and user_update.email != current_user.email:
            existing_user = await UserRepository.get_user_by_email(user_update.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

        # Update user profile
        updated_user = await UserRepository.update_user(current_user.id, user_update)
        if isinstance(updated_user, HTTPException):
            raise updated_user

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            )

        return UserResponse(
            id=updated_user.id,
            name=updated_user.name,
            email=updated_user.email,
            is_active=updated_user.is_active,
            is_admin=updated_user.is_admin,
            created_at=updated_user.created_at,
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )


@router.put("/change-password")
async def change_password(
    password_data: dict,
    request: Request,
):
    """Change user password"""
    current_user = await get_current_user_with_password(request)

    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")

        if not current_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both current and new password are required",
            )

        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long",
            )

        # Import auth functions locally to avoid circular import
        from ..auth import get_password_hash, verify_password

        # Verify current password against the stored hashed password
        if not verify_password(current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid current password",
            )

        # Hash new password and update
        hashed_password = get_password_hash(new_password)
        success = await UserRepository.update_password(current_user.id, hashed_password)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password",
            )

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password",
        )

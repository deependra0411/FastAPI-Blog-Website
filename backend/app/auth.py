from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings
from .models import TokenData, UserInDB
from .repositories import UserRepository

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(user_data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with comprehensive user data"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    # Include essential user data in JWT payload
    to_encode = {
        "sub": user_data["email"],  # Subject (primary identifier)
        "user_id": user_data["id"],
        "name": user_data["name"],
        "email": user_data["email"],
        "is_admin": user_data.get("is_admin"),
        "is_active": user_data.get("is_active"),
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "type": "access",  # Token type
    }

    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    """Verify JWT token and extract user data"""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        # Extract comprehensive user data from token
        token_data = TokenData(
            email=email,
            user_id=payload.get("user_id"),
            name=payload.get("name"),
            is_admin=payload.get("is_admin"),
            is_active=payload.get("is_active"),
        )
    except JWTError:
        raise credentials_exception
    return token_data


def get_token_from_request(request: Request) -> Optional[str]:
    """Extract token from Authorization header"""
    #  Authorization header
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]

    return None


async def get_current_user(request: Request):
    """Get current authenticated user from token (cookie or header)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = get_token_from_request(request)
    if not token:
        raise credentials_exception

    token_data = verify_token(token, credentials_exception)

    # If we have comprehensive user data in the token, we can return it directly
    # without database lookup for better performance
    if token_data.user_id and token_data.name and token_data.email is not None:
        # Create UserInDB object from token data
        user = UserInDB(
            id=token_data.user_id,
            name=token_data.name,
            email=token_data.email,
            password="",  # We don't need password for authenticated requests
            is_active=token_data.is_active,
            is_admin=token_data.is_admin,
            created_at=datetime.utcnow(),  # This could be added to token if needed
        )
        return user

    # Fallback to database lookup if token doesn't have complete data
    user = await UserRepository.get_user_by_email(token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    """Get current active user (for use with FastAPI dependencies)"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_active_user_from_request(request: Request):
    """Get current active user from request (for manual calls)"""
    current_user = await get_current_user(request)
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_user_with_password(request: Request):
    """Get current user with password hash from database (needed for password changes)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = get_token_from_request(request)
    if not token:
        raise credentials_exception

    token_data = verify_token(token, credentials_exception)

    # Always fetch from database for password operations
    user = await UserRepository.get_user_by_email(token_data.email)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


async def authenticate_user(email: str, password: str):
    """Authenticate user with email and password"""
    user = await UserRepository.get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# User models
class UserInDB(BaseModel):
    """User model as stored in database"""

    id: int
    name: str
    email: EmailStr
    password: str  # hashed
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """User creation model"""

    name: str
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """User update model"""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User response model (without password)"""

    id: int
    name: str
    email: EmailStr
    is_active: bool
    is_admin: bool
    created_at: datetime


# Post models
class PostInDB(BaseModel):
    """Post model as stored in database"""

    id: int
    title: str
    tagline: Optional[str] = None
    slug: str
    content: str
    img_file: Optional[str] = None
    author_id: int
    author_name: str
    is_published: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


class PostCreate(BaseModel):
    """Post creation model"""

    title: str
    tagline: Optional[str] = None
    slug: str
    content: str
    img_file: Optional[str] = None
    is_published: bool


class PostUpdate(BaseModel):
    """Post update model"""

    title: Optional[str] = None
    tagline: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    img_file: Optional[str] = None
    is_published: Optional[bool] = None


class PostResponse(BaseModel):
    """Post response model"""

    id: int
    title: str
    tagline: Optional[str] = None
    slug: str
    content: str
    img_file: Optional[str] = None
    author_id: int
    author_name: str
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


# Contact models
class ContactInDB(BaseModel):
    """Contact model as stored in database"""

    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: datetime


class ContactCreate(BaseModel):
    """Contact creation model"""

    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str


class ContactResponse(BaseModel):
    """Contact response model"""

    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    is_read: bool
    created_at: datetime


# Pagination models
class PaginatedResponse(BaseModel):
    """Generic paginated response"""

    total: int
    page: int
    per_page: int
    total_pages: int


class PostListResponse(PaginatedResponse):
    """Paginated posts response"""

    posts: list[PostResponse]


# Authentication models
class Token(BaseModel):
    """Token response model"""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data model"""

    email: Optional[str] = None


class UserLogin(BaseModel):
    """User login model"""

    email: EmailStr
    password: str

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
import re


# User schemas
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Post schemas
class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    tagline: Optional[str] = Field(None, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1)
    img_file: Optional[str] = Field(None, max_length=255)
    
    @validator('slug')
    def validate_slug(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug can only contain lowercase letters, numbers, and hyphens')
        return v


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    tagline: Optional[str] = Field(None, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    content: Optional[str] = Field(None, min_length=1)
    img_file: Optional[str] = Field(None, max_length=255)
    
    @validator('slug')
    def validate_slug(cls, v):
        if v and not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug can only contain lowercase letters, numbers, and hyphens')
        return v


class PostResponse(PostBase):
    id: int
    author_id: int
    author_name: str
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# Contact schemas
class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    message: str = Field(..., min_length=10)


class ContactResponse(ContactCreate):
    id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# General response schemas
class SuccessResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    message: str
    success: bool = False
    error_code: Optional[str] = None

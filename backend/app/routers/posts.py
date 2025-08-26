from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from math import ceil

from ..database import get_db
from ..models import User, Post
from ..schemas import PostCreate, PostUpdate, PostResponse, PostListResponse, SuccessResponse
from ..auth import get_current_active_user
from ..config import get_settings

settings = get_settings()
router = APIRouter()


@router.get("/", response_model=PostListResponse)
async def get_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(None),
    db: Session = Depends(get_db)
):
    """Get paginated list of published posts"""
    if per_page is None:
        per_page = settings.no_of_posts_per_page
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Get total count
    total = db.query(Post).filter(Post.is_published == True).count()
    
    # Get posts
    posts = db.query(Post).filter(Post.is_published == True)\
        .order_by(desc(Post.created_at))\
        .offset(offset)\
        .limit(per_page)\
        .all()
    
    total_pages = ceil(total / per_page)
    
    return PostListResponse(
        posts=posts,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/{slug}", response_model=PostResponse)
async def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    """Get a specific post by slug"""
    post = db.query(Post).filter(Post.slug == slug, Post.is_published == True).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    return post


@router.post("/", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new post"""
    # Check if slug already exists
    existing_post = db.query(Post).filter(Post.slug == post.slug).first()
    if existing_post:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )
    
    db_post = Post(
        title=post.title,
        tagline=post.tagline,
        slug=post.slug,
        content=post.content,
        img_file=post.img_file,
        author_id=current_user.id,
        author_name=current_user.name
    )
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return db_post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an existing post"""
    # Get the post
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user owns the post or is admin
    if db_post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post"
        )
    
    # Check if new slug already exists (if changing slug)
    if post_update.slug and post_update.slug != db_post.slug:
        existing_post = db.query(Post).filter(Post.slug == post_update.slug).first()
        if existing_post:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slug already exists"
            )
    
    # Update fields
    update_data = post_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)
    
    db.commit()
    db.refresh(db_post)
    
    return db_post


@router.delete("/{post_id}", response_model=SuccessResponse)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a post"""
    # Get the post
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user owns the post or is admin
    if db_post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post"
        )
    
    db.delete(db_post)
    db.commit()
    
    return SuccessResponse(message="Post deleted successfully")


@router.get("/user/my-posts", response_model=PostListResponse)
async def get_user_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's posts"""
    offset = (page - 1) * per_page
    
    # Get total count
    total = db.query(Post).filter(Post.author_id == current_user.id).count()
    
    # Get posts
    posts = db.query(Post).filter(Post.author_id == current_user.id)\
        .order_by(desc(Post.created_at))\
        .offset(offset)\
        .limit(per_page)\
        .all()
    
    total_pages = ceil(total / per_page)
    
    return PostListResponse(
        posts=posts,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

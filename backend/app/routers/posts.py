from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import get_current_active_user
from ..config import get_settings
from ..models import PostCreate, PostListResponse, PostResponse, PostUpdate, UserInDB
from ..repositories import PostRepository

settings = get_settings()
router = APIRouter()


# Success response model
class SuccessResponse:
    def __init__(self, message: str, success: bool = True):
        self.message = message
        self.success = success


@router.get("/", response_model=PostListResponse)
async def get_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(None),
):
    """Get paginated list of published posts"""
    if per_page is None:
        per_page = settings.no_of_posts_per_page

    posts, total = await PostRepository.get_posts_paginated(
        page, per_page, published_only=True
    )
    total_pages = ceil(total / per_page)

    return PostListResponse(
        posts=[PostResponse(**post.model_dump()) for post in posts],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{slug}", response_model=PostResponse)
async def get_post_by_slug(slug: str):
    """Get a specific post by slug"""
    post = await PostRepository.get_post_by_slug(slug)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return PostResponse(**post.model_dump())


@router.post("/create_post", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Create a new post"""
    # Check if slug already exists
    if await PostRepository.slug_exists(post.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists"
        )
    db_post = await PostRepository.create_post(
        post, current_user.id, current_user.name, post.is_published
    )
    return PostResponse(**db_post.model_dump())


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Update an existing post"""
    # Get the post
    db_post = await PostRepository.get_post_by_id(post_id)
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    # Check if user owns the post or is admin
    if db_post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    # Check if new slug already exists (if changing slug)
    if post_update.slug and post_update.slug != db_post.slug:
        if await PostRepository.slug_exists(post_update.slug, exclude_id=post_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists"
            )

    updated_post = await PostRepository.update_post(post_id, post_update)
    if not updated_post:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update post",
        )

    return PostResponse(**updated_post.model_dump())


@router.delete("/delete/{post_id}")
async def delete_post(
    post_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Delete a post"""
    # Get the post
    db_post = await PostRepository.get_post_by_id(post_id)
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    # Check if user owns the post or is admin
    if db_post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    success = await PostRepository.delete_post(post_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete post",
        )

    return {"message": "Post deleted successfully", "success": True}


@router.get("/user/my-posts", response_model=PostListResponse)
async def get_user_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Get current user's posts"""
    posts, total = await PostRepository.get_posts_by_author(
        author_id=current_user.id, page=page, per_page=per_page
    )
    total_pages = ceil(total / per_page)

    return PostListResponse(
        posts=[PostResponse(**post.model_dump()) for post in posts],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.put("/{post_id}/toggle-visibility")
async def toggle_post_visibility(
    post_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Toggle post visibility (published/unpublished)"""
    # Get the post
    db_post = await PostRepository.get_post_by_id(post_id)
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    # Check if user owns the post or is admin
    if db_post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this post",
        )

    # Toggle visibility
    new_status = not db_post.is_published
    post_update = PostUpdate(is_published=new_status)

    updated_post = await PostRepository.update_post(post_id, post_update)
    if not updated_post:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update post visibility",
        )

    status_text = "published" if new_status else "unpublished"
    return {
        "message": f"Post {status_text} successfully",
        "success": True,
        "is_published": new_status,
    }


@router.get("/user/all-posts", response_model=PostListResponse)
async def get_all_user_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    show_unpublished: bool = Query(),
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Get current user's posts (including unpublished if requested)"""
    if show_unpublished:
        is_published = False
    else:
        is_published = True

    posts, total = await PostRepository.get_posts_by_author(
        author_id=current_user.id,
        is_published=is_published,
        page=page,
        per_page=per_page,
    )

    total_pages = ceil(total / per_page)

    return PostListResponse(
        posts=[PostResponse(**post.model_dump()) for post in posts],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )

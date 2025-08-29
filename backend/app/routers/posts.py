import uuid
from math import ceil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse

from ..auth import get_current_active_user_from_request
from ..config import get_settings
from ..models import PostCreate, PostListResponse, PostResponse, PostUpdate
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
    page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100)
):
    """Get all published posts with pagination"""
    posts, total = await PostRepository.get_posts_paginated(
        page=page, per_page=per_page, published_only=True
    )
    total_pages = ceil(total / per_page)

    return PostListResponse(
        posts=[PostResponse(**post.model_dump()) for post in posts],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/upload-image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
):
    """Upload an image for blog posts"""
    current_user = await get_current_active_user_from_request(request)
    # Check file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPEG, PNG, GIF, WebP) are allowed",
        )

    # Check file size (5MB limit)
    file_size = 0
    content = await file.read()
    file_size = len(content)

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size too large. Maximum size is 5MB",
        )

    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)

    # Save file
    file_path = upload_dir / unique_filename

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Return the URL for the uploaded image
    return {"url": f"/uploads/{unique_filename}", "filename": unique_filename}


@router.get("/uploads/{filename}")
async def serve_uploaded_file(filename: str):
    """Serve uploaded images"""
    file_path = Path("uploads") / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    return FileResponse(file_path)


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
    request: Request,
):
    """Create a new post"""
    current_user = await get_current_active_user_from_request(request)
    # Check if slug already exists
    if await PostRepository.slug_exists(post.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists"
        )
    if len(post.title) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title must be less than or equal to 100 characters",
        )
    if len(post.tagline) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tagline must be less than or equal to 100 characters",
        )
    if len(post.slug) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug must be less than or equal to 100 characters",
        )
    db_post = await PostRepository.create_post(
        post, current_user.id, current_user.name, post.is_published
    )
    return PostResponse(**db_post.model_dump())


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    request: Request,
):
    """Update an existing post"""
    current_user = await get_current_active_user_from_request(request)
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

    # Update the post
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
    request: Request,
):
    """Delete a post"""
    current_user = await get_current_active_user_from_request(request)
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

    # Delete the post
    success = await PostRepository.delete_post(post_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete post",
        )

    return {"message": "Post deleted successfully", "success": True}


@router.get("/user/my-post", response_model=PostResponse)
async def get_user_posts(
    request: Request,
    post_id: int,
):
    """Get current user's posts"""
    current_user = await get_current_active_user_from_request(request)
    post = await PostRepository.get_post_by_id(post_id=post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this post",
        )

    return post


@router.put("/{post_id}/toggle-visibility")
async def toggle_post_visibility(
    post_id: int,
    request: Request,
):
    """Toggle post visibility (published/unpublished)"""
    current_user = await get_current_active_user_from_request(request)
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

    # Toggle the published status
    new_status = not db_post.is_published

    # Use PostUpdate to update just the is_published field
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
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    show_unpublished: bool = Query(),
):
    """Get current user's posts (including unpublished if requested)"""
    current_user = await get_current_active_user_from_request(request)
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

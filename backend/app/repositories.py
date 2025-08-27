from typing import List, Optional

from .database import db_manager
from .models import (
    ContactCreate,
    ContactInDB,
    PostCreate,
    PostInDB,
    PostUpdate,
    UserCreate,
    UserInDB,
    UserUpdate,
)


class UserRepository:
    """Repository for user database operations"""

    @staticmethod
    async def create_user(user: UserCreate, hashed_password: str) -> UserInDB:
        """Create a new user"""
        query = """
            INSERT INTO users (name, email, password, is_admin)
            VALUES (:name, :email, :password, :is_admin)
            RETURNING id, name, email, password, is_active, is_admin, created_at, updated_at
        """
        values = {
            "name": user.name,
            "email": user.email,
            "password": hashed_password,
            "is_admin": False,  # You can modify this logic as needed
        }

        result = await db_manager.execute_one(query, values)
        return UserInDB(**result)

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserInDB]:
        """Get user by email"""
        query = "SELECT * FROM users WHERE email = :email"
        result = await db_manager.execute_one(query, {"email": email})
        return UserInDB(**result) if result else None

    @staticmethod
    async def get_user_by_id(user_id: int) -> Optional[UserInDB]:
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = :id"
        result = await db_manager.execute_one(query, {"id": user_id})
        return UserInDB(**result) if result else None

    @staticmethod
    async def update_user(user_id: int, user_update: UserUpdate) -> Optional[UserInDB]:
        """Update user"""
        update_fields = []
        values = {"id": user_id}

        if user_update.name:
            update_fields.append("name = :name")
            values["name"] = user_update.name

        if user_update.email:
            update_fields.append("email = :email")
            values["email"] = user_update.email

        if user_update.is_active is not None:
            update_fields.append("is_active = :is_active")
            values["is_active"] = user_update.is_active

        if not update_fields:
            return await UserRepository.get_user_by_id(user_id)

        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        user_update_query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = :id
            RETURNING id, name, email, password, is_active, is_admin, created_at, updated_at
        """
        if user_update.name:
            post_update_query = """
                UPDATE posts 
                SET author_name = :name
                WHERE author_id = :id
                RETURNING id
            """
            await db_manager.execute_one(post_update_query, values)

        result = await db_manager.execute_one(user_update_query, values)
        return UserInDB(**result) if result else None

    @staticmethod
    async def update_password(user_id: int, hashed_password: str) -> bool:
        """Update user password"""
        query = """
            UPDATE users 
            SET password = :password, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id
        """
        values = {"id": user_id, "password": hashed_password}

        result = await db_manager.execute_one(query, values)
        return result is not None


class PostRepository:
    """Repository for post database operations"""

    @staticmethod
    async def create_post(
        post: PostCreate, author_id: int, author_name: str, is_published: bool
    ) -> PostInDB:
        """Create a new post"""
        query = """
            INSERT INTO posts (title, tagline, slug, content, img_file, author_id, author_name, is_published)
            VALUES (:title, :tagline, :slug, :content, :img_file, :author_id, :author_name, :is_published)
            RETURNING id, title, tagline, slug, content, img_file, author_id, author_name, 
                     is_published, created_at, updated_at
        """
        values = {
            "title": post.title,
            "tagline": post.tagline,
            "slug": post.slug,
            "content": post.content,
            "img_file": post.img_file,
            "author_id": author_id,
            "author_name": author_name,
            "is_published": is_published,
        }

        result = await db_manager.execute_one(query, values)
        return PostInDB(**result)

    @staticmethod
    async def get_posts_paginated(
        page: int = 1, per_page: int = 10, published_only: bool = True
    ) -> tuple[List[PostInDB], int]:
        """Get paginated posts"""
        offset = (page - 1) * per_page

        # Count total posts
        count_query = "SELECT COUNT(*) as total FROM posts"
        if published_only:
            count_query += " WHERE is_published = true"

        count_result = await db_manager.execute_one(count_query)
        total = count_result["total"]

        # Get posts
        query = """
            SELECT * FROM posts
            WHERE is_published = :published
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """

        if not published_only:
            query = """
                SELECT * FROM posts
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """
            values = {"limit": per_page, "offset": offset}
        else:
            values = {"published": True, "limit": per_page, "offset": offset}

        results = await db_manager.execute_query(query, values)
        posts = [PostInDB(**row) for row in results]

        return posts, total

    @staticmethod
    async def get_post_by_slug(slug: str) -> Optional[PostInDB]:
        """Get post by slug"""
        query = "SELECT * FROM posts WHERE slug = :slug AND is_published = true"
        result = await db_manager.execute_one(query, {"slug": slug})
        return PostInDB(**result) if result else None

    @staticmethod
    async def get_post_by_id(post_id: int) -> Optional[PostInDB]:
        """Get post by ID"""
        query = "SELECT * FROM posts WHERE id = :id"
        result = await db_manager.execute_one(query, {"id": post_id})
        return PostInDB(**result) if result else None

    @staticmethod
    async def get_posts_by_author(
        author_id: int, is_published: bool, page: int = 1, per_page: int = 10
    ) -> tuple[List[PostInDB], int]:
        """Get posts by author with pagination"""
        offset = (page - 1) * per_page

        # Count total posts by author
        count_query = "SELECT COUNT(*) as total FROM posts WHERE author_id = :author_id and is_published = :is_published"
        count_result = await db_manager.execute_one(
            count_query, {"author_id": author_id, "is_published": is_published}
        )
        total = count_result["total"]

        # Get posts
        query = """
            SELECT * FROM posts
            WHERE author_id = :author_id and is_published = :is_published
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        values = {
            "author_id": author_id,
            "is_published": is_published,
            "limit": per_page,
            "offset": offset,
        }

        results = await db_manager.execute_query(query, values)
        posts = [PostInDB(**row) for row in results]

        return posts, total

    @staticmethod
    async def update_post(post_id: int, post_update: PostUpdate) -> Optional[PostInDB]:
        """Update post"""
        update_fields = []
        values = {"id": post_id}

        if post_update.title:
            update_fields.append("title = :title")
            values["title"] = post_update.title

        if post_update.tagline is not None:
            update_fields.append("tagline = :tagline")
            values["tagline"] = post_update.tagline

        if post_update.slug:
            update_fields.append("slug = :slug")
            values["slug"] = post_update.slug

        if post_update.content:
            update_fields.append("content = :content")
            values["content"] = post_update.content

        if post_update.img_file is not None:
            update_fields.append("img_file = :img_file")
            values["img_file"] = post_update.img_file

        if post_update.is_published is not None:
            update_fields.append("is_published = :is_published")
            values["is_published"] = post_update.is_published

        if not update_fields:
            return await PostRepository.get_post_by_id(post_id)

        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        query = f"""
            UPDATE posts 
            SET {', '.join(update_fields)}
            WHERE id = :id
            RETURNING id, title, tagline, slug, content, img_file, author_id, author_name,
                     is_published, created_at, updated_at
        """

        result = await db_manager.execute_one(query, values)
        return PostInDB(**result) if result else None

    @staticmethod
    async def delete_post(post_id: int) -> bool:
        """Delete post"""
        query = "DELETE FROM posts WHERE id = :id"
        result = await db_manager.execute_delete(query, {"id": post_id})
        return result > 0

    @staticmethod
    async def slug_exists(slug: str, exclude_id: Optional[int] = None) -> bool:
        """Check if slug already exists"""
        query = "SELECT COUNT(*) as count FROM posts WHERE slug = :slug"
        values = {"slug": slug}

        if exclude_id:
            query += " AND id != :exclude_id"
            values["exclude_id"] = exclude_id

        result = await db_manager.execute_one(query, values)
        return result["count"] > 0


class ContactRepository:
    """Repository for contact database operations"""

    @staticmethod
    async def create_contact(contact: ContactCreate) -> ContactInDB:
        """Create a new contact message"""
        query = """
            INSERT INTO contacts (name, email, phone, message)
            VALUES (:name, :email, :phone, :message)
            RETURNING id, name, email, phone, message, is_read, created_at
        """
        values = {
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone,
            "message": contact.message,
        }

        result = await db_manager.execute_one(query, values)
        return ContactInDB(**result)

    @staticmethod
    async def get_contacts(skip: int = 0, limit: int = 100) -> List[ContactInDB]:
        """Get contact messages with pagination"""
        query = """
            SELECT * FROM contacts
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        values = {"limit": limit, "offset": skip}

        results = await db_manager.execute_query(query, values)
        return [ContactInDB(**row) for row in results]

    @staticmethod
    async def mark_contact_as_read(contact_id: int) -> Optional[ContactInDB]:
        """Mark contact message as read"""
        query = """
            UPDATE contacts 
            SET is_read = true
            WHERE id = :id
            RETURNING id, name, email, phone, message, is_read, created_at
        """
        result = await db_manager.execute_one(query, {"id": contact_id})
        return ContactInDB(**result) if result else None

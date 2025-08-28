from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database settings
    database_url: str = "postgresql://username:password@localhost/blog_db"
    max_connections: int = 20
    min_connections: int = 1
    command_timeout: int = 60

    # Security settings
    secret_key: str = "super-secret-key"
    csrf_secret_key: str = "b_53oi3uriq9pifpff;apl"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Blog settings
    blog_name: str = "Python Coders"
    blog_title: str = "Start learning today"
    no_of_posts_per_page: int = 10

    # File upload settings
    upload_location: str = "./uploads"
    max_content_length: int = 16 * 1024 * 1024  # 16MB
    allowed_extensions: set = {"txt", "pdf", "png", "jpg", "jpeg", "gif"}

    # Social media URLs
    twitter_url: str = "https://twitter.com/"
    facebook_url: str = "https://www.facebook.com/"
    github_url: str = "https://github.com/"

    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ]

    # API settings
    api_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

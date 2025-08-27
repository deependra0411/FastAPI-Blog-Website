import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import close_db, init_db
from .routers import auth, contact, posts

# Get settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app startup and shutdown"""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="Blog API",
    description="A modern blog API built with FastAPI and PostgreSQL",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
os.makedirs(settings.upload_location, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=settings.upload_location), name="uploads")

# Include routers
app.include_router(
    auth.router, prefix=f"{settings.api_prefix}/auth", tags=["Authentication"]
)
app.include_router(posts.router, prefix=f"{settings.api_prefix}/posts", tags=["Posts"])
app.include_router(
    contact.router, prefix=f"{settings.api_prefix}/contact", tags=["Contact"]
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to the Blog API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.api_prefix,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "API is running"}


@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404, content={"message": "Resource not found", "success": False}
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    return JSONResponse(
        status_code=500, content={"message": "Internal server error", "success": False}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

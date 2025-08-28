import asyncpg
from databases import Database

from .config import get_settings

settings = get_settings()

# Create Database instance
database = Database(settings.database_url)

# Database connection pool
connection_pool = None


async def get_database():
    """Dependency to get database connection"""
    return database


async def init_db():
    """Initialize database connection and create tables"""
    global connection_pool

    # Create connection pool with minimal connections for Aiven free tier
    connection_pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=settings.min_connections,
        max_size=settings.max_connections,
        command_timeout=settings.command_timeout,
    )

    # Connect to database
    await database.connect()

    # Create tables
    await create_tables()


async def close_db():
    """Close database connections"""
    global connection_pool

    await database.disconnect()

    if connection_pool:
        await connection_pool.close()


async def create_tables():
    """Create database tables using raw SQL"""

    # Users table
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Posts table
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            tagline VARCHAR(100),
            slug VARCHAR(100) UNIQUE NOT NULL,
            content TEXT NOT NULL,
            img_file VARCHAR(255),
            author_id INTEGER NOT NULL,
            author_name VARCHAR(255) NOT NULL,
            is_published BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Contacts table
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200) NOT NULL,
            phone VARCHAR(20),
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create indexes for better performance
    await database.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    await database.execute("CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)")
    await database.execute(
        "CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)"
    )
    await database.execute(
        "CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published)"
    )


# Database utility functions
class DatabaseManager:
    """Database manager with raw SQL operations"""

    @staticmethod
    async def execute_query(query: str, values: dict = None):
        """Execute a query and return results"""
        if values:
            return await database.fetch_all(query, values)
        return await database.fetch_all(query)

    @staticmethod
    async def execute_one(query: str, values: dict = None):
        """Execute a query and return one result"""
        if values:
            return await database.fetch_one(query, values)
        return await database.fetch_one(query)

    @staticmethod
    async def execute_insert(query: str, values: dict):
        """Execute an insert query and return the inserted ID"""
        return await database.execute(query, values)

    @staticmethod
    async def execute_update(query: str, values: dict):
        """Execute an update query"""
        return await database.execute(query, values)

    @staticmethod
    async def execute_delete(query: str, values: dict):
        """Execute a delete query"""
        return await database.execute(query, values)


# Create global database manager instance
db_manager = DatabaseManager()

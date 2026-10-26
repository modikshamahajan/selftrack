from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, event
from app.core.config import settings

# Engine configuration
connect_args = {"check_same_thread": False, "timeout": 30} if "sqlite" in settings.DATABASE_URL else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        # SQLite production concurrency settings
        if "sqlite" in settings.DATABASE_URL:
            try:
                await conn.execute(text("PRAGMA journal_mode = WAL"))
                await conn.execute(text("PRAGMA synchronous = NORMAL"))
                await conn.execute(text("PRAGMA busy_timeout = 5000"))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN last_active_at DATETIME"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN platform VARCHAR(50) DEFAULT 'unknown'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE app_downloads ADD COLUMN app_version VARCHAR(50) DEFAULT '1.0.0'"))
        except Exception:
            pass

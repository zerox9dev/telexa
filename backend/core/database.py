from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from core.config import get_async_database_url

engine = create_async_engine(
    get_async_database_url(), echo=False, connect_args={"ssl": "prefer"}
)
async_session_factory = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


class Base(DeclarativeBase):
    pass


async def create_all_tables() -> None:
    """Create any missing tables from the SQLAlchemy models on startup.

    This replaces Alembic for this single-user app. On an existing DB it's a
    no-op (only *missing* tables are created); it does NOT alter existing
    tables, so a breaking model change still needs manual SQL or a fresh DB."""
    import models  # importing registers every table on the shared metadata
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


async def get_db():
    async with async_session_factory() as session:
        yield session

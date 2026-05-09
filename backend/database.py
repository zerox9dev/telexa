from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import get_settings
from urllib.parse import urlparse, parse_qs

settings = get_settings()

parsed = urlparse(settings.database_url)
query = parse_qs(parsed.query)
query.pop("sslmode", None)
query.pop("channel_binding", None)
new_query = "&".join(f"{k}={v[0]}" for k, v in query.items())
new_url = parsed._replace(query=new_query).geturl()

engine = create_async_engine(new_url, echo=False, connect_args={"ssl": "prefer"})
async_session_factory = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_factory() as session:
        yield session

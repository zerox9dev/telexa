from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import TelegramSession
from settings_store import get_telegram_config


async def require_auth(db: AsyncSession = Depends(get_db)) -> TelegramSession:
    cfg = await get_telegram_config(db)
    if not cfg.allowed_user_id:
        raise HTTPException(status_code=503, detail="Server not configured")
    result = await db.execute(
        select(TelegramSession).where(TelegramSession.user_id == cfg.allowed_user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session

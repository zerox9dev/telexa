from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models import Setting


@dataclass
class TelegramConfig:
    api_id: int | None
    api_hash: str | None
    bot_token: str | None
    allowed_user_id: int | None

    @property
    def is_complete(self) -> bool:
        return all([self.api_id, self.api_hash, self.bot_token, self.allowed_user_id])


async def get_setting(db: AsyncSession, key: str) -> str | None:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else None


async def set_setting(db: AsyncSession, key: str, value: str | None) -> None:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        db.add(Setting(key=key, value=value))
    else:
        row.value = value


def _maybe_int(v: str | None) -> int | None:
    if not v:
        return None
    try:
        return int(v)
    except ValueError:
        return None


async def get_telegram_config(db: AsyncSession) -> TelegramConfig:
    """DB is the source of truth. .env values are used only as fallback so
    existing installations keep working until the operator migrates via /setup
    or the Admin page."""
    s = get_settings()
    api_id = _maybe_int(await get_setting(db, "telegram_api_id")) or s.telegram_api_id
    api_hash = await get_setting(db, "telegram_api_hash") or s.telegram_api_hash
    bot_token = await get_setting(db, "telegram_bot_token") or s.telegram_bot_token
    allowed = _maybe_int(await get_setting(db, "allowed_user_id")) or s.allowed_user_id
    return TelegramConfig(
        api_id=api_id,
        api_hash=api_hash,
        bot_token=bot_token,
        allowed_user_id=allowed,
    )

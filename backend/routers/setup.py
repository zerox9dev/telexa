from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from settings_store import get_telegram_config, set_setting

router = APIRouter(prefix="/setup", tags=["setup"])


class SetupBody(BaseModel):
    telegram_api_id: int
    telegram_api_hash: str
    telegram_bot_token: str
    allowed_user_id: int


@router.get("/status")
async def setup_status(db: AsyncSession = Depends(get_db)):
    cfg = await get_telegram_config(db)
    return {
        "data": {
            "configured": cfg.is_complete,
            "api_id_set": bool(cfg.api_id),
            "api_hash_set": bool(cfg.api_hash),
            "bot_token_set": bool(cfg.bot_token),
            "allowed_user_id_set": bool(cfg.allowed_user_id),
        },
        "error": None,
    }


@router.post("/init")
async def setup_init(body: SetupBody, db: AsyncSession = Depends(get_db)):
    """Open endpoint — only writable while the server is unconfigured.
    Once any complete config exists (DB or env fallback), this returns 409
    and the operator must use the authenticated /admin/settings endpoint."""
    cfg = await get_telegram_config(db)
    if cfg.is_complete:
        raise HTTPException(
            status_code=409,
            detail="Already configured. Edit telegram settings via /admin/settings.",
        )

    await set_setting(db, "telegram_api_id", str(body.telegram_api_id))
    await set_setting(db, "telegram_api_hash", body.telegram_api_hash.strip())
    await set_setting(db, "telegram_bot_token", body.telegram_bot_token.strip())
    await set_setting(db, "allowed_user_id", str(body.allowed_user_id))
    await db.commit()
    return {"data": {"ok": True}, "error": None}

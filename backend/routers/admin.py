import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import PublishLog, Post
from deps import require_auth
from settings_store import get_setting, set_setting

router = APIRouter(prefix="/admin", tags=["admin"])

DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini"
ALLOWED_PARSE_MODES = {"none", "html", "markdown"}


class SettingsBody(BaseModel):
    openrouter_api_key: str | None = None
    openrouter_model: str | None = None
    bot_parse_mode: str | None = None
    telegram_api_id: int | None = None
    telegram_api_hash: str | None = None
    telegram_bot_token: str | None = None
    allowed_user_id: int | None = None


@router.get("/settings")
async def get_settings_endpoint(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    api_key = await get_setting(db, "openrouter_api_key") or ""
    model = await get_setting(db, "openrouter_model") or ""
    parse_mode = await get_setting(db, "bot_parse_mode") or "none"
    api_id = await get_setting(db, "telegram_api_id") or ""
    api_hash = await get_setting(db, "telegram_api_hash") or ""
    bot_token = await get_setting(db, "telegram_bot_token") or ""
    allowed_user_id = await get_setting(db, "allowed_user_id") or ""
    return {
        "data": {
            "openrouter_api_key": api_key,
            "openrouter_model": model,
            "default_model": DEFAULT_OPENROUTER_MODEL,
            "bot_parse_mode": parse_mode,
            "telegram_api_id": api_id,
            "telegram_api_hash": api_hash,
            "telegram_bot_token": bot_token,
            "allowed_user_id": allowed_user_id,
        },
        "error": None,
    }


@router.put("/settings")
async def update_settings_endpoint(
    body: SettingsBody,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    if body.openrouter_api_key is not None:
        await set_setting(db, "openrouter_api_key", body.openrouter_api_key.strip() or None)
    if body.openrouter_model is not None:
        await set_setting(db, "openrouter_model", body.openrouter_model.strip() or None)
    if body.bot_parse_mode is not None:
        value = body.bot_parse_mode.strip().lower()
        if value not in ALLOWED_PARSE_MODES:
            raise HTTPException(
                status_code=400,
                detail=f"bot_parse_mode must be one of {sorted(ALLOWED_PARSE_MODES)}",
            )
        await set_setting(db, "bot_parse_mode", value)
    if body.telegram_api_id is not None:
        await set_setting(db, "telegram_api_id", str(body.telegram_api_id))
    if body.telegram_api_hash is not None:
        await set_setting(db, "telegram_api_hash", body.telegram_api_hash.strip() or None)
    if body.telegram_bot_token is not None:
        await set_setting(db, "telegram_bot_token", body.telegram_bot_token.strip() or None)
    if body.allowed_user_id is not None:
        await set_setting(db, "allowed_user_id", str(body.allowed_user_id))
    await db.commit()
    return {"data": {"ok": True}, "error": None}


@router.get("/openrouter-models")
async def list_openrouter_models(_=Depends(require_auth)):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get("https://openrouter.ai/api/v1/models")
        resp.raise_for_status()
        body = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter unreachable: {e}")

    models = []
    for m in body.get("data", []):
        models.append({
            "id": m.get("id"),
            "name": m.get("name") or m.get("id"),
            "context_length": m.get("context_length"),
            "pricing": m.get("pricing"),
        })
    models.sort(key=lambda m: (m.get("name") or "").lower())
    return {"data": models, "error": None}


@router.get("/logs")
async def get_logs(
    from_: str | None = None,
    to: str | None = None,
    source_channel: str | None = None,
    target_channel: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    query = select(PublishLog).order_by(PublishLog.published_at.desc()).limit(100)

    if from_:
        from datetime import datetime
        query = query.where(PublishLog.published_at >= datetime.fromisoformat(from_))
    if to:
        from datetime import datetime
        query = query.where(PublishLog.published_at <= datetime.fromisoformat(to))
    if source_channel:
        query = query.where(PublishLog.source_channel_username.ilike(f"%{source_channel}%"))
    if target_channel:
        query = query.where(PublishLog.target_channel_username.ilike(f"%{target_channel}%"))

    result = await db.execute(query)
    logs = result.scalars().all()
    return {"data": jsonable_encoder(logs), "error": None}


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    total_parsed = await db.scalar(select(func.count(Post.id)))
    total_sent = await db.scalar(
        select(func.count(Post.id)).where(Post.status == "sent")
    )
    total_discarded = await db.scalar(
        select(func.count(Post.id)).where(Post.status == "discarded")
    )

    return {
        "data": {
            "total_parsed": total_parsed or 0,
            "total_sent": total_sent or 0,
            "total_discarded": total_discarded or 0,
        },
        "error": None,
    }

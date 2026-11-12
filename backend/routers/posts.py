from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_db
from core.security import require_auth
from models import Post, SourceChannel, MyChannel
from services import posts as posts_service
from services.posts import serialize_post
from services.settings import get_telegram_config

router = APIRouter(prefix="/posts", tags=["posts"])


class PatchPostBody(BaseModel):
    rewritten_text: str


async def _get_post(db: AsyncSession, post_id: int) -> Post:
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/fetch")
async def fetch_posts(
    source_channel_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    source = (await db.execute(
        select(SourceChannel).where(SourceChannel.id == source_channel_id)
    )).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source channel not found")

    new_posts = await posts_service.fetch_new_posts(db, source)
    return {"data": [serialize_post(p) for p in new_posts], "error": None}


@router.get("")
async def list_posts(
    source_channel_id: int,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    query = select(Post).where(Post.source_channel_id == source_channel_id)
    if status:
        query = query.where(Post.status == status)
    query = query.order_by(Post.created_at.desc())

    posts = (await db.execute(query)).scalars().all()
    return {"data": [serialize_post(p) for p in posts], "error": None}


@router.post("/{post_id}/rewrite")
async def rewrite_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    post = await _get_post(db, post_id)
    if not post.original_text:
        raise HTTPException(status_code=400, detail="Post has no text to rewrite")

    rewritten = await posts_service.rewrite_post(db, post)
    return {"data": {"rewritten_text": rewritten}, "error": None}


@router.patch("/{post_id}")
async def patch_post(
    post_id: int,
    body: PatchPostBody,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    post = await _get_post(db, post_id)
    post.rewritten_text = body.rewritten_text
    if post.status == "new":
        post.status = "ready"
    await db.commit()
    return {"data": serialize_post(post), "error": None}


@router.post("/{post_id}/publish")
async def publish_post(
    post_id: int,
    target_channel_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    tg_cfg = await get_telegram_config(db)
    if not tg_cfg.bot_token:
        raise HTTPException(status_code=503, detail="Bot token not configured")

    post = await _get_post(db, post_id)
    target = (await db.execute(
        select(MyChannel).where(MyChannel.id == target_channel_id)
    )).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target channel not found")

    try:
        sent_at = await posts_service.publish_post(
            db, post, target, bot_token=tg_cfg.bot_token
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Telegram Bot API error: {e}")

    return {"data": {"sent_at": sent_at.isoformat()}, "error": None}


@router.post("/{post_id}/discard")
async def discard_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    post = await _get_post(db, post_id)
    post.status = "discarded"
    await db.commit()
    return {"data": {"ok": True}, "error": None}

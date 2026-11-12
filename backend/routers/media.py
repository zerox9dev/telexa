from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import undefer
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models import Media

# Served at /media/{id} (no /api prefix) so <img>/<video> tags can point
# straight at it; nginx and the Vite dev server both proxy /media to the app.
router = APIRouter(prefix="/media", tags=["media"])


@router.get("/{media_id}")
async def get_media(media_id: int, db: AsyncSession = Depends(get_db)):
    media = (await db.execute(
        select(Media).options(undefer(Media.content)).where(Media.id == media_id)
    )).scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    return Response(
        content=media.content,
        media_type=media.mime or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )

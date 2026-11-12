"""Shared post pipeline: fetch → rewrite → publish.

Both the interactive routers (``routers/posts.py``) and the background worker
(``services/autopilot.py``) drive the exact same steps, so the logic lives here
once and callers only decide *when* to run it.
"""
from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import undefer
from sqlalchemy.ext.asyncio import AsyncSession

from models import Post, Media, MyChannel, SourceChannel, PublishLog
from services import settings as settings_store
from integrations import telegram as tg
from integrations import bot_api, ai


def serialize_post(post: Post) -> dict:
    """JSON-safe view of a post. Media is exposed as ``{id, type, url}`` — the
    raw bytes live in the DB and are served separately by ``/media/{id}``."""
    return {
        "id": post.id,
        "source_channel_id": post.source_channel_id,
        "message_id": post.message_id,
        "original_text": post.original_text,
        "rewritten_text": post.rewritten_text,
        "status": post.status,
        "target_channel_id": post.target_channel_id,
        "sent_at": post.sent_at.isoformat() if post.sent_at else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "media": [
            {"id": m.id, "type": m.media_type, "url": f"/media/{m.id}"}
            for m in post.media
        ],
    }


async def _get_source(db: AsyncSession, source_channel_id: int) -> SourceChannel | None:
    result = await db.execute(
        select(SourceChannel).where(SourceChannel.id == source_channel_id)
    )
    return result.scalar_one_or_none()


async def fetch_new_posts(db: AsyncSession, source: SourceChannel) -> list[Post]:
    """Pull recent messages from a source channel, dedup against stored posts,
    download media, and persist any new posts (status ``new``)."""
    client = await tg.get_client()
    messages = await tg.fetch_posts(client, source.username, limit=50)

    # Group messages by grouped_id (Telegram albums); ungrouped go solo.
    grouped: dict[int, list] = defaultdict(list)
    ungrouped: list = []
    for msg in messages:
        if not msg.text and not msg.media:
            continue
        if msg.grouped_id:
            grouped[msg.grouped_id].append(msg)
        else:
            ungrouped.append(msg)

    # Each "unit" is the list of messages forming one post.
    units: list[list] = [[msg] for msg in ungrouped]
    for group_msgs in grouped.values():
        units.append(sorted(group_msgs, key=lambda m: m.id))

    representative_ids = [unit[0].id for unit in units]
    existing_ids: set[int] = set()
    if representative_ids:
        rows = await db.execute(
            select(Post.message_id).where(
                Post.source_channel_id == source.id,
                Post.message_id.in_(representative_ids),
            )
        )
        existing_ids = set(rows.scalars().all())

    new_posts: list[Post] = []
    for unit in units:
        rep = unit[0]
        if rep.id in existing_ids:
            continue

        post = Post(
            source_channel_id=source.id,
            message_id=rep.id,
            original_text="",
            status="new",
        )
        position = 0
        for msg in unit:
            if msg.text:
                post.original_text = msg.text
            if msg.media:
                for data, mtype, mime, filename in await tg.download_media(client, msg):
                    post.media.append(Media(
                        position=position,
                        media_type=mtype,
                        mime=mime,
                        filename=filename,
                        content=data,
                    ))
                    position += 1

        db.add(post)
        new_posts.append(post)

    await db.commit()
    return new_posts


async def rewrite_post(
    db: AsyncSession, post: Post, source: SourceChannel | None = None
) -> str:
    """Rewrite a post's text via the configured AI provider, mark it ``ready``,
    and commit. Caller must ensure ``post.original_text`` is non-empty."""
    if source is None:
        source = await _get_source(db, post.source_channel_id)

    api_key = await settings_store.get_setting(db, "openrouter_api_key")
    model = await settings_store.get_setting(db, "openrouter_model")
    rewritten = await ai.rewrite_post(
        post.original_text,
        api_key or "",
        prompt=source.prompt if source else None,
        use_local=not bool(api_key),
        model=model,
    )
    post.rewritten_text = rewritten
    post.status = "ready"
    await db.commit()
    return rewritten


async def publish_post(
    db: AsyncSession,
    post: Post,
    target: MyChannel,
    bot_token: str,
    source: SourceChannel | None = None,
) -> datetime:
    """Publish a post to a target channel via the Bot API, then mark it ``sent``
    and write a PublishLog. Raises on Bot API failure (nothing is committed)."""
    if source is None:
        source = await _get_source(db, post.source_channel_id)

    text = post.rewritten_text or post.original_text
    parse_mode = await settings_store.get_setting(db, "bot_parse_mode") or "none"

    # Load media rows *with* their bytes (content is deferred by default).
    media_rows = (await db.execute(
        select(Media)
        .options(undefer(Media.content))
        .where(Media.post_id == post.id)
        .order_by(Media.position)
    )).scalars().all()
    media = [
        bot_api.MediaFile(data=m.content, media_type=m.media_type, filename=m.filename or "file")
        for m in media_rows
    ]

    await bot_api.publish_post(
        channel_tg_id=f"-100{target.tg_id}",
        text=text,
        media=media,
        bot_token=bot_token,
        parse_mode=parse_mode,
    )

    sent_at = datetime.utcnow()
    post.status = "sent"
    post.sent_at = sent_at
    post.target_channel_id = target.id
    db.add(PublishLog(
        post_id=post.id,
        source_channel_username=source.username if source else "",
        target_channel_username=target.username,
        original_text_snippet=(post.original_text or "")[:300],
        rewritten_text_snippet=(post.rewritten_text or "")[:300] or None,
        media_count=len(media),
        published_at=sent_at,
    ))
    await db.commit()
    return sent_at

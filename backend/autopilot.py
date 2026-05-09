import asyncio
import logging
from collections import defaultdict
from datetime import datetime

from sqlalchemy import select

from database import async_session_factory
from models import MyChannel, Post, PublishLog, SourceChannel
from settings_store import get_setting, get_telegram_config
import ai_rewriter
import bot_publisher
import telegram_client as tc

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None
_running = False


async def _fetch_new_posts(db, source: SourceChannel) -> list[Post]:
    client = await tc.get_client()
    messages = await tc.fetch_posts(client, source.username, limit=50)

    grouped: dict[int, list] = defaultdict(list)
    ungrouped: list = []
    for msg in messages:
        if not msg.text and not msg.media:
            continue
        if msg.grouped_id:
            grouped[msg.grouped_id].append(msg)
        else:
            ungrouped.append(msg)

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

    import os
    new_posts: list[Post] = []
    for unit in units:
        rep = unit[0]
        if rep.id in existing_ids:
            continue

        media_paths: list[str] = []
        media_types: list[str] = []
        text = ""
        for msg in unit:
            if msg.text:
                text = msg.text
            if msg.media:
                save_dir = os.path.join("media", str(source.id), str(msg.id))
                results = await tc.download_media(client, msg, save_dir)
                for path, type_ in results:
                    rel = os.path.relpath(path).replace("\\", "/")
                    media_paths.append(rel)
                    media_types.append(type_)

        post = Post(
            source_channel_id=source.id,
            message_id=rep.id,
            original_text=text,
            media_paths=media_paths,
            media_types=media_types,
            status="new",
        )
        db.add(post)
        new_posts.append(post)

    await db.commit()
    for p in new_posts:
        await db.refresh(p)
    return new_posts


async def _run_cycle() -> None:
    async with async_session_factory() as db:
        enabled = await get_setting(db, "autopilot_enabled")
        if enabled != "true":
            return

        do_rewrite = await get_setting(db, "autopilot_rewrite") == "true"
        do_publish = await get_setting(db, "autopilot_publish") == "true"
        tg_cfg = await get_telegram_config(db)

        try:
            await tc.get_client()
        except RuntimeError:
            logger.warning("[autopilot] Telegram client not connected — skipping cycle")
            return

        sources_result = await db.execute(select(SourceChannel))
        sources = sources_result.scalars().all()

        for source in sources:
            try:
                new_posts = await _fetch_new_posts(db, source)
                logger.info(f"[autopilot] {source.username}: {len(new_posts)} new posts")
            except Exception as e:
                logger.error(f"[autopilot] fetch failed for {source.username}: {e}")
                continue

            for post in new_posts:
                if do_rewrite and post.original_text:
                    try:
                        api_key = await get_setting(db, "openrouter_api_key")
                        model = await get_setting(db, "openrouter_model")
                        use_local = not bool(api_key)
                        src_result = await db.execute(
                            select(SourceChannel).where(SourceChannel.id == post.source_channel_id)
                        )
                        src = src_result.scalar_one_or_none()
                        rewritten = await ai_rewriter.rewrite_post(
                            post.original_text,
                            api_key or "",
                            prompt=src.prompt if src else None,
                            use_local=use_local,
                            model=model,
                        )
                        post.rewritten_text = rewritten
                        post.status = "ready"
                        await db.commit()
                    except Exception as e:
                        logger.error(f"[autopilot] rewrite failed for post {post.id}: {e}")
                        continue
                elif not do_rewrite:
                    post.status = "ready"
                    await db.commit()

                if do_publish and post.status == "ready":
                    target_result = await db.execute(
                        select(MyChannel).where(MyChannel.id == source.my_channel_id)
                    )
                    target = target_result.scalar_one_or_none()
                    if not target or not tg_cfg.bot_token:
                        continue

                    try:
                        text = post.rewritten_text or post.original_text
                        parse_mode = await get_setting(db, "bot_parse_mode") or "none"
                        await bot_publisher.publish_post(
                            channel_tg_id=f"-100{target.tg_id}",
                            text=text,
                            media_paths=post.media_paths or [],
                            media_types=post.media_types or [],
                            bot_token=tg_cfg.bot_token,
                            parse_mode=parse_mode,
                        )
                        sent_at = datetime.utcnow()
                        post.status = "sent"
                        post.sent_at = sent_at
                        post.target_channel_id = target.id
                        db.add(PublishLog(
                            post_id=post.id,
                            source_channel_username=source.username,
                            target_channel_username=target.username,
                            original_text_snippet=(post.original_text or "")[:300],
                            rewritten_text_snippet=(post.rewritten_text or "")[:300] or None,
                            media_count=len(post.media_paths or []),
                            published_at=sent_at,
                        ))
                        await db.commit()
                        logger.info(f"[autopilot] published post {post.id} → @{target.username}")
                    except Exception as e:
                        logger.error(f"[autopilot] publish failed for post {post.id}: {e}")


async def _loop() -> None:
    global _running
    logger.info("[autopilot] loop started")
    while _running:
        try:
            await _run_cycle()
        except Exception as e:
            logger.error(f"[autopilot] cycle error: {e}")

        # Re-read interval each cycle so changes take effect without restart
        try:
            async with async_session_factory() as db:
                raw = await get_setting(db, "autopilot_interval_minutes")
                minutes = max(1, int(raw or "30"))
        except Exception:
            minutes = 30

        logger.info(f"[autopilot] next cycle in {minutes}m")
        await asyncio.sleep(minutes * 60)


def start() -> None:
    global _task, _running
    if _task and not _task.done():
        return
    _running = True
    _task = asyncio.create_task(_loop())


def stop() -> None:
    global _task, _running
    _running = False
    if _task and not _task.done():
        _task.cancel()
        _task = None

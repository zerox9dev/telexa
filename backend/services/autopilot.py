import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from core.database import async_session_factory
from models import MyChannel, SourceChannel
from services import posts as posts_service
from services.settings import get_setting, get_telegram_config
from integrations import telegram as tg

logger = logging.getLogger(__name__)

_JOB_ID = "autopilot-cycle"
_scheduler = AsyncIOScheduler()


async def _process_post(db, post, source, *, do_rewrite, do_publish, tg_cfg) -> None:
    if do_rewrite and post.original_text:
        try:
            await posts_service.rewrite_post(db, post, source=source)
        except Exception as e:
            logger.error(f"[autopilot] rewrite failed for post {post.id}: {e}")
            return
    elif not do_rewrite:
        post.status = "ready"
        await db.commit()

    if not (do_publish and post.status == "ready"):
        return

    target = (await db.execute(
        select(MyChannel).where(MyChannel.id == source.my_channel_id)
    )).scalar_one_or_none()
    if not target or not tg_cfg.bot_token:
        return

    try:
        await posts_service.publish_post(
            db, post, target, bot_token=tg_cfg.bot_token, source=source
        )
        logger.info(f"[autopilot] published post {post.id} → @{target.username}")
    except Exception as e:
        logger.error(f"[autopilot] publish failed for post {post.id}: {e}")


async def _run_cycle() -> None:
    async with async_session_factory() as db:
        if await get_setting(db, "autopilot_enabled") != "true":
            return

        do_rewrite = await get_setting(db, "autopilot_rewrite") == "true"
        do_publish = await get_setting(db, "autopilot_publish") == "true"
        tg_cfg = await get_telegram_config(db)

        try:
            await tg.get_client()
        except RuntimeError:
            logger.warning("[autopilot] Telegram client not connected — skipping cycle")
            return

        sources = (await db.execute(select(SourceChannel))).scalars().all()
        for source in sources:
            try:
                new_posts = await posts_service.fetch_new_posts(db, source)
                logger.info(f"[autopilot] {source.username}: {len(new_posts)} new posts")
            except Exception as e:
                logger.error(f"[autopilot] fetch failed for {source.username}: {e}")
                continue

            for post in new_posts:
                await _process_post(
                    db, post, source,
                    do_rewrite=do_rewrite, do_publish=do_publish, tg_cfg=tg_cfg,
                )


# ── Scheduling (APScheduler) ─────────────────────────────────────

def start(interval_minutes: int) -> None:
    """Enable the autopilot: run a cycle now, then every ``interval_minutes``.
    Calling again while running just applies the new interval."""
    if not _scheduler.running:
        _scheduler.start()

    trigger = IntervalTrigger(minutes=interval_minutes)
    if _scheduler.get_job(_JOB_ID) is None:
        _scheduler.add_job(
            _run_cycle,
            trigger=trigger,
            id=_JOB_ID,
            max_instances=1,   # never overlap cycles
            coalesce=True,     # collapse missed runs into one
            next_run_time=datetime.now(),  # kick off immediately
        )
        logger.info(f"[autopilot] started, every {interval_minutes}m")
    else:
        _scheduler.reschedule_job(_JOB_ID, trigger=trigger)
        logger.info(f"[autopilot] interval updated to {interval_minutes}m")


def stop() -> None:
    if _scheduler.running and _scheduler.get_job(_JOB_ID):
        _scheduler.remove_job(_JOB_ID)
        logger.info("[autopilot] stopped")


def run_once() -> None:
    """Trigger one cycle immediately, independent of the schedule."""
    if not _scheduler.running:
        _scheduler.start()
    _scheduler.add_job(
        _run_cycle,
        id=f"{_JOB_ID}-manual",
        replace_existing=True,
        max_instances=1,
    )


async def shutdown() -> None:
    if _scheduler.running:
        try:
            _scheduler.shutdown(wait=False)
        except Exception as e:  # never block the rest of app teardown
            logger.warning(f"[autopilot] scheduler shutdown error: {e}")

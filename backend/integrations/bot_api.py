"""Publish posts to Telegram channels via the Bot API (aiogram).

aiogram gives us typed send_* calls, file uploads, media groups and parse-mode
escaping out of the box; tenacity wraps each call to retry transient failures.
"""
import logging
from dataclasses import dataclass

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import (
    TelegramNetworkError,
    TelegramRetryAfter,
    TelegramServerError,
)
from aiogram.types import BufferedInputFile, InputMediaPhoto, InputMediaVideo
from aiogram.utils.text_decorations import html_decoration, markdown_decoration
from tenacity import (
    AsyncRetrying,
    RetryCallState,
    retry_if_exception,
    stop_after_attempt,
)

logger = logging.getLogger(__name__)

# How many times we attempt a single Bot API call, and the longest 429
# retry_after we're willing to honor before giving up (so the worker can defer
# the post instead of sleeping for an hour).
MAX_RETRIES = 5
MAX_RETRY_AFTER_SECONDS = 300

# Maps the value stored in DB (settings.bot_parse_mode) to aiogram's ParseMode.
# None means: send plain text without a parse_mode.
PARSE_MODE_MAP = {
    "none": None,
    "html": ParseMode.HTML,
    "markdown": ParseMode.MARKDOWN_V2,
}


def _resolve_parse_mode(parse_mode: str | None) -> ParseMode | None:
    if parse_mode is None:
        return None
    return PARSE_MODE_MAP.get(parse_mode.lower())


def _escape(text: str, mode: ParseMode | None) -> str:
    """Escape user text for the chosen parse mode so stray ``_ * [`` etc. in the
    rewritten post don't break the message."""
    if mode == ParseMode.HTML:
        return html_decoration.quote(text)
    if mode == ParseMode.MARKDOWN_V2:
        return markdown_decoration.quote(text)
    return text


# ── Retry policy ─────────────────────────────────────────────────

def _should_retry(exc: BaseException) -> bool:
    if isinstance(exc, TelegramRetryAfter):
        return exc.retry_after <= MAX_RETRY_AFTER_SECONDS
    return isinstance(exc, (TelegramNetworkError, TelegramServerError))


def _wait(retry_state: RetryCallState) -> float:
    exc = retry_state.outcome.exception() if retry_state.outcome else None
    if isinstance(exc, TelegramRetryAfter):
        return exc.retry_after  # honor Telegram's flood-control hint exactly
    return min(2 ** (retry_state.attempt_number - 1), 30)  # exp backoff, capped


def _log_retry(retry_state: RetryCallState) -> None:
    exc = retry_state.outcome.exception() if retry_state.outcome else None
    logger.warning(f"Bot API retry (attempt {retry_state.attempt_number}): {exc}")


async def _send(func, /, **kwargs):
    async for attempt in AsyncRetrying(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=_wait,
        retry=retry_if_exception(_should_retry),
        before_sleep=_log_retry,
    ):
        with attempt:
            return await func(**kwargs)


# ── Publishing ───────────────────────────────────────────────────

@dataclass
class MediaFile:
    """One piece of media to publish, loaded from the DB into memory."""
    data: bytes
    media_type: str   # "photo" | "video"
    filename: str


async def publish_post(
    channel_tg_id: str,
    text: str,
    media: list[MediaFile],
    bot_token: str,
    parse_mode: str | None = None,
) -> None:
    mode = _resolve_parse_mode(parse_mode)
    body = _escape(text, mode) if (text and mode) else text

    bot = Bot(token=bot_token)
    try:
        if not media:
            logger.info(f"Sending text to {channel_tg_id}")
            await _send(
                bot.send_message,
                chat_id=channel_tg_id,
                text=body,
                parse_mode=mode,
            )

        elif len(media) == 1:
            m = media[0]
            file = BufferedInputFile(m.data, filename=m.filename)
            caption = body or None
            if m.media_type == "photo":
                await _send(
                    bot.send_photo,
                    chat_id=channel_tg_id,
                    photo=file,
                    caption=caption,
                    parse_mode=mode,
                )
            else:
                await _send(
                    bot.send_video,
                    chat_id=channel_tg_id,
                    video=file,
                    caption=caption,
                    parse_mode=mode,
                )

        else:
            group: list[InputMediaPhoto | InputMediaVideo] = []
            for i, m in enumerate(media):
                cls = InputMediaPhoto if m.media_type == "photo" else InputMediaVideo
                file = BufferedInputFile(m.data, filename=m.filename)
                # Caption (and parse_mode) only on the first item of the album.
                if i == 0 and body:
                    group.append(cls(media=file, caption=body, parse_mode=mode))
                else:
                    group.append(cls(media=file))

            await _send(bot.send_media_group, chat_id=channel_tg_id, media=group)
    finally:
        await bot.session.close()

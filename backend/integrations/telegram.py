import asyncio
import logging
from typing import Optional

from telethon import TelegramClient
from telethon.errors import FloodWaitError
from telethon.sessions import StringSession
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument

logger = logging.getLogger(__name__)

# If Telegram tells us to wait longer than this we give up and let the caller
# (autopilot) skip the source for this cycle rather than freeze the worker.
MAX_FLOOD_WAIT_SECONDS = 300

_client: Optional[TelegramClient] = None


async def init_client(session_string: str, api_id: int, api_hash: str) -> None:
    global _client
    if _client and _client.is_connected():
        await _client.disconnect()
    _client = TelegramClient(StringSession(session_string), api_id, api_hash)
    await _client.connect()


async def disconnect_client() -> None:
    global _client
    if _client and _client.is_connected():
        await _client.disconnect()
    _client = None


async def get_client() -> TelegramClient:
    if _client is None or not _client.is_connected():
        raise RuntimeError("Telegram client not initialized")
    return _client


async def _call_with_flood_retry(label: str, coro_factory):
    """Run a Telethon call, sleeping through short FloodWait, re-raising long ones."""
    while True:
        try:
            return await coro_factory()
        except FloodWaitError as e:
            if e.seconds > MAX_FLOOD_WAIT_SECONDS:
                logger.warning(f"{label}: FloodWait {e.seconds}s exceeds cap, giving up")
                raise
            logger.warning(f"{label}: FloodWait {e.seconds}s, sleeping")
            await asyncio.sleep(e.seconds + 1)


async def fetch_posts(client: TelegramClient, username: str, limit: int = 20):
    return await _call_with_flood_retry(
        f"fetch_posts({username})",
        lambda: client.get_messages(username, limit=limit),
    )


async def download_media(client: TelegramClient, message) -> list[tuple[bytes, str, str | None, str]]:
    """Download a message's media into memory.

    Returns a list of ``(data, media_type, mime, filename)`` — photos and videos
    only (other document types are skipped). The bytes are stored straight into
    the DB by the caller; nothing touches the filesystem."""
    if not message.media:
        return []

    if isinstance(message.media, MessageMediaPhoto):
        media_type = "photo"
    elif isinstance(message.media, MessageMediaDocument):
        mime = getattr(message.media.document, "mime_type", "") or ""
        media_type = "video" if mime.startswith("video") else None
    else:
        media_type = None

    if media_type is None:
        return []

    data = await _call_with_flood_retry(
        f"download_media(msg={message.id})",
        lambda: client.download_media(message.media, file=bytes),
    )
    await asyncio.sleep(0.3)
    if not data:
        return []

    f = message.file
    mime = getattr(f, "mime_type", None)
    filename = getattr(f, "name", None) or f"media{getattr(f, 'ext', '') or ''}"
    return [(data, media_type, mime, filename)]

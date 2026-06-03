import json
import os
import httpx
import logging
import aiofiles

logger = logging.getLogger(__name__)


class BotApiError(Exception):
    pass


# Maps the value stored in DB (settings.bot_parse_mode) to the literal that
# Telegram Bot API expects. None means: don't send parse_mode at all.
PARSE_MODE_MAP = {
    "none": None,
    "html": "HTML",
    "markdown": "MarkdownV2",
}

# Characters that must be backslash-escaped in MarkdownV2 (Bot API docs).
_MDV2_SPECIAL = r"_*[]()~`>#+-=|{}.!\\"


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def escape_markdown_v2(text: str) -> str:
    return "".join("\\" + ch if ch in _MDV2_SPECIAL else ch for ch in text)


def _check(resp: httpx.Response, method: str) -> None:
    try:
        body = resp.json()
    except Exception:
        body = None

    if resp.status_code != 200 or not (isinstance(body, dict) and body.get("ok")):
        description = (
            body.get("description") if isinstance(body, dict) else resp.text
        ) or f"HTTP {resp.status_code}"
        error_code = body.get("error_code") if isinstance(body, dict) else None
        raise BotApiError(f"{method} failed ({error_code or resp.status_code}): {description}")


def _resolve_parse_mode(parse_mode: str | None) -> str | None:
    if parse_mode is None:
        return None
    return PARSE_MODE_MAP.get(parse_mode.lower())


async def _read_file(path: str) -> tuple[str, bytes]:
    async with aiofiles.open(path, "rb") as f:
        data = await f.read()
    return os.path.basename(path), data


async def publish_post(
    channel_tg_id: str,
    text: str,
    media_paths: list[str],
    media_types: list[str],
    bot_token: str,
    parse_mode: str | None = None,
) -> None:
    base_url = f"https://api.telegram.org/bot{bot_token}"
    tg_parse_mode = _resolve_parse_mode(parse_mode)

    def _with_mode(payload: dict, key: str, value: str) -> dict:
        if value:
            payload[key] = value
        if tg_parse_mode and value:
            payload["parse_mode"] = tg_parse_mode
        return payload

    async with httpx.AsyncClient(timeout=60) as client:
        if not media_paths:
            logger.info(f"Sending text to {channel_tg_id}")
            resp = await client.post(
                f"{base_url}/sendMessage",
                json=_with_mode({"chat_id": channel_tg_id}, "text", text),
            )
            logger.info(f"Response: {resp.status_code} {resp.text}")
            _check(resp, "sendMessage")

        elif len(media_paths) == 1:
            path = media_paths[0]
            type_ = media_types[0]
            method = "sendPhoto" if type_ == "photo" else "sendVideo"
            field = "photo" if type_ == "photo" else "video"

            filename, data = await _read_file(path)
            resp = await client.post(
                f"{base_url}/{method}",
                data=_with_mode({"chat_id": channel_tg_id}, "caption", text),
                files={field: (filename, data)},
            )
            _check(resp, method)

        else:
            files: dict = {}
            media_list = []

            for i, (path, type_) in enumerate(zip(media_paths, media_types)):
                field_name = f"file{i}"
                filename, data = await _read_file(path)
                files[field_name] = (filename, data)
                item: dict = {"type": type_, "media": f"attach://{field_name}"}
                if i == 0 and text:
                    item["caption"] = text
                    if tg_parse_mode:
                        item["parse_mode"] = tg_parse_mode
                media_list.append(item)

            resp = await client.post(
                f"{base_url}/sendMediaGroup",
                data={"chat_id": channel_tg_id, "media": json.dumps(media_list)},
                files=files,
            )
            _check(resp, "sendMediaGroup")

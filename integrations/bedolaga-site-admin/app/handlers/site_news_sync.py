"""Mirror channel posts to the ST VILLAGE website through the signed site API."""

from __future__ import annotations

import asyncio
import os
from typing import Any

import structlog
from aiogram import Dispatcher, types

from app.services.site_admin_api import SiteAdminApi, SiteAdminApiError


logger = structlog.get_logger(__name__)
NEWS_CHANNEL = os.getenv("SITE_NEWS_CHANNEL", "exitcloud_vpn").strip().lstrip("@").lower()


def _actor_id() -> int | None:
    raw = os.getenv("SITE_NEWS_ACTOR_ID", "").strip()
    return int(raw) if raw.isdigit() else None


def _file_payload(
    value: Any,
    media_type: str,
    *,
    mime_type: str | None = None,
    file_name: str | None = None,
    has_spoiler: bool = False,
) -> dict[str, Any]:
    return {
        "type": media_type,
        "fileId": value.file_id,
        "fileUniqueId": value.file_unique_id,
        "mimeType": mime_type or getattr(value, "mime_type", None),
        "fileName": file_name or getattr(value, "file_name", None),
        "width": getattr(value, "width", None),
        "height": getattr(value, "height", None),
        "duration": getattr(value, "duration", None),
        "hasSpoiler": has_spoiler,
    }


def _media(message: types.Message) -> list[dict[str, Any]]:
    if message.photo:
        return [_file_payload(message.photo[-1], "photo", mime_type="image/jpeg", has_spoiler=bool(message.has_media_spoiler))]
    if message.video:
        return [_file_payload(message.video, "video", has_spoiler=bool(message.has_media_spoiler))]
    if message.animation:
        return [_file_payload(message.animation, "animation", has_spoiler=bool(message.has_media_spoiler))]
    if message.document:
        return [_file_payload(message.document, "document")]
    if message.audio:
        return [_file_payload(message.audio, "audio")]
    if message.voice:
        return [_file_payload(message.voice, "voice")]
    if message.video_note:
        return [_file_payload(message.video_note, "video_note")]
    if message.sticker:
        mime_type = "application/x-tgsticker" if message.sticker.is_animated else "video/webm" if message.sticker.is_video else "image/webp"
        return [_file_payload(message.sticker, "sticker", mime_type=mime_type)]
    return []


def _buttons(message: types.Message) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    if not message.reply_markup:
        return result
    for row in message.reply_markup.inline_keyboard:
        for button in row:
            url = button.url
            if not url and button.web_app:
                url = button.web_app.url
            if not url and button.login_url:
                url = button.login_url.url
            if url:
                result.append({"label": button.text, "url": url})
    return result


def _poll(message: types.Message) -> dict[str, Any] | None:
    if not message.poll:
        return None
    return {
        "question": message.poll.question,
        "options": [{"text": option.text, "voterCount": option.voter_count} for option in message.poll.options],
        "totalVoterCount": message.poll.total_voter_count,
        "isClosed": message.poll.is_closed,
        "allowsMultipleAnswers": message.poll.allows_multiple_answers,
    }


def _payload(message: types.Message, edited: bool) -> dict[str, Any]:
    html_text = message.html_text if message.text else (message.html_caption or "")
    return {
        "id": str(message.message_id),
        "channel": NEWS_CHANNEL,
        "html": html_text,
        "buttons": _buttons(message),
        "media": _media(message),
        "poll": _poll(message),
        "mediaGroupId": message.media_group_id,
        "publishedAt": message.date.isoformat(),
        "edited": edited,
    }


async def _deliver(payload: dict[str, Any]) -> None:
    actor_id = _actor_id()
    if not actor_id:
        logger.error("Website news sync is disabled: SITE_NEWS_ACTOR_ID is not configured")
        return
    delays = (0, 1, 3, 10, 30)
    for attempt, delay in enumerate(delays, start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            result = await SiteAdminApi().sync_news(actor_id, payload)
            logger.info("Telegram post synchronized with website", message_id=payload["id"], stored=result.get("stored"), attempt=attempt)
            return
        except SiteAdminApiError as error:
            if attempt == len(delays):
                logger.error("Telegram post synchronization failed", message_id=payload["id"], error=str(error), attempts=attempt)
            else:
                logger.warning("Telegram post synchronization will be retried", message_id=payload["id"], error=str(error), attempt=attempt)


async def sync_channel_post(message: types.Message) -> None:
    username = (message.chat.username or "").lower()
    if username != NEWS_CHANNEL:
        return
    asyncio.create_task(_deliver(_payload(message, edited=False)))


async def sync_edited_channel_post(message: types.Message) -> None:
    username = (message.chat.username or "").lower()
    if username != NEWS_CHANNEL:
        return
    asyncio.create_task(_deliver(_payload(message, edited=True)))


def register_handlers(dp: Dispatcher) -> None:
    dp.channel_post.register(sync_channel_post)
    dp.edited_channel_post.register(sync_edited_channel_post)

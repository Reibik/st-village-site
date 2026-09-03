"""Signed client for the ST VILLAGE website administration API."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid
from typing import Any

import httpx


class SiteAdminApiError(RuntimeError):
    pass


class SiteAdminApi:
    def __init__(self) -> None:
        self.base_url = os.getenv("SITE_ADMIN_BASE_URL", "https://dev.stvillage.ru").rstrip("/")
        self.token = os.getenv("SITE_BOT_API_TOKEN", "").strip()
        self.basic_auth_user = os.getenv("SITE_ADMIN_BASIC_AUTH_USER", "").strip()
        self.basic_auth_password = os.getenv("SITE_ADMIN_BASIC_AUTH_PASSWORD", "").strip()
        if not self.token:
            raise SiteAdminApiError("SITE_BOT_API_TOKEN не настроен")

    def _headers(self, method: str, path: str, actor_id: int, body: str) -> dict[str, str]:
        timestamp = str(int(time.time()))
        nonce = str(uuid.uuid4())
        canonical = "\n".join((timestamp, nonce, method.upper(), path, body))
        signature = hmac.new(self.token.encode(), canonical.encode(), hashlib.sha256).hexdigest()
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-ST-Village-Bot-Actor": str(actor_id),
            "X-ST-Village-Bot-Timestamp": timestamp,
            "X-ST-Village-Bot-Nonce": nonce,
            "X-ST-Village-Bot-Signature": signature,
        }

    async def request(self, method: str, path: str, actor_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) if payload is not None else ""
        headers = self._headers(method, path, actor_id, body)
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=False) as client:
                auth = (self.basic_auth_user, self.basic_auth_password) if self.basic_auth_user and self.basic_auth_password else None
                response = await client.request(method, f"{self.base_url}{path}", headers=headers, content=body, auth=auth)
        except httpx.HTTPError as error:
            raise SiteAdminApiError("Сайт не отвечает") from error
        if response.status_code == 401:
            raise SiteAdminApiError("Сайт отклонил подпись запроса")
        if response.status_code >= 400:
            raise SiteAdminApiError(f"API сайта вернул ошибку {response.status_code}")
        return response.json()

    async def dashboard(self, actor_id: int) -> dict[str, Any]:
        return await self.request("GET", "/api/bot-admin/dashboard", actor_id)

    async def announcements(self, actor_id: int) -> list[dict[str, Any]]:
        return (await self.request("GET", "/api/bot-admin/announcements", actor_id)).get("announcements", [])

    async def save_announcement(self, actor_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", "/api/bot-admin/announcements", actor_id, payload)

    async def incidents(self, actor_id: int) -> list[dict[str, Any]]:
        return (await self.request("GET", "/api/bot-admin/incidents", actor_id)).get("incidents", [])

    async def save_incident(self, actor_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", "/api/bot-admin/incidents", actor_id, payload)

    async def audit(self, actor_id: int) -> list[dict[str, Any]]:
        return (await self.request("GET", "/api/bot-admin/audit?limit=15", actor_id)).get("audit", [])

    async def sync_news(self, actor_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", "/api/bot-admin/news", actor_id, payload)

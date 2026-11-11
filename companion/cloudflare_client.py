"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
Cloudflare Worker API Client Module
"""

import asyncio
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

logger = logging.getLogger("shiv_yogi.cloudflare")

# Try to import aiohttp, fallback to urllib if not yet installed
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False


class CloudflareClient:
    """Communicates with the Cloudflare Worker backend with authentication and retries."""

    def __init__(self, base_url: str, companion_secret: str, max_retries: int = 3):
        self.base_url = base_url.rstrip("/")
        self.companion_secret = companion_secret
        self.max_retries = max_retries
        self._session = None

    async def _post_urllib(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback asynchronous POST via standard library urllib."""
        url = f"{self.base_url}{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Companion-Secret": self.companion_secret,
                "User-Agent": "ShivYogiCompanion/1.0"
            },
            method="POST"
        )

        def _do_request():
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    body = resp.read().decode("utf-8")
                    return json.loads(body)
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8") if e.fp else "{}"
                try:
                    err_json = json.loads(body)
                    return {"ok": False, "error": err_json.get("error", f"HTTP {e.code}"), "status": e.code}
                except Exception:
                    return {"ok": False, "error": f"HTTP {e.code}: {e.reason}", "status": e.code}
            except Exception as e:
                return {"ok": False, "error": str(e)}

        return await asyncio.to_thread(_do_request)

    async def post(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Sends authenticated POST request to Worker with exponential backoff."""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-Companion-Secret": self.companion_secret,
            "User-Agent": "ShivYogiCompanion/1.0"
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                if HAS_AIOHTTP:
                    if self._session is None or self._session.closed:
                        self._session = aiohttp.ClientSession()

                    async with self._session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        data = await resp.json()
                        return data
                else:
                    res = await self._post_urllib(endpoint, payload)
                    if res.get("ok") or res.get("success"):
                        return res
                    if attempt < self.max_retries:
                        await asyncio.sleep(attempt * 1.5)
                        continue
                    return res
            except Exception as err:
                logger.warning(f"Request to {endpoint} failed (attempt {attempt}/{self.max_retries}): {err}")
                if attempt < self.max_retries:
                    await asyncio.sleep(attempt * 1.5)
                else:
                    return {"ok": False, "error": str(err)}

        return {"ok": False, "error": "Max retries exceeded"}

    async def report_message_received(self, user_id: int, first_name: str, username: str) -> Dict[str, Any]:
        """Notifies the Worker that an incoming message was detected."""
        payload = {
            "user_id": user_id,
            "first_name": first_name or "",
            "username": username or "",
            "timestamp": int(asyncio.get_event_loop().time())
        }
        return await self.post("/api/companion/message-received", payload)

    async def report_owner_replied(self, user_id: int) -> Dict[str, Any]:
        """Notifies the Worker that the owner has replied, cancelling any active timers."""
        payload = {
            "user_id": user_id,
            "timestamp": int(asyncio.get_event_loop().time())
        }
        return await self.post("/api/companion/owner-replied", payload)

    async def dispatch_welcome(self, user_id: int, first_name: str, username: str) -> Dict[str, Any]:
        """Requests the Worker to dispatch an automatic welcome message immediately."""
        payload = {
            "user_id": user_id,
            "first_name": first_name or "",
            "username": username or ""
        }
        return await self.post("/api/companion/dispatch-welcome", payload)

    async def check_health(self) -> bool:
        """Pings the Cloudflare Worker health check endpoint."""
        url = f"{self.base_url}/health"
        try:
            if HAS_AIOHTTP:
                if self._session is None or self._session.closed:
                    self._session = aiohttp.ClientSession()
                async with self._session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    return resp.status == 200
            else:
                def _do_get():
                    req = urllib.request.Request(url, headers={"User-Agent": "ShivYogiCompanion/1.0"})
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        return resp.status == 200
                return await asyncio.to_thread(_do_get)
        except Exception:
            return False

    async def close(self):
        """Closes the underlying aiohttp session if open."""
        if HAS_AIOHTTP and self._session and not self._session.closed:
            await self._session.close()

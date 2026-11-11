"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
Telegram MTProto Client Module (Telethon)
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("shiv_yogi.mtproto")

try:
    from telethon import TelegramClient, events
    from telethon.errors import SessionPasswordNeededError, ApiIdInvalidError
    HAS_TELETHON = True
except ImportError:
    HAS_TELETHON = False
    TelegramClient = None
    events = None


class TelegramAccountClient:
    """Manages the MTProto connection to the owner's personal Telegram account."""

    def __init__(self, api_id: int, api_hash: str, owner_id: int, session_dir: Path, session_name: str = "shiv_yogi_companion"):
        self.api_id = api_id
        self.api_hash = api_hash
        self.owner_id = owner_id
        self.session_path = str(session_dir / session_name)
        self.client: Optional[TelegramClient] = None
        self._is_running = False

    async def initialize(self) -> bool:
        """Initializes and connects the Telethon MTProto client."""
        if not HAS_TELETHON:
            raise RuntimeError("Telethon library is not installed. Please run: pip install -r requirements.txt")

        self.client = TelegramClient(
            self.session_path,
            self.api_id,
            self.api_hash,
            device_model="Shiv Yogi Auto Server",
            system_version="Linux MTProto Client",
            app_version="1.0.0"
        )

        logger.info("Connecting to Telegram MTProto gateway...")
        await self.client.connect()

        if not await self.client.is_user_authorized():
            logger.error(
                "❌ MTProto session is not authorized. Please run the interactive login:\n"
                "   python main.py --login"
            )
            return False

        me = await self.client.get_me()
        if not me:
            logger.error("Failed to retrieve current user account info.")
            return False

        logger.info(f"Connected as: {me.first_name} (@{me.username or 'no_username'}) [ID: {me.id}]")

        # Security check: Ensure connected account matches configured OWNER_TELEGRAM_ID
        if me.id != self.owner_id:
            logger.error(
                f"🚨 SECURITY MISMATCH: Connected account ID ({me.id}) does not match "
                f"configured OWNER_TELEGRAM_ID ({self.owner_id})!\n"
                f"Aborting companion startup for safety."
            )
            await self.client.disconnect()
            return False

        self._is_running = True
        return True

    async def interactive_login(self):
        """Interactive authentication CLI wizard for first-time session generation."""
        if not HAS_TELETHON:
            raise RuntimeError("Telethon library is not installed. Please run: pip install -r requirements.txt")

        self.client = TelegramClient(self.session_path, self.api_id, self.api_hash)
        await self.client.start()
        me = await self.client.get_me()
        print(f"\n✅ Successfully authenticated as {me.first_name} (ID: {me.id})!")
        print(f"Session safely saved to: {self.session_path}.session\n")
        await self.client.disconnect()

    def is_connected(self) -> bool:
        return bool(self.client and self.client.is_connected())

    async def disconnect(self):
        """Disconnects cleanly from Telegram MTProto."""
        self._is_running = False
        if self.client and self.client.is_connected():
            logger.info("Disconnecting MTProto client...")
            await self.client.disconnect()

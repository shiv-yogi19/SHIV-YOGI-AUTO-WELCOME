"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
MTProto Event Monitor Module
"""

import asyncio
import logging
from typing import Optional
from .scheduler import InactivityScheduler
from .cloudflare_client import CloudflareClient

logger = logging.getLogger("shiv_yogi.monitor")

try:
    from telethon import events
except ImportError:
    events = None


class AccountMonitor:
    """Monitors owner's personal account private chats and synchronizes with Cloudflare Worker."""

    def __init__(
        self,
        telethon_client,
        scheduler: InactivityScheduler,
        cf_client: CloudflareClient,
        owner_id: int,
        timer_minutes: int = 4
    ):
        self.telethon_client = telethon_client
        self.scheduler = scheduler
        self.cf_client = cf_client
        self.owner_id = owner_id
        self.timer_minutes = timer_minutes

    def register_handlers(self):
        """Registers Telethon event listeners for incoming and outgoing private messages."""
        if not self.telethon_client or not hasattr(self.telethon_client, "on") or not events:
            logger.error("Cannot register handlers: Telethon client is not ready or not installed.")
            return

        # 1. Incoming private messages
        @self.telethon_client.on(events.NewMessage(incoming=True, func=lambda e: e.is_private))
        async def incoming_handler(event):
            await self.handle_incoming_message(event)

        # 2. Outgoing private messages (Owner replies)
        @self.telethon_client.on(events.NewMessage(outgoing=True, func=lambda e: e.is_private))
        async def outgoing_handler(event):
            await self.handle_outgoing_message(event)

        logger.info("Registered MTProto incoming and outgoing event monitors.")

    async def handle_incoming_message(self, event):
        """Processes an incoming private message on owner's personal account."""
        try:
            # Ignore channel/group or service messages
            if not event.is_private:
                return

            sender = await event.get_sender()
            if not sender:
                return

            sender_id = sender.id

            # Ignore messages from self (e.g. Saved Messages)
            if sender_id == self.owner_id:
                return

            # Ignore Telegram official service notifications (777000) or bots
            if sender_id == 777000 or getattr(sender, 'bot', False):
                return

            first_name = getattr(sender, 'first_name', '') or ''
            username = getattr(sender, 'username', '') or ''

            user_info = {
                "user_id": sender_id,
                "first_name": first_name,
                "username": username
            }

            logger.info(f"📨 Incoming private message from {first_name} (@{username or 'no_user'}) [ID: {sender_id}]")

            # 1. Notify Cloudflare Worker of incoming message
            asyncio.create_task(self.cf_client.report_message_received(sender_id, first_name, username))

            # 2. Define callback for when inactivity timer expires
            async def _on_expire(uid: int, info: dict):
                logger.info(f"🚀 Triggering automated welcome dispatch for user {uid}")
                res = await self.cf_client.dispatch_welcome(uid, info.get("first_name", ""), info.get("username", ""))
                logger.info(f"Dispatch result for {uid}: {res}")

            # 3. Schedule inactivity timer (default 4 mins = 240s)
            delay_seconds = self.timer_minutes * 60
            scheduled = await self.scheduler.schedule_timer(sender_id, user_info, delay_seconds, _on_expire)
            if scheduled:
                logger.info(f"⏱️ Inactivity timer running for {first_name} ({self.timer_minutes} mins)")
            else:
                logger.info(f"Timer already pending for {first_name}. Not re-scheduling.")

        except Exception as err:
            logger.error(f"Error handling incoming message event: {err}", exc_info=True)

    async def handle_outgoing_message(self, event):
        """Processes an outgoing private message sent by the owner."""
        try:
            if not event.is_private:
                return

            chat_id = event.chat_id
            if not chat_id or chat_id == self.owner_id:
                return

            logger.info(f"💬 Owner replied in conversation with user {chat_id}.")

            # 1. Cancel pending local inactivity timer immediately
            cancelled = await self.scheduler.cancel_timer(chat_id)
            if cancelled:
                logger.info(f"✅ Pending welcome timer cancelled for user {chat_id}.")

            # 2. Inform Cloudflare Worker that owner replied
            asyncio.create_task(self.cf_client.report_owner_replied(chat_id))

        except Exception as err:
            logger.error(f"Error handling outgoing message event: {err}", exc_info=True)

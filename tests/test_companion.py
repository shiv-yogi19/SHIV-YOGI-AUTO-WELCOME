"""
SHIV YOGI AUTO WELCOME BOT
Companion Process Automated Unit & Integration Tests
"""

import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure companion package is importable
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from companion.config import Config, mask_secret
from companion.scheduler import InactivityScheduler
from companion.cloudflare_client import CloudflareClient
from companion.monitor import AccountMonitor


class TestCompanionConfig(unittest.TestCase):
    def test_mask_secret(self):
        self.assertEqual(mask_secret(None), "[NOT SET]")
        self.assertEqual(mask_secret(""), "[NOT SET]")
        self.assertEqual(mask_secret("12345"), "******")
        self.assertEqual(mask_secret("abcdef123456"), "abc...456")

    def test_config_validation_missing_fields(self):
        cfg = Config()
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError):
                cfg.load_and_validate()

    def test_config_validation_success(self):
        cfg = Config()
        env_vars = {
            "API_ID": "123456",
            "API_HASH": "0123456789abcdef0123456789abcdef",
            "OWNER_TELEGRAM_ID": "987654321",
            "WORKER_URL": "https://worker.dev",
            "COMPANION_SECRET": "secret_token_12345",
            "INACTIVITY_TIMER_MINUTES": "5"
        }
        with patch.dict(os.environ, env_vars, clear=True):
            loaded = cfg.load_and_validate()
            self.assertEqual(loaded.api_id, 123456)
            self.assertEqual(loaded.api_hash, "0123456789abcdef0123456789abcdef")
            self.assertEqual(loaded.owner_telegram_id, 987654321)
            self.assertEqual(loaded.worker_url, "https://worker.dev")
            self.assertEqual(loaded.companion_secret, "secret_token_12345")
            self.assertEqual(loaded.inactivity_timer_minutes, 5)


class TestCompanionScheduler(unittest.IsolatedAsyncioTestCase):
    async def test_scheduler_lifecycle_and_deduplication(self):
        scheduler = InactivityScheduler()
        callback = AsyncMock()

        user_id = 9911
        user_info = {"user_id": user_id, "first_name": "Kiran"}

        # 1. Schedule timer with 10s delay
        first_scheduled = await scheduler.schedule_timer(user_id, user_info, 10.0, callback)
        self.assertTrue(first_scheduled)
        self.assertTrue(scheduler.has_active_timer(user_id))
        self.assertEqual(scheduler.active_timer_count(), 1)

        # 2. Duplicate scheduling for same conversation must be rejected
        second_scheduled = await scheduler.schedule_timer(user_id, user_info, 10.0, callback)
        self.assertFalse(second_scheduled)
        self.assertEqual(scheduler.active_timer_count(), 1)

        # 3. Owner reply cancels the timer
        cancelled = await scheduler.cancel_timer(user_id)
        self.assertTrue(cancelled)
        self.assertFalse(scheduler.has_active_timer(user_id))
        self.assertEqual(scheduler.active_timer_count(), 0)

        # Cancel on non-existing timer returns False
        cancelled_again = await scheduler.cancel_timer(user_id)
        self.assertFalse(cancelled_again)

    async def test_scheduler_timer_expiration(self):
        scheduler = InactivityScheduler()
        callback_called = asyncio.Event()
        called_user = None

        async def _expire_callback(uid, info):
            nonlocal called_user
            called_user = uid
            callback_called.set()

        # Schedule short 0.05s timer
        await scheduler.schedule_timer(555, {"user_id": 555}, 0.05, _expire_callback)
        await asyncio.wait_for(callback_called.wait(), timeout=1.0)

        self.assertEqual(called_user, 555)
        self.assertEqual(scheduler.active_timer_count(), 0)


class TestCompanionCloudflareClient(unittest.IsolatedAsyncioTestCase):
    async def test_client_payload_construction(self):
        client = CloudflareClient("https://worker.dev", "test_secret_abc")

        # Mock the underlying post call
        client.post = AsyncMock(return_value={"ok": True})

        res1 = await client.report_message_received(123, "Ravi", "ravi_dev")
        self.assertTrue(res1["ok"])
        client.post.assert_called_with("/api/companion/message-received", {
            "user_id": 123,
            "first_name": "Ravi",
            "username": "ravi_dev",
            "timestamp": unittest.mock.ANY
        })

        res2 = await client.report_owner_replied(123)
        self.assertTrue(res2["ok"])
        client.post.assert_called_with("/api/companion/owner-replied", {
            "user_id": 123,
            "timestamp": unittest.mock.ANY
        })

        res3 = await client.dispatch_welcome(123, "Ravi", "ravi_dev")
        self.assertTrue(res3["ok"])
        client.post.assert_called_with("/api/companion/dispatch-welcome", {
            "user_id": 123,
            "first_name": "Ravi",
            "username": "ravi_dev"
        })

        await client.close()


class TestAccountMonitor(unittest.IsolatedAsyncioTestCase):
    async def test_monitor_filtering_and_events(self):
        scheduler = InactivityScheduler()
        cf_client = MagicMock()
        cf_client.report_message_received = AsyncMock()
        cf_client.report_owner_replied = AsyncMock()
        cf_client.dispatch_welcome = AsyncMock(return_value={"success": True})

        owner_id = 999
        monitor = AccountMonitor(
            telethon_client=None,
            scheduler=scheduler,
            cf_client=cf_client,
            owner_id=owner_id,
            timer_minutes=4
        )

        # 1. Non-private message is ignored
        group_event = MagicMock(is_private=False)
        await monitor.handle_incoming_message(group_event)
        self.assertEqual(scheduler.active_timer_count(), 0)

        # 2. Message from owner self is ignored
        self_sender = MagicMock(id=owner_id)
        self_event = MagicMock(is_private=True, get_sender=AsyncMock(return_value=self_sender))
        await monitor.handle_incoming_message(self_event)
        self.assertEqual(scheduler.active_timer_count(), 0)

        # 3. Message from bot or service (777000) is ignored
        service_sender = MagicMock(id=777000, bot=False)
        service_event = MagicMock(is_private=True, get_sender=AsyncMock(return_value=service_sender))
        await monitor.handle_incoming_message(service_event)
        self.assertEqual(scheduler.active_timer_count(), 0)

        # 4. Valid incoming message from regular user
        user_sender = MagicMock(id=12345, first_name="Neha", username="neha_dev", bot=False)
        user_event = MagicMock(is_private=True, get_sender=AsyncMock(return_value=user_sender))
        await monitor.handle_incoming_message(user_event)

        self.assertTrue(scheduler.has_active_timer(12345))
        self.assertEqual(scheduler.active_timer_count(), 1)
        cf_client.report_message_received.assert_called_with(12345, "Neha", "neha_dev")

        # 5. Outgoing message from owner cancels the timer
        outgoing_event = MagicMock(is_private=True, chat_id=12345)
        await monitor.handle_outgoing_message(outgoing_event)

        self.assertFalse(scheduler.has_active_timer(12345))
        self.assertEqual(scheduler.active_timer_count(), 0)
        cf_client.report_owner_replied.assert_called_with(12345)


if __name__ == "__main__":
    unittest.main()

"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
Asynchronous Inactivity Timer Scheduler Module
"""

import asyncio
import logging
import time
from typing import Dict, Any, Callable, Optional, Awaitable

logger = logging.getLogger("shiv_yogi.scheduler")


class TimerEntry:
    def __init__(self, user_id: int, user_info: Dict[str, Any], task: asyncio.Task, expires_at: float):
        self.user_id = user_id
        self.user_info = user_info
        self.task = task
        self.expires_at = expires_at
        self.scheduled_at = time.time()


class InactivityScheduler:
    """Manages pending conversation inactivity timers in memory."""

    def __init__(self):
        self._timers: Dict[int, TimerEntry] = {}
        self._lock = asyncio.Lock()

    async def schedule_timer(
        self,
        user_id: int,
        user_info: Dict[str, Any],
        delay_seconds: float,
        on_expire: Callable[[int, Dict[str, Any]], Awaitable[None]]
    ) -> bool:
        """
        Schedules an inactivity timer for a conversation.
        If a timer is already active for this conversation, prevents creating duplicate.
        """
        async with self._lock:
            if user_id in self._timers:
                logger.info(f"Timer already active for user {user_id}. Ignoring duplicate trigger.")
                return False

            expires_at = time.time() + delay_seconds

            async def _timer_worker():
                try:
                    await asyncio.sleep(delay_seconds)
                    # Timer expired without owner reply
                    logger.info(f"⏳ Inactivity timer expired for user {user_id} after {delay_seconds}s")
                    async with self._lock:
                        self._timers.pop(user_id, None)

                    # Trigger the expiration callback
                    await on_expire(user_id, user_info)
                except asyncio.CancelledError:
                    logger.info(f"Timer cancelled for user {user_id}")
                except Exception as err:
                    logger.error(f"Error in timer worker for user {user_id}: {err}")
                finally:
                    async with self._lock:
                        self._timers.pop(user_id, None)

            task = asyncio.create_task(_timer_worker())
            self._timers[user_id] = TimerEntry(user_id, user_info, task, expires_at)
            logger.info(f"Scheduled inactivity timer for user {user_id} ({delay_seconds}s)")
            return True

    async def cancel_timer(self, user_id: int) -> bool:
        """Cancels a pending inactivity timer for a user (e.g. when owner replies)."""
        async with self._lock:
            entry = self._timers.pop(user_id, None)
            if entry:
                entry.task.cancel()
                logger.info(f"Cancelled pending inactivity timer for user {user_id} due to owner reply.")
                return True
            return False

    def has_active_timer(self, user_id: int) -> bool:
        """Checks if a user currently has an active pending timer."""
        return user_id in self._timers

    def active_timer_count(self) -> int:
        """Returns the number of currently active pending timers."""
        return len(self._timers)

    async def cancel_all(self):
        """Cancels all active timers cleanly on application shutdown."""
        async with self._lock:
            for entry in list(self._timers.values()):
                entry.task.cancel()
            self._timers.clear()
            logger.info("All pending timers have been cancelled.")

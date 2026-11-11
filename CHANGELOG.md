# 📝 CHANGELOG

All notable changes to the **SHIV YOGI AUTO WELCOME BOT** system are documented here.

---

## [1.0.0] - 2026-11-11
### Initial Production Release - Created By Shiv Yogi

#### Added
- **Core Worker Engine**:
  - Full Cloudflare Worker router supporting `/webhook`, `/health`, and `/api/companion/*`.
  - Telegram Bot API client with automatic FloodWait (429) backoff and retry handling.
  - Constant-time secret verification (`timingSafeEqualStr`) for Webhook and Companion secrets.
  - Update deduplication engine via Cloudflare KV (`update_dedup:*`).
  - IP-based rate limiting on webhook endpoints.
- **Inactivity Timer & Scheduling**:
  - Cloudflare Durable Objects engine (`TimerDurableObject`) with persistent alarms.
  - Companion asynchronous local scheduler (`InactivityScheduler`).
  - Automatic timer cancellation upon owner reply detection.
  - Anti-spam rules: per-user cooldown, global daily limit, quiet hours, and ignore list.
- **Message Repository & Random Selection**:
  - 20 default English message templates designed with stylish ASCII/Unicode art.
  - Dynamic placeholder rendering (`{name}`, `{username}`, `{timer_mins}`, `{bot_name}`, `{owner_name}`).
  - Sliding-window no-repeat selection algorithm.
  - Message CRUD operations (add, edit, delete, toggle, reorder, preview).
  - Backup & restore via JSON.
- **Owner Administrative Portal**:
  - Complete implementation of 19 owner-only slash commands.
  - Strict access control denying non-owner execution.
  - Recipient registration via `/start`.
- **MTProto Companion Process**:
  - Telethon-based personal account monitoring daemon.
  - Incoming private message detection and screening.
  - Outgoing reply detection and immediate timer abort.
  - Reconnection resilience on network failure.
  - Safe session management with gitignore isolation.
- **Testing & Tooling**:
  - Interactive setup wizard (`scripts/setup_wizard.js`).
  - Automated test suite covering security, messages, scheduler, webhook, and companion.
  - Database schema for Cloudflare D1 (`database/schema.sql`).

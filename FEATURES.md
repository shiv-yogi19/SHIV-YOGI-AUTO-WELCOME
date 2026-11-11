# 📋 SHIV YOGI AUTO WELCOME BOT — FEATURES SPECIFICATION

**Created By Shiv Yogi**

This document provides a detailed breakdown of all features, capabilities, and design patterns implemented in the SHIV YOGI AUTO WELCOME BOT system.

---

## 1. Personal Account MTProto Monitoring
- **Dedicated Telethon Daemon**: Runs continuously on an always-on host to listen for incoming Telegram MTProto events.
- **Private Chat Filter**: Isolates private direct conversations; ignores public channels, groups, bots, and Telegram service announcements (`777000`).
- **Owner Echo Prevention**: Rejects outgoing messages or self-messages (Saved Messages) from triggering auto-reply sequences.
- **Owner Activity Sensing**: Detects when the owner types or sends an outgoing message to a conversation and cancels any pending timers for that chat in real time.
- **Session Protection**: MTProto session files are stored in a dedicated local directory and strictly excluded from git tracking.
- **Automatic Reconnection**: Recovers transparently with exponential backoff if internet connectivity is momentarily lost.

---

## 2. Inactivity Timer & Scheduling Engine
- **Dual-Layer Reliability**:
  1. *Primary Serverless Layer*: Cloudflare Durable Objects alarms (`TimerDurableObject`) allow timers to wake up reliably without maintaining an open HTTP connection.
  2. *Secondary Companion Layer*: Asynchronous local scheduler (`InactivityScheduler`) manages pending tasks in memory with zero extra Cloudflare subscription requirements.
- **Configurable Inactivity Window**: Owner can change the timer between 1 and 60 minutes on the fly via `/timer <mins>` (default: 4 minutes).
- **Single Pending Timer Guarantee**: Enforces one pending timer per conversation, discarding duplicate ping triggers.
- **Instant Cancellation**: Immediate abort of pending timer when an outgoing message is detected from the owner.

---

## 3. 20 Default English Message Templates & Engine
- **Stylish Design**: Formatted with clean Unicode symbols and ASCII borders for a professional, warm aesthetic.
- **Dynamic Context Placeholders**:
  - `{name}`: Recipient's first name.
  - `{username}`: Recipient's Telegram @handle.
  - `{timer_mins}`: Configured inactivity duration in minutes.
  - `{bot_name}`: "SHIV YOGI AUTO WELCOME".
  - `{owner_name}`: "Shiv Yogi".
- **No-Repeat Mode**: Uses a sliding window history (configurable depth, default 5) stored in KV to guarantee non-repetitive greetings.
- **Categorization**: Organizes templates into categories (`general`, `away`, `busy`, `inactivity`, `support`) with category-filtering support.
- **Template Management**:
  - Add new templates (`/addmessage`).
  - Edit existing templates (`/editmessage`).
  - Delete templates (`/deletemessage`).
  - Toggle enabled status (`/messages toggle <id>`).
  - Preview rendered templates (`/preview <id>`).
  - Reorder priority (`reorderMessages`).
  - Export and restore backup snapshots (`/backup`, `/restore`).

---

## 4. Owner Administration & Security Portal
- **Strict Owner-Only Access**: Compares incoming user ID against `OWNER_TELEGRAM_ID`. Non-owners attempting administrative actions receive a denial notice.
- **Complete Command Suite**:
  - `/start`: Administrative portal or recipient welcome onboarding.
  - `/help`: Detailed command guide.
  - `/status`: Real-time system telemetry and database counts.
  - `/settings`: Current operational settings.
  - `/messages`: Interactive list of templates with toggle switches.
  - `/addmessage`: Create new custom template.
  - `/editmessage`: Edit template text.
  - `/deletemessage`: Remove template.
  - `/preview`: Render template with live simulation.
  - `/history`: Audit recent dispatched messages and delivery status.
  - `/stats`: Analytics, total sends, and top templates.
  - `/timer`: Change inactivity delay (1-60 mins).
  - `/cooldown`: Set per-user cooldown period (minutes).
  - `/quiethours`: Define silent overnight hours.
  - `/ignore`: Blacklist or whitelist user IDs.
  - `/backup`: Export full system state as JSON.
  - `/restore`: Restore system state from JSON.
  - `/pause`: Emergency killswitch halting all dispatches.
  - `/resume`: Re-enable automated dispatches.

---

## 5. Anti-Spam & Limits Engine
- **Per-User Cooldown**: Configurable cooldown period (default: 1440 minutes / 24 hours) preventing repeated welcome messages to the same user.
- **Global Daily Dispatch Cap**: Limits the maximum automated messages sent across all users per calendar day (default: 100).
- **Quiet Hours Scheduling**: Automatically suppresses dispatches during configured timeframes (e.g. 22:00 to 07:00 UTC) with overnight boundary support.
- **Ignored Users Blacklist**: Owner can exclude specific contacts, bots, or partners from ever receiving automated welcome messages.
- **FloodWait & Rate Limiting**: Exponential backoff handling for Telegram API HTTP 429 status codes.

---

## 6. Storage & Database Architecture
- **Cloudflare KV (`WELCOME_KV`)**:
  - Low-latency retrieval of settings, message templates, rate limits, cooldowns, and deduplication tokens.
- **Cloudflare D1 Database (`DB`)**:
  - Relational SQLite schema storing `recipients`, `messages_history`, `activity_logs`, and usage statistics.
- **Cloudflare Durable Objects (`TIMER_DO`)**:
  - High-precision alarm scheduling for inactivity and auto-delete timers.

# ⚡ SHIV YOGI AUTO WELCOME BOT

**Created By Shiv Yogi**  
*A production-grade, secure, dual-tier Telegram automation system combining Cloudflare Workers serverless edge and an always-on MTProto companion process.*

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [High-Level Architecture](#-high-level-architecture)
3. [The 5 Core Credentials](#-the-5-core-credentials)
4. [Step-by-Step Installation](#-step-by-step-installation)
5. [Interactive Setup Wizard](#-interactive-setup-wizard)
6. [Cloudflare Deployment (Workers, KV, D1, DO)](#-cloudflare-deployment)
7. [Telegram Webhook Registration](#-telegram-webhook-registration)
8. [MTProto Companion Setup & Daemon](#-mtproto-companion-setup)
9. [Owner Command Manual](#-owner-command-manual)
10. [Anti-Spam & Inactivity Engine](#-anti-spam--inactivity-engine)
11. [Known Technical Limitations & Costs](#-known-technical-limitations--costs)
12. [Security Guidelines](#-security-guidelines)
13. [Troubleshooting & Diagnostics](#-troubleshooting--diagnostics)

---

## 🌟 Project Overview

**SHIV YOGI AUTO WELCOME BOT** is an intelligent assistant designed to monitor incoming private messages on your personal Telegram account. If you do not reply to a person within a configurable inactivity window (default: **4 minutes**), the system automatically selects a stylish, randomized English welcome template and dispatches it via a dedicated **Telegram Bot API** bot.

### Key Tenets:
- **Separation of Concerns**: Your personal account *never* sends the automatic messages. A dedicated bot handles dispatches.
- **Strict Owner-Only Access**: Only `OWNER_TELEGRAM_ID` can invoke administrative commands or change settings.
- **Reliable Inactivity Timers**: Dual-redundancy scheduling using Cloudflare **Durable Objects alarms** and the companion's asyncio timer pool.
- **No-Repeat Message Engine**: 20 stylish ASCII/Unicode templates with sliding-window repetition prevention.
- **Anti-Spam Protections**: Per-user cooldowns (default 24h), global daily limits, and quiet hours windows.

---

## 🏗️ High-Level Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │               USER'S TELEGRAM                │
                       │           Sends private direct ping          │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                     ALWAYS-ON HOST (VPS, Raspberry Pi, Termux)                  │
    │                                                                                 │
    │   ┌────────────────────────────────┐         ┌──────────────────────────────┐   │
    │   │  Telethon MTProto Client       │         │   InactivityScheduler        │   │
    │   │  (Monitors owner's user chat)  ├────────►│   (4 min inactivity timer)   │   │
    │   └───────────────┬────────────────┘         └──────────────┬───────────────┘   │
    │                   │                                         │                   │
    │     Owner Replies │ (Cancels timer)          Timer Expired? │ Dispatch Request  │
    └───────────────────┼─────────────────────────────────────────┼───────────────────┘
                        │                                         │
                        │ Authenticated HTTPS                     │ Authenticated HTTPS
                        │ (X-Companion-Secret)                    │ (X-Companion-Secret)
                        ▼                                         ▼
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                         CLOUDFLARE WORKERS EDGE                                 │
    │                                                                                 │
    │   ┌─────────────────────────────────────────────────────────────────────────┐   │
    │   │  Router & Verification (security.js / index.js)                         │   │
    │   │  • Timing-safe secret verification & Rate Limiting                      │   │
    │   └───────────────┬─────────────────────────────────────────────────────────┘   │
    │                   │                                                             │
    │   ┌───────────────▼────────────────┐         ┌──────────────────────────────┐   │
    │   │  Cloudflare KV (WELCOME_KV)    │         │  Durable Objects (TIMER_DO)  │   │
    │   │  • Global Settings             │         │  • Persistent Alarms         │   │
    │   │  • 20+ Message Templates       │         │  • Auto-delete Queue         │   │
    │   │  • Per-user Cooldown & Limits  │         └──────────────────────────────┘   │
    │   └───────────────┬────────────────┘                                            │
    │                   │                          ┌──────────────────────────────┐   │
    │   ┌───────────────▼────────────────┐         │  Cloudflare D1 (DB)          │   │
    │   │  Random Selection Engine       │         │  • History & Audit Logs      │   │
    │   │  • No-repeat history depth     │         │  • Recipient Registry        │   │
    │   └───────────────┬────────────────┘         └──────────────────────────────┘   │
    │                   │                                                             │
    │                   ▼                                                             │
    │   ┌─────────────────────────────────────────────────────────────────────────┐   │
    │   │  Telegram Bot API Client (telegram.js)                                  │   │
    │   │  • Dispatches English message to recipient                              │   │
    │   │  • Handles FloodWait (429) & exponential retries                        │   │
    │   └─────────────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 The 5 Core Credentials

| Credential | Where It Belongs | Purpose |
| :--- | :--- | :--- |
| `BOT_TOKEN` | Cloudflare Worker Secret | Authorizes Cloudflare Worker to send messages via Telegram Bot API. |
| `WEBHOOK_SECRET` | Cloudflare Worker Secret | Verifies incoming Telegram webhook requests (`X-Telegram-Bot-Api-Secret-Token`). |
| `API_ID` | Private Companion Config (`.env`) | Telegram MTProto client identifier obtained from [my.telegram.org](https://my.telegram.org). |
| `API_HASH` | Private Companion Config (`.env`) | Telegram MTProto client authentication hash. |
| `OWNER_TELEGRAM_ID` | Worker & Companion Config | Identifies the single authorized administrator for strict access control. |
| `COMPANION_SECRET` | Shared Secret (Worker & Companion) | Authenticates communication between the Python companion and Cloudflare Worker. |

> [!CAUTION]
> Never commit real credentials or session files (`*.session`) to GitHub. All secrets are excluded in `.gitignore`.

---

## 🚀 Step-by-Step Installation

### Prerequisites
- Node.js 20+ and `pnpm` (or `npm`)
- Python 3.10+
- Cloudflare Wrangler CLI (`pnpm add -g wrangler`)
- A personal Telegram account + Bot created via [@BotFather](https://t.me/BotFather)

### Clone & Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/SHIV-YOGI-AUTO-WELCOME.git
cd SHIV-YOGI-AUTO-WELCOME

# Run tests to verify environment integrity
pnpm test
python3 -m unittest discover tests
```

---

## 🧙 Interactive Setup Wizard

We provide an interactive configuration generator to safely create your private `.env` and configure Cloudflare:

```bash
# Run setup wizard
pnpm run setup
# or
node scripts/setup_wizard.js
```
The wizard prompts for each token, validates formatting, generates high-entropy secrets, writes your private `.env` (chmod 0600), and outputs exact commands for Cloudflare and Telegram.

---

## ☁️ Cloudflare Deployment

### 1. Initialize KV Namespace
```bash
npx wrangler kv namespace create WELCOME_KV
```
Copy the generated `id` and update `worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "WELCOME_KV"
id = "paste_your_kv_namespace_id_here"
```

### 2. Initialize D1 Database
```bash
npx wrangler d1 create shiv-yogi-welcome-db
```
Copy the `database_id` to `worker/wrangler.toml`, then run schema migrations:
```bash
npx wrangler d1 execute shiv-yogi-welcome-db --file=database/schema.sql
```

### 3. Store Worker Secrets
Never write secrets in plain text inside `wrangler.toml`. Run:
```bash
cd worker
echo "YOUR_BOT_TOKEN" | npx wrangler secret put BOT_TOKEN
echo "YOUR_WEBHOOK_SECRET" | npx wrangler secret put WEBHOOK_SECRET
echo "YOUR_COMPANION_SECRET" | npx wrangler secret put COMPANION_SECRET
```

### 4. Deploy the Worker
```bash
npx wrangler deploy
```
Take note of your deployed Worker URL: `https://shiv-yogi-auto-welcome.YOUR_SUBDOMAIN.workers.dev`.

---

## 📡 Telegram Webhook Registration

Register your Cloudflare Worker endpoint with Telegram:
```bash
curl -F "url=https://shiv-yogi-auto-welcome.YOUR_SUBDOMAIN.workers.dev/webhook" \
     -F "secret_token=YOUR_WEBHOOK_SECRET" \
     -F "allowed_updates=[\"message\",\"edited_message\",\"callback_query\"]" \
     "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
```

Verify webhook status:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 🐍 MTProto Companion Setup

The MTProto companion connects directly to Telegram servers to monitor incoming messages on the owner's personal account.

### 1. Install Dependencies
```bash
cd companion
python3 -m pip install -r requirements.txt
```

### 2. Interactive Session Login
Run the one-time interactive login to authenticate your personal account:
```bash
python3 main.py --login
```
Enter your phone number (with country code) and the verification code sent to Telegram. Your session is securely stored in `companion/session/shiv_yogi_companion.session` (gitignored).

### 3. Test Connection
```bash
python3 main.py --test-connection
```

### 4. Run Daemon (Production / Background)
Using `systemd`, `pm2`, or `nohup`:
```bash
# Using PM2
pm2 start companion/main.py --name "shiv-yogi-companion" --interpreter python3

# Or using standard nohup
nohup python3 companion/main.py > companion.log 2>&1 &
```

---

## 🎮 Owner Command Manual

All administrative commands are restricted strictly to `OWNER_TELEGRAM_ID`. Any other user attempting to execute them receives an `Access Denied` response.

| Command | Usage | Description |
| :--- | :--- | :--- |
| `/start` | `/start` | Opens administrative dashboard or registers recipient if called by a user. |
| `/help` | `/help` | Detailed command manual and syntax guide. |
| `/status` | `/status` | Live telemetry: uptime, dispatches today, KV & D1 state, template counts. |
| `/settings` | `/settings` | View current engine configuration. |
| `/messages` | `/messages` | Lists all 20+ templates with preview snippets and toggle status. |
| `/messages toggle` | `/messages toggle <id>` | Enables or disables an individual message template. |
| `/messages reset` | `/messages reset` | Restores default 20 English templates. |
| `/preview` | `/preview <id>` | Renders template with dynamic placeholders (`{name}`, `{timer_mins}`). |
| `/addmessage` | `/addmessage [cat] \| <text>` | Adds a new custom template. |
| `/editmessage` | `/editmessage <id> \| <text>` | Updates text of an existing template. |
| `/deletemessage` | `/deletemessage <id>` | Deletes a message template. |
| `/timer` | `/timer <1-60>` | Adjusts inactivity timer window in minutes (default: 4 mins). |
| `/cooldown` | `/cooldown <mins>` | Sets per-user cooldown window (e.g. 1440 for 24h). |
| `/quiethours` | `/quiethours 23:00-07:00` | Sets quiet hours window (or `on` / `off`). |
| `/ignore` | `/ignore <add\|remove\|list> [id]` | Manages user IDs excluded from auto replies. |
| `/backup` | `/backup` | Exports settings and message templates as JSON. |
| `/restore` | `/restore <json>` | Restores configuration from JSON payload. |
| `/pause` | `/pause` | Emergency stop: immediately halts all dispatches. |
| `/resume` | `/resume` | Resumes active automatic dispatches. |

---

## 🛡️ Anti-Spam & Inactivity Engine

The system strictly executes the following 9-step workflow:
1. **Incoming Detection**: MTProto companion detects an incoming private message on owner's personal account.
2. **Sender Screening**: Ignores bots, channels, groups, and self-messages (`777000` or `OWNER_TELEGRAM_ID`).
3. **Timer Initiation**: Starts an inactivity timer (default 4 minutes). Prevents duplicate pending timers for the same conversation.
4. **Owner Reply Check**: If the owner replies to the conversation before expiration, the timer is immediately cancelled and discarded.
5. **Timer Expiration**: If the timer expires without an owner reply, the event triggers dispatch.
6. **Recipient Start Check**: Verifies that the recipient has sent `/start` to the Auto Welcome Bot (required by Telegram Bot API).
7. **Filter Evaluation**: Verifies that emergency pause is OFF, quiet hours are inactive, recipient is not ignored, and cooldown has expired.
8. **Random Selection**: Picks a random template using the **no-repeat** algorithm with sliding window history.
9. **Dispatch & Cooldown**: Sends the message via Telegram Bot API, sets user cooldown, and logs dispatch to D1 database.

---

## ⚠️ Known Technical Limitations & Costs

1. **Host Requirement for MTProto**:
   Cloudflare Workers is an edge serverless environment and cannot sustain a permanent raw MTProto socket connection to Telegram. The MTProto companion daemon must run on an always-on host (VPS, Raspberry Pi, home server, or Termux).
2. **Telegram Bot API Initiation Policy**:
   A Telegram Bot cannot initiate a private message with a user who has never sent `/start` to the bot. The system enforces this limitation and prompts recipients accordingly.
3. **Message Read Receipts**:
   Telegram Bot API does not expose private chat read receipts. Therefore, automatic message deletion is based on a configurable time-after-dispatch window (e.g. 60 minutes), not on "seen" state.
4. **Cloudflare Free Tier vs Paid**:
   - Cloudflare KV: Free tier provides 100,000 reads/day and 1,000 writes/day (more than enough for personal use).
   - Cloudflare D1: Free tier includes 5 million rows read/day and 100,000 rows written/day.
   - Durable Objects: Available on Cloudflare Workers Paid plan ($5/mo). If you run on the Free plan, the companion's built-in `InactivityScheduler` operates locally at 0 additional cost!

---

## 🔒 Security Guidelines

- **Zero Credential Printing**: The companion and worker mask all tokens in console logs.
- **Timing-Safe Comparison**: All webhook and companion secrets use constant-time byte comparison (`timingSafeEqualStr`) to eliminate timing attacks.
- **Rate Limiting**: Built-in IP and token rate limiters prevent denial-of-service abuse.
- **Strict Input Sanitization**: Rejects null bytes (`\0`) and limits payload lengths.

---

## 🛠️ Troubleshooting & Diagnostics

- **Companion cannot connect**: Run `python3 main.py --login` to verify MTProto session authorization.
- **Worker returns 401**: Ensure `WEBHOOK_SECRET` in Cloudflare Secrets matches the `secret_token` passed to `setWebhook`.
- **Bot does not send reply**: Check `/status` in Telegram to ensure the system is not paused and the user has opened the bot with `/start`.

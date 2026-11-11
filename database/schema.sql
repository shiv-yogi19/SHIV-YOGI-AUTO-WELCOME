-- ==========================================================
-- SHIV YOGI AUTO WELCOME BOT
-- Created By Shiv Yogi
-- Cloudflare D1 Database Schema
-- ==========================================================

-- 1. Recipients Table: Tracks users who have messaged or started the bot
CREATE TABLE IF NOT EXISTS recipients (
    user_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    bot_started INTEGER NOT NULL DEFAULT 0,
    bot_started_at TEXT,
    last_incoming_at TEXT,
    last_auto_message_at TEXT,
    total_messages_received INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Message History Table: Full log of automated messages dispatched
CREATE TABLE IF NOT EXISTS messages_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL DEFAULT '',
    recipient_username TEXT NOT NULL DEFAULT '',
    template_id INTEGER NOT NULL DEFAULT 0,
    template_title TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    message_text TEXT NOT NULL,
    telegram_message_id INTEGER,
    delivery_status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'deleted', 'blocked'
    error_message TEXT,
    scheduled_at TEXT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (recipient_id) REFERENCES recipients(user_id)
);

-- 3. Activity Logs Table: System events, owner commands, timer triggers
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'incoming_message', 'timer_scheduled', 'timer_cancelled', 'welcome_sent', 'owner_reply', 'command_executed', 'setting_changed', 'error'
    user_id TEXT,
    details TEXT,
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warn', 'error'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Global Stats Table: Aggregated counters
CREATE TABLE IF NOT EXISTS statistics (
    stat_key TEXT PRIMARY KEY,
    stat_value INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Template Usage Counters
CREATE TABLE IF NOT EXISTS template_stats (
    template_id INTEGER PRIMARY KEY,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_history_recipient ON messages_history(recipient_id);
CREATE INDEX IF NOT EXISTS idx_history_sent_at ON messages_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_activity_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_recipients_started ON recipients(bot_started);

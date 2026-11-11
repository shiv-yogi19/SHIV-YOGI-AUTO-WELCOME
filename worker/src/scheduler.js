/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Scheduler & Durable Object Engine for Inactivity Timers
 */

import { getSettings, isQuietHours, isUserIgnored } from './settings.js';
import { selectRandomMessage } from './messages.js';
import { sendMessage, deleteMessage } from './telegram.js';

/**
 * Checks if a recipient is currently within their cooldown period.
 * @param {object} kv 
 * @param {string|number} recipientId 
 * @returns {Promise<{onCooldown: boolean, remainingSeconds: number}>}
 */
export async function checkCooldown(kv, recipientId) {
  if (!kv || typeof kv.get !== 'function' || !recipientId) {
    return { onCooldown: false, remainingSeconds: 0 };
  }
  const key = `cooldown:${recipientId}`;
  try {
    const expiresAt = await kv.get(key, 'text');
    if (!expiresAt) {
      return { onCooldown: false, remainingSeconds: 0 };
    }
    const diff = Number(expiresAt) - Math.floor(Date.now() / 1000);
    if (diff > 0) {
      return { onCooldown: true, remainingSeconds: diff };
    }
    return { onCooldown: false, remainingSeconds: 0 };
  } catch {
    return { onCooldown: false, remainingSeconds: 0 };
  }
}

/**
 * Activates a cooldown period for a recipient.
 * @param {object} kv 
 * @param {string|number} recipientId 
 * @param {number} cooldownMinutes 
 */
export async function setCooldown(kv, recipientId, cooldownMinutes) {
  if (!kv || typeof kv.put !== 'function' || !recipientId || cooldownMinutes <= 0) {
    return;
  }
  const ttl = cooldownMinutes * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const key = `cooldown:${recipientId}`;
  await kv.put(key, String(expiresAt), { expirationTtl: Math.max(60, ttl) });
}

/**
 * Checks and enforces the global daily automatic message limit.
 * @param {object} kv 
 * @param {number} maxLimit 
 * @returns {Promise<{allowed: boolean, currentCount: number}>}
 */
export async function checkDailyLimit(kv, maxLimit = 100) {
  if (!kv || typeof kv.get !== 'function') {
    return { allowed: true, currentCount: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_count:${today}`;
  try {
    const raw = await kv.get(key, 'text');
    const current = Number(raw) || 0;
    if (current >= maxLimit) {
      return { allowed: false, currentCount: current };
    }
    return { allowed: true, currentCount: current };
  } catch {
    return { allowed: true, currentCount: 0 };
  }
}

/**
 * Increments the daily message dispatch counter.
 * @param {object} kv 
 */
export async function incrementDailyCount(kv) {
  if (!kv || typeof kv.put !== 'function') return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_count:${today}`;
  try {
    const raw = await kv.get(key, 'text');
    const next = (Number(raw) || 0) + 1;
    await kv.put(key, String(next), { expirationTtl: 86400 * 2 });
  } catch {
    // Ignore non-fatal stats write
  }
}

/**
 * Checks whether the recipient has started the separate Auto Welcome Bot.
 * @param {object} kv 
 * @param {object} d1 
 * @param {string|number} recipientId 
 * @returns {Promise<boolean>}
 */
export async function hasRecipientStartedBot(kv, d1, recipientId) {
  const strId = String(recipientId).trim();
  // 1. Check KV first for low-latency lookup
  if (kv && typeof kv.get === 'function') {
    try {
      const val = await kv.get(`bot_started:${strId}`);
      if (val === '1') return true;
    } catch {
      // Fall through to D1
    }
  }

  // 2. Check D1 if available
  if (d1 && typeof d1.prepare === 'function') {
    try {
      const row = await d1.prepare('SELECT bot_started FROM recipients WHERE user_id = ?').bind(strId).first();
      if (row && Number(row.bot_started) === 1) {
        if (kv) await kv.put(`bot_started:${strId}`, '1', { expirationTtl: 86400 * 30 });
        return true;
      }
    } catch {
      // Ignore database lookup failure
    }
  }

  return false;
}

/**
 * Marks that a recipient has started the bot (/start).
 * @param {object} kv 
 * @param {object} d1 
 * @param {object} user 
 */
export async function markRecipientBotStarted(kv, d1, user) {
  const strId = String(user.id).trim();
  if (kv && typeof kv.put === 'function') {
    await kv.put(`bot_started:${strId}`, '1', { expirationTtl: 86400 * 30 });
  }

  if (d1 && typeof d1.prepare === 'function') {
    try {
      const now = new Date().toISOString();
      await d1.prepare(`
        INSERT INTO recipients (user_id, first_name, last_name, username, bot_started, bot_started_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          username = excluded.username,
          bot_started = 1,
          bot_started_at = COALESCE(recipients.bot_started_at, excluded.bot_started_at),
          updated_at = excluded.updated_at
      `).bind(
        strId,
        user.first_name || '',
        user.last_name || '',
        user.username || '',
        now,
        now
      ).run();
    } catch (err) {
      // Non-fatal D1 error
    }
  }
}

/**
 * Records an activity event in D1 or KV.
 * @param {object} env 
 * @param {string} eventType 
 * @param {string|number} userId 
 * @param {object|string} details 
 * @param {string} severity 
 */
export async function logActivity(env, eventType, userId, details, severity = 'info') {
  const strDetails = typeof details === 'string' ? details : JSON.stringify(details);
  const strUserId = userId ? String(userId) : null;
  const now = new Date().toISOString();

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(`
        INSERT INTO activity_logs (event_type, user_id, details, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(eventType, strUserId, strDetails, severity, now).run();
    } catch {
      // Fallback
    }
  }

  // Also maintain recent activity log ring-buffer in KV
  if (env.WELCOME_KV) {
    try {
      const key = 'history:recent_activity';
      const existing = (await env.WELCOME_KV.get(key, 'json')) || [];
      existing.unshift({
        event_type: eventType,
        user_id: strUserId,
        details: strDetails,
        severity,
        timestamp: now
      });
      const trimmed = existing.slice(0, 50);
      await env.WELCOME_KV.put(key, JSON.stringify(trimmed), { expirationTtl: 86400 * 7 });
    } catch {
      // Ignore
    }
  }
}

/**
 * Dispatches an automated welcome message to the recipient after inactivity timer expiry.
 * Executes full anti-spam, cooldown, quiet hours, and bot-started checks.
 * @param {object} env 
 * @param {{recipientId: string|number, recipientName?: string, recipientUsername?: string, triggerSource?: string}} params 
 * @returns {Promise<{success: boolean, reason?: string, messageId?: number, templateTitle?: string}>}
 */
export async function executeAutoWelcomeDispatch(env, params) {
  const { recipientId, recipientName, recipientUsername, triggerSource = 'inactivity_timer' } = params;
  const kv = env.WELCOME_KV;
  const d1 = env.DB;
  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    return { success: false, reason: 'BOT_TOKEN is not configured' };
  }

  const settings = await getSettings(kv);

  // 1. Check Emergency Pause
  if (settings.emergency_paused) {
    await logActivity(env, 'welcome_blocked', recipientId, { reason: 'System is emergency paused' }, 'warn');
    return { success: false, reason: 'System is emergency paused' };
  }

  // 2. Check Auto Welcome Enabled
  if (!settings.auto_welcome_enabled) {
    await logActivity(env, 'welcome_blocked', recipientId, { reason: 'Auto welcome is disabled in settings' }, 'info');
    return { success: false, reason: 'Auto welcome is disabled' };
  }

  // 3. Check Ignored Users
  if (isUserIgnored(settings, recipientId)) {
    await logActivity(env, 'welcome_blocked', recipientId, { reason: 'Recipient is in ignored list' }, 'info');
    return { success: false, reason: 'Recipient is ignored' };
  }

  // 4. Check Quiet Hours
  if (isQuietHours(settings)) {
    await logActivity(env, 'welcome_blocked', recipientId, { reason: 'Quiet hours active' }, 'info');
    return { success: false, reason: 'Quiet hours are active' };
  }

  // 5. Check Per-User Cooldown
  const cooldown = await checkCooldown(kv, recipientId);
  if (cooldown.onCooldown) {
    const minsLeft = Math.ceil(cooldown.remainingSeconds / 60);
    await logActivity(env, 'welcome_blocked', recipientId, { reason: `User on cooldown (${minsLeft} mins left)` }, 'info');
    return { success: false, reason: `User is on cooldown for another ${minsLeft} minutes` };
  }

  // 6. Check Global Daily Limit
  const dailyLimit = await checkDailyLimit(kv, settings.global_daily_limit || 100);
  if (!dailyLimit.allowed) {
    await logActivity(env, 'welcome_blocked', recipientId, { reason: 'Global daily message limit reached' }, 'warn');
    return { success: false, reason: 'Global daily message limit reached' };
  }

  // 7. Check if user has started the bot
  const botStarted = await hasRecipientStartedBot(kv, d1, recipientId);
  if (!botStarted) {
    await logActivity(env, 'welcome_blocked', recipientId, {
      reason: 'Recipient has not started the bot (/start). Telegram API requires user initiation.'
    }, 'warn');
    return {
      success: false,
      reason: 'Recipient has not initiated private conversation with the bot (/start required by Telegram Bot API)'
    };
  }

  // 8. Select and render message template
  const context = {
    name: recipientName || 'Friend',
    first_name: recipientName || 'Friend',
    username: recipientUsername || '',
    timer_mins: settings.inactivity_timer_minutes || 4,
    owner_name: settings.owner_name || 'Shiv Yogi'
  };

  const { template, renderedText } = await selectRandomMessage(kv, settings, context);

  // 9. Send message via Telegram Bot API
  const sendRes = await sendMessage(botToken, recipientId, renderedText);

  if (!sendRes.ok) {
    const errorMsg = sendRes.description || 'Unknown Telegram API error';
    await logActivity(env, 'welcome_failed', recipientId, {
      error: errorMsg,
      errorCode: sendRes.error_code,
      templateId: template.id
    }, 'error');

    // Record failure in D1
    if (d1 && typeof d1.prepare === 'function') {
      try {
        await d1.prepare(`
          INSERT INTO messages_history (recipient_id, recipient_name, recipient_username, template_id, template_title, category, message_text, delivery_status, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'failed', ?)
        `).bind(
          String(recipientId),
          recipientName || '',
          recipientUsername || '',
          template.id,
          template.title,
          template.category,
          renderedText,
          errorMsg
        ).run();
      } catch {}
    }

    return { success: false, reason: errorMsg };
  }

  const telegramMsgId = sendRes.result?.message_id;

  // 10. Update cooldown and daily limit
  await setCooldown(kv, recipientId, settings.user_cooldown_minutes || 1440);
  await incrementDailyCount(kv);

  // 11. Record in D1 history
  if (d1 && typeof d1.prepare === 'function') {
    try {
      await d1.prepare(`
        INSERT INTO messages_history (recipient_id, recipient_name, recipient_username, template_id, template_title, category, message_text, telegram_message_id, delivery_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')
      `).bind(
        String(recipientId),
        recipientName || '',
        recipientUsername || '',
        template.id,
        template.title,
        template.category,
        renderedText,
        telegramMsgId || null
      ).run();

      await d1.prepare(`
        UPDATE recipients
        SET last_auto_message_at = datetime('now'),
            total_messages_received = total_messages_received + 1,
            updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(String(recipientId)).run();
    } catch (err) {
      // Non-fatal database logging failure
    }
  }

  // 12. If Auto-Delete is enabled, schedule deletion
  if (settings.auto_delete_enabled && telegramMsgId && env.TIMER_DO) {
    try {
      const doId = env.TIMER_DO.idFromName('global_timer_hub');
      const stub = env.TIMER_DO.get(doId);
      await stub.fetch('http://durable-object/schedule-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: recipientId,
          messageId: telegramMsgId,
          delayMinutes: settings.auto_delete_minutes || 60
        })
      });
    } catch {
      // Non-critical auto-delete schedule error
    }
  }

  await logActivity(env, 'welcome_sent', recipientId, {
    templateId: template.id,
    templateTitle: template.title,
    telegramMessageId: telegramMsgId,
    triggerSource
  }, 'info');

  return {
    success: true,
    messageId: telegramMsgId,
    templateId: template.id,
    templateTitle: template.title
  };
}

/**
 * Cloudflare Durable Object Class for Reliable Timer Scheduling.
 * Uses native alarms to survive worker restarts and handle inactivity timers with precision.
 */
export class TimerDurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/schedule' && request.method === 'POST') {
      const data = await request.json();
      const { chatId, recipientId, recipientName, recipientUsername, durationMinutes } = data;

      if (!chatId) {
        return new Response(JSON.stringify({ error: 'Missing chatId' }), { status: 400 });
      }

      const wakeAt = Date.now() + (Number(durationMinutes) || 4) * 60 * 1000;
      const timerKey = `timer:${chatId}`;

      await this.ctx.storage.put(timerKey, {
        chatId,
        recipientId: recipientId || chatId,
        recipientName: recipientName || '',
        recipientUsername: recipientUsername || '',
        wakeAt,
        scheduledAt: Date.now()
      });

      // Update next alarm if sooner
      const currentAlarm = await this.ctx.storage.getAlarm();
      if (currentAlarm === null || wakeAt < currentAlarm) {
        await this.ctx.storage.setAlarm(wakeAt);
      }

      return new Response(JSON.stringify({ ok: true, wakeAt }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/cancel' && request.method === 'POST') {
      const data = await request.json();
      const { chatId } = data;
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'Missing chatId' }), { status: 400 });
      }

      const timerKey = `timer:${chatId}`;
      const existing = await this.ctx.storage.get(timerKey);
      if (existing) {
        await this.ctx.storage.delete(timerKey);
        await logActivity(this.env, 'timer_cancelled', chatId, { reason: 'Owner replied or manual cancel' }, 'info');
        return new Response(JSON.stringify({ ok: true, cancelled: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ ok: true, cancelled: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/schedule-delete' && request.method === 'POST') {
      const data = await request.json();
      const { chatId, messageId, delayMinutes } = data;
      const deleteKey = `delete:${chatId}:${messageId}`;
      const wakeAt = Date.now() + (Number(delayMinutes) || 60) * 60 * 1000;

      await this.ctx.storage.put(deleteKey, {
        chatId,
        messageId,
        wakeAt
      });

      const currentAlarm = await this.ctx.storage.getAlarm();
      if (currentAlarm === null || wakeAt < currentAlarm) {
        await this.ctx.storage.setAlarm(wakeAt);
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/list-timers' && request.method === 'GET') {
      const allEntries = await this.ctx.storage.list({ prefix: 'timer:' });
      const timers = Array.from(allEntries.values());
      return new Response(JSON.stringify({ ok: true, timers }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Alarm handler triggered when scheduled wakeAt timestamp is reached.
   */
  async alarm() {
    const now = Date.now();
    const allTimers = await this.ctx.storage.list({ prefix: 'timer:' });
    let nextAlarm = null;

    for (const [key, timer] of allTimers) {
      if (timer.wakeAt <= now) {
        // Timer has expired!
        await this.ctx.storage.delete(key);
        // Execute automatic welcome dispatch
        try {
          await executeAutoWelcomeDispatch(this.env, {
            recipientId: timer.recipientId,
            recipientName: timer.recipientName,
            recipientUsername: timer.recipientUsername,
            triggerSource: 'durable_object_alarm'
          });
        } catch (err) {
          await logActivity(this.env, 'alarm_dispatch_error', timer.recipientId, { error: err.message }, 'error');
        }
      } else {
        if (nextAlarm === null || timer.wakeAt < nextAlarm) {
          nextAlarm = timer.wakeAt;
        }
      }
    }

    // Process auto-delete items
    const allDeletes = await this.ctx.storage.list({ prefix: 'delete:' });
    for (const [key, delItem] of allDeletes) {
      if (delItem.wakeAt <= now) {
        await this.ctx.storage.delete(key);
        if (this.env.BOT_TOKEN) {
          await deleteMessage(this.env.BOT_TOKEN, delItem.chatId, delItem.messageId);
        }
      } else {
        if (nextAlarm === null || delItem.wakeAt < nextAlarm) {
          nextAlarm = delItem.wakeAt;
        }
      }
    }

    if (nextAlarm !== null) {
      await this.ctx.storage.setAlarm(nextAlarm);
    }
  }
}

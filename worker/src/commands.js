/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Telegram Command Processor Module
 */

import { isOwner } from './security.js';
import { getSettings, updateSettings, resetSettings } from './settings.js';
import {
  getMessages,
  getMessageById,
  addMessage,
  editMessage,
  deleteMessage,
  toggleMessage,
  resetDefaultMessages,
  renderTemplate,
  getTemplateStats,
  exportMessagesJson,
  importMessagesJson
} from './messages.js';
import { sendMessage } from './telegram.js';
import { markRecipientBotStarted } from './scheduler.js';

/**
 * Handles incoming Telegram commands and text messages.
 * @param {object} env 
 * @param {object} message 
 * @returns {Promise<void>}
 */
export async function handleCommand(env, message) {
  const chatId = message.chat?.id;
  const fromUser = message.from;
  const text = (message.text || '').trim();

  if (!chatId || !fromUser) {
    return;
  }

  const senderId = fromUser.id;
  const ownerId = env.OWNER_TELEGRAM_ID;
  const isSenderOwner = isOwner(senderId, ownerId);

  // If a regular user sends /start, register them and send welcome notice
  if (text.startsWith('/start')) {
    await markRecipientBotStarted(env.WELCOME_KV, env.DB, fromUser);

    if (!isSenderOwner) {
      const userGreeting = `╔═══════════════════════════════╗\n  ✦ SHIV YOGI AUTO ASSISTANT ✦  \n╚═══════════════════════════════╝\n\nHello ${fromUser.first_name || 'Friend'}! 🙏\n\nThis is the official automated assistant bot for Shiv Yogi.\n\n✅ Your conversation is now linked.\nWhen you message Shiv Yogi's direct account, this bot can automatically acknowledge your message if Shiv Yogi is away.\n\nThank you for connecting!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧`;
      await sendMessage(env.BOT_TOKEN, chatId, userGreeting);
      return;
    }
  }

  // Non-owner trying to use administrative commands
  if (!isSenderOwner) {
    const deniedMsg = `⛔ Access Denied.\n\nThis is a private administrative bot created by Shiv Yogi. You are not authorized to run administrative commands.`;
    await sendMessage(env.BOT_TOKEN, chatId, deniedMsg);
    return;
  }

  // Parse owner command and arguments
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().split('@')[0]; // Strip bot username if present e.g. /start@bot
  const rawArgs = text.slice(parts[0].length).trim();

  switch (command) {
    case '/start':
      await handleStartOwner(env, chatId);
      break;

    case '/help':
      await handleHelp(env, chatId);
      break;

    case '/status':
      await handleStatus(env, chatId);
      break;

    case '/settings':
      await handleSettings(env, chatId);
      break;

    case '/messages':
      await handleMessagesList(env, chatId, rawArgs);
      break;

    case '/addmessage':
      await handleAddMessage(env, chatId, rawArgs);
      break;

    case '/editmessage':
      await handleEditMessage(env, chatId, rawArgs);
      break;

    case '/deletemessage':
      await handleDeleteMessage(env, chatId, rawArgs);
      break;

    case '/preview':
      await handlePreview(env, chatId, rawArgs, fromUser);
      break;

    case '/history':
      await handleHistory(env, chatId, rawArgs);
      break;

    case '/stats':
      await handleStats(env, chatId);
      break;

    case '/timer':
      await handleTimer(env, chatId, rawArgs);
      break;

    case '/cooldown':
      await handleCooldown(env, chatId, rawArgs);
      break;

    case '/quiethours':
      await handleQuietHours(env, chatId, rawArgs);
      break;

    case '/ignore':
      await handleIgnore(env, chatId, rawArgs);
      break;

    case '/backup':
      await handleBackup(env, chatId);
      break;

    case '/restore':
      await handleRestore(env, chatId, rawArgs);
      break;

    case '/pause':
      await handlePause(env, chatId);
      break;

    case '/resume':
      await handleResume(env, chatId);
      break;

    default:
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        `❓ Unknown command: ${command}\nType /help to see all available owner commands.`
      );
      break;
  }
}

/**
 * /start command handler for the owner.
 */
async function handleStartOwner(env, chatId) {
  const settings = await getSettings(env.WELCOME_KV);
  const statusIcon = settings.emergency_paused ? '🔴 PAUSED' : (settings.auto_welcome_enabled ? '🟢 ACTIVE' : '🟡 DISABLED');

  const text = `╔═════════════════════════════════╗\n  ✦ SHIV YOGI AUTO WELCOME HUB ✦  \n╚═════════════════════════════════╝\n\nWelcome Shiv Yogi! Administrative portal is ready.\n\n┌─ [SYSTEM STATUS]\n├ State: ${statusIcon}\n├ Inactivity Timer: ${settings.inactivity_timer_minutes} minutes\n├ Cooldown: ${settings.user_cooldown_minutes} minutes\n└ Quiet Hours: ${settings.quiet_hours_enabled ? 'ON (' + settings.quiet_hours_start + ' - ' + settings.quiet_hours_end + ')' : 'OFF'}\n\n💡 Quick Commands:\n• /status - View real-time telemetry\n• /settings - Detailed configuration\n• /messages - Manage message templates\n• /timer <mins> - Change inactivity timer\n• /pause & /resume - Emergency toggle\n• /help - Full command manual\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧`;

  await sendMessage(env.BOT_TOKEN, chatId, text);
}

/**
 * /help command handler.
 */
async function handleHelp(env, chatId) {
  const text = `╭━━━〔 SHIV YOGI COMMAND MANUAL 〕━━━╮\n\n` +
    `◈ SYSTEM CONTROLS:\n` +
    `  /status - Live engine telemetry & health\n` +
    `  /settings - View full configuration\n` +
    `  /pause - Emergency stop all auto replies\n` +
    `  /resume - Re-enable auto replies\n\n` +
    `◈ TIMER & LIMITS:\n` +
    `  /timer <1-60> - Set inactivity timer (mins)\n` +
    `  /cooldown <mins> - Per-user cooldown\n` +
    `  /quiethours on|off|HH:MM-HH:MM - Quiet window\n` +
    `  /ignore <add|remove|list> [id] - Exclude users\n\n` +
    `◈ MESSAGE TEMPLATES:\n` +
    `  /messages - View all 20+ templates\n` +
    `  /messages toggle <id> - Enable or disable template\n` +
    `  /preview [id] - Preview rendered template\n` +
    `  /addmessage [category] | <text> - Add new\n` +
    `  /editmessage <id> | <text> - Modify text\n` +
    `  /deletemessage <id> - Delete template\n\n` +
    `◈ ANALYTICS & BACKUP:\n` +
    `  /history [count] - Recent dispatched logs\n` +
    `  /stats - Dispatch counters & top templates\n` +
    `  /backup - Export settings & templates JSON\n` +
    `  /restore <json> - Import backup data\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n✧ Created By Shiv Yogi ✧`;

  await sendMessage(env.BOT_TOKEN, chatId, text);
}

/**
 * /status command handler.
 */
async function handleStatus(env, chatId) {
  const settings = await getSettings(env.WELCOME_KV);
  const today = new Date().toISOString().slice(0, 10);
  let dailyCount = 0;
  if (env.WELCOME_KV) {
    dailyCount = Number(await env.WELCOME_KV.get(`daily_count:${today}`, 'text')) || 0;
  }

  const allMessages = await getMessages(env.WELCOME_KV);
  const enabledCount = allMessages.filter(m => m.enabled).length;

  let dbStatus = 'Not Connected';
  if (env.DB) {
    try {
      const res = await env.DB.prepare('SELECT COUNT(*) as c FROM recipients').first();
      dbStatus = `Connected (${res?.c || 0} recipients)`;
    } catch {
      dbStatus = 'Error querying D1';
    }
  }

  const text = `┌────────────────────────────────┐\n│ >> SHIV YOGI SYSTEM TELEMETRY  \n└────────────────────────────────┘\n\n` +
    `⚡ Engine State: ${settings.emergency_paused ? '🔴 EMERGENCY PAUSED' : (settings.auto_welcome_enabled ? '🟢 RUNNING' : '🟡 DISABLED')}\n` +
    `⏱️ Inactivity Timer: ${settings.inactivity_timer_minutes} mins\n` +
    `🛡️ User Cooldown: ${settings.user_cooldown_minutes} mins\n` +
    `📊 Today Dispatched: ${dailyCount} / ${settings.global_daily_limit}\n` +
    `📝 Templates: ${enabledCount} active of ${allMessages.length} total\n` +
    `🌙 Quiet Hours: ${settings.quiet_hours_enabled ? settings.quiet_hours_start + ' to ' + settings.quiet_hours_end : 'Disabled'}\n` +
    `🗄️ KV Storage: WELCOME_KV Active\n` +
    `💾 D1 Database: ${dbStatus}\n` +
    `⚙️ Version: ${settings.version || '1.0.0'}\n\n` +
    `──────────────────────────────────\n[Created By Shiv Yogi]`;

  await sendMessage(env.BOT_TOKEN, chatId, text);
}

/**
 * /settings command handler.
 */
async function handleSettings(env, chatId) {
  const s = await getSettings(env.WELCOME_KV);
  const text = `╭━━━〔 CURRENT CONFIGURATION 〕━━━╮\n\n` +
    `• auto_welcome_enabled: ${s.auto_welcome_enabled}\n` +
    `• inactivity_timer_minutes: ${s.inactivity_timer_minutes} min(s)\n` +
    `• user_cooldown_minutes: ${s.user_cooldown_minutes} min(s)\n` +
    `• global_daily_limit: ${s.global_daily_limit}\n` +
    `• quiet_hours_enabled: ${s.quiet_hours_enabled}\n` +
    `• quiet_hours_window: ${s.quiet_hours_start} - ${s.quiet_hours_end} (${s.quiet_hours_timezone})\n` +
    `• random_selection_mode: ${s.random_selection_mode}\n` +
    `• no_repeat_depth: ${s.no_repeat_depth}\n` +
    `• auto_delete_enabled: ${s.auto_delete_enabled} (${s.auto_delete_minutes} mins)\n` +
    `• emergency_paused: ${s.emergency_paused}\n` +
    `• ignored_users_count: ${(s.ignored_user_ids || []).length}\n` +
    `• active_categories: ${(s.active_categories || []).join(', ')}\n\n` +
    `Use commands like /timer, /cooldown, /quiethours to adjust.\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

  await sendMessage(env.BOT_TOKEN, chatId, text);
}

/**
 * /messages command handler.
 */
async function handleMessagesList(env, chatId, rawArgs) {
  const parts = rawArgs.split(/\s+/).filter(Boolean);

  if (parts[0] === 'toggle' && parts[1]) {
    const id = Number(parts[1]);
    const res = await toggleMessage(env.WELCOME_KV, id);
    if (!res.success) {
      await sendMessage(env.BOT_TOKEN, chatId, `❌ ${res.error}`);
    } else {
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        `✅ Template #${id} (${res.message.title}) is now ${res.message.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}.`
      );
    }
    return;
  }

  if (parts[0] === 'reset') {
    const defaults = await resetDefaultMessages(env.WELCOME_KV);
    await sendMessage(env.BOT_TOKEN, chatId, `✅ Reset successfully! Loaded ${defaults.length} default templates.`);
    return;
  }

  const list = await getMessages(env.WELCOME_KV);
  let summary = `📋 <b>Message Templates (${list.length} total)</b>\n\n`;

  for (const m of list) {
    const icon = m.enabled ? '🟢' : '🔴';
    const snippet = m.text.slice(0, 45).replace(/\n/g, ' ');
    summary += `${icon} <b>#${m.id}</b> [${m.category}] <i>${m.title}</i>\n<code>${snippet}...</code>\n/preview ${m.id} | /messages toggle ${m.id}\n\n`;
  }

  summary += `<i>To preview:</i> <code>/preview [id]</code>\n<i>To toggle:</i> <code>/messages toggle [id]</code>\n<i>To reset defaults:</i> <code>/messages reset</code>`;

  await sendMessage(env.BOT_TOKEN, chatId, summary, { parse_mode: 'HTML' });
}

/**
 * /preview command handler.
 */
async function handlePreview(env, chatId, rawArgs, user) {
  const id = Number(rawArgs) || 1;
  const template = await getMessageById(env.WELCOME_KV, id);

  if (!template) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Message template #${id} not found.`);
    return;
  }

  const settings = await getSettings(env.WELCOME_KV);
  const context = {
    name: user.first_name || 'Shiv Yogi',
    first_name: user.first_name || 'Shiv Yogi',
    username: user.username || 'shivyogi',
    timer_mins: settings.inactivity_timer_minutes || 4,
    owner_name: settings.owner_name || 'Shiv Yogi'
  };

  const rendered = renderTemplate(template.text, context);
  const previewNotice = `🔍 <b>PREVIEW: Template #${template.id} (${template.title})</b>\nStatus: ${template.enabled ? '🟢 Enabled' : '🔴 Disabled'} | Category: [${template.category}]\n\n` +
    `────────── <i>Simulated Message</i> ──────────\n\n${rendered}`;

  await sendMessage(env.BOT_TOKEN, chatId, previewNotice, { parse_mode: 'HTML' });
}

/**
 * /addmessage command handler.
 */
async function handleAddMessage(env, chatId, rawArgs) {
  if (!rawArgs) {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      `ℹ️ Usage:\n<code>/addmessage [category] | [text]</code>\nOr:\n<code>/addmessage [text]</code>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  let category = 'general';
  let text = rawArgs;

  if (rawArgs.includes('|')) {
    const split = rawArgs.split('|');
    category = split[0].trim().toLowerCase() || 'general';
    text = split.slice(1).join('|').trim();
  }

  const res = await addMessage(env.WELCOME_KV, { text, category });
  if (!res.success) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Error: ${res.error}`);
  } else {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      `✅ Added template #${res.message.id} [${res.message.category}]!\nPreview with: /preview ${res.message.id}`
    );
  }
}

/**
 * /editmessage command handler.
 */
async function handleEditMessage(env, chatId, rawArgs) {
  if (!rawArgs || !rawArgs.includes('|')) {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      `ℹ️ Usage:\n<code>/editmessage &lt;id&gt; | &lt;new text&gt;</code>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const [idStr, ...rest] = rawArgs.split('|');
  const id = Number(idStr.trim());
  const newText = rest.join('|').trim();

  if (isNaN(id)) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Invalid template ID.`);
    return;
  }

  const res = await editMessage(env.WELCOME_KV, id, { text: newText });
  if (!res.success) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Error: ${res.error}`);
  } else {
    await sendMessage(env.BOT_TOKEN, chatId, `✅ Template #${id} updated successfully!\nPreview with: /preview ${id}`);
  }
}

/**
 * /deletemessage command handler.
 */
async function handleDeleteMessage(env, chatId, rawArgs) {
  const id = Number(rawArgs);
  if (isNaN(id) || !id) {
    await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage: <code>/deletemessage &lt;id&gt;</code>`, { parse_mode: 'HTML' });
    return;
  }

  const res = await deleteMessage(env.WELCOME_KV, id);
  if (!res.success) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Error: ${res.error}`);
  } else {
    await sendMessage(env.BOT_TOKEN, chatId, `🗑️ Template #${id} deleted successfully.`);
  }
}

/**
 * /timer command handler.
 */
async function handleTimer(env, chatId, rawArgs) {
  const mins = Number(rawArgs);
  if (isNaN(mins) || mins < 1 || mins > 60) {
    await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage: <code>/timer &lt;1-60&gt;</code> (in minutes)`, { parse_mode: 'HTML' });
    return;
  }

  const res = await updateSettings(env.WELCOME_KV, { inactivity_timer_minutes: mins });
  if (!res.success) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ ${res.error}`);
  } else {
    await sendMessage(env.BOT_TOKEN, chatId, `⏱️ Inactivity timer updated to <b>${mins} minutes</b>.`, { parse_mode: 'HTML' });
  }
}

/**
 * /cooldown command handler.
 */
async function handleCooldown(env, chatId, rawArgs) {
  const mins = Number(rawArgs);
  if (isNaN(mins) || mins < 0) {
    await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage: <code>/cooldown &lt;minutes&gt;</code> (e.g. 1440 for 24h)`, { parse_mode: 'HTML' });
    return;
  }

  const res = await updateSettings(env.WELCOME_KV, { user_cooldown_minutes: mins });
  if (!res.success) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ ${res.error}`);
  } else {
    await sendMessage(env.BOT_TOKEN, chatId, `🛡️ Per-user cooldown updated to <b>${mins} minutes</b>.`, { parse_mode: 'HTML' });
  }
}

/**
 * /quiethours command handler.
 */
async function handleQuietHours(env, chatId, rawArgs) {
  const arg = rawArgs.toLowerCase().trim();
  if (arg === 'on') {
    await updateSettings(env.WELCOME_KV, { quiet_hours_enabled: true });
    await sendMessage(env.BOT_TOKEN, chatId, `🌙 Quiet hours enabled.`);
    return;
  }
  if (arg === 'off') {
    await updateSettings(env.WELCOME_KV, { quiet_hours_enabled: false });
    await sendMessage(env.BOT_TOKEN, chatId, `☀️ Quiet hours disabled.`);
    return;
  }

  // Format HH:MM-HH:MM
  const match = arg.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (match) {
    const [, start, end] = match;
    const res = await updateSettings(env.WELCOME_KV, {
      quiet_hours_enabled: true,
      quiet_hours_start: start,
      quiet_hours_end: end
    });
    if (res.success) {
      await sendMessage(env.BOT_TOKEN, chatId, `🌙 Quiet hours set to <b>${start} - ${end}</b> (UTC) and enabled.`, { parse_mode: 'HTML' });
      return;
    }
  }

  await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage:\n• <code>/quiethours on</code>\n• <code>/quiethours off</code>\n• <code>/quiethours 22:00-07:00</code>`, { parse_mode: 'HTML' });
}

/**
 * /ignore command handler.
 */
async function handleIgnore(env, chatId, rawArgs) {
  const [subcommand, targetId] = rawArgs.split(/\s+/).filter(Boolean);
  const settings = await getSettings(env.WELCOME_KV);
  const list = settings.ignored_user_ids || [];

  if (subcommand === 'list' || !subcommand) {
    if (list.length === 0) {
      await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ No users are currently ignored.`);
    } else {
      await sendMessage(env.BOT_TOKEN, chatId, `🚫 <b>Ignored Users (${list.length}):</b>\n<code>${list.join('\n')}</code>`, { parse_mode: 'HTML' });
    }
    return;
  }

  if (subcommand === 'add' && targetId) {
    if (list.includes(targetId)) {
      await sendMessage(env.BOT_TOKEN, chatId, `User ${targetId} is already in the ignore list.`);
      return;
    }
    list.push(targetId);
    await updateSettings(env.WELCOME_KV, { ignored_user_ids: list });
    await sendMessage(env.BOT_TOKEN, chatId, `🚫 User <code>${targetId}</code> added to ignore list.`, { parse_mode: 'HTML' });
    return;
  }

  if (subcommand === 'remove' && targetId) {
    const filtered = list.filter(id => id !== targetId);
    await updateSettings(env.WELCOME_KV, { ignored_user_ids: filtered });
    await sendMessage(env.BOT_TOKEN, chatId, `✅ User <code>${targetId}</code> removed from ignore list.`, { parse_mode: 'HTML' });
    return;
  }

  await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage:\n• <code>/ignore list</code>\n• <code>/ignore add &lt;id&gt;</code>\n• <code>/ignore remove &lt;id&gt;</code>`, { parse_mode: 'HTML' });
}

/**
 * /pause and /resume handlers.
 */
async function handlePause(env, chatId) {
  await updateSettings(env.WELCOME_KV, { emergency_paused: true });
  await sendMessage(env.BOT_TOKEN, chatId, `🔴 <b>EMERGENCY STOP ACTIVATED</b>.\nAll automatic message dispatches are paused immediately.`, { parse_mode: 'HTML' });
}

async function handleResume(env, chatId) {
  await updateSettings(env.WELCOME_KV, { emergency_paused: false });
  await sendMessage(env.BOT_TOKEN, chatId, `🟢 <b>SYSTEM RESUMED</b>.\nAutomatic message dispatches are active again.`, { parse_mode: 'HTML' });
}

/**
 * /history command handler.
 */
async function handleHistory(env, chatId, rawArgs) {
  const limit = Math.min(Number(rawArgs) || 10, 25);

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT recipient_name, recipient_username, template_title, delivery_status, sent_at
        FROM messages_history
        ORDER BY id DESC
        LIMIT ?
      `).bind(limit).all();

      if (!results || results.length === 0) {
        await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ No automatic message dispatches recorded yet.`);
        return;
      }

      let text = `📜 <b>Recent Dispatches (${results.length})</b>\n\n`;
      for (const r of results) {
        const icon = r.delivery_status === 'sent' ? '✅' : '❌';
        text += `${icon} <b>To:</b> ${r.recipient_name || r.recipient_username || 'User'}\n   <b>Template:</b> ${r.template_title}\n   <b>Time:</b> ${r.sent_at}\n\n`;
      }

      await sendMessage(env.BOT_TOKEN, chatId, text, { parse_mode: 'HTML' });
      return;
    } catch {
      // Fall through to KV activity log
    }
  }

  // Fallback to KV activity log
  if (env.WELCOME_KV) {
    const raw = await env.WELCOME_KV.get('history:recent_activity', 'json');
    if (Array.isArray(raw) && raw.length > 0) {
      let text = `📜 <b>Recent Activity Logs (${raw.slice(0, limit).length})</b>\n\n`;
      for (const log of raw.slice(0, limit)) {
        text += `• [${log.event_type}] ${log.timestamp?.slice(11, 19) || ''}\n  ${typeof log.details === 'string' ? log.details.slice(0, 80) : JSON.stringify(log.details).slice(0, 80)}\n\n`;
      }
      await sendMessage(env.BOT_TOKEN, chatId, text, { parse_mode: 'HTML' });
      return;
    }
  }

  await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ No history recorded yet.`);
}

/**
 * /stats command handler.
 */
async function handleStats(env, chatId) {
  const templateStats = await getTemplateStats(env.WELCOME_KV);
  const allTemplates = await getMessages(env.WELCOME_KV);

  let totalRecipients = 0;
  let totalDispatches = 0;

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const rec = await env.DB.prepare('SELECT COUNT(*) as c FROM recipients').first();
      totalRecipients = rec?.c || 0;
      const disp = await env.DB.prepare('SELECT COUNT(*) as c FROM messages_history WHERE delivery_status = "sent"').first();
      totalDispatches = disp?.c || 0;
    } catch {}
  }

  let text = `📊 <b>SHIV YOGI DISPATCH ANALYTICS</b>\n\n` +
    `• Total Unique Recipients: <b>${totalRecipients}</b>\n` +
    `• Total Auto Messages Sent: <b>${totalDispatches}</b>\n\n` +
    `🏆 <b>Top Used Templates:</b>\n`;

  const sortedStats = Object.entries(templateStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sortedStats.length === 0) {
    text += `<i>No message usage counters yet.</i>\n`;
  } else {
    for (const [idStr, count] of sortedStats) {
      const id = Number(idStr);
      const t = allTemplates.find(item => item.id === id);
      text += `• #${id} ${t?.title || 'Template'}: <b>${count}</b> sends\n`;
    }
  }

  await sendMessage(env.BOT_TOKEN, chatId, text, { parse_mode: 'HTML' });
}

/**
 * /backup command handler.
 */
async function handleBackup(env, chatId) {
  const settings = await getSettings(env.WELCOME_KV);
  const messages = await getMessages(env.WELCOME_KV);

  const backupData = {
    exported_at: new Date().toISOString(),
    creator: 'Shiv Yogi',
    bot_name: 'SHIV YOGI AUTO WELCOME',
    settings,
    messages
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const preview = jsonStr.length > 3500 ? jsonStr.slice(0, 3500) + '\n... [TRUNCATED]' : jsonStr;

  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    `💾 <b>CONFIGURATION BACKUP</b>\n\n<pre>${preview}</pre>\n\n<i>To restore, run:</i> <code>/restore &lt;json&gt;</code>`,
    { parse_mode: 'HTML' }
  );
}

/**
 * /restore command handler.
 */
async function handleRestore(env, chatId, rawArgs) {
  if (!rawArgs) {
    await sendMessage(env.BOT_TOKEN, chatId, `ℹ️ Usage: <code>/restore &lt;json_payload&gt;</code>`, { parse_mode: 'HTML' });
    return;
  }

  try {
    const data = JSON.parse(rawArgs);
    if (data.settings && typeof data.settings === 'object') {
      await updateSettings(env.WELCOME_KV, data.settings);
    }
    if (Array.isArray(data.messages)) {
      await importMessagesJson(env.WELCOME_KV, data.messages);
    }

    await sendMessage(env.BOT_TOKEN, chatId, `✅ Backup restored successfully! Settings and message templates updated.`);
  } catch (err) {
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Failed to parse restore JSON: ${err.message}`);
  }
}

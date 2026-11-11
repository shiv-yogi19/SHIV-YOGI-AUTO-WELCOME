/**
 * ============================================================================
 * SHIV YOGI AUTO WELCOME BOT — PRODUCTION CLOUDFLARE WORKER
 * Created By Shiv Yogi
 *
 * Self-Contained, Production-Ready Cloudflare Worker Code
 * Paste directly into the Cloudflare Dashboard worker.js editor.
 *
 * Features:
 * - Telegram Bot API Integration (FloodWait 429 backoff)
 * - Secure Telegram Webhook with secret validation & update deduplication
 * - 19 Owner Administrative Slash Commands
 * - 20 Default Stylish English Message Templates (ASCII & Unicode)
 * - Inactivity Timer & Anti-Spam (Cooldowns, Daily Limits, Quiet Hours)
 * - Cloudflare KV Storage via env.WELCOME_KV
 * - Secure MTProto Companion API Endpoints
 * - Zero external imports or npm dependencies
 * ============================================================================
 */



// ============================================================================
// 1. DEFAULT CONFIGURATION & TEMPLATES
// ============================================================================

export const DEFAULT_SETTINGS = {
  "auto_welcome_enabled": true,
  "inactivity_timer_minutes": 4,
  "user_cooldown_minutes": 1440,
  "global_daily_limit": 100,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "quiet_hours_timezone": "UTC",
  "random_selection_mode": "no_repeat",
  "no_repeat_depth": 5,
  "ignored_user_ids": [],
  "max_messages_per_recipient": 5,
  "auto_delete_enabled": false,
  "auto_delete_minutes": 60,
  "emergency_paused": false,
  "owner_name": "Shiv Yogi",
  "active_categories": [
    "general",
    "away",
    "busy",
    "inactivity",
    "support"
  ],
  "version": "1.0.0"
};

export const DEFAULT_MESSAGES = [
  {
    "id": 1,
    "title": "Cosmic Gateway",
    "category": "general",
    "enabled": true,
    "order": 1,
    "text": "╔═══════════════════════════════╗\n  ✦ SHIV YOGI AUTO ASSISTANT ✦  \n╚═══════════════════════════════╝\n◈ Greetings {name}! ◈\n\nI am the automated personal assistant for Shiv Yogi. Your message has safely reached the inbox.\n\n⚡ Status: Away from keyboard\n⏳ Expected Response: Soon as available\n\nThank you for reaching out with patience!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 2,
    "title": "Minimalist Cyber",
    "category": "general",
    "enabled": true,
    "order": 2,
    "text": "╭━━━〔 SHIV YOGI • AWAY NOTICE 〕━━━╮\n\nHello {name} ❖\n\nShiv Yogi is currently engaged and away from direct messaging.\nYour inquiry has been logged and prioritized.\n\n┌─ [STATUS DETAILS]\n├ Status: Away / Focused Work\n├ Logged: Active\n└ Follow-up: As soon as online\n\nHave a wonderful day ahead!\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n⚡ Created By Shiv Yogi ⚡"
  },
  {
    "id": 3,
    "title": "Zen Focus",
    "category": "busy",
    "enabled": true,
    "order": 3,
    "text": "◈━━━━━ ❖ DEEP FOCUS MODE ❖ ━━━━━◈\n\nNamaste {name} 🙏\n\nShiv Yogi is immersed in focused engineering work right now.\n\n✦ Messages are received and queued.\n✦ Priority notifications remain active.\n✦ You will receive a direct reply soon.\n\nThank you for your understanding and peace.\n◈━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◈\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 4,
    "title": "Digital Terminal",
    "category": "inactivity",
    "enabled": true,
    "order": 4,
    "text": "┌────────────────────────────────┐\n│ >> SHIV YOGI AUTOMATED DISPATCH\n└────────────────────────────────┘\n[SYSTEM]: Message acknowledged from @{username}.\n\nShiv Yogi has not responded within the past {timer_mins} minutes and may be offline, in a session, or traveling.\n\n◈ Direct ping queued\n◈ Will respond once back at terminal\n\nThanks for connecting!\n──────────────────────────────────\n[Created By Shiv Yogi]"
  },
  {
    "id": 5,
    "title": "Golden Horizon",
    "category": "general",
    "enabled": true,
    "order": 5,
    "text": "★・・・・・・★・・・・・・★\n  ⚡ SHIV YOGI AUTO WELCOME ⚡\n★・・・・・・★・・・・・・★\n\nHello {name}!\n\nThank you for getting in touch. Shiv Yogi is currently stepping away from screen time.\n\nIf this is urgent, please leave any key details or context in this chat so Shiv Yogi can review it right away upon return.\n\nWishing you great energy and productivity!\n─────────────────────────────\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 6,
    "title": "Engineering Desk",
    "category": "busy",
    "enabled": true,
    "order": 6,
    "text": "╔═━─━─━─━─━─━─━─━─━─━─━─━═╗\n║  ⚙️ SHIV YOGI WORKSPACE ⚙️  ║\n╚═━─━─━─━─━─━─━─━─━─━─━─━═╝\nHi {name}!\n\nShiv Yogi is currently in the middle of active development and deployment tasks.\n\n◈ Inbox: Received\n◈ Notification: Triggered\n◈ Reply Window: As soon as current task completes\n\nFeel free to write your full question or request here.\n───────────────────────────\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 7,
    "title": "Starlight Greeting",
    "category": "general",
    "enabled": true,
    "order": 7,
    "text": "✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦\n   SHIV YOGI ASSISTANT BOT  \n✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦\n\nHey {name}! 🌟\n\nThanks for dropping a message. Shiv Yogi is temporarily unreachable at the moment.\n\nDon't worry—your text is safe in the conversation thread. A personalized reply is on its way as soon as Shiv Yogi is back online.\n\nTake care and have an inspiring day!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 8,
    "title": "Quantum Shield",
    "category": "inactivity",
    "enabled": true,
    "order": 8,
    "text": "╭─────────────────────────────╮\n│  ◈ INACTIVITY AUTO-ALERT ◈   │\n╰─────────────────────────────╯\nGreetings {name},\n\nShiv Yogi has been away from Telegram for over {timer_mins} minutes.\n\nThis automatic welcome bot has logged your conversation. Shiv Yogi values your time and will check back shortly.\n\nStay awesome!\n─────────────────────────────\n⚡ Created By Shiv Yogi ⚡"
  },
  {
    "id": 9,
    "title": "Modern Clean",
    "category": "general",
    "enabled": true,
    "order": 9,
    "text": "◈ ————————————————————— ◈\n  SHIV YOGI • INSTANT NOTICE\n◈ ————————————————————— ◈\n\nHello {name},\n\nThank you for reaching out! Shiv Yogi is currently offline or away from the phone.\n\nFeel free to outline your inquiry or topic in detail so we can dive straight in when back.\n\nWarm regards,\nShiv Yogi\n—————————————————————————\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 10,
    "title": "Meeting Alert",
    "category": "busy",
    "enabled": true,
    "order": 10,
    "text": "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  📅 IN A MEETING / SESSION   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\nHi {name},\n\nShiv Yogi may be in a client meeting, conference call, or technical consultation right now.\n\n◈ Message Status: Unread (Pending)\n◈ Estimated Delay: Normal meeting slot\n\nYour message is appreciated and will be attended to promptly afterwards!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 11,
    "title": "Twilight Rest",
    "category": "away",
    "enabled": true,
    "order": 11,
    "text": "☾ ⋆*･ﾟ:⋆*･ﾟ:⠀ *⋆.*:･ﾟ .: ⋆*･ﾟ: .⋆\n   SHIV YOGI • NIGHT / QUIET DESK\n☾ ⋆*･ﾟ:⋆*･ﾟ:⠀ *⋆.*:･ﾟ .: ⋆*･ﾟ: .⋆\n\nHello {name} 🌙\n\nShiv Yogi is currently taking rest or outside regular active hours.\n\nYour message is safely recorded. Shiv Yogi will get back to you first thing upon waking up or returning to desk.\n\nWishing you peaceful hours ahead!\n───────────────────────────────\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 12,
    "title": "Vibrant Spark",
    "category": "general",
    "enabled": true,
    "order": 12,
    "text": "⚡ ═══════════════════════════ ⚡\n     SHIV YOGI AUTO WELCOME\n⚡ ═══════════════════════════ ⚡\n\nHello {name}!\n\nGlad to see you here. Shiv Yogi is momentarily occupied with other responsibilities.\n\nDrop any questions, links, or files here—they won't be missed. Shiv Yogi will review them shortly.\n\nCheers and speak soon!\n═══════════════════════════════\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 13,
    "title": "Executive Brief",
    "category": "general",
    "enabled": true,
    "order": 13,
    "text": "╔═════════════════════════════╗\n║    SHIV YOGI • DISPATCH     ║\n╚═════════════════════════════╝\nDear {name},\n\nThank you for reaching out to Shiv Yogi's direct account.\n\nAt present, Shiv Yogi is away from active messaging. All chats are queued systematically to ensure thoughtful responses.\n\nThank you for your kind patience and collaboration.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 14,
    "title": "Tech Lab Alert",
    "category": "busy",
    "enabled": true,
    "order": 14,
    "text": "┌───[ ❖ SHIV YOGI TECH LAB ❖ ]───┐\n\nHey {name}!\n\nShiv Yogi is currently debugging, testing, or building code in the lab.\n\nTo help speed things up when Shiv Yogi sees this, please feel free to leave:\n1. Your question or topic\n2. Any relevant links or reference docs\n\nCatch you soon!\n└───[ Created By Shiv Yogi ]───┘"
  },
  {
    "id": 15,
    "title": "Nordic Minimal",
    "category": "general",
    "enabled": true,
    "order": 15,
    "text": "· · ─────── · 𖥸 · ─────── · ·\n     SHIV YOGI ASSISTANT\n· · ─────── · 𖥸 · ─────── · ·\n\nHello {name},\n\nShiv Yogi is currently away from the keyboard and will be back shortly.\n\nThank you for your message and your patience!\n\nBest regards,\nShiv Yogi\n· · ─────── · 𖥸 · ─────── · ·\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 16,
    "title": "Road Warrior",
    "category": "away",
    "enabled": true,
    "order": 16,
    "text": "🚘 ━━━━━━━━━━━━━━━━━━━━━━━━━ 🚘\n   SHIV YOGI • ON THE MOVE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nHi {name}!\n\nShiv Yogi might be in transit, driving, or away from a stable workstation right now.\n\nSafety and focus first! Once at a safe stopping point, Shiv Yogi will review and reply to your chat.\n\nThanks for understanding!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 17,
    "title": "Priority Support",
    "category": "support",
    "enabled": true,
    "order": 17,
    "text": "◈═════════════════════════════◈\n   SHIV YOGI • BOT DESK\n◈═════════════════════════════◈\n\nGreetings {name}!\n\nYour message to Shiv Yogi has been logged into the queue.\n\nIf you are inquiring about a project, collaboration, or technical support, please drop the details below for a faster turnaround.\n\nHave a productive day!\n─────────────────────────────\n⚡ Created By Shiv Yogi ⚡"
  },
  {
    "id": 18,
    "title": "Nexus Protocol",
    "category": "inactivity",
    "enabled": true,
    "order": 18,
    "text": "⟨⟨ NEXUS AUTO-DISPATCH // SHIV YOGI ⟩⟩\n\nNotice for: {name}\n\nShiv Yogi's account detected no direct user activity for {timer_mins} minutes following your ping.\n\nThis automatic dispatch confirms your message is safe and awaiting review.\n\nThank you for reaching out!\n══════════════════════════════\n✧ Created By Shiv Yogi ✧"
  },
  {
    "id": 19,
    "title": "Harmonic Flow",
    "category": "general",
    "enabled": true,
    "order": 19,
    "text": "✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦\n   SHIV YOGI AUTO WELCOME\n✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦\n\nHello {name}!\n\nShiv Yogi is currently taking a short break from screens to recharge.\n\nEvery message is appreciated. Shiv Yogi will get back to you with full focus very soon.\n\nWishing you peace and good vibes!\n─────────────────────────\n✦ Created By Shiv Yogi ✦"
  },
  {
    "id": 20,
    "title": "Signature Farewell",
    "category": "general",
    "enabled": true,
    "order": 20,
    "text": "╭─━━━━━━━━━━━━━━━━━━━━━━━━━━━━─╮\n│   ❖ SHIV YOGI AUTO BOT ❖    │\n╰─━━━━━━━━━━━━━━━━━━━━━━━━━━━━─╯\n\nHello {name}!\n\nThank you for connecting with Shiv Yogi. Currently away from Telegram.\n\nYour chat is at the top of the queue and will be handled shortly.\n\nWarm regards,\nShiv Yogi\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧"
  }
];


// ============================================================================

// 2. SECURITY & VALIDATION ENGINE

// ============================================================================


/**
 * Constant-time string equality check to prevent timing attacks.
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    mismatch |= (bufA[i] ^ bufB[i]);
  }
  return mismatch === 0;
}

/**
 * Validates the Telegram Bot API Webhook Secret Token header.
 * @param {Request} request 
 * @param {string} expectedSecret 
 * @returns {boolean}
 */
export function validateWebhookSecret(request, expectedSecret) {
  if (!expectedSecret) {
    return false;
  }
  const token = request.headers.get('x-telegram-bot-api-secret-token');
  if (!token) {
    return false;
  }
  return timingSafeEqualStr(token, expectedSecret);
}

/**
 * Validates the Companion service API secret header.
 * Accepts X-Companion-Secret or Authorization: Bearer <secret>.
 * @param {Request} request 
 * @param {string} expectedSecret 
 * @returns {boolean}
 */
export function validateCompanionSecret(request, expectedSecret) {
  if (!expectedSecret) {
    return false;
  }
  const directHeader = request.headers.get('x-companion-secret');
  if (directHeader && timingSafeEqualStr(directHeader, expectedSecret)) {
    return true;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    return timingSafeEqualStr(bearerToken, expectedSecret);
  }
  return false;
}

/**
 * Checks if a given Telegram User ID matches the configured Owner ID.
 * @param {number|string} userId 
 * @param {number|string} ownerId 
 * @returns {boolean}
 */
export function isOwner(userId, ownerId) {
  if (userId === undefined || userId === null || !ownerId) {
    return false;
  }
  const cleanOwner = String(ownerId).trim();
  if (!cleanOwner || cleanOwner === 'YOUR_TELEGRAM_USER_ID' || cleanOwner === '0' || cleanOwner === 'undefined') {
    return false;
  }
  return String(userId).trim() === cleanOwner;
}

/**
 * Sanitizes user input string against excessive length and null bytes.
 * @param {string} input 
 * @param {number} maxLength 
 * @returns {string}
 */
export function sanitizeInput(input, maxLength = 2000) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove null bytes and limit length
  return input.replace(/\0/g, '').trim().slice(0, maxLength);
}

/**
 * Masks sensitive secrets or tokens for safe diagnostic logging.
 * @param {string} secret 
 * @returns {string}
 */
export function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '[EMPTY]';
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '...' + secret.slice(-4);
}

/**
 * Verifies that an incoming payload matches Telegram update schema.
 * @param {any} update 
 * @returns {{valid: boolean, reason?: string}}
 */
export function verifyTelegramUpdate(update) {
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    return { valid: false, reason: 'Update payload must be a JSON object' };
  }
  if (!('update_id' in update) || typeof update.update_id !== 'number') {
    return { valid: false, reason: 'Missing or invalid update_id' };
  }
  const hasExpectedEntity = Boolean(
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post ||
    update.callback_query ||
    update.my_chat_member
  );
  if (!hasExpectedEntity) {
    return { valid: false, reason: 'Payload does not contain a recognized Telegram event' };
  }
  return { valid: true };
}

/**
 * Simple in-memory / KV rate limiter by key.
 * @param {object} kv 
 * @param {string} key 
 * @param {number} maxRequests 
 * @param {number} windowSeconds 
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkRateLimit(kv, key, maxRequests = 60, windowSeconds = 60) {
  if (!kv || typeof kv.get !== 'function') {
    return { allowed: true, remaining: maxRequests };
  }
  const kvKey = `ratelimit:${key}`;
  try {
    const raw = await kv.get(kvKey, 'json');
    const now = Math.floor(Date.now() / 1000);
    if (!raw || now > raw.resetAt) {
      const data = { count: 1, resetAt: now + windowSeconds };
      await kv.put(kvKey, JSON.stringify(data), { expirationTtl: windowSeconds });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    if (raw.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    raw.count += 1;
    const ttl = Math.max(10, raw.resetAt - now);
    await kv.put(kvKey, JSON.stringify(raw), { expirationTtl: ttl });
    return { allowed: true, remaining: maxRequests - raw.count };
  } catch (err) {
    return { allowed: true, remaining: 1 };
  }
}

/**
 * Checks and prevents duplicate Telegram update processing using KV.
 * @param {object} kv 
 * @param {number|string} updateId 
 * @param {number} ttlSeconds 
 * @returns {Promise<boolean>} True if update is new, false if duplicate
 */
export async function checkDuplicateUpdate(kv, updateId, ttlSeconds = 300) {
  if (!kv || typeof kv.get !== 'function' || !updateId) {
    return true; // If KV not available, allow
  }
  const key = `update_dedup:${updateId}`;
  try {
    const existing = await kv.get(key);
    if (existing) {
      return false; // Already processed!
    }
    await kv.put(key, '1', { expirationTtl: ttlSeconds });
    return true;
  } catch (err) {
    return true;
  }
}


// ============================================================================

// 3. TELEGRAM BOT API CLIENT

// ============================================================================


const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Strips the bot token from any text or URL to prevent leakage in errors and logs.
 * @param {string} text 
 * @param {string} token 
 * @returns {string}
 */
export function sanitizeTelegramLog(text, token) {
  if (!text || typeof text !== 'string') return '';
  if (!token || typeof token !== 'string') return text;
  return text.replaceAll(token, '[REDACTED_BOT_TOKEN]');
}

/**
 * Generic wrapper for Telegram Bot API calls with exponential backoff & FloodWait handling.
 * @param {string} token 
 * @param {string} method 
 * @param {object} payload 
 * @param {number} maxRetries 
 * @returns {Promise<{ok: boolean, result?: any, description?: string, error_code?: number}>}
 */
export async function callTelegramApi(token, method, payload = {}, maxRetries = 3) {
  if (!token) {
    return { ok: false, description: 'Telegram BOT_TOKEN is missing or not configured' };
  }

  const endpoint = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.ok) {
        return data;
      }

      // Handle Telegram 429 Too Many Requests (FloodWait)
      if (response.status === 429 && data && data.parameters && data.parameters.retry_after) {
        const retryAfterSec = Math.min(data.parameters.retry_after, 10);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
          continue;
        }
      }

      // Server error 5xx, retry with exponential backoff
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      const description = data?.description || `HTTP ${response.status}: ${response.statusText}`;
      return {
        ok: false,
        error_code: data?.error_code || response.status,
        description: sanitizeTelegramLog(description, token),
      };
    } catch (err) {
      if (attempt >= maxRetries) {
        return {
          ok: false,
          description: sanitizeTelegramLog(err.message || 'Network error communicating with Telegram', token),
        };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  return { ok: false, description: 'Maximum API retries exceeded' };
}

/**
 * Sends a text message to a user or chat.
 * @param {string} token 
 * @param {number|string} chatId 
 * @param {string} text 
 * @param {object} options 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function sendMessage(token, chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parse_mode,
    reply_markup: options.reply_markup,
    disable_web_page_preview: options.disable_web_page_preview ?? true,
  };
  return callTelegramApi(token, 'sendMessage', payload);
}

/**
 * Deletes a message from a chat (e.g. for auto-delete feature).
 * Note: Bot can delete incoming/outgoing messages within 48h in private chats.
 * @param {string} token 
 * @param {number|string} chatId 
 * @param {number} messageId 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function deleteTelegramMessage(token, chatId, messageId) {
  return callTelegramApi(token, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}
export const deleteMessage = deleteTelegramMessage;

/**
 * Retrieves bot profile information to verify token validity.
 * @param {string} token 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function getMe(token) {
  return callTelegramApi(token, 'getMe');
}

/**
 * Sets the webhook URL and secret token for the bot.
 * @param {string} token 
 * @param {string} webhookUrl 
 * @param {string} secretToken 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function setWebhook(token, webhookUrl, secretToken) {
  const payload = {
    url: webhookUrl,
    max_connections: 40,
    allowed_updates: ['message', 'edited_message', 'callback_query', 'my_chat_member'],
    drop_pending_updates: false,
  };
  if (secretToken) {
    payload.secret_token = secretToken;
  }
  return callTelegramApi(token, 'setWebhook', payload);
}

/**
 * Gets the current webhook registration status.
 * @param {string} token 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function getWebhookInfo(token) {
  return callTelegramApi(token, 'getWebhookInfo');
}

/**
 * Deletes the webhook registration.
 * @param {string} token 
 * @returns {Promise<{ok: boolean, result?: any, description?: string}>}
 */
export async function deleteWebhook(token) {
  return callTelegramApi(token, 'deleteWebhook');
}


// ============================================================================

// 4. SETTINGS & CONFIGURATION ENGINE (WELCOME_KV)

// ============================================================================


// (DEFAULT_SETTINGS defined above)

const SETTINGS_KV_KEY = 'config:settings';

/**
 * Retrieves current settings from KV, falling back to DEFAULT_SETTINGS.
 * @param {object} kv 
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings(kv) {
  if (!kv || typeof kv.get !== 'function') {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const stored = await kv.get(SETTINGS_KV_KEY, 'json');
    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Updates partial settings in KV with strict validation.
 * @param {object} kv 
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch 
 * @returns {Promise<{success: boolean, settings?: typeof DEFAULT_SETTINGS, error?: string}>}
 */
export async function updateSettings(kv, patch) {
  if (!kv || typeof kv.put !== 'function') {
    return { success: false, error: 'Cloudflare KV storage is not bound' };
  }

  const current = await getSettings(kv);
  const validated = { ...current };

  if ('auto_welcome_enabled' in patch) {
    validated.auto_welcome_enabled = Boolean(patch.auto_welcome_enabled);
  }

  if ('inactivity_timer_minutes' in patch) {
    const mins = Number(patch.inactivity_timer_minutes);
    if (isNaN(mins) || mins < 1 || mins > 60) {
      return { success: false, error: 'Inactivity timer must be an integer between 1 and 60 minutes' };
    }
    validated.inactivity_timer_minutes = Math.round(mins);
  }

  if ('user_cooldown_minutes' in patch) {
    const cooldown = Number(patch.user_cooldown_minutes);
    if (isNaN(cooldown) || cooldown < 0) {
      return { success: false, error: 'User cooldown must be a non-negative number' };
    }
    validated.user_cooldown_minutes = Math.round(cooldown);
  }

  if ('global_daily_limit' in patch) {
    const limit = Number(patch.global_daily_limit);
    if (isNaN(limit) || limit < 1) {
      return { success: false, error: 'Global daily limit must be at least 1' };
    }
    validated.global_daily_limit = Math.round(limit);
  }

  if ('quiet_hours_enabled' in patch) {
    validated.quiet_hours_enabled = Boolean(patch.quiet_hours_enabled);
  }

  if ('quiet_hours_start' in patch) {
    if (!/^\d{2}:\d{2}$/.test(patch.quiet_hours_start)) {
      return { success: false, error: 'Quiet hours start must be in HH:MM 24h format' };
    }
    validated.quiet_hours_start = patch.quiet_hours_start;
  }

  if ('quiet_hours_end' in patch) {
    if (!/^\d{2}:\d{2}$/.test(patch.quiet_hours_end)) {
      return { success: false, error: 'Quiet hours end must be in HH:MM 24h format' };
    }
    validated.quiet_hours_end = patch.quiet_hours_end;
  }

  if ('random_selection_mode' in patch) {
    const validModes = ['random', 'no_repeat', 'sequential'];
    if (!validModes.includes(patch.random_selection_mode)) {
      return { success: false, error: `Invalid selection mode. Must be one of: ${validModes.join(', ')}` };
    }
    validated.random_selection_mode = patch.random_selection_mode;
  }

  if ('no_repeat_depth' in patch) {
    const depth = Number(patch.no_repeat_depth);
    if (isNaN(depth) || depth < 1 || depth > 20) {
      return { success: false, error: 'No-repeat depth must be between 1 and 20' };
    }
    validated.no_repeat_depth = Math.round(depth);
  }

  if ('ignored_user_ids' in patch) {
    if (!Array.isArray(patch.ignored_user_ids)) {
      return { success: false, error: 'ignored_user_ids must be an array of user IDs' };
    }
    validated.ignored_user_ids = patch.ignored_user_ids.map(id => String(id).trim()).filter(Boolean);
  }

  if ('max_messages_per_recipient' in patch) {
    const max = Number(patch.max_messages_per_recipient);
    if (isNaN(max) || max < 1) {
      return { success: false, error: 'max_messages_per_recipient must be at least 1' };
    }
    validated.max_messages_per_recipient = Math.round(max);
  }

  if ('auto_delete_enabled' in patch) {
    validated.auto_delete_enabled = Boolean(patch.auto_delete_enabled);
  }

  if ('auto_delete_minutes' in patch) {
    const mins = Number(patch.auto_delete_minutes);
    if (isNaN(mins) || mins < 1 || mins > 2880) { // Max 48h (Telegram limit)
      return { success: false, error: 'Auto delete timer must be between 1 and 2880 minutes (48h)' };
    }
    validated.auto_delete_minutes = Math.round(mins);
  }

  if ('emergency_paused' in patch) {
    validated.emergency_paused = Boolean(patch.emergency_paused);
  }

  if ('owner_name' in patch && typeof patch.owner_name === 'string') {
    validated.owner_name = patch.owner_name.trim().slice(0, 64) || 'Shiv Yogi';
  }

  if ('active_categories' in patch && Array.isArray(patch.active_categories)) {
    validated.active_categories = patch.active_categories.map(c => String(c).toLowerCase().trim()).filter(Boolean);
  }

  await kv.put(SETTINGS_KV_KEY, JSON.stringify(validated));
  return { success: true, settings: validated };
}

/**
 * Resets settings to factory defaults.
 * @param {object} kv 
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function resetSettings(kv) {
  if (kv && typeof kv.put === 'function') {
    await kv.put(SETTINGS_KV_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Checks if current time is within configured quiet hours.
 * @param {object} settings 
 * @param {Date} [now] 
 * @returns {boolean}
 */
export function isQuietHours(settings, now = new Date()) {
  if (!settings || !settings.quiet_hours_enabled) {
    return false;
  }

  const parseTime = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMins = parseTime(settings.quiet_hours_start || '22:00');
  const endMins = parseTime(settings.quiet_hours_end || '07:00');

  if (startMins <= endMins) {
    // Normal window: e.g. 01:00 to 06:00
    return currentMins >= startMins && currentMins < endMins;
  } else {
    // Overnight window: e.g. 22:00 to 07:00
    return currentMins >= startMins || currentMins < endMins;
  }
}

/**
 * Checks if a user ID is in the ignored list.
 * @param {object} settings 
 * @param {string|number} userId 
 * @returns {boolean}
 */
export function isUserIgnored(settings, userId) {
  if (!settings || !Array.isArray(settings.ignored_user_ids)) {
    return false;
  }
  const target = String(userId).trim();
  return settings.ignored_user_ids.some(id => String(id).trim() === target);
}


// ============================================================================

// 5. MESSAGE REPOSITORY & NO-REPEAT RANDOM ENGINE

// ============================================================================


const MESSAGES_KV_KEY = 'config:messages';
const RECENT_IDS_KV_KEY = 'history:recent_message_ids';
const STATS_KV_KEY = 'stats:template_usage';

export const INITIAL_MESSAGES = DEFAULT_MESSAGES;

/**
 * Retrieves all message templates from KV, initializing defaults if not yet seeded.
 * @param {object} kv 
 * @returns {Promise<Array<object>>}
 */
export async function getMessages(kv) {
  if (!kv || typeof kv.get !== 'function') {
    return JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  }
  try {
    const stored = await kv.get(MESSAGES_KV_KEY, 'json');
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    // Seed default messages into KV
    await kv.put(MESSAGES_KV_KEY, JSON.stringify(INITIAL_MESSAGES));
    return JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  } catch (err) {
    return JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  }
}

/**
 * Persists the entire message templates array to KV.
 * @param {object} kv 
 * @param {Array<object>} messages 
 * @returns {Promise<boolean>}
 */
export async function saveMessages(kv, messages) {
  if (!kv || typeof kv.put !== 'function') {
    return false;
  }
  await kv.put(MESSAGES_KV_KEY, JSON.stringify(messages));
  return true;
}

/**
 * Finds a single message template by its ID.
 * @param {object} kv 
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export async function getMessageById(kv, id) {
  const numId = Number(id);
  const list = await getMessages(kv);
  return list.find(m => m.id === numId) || null;
}

/**
 * Adds a new custom message template.
 * @param {object} kv 
 * @param {{text: string, title?: string, category?: string, enabled?: boolean}} msgData 
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
export async function addMessage(kv, msgData) {
  if (!msgData || typeof msgData.text !== 'string' || !msgData.text.trim()) {
    return { success: false, error: 'Message text cannot be empty' };
  }

  const list = await getMessages(kv);
  const maxId = list.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0);
  const newId = maxId + 1;

  const newMsg = {
    id: newId,
    title: msgData.title?.trim() || `Custom Template #${newId}`,
    category: (msgData.category?.trim().toLowerCase()) || 'general',
    enabled: msgData.enabled !== undefined ? Boolean(msgData.enabled) : true,
    order: list.length + 1,
    text: msgData.text.trim()
  };

  list.push(newMsg);
  await saveMessages(kv, list);
  return { success: true, message: newMsg };
}

/**
 * Edits an existing message template.
 * @param {object} kv 
 * @param {number} id 
 * @param {Partial<{text: string, title: string, category: string, enabled: boolean}>} updates 
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
export async function editMessage(kv, id, updates) {
  const numId = Number(id);
  const list = await getMessages(kv);
  const index = list.findIndex(m => m.id === numId);

  if (index === -1) {
    return { success: false, error: `Message with ID ${id} not found` };
  }

  const current = list[index];
  if (updates.text !== undefined) {
    if (typeof updates.text !== 'string' || !updates.text.trim()) {
      return { success: false, error: 'Message text cannot be empty' };
    }
    current.text = updates.text.trim();
  }
  if (updates.title !== undefined) current.title = updates.title.trim();
  if (updates.category !== undefined) current.category = updates.category.trim().toLowerCase();
  if (updates.enabled !== undefined) current.enabled = Boolean(updates.enabled);

  list[index] = current;
  await saveMessages(kv, list);
  return { success: true, message: current };
}

/**
 * Deletes a message template by ID.
 * @param {object} kv 
 * @param {number} id 
 * @returns {Promise<{success: boolean, deleted?: object, error?: string}>}
 */
export async function deleteMessageTemplate(kv, id) {
  const numId = Number(id);
  const list = await getMessages(kv);
  const index = list.findIndex(m => m.id === numId);

  if (index === -1) {
    return { success: false, error: `Message with ID ${id} not found` };
  }

  if (list.length <= 1) {
    return { success: false, error: 'Cannot delete the only remaining message template' };
  }

  const [deleted] = list.splice(index, 1);
  await saveMessages(kv, list);
  return { success: true, deleted };
}

/**
 * Toggles a message template's enabled state.
 * @param {object} kv 
 * @param {number} id 
 * @param {boolean} [forcedState] 
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
export async function toggleMessage(kv, id, forcedState) {
  const numId = Number(id);
  const list = await getMessages(kv);
  const msg = list.find(m => m.id === numId);

  if (!msg) {
    return { success: false, error: `Message with ID ${id} not found` };
  }

  msg.enabled = forcedState !== undefined ? Boolean(forcedState) : !msg.enabled;
  await saveMessages(kv, list);
  return { success: true, message: msg };
}

/**
 * Reorders message templates based on an array of IDs.
 * @param {object} kv 
 * @param {Array<number>} idOrder 
 * @returns {Promise<{success: boolean, messages?: Array<object>, error?: string}>}
 */
export async function reorderMessages(kv, idOrder) {
  if (!Array.isArray(idOrder) || idOrder.length === 0) {
    return { success: false, error: 'Order array must be a non-empty list of IDs' };
  }

  const list = await getMessages(kv);
  const map = new Map(list.map(m => [m.id, m]));

  const reordered = [];
  for (const id of idOrder) {
    const num = Number(id);
    if (map.has(num)) {
      const item = map.get(num);
      item.order = reordered.length + 1;
      reordered.push(item);
      map.delete(num);
    }
  }

  // Append any remaining messages not in the order list
  for (const remaining of map.values()) {
    remaining.order = reordered.length + 1;
    reordered.push(remaining);
  }

  await saveMessages(kv, reordered);
  return { success: true, messages: reordered };
}

/**
 * Resets all message templates to the 20 default English templates.
 * @param {object} kv 
 * @returns {Promise<Array<object>>}
 */
export async function resetDefaultMessages(kv) {
  const defaults = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
  await saveMessages(kv, defaults);
  return defaults;
}

/**
 * Replaces placeholders in message template with dynamic context values.
 * Placeholders: {name}, {username}, {timer_mins}, {bot_name}, {owner_name}
 * @param {string} text 
 * @param {object} context 
 * @returns {string}
 */
export function renderTemplate(text, context = {}) {
  if (!text || typeof text !== 'string') return '';
  const name = context.name || context.first_name || 'Friend';
  const username = context.username ? context.username.replace(/^@/, '') : name;
  const timerMins = context.timer_mins ?? context.inactivity_timer_minutes ?? '4';
  const botName = context.bot_name || 'SHIV YOGI AUTO WELCOME';
  const ownerName = context.owner_name || 'Shiv Yogi';

  return text
    .replaceAll('{name}', name)
    .replaceAll('{username}', username)
    .replaceAll('{timer_mins}', String(timerMins))
    .replaceAll('{bot_name}', botName)
    .replaceAll('{owner_name}', ownerName);
}

/**
 * Selects a message template using no-repeat or random logic and renders it.
 * @param {object} kv 
 * @param {object} settings 
 * @param {object} context 
 * @returns {Promise<{template: object, renderedText: string}>}
 */
export async function selectRandomMessage(kv, settings = {}, context = {}) {
  const allMessages = await getMessages(kv);
  let enabled = allMessages.filter(m => m.enabled !== false);

  if (enabled.length === 0) {
    // If all are disabled, fallback to all messages to prevent total failure
    enabled = allMessages;
  }

  // Filter by active categories if specified
  const activeCats = settings.active_categories;
  if (Array.isArray(activeCats) && activeCats.length > 0) {
    const categoryFiltered = enabled.filter(m => activeCats.includes((m.category || 'general').toLowerCase()));
    if (categoryFiltered.length > 0) {
      enabled = categoryFiltered;
    }
  }

  const mode = settings.random_selection_mode || 'no_repeat';
  let chosen = null;

  if (mode === 'no_repeat' && kv && typeof kv.get === 'function') {
    const depth = settings.no_repeat_depth || 5;
    let recentIds = [];
    try {
      recentIds = (await kv.get(RECENT_IDS_KV_KEY, 'json')) || [];
      if (!Array.isArray(recentIds)) recentIds = [];
    } catch {
      recentIds = [];
    }

    // Filter out recently used templates
    let candidates = enabled.filter(m => !recentIds.includes(m.id));
    if (candidates.length === 0) {
      // All have been used within recent history, reset recent pool
      candidates = enabled;
      recentIds = [];
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    chosen = candidates[randomIndex];

    // Update recent history
    recentIds.push(chosen.id);
    if (recentIds.length > depth) {
      recentIds = recentIds.slice(-depth);
    }
    await kv.put(RECENT_IDS_KV_KEY, JSON.stringify(recentIds), { expirationTtl: 86400 * 7 });
  } else {
    // Pure random
    const randomIndex = Math.floor(Math.random() * enabled.length);
    chosen = enabled[randomIndex];
  }

  // Merge settings timer into context
  const fullContext = {
    timer_mins: settings.inactivity_timer_minutes || 4,
    owner_name: settings.owner_name || 'Shiv Yogi',
    ...context
  };

  const renderedText = renderTemplate(chosen.text, fullContext);

  // Track template usage asynchronously
  await recordTemplateUsage(kv, chosen.id).catch(() => {});

  return { template: chosen, renderedText };
}

/**
 * Increments template usage counter in KV.
 * @param {object} kv 
 * @param {number} templateId 
 */
export async function recordTemplateUsage(kv, templateId) {
  if (!kv || typeof kv.get !== 'function') return;
  try {
    const stats = (await kv.get(STATS_KV_KEY, 'json')) || {};
    stats[templateId] = (stats[templateId] || 0) + 1;
    await kv.put(STATS_KV_KEY, JSON.stringify(stats));
  } catch (err) {
    // Non-critical, ignore
  }
}

/**
 * Gets template usage statistics from KV.
 * @param {object} kv 
 * @returns {Promise<Record<string, number>>}
 */
export async function getTemplateStats(kv) {
  if (!kv || typeof kv.get !== 'function') return {};
  try {
    return (await kv.get(STATS_KV_KEY, 'json')) || {};
  } catch {
    return {};
  }
}

/**
 * Exports all messages as a formatted JSON string.
 * @param {object} kv 
 * @returns {Promise<string>}
 */
export async function exportMessagesJson(kv) {
  const messages = await getMessages(kv);
  return JSON.stringify(messages, null, 2);
}

/**
 * Validates and imports messages from a JSON string.
 * @param {object} kv 
 * @param {string|Array<object>} input 
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function importMessagesJson(kv, input) {
  try {
    const list = typeof input === 'string' ? JSON.parse(input) : input;
    if (!Array.isArray(list) || list.length === 0) {
      return { success: false, error: 'Payload must be a non-empty array of message objects' };
    }

    const validated = [];
    let idCounter = 1;

    for (const item of list) {
      if (!item || typeof item.text !== 'string' || !item.text.trim()) {
        return { success: false, error: `Invalid item at index ${validated.length}: text is required` };
      }
      validated.push({
        id: Number(item.id) || idCounter,
        title: item.title?.trim() || `Template #${idCounter}`,
        category: (item.category?.trim().toLowerCase()) || 'general',
        enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
        order: Number(item.order) || idCounter,
        text: item.text.trim()
      });
      idCounter++;
    }

    await saveMessages(kv, validated);
    return { success: true, count: validated.length };
  } catch (err) {
    return { success: false, error: `Invalid JSON format: ${err.message}` };
  }
}


// ============================================================================

// 6. SCHEDULER, ANTI-SPAM, COOLDOWN & DISPATCH ENGINE

// ============================================================================


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

  // 11b. Record in KV history ring-buffer & update total dispatches
  if (kv && typeof kv.put === 'function') {
    try {
      const histKey = 'history:dispatched_messages';
      const list = (await kv.get(histKey, 'json')) || [];
      list.unshift({
        recipient_id: String(recipientId),
        recipient_name: recipientName || '',
        recipient_username: recipientUsername || '',
        template_id: template.id,
        template_title: template.title,
        category: template.category,
        message_text: renderedText,
        telegram_message_id: telegramMsgId || null,
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      });
      await kv.put(histKey, JSON.stringify(list.slice(0, 100)), { expirationTtl: 86400 * 30 });

      const totalRaw = await kv.get('stats:total_dispatches', 'text');
      const nextTotal = (Number(totalRaw) || 0) + 1;
      await kv.put('stats:total_dispatches', String(nextTotal));
    } catch {}
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
          await deleteTelegramMessage(this.env.BOT_TOKEN, delItem.chatId, delItem.messageId);
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


// ============================================================================

// 7. OWNER ADMINISTRATIVE COMMAND PROCESSOR (19 Commands)

// ============================================================================


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
  const isOwnerConfigured = Boolean(
    ownerId &&
    String(ownerId).trim() !== '' &&
    String(ownerId).trim() !== 'YOUR_TELEGRAM_USER_ID' &&
    String(ownerId).trim() !== '0' &&
    String(ownerId).trim() !== 'undefined'
  );

  // If a regular user sends /start, register them and send welcome notice
  if (text.startsWith('/start')) {
    await markRecipientBotStarted(env.WELCOME_KV, env.DB, fromUser);

    if (!isSenderOwner) {
      const userGreeting = `╔═══════════════════════════════╗\n  ✦ SHIV YOGI AUTO ASSISTANT ✦  \n╚═══════════════════════════════╝\n\nHello ${fromUser.first_name || 'Friend'}! 🙏\n\nThis is the official automated assistant bot for Shiv Yogi.\n\n✅ Your conversation is now linked.\nWhen you message Shiv Yogi's direct account, this bot can automatically acknowledge your message if Shiv Yogi is away.\n\nThank you for connecting!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✧ Created By Shiv Yogi ✧`;
      await sendMessage(env.BOT_TOKEN, chatId, userGreeting);
      return;
    }
  }

  // If OWNER_TELEGRAM_ID is missing or not configured
  if (!isOwnerConfigured) {
    const configErrorMsg = `⚠️ <b>Configuration Error: OWNER_TELEGRAM_ID is not configured.</b>\n\nPlease set <code>OWNER_TELEGRAM_ID</code> in Cloudflare Worker Secrets (or Settings → Variables & Secrets) before administrative commands can be executed.`;
    await sendMessage(env.BOT_TOKEN, chatId, configErrorMsg, { parse_mode: 'HTML' });
    return;
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

  const res = await deleteMessageTemplate(env.WELCOME_KV, id);
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

  // 2. Try KV dispatched messages ring-buffer
  if (env.WELCOME_KV) {
    const dispatched = await env.WELCOME_KV.get('history:dispatched_messages', 'json');
    if (Array.isArray(dispatched) && dispatched.length > 0) {
      let text = `📜 <b>Recent Dispatches (${dispatched.slice(0, limit).length})</b>\n\n`;
      for (const r of dispatched.slice(0, limit)) {
        const icon = r.delivery_status === 'sent' ? '✅' : '❌';
        text += `${icon} <b>To:</b> ${r.recipient_name || r.recipient_username || 'User'}\n   <b>Template:</b> ${r.template_title}\n   <b>Time:</b> ${r.sent_at}\n\n`;
      }
      await sendMessage(env.BOT_TOKEN, chatId, text, { parse_mode: 'HTML' });
      return;
    }

    // 3. Fallback to KV activity log
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
  } else if (env.WELCOME_KV) {
    // KV-only stats calculation
    try {
      const dispatched = (await env.WELCOME_KV.get('history:dispatched_messages', 'json')) || [];
      const totalRaw = await env.WELCOME_KV.get('stats:total_dispatches', 'text');
      totalDispatches = Number(totalRaw) || dispatched.length;
      const uniqueUsers = new Set(dispatched.map(d => d.recipient_id));
      totalRecipients = uniqueUsers.size;
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


// ============================================================================

// 8. TELEGRAM WEBHOOK INGESTION & DEDUPLICATION

// ============================================================================


/**
 * Handles incoming POST /webhook from Telegram Bot API.
 * @param {Request} request 
 * @param {object} env 
 * @param {object} ctx 
 * @returns {Promise<Response>}
 */
export async function handleWebhookRequest(request, env, ctx) {
  // 1. Verify Webhook Secret Token
  const expectedSecret = env.WEBHOOK_SECRET;
  // Fail closed: never accept webhook traffic if the secret is missing or invalid.
  if (!expectedSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Webhook is not configured: WEBHOOK_SECRET is missing' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!validateWebhookSecret(request, expectedSecret)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized webhook secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // KV is required for update deduplication and webhook rate limiting.
  if (!env.WELCOME_KV || typeof env.WELCOME_KV.get !== 'function' || typeof env.WELCOME_KV.put !== 'function') {
    return new Response(JSON.stringify({ ok: false, error: 'Server configuration error: WELCOME_KV binding is missing' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Rate limit incoming webhook requests (120 req / min)
  const ip = request.headers.get('cf-connecting-ip') || 'telegram-api';
  const rateLimit = await checkRateLimit(env.WELCOME_KV, `webhook:${ip}`, 120, 60);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Parse JSON payload
  let update;
  try {
    update = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. Validate Telegram update schema
  const verification = verifyTelegramUpdate(update);
  if (!verification.valid) {
    return new Response(JSON.stringify({ ok: false, error: verification.reason }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 5. Prevent duplicate update processing (deduplication)
  const isFresh = await checkDuplicateUpdate(env.WELCOME_KV, update.update_id, 300);
  if (!isFresh) {
    // Acknowledge Telegram without re-processing
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 6. Handle Telegram message
  const message = update.message || update.edited_message;
  if (message && message.text) {
    // Process command/message asynchronously if waitUntil is supported, or await directly
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(handleCommand(env, message).catch(err => {
        logActivity(env, 'command_error', message.from?.id, { error: err.message }, 'error');
      }));
    } else {
      await handleCommand(env, message).catch(err => {
        logActivity(env, 'command_error', message.from?.id, { error: err.message }, 'error');
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}


// ============================================================================

// 9. MAIN ROUTER & COMPANION ENDPOINTS

// ============================================================================


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health Check Endpoint
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        project: 'SHIV YOGI AUTO WELCOME BOT',
        creator: 'Shiv Yogi',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Telegram Bot Webhook Endpoint
    if (path === '/webhook' && request.method === 'POST') {
      return handleWebhookRequest(request, env, ctx);
    }

    // 3. Companion: Incoming Message Event
    if (path === '/api/companion/message-received' && request.method === 'POST') {
      return handleCompanionMessageReceived(request, env);
    }

    // 4. Companion: Owner Replied Event (Timer Cancellation)
    if (path === '/api/companion/owner-replied' && request.method === 'POST') {
      return handleCompanionOwnerReplied(request, env);
    }

    // 5. Companion: Direct Welcome Message Dispatch
    if (path === '/api/companion/dispatch-welcome' && request.method === 'POST') {
      return handleCompanionDispatchWelcome(request, env);
    }

    // 6. Authenticated Status Telemetry
    if (path === '/api/status' && request.method === 'GET') {
      return handleAuthenticatedStatus(request, env);
    }

    return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function isCompanionAuthorized(request, env) {
  if (!env.COMPANION_SECRET) {
    return false;
  }
  return validateCompanionSecret(request, env.COMPANION_SECRET);
}

/**
 * Handles incoming message notification from the MTProto Companion.
 * Schedules an inactivity timer using Durable Objects if configured.
 */
async function handleCompanionMessageReceived(request, env) {
  if (!isCompanionAuthorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized companion secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const { user_id, first_name, username } = body;
  if (!user_id) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing user_id' }), { status: 400 });
  }

  const settings = await getSettings(env.WELCOME_KV);
  const timerMins = settings.inactivity_timer_minutes || 4;

  // Record incoming ping in D1/KV
  await logActivity(env, 'incoming_message', user_id, {
    first_name,
    username,
    timer_minutes: timerMins
  }, 'info');

  // Schedule in Durable Object if available
  let doScheduled = false;
  if (env.TIMER_DO) {
    try {
      const doId = env.TIMER_DO.idFromName('global_timer_hub');
      const stub = env.TIMER_DO.get(doId);
      const doRes = await stub.fetch('http://durable-object/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: user_id,
          recipientId: user_id,
          recipientName: first_name || '',
          recipientUsername: username || '',
          durationMinutes: timerMins
        })
      });
      const data = await doRes.json();
      doScheduled = Boolean(data.ok);
    } catch (err) {
      // Non-fatal, companion scheduler acts as secondary safety
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    scheduled: doScheduled,
    timer_minutes: timerMins,
    message: 'Message registered. Inactivity timer active.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handles owner reply notification from MTProto Companion.
 * Cancels any pending inactivity timer for that conversation immediately.
 */
async function handleCompanionOwnerReplied(request, env) {
  if (!isCompanionAuthorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized companion secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const { user_id } = body;
  if (!user_id) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing user_id' }), { status: 400 });
  }

  let cancelled = false;
  if (env.TIMER_DO) {
    try {
      const doId = env.TIMER_DO.idFromName('global_timer_hub');
      const stub = env.TIMER_DO.get(doId);
      const doRes = await stub.fetch('http://durable-object/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: user_id })
      });
      const data = await doRes.json();
      cancelled = Boolean(data.cancelled);
    } catch {}
  }

  await logActivity(env, 'owner_reply', user_id, { timer_cancelled: cancelled }, 'info');

  return new Response(JSON.stringify({ ok: true, cancelled }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handles direct welcome message dispatch requested by Companion (e.g. companion scheduler expiry).
 */
async function handleCompanionDispatchWelcome(request, env) {
  if (!isCompanionAuthorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized companion secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const { user_id, first_name, username } = body;
  if (!user_id) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing user_id' }), { status: 400 });
  }

  const result = await executeAutoWelcomeDispatch(env, {
    recipientId: user_id,
    recipientName: first_name,
    recipientUsername: username,
    triggerSource: 'companion_scheduler'
  });

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Authenticated status summary for the companion or external uptime checker.
 */
async function handleAuthenticatedStatus(request, env) {
  if (!isCompanionAuthorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized companion secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const settings = await getSettings(env.WELCOME_KV);
  return new Response(JSON.stringify({
    ok: true,
    auto_welcome_enabled: settings.auto_welcome_enabled,
    inactivity_timer_minutes: settings.inactivity_timer_minutes,
    emergency_paused: settings.emergency_paused,
    version: settings.version || '1.0.0'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

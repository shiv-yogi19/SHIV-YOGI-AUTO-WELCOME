/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Security & Validation Module
 */

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
  return String(userId).trim() === String(ownerId).trim();
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

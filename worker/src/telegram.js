/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Telegram Bot API Client Module
 */

import { maskSecret } from './security.js';

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
export async function deleteMessage(token, chatId, messageId) {
  return callTelegramApi(token, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

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

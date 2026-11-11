/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Telegram Webhook Handler Module
 */

import {
  validateWebhookSecret,
  verifyTelegramUpdate,
  checkDuplicateUpdate,
  checkRateLimit
} from './security.js';
import { handleCommand } from './commands.js';
import { logActivity } from './scheduler.js';

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
  if (expectedSecret && !validateWebhookSecret(request, expectedSecret)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized webhook secret' }), {
      status: 401,
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

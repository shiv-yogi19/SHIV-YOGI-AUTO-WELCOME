/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Cloudflare Worker Main Entrypoint & Router
 */

import { validateCompanionSecret } from './security.js';
import { handleWebhookRequest } from './webhook.js';
import { getSettings } from './settings.js';
import { executeAutoWelcomeDispatch, logActivity } from './scheduler.js';
export { TimerDurableObject } from './scheduler.js';

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

/**
 * Handles incoming message notification from the MTProto Companion.
 * Schedules an inactivity timer using Durable Objects if configured.
 */
async function handleCompanionMessageReceived(request, env) {
  if (env.COMPANION_SECRET && !validateCompanionSecret(request, env.COMPANION_SECRET)) {
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
  if (env.COMPANION_SECRET && !validateCompanionSecret(request, env.COMPANION_SECRET)) {
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
  if (env.COMPANION_SECRET && !validateCompanionSecret(request, env.COMPANION_SECRET)) {
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
  if (env.COMPANION_SECRET && !validateCompanionSecret(request, env.COMPANION_SECRET)) {
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

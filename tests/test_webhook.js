/**
 * SHIV YOGI AUTO WELCOME BOT
 * Webhook & Worker Endpoint Integration Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import workerEntry from '../worker/src/index.js';

function createMockKv() {
  const store = new Map();
  return {
    async get(key, type) {
      const val = store.get(key);
      if (!val) return null;
      if (type === 'json') return JSON.parse(val);
      return val;
    },
    async put(key, val) {
      store.set(key, typeof val === 'string' ? val : JSON.stringify(val));
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store
  };
}

function createMockEnv() {
  return {
    WELCOME_KV: createMockKv(),
    BOT_TOKEN: '123456:mock_token_abcdef',
    WEBHOOK_SECRET: 'test_webhook_secret_123',
    COMPANION_SECRET: 'test_companion_secret_456',
    OWNER_TELEGRAM_ID: '999888777'
  };
}

test('Worker: GET /health returns 200 OK', async () => {
  const env = createMockEnv();
  const req = new Request('https://worker.dev/health');
  const res = await workerEntry.fetch(req, env, {});

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
  assert.equal(data.creator, 'Shiv Yogi');
});

test('Webhook: Secret validation (401 on missing or invalid)', async () => {
  const env = createMockEnv();

  // Missing secret header
  const req1 = new Request('https://worker.dev/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update_id: 1 })
  });
  const res1 = await workerEntry.fetch(req1, env, {});
  assert.equal(res1.status, 401);

  // Invalid secret header
  const req2 = new Request('https://worker.dev/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': 'wrong_secret'
    },
    body: JSON.stringify({ update_id: 1 })
  });
  const res2 = await workerEntry.fetch(req2, env, {});
  assert.equal(res2.status, 401);
});

test('Webhook: Invalid JSON payload returns 400', async () => {
  const env = createMockEnv();
  const req = new Request('https://worker.dev/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
    },
    body: 'this is not valid json'
  });
  const res = await workerEntry.fetch(req, env, {});
  assert.equal(res.status, 400);
});

test('Webhook: Invalid update schema returns 400', async () => {
  const env = createMockEnv();
  const req = new Request('https://worker.dev/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
    },
    body: JSON.stringify({ random_field: 'hello' }) // Missing update_id
  });
  const res = await workerEntry.fetch(req, env, {});
  assert.equal(res.status, 400);
});

test('Webhook: Valid update succeeds and prevents duplicates', async () => {
  const env = createMockEnv();
  const update = {
    update_id: 5001,
    message: {
      message_id: 10,
      chat: { id: 12345 },
      from: { id: 12345, first_name: 'RegularUser' },
      text: '/start'
    }
  };

  // Mock outbound Telegram sendMessage fetch call
  const originalFetch = globalThis.fetch;
  let sentMessages = [];
  globalThis.fetch = async (url, opts) => {
    if (url.includes('/bot')) {
      const body = JSON.parse(opts.body);
      sentMessages.push(body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    // 1. Initial valid update
    const req1 = new Request('https://worker.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
      },
      body: JSON.stringify(update)
    });

    const res1 = await workerEntry.fetch(req1, env, {});
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.ok, true);

    // Verify user received greeting and was marked started
    assert.ok(sentMessages.length > 0);
    assert.ok(sentMessages[0].text.includes('SHIV YOGI AUTO ASSISTANT'));

    // 2. Duplicate update with same update_id
    const req2 = new Request('https://worker.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
      },
      body: JSON.stringify(update)
    });

    const res2 = await workerEntry.fetch(req2, env, {});
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.duplicate, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Webhook: Owner access control & command handling', async () => {
  const env = createMockEnv();
  const ownerId = Number(env.OWNER_TELEGRAM_ID);

  const sentMessages = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url.includes('/bot')) {
      const body = JSON.parse(opts.body);
      sentMessages.push(body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 111 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    // Non-owner trying to run /status
    const nonOwnerReq = new Request('https://worker.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
      },
      body: JSON.stringify({
        update_id: 6001,
        message: {
          message_id: 20,
          chat: { id: 111222 },
          from: { id: 111222, first_name: 'Hacker' },
          text: '/status'
        }
      })
    });
    await workerEntry.fetch(nonOwnerReq, env, {});
    const deniedMsg = sentMessages.find(m => m.chat_id === 111222);
    assert.ok(deniedMsg);
    assert.ok(deniedMsg.text.includes('Access Denied'));

    // Owner running /status
    const ownerReq = new Request('https://worker.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
      },
      body: JSON.stringify({
        update_id: 6002,
        message: {
          message_id: 21,
          chat: { id: ownerId },
          from: { id: ownerId, first_name: 'Shiv' },
          text: '/status'
        }
      })
    });
    await workerEntry.fetch(ownerReq, env, {});
    const statusMsg = sentMessages.find(m => m.chat_id === ownerId && m.text.includes('SYSTEM TELEMETRY'));
    assert.ok(statusMsg, 'Owner should receive system telemetry');

    // Owner setting timer via /timer 7
    const timerReq = new Request('https://worker.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET
      },
      body: JSON.stringify({
        update_id: 6003,
        message: {
          message_id: 22,
          chat: { id: ownerId },
          from: { id: ownerId, first_name: 'Shiv' },
          text: '/timer 7'
        }
      })
    });
    await workerEntry.fetch(timerReq, env, {});
    const timerMsg = sentMessages.find(m => m.chat_id === ownerId && m.text.includes('7 minutes'));
    assert.ok(timerMsg, 'Owner should receive timer confirmation');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Companion API: Endpoints authentication & routing', async () => {
  const env = createMockEnv();

  // 1. Unauthorized without secret
  const unauthReq = new Request('https://worker.dev/api/companion/message-received', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 12345 })
  });
  const unauthRes = await workerEntry.fetch(unauthReq, env, {});
  assert.equal(unauthRes.status, 401);

  // 2. Authorized message-received
  const authReq = new Request('https://worker.dev/api/companion/message-received', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Companion-Secret': env.COMPANION_SECRET
    },
    body: JSON.stringify({
      user_id: 12345,
      first_name: 'Tanya',
      username: 'tanya_dev'
    })
  });
  const authRes = await workerEntry.fetch(authReq, env, {});
  assert.equal(authRes.status, 200);
  const data = await authRes.json();
  assert.equal(data.ok, true);

  // 3. Authorized owner-replied
  const replyReq = new Request('https://worker.dev/api/companion/owner-replied', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Companion-Secret': env.COMPANION_SECRET
    },
    body: JSON.stringify({ user_id: 12345 })
  });
  const replyRes = await workerEntry.fetch(replyReq, env, {});
  assert.equal(replyRes.status, 200);
  const replyData = await replyRes.json();
  assert.equal(replyData.ok, true);
});

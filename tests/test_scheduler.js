/**
 * SHIV YOGI AUTO WELCOME BOT
 * Scheduler, Cooldown & Anti-Spam Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCooldown,
  setCooldown,
  checkDailyLimit,
  incrementDailyCount,
  hasRecipientStartedBot,
  markRecipientBotStarted,
  executeAutoWelcomeDispatch,
  TimerDurableObject
} from '../worker/src/scheduler.js';
import { isQuietHours, isUserIgnored, updateSettings, getSettings } from '../worker/src/settings.js';

function createMockKv(initial = {}) {
  const store = new Map(Object.entries(initial));
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

test('Scheduler: Per-user cooldown logic', async () => {
  const kv = createMockKv();
  const userId = '11223344';

  const before = await checkCooldown(kv, userId);
  assert.equal(before.onCooldown, false);

  await setCooldown(kv, userId, 30); // 30 minutes

  const after = await checkCooldown(kv, userId);
  assert.equal(after.onCooldown, true);
  assert.ok(after.remainingSeconds > 0 && after.remainingSeconds <= 1800);
});

test('Scheduler: Global daily message limit', async () => {
  const kv = createMockKv();
  const limitCheck1 = await checkDailyLimit(kv, 2);
  assert.equal(limitCheck1.allowed, true);

  await incrementDailyCount(kv);
  await incrementDailyCount(kv);

  const limitCheck2 = await checkDailyLimit(kv, 2);
  assert.equal(limitCheck2.allowed, false);
  assert.equal(limitCheck2.currentCount, 2);
});

test('Scheduler: Bot started restriction check', async () => {
  const kv = createMockKv();
  const user = { id: 778899, first_name: 'Aarav', username: 'aarav_dev' };

  const startedBefore = await hasRecipientStartedBot(kv, null, user.id);
  assert.equal(startedBefore, false);

  await markRecipientBotStarted(kv, null, user);

  const startedAfter = await hasRecipientStartedBot(kv, null, user.id);
  assert.equal(startedAfter, true);
});

test('Settings: Quiet hours time window checks', () => {
  const overnightSettings = {
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00'
  };

  // 23:30 UTC -> inside quiet hours
  const date2330 = new Date('2026-11-11T23:30:00Z');
  assert.equal(isQuietHours(overnightSettings, date2330), true);

  // 04:15 UTC -> inside quiet hours
  const date0415 = new Date('2026-11-11T04:15:00Z');
  assert.equal(isQuietHours(overnightSettings, date0415), true);

  // 14:00 UTC -> outside quiet hours
  const date1400 = new Date('2026-11-11T14:00:00Z');
  assert.equal(isQuietHours(overnightSettings, date1400), false);

  // When disabled
  const disabledSettings = { ...overnightSettings, quiet_hours_enabled: false };
  assert.equal(isQuietHours(disabledSettings, date2330), false);
});

test('Settings: Ignored users list check', () => {
  const settings = { ignored_user_ids: ['1001', '1002', '9999'] };
  assert.equal(isUserIgnored(settings, 1001), true);
  assert.equal(isUserIgnored(settings, '9999'), true);
  assert.equal(isUserIgnored(settings, 5555), false);
});

test('Settings: updateSettings parameter validation', async () => {
  const kv = createMockKv();

  // Valid timer update
  const res1 = await updateSettings(kv, { inactivity_timer_minutes: 10 });
  assert.equal(res1.success, true);
  assert.equal(res1.settings.inactivity_timer_minutes, 10);

  // Invalid timer < 1
  const res2 = await updateSettings(kv, { inactivity_timer_minutes: 0 });
  assert.equal(res2.success, false);

  // Invalid timer > 60
  const res3 = await updateSettings(kv, { inactivity_timer_minutes: 90 });
  assert.equal(res3.success, false);
});

test('Scheduler: executeAutoWelcomeDispatch workflow & restrictions', async () => {
  const kv = createMockKv();
  const env = {
    WELCOME_KV: kv,
    BOT_TOKEN: 'fake_bot_token_123',
    OWNER_TELEGRAM_ID: '987654321'
  };

  // 1. Blocked when user has not started bot
  const resNotStarted = await executeAutoWelcomeDispatch(env, {
    recipientId: 54321,
    recipientName: 'Unregistered'
  });
  assert.equal(resNotStarted.success, false);
  assert.ok(resNotStarted.reason.includes('has not initiated'));

  // Mark user as started bot
  await markRecipientBotStarted(kv, null, { id: 54321, first_name: 'Priya' });

  // 2. Blocked when emergency paused
  await updateSettings(kv, { emergency_paused: true });
  const resPaused = await executeAutoWelcomeDispatch(env, {
    recipientId: 54321,
    recipientName: 'Priya'
  });
  assert.equal(resPaused.success, false);
  assert.ok(resPaused.reason.includes('emergency paused'));

  // Unpause
  await updateSettings(kv, { emergency_paused: false });

  // 3. Blocked when user is in ignored list
  await updateSettings(kv, { ignored_user_ids: ['54321'] });
  const resIgnored = await executeAutoWelcomeDispatch(env, {
    recipientId: 54321,
    recipientName: 'Priya'
  });
  assert.equal(resIgnored.success, false);
  assert.ok(resIgnored.reason.includes('ignored'));

  // Clear ignore
  await updateSettings(kv, { ignored_user_ids: [] });

  // 4. Successful dispatch execution with mocked global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({ ok: true, result: { message_id: 8888 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const resSuccess = await executeAutoWelcomeDispatch(env, {
      recipientId: 54321,
      recipientName: 'Priya',
      recipientUsername: 'priya_code'
    });
    assert.equal(resSuccess.success, true);
    assert.equal(resSuccess.messageId, 8888);
    assert.ok(resSuccess.templateTitle);

    // Verify user is now on cooldown
    const cooldownCheck = await checkCooldown(kv, 54321);
    assert.equal(cooldownCheck.onCooldown, true);

    // 5. Subsequent call is blocked by cooldown!
    const resCooldown = await executeAutoWelcomeDispatch(env, {
      recipientId: 54321,
      recipientName: 'Priya'
    });
    assert.equal(resCooldown.success, false);
    assert.ok(resCooldown.reason.includes('cooldown'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scheduler: Durable Object TimerDurableObject scheduling and cancellation', async () => {
  const doStorage = new Map();
  let scheduledAlarm = null;

  const mockCtx = {
    storage: {
      async get(k) { return doStorage.get(k); },
      async put(k, v) { doStorage.set(k, v); },
      async delete(k) { doStorage.delete(k); },
      async list({ prefix }) {
        const result = new Map();
        for (const [k, v] of doStorage.entries()) {
          if (k.startsWith(prefix)) result.set(k, v);
        }
        return result;
      },
      async getAlarm() { return scheduledAlarm; },
      async setAlarm(ts) { scheduledAlarm = ts; }
    }
  };

  const doInstance = new TimerDurableObject(mockCtx, { WELCOME_KV: createMockKv() });

  // 1. Schedule timer
  const schedReq = new Request('http://durable-object/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: 'user_456',
      recipientId: 'user_456',
      recipientName: 'Rohan',
      durationMinutes: 4
    })
  });

  const schedRes = await doInstance.fetch(schedReq);
  const schedData = await schedRes.json();
  assert.equal(schedData.ok, true);
  assert.ok(schedData.wakeAt > Date.now());
  assert.ok(scheduledAlarm !== null);

  // Check stored timer
  const storedTimer = await mockCtx.storage.get('timer:user_456');
  assert.equal(storedTimer.recipientName, 'Rohan');

  // 2. Cancel timer (owner replied)
  const cancelReq = new Request('http://durable-object/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: 'user_456' })
  });

  const cancelRes = await doInstance.fetch(cancelReq);
  const cancelData = await cancelRes.json();
  assert.equal(cancelData.ok, true);
  assert.equal(cancelData.cancelled, true);

  // Check deleted
  const deletedTimer = await mockCtx.storage.get('timer:user_456');
  assert.equal(deletedTimer, undefined);
});

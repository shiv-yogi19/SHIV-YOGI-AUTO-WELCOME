/**
 * SHIV YOGI AUTO WELCOME BOT
 * Security & Validation Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timingSafeEqualStr,
  validateWebhookSecret,
  validateCompanionSecret,
  isOwner,
  sanitizeInput,
  maskSecret,
  verifyTelegramUpdate,
  checkDuplicateUpdate,
  checkRateLimit
} from '../worker/src/security.js';

test('Security: timingSafeEqualStr', () => {
  assert.equal(timingSafeEqualStr('hello_secret_123', 'hello_secret_123'), true);
  assert.equal(timingSafeEqualStr('hello_secret_123', 'wrong_secret_456'), false);
  assert.equal(timingSafeEqualStr('short', 'longer_string'), false);
  assert.equal(timingSafeEqualStr(null, 'test'), false);
  assert.equal(timingSafeEqualStr(12345, '12345'), false);
});

test('Security: validateWebhookSecret', () => {
  const validReq = new Request('https://worker.dev/webhook', {
    headers: { 'x-telegram-bot-api-secret-token': 'super_secure_webhook_token_999' }
  });
  assert.equal(validateWebhookSecret(validReq, 'super_secure_webhook_token_999'), true);

  const invalidReq = new Request('https://worker.dev/webhook', {
    headers: { 'x-telegram-bot-api-secret-token': 'wrong_token' }
  });
  assert.equal(validateWebhookSecret(invalidReq, 'super_secure_webhook_token_999'), false);

  const missingReq = new Request('https://worker.dev/webhook');
  assert.equal(validateWebhookSecret(missingReq, 'super_secure_webhook_token_999'), false);
  assert.equal(validateWebhookSecret(validReq, ''), false);
});

test('Security: validateCompanionSecret', () => {
  // Via direct header
  const headerReq = new Request('https://worker.dev/api', {
    headers: { 'x-companion-secret': 'companion_pass_token_xyz' }
  });
  assert.equal(validateCompanionSecret(headerReq, 'companion_pass_token_xyz'), true);

  // Via Bearer header
  const bearerReq = new Request('https://worker.dev/api', {
    headers: { 'authorization': 'Bearer companion_pass_token_xyz' }
  });
  assert.equal(validateCompanionSecret(bearerReq, 'companion_pass_token_xyz'), true);

  // Invalid secret
  const badReq = new Request('https://worker.dev/api', {
    headers: { 'x-companion-secret': 'wrong_secret' }
  });
  assert.equal(validateCompanionSecret(badReq, 'companion_pass_token_xyz'), false);

  // Missing header
  const emptyReq = new Request('https://worker.dev/api');
  assert.equal(validateCompanionSecret(emptyReq, 'companion_pass_token_xyz'), false);
});

test('Security: isOwner', () => {
  assert.equal(isOwner(123456789, '123456789'), true);
  assert.equal(isOwner('123456789', 123456789), true);
  assert.equal(isOwner(999999999, '123456789'), false);
  assert.equal(isOwner(null, '123456789'), false);
  assert.equal(isOwner(123456789, null), false);
});

test('Security: sanitizeInput', () => {
  assert.equal(sanitizeInput('  clean text  '), 'clean text');
  assert.equal(sanitizeInput('evil\0null\0bytes'), 'evilnullbytes');
  assert.equal(sanitizeInput('a'.repeat(3000), 10).length, 10);
  assert.equal(sanitizeInput(null), '');
});

test('Security: maskSecret', () => {
  assert.equal(maskSecret(''), '[EMPTY]');
  assert.equal(maskSecret(null), '[EMPTY]');
  assert.equal(maskSecret('123456'), '****');
  assert.equal(maskSecret('1234567890abcdef'), '1234...cdef');
});

test('Security: verifyTelegramUpdate', () => {
  const validUpdate = {
    update_id: 1001,
    message: { message_id: 1, text: '/start', from: { id: 12345 } }
  };
  assert.deepEqual(verifyTelegramUpdate(validUpdate), { valid: true });

  assert.equal(verifyTelegramUpdate(null).valid, false);
  assert.equal(verifyTelegramUpdate([]).valid, false);
  assert.equal(verifyTelegramUpdate({ missing_id: true }).valid, false);
  assert.equal(verifyTelegramUpdate({ update_id: 'not_a_number' }).valid, false);
  assert.equal(verifyTelegramUpdate({ update_id: 1002 }).valid, false); // no message entity
});

test('Security: checkDuplicateUpdate', async () => {
  const store = new Map();
  const mockKv = {
    async get(k) { return store.get(k) || null; },
    async put(k, v) { store.set(k, v); }
  };

  const isFresh1 = await checkDuplicateUpdate(mockKv, 555);
  assert.equal(isFresh1, true);

  const isFresh2 = await checkDuplicateUpdate(mockKv, 555);
  assert.equal(isFresh2, false);

  const isFreshNew = await checkDuplicateUpdate(mockKv, 556);
  assert.equal(isFreshNew, true);
});

test('Security: checkRateLimit', async () => {
  const store = new Map();
  const mockKv = {
    async get(k) { return store.has(k) ? JSON.parse(store.get(k)) : null; },
    async put(k, v) { store.set(k, v); }
  };

  const res1 = await checkRateLimit(mockKv, 'user_1', 2, 60);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 1);

  const res2 = await checkRateLimit(mockKv, 'user_1', 2, 60);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 0);

  const res3 = await checkRateLimit(mockKv, 'user_1', 2, 60);
  assert.equal(res3.allowed, false);
  assert.equal(res3.remaining, 0);
});

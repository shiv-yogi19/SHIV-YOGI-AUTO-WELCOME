/**
 * SHIV YOGI AUTO WELCOME BOT
 * Messages & Random Engine Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_MESSAGES,
  getMessages,
  getMessageById,
  addMessage,
  editMessage,
  deleteMessage,
  toggleMessage,
  reorderMessages,
  resetDefaultMessages,
  renderTemplate,
  selectRandomMessage,
  exportMessagesJson,
  importMessagesJson
} from '../worker/src/messages.js';

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
    _store: store
  };
}

test('Messages: 20 default English templates loaded', () => {
  assert.equal(INITIAL_MESSAGES.length, 20);
  for (const msg of INITIAL_MESSAGES) {
    assert.ok(msg.id > 0, `Template missing valid id`);
    assert.ok(typeof msg.text === 'string' && msg.text.length > 10, `Template #${msg.id} text too short`);
    assert.ok(typeof msg.category === 'string', `Template #${msg.id} missing category`);
    assert.equal(msg.enabled, true, `Default template #${msg.id} should be enabled`);
    assert.ok(msg.order > 0, `Template #${msg.id} missing order`);
  }
});

test('Messages: renderTemplate placeholder substitution', () => {
  const tpl = 'Hello {name} (@{username})! Shiv Yogi is away ({timer_mins} mins). Bot: {bot_name}, Owner: {owner_name}.';
  const ctx = {
    name: 'Vikram',
    username: 'vikram99',
    timer_mins: 5,
    bot_name: 'SHIV YOGI AUTO WELCOME',
    owner_name: 'Shiv Yogi'
  };

  const rendered = renderTemplate(tpl, ctx);
  assert.ok(rendered.includes('Hello Vikram (@vikram99)!'));
  assert.ok(rendered.includes('away (5 mins)'));
  assert.ok(rendered.includes('Bot: SHIV YOGI AUTO WELCOME'));
  assert.ok(rendered.includes('Owner: Shiv Yogi'));
});

test('Messages: add, edit, delete, toggle lifecycle', async () => {
  const kv = createMockKv();

  // 1. Get messages (seeds defaults)
  const initial = await getMessages(kv);
  assert.equal(initial.length, 20);

  // 2. Add message
  const addRes = await addMessage(kv, {
    title: 'Custom Test Message',
    category: 'custom',
    text: '✦ Testing custom message from unit test ✦'
  });
  assert.equal(addRes.success, true);
  assert.equal(addRes.message.id, 21);
  assert.equal(addRes.message.category, 'custom');

  const afterAdd = await getMessages(kv);
  assert.equal(afterAdd.length, 21);

  // 3. Edit message
  const editRes = await editMessage(kv, 21, {
    text: '✦ Updated custom message text ✦',
    category: 'updated'
  });
  assert.equal(editRes.success, true);
  assert.equal(editRes.message.text, '✦ Updated custom message text ✦');
  assert.equal(editRes.message.category, 'updated');

  // 4. Toggle message
  const toggleRes = await toggleMessage(kv, 21, false);
  assert.equal(toggleRes.success, true);
  assert.equal(toggleRes.message.enabled, false);

  // 5. Delete message
  const delRes = await deleteMessage(kv, 21);
  assert.equal(delRes.success, true);
  assert.equal(delRes.deleted.id, 21);

  const afterDel = await getMessages(kv);
  assert.equal(afterDel.length, 20);
});

test('Messages: reorderMessages', async () => {
  const kv = createMockKv();
  await getMessages(kv);

  const newOrder = [5, 4, 3, 2, 1];
  const reorderRes = await reorderMessages(kv, newOrder);
  assert.equal(reorderRes.success, true);

  const list = await getMessages(kv);
  assert.equal(list[0].id, 5);
  assert.equal(list[0].order, 1);
  assert.equal(list[1].id, 4);
  assert.equal(list[1].order, 2);
});

test('Messages: selectRandomMessage with no_repeat mode', async () => {
  const kv = createMockKv();
  const settings = {
    random_selection_mode: 'no_repeat',
    no_repeat_depth: 3,
    inactivity_timer_minutes: 4,
    active_categories: ['general', 'busy', 'inactivity', 'away', 'support']
  };

  const pickedIds = [];
  for (let i = 0; i < 3; i++) {
    const res = await selectRandomMessage(kv, settings, { name: 'Tester' });
    assert.ok(res.template && res.template.id);
    assert.ok(!pickedIds.includes(res.template.id), `Template ${res.template.id} repeated within depth 3`);
    pickedIds.push(res.template.id);
  }
  assert.equal(pickedIds.length, 3);
});

test('Messages: export and import JSON', async () => {
  const kv = createMockKv();
  await getMessages(kv);

  const exported = await exportMessagesJson(kv);
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.length, 20);

  const customSet = [
    { id: 101, title: 'Backup 1', text: 'Backup text 1', category: 'general', enabled: true },
    { id: 102, title: 'Backup 2', text: 'Backup text 2', category: 'busy', enabled: true }
  ];

  const importRes = await importMessagesJson(kv, customSet);
  assert.equal(importRes.success, true);
  assert.equal(importRes.count, 2);

  const current = await getMessages(kv);
  assert.equal(current.length, 2);

  // Reset defaults
  const resetRes = await resetDefaultMessages(kv);
  assert.equal(resetRes.length, 20);
});

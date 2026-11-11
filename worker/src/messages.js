/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Message Repository & Random Engine Module
 */

import defaultMessages from '../../data/default_messages.json' with { type: 'json' };

const MESSAGES_KV_KEY = 'config:messages';
const RECENT_IDS_KV_KEY = 'history:recent_message_ids';
const STATS_KV_KEY = 'stats:template_usage';

export const INITIAL_MESSAGES = defaultMessages;

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
export async function deleteMessage(kv, id) {
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

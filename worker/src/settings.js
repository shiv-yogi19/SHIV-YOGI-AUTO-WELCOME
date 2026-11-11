/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Settings Management Module
 */

export const DEFAULT_SETTINGS = {
  auto_welcome_enabled: true,
  inactivity_timer_minutes: 4,
  user_cooldown_minutes: 1440,
  global_daily_limit: 100,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  quiet_hours_timezone: "UTC",
  random_selection_mode: "no_repeat",
  no_repeat_depth: 5,
  ignored_user_ids: [],
  max_messages_per_recipient: 5,
  auto_delete_enabled: false,
  auto_delete_minutes: 60,
  emergency_paused: false,
  owner_name: "Shiv Yogi",
  active_categories: ["general", "away", "busy", "inactivity", "support"],
  version: "1.0.0"
};

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

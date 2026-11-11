#!/usr/bin/env node
/**
 * SHIV YOGI AUTO WELCOME BOT
 * Created By Shiv Yogi
 * Interactive Configuration & Deployment Setup Wizard
 */

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

function generateSecureSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function ask(rl, promptText, defaultValue = '') {
  return new Promise((resolve) => {
    const formattedPrompt = defaultValue ? `${promptText} [${defaultValue}]: ` : `${promptText}: `;
    rl.question(formattedPrompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function runWizard() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║               SHIV YOGI AUTO WELCOME BOT                   ║
║               Interactive Setup Wizard                     ║
║                 Created By Shiv Yogi                       ║
╚════════════════════════════════════════════════════════════╝
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('📌 STEP 1: Telegram Bot Credentials (Telegram Bot API)');
    console.log('   Create a bot with @BotFather on Telegram to get your BOT_TOKEN.\n');

    let botToken = '';
    while (!botToken) {
      botToken = await ask(rl, 'Enter BOT_TOKEN');
      if (!botToken.includes(':')) {
        console.log('   ⚠️ Invalid BOT_TOKEN format. Typically looks like 123456789:ABCdef...');
        botToken = '';
      }
    }

    console.log('\n📌 STEP 2: Owner Administration');
    console.log('   Send /start to @userinfobot to find your numeric Telegram ID.\n');

    let ownerId = '';
    while (!ownerId) {
      ownerId = await ask(rl, 'Enter OWNER_TELEGRAM_ID');
      if (!/^\d+$/.test(ownerId)) {
        console.log('   ⚠️ OWNER_TELEGRAM_ID must be a numeric integer.');
        ownerId = '';
      }
    }

    console.log('\n📌 STEP 3: Personal Account MTProto Credentials');
    console.log('   Get these at https://my.telegram.org -> API development tools.\n');

    let apiId = '';
    while (!apiId) {
      apiId = await ask(rl, 'Enter API_ID');
      if (!/^\d+$/.test(apiId)) {
        console.log('   ⚠️ API_ID must be a numeric integer.');
        apiId = '';
      }
    }

    let apiHash = '';
    while (!apiHash) {
      apiHash = await ask(rl, 'Enter API_HASH');
      if (apiHash.length < 10) {
        console.log('   ⚠️ API_HASH is too short.');
        apiHash = '';
      }
    }

    console.log('\n📌 STEP 4: Cloudflare Worker Deployment & Security');
    const defaultWorkerUrl = 'https://shiv-yogi-auto-welcome.YOUR_SUBDOMAIN.workers.dev';
    const workerUrl = await ask(rl, 'Enter your Cloudflare Worker URL', defaultWorkerUrl);

    const autoWebhookSecret = generateSecureSecret(24);
    const webhookSecret = await ask(rl, 'Enter WEBHOOK_SECRET (leave blank to auto-generate)', autoWebhookSecret);

    const autoCompanionSecret = generateSecureSecret(24);
    const companionSecret = await ask(rl, 'Enter COMPANION_SECRET (leave blank to auto-generate)', autoCompanionSecret);

    const timerMins = await ask(rl, 'Default Inactivity Timer in minutes', '4');

    // Generate .env file
    const envContent = `# ==========================================================
# SHIV YOGI AUTO WELCOME BOT - ENVIRONMENT CONFIGURATION
# Created By Shiv Yogi
# DO NOT COMMIT THIS FILE TO PUBLIC REPOSITORIES
# ==========================================================

# 1. Telegram Bot API Credentials
BOT_TOKEN=${botToken}
WEBHOOK_SECRET=${webhookSecret}
OWNER_TELEGRAM_ID=${ownerId}

# 2. MTProto Personal Account Credentials
API_ID=${apiId}
API_HASH=${apiHash}

# 3. Cloudflare Worker Backend
WORKER_URL=${workerUrl}
COMPANION_SECRET=${companionSecret}

# 4. Timer & Defaults
INACTIVITY_TIMER_MINUTES=${timerMins}
SESSION_NAME=shiv_yogi_companion
`;

    fs.writeFileSync(envPath, envContent, { mode: 0o600 });
    console.log(`\n✅ Saved private configuration to: ${envPath} (mode 0600)`);

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                     NEXT STEPS                             ║
╚════════════════════════════════════════════════════════════╝

1. Store Secrets in Cloudflare Workers:
   $ cd worker
   $ echo "${botToken}" | npx wrangler secret put BOT_TOKEN
   $ echo "${webhookSecret}" | npx wrangler secret put WEBHOOK_SECRET
   $ echo "${companionSecret}" | npx wrangler secret put COMPANION_SECRET

2. Deploy Cloudflare Worker:
   $ npx wrangler deploy

3. Register the Telegram Webhook:
   curl -F "url=${workerUrl}/webhook" \\
        -F "secret_token=${webhookSecret}" \\
        "https://api.telegram.org/bot${botToken}/setWebhook"

4. Start MTProto Companion (Interactive First Login):
   $ cd ../companion
   $ python3 -m pip install -r requirements.txt
   $ python3 main.py --login
   (Enter your phone number & code sent to Telegram)

5. Run Companion Daemon:
   $ python3 main.py

Setup complete! Enjoy using SHIV YOGI AUTO WELCOME BOT.
`);

  } finally {
    rl.close();
  }
}

runWizard().catch(console.error);

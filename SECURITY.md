# 🔒 SECURITY ARCHITECTURE & GUIDELINES

**SHIV YOGI AUTO WELCOME BOT**  
*Created By Shiv Yogi*

---

## 1. Security Overview

Security is a foundational pillar of the **SHIV YOGI AUTO WELCOME BOT**. The system interacts with personal Telegram accounts via MTProto and public Telegram Bot API webhooks. As such, strict controls are enforced at every boundary.

---

## 2. Threat Model & Mitigations

| Threat | Impact | Implemented Mitigation |
| :--- | :--- | :--- |
| **Spoofed Webhook Updates** | Attacker impersonates Telegram API to trigger actions | Verified via `X-Telegram-Bot-Api-Secret-Token` using constant-time string comparison. |
| **Unauthorized Worker Control** | Attacker calls internal API endpoints | Endpoints require `X-Companion-Secret` or `Authorization: Bearer <secret>`. |
| **Timing Attacks** | Attacker deduces secret tokens via response latency | All token comparisons use constant-time XOR byte evaluation (`timingSafeEqualStr`). |
| **Replay / Duplicate Updates** | Duplicate message dispatch on re-sent webhooks | Cloudflare KV stores `update_dedup:<id>` with 300s TTL. Duplicates are immediately dropped. |
| **Denial of Service (DoS)** | Excessive webhook requests overwhelm Worker | Built-in IP rate limiter (`checkRateLimit`) caps requests at 120 req/min per IP. |
| **Account Impersonation** | Wrong Telegram user connects companion | Startup check compares authenticated MTProto ID against `OWNER_TELEGRAM_ID`. Disconnects if mismatched. |
| **Credential Leakage in Logs** | Secrets appear in console/error traces | Automatic token scrubbing (`maskSecret` and `sanitizeTelegramLog`) strips tokens from logs. |
| **Session Theft** | MTProto session file accessed from git repo | `.gitignore` strictly excludes `*.session`, `session/`, and `.env`. |

---

## 3. Constant-Time Authentication

String comparisons for cryptographic tokens do not use `==` or `===`, which exit early on the first mismatched character and leak information via timing channels. Instead, `timingSafeEqualStr` is used:

```javascript
export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let mismatch = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    mismatch |= (bufA[i] ^ bufB[i]);
  }
  return mismatch === 0;
}
```

---

## 4. Secret Storage Best Practices

- **Cloudflare Worker Secrets**: Always store `BOT_TOKEN`, `WEBHOOK_SECRET`, and `COMPANION_SECRET` via `npx wrangler secret put`. Never commit them to `wrangler.toml`.
- **Companion Environment**: Keep `.env` with file permissions `0600` (`chmod 600 .env`) on the host machine.
- **Session Protection**: Protect `companion/session/` with restricted directory permissions (`chmod 700 session`).

---

## 5. Responsible Disclosure

If you discover a security vulnerability in this project, please notify Shiv Yogi privately through your authorized channels. Do not file public GitHub issues for security vulnerabilities.

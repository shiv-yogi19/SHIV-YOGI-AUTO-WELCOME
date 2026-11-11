"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
Companion Configuration & Validation Module
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Attempt to load python-dotenv if installed, otherwise manually read .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path)
except ImportError:
    # Manual lightweight .env loader fallback
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.is_file():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key not in os.environ:
                        os.environ[key] = val


def mask_secret(value: Optional[str]) -> str:
    """Masks sensitive credentials for diagnostic outputs."""
    if not value or not isinstance(value, str):
        return "[NOT SET]"
    if len(value) <= 6:
        return "******"
    return f"{value[:3]}...{value[-3:]}"


class Config:
    """Validated companion settings container."""

    def __init__(self):
        self.api_id: int = 0
        self.api_hash: str = ""
        self.owner_telegram_id: int = 0
        self.worker_url: str = ""
        self.companion_secret: str = ""
        self.inactivity_timer_minutes: int = 4
        self.session_name: str = "shiv_yogi_companion"
        self.session_dir: Path = Path(__file__).resolve().parent / "session"

    def load_and_validate(self) -> "Config":
        """Loads and strictly validates all configuration values."""
        errors = []

        # 1. API_ID
        raw_api_id = os.getenv("API_ID", "").strip()
        if not raw_api_id:
            errors.append("API_ID is required (obtained from https://my.telegram.org)")
        else:
            try:
                self.api_id = int(raw_api_id)
            except ValueError:
                errors.append("API_ID must be a valid integer")

        # 2. API_HASH
        self.api_hash = os.getenv("API_HASH", "").strip()
        if not self.api_hash:
            errors.append("API_HASH is required (obtained from https://my.telegram.org)")

        # 3. OWNER_TELEGRAM_ID
        raw_owner_id = os.getenv("OWNER_TELEGRAM_ID", "").strip()
        if not raw_owner_id:
            errors.append("OWNER_TELEGRAM_ID is required (your personal Telegram user ID)")
        else:
            try:
                self.owner_telegram_id = int(raw_owner_id)
            except ValueError:
                errors.append("OWNER_TELEGRAM_ID must be a valid integer")

        # 4. WORKER_URL
        self.worker_url = os.getenv("WORKER_URL", "").strip().rstrip("/")
        if not self.worker_url:
            errors.append("WORKER_URL is required (Cloudflare Worker base URL)")
        elif not (self.worker_url.startswith("http://") or self.worker_url.startswith("https://")):
            errors.append("WORKER_URL must start with http:// or https://")

        # 5. COMPANION_SECRET
        self.companion_secret = os.getenv("COMPANION_SECRET", "").strip()
        if not self.companion_secret:
            errors.append("COMPANION_SECRET is required to authenticate with Cloudflare Worker")

        # 6. Inactivity Timer
        raw_timer = os.getenv("INACTIVITY_TIMER_MINUTES", "4").strip()
        try:
            self.inactivity_timer_minutes = max(1, min(60, int(raw_timer)))
        except ValueError:
            self.inactivity_timer_minutes = 4

        # 7. Session Name & Directory
        self.session_name = os.getenv("SESSION_NAME", "shiv_yogi_companion").strip()
        self.session_dir.mkdir(parents=True, exist_ok=True)

        if errors:
            print("\n❌ Configuration Validation Failed:", file=sys.stderr)
            for err in errors:
                print(f"  • {err}", file=sys.stderr)
            print("\nPlease check your .env file or environment variables.\n", file=sys.stderr)
            raise ValueError(f"Invalid companion configuration: {len(errors)} error(s)")

        return self

    def print_diagnostics(self):
        """Prints safe startup telemetry without exposing secrets."""
        print("╭━━━〔 SHIV YOGI MTPROTO COMPANION 〕━━━╮")
        print(f"  • API_ID:             {self.api_id}")
        print(f"  • API_HASH:           {mask_secret(self.api_hash)}")
        print(f"  • OWNER_TELEGRAM_ID:  {self.owner_telegram_id}")
        print(f"  • WORKER_URL:         {self.worker_url}")
        print(f"  • COMPANION_SECRET:   {mask_secret(self.companion_secret)}")
        print(f"  • DEFAULT TIMER:      {self.inactivity_timer_minutes} minutes")
        print(f"  • SESSION NAME:       {self.session_name}")
        print("╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯")


# Global configuration instance
config = Config()

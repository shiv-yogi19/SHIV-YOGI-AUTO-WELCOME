"""
SHIV YOGI AUTO WELCOME BOT
Created By Shiv Yogi
MTProto Companion Process Entry Point
"""

import asyncio
import logging
import signal
import sys
from pathlib import Path

# Setup clean logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("shiv_yogi.companion")

# Add parent dir to path if running directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from companion.config import config
from companion.cloudflare_client import CloudflareClient
from companion.scheduler import InactivityScheduler
from companion.telegram_client import TelegramAccountClient
from companion.monitor import AccountMonitor


async def run_companion():
    """Main companion runner."""
    print("""
╔════════════════════════════════════════════════════════════╗
║             SHIV YOGI AUTO WELCOME BOT                     ║
║              MTProto Companion Daemon                      ║
║                 Created By Shiv Yogi                       ║
╚════════════════════════════════════════════════════════════╝
    """)

    # 1. Load and validate configuration
    try:
        cfg = config.load_and_validate()
    except Exception as e:
        logger.error(f"Fatal configuration error: {e}")
        sys.exit(1)

    cfg.print_diagnostics()

    # 2. Check for CLI mode flags
    if "--login" in sys.argv:
        logger.info("Starting interactive Telegram MTProto session login...")
        client_mgr = TelegramAccountClient(
            cfg.api_id,
            cfg.api_hash,
            cfg.owner_telegram_id,
            cfg.session_dir,
            cfg.session_name
        )
        await client_mgr.interactive_login()
        return

    # 3. Initialize Cloudflare Worker Client
    cf_client = CloudflareClient(cfg.worker_url, cfg.companion_secret)

    # 4. Verify Cloudflare Worker health
    logger.info(f"Connecting to Cloudflare Worker at {cfg.worker_url}...")
    is_worker_healthy = await cf_client.check_health()
    if is_worker_healthy:
        logger.info("✅ Cloudflare Worker backend is online and responding.")
    else:
        logger.warning(
            "⚠️ Cloudflare Worker did not respond to /health. "
            "Please ensure your Worker is deployed and the URL is correct."
        )

    if "--test-connection" in sys.argv:
        print("\nConnection test completed.")
        await cf_client.close()
        return

    # 5. Initialize Telegram MTProto Client
    telegram_mgr = TelegramAccountClient(
        cfg.api_id,
        cfg.api_hash,
        cfg.owner_telegram_id,
        cfg.session_dir,
        cfg.session_name
    )

    try:
        connected = await telegram_mgr.initialize()
        if not connected:
            logger.error("Could not authenticate MTProto client. Run with --login to log in.")
            await cf_client.close()
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error initializing MTProto client: {e}")
        await cf_client.close()
        sys.exit(1)

    # 6. Initialize Inactivity Scheduler & Account Monitor
    scheduler = InactivityScheduler()
    monitor = AccountMonitor(
        telegram_mgr.client,
        scheduler,
        cf_client,
        cfg.owner_telegram_id,
        cfg.inactivity_timer_minutes
    )
    monitor.register_handlers()

    logger.info("🚀 MTProto Companion is fully active and monitoring incoming chats.")
    logger.info("Press Ctrl+C to terminate cleanly.")

    # 7. Setup graceful shutdown triggers
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    def _sig_handler():
        logger.info("Termination signal received. Initiating graceful shutdown...")
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _sig_handler)
        except (NotImplementedError, AttributeError):
            pass

    # Wait until shutdown signal or disconnected
    try:
        await stop_event.wait()
    finally:
        logger.info("Shutting down companion components...")
        await scheduler.cancel_all()
        await telegram_mgr.disconnect()
        await cf_client.close()
        logger.info("👋 Companion stopped cleanly.")


def main():
    try:
        asyncio.run(run_companion())
    except KeyboardInterrupt:
        print("\nShutdown completed by user.")


if __name__ == "__main__":
    main()

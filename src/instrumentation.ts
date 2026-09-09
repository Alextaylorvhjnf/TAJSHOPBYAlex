/**
 * TAJ Electronics — v33 · Next.js instrumentation hook
 * -----------------------------------------------------------------------
 * Runs ONCE per server process (dev AND production standalone). In the
 * nodejs runtime it boots the Telegram bot supervisor (long-poller +
 * outbound watcher — see src/lib/telegram/poller.ts). When the bot is
 * disabled in Settings → «ربات تلگرامی», the supervisor simply idles.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startTelegramBot } = await import("./lib/telegram/poller");
    await startTelegramBot();
  } catch (e) {
    // the shop MUST boot even if the bot machinery has an issue
    console.error("[instrumentation] telegram bot failed to start:", e);
  }
}

/**
 * TAJ Electronics — v33 · Telegram bot POLLER
 * -----------------------------------------------------------------------
 * Long-polls getUpdates INSIDE the Next.js server process (started by
 * src/instrumentation.ts register()). All bot logic runs in this same
 * process — shared Prisma client, settings, AI engine, ZarinPal.
 *
 * Lifecycle:
 *   • every 20s: re-read settings → start polling when enabled+token,
 *     stop when disabled/token removed
 *   • getUpdates long-poll (25s) → each update → handleUpdate (flows.ts)
 *   • outbound watcher (watcher.ts) runs in the same loop
 *   • connection diagnostics (OK/ERROR + last error) persist to
 *     TelegramBotSettings for the admin Settings tab
 */

import { db } from "@/lib/db";
import { botToken } from "./common";
import { tg, tgSetCommands, classifyTelegramError } from "./api";
import type { TgUpdate } from "./types";

let supervisor: ReturnType<typeof setInterval> | null = null;
let polling = false; // a getUpdates call in flight
let active = false; // bot is enabled & polling loop alive
let bootedOnce = false; // setMyCommands done for this token
let tokenFingerprint = "";
let lastErrorLog = 0;
let lastIdleCheck = 0; // throttle settings reads while the bot is OFF (15s)

async function markOk(username?: string): Promise<void> {
  await db.telegramBotSettings
    .update({
      where: { id: "main" },
      data: {
        connectionStatus: "OK",
        connectionError: null,
        lastOkAt: new Date(),
        ...(username ? { botUsername: username } : {}),
      },
    })
    .catch(() => null);
}

async function markError(reason: string): Promise<void> {
  await db.telegramBotSettings
    .update({
      where: { id: "main" },
      data: { connectionStatus: "ERROR", connectionError: reason.slice(0, 300), lastErrorAt: new Date() },
    })
    .catch(() => null);
  // log throttled
  if (Date.now() - lastErrorLog > 300_000) {
    lastErrorLog = Date.now();
    console.error(`[TG bot] ${reason}`);
  }
}

async function pollOnce(token: string): Promise<void> {
  const settings = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  if (!settings || !settings.enabled) return;
  const offset = settings.lastUpdateId ? settings.lastUpdateId + 1 : 0;

  const res = await tg<TgUpdate[]>(token, "getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });

  if (!res.ok) {
    // 409 = another poller/webhook owns this token → clear it once
    if (res.error_code === 409) {
      await tg(token, "deleteWebhook", { drop_pending_updates: false }).catch(() => null);
    }
    await markError(classifyTelegramError(res.description ?? res.error_code));
    await new Promise((r) => setTimeout(r, 4000));
    return;
  }

  const updates = res.result ?? [];
  if (updates.length > 0) {
    const maxId = updates[updates.length - 1].update_id;
    await db.telegramBotSettings.update({ where: { id: "main" }, data: { lastUpdateId: maxId } }).catch(() => null);
  }
  if (!bootedOnce || tokenFingerprint !== token) {
    tokenFingerprint = token;
    bootedOnce = true;
    const me = await tg<{ username?: string }>(token, "getMe");
    await markOk(me.result?.username);
    await tgSetCommands(token).catch(() => null);
  } else if (updates.length === 0) {
    await markOk();
  }

  for (const u of updates) {
    try {
      const { handleUpdate } = await import("./flows");
      await handleUpdate(token, u);
    } catch (e) {
      console.error("[TG update]", u.update_id, e);
    }
  }
}

async function supervisorTick(): Promise<void> {
  if (polling) return;
  // while the bot is OFF, re-read settings only every 15s (cheap idle cadence)
  const now = Date.now();
  if (!active) {
    if (now - lastIdleCheck < 15_000) return;
    lastIdleCheck = now;
  }
  polling = true;
  try {
    const settings = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
    const token = settings?.enabled ? botToken(settings) : null;
    if (!token) {
      if (active) {
        active = false;
        bootedOnce = false;
        tokenFingerprint = "";
        console.log("[TG bot] disabled — polling stopped");
        await db.telegramBotSettings
          .update({ where: { id: "main" }, data: { connectionStatus: "OFF", connectionError: null } })
          .catch(() => null);
      }
      return;
    }
    if (!active) {
      active = true;
      console.log("[TG bot] enabled — polling started");
    }
    await pollOnce(token);
  } catch (e) {
    await markError(classifyTelegramError(e)).catch(() => null);
  } finally {
    polling = false;
  }
}

/**
 * Start the bot supervisor. Idempotent — called once from
 * instrumentation.register() in the nodejs runtime. Also starts the
 * outbound watcher (notifications) in the same process.
 */
export async function startTelegramBot(): Promise<void> {
  if (supervisor) return;
  // dev double-start guard (Next may call register twice)
  const g = globalThis as { __taj_tg_started?: boolean };
  if (g.__taj_tg_started) return;
  g.__taj_tg_started = true;

  // never run the bot during `next build`
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  supervisor = setInterval(() => {
    void supervisorTick();
  }, 1000);
  if (typeof supervisor.unref === "function") supervisor.unref();

  const { startTelegramWatcher } = await import("./watcher");
  startTelegramWatcher();
  console.log("[TG bot] supervisor started (poller + watcher)");
}

/** Test helper — process one update without starting the loops. */
export async function processUpdateForTest(update: TgUpdate): Promise<void> {
  const settings = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  const token = settings ? botToken(settings) : null;
  if (!token) throw new Error("bot not configured");
  const { handleUpdate } = await import("./flows");
  await handleUpdate(token, update);
}

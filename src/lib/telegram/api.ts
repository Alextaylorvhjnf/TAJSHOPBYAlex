/**
 * TAJ Electronics — v33 · Telegram Bot API client
 * -----------------------------------------------------------------------
 * Zero-dependency (Node 22 global fetch/FormData/Blob) wrapper around the
 * Telegram Bot API. Used by the in-process long-poller (poller.ts), the
 * admin settings test route and the outbound watcher.
 *
 * All text messages use parse_mode=HTML — every caller MUST pass text
 * through esc() (see common.ts) for untrusted content.
 */

import type { InlineKeyboard } from "./types";

const API_BASE = "https://api.telegram.org";

export type TgApiResult<T> = { ok: boolean; result?: T; description?: string; error_code?: number };

/** Low-level Bot API call (JSON body). */
export async function tg<T = unknown>(token: string, method: string, params?: Record<string, unknown>): Promise<TgApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params ?? {}),
      signal: AbortSignal.timeout(60_000),
    });
    return (await res.json()) as TgApiResult<T>;
  } catch (e) {
    return { ok: false, description: String(e instanceof Error ? e.message : e) };
  }
}

/** getMe — validate a token, returns the bot identity. */
export async function tgGetMe(token: string) {
  return tg<{ id: number; username: string; first_name: string }>(token, "getMe");
}

export type TgMessagePayload = {
  text?: string;
  parseMode?: "HTML" | "None";
  keyboard?: InlineKeyboard | null;
  disablePreview?: boolean;
  replyTo?: number;
};

/** sendMessage with HTML parse mode + optional inline keyboard. */
export async function tgSendMessage(token: string, chatId: string | number, text: string, opts: TgMessagePayload = {}) {
  return tg<{ message_id: number }>(token, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: opts.parseMode === "None" ? undefined : "HTML",
    link_preview_options: { is_disabled: opts.disablePreview ?? true },
    reply_markup: opts.keyboard ? { inline_keyboard: opts.keyboard.rows } : undefined,
    reply_to_message_id: opts.replyTo,
  });
}

/**
 * sendPhoto — supports BOTH local files (Buffer — uploaded as multipart, so
 * it works even when the shop has no public domain) and public URLs.
 * Telegram captions are limited to 1024 chars.
 */
export async function tgSendPhoto(
  token: string,
  chatId: string | number,
  photo: { buffer?: Buffer; filename?: string; url?: string },
  caption?: string,
  opts: TgMessagePayload = {}
) {
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) {
      form.append("caption", caption.slice(0, 1024));
      if (opts.parseMode !== "None") form.append("parse_mode", "HTML");
    }
    if (opts.keyboard) form.append("reply_markup", JSON.stringify({ inline_keyboard: opts.keyboard.rows }));
    if (opts.replyTo) form.append("reply_to_message_id", String(opts.replyTo));

    if (photo.buffer) {
      form.append("photo", new Blob([new Uint8Array(photo.buffer)], { type: "image/jpeg" }), photo.filename ?? "photo.jpg");
    } else if (photo.url) {
      form.append("photo", photo.url);
    } else {
      return { ok: false as const, description: "no photo source" };
    }

    const res = await fetch(`${API_BASE}/bot${token}/sendPhoto`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    return (await res.json()) as TgApiResult<{ message_id: number }>;
  } catch (e) {
    return { ok: false as const, description: String(e instanceof Error ? e.message : e) };
  }
}

/** editMessageText — update an already-sent message (used for pagination). */
export async function tgEditMessage(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
  opts: TgMessagePayload = {}
) {
  return tg(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: text.slice(0, 4096),
    parse_mode: opts.parseMode === "None" ? undefined : "HTML",
    link_preview_options: { is_disabled: opts.disablePreview ?? true },
    reply_markup: opts.keyboard ? { inline_keyboard: opts.keyboard.rows } : undefined,
  });
}

/** answerCallbackQuery — stop the little spinner on the tapped button. */
export async function tgAnswerCallback(token: string, callbackQueryId: string, text?: string) {
  return tg(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text?.slice(0, 190),
    show_alert: false,
  });
}

/** Register the bot command palette shown in Telegram's "/" menu. */
export async function tgSetCommands(token: string) {
  return tg(token, "setMyCommands", {
    commands: [
      { command: "start", description: "شروع و منوی اصلی فروشگاه" },
      { command: "shop", description: "فروشگاه و دسته‌بندی‌ها" },
      { command: "search", description: "جستجوی محصول" },
      { command: "ai", description: "گفتگو با مشاور هوش مصنوعی" },
      { command: "cart", description: "سبد خرید" },
      { command: "track", description: "پیگیری سفارش" },
      { command: "tickets", description: "پشتیبانی و تیکت‌ها" },
      { command: "help", description: "راهنمای ربات" },
    ],
  });
}

/**
 * The PERSISTENT reply keyboard — the shop's main menu that always sits at
 * the bottom of the chat. Text sent from these buttons is routed like the
 * equivalent /command (see flows.ts TEXT_ROUTES).
 */
export async function tgSetReplyKeyboard(token: string, chatId: string | number, isAdmin: boolean) {
  const lastRow = isAdmin ? ["ℹ️ راهنما", "🛠 پنل مدیریت"] : ["ℹ️ راهنما", "🌐 وب‌سایت"];
  return tg(token, "sendMessage", {
    chat_id: chatId,
    text: "⌨️",
    reply_markup: {
      keyboard: [
        [["🛍 فروشگاه", "🔍 جستجو"], ["🤖 مشاور AI", "🛒 سبد خرید"], ["📦 پیگیری سفارش", "🎫 پشتیبانی"], [lastRow]],
      ]
        .map((r) => r.map((t) => ({ text: t }))),
      resize_keyboard: true,
      is_persistent: true,
    },
  });
}

/** getFile + file download — used for card-to-card receipt photos. */
export async function tgDownloadFile(token: string, fileId: string): Promise<{ ok: boolean; buffer?: Buffer; error?: string }> {
  const info = await tg<{ file_path?: string }>(token, "getFile", { file_id: fileId });
  if (!info.ok || !info.result?.file_path) {
    return { ok: false, error: info.description ?? "getFile failed" };
  }
  try {
    const res = await fetch(`${API_BASE}/file/bot${token}/${info.result.file_path}`, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { ok: false, error: `download HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, buffer: buf };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e) };
  }
}

/** Human-readable classify for the admin settings panel / poller log. */
export function classifyTelegramError(e: unknown): string {
  const msg = String(e instanceof Error ? e.message : (e ?? "")).toLowerCase();
  if (msg.includes("401") || msg.includes("unauthorized")) return "توکن ربات نامعتبر است";
  if (msg.includes("409")) return "یک اتصال دیگر (webhook یا poller) فعال است";
  if (msg.includes("timeout") || msg.includes("fetch failed") || msg.includes("enotfound") || msg.includes("econnrefused") || msg.includes("econnreset")) {
    return "ارتباط با سرورهای تلگرام برقرار نشد";
  }
  return msg.slice(0, 200) || "خطای ناشناخته";
}

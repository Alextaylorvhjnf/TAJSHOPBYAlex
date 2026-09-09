/**
 * TAJ Electronics — v33 · Telegram bot common helpers
 * -----------------------------------------------------------------------
 * Settings/subscriber access, admin-chat detection, formatting (Persian
 * digits, prices), HTML escaping and the site-URL resolver.
 */

import path from "node:path";
import fs from "node:fs";
import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";
import type { TelegramBotSettings, TelegramSubscriber } from "@prisma/client";
import type { BotCartItem, InlineKeyboard, TgUser } from "./types";

// ─────────────────────────── settings (cached 10s) ───────────────────────────

let settingsCache: { at: number; value: TelegramBotSettings | null } = { at: 0, value: null };
const SETTINGS_TTL = 10_000;

/** Read TelegramBotSettings (creates the row if missing). Cached 10s so the
 * poller can cheaply detect enable/disable without hammering SQLite. */
export async function getBotSettings(): Promise<TelegramBotSettings> {
  if (settingsCache.value && Date.now() - settingsCache.at < SETTINGS_TTL) return settingsCache.value;
  const value = await db.telegramBotSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
  settingsCache = { at: Date.now(), value };
  return value;
}

/** Bust the cache — called after the admin settings PUT route saves. */
export function invalidateBotSettingsCache() {
  settingsCache = { at: 0, value: null };
}

export function botToken(s: TelegramBotSettings): string | null {
  const t = s.botToken?.trim();
  return t ? t : null;
}

/** Parse adminChatId into a Set of numeric chat ids. */
export function adminChatIds(s: TelegramBotSettings): Set<string> {
  const out = new Set<string>();
  for (const part of (s.adminChatId ?? "").split(/[,،]/)) {
    const t = part.trim();
    if (/^-?\d{3,20}$/.test(t)) out.add(t);
  }
  return out;
}

export async function isBotEnabled(): Promise<boolean> {
  const s = await getBotSettings();
  return s.enabled && !!botToken(s);
}

// ─────────────────────────── subscribers ───────────────────────────

export async function upsertSubscriber(chatId: string, from?: TgUser): Promise<TelegramSubscriber> {
  const data = {
    firstName: from?.first_name,
    lastName: from?.last_name,
    username: from?.username,
    lastSeenAt: new Date(),
  };
  const existing = await db.telegramSubscriber.findUnique({ where: { chatId } });
  if (existing) {
    return db.telegramSubscriber.update({ where: { chatId }, data });
  }
  return db.telegramSubscriber.create({ data: { chatId, ...data } });
}

export async function getSubscriber(chatId: string): Promise<TelegramSubscriber | null> {
  return db.telegramSubscriber.findUnique({ where: { chatId } });
}

export async function setState(sub: TelegramSubscriber, state: string, stateData?: unknown) {
  await db.telegramSubscriber.update({
    where: { id: sub.id },
    data: { state, stateData: stateData === undefined ? sub.stateData : stateData == null ? null : JSON.stringify(stateData) },
  });
}

export async function setCart(sub: TelegramSubscriber, cart: BotCartItem[]) {
  await db.telegramSubscriber.update({
    where: { id: sub.id },
    data: { cart: JSON.stringify(cart) },
  });
}

export function parseCart(sub: TelegramSubscriber): BotCartItem[] {
  if (!sub.cart) return [];
  try {
    const arr = JSON.parse(sub.cart);
    return Array.isArray(arr) ? (arr as BotCartItem[]) : [];
  } catch {
    return [];
  }
}

export function parseStateData<T = Record<string, unknown>>(sub: TelegramSubscriber): T | null {
  if (!sub.stateData) return null;
  try {
    return JSON.parse(sub.stateData) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────── formatting ───────────────────────────

/** Persian digits + thousand separators. */
export function fa(n: number | string): string {
  return Number(n).toLocaleString("fa-IR");
}

/** Toman price → «۱۲,۵۰۰,۰۰۰ تومان». */
export function price(t: number): string {
  return `${fa(t)} تومان`;
}

/** Escape untrusted text for parse_mode=HTML. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function shortName(sub: TelegramSubscriber): string {
  return [sub.firstName, sub.lastName].filter(Boolean).join(" ").trim() || sub.username || "کاربر";
}

export function fmtDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

// ─────────────────────────── site URL ───────────────────────────

let cachedSiteUrl = "";

/** Public site URL for links (payment gateway, product pages). */
export function siteUrl(): string {
  if (cachedSiteUrl) return cachedSiteUrl;
  let url = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  cachedSiteUrl = url.replace(/\/+$/, "");
  return cachedSiteUrl;
}

export function isLocalSite(): boolean {
  const u = siteUrl();
  return /localhost|127\.0\.0\.1/.test(u);
}

// ─────────────────────────── store name ───────────────────────────

let cachedStoreName = "";
export async function storeName(): Promise<string> {
  if (cachedStoreName) return cachedStoreName;
  const s = await getStoreSettings();
  cachedStoreName = s.storeName;
  return s.storeName;
}

// ─────────────────────────── keyboards util ───────────────────────────

export const kb = (rows: InlineKeyboard["rows"]): InlineKeyboard => ({ rows });

// ─────────────────────────── product image loader ───────────────────────────

/**
 * Read a store image (relative path like /uploads/products/x.png or
 * /images/products/y.jpg) from disk — the bot uploads photos as multipart
 * so it works even WITHOUT a public domain. Returns null for external URLs
 * (caller then passes the URL directly) or missing files.
 */
export function loadLocalImage(relPath: string): { buffer?: Buffer; url?: string } {
  if (/^https?:\/\//i.test(relPath)) return { url: relPath };
  try {
    const clean = relPath.split("?")[0];
    const abs = path.join(process.cwd(), "public", decodeURIComponent(clean.replace(/^\/+/, "")));
    if (fs.existsSync(abs) && fs.statSync(abs).size > 0 && fs.statSync(abs).size < 8 * 1024 * 1024) {
      return { buffer: fs.readFileSync(abs) };
    }
  } catch {
    /* fall through */
  }
  return {};
}

// ─────────────────────────── rate limiting (in-memory) ───────────────────────────

const rlBuckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = rlBuckets.get(key);
  if (!b || now > b.reset) {
    rlBuckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (b.n >= max) return false;
  b.n += 1;
  return true;
}

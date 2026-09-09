import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { invalidateBotSettingsCache } from "@/lib/telegram/common";

/* v33 (task 2-c) · Telegram store-bot settings — GET (masked token) + PUT.
 * Mirrors the payment-settings route's auth / ok-fail / logging shape.
 * The bot engine itself (poller, admin console, storefront flows) lives in
 * src/lib/telegram/* — this route only owns the settings row. */

/** @BotFather token shape: 123456:AAH8sk… (5-16 digits, colon, 30+ url-safe chars) */
const BOT_TOKEN_RE = /^\d{5,16}:[A-Za-z0-9_-]{30,}$/;
/** one admin chat id: user ids are positive, group/channel ids negative — 3-20 digits */
const CHAT_ID_RE = /^-?\d{3,20}$/;

/** never return the raw token to the browser — first 8 chars + … + last 4
 *  (tokens are always ≥ 36 chars, so ≥ 14 is a safety floor). */
function maskBotToken(token: string): string {
  if (token.length >= 14) return `${token.slice(0, 8)}…${token.slice(-4)}`;
  return "••••";
}

/** the single settings row, created on first touch (id = "main") */
async function getOrCreateSettings() {
  return db.telegramBotSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const s = await getOrCreateSettings();
  return ok({
    settings: {
      botTokenSet: !!s.botToken,
      botTokenMasked: s.botToken ? maskBotToken(s.botToken) : null,
      adminChatId: s.adminChatId,
      enabled: s.enabled,
      welcomeText: s.welcomeText,
      connectionStatus: s.connectionStatus,
      connectionError: s.connectionError,
      lastOkAt: s.lastOkAt,
      lastErrorAt: s.lastErrorAt,
      botUsername: s.botUsername,
    },
  });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("اطلاعات نامعتبر است", 400);

  const current = await getOrCreateSettings();

  /* only the fields actually present in the body are touched — the UI can
   * save e.g. the welcome text without re-sending the token. */
  const data: {
    adminChatId?: string | null;
    botToken?: string;
    enabled?: boolean;
    welcomeText?: string | null;
  } = {};

  /* adminChatId — empty (null = no admin chats) or a comma-separated list of
   * numeric chat ids. The Persian ، is accepted alongside , (admins paste
   * ids both ways) — stored normalized with plain commas. */
  if ("adminChatId" in body) {
    const raw = typeof body.adminChatId === "string" ? body.adminChatId : "";
    const parts = raw.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      data.adminChatId = null;
    } else if (parts.every((p) => CHAT_ID_RE.test(p))) {
      data.adminChatId = parts.join(",");
    } else {
      return fail("شناسه چت نامعتبر است. فقط عدد (می‌توانید چند شناسه را با کاما جدا کنید).", 400);
    }
  }

  /* botToken — ABSENT or EMPTY keeps the stored token (never wiped by
   * accident: the browser never receives it back, so an empty field on save
   * must mean "unchanged"). Spaces are stripped before validation. */
  if ("botToken" in body) {
    const token = (typeof body.botToken === "string" ? body.botToken : "").replace(/\s+/g, "");
    if (token !== "") {
      if (!BOT_TOKEN_RE.test(token)) {
        return fail("توکن ربات نامعتبر است. توکن را دقیقاً از @BotFather کپی کنید.", 400);
      }
      data.botToken = token;
    }
  }

  /* welcomeText — trimmed, nullable, max 1500 chars (Telegram messages cap ~4096) */
  if ("welcomeText" in body) {
    const wt = (typeof body.welcomeText === "string" ? body.welcomeText : "").trim();
    if (wt.length > 1500) return fail("پیام خوش‌آمد حداکثر ۱۵۰۰ کاراکتر است.", 400);
    data.welcomeText = wt === "" ? null : wt;
  }

  /* enabled — the bot may only run with a token present (stored or sent in
   * this very request) */
  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return fail("مقدار فعال‌سازی نامعتبر است.", 400);
    if (body.enabled) {
      const willHaveToken = typeof data.botToken === "string" || !!current.botToken;
      if (!willHaveToken) return fail("ابتدا توکن ربات را وارد و ذخیره کنید.", 400);
    }
    data.enabled = body.enabled;
  }

  /* a NEW token invalidates the previous bot identity — the cached username
   * and connection diagnostics are reset; the poller / test button
   * re-detects them with the new token. */
  const tokenChanged = typeof data.botToken === "string" && data.botToken !== current.botToken;
  const diagnostics = tokenChanged
    ? { connectionStatus: "OFF", connectionError: null, botUsername: null }
    : {};

  await db.telegramBotSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...data, ...diagnostics },
    update: { ...data, ...diagnostics },
  });
  invalidateBotSettingsCache(); // the poller/flows re-read settings immediately

  await logAdmin(admin.id, "TELEGRAM_BOT_SETTINGS", {
    entity: "TelegramBotSettings",
    entityId: "main",
    ip: getClientIp(req),
  });
  return ok({ message: "تنظیمات ربات تلگرام ذخیره شد" });
}

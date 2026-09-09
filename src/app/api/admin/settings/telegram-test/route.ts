import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";

/* v33 (task 2-c) · Telegram connection test — mirrors the zarinpal-test
 * pattern (auth + rate limit + ok(success) envelope). Uses ONLY the SAVED
 * token from TelegramBotSettings (the token never reaches the browser), so
 * the admin must save before testing. getMe proves the token, then a test
 * message goes to every admin chat id — the result is persisted into the
 * settings row for the status card in Settings → ربات تلگرامی. */

const IRAN_FILTER_NOTE =
  "اگر سرور شما داخل ایران است، به دلیل فیلتر بودن تلگرام اتصال ممکن نیست؛ از سرور خارجی (ترکیه، آلمان یا انگلیس) استفاده کنید.";

/** comma (or Persian ،) separated admin chat ids → list */
function parseAdminChatIds(raw: string | null): string[] {
  return (raw ?? "")
    .split(/[,،]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** persist a failed attempt for the status card — diagnostics never break the answer */
async function persistError(reason: string) {
  await db.telegramBotSettings
    .update({
      where: { id: "main" },
      data: { connectionStatus: "ERROR", connectionError: reason.slice(0, 500), lastErrorAt: new Date() },
    })
    .catch(() => null);
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  if (!rateLimit(`tgtest:${admin.id}`, 3, 60_000).ok) return fail("تلاش‌های زیاد", 429);

  const settings = await db.telegramBotSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
  const token = settings.botToken;
  if (!token) return fail("ابتدا توکن ربات را ذخیره کنید.", 400);

  const store = await getStoreSettings();
  const storeName = (store.storeName ?? "").trim() || "فروشگاه";

  /* every ACTUAL test attempt (success or failure) is audited — the early
   * fail() branches above (auth / rate limit / missing token) are not tests. */
  const finish = async (payload: { success: boolean; message: string; bot?: { id: number; username: string; first_name: string } }) => {
    await logAdmin(admin.id, "TELEGRAM_BOT_TEST", {
      entity: "TelegramBotSettings",
      entityId: "main",
      ip: getClientIp(req),
    });
    return ok(payload);
  };

  /* ── ۱) getMe — does Telegram answer for this token? ── */
  let meRes: Response;
  try {
    meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    /* fetch itself threw — timeout or DNS/socket trouble (the classic
     * "hosted inside Iran" case). Detect it and be kind about it. */
    const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const isNetwork =
      isTimeout ||
      e instanceof TypeError ||
      (e instanceof Error &&
        /(fetch|network|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|socket|dns|tls)/i.test(e.message));
    const reason = isTimeout
      ? "timeout — تلگرام در ۱۵ ثانیه پاسخ نداد"
      : e instanceof Error
        ? e.message
        : "network error";
    await persistError(reason);
    const message = isNetwork
      ? `اتصال به تلگرام برقرار نشد (${reason.slice(0, 120)}). ${IRAN_FILTER_NOTE}`
      : `اتصال به تلگرام برقرار نشد (${reason.slice(0, 120)}).`;
    return finish({ success: false, message });
  }

  type TgResponse = {
    ok?: boolean;
    result?: { id?: number; username?: string; first_name?: string };
    description?: string;
    error_code?: number;
  };
  let me: TgResponse | null = null;
  try {
    me = (await meRes.json()) as TgResponse;
  } catch {
    me = null;
  }

  /* 401 = Telegram rejected the token itself */
  if (meRes.status === 401 || me?.error_code === 401) {
    await persistError("توکن نامعتبر است (401 Unauthorized)");
    return finish({
      success: false,
      message:
        "توکن نامعتبر است — تلگرام این توکن را نشناخت. توکن را دقیقاً از @BotFather کپی کنید، ذخیره کنید و دوباره تست بزنید.",
    });
  }

  if (!meRes.ok || !me?.ok || !me.result) {
    const reason = `HTTP ${meRes.status}${me?.description ? ` — ${me.description}` : ""}`;
    await persistError(reason);
    return finish({ success: false, message: `اتصال به تلگرام برقرار نشد (${reason.slice(0, 200)}).` });
  }

  const bot = {
    id: me.result.id ?? 0,
    username: me.result.username ?? "",
    first_name: me.result.first_name ?? "",
  };

  /* ── ۲) test message to EVERY admin chat id (if any) ──
   * getUpdates is intentionally NOT used here. A chat that never pressed
   * /start in the bot cannot receive messages (Telegram 400 "chat not
   * found") — those failures are collected into a Persian hint instead of
   * failing the whole test. */
  const chatIds = parseAdminChatIds(settings.adminChatId);
  const failedChatIds: string[] = [];
  if (chatIds.length > 0) {
    const text = `✅ ربات فروشگاه «${storeName}» با موفقیت متصل شد!`;
    for (const chatId of chatIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(15_000),
        });
        const j = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (!res.ok || !j?.ok) failedChatIds.push(chatId);
      } catch {
        failedChatIds.push(chatId);
      }
    }
  }

  await db.telegramBotSettings
    .update({
      where: { id: "main" },
      data: {
        connectionStatus: "OK",
        connectionError: null,
        lastOkAt: new Date(),
        botUsername: bot.username || null,
      },
    })
    .catch(() => null);

  let message = bot.username
    ? `اتصال موفق — ربات @${bot.username} پاسخ داد`
    : "اتصال موفق — ربات پاسخ داد";
  if (failedChatIds.length > 0) {
    message += `. ⚠️ پیام آزمایشی به شناسه چت ${failedChatIds.join("، ")} ارسال نشد: ابتدا در خود ربات /start بزنید`;
  }

  return finish({ success: true, message, bot });
}

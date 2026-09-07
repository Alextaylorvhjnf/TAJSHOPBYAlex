import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { forgotSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { resolveSmtpConfig, isSmtpConfigured, sendEmail } from "@/lib/mailer";
import { renderPasswordResetEmail } from "@/lib/email-templates";
import { sha256Hex } from "@/lib/crypto-secret";
import crypto from "crypto";

/** Token lifetime — short-lived single-use reset links (spec: 30–60 min). */
const TOKEN_TTL_MINUTES = 45;

// v28: the owner explicitly requested REAL verification + REAL feedback:
// the store checks whether the account exists, sends the mail when it does,
// and tells the visitor the actual outcome (including send errors) instead
// of the old anti-enumeration generic answer.
const NOT_FOUND_MESSAGE = "حسابی با این ایمیل یا شماره موبایل یافت نشد. ابتدا در فروشگاه ثبت‌نام کنید.";
const SMTP_UNAVAILABLE = "امکان ارسال ایمیل بازیابی در حال حاضر وجود ندارد. لطفاً بعداً دوباره تلاش کنید.";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate limits (§16): per IP and per identifier — blocks bulk reset-mail abuse.
  if (!rateLimit(`forgot-ip:${ip}`, 5, 10 * 60_000).ok) {
    return fail("تلاش‌های زیاد. لطفاً کمی بعد تلاش کنید.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  const idn = parsed.data.identifier.replace(/\s/g, "");
  if (!rateLimit(`forgot-id:${idn}`, 3, 60 * 60_000).ok) {
    return fail("برای این حساب چند درخواست پشت‌سرهم ثبت شده است. لطفاً یک ساعت دیگر تلاش کنید یا ایمیل قبلی را بررسی کنید.", 429);
  }

  // Mail service must be enabled and configured before anything else:
  // a clear system-state error, no tokens created, no link exposed.
  const smtp = await resolveSmtpConfig();
  if (!isSmtpConfigured(smtp)) {
    console.log(`[SMTP] password reset skipped — SMTP ${smtp.enabled ? "incomplete" : "disabled"} (no email sent)`);
    return fail(SMTP_UNAVAILABLE, 503);
  }

  // v28: real account lookup — the visitor is told when the account
  // does not exist so they can register instead of waiting for a mail
  // that will never arrive.
  const user = await db.user.findFirst({
    where: { OR: [{ email: idn }, { phone: idn }] },
  });

  if (!user) {
    return fail(NOT_FOUND_MESSAGE, 404);
  }

  // Phone-only account: existing architecture has no SMS provider and no
  // browser fallback is allowed (§14) → email only when an address exists.
  if (!user.email) {
    console.log(`[AUTH] password reset requested for phone-only account (user: ${user.id}) — no email on file, no fallback`);
    return fail("این حساب با شماره موبایل ساخته شده و ایمیل ثبت‌شده ندارد؛ امکان ارسال لینک بازیابی وجود ندارد. لطفاً با پشتیبانی تماس بگیرید.", 400);
  }

  // v28: delivery errors are surfaced to the visitor (the same precise
  // SMTP diagnosis the admin test mail shows) — a failed send must never
  // look like a success.
  let resetToken = "";
  try {
    // Invalidate every previous pending token for this account (§10).
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Cryptographically secure token; DB stores only its SHA-256 hash —
    // the raw token exists solely inside the emailed link (§3/§10).
    resetToken = crypto.randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        token: `v2:${crypto.randomBytes(16).toString("hex")}`, // non-sensitive unique filler (legacy column)
        tokenHash: sha256Hex(resetToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
      },
    });

    const mail = await renderPasswordResetEmail({
      req,
      resetToken,
      expiresInMinutes: TOKEN_TTL_MINUTES,
      userName: user.firstName,
    });
    await sendEmail({ to: user.email, subject: mail.subject, html: mail.html, text: mail.text });

    console.log(`[AUTH] password reset email sent (user: ${user.id})`);
  } catch (err) {
    // Delivery failure: the REAL SMTP reason is reported (never the token).
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`[SMTP] password reset email failed (user: ${user.id}): ${reason}`);
    // clean up the unusable pending token so the user can retry immediately
    await db.passwordResetToken
      .updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })
      .catch(() => null);
    return fail(reason || "ارسال ایمیل بازیابی ناموفق بود — لطفاً تنظیمات SMTP فروشگاه را بررسی کنید.", 502);
  }

  return ok({
    message: `لینک بازیابی رمز عبور به ایمیل ${user.email} ارسال شد. لطفاً صندوق ورودی (و پوشه اسپم) خود را بررسی کنید.`,
  });
}

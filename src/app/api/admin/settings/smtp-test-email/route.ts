import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { smtpTestEmailSchema } from "@/lib/validators";
import { resolveSmtpConfig, isSmtpConfigured, sendEmail } from "@/lib/mailer";
import { renderTestEmail } from "@/lib/email-templates";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";

/**
 * ارسال ایمیل آزمایشی — sends a REAL email through the SAVED SMTP settings.
 * The browser only receives success/failure (§8) — no credentials, no internals.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  if (!rateLimit(`smtpmail:${admin.id}`, 3, 60_000).ok) return fail("تلاش‌های زیاد", 429);

  const body = await req.json().catch(() => null);
  const parsed = smtpTestEmailSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "ایمیل مقصد نامعتبر است", 400);

  const cfg = await resolveSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    return fail("ابتدا تنظیمات SMTP را تکمیل، ذخیره و فعال کنید", 400);
  }

  const mail = await renderTestEmail({ req });
  try {
    await sendEmail({ to: parsed.data.to, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    // v28: the REAL reason is analyzed + shown to the admin (never hidden) —
    // verify() succeeding while sendMail fails is an envelope-level problem
    // (From rejected / recipient rejected / relay blocked) the connection
    // test can never see. SMTP_NOT_CONFIGURED keeps its dedicated message.
    const raw = err instanceof Error ? err.message : String(err);
    console.log(`[SMTP] test email failed (host: ${cfg.host}): ${raw}`);
    if (raw === "SMTP_NOT_CONFIGURED") {
      return fail("ابتدا تنظیمات SMTP را تکمیل، ذخیره و فعال کنید", 400);
    }
    return fail(raw || "ارسال ایمیل آزمایشی ناموفق بود — تنظیمات و اتصال SMTP را بررسی کنید", 502);
  }

  await logAdmin(admin.id, "SETTINGS_SMTP_TEST_EMAIL", {
    entity: "SmtpSettings",
    metadata: { to: parsed.data.to },
    ip: getClientIp(req),
  });

  return ok({ success: true, message: "ایمیل آزمایشی با موفقیت ارسال شد" });
}

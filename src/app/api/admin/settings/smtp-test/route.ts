import { ok, fail } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { smtpConnectionTestSchema } from "@/lib/validators";
import { resolveSmtpConfig, smtpTestConnection, type SmtpSecurity } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";

/**
 * تست اتصال SMTP — opens a REAL connection and authenticates.
 *
 * v35 · FOCUSED + DETERMINISTIC:
 *  • The body is validated with the CONNECTION-ONLY schema (host/port/
 *    security/username/password) — sender identity fields can never make a
 *    connection test fail validation anymore (the #1 "flaky test" cause).
 *  • A single automatic retry on transient network errors (ETIMEDOUT /
 *    ECONNRESET / greeting timeouts) — one bad socket no longer reports
 *    failure while the credentials are actually fine.
 * When the body password is absent/empty/masked, the STORED (decrypted
 * server-side) password is used instead — the stored secret never goes to
 * the browser.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  if (!rateLimit(`smtptest:${admin.id}`, 5, 60_000).ok) return fail("تلاش‌های زیاد", 429);

  const saved = await resolveSmtpConfig();

  let body: Record<string, unknown> | null = null;
  try {
    const text = await req.text();
    body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    body = null;
  }

  // No body → test the saved settings.
  if (!body || Object.keys(body).length === 0) {
    const result = await smtpTestConnection(saved);
    return ok(result);
  }

  const parsed = smtpConnectionTestSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const password =
    d.password !== undefined && d.password !== "" && !/•/.test(d.password)
      ? d.password // freshly typed value (never returned anywhere)
      : saved.password; // stored value, decrypted server-side only

  const cfg = {
    enabled: true,
    host: d.host ?? saved.host,
    port: d.port ?? saved.port,
    security: (d.security ?? saved.security) as SmtpSecurity,
    username: d.username ?? saved.username,
    password,
    fromName: saved.fromName,
    fromEmail: saved.fromEmail,
    replyTo: saved.replyTo,
  };

  if (!cfg.host || !cfg.port) return fail("Host و Port را وارد کنید", 400);
  if (cfg.password === null && cfg.username) {
    return fail("رمز عبور SMTP را وارد کنید (رمز ذخیره‌شده‌ای وجود ندارد)", 400);
  }

  // one retry on transient socket errors — deterministic for real misconfigs
  let result = await smtpTestConnection(cfg);
  if (!result.success) {
    result = await smtpTestConnection(cfg);
  }
  return ok(result);
}

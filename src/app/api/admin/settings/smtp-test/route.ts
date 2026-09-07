import { ok, fail } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { smtpSettingsSchema } from "@/lib/validators";
import { resolveSmtpConfig, smtpTestConnection, type SmtpSecurity } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";

/**
 * تست اتصال SMTP — opens a REAL connection and authenticates.
 *
 * Accepts an optional JSON body with the values currently in the admin form
 * (test before saving). When the body password is absent/empty/masked, the
 * STORED (decrypted server-side) password is used instead — the stored secret
 * is never sent to the browser (§6/§7).
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

  // Validate only the fields the form is allowed to override.
  const parsed = smtpSettingsSchema.partial().safeParse(body);
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
    fromName: d.fromName ?? saved.fromName,
    fromEmail: d.fromEmail ?? saved.fromEmail,
    replyTo: d.replyTo ?? saved.replyTo,
  };

  if (!cfg.host || !cfg.port) return fail("Host و Port را وارد کنید", 400);
  if (cfg.password === null && cfg.username) {
    return fail("رمز عبور SMTP را وارد کنید (رمز ذخیره‌شده‌ای وجود ندارد)", 400);
  }

  const result = await smtpTestConnection(cfg);
  return ok(result);
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { smtpSettingsSchema } from "@/lib/validators";
import { getSmtpSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";
import { encryptSecret } from "@/lib/crypto-secret";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Admin Panel → تنظیمات → ایمیل و SMTP
 *
 * GET  → settings WITHOUT the password (only hasPassword flag)
 * PUT  → save settings; new password is stored AES-256-GCM encrypted at rest.
 *        An empty/absent/•-masked password value keeps the stored one.
 */

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const s = await getSmtpSettings();
  return ok({
    settings: {
      enabled: s.enabled,
      host: s.host,
      port: s.port,
      security: s.security,
      username: s.username,
      fromName: s.fromName,
      fromEmail: s.fromEmail,
      replyTo: s.replyTo,
      // NEVER send the password (not even masked) to any client (§6)
      hasPassword: !!s.password,
      // v27.1: last-save timestamp so the admin SEES that the save persisted
      updatedAt: s.updatedAt?.toISOString() ?? null,
    },
  });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  if (!rateLimit(`smtp-put:${admin.id}`, 10, 60_000).ok) return fail("تلاش‌های زیاد", 429);

  const body = await req.json().catch(() => null);
  const parsed = smtpSettingsSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const data: Record<string, unknown> = {
    enabled: d.enabled,
    host: d.host,
    port: d.port,
    security: d.security,
    username: d.username,
    fromName: d.fromName,
    fromEmail: d.fromEmail,
    replyTo: d.replyTo === "" ? null : d.replyTo,
  };
  // Strip undefined keys — only fields actually sent are updated.
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

  // Password semantics (§6): undefined / "" / masked placeholder → keep stored value.
  const current = await getSmtpSettings();
  if (d.password !== undefined && d.password !== "" && !/•/.test(d.password)) {
    data.password = encryptSecret(d.password); // encrypted at rest
  }

  await db.smtpSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...data },
    update: data,
  });
  invalidateSettingsCache();

  await logAdmin(admin.id, "SETTINGS_SMTP_UPDATE", {
    entity: "SmtpSettings",
    metadata: {
      host: d.host ?? current.host,
      port: d.port ?? current.port,
      security: d.security ?? current.security,
      enabled: d.enabled ?? current.enabled,
    },
    ip: getClientIp(req),
  });

  return ok({ message: "تنظیمات ایمیل ذخیره شد" });
}

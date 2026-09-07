import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { paymentSettingsSchema } from "@/lib/validators";
import { getPaymentSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const settings = await getPaymentSettings();
  return ok({ settings });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = paymentSettingsSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  await db.paymentSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...parsed.data },
    update: parsed.data,
  });
  invalidateSettingsCache();
  await logAdmin(admin.id, "SETTINGS_PAYMENT_UPDATE", { entity: "PaymentSettings", ip: getClientIp(req) });
  return ok({ message: "تنظیمات درگاه‌های پرداخت ذخیره شد" });
}

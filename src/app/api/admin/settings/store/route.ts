import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { storeSettingsSchema } from "@/lib/validators";
import { getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const settings = await getStoreSettings();
  return ok({ settings });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = storeSettingsSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  // v20: the ticker marquee message list travels as a JSON array over the
  // wire but the column is a JSON string — serialize (empty list = null so
  // the storefront falls back to the single announcement message).
  const { tickerMessages, maintenanceContent, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  data.tickerMessages =
    Array.isArray(tickerMessages) && tickerMessages.length > 0
      ? JSON.stringify(tickerMessages)
      : null;

  /* v29: the repair-page content object also travels as a parsed object —
   * serialize it into the maintenanceContent JSON column. An empty object
   * (every key empty/null) = null → all designed defaults render. Null /
   * raw-string values (tabs seeded straight from the GET row) are parsed
   * first so the round-trip never breaks. */
  if (maintenanceContent !== undefined) {
    let obj: unknown = maintenanceContent;
    if (typeof obj === "string") {
      try {
        obj = obj.trim() ? JSON.parse(obj) : null;
      } catch {
        obj = null;
      }
    }
    const cleaned: Record<string, string> = {};
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
      }
    }
    data.maintenanceContent = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
  }

  await db.storeSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...data },
    update: data,
  });
  invalidateSettingsCache();
  await logAdmin(admin.id, "SETTINGS_STORE_UPDATE", { entity: "StoreSettings", ip: getClientIp(req) });
  return ok({ message: "تنظیمات فروشگاه ذخیره شد" });
}

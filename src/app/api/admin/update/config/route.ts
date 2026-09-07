import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, type Role } from "@/lib/auth";
import { getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";
import { DEFAULT_MANIFEST_URL, resolveManifestSetting } from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — current manifest URL config (any admin role). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  try {
    const { raw, source } = await resolveManifestSetting();
    const store = await getStoreSettings();
    return ok(
      {
        manifestUrl: store.updateManifestUrl ?? null,
        effectiveUrl: raw,
        source, // "store" | "env" | "default"
        defaultManifestUrl: DEFAULT_MANIFEST_URL,
      },
      200,
      { noStore: true }
    );
  } catch {
    return fail("خواندن تنظیمات مانیفست ناموفق بود", 500);
  }
}

/** PUT — save/clear StoreSettings.updateManifestUrl (SUPER_ADMIN / ADMIN). */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as Role)) return fail("دسترسی لازم را ندارید", 403);

  const body = (await req.json().catch(() => null)) as { manifestUrl?: unknown } | null;
  if (!body || !("manifestUrl" in body)) {
    return fail("بدنهٔ درخواست نامعتبر است — { manifestUrl } لازم است", 400);
  }
  const raw = body.manifestUrl;
  let value: string | null = null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      if (trimmed.length > 500) {
        return fail("آدرس مانیفست بیش از حد طولانی است (حداکثر ۵۰۰ نویسه)", 400);
      }
      if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        return fail("آدرس مانیفست باید یک URL کامل http یا https باشد — برای بازگشت به پیش‌فرض، خالی بگذارید", 400);
      }
      value = trimmed;
    }
  } else if (raw !== null) {
    return fail("مقدار manifestUrl باید رشته یا null باشد", 400);
  }

  try {
    await db.storeSettings.upsert({
      where: { id: "main" },
      create: { id: "main", updateManifestUrl: value },
      update: { updateManifestUrl: value },
    });
  } catch {
    return fail("ذخیرهٔ تنظیمات ناموفق بود", 500);
  }
  invalidateSettingsCache();
  await logAdmin(admin.id, "UPDATE_CONFIG_SET", {
    entity: "StoreSettings",
    metadata: { manifestUrl: value ?? "(پیش‌فرض)" },
    ip: getClientIp(req),
  });
  return ok({
    message: value ? "آدرس مانیفست به‌روزرسانی ذخیره شد" : "آدرس مانیفست پاک شد و به پیش‌فرض بازگشت",
    manifestUrl: value,
  });
}

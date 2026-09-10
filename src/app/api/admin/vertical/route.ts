import { revalidatePath } from "next/cache";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { verticalApplySchema } from "@/lib/validators";
import { getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { getVerticalDef, getVerticalSummaries } from "@/lib/verticals";
import { applyVerticalCatalog } from "@/lib/verticals/apply";
import { logAdmin } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * v35 · GET /api/admin/vertical — current store vertical + the five vertical
 * summaries (counts come from the catalog DATA, no DB reads) for the admin
 * picker (Admin → ظاهر → «صنف فروشگاه»). Readable by any logged-in admin.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const settings = await getStoreSettings();
  const current = getVerticalDef(settings.activeVertical).id;
  return ok(
    {
      current,
      currentTemplate: settings.activeTemplate,
      verticals: getVerticalSummaries(),
    },
    200,
    { noStore: true }
  );
}

/**
 * v35 · PUT /api/admin/vertical — apply a store vertical («صنف فروشگاه»).
 * Body: { verticalId, renameStore? }. One interactive transaction archives the
 * previous catalog (products are NEVER deleted — order history survives),
 * re-seeds the vertical's real categories/brands/products (idempotent upserts
 * by slug/sku) and switches StoreSettings.activeVertical + the vertical's
 * flagship activeTemplate. `renameStore: true` also adopts the vertical's
 * suggested store names. Re-applying the CURRENT vertical is allowed — it
 * just re-seeds the same rows (idempotent).
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = verticalApplySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const verticalId = parsed.data.verticalId;
  const def = getVerticalDef(verticalId);
  await getStoreSettings(); // guarantees the "main" row exists (cached read)

  let counts: { products: number; categories: number; brands: number };
  try {
    counts = await applyVerticalCatalog(verticalId, {
      renameStore: parsed.data.renameStore ?? false,
    });
  } catch (e) {
    console.error("[admin/vertical] apply failed:", String(e).slice(0, 300));
    return fail("اعمال صنف فروشگاه با خطا مواجه شد؛ چیزی تغییر نکرد", 500);
  }

  invalidateSettingsCache();
  // layout-level revalidation — the storefront (homepage + every inner page's
  // shared template chrome) picks up the new catalog + template immediately.
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  await logAdmin(admin.id, "VERTICAL_APPLY", {
    entity: "StoreSettings",
    entityId: verticalId,
    metadata: {
      ...counts,
      renameStore: parsed.data.renameStore ?? false,
      templateId: def.templateId,
    },
    ip: getClientIp(req),
  });
  return ok({
    message: `صنف «${def.nameFa}» اعمال شد — کاتالوگ، قالب و هوش مصنوعی به‌روزرسانی شد`,
    ...counts,
  });
}

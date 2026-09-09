import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { templateApplySchema } from "@/lib/validators";
import { getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

/**
 * PUT /api/admin/templates/active — apply a storefront template.
 *
 * Spec §22: this route ONLY touches StoreSettings.activeTemplate — it must
 * NEVER modify products, stories, sliders, showcases or CMS content.
 * Templates are pure presentation layers over the same data.
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = templateApplySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const templateId = parsed.data.templateId;
  await getStoreSettings(); // guarantees the "main" row exists (cached read)
  await db.storeSettings.update({
    where: { id: "main" },
    data: { activeTemplate: templateId },
  });
  invalidateSettingsCache();
  // v28: layout-level revalidation — clears the cached route tree for the
  // storefront (homepage AND every inner page's shared template chrome), so
  // the new template is live on the next request without extra refreshes.
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  await logAdmin(admin.id, "TEMPLATE_APPLY", {
    entity: "StoreSettings",
    entityId: templateId,
    ip: getClientIp(req),
  });
  return ok({ message: "قالب فروشگاه اعمال شد" });
}

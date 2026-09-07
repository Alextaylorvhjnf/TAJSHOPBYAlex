import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { suggestProductCompletion } from "@/lib/ai";
import { logAdmin } from "@/lib/admin-log";

/**
 * v27b: «تکمیل مشخصات محصول با هوش مصنوعی» — the admin types the product
 * NAME and clicks one button; the AI fills every field it RELIABLY knows
 * (descriptions, specs, tags, SEO, suggested brand/category, variant
 * attribute rows). Golden rules enforced in the prompt AND here:
 *  - unknown product → { found: false } (NO fabricated data)
 *  - no prices / stock / images are ever returned (admin-owned)
 *  - the product name is never changed
 *  - suggested brand/category come from the store's REAL lists
 * Provider keys are read SERVER-SIDE only (settings) — never exposed.
 */
const bodySchema = z.object({
  name: z.string().trim().min(2).max(200),
});

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("نام محصول حداقل ۲ کاراکتر لازم است", 400);
  const { name } = parsed.data;

  // real store lists so the model can only suggest what actually exists
  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { name: true }, take: 40 }),
    db.brand.findMany({ where: { isActive: true }, select: { name: true }, take: 60 }),
  ]);

  try {
    const result = await suggestProductCompletion({
      name,
      categoryNames: categories.map((c) => c.name),
      brandNames: brands.map((b) => b.name),
    });
    await logAdmin(admin.id, "AI_PRODUCT_COMPLETE", {
      entity: "Product",
      ip: getClientIp(req),
      metadata: {
        name,
        found: result.found,
        fields: result.found
          ? [
              result.shortDescription && "shortDescription",
              result.description && "description",
              (result.specifications?.length ?? 0) > 0 && `specs:${result.specifications?.length}`,
              (result.tags?.length ?? 0) > 0 && `tags:${result.tags?.length}`,
              result.suggestedBrand && `brand:${result.suggestedBrand}`,
              result.suggestedCategory && `category:${result.suggestedCategory}`,
              (result.variants?.length ?? 0) > 0 && `variants:${result.variants?.length}`,
            ].filter(Boolean)
          : [],
      },
    });
    return ok({ completion: result });
  } catch (e) {
    return fail(
      `تکمیل مشخصات ناموفق بود: ${e instanceof Error ? e.message : String(e).slice(0, 160)}`,
      502
    );
  }
}

import { z } from "zod";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { suggestProductSeo } from "@/lib/ai";
import { logAdmin } from "@/lib/admin-log";

/**
 * v28: «تکمیل سئو با هوش مصنوعی» — fills the SEO card (title / meta
 * description / keywords) of the admin product form from the product's REAL
 * data (name, brand, category, short description). Strict no-fabrication:
 * the prompt only uses the provided fields. Provider runs SERVER-SIDE
 * (GapGPT key from settings — never exposed to the browser).
 */
const bodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  brandName: z.string().trim().max(120).optional(),
  categoryName: z.string().trim().max(120).optional(),
  shortDescription: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("نام محصول حداقل ۲ کاراکتر لازم است", 400);
  const d = parsed.data;

  try {
    const seo = await suggestProductSeo({
      name: d.name,
      brandName: d.brandName || undefined,
      categoryName: d.categoryName || undefined,
      shortDescription: d.shortDescription || undefined,
    });
    await logAdmin(admin.id, "AI_PRODUCT_SEO", {
      entity: "Product",
      ip: getClientIp(req),
      metadata: { name: d.name, fields: [seo.seoTitle && "seoTitle", seo.seoDescription && "seoDescription", seo.seoKeywords && "seoKeywords"].filter(Boolean) },
    });
    return ok({ seo });
  } catch (e) {
    return fail(
      `تکمیل سئو ناموفق بود: ${e instanceof Error ? e.message : String(e).slice(0, 160)}`,
      502
    );
  }
}

import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { rebuildAllSearchText } from "@/lib/product";
import { logAdmin } from "@/lib/admin-log";

/**
 * v19 — Admin "اسکن و ایندکس محصولات" (AI widget knowledge scan).
 * Pushing this button walks the WHOLE catalog and rebuilds every product's
 * searchText (name, sku, slug, category, brand, tags, spec values, colors,
 * variants). After the scan the AI shopping assistant is ready for any
 * product question — brand, model, color, capacity, price windows …
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  try {
    const result = await rebuildAllSearchText();
    await logAdmin(admin.id, "AI_PRODUCT_INDEX_SCAN", {
      entity: "Product",
      metadata: { products: result.products, brands: result.brands, categories: result.categories },
      ip: getClientIp(req),
    } as never);
    return ok({
      message: `اسکن کامل شد — ${result.products.toLocaleString("fa-IR")} محصول، ${result.brands.toLocaleString("fa-IR")} برند و ${result.categories.toLocaleString("fa-IR")} دسته‌بندی ایندکس شدند. دستیار هوشمند آماده پاسخ‌گویی است.`,
      ...result,
    });
  } catch (e) {
    console.error("[AI REINDEX]", e);
    return fail("خطا در اسکن محصولات: " + String(e).slice(0, 200), 500);
  }
}

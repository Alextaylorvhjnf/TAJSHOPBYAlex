import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { suggestProductSpecs } from "@/lib/ai";
import { logAdmin } from "@/lib/admin-log";

/**
 * v26fix (task 7): «پیشنهاد هوشمند مشخصات» — the admin product form asks the
 * backend for specification rows that fit the product's REAL category (and
 * name). The AI provider (GapGPT with builtin fallback) runs SERVER-SIDE
 * with the keys stored in the admin settings — an API key never reaches the
 * browser. When every AI engine is unavailable the category's saved spec
 * template (managed in دسته‌بندی‌ها) is returned as a fallback so the button
 * is always useful, even on a fresh offline install.
 */
const bodySchema = z.object({
  categoryId: z.string().min(1),
  productName: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);
  const { categoryId, productName } = parsed.data;

  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: { parent: { select: { name: true } } },
  });
  if (!category) return fail("دسته‌بندی پیدا نشد", 404);

  // full context name (child + parent) helps the model pick the right specs
  const categoryName = category.parent ? `${category.name} (${category.parent.name})` : category.name;

  // 1) the configured AI chain (throws Persian errors on failure)
  try {
    const rows = await suggestProductSpecs({ categoryName, productName });
    await logAdmin(admin.id, "AI_SUGGEST_SPECS", {
      entity: "Category",
      entityId: categoryId,
      ip: getClientIp(req),
      metadata: { source: "ai", count: rows.length, provider: "chain" },
    });
    return ok({ rows, source: "ai" });
  } catch (e) {
    // fall through to the category template below
    console.warn("[suggest-specs] AI chain failed:", String(e));
  }

  // 2) fallback: the category's saved spec template (admin-managed in دسته‌بندی‌ها)
  if (category.specTemplate) {
    try {
      const template = JSON.parse(category.specTemplate) as { key?: unknown; label?: unknown }[];
      const rows = Array.isArray(template)
        ? template
            .filter((t) => t && typeof t.key === "string" && (t.key as string).trim() && typeof t.label === "string")
            .map((t) => ({ key: String(t.key).trim(), label: String(t.label).trim() }))
        : [];
      if (rows.length > 0) {
        await logAdmin(admin.id, "AI_SUGGEST_SPECS", {
          entity: "Category",
          entityId: categoryId,
          ip: getClientIp(req),
          metadata: { source: "template", count: rows.length },
        });
        return ok({
          rows,
          source: "template",
          note: "موتور هوش مصنوعی در دسترس نبود — قالب مشخصات دسته‌بندی پیشنهاد شد",
        });
      }
    } catch {
      /* invalid template JSON → fall through */
    }
  }

  return fail(
    "هیچ موتور هوش مصنوعی پاسخ نداد و برای این دسته‌بندی هم قالب مشخصاتی ذخیره نشده است — در بخش «دسته‌بندی‌ها» برای این دسته قالب مشخصات تعریف کنید یا کلید هوش مصنوعی را در تنظیمات بررسی کنید.",
    502
  );
}

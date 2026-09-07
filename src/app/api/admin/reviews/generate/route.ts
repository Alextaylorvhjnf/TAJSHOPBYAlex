import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { generateAndStoreAiReviews } from "@/lib/ai-reviews";
import { db } from "@/lib/db";
import { logAdmin } from "@/lib/admin-log";

/**
 * v23 — AI comment generator endpoint (Admin → دیدگاه‌ها → تولید با هوش مصنوعی).
 * v24 — TWO modes:
 *   Body: { productId: string, count?: 1..5, replierName?: string }
 *     → single-product generation (unchanged v23 behavior)
 *   Body: { productIds: string[], count?: 1..5, replierName?: string }
 *     → BATCH mode: loops up to 8 products per call, never aborting the whole
 *       batch on a single product failure. The admin UI drives the live
 *       progress («۴۵ از ۶۰») by calling this repeatedly.
 * The engine writes with the GapGPT key (builtin fallback
 * fallback) and flags every comment with source=AI.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "reviews")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const count = Number(body?.count ?? 3);
  const replierName = typeof body?.replierName === "string" ? body.replierName.slice(0, 60) : null;
  if (!Number.isFinite(count) || count < 1 || count > 5) return fail("تعداد باید بین ۱ تا ۵ باشد", 400);

  const productId = typeof body?.productId === "string" ? body.productId : "";
  const productIdsRaw = Array.isArray(body?.productIds) ? body.productIds : [];
  const productIds = productIdsRaw
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    .slice(0, 8);

  if (!productId && productIds.length === 0) {
    return fail("شناسه محصول الزامی است", 400);
  }

  /* ── single-product mode (v23 behavior, plus the provider field) ── */
  if (productId && productIds.length === 0) {
    try {
      const result = await generateAndStoreAiReviews({ productId, count, adminId: admin.id, replierName });
      await logAdmin(admin.id, "AI_REVIEWS_GENERATED", {
        entity: "Product",
        entityId: productId,
        ip: getClientIp(req),
        metadata: { created: result.created, replier: result.replierName, provider: result.provider, vision: result.vision?.audience ?? "none" },
      });
      return ok(result);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "تولید دیدگاه ناموفق بود", 500);
    }
  }

  /* ── batch mode (v24): the "comment on all products" engine ── */
  const results: {
    productId: string;
    name: string;
    ok: boolean;
    created: number;
    provider?: string;
    error?: string;
  }[] = [];

  // resolve names once for the report
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  let providerUsed: string | null = null;
  let totalCreated = 0;

  for (const pid of productIds) {
    const name = nameById.get(pid) ?? "—";
    try {
      const result = await generateAndStoreAiReviews({ productId: pid, count, adminId: admin.id, replierName });
      providerUsed = providerUsed ?? result.provider;
      totalCreated += result.created;
      results.push({ productId: pid, name, ok: true, created: result.created, provider: result.provider });
    } catch (e) {
      results.push({ productId: pid, name, ok: false, created: 0, error: e instanceof Error ? e.message : "ناموفق" });
    }
  }

  // live totals after this batch — powers the «۴۵ از ۶۰» progress readout
  const [total, aiReviews] = await Promise.all([
    db.product.count(),
    db.review.findMany({
      where: { OR: [{ source: "AI" }, { user: { email: { endsWith: "@customers.taj.ai" } } }] },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  await logAdmin(admin.id, "AI_REVIEWS_BULK", {
    entity: "Product",
    ip: getClientIp(req),
    metadata: {
      batch: productIds.length,
      created: totalCreated,
      failed: results.filter((r) => !r.ok).length,
      provider: providerUsed ?? "none",
    },
  });

  return ok({
    results,
    provider: providerUsed,
    created: totalCreated,
    totals: { total, commented: aiReviews.length },
  });
}

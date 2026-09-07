import { ok, fail } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings } from "@/lib/settings";

/**
 * v24 — AI COMMENT STUDIO status endpoint (Admin → دیدگاه‌ها → استودیو نظرات AI).
 * GET /api/admin/reviews/ai-status
 *
 * Auto-detects which products already have AI comments (source=AI flag, plus
 * the legacy v23 synthetic-customer email pattern) and which are pending —
 * so newly inserted products show up automatically. Powers the progress
 * readout «برای ۴۵ محصول از ۶۰ دیدگاه نوشته‌ام».
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "reviews")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const [total, aiReviews, aiSettings, recent] = await Promise.all([
    db.product.count(),
    db.review.findMany({
      where: { OR: [{ source: "AI" }, { user: { email: { endsWith: "@customers.taj.ai" } } }] },
      select: { productId: true },
      distinct: ["productId"],
    }),
    getAISettings(),
    // last few AI comments (studio activity feed)
    db.review.findMany({
      where: { source: "AI" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { firstName: true } },
      },
    }),
  ]);

  const commentedIds = new Set(aiReviews.map((r) => r.productId));
  const commented = commentedIds.size;
  const pendingCount = Math.max(0, total - commented);

  // pending products — newest inserted LAST so old catalog entries are
  // commented first and freshly inserted products join the queue automatically
  const pendingProducts = await db.product.findMany({
    where: { id: { notIn: [...commentedIds] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, mainImage: true },
    take: 200,
  });

  return ok({
    total,
    commented,
    pendingCount,
    pendingProducts,
    recentComments: recent.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment.slice(0, 140),
      createdAt: r.createdAt.toISOString(),
      productName: r.product?.name ?? "—",
      productSlug: r.product?.slug ?? null,
      author: r.user?.firstName ?? "—",
    })),
    providers: {
      enabled: aiSettings.enabled,
      provider: aiSettings.provider,
      gapConfigured: !!(aiSettings.gapApiKey ?? "").trim(),
    },
  });
}

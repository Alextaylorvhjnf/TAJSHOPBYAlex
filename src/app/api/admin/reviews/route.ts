import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { refreshProductRating } from "@/lib/product";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "reviews")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 15 });
  const status = url.searchParams.get("status") ?? "";

  const where = status ? { status } : {};
  const [total, reviews] = await Promise.all([
    db.review.count({ where: where as never }),
    db.review.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        product: { select: { name: true, slug: true, mainImage: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return ok({ reviews, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

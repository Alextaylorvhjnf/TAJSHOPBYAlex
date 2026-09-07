import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { serializeProduct, productInclude } from "@/lib/product";
import { searchTerms } from "@/lib/search";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { reviewSchema } from "@/lib/validators";
import { refreshProductRating } from "@/lib/product";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const product = await db.product.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: "PUBLISHED" },
    include: {
      ...productInclude,
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!product) return fail("محصول موردنظر پیدا نشد", 404, "PRODUCT_NOT_FOUND");

  await db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);

  const dto = serializeProduct(product);
  const reviews = product.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    date: r.createdAt,
    author: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || "کاربر تاج",
  }));

  return ok({
    product: { ...dto, reviews },
    related: [],
  });
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const user = await getAuthUser();
  if (!user) return fail("برای ثبت دیدگاه ابتدا وارد حساب خود شوید", 401);

  const ip = getClientIp(req);
  if (!rateLimit(`review:${user.id}:${ip}`, 3, 60_000 * 10).ok) {
    return fail("دیدگاه‌های زیادی ثبت کردید. کمی بعد تلاش کنید.", 429);
  }

  const product = await db.product.findFirst({ where: { OR: [{ slug }, { id: slug }] } });
  if (!product) return fail("محصول پیدا نشد", 404);

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse({ ...body, productId: product.id });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const existing = await db.review.findUnique({
    where: { productId_userId: { productId: product.id, userId: user.id } },
  });
  if (existing) return fail("شما قبلاً برای این محصول دیدگاه ثبت کرده‌اید", 409);

  await db.review.create({
    data: {
      productId: product.id,
      userId: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      comment: parsed.data.comment,
      status: "PENDING",
    },
  });

  return ok({ message: "دیدگاه شما ثبت شد و پس از تأیید نمایش داده می‌شود" });
}

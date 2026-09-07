import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { productInclude, serializeProduct, refreshSearchText, refreshProductRating } from "@/lib/product";
import { logAdmin } from "@/lib/admin-log";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);

  const product = await db.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      ...productInclude,
      reviews: { orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true } } } },
      _count: { select: { orderItems: true, wishlistItems: true } },
    },
  });
  if (!product) return fail("محصول پیدا نشد", 404);

  const dto = serializeProduct(product);
  return ok({
    product: {
      ...dto,
      reviews: product.reviews,
      orderCount: product._count.orderItems,
      wishlistCount: product._count.wishlistItems,
      viewCount: product.viewCount,
    },
  });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return fail("محصول پیدا نشد", 404);

  const dupe = await db.product.findFirst({
    where: { AND: [{ OR: [{ slug: d.slug }, { sku: d.sku }] }, { NOT: { id } }] },
  });
  if (dupe) return fail("slug یا SKU تکراری است", 409);

  await db.product.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.slug !== undefined ? { slug: d.slug } : {}),
      ...(d.sku !== undefined ? { sku: d.sku } : {}),
      ...(d.shortDescription !== undefined ? { shortDescription: d.shortDescription } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.price !== undefined ? { price: d.price } : {}),
      ...(d.discountPrice !== undefined ? { discountPrice: d.discountPrice } : {}),
      // v23: flash-sale deadline (string → Date; null = always-on discount)
      ...(d.discountEndsAt !== undefined ? { discountEndsAt: d.discountEndsAt ? new Date(d.discountEndsAt) : null } : {}),
      ...(d.stock !== undefined ? { stock: d.stock } : {}),
      ...(d.minStock !== undefined ? { minStock: d.minStock } : {}),
      ...(d.categoryId ? { categoryId: d.categoryId } : {}),
      ...(d.brandId ? { brandId: d.brandId } : {}),
      ...(d.colors !== undefined ? { colors: d.colors?.length ? JSON.stringify(d.colors) : null } : {}),
      ...(d.variants !== undefined ? { variants: d.variants?.length ? JSON.stringify(d.variants) : null } : {}),
      // v20: product type + combination matrix (written only when the form sent them;
      // empty combinations array → null so legacy color/delta rules take over)
      ...(d.productType ? { productType: d.productType } : {}),
      ...(d.combinations !== undefined ? { combinations: d.combinations?.length ? JSON.stringify(d.combinations) : null } : {}),
      ...(d.specifications !== undefined ? { specifications: d.specifications?.length ? JSON.stringify(d.specifications) : null } : {}),
      ...(d.tags !== undefined ? { tags: d.tags?.length ? JSON.stringify(d.tags) : null } : {}),
      ...(d.status ? { status: d.status } : {}),
      ...(d.featured !== undefined ? { featured: d.featured } : {}),
      ...(d.isSpecial !== undefined ? { isSpecial: d.isSpecial } : {}),
      ...(d.mainImage !== undefined ? { mainImage: d.mainImage } : {}),
      ...(d.seoTitle !== undefined ? { seoTitle: d.seoTitle } : {}),
      ...(d.seoDescription !== undefined ? { seoDescription: d.seoDescription } : {}),
      ...(d.seoKeywords !== undefined ? { seoKeywords: d.seoKeywords } : {}),
    },
  });

  if (d.images) {
    await db.productImage.deleteMany({ where: { productId: id } });
    if (d.images.length) {
      await db.productImage.createMany({
        data: d.images.map((img, idx) => ({ productId: id, url: img.url, alt: img.alt ?? d.name ?? "", sortOrder: idx })),
      });
    }
    if (!d.mainImage && d.images[0]) {
      await db.product.update({ where: { id }, data: { mainImage: d.images[0].url } });
    }
  }

  await refreshSearchText(id);
  await logAdmin(admin.id, "PRODUCT_UPDATE", { entity: "Product", entityId: id, metadata: { fields: Object.keys(d) }, ip: getClientIp(req) });
  return ok({ message: "محصول به‌روزرسانی شد" });
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  stock: z.number().int().min(0).optional(),
  price: z.number().int().positive().optional(),
  discountPrice: z.number().int().positive().nullable().optional(),
  discountEndsAt: z.string().datetime().nullable().optional(),
  featured: z.boolean().optional(),
  isSpecial: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);
  const { discountEndsAt, ...rest } = parsed.data;
  await db.product.update({
    where: { id },
    data: { ...rest, ...(discountEndsAt !== undefined ? { discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : null } : {}) },
  });
  await refreshSearchText(id);
  await logAdmin(admin.id, "PRODUCT_QUICK_UPDATE", { entity: "Product", entityId: id, metadata: parsed.data, ip: getClientIp(req) });
  return ok({ message: "به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const existing = await db.product.findUnique({ where: { id }, include: { orderItems: { take: 1 } } });
  if (!existing) return fail("محصول پیدا نشد", 404);
  if (existing.orderItems.length > 0) {
    // product referenced by orders — archive instead of hard delete
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await logAdmin(admin.id, "PRODUCT_ARCHIVE", { entity: "Product", entityId: id, ip: getClientIp(req) });
    return ok({ message: "این محصول در سفارش‌ها استفاده شده و به حالت آرشیو رفت" });
  }
  await db.product.delete({ where: { id } });
  await logAdmin(admin.id, "PRODUCT_DELETE", { entity: "Product", entityId: id, metadata: { name: existing.name }, ip: getClientIp(req) });
  return ok({ message: "محصول حذف شد" });
}

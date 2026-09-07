import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { refreshSearchText } from "@/lib/product";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const product = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) return fail("محصول پیدا نشد", 404);

  const slug = `${product.slug}-copy-${Date.now().toString(36).slice(-4)}`;
  const sku = `${product.sku}-C${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const copy = await db.product.create({
    data: {
      name: `${product.name} (کپی)`,
      slug,
      sku,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      minStock: product.minStock,
      colors: product.colors,
      variants: product.variants,
      // v20: keep the product type + combination price matrix on the copy
      productType: product.productType,
      combinations: product.combinations,
      specifications: product.specifications,
      tags: product.tags,
      searchText: product.searchText,
      mainImage: product.mainImage,
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: "DRAFT",
      featured: false,
      isSpecial: false,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      seoKeywords: product.seoKeywords,
      images: { create: product.images.map((i) => ({ url: i.url, alt: i.alt ?? "", sortOrder: i.sortOrder })) },
    },
  });
  // v22: keep the AI index auto-fresh — the clone's name/slug differ from
  // the original, so rebuild its searchText immediately (auto-indexing).
  await refreshSearchText(copy.id);
  await logAdmin(admin.id, "PRODUCT_DUPLICATE", { entity: "Product", entityId: copy.id, metadata: { from: id }, ip: getClientIp(req) });
  return ok({ id: copy.id, message: "کپی محصول با وضعیت پیش‌نویس ایجاد شد" }, 201);
}

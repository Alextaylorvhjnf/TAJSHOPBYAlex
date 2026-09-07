import { db } from "@/lib/db";
import { ok, fail, parsePagination, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { productInclude, serializeProduct, refreshSearchText } from "@/lib/product";
import { logAdmin } from "@/lib/admin-log";
import { searchTerms } from "@/lib/search";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 15 });
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const categoryId = url.searchParams.get("categoryId") ?? "";
  const lowStock = url.searchParams.get("lowStock") === "1";

  const filters: Record<string, unknown>[] = [];
  if (q) for (const t of searchTerms(q)) filters.push({ OR: [{ name: { contains: t } }, { sku: { contains: t } }, { searchText: { contains: t } }] });
  if (status) filters.push({ status });
  if (categoryId) filters.push({ categoryId });
  if (lowStock) filters.push({ stock: { lte: 5 } });

  const where = filters.length ? { AND: filters as never[] } : {};

  const [total, products] = await Promise.all([
    db.product.count({ where: where as never }),
    db.product.findMany({
      where: where as never,
      include: productInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return ok({ items: products.map(serializeProduct), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "products")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const dupe = await db.product.findFirst({ where: { OR: [{ slug: d.slug }, { sku: d.sku }] } });
  if (dupe) return fail("slug یا SKU تکراری است", 409);

  const product = await db.product.create({
    data: {
      name: d.name,
      slug: d.slug,
      sku: d.sku,
      shortDescription: d.shortDescription ?? null,
      description: d.description ?? null,
      price: d.price,
      discountPrice: d.discountPrice ?? null,
      // v23: flash-sale deadline (null = always-on discount)
      discountEndsAt: d.discountEndsAt ? new Date(d.discountEndsAt) : null,
      stock: d.stock,
      minStock: d.minStock,
      categoryId: d.categoryId,
      brandId: d.brandId,
      colors: d.colors?.length ? JSON.stringify(d.colors) : null,
      variants: d.variants?.length ? JSON.stringify(d.variants) : null,
      // v20: SIMPLE | VARIABLE + per color×spec combination price matrix
      // (validator normalizes productType; empty combinations → null = legacy rules)
      productType: d.productType,
      combinations: d.combinations?.length ? JSON.stringify(d.combinations) : null,
      specifications: d.specifications?.length ? JSON.stringify(d.specifications) : null,
      tags: d.tags?.length ? JSON.stringify(d.tags) : null,
      mainImage: d.mainImage ?? d.images?.[0]?.url ?? null,
      status: d.status,
      featured: d.featured,
      isSpecial: d.isSpecial,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      seoKeywords: d.seoKeywords ?? null,
      images: { create: (d.images ?? []).map((img, idx) => ({ url: img.url, alt: img.alt ?? d.name, sortOrder: idx })) },
    },
  });
  await refreshSearchText(product.id);
  await logAdmin(admin.id, "PRODUCT_CREATE", { entity: "Product", entityId: product.id, metadata: { name: d.name }, ip: getClientIp(req) });

  return ok({ product: { id: product.id }, message: "محصول ایجاد شد" }, 201);
}

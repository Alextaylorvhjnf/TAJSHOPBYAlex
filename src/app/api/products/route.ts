import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { serializeProduct, productInclude } from "@/lib/product";
import { searchTerms } from "@/lib/search";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url);

  const q = url.searchParams.get("q") ?? "";
  const ids = url.searchParams.get("ids");
  const categorySlug = url.searchParams.get("category") ?? "";
  const brandSlug = url.searchParams.get("brand") ?? "";
  const min = parseInt(url.searchParams.get("min") ?? "") || 0;
  const max = parseInt(url.searchParams.get("max") ?? "") || 0;
  const inStock = url.searchParams.get("inStock") === "1";
  const onDiscount = url.searchParams.get("discount") === "1";
  const sort = url.searchParams.get("sort") ?? "newest";

  const terms = searchTerms(q);
  const filters: Record<string, unknown>[] = [{ status: "PUBLISHED" }];

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    if (idList.length > 0) {
      const byIds = await db.product.findMany({
        where: { id: { in: idList }, status: "PUBLISHED" },
        include: productInclude,
      });
      return ok({ items: byIds.map(serializeProduct), total: byIds.length, page: 1, limit, pages: 1 });
    }
  }

  if (categorySlug) {
    const cat = await db.category.findUnique({ where: { slug: categorySlug } });
    if (cat) {
      const children = await db.category.findMany({ where: { parentId: cat.id }, select: { id: true } });
      filters.push({ OR: [{ categoryId: cat.id }, ...(children.length ? [{ categoryId: { in: children.map((c) => c.id) } }] : [])] });
    } else {
      filters.push({ categoryId: "__none__" });
    }
  }
  if (brandSlug) {
    const brand = await db.brand.findUnique({ where: { slug: brandSlug } });
    filters.push(brand ? { brandId: brand.id } : { brandId: "__none__" });
  }
  if (inStock) filters.push({ stock: { gt: 0 } });
  // v23: expired flash deals are no longer on sale — exclude them
  if (onDiscount)
    filters.push({ discountPrice: { not: null }, OR: [{ discountEndsAt: null }, { discountEndsAt: { gte: new Date() } }] });
  if (terms.length) {
    for (const t of terms) filters.push({ searchText: { contains: t } });
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  switch (sort) {
    case "cheapest": orderBy = { price: "asc" }; break;
    case "expensive": orderBy = { price: "desc" }; break;
    case "bestselling": orderBy = { soldCount: "desc" }; break;
    case "rating": orderBy = { rating: "desc" }; break;
    case "discount":
      // SQLite: no computed order — fetch and sort in memory below
      orderBy = { createdAt: "desc" };
      break;
  }

  const [total, products] = await Promise.all([
    db.product.count({ where: { AND: filters as never[] } }),
    db.product.findMany({
      where: { AND: filters as never[] },
      include: productInclude,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  let items = products.map(serializeProduct);
  if (sort === "discount") {
    items = items.sort((a, b) => b.discountPercent - a.discountPercent);
  }
  if (min > 0 || max > 0) {
    // effective price filter (discount vs normal) — applied post-query
    items = items.filter((p) => {
      const eff = p.effectivePrice;
      return (!min || eff >= min) && (!max || eff <= max);
    });
  }

  return ok({ items, total: min || max ? items.length : total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

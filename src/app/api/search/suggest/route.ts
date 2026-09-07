import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { searchTerms } from "@/lib/search";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ products: [], categories: [] });

  const terms = searchTerms(q);
  const where = {
    status: "PUBLISHED" as const,
    ...(terms.length
      ? { AND: terms.map((t) => ({ searchText: { contains: t } })) }
      : {}),
  };

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: where as never,
      select: {
        id: true, name: true, slug: true, mainImage: true,
        price: true, discountPrice: true, stock: true,
        brand: { select: { name: true } },
      },
      take: 7,
      orderBy: { soldCount: "desc" },
    }),
    db.category.findMany({
      where: terms.length ? { AND: terms.map((t) => ({ name: { contains: q } })) } : {},
      select: { name: true, slug: true },
      take: 4,
    }),
  ]);

  return ok({
    products: products.map((p) => ({
      id: p.id, name: p.name, slug: p.slug, image: p.mainImage,
      price: p.discountPrice ?? p.price, brand: p.brand.name, inStock: p.stock > 0,
    })),
    categories,
  });
}

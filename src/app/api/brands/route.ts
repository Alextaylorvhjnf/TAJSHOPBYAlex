import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET() {
  const brands = await db.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, logo: true,
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
    },
  });
  return ok({
    brands: brands.map((b) => ({
      id: b.id, name: b.name, slug: b.slug, logo: b.logo,
      productCount: b._count.products,
    })),
  });
}

import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { loadBranchIndex } from "@/lib/templates/home-data";

export async function GET() {
  // v26: branches (child categories + top brands per category) fetched in
  // parallel so the client-side nav fallback shows the same mega data as RSC.
  const [categories, branchIndex] = await Promise.all([
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, name: true, slug: true, icon: true, image: true,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
    loadBranchIndex(),
  ]);
  return ok({
    categories: categories.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, icon: c.icon, image: c.image,
      productCount: c._count.products,
      branches: branchIndex.get(c.id) ?? [],
    })),
  });
}

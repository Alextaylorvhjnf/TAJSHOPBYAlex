import { db } from "@/lib/db";
import { serializeProduct, productInclude } from "@/lib/product";
import { searchTerms } from "@/lib/search";
import { ProductGrid } from "@/components/store/product-rail";
import { SectionHeader } from "@/components/store/section-header";
import { ProductsToolbar } from "@/components/store/products-toolbar";
import { PackageSearch, PackageX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { parsePagination } from "@/lib/api";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = typeof sp.category === "string" ? sp.category : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  // v33 (2-d): Persian titles for the two new rails (پیشنهادهای ویژه /
  // محصولات ویژه و انحصاری); q and category keep winning over them.
  const featuredOnly = sp.featured === "1";
  const specialOnly = sp.special === "1";
  let title = "همه محصولات";
  if (featuredOnly) title = "پیشنهادهای ویژه";
  else if (specialOnly) title = "محصولات ویژه و انحصاری";
  if (cat) {
    const category = await db.category.findUnique({ where: { slug: cat } });
    if (category) title = category.name;
  }
  if (q) title = `جستجو: ${q}`;
  return { title, description: `فروش ${title} با بهترین قیمت در تاج الکترونیکس` };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const categorySlug = typeof sp.category === "string" ? sp.category : "";
  const brandSlug = typeof sp.brand === "string" ? sp.brand : "";
  let sort = typeof sp.sort === "string" ? sp.sort : "newest";
  // v33 (2-d): lenient alias — a shipped template links ?sort=bestseller
  // (typo) which used to silently fall back to newest. Map it onto the
  // canonical "bestselling".
  if (sort === "bestseller") sort = "bestselling";
  const min = parseInt(typeof sp.min === "string" ? sp.min : "") || 0;
  const max = parseInt(typeof sp.max === "string" ? sp.max : "") || 0;
  const inStock = sp.inStock === "1";
  const onDiscount = sp.discount === "1";
  // v33 (2-d): homepage rail filters — ?featured=1 (پیشنهادهای ویژه) and
  // ?special=1 (محصولات ویژه و انحصاری).
  const featuredOnly = sp.featured === "1";
  const specialOnly = sp.special === "1";
  const page = parseInt(typeof sp.page === "string" ? sp.page : "1") || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  const terms = searchTerms(q);
  const filters: Record<string, unknown>[] = [{ status: "PUBLISHED" }];

  let category: { id: string; name: string; slug: string } | null = null;
  if (categorySlug) {
    category = await db.category.findUnique({ where: { slug: categorySlug }, select: { id: true, name: true, slug: true } });
    if (category) {
      const children = await db.category.findMany({ where: { parentId: category.id }, select: { id: true } });
      filters.push({ OR: [{ categoryId: category.id }, ...(children.length ? [{ categoryId: { in: children.map((c) => c.id) } }] : [])] });
    }
  }
  let brand: { id: string; name: string; slug: string } | null = null;
  if (brandSlug) {
    brand = await db.brand.findUnique({ where: { slug: brandSlug }, select: { id: true, name: true, slug: true } });
    if (brand) filters.push({ brandId: brand.id });
  }
  if (inStock) filters.push({ stock: { gt: 0 } });
  if (onDiscount) filters.push({ discountPrice: { not: null } });
  if (featuredOnly) filters.push({ featured: true });
  if (specialOnly) filters.push({ isSpecial: true });
  if (terms.length) {
    for (const t of terms) filters.push({ searchText: { contains: t } });
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "cheapest") orderBy = { price: "asc" };
  else if (sort === "expensive") orderBy = { price: "desc" };
  else if (sort === "bestselling") orderBy = { soldCount: "desc" };
  else if (sort === "rating") orderBy = { rating: "desc" };

  const [total, products, categories, brands] = await Promise.all([
    db.product.count({ where: { AND: filters as never[] } }),
    db.product.findMany({
      where: { AND: filters as never[] },
      include: productInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
    }),
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
    }),
  ]);

  let items = products.map(serializeProduct);
  if (sort === "discount") items = items.sort((a, b) => b.discountPercent - a.discountPercent);
  if (min > 0 || max > 0) {
    items = items.filter((p) => (!min || p.effectivePrice >= min) && (!max || p.effectivePrice <= max));
  }

  const pages = Math.max(1, Math.ceil(total / limit));
  // v33 (2-d): heading precedence q > category > brand > featured >
  // special > discount > «همه محصولات».
  const heading = q
    ? `نتایج جستجو برای «${q}»`
    : category
      ? category.name
      : brand
        ? `برند ${brand.name}`
        : featuredOnly
          ? "پیشنهادهای ویژه"
          : specialOnly
            ? "محصولات ویژه و انحصاری"
            : onDiscount
              ? "محصولات تخفیف‌دار"
              : "همه محصولات";

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (typeof v === "string" && v && k !== "page") params.set(k, v);
    });
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav aria-label="مسیر" className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
        <Link href="/" className="hover:text-primary transition-colors">خانه</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{heading}</span>
      </nav>

      <SectionHeader
        as="h1"
        title={heading}
        subtitle={`${total.toLocaleString("fa-IR")} محصول یافت شد`}
        icon={PackageSearch}
      />

      <div className="grid grid-cols-1 min-w-0 lg:grid-cols-[260px_1fr] gap-6">
        <ProductsToolbar
          categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products }))}
          brands={brands.map((b) => ({ name: b.name, slug: b.slug, count: b._count.products }))}
          total={total}
        />

        <div>
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-14 text-center col-span-full">
              <PackageX className="mx-auto h-14 w-14 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-bold">محصولی مطابق جستجوی شما پیدا نشد</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-7">
                عبارت دیگری را امتحان کنید یا فیلترها را تغییر دهید.
                <br />
                دستیار هوشمند ما هم می‌تواند کمک کند محصول مناسب را پیدا کنید.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button asChild variant="outline" className="rounded-lg">
                  <Link href="/products">حذف فیلترها</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ProductGrid products={items} />

              {pages > 1 && (
                <nav aria-label="صفحه‌بندی" className="mt-8 flex items-center justify-center gap-1.5">
                  {page > 1 && (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link href={buildPageUrl(page - 1)}>قبلی</Link>
                    </Button>
                  )}
                  {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 3, pages - 6));
                    return start + i;
                  }).filter((p) => p >= 1 && p <= pages).map((p) => (
                    <Button
                      key={p}
                      asChild={p !== page}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className={p === page ? "rounded-lg gold-surface text-primary-foreground" : "rounded-lg"}
                    >
                      {p !== page ? <Link href={buildPageUrl(p)}>{p.toLocaleString("fa-IR")}</Link> : <span>{p.toLocaleString("fa-IR")}</span>}
                    </Button>
                  ))}
                  {page < pages && (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link href={buildPageUrl(page + 1)}>بعدی</Link>
                    </Button>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

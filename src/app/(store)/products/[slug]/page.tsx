import { db } from "@/lib/db";
import { serializeProduct, productInclude } from "@/lib/product";
import { ProductGallery, BuyBox, ProductBreadcrumb } from "@/components/store/product-detail";
import { ProductReviews } from "@/components/store/product-reviews";
import { ProductRail } from "@/components/store/product-rail";
import { SectionHeader } from "@/components/store/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageX, Layers, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findFirst({ where: { OR: [{ slug }, { id: slug }] } });
  if (!p) return { title: "محصول پیدا نشد" };
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.shortDescription ?? `خرید ${p.name} با بهترین قیمت از تاج الکترونیکس`,
    keywords: p.seoKeywords ? p.seoKeywords.split(",").map((k) => k.trim()) : undefined,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title: p.seoTitle ?? p.name,
      description: p.seoDescription ?? p.shortDescription ?? "",
      images: p.mainImage ? [{ url: p.mainImage }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await db.product.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: "PUBLISHED" },
    include: {
      ...productInclude,
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const dto = serializeProduct(product);

  const [related, similarPrice] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED", categoryId: product.categoryId, id: { not: product.id } },
      include: productInclude,
      take: 8,
      orderBy: { soldCount: "desc" },
    }),
    db.product.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: product.id },
        OR: [
          { price: { gte: Math.floor(product.price * 0.7), lte: Math.floor(product.price * 1.3) } },
        ],
      },
      include: productInclude,
      take: 8,
      orderBy: { soldCount: "desc" },
    }),
  ]);

  const reviews = product.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    date: r.createdAt.toISOString(),
    author: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || "کاربر تاج",
    // v23: the official store/AI reply attached to the comment
    reply: r.replyText ?? null,
    replyAuthor: r.replyAuthorName ?? null,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.mainImage ? [product.mainImage] : undefined,
    description: product.shortDescription ?? product.description ?? product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: dto.brand.name },
    offers: {
      "@type": "Offer",
      url: `/products/${product.slug}`,
      priceCurrency: "IRR",
      price: (dto.effectivePrice * 10).toString(),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: "/" },
      { "@type": "ListItem", position: 2, name: dto.category.name, item: `/products?category=${dto.category.slug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: `/products/${product.slug}` },
    ],
  };

  const specGroups = dto.specifications.reduce<Record<string, { label: string; value: string }[]>>((acc, s) => {
    const g = s.group ?? "مشخصات فنی";
    if (!acc[g]) acc[g] = [];
    acc[g].push({ label: s.label, value: s.value });
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <ProductBreadcrumb product={dto} />

      {/* main */}
      <div className="grid grid-cols-1 min-w-0 lg:grid-cols-2 gap-8">
        <ProductGallery product={dto} />
        <div className="space-y-4">
          <div>
            <Link href={`/products?brand=${dto.brand.slug}`} className="text-xs font-bold text-primary hover:opacity-75">
              {dto.brand.name}
            </Link>
            <h1 className="text-xl md:text-2xl font-black leading-9 mt-1.5">{product.name}</h1>
            {dto.shortDescription && (
              <p className="text-[13px] text-muted-foreground leading-7 mt-3">{dto.shortDescription}</p>
            )}
          </div>
          <BuyBox product={dto} />
        </div>
      </div>

      {/* tabs: specs + description */}
      <Tabs defaultValue="specs" dir="rtl">
        <TabsList className="w-full justify-start rounded-2xl p-1 h-auto">
          <TabsTrigger value="specs" className="rounded-xl px-5 py-2.5 text-[13px] font-bold data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
            <Layers className="h-4 w-4 me-1.5" /> مشخصات فنی
          </TabsTrigger>
          <TabsTrigger value="desc" className="rounded-xl px-5 py-2.5 text-[13px] font-bold data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
            <FileText className="h-4 w-4 me-1.5" /> توضیحات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="specs" className="mt-4">
          {dto.specifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              مشخصات این محصول ثبت نشده است.
            </div>
          ) : (
            <div className="rounded-3xl border bg-card overflow-hidden">
              {Object.entries(specGroups).map(([group, specs]) => (
                <div key={group} className="not-last:border-b">
                  <p className="bg-muted/60 px-5 py-3 text-[13px] font-extrabold">{group}</p>
                  <div>
                    {specs.map((s, i) => (
                      <div key={i} className={i % 2 === 0 ? "grid grid-cols-[40%_1fr] text-[13px]" : "grid grid-cols-[40%_1fr] text-[13px] bg-muted/25"}>
                        <p className="px-5 py-3 text-muted-foreground">{s.label}</p>
                        <p className="px-5 py-3 font-medium">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="desc" className="mt-4">
          <div className="rounded-3xl border bg-card p-6">
            {product.description ? (
              <div className="text-[13px] leading-8 whitespace-pre-line text-muted-foreground">
                {product.description}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">توضیحات بیشتری برای این محصول ثبت نشده است.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* reviews */}
      <ProductReviews slug={product.slug} initial={reviews} />

      {/* related */}
      {related.length > 0 && (
        <section>
          <SectionHeader title="محصولات مرتبط" subtitle={`بیشتر در ${dto.category.name}`} icon={Layers} />
          <ProductRail products={related.map(serializeProduct)} />
        </section>
      )}

      {/* similar price */}
      {similarPrice.length > 0 && (
        <section>
          <SectionHeader title="محصولات مشابه در این محدوده قیمت" subtitle="گزینه‌های جایگزین با قیمت نزدیک" icon={PackageX} />
          <ProductRail products={similarPrice.filter((p) => p.categoryId !== product.categoryId).map(serializeProduct)} />
        </section>
      )}
    </div>
  );
}

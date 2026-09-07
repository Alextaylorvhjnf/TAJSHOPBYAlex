import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/track-order`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/compare`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/info/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/info/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/info/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/info/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/info/faq`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        take: 500,
      }),
      db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((c) => ({
        url: `${base}/products?category=${c.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...products.map((p) => ({
        url: `${base}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}

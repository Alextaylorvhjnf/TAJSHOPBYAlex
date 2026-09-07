import { db } from "@/lib/db";
import { buildSearchText } from "@/lib/search";

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  discountPrice: number | null;
  /** v23: flash-sale deadline — discount applies ONLY while this is in the
   *  future. null = always-on classic discount. */
  discountEndsAt?: Date | null;
  effectivePrice: number;
  discountPercent: number;
  stock: number;
  minStock: number;
  inStock: boolean;
  colors: { name: string; hex?: string; price?: number }[];
  variants: { name: string; priceDelta: number; stock: number; sku?: string }[];
  /** v20: SIMPLE (single price) | VARIABLE (per color×spec combination pricing) */
  productType: "SIMPLE" | "VARIABLE";
  /** v20: per-combination absolute prices (only meaningful for VARIABLE products;
   *  empty array = legacy color-price / variant-delta rules apply) */
  combinations: CombinationRow[];
  specifications: { key: string; label: string; value: string; group?: string }[];
  tags: string[];
  mainImage: string | null;
  images: { url: string; alt?: string }[];
  status: string;
  featured: boolean;
  isSpecial: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  createdAt: Date;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
};

/** v20: one color × specification combination with its OWN absolute price (Toman).
 *  color/variant are null when the product defines only one side
 *  (e.g. variants without colors → color: null). stock 0 = ناموجود.
 *  v26fix: optional per-combination discounted price — when 0 < discountPrice < price,
 *  the storefront and cart treat it as that exact row's unit price. */
export type CombinationRow = {
  color: string | null;
  variant: string | null;
  price: number;
  stock?: number;
  discountPrice?: number;
};

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** v20: safe-parse the combinations JSON column → normalized rows.
 *  Anything invalid (non-array, non-object items, missing/invalid price)
 *  is dropped so the storefront/cart never see broken data.
 *  v26fix: the optional per-row discountPrice is passed through when valid. */
function parseCombinations(s: string | null | undefined): CombinationRow[] {
  const raw = parseJSON<unknown>(s, []);
  if (!Array.isArray(raw)) return [];
  const out: CombinationRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.price !== "number" || !Number.isFinite(r.price) || r.price < 0) continue;
    const color = typeof r.color === "string" ? r.color : null;
    const variant = typeof r.variant === "string" ? r.variant : null;
    const stock =
      typeof r.stock === "number" && Number.isFinite(r.stock) && r.stock >= 0
        ? Math.floor(r.stock)
        : undefined;
    const discountPrice =
      typeof r.discountPrice === "number" && Number.isFinite(r.discountPrice) && r.discountPrice >= 0
        ? Math.floor(r.discountPrice)
        : undefined;
    out.push({
      color,
      variant,
      price: Math.floor(r.price),
      ...(stock !== undefined ? { stock } : {}),
      ...(discountPrice !== undefined ? { discountPrice } : {}),
    });
  }
  return out;
}

export function serializeProduct(p: {
  id: string; name: string; slug: string; sku: string; shortDescription: string | null; description: string | null;
  price: number; discountPrice: number | null; stock: number; minStock: number; colors: string | null;
  variants: string | null; specifications: string | null; tags: string | null; mainImage: string | null;
  images?: { url: string; alt: string | null }[]; status: string; featured: boolean; isSpecial: boolean;
  rating: number; reviewCount: number; soldCount: number; seoTitle: string | null; seoDescription: string | null;
  seoKeywords: string | null; createdAt: Date; category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
  // v20 — optional so every existing caller keeps compiling (Prisma rows pass them)
  productType?: string | null;
  combinations?: string | null;
  // v23 — optional deadline (Prisma rows pass it; legacy callers skip it)
  discountEndsAt?: Date | null;
}): ProductDTO {
  /* v23: a discount is LIVE only when a deadline exists and is still ahead.
   * After the deadline the product is simply NOT on sale anymore — the
   * storefront, cart and checkout all read from here. */
  const dealAlive =
    !!p.discountPrice &&
    p.discountPrice < p.price &&
    (!p.discountEndsAt || p.discountEndsAt.getTime() > Date.now());
  const effectivePrice = dealAlive ? p.discountPrice! : p.price;
  const discountPercent = dealAlive
    ? Math.round(((p.price - p.discountPrice!) / p.price) * 100)
    : 0;
  return {
    ...p,
    effectivePrice,
    discountPercent,
    // expired deal → discount is gone: surface null so no UI shows a
    // crossed-out price or a countdown for a dead deal
    discountPrice: dealAlive ? p.discountPrice : null,
    discountEndsAt: dealAlive && p.discountEndsAt ? p.discountEndsAt : null,
    inStock: p.stock > 0,
    colors: parseJSON(p.colors, []),
    variants: parseJSON(p.variants, []),
    // v20: normalized type + parsed combination matrix (explicit fields AFTER
    // the ...p spread so the raw JSON string never leaks into the DTO)
    productType: p.productType === "VARIABLE" ? "VARIABLE" : "SIMPLE",
    combinations: parseCombinations(p.combinations),
    specifications: parseJSON(p.specifications, []),
    tags: parseJSON(p.tags, []),
    images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? undefined })).sort((a, b) => 0),
    category: p.category,
    brand: p.brand,
  };
}

export const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: { select: { url: true, alt: true } },
} as const;

/** Recompute product searchText after create/update.
 *  v19: also folds in COLOR names and VARIANT names — so queries like
 *  «گوشی مشکی» or «256 گیگ» match the right products in the AI search. */
export async function refreshSearchText(productId: string) {
  const p = await db.product.findUnique({
    where: { id: productId },
    include: { category: { select: { name: true } }, brand: { select: { name: true } } },
  });
  if (!p) return;
  const specs = parseJSON<{ value: string }[]>(p.specifications, []).map((s) => s.value).join(" ");
  const tags = parseJSON<string[]>(p.tags, []).join(" ");
  const colors = parseJSON<{ name: string }[]>(p.colors, []).map((c) => c.name).join(" ");
  const variants = parseJSON<{ name: string }[]>(p.variants, []).map((v) => v.name).join(" ");
  await db.product.update({
    where: { id: productId },
    data: { searchText: buildSearchText(p.name, p.sku, p.slug, p.category?.name, p.brand?.name, tags, specs, colors, variants) },
  });
}

/** v19: admin "scan products" — rebuild searchText for EVERY product so the
 *  AI widget is ready for any question right after the button is pushed.
 *  Returns how many products/brands/categories were indexed. */
export async function rebuildAllSearchText(): Promise<{
  products: number;
  brands: number;
  categories: number;
}> {
  const [rows, brands, categories] = await Promise.all([
    db.product.findMany({
      select: {
        id: true, name: true, sku: true, slug: true, tags: true, specifications: true,
        colors: true, variants: true, searchText: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    db.brand.count({ where: { isActive: true } }),
    db.category.count({ where: { isActive: true } }),
  ]);
  for (const p of rows) {
    const specs = parseJSON<{ value: string }[]>(p.specifications, []).map((s) => s.value).join(" ");
    const tags = parseJSON<string[]>(p.tags, []).join(" ");
    const colors = parseJSON<{ name: string }[]>(p.colors, []).map((c) => c.name).join(" ");
    const variants = parseJSON<{ name: string }[]>(p.variants, []).map((v) => v.name).join(" ");
    const searchText = buildSearchText(p.name, p.sku, p.slug, p.category?.name, p.brand?.name, tags, specs, colors, variants);
    if (searchText !== p.searchText) {
      await db.product.update({ where: { id: p.id }, data: { searchText } }).catch(() => null);
    }
  }
  return { products: rows.length, brands, categories };
}

/** Recompute rating aggregates from approved reviews */
export async function refreshProductRating(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TAJ-${ts}-${rnd}`;
}

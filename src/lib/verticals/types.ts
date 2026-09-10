/**
 * v35 · STORE VERTICALS — «صنف فروشگاه»
 * --------------------------------------
 * The store is no longer electronics-only: the admin picks a VERTICAL
 * (electronics / fashion / beauty / gaming / autoparts) and the whole shop
 * re-themes around it — catalog, categories, AI persona and the default
 * storefront template. Each vertical owns a COMPLETE catalog of real
 * products (Persian names, real prices in تومان, discounts, stock, specs,
 * high-quality images) defined as PURE DATA here.
 *
 * A vertical definition is consumed by:
 *   • src/app/api/admin/vertical/route.ts  (switch = reseed categories/
 *     brands/products + set activeTemplate + AI persona)
 *   • src/lib/ai.ts                        (persona-aware AI answers)
 *   • the storefront templates              (via the normal DB data flow)
 */

export type VerticalCategorySeed = {
  name: string;
  slug: string;
  /** lucide icon name */
  icon: string;
  description?: string;
  sortOrder?: number;
};

export type VerticalBrandSeed = {
  name: string;
  slug: string;
};

export type VerticalProductSpec = { key: string; value: string };

export type VerticalProductSeed = {
  /** stable unique key — used for slug generation + idempotent re-seeding */
  key: string;
  name: string;
  nameEn?: string;
  /** price in تومان (the DB stores the same unit the admin UI uses) */
  price: number;
  discountPrice?: number | null;
  stock: number;
  /** one of this vertical's category slugs */
  categorySlug: string;
  brandName: string;
  /** main product image (stable OSS url from image-search) */
  image?: string | null;
  gallery?: string[];
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  featured?: boolean;
  isSpecial?: boolean;
  specs?: VerticalProductSpec[];
  /** 2–3 sentence Persian marketing description */
  description?: string;
  sku: string;
};

export type VerticalDef = {
  id: string;
  nameFa: string;
  nameEn: string;
  /** the storefront template id this vertical activates by default */
  templateId: string;
  /** short Persian tagline used in the admin vertical picker */
  taglineFa: string;
  /** longer Persian description for the admin vertical picker */
  descFa: string;
  /** lucide icon name for the admin picker card */
  icon: string;
  /**
   * The AI persona for this vertical — appended to the AI system prompt so
   * the shopping assistant answers IN CHARACTER for the vertical (a beauty
   * adviser for cosmetics, a gear-head for auto parts, …). Written in
   * Persian, 3–6 sentences, defining: expertise domain, tone, what to
   * recommend (this store's products), what to politely refuse.
   */
  aiPersona: string;
  categories: VerticalCategorySeed[];
  brands: VerticalBrandSeed[];
  products: VerticalProductSeed[];
};

export const VERTICAL_IDS = ["electronics", "fashion", "beauty", "gaming", "autoparts"] as const;
export type VerticalId = (typeof VERTICAL_IDS)[number];

import type { TemplateContentData } from "./content";

/**
 * STOREFRONT TEMPLATE SYSTEM — shared data contract (spec §18–§24)
 * ---------------------------------------------------------------
 * Templates are pure PRESENTATION layers. They receive this fully
 * serialized, client-safe `HomeData` object and NEVER query the
 * database directly. Switching templates must never modify store
 * data (spec §22) — so this type is read-only by contract.
 *
 * Templates must compose with the existing color-theme engine
 * (6 themes × dark/light): use ONLY token/utility classes
 * (bg-background, text-foreground, bg-primary, gold-surface, …)
 * and CSS vars — never hardcode brand colors (spec §24).
 */

export type TemplateProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  /** v23: flash-sale deadline (ISO) — ONLY present while the discount is
   *  still ACTIVE (deadline in the future). Templates render live countdown
   *  timers from it; once it passes the backend already treats the product
   *  as non-discounted. null = no active timed deal. */
  discountEndsAt?: string | null;
  stock: number;
  inStock: boolean;
  mainImage: string | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  featured: boolean;
  isSpecial: boolean;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
};

export type TemplateProductSlide = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  mainImage: string | null;
};

export type TemplateSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  /** desktop artwork (the required admin image) */
  image: string;
  /** v23: phone-specific artwork (optional admin image). When present,
   *  templates render it on <sm screens instead of the desktop art. */
  mobileImage?: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  product: TemplateProductSlide | null;
};

/** v26: mega-menu branch under a category — either a real child category
 *  (admin-defined, kind "child" → /products?category=child-slug) or one of
 *  the strongest brands selling inside that category (kind "brand" →
 *  /products?category=parent&brand=slug), e.g. موبایل → اپل / سامسونگ /
 *  شیائومی. Additive — templates that ignore it simply skip the chips. */
export type TemplateBranch = {
  name: string;
  slug: string;
  kind: "brand" | "child";
  productCount?: number;
};

export type TemplateCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
  /** v26: branch links for the mega menu (children first, then top brands). */
  branches?: TemplateBranch[];
  /** v18: representative photo (best-selling PUBLISHED product image in this
   * category) so every template can render photo category boxes; null when
   * the category has no photographed product. Additive — older templates
   * simply ignore it. */
  image?: string | null;
};

export type TemplateStory = {
  id: string;
  title: string;
  image: string;
  /** optional story video (spec §10) — viewer plays it with video-synced progress */
  videoUrl: string | null;
  badge: string | null;
  /** per-story slide duration in ms (admin-configurable, spec §26) */
  duration: number;
  linkUrl: string | null;
  product: TemplateProductSlide | null;
  category: { name: string; slug: string } | null;
};

export type TemplateShowcase = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  buttonUrl: string | null;
  product: TemplateProductSlide | null;
};

export type TemplateBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  /** v18: representative photo (best-selling PUBLISHED product image for
   * this brand) used when `logo` is null — so brand boxes are never text-only
   * in template previews. Additive — older templates simply ignore it. */
  image?: string | null;
};

export type TemplateFaqSection = { h: string; p: string };

/** v18: real CMS info-page links (about/shipping/returns/faq/…) so every
 * template footer can render genuine link columns — never fabricated. */
export type TemplateInfoLink = { slug: string; title: string };

export type TemplateStore = {
  storeName: string;
  storeNameEn: string;
  announcement: string | null;
  announcementActive: boolean;
  announcementLink: string | null;
  /** v20: admin-managed marquee messages rotating in the header ticker
   *  strips (empty = fall back to the single announcement). */
  tickerMessages?: { text: string; link?: string | null }[];
  /** v22: admin-controlled marquee speed — seconds per loop (lower = faster).
   *  null/0 = keep each template's own designed default (gaming 16s …). */
  tickerSpeed?: number | null;
  /** v23: resolved on/off flags for the ACTIVE template's registered features
   *  (Admin → ظاهر). A missing key = feature ON (template default). */
  features?: Record<string, boolean>;
  /** v25: admin-set GLOBAL countdown deadline (ISO) — when set and the
   *  template's "timer" feature is ON, timers count down to THIS moment
   *  (overrides per-product discount deadlines / midnight defaults).
   *  null = template-designed default behavior. */
  timerEndsAt?: string | null;
  /** v24: per-template admin overrides for the chrome header/footer
   *  (Admin → ظاهر → «هدر و فوتر»). Keyed by template id; each template's
   *  chrome reads its own entry. Missing entry/field = the template's own
   *  designed default (header/footer match the template palette). */
  chromeOverridesMap?: Record<string, ChromeOverrides>;
  /** v27b: footer CONTENT overrides for the ACTIVE template only (Admin →
   *  تنظیمات → فوتر → «تنظیمات فوتر قالب فعال»). Missing field = the
   *  global footer value (StoreSettings.footerText/copyrightText or the
   *  FooterLink CMS columns) is used; empty = rendered exactly as before. */
  footerContent?: {
    footerText?: string | null;
    copyrightText?: string | null;
    customerLinks?: { label: string; url: string }[];
    storeLinks?: { label: string; url: string }[];
  };
  phone: string | null;
  currency: string;
  /** v29: admin-uploaded MAIN logo (Branding → «لوگوی اصلی») — chrome
   *  headers/footers render it instead of the letter-mark when present. */
  logo?: string | null;
  /** v29: admin-uploaded FOOTER logo (Branding → «لوگوی فوتر», falls back
   *  to the main logo) — rendered by the chrome FOOTER brand blocks. */
  footerLogo?: string | null;
};

/** v24: admin-editable header overrides (all fields optional).
 *  Colors accept any CSS color (hex recommended). The Alaruz Design credit
 *  is NOT part of this — it is permanent in every footer. */
export type ChromeHeaderOverride = {
  bg?: string;
  fg?: string;
  /** cyan | violet | rose | amber | orange | lime | emerald | neutral */
  accent?: string;
  /** square | round | wordmark | mono */
  logo?: string;
  sticky?: boolean;
  ticker?: boolean;
  /** photos | chips | none */
  categoryRow?: string;
  megaMenu?: boolean;
  showSearch?: boolean;
  showAccount?: boolean;
  showCart?: boolean;
  showThemeToggle?: boolean;
};

/** v24: admin-editable footer overrides (all fields optional). */
export type ChromeFooterOverride = {
  bg?: string;
  fg?: string;
  accent?: string;
  logo?: string;
  trust?: boolean;
  /** number of category links (F1 mega footer; 0 hides the column) */
  categories?: number;
  /** photos | chips | none */
  brandStrip?: string;
  round?: boolean;
};

export type ChromeOverrides = {
  header?: ChromeHeaderOverride;
  footer?: ChromeFooterOverride;
};

/** Everything a storefront template needs — fully serializable. */
export type HomeData = {
  store: TemplateStore;
  slides: TemplateSlide[];
  categories: TemplateCategory[];
  featured: TemplateProduct[];
  newest: TemplateProduct[];
  bestsellers: TemplateProduct[];
  discounted: TemplateProduct[];
  /** v15: «محصولات انحصاری» — PUBLISHED + isSpecial products for the
   *  exclusive 3D-viewing showcase cards (additive; templates that don't
   *  use it simply ignore the field). */
  exclusive: TemplateProduct[];
  brands: TemplateBrand[];
  stories: TemplateStory[];
  showcases: TemplateShowcase[];
  faq: TemplateFaqSection[];
  /** v18: published CMS info pages (footer link columns). Additive. */
  infoLinks?: TemplateInfoLink[];
  counts: {
    products: number;
    categories: number;
    brands: number;
    stories: number;
  };
  /** v5-f: the ACTIVE template's own dedicated content (Admin → ظاهر →
   *  «محتوای اختصاصی قالب») — its slides/showcases/texts/links/brand.
   *  Already merged into `slides`/`showcases`/`store` above by the server
   *  (template-specific wins, empty falls back to global); templates can
   *  additionally read `texts` / `links` / `brand.tagline` directly.
   *  Additive — templates that ignore it render exactly as before. */
  templateContent?: TemplateContentData;
};

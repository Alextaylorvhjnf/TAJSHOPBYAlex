/**
 * SERVER-ONLY data loader for the storefront Template System (spec §18–§24).
 * -----------------------------------------------------------------------
 * Single source of truth for `HomeData`: every template (modern-tech + the
 * 9 alternates) receives this fully serialized, client-safe object and NEVER
 * queries the database directly. Read-only by contract — switching templates
 * must never modify store data (spec §22).
 *
 * Queries are ported 1:1 from the previous (store)/page.tsx implementation
 * so the modern-tech default keeps identical data semantics.
 */

import { db } from "@/lib/db";
import { serializeProduct, productInclude, type ProductDTO } from "@/lib/product";
import { getStoreSettings, parseTickerMessages, resolveTemplateFeatures, parseTemplateChrome, getTemplateFooterContent, parseStoreChrome } from "@/lib/settings";
import { applyTemplateBrandToStore, getTemplateContentData } from "@/lib/templates/content";
import { smartSliderUrl } from "./slide-targets";
import type {
  HomeData,
  TemplateProduct,
  TemplateSlide,
  TemplateCategory,
  TemplateBranch,
  TemplateStory,
  TemplateShowcase,
  TemplateBrand,
  TemplateFaqSection,
  TemplateStore,
} from "./types";

/** shape shared by slider/story/showcase linked products */
const productSlideSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  discountPrice: true,
  mainImage: true,
} as const;

function parseSections(json: string | null | undefined): TemplateFaqSection[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as TemplateFaqSection[]) : [];
  } catch {
    return [];
  }
}

/** Narrow a serialized product down to the read-only template contract. */
function toTemplateProduct(p: ProductDTO): TemplateProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    discountPrice: p.discountPrice,
    effectivePrice: p.effectivePrice,
    discountPercent: p.discountPercent,
    // v23: LIVE deal deadline (serializeProduct already nulls it when the
    // discount is expired/absent) — ISO so it survives RSC serialization.
    discountEndsAt: p.discountEndsAt ? p.discountEndsAt.toISOString() : null,
    stock: p.stock,
    inStock: p.inStock,
    mainImage: p.mainImage,
    rating: p.rating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
    featured: p.featured,
    isSpecial: p.isSpecial,
    brand: { id: p.brand.id, name: p.brand.name, slug: p.brand.slug },
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
  };
}

/**
 * v26: mega-menu branch index — per category id, its REAL child categories
 * (admin-defined via parentId) followed by the strongest brands selling
 * inside it, so the mega panel can show branches like موبایل → اپل /
 * سامسونگ / شیائومی. One group-by + one light query; shared by
 * getHomeData, getChromeData and /api/categories so every consumer
 * (server RSC + client fallback) sees the same branches.
 */
/* v34.1: resolve the «خرید از ربات تلگرامی» footer link.
 * Priority: the admin's explicit StoreSettings.telegramBotUrl override →
 * the CONFIGURED Telegram shopping bot's username (Settings → ربات تلگرامی,
 * t.me/<botUsername>) → null (button hidden). Never throws — the footer is
 * cosmetic and must not break page render. */
export async function resolveTelegramBotUrl(
  settings: { telegramBotUrl?: string | null }
): Promise<string | null> {
  const manual = (settings as { telegramBotUrl?: string | null }).telegramBotUrl?.trim();
  if (manual) return manual;
  try {
    const bot = await db.telegramBotSettings.findUnique({
      where: { id: "main" },
      select: { enabled: true, botUsername: true },
    });
    if (bot?.enabled && bot.botUsername?.trim()) {
      const u = bot.botUsername.trim().replace(/^@/, "");
      return `https://t.me/${u}`;
    }
  } catch {
    /* pre-wizard environment (table missing) — button stays hidden */
  }
  return null;
}

export async function loadBranchIndex(): Promise<Map<string, TemplateBranch[]>> {
  const [children, brandRows, pairs] = await Promise.all([
    db.category.findMany({
      where: { isActive: true, parentId: { not: null } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
    // every active brand — any brand can be the strongest inside a category
    db.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    // how many PUBLISHED products each (category, brand) pair shares
    db.product.groupBy({
      by: ["categoryId", "brandId"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
  ]);

  const brandById = new Map(brandRows.map((b) => [b.id, b]));
  const perCat = new Map<string, { brand: { name: string; slug: string }; count: number }[]>();
  for (const p of pairs) {
    const brand = brandById.get(p.brandId);
    if (!brand) continue;
    const arr = perCat.get(p.categoryId);
    if (arr) arr.push({ brand, count: p._count._all });
    else perCat.set(p.categoryId, [{ brand, count: p._count._all }]);
  }

  const index = new Map<string, TemplateBranch[]>();
  // admin-defined subcategories first (they are explicit merchandising)
  for (const ch of children) {
    if (!ch.parentId) continue;
    const list = index.get(ch.parentId) ?? [];
    list.push({ name: ch.name, slug: ch.slug, kind: "child", productCount: ch._count.products });
    index.set(ch.parentId, list);
  }
  // then the strongest brands inside the category (max 4 brand chips)
  for (const [catId, arr] of perCat) {
    const brandBranches = arr
      .sort((x, y) => y.count - x.count)
      .slice(0, 4)
      .map(({ brand }) => ({ name: brand.name, slug: brand.slug, kind: "brand" as const }));
    const list = index.get(catId) ?? [];
    index.set(catId, [...list, ...brandBranches].slice(0, 5));
  }
  return index;
}

/**
 * Everything a storefront template needs — one Promise.all round-trip.
 * Same query semantics as the pre-template homepage (zero data regression).
 */
export async function getHomeData(): Promise<HomeData> {
  const now = new Date();
  const [
    settings,
    sliders,
    categories,
    featured,
    newest,
    bestsellers,
    discounted,
    exclusive,
    brands,
    stories,
    showcases,
    faqPage,
    productCount,
    categoryCount,
    brandCount,
    storyCount,
    // v18: one light query for representative category/brand photos
    photoRows,
    infoPages,
    // v26: mega-menu branches (child categories + top brands per category)
    branchIndex,
  ] = await Promise.all([
    getStoreSettings(),
    db.slider.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: "asc" },
      include: { product: { select: productSlideSelect } },
    }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        image: true,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", featured: true },
      include: productInclude,
      orderBy: { soldCount: "desc" },
      take: 8,
    }),
    db.product.findMany({
      where: { status: "PUBLISHED" },
      include: productInclude,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", stock: { gt: 0 } },
      include: productInclude,
      orderBy: { soldCount: "desc" },
      take: 8,
    }),
    db.product.findMany({
      where: {
        status: "PUBLISHED",
        discountPrice: { not: null },
        // v23: expired flash deals are NOT discounted anymore
        OR: [{ discountEndsAt: null }, { discountEndsAt: { gte: now } }],
      },
      include: productInclude,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // v15: exclusive products (isSpecial) for the 3D-viewing showcase cards.
    // v19 FIX: a newly-marked special product must appear IMMEDIATELY —
    // ordering by rating/soldCount pushed it past the take-6 cut when
    // seeded specials already filled the section. Newest specials first.
    db.product.findMany({
      where: { status: "PUBLISHED", isSpecial: true },
      include: productInclude,
      orderBy: [{ createdAt: "desc" }, { rating: "desc" }, { soldCount: "desc" }],
      take: 8,
    }),
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 14,
      select: { id: true, name: true, slug: true, logo: true },
    }),
    db.story.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { sortOrder: "asc" },
      include: {
        product: { select: productSlideSelect },
        category: { select: { name: true, slug: true } },
      },
    }),
    db.promotionalShowcase.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { product: { select: productSlideSelect } },
    }),
    db.cmsPage.findUnique({ where: { slug: "faq" }, select: { sections: true } }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.category.count({ where: { isActive: true } }),
    db.brand.count({ where: { isActive: true } }),
    db.story.count({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    // v18: best photo per category/brand — soldCount-ranked PUBLISHED products
    db.product.findMany({
      where: { status: "PUBLISHED", mainImage: { not: null } },
      orderBy: { soldCount: "desc" },
      select: { categoryId: true, brandId: true, mainImage: true },
    }),
    // v18: published info pages for template footer link columns
    db.cmsPage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true },
    }),
    // v26: branches for the mega menu
    loadBranchIndex(),
  ]);

  const store: TemplateStore = {
    storeName: settings.storeName,
    storeNameEn: settings.storeNameEn,
    announcement: settings.announcement,
    announcementActive: settings.announcementActive ?? true,
    announcementLink: settings.announcementLink,
    tickerMessages: parseTickerMessages(settings.tickerMessages),
    tickerSpeed: settings.tickerSpeed ?? null,
    // v23: resolved on/off flags for the ACTIVE template's features
    features: resolveTemplateFeatures(settings.templateFeatures, settings.activeTemplate),
    // v24: admin header/footer overrides per template (Admin → ظاهر)
    chromeOverridesMap: parseTemplateChrome((settings as { templateChrome?: string | null }).templateChrome) as TemplateStore["chromeOverridesMap"],
    // v32 (14-b): store-wide chrome look options — header skin, nav item
    // order, actions placement, product hover effect (Admin → ظاهر → هدر)
    storeChrome: parseStoreChrome((settings as { storeChrome?: string | null }).storeChrome),
    // v27b: footer CONTENT overrides for the ACTIVE template (Admin →
    // تنظیمات → فوتر) — text/copyright/custom link columns
    footerContent: getTemplateFooterContent((settings as { templateFooters?: string | null }).templateFooters, settings.activeTemplate) as TemplateStore["footerContent"],
    // v25: admin-set global countdown deadline (ISO) — templates with a
    // "timer" feature prefer it when present
    timerEndsAt: (settings as { templateTimerEndsAt?: Date | null }).templateTimerEndsAt
      ? new Date((settings as { templateTimerEndsAt?: Date | null }).templateTimerEndsAt as Date).toISOString()
      : null,
    phone: settings.phone,
    currency: settings.currency,
    // v34.1: «خرید از ربات تلگرامی» footer link (manual override → bot username)
    telegramBotUrl: await resolveTelegramBotUrl(settings as { telegramBotUrl?: string | null }),
    // v29: uploaded brand logos — chrome headers/footers render them
    // (Branding → «لوگوی اصلی / لوگوی فوتر»); null = designed letter-mark
    logo: settings.logo ?? null,
    footerLogo: settings.footerLogo ?? settings.logo ?? null,
  };

  const slides: TemplateSlide[] = sliders.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    image: s.desktopImage || s.mobileImage || "",
    // v23: the phone-specific artwork — templates render it on <sm screens
    mobileImage: s.mobileImage ?? null,
    ctaText: s.buttonText,
    // v33 (2-d): SMART slider target — a bare "/products" buttonUrl is
    // resolved from the button text + title + badge into a FILTERED list
    // («مشاهدهٔ گوشی‌ها» → ?category=mobile, «ورود به منطقهٔ گیمینگ» →
    // ?q=گیمینگ) while an admin's specific URL passes through untouched.
    // Sliders with NO CTA signal at all (neither buttonText nor buttonUrl)
    // keep their null ctaUrl so templates keep linking the slide artwork to
    // its related product instead of the generic product list.
    ctaUrl:
      s.buttonText || s.buttonUrl
        ? smartSliderUrl({ buttonUrl: s.buttonUrl, text: s.buttonText, title: s.title, badge: s.badge })
        : s.buttonUrl,
    product: s.product,
  }));

  const templateCategories: TemplateCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    // v27.1: admin-uploaded category photo (null = auto representative pick)
    image: c.image ?? null,
    productCount: c._count.products,
  }));

  // v18: representative photos — first (best-selling) photographed product
  // per category and per brand. Rows arrive soldCount-desc, so the first hit
  // per id wins.
  const categoryImage = new Map<string, string>();
  const brandImage = new Map<string, string>();
  for (const row of photoRows) {
    const img = row.mainImage;
    if (img && row.categoryId && !categoryImage.has(row.categoryId)) {
      categoryImage.set(row.categoryId, img);
    }
    if (img && row.brandId && !brandImage.has(row.brandId)) {
      brandImage.set(row.brandId, img);
    }
  }
  for (const c of templateCategories) {
    /* v27.1: admin-uploaded category photo wins over the auto representative product photo */
    c.image = c.image || categoryImage.get(c.id) || null;
    // v26: mega-menu branches (children + top brands, e.g. موبایل → اپل)
    c.branches = branchIndex.get(c.id) ?? [];
  }

  const templateStories: TemplateStory[] = stories.map((s) => ({
    id: s.id,
    title: s.title,
    image: s.image,
    videoUrl: s.videoUrl,
    badge: s.badge,
    duration: s.duration,
    linkUrl: s.linkUrl,
    product: s.product,
    category: s.category,
  }));

  const templateShowcases: TemplateShowcase[] = showcases.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    image: s.image,
    // v33 (2-d): same neutral smart treatment for showcase buttons — bare
    // "/products" resolves from buttonText/title/badge, specific URLs pass.
    // No CTA signal → keep the raw null so a linked product still wins.
    buttonUrl:
      s.buttonText || s.buttonUrl
        ? smartSliderUrl({ buttonUrl: s.buttonUrl, text: s.buttonText, title: s.title, badge: s.badge })
        : s.buttonUrl,
    product: s.product,
  }));

  const templateBrands: TemplateBrand[] = brands.map((b) => ({
    ...b,
    image: brandImage.get(b.id) ?? null,
  }));

  // v18: ordered real info-page links (footer columns)
  const infoLinkOrder = ["about", "buying-guide", "shipping", "returns", "faq", "customer-service", "terms", "privacy"];
  const infoLinks = infoPages
    .map((p) => ({ slug: p.slug, title: p.title }))
    .sort((a, b) => {
      const ia = infoLinkOrder.indexOf(a.slug);
      const ib = infoLinkOrder.indexOf(b.slug);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return {
    store,
    slides,
    categories: templateCategories,
    featured: featured.map((p) => toTemplateProduct(serializeProduct(p))),
    newest: newest.map((p) => toTemplateProduct(serializeProduct(p))),
    bestsellers: bestsellers.map((p) => toTemplateProduct(serializeProduct(p))),
    discounted: discounted.map((p) => toTemplateProduct(serializeProduct(p))),
    exclusive: exclusive.map((p) => toTemplateProduct(serializeProduct(p))),
    brands: templateBrands,
    stories: templateStories,
    showcases: templateShowcases,
    faq: parseSections(faqPage?.sections),
    infoLinks,
    counts: {
      products: productCount,
      categories: categoryCount,
      brands: brandCount,
      stories: storyCount,
    },
  };
}

/**
 * v20: LIGHT chrome-only loader — everything the bespoke TemplateHeader /
 * TemplateFooter need (store + categories with photos + brands with photos +
 * CMS info links) WITHOUT the heavy product-section queries. Used by the
 * store layout so EVERY page (product/cart/checkout/…) can render the active
 * template's chrome, not just the homepage. Empty arrays fill the unused
 * sections of the HomeData contract.
 */
export async function getChromeData(): Promise<HomeData> {
  const [settings, categories, brands, infoPages, photoRows, branchIndex] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        image: true,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 14,
      select: { id: true, name: true, slug: true, logo: true },
    }),
    db.cmsPage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", mainImage: { not: null } },
      orderBy: { soldCount: "desc" },
      select: { categoryId: true, brandId: true, mainImage: true },
    }),
    // v26: branches for the mega menu (children + top brands per category)
    loadBranchIndex(),
  ]);

  const store: TemplateStore = {
    storeName: settings.storeName,
    storeNameEn: settings.storeNameEn,
    announcement: settings.announcement,
    announcementActive: settings.announcementActive ?? true,
    announcementLink: settings.announcementLink,
    tickerMessages: parseTickerMessages(settings.tickerMessages),
    tickerSpeed: settings.tickerSpeed ?? null,
    // v23: active-template feature flags for chrome (glow etc.) on ALL pages
    features: resolveTemplateFeatures(settings.templateFeatures, settings.activeTemplate),
    // v24: admin header/footer overrides per template (all store pages)
    chromeOverridesMap: parseTemplateChrome((settings as { templateChrome?: string | null }).templateChrome) as TemplateStore["chromeOverridesMap"],
    // v32 (14-b): store-wide chrome look options — header skin, nav item
    // order, actions placement, product hover effect (Admin → ظاهر → هدر)
    storeChrome: parseStoreChrome((settings as { storeChrome?: string | null }).storeChrome),
    // v27b: footer CONTENT overrides for the ACTIVE template — the bespoke
    // TemplateFooter on every store page reads them
    footerContent: getTemplateFooterContent((settings as { templateFooters?: string | null }).templateFooters, settings.activeTemplate) as TemplateStore["footerContent"],
    // v25: admin-set global countdown deadline (ISO)
    timerEndsAt: (settings as { templateTimerEndsAt?: Date | null }).templateTimerEndsAt
      ? new Date((settings as { templateTimerEndsAt?: Date | null }).templateTimerEndsAt as Date).toISOString()
      : null,
    phone: settings.phone,
    currency: settings.currency,
    // v34.1: «خرید از ربات تلگرامی» footer link (manual override → bot username)
    telegramBotUrl: await resolveTelegramBotUrl(settings as { telegramBotUrl?: string | null }),
    // v29: uploaded brand logos — chrome headers/footers render them
    // (Branding → «لوگوی اصلی / لوگوی فوتر»); null = designed letter-mark
    logo: settings.logo ?? null,
    footerLogo: settings.footerLogo ?? settings.logo ?? null,
  };

  // v5-f: the ACTIVE template's own brand (Admin → ظاهر → محتوای اختصاصی
  // قالب → برند) — when set, its name/logo win over the global branding on
  // EVERY store page's chrome (header/footer/chat title), matching what the
  // homepage renders via applyTemplateContentToData. Slides/showcases are
  // NOT swapped here — the chrome never renders them. (applyTemplateBrandToStore
  // returns a NEW object — never mutates.)
  const brandedStore = applyTemplateBrandToStore(store, await getTemplateContentData(settings.activeTemplate));

  const templateCategories: TemplateCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    // v27.1: admin-uploaded category photo (null = auto representative pick)
    image: c.image ?? null,
    productCount: c._count.products,
  }));

  const categoryImage = new Map<string, string>();
  const brandImage = new Map<string, string>();
  for (const row of photoRows) {
    const img = row.mainImage;
    if (img && row.categoryId && !categoryImage.has(row.categoryId)) {
      categoryImage.set(row.categoryId, img);
    }
    if (img && row.brandId && !brandImage.has(row.brandId)) {
      brandImage.set(row.brandId, img);
    }
  }
  for (const c of templateCategories) {
    /* v27.1: admin-uploaded category photo wins over the auto representative product photo */
    c.image = c.image || categoryImage.get(c.id) || null;
    // v26: mega-menu branches (children + top brands, e.g. موبایل → اپل)
    c.branches = branchIndex.get(c.id) ?? [];
  }

  const templateBrands: TemplateBrand[] = brands.map((b) => ({
    ...b,
    image: brandImage.get(b.id) ?? null,
  }));

  const infoLinkOrder = ["about", "buying-guide", "shipping", "returns", "faq", "customer-service", "terms", "privacy"];
  const infoLinks = infoPages
    .map((p) => ({ slug: p.slug, title: p.title }))
    .sort((a, b) => {
      const ia = infoLinkOrder.indexOf(a.slug);
      const ib = infoLinkOrder.indexOf(b.slug);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return {
    store: brandedStore,
    slides: [],
    categories: templateCategories,
    featured: [],
    newest: [],
    bestsellers: [],
    discounted: [],
    exclusive: [],
    brands: templateBrands,
    stories: [],
    showcases: [],
    faq: [],
    infoLinks,
    counts: { products: 0, categories: 0, brands: 0, stories: 0 },
  };
}

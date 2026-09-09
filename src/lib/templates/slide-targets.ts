/**
 * v33 (Task 2-d) · SMART SLIDER-TARGET RESOLVER + homepage rail URLs.
 * ---------------------------------------------------------------------------
 * Slider/showcase CTAs seeded as a bare "/products" used to dump EVERY
 * product on the shopper — «مشاهدهٔ گوشی‌ها» must show phones, «ورود به
 * منطقهٔ گیمینگ» the gaming world, and every homepage product-rail
 * «مشاهده همه» must lead to a FILTERED list of exactly that row's kind.
 *
 * This module is PURE (client-safe: zero db / server imports) so both the
 * server data loader (lib/templates/home-data.ts), the pure content merge
 * (lib/templates/content.ts) and client components (hero-slider.tsx, every
 * storefront template) can import it freely.
 */

/** Filtered /products URLs for the five homepage product rails. */
export const RAIL_URLS = {
  featured: "/products?featured=1",
  newest: "/products?sort=newest",
  bestsellers: "/products?sort=bestselling",
  discounted: "/products?discount=1",
  special: "/products?special=1",
} as const;

/* ───────────────────────── normalization ───────────────────────── */

/**
 * Persian/Arabic normalization used for BOTH the haystack and the keywords:
 *  • ي → ی and ك → ک (Arabic Yeh/Kaf → Persian)
 *  • strip harakat/diacritics U+064B–U+0652, the combining hamza U+0654 (ٔ
 *    as in «مشاهدهٔ»), the superscript alef U+0670 and the tatweel U+0640
 *  • strip ZWNJ U+200C and ZWSP U+200B (so «گوشی‌ها» → «گوشیها»)
 *  • lowercase for the Latin keywords (ps5, cpu, off…)
 * NOTE: no trim() here — keywords like «پاور » keep their trailing space as
 * a deliberate boundary requirement (must NOT match «پاوربانک»).
 */
function normalizeFa(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u0652\u0654\u0670\u0640\u200C\u200B]/g, "")
    .toLowerCase();
}

/** character class that counts as a word boundary for short tokens */
const BOUNDARY = "\\s،,.:؛()\\-_/";

/** trailing boundary noise of a keyword («رم », «رم،» → «رم») */
function keywordCore(kw: string): string {
  return kw.replace(new RegExp(`[${BOUNDARY}]+$`), "");
}

/** escape a literal for embedding into a RegExp */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One normalized haystack word with a trailing Persian plural suffix
 * («ها»/«های») removed — «گوشی‌ها» → «گوشی». Guarded so 2-letter words
 * never lose their whole tail.
 */
function stripPersianPlural(normalized: string): string {
  return normalized
    .split(/\s+/)
    .map((w) => {
      if (w.length > 4 && w.endsWith("های")) return w.slice(0, -3);
      if (w.length > 3 && w.endsWith("ها")) return w.slice(0, -2);
      return w;
    })
    .join(" ");
}

/**
 * Build the normalized search haystack: the ZWNJ-stripped text, a ZWNJ→space
 * variant (so «صفحه‌کلید» can match «صفحه کلید»), and the plural-stripped
 * variant of both. Variants are trimmed and joined with ONE space so word
 * boundaries survive the concatenation.
 */
function buildHaystack(raw: string): string {
  const a = normalizeFa(raw);
  const b = normalizeFa(raw.replace(/\u200C/g, " "));
  return [a, b, stripPersianPlural(a), stripPersianPlural(b)]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Does `kw` (already normalized) appear in `hay`?
 * • tokens whose core is ≤3 chars («رم», «موس», «کیس», «ps5», «off»…) use a
 *   word-boundary-ish regex so they never match inside another word
 *   («رمزارز», «offer», …).
 * • longer tokens use plain includes() — a trailing space in the keyword
 *   («پاور ») keeps its boundary meaning (never «پاوربانک»).
 */
function keywordMatches(kw: string, hay: string): boolean {
  const core = keywordCore(kw);
  if (!core) return false;
  if (core.length <= 3) {
    const re = new RegExp(`(^|[${BOUNDARY}])${escapeRe(core)}([${BOUNDARY}]|$)`);
    return re.test(hay);
  }
  return hay.includes(kw);
}

/* ─────────────────────── keyword → URL map ─────────────────────── */
/**
 * ORDERED — the FIRST rule with ANY matching keyword wins. Category rules
 * come first (most specific intent), then the merchandising rules
 * (discount / special / bestselling / newest) where تخفیف/حراج deliberately
 * precedes ویژه so «حراج ویژه» → discounted products.
 */
const SLIDE_KEYWORD_MAP: ReadonlyArray<{ keywords: readonly string[]; url: string }> = [
  {
    keywords: ["گوشی", "موبایل", "آیفون", "iphone", "phone", "سامسونگ", "شیائومی", "پرچمدار"],
    url: "/products?category=mobile",
  },
  {
    keywords: ["لپتاپ", "لپ‌تاپ", "لپ تاپ", "macbook", "مک بوک", "مک‌بوک", "ultrabook", "نوت بوک", "نوت‌بوک"],
    url: "/products?category=laptop",
  },
  {
    keywords: ["گیمینگ", "گیم", "بازی", "کنسول", "ps5", "ps4", "xbox", "نینتندو", "rgb"],
    url: "/products?q=گیمینگ",
  },
  { keywords: ["مانیتور", "نمایشگر", "monitor"], url: "/products?category=monitor" },
  { keywords: ["کامپیوتر", "سیستم", "pc", "دسکتاپ"], url: "/products?category=desktop-pc" },
  {
    keywords: ["قطعات", "کارت گرافیک", "گرافیک", "مادربرد", "پردازنده", "cpu", "gpu", "رم ", "رم،", "hard", "هارد", "ssd", "کیس", "پاور "],
    url: "/products?category=pc-parts",
  },
  { keywords: ["هدفون", "هدست", "headphone", "headset"], url: "/products?category=headphones" },
  { keywords: ["هندزفری", "ایرپاد", "airpods", "earbuds"], url: "/products?category=earbuds" },
  { keywords: ["ساعت", "watch", "اپل واچ"], url: "/products?category=smart-watch" },
  { keywords: ["پاوربانک", "powerbank"], url: "/products?category=powerbank" },
  { keywords: ["شارژر", "charger", "آداپتور"], url: "/products?category=charger" },
  { keywords: ["کیبورد", "صفحه کلید", "keyboard"], url: "/products?category=keyboard" },
  { keywords: ["موس", "ماوس", "mouse"], url: "/products?category=mouse" },
  { keywords: ["اسپیکر", "بلندگو", "speaker", "ساندبار"], url: "/products?category=speaker" },
  { keywords: ["وبکم", "webcam", "دوربین"], url: "/products?category=webcam" },
  { keywords: ["شبکه", "مودم", "روتر", "مسی", "wifi", "mesh"], url: "/products?category=network" },
  { keywords: ["پروژکتور", "projector"], url: "/products?category=projector" },
  { keywords: ["حافظه", "ssd", "فلش", "کارت حافظه", "storage"], url: "/products?category=storage" },
  { keywords: ["گجت", "هوشمند", "smart"], url: "/products?category=smart-gadgets" },
  { keywords: ["جانبی", "اکسسوری", "accessor"], url: "/products?category=accessories" },
  { keywords: ["تخفیف", "حراج", "استثنایی", "فروش ویژه", "off", "فروشنده"], url: "/products?discount=1" },
  { keywords: ["ویژه", "انحصاری", "special", "انتخاب"], url: "/products?special=1" },
  { keywords: ["پرفروش", "محبوب", "bestseller", "پیشنهاد"], url: "/products?sort=bestselling" },
  { keywords: ["جدید", "تازه", "new"], url: "/products?sort=newest" },
];

/* ────────────────────────── public API ────────────────────────── */

/**
 * Keyword → filtered /products URL. Checks the button TEXT first (the
 * strongest signal — it is what the shopper reads), then the slide title,
 * then the badge; all three are concatenated into one haystack. Returns
 * null when nothing matches.
 */
export function resolveSlideTarget(input: {
  text?: string | null;
  title?: string | null;
  badge?: string | null;
}): string | null {
  const parts = [input.text, input.title, input.badge].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (parts.length === 0) return null;
  const hay = buildHaystack(parts.join(" "));
  if (!hay) return null;
  for (const rule of SLIDE_KEYWORD_MAP) {
    for (const raw of rule.keywords) {
      if (keywordMatches(normalizeFa(raw), hay)) return rule.url;
    }
  }
  return null;
}

/**
 * Neutral slider/showcase CTA resolver:
 *  • a NON-generic buttonUrl (truthy, trimmed, not exactly "/products" and
 *    not "/") is the admin's EXPLICIT link → returned untouched;
 *  • otherwise the button text + title + badge are keyword-resolved;
 *  • no match → the plain "/products" fallback.
 */
export function smartSliderUrl(opts: {
  buttonUrl?: string | null;
  text?: string | null;
  title?: string | null;
  badge?: string | null;
}): string {
  const explicit = typeof opts.buttonUrl === "string" ? opts.buttonUrl.trim() : "";
  if (explicit && explicit !== "/products" && explicit !== "/") return explicit;
  return resolveSlideTarget(opts) ?? "/products";
}

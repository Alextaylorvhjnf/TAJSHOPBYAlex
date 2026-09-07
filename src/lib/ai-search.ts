/**
 * SMART PRODUCT SEARCH for the AI shopping assistant (v19)
 * ---------------------------------------------------------
 * Fixes the two real-world failures of the old naive search:
 *   1. «تلوزیون دارین؟ زیر 20 میلیون» returned PS5 (29M) and S24 Ultra
 *      (79M) — price constraints were ignored and the OR-fallback ranked
 *      by soldCount instead of relevance.
 *   2. «مانیتور گیمینگ LG UltraGear 27 اینچ 240Hz» returned phones —
 *      generic words (اینچ …) matched everything and relevance was ignored.
 *
 * What this module adds:
 *   - Persian price-constraint parser  (زیر/تا/کمتر از … میلیون|هزار|تومان,
 *     بالای/بیشتر از …, بین X و Y) applied to the EFFECTIVE price
 *     (discountPrice ?? price) — in TOMAN.
 *   - Brand + category detection from the live DB (incl. fuzzy edit-distance
 *     ≤1 so «سامسونگ/سامسونگ» and «تلوزیون/تلویزیون» typos still resolve).
 *   - Stop-word stripping (سلام، دارین، میخوام، بگو …) so greetings never
 *     poison the AND-search.
 *   - Relevance scoring: word-boundary > substring > fuzzy(edit-1),
 *     + brand/category bonuses; ranked results instead of soldCount order.
 *
 * Server-only (uses Prisma). Consumed by src/lib/ai.ts (both the LLM tool
 * path and the deterministic no-LLM path), so EVERY answer is correct.
 */

import { db } from "@/lib/db";
import { normalizeFa } from "@/lib/search";
import { serializeProduct, productInclude, type ProductDTO } from "@/lib/product";

// ─────────────────────────── types ───────────────────────────

export type PriceConstraint = { min: number; max: number };

export type SmartSearchResult = {
  /** ranked, price-filtered products (serialized, lightweight fields) */
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice: number | null;
    effectivePrice: number;
    discountPercent: number;
    stock: number;
    category: string;
    brand: string;
    rating: number;
    topSpecs: Record<string, string>;
    /** v22: available color names — lets the widget answer color-specific
     *  questions and track products by color. */
    colors?: string[];
    /** v22: "SIMPLE" | "VARIABLE" — variable products are priced per
     *  color×spec combination. */
    productType?: "SIMPLE" | "VARIABLE";
    /** v22: per-(color×spec) price matrix rows for VARIABLE products —
     *  the widget reports each combination's exact price + stock. */
    combos?: { label: string; price: number; stock: number | null }[];
    /** v20: relevance signal — how many query keywords hit this product.
     *  Used by the deterministic answers to drop weak matches (a Galaxy A55
     *  must never ride along a «Galaxy S24 Ultra 512» query). */
    matchedKeywords: number;
    /** v20: absolute relevance score (word-boundary 3 / substring 2 / typo 1.5) */
    score: number;
  }[];
  /** what the parser understood (shown to the LLM + used for answers) */
  parsed: {
    keywords: string[];
    brand: string | null;
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    /** human-readable constraint, e.g. «زیر ۲۰ میلیون تومان» */
    priceText: string | null;
    /** cleaned display text after filler/price removal */
    cleanText: string;
  };
};

type Args = {
  query?: string;
  category?: string;
  brand?: string;
  maxPrice?: number;
  minPrice?: number;
  inStockOnly?: boolean;
  limit?: number;
};

// ─────────────────────────── stopwords ───────────────────────────

/** Persian/English fillers that must never become search keywords. */
const STOPWORDS = new Set([
  // greetings / politeness
  "سلام", "سلامعلیکم", "درود", "هی", "hello", "hi", "hey", "ممنون", "مرسی", "متشکرم", "لطفا", "لطفاً", "خواهش",
  // question / filler words
  "آیا", "چه", "چی", "چیزی", "چیز", "کدوم", "کدام", "چند", "چندتا", "چنده", "چنداست", "خب", "باشه", "بله", "نه", "انگار",
  "دارین", "دارید", "داره", "داریم", "دارن", "هست", "هستید", "هستم", "هستن", "است", "هستش", "میباشد", "می‌باشد",
  "قیمت", "قیمتش", "قیمتها", "قیمت‌ها", "قیمته", "قیمتهاش", "موجود", "موجوده", "موجودی", "موجودیت", "استوک", "انبار",
  "گرون", "گران", "ارزون", "ارزان", "پیشنهاد", "پیشنهادت", "راهنمایی", "مشاوره", "مشاورهی", "کامل", "درباره", "دربارهی", "راجع",
  // verbs / wants
  "میخوام", "می‌خوام", "میخواهم", "می‌خواهم", "بخوام", "بخواهم", "میخوامم", "بگیرم", "بخرم", "بگو", "بده", "بدهید",
  "نشان", "نشانم", "نشون", "نشونم", "ببینم", "میکنم", "می‌کنم", "کن", "کنید", "کنم", "بنداز", "توصیف", "معرفی", "نگاهی",
  // glue words
  "برای", "با", "بدون", "و", "یا", "از", "در", "به", "که", "را", "هم", "رو", "من", "شما", "ما", "یک", "یه", "اینا", "این", "اون", "همه",
  // v20: split-verb fragments (می خوام written with a space …) — "می" alone
  // substring-matches half the Persian catalog and "خوام" matches nothing,
  // which used to collapse the AND-pass into a noisy OR-pass
  "می", "خوام", "خواستم", "کنم", "کنین", "میکنم", "بشید", "بشم", "باشم", "بذار", "بدید", "بدهید",
  "the", "a", "an", "for", "with", "under", "below", "above", "between", "and", "or", "want", "need", "show", "find", "please", "some", "any",
  // units (consumed by the price parser; never product keywords)
  "میلیون", "هزار", "تومان", "ریال", "ت",
]);

/** words that are meaningful in product names but look like fillers */
const KEEP_AS_KEYWORD = new Set(["برند"]);

function dropStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 0 && !STOPWORDS.has(t) && !KEEP_AS_KEYWORD.has(t));
}

// ─────────────────────────── price parser ───────────────────────────

const NUM = "([0-9]+(?:\\.[0-9]+)?)";
const UNIT = "(میلیون|هزار|تومان|ریال)?";

function toToman(n: number, unit: string | undefined): number {
  switch (unit) {
    case "میلیون": return Math.round(n * 1_000_000);
    case "هزار": return Math.round(n * 1_000);
    case "ریال": return Math.round(n / 10);
    default: return Math.round(n); // bare number = تومان
  }
}

const faNum = (n: number) => n.toLocaleString("fa-IR");

/** Extract price constraints (TOMAN) from normalized text; returns the
 *  constraints plus the text with those phrases removed. */
export function parsePricePhrases(norm: string): {
  min?: number;
  max?: number;
  text: string;
} {
  let min: number | undefined;
  let max: number | undefined;
  let text = norm;

  // 1) بین X و/تا Y
  const betweenRe = new RegExp(`بین\\s*${NUM}\\s*${UNIT}\\s*(?:و|تا)\\s*${NUM}\\s*${UNIT}`);
  const bm = text.match(betweenRe);
  if (bm) {
    const a = toToman(parseFloat(bm[1]), bm[2] || bm[4]);
    const b = toToman(parseFloat(bm[3]), bm[4] || bm[2]);
    min = Math.min(a, b);
    max = Math.max(a, b);
    text = text.replace(bm[0], " ");
  }

  // 2) از X به بالا
  const upRe = new RegExp(`از\\s*${NUM}\\s*${UNIT}\\s*به\\s*بالا`);
  const um = text.match(upRe);
  if (um) {
    min = toToman(parseFloat(um[1]), um[2]);
    text = text.replace(um[0], " ");
  }

  // 3) max: زیر / کمتر از / حداکثر / سقف / تا
  const maxRe = new RegExp(`(?:زیر|کمتر\\s*از|حداکثر|سقف|تا)\\s*${NUM}\\s*${UNIT}`);
  const mm = text.match(maxRe);
  if (mm && (min === undefined || max === undefined)) {
    const v = toToman(parseFloat(mm[1]), mm[2]);
    if (max === undefined) max = v;
    text = text.replace(mm[0], " ");
  }

  // 4) min: بالای / بیشتر از / بالاتر از / بزرگتر از
  const minRe = new RegExp(`(?:بالای|بیشتر\\s*از|بالاتر\\s*از|بزرگتر\\s*از|از)\\s*${NUM}\\s*${UNIT}`);
  const lm = text.match(minRe);
  if (lm && min === undefined) {
    const v = toToman(parseFloat(lm[1]), lm[2]);
    // «از X …» is ambiguous — only treat as a floor when no max was found
    if (max === undefined || /^از/.test(lm[0]) === false) {
      min = v;
      text = text.replace(lm[0], " ");
    }
  }

  return { min, max, text: text.replace(/\s+/g, " ").trim() };
}

// ─────────────────────────── fuzzy matching ───────────────────────────

/** bounded Levenshtein — returns true when distance(a,b) ≤ max. */
function closeEnough(a: string, b: string, max = 1): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  // fast path
  if (a === b) return true;
  const lenA = a.length;
  const lenB = b.length;
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;
  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return false; // early exit
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[lenB] <= max;
}

// ─────────────────────────── brand/category detection ───────────────────────────

/** Persian ↔ English brand aliases (seed catalog brands are latin-named,
 *  customers write them in Persian — and vice versa). */
const BRAND_ALIASES: Record<string, string> = {
  "سامسونگ": "samsung", "اپل": "apple", "ایفون": "apple", "آیفون": "apple", "مک بوک": "apple", "مک‌بوک": "apple",
  "شیائومی": "xiaomi", "شایومی": "xiaomi", "ایسوس": "asus", "لنوو": "lenovo", "سونی": "sony", "پلی استیشن": "sony",
  "مایکروسافت": "microsoft", "ایکس باکس": "microsoft", "انویدیا": "nvidia", "اینتل": "intel",
  "ال جی": "lg", "الجی": "lg", "ال‌جی": "lg", "گوگل": "google", "پیکسل": "google", "انکر": "anker",
  "لاجیتک": "logitech", "اپسون": "epson", "جی بی ال": "jbl", "جیبیال": "jbl", "جی‌بی‌ال": "jbl",
};

/** Persian category synonyms (taxonomy names → what people actually type). */
const CATEGORY_ALIASES: Record<string, string> = {
  "گوشی": "موبایل", "تلفن همراه": "موبایل", "لپ تاپ": "لپ‌تاپ", "لپتاپ": "لپ‌تاپ", "نوت بوک": "لپ‌تاپ", "نوت‌بوک": "لپ‌تاپ",
  "کنسول": "کنسول بازی", "پلی‌استیشن": "کنسول بازی", "ایکس باکس": "کنسول بازی",
  "اسمارت واچ": "ساعت هوشمند", "اسمارت‌واچ": "ساعت هوشمند", "هدست": "هدفون",
  "اس اس دی": "حافظه و ssd", "کارت گرافیک": "قطعات کامپیوتر", "پی اس": "قطعات کامپیوتر",
};

/** model-word synonyms — Persian product words → the latin model keyword
 *  the catalog actually stores (macbook, iphone, playstation …) */
const KEYWORD_SYNONYMS: Record<string, string> = {
  "مک بوک": "macbook", "مک‌بوک": "macbook", "ایفون": "iphone", "آیفون": "iphone",
  "پلی استیشن": "playstation", "پلی‌استیشن": "playstation", "ایکس باکس": "xbox",
  "گلکسی": "galaxy", "پیکسل": "pixel", "واچ": "watch",
};

/** remove spaces + ZWNJ so «لپ تاپ» ≈ «لپ‌تاپ» */
function squash(s: string): string {
  return s.replace(/[\s\u200c]/g, "");
}

type TaxonomyLists = {
  brands: { id: string; name: string; norm: string }[];
  categories: { id: string; name: string; slug: string; norm: string; tokens: string[] }[];
};

let taxonomyCache: { at: number; data: TaxonomyLists } | null = null;
const TAXONOMY_TTL = 60_000;

async function getTaxonomy(): Promise<TaxonomyLists> {
  if (taxonomyCache && Date.now() - taxonomyCache.at < TAXONOMY_TTL) return taxonomyCache.data;
  const [brands, categories] = await Promise.all([
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.category.findMany({ where: { isActive: true, parentId: null }, select: { id: true, name: true, slug: true } }),
  ]);
  const data: TaxonomyLists = {
    brands: brands.map((b) => ({ id: b.id, name: b.name, norm: normalizeFa(b.name) })),
    categories: categories.map((c) => {
      const norm = normalizeFa(c.name);
      return { id: c.id, name: c.name, slug: c.slug, norm, tokens: norm.split(" ").filter(Boolean) };
    }),
  };
  taxonomyCache = { at: Date.now(), data };
  return data;
}

function hasWord(haystackTokens: string[], needle: string): boolean {
  return haystackTokens.includes(needle);
}

/** detect brand/category inside the query tokens (incl. edit-distance ≤1 and
 *  Persian↔English aliases); returns matches + the tokens they consumed so
 *  they can be removed from the keyword list */
async function detectTaxonomy(tokens: string[], explicit?: { brand?: string; category?: string }) {
  const tax = await getTaxonomy();
  const result: {
    brand: { id: string; name: string } | null;
    category: { id: string; name: string; slug: string } | null;
    consumedTokens: Set<string>;
  } = { brand: null, category: null, consumedTokens: new Set() };

  // explicit (LLM-provided) wins
  if (explicit?.brand) {
    const norm = normalizeFa(explicit.brand);
    const b = tax.brands.find((x) => x.norm === norm || x.norm.includes(norm) || norm.includes(x.norm));
    if (b) result.brand = { id: b.id, name: b.name };
  }
  if (explicit?.category) {
    const norm = normalizeFa(explicit.category);
    const c = tax.categories.find((x) => squash(x.norm) === squash(norm) || x.norm.includes(norm) || norm.includes(x.norm));
    if (c) result.category = { id: c.id, name: c.name, slug: c.slug };
  }

  const tokenSet = tokens;
  const querySquashed = squash(tokens.join(" "));

  if (!result.brand) {
    outer: for (const b of tax.brands) {
      if (b.norm.length < 2) continue;
      // 1) the brand name itself (multi-word must appear fully)
      const brandWords = b.norm.split(" ");
      if (brandWords.every((w) => hasWord(tokenSet, w) || tokenSet.some((t) => t.includes(w)))) {
        result.brand = { id: b.id, name: b.name };
        brandWords.forEach((w) => result.consumedTokens.add(w));
        break;
      }
      // 2) a Persian/English alias for this brand (سامسونگ → samsung …)
      for (const [alias, target] of Object.entries(BRAND_ALIASES)) {
        if (squash(target) !== squash(b.norm)) continue;
        const aliasWords = normalizeFa(alias).split(" ").filter(Boolean);
        if (aliasWords.length === 1) {
          if (tokenSet.some((t) => t === aliasWords[0] || (aliasWords[0].length >= 4 && closeEnough(t, aliasWords[0], 1)))) {
            result.brand = { id: b.id, name: b.name };
            result.consumedTokens.add(aliasWords[0]);
            break outer;
          }
        } else if (aliasWords.every((w) => hasWord(tokenSet, w))) {
          result.brand = { id: b.id, name: b.name };
          aliasWords.forEach((w) => result.consumedTokens.add(w));
          break outer;
        }
      }
      // 3) latin single-word brand with typo tolerance
      if (brandWords.length === 1 && b.norm.length >= 4 && tokenSet.some((t) => t.length >= 4 && closeEnough(t, b.norm, 1))) {
        result.brand = { id: b.id, name: b.name };
        result.consumedTokens.add(b.norm);
        break;
      }
    }
  }

  if (!result.category) {
    // 1) full containment of the category phrase (ZWNJ/space-insensitive)
    for (const c of tax.categories) {
      const catSquashed = squash(c.norm);
      if (catSquashed.length >= 3 && querySquashed.includes(catSquashed)) {
        result.category = { id: c.id, name: c.name, slug: c.slug };
        c.tokens.forEach((w) => result.consumedTokens.add(w));
        break;
      }
    }
  }
  if (!result.category) {
    outer2: for (const c of tax.categories) {
      // 2) significant single tokens incl. typos (موبایل، مانیتور …)
      const sig = c.tokens.filter((w) => w.length >= 4);
      for (const w of sig) {
        if (tokenSet.some((t) => t === w || (t.length >= 4 && closeEnough(t, w, 1)))) {
          result.category = { id: c.id, name: c.name, slug: c.slug };
          result.consumedTokens.add(w);
          break outer2;
        }
      }
    }
  }
  if (!result.category) {
    // 3) category aliases (گوشی → موبایل, لپ تاپ → لپ‌تاپ …)
    for (const [alias, target] of Object.entries(CATEGORY_ALIASES)) {
      const targetCat = tax.categories.find((c) => squash(c.norm) === squash(normalizeFa(target)));
      if (!targetCat) continue;
      const aliasWords = normalizeFa(alias).split(" ").filter(Boolean);
      const present = aliasWords.length === 1
        ? tokenSet.some((t) => t === aliasWords[0] || (aliasWords[0].length >= 4 && closeEnough(t, aliasWords[0], 1)))
        : aliasWords.every((w) => hasWord(tokenSet, w));
      if (present) {
        result.category = { id: targetCat.id, name: targetCat.name, slug: targetCat.slug };
        aliasWords.forEach((w) => result.consumedTokens.add(w));
        break;
      }
    }
  }
  return result;
}

// ─────────────────────────── scoring ───────────────────────────

/** how many DISTINCT keywords actually hit this product (v20 — powers
 *  relevance gating in the deterministic answers: a query for «Galaxy S24
 *  Ultra 512» must not be padded with a Galaxy A55 that only matches the
 *  generic words گوشی/ظرفیت/گیگابایت). */
function scoreProduct(p: { searchText: string; name: string }, keywords: string[]): { score: number; matched: number } {
  const hay = `${p.searchText} ${normalizeFa(p.name)}`;
  const hayTokens = hay.split(/\s+/).filter(Boolean);
  let score = 0;
  let matched = 0;
  for (const k of keywords) {
    if (k.length < 2) continue;
    if (new RegExp(`(^|\\s)${escapeRe(k)}($|\\s)`).test(hay)) {
      score += 3; // exact word-boundary hit
      matched++;
    } else if (hay.includes(k)) {
      score += 2; // substring hit ( UltraGear inside name )
      matched++;
    } else if (k.length >= 4 && hayTokens.some((t) => t.length >= 4 && closeEnough(t, k, 1))) {
      score += 1.5; // typo hit ( تلوزیون ≈ تلویزیون )
      matched++;
    }
  }
  return { score, matched };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────── main entry ───────────────────────────

export async function smartSearchProducts(args: Args): Promise<SmartSearchResult> {
  const limit = Math.min(12, Math.max(1, Number(args.limit) || 8));
  const raw = normalizeFa(args.query ?? "");
  const priceParsed = parsePricePhrases(raw);

  // explicit constraints (from the LLM) override parsed ones
  const minPrice = Number(args.minPrice) > 0 ? Math.round(Number(args.minPrice)) : priceParsed.min ?? null;
  const maxPrice = Number(args.maxPrice) > 0 ? Math.round(Number(args.maxPrice)) : priceParsed.max ?? null;

  // keywords: price-stripped text minus detected brand/category words minus stopwords
  const keywordText = priceParsed.text.replace(/[؟?!.،,«»"'\u200c()؛:;[\]]+/g, " ").replace(/\s+/g, " ").trim();
  const preTokens = keywordText.split(" ").filter(Boolean);

  const detected = await detectTaxonomy(preTokens, { brand: args.brand, category: args.category });
  const consumed = detected.consumedTokens;
  const brandNorm = detected.brand ? normalizeFa(detected.brand.name) : null;

  // Persian model words → latin catalog keywords (مک بوک → macbook …)
  const synonymKeywords = new Set<string>();
  for (const [src, dst] of Object.entries(KEYWORD_SYNONYMS)) {
    const words = normalizeFa(src).split(" ").filter(Boolean);
    if (words.length > 0 && words.every((w) => preTokens.includes(w))) {
      synonymKeywords.add(dst);
      words.forEach((w) => consumed.add(w));
    }
  }

  const keywords = [
    ...dropStopwords(
      preTokens.filter((t) => {
        if (consumed.has(t)) return false;
        if (brandNorm && brandNorm.split(" ").includes(t)) return false;
        return true;
      })
    ),
    ...synonymKeywords,
  ];

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (args.inStockOnly) where.stock = { gt: 0 };
  if (detected.brand) where.brandId = detected.brand.id;
  if (detected.category) where.categoryId = detected.category.id;

  // candidate passes: AND(all keywords) → OR(any keyword) → taxonomy-only
  let candidates: Awaited<ReturnType<typeof fetchRows>> = [];
  if (keywords.length > 0) {
    candidates = await fetchRows({
      AND: [where as never, ...keywords.map((t) => ({ searchText: { contains: t } })) as never] as never,
    });
  }
  if (candidates.length === 0 && keywords.length > 0) {
    candidates = await fetchRows({
      AND: [where as never, { OR: keywords.map((t) => ({ searchText: { contains: t } })) as never }] as never,
    }, 240);
  }
  if (candidates.length === 0 && (detected.brand || detected.category)) {
    candidates = await fetchRows(where as never, 120);
  }
  if (candidates.length === 0 && keywords.length > 0) {
    // last resort: keyword OR without taxonomy restriction
    candidates = await fetchRows({
      status: "PUBLISHED",
      OR: keywords.map((t) => ({ searchText: { contains: t } })) as never,
    } as never, 120);
  }
  if (candidates.length === 0 && keywords.length > 0) {
    // v19 fuzzy pass — handles typos like «تلوزیون» ≈ «تلویزیون» that SQL
    // LIKE can never match: score a lightweight scan of the catalog, then
    // hydrate only the winners as full rows.
    const light = await db.product.findMany({
      where: { status: "PUBLISHED", ...(args.inStockOnly ? { stock: { gt: 0 } } : {}) } as never,
      select: { id: true, name: true, searchText: true, soldCount: true },
      orderBy: { soldCount: "desc" },
      take: 600,
    });
    const scored = light
      .map((r) => {
        const s = scoreProduct(r, keywords);
        return { id: r.id, score: s.score };
      })
      .filter((s) => s.score >= 1.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit + 4);
    if (scored.length > 0) {
      candidates = await db.product.findMany({
        where: { id: { in: scored.map((s) => s.id) } },
        include: productInclude,
      }) as unknown as CandidateRow[];
    }
  }

  // score → price filter → rank
  const priced = candidates.map((p) => {
    const dto = serializeProduct(p);
    const s = scoreProduct(p, keywords);
    return { dto, score: s.score, matched: s.matched };
  });

  const keywordThreshold = keywords.length > 0 ? 1.4 : 0; // require ≥1 real hit (or fuzzy)
  let ranked = priced
    .filter(({ score }) => score >= keywordThreshold)
    .sort((a, b) => b.score - a.score || b.dto.soldCount - a.dto.soldCount);

  // if strict keyword scoring wiped everything out, fall back to scored OR set
  if (ranked.length === 0 && priced.length > 0) {
    ranked = priced.sort((a, b) => b.score - a.score || b.dto.soldCount - a.dto.soldCount);
  }

  // price filter — ALWAYS enforced on the effective price
  if (minPrice != null || maxPrice != null) {
    const inRange = ranked.filter(({ dto }) => {
      const eff = dto.effectivePrice;
      return (minPrice == null || eff >= minPrice!) && (maxPrice == null || eff <= maxPrice!);
    });
    // keep price-filtered results only if the user actually asked for a
    // price window (parsed from their text) — never silently return junk
    if (inRange.length > 0 || priceParsed.min != null || priceParsed.max != null) {
      ranked = inRange;
    }
  }

  const products = ranked.slice(0, limit).map(({ dto, score, matched }) => ({
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    price: dto.price,
    discountPrice: dto.discountPrice,
    effectivePrice: dto.effectivePrice,
    discountPercent: dto.discountPercent,
    stock: dto.stock,
    category: dto.category.name,
    brand: dto.brand.name,
    rating: dto.rating,
    topSpecs: Object.fromEntries(dto.specifications.slice(0, 6).map((s) => [s.label, s.value])),
    // v22: colors + per-combination prices (additive — consumers that don't
    // use them simply ignore them)
    colors: dto.colors.map((c) => c.name),
    productType: dto.productType,
    combos:
      dto.productType === "VARIABLE" && dto.combinations.length > 0
        ? dto.combinations.slice(0, 8).map((c) => ({
            label: [c.color, c.variant].filter(Boolean).join(" / "),
            price: c.price,
            stock: c.stock ?? null,
          }))
        : [],
    matchedKeywords: matched,
    score: Math.round(score * 10) / 10,
  }));

  let priceText: string | null = null;
  if (minPrice != null && maxPrice != null) priceText = `از ${faNum(minPrice)} تا ${faNum(maxPrice)} تومان`;
  else if (maxPrice != null) priceText = `زیر ${faNum(maxPrice)} تومان`;
  else if (minPrice != null) priceText = `بالای ${faNum(minPrice)} تومان`;

  const cleanText = keywords.join(" ").trim();

  return {
    products,
    parsed: {
      keywords,
      brand: detected.brand?.name ?? null,
      category: detected.category?.name ?? null,
      minPrice,
      maxPrice,
      priceText,
      cleanText,
    },
  };
}

// helper typing for candidate rows (Product + includes)
type CandidateRow = {
  searchText: string;
  name: string;
  soldCount: number;
} & Parameters<typeof serializeProduct>[0];

async function fetchRows(where: unknown, take = 60): Promise<CandidateRow[]> {
  return db.product.findMany({
    where: where as never,
    include: productInclude,
    orderBy: { soldCount: "desc" },
    take,
  }) as unknown as Promise<CandidateRow[]>;
}

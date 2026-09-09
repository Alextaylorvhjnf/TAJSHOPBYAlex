/**
 * v5-f · PER-TEMPLATE CONTENT MODEL (Admin → ظاهر → «محتوای اختصاصی قالب»)
 * ---------------------------------------------------------------------------
 * Every one of the 25 storefront templates can carry its OWN dedicated
 * slides, showcases, texts, links and brand — stored as one JSON blob per
 * template in the `TemplateContent` table and editable from the admin
 * appearance page. While a template is active (or admin-previewed via
 * /?template=<id>), its template-specific values WIN over the shared global
 * entities (Slider / PromotionalShowcase / StoreSettings brand); every empty
 * field falls back to the global value.
 *
 * This module is PURE (client-safe: only zod + type imports — the db is
 * imported lazily inside the async server helper), so the admin editor can
 * import the types/schemas while the storefront imports the merge helpers.
 */

import { z } from "zod";
import type { HomeData, TemplateStore } from "./types";

// ─────────────────────────── content types ───────────────────────────

/** one admin-editable hero/slider slide of THIS template */
export type TemplateSlide = {
  /** image URL (uploaded via /api/upload or a local /uploads path) */
  image: string;
  title?: string;
  subtitle?: string;
  /** optional link target (internal path or https URL) */
  link?: string;
  /** v32: per-slide countdown — templates that render hero slides show a
   *  ticking chip (روز/ساعت/دقیقه/ثانیه) over the slide when enabled. */
  countdownEnabled?: boolean;
  /** ISO datetime the countdown counts down to (requires countdownEnabled) */
  countdownTarget?: string;
  /** short label next to the digits, e.g. «تخفیف بهاره» */
  countdownLabel?: string;
  /** v32: slide VIDEO (mp4/webm/mov ≤100MB via /api/upload folder=sliders) —
   *  when set, the storefront renders a muted autoplay-loop <video> with the
   *  image as poster instead of the static artwork. */
  videoUrl?: string;
};

/** one admin-editable showcase artwork of THIS template */
export type TemplateShowcase = {
  image: string;
  title?: string;
  link?: string;
};

/** a plain CTA/link chip (e.g. rendered next to the hero CTAs) */
export type TemplateLink = { label: string; url: string };

/**
 * free-form copy overrides keyed by well-known keys — each template decides
 * which keys it honors (gaming-cyber: heroTitle / heroSubtitle / ctaLabel).
 */
export type TemplateTexts = Record<string, string>;

/** the template's own brand presentation */
export type TemplateBrand = {
  name?: string;
  tagline?: string;
  logoImage?: string;
};

/** the whole per-template content blob (all sections optional) */
export type TemplateContentData = {
  slides?: TemplateSlide[];
  showcases?: TemplateShowcase[];
  texts?: TemplateTexts;
  links?: TemplateLink[];
  brand?: TemplateBrand;
};

// ─────────────────────────── zod schemas ───────────────────────────
// Strict versions validate the admin PUT payload (unknown keys dropped,
// Persian error messages); the lenient sanitizer below cleans stored JSON.

export const templateSlideSchema = z.object({
  image: z
    .string({ error: "تصویر اسلاید الزامی است" })
    .trim()
    .min(1, "تصویر اسلاید الزامی است")
    .max(1000),
  title: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(300).optional(),
  link: z.string().trim().max(1000).optional(),
  countdownEnabled: z.boolean().optional(),
  countdownTarget: z
    .string()
    .trim()
    .max(40)
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "زمان شمارش معکوس نامعتبر است")
    .optional(),
  countdownLabel: z.string().trim().max(120).optional(),
  videoUrl: z.string().trim().max(1000).optional(),
});

export const templateShowcaseSchema = z.object({
  image: z
    .string({ error: "تصویر شوکیس الزامی است" })
    .trim()
    .min(1, "تصویر شوکیس الزامی است")
    .max(1000),
  title: z.string().trim().max(200).optional(),
  link: z.string().trim().max(1000).optional(),
});

export const templateLinkSchema = z.object({
  label: z
    .string({ error: "عنوان لینک الزامی است" })
    .trim()
    .min(1, "عنوان لینک الزامی است")
    .max(120),
  url: z
    .string({ error: "آدرس لینک الزامی است" })
    .trim()
    .min(1, "آدرس لینک الزامی است")
    .max(1000),
});

export const templateTextsSchema = z.record(
  z.string().trim().min(1).max(64),
  z.string().trim().max(600),
);

export const templateBrandSchema = z.object({
  name: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(300).optional(),
  logoImage: z.string().trim().max(1000).optional(),
});

export const templateContentSchema = z.object({
  slides: z.array(templateSlideSchema).max(16, "حداکثر ۱۶ اسلاید").optional(),
  showcases: z.array(templateShowcaseSchema).max(16, "حداکثر ۱۶ شوکیس").optional(),
  texts: templateTextsSchema.optional(),
  links: z.array(templateLinkSchema).max(24, "حداکثر ۲۴ لینک").optional(),
  brand: templateBrandSchema.optional(),
});

// ─────────────────── v32 · per-template DESIGNED defaults ───────────────────
// Extracted from each template's own designed copy (src/components/store/
// templates/*.tsx) so the admin editor is NEVER empty: inputs pre-fill with
// stored override → designed default (below) → global entity value. These
// defaults are PRESENTATION-ONLY — the render pipeline is unchanged (template
// non-empty wins over global; empty falls back to the global entities).

export type TemplateTextMeta = {
  /** Persian label of the key (what the admin edits) */
  label: string;
  /** where this value shows up on the storefront (short Persian sentence) */
  where?: string;
};

/** the 17 keys gaming-cyber reads from templateContent.texts (v32 redesign) */
export const GAMING_TEXT_KEYS: Record<string, TemplateTextMeta> = {
  heroTitle: { label: "تیتر هیرو", where: "هیرو اصلی بالای صفحه — سمت راست ریگ ARGB" },
  heroSubtitle: { label: "زیرتیتر هیرو", where: "متن توضیحی زیر تیتر هیرو" },
  ctaLabel: { label: "دکمهٔ اصلی", where: "دکمهٔ لیمویی کنار هیرو" },
  arenaTitle: { label: "تیتر آرنا", where: "تیتر بخش «اسطوره‌های آرنا»" },
  arenaSubtitle: { label: "زیرتیتر آرنا", where: "زیرتیتر هدر HUD بخش آرنا" },
  arenaImage: { label: "تصویر آرنا", where: "قاب تصویر بزرگ بخش آرنا" },
  gearTitle: { label: "تیتر تجهیزات", where: "تیتر بخش «تجهیزات ARGB»" },
  gearSubtitle: { label: "زیرتیتر تجهیزات", where: "زیرتیتر هدر HUD تجهیزات" },
  gearImage: { label: "تصویر تجهیزات", where: "بنر عریض ریگ ARGB بخش تجهیزات" },
  dealTitle: { label: "تیتر منطقهٔ تخفیف", where: "تیتر بخش DEAL ZONE" },
  dealSubtitle: { label: "زیرتیتر تخفیف", where: "زیرتیتر هدر HUD منطقهٔ تخفیف" },
  dealImage: { label: "تصویر منطقهٔ تخفیف", where: "تصویر کنار بلوک‌های تخفیف" },
  joinTitle: { label: "تیتر بخش عضویت", where: "تیتر بنر CONNECT (بنرشویی بنفش)" },
  joinText: { label: "متن بخش عضویت", where: "متن توضیحی بنر CONNECT" },
  joinCtaLabel: { label: "دکمهٔ شروع چت", where: "دکمهٔ گرد بنر CONNECT" },
  joinCtaUrl: { label: "لینک دکمهٔ عضویت", where: "مقصد دکمهٔ بنر CONNECT (پیش‌فرض: باز کردن چت)" },
  aiWidgetImage: { label: "تصویر ویجت هوش مصنوعی", where: "تصویر کنار ویجت مشاور هوش مصنوعی" },
};

/** generic labels shared by the templates that honor the classic keys */
const COMMON_TEXT_META: Record<string, TemplateTextMeta> = {
  heroTitle: { label: "تیتر هیرو", where: "تیتر اصلی هیرو (اولین بخش صفحهٔ اصلی)" },
  heroSubtitle: { label: "زیرتیتر هیرو", where: "متن توضیحی زیر تیتر هیرو" },
  ctaLabel: { label: "دکمهٔ اصلی", where: "دکمهٔ اصلی کنار هیرو" },
  secondaryCtaLabel: { label: "دکمهٔ دوم هیرو", where: "دکمهٔ فرعی کنار هیرو" },
  heroBadge: { label: "نشان هیرو", where: "چیپ کوچک بالای تیتر هیرو" },
  dealsTitle: { label: "تیتر بخش تخفیف‌ها", where: "تیتر بخش پیشنهادهای تخفیف‌دار" },
  dealsSubtitle: { label: "زیرتیتر بخش تخفیف‌ها", where: "زیرتیتر بخش تخفیف‌ها" },
  exclusiveTitle: { label: "تیتر بخش انحصاری‌ها", where: "تیتر بخش محصولات انحصاری" },
  bestsellersTitle: { label: "تیتر بخش پرفروش‌ها", where: "تیتر بخش پرفروش‌ترین‌ها" },
  newestTitle: { label: "تیتر بخش تازه‌ها", where: "تیتر بخش جدیدترین محصولات" },
  storiesTitle: { label: "تیتر بخش استوری‌ها", where: "تیتر نوار استوری‌ها" },
  aiTitle: { label: "تیتر مشاور هوش مصنوعی", where: "تیتر بخش چت/مشاور خرید" },
};

/** per-template key → { label, where } (gaming's exact map + generic map for
 *  the rest; unknown keys fall back to the key itself in the editor) */
export const TEMPLATE_TEXT_META: Record<string, Record<string, TemplateTextMeta>> = {
  "gaming-cyber": GAMING_TEXT_KEYS,
  "modern-tech": {
    ...COMMON_TEXT_META,
    ctaLabel: { label: "دکمهٔ اصلی", where: "دکمهٔ اصلی روی اسلایدر هیرو" },
    heroTitle: { label: "تیتر هیرو", where: "تیتر اسلایدر تمام‌صفحهٔ بالای صفحه (وقتی اسلاید بدون عنوان باشد)" },
  },
  "novatrend-clean": COMMON_TEXT_META,
  "luxury-electronics": COMMON_TEXT_META,
  "minimal-premium": COMMON_TEXT_META,
  "future-3d": COMMON_TEXT_META,
  "neon-noir": COMMON_TEXT_META,
  "glass-morphism": COMMON_TEXT_META,
  "startup-light": COMMON_TEXT_META,
  "superstore-grid": COMMON_TEXT_META,
  "flash-deals": COMMON_TEXT_META,
  marketplace: COMMON_TEXT_META,
};

/** Persian “where does this appear” hints for the slides/showcases tabs */
export type TemplateContentHints = { slides: string; showcases: string };

export const TEMPLATE_CONTENT_HINTS: Record<string, TemplateContentHints> = {
  "modern-tech": {
    slides: "اسلایدها در اسلایدر تمام‌صفحهٔ هیرو با عنوان، زیرعنوان و دکمهٔ CTA رندر می‌شوند (تغییرپذیر با شمارش معکوس و ویدیو).",
    showcases: "شوکیس‌ها کارت‌های «کمپین‌های ویژه» در میانهٔ صفحه می‌سازند.",
  },
  "gaming-cyber": {
    slides: "هیرو گیمینگ ریگ ARGB رسم‌شده با کد است؛ تصاویر اختصاصی (آرنا/تجهیزات/تخفیف/ویجت) از تب «متن‌ها» مدیریت می‌شوند.",
    showcases: "شوکیس‌ها کاشی‌های اسپات‌لایت ARGB را جایگزین می‌کنند (هد صورتی/تاکتیکال/فن/کیبورد).",
  },
  "novatrend-clean": {
    slides: "اسلاید اول در قاب حباب کورال هیرو (وقتی محصول هیرو انتخاب نشده باشد) و اسلایدهای ۲ و ۳ به‌عنوان بنرهای کوچک رندر می‌شوند.",
    showcases: "شوکیس‌ها دو بنر بزرگ «پروموی کورال/مشکی» در بخش بنرهای تبلیغاتی می‌سازند.",
  },
  "luxury-electronics": {
    slides: "اسلاید اول در قاب طلایی هیرو تمام‌عرض با تیتر گرادیانی و افکت شاین رندر می‌شود.",
    showcases: "شوکیس‌ها کارت‌های پرموی شیشه‌ای این قالب را جایگزین می‌کنند.",
  },
  "minimal-premium": {
    slides: "اسلاید اول داخل پنل شیشه‌ای هیرو (وقتی محصول هیرو نباشد) با گوشه‌های نرم نمایش داده می‌شود.",
    showcases: "شوکیس‌ها بخش «ویترین‌ها» (کد ۰۷) را پر می‌کنند.",
  },
  "future-3d": {
    slides: "اسلاید اول پس‌زمینهٔ محو هیرو سه‌بعدی است؛ اسلایدهای بعدی در ریل اسلایدها رندر می‌شوند.",
    showcases: "شوکیس‌ها کارت‌های تیلت سه‌بعدی این قالب را جایگزین می‌کنند.",
  },
  "neon-noir": {
    slides: "اسلایدها در اسلایدر نئونی تمام‌عرض با افکت فلیکر روی آخرین کلمهٔ عنوان رندر می‌شوند.",
    showcases: "شوکیس‌ها کارت‌های پرموی با حاشیهٔ نئون می‌سازند.",
  },
  "glass-morphism": {
    slides: "اسلاید اول در پنجرهٔ شیشه‌ای شناور هیرو و اسلایدهای بعدی در ریل بنرهای افقی نمایش داده می‌شوند.",
    showcases: "شوکیس‌ها کارت‌های شیشه‌ای داک ناوبری را جایگزین می‌کنند.",
  },
  "startup-light": {
    slides: "اسلاید اول در کارت مربعی هیرو با تیتر گرادیانی، زیرعنوان و دکمهٔ خرید رندر می‌شود.",
    showcases: "شوکیس‌ها کارت‌های گرد گرادیانی بخش پرمو را می‌سازند.",
  },
  "superstore-grid": {
    slides: "این قالب اسلایدر ندارد — هیرو از داغ‌ترین تخفیف ساخته می‌شود؛ شوکیس‌ها نوار پرموی سوپرمارکت را پر می‌کنند.",
    showcases: "شوکیس‌ها تا ۴ کاشی پرموی زرد/قرمز در بخش پرموشن می‌سازند.",
  },
  "flash-deals": {
    slides: "این قالب اسلایدر ندارد — هیرو از داغ‌ترین پیشنهاد فلش ساخته می‌شود.",
    showcases: "شوکیس‌ها دو کارت پرموی بزرگ زیر باند فروش فلش می‌سازند.",
  },
  marketplace: {
    slides: "این قالب اسلایدر ندارد — «پیشنهاد روز» از محصول برتر ساخته می‌شود.",
    showcases: "شوکیس‌ها کارت‌های پرموی شیشه‌ای مارکت را جایگزین می‌کنند.",
  },
};

/** designed default content per template (the editor pre-fills from this) */
export const DEFAULT_TEMPLATE_CONTENT: Record<string, Partial<TemplateContentData>> = {
  "gaming-cyber": {
    texts: {
      heroTitle: "آرنای خرید گیمرهای حرفه‌ای",
      heroSubtitle:
        "ریگ ARGB رویایی‌ات را همین‌جا بچین — کیس شیشه‌ای، فن‌های نورانی و کارت گرافیک قدرتمند؛ با قیمت رقابتی و ارسال سریع.",
      ctaLabel: "ورود به آرنا",
      arenaTitle: "اسطوره‌های آرنا",
      arenaSubtitle: "کلکسیون گیمینگ تاج — با نور ARGB مثل هیچ‌جای دیگر",
      arenaImage: "/images/gaming/anime-rig.png",
      gearTitle: "تجهیزات ARGB",
      gearSubtitle: "نور آرین‌کمانی روی میز گیمینگ شما — کیبورد، کیس، ماوس‌پد، صندلی و…",
      gearImage: "/images/gaming/argb-rig.png",
      dealTitle: "منطقه تخفیف",
      dealSubtitle: "تخفیف‌های داغ آرنا",
      dealImage: "/images/gaming/vice-girl.png",
      joinTitle: "به آرنای تاج بپیوند",
      joinText:
        "کوپایلوت هوشمند تاج به انبار و قیمت‌های واقعی وصل است؛ ریگ کامل بچین، تجهیزات را مقایسه کن یا سفارشت را پیگیری کن — همه با یک چت، ۲۴ ساعته.",
      joinCtaLabel: "شروع چت با کوپایلوت",
      joinCtaUrl: "#chat",
      aiWidgetImage: "/images/gaming/stream-girl.png",
    },
  },
  "modern-tech": {
    texts: {
      heroTitle: "مقصد بعدی شما برای خرید کالای دیجیتال",
      heroSubtitle: "همیشه به‌روز، همیشه اصیل — پرچمدارها و گجت‌های روز دنیا با ضمانت اصالت.",
      ctaLabel: "مشاهده محصولات",
      dealsTitle: "پیشنهادهای ویژه",
      dealsSubtitle: "تخفیف‌های شگفت‌انگیز با زمان‌سنج زنده — فرصت بعدی همین حالا",
      exclusiveTitle: "انتخاب‌های انحصاری",
      bestsellersTitle: "پرفروش‌ترین‌ها",
      newestTitle: "جدیدترین‌ها",
    },
  },
  "novatrend-clean": {
    texts: {
      heroTitle: "سفیدِ خالص، یک قطره کورال",
      heroSubtitle: "انتخاب‌های شارژ این هفته را ببین؛ حراج‌های قرمز و پرفروش‌های طلایی منتظرت هستند.",
      ctaLabel: "شروع خرید",
      secondaryCtaLabel: "حراج قرمز",
      newestTitle: "تازه‌های رسیده",
      bestsellersTitle: "پرفروش‌های طلایی",
      dealsTitle: "حراج قرمز نواترند",
    },
  },
  "luxury-electronics": {
    texts: {
      heroTitle: "تجربه‌ای لوکس از الکترونیکس",
      heroSubtitle: "گزیدهٔ محصولات لوکس از برندهای معتبر جهانی — با وقارِ مشکی و طلایی.",
      ctaLabel: "مشاهده مجموعه",
      storiesTitle: "ویترین استوری",
    },
  },
  "minimal-premium": {
    texts: {
      heroTitle: "کمتر، اما بهتر.",
      heroSubtitle: "هر کالای این فروشگاه با معیارهای سخت‌گیرانهٔ ما انتخاب شده است — بدون حاشیه، فقط کیفیت.",
      ctaLabel: "مشاهدهٔ محصولات",
      secondaryCtaLabel: "تخفیف‌دارها",
    },
    brand: { tagline: "کمتر، اما بهتر." },
  },
  "future-3d": {
    texts: {
      heroBadge: "تجربه خرید نسل بعد",
      heroTitle: "آینده را در سه‌بُعد لمس کنید",
      heroSubtitle: "دیجیتال‌ترین فروشگاه الکترونیک — کالاها در مدار نئون.",
      ctaLabel: "ورود به دنیای محصولات",
      secondaryCtaLabel: "استوری‌های زنده",
    },
  },
  "neon-noir": {
    texts: {
      heroTitle: "خرید شبانهٔ وایس‌سیتی",
      heroSubtitle: "نئون‌ها روشن‌اند؛ تخفیف‌ها تا آخرین لحظهٔ شب می‌سوزند.",
      ctaLabel: "ورود به وایس‌سیتی",
      secondaryCtaLabel: "قیمت‌های داغ امشب",
      aiTitle: "مشاور نیمه‌شب",
    },
  },
  "glass-morphism": {
    texts: {
      heroBadge: "تجربه خرید نئو-گلس",
      heroTitle: "ویترینی که تکنولوژی را مثل فیلم نشان می‌دهد",
      heroSubtitle: "پنل‌های شیشه‌ای شناور، نور سینمایی و یک لمس قرمز — تجربهٔ خرید نئو-گلس.",
      ctaLabel: "شروع خرید",
      secondaryCtaLabel: "تخفیف‌های داغ",
    },
  },
  "startup-light": {
    texts: {
      heroTitle: "تکنولوژی را گرم و روشن بخرید",
      heroSubtitle: "دستگاه‌های هوشمند را با مشاورهٔ واقعی، قیمت شفاف و ارسال سریع تهیه کنید.",
      ctaLabel: "شروع خرید",
      secondaryCtaLabel: "تخفیف‌های داغ",
      dealsTitle: "تخفیف‌های فعال این هفته",
    },
  },
  "superstore-grid": {
    texts: {
      heroBadge: "فروش فلش سوپرمارکت",
      heroTitle: "قیمت بمبی سوپرمارکت دیجیتال",
      heroSubtitle: "تخفیف‌های زرد و قرمز با شمارش معکوس — سبک تا ۲۴ ساعت ارسال.",
      ctaLabel: "قیمت بمبی — بزن بریم!",
      secondaryCtaLabel: "همهٔ تخفیف‌ها",
    },
  },
  "flash-deals": {
    texts: {
      heroTitle: "فروش فلش",
      heroSubtitle: "قیمت‌ها ذوب شده‌اند — موجودی‌ها ذوب می‌شوند",
      ctaLabel: "دیدن تخفیف‌ها",
    },
  },
  marketplace: {
    texts: {
      heroBadge: "پیشنهاد روز مارکت",
      heroTitle: "پیشنهاد روز مارکت",
      heroSubtitle: "شبکهٔ چگال قیمت‌محور — همهٔ برندها با نقطه‌های وضعیت نئون.",
      ctaLabel: "خرید در یک ثانیه",
    },
  },
  /* the remaining templates carry at least the designed brand tagline so the
   * brand tab pre-fills too (their heroes stay data-driven by design) */
  "social-commerce": { brand: { tagline: "سوشال نئون فید — استوری‌ها و پست‌های محصول" } },
  autumn: { brand: { tagline: "اتام گلس — شب پاییزی گرم با هاله‌های کهربایی" } },
  christmas: { brand: { tagline: "وینتر سایبر — شفق قطبی و شمارش معکوس کریسمس" } },
  "yalda-night": { brand: { tagline: "یلدا سایبر — آسمان پرستارهٔ نیمه‌شب" } },
  "art-deco": { brand: { tagline: "دِکو نئون — شکوه دههٔ ۲۰ با خطوط طلایی" } },
  "retro-vintage": { brand: { tagline: "رترو-فیوچر — کاغذ نیم‌تون با نئون کهربایی" } },
  "editorial-magazine": { brand: { tagline: "ادیتوریال فیوچر — تایپ نمایشی مشکی" } },
  "print-catalog": { brand: { tagline: "هولو کاتالوگ — برگه‌های کاغذی با مُهر فویل" } },
  "mobile-first-pwa": { brand: { tagline: "پرمیوم ریسپانسیو — تجربه‌ای یکپارچه از موبایل تا مانیتور" } },
  "nexora-tech": { brand: { tagline: "نکسورا سایبر-مینیمال — بنفش لاوندر و لیمویی الکتریکی" } },
  "techhub-dark": { brand: { tagline: "تک-فیوچریزم — تضاد سینمایی تاریک/روشن" } },
  "purple-mall": { brand: { tagline: "پرپل نئون مال — کاروسل حلقهٔ نئونی" } },
  "nova-glass": { brand: { tagline: "نوا گلس لوکس — تیتر متالیک نقره‌ای" } },
};

/** designed defaults of one template ({} when unknown) */
export function getTemplateDefaultContent(templateId: string): Partial<TemplateContentData> {
  return DEFAULT_TEMPLATE_CONTENT[templateId] ?? {};
}

/** key → { label, where } metadata of one template */
export function getTemplateTextMeta(templateId: string): Record<string, TemplateTextMeta> {
  return TEMPLATE_TEXT_META[templateId] ?? {};
}

/** where-used hints of one template */
export function getTemplateContentHints(templateId: string): TemplateContentHints | undefined {
  return TEMPLATE_CONTENT_HINTS[templateId];
}

// ─────────────────────────── helpers ───────────────────────────

/** a content object with every section empty (the fallback-to-global state) */
export function emptyTemplateContent(): TemplateContentData {
  return {};
}

/** true when the blob carries at least one meaningful value */
export function hasTemplateContent(content: TemplateContentData | null | undefined): boolean {
  if (!content) return false;
  if (content.slides?.length) return true;
  if (content.showcases?.length) return true;
  if (content.links?.length) return true;
  if (content.texts && Object.keys(content.texts).length > 0) return true;
  const b = content.brand;
  if (b && (b.name?.trim() || b.tagline?.trim() || b.logoImage?.trim())) return true;
  return false;
}

/**
 * Lenient cleaner for arbitrary JSON → a safe TemplateContentData: invalid
 * list entries are dropped (not the whole blob), empty strings removed,
 * unknown keys ignored. Used for stored rows AND to normalize a validated
 * PUT payload (so "" fields are stored as absent, never as dead weight).
 */
export function sanitizeTemplateContent(value: unknown): TemplateContentData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyTemplateContent();
  const raw = value as Record<string, unknown>;
  const out: TemplateContentData = {};

  const cleanList = <T>(items: unknown, schema: z.ZodType<T>): T[] => {
    if (!Array.isArray(items)) return [];
    const list: T[] = [];
    for (const item of items.slice(0, 16)) {
      const parsed = schema.safeParse(item);
      if (parsed.success) list.push(parsed.data);
    }
    return list;
  };

  if (Array.isArray(raw.slides)) {
    const slides = cleanList(raw.slides, templateSlideSchema)
      .filter((s) => s.image)
      .map((s) => {
        const out: TemplateSlide = { image: s.image, ...(s.title ? { title: s.title } : {}) };
        if (s.subtitle) out.subtitle = s.subtitle;
        if (s.link) out.link = s.link;
        if (s.videoUrl) out.videoUrl = s.videoUrl;
        /* countdown survives only fully-armed (enabled + parseable target) */
        if (s.countdownEnabled && s.countdownTarget && !Number.isNaN(Date.parse(s.countdownTarget))) {
          out.countdownEnabled = true;
          out.countdownTarget = s.countdownTarget;
          if (s.countdownLabel) out.countdownLabel = s.countdownLabel;
        }
        return out;
      });
    if (slides.length > 0) out.slides = slides;
  }
  if (Array.isArray(raw.showcases)) {
    const showcases = cleanList(raw.showcases, templateShowcaseSchema).filter((s) => s.image);
    if (showcases.length > 0) out.showcases = showcases;
  }
  if (Array.isArray(raw.links)) {
    const links = cleanList(raw.links, templateLinkSchema).filter((l) => l.label && l.url);
    if (links.length > 0) out.links = links;
  }
  if (raw.texts && typeof raw.texts === "object" && !Array.isArray(raw.texts)) {
    const texts: TemplateTexts = {};
    for (const [k, v] of Object.entries(raw.texts as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const key = k.trim().slice(0, 64);
      const val = v.trim().slice(0, 600);
      if (key && val) texts[key] = val;
    }
    if (Object.keys(texts).length > 0) out.texts = texts;
  }
  if (raw.brand && typeof raw.brand === "object" && !Array.isArray(raw.brand)) {
    const parsed = templateBrandSchema.safeParse(raw.brand);
    if (parsed.success) {
      const brand: TemplateBrand = {};
      if (parsed.data.name?.trim()) brand.name = parsed.data.name.trim();
      if (parsed.data.tagline?.trim()) brand.tagline = parsed.data.tagline.trim();
      if (parsed.data.logoImage?.trim()) brand.logoImage = parsed.data.logoImage.trim();
      if (Object.keys(brand).length > 0) out.brand = brand;
    }
  }
  return out;
}

/** safe JSON parse of a stored TemplateContent.data row → sanitized content */
export function parseTemplateContent(raw: string | null | undefined): TemplateContentData {
  if (!raw) return emptyTemplateContent();
  try {
    return sanitizeTemplateContent(JSON.parse(raw));
  } catch {
    return emptyTemplateContent();
  }
}

/**
 * SERVER helper — db lookup of one template's content (parsed, or empty when
 * no row / invalid JSON). The db client is imported lazily so this module
 * stays client-safe for the admin editor.
 */
export async function getTemplateContentData(templateId: string): Promise<TemplateContentData> {
  try {
    const { db } = await import("@/lib/db");
    const row = await db.templateContent.findUnique({
      where: { templateId },
      select: { data: true },
    });
    return parseTemplateContent(row?.data);
  } catch {
    // pre-install / db not ready → global fallbacks render
    return emptyTemplateContent();
  }
}

// ───────────────────── storefront merge (fallback-aware) ─────────────────────

/** alias the HomeData shapes so the per-template ones keep their names */
type HomeSlide = HomeData["slides"][number];
type HomeShowcase = HomeData["showcases"][number];

function toHomeSlide(s: TemplateSlide, i: number): HomeSlide {
  return {
    id: `tpl-slide-${i}`,
    title: s.title?.trim() || "",
    subtitle: s.subtitle?.trim() || null,
    image: s.image,
    mobileImage: null,
    ctaText: null,
    ctaUrl: s.link?.trim() || null,
    product: null,
    /* v32: countdown + video ride along so hero templates can render them */
    ...(s.videoUrl?.trim() ? { videoUrl: s.videoUrl.trim() } : {}),
    ...(s.countdownEnabled && s.countdownTarget && !Number.isNaN(Date.parse(s.countdownTarget))
      ? {
          countdownEnabled: true,
          countdownTarget: s.countdownTarget,
          countdownLabel: s.countdownLabel?.trim() || null,
        }
      : {}),
  };
}

function toHomeShowcase(s: TemplateShowcase, i: number): HomeShowcase {
  return {
    id: `tpl-showcase-${i}`,
    title: s.title?.trim() || "",
    subtitle: null,
    image: s.image,
    buttonUrl: s.link?.trim() || null,
    product: null,
  };
}

/**
 * Effective slides/showcases for a template: template-specific entries win
 * (mapped into the HomeData slide/showcase shapes so every template renders
 * them with its normal code paths); empty → the global entities flow on
 * unchanged.
 */
export function mergeWithFallbacks(
  content: TemplateContentData,
  globalSlides: HomeSlide[],
  globalShowcases: HomeShowcase[],
): { slides: HomeSlide[]; showcases: HomeShowcase[] } {
  const tplSlides = (content.slides ?? []).filter((s) => s.image?.trim());
  const tplShowcases = (content.showcases ?? []).filter((s) => s.image?.trim());
  return {
    slides: tplSlides.length > 0 ? tplSlides.map(toHomeSlide) : globalSlides,
    showcases: tplShowcases.length > 0 ? tplShowcases.map(toHomeShowcase) : globalShowcases,
  };
}

/** brand override for the store block (name + logo; tagline stays on content) */
export function applyTemplateBrandToStore<T extends TemplateStore>(store: T, content: TemplateContentData): T {
  const brand = content.brand;
  if (!brand) return store;
  const name = brand.name?.trim();
  const logo = brand.logoImage?.trim();
  if (!name && !logo) return store;
  return {
    ...store,
    ...(name ? { storeName: name } : {}),
    ...(logo ? { logo, footerLogo: logo } : {}),
  };
}

/**
 * Full storefront wiring for one request: swap slides/showcases when the
 * template carries its own, override the store brand, and attach the raw
 * content blob so templates can read texts/links/brand directly. Never
 * mutates the input; with empty content the result is behavior-identical to
 * the global pipeline (only the additive templateContent field appears).
 */
export function applyTemplateContentToData(data: HomeData, content: TemplateContentData): HomeData {
  const { slides, showcases } = mergeWithFallbacks(content, data.slides, data.showcases);
  return {
    ...data,
    store: applyTemplateBrandToStore(data.store, content),
    slides,
    showcases,
    templateContent: hasTemplateContent(content) ? content : emptyTemplateContent(),
  };
}

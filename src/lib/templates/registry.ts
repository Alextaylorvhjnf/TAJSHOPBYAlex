/**
 * STOREFRONT TEMPLATE REGISTRY (spec §19/§23)
 * -------------------------------------------
 * PURE DATA — no component imports (usable from both server and
 * client, including the Admin panel). The renderer
 * (src/components/store/templates/renderer.tsx) maps `id` →
 * component; the Admin panel maps `id` → metadata + preview.
 *
 * 10 genuinely different templates. IDs are stable strings —
 * stored in StoreSettings.activeTemplate. Adding a template here
 * + a component file is ALL that is required (registry pattern).
 */

export type TemplateFeatureDef = {
  /** stable feature key — stored in StoreSettings.templateFeatures */
  key: string;
  /** Persian label shown in Admin → ظاهر */
  labelFa: string;
  /** optional short Persian description of what the toggle controls */
  descFa?: string;
};

export type TemplateDef = {
  id: string;
  /** Persian display name shown in Admin → Appearance */
  nameFa: string;
  /** English name (footer/SEO contexts) */
  nameEn: string;
  /** Short Persian description for the admin template grid */
  descFa: string;
  /** Tags describing the vibe — used for search/filter chips in admin */
  tags: string[];
  /** lucide icon name rendered by the admin grid */
  icon: string;
  /** rough visual family for preview theming */
  family: "modern" | "3d" | "minimal" | "social" | "seasonal" | "night" | "gaming" | "luxury" | "marketplace";
  /** v23: special effects this template supports — the admin can turn each
   *  one on/off per template (Admin → ظاهر → ویژگی‌های قالب). A missing key
   *  in settings = feature ON (designed default). */
  features?: TemplateFeatureDef[];
};

export const TEMPLATE_DEFS: TemplateDef[] = [
  {
    id: "modern-tech",
    nameFa: "مدرن تِک",
    nameEn: "Modern Tech",
    descFa: "پرچمدار سایبر-لوکس — پس‌زمینهٔ خلأ، پنل‌های شیشه‌ای، هالهٔ نئونی آبی و شمارنده‌های HUD؛ چهرهٔ آیندهٔ فروشگاه.",
    tags: ["پیش‌فرض", "مدرن", "فروشگاهی"],
    icon: "Cpu",
    family: "modern",
  },
  {
    id: "future-3d",
    nameFa: "فیوچر سه‌بعدی",
    nameEn: "Future 3D",
    descFa: "پرسپکتیو سه‌بعدی نئونی — کف گرید متحرک، کارت‌های تیلت ۳بعدی با موس و نور لبهٔ سایان.",
    tags: ["آینده‌نگر", "سه‌بعدی", "نئون"],
    icon: "Orbit",
    family: "3d",
  },
  {
    id: "minimal-premium",
    nameFa: "مینیمال پریمیوم",
    nameEn: "Minimal Premium",
    descFa: "مینیمال مونو گلس — سفید خالص، لهجهٔ جراحی‌شدهٔ زمرد و پنل‌های شیشه‌ای انتخاب‌های ویژه.",
    tags: ["مینیمال", "لوکس", "تمیز"],
    icon: "Square",
    family: "minimal",
  },
  {
    id: "social-commerce",
    nameFa: "سوشال کامرس",
    nameEn: "Social Commerce",
    descFa: "سوشال نئون فید — حلقه‌های گرادیانی استوری، مَسونری پست‌های محصول و چیپ‌های هشتگ نئون.",
    tags: ["سوشال", "استوری", "جوان"],
    icon: "Smartphone",
    family: "social",
  },
  {
    id: "autumn",
    nameFa: "پاییزی",
    nameEn: "Autumn",
    descFa: "اتام گلس — شب پاییزی گرم با ذرات برگ شناور، هاله‌های کهربایی و کارت‌های شیشه‌ای گرم.",
    tags: ["فصلی", "گرم", "دنج"],
    icon: "Leaf",
    family: "seasonal",
  },
  {
    id: "christmas",
    nameFa: "کریسمس و زمستان",
    nameEn: "Christmas / Winter",
    descFa: "وینتر سایبر — شب‌های یخی، شفق قطبی متحرک، برف‌ریزان CSS و HUD شمارش معکوس کریسمس.",
    tags: ["فصلی", "هدیه", "شادی"],
    icon: "Snowflake",
    family: "seasonal",
    features: [
      { key: "timer", labelFa: "شمارش معکوس هدایا", descFa: "تایمر پیشنهادهای ویژه پایان سال." },
      { key: "snow", labelFa: "برف‌ریزان", descFa: "ذرات برف متحرک پس‌زمینه." },
    ],
  },
  {
    id: "yalda-night",
    nameFa: "شب یلدا",
    nameEn: "Yalda Night",
    descFa: "یلدا سایبر — آسمان پرستارهٔ نیمه‌شب، گوی انار هولوگرافیک و شعر درخشان شب بلند.",
    tags: ["ایرانی", "یلدا", "شبانه"],
    icon: "Moon",
    family: "night",
  },
  {
    id: "gaming-cyber",
    nameFa: "گیمینگ و سایبر",
    nameEn: "Gaming / Cyber",
    descFa: "پلتفرم گیمینگ سایبر-نئون — پنجره‌های HUD، براکتی و خطوط اسکن، چرخهٔ RGB و شمارش معکوس DEAL ZONE.",
    tags: ["گیمینگ", "تاریک", "پرانرژی"],
    icon: "Gamepad2",
    family: "gaming",
    features: [
      { key: "timer", labelFa: "تایمر پیشنهادهای شگفت‌انگیز", descFa: "شمارش معکوس تخفیف‌ها روی کارت محصولات — با رسیدن تایمر به صفر، تخفیف غیرفعال می‌شود." },
      { key: "glow", labelFa: "نئون و درخشش ARGB", descFa: "هاله‌های نئونی و چرخه رنگی RGB روی کارت‌ها و قاب‌ها." },
      { key: "parallax", labelFa: "پارالاکس سه‌بعدی موس", descFa: "حرکت لایه‌های هیرو با نشانگر موس." },
      { key: "scanlines", labelFa: "خطوط اسکن و بافت رترو", descFa: "بافت گرید و خطوط اسکن وایس‌سیتی پس‌زمینه." },
    ],
  },
  {
    id: "luxury-electronics",
    nameFa: "لوکس الکترونیکس",
    nameEn: "Luxury Electronics",
    descFa: "بلک گلد لوکس HUD — مشکی عمیق، خطوط طلایی نئونی و انیمیشن‌های آهسته و باوقار.",
    tags: ["لوکس", "طلایی", "باوقار"],
    icon: "Crown",
    family: "luxury",
  },
  {
    id: "marketplace",
    nameFa: "مارکت‌پلیس پویا",
    nameEn: "Dynamic Marketplace",
    descFa: "مارکت متراکم آینده — خلأ تاریک، چیپ‌های شیشه‌ای چسبان و شبکهٔ چگال قیمت‌محور با نقطه‌های وضعیت نئون.",
    tags: ["مارکت", "متراکم", "پویا"],
    icon: "LayoutGrid",
    family: "marketplace",
  },
  {
    id: "art-deco",
    nameFa: "آرت‌دِکو",
    nameEn: "Art Deco",
    descFa: "دِکو نئون — شکوه دههٔ ۲۰ با خطوط طلایی درخشان، خورشید تابی و گوشه‌سازی زیگورات.",
    tags: ["کلاسیک", "هندسی", "لوکس"],
    icon: "Shapes",
    family: "luxury",
  },
  {
    id: "retro-vintage",
    nameFa: "رترو وینتیج",
    nameEn: "Retro Vintage",
    descFa: "رترو-فیوچر — کاغذ نیم‌تون با نئون کهربایی، قوس‌های Space-Age و پوشش CRT.",
    tags: ["نوستالژیک", "گرم", "کتالوگی"],
    icon: "Palette",
    family: "seasonal",
  },
  {
    id: "glass-morphism",
    nameFa: "شیشه‌ای مدرن",
    nameEn: "Glass Morphism",
    descFa: "نئوگلس — پنجرهٔ شیشه‌ای شناور با داک ناوبری، قرمز سینمایی و اسکریم‌های گرادیانی.",
    tags: ["مدرن", "شفاف", "نرم"],
    icon: "Sparkles",
    family: "modern",
  },
  {
    id: "editorial-magazine",
    nameFa: "مجله‌ای",
    nameEn: "Editorial Magazine",
    descFa: "ادیتوریال فیوچر — تایپ نمایشی مشکی، نشانگرهای سایان متحرک و نقل‌قول‌های درخشان.",
    tags: ["مجله‌ای", "تحریریه‌ای", "ستونی"],
    icon: "Newspaper",
    family: "minimal",
  },
  {
    id: "superstore-grid",
    nameFa: "سوپرمارکت دیجیتال",
    nameEn: "Digital Superstore",
    descFa: "سوپرمارکت نئون — زرد و قرمز فوریت، نوارهای خطر و کاشی‌های قیمت بمبی.",
    tags: ["متراکم", "ارزش‌محور", "پرانرژی"],
    icon: "Store",
    family: "marketplace",
  },
  {
    id: "neon-noir",
    nameFa: "نئون نوآر",
    nameEn: "Neon Noir",
    descFa: "وایس‌سیتی ویپروِیو — خورشید سینت‌ویو، گرید پرسپکتیو، فلیکر نئونی و گِرِین فیلم.",
    tags: ["شبانه", "سینمایی", "نئون"],
    icon: "MoonStar",
    family: "night",
  },
  {
    id: "flash-deals",
    nameFa: "فروش ویژه و فلش",
    nameEn: "Flash Deals",
    descFa: "یورژنسی قرمز HUD — باند شمارش معکوس چسبان، نوارهای پیشرفت فروش و راه‌راه‌های خطر.",
    tags: ["تخفیف", "فوریت", "پویا"],
    icon: "Zap",
    family: "marketplace",
    features: [
      { key: "timer", labelFa: "شمارش معکوس فروش ویژه", descFa: "نوار تایمر قرمز بالای صفحه." },
      { key: "progress", labelFa: "نوار پیشرفت فروش", descFa: "نمایش درصد فروش هر پیشنهاد." },
    ],
  },
  {
    id: "print-catalog",
    nameFa: "کاتالوگ چاپی",
    nameEn: "Print Catalog",
    descFa: "هولو کاتالوگ — برگه‌های کاغذی با قاب دولبه و مُهرهای فویل رنگین‌کمانی متحرک.",
    tags: ["کاغذی", "رسمی", "کلاسیک"],
    icon: "BookOpen",
    family: "minimal",
  },
  {
    id: "startup-light",
    nameFa: "استارتاپی روشن",
    nameEn: "Startup Light",
    descFa: "استارتاپ گرادیانی — حباب‌های محو رنگی، کارت‌های گرد بزرگ و تیتر گرادیانی.",
    tags: ["روشن", "استارتاپی", "تمیز"],
    icon: "Rocket",
    family: "modern",
  },
  {
    id: "mobile-first-pwa",
    nameFa: "پرمیوم ریسپانسیو",
    nameEn: "Premium Responsive",
    descFa: "پرمیوم ریسپانسیو — فروشگاه حرفه‌ای با پارالاکس، چرخش سه‌بعدی محصولات و نورهایی که با اسکرول روشن می‌شوند؛ یک تجربه از موبایل تا دسکتاپ.",
    tags: ["پرمیوم", "ریسپانسیو", "اسکرول‌انیمیشن"],
    icon: "Smartphone",
    family: "modern",
  },
  {
    id: "nexora-tech",
    nameFa: "نکسورا تک",
    nameEn: "Nexora Tech",
    descFa: "نکسورا سایبر-مینیمال — بنفش لاوندر، برج‌های بنفش محو و لهجهٔ لیمویی الکتریکی.",
    tags: ["روشن", "مدرن", "هوادار"],
    icon: "Sparkle",
    family: "modern",
  },
  {
    id: "techhub-dark",
    nameFa: "تک‌هاب تاریک",
    nameEn: "TechHub Dark",
    descFa: "تک-فیوچریزم — هیرو سیاه فضایی با مداربنفش و برگهٔ روشن تمیز پایین؛ تضاد سینمایی.",
    tags: ["تاریک", "نئون", "تک‌فروشی"],
    icon: "Waves",
    family: "night",
    features: [
      { key: "timer", labelFa: "شمارش معکوس پیشنهاد شگفت", descFa: "تایمر تا نیمه‌شب در کارت پیشنهاد ویژه." },
      { key: "glow", labelFa: "هالهٔ نئون", descFa: "هاله‌های نور رنگ اصلی روی کارت‌ها و تیترها." },
    ],
  },
  {
    id: "purple-mall",
    nameFa: "پرپل مال",
    nameEn: "Purple Mall",
    descFa: "پرپل نئون مال — کاروسل حلقهٔ نئونی، موزاییک متراکم و پرفروش‌های شماره‌دار درخشان.",
    tags: ["مارکت", "بنفش", "متراکم"],
    icon: "ShoppingBag",
    family: "marketplace",
  },
  {
    id: "nova-glass",
    nameFa: "نوا گلس",
    nameEn: "Nova Glass",
    descFa: "نوا گلس لوکس — تیتر متالیک نقره‌ای، رندرهای شناور مرزشکن و پنل‌های شیشه‌ای روشن.",
    tags: ["شیشه‌ای", "لوکس", "متال"],
    icon: "Gem",
    family: "minimal",
  },
  {
    id: "novatrend-clean",
    nameFa: "نواترند کلین",
    nameEn: "Novatrend Clean",
    descFa: "نواترند کورال — سفید تمیز، حباب ارگانیک کورال و کارت‌های شناور روی مرز هیرو.",
    tags: ["تمیز", "سفید", "ساده"],
    icon: "ShoppingCart",
    family: "modern",
  },
  /* ══ v35 · «صنف فروشگاه» — industry vertical storefronts ═══════════
   * Each vertical (electronics/fashion/beauty/gaming/autoparts) has ONE
   * dedicated flagship template with its own catalog, look and AI persona.
   * Switching verticals from Admin → ظاهر → «صنف فروشگاه» reseeds the
   * catalog and activates these. */
  {
    id: "taj-electronics-pro",
    nameFa: "تاج الکترونیکس پرو",
    nameEn: "Taj Electronics Pro",
    descFa: "پرچمدار صنف الکترونیکس — سفید نوا‌تِک، لهجهٔ بنفش، هیرو دو‌ستونه با محصول شناور و کارت‌های گرد حرفه‌ای.",
    tags: ["الکترونیکس", "روشن", "پرچمدار صنف"],
    icon: "Cpu",
    family: "modern",
  },
  {
    id: "sport-fashion",
    nameFa: "اسپرت و فشن",
    nameEn: "Sport & Fashion",
    descFa: "پرچمدار صنف پوشاک — ادیتوریال اسپرت، تایپ نمایشی، حباب ارگانیک کورال و ردیف‌های شماره‌دار پرفروش‌ها.",
    tags: ["پوشاک", "فشن", "ادیتوریال"],
    icon: "Shirt",
    family: "modern",
  },
  {
    id: "beauty-glow",
    nameFa: "بیوتی گلو",
    nameEn: "Beauty Glow",
    descFa: "پرچمدار صنف آرایشی و بهداشتی — رز و طلای نرم، سکوهای محصول لوکس و کارت‌های شیشه‌ای گل‌رنگ.",
    tags: ["آرایشی", "زیبایی", "لوکس"],
    icon: "Sparkles",
    family: "luxury",
  },
  {
    id: "zentry-gaming",
    nameFa: "زنتری گیمینگ",
    nameEn: "Zentry Gaming",
    descFa: "پرچمدار صنف گیمینگ — شب نئون بنفش/ماژنتا، سوییوش انحنایی، HUD زنده و حالت زرد DEAL ZONE.",
    tags: ["گیمینگ", "نئون", "تاریک"],
    icon: "Gamepad2",
    family: "gaming",
  },
  {
    id: "auto-parts",
    nameFa: "قطعات خودرو",
    nameEn: "Auto Parts",
    descFa: "پرچمدار صنف خودرو — صنعتی زغالی و نارنجی ایمنی، تایپ صنعتی و نوارهای ابزار.",
    tags: ["خودرو", "صنعتی", "تاریک"],
    icon: "Car",
    family: "marketplace",
  },
];

export const TEMPLATE_IDS = TEMPLATE_DEFS.map((t) => t.id);
export const DEFAULT_TEMPLATE_ID = "modern-tech";

export function getTemplateDef(id: string | null | undefined): TemplateDef {
  return TEMPLATE_DEFS.find((t) => t.id === id) ?? TEMPLATE_DEFS[0];
}

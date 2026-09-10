/**
 * v35 · VERTICAL CATALOG — «قطعات خودرو» (Auto Parts)
 * -----------------------------------------------------
 * The AUTO-PARTS vertical seed: a complete garage-grade catalog of REAL
 * Iranian-market parts (لنت / فیلتر / باتری / جلوبندی / لاستیک …) with real
 * تومان prices, discount deals, stock gauges, technical spec tables
 * (خودرو سازگار / برند / جنس / گارانتی / مدل) and stable image-search OSS
 * artwork. PURE DATA — consumed by src/app/api/admin/vertical/route.ts
 * (reseed) + src/lib/ai.ts (persona) + the auto-parts storefront template
 * through the normal DB → HomeData flow.
 *
 * Categories follow the classic یدک‌یاب/خودرو۴۲ layout (لنت و ترمز، فیلتر
 * و روغن، برق و باتری، تعلیق و جلوبندی، بدنه و آپشن، چراغ و روشنایی،
 * لاستیک و رینگ، لوازم موتور، لوازم جانبی). Brands are the household
 * Iranian after-market names (والدو، فیلترماهی، ایربات، آریا ساپ، سمنگ،
 * فیسبو) plus the global بوش / کاسترول.
 */

import type { VerticalDef } from "./types";

const CDN = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt";

export const AUTOPARTS_CATALOG: VerticalDef = {
  id: "autoparts",
  nameFa: "قطعات خودرو",
  nameEn: "Auto Parts",
  templateId: "auto-parts",
  taglineFa: "قطعات یدکی و لوازم خودرو",
  descFa:
    "فروشگاه تخصصی قطعات یدکی خودرو؛ از لنت و فیلتر تا باتری، جلوبندی و لاستیک، با کنترل سازگاری روی مدل خودرو و گارانتی اصالت کالا.",
  icon: "Car",

  /* ── AI persona — مکانیک فروشگاه، رک و بی‌حاشیه ───────────────────── */
  aiPersona:
    "تو مکانیک قدیمی همین فروشگاه قطعه‌ای؛ سال‌ها زیر ماشین بوده‌ای و از شماره فنی هر خورده با خبری. " +
    "اول مدل خودروی مشتری رو بپرس — پراید، سمند، پژو ۲۰۶ و ۴۰۵، تویوتا یا هیوندای — و فقط قطعهٔ سازگار با همون تیپ رو معرفی کن تا کار حقّی دربیاد. " +
    "موضوع سازگاری قطعات رو رک بگو و فرق قطعات نگهداری (فیلتر و روغن و لنت) با آپشن‌های پرفورمنس رو شفاف توضیح بده. " +
    "تا جایی که ممکن باشه از همین انبار و برندهای موجود فروشگاه (والدو، بوش، فیلترماهی، ایربات، آریا ساپ، سمنگ، کاسترول و فیسبو) پیشنهاد بده و قیمت و گارانتی هر قطعه رو هم یادت نره. " +
    "اگر سؤالی خارج از حوزهٔ قطعات و سرویس خودرو بود، مؤدبانه بگو از تخصصت خارجه و به همکار مربوطه ارجاع بده.",

  /* ── ۹ دسته‌بندی کلاسیک بازار قطعات ─────────────────────────────── */
  categories: [
    { name: "لنت و ترمز", slug: "brake-pads", icon: "Disc3", description: "لنت، دیسک و کفشک ترمز برای انواع خودرو", sortOrder: 1 },
    { name: "فیلتر و روغن", slug: "filters-oil", icon: "Droplets", description: "فیلتر روغن و هوا، روغن موتور و مکمل‌ها", sortOrder: 2 },
    { name: "سیستم برق و باتری", slug: "electrical-battery", icon: "BatteryCharging", description: "باتری، دینام و استارت", sortOrder: 3 },
    { name: "تعلیق و جلوبندی", slug: "suspension", icon: "Waves", description: "کمک فنر، سیبک، طبق و بوش", sortOrder: 4 },
    { name: "بدنه و آپشن", slug: "body-options", icon: "Car", description: "آینه، سپر و قطعات بدنه", sortOrder: 5 },
    { name: "چراغ و روشنایی", slug: "lights", icon: "Lightbulb", description: "چراغ جلو و عقب، لامپ و راهنما", sortOrder: 6 },
    { name: "لاستیک و رینگ", slug: "tires-rims", icon: "CircleDot", description: "لاستیک تمام‌فصل و رینگ آلومینیومی", sortOrder: 7 },
    { name: "لوازم موتور", slug: "engine-parts", icon: "Cog", description: "شمع، تسمه تایم، کلاچ و واترپمپ", sortOrder: 8 },
    { name: "لوازم جانبی خودرو", slug: "car-accessories", icon: "Package", description: "کفپوش، پایه موبایل و لوازم تزئینی", sortOrder: 9 },
  ],

  /* ── ۸ برند پرفروش بازار ایران ───────────────────────────────────── */
  brands: [
    { name: "بوش", slug: "bosch" },
    { name: "والدو", slug: "valdo" },
    { name: "فیلترماهی", slug: "filmahi" },
    { name: "ایربات", slug: "airbat" },
    { name: "آریا ساپ", slug: "aria-sap" },
    { name: "سمنگ", slug: "semang" },
    { name: "کاسترول", slug: "castrol" },
    { name: "فیسبو", slug: "fisbo" },
  ],

  /* ── ۲۰ قطعهٔ واقعی بازار (قیمت‌ها به تومان) ─────────────────────── */
  products: [
    /* لنت و ترمز ─────────────────────────────────────────────────── */
    {
      key: "peugeot-206-front-brake-pads-valdo",
      name: "لنت ترمز جلو پژو ۲۰۶ تیپ ۵ والدو نسل جدید",
      nameEn: "Front Brake Pads Peugeot 206 Valdo",
      price: 1850000,
      discountPrice: 1590000,
      stock: 42,
      categorySlug: "brake-pads",
      brandName: "والدو",
      image: `${CDN}/e29a7763973c.png`,
      gallery: [`${CDN}/65d5992c1b67.jpg`, `${CDN}/804444373fa8.png`],
      rating: 4.6,
      reviewCount: 128,
      soldCount: 340,
      featured: true,
      isSpecial: true,
      sku: "AUT-BRK-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ تیپ ۲ و ۵، رانا و پارس" },
        { key: "برند", value: "والدو" },
        { key: "جنس", value: "نیمه‌فلزی کم‌غبار (سرامیک)" },
        { key: "گارانتی", value: "۶ ماه اصالت کالا" },
        { key: "مدل", value: "نسل جدید با پلمب کارخانه" },
        { key: "تعداد در بسته", value: "۴ لنت (چرخ‌های جلو)" },
      ],
      description:
        "لنت جلو والدو با ترکیب نیمه‌فلزی کم‌غبار که روی دیسک خط نمی‌اندازد و در ترمزهای شدید بوی سوختگی نمی‌دهد. با پلمب کارخانه و کد رهگیری اصالت عرضه می‌شود تا خیالت راحت باشد.",
    },
    {
      key: "pride-rear-brake-shoes-valdo",
      name: "لنت کفشکی ترمز عقب پراید و تیبا والدو",
      nameEn: "Rear Brake Shoes Pride Valdo",
      price: 620000,
      stock: 55,
      categorySlug: "brake-pads",
      brandName: "والدو",
      image: `${CDN}/b4003b069e7f.jpg`,
      gallery: [`${CDN}/813469ff5d8c.jpg`],
      rating: 4.4,
      reviewCount: 96,
      soldCount: 512,
      sku: "AUT-BRK-002",
      specs: [
        { key: "خودرو سازگار", value: "پراید ۱۳۱، ۱۳۲ و ۱۳۵ و تیبا" },
        { key: "برند", value: "والدو" },
        { key: "جنس", value: "نسوز آزبست‌فری" },
        { key: "گارانتی", value: "۶ ماه" },
        { key: "تعداد در بسته", value: "۴ کفشک (چرخ‌های عقب)" },
      ],
      description:
        "کفشک عقب والدو برای سیستم ترمز کاسه‌ای پراید و تیبا با اصطکاک یکنواخت و بدون صدا روی کاسه. مخصوص تعویض دوره‌ای و ترمزهای دستی محکم است.",
    },
    {
      key: "peugeot-pars-brake-disc-semang",
      name: "دیسک ترمز جلو پژو پارس خورِ لایه‌دار سمنگ",
      nameEn: "Front Brake Disc Peugeot Pars Semang",
      price: 4200000,
      discountPrice: 3690000,
      stock: 18,
      categorySlug: "brake-pads",
      brandName: "سمنگ",
      image: `${CDN}/98e221c303b3.jpg`,
      gallery: [`${CDN}/cce018049fcc.jpg`, `${CDN}/e987e3a09be8.jpg`],
      rating: 4.5,
      reviewCount: 77,
      soldCount: 190,
      isSpecial: true,
      sku: "AUT-BRK-003",
      specs: [
        { key: "خودرو سازگار", value: "پژو پارس و ۴۰۵ (خور ۲۴۷ میلی‌متری)" },
        { key: "برند", value: "سمنگ" },
        { key: "جنس", value: "چدن خاکستری با پوشش ضدزنگ" },
        { key: "قطر", value: "۲۴۷ میلی‌متر" },
        { key: "گارانتی", value: "۱۲ ماه" },
        { key: "مدل", value: "خورِ لایه‌دار (Solid)" },
      ],
      description:
        "دیسک ترمز جلو سمنگ با ماشین‌کاری دقیق و بالانس کارخانه‌ای که لرزش فرمان در ترمزهای سرعت بالا را از بین می‌برد. پرداخت ضدزنگ سطح آن رعایت شده تا تا موقع نصب سالم بماند.",
    },

    /* فیلتر و روغن ───────────────────────────────────────────────── */
    {
      key: "206-oil-filter-airbat",
      name: "فیلتر روغن پژو ۲۰۶ و رانا ایربات",
      nameEn: "Oil Filter 206 Airbat",
      price: 285000,
      stock: 60,
      categorySlug: "filters-oil",
      brandName: "ایربات",
      image: `${CDN}/3d2da24e1198.jpg`,
      gallery: [`${CDN}/983761c77d04.png`],
      rating: 4.3,
      reviewCount: 154,
      soldCount: 980,
      featured: true,
      sku: "AUT-FLT-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ و ۲۰۷ و رانا (موتور TU5)" },
        { key: "برند", value: "ایربات" },
        { key: "جنس", value: "کاغذ صافی درجه یک با سوپاپ ضدبرگشت" },
        { key: "گارانتی", value: "تعویض تا ۱۰٫۰۰۰ کیلومتر" },
      ],
      description:
        "فیلتر روغن ایربات با کاغذ صافی چگال و سوپاپ ضدبرگشت که روغن کثیف به مدار برنمی‌گردد. انتخاب اقتصادی و مطمئن برای سرویس‌های دوره‌ای موتور TU5.",
    },
    {
      key: "samand-ef7-air-filter-filmahi",
      name: "فیلتر هوا سمند EF7 فیلترماهی",
      nameEn: "Air Filter Samand EF7 Filmahi",
      price: 380000,
      discountPrice: 325000,
      stock: 48,
      categorySlug: "filters-oil",
      brandName: "فیلترماهی",
      image: `${CDN}/1ad83b9f46a0.jpeg`,
      gallery: [`${CDN}/bbe2c3a3ecec.jpg`, `${CDN}/923745807726.jpg`],
      rating: 4.4,
      reviewCount: 121,
      soldCount: 760,
      sku: "AUT-FLT-002",
      specs: [
        { key: "خودرو سازگار", value: "سمند EF7 و دنا" },
        { key: "برند", value: "فیلترماهی" },
        { key: "جنس", value: "کاغذ سلولزی رزین‌اندود" },
        { key: "گارانتی", value: "۷ روز مرجوعی" },
        { key: "فاصله تعویض", value: "هر ۱۰٫۰۰۰ کیلومتر" },
      ],
      description:
        "فیلتر هوای فیلترماهی با منفذهای ریز یکسان که گرد و غبار را گرفته و هوای تمیز به موتور EF7 می‌رساند. قاب پلی‌اورتان آن نسوز است و در محفظه هوا بدون بازی می‌نشیند.",
    },
    {
      key: "castrol-magnatec-5w40-4l",
      name: "روغن موتور کاسترول مگناتک 5W-40 ظرف ۴ لیتری",
      nameEn: "Castrol Magnatec 5W-40 4L",
      price: 2350000,
      discountPrice: 1990000,
      stock: 26,
      categorySlug: "filters-oil",
      brandName: "کاسترول",
      image: `${CDN}/f52ba33a98d7.jpeg`,
      gallery: [`${CDN}/44f646f91f8e.jpg`, `${CDN}/4f9aea8f5c5f.jpeg`],
      rating: 4.8,
      reviewCount: 190,
      soldCount: 1120,
      featured: true,
      isSpecial: true,
      sku: "AUT-OIL-001",
      specs: [
        { key: "خودرو سازگار", value: "اکثر بنزینی‌ها؛ پژو، سمند، تویوتا و هیوندای" },
        { key: "برند", value: "کاسترول" },
        { key: "گرانروی", value: "5W-40 تمام‌سینتتیک" },
        { key: "حجم", value: "۴ لیتر" },
        { key: "گارانتی", value: "اصالت کالا با هولوگرام" },
      ],
      description:
        "مگناتک کاسترول با مولکول‌های چسبنده که از لحظه استارت لایه محافظ روی قطعات می‌سازند و سایش سرد اول صبح را حدود هفتاد درصد کم می‌کنند. روغن مطمئن برای موتورهای پرفشار شهری.",
    },

    /* سیستم برق و باتری ──────────────────────────────────────────── */
    {
      key: "aria-sap-66ah-battery",
      name: "باتری ۶۶ آمپر اتمی سیلد آریا ساپ",
      nameEn: "Battery 66Ah Sealed Aria Sap",
      price: 8900000,
      discountPrice: 7650000,
      stock: 14,
      categorySlug: "electrical-battery",
      brandName: "آریا ساپ",
      image: `${CDN}/3b2e693fd567.webp`,
      gallery: [`${CDN}/fe2b0daaa4aa.jpg`],
      rating: 4.6,
      reviewCount: 143,
      soldCount: 520,
      featured: true,
      sku: "AUT-BAT-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ و پارس، سمند و نیسان" },
        { key: "برند", value: "آریا ساپ" },
        { key: "نوع", value: "اتمی سیلد (بدون نیاز به آب)" },
        { key: "آمپراژ", value: "۶۶ آمپرساعت" },
        { key: "ولتاژ", value: "۱۲ ولت" },
        { key: "گارانتی", value: "۱۸ ماه" },
      ],
      description:
        "باتری اتمی سیلد آریا ساپ که در گرمای تابستان آب تبخیر نمی‌کند و نگهداری ندارد. جریان راه‌اندازی بالا آن برای استارت‌های سرد زمستان کاملاً کافی است.",
    },
    {
      key: "aria-sap-100ah-diesel-battery",
      name: "باتری ۱۰۰ آمپر صفر و یک آریا ساپ مخصوص دیزل",
      nameEn: "Battery 100Ah Diesel Aria Sap",
      price: 24500000,
      stock: 5,
      categorySlug: "electrical-battery",
      brandName: "آریا ساپ",
      image: `${CDN}/48e99fc6a13c.jpg`,
      gallery: [`${CDN}/342aa293311f.jpg`, `${CDN}/da192214a13d.png`],
      rating: 4.3,
      reviewCount: 34,
      soldCount: 66,
      isSpecial: true,
      sku: "AUT-BAT-002",
      specs: [
        { key: "خودرو سازگار", value: "خودروهای دیزل، وانت و کامیونت" },
        { key: "برند", value: "آریا ساپ" },
        { key: "نوع", value: "صفر و یک (خشک)" },
        { key: "آمپراژ", value: "۱۰۰ آمپرساعت" },
        { key: "جریان راه‌اندازی سرد", value: "۸۵۰ آمپر" },
        { key: "گارانتی", value: "۱۲ ماه" },
      ],
      description:
        "باتری ۱۰۰ آمپر آریا ساپ با پلیت‌های ضخیم مخصوص دیزل که استارت موتورهای سنگین را در سرما راحت می‌کند. ساخت صفر و یک با ارتعاش‌گریزِ کامل برای جاده‌های بد.",
    },
    {
      key: "peugeot-alternator-90a-aria-sap",
      name: "دینام (آلترناتور) پژو پارس ۹۰ آمپر آریا ساپ",
      nameEn: "Alternator Peugeot Pars 90A Aria Sap",
      price: 9800000,
      discountPrice: 8700000,
      stock: 0,
      categorySlug: "electrical-battery",
      brandName: "آریا ساپ",
      image: `${CDN}/edc1b108235b.jpg`,
      gallery: [`${CDN}/8a13f06517d8.jpg`],
      rating: 4.1,
      reviewCount: 27,
      soldCount: 118,
      sku: "AUT-BAT-003",
      specs: [
        { key: "خودرو سازگار", value: "پژو پارس و ۴۰۵ و سمند" },
        { key: "برند", value: "آریا ساپ" },
        { key: "آمپراژ", value: "۹۰ آمپر" },
        { key: "وضعیت", value: "بازسازی کارخانه‌ای با تست بنچ" },
        { key: "گارانتی", value: "۶ ماه" },
      ],
      description:
        "دینام ۹۰ آمپر بازسازی کارخانه‌ای با تعویض یاتاقان‌ها، رگولاتور و دیودها و تست کامل روی بنچ قبل از ارسال. جریان کافی برای خودروهای دارای کولر و سیستم برق سنگین.",
    },

    /* لوازم موتور ────────────────────────────────────────────────── */
    {
      key: "bosch-platinum-plugs-206",
      name: "شمع پلاتینیوم بوش پژو ۲۰۶ بسته ۴ عددی",
      nameEn: "Platinum Spark Plugs Bosch 206",
      price: 1650000,
      stock: 38,
      categorySlug: "engine-parts",
      brandName: "بوش",
      image: `${CDN}/83629ebe4022.png`,
      gallery: [`${CDN}/53d3a6038f1e.jpg`, `${CDN}/238b4cc9b274.jpg`],
      rating: 4.7,
      reviewCount: 112,
      soldCount: 480,
      featured: true,
      sku: "AUT-ENG-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ و ۲۰۷ و رانا (TU5)" },
        { key: "برند", value: "بوش" },
        { key: "جنس", value: "الکترود مرکزی پلاتینیوم" },
        { key: "دهانه", value: "۰٫۹ میلی‌متر" },
        { key: "گارانتی", value: "۱۲ ماه" },
        { key: "تعداد در بسته", value: "۴ عدد" },
      ],
      description:
        "شمع پلاتینیوم بوش با جرقه پایدار که مصرف سوخت را کم و استارت سرد را سریع می‌کند. عمر مفید آن تا شصت هزار کیلومتر است و روی موتورهای گازسوز هم خوب جواب می‌دهد.",
    },
    {
      key: "206-timing-belt-fisbo",
      name: "تسمه تایم پژو ۲۰۶ نوار فلزی فیسبو",
      nameEn: "Timing Belt 206 Fisbo",
      price: 1480000,
      stock: 25,
      categorySlug: "engine-parts",
      brandName: "فیسبو",
      image: `${CDN}/68108b7189a0.jpg`,
      gallery: [`${CDN}/96c5e04033c5.jpg`],
      rating: 4.5,
      reviewCount: 95,
      soldCount: 390,
      sku: "AUT-ENG-002",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ تیپ ۵ و ۲۰۷ و رانا" },
        { key: "برند", value: "فیسبو" },
        { key: "جنس", value: "لاستیک HNBR با تار فولادی" },
        { key: "تعداد دندانه", value: "۱۴۱" },
        { key: "گارانتی", value: "۱۲ ماه" },
      ],
      description:
        "تسمه تایم فیسبو با تار فولادی و ترکیب HNBR مقاوم به حرارت که کشسان نمی‌شود و تیپ موتور را جابه‌جا نمی‌کند. با دندانه‌های دقیق، صدای تسمه در دور بالا صفر است.",
    },
    {
      key: "405-clutch-kit-fisbo",
      name: "کلاچ سه‌تکه پژو ۴۰۵ و پارس فیسبو",
      nameEn: "Clutch Kit 405 Fisbo",
      price: 6800000,
      stock: 15,
      categorySlug: "engine-parts",
      brandName: "فیسبو",
      image: `${CDN}/8624f3ffd4b5.jpg`,
      gallery: [`${CDN}/3d9420b0a153.jpg`, `${CDN}/922e5301159d.jpg`],
      rating: 4.3,
      reviewCount: 71,
      soldCount: 145,
      sku: "AUT-ENG-003",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۴۰۵ و پارس و سمند LX" },
        { key: "برند", value: "فیسبو" },
        { key: "جنس", value: "دیسک و صفحه فنری با بلبرینگ" },
        { key: "قطر دیسک", value: "۲۰۰ میلی‌متر" },
        { key: "گارانتی", value: "۱۲ ماه" },
      ],
      description:
        "کلاچ سه‌تکه فیسبو با فنرهای دیافراگمی استاندارد که گاز گرفتن نرم و حس مستقیم می‌دهد. لنت ضخیم آن در ترافیک سنگین داغ نمی‌شود و بوی سوختگی نمی‌گیرد.",
    },

    /* تعلیق و جلوبندی ────────────────────────────────────────────── */
    {
      key: "206-front-shock-absorbers-semang",
      name: "کمک فنر جلو پژو ۲۰۶ سمنگ (جفت)",
      nameEn: "Front Shock Absorbers 206 Semang",
      price: 5600000,
      stock: 12,
      categorySlug: "suspension",
      brandName: "سمنگ",
      image: `${CDN}/04deb93033d6.jpg`,
      gallery: [`${CDN}/efc5a0aba111.jpg`, `${CDN}/c0697b123d46.jpg`],
      rating: 4.4,
      reviewCount: 69,
      soldCount: 158,
      sku: "AUT-SUS-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ (همه تیپ‌ها)" },
        { key: "برند", value: "سمنگ" },
        { key: "جنس", value: "گاز و روغن دوجداره" },
        { key: "تعداد", value: "۲ عدد (جفت جلو)" },
        { key: "گارانتی", value: "۱۸ ماه" },
      ],
      description:
        "کمک فنر جلو سمنگ با میله کروم سخت و آب‌بندی چندلایه که روغنش نشت نمی‌کند. جادهدارها و سرعت‌گیرها را بدون خواب سرنشین و بی‌صدا می‌بلعد.",
    },
    {
      key: "pride-tie-rod-end-aria-sap",
      name: "سیبک فرمان پراید و تیبا آریا ساپ",
      nameEn: "Tie Rod End Pride Aria Sap",
      price: 450000,
      stock: 47,
      categorySlug: "suspension",
      brandName: "آریا ساپ",
      image: `${CDN}/ca1912cf3622.png`,
      gallery: [`${CDN}/7b958cabd13f.jpg`],
      rating: 4.0,
      reviewCount: 61,
      soldCount: 470,
      sku: "AUT-SUS-002",
      specs: [
        { key: "خودرو سازگار", value: "پراید و تیبا" },
        { key: "برند", value: "آریا ساپ" },
        { key: "جنس", value: "فولاد با بوش پلی‌اورتان" },
        { key: "مدل", value: "موزنه استاندارد کارخانه" },
        { key: "گارانتی", value: "۶ ماه" },
      ],
      description:
        "سیبک فرمان آریا ساپ با گلخانه پلی‌اورتان مقاوم که لقی فرمان و صدای تق‌تق سرعت‌گیر را از بین می‌برد. موزنه از قبل تنظیم است و پس از تعویض فقط تنظیم فرمان لازم است.",
    },

    /* بدنه و آپشن ────────────────────────────────────────────────── */
    {
      key: "206-electric-side-mirror-aria-sap",
      name: "آینه بغل برقی پژو ۲۰۶ سمت چپ آریا ساپ",
      nameEn: "Electric Side Mirror 206 Left Aria Sap",
      price: 3850000,
      stock: 9,
      categorySlug: "body-options",
      brandName: "آریا ساپ",
      image: `${CDN}/ba7c3ebe28e7.jpg`,
      gallery: [`${CDN}/53a536fcf3d1.jpg`],
      rating: 4.3,
      reviewCount: 42,
      soldCount: 130,
      sku: "AUT-BDY-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ (مدل‌های دارای آینه برقی)" },
        { key: "برند", value: "آریا ساپ" },
        { key: "نوع", value: "برقی با شیشه تاشو" },
        { key: "سمت", value: "چپ (راننده)" },
        { key: "گارانتی", value: "۶ ماه" },
      ],
      description:
        "آینه بغل برقی آریا ساپ با موتور گردان قدرتمند و بدنه ABS ضدضربه که رنگ آن با کارخانه خودرو ست است. سوکت آن پین‌به‌پین با سوکت اصلی است و بدون سیم‌کشی اضافه نصب می‌شود.",
    },

    /* چراغ و روشنایی ─────────────────────────────────────────────── */
    {
      key: "206-headlight-right-aria-sap",
      name: "چراغ جلو کامل پژو ۲۰۶ تیپ ۵ سمت راست آریا ساپ",
      nameEn: "Headlight 206 Type5 Right Aria Sap",
      price: 6300000,
      discountPrice: 5450000,
      stock: 11,
      categorySlug: "lights",
      brandName: "آریا ساپ",
      image: `${CDN}/da4a976ef796.jpg`,
      gallery: [`${CDN}/65b7e3b8fd72.jpg`, `${CDN}/3c00160d8642.jpg`],
      rating: 4.5,
      reviewCount: 88,
      soldCount: 210,
      isSpecial: true,
      sku: "AUT-LGT-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ تیپ ۵" },
        { key: "برند", value: "آریا ساپ" },
        { key: "نوع", value: "هالوژن با رفلکتور آینه‌ای" },
        { key: "سمت", value: "راست (شاگرد)" },
        { key: "گارانتی", value: "۱۲ ماه" },
      ],
      description:
        "چراغ جلو کامل آریا ساپ با رفلکتور آینه‌ای و شیشه پلی‌کربنات ضدزردشوندگی که نور را یکدست روی جاده می‌ریزد. آب‌بندی آن با چسب اولیه UV انجام شده و مه نمی‌گیرد.",
    },
    {
      key: "bosch-h4-bulbs-pair",
      name: "لامپ H4 نور سفید بوش (جفت)",
      nameEn: "H4 Bulbs Bosch Pair",
      price: 620000,
      stock: 40,
      categorySlug: "lights",
      brandName: "بوش",
      image: `${CDN}/82b84e737105.jpg`,
      gallery: [`${CDN}/c0382f60b9f4.jpg`],
      rating: 4.6,
      reviewCount: 134,
      soldCount: 830,
      sku: "AUT-LGT-002",
      specs: [
        { key: "خودرو سازگار", value: "خودروهای دارای لامپ H4؛ پراید، پژو و سمند" },
        { key: "برند", value: "بوش" },
        { key: "توان", value: "۶۰ و ۵۵ وات" },
        { key: "دمای نور", value: "۴۲۰۰ کلوین" },
        { key: "تعداد", value: "۲ عدد" },
      ],
      description:
        "لامپ H4 بوش با فیلامان دقیق که الگوی نور خط‌مرزی تمیز می‌دهد و راننده مقابل را کور نمی‌کند. نور سفید ۴۲۰۰ کلوین آن شب را روشن و خستگی چشم را کم می‌کند.",
    },

    /* لاستیک و رینگ ──────────────────────────────────────────────── */
    {
      key: "tire-185-65-r14-set",
      name: "لاستیک ۱۸۵/۶۵R۱۴ مجموعه ۴ حلقه",
      nameEn: "Tire 185/65R14 Set of 4",
      price: 12800000,
      stock: 16,
      categorySlug: "tires-rims",
      brandName: "آریا ساپ",
      image: `${CDN}/7a201223c088.png`,
      gallery: [`${CDN}/a913d5ff60c6.jpg`],
      rating: 4.4,
      reviewCount: 55,
      soldCount: 190,
      featured: true,
      sku: "AUT-TIR-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۶ و ۲۰۷، هیوندای اکسنت و النترا" },
        { key: "برند", value: "آریا ساپ" },
        { key: "سایز", value: "185/65R14" },
        { key: "الگوی آج", value: "نامتقارن تمام‌فصل" },
        { key: "تعداد", value: "۴ حلقه" },
        { key: "گارانتی", value: "اصالت و سلامت فیزیکی" },
      ],
      description:
        "لاستیک تمام‌فصل ۱۸۵/۶۵R۱۴ با آج نامتقارن که در باران و جاده خیس خوب آب‌خوری می‌کند و صدای غلتش پایین است. تیغه‌های کناری آن مانور سریع در سرعت‌های شهری را قابل‌اعتماد می‌کند.",
    },
    {
      key: "alloy-rim-14-4x100-set",
      name: "رینگ آلومینیومی ۱۴ اینچ ۴ سوراخه مجموعه ۴ عدد",
      nameEn: "Alloy Rim 14in 4x100 Set",
      price: 16500000,
      discountPrice: 14900000,
      stock: 4,
      categorySlug: "tires-rims",
      brandName: "آریا ساپ",
      image: `${CDN}/e8e7830564ba.jpg`,
      gallery: [`${CDN}/eac3eacac15c.jpg`, `${CDN}/8eb4b1d1184e.jpg`],
      rating: 4.6,
      reviewCount: 23,
      soldCount: 45,
      sku: "AUT-TIR-002",
      specs: [
        { key: "خودرو سازگار", value: "پراید، تیبا و ۲۰۶ با پیچ PCD 4×100" },
        { key: "برند", value: "آریا ساپ" },
        { key: "جنس", value: "آلیاژ آلومینیوم ریختگی" },
        { key: "سایز", value: "۱۴ اینچ" },
        { key: "آفست", value: "۳۸ میلی‌متر" },
        { key: "تعداد", value: "۴ عدد" },
      ],
      description:
        "رینگ آلومینیومی ۱۴ اینچه آریا ساپ با پرداخت دو رنگ و لاک شفاف UV که زیر آفتاب زرد نمی‌شود. وزن سبک‌تر آن چرخ‌ها را راحت‌تر نگه می‌دارد و تعلیق را کمتر می‌خواباند.",
    },

    /* لوازم جانبی خودرو ──────────────────────────────────────────── */
    {
      key: "207-3d-floor-mats",
      name: "کفپوش سه‌بعدی پژو ۲۰۷ دودی مجموعه کامل",
      nameEn: "3D Floor Mats 207",
      price: 1250000,
      stock: 22,
      categorySlug: "car-accessories",
      brandName: "آریا ساپ",
      image: `${CDN}/49b6028a728c.jpg`,
      gallery: [`${CDN}/3f6fa293aba0.jpg`, `${CDN}/ba16d65861b1.jpg`],
      rating: 4.2,
      reviewCount: 38,
      soldCount: 150,
      sku: "AUT-ACC-001",
      specs: [
        { key: "خودرو سازگار", value: "پژو ۲۰۷ (قابل برش برای ۲۰۶)" },
        { key: "برند", value: "آریا ساپ" },
        { key: "جنس", value: "لاستیک TPE بدون بو" },
        { key: "تعداد", value: "۵ تکه (کف و کناره‌ها)" },
        { key: "گارانتی", value: "۷ روز مرجوعی" },
      ],
      description:
        "کفپوش سه‌بعدی TPE با لبه بلند که آب و گل را داخل خودش نگه می‌دارد و ساتن زیرپایی فرش را خیس نمی‌کند. با آب قابل شستشوست و در گرما یا سرما شکننده نمی‌شود.",
    },
  ],
};

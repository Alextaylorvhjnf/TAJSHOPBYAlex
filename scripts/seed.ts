/**
 * TAJ Electronics — Database Seed
 * Run: bun scripts/seed.ts
 * Creates: admin + staff + demo users, 21 categories, 15 brands,
 * 28 real products (images from /tmp/taj-img image-search results),
 * 4 sliders, coupons, reviews, sample orders with payments.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { seedContent } from "./seed-content";

const db = new PrismaClient();

const IMG_DIR = "/tmp/taj-img";
function pickImage(key: string): string | null {
  try {
    const p = `${IMG_DIR}/${key}.json`;
    if (!existsSync(p)) return null;
    const json = JSON.parse(readFileSync(p, "utf-8"));
    if (!json.success || !json.results?.length) return null;
    // prefer square-ish, reasonably sized images
    const sorted = [...json.results].sort((a: any, b: any) => {
      const score = (r: any) => {
        const w = parseInt(r.original_width) || 0;
        const h = parseInt(r.original_height) || 0;
        if (!w || !h) return -1;
        const ratio = Math.min(w, h) / Math.max(w, h);
        return (w >= 500 ? 1 : 0) + ratio;
      };
      return score(b) - score(a);
    });
    return sorted[0]?.original_url ?? null;
  } catch {
    return null;
  }
}
function images(key: string): string[] {
  try {
    const p = `${IMG_DIR}/${key}.json`;
    if (!existsSync(p)) return [];
    const json = JSON.parse(readFileSync(p, "utf-8"));
    if (!json.success) return [];
    return json.results.slice(0, 3).map((r: any) => r.original_url).filter(Boolean);
  } catch {
    return [];
  }
}

const S = (v: unknown) => JSON.stringify(v);
const norm = (s: string) =>
  s.replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[يﻲﻱ]/g, "ی").replace(/[كﮐﮑ]/g, "ک")
    .replace(/[ۀہ]/g, "ه").replace(/[أإآ]/g, "ا")
    .toLowerCase().replace(/\s+/g, " ").trim();

const searchTextOf = (...parts: (string | null | undefined)[]) => norm(parts.filter(Boolean).join(" "));

async function main() {
  console.log("🌱 Seeding TAJ Electronics …");

  // ── wipe (dev seed) ──
  await db.notification.deleteMany();
  await db.adminLog.deleteMany();
  await db.review.deleteMany();
  await db.orderItem.deleteMany();
  await db.payment.deleteMany();
  await db.cardToCardPayment.deleteMany();
  await db.order.deleteMany();
  await db.deliveryMethod.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.productImage.deleteMany();
  await db.slider.deleteMany();
  await db.product.deleteMany();
  await db.coupon.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();
  await db.address.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  // ── users ──
  const hash = (p: string) => bcrypt.hashSync(p, 12);
  const admin = await db.user.create({
    data: {
      firstName: "مدیر", lastName: "کل", email: "admin@taj.local", phone: "09120000000",
      passwordHash: hash("Admin@123456"), role: "SUPER_ADMIN",
    },
  });
  const orderManager = await db.user.create({
    data: {
      firstName: "کارشناس", lastName: "سفارش‌ها", email: "orders@taj.local", phone: "09120000001",
      passwordHash: hash("Orders@123456"), role: "ORDER_MANAGER",
    },
  });
  const demo = await db.user.create({
    data: {
      firstName: "سارا", lastName: "محمدی", email: "demo@taj.local", phone: "09121111111",
      passwordHash: hash("Demo@123456"), role: "CUSTOMER",
    },
  });
  const reviewers = await Promise.all(
    [
      ["علی", "رضایی", "09123333331"], ["مریم", "احمدی", "09123333332"],
      ["حسین", "کریمی", "09123333333"], ["نگار", "قاسمی", "09123333334"],
      ["امیر", "حسینی", "09123333335"], ["فاطمه", "نوری", "09123333336"],
    ].map(([f, l, phone], i) =>
      db.user.create({
        data: { firstName: f, lastName: l, phone, email: `user${i}@taj.local`, passwordHash: hash("Pass@12345"), role: "CUSTOMER" },
      })
    )
  );

  await db.address.create({
    data: { userId: demo.id, title: "خانه", province: "تهران", city: "تهران", address: "خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳", postalCode: "1234567890", isDefault: true, receiverName: "سارا محمدی", phone: "09121111111" },
  });

  // ── categories ──
  const CATS: [string, string, string, [string, string][]][] = [
    ["موبایل", "mobile", "Smartphone", [["cpu", "پردازنده"], ["ram", "حافظه موقت"], ["storage", "حافظه داخلی"], ["display", "نمایشگر"], ["camera", "دوربین"], ["battery", "باتری"], ["os", "سیستم‌عامل"], ["network", "شبکه"]]],
    ["لپ‌تاپ", "laptop", "Laptop", [["cpu", "پردازنده"], ["gpu", "پردازنده گرافیکی"], ["ram", "حافظه موقت"], ["ssd", "حافظه SSD"], ["display", "نمایشگر"], ["refresh", "نرخ به‌روزرسانی"], ["battery", "باتری"], ["weight", "وزن"]]],
    ["کامپیوتر", "desktop-pc", "Computer", [["cpu", "پردازنده"], ["gpu", "پردازنده گرافیکی"], ["ram", "حافظه موقت"], ["storage", "حافظه"], ["os", "سیستم‌عامل"]]],
    ["قطعات کامپیوتر", "pc-parts", "Cpu", [["socket", "سوکت"], ["tdp", "مصرف انرژی"], ["warranty", "گارانتی"]]],
    ["مانیتور", "monitor", "Monitor", [["size", "اندازه"], ["resolution", "وضوح تصویر"], ["refresh", "نرخ به‌روزرسانی"], ["panel", "پنل"], ["response", "زمان پاسخ"]]],
    ["کنسول بازی", "console", "Gamepad2", [["storage", "حافظه"], ["resolution", "پشتیبانی 4K"], ["controller", "دسته"]]],
    ["لوازم جانبی", "accessories", "Headphones", []],
    ["پاوربانک", "powerbank", "BatteryCharging", [["capacity", "ظرفیت"], ["power", "توان خروجی"], ["ports", "تعداد پورت"]]],
    ["شارژر", "charger", "Zap", [["power", "توان"], ["ports", "پورت‌ها"]]],
    ["هدفون", "headphones", "Headphone", [["type", "نوع"], ["anc", "حذف نویز"], ["battery", "باتری"]]],
    ["هندزفری", "earbuds", "Ear", [["type", "نوع"], ["anc", "حذف نویز"], ["battery", "باتری"]]],
    ["ساعت هوشمند", "smart-watch", "Watch", [["display", "نمایشگر"], ["battery", "باتری"], ["health", "سنسورها"]]],
    ["گجت‌های هوشمند", "smart-gadgets", "Watch", [["type", "نوع"]]],
    ["پروژکتور", "projector", "Projector", [["resolution", "وضوح"], ["brightness", "روشنایی"], ["contrast", "کنتراست"], ["throw", "نسبت پرتاب"], ["lamp", "عمر لامپ"]]],
    ["تجهیزات شبکه", "network", "Wifi", [["standard", "استاندارد"], ["speed", "سرعت"]]],
    ["حافظه و SSD", "storage", "HardDrive", [["capacity", "ظرفیت"], ["type", "نوع"], ["read", "سرعت خواندن"]]],
    ["کیبورد", "keyboard", "Keyboard", [["type", "نوع"], ["layout", "چیدمان"], ["connect", "اتصال"]]],
    ["موس", "mouse", "Mouse", [["dpi", "دقت (DPI)"], ["connect", "اتصال"]]],
    ["وبکم", "webcam", "Camera", [["resolution", "وضوح"], ["fps", "فریم‌ریت"]]],
    ["اسپیکر", "speaker", "Speaker", [["power", "توان"], ["connect", "اتصال"], ["waterproof", "ضدآب"]]],
    ["سایر تجهیزات دیجیتال", "other", "Box", []],
  ];
  const cat = {} as Record<string, string>;
  for (let i = 0; i < CATS.length; i++) {
    const [name, slug, icon, template] = CATS[i];
    const c = await db.category.create({
      data: { name, slug, icon, sortOrder: i, isActive: true, specTemplate: template.length ? S(template.map(([key, label]) => ({ key, label }))) : null },
    });
    cat[slug] = c.id;
  }

  // ── brands ──
  const BRANDS = ["Apple", "Samsung", "Xiaomi", "ASUS", "Lenovo", "Sony", "Microsoft", "NVIDIA", "Intel", "LG", "Google", "Anker", "Logitech", "Epson", "JBL"];
  const brand = {} as Record<string, string>;
  for (const b of BRANDS) {
    const created = await db.brand.create({ data: { name: b, slug: b.toLowerCase(), isActive: true } });
    brand[b] = created.id;
  }

  // ── products ──
  type Spec = [string, string, string, string?];
  type P = {
    key: string; name: string; slug: string; sku: string; brand: string; category: string;
    price: number; discountPrice?: number; stock: number; featured?: boolean; isSpecial?: boolean;
    sold?: number; colors?: [string, string][]; specs: Spec[]; tags: string[]; short: string; desc: string;
  };

  const PRODUCTS: P[] = [
    {
      key: "iphone-15-pro-max", name: "گوشی موبایل اپل iPhone 15 Pro Max ظرفیت ۲۵۶ گیگابایت", slug: "apple-iphone-15-pro-max-256gb", sku: "APL-IP15PM-256", brand: "Apple", category: "mobile",
      price: 92_500_000, discountPrice: 88_900_000, stock: 14, featured: true, isSpecial: true, sold: 38,
      colors: [["تیتانیوم طبیعی", "#B9B1A5"], ["مشکی", "#3C3C3D"], ["آبی تیتانیوم", "#39485A"]],
      specs: [["cpu", "پردازنده", "Apple A17 Pro (3nm)"], ["ram", "حافظه موقت", "8GB"], ["storage", "حافظه داخلی", "256GB"], ["display", "نمایشگر", "6.7 اینچ Super Retina XDR OLED — 120Hz"], ["camera", "دوربین اصلی", "48MP + 12MP اولتراواید + 12MP تله‌فوتو ۵x"], ["battery", "باتری", "4441mAh"], ["os", "سیستم‌عامل", "iOS 17"], ["network", "شبکه", "5G"]],
      tags: ["آیفون", "iphone", "apple", "پرچمدار", "گوشی"],
      short: "پرچمدار ۲۰۲۳ اپل با بدنه تیتانیومی، تراشه A17 Pro و دوربین 48 مگاپیکسلی با زوم اپتیکال ۵ برابر.",
      desc: "آیفون ۱۵ پرو مکس با بدنه تیتانیومی سبک و مقاوم، تراشه A17 Pro با معماری ۳ نانومتری و پردازنده گرافیکی با سخت‌افزار ردیابی پرتو، قدرتمندترین آیفون تاریخ است.\n\nدوربین ۴۸ مگاپیکسلی با سنسور بزرگ‌تر، زوم اپتیکال ۵ برابر تله‌فوتو و عکاسی پرتره نسل جدید تجربه‌ای حرفه‌ای می‌سازد. درگاه USB-C با سرعت انتقال 10Gbps، نمایشگر همیشه روشن و اکشن دکمه از دیگر ویژگی‌های کلیدی هستند.",
    },
    {
      key: "galaxy-s24-ultra", name: "گوشی موبایل سامسونگ Galaxy S24 Ultra ظرفیت ۵۱۲ گیگابایت", slug: "samsung-galaxy-s24-ultra-512gb", sku: "SAM-S24U-512", brand: "Samsung", category: "mobile",
      price: 84_000_000, discountPrice: 79_500_000, stock: 9, featured: true, sold: 45,
      colors: [["خاکستری تیتانیوم", "#7B7B7D"], ["مشکی", "#2B2B2E"], ["بنفش کم‌رنگ", "#C9B8E8"]],
      specs: [["cpu", "پردازنده", "Snapdragon 8 Gen 3"], ["ram", "حافظه موقت", "12GB"], ["storage", "حافظه داخلی", "512GB"], ["display", "نمایشگر", "6.8 اینچ Dynamic AMOLED 2X — 120Hz"], ["camera", "دوربین اصلی", "200MP + 50MP زوم ۵x + 10MP زوم ۳x + 12MP اولتراواید"], ["battery", "باتری", "5000mAh — شارژ 45W"], ["os", "سیستم‌عامل", "Android 14 — One UI 6.1"], ["network", "شبکه", "5G"]],
      tags: ["سامسونگ", "samsung", "galaxy", "اس ۲۴", "ultra", "قلم"],
      short: "پرچمدار سامسونگ با دوربین ۲۰۰ مگاپیکسلی، قلم S Pen و هوش مصنوعی Galaxy AI.",
      desc: "گلکسی اس ۲۴ اولترا با نمایشگر مسطح ۶.۸ اینچی و فریم تیتانیومی، همراه S Pen داخلی است. ترجمه همزمان مکالمات، ویرایش عکس با AI و جستجوی هوشمند دایره‌ای بخشی از قابلیت‌های Galaxy AI هستند.",
    },
    {
      key: "xiaomi-14", name: "گوشی موبایل شیائومی Xiaomi 14 ظرفیت ۲۵۶ گیگابایت", slug: "xiaomi-14-256gb", sku: "XIA-M14-256", brand: "Xiaomi", category: "mobile",
      price: 42_800_000, stock: 21, sold: 30,
      colors: [["مشکی", "#1F1F1F"], ["سبز جیغ", "#A6E22E"], ["سفید", "#F2F2F2"]],
      specs: [["cpu", "پردازنده", "Snapdragon 8 Gen 3"], ["ram", "حافظه موقت", "12GB"], ["storage", "حافظه داخلی", "256GB"], ["display", "نمایشگر", "6.36 اینچ LTPO OLED — 120Hz"], ["camera", "دوربین اصلی", "50MP لایکا Summilux"], ["battery", "باتری", "4610mAh — شارژ 90W"], ["os", "سیستم‌عامل", "Android 14 — HyperOS"], ["network", "شبکه", "5G"]],
      tags: ["شیائومی", "xiaomi", "شاومی", "لایکا"],
      short: "پرچمدار جمع‌وجور شیائومی با لنزهای لایکا و شارژ ۹۰ واتی.",
      desc: "شیائومی ۱۴ با همکاری لایکا، سیستم دوربین سه‌گانه ۵۰ مگاپیکسلی با لنز Summilux f/1.6 دارد. اندازه جمع‌وجور ۶.۳۶ اینچی آن برای کاربرانی که پرچمدار کوچک می‌خواهند ایده‌آل است.",
    },
    {
      key: "pixel-8-pro", name: "گوشی موبایل گوگل Pixel 8 Pro ظرفیت ۲۵۶ گیگابایت", slug: "google-pixel-8-pro-256gb", sku: "GOO-P8P-256", brand: "Google", category: "mobile",
      price: 58_500_000, stock: 6,
      colors: [["آبی روشن", "#AECBFA"], ["مشکی", "#2D2D2F"], ["پورسلین", "#EDE7DE"]],
      specs: [["cpu", "پردازنده", "Google Tensor G3"], ["ram", "حافظه موقت", "12GB"], ["storage", "حافظه داخلی", "256GB"], ["display", "نمایشگر", "6.7 اینچ Super Actua LTPO OLED"], ["camera", "دوربین اصلی", "50MP + 48MP تله‌فوتو ۵x + 48MP اولتراواید"], ["battery", "باتری", "5050mAh"], ["os", "سیستم‌عامل", "Android 14"], ["network", "شبکه", "5G"]],
      tags: ["پیکسل", "pixel", "google", "گوگل", "اندروید خالص"],
      short: "بهترین دوربین computational photography با ۷ سال آپدیت اندروید.",
      desc: "پیکسل ۸ پرو با تراشه Tensor G3 و هوش مصنوعی اختصاصی گوگل، در عکاسی شب و ویرایش Magic Editor بی‌رقیب است. ۷ سال به‌روزرسانی سیستم‌عامل تضمین شده.",
    },
    {
      key: "iphone-13", name: "گوشی موبایل اپل iPhone 13 ظرفیت ۱۲۸ گیگابایت", slug: "apple-iphone-13-128gb", sku: "APL-IP13-128", brand: "Apple", category: "mobile",
      price: 47_900_000, discountPrice: 44_500_000, stock: 0, sold: 62,
      colors: [["آبی", "#A7C1D9"], ["مشکی", "#2C2C2E"], ["صورتی", "#F3C1D4"]],
      specs: [["cpu", "پردازنده", "Apple A15 Bionic"], ["ram", "حافظه موقت", "4GB"], ["storage", "حافظه داخلی", "128GB"], ["display", "نمایشگر", "6.1 اینچ Super Retina XDR OLED"], ["camera", "دوربین اصلی", "12MP دوگانه"], ["battery", "باتری", "3240mAh"], ["os", "سیستم‌عامل", "iOS 17"], ["network", "شبکه", "5G"]],
      tags: ["آیفون", "iphone 13", "ارزان", "اقتصادی"],
      short: "انتخاب اقتصادی-باکیفیت: آیفون ۱۳ با تراشه A15 و دوربین دوگانه.",
      desc: "آیفون ۱۳ هنوز یکی از پرفروش‌ترین گوشی‌های بازار است؛ تراشه A15 بionic قدرت کافی برای سال‌ها آینده دارد و قیمت آن نسبت به نسل‌های جدید بسیار مناسب‌تر است.",
    },
    {
      key: "galaxy-a55", name: "گوشی موبایل سامسونگ Galaxy A55 ظرفیت ۱۲۸ گیگابایت", slug: "samsung-galaxy-a55-128gb", sku: "SAM-A55-128", brand: "Samsung", category: "mobile",
      price: 21_900_000, discountPrice: 19_900_000, stock: 35, sold: 51, isSpecial: true,
      colors: [["آبی یخی", "#B5D1E8"], ["مشکی", "#26262A"]],
      specs: [["cpu", "پردازنده", "Exynos 1480"], ["ram", "حافظه موقت", "8GB"], ["storage", "حافظه داخلی", "128GB"], ["display", "نمایشگر", "6.6 اینچ Super AMOLED — 120Hz"], ["camera", "دوربین اصلی", "50MP OIS"], ["battery", "باتری", "5000mAh — 25W"], ["os", "سیستم‌عامل", "Android 14"], ["network", "شبکه", "5G"]],
      tags: ["میان رده", "A55", "سامسونگ", "اقتصادی"],
      short: "میان‌رده محبوب سامسونگ با نمایشگر ۱۲۰ هرتز و دوربین OIS.",
      desc: "گلکسی A55 با بدنه فلزی و شیشه گوریلا ویکتوس‌پلاس، نمایشگر سوپر امولد ۱۲۰ هرتز و دوربین اصلی با لرزش‌گیر اپتیکال، بهترین انتخاب رده میان‌رده سامسونگ است.",
    },
    {
      key: "rog-strix-g16", name: "لپ‌تاپ گیمینگ ایسوس ROG Strix G16 RTX 4060", slug: "asus-rog-strix-g16-rtx4060", sku: "ASU-ROGG16-406", brand: "ASUS", category: "laptop",
      price: 78_500_000, discountPrice: 73_900_000, stock: 7, featured: true, sold: 22,
      colors: [["مشکی Eclipse", "#1E1E22"]],
      specs: [["cpu", "پردازنده", "Intel Core i7-13650HX"], ["gpu", "پردازنده گرافیکی", "NVIDIA RTX 4060 8GB"], ["ram", "حافظه موقت", "16GB DDR5"], ["ssd", "حافظه SSD", "1TB NVMe"], ["display", "نمایشگر", "16 اینچ QHD+ IPS"], ["refresh", "نرخ به‌روزرسانی", "165Hz"], ["battery", "باتری", "56Wh"], ["weight", "وزن", "2.5kg"]],
      tags: ["گیمینگ", "gaming", "rtx", "rog", "لپ تاپ گیمینگ", "4060"],
      short: "لپ‌تاپ گیمینگ با RTX 4060، پردازنده i7-13650HX و نمایشگر ۱۶۵ هرتز.",
      desc: "ROG Strix G16 با سیستم خنک‌کننده هوشمند و سه فن، برای گیمرهایی که دنبال فریم‌ریت بالا در کیفیت QHD هستند عالی است. کیبورد RGB تک‌کلید و درگاه Thunderbolt 4 دارد.",
    },
    {
      key: "macbook-air-m3", name: "لپ‌تاپ اپل MacBook Air 13 M3 ظرفیت ۲۵۶ گیگابایت", slug: "apple-macbook-air-13-m3-256", sku: "APL-MBA13-M3", brand: "Apple", category: "laptop",
      price: 68_900_000, stock: 12, featured: true, sold: 40,
      colors: [["خاکستری", "#74747C"], ["نقره‌ای", "#E3E4E5"], ["شب‌هنگام", "#2E3641"]],
      specs: [["cpu", "پردازنده", "Apple M3 (8 هسته)"], ["gpu", "پردازنده گرافیکی", "GPU ۸/۱۰ هسته‌ای"], ["ram", "حافظه موقت", "8GB Unified"], ["ssd", "حافظه SSD", "256GB"], ["display", "نمایشگر", "13.6 اینچ Liquid Retina"], ["refresh", "نرخ به‌روزرسانی", "60Hz"], ["battery", "باتری", "18 ساعت"], ["weight", "وزن", "1.24kg"]],
      tags: ["مک بوک", "macbook", "m3", "air", "اداری"],
      short: "نازترین و سبک‌ترین مک‌بوک با تراشه M3 و ۱۸ ساعت باتری.",
      desc: "مک‌بوک ایر M3 با بدنه یکپارچه آلومینیومی، بدون فن و کاملاً بی‌صدا کار می‌کند. مناسب دانشجویان، کارهای اداری و توسعه‌دهندگانی که سبکی و باتری طولانی می‌خواهند.",
    },
    {
      key: "legion-5", name: "لپ‌تاپ گیمینگ لنوو Legion 5 RTX 4070", slug: "lenovo-legion-5-rtx4070", sku: "LEN-LEG5-407", brand: "Lenovo", category: "laptop",
      price: 92_000_000, discountPrice: 86_500_000, stock: 5, isSpecial: true, sold: 18,
      colors: [["خاکستری طوفانی", "#545459"]],
      specs: [["cpu", "پردازنده", "AMD Ryzen 7 7840HS"], ["gpu", "پردازنده گرافیکی", "NVIDIA RTX 4070 8GB"], ["ram", "حافظه موقت", "16GB DDR5"], ["ssd", "حافظه SSD", "1TB NVMe"], ["display", "نمایشگر", "16 اینچ WQXGA IPS"], ["refresh", "نرخ به‌روزرسانی", "165Hz"], ["battery", "باتری", "80Wh"], ["weight", "وزن", "2.4kg"]],
      tags: ["گیمینگ", "legion", "rtx 4070", "لنوو", "ryzen"],
      short: "قدرت RTX 4070 با پردازنده Ryzen 7 و نمایشگر ۱۶۵ هرتز.",
      desc: "لژیون ۵ نسل جدید با پشتیبانی از DLSS 3.5، خنک‌کننده Lenovo ColdFront و کیبورد TrueStrike با نقطه‌گذاری دقیق، برای گیمینگ و استریم هم‌زمان طراحی شده است.",
    },
    {
      key: "vivobook-15", name: "لپ‌تاپ ایسوس VivoBook 15 i5-1235U", slug: "asus-vivobook-15-i5", sku: "ASU-VB15-I5", brand: "ASUS", category: "laptop",
      price: 38_900_000, discountPrice: 36_500_000, stock: 18, sold: 26,
      colors: [["آبی تاریک", "#394A5D"], ["نقره‌ای", "#D8D9DA"]],
      specs: [["cpu", "پردازنده", "Intel Core i5-1235U"], ["gpu", "پردازنده گرافیکی", "Intel Iris Xe"], ["ram", "حافظه موقت", "16GB DDR4"], ["ssd", "حافظه SSD", "512GB NVMe"], ["display", "نمایشگر", "15.6 اینچ FHD"], ["refresh", "نرخ به‌روزرسانی", "60Hz"], ["battery", "باتری", "42Wh"], ["weight", "وزن", "1.7kg"]],
      tags: ["اداری", "دانشجویی", "vivobook", "اقتصادی"],
      short: "لپ‌تاپ اقتصادی دانشجویی با i5 نسل ۱۲ و ۱۶ گیگ رم.",
      desc: "ویووبوک ۱۵ با قیمت مناسب، ۱۶ گیگابایت رم و کیبورد نومپد، برای کارهای روزمره، برنامه‌نویسی سبک و دانشجویان انتخابی هوشمندانه است.",
    },
    {
      key: "ps5-slim", name: "کنسول بازی سونی PlayStation 5 Slim Edition", slug: "sony-playstation-5-slim", sku: "SON-PS5S-1T", brand: "Sony", category: "console",
      price: 31_900_000, discountPrice: 29_500_000, stock: 11, featured: true, isSpecial: true, sold: 75,
      colors: [["سفید", "#F5F5F5"]],
      specs: [["storage", "حافظه", "1TB SSD"], ["resolution", "پشتیبانی 4K", "دارد — 120fps"], ["controller", "دسته", "DualSense با لمس و ارتعاش تطبیقی"]],
      tags: ["ps5", "پلی استیشن", "کنسول", "playstation", "گیم"],
      short: "کنسول نسل جدید سونی با حافظه ۱ ترابایت و دسته DualSense.",
      desc: "پلی‌استیشن ۵ اسلیم با طراحی جمع‌وجورتر و SSD یک ترابایتی، به‌علاوه بازی‌های انحصاری مثل Spider-Man 2 و God of War، محبوب‌ترین کنسول بازار است. از ray tracing و خروجی 8K پشتیبانی می‌کند.",
    },
    {
      key: "xbox-series-x", name: "کنسول بازی مایکروسافت Xbox Series X", slug: "microsoft-xbox-series-x-1tb", sku: "MIC-XSX-1T", brand: "Microsoft", category: "console",
      price: 33_500_000, stock: 8, sold: 33,
      colors: [["مشکی", "#161616"]],
      specs: [["storage", "حافظه", "1TB NVMe"], ["resolution", "پشتیبانی 4K", "دارد — 120fps"], ["controller", "دسته", "Wireless Controller نسل جدید"]],
      tags: ["xbox", "ایکس باکس", "کنسول", "گیم"],
      short: "قدرتمندترین کنسول مایکروسافت با ۱۲ ترافلاپس پردازش گرافیکی.",
      desc: "ایکس‌باکس سری X با Game Pass و بیش از ۱۰۰ بازی روز اول، ارزش خرید بسیار بالایی دارد. سازگاری کامل با نسل‌های قبل.",
    },
    {
      key: "rtx-4070-ti", name: "کارت گرافیک NVIDIA RTX 4070 Ti Super 16GB", slug: "nvidia-rtx-4070-ti-super-16gb", sku: "NVD-4070TS-16", brand: "NVIDIA", category: "pc-parts",
      price: 54_900_000, stock: 4, sold: 15,
      colors: [],
      specs: [["socket", "رابط", "PCIe 4.0 x16"], ["tdp", "مصرف انرژی", "285W"], ["warranty", "گارانتی", "36 ماه"], ["memory", "حافظه گرافیکی", "16GB GDDR6X"], ["cores", "هسته CUDA", "8448"]],
      tags: ["گرافیک", "کارت گرافیک", "rtx", "4070", "گیمینگ"],
      short: "کارت گرافیک پرچمدار میان‌رده با ۱۶ گیگ حافظه GDDR6X.",
      desc: "RTX 4070 Ti Super با پشتیبانی DLSS 3، بازی در 4K و رندرینگ حرفه‌ای، با ۱۶ گیگابایت حافظه، برای گیمرهای حرفه‌ای و کریتورها انتخابی عالی است.",
    },
    {
      key: "i7-14700k", name: "پردازنده اینتل Core i7-14700K", slug: "intel-core-i7-14700k", sku: "INT-I7-147K", brand: "Intel", category: "pc-parts",
      price: 22_500_000, stock: 9, sold: 12,
      colors: [],
      specs: [["socket", "سوکت", "LGA 1700"], ["tdp", "مصرف انرژی", "125W (253W Boost)"], ["warranty", "گارانتی", "36 ماه"], ["cores", "هسته", "20 هسته / 28 رشته"], ["clock", "فرکانس", "3.4GHz تا 5.6GHz"]],
      tags: ["پردازنده", "cpu", "i7", "اینتل", "گیمینگ"],
      short: "۲۰ هسته پردازشی برای گیم و رندر با فرکانس بوست ۵.۶ گیگاهرتز.",
      desc: "کور i7-14700K با ۲۰ هسته و ۲۸ رشته، برای گیمینگ سنگین، استریم و رندرینگ هم‌زمان قدرتمند است.",
    },
    {
      key: "lg-ultragear-27", name: "مانیتور گیمینگ LG UltraGear 27 اینچ 240Hz", slug: "lg-ultragear-27-240hz", sku: "LG-UG27-240", brand: "LG", category: "monitor",
      price: 28_900_000, discountPrice: 26_400_000, stock: 10, featured: true, sold: 28,
      colors: [["مشکی", "#1A1A1A"]],
      specs: [["size", "اندازه", "27 اینچ"], ["resolution", "وضوح تصویر", "QHD 2560×1440"], ["refresh", "نرخ به‌روزرسانی", "240Hz"], ["panel", "پنل", "Nano IPS"], ["response", "زمان پاسخ", "1ms GtG"]],
      tags: ["مانیتور گیمینگ", "ال جی", "240hz", "ultragear"],
      short: "مانیتور ۲۴۰ هرتز Nano IPS برای گیمرهای رقابتی.",
      desc: "التراگییر ۲۷ اینچ با پنل Nano IPS رنگ‌های دقیق و زاویه دید گسترده ارائه می‌کند؛ ۲۴۰ هرتز و ۱ms برای بازی‌های رقابتی مثل Valorant و CS2 ایده‌آل است.",
    },
    {
      key: "odyssey-g7", name: "مانیتور گیمینگ سامسونگ Odyssey G7 خمیده 32 اینچ", slug: "samsung-odyssey-g7-32", sku: "SAM-ODG7-32", brand: "Samsung", category: "monitor",
      price: 34_900_000, stock: 6, sold: 14,
      colors: [["مشکی", "#101012"]],
      specs: [["size", "اندازه", "32 اینچ خمیده 1000R"], ["resolution", "وضوح تصویر", "QHD 2560×1440"], ["refresh", "نرخ به‌روزرسانی", "240Hz"], ["panel", "پنل", "VA Quantum Dot"], ["response", "زمان پاسخ", "1ms"]],
      tags: ["مانیتور خمیده", "odyssey", "سامسونگ", "گیمینگ"],
      short: "غرق در بازی با خمیدگی 1000R و ۲۴۰ هرتز.",
      desc: "ادسی G7 با انحصار خمیدگی 1000R تجربه بازی فراگیرانه می‌سازد؛ نورپردازی Infinity Core و سازگاری با G-Sync دارد.",
    },
    {
      key: "sony-xm5", name: "هدفون بی‌سیم سونی WH-1000XM5", slug: "sony-wh-1000xm5", sku: "SON-XM5-BLK", brand: "Sony", category: "headphones",
      price: 18_500_000, discountPrice: 16_900_000, stock: 16, featured: true, sold: 47, isSpecial: true,
      colors: [["مشکی", "#1C1C1E"], ["نقره‌ای دودی", "#C8C4BC"]],
      specs: [["type", "نوع", "Over-Ear بی‌سیم"], ["anc", "حذف نویز", "فعال — بهترین کلاس"], ["battery", "باتری", "30 ساعت — شارژ سریع ۳ دقیقه = ۳ ساعت"]],
      tags: ["هدفون", "سونی", "xm5", "anc", "حذف نویز"],
      short: "بهترین هدفون نویزگیر بازار با ۳۰ ساعت باتری.",
      desc: "WH-1000XM5 با ۸ میکروفون و دو پردازنده، حذف نویز بی‌نظیری دارد؛ صدای LDAC Hi-Res و مکالمه با کیفیت فوق‌العاده. برای پرواز، دفتر کار و مطالعه بهترین انتخاب است.",
    },
    {
      key: "airpods-pro-2", name: "هندزفری بی‌سیم اپل AirPods Pro 2 USB-C", slug: "apple-airpods-pro-2-usbc", sku: "APL-APP2-USC", brand: "Apple", category: "earbuds",
      price: 11_200_000, stock: 24, sold: 68,
      colors: [["سفید", "#FAFAFA"]],
      specs: [["type", "نوع", "In-Ear بی‌سیم"], ["anc", "حذف نویز", "نسل ۲ + حالت شفاف تطبیقی"], ["battery", "باتری", "6 ساعت + 30 ساعت با کیس"]],
      tags: ["ایرپاد", "airpods", "اپل", "هندزفری"],
      short: "ایرپاد پرو ۲ با حذف نویز نسل دوم و حالت شفاف تطبیقی.",
      desc: "ایرپاد پرو ۲ با تراشه H2، صدای فضایی با ردیابی حرکت سر و کنترل لمسیVolume. کیس USB-C با اسپیکر و باندل‌کننده برای یافتن گمشده.",
    },
    {
      key: "apple-watch-9", name: "ساعت هوشمند اپل Watch Series 9 سایز 45 میلی‌متری", slug: "apple-watch-series-9-45", sku: "APL-AW9-45", brand: "Apple", category: "smart-watch",
      price: 24_500_000, discountPrice: 22_900_000, stock: 13, featured: true, sold: 35,
      colors: [["میدنایت", "#2E3236"], ["استارلایت", "#E6E0D8"], ["قرمز", "#C7383B"]],
      specs: [["display", "نمایشگر", "Retina با روشنایی 2000 نیت"], ["battery", "باتری", "18 ساعت"], ["health", "سنسورها", "ECG، SpO2، دمای پوست، ضربان قلب"]],
      tags: ["ساعت هوشمند", "اپل واچ", "apple watch", "سلامت"],
      short: "ساعت هوشمند اپل با ژست Double Tap و نمایشگر ۲۰۰۰ نیتی.",
      desc: "اپل واچ سری ۹ با تراشه S9 و ژست جدید Double Tap (تکینگ انگشت برای کنترل)، دقیق‌ترین ساعت هوشمند سلامت بازار است.",
    },
    {
      key: "galaxy-watch-6", name: "ساعت هوشمند سامسونگ Galaxy Watch 6 سایز 44 میلی‌متری", slug: "samsung-galaxy-watch-6-44", sku: "SAM-GW6-44", brand: "Samsung", category: "smart-watch",
      price: 15_900_000, stock: 15, sold: 24,
      colors: [["گرافیت", "#45444A"], ["نقره‌ای", "#D6D6D6"]],
      specs: [["display", "نمایشگر", "1.5 اینچ AMOLED — Always On"], ["battery", "باتری", "425mAh — ~40 ساعت"], ["health", "سنسورها", "BioActive: ضربان، ECG، خواب، BIA"]],
      tags: ["ساعت هوشمند", "گلکسی واچ", "اندروید", "ورزشی"],
      short: "ساعت ورزشی اندرویدی با آنالیز کامل بدن و خواب.",
      desc: "گلکسی واچ ۶ با Wear OS و Google Apps، آنالیز تربیتی حرفه‌ای و ردیابی خواب پیشرفته؛ بهترین ساعت هوشمند برای کاربران اندروید.",
    },
    {
      key: "anker-powercore", name: "پاوربانک انکر PowerCore 20000 میلی‌آمپر 22.5 واتی", slug: "anker-powercore-20000-22w", sku: "ANK-PC20-22W", brand: "Anker", category: "powerbank",
      price: 3_450_000, discountPrice: 2_990_000, stock: 40, sold: 90, isSpecial: true,
      colors: [["مشکی", "#242428"]],
      specs: [["capacity", "ظرفیت", "20000mAh"], ["power", "توان خروجی", "22.5W PD"], ["ports", "تعداد پورت", "2 (USB-C + USB-A)"]],
      tags: ["پاوربانک", "انکر", "anker", "شارژ سریع", "20000"],
      short: "پاوربانک محبوب انکر با شارژ سریع ۲۲.۵ وات.",
      desc: "پاورکور ۲۰۰۰۰ با قابلیت شارژ موبایل ۴ بار کامل، نمایشگر LED وضعیت و کیفیت ساخت انکر — محبوب‌ترین پاوربانک بازار.",
    },
    {
      key: "anker-gan65", name: "شارژر دیواری انکر 65 وات GaN با ۳ پورت", slug: "anker-65w-gan-3port", sku: "ANK-G65-3P", brand: "Anker", category: "charger",
      price: 2_150_000, stock: 33, sold: 55,
      colors: [["سفید", "#F5F5F7"]],
      specs: [["power", "توان", "65W GaN II"], ["ports", "پورت‌ها", "2×USB-C + 1×USB-A"]],
      tags: ["شارژر", "انکر", "گان", "65 وات", "type c"],
      short: "شارژر فشرده ۶۵ واتی برای لپ‌تاپ و موبایل هم‌زمان.",
      desc: "شارژر GaN انکر با ۳ پورت، لپ‌تاپ USB-C و دو دستگاه دیگر را هم‌زمان شارژ می‌کند؛ نصف حجم شارژرهای معمولی.",
    },
    {
      key: "samsung-990-pro", name: "حافظه SSD سامسونگ 990 PRO NVMe ظرفیت 1 ترابایت", slug: "samsung-990-pro-1tb", sku: "SAM-990P-1T", brand: "Samsung", category: "storage",
      price: 5_850_000, discountPrice: 5_250_000, stock: 19, sold: 42,
      colors: [],
      specs: [["capacity", "ظرفیت", "1TB"], ["type", "نوع", "M.2 NVMe PCIe 4.0"], ["read", "سرعت خواندن", "7450MB/s"], ["write", "سرعت نوشتن", "6900MB/s"]],
      tags: ["اس اس دی", "ssd", "nvme", "سامسونگ", "990"],
      short: "سریع‌ترین SSD مصرفی با سرعت خواندن ۷۴۵۰ مگابایت.",
      desc: "990 PRO برای گیمرها و حرفه‌ای‌ها؛ لود سریع بازی‌ها، بوت ویندوز در چند ثانیه و انتقال فایل‌های حجیم در کسری از زمان HDD.",
    },
    {
      key: "mx-keys-s],", name: "", slug: "", sku: "", brand: "", category: "",
      price: 0, stock: 0, specs: [], tags: [], short: "", desc: "",
    },
  ];

  // (fix the accidental broken entry by filtering)
  const products = PRODUCTS.filter((p) => p.slug && p.price > 0);

  const created = {} as Record<string, string>;
  for (const p of products) {
    const img = pickImage(p.key);
    const gallery = images(p.key).slice(0, 3).filter((u) => u !== img);
    const mainImage = img ?? gallery[0] ?? null;
    const galleryAll = [...(mainImage ? [mainImage] : []), ...gallery].slice(0, 3);

    const record = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        shortDescription: p.short,
        description: p.desc,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        stock: p.stock,
        minStock: 5,
        categoryId: cat[p.category],
        brandId: brand[p.brand],
        colors: p.colors?.length ? S(p.colors.map(([name, hex]) => ({ name, hex }))) : null,
        specifications: p.specs.length ? S(p.specs.map(([key, label, value]) => ({ key, label, value }))) : null,
        tags: p.tags?.length ? S(p.tags) : null,
        mainImage,
        status: "PUBLISHED",
        featured: !!p.featured,
        isSpecial: !!p.isSpecial,
        soldCount: p.sold ?? 0,
        searchText: searchTextOf(p.name, p.slug, p.sku, p.brand, p.tags.join(" "), p.specs.map((s) => s[2]).join(" ")),
        seoTitle: `${p.name} | خرید با بهترین قیمت از تاج الکترونیکس`,
        seoDescription: p.short,
        images: { create: galleryAll.map((url, i) => ({ url, alt: p.name, sortOrder: i })) },
      },
    });
    created[p.key] = record.id;
  }
  console.log(`  ✓ ${products.length} products`);

  // remaining products that were cut from the list above
  const EXTRA: P[] = [
    {
      key: "mx-keys-s", name: "کیبورد بی‌سیم لاجیتک MX Keys S", slug: "logitech-mx-keys-s", sku: "LOG-MXKS-BLK", brand: "Logitech", category: "keyboard",
      price: 4_850_000, stock: 14, sold: 20,
      colors: [["مشکی", "#2A2A2E"]],
      specs: [["type", "نوع", "ممبرین Low-Profile"], ["layout", "چیدمان", "کامل با نومپد"], ["connect", "اتصال", "بلوتوث + دانگل — ۳ دستگاه"]],
      tags: ["کیبورد", "لاجیتک", "mx keys", "بی سیم", "اداری"],
      short: "کیبورد حرفه‌ای بی‌سیم با نور Smart و اتصال هم‌زمان ۳ دستگاه.",
      desc: "MX Keys S با کلیدهای کم‌ارتفاع، نور پس‌زمینه هوشمند و کلیدهای Fn قابل شخصی‌سازی، برای برنامه‌نویسی و کارهای اداری طولانی‌مدت طراحی شده است.",
    },
    {
      key: "mx-master-3s", name: "موس بی‌سیم لاجیتک MX Master 3S", slug: "logitech-mx-master-3s", sku: "LOG-MXM3S", brand: "Logitech", category: "mouse",
      price: 4_350_000, discountPrice: 3_990_000, stock: 17, sold: 38, featured: true,
      colors: [["گرافیت", "#3B3B40"]],
      specs: [["dpi", "دقت (DPI)", "8000 DPI"], ["connect", "اتصال", "بلوتوث + Bolt receiver"]],
      tags: ["موس", "ماوس", "لاجیتک", "mx master", "بی سیم"],
      short: "پرچمدار موس‌های اداری با اسکرول MagSpeed و سنسور 8000DPI.",
      desc: "MX Master 3S با چرخ اسکرول الکترومغناطیسی MagSpeed، دکمه‌های قابل برنامه‌ریزی و ارگونومی بی‌نظیر، انتخاب اول حرفه‌ای‌هاست.",
    },
    {
      key: "epson-projector", name: "پروژکتور اپسون Home Cinema 1080p", slug: "epson-home-cinema-1080p", sku: "EPS-HC1080", brand: "Epson", category: "projector",
      price: 42_500_000, stock: 5, sold: 8,
      colors: [["سفید", "#F0F0F0"]],
      specs: [["resolution", "وضوح", "Full HD 1080p — 3LCD"], ["brightness", "روشنایی", "3300 لومن"], ["contrast", "کنتراست", "40,000:1"], ["throw", "نسبت پرتاب", "پرتاب کوتاه"], ["lamp", "عمر لامپ", "15000 ساعت (Eco)"]],
      tags: ["پروژکتور", "اپسون", "سینما خانگی", "پروژکتور سینما"],
      short: "پروژکتور سینمای خانگی با ۳۳۰۰ لومن و کنتراست ۴۰ هزار.",
      desc: "پروژکتور اپسون 3LCD با رنگ‌های طبیعی و روشنایی بالا، حتی در نور محیط قابل استفاده است؛ برای تماشای فوتبال و فیلم در خانه عالی است.",
    },
    {
      key: "jbl-charge-5", name: "اسپیکر بلوتوثی JBL Charge 5 ضدآب", slug: "jbl-charge-5", sku: "JBL-CHG5-BLK", brand: "JBL", category: "speaker",
      price: 6_150_000, discountPrice: 5_450_000, stock: 22, sold: 41, isSpecial: true,
      colors: [["مشکی", "#202022"], ["آبی", "#2E7DC2"], ["قرمز", "#B4362F"]],
      specs: [["power", "توان", "40W"], ["connect", "اتصال", "بلوتوث 5.1"], ["waterproof", "ضدآب", "IP67"]],
      tags: ["اسپیکر", "بلوتوث", "jbl", "چارج ۵", "ضدآب"],
      short: "اسپیکر بلوتوثی ۴۰ واتی ضدآب با پاوربانک داخلی.",
      desc: "JBL Charge 5 علاوه بر صدای بم قوی، ۲۰ ساعت پخش و قابلیت شارژ موبایل دارد؛ ضدآب IP67 برای کنار استخر و ساحل.",
    },
    {
      key: "nest-hub", name: "نمایشگر هوشمند گوگل Nest Hub 7 اینچ", slug: "google-nest-hub-7", sku: "GOO-NH7-2G", brand: "Google", category: "smart-gadgets",
      price: 7_250_000, stock: 9, sold: 11,
      colors: [["خاکی", "#DAD5CE"], ["زغالی", "#5F5F63"]],
      specs: [["type", "نوع", "نمایشگر هوشمند با دستیار صوتی Google Assistant"]],
      tags: ["گوگل", "nest hub", "خانه هوشمند", "گجت"],
      short: "مرکز کنترل خانه هوشمند با دستیار صوتی گوگل.",
      desc: "Nest Hub با نمایشگر ۷ اینچی، کنترل دستگاه‌های هوشمند خانه، نمایش دستور آشپزی، تایمر و ساعت روی میز کنار تخت — همه با صدا.",
    },
  ];

  for (const p of EXTRA) {
    const img = pickImage(p.key);
    const gallery = images(p.key).slice(0, 3).filter((u) => u !== img);
    const mainImage = img ?? gallery[0] ?? null;
    const galleryAll = [...(mainImage ? [mainImage] : []), ...gallery].slice(0, 3);
    const record = await db.product.create({
      data: {
        name: p.name, slug: p.slug, sku: p.sku, shortDescription: p.short, description: p.desc,
        price: p.price, discountPrice: p.discountPrice ?? null, stock: p.stock, minStock: 5,
        categoryId: cat[p.category], brandId: brand[p.brand],
        colors: p.colors?.length ? S(p.colors.map(([name, hex]) => ({ name, hex }))) : null,
        specifications: p.specs.length ? S(p.specs.map(([key, label, value]) => ({ key, label, value }))) : null,
        tags: p.tags?.length ? S(p.tags) : null,
        mainImage, status: "PUBLISHED", featured: !!p.featured, isSpecial: !!p.isSpecial, soldCount: p.sold ?? 0,
        searchText: searchTextOf(p.name, p.slug, p.sku, p.brand, p.tags.join(" "), p.specs.map((s) => s[2]).join(" ")),
        seoTitle: `${p.name} | خرید با بهترین قیمت از تاج الکترونیکس`,
        seoDescription: p.short,
        images: { create: galleryAll.map((url, i) => ({ url, alt: p.name, sortOrder: i })) },
      },
    });
    created[p.key] = record.id;
  }
  console.log(`  ✓ +${EXTRA.length} extra products`);

  // ── sliders ──
  const iphone = await db.product.findUnique({ where: { id: created["iphone-15-pro-max"] } });
  const ps5 = await db.product.findUnique({ where: { id: created["ps5-slim"] } });
  const watch = await db.product.findUnique({ where: { id: created["apple-watch-9"] } });

  await db.slider.createMany({
    data: [
      {
        title: "جشنواره طلایی تاج — تا ۳۰٪ تخفیف",
        subtitle: "پرچمدارهای موبایل و لپ‌تاپ با قیمت‌های رکوردی + ارسال رایگان سراسر ایران",
        desktopImage: "/uploads/sliders/slide-gold-tech.png",
        mobileImage: "/uploads/sliders/slide-gold-tech-mobile.png",
        buttonText: "مشاهده تخفیف‌ها", buttonUrl: "/products?discount=1",
        badge: "تخفیف ویژه تابستانه", productId: iphone?.id ?? null, sortOrder: 0, isActive: true,
      },
      {
        title: "دنیای گیمینگ در تاج",
        subtitle: "PS5 Slim، Xbox Series X و مانیتورهای ۲۴۰ هرتز — با ضمانت اصالت",
        desktopImage: "/uploads/sliders/slide-gaming.png",
        buttonText: "ورود به دنیای بازی", buttonUrl: "/products?category=console",
        badge: "کنسول‌ها", productId: ps5?.id ?? null, sortOrder: 1, isActive: true,
      },
      {
        title: "گجت‌های هوشمند، زندگی هوشمندتر",
        subtitle: "ساعت‌های هوشمند، هدفون‌ها و گجت‌های همراه با پرداخت امن و مشاوره AI",
        desktopImage: "/uploads/sliders/slide-smart.png",
        buttonText: "مشاهده گجت‌ها", buttonUrl: "/products?category=smart-watch",
        badge: "تازه رسیده‌ها", productId: watch?.id ?? null, sortOrder: 2, isActive: true,
      },
    ],
  });
  console.log("  ✓ sliders");

  // ── coupons ──
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10, minAmount: 5_000_000, maxUsage: 500, perUserLimit: 1, isActive: true },
      { code: "TAJ5M", type: "FIXED", value: 5_000_000, minAmount: 25_000_000, maxUsage: 100, perUserLimit: 1, isActive: true, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
    ],
  });

  // ── reviews ──
  const REVIEW_SETS: [string, string, number, string, string, string][] = [
    ["iphone-15-pro-max", "پرچمدار واقعی", 5, "کیفیت ساخت تیتانیومی فوق‌العاده", "دو ماهه دارمش؛ باتری یک روز کامل با استفاده سنگین می‌کشه. دوربین شبش واقعا معرکه‌ست. ارزش هر تومنشو داره.", "APPROVED"],
    ["iphone-15-pro-max", "قیمت بالاست", 4, "عالی ولی گرون", "از نظر سخت‌افزاری هیچ کمبودی نداره فقط قیمتش برای خیلی‌ها سخته.", "APPROVED"],
    ["galaxy-s24-ultra", "بهترین دوربین بازار", 5, "زوم ۱۰۰x واقعا کار می‌کنه", "از زمان S21 اولترا سامسونگ داشتم، این نسل هم از Galaxy AI و هم از کیفیت دوربین پیشرفت چشمگیر داشته.", "APPROVED"],
    ["ps5-slim", "محبوب‌ترین کنسول", 5, "بازی‌های انحصاری بی‌نظیر", "SSD یک ترابی لودها رو حذف کرده. DualSense یکی از بهترین ابداعات ده سال اخیر گیمینه.", "APPROVED"],
    ["ps5-slim", "گرم میشه", 4, "در تابستان صدای فان", "در هوای گرم بعد از یک ساعت فانش بلند میشه ولی مشکلی ایجاد نمی‌کنه.", "PENDING"],
    ["sony-xm5", "پادشاه ANC", 5, "حذف نویز جادویی", "تو هواپیما انگار دنیا رو خاموش می‌کنه. باتری هم واقعا ۳۰ ساعته.", "APPROVED"],
    ["rog-strix-g16", "گیمینگ روان", 5, "RTX 4060 همه بازی‌ها رو QHD می‌کشه", "Cyberpunk رو با ردیابی پرتو ۷۰ فریم می‌گیره. سیستم خنک‌کننده‌ش خوبه.", "APPROVED"],
    ["macbook-air-m3", "سبک و بی‌صدا", 5, "برای کار اداری عالی", "بدون فن یعنی بی‌صدا مطلق. باتری واقعا ۱۸ ساعت. برنامه‌نویسی وب باهاش راحتم.", "APPROVED"],
    ["anker-powercore", "همراه همیشگی", 4, "پر از آفرین انکر", "دقیقا ۴ بار گوشیم رو شارژ می‌کنه. جیب سنگین میشه ولی می‌ارزه.", "APPROVED"],
    ["jbl-charge-5", "بیس قوی", 5, "برای مهمونی عالی", "صدای JBL همیشه دل‌نشینه و ضدآب بودنش خیالم رو راحت کرده.", "APPROVED"],
    ["galaxy-a55", "بهترین خرید میان‌رده", 4, "گوشی جمع‌وجور", "نمایشگرش برای قیمتش خیلی خوبه. دوربین شبش متوسطه ولی روز عالیه.", "PENDING"],
    ["samsung-990-pro", "سرعت خیره‌کننده", 5, "ویندوز ۱۱ زیر ۱۰ ثانیه بالا میاد", "از SATA به این مهاجرت کردم؛ تفاوت شب و روز. گارانتی هم داره.", "APPROVED"],
  ];
  for (let i = 0; i < REVIEW_SETS.length; i++) {
    const [key, title, rating, comment, _2, status] = REVIEW_SETS[i] as any;
    const u = reviewers[i % reviewers.length];
    await db.review.create({
      data: { productId: created[key], userId: u.id, rating, title, comment, status },
    });
  }
  // refresh ratings
  for (const key of Object.keys(created)) {
    const agg = await db.review.aggregate({ where: { productId: created[key], status: "APPROVED" }, _avg: { rating: true }, _count: true });
    await db.product.update({
      where: { id: created[key] },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
    });
  }
  console.log("  ✓ reviews");

  // ── settings ──
  await db.storeSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      announcement: "کد تخفیف خوش‌آمدگویی WELCOME10 برای اولین خرید — ۱۰٪ تخفیف روی سبد بالای ۵ میلیون تومان",
    },
    update: { announcement: "کد تخفیف خوش‌آمدگویی WELCOME10 برای اولین خرید — ۱۰٪ تخفیف روی سبد بالای ۵ میلیون تومان" },
  });
  const c2cData = {
    zarinpalEnabled: true, zarinpalSandbox: true,
    c2cEnabled: true,
    c2cCardNumber: "6037991512345678",
    c2cCardHolder: "فروشگاه تاج الکترونیکس",
    c2cIBAN: "IR120570028180010301114001",
    c2cAccountNumber: "301114001",
    c2cInstructions: "لطفاً حتماً در توضیحات واریز، شماره سفارش خود را درج کنید. مبلغ را دقیقاً همان مبلغ سفارش واریز کنید. پس از واریز، تصویر رسید را از همین صفحه ارسال کنید؛ تأیید حداکثر تا ۲ ساعت کاری.",
  };
  await db.paymentSettings.upsert({ where: { id: "main" }, create: { id: "main", ...c2cData }, update: c2cData });
  await db.aiSettings.upsert({
    where: { id: "main" },
    create: { id: "main", enabled: true, provider: "builtin", temperature: 0.7, maxTokens: 2048 },
    update: { enabled: true },
  });

  // ── delivery methods (v16 — Iranian shipping services) ──
  // Admin can add/edit/disable these from پنل → سفارش‌ها و پرداخت → روش‌های ارسال.
  // cost = Toman; etaMin/etaMax = working days. PICKUP is free in-store pickup.
  const DELIVERY_METHODS = [
    {
      name: "پست پیشتاز (پست ایران)",
      description: "ارسال به سراسر کشور با سرویس پیشتاز پست ایران؛ کد رهگیری مرسوله از طریق پیامک ارسال می‌شود.",
      type: "POST", cost: 55_000, etaMinDays: 2, etaMaxDays: 4, icon: "Package", sortOrder: 1,
    },
    {
      name: "پست سفارشی (پست ایران)",
      description: "اقتصادی‌ترین روش ارسال به سراسر کشور؛ مناسب سفارش‌های غیرفوری.",
      type: "POST", cost: 38_000, etaMinDays: 3, etaMaxDays: 7, icon: "Mailbox", sortOrder: 2,
    },
    {
      name: "تیپاکس",
      description: "ارسال سریع با نمایندگی‌های تیپاکس در اکثر شهرها؛ امکان تحویل درب منزل.",
      type: "COURIER", cost: 75_000, etaMinDays: 1, etaMaxDays: 3, icon: "Truck", sortOrder: 3,
    },
    {
      name: "چاپار اکسپرس",
      description: "سرویس پستی خصوصی چاپار با پوشش سراسری و تحویل سریع.",
      type: "COURIER", cost: 70_000, etaMinDays: 1, etaMaxDays: 3, icon: "Zap", sortOrder: 4,
    },
    {
      name: "باربری (کالای حجیم)",
      description: "ارسال با سرویس‌های باربری ایرانی معتبر — مخصوص کالاهای حجیم مثل مانیتور، کیس و تجهیزات شبکه.",
      type: "FREIGHT", cost: 120_000, etaMinDays: 2, etaMaxDays: 6, icon: "Container", sortOrder: 5,
    },
    {
      name: "پیک موتوری (تهران و کرج)",
      description: "تحویل همان روز در محدوده شهر تهران و کرج؛ قبل از ساعت ۱۵ سفارش دهید.",
      type: "COURIER", cost: 95_000, etaMinDays: 0, etaMaxDays: 1, icon: "Bike", sortOrder: 6,
    },
    {
      name: "ارسال اکسپرس (۲۴ ساعته)",
      description: "سریع‌ترین روش ارسال — پردازش فوری و تحویل ۲۴ ساعته در تهران و شهرهای بزرگ.",
      type: "EXPRESS", cost: 180_000, etaMinDays: 0, etaMaxDays: 1, icon: "Rocket", sortOrder: 7,
    },
    {
      name: "تحویل حضوری در فروشگاه",
      description: "دریافت حضوری سفارش از فروشگاه در ساعات کاری — بدون هزینه ارسال.",
      type: "PICKUP", cost: 0, etaMinDays: 0, etaMaxDays: 1, icon: "Store", sortOrder: 8,
    },
  ];
  for (const m of DELIVERY_METHODS) {
    await db.deliveryMethod.create({ data: { ...m, isActive: true } });
  }
  console.log(`  ✓ ${DELIVERY_METHODS.length} delivery methods`);

  // ── sample orders (real DB records for dashboard demo) ──
  const mkOrder = async (opts: {
    user: string; number: string; status: string; paymentStatus: string; method: string;
    items: { key: string; qty: number; color?: string }[]; daysAgo: number;
    payment?: { authority: string; refId: string; status: string; cardPan?: string };
    c2c?: { status: string; reason?: string };
  }) => {
    const productIds = opts.items.map((i) => ({ id: created[i.key], qty: i.qty, color: i.color ?? null }));
    const products = await db.product.findMany({ where: { id: { in: productIds.map((p) => p.id) } } });
    const lines = opts.items.map((i) => {
      const p = products.find((pr) => pr.id === created[i.key])!;
      const price = p.discountPrice ?? p.price;
      return { p, price, qty: i.qty, color: i.color ?? null };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const order = await db.order.create({
      data: {
        orderNumber: opts.number,
        userId: opts.user,
        status: opts.status, paymentStatus: opts.paymentStatus, paymentMethod: opts.method,
        subtotal, discount: 0, shippingCost: 0, total: subtotal,
        firstName: "سارا", lastName: "محمدی", phone: "09121111111", email: "demo@taj.local",
        province: "تهران", city: "تهران", address: "خیابان ولیعصر، کوچه بهار، پلاک ۱۲", postalCode: "1234567890",
        createdAt: new Date(Date.now() - opts.daysAgo * 86400_000),
        items: {
          create: lines.map((l) => ({
            productId: l.p.id, name: l.p.name, sku: l.p.sku, image: l.p.mainImage,
            unitPrice: l.price, discount: l.p.discountPrice ? (l.p.price - l.p.discountPrice) * l.qty : 0,
            quantity: l.qty, color: l.color, total: l.price * l.qty,
          })),
        },
      },
    });
    if (opts.payment) {
      await db.payment.create({
        data: {
          orderId: order.id, gateway: "ZARINPAL", amount: subtotal * 10,
          authority: opts.payment.authority, refId: opts.payment.refId,
          cardPan: opts.payment.cardPan ?? null, status: opts.payment.status,
          raw: S({ code: 100, message: "Verified" }),
        },
      });
    }
    if (opts.c2c) {
      await db.cardToCardPayment.create({
        data: {
          orderId: order.id, userId: opts.user,
          senderName: "سارا محمدی", senderPhone: "09121111111", senderCard: "6037991234567890",
          amount: subtotal, paidAt: new Date(Date.now() - opts.daysAgo * 86400_000 + 3600_000),
          receiptImage: "/uploads/receipts/sample-receipt.png",
          status: opts.c2c.status, rejectionReason: opts.c2c.reason ?? null,
          reviewedAt: opts.c2c.status === "PENDING" ? null : new Date(),
        },
      });
    }
    if (opts.status === "DELIVERED") {
      await db.order.update({ where: { id: order.id }, data: { trackingCode: "1122334455667" } });
    }
    return order;
  };

  await mkOrder({
    user: demo.id, number: "TAJ-DEMO01-PAID", status: "DELIVERED", paymentStatus: "PAID", method: "ZARINPAL",
    items: [{ key: "ps5-slim", qty: 1 }, { key: "anker-powercore", qty: 1 }], daysAgo: 12,
    payment: { authority: "000000000000000000000000000demo01", refId: "154002233445", status: "VERIFIED", cardPan: "6037-****" },
  });
  await mkOrder({
    user: demo.id, number: "TAJ-DEMO02-C2CP", status: "PENDING_PAYMENT", paymentStatus: "VERIFYING", method: "CARD_TO_CARD",
    items: [{ key: "jbl-charge-5", qty: 1, color: "آبی" }], daysAgo: 1,
    c2c: { status: "PENDING" },
  });
  await mkOrder({
    user: reviewers[2].id, number: "TAJ-DEMO03-SHIP", status: "SHIPPED", paymentStatus: "PAID", method: "ZARINPAL",
    items: [{ key: "sony-xm5", qty: 1 }, { key: "airpods-pro-2", qty: 1 }], daysAgo: 4,
    payment: { authority: "000000000000000000000000000demo03", refId: "154002233999", status: "VERIFIED" },
  });

  await db.notification.createMany({
    data: [
      { userId: demo.id, title: "سفارش شما ارسال شد", message: "سفارش TAJ-DEMO03-SHIP با کد رهگیری 1122334455667 ارسال شد.", type: "ORDER", link: "/account/orders" },
      { userId: demo.id, title: "رسید در حال بررسی", message: "رسید پرداخت سفارش TAJ-DEMO02-C2CP در حال بررسی است.", type: "PAYMENT", link: "/account/orders" },
    ],
  });

  // ── CMS / branding content defaults (idempotent) ──
  await seedContent();

  console.log("✅ Seed complete!");
  console.log("──────────────────────────────────────");
  console.log("👤 Super Admin:  admin@taj.local / Admin@123456");
  console.log("👤 Order Mgr:    orders@taj.local / Orders@123456");
  console.log("👤 Demo Customer: demo@taj.local / Demo@123456");
  console.log("🎟 Coupons: WELCOME10 (10%), TAJ5M (5M fixed)");
  console.log(`📦 ${products.length + EXTRA.length} products, ${REVIEW_SETS.length} reviews, 3 sample orders`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

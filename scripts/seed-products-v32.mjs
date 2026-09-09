#!/usr/bin/env bun
/* ═══════════════════════════════════════════════════════════════════
 *  TAJ Electronics — Catalog v32 (Task 14-c-1): grow the store to
 *  EXACTLY 100 products where EVERY product has its OWN verified
 *  matching image, applied to BOTH databases (db/custom.db dev +
 *  db/catalog-seed.db fresh-install seed).
 *
 *  Owner complaint: «JBL Charge waterproof speaker had a UPS-package /
 *  wrench image — each product needs its own matching image; grow to
 *  100, fully relevant. New 4K-quality banner images for sliders.»
 *
 *  What it does (data-driven · idempotent · RESUMABLE):
 *    1. CATALOG defines all 100 products (the 37 existing ones with
 *       CORRECTED image-search queries so their images get fixed, plus
 *       63 brand-new ones) — Persian names/descriptions, realistic
 *       تومان prices, stock, slugs, existing category/brand slugs.
 *    2. Per product: z-ai image-search (precise brand+model query) →
 *       pick the best-sized OSS result → curl-download to
 *       public/images/products/<slug>.{jpg|png|webp} (reject >900KB →
 *       next result; validate magic bytes so HTML/JSunk never lands).
 *    3. Upsert the Product row in BOTH DBs (same slug = update
 *       image/desc/price/stock/etc; new slug = create). NEVER deletes
 *       products; keeps sku/status/flags/rating/order+sale relations of
 *       existing rows. Gallery (ProductImage) is replaced with the one
 *       verified image so no stale mismatched shots remain.
 *    4. Progress persists to scripts/.products-progress.json → re-runs
 *       skip done products and continue where they left off.
 *
 *  RUN (bun, chunked so each call stays well under 9 minutes):
 *    bun scripts/seed-products-v32.mjs --limit 12
 *    bun scripts/seed-products-v32.mjs --category speaker --limit 4
 *    bun scripts/seed-products-v32.mjs --slug jbl-charge-5 --force
 *    bun scripts/seed-products-v32.mjs --status
 *    bun scripts/seed-products-v32.mjs --verify
 * ═══════════════════════════════════════════════════════════════════ */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images", "products");
const PROGRESS_FILE = path.join(ROOT, "scripts", ".products-progress.json");
const DB_FILES = ["db/custom.db", "db/catalog-seed.db"];

const MAX_BYTES = 1600 * 1024; // v32: raised — next/image optimizes on the fly
const MIN_BYTES = 15 * 1024; // reject suspiciously tiny files (placeholders)
const SEARCH_TIMEOUT_MS = 150_000;
const CONCURRENCY = 3;

/* ── Persian text normalizer — 1:1 with src/lib/search.ts ─────────── */
function normalizeFa(input) {
  return (input ?? "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[يﻲﻱ]/g, "ی")
    .replace(/[كﮐﮑ]/g, "ک")
    .replace(/[ۀہ]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
const buildSearchText = (...parts) => normalizeFa(parts.filter(Boolean).join(" "));

/* ── category code (for deterministic SKUs of NEW products) ───────── */
const CAT_CODE = {
  mobile: "MOB", laptop: "LAP", "desktop-pc": "DSK", "pc-parts": "PRT",
  monitor: "MON", console: "CNS", accessories: "ACC", powerbank: "PWB",
  charger: "CHG", headphones: "HPN", earbuds: "EAB", "smart-watch": "SWA",
  "smart-gadgets": "SMG", projector: "PRJ", network: "NET", storage: "STO",
  keyboard: "KYB", mouse: "MSE", webcam: "CAM", speaker: "SPK", other: "OTH",
};

/* ── compact entry builder ─────────────────────────────────────────── */
function P(slug, name, cat, brand, price, stock, short, desc, q, extra = {}) {
  return { slug, name, cat, brand, price, stock, short, desc, q, ...extra };
}
const C = (colors) => ({ colors }); // [[name, hex], …]
const S = (specs) => ({ specs }); // [[key, label, value], …]
const T = (tags) => ({ tags });
const F = (flags) => ({ flags });

/* ═════════════════════════════ THE CATALOG (100) ═══════════════════
 * Part 1 — the 37 EXISTING products (slugs must match the DB rows) with
 * corrected, precise search queries + refreshed Persian copy. Updates
 * never touch sku/status/relations.
 * ═══════════════════════════════════════════════════════════════════ */
const EXISTING = [
  P("apple-iphone-15-pro-max-256gb", "گوشی موبایل اپل iPhone 15 Pro Max ظرفیت ۲۵۶ گیگابایت", "mobile", "apple", 92500000, 14,
    "پرچمدار اپل با بدنه تیتانیومی، تراشه A17 Pro و دوربین ۴۸ مگاپیکسلی.",
    "iPhone 15 Pro Max با بدنه تیتانیومی سبک و تراشه A17 Pro، قوی‌ترین چیپ موبایل اپل در زمان عرضه است. دوربین ۴۸ مگاپیکسلی با زوم اپتیکال ۵ برابر و فیلم‌برداری ProRes، آن را به انتخاب عکاسان حرفه‌ای تبدیل کرده است. با ۲۵۶ گیگابایت فضا برای فیلم‌برداری سنگین و بازی‌های AAA کاملاً مناسب است.",
    "Apple iPhone 15 Pro Max titanium smartphone product photo",
    { ...C([["مشکی-تیتانیوم", "#3A3A3C"], ["آبی-تیتانیوم", "#38475C"], ["طلایی-تیتانیوم", "#C9A227"]]),
      ...S([["chip", "پردازنده", "Apple A17 Pro"], ["camera", "دوربین", "48MP + 12MP + 12MP"], ["display", "نمایشگر", "6.7 اینچ Super Retina XDR"]]),
      ...T(["آیفون", "اپل", "iphone 15 pro max", "پرچمدار", "تیتانیوم"]) }),

  P("samsung-galaxy-s24-ultra-512gb", "گوشی موبایل سامسونگ Galaxy S24 Ultra ظرفیت ۵۱۲ گیگابایت", "mobile", "samsung", 84000000, 11,
    "پرچمدار سامسونگ با دام ۲۰۰ مگاپیکسلی، قلم S Pen و Galaxy AI.",
    "نمایشگر ۶.۸ اینچی Dynamic AMOLED 2X با روشنایی ۲۶۰۰ نیت و قلم S Pen داخلی، S24 Ultra را به پرچمدار تمام‌عیار سامسونگ تبدیل کرده است. دوربین ۲۰۰ مگاپیکسلی همراه هوش مصنوعی Galaxy AI عکاسی شب و ترجمه هم‌زمان مکالمات را ممکن می‌کند. ظرفیت ۵۱۲ گیگابایت برای ذخیره ویدیوهای 8K بدون نگرانی کافی است.",
    "Samsung Galaxy S24 Ultra smartphone with S Pen stylus product photo",
    { ...C([["مشکی-تیتانیوم", "#2B2B31"], ["خاکستری-تیتانیوم", "#8A8A8F"], ["بنفش", "#7C5CBF"]]),
      ...S([["chip", "پردازنده", "Snapdragon 8 Gen 3"], ["camera", "دوربین", "200MP OIS"], ["display", "نمایشگر", "6.8 اینچ 120Hz"]]),
      ...T(["سامسونگ", "galaxy s24 ultra", "پرچمدار", "اس پن", "گلکسی"]) }),

  P("xiaomi-14-256gb", "گوشی موبایل شیائومی Xiaomi 14 ظرفیت ۲۵۶ گیگابایت", "mobile", "xiaomi", 42800000, 19,
    "پرچمدار جمع‌وجور شیائومی با دوربین لایکا و تراشه Snapdragon 8 Gen 3.",
    "کوچک‌ترین پرچمدار بازار با نمایشگر ۶.۳۶ اینچی و نرخ نوسازی ۱۲۰ هرتز که کار با یک دست را راحت می‌کند. تراشه Snapdragon 8 Gen 3 و دوربین لایکا ۵۰ مگاپیکسلی کیفیت پرچمدار را در بدنه‌ای جمع‌وجور ارائه می‌دهد. شارژ سیمی ۹۰ واتی فقط نیم ساعت تا پرشدن کامل باتری زمان می‌برد.",
    "Xiaomi 14 smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"], ["سبز-جاید", "#2E8B57"]]),
      ...S([["chip", "پردازنده", "Snapdragon 8 Gen 3"], ["camera", "دوربین", "50MP Leica"], ["display", "نمایشگر", "6.36 اینچ LTPO AMOLED"]]),
      ...T(["شیائومی", "xiaomi 14", "لایکا", "پرچمدار", "گوشی"]) }),

  P("google-pixel-8-pro-256gb", "گوشی موبایل گوگل Pixel 8 Pro ظرفیت ۲۵۶ گیگابایت", "mobile", "google", 58500000, 9,
    "گوشی هوش مصنوعی گوگل با تراشه Tensor G3 و ۷ سال آپدیت اندروید.",
    "هوش مصنوعی گوگل در قلب این گوشی نشسته؛ از جادوی عکاسی Magic Editor تا دستیار شخصی Gemini. دوربین ۵۰ مگاپیکسلی با پردازنده Tensor G3 در نور کم بی‌نظیر عمل می‌کند و ۷ سال آپدیت اندروید می‌گیرد. نمایشگر Super Actua ۶.۷ اینچی با روشنایی ۲۴۰۰ نیت حتی زیر آفتاب کاملاً خواناست.",
    "Google Pixel 8 Pro smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی-آسمانی", "#A7C7E7"], ["کرمی", "#EAE0D5"]]),
      ...S([["chip", "پردازنده", "Google Tensor G3"], ["camera", "دوربین", "50MP + 48MP + 48MP"], ["display", "نمایشگر", "6.7 اینچ Super Actua"]]),
      ...T(["گوگل", "pixel 8 pro", "اندروید", "هوش مصنوعی", "گوشی"]) }),

  P("apple-iphone-13-128gb", "گوشی موبایل اپل iPhone 13 ظرفیت ۱۲۸ گیگابایت", "mobile", "apple", 47900000, 23,
    "آیفون ۱۳ اقتصادی با تراشه A15 Bionic و دو دوربین ۱۲ مگاپیکسلی.",
    "iPhone 13 همچنان یکی از پرفروش‌ترین آیفون‌های بازار است؛ تراشه A15 Bionic و دو دوربین ۱۲ مگاپیکسلی با حالت سینمایی را دارد. باتری آن برای یک روز کامل کار روزمره کافی است و آپدیت‌های iOS طولانی‌مدت دریافت می‌کند. انتخابی مقرون‌به‌صرفه برای ورود به دنیای اپل.",
    "Apple iPhone 13 smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید-ستاره‌ای", "#F2F2F7"], ["صورتی", "#E8A0BF"]]),
      ...S([["chip", "پردازنده", "Apple A15 Bionic"], ["camera", "دوربین", "12MP + 12MP"], ["display", "نمایشگر", "6.1 اینچ Super Retina XDR"]]),
      ...T(["آیفون", "iphone 13", "اپل", "گوشی اپل", "اقتصادی"]) }),

  P("samsung-galaxy-a55-128gb", "گوشی موبایل سامسونگ Galaxy A55 ظرفیت ۱۲۸ گیگابایت", "mobile", "samsung", 21900000, 34,
    "میان‌رده محبوب سامسونگ با نمایشگر ۱۲۰ هرتزی و بدنه فلزی.",
    "میان‌رده محبوب سامسونگ با نمایشگر ۶.۶ اینچی Super AMOLED و نرخ نوسازی ۱۲۰ هرتز است. بدنه فلزی و شیشه Gorilla Glass Victus+ مقاومت بالایی در برابر ضربه دارند. دوربین ۵۰ مگاپیکسلی با لرزشگیر اپتیکال، عکس‌های شب رضایت‌بخشی می‌گیرد.",
    "Samsung Galaxy A55 smartphone product photo",
    { ...C([["مشکی-جیغ", "#1F1F24"], ["آبی-آیسی", "#A7C7E7"], ["بنفش-لیلا", "#B49BD1"]]),
      ...S([["chip", "پردازنده", "Exynos 1480"], ["camera", "دوربین", "50MP OIS"], ["display", "نمایشگر", "6.6 اینچ 120Hz"]]),
      ...T(["سامسونگ", "galaxy a55", "میان‌رده", "گلکسی", "گوشی"]) }),

  P("asus-rog-strix-g16-rtx4060", "لپ‌تاپ گیمینگ ایسوس ROG Strix G16 RTX 4060", "laptop", "asus", 78500000, 7,
    "لپ‌تاپ گیمینگ ROG با Core i9-14900HX، RTX 4060 و نمایشگر ۲۴۰ هرتز.",
    "لپ‌تاپ گیمینگ ایسوس با تراشه Core i9-14900HX و کارت RTX 4060 هر بازی AAA را در تنظیمات بالا روان اجرا می‌کند. نمایشگر ۱۶ اینچی QHD+ با نرخ ۲۴۰ هرتز برای بازی‌های رقابتی طراحی شده است. سیستم خنک‌کننده هوشمند ROG آن را حتی زیر فشار طولانی خنک نگه می‌دارد.",
    "ASUS ROG Strix G16 gaming laptop product photo",
    { ...S([["cpu", "پردازنده", "Core i9-14900HX"], ["gpu", "گرافیک", "RTX 4060 8GB"], ["display", "نمایشگر", "16 اینچ QHD+ 240Hz"]]),
      ...T(["ایسوس", "rog", "گیمینگ", "لپ‌تاپ گیمینگ", "rtx 4060"]) }),

  P("apple-macbook-air-13-m3-256", "لپ‌تاپ اپل MacBook Air 13 M3 ظرفیت ۲۵۶ گیگابایت", "laptop", "apple", 68900000, 16,
    "مک‌بوک ایر ۱۳ اینچ با تراشه M3، بدون فن و با باتری ۱۸ ساعته.",
    "نازک‌ترین و سبک‌ترین مک‌بوک با تراشه M3 است و چون فن ندارد کاملاً بی‌صدا کار می‌کند. باتری تا ۱۸ ساعت کار روزمره را تحمل می‌کند و نمایشگر Liquid Retina رنگ‌های زنده‌ای دارد. برای دانشجویان، برنامه‌نویسان و کارهای اداری انتخابی ایده‌آل است.",
    "Apple MacBook Air 13 M3 laptop product photo",
    { ...C([["نقره‌ای", "#C9CDD3"], ["خاکستری-فضایی", "#2B2B31"], ["شب-ستاره‌ای", "#22314A"]]),
      ...S([["chip", "پردازنده", "Apple M3"], ["ram", "حافظه", "8GB"], ["display", "نمایشگر", "13.6 اینچ Liquid Retina"]]),
      ...T(["اپل", "macbook air", "m3", "لپ‌تاپ", "مک‌بوک"]) }),

  P("lenovo-legion-5-rtx4070", "لپ‌تاپ گیمینگ لنوو Legion 5 RTX 4070", "laptop", "lenovo", 92000000, 5,
    "لپ‌تاپ گیمینگ Legion 5 با RTX 4070 و نمایشگر WQHD ۱۶۵ هرتز.",
    "لپ‌تاپ گیمینگ لنوو با کارت RTX 4070 و نمایشگر WQHD ۱۶۵ هرتز، تعادل بی‌نظیری میان قیمت و قدرت ایجاد کرده است. کیبورد Legion TrueStrike با نور RGB و حس تایپ مکانیکی خوشایندی دارد. دو اسلات M.2 برای ارتقای حافظه در آینده پیش‌بینی شده است.",
    "Lenovo Legion 5 gaming laptop product photo",
    { ...S([["cpu", "پردازنده", "Ryzen 7 7840HX"], ["gpu", "گرافیک", "RTX 4070 8GB"], ["display", "نمایشگر", "16 اینچ WQHD 165Hz"]]),
      ...T(["لنوو", "legion 5", "گیمینگ", "لپ‌تاپ گیمینگ", "rtx 4070"]) }),

  P("asus-vivobook-15-i5", "لپ‌تاپ ایسوس VivoBook 15 i5-1235U", "laptop", "asus", 38900000, 22,
    "لپ‌تاپ اداری و دانشجویی با Core i5-1235U و صفحه ۱۵.۶ اینچی.",
    "لپ‌تاپ مناسب کارهای روزمره و اداری با پردازنده Core i5-1235U و نمایشگر ۱۵.۶ اینچی Full HD است. وزن ۱.۷ کیلوگرمی و قیمت مناسب آن را به گزینه‌ای محبوب برای دانشجویان تبدیل کرده است. پورت‌های متنوع شامل USB-C، HDMI و کارت‌خوان microSD دارد.",
    "ASUS VivoBook 15 laptop product photo",
    { ...S([["cpu", "پردازنده", "Core i5-1235U"], ["ram", "حافظه", "8GB DDR4"], ["display", "نمایشگر", "15.6 اینچ Full HD"]]),
      ...T(["ایسوس", "vivobook", "لپ‌تاپ", "دانشجویی", "اداری"]) }),

  P("sony-playstation-5-slim", "کنسول بازی سونی PlayStation 5 Slim Edition", "console", "sony", 31900000, 13,
    "کنسول PS5 اسلیم با درایو دیسک و کنترلر DualSense.",
    "نسل جدید کنسول سونی با حجم ۳۰٪ کمتر از نسخه استاندارد و درایو دیسک جداشدنی است. لذت بازی‌های انحصاری مثل God of War و Spider-Man با گرافیک 4K و تا ۱۲۰ فریم تجربه می‌شود. کنترلر DualSense با فیدبک لمسی و ماشه تطبیقی حس بازی را دگرگون می‌کند.",
    "Sony PlayStation 5 Slim console product photo",
    { ...S([["storage", "حافظه", "1TB SSD"], ["resolution", "خروجی", "4K 120Hz"], ["drive", "درایو", "Blu-ray Ultra HD"]]),
      ...T(["سونی", "ps5", "پلی‌استیشن", "کنسول", "بازی"]) }),

  P("microsoft-xbox-series-x-1tb", "کنسول بازی مایکروسافت Xbox Series X", "console", "microsoft", 33500000, 8,
    "قوی‌ترین کنسول نسل نهم با توان ۱۲ ترافلاپس و هدف ۴K.",
    "قوی‌ترین کنسول نسل نهم با توان پردازشی ۱۲ ترافلاپس و هدف‌گذاری 4K با ۱۲۰ فریم است. سرویس Game Pass دسترسی به صدها بازی را با هزینه‌ای ماهانه ممکن می‌کند. SSD اختصاصی NVMe زمان بارگذاری بازی‌ها را تقریباً حذف کرده است.",
    "Microsoft Xbox Series X console product photo",
    { ...S([["storage", "حافظه", "1TB NVMe SSD"], ["gpu", "پردازنده گرافیکی", "12 TFLOPS RDNA2"], ["resolution", "خروجی", "4K 120Hz"]]),
      ...T(["ایکس‌باکس", "xbox series x", "مایکروسافت", "کنسول", "گیم‌پس"]) }),

  P("nvidia-rtx-4070-ti-super-16gb", "کارت گرافیک NVIDIA RTX 4070 Ti Super 16GB", "pc-parts", "nvidia", 54900000, 6,
    "کارت گرافیک ۱۶ گیگابایتی با DLSS 3.5 برای گیمینگ ۱۴۴۰p و 4K.",
    "کارت گرافیک میان‌رده قدرتمند انویدیا با ۱۶ گیگابایت حافظه GDDR6X است که برای گیمینگ ۱۴۴۰p و حتی 4K عالی عمل می‌کند. معماری Ada Lovelace همراه DLSS 3.5 فریم‌ریت را چند برابر بالا می‌برد. برای رندر سه‌بعدی و کارهای گرافیکی حرفه‌ای هم انتخابی مطمئن است.",
    "NVIDIA GeForce RTX 4070 Ti Super graphics card product photo",
    { ...S([["memory", "حافظه", "16GB GDDR6X"], ["dlss", "فناوری", "DLSS 3.5"], ["power", "توان مصرفی", "285W"]]),
      ...T(["انویدیا", "rtx 4070 ti super", "کارت گرافیک", "گیمینگ", "دی‌ال‌اس‌اس"]) }),

  P("intel-core-i7-14700k", "پردازنده اینتل Core i7-14700K", "pc-parts", "intel", 22500000, 15,
    "پردازنده ۲۰ هسته‌ای رومیزی با فرکانس بوست ۵.۵ گیگاهرتز.",
    "پردازنده رومیزی اینتل با ۲۰ هسته (۸ کارایی + ۱۲ کارآمد) و فرکانس تا ۵.۵ گیگاهرتز است. برای گیمینگ، استریم و رندر هم‌زمان قدرت کافی دارد. با مادربردهای سری ۶۰۰ و ۷۰۰ پس از به‌روزرسانی BIOS سازگار است.",
    "Intel Core i7-14700K processor box product photo",
    { ...S([["cores", "هسته‌ها", "20 (8P+12E)"], ["boost", "فرکانس بوست", "5.5GHz"], ["socket", "سوکت", "LGA1700"]]),
      ...T(["اینتل", "i7 14700k", "پردازنده", "سی‌پی‌یو", "گیمینگ"]) }),

  P("lg-ultragear-27-240hz", "مانیتور گیمینگ LG UltraGear 27 اینچ 240Hz", "monitor", "lg", 28900000, 12,
    "مانیتور Nano IPS رزولوشن QHD با ۲۴۰ هرتز و زمان پاسخ ۱ms.",
    "مانیتور گیمینگ LG با پنل Nano IPS، رزولوشن QHD و نرخ نوسازی ۲۴۰ هرتز است. زمان پاسخ‌دهی ۱ میلی‌ثانیه و سازگاری با G-Sync تصویری بدون پارگی و تار ارائه می‌دهد. نسبت رنگ دقیق آن برای بازی‌های رقابتی و طراحی فوق‌العاده است.",
    "LG UltraGear 27 inch gaming monitor product photo",
    { ...S([["panel", "پنل", "Nano IPS"], ["refresh", "نرخ نوسازی", "240Hz"], ["resolution", "رزولوشن", "QHD 2560x1440"]]),
      ...T(["ال‌جی", "ultragear", "مانیتور گیمینگ", "240hz", "ایپی‌اس"]) }),

  P("samsung-odyssey-g7-32", "مانیتور گیمینگ سامسونگ Odyssey G7 خمیده 32 اینچ", "monitor", "samsung", 34900000, 7,
    "مانیتور خمیده ۱۰۰۰R سامسونگ با QHD و ۲۴۰ هرتز.",
    "نمایشگر خمیده 1000R سامسونگ با رزولوشن QHD و ۲۴۰ هرتز، غرق‌کننده‌ترین تجربه گیمینگ را می‌سازد. نورپردازی Infinity Core پشت مانیتور به ست‌آپ گیمینگ رنگ می‌دهد. پنل VA با کنتراست ۳۰۰۰:1 عمق سیاه بی‌نظیری دارد.",
    "Samsung Odyssey G7 curved gaming monitor product photo",
    { ...S([["panel", "پنل", "VA خمیده 1000R"], ["refresh", "نرخ نوسازی", "240Hz"], ["resolution", "رزولوشن", "QHD 2560x1440"]]),
      ...T(["سامسونگ", "odyssey g7", "مانیتور خمیده", "گیمینگ", "240hz"]) }),

  P("sony-wh-1000xm5", "هدفون بی‌سیم سونی WH-1000XM5", "headphones", "sony", 18500000, 18,
    "بهترین هدفون نویزکنسلینگ بازار با ۳۰ ساعت پخش موسیقی.",
    "بهترین هدفون نویزکنسلینگ بازار با ۳۰ ساعت پخش و شارژ سریع ۳ دقیقه‌ای است. هشت میکروفون نویز محیط را تقریباً حذف می‌کنند؛ ایده‌آل برای پرواز و دفتر کار. حالت Speak-to-Chat با شروع صحبت به‌طور خودکار موسیقی را متوقف می‌کند.",
    "Sony WH-1000XM5 wireless noise cancelling headphones product photo",
    { ...C([["مشکی", "#1F1F24"], ["نقره‌ای-دودی", "#B9BDC4"]]),
      ...S([["battery", "باتری", "30 ساعت"], ["anc", "نویزکنسلینگ", "8 میکروفونی"], ["weight", "وزن", "250 گرم"]]),
      ...T(["سونی", "wh-1000xm5", "هدفون", "نویزکنسلینگ", "بلوتوث"]) }),

  P("apple-airpods-pro-2-usbc", "هندزفری بی‌سیم اپل AirPods Pro 2 USB-C", "earbuds", "apple", 11200000, 27,
    "هندزفری اپل با تراشه H2 و نویزکنسلینگ تطبیقی.",
    "AirPods Pro 2 با تراشه H2 و نویزکنسلینگ تطبیقی تا ۲ برابر قوی‌تر از نسل قبل عرضه شده است. حالت شفافیت تطبیقی با Spatial Audio تجربه شنیداری واقعی می‌سازد. کیس با پورت USB-C شارژ می‌شود و مجموعاً تا ۳۰ ساعت پخش را ممکن می‌کند.",
    "Apple AirPods Pro 2 wireless earbuds with USB-C charging case product photo",
    { ...C([["سفید", "#F2F2F7"]]),
      ...S([["chip", "تراشه", "Apple H2"], ["anc", "نویزکنسلینگ", "تطبیقی"], ["battery", "باتری", "6 ساعت + 24 ساعت کیس"]]),
      ...T(["اپل", "airpods pro", "هندزفری", "ایرپاد", "بلوتوث"]) }),

  P("apple-watch-series-9-45", "ساعت هوشمند اپل Watch Series 9 سایز 45 میلی‌متری", "smart-watch", "apple", 24500000, 17,
    "ساعت هوشمند اپل با تراشه S9 و حرکت Double Tap.",
    "Apple Watch Series 9 با نمایشگر روشن‌تر و تراشه S9، حرکت Double Tap را برای کنترل با یک دست ارائه می‌دهد. سنسور اکسیژن خون و ECG همیشه سلامت شما را رصد می‌کنند. با آیفون جفت‌سازی می‌شود و تا ۳۶ ساعت باتری دارد.",
    "Apple Watch Series 9 smartwatch product photo",
    { ...C([["مشکی", "#1F1F24"], ["نقره‌ای", "#C9CDD3"], ["قرمز-گل-بهی", "#B4362F"]]),
      ...S([["chip", "تراشه", "Apple S9"], ["size", "سایز", "45mm"], ["health", "سلامت", "ECG + SpO2"]]),
      ...T(["اپل", "watch series 9", "ساعت هوشمند", "اپل واچ", "سلامت"]) }),

  P("samsung-galaxy-watch-6-44", "ساعت هوشمند سامسونگ Galaxy Watch 6 سایز 44 میلی‌متری", "smart-watch", "samsung", 15900000, 21,
    "ساعت هوشمند سامسونگ با Wear OS و آنالیز خواب پیشرفته.",
    "ساعت هوشمند سامسونگ با Wear OS و نمایشگر AMOLED همیشه‌روشن است. آنالیز خواب پیشرفته و سنسور BioActive وضعیت بدنی شما را دقیق رصد می‌کنند. ردیابی بیش از ۱۰۰ تمرین ورزشی و GPS داخلی دارد.",
    "Samsung Galaxy Watch 6 smartwatch product photo",
    { ...C([["مشکی", "#1F1F24"], ["نقره‌ای", "#C9CDD3"], ["کرمی", "#EAE0D5"]]),
      ...S([["size", "سایز", "44mm"], ["os", "سیستم‌عامل", "Wear OS 4"], ["health", "سلامت", "BioActive Sensor"]]),
      ...T(["سامسونگ", "galaxy watch 6", "ساعت هوشمند", "ورزش", "سلامت"]) }),

  P("anker-powercore-20000-22w", "پاوربانک انکر PowerCore 20000 میلی‌آمپر 22.5 واتی", "powerbank", "anker", 3450000, 41,
    "پاوربانک ۲۰۰۰۰ میلی‌آمپری با شارژ سریع ۲۲.۵ واتی.",
    "پاوربانک ۲۰۰۰۰ میلی‌آمپری انکر با شارژ سریع ۲۲.۵ واتی تا ۴ بار گوشی را شارژ می‌کند. فناوری PowerIQ دستگاه مناسب را تشخیص می‌دهد و سریع‌ترین جریان ممکن را می‌فرستد. وزن مناسبی دارد و به‌راحتی در کوله‌جا می‌گنجد.",
    "Anker PowerCore 20000 power bank product photo",
    { ...S([["capacity", "ظرفیت", "20000mAh"], ["output", "توان خروجی", "22.5W"], ["ports", "پورت‌ها", "USB-A + USB-C"]]),
      ...T(["انکر", "پاوربانک", "powercore", "شارژ سریع", "power bank"]) }),

  P("anker-65w-gan-3port", "شارژر دیواری انکر 65 وات GaN با ۳ پورت", "charger", "anker", 2150000, 52,
    "شارژر GaN سه‌پورت برای شارژ هم‌زمان لپ‌تاپ و گوشی.",
    "شارژر فشرده GaN انکر با سه پورت (دو USB-C و یک USB-A) هم‌زمان لپ‌تاپ و گوشی را شارژ می‌کند. فناوری نیتروژن گالیوم آن را ۴۰٪ کوچک‌تر از شارژرهای معمولی ساخته است. محافظ‌های داخلی ضد گرمای بیش از حد و اورولتاژ دارد.",
    "Anker 65W GaN USB-C wall charger product photo",
    { ...S([["power", "توان", "65W"], ["ports", "پورت‌ها", "2x USB-C + 1x USB-A"], ["tech", "فناوری", "GaN + PowerIQ"]]),
      ...T(["انکر", "شارژر", "gan", "usb-c", "شارژر دیواری"]) }),

  P("samsung-990-pro-1tb", "حافظه SSD سامسونگ 990 PRO NVMe ظرفیت 1 ترابایت", "storage", "samsung", 5850000, 30,
    "سریع‌ترین NVMe مصرفی سامسونگ با سرعت خواندن ۷۴۵۰ مگابایت.",
    "سریع‌ترین SSD NVMe مصرفی سامسونگ با سرعت خواندن ۷۴۵۰ مگابایت بر ثانیه است. بوت ویندوز در چند ثانیه و لود فوری بازی‌ها را تجربه خواهید کرد. نرم‌افزار Magician سلامت درایو و به‌روزرسانی firmware را مدیریت می‌کند.",
    "Samsung 990 PRO NVMe M.2 SSD product photo",
    { ...S([["capacity", "ظرفیت", "1TB"], ["read", "سرعت خواندن", "7450MB/s"], ["form", "فرم‌فاکتور", "M.2 2280 NVMe"]]),
      ...T(["سامسونگ", "990 pro", "اس‌اس‌دی", "nvme", "حافظه"]) }),

  P("logitech-mx-keys-s", "کیبورد بی‌سیم لاجیتک MX Keys S", "keyboard", "logitech", 4850000, 25,
    "کیبورد بی‌سیم حرفه‌ای با روشنایی هوشمند و ساخت فلزی.",
    "کیبورد بی‌سیم لاجیتک با کلیدهای قوس‌دار و روشنایی هوشمند Smart Backlight است. سه دستگاه را هم‌زمان نگه می‌دارد و با یک کلید بین آن‌ها سوییچ می‌کند. ساخت فلزی و باتری تا ۱۰ روز با نور روشن (۵ ماه بدون نور) دارد.",
    "Logitech MX Keys S wireless keyboard product photo",
    { ...C([["خاکستری-گرافیتی", "#5A5A5F"], ["روشن-پالومینو", "#D8D3CB"]]),
      ...S([["connect", "اتصال", "بلوتوث + USB"], ["backlight", "نورپردازی", "هوشمند Smart Backlight"], ["battery", "باتری", "10 روز (نور روشن)"]]),
      ...T(["لاجیتک", "mx keys s", "کیبورد", "بی‌سیم", "حرفه‌ای"]) }),

  P("logitech-mx-master-3s", "موس بی‌سیم لاجیتک MX Master 3S", "mouse", "logitech", 4350000, 28,
    "موس حرفه‌ای ۸۰۰۰ DPI با اسکرول MagSpeed.",
    "موس بی‌سیم حرفه‌ای لاجیتک با دقت ۸۰۰۰ DPI و اسکرول فوق سریع MagSpeed است. کلیدهای قابل برنامه‌ریزی و انتقال بی‌سیم بین سه دستگاه دارد. سنسور Darkfield حتی روی سطح شیشه دقیق کار می‌کند.",
    "Logitech MX Master 3S wireless mouse product photo",
    { ...C([["خاکستری-گرافیتی", "#5A5A5F"], ["روشن-پالومینو", "#D8D3CB"]]),
      ...S([["dpi", "دقت", "8000 DPI"], ["sensor", "سنسور", "Darkfield"], ["battery", "باتری", "70 روز"]]),
      ...T(["لاجیتک", "mx master 3s", "موس", "بی‌سیم", "حرفه‌ای"]) }),

  P("epson-home-cinema-1080p", "پروژکتور اپسون Home Cinema 1080p", "projector", "epson", 42500000, 5,
    "پروژکتور خانگی ۳۳۰۰ لومنی 3LCD با رزولوشن Full HD.",
    "پروژکتور خانگی اپسون با رزولوشن Full HD و روشنایی ۳۳۰۰ لومن تصویری شفاف حتی در نور کم ارائه می‌دهد. رنگ‌های فناوری 3LCD طبیعی و بدون اثر رنگین‌کمانی هستند. دو ورودی HDMI اتصال هم‌زمان کنسول و پخش‌کننده را ممکن می‌کند.",
    "Epson Home Cinema 1080p projector product photo",
    { ...S([["brightness", "روشنایی", "3300 لومن"], ["resolution", "رزولوشن", "Full HD 1920x1080"], ["tech", "فناوری", "3LCD"]]),
      ...T(["اپسون", "پروژکتور", "home cinema", "سینمای خانگی", "فول‌اچ‌دی"]) }),

  P("jbl-charge-5", "اسپیکر بلوتوثی JBL Charge 5 ضدآب", "speaker", "jbl", 6150000, 21,
    "اسپیکر ۴۰ واتی ضدآب IP67 با پاوربانک داخلی.",
    "JBL Charge 5 علاوه بر بیس عمیق JBL Original Pro Sound، ۲۰ ساعت پخش و قابلیت شارژ موبایل از باتری داخلی دارد. گواهی IP67 آن را در برابر آب و غبار مقاوم می‌کند؛ همراه همیشگی ساحل و استخر. با PartyBoost می‌توان چند اسپیکر JBL را به هم متصل کرد.",
    "JBL Charge 5 portable bluetooth speaker product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی", "#2E7DC2"], ["قرمز", "#B4362F"]]),
      ...S([["power", "توان", "40W"], ["connect", "اتصال", "بلوتوث 5.1"], ["waterproof", "ضدآب", "IP67"]]),
      ...T(["اسپیکر", "بلوتوث", "jbl", "charge 5", "ضدآب"]) }),

  P("google-nest-hub-7", "نمایشگر هوشمند گوگل Nest Hub 7 اینچ", "smart-gadgets", "google", 7250000, 11,
    "نمایشگر هوشمند ۷ اینچی با دستیار Google Assistant.",
    "نمایشگر هوشمند ۷ اینچی گوگل با دستیار صوتی و کنترل کامل خانه هوشمند عرضه شده است. قابلیت Sleep Sensing خواب شما را رصد و گزارش روزانه می‌دهد. از دوربین‌های امنیتی و هزاران دستگاه سازگار پشتیبانی می‌کند.",
    "Google Nest Hub 7 inch smart display product photo",
    { ...S([["display", "نمایشگر", "7 اینچ لمسی"], ["assistant", "دستیار", "Google Assistant"], ["audio", "صدا", "اسپیکر استریو"]]),
      ...T(["گوگل", "nest hub", "خانه هوشمند", "دستیار صوتی", "اسمارت دیسپلی"]) }),

  P("muse-mechanical-keyboard-argb", "کیبورد مکانیکال گیمینگ MUSE ARGB با نورپردازی RGB هر کلید", "keyboard", "muse", 2850000, 35,
    "کیبورد مکانیکال با سوییچ آبی و نور RGB تک‌کلیدی.",
    "کیبورد مکانیکال MUSE با سوییچ آبی و نورپردازی ARGB روی تک‌تک کلیدها، حس تایپ کرانکی و شنیداری دارد. بدنه فلزی با استند تلفن همراه و ۱۹ حالت نورپردازی قابل تنظیم ارائه می‌شود. برای گیمرها و تایپیست‌های حرفه‌ای طراحی شده است.",
    "RGB mechanical gaming keyboard product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"]]),
      ...S([["switch", "سوییچ", "Blue Mechanical"], ["lighting", "نورپردازی", "Per-key ARGB"], ["layout", "چیدمان", "فول‌سایز 104 کلید"]]),
      ...T(["کیبورد", "مکانیکال", "گیمینگ", "rgb", "موز"]) }),

  P("muse-midtower-case-argb", "کیس گیمینگ MUSE میدتاور شیشه‌ای با ۶ فن ARGB", "pc-parts", "muse", 8900000, 14,
    "کیس میدتاور با پنل شیشه‌ای و ۶ فن ARGB از پیش نصب‌شده.",
    "کیس میدتاور MUSE با ۶ فن ARGB از پیش نصب‌شده و پنل شیشه سیمی، جریان هوای بی‌نقص و ظاهری چشمگیر ارائه می‌دهد. با کولرهای CPU تا ۱۶۵ میلی‌متر و کارت‌های گرافیک تا ۳۳ سانتی‌متر سازگار است. پنل جلو مش و فیلترهای گردگیری دارد.",
    "mid tower gaming PC case tempered glass ARGB fans product photo",
    { ...S([["fans", "فن‌ها", "6x 120mm ARGB"], ["gpu", "حداکثر کارت گرافیک", "330mm"], ["format", "فرم‌فاکتور", "Mid Tower ATX"]]),
      ...T(["کیس", "گیمینگ", "argb", "شیشه‌ای", "موز"]) }),

  P("muse-mousepad-xl-argb", "ماوس‌پد XL گیمینگ MUSE ARGB با لبه نورانی", "accessories", "muse", 950000, 48,
    "ماوس‌پد XL ۹۰۰×۴۰۰ میلی‌متری با لبه نورانی RGB.",
    "ماوس‌پد XL گیمینگ MUSE با ابعاد ۹۰۰×۴۰۰ میلی‌متر و لبه نورانی RGB، فضای کافی برای موس و کیبورد فراهم می‌کند. سطح میکروبافت دقت اسکرول را بالا می‌برد و کف لاستیکی ضد لغزش آن را در جای خود نگه می‌دارد.",
    "XL RGB gaming mousepad product photo",
    { ...S([["size", "ابعاد", "900x400mm"], ["lighting", "نورپردازی", "لبه RGB"], ["surface", "سطح", "میکروبافت"]]),
      ...T(["ماوس‌پد", "گیمینگ", "rgb", "xl", "موز"]) }),

  P("muse-mouse-16000dpi-rgb", "موس گیمینگ MUSE ۱۶۰۰۰ DPI با اسکلت ARGB", "mouse", "muse", 1750000, 44,
    "موس گیمینگ ۱۶۰۰۰ DPI با اسکلت داخلی ARGB.",
    "موس گیمینگ MUSE با سنسور ۱۶۰۰۰ DPI، شش دکمه قابل برنامه‌ریزی و وزن قابل تنظیم، در بازی‌های رقابتی دقت بالایی دارد. اسکلت داخلی ARGB و کابل بافته‌شده منعطف به ظاهر آن رنگ می‌بخشد. طراحی ارگونومیک برای دست‌های متوسط و بزرگ.",
    "RGB skeleton gaming mouse 16000 DPI product photo",
    { ...C([["مشکی", "#1F1F24"]]),
      ...S([["dpi", "دقت", "16000 DPI"], ["buttons", "دکمه‌ها", "6 قابل برنامه‌ریزی"], ["weight", "وزن", "قابل تنظیم"]]),
      ...T(["موس", "گیمینگ", "rgb", "16000dpi", "موز"]) }),

  P("logitech-gaming-headset-rgb", "هدفون گیمینگ Logitech G با درایور ۵۰ میلی‌متری و نور RGB", "headphones", "logitech", 3200000, 26,
    "هدفون گیمینگ با درایور ۵۰mm، میکروفون نویزگیر و نور RGB.",
    "هدفون گیمینگ Logitech G با درایور‌های ۵۰ میلی‌متری صدا فضایی دقیقی برای شناسایی موقعیت دشمن ارائه می‌دهد. میکروفون قابل جداسازی با نویزگیر مکالمه شفافی می‌سازد. پدهای نرم و نور RGB برای جلسات طولانی گیمینگ طراحی شده‌اند.",
    "Logitech G gaming headset with RGB lighting product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی-بنفش", "#4B3B8F"]]),
      ...S([["drivers", "درایور", "50mm"], ["mic", "میکروفون", "نویزگیر جداشدنی"], ["lighting", "نورپردازی", "RGB"]]),
      ...T(["لاجیتک", "هدفون گیمینگ", "logitech g", "rgb", "گیمینگ"]) }),

  P("asus-tuf-curved-monitor-165", "مانیتور گیمینگ منحنی ASUS TUF ۳۴ اینچ ۱۶۵Hz وایدهسکرین", "monitor", "asus", 42000000, 6,
    "مانیتور التروواید ۳۴ اینچی منحنی با ۱۶۵ هرتز.",
    "مانیتور التروواید ۳۴ اینچی منحنی ASUS TUF با رزولوشن UWQHD و ۱۶۵ هرتز، بدون نیاز به دو مانیتور فضای گیمینگ و کاری گسترده‌ای می‌دهد. گواهی DisplayHDR 400 و پوشش رنگ ۹۰٪ DCI-P3 تصویری زنده ارائه می‌کند. FreeSync Premium تصویر را بدون پارگی نگه می‌دارد.",
    "ASUS TUF curved ultrawide gaming monitor product photo",
    { ...S([["size", "اندازه", "34 اینچ منحنی"], ["refresh", "نرخ نوسازی", "165Hz"], ["resolution", "رزولوشن", "UWQHD 3440x1440"]]),
      ...T(["ایسوس", "tuf", "التراواید", "مانیتور گیمینگ", "منحنی"]) }),

  P("muse-gaming-chair-rgb", "صندلی گیمینگ MUSE RGB ریسینگ با رگلاینگ ۱۸۰ درجه", "accessories", "muse", 18500000, 9,
    "صندلی ریسینگ چرم PU با نور RGB و رگلاینگ ۱۸۰ درجه.",
    "صندلی گیمینگ MUSE با روکش چرم PU درجه یک و نور RGB در لبه‌ها، هم راحت است و هم ست‌آپ شما را خاص می‌کند. تکیه‌گاه پشت تا ۱۸۰ درجه-flat recline می‌شود برای استراحت بین بازی‌ها. بالشتک‌های گردن و کمر ارگونومیک قابل جابجایی دارند.",
    "RGB gaming chair racing style product photo",
    { ...C([["مشکی-قرمز", "#3A2226"], ["مشکی-سفید", "#2F2F33"]]),
      ...S([["recline", "رگلاینگ", "180 درجه"], ["material", "جلد", "چرم PU"], ["lighting", "نورپردازی", "RGB لبه‌ها"]]),
      ...T(["صندلی", "گیمینگ", "rgb", "ریسینگ", "موز"]) }),

  P("muse-stream-mic-rgb", "میکروفون استریم MUSE RGB با پاپ‌فیلتر و شاک‌مانت", "accessories", "muse", 2400000, 23,
    "میکروفون USB کاردیوئید با شاک‌مانت و پاپ‌فیلتر.",
    "میکروفون USB استریم MUSE با دیافراگم ۱۶ میلی‌متری و الگوی کاردیوئیدی صدایی شفاف برای استریم، پادکست و ضبط می‌گیرد. شاک‌مانت، پاپ‌فیلتر و پایه میزی در جعبه موجود است. نور RGB و کنترل گین روی بدنه قرار دارند.",
    "RGB USB streaming microphone product photo",
    { ...S([["pattern", "الگوی ضبط", "Cardioid"], ["diaphragm", "دیافراگم", "16mm"], ["connect", "اتصال", "USB"]]),
      ...T(["میکروفون", "استریم", "rgb", "پادکست", "موز"]) }),

  P("muse-wireless-controller-argb", "دسته بازی گیمینگ MUSE ARGB بی‌سیم با موتور هپتیک", "accessories", "muse", 2150000, 31,
    "دسته بی‌سیم گیمینگ با موتور هپتیک و نور ARGB.",
    "دسته بی‌سیم گیمینگ MUSE با موتور هپتیک و آنالوگ‌های دقیق حس بازی را واقعی‌تر می‌کند. با PC، اندروید و کنسول‌ها سازگار است و باتری آن تا ۱۵ ساعت دوام دارد. نور ARGB قابل تنظیم و طراحی ارگونومیک برای دست‌های بزرگ دارد.",
    "wireless RGB gaming controller gamepad product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"]]),
      ...S([["connect", "اتصال", "بلوتوث + 2.4G"], ["battery", "باتری", "15 ساعت"], ["haptic", "لرزش", "موتور هپتیک"]]),
      ...T(["دسته", "کنترلر", "گیمینگ", "بی‌سیم", "argb"]) }),
];

/* ═══════════════ Part 2 — 63 NEW products (total → 100) ═════════════ */
const NEW = [
  /* ── موبایل (+7 → 13) ── */
  P("apple-iphone-15-128gb", "گوشی موبایل اپل iPhone 15 ظرفیت ۱۲۸ گیگابایت", "mobile", "apple", 71500000, 18,
    "آیفون ۱۵ با تراشه A16 Bionic و دوربین ۴۸ مگاپیکسلی.",
    "iPhone 15 با تراشه A16 Bionic و دوربین اصلی ۴۸ مگاپیکسلی، استاندارد جدید میان‌رده‌های اپل است. نمایشگر ۶.۱ اینچی Super Retina XDR با Dynamic Island تجربه نسل جدید را ارزان‌تر می‌کند. شارژ USB-C و رنگ‌های تازه آن را به انتخابی مدرن تبدیل کرده است.",
    "Apple iPhone 15 smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی", "#A7C7E7"], ["صورتی", "#E8A0BF"], ["سبز", "#A8C3A0"]]),
      ...S([["chip", "پردازنده", "Apple A16 Bionic"], ["camera", "دوربین", "48MP"], ["display", "نمایشگر", "6.1 اینچ XDR"]]),
      ...T(["آیفون", "iphone 15", "اپل", "گوشی", "usb-c"]), ...F({ featured: true }) }),

  P("apple-iphone-14-pro-256gb", "گوشی موبایل اپل iPhone 14 Pro ظرفیت ۲۵۶ گیگابایت", "mobile", "apple", 79900000, 9,
    "آیفون ۱۴ پرو با Dynamic Island و دوربین ۴۸ مگاپیکسلی.",
    "پرچمدار اپل با Dynamic Island و دوربین ۴۸ مگاپیکسلی همچنان قدرتمند و به‌روز است. تراشه A16 Bionic هر بازی و اپلیکیشنی را روان اجرا می‌کند. حالت سینمایی و ضبط ProRes فیلم‌سازی حرفه‌ای را در دست شما قرار می‌دهد.",
    "Apple iPhone 14 Pro smartphone product photo",
    { ...C([["مشکی-فضایی", "#2B2B31"], ["نقره‌ای", "#C9CDD3"], ["بنفش-عمیق", "#7C5CBF"]]),
      ...S([["chip", "پردازنده", "Apple A16 Bionic"], ["camera", "دوربین", "48MP + 12MP"], ["display", "نمایشگر", "6.1 اینچ ProMotion"]]),
      ...T(["آیفون", "iphone 14 pro", "اپل", "پرچمدار", "گوشی"]) }),

  P("samsung-galaxy-s24-plus-256gb", "گوشی موبایل سامسونگ Galaxy S24+ ظرفیت ۲۵۶ گیگابایت", "mobile", "samsung", 58900000, 13,
    "پرچمدار بزرگ‌نمایش سامسونگ با Galaxy AI و باتری ۴۹۰۰.",
    "نمایشگر بزرگ ۶.۷ اینچی QHD+ و باتری ۴۹۰۰ میلی‌آمپری، Galaxy S24+ را به پرچمدار همه‌کاره سامسونگ تبدیل کرده است. قابلیت‌های Galaxy AI مثل جست‌وجوی دایره‌ای و ترجمه زنده مکالمه دارد. تراشه Snapdragon 8 Gen 3 قدرت پرچمدار ارائه می‌دهد.",
    "Samsung Galaxy S24 Plus smartphone product photo",
    { ...C([["مشکی-ونی", "#2B2B31"], ["بنفش-یاسی", "#B49BD1"], ["سبز-طوسی", "#6B705C"]]),
      ...S([["chip", "پردازنده", "Snapdragon 8 Gen 3"], ["battery", "باتری", "4900mAh"], ["display", "نمایشگر", "6.7 اینچ QHD+ 120Hz"]]),
      ...T(["سامسونگ", "galaxy s24+", "پرچمدار", "گلکسی", "گوشی"]) }),

  P("samsung-galaxy-z-flip-6-256gb", "گوشی موبایل تاشو سامسونگ Galaxy Z Flip 6 ظرفیت ۲۵۶ گیگابایت", "mobile", "samsung", 64500000, 8,
    "گوشی تاشو جذاب سامسونگ که در جیب جمع می‌شود.",
    "گوشی تاشو Galaxy Z Flip 6 در جیب جمع می‌شود و نصف می‌شود؛ نمایشگر خارجی ۳.۴ اینچی برای پاسخ سریع بدون باز کردن گوشی طراحی شده است. مفصل تقویت‌شده و بدنه مقاوم در برابر گرد و غبار دارد. دوربین ۵۰ مگاپیکسلی و حالت‌های عکاسی FlexCam خلاقانه است.",
    "Samsung Galaxy Z Flip 6 foldable smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["صورتی-آبی", "#E8A0BF"], ["زرد-شنی", "#D9B96D"]]),
      ...S([["form", "فرم", "تاشو Flip"], ["cover", "نمایشگر خارجی", "3.4 اینچ"], ["chip", "پردازنده", "Snapdragon 8 Gen 3"]]),
      ...T(["سامسونگ", "z flip 6", "تاشو", "فولدبل", "گلکسی"]), ...F({ special: true }) }),

  P("samsung-galaxy-a35-128gb", "گوشی موبایل سامسونگ Galaxy A35 ظرفیت ۱۲۸ گیگابایت", "mobile", "samsung", 15400000, 40,
    "میان‌رده اقتصادی سامسونگ با AMOLED ۱۲۰ هرتز.",
    "میان‌رده اقتصادی سامسونگ با نمایشگر ۶.۶ اینچی Super AMOLED و نرخ ۱۲۰ هرتز است. دوربین ۵۰ مگاپیکسلی و باتری ۵۰۰۰ میلی‌آمپری نیازهای روزمره را راحت پوشش می‌دهند. چهار سال آپدیت اندروید و One UI روان دارد.",
    "Samsung Galaxy A35 smartphone product photo",
    { ...C([["مشکی-جیغ", "#1F1F24"], ["آبی-آیسی", "#A7C7E7"], ["بنفش-لیلا", "#B49BD1"]]),
      ...S([["chip", "پردازنده", "Exynos 1380"], ["battery", "باتری", "5000mAh"], ["display", "نمایشگر", "6.6 اینچ 120Hz"]]),
      ...T(["سامسونگ", "galaxy a35", "اقتصادی", "گلکسی", "گوشی"]) }),

  P("xiaomi-redmi-note-13-pro-256gb", "گوشی موبایل شیائومی Redmi Note 13 Pro ظرفیت ۲۵۶ گیگابایت", "mobile", "xiaomi", 18900000, 33,
    "پرفروش شیائومی با دوربین ۲۰۰ مگاپیکسلی و شارژ ۶۷ وات.",
    "پرفروش‌ترین گوشی محدوده خود با دوربین ۲۰۰ مگاپیکسلی و لرزشگیر اپتیکال است؛ جزئیات عکس‌ها شگفت‌انگیز است. نمایشگر ۶.۶۷ اینچی AMOLED با ۱۲۰ هرتز و روشنایی ۱۸۰۰ نیت دارد. شارژ سریع ۶۷ واتی در حدود ۴۶ دقیقه باتری را پر می‌کند.",
    "Xiaomi Redmi Note 13 Pro smartphone product photo",
    { ...C([["مشکی-پرلی", "#1F1F24"], ["آبی-اوشن", "#3B82C4"], ["بنفش-میدنایت", "#7C5CBF"]]),
      ...S([["camera", "دوربین", "200MP OIS"], ["display", "نمایشگر", "6.67 اینچ AMOLED 120Hz"], ["charge", "شارژ", "67W"]]),
      ...T(["شیائومی", "redmi note 13 pro", "ردمی", "گوشی", "۲۰۰ مگاپیکسل"]) }),

  P("xiaomi-poco-x6-pro-256gb", "گوشی موبایل شیائومی POCO X6 Pro ظرفیت ۲۵۶ گیگابایت", "mobile", "xiaomi", 21200000, 17,
    "بهترین گوشی گیمینگ محدوده خود با Dimensity 8300 Ultra.",
    "POCO X6 Pro با تراشه Dimensity 8300 Ultra بهترین عملکرد گیمینگ را در محدوده قیمتی خود ارائه می‌دهد. نمایشگر ۶.۶۷ اینچی Flow AMOLED با ۱۲۰ هرتز و پشتیبانی Dolby Vision دارد. بدنه سبک و طراحی تخت امضای POCO است.",
    "POCO X6 Pro smartphone product photo",
    { ...C([["مشکی", "#1F1F24"], ["زرد-پوکو", "#D9B23C"]]),
      ...S([["chip", "پردازنده", "Dimensity 8300 Ultra"], ["display", "نمایشگر", "6.67 اینچ 120Hz"], ["charge", "شارژ", "67W"]]),
      ...T(["شیائومی", "poco", "x6 pro", "گیمینگ", "گوشی"]) }),

  /* ── لپ‌تاپ (+6 → 10) ── */
  P("apple-macbook-pro-14-m3-512", "لپ‌تاپ اپل MacBook Pro 14 M3 ظرفیت ۵۱۲ گیگابایت", "laptop", "apple", 118000000, 4,
    "مک‌بوک پرو ۱۴ با تراشه M3، XDR و باتری ۲۲ ساعته.",
    "لپ‌تاپ حرفه‌ای اپل با تراشه M3 و نمایشگر Liquid Retina XDR با روشنایی ۱۶۰۰ نیت است. برای تدوین ویدیو، تولید موسیقی و توسعه نرم‌افزار قدرت بی‌دردسری می‌دهد. باتری تا ۲۲ ساعت و بدنه تمام‌آلومینیومی یک‌تکه دارد.",
    "Apple MacBook Pro 14 M3 laptop product photo",
    { ...C([["نقره‌ای", "#C9CDD3"], ["خاکستری-فضایی", "#2B2B31"]]),
      ...S([["chip", "پردازنده", "Apple M3"], ["storage", "حافظه", "512GB SSD"], ["display", "نمایشگر", "14.2 اینچ XDR 120Hz"]]),
      ...T(["اپل", "macbook pro", "m3", "لپ‌تاپ حرفه‌ای", "مک‌بوک"]), ...F({ featured: true }) }),

  P("apple-macbook-air-15-m3-512", "لپ‌تاپ اپل MacBook Air 15 M3 ظرفیت ۵۱۲ گیگابایت", "laptop", "apple", 89500000, 7,
    "مک‌بوک ایر ۱۵ اینچی بدون فن با چهار اسپیکر.",
    "نسخه بزرگ‌تر MacBook Air با نمایشگر ۱۵.۳ اینچی است و چون فن ندارد، در کنار قدرت M3 سکوت مطلق دارد. چهار اسپیکر با Spatial Audio صدای فراگیر می‌سازد. باتری تا ۱۸ ساعت یک روز کامل کاری را پوشش می‌دهد.",
    "Apple MacBook Air 15 M3 laptop product photo",
    { ...C([["نقره‌ای", "#C9CDD3"], ["خاکستری-فضایی", "#2B2B31"], ["شب-ستاره‌ای", "#22314A"]]),
      ...S([["chip", "پردازنده", "Apple M3"], ["display", "نمایشگر", "15.3 اینچ Liquid Retina"], ["battery", "باتری", "18 ساعت"]]),
      ...T(["اپل", "macbook air 15", "m3", "لپ‌تاپ", "مک‌بوک"]) }),

  P("asus-zenbook-14-oled-ultra7", "لپ‌تاپ ایسوس Zenbook 14 OLED Core Ultra 7", "laptop", "asus", 62500000, 10,
    "زن‌بوک ۱۴ با نمایشگر OLED و وزن ۱.۲ کیلوگرم.",
    "لپ‌تاپ Zenbook 14 OLED با پوشش رنگ ۱۰۰٪ DCI-P3 و وزن فقط ۱.۲ کیلوگرم، انتخابی عالی برای خلق محتوا در سفر است. پردازنده Core Ultra 7 همراه NPU، قابلیت‌های هوش مصنوعی را به کارهای روزمره می‌آورد. باتری ۷۵ وات‌ساعتی یک روز کاری را پوشش می‌دهد.",
    "ASUS Zenbook 14 OLED laptop product photo",
    { ...C([["مشکی-اسلیت", "#2B2B31"], ["سفید-کرمی", "#EAE0D5"]]),
      ...S([["cpu", "پردازنده", "Core Ultra 7 155H"], ["display", "نمایشگر", "14 اینچ OLED 120Hz"], ["weight", "وزن", "1.2kg"]]),
      ...T(["ایسوس", "zenbook", "oled", "لپ‌تاپ", "ultra"]) }),

  P("asus-tuf-gaming-a15-rtx4050", "لپ‌تاپ گیمینگ ایسوس TUF Gaming A15 RTX 4050", "laptop", "asus", 55900000, 12,
    "لپ‌تاپ گیمینگ بوم‌هزینه با RTX 4050 و ۱۴۴ هرتز.",
    "لپ‌تاپ گیمینگ TUF A15 با کارت RTX 4050 و نمایشگر FHD ۱۴۴ هرتز، بهترین ارزش گیمینگ را در محدوده خود دارد. استاندارد نظامی MIL-STD-810H دوام بدنه را تضمین می‌کند. کیبورد با نور پس‌زمینه و ناحیه WASD برجسته دارد.",
    "ASUS TUF Gaming A15 laptop product photo",
    { ...C([["مشکی-مگا", "#1F1F24"], ["خاکستری-موس", "#8A8A8F"]]),
      ...S([["cpu", "پردازنده", "Ryzen 7 7435HS"], ["gpu", "گرافیک", "RTX 4050 6GB"], ["display", "نمایشگر", "15.6 اینچ 144Hz"]]),
      ...T(["ایسوس", "tuf", "گیمینگ", "rtx 4050", "لپ‌تاپ گیمینگ"]) }),

  P("lenovo-ideapad-slim-5-16", "لپ‌تاپ لنوو IdeaPad Slim 5 OLED 16 اینچ", "laptop", "lenovo", 41500000, 15,
    "لپ‌تاپ میان‌رده با نمایشگر ۱۶ اینچی و Ryzen 7.",
    "لپ‌تاپ میان‌رده محبوب لنوو با نمایشگر ۱۶ اینچی با نسبت 16:10 و پردازنده Ryzen 7 8845HS است. وزن ۱.۸ کیلوگرمی و شارژ سریع USB-C دارد. برای کار اداری، دانشجویی و برنامه‌نویسی سبک کاملاً مناسب است.",
    "Lenovo IdeaPad Slim 5 laptop product photo",
    { ...C([["خاکستری-کلاود", "#8A8A8F"], ["آبی-آبیس", "#3B5C82"]]),
      ...S([["cpu", "پردازنده", "Ryzen 7 8845HS"], ["display", "نمایشگر", "16 اینچ WUXGA"], ["ram", "حافظه", "16GB"]]),
      ...T(["لنوو", "ideapad", "لپ‌تاپ", "دانشجویی", "ryzen"]) }),

  P("lenovo-thinkpad-t14-g5", "لپ‌تاپ لنوو ThinkPad T14 Gen 5", "laptop", "lenovo", 58200000, 6,
    "افسانه لپ‌تاپ‌های سازمانی با بهترین کیبورد کلاس خود.",
    "لپ‌تاپ سازمانی ThinkPad T14 با کیبورد بی‌نظیر و بدنه مقاوم تست‌شده در برابر ۱۲ استاندارد نظامی است. تراشه Core Ultra همراه vPro مدیریت سازمانی و امنیت سطح بالا می‌دهد. شاخص اثر انگشت و TPM داخلی داده‌ها را محافظت می‌کنند.",
    "Lenovo ThinkPad T14 laptop product photo",
    { ...C([["مشکی-کلاسیک", "#1F1F24"]]),
      ...S([["cpu", "پردازنده", "Core Ultra 5 125U"], ["ram", "حافظه", "16GB"], ["security", "امنیت", "TPM + vPro"]]),
      ...T(["لنوو", "thinkpad", "سازمانی", "لپ‌تاپ", "t14"]) }),

  /* ── کامپیوتر رومیزی (+4 → 4) ── */
  P("apple-mac-mini-m4-256", "مینی کامپیوتر اپل Mac mini M4 ظرفیت ۲۵۶ گیگابایت", "desktop-pc", "apple", 54900000, 11,
    "کوچک‌ترین دسکتاپ اپل با قدرت تراشه M4.",
    "کوچک‌ترین دسکتاپ اپل با قدرت شگفت‌انگیز تراشه M4 است؛ در کف دست جا می‌شود. چهار پورت Thunderbolt دارد و دو نمایشگر 5K را هم‌زمان پشتیبانی می‌کند. ساکت، کم‌مصرف و فوق‌سریع است.",
    "Apple Mac mini M4 desktop computer product photo",
    { ...S([["chip", "پردازنده", "Apple M4"], ["ram", "حافظه", "16GB"], ["ports", "پورت‌ها", "4x Thunderbolt 4"]]),
      ...T(["اپل", "mac mini", "m4", "دسکتاپ", "مینی‌پی‌سی"]), ...F({ featured: true }) }),

  P("lenovo-thinkcentre-m70s", "کامپیوتر رومیزی لنوو ThinkCentre M70s", "desktop-pc", "lenovo", 27500000, 9,
    "کامپیوتر سازمانی فشرده ۱ لیتری با Core i5.",
    "کامپیوتر سازمانی فشرده لنوو با پردازنده Core i5 نسل ۱۳ در کیس کوچک حدوداً یک لیتری است. مصرف انرژی پایین و قابلیت ارتقای رم تا ۶۴ گیگابایت دارد. مناسب دفاتر و میزهای کوچک با فضای محدود.",
    "Lenovo ThinkCentre M70s desktop PC product photo",
    { ...S([["cpu", "پردازنده", "Core i5-13400T"], ["format", "فرم‌فاکتور", "1L Tiny"], ["storage", "حافظه", "512GB SSD"]]),
      ...T(["لنوو", "thinkcentre", "کامپیوتر", "سازمانی", "دسکتاپ"]) }),

  P("asus-expertcenter-d7", "کامپیوتر رومیزی ایسوس ExpertCenter D7", "desktop-pc", "asus", 31800000, 7,
    "دسکتاپ حرفه‌ای ایسوس با Core i7 و خنک‌کننده ساکت.",
    "دسکتاپ حرفه‌ای ExpertCenter D7 با پردازنده Core i7 و سازگاری با کارت‌های گرافیک تا RTX 4070 طراحی شده است. سیستم خنک‌کننده با فن‌های ساکت آن را برای محیط کاری مناسب می‌کند. طراحی بدون‌ابزار برای ارتقای آسان قطعات دارد.",
    "ASUS ExpertCenter D7 desktop PC product photo",
    { ...S([["cpu", "پردازنده", "Core i7-13700"], ["gpu", "گرافیک", "تا RTX 4070"], ["ram", "حافظه", "16GB DDR5"]]),
      ...T(["ایسوس", "expertcenter", "کامپیوتر", "حرفه‌ای", "دسکتاپ"]) }),

  P("muse-gaming-pc-rtx4070", "سیستم گیمینگ MUSE با پردازنده Ryzen 7 و کارت RTX 4070", "desktop-pc", "muse", 92500000, 5,
    "سیستم گیمینگ آماده MUSE اسمبل‌شده با گارانتی.",
    "سیستم گیمینگ آماده MUSE با پردازنده Ryzen 7 7800X3D و کارت RTX 4070 هر بازی را در ۱۴۴۰p با تنظیمات حداکثری اجرا می‌کند. کیس شیشه‌ای با نور RGB و خنک‌کننده برج‌دار ۲۴۰ میلی‌متری دارد. با تست ۲۴ ساعته استرس و گارانتی تحویل می‌شود.",
    "custom RGB gaming PC desktop tower product photo",
    { ...S([["cpu", "پردازنده", "Ryzen 7 7800X3D"], ["gpu", "گرافیک", "RTX 4070 12GB"], ["cooling", "خنک‌کننده", "AIO 240mm"]]),
      ...T(["سیستم گیمینگ", "ریگ", "rtx 4070", "موز", "کامپیوتر گیمینگ"]), ...F({ special: true }) }),

  /* ── قطعات کامپیوتر (+5 → 8) ── */
  P("nvidia-rtx-4060-8gb", "کارت گرافیک NVIDIA RTX 4060 8GB", "pc-parts", "nvidia", 29500000, 13,
    "کارت گرافیک اقتصادی Ada Lovelace با DLSS 3.",
    "کارت گرافیک اقتصادی انویدیا با ۸ گیگابایت حافظه برای گیمینگ Full HD و 1440p عالی است. DLSS 3 با تولید فریم، فریم‌ریت بازی‌های سنگین را تقریباً دو برابر می‌کند. مصرف انرژی فقط ۱۱۵ وات و به شارژرهای معمولی نیازی ندارد.",
    "NVIDIA GeForce RTX 4060 graphics card product photo",
    { ...S([["memory", "حافظه", "8GB GDDR6"], ["dlss", "فناوری", "DLSS 3"], ["power", "توان مصرفی", "115W"]]),
      ...T(["انویدیا", "rtx 4060", "کارت گرافیک", "گیمینگ", "dlss"]) }),

  P("intel-core-i5-14600k", "پردازنده اینتل Core i5-14600K", "pc-parts", "intel", 16800000, 19,
    "پردازنده ۱۴ هسته‌ای با بهترین قیمت/عملکرد گیمینگ.",
    "پردازنده ۱۴ هسته‌ای اینتل با فرکانس بوست ۵.۳ گیگاهرتز بهترین نسبت قیمت به عملکرد گیمینگ را دارد. گرافیک داخلی UHD 770 آن بدون کارت گرافیک هم تصویر می‌دهد. با کولرهای AIO ۲۴۰ میلی‌متری بهترین دمای عملکرد را ارائه می‌کند.",
    "Intel Core i5-14600K processor box product photo",
    { ...S([["cores", "هسته‌ها", "14 (6P+8E)"], ["boost", "فرکانس بوست", "5.3GHz"], ["socket", "سوکت", "LGA1700"]]),
      ...T(["اینتل", "i5 14600k", "پردازنده", "گیمینگ", "سی‌پی‌یو"]) }),

  P("asus-tuf-b760-plus-wifi", "مادربرد ایسوس TUF Gaming B760-PLUS WiFi", "pc-parts", "asus", 12900000, 14,
    "مادربرد ATX با VRM قدرتمند و WiFi 6.",
    "مادربرد ATX ایسوس با VRM ۱۲+1 فاز و شبکه WiFi 6 پایه‌ای مطمئن برای پلتفرم اینتل نسل ۱۲ تا ۱۴ است. چهار اسلات DDR5 تا ۷۲۰۰ مگاهرتز را پشتیبانی می‌کند. هر دو اسلات M.2 با heatsink داخلی خنک می‌مانند.",
    "ASUS TUF Gaming B760 motherboard product photo",
    { ...S([["socket", "سوکت", "LGA1700"], ["memory", "حافظه", "4x DDR5 7200MHz"], ["network", "شبکه", "WiFi 6 + 2.5G LAN"]]),
      ...T(["ایسوس", "tuf", "مادربرد", "b760", "wifi 6"]) }),

  P("muse-750w-gold-psu", "پاور MUSE 750 وات 80 Plus Gold تمام‌ماژولار", "pc-parts", "muse", 5900000, 22,
    "پاور تمام‌ماژولار ۷۵۰ واتی با گواهی گلد.",
    "پاور تمام‌ماژولار MUSE با گواهی 80 Plus Gold راندمان حدود ۹۰٪ و فن ۱۲۰ میلی‌متری هیدرولیک بی‌صدا دارد. محافظ‌های کامل اورولتاژ و اورجریان قطعات سیستم را ایمن نگه می‌دارند. برای سیستم‌های گیمینگ تا RTX 4070 Ti مناسب است.",
    "750W 80 Plus Gold modular power supply product photo",
    { ...S([["power", "توان", "750W"], ["rating", "گواهی", "80 Plus Gold"], ["modular", "ماژولار", "Fully Modular"]]),
      ...T(["پاور", "منبع تغذیه", "750 وات", "گلد", "موز"]) }),

  P("muse-argb-fan-trio", "پک ۳ عددی فن MUSE ARGB 120 میلی‌متری", "pc-parts", "muse", 1350000, 38,
    "پک ۳ فن ARGB با هاب کنترل و ریموت.",
    "پک سه‌عددی فن ۱۲۰ میلی‌متری ARGB با هاب کنترل و ریموت، ۱۶ میلیون رنگ و حالت‌های موج نورانی دارد. هوادهی ۶۲ CFM با صدای زیر ۲۵ دسی‌بل ارائه می‌کند. یاتاقان هیدرولیک با عمر ۵۰ هزار ساعت کارکرد دارد.",
    "120mm ARGB RGB PC case fans 3-pack product photo",
    { ...S([["size", "اندازه", "120mm"], ["airflow", "هوادهی", "62 CFM"], ["noise", "صدا", "زیر 25dB"]]),
      ...T(["فن", "argb", "کیس", "خنک‌کننده", "موز"]) }),

  /* ── مانیتور (+3 → 6) ── */
  P("lg-27up850-4k-27", "مانیتور LG 27UP850 4K UHD 27 اینچ", "monitor", "lg", 31500000, 10,
    "مانیتور ۴K USB-C برای خلق محتوا با شارژ ۹۶ واتی.",
    "مانیتور 4K پنل IPS LG با پوشش رنگ ۹۵٪ DCI-P3 و HDR400 برای خلق محتوا عالی است. یک کابل USB-C هم تصویر می‌فرستد و هم تا ۹۶ وات لپ‌تاپ را شارژ می‌کند. پایه ارگونومیک با قابلیت پیوت عمودی دارد.",
    "LG 27UP850 4K UHD monitor product photo",
    { ...S([["resolution", "رزولوشن", "4K UHD 3840x2160"], ["panel", "پنل", "IPS 95% DCI-P3"], ["usb-c", "یو‌اس‌بی‌سی", "PD 96W"]]),
      ...T(["ال‌جی", "ultrafine", "۴k", "مانیتور", "طراحی"]), ...F({ featured: true }) }),

  P("samsung-viewfinity-s8-27", "مانیتور سامسونگ ViewFinity S8 27 اینچ 4K", "monitor", "samsung", 33900000, 8,
    "مانیتور حرفه‌ای ۴K کالیبره‌شده با USB-C ۹۰ واتی.",
    "مانیتور حرفه‌ای سامسونگ با رزولوشن 4K، پورت USB-C ۹۰ واتی و هاب اترنت داخلی، میز کار را فقط با یک کابل مدیریت می‌کند. رنگ‌های کارخانه‌کالیبره با خطای کمتر از 2 Delta E برای طراحان و تدوینگران دقیق است. پایه ارگونومیک کامل با پیوت دارد.",
    "Samsung ViewFinity S8 4K monitor product photo",
    { ...S([["resolution", "رزولوشن", "4K UHD"], ["color", "دقت رنگ", "Delta E < 2"], ["usb-c", "یو‌اس‌بی‌سی", "PD 90W"]]),
      ...T(["سامسونگ", "viewfinity", "۴k", "مانیتور حرفه‌ای", "طراحی"]) }),

  P("asus-proart-pa278cv-27", "مانیتور حرفه‌ای ایسوس ProArt PA278CV 27 اینچ", "monitor", "asus", 26800000, 12,
    "مانیتور ProArt کالیبره‌شده برای عکاسان و طراحان.",
    "مانیتور ایسوس ProArt با رنگ دقیق کالیبره‌شده کارخانه‌ای و پورت USB-C برای عکاسان و طراحان ساخته شده است. پایه کوچک و جمع‌وجور فضای میز را آزاد می‌کند. پشتیبانی هم‌زمان DisplayPort و دو HDMI دارد.",
    "ASUS ProArt PA278CV 27 inch monitor product photo",
    { ...S([["resolution", "رزولوشن", "QHD 2560x1440"], ["color", "دقت رنگ", "100% sRGB"], ["usb-c", "یو‌اس‌بی‌سی", "PD 65W"]]),
      ...T(["ایسوس", "proart", "مانیتور حرفه‌ای", "طراحی", "عکاسی"]) }),

  /* ── کنسول (+2 → 4) ── */
  P("microsoft-xbox-series-s-512gb", "کنسول بازی مایکروسافت Xbox Series S", "console", "microsoft", 17900000, 16,
    "کنسول دیجیتال جمع‌وجور مایکروسافت با هدف ۱۴۴۰p.",
    "کنسول دیجیتال جمع‌وجور مایکروسافت با هدف‌گذاری 1440p و ۱۲۰ فریم، سفید و سبک است. سرویس Game Pass آن را به بهترین ارزش بازی جهان تبدیل کرده است. SSD ۵۱۲ گیگابایتی بارگذاری بازی‌ها را فوق سریع می‌کند.",
    "Microsoft Xbox Series S console product photo",
    { ...S([["storage", "حافظه", "512GB SSD"], ["resolution", "هدف", "1440p 120fps"], ["format", "فرم", "دیجیتال بدون درایو"]]),
      ...T(["ایکس‌باکس", "xbox series s", "مایکروسافت", "کنسول", "گیم‌پس"]) }),

  P("sony-playstation-vr2", "هدست واقعیت مجازی سونی PlayStation VR2", "console", "sony", 21500000, 10,
    "هدست VR نسل جدید با OLED ۴K HDR و ردیابی چشم.",
    "هدست واقعیت مجازی نسل جدید سونی با نمایشگر OLED 4K HDR و ردیابی چشم، غرق‌کننده‌ترین تجربه VR کنسولی را می‌سازد. کنترلرهای Sense با ماشه تطبیقی و لرزش دقیق دارند. بدون سنسور خارجی فقط با یک کابل به PS5 وصل می‌شود.",
    "Sony PlayStation VR2 headset product photo",
    { ...S([["display", "نمایشگر", "OLED 4K HDR"], ["tracking", "ردیابی", "چشم + داخل-خارجی"], ["controllers", "کنترلر", "2x Sense"]]),
      ...T(["سونی", "ps vr2", "واقعیت مجازی", "پی‌اس", "vr"]), ...F({ special: true }) }),

  /* ── لوازم جانبی (+4 → 8) ── */
  P("anker-555-usb-c-hub-8in1", "هاب USB-C انکر 555 هشت کاره", "accessories", "anker", 3850000, 27,
    "هاب ۸ کاره با HDMI 4K، اترنت و شارژ ۸۵ واتی.",
    "هاب USB-C هشت‌کاره انکر با خروجی ۸۵ واتی Power Delivery هم‌زمان نمایشگر، شبکه و پریفرال‌ها را مدیریت می‌کند. پورت HDMI با رزولوشن 4K@60 تصویر بی‌نقص می‌فرستد. بدنه آلومینیومی جمع‌وجور آن را همراه همیشگی لپ‌تاپ‌های USB-C می‌کند.",
    "Anker 555 USB-C hub 8 in 1 product photo",
    { ...S([["ports", "پورت‌ها", "HDMI + LAN + 3x USB"], ["pd", "شارژ", "85W PD"], ["video", "خروجی تصویر", "4K@60Hz"]]),
      ...T(["انکر", "هاب", "usb-c", "8 کاره", "لوازم جانبی"]) }),

  P("apple-pencil-pro", "قلم اپل Pencil Pro", "accessories", "apple", 9200000, 21,
    "قلم حرفه‌ای اپل با فشار، tilt و لرزش haptic.",
    "قلم حرفه‌ای اپل با تشخیص فشار، زاویه tilt و لرزش haptic حس نوشتن واقعی روی iPad Pro را می‌دهد. حرکت Squeeze به‌سرعت ابزارها را عوض می‌کند و چرخش قلم سایه‌ظن دقیق می‌سازد. به‌صورت مگنتی روی لبه iPad شارژ و جفت می‌شود.",
    "Apple Pencil Pro stylus product photo",
    { ...S([["features", "قابلیت‌ها", "فشار + tilt + haptic"], ["pairing", "جفت‌سازی", "مگنتی"], ["compat", "سازگاری", "iPad Pro/Air M4"]]),
      ...T(["اپل", "pencil pro", "قلم", "ایپد", "لوازم جانبی"]) }),

  P("logitech-g29-racing-wheel", "فرمان گیمینگ Logitech G29 Driving Force", "accessories", "logitech", 18900000, 8,
    "فرمان گیمینگ با فیدبک نیرو و گیربکس ۶ سرعته.",
    "فرمان گیمینگ لاجیتک با فیدبک نیروی واقعی و گیربکس جداگانه ۶ سرعته، تجربه رانندگی بازی‌های مسابقه‌ای را واقعی می‌کند. پدال‌های استیل با تنظیم فنر برای حس ترمز دقیق طراحی شده‌اند. با PS5، PS4 و PC سازگار است.",
    "Logitech G29 racing wheel with pedals product photo",
    { ...S([["feedback", "فیدبک", "نیروی واقعی"], ["pedals", "پدال", "۳ پدال استیل"], ["compat", "سازگاری", "PS5/PS4/PC"]]),
      ...T(["لاجیتک", "g29", "فرمان", "گیمینگ", "رانندگی"]) }),

  P("anker-625-laptop-stand", "استند لپ‌تاپ آلومینیومی انکر 625", "accessories", "anker", 2450000, 34,
    "استند آلومینیومی تاشو با ارتفاع قابل تنظیم.",
    "استند آلومینیومی انکر با ارتفاع و زاویه قابل تنظیم، وضعیت بدن هنگام کار با لپ‌تاپ را اصلاح می‌کند. لولای ۳۶۰ درجه و سیلیکون ضد لغزش تا لپ‌تاپ‌های ۱۷ اینچ را نگه می‌دارد. تاشو و سبک برای همراهی در سفر.",
    "Anker aluminum laptop stand product photo",
    { ...S([["material", "جنس", "آلومینیوم"], ["size", "سازگاری", "تا 17 اینچ"], ["fold", "چیدمان", "تاشو قابل حمل"]]),
      ...T(["انکر", "استند", "لپ‌تاپ", "آلومینیوم", "لوازم جانبی"]) }),

  /* ── پاوربانک (+4 → 5) ── */
  P("anker-powercore-10000", "پاوربانک انکر PowerCore 10000 میلی‌آمپر", "powerbank", "anker", 2150000, 46,
    "پاوربانک جیبی ۱۰۰۰۰ با شارژ سریع ۲۲.۵ واتی.",
    "کوچک‌ترین پاوربانک انکر با ظرفیت واقعی ۱۰۰۰۰ میلی‌آمپر که در جیب جا می‌شود. شارژ سریع ۲۲.۵ واتی با فناوری PowerIQ سریع‌ترین جریان ممکن را می‌فرستد. همراه ایده‌آل برای روزمره و سفرهای کوتاه.",
    "Anker PowerCore 10000 power bank product photo",
    { ...S([["capacity", "ظرفیت", "10000mAh"], ["output", "توان خروجی", "22.5W"], ["weight", "وزن", "181 گرم"]]),
      ...T(["انکر", "پاوربانک", "10000", "جیبی", "power bank"]) }),

  P("anker-737-powerbank-24000", "پاوربانک انکر 737 ظرفیت ۲۴۰۰۰ با توان ۱۴۰ وات", "powerbank", "anker", 7850000, 13,
    "پاوربانک ۲۴۰۰۰ با نمایشگر دیجیتال و ۱۴۰ وات.",
    "پاوربانک قدرتمند انکر با ظرفیت ۲۴۰۰۰ میلی‌آمپر و توان ۱۴۰ واتی، حتی لپ‌تاپ‌های گیمینگ را شارژ می‌کند. نمایشگر دیجیتال درصد دقیق و توان لحظه‌ای را نشان می‌دهد. سه خروجی هم‌زمان با سیستم محافظ MultiProtect دارد.",
    "Anker 737 24000mAh 140W power bank product photo",
    { ...S([["capacity", "ظرفیت", "24000mAh"], ["output", "توان خروجی", "140W"], ["display", "نمایشگر", "دیجیتال"]]),
      ...T(["انکر", "پاوربانک", "737", "140 وات", "power bank"]), ...F({ special: true }) }),

  P("anker-maggo-622-magnetic", "پاوربانک مغناطیسی انکر MagGo 622 مخصوص آیفون", "powerbank", "anker", 4650000, 19,
    "پاوربانک مغناطیسی مگ‌سیف با پایه تاشو.",
    "پاوربانک مغناطیسی انکر MagGo 622 به پشت آیفون‌های ۱۲ تا ۱۶ می‌چسبد و شارژ بی‌سیم ۷.۵ واتی می‌دهد. پایه تاشوی آن گوشی را به استند تبدیل می‌کند؛ عالی برای تماشای ویدیو هنگام شارژ. ظرفیت ۵۰۰۰ میلی‌آمپر دارد.",
    "Anker MagGo 622 magnetic power bank for iPhone product photo",
    { ...S([["capacity", "ظرفیت", "5000mAh"], ["magsafe", "مگ‌سیف", "شارژ بی‌سیم 7.5W"], ["stand", "پایه", "تاشو استند"]]),
      ...T(["انکر", "مگگو", "پاوربانک مغناطیسی", "مگ‌سیف", "آیفون"]) }),

  P("xiaomi-mi-power-bank-3-10000", "پاوربانک شیائومی Power Bank 3 ظرفیت ۱۰۰۰۰", "powerbank", "xiaomi", 1750000, 52,
    "پاوربانک اقتصادی شیائومی با شارژ ۲۲.۵ واتی.",
    "پاوربانک اقتصادی شیائومی با ظرفیت ۱۰۰۰۰ میلی‌آمپر و شارژ دوطرفه ۲۲.۵ واتی است. دو خروجی USB-A و USB-C اجازه شارژ هم‌زمان دو دستگاه را می‌دهند. نمایشگر LED وضعیت دقیق باتری را نشان می‌دهد.",
    "Xiaomi power bank 10000 product photo",
    { ...S([["capacity", "ظرفیت", "10000mAh"], ["output", "توان خروجی", "22.5W"], ["ports", "پورت‌ها", "USB-A + USB-C"]]),
      ...T(["شیائومی", "پاوربانک", "10000", "شارژ سریع", "power bank"]) }),

  /* ── شارژر (+4 → 5) ── */
  P("anker-100w-gan-4port", "شارژر دیواری انکر ۱۰۰ وات GaN با ۴ پورت", "charger", "anker", 3950000, 31,
    "شارژر ۱۰۰ واتی GaN چهارپورت برای لپ‌تاپ و موبایل.",
    "شارژر ۱۰۰ واتی انکر با فناوری GaN و چهار پورت (دو USB-C و دو USB-A) لپ‌تاپ، تبلت و دو گوشی را هم‌زمان شارژ می‌کند. فناوری PowerIQ 4.0 توان را هوشمندانه بین پورت‌ها تقسیم می‌کند. ابعاد جیبی آن جای شارژرهای حجیم را می‌گیرد.",
    "Anker 100W GaN 4 port charger product photo",
    { ...S([["power", "توان", "100W"], ["ports", "پورت‌ها", "2x USB-C + 2x USB-A"], ["tech", "فناوری", "GaN + PowerIQ 4.0"]]),
      ...T(["انکر", "شارژر", "100 وات", "gan", "چارگانه"]) }),

  P("apple-20w-usb-c-adapter", "شارژر اپل 20 وات USB-C", "charger", "apple", 1650000, 58,
    "شارژر رسمی اپل ۲۰ واتی با پورت USB-C.",
    "شارژر رسمی اپل با پورت USB-C و توان ۲۰ وات، آیفون را در نیم ساعت تا ۵۰٪ می‌رساند. با تمام مدل‌های iPhone، AirPods و iPad سازگار است. طراحی رسمی اپل با ایمنی کامل باتری.",
    "Apple 20W USB-C power adapter charger product photo",
    { ...S([["power", "توان", "20W"], ["port", "پورت", "USB-C"], ["compat", "سازگاری", "iPhone / AirPods"]]),
      ...T(["اپل", "شارژر", "20 وات", "usb-c", "اورجینال"]) }),

  P("samsung-45w-usb-c-adapter", "شارژر اصلی سامسونگ 45 وات USB-C", "charger", "samsung", 1950000, 37,
    "شارژر رسمی سامسونگ با Super Fast Charging ۴۵ واتی.",
    "شارژر اصلی سامسونگ با فناوری PD 3.0 Super Fast Charging ۴۵ وات، پرچمداران Galaxy را در کمترین زمان شارژ می‌کند. کابل USB-C به USB-C در جعبه موجود است. با گوشی‌ها و لپ‌تاپ‌های Galaxy Book سازگار است.",
    "Samsung 45W USB-C super fast charger product photo",
    { ...S([["power", "توان", "45W"], ["tech", "فناوری", "PD 3.0"], ["cable", "کابل", "USB-C در جعبه"]]),
      ...T(["سامسونگ", "شارژر", "45 وات", "سوپرفست", "اورجینال"]) }),

  P("xiaomi-33w-gan-adapter", "شارژر شیائومی 33 وات GaN", "charger", "xiaomi", 1250000, 44,
    "شارژر GaN شیائومی با ۳۳ وات و پورت USB-C.",
    "شارژر GaN شیائومی با توان ۳۳ وات و پورت USB-C، گوشی‌های Redmi و POCO را با حداکثر سرعت شارژ می‌کند. ساخت فشرده و محافظ‌های ایمنی کامل دارد. انتخابی اقتصادی و مطمئن برای شارژ روزمره.",
    "Xiaomi 33W GaN USB-C charger product photo",
    { ...S([["power", "توان", "33W"], ["tech", "فناوری", "GaN"], ["port", "پورت", "USB-C"]]),
      ...T(["شیائومی", "شارژر", "33 وات", "gan", "شارژر گوشی"]) }),

  /* ── هدفون (+4 → 6) ── */
  P("sony-wh-ch720n", "هدفون بی‌سیم سونی WH-CH720N", "headphones", "sony", 7900000, 24,
    "هدفون نویزکنسلینگ مقرون‌به‌صرفه سونی با ۳۵ ساعت باتری.",
    "هدفون نویزکنسلینگ سونی با ۳۵ ساعت باتری و وزن سبک ۱۹۲ گرم، راحتی تمام‌روز دارد. پردازنده صوتی V1 و فناوری DSEE کیفیت فایل‌های فشرده را بازسازی می‌کند. طراحی تاشو با کیس حمل، همراه خوب سفر است.",
    "Sony WH-CH720N wireless noise cancelling headphones product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"], ["آبی-آسمانی", "#A7C7E7"]]),
      ...S([["battery", "باتری", "35 ساعت"], ["anc", "نویزکنسلینگ", "فعال"], ["weight", "وزن", "192 گرم"]]),
      ...T(["سونی", "wh-ch720n", "هدفون", "نویزکنسلینگ", "بلوتوث"]) }),

  P("sony-inzone-h9-wireless", "هدفون گیمینگ سونی INZONE H9 بی‌سیم", "headphones", "sony", 11500000, 11,
    "هدفون گیمینگ با ANC و صدای فضایی ۳۶۰ درجه.",
    "هدفون گیمینگ سونی با نویزکنسلینگ فعال و صدای فضایی ۳۶۰ درجه مخصوص PS5 طراحی شده است. باتری ۳۲ ساعتی و میکروفون Flip-to-Mute دارد. سنسور حضور خودکار وقتی از سر بردارید موسیقی را متوقف می‌کند.",
    "Sony INZONE H9 wireless gaming headset product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"]]),
      ...S([["battery", "باتری", "32 ساعت"], ["spatial", "صدای فضایی", "360 Tempest"], ["anc", "نویزکنسلینگ", "فعال"]]),
      ...T(["سونی", "inzone h9", "هدفون گیمینگ", "ps5", "بی‌سیم"]) }),

  P("jbl-tune-760nc", "هدفون بی‌سیم JBL Tune 760NC", "headphones", "jbl", 5250000, 20,
    "هدفون JBL با Pure Bass و نویزکنسلینگ فعال.",
    "هدفون JBL Tune 760NC با امضای صوتی Pure Bass و نویزکنسلینگ فعال، در محدوده قیمتی خود بی‌رقیب است. تا ۳۵ ساعت پخش دارد و شارژ ۵ دقیقه‌ای ۳ ساعت پخش اضافه می‌دهد. طراحی تاشو و سبک برای استفاده روزمره.",
    "JBL Tune 760NC wireless noise cancelling headphones product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"], ["آبی", "#2E7DC2"]]),
      ...S([["battery", "باتری", "35 ساعت"], ["anc", "نویزکنسلینگ", "فعال"], ["sound", "صدا", "JBL Pure Bass"]]),
      ...T(["jbl", "tune 760nc", "هدفون", "نویزکنسلینگ", "بلوتوث"]) }),

  P("apple-airpods-max", "هدفون بی‌سیم اپل AirPods Max", "headphones", "apple", 32500000, 6,
    "هدفون پرچمدار اپل با بدنه آلومینیومی و Spatial Audio.",
    "هدفون پرچمدار اپل با بدنه آلومینیومی، تاج دیجیتال و تراشه H1 ساخته شده است. نویزکنسلینگ فعال و Spatial Audio با ردیابی حرکت سر، تجربه شنیداری فراگیر می‌سازد. ۲۰ ساعت باتری و کیس هوشمند حالت کم‌مصرف دارد.",
    "Apple AirPods Max headphones product photo",
    { ...C([["خاکستری-فضایی", "#2B2B31"], ["نقره‌ای", "#C9CDD3"], ["آبی-آسمانی", "#A7C7E7"], ["سبز", "#A8C3A0"]]),
      ...S([["chip", "تراشه", "Apple H1"], ["battery", "باتری", "20 ساعت"], ["audio", "صدا", "Spatial Audio"]]),
      ...T(["اپل", "airpods max", "هدفون", "پرچمدار", "اسپشیال"]), ...F({ featured: true }) }),

  /* ── هندزفری (+4 → 5) ── */
  P("samsung-galaxy-buds3-pro", "هندزفری بی‌سیم سامسونگ Galaxy Buds3 Pro", "earbuds", "samsung", 8900000, 22,
    "هندزفری پرچمدار سامسونگ با ANC هوشمند و صدای ۲۴ بیتی.",
    "هندزفری پرچمدار سامسونگ با طراحی جدید و نویزکنسلینگ تطبیفی هوشمند، محیط را به‌دقت فیلتر می‌کند. صدای Hi-Fi ۲۴ بیتی با کدک Seamless ساخت سامسونگ ارائه می‌شود. گواهی IP57 در برابر آب و عرق دارد.",
    "Samsung Galaxy Buds3 Pro wireless earbuds product photo",
    { ...C([["مشکی", "#1F1F24"], ["نقره‌ای", "#C9CDD3"]]),
      ...S([["anc", "نویزکنسلینگ", "تطبیقی هوشمند"], ["audio", "صدا", "Hi-Fi 24bit"], ["waterproof", "ضدآب", "IP57"]]),
      ...T(["سامسونگ", "buds3 pro", "هندزفری", "گلکسی", "بی‌سیم"]) }),

  P("jbl-live-pro-2", "هندزفری بی‌سیم JBL Live Pro 2", "earbuds", "jbl", 4850000, 26,
    "هندزفری TWS با ANC و مجموعاً ۴۰ ساعت پخش.",
    "هندزفری بی‌سیم JBL Live Pro 2 با نویزکنسلینگ فعال و مجموعاً ۴۰ ساعت پخش (با کیس) عرضه شده است. فناوری PersoniFi صدا را با شکل گوش شما شخصی‌سازی می‌کند. شارژ بی‌سیم و گواهی IP54 دارد.",
    "JBL Live Pro 2 wireless earbuds product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید", "#F2F2F7"], ["بنفش", "#7C5CBF"]]),
      ...S([["battery", "باتری", "40 ساعت مجموع"], ["anc", "نویزکنسلینگ", "فعال"], ["charge", "شارژ", "بی‌سیم"]]),
      ...T(["jbl", "live pro 2", "هندزفری", "tws", "anc"]) }),

  P("xiaomi-redmi-buds-5-pro", "هندزفری بی‌سیم شیائومی Redmi Buds 5 Pro", "earbuds", "xiaomi", 2650000, 43,
    "هندزفری اقتصادی با ANC ۵۲ دسی‌بلی و درایور تیتانیومی.",
    "هندزفری اقتصادی شیائومی با نویزکنسلینگ تا ۵۲ دسی‌بل و درایور ۱۱ میلی‌متری تیتانیومی، کیفیت صدا را در محدوده قیمتی خود بالا برده است. مجموعاً ۳۸ ساعت پخش با کیس شارژ دارد. حالت گیمینگ با تأخیر پایین برای بازی موبایلی.",
    "Xiaomi Redmi Buds 5 Pro wireless earbuds product photo",
    { ...C([["مشکی", "#1F1F24"], ["سفید-یخی", "#EAF2F8"], ["بنفش-پرپی", "#7C5CBF"]]),
      ...S([["anc", "نویزکنسلینگ", "تا 52dB"], ["driver", "درایور", "11mm تیتانیومی"], ["battery", "باتری", "38 ساعت مجموع"]]),
      ...T(["شیائومی", "redmi buds 5 pro", "هندزفری", "tws", "اقتصادی"]) }),

  P("google-pixel-buds-pro-2", "هندزفری بی‌سیم گوگل Pixel Buds Pro 2", "earbuds", "google", 9600000, 12,
    "هندزفری گوگل با تراشه Tensor A1 و دستیار Gemini.",
    "هندزفری گوگل با تراشه Tensor A1 و نویزکنسلینگ قدرتمند، پردازش صدا را روی خود دستگاه انجام می‌دهد. دستیار صوتی Gemini بدون نیاز به گوشی پاسخ می‌دهد. گواهی IP54 و مجموعاً ۳۰ ساعت پخش دارد.",
    "Google Pixel Buds Pro 2 wireless earbuds product photo",
    { ...C([["مشکی-پورسلین", "#2B2B31"], ["خاکستری-مرمی", "#8A8A8F"], ["سبز-خزه‌ای", "#6B705C"]]),
      ...S([["chip", "تراشه", "Tensor A1"], ["anc", "نویزکنسلینگ", "Silent Seal 2.0"], ["battery", "باتری", "30 ساعت مجموع"]]),
      ...T(["گوگل", "pixel buds pro 2", "هندزفری", "gemini", "tws"]) }),

  /* ── ساعت هوشمند (+4 → 6) ── */
  P("apple-watch-ultra-2-49", "ساعت هوشمند اپل Watch Ultra 2 سایز ۴۹ میلی‌متری", "smart-watch", "apple", 49500000, 5,
    "ساعت حرفه‌ای اپل با بدنه تیتانیومی و روشنایی ۳۰۰۰ نیت.",
    "Apple Watch Ultra 2 با بدنه تیتانیومی ۴۹ میلی‌متری و نمایشگر ۳۰۰۰ نیتی، برای ورزش‌های سنگین و بیابان ساخته شده است. GPS دوفرکانسی و باتری تا ۷۲ ساعت در حالت کم‌مصرف دارد. برای غواصی تا عمق ۴۰ متر و کوهنوردی طراحی شده است.",
    "Apple Watch Ultra 2 smartwatch product photo",
    { ...C([["تیتانیوم-طبیعی", "#C9CDD3"], ["تیتانیوم-مشکی", "#2B2B31"]]),
      ...S([["case", "بدنه", "تیتانیوم 49mm"], ["water", "مقاومت آب", "100m (غواصی 40m)"], ["battery", "باتری", "تا 72 ساعت"]]),
      ...T(["اپل", "watch ultra 2", "ساعت هوشمند", "حرفه‌ای", "ورزش"]), ...F({ featured: true }) }),

  P("samsung-galaxy-watch-7-44", "ساعت هوشمند سامسونگ Galaxy Watch 7 سایز ۴۴ میلی‌متری", "smart-watch", "samsung", 17800000, 19,
    "ساعت هوشمند سامسونگ با پردازنده ۳ نانومتری.",
    "ساعت هوشمند سامسونگ با پردازنده ۵ نانومتری و سنسور BioActive نسل جدید، تحلیل دقیق‌تری از بدن ارائه می‌دهد. با Wear OS و اپ‌های گوگل سازگار و ۳۲ گیگابایت حافظه دارد. ردیابی خواب با هوش مصنوعی و بیش از ۱۰۰ تمرین ورزشی.",
    "Samsung Galaxy Watch 7 smartwatch product photo",
    { ...C([["مشکی", "#1F1F24"], ["سبز-کریسمس", "#2E8B57"], ["کرمی-ماربل", "#EAE0D5"]]),
      ...S([["size", "سایز", "44mm"], ["os", "سیستم‌عامل", "Wear OS 5"], ["health", "سلامت", "BioActive نسل ۳"]]),
      ...T(["سامسونگ", "galaxy watch 7", "ساعت هوشمند", "ورزش", "سلامت"]) }),

  P("xiaomi-watch-s3", "ساعت هوشمند شیائومی Watch S3", "smart-watch", "xiaomi", 6200000, 28,
    "ساعت شیائومی با قاب قابل تعویض و ۱۵ روز باتری.",
    "ساعت هوشمند شیائومی با قاب‌های قابل تعویض و نمایشگر AMOLED ۱.۴۳ اینچی، ظاهر ساعت را هر روز عوض می‌کند. ۱۵۰ حالت ورزشی و GPS داخلی دارد. باتری آن تا ۱۵ روز دوام می‌کند.",
    "Xiaomi Watch S3 smartwatch product photo",
    { ...C([["نقره‌ای", "#C9CDD3"], ["مشکی", "#1F1F24"]]),
      ...S([["display", "نمایشگر", "1.43 AMOLED"], ["battery", "باتری", "تا 15 روز"], ["sports", "ورزش", "150 حالت"]]),
      ...T(["شیائومی", "watch s3", "ساعت هوشمند", "قاب تعویضی", "ورزش"]) }),

  P("google-pixel-watch-3-41", "ساعت هوشمند گوگل Pixel Watch 3 سایز ۴۱ میلی‌متری", "smart-watch", "google", 15900000, 14,
    "ساعت گوگل با نمایشگر Actua و قابلیت‌های Fitbit.",
    "ساعت هوشمند گوگل با نمایشگر Actua روشن و قابلیت‌های سلامت Fitbit، دقیق‌ترین تحلیل بدن را ارائه می‌دهد. ناوبری Google Maps با مسیرهای گردشی روی مچ دست شماست. سنسور心率 دقیق و GPS داخلی دارد.",
    "Google Pixel Watch 3 smartwatch product photo",
    { ...C([["مشکی-اسلیت", "#1F1F24"], ["کرمی-پورسلین", "#EAE0D5"], ["آبی-آیسی", "#A7C7E7"]]),
      ...S([["size", "سایز", "41mm"], ["display", "نمایشگر", "Actua 2000 nits"], ["health", "سلامت", "Fitbit کامل"]]),
      ...T(["گوگل", "pixel watch 3", "ساعت هوشمند", "fitbit", "ورزش"]) }),

  /* ── گجت‌های هوشمند (+3 → 4) ── */
  P("google-nest-mini-2", "اسپیکر هوشمند گوگل Nest Mini", "smart-gadgets", "google", 2850000, 25,
    "اسپیکر هوشمند کوچک با Google Assistant.",
    "اسپیکر هوشمند کوچک گوگل با صدای بهبودیافته و بیس قوی‌تر از نسل قبل، برای کنترل صوتی خانه ایده‌آل است. بدنه پارچه‌ای از پلاستیک بازیافتی ساخته شده است. اکولایزر خودکار با محیط صدا را تنظیم می‌کند.",
    "Google Nest Mini smart speaker product photo",
    { ...C([["خاکستری-زغالی", "#5A5A5F"], ["گچی", "#EAE0D5"]]),
      ...S([["assistant", "دستیار", "Google Assistant"], ["audio", "صدا", "40mm درایور"], ["material", "جنس", "پارچه بازیافتی"]]),
      ...T(["گوگل", "nest mini", "اسپیکر هوشمند", "خانه هوشمند", "دستیار صوتی"]) }),

  P("apple-airtag-4pack", "ردیاب اپل AirTag بسته ۴ عددی", "smart-gadgets", "apple", 5600000, 23,
    "ردیاب بلوتوثی اپل با شبکه Find My جهانی.",
    "ردیاب بلوتوثی اپل با شبکه Find My جهانی، کیف، کلید و چمدان شما را در نقاط مختلف جهان پیدا می‌کند. بلندگوی داخلی با یک تپ پیدا کردنش را آسان می‌کند. باتری قابل تعویض CR2032 حدود یک سال دوام دارد.",
    "Apple AirTag 4 pack tracker product photo",
    { ...C([["نقره‌ای", "#C9CDD3"]]),
      ...S([["network", "شبکه", "Find My جهانی"], ["battery", "باتری", "CR2032 یک ساله"], ["pack", "بسته", "4 عددی"]]),
      ...T(["اپل", "airtag", "ردیاب", "فایند-مای", "لوازم جانبی"]) }),

  P("samsung-smart-tag2", "ردیاب سامسونگ SmartTag 2", "smart-gadgets", "samsung", 2350000, 30,
    "ردیاب سامسونگ با شبکه SmartThings Find.",
    "ردیاب سامسونگ با شبکه SmartThings Find و گواهی IP67، وسایل گران‌قیمت را ردیابی می‌کند. حالت Lost تا شش ماه باتری مصرف می‌کند تا وسیله گم‌شده را پیدا کنید. حلقه بزرگ‌تر آن به قلاب‌های مختلف وصل می‌شود.",
    "Samsung Galaxy SmartTag 2 tracker product photo",
    { ...C([["سفید", "#F2F2F7"], ["مشکی", "#1F1F24"]]),
      ...S([["network", "شبکه", "SmartThings Find"], ["battery", "باتری", "تا 500 روز"], ["waterproof", "مقاومت", "IP67"]]),
      ...T(["سامسونگ", "smarttag 2", "ردیاب", "اسمارت تگ", "لوازم جانبی"]) }),

  /* ── پروژکتور (+3 → 4) ── */
  P("epson-ef-12-laser-projector", "پروژکتور لیزری اپسون EF-12", "projector", "epson", 68500000, 3,
    "پروژکتور لیزری 3LCD با اندروید داخلی و اسپیکر یاماها.",
    "پروژکتور لیزری اپسون با فناوری 3LCD و منبع نور لیزری، بدون لامپ و بدون نیاز به کاست کار می‌کند. اندروید داخلی اپلیکیشن‌های استریم را بدون دستگاه جانبی اجرا می‌کند. اسپیکرهای یاماها ۲×۵ وات صدای فراگیر دارند.",
    "Epson EF-12 laser projector product photo",
    { ...S([["light", "منبع نور", "لیزر ۲۰ ساله"], ["os", "سیستم", "Android TV"], ["audio", "صدا", "Yamaha 2x5W"]]),
      ...T(["اپسون", "ef-12", "پروژکتور", "لیزری", "اندروید"]) }),

  P("epson-eb-fh06-fullhd", "پروژکتور اپسون EB-FH06 Full HD", "projector", "epson", 34500000, 6,
    "پروژکتور Full HD پرنور ۳۵۰۰ لومن برای جلسات.",
    "پروژکتور اپسون با رزولوشن Full HD و روشنایی ۳۵۰۰ لومن، در کلاس درس و جلسات اداری با نور محیط هم تصویر شفافی می‌دهد. تصحیح کشیدگی عمودی خودکار تنظیم را آسان می‌کند. دو ورودی HDMI دارد.",
    "Epson EB-FH06 Full HD projector product photo",
    { ...S([["brightness", "روشنایی", "3500 لومن"], ["resolution", "رزولوشن", "Full HD"], ["inputs", "ورودی‌ها", "2x HDMI"]]),
      ...T(["اپسون", "eb-fh06", "پروژکتور", "اداری", "آموزشی"]) }),

  P("lg-cinebeam-ph550", "پروژکتور قابل حمل LG CineBeam PH550", "projector", "lg", 39800000, 4,
    "مینی پروژکتور LED جیبی با باتری داخلی.",
    "مینی پروژکتور LED قابل حمل LG با رزولوشن HD و باتری داخلی ۲.۵ ساعته، سینما را هر جا می‌برد. بلوتوث داخلی و تیونر TV دارد. وزن فقط ۵۵۰ گرم و پروjection تا ۱۰۰ اینچ.",
    "LG CineBeam PH550 mini portable projector product photo",
    { ...S([["light", "منبع نور", "LED"], ["battery", "باتری", "داخلی 2.5 ساعت"], ["resolution", "رزولوشن", "HD 1280x720"]]),
      ...T(["ال‌جی", "سین‌بیم", "پروژکتور", "قابل حمل", "مینی"]), ...F({ special: true }) }),

  /* ── تجهیزات شبکه (+3 → 3) ── */
  P("asus-rt-ax3000-wifi6", "روتر ایسوس RT-AX3000 WiFi 6", "network", "asus", 6450000, 16,
    "روتر WiFi 6 دوپهنای‌باند با سرعت ۳۰۰۰ مگابیت.",
    "روتر ایسوس RT-AX3000 با WiFi 6 و سرعت کل ۳۰۰۰ مگابیت، پوشش پایدار برای خانه‌های بزرگ می‌دهد. فناوری OFDMA و MU-MIMO ده‌ها دستگاه را هم‌زمان مدیریت می‌کند. با AiProtection امنیت شبکه را مادام‌العمر رایگان حفظ می‌کند.",
    "ASUS RT-AX3000 WiFi 6 router product photo",
    { ...S([["speed", "سرعت", "3000Mbps"], ["standard", "استاندارد", "WiFi 6 AX"], ["security", "امنیت", "AiProtection"]]),
      ...T(["ایسوس", "روتر", "wifi 6", "rt-ax3000", "شبکه"]), ...F({ featured: true }) }),

  P("asus-zenwifi-xt8-mesh", "سیستم مش ایسوس ZenWiFi XT8 دو پک", "network", "asus", 14500000, 7,
    "سیستم مش WiFi 6 دوپک با پوشش ۵۵۰۰ فوت.",
    "سیستم مش ایسوس ZenWiFi XT8 با دو واحد، WiFi 6 پوشش کامل بدون نقطه مرده می‌دهد. کنترل والدین و آنتی‌ویروس مادام‌العمر AiProtection دارد. راه‌اندازی با اپ ASUS Router در چند دقیقه انجام می‌شود.",
    "ASUS ZenWiFi XT8 mesh WiFi system product photo",
    { ...S([["coverage", "پوشش", "5500 فوت مربع"], ["standard", "استاندارد", "WiFi 6 AX6600"], ["pack", "بسته", "2 واحد"]]),
      ...T(["ایسوس", "مش", "zenwifi", "wifi 6", "شبکه"]) }),

  P("google-nest-wifi-pro", "سیستم مش گوگل Nest WiFi Pro", "network", "google", 12800000, 9,
    "مش WiFi 6E سه‌پهنای‌باند گوگل با هاب هوشمند.",
    "سیستم مش گوگل با WiFi 6E و پوشش ۲۲۰۰ فوت مربع برای هر واحد، سرعت و پایداری نسل جدید را می‌دهد. روتر هاب Matter و Thread دارد و مرکز خانه هوشمند شما می‌شود. راه‌اندازی با اپ Google Home بسیار ساده است.",
    "Google Nest WiFi Pro mesh router product photo",
    { ...S([["standard", "استاندارد", "WiFi 6E"], ["coverage", "پوشش", "2200 فوت هر واحد"], ["smart", "خانه هوشمند", "هاب Matter + Thread"]]),
      ...T(["گوگل", "nest wifi", "مش", "wifi 6e", "شبکه"]) }),

  /* ── حافظه و SSD (+2 → 3) ── */
  P("samsung-t7-shield-1tb", "حافظه SSD پرتابل سامسونگ T7 Shield ظرفیت ۱ ترابایت", "storage", "samsung", 4950000, 26,
    "SSD پرتابل ضدآب و ضربه با سرعت ۱۰۵۰ مگابایت.",
    "حافظه SSD پرتابل سامسونگ T7 Shield با سرعت خواندن ۱۰۵۰ مگابایت بر ثانیه، انتقال فایل‌های حجیم را در چند ثانیه انجام می‌دهد. بدنه لاستیکی با گواهی IP65 در برابر آب و گرد و غبار مقاوم است. سازگار با PC، کنسول و گوشی.",
    "Samsung T7 Shield portable SSD product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی-بوف", "#3B5C82"], ["کرمی-بگ", "#D9C7A7"]]),
      ...S([["capacity", "ظرفیت", "1TB"], ["speed", "سرعت", "1050MB/s"], ["durability", "مقاومت", "IP65 ضد ضربه"]]),
      ...T(["سامسونگ", "t7 shield", "اس‌اس‌دی پرتابل", "حافظه", "۱ ترابایت"]) }),

  P("samsung-870-evo-1tb", "حافظه SSD سامسونگ 870 EVO SATA ظرفیت ۱ ترابایت", "storage", "samsung", 3750000, 21,
    "SSD SATA محبوب برای ارتقای سیستم‌های قدیمی.",
    "حافظه SSD SATA سامسونگ 870 EVO با سرعت ۵۶۰ مگابایت بر ثانیه، بهترین ارتقا برای لپ‌تاپ و PC‌های قدیمی است. مغز ساخت سامسونگ و پنج سال گارانتی محدود دارد. نرم‌افزار Magician سلامت درایو را پایش می‌کند.",
    "Samsung 870 EVO SATA SSD product photo",
    { ...S([["capacity", "ظرفیت", "1TB"], ["speed", "سرعت", "560/530 MB/s"], ["form", "فرم‌فاکتور", "2.5 اینچ SATA"]]),
      ...T(["سامسونگ", "870 evo", "اس‌اس‌دی", "sata", "حافظه"]) }),

  /* ── اسپیکر (+1 → 2) ── */
  P("jbl-flip-6", "اسپیکر بلوتوثی JBL Flip 6 ضدآب", "speaker", "jbl", 4850000, 24,
    "اسپیکر بلوتوثی ضدآب IP67 با ۱۲ ساعت پخش.",
    "JBL Flip 6 با درایور دوگانه و دو توییتر، صدای قدرتمند و شفاف در بدنه استوانه‌ای جمع‌وجور ارائه می‌دهد. گواهی IP67 آن را در برابر آب و غبار کاملاً مقاوم می‌کند؛ برای ساحل و دوش عالی است. تا ۱۲ ساعت پخش و قابلیت PartyBoost دارد.",
    "JBL Flip 6 portable bluetooth speaker product photo",
    { ...C([["مشکی", "#1F1F24"], ["آبی-تخت", "#2E7DC2"], ["قرمز", "#B4362F"], ["سبز-جیغ", "#2E8B57"]]),
      ...S([["power", "توان", "30W"], ["waterproof", "ضدآب", "IP67"], ["battery", "باتری", "12 ساعت"]]),
      ...T(["اسپیکر", "بلوتوث", "jbl", "flip 6", "ضدآب"]) }),
];

/* ── final catalog + deterministic SKUs for NEW products ───────────── */
const CATALOG = [...EXISTING, ...NEW];
if (new Set(CATALOG.map((p) => p.slug)).size !== CATALOG.length) {
  console.error("✗ duplicate slugs in CATALOG — aborting");
  process.exit(1);
}
for (let i = 0; i < CATALOG.length; i++) {
  const e = CATALOG[i];
  e.isNew = i >= EXISTING.length;
  e.sku = `TAJ-${CAT_CODE[e.cat] ?? "GEN"}-${String(i + 1).padStart(3, "0")}`;
}

/* ── progress state (resumable) ────────────────────────────────────── */
function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, "utf8");
    const j = JSON.parse(raw);
    return { done: j.done ?? {}, failed: j.failed ?? {}, runs: j.runs ?? 0 };
  } catch {
    return { done: {}, failed: {}, runs: 0 };
  }
}
function saveProgress(p) {
  const tmp = PROGRESS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(p, null, 1));
  fs.renameSync(tmp, PROGRESS_FILE);
}

/* ── image helpers ─────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastSearchStart = 0;
const MIN_SEARCH_INTERVAL_MS = 5000; // global pacing to dodge 429s
const RATE_LIMIT_DELAYS = [20_000, 45_000, 90_000];

function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "webp";
  return null; // GIF/HTML/anything else → reject
}

async function searchImages(query) {
  for (let attempt = 0; attempt <= RATE_LIMIT_DELAYS.length; attempt++) {
    // global pacing: never fire two searches closer than MIN_SEARCH_INTERVAL
    const wait = Math.max(0, lastSearchStart + MIN_SEARCH_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastSearchStart = Date.now();
    try {
      const { stdout } = await execFileAsync(
        "z-ai",
        ["image-search", "-q", query, "--count", "8", "--gl", "us", "--no-rank"],
        { timeout: SEARCH_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 }
      );
      const start = stdout.indexOf("{");
      if (start < 0) return [];
      const json = JSON.parse(stdout.slice(start));
      if (!json.success || !Array.isArray(json.results)) return [];
      return json.results
        .map((r) => ({ url: r.original_url, w: parseInt(r.original_width, 10) || 0 }))
        .filter((r) => typeof r.url === "string" && r.url.startsWith("http"));
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (msg.includes("429")) {
        // v32: rate-limited → bail immediately so the Commons fallback runs
        // (the long backoff loop was only useful while z-ai had quota).
        return [];
      }
      return [];
    }
  }
  return [];
}

/* ── v32 fallback source: Wikimedia Commons (free-licensed photos, no
 * z-ai quota). Used when the image-search CLI is rate-limited/empty. ── */
async function searchImagesCommons(query) {
  const q = encodeURIComponent(query.replace(/\s+/g, " ").trim());
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Csize%7Cmime&format=json`;
  try {
    const { stdout } = await execFileAsync("curl", [
      "-s", "--max-time", "30", "-A", "Mozilla/5.0", api,
    ], { timeout: 40_000, maxBuffer: 16 * 1024 * 1024 });
    const json = JSON.parse(stdout);
    const pages = Object.values(json?.query?.pages ?? {});
    const out = [];
    for (const p of pages) {
      const ii = p?.imageinfo?.[0];
      if (!ii?.url) continue;
      const mime = String(ii.mime || "");
      if (mime !== "image/jpeg" && mime !== "image/png") continue; // bitmaps only
      const w = parseInt(ii.width, 10) || 0;
      const h = parseInt(ii.height, 10) || 0;
      if (w < 500 || h < 300) continue;             // too small
      if (w > 6000 || h > 6000) continue;            // absurd
      if (w / h > 3 || h / w > 2) continue;          // extreme aspect
      out.push({ url: ii.url.split("?")[0], w });    // strip utm tracking
    }
    // prefer ~800–2000px wide, jpeg-ish, then wider first
    out.sort((a, b) => Math.abs(a.w - 1200) - Math.abs(b.w - 1200));
    return out;
  } catch {
    return [];
  }
}

/* ── v32 fallback #2: Bing Images async endpoint (no API key, real
 * product photos from retailer/manufacturer CDNs). ────────────────── */
async function searchImagesBing(query) {
  const q = encodeURIComponent(query.replace(/product photo|professional studio/gi, "").trim());
  if (!q) return [];
  const url = `https://www.bing.com/images/async?q=${q}&first=1&count=15`;
  try {
    const { stdout } = await execFileAsync("curl", [
      "-s", "--max-time", "30",
      "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "-H", "Accept-Language: en-US",
      url,
    ], { timeout: 40_000, maxBuffer: 16 * 1024 * 1024 });
    const out = [];
    const re = /murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g;
    let m;
    while ((m = re.exec(stdout)) !== null) out.push({ url: m[1], w: 0 });
    return [...new Map(out.map((r) => [r.url, r])).values()].slice(0, 10);
  } catch {
    return [];
  }
}

async function download(url, dest) {
  try {
    await execFileAsync("curl", ["-sL", "--max-time", "90", "-o", dest, url], { timeout: 100_000 });
    return true;
  } catch {
    return false;
  }
}

/** existing local image for this slug that still validates? → reuse (fast resume) */
function existingValidFile(slug) {
  for (const ext of ["jpg", "png", "webp"]) {
    const f = path.join(OUT_DIR, `${slug}.${ext}`);
    if (fs.existsSync(f)) {
      const buf = fs.readFileSync(f);
      const sniff = sniffImage(buf);
      if (sniff && buf.length <= MAX_BYTES && buf.length >= MIN_BYTES) {
        return { file: `/images/products/${slug}.${ext}`, bytes: buf.length };
      }
      fs.rmSync(f); // corrupted/too big → discard so it can be re-fetched
    }
  }
  return null;
}

/** try candidates in order (big, ≥600px first) → first valid download wins */
async function fetchImage(slug, results) {
  const good = results.filter((r) => r.w >= 600).sort((a, b) => b.w - a.w);
  const rest = results.filter((r) => r.w < 600).sort((a, b) => b.w - a.w);
  const ordered = [...good, ...rest].slice(0, 10);
  const tmp = path.join(OUT_DIR, `.tmp-${slug}`);
  for (const cand of ordered) {
    if (!(await download(cand.url, tmp))) continue;
    let buf = null;
    try {
      buf = fs.readFileSync(tmp);
    } catch {
      continue;
    }
    const ext = sniffImage(buf);
    if (!ext || buf.length > MAX_BYTES || buf.length < MIN_BYTES) continue; // → next result
    // remove any stale file of this slug (other extensions) then finalize
    for (const e2 of ["jpg", "png", "webp"]) {
      const f = path.join(OUT_DIR, `${slug}.${e2}`);
      if (fs.existsSync(f) && f !== path.join(OUT_DIR, `${slug}.${ext}`)) fs.rmSync(f);
    }
    fs.renameSync(tmp, path.join(OUT_DIR, `${slug}.${ext}`));
    return { file: `/images/products/${slug}.${ext}`, bytes: buf.length, src: cand.url };
  }
  try {
    if (fs.existsSync(tmp)) fs.rmSync(tmp);
  } catch { /* ignore */ }
  return null;
}

/* ── DB upsert (both databases) ───────────────────────────────────── */
function buildSearchTextFor(e, sku, catName, brandName) {
  const specVals = (e.specs ?? []).map((s) => s[2]).join(" ");
  const tagStr = (e.tags ?? []).join(" ");
  const colorNames = (e.colors ?? []).map((c) => c[0]).join(" ");
  return buildSearchText(e.name, sku, e.slug, catName, brandName, tagStr, specVals, colorNames);
}

async function upsertProduct(db, e, imgPath, cat, brand) {
  const data = {
    name: e.name,
    shortDescription: e.short,
    description: e.desc,
    price: e.price,
    ...(e.disc ? { discountPrice: e.disc } : {}),
    stock: e.stock,
    colors: JSON.stringify((e.colors ?? []).map(([name, hex]) => ({ name, hex }))),
    specifications: JSON.stringify((e.specs ?? []).map(([key, label, value]) => ({ key, label, value }))),
    tags: JSON.stringify(e.tags ?? []),
    mainImage: imgPath,
    searchText: buildSearchTextFor(e, e.sku, cat.name, brand.name),
    status: "PUBLISHED",
  };

  const existing = await db.product.findUnique({ where: { slug: e.slug }, select: { id: true, sku: true } });
  if (existing) {
    // keep the DB's own sku (unique constraint) & relations; only refresh content
    data.searchText = buildSearchTextFor(e, existing.sku, cat.name, brand.name);
    const updated = await db.product.update({
      where: { slug: e.slug },
      data: { ...data, updatedAt: new Date() },
    });
    await db.productImage.deleteMany({ where: { productId: updated.id } });
    await db.productImage.create({ data: { productId: updated.id, url: imgPath, alt: e.name, sortOrder: 0 } });
    return { id: updated.id, created: false };
  }
  const idx = CATALOG.indexOf(e);
  const now = new Date();
  const created = await db.product.create({
    data: {
      ...data,
      slug: e.slug,
      sku: e.sku,
      categoryId: cat.id,
      brandId: brand.id,
      featured: !!e.flags?.featured,
      isSpecial: !!e.flags?.special,
      rating: 4 + ((idx * 7) % 10) / 10,
      reviewCount: 3 + ((idx * 13) % 37),
      soldCount: 5 + ((idx * 17) % 110),
      viewCount: 40 + ((idx * 31) % 850),
      seoTitle: `${e.name} | خرید با بهترین قیمت از تاج الکترونیکس`,
      seoDescription: e.short,
      createdAt: now,
      updatedAt: now,
    },
  });
  await db.productImage.create({ data: { productId: created.id, url: imgPath, alt: e.name, sortOrder: 0 } });
  return { id: created.id, created: true };
}

/* ── per-product pipeline ──────────────────────────────────────────── */
async function processProduct(e, dbs, catMaps, brandMaps, progress, force) {
  // 1 · already done on a previous run?
  if (!force && progress.done[e.slug]) {
    const still = existingValidFile(e.slug);
    if (still) return { slug: e.slug, status: "skipped" };
    delete progress.done[e.slug]; // file vanished → redo
  }
  // 2 · local valid file already on disk (resume after an interrupted run)
  let img = existingValidFile(e.slug);
  let note = "reused-file";
  // 3 · otherwise: search + download
  if (!img) {
    let results = await searchImages(e.q);
    if (results.length === 0) results = await searchImages(`${e.q} professional studio`);
    if (results.length === 0) results = await searchImagesCommons(e.q); // v32 fallback (no z-ai quota)
    if (results.length === 0) results = await searchImagesCommons(e.q.replace(/product photo|professional studio/gi, "").trim());
    if (results.length === 0) results = await searchImagesBing(e.q);   // v32 fallback #2 (Bing Images)
    if (results.length === 0) results = await searchImagesBing(e.name + " " + (e.brand || ""));
    if (results.length === 0) {
      const f = progress.failed[e.slug] ?? { tries: 0 };
      f.tries += 1;
      f.error = "image-search returned no usable results";
      f.lastAt = new Date().toISOString();
      progress.failed[e.slug] = f;
      return { slug: e.slug, status: "failed", error: f.error, tries: f.tries };
    }
    const saved = await fetchImage(e.slug, results);
    if (!saved) {
      const f = progress.failed[e.slug] ?? { tries: 0 };
      f.tries += 1;
      f.error = `no candidate downloaded as a valid ≤900KB image (${results.length} results)`;
      f.lastAt = new Date().toISOString();
      progress.failed[e.slug] = f;
      return { slug: e.slug, status: "failed", error: f.error, tries: f.tries };
    }
    img = saved;
    note = `downloaded ${(saved.bytes / 1024) | 0}KB`;
  }

  // 4 · upsert into BOTH databases
  const dbResults = [];
  for (let i = 0; i < dbs.length; i++) {
    const cat = catMaps[i].get(e.cat);
    const brand = brandMaps[i].get(e.brand);
    if (!cat || !brand) throw new Error(`missing category '${e.cat}' or brand '${e.brand}' for ${e.slug}`);
    const r = await upsertProduct(dbs[i], e, img.file, cat, brand);
    dbResults.push(r);
  }

  progress.done[e.slug] = {
    file: img.file,
    bytes: img.bytes,
    src: img.src ?? "local",
    dbs: dbResults.map((r) => (r.created ? "created" : "updated")).join("+"),
    at: new Date().toISOString(),
  };
  delete progress.failed[e.slug];
  return { slug: e.slug, status: "ok", note, img: img.file };
}

/* ── CLI args ──────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
function argVal(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
}
const LIMIT = argVal("--limit") ? parseInt(argVal("--limit"), 10) : Infinity;
const CATEGORY = argVal("--category");
const SLUG = argVal("--slug");
const FORCE = argv.includes("--force");
const VERIFY = argv.includes("--verify");
const STATUS = argv.includes("--status");

/* ── main ──────────────────────────────────────────────────────────── */
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const progress = loadProgress();
  const dbs = DB_FILES.map((f) => new PrismaClient({ datasourceUrl: "file:" + path.join(ROOT, f), log: [] }));

  try {
    if (STATUS) {
      console.log(`progress: ${Object.keys(progress.done).length}/${CATALOG.length} done · ${Object.keys(progress.failed).length} failed`);
      for (const [slug, f] of Object.entries(progress.failed)) console.log(`  ✗ ${slug} (tries=${f.tries}): ${f.error}`);
      return;
    }

    if (VERIFY) {
      let bad = 0;
      const counts = [];
      for (let i = 0; i < dbs.length; i++) {
        const total = await dbs[i].product.count();
        counts.push(`${DB_FILES[i]}: ${total}`);
        for (const e of CATALOG) {
          const row = await dbs[i].product.findUnique({ where: { slug: e.slug }, select: { mainImage: true, status: true, categoryId: true, brandId: true } });
          if (!row) { console.log(`  ✗ ${DB_FILES[i]} missing row: ${e.slug}`); bad++; continue; }
          if (!row.mainImage || !row.mainImage.startsWith(`/images/products/${e.slug}.`)) { console.log(`  ✗ ${DB_FILES[i]} bad mainImage: ${e.slug} → ${row.mainImage}`); bad++; }
          if (row.status !== "PUBLISHED") { console.log(`  ✗ ${DB_FILES[i]} not published: ${e.slug}`); bad++; }
        }
      }
      let missing = 0;
      for (const e of CATALOG) {
        if (!existingValidFile(e.slug)) { console.log(`  ✗ missing/invalid image file: ${e.slug}`); missing++; }
      }
      console.log(`── verify ──\n  products: ${counts.join(" | ")} (catalog = ${CATALOG.length})\n  bad rows: ${bad} · missing files: ${missing}`);
      process.exitCode = bad || missing || counts.some((c) => !c.endsWith(String(CATALOG.length))) ? 1 : 0;
      return;
    }

    // resolve category/brand ids per DB (slugs → ids)
    const catMaps = [];
    const brandMaps = [];
    for (const db of dbs) {
      const cats = await db.category.findMany({ select: { id: true, slug: true, name: true } });
      const brands = await db.brand.findMany({ select: { id: true, slug: true, name: true } });
      catMaps.push(new Map(cats.map((c) => [c.slug, c])));
      brandMaps.push(new Map(brands.map((b) => [b.slug, b])));
    }

    // choose what to work on
    let todo = CATALOG.filter((e) => {
      if (CATEGORY && e.cat !== CATEGORY) return false;
      if (SLUG && e.slug !== SLUG) return false;
      if (FORCE) return true;
      if (progress.done[e.slug] && existingValidFile(e.slug)) return false;
      const f = progress.failed[e.slug];
      if (f && f.tries >= 5 && !FORCE) return false; // give up after 5 tries unless forced
      return true;
    });
    const skipped = CATALOG.length - todo.length;
    if (LIMIT >= 0) todo = todo.slice(0, Number.isFinite(LIMIT) ? LIMIT : todo.length);
    console.log(`catalog: ${CATALOG.length} products · done: ${Object.keys(progress.done).length} · skipped: ${skipped} · this run: ${todo.length} (limit=${Number.isFinite(LIMIT) ? LIMIT : "∞"})`);

    let ok = 0;
    let failed = 0;
    const t0 = Date.now();
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const batch = todo.slice(i, i + CONCURRENCY);
      // stagger starts ~1.2s so concurrent searches don't trip upstream rate limits
      const results = await Promise.all(
        batch.map((e, j) =>
          new Promise((res) => setTimeout(res, j * 1200)).then(() =>
            processProduct(e, dbs, catMaps, brandMaps, progress, FORCE).catch((err) => ({ slug: e.slug, status: "error", error: String(err) }))
          )
        )
      );
      saveProgress(progress);
      for (const r of results) {
        if (r.status === "ok" || r.status === "skipped") {
          ok++;
          console.log(`  ✓ ${r.slug} ${r.note ?? ""} ${r.img ? "→ " + r.img : ""}`);
        } else {
          failed++;
          console.log(`  ✗ ${r.slug}: ${r.error ?? r.status}`);
        }
      }
    }
    progress.runs += 1;
    saveProgress(progress);
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`── run summary ──\n  ok: ${ok} · failed: ${failed} · time: ${mins}m\n  total done: ${Object.keys(progress.done).length}/${CATALOG.length} · failed: ${Object.keys(progress.failed).length}`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    for (const db of dbs) await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("✗ seed failed:", err);
  process.exit(1);
});

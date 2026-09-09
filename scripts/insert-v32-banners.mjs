#!/usr/bin/env bun
/* ═══════════════════════════════════════════════════════════════════
 *  TAJ Electronics — v32 banner wiring (Task 14-c-1, run by main):
 *  point the 3 global Slider rows at the NEW v32 hero banners and add
 *  2 PromotionalShowcase rows — in BOTH databases (db/custom.db dev +
 *  db/catalog-seed.db fresh-install). Idempotent: rows already pointing
 *  at a v32 banner are left alone.
 *
 *  RUN: bun scripts/insert-v32-banners.mjs
 * ═══════════════════════════════════════════════════════════════════ */
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(import.meta.dirname, "..");
const DB_FILES = ["db/custom.db", "db/catalog-seed.db"];

const SLIDERS = [
  {
    match: "phone",
    desktopImage: "/images/sliders/v32-phone.jpg",
    title: "پرچمداران آینده، امروز در تاج",
    subtitle: "جدیدترین گوشی‌های پرچمدار با گارانتی رسمی و ارسال فوری",
    buttonText: "مشاهدهٔ گوشی‌ها",
    buttonUrl: "/products",
    badge: "جدید",
  },
  {
    match: "laptop",
    desktopImage: "/images/sliders/v32-laptop.jpg",
    title: "قدرت در دستان شما",
    subtitle: "لپ‌تاپ‌های حرفه‌ای برای کار، خلق محتوا و بازی",
    buttonText: "مشاهدهٔ لپ‌تاپ‌ها",
    buttonUrl: "/products",
    badge: "پیشنهاد ویژه",
  },
  {
    match: "gaming",
    desktopImage: "/images/sliders/v32-gaming.jpg",
    title: "دنیای گیمینگ در تاج",
    subtitle: "ریگ، لوازم ARGB و تجهیزات حرفه‌ای گیمرها",
    buttonText: "ورود به منطقهٔ گیمینگ",
    buttonUrl: "/products",
    badge: "RGB",
  },
];

const SHOWCASES = [
  {
    image: "/images/sliders/v32-audio.jpg",
    title: "صدا، مثل هیچ‌وقت",
    subtitle: "هدفون‌ها و اسپیکرهای بی‌سیم پریمیوم",
    buttonText: "شنیدن",
    buttonUrl: "/products",
    badge: "صوتی",
    sortOrder: 90,
  },
  {
    image: "/images/sliders/v32-fest.jpg",
    title: "جشنوارهٔ طلایی تاج",
    subtitle: "لوازم جانبی هوشمند با قیمت‌های استثنایی",
    buttonText: "مشاهده",
    buttonUrl: "/products",
    badge: "تخفیف",
    sortOrder: 91,
  },
];

for (const rel of DB_FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`skip ${rel} (missing)`); continue; }
  const db = new PrismaClient({ datasources: { db: { url: `file:${file}` } } });
  try {
    /* sliders: keep row identity, refresh content */
    const rows = await db.slider.findMany({ orderBy: { sortOrder: "asc" } });
    for (let i = 0; i < Math.min(SLIDERS.length, rows.length); i++) {
      const row = rows[i];
      const cfg = SLIDERS[i];
      if (row.desktopImage?.includes("/v32-")) { console.log(`  = slider already v32: ${row.title}`); continue; }
      await db.slider.update({
        where: { id: row.id },
        data: {
          desktopImage: cfg.desktopImage,
          mobileImage: cfg.desktopImage,
          title: cfg.title,
          subtitle: cfg.subtitle,
          buttonText: cfg.buttonText,
          buttonUrl: cfg.buttonUrl,
          badge: cfg.badge,
          isActive: true,
        },
      });
      console.log(`  ✓ slider → ${cfg.desktopImage} (${cfg.title})`);
    }
    /* showcases: upsert by image path */
    for (const cfg of SHOWCASES) {
      const exists = await db.promotionalShowcase.findFirst({ where: { image: cfg.image } });
      if (exists) { console.log(`  = showcase exists: ${cfg.title}`); continue; }
      await db.promotionalShowcase.create({ data: cfg });
      console.log(`  ✓ showcase → ${cfg.image} (${cfg.title})`);
    }
    console.log(`${rel}: sliders=${await db.slider.count()} showcases=${await db.promotionalShowcase.count()}`);
  } finally {
    await db.$disconnect();
  }
}
console.log("done.");

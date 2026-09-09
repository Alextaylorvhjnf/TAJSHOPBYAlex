#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
 *  TAJ Electronics — Demo data seeder for the admin dashboard (v32,
 *  Task 13-b). Fills an EMPTY analytics store with REAL-looking rows
 *  so the redesigned dashboard's charts render live data:
 *
 *    • ~40 Persian-named demo CUSTOMERS (email …@demo.taj.ir — the
 *      idempotency marker; phones unique 09xx, sentinel passwordHash
 *      so none of them can ever log in)
 *    • ~120 orders spread over the LAST 60 DAYS, each referencing
 *      EXISTING products only, realistic totals between ۲,۰۰۰,۰۰۰ and
 *      ۴۵,۰۰۰,۰۰۰ تومان, statuses PAID/PENDING/PROCESSING/SHIPPED/
 *      CANCELLED weighted toward paid (+ VERIFIED ZARINPAL payment rows
 *      for every paid order)
 *
 *  NEVER touches: admin users, products, settings, reviews, messages.
 *  Idempotent: skips instantly when the @demo.taj.ir marker exists.
 *
 *  RUN (bun):
 *    bun scripts/seed-demo-data.mjs
 *        → the dev DB (DATABASE_URL from env or .env → db/custom.db)
 *    bun scripts/seed-demo-data.mjs --db db/catalog-seed.db
 *        → the fresh-install seed DB (Docker first-boot catalog)
 *
 *  Deterministic: a fixed PRNG seed, so two fresh databases seeded on
 *  different days produce the same shape of data (dates are relative
 *  to “now”, so charts always cover the last 60 days).
 * ═══════════════════════════════════════════════════════════════════ */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(import.meta.dirname, "..");

/* ── resolve the target database (explicit --db → env → .env → dev) ── */
function resolveDbUrl(explicit) {
  if (explicit) {
    const p = path.isAbsolute(explicit) ? explicit : path.join(ROOT, explicit);
    return "file:" + p;
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return "file:" + path.join(ROOT, "db", "custom.db");
}

const args = process.argv.slice(2);
let dbFlag = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--db" && args[i + 1]) {
    dbFlag = args[i + 1];
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log("usage: bun scripts/seed-demo-data.mjs [--db <path-to-sqlite>]");
    process.exit(0);
  }
}

const dbUrl = resolveDbUrl(dbFlag);
const dbFile = dbUrl.replace(/^file:/, "");
if (!fs.existsSync(dbFile)) {
  console.error(`✗ database file not found: ${dbFile}`);
  console.error("  (run `prisma db push` first, or pass --db with the correct path)");
  process.exit(1);
}

console.log(`▸ target database: ${dbFile}`);

const db = new PrismaClient({ datasourceUrl: dbUrl, log: [] });

/* ── deterministic PRNG (mulberry32) + helpers ─────────────────────── */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260413);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

/* ── Persian demo data pools ───────────────────────────────────────── */
const FIRST_NAMES = [
  "علی", "محمد", "رضا", "حسین", "امیر", "مهدی", "سینا", "آرش", "بهنام", "کامران",
  "فرهاد", "نیما", "پویا", "کاوه", "سعید", "مسعود", "وحید", "بابک", "شهاب", "میلاد",
  "سارا", "فاطمه", "زهرا", "مریم", "نگار", "الهام", "شیوا", "پریسا", "نیلوفر", "سمانه",
  "هانیه", "مینا", "لیلا", "آیدا", "ترانه", "رویا", "بهاره", "یاسمن", "محسن", "یاسر",
];
const LAST_NAMES = [
  "محمدی", "احمدی", "رضایی", "حسینی", "کریمی", "موسوی", "صادقی", "جعفری", "نوری", "قاسمی",
  "شریفی", "اکبری", "سلطانی", "مرادی", "فراهانی", "تهرانی", "مشهدی", "اصفهانی", "شیرازی", "تبریزی",
  "رشتی", "اهوازی", "یزدی", "قمی", "بهرامی", "خسروی", "امینی", "سعیدی", "کاظمی", "هاشمی",
  "رحیمی", "توکلی", "زارعی", "ملکی", "رستمی", "پارسا", "کیانی", "افشار", "دادگر", "شهابی",
];
const PROVINCES = [
  ["تهران", "تهران"], ["خراسان رضوی", "مشهد"], ["اصفهان", "اصفهان"], ["فارس", "شیراز"],
  ["آذربایجان شرقی", "تبریز"], ["البرز", "کرج"], ["گیلان", "رشت"], ["خوزستان", "اهواز"],
  ["یزد", "یزد"], ["قم", "قم"], ["کرمان", "کرمان"], ["مازندران", "ساری"],
];
const STREETS = [
  "خیابان ولیعصر", "خیابان آزادی", "خیابان انقلاب", "بلوار فردوس", "خیابان شریعتی",
  "بلوار امیرکبیر", "خیابان کارگر شمالی", "بلوار کشاورز", "خیابان کریمخان زند",
  "بلوار مدرس", "خیابان شاه‌بزرگ", "بلوار ولایت",
];
const PHONE_PREFIXES = ["0912", "0913", "0915", "0916", "0919", "0935", "0936", "0937", "0939", "0901", "0902", "0930"];
const DELIVERY = [
  { name: "پست پیشتاز", type: "POST", eta: "۳ تا ۵ روز کاری" },
  { name: "تیپاکس", type: "EXPRESS", eta: "۲ تا ۳ روز کاری" },
  { name: "پیک موتوری (تهران)", type: "BIKE", eta: "همان روز" },
];

const MIN_TOTAL = 2_000_000; // ۲,۰۰۰,۰۰۰ تومان
const MAX_TOTAL = 45_000_000; // ۴۵,۰۰۰,۰۰۰ تومان
const CUSTOMER_COUNT = 40;
const ORDER_COUNT = 120;
const DAYS_WINDOW = 60;

/** the app's own order-number format: TAJ-<base36 ts>-<4 random chars> */
function orderNumber(ts, i) {
  const rnd = (i * 7919 + Math.floor(rand() * 1_000_000)).toString(36).slice(0, 4).toUpperCase();
  return `TAJ-${ts.toString(36).toUpperCase()}-${rnd}`;
}

/** weighted toward PAID (55%) — PENDING 10% / PROCESSING 15% / SHIPPED 15% / CANCELLED 5% */
function pickStatus() {
  const r = rand();
  if (r < 0.55) return { status: "PAID", paymentStatus: "PAID" };
  if (r < 0.7) return { status: "PROCESSING", paymentStatus: "PAID" };
  if (r < 0.85) return { status: "SHIPPED", paymentStatus: "PAID" };
  if (r < 0.95) return { status: "PENDING_PAYMENT", paymentStatus: "UNPAID" };
  return { status: "CANCELLED", paymentStatus: "UNPAID" };
}

/** parses a product's legacy colors JSON for a realistic color name */
function pickColorName(raw) {
  if (!raw) return null;
  try {
    const colors = JSON.parse(raw);
    if (Array.isArray(colors) && colors.length > 0) {
      const c = pick(colors);
      return typeof c?.name === "string" ? c.name : null;
    }
  } catch {
    /* not JSON — ignore */
  }
  return null;
}

/* ── build a basket of 1–3 EXISTING products within the total range ── */
function buildBasket(products) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const n = randInt(1, Math.min(3, products.length));
    const used = new Set();
    const chosen = [];
    while (chosen.length < n) {
      const p = pick(products);
      if (used.has(p.id)) continue;
      used.add(p.id);
      chosen.push({ p, qty: randInt(1, 2) });
    }
    const subtotal = chosen.reduce((s, it) => s + (it.p.discountPrice ?? it.p.price) * it.qty, 0);
    if (subtotal >= MIN_TOTAL && subtotal <= MAX_TOTAL) return chosen;
  }
  // fallback: the single product whose unit price is closest to the
  // middle of the realistic band (qty 1) — still a real existing product
  const target = (MIN_TOTAL + MAX_TOTAL) / 2;
  const closest = [...products].sort(
    (a, b) => Math.abs((a.discountPrice ?? a.price) - target) - Math.abs((b.discountPrice ?? b.price) - target)
  )[0];
  return [{ p: closest, qty: 1 }];
}

async function main() {
  /* ── idempotency: the @demo.taj.ir marker ── */
  const marker = await db.user.count({ where: { email: { endsWith: "@demo.taj.ir" } } });
  if (marker > 0) {
    console.log(`✓ demo data already seeded (${marker} marker users) — nothing to do.`);
    return;
  }

  const products = await db.product.findMany({
    select: { id: true, name: true, sku: true, price: true, discountPrice: true, mainImage: true, colors: true },
  });
  if (products.length === 0) {
    console.error("✗ no products found — seed the catalog first (this script only references EXISTING products).");
    process.exitCode = 1;
    return;
  }

  const existingNumbers = new Set(
    (await db.order.findMany({ select: { orderNumber: true } })).map((o) => o.orderNumber)
  );

  /* ── 1 · demo customers (role CUSTOMER, sentinel hash, last 60 days) ── */
  const now = Date.now();
  const customers = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];
    const daysAgo = randInt(0, DAYS_WINDOW - 1);
    const createdAt = new Date(now - daysAgo * 86_400_000 - randInt(0, 86_399) * 1000);
    const user = await db.user.create({
      data: {
        email: `customer${String(i + 1).padStart(3, "0")}@demo.taj.ir`,
        phone: `${PHONE_PREFIXES[i % PHONE_PREFIXES.length]}${String(1_000_000 + i * 8237).slice(0, 7)}`,
        // sentinel hash — bcrypt never matches, so demo customers can't log in
        passwordHash: "demo-no-login",
        firstName: first,
        lastName: last,
        role: "CUSTOMER",
        createdAt,
        updatedAt: createdAt,
      },
    });
    customers.push({ user, createdAt });
  }
  console.log(`✓ created ${customers.length} demo customers (marker @demo.taj.ir)`);

  /* ── 2 · ~120 orders over the last 60 days (existing products only) ── */
  let paid = 0;
  let payments = 0;
  const tsBase = Date.now();
  for (let i = 0; i < ORDER_COUNT; i++) {
    const { user, createdAt } = pick(customers);
    // slight recency bias so recent days look naturally busier
    const daysAgo = Math.floor(Math.pow(rand(), 1.2) * DAYS_WINDOW);
    const placedAt = new Date(now - daysAgo * 86_400_000 - randInt(0, 86_399) * 1000);
    const basket = buildBasket(products);
    const subtotal = basket.reduce((s, it) => s + (it.p.discountPrice ?? it.p.price) * it.qty, 0);
    const shipping = rand() < 0.3 ? 0 : 60_000;
    const total = subtotal + shipping;
    const { status, paymentStatus } = pickStatus();
    const [province, city] = pick(PROVINCES);
    const delivery = pick(DELIVERY);

    let number = orderNumber(tsBase + i, i);
    while (existingNumbers.has(number)) number = orderNumber(tsBase + i * 31 + 7, i);
    existingNumbers.add(number);

    const order = await db.order.create({
      data: {
        orderNumber: number,
        userId: user.id,
        status,
        paymentStatus,
        paymentMethod: "ZARINPAL",
        subtotal,
        discount: 0,
        shippingCost: shipping,
        tax: 0,
        total,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        province,
        city,
        address: `${city}، ${pick(STREETS)}، پلاک ${randInt(1, 120)}، واحد ${randInt(1, 12)}`,
        postalCode: String(randInt(1_000_000_000, 9_999_999_999)),
        note: rand() < 0.25 ? pick([
          "لطفاً قبل از ارسال تماس بگیرید.",
          "تحویل به نگهبانی ساختمان، لطفاً بسته‌بندی ضد ضربه.",
          "در صورت موجود نبودن رنگ مشکی، سفید قابل قبول است.",
          "لطفاً فاکتور رسمی همراه سفارش ارسال شود.",
        ]) : null,
        deliveryMethodName: delivery.name,
        deliveryType: delivery.type,
        deliveryEta: delivery.eta,
        createdAt: placedAt,
        updatedAt: placedAt,
        items: {
          create: basket.map(({ p, qty }) => ({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            image: p.mainImage,
            unitPrice: p.discountPrice ?? p.price,
            discount: 0,
            quantity: qty,
            color: pickColorName(p.colors),
            total: (p.discountPrice ?? p.price) * qty,
          })),
        },
      },
    });

    if (paymentStatus === "PAID") {
      paid++;
      await db.payment.create({
        data: {
          orderId: order.id,
          gateway: "ZARINPAL",
          amount: total * 10, // Rials sent to the gateway
          refId: String(randInt(100_000_000, 999_999_999)),
          status: "VERIFIED",
          createdAt: placedAt,
          updatedAt: placedAt,
        },
      });
      payments++;
    }
  }
  console.log(
    `✓ created ${ORDER_COUNT} orders over the last ${DAYS_WINDOW} days ` +
      `(${paid} paid — weighted toward PAID) + ${payments} VERIFIED gateway payments`
  );

  /* ── 3 · verification summary (Prisma queries) ── */
  const [demoUsers, totalOrders, orders60, paidOrders, verified, minTotal, maxTotal] = await Promise.all([
    db.user.count({ where: { email: { endsWith: "@demo.taj.ir" } } }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: new Date(now - DAYS_WINDOW * 86_400_000) } } }),
    db.order.count({ where: { paymentStatus: "PAID" } }),
    db.payment.count({ where: { status: "VERIFIED" } }),
    db.order.aggregate({ _min: { total: true } }),
    db.order.aggregate({ _max: { total: true } }),
  ]);
  console.log("── verification ──");
  console.log(`  demo customers: ${demoUsers}`);
  console.log(`  orders total: ${totalOrders} (last ${DAYS_WINDOW} days: ${orders60})`);
  console.log(`  paid orders: ${paidOrders} · verified payments: ${verified}`);
  console.log(
    `  order totals: min ${(minTotal._min.total ?? 0).toLocaleString("fa-IR")} — max ${(maxTotal._max.total ?? 0).toLocaleString("fa-IR")} تومان`
  );
}

main()
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

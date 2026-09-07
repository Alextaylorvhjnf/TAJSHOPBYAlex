/**
 * v20 demo seeding — DEV DB ONLY (db/custom.db via .env DATABASE_URL).
 * Run: bun scripts/demo-combinations.ts
 *
 * Marks «گوشی موبایل سامسونگ Galaxy A55» as a VARIABLE product:
 * 2 colors × 2 spec variants with per-combination absolute prices
 * (the exact pattern the owner asked for: "قیمت رنگ و مشخصه در یک فیلد") —
 * including one stock-0 row so the «ناموجود» chip/ceiling can be E2E'd.
 * Does NOT touch db/catalog-seed.db.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const A55_SLUG = "samsung-galaxy-a55-128gb";

const COLORS = [
  { name: "آبی یخی", hex: "#B5D1E8" },
  { name: "مشکی", hex: "#26262A" },
];

const VARIANTS = [
  { name: "۸ گیگابایت رم / ۱۲۸ گیگابایت", priceDelta: 0, stock: 8 },
  { name: "۱۲ گیگابایت رم / ۲۵۶ گیگابایت", priceDelta: 0, stock: 8 },
];

/** per color × spec combination — the EXACT absolute price (Toman) */
const COMBINATIONS = [
  { color: "آبی یخی", variant: "۸ گیگابایت رم / ۱۲۸ گیگابایت", price: 21_900_000, stock: 5 },
  { color: "آبی یخی", variant: "۱۲ گیگابایت رم / ۲۵۶ گیگابایت", price: 24_900_000, stock: 0 },
  { color: "مشکی", variant: "۸ گیگابایت رم / ۱۲۸ گیگابایت", price: 20_900_000, stock: 3 },
  { color: "مشکی", variant: "۱۲ گیگابایت رم / ۲۵۶ گیگابایت", price: 23_900_000, stock: 7 },
];

async function main() {
  const product = await db.product.findUnique({ where: { slug: A55_SLUG } });
  if (!product) throw new Error(`demo product not found: ${A55_SLUG}`);

  await db.product.update({
    where: { id: product.id },
    data: {
      productType: "VARIABLE",
      colors: JSON.stringify(COLORS),
      variants: JSON.stringify(VARIANTS),
      combinations: JSON.stringify(COMBINATIONS),
    },
  });

  console.log(`✓ VARIABLE demo seeded → ${product.name} (${product.id})`);
  console.log("  colors: 2 | variants: 2 | combinations: 4 (one stock=0 → «ناموجود»)");
  console.log("  prices: 20,900,000 … 24,900,000 Toman per color × spec");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

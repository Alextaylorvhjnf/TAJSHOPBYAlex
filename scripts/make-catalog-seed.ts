/**
 * TAJ Electronics — Catalog Seed Database Builder  (v12)
 *
 * Run (dev machine only, NOT inside Docker):
 *   bun scripts/make-catalog-seed.ts
 *
 * Produces db/catalog-seed.db — a PRISTINE copy of the dev database that
 * contains ONLY public catalog/branding data:
 *
 *   KEPT     Category, Brand, Product, ProductImage, Slider, Story,
 *            PromotionalShowcase, CmsPage, FooterLink, Coupon,
 *            StoreSettings, ThemeSettings, PaymentSettings, AiSettings
 *   REMOVED  User, Session, PasswordResetToken, Address, Cart, CartItem,
 *            WishlistItem, Order, OrderItem, Payment, CardToCardPayment,
 *            Review, Notification, AdminLog, CustomerMessage,
 *            InstallationState, SmtpSettings
 *
 * Why: the Docker image ships this file at /app/db-seed/catalog.db and the
 * container entrypoint copies it into the EMPTY taj_db volume on first boot
 * (docker-entrypoint.sh). Removing InstallationState + all users keeps the
 * /install web wizard fully functional (it creates the real admin account),
 * while the store already has demo catalog data. All user/private data is
 * stripped, so nothing sensitive ever ships inside the image.
 *
 * The script is deterministic and safe to re-run; it also audits every local
 * `/uploads/...` image referenced by the kept tables and fails loudly if a
 * file is missing from public/ (those files must be baked into the image).
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, statSync, unlinkSync, copyFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "db", "custom.db");
const TARGET = path.join(ROOT, "db", "catalog-seed.db");

if (!existsSync(SOURCE)) {
  console.error(`make-catalog-seed: source database not found at ${SOURCE}`);
  process.exit(1);
}

// ── 1. clean snapshot of the dev db (SQLite online backup) ──
if (existsSync(TARGET)) unlinkSync(TARGET);
for (const ext of ["-journal", "-wal", "-shm"]) {
  const p = TARGET + ext;
  if (existsSync(p)) unlinkSync(p);
}

const src = new PrismaClient({ log: [] });
await src.$executeRawUnsafe(`VACUUM INTO '${TARGET.replaceAll("'", "''")}'`);
await src.$disconnect();
console.log(`✓ snapshot: ${SOURCE} → ${TARGET} (${statSync(TARGET).size} bytes)`);

// ── 2. prune everything private from the snapshot ──
process.env.DATABASE_URL = `file:${TARGET}`;
const db = new PrismaClient({ log: [] });

const removed: [string, number][] = [];
const wipe = async (name: keyof typeof db, label: string) => {
  // @ts-expect-error dynamic model access
  const n = await db[name].deleteMany();
  removed.push([label, n.count]);
};

// children first (FK-safe order)
await wipe("supportTicketMessage", "SupportTicketMessage"); // v14.1 ticketing — private user data
await wipe("supportTicket", "SupportTicket"); // v14.1 ticketing — private user data
await wipe("adminLog", "AdminLog");
await wipe("notification", "Notification");
await wipe("review", "Review");
await wipe("orderItem", "OrderItem");
await wipe("payment", "Payment");
await wipe("cardToCardPayment", "CardToCardPayment");
await wipe("order", "Order");
await wipe("cartItem", "CartItem");
await wipe("cart", "Cart");
await wipe("wishlistItem", "WishlistItem");
await wipe("address", "Address");
await wipe("passwordResetToken", "PasswordResetToken");
await wipe("session", "Session");
await wipe("user", "User");
await wipe("customerMessage", "CustomerMessage");
await wipe("installationState", "InstallationState");
await wipe("smtpSettings", "SmtpSettings"); // never ship (contains password field)

// v28: hygiene — AiSettings keys NEVER ship in the zip (gapgpt + legacy
// openai/gemini keys are all cleared, provider reset to the builtin engine;
// the installer's admin re-enters their own key through the settings UI)
await db.aiSettings.updateMany({
  data: { gapApiKey: null, openaiApiKey: null, geminiApiKey: null, provider: "builtin" },
});
console.log("✓ AiSettings keys cleared (gapgpt/openai/gemini)");

// ── 3. audit: every local image referenced by KEPT tables must exist in public/ ──
const localRefs = new Set<string>();
const addRef = (v: unknown) => {
  if (typeof v === "string" && v.startsWith("/uploads/")) localRefs.add(v);
};

const products = await db.product.findMany({ select: { mainImage: true } });
products.forEach((p) => addRef(p.mainImage));
const productImages = await db.productImage.findMany({ select: { url: true } });
productImages.forEach((p) => addRef(p.url));
const brands = await db.brand.findMany({ select: { logo: true } });
brands.forEach((b) => addRef(b.logo));
const sliders = await db.slider.findMany({ select: { desktopImage: true, mobileImage: true } });
sliders.forEach((s) => {
  addRef(s.desktopImage);
  addRef(s.mobileImage);
});
const stories = await db.story.findMany({ select: { image: true, videoUrl: true } });
stories.forEach((s) => {
  addRef(s.image);
  addRef(s.videoUrl);
});
const showcases = await db.promotionalShowcase.findMany({ select: { image: true } });
showcases.forEach((s) => addRef(s.image));
const settings = await db.storeSettings.findUnique({ where: { id: "main" } });
if (settings) {
  addRef(settings.logo);
  addRef(settings.footerLogo);
  addRef(settings.favicon);
}

const missing: string[] = [];
for (const ref of localRefs) {
  const file = path.join(ROOT, "public", ref.replace(/^\//, ""));
  if (!existsSync(file)) missing.push(`${ref}  (expected ${file})`);
}

// ── 4. report ──
const count = async (name: keyof typeof db) =>
  // @ts-expect-error dynamic model access
  (await db[name].count()) as number;

console.log("── removed rows ──");
for (const [label, n] of removed) console.log(`  ${label.padEnd(22)} ${n}`);
console.log("── kept catalog ──");
console.log(`  products          ${(await count("product")).toString().padStart(4)}`);
console.log(`  productImages     ${(await count("productImage")).toString().padStart(4)}`);
console.log(`  categories        ${(await count("category")).toString().padStart(4)}`);
console.log(`  brands            ${(await count("brand")).toString().padStart(4)}`);
console.log(`  sliders           ${(await count("slider")).toString().padStart(4)}`);
console.log(`  stories           ${(await count("story")).toString().padStart(4)}`);
const videoStories = await db.story.count({ where: { NOT: { videoUrl: null } } });
console.log(`  video stories     ${videoStories.toString().padStart(4)}`);
console.log(`  showcases         ${(await count("promotionalShowcase")).toString().padStart(4)}`);
console.log(`  cmsPages          ${(await count("cmsPage")).toString().padStart(4)}`);
console.log(`  footerLinks       ${(await count("footerLink")).toString().padStart(4)}`);
console.log(`  coupons           ${(await count("coupon")).toString().padStart(4)}`);
console.log(`  users (must be 0) ${(await count("user")).toString().padStart(4)}`);
console.log(
  `  installState rows ${(await count("installationState")).toString().padStart(4)} (must be 0 → /install wizard stays usable)`
);
console.log(`  local image refs  ${localRefs.size} (all must exist in public/)`);

if (missing.length > 0) {
  console.error("\n✗ MISSING local image files referenced by the catalog seed:");
  for (const m of missing) console.error(`  - ${m}`);
  console.error("  → add the files to public/uploads/... (they must be baked into the Docker image)");
  await db.$disconnect();
  process.exit(1);
}

// final shrink
await db.$executeRawUnsafe("VACUUM");
await db.$disconnect();
console.log(`\n✓ catalog seed ready: ${TARGET} (${statSync(TARGET).size} bytes)`);

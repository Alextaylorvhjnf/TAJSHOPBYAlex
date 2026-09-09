#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
 *  TAJ Electronics — v33 (Task 2-d) slider-link fixer.
 *
 *  The seeded Slider rows shipped with a BARE "/products" buttonUrl, so
 *  buttons like «مشاهدهٔ گوشی‌ها» / «ورود به منطقهٔ گیمینگ» dumped EVERY
 *  product on the shopper. This script rewrites those rows to a FILTERED
 *  /products URL, using a minimal 3-rule keyword resolver (a faithful
 *  inlined subset of src/lib/templates/slide-targets.ts — mjs cannot
 *  import the TS module):
 *
 *      گوشی | موبایل      → /products?category=mobile
 *      لپ‌تاپ (ZWNJ/…)     → /products?category=laptop
 *      گیمینگ              → /products?q=گیمینگ
 *
 *  matched on title + buttonText (Persian-normalized: ي→ی, ك→ک, Arabic
 *  diacritics/ZWNJ/ZWSP stripped, lowercase).
 *
 *  A slider's buttonUrl is rewritten ONLY when it is currently null or
 *  exactly "/products" — an admin's specific link is NEVER touched.
 *  Idempotent: a second run changes nothing (the bare "/products" values
 *  are gone).
 *
 *  RUN (node):
 *    node scripts/fix-slider-links-v33.mjs            → dev DB (DATABASE_URL → .env → db/custom.db)
 *    node scripts/fix-slider-links-v33.mjs --db db/catalog-seed.db
 *    node scripts/fix-slider-links-v33.mjs --verify   → read-only dump of slider rows
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
let verifyOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--db" && args[i + 1]) {
    dbFlag = args[i + 1];
    i++;
  } else if (args[i] === "--verify") {
    verifyOnly = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log("usage: node scripts/fix-slider-links-v33.mjs [--db <path-to-sqlite>] [--verify]");
    process.exit(0);
  }
}

const dbUrl = resolveDbUrl(dbFlag);
const dbFile = dbUrl.replace(/^file:/, "");
if (!fs.existsSync(dbFile)) {
  console.error(`✗ database file not found: ${dbFile}`);
  process.exit(1);
}

console.log(`▸ target database: ${dbFile}${verifyOnly ? " (verify only)" : ""}`);

const db = new PrismaClient({ datasourceUrl: dbUrl, log: [] });

/* ── minimal Persian normalization (same idea as slide-targets.ts) ── */
function normalizeFa(s) {
  return String(s ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u0652\u0654\u0670\u0640\u200C\u200B]/g, "")
    .toLowerCase();
}

/* ── the 3-rule resolver (title + buttonText haystack) ── */
function resolveMinimal({ title, buttonText }) {
  const hay = normalizeFa(`${buttonText ?? ""} ${title ?? ""}`);
  if (!hay.trim()) return null;
  if (/(گوشی|موبایل)/.test(hay)) return "/products?category=mobile";
  if (/(لپتاپ|لپ تاپ)/.test(hay)) return "/products?category=laptop";
  if (/گیمینگ/.test(hay)) return "/products?q=گیمینگ";
  return null;
}

async function main() {
  const sliders = await db.slider.findMany({
    select: { id: true, title: true, subtitle: true, buttonText: true, buttonUrl: true, badge: true, isActive: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (verifyOnly) {
    console.log(`\n═══ ${sliders.length} slider row(s) ═══`);
    for (const s of sliders) {
      console.log(
        `  [${s.isActive ? "active" : "off "}] #${s.sortOrder} «${s.title}» button=«${s.buttonText ?? "—"}» → ${s.buttonUrl ?? "(null)"}` +
          (s.badge ? `  badge=«${s.badge}»` : ""),
      );
    }
    return;
  }

  let changed = 0;
  let skipped = 0;
  for (const s of sliders) {
    const current = s.buttonUrl == null ? null : s.buttonUrl.trim();
    const isGeneric = current === null || current === "" || current === "/products" || current === "/";
    if (!isGeneric) {
      skipped++;
      console.log(`  = keep   «${s.title}» → ${s.buttonUrl} (admin's explicit link)`);
      continue;
    }
    const target = resolveMinimal(s);
    if (!target) {
      skipped++;
      console.log(`  = keep   «${s.title}» → ${s.buttonUrl ?? "(null)"} (no keyword matched)`);
      continue;
    }
    await db.slider.update({ where: { id: s.id }, data: { buttonUrl: target } });
    changed++;
    console.log(`  ✓ fixed  «${s.title}» («${s.buttonText ?? "—"}»): ${s.buttonUrl ?? "(null)"} → ${target}`);
  }

  console.log(`\n done: ${changed} slider(s) fixed, ${skipped} untouched (of ${sliders.length})`);
  console.log(" verify with: node scripts/fix-slider-links-v33.mjs --verify" + (dbFlag ? ` --db ${dbFlag}` : ""));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

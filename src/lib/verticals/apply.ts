/**
 * v35 · «صنف فروشگاه» — CATALOG SWITCHER (server-only)
 * ------------------------------------------------------
 * Re-seeds the shop to a vertical's real catalog (src/lib/verticals/*):
 * the previous catalog is ARCHIVED (never deleted — orders/orderItems and
 * purchase history must survive) and the vertical's categories, brands and
 * products are upserted so switching BACK to a previous vertical reuses the
 * same rows instead of duplicating them.
 *
 * Everything runs inside ONE interactive transaction; StoreSettings
 * (activeVertical + the vertical's flagship activeTemplate, optionally the
 * suggested store names) is updated in the SAME transaction so the switch is
 * atomic. The CALLER (PUT /api/admin/vertical) handles cache invalidation +
 * revalidation — this module stays pure DB.
 */

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";
import { getVerticalDef, SUGGESTED_STORE_NAMES } from "@/lib/verticals";

/* Search-text normalization — same pipeline as scripts/seed.ts `norm`:
 * strip Arabic diacritics/tatweel, map Persian digits to ASCII, unify
 * Arabic/Persian letter variants, lowercase, collapse spaces. */
const norm = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[يﻲﻱ]/g, "ی")
    .replace(/[كﮐﮑ]/g, "ک")
    .replace(/[ۀہ]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const searchTextOf = (...parts: (string | null | undefined)[]) =>
  norm(parts.filter(Boolean).join(" "));

/** ASCII-safe slug — the product `key` is stable ASCII across all catalogs
 * (Persian/Arabic text can never leak into the URL); fall back to the sku
 * when a catalog entry ships an empty/non-ASCII key. */
const slugOfKey = (key: string, sku: string) => {
  const kebab = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return kebab(key) || kebab(sku) || "p";
};

/** short description = first sentence of the marketing description, or the
 * description trimmed to ~90 chars when it has no clean sentence break. */
const shortDescOf = (desc?: string | null): string | null => {
  if (!desc) return null;
  const sentence = desc.split(/[.!?؟\n]/)[0]?.trim() ?? "";
  if (sentence.length >= 12) return sentence.slice(0, 200);
  return desc.trim().slice(0, 90) || null;
};

/** Product images list: [mainImage, ...gallery] capped at 4 — the same list
 * shape on create and on gallery re-sync (mirrors scripts/seed.ts). */
const imageList = (image: string | null | undefined, gallery: string[] | undefined): string[] =>
  [image ?? null, ...(gallery ?? [])]
    .filter((u): u is string => typeof u === "string" && u.length > 0)
    .slice(0, 4);

/* v35: a product MAY reference a brand that is not pre-declared in its
 * catalog's brands list (the gaming catalog's CPUs name «اینتل»/«ای ام دی»
 * without declaring them). Rather than failing the switch, the missing brand
 * row is created on the fly with a deterministic ASCII slug — a tiny alias
 * table for the known Persian names, then any Latin fragment of the name,
 * then a stable hash so re-switches upsert the SAME row. */
const BRAND_SLUG_ALIASES: Record<string, string> = {
  "اینتل": "intel",
  "ای ام دی": "amd",
};

const brandSlugOf = (name: string): string => {
  const trimmed = name.trim();
  const alias = BRAND_SLUG_ALIASES[trimmed];
  if (alias) return alias;
  const latin = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (latin) return latin;
  let h = 5381;
  for (let i = 0; i < trimmed.length; i++) h = ((h << 5) + h + trimmed.charCodeAt(i)) >>> 0;
  return `brand-${h.toString(36)}`;
};

/**
 * Apply a store vertical: archive the previous catalog, upsert the vertical's
 * categories/brands/products (idempotent — re-switching a vertical refreshes
 * the same rows) and point StoreSettings at the vertical + its flagship
 * template. `opts.renameStore` also switches storeName/storeNameEn to the
 * vertical's suggested brand names.
 *
 * Returns the catalog counts ({ products, categories, brands }) for the
 * admin log/response.
 */
export async function applyVerticalCatalog(
  verticalId: string,
  opts?: { renameStore?: boolean }
): Promise<{ products: number; categories: number; brands: number }> {
  const def = getVerticalDef(verticalId);
  // guarantees the "main" StoreSettings row exists BEFORE the transaction
  // (the settings getter upserts it; inside the tx we can safely update).
  await getStoreSettings();

  // ~90 statements for the biggest catalog — well past the 5s interactive
  // default on a cold sqlite file, so give the transaction room to breathe.
  return db.$transaction(
    async (tx) => {
      /* ── (a) ARCHIVE the previous catalog (NEVER delete — order history) ──
       * Storefront queries filter status "PUBLISHED" + isActive, so archived
       * products / deactivated categories & brands simply vanish from the
       * shop while every order, review and admin list keeps its references. */
      await tx.product.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED", featured: false, isSpecial: false },
      });
      await tx.category.updateMany({ where: { isActive: true }, data: { isActive: false } });
      await tx.brand.updateMany({ where: { isActive: true }, data: { isActive: false } });

      /* ── (b) UPSERT this vertical's entities (re-switch reuses rows) ── */

      // categories — upsert by slug
      const catIds = new Map<string, string>();
      for (const [i, c] of def.categories.entries()) {
        const row = await tx.category.upsert({
          where: { slug: c.slug },
          create: {
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            description: c.description ?? null,
            sortOrder: c.sortOrder ?? i + 1,
            isActive: true,
          },
          update: {
            name: c.name,
            icon: c.icon,
            description: c.description ?? null,
            sortOrder: c.sortOrder ?? i + 1,
            isActive: true,
          },
        });
        catIds.set(c.slug, row.id);
      }

      // brands — upsert by slug
      const brandIds = new Map<string, string>();
      for (const b of def.brands) {
        const row = await tx.brand.upsert({
          where: { slug: b.slug },
          create: { name: b.name, slug: b.slug, isActive: true },
          update: { name: b.name, isActive: true },
        });
        brandIds.set(b.name, row.id);
      }

      // products — upsert by sku (unique). Products of THIS vertical were
      // archived in (a); the upsert flips them back to PUBLISHED with fresh
      // data, so a re-switch is fully idempotent.
      const usedSlugs = new Set<string>();
      for (const p of def.products) {
        const categoryId = catIds.get(p.categorySlug);
        if (!categoryId) {
          throw new Error(`vertical "${def.id}": product ${p.sku} references unknown category "${p.categorySlug}"`);
        }
        // undeclared brand → create it on the fly (see BRAND_SLUG_ALIASES)
        let brandId = brandIds.get(p.brandName);
        if (!brandId) {
          const bSlug = brandSlugOf(p.brandName);
          const row = await tx.brand.upsert({
            where: { slug: bSlug },
            create: { name: p.brandName, slug: bSlug, isActive: true },
            update: { name: p.brandName, isActive: true },
          });
          brandId = row.id;
          brandIds.set(p.brandName, row.id);
        }

        const slug = await uniqueSlug(tx, slugOfKey(p.key, p.sku), p.sku, usedSlugs);
        const gallery = imageList(p.image, p.gallery);
        const specs = p.specs?.length
          ? JSON.stringify(p.specs.map((s) => ({ key: s.key, label: s.key, value: s.value })))
          : null;
        const data = {
          name: p.name,
          slug,
          sku: p.sku,
          shortDescription: shortDescOf(p.description),
          description: p.description ?? null,
          price: p.price,
          discountPrice: p.discountPrice ?? null,
          // the catalog ships classic always-on discounts — clear any stale
          // flash-sale deadline / color set a previous vertical left behind
          discountEndsAt: null as Date | null,
          colors: null as string | null,
          stock: p.stock,
          categoryId,
          brandId,
          specifications: specs as string | null,
          mainImage: p.image ?? null,
          status: "PUBLISHED" as const,
          featured: !!p.featured,
          isSpecial: !!p.isSpecial,
          rating: p.rating ?? 0,
          reviewCount: p.reviewCount ?? 0,
          soldCount: p.soldCount ?? 0,
          searchText: searchTextOf(
            p.name,
            slug,
            p.sku,
            p.brandName,
            p.categorySlug,
            p.specs?.map((s) => s.value).join(" ")
          ),
          tags: null as string | null,
        };

        const existing = await tx.product.findUnique({ where: { sku: p.sku }, select: { id: true } });
        const row = await tx.product.upsert({
          where: { sku: p.sku },
          create: {
            ...data,
            images: {
              create: gallery.map((url, i) => ({ url, alt: p.name, sortOrder: i })),
            },
          },
          update: data,
        });

        // on EXISTING rows re-sync the gallery (deleteMany + createMany keeps
        // ProductImage fresh — a newly created row already got them above)
        if (existing) {
          await tx.productImage.deleteMany({ where: { productId: row.id } });
          if (gallery.length > 0) {
            await tx.productImage.createMany({
              data: gallery.map((url, i) => ({
                url,
                alt: p.name,
                sortOrder: i,
                productId: row.id,
              })),
            });
          }
        }
      }

      /* ── (c) StoreSettings — same transaction ── */
      const names = SUGGESTED_STORE_NAMES[def.id];
      await tx.storeSettings.update({
        where: { id: "main" },
        data: {
          activeVertical: def.id,
          activeTemplate: def.templateId,
          ...(opts?.renameStore && names
            ? { storeName: names.storeName, storeNameEn: names.storeNameEn }
            : {}),
        },
      });

      return {
        products: def.products.length,
        categories: def.categories.length,
        brands: def.brands.length,
      };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}

/**
 * Slug guard: an admin/demo product may already own the kebab slug with a
 * DIFFERENT sku (the product upsert key is sku, so the slug side needs its
 * own check). Deterministic -2/-3… suffixes keep slugs stable across
 * re-switches; `usedSlugs` covers rows assigned earlier in THIS run, the
 * findFirst covers older rows (reads inside the tx see this tx's writes).
 */
async function uniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
  sku: string,
  usedSlugs: Set<string>
): Promise<string> {
  for (let suffix = 0; suffix < 100; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (usedSlugs.has(candidate)) continue;
    const owner = await tx.product.findFirst({
      where: { slug: candidate, NOT: { sku } },
      select: { id: true },
    });
    if (!owner) {
      usedSlugs.add(candidate);
      return candidate;
    }
  }
  // unreachable in practice (100 collisions on one slug) — last-resort
  // unique fallback so the transaction can never deadlock on slugs
  return `${base}-${Date.now().toString(36)}`;
}

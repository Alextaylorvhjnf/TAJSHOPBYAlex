/**
 * v35 · «صنف فروشگاه» — VERTICAL REGISTRY (client-safe)
 * -------------------------------------------------------
 * Aggregates the five pure-data vertical catalogs into the ordered registry
 * every consumer uses (admin vertical picker, PUT /api/admin/vertical, the
 * AI persona prompt, the suggested store names on re-branding).
 *
 * This module imports ONLY the pure-data catalog files — no db, no server
 * APIs — so it is safe to import from client components.
 */

import { ELECTRONICS_CATALOG } from "./catalog-electronics";
import { FASHION_CATALOG } from "./catalog-fashion";
import { BEAUTY_CATALOG } from "./catalog-beauty";
import { GAMING_CATALOG } from "./catalog-gaming";
import { AUTOPARTS_CATALOG } from "./catalog-autoparts";
import type { VerticalDef } from "./types";

/** Ordered registry — electronics first (the default vertical). */
export const VERTICALS: VerticalDef[] = [
  ELECTRONICS_CATALOG,
  FASHION_CATALOG,
  BEAUTY_CATALOG,
  GAMING_CATALOG,
  AUTOPARTS_CATALOG,
];

export const VERTICAL_MAP: Record<string, VerticalDef> = Object.fromEntries(
  VERTICALS.map((v) => [v.id, v])
);

/**
 * Resolve a vertical by id (e.g. StoreSettings.activeVertical) — any unknown
 * / null / undefined value falls back to the electronics catalog so callers
 * never need their own guard.
 */
export function getVerticalDef(id: string | null | undefined): VerticalDef {
  return (id && VERTICAL_MAP[id]) || ELECTRONICS_CATALOG;
}

/**
 * Optional store re-branding names per vertical — applied when the admin
 * checks «تغییر نام فروشگاه» on the vertical switch (PUT /api/admin/vertical
 * with renameStore: true). Only the two name fields change; logo/SEO stay.
 */
export const SUGGESTED_STORE_NAMES: Record<string, { storeName: string; storeNameEn: string }> = {
  electronics: { storeName: "تاج الکترونیکس", storeNameEn: "TAJ Electronics" },
  fashion: { storeName: "تاج استایل", storeNameEn: "TAJ Style" },
  beauty: { storeName: "بیوتی گلو", storeNameEn: "Beauty Glow" },
  gaming: { storeName: "زنتری استور", storeNameEn: "Zentry Store" },
  autoparts: { storeName: "تاج پارتز", storeNameEn: "TAJ Parts" },
};

/** Admin-picker card summary of one vertical (counts from the catalog data,
 * no DB reads). `icon` carries the lucide icon NAME string. */
export interface VerticalSummary {
  id: string;
  nameFa: string;
  nameEn: string;
  taglineFa: string;
  descFa: string;
  icon: string;
  templateId: string;
  productCount: number;
  categoryCount: number;
  brandCount: number;
}

export function getVerticalSummaries(): VerticalSummary[] {
  return VERTICALS.map((v) => ({
    id: v.id,
    nameFa: v.nameFa,
    nameEn: v.nameEn,
    taglineFa: v.taglineFa,
    descFa: v.descFa,
    icon: v.icon,
    templateId: v.templateId,
    productCount: v.products.length,
    categoryCount: v.categories.length,
    brandCount: v.brands.length,
  }));
}

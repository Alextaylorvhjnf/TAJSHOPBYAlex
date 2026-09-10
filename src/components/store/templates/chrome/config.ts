/**
 * TEMPLATE CHROME — per-template configuration (v18 → v24)
 * --------------------------------------------------
 * PURE DATA (usable from server & client). Every non-default template
 * id maps to a bespoke { header, footer } pair. The 25 assignments are
 * unique combinations of layout variant × accent × features — matched to
 * each template's personality:
 *
 *  H1 bar · H2 float · H3 split-masthead · H4 side-edge · H5 center ·
 *  H6 app-bar · H7 ticket-stub · H8 mega-dense
 *  F1 mega · F2 center · F3 minimal · F4 band · F5 contact ·
 *  F6 columns · F7 magazine · F8 app-style
 *
 * v24 THEME-MATCHED CHROME: every header/footer now uses tint "theme" +
 * a `palette` that EXACTLY matches the template's own storefront canvas
 * (the same background/ink the template body paints) — so the chrome is
 * the same color as the theme, never a foreign bar. Admins can override
 * every color/toggle per template (StoreSettings.templateChrome) except
 * the permanent Alaruz Design credit.
 */

import type { ChromeAccent, ChromePalette, ChromeTint } from "./bits";

/* ══ v32 (task 5-e): MEGA MENU STYLES ════════════════════════════════
 * One of FIVE distinct category-menu presentations per template
 * (rendered by ./mega-menus.tsx) — no more single shared mega panel.
 * Mapping rationale (by template family):
 *   tree            — classic Digikala commerce tree (root rail on the
 *                     inline-start side + subcategory columns to its left)
 *   images          — large image-led tiles, gradient caption, hover zoom
 *   waterfall       — masonry cascade with staggered offsets + fade-in
 *   zoomfade        — collapsed icon rail expanding on hover, zoom-in swap
 *   waterfall-product — the cascade + a live featured-product side panel */
export type MegaMenuStyle =
  | "tree" /* درختی دیجی‌کالایی */
  | "images" /* تصویری بزرگ */
  | "waterfall" /* آبشاری */
  | "zoomfade" /* زوم و محو */
  | "waterfall-product"; /* آبشاری + محصول کنار */

/** v32 (5-e): the full 25-template → mega-menu style mapping. Pure data —
 *  attached onto each template's HeaderCfg at module load below (like the
 *  palettes), and readable standalone via getMegaMenuStyle for callers
 *  without a chrome cfg (the shared storefront header / modern-tech). */
export const MEGA_MENU_STYLES: Record<string, MegaMenuStyle> = {
  /* درختی دیجی‌کالایی — commerce/marketplace templates */
  "modern-tech": "tree",
  marketplace: "tree",
  "superstore-grid": "tree",
  /* تصویری بزرگ — clean/light premium imagery templates */
  "minimal-premium": "images",
  "startup-light": "images",
  "novatrend-clean": "images",
  "glass-morphism": "images",
  "nova-glass": "images",
  "nexora-tech": "images",
  /* آبشاری — seasonal/deals templates */
  autumn: "waterfall",
  christmas: "waterfall",
  "yalda-night": "waterfall",
  "social-commerce": "waterfall",
  "flash-deals": "waterfall",
  "retro-vintage": "waterfall",
  /* زوم و محو — dark/techy HUD templates */
  "gaming-cyber": "zoomfade",
  "neon-noir": "zoomfade",
  "future-3d": "zoomfade",
  "techhub-dark": "zoomfade",
  /* آبشاری + محصول کنار — catalogue/luxury templates */
  "luxury-electronics": "waterfall-product",
  "art-deco": "waterfall-product",
  "editorial-magazine": "waterfall-product",
  "print-catalog": "waterfall-product",
  "mobile-first-pwa": "waterfall-product",
  "purple-mall": "waterfall-product",
  /* v35 · vertical storefronts */
  "taj-electronics-pro": "images",
  "sport-fashion": "images",
  "beauty-glow": "images",
  "zentry-gaming": "waterfall",
  "auto-parts": "tree",
};

/** v32 (5-e): resolve a template's mega-menu style (unknown ids → tree). */
export function getMegaMenuStyle(id: string | null | undefined): MegaMenuStyle {
  return MEGA_MENU_STYLES[id ?? ""] ?? "tree";
}

/* ══ v32 (task 14-b): STORE-WIDE CHROME LOOK OPTIONS ══════════════════
 * Admin option tables for the «هدر و فوتر» builder upgrades — the header
 * SKIN, the primary nav item ORDER, where the theme/cart/account actions
 * sit and the product-card hover effect. Pure data (Persian labels for the
 * admin UI); values are validated server-side by parseStoreChrome
 * (src/lib/settings.ts) and stored in StoreSettings.storeChrome — they
 * apply to the shared storefront header AND every template chrome header
 * (gaming-cyber's bespoke header is unaffected). */

/** header skins — one scoped CSS layer over the existing header structure */
export const STORE_HEADER_SKINS: readonly { value: string; label: string; desc: string }[] = [
  { value: "classic", label: "کلاسیک", desc: "ظاهر فعلی و پیش‌فرض هدر — بدون تغییر" },
  { value: "crystalline", label: "کریستالی", desc: "شیشه‌ی تراش‌خورده با لبه‌های منشوری و درخشش نور" },
  { value: "liquid-glass", label: "لیکوئید گلس", desc: "شیشه‌ی مایع با بلور شدید، ناوبری قرصی شناور و عبور نور" },
  { value: "minimal", label: "مینیمال", desc: "فوق‌تمیز با خط مویی و پس‌زمینه‌ی ساده و بی‌افکت" },
];

/** primary nav items (the ChromeHeaderNav buttons) — draggable in admin */
export const STORE_NAV_ITEMS: readonly { value: string; label: string }[] = [
  { value: "home", label: "خانه" },
  { value: "shop", label: "فروشگاه" },
  { value: "categories", label: "دسته‌بندی‌ها" },
  { value: "about", label: "درباره ما" },
  { value: "contact", label: "تماس با ما" },
];

/** the designed (default) order — nothing changes until the admin saves */
export const DEFAULT_NAV_ORDER: readonly string[] = STORE_NAV_ITEMS.map((i) => i.value);

/** where the theme-toggle / cart / account buttons sit */
export const STORE_ACTIONS_MODES: readonly { value: string; label: string; desc: string }[] = [
  { value: "grouped", label: "کنار هم در انتها", desc: "کلید تاریک/روشن، سبد و حساب کاربری گروهی در انتهای ردیف (پیش‌فرض فعلی)" },
  { value: "split", label: "مجزا", desc: "کلید تاریک/روشن کنار لوگو در ابتدای ردیف؛ سبد و حساب در انتها" },
];

/** product-card hover effects (live-previewed in admin, RTL-correct) */
export const STORE_HOVER_FX: readonly { value: string; label: string; desc: string }[] = [
  { value: "none", label: "بدون افکت (فعلی)", desc: "رفتار فعلی کارت محصول — بزرگ‌نمایی ملایم تصویر" },
  { value: "flip3d", label: "چرخش سه‌بعدی", desc: "تصویر با چرخش عمق‌دار سه‌بعدی می‌چرخد" },
  { value: "topdown", label: "از بالا به پایین", desc: "تصویر از بالا به پایین سُر می‌خورد" },
  { value: "slide", label: "چپ به راست", desc: "تصویر از چپ به راست حرکت می‌کند (سازگار با راست‌چین)" },
  { value: "fade", label: "محو - ظهور", desc: "تصویر محو است و با هاور ظاهر می‌شود" },
  { value: "bigzoom", label: "بزرگنمایی + سایه", desc: "بزرگ‌تر شدن تصویر با سایه‌ی پررنگ‌تر روی کارت" },
];

export type HeaderCfg = {
  /** template id — attached once at module load so chrome components can
   *  look up their own admin override from HomeData.store.chromeOverridesMap */
  id?: string;
  /** 1 bar · 2 float · 3 split · 4 side · 5 center · 6 app · 7 ticket · 8 mega */
  variant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** v24: "theme" = surface painted with the template palette (default) */
  tint: ChromeTint;
  /** v24: the template's own canvas colors (header matches the storefront) */
  palette?: ChromePalette;
  /** v26fix: the template's LIGHT-half palette — used when the visitor
   *  toggles the site to light mode (dual-mode chrome, same colors as the
   *  template's light skin + canvas). Admin color overrides win over both. */
  paletteLight?: ChromePalette;
  accent: ChromeAccent;
  /** stick to the top while scrolling (H6 is always sticky) */
  sticky?: boolean;
  /** announcement marquee strip (needs an active announcement) */
  ticker?: boolean;
  /** ticker duration in seconds (lower = faster) */
  tickerSpeed?: number;
  /** category row under the main bar */
  categoryRow?: "photos" | "chips" | "none";
  /** animate the category row as a slow marquee */
  categoryMarquee?: boolean;
  logo?: "square" | "round" | "wordmark" | "mono";
  /** v23: show the products mega-menu nav row (خانه/فروشگاه/درباره/تماس) */
  megaMenu?: boolean;
  /** v32 (5-e): which of the 5 mega-menu VARIANTS the «دسته‌بندی‌ها» panel
   *  renders (see MEGA_MENU_STYLES). Attached at module load; undefined →
   *  the classic tree (shared storefront header / modern-tech default). */
  menuStyle?: MegaMenuStyle;
  /** v23: basket opens a popover under the icon instead of the side drawer */
  cartStyle?: "drawer" | "popover";
  /** v24 admin toggles (missing = visible) */
  showSearch?: boolean;
  showAccount?: boolean;
  showCart?: boolean;
  showThemeToggle?: boolean;
  /** v32 (14-b): store-wide actions placement (Admin → ظاهر → هدر و فوتر
   *  → «جای کلیدها») — "split" moves the dark/light key to the START of the
   *  header row (next to the logo) while account + cart stay at the end;
   *  undefined/"grouped" = all three together at the end (current look).
   *  Threaded from data.store.storeChrome by TemplateHeader. */
  actionsMode?: "grouped" | "split";
};

export type FooterCfg = {
  /** template id — attached once at module load (see HeaderCfg.id) */
  id?: string;
  /** 1 mega · 2 center · 3 minimal · 4 band · 5 contact · 6 columns · 7 magazine · 8 app */
  variant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** v24: "theme" = surface painted with the template palette (default) */
  tint: ChromeTint;
  /** v24: the template's own canvas colors (footer matches the storefront) */
  palette?: ChromePalette;
  /** v26fix: the template's LIGHT-half palette — used in light mode */
  paletteLight?: ChromePalette;
  accent: ChromeAccent;
  logo?: "square" | "round" | "wordmark" | "mono";
  /** F1 only — trust strip on top */
  trust?: boolean;
  /** F1 only — number of category links (0 hides the column) */
  categories?: number;
  /** brand photo strip: "photos" = marquee · "chips" = static · "none" */
  brandStrip?: "photos" | "chips" | "none";
  /** brand strip marquee duration in seconds */
  brandSpeed?: number;
  /** F2/F4 — big rounded top edge */
  round?: boolean;
  /** v31 (gaming-cyber): render the REAL social icon row (links fetched
   * client-side from the public /api/store-info payload). Additive, only
   * set on gaming-cyber — every other footer renders exactly as before. */
  social?: boolean;
};

export type TemplateChrome = { header: HeaderCfg; footer: FooterCfg };

/* ── v24: each template's REAL storefront canvas (bg + ink) ──────────
 * extracted from the live template styles — the chrome paints itself
 * with these so header/footer are the same color as the theme.        */
export const TEMPLATE_PALETTES: Record<string, ChromePalette> = {
  /* v25: the DEFAULT template's own void-black canvas — the whole store
   * (shared chrome + every inner page) now paints with it too. */
  "modern-tech": { bg: "#0B0E14", fg: "#E8EDF5" },
  "future-3d": { bg: "#0A0E1A", fg: "#E6F1FF" },
  "minimal-premium": { bg: "#FFFFFF", fg: "#111111" },
  "social-commerce": { bg: "#101014", fg: "#F5F5F7" },
  autumn: { bg: "#161210", fg: "#F7EFE6" },
  christmas: { bg: "#0B1420", fg: "#E8F4FD" },
  "yalda-night": { bg: "#0D1226", fg: "#F3EDE4" },
  "gaming-cyber": { bg: "#1A1025", fg: "#F5EDFF" },
  "luxury-electronics": { bg: "#0A0A0C", fg: "#F7F3E8" },
  marketplace: { bg: "#0D1017", fg: "#E8EDF4" },
  "art-deco": { bg: "#0C0B09", fg: "#F5E9C8" },
  "retro-vintage": { bg: "#F4EDD8", fg: "#3A2E1D" },
  "glass-morphism": { bg: "#F5F5F7", fg: "#0A0A0A" },
  "editorial-magazine": { bg: "#FAFAF7", fg: "#111111" },
  "superstore-grid": { bg: "#131318", fg: "#F2F2F4" },
  "neon-noir": { bg: "#150D2B", fg: "#F3E9FF" },
  "flash-deals": { bg: "#141019", fg: "#FFF4E8" },
  "print-catalog": { bg: "#F7F5F0", fg: "#26221C" },
  "startup-light": { bg: "#F8FAFC", fg: "#0F172A" },
  "mobile-first-pwa": { bg: "#0E1117", fg: "#EDF2F8" },
  "nexora-tech": { bg: "#F6F7FB", fg: "#1A1A2E" },
  "techhub-dark": { bg: "#0F0F1A", fg: "#EEF2FF" },
  "purple-mall": { bg: "#1A1025", fg: "#F6EFFB" },
  "nova-glass": { bg: "#EEF3FA", fg: "#1E293B" },
  "novatrend-clean": { bg: "#FFFFFF", fg: "#1A1A1A" },
  /* v35 · vertical storefronts — native (default) halves */
  "taj-electronics-pro": { bg: "#FFFFFF", fg: "#1A1A24" },
  "sport-fashion": { bg: "#FBF7F2", fg: "#201A14" },
  "beauty-glow": { bg: "#FFF9F7", fg: "#2A1B20" },
  "zentry-gaming": { bg: "#14061F", fg: "#F2E8FF" },
  "auto-parts": { bg: "#131511", fg: "#EFF2E9" },
};

/* v26fix · LIGHT halves — the same values as TEMPLATE_CANVAS_MODES in
 * src/lib/templates/canvas.ts (kept in sync). While TEMPLATE_PALETTES
 * above carries each template's default (native) canvas, this map gives
 * every template its OTHER-mode palette so the bespoke chrome flips with
 * the visitor's light/dark toggle together with the template body. */
export const TEMPLATE_PALETTES_LIGHT: Record<string, ChromePalette> = {
  "modern-tech": { bg: "#F4F7FB", fg: "#1D2635" },
  "future-3d": { bg: "#F3F6FC", fg: "#1B2437" },
  "minimal-premium": { bg: "#14161A", fg: "#EDEFF3" }, /* v27b-T5: dark half — native-light templates' OTHER-mode (dark) palette */
  "social-commerce": { bg: "#F7F7F9", fg: "#191922" },
  autumn: { bg: "#FAF5EE", fg: "#3B2E20" },
  christmas: { bg: "#F2F8FD", fg: "#173247" },
  "yalda-night": { bg: "#F7F3EA", fg: "#232B4D" },
  "gaming-cyber": { bg: "#F6F2FB", fg: "#2A1B40" },
  "luxury-electronics": { bg: "#F8F6EF", fg: "#26221A" },
  marketplace: { bg: "#F4F6FA", fg: "#1E2532" },
  "art-deco": { bg: "#F7F1E1", fg: "#2E2A14" },
  "retro-vintage": { bg: "#221B10", fg: "#F0E6CE" }, /* v27b-T5: dark half */
  "glass-morphism": { bg: "#0E1014", fg: "#E8EAEE" }, /* v27b-T5: dark half */
  "editorial-magazine": { bg: "#17181A", fg: "#EDEDE8" }, /* v27b-T5: dark half */
  "superstore-grid": { bg: "#F5F5F7", fg: "#1D1D24" },
  "neon-noir": { bg: "#F5F0FB", fg: "#2B1B4E" },
  "flash-deals": { bg: "#FBF4ED", fg: "#33211A" },
  "print-catalog": { bg: "#1B1A17", fg: "#EDEAE2" }, /* v27b-T5: dark half */
  "startup-light": { bg: "#0E1420", fg: "#E6EAF2" }, /* v27b-T5: dark half */
  "mobile-first-pwa": { bg: "#F4F7FB", fg: "#1A2029" },
  "nexora-tech": { bg: "#14141F", fg: "#E9EAF2" }, /* v27b-T5: dark half */
  "techhub-dark": { bg: "#F3F5FB", fg: "#1B1E30" },
  "purple-mall": { bg: "#F7F2FA", fg: "#31203F" },
  "nova-glass": { bg: "#131A24", fg: "#E5EBF4" }, /* v27b-T5: dark half */
  "novatrend-clean": { bg: "#16171A", fg: "#EDEDEF" }, /* v27b-T5: dark half */
  /* v35 · vertical storefronts — OTHER-mode halves. zentry-gaming and
   * auto-parts are ALWAYS-dark designs (night-neon / industrial): their
   * "light" half stays dark so the header/footer never render a light
   * band around an always-dark template body. */
  "taj-electronics-pro": { bg: "#191922", fg: "#ECEDF2" },
  "sport-fashion": { bg: "#14161C", fg: "#EDEEF1" },
  "beauty-glow": { bg: "#221618", fg: "#F5E9E6" },
  "zentry-gaming": { bg: "#14061F", fg: "#F2E8FF" },
  "auto-parts": { bg: "#131511", fg: "#EFF2E9" },
};

export const TEMPLATE_CHROME: Record<string, TemplateChrome> = {
  /* ── v14.1 era (10) ─────────────────────────────────────────────── */
  "future-3d": {
    header: { variant: 2, tint: "theme", accent: "cyan", categoryRow: "photos", logo: "square" },
    footer: { variant: 2, tint: "theme", accent: "cyan", brandStrip: "chips", round: true },
  },
  "minimal-premium": {
    header: { variant: 5, tint: "theme", accent: "neutral", categoryRow: "chips", logo: "wordmark" },
    footer: { variant: 3, tint: "theme", accent: "neutral", brandStrip: "chips", logo: "mono" },
  },
  "social-commerce": {
    header: { variant: 6, tint: "theme", accent: "rose", categoryRow: "photos", logo: "round", ticker: true, tickerSpeed: 22, cartStyle: "popover" },
    footer: { variant: 8, tint: "theme", accent: "rose", brandStrip: "photos", brandSpeed: 30, logo: "round" },
  },
  autumn: {
    header: { variant: 1, tint: "theme", accent: "orange", sticky: true, ticker: true, categoryRow: "photos", logo: "square" },
    footer: { variant: 1, tint: "theme", accent: "orange", trust: true, categories: 6, brandStrip: "photos" },
  },
  christmas: {
    header: { variant: 8, tint: "theme", accent: "emerald", ticker: true, tickerSpeed: 18, categoryRow: "photos", categoryMarquee: true, logo: "square", megaMenu: true },
    footer: { variant: 4, tint: "theme", accent: "emerald", round: true, brandStrip: "photos" },
  },
  "yalda-night": {
    header: { variant: 4, tint: "theme", accent: "rose", ticker: true, tickerSpeed: 30, categoryRow: "chips", logo: "square" },
    footer: { variant: 4, tint: "theme", accent: "rose", round: true, brandStrip: "chips" },
  },
  "gaming-cyber": {
    header: { variant: 7, tint: "theme", accent: "lime", ticker: true, tickerSpeed: 16, logo: "mono" },
    footer: { variant: 6, tint: "theme", accent: "lime", brandStrip: "photos", brandSpeed: 26, social: true },
  },
  "luxury-electronics": {
    header: { variant: 5, tint: "theme", accent: "amber", categoryRow: "chips", logo: "wordmark" },
    footer: { variant: 7, tint: "theme", accent: "amber", brandStrip: "chips", logo: "wordmark" },
  },
  marketplace: {
    header: { variant: 8, tint: "theme", accent: "orange", sticky: true, ticker: true, categoryRow: "photos", categoryMarquee: true, logo: "square", megaMenu: true },
    footer: { variant: 1, tint: "theme", accent: "orange", trust: true, categories: 7, brandStrip: "photos", brandSpeed: 34 },
  },
  /* ── v16 era (15) ───────────────────────────────────────────────── */
  "art-deco": {
    header: { variant: 3, tint: "theme", accent: "amber", logo: "wordmark" },
    footer: { variant: 7, tint: "theme", accent: "amber", brandStrip: "chips", logo: "wordmark" },
  },
  "retro-vintage": {
    header: { variant: 7, tint: "theme", accent: "orange", logo: "square" },
    footer: { variant: 5, tint: "theme", accent: "orange", brandStrip: "chips", logo: "mono" },
  },
  "glass-morphism": {
    header: { variant: 2, tint: "theme", accent: "violet", categoryRow: "photos", logo: "round", cartStyle: "popover" },
    footer: { variant: 2, tint: "theme", accent: "violet", brandStrip: "chips", round: true, logo: "wordmark" },
  },
  "editorial-magazine": {
    header: { variant: 3, tint: "theme", accent: "neutral", logo: "wordmark" },
    footer: { variant: 7, tint: "theme", accent: "neutral", brandStrip: "chips", logo: "wordmark" },
  },
  "superstore-grid": {
    header: { variant: 8, tint: "theme", accent: "amber", sticky: true, ticker: true, tickerSpeed: 20, categoryRow: "photos", categoryMarquee: true, logo: "square", megaMenu: true },
    footer: { variant: 1, tint: "theme", accent: "amber", trust: true, categories: 8, brandStrip: "photos", brandSpeed: 30 },
  },
  "neon-noir": {
    header: { variant: 4, tint: "theme", accent: "violet", ticker: true, tickerSpeed: 24, categoryRow: "chips", logo: "mono" },
    footer: { variant: 4, tint: "theme", accent: "violet", round: false, brandStrip: "photos" },
  },
  "flash-deals": {
    header: { variant: 1, tint: "theme", accent: "rose", sticky: true, ticker: true, tickerSpeed: 14, categoryRow: "chips", logo: "square" },
    footer: { variant: 6, tint: "theme", accent: "rose", brandStrip: "photos", brandSpeed: 28 },
  },
  "print-catalog": {
    header: { variant: 3, tint: "theme", accent: "neutral", logo: "mono" },
    footer: { variant: 5, tint: "theme", accent: "neutral", brandStrip: "none", logo: "mono" },
  },
  "startup-light": {
    header: { variant: 2, tint: "theme", accent: "violet", categoryRow: "photos", logo: "round", cartStyle: "popover" },
    footer: { variant: 3, tint: "theme", accent: "violet", brandStrip: "photos", brandSpeed: 36, logo: "round" },
  },
  "mobile-first-pwa": {
    header: { variant: 6, tint: "theme", accent: "violet", categoryRow: "photos", logo: "round", ticker: true, tickerSpeed: 24, cartStyle: "popover" },
    footer: { variant: 8, tint: "theme", accent: "violet", brandStrip: "photos", brandSpeed: 32, logo: "round" },
  },
  "nexora-tech": {
    header: { variant: 2, tint: "theme", accent: "cyan", categoryRow: "photos", logo: "square", cartStyle: "popover" },
    footer: { variant: 3, tint: "theme", accent: "cyan", brandStrip: "chips", logo: "square" },
  },
  "techhub-dark": {
    header: { variant: 4, tint: "theme", accent: "cyan", ticker: true, tickerSpeed: 28, categoryRow: "photos", logo: "square", megaMenu: true },
    footer: { variant: 4, tint: "theme", accent: "cyan", round: true, brandStrip: "photos" },
  },
  "purple-mall": {
    header: { variant: 8, tint: "theme", accent: "violet", sticky: true, ticker: true, tickerSpeed: 22, categoryRow: "photos", categoryMarquee: true, logo: "square", megaMenu: true },
    footer: { variant: 1, tint: "theme", accent: "violet", trust: true, categories: 6, brandStrip: "photos", brandSpeed: 32 },
  },
  "nova-glass": {
    header: { variant: 2, tint: "theme", accent: "cyan", categoryRow: "photos", logo: "wordmark", cartStyle: "popover" },
    footer: { variant: 2, tint: "theme", accent: "cyan", brandStrip: "chips", round: true, logo: "wordmark" },
  },
  "novatrend-clean": {
    header: { variant: 1, tint: "theme", accent: "orange", sticky: true, ticker: true, tickerSpeed: 26, categoryRow: "photos", logo: "square", megaMenu: true },
    footer: { variant: 3, tint: "theme", accent: "orange", brandStrip: "photos", brandSpeed: 40, logo: "square" },
  },
  /* ── v35 · vertical storefronts (صنف‌های فروشگاه) ────────────── */
  "taj-electronics-pro": {
    header: { variant: 2, tint: "theme", accent: "violet", categoryRow: "photos", logo: "square", cartStyle: "popover", megaMenu: true },
    footer: { variant: 6, tint: "theme", accent: "violet", brandStrip: "chips", categories: 6 },
  },
  "sport-fashion": {
    header: { variant: 5, tint: "theme", accent: "orange", categoryRow: "chips", logo: "wordmark", megaMenu: true },
    footer: { variant: 7, tint: "theme", accent: "orange", brandStrip: "photos", brandSpeed: 38, logo: "wordmark" },
  },
  "beauty-glow": {
    header: { variant: 5, tint: "theme", accent: "rose", categoryRow: "photos", logo: "round", megaMenu: true },
    footer: { variant: 2, tint: "theme", accent: "rose", brandStrip: "photos", brandSpeed: 34, round: true, logo: "round" },
  },
  "zentry-gaming": {
    header: { variant: 7, tint: "theme", accent: "violet", ticker: true, tickerSpeed: 18, logo: "mono", megaMenu: true },
    footer: { variant: 6, tint: "theme", accent: "violet", brandStrip: "photos", brandSpeed: 26, social: true },
  },
  "auto-parts": {
    header: { variant: 1, tint: "theme", accent: "orange", sticky: true, ticker: true, tickerSpeed: 22, categoryRow: "chips", logo: "square", megaMenu: true },
    footer: { variant: 4, tint: "theme", accent: "orange", trust: true, brandStrip: "chips" },
  },
};

/* v24: attach each template's palette + id onto its chrome configs (ONE
 * mutation at module load — pure data, deterministic, SSR-safe).        */
for (const [id, c] of Object.entries(TEMPLATE_CHROME)) {
  const palette = TEMPLATE_PALETTES[id];
  const light = TEMPLATE_PALETTES_LIGHT[id];
  c.header.id = id;
  c.footer.id = id;
  // v32 (5-e): the template's mega-menu variant rides along too
  c.header.menuStyle = getMegaMenuStyle(id);
  if (palette) {
    c.header.palette = palette;
    c.footer.palette = palette;
  }
  // v26fix: dual-mode chrome — the light half rides along
  if (light) {
    c.header.paletteLight = light;
    c.footer.paletteLight = light;
  }
}

export function getTemplateChrome(id: string | null | undefined): TemplateChrome | undefined {
  return TEMPLATE_CHROME[id ?? ""];
}

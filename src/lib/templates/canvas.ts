/**
 * TEMPLATE CANVAS (v25) — the whole store paints itself with the ACTIVE
 * template's palette.
 * ------------------------------------------------------------------
 * The user story: the homepage followed the template theme (e.g. the
 * default «مدرن تِک» void-black canvas) but every OTHER page — header,
 * footer, product cards, cart/checkout/order pages, the AI chat widget —
 * stayed on the light default tokens ("white"). This module maps a
 * template palette {bg, fg} onto the FULL shadcn token vocabulary so the
 * entire store resolves to the same colors as the main page.
 *
 * PURE + SERVER-SAFE (no "use client", no React imports) — used from the
 * (store) layout (a server component) to emit a `:root { … }` CSS block
 * that also covers portal-rendered layers (dialogs, sheets, drawers,
 * toasts — they portal to <body> which inherits from :root).
 *
 * Color rules:
 *  - dark palettes: cards/popovers are the bg mixed toward white,
 *    borders are translucent ink, muted text is ink mixed toward bg.
 *  - light palettes: the same math mirrored toward black.
 *  - --primary / --destructive are intentionally NOT remapped — the
 *    brand accent (gold) keeps its identity on every canvas, exactly
 *    like the template homepages behave.
 */

import type { CSSProperties } from "react";

export type TemplatePalette = { bg: string; fg: string };

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function isDarkColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** linear blend a→b by ratio (0 = a, 1 = b); falls back to `b` on bad hex */
function mixHex(a: string, b: string, ratio: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return b;
  const t = Math.max(0, Math.min(1, ratio));
  return `#${toHex(ra[0] + (rb[0] - ra[0]) * t)}${toHex(ra[1] + (rb[1] - ra[1]) * t)}${toHex(ra[2] + (rb[2] - ra[2]) * t)}`;
}

/** #RRGGBB → rgba(r,g,b,a) (invalid → gray alpha) */
function hexAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(128,128,128,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/**
 * The full shadcn token map for a palette. Utilities like bg-background,
 * bg-card, border-border, text-muted-foreground, bg-accent … resolve to
 * the template's colors everywhere the block applies.
 */
export function templateCanvasVars(bg: string, fg: string): Record<string, string> {
  const dark = isDarkColor(bg);
  const card = dark ? mixHex(bg, "#FFFFFF", 0.085) : mixHex(bg, "#000000", 0.045);
  const popover = dark ? mixHex(bg, "#FFFFFF", 0.115) : mixHex(bg, "#000000", 0.06);
  const muted = dark ? mixHex(bg, "#FFFFFF", 0.07) : mixHex(bg, "#000000", 0.05);
  const secondary = dark ? mixHex(bg, "#FFFFFF", 0.1) : mixHex(bg, "#000000", 0.06);
  const accent = dark ? mixHex(bg, "#FFFFFF", 0.135) : mixHex(bg, "#000000", 0.085);
  return {
    "--background": bg,
    "--foreground": fg,
    "--card": card,
    "--card-foreground": fg,
    "--popover": popover,
    "--popover-foreground": fg,
    "--secondary": secondary,
    "--secondary-foreground": fg,
    "--muted": muted,
    "--muted-foreground": mixHex(fg, bg, 0.38),
    "--accent": accent,
    "--accent-foreground": fg,
    "--border": hexAlpha(fg, dark ? 0.16 : 0.14),
    "--input": hexAlpha(fg, dark ? 0.22 : 0.2),
    "--ring": mixHex(fg, bg, 0.45),
  };
}

/**
 * A `:root{…}` CSS body for the (store) layout's <style> tag. Emitted
 * server-side (no FOUC) and scoped document-wide ONLY while a store page
 * is mounted — leaving to /admin unmounts the layout and its style, so
 * the admin panel is never affected.
 */
export function templateCanvasCss(bg: string, fg: string): string {
  const vars = templateCanvasVars(bg, fg);
  const dark = isDarkColor(bg);
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  /* color-scheme is repeated on .store-shell/body so native widgets &
   * scrollbars follow the canvas even if a theme framework also declares
   * color-scheme on the html element. */
  return `:root{${body}}.store-shell,body{color-scheme:${dark ? "dark" : "light"}}`;
}


/* ═══════════════════════════════════════════════════════════════
   v26fix · DUAL-MODE CANVAS — true light/dark for EVERY template
   ------------------------------------------------------------------
   The user story: switching the site to light/dark only recolored the
   generic components — the active template's canvas (and every page
   painted with it) kept the template's FIXED palette, so "switching to
   white" never whitened a dark template. Now every template ships BOTH
   a dark and a light palette (the exact values the per-template light
   / dark skins in templates/*.tsx use) and the canvas block flips with
   the next-themes <html> class:
     :root           → the ADMIN-configured default mode (pre-paint)
     html.dark       → the dark palette
     html:not(.dark) → the light palette
   html.dark / html:not(.dark) (0,1,1) outrank :root (0,1,0), and the
   next-themes bootstrap script sets the class BEFORE first paint — no
   FOUC. PURE + SERVER-SAFE, emitted from the (store) layout. */

export type TemplatePalettePair = { dark: TemplatePalette; light: TemplatePalette };

/** v26fix: the dual palettes — MUST stay in sync with the per-template
 *  mode skins (agents v26fix-A..E wrote those CSS blocks against these
 *  exact hex values) and with TEMPLATE_PALETTES (the dark half). */
export const TEMPLATE_CANVAS_MODES: Record<string, TemplatePalettePair> = {
  "modern-tech":        { dark: { bg: "#0B0E14", fg: "#E8EDF5" }, light: { bg: "#F4F7FB", fg: "#1D2635" } },
  "future-3d":          { dark: { bg: "#0A0E1A", fg: "#E6F1FF" }, light: { bg: "#F3F6FC", fg: "#1B2437" } },
  "minimal-premium":    { dark: { bg: "#14161A", fg: "#EDEFF3" }, light: { bg: "#FFFFFF", fg: "#111111" } },
  "social-commerce":    { dark: { bg: "#101014", fg: "#F5F5F7" }, light: { bg: "#F7F7F9", fg: "#191922" } },
  autumn:               { dark: { bg: "#161210", fg: "#F7EFE6" }, light: { bg: "#FAF5EE", fg: "#3B2E20" } },
  christmas:            { dark: { bg: "#0B1420", fg: "#E8F4FD" }, light: { bg: "#F2F8FD", fg: "#173247" } },
  "yalda-night":        { dark: { bg: "#0D1226", fg: "#F3EDE4" }, light: { bg: "#F7F3EA", fg: "#232B4D" } },
  "gaming-cyber":       { dark: { bg: "#1A1025", fg: "#F5EDFF" }, light: { bg: "#F6F2FB", fg: "#2A1B40" } },
  "luxury-electronics": { dark: { bg: "#0A0A0C", fg: "#F7F3E8" }, light: { bg: "#F8F6EF", fg: "#26221A" } },
  marketplace:          { dark: { bg: "#0D1017", fg: "#E8EDF4" }, light: { bg: "#F4F6FA", fg: "#1E2532" } },
  "art-deco":           { dark: { bg: "#0C0B09", fg: "#F5E9C8" }, light: { bg: "#F7F1E1", fg: "#2E2A14" } },
  "retro-vintage":      { dark: { bg: "#221B10", fg: "#F0E6CE" }, light: { bg: "#F4EDD8", fg: "#3A2E1D" } },
  "glass-morphism":     { dark: { bg: "#0E1014", fg: "#E8EAEE" }, light: { bg: "#F5F5F7", fg: "#0A0A0A" } },
  "editorial-magazine": { dark: { bg: "#17181A", fg: "#EDEDE8" }, light: { bg: "#FAFAF7", fg: "#111111" } },
  "superstore-grid":    { dark: { bg: "#131318", fg: "#F2F2F4" }, light: { bg: "#F5F5F7", fg: "#1D1D24" } },
  "neon-noir":          { dark: { bg: "#150D2B", fg: "#F3E9FF" }, light: { bg: "#F5F0FB", fg: "#2B1B4E" } },
  "flash-deals":        { dark: { bg: "#141019", fg: "#FFF4E8" }, light: { bg: "#FBF4ED", fg: "#33211A" } },
  "print-catalog":      { dark: { bg: "#1B1A17", fg: "#EDEAE2" }, light: { bg: "#F7F5F0", fg: "#26221C" } },
  "startup-light":      { dark: { bg: "#0E1420", fg: "#E6EAF2" }, light: { bg: "#F8FAFC", fg: "#0F172A" } },
  "mobile-first-pwa":   { dark: { bg: "#0E1117", fg: "#EDF2F8" }, light: { bg: "#F4F7FB", fg: "#1A2029" } },
  "nexora-tech":        { dark: { bg: "#14141F", fg: "#E9EAF2" }, light: { bg: "#F6F7FB", fg: "#1A1A2E" } },
  "techhub-dark":       { dark: { bg: "#0F0F1A", fg: "#EEF2FF" }, light: { bg: "#F3F5FB", fg: "#1B1E30" } },
  "purple-mall":        { dark: { bg: "#1A1025", fg: "#F6EFFB" }, light: { bg: "#F7F2FA", fg: "#31203F" } },
  "nova-glass":         { dark: { bg: "#131A24", fg: "#E5EBF4" }, light: { bg: "#EEF3FA", fg: "#1E293B" } },
  "novatrend-clean":    { dark: { bg: "#16171A", fg: "#EDEDEF" }, light: { bg: "#FFFFFF", fg: "#1A1A1A" } },
};

/** mode body: the canvas token vars. */
function canvasModeBody(bg: string, fg: string): string {
  const vars = templateCanvasVars(bg, fg);
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
}

/**
 * v26fix: the mode-aware canvas block. `defaultDark` = the admin-configured
 * default mode (server-known via ThemeSettings.colorMode) — it paints :root
 * so the very first paint (before the next-themes script sets the class)
 * already matches the configured mode; the html.dark / html:not(.dark)
 * blocks then take over for the visitor's own toggle.
 */
export function templateCanvasCssModes(pair: TemplatePalettePair, defaultDark: boolean): string {
  const def = defaultDark ? pair.dark : pair.light;
  const root = `:root{${canvasModeBody(def.bg, def.fg)}}`;
  const dark = `html.dark{${canvasModeBody(pair.dark.bg, pair.dark.fg)}}`;
  const light = `html:not(.dark){${canvasModeBody(pair.light.bg, pair.light.fg)}}`;
  const scheme =
    `html.dark .store-shell,html.dark body{color-scheme:dark}` +
    `html:not(.dark) .store-shell,html:not(.dark) body{color-scheme:light}`;
  return root + dark + light + scheme;
}

/** v26fix: the SHARED footer (server component — cannot read the client
 *  toggle) paints itself with a scoped CSS block that flips with the
 *  html class, mirroring paletteFooterStyle's math for both modes.
 *  The footer root carries data-shared-footer; the admin default paints
 *  the plain attribute selector (pre-paint). */
export function sharedFooterCss(pair: TemplatePalettePair, defaultDark: boolean): string {
  /* v26fix: --background maps to the INK (fg) in BOTH modes — the footer's
   * translucent-ink utilities (text-background/55, /60, /70 …) must compose
   * as ink-on-surface: light ink on the dark surface, DARK ink on the light
   * surface. (The old `dark ? fg : bg` math turned text-background/xx into
   * light-on-light text whenever the surface was light.) The light block
   * also re-paints the white-alpha chip surfaces (bg-white/5) as ink-alpha
   * so the contact/feature chips stay visible on a light footer. */
  const body = (bg: string, fg: string, light: boolean) => {
    const surface = light ? mixHex(bg, "#000000", 0.055) : mixHex(bg, "#FFFFFF", 0.055);
    return `background-color:${surface};color:${fg};` +
      `--background:${fg};--foreground:${fg};` +
      `--card:${light ? mixHex(bg, "#000000", 0.05) : mixHex(bg, "#FFFFFF", 0.09)};` +
      `--border:${hexAlpha(fg, light ? 0.13 : 0.15)};` +
      `--muted-foreground:${mixHex(fg, bg, 0.35)}`;
  };
  const d = pair.dark, l = pair.light;
  const inkAlpha = (fg: string, a: number) => hexAlpha(fg, a);
  /* NOTE: the class-selector escapes below are DOUBLE-backslashed in this
   * template literal — JS eats one level, so the emitted CSS keeps the
   * valid `\/` escape (single backslash would silently invalidate the rule). */
  const lightExtras =
    `html:not(.dark) [data-shared-footer] .bg-white\\/5{background-color:${inkAlpha(l.fg, 0.06)}}` +
    `html:not(.dark) [data-shared-footer] .bg-white\\/10{background-color:${inkAlpha(l.fg, 0.08)}}` +
    `html:not(.dark) [data-shared-footer] .border-white\\/10{border-color:${inkAlpha(l.fg, 0.12)}}`;
  return (
    `[data-shared-footer]{${body(defaultDark ? d.bg : l.bg, defaultDark ? d.fg : l.fg, !defaultDark)}}` +
    `html.dark [data-shared-footer]{${body(d.bg, d.fg, false)}}` +
    `html:not(.dark) [data-shared-footer]{${body(l.bg, l.fg, true)}}` +
    lightExtras
  );
}

/** v26fix: pick the palette for the CURRENT site mode (client toggle) —
 *  used by client chrome (shared header announcement band, template
 *  chrome header/footer surfaces). */
export function paletteForMode(pair: TemplatePalettePair | undefined, dark: boolean): TemplatePalette | undefined {
  return pair ? (dark ? pair.dark : pair.light) : undefined;
}

/**
 * Palette surface for the SHARED footer (modern-tech path). The shared
 * footer is an inverted surface by default (bg-foreground); with a
 * palette we paint it slightly elevated from the canvas and remap
 * --background/--foreground so translucent-ink utilities
 * (text-background/55, bg-primary/15 …) keep composing on it.
 */
export function paletteFooterStyle(bg: string, fg: string): CSSProperties {
  const dark = isDarkColor(bg);
  const surface = dark ? mixHex(bg, "#FFFFFF", 0.055) : mixHex(bg, "#000000", 0.055);
  return {
    backgroundColor: surface,
    color: fg,
    "--background": dark ? fg : bg,
    "--foreground": dark ? fg : bg,
    "--card": dark ? mixHex(bg, "#FFFFFF", 0.09) : mixHex(bg, "#000000", 0.05),
    "--border": hexAlpha(fg, dark ? 0.15 : 0.13),
    "--muted-foreground": mixHex(fg, bg, 0.35),
  } as CSSProperties;
}

/** Elevated band for the shared header's announcement strip (palette mode). */
export function paletteAnnouncementStyle(bg: string, fg: string): CSSProperties {
  const dark = isDarkColor(bg);
  return {
    backgroundColor: dark ? mixHex(bg, "#FFFFFF", 0.12) : mixHex(bg, "#000000", 0.075),
    color: fg,
  };
}

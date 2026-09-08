/**
 * AUTH STYLE FAMILIES (task 5-d)
 * -------------------------------------------------------------
 * PURE DATA — server & client safe (no React imports).
 *
 * 25 bespoke auth page designs would be unmaintainable, so every
 * template id is mapped to ONE of 6 visual "auth variants"; the shared
 * AuthShell (src/components/store/auth/auth-shell.tsx) renders that
 * variant's layout/3D-decorations around the UNCHANGED login/register
 * form logic. Each entry also carries an accent pair (and optional
 * gradient bg colors) taken from the template's own canvas family so
 * templates sharing a variant still feel individually tinted
 * (purple-mall stays purple, superstore stays red/yellow …).
 *
 * Variant → template assignment:
 *  cyber       modern-tech · future-3d · gaming-cyber · neon-noir · techhub-dark
 *  glass       glass-morphism · novatrend-clean · startup-light · nexora-tech · nova-glass
 *  luxe        luxury-electronics · art-deco · editorial-magazine
 *  clean-light minimal-premium · mobile-first-pwa · print-catalog (+ DEFAULT fallback)
 *  market      social-commerce · superstore-grid · flash-deals · purple-mall · marketplace
 *  seasonal    autumn · christmas · yalda-night · retro-vintage
 *
 * `accent`  = the family color used for the button / strong surfaces
 *             (chosen dark enough to carry white ink).
 * `accent2` = the bright companion used for glows, orbs, ornaments.
 * `bg1/bg2` = optional custom gradient stops (market/seasonal families
 *             whose background is a per-template gradient).
 */

export type AuthVariant = "cyber" | "glass" | "luxe" | "clean-light" | "market" | "seasonal";

export type AuthStyleDef = {
  variant: AuthVariant;
  /** family color — button / strong surfaces (white-ink safe) */
  accent: string;
  /** bright companion — glows, orbs, ornaments */
  accent2: string;
  /** optional gradient stops for variants with a per-template bg */
  bg1?: string;
  bg2?: string;
};

/** template id → auth variant (the style-family system core). */
export const AUTH_VARIANT_MAP: Record<string, AuthVariant> = {
  /* ── cyber · dark HUD / neon / grid ─────────────────────────── */
  "modern-tech": "cyber",
  "future-3d": "cyber",
  "gaming-cyber": "cyber",
  "neon-noir": "cyber",
  "techhub-dark": "cyber",

  /* ── glass · light frosted surfaces / pastel orbs ───────────── */
  "glass-morphism": "glass",
  "novatrend-clean": "glass",
  "startup-light": "glass",
  "nexora-tech": "glass",
  "nova-glass": "glass",

  /* ── luxe · near-black warm / gold hairlines ────────────────── */
  "luxury-electronics": "luxe",
  "art-deco": "luxe",
  "editorial-magazine": "luxe",

  /* ── clean-light · white canvas / one accent detail ─────────── */
  "minimal-premium": "clean-light",
  "mobile-first-pwa": "clean-light",
  "print-catalog": "clean-light",

  /* ── market · vibrant energetic gradient ────────────────────── */
  "social-commerce": "market",
  "superstore-grid": "market",
  "flash-deals": "market",
  "purple-mall": "market",
  marketplace: "market",

  /* ── seasonal · warm/festive gradient + ornaments ───────────── */
  autumn: "seasonal",
  christmas: "seasonal",
  "yalda-night": "seasonal",
  "retro-vintage": "seasonal",
};

/** Fallback for unknown/missing template ids (task spec). */
export const DEFAULT_AUTH_VARIANT: AuthVariant = "clean-light";

/** Per-template accent pair + optional gradient bg. */
export const AUTH_STYLES: Record<string, AuthStyleDef> = {
  /* cyber */
  "modern-tech":   { variant: "cyber", accent: "#06B6D4", accent2: "#22D3EE" },
  "future-3d":     { variant: "cyber", accent: "#8B5CF6", accent2: "#22D3EE" },
  "gaming-cyber":  { variant: "cyber", accent: "#C015E0", accent2: "#EAFF00" },
  "neon-noir":     { variant: "cyber", accent: "#EC4899", accent2: "#22D3EE" },
  "techhub-dark":  { variant: "cyber", accent: "#8B5CF6", accent2: "#A78BFA" },

  /* glass */
  "glass-morphism": { variant: "glass", accent: "#E11D48", accent2: "#FB7185" },
  "novatrend-clean": { variant: "glass", accent: "#F43F5E", accent2: "#FB923C" },
  "startup-light":  { variant: "glass", accent: "#F97316", accent2: "#FB923C" },
  "nexora-tech":    { variant: "glass", accent: "#8B5CF6", accent2: "#A3E635" },
  "nova-glass":     { variant: "glass", accent: "#64748B", accent2: "#94A3B8" },

  /* luxe */
  "luxury-electronics": { variant: "luxe", accent: "#D4AF37", accent2: "#F1D98A" },
  "art-deco":           { variant: "luxe", accent: "#D4AF37", accent2: "#EACD7C" },
  "editorial-magazine": { variant: "luxe", accent: "#C2A24B", accent2: "#E3C97A" },

  /* clean-light */
  "minimal-premium": { variant: "clean-light", accent: "#10B981", accent2: "#34D399" },
  "mobile-first-pwa": { variant: "clean-light", accent: "#0D9488", accent2: "#2DD4BF" },
  "print-catalog":   { variant: "clean-light", accent: "#D97706", accent2: "#F59E0B" },

  /* market */
  "social-commerce": { variant: "market", accent: "#DB2777", accent2: "#8B5CF6" },
  "superstore-grid": { variant: "market", accent: "#DC2626", accent2: "#FACC15" },
  "flash-deals":     { variant: "market", accent: "#DC2626", accent2: "#F97316" },
  "purple-mall":     { variant: "market", accent: "#7C3AED", accent2: "#A855F7" },
  marketplace:       { variant: "market", accent: "#0E7490", accent2: "#06B6D4", bg1: "#1E293B", bg2: "#0F3B4A" },

  /* seasonal */
  autumn:        { variant: "seasonal", accent: "#B45309", accent2: "#F59E0B", bg1: "#241408", bg2: "#5C3413" },
  christmas:     { variant: "seasonal", accent: "#15803D", accent2: "#DC2626", bg1: "#07251A", bg2: "#123B24" },
  "yalda-night": { variant: "seasonal", accent: "#B3241F", accent2: "#F5D77A", bg1: "#0D1226", bg2: "#2A1020" },
  "retro-vintage": { variant: "seasonal", accent: "#B45309", accent2: "#FDE047", bg1: "#2A1D0C", bg2: "#6B4A1E" },
};

/** Shared default (unknown template id) — clean-light + brand gold. */
export const DEFAULT_AUTH_STYLE: AuthStyleDef = {
  variant: DEFAULT_AUTH_VARIANT,
  accent: "#B8860B",
  accent2: "#E3B341",
};

/** variant for a template id (unknown → clean-light). */
export function getAuthVariant(templateId: string | null | undefined): AuthVariant {
  if (templateId && AUTH_VARIANT_MAP[templateId]) return AUTH_VARIANT_MAP[templateId];
  return DEFAULT_AUTH_VARIANT;
}

/** full accent/bg style for a template id (unknown → default). */
export function getAuthStyle(templateId: string | null | undefined): AuthStyleDef {
  if (templateId && AUTH_STYLES[templateId]) return AUTH_STYLES[templateId];
  return DEFAULT_AUTH_STYLE;
}

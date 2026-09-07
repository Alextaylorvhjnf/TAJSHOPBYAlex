/**
 * v28-T3 · AI CHAT WIDGET — per-template skins + dynamic store branding
 * --------------------------------------------------------------------
 * PURE DATA (usable from server & client). The floating AI chat widget is
 * rendered globally by the (store) layout, so it follows the ACTIVE
 * storefront template: each of the 25 template ids maps to one of 10
 * visual skins (accent gradient + glow + avatar treatment). The skin is
 * applied through the `data-wskin` attribute on the widget root + the
 * scoped CSS string below (CSS custom properties — NOT new Tailwind
 * utilities, because the running Turbopack dev server does not re-scan
 * tsx edits for brand-new utility classes).
 *
 * `storeMonogram()` builds the widget avatar/logo from the store name's
 * initials, so renaming the store in admin instantly re-brands the widget:
 *   "alex vpn" → "AV" · «تاج الکترونیکس» → «تا» · "AlexVPN" → "AL"
 *   «فروشگاه» → «فر» (single word → first 2 characters) · "AI" fallback.
 */

export const WIDGET_SKIN_IDS = [
  "tech",
  "arcade",
  "warm",
  "gold",
  "violet",
  "rose",
  "emerald",
  "orange",
  "neutral",
  "clean",
] as const;

export type WidgetSkin = (typeof WIDGET_SKIN_IDS)[number];

/** template id → widget skin (all 25 registry ids covered) */
export const WIDGET_SKINS: Record<string, WidgetSkin> = {
  /* tech — cyan/teal neon, squircle, scanline sweep */
  "modern-tech": "tech",
  "techhub-dark": "tech",
  "nexora-tech": "tech",
  "nova-glass": "tech",
  /* arcade — animated RGB rainbow ring, lime/magenta glow */
  "gaming-cyber": "arcade",
  "future-3d": "arcade",
  /* warm — rose/amber gradient, breathing ember glow */
  "yalda-night": "warm",
  christmas: "warm",
  autumn: "warm",
  "flash-deals": "warm",
  /* gold — amber/gold premium bezel + sheen */
  "luxury-electronics": "gold",
  "art-deco": "gold",
  "retro-vintage": "gold",
  "minimal-premium": "gold",
  /* violet — purple neon ring */
  "neon-noir": "violet",
  "purple-mall": "violet",
  "glass-morphism": "violet",
  /* rose — social pink glow */
  "social-commerce": "rose",
  /* emerald — marketplace status ring */
  marketplace: "emerald",
  /* orange — urgency squircle pulse */
  "superstore-grid": "orange",
  "novatrend-clean": "orange",
  /* neutral — graphite minimal */
  "print-catalog": "neutral",
  "editorial-magazine": "neutral",
  /* clean — soft startup gradient, big radius */
  "startup-light": "clean",
  "mobile-first-pwa": "clean",
};

/** resolve the widget skin for an active template id (undefined = default
 *  gold-surface look — kept as the no-props fallback) */
export function getWidgetSkin(templateId?: string | null): WidgetSkin | undefined {
  if (!templateId) return undefined;
  return WIDGET_SKINS[templateId];
}

/* ── v27.1: per-skin AI ASSISTANT AVATARS ──────────────────────────────
 * Cool assistant faces (robots / girls) matching each skin's vibe — one
 * image per skin, so every template gets a different, awesome AI persona.
 * Used for the widget header avatar + (for Farsi store names) the FAB. */
export const WIDGET_AVATARS: Record<WidgetSkin, string> = {
  tech: "/images/ai-assistants/tech.png",
  arcade: "/images/ai-assistants/arcade.png",
  warm: "/images/ai-assistants/warm.png",
  gold: "/images/ai-assistants/gold.png",
  violet: "/images/ai-assistants/violet.png",
  rose: "/images/ai-assistants/rose.png",
  emerald: "/images/ai-assistants/emerald.png",
  orange: "/images/ai-assistants/orange.png",
  neutral: "/images/ai-assistants/neutral.png",
  clean: "/images/ai-assistants/clean.png",
};

/** avatar image for the active skin (null when the skin has no art yet) */
export function getWidgetAvatar(skin?: WidgetSkin): string | null {
  return skin ? WIDGET_AVATARS[skin] : null;
}

/** true when the store name is (mostly) Farsi/Arabic-script — those names
 *  render the cool assistant LOGO instead of a Latin monogram */
export function isFarsiStoreName(name: string): boolean {
  const letters = (name ?? "").replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const farsi = letters.match(/[\u0600-\u06FF]/gu)?.length ?? 0;
  return farsi > 0 && farsi / letters.length >= 0.4;
}

/* ── store monogram ───────────────────────────────────────────────────
 * Logo/monogram from the store name: first letters of the first two
 * words (Latin uppercased), single word → first 2 characters. Fallback
 * "AI" when nothing usable survives cleaning. */
const ZW_RE = /[\u200B-\u200F\u2060\uFEFF\u0640]/g; // zero-width + kashida
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}\u{1F1E6}-\u{1F1FF}]/gu;

export function storeMonogram(name: string): string {
  const cleaned = (name ?? "")
    .replace(ZW_RE, "")
    .replace(EMOJI_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "AI";
  const words = cleaned.split(" ").filter((w) => w.length > 0);
  const firstLetter = (w: string): string => {
    const ch = w[0] ?? "";
    return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
  };
  if (words.length >= 2) {
    return firstLetter(words[0]) + firstLetter(words[1]);
  }
  const w = words[0];
  if (w.length >= 2) {
    return /^[A-Za-z]/.test(w) ? w.slice(0, 2).toUpperCase() : w.slice(0, 2);
  }
  if (w.length === 1) return firstLetter(w);
  return "AI";
}

/* ── scoped skin CSS ──────────────────────────────────────────────────
 * Injected once by the widget (client component <style> block). Only
 * matches under [data-wskin] — without a skin the widget keeps its
 * original gold-surface look. Accent variables cascade from the widget
 * root wrapper; effects are prefers-reduced-motion safe and readable in
 * both light & dark (the panel itself stays on glass/bg-card tokens). */
export const WIDGET_SKIN_CSS = `
/* skin accent variables (fallback: the template's own --primary) */
[data-wskin] {
  --w-ink: #ffffff;
  --w-accent: var(--primary);
  --w-accent2: var(--primary);
  --w-glow: color-mix(in oklab, var(--primary) 45%, transparent);
}
[data-wskin="tech"]    { --w-accent:#0891B2; --w-accent2:#0D9488; --w-glow:rgba(34,211,238,.5); }
[data-wskin="arcade"]  { --w-accent:#65A30D; --w-accent2:#A21CAF; --w-glow:rgba(217,70,239,.5); }
[data-wskin="warm"]    { --w-accent:#E11D48; --w-accent2:#EA580C; --w-glow:rgba(244,63,94,.45); }
[data-wskin="gold"]    { --w-accent:#F59E0B; --w-accent2:#FCD34D; --w-ink:#451A03; --w-glow:rgba(245,158,11,.5); }
[data-wskin="violet"]  { --w-accent:#9333EA; --w-accent2:#C026D3; --w-glow:rgba(192,38,211,.45); }
[data-wskin="rose"]    { --w-accent:#DB2777; --w-accent2:#F43F5E; --w-glow:rgba(236,72,153,.42); }
[data-wskin="emerald"] { --w-accent:#059669; --w-accent2:#10B981; --w-glow:rgba(16,185,129,.45); }
[data-wskin="orange"]  { --w-accent:#EA580C; --w-accent2:#C2410C; --w-glow:rgba(249,115,22,.45); }
[data-wskin="neutral"] { --w-accent:#292524; --w-accent2:#57534E; --w-glow:rgba(41,37,36,.5); }
[data-wskin="clean"]   { --w-accent:#7C3AED; --w-accent2:#DB2777; --w-glow:rgba(139,92,246,.42); }

/* floating action button — accent gradient + glow (gold-surface stays as
   the no-skin fallback; these rules only apply when a skin is active) */
[data-wskin] .cw-fab {
  background: linear-gradient(140deg, var(--w-accent) 0%, var(--w-accent2) 100%);
  color: var(--w-ink);
  box-shadow: 0 12px 30px -10px var(--w-glow),
    0 0 0 1px color-mix(in oklab, var(--w-accent) 30%, transparent);
}
[data-wskin] .cw-ping {
  border-radius: inherit;
  background: color-mix(in oklab, var(--w-accent) 30%, transparent);
}
/* header / empty-state avatars — monogram sits in the accent gradient box
   (pro mode blends amber into the skin accent, keeps its own vibe) */
[data-wskin] .cw-avatar {
  background: linear-gradient(140deg, var(--w-accent) 0%, var(--w-accent2) 100%);
  color: var(--w-ink);
  box-shadow: 0 6px 16px -6px var(--w-glow);
}
[data-wskin] .cw-avatar.cw-avatar-pro {
  background: linear-gradient(140deg, #F59E0B 0%, var(--w-accent) 58%, var(--w-accent2) 100%);
}
/* send button + cart-reminder teaser bubble */
[data-wskin] .cw-send,
[data-wskin] .cw-teaser {
  background: linear-gradient(140deg, var(--w-accent) 0%, var(--w-accent2) 100%);
  color: var(--w-ink);
}
[data-wskin] .cw-teaser { box-shadow: 0 14px 34px -12px var(--w-glow); }
/* panel — tinted hairline + accent shadow (glass surface untouched) */
[data-wskin] .cw-panel {
  border-color: color-mix(in oklab, var(--w-accent) 38%, var(--border));
  box-shadow: 0 24px 64px -28px var(--w-glow);
}
[data-wskin] .cw-head {
  background: linear-gradient(to left, color-mix(in oklab, var(--w-accent) 16%, transparent), transparent);
}

/* ── per-skin signature effects ─────────────────────────────────── */

/* tech — squircle + scanline sweep */
[data-wskin="tech"] .cw-fab { border-radius: 1.05rem; }
[data-wskin="tech"] .cw-fab::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,.3) 50%, transparent 100%);
  background-size: 100% 38%;
  background-repeat: no-repeat;
  animation: cw-scan 2.6s linear infinite;
  pointer-events: none;
}
@keyframes cw-scan {
  0% { background-position: 0 -60%; }
  100% { background-position: 0 160%; }
}

/* arcade — RGB rainbow ring + pulsing glow */
[data-wskin="arcade"] .cw-fab {
  border-radius: 0.85rem;
  border: 2px solid transparent;
  background:
    linear-gradient(140deg, var(--w-accent) 0%, var(--w-accent2) 100%) padding-box,
    conic-gradient(#FF004C, #FFCF00, #7CFF00, #00FFD0, #FF00E1, #FF004C) border-box;
  animation: cw-arcade 2.4s ease-in-out infinite;
}
[data-wskin="arcade"] .cw-avatar {
  border: 1.5px solid transparent;
  background:
    linear-gradient(140deg, var(--w-accent) 0%, var(--w-accent2) 100%) padding-box,
    conic-gradient(#FF004C, #FFCF00, #7CFF00, #00FFD0, #FF00E1, #FF004C) border-box;
}
@keyframes cw-arcade {
  0%, 100% { box-shadow: 0 12px 30px -10px var(--w-glow), 0 0 18px 2px rgba(163,230,53,.35); }
  50% { box-shadow: 0 12px 30px -8px var(--w-glow), 0 0 30px 6px rgba(217,70,239,.55); }
}

/* warm — breathing ember glow */
[data-wskin="warm"] .cw-fab { animation: cw-breath 3.4s ease-in-out infinite; }
@keyframes cw-breath {
  0%, 100% { box-shadow: 0 12px 30px -10px var(--w-glow), 0 0 12px 2px rgba(251,146,60,.25); }
  50% { box-shadow: 0 12px 34px -10px var(--w-glow), 0 0 26px 6px rgba(244,63,94,.5); }
}

/* gold — premium bezel + static sheen streak (serif monogram) */
[data-wskin="gold"] .cw-fab {
  font-family: Georgia, "Times New Roman", serif;
  box-shadow: 0 12px 30px -10px var(--w-glow),
    inset 0 0 0 2px color-mix(in oklab, #FFF7D6 60%, transparent),
    0 0 0 1px color-mix(in oklab, #B45309 40%, transparent);
}
[data-wskin="gold"] .cw-fab::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.5) 46%, rgba(255,255,255,.14) 54%, transparent 70%);
  pointer-events: none;
}

/* violet — neon ring */
[data-wskin="violet"] .cw-fab {
  box-shadow: 0 0 0 2px color-mix(in oklab, #E879F9 55%, transparent),
    0 12px 30px -10px var(--w-glow),
    0 0 22px 2px rgba(168,85,247,.35);
}

/* rose — soft blush ring */
[data-wskin="rose"] .cw-fab {
  box-shadow: 0 0 0 2px color-mix(in oklab, #FBCFE8 40%, transparent),
    0 12px 30px -10px var(--w-glow);
}

/* emerald — squircle + status ring */
[data-wskin="emerald"] .cw-fab {
  border-radius: 1rem;
  box-shadow: 0 0 0 2px color-mix(in oklab, #6EE7B7 40%, transparent),
    0 12px 30px -10px var(--w-glow);
}

/* orange — urgency squircle pulse */
[data-wskin="orange"] .cw-fab {
  border-radius: 1rem;
  animation: cw-orange 2.8s ease-in-out infinite;
}
@keyframes cw-orange {
  0%, 100% { box-shadow: 0 12px 30px -10px var(--w-glow), 0 0 0 2px rgba(253,186,116,.35); }
  50% { box-shadow: 0 12px 30px -8px var(--w-glow), 0 0 20px 4px rgba(249,115,22,.5); }
}

/* neutral — graphite minimal with light hairline ring */
[data-wskin="neutral"] .cw-fab {
  background: linear-gradient(145deg, #292524 0%, #57534E 100%);
  box-shadow: 0 10px 24px -12px rgba(41,37,36,.6), 0 0 0 1px #D6D3D1;
}

/* clean — big soft radius */
[data-wskin="clean"] .cw-fab { border-radius: 1.25rem; }

/* reduced motion: effects off, colors keep */
@media (prefers-reduced-motion: reduce) {
  [data-wskin] .cw-fab,
  [data-wskin] .cw-fab::after { animation: none !important; }
}
`;

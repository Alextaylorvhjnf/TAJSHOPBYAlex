"use client";

/**
 * AUTH SHELL (task 5-d) — template-aware visual wrapper for the store
 * login/register pages.
 * ---------------------------------------------------------------------
 * The pages (server components) resolve the ACTIVE template (StoreSettings
 * .activeTemplate, with the admin-gated `?template=` preview override —
 * same mechanism as (store)/page.tsx), map it to one of 6 auth style
 * variants via src/lib/templates/auth-styles.ts, and wrap the UNTOUCHED
 * form logic (login-form.tsx / register-form.tsx) in this shell.
 *
 * This component is 100% presentation: it paints a variant-specific
 * 2-column layout (form card + 3D/graphic brand side, collapsing to a
 * single column < lg), pure-CSS/SVG decorations (no images) and
 * re-skins the nested shadcn form controls through a scoped token
 * remap so Input/Label/Button ink always matches the variant surface
 * in BOTH site light/dark modes. --primary stays the brand gold, so
 * gold-surface submit buttons keep their identity everywhere.
 *
 * Scoped CSS pattern: one plain <style> tag with `taj-*` classes under
 * `[data-auth-variant="…"]` (same approach as the admin login's al-*
 * terminal styles and the per-template [data-tpl] blocks). Unlayered
 * CSS outranks Tailwind's layered utilities, so the variant rules win
 * over generic utility classes. prefers-reduced-motion is respected.
 */

import type { CSSProperties, ReactNode } from "react";
import { TAJLogo } from "@/components/store/logo";
import { Camera, Cpu, Gamepad2, Headphones, Heart, Package, ShieldCheck, ShoppingCart, Smartphone, Watch, Zap } from "lucide-react";
import type { AuthVariant } from "@/lib/templates/auth-styles";

/* ═════════════════════════════════════════════════════════════════════
   ALL custom CSS — one plain <style> tag, scoped under [data-auth-variant]
   ═══════════════════════════════════════════════════════════════════ */
const AUTH_CSS = `
/* ── 0 · shared skeleton ─────────────────────────────────────────── */
.taj-auth{position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);min-height:max(560px,84dvh)}
@media (min-width:1024px){.taj-auth{grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:max(680px,calc(100dvh - 96px))}}
.taj-decor{position:absolute;inset:0;z-index:0;pointer-events:none}
.taj-form-col{position:relative;z-index:5;display:flex;align-items:center;justify-content:center;padding:2.6rem 1.4rem 3rem}
@media (min-width:640px){.taj-form-col{padding:3rem 2.5rem}}
.taj-form-wrap{width:100%;max-width:26rem}
.taj-logo-row{display:flex;justify-content:center}
.taj-f-logo{margin-bottom:1.9rem;width:100%;justify-content:center}
@media (min-width:1024px){.taj-f-logo{display:none}}
.taj-brand-col{position:relative;z-index:5;display:none}
@media (min-width:1024px){.taj-brand-col{display:flex;align-items:center;justify-content:center;padding:3rem 2.4rem;border-inline-start:1px solid rgba(148,163,184,.14)}}
.taj-bd{display:flex;flex-direction:column;align-items:center;text-align:center;width:100%;max-width:26rem}
.taj-card{position:relative;z-index:5;border-radius:24px;padding:1.85rem 1.55rem;animation:taj-rise .55s ease-out both}
@media (min-width:640px){.taj-card{padding:2rem 1.9rem}}
.taj-title{font-size:1.06rem;font-weight:900;text-align:center;margin:0 0 .35rem;color:var(--foreground)}
.taj-sub{font-size:.73rem;text-align:center;margin:0 0 1.45rem;color:var(--muted-foreground);line-height:1.9}
.taj-eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.1em;margin:0 0 .8rem}
.taj-h2{font-size:1.72rem;font-weight:900;line-height:1.6;margin:0}
.taj-bd-body{font-size:.83rem;line-height:2.1;margin:1.1rem 0 0}
.taj-points{list-style:none;padding:0;margin:1.4rem 0 0;display:flex;flex-direction:column;gap:.75rem;text-align:start;font-size:.83rem}
.taj-points li{display:flex;align-items:center;gap:.65rem;line-height:1.9}
.taj-points i{width:6px;height:6px;flex-shrink:0}
.taj-orb{position:absolute;border-radius:999px;pointer-events:none;z-index:0}

/* inputs/buttons: keep the form markup untouched — the variant re-skins
 * the nested shadcn controls. Transparent input bg beats dark:bg-input/30
 * whenever the site toggle is dark but the variant card is light. */
[data-auth-variant] .taj-card input{background-color:transparent}
[data-auth-variant] .taj-card button[type="submit"]{transition:transform .18s ease,box-shadow .25s ease,filter .2s ease}

/* ── keyframes (all taj- prefixed — page-local) ─────────────────── */
@keyframes taj-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes taj-float{0%,100%{transform:translateY(-16px)}50%{transform:translateY(16px)}}
@keyframes taj-bob{0%,100%{transform:translateY(-9px) rotate(var(--tr,0deg))}50%{transform:translateY(9px) rotate(var(--tr,0deg))}}
@keyframes taj-spin{to{transform:rotate(360deg)}}
@keyframes taj-spin-rev{to{transform:rotate(-360deg)}}
@keyframes taj-sweep{0%{top:-12%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:104%;opacity:0}}
@keyframes taj-shimmer{0%{transform:translateX(-130%) skewX(18deg)}100%{transform:translateX(260%) skewX(18deg)}}
@keyframes taj-twinkle{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
@keyframes taj-drift{0%{transform:translate3d(0,-40px,0) rotate(0deg);opacity:0}10%{opacity:.7}90%{opacity:.5}100%{transform:translate3d(30px,105vh,0) rotate(150deg);opacity:0}}
@keyframes taj-pulse-dot{0%,100%{box-shadow:0 0 0 0 color-mix(in oklab,var(--ta-accent) 50%,transparent)}70%{box-shadow:0 0 0 10px transparent}}

@media (prefers-reduced-motion:reduce){
  .taj-auth *,.taj-auth *::before,.taj-auth *::after{animation:none !important;transition:none !important}
}

/* ════════════════════════════════════════════════════════════════════
   1 · CYBER — dark HUD / neon grid / corner brackets
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="cyber"]{
  color-scheme:dark;
  background:
    radial-gradient(1000px 560px at 80% -10%, color-mix(in oklab, var(--ta-accent) 15%, transparent), transparent 62%),
    radial-gradient(760px 520px at 8% 108%, color-mix(in oklab, var(--ta-accent-2) 10%, transparent), transparent 58%),
    #05070D;
  --background:#05070D; --foreground:#E8EDF5;
  --card:#0C1120; --popover:#0C1120; --card-foreground:#E8EDF5; --popover-foreground:#E8EDF5;
  --secondary:rgba(148,163,184,.14); --secondary-foreground:#E8EDF5;
  --muted:rgba(148,163,184,.12); --muted-foreground:#98A2B8;
  --accent:rgba(148,163,184,.16); --accent-foreground:#E8EDF5;
  --border:rgba(148,163,184,.22); --input:rgba(148,163,184,.3); --ring:var(--ta-accent);
}
/* perspective grid floor */
[data-auth-variant="cyber"] .taj-c-grid{
  position:absolute;left:-22%;right:-22%;bottom:-10%;height:52%;
  background:
    repeating-linear-gradient(90deg, color-mix(in oklab, var(--ta-accent) 34%, transparent) 0 1px, transparent 1px 62px),
    repeating-linear-gradient(0deg, color-mix(in oklab, var(--ta-accent) 30%, transparent) 0 1px, transparent 1px 46px);
  transform:perspective(560px) rotateX(62deg);transform-origin:50% 100%;
  -webkit-mask-image:linear-gradient(to top, rgba(0,0,0,.85), transparent 82%);
  mask-image:linear-gradient(to top, rgba(0,0,0,.85), transparent 82%);
  opacity:.4;
}
/* faint CRT scanlines + a slow sweep beam */
[data-auth-variant="cyber"] .taj-c-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(120,180,220,.045) 0 1px, transparent 1px 3px)}
[data-auth-variant="cyber"] .taj-c-beam{position:absolute;left:0;right:0;height:130px;background:linear-gradient(180deg, transparent, color-mix(in oklab, var(--ta-accent) 11%, transparent), transparent);animation:taj-sweep 8s linear infinite}
/* HUD frame around the whole section */
[data-auth-variant="cyber"] .taj-c-hud{position:absolute;inset:14px}
[data-auth-variant="cyber"] .taj-c-hud i{position:absolute;width:26px;height:26px}
[data-auth-variant="cyber"] .taj-c-hud i:nth-child(1){top:0;right:0;border-top:2px solid color-mix(in oklab, var(--ta-accent) 75%, transparent);border-right:2px solid color-mix(in oklab, var(--ta-accent) 75%, transparent)}
[data-auth-variant="cyber"] .taj-c-hud i:nth-child(2){top:0;left:0;border-top:2px solid color-mix(in oklab, var(--ta-accent) 40%, transparent);border-left:2px solid color-mix(in oklab, var(--ta-accent) 40%, transparent)}
[data-auth-variant="cyber"] .taj-c-hud i:nth-child(3){bottom:0;right:0;border-bottom:2px solid color-mix(in oklab, var(--ta-accent) 40%, transparent);border-right:2px solid color-mix(in oklab, var(--ta-accent) 40%, transparent)}
[data-auth-variant="cyber"] .taj-c-hud i:nth-child(4){bottom:0;left:0;border-bottom:2px solid color-mix(in oklab, var(--ta-accent) 75%, transparent);border-left:2px solid color-mix(in oklab, var(--ta-accent) 75%, transparent)}
/* neon orbs */
[data-auth-variant="cyber"] .taj-orb{filter:blur(70px)}
[data-auth-variant="cyber"] .taj-orb-a{width:430px;height:430px;top:-9%;inset-inline-end:-8%;background:color-mix(in oklab, var(--ta-accent) 26%, transparent);animation:taj-float 11s ease-in-out infinite}
[data-auth-variant="cyber"] .taj-orb-b{width:340px;height:340px;bottom:-12%;inset-inline-start:-9%;background:color-mix(in oklab, var(--ta-accent-2) 17%, transparent);animation:taj-float 13s ease-in-out infinite reverse}
/* card: dark glass + neon border + corner brackets */
[data-auth-variant="cyber"] .taj-card{
  background:linear-gradient(180deg, rgba(14,20,38,.85), rgba(8,12,24,.92));
  border:1px solid color-mix(in oklab, var(--ta-accent) 40%, transparent);
  box-shadow:0 26px 70px -34px rgba(0,0,0,.9), 0 0 44px -18px color-mix(in oklab, var(--ta-accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.06);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
[data-auth-variant="cyber"] .taj-br{position:absolute;width:18px;height:18px;pointer-events:none}
[data-auth-variant="cyber"] .taj-br-1{top:-7px;right:-7px;border-top:2px solid var(--ta-accent-2);border-right:2px solid var(--ta-accent-2);filter:drop-shadow(0 0 6px color-mix(in oklab, var(--ta-accent-2) 65%, transparent))}
[data-auth-variant="cyber"] .taj-br-2{top:-7px;left:-7px;border-top:2px solid var(--ta-accent);border-left:2px solid var(--ta-accent);filter:drop-shadow(0 0 6px color-mix(in oklab, var(--ta-accent) 65%, transparent))}
[data-auth-variant="cyber"] .taj-br-3{bottom:-7px;right:-7px;border-bottom:2px solid var(--ta-accent);border-right:2px solid var(--ta-accent);filter:drop-shadow(0 0 6px color-mix(in oklab, var(--ta-accent) 65%, transparent))}
[data-auth-variant="cyber"] .taj-br-4{bottom:-7px;left:-7px;border-bottom:2px solid var(--ta-accent-2);border-left:2px solid var(--ta-accent-2);filter:drop-shadow(0 0 6px color-mix(in oklab, var(--ta-accent-2) 65%, transparent))}
[data-auth-variant="cyber"] .taj-title{color:#fff;text-shadow:0 0 20px color-mix(in oklab, var(--ta-accent) 50%, transparent)}
[data-auth-variant="cyber"] .taj-card input:focus-visible{
  border-color:var(--ta-accent-2);
  box-shadow:0 0 0 3px color-mix(in oklab, var(--ta-accent) 30%, transparent), 0 0 20px -4px color-mix(in oklab, var(--ta-accent) 65%, transparent);
}
[data-auth-variant="cyber"] .taj-card input:hover:not(:focus-visible){border-color:color-mix(in oklab, var(--ta-accent) 60%, transparent)}
[data-auth-variant="cyber"] .taj-card button[type="submit"]{
  background:linear-gradient(135deg, var(--ta-accent), color-mix(in oklab, var(--ta-accent) 58%, #000));
  color:#fff;border:1px solid color-mix(in oklab, var(--ta-accent-2) 45%, transparent);
  box-shadow:0 0 26px -6px color-mix(in oklab, var(--ta-accent) 80%, transparent), inset 0 1px 0 rgba(255,255,255,.28);
}
[data-auth-variant="cyber"] .taj-card button[type="submit"]:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 0 38px -6px color-mix(in oklab, var(--ta-accent) 90%, transparent), inset 0 1px 0 rgba(255,255,255,.28)}
/* brand art: orbiting rings + HUD chips around the logo */
[data-auth-variant="cyber"] .taj-c-art{position:relative;width:min(340px,86%);aspect-ratio:1;margin:0 auto 1.6rem;display:flex;align-items:center;justify-content:center}
[data-auth-variant="cyber"] .taj-c-ring{position:absolute;border-radius:999px}
[data-auth-variant="cyber"] .taj-c-ring-1{width:215px;height:215px;border:1px dashed color-mix(in oklab, var(--ta-accent) 60%, transparent);animation:taj-spin 22s linear infinite}
[data-auth-variant="cyber"] .taj-c-ring-1::after{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;border-radius:999px;background:var(--ta-accent-2);box-shadow:0 0 10px var(--ta-accent-2)}
[data-auth-variant="cyber"] .taj-c-ring-2{width:285px;height:285px;border:1px solid color-mix(in oklab, var(--ta-accent) 24%, transparent);animation:taj-spin-rev 34s linear infinite}
[data-auth-variant="cyber"] .taj-c-ring-2::after{content:"";position:absolute;bottom:4px;left:14%;width:6px;height:6px;border-radius:999px;background:var(--ta-accent);box-shadow:0 0 10px var(--ta-accent)}
[data-auth-variant="cyber"] .taj-c-ring-3{width:255px;height:255px;background:radial-gradient(circle, color-mix(in oklab, var(--ta-accent) 13%, transparent), transparent 68%)}
[data-auth-variant="cyber"] .taj-c-logo{position:relative;z-index:2;filter:drop-shadow(0 0 22px color-mix(in oklab, var(--ta-accent) 35%, transparent))}
[data-auth-variant="cyber"] .taj-c-chip{
  position:absolute;display:inline-flex;align-items:center;gap:6px;padding:.42rem .7rem;border-radius:9px;
  background:rgba(10,15,28,.85);border:1px solid color-mix(in oklab, var(--ta-accent) 45%, transparent);color:var(--ta-accent-2);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:800;letter-spacing:.12em;
  box-shadow:0 10px 26px -14px rgba(0,0,0,.9), 0 0 16px -8px color-mix(in oklab, var(--ta-accent) 70%, transparent);
  animation:taj-bob 7.5s ease-in-out infinite;
}
[data-auth-variant="cyber"] .taj-c-chip b{font-weight:800}
[data-auth-variant="cyber"] .taj-c-chip-1{top:12%;inset-inline-start:2%;--tr:-4deg;animation-delay:.6s}
[data-auth-variant="cyber"] .taj-c-chip-2{top:9%;inset-inline-end:0;--tr:5deg;animation-delay:2.4s}
[data-auth-variant="cyber"] .taj-c-chip-3{bottom:15%;inset-inline-end:4%;--tr:-6deg;animation-delay:1.4s}
[data-auth-variant="cyber"] .taj-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ta-accent-2);letter-spacing:.2em;font-size:.68rem}
[data-auth-variant="cyber"] .taj-h2{color:#fff;text-shadow:0 0 26px color-mix(in oklab, var(--ta-accent) 45%, transparent)}
[data-auth-variant="cyber"] .taj-bd-body{color:rgba(232,237,245,.62)}
[data-auth-variant="cyber"] .taj-points{color:rgba(232,237,245,.8)}
[data-auth-variant="cyber"] .taj-points i{background:var(--ta-accent-2);box-shadow:0 0 8px color-mix(in oklab, var(--ta-accent-2) 70%, transparent)}
[data-auth-variant="cyber"] .taj-c-code{margin:1.6rem 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.16em;color:color-mix(in oklab, var(--ta-accent) 65%, #64748B)}
[data-auth-variant="cyber"] .taj-brand-col{border-color:color-mix(in oklab, var(--ta-accent) 22%, transparent)}

/* ════════════════════════════════════════════════════════════════════
   2 · GLASS — light frosted card + pastel orbs + floating glass tiles
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="glass"]{
  color-scheme:light;
  background:
    radial-gradient(1200px 720px at 85% -12%, color-mix(in oklab, var(--ta-accent) 13%, transparent), transparent 64%),
    radial-gradient(900px 620px at 4% 112%, color-mix(in oklab, var(--ta-accent-2) 16%, transparent), transparent 58%),
    linear-gradient(180deg, #FDFDFF, #F1F4FA);
  --background:#FFFFFF; --foreground:#1B2437;
  --card:rgba(255,255,255,.72); --popover:#FFFFFF; --card-foreground:#1B2437; --popover-foreground:#1B2437;
  --secondary:rgba(27,36,55,.07); --secondary-foreground:#1B2437;
  --muted:rgba(27,36,55,.06); --muted-foreground:rgba(27,36,55,.62);
  --accent:rgba(27,36,55,.09); --accent-foreground:#1B2437;
  --border:rgba(27,36,55,.14); --input:rgba(27,36,55,.18); --ring:var(--ta-accent);
}
[data-auth-variant="glass"] .taj-orb{filter:blur(58px);opacity:.85}
[data-auth-variant="glass"] .taj-orb-a{width:400px;height:400px;top:-12%;inset-inline-end:-6%;background:color-mix(in oklab, var(--ta-accent) 30%, white);animation:taj-float 12s ease-in-out infinite}
[data-auth-variant="glass"] .taj-orb-b{width:330px;height:330px;bottom:-14%;inset-inline-start:-7%;background:color-mix(in oklab, var(--ta-accent-2) 34%, white);animation:taj-float 14s ease-in-out infinite reverse}
[data-auth-variant="glass"] .taj-orb-c{width:240px;height:240px;top:38%;inset-inline-start:42%;background:color-mix(in oklab, var(--ta-accent) 18%, var(--ta-accent-2) 18%, white);animation:taj-float 16s ease-in-out infinite}
[data-auth-variant="glass"] .taj-card{
  background:rgba(255,255,255,.6);
  border:1px solid rgba(255,255,255,.9);
  box-shadow:0 34px 84px -36px rgba(27,36,55,.38), inset 0 1px 0 rgba(255,255,255,.95), 0 0 0 1px rgba(27,36,55,.04);
  backdrop-filter:blur(22px) saturate(1.35);-webkit-backdrop-filter:blur(22px) saturate(1.35);
}
[data-auth-variant="glass"] .taj-card input:focus-visible{
  border-color:color-mix(in oklab, var(--ta-accent) 55%, transparent);
  box-shadow:0 0 0 3px color-mix(in oklab, var(--ta-accent) 20%, transparent);
}
[data-auth-variant="glass"] .taj-card button[type="submit"]{box-shadow:0 16px 38px -16px color-mix(in oklab, var(--ta-accent) 55%, transparent)}
[data-auth-variant="glass"] .taj-card button[type="submit"]:hover:not(:disabled){transform:translateY(-2px)}
/* brand art: fanned floating glass tiles */
[data-auth-variant="glass"] .taj-g-art{position:relative;width:300px;height:210px;margin:0 auto 1.9rem;perspective:800px}
[data-auth-variant="glass"] .taj-g-blob{position:absolute;top:-45%;left:50%;transform:translateX(-50%);width:260px;height:260px;border-radius:999px;background:radial-gradient(circle, color-mix(in oklab, var(--ta-accent) 26%, transparent), transparent 68%);filter:blur(14px)}
[data-auth-variant="glass"] .taj-g-tile{
  position:absolute;display:flex;align-items:center;justify-content:center;border-radius:22px;
  background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.95);
  box-shadow:0 26px 60px -28px rgba(27,36,55,.4), inset 0 1px 0 #fff;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  animation:taj-bob 8s ease-in-out infinite;
}
[data-auth-variant="glass"] .taj-g-tile-1{width:112px;height:132px;right:6%;top:26%;transform:rotate(7deg);color:var(--ta-accent);animation-delay:.3s}
[data-auth-variant="glass"] .taj-g-tile-2{width:128px;height:150px;left:50%;margin-left:-64px;top:6%;z-index:2;color:color-mix(in oklab, var(--ta-accent) 60%, var(--ta-accent-2));box-shadow:0 34px 70px -26px rgba(27,36,55,.45), inset 0 1px 0 #fff;animation-delay:1.2s}
[data-auth-variant="glass"] .taj-g-tile-3{width:104px;height:122px;left:5%;top:32%;transform:rotate(-8deg);color:color-mix(in oklab, var(--ta-accent-2) 85%, #1B2437);animation-delay:2.1s}
[data-auth-variant="glass"] .taj-eyebrow{display:inline-flex;align-items:center;gap:.5rem;padding:.34rem .95rem;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.95);box-shadow:0 8px 22px -14px rgba(27,36,55,.35);color:var(--ta-accent);font-size:.7rem}
[data-auth-variant="glass"] .taj-eyebrow::before{content:"";width:7px;height:7px;border-radius:999px;background:var(--ta-accent);animation:taj-pulse-dot 2.6s ease-out infinite}
[data-auth-variant="glass"] .taj-h2{background:linear-gradient(120deg, color-mix(in oklab, var(--ta-accent) 82%, #1B2437), color-mix(in oklab, var(--ta-accent-2) 72%, #1B2437));-webkit-background-clip:text;background-clip:text;color:transparent}
[data-auth-variant="glass"] .taj-bd-body{color:rgba(27,36,55,.68)}
[data-auth-variant="glass"] .taj-points{color:rgba(27,36,55,.8)}
[data-auth-variant="glass"] .taj-points i{border-radius:999px;background:var(--ta-accent)}
[data-auth-variant="glass"] .taj-bd-logo{margin-bottom:1.7rem;padding:.7rem 1.2rem;border-radius:18px;background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.95);box-shadow:0 18px 44px -24px rgba(27,36,55,.38);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}

/* ════════════════════════════════════════════════════════════════════
   3 · LUXE — near-black warm / gold hairlines / art-deco sunburst
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="luxe"]{
  color-scheme:dark;
  background:
    radial-gradient(1050px 600px at 50% -12%, rgba(212,175,55,.08), transparent 60%),
    radial-gradient(800px 520px at 108% 112%, rgba(212,175,55,.05), transparent 55%),
    #0A0806;
  --background:#0A0806; --foreground:#F2E8CD;
  --card:#141008; --popover:#141008; --card-foreground:#F2E8CD; --popover-foreground:#F2E8CD;
  --secondary:rgba(212,175,55,.1); --secondary-foreground:#F2E8CD;
  --muted:rgba(212,175,55,.08); --muted-foreground:#A99C72;
  --accent:rgba(212,175,55,.12); --accent-foreground:#F2E8CD;
  --border:rgba(212,175,55,.24); --input:rgba(212,175,55,.3); --ring:#D4AF37;
}
[data-auth-variant="luxe"] .taj-orb{filter:blur(90px)}
[data-auth-variant="luxe"] .taj-orb-a{width:380px;height:380px;top:-14%;left:50%;margin-left:-190px;background:rgba(212,175,55,.09)}
[data-auth-variant="luxe"] .taj-card{
  background:linear-gradient(180deg, #171209, #0D0A05);
  border:1px solid rgba(212,175,55,.34);
  box-shadow:0 34px 96px -44px rgba(0,0,0,.95), inset 0 0 0 1px rgba(212,175,55,.07), inset 0 1px 0 rgba(241,217,138,.14);
  border-radius:14px;
}
[data-auth-variant="luxe"] .taj-br{display:none}
[data-auth-variant="luxe"] .taj-l-gem{position:absolute;top:-7px;left:50%;margin-left:-7px;width:13px;height:13px;transform:rotate(45deg);background:linear-gradient(135deg,#F7E7B0,#D4AF37 55%,#8A6A10);box-shadow:0 0 14px rgba(212,175,55,.7);z-index:2}
[data-auth-variant="luxe"] .taj-title{
  background:linear-gradient(135deg,#F7E7B0 0%,#D4AF37 45%,#B8890B 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.02em;
}
[data-auth-variant="luxe"] .taj-sub::after{content:"";display:block;height:1px;margin:1.05rem auto 0;width:64%;background:linear-gradient(90deg,transparent,rgba(212,175,55,.7),transparent)}
[data-auth-variant="luxe"] .taj-card input{border-radius:10px}
[data-auth-variant="luxe"] .taj-card input:focus-visible{border-color:rgba(212,175,55,.75);box-shadow:0 0 0 3px rgba(212,175,55,.16), 0 0 22px -8px rgba(212,175,55,.6)}
[data-auth-variant="luxe"] .taj-card button[type="submit"]{position:relative;overflow:hidden;border-radius:10px}
[data-auth-variant="luxe"] .taj-card button[type="submit"]::after{content:"";position:absolute;top:0;bottom:0;width:44%;background:linear-gradient(105deg,transparent,rgba(255,244,200,.5),transparent);animation:taj-shimmer 3.4s ease-in-out infinite}
[data-auth-variant="luxe"] .taj-card button[type="submit"]:hover:not(:disabled){box-shadow:0 16px 44px -14px rgba(212,175,55,.55)}
/* brand art: rotating deco sunburst + nested diamond frames around the logo */
[data-auth-variant="luxe"] .taj-l-art{position:relative;width:300px;height:300px;margin:0 auto 1.4rem;display:flex;align-items:center;justify-content:center}
[data-auth-variant="luxe"] .taj-l-sun{position:absolute;inset:0;width:100%;height:100%;animation:taj-spin 70s linear infinite}
[data-auth-variant="luxe"] .taj-l-dia{position:absolute;border:1px solid rgba(212,175,55,.4)}
[data-auth-variant="luxe"] .taj-l-dia-1{width:128px;height:128px;transform:rotate(45deg);border-color:rgba(212,175,55,.55);box-shadow:0 0 30px -8px rgba(212,175,55,.35)}
[data-auth-variant="luxe"] .taj-l-dia-2{width:158px;height:158px;transform:rotate(45deg);border-style:double;border-color:rgba(212,175,55,.3)}
[data-auth-variant="luxe"] .taj-l-logo{position:relative;z-index:2;filter:drop-shadow(0 4px 22px rgba(212,175,55,.28))}
[data-auth-variant="luxe"] .taj-eyebrow{color:#C7B573;letter-spacing:.34em;font-size:.66rem}
[data-auth-variant="luxe"] .taj-h2{font-weight:800;background:linear-gradient(135deg,#F7E7B0 0%,#D4AF37 50%,#B8890B 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
[data-auth-variant="luxe"] .taj-bd-body{color:rgba(203,190,150,.75)}
[data-auth-variant="luxe"] .taj-points{color:rgba(232,220,180,.85)}
[data-auth-variant="luxe"] .taj-points i{transform:rotate(45deg);background:linear-gradient(135deg,#F1D98A,#B8890B)}
[data-auth-variant="luxe"] .taj-brand-col{border-color:rgba(212,175,55,.18)}

/* ════════════════════════════════════════════════════════════════════
   4 · CLEAN-LIGHT — white canvas / huge headline / hairline card
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="clean-light"]{
  color-scheme:light;
  background:linear-gradient(180deg, color-mix(in oklab, var(--ta-accent) 5%, #FFFFFF) 0%, #FFFFFF 340px, #FAFAF9 100%);
  --background:#FFFFFF; --foreground:#14171C;
  --card:#FFFFFF; --popover:#FFFFFF; --card-foreground:#14171C; --popover-foreground:#14171C;
  --secondary:rgba(20,23,28,.06); --secondary-foreground:#14171C;
  --muted:rgba(20,23,28,.05); --muted-foreground:rgba(20,23,28,.56);
  --accent:rgba(20,23,28,.08); --accent-foreground:#14171C;
  --border:rgba(20,23,28,.11); --input:rgba(20,23,28,.16); --ring:var(--ta-accent);
}
[data-auth-variant="clean-light"] .taj-card{
  background:#FFFFFF;border:1px solid rgba(20,23,28,.1);border-radius:20px;
  box-shadow:0 1px 2px rgba(20,23,28,.04), 0 30px 70px -46px rgba(20,23,28,.22);
}
[data-auth-variant="clean-light"] .taj-title{font-size:1.14rem}
[data-auth-variant="clean-light"] .taj-card input:focus-visible{border-color:color-mix(in oklab, var(--ta-accent) 65%, transparent);box-shadow:0 0 0 3px color-mix(in oklab, var(--ta-accent) 18%, transparent)}
[data-auth-variant="clean-light"] .taj-card button[type="submit"]{box-shadow:0 14px 30px -16px color-mix(in oklab, var(--ta-accent) 45%, transparent)}
[data-auth-variant="clean-light"] .taj-card button[type="submit"]:hover:not(:disabled){transform:translateY(-1px)}
/* brand art: perspective card stack + staggered fade-up */
[data-auth-variant="clean-light"] .taj-cl-art{perspective:900px;margin:0 auto 2rem;width:280px;height:200px}
[data-auth-variant="clean-light"] .taj-cl-sheet{position:absolute;border-radius:16px;background:#FFFFFF;border:1px solid rgba(20,23,28,.09);box-shadow:0 24px 50px -34px rgba(20,23,28,.3)}
[data-auth-variant="clean-light"] .taj-cl-sheet-1{width:190px;height:130px;left:2%;top:22%;transform:rotate(-7deg) translateY(14px);opacity:.5;animation:taj-rise .7s .1s ease-out both}
[data-auth-variant="clean-light"] .taj-cl-sheet-2{width:190px;height:130px;right:2%;top:16%;transform:rotate(6deg);opacity:.75;animation:taj-rise .7s .22s ease-out both}
[data-auth-variant="clean-light"] .taj-cl-sheet-3{width:210px;height:146px;left:50%;margin-left:-105px;top:6%;padding:18px;z-index:2;transform:rotate(-2deg);animation:taj-rise .7s .34s ease-out both;display:flex;flex-direction:column;gap:12px}
[data-auth-variant="clean-light"] .taj-cl-bar{display:block;height:9px;border-radius:6px;background:rgba(20,23,28,.08)}
[data-auth-variant="clean-light"] .taj-cl-bar-1{width:62%}
[data-auth-variant="clean-light"] .taj-cl-bar-2{width:88%;height:9px}
[data-auth-variant="clean-light"] .taj-cl-bar-3{width:44%;background:color-mix(in oklab, var(--ta-accent) 30%, rgba(20,23,28,.08))}
[data-auth-variant="clean-light"] .taj-cl-thumb{display:block;height:52px;border-radius:11px;background:linear-gradient(135deg, color-mix(in oklab, var(--ta-accent) 16%, #FFFFFF), color-mix(in oklab, var(--ta-accent-2) 14%, #FFFFFF))}
[data-auth-variant="clean-light"] .taj-bd-logo{margin-bottom:1.8rem}
[data-auth-variant="clean-light"] .taj-eyebrow{color:var(--muted-foreground);font-size:.7rem;letter-spacing:.22em}
[data-auth-variant="clean-light"] .taj-h2{font-size:clamp(1.9rem, 2.4vw, 2.5rem);line-height:1.4;color:#14171C}
[data-auth-variant="clean-light"] .taj-h2::after{content:"";display:inline-block;width:11px;height:11px;margin-inline-start:.5rem;border-radius:3px;background:var(--ta-accent);transform:rotate(45deg) translateY(-2px)}
[data-auth-variant="clean-light"] .taj-bd-body{color:rgba(20,23,28,.62);max-width:24rem}
[data-auth-variant="clean-light"] .taj-points{color:rgba(20,23,28,.78)}
[data-auth-variant="clean-light"] .taj-points i{border-radius:999px;background:var(--ta-accent)}
[data-auth-variant="clean-light"] .taj-bd > *{animation:taj-rise .65s ease-out both}
[data-auth-variant="clean-light"] .taj-bd > *:nth-child(2){animation-delay:.08s}
[data-auth-variant="clean-light"] .taj-bd > *:nth-child(3){animation-delay:.16s}
[data-auth-variant="clean-light"] .taj-bd > *:nth-child(4){animation-delay:.24s}

/* ════════════════════════════════════════════════════════════════════
   5 · MARKET — vibrant family-color gradient + floating icon chips
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="market"]{
  color-scheme:light;
  background:
    radial-gradient(880px 520px at 82% -10%, rgba(255,255,255,.24), transparent 58%),
    radial-gradient(700px 460px at 6% 112%, rgba(0,0,0,.24), transparent 56%),
    linear-gradient(148deg, var(--ta-bg-1, var(--ta-accent)), var(--ta-bg-2, var(--ta-accent-2)));
  --background:#FFFFFF; --foreground:#1D2430;
  --card:#FFFFFF; --popover:#FFFFFF; --card-foreground:#1D2430; --popover-foreground:#1D2430;
  --secondary:rgba(29,36,48,.07); --secondary-foreground:#1D2430;
  --muted:rgba(29,36,48,.06); --muted-foreground:rgba(29,36,48,.6);
  --accent:rgba(29,36,48,.09); --accent-foreground:#1D2430;
  --border:rgba(29,36,48,.12); --input:rgba(29,36,48,.18); --ring:var(--ta-accent);
}
[data-auth-variant="market"] .taj-card{background:#FFFFFF;border-radius:26px;box-shadow:0 34px 80px -34px rgba(0,0,0,.45)}
[data-auth-variant="market"] .taj-card::before{content:"";position:absolute;top:0;inset-inline:0;height:5px;border-radius:26px 26px 0 0;background:linear-gradient(90deg, var(--ta-accent), var(--ta-accent-2))}
[data-auth-variant="market"] .taj-card input:focus-visible{border-color:color-mix(in oklab, var(--ta-accent) 60%, transparent);box-shadow:0 0 0 3px color-mix(in oklab, var(--ta-accent) 22%, transparent)}
[data-auth-variant="market"] .taj-card button[type="submit"]{
  background:linear-gradient(135deg, var(--ta-accent), color-mix(in oklab, var(--ta-accent-2) 55%, var(--ta-accent)));
  color:#fff;box-shadow:0 7px 0 -3px color-mix(in oklab, var(--ta-accent) 52%, #000), 0 22px 40px -18px color-mix(in oklab, var(--ta-accent) 60%, transparent);
}
[data-auth-variant="market"] .taj-card button[type="submit"]:hover:not(:disabled){transform:translateY(2px);box-shadow:0 4px 0 -3px color-mix(in oklab, var(--ta-accent) 52%, #000), 0 16px 34px -18px color-mix(in oklab, var(--ta-accent) 60%, transparent)}
[data-auth-variant="market"] .taj-card button[type="submit"]:active:not(:disabled){transform:translateY(4px);box-shadow:0 1px 0 -3px color-mix(in oklab, var(--ta-accent) 52%, #000)}
/* brand art: floating product-ish chips + member discount badge */
[data-auth-variant="market"] .taj-m-art{position:relative;width:300px;height:290px;margin:0 auto 1.9rem;display:flex;align-items:center;justify-content:center}
[data-auth-variant="market"] .taj-m-chip{
  position:absolute;display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:17px;
  background:rgba(255,255,255,.17);border:1px solid rgba(255,255,255,.4);color:#fff;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:0 20px 44px -20px rgba(0,0,0,.5);
  animation:taj-bob 7s ease-in-out infinite;
}
[data-auth-variant="market"] .taj-m-chip-1{top:6%;inset-inline-start:4%;--tr:-7deg}
[data-auth-variant="market"] .taj-m-chip-2{top:0;inset-inline-end:8%;--tr:6deg;animation-delay:1.1s}
[data-auth-variant="market"] .taj-m-chip-3{top:44%;inset-inline-start:0;--tr:4deg;color:var(--ta-accent-2);animation-delay:2s}
[data-auth-variant="market"] .taj-m-chip-4{bottom:4%;inset-inline-end:2%;--tr:-5deg;animation-delay:.6s}
[data-auth-variant="market"] .taj-m-chip-5{bottom:0;inset-inline-start:14%;--tr:8deg;animation-delay:2.8s}
[data-auth-variant="market"] .taj-m-logo{position:relative;z-index:2;background:rgba(255,255,255,.94);padding:.85rem 1.35rem;border-radius:19px;box-shadow:0 26px 54px -24px rgba(0,0,0,.5)}
[data-auth-variant="market"] .taj-m-badge{
  position:absolute;top:16%;inset-inline-end:0;z-index:3;transform:rotate(-6deg);
  background:#FFFFFF;color:#1D2430;padding:.5rem .8rem;border-radius:13px;font-weight:900;font-size:1rem;line-height:1.25;
  box-shadow:0 18px 36px -16px rgba(0,0,0,.45);animation:taj-bob 8s ease-in-out infinite;
}
[data-auth-variant="market"] .taj-m-badge small{display:block;font-size:.62rem;font-weight:800;color:var(--ta-accent)}
[data-auth-variant="market"] .taj-eyebrow{color:rgba(255,255,255,.85);font-size:.7rem;letter-spacing:.2em}
[data-auth-variant="market"] .taj-h2{color:#fff;text-shadow:0 10px 34px rgba(0,0,0,.35)}
[data-auth-variant="market"] .taj-bd-body{color:rgba(255,255,255,.85);max-width:23rem}
[data-auth-variant="market"] .taj-points{color:rgba(255,255,255,.92);max-width:20rem;margin-inline:auto}
[data-auth-variant="market"] .taj-points i{border-radius:999px;background:#fff;box-shadow:0 0 10px rgba(255,255,255,.6)}
[data-auth-variant="market"] .taj-brand-col{border-color:rgba(255,255,255,.22)}

/* ════════════════════════════════════════════════════════════════════
   6 · SEASONAL — warm/festive gradient + CSS ornaments + particle drift
   ═══════════════════════════════════════════════════════════════════ */
[data-auth-variant="seasonal"]{
  color-scheme:dark;
  background:
    radial-gradient(920px 520px at 82% -10%, color-mix(in oklab, var(--ta-accent-2) 17%, transparent), transparent 60%),
    radial-gradient(760px 520px at 6% 110%, color-mix(in oklab, var(--ta-accent) 22%, transparent), transparent 56%),
    linear-gradient(165deg, var(--ta-bg-1, #2A1508), var(--ta-bg-2, #5C3413));
  --background:#FFF9F0; --foreground:#3B2A1A;
  --card:#FFF9F0; --popover:#FFF9F0; --card-foreground:#3B2A1A; --popover-foreground:#3B2A1A;
  --secondary:rgba(59,42,26,.07); --secondary-foreground:#3B2A1A;
  --muted:rgba(59,42,26,.06); --muted-foreground:rgba(59,42,26,.58);
  --accent:rgba(59,42,26,.09); --accent-foreground:#3B2A1A;
  --border:rgba(59,42,26,.16); --input:rgba(59,42,26,.2); --ring:var(--ta-accent);
}
[data-auth-variant="seasonal"] .taj-orb{filter:blur(74px)}
[data-auth-variant="seasonal"] .taj-orb-a{width:420px;height:420px;top:-10%;inset-inline-end:-7%;background:color-mix(in oklab, var(--ta-accent-2) 22%, transparent)}
[data-auth-variant="seasonal"] .taj-orb-b{width:330px;height:330px;bottom:-13%;inset-inline-start:-8%;background:color-mix(in oklab, var(--ta-accent) 25%, transparent)}
[data-auth-variant="seasonal"] .taj-card{
  background:linear-gradient(180deg,#FFFAF1,#FBF1E0);
  border:1px solid rgba(120,84,40,.2);
  box-shadow:0 38px 90px -40px rgba(20,10,2,.75), inset 0 1px 0 rgba(255,255,255,.9);
}
[data-auth-variant="seasonal"] .taj-card input:focus-visible{border-color:color-mix(in oklab, var(--ta-accent) 62%, transparent);box-shadow:0 0 0 3px color-mix(in oklab, var(--ta-accent) 22%, transparent)}
[data-auth-variant="seasonal"] .taj-card button[type="submit"]{
  background:linear-gradient(135deg, var(--ta-accent), color-mix(in oklab, var(--ta-accent-2) 55%, var(--ta-accent)));
  color:#FFF9F0;box-shadow:0 18px 40px -16px color-mix(in oklab, var(--ta-accent) 60%, transparent);
}
[data-auth-variant="seasonal"] .taj-card button[type="submit"]:hover:not(:disabled){transform:translateY(-2px)}
/* brand art: seasonal ornaments around the logo */
[data-auth-variant="seasonal"] .taj-s-art{position:relative;width:290px;height:250px;margin:0 auto 1.5rem;display:flex;align-items:center;justify-content:center}
[data-auth-variant="seasonal"] .taj-s-logo{position:relative;z-index:2;padding:.75rem 1.25rem;border-radius:18px;background:rgba(255,249,240,.14);border:1px solid rgba(255,249,240,.35);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);box-shadow:0 22px 50px -24px rgba(0,0,0,.5)}
/* leaf ornament (border-radius leaf shape + center vein) */
[data-auth-variant="seasonal"] .taj-s-leaf{position:absolute;width:32px;height:32px;background:linear-gradient(135deg, var(--ta-accent-2), var(--ta-accent));border-radius:0 100% 0 100%;opacity:.85;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35));animation:taj-bob 9s ease-in-out infinite}
[data-auth-variant="seasonal"] .taj-s-leaf::after{content:"";position:absolute;top:12%;bottom:12%;left:48%;width:1.5px;background:rgba(255,255,255,.4);transform:rotate(24deg)}
[data-auth-variant="seasonal"] .taj-s-leaf-1{top:6%;inset-inline-start:8%;transform:rotate(18deg);--tr:14deg}
[data-auth-variant="seasonal"] .taj-s-leaf-2{bottom:4%;inset-inline-end:6%;transform:rotate(-140deg);--tr:-16deg;animation-delay:1.8s}
[data-auth-variant="seasonal"] .taj-s-leaf-3{top:34%;inset-inline-end:-2%;width:24px;height:24px;transform:rotate(120deg);--tr:10deg;animation-delay:3.2s}
/* pomegranate ornament (radial-red sphere + zigzag crown) */
[data-auth-variant="seasonal"] .taj-s-pom{position:relative;width:42px;height:40px;border-radius:50%;background:radial-gradient(circle at 33% 28%, #E86A54, #B3241F 58%, #8E1B17);box-shadow:0 10px 22px -8px rgba(0,0,0,.5), inset -5px -6px 12px rgba(0,0,0,.3);animation:taj-bob 10s ease-in-out infinite}
[data-auth-variant="seasonal"] .taj-s-pom::before{content:"";position:absolute;top:-9px;left:50%;margin-left:-10px;width:20px;height:9px;background:#C98A2B;clip-path:polygon(0% 100%,16% 0%,33% 55%,50% 0%,67% 55%,84% 0%,100% 100%)}
[data-auth-variant="seasonal"] .taj-s-pom-1{top:2%;inset-inline-end:16%;--tr:-6deg}
[data-auth-variant="seasonal"] .taj-s-pom-2{bottom:8%;inset-inline-start:4%;width:34px;height:32px;--tr:7deg;animation-delay:2.4s}
[data-auth-variant="seasonal"] .taj-s-pom-2::before{top:-8px;margin-left:-8px;width:16px;height:8px}
/* star ornament (gold SVG) */
[data-auth-variant="seasonal"] .taj-s-star{position:absolute;width:22px;height:22px;fill:var(--ta-accent-2);filter:drop-shadow(0 0 8px color-mix(in oklab, var(--ta-accent-2) 65%, transparent));animation:taj-twinkle 3.4s ease-in-out infinite}
[data-auth-variant="seasonal"] .taj-s-star-1{top:10%;inset-inline-start:38%;animation-delay:.4s}
[data-auth-variant="seasonal"] .taj-s-star-2{bottom:16%;inset-inline-end:34%;width:16px;height:16px;animation-delay:1.6s}
[data-auth-variant="seasonal"] .taj-s-star-3{top:44%;inset-inline-start:-2%;width:14px;height:14px;animation-delay:2.6s}
/* holly ornament (two leaves + three berries) */
[data-auth-variant="seasonal"] .taj-s-holly{position:absolute;width:46px;height:40px;animation:taj-bob 8.5s ease-in-out infinite}
[data-auth-variant="seasonal"] .taj-s-holly i{position:absolute;width:22px;height:12px;background:linear-gradient(135deg,#2F7D46,#1B5E30);border-radius:0 100% 0 100%;box-shadow:0 4px 10px -3px rgba(0,0,0,.4)}
[data-auth-variant="seasonal"] .taj-s-holly i:nth-child(1){top:6px;right:1px;transform:rotate(14deg)}
[data-auth-variant="seasonal"] .taj-s-holly i:nth-child(2){top:6px;right:12px;transform:rotate(-160deg)}
[data-auth-variant="seasonal"] .taj-s-holly b{position:absolute;bottom:2px;width:9px;height:9px;border-radius:999px;background:radial-gradient(circle at 35% 30%, #F87171, #DC2626 62%);box-shadow:0 2px 6px rgba(0,0,0,.35)}
[data-auth-variant="seasonal"] .taj-s-holly b:nth-child(3){right:16px}
[data-auth-variant="seasonal"] .taj-s-holly b:nth-child(4){right:6px}
[data-auth-variant="seasonal"] .taj-s-holly b:nth-child(5){right:26px}
[data-auth-variant="seasonal"] .taj-s-holly-1{top:2%;inset-inline-start:10%;--tr:-8deg}
[data-auth-variant="seasonal"] .taj-s-holly-2{bottom:2%;inset-inline-end:12%;--tr:9deg;animation-delay:2.2s}
/* retro half-tone dot patch */
[data-auth-variant="seasonal"] .taj-s-dots{display:none;position:absolute;top:20%;inset-inline-start:-4%;width:110px;height:110px;border-radius:999px;background:radial-gradient(color-mix(in oklab, var(--ta-accent-2) 55%, transparent) 2.2px, transparent 2.6px);background-size:15px 15px;opacity:.5}
/* drifting motes (embers / snow / gold dust) */
[data-auth-variant="seasonal"] .taj-mote{position:absolute;top:0;border-radius:999px;background:var(--ta-accent-2);opacity:0;animation:taj-drift linear infinite}
[data-auth-variant="seasonal"] .taj-eyebrow{color:color-mix(in oklab, var(--ta-accent-2) 85%, #FFF6E4);letter-spacing:.24em;font-size:.68rem}
[data-auth-variant="seasonal"] .taj-h2{color:#FFF6E4;text-shadow:0 8px 30px rgba(0,0,0,.45)}
[data-auth-variant="seasonal"] .taj-bd-body{color:rgba(255,244,224,.82)}
[data-auth-variant="seasonal"] .taj-points{color:rgba(255,246,228,.9);max-width:20rem;margin-inline:auto}
[data-auth-variant="seasonal"] .taj-points i{border-radius:999px;background:var(--ta-accent-2);box-shadow:0 0 9px color-mix(in oklab, var(--ta-accent-2) 70%, transparent)}
[data-auth-variant="seasonal"] .taj-brand-col{border-color:rgba(255,240,210,.16)}
/* per-template ornament sets (default = leaves + stars) */
[data-auth-template="christmas"] .taj-s-leaf,[data-auth-template="christmas"] .taj-s-pom{display:none}
[data-auth-template="christmas"] .taj-mote{background:#FFFFFF}
[data-auth-template="yalda-night"] .taj-s-leaf,[data-auth-template="yalda-night"] .taj-s-holly{display:none}
[data-auth-template="retro-vintage"] .taj-s-leaf,[data-auth-template="retro-vintage"] .taj-s-holly,[data-auth-template="retro-vintage"] .taj-s-pom{display:none}
[data-auth-template="retro-vintage"] .taj-s-dots{display:block}
`;

/* ── luxe deco sunburst rays (thin gold lines, generated once) ───── */
const SUNBURST_RAYS = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  const r1 = 76, r2 = 150;
  return {
    x1: 160 + Math.cos(a) * r1, y1: 160 + Math.sin(a) * r1,
    x2: 160 + Math.cos(a) * r2, y2: 160 + Math.sin(a) * r2,
    thin: i % 2 === 1,
  };
});

/* ── seasonal drifting motes (embers/snow/gold dust) ─────────────── */
const MOTES = Array.from({ length: 9 }, (_, i) => ({
  left: `${(i * 11 + 4) % 96}%`,
  size: i % 3 === 0 ? 5 : 3,
  duration: 11 + (i % 4) * 2.6,
  delay: -(i * 1.9),
}));

export type AuthBrand = {
  /** small tagline above the headline (defaults to the store tagline) */
  eyebrow?: string;
  /** big Persian headline on the brand side */
  headline: string;
  /** supporting paragraph */
  body?: string;
  /** feature bullets (register page) */
  points?: string[];
};

export function AuthShell({
  variant,
  templateId,
  accent,
  accent2,
  bg1,
  bg2,
  title,
  subtitle,
  brand,
  logo,
  children,
}: {
  variant: AuthVariant;
  templateId?: string;
  accent: string;
  accent2: string;
  bg1?: string;
  bg2?: string;
  title: string;
  subtitle: string;
  brand: AuthBrand;
  logo?: ReactNode;
  children: ReactNode;
}) {
  const rootStyle = {
    "--ta-accent": accent,
    "--ta-accent-2": accent2,
    ...(bg1 ? { "--ta-bg-1": bg1 } : {}),
    ...(bg2 ? { "--ta-bg-2": bg2 } : {}),
  } as CSSProperties;

  const eyebrow = brand.eyebrow ?? "آیندهٔ خرید دیجیتال";

  return (
    <section
      data-auth-variant={variant}
      data-auth-template={templateId ?? ""}
      className="taj-auth"
      style={rootStyle}
      aria-label={title}
    >
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />

      {/* decorative layer (variant background art) */}
      <div className="taj-decor" aria-hidden="true">
        {variant === "cyber" && (
          <>
            <i className="taj-orb taj-orb-a" />
            <i className="taj-orb taj-orb-b" />
            <div className="taj-c-grid" />
            <div className="taj-c-scan" />
            <div className="taj-c-beam" />
            <div className="taj-c-hud"><i /><i /><i /><i /></div>
          </>
        )}
        {(variant === "glass" || variant === "seasonal") && (
          <>
            <i className="taj-orb taj-orb-a" />
            <i className="taj-orb taj-orb-b" />
            {variant === "glass" && <i className="taj-orb taj-orb-c" />}
          </>
        )}
        {variant === "luxe" && <i className="taj-orb taj-orb-a" />}
        {variant === "seasonal" && (
          <div className="taj-motes">
            {MOTES.map((m, i) => (
              <i key={i} className="taj-mote" style={{ left: m.left, width: m.size, height: m.size, animationDuration: `${m.duration}s`, animationDelay: `${m.delay}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* form column (first grid cell = right side in RTL) */}
      <div className="taj-form-col">
        <div className="taj-form-wrap">
          <div className="taj-logo-row">
            {logo ?? <TAJLogo className="taj-f-logo justify-center w-full [&>span]:items-center" />}
          </div>
          <div className="taj-card">
            <h1 className="taj-title">{title}</h1>
            <p className="taj-sub">{subtitle}</p>
            {children}
            {variant === "cyber" && (
              <>
                <i className="taj-br taj-br-1" aria-hidden="true" />
                <i className="taj-br taj-br-2" aria-hidden="true" />
                <i className="taj-br taj-br-3" aria-hidden="true" />
                <i className="taj-br taj-br-4" aria-hidden="true" />
              </>
            )}
            {variant === "luxe" && <i className="taj-l-gem" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {/* brand column (left side in RTL, lg+) */}
      <aside className="taj-brand-col">
        <BrandStage variant={variant} brand={{ ...brand, eyebrow }} />
      </aside>
    </section>
  );
}

/* ═══ brand side — one bespoke composition per variant ═══ */

function BrandStage({ variant, brand }: { variant: AuthVariant; brand: AuthBrand }) {
  const copy = (
    <>
      <p className="taj-eyebrow">{brand.eyebrow}</p>
      <h2 className="taj-h2">{brand.headline}</h2>
      {brand.body && <p className="taj-bd-body">{brand.body}</p>}
      {brand.points && (
        <ul className="taj-points">
          {brand.points.map((p) => (
            <li key={p}><i aria-hidden="true" />{p}</li>
          ))}
        </ul>
      )}
    </>
  );

  switch (variant) {
    case "cyber":
      return (
        <div className="taj-bd">
          <div className="taj-c-art" aria-hidden="true">
            <span className="taj-c-ring taj-c-ring-3" />
            <span className="taj-c-ring taj-c-ring-1" />
            <span className="taj-c-ring taj-c-ring-2" />
            <span className="taj-c-chip taj-c-chip-1"><Zap size={13} /><b>240Hz</b></span>
            <span className="taj-c-chip taj-c-chip-2"><Cpu size={13} /><b>AI CORE</b></span>
            <span className="taj-c-chip taj-c-chip-3"><ShieldCheck size={13} /><b>SECURE</b></span>
            <TAJLogo className="taj-c-logo" />
          </div>
          {copy}
          <p className="taj-c-code" dir="ltr" aria-hidden="true">&gt; SYSTEM READY · LINK ENCRYPTED</p>
        </div>
      );

    case "glass":
      return (
        <div className="taj-bd">
          <TAJLogo className="taj-bd-logo" />
          <div className="taj-g-art" aria-hidden="true">
            <span className="taj-g-blob" />
            <span className="taj-g-tile taj-g-tile-1"><ShoppingCart size={30} /></span>
            <span className="taj-g-tile taj-g-tile-2"><Package size={36} /></span>
            <span className="taj-g-tile taj-g-tile-3"><Heart size={26} /></span>
          </div>
          {copy}
        </div>
      );

    case "luxe":
      return (
        <div className="taj-bd">
          <div className="taj-l-art" aria-hidden="true">
            <svg className="taj-l-sun" viewBox="0 0 320 320" focusable="false">
              <defs>
                <linearGradient id="tajLuxeGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F1D98A" />
                  <stop offset="1" stopColor="#B8890B" />
                </linearGradient>
              </defs>
              {SUNBURST_RAYS.map((r, i) => (
                <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="url(#tajLuxeGold)" strokeWidth={r.thin ? 0.8 : 1.6} opacity={r.thin ? 0.3 : 0.6} />
              ))}
              <circle cx="160" cy="160" r="72" fill="none" stroke="url(#tajLuxeGold)" strokeWidth="1" opacity="0.45" />
            </svg>
            <span className="taj-l-dia taj-l-dia-2" />
            <span className="taj-l-dia taj-l-dia-1" />
            <TAJLogo className="taj-l-logo" />
          </div>
          {copy}
        </div>
      );

    case "clean-light":
      return (
        <div className="taj-bd">
          <TAJLogo className="taj-bd-logo" />
          <div className="taj-cl-art" aria-hidden="true">
            <span className="taj-cl-sheet taj-cl-sheet-1" />
            <span className="taj-cl-sheet taj-cl-sheet-2" />
            <div className="taj-cl-sheet taj-cl-sheet-3">
              <span className="taj-cl-thumb" />
              <span className="taj-cl-bar taj-cl-bar-1" />
              <span className="taj-cl-bar taj-cl-bar-2" />
              <span className="taj-cl-bar taj-cl-bar-3" />
            </div>
          </div>
          {copy}
        </div>
      );

    case "market":
      return (
        <div className="taj-bd">
          <div className="taj-m-art">
            <span className="taj-m-chip taj-m-chip-1" aria-hidden="true"><Headphones size={22} /></span>
            <span className="taj-m-chip taj-m-chip-2" aria-hidden="true"><Smartphone size={22} /></span>
            <span className="taj-m-chip taj-m-chip-3" aria-hidden="true"><Watch size={22} /></span>
            <span className="taj-m-chip taj-m-chip-4" aria-hidden="true"><Gamepad2 size={22} /></span>
            <span className="taj-m-chip taj-m-chip-5" aria-hidden="true"><Camera size={22} /></span>
            <span className="taj-m-badge" aria-hidden="true">٪۲۰<small>تخفیف اعضا</small></span>
            <TAJLogo className="taj-m-logo" />
          </div>
          {copy}
        </div>
      );

    case "seasonal":
      return (
        <div className="taj-bd">
          <div className="taj-s-art" aria-hidden="true">
            <span className="taj-s-dots" />
            <span className="taj-s-leaf taj-s-leaf-1" />
            <span className="taj-s-leaf taj-s-leaf-2" />
            <span className="taj-s-leaf taj-s-leaf-3" />
            <span className="taj-s-pom taj-s-pom-1" />
            <span className="taj-s-pom taj-s-pom-2" />
            <svg className="taj-s-star taj-s-star-1" viewBox="0 0 24 24" focusable="false"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.2l1.3-6.6L2.5 9l6.6-.8z" /></svg>
            <svg className="taj-s-star taj-s-star-2" viewBox="0 0 24 24" focusable="false"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.2l1.3-6.6L2.5 9l6.6-.8z" /></svg>
            <svg className="taj-s-star taj-s-star-3" viewBox="0 0 24 24" focusable="false"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.2l1.3-6.6L2.5 9l6.6-.8z" /></svg>
            <span className="taj-s-holly taj-s-holly-1"><i /><i /><b /><b /><b /></span>
            <span className="taj-s-holly taj-s-holly-2"><i /><i /><b /><b /><b /></span>
            <TAJLogo className="taj-s-logo" />
          </div>
          {copy}
        </div>
      );
  }
}

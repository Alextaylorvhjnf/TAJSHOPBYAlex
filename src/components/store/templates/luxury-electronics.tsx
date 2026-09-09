"use client";

/**
 * TEMPLATE · luxury-electronics — «Black Gold Lux» (v32 full rewrite)
 * ---------------------------------------------------------------------
 * Rich near-black #0A0A0C stage, champagne-gold #D4AF37 / #C98A1B accents,
 * elegant serif display flourishes (Latin eyebrows — Persian stays Vazirmatn)
 * and generous whitespace.
 *
 * v32 ROOT-CAUSE FIX: the v30/v31 `.le-frame` drew its 1px luminous gold
 * gradient border with `mask-composite:exclude` ON THE ELEMENT ITSELF —
 * but a CSS mask applies to the element AND its descendants, so the whole
 * content box was masked out: hero slides, categories, showcases, the deals
 * band and exclusive cards all rendered as empty gold rings (the owner saw
 * «only products» — the le-glass product grids were the sole survivors).
 * The ring now lives on a CHILDLESS ::before overlay — content fully visible.
 *
 * v32 uplift: real hero SLIDER (crossfade + Ken-Burns zoom + thin gold
 * progress segments + auto-advance + arrows/dots, hover/focus pause),
 * luxury spotlight showcases with gold frame accents + ornament, refined
 * category gallery, gold shine sweep on premium product cards, serif
 * eyebrows, all motion prefers-reduced-motion safe, ≥44px targets, no
 * horizontal overflow at 360px.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Crown, Star, Package, Check, ChevronLeft, ChevronRight, Flame,
  BadgeCheck, Sparkles, Diamond, Megaphone, ArrowLeft, ShieldCheck, Timer,
} from "lucide-react";
import type { HomeData, TemplateProduct, TemplateSlide, TemplateStore } from "@/lib/templates/types";
import { RAIL_URLS } from "@/lib/templates/slide-targets";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ONE scoped style block — Black-Gold-Lux tokens, gold hairlines, sheen */
const LUX_GOLD_CSS = `
[data-tpl="luxury-electronics"]{
  --le-black:#0A0A0C;--le-panel:#101014;--le-gold:#D4AF37;--le-gold-2:#C98A1B;--le-champagne:#F3E5B8;
  --le-brd-soft:rgba(212,175,55,.22);
}
[data-tpl="luxury-electronics"] .le-glass{background:rgba(255,255,255,.028);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid var(--le-brd-soft);box-shadow:0 18px 55px -25px rgba(0,0,0,.85),inset 0 1px 0 rgba(243,229,184,.05)}
[data-tpl="luxury-electronics"] .le-glass-soft{background:rgba(255,255,255,.02);border:1px solid rgba(212,175,55,.16)}
/* v32 · gold frame — FIXED. The luminous 1px gradient ring sits on a
   CHILDLESS ::before overlay (mask tricks are safe on pseudo-elements with
   no descendants); the element itself only carries a soft gold-tinted panel
   + hairline border, so ALL content renders. */
[data-tpl="luxury-electronics"] .le-frame{position:relative;border-radius:1.4rem;background:linear-gradient(180deg,rgba(212,175,55,.07),rgba(212,175,55,.015));border:1px solid var(--le-brd-soft);transition:box-shadow .6s,border-color .6s}
[data-tpl="luxury-electronics"] .le-frame::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.15px;background:linear-gradient(160deg,rgba(212,175,55,.75),rgba(212,175,55,.12) 34%,rgba(201,138,27,.12) 62%,rgba(243,229,184,.6));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;pointer-events:none;z-index:5}
[data-tpl="luxury-electronics"] .le-frame:hover{box-shadow:0 0 34px -8px rgba(212,175,55,.45);border-color:rgba(212,175,55,.4)}
[data-tpl="luxury-electronics"] .le-gold-glow{color:var(--le-gold);text-shadow:0 0 20px rgba(212,175,55,.5),0 0 46px rgba(212,175,55,.24)}
[data-tpl="luxury-electronics"] .le-grad-text{background:linear-gradient(105deg,#F7EBC8 8%,#D4AF37 42%,#F3E5B8 62%,#C98A1B 96%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* v32 · serif display accents — Latin eyebrows/badges only (Persian text
   keeps the site's Vazirmatn; Georgia renders just the Latin flourishes) */
[data-tpl="luxury-electronics"] .le-serif{font-family:Georgia,"Times New Roman",Nimbus Roman,serif}
/* gold shimmer sweep on CTA */
[data-tpl="luxury-electronics"] .le-cta{position:relative;overflow:hidden;background:linear-gradient(135deg,#8A6A14 0%,#C98A1B 34%,#D4AF37 62%,#F3E5B8 100%);color:#171204;box-shadow:0 10px 34px -12px rgba(201,138,27,.75);transition:transform .5s,box-shadow .5s;letter-spacing:.08em}
[data-tpl="luxury-electronics"] .le-cta::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:le-sheen 4.6s ease-in-out infinite}
@keyframes le-sheen{0%,55%{left:-70%}100%{left:130%}}
[data-tpl="luxury-electronics"] .le-cta:hover{transform:translateY(-2px);box-shadow:0 14px 42px -12px rgba(212,175,55,.85)}
[data-tpl="luxury-electronics"] .le-btn-ghost{background:rgba(212,175,55,.05);border:1px solid rgba(212,175,55,.4);color:var(--le-champagne);letter-spacing:.08em;transition:all .5s}
[data-tpl="luxury-electronics"] .le-btn-ghost:hover{border-color:rgba(212,175,55,.85);box-shadow:0 0 26px -8px rgba(212,175,55,.5),inset 0 0 24px rgba(212,175,55,.08)}
/* product card — gold edge-light on hover (slow elegant) */
[data-tpl="luxury-electronics"] .le-card{position:relative;transition:transform .6s cubic-bezier(.19,.6,.22,1),box-shadow .6s,border-color .6s}
[data-tpl="luxury-electronics"] .le-card::before{content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;background:linear-gradient(180deg,rgba(212,175,55,.35),transparent 38%);box-shadow:inset 0 1px 0 rgba(243,229,184,.35),inset 0 0 34px -14px rgba(212,175,55,.55);transition:opacity .6s;pointer-events:none}
[data-tpl="luxury-electronics"] .le-card:hover{transform:translateY(-4px);border-color:rgba(212,175,55,.5);box-shadow:0 26px 64px -28px rgba(0,0,0,.9),0 0 40px -14px rgba(212,175,55,.35)}
[data-tpl="luxury-electronics"] .le-card:hover::before{opacity:1}
/* v32 · gold shine sweep across the artwork on hover */
[data-tpl="luxury-electronics"] .le-sweep{position:absolute;inset:0;pointer-events:none;background:linear-gradient(112deg,transparent 38%,rgba(243,229,184,.14) 49%,rgba(255,255,255,.32) 50%,rgba(243,229,184,.14) 51%,transparent 62%);transform:translateX(130%);transition:transform 1.15s cubic-bezier(.25,.6,.2,1)}
[data-tpl="luxury-electronics"] .le-card:hover .le-sweep{transform:translateX(-130%)}
/* slow rise entrance (fade/rise only — no bounce) */
[data-tpl="luxury-electronics"] .le-rise{animation:le-rise 1.1s cubic-bezier(.19,.6,.22,1) both}
@keyframes le-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
/* v32 · hero slider — Ken-Burns zoom + thin gold progress segments */
[data-tpl="luxury-electronics"] .le-kb{animation:le-kb 9s ease-out forwards}
@keyframes le-kb{from{transform:scale(1.01)}to{transform:scale(1.09)}}
[data-tpl="luxury-electronics"] .le-prog{position:relative;display:block;height:2px;width:2.25rem;border-radius:99px;background:rgba(212,175,55,.28);overflow:hidden}
@media (min-width:640px){[data-tpl="luxury-electronics"] .le-prog{width:3rem}}
[data-tpl="luxury-electronics"] .le-prog-fill{position:absolute;inset:0;transform-origin:100% 50%;transform:scaleX(0);background:linear-gradient(to left,rgba(201,138,27,.95),#F3E5B8);animation:le-fill var(--le-slide-ms,7s) linear forwards}
@keyframes le-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
[data-tpl="luxury-electronics"] .le-slider.le-paused .le-prog-fill{animation-play-state:paused}
/* breathing gold divider */
[data-tpl="luxury-electronics"] .le-scan{position:relative;height:1px;background:linear-gradient(to left,transparent,rgba(212,175,55,.5),rgba(243,229,184,.85),rgba(212,175,55,.5),transparent);overflow:visible}
[data-tpl="luxury-electronics"] .le-scan::after{content:"";position:absolute;top:-2px;left:0;width:56px;height:5px;background:linear-gradient(to left,transparent,rgba(243,229,184,.8),transparent);filter:blur(3px);animation:le-scan 9s linear infinite}
@keyframes le-scan{0%{left:-8%}100%{left:104%}}
/* rails + scrollbars */
[data-tpl="luxury-electronics"] .le-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="luxury-electronics"] .le-rail::-webkit-scrollbar{display:none}
[data-tpl="luxury-electronics"] .le-scroll{scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.4) transparent}
[data-tpl="luxury-electronics"] .le-scroll::-webkit-scrollbar{width:6px}
[data-tpl="luxury-electronics"] .le-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,55,.32);border-radius:99px}
[data-tpl="luxury-electronics"] .le-scroll::-webkit-scrollbar-track{background:transparent}
/* slow marquee */
[data-tpl="luxury-electronics"] .le-marquee{display:flex;width:max-content;animation:le-marquee var(--le-mq,38s) linear infinite;will-change:transform}
@keyframes le-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
/* ambient breathing halo (very slow) */
[data-tpl="luxury-electronics"] .le-halo{position:absolute;border-radius:9999px;filter:blur(80px);pointer-events:none;animation:le-breathe 16s ease-in-out infinite}
@keyframes le-breathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
/* faq */
[data-tpl="luxury-electronics"] .le-faq[open] .le-faq-ico{transform:rotate(180deg);color:var(--le-gold)}
[data-tpl="luxury-electronics"] .le-faq-ico{transition:transform .5s,color .5s}
[data-tpl="luxury-electronics"] :is(button,a,input,summary,[tabindex]):focus-visible{outline:1.5px solid rgba(212,175,55,.8);outline-offset:2px;border-radius:.5rem}
@media (prefers-reduced-motion:reduce){
  [data-tpl="luxury-electronics"] .le-cta::after,[data-tpl="luxury-electronics"] .le-rise,
  [data-tpl="luxury-electronics"] .le-scan::after,[data-tpl="luxury-electronics"] .le-marquee,
  [data-tpl="luxury-electronics"] .le-halo,[data-tpl="luxury-electronics"] .le-kb,
  [data-tpl="luxury-electronics"] .le-prog-fill{animation:none!important}
  [data-tpl="luxury-electronics"] .le-prog-fill{transform:scaleX(1)}
  [data-tpl="luxury-electronics"] .le-sweep{display:none}
  [data-tpl="luxury-electronics"] .le-card,[data-tpl="luxury-electronics"] .le-cta,
  [data-tpl="luxury-electronics"] .le-frame,[data-tpl="luxury-electronics"] .le-btn-ghost{transition:none!important}
}
/* v26fix · hero overlay token (inline style consumes it; identical dark value) */
[data-tpl="luxury-electronics"]{--le-hero-ov:linear-gradient(to top,#0A0A0C 2%,rgba(10,10,12,.8) 32%,rgba(10,10,12,.28) 68%,transparent)}
/* ══ v26fix · LIGHT SKIN (html:not(.dark)) — dark rules above stay untouched ══
   Ivory stage #F8F6EF / ink #26221A; gold → #A88416, deep gold → #8C6A12,
   champagne text → dark bronze #4A3A16; glass → white translucent. */
html:not(.dark) [data-tpl="luxury-electronics"]{
  --le-black:#F8F6EF;--le-panel:#FFFFFF;--le-gold:#A88416;--le-gold-2:#8C6A12;--le-champagne:#4A3A16;
  --le-brd-soft:rgba(140,106,18,.3);
  background:#F8F6EF;color:#26221A;
  --le-hero-ov:linear-gradient(to top,#FDFCF7 2%,rgba(253,252,247,.85) 32%,rgba(253,252,247,.3) 68%,transparent);
}
/* helpers — white glass, gold hairlines, softened glow */
html:not(.dark) [data-tpl="luxury-electronics"] .le-glass{box-shadow:0 18px 55px -30px rgba(38,34,26,.3),inset 0 1px 0 rgba(255,255,255,.9)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-glass-soft{background:rgba(255,255,255,.65);border-color:rgba(140,106,18,.22)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-frame{background:linear-gradient(180deg,rgba(168,132,22,.05),rgba(168,132,22,.02))}
html:not(.dark) [data-tpl="luxury-electronics"] .le-frame:hover{box-shadow:0 0 30px -10px rgba(168,132,22,.35)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-gold-glow{color:#A88416;text-shadow:0 0 16px rgba(212,175,55,.3)}
/* v29.2 FIX: background-image (not shorthand) — keeps background-clip:text */
html:not(.dark) [data-tpl="luxury-electronics"] .le-grad-text{background-image:linear-gradient(105deg,#4A3F1C 8%,#A88416 42%,#C9A227 62%,#8C6A12 96%)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-cta{box-shadow:0 10px 34px -12px rgba(140,106,18,.55)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-cta:hover{box-shadow:0 14px 42px -12px rgba(168,132,22,.6)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-btn-ghost{background:rgba(168,132,22,.06);border-color:rgba(140,106,18,.45);color:#4A3A16}
html:not(.dark) [data-tpl="luxury-electronics"] .le-btn-ghost:hover{border-color:rgba(140,106,18,.8);box-shadow:0 0 22px -8px rgba(168,132,22,.4),inset 0 0 20px rgba(168,132,22,.06)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-card:hover{border-color:rgba(168,132,22,.5);box-shadow:0 26px 64px -30px rgba(38,34,26,.35),0 0 40px -16px rgba(168,132,22,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-prog{background:rgba(140,106,18,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-prog-fill{background:linear-gradient(to left,rgba(140,106,18,.95),#A88416)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-scan{background:linear-gradient(to left,transparent,rgba(168,132,22,.45),rgba(201,162,39,.7),rgba(168,132,22,.45),transparent)}
html:not(.dark) [data-tpl="luxury-electronics"] .le-scroll{scrollbar-color:rgba(140,106,18,.4) transparent}
html:not(.dark) [data-tpl="luxury-electronics"] .le-scroll::-webkit-scrollbar-thumb{background:rgba(140,106,18,.35)}
html:not(.dark) [data-tpl="luxury-electronics"] :is(button,a,input,summary,[tabindex]):focus-visible{outline-color:rgba(140,106,18,.8)}
/* canvas / bands / tiles */
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#0A0A0C\\]{background-color:#F8F6EF}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#0E0E12\\]{background-color:#FFFFFF}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#0C0C10\\]{background-color:#FDFCF7}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#0A0A0C\\]\\/85{background-color:rgba(253,252,247,.92)}
html:not(.dark) [data-tpl="luxury-electronics"] .from-\\[\\#0A0A0C\\]\\/75{--tw-gradient-from:rgba(253,252,247,.78)}
html:not(.dark) [data-tpl="luxury-electronics"] .from-\\[\\#0A0A0C\\]\\/85{--tw-gradient-from:rgba(253,252,247,.88)}
/* cinematic overlays → ivory scrims (captions go ink via blanket) */
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_top\\,rgba\\(10\\,10\\,12\\,\\.92\\)\\,rgba\\(10\\,10\\,12\\,\\.25\\)_55\\%\\,transparent\\)\\]{background-image:linear-gradient(to top,rgba(253,252,247,.94),rgba(253,252,247,.4) 55%,transparent)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_top\\,rgba\\(10\\,10\\,12\\,\\.94\\)\\,rgba\\(10\\,10\\,12\\,\\.35\\)_55\\%\\,transparent\\)\\]{background-image:linear-gradient(to top,rgba(253,252,247,.96),rgba(253,252,247,.5) 55%,transparent)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_top\\,\\#0A0A0C_f2\\,\\#0A0A0C_66_35\\%\\,rgba\\(10\\,10\\,12\\,\\.25\\)_75\\%\\,transparent\\)\\]{background-image:linear-gradient(to top,rgba(253,252,247,.95) 2%,rgba(253,252,247,.4) 35%,rgba(253,252,247,.28) 75%,transparent)}
/* gold hairlines */
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_left\\,transparent\\,\\#D4AF37\\)\\]{background-image:linear-gradient(to left,transparent,rgba(168,132,22,.7))}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_right\\,transparent\\,\\#D4AF37\\)\\]{background-image:linear-gradient(to right,transparent,rgba(168,132,22,.7))}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[linear-gradient\\(to_left\\,transparent\\,\\#D4AF37\\,rgba\\(243\\,229\\,184\\,\\.95\\)\\,\\#C98A1B\\,transparent\\)\\]{background-image:linear-gradient(to left,transparent,rgba(168,132,22,.75),rgba(201,162,39,.8),rgba(140,106,18,.7),transparent)}
/* champagne text family → dark bronze on ivory */
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]{color:#4A3A16}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/90{color:rgba(74,58,22,.9)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/85{color:rgba(74,58,22,.87)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/80{color:rgba(74,58,22,.82)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/75{color:rgba(74,58,22,.78)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/70{color:rgba(74,58,22,.72)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/60{color:rgba(74,58,22,.62)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/55{color:rgba(74,58,22,.57)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/50{color:rgba(74,58,22,.52)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/45{color:rgba(74,58,22,.47)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/40{color:rgba(74,58,22,.42)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/35{color:rgba(74,58,22,.37)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#F3E5B8\\]\\/25{color:rgba(74,58,22,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .hover\\:text-\\[\\#F3E5B8\\]:hover{color:#8C6A12}
/* gold family */
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]{color:#A88416}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]\\/70{color:rgba(168,132,22,.72)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]\\/60{color:rgba(168,132,22,.62)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]\\/40{color:rgba(168,132,22,.42)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]\\/30{color:rgba(168,132,22,.35)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-\\[\\#D4AF37\\]\\/25{color:rgba(168,132,22,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .fill-\\[\\#D4AF37\\]{fill:#A88416}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]{background-color:#A88416}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/5{background-color:rgba(168,132,22,.06)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/8{background-color:rgba(168,132,22,.09)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/10{background-color:rgba(168,132,22,.11)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/12{background-color:rgba(168,132,22,.13)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/15{background-color:rgba(168,132,22,.16)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#D4AF37\\]\\/25{background-color:rgba(168,132,22,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-\\[\\#C98A1B\\]\\/10{background-color:rgba(140,106,18,.1)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/15{border-color:rgba(140,106,18,.2)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/20{border-color:rgba(140,106,18,.25)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/25{border-color:rgba(140,106,18,.3)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/30{border-color:rgba(140,106,18,.35)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/35{border-color:rgba(140,106,18,.4)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/40{border-color:rgba(140,106,18,.45)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/45{border-color:rgba(140,106,18,.5)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-\\[\\#D4AF37\\]\\/50{border-color:rgba(140,106,18,.55)}
html:not(.dark) [data-tpl="luxury-electronics"] .hover\\:border-\\[\\#D4AF37\\]\\/40:hover{border-color:rgba(140,106,18,.45)}
/* white/black utilities → ink alphas; dark scrims → ivory */
html:not(.dark) [data-tpl="luxury-electronics"] .text-white{color:#26221A}
html:not(.dark) [data-tpl="luxury-electronics"] .text-white\\/90{color:rgba(38,34,26,.92)}
html:not(.dark) [data-tpl="luxury-electronics"] .text-white\\/70{color:rgba(38,34,26,.72)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-white\\/15{border-color:rgba(38,34,26,.18)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-white\\/12{border-color:rgba(38,34,26,.15)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-white\\/10{border-color:rgba(38,34,26,.12)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-black\\/75{background-color:rgba(253,252,247,.92)}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-black\\/60{background-color:rgba(253,252,247,.9)}
/* emerald «added» state */
html:not(.dark) [data-tpl="luxury-electronics"] .text-emerald-300{color:#047857}
html:not(.dark) [data-tpl="luxury-electronics"] .bg-emerald-500\\/15{background-color:rgba(16,185,129,.14)}
html:not(.dark) [data-tpl="luxury-electronics"] .border-emerald-400\\/40{border-color:rgba(5,150,105,.4)}
/* deep shadows softened */
html:not(.dark) [data-tpl="luxury-electronics"] .shadow-\\[0_40px_90px_-40px_rgba\\(0\\,0\\,0\\,\\.95\\)\\]{--tw-shadow:0 40px 90px -40px rgba(38,34,26,.4);box-shadow:0 40px 90px -40px rgba(38,34,26,.4)}
html:not(.dark) [data-tpl="luxury-electronics"] .shadow-\\[0_0_20px_-4px_rgba\\(212\\,175\\,55\\,\\.5\\)\\]{--tw-shadow:0 0 20px -4px rgba(168,132,22,.4);box-shadow:0 0 20px -4px rgba(168,132,22,.4)}
html:not(.dark) [data-tpl="luxury-electronics"] .shadow-\\[inset_0_0_120px_rgba\\(0\\,0\\,0\\,\\.55\\)\\]{--tw-shadow:inset 0 0 120px rgba(38,34,26,.18);box-shadow:inset 0 0 120px rgba(38,34,26,.18)}
/* restores — text on surfaces that STAY colored in light mode */
html:not(.dark) [data-tpl="luxury-electronics"] .bg-rose-500.text-white,
html:not(.dark) [data-tpl="luxury-electronics"] .bg-orange-500.text-white,
html:not(.dark) [data-tpl="luxury-electronics"] .bg-violet-600.text-white,
html:not(.dark) [data-tpl="luxury-electronics"] .bg-emerald-500.text-white,
html:not(.dark) [data-tpl="luxury-electronics"] .bg-destructive.text-white{color:#fff}
`;

/* ── prefers-reduced-motion flag (useSyncExternalStore: subscription to
 *    the media query, no setState-in-effect) — SSR renders false, then the
 *    client snapshot takes over after hydration ─────────────────────── */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

/* ── hydration-safe elegant gold clock (per-product deadlines) ────── */
function GoldClock({ target }: { target: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, []);

  const diff = now !== null ? Math.max(0, target - now) : null;
  const cells = [
    diff === null ? 0 : Math.floor(diff / 3_600_000),
    diff === null ? 0 : Math.floor((diff % 3_600_000) / 60_000),
    diff === null ? 0 : Math.floor((diff % 60_000) / 1000),
  ];

  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-[#F3E5B8]/85 tabular-nums" role="timer" aria-label="زمان باقی‌مانده پیشنهاد ویژه">
      <Timer className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
      {diff !== null && diff === 0
        ? "پایان پیشنهاد"
        : cells.map((v) => toFaDigits(String(v).padStart(2, "0"))).join(" : ")}
      <span className="text-[9px] text-[#F3E5B8]/50">تا پایان</span>
    </span>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ──────── */
function useLuxAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = async (product: TemplateProduct) => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1400);
    } catch {
      /* toast handled by useCart */
    }
  };
  return { addToCart, added };
}

/* ── black-gold product card with edge-light + gold shine sweep ───── */
function LuxCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useLuxAdd();
  const target = product.discountEndsAt ? new Date(product.discountEndsAt).getTime() : null;

  return (
    <article className={cn("le-card le-glass group relative flex h-full flex-col overflow-hidden rounded-[1.4rem]", !product.inStock && "grayscale-[0.5]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-[3/4] overflow-hidden rounded-t-[1.4rem] bg-[#0E0E12]">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw" className="object-contain p-8 transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-[#D4AF37]/25"><Package className="h-12 w-12" aria-hidden /></span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C]/75 via-transparent to-transparent" />
        {/* v32 · gold shine sweep on hover */}
        <span aria-hidden className="le-sweep" />
        {product.discountPercent > 0 && (
          <span className="absolute start-4 top-4 rounded-full border border-[#D4AF37]/45 bg-[#0A0A0C]/85 px-3 py-1 text-[10px] font-black tracking-widest text-[#F3E5B8] shadow-[0_0_20px_-4px_rgba(212,175,55,.5)] backdrop-blur">
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-4 top-4 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-[10px] font-bold tracking-widest text-white/70 backdrop-blur">ناموجود</span>
        )}
      </Link>

      <div className="relative flex flex-1 flex-col border-t border-[#D4AF37]/15 p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#F3E5B8]/50">
          <BadgeCheck className="h-3 w-3 text-[#D4AF37]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-2 min-h-14 text-[15px] font-black leading-7 tracking-wide text-white/90 line-clamp-2 transition-colors duration-500 hover:text-[#F3E5B8]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-[#F3E5B8]/55 tabular-nums">
            <Star className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" aria-hidden />
            {product.rating.toLocaleString("fa-IR")} از ۵
          </p>
        )}
        {target !== null && product.discountPercent > 0 && (
          <p className="mt-2.5"><GoldClock target={target} /></p>
        )}
        <div className="mt-auto pt-5">
          {product.discountPercent > 0 && (
            <p className="text-[11px] leading-4 text-[#F3E5B8]/35 tabular-nums line-through">{formatPrice(product.price)}</p>
          )}
          <p className="le-gold-glow text-xl font-black tracking-wide tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-normal tracking-[0.15em] text-[#F3E5B8]/45">تومان</span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "mt-4 flex h-12 w-full items-center justify-center gap-2 text-xs font-black tracking-[0.15em] transition-all duration-500",
              product.inStock
                ? added
                  ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                  : "le-btn-ghost"
                : "cursor-not-allowed border border-white/10 text-[#F3E5B8]/25"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <Crown className="h-4 w-4" aria-hidden />}
            {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── ceremonial centered section header (serif eyebrow + hairlines) ─ */
function LuxHeader({ id, title, eyebrow, subtitle, href }: { id?: string; title: string; eyebrow?: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-12 text-center">
      {eyebrow && (
        <p className="le-serif mb-3 text-[9px] font-medium uppercase tracking-[0.42em] text-[#D4AF37]/60">{eyebrow}</p>
      )}
      <h2 id={id} className="le-grad-text text-[1.6rem] font-extrabold leading-snug tracking-[0.04em] md:text-[2rem]">{title}</h2>
      {subtitle && <p className="mt-2.5 text-[11px] tracking-[0.22em] text-[#F3E5B8]/45">{subtitle}</p>}
      <div className="mt-4 flex items-center justify-center gap-3" aria-hidden>
        <span className="h-px w-12 bg-[linear-gradient(to_left,transparent,#D4AF37)]" />
        <Diamond className="h-2.5 w-2.5 text-[#D4AF37]" />
        <span className="h-px w-12 bg-[linear-gradient(to_right,transparent,#D4AF37)]" />
      </div>
      {href && (
        <Link href={href} className="group mt-5 inline-flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-[#D4AF37] transition-colors duration-500 hover:text-[#F3E5B8]">
          مشاهده مجموعه
          <ChevronLeft className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── v32 · HERO SLIDER — cinematic black-gold stage ─────────────────
 * Full-bleed crossfading slides with a slow Ken-Burns zoom on the active
 * artwork, thin champagne-gold progress segments (auto-advance pacing),
 * prev/next arrows + clickable segments. Auto-advance pauses on hover and
 * keyboard focus; prefers-reduced-motion disables zoom/autoplay (the
 * active segment then renders full). No slides → designed static hero. */
const LE_SLIDE_MS = 7000;

function LuxHeroSlider({ slides, store, counts }: { slides: TemplateSlide[]; store: TemplateStore; counts: HomeData["counts"] }) {
  const count = slides.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const safeIdx = Math.min(idx, Math.max(0, count - 1));
  const s = slides[safeIdx] ?? null;

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % count), LE_SLIDE_MS);
    return () => window.clearInterval(t);
  }, [count, paused, reduced]);

  const go = (n: number) => setIdx(((n % count) + count) % count);

  return (
    <div
      className={cn(
        "le-slider le-frame relative isolate h-[420px] overflow-hidden rounded-[2.5rem] shadow-[0_40px_90px_-40px_rgba(0,0,0,.95)] sm:h-[560px]",
        paused && "le-paused"
      )}
      role="region"
      aria-roledescription="اسلایدر"
      aria-label="اسلایدر اصلی فروشگاه"
      style={{ "--le-slide-ms": `${LE_SLIDE_MS}ms` } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {s ? (
        <>
          {/* artworks — stacked crossfade + Ken-Burns zoom on the active one */}
          {slides.map((sl, i) => (
            <div
              key={sl.id}
              aria-hidden={i !== safeIdx}
              className={cn("absolute inset-0 transition-opacity duration-[1100ms] ease-out", i === safeIdx ? "z-[1] opacity-100" : "z-0 opacity-0")}
            >
              <div className={cn("h-full w-full transition-transform duration-[1000ms] ease-out", i === safeIdx && !reduced && "le-kb")}>
                <SlideArt slide={sl} sizes="96vw" priority={i === 0} className="object-cover" />
              </div>
            </div>
          ))}

          {/* cinematic scrim + vignette */}
          <span aria-hidden className="absolute inset-0 z-[2] bg-[linear-gradient(to_top,#0A0A0C_f2,#0A0A0C_66_35%,rgba(10,10,12,.25)_75%,transparent)]" style={{ background: "var(--le-hero-ov)" }} />
          <span aria-hidden className="absolute inset-0 z-[2] shadow-[inset_0_0_120px_rgba(0,0,0,.55)]" />
          {/* bottom gold hairline */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 z-[6] h-0.5 bg-[linear-gradient(to_left,transparent,#D4AF37,rgba(243,229,184,.95),#C98A1B,transparent)]" />

          {/* slide counter — top end */}
          {count > 1 && (
            <span className="le-glass absolute end-5 top-5 z-[6] flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold tracking-[0.15em] text-[#F3E5B8] tabular-nums">
              <Diamond className="h-2.5 w-2.5 text-[#D4AF37]" aria-hidden />
              {toFaDigits(String(safeIdx + 1).padStart(2, "0"))}
              <span className="text-[#F3E5B8]/40" aria-hidden>/</span>
              {toFaDigits(String(count).padStart(2, "0"))}
            </span>
          )}

          {/* prev / next (RTL: forward points start→end = right→left) */}
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(safeIdx + 1)} aria-label="اسلاید بعدی" className="le-glass absolute end-5 top-1/2 z-[6] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-[#F3E5B8] opacity-40 transition-all duration-500 hover:opacity-100 focus-visible:opacity-100">
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" onClick={() => go(safeIdx - 1)} aria-label="اسلاید قبلی" className="le-glass absolute start-5 top-1/2 z-[6] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-[#F3E5B8] opacity-40 transition-all duration-500 hover:opacity-100 focus-visible:opacity-100">
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}

          {/* slide content */}
          <div key={`content-${safeIdx}`} className="le-rise absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center px-6 pb-20 text-center sm:pb-24">
            <p className="le-glass le-serif mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#F3E5B8]">
              <Crown className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
              {store.storeNameEn || store.storeName}
            </p>
            <h1 id="le-hero" className="le-grad-text max-w-2xl text-3xl font-black leading-[1.45] tracking-wide sm:text-4xl md:text-5xl">
              {s.title}
            </h1>
            {s.subtitle && (
              <p className="mt-4 max-w-lg text-sm leading-8 text-[#F3E5B8]/60">{s.subtitle}</p>
            )}
            <Link
              href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
              className="le-cta mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-black"
            >
              {s.ctaText ?? "مشاهده مجموعه"}
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* thin gold progress segments (auto-advance pacing · clickable) */}
          {count > 1 && (
            <div className="absolute inset-x-0 bottom-6 z-[6] flex items-center justify-center gap-1.5 px-4">
              {slides.map((sl, i) => (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`نمایش اسلاید ${toFaDigits(String(i + 1))}`}
                  aria-current={i === safeIdx}
                  className="flex h-11 items-center px-0.5"
                >
                  <span className={cn("le-prog", i === safeIdx && "le-prog-on")}>
                    {i === safeIdx && <span key={`fill-${safeIdx}`} className="le-prog-fill" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        /* no slides configured — designed static gold stage */
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <span aria-hidden className="le-halo -start-10 top-10 h-56 w-56 bg-[#D4AF37]/15" />
          <span aria-hidden className="le-halo -end-10 bottom-10 h-56 w-56 bg-[#C98A1B]/10" style={{ animationDelay: "-7s" }} />
          <p className="le-glass le-serif mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#F3E5B8]">
            <Crown className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            {store.storeNameEn || store.storeName}
          </p>
          <h1 id="le-hero" className="le-grad-text max-w-2xl text-3xl font-black leading-[1.45] tracking-wide sm:text-4xl md:text-5xl">
            تجربه‌ای لوکس از الکترونیکس
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-8 text-[#F3E5B8]/60">
            {store.announcementActive && store.announcement
              ? store.announcement
              : `گزیده‌ی ${toFaDigits(String(counts.products))} محصول لوکس از ${toFaDigits(String(counts.brands))} برند معتبر جهانی.`}
          </p>
          <Link href="/products" className="le-cta mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-black">
            مشاهده مجموعه
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── TEMPLATE ─────────────────────────────────────────────────────── */
export function LuxuryElectronicsTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const dealClock = [...data.discounted].find((p) => p.discountEndsAt) ?? null;
  const dealClockTarget = dealClock?.discountEndsAt ? new Date(dealClock.discountEndsAt).getTime() : null;

  /* v20 ticker messages → announcement fallback; v22 tickerSpeed */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink }]
        : [];
  const mqDur = store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 34;

  const chrome = TEMPLATE_CHROME["luxury-electronics"];

  return (
    <div data-template-chrome="1" data-tpl="luxury-electronics" className="isolate w-full bg-[#0A0A0C] text-white">
      <style>{LUX_GOLD_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* top blend from theme chrome into black gold */}
      <div aria-hidden className="pointer-events-none h-10 w-full bg-gradient-to-b from-background to-transparent" />

      {/* ═══ TICKER — gold broadcast strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیه فروشگاه" className="mx-auto w-full max-w-[1440px] px-4 pb-3 pt-1">
          <div className="le-glass-soft flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2">
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black tracking-[0.15em] text-[#D4AF37]">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              اخبار لوکس
            </span>
            <span className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
              <span className="le-marquee" style={{ "--le-mq": `${mqDur}s` } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex shrink-0 items-center gap-10 pe-10" aria-hidden={dup === 1}>
                    {tickerMsgs.map((m, i) => (
                      <Link key={`${dup}-${i}`} href={m.link ?? "/products"} tabIndex={dup === 1 ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[11.5px] font-bold tracking-wide text-[#F3E5B8]/70 transition-colors duration-500 hover:text-[#F3E5B8]">
                        <Diamond className="h-2.5 w-2.5 text-[#D4AF37]/70" aria-hidden />
                        {m.text}
                      </Link>
                    ))}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </section>
      )}

      {/* ═══ HERO SLIDER — cinematic black-gold stage (v32) ═══ */}
      <section className="relative mx-auto w-full max-w-[1440px] px-4 pt-2" aria-labelledby="le-hero">
        <LuxHeroSlider slides={data.slides} store={store} counts={counts} />
      </section>

      {/* ═══ STORIES ═══ */}
      {stories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-label="استوری‌های فروشگاه">
          <Reveal>
            <div className="le-glass rounded-[2rem] p-4 sm:p-5" style={{ "--background": "var(--le-black)" } as React.CSSProperties}>
              <p className="mb-3 flex items-center gap-2 text-sm font-black tracking-wide text-[#F3E5B8]">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                ویترین استوری
              </p>
              <StoriesRow stories={stories} />
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ CATEGORIES — refined gold-frame gallery ═══ */}
      {data.categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-cats">
          <Reveal>
            <LuxHeader id="le-cats" eyebrow="La Galerie" title="دسته‌بندی‌های لوکس" subtitle="گزیده گالری" href="/products" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {data.categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="le-frame group relative block overflow-hidden rounded-[1.4rem]">
                  <span className="relative block aspect-[4/5] w-full overflow-hidden bg-[#0E0E12]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 30vw, 16vw" className="object-cover opacity-75 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-lg font-black text-[#D4AF37]/30">{c.name.charAt(0)}</span>
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C]/85 via-[#0A0A0C]/20 to-transparent" />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 z-[6] flex flex-col items-center gap-0.5 p-2.5 text-center">
                    <span className="w-full truncate text-[11.5px] font-bold text-[#F3E5B8]/90">{c.name}</span>
                    <span className="text-[9.5px] text-[#F3E5B8]/45 tabular-nums">{toFaDigits(String(c.productCount))} کالا</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ DEALS — gold salon band ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-label="پیشنهادهای ویژه">
          <Reveal>
            <div className="le-frame relative overflow-hidden rounded-[1.75rem]">
              <div className="relative bg-[#0C0C10] p-6 md:p-8">
                <span aria-hidden className="le-halo -start-14 -top-16 h-48 w-48 bg-[#D4AF37]/12" />
                <Crown aria-hidden className="absolute -bottom-8 -end-8 h-44 w-44 rotate-12 text-[#D4AF37]/[0.06]" strokeWidth={0.8} />
                <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <span className="le-gold-glow grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/8">
                    <Flame className="h-7 w-7" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="le-serif text-[10px] font-bold uppercase tracking-[0.35em] text-[#D4AF37]">L&apos;Offre Dorée</p>
                    <h3 className="mt-1 text-lg font-black tracking-wide text-white md:text-xl">
                      {toFaDigits(String(data.discounted.length))} قلم منتخب با قیمت ویژه
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-[#F3E5B8]/45">
                      فرصتی محدود برای تکمیل مجموعه لوکس شما — با گارانتی رسمی و اصالت تضمینی.
                    </p>
                    {dealClockTarget !== null && (
                      <p className="mt-3"><GoldClock target={dealClockTarget} /></p>
                    )}
                  </div>
                  <Link href="/products?discount=1" className="le-cta flex h-12 shrink-0 items-center gap-2 rounded-xl px-7 text-sm font-black">
                    دیدن همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FEATURED — flagship gold grid ═══ */}
      {data.featured.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-featured">
          <Reveal>
            <LuxHeader id="le-featured" eyebrow="La Vitrine" title="گزیده ویترین" subtitle="انتخاب سرآشپز" href={RAIL_URLS.featured} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.featured.slice(0, 8).map((p) => <LuxCard key={p.id} product={p} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ DISCOUNTED — salon of gold edge-light cards ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-deals-grid">
          <Reveal>
            <LuxHeader id="le-deals-grid" eyebrow="Le Salon" title="مجموعه طلایی" subtitle="قیمت‌های ویژه" href="/products?discount=1" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.discounted.slice(0, 8).map((p) => <LuxCard key={p.id} product={p} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EXCLUSIVE — ceremonial band ═══ */}
      {data.exclusive.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-exclusive">
          <Reveal>
            <LuxHeader id="le-exclusive" eyebrow="L'Exclusif" title="انحصاری‌های تاج" subtitle="فقط برای شما" />
            <div className="grid gap-4 md:grid-cols-2">
              {data.exclusive.slice(0, 2).map((p) => (
                <article key={p.id} className="le-frame group relative overflow-hidden rounded-[1.75rem]">
                  <div className="relative flex flex-col bg-[#0C0C10] sm:flex-row">
                    <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square w-full shrink-0 bg-[#0E0E12] sm:w-[46%]">
                      {p.mainImage ? (
                        <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, 28vw" className="object-contain p-8 transition-transform duration-[900ms] group-hover:scale-[1.04]" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-[#D4AF37]/25"><Package className="h-14 w-14" aria-hidden /></span>
                      )}
                      <span aria-hidden className="le-sweep" />
                      <span className="le-gold-glow absolute start-4 top-4 z-[6] rounded-full border border-[#D4AF37]/40 bg-[#0A0A0C]/85 px-3 py-1 text-[10px] font-black tracking-widest backdrop-blur">انحصاری</span>
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-6">
                      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#F3E5B8]/50">
                        <BadgeCheck className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                        {p.brand.name}
                      </p>
                      <Link href={`/products/${p.slug}`} className="mt-1.5 text-lg font-black leading-8 tracking-wide text-white line-clamp-2 transition-colors duration-500 hover:text-[#F3E5B8]">
                        {p.name}
                      </Link>
                      <p className="le-gold-glow mt-3 text-xl font-black tracking-wide tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="ms-1 text-[11px] font-normal tracking-[0.15em] text-[#F3E5B8]/45">تومان</span>
                      </p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {p.rating > 0 && (
                          <li className="le-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-[#F3E5B8]/80">
                            <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37]" aria-hidden />
                            {p.rating.toLocaleString("fa-IR")} از ۵
                          </li>
                        )}
                        {p.soldCount > 0 && (
                          <li className="le-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-[#F3E5B8]/60 tabular-nums">
                            {toFaDigits(String(p.soldCount))} فروش
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ BESTSELLERS — ranked rail ═══ */}
      {data.bestsellers.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-best">
          <Reveal>
            <LuxHeader id="le-best" eyebrow="Les Préférés" title="محبوب‌ترین‌ها" subtitle="انتخاب مشتریان" />
            <div className="le-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {data.bestsellers.slice(0, 10).map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="le-card le-glass group flex w-[230px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.4rem]">
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-t-[1.4rem] bg-[#0E0E12]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="230px" className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-[#D4AF37]/25"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span aria-hidden className="le-sweep" />
                    <span aria-hidden className={cn("absolute start-3 top-3 grid h-10 w-10 place-items-center rounded-xl border text-sm font-black tabular-nums", i < 3 ? "border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#F3E5B8] shadow-[0_0_18px_-2px_rgba(212,175,55,.4)]" : "border-white/12 bg-black/60 text-[#F3E5B8]/50")}>
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="min-h-11 text-[12.5px] font-bold leading-5 text-[#F3E5B8]/85 line-clamp-2">{p.name}</span>
                    <span className="mt-1 text-[10px] text-[#F3E5B8]/45 tabular-nums">{toFaDigits(String(p.soldCount))} فروش</span>
                    <span className="le-gold-glow mt-auto pt-2 text-[13.5px] font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-[#F3E5B8]/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ NEWEST — تازه‌های سالن ═══ */}
      {data.newest.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-newest">
          <Reveal>
            <LuxHeader id="le-newest" eyebrow="Les Nouveautés" title="تازه‌رسیده‌ها" subtitle="جدیدترین‌های سالن" href={RAIL_URLS.newest} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.newest.slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="le-card le-glass group flex flex-col overflow-hidden rounded-[1.4rem]">
                  <span className="relative block aspect-square overflow-hidden rounded-t-[1.4rem] bg-[#0E0E12]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 50vw, 24vw" className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-[#D4AF37]/25"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span aria-hidden className="le-sweep" />
                    <span className="absolute end-3 top-3 rounded-full border border-[#D4AF37]/40 bg-[#0A0A0C]/85 px-2.5 py-1 text-[9.5px] font-black tracking-widest text-[#F3E5B8] backdrop-blur">جدید</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="text-[10.5px] tracking-[0.15em] text-[#F3E5B8]/45">{p.brand.name}</span>
                    <span className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-[#F3E5B8]/85 line-clamp-2">{p.name}</span>
                    <span className="mt-auto pt-2 text-[13.5px] font-black text-[#F3E5B8] tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-[#F3E5B8]/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ SHOWCASES — luxury spotlight cards (gold frame accents) ═══ */}
      {data.showcases.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-label="نمایشگاه ویژه">
          <Reveal>
            <LuxHeader id="le-pavillon" eyebrow="Le Pavillon" title="نمایشگاه ویژه" subtitle="پیشنهادهای نمایشگاهی" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {data.showcases.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="le-frame group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[1.75rem]"
                >
                  <Image src={s.image} alt={s.title} fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]" loading="lazy" />
                  <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,12,.94),rgba(10,10,12,.35)_55%,transparent)]" />
                  <span aria-hidden className="le-sweep" />
                  {/* gold ornament — center medallion over the frame edge */}
                  <span aria-hidden className="absolute left-1/2 top-4 z-[6] grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-[#D4AF37]/45 bg-[#0A0A0C]/85 text-[#D4AF37] shadow-[0_0_20px_-4px_rgba(212,175,55,.5)] backdrop-blur">
                    <Diamond className="h-3.5 w-3.5" />
                  </span>
                  <div className="relative z-[6] p-6">
                    <h3 className="text-lg font-black tracking-wide text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-6 text-[#F3E5B8]/60">{s.subtitle}</p>}
                    <span className="le-gold-glow mt-3 inline-flex items-center gap-1 text-xs font-black tracking-[0.15em]">
                      مشاهده
                      <ChevronLeft className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ TRUST — gold crest strip ═══ */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-label="خدمات ویژه">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "اصالت تضمینی", d: "گارانتی رسمی و خدمات پس از فروش ویژه" },
              { icon: Crown, t: "تجربه لوکس", d: "مشاوره اختصاصی انتخاب محصولات پریمیوم" },
              { icon: Diamond, t: "بسته‌بندی امضایی", d: "پک هدیه طلایی تاج، رایگان روی سفارش‌ها" },
            ].map((f) => (
              <div key={f.t} className="le-glass-soft flex items-start gap-3 rounded-2xl p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/8 text-[#D4AF37]">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black tracking-wide text-[#F3E5B8]/90">{f.t}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#F3E5B8]/45">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══ BRANDS — slow gold marquee ═══ */}
      {data.brands.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-label="برندهای همکار">
          <Reveal>
            <div className="le-glass rounded-[2rem] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black tracking-wide text-[#F3E5B8]">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </span>
                برندهای امضادار
                <span className="le-serif hidden text-[9px] font-medium uppercase tracking-[0.35em] text-[#D4AF37]/50 sm:inline">Maisons Partenaires</span>
                <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 text-[10px] font-bold text-[#F3E5B8]/60 tabular-nums">
                  {toFaDigits(String(data.brands.length))} برند
                </span>
              </div>
              <div className="overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_5%,black_95%,transparent)]">
                <div className="le-marquee" style={{ "--le-mq": "36s" } as React.CSSProperties}>
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex shrink-0 gap-3 pe-3" aria-hidden={dup === 1}>
                      {data.brands.map((b) => (
                        <Link
                          key={`${dup}-${b.id}`}
                          href={`/products?brand=${b.slug}`}
                          tabIndex={dup === 1 ? -1 : undefined}
                          className="le-glass-soft flex h-12 shrink-0 items-center gap-2 rounded-full pe-5 ps-1.5 transition-colors duration-500 hover:border-[#D4AF37]/40"
                        >
                          <span className="relative h-9 w-9 overflow-hidden rounded-full border border-[#D4AF37]/20 bg-[#0E0E12]">
                            {b.logo || b.image ? (
                              <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="36px" className="object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[11px] font-black text-[#D4AF37]/40">{b.name.charAt(0)}</span>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-xs font-bold tracking-wide text-[#F3E5B8]/75">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FAQ — elegant accordion ═══ */}
      {data.faq.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16" aria-labelledby="le-faq">
          <Reveal>
            <LuxHeader id="le-faq" eyebrow="Le Concierge" title="پرسش‌های متداول" subtitle="پاسخ‌های شفاف" />
            <div className="grid gap-3 lg:grid-cols-2">
              {data.faq.map((f, i) => (
                <details key={i} className="le-faq le-glass-soft group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold tracking-wide text-[#F3E5B8]/85 [&::-webkit-details-marker]:hidden">
                    {f.h}
                    <ChevronLeft className="le-faq-ico h-4 w-4 shrink-0 text-[#D4AF37]/60" aria-hidden />
                  </summary>
                  <p className="mt-3 border-t border-[#D4AF37]/15 pt-3 text-[12px] leading-7 text-[#F3E5B8]/55">{f.p}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!hasAnyProduct && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-16">
          <div className="le-glass rounded-[2rem] border-dashed p-16 text-center">
            <Crown className="mx-auto mb-4 h-12 w-12 text-[#D4AF37]/40" aria-hidden />
            <h2 className="text-lg font-black tracking-wide text-[#F3E5B8]/85">سالن در حال آماده‌سازی است</h2>
            <p className="mt-2 text-sm leading-7 text-[#F3E5B8]/45">مجموعه لوکس به‌زودی رونمایی می‌شود…</p>
            <Link href="/products" className="le-cta mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
              مشاهده همه محصولات
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CLOSING — gold divider + bottom blend ═══ */}
      <div aria-hidden className="le-scan mx-auto mt-16 max-w-3xl" />
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-transparent to-background" />

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

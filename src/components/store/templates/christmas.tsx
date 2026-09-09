"use client";

/**
 * TEMPLATE · christmas — «Winter Cyber» (v25 full rewrite)
 * ---------------------------------------------------------
 * Deep polar-night #0B1420 canvas, ice-glass panels (backdrop-blur,
 * rgba(255,255,255,.06) + 1px white/20 hairlines), neon ice-cyan #67E8F9
 * and festive red #EF4444 glow accents. Signature = an animated AURORA
 * BOREALIS band breathing across the hero + deterministic CSS snowfall,
 * gift-cards wrapped in NEON ribbons and a «تا کریسمس» countdown HUD.
 * Registered features (Admin → ظاهر): timer + snow — both gated via
 * feat(); v25: store.timerEndsAt (when set) overrides every countdown.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Snowflake, Gift, Package, Star, Sparkles, Check, ChevronLeft,
  Flame, HelpCircle, BadgeCheck, Bell, Timer, Clock, ShieldCheck,
  Truck, Megaphone, ArrowLeft,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
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

/* ONE scoped style block — Winter-Cyber tokens, ice glass, aurora, snow */
const WINTER_CYBER_CSS = `
[data-tpl="christmas"]{
  --wc-night:#0B1420;--wc-night-2:#0E1A28;--wc-ice:#67E8F9;--wc-red:#EF4444;
  --wc-glass:rgba(255,255,255,.06);--wc-brd:rgba(255,255,255,.2);--wc-brd-soft:rgba(255,255,255,.12);
}
[data-tpl="christmas"] .wc-glass{background:var(--wc-glass);-webkit-backdrop-filter:blur(22px) saturate(140%);backdrop-filter:blur(22px) saturate(140%);border:1px solid var(--wc-brd);box-shadow:0 18px 50px -22px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08)}
[data-tpl="christmas"] .wc-glass-soft{background:rgba(255,255,255,.035);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--wc-brd-soft)}
[data-tpl="christmas"] .wc-ice-glow{color:var(--wc-ice);text-shadow:0 0 18px rgba(103,232,249,.55),0 0 42px rgba(103,232,249,.28)}
[data-tpl="christmas"] .wc-red-glow{color:var(--wc-red);text-shadow:0 0 16px rgba(239,68,68,.6),0 0 40px rgba(239,68,68,.3)}
[data-tpl="christmas"] .wc-grad-text{background:linear-gradient(100deg,#FFFFFF 12%,var(--wc-ice) 55%,#A5F3FC 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* aurora borealis — hue-shifting blurred band breathing across the hero */
[data-tpl="christmas"] .wc-aurora{position:absolute;left:-10%;right:-10%;top:-90px;height:260px;background:linear-gradient(90deg,transparent 4%,rgba(103,232,249,.55) 28%,rgba(167,139,250,.42) 52%,rgba(52,211,153,.35) 72%,transparent 96%);filter:blur(52px);mix-blend-mode:screen;animation:wc-aurora 14s ease-in-out infinite alternate;pointer-events:none}
[data-tpl="christmas"] .wc-aurora-2{position:absolute;left:-8%;right:-8%;top:-30px;height:170px;background:linear-gradient(90deg,transparent 10%,rgba(239,68,68,.28) 40%,rgba(103,232,249,.34) 66%,transparent 92%);filter:blur(58px);mix-blend-mode:screen;animation:wc-aurora 19s ease-in-out -6s infinite alternate-reverse;pointer-events:none}
@keyframes wc-aurora{0%{transform:translateX(-7%) skewY(-4deg) scaleY(.95)}50%{transform:translateX(2%) skewY(1deg) scaleY(1.12)}100%{transform:translateX(7%) skewY(3deg) scaleY(.92)}}
/* deterministic snowfall — GPU dots, drift + randomized-feel delays */
[data-tpl="christmas"] .wc-snow{position:absolute;top:-3vh;border-radius:9999px;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(165,243,252,.55) 68%,transparent 72%);box-shadow:0 0 8px rgba(165,243,252,.7);opacity:var(--wc-o,.8);animation:wc-fall var(--wc-dur,12s) linear var(--wc-delay,0s) infinite;will-change:transform;pointer-events:none}
@keyframes wc-fall{0%{transform:translate3d(0,-6vh,0)}100%{transform:translate3d(var(--wc-drift,20px),108vh,0)}}
/* HUD corner brackets */
[data-tpl="christmas"] .wc-hud{position:relative}
[data-tpl="christmas"] .wc-hud::before,[data-tpl="christmas"] .wc-hud::after{content:"";position:absolute;width:22px;height:22px;border-color:rgba(103,232,249,.55);border-style:solid;pointer-events:none}
[data-tpl="christmas"] .wc-hud::before{top:10px;left:10px;border-width:1.5px 0 0 1.5px}
[data-tpl="christmas"] .wc-hud::after{bottom:10px;right:10px;border-width:0 1.5px 1.5px 0}
/* neon ribbon on gift cards */
[data-tpl="christmas"] .wc-ribbon-v{position:absolute;top:0;bottom:0;left:50%;width:7%;transform:translateX(-50%);background:linear-gradient(to right,rgba(239,68,68,.15),#EF4444,rgba(255,255,255,.85),#EF4444,rgba(239,68,68,.15));box-shadow:0 0 16px rgba(239,68,68,.55);opacity:.85;pointer-events:none}
[data-tpl="christmas"] .wc-ribbon-h{position:absolute;left:0;right:0;top:38%;height:7%;background:linear-gradient(to bottom,rgba(239,68,68,.15),#EF4444,rgba(255,255,255,.85),#EF4444,rgba(239,68,68,.15));box-shadow:0 0 16px rgba(239,68,68,.55);opacity:.85;pointer-events:none}
/* countdown HUD cell */
[data-tpl="christmas"] .wc-cell{display:flex;flex-direction:column;align-items:center;min-width:3.25rem;padding:.4rem .35rem;border-radius:.9rem;background:rgba(103,232,249,.07);border:1px solid rgba(103,232,249,.32);box-shadow:inset 0 0 18px rgba(103,232,249,.12),0 0 22px -6px rgba(103,232,249,.4)}
[data-tpl="christmas"] .wc-cell b{font-size:.95rem;font-weight:900;line-height:1;letter-spacing:.05em;color:var(--wc-ice);text-shadow:0 0 14px rgba(103,232,249,.7);font-variant-numeric:tabular-nums}
/* scanline divider with travelling shimmer */
[data-tpl="christmas"] .wc-scan{position:relative;height:1px;background:linear-gradient(to left,transparent,rgba(103,232,249,.5),rgba(255,255,255,.9),rgba(239,68,68,.5),transparent);overflow:visible}
[data-tpl="christmas"] .wc-scan::after{content:"";position:absolute;top:-2px;left:0;width:70px;height:5px;background:linear-gradient(to left,transparent,rgba(165,243,252,.85),transparent);filter:blur(3px);animation:wc-scan 5.5s linear infinite}
@keyframes wc-scan{0%{left:-8%}100%{left:104%}}
/* cyan CTA with animated gradient halo */
[data-tpl="christmas"] .wc-cta{position:relative;background:linear-gradient(135deg,#0E7490 0%,#0891B2 48%,#67E8F9 100%);color:#03131A;box-shadow:0 0 24px -4px rgba(103,232,249,.65),0 12px 32px -12px rgba(8,145,178,.7);transition:transform .3s,box-shadow .3s}
[data-tpl="christmas"] .wc-cta:hover{transform:translateY(-2px);box-shadow:0 0 34px 0 rgba(103,232,249,.8),0 16px 40px -12px rgba(8,145,178,.75)}
[data-tpl="christmas"] .wc-btn-ghost{background:rgba(255,255,255,.05);border:1px solid rgba(239,68,68,.4);color:#FECACA;box-shadow:inset 0 0 20px rgba(239,68,68,.12);transition:all .3s}
[data-tpl="christmas"] .wc-btn-ghost:hover{border-color:rgba(239,68,68,.8);box-shadow:0 0 24px -6px rgba(239,68,68,.7),inset 0 0 24px rgba(239,68,68,.18)}
/* rails + scrollbars */
[data-tpl="christmas"] .wc-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="christmas"] .wc-rail::-webkit-scrollbar{display:none}
[data-tpl="christmas"] .wc-scroll{scrollbar-width:thin;scrollbar-color:rgba(103,232,249,.35) transparent}
[data-tpl="christmas"] .wc-scroll::-webkit-scrollbar{width:6px}
[data-tpl="christmas"] .wc-scroll::-webkit-scrollbar-thumb{background:rgba(103,232,249,.3);border-radius:99px}
[data-tpl="christmas"] .wc-scroll::-webkit-scrollbar-track{background:transparent}
/* marquee ticker */
[data-tpl="christmas"] .wc-marquee{display:flex;width:max-content;animation:wc-marquee var(--wc-mq,18s) linear infinite;will-change:transform}
@keyframes wc-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
/* gift-card hover: lift + neon edge */
[data-tpl="christmas"] .wc-card{transition:transform .35s cubic-bezier(.2,.7,.3,1),box-shadow .35s,border-color .35s}
[data-tpl="christmas"] .wc-card:hover{transform:translateY(-5px);border-color:rgba(103,232,249,.45);box-shadow:0 24px 60px -24px rgba(0,0,0,.8),0 0 30px -10px rgba(103,232,249,.4),inset 0 1px 0 rgba(255,255,255,.1)}
/* floating + blinking */
[data-tpl="christmas"] .wc-float{animation:wc-float 7s ease-in-out infinite}
[data-tpl="christmas"] .wc-blink{animation:wc-blink 2.4s ease-in-out infinite}
@keyframes wc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
@keyframes wc-blink{0%,100%{opacity:1}50%{opacity:.3}}
[data-tpl="christmas"] .wc-pulse{animation:wc-pulse 2.6s ease-in-out infinite}
@keyframes wc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(103,232,249,.5)}55%{box-shadow:0 0 0 9px rgba(103,232,249,0)}}
/* faq details */
[data-tpl="christmas"] .wc-faq[open] .wc-faq-ico{transform:rotate(180deg);color:var(--wc-ice)}
[data-tpl="christmas"] .wc-faq-ico{transition:transform .35s,color .35s}
[data-tpl="christmas"] :is(button,a,input,summary,[tabindex]):focus-visible{outline:2px solid rgba(103,232,249,.75);outline-offset:2px;border-radius:.5rem}
@media (prefers-reduced-motion:reduce){
  [data-tpl="christmas"] .wc-aurora,[data-tpl="christmas"] .wc-aurora-2,[data-tpl="christmas"] .wc-snow,
  [data-tpl="christmas"] .wc-marquee,[data-tpl="christmas"] .wc-float,[data-tpl="christmas"] .wc-blink,
  [data-tpl="christmas"] .wc-pulse,[data-tpl="christmas"] .wc-scan::after{animation:none!important}
  [data-tpl="christmas"] .wc-card,[data-tpl="christmas"] .wc-cta{transition:none!important}
}

/* ═══ v26fix · LIGHT-MODE SKIN — html:not(.dark) only · dark design untouched ═══ */
html:not(.dark) [data-tpl="christmas"]{
  --wc-night:#F2F8FD;--wc-night-2:#E9F1FA;--wc-ice:#67E8F9;--wc-red:#EF4444;--wc-stories-bg:#FBFDFE;
  --wc-glass:rgba(255,255,255,0.72);--wc-brd:rgba(23,50,71,0.16);--wc-brd-soft:rgba(23,50,71,0.1);
}
/* ═══ v27b-T5 · ROOT FLIP FIX — the [data-tpl] root element itself carries
   bg-[#0B1420] + text-white; the descendant rules below can never match the
   root (it is not its own descendant), so light mode kept the whole page
   dark with inherited white text. Compound (no-space) selectors fix it. ═══ */
html:not(.dark) [data-tpl="christmas"].bg-\\[\\#0B1420\\]{ background-color:#F2F8FD; }
html:not(.dark) [data-tpl="christmas"].text-white{ color:#173247; }
/* raw-hex surfaces */
html:not(.dark) [data-tpl="christmas"] .bg-\\[\\#0B1420\\]{ background-color:#F2F8FD; }
html:not(.dark) [data-tpl="christmas"] .bg-\\[\\#0A1826\\]{ background-color:#E9F1FA; }
html:not(.dark) [data-tpl="christmas"] .bg-white\\/5{ background-color:rgba(23,50,71,0.05); }
html:not(.dark) [data-tpl="christmas"] .bg-white\\/\\[0\\.03\\]{ background-color:rgba(23,50,71,0.03); }
html:not(.dark) [data-tpl="christmas"] .border-white\\/10{ border-color:rgba(23,50,71,0.14); }
html:not(.dark) [data-tpl="christmas"] .border-white\\/15{ border-color:rgba(23,50,71,0.18); }
/* image veils on product/category tiles become light (photo banners keep dark overlays) */
html:not(.dark) [data-tpl="christmas"] .from-\\[\\#0B1420\\]\\/60{ --tw-gradient-from:rgba(233,241,250,0.6); }
html:not(.dark) [data-tpl="christmas"] .from-\\[\\#0B1420\\]\\/85{ --tw-gradient-from:rgba(242,248,253,0.55); }
/* ink */
html:not(.dark) [data-tpl="christmas"] .text-white{ color:#173247; }
html:not(.dark) [data-tpl="christmas"] .text-white\\/90{ color:rgba(23,50,71,0.9); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/85{ color:rgba(23,50,71,0.86); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/80{ color:rgba(23,50,71,0.8); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/75{ color:rgba(23,50,71,0.76); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/70{ color:rgba(23,50,71,0.7); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/65{ color:rgba(23,50,71,0.66); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/60{ color:rgba(23,50,71,0.6); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/55{ color:rgba(23,50,71,0.56); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/50{ color:rgba(23,50,71,0.5); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/45{ color:rgba(23,50,71,0.46); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/40{ color:rgba(23,50,71,0.4); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/35{ color:rgba(23,50,71,0.36); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/30{ color:rgba(23,50,71,0.3); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/20{ color:rgba(23,50,71,0.2); }
html:not(.dark) [data-tpl="christmas"] .text-white\\/\\[0\\.05\\]{ color:rgba(23,50,71,0.06); }
/* cyan / red / amber accents darkened for light */
html:not(.dark) [data-tpl="christmas"] .text-cyan-200{ color:#0E7490; }
html:not(.dark) [data-tpl="christmas"] .text-cyan-200\\/80{ color:rgba(14,116,144,0.8); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-200\\/70{ color:rgba(14,116,144,0.7); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-200\\/60{ color:rgba(14,116,144,0.6); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-200\\/50{ color:rgba(14,116,144,0.5); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-200\\/30{ color:rgba(14,116,144,0.3); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-300{ color:#0891B2; }
html:not(.dark) [data-tpl="christmas"] .text-cyan-300\\/90{ color:rgba(8,145,178,0.92); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-300\\/80{ color:rgba(8,145,178,0.8); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-300\\/40{ color:rgba(8,145,178,0.45); }
html:not(.dark) [data-tpl="christmas"] .text-cyan-400\\/50{ color:rgba(8,145,178,0.55); }
html:not(.dark) [data-tpl="christmas"] .text-red-400{ color:#DC2626; }
html:not(.dark) [data-tpl="christmas"] .text-red-300{ color:#B91C1C; }
html:not(.dark) [data-tpl="christmas"] .text-amber-200{ color:#A16207; }
html:not(.dark) [data-tpl="christmas"] .text-amber-300{ color:#B45309; }
html:not(.dark) [data-tpl="christmas"] .text-emerald-300{ color:#047857; }
html:not(.dark) [data-tpl="christmas"] .fill-amber-300{ fill:#B45309; }
html:not(.dark) [data-tpl="christmas"] .bg-cyan-300\\/70{ background-color:rgba(8,145,178,0.8); }
html:not(.dark) [data-tpl="christmas"] .border-cyan-300\\/25{ border-color:rgba(8,145,178,0.3); }
html:not(.dark) [data-tpl="christmas"] .border-cyan-300\\/30{ border-color:rgba(8,145,178,0.35); }
html:not(.dark) [data-tpl="christmas"] .border-cyan-300\\/40{ border-color:rgba(8,145,178,0.45); }
html:not(.dark) [data-tpl="christmas"] .border-cyan-300\\/45{ border-color:rgba(8,145,178,0.5); }
html:not(.dark) [data-tpl="christmas"] .border-red-400\\/30{ border-color:rgba(220,38,38,0.35); }
html:not(.dark) [data-tpl="christmas"] .border-red-400\\/40{ border-color:rgba(220,38,38,0.4); }
/* hovers */
html:not(.dark) [data-tpl="christmas"] .hover\\:text-white:hover{ color:#173247; }
html:not(.dark) [data-tpl="christmas"] .hover\\:text-cyan-200:hover{ color:#0E7490; }
html:not(.dark) [data-tpl="christmas"] .hover\\:border-cyan-300\\/40:hover{ border-color:rgba(8,145,178,0.5); }
/* scoped helpers -> light (wc-cta / ribbons / aurora / snow keep their identity) */
html:not(.dark) [data-tpl="christmas"] .wc-glass{
  box-shadow:0 18px 50px -22px rgba(23,50,71,0.25), inset 0 1px 0 rgba(255,255,255,0.85);
}
html:not(.dark) [data-tpl="christmas"] .wc-glass-soft{ background:rgba(255,255,255,0.62); }
html:not(.dark) [data-tpl="christmas"] .wc-ice-glow{
  color:#0E7490; text-shadow:0 0 18px rgba(103,232,249,0.3), 0 0 42px rgba(103,232,249,0.16);
}
html:not(.dark) [data-tpl="christmas"] .wc-red-glow{
  color:#DC2626; text-shadow:0 0 16px rgba(239,68,68,0.4), 0 0 40px rgba(239,68,68,0.2);
}
/* v29.2 FIX: background-image (not "background:" shorthand) so background-clip:text
   survives — light-mode titles were invisible gradient bars before. */
html:not(.dark) [data-tpl="christmas"] .wc-grad-text{ background-image:linear-gradient(100deg,#0F3B52 12%,#0E7490 55%,#22D3EE 90%); }
html:not(.dark) [data-tpl="christmas"] .wc-hud::before,
html:not(.dark) [data-tpl="christmas"] .wc-hud::after{ border-color:rgba(8,145,178,0.5); }
html:not(.dark) [data-tpl="christmas"] .wc-cell{
  background:rgba(8,145,178,0.07); border-color:rgba(8,145,178,0.35);
  box-shadow:inset 0 0 18px rgba(8,145,178,0.1), 0 0 22px -6px rgba(8,145,178,0.3);
}
html:not(.dark) [data-tpl="christmas"] .wc-cell b{ color:#0E7490; text-shadow:0 0 14px rgba(8,145,178,0.35); }
html:not(.dark) [data-tpl="christmas"] .wc-scan{
  background:linear-gradient(to left,transparent,rgba(8,145,178,0.5),rgba(23,50,71,0.7),rgba(220,38,38,0.5),transparent);
}
html:not(.dark) [data-tpl="christmas"] .wc-btn-ghost{
  background:rgba(239,68,68,0.08); border-color:rgba(185,28,28,0.45); color:#B91C1C;
  box-shadow:inset 0 0 20px rgba(239,68,68,0.08);
}
html:not(.dark) [data-tpl="christmas"] .wc-btn-ghost:hover{
  border-color:rgba(185,28,28,0.8); box-shadow:0 0 24px -6px rgba(220,38,38,0.45), inset 0 0 24px rgba(239,68,68,0.12);
}
html:not(.dark) [data-tpl="christmas"] .wc-card:hover{
  border-color:rgba(8,145,178,0.5);
  box-shadow:0 24px 60px -24px rgba(23,50,71,0.35), 0 0 30px -10px rgba(103,232,249,0.35), inset 0 1px 0 rgba(255,255,255,0.75);
}
html:not(.dark) [data-tpl="christmas"] .wc-scroll{ scrollbar-color:rgba(8,145,178,0.4) transparent; }
html:not(.dark) [data-tpl="christmas"] .wc-scroll::-webkit-scrollbar-thumb{ background:rgba(8,145,178,0.35); }
html:not(.dark) [data-tpl="christmas"] .wc-faq[open] .wc-faq-ico{ color:#0E7490; }
html:not(.dark) [data-tpl="christmas"] :is(button,a,input,summary,[tabindex]):focus-visible{ outline-color:rgba(8,145,178,0.8); }
/* dark-surface restores — the polar-night hero stage stays a dark panel */
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"]{
  --wc-glass:rgba(255,255,255,0.06); --wc-brd:rgba(255,255,255,0.2); --wc-brd-soft:rgba(255,255,255,0.12);
}
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-glass{
  box-shadow:0 18px 50px -22px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08);
}
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-glass-soft{ background:rgba(255,255,255,0.035); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-grad-text{ background-image:linear-gradient(100deg,#FFFFFF 12%,var(--wc-ice) 55%,#A5F3FC 90%); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-ice-glow{
  color:#67E8F9; text-shadow:0 0 18px rgba(103,232,249,0.55), 0 0 42px rgba(103,232,249,0.28);
}
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-btn-ghost{
  background:rgba(255,255,255,0.05); border-color:rgba(239,68,68,0.4); color:#FECACA;
  box-shadow:inset 0 0 20px rgba(239,68,68,0.12);
}
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-cell{
  background:rgba(103,232,249,0.07); border-color:rgba(103,232,249,0.32);
  box-shadow:inset 0 0 18px rgba(103,232,249,0.12), 0 0 22px -6px rgba(103,232,249,0.4);
}
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .wc-cell b{ color:#67E8F9; text-shadow:0 0 14px rgba(103,232,249,0.7); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-white\\/50{ color:rgba(255,255,255,0.5); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-white\\/20{ color:rgba(255,255,255,0.2); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-cyan-100{ color:#CFFAFE; }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-cyan-200\\/80{ color:rgba(207,250,254,0.8); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-cyan-300{ color:#A5F3FC; }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .text-cyan-400\\/50{ color:rgba(34,211,238,0.5); }
html:not(.dark) [data-tpl="christmas"] section[aria-labelledby="wc-hero"] .border-white\\/15{ border-color:rgba(255,255,255,0.15); }
/* slide cinema + showcase gift boxes keep dark photo overlays + white captions */
html:not(.dark) [data-tpl="christmas"] section[aria-label="اسلاید ویژه جشنواره"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="christmas"] section[aria-label="اسلاید ویژه جشنواره"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="christmas"] section[aria-label="اسلاید ویژه جشنواره"] .text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="christmas"] section[aria-label="اسلاید ویژه جشنواره"] .text-cyan-300{ color:#A5F3FC; }
html:not(.dark) [data-tpl="christmas"] section[aria-label="اسلاید ویژه جشنواره"] .wc-ice-glow.bg-cyan-400\\/10{ color:#67E8F9; }
html:not(.dark) [data-tpl="christmas"] section[aria-label="جعبه‌های ویترین"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="christmas"] section[aria-label="جعبه‌های ویترین"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="christmas"] section[aria-label="جعبه‌های ویترین"] .wc-ice-glow{ color:#67E8F9; }
/* image chips: rank / new / exclusive / discount keep dark + ice text */
html:not(.dark) [data-tpl="christmas"] .bg-black\\/60.text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="christmas"] .bg-black\\/60.border-white\\/15{ border-color:rgba(255,255,255,0.15); }
html:not(.dark) [data-tpl="christmas"] .bg-black\\/70.text-white\\/80{ color:rgba(255,255,255,0.8); }
html:not(.dark) [data-tpl="christmas"] .bg-\\[\\#0B1420\\]\\/85.text-cyan-200{ color:#CFFAFE; }
html:not(.dark) [data-tpl="christmas"] .wc-ice-glow.bg-\\[\\#0B1420\\]\\/80{ color:#67E8F9; }
html:not(.dark) [data-tpl="christmas"] .wc-red-glow.bg-red-500\\/90{ color:#EF4444; text-shadow:0 0 16px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3); }
/* stories play chip + immersive story viewer keep their dark design */
html:not(.dark) [data-tpl="christmas"] .bg-black\\/70.text-white{ color:#fff; }
html:not(.dark) [data-tpl="christmas"] .z-\\[100\\].fixed .text-white{ color:#fff; }
html:not(.dark) [data-tpl="christmas"] .z-\\[100\\].fixed .text-white\\/50{ color:rgba(255,255,255,0.5); }
`;

/* ── deterministic CSS snowfall (no Math.random → hydration-safe) ── */
function SnowLayer({ count = 16 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 61 + 4) % 100;
        const size = 3 + (i % 3) * 2;
        return (
          <span
            key={i}
            className="wc-snow"
            style={
              {
                left: `${left}%`,
                width: size,
                height: size,
                "--wc-dur": `${(9 + (i % 5) * 2.6).toFixed(1)}s`,
                "--wc-delay": `${(-((i * 1.83) % 15)).toFixed(1)}s`,
                "--wc-drift": `${((i % 7) - 3) * 22}px`,
                "--wc-o": i % 2 === 0 ? 0.95 : 0.6,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/* ── hydration-safe countdown (dashes on SSR, ticking on client) ──── */
function CyberClock({
  target,
  size = "md",
  endedLabel = "به پایان رسید",
}: { target: number | null; size?: "md" | "sm"; endedLabel?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, []);

  const diff = target !== null && now !== null ? Math.max(0, target - now) : null;
  const done = diff !== null && diff === 0;

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300">
        <Timer className="h-3.5 w-3.5" aria-hidden />
        {endedLabel}
      </span>
    );
  }

  const cells = [
    { v: diff === null ? null : Math.floor(diff / 3_600_000), l: "ساعت" },
    { v: diff === null ? null : Math.floor((diff % 3_600_000) / 60_000), l: "دقیقه" },
    { v: diff === null ? null : Math.floor((diff % 60_000) / 1000), l: "ثانیه" },
  ];

  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-cyan-300/90 tabular-nums" role="timer" aria-label="زمان باقی‌مانده پیشنهاد">
        <Clock className="h-3 w-3" aria-hidden />
        {cells.map((c) => toFaDigits(String(c.v ?? 0).padStart(2, "0"))).join(":")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" role="timer" aria-label="شمارش معکوس ویژه زمستانی">
      {cells.map((c, i) => (
        <span key={c.l} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-sm font-black text-cyan-400/50">:</span>}
          <span className="wc-cell">
            <b aria-hidden>{c.v === null ? "—" : toFaDigits(String(c.v).padStart(2, "0"))}</b>
            <span className="mt-0.5 text-[8.5px] font-bold text-white/50">{c.l}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* next Christmas (Dec 25) computed client-side only */
function nextChristmas(): number {
  const n = new Date();
  const y = n.getMonth() === 11 && n.getDate() > 25 ? n.getFullYear() + 1 : n.getFullYear();
  return new Date(y, 11, 25, 23, 59, 59).getTime();
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ──────── */
function useWinterAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = async (product: TemplateProduct) => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1100);
    } catch {
      /* toast handled by useCart */
    }
  };
  return { addToCart, added };
}

/* ── glass gift-card wrapped in a neon ribbon ─────────────────────── */
function GiftCard({
  product,
  globalDeadline,
  showClock,
}: { product: TemplateProduct; globalDeadline: number | null; showClock: boolean }) {
  const { addToCart, added } = useWinterAdd();
  const own = product.discountEndsAt ? new Date(product.discountEndsAt).getTime() : null;
  const target = globalDeadline ?? own;

  return (
    <article className={cn("wc-card wc-glass group relative flex flex-col overflow-hidden rounded-3xl", !product.inStock && "grayscale-[0.45]")}>
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          aria-label={product.name}
          className="relative block aspect-square overflow-hidden rounded-t-3xl bg-[#0A1826]"
        >
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 24vw"
              className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <span className="grid h-full place-items-center text-cyan-200/30">
              <Package className="h-11 w-11" aria-hidden />
            </span>
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1420]/60 via-transparent to-transparent" />
        </Link>
        {/* neon ribbon cross */}
        <span aria-hidden className="wc-ribbon-v" />
        <span aria-hidden className="wc-ribbon-h" />
        {/* gift bow dot */}
        <span aria-hidden className="absolute left-1/2 top-[34.5%] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.9)]" />
        {product.discountPercent > 0 && (
          <span className="wc-red-glow absolute end-3 top-3 grid h-11 min-w-11 -rotate-6 place-items-center rounded-xl border border-red-400/40 bg-red-500/90 px-2 text-[11px] font-black text-white shadow-[0_0_22px_rgba(239,68,68,.6)]">
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {!product.inStock && (
          <span className="absolute start-3 top-3 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[10px] font-bold text-white/80 backdrop-blur">ناموجود</span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-[10.5px] text-cyan-200/60">
          <BadgeCheck className="h-3 w-3 text-cyan-300/80" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 text-white/90 line-clamp-2 transition-colors hover:text-cyan-200">
          {product.name}
        </Link>
        <div className="mt-auto pt-3">
          {showClock && target !== null && product.discountPercent > 0 && (
            <p className="mb-2">
              <CyberClock target={target} size="sm" />
            </p>
          )}
          {product.discountPercent > 0 && (
            <p className="text-[11px] leading-4 text-white/35 tabular-nums line-through">{formatPrice(product.price)}</p>
          )}
          <p className="wc-ice-glow text-[15px] font-black tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-normal text-white/40">تومان</span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد خرید`}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97]",
              product.inStock
                ? added
                  ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                  : "wc-btn-ghost"
                : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <Gift className="h-4 w-4" aria-hidden />}
            {product.inStock ? (added ? "به سبد اضافه شد" : "خرید هدیه") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── HUD section header ───────────────────────────────────────────── */
function WinterHeader({
  icon: Icon, title, subtitle, href,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="wc-pulse grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="wc-grad-text truncate text-lg font-black tracking-tight md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="wc-glass-soft flex h-11 shrink-0 items-center gap-1 rounded-xl px-3.5 text-xs font-bold text-cyan-200 transition-colors hover:text-white">
          مشاهده همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── TEMPLATE ─────────────────────────────────────────────────────── */
export function ChristmasTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  /* v23 feature flags — missing key = ON */
  const feat = (k: string) => (data.store.features ? data.store.features[k] !== false : true);
  const snowOn = feat("snow");
  const timerOn = feat("timer");

  /* v25 timer contract: store.timerEndsAt overrides every countdown */
  const globalDeadline = store.timerEndsAt ? new Date(store.timerEndsAt).getTime() : null;
  const firstDealEnd = data.discounted.find((p) => p.discountEndsAt)?.discountEndsAt ?? null;

  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);

  /* v20 ticker messages → announcement fallback; v22 tickerSpeed */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink }]
        : [];
  const mqDur = store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 18;

  const chrome = TEMPLATE_CHROME["christmas"];

  const stats = [
    { icon: Gift, n: counts.products, label: "هدیه دیجیتال" },
    { icon: Snowflake, n: counts.categories, label: "دسته‌بندی" },
    { icon: Star, n: counts.brands, label: "برند معتبر" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="christmas" className="isolate w-full bg-[#0B1420] text-white">
      <style>{WINTER_CYBER_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* ═══ TOP GRADIENT — blend from theme chrome into polar night ═══ */}
      <div aria-hidden className="pointer-events-none h-10 w-full bg-gradient-to-b from-background to-transparent" />

      {/* ═══ TICKER — winter broadcast strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیه فروشگاه" className="mx-auto w-full max-w-[1440px] px-4 pb-3 pt-1">
          <div className="wc-glass-soft flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2">
            <span className="wc-blink flex shrink-0 items-center gap-1.5 text-[10px] font-black text-cyan-300">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              پخش زنده
            </span>
            <span className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
              <span className="wc-marquee" style={{ "--wc-mq": `${mqDur}s` } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex shrink-0 items-center gap-10 pe-10" aria-hidden={dup === 1}>
                    {tickerMsgs.map((m, i) => (
                      <Link key={`${dup}-${i}`} href={m.link ?? "/products"} tabIndex={dup === 1 ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[11.5px] font-bold text-white/75 transition-colors hover:text-cyan-200">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-cyan-300/70" />
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

      {/* ═══ HERO — aurora borealis over the polar night ═══ */}
      <section className="relative mx-auto w-full max-w-[1440px] px-4 pt-2" aria-labelledby="wc-hero">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/15 shadow-[0_40px_90px_-40px_rgba(0,0,0,.9)]">
          {/* deep night gradient + aurora bands */}
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(178deg,#0F2233_0%,#0B1420_46%,#0A1017_100%)]" />
          <span aria-hidden className="wc-aurora" />
          <span aria-hidden className="wc-aurora-2" />
          {/* frost grid floor */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-40 opacity-30 [background:repeating-linear-gradient(to_top,rgba(103,232,249,.14)_0,transparent_1px,transparent_28px),repeating-linear-gradient(to_right,rgba(103,232,249,.1)_0,transparent_1px,transparent_44px)] [mask-image:linear-gradient(to_top,black,transparent)]" />
          {snowOn && <SnowLayer />}
          {/* horizon glow line */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(103,232,249,.9),rgba(255,255,255,.95),rgba(239,68,68,.8),transparent)]" />

          {/* floating snowflake deco */}
          <Snowflake aria-hidden className="wc-float absolute start-10 top-14 hidden h-10 w-10 text-cyan-200/25 md:block" />
          <Snowflake aria-hidden className="wc-float absolute end-24 top-28 hidden h-6 w-6 text-white/20 md:block" style={{ animationDelay: "-3.2s" }} />

          <div className="relative flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[560px] sm:px-10">
            <p className="wc-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold text-cyan-100">
              <Bell className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
              جشنواره سایبری زمستان {store.storeName}
            </p>
            <h1 id="wc-hero" className="wc-grad-text max-w-2xl text-3xl font-black leading-[1.4] sm:text-4xl md:text-5xl">
              هدیه‌های دیجیتال، زیر نور قطبی
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-8 text-white/65">
              {store.announcementActive && store.announcement
                ? store.announcement
                : `از ${toFaDigits(String(counts.products))} محصول منتخب، با بسته‌بندی هدیه و ارسال سریع پیش از تعطیلات انتخاب کنید.`}
            </p>

            {/* countdown HUD «تا کریسمس» — timer feature gated */}
            {timerOn && (
              <div className="wc-glass mt-7 flex flex-col items-center gap-3 rounded-2xl px-5 py-4">
                <p className="flex items-center gap-2 text-[10.5px] font-black tracking-[0.18em] text-cyan-200/80">
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  شمارش معکوس تا کریسمس
                </p>
                <ChristmasClock deadline={globalDeadline ?? (firstDealEnd ? new Date(firstDealEnd).getTime() : null)} />
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="wc-cta flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black">
                <Gift className="h-4 w-4" aria-hidden />
                راهنمای هدیه
              </Link>
              <Link href="/products?discount=1" className="wc-btn-ghost flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-bold">
                <Flame className="h-4 w-4 text-red-400" aria-hidden />
                تخفیف‌های زمستان
              </Link>
            </div>

            {/* frost stats chips */}
            <ul className="mt-10 flex flex-wrap justify-center gap-2.5" aria-label="آمار فروشگاه">
              {stats.map((s) => (
                <li key={s.label} className="wc-glass-soft flex items-center gap-2 rounded-xl px-3.5 py-2">
                  <s.icon className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                  <span className="text-sm font-black tabular-nums text-white">{toFaDigits(String(s.n))}</span>
                  <span className="text-[10px] text-white/50">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ STORIES ═══ */}
      {stories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="استوری‌های فروشگاه">
          <Reveal>
            <div className="wc-glass rounded-[2rem] p-4 sm:p-5" style={{ "--background": "var(--wc-stories-bg, #0B1420)" } as React.CSSProperties}>
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                استوری‌های زمستانی
              </p>
              <StoriesRow stories={stories} />
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ HERO SLIDE CINEMA + EXTRA SLIDES DUO ═══ */}
      {heroSlide && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="اسلاید ویژه جشنواره">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-3">
              <Link
                href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
                className="wc-hud group relative block h-[240px] overflow-hidden rounded-[2rem] border border-white/15 sm:h-[320px] lg:col-span-2 lg:h-[360px]"
              >
                <SlideArt slide={heroSlide} sizes="(max-width: 1024px) 96vw, 64vw" priority className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1420]/95 via-[#0B1420]/30 to-transparent" />
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(103,232,249,.8),rgba(239,68,68,.6),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="wc-ice-glow mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black">
                    <Star className="h-3 w-3" aria-hidden />
                    اسلاید اصلی
                  </p>
                  <h3 className="text-xl font-black text-white sm:text-2xl">{heroSlide.title}</h3>
                  {heroSlide.subtitle && <p className="mt-1.5 line-clamp-2 max-w-xl text-xs leading-6 text-white/65">{heroSlide.subtitle}</p>}
                  {heroSlide.ctaText && (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-cyan-300">
                      {heroSlide.ctaText}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </span>
                  )}
                </div>
              </Link>
              {extraSlides.map((s) => (
                <Link
                  key={s.id}
                  href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="wc-hud group relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/15 lg:block"
                >
                  <SlideArt slide={s} sizes="32vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1420]/90 via-[#0B1420]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-base font-black text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/60">{s.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ CATEGORIES — ice-glass constellation tiles ═══ */}
      {data.categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-cats">
          <Reveal>
            <WinterHeader icon={Snowflake} title="صورت فلکی دسته‌بندی‌ها" subtitle="هر کاشی یخ، یک قلمرو هدیه" href="/products" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {data.categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="wc-card wc-glass group relative flex flex-col items-center overflow-hidden rounded-2xl text-center">
                  <span className="relative block aspect-square w-full overflow-hidden bg-[#0A1826]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 30vw, 16vw" className="object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-lg font-black text-cyan-200/30">{c.name.charAt(0)}</span>
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1420]/85 via-transparent to-transparent" />
                  </span>
                  <span className="flex w-full flex-col items-center gap-0.5 p-2.5">
                    <span className="w-full truncate text-[11.5px] font-bold text-white/85">{c.name}</span>
                    <span className="text-[9.5px] text-cyan-200/50 tabular-nums">{toFaDigits(String(c.productCount))} کالا</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ DEAL BAND — «پیشنهاد ویژه امروز» + countdown ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="پیشنهاد ویژه امروز">
          <Reveal>
            <div className="wc-hud wc-glass relative overflow-hidden rounded-[2rem] p-6 md:p-8">
              {/* ambient red/cyan wash */}
              <span aria-hidden className="absolute -start-16 -top-20 h-52 w-52 rounded-full bg-red-500/15 blur-3xl" />
              <span aria-hidden className="absolute -end-14 -bottom-24 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
              <Gift aria-hidden className="absolute -bottom-9 -end-9 h-44 w-44 rotate-12 text-white/[0.05]" strokeWidth={1} />
              <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <span className="wc-red-glow grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-red-400/40 bg-red-500/15 text-red-400">
                  <Flame className="h-7 w-7" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wc-red-glow text-[11px] font-black tracking-[0.15em]">پیشنهاد ویژه امروز</p>
                  <h3 className="mt-1 text-lg font-black text-white md:text-xl">
                    {toFaDigits(String(data.discounted.length))} هدیه با قیمت ویژه — تا اتمام موجودی
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-white/50">
                    ارسال سریع پیش از تعطیلات، همراه با بسته‌بندی هدیه رایگان و گارانتی رسمی.
                  </p>
                  {timerOn && globalDeadline === null && firstDealEnd && (
                    <p className="mt-3">
                      <CyberClock target={new Date(firstDealEnd).getTime()} size="sm" />
                    </p>
                  )}
                </div>
                <Link href="/products?discount=1" className="wc-cta flex h-12 shrink-0 items-center gap-2 rounded-xl px-7 text-sm font-black">
                  دیدن همه
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ GIFT GUIDE — discounted as neon-ribbon glass cards ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-guide">
          <Reveal>
            <WinterHeader icon={Gift} title="راهنمای هدیه" subtitle="جعبه‌های شیشه‌ای با ربان نئون" href="/products?discount=1" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.discounted.slice(0, 8).map((p) => (
                <GiftCard key={p.id} product={p} globalDeadline={globalDeadline} showClock={timerOn} />
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FEATURED — flagship glass grid ═══ */}
      {data.featured.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-featured">
          <Reveal>
            <WinterHeader icon={Sparkles} title="انتخاب‌های ویژه" subtitle="فلگ‌شیپ‌های ویترین سایبری" href={RAIL_URLS.featured} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.featured.slice(0, 8).map((p) => (
                <GiftCard key={p.id} product={p} globalDeadline={globalDeadline} showClock={timerOn} />
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EXCLUSIVE — cinematic glass pods ═══ */}
      {data.exclusive.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-exclusive">
          <Reveal>
            <WinterHeader icon={Star} title="انحصاری‌های زمستان" subtitle="فقط در تاج الکترونیکس" />
            <div className="grid gap-4 md:grid-cols-2">
              {data.exclusive.slice(0, 2).map((p) => (
                <article key={p.id} className="wc-hud wc-glass group relative flex flex-col overflow-hidden rounded-[2rem] sm:flex-row">
                  <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square w-full shrink-0 bg-[#0A1826] sm:w-[46%]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, 28vw" className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-cyan-200/30"><Package className="h-14 w-14" aria-hidden /></span>
                    )}
                    <span aria-hidden className="wc-ice-glow absolute start-4 top-4 rounded-full border border-cyan-300/40 bg-[#0B1420]/80 px-3 py-1 text-[10px] font-black backdrop-blur">انحصاری</span>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-6">
                    <p className="flex items-center gap-1 text-[10.5px] text-cyan-200/60">
                      <BadgeCheck className="h-3 w-3 text-cyan-300/80" aria-hidden />
                      {p.brand.name}
                    </p>
                    <Link href={`/products/${p.slug}`} className="mt-1.5 text-lg font-black leading-8 text-white line-clamp-2 transition-colors hover:text-cyan-200">
                      {p.name}
                    </Link>
                    <p className="wc-ice-glow mt-3 text-xl font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[11px] font-normal text-white/40">تومان</span>
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {p.rating > 0 && (
                        <li className="wc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-amber-200">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                          {p.rating.toLocaleString("fa-IR")} از ۵
                        </li>
                      )}
                      {p.soldCount > 0 && (
                        <li className="wc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white/60 tabular-nums">
                          {toFaDigits(String(p.soldCount))} فروش
                        </li>
                      )}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ BESTSELLERS — rank rail ═══ */}
      {data.bestsellers.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-best">
          <Reveal>
            <WinterHeader icon={Flame} title="پرفروش‌های زمستان" subtitle="آنچه بیش از همه هدیه داده شد" />
            <div className="wc-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {data.bestsellers.slice(0, 10).map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="wc-card wc-glass group flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#0A1826]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="240px" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-cyan-200/30"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute start-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border text-sm font-black tabular-nums",
                        i < 3
                          ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-200 shadow-[0_0_20px_rgba(103,232,249,.35)]"
                          : "border-white/15 bg-black/60 text-white/60"
                      )}
                    >
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="min-h-11 text-[12.5px] font-bold leading-5 text-white/85 line-clamp-2">{p.name}</span>
                    <span className="mt-1 text-[10px] text-cyan-200/50 tabular-nums">{toFaDigits(String(p.soldCount))} فروش موفق</span>
                    <span className="wc-ice-glow mt-auto pt-2 text-[13.5px] font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-white/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ NEWEST — fresh snow grid ═══ */}
      {data.newest.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-newest">
          <Reveal>
            <WinterHeader icon={Snowflake} title="تازه‌رسیده‌ها" subtitle="برف تازه‌ی ویترین" href={RAIL_URLS.newest} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.newest.slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="wc-card wc-glass group flex flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#0A1826]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 50vw, 24vw" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-cyan-200/30"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span className="wc-blink absolute end-3 top-3 rounded-full border border-cyan-300/40 bg-[#0B1420]/85 px-2.5 py-1 text-[9.5px] font-black text-cyan-200 backdrop-blur">جدید</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="text-[10.5px] text-cyan-200/60">{p.brand.name}</span>
                    <span className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-white/85 line-clamp-2">{p.name}</span>
                    <span className="mt-auto pt-2 text-[13.5px] font-black text-white tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-white/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ SHOWCASES — glass gift boxes ═══ */}
      {data.showcases.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="جعبه‌های ویترین">
          <Reveal>
            <WinterHeader icon={Snowflake} title="جعبه‌های ویترین" subtitle="پیشنهادهای شیشه‌ای جشنواره" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {data.showcases.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="wc-hud group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/15"
                >
                  <Image src={s.image} alt={s.title} fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1420]/95 via-[#0B1420]/35 to-transparent" />
                  <span aria-hidden className="wc-ribbon-v opacity-40" />
                  <div className="relative p-6">
                    <h3 className="text-lg font-black text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-6 text-white/65">{s.subtitle}</p>}
                    <span className="wc-ice-glow mt-3 inline-flex items-center gap-1 text-xs font-black">
                      مشاهده
                      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ TRUST HUD — delivery guarantee strip ═══ */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="خدمات ویژه زمستانی">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, t: "ارسال پیش از تعطیلات", d: "تحویل اکسپرس هدیه‌ها به سراسر کشور" },
              { icon: ShieldCheck, t: "گارانتی رسمی", d: "ضمانت اصالت کالا و خدمات پس از فروش" },
              { icon: Gift, t: "بسته‌بندی هدیه", d: "پک ویژه کریسمس، رایگان روی همه سفارش‌ها" },
            ].map((f) => (
              <div key={f.t} className="wc-glass-soft flex items-start gap-3 rounded-2xl p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-white/90">{f.t}</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/45">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══ BRANDS — snow marquee ═══ */}
      {data.brands.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="برندهای همکار">
          <Reveal>
            <div className="wc-glass rounded-[2rem] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </span>
                برندهای زیر نور قطبی
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200/70 tabular-nums">
                  {toFaDigits(String(data.brands.length))} برند
                </span>
              </div>
              <div className="overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_5%,black_95%,transparent)]">
                <div className="wc-marquee" style={{ "--wc-mq": "26s" } as React.CSSProperties}>
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex shrink-0 gap-3 pe-3" aria-hidden={dup === 1}>
                      {data.brands.map((b) => (
                        <Link
                          key={`${dup}-${b.id}`}
                          href={`/products?brand=${b.slug}`}
                          tabIndex={dup === 1 ? -1 : undefined}
                          className="wc-glass-soft flex h-12 shrink-0 items-center gap-2 rounded-full pe-5 ps-1.5 transition-colors hover:border-cyan-300/40"
                        >
                          <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-[#0A1826]">
                            {b.logo || b.image ? (
                              <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="36px" className="object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[11px] font-black text-cyan-200/50">{b.name.charAt(0)}</span>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-xs font-bold text-white/80">{b.name}</span>
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

      {/* ═══ FAQ — glass accordion ═══ */}
      {data.faq.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="wc-faq">
          <Reveal>
            <WinterHeader icon={HelpCircle} title="پرسش‌های زمستانی" subtitle="پاسخ‌های شفاف، مثل یخ" />
            <div className="grid gap-3 lg:grid-cols-2">
              {data.faq.map((f, i) => (
                <details key={i} className="wc-faq wc-glass-soft group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white/85 [&::-webkit-details-marker]:hidden">
                    {f.h}
                    <ChevronLeft className="wc-faq-ico h-4 w-4 shrink-0 text-white/40" aria-hidden />
                  </summary>
                  <p className="mt-3 border-t border-white/10 pt-3 text-[12px] leading-7 text-white/55">{f.p}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!hasAnyProduct && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14">
          <div className="wc-glass rounded-[2rem] border-dashed p-16 text-center">
            <Snowflake className="mx-auto mb-4 h-12 w-12 text-cyan-300/40" aria-hidden />
            <h2 className="text-lg font-black text-white/85">ویترین در حال آماده‌سازی است</h2>
            <p className="mt-2 text-sm leading-7 text-white/45">جعبه‌های هدیه به‌زودی زیر نور قطبی چیده می‌شوند…</p>
            <Link href="/products" className="wc-cta mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
              مشاهده همه محصولات
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CLOSING — scanline divider + bottom blend ═══ */}
      <div aria-hidden className="wc-scan mx-auto mt-16 max-w-3xl" />
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-transparent to-background" />

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* small wrapper: main «تا کریسمس» clock — falls back to next Dec 25 on client */
function ChristmasClock({ deadline }: { deadline: number | null }) {
  const [target, setTarget] = useState<number | null>(deadline);

  useEffect(() => {
    if (deadline === null) {
      const raf = requestAnimationFrame(() => setTarget(nextChristmas()));
      return () => cancelAnimationFrame(raf);
    }
  }, [deadline]);

  return <CyberClock target={target} endedLabel="کریسمس مبارک!" />;
}

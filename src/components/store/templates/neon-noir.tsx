"use client";

/**
 * TEMPLATE · neon-noir — «GTA6 Vice City Vaporwave» (v25 · FULL REDESIGN)
 * ---------------------------------------------------------------------------
 * Neon-noir Miami / GTA-VI promo-site aesthetic:
 *  · palette: electric magenta #D400FF glow · neon lime #E4FF55 CTAs ·
 *    deep violet #2D1B4E panels · hot pink #FF6B9D → cyan #00D4FF
 *    gradient text · off-white #F5F5F5 huge headlines (font-black,
 *    italic-skew on EN display words only)
 *  · hero = synthwave SUN (gradient disc + striped mask) over an animated
 *    perspective GRID floor (transform: perspective rotateX + panning
 *    background lines) with a glowing horizon line — pure CSS
 *  · cinematic full-bleed dark bands, film-grain overlay (SVG feTurbulence
 *    noise data-URI), neon-sign FLICKER on one word of the hero title,
 *    retro palm silhouettes (simple SVG)
 *  · vertical category EDGE-RAIL on desktop (sticky neon spine) +
 *    horizontal snap rail on mobile
 *  · full hero SLIDER (auto-advance 6s, dots + arrows, mobile artwork via
 *    SlideArt)
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, BadgeCheck, Bot, Check, ChevronLeft, ChevronRight, Flame,
  GitCompareArrows, Loader2, MoonStar, Package, PackageSearch, Send,
  ShoppingBasket, Sparkles, Star, Timer, Zap,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/stores";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";
import { resolveTickerMessages } from "./chrome/bits";

/* ══ ALL custom CSS — one plain <style> tag, scoped under [data-tpl] ══ */
const VN_CSS = `
[data-tpl="neon-noir"]{
  --vn-night:#150D2B;--vn-panel:#2D1B4E;--vn-panel-2:#241545;
  --vn-magenta:#D400FF;--vn-lime:#E4FF55;--vn-pink:#FF6B9D;--vn-cyan:#00D4FF;--vn-ink:#F5F5F5;
  background:#150D2B;color:#F5F5F5;
}
[data-tpl="neon-noir"] .vn-root{
  position:relative;
  background:
    radial-gradient(1000px 480px at 85% -2%,rgba(212,0,255,.13),transparent 60%),
    radial-gradient(800px 420px at 6% 24%,rgba(255,107,157,.07),transparent 60%),
    radial-gradient(900px 600px at 50% 104%,rgba(0,212,255,.07),transparent 60%),
    #150D2B;
  color:#F5F5F5;
}
/* ── neon marquee announcement strip ────────────────────────────────── */
[data-tpl="neon-noir"] .vn-strip{
  position:relative;display:flex;align-items:center;gap:10px;padding:8px 12px;
  border-radius:14px;overflow:hidden;
  border:1px solid rgba(212,0,255,.4);
  background:linear-gradient(90deg,rgba(212,0,255,.16),rgba(45,27,78,.75) 45%,rgba(0,212,255,.08));
}
[data-tpl="neon-noir"] .vn-strip-tag{
  flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:999px;
  background:linear-gradient(135deg,#D400FF,#FF6B9D);color:#fff;font-size:10px;font-weight:900;
  box-shadow:0 0 16px rgba(212,0,255,.5);
}
/* ── deep violet panel ──────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-panel{
  border-radius:18px;border:1px solid rgba(212,0,255,.28);
  background:linear-gradient(180deg,rgba(45,27,78,.78),rgba(36,21,69,.88));
  backdrop-filter:blur(10px);
}
/* ── cinematic full-bleed dark band ─────────────────────────────────── */
[data-tpl="neon-noir"] .vn-band{
  position:relative;
  border-block:1px solid rgba(212,0,255,.35);
  background:linear-gradient(180deg,#1D1138 0%,#150D2B 55%,#180F30 100%);
  box-shadow:0 -1px 26px -8px rgba(212,0,255,.45),0 1px 26px -8px rgba(212,0,255,.3);
}
/* ── film grain (SVG noise, animated jitter) ────────────────────────── */
[data-tpl="neon-noir"] .vn-grain{position:relative;overflow:hidden}
[data-tpl="neon-noir"] .vn-grain::after{
  content:"";position:absolute;inset:-120%;pointer-events:none;opacity:.08;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation:vn-grain-jitter .9s steps(3) infinite;
}
@keyframes vn-grain-jitter{
  0%{transform:translate(0,0)}
  25%{transform:translate(-3%,2%)}
  50%{transform:translate(2%,-3%)}
  75%{transform:translate(-2%,-2%)}
  100%{transform:translate(3%,2%)}
}
/* ── synthwave sun (gradient disc + striped lower half) ─────────────── */
[data-tpl="neon-noir"] .vn-sun{
  position:absolute;left:50%;top:9%;transform:translateX(-50%);
  width:min(44%,330px);aspect-ratio:1/1;border-radius:50%;pointer-events:none;
  background:linear-gradient(180deg,#FFED5C 0%,#FFB45C 24%,#FF6B9D 56%,#D400FF 88%);
  filter:drop-shadow(0 -8px 44px rgba(255,107,157,.5)) drop-shadow(0 14px 66px rgba(212,0,255,.45));
}
[data-tpl="neon-noir"] .vn-sun::after{
  content:"";position:absolute;inset:0;border-radius:50%;
  background:repeating-linear-gradient(180deg,transparent 0 30px,#150D2B 30px 40px);
  -webkit-mask-image:linear-gradient(180deg,transparent 42%,#000 62%);
  mask-image:linear-gradient(180deg,transparent 42%,#000 62%);
}
/* ── perspective grid floor + horizon glow ──────────────────────────── */
[data-tpl="neon-noir"] .vn-grid{
  position:absolute;left:-25%;right:-25%;bottom:-12%;height:42%;pointer-events:none;
  background-image:
    linear-gradient(rgba(0,212,255,.32) 1.5px,transparent 1.5px),
    linear-gradient(90deg,rgba(212,0,255,.22) 1.5px,transparent 1.5px);
  background-size:50px 42px;
  transform:perspective(360px) rotateX(58deg);transform-origin:top center;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 28%,#000 74%,transparent);
  mask-image:linear-gradient(to bottom,transparent,#000 28%,#000 74%,transparent);
  animation:vn-grid-pan 1.4s linear infinite;
}
@keyframes vn-grid-pan{from{background-position:0 0,0 0}to{background-position:0 42px,0 42px}}
[data-tpl="neon-noir"] .vn-horizon{
  position:absolute;left:0;right:0;bottom:29%;height:2px;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(0,212,255,.9) 34%,rgba(255,107,157,.95) 66%,transparent);
  box-shadow:0 0 18px 2px rgba(0,212,255,.35);
}
/* ── hero night tint over artwork ───────────────────────────────────── */
[data-tpl="neon-noir"] .vn-hero-tint{
  background:
    radial-gradient(720px 340px at 50% 8%,rgba(212,0,255,.16),transparent 65%),
    linear-gradient(to top,rgba(21,13,43,.97) 6%,rgba(21,13,43,.6) 34%,rgba(33,17,60,.42) 68%,rgba(45,27,78,.55));
}
/* ── neon sign flicker (one hero-title word) ────────────────────────── */
[data-tpl="neon-noir"] .vn-flicker{
  color:#E4FF55;
  text-shadow:0 0 8px rgba(228,255,85,.75),0 0 26px rgba(212,0,255,.55),0 0 64px rgba(212,0,255,.4);
  animation:vn-flicker 4.4s linear infinite;
}
@keyframes vn-flicker{
  0%,4.4%,6%,7.8%,31%,33%,54%,100%{opacity:1}
  5%{opacity:.25;text-shadow:none}
  6.6%{opacity:.55}
  7.2%{opacity:.3}
  31.8%{opacity:.2;text-shadow:none}
  32.4%{opacity:.6}
  54.4%{opacity:.4}
}
/* ── EN display words: italic-skew + pink→magenta→cyan gradient ─────── */
[data-tpl="neon-noir"] .vn-en{font-style:italic;display:inline-block;transform:skewX(-9deg);letter-spacing:.02em}
[data-tpl="neon-noir"] .vn-grad-text{
  background:linear-gradient(96deg,#FF6B9D 0%,#D400FF 45%,#00D4FF 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
[data-tpl="neon-noir"] .vn-eyebrow{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;
}
[data-tpl="neon-noir"] .vn-eyebrow-sm{font-size:8px;letter-spacing:.2em}
/* ── product card ───────────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-card{
  position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
  border:1px solid rgba(212,0,255,.25);
  background:linear-gradient(180deg,rgba(45,27,78,.92),rgba(36,21,69,.96));
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="neon-noir"] .vn-card:hover{
  transform:translateY(-5px);border-color:rgba(228,255,85,.55);
  box-shadow:0 16px 44px -18px rgba(212,0,255,.5);
}
/* ── lime CTA + magenta ghost ───────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-cta{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  font-weight:900;color:#1E1235;cursor:pointer;
  background:linear-gradient(135deg,#F2FF7A,#E4FF55 60%,#D6F53A);
  border:1px solid rgba(228,255,85,.9);
  box-shadow:0 0 22px -4px rgba(228,255,85,.5),0 10px 30px -12px rgba(228,255,85,.65);
  transition:filter .2s,transform .2s,box-shadow .2s;
}
[data-tpl="neon-noir"] .vn-cta:hover{filter:brightness(1.07);transform:translateY(-1px);box-shadow:0 0 30px -2px rgba(228,255,85,.8)}
[data-tpl="neon-noir"] .vn-cta:active{transform:translateY(0) scale(.98)}
[data-tpl="neon-noir"] .vn-cta:disabled{opacity:.4;pointer-events:none;filter:grayscale(.35)}
[data-tpl="neon-noir"] .vn-cta-ghost{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  font-weight:800;color:#F5F5F5;cursor:pointer;
  background:rgba(45,27,78,.55);border:1px solid rgba(212,0,255,.55);backdrop-filter:blur(6px);
  transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="neon-noir"] .vn-cta-ghost:hover{border-color:#D400FF;color:#fff;box-shadow:0 0 26px -6px rgba(212,0,255,.85);transform:translateY(-1px)}
[data-tpl="neon-noir"] .vn-cta-ghost:disabled{opacity:.4;pointer-events:none}
/* ── lime glowing price ─────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-price{color:#E4FF55;text-shadow:0 0 14px rgba(228,255,85,.35)}
/* ── hero controls ──────────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-arrow{
  position:absolute;top:50%;z-index:30;transform:translateY(-50%);cursor:pointer;
  display:grid;place-items:center;width:44px;height:44px;border-radius:12px;
  background:rgba(21,13,43,.72);border:1px solid rgba(212,0,255,.5);color:#F5F5F5;
  backdrop-filter:blur(8px);transition:border-color .2s,color .2s,box-shadow .2s;
}
[data-tpl="neon-noir"] .vn-arrow:hover{border-color:#D400FF;color:#fff;box-shadow:0 0 26px -6px rgba(212,0,255,.85)}
[data-tpl="neon-noir"] .vn-dot{width:22px;height:6px;border-radius:999px;border:0;padding:0;background:rgba(245,245,245,.22);cursor:pointer;transition:background .3s,box-shadow .3s}
[data-tpl="neon-noir"] .vn-dot-on{background:linear-gradient(90deg,#E4FF55,#D400FF);box-shadow:0 0 12px rgba(212,0,255,.6)}
/* ── deal timer cells ───────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-timer-cell{
  display:inline-block;min-width:32px;text-align:center;padding:2px 6px;border-radius:7px;
  background:rgba(228,255,85,.1);border:1px solid rgba(228,255,85,.35);color:#E4FF55;
  font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;
  text-shadow:0 0 10px rgba(228,255,85,.3);
}
[data-tpl="neon-noir"] .vn-timer-sep{color:rgba(228,255,85,.5);font-size:11px;font-weight:800}
[data-tpl="neon-noir"] .vn-timer-ended{padding:2px 10px;border-radius:999px;background:rgba(255,107,157,.14);color:#FF9BBF;font-size:10px;font-weight:800}
/* ── vertical category edge rail (desktop) ──────────────────────────── */
[data-tpl="neon-noir"] .vn-rail{position:absolute;top:0;bottom:0;inset-inline-start:0;width:56px;display:none}
@media (min-width:1280px){[data-tpl="neon-noir"] .vn-rail{display:block}}
[data-tpl="neon-noir"] .vn-rail-sticky{
  position:sticky;top:96px;display:flex;flex-direction:column;align-items:center;gap:10px;
  max-height:calc(100vh - 140px);
}
[data-tpl="neon-noir"] .vn-rail-cap{
  display:grid;place-items:center;width:40px;height:40px;border-radius:999px;
  background:linear-gradient(135deg,#E4FF55,#D6F53A);color:#1E1235;
  box-shadow:0 0 18px rgba(228,255,85,.55);
}
[data-tpl="neon-noir"] .vn-rail-list{display:flex;flex-direction:column;gap:8px;overflow-y:auto;scrollbar-width:none;max-height:calc(100vh - 260px)}
[data-tpl="neon-noir"] .vn-rail-list::-webkit-scrollbar{display:none}
[data-tpl="neon-noir"] .vn-rail-link{
  writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;
  min-height:86px;padding:15px 7px;border-radius:999px;
  border:1px solid rgba(212,0,255,.35);background:rgba(45,27,78,.85);color:#CBB9E8;
  font-size:11.5px;font-weight:800;letter-spacing:.04em;backdrop-filter:blur(6px);
  transition:background .25s,color .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="neon-noir"] .vn-rail-link:hover{
  background:linear-gradient(180deg,rgba(212,0,255,.95),rgba(255,107,157,.85));
  color:#fff;border-color:rgba(212,0,255,1);box-shadow:0 0 20px -2px rgba(212,0,255,.8);
}
[data-tpl="neon-noir"] .vn-rail-line{width:2px;height:56px;border-radius:999px;background:linear-gradient(180deg,#D400FF,transparent)}
/* ── rank cards (bestsellers rail) ──────────────────────────────────── */
[data-tpl="neon-noir"] .vn-rank-card{
  display:flex;align-items:flex-start;gap:14px;border-radius:18px;padding:16px;
  border:1px solid rgba(212,0,255,.25);
  background:linear-gradient(160deg,rgba(45,27,78,.92),rgba(36,21,69,.96));
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="neon-noir"] .vn-rank-card:hover{transform:translateY(-4px);border-color:rgba(228,255,85,.5);box-shadow:0 14px 40px -18px rgba(212,0,255,.5)}
[data-tpl="neon-noir"] .vn-rank-card-center{align-items:center}
[data-tpl="neon-noir"] .vn-rank-num{font-size:44px;line-height:1;font-weight:900;flex-shrink:0}
/* ── glass surfaces (AI band + category tiles) ──────────────────────── */
[data-tpl="neon-noir"] .vn-glass{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(12px);border-radius:16px}
[data-tpl="neon-noir"] .vn-ai{
  position:relative;border-radius:20px;overflow:hidden;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(45,27,78,.55);backdrop-filter:blur(14px);
}
[data-tpl="neon-noir"] .vn-ai::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(460px 220px at 10% 0%,rgba(212,0,255,.2),transparent 65%),
    radial-gradient(420px 220px at 90% 100%,rgba(0,212,255,.14),transparent 65%);
}
/* ── brand marquee chips ────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-brand-chip{
  display:inline-flex;align-items:center;gap:10px;flex-shrink:0;height:48px;padding:0 18px;
  border-radius:999px;border:1px solid rgba(212,0,255,.3);background:rgba(45,27,78,.8);
  font-size:12px;font-weight:900;color:#F5F5F5;letter-spacing:.03em;
  transition:border-color .2s,color .2s,box-shadow .2s;
}
[data-tpl="neon-noir"] .vn-brand-chip:hover{border-color:rgba(228,255,85,.7);color:#E4FF55;box-shadow:0 0 20px -8px rgba(228,255,85,.8)}
/* ── neon-framed media ──────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-neon-frame{
  border:1px solid rgba(212,0,255,.45);
  box-shadow:0 0 0 1px rgba(212,0,255,.12),0 0 34px -10px rgba(212,0,255,.6);
}
[data-tpl="neon-noir"] .vn-pod{
  border-radius:14px;border:1px solid rgba(228,255,85,.4);
  background:rgba(21,13,43,.78);backdrop-filter:blur(10px);
  box-shadow:0 0 26px -10px rgba(228,255,85,.4);
}
/* ── FAQ accordion ──────────────────────────────────────────────────── */
[data-tpl="neon-noir"] .vn-faq-item{
  border-radius:16px;border:1px solid rgba(212,0,255,.22);
  background:linear-gradient(180deg,rgba(45,27,78,.7),rgba(36,21,69,.8));
  transition:border-color .25s,box-shadow .25s;
}
[data-tpl="neon-noir"] .vn-faq-item[data-open="1"]{border-color:rgba(228,255,85,.45);box-shadow:0 0 26px -12px rgba(228,255,85,.35)}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════ */
html:not(.dark) [data-tpl="neon-noir"]{
  --vn-night:#F5F0FB;--vn-panel:#FFFFFF;--vn-panel-2:#F0E9F9;
  --vn-magenta:#9B00BE;--vn-lime:#556600;--vn-pink:#C13A6E;--vn-cyan:#0089B8;--vn-ink:#2B1B4E;
  --background:#F5F0FB;--foreground:#2B1B4E;
  --card:#FFFFFF;--card-foreground:#2B1B4E;
  --muted:#EFE9F8;--muted-foreground:#6E5A93;
  --border:rgba(43,27,78,.14);--input:rgba(43,27,78,.16);
  --primary:#7E2D99;--primary-foreground:#FFFFFF;
  --accent:#EFE9F8;--accent-foreground:#2B1B4E;
  --popover:#FFFFFF;--popover-foreground:#2B1B4E;
  background:#F5F0FB;color:#2B1B4E;
}
html:not(.dark) [data-tpl="neon-noir"] .vn-root{
  background:
    radial-gradient(1000px 480px at 85% -2%,rgba(212,0,255,.09),transparent 60%),
    radial-gradient(800px 420px at 6% 24%,rgba(255,107,157,.07),transparent 60%),
    radial-gradient(900px 600px at 50% 104%,rgba(0,212,255,.06),transparent 60%),
    #F5F0FB;
  color:#2B1B4E;
}
/* strips / panels / bands → light glass surfaces, magenta hairlines */
html:not(.dark) [data-tpl="neon-noir"] .vn-strip{
  border-color:rgba(155,0,190,.32);
  background:linear-gradient(90deg,rgba(212,0,255,.07),rgba(255,255,255,.72) 45%,rgba(0,212,255,.05));
}
html:not(.dark) [data-tpl="neon-noir"] .vn-panel{
  border-color:rgba(155,0,190,.22);
  background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(245,240,251,.94));
}
html:not(.dark) [data-tpl="neon-noir"] .vn-band{
  border-block-color:rgba(155,0,190,.22);
  background:linear-gradient(180deg,#FBF8FE 0%,#F5F0FB 55%,#EFE7FA 100%);
  box-shadow:0 -1px 26px -8px rgba(155,0,190,.2),0 1px 26px -8px rgba(155,0,190,.14);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-grain::after{opacity:.05}
/* hero scenery: keep the sun disc, light stripes; pastel grid; light veil */
html:not(.dark) [data-tpl="neon-noir"] .vn-sun::after{
  background:repeating-linear-gradient(180deg,transparent 0 30px,#F5F0FB 30px 40px);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-grid{
  background-image:
    linear-gradient(rgba(0,212,255,.22) 1.5px,transparent 1.5px),
    linear-gradient(90deg,rgba(212,0,255,.14) 1.5px,transparent 1.5px);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-hero-tint{
  background:
    radial-gradient(720px 340px at 50% 8%,rgba(212,0,255,.1),transparent 65%),
    linear-gradient(to top,rgba(245,240,251,.97) 6%,rgba(245,240,251,.66) 34%,rgba(212,0,255,.1) 68%,rgba(43,27,78,.14));
}
html:not(.dark) [data-tpl="neon-noir"] .vn-flicker{
  color:#556600;
  text-shadow:0 0 8px rgba(133,153,0,.4),0 0 26px rgba(212,0,255,.22),0 0 64px rgba(212,0,255,.14);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-grad-text{
  /* v29.2 FIX: background-image (not shorthand) so background-clip:text survives */
  background-image:linear-gradient(96deg,#C13A6E 0%,#8B2FB0 45%,#0089B8 100%);
}
/* cards / buttons / price */
html:not(.dark) [data-tpl="neon-noir"] .vn-card{
  border-color:rgba(155,0,190,.2);
  background:linear-gradient(180deg,#FFFFFF,#FBF8FE);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-card:hover{
  border-color:rgba(133,153,0,.5);
  box-shadow:0 16px 44px -18px rgba(155,0,190,.22);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-cta{
  color:#1E1235;
  box-shadow:0 0 22px -4px rgba(133,153,0,.3),0 10px 30px -12px rgba(133,153,0,.32);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-cta:hover{box-shadow:0 0 30px -2px rgba(133,153,0,.45)}
html:not(.dark) [data-tpl="neon-noir"] .vn-cta-ghost{
  color:#2B1B4E;background:rgba(255,255,255,.66);border-color:rgba(155,0,190,.45);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-cta-ghost:hover{border-color:#9B00BE;color:#2B1B4E;box-shadow:0 0 26px -6px rgba(212,0,255,.28)}
html:not(.dark) [data-tpl="neon-noir"] .vn-price{color:#556600;text-shadow:0 0 14px rgba(133,153,0,.18)}
html:not(.dark) [data-tpl="neon-noir"] .vn-arrow{
  background:rgba(255,255,255,.78);border-color:rgba(155,0,190,.45);color:#2B1B4E;
}
html:not(.dark) [data-tpl="neon-noir"] .vn-arrow:hover{border-color:#9B00BE;color:#2B1B4E;box-shadow:0 0 26px -6px rgba(212,0,255,.3)}
html:not(.dark) [data-tpl="neon-noir"] .vn-dot{background:rgba(43,27,78,.18)}
/* timer cells → olive-on-light */
html:not(.dark) [data-tpl="neon-noir"] .vn-timer-cell{
  background:rgba(85,102,0,.07);border-color:rgba(85,102,0,.32);color:#556600;text-shadow:none;
}
html:not(.dark) [data-tpl="neon-noir"] .vn-timer-sep{color:rgba(85,102,0,.55)}
html:not(.dark) [data-tpl="neon-noir"] .vn-timer-ended{background:rgba(255,107,157,.12);color:#C13A6E}
/* edge rail / rank cards / glass / brand chips / pods / faq */
html:not(.dark) [data-tpl="neon-noir"] .vn-rail-link{
  border-color:rgba(155,0,190,.3);background:rgba(255,255,255,.72);color:#554973;
}
html:not(.dark) [data-tpl="neon-noir"] .vn-rank-card{
  border-color:rgba(155,0,190,.2);
  background:linear-gradient(160deg,#FFFFFF,#FBF8FE);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-rank-card:hover{border-color:rgba(133,153,0,.5);box-shadow:0 14px 40px -18px rgba(155,0,190,.22)}
html:not(.dark) [data-tpl="neon-noir"] .vn-glass{background:rgba(255,255,255,.66);border-color:rgba(43,27,78,.12)}
html:not(.dark) [data-tpl="neon-noir"] .vn-ai{border-color:rgba(43,27,78,.12);background:rgba(255,255,255,.72)}
html:not(.dark) [data-tpl="neon-noir"] .vn-ai::before{
  background:
    radial-gradient(460px 220px at 10% 0%,rgba(212,0,255,.1),transparent 65%),
    radial-gradient(420px 220px at 90% 100%,rgba(0,212,255,.08),transparent 65%);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-brand-chip{
  border-color:rgba(155,0,190,.24);background:rgba(255,255,255,.82);color:#2B1B4E;
}
html:not(.dark) [data-tpl="neon-noir"] .vn-brand-chip:hover{border-color:rgba(133,153,0,.6);color:#556600;box-shadow:0 0 20px -8px rgba(133,153,0,.4)}
html:not(.dark) [data-tpl="neon-noir"] .vn-neon-frame{
  border-color:rgba(155,0,190,.38);
  box-shadow:0 0 0 1px rgba(155,0,190,.08),0 0 34px -10px rgba(155,0,190,.3);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-pod{
  border-color:rgba(155,0,190,.35);background:rgba(255,255,255,.86);
  box-shadow:0 0 26px -10px rgba(155,0,190,.25);
}
html:not(.dark) [data-tpl="neon-noir"] .vn-faq-item{
  border-color:rgba(155,0,190,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(245,240,251,.9));
}
html:not(.dark) [data-tpl="neon-noir"] .vn-faq-item[data-open="1"]{border-color:rgba(133,153,0,.4);box-shadow:0 0 26px -12px rgba(133,153,0,.2)}

/* ── raw-hex utilities → light-appropriate (same hue families, ink-ready) ── */
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#F5F5F5\\] { color: #2B1B4E; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#B9A6D8\\] { color: #6E5A93; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#D8CCEF\\] { color: #554973; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#EFE3FF\\] { color: #4A3D68; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#E9B8FF\\] { color: #8E2FB8; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#D400FF\\] { color: #9B00BE; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#D400FF\\]\\/40 { color: rgba(155, 0, 190, 0.5); }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#D400FF\\]\\/50 { color: rgba(155, 0, 190, 0.55); }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#D400FF\\]\\/60 { color: rgba(155, 0, 190, 0.6); }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#E4FF55\\] { color: #556600; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#FF6B9D\\] { color: #C13A6E; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#00D4FF\\] { color: #0089B8; }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#00D4FF\\]\\/80 { color: rgba(0, 137, 184, 0.85); }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#8AD8E8\\]\\/75 { color: rgba(0, 137, 184, 0.8); }
html:not(.dark) [data-tpl="neon-noir"] .text-\\[\\#0B0618\\] { color: #4E3B78; }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:text-\\[\\#FF6B9D\\]:hover { color: #C13A6E; }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:text-\\[\\#E4FF55\\]:hover { color: #556600; }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:text-white:hover { color: #4A3D68; }
html:not(.dark) [data-tpl="neon-noir"] .group-hover\\:text-\\[\\#FF6B9D\\]\\:is\\(\\:where\\(\\.group\\)\\:hover \\*\\) { color: #C13A6E; }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#150D2B\\]\\/60 { background-color: rgba(43, 27, 78, 0.05); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#2D1B4E\\]\\/60 { background-color: rgba(212, 0, 255, 0.08); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#00D4FF\\]\\/12 { background-color: rgba(0, 212, 255, 0.1); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#D400FF\\]\\/12 { background-color: rgba(155, 0, 190, 0.09); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#D400FF\\]\\/15 { background-color: rgba(155, 0, 190, 0.1); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#D400FF\\]\\/20 { background-color: rgba(155, 0, 190, 0.12); }
html:not(.dark) [data-tpl="neon-noir"] .bg-\\[\\#E4FF55\\]\\/12 { background-color: rgba(133, 153, 0, 0.1); }
html:not(.dark) [data-tpl="neon-noir"] .bg-amber-400\\/10 { background-color: rgba(245, 158, 11, 0.12); }
html:not(.dark) [data-tpl="neon-noir"] .text-amber-300 { color: #B45309; }
html:not(.dark) [data-tpl="neon-noir"] .fill-amber-300 { fill: #D97706; }
/* image wells → light lavender (dark overlay badges stay dark) */
html:not(.dark) [data-tpl="neon-noir"] .bg-black\\/25 { background-color: rgba(43, 27, 78, 0.05); }
html:not(.dark) [data-tpl="neon-noir"] .bg-black\\/30 { background-color: rgba(43, 27, 78, 0.05); }
html:not(.dark) [data-tpl="neon-noir"] .bg-black\\/40 { background-color: rgba(43, 27, 78, 0.06); }
/* hairlines */
html:not(.dark) [data-tpl="neon-noir"] .border-\\[\\#D400FF\\]\\/20 { border-color: rgba(155, 0, 190, 0.22); }
html:not(.dark) [data-tpl="neon-noir"] .border-\\[\\#D400FF\\]\\/25 { border-color: rgba(155, 0, 190, 0.28); }
html:not(.dark) [data-tpl="neon-noir"] .border-\\[\\#D400FF\\]\\/40 { border-color: rgba(155, 0, 190, 0.42); }
html:not(.dark) [data-tpl="neon-noir"] .border-\\[\\#E4FF55\\]\\/25 { border-color: rgba(133, 153, 0, 0.32); }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:border-\\[\\#D400FF\\]:hover { border-color: #9B00BE; }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:bg-\\[\\#2D1B4E\\]\\/70:hover { background-color: rgba(43, 27, 78, 0.06); }
html:not(.dark) [data-tpl="neon-noir"] .hover\\:bg-\\[\\#D400FF\\]\\/15:hover { background-color: rgba(155, 0, 190, 0.1); }
/* showcase image veil */
html:not(.dark) [data-tpl="neon-noir"] .from-\\[\\#150D2B\\]\\/60 { --tw-gradient-from: rgba(245, 240, 251, 0.62); }
/* neon glows softened */
html:not(.dark) [data-tpl="neon-noir"] .shadow-\\[0_0_18px_rgba\\(212\\,0\\,255\\,\\.5\\)\\] { --tw-shadow: 0 0 18px rgba(155, 0, 190, 0.32); }
html:not(.dark) [data-tpl="neon-noir"] .shadow-\\[0_0_22px_rgba\\(212\\,0\\,255\\,\\.5\\)\\] { --tw-shadow: 0 0 22px rgba(155, 0, 190, 0.32); }
/* .text-white blanket → ink; restored on surfaces that STAY colored (gradient pills/badges, image-overlay badges) */
html:not(.dark) [data-tpl="neon-noir"] .text-white { color: #2B1B4E; }
html:not(.dark) [data-tpl="neon-noir"] .from-\\[\\#FF6B9D\\].text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="neon-noir"] .from-\\[\\#D400FF\\].text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="neon-noir"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="neon-noir"] .bg-black\\/75.text-white\\/85 { color: rgba(255, 255, 255, 0.85); }
html:not(.dark) [data-tpl="neon-noir"] .fill-white { fill: #FFFFFF; }
`;

/* ── retro palm silhouette (simple SVG, decorative) ────────────────── */
function PalmSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 340" className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M104 340 C104 270 100 215 92 170 Q94 164 102 162 C110 212 114 272 114 340 Z" />
        <path d="M98 162 C70 146 40 142 12 156 C40 118 78 116 102 146 Z" />
        <path d="M98 158 C82 130 54 110 20 106 C58 84 96 100 104 136 Z" />
        <path d="M100 154 C98 120 78 88 48 74 C92 62 114 96 110 140 Z" />
        <path d="M102 150 C108 114 106 76 90 44 C126 66 128 112 114 148 Z" />
        <path d="M104 152 C120 124 150 102 186 96 C150 74 114 96 102 132 Z" />
        <path d="M104 156 C124 134 158 124 192 132 C162 102 122 108 102 138 Z" />
        <path d="M104 160 C130 148 166 150 198 168 C170 124 128 128 102 148 Z" />
        <circle cx="96" cy="160" r="7" />
        <circle cx="110" cy="158" r="7" />
      </g>
    </svg>
  );
}

/* ── add-to-cart — exact storefront contract: POST /api/cart/items
 * {productId} → then window.dispatchEvent("cart-updated"). We ALSO
 * invalidate the react-query cart cache so the chrome cart badge and
 * drawer refresh instantly. ───────────────────────────────────────── */
function useAddToCart() {
  const qc = useQueryClient();
  return useCallback(
    async (product: TemplateProduct) => {
      if (!product.inStock) return false;
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        if (!res.ok || json.ok === false) throw new Error(json.message ?? "خطا در افزودن به سبد");
        window.dispatchEvent(new CustomEvent("cart-updated"));
        void qc.invalidateQueries({ queryKey: ["cart"] });
        toast.success(json.message ?? "به سبد خرید اضافه شد");
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "خطا در افزودن به سبد");
        return false;
      }
    },
    [qc]
  );
}

/* ── hydration-safe deal countdown (per-product discountEndsAt) ──────
 * SSR renders dashes; ticking starts after mount; zero → «پایان تخفیف». */
function NeonCountdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => setLeft(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);

  if (left !== null && left <= 0) {
    return <span className="vn-timer-ended">پایان تخفیف</span>;
  }
  const t =
    left === null
      ? null
      : {
          d: Math.floor(left / 86_400_000),
          h: Math.floor((left / 3_600_000) % 24),
          m: Math.floor((left / 60_000) % 60),
          s: Math.floor((left / 1000) % 60),
        };
  const pad = (n: number) => String(n).padStart(2, "0");
  const cell = (v: string, suffix?: string) => (
    <span className="vn-timer-cell">
      {v}
      {suffix && <span className="text-[7px] opacity-70">{suffix}</span>}
    </span>
  );
  const sep = () => <span className="vn-timer-sep">:</span>;

  return (
    <span dir="ltr" className="inline-flex items-center gap-1 font-mono tabular-nums" aria-label="زمان باقی‌مانده تخفیف">
      {t === null ? (
        <>
          {cell("--")}
          {sep()}
          {cell("--")}
          {sep()}
          {cell("--")}
        </>
      ) : (
        <>
          {t.d > 0 && (
            <>
              {cell(String(t.d), "d")}
              {sep()}
            </>
          )}
          {cell(pad(t.h), "h")}
          {sep()}
          {cell(pad(t.m), "m")}
          {sep()}
          {cell(pad(t.s), "s")}
        </>
      )}
    </span>
  );
}

/* ── lime add-to-cart button (shared by cards + exclusive) ─────────── */
function ViceAddBtn({
  product, label, className,
}: {
  product: TemplateProduct;
  label?: string;
  className?: string;
}) {
  const addToCart = useAddToCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const onAdd = async () => {
    if (busy || done) return;
    setBusy(true);
    const ok = await addToCart(product);
    setBusy(false);
    if (ok) {
      setDone(true);
      window.setTimeout(() => setDone(false), 1100);
    }
  };
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={!product.inStock || busy}
      className={cn("vn-cta h-10 w-full text-xs", className)}
      aria-label={`افزودن ${product.name} به سبد خرید`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : done ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <ShoppingBasket className="h-4 w-4" aria-hidden />
      )}
      {!product.inStock ? "ناموجود" : done ? "افزوده شد" : label ?? "افزودن به سبد"}
    </button>
  );
}

/* ── section head: EN italic-gradient eyebrow + huge Persian title ─── */
function NoirHead({
  id, en, title, subtitle, href,
}: {
  id?: string;
  en: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p dir="ltr" className="vn-eyebrow text-right">
          <span className="vn-en vn-grad-text">{en}</span>
        </p>
        <h2 id={id} className="mt-1.5 text-xl font-black text-[#F5F5F5] md:text-2xl">
          {href ? (
            <Link href={href} className="transition-colors hover:text-[#FF6B9D]">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {subtitle && <p className="mt-1.5 text-xs text-[#B9A6D8]">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#D400FF]/40 px-4 text-[11px] font-bold text-[#E9B8FF] transition-all hover:border-[#D400FF] hover:bg-[#D400FF]/15 hover:text-white"
        >
          همه
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── VICE product card — violet panel, magenta edge, lime price ────── */
function NoirCard({ product }: { product: TemplateProduct }) {
  const hasDeal = product.discountPercent > 0;
  const timerIso = hasDeal ? (product.discountEndsAt ?? null) : null;
  return (
    <article className="vn-card group">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-black/30" aria-label={product.name}>
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 23vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#D400FF]/40">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {hasDeal && (
          <span className="absolute start-3 top-3 rounded-lg bg-gradient-to-l from-[#FF6B9D] to-[#D400FF] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_0_18px_rgba(212,0,255,.5)] tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-3 top-3 rounded-lg bg-black/75 px-2.5 py-1 text-[10px] font-bold text-white/85 backdrop-blur">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-[10.5px] font-semibold text-[#B9A6D8]">
          <BadgeCheck className="h-3.5 w-3.5 text-[#FF6B9D]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 text-[#F5F5F5] line-clamp-2 transition-colors hover:text-[#FF6B9D]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-300" aria-hidden />
            {product.rating.toLocaleString("fa-IR")}
            {product.reviewCount > 0 && <span className="font-normal text-[#B9A6D8]">({product.reviewCount.toLocaleString("fa-IR")} نظر)</span>}
          </span>
        )}
        <div className="mt-auto space-y-2.5 pt-3">
          {hasDeal && (
            <p className="text-[11px] leading-4 text-[#B9A6D8] line-through tabular-nums">{formatPrice(product.price)}</p>
          )}
          <p className="vn-price text-[15px] font-black tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-normal text-[#B9A6D8]">تومان</span>
          </p>
          {timerIso && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E4FF55]/25 bg-[#150D2B]/60 px-2 py-1.5">
              <Timer className="h-3.5 w-3.5 shrink-0 text-[#E4FF55]" aria-hidden />
              <NeonCountdown iso={timerIso} />
            </div>
          )}
          <ViceAddBtn product={product} />
        </div>
      </div>
    </article>
  );
}

/* ── VICE CITY hero — synthwave sun + grid + slider + neon flicker ─── */
function ViceHero({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const slides = data.slides;
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = total > 0 ? slides[Math.min(idx, total - 1)] : null;

  /* auto-advance 6s (paused on hover/focus) */
  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % total), 6000);
    return () => window.clearInterval(id);
  }, [total, paused]);

  const go = (dir: number) => setIdx((i) => (i + dir + total) % total);

  const title = active?.title ?? store.storeName;
  const words = title.split(" ").filter(Boolean);
  const flickerAt = words.length - 1; /* last word = the neon sign */

  const heroProduct =
    active?.product ??
    [...data.exclusive, ...data.featured, ...data.bestsellers].find((p) => p.inStock) ??
    null;

  return (
    <section
      className="relative w-full"
      aria-roledescription="اسلایدر"
      aria-label="هیرو فروشگاه نئون"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="vn-grain relative h-[420px] w-full overflow-hidden sm:h-[560px]">
        {/* slide artwork layers (cross-fading) */}
        {total > 0 &&
          slides.map((s, i) => (
            <div key={s.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === idx ? 1 : 0 }}>
              <SlideArt slide={s} sizes="(max-width: 640px) 100vw, 1920px" priority={i === 0} className="object-cover" />
            </div>
          ))}

        {/* night tint → sun → horizon → grid → palms */}
        <div aria-hidden className="vn-hero-tint absolute inset-0" />
        <span aria-hidden className="vn-sun" />
        <span aria-hidden className="vn-horizon" />
        <span aria-hidden className="vn-grid" />
        <PalmSilhouette className="absolute bottom-0 start-[-2%] h-[48%] text-[#0B0618]" />
        <PalmSilhouette className="absolute bottom-0 end-[-2%] h-[58%] scale-x-[-1] text-[#0B0618]" />

        {/* active slide content */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1240px] flex-col justify-end px-4 pb-16 sm:px-6">
          <motion.div key={active?.id ?? "vice-static"} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p dir="ltr" className="vn-eyebrow text-right">
              <span className="vn-en vn-grad-text">{store.storeNameEn}</span>
              <span className="text-[#00D4FF]/80">{" // VICE_NIGHTS"}</span>
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.18] text-[#F5F5F5] sm:text-5xl md:text-6xl lg:text-7xl">
              {words.map((w, i) => (
                <span key={`${w}-${i}`} className={i === flickerAt ? "vn-flicker" : undefined}>
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </h2>
            {(active?.subtitle || !active) && (
              <p className="mt-4 max-w-xl text-sm leading-8 text-[#D8CCEF] sm:text-base">
                {active?.subtitle ??
                  (store.announcementActive && store.announcement
                    ? store.announcement
                    : "نئون‌ها روشن‌اند؛ خرید شبانهٔ وایس‌سیتی شروع شده — تخفیف‌ها تا آخرین لحظه شب می‌سوزند.")}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={active?.ctaUrl ?? "/products"} className="vn-cta h-12 px-8 text-sm">
                <Zap className="h-4 w-4" aria-hidden />
                {active?.ctaText ?? "ورود به وایس‌سیتی"}
              </Link>
              <Link href="/products?discount=1" className="vn-cta-ghost h-12 px-7 text-sm">
                <Flame className="h-4 w-4 text-[#FF6B9D]" aria-hidden />
                قیمت‌های داغ امشب
              </Link>
            </div>
            <p className="mt-7 text-[11px] font-bold tracking-[0.22em] text-[#8AD8E8]/75 tabular-nums">
              {toFaDigits(counts.products.toLocaleString("fa-IR"))} کالا · {toFaDigits(counts.brands.toLocaleString("fa-IR"))} برند · {toFaDigits(counts.stories.toLocaleString("fa-IR"))} استوری
            </p>
          </motion.div>
        </div>

        {/* neon product pod */}
        {heroProduct && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="absolute bottom-24 end-6 z-10 hidden w-64 md:block"
          >
            <Link href={`/products/${heroProduct.slug}`} className="vn-pod flex items-center gap-3 p-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40 p-1">
                {heroProduct.mainImage ? (
                  <Image src={heroProduct.mainImage} alt={heroProduct.name} fill sizes="64px" className="object-contain p-1" />
                ) : (
                  <Package className="m-auto h-6 w-6 text-[#D400FF]" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span dir="ltr" className="vn-eyebrow vn-eyebrow-sm block text-[#E4FF55]">TONIGHT_PICK</span>
                <span className="block truncate text-[12.5px] font-black text-[#F5F5F5]">{heroProduct.name}</span>
                <span className="vn-price mt-0.5 block text-[13px] font-black tabular-nums">
                  {formatPrice(heroProduct.discountPrice ?? heroProduct.price)}
                  <span className="text-[9px] font-normal text-[#B9A6D8]"> تومان</span>
                </span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-[#E4FF55]" aria-hidden />
            </Link>
          </motion.div>
        )}

        {/* arrows */}
        {total > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="vn-arrow start-4" aria-label="اسلاید قبلی">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} className="vn-arrow end-4" aria-label="اسلاید بعدی">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}

        {/* dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`رفتن به اسلاید ${(i + 1).toLocaleString("fa-IR")}`}
                aria-current={i === idx}
                className={cn("vn-dot", i === idx && "vn-dot-on")}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── neon ticker announcement strip ────────────────────────────────── */
function ViceStrip({ data }: { data: HomeData }) {
  const msgs = resolveTickerMessages(data.store);
  if (msgs.length === 0) return null;
  const dur = Math.max(10, data.store.tickerSpeed ?? 22);
  return (
    <section aria-label="پیام‌های فروشگاه" className="mx-auto w-full max-w-[1240px] px-4">
      <div className="vn-strip">
        <span className="vn-strip-tag">
          <MoonStar className="h-3 w-3" aria-hidden />
          امشب
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="taj-marquee items-center gap-8 py-0.5" style={{ "--t-dur": `${dur}s` } as React.CSSProperties}>
            {[0, 1].map((copy) =>
              msgs.map((m, i) => (
                <span key={`${copy}-${i}`} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-3 text-[12px] font-bold text-[#EFE3FF]">
                  {m.link ? (
                    <Link href={m.link} className="transition-colors hover:text-[#E4FF55]">
                      {m.text}
                    </Link>
                  ) : (
                    m.text
                  )}
                  <span className="text-[#FF6B9D]" aria-hidden>★</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ accordion item ─────────────────────────────────────────────── */
function ViceFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="vn-faq-item overflow-hidden" data-open={open ? "1" : "0"}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span dir="ltr" className="shrink-0 rounded-lg bg-[#D400FF]/15 px-2 py-1 font-mono text-[10px] font-black tracking-widest text-[#E9B8FF]">
          {`Q${String(n + 1).padStart(2, "0")}`}
        </span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#F5F5F5]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#B9A6D8] transition-transform duration-300", open && "-rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="border-t border-dashed border-[#D400FF]/20 px-4 pb-4 pt-3 text-[12.5px] leading-7 text-[#B9A6D8]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════════ */
export function NeonNoirTemplate({ data }: { data: HomeData }) {
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;
  const chrome = TEMPLATE_CHROME["neon-noir"];
  const ex = data.exclusive[0] ?? null;

  return (
    <div data-template-chrome="1" data-tpl="neon-noir" className="w-full">
      <style>{VN_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      <h1 className="sr-only">{`${data.store.storeName} — نئون نوآر`}</h1>

      <div className="vn-root w-full space-y-12 sm:space-y-14">
        {/* ═══ NEON TICKER STRIP (announcement) ═══ */}
        <ViceStrip data={data} />

        {/* ═══ STORIES — VHS channels ═══ */}
        {stories.length > 0 && (
          <section className="mx-auto w-full max-w-[1240px] px-4" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <NoirHead en="VHS_FEED" title="شب‌نگاری‌ها" subtitle="استوری‌های این هفته" />
              <div className="vn-panel p-4 sm:p-5">
                <StoriesRow stories={stories} />
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ HERO — Vice City synthwave slider ═══ */}
        <ViceHero data={data} />

        {/* ═══ EDGE RAIL + MAIN BODY ═══ */}
        <div className="relative">
          {/* vertical category edge rail — desktop only */}
          {data.categories.length > 0 && (
            <nav aria-label="دسته‌بندی‌های فروشگاه" className="vn-rail">
              <div className="vn-rail-sticky">
                <Link href="/products" className="vn-rail-cap" aria-label="همه محصولات">
                  <Zap className="h-4 w-4" aria-hidden />
                </Link>
                <div className="vn-rail-list no-scrollbar">
                  {data.categories.slice(0, 8).map((c) => (
                    <Link key={c.id} href={`/products?category=${c.slug}`} className="vn-rail-link">
                      {c.name}
                    </Link>
                  ))}
                </div>
                <span aria-hidden className="vn-rail-line" />
              </div>
            </nav>
          )}

          <div className="space-y-12 pb-14 sm:space-y-14 xl:ps-[72px]">
            {/* ═══ CATEGORY RAIL — mobile horizontal snap (desktop = edge rail) ═══ */}
            {data.categories.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4 xl:hidden" aria-labelledby="nn-cats">
                <Reveal>
                  <NoirHead id="nn-cats" en="STREET_GUIDE" title="کوچه‌های شهر" subtitle="دسته‌بندی‌های فروشگاه" href="/products" />
                  <div role="list" className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                    {data.categories.slice(0, 10).map((c) => (
                      <Link
                        key={c.id}
                        href={`/products?category=${c.slug}`}
                        role="listitem"
                        className="group w-36 shrink-0 snap-start rounded-2xl p-2 transition-colors hover:bg-[#2D1B4E]/70"
                      >
                        <span className="relative block h-24 overflow-hidden rounded-2xl border border-[#D400FF]/25">
                          {c.image ? (
                            <Image
                              src={c.image}
                              alt={c.name}
                              fill
                              sizes="144px"
                              className="object-cover opacity-85 transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <span className="grid h-full place-items-center bg-[#2D1B4E]/60 text-[#D400FF]">
                              <MoonStar className="h-7 w-7" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-black text-[#F5F5F5]">{c.name}</span>
                          <span className="shrink-0 text-[9.5px] font-bold text-[#B9A6D8] tabular-nums">
                            {c.productCount.toLocaleString("fa-IR")}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ FLASH DEALS — cinematic full-bleed band w/ countdowns ═══ */}
            {data.discounted.length > 0 && (
              <section className="vn-band vn-grain" aria-labelledby="nn-deals">
                <div className="mx-auto w-full max-w-[1240px] px-4 py-12">
                  <Reveal>
                    <NoirHead
                      id="nn-deals"
                      en="HOT_PRICES"
                      title="قیمت‌های داغ امشب"
                      subtitle="تخفیف‌هایی که تا آخرین لحظهٔ شب می‌سوزند"
                      href="/products?discount=1"
                    />
                    <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {data.discounted.slice(0, 8).map((p) => (
                        <NoirCard key={p.id} product={p} />
                      ))}
                    </div>
                  </Reveal>
                </div>
              </section>
            )}

            {/* ═══ EXCLUSIVE — cinematic band + palms ═══ */}
            {data.exclusive.length > 0 && (
              <section className="vn-band vn-grain" aria-labelledby="nn-exclusive">
                <PalmSilhouette className="absolute bottom-0 start-[2%] h-[40%] text-[#0B0618]" />
                <PalmSilhouette className="absolute bottom-0 end-[2%] h-[52%] scale-x-[-1] text-[#0B0618]" />
                <div className="relative mx-auto w-full max-w-[1240px] px-4 py-12">
                  <Reveal>
                    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                      {ex && (
                        <>
                          <div className="min-w-0">
                            <p dir="ltr" className="text-right">
                              <span className="vn-en vn-grad-text text-3xl font-black tracking-wide sm:text-5xl">EXCLUSIVE</span>
                            </p>
                            <h2 id="nn-exclusive" className="mt-3 text-2xl font-black leading-relaxed text-[#F5F5F5] md:text-4xl">
                              {ex.name}
                            </h2>
                            <p className="mt-2 text-[11px] font-bold tracking-[0.25em] text-[#00D4FF]">{ex.brand.name}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              {ex.rating > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300">
                                  <Star className="h-3.5 w-3.5 fill-amber-300" aria-hidden />
                                  {ex.rating.toLocaleString("fa-IR")}
                                </span>
                              )}
                              {ex.soldCount > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-[#D400FF]/12 px-2.5 py-1 text-[#E9B8FF]">
                                  {ex.soldCount.toLocaleString("fa-IR")} فروش
                                </span>
                              )}
                              {ex.inStock && (
                                <span className="rounded-full bg-[#E4FF55]/12 px-2.5 py-1 text-[#E4FF55]">موجود در انبار</span>
                              )}
                            </div>
                            <div className="mt-5 flex flex-wrap items-end gap-3">
                              {ex.discountPercent > 0 && (
                                <span className="text-sm text-[#B9A6D8] line-through tabular-nums">{formatPrice(ex.price)}</span>
                              )}
                              <span className="vn-price text-2xl font-black tabular-nums sm:text-3xl">
                                {formatPrice(ex.effectivePrice)}
                                <span className="ms-1 text-xs font-normal text-[#B9A6D8]">تومان</span>
                              </span>
                            </div>
                            <div className="mt-7 flex flex-wrap gap-3">
                              <ViceAddBtn product={ex} label="افزودن به سبد" className="h-12 w-auto px-8 text-sm" />
                              <Link href={`/products/${ex.slug}`} className="vn-cta-ghost h-12 px-7 text-sm">
                                مشاهده محصول
                                <ArrowLeft className="h-4 w-4" aria-hidden />
                              </Link>
                            </div>
                          </div>
                          <div className="relative mx-auto aspect-square w-full max-w-sm">
                            <span aria-hidden className="vn-neon-frame absolute inset-4 rounded-full border-dashed" />
                            {ex.mainImage ? (
                              <Image
                                src={ex.mainImage}
                                alt={ex.name}
                                fill
                                sizes="(max-width: 640px) 80vw, 380px"
                                className="object-contain p-8"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="absolute inset-0 m-auto h-20 w-20 text-[#D400FF]/50" aria-hidden />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {/* more exclusives — neon loot rail */}
                    {data.exclusive.length > 1 && (
                      <div role="list" className="no-scrollbar mt-8 flex snap-x gap-3 overflow-x-auto pb-1">
                        {data.exclusive.slice(1, 5).map((p) => (
                          <Link
                            key={p.id}
                            role="listitem"
                            href={`/products/${p.slug}`}
                            className="vn-rank-card vn-rank-card-center w-56 shrink-0 snap-start"
                          >
                            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/40 p-1">
                              {p.mainImage ? (
                                <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-0.5" loading="lazy" />
                              ) : (
                                <Package className="m-auto h-5 w-5 text-[#D400FF]" aria-hidden />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-bold text-[#F5F5F5]">{p.name}</span>
                              <span className="vn-price text-[11px] font-black tabular-nums">{formatPrice(p.effectivePrice)}</span>
                            </span>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-[#B9A6D8]" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    )}
                  </Reveal>
                </div>
              </section>
            )}

            {/* ═══ FEATURED — neon window grid ═══ */}
            {data.featured.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-featured">
                <Reveal>
                  <NoirHead id="nn-featured" en="NEON_WINDOW" title="ویترین نئون" subtitle="برجسته‌های شب" href="/products?sort=rating" />
                  <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {data.featured.slice(0, 8).map((p) => (
                      <NoirCard key={p.id} product={p} />
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ BESTSELLERS — boulevard stars ranked rail ═══ */}
            {data.bestsellers.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-best">
                <Reveal>
                  <NoirHead id="nn-best" en="BOULEVARD_STARS" title="ستاره‌های بلوار" subtitle="پرفروش‌های همیشگی" href="/products?sort=bestselling" />
                  <div role="list" className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
                    {data.bestsellers.slice(0, 8).map((p, i) => (
                      <Link key={p.id} role="listitem" href={`/products/${p.slug}`} className="vn-rank-card group w-60 shrink-0 snap-start sm:w-64">
                        <span dir="ltr" aria-hidden className="vn-rank-num vn-en vn-grad-text">
                          {String(i + 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="relative block h-20 overflow-hidden rounded-xl border border-[#D400FF]/25 bg-black/25">
                            {p.mainImage ? (
                              <Image
                                src={p.mainImage}
                                alt={p.name}
                                fill
                                sizes="240px"
                                className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="m-auto h-7 w-7 text-[#D400FF]" aria-hidden />
                            )}
                          </span>
                          <span className="mt-2 block min-h-12 text-[12.5px] font-bold leading-6 text-[#F5F5F5] line-clamp-2 group-hover:text-[#FF6B9D]">
                            {p.name}
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span className="vn-price text-[12px] font-black tabular-nums">{formatPrice(p.effectivePrice)}</span>
                            {p.soldCount > 0 && (
                              <span className="rounded-full bg-[#D400FF]/12 px-2 py-0.5 text-[9px] font-black text-[#E9B8FF] tabular-nums">
                                {p.soldCount.toLocaleString("fa-IR")} فروش
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ NEWEST — fresh arrivals ═══ */}
            {data.newest.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-newest">
                <Reveal>
                  <NoirHead id="nn-newest" en="FRESH_ARRIVALS" title="تازه رسیده‌ها" subtitle="به‌تازگی وارد وایس‌سیتی شده‌اند" href="/products?sort=newest" />
                  <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {data.newest.slice(0, 8).map((p) => (
                      <NoirCard key={p.id} product={p} />
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ AI TEASER — midnight consultant glass band ═══ */}
            <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-ai">
              <Reveal>
                <div className="vn-ai">
                  <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#D400FF] to-[#FF6B9D] text-white shadow-[0_0_22px_rgba(212,0,255,.5)]">
                          <Bot className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <p dir="ltr" className="vn-eyebrow text-right">
                            <span className="vn-en vn-grad-text">MIDNIGHT_CONSULTANT</span>
                          </p>
                          <h2 id="nn-ai" className="text-lg font-black text-[#F5F5F5] sm:text-xl">مشاور نیمه‌شب</h2>
                        </div>
                      </div>
                      <p className="mt-4 max-w-lg text-[13px] leading-8 text-[#D8CCEF]">
                        دستیار خرید هوشمند تاج تا نیمه‌شب هم بیدار است؛ متصل به انبار و قیمت‌های واقعی — سوالی درباره
                        محصولات، مشخصات یا سفارشت داری، همان‌جا بپرس.
                      </p>
                      <button type="button" onClick={() => useChatStore.getState().setOpen(true)} className="vn-cta mt-6 h-12 px-7 text-sm">
                        <Sparkles className="h-4 w-4" aria-hidden />
                        شروع گفتگو با مشاور
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {[
                        { icon: PackageSearch, t: "جستجوی هوشمند", d: "«هدفون بی‌سیم زیر ۵ میلیون» — دقیقاً همین رو می‌فهمه" },
                        { icon: GitCompareArrows, t: "مقایسه محصولات", d: "مقایسه فنی و ارزش خرید بین چند محصول" },
                        { icon: Send, t: "پیگیری سفارش", d: "وضعیت لحظه‌ای سفارش فقط با شماره سفارش و موبایل" },
                      ].map((f) => (
                        <li key={f.t} className="vn-glass flex items-start gap-3 p-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#00D4FF]/12 text-[#00D4FF]">
                            <f.icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-[13px] font-bold text-[#F5F5F5]">{f.t}</span>
                            <span className="mt-0.5 block text-[11px] leading-5 text-[#B9A6D8]">{f.d}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </section>

            {/* ═══ SHOWCASES — cinematic feature films ═══ */}
            {data.showcases.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-films">
                <Reveal>
                  <NoirHead id="nn-films" en="FEATURE_FILMS" title="پرده‌های سینما" subtitle="بنرهای ویژه فروشگاه" />
                  <div className="space-y-8">
                    {data.showcases.slice(0, 2).map((s, i) => (
                      <article key={s.id} className="vn-band vn-grain relative overflow-hidden">
                        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-8 px-4 py-10 md:px-6 md:py-12 lg:grid-cols-2">
                          <Link
                            href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                            aria-label={s.title}
                            className={cn(
                              "vn-neon-frame relative block aspect-[16/10] overflow-hidden rounded-2xl",
                              i % 2 === 1 && "lg:order-2"
                            )}
                          >
                            <Image
                              src={s.image}
                              alt={s.title}
                              fill
                              sizes="(max-width: 1024px) 92vw, 46vw"
                              className="object-cover"
                              loading="lazy"
                            />
                            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#150D2B]/60 to-transparent" />
                          </Link>
                          <div className="min-w-0">
                            <p dir="ltr" className="text-right">
                              <span className="vn-en vn-grad-text text-2xl font-black tracking-wide sm:text-3xl">
                                {i === 0 ? "ACT I" : "ACT II"}
                              </span>
                            </p>
                            <h3 className="mt-3 text-2xl font-black leading-[1.4] text-[#F5F5F5] md:text-3xl">{s.title}</h3>
                            {s.subtitle && <p className="mt-3 max-w-md text-[13px] leading-8 text-[#B9A6D8]">{s.subtitle}</p>}
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                              <Link
                                href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                                className="vn-cta h-12 px-8 text-sm"
                              >
                                خرید بلیت
                                <ArrowLeft className="h-4 w-4" aria-hidden />
                              </Link>
                              {s.product && (
                                <p className="vn-price text-[13px] font-black tabular-nums">
                                  {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ BRANDS — neon sign marquee ═══ */}
            {data.brands.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-brands">
                <Reveal>
                  <NoirHead id="nn-brands" en="BRAND_SIGNS" title="تابلوی برندها" subtitle="برندهای نئونی فروشگاه" />
                  <div className="vn-panel overflow-hidden py-4">
                    <div
                      className="taj-marquee items-center gap-3 px-3 [mask-image:linear-gradient(to_left,transparent,black_4%,black_96%,transparent)]"
                      style={{ "--t-dur": "28s" } as React.CSSProperties}
                    >
                      {[0, 1].map((copy) =>
                        data.brands.map((b) => (
                          <Link
                            key={`bd-${copy}-${b.id}`}
                            href={`/products?brand=${b.slug}`}
                            aria-hidden={copy === 1}
                            tabIndex={copy === 1 ? -1 : 0}
                            className="vn-brand-chip"
                          >
                            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                              {b.logo || b.image ? (
                                <Image src={(b.logo ?? b.image)!} alt="" fill sizes="32px" className="object-cover" loading="lazy" />
                              ) : (
                                <span className="grid h-full w-full place-items-center bg-[#D400FF]/20 text-[11px] font-black text-[#E9B8FF]">
                                  {b.name.charAt(0)}
                                </span>
                              )}
                            </span>
                            {b.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ FAQ — night Q&A ═══ */}
            {data.faq.length > 0 && (
              <section className="mx-auto w-full max-w-[1240px] px-4" aria-labelledby="nn-faq">
                <Reveal>
                  <NoirHead id="nn-faq" en="NIGHT_QA" title="پرسش‌های شبانه" subtitle="پاسخ‌های صریح، شبانه‌روزی" />
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {data.faq.map((f, i) => (
                      <ViceFaq key={i} h={f.h} p={f.p} n={i} />
                    ))}
                  </div>
                </Reveal>
              </section>
            )}

            {/* ═══ EMPTY STATE ═══ */}
            {!hasAnyProduct && (
              <section className="mx-auto w-full max-w-[1240px] px-4">
                <div className="vn-band vn-grain px-6 py-20 text-center">
                  <MoonStar className="mx-auto mb-4 h-12 w-12 text-[#D400FF]/60" aria-hidden />
                  <h2 className="text-lg font-black text-[#F5F5F5]">نئون‌ها هنوز روشن نشده‌اند</h2>
                  <p className="mt-2 text-sm leading-7 text-[#B9A6D8]">محصولات فروشگاه به‌زودی آنلاین می‌شوند…</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

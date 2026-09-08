"use client";

/**
 * TEMPLATE · gaming-cyber — «VICE ARENA» (v31 · RIG HERO REBUILD)
 * ---------------------------------------------------------------------------
 * v31 hero: 100% CODE-DRAWN tempered-glass ARGB tower on an animated
 * ARGB desk mat (edge LEDs + dot texture + code-drawn mouse), flanked by
 * the two GENERATED 3D headset artworks (pink bunny / black tactical).
 * 3 front + 2 internal RGB fans — rings hue-cycle at phase offsets, the
 * BLADES never spin (owner's explicit demand). Top LED strip, PSU
 * underglow, glass tint reacting to the ambient glow. Old photo slider
 * removed; Persian copy/CTAs/parallax kept; scene stays dark in both
 * skins so the RGB always reads.
 * GTA-6 VICE promo bones: magenta #D000FF + acid-lime #EAFF00, giant italic-
 * black display headlines (900 + skewX(-8deg), white→magenta gradient), lime
 * pill CTAs (lime bg + BLACK text + plus-circle), vertical lime tab, MAGENTA
 * grid floor, outlined numerals ۰۱/۰۲ deal blocks, huge glowing monogram.
 * GameUp bones: void #120E18 canvas, purple→pink CONNECT gradient banner,
 * glass cards, thin neon SVG swooshes, glowing rounded-full CTAs.
 * ARGB PRODUCT LIGHTING (owner's #1 ask — 100% CSS): every product image on a
 * «stage» (rotating conic rainbow RING + pulsing UNDERGLOW); name-aware fx —
 * فن/Fan SPINS like a GIF, کیبورد/Keyboard hue-breathes, ماوس/پد موس ring
 * accelerates — ALL gated by [data-glow="on"] + prefers-reduced-motion.
 * Art: argb-bunny-pink + argb-tactical-black (generated 3D headsets flanking
 * the code-drawn hero rig + ARGB_GEAR spotlights) · vice-girl (deal zone) ·
 * stream-girl (CONNECT) · argb-rig (banner) · argb-fan (spinning spotlight) ·
 * argb-keyboard (hue spotlight) + v28 anime set.
 * Feature toggles (timer/glow/parallax/scanlines, missing = ON) kept; v25
 * timerEndsAt global override kept; LIGHT SKIN + reduced-motion cover v30. */

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { toast } from "sonner";
import {
  Activity, BadgeCheck, Check, ChevronLeft, Fan, Flame, Gamepad2,
  Headphones, HelpCircle, Keyboard, Layers, Loader2, Package, Plus, Radio,
  ShieldCheck, ShoppingBasket, Sparkles, Star, Swords, Timer, Trophy, Truck,
  Users, Zap,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import type { TemplateContentData, TemplateShowcase } from "@/lib/templates/content";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/stores";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";
import { resolveTickerMessages } from "./chrome/bits";

/* ══ ALL custom CSS — one plain <style> tag, scoped under [data-tpl] ══ */
const GC_CSS = `
[data-tpl="gaming-cyber"]{
  --gc-bg:#120E18;--gc-surface:#221A31;--gc-card:#2A2038;
  --gc-magenta:#E22BFF;--gc-vice:#D000FF;--gc-lime:#EAFF00;--gc-lime-ink:#0B0014;
  --gc-violet:#8B5CF6;--gc-cyan:#06B6D4;--gc-emerald:#10B981;
  --gc-text:#EFEAF9;--gc-dim:#A79BC6;--gc-mono:#67E8F9;
  background:#120E18;color:#EFEAF9;
}
[data-tpl="gaming-cyber"] .gc-root{
  position:relative;
  background:
    radial-gradient(1100px 540px at 82% -4%,rgba(168,85,247,.20),transparent 62%),
    radial-gradient(880px 480px at 6% 14%,rgba(208,0,255,.12),transparent 60%),
    radial-gradient(900px 640px at 50% 108%,rgba(6,182,212,.09),transparent 62%),
    #120E18;
  color:#EFEAF9;
}
[data-tpl="gaming-cyber"] .gc-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;font-weight:700;letter-spacing:.16em;color:#8F7FC0}
[data-tpl="gaming-cyber"] .gc-code-cyan{color:#67E8F9}
[data-tpl="gaming-cyber"] .gc-code-magenta{color:#F79CFF}
/* ── floating window chrome ─────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-win{
  position:relative;border-radius:16px;overflow:hidden;
  border:1px solid rgba(139,92,246,.30);
  background:linear-gradient(180deg,rgba(42,32,56,.55),rgba(34,26,49,.72));
  backdrop-filter:blur(10px);
  box-shadow:0 22px 60px -30px rgba(0,0,0,.85);
}
[data-tpl="gaming-cyber"] .gc-win-bar{
  display:flex;align-items:center;gap:10px;padding:9px 14px;
  border-bottom:1px solid rgba(139,92,246,.24);background:rgba(18,14,24,.75);
}
[data-tpl="gaming-cyber"] .gc-dots{display:inline-flex;gap:6px;flex-shrink:0}
[data-tpl="gaming-cyber"] .gc-dots i{width:9px;height:9px;border-radius:999px;display:block}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(1){background:#FF5F57;box-shadow:0 0 8px rgba(255,95,87,.65)}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(2){background:#FEBC2E;box-shadow:0 0 8px rgba(254,188,46,.6)}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(3){background:#28C840;box-shadow:0 0 8px rgba(40,200,64,.6)}
[data-tpl="gaming-cyber"] .gc-win-title{font-size:12.5px;font-weight:800;color:#EFEAF9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-tpl="gaming-cyber"] .gc-win-code{margin-inline-start:auto;flex-shrink:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.14em;color:#8F7FC0}
[data-tpl="gaming-cyber"] .gc-win-code-flush{margin-inline-start:0}
[data-tpl="gaming-cyber"] .gc-win-bar-sm{padding:6px 12px}
[data-tpl="gaming-cyber"][data-scan="on"] .gc-win-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(6,182,212,.045) 0 1px,transparent 1px 3px)}
/* ── LIVE badge (emerald) ───────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-live-badge{
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;padding:3px 10px;
  border-radius:999px;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.45);
  color:#34D399;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:9.5px;font-weight:900;letter-spacing:.18em;
}
[data-tpl="gaming-cyber"] .gc-live-dot{width:7px;height:7px;border-radius:999px;background:#10B981;animation:gc-live-pulse 1.6s ease-out infinite}
[data-tpl="gaming-cyber"] .gc-live-dot-sm{width:5px;height:5px}
[data-tpl="gaming-cyber"] .gc-live-badge-sm{padding:1px 7px}
@keyframes gc-live-pulse{
  0%{box-shadow:0 0 0 0 rgba(16,185,129,.55)}
  80%{box-shadow:0 0 0 9px rgba(16,185,129,0)}
  100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}
}
/* ── HUD corner brackets ────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-corners{position:absolute;inset:10px;pointer-events:none;z-index:12}
[data-tpl="gaming-cyber"] .gc-corners i{position:absolute;width:16px;height:16px}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(1){top:0;right:0;border-top:2px solid rgba(6,182,212,.8);border-right:2px solid rgba(6,182,212,.8)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(2){top:0;left:0;border-top:2px solid rgba(6,182,212,.45);border-left:2px solid rgba(6,182,212,.45)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(3){bottom:0;right:0;border-bottom:2px solid rgba(6,182,212,.45);border-right:2px solid rgba(6,182,212,.45)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(4){bottom:0;left:0;border-bottom:2px solid rgba(6,182,212,.8);border-left:2px solid rgba(6,182,212,.8)}
/* ── scanlines texture (feature-gated by [data-scan]) ──────────────── */
[data-tpl="gaming-cyber"][data-scan="on"] .gc-scanlines{
  background:repeating-linear-gradient(0deg,rgba(6,182,212,.07) 0 1px,transparent 1px 3px);
}
/* ── RGB border cycle (feature-gated by [data-glow]) ────────────────── */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb{position:relative}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb::before{
  content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;
  background:conic-gradient(#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#FF3EF0);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
  opacity:.55;animation:gc-rgb-cycle 6s linear infinite;pointer-events:none;z-index:2;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb:hover::before{opacity:1}
@keyframes gc-rgb-cycle{to{filter:hue-rotate(360deg)}}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-glow-halo{box-shadow:0 0 44px -12px rgba(208,0,255,.6)}
/* ── hexagon clip accents ───────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-hex{clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%)}
[data-tpl="gaming-cyber"] .gc-hex-grad{background:linear-gradient(135deg,#E22BFF,#8B5CF6 50%,#06B6D4)}
/* ── product card ───────────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-card{
  position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
  border:1px solid rgba(139,92,246,.26);
  background:linear-gradient(180deg,rgba(42,32,56,.62),rgba(34,26,49,.78));
  backdrop-filter:blur(8px);
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-card:hover{transform:translateY(-5px);border-color:rgba(226,43,255,.55)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover{
  box-shadow:0 0 0 1px rgba(226,43,255,.35),0 18px 44px -16px rgba(208,0,255,.5);
}
/* ── glitch / RGB-split hover on product titles ─────────────────────── */
[data-tpl="gaming-cyber"] .gc-glitch:hover .gc-glitch-t,
[data-tpl="gaming-cyber"] .gc-glitch:focus-within .gc-glitch-t{
  animation:gc-glitch .5s steps(2,jump-none) infinite;color:#fff;
}
@keyframes gc-glitch{
  0%,100%{text-shadow:none;transform:none}
  18%{text-shadow:2px 0 rgba(255,62,240,.85),-2px 0 rgba(6,182,212,.85);transform:translateX(1px)}
  36%{text-shadow:-2px 0 rgba(226,43,255,.85),2px 0 rgba(6,182,212,.85);transform:translateX(-1px)}
  54%{text-shadow:1px 0 rgba(139,92,246,.85),-1px 0 rgba(6,182,212,.85)}
}
/* ── buttons ────────────────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  font-weight:800;color:#fff;cursor:pointer;
  background:linear-gradient(135deg,#E22BFF 0%,#8B5CF6 55%,#06B6D4 135%);
  border:1px solid rgba(226,43,255,.55);
  box-shadow:0 10px 26px -12px rgba(208,0,255,.75);
  transition:filter .2s,transform .2s,box-shadow .2s;
}
[data-tpl="gaming-cyber"] .gc-btn:hover{filter:brightness(1.12) saturate(1.2);transform:translateY(-1px);box-shadow:0 14px 34px -12px rgba(208,0,255,.9)}
[data-tpl="gaming-cyber"] .gc-btn:active{transform:translateY(0) scale(.98)}
[data-tpl="gaming-cyber"] .gc-btn:disabled{opacity:.45;pointer-events:none;filter:grayscale(.4)}
[data-tpl="gaming-cyber"] .gc-btn-ghost{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  font-weight:800;color:#E9D5FF;cursor:pointer;
  background:rgba(42,32,56,.4);border:1px solid rgba(139,92,246,.5);backdrop-filter:blur(6px);
  transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-btn-ghost:hover{border-color:rgba(6,182,212,.8);color:#fff;box-shadow:0 0 20px -8px rgba(6,182,212,.7);transform:translateY(-1px)}
[data-tpl="gaming-cyber"] .gc-btn-ghost:disabled{opacity:.45;pointer-events:none}
/* ── hero ───────────────────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-hero{
  border:1px solid rgba(139,92,246,.35);
  box-shadow:0 30px 80px -40px rgba(0,0,0,.9),inset 0 0 60px rgba(18,14,24,.55);
}
[data-tpl="gaming-cyber"] .gc-hero-fallback{
  background:
    radial-gradient(600px 300px at 70% 20%,rgba(208,0,255,.3),transparent 60%),
    radial-gradient(500px 260px at 20% 70%,rgba(6,182,212,.18),transparent 60%),
    linear-gradient(160deg,#2A2038,#120E18 70%);
}
/* v30: VICE scrim — magenta sunset push on top, deep-void base below so the
   giant display headline always pops over the key art. */
[data-tpl="gaming-cyber"] .gc-hero-tint{
  background:
    radial-gradient(120% 95% at 82% -12%,rgba(208,0,255,.4),transparent 55%),
    radial-gradient(85% 70% at 8% 112%,rgba(234,255,0,.1),transparent 52%),
    linear-gradient(to top,rgba(11,0,20,.97) 0%,rgba(11,0,20,.6) 34%,rgba(11,0,20,.12) 60%,rgba(11,0,20,.45) 100%);
}
/* v30: perspective grid floor — now MAGENTA (Vice City energy) */
[data-tpl="gaming-cyber"] .gc-grid-floor{
  position:absolute;left:-22%;right:-22%;bottom:-14%;height:52%;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,62,240,.65) 1.5px,transparent 1.5px),
    linear-gradient(90deg,rgba(208,0,255,.45) 1.5px,transparent 1.5px);
  background-size:46px 46px;
  transform:perspective(560px) rotateX(60deg);transform-origin:top center;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 32%,#000 72%,transparent);
  mask-image:linear-gradient(to bottom,transparent,#000 32%,#000 72%,transparent);
}
[data-tpl="gaming-cyber"] .gc-hero-hud{
  position:absolute;top:0;left:0;right:0;z-index:14;pointer-events:none;
  display:flex;align-items:center;gap:10px;padding:10px 14px;
  background:linear-gradient(180deg,rgba(11,0,20,.8),transparent);
}
/* (v31: old photo-slider arrows/dots removed with the slider — the hero
   centerpiece is now the code-drawn ARGB rig; see .gc-rig-* below) */
/* ── stats tiles ────────────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-tile{
  position:relative;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;
  border:1px solid rgba(139,92,246,.25);
  background:linear-gradient(180deg,rgba(42,32,56,.5),rgba(34,26,49,.6));
}
[data-tpl="gaming-cyber"] .gc-tile-ico{
  display:grid;place-items:center;width:38px;height:38px;border-radius:10px;flex-shrink:0;
  background:rgba(226,43,255,.14);border:1px solid rgba(226,43,255,.35);color:#F79CFF;
}
[data-tpl="gaming-cyber"] .gc-tile-v{font-size:15px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;line-height:1.15}
[data-tpl="gaming-cyber"] .gc-tile-l{font-size:10px;color:#A79BC6;font-weight:600}
/* ── category hex tiles ─────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-cat-hex{transition:transform .3s,filter .3s}
[data-tpl="gaming-cyber"] .gc-cat:hover .gc-cat-hex{transform:scale(1.06) rotate(2deg);filter:drop-shadow(0 0 14px rgba(255,62,240,.6))}
/* ── deal timer cells ───────────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-timer-cell{
  display:inline-block;min-width:30px;text-align:center;padding:1.5px 5px;border-radius:6px;
  background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.35);color:#67E8F9;
  font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums;
}
[data-tpl="gaming-cyber"] .gc-timer-sep{color:rgba(103,232,249,.5);font-size:10.5px;font-weight:800}
[data-tpl="gaming-cyber"] .gc-timer-cell-lg{min-width:42px;font-size:13px;padding:3px 7px}
[data-tpl="gaming-cyber"] .gc-timer-sep-lg{font-size:13px}
[data-tpl="gaming-cyber"] .gc-timer-ended{padding:2px 10px;border-radius:999px;background:rgba(167,155,198,.15);color:#A79BC6;font-size:10px;font-weight:800}
/* ── in-stock emerald tag ───────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-stock{
  display:inline-flex;align-items:center;gap:5px;padding:2.5px 8px;border-radius:999px;
  background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.4);color:#34D399;
  font-size:9.5px;font-weight:800;
}
/* ── rank badges (hexagon) ──────────────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-rank{
  display:grid;place-items:center;width:40px;height:44px;flex-shrink:0;
  clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);
  font-size:14px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;
}
[data-tpl="gaming-cyber"] .gc-rank-1{background:linear-gradient(160deg,#FF3EF0,#8B5CF6);filter:drop-shadow(0 0 12px rgba(255,62,240,.6))}
[data-tpl="gaming-cyber"] .gc-rank-2{background:linear-gradient(160deg,#8B5CF6,#6D28D9);filter:drop-shadow(0 0 10px rgba(139,92,246,.45))}
[data-tpl="gaming-cyber"] .gc-rank-3{background:linear-gradient(160deg,#06B6D4,#0E7490);filter:drop-shadow(0 0 10px rgba(6,182,212,.45))}
[data-tpl="gaming-cyber"] .gc-rank-n{background:rgba(42,32,56,.85);color:#A79BC6}
/* ── legendary (exclusive) showcase ─────────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-legendary{
  position:relative;border-radius:20px;overflow:hidden;
  border:1px solid rgba(226,43,255,.4);
  background:
    radial-gradient(520px 300px at 82% 20%,rgba(208,0,255,.18),transparent 62%),
    radial-gradient(420px 260px at 12% 84%,rgba(6,182,212,.12),transparent 62%),
    linear-gradient(165deg,rgba(42,32,56,.9),rgba(18,14,24,.95));
}
[data-tpl="gaming-cyber"] .gc-legend-ring{
  position:absolute;inset:-6%;border-radius:50%;border:1.5px dashed rgba(255,62,240,.45);
  animation:gc-spin 16s linear infinite;
}
@keyframes gc-spin{to{transform:rotate(360deg)}}
/* ── announcement / system status strip ─────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-strip{
  position:relative;display:flex;align-items:center;gap:10px;padding:8px 12px;
  border-radius:12px;overflow:hidden;
  border:1px solid rgba(226,43,255,.3);
  background:linear-gradient(90deg,rgba(208,0,255,.13),rgba(139,92,246,.10));
}
[data-tpl="gaming-cyber"] .gc-strip-badge{
  flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;
  background:rgba(226,43,255,.2);border:1px solid rgba(226,43,255,.5);color:#F79CFF;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9.5px;font-weight:900;letter-spacing:.16em;
}
/* ── sponsor chips / mission cards / FAQ ────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-sponsor{
  display:inline-flex;align-items:center;gap:10px;flex-shrink:0;height:48px;padding:0 16px;border-radius:999px;
  border:1px solid rgba(139,92,246,.3);background:rgba(34,26,49,.6);
  font-size:12px;font-weight:800;color:#EFEAF9;letter-spacing:.03em;
  transition:border-color .2s,color .2s,box-shadow .2s;
}
[data-tpl="gaming-cyber"] .gc-sponsor:hover{border-color:rgba(6,182,212,.8);color:#67E8F9;box-shadow:0 0 18px -8px rgba(6,182,212,.8)}
[data-tpl="gaming-cyber"] .gc-mission{position:relative;display:block;overflow:hidden;border-radius:14px;border:1px solid rgba(139,92,246,.3)}
[data-tpl="gaming-cyber"] .gc-faq-item{
  border-radius:12px;border:1px solid rgba(139,92,246,.22);
  background:linear-gradient(180deg,rgba(42,32,56,.5),rgba(34,26,49,.62));
  transition:border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-faq-item[data-open="1"]{border-color:rgba(226,43,255,.5)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-faq-item[data-open="1"]{box-shadow:0 0 26px -10px rgba(208,0,255,.5)}

/* ═══════════ v28 · ARGB RAINBOW SYSTEM (kept, conics carry lime now) ═══ */
@keyframes gc-rgb-flow{to{filter:hue-rotate(360deg)}}
@keyframes gc-rgb-slide{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes gc-grad-shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes gc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
/* hero shell — animated RAINBOW conic ring wrapping the whole hero */
[data-tpl="gaming-cyber"] .gc-hero-shell{
  position:relative;padding:2.5px;border-radius:24px;
  box-shadow:0 30px 80px -40px rgba(0,0,0,.9);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-hero-shell::before{
  content:"";position:absolute;inset:0;border-radius:inherit;z-index:0;
  background:conic-gradient(#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  animation:gc-rgb-flow 10s linear infinite;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-hero-shell:hover::before{animation-duration:3s}
/* RGB edge — animated conic rainbow border for art frames / banners */
[data-tpl="gaming-cyber"] .gc-rgb-edge{position:relative}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb-edge::after{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;z-index:4;pointer-events:none;
  background:conic-gradient(#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
  animation:gc-rgb-flow 8s linear infinite;opacity:.8;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb-edge:hover::after{animation-duration:2.5s;opacity:1}
/* section-head RGB underline scan */
[data-tpl="gaming-cyber"] .gc-head{position:relative}
[data-tpl="gaming-cyber"] .gc-head::after{
  content:"";position:absolute;bottom:-5px;inset-inline-start:0;width:100%;height:3px;border-radius:999px;
  background:linear-gradient(90deg,#F43F5E,#FF3EF0,#8B5CF6,#06B6D4,#10B981,#EAFF00,#F43F5E);
  background-size:220% 100%;animation:gc-rgb-slide 6s linear infinite;
  box-shadow:0 0 14px -2px rgba(255,62,240,.6);opacity:.95;
}
[data-tpl="gaming-cyber"] .mb-5 > p{margin-top:11px}
/* hero CTA — animated rainbow gradient */
[data-tpl="gaming-cyber"] .gc-btn-rgb{
  background:linear-gradient(110deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#F43F5E);
  background-size:300% 100%;animation:gc-rgb-slide 5s linear infinite;
  box-shadow:0 10px 30px -10px rgba(208,0,255,.85),0 0 26px -6px rgba(6,182,212,.5);
  border:1px solid rgba(226,43,255,.6);
}
[data-tpl="gaming-cyber"] .gc-btn-rgb:hover{animation-duration:1.4s;filter:brightness(1.15) saturate(1.3)}
/* window chrome top hairline — rainbow strip on every gc-win */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-win::after{
  content:"";position:absolute;top:0;left:0;right:0;height:2px;z-index:6;pointer-events:none;
  background:linear-gradient(90deg,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF3EF0);
  background-size:200% 100%;animation:gc-rgb-slide 7s linear infinite;opacity:.75;
}
/* card RGB cycle — thicker, faster; hover = even faster */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb::before{padding:2px;opacity:.75;animation-duration:4.5s}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb:hover::before{animation-duration:1.2s}
/* product photos glow (ARGB spill) */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card .object-contain{
  filter:drop-shadow(0 6px 18px rgba(208,0,255,.35)) drop-shadow(0 0 10px rgba(6,182,212,.25));
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .object-contain{
  filter:drop-shadow(0 10px 26px rgba(208,0,255,.55)) drop-shadow(0 0 16px rgba(6,182,212,.4));
}
/* timers / category hexes / hex badges / FAQ q-chip */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-timer-cell{box-shadow:0 0 12px -4px rgba(6,182,212,.6)}
[data-tpl="gaming-cyber"] .gc-cat:hover .gc-cat-hex{filter:drop-shadow(0 0 20px rgba(255,62,240,.75)) drop-shadow(0 0 10px rgba(6,182,212,.45))}
[data-tpl="gaming-cyber"] .gc-hex-grad{background-size:180% 180%;animation:gc-grad-shift 7s ease infinite}
[data-tpl="gaming-cyber"] .gc-qchip{box-shadow:0 0 14px -6px rgba(226,43,255,.65)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-corners i{filter:drop-shadow(0 0 5px rgba(6,182,212,.7))}
/* ── «اسطوره‌های آرنا» anime mascot band ─────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-arena{
  position:relative;border-radius:20px;overflow:hidden;
  border:1px solid rgba(139,92,246,.4);
  background:
    radial-gradient(700px 380px at 85% 10%,rgba(208,0,255,.2),transparent 60%),
    radial-gradient(560px 320px at 6% 92%,rgba(6,182,212,.15),transparent 60%),
    linear-gradient(160deg,rgba(42,32,56,.85),rgba(18,14,24,.94));
}
[data-tpl="gaming-cyber"] .gc-arena-grid{display:grid;gap:24px;padding:24px;align-items:center}
@media (min-width:1024px){
  [data-tpl="gaming-cyber"] .gc-arena-grid{grid-template-columns:.92fr 1.08fr;padding:32px;gap:36px}
}
[data-tpl="gaming-cyber"] .gc-arena-art{position:relative}
[data-tpl="gaming-cyber"] .gc-art-frame{
  position:relative;aspect-ratio:4/3;border-radius:22px;overflow:hidden;z-index:1;
  border:1px solid rgba(139,92,246,.45);
  box-shadow:0 24px 60px -24px rgba(0,0,0,.9),0 0 34px -8px rgba(226,43,255,.45);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-art-frame{
  box-shadow:0 24px 64px -24px rgba(0,0,0,.9),0 0 44px -8px rgba(208,0,255,.6),0 0 26px -6px rgba(6,182,212,.4);
}
[data-tpl="gaming-cyber"] .gc-arena-mascot{
  position:absolute;bottom:14px;inset-inline-start:14px;width:42%;max-width:230px;aspect-ratio:1/1;
  border-radius:20px;overflow:hidden;z-index:2;transform:rotate(-3deg);
  border:2px solid rgba(255,62,240,.6);
  box-shadow:0 18px 44px -14px rgba(0,0,0,.85),0 0 34px -8px rgba(255,62,240,.7);
  animation:gc-float 7s ease-in-out infinite;
}
[data-tpl="gaming-cyber"] .gc-float{animation:gc-float 6.5s ease-in-out infinite}
/* category chips (arena band → gaming categories) */
[data-tpl="gaming-cyber"] .gc-chip{
  display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  border:1px solid rgba(139,92,246,.5);background:rgba(42,32,56,.55);color:#EFEAF9;
  font-size:12.5px;font-weight:800;transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-chip:hover{
  border-color:rgba(255,62,240,.8);color:#F79CFF;transform:translateY(-2px);
  box-shadow:0 0 20px -6px rgba(208,0,255,.75);
}

/* ═════════════════════════════════════════════════════════════════════
   v30 · VICE-ARENA SIGNATURE SYSTEM — GTA × GameUp
   (everything gated: [data-glow="on"] where it glows + reduced-motion
   kill-switch at the bottom of this block + light-skin variants below)
   ═════════════════════════════════════════════════════════════════════ */
/* ── giant italic-black display headline (gradient white→magenta) ───── */
/* NOTE: use background-image (NOT the background shorthand) everywhere a
   clip-text gradient is (re)declared — the shorthand would reset
   background-clip back to border-box and make the headline a gradient
   RECTANGLE with invisible text (caught in light mode QA).            */
[data-tpl="gaming-cyber"] .gc-display{
  display:inline-block;
  font-weight:900;font-style:italic;
  letter-spacing:-.015em;line-height:1.08;
  transform:skewX(-8deg);
  background-image:linear-gradient(180deg,#FFFFFF 8%,#FFD6FF 48%,#F86BFF 78%,#D000FF 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 26px rgba(208,0,255,.45)) drop-shadow(0 1px 2px rgba(0,0,0,.4));
}
[data-tpl="gaming-cyber"] .gc-ds-hero{font-size:clamp(32px,6.2vw,74px);line-height:1.04}
[data-tpl="gaming-cyber"] .gc-ds-xl{font-size:clamp(24px,3.8vw,42px)}
[data-tpl="gaming-cyber"] .gc-ds-lg{font-size:clamp(21px,3vw,32px)}
[data-tpl="gaming-cyber"] .gc-ds-deal{font-size:clamp(26px,4.4vw,56px);line-height:1.05}
/* ── acid-lime chip (bg lime + near-black text — NEVER lime text on dark) */
[data-tpl="gaming-cyber"] .gc-lime-chip{
  display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:999px;
  background:#EAFF00;color:#0B0014;
  font-weight:900;font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;
  box-shadow:0 0 26px rgba(234,255,0,.35),0 6px 18px -8px rgba(0,0,0,.5);
}
[data-tpl="gaming-cyber"] .gc-lime-chip-lg{padding:7px 18px;font-size:12px}
/* ── lime pill CTA (lime bg, BLACK bold text, plus-icon circle inside) ─ */
[data-tpl="gaming-cyber"] .gc-btn-lime{
  display:inline-flex;align-items:center;gap:10px;cursor:pointer;
  height:52px;padding-inline:10px 24px;border-radius:999px;
  background:linear-gradient(180deg,#FBFF6A,#EAFF00);
  color:#0B0014;font-weight:900;font-size:14.5px;letter-spacing:-.01em;
  box-shadow:0 12px 34px -10px rgba(234,255,0,.55),0 0 26px rgba(234,255,0,.22);
  transition:transform .2s,box-shadow .2s,filter .2s;
}
[data-tpl="gaming-cyber"] .gc-btn-lime:hover{transform:translateY(-2px) scale(1.015);filter:brightness(1.05);box-shadow:0 16px 44px -10px rgba(234,255,0,.7),0 0 38px rgba(234,255,0,.3)}
[data-tpl="gaming-cyber"] .gc-btn-lime:active{transform:translateY(0) scale(.98)}
[data-tpl="gaming-cyber"] .gc-btn-lime:disabled{opacity:.45;pointer-events:none;filter:grayscale(.4)}
[data-tpl="gaming-cyber"] .gc-btn-lime-circle{
  display:grid;place-items:center;width:34px;height:34px;border-radius:999px;flex-shrink:0;
  background:#0B0014;color:#EAFF00;
}
[data-tpl="gaming-cyber"] .gc-btn-lime-sm{height:40px;padding-inline:7px 16px;font-size:12px;gap:7px}
[data-tpl="gaming-cyber"] .gc-btn-lime-sm .gc-btn-lime-circle{width:26px;height:26px}
/* ── ghost white-border pill (hero secondary) ────────────────────────── */
[data-tpl="gaming-cyber"] .gc-btn-vice-ghost{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;
  height:52px;padding:0 26px;border-radius:999px;
  border:2px solid rgba(255,255,255,.8);color:#fff;font-weight:900;font-size:14px;
  background:rgba(255,255,255,.07);backdrop-filter:blur(6px);
  transition:background .2s,border-color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-btn-vice-ghost:hover{background:rgba(255,255,255,.16);border-color:#fff;box-shadow:0 0 34px -8px rgba(255,255,255,.45);transform:translateY(-2px)}
/* ── vertical "WELCOME TO THE ARENA" lime tab (GTA key-art tab) ──────── */
[data-tpl="gaming-cyber"] .gc-vice-tab{
  position:absolute;left:16px;top:15%;bottom:15%;z-index:16;pointer-events:none;
  display:none;align-items:center;justify-content:center;
  writing-mode:vertical-rl;text-orientation:mixed;
  padding:20px 9px;border-radius:999px;
  background:#EAFF00;color:#0B0014;
  font-weight:900;font-size:10.5px;letter-spacing:.34em;text-transform:uppercase;
  box-shadow:0 0 34px rgba(234,255,0,.42),0 10px 26px -10px rgba(0,0,0,.6);
}
@media (min-width:768px){
  [data-tpl="gaming-cyber"] .gc-vice-tab{display:flex}
}
/* ── neon swoosh curves (thin gradient SVG paths behind sections) ────── */
[data-tpl="gaming-cyber"] .gc-swoosh{
  position:absolute;inset-inline:-3%;bottom:5%;width:106%;height:44%;z-index:1;
  pointer-events:none;opacity:.55;
}
[data-tpl="gaming-cyber"] .gc-swoosh-flip{transform:scaleX(-1)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-swoosh{filter:drop-shadow(0 0 6px rgba(168,85,247,.5))}
/* ── rainbow underline bar (deal blocks / key titles) ────────────────── */
[data-tpl="gaming-cyber"] .gc-underline-rainbow{
  position:relative;height:4px;border-radius:999px;overflow:hidden;
  background:linear-gradient(90deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#F43F5E);
  background-size:220% 100%;
  box-shadow:0 0 16px -2px rgba(255,62,240,.6);
  animation:gc-rgb-slide 6s linear infinite;
}
/* ── ARGB STAGE — the product lighting system (pure CSS) ────────────── */
/* stage: dark void base so the rainbow lights actually read */
[data-tpl="gaming-cyber"] .gc-stage{
  position:relative;
  background:radial-gradient(120% 120% at 50% 0%,#1C1230 0%,#0B0014 72%);
}
/* rotating conic rainbow RING around the product (mask donut) */
[data-tpl="gaming-cyber"] .gc-argb-ring{
  position:absolute;inset:6.5%;border-radius:999px;pointer-events:none;z-index:2;
  background:conic-gradient(from 0deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));
  opacity:.6;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-ring{animation:gc-spin 8s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .gc-argb-ring,
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot:hover .gc-argb-ring{animation-duration:2.5s;opacity:1}
/* pulsing rainbow UNDERGLOW (blurred conic ellipse under the product) */
[data-tpl="gaming-cyber"] .gc-argb-glow{
  position:absolute;left:16%;right:16%;bottom:4%;height:13%;border-radius:999px;pointer-events:none;z-index:1;
  background:conic-gradient(from 90deg,#FF3EF0,#D000FF,#06B6D4,#EAFF00,#F43F5E,#FF3EF0);
  filter:blur(16px);opacity:.32;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-glow{
  animation:gc-argb-pulse 3.2s ease-in-out infinite,gc-rgb-flow 6s linear infinite;
}
@keyframes gc-argb-pulse{0%,100%{opacity:.28;transform:scale(.92)}50%{opacity:.58;transform:scale(1.05)}}
/* name-aware effects:
   فن/Fan → the product image itself SPINS like a GIF (pause on hover);
   کیبورد/Keyboard → RGB keys breathing (hue-rotate pulse);
   ماوس/پد موس → the ring around the image glows + rotates faster.       */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-spin{animation:gc-fan-spin 4s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .gc-fx-spin{animation-play-state:paused}
@keyframes gc-fan-spin{to{transform:rotate(360deg)}}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-hue{animation:gc-hue-breathe 3s ease-in-out infinite}
@keyframes gc-hue-breathe{
  0%,100%{filter:hue-rotate(0deg) saturate(1.05) brightness(1)}
  50%{filter:hue-rotate(75deg) saturate(1.5) brightness(1.14)}
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-ring{
  opacity:.95;animation-duration:5s;
  filter:drop-shadow(0 0 12px rgba(255,62,240,.65));
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-glow{opacity:.5}
/* ── DEAL ZONE — GTA big-number blocks ──────────────────────────────── */
[data-tpl="gaming-cyber"] .gc-deal-zone{
  position:relative;border-radius:24px;overflow:hidden;
  border:1px solid rgba(226,43,255,.38);
  background:
    radial-gradient(880px 440px at 90% -6%,rgba(208,0,255,.22),transparent 60%),
    radial-gradient(600px 320px at -4% 104%,rgba(234,255,0,.07),transparent 55%),
    linear-gradient(165deg,rgba(42,32,56,.92),rgba(18,14,24,.97));
}
[data-tpl="gaming-cyber"] .gc-deal-art{
  position:relative;overflow:hidden;border-radius:18px;
  border:1px solid rgba(255,62,240,.4);
}
[data-tpl="gaming-cyber"] .gc-deal-art-txt{position:relative;z-index:3}
[data-tpl="gaming-cyber"] .gc-deal-block{
  position:relative;display:flex;flex-direction:column;gap:10px;
  border-radius:18px;overflow:hidden;padding:14px;
  border:1px solid rgba(139,92,246,.32);
  background:linear-gradient(180deg,rgba(42,32,56,.68),rgba(34,26,49,.84));
  backdrop-filter:blur(8px);
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-deal-block:hover{transform:translateY(-4px);border-color:rgba(226,43,255,.6)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-deal-block:hover{
  box-shadow:0 0 0 1px rgba(226,43,255,.3),0 20px 48px -18px rgba(208,0,255,.5);
}
[data-tpl="gaming-cyber"] .gc-deal-num{
  font-weight:900;font-style:italic;line-height:.78;
  font-size:clamp(56px,7.5vw,96px);
  color:transparent;-webkit-text-stroke:2.5px rgba(255,62,240,.62);
  letter-spacing:-.03em;transform:skewX(-8deg);
  transition:-webkit-text-stroke-color .25s;
  user-select:none;
}
[data-tpl="gaming-cyber"] .gc-deal-block:hover .gc-deal-num{-webkit-text-stroke-color:rgba(234,255,0,.7)}
[data-tpl="gaming-cyber"] .gc-deal-num-sm{font-size:clamp(44px,6vw,64px);-webkit-text-stroke-width:2px}
/* ── ARGB GEAR — wide rig banner + spotlight tiles ──────────────────── */
[data-tpl="gaming-cyber"] .gc-rig-banner{
  position:relative;display:block;overflow:hidden;border-radius:20px;
  min-height:250px;
  border:1px solid rgba(139,92,246,.4);
  box-shadow:0 26px 70px -34px rgba(0,0,0,.9),0 0 40px -14px rgba(168,85,247,.4);
}
@media (min-width:640px){
  [data-tpl="gaming-cyber"] .gc-rig-banner{min-height:320px}
}
[data-tpl="gaming-cyber"] .gc-rig-banner .gc-banner-cta{
  display:inline-flex;align-items:center;gap:9px;cursor:pointer;
  height:46px;padding:0 22px;border-radius:999px;
  border:2px solid rgba(255,255,255,.75);color:#fff;font-weight:900;font-size:13px;
  background:rgba(255,255,255,.08);backdrop-filter:blur(6px);
  transition:background .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-rig-banner .gc-banner-cta:hover{background:rgba(255,255,255,.18);box-shadow:0 0 28px -6px rgba(255,255,255,.4);transform:translateY(-2px)}
[data-tpl="gaming-cyber"] .gc-spot{
  position:relative;display:flex;flex-direction:column;overflow:hidden;
  border-radius:20px;border:1px solid rgba(139,92,246,.35);
  background:linear-gradient(180deg,#171022,#0B0014);
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-spot:hover{transform:translateY(-4px);border-color:rgba(255,62,240,.6)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot:hover{box-shadow:0 0 0 1px rgba(226,43,255,.3),0 20px 48px -18px rgba(208,0,255,.45)}
[data-tpl="gaming-cyber"] .gc-spot-title{font-size:15px;font-weight:900;color:#fff;letter-spacing:-.01em}
[data-tpl="gaming-cyber"] .gc-spot-sub{font-size:11.5px;line-height:1.7;color:#A79BC6}
[data-tpl="gaming-cyber"] .gc-spot-ico{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;flex-shrink:0;background:rgba(226,43,255,.15);color:#F79CFF}
[data-tpl="gaming-cyber"] .gc-spot-arrow{color:#A79BC6;transition:color .2s}
[data-tpl="gaming-cyber"] .gc-spot:hover .gc-spot-arrow{color:#F79CFF}
/* spotlight tile animations: fan SPINS, keyboard hue-pulses */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-spin{animation:gc-fan-spin 4s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-hue{animation:gc-hue-breathe 3s ease-in-out infinite}
/* ── CONNECT banner (GameUp-style purple→pink gradient) ─────────────── */
[data-tpl="gaming-cyber"] .gc-connect{
  position:relative;border-radius:24px;overflow:hidden;
  border:1px solid rgba(236,72,153,.45);
  background:linear-gradient(118deg,#2D1155 0%,#6D28D9 42%,#A855F7 66%,#EC4899 100%);
  box-shadow:0 30px 84px -34px rgba(168,85,247,.65),inset 0 0 90px rgba(45,17,85,.5);
}
[data-tpl="gaming-cyber"] .gc-connect-cta{
  display:inline-flex;align-items:center;gap:10px;cursor:pointer;
  height:52px;padding:0 28px;border-radius:999px;
  background:#1E1233;color:#fff;font-weight:900;font-size:14px;
  border:1px solid rgba(255,255,255,.22);
  box-shadow:0 0 20px rgba(168,85,247,.4),0 12px 30px -12px rgba(0,0,0,.6);
  transition:box-shadow .2s,transform .2s,filter .2s;
}
[data-tpl="gaming-cyber"] .gc-connect-cta:hover{box-shadow:0 0 34px rgba(168,85,247,.75);transform:translateY(-2px);filter:brightness(1.1)}
[data-tpl="gaming-cyber"] .gc-connect-chip{
  display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;
  background:rgba(11,0,20,.42);border:1px solid rgba(255,255,255,.18);color:#F3E8FF;
  font-size:11.5px;font-weight:800;backdrop-filter:blur(6px);
}
/* ── FINAL CTA band (giant glowing monogram before the footer) ──────── */
[data-tpl="gaming-cyber"] .gc-final{
  position:relative;overflow:hidden;border-radius:24px;
  border:1px solid rgba(226,43,255,.32);
  background:
    radial-gradient(760px 420px at 50% -22%,rgba(208,0,255,.32),transparent 60%),
    radial-gradient(560px 300px at 8% 108%,rgba(234,255,0,.08),transparent 55%),
    linear-gradient(180deg,rgba(42,32,56,.95),rgba(18,14,24,.98));
}
[data-tpl="gaming-cyber"] .gc-final-mono{
  display:block;
  font-weight:900;font-style:italic;line-height:.72;
  font-size:clamp(108px,19vw,208px);
  background-image:linear-gradient(180deg,#FF6BFF 4%,#E22BFF 46%,#8B5CF6 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 46px rgba(208,0,255,.55)) drop-shadow(0 10px 34px rgba(0,0,0,.5));
  transform:skewX(-8deg);
  user-select:none;
}
[data-tpl="gaming-cyber"] .gc-final-chip{
  display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;
  border:1px solid rgba(139,92,246,.45);background:rgba(34,26,49,.6);color:#EFEAF9;
  font-size:12px;font-weight:800;backdrop-filter:blur(6px);
  transition:border-color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-final-chip:hover{border-color:rgba(234,255,0,.6);box-shadow:0 0 20px -6px rgba(234,255,0,.4);transform:translateY(-2px)}

/* ══ v26fix · LIGHT SKIN (html:not(.dark)) — dark rules above stay intact ══
   Lilac arena #F6F2FB / ink #2A1B40; magenta → #C026D3, vice → #A21CAC,
   lime text-on-light → dark lime #4D7C0F (lime BG pills keep black ink). */
html:not(.dark) [data-tpl="gaming-cyber"]{
  --gc-bg:#F6F2FB;--gc-surface:#FFFFFF;--gc-card:#FFFFFF;
  --gc-magenta:#C026D3;--gc-vice:#A21CAC;--gc-lime:#EAFF00;--gc-lime-ink:#0B0014;
  --gc-violet:#7C3AED;--gc-cyan:#0E7490;--gc-emerald:#047857;
  --gc-text:#2A1B40;--gc-dim:#5E5377;--gc-mono:#0E7490;
  background:#F6F2FB;color:#2A1B40;
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-root{
  background:
    radial-gradient(1100px 520px at 82% -4%,rgba(139,92,246,.1),transparent 62%),
    radial-gradient(820px 460px at 6% 18%,rgba(192,38,211,.06),transparent 60%),
    radial-gradient(900px 640px at 50% 108%,rgba(6,182,212,.06),transparent 62%),
    #F6F2FB;
  color:#2A1B40;
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-code{color:#7A6B9E}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-code-cyan{color:#0E7490}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-code-magenta{color:#C026D3}
/* window chrome → white HUD glass */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-win{
  border-color:rgba(124,58,237,.28);
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(248,244,253,.96));
  box-shadow:0 22px 60px -30px rgba(42,27,64,.35);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-win-bar{border-bottom-color:rgba(124,58,237,.22);background:rgba(246,242,251,.92)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-win-title{color:#2A1B40}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-win-code{color:#7A6B9E}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-live-badge{background:rgba(16,185,129,.12);border-color:rgba(4,120,87,.4);color:#047857}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-corners i:nth-child(1){border-color:rgba(14,116,144,.7)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-corners i:nth-child(2){border-color:rgba(14,116,144,.4)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-corners i:nth-child(3){border-color:rgba(14,116,144,.4)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-corners i:nth-child(4){border-color:rgba(14,116,144,.7)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-glow-halo{box-shadow:0 0 34px -10px rgba(192,38,211,.35)}
/* cards → white glass; ARGB stage → light pedestal */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-card{
  border-color:rgba(124,58,237,.22);
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(246,242,251,.96));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-card:hover{border-color:rgba(192,38,211,.5)}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover{box-shadow:0 0 0 1px rgba(192,38,211,.25),0 18px 44px -16px rgba(192,38,211,.3)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-stage{
  background:radial-gradient(120% 120% at 50% 0%,#FFFFFF 0%,#EFE9F8 72%);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-glitch:hover .gc-glitch-t,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-glitch:focus-within .gc-glitch-t{color:#2A1B40}
/* buttons — magenta gradient CTA stays (white text); ghost goes light */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn{box-shadow:0 10px 26px -12px rgba(124,58,237,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn:hover{box-shadow:0 14px 34px -12px rgba(124,58,237,.6)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-ghost{background:rgba(255,255,255,.75);border-color:rgba(124,58,237,.4);color:#5B21B6}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-ghost:hover{color:#2A1B40;box-shadow:0 0 20px -8px rgba(14,116,144,.5)}
/* hero — light scrim so headline ink reads over artwork */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero{border-color:rgba(124,58,237,.3);box-shadow:0 30px 80px -40px rgba(42,27,64,.35),inset 0 0 60px rgba(246,242,251,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero-fallback{
  background:
    radial-gradient(600px 300px at 70% 20%,rgba(192,38,211,.14),transparent 60%),
    radial-gradient(500px 260px at 20% 70%,rgba(6,182,212,.12),transparent 60%),
    linear-gradient(160deg,#FFFFFF,#F6F2FB 70%);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero-tint{
  background:
    radial-gradient(120% 95% at 82% -12%,rgba(192,38,211,.2),transparent 55%),
    linear-gradient(to top,rgba(246,242,251,.97) 0%,rgba(246,242,251,.82) 34%,rgba(246,242,251,.3) 62%,rgba(246,242,251,.5) 100%);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-grid-floor{
  background-image:
    linear-gradient(rgba(162,28,172,.5) 1.5px,transparent 1.5px),
    linear-gradient(90deg,rgba(192,38,211,.35) 1.5px,transparent 1.5px);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero-hud{background:linear-gradient(180deg,rgba(246,242,251,.92),transparent)}
/* stats tiles */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-tile{border-color:rgba(124,58,237,.22);background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(246,242,251,.92))}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-tile-ico{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-tile-v{color:#2A1B40}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-tile-l{color:#5E5377}
/* timers / stock / ranks */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-timer-cell{background:rgba(6,182,212,.1);border-color:rgba(14,116,144,.35);color:#0E7490}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-timer-sep{color:rgba(14,116,144,.55)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-timer-ended{background:rgba(42,27,64,.07);color:#5E5377}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-stock{color:#047857}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-rank-n{background:rgba(42,27,64,.08);color:#5E5377}
/* legendary / strip / sponsor / faq */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-legendary{
  background:
    radial-gradient(520px 300px at 82% 20%,rgba(192,38,211,.1),transparent 62%),
    radial-gradient(420px 260px at 12% 84%,rgba(6,182,212,.08),transparent 62%),
    linear-gradient(165deg,rgba(255,255,255,.94),rgba(246,242,251,.97));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-strip{border-color:rgba(192,38,211,.28);background:linear-gradient(90deg,rgba(192,38,211,.07),rgba(139,92,246,.06))}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-strip-badge{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-sponsor{background:rgba(255,255,255,.85);color:#2A1B40}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-sponsor:hover{color:#0E7490}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-faq-item{border-color:rgba(124,58,237,.22);background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(246,242,251,.93))}
/* raw hex utilities → light equivalents */
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#A79BC6\\]{color:#5E5377}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#F0ABFC\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#F79CFF\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#67E8F9\\]{color:#0E7490}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#EFEAF9\\]{color:#2A1B40}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#D946EF\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#E22BFF\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#E22BFF\\]\\/40{color:rgba(192,38,211,.45)}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#D946EF\\]\\/40{color:rgba(192,38,211,.45)}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#D946EF\\]\\/50{color:rgba(192,38,211,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#C9BEE4\\]{color:#4A3D63}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#06B6D4\\]{color:#0891B2}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#8F7FC0\\]{color:#7A6B9E}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#DCCFF4\\]{color:#3E3357}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#C4B5FD\\]{color:#6D28D9}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#8B5CF6\\]{color:#7C3AED}
html:not(.dark) [data-tpl="gaming-cyber"] .text-\\[\\#8B5CF6\\]\\/60{color:rgba(124,58,237,.6)}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:text-\\[\\#F0ABFC\\]:hover{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:text-\\[\\#F79CFF\\]:hover{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:text-\\[\\#67E8F9\\]:hover{color:#0E7490}
html:not(.dark) [data-tpl="gaming-cyber"] .group:hover .group-hover\\:text-\\[\\#F0ABFC\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .group:hover .group-hover\\:text-\\[\\#F79CFF\\]{color:#C026D3}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:bg-\\[\\#2E2345\\]\\/60:hover{background-color:rgba(255,255,255,.72)}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:border-\\[\\#D946EF\\]\\/50:hover{border-color:rgba(192,38,211,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:border-\\[\\#E22BFF\\]\\/60:hover{border-color:rgba(192,38,211,.55)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#1A1025\\]\\/60{background-color:#F4EFFB}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#1A1025\\]\\/70{background-color:#F2EDF9}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#2E2345\\]\\/40{background-color:rgba(255,255,255,.65)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#251B35\\]{background-color:#F3EEFA}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#D946EF\\]\\/15{background-color:rgba(192,38,211,.1)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#D946EF\\]\\/20{background-color:rgba(192,38,211,.13)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#E22BFF\\]\\/15{background-color:rgba(192,38,211,.1)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#8B5CF6\\]\\/15{background-color:rgba(124,58,237,.1)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-\\[\\#06B6D4\\]\\/15{background-color:rgba(6,182,212,.1)}
html:not(.dark) [data-tpl="gaming-cyber"] .border-\\[\\#06B6D4\\]\\/25{border-color:rgba(14,116,144,.3)}
html:not(.dark) [data-tpl="gaming-cyber"] .border-\\[\\#06B6D4\\]\\/30{border-color:rgba(14,116,144,.35)}
html:not(.dark) [data-tpl="gaming-cyber"] .border-\\[\\#8B5CF6\\]\\/22{border-color:rgba(124,58,237,.25)}
html:not(.dark) [data-tpl="gaming-cyber"] .border-\\[\\#8B5CF6\\]\\/20{border-color:rgba(124,58,237,.22)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-amber-400\\/10{background-color:rgba(180,83,9,.1)}
html:not(.dark) [data-tpl="gaming-cyber"] .text-amber-300{color:#B45309}
html:not(.dark) [data-tpl="gaming-cyber"] .fill-amber-300{fill:#B45309}
/* showcase overlay → lilac scrim (title ink via blanket below) */
html:not(.dark) [data-tpl="gaming-cyber"] .from-\\[\\#1A1025\\]{--tw-gradient-from:rgba(246,242,251,.97)}
html:not(.dark) [data-tpl="gaming-cyber"] .via-\\[\\#1A1025\\]\\/40{--tw-gradient-via:rgba(246,242,251,.45)}
/* white/black utilities */
html:not(.dark) [data-tpl="gaming-cyber"] .text-white{color:#2A1B40}
html:not(.dark) [data-tpl="gaming-cyber"] .text-white\\/80{color:rgba(42,27,64,.85)}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-black\\/70{background-color:rgba(255,255,255,.9)}
/* discount pill glow softened (pill keeps its magenta gradient) */
html:not(.dark) [data-tpl="gaming-cyber"] .shadow-\\[0_0_16px_rgba\\(217\\,70\\,239\\,\\.5\\)\\]{--tw-shadow:0 0 16px rgba(192,38,211,.35);box-shadow:0 0 16px rgba(192,38,211,.35)}
/* restores — text on surfaces that STAY colored in light mode */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hex-grad.text-white,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hex-grad .text-white{color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .from-\\[\\#D946EF\\].text-white{color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .from-\\[\\#E22BFF\\].text-white{color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:bg-\\[\\#D946EF\\].hover\\:text-white:hover{color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .hover\\:bg-\\[\\#E22BFF\\].hover\\:text-white:hover{color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-black\\/70.text-white{background-color:rgba(20,7,31,.6);color:#fff}
html:not(.dark) [data-tpl="gaming-cyber"] .bg-rose-500.text-white,
html:not(.dark) [data-tpl="gaming-cyber"] .bg-orange-500.text-white,
html:not(.dark) [data-tpl="gaming-cyber"] .bg-violet-600.text-white,
html:not(.dark) [data-tpl="gaming-cyber"] .bg-emerald-500.text-white,
html:not(.dark) [data-tpl="gaming-cyber"] .bg-destructive.text-white{color:#fff}
/* v28 · ARGB rainbow light skin — softened glows, ink text */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero-shell{box-shadow:0 30px 80px -40px rgba(42,27,64,.4)}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-hero-shell::before{opacity:.85}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb-edge::after{opacity:.6}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-head::after{opacity:.5;box-shadow:0 0 10px rgba(192,38,211,.25)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-rgb{box-shadow:0 10px 26px -12px rgba(124,58,237,.5)}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-win::after{opacity:.5}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-card .object-contain{
  filter:drop-shadow(0 5px 14px rgba(192,38,211,.22)) drop-shadow(0 0 8px rgba(6,182,212,.15));
}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .object-contain{
  filter:drop-shadow(0 9px 20px rgba(192,38,211,.32)) drop-shadow(0 0 12px rgba(6,182,212,.22));
}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-timer-cell{box-shadow:0 0 10px -4px rgba(14,116,144,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-cat:hover .gc-cat-hex{filter:drop-shadow(0 0 16px rgba(192,38,211,.5))}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-qchip{box-shadow:0 0 12px -6px rgba(192,38,211,.5)}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-corners i{filter:drop-shadow(0 0 4px rgba(14,116,144,.5))}
/* anime arena band → lilac glass */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-arena{
  border-color:rgba(124,58,237,.3);
  background:
    radial-gradient(700px 380px at 85% 10%,rgba(192,38,211,.09),transparent 60%),
    radial-gradient(560px 320px at 6% 92%,rgba(6,182,212,.08),transparent 60%),
    linear-gradient(160deg,rgba(255,255,255,.94),rgba(246,242,251,.97));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-art-frame{
  border-color:rgba(124,58,237,.3);
  box-shadow:0 20px 50px -26px rgba(42,27,64,.45),0 0 24px -10px rgba(192,38,211,.3);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-arena-mascot{
  border-color:rgba(192,38,211,.5);
  box-shadow:0 14px 36px -14px rgba(42,27,64,.5),0 0 24px -8px rgba(192,38,211,.5);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-chip{
  background:rgba(255,255,255,.82);color:#2A1B40;border-color:rgba(124,58,237,.38);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-chip:hover{color:#C026D3;border-color:rgba(192,38,211,.55)}
/* ═══ v30 · LIGHT SKIN — Vice-Arena signature system ═══
   (lime pills keep lime-bg+ink-text; lime GLOW text never happens; photo
   banners / spotlight tiles / CONNECT gradient STAY dark — their text is
   custom-classed so the white blanket above can't touch them) */
/* display headline → ink→dark-magenta gradient (light scrim hero) */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-display{
  background-image:linear-gradient(180deg,#2A1B40 8%,#6B21A8 55%,#A21CAC 100%);
  filter:drop-shadow(0 3px 16px rgba(162,28,172,.28));
}
/* ...but over STAY-DARK surfaces keep the neon white→vice gradient */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-rig-banner .gc-display,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-connect .gc-display,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .gc-display{
  background-image:linear-gradient(180deg,#FFFFFF 8%,#FFD6FF 48%,#F86BFF 78%,#D000FF 100%);
  filter:drop-shadow(0 4px 26px rgba(208,0,255,.45)) drop-shadow(0 1px 2px rgba(0,0,0,.4));
}
/* lime chip / lime pill — identical in light (high contrast by design) */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-lime-chip{box-shadow:0 0 18px rgba(180,131,10,.35),0 4px 14px -6px rgba(42,27,64,.3)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-lime{box-shadow:0 10px 28px -10px rgba(77,124,15,.55),0 0 18px rgba(180,131,10,.2)}
/* vice ghost pill → ink borders on the light scrim */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-vice-ghost{
  border-color:rgba(42,27,64,.65);color:#2A1B40;background:rgba(255,255,255,.55);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-btn-vice-ghost:hover{
  background:rgba(255,255,255,.8);border-color:#2A1B40;box-shadow:0 0 26px -8px rgba(42,27,64,.35);
}
/* swoosh / underline softened */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-swoosh{opacity:.28}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-underline-rainbow{opacity:.55;box-shadow:0 0 10px rgba(192,38,211,.22)}
/* ARGB stage lights — softened but still visible on the light pedestal */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-argb-ring{opacity:.45}
html:not(.dark) [data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-ring{opacity:.75}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-argb-glow{opacity:.2}
/* deal zone → lilac glass; outlined numerals → dark magenta stroke */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-zone{
  border-color:rgba(162,28,172,.3);
  background:
    radial-gradient(880px 440px at 90% -6%,rgba(162,28,172,.08),transparent 60%),
    linear-gradient(165deg,rgba(255,255,255,.94),rgba(246,242,251,.97));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-block{
  border-color:rgba(124,58,237,.25);
  background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(246,242,251,.95));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-block:hover{border-color:rgba(162,28,172,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-num{-webkit-text-stroke-color:rgba(162,28,172,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-block:hover .gc-deal-num{-webkit-text-stroke-color:rgba(77,124,15,.75)}
/* rig banner + spotlight tiles + deal art STAY photo-dark → no light flip.
   Only their glow is softened: */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-rig-banner{box-shadow:0 26px 70px -34px rgba(42,27,64,.5),0 0 40px -14px rgba(168,85,247,.25)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-spot{box-shadow:0 18px 44px -22px rgba(42,27,64,.4)}
/* restore HUD-cyan / timer cells / magenta text on STAY-DARK photo panels
   (deal art + connect gradient) so light-skin flips can't hit them */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .gc-code-cyan,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-connect .gc-code{color:#67E8F9}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .gc-timer-cell{background:rgba(6,182,212,.12);border-color:rgba(6,182,212,.35);color:#67E8F9}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .gc-timer-sep{color:rgba(103,232,249,.5)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .text-\[\#F79CFF\]{color:#F79CFF}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-connect .gc-live-badge,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-art .gc-live-badge{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.45);color:#34D399}
/* CONNECT gradient banner stays gradient in light (GameUp does this too) —
   only the outer glow is softened: */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-connect{box-shadow:0 30px 84px -34px rgba(124,58,237,.45),inset 0 0 90px rgba(45,17,85,.4)}
/* final CTA band → light glass; monogram → darker magenta glow */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-final{
  border-color:rgba(162,28,172,.28);
  background:
    radial-gradient(760px 420px at 50% -22%,rgba(162,28,172,.14),transparent 60%),
    linear-gradient(180deg,rgba(255,255,255,.95),rgba(246,242,251,.98));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-final-mono{
  background-image:linear-gradient(180deg,#C026D3 4%,#A21CAC 46%,#7C3AED 100%);
  filter:drop-shadow(0 0 36px rgba(162,28,172,.35));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-final-chip{background:rgba(255,255,255,.8);color:#2A1B40}
/* ═════════════════════════════════════════════════════════════════════
   v31 · CODE-DRAWN ARGB RIG HERO (owner's #1 ask — 100% CSS/JSX art)
   Tempered-glass tower · 5 RGB fans (rings hue-cycle with phase offsets,
   the BLADES never spin — owner's explicit demand) · top LED strip ·
   PSU underglow · ARGB desk mat with animated edge LEDs + code-drawn
   mouse. Every animation is pure CSS, gated by [data-glow="on"] and
   killed by the reduced-motion block at the bottom of this file.
   ═════════════════════════════════════════════════════════════════════ */
@keyframes gc-rig-breathe{0%,100%{opacity:.3;transform:scale(.92)}50%{opacity:.62;transform:scale(1.06)}}
@keyframes gc-cue-drop{0%{transform:translateY(-1px);opacity:0}30%{opacity:1}70%{transform:translateY(8px);opacity:1}100%{transform:translateY(9px);opacity:0}}
/* studio ambience — the hero panel STAYS dark in both skins (photo-dark
   pattern) so the RGB rig always reads; text-side restores live below. */
[data-tpl="gaming-cyber"] .gc-hero-bg{
  position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(58% 46% at 80% 8%,rgba(208,0,255,.26),transparent 70%),
    radial-gradient(46% 40% at 14% 92%,rgba(6,182,212,.12),transparent 70%),
    linear-gradient(180deg,#170F23 0%,#0D0916 58%,#130A1D 100%);
}
[data-tpl="gaming-cyber"] .gc-hero-sub{margin-top:14px;max-width:34rem;font-size:14px;line-height:1.85;color:#C9BEE4}
@media (min-width:640px){
  [data-tpl="gaming-cyber"] .gc-hero-sub{font-size:15.5px;line-height:2}
}
/* ── the scene stage (fluid % — scales with its box) ─────────────────── */
[data-tpl="gaming-cyber"] .gc-scene{position:relative;width:100%;height:100%}
[data-tpl="gaming-cyber"] .gc-scene-amb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(34px);opacity:.5}
[data-tpl="gaming-cyber"] .gc-scene-amb-1{top:-6%;right:-6%;width:52%;height:44%;background:radial-gradient(circle,rgba(224,43,255,.5),transparent 70%)}
[data-tpl="gaming-cyber"] .gc-scene-amb-2{bottom:2%;left:-4%;width:46%;height:38%;background:radial-gradient(circle,rgba(6,182,212,.38),transparent 70%)}
/* floor shadow + glass reflection on the mat */
[data-tpl="gaming-cyber"] .gc-rig-shadow{position:absolute;left:24%;right:24%;bottom:13%;height:7%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.62),transparent 70%);filter:blur(6px)}
[data-tpl="gaming-cyber"] .gc-rig-reflect{position:absolute;left:35%;width:30%;bottom:8%;height:9%;border-radius:12px;background:linear-gradient(180deg,rgba(139,92,246,.30),rgba(6,182,212,.10) 55%,transparent);filter:blur(5px);opacity:.55}
/* ── ARGB desk mat / mousepad — animated edge LEDs + dot texture ─────── */
[data-tpl="gaming-cyber"] .gc-rig-mat{
  position:absolute;left:4%;right:4%;bottom:3%;height:23%;border-radius:16px;
  background:
    radial-gradient(circle at 22% 30%,rgba(226,43,255,.10),transparent 42%),
    radial-gradient(rgba(190,180,230,.075) 1px,transparent 1.7px),
    linear-gradient(180deg,#231A33,#150E1F);
  background-size:auto,15px 15px,auto;
  border:1px solid rgba(139,92,246,.4);
  box-shadow:0 20px 44px -18px rgba(0,0,0,.85),inset 0 0 30px rgba(0,0,0,.5);
}
[data-tpl="gaming-cyber"] .gc-rig-mat::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(120% 140% at 50% 0%,transparent 40%,rgba(0,0,0,.35) 100%);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mat::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:2.5px;pointer-events:none;
  background:conic-gradient(#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
  opacity:.9;filter:drop-shadow(0 0 7px rgba(255,62,240,.6));
  animation:gc-rgb-flow 9s linear infinite;
}
/* code-drawn mouse resting on the mat */
[data-tpl="gaming-cyber"] .gc-rig-mouse{
  position:absolute;left:62%;bottom:5.5%;width:8.5%;aspect-ratio:.68;
  border-radius:48% 48% 44% 44% / 60% 60% 40% 40%;
  background:linear-gradient(180deg,#2B2238,#171021);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 8px 18px -8px rgba(0,0,0,.8),inset 0 0 8px rgba(0,0,0,.55);
  z-index:4;
}
[data-tpl="gaming-cyber"] .gc-rig-mouse::before{
  content:"";position:absolute;top:6%;bottom:10%;left:50%;width:1.5px;background:rgba(255,255,255,.12);
}
[data-tpl="gaming-cyber"] .gc-rig-mouse::after{
  content:"";position:absolute;left:50%;top:34%;width:22%;aspect-ratio:1;transform:translateX(-50%);
  border-radius:50%;background:#F86BFF;box-shadow:0 0 10px 2px rgba(255,62,240,.75);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mouse::after{animation:gc-rig-breathe 2.6s ease-in-out infinite}
/* ── the tower — perspective wrapper + dark-metal chassis ────────────── */
[data-tpl="gaming-cyber"] .gc-rig-case3d{
  position:absolute;left:50%;bottom:17%;width:34%;aspect-ratio:.5;z-index:3;
  transform:translateX(-50%) perspective(950px) rotateY(8deg);
}
/* mobile — widen the tower a touch so the fan rings/LED strip stay legible;
   bottom eases up so the taller case never pokes out of the scene box */
@media (max-width:639px){
  [data-tpl="gaming-cyber"] .gc-rig-case3d{width:38%;bottom:13%}
}
[data-tpl="gaming-cyber"] .gc-rig-frame{
  position:absolute;inset:0;border-radius:16px;overflow:hidden;
  background:linear-gradient(105deg,#26212F 0%,#15111C 42%,#1E1927 100%);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.55),
    inset 0 14px 30px -18px rgba(255,255,255,.10),
    0 30px 60px -24px rgba(0,0,0,.9);
}
/* PSU underglow spilling under the chassis onto the mat */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-underglow{
  position:absolute;left:-12%;right:-12%;bottom:-4%;height:12%;border-radius:50%;
  background:conic-gradient(from 90deg,#FF3EF0,#06B6D4,#EAFF00,#FF3EF0);
  filter:blur(14px);opacity:.5;pointer-events:none;
  animation:gc-rig-breathe 3.4s ease-in-out infinite,gc-rgb-flow 6s linear infinite;
}
/* interior — motherboard hints */
[data-tpl="gaming-cyber"] .gc-rig-mobo{
  position:absolute;left:11%;top:7%;bottom:33%;right:11%;border-radius:7px;
  background:
    repeating-linear-gradient(90deg,rgba(103,232,249,.05) 0 1px,transparent 1px 9px),
    linear-gradient(160deg,#1B1426,#120C1B);
  border:1px solid rgba(139,92,246,.22);
}
/* RAM sticks — glow tips breathe on staggered phases (--ph) */
[data-tpl="gaming-cyber"] .gc-rig-ram{
  position:absolute;left:14%;top:9%;width:4.6%;height:23%;border-radius:3px;
  background:linear-gradient(180deg,#8B5CF6 0%,#3A2B52 55%,#1A1226 100%);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 0 12px -2px rgba(139,92,246,.55);
}
[data-tpl="gaming-cyber"] .gc-rig-ram2{
  left:20.8%;
  background:linear-gradient(180deg,#06B6D4 0%,#274055 55%,#12202E 100%);
  box-shadow:0 0 12px -2px rgba(6,182,212,.55);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-ram{animation:gc-rig-breathe 3s ease-in-out infinite var(--ph,0s)}
/* GPU block with running accent stripes */
[data-tpl="gaming-cyber"] .gc-rig-gpu{
  position:absolute;left:6%;right:33%;top:42%;height:13%;border-radius:8px;
  background:linear-gradient(180deg,#2E2740,#191323);
  border:1px solid rgba(255,255,255,.15);
  box-shadow:0 10px 22px -10px rgba(0,0,0,.85);
}
[data-tpl="gaming-cyber"] .gc-rig-gpu-fx{
  position:absolute;inset:16% 7%;border-radius:4px;opacity:.75;
  background:linear-gradient(90deg,#FF3EF0,#8B5CF6,#06B6D4,#EAFF00,#FF3EF0);
  background-size:250% 100%;
  -webkit-mask:repeating-linear-gradient(90deg,#000 0 34%,transparent 34% 50%);
  mask:repeating-linear-gradient(90deg,#000 0 34%,transparent 34% 50%);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-gpu-fx{animation:gc-rgb-slide 4.5s linear infinite}
/* PSU shroud with vents + LED accent */
[data-tpl="gaming-cyber"] .gc-rig-psu{
  position:absolute;left:4%;right:4%;bottom:4%;height:15%;border-radius:8px;
  background:linear-gradient(180deg,#241E30,#100B18);
  border:1px solid rgba(255,255,255,.12);
  box-shadow:inset 0 8px 18px -10px rgba(0,0,0,.8);
}
[data-tpl="gaming-cyber"] .gc-rig-psu::before{
  content:"";position:absolute;left:10%;right:10%;top:24%;height:36%;border-radius:3px;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 3px,transparent 3px 10px);
}
[data-tpl="gaming-cyber"] .gc-rig-psu::after{
  content:"";position:absolute;left:10%;bottom:14%;width:34%;height:9%;border-radius:999px;
  background:linear-gradient(90deg,#EAFF00,#FF3EF0);
  box-shadow:0 0 8px rgba(255,62,240,.6);
}
/* ── the RGB fans — rings hue-cycle with phase offsets, BLADES STATIC ── */
[data-tpl="gaming-cyber"] .gc-rig-fan{position:absolute;aspect-ratio:1;pointer-events:none}
[data-tpl="gaming-cyber"] .gc-rig-fan-f1{right:7%;top:8%;width:25%}
[data-tpl="gaming-cyber"] .gc-rig-fan-f2{right:7%;top:38.5%;width:25%}
[data-tpl="gaming-cyber"] .gc-rig-fan-f3{right:7%;top:68%;width:25%}
[data-tpl="gaming-cyber"] .gc-rig-fan-i1{left:9%;top:9%;width:26%}
[data-tpl="gaming-cyber"] .gc-rig-fan-i2{left:9%;top:57%;width:26%}
[data-tpl="gaming-cyber"] .gc-rig-fan i{position:absolute;display:block}
[data-tpl="gaming-cyber"] .gc-rig-fan-blades{
  inset:7%;border-radius:50%;
  background:
    radial-gradient(circle,#0C0814 0 21%,transparent 22%),
    repeating-conic-gradient(rgba(214,222,255,.14) 0deg 14deg,rgba(8,6,14,.30) 14deg 60deg);
  box-shadow:inset 0 0 12px rgba(0,0,0,.85),inset 0 0 4px rgba(255,255,255,.08);
}
[data-tpl="gaming-cyber"] .gc-rig-fan-glow{
  inset:-26%;border-radius:50%;filter:blur(11px);opacity:.5;
  background:conic-gradient(from 120deg,#FF3EF0,#8B5CF6,#06B6D4,#EAFF00,#FF3EF0);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-glow{
  animation:gc-rig-breathe 3.6s ease-in-out infinite var(--ph,0s),gc-rgb-flow 6.5s linear infinite var(--ph,0s);
}
[data-tpl="gaming-cyber"] .gc-rig-fan-ring{
  inset:1.5%;border-radius:50%;
  background:conic-gradient(from 210deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 13%),#000 calc(100% - 12%));
  mask:radial-gradient(farthest-side,transparent calc(100% - 13%),#000 calc(100% - 12%));
  filter:drop-shadow(0 0 4px rgba(255,62,240,.55));
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-ring{animation:gc-rgb-flow 5.5s linear infinite;animation-delay:var(--ph,0s)}
[data-tpl="gaming-cyber"] .gc-rig-fan-hub{
  left:50%;top:50%;width:24%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#3A3049 0%,#15101F 70%);
  box-shadow:0 0 6px rgba(0,0,0,.9),inset 0 0 3px rgba(255,255,255,.22);
}
[data-tpl="gaming-cyber"] .gc-rig-fan-hub::after{
  content:"";position:absolute;inset:28%;border-radius:50%;
  background:linear-gradient(180deg,#F86BFF,#8B5CF6);
  box-shadow:0 0 8px rgba(255,62,240,.8);
}
/* top LED strip along the case edge */
[data-tpl="gaming-cyber"] .gc-rig-led{
  position:absolute;left:7%;right:7%;top:1.8%;height:2.2%;border-radius:999px;
  background:linear-gradient(90deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  background-size:220% 100%;
  box-shadow:0 0 12px rgba(255,62,240,.7);opacity:.95;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-led{animation:gc-rgb-slide 5s linear infinite}
/* tempered-glass side panel — reflections + ambient RGB tint */
[data-tpl="gaming-cyber"] .gc-rig-glass{
  position:absolute;inset:4px;border-radius:12px;pointer-events:none;z-index:9;
  border:1px solid rgba(255,255,255,.20);
  background:
    linear-gradient(118deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,.03) 22%,transparent 42%),
    linear-gradient(292deg,rgba(139,92,246,.13) 0%,transparent 38%);
  box-shadow:inset 0 0 26px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.16);
}
[data-tpl="gaming-cyber"] .gc-rig-glass-tint{
  position:absolute;inset:4px;border-radius:12px;pointer-events:none;z-index:8;
  background:conic-gradient(from 40deg,#F43F5E,#FF3EF0,#8B5CF6,#06B6D4,#EAFF00,#F43F5E);
  filter:blur(18px);opacity:.14;mix-blend-mode:overlay;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-glass-tint{animation:gc-rgb-flow 7s linear infinite}
/* ── flanking headset showcase cards (generated 3D art) ─────────────── */
[data-tpl="gaming-cyber"] .gc-hs{position:absolute;width:27%;z-index:5}
[data-tpl="gaming-cyber"] .gc-hs-1{top:0;right:-1%}
[data-tpl="gaming-cyber"] .gc-hs-2{top:47%;left:-2%;width:24%}
[data-tpl="gaming-cyber"] .gc-hs-halo{position:absolute;inset:-14%;border-radius:50%;filter:blur(26px);opacity:.55;pointer-events:none}
[data-tpl="gaming-cyber"] .gc-hs-halo-pink{background:radial-gradient(circle,rgba(255,62,190,.55),transparent 70%)}
[data-tpl="gaming-cyber"] .gc-hs-halo-green{background:radial-gradient(circle,rgba(52,211,82,.4),rgba(251,191,36,.25),transparent 72%)}
[data-tpl="gaming-cyber"] .gc-hs-float{animation:gc-float 7s ease-in-out infinite;animation-delay:var(--ph,0s)}
[data-tpl="gaming-cyber"] .gc-hs-art{
  position:relative;aspect-ratio:1;border-radius:18px;overflow:hidden;
  border:1px solid rgba(255,255,255,.18);
  box-shadow:0 24px 48px -20px rgba(0,0,0,.9);
}
[data-tpl="gaming-cyber"] .gc-hs-tag{
  position:absolute;bottom:4.5%;left:50%;transform:translateX(-50%);white-space:nowrap;
  display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;
  background:rgba(11,0,20,.68);border:1px solid rgba(255,255,255,.22);color:#F3E8FF;
  font-size:9.5px;font-weight:800;backdrop-filter:blur(6px);
}
/* scroll cue */
[data-tpl="gaming-cyber"] .gc-scroll-cue{
  position:absolute;bottom:10px;left:50%;transform:translateX(-50%);z-index:18;
  display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;
}
[data-tpl="gaming-cyber"] .gc-scroll-cue-txt{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:8.5px;font-weight:900;letter-spacing:.3em;color:rgba(167,155,198,.75);
}
[data-tpl="gaming-cyber"] .gc-scroll-cue-bar{position:relative;width:22px;height:15px;border-radius:999px;border:1.5px solid rgba(139,92,246,.5);overflow:hidden}
[data-tpl="gaming-cyber"] .gc-scroll-cue-bar b{
  position:absolute;left:50%;top:2px;width:4px;height:4px;margin-left:-2px;border-radius:999px;
  background:#EAFF00;box-shadow:0 0 6px rgba(234,255,0,.8);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-scroll-cue-bar b{animation:gc-cue-drop 1.8s ease-in-out infinite}
/* light-skin restores — the hero panel stays a dark studio, so keep the
   neon headline gradient + ghost pill + HUD bar exactly as dark mode */
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero .gc-display{
  background-image:linear-gradient(180deg,#FFFFFF 8%,#FFD6FF 48%,#F86BFF 78%,#D000FF 100%);
  filter:drop-shadow(0 4px 26px rgba(208,0,255,.45)) drop-shadow(0 1px 2px rgba(0,0,0,.4));
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero .gc-btn-vice-ghost{
  border-color:rgba(255,255,255,.8);color:#fff;background:rgba(255,255,255,.07);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero .gc-btn-vice-ghost:hover{
  background:rgba(255,255,255,.16);border-color:#fff;box-shadow:0 0 34px -8px rgba(255,255,255,.45);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero .gc-hero-hud{background:linear-gradient(180deg,rgba(11,0,20,.8),transparent)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hero .gc-hero{border-color:rgba(124,58,237,.35)}

/* ═══ v31 · GAMING CHROME POLISH (header variant 7 · footer variant 6) ═══
   Scoped to the gaming template root so NO other template is touched.
   Pure-CSS accents only — structure/data sources stay identical.       */
/* thin animated RGB accent line under the ticket header box */
[data-tpl="gaming-cyber"] [data-chrome-header] > div{position:relative}
[data-tpl="gaming-cyber"] [data-chrome-header] > div::after{
  content:"";position:absolute;left:12px;right:12px;bottom:-2px;height:2px;border-radius:999px;
  background:linear-gradient(90deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  background-size:220% 100%;
  animation:gc-rgb-slide 14s linear infinite;
  opacity:.75;filter:drop-shadow(0 0 5px rgba(255,62,240,.5));
  pointer-events:none;
}
/* ticker — mono digits + neon gradient text */
[data-tpl="gaming-cyber"] [data-chrome-header] .taj-marquee .whitespace-nowrap{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:.02em;
  background-image:linear-gradient(90deg,#D946EF,#EAFF00 45%,#67E8F9);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
html:not(.dark) [data-tpl="gaming-cyber"] [data-chrome-header] .taj-marquee .whitespace-nowrap{
  background-image:linear-gradient(90deg,#A21CAC,#4D7C0F 45%,#0E7490);
}
/* search — neon focus ring */
[data-tpl="gaming-cyber"] [data-chrome-header] form[role="search"]{
  border-color:rgba(139,92,246,.4);
  transition:border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] [data-chrome-header] form[role="search"]:focus-within{
  border-color:rgba(255,62,240,.75);
  box-shadow:0 0 0 3px rgba(208,0,255,.18),0 0 22px -6px rgba(208,0,255,.65);
}
html:not(.dark) [data-tpl="gaming-cyber"] [data-chrome-header] form[role="search"]:focus-within{
  border-color:rgba(162,28,172,.65);
  box-shadow:0 0 0 3px rgba(192,38,211,.14),0 0 18px -6px rgba(192,38,211,.55);
}
/* action buttons — neon hover glow */
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/account"],
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/cart"],
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/login"]{
  transition:box-shadow .25s,transform .25s;
}
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/account"]:hover,
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/cart"]:hover,
[data-tpl="gaming-cyber"] [data-chrome-header] a[href="/login"]:hover{
  box-shadow:0 0 16px -4px rgba(168,85,247,.7),0 0 0 1px rgba(168,85,247,.3);
}
/* footer — slim animated RGB top border */
[data-tpl="gaming-cyber"] [data-chrome-footer]{position:relative}
[data-tpl="gaming-cyber"] [data-chrome-footer]::before{
  content:"";position:absolute;top:0;left:0;right:0;height:2px;z-index:5;
  background:linear-gradient(90deg,#F43F5E,#FF3EF0,#D000FF,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  background-size:220% 100%;
  animation:gc-rgb-slide 14s linear infinite;opacity:.8;
  filter:drop-shadow(0 0 5px rgba(255,62,240,.45));
  pointer-events:none;
}
/* footer column rhythm — hairline dividers + roomier gutters (md+) */
@media (min-width:768px){
  [data-tpl="gaming-cyber"] [data-chrome-footer] .grid > :not(:first-child){
    border-inline-start:1px solid rgba(139,92,246,.16);
    padding-inline-start:1.6rem;
  }
}
/* footer section-heading dots — neon bloom */
[data-tpl="gaming-cyber"] [data-chrome-footer] .taj-breathe{
  box-shadow:0 0 9px 1px rgba(139,92,246,.65);
}
/* footer social icons (real links from /api/store-info) — hover glow */
[data-tpl="gaming-cyber"] .gc-soc{transition:transform .2s,box-shadow .2s,border-color .2s,color .2s}
[data-tpl="gaming-cyber"] .gc-soc:hover{
  transform:translateY(-2px);
  border-color:rgba(168,85,247,.75);
  box-shadow:0 0 18px -4px rgba(168,85,247,.8);
}
[data-tpl="gaming-cyber"] .gc-soc:hover,[data-tpl="gaming-cyber"] .gc-soc:hover *{color:#C4B5FD}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-soc:hover,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-soc:hover *{color:#7C3AED}

/* ═══ v28 + v30 · prefers-reduced-motion — EVERY loop stops (static,
   still colorful gradients — just no movement) ═══ */
@media (prefers-reduced-motion: reduce){
  [data-tpl="gaming-cyber"] .gc-float,
  [data-tpl="gaming-cyber"] .gc-arena-mascot,
  [data-tpl="gaming-cyber"] .gc-head::after,
  [data-tpl="gaming-cyber"] .gc-btn-rgb,
  [data-tpl="gaming-cyber"] .gc-hex-grad,
  [data-tpl="gaming-cyber"] .gc-underline-rainbow,
  [data-tpl="gaming-cyber"] .gc-legend-ring,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb-edge::after,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-win::after,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-hero-shell::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-ring,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-glow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-spin,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-hue,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-spin,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-hue,
  /* v31 rig hero + chrome accents */
  [data-tpl="gaming-cyber"] .gc-hs-float,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-ring,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-glow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-ram,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-gpu-fx,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-led,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-underglow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-glass-tint,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mat::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mouse::after,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-scroll-cue-bar b,
  [data-tpl="gaming-cyber"] [data-chrome-header] > div::after,
  [data-tpl="gaming-cyber"] [data-chrome-footer]::before{animation:none}
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-hero-shell:hover::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb-edge:hover::after,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rgb:hover::before{animation:none}
}
`;

/* ── HUD corner brackets element (4 cyan corners) ─────────────────── */
function Corners() {
  return (
    <span aria-hidden className="gc-corners">
      <i /><i /><i /><i />
    </span>
  );
}

/* ── add-to-cart — POST /api/cart/items {productId} → "cart-updated" event
 * + react-query cart-cache invalidation so the chrome badge refreshes. */
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

/* ── v25 hydration-safe countdown — SSR dashes, ticking after mount;
 * target = global timerEndsAt override OR per-product discountEndsAt
 * (ISO). Zero → «پایان تخفیف». */
function HudCountdown({ iso, big = false }: { iso: string; big?: boolean }) {
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
    return <span className="gc-timer-ended">پایان تخفیف</span>;
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
    <span className={cn("gc-timer-cell", big && "gc-timer-cell-lg")}>
      {v}
      {suffix && <span className="text-[7px] opacity-70">{suffix}</span>}
    </span>
  );
  const sep = () => <span className={cn("gc-timer-sep", big && "gc-timer-sep-lg")}>:</span>;

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

/* ── floating window chrome wrapper (esports dashboard shell) ──────── */
function HudWindow({
  title, code, live, scan, extra, className, children,
}: {
  title: string;
  code: string;
  live?: boolean;
  scan?: boolean;
  extra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("gc-win", className)}>
      <div className="gc-win-bar">
        <span className="gc-dots" aria-hidden>
          <i /><i /><i />
        </span>
        <span className="gc-win-title">{title}</span>
        <span dir="ltr" className="gc-win-code">{code}</span>
        {live && (
          <span className="gc-live-badge">
            <i className="gc-live-dot" aria-hidden />
            LIVE
          </span>
        )}
        {extra && <span className="flex-shrink-0">{extra}</span>}
      </div>
      <div className="relative">
        {scan && <span aria-hidden className="gc-win-scan" />}
        {children}
      </div>
    </div>
  );
}

/* ── section head: hex icon + mono code + BIG title + optional link ── */
function HudHead({
  id, code, title, subtitle, icon: Icon, href, live,
}: {
  id?: string;
  code: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  live?: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="gc-hex gc-hex-grad grid h-11 w-12 shrink-0 place-items-center" aria-hidden>
          <Icon className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p dir="ltr" className="gc-code text-right">{`// ${code}`}</p>
          <h2 id={id} className="gc-head mt-0.5 flex flex-wrap items-center gap-x-2.5 text-2xl font-black tracking-wide text-white sm:text-3xl lg:text-4xl">
            {href ? (
              <Link href={href} className="transition-colors hover:text-[#F79CFF]">
                {title}
              </Link>
            ) : (
              title
            )}
            {href && (
              <Link
                href={href}
                aria-label={`مشاهده ${title}`}
                className="grid h-6 w-6 place-items-center rounded-full bg-[#E22BFF]/15 text-[#F79CFF] transition-colors hover:bg-[#E22BFF] hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </h2>
        </div>
        {live && (
          <span className="gc-live-badge">
            <i className="gc-live-dot" aria-hidden />
            LIVE
          </span>
        )}
      </div>
      {subtitle && <p className="mt-2 text-[13px] text-[#A79BC6]">{subtitle}</p>}
    </div>
  );
}

/* ── v30 · ARGB name-aware lighting picker ───────────────────────────
 * Reads the product's name (+ brand) and returns pure-CSS fx classes:
 *   فن/Fan → gc-fx-spin (image SPINS like a GIF) · کیبورد/Keyboard →
 *   gc-fx-hue (RGB keys breathing) · ماوس/پد موس → gc-fx-ring (glow ring)
 * Animations live in CSS gated by [data-glow="on"] + reduced-motion;
 * when glow is OFF the classes simply aren't applied at all.          */
function argbFx(p: TemplateProduct): { stage: string; img: string } {
  const hay = `${p.name} ${p.brand?.name ?? ""}`;
  if (/فن(?![یای])|فن\s|فن$|Fan|FAN|پنکه/i.test(hay)) return { stage: "", img: "gc-fx-spin" };
  if (/کیبورد|Keyboard|KEYBOARD|کیبورد/i.test(hay)) return { stage: "", img: "gc-fx-hue" };
  if (/پد\s?موس|ماوس|Mousepad|Mouse|MOUSE|موس/i.test(hay)) return { stage: "gc-fx-ring", img: "" };
  return { stage: "", img: "" };
}

/* ── GAMEUP product card — ARGB stage + RGB border + glitch title ──── */
function CyberCard({
  product, timerOn, glowOn, dealTarget,
}: {
  product: TemplateProduct;
  timerOn: boolean;
  glowOn: boolean;
  dealTarget: string | null;
}) {
  const addToCart = useAddToCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const hasDeal = product.discountPercent > 0;
  /* v25: global timerEndsAt (when set) overrides every per-product deadline */
  const timerIso = timerOn && hasDeal ? (dealTarget ?? product.discountEndsAt ?? null) : null;
  const fx = argbFx(product);

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
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn("gc-card group", glowOn && "gc-rgb")}
    >
      {/* v30: ARGB STAGE — rotating rainbow ring + pulsing underglow + name-aware fx */}
      <Link
        href={`/products/${product.slug}`}
        className={cn("gc-stage relative block aspect-square overflow-hidden", glowOn && fx.stage)}
        aria-label={product.name}
      >
        {glowOn && (
          <>
            <span aria-hidden className="gc-argb-ring" />
            <span aria-hidden className="gc-argb-glow" />
          </>
        )}
        <span className={cn("absolute inset-0 z-10", glowOn && fx.img)}>
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.07]"
              loading="lazy"
            />
          ) : (
            <span className="grid h-full place-items-center text-[#E22BFF]/40">
              <Package className="h-12 w-12" aria-hidden />
            </span>
          )}
        </span>
        {hasDeal && (
          <span className="absolute start-3 top-3 z-20 rounded-full bg-gradient-to-l from-[#E22BFF] to-[#8B5CF6] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_0_16px_rgba(217,70,239,.5)]">
            {product.discountPercent.toLocaleString("fa-IR")}٪ OFF
          </span>
        )}
        {product.inStock ? (
          <span className="gc-stock absolute end-3 top-3 z-20">
            <i className="gc-live-dot gc-live-dot-sm" aria-hidden />
            موجود
          </span>
        ) : (
          <span className="absolute end-3 top-3 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white/80 backdrop-blur">
            ناموجود
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#A79BC6]">
          <BadgeCheck className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="gc-glitch min-h-12">
          <span className="gc-glitch-t block text-[13px] font-bold leading-6 text-[#EFEAF9] line-clamp-2 transition-colors group-hover:text-[#F79CFF]">
            {product.name}
          </span>
        </Link>
        {product.rating > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-300" aria-hidden />
            {product.rating.toLocaleString("fa-IR")}
            {product.reviewCount > 0 && <span className="font-normal text-[#A79BC6]">({product.reviewCount.toLocaleString("fa-IR")} نظر)</span>}
          </span>
        )}

        <div className="mt-auto space-y-2 pt-1">
          {hasDeal && (
            <p className="text-[11px] leading-4 text-[#A79BC6] line-through tabular-nums">{formatPrice(product.price)}</p>
          )}
          <p className="text-sm font-black text-[#F79CFF] tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-medium text-[#A79BC6]">تومان</span>
          </p>
          {timerIso && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#06B6D4]/25 bg-[#1A1025]/60 px-2 py-1.5">
              <Timer className="h-3.5 w-3.5 shrink-0 text-[#06B6D4]" aria-hidden />
              <HudCountdown iso={timerIso} />
            </div>
          )}
          <button
            type="button"
            onClick={onAdd}
            disabled={!product.inStock || busy}
            className="gc-btn h-10 w-full text-xs"
            aria-label={`افزودن ${product.name} به سبد خرید`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : done ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <ShoppingBasket className="h-4 w-4" aria-hidden />
            )}
            {!product.inStock ? "ناموجود" : done ? "افزوده شد" : busy ? "..." : "افزودن به سبد"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* ── v31 · RIG HERO — the centerpiece is 100% CODE-DRAWN: a tempered-glass
 * ARGB tower standing on an ARGB desk mat (animated edge LEDs) with a
 * code-drawn mouse, flanked by the two generated 3D headset artworks.
 * The old rotating photo slider is GONE (admin slides dropped from the
 * hero). Fan BLADES never spin — only the RGB glow hue-cycles/breathes
 * with per-fan phase offsets. Persian copy + CTAs + parallax kept. */
const BUNNY_SRC = "/images/gaming/argb-bunny-pink.png";
const BUNNY_ALT = "هد گیمینگ ARGB صورتی با گوش‌های خرگوشی و حلقه‌های نور رنگین‌کمانی";
const TACTICAL_SRC = "/images/gaming/argb-tactical-black.png";
const TACTICAL_ALT = "هد گیمینگ تاکتیکال مشکی با نوارهای نور ARGB سبز و کهربایی";
/* v31: vice-girl art stays only as the DEAL ZONE side illustration (it is
 * no longer the hero centerpiece — see the rig hero above). */
const VICE_SRC = "/images/gaming/vice-girl.png";

/* one RGB fan — conic rainbow ring hue-cycles on a per-fan phase offset
 * (--ph negative delay), blurred glow breathes behind; the BLADES are
 * static by design (owner: fans must not spin). Pure CSS, aria-hidden. */
function RigFan({ className, ph }: { className?: string; ph: string }) {
  return (
    <span aria-hidden className={cn("gc-rig-fan", className)} style={{ "--ph": ph } as React.CSSProperties}>
      <i className="gc-rig-fan-glow" />
      <i className="gc-rig-fan-blades" />
      <i className="gc-rig-fan-ring" />
      <i className="gc-rig-fan-hub" />
    </span>
  );
}

/* the code-drawn tower: metal chassis, glass panel, mobo hints, RAM,
 * GPU block, PSU shroud, 3 front + 2 internal RGB fans, top LED strip,
 * PSU underglow + an ambient RGB tint reacting on the glass. */
function RigCase() {
  return (
    <div className="gc-rig-case3d" aria-hidden>
      <span className="gc-rig-underglow" />
      <div className="gc-rig-frame">
        <span className="gc-rig-mobo" />
        <span className="gc-rig-ram" style={{ "--ph": "-1.1s" } as React.CSSProperties} />
        <span className="gc-rig-ram gc-rig-ram2" style={{ "--ph": "-2.4s" } as React.CSSProperties} />
        <span className="gc-rig-gpu">
          <i className="gc-rig-gpu-fx" />
        </span>
        <span className="gc-rig-psu" />
        {/* front intake trio (right column) */}
        <RigFan className="gc-rig-fan-f1" ph="0s" />
        <RigFan className="gc-rig-fan-f2" ph="-1.6s" />
        <RigFan className="gc-rig-fan-f3" ph="-3.1s" />
        {/* internal duo (CPU + lower intake) */}
        <RigFan className="gc-rig-fan-i1" ph="-2.2s" />
        <RigFan className="gc-rig-fan-i2" ph="-0.8s" />
        {/* top LED strip */}
        <span className="gc-rig-led" />
        {/* tempered glass — tint reacts to the ambient glow, then reflections */}
        <span className="gc-rig-glass-tint" />
        <span className="gc-rig-glass" />
      </div>
    </div>
  );
}

/* flanking headset showcase card — generated 3D art in a floating frame
 * with its own ARGB halo (pink for the bunny set, green/amber for the
 * tactical one) + a small Persian tag. */
function HeadsetCard({
  src, alt, name, tone, className, ph,
}: {
  src: string;
  alt: string;
  name: string;
  tone: "pink" | "green";
  className?: string;
  ph: string;
}) {
  return (
    <div className={cn("gc-hs", className)}>
      <span aria-hidden className={cn("gc-hs-halo", tone === "pink" ? "gc-hs-halo-pink" : "gc-hs-halo-green")} />
      <div className="gc-hs-art gc-hs-float" style={{ "--ph": ph } as React.CSSProperties}>
        <Image src={src} alt={alt} fill sizes="(max-width: 640px) 34vw, 220px" priority className="object-cover" />
        <span className="gc-hs-tag">
          <Headphones className="h-3.5 w-3.5" aria-hidden />
          {name}
        </span>
      </div>
    </div>
  );
}

/* the whole scene: studio ambience, floor shadow + reflection, ARGB mat,
 * mouse, the tower and the two flanking headset cards. */
function RigScene({
  x, y,
}: {
  x: MotionValue<number> | number;
  y: MotionValue<number> | number;
}) {
  return (
    <motion.div className="gc-scene" style={{ x, y }}>
      <span aria-hidden className="gc-scene-amb gc-scene-amb-1" />
      <span aria-hidden className="gc-scene-amb gc-scene-amb-2" />
      <span aria-hidden className="gc-rig-shadow" />
      <span aria-hidden className="gc-rig-reflect" />
      <span aria-hidden className="gc-rig-mat" />
      <span aria-hidden className="gc-rig-mouse" />
      <RigCase />
      <HeadsetCard
        src={BUNNY_SRC}
        alt={BUNNY_ALT}
        name="هد ARGB صورتی"
        tone="pink"
        className="gc-hs-1"
        ph="-1.8s"
      />
      <HeadsetCard
        src={TACTICAL_SRC}
        alt={TACTICAL_ALT}
        name="هد تاکتیکال مشکی"
        tone="green"
        className="gc-hs-2"
        ph="-3.9s"
      />
    </motion.div>
  );
}

function CyberHero({
  data, parallax, scan, glow,
}: {
  data: HomeData;
  parallax: boolean;
  scan: boolean;
  glow: boolean;
}) {
  const reduced = useReducedMotion();
  const par = parallax && !reduced;

  /* mouse-move parallax — subtle layered depths (feature-gated, reduced-motion safe) */
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  const sceneX = useTransform(sx, [0, 1], [-9, 9]);
  const sceneY = useTransform(sy, [0, 1], [-6, 6]);
  const uiX = useTransform(sx, [0, 1], [-5, 5]);

  const heroProduct =
    [...data.exclusive, ...data.featured, ...data.bestsellers].find((p) => p.inStock) ?? null;

  /* v5-f: this template's OWN content (Admin → ظاهر → محتوای اختصاصی قالب) —
   * hero copy + CTA label + extra link chips override the designed defaults;
   * every empty key keeps the v31 design (surgical data-source swap only). */
  const tpl: TemplateContentData = data.templateContent ?? {};
  const texts = tpl.texts ?? {};
  const heroTitle = texts.heroTitle?.trim() || "آرنای خرید گیمرهای حرفه‌ای";
  const heroSubtitle =
    texts.heroSubtitle?.trim() ||
    tpl.brand?.tagline?.trim() ||
    "ریگ ARGB رویایی‌ات را همین‌جا بچین — کیس شیشه‌ای، فن‌های نورانی و کارت گرافیک قدرتمند؛ با قیمت رقابتی و ارسال سریع.";
  const ctaLabel = texts.ctaLabel?.trim() || "ورود به آرنا";
  const tplLinks = (tpl.links ?? []).filter((l) => l.label?.trim() && l.url?.trim()).slice(0, 3);

  return (
    <section
      className="mx-auto w-full max-w-[1360px] px-4"
      aria-label="هیرو فروشگاه گیمینگ"
      onPointerMove={(e) => {
        if (!par) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
    >
      {/* animated RAINBOW ring wrapping the whole hero (gc-hero-shell) */}
      <div className={cn("gc-hero-shell", glow && "gc-glow-halo")}>
        <div className="gc-hero relative overflow-hidden rounded-3xl">
          {/* dark studio ambience — stays dark in both skins so the rig pops */}
          <div aria-hidden className="gc-hero-bg" />

          {/* MAGENTA perspective grid floor */}
          <div aria-hidden className="gc-grid-floor" />

          {/* retro scanlines */}
          {scan && <div aria-hidden className="gc-scanlines absolute inset-0 z-10" />}

          {/* HUD frame: corner brackets + top hud bar + vertical lime tab */}
          <Corners />
          <span aria-hidden dir="ltr" className="gc-vice-tab">Welcome to the Arena</span>
          <div aria-hidden className="gc-hero-hud">
            <span className="gc-dots">
              <i /><i /><i />
            </span>
            <span dir="ltr" className="font-mono text-[10px] font-bold tracking-[.2em] text-[#67E8F9]">TAJ://RIG_ARENA</span>
            <span dir="ltr" className="ms-auto font-mono text-[10px] font-bold tabular-nums text-[#8F7FC0]">
              RGB_ONLINE
            </span>
            <span className="gc-live-badge">
              <i className="gc-live-dot" aria-hidden />
              LIVE
            </span>
          </div>

          {/* text (physical right in RTL) + code-drawn rig scene (physical left) */}
          <div className="relative z-20 grid gap-6 p-6 pb-14 pt-12 sm:p-9 sm:pb-16 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:gap-2 lg:p-10 xl:gap-6">
            <motion.div style={{ x: par ? uiX : 0 }}>
              <span dir="ltr" className="gc-lime-chip mb-4">Welcome to the Arena</span>
              <h2 className="gc-display gc-ds-hero max-w-2xl">{heroTitle}</h2>
              <p className="gc-hero-sub">{heroSubtitle}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Link href="/products" className="gc-btn-lime">
                  <span className="gc-btn-lime-circle" aria-hidden>
                    <Plus className="h-5 w-5" strokeWidth={3} />
                  </span>
                  {ctaLabel}
                </Link>
                <Link href="/products?discount=1" className="gc-btn-vice-ghost">
                  <Flame className="h-4.5 w-4.5 text-[#67E8F9]" aria-hidden />
                  پیشنهادهای شگفت‌انگیز
                </Link>
                {/* v5-f: the template's own links render as extra ghost CTAs */}
                {tplLinks.map((l) => (
                  <Link key={`${l.label}-${l.url}`} href={l.url} className="gc-btn-vice-ghost">
                    <Zap className="h-4.5 w-4.5 text-[#67E8F9]" aria-hidden />
                    {l.label}
                  </Link>
                ))}
              </div>

              {/* floating product pod — TARGET_LOCKED HUD window under the CTAs */}
              {heroProduct && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-8 hidden max-w-[300px] lg:block"
                >
                  <div className={cn("gc-win", glow && "gc-rgb")}>
                    <div className="gc-win-bar gc-win-bar-sm">
                      <span className="gc-dots" aria-hidden>
                        <i /><i /><i />
                      </span>
                      <span dir="ltr" className="gc-win-code gc-win-code-flush">TARGET_LOCKED</span>
                      <span className="gc-live-badge gc-live-badge-sm">
                        <i className="gc-live-dot gc-live-dot-sm" aria-hidden />
                        HOT
                      </span>
                    </div>
                    <Link href={`/products/${heroProduct.slug}`} className="flex items-center gap-3 p-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1A1025]/70 p-1">
                        {heroProduct.mainImage ? (
                          <Image src={heroProduct.mainImage} alt={heroProduct.name} fill sizes="64px" className="object-contain p-1" />
                        ) : (
                          <Package className="m-auto h-6 w-6 text-[#E22BFF]" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-black text-white">{heroProduct.name}</span>
                        <span className="mt-0.5 block text-[13px] font-black text-[#67E8F9] tabular-nums">
                          {formatPrice(heroProduct.discountPrice ?? heroProduct.price)}
                          <span className="text-[9px] font-medium text-[#A79BC6]"> تومان</span>
                        </span>
                      </span>
                      <Zap className="h-4 w-4 shrink-0 text-[#06B6D4]" aria-hidden />
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* the code-drawn ARGB rig scene — fluid % scaling box */}
            <div className="relative mx-auto h-[320px] w-full max-w-[520px] sm:h-[400px] lg:h-[460px] xl:h-[500px]">
              <RigScene x={par ? sceneX : 0} y={par ? sceneY : 0} />
            </div>
          </div>

          {/* scroll cue */}
          <div aria-hidden className="gc-scroll-cue">
            <span dir="ltr" className="gc-scroll-cue-txt">SCROLL</span>
            <i className="gc-scroll-cue-bar"><b /></i>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── v30 · neon swoosh — thin gradient SVG curves sweeping behind ──── */
const SWOOSH_STOPS: Record<"purple" | "vice", Array<[number, string, number]>> = {
  vice: [[0, "#D000FF", 0], [0.45, "#E22BFF", 0.9], [0.75, "#EAFF00", 0.35], [1, "#EAFF00", 0]],
  purple: [[0, "#8B5CF6", 0], [0.45, "#A855F7", 0.9], [0.75, "#EC4899", 0.55], [1, "#EC4899", 0]],
};
function Swoosh({ flip = false, className, variant = "purple" }: { flip?: boolean; className?: string; variant?: "purple" | "vice" }) {
  const gid = `gcsw-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const stops = SWOOSH_STOPS[variant];
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 260"
      fill="none"
      preserveAspectRatio="none"
      className={cn("gc-swoosh", flip && "gc-swoosh-flip", className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          {stops.map(([off, color, opacity]) => (
            <stop key={off} offset={off} stopColor={color} stopOpacity={opacity} />
          ))}
        </linearGradient>
      </defs>
      <path d="M-20 210 C 300 20, 700 250, 1220 60" stroke={`url(#${gid})`} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-20 244 C 330 74, 720 286, 1220 98" stroke={`url(#${gid})`} strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

/* ── system status strip (announcement / ticker marquee) ───────────── */
function SysStrip({ data }: { data: HomeData }) {
  const msgs = resolveTickerMessages(data.store);
  if (msgs.length === 0) return null;
  const dur = Math.max(8, data.store.tickerSpeed ?? 18);
  return (
    <section aria-label="پیام‌های فروشگاه" className="mx-auto w-full max-w-[1360px] px-4">
      <div className="gc-strip">
        <span className="gc-strip-badge">
          <Radio className="h-3 w-3" aria-hidden />
          ON AIR
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="taj-marquee items-center gap-8 py-0.5" style={{ "--t-dur": `${dur}s` } as React.CSSProperties}>
            {[0, 1].map((copy) =>
              msgs.map((m, i) => (
                <span key={`${copy}-${i}`} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-3 text-[12px] font-bold text-[#DCCFF4]">
                  {m.link ? (
                    <Link href={m.link} className="transition-colors hover:text-[#67E8F9]">
                      {m.text}
                    </Link>
                  ) : (
                    m.text
                  )}
                  <span className="text-[#8B5CF6]/60" aria-hidden>◆</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ accordion item (support console) ──────────────────────────── */
function HudFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="gc-faq-item overflow-hidden" data-open={open ? "1" : "0"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 p-4 text-start"
      >
        <span dir="ltr" className="gc-qchip shrink-0 rounded-lg bg-[#E22BFF]/15 px-2 py-1 font-mono text-[10px] font-black tracking-widest text-[#F79CFF]">
          {`Q${String(n + 1).padStart(2, "0")}`}
        </span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#EFEAF9]">{h}</span>
        <ChevronLeft
          className={cn("h-4 w-4 shrink-0 text-[#A79BC6] transition-transform duration-300", open && "-rotate-90")}
          aria-hidden
        />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="border-t border-dashed border-[#8B5CF6]/20 px-4 pb-4 pt-3 text-[12.5px] leading-7 text-[#A79BC6]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ── v28 · «اسطوره‌های آرنا» — anime mascot showcase band ─────────── */
function ArenaLegends({ data, glow, scan }: { data: HomeData; glow: boolean; scan: boolean }) {
  const muse = data.brands.find((b) => b.slug === "muse");
  const chips = ["keyboard", "mouse", "pc-parts", "headphones", "monitor"].flatMap((slug) => {
    const c = data.categories.find((x) => x.slug === slug);
    return c ? [c] : [];
  });
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-arena">
      <Reveal>
        <HudHead
          id="gc-arena"
          icon={Swords}
          code="ARENA_LEGENDS"
          title="اسطوره‌های آرنا"
          subtitle="کلکسیون گیمینگ تاج — با نور ARGB مثل هیچ‌جای دیگر"
        />
        <div className={cn("gc-arena", glow && "gc-rgb-edge")}>
          {scan && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-50" />}
          <Corners />
          <div className="gc-arena-grid">
            {/* art column — anime rig frame + floating mascot card */}
            <div className="gc-arena-art">
              <div className="gc-art-frame">
                <Image
                  src="/images/gaming/anime-rig.png"
                  alt="دختر گیمر انیمه‌ای تکیه داده به کیس ARGB درخشان"
                  fill
                  sizes="(max-width: 640px) 88vw, 520px"
                  className="object-cover"
                  loading="lazy"
                />
                <span aria-hidden className="absolute bottom-3 end-3 rounded-full bg-black/70 px-3 py-1 font-mono text-[9.5px] font-black tracking-[.2em] text-[#67E8F9] backdrop-blur">
                  RIG_PREVIEW
                </span>
              </div>
              <div className="gc-arena-mascot">
                <Image
                  src="/images/gaming/anime-mascot.png"
                  alt="ماسکوت گیمری تاج با نور نئونی صورتی و فیروزه‌ای"
                  fill
                  sizes="(max-width: 640px) 42vw, 220px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            {/* copy column */}
            <div className="min-w-0">
              <p dir="ltr" className="gc-code gc-code-magenta">{`//${muse ? " BRAND=MUSE ·" : ""} ARGB_COLLECTION`}</p>
              <h3 className="mt-2 text-2xl font-black leading-10 text-white sm:text-3xl">
                کلکسیون گیمینگ با نور ARGB — مثل هیچ‌جای دیگر
              </h3>
              <p className="mt-3 text-[13px] leading-7 text-[#C9BEE4]">
                از کیبورد مکانیکال و کیس شیشه‌ای MUSE تا صندلی RGB و مانیتور منحنی ۱۶۵ هرتز؛
                همه‌چیز برای ساختن ریگی که در تاریکی می‌درخشد و در آرنا حکومت می‌کند.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="gc-chip">
                    <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
                    {c.name}
                  </Link>
                ))}
                {muse && (
                  <Link href="/products?brand=muse" className="gc-chip">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    برند MUSE
                  </Link>
                )}
              </div>
              <div className="mt-6">
                <Link href="/products" className="gc-btn-lime">
                  <span className="gc-btn-lime-circle" aria-hidden>
                    <Zap className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </span>
                  مشاهده تجهیزات ARGB
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── v30 · GTA big-number DEAL BLOCK — giant outlined ۰۱/۰۲ numeral +
 * huge italic title + lime pill + rainbow underline + HudCountdown;
 * reuses the flash-deal data + global timerEndsAt, same as CyberCard. */
function GtaDealBlock({
  product, index, timerOn, dealTarget, glow,
}: {
  product: TemplateProduct;
  index: number;
  timerOn: boolean;
  dealTarget: string | null;
  glow: boolean;
}) {
  const addToCart = useAddToCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const hasDeal = product.discountPercent > 0;
  const timerIso = timerOn && hasDeal ? (dealTarget ?? product.discountEndsAt ?? null) : null;
  const num = `۰${(index + 1).toLocaleString("fa-IR")}`;

  const onAdd = async () => {
    if (busy || done || !product.inStock) return;
    setBusy(true);
    const ok = await addToCart(product);
    setBusy(false);
    if (ok) {
      setDone(true);
      window.setTimeout(() => setDone(false), 1100);
    }
  };

  return (
    <article className={cn("gc-deal-block", glow && "gc-rgb")} aria-label={`تخفیف ${product.name}`}>
      {/* content first (inline-start in RTL) … numeral pinned inline-end (physical left, GTA-style) */}
      <div className="relative z-10 flex items-start gap-4">
        <Link href={`/products/${product.slug}`} className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#1A1025]/70" aria-hidden>
          {product.mainImage ? (
            <Image src={product.mainImage} alt="" fill sizes="80px" className="object-contain p-2" loading="lazy" />
          ) : (
            <Package className="absolute inset-0 m-auto h-8 w-8 text-[#E22BFF]/50" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#A79BC6]">
            <BadgeCheck className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden />
            {product.brand.name}
          </p>
          <Link href={`/products/${product.slug}`} className="gc-glitch mt-1 block">
            <span className="gc-glitch-t block text-lg font-black leading-8 text-white line-clamp-2 transition-colors hover:text-[#F79CFF]">
              {product.name}
            </span>
          </Link>
          {hasDeal && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#E22BFF] to-[#8B5CF6] px-2.5 py-0.5 text-[10px] font-black text-white">
              {product.discountPercent.toLocaleString("fa-IR")}٪ OFF
            </span>
          )}
        </div>
      </div>

      <span aria-hidden className="gc-deal-num pointer-events-none absolute end-3 top-2 z-0">{num}</span>

      {/* price + timer + CTA */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {hasDeal && product.price > product.effectivePrice && (
            <p className="text-[11.5px] leading-4 text-[#A79BC6] line-through tabular-nums">{formatPrice(product.price)}</p>
          )}
          <p className="text-xl font-black text-[#F79CFF] tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-medium text-[#A79BC6]">تومان</span>
          </p>
        </div>
        {timerIso && (
          <span className="flex items-center gap-1.5 rounded-lg border border-[#06B6D4]/25 bg-[#1A1025]/60 px-2 py-1.5">
            <Timer className="h-3.5 w-3.5 shrink-0 text-[#06B6D4]" aria-hidden />
            <HudCountdown iso={timerIso} />
          </span>
        )}
      </div>

      <div className="relative z-10 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onAdd}
          disabled={!product.inStock || busy}
          className="gc-btn-lime gc-btn-lime-sm"
          aria-label={`افزودن ${product.name} به سبد خرید`}
        >
          <span className="gc-btn-lime-circle" aria-hidden>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          {!product.inStock ? "ناموجود" : done ? "افزوده شد" : busy ? "..." : "افزودن به سبد"}
        </button>
        <Link
          href={`/products/${product.slug}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#8B5CF6]/45 text-[#C4B5FD] transition-colors hover:border-[#E22BFF]/60 hover:text-[#F79CFF]"
          aria-label={`مشاهده ${product.name}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <span aria-hidden className="gc-underline-rainbow block" />
    </article>
  );
}

/* ── v30 · DEAL ZONE — GTA big-number section: floating vice-girl side art
 * + global countdown + numbered deal blocks. Data = data.discounted. */
function DealZone({
  deals, timerOn, dealTarget, glow, scan,
}: {
  deals: TemplateProduct[];
  timerOn: boolean;
  dealTarget: string | null;
  glow: boolean;
  scan: boolean;
}) {
  if (deals.length === 0) return null;
  const globalIso = timerOn ? (dealTarget ?? deals[0].discountEndsAt ?? null) : null;
  const maxOff = Math.max(...deals.map((p) => p.discountPercent), 0);
  const art = (
    <>
      <Image
        src={VICE_SRC}
        alt="دختر انیمه‌ای وسترن کنار سوپرکار نئونی — منطقه تخفیف آرنا"
        fill
        sizes="(max-width: 1024px) 92vw, 420px"
        className="object-cover"
        loading="lazy"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B0014]/95 via-[#0B0014]/35 to-[#D000FF]/25" />
    </>
  );
  const artContent = (
    <div className="gc-deal-art-txt flex h-full flex-col justify-between gap-4 p-5">
      <span dir="ltr" className="gc-lime-chip w-fit">Deal Zone</span>
      <div>
        <p dir="ltr" className="gc-code gc-code-cyan mb-2">{`// FLASH_SALE · MAX_${maxOff.toLocaleString("fa-IR")}OFF`}</p>
        <p className="gc-display gc-ds-deal">تخفیف می‌سوزه</p>
        {globalIso ? (
          <p className="mt-3 flex items-center gap-2 text-[#F79CFF]">
            <Flame className="h-4 w-4" aria-hidden />
            <HudCountdown iso={globalIso} big />
          </p>
        ) : (
          <p className="mt-3 text-[12px] font-bold text-[#C9BEE4]">
            تا {maxOff.toLocaleString("fa-IR")}٪ تخفیف روی تجهیزات گیمینگ
          </p>
        )}
      </div>
    </div>
  );
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-deals">
      <Reveal>
        <HudHead
          id="gc-deals"
          icon={Flame}
          code="DEAL_ZONE"
          title="منطقه تخفیف"
          href="/products?discount=1"
          live={timerOn}
          subtitle={timerOn ? (dealTarget ? "شمارش معکوس سراسری تخفیف‌ها فعال است" : "تایمر که صفر شود، تخفیف می‌سوزد") : "تخفیف‌های داغ آرنا"}
        />
        <div className="gc-deal-zone">
          <Swoosh variant="vice" className="z-0" />
          {scan && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-40" />}
          <Corners />
          <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.85fr_1.35fr] lg:gap-6">
            {/* floating anime side art — full column on desktop, slim banner on mobile */}
            <div className="gc-deal-art relative hidden min-h-[420px] lg:block">
              {art}
              {artContent}
            </div>
            <div className="gc-deal-art relative h-48 lg:hidden">
              {art}
              {artContent}
            </div>
            {/* GTA big-number blocks */}
            <div className="relative grid content-start gap-4 sm:grid-cols-2">
              {deals.slice(0, 4).map((p, i) => (
                <GtaDealBlock key={p.id} product={p} index={i} timerOn={timerOn} dealTarget={dealTarget} glow={glow} />
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── v30 · ARGB GEAR SHOWCASE — wide argb-rig banner (RGB edge) + two
 * SPOTLIGHT tiles (argb-fan SPINS, argb-keyboard hue-pulses — pure CSS),
 * then the REAL catalog gaming gear cards on their own ARGB stages. */
function ArgbShowcase({
  gear, timerOn, glow, dealTarget, tplShowcases,
}: {
  gear: TemplateProduct[];
  timerOn: boolean;
  glow: boolean;
  dealTarget: string | null;
  /** v5-f: the template's OWN showcase entries — when non-empty they replace
   *  the designed spotlight tiles (admin image/title/link win). */
  tplShowcases?: TemplateShowcase[];
}) {
  /* v31: the two GENERATED 3D headset artworks join the spotlight tiles
   * (vice-girl/anime-hero are retired from the template's references —
   * the files stay on disk untouched).
   * v5-f: the template's own showcases (Admin → ظاهر → محتوای اختصاصی قالب)
   * REPLACE the designed tiles when present. */
  const tplSpots = (tplShowcases ?? []).filter((s) => s.image?.trim());
  const spots: Array<{ src: string; alt: string; icon: React.ElementType; title: string; sub: string; href: string; fx: string }> = tplSpots.length > 0
    ? tplSpots.map((s, i) => ({
        src: s.image,
        alt: s.title?.trim() || "کارت اختصاصی این قالب",
        icon: Headphones,
        title: s.title?.trim() || "پیشنهاد ویژه",
        sub: "",
        href: s.link?.trim() || "/products",
        fx: i % 2 === 0 ? "gc-spot-hue" : "",
      }))
    : [
    {
      src: "/images/gaming/argb-bunny-pink.png", alt: "هد گیمینگ ARGB صورتی با گوش‌های خرگوشی و حلقه‌های نور رنگین‌کمانی",
      icon: Headphones, title: "هد ARGB صورتی", sub: "گوش خرگوشی + حلقه‌های نور رقصان", href: "/products?q=هدفون", fx: "gc-spot-hue",
    },
    {
      src: "/images/gaming/argb-tactical-black.png", alt: "هد گیمینگ تاکتیکال مشکی با نوارهای نور ARGB سبز و کهربایی",
      icon: Headphones, title: "هد تاکتیکال مشکی", sub: "سبک رزمی، نور سبز و کهربایی", href: "/products?q=هدفون", fx: "",
    },
    {
      src: "/images/gaming/argb-fan.png", alt: "فن ARGB گیمینگ با نور چرخان آرین‌کمانی",
      icon: Fan, title: "فن‌های ARGB", sub: "نورش واقعاً می‌چرخه — ببین", href: "/products?q=فن", fx: "gc-spot-spin",
    },
    {
      src: "/images/gaming/argb-keyboard.png", alt: "کیبورد مکانیکال RGB با نورپردازی نفس‌کشنده",
      icon: Keyboard, title: "کیبوردهای RGB", sub: "کی‌لیت‌هایی که نفس می‌کشن", href: "/products?q=کیبورد", fx: "gc-spot-hue",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-argb">
      <Reveal>
        <HudHead
          id="gc-argb"
          icon={Zap}
          code="ARGB_GEAR"
          title="تجهیزات ARGB"
          href="/products?brand=muse"
          live
          subtitle="نور آرین‌کمانی روی میز گیمینگ شما — کیبورد، کیس، ماوس‌پد، صندلی و…"
        />
        {/* wide rig banner (photo stays dark in both skins) */}
        <Link href="/products?brand=muse" className={cn("gc-rig-banner group", glow && "gc-rgb-edge")} aria-label="ریگ ARGB مکانی — مشاهده تجهیزات">
          <Image
            src="/images/gaming/argb-rig.png"
            alt="ریگ گیمینگ ARGB با شش فن نورانی و نورپردازی آرین‌کمانی"
            fill
            sizes="(max-width: 640px) 92vw, 1360px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <Swoosh className="z-[2]" />
          <span aria-hidden className="absolute inset-0 z-[3] bg-gradient-to-l from-[#0B0014]/95 via-[#0B0014]/55 to-transparent" />
          <span className="relative z-[4] flex h-full min-h-[inherit] flex-col justify-end p-6 sm:p-8">
            <span dir="ltr" className="gc-lime-chip mb-4 w-fit">Live ARGB</span>
            <span className="gc-display gc-ds-xl max-w-lg">ریگ ARGB رویایی‌ات، همین‌جاست</span>
            <span className="mt-3 max-w-md text-[13px] leading-7 text-[#D6C9EE]">
              شش فن نورانی، کیس شیشه‌ای و نورپردازی هماهنگ — میز گیمینگی که در تاریکی حکومت می‌کند.
            </span>
            <span className="mt-6">
              <span className="gc-banner-cta">
                <Zap className="h-4 w-4" aria-hidden />
                دیدن ریگ‌ها
              </span>
            </span>
          </span>
        </Link>

        {/* spotlight tiles — headsets + fan + keyboard (pure CSS, gated) */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {spots.map((s) => (
            <Link key={s.title} href={s.href} className={cn("gc-spot group", glow && "gc-rgb")}>
              <div className="gc-stage relative aspect-square overflow-hidden sm:aspect-[16/9]">
                {glow && (
                  <>
                    <span aria-hidden className="gc-argb-ring" />
                    <span aria-hidden className="gc-argb-glow" />
                  </>
                )}
                <span className={cn("absolute inset-0 z-10", glow && s.fx)}>
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="(max-width: 640px) 92vw, 640px"
                    className="object-cover"
                    loading="lazy"
                  />
                </span>
              </div>
              <div className="flex items-center gap-3.5 p-4">
                <span className="gc-spot-ico">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="gc-spot-title block">{s.title}</span>
                  {s.sub ? <span className="gc-spot-sub block">{s.sub}</span> : null}
                </span>
                <ChevronLeft className="gc-spot-arrow h-5 w-5 shrink-0" aria-hidden />
              </div>
            </Link>
          ))}
        </div>

        {/* real catalog gear on ARGB stages */}
        {gear.length > 0 && (
          <div className="taj-stagger mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gear.slice(0, 4).map((p) => (
              <CyberCard key={p.id} product={p} timerOn={timerOn} glowOn={glow} dealTarget={dealTarget} />
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}

/* ── v30 · CONNECT banner (GameUp-style purple→pink gradient) ────────
 * Upgrades the old AI-copilot glass band: stream-girl art one side,
 * «به آرنای تاج بپیوند» headline, dark-purple glowing rounded-full CTA
 * — and KEEPS the chat-opening behavior (useChatStore).              */
function ConnectBand({ data }: { data: HomeData }) {
  const firstName = (data.store.storeName ?? "آرنا").trim().split(/\s+/)[0] || "آرنا";
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-connect">
      <Reveal>
        <div className="gc-connect">
          <Swoosh className="z-[2]" />
          <div className="relative z-[3] grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* copy + CTA (inline-start / physical right in RTL) */}
            <div className="p-6 sm:p-9">
              <div className="flex items-center gap-3">
                <span className="gc-hex gc-hex-grad grid h-11 w-12 shrink-0 place-items-center" aria-hidden>
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p dir="ltr" className="gc-code text-right text-[#E9D5FF]">{"// AI_COPILOT · CONNECT"}</p>
                  <h2 id="gc-connect" className="gc-display gc-ds-xl mt-0.5">به آرنای {firstName} بپیوند</h2>
                </div>
              </div>
              <p className="mt-4 max-w-lg text-[13.5px] leading-7 text-[#F3E8FF]">
                کوپایلوت هوشمند تاج به انبار و قیمت‌های واقعی وصل است؛ ریگ کامل بچین، تجهیزات را مقایسه کن یا
                سفارشت را پیگیری کن — همه با یک چت، ۲۴ ساعته.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  { icon: Zap, t: "جستجوی هوشمند" }, { icon: Trophy, t: "مقایسه تجهیزات" }, { icon: Activity, t: "پیگیری سفارش" },
                ].map((f) => (
                  <span key={f.t} className="gc-connect-chip"><f.icon className="h-3.5 w-3.5" aria-hidden />{f.t}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => useChatStore.getState().setOpen(true)}
                className="gc-connect-cta mt-6"
              >
                <Sparkles className="h-4.5 w-4.5" aria-hidden />
                شروع چت با کوپایلوت
              </button>
            </div>
            {/* anime art side — fades into the gradient */}
            <div className="relative hidden h-full min-h-[300px] lg:block" aria-hidden>
              <Image
                src="/images/gaming/stream-girl.png"
                alt=""
                fill
                sizes="480px"
                className="object-cover"
                loading="lazy"
                style={{ maskImage: "linear-gradient(to left, transparent 4%, black 42%)", WebkitMaskImage: "linear-gradient(to left, transparent 4%, black 42%)" }}
              />
              <span className="gc-live-badge absolute end-5 top-5 z-[4]">
                <i className="gc-live-dot" aria-hidden />
                LIVE
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── v30 · FINAL CTA band — giant glowing monogram + lime CTA before footer ── */
function FinalCtaBand({ data }: { data: HomeData }) {
  const mono = (data.store.storeName ?? "T").trim().charAt(0) || "T";
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-final">
      <Reveal>
        <div className="gc-final px-6 pb-10 pt-8 text-center sm:pb-12 sm:pt-10">
          <Swoosh flip className="z-0" />
          <Corners />
          <span aria-hidden className="gc-final-mono">{mono}</span>
          <p dir="ltr" className="gc-code mt-1 tracking-[.3em]">{(data.store.storeNameEn || "TAJ").toUpperCase()}</p>
          <h2 id="gc-final" className="gc-display gc-ds-xl mt-4">آرنا منتظرته</h2>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-7 text-[#A79BC6]">
            تجهیزات ARGB، ریگ‌های رویایی و تخفیف‌های داغ — یک کلیک تا میز گیمینگ رویایی‌ات فاصله داری.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/products" className="gc-btn-lime">
              <span className="gc-btn-lime-circle" aria-hidden>
                <Plus className="h-5 w-5" strokeWidth={3} />
              </span>
              شروع خرید
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { icon: ShieldCheck, t: "ضمانت اصالت کالا" }, { icon: Truck, t: "ارسال سریع به سراسر ایران" },
              { icon: Headphones, t: "پشتیبانی ۲۴/۷" }, { icon: Gamepad2, t: "تجهیزات ARGB اورجینال" },
            ].map((c) => (
              <span key={c.t} className="gc-final-chip">
                <c.icon className="h-4 w-4 text-[#8B5CF6]" aria-hidden />
                {c.t}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════════ */
export function GamingCyberTemplate({ data }: { data: HomeData }) {
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["gaming-cyber"];

  /* feature flags (Admin → ظاهر → ویژگی‌های قالب) — missing key = ON */
  const feat = (k: string) => (data.store.features ? data.store.features[k] !== false : true);
  const timerOn = feat("timer");
  const glowOn = feat("glow");
  const parallaxOn = feat("parallax");
  const scanOn = feat("scanlines");

  /* v25: admin's GLOBAL countdown override — when set (non-null string)
   * it drives EVERY deal timer in this template. */
  const dealTarget =
    typeof data.store.timerEndsAt === "string" && data.store.timerEndsAt.trim() !== ""
      ? data.store.timerEndsAt
      : null;

  const deals = [...data.discounted].sort((a, b) => {
    const aa = a.discountEndsAt ? new Date(a.discountEndsAt).getTime() : Infinity;
    const bb = b.discountEndsAt ? new Date(b.discountEndsAt).getTime() : Infinity;
    if (aa !== bb) return aa - bb;
    return b.discountPercent - a.discountPercent;
  });

  const stats = [
    { icon: Package, label: "محصولات فعال", value: data.counts.products, code: "ITEMS" },
    { icon: Users, label: "برندهای هم‌تیم", value: data.counts.brands, code: "BRANDS" },
    { icon: Layers, label: "دسته‌بندی‌ها", value: data.counts.categories, code: "CLASSES" },
    { icon: Radio, label: "کانال‌های زنده", value: data.counts.stories, code: "CHANNELS" },
  ];

  /* v28: «تجهیزات ARGB» — gaming gear harvested from the EXISTING HomeData
   * rails (no new API / server data): MUSE brand products + gaming categories
   * (کیبورد/موس/مانیتور/کنسول/قطعات) + نام‌های گیمینگ/RGB. Deduped by id. */
  const ARGB_CATS = new Set(["keyboard", "mouse", "monitor", "console", "pc-parts"]);
  const argbGear = [
    ...data.featured,
    ...data.newest,
    ...data.bestsellers,
    ...data.discounted,
    ...data.exclusive,
  ].filter((p, i, arr) => {
    if (arr.findIndex((q) => q.id === p.id) !== i) return false;
    return (
      p.brand.slug === "muse" ||
      ARGB_CATS.has(p.category.slug) ||
      /گیمینگ|argb|rgb|استریم/i.test(p.name)
    );
  });

  /* v5-f: mission-board tiles — the template's OWN slides (Admin → ظاهر →
   * محتوای اختصاصی قالب) join the boards; when the template carries its own
   * SHOWCASES they already star in the ARGB spotlight tiles above, so the
   * (already-swapped) showcase row steps aside to avoid the same art twice. */
  const tplContent: TemplateContentData = data.templateContent ?? {};
  const tplMissionTiles = (tplContent.slides ?? [])
    .filter((s) => s.image?.trim())
    .map((s, i) => ({
      id: `tpl-mission-${i}`,
      title: s.title?.trim() ?? "",
      subtitle: s.subtitle?.trim() || null,
      image: s.image,
      buttonUrl: s.link?.trim() || null,
      product: null as { slug: string } | null,
    }));
  const missions = [
    ...tplMissionTiles,
    ...((tplContent.showcases?.length ?? 0) > 0 ? [] : data.showcases.slice(0, 4)),
  ];

  return (
    <div
      data-template-chrome="1"
      data-tpl="gaming-cyber"
      data-glow={glowOn ? "on" : "off"}
      data-scan={scanOn ? "on" : "off"}
      className="w-full"
    >
      <style>{GC_CSS}</style>
      <TemplateHeader data={data} cfg={{ ...chrome.header, accent: "violet" }} />
      <h1 className="sr-only">{`${data.store.storeName} — گیمینگ و سایبر`}</h1>

      <div className="gc-root w-full space-y-12 pb-14 sm:space-y-14">
        {/* ═══ SYSTEM STATUS STRIP (announcement) ═══ */}
        <SysStrip data={data} />

        {/* ═══ STORIES — live channels window ═══ */}
        {stories.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <HudWindow title="کانال‌های زنده" code="LIVE_FEED" live scan={scanOn}>
                <div className="p-4 sm:p-5">
                  <StoriesRow stories={stories} />
                </div>
              </HudWindow>
            </Reveal>
          </section>
        )}

        {/* ═══ HERO — VICE ARENA rig scene (code-drawn ARGB tower) ═══ */}
        <CyberHero data={data} parallax={parallaxOn} scan={scanOn} glow={glowOn} />

        {/* ═══ STATS TILES — dashboard shell ═══ */}
        <section className="mx-auto w-full max-w-[1360px] px-4" aria-label="آمار فروشگاه">
          <Reveal>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.code} className="gc-tile">
                  <span className="gc-tile-ico" aria-hidden>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="gc-tile-v block">{s.value.toLocaleString("fa-IR")}</span>
                    <span className="gc-tile-l block truncate">{s.label}</span>
                  </span>
                  <span dir="ltr" className="ms-auto hidden font-mono text-[9px] font-bold tracking-widest text-[#8F7FC0] sm:block">
                    {s.code}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ v28 · ARENA LEGENDS — anime mascot band ═══ */}
        <ArenaLegends data={data} glow={glowOn} scan={scanOn} />

        {/* ═══ CATEGORY RAIL — hex tiles ═══ */}
        {data.categories.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-cats">
            <Reveal>
              <HudHead id="gc-cats" icon={Layers} code="SHOP_ROUTES" title="مسیرهای خرید" subtitle="دسته‌بندی‌های فعال آرنا" href="/products" />
              <div role="list" className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                {data.categories.slice(0, 12).map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    role="listitem"
                    className="gc-cat w-32 shrink-0 snap-start rounded-xl p-2 text-center transition-colors hover:bg-[#2E2345]/60 sm:w-36"
                  >
                    <span className="gc-cat-hex relative mx-auto block h-28 w-28 sm:h-32 sm:w-32">
                      <span className="gc-hex gc-hex-grad absolute inset-0" aria-hidden />
                      <span className="gc-hex absolute inset-[2px] overflow-hidden bg-[#251B35]">
                        {c.image ? (
                          <Image
                            src={c.image}
                            alt={c.name}
                            fill
                            sizes="128px"
                            className="object-cover opacity-85"
                            loading="lazy"
                          />
                        ) : (
                          <Gamepad2 className="mx-auto h-8 w-8 text-[#E22BFF]" aria-hidden />
                        )}
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-black text-[#EFEAF9]">{c.name}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-[#A79BC6] tabular-nums">
                      {c.productCount.toLocaleString("fa-IR")} کالا
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ v30 · ARGB GEAR — rig banner + spinning spotlight + gear ═══ */}
        {argbGear.length > 0 && (
          <ArgbShowcase
            gear={argbGear}
            timerOn={timerOn}
            glow={glowOn}
            dealTarget={dealTarget}
            tplShowcases={data.templateContent?.showcases}
          />
        )}

        {/* ═══ v30 · DEAL ZONE — GTA big-number blocks ═══ */}
        {deals.length > 0 && (
          <DealZone deals={deals} timerOn={timerOn} dealTarget={dealTarget} glow={glowOn} scan={scanOn} />
        )}

        {/* ═══ EXCLUSIVE — legendary loot cinematic card ═══ */}
        {data.exclusive.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-exclusive">
            <Reveal>
              <HudHead id="gc-exclusive" icon={Swords} code="LEGENDARY_LOOT" title="آیتم‌های افسانه‌ای" subtitle="انحصاریِ لابی — فقط در تاج" />
              {data.exclusive[0] && (
                <div className={cn("gc-legendary", glowOn && "gc-rgb")}>
                  {scanOn && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-60" />}
                  <Corners />
                  <div className="relative grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
                    {/* media with rotating HUD ring */}
                    <div className="relative mx-auto aspect-square w-full max-w-xs sm:max-w-sm">
                      <span aria-hidden className="gc-legend-ring" />
                      {data.exclusive[0].mainImage ? (
                        <Image
                          src={data.exclusive[0].mainImage}
                          alt={data.exclusive[0].name}
                          fill
                          sizes="(max-width: 640px) 80vw, 380px"
                          className="object-contain p-6"
                          priority={false}
                          loading="lazy"
                        />
                      ) : (
                        <Package className="absolute inset-0 m-auto h-20 w-20 text-[#E22BFF]/50" aria-hidden />
                      )}
                      <span className="gc-hex gc-hex-grad absolute start-0 top-4 grid h-11 w-12 place-items-center font-mono text-[9px] font-black tracking-widest text-white" aria-hidden>
                        S-TIER
                      </span>
                    </div>
                    {/* content */}
                    <div className="min-w-0">
                      <p dir="ltr" className="gc-code gc-code-magenta">{`// ${data.exclusive[0].brand.name} · RARITY=S`}</p>
                      <h3 className="gc-glitch mt-1.5 text-2xl font-black leading-9 text-white sm:text-3xl">
                        <span className="gc-glitch-t">{data.exclusive[0].name}</span>
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        {data.exclusive[0].rating > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300">
                            <Star className="h-3.5 w-3.5 fill-amber-300" aria-hidden />
                            {data.exclusive[0].rating.toLocaleString("fa-IR")}
                          </span>
                        )}
                        {data.exclusive[0].soldCount > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2.5 py-1 text-[#C4B5FD]">
                            <Trophy className="h-3.5 w-3.5" aria-hidden />
                            {data.exclusive[0].soldCount.toLocaleString("fa-IR")} فروش
                          </span>
                        )}
                        {data.exclusive[0].inStock && (
                          <span className="gc-stock">
                            <i className="gc-live-dot gc-live-dot-sm" aria-hidden />
                            موجود در انبار
                          </span>
                        )}
                      </div>
                      <div className="mt-5 flex flex-wrap items-end gap-3">
                        {data.exclusive[0].discountPercent > 0 && (
                          <span className="text-sm text-[#A79BC6] line-through tabular-nums">
                            {formatPrice(data.exclusive[0].price)}
                          </span>
                        )}
                        <span className="text-2xl font-black text-[#F79CFF] tabular-nums">
                          {formatPrice(data.exclusive[0].effectivePrice)}
                          <span className="ms-1 text-xs font-medium text-[#A79BC6]">تومان</span>
                        </span>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href={`/products/${data.exclusive[0].slug}`} className="gc-btn h-11 px-6 text-sm">
                          <Swords className="h-4 w-4" aria-hidden />
                          مشاهده آیتم افسانه‌ای
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* more exclusives — compact loot rail */}
              {data.exclusive.length > 1 && (
                <div role="list" className="no-scrollbar mt-4 flex snap-x gap-3 overflow-x-auto pb-1">
                  {data.exclusive.slice(1, 5).map((p) => (
                    <Link
                      key={p.id}
                      role="listitem"
                      href={`/products/${p.slug}`}
                      className={cn("gc-card w-56 shrink-0 snap-start p-3", glowOn && "gc-rgb")}
                    >
                      <span className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#1A1025]/70 p-1">
                          {p.mainImage ? (
                            <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-0.5" loading="lazy" />
                          ) : (
                            <Package className="m-auto h-5 w-5 text-[#E22BFF]" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-[#EFEAF9]">{p.name}</span>
                          <span className="text-[11px] font-black text-[#67E8F9] tabular-nums">
                            {formatPrice(p.effectivePrice)}
                          </span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-[#A79BC6]" aria-hidden />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — loadout grid ═══ */}
        {data.featured.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-featured">
            <Reveal>
              <HudHead id="gc-featured" icon={Star} code="LOADOUT_01" title="تجهیزات ویژه" subtitle="میان‌بر به بهترین‌ها" href="/products?sort=rating" />
              <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <CyberCard key={p.id} product={p} timerOn={timerOn} glowOn={glowOn} dealTarget={dealTarget} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — ranked leaderboard rail ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-board">
            <Reveal>
              <HudHead id="gc-board" icon={Trophy} code="TOP_PLAYERS" title="جدول امتیازات" subtitle="بر اساس فروش واقعی" href="/products?sort=bestselling" />
              <div className="gc-win p-3 sm:p-4">
                <div role="list" className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <Link
                      key={p.id}
                      role="listitem"
                      href={`/products/${p.slug}`}
                      className="group w-52 shrink-0 snap-start rounded-xl border border-[#8B5CF6]/22 bg-[#2E2345]/40 p-3 transition-all hover:-translate-y-1 hover:border-[#E22BFF]/60 sm:w-56"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "gc-rank",
                            i === 0 && "gc-rank-1",
                            i === 1 && "gc-rank-2",
                            i === 2 && "gc-rank-3",
                            i > 2 && "gc-rank-n"
                          )}
                        >
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#1A1025]/70 p-1">
                          {p.mainImage ? (
                            <Image src={p.mainImage} alt={p.name} fill sizes="64px" className="object-contain p-0.5 transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                          ) : (
                            <Package className="m-auto h-6 w-6 text-[#E22BFF]" aria-hidden />
                          )}
                        </span>
                      </div>
                      <span className="mt-2.5 block min-h-12 text-[12.5px] font-bold leading-6 text-[#EFEAF9] line-clamp-2 group-hover:text-[#F79CFF]">
                        {p.name}
                      </span>
                      <span className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[12px] font-black text-[#67E8F9] tabular-nums">
                          {formatPrice(p.effectivePrice)}
                        </span>
                        {p.soldCount > 0 && (
                          <span className="rounded-full bg-[#E22BFF]/15 px-2 py-0.5 text-[9px] font-black text-[#F79CFF] tabular-nums">
                            {p.soldCount.toLocaleString("fa-IR")} فروش
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST — patch notes grid ═══ */}
        {data.newest.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-newest">
            <Reveal>
              <HudHead id="gc-newest" icon={Activity} code="PATCH_NOTES" title="آپدیت‌های جدید" subtitle="تازه واردِ لابی" href="/products?sort=newest" />
              <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <CyberCard key={p.id} product={p} timerOn={timerOn} glowOn={glowOn} dealTarget={dealTarget} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ v30 · CONNECT — GameUp gradient banner (opens AI chat) ═══ */}
        <ConnectBand data={data} />

        {/* ═══ SHOWCASES — mission boards (global showcases + v5-f: the template's own slides) ═══ */}
        {missions.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-missions">
            <Reveal>
              <HudHead id="gc-missions" icon={Gamepad2} code="MISSION_BOARDS" title="مأموریت‌های ویژه" subtitle="پرونده‌های فروشگاه" />
              <div className="grid gap-4 md:grid-cols-2">
                {missions.map((s) => (
                  <Link
                    key={s.id}
                    href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    className={cn("gc-mission group min-h-48 sm:min-h-56", glowOn && "gc-rgb")}
                  >
                    <Image
                      src={s.image}
                      alt={s.title}
                      fill
                      sizes="(max-width: 768px) 92vw, 46vw"
                      className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#120E18] via-[#120E18]/40 to-transparent" />
                    {scanOn && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-50" />}
                    <span className="relative flex h-full min-h-[inherit] flex-col justify-end p-5">
                      <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#06B6D4]/15 px-3 py-1 font-mono text-[9.5px] font-black tracking-[.2em] text-[#67E8F9] backdrop-blur">
                        <Zap className="h-3 w-3" aria-hidden />
                        MISSION_BRIEF
                      </span>
                      <span className="text-lg font-black tracking-wide text-white">{s.title}</span>
                      {s.subtitle && <span className="mt-1.5 max-w-md text-xs leading-6 text-[#C9BEE4]">{s.subtitle}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — sponsor marquee ═══ */}
        {data.brands.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-brands">
            <Reveal>
              <HudHead id="gc-brands" icon={BadgeCheck} code="SPONSORS" title="اسپانسرهای آرنا" subtitle="برندهای هم‌تیم — همیشه آماده‌باش" />
              <div className="gc-win overflow-hidden py-3">
                <div
                  className="taj-marquee items-center gap-3 px-3 [mask-image:linear-gradient(to_left,transparent,black_4%,black_96%,transparent)]"
                  style={{ "--t-dur": "26s" } as React.CSSProperties}
                >
                  {[0, 1].map((copy) =>
                    data.brands.map((b) => (
                      <Link
                        key={`sp-${copy}-${b.id}`}
                        href={`/products?brand=${b.slug}`}
                        aria-hidden={copy === 1}
                        tabIndex={copy === 1 ? -1 : 0}
                        className="gc-sponsor"
                      >
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                          {b.logo || b.image ? (
                            <Image src={(b.logo ?? b.image)!} alt="" fill sizes="32px" className="object-cover" loading="lazy" />
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-[#E22BFF]/20 text-[11px] font-black text-[#F79CFF]">
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

        {/* ═══ FAQ — support console ═══ */}
        {data.faq.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-faq">
            <Reveal>
              <HudHead id="gc-faq" icon={HelpCircle} code="SUPPORT_CONSOLE" title="کنسول پشتیبانی" subtitle="پاسخ‌های سریع سیستم" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.faq.map((f, i) => (
                  <HudFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ v30 · FINAL CTA — giant glowing monogram band ═══ */}
        <FinalCtaBand data={data} />

        {/* ═══ EMPTY STATE ═══ */}
        {!hasAnyProduct && (
          <section className="mx-auto w-full max-w-[1360px] px-4">
            <HudWindow title="وضعیت سرور" code="BOOTING" live>
              <div className="p-16 text-center">
                <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-[#E22BFF]/50" aria-hidden />
                <h2 className="text-lg font-black tracking-wide text-white">سرور در حال بوت شدن است</h2>
                <p className="mt-2 text-sm leading-7 text-[#A79BC6]">محصولات به‌زودی آنلاین می‌شوند…</p>
              </div>
            </HudWindow>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={{ ...chrome.footer, accent: "violet" }} />
    </div>
  );
}

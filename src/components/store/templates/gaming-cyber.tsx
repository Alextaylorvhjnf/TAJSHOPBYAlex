"use client";

/**
 * TEMPLATE · gaming-cyber — «TAJ ARENA» (v32 · PRO REDESIGN)
 * ---------------------------------------------------------------------------
 * v32 = COMPLETE professional redesign (owner: old look «خیلی بچگانه» —
 * too childish). New direction = a DISCIPLINED GameUp × GTA-Vice system,
 * e-sports grade:
 *   · void #1A1527 canvas + #241E33 panels (GameUp surfaces), generous
 *     spacing, real content hierarchy, restrained color use;
 *   · ONE signature gradient purple→pink (#A855F7→#EC4899) for the hero
 *     shell, section-head underline and secondary CTAs — the old always-on
 *     rainbow conic borders are GONE (RGB identity now lives ONLY in the
 *     code-drawn rig, the 2 animated chrome hairlines and hover glows);
 *   · acid-lime #EAFF00 reserved for the primary pill CTAs + tiny chips;
 *   · green LIVE badges with pulsing dot; mono uppercase Latin codes;
 *     tabular-nums digits; upright 900 Persian display type (no skew, no
 *     italic, no rainbow clip-text headlines); scanline/grid overlays.
 *   · HEADER fully rebuilt (owner bug: nav needed horizontal swiping):
 *     ≥1024px = logo + FULL nav row (ChromeHeaderNav with the categories
 *     mega-menu trigger + zoomfade menuStyle wiring) + search + account
 *     avatar + cart + theme toggle — ALL visible at once on TWO compact
 *     rows, zero overflow-x; <1024px = hamburger drawer (search + nav +
 *     categories). Sticky, glass (blur via ::before so the fixed mega
 *     panel never gets a containing block), animated purple→pink
 *     hairline. Kill-switch for the global per-article RGB aura.
 *   · HERO keeps the v31 signature: 100% CODE-DRAWN tempered-glass ARGB
 *     tower on the animated ARGB desk mat (rings hue-cycle, BLADES never
 *     spin — owner's demand), now polished with magenta/cyan rim lights,
 *     flanked by the two generated 3D headset artworks, inside a GameUp
 *     composition (gradient shell, grid overlay, HUD corner brackets).
 *   · v5-f content keys (designed fallbacks → DEFAULT_TEMPLATE_CONTENT →
 *     literals): heroTitle/heroSubtitle/ctaLabel + NEW arenaTitle/
 *     arenaSubtitle/arenaImage, gearTitle/gearSubtitle/gearImage,
 *     dealTitle/dealSubtitle/dealImage, joinTitle/joinText/joinCtaLabel/
 *     joinCtaUrl (empty or "#chat" = open the AI copilot), aiWidgetImage.
 *     tplShowcases still override the ARGB spotlight tiles; the template's
 *     own slides still join the mission board.
 *   · Feature toggles (timer/glow/parallax/scanlines, missing = ON) and
 *     the v25 global timerEndsAt override kept; LIGHT SKIN via --g-* token
 *     vars (photo-dark panels stay dark in both skins); reduced-motion
 *     kill-switch covers EVERY loop; ≥44px touch targets; no horizontal
 *     overflow at 360px. All CSS scoped under [data-tpl="gaming-cyber"].
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { toast } from "sonner";
import {
  Activity, BadgeCheck, Check, ChevronLeft, Fan, Flame, Gamepad2,
  Headphones, HelpCircle, Keyboard, Layers, Loader2, Menu, Package, Plus,
  Radio, ShieldCheck, ShoppingBasket, Sparkles, Star, Swords, Timer,
  Trophy, Truck, Users, X, Zap,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import {
  DEFAULT_TEMPLATE_CONTENT,
  type TemplateContentData,
  type TemplateShowcase,
} from "@/lib/templates/content";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/stores";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME, type HeaderCfg } from "./chrome/config";
import {
  ACCENT_CLASSES, CHROME_ACCENTS, ChromeAccount, ChromeCart, ChromeSearch,
  ChromeThemeToggle, ChromeHeaderNav, pickEnum, resolveTickerMessages,
  type ChromeAccentClasses,
} from "./chrome/bits";

/* ══ ALL custom CSS — one plain <style> tag, scoped under [data-tpl] ══ */
const GC_CSS = `
/* ═══ tokens — dark arena (GameUp surfaces) ═══ */
[data-tpl="gaming-cyber"]{
  --g-bg:#1A1527;--g-panel:#241E33;--g-panel2:#2D2540;
  --g-line:rgba(139,92,246,.22);--g-line-strong:rgba(139,92,246,.44);
  --g-ink:#F1EDFA;--g-dim:#ABA3C8;--g-faint:#877CAE;
  --g-code:#9287BC;--g-cyan:#67E8F9;--g-pink:#EC4899;--g-hot:#F472B6;
  --g-violet:#A78BFA;--g-live:#34D399;--g-star:#FBBF24;--g-lime:#EAFF00;
  background:#1A1527;color:#F1EDFA;
}
html:not(.dark) [data-tpl="gaming-cyber"]{
  --g-bg:#F6F2FB;--g-panel:#FFFFFF;--g-panel2:#F0EAF8;
  --g-line:rgba(124,58,237,.22);--g-line-strong:rgba(124,58,237,.42);
  --g-ink:#2A1B40;--g-dim:#5E5377;--g-faint:#7A6B9E;
  --g-code:#7A6B9E;--g-cyan:#0E7490;--g-pink:#DB2777;--g-hot:#C026D3;
  --g-violet:#7C3AED;--g-live:#047857;--g-star:#B45309;
  background:#F6F2FB;color:#2A1B40;
}
[data-tpl="gaming-cyber"] .gc-root{
  position:relative;
  background:
    radial-gradient(1100px 520px at 84% -6%,rgba(168,85,247,.14),transparent 62%),
    radial-gradient(880px 460px at 4% 10%,rgba(236,72,153,.08),transparent 60%),
    radial-gradient(900px 620px at 50% 110%,rgba(34,211,238,.06),transparent 62%),
    var(--g-bg);
  color:var(--g-ink);
}
/* ═══ shared type atoms ═══ */
[data-tpl="gaming-cyber"] .gc-code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10.5px;font-weight:700;letter-spacing:.18em;color:var(--g-code);
}
[data-tpl="gaming-cyber"] .gc-code-cyan{color:var(--g-cyan)}
[data-tpl="gaming-cyber"] .gc-code-hot{color:var(--g-hot)}
/* ═══ LIVE badge (green, pulsing dot) ═══ */
[data-tpl="gaming-cyber"] .gc-live-badge{
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;padding:3px 10px;
  border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.42);
  color:var(--g-live);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:9.5px;font-weight:900;letter-spacing:.18em;
}
[data-tpl="gaming-cyber"] .gc-live-dot{width:7px;height:7px;border-radius:999px;background:#22C55E;animation:gc-live-pulse 1.8s ease-out infinite}
[data-tpl="gaming-cyber"] .gc-live-dot-sm{width:5px;height:5px}
[data-tpl="gaming-cyber"] .gc-live-badge-sm{padding:1px 7px}
@keyframes gc-live-pulse{
  0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}
  80%{box-shadow:0 0 0 9px rgba(34,197,94,0)}
  100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
}
/* ═══ HUD corner brackets ═══ */
[data-tpl="gaming-cyber"] .gc-corners{position:absolute;inset:10px;pointer-events:none;z-index:12}
[data-tpl="gaming-cyber"] .gc-corners i{position:absolute;width:16px;height:16px}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(1){top:0;right:0;border-top:2px solid rgba(103,232,249,.7);border-right:2px solid rgba(103,232,249,.7)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(2){top:0;left:0;border-top:2px solid rgba(103,232,249,.38);border-left:2px solid rgba(103,232,249,.38)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(3){bottom:0;right:0;border-bottom:2px solid rgba(103,232,249,.38);border-right:2px solid rgba(103,232,249,.38)}
[data-tpl="gaming-cyber"] .gc-corners i:nth-child(4){bottom:0;left:0;border-bottom:2px solid rgba(103,232,249,.7);border-left:2px solid rgba(103,232,249,.7)}
/* ═══ scanlines texture (feature-gated) ═══ */
[data-tpl="gaming-cyber"][data-scan="on"] .gc-scanlines{
  background:repeating-linear-gradient(0deg,rgba(103,232,249,.06) 0 1px,transparent 1px 3px);
}
/* ═══ hexagon accents ═══ */
[data-tpl="gaming-cyber"] .gc-hex{clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%)}
[data-tpl="gaming-cyber"] .gc-hex-grad{background:linear-gradient(135deg,#A855F7,#EC4899)}
/* ═══ floating window chrome ═══ */
[data-tpl="gaming-cyber"] .gc-win{
  position:relative;border-radius:16px;overflow:hidden;
  border:1px solid var(--g-line-strong);
  background:linear-gradient(180deg,var(--g-panel),var(--g-panel) 55%,var(--g-bg));
  box-shadow:0 24px 60px -34px rgba(0,0,0,.55);
}
[data-tpl="gaming-cyber"] .gc-win-bar{
  display:flex;align-items:center;gap:10px;padding:8px 14px;
  border-bottom:1px solid var(--g-line);
  background:color-mix(in srgb,var(--g-bg) 55%,var(--g-panel));
}
[data-tpl="gaming-cyber"] .gc-dots{display:inline-flex;gap:6px;flex-shrink:0}
[data-tpl="gaming-cyber"] .gc-dots i{width:8px;height:8px;border-radius:999px;display:block}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(1){background:#FF5F57}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(2){background:#FEBC2E}
[data-tpl="gaming-cyber"] .gc-dots i:nth-child(3){background:#28C840}
[data-tpl="gaming-cyber"] .gc-win-title{font-size:12.5px;font-weight:800;color:var(--g-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-tpl="gaming-cyber"] .gc-win-code{margin-inline-start:auto;flex-shrink:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.14em;color:var(--g-code)}
[data-tpl="gaming-cyber"] .gc-win-code-flush{margin-inline-start:0}
[data-tpl="gaming-cyber"] .gc-win-bar-sm{padding:6px 12px}
[data-tpl="gaming-cyber"][data-scan="on"] .gc-win-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(103,232,249,.04) 0 1px,transparent 1px 3px)}
/* ═══ buttons ═══ */
[data-tpl="gaming-cyber"] .gc-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  font-weight:800;color:#fff;cursor:pointer;
  background:linear-gradient(135deg,#A855F7 0%,#C55CF0 45%,#EC4899 120%);
  border:1px solid rgba(168,85,247,.55);
  box-shadow:0 10px 26px -14px rgba(168,85,247,.8);
  transition:filter .2s,transform .2s,box-shadow .2s;
}
[data-tpl="gaming-cyber"] .gc-btn:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 14px 32px -12px rgba(168,85,247,.95)}
[data-tpl="gaming-cyber"] .gc-btn:active{transform:translateY(0) scale(.98)}
[data-tpl="gaming-cyber"] .gc-btn:disabled{opacity:.45;pointer-events:none;filter:grayscale(.4)}
[data-tpl="gaming-cyber"] .gc-btn-ghost{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;
  height:52px;padding:0 24px;border-radius:999px;
  border:1.5px solid var(--g-line-strong);color:var(--g-ink);font-weight:800;font-size:14px;
  background:color-mix(in srgb,var(--g-panel) 55%,transparent);
  transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-btn-ghost:hover{border-color:var(--g-pink);color:var(--g-hot);box-shadow:0 0 24px -10px var(--g-pink);transform:translateY(-1px)}
[data-tpl="gaming-cyber"] .gc-btn-ghost:disabled{opacity:.45;pointer-events:none}
/* lime pill CTA — lime bg, BLACK bold text, plus-icon circle (GTA VI) */
[data-tpl="gaming-cyber"] .gc-btn-lime{
  display:inline-flex;align-items:center;gap:10px;cursor:pointer;
  height:52px;padding-inline:10px 24px;border-radius:999px;
  background:linear-gradient(180deg,#FBFF6A,#EAFF00);
  color:#0B0014;font-weight:900;font-size:14.5px;letter-spacing:-.01em;
  box-shadow:0 12px 32px -12px rgba(234,255,0,.5),0 0 22px rgba(234,255,0,.16);
  transition:transform .2s,box-shadow .2s,filter .2s;
}
[data-tpl="gaming-cyber"] .gc-btn-lime:hover{transform:translateY(-2px) scale(1.015);filter:brightness(1.05);box-shadow:0 16px 40px -12px rgba(234,255,0,.65),0 0 30px rgba(234,255,0,.24)}
[data-tpl="gaming-cyber"] .gc-btn-lime:active{transform:translateY(0) scale(.98)}
[data-tpl="gaming-cyber"] .gc-btn-lime:disabled{opacity:.45;pointer-events:none;filter:grayscale(.4)}
[data-tpl="gaming-cyber"] .gc-btn-lime-circle{
  display:grid;place-items:center;width:34px;height:34px;border-radius:999px;flex-shrink:0;
  background:#0B0014;color:#EAFF00;
}
[data-tpl="gaming-cyber"] .gc-btn-lime-sm{height:44px;padding-inline:7px 18px;font-size:12.5px;gap:7px}
[data-tpl="gaming-cyber"] .gc-btn-lime-sm .gc-btn-lime-circle{width:28px;height:28px}
/* ═══ RGB keyframes (used by rig + chrome hairlines) ═══ */
@keyframes gc-rgb-flow{to{filter:hue-rotate(360deg)}}
@keyframes gc-rgb-slide{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes gc-grad-shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes gc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
/* ═══ section head — hex icon + mono code + big title + underline ═══ */
[data-tpl="gaming-cyber"] .gc-shead{position:relative;margin-bottom:26px;padding-bottom:14px}
[data-tpl="gaming-cyber"] .gc-shead::after{
  content:"";position:absolute;bottom:0;inset-inline-start:0;height:2px;border-radius:999px;
  width:min(340px,52%);
  background:linear-gradient(90deg,#A855F7,#EC4899 55%,transparent 96%);
  opacity:.85;
}
[data-tpl="gaming-cyber"] .gc-shead-ico{
  display:grid;place-items:center;width:46px;height:50px;flex-shrink:0;
  clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);
  background:linear-gradient(135deg,#A855F7,#EC4899);
  color:#fff;box-shadow:0 10px 26px -12px rgba(168,85,247,.7);
}
[data-tpl="gaming-cyber"] .gc-shead-t{color:var(--g-ink);letter-spacing:-.01em}
[data-tpl="gaming-cyber"] .gc-shead-s{color:var(--g-dim);font-size:13px;margin-top:9px;max-width:60ch;line-height:1.9}
[data-tpl="gaming-cyber"] .gc-hex-grad{background-size:170% 170%;animation:gc-grad-shift 9s ease infinite}
/* ═══ product card ═══ */
[data-tpl="gaming-cyber"] .gc-card{
  position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
  border:1px solid var(--g-line);
  background:linear-gradient(180deg,var(--g-panel),var(--g-panel) 60%,var(--g-bg));
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-card:hover{transform:translateY(-4px);border-color:rgba(236,72,153,.5)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover{
  box-shadow:0 18px 44px -20px rgba(0,0,0,.55),0 0 26px -14px rgba(168,85,247,.55);
}
[data-tpl="gaming-cyber"] .gc-card-title{color:var(--g-ink)}
[data-tpl="gaming-cyber"] .gc-price{color:var(--g-hot);font-variant-numeric:tabular-nums}
[data-tpl="gaming-cyber"] .gc-old{color:var(--g-faint);font-variant-numeric:tabular-nums}
[data-tpl="gaming-cyber"] .gc-rating{color:var(--g-star)}
[data-tpl="gaming-cyber"] .gc-brand{color:var(--g-dim)}
/* glitch / RGB-split hover on product titles */
[data-tpl="gaming-cyber"] .gc-glitch:hover .gc-glitch-t,
[data-tpl="gaming-cyber"] .gc-glitch:focus-within .gc-glitch-t{
  animation:gc-glitch .5s steps(2,jump-none) infinite;color:var(--g-ink);
}
@keyframes gc-glitch{
  0%,100%{text-shadow:none;transform:none}
  18%{text-shadow:2px 0 rgba(236,72,153,.8),-2px 0 rgba(103,232,249,.8);transform:translateX(1px)}
  36%{text-shadow:-2px 0 rgba(168,85,247,.8),2px 0 rgba(103,232,249,.8);transform:translateX(-1px)}
  54%{text-shadow:1px 0 rgba(168,85,247,.8),-1px 0 rgba(103,232,249,.8)}
}
/* ═══ deal timer cells ═══ */
[data-tpl="gaming-cyber"] .gc-timer-cell{
  display:inline-block;min-width:30px;text-align:center;padding:1.5px 5px;border-radius:6px;
  background:rgba(103,232,249,.1);border:1px solid rgba(103,232,249,.32);color:var(--g-cyan);
  font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums;
}
[data-tpl="gaming-cyber"] .gc-timer-sep{color:rgba(103,232,249,.5);font-size:10.5px;font-weight:800}
[data-tpl="gaming-cyber"] .gc-timer-cell-lg{min-width:42px;font-size:13px;padding:3px 7px}
[data-tpl="gaming-cyber"] .gc-timer-sep-lg{font-size:13px}
[data-tpl="gaming-cyber"] .gc-timer-ended{padding:2px 10px;border-radius:999px;background:rgba(167,155,198,.14);color:var(--g-dim);font-size:10px;font-weight:800}
/* ═══ in-stock emerald tag ═══ */
[data-tpl="gaming-cyber"] .gc-stock{
  display:inline-flex;align-items:center;gap:5px;padding:2.5px 8px;border-radius:999px;
  background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.4);color:var(--g-live);
  font-size:9.5px;font-weight:800;
}
/* ═══ rank badges (hexagon leaderboard) ═══ */
[data-tpl="gaming-cyber"] .gc-rank{
  display:grid;place-items:center;width:40px;height:44px;flex-shrink:0;
  clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);
  font-size:14px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;
}
[data-tpl="gaming-cyber"] .gc-rank-1{background:linear-gradient(160deg,#EC4899,#A855F7)}
[data-tpl="gaming-cyber"] .gc-rank-2{background:linear-gradient(160deg,#A78BFA,#7C3AED)}
[data-tpl="gaming-cyber"] .gc-rank-3{background:linear-gradient(160deg,#67E8F9,#0E7490)}
[data-tpl="gaming-cyber"] .gc-rank-n{background:var(--g-panel2);color:var(--g-dim)}
/* ═══ stats tiles ═══ */
[data-tpl="gaming-cyber"] .gc-tile{
  position:relative;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;
  border:1px solid var(--g-line);
  background:linear-gradient(180deg,var(--g-panel),var(--g-bg));
}
[data-tpl="gaming-cyber"] .gc-tile-ico{
  display:grid;place-items:center;width:38px;height:38px;border-radius:10px;flex-shrink:0;
  background:rgba(168,85,247,.13);border:1px solid rgba(168,85,247,.35);color:var(--g-violet);
}
[data-tpl="gaming-cyber"] .gc-tile-v{font-size:15px;font-weight:900;color:var(--g-ink);font-variant-numeric:tabular-nums;line-height:1.15}
[data-tpl="gaming-cyber"] .gc-tile-l{font-size:10px;color:var(--g-dim);font-weight:600}
/* ═══ category hex tiles ═══ */
[data-tpl="gaming-cyber"] .gc-cat-hex{transition:transform .3s,filter .3s}
[data-tpl="gaming-cyber"] .gc-cat:hover .gc-cat-hex{transform:scale(1.06) rotate(2deg);filter:drop-shadow(0 0 14px rgba(236,72,153,.5))}
/* ═══ ARGB STAGE — product lighting (pure CSS, name-aware) ═══ */
[data-tpl="gaming-cyber"] .gc-stage{
  position:relative;
  background:radial-gradient(120% 120% at 50% 0%,var(--g-panel2) 0%,var(--g-bg) 78%);
}
/* rotating conic rainbow RING — quiet by default, wakes on hover */
[data-tpl="gaming-cyber"] .gc-argb-ring{
  position:absolute;inset:6.5%;border-radius:999px;pointer-events:none;z-index:2;
  background:conic-gradient(from 0deg,#F43F5E,#FF3EF0,#8B5CF6,#06B6D4,#10B981,#EAFF00,#FF7A00,#F43F5E);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));
  opacity:0;transition:opacity .3s;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-ring{animation:gc-spin 9s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .gc-argb-ring,
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot:hover .gc-argb-ring,
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-ring{opacity:.75;animation-duration:3s}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-ring{
  opacity:.9;filter:drop-shadow(0 0 10px rgba(255,62,240,.55));
}
/* pulsing rainbow UNDERGLOW (blurred conic ellipse under the product) */
[data-tpl="gaming-cyber"] .gc-argb-glow{
  position:absolute;left:16%;right:16%;bottom:4%;height:13%;border-radius:999px;pointer-events:none;z-index:1;
  background:conic-gradient(from 90deg,#FF3EF0,#D000FF,#06B6D4,#EAFF00,#F43F5E,#FF3EF0);
  filter:blur(16px);opacity:0;transition:opacity .3s;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .gc-argb-glow,
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot:hover .gc-argb-glow,
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-ring .gc-argb-glow{opacity:.4}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-glow{
  animation:gc-argb-pulse 3.4s ease-in-out infinite,gc-rgb-flow 6s linear infinite;
}
@keyframes gc-argb-pulse{0%,100%{transform:scale(.94)}50%{transform:scale(1.04)}}
@keyframes gc-spin{to{transform:rotate(360deg)}}
/* name-aware effects: فن→spin · کیبورد→hue · ماوس/پد→ring */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-spin{animation:gc-fan-spin 4s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .gc-fx-spin{animation-play-state:paused}
@keyframes gc-fan-spin{to{transform:rotate(360deg)}}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-hue{animation:gc-hue-breathe 3s ease-in-out infinite}
@keyframes gc-hue-breathe{
  0%,100%{filter:hue-rotate(0deg) saturate(1.05) brightness(1)}
  50%{filter:hue-rotate(75deg) saturate(1.5) brightness(1.14)}
}
/* product photos glow (ARGB spill on hover) */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card .object-contain{
  filter:drop-shadow(0 6px 18px rgba(168,85,247,.3)) drop-shadow(0 0 10px rgba(103,232,249,.2));
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-card:hover .object-contain{
  filter:drop-shadow(0 10px 26px rgba(236,72,153,.45)) drop-shadow(0 0 16px rgba(103,232,249,.3));
}
/* ═══ v32 HEADER — sticky glass, 2 full rows ≥1024, drawer below ═══ */
[data-tpl="gaming-cyber"] .gc-hdr{
  position:sticky;top:0;z-index:40;
  /* token remap so the chrome bits + mega panel ride the arena palette */
  --background:var(--g-bg);--foreground:var(--g-ink);--card:var(--g-panel);
  --border:var(--g-line);--muted:var(--g-panel2);--muted-foreground:var(--g-dim);
}
/* glass layer on ::before — backdrop-filter here (NOT on the header
   element) so the fixed mega panel never gets a containing block */
[data-tpl="gaming-cyber"] .gc-hdr::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);
  background:linear-gradient(180deg,rgba(26,21,39,.92),rgba(26,21,39,.82));
  border-bottom:1px solid var(--g-line);
}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-hdr::before{
  background:linear-gradient(180deg,rgba(246,242,251,.92),rgba(246,242,251,.84));
}
/* animated purple→pink hairline (kept RGB signature, matured) */
[data-tpl="gaming-cyber"] .gc-hdr::after{
  content:"";position:absolute;bottom:0;left:0;right:0;height:2px;pointer-events:none;
  background:linear-gradient(90deg,#A855F7,#EC4899,#A855F7,#EC4899,#A855F7);
  background-size:220% 100%;animation:gc-rgb-slide 12s linear infinite;
  opacity:.55;filter:drop-shadow(0 0 5px rgba(168,85,247,.4));
}
[data-tpl="gaming-cyber"] .gc-hdr-row2{border-top:1px solid var(--g-line)}
/* the nav strip inside the 2nd row — NO horizontal scrolling, ever */
[data-tpl="gaming-cyber"] .gc-hdr-nav nav[aria-label="منوی اصلی"]{overflow:visible}
[data-tpl="gaming-cyber"] .gc-hdr-nav nav[aria-label="منوی اصلی"] a,
[data-tpl="gaming-cyber"] .gc-hdr-nav nav[aria-label="منوی اصلی"] button{min-height:44px}
/* logo */
[data-tpl="gaming-cyber"] .gc-logo{display:flex;align-items:center;gap:10px;flex-shrink:0}
[data-tpl="gaming-cyber"] .gc-logo-mark{
  position:relative;display:grid;place-items:center;width:40px;height:44px;flex-shrink:0;
  clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);
  background:linear-gradient(135deg,#A855F7,#EC4899);
  box-shadow:0 8px 22px -10px rgba(168,85,247,.8);
}
[data-tpl="gaming-cyber"] .gc-logo-mark img{width:74%;height:74%;object-fit:cover;border-radius:4px}
[data-tpl="gaming-cyber"] .gc-logo-mono{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:900;font-size:15px;color:#fff;letter-spacing:.02em;line-height:1;
}
[data-tpl="gaming-cyber"] .gc-logo-en{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:900;font-size:13.5px;letter-spacing:.22em;line-height:1.1;
  background-image:linear-gradient(100deg,#A855F7,#EC4899);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
[data-tpl="gaming-cyber"] .gc-logo-fa{font-size:10.5px;font-weight:700;color:var(--g-dim);line-height:1.4}
/* burger */
[data-tpl="gaming-cyber"] .gc-burger{
  display:grid;place-items:center;width:44px;height:44px;border-radius:12px;flex-shrink:0;
  border:1px solid var(--g-line);background:color-mix(in srgb,var(--g-panel) 55%,transparent);
  color:var(--g-ink);cursor:pointer;transition:border-color .2s,color .2s;
}
[data-tpl="gaming-cyber"] .gc-burger:hover{border-color:var(--g-pink);color:var(--g-hot)}
/* ═══ the drawer (<1024px) ═══ */
[data-tpl="gaming-cyber"] .gc-drawer-back{
  position:fixed;inset:0;z-index:55;pointer-events:auto;
  background:rgba(11,7,18,.58);
  animation:gc-back-in .22s ease both;
}
[data-tpl="gaming-cyber"] .gc-drawer-back[data-closing="true"]{animation:gc-back-out .19s ease both}
@keyframes gc-back-in{from{opacity:0}to{opacity:1}}
@keyframes gc-back-out{from{opacity:1}to{opacity:0}}
[data-tpl="gaming-cyber"] .gc-drawer{
  position:fixed;top:0;bottom:0;inset-inline-start:0;z-index:60;
  width:min(340px,86vw);display:flex;flex-direction:column;
  background:var(--g-bg);border-inline-end:1px solid var(--g-line-strong);
  box-shadow:-30px 0 70px -30px rgba(0,0,0,.7);
  animation:gc-drawer-in .26s cubic-bezier(.2,.7,.3,1) both;
  outline:none;
}
[data-tpl="gaming-cyber"] .gc-drawer[data-closing="true"]{animation:gc-drawer-out .19s ease both}
@keyframes gc-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes gc-drawer-out{from{transform:translateX(0)}to{transform:translateX(100%)}}
[data-tpl="gaming-cyber"] .gc-drawer-head{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:14px 16px;border-bottom:1px solid var(--g-line);
  background:
    radial-gradient(300px 120px at 85% -20%,rgba(168,85,247,.22),transparent 70%),
    var(--g-panel);
}
[data-tpl="gaming-cyber"] .gc-drawer-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:18px 16px;display:flex;flex-direction:column;gap:22px}
[data-tpl="gaming-cyber"] .gc-drawer-sec{display:flex;flex-direction:column;gap:6px}
[data-tpl="gaming-cyber"] .gc-drawer-link{
  display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;
  border-radius:14px;border:1px solid transparent;color:var(--g-ink);
  font-size:14px;font-weight:800;transition:border-color .2s,background .2s,color .2s;
}
[data-tpl="gaming-cyber"] .gc-drawer-link:hover{
  border-color:var(--g-line);background:var(--g-panel2);color:var(--g-hot);
}
[data-tpl="gaming-cyber"] .gc-drawer-cat{
  display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;
  padding:0 14px;border-radius:12px;color:var(--g-dim);font-size:13px;font-weight:700;
  transition:background .2s,color .2s;
}
[data-tpl="gaming-cyber"] .gc-drawer-cat:hover{background:var(--g-panel2);color:var(--g-ink)}
[data-tpl="gaming-cyber"] .gc-drawer-close{
  display:grid;place-items:center;width:44px;height:44px;border-radius:12px;flex-shrink:0;
  border:1px solid var(--g-line);color:var(--g-ink);cursor:pointer;
  transition:border-color .2s,color .2s;
}
[data-tpl="gaming-cyber"] .gc-drawer-close:hover{border-color:var(--g-pink);color:var(--g-hot)}
/* ═══ HERO — GameUp composition, ALWAYS dark (photo-dark pattern) ═══ */
[data-tpl="gaming-cyber"] .gc-hero-shell{
  position:relative;padding:1.5px;border-radius:25px;
  background:linear-gradient(135deg,rgba(168,85,247,.75),rgba(236,72,153,.55) 45%,rgba(103,232,249,.28) 85%);
  box-shadow:0 34px 90px -50px rgba(168,85,247,.5);
}
[data-tpl="gaming-cyber"] .gc-hero{
  position:relative;overflow:hidden;border-radius:24px;
  background:#150F22;
  box-shadow:inset 0 0 60px rgba(11,8,18,.35);
}
[data-tpl="gaming-cyber"] .gc-hero-bg{
  position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(58% 48% at 78% 6%,rgba(168,85,247,.3),transparent 70%),
    radial-gradient(46% 40% at 10% 88%,rgba(236,72,153,.16),transparent 70%),
    radial-gradient(40% 34% at 55% 102%,rgba(34,211,238,.1),transparent 70%),
    linear-gradient(160deg,#1D1633 0%,#150F22 55%,#110C1C 100%);
}
[data-tpl="gaming-cyber"] .gc-hero-grid{
  position:absolute;inset:0;pointer-events:none;opacity:.55;
  background-image:
    linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:44px 44px;
  -webkit-mask-image:radial-gradient(90% 75% at 72% 16%,#000 18%,transparent 74%);
  mask-image:radial-gradient(90% 75% at 72% 16%,#000 18%,transparent 74%);
}
[data-tpl="gaming-cyber"] .gc-hero-vig{
  position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to top,rgba(11,8,18,.6),transparent 42%);
}
[data-tpl="gaming-cyber"] .gc-hero-hud{
  position:absolute;top:0;left:0;right:0;z-index:14;pointer-events:none;
  display:flex;align-items:center;gap:10px;padding:10px 16px;
  background:linear-gradient(180deg,rgba(11,8,18,.72),transparent);
}
/* vertical lime tab (GTA key-art signature, slim) */
[data-tpl="gaming-cyber"] .gc-hero-tab{
  position:absolute;left:14px;top:16%;bottom:16%;z-index:16;pointer-events:none;
  display:none;align-items:center;justify-content:center;
  writing-mode:vertical-rl;text-orientation:mixed;
  padding:18px 8px;border-radius:999px;
  background:#EAFF00;color:#0B0014;
  font-weight:900;font-size:9.5px;letter-spacing:.32em;text-transform:uppercase;
  box-shadow:0 0 26px rgba(234,255,0,.35),0 10px 24px -10px rgba(0,0,0,.6);
}
@media (min-width:1024px){
  [data-tpl="gaming-cyber"] .gc-hero-tab{display:flex}
}
[data-tpl="gaming-cyber"] .gc-hero-title{
  font-size:clamp(30px,4.6vw,54px);font-weight:900;line-height:1.22;letter-spacing:-.02em;
  color:#fff;text-wrap:balance;
}
[data-tpl="gaming-cyber"] .gc-hero-sub{margin-top:16px;max-width:34rem;font-size:14px;line-height:2;color:#C9BEE4}
@media (min-width:640px){
  [data-tpl="gaming-cyber"] .gc-hero-sub{font-size:15.5px}
}
/* hero product pod (TARGET_LOCKED) — dark glass */
[data-tpl="gaming-cyber"] .gc-pod{
  border-radius:14px;overflow:hidden;
  border:1px solid rgba(168,85,247,.35);
  background:linear-gradient(180deg,rgba(36,30,51,.72),rgba(21,15,34,.8));
  backdrop-filter:blur(8px);
}
[data-tpl="gaming-cyber"] .gc-pod-bar{
  display:flex;align-items:center;gap:8px;padding:6px 10px;
  border-bottom:1px solid rgba(168,85,247,.25);
}
/* scroll cue */
[data-tpl="gaming-cyber"] .gc-scroll-cue{
  position:absolute;bottom:10px;left:50%;transform:translateX(-50%);z-index:18;
  display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;
}
[data-tpl="gaming-cyber"] .gc-scroll-cue-txt{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:8.5px;font-weight:900;letter-spacing:.3em;color:rgba(167,155,198,.7);
}
[data-tpl="gaming-cyber"] .gc-scroll-cue-bar{position:relative;width:22px;height:15px;border-radius:999px;border:1.5px solid rgba(168,85,247,.5);overflow:hidden}
[data-tpl="gaming-cyber"] .gc-scroll-cue-bar b{
  position:absolute;left:50%;top:2px;width:4px;height:4px;margin-left:-2px;border-radius:999px;
  background:#EAFF00;box-shadow:0 0 6px rgba(234,255,0,.8);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-scroll-cue-bar b{animation:gc-cue-drop 1.8s ease-in-out infinite}
@keyframes gc-cue-drop{0%{transform:translateY(-1px);opacity:0}30%{opacity:1}70%{transform:translateY(8px);opacity:1}100%{transform:translateY(9px);opacity:0}}
/* ═══ v31 · CODE-DRAWN ARGB RIG HERO (owner's #1 ask — 100% CSS/JSX art)
   Tempered-glass tower · 5 RGB fans (rings hue-cycle with phase offsets,
   BLADES never spin) · top LED strip · PSU underglow · ARGB desk mat with
   code-drawn mouse · flanking generated 3D headset cards · v32 adds
   magenta/cyan RIM LIGHTS behind the chassis.                          */
@keyframes gc-rig-breathe{0%,100%{opacity:.3;transform:scale(.92)}50%{opacity:.62;transform:scale(1.06)}}
[data-tpl="gaming-cyber"] .gc-scene{position:relative;width:100%;height:100%}
[data-tpl="gaming-cyber"] .gc-scene-amb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(34px);opacity:.5}
[data-tpl="gaming-cyber"] .gc-scene-amb-1{top:-6%;right:-6%;width:52%;height:44%;background:radial-gradient(circle,rgba(224,43,255,.5),transparent 70%)}
[data-tpl="gaming-cyber"] .gc-scene-amb-2{bottom:2%;left:-4%;width:46%;height:38%;background:radial-gradient(circle,rgba(34,211,238,.4),transparent 70%)}
[data-tpl="gaming-cyber"] .gc-rig-shadow{position:absolute;left:24%;right:24%;bottom:13%;height:7%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.62),transparent 70%);filter:blur(6px)}
[data-tpl="gaming-cyber"] .gc-rig-reflect{position:absolute;left:35%;width:30%;bottom:8%;height:9%;border-radius:12px;background:linear-gradient(180deg,rgba(168,85,247,.3),rgba(34,211,238,.1) 55%,transparent);filter:blur(5px);opacity:.55}
/* v32 rim lights — magenta (inline-start edge) + cyan (inline-end edge) */
[data-tpl="gaming-cyber"] .gc-rig-rim-r{
  position:absolute;top:-3%;bottom:-3%;right:-6%;width:14%;border-radius:50%;pointer-events:none;
  background:linear-gradient(180deg,rgba(236,72,153,.6),rgba(168,85,247,.28));
  filter:blur(15px);
}
[data-tpl="gaming-cyber"] .gc-rig-rim-c{
  position:absolute;top:0;bottom:0;left:-6%;width:12%;border-radius:50%;pointer-events:none;
  background:linear-gradient(180deg,rgba(103,232,249,.4),rgba(34,211,238,.12));
  filter:blur(13px);
}
/* ARGB desk mat — animated edge LEDs + dot texture */
[data-tpl="gaming-cyber"] .gc-rig-mat{
  position:absolute;left:4%;right:4%;bottom:3%;height:23%;border-radius:16px;
  background:
    radial-gradient(circle at 22% 30%,rgba(236,72,153,.1),transparent 42%),
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
  opacity:.85;filter:drop-shadow(0 0 7px rgba(255,62,240,.6));
  animation:gc-rgb-flow 10s linear infinite;
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
/* the tower — perspective wrapper + dark-metal chassis */
[data-tpl="gaming-cyber"] .gc-rig-case3d{
  position:absolute;left:50%;bottom:17%;width:35%;aspect-ratio:.5;z-index:3;
  transform:translateX(-50%) perspective(950px) rotateY(8deg);
}
/* mobile — widen the tower so the fan rings/LED strip stay legible */
@media (max-width:639px){
  [data-tpl="gaming-cyber"] .gc-rig-case3d{width:38%;bottom:13%}
}
[data-tpl="gaming-cyber"] .gc-rig-frame{
  position:absolute;inset:0;border-radius:16px;overflow:hidden;
  background:linear-gradient(105deg,#26212F 0%,#15111C 42%,#1E1927 100%);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.55),
    inset 0 14px 30px -18px rgba(255,255,255,.1),
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
  background:linear-gradient(180deg,#A855F7 0%,#3A2B52 55%,#1A1226 100%);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 0 12px -2px rgba(168,85,247,.55);
}
[data-tpl="gaming-cyber"] .gc-rig-ram2{
  left:20.8%;
  background:linear-gradient(180deg,#67E8F9 0%,#274055 55%,#12202E 100%);
  box-shadow:0 0 12px -2px rgba(103,232,249,.55);
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
/* the RGB fans — rings hue-cycle with phase offsets, BLADES STATIC */
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
    repeating-conic-gradient(rgba(214,222,255,.14) 0deg 14deg,rgba(8,6,14,.3) 14deg 60deg);
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
  border:1px solid rgba(255,255,255,.2);
  background:
    linear-gradient(118deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.03) 22%,transparent 42%),
    linear-gradient(292deg,rgba(168,85,247,.13) 0%,transparent 38%);
  box-shadow:inset 0 0 26px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.16);
}
[data-tpl="gaming-cyber"] .gc-rig-glass-tint{
  position:absolute;inset:4px;border-radius:12px;pointer-events:none;z-index:8;
  background:conic-gradient(from 40deg,#F43F5E,#FF3EF0,#8B5CF6,#06B6D4,#EAFF00,#F43F5E);
  filter:blur(18px);opacity:.14;mix-blend-mode:overlay;
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-glass-tint{animation:gc-rgb-flow 7s linear infinite}
/* flanking headset showcase cards (generated 3D art) */
[data-tpl="gaming-cyber"] .gc-hs{position:absolute;width:27%;z-index:5}
[data-tpl="gaming-cyber"] .gc-hs-1{top:0;right:-1%}
[data-tpl="gaming-cyber"] .gc-hs-2{top:47%;left:-2%;width:24%}
[data-tpl="gaming-cyber"] .gc-hs-halo{position:absolute;inset:-14%;border-radius:50%;filter:blur(26px);opacity:.55;pointer-events:none}
[data-tpl="gaming-cyber"] .gc-hs-halo-pink{background:radial-gradient(circle,rgba(236,72,153,.55),transparent 70%)}
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
/* ═══ system status strip (announcement marquee) ═══ */
[data-tpl="gaming-cyber"] .gc-strip{
  position:relative;display:flex;align-items:center;gap:10px;padding:8px 12px;
  border-radius:14px;overflow:hidden;
  border:1px solid var(--g-line);
  background:linear-gradient(90deg,rgba(168,85,247,.09),rgba(236,72,153,.06),transparent);
}
[data-tpl="gaming-cyber"] .gc-strip-badge{
  flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;
  background:rgba(168,85,247,.16);border:1px solid rgba(168,85,247,.42);color:var(--g-violet);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9.5px;font-weight:900;letter-spacing:.16em;
}
[data-tpl="gaming-cyber"] .gc-strip-msg{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:.02em;font-size:12px;
  color:var(--g-dim);
}
/* ═══ «آرنا» band — editorial split (arena* keys) ═══ */
[data-tpl="gaming-cyber"] .gc-arena{
  position:relative;border-radius:22px;overflow:hidden;
  border:1px solid var(--g-line-strong);
  background:
    radial-gradient(700px 380px at 88% 8%,rgba(168,85,247,.16),transparent 60%),
    radial-gradient(560px 320px at 4% 94%,rgba(34,211,238,.08),transparent 60%),
    linear-gradient(160deg,var(--g-panel),var(--g-bg));
}
[data-tpl="gaming-cyber"] .gc-arena-grid{display:grid;gap:24px;padding:24px;align-items:center}
@media (min-width:1024px){
  [data-tpl="gaming-cyber"] .gc-arena-grid{grid-template-columns:.92fr 1.08fr;padding:32px;gap:40px}
}
[data-tpl="gaming-cyber"] .gc-arena-art{position:relative}
[data-tpl="gaming-cyber"] .gc-arena-frame{
  position:relative;aspect-ratio:4/3;border-radius:22px;overflow:hidden;z-index:1;
  border:1px solid rgba(168,85,247,.45);
  box-shadow:0 24px 60px -24px rgba(0,0,0,.85),0 0 34px -10px rgba(168,85,247,.45);
}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-arena-frame{
  box-shadow:0 24px 64px -24px rgba(0,0,0,.85),0 0 44px -10px rgba(168,85,247,.6),0 0 26px -8px rgba(103,232,249,.35);
}
[data-tpl="gaming-cyber"] .gc-arena-mascot{
  position:absolute;bottom:14px;inset-inline-start:14px;width:42%;max-width:230px;aspect-ratio:1/1;
  border-radius:20px;overflow:hidden;z-index:2;transform:rotate(-3deg);
  border:2px solid rgba(236,72,153,.6);
  box-shadow:0 18px 44px -14px rgba(0,0,0,.85),0 0 34px -8px rgba(236,72,153,.6);
  animation:gc-float 7s ease-in-out infinite;
}
/* category chips */
[data-tpl="gaming-cyber"] .gc-chip{
  display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  border:1px solid var(--g-line-strong);background:color-mix(in srgb,var(--g-panel) 60%,transparent);
  color:var(--g-ink);font-size:12.5px;font-weight:800;
  transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-chip:hover{
  border-color:var(--g-pink);color:var(--g-hot);transform:translateY(-2px);
  box-shadow:0 0 20px -8px var(--g-pink);
}
/* ═══ GEAR — wide banner + spotlight tiles + gear cards ═══ */
[data-tpl="gaming-cyber"] .gc-banner{
  position:relative;display:block;overflow:hidden;border-radius:20px;
  min-height:250px;
  border:1px solid rgba(168,85,247,.4);
  box-shadow:0 26px 70px -34px rgba(0,0,0,.9),0 0 40px -14px rgba(168,85,247,.4);
}
@media (min-width:640px){
  [data-tpl="gaming-cyber"] .gc-banner{min-height:320px}
}
[data-tpl="gaming-cyber"] .gc-banner-cta{
  display:inline-flex;align-items:center;gap:9px;cursor:pointer;
  height:48px;padding:0 22px;border-radius:999px;
  border:2px solid rgba(255,255,255,.75);color:#fff;font-weight:900;font-size:13px;
  background:rgba(255,255,255,.08);backdrop-filter:blur(6px);
  transition:background .2s,box-shadow .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-banner-cta:hover{background:rgba(255,255,255,.18);box-shadow:0 0 28px -6px rgba(255,255,255,.4);transform:translateY(-2px)}
[data-tpl="gaming-cyber"] .gc-spot{
  position:relative;display:flex;flex-direction:column;overflow:hidden;
  border-radius:20px;border:1px solid var(--g-line);
  background:linear-gradient(180deg,var(--g-panel),var(--g-bg));
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-spot:hover{transform:translateY(-4px);border-color:rgba(236,72,153,.55)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot:hover{box-shadow:0 0 0 1px rgba(236,72,153,.28),0 20px 48px -20px rgba(168,85,247,.5)}
[data-tpl="gaming-cyber"] .gc-spot-stage{
  position:relative;overflow:hidden;
  background:radial-gradient(120% 120% at 50% 0%,#241B38 0%,#0E0918 78%);
}
[data-tpl="gaming-cyber"] .gc-spot-title{font-size:15px;font-weight:900;color:var(--g-ink);letter-spacing:-.01em}
[data-tpl="gaming-cyber"] .gc-spot-sub{font-size:11.5px;line-height:1.7;color:var(--g-dim)}
[data-tpl="gaming-cyber"] .gc-spot-ico{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;flex-shrink:0;background:rgba(168,85,247,.14);color:var(--g-violet)}
[data-tpl="gaming-cyber"] .gc-spot-arrow{color:var(--g-faint);transition:color .2s}
[data-tpl="gaming-cyber"] .gc-spot:hover .gc-spot-arrow{color:var(--g-hot)}
/* spotlight tile fx: fan SPINS, keyboard hue-pulses */
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-spin{animation:gc-fan-spin 4s linear infinite}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-hue{animation:gc-hue-breathe 3s ease-in-out infinite}
/* ═══ DEAL ZONE — cinematic band + big-number blocks ═══ */
[data-tpl="gaming-cyber"] .gc-deal-zone{
  position:relative;border-radius:24px;overflow:hidden;
  border:1px solid var(--g-line-strong);
  background:
    radial-gradient(880px 440px at 90% -6%,rgba(236,72,153,.15),transparent 60%),
    radial-gradient(600px 320px at -4% 104%,rgba(234,255,0,.05),transparent 55%),
    linear-gradient(165deg,var(--g-panel),var(--g-bg));
}
[data-tpl="gaming-cyber"] .gc-deal-art{
  position:relative;overflow:hidden;border-radius:18px;
  border:1px solid rgba(236,72,153,.45);
}
[data-tpl="gaming-cyber"] .gc-deal-art-txt{position:relative;z-index:3}
[data-tpl="gaming-cyber"] .gc-deal-block{
  position:relative;display:flex;flex-direction:column;gap:10px;
  border-radius:18px;overflow:hidden;padding:14px;
  border:1px solid var(--g-line-strong);
  background:linear-gradient(180deg,var(--g-panel),var(--g-bg));
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-deal-block:hover{transform:translateY(-4px);border-color:rgba(236,72,153,.55)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-deal-block:hover{
  box-shadow:0 0 0 1px rgba(236,72,153,.25),0 20px 48px -18px rgba(168,85,247,.45);
}
[data-tpl="gaming-cyber"] .gc-deal-num{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:900;line-height:.78;
  font-size:clamp(54px,7vw,88px);
  color:transparent;-webkit-text-stroke:2.5px rgba(236,72,153,.5);
  letter-spacing:-.02em;user-select:none;
  transition:-webkit-text-stroke-color .25s;
}
[data-tpl="gaming-cyber"] .gc-deal-block:hover .gc-deal-num{-webkit-text-stroke-color:rgba(180,131,10,.65)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-block:hover .gc-deal-num{-webkit-text-stroke-color:rgba(77,124,15,.7)}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-deal-num{-webkit-text-stroke-color:rgba(124,58,237,.4)}
/* static gradient underline bar (deal blocks) */
[data-tpl="gaming-cyber"] .gc-underline{
  position:relative;height:3px;border-radius:999px;overflow:hidden;
  background:linear-gradient(90deg,#A855F7,#EC4899 60%,transparent);
  opacity:.8;
}
/* ═══ JOIN band (GameUp purple→pink gradient, join* keys) ═══ */
[data-tpl="gaming-cyber"] .gc-connect{
  position:relative;border-radius:24px;overflow:hidden;
  border:1px solid rgba(236,72,153,.45);
  background:linear-gradient(118deg,#2D1155 0%,#6D28D9 40%,#A855F7 64%,#EC4899 100%);
  box-shadow:0 30px 84px -38px rgba(168,85,247,.6),inset 0 0 90px rgba(45,17,85,.5);
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
/* ═══ mission board tiles ═══ */
[data-tpl="gaming-cyber"] .gc-mission{
  position:relative;display:block;overflow:hidden;border-radius:16px;
  border:1px solid rgba(168,85,247,.35);
  transition:transform .25s,box-shadow .25s,border-color .25s;
}
[data-tpl="gaming-cyber"] .gc-mission:hover{transform:translateY(-3px);border-color:rgba(236,72,153,.55)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-mission:hover{box-shadow:0 18px 44px -20px rgba(0,0,0,.7),0 0 30px -14px rgba(168,85,247,.55)}
[data-tpl="gaming-cyber"] .gc-legend-ring{
  position:absolute;inset:-6%;border-radius:50%;border:1.5px dashed rgba(236,72,153,.45);
  animation:gc-spin 16s linear infinite;
}
[data-tpl="gaming-cyber"] .gc-mission-chip{
  display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;
  background:rgba(11,8,18,.55);border:1px solid rgba(103,232,249,.35);color:#67E8F9;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:9px;font-weight:900;letter-spacing:.2em;backdrop-filter:blur(6px);
}
/* ═══ sponsor chips ═══ */
[data-tpl="gaming-cyber"] .gc-sponsor{
  display:inline-flex;align-items:center;gap:10px;flex-shrink:0;height:48px;padding:0 16px;border-radius:999px;
  border:1px solid var(--g-line);background:var(--g-panel);
  font-size:12px;font-weight:800;color:var(--g-ink);letter-spacing:.03em;
  transition:border-color .2s,color .2s,box-shadow .2s;
}
[data-tpl="gaming-cyber"] .gc-sponsor:hover{border-color:var(--g-cyan);color:var(--g-cyan);box-shadow:0 0 18px -8px var(--g-cyan)}
/* ═══ FAQ console ═══ */
[data-tpl="gaming-cyber"] .gc-faq-item{
  border-radius:12px;border:1px solid var(--g-line);
  background:linear-gradient(180deg,var(--g-panel),var(--g-bg));
  transition:border-color .25s,box-shadow .25s;
}
[data-tpl="gaming-cyber"] .gc-faq-item[data-open="1"]{border-color:rgba(236,72,153,.5)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-faq-item[data-open="1"]{box-shadow:0 0 26px -12px rgba(168,85,247,.55)}
[data-tpl="gaming-cyber"] .gc-qchip{
  border-radius:8px;background:rgba(168,85,247,.14);color:var(--g-violet);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:900;letter-spacing:.14em;
}
/* ═══ FINAL CTA band ═══ */
[data-tpl="gaming-cyber"] .gc-final{
  position:relative;overflow:hidden;border-radius:24px;
  border:1px solid var(--g-line-strong);
  background:
    radial-gradient(760px 420px at 50% -22%,rgba(168,85,247,.16),transparent 60%),
    linear-gradient(180deg,var(--g-panel),var(--g-bg));
}
[data-tpl="gaming-cyber"] .gc-final-mono{
  position:absolute;inset-inline-end:-2%;top:-12%;
  font-size:clamp(140px,22vw,280px);font-weight:900;line-height:1;user-select:none;pointer-events:none;
  background-image:linear-gradient(180deg,rgba(168,85,247,.3),rgba(236,72,153,.06));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 40px rgba(168,85,247,.25));
}
[data-tpl="gaming-cyber"] .gc-final-chip{
  display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;
  border:1px solid var(--g-line-strong);background:color-mix(in srgb,var(--g-panel) 60%,transparent);
  color:var(--g-dim);font-size:11.5px;font-weight:700;
  transition:border-color .2s,color .2s,transform .2s;
}
[data-tpl="gaming-cyber"] .gc-final-chip:hover{border-color:rgba(234,255,0,.5);color:var(--g-ink);transform:translateY(-2px)}
/* ═══ neon swoosh curves ═══ */
[data-tpl="gaming-cyber"] .gc-swoosh{
  position:absolute;inset-inline:-3%;bottom:5%;width:106%;height:44%;z-index:1;
  pointer-events:none;opacity:.5;
}
[data-tpl="gaming-cyber"] .gc-swoosh-flip{transform:scaleX(-1)}
[data-tpl="gaming-cyber"][data-glow="on"] .gc-swoosh{filter:drop-shadow(0 0 6px rgba(168,85,247,.5))}
/* ═══ FOOTER polish (chrome footer variant 6 + social) ═══ */
[data-tpl="gaming-cyber"] [data-chrome-footer]{position:relative}
[data-tpl="gaming-cyber"] [data-chrome-footer]::before{
  content:"";position:absolute;top:0;left:0;right:0;height:2px;z-index:5;
  background:linear-gradient(90deg,#A855F7,#EC4899,#A855F7,#EC4899,#A855F7);
  background-size:220% 100%;
  animation:gc-rgb-slide 14s linear infinite;opacity:.8;
  filter:drop-shadow(0 0 5px rgba(168,85,247,.45));
  pointer-events:none;
}
@media (min-width:768px){
  [data-tpl="gaming-cyber"] [data-chrome-footer] .grid > :not(:first-child){
    border-inline-start:1px solid rgba(139,92,246,.16);
    padding-inline-start:1.6rem;
  }
}
[data-tpl="gaming-cyber"] [data-chrome-footer] .taj-breathe{
  box-shadow:0 0 9px 1px rgba(139,92,246,.65);
}
[data-tpl="gaming-cyber"] .gc-soc{transition:transform .2s,box-shadow .2s,border-color .2s,color .2s}
[data-tpl="gaming-cyber"] .gc-soc:hover{
  transform:translateY(-2px);
  border-color:rgba(168,85,247,.75);
  box-shadow:0 0 18px -4px rgba(168,85,247,.8);
}
[data-tpl="gaming-cyber"] .gc-soc:hover,[data-tpl="gaming-cyber"] .gc-soc:hover *{color:#C4B5FD}
html:not(.dark) [data-tpl="gaming-cyber"] .gc-soc:hover,
html:not(.dark) [data-tpl="gaming-cyber"] .gc-soc:hover *{color:#7C3AED}
/* ═══ kill the global per-article RGB aura (v32 maturity pass — the
   rainbow breathing on EVERY card was the "childish" bit) ═══ */
html.dark .store-shell[data-chrome-template="gaming-cyber"] article{animation:none}
.argb-mode [data-tpl="gaming-cyber"] article{animation:none}
/* ═══ prefers-reduced-motion — EVERY loop stops (static, still colorful) ═══ */
@media (prefers-reduced-motion: reduce){
  [data-tpl="gaming-cyber"] .gc-float,
  [data-tpl="gaming-cyber"] .gc-arena-mascot,
  [data-tpl="gaming-cyber"] .gc-legend-ring,
  [data-tpl="gaming-cyber"] .gc-hex-grad,
  [data-tpl="gaming-cyber"] .gc-live-dot,
  [data-tpl="gaming-cyber"] .gc-hs-float,
  [data-tpl="gaming-cyber"] .gc-drawer,
  [data-tpl="gaming-cyber"] .gc-drawer-back,
  [data-tpl="gaming-cyber"] .gc-hdr::after,
  [data-tpl="gaming-cyber"] [data-chrome-footer]::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-ring,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-argb-glow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-spin,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-fx-hue,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-spin,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-spot-hue,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-ring,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-fan-glow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-ram,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-gpu-fx,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-led,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-underglow,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-glass-tint,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mat::before,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-rig-mouse::after,
  [data-tpl="gaming-cyber"][data-glow="on"] .gc-scroll-cue-bar b{animation:none}
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
 * target = global timerEndsAt override OR per-product discountEndsAt. */
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
    <div className="gc-shead">
      <div className="flex items-center gap-3.5">
        <span className="gc-hex gc-hex-grad gc-shead-ico" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p dir="ltr" className="gc-code text-right">{`// ${code}`}</p>
          <h2 id={id} className="gc-shead-t mt-1 flex flex-wrap items-center gap-x-2.5 text-2xl font-black sm:text-3xl">
            {href ? (
              <Link href={href} className="transition-colors hover:text-[var(--g-hot)]">
                {title}
              </Link>
            ) : (
              title
            )}
            {href && (
              <Link
                href={href}
                aria-label={`مشاهده ${title}`}
                className="grid h-6 w-6 place-items-center rounded-full bg-[rgba(168,85,247,.15)] text-[var(--g-violet)] transition-colors hover:bg-[#EC4899] hover:text-white"
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
      {subtitle && <p className="gc-shead-s">{subtitle}</p>}
    </div>
  );
}

/* ── v30 · ARGB name-aware lighting picker (pure-CSS fx classes) ───── */
function argbFx(p: TemplateProduct): { stage: string; img: string } {
  const hay = `${p.name} ${p.brand?.name ?? ""}`;
  if (/فن(?![یای])|فن\s|فن$|Fan|FAN|پنکه/i.test(hay)) return { stage: "", img: "gc-fx-spin" };
  if (/کیبورد|Keyboard|KEYBOARD/i.test(hay)) return { stage: "", img: "gc-fx-hue" };
  if (/پد\s?موس|ماوس|Mousepad|Mouse|MOUSE|موس/i.test(hay)) return { stage: "gc-fx-ring", img: "" };
  return { stage: "", img: "" };
}

/* ── ARENA product card — ARGB stage + glitch title + lime-free CTA ── */
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
      className="gc-card group"
    >
      {/* ARGB STAGE — quiet ring, wakes on hover + name-aware fx */}
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
            <span className="grid h-full place-items-center text-[rgba(168,85,247,.4)]">
              <Package className="h-12 w-12" aria-hidden />
            </span>
          )}
        </span>
        {hasDeal && (
          <span className="absolute start-3 top-3 z-20 rounded-full bg-gradient-to-l from-[#EC4899] to-[#A855F7] px-2.5 py-1 text-[10px] font-black text-white">
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
        <p className="gc-brand flex items-center gap-1.5 text-[10.5px] font-semibold">
          <BadgeCheck className="h-3.5 w-3.5 text-[var(--g-violet)]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="gc-glitch min-h-12">
          <span className="gc-glitch-t gc-card-title block text-[13px] font-bold leading-6 line-clamp-2 transition-colors group-hover:text-[var(--g-hot)]">
            {product.name}
          </span>
        </Link>
        {product.rating > 0 && (
          <span className="gc-rating flex items-center gap-1 text-[11px] font-bold">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
            {product.rating.toLocaleString("fa-IR")}
            {product.reviewCount > 0 && <span className="font-normal text-[var(--g-faint)]">({product.reviewCount.toLocaleString("fa-IR")} نظر)</span>}
          </span>
        )}

        <div className="mt-auto space-y-2 pt-1">
          {hasDeal && (
            <p className="gc-old text-[11px] leading-4 line-through">{formatPrice(product.price)}</p>
          )}
          <p className="gc-price text-sm font-black">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-medium text-[var(--g-faint)]">تومان</span>
          </p>
          {timerIso && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(103,232,249,.22)] bg-[rgba(20,15,32,.5)] px-2 py-1.5">
              <Timer className="h-3.5 w-3.5 shrink-0 text-[var(--g-cyan)]" aria-hidden />
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

/* ── v31 · RIG HERO art (owner's signature) ────────────────────────── */
const BUNNY_SRC = "/images/gaming/argb-bunny-pink.png";
const BUNNY_ALT = "هد گیمینگ ARGB صورتی با گوش‌های خرگوشی و حلقه‌های نور رنگین‌کمانی";
const TACTICAL_SRC = "/images/gaming/argb-tactical-black.png";
const TACTICAL_ALT = "هد گیمینگ تاکتیکال مشکی با نوارهای نور ARGB سبز و کهربایی";

/* one RGB fan — conic rainbow ring hue-cycles on a per-fan phase offset,
 * blurred glow breathes behind; the BLADES are static by design. */
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
 * PSU underglow, ambient RGB glass tint + v32 magenta/cyan rim lights. */
function RigCase() {
  return (
    <div className="gc-rig-case3d" aria-hidden>
      <span className="gc-rig-underglow" />
      <span className="gc-rig-rim-r" />
      <span className="gc-rig-rim-c" />
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

/* flanking headset showcase card — generated 3D art in a floating frame. */
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

/* ═══ v32 · GAMING HEADER — rebuilt (owner bug: nav needed swiping) ══
 * ≥1024px: logo + search + avatar + cart + theme toggle on row 1 and the
 * FULL nav row (ChromeHeaderNav → mega-menu trigger + zoomfade style)
 * on row 2 — everything visible at once, zero overflow-x. <1024px: the
 * burger opens a drawer with search + nav links + categories. Sticky
 * glass header (blur on ::before so the fixed mega panel never gets a
 * containing block) + animated purple→pink hairline. Admin overrides
 * (chromeOverridesMap) honored for search/account/cart/theme/megaMenu. */
function GamingHeader({ data, cfg }: { data: HomeData; cfg: HeaderCfg }) {
  const ov = cfg.id ? data.store.chromeOverridesMap?.[cfg.id]?.header : undefined;
  const showSearch = (ov?.showSearch ?? cfg.showSearch) !== false;
  const showAccount = (ov?.showAccount ?? cfg.showAccount) !== false;
  const showCart = (ov?.showCart ?? cfg.showCart) !== false;
  const showThemeToggle = (ov?.showThemeToggle ?? cfg.showThemeToggle) !== false;
  const megaMenu = ov?.megaMenu ?? cfg.megaMenu ?? true;
  const accent = pickEnum(CHROME_ACCENTS, ov?.accent, "violet") ?? "violet";
  const a: ChromeAccentClasses = ACCENT_CLASSES[accent];

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 190);
  }, [closing]);

  /* scroll-lock + ESC + focus management while the drawer is open */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      burgerRef.current?.focus();
    };
  }, [open, close]);

  /* any route change hard-closes the drawer — render-time adjustment (the
   * sanctioned adjust-state-when-prop-changes pattern, same as
   * ChromeHeaderNav) so a pending drawer never survives navigation. */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setClosing(false);
  }

  const about = (data.infoLinks ?? []).find((l) => l.slug === "about");
  const en = (data.store.storeNameEn || "TAJ").toUpperCase();

  return (
    <>
      {/* NOTE: deliberately NO data-chrome-header attr — the global argb-mode
          rules target [data-chrome-header]::before and would fight this
          header's own glass layer; this header owns its hairline instead. */}
      <header className="gc-hdr w-full">
        <div className="mx-auto w-full max-w-[1360px] px-4">
          {/* ROW 1 — logo + search + account + cart + theme (all at once) */}
          <div className="flex h-[62px] items-center gap-3">
            <button
              ref={burgerRef}
              type="button"
              className="gc-burger lg:hidden"
              aria-label={open ? "بستن منو" : "باز کردن منو"}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="gc-logo">
              <span className="gc-logo-mark" aria-hidden>
                {data.store.logo ? (
                  <img src={data.store.logo} alt="" />
                ) : (
                  <span className="gc-logo-mono">{en.charAt(0)}</span>
                )}
              </span>
              <span className="flex flex-col leading-none">
                <span dir="ltr" className="gc-logo-en">{en}</span>
                <span className="gc-logo-fa mt-1 hidden sm:block">{data.store.storeName}</span>
              </span>
            </Link>
            {showSearch && (
              <div className="hidden min-w-0 flex-1 lg:block">
                <ChromeSearch mode="wide" a={a} className="h-11" />
              </div>
            )}
            <div className={cn("flex items-center gap-2", showSearch ? "ms-auto lg:ms-0" : "ms-auto")}>
              {showAccount && <ChromeAccount a={a} />}
              {showCart && <ChromeCart a={a} cartStyle={cfg.cartStyle} />}
              {showThemeToggle && <ChromeThemeToggle a={a} />}
            </div>
          </div>
          {/* ROW 2 — the FULL nav row (never overflows: ~420px content in ≥992px) */}
          <div className="gc-hdr-row2 hidden items-center py-0.5 lg:flex">
            <ChromeHeaderNav
              data={data}
              a={a}
              showCategories={megaMenu}
              menuStyle={cfg.menuStyle}
              className="gc-hdr-nav w-full"
            />
          </div>
        </div>
      </header>

      {/* DRAWER (<1024px) — search + primary links + categories */}
      {open && (
        <>
          <div
            className="gc-drawer-back"
            data-closing={closing ? "true" : undefined}
            onClick={close}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="منوی فروشگاه"
            tabIndex={-1}
            className="gc-drawer"
            data-closing={closing ? "true" : undefined}
          >
            <div className="gc-drawer-head">
              <span className="gc-logo">
                <span className="gc-logo-mark" aria-hidden>
                  {data.store.logo ? (
                    <img src={data.store.logo} alt="" />
                  ) : (
                    <span className="gc-logo-mono">{en.charAt(0)}</span>
                  )}
                </span>
                <span className="flex flex-col leading-none">
                  <span dir="ltr" className="gc-logo-en">{en}</span>
                  <span className="gc-logo-fa mt-1">{data.store.storeName}</span>
                </span>
              </span>
              <button type="button" className="gc-drawer-close" onClick={close} aria-label="بستن منو">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="gc-drawer-body">
              {showSearch && <ChromeSearch mode="wide" a={a} className="h-11" />}
              <nav className="gc-drawer-sec" aria-label="منوی اصلی">
                <p dir="ltr" className="gc-code text-right">{`// MAIN_MENU`}</p>
                <Link href="/" onClick={close} className="gc-drawer-link">
                  <Gamepad2 className="h-4.5 w-4.5 text-[var(--g-violet)]" aria-hidden />
                  خانه
                  <ChevronLeft className="ms-auto h-4 w-4 text-[var(--g-faint)]" aria-hidden />
                </Link>
                <Link href="/products" onClick={close} className="gc-drawer-link">
                  <Layers className="h-4.5 w-4.5 text-[var(--g-violet)]" aria-hidden />
                  فروشگاه
                  <ChevronLeft className="ms-auto h-4 w-4 text-[var(--g-faint)]" aria-hidden />
                </Link>
                {about && (
                  <Link href={`/info/${about.slug}`} onClick={close} className="gc-drawer-link">
                    <BadgeCheck className="h-4.5 w-4.5 text-[var(--g-violet)]" aria-hidden />
                    {about.title}
                    <ChevronLeft className="ms-auto h-4 w-4 text-[var(--g-faint)]" aria-hidden />
                  </Link>
                )}
                <Link href="/contact" onClick={close} className="gc-drawer-link">
                  <Radio className="h-4.5 w-4.5 text-[var(--g-violet)]" aria-hidden />
                  تماس با ما
                  <ChevronLeft className="ms-auto h-4 w-4 text-[var(--g-faint)]" aria-hidden />
                </Link>
                <Link href="/products?discount=1" onClick={close} className="gc-drawer-link">
                  <Flame className="h-4.5 w-4.5 text-[var(--g-hot)]" aria-hidden />
                  تخفیف‌ها
                  <ChevronLeft className="ms-auto h-4 w-4 text-[var(--g-faint)]" aria-hidden />
                </Link>
              </nav>
              {data.categories.length > 0 && (
                <div className="gc-drawer-sec">
                  <p dir="ltr" className="gc-code text-right">{`// CATEGORIES`}</p>
                  <nav aria-label="دسته‌بندی‌ها">
                    {data.categories.slice(0, 10).map((c) => (
                      <Link key={c.id} href={`/products?category=${c.slug}`} onClick={close} className="gc-drawer-cat">
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-[var(--g-faint)]">
                          {c.productCount.toLocaleString("fa-IR")} کالا
                        </span>
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
              <Link href="/products" onClick={close} className="gc-btn-lime w-full">
                <span className="gc-btn-lime-circle" aria-hidden>
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </span>
                شروع خرید
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── HERO — GameUp composition around the code-drawn rig scene ────── */
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

  /* v5-f: this template's OWN content — hero copy + CTA label + extra link
   * chips override the designed defaults (saved → DEFAULT → literal). */
  const tpl: TemplateContentData = data.templateContent ?? {};
  const texts = tpl.texts ?? {};
  const defaults = DEFAULT_TEMPLATE_CONTENT["gaming-cyber"]?.texts ?? {};
  const T = (k: string, fb: string) => texts[k]?.trim() || defaults[k]?.trim() || fb;
  const heroTitle = T("heroTitle", "آرنای خرید گیمرهای حرفه‌ای");
  const heroSubtitle =
    T("heroSubtitle", tpl.brand?.tagline?.trim() || "ریگ ARGB رویایی‌ات را همین‌جا بچین — کیس شیشه‌ای، فن‌های نورانی و کارت گرافیک قدرتمند؛ با قیمت رقابتی و ارسال سریع.");
  const ctaLabel = T("ctaLabel", "ورود به آرنا");
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
      {/* static purple→pink gradient shell (matured RGB signature) */}
      <div className="gc-hero-shell">
        <div className="gc-hero">
          {/* dark studio ambience — stays dark in both skins so the rig pops */}
          <div aria-hidden className="gc-hero-bg" />
          <div aria-hidden className="gc-hero-grid" />
          <div aria-hidden className="gc-hero-vig" />

          {/* retro scanlines */}
          {scan && <div aria-hidden className="gc-scanlines absolute inset-0 z-10" />}

          {/* HUD frame: corner brackets + top hud bar + vertical lime tab */}
          <Corners />
          <span aria-hidden dir="ltr" className="gc-hero-tab">Welcome to the Arena</span>
          <div aria-hidden className="gc-hero-hud">
            <span className="gc-dots">
              <i /><i /><i />
            </span>
            <span dir="ltr" className="gc-code gc-code-cyan">TAJ://RIG_ARENA</span>
            <span dir="ltr" className="ms-auto gc-code">RGB_ONLINE</span>
            <span className="gc-live-badge">
              <i className="gc-live-dot" aria-hidden />
              LIVE
            </span>
          </div>

          {/* text (inline-start / physical right in RTL) + rig scene (left) */}
          <div className="relative z-20 grid gap-6 p-6 pb-14 pt-12 sm:p-9 sm:pb-16 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:gap-2 lg:p-10 xl:gap-6">
            <motion.div style={{ x: par ? uiX : 0 }}>
              <p dir="ltr" className="gc-code gc-code-hot text-right">{`// PRO_GEAR · ${glow ? "RGB_ENABLED" : "RGB_STANDBY"}`}</p>
              <h2 className="gc-hero-title mt-3 max-w-2xl">{heroTitle}</h2>
              <p className="gc-hero-sub">{heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link href="/products" className="gc-btn-lime">
                  <span className="gc-btn-lime-circle" aria-hidden>
                    <Plus className="h-5 w-5" strokeWidth={3} />
                  </span>
                  {ctaLabel}
                </Link>
                <Link href="/products?discount=1" className="gc-btn-ghost">
                  <Flame className="h-4.5 w-4.5 text-[var(--g-cyan)]" aria-hidden />
                  پیشنهادهای شگفت‌انگیز
                </Link>
                {/* v5-f: the template's own links render as extra ghost CTAs */}
                {tplLinks.map((l) => (
                  <Link key={`${l.label}-${l.url}`} href={l.url} className="gc-btn-ghost">
                    <Zap className="h-4.5 w-4.5 text-[var(--g-cyan)]" aria-hidden />
                    {l.label}
                  </Link>
                ))}
              </div>

              {/* floating product pod — TARGET_LOCKED glass row under the CTAs */}
              {heroProduct && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-8 hidden max-w-[320px] lg:block"
                >
                  <div className={cn("gc-pod", glow && "shadow-[0_0_30px_-12px_rgba(168,85,247,.6)]")}>
                    <div className="gc-pod-bar">
                      <span className="gc-dots" aria-hidden>
                        <i /><i /><i />
                      </span>
                      <span dir="ltr" className="gc-code">TARGET_LOCKED</span>
                      <span className="gc-live-badge gc-live-badge-sm">
                        <i className="gc-live-dot gc-live-dot-sm" aria-hidden />
                        HOT
                      </span>
                    </div>
                    <Link href={`/products/${heroProduct.slug}`} className="flex items-center gap-3 p-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[rgba(18,12,30,.7)] p-1">
                        {heroProduct.mainImage ? (
                          <Image src={heroProduct.mainImage} alt={heroProduct.name} fill sizes="64px" className="object-contain p-1" />
                        ) : (
                          <Package className="m-auto h-6 w-6 text-[#A855F7]" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-black text-white">{heroProduct.name}</span>
                        <span className="mt-0.5 block text-[13px] font-black text-[#67E8F9] tabular-nums">
                          {formatPrice(heroProduct.discountPrice ?? heroProduct.price)}
                          <span className="text-[9px] font-medium text-[#A79BC6]"> تومان</span>
                        </span>
                      </span>
                      <Zap className="h-4 w-4 shrink-0 text-[#67E8F9]" aria-hidden />
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

/* ── neon swoosh — thin gradient SVG curves sweeping behind ──────── */
const SWOOSH_STOPS: Record<"purple" | "vice", Array<[number, string, number]>> = {
  vice: [[0, "#EC4899", 0], [0.45, "#A855F7", 0.85], [0.75, "#EAFF00", 0.3], [1, "#EAFF00", 0]],
  purple: [[0, "#A855F7", 0], [0.45, "#A855F7", 0.9], [0.75, "#EC4899", 0.5], [1, "#EC4899", 0]],
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

/* ── system status strip (announcement / ticker marquee) ──────────── */
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
                <span key={`${copy}-${i}`} aria-hidden={copy === 1} className="gc-strip-msg flex shrink-0 items-center gap-3">
                  {m.link ? (
                    <Link href={m.link} className="transition-colors hover:text-[var(--g-cyan)]">
                      {m.text}
                    </Link>
                  ) : (
                    m.text
                  )}
                  <span className="text-[var(--g-faint)]" aria-hidden>◆</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ accordion item (support console) ─────────────────────────── */
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
        <span dir="ltr" className="gc-qchip shrink-0 px-2 py-1">
          {`Q${String(n + 1).padStart(2, "0")}`}
        </span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-[var(--g-ink)]">{h}</span>
        <ChevronLeft
          className={cn("h-4 w-4 shrink-0 text-[var(--g-dim)] transition-transform duration-300", open && "-rotate-90")}
          aria-hidden
        />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="border-t border-dashed border-[rgba(124,58,237,.2)] px-4 pb-4 pt-3 text-[12.5px] leading-7 text-[var(--g-dim)]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ── «آرنا» band — editorial split (arenaTitle/arenaSubtitle/arenaImage) */
function ArenaBand({ data, scan }: { data: HomeData; scan: boolean }) {
  const texts = data.templateContent?.texts ?? {};
  const defaults = DEFAULT_TEMPLATE_CONTENT["gaming-cyber"]?.texts ?? {};
  const T = (k: string, fb: string) => texts[k]?.trim() || defaults[k]?.trim() || fb;
  const title = T("arenaTitle", "اسطوره‌های آرنا");
  const subtitle = T("arenaSubtitle", "کلکسیون گیمینگ تاج — با نور ARGB مثل هیچ‌جای دیگر");
  const image = T("arenaImage", "/images/gaming/anime-rig.png");

  const muse = data.brands.find((b) => b.slug === "muse");
  const chips = ["keyboard", "mouse", "pc-parts", "headphones", "monitor"].flatMap((slug) => {
    const c = data.categories.find((x) => x.slug === slug);
    return c ? [c] : [];
  });
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-arena">
      <Reveal>
        <HudHead id="gc-arena" icon={Swords} code="ARENA_LEGENDS" title={title} subtitle={subtitle} />
        <div className="gc-arena">
          {scan && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-40" />}
          <Corners />
          <Swoosh className="z-[1]" />
          <div className="gc-arena-grid">
            {/* art column — arenaImage frame + floating mascot card */}
            <div className="gc-arena-art">
              <div className="gc-arena-frame">
                <Image
                  src={image}
                  alt="دختر گیمر انیمه‌ای تکیه داده به کیس ARGB درخشان — کلکسیون آرنا"
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
            <div className="relative z-[2] min-w-0">
              <p dir="ltr" className="gc-code gc-code-hot text-right">{`//${muse ? " BRAND=MUSE ·" : ""} ARGB_COLLECTION`}</p>
              <h3 className="mt-2.5 text-2xl font-black leading-10 text-[var(--g-ink)] sm:text-3xl">
                کلکسیون گیمینگ با نور ARGB — مثل هیچ‌جای دیگر
              </h3>
              <p className="mt-4 text-[13.5px] leading-8 text-[var(--g-dim)]">
                از کیبورد مکانیکال و کیس شیشه‌ای MUSE تا صندلی RGB و مانیتور منحنی ۱۶۵ هرتز؛
                همه‌چیز برای ساختن ریگی که در تاریکی می‌درخشد و در آرنا حکومت می‌کند.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
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
              <div className="mt-7">
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

/* ─ـ GEAR / ARGB showcase — gearTitle/gearSubtitle/gearImage + tpl
 * showcase override + spot tiles + real catalog gear cards ── */
function GearShowcase({
  data, gear, timerOn, glow, dealTarget, tplShowcases,
}: {
  data: HomeData;
  gear: TemplateProduct[];
  timerOn: boolean;
  glow: boolean;
  dealTarget: string | null;
  /** v5-f: the template's OWN showcase entries — when non-empty they
   *  replace the designed spotlight tiles (admin image/title/link win). */
  tplShowcases?: TemplateShowcase[];
}) {
  const texts = data.templateContent?.texts ?? {};
  const defaults = DEFAULT_TEMPLATE_CONTENT["gaming-cyber"]?.texts ?? {};
  const T = (k: string, fb: string) => texts[k]?.trim() || defaults[k]?.trim() || fb;
  const title = T("gearTitle", "تجهیزات ARGB");
  const subtitle = T("gearSubtitle", "نور آرین‌کمانی روی میز گیمینگ شما — کیبورد، کیس، ماوس‌پد، صندلی و…");
  const image = T("gearImage", "/images/gaming/argb-rig.png");

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
      src: BUNNY_SRC, alt: BUNNY_ALT,
      icon: Headphones, title: "هد ARGB صورتی", sub: "گوش خرگوشی + حلقه‌های نور رقصان", href: "/products?q=هدفون", fx: "gc-spot-hue",
    },
    {
      src: TACTICAL_SRC, alt: TACTICAL_ALT,
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
          title={title}
          href="/products?brand=muse"
          live
          subtitle={subtitle}
        />
        {/* wide gear banner (gearImage — photo stays dark in both skins) */}
        <Link href="/products?brand=muse" className="gc-banner group" aria-label="ریگ ARGB مکانی — مشاهده تجهیزات">
          <Image
            src={image}
            alt="ریگ گیمینگ ARGB با شش فن نورانی و نورپردازی آرین‌کمانی"
            fill
            sizes="(max-width: 640px) 92vw, 1360px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <Swoosh className="z-[2]" />
          <span aria-hidden className="absolute inset-0 z-[3] bg-gradient-to-l from-[#0B0014]/95 via-[#0B0014]/55 to-transparent" />
          <span className="relative z-[4] flex h-full min-h-[inherit] flex-col justify-end p-6 sm:p-8">
            <span dir="ltr" className="gc-code gc-code-cyan mb-3 w-fit rounded-full border border-[rgba(103,232,249,.3)] bg-[rgba(11,8,18,.5)] px-3 py-1.5 backdrop-blur">
              LIVE ARGB
            </span>
            <span className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              ریگ ARGB رویایی‌ات، همین‌جاست
            </span>
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
            <Link key={s.title} href={s.href} className="gc-spot group">
              <div className="gc-spot-stage relative aspect-square overflow-hidden sm:aspect-[16/9]">
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

/* ── GTA big-number DEAL BLOCK — outlined ۰۱/۰۲ numeral + timer ──── */
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
    <article className="gc-deal-block" aria-label={`تخفیف ${product.name}`}>
      {/* content first (inline-start in RTL) … numeral pinned inline-end */}
      <div className="relative z-10 flex items-start gap-4">
        <Link href={`/products/${product.slug}`} className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[rgba(20,15,32,.55)]" aria-hidden>
          {product.mainImage ? (
            <Image src={product.mainImage} alt="" fill sizes="80px" className="object-contain p-2" loading="lazy" />
          ) : (
            <Package className="absolute inset-0 m-auto h-8 w-8 text-[rgba(168,85,247,.5)]" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="gc-brand flex items-center gap-1.5 text-[10.5px] font-semibold">
            <BadgeCheck className="h-3.5 w-3.5 text-[var(--g-violet)]" aria-hidden />
            {product.brand.name}
          </p>
          <Link href={`/products/${product.slug}`} className="gc-glitch mt-1 block">
            <span className="gc-glitch-t block text-lg font-black leading-8 text-[var(--g-ink)] line-clamp-2 transition-colors hover:text-[var(--g-hot)]">
              {product.name}
            </span>
          </Link>
          {hasDeal && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#EC4899] to-[#A855F7] px-2.5 py-0.5 text-[10px] font-black text-white">
              {product.discountPercent.toLocaleString("fa-IR")}٪ OFF
            </span>
          )}
        </div>
      </div>

      <span aria-hidden className="gc-deal-num pointer-events-none absolute end-3 top-2 z-0">{num}</span>

      {/* price + timer */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {hasDeal && product.price > product.effectivePrice && (
            <p className="gc-old text-[11.5px] leading-4 line-through">{formatPrice(product.price)}</p>
          )}
          <p className="gc-price text-xl font-black">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-medium text-[var(--g-faint)]">تومان</span>
          </p>
        </div>
        {timerIso && (
          <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(103,232,249,.22)] bg-[rgba(20,15,32,.5)] px-2 py-1.5">
            <Timer className="h-3.5 w-3.5 shrink-0 text-[var(--g-cyan)]" aria-hidden />
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
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgba(124,58,237,.4)] text-[var(--g-violet)] transition-colors hover:border-[var(--g-pink)] hover:text-[var(--g-hot)]"
          aria-label={`مشاهده ${product.name}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <span aria-hidden className="gc-underline block" />
    </article>
  );
}

/* ── DEAL ZONE — cinematic band (dealTitle/dealSubtitle/dealImage)
 * + global countdown + numbered deal blocks. Data = data.discounted. ── */
function DealZone({
  data, deals, timerOn, dealTarget, glow, scan,
}: {
  data: HomeData;
  deals: TemplateProduct[];
  timerOn: boolean;
  dealTarget: string | null;
  glow: boolean;
  scan: boolean;
}) {
  if (deals.length === 0) return null;
  const texts = data.templateContent?.texts ?? {};
  const defaults = DEFAULT_TEMPLATE_CONTENT["gaming-cyber"]?.texts ?? {};
  const T = (k: string, fb: string) => texts[k]?.trim() || defaults[k]?.trim() || fb;
  const timerSub = timerOn ? (dealTarget ? "شمارش معکوس سراسری تخفیف‌ها فعال است" : "تایمر که صفر شود، تخفیف می‌سوزد") : "تخفیف‌های داغ آرنا";
  const title = T("dealTitle", "منطقه تخفیف");
  const subtitle = T("dealSubtitle", timerSub);
  const image = T("dealImage", "/images/gaming/vice-girl.png");

  const globalIso = timerOn ? (dealTarget ?? deals[0].discountEndsAt ?? null) : null;
  const maxOff = Math.max(...deals.map((p) => p.discountPercent), 0);
  const art = (
    <>
      <Image
        src={image}
        alt="دختر انیمه‌ای وسترن کنار سوپرکار نئونی — منطقه تخفیف آرنا"
        fill
        sizes="(max-width: 1024px) 92vw, 420px"
        className="object-cover"
        loading="lazy"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B0014]/95 via-[#0B0014]/35 to-[rgba(168,85,247,.22)]" />
    </>
  );
  const artContent = (
    <div className="gc-deal-art-txt flex h-full flex-col justify-between gap-4 p-5">
      <span dir="ltr" className="w-fit rounded-full bg-[#EAFF00] px-3.5 py-1.5 font-mono text-[9.5px] font-black tracking-[.22em] text-[#0B0014]">
        DEAL ZONE
      </span>
      <div>
        <p dir="ltr" className="gc-code gc-code-cyan mb-2">{`// FLASH_SALE · MAX_${maxOff.toLocaleString("fa-IR")}OFF`}</p>
        <p className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">تخفیف می‌سوزه</p>
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
          title={title}
          href="/products?discount=1"
          live={timerOn}
          subtitle={subtitle}
        />
        <div className="gc-deal-zone">
          <Swoosh variant="vice" className="z-0" />
          {scan && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-35" />}
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

/* ── JOIN band — «به آرنای تاج بپیوندید» copilot/AI (join* keys) ────
 * joinCtaUrl empty or "#chat" (the designed default) opens the AI chat
 * widget; any other value renders a Link. aiWidgetImage = side art.    */
function JoinBand({ data }: { data: HomeData }) {
  const texts = data.templateContent?.texts ?? {};
  const defaults = DEFAULT_TEMPLATE_CONTENT["gaming-cyber"]?.texts ?? {};
  const T = (k: string, fb: string) => texts[k]?.trim() || defaults[k]?.trim() || fb;
  const firstName = (data.store.storeName ?? "آرنا").trim().split(/\s+/)[0] || "آرنا";
  const title = T("joinTitle", `به آرنای ${firstName} بپیوند`);
  const body = T("joinText", "کوپایلوت هوشمند تاج به انبار و قیمت‌های واقعی وصل است؛ ریگ کامل بچین، تجهیزات را مقایسه کن یا سفارشت را پیگیری کن — همه با یک چت، ۲۴ ساعته.");
  const ctaLabel = T("joinCtaLabel", "شروع چت با کوپایلوت");
  const ctaUrlRaw = T("joinCtaUrl", "");
  const aiImage = T("aiWidgetImage", "/images/gaming/stream-girl.png");
  const chatDefault = ctaUrlRaw === "" || ctaUrlRaw === "#chat";

  const cta = (
    <>
      <Sparkles className="h-4.5 w-4.5" aria-hidden />
      {ctaLabel}
    </>
  );

  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-join">
      <Reveal>
        <div className="gc-connect">
          <Swoosh className="z-[2]" />
          <div className="relative z-[3] grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* copy + CTA (inline-start / physical right in RTL) */}
            <div className="p-6 sm:p-9">
              <div className="flex items-center gap-3.5">
                <span className="gc-hex gc-hex-grad grid h-11 w-12 shrink-0 place-items-center" aria-hidden>
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p dir="ltr" className="gc-code text-right text-[#E9D5FF]">{"// AI_COPILOT · JOIN"}</p>
                  <h2 id="gc-join" className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
                </div>
              </div>
              <p className="mt-4 max-w-lg text-[13.5px] leading-8 text-[#F3E8FF]">
                {body}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  { icon: Zap, t: "جستجوی هوشمند" }, { icon: Trophy, t: "مقایسه تجهیزات" }, { icon: Activity, t: "پیگیری سفارش" },
                ].map((f) => (
                  <span key={f.t} className="gc-connect-chip"><f.icon className="h-3.5 w-3.5" aria-hidden />{f.t}</span>
                ))}
              </div>
              <div className="mt-6">
                {chatDefault ? (
                  <button
                    type="button"
                    onClick={() => useChatStore.getState().setOpen(true)}
                    className="gc-connect-cta"
                  >
                    {cta}
                  </button>
                ) : (
                  <Link href={ctaUrlRaw} className="gc-connect-cta">
                    {cta}
                  </Link>
                )}
              </div>
            </div>
            {/* aiWidgetImage — the AI copilot art, fading into the gradient */}
            <div className="relative hidden h-full min-h-[300px] lg:block" aria-hidden>
              <Image
                src={aiImage}
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

/* ── FINAL CTA band — gradient monogram + lime CTA before footer ──── */
function FinalCtaBand({ data }: { data: HomeData }) {
  const mono = (data.store.storeName ?? "T").trim().charAt(0) || "T";
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-final">
      <Reveal>
        <div className="gc-final px-6 pb-10 pt-9 text-center sm:pb-12 sm:pt-11">
          <Swoosh flip className="z-0" />
          <Corners />
          <span aria-hidden className="gc-final-mono">{mono}</span>
          <p dir="ltr" className="gc-code relative z-[2] tracking-[.3em]">{(data.store.storeNameEn || "TAJ").toUpperCase()}</p>
          <h2 id="gc-final" className="relative z-[2] mt-4 text-2xl font-black tracking-tight text-[var(--g-ink)] sm:text-4xl">آرنا منتظرته</h2>
          <p className="relative z-[2] mx-auto mt-3 max-w-xl text-[13px] leading-8 text-[var(--g-dim)]">
            تجهیزات ARGB، ریگ‌های رویایی و تخفیف‌های داغ — یک کلیک تا میز گیمینگ رویایی‌ات فاصله داری.
          </p>
          <div className="relative z-[2] mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/products" className="gc-btn-lime">
              <span className="gc-btn-lime-circle" aria-hidden>
                <Plus className="h-5 w-5" strokeWidth={3} />
              </span>
              شروع خرید
            </Link>
          </div>
          <div className="relative z-[2] mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { icon: ShieldCheck, t: "ضمانت اصالت کالا" }, { icon: Truck, t: "ارسال سریع به سراسر ایران" },
              { icon: Headphones, t: "پشتیبانی ۲۴/۷" }, { icon: Gamepad2, t: "تجهیزات ARGB اورجینال" },
            ].map((c) => (
              <span key={c.t} className="gc-final-chip">
                <c.icon className="h-4 w-4 text-[var(--g-violet)]" aria-hidden />
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

  /* v5-f: mission-board tiles — the template's OWN slides join the boards;
   * when the template carries its own SHOWCASES they already star in the
   * ARGB spotlight tiles above, so the (already-swapped) showcase row
   * steps aside to avoid the same art twice. */
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
      <GamingHeader data={data} cfg={chrome.header} />
      <h1 className="sr-only">{`${data.store.storeName} — گیمینگ و سایبر`}</h1>

      <div className="gc-root w-full space-y-14 pb-14 sm:space-y-16">
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

        {/* ═══ HERO — TAJ ARENA rig scene (code-drawn ARGB tower) ═══ */}
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
                  <span dir="ltr" className="gc-code ms-auto hidden sm:block">
                    {s.code}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═CATEGORY RAIL — hex tiles ═══ */}
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
                    className="gc-cat w-32 shrink-0 snap-start rounded-xl p-2 text-center transition-colors hover:bg-[var(--g-panel2)] sm:w-36"
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
                          <Gamepad2 className="mx-auto h-8 w-8 text-[#A855F7]" aria-hidden />
                        )}
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-black text-[var(--g-ink)]">{c.name}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-[var(--g-dim)] tabular-nums">
                      {c.productCount.toLocaleString("fa-IR")} کالا
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ARENA — اسطوره‌های آرنا (arena* keys) ═══ */}
        <ArenaBand data={data} scan={scanOn} />

        {/* ═══ GEAR — تجهیزات ARGB (gear* keys + tplShowcases) ═══ */}
        {(argbGear.length > 0 || (data.templateContent?.showcases?.length ?? 0) > 0) && (
          <GearShowcase
            data={data}
            gear={argbGear}
            timerOn={timerOn}
            glow={glowOn}
            dealTarget={dealTarget}
            tplShowcases={data.templateContent?.showcases}
          />
        )}

        {/* ═══ DEAL ZONE — GTA big-number blocks (deal* keys) ═══ */}
        {deals.length > 0 && (
          <DealZone data={data} deals={deals} timerOn={timerOn} dealTarget={dealTarget} glow={glowOn} scan={scanOn} />
        )}

        {/* ═══ EXCLUSIVE — legendary loot cinematic card ═══ */}
        {data.exclusive.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-exclusive">
            <Reveal>
              <HudHead id="gc-exclusive" icon={Swords} code="LEGENDARY_LOOT" title="آیتم‌های افسانه‌ای" subtitle="انحصاریِ لابی — فقط در تاج" />
              {data.exclusive[0] && (
                <div className="gc-arena">
                  {scanOn && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-40" />}
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
                        <Package className="absolute inset-0 m-auto h-20 w-20 text-[rgba(168,85,247,.5)]" aria-hidden />
                      )}
                      <span className="gc-hex gc-hex-grad absolute start-0 top-4 grid h-11 w-12 place-items-center font-mono text-[9px] font-black tracking-widest text-white" aria-hidden>
                        S-TIER
                      </span>
                    </div>
                    {/* content */}
                    <div className="min-w-0">
                      <p dir="ltr" className="gc-code gc-code-hot text-right">{`// ${data.exclusive[0].brand.name} · RARITY=S`}</p>
                      <h3 className="gc-glitch mt-1.5 text-2xl font-black leading-9 text-[var(--g-ink)] sm:text-3xl">
                        <span className="gc-glitch-t">{data.exclusive[0].name}</span>
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        {data.exclusive[0].rating > 0 && (
                          <span className="gc-rating flex items-center gap-1 rounded-full bg-[rgba(251,191,36,.1)] px-2.5 py-1">
                            <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                            {data.exclusive[0].rating.toLocaleString("fa-IR")}
                          </span>
                        )}
                        {data.exclusive[0].soldCount > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-[rgba(167,139,250,.14)] px-2.5 py-1 text-[var(--g-violet)]">
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
                          <span className="gc-old text-sm line-through">
                            {formatPrice(data.exclusive[0].price)}
                          </span>
                        )}
                        <span className="gc-price text-2xl font-black">
                          {formatPrice(data.exclusive[0].effectivePrice)}
                          <span className="ms-1 text-xs font-medium text-[var(--g-faint)]">تومان</span>
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
                      className="gc-card w-56 shrink-0 snap-start p-3"
                    >
                      <span className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[rgba(20,15,32,.55)] p-1">
                          {p.mainImage ? (
                            <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-0.5" loading="lazy" />
                          ) : (
                            <Package className="m-auto h-5 w-5 text-[#A855F7]" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-[var(--g-ink)]">{p.name}</span>
                          <span className="gc-price text-[11px] font-black">
                            {formatPrice(p.effectivePrice)}
                          </span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--g-faint)]" aria-hidden />
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
                      className="group w-52 shrink-0 snap-start rounded-xl border border-[var(--g-line)] bg-[rgba(36,30,51,.4)] p-3 transition-all hover:-translate-y-1 hover:border-[rgba(236,72,153,.55)] sm:w-56"
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
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[rgba(20,15,32,.55)] p-1">
                          {p.mainImage ? (
                            <Image src={p.mainImage} alt={p.name} fill sizes="64px" className="object-contain p-0.5 transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                          ) : (
                            <Package className="m-auto h-6 w-6 text-[#A855F7]" aria-hidden />
                          )}
                        </span>
                      </div>
                      <span className="mt-2.5 block min-h-12 text-[12.5px] font-bold leading-6 text-[var(--g-ink)] line-clamp-2 group-hover:text-[var(--g-hot)]">
                        {p.name}
                      </span>
                      <span className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="gc-price text-[12px] font-black">
                          {formatPrice(p.effectivePrice)}
                        </span>
                        {p.soldCount > 0 && (
                          <span className="rounded-full bg-[rgba(236,72,153,.14)] px-2 py-0.5 text-[9px] font-black text-[var(--g-hot)] tabular-nums">
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

        {/* ═══ JOIN — «به آرنای تاج بپیوندید» AI copilot (join* keys) ═══ */}
        <JoinBand data={data} />

        {/* ═══ SHOWCASES — mission boards (global + v5-f: template slides) ═══ */}
        {missions.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] px-4" aria-labelledby="gc-missions">
            <Reveal>
              <HudHead id="gc-missions" icon={Gamepad2} code="MISSION_BOARDS" title="مأموریت‌های ویژه" subtitle="پرونده‌های فروشگاه" />
              <div className="grid gap-4 md:grid-cols-2">
                {missions.map((s) => (
                  <Link
                    key={s.id}
                    href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    className="gc-mission group min-h-48 sm:min-h-56"
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
                    {scanOn && <span aria-hidden className="gc-scanlines absolute inset-0 opacity-40" />}
                    <span className="relative flex h-full min-h-[inherit] flex-col justify-end p-5">
                      <span className="gc-mission-chip mb-2.5 w-fit">
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
                            <span className="grid h-full w-full place-items-center bg-[rgba(168,85,247,.2)] text-[11px] font-black text-[var(--g-violet)]">
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

        {/* ═══ FINAL CTA — gradient monogram band ═══ */}
        <FinalCtaBand data={data} />

        {/* ═══ EMPTY STATE ═══ */}
        {!hasAnyProduct && (
          <section className="mx-auto w-full max-w-[1360px] px-4">
            <HudWindow title="وضعیت سرور" code="BOOTING" live>
              <div className="p-16 text-center">
                <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-[rgba(168,85,247,.5)]" aria-hidden />
                <h2 className="text-lg font-black tracking-wide text-[var(--g-ink)]">سرور در حال بوت شدن است</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--g-dim)]">محصولات به‌زودی آنلاین می‌شوند…</p>
              </div>
            </HudWindow>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={{ ...chrome.footer, accent: "violet" }} />
    </div>
  );
}

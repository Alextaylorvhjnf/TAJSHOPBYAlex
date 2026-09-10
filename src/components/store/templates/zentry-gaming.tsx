"use client";

/**
 * TEMPLATE · zentry-gaming — «ZENTRY» (v35 · GAMING VERTICAL FLAGSHIP)
 * ---------------------------------------------------------------------------
 * The gaming vertical's dedicated storefront (owner refs: zentry-gaming.com
 * + "GameUp — Gaming Platform.jpg") — a DARK streaming-platform energy that
 * is deliberately different from every other template in the project:
 *   · deep purple-black canvas #14061F, ink #F2E8FF, ONE neon magenta→violet
 *     accent (#C026D3→#7C3AED); neon green #2EE86C is reserved ONLY for
 *     LIVE/online dots (never for ranks, prices or text);
 *   · signature curved neon SWOOSH (SVG, gradient stroke + glow, slow drift)
 *     sweeping behind the hero and through the join-community band;
 *   · HUD corner brackets (pure-CSS 4-corner ::before) on tiles & cards;
 *   · scanline + grain overlays and a travelling scan bar in the hero;
 *   · RGB conic-gradient rotating borders on FEATURED cards / hero ring;
 *   · «DEAL ZONE» live deals band (full-bleed magenta gradient + LIVE
 *     countdown to store.timerEndsAt or the next midnight);
 *   · bestsellers as a LEADERBOARD (neon ranks #۱/#۲/#۳, sold as «کِیل»).
 *
 * Wiring: chrome via TEMPLATE_CHROME["zentry-gaming"] (TemplateHeader /
 * TemplateFooter), cart via useCart (POST /api/cart/items + "cart-updated"
 * event, the novatrend-clean hook pattern), Reveal scroll animations,
 * framer-motion useReducedMotion, formatPrice/toFaDigits for Persian digits.
 *
 * LIGHT skin (html:not(.dark)): canvas #F5F0FB · cards white · ink #241040 —
 * the inverse of the dark-native templates; accents stay neon. All CSS is
 * scoped under [data-tpl="zentry-gaming"] and every loop respects
 * prefers-reduced-motion. NOTE: HomeData's TemplateProduct carries no specs
 * array, so the card "stat rows" are derived from the live product numbers
 * (امتیاز/کِیل/نظر/موجودی) — no fabricated data.
 */

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Armchair, BadgeCheck, Check, ChevronLeft, CircuitBoard, Crosshair, Fan,
  Flame, Gamepad2, Gpu, Headphones, HelpCircle, Joystick, Keyboard, Laptop,
  Layers, Cpu, Monitor, Mouse, Package, Radio, ShieldCheck, ShoppingCart,
  Sparkles, Star, Timer, Trophy, Truck, Users, Zap,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ══ ALL custom CSS — ONE scoped <style> block ═══════════════════════ */
const CSS = `
/* ── tokens · dark streaming-platform (native) ── */
[data-tpl="zentry-gaming"]{
  --zg-bg:#14061F;--zg-bg2:#1C0930;
  --zg-ink:#F2E8FF;--zg-dim:rgba(242,232,255,.64);--zg-faint:rgba(242,232,255,.4);
  --zg-card:rgba(255,255,255,.04);--zg-card2:rgba(255,255,255,.07);
  --zg-line:rgba(242,232,255,.1);--zg-line2:rgba(192,38,211,.4);
  --zg-mag:#C026D3;--zg-vio:#7C3AED;--zg-hot:#E879F9;
  --zg-live:#2EE86C;--zg-star:#FBBF24;
  --zg-panel:rgba(255,255,255,.05);--zg-chipbg:rgba(20,6,31,.72);
  --zg-tint:rgba(192,38,211,.07);
  background:#14061F;color:#F2E8FF;
}
/* ── LIGHT skin — inverse of the dark templates; accents stay neon ── */
html:not(.dark) [data-tpl="zentry-gaming"]{
  --zg-bg:#F5F0FB;--zg-bg2:#FFFFFF;
  --zg-ink:#241040;--zg-dim:rgba(36,16,64,.72);--zg-faint:rgba(36,16,64,.48);
  --zg-card:rgba(255,255,255,.92);--zg-card2:#FFFFFF;
  --zg-line:rgba(36,16,64,.13);--zg-line2:rgba(124,58,237,.42);
  --zg-hot:#A21CAF;--zg-live:#15A34A;--zg-star:#B45309;
  --zg-panel:rgba(255,255,255,.8);--zg-chipbg:rgba(255,255,255,.94);
  --zg-tint:rgba(124,58,237,.08);
  background:#F5F0FB;color:#241040;
}
/* ── root ambience ── */
[data-tpl="zentry-gaming"] .zg-root{
  position:relative;overflow:clip;
  background:
    radial-gradient(1150px 540px at 86% -12%,rgba(124,58,237,.24),transparent 60%),
    radial-gradient(880px 500px at -6% 14%,rgba(192,38,211,.16),transparent 58%),
    radial-gradient(1000px 720px at 52% 118%,rgba(124,58,237,.14),transparent 62%),
    var(--zg-bg);
  color:var(--zg-ink);
}
html:not(.dark) [data-tpl="zentry-gaming"] .zg-root{
  background:
    radial-gradient(1150px 540px at 86% -12%,rgba(124,58,237,.12),transparent 60%),
    radial-gradient(880px 500px at -6% 14%,rgba(192,38,211,.09),transparent 58%),
    var(--zg-bg);
}
/* ── scanline + grain overlays (subtle) ── */
[data-tpl="zentry-gaming"] .zg-scan{
  position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.5;
  background:repeating-linear-gradient(0deg,rgba(192,38,211,.035) 0 1px,transparent 1px 3px);
}
[data-tpl="zentry-gaming"] .zg-grain{
  position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
}
/* travelling scan bar (hero only) */
[data-tpl="zentry-gaming"] .zg-scanbar{
  position:absolute;left:0;right:0;height:130px;pointer-events:none;z-index:1;
  background:linear-gradient(180deg,transparent,rgba(232,121,249,.07),transparent);
  animation:zg-scan 8s linear infinite;
}
@keyframes zg-scan{0%{top:-16%}100%{top:112%}}
/* ── the curved neon SWOOSH (SVG) ── */
[data-tpl="zentry-gaming"] .zg-swoosh{
  position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;
  filter:drop-shadow(0 0 24px rgba(192,38,211,.4));
  animation:zg-drift 12s ease-in-out infinite;
}
[data-tpl="zentry-gaming"] .zg-swoosh-2{animation-duration:15s;animation-delay:-4s;opacity:.55}
@keyframes zg-drift{0%,100%{transform:translateX(-1.4%) translateY(0)}50%{transform:translateX(1.4%) translateY(-10px)}}
/* ── gradient display text (the highlighted hero word) ── */
[data-tpl="zentry-gaming"] .zg-grad-text{
  background-image:linear-gradient(100deg,#E879F9,#C026D3 45%,#7C3AED);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 22px rgba(192,38,211,.45));
}
/* ── mono Latin code atom ── */
[data-tpl="zentry-gaming"] .zg-mono{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;
  color:var(--zg-faint);
}
/* ── LIVE badge (neon green ONLY here) ── */
[data-tpl="zentry-gaming"] .zg-live-badge{
  display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;
  background:rgba(46,232,108,.12);border:1px solid rgba(46,232,108,.45);
  color:var(--zg-live);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:9.5px;font-weight:900;letter-spacing:.2em;
}
[data-tpl="zentry-gaming"] .zg-live-dot{
  width:8px;height:8px;border-radius:999px;background:var(--zg-live);flex-shrink:0;
  box-shadow:0 0 10px rgba(46,232,108,.9);
  animation:zg-pulse 1.7s ease-out infinite;
}
@keyframes zg-pulse{
  0%{box-shadow:0 0 0 0 rgba(46,232,108,.55)}
  80%{box-shadow:0 0 0 9px rgba(46,232,108,0)}
  100%{box-shadow:0 0 0 0 rgba(46,232,108,0)}
}
/* neon flicker (DEAL ZONE label) */
[data-tpl="zentry-gaming"] .zg-flicker{animation:zg-flicker 6.5s linear infinite}
@keyframes zg-flicker{
  0%,100%{opacity:1}7%{opacity:.7}11%{opacity:1}43%{opacity:.85}47%{opacity:1}
  71%{opacity:.92}75%{opacity:1}
}
/* ── HUD corner brackets — 4 corners, one ::before, 8 gradient layers ── */
[data-tpl="zentry-gaming"] .zg-brackets{position:absolute;inset:9px;pointer-events:none;opacity:0;transition:opacity .25s;z-index:6}
[data-tpl="zentry-gaming"] .zg-brackets::before{
  content:"";position:absolute;inset:0;background-repeat:no-repeat;
  background-image:
    linear-gradient(var(--zg-mag),var(--zg-mag)),linear-gradient(var(--zg-mag),var(--zg-mag)),
    linear-gradient(var(--zg-mag),var(--zg-mag)),linear-gradient(var(--zg-mag),var(--zg-mag)),
    linear-gradient(var(--zg-mag),var(--zg-mag)),linear-gradient(var(--zg-mag),var(--zg-mag)),
    linear-gradient(var(--zg-mag),var(--zg-mag)),linear-gradient(var(--zg-mag),var(--zg-mag));
  background-position:0 0,0 0,100% 0,100% 0,0 100%,0 100%,100% 100%,100% 100%;
  background-size:18px 2px,2px 18px,18px 2px,2px 18px,18px 2px,2px 18px,18px 2px,2px 18px;
  filter:drop-shadow(0 0 6px rgba(192,38,211,.75));
}
[data-tpl="zentry-gaming"] .zg-hover-brackets:hover .zg-brackets,
[data-tpl="zentry-gaming"] .zg-hover-brackets:focus-within .zg-brackets,
[data-tpl="zentry-gaming"] .zg-brackets-on .zg-brackets{opacity:1}
/* ── RGB conic rotating border (featured cards + hero ring) ── */
[data-tpl="zentry-gaming"] .zg-rgb{position:relative;overflow:hidden;padding:1.5px;border-color:transparent!important}
[data-tpl="zentry-gaming"] .zg-rgb::before{
  content:"";position:absolute;inset:-130%;z-index:0;
  background:conic-gradient(from 0deg,#C026D3,#7C3AED,#2EE86C,#22D3EE,#C026D3);
  animation:zg-rgb-rotate 6s linear infinite;
}
@keyframes zg-rgb-rotate{to{transform:rotate(360deg)}}
/* blurred conic halo behind the hero panel */
[data-tpl="zentry-gaming"] .zg-hero-halo{
  position:absolute;inset:-16%;border-radius:999px;pointer-events:none;z-index:0;
  background:conic-gradient(from 90deg,#C026D3,#7C3AED,#2EE86C,#22D3EE,#C026D3);
  filter:blur(52px);opacity:.3;
  animation:zg-rgb-rotate 9s linear infinite;
}
/* ── glass surfaces ── */
[data-tpl="zentry-gaming"] .zg-glass{
  background:var(--zg-card);border:1px solid var(--zg-line);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
}
[data-tpl="zentry-gaming"] .zg-hero-panel{
  position:relative;z-index:1;border-radius:26px;overflow:hidden;
  background:var(--zg-panel);border:1px solid var(--zg-line2);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:0 30px 70px -34px rgba(0,0,0,.65),0 0 34px -16px rgba(192,38,211,.4);
}
/* ── floating HUD chips ── */
[data-tpl="zentry-gaming"] .zg-chip{
  display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:11px;
  background:var(--zg-chipbg);border:1px solid var(--zg-line2);
  -webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:800;font-size:11px;color:var(--zg-ink);
  box-shadow:0 10px 26px -12px rgba(0,0,0,.7),0 0 18px -9px rgba(192,38,211,.65);
}
[data-tpl="zentry-gaming"] .zg-bob{animation:zg-bob 6.5s ease-in-out infinite}
[data-tpl="zentry-gaming"] .zg-bob-2{animation:zg-bob 7.5s ease-in-out 1.6s infinite}
@keyframes zg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
/* ── buttons ── */
[data-tpl="zentry-gaming"] .zg-cta{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;
  height:52px;padding:0 30px;border-radius:999px;
  background:linear-gradient(135deg,#C026D3,#7C3AED);
  color:#fff;font-weight:900;font-size:14.5px;letter-spacing:-.01em;
  box-shadow:0 14px 34px -12px rgba(192,38,211,.75),0 0 26px rgba(124,58,237,.28);
  transition:transform .22s,box-shadow .22s,filter .22s;
}
[data-tpl="zentry-gaming"] .zg-cta:hover{transform:translateY(-2px);filter:brightness(1.08);box-shadow:0 18px 40px -12px rgba(192,38,211,.9),0 0 34px rgba(124,58,237,.35)}
[data-tpl="zentry-gaming"] .zg-cta:active{transform:translateY(0) scale(.98)}
[data-tpl="zentry-gaming"] .zg-outline{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;
  height:52px;padding:0 28px;border-radius:999px;
  border:1.5px solid var(--zg-line2);background:var(--zg-tint);
  color:var(--zg-ink);font-weight:800;font-size:13.5px;
  box-shadow:inset 0 0 18px rgba(192,38,211,.05);
  transition:all .22s;
}
[data-tpl="zentry-gaming"] .zg-outline:hover{
  border-color:var(--zg-mag);color:var(--zg-hot);
  box-shadow:0 0 26px -7px rgba(192,38,211,.6),inset 0 0 24px rgba(192,38,211,.12);
  transform:translateY(-2px);
}
[data-tpl="zentry-gaming"] .zg-outline:active{transform:translateY(0) scale(.98)}
/* ghost-neon add-to-cart (morphs to «افزوده شد ✓») */
[data-tpl="zentry-gaming"] .zg-add{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  height:42px;width:100%;border-radius:12px;
  border:1.5px solid var(--zg-line2);background:var(--zg-tint);
  color:var(--zg-ink);font-weight:800;font-size:12px;
  transition:all .22s;
}
[data-tpl="zentry-gaming"] .zg-add:hover{
  border-color:var(--zg-mag);color:var(--zg-hot);
  box-shadow:0 0 22px -6px rgba(192,38,211,.6),inset 0 0 20px rgba(192,38,211,.1);
}
[data-tpl="zentry-gaming"] .zg-add:disabled{opacity:.4;pointer-events:none;filter:grayscale(.4)}
[data-tpl="zentry-gaming"] .zg-add.zg-added{
  background:linear-gradient(135deg,#C026D3,#7C3AED);border-color:transparent;color:#fff;
  box-shadow:0 10px 26px -10px rgba(192,38,211,.8);
}
/* ── price + stock atoms ── */
[data-tpl="zentry-gaming"] .zg-price{
  color:var(--zg-hot);font-variant-numeric:tabular-nums;
  text-shadow:0 0 16px rgba(192,38,211,.35);
}
[data-tpl="zentry-gaming"] .zg-old{color:var(--zg-faint);font-variant-numeric:tabular-nums;text-decoration:line-through}
[data-tpl="zentry-gaming"] .zg-stock-track{
  height:4px;border-radius:999px;overflow:hidden;
  background:rgba(242,232,255,.09);
}
html:not(.dark) [data-tpl="zentry-gaming"] .zg-stock-track{background:rgba(36,16,64,.1)}
[data-tpl="zentry-gaming"] .zg-stock-fill{
  height:100%;border-radius:999px;
  background:linear-gradient(90deg,var(--zg-mag),var(--zg-vio));
  box-shadow:0 0 10px rgba(192,38,211,.6);
}
/* ── product card ── */
[data-tpl="zentry-gaming"] .zg-card{
  position:relative;border-radius:20px;overflow:hidden;
  border:1.5px solid var(--zg-line);
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
[data-tpl="zentry-gaming"] .zg-card:hover{
  transform:translateY(-4px);border-color:var(--zg-line2);
  box-shadow:0 22px 48px -22px rgba(0,0,0,.6),0 0 32px -14px rgba(192,38,211,.55);
}
[data-tpl="zentry-gaming"] .zg-card-in{
  position:relative;z-index:1;display:flex;flex-direction:column;height:100%;
  border-radius:19px;overflow:hidden;
  background:var(--zg-card);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
}
/* image stage with subtle grid bg */
[data-tpl="zentry-gaming"] .zg-stage{
  position:relative;overflow:hidden;
  background:
    linear-gradient(rgba(192,38,211,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(192,38,211,.05) 1px,transparent 1px),
    radial-gradient(120% 120% at 50% 0%,rgba(124,58,237,.12),transparent 70%);
  background-size:22px 22px,22px 22px,auto;
}
html:not(.dark) [data-tpl="zentry-gaming"] .zg-stage{
  background:
    linear-gradient(rgba(124,58,237,.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(124,58,237,.06) 1px,transparent 1px),
    radial-gradient(120% 120% at 50% 0%,rgba(124,58,237,.08),transparent 70%);
  background-size:22px 22px,22px 22px,auto;
}
[data-tpl="zentry-gaming"] .zg-card .object-contain,
[data-tpl="zentry-gaming"] .zg-deal .object-contain{
  filter:drop-shadow(0 8px 18px rgba(124,58,237,.28));
}
[data-tpl="zentry-gaming"] .zg-card:hover .object-contain{
  filter:drop-shadow(0 12px 24px rgba(192,38,211,.4));
}
/* mini spec stat rows */
[data-tpl="zentry-gaming"] .zg-stat{
  display:inline-flex;align-items:center;gap:6px;min-width:0;
  padding:4px 9px;border-radius:8px;
  background:rgba(192,38,211,.08);border:1px solid rgba(192,38,211,.22);
}
html:not(.dark) [data-tpl="zentry-gaming"] .zg-stat{background:rgba(124,58,237,.07);border-color:rgba(124,58,237,.2)}
[data-tpl="zentry-gaming"] .zg-stat b{color:var(--zg-hot);font-variant-numeric:tabular-nums;font-weight:900}
[data-tpl="zentry-gaming"] .zg-stat i{font-style:normal;color:var(--zg-faint);font-size:9.5px;font-weight:700}
/* ── section head ── */
[data-tpl="zentry-gaming"] .zg-shead-line{
  display:block;height:2px;border-radius:999px;margin-top:13px;
  width:min(330px,46%);
  background:linear-gradient(90deg,var(--zg-mag),var(--zg-vio) 55%,transparent 96%);
}
/* ── DEAL ZONE band (full-bleed magenta gradient) ── */
[data-tpl="zentry-gaming"] .zg-dealband{
  position:relative;overflow:hidden;
  background:linear-gradient(100deg,#C026D3 0%,#8B2FC9 46%,#7C3AED 100%);
  box-shadow:0 -1px 0 rgba(232,121,249,.65) inset,0 -18px 44px -24px rgba(192,38,211,.8),0 18px 44px -24px rgba(124,58,237,.8);
}
[data-tpl="zentry-gaming"] .zg-dealband::before{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px);
}
/* countdown cells */
[data-tpl="zentry-gaming"] .zg-cell{
  min-width:48px;padding:5px 8px 4px;border-radius:11px;text-align:center;
  background:rgba(20,6,31,.45);border:1px solid rgba(255,255,255,.24);
  color:#fff;
}
[data-tpl="zentry-gaming"] .zg-cell b{display:block;font-size:15px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.15}
[data-tpl="zentry-gaming"] .zg-cell i{display:block;font-style:normal;font-size:8.5px;font-weight:800;letter-spacing:.06em;color:rgba(255,255,255,.75)}
/* deal rail */
[data-tpl="zentry-gaming"] .zg-rail{
  display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;
  scrollbar-width:none;-ms-overflow-style:none;padding-bottom:4px;
}
[data-tpl="zentry-gaming"] .zg-rail::-webkit-scrollbar{display:none}
[data-tpl="zentry-gaming"] .zg-deal{
  position:relative;flex-shrink:0;scroll-snap-align:start;
  border-radius:16px;overflow:hidden;
  background:rgba(20,6,31,.66);border:1px solid rgba(255,255,255,.16);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  transition:transform .22s,border-color .22s,box-shadow .22s;
}
[data-tpl="zentry-gaming"] .zg-deal:hover{
  transform:translateY(-4px);border-color:rgba(255,255,255,.42);
  box-shadow:0 18px 40px -18px rgba(0,0,0,.6);
}
/* ── leaderboard ── */
[data-tpl="zentry-gaming"] .zg-lb-row{
  position:relative;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;
  background:var(--zg-card);border:1px solid var(--zg-line);
  transition:border-color .22s,box-shadow .22s,background .22s;
}
[data-tpl="zentry-gaming"] .zg-lb-row:hover{border-color:var(--zg-line2);box-shadow:0 0 26px -12px rgba(192,38,211,.5)}
[data-tpl="zentry-gaming"] .zg-lb-top1{background:var(--zg-card2);border-color:rgba(192,38,211,.4)}
[data-tpl="zentry-gaming"] .zg-lb-rank{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:900;font-size:19px;font-variant-numeric:tabular-nums;flex-shrink:0;width:44px;text-align:center;
}
[data-tpl="zentry-gaming"] .zg-rank-1{color:#E879F9;text-shadow:0 0 18px rgba(232,121,249,.85)}
[data-tpl="zentry-gaming"] .zg-rank-2{color:#A78BFA;text-shadow:0 0 14px rgba(167,139,250,.6)}
[data-tpl="zentry-gaming"] .zg-rank-3{color:#C026D3;text-shadow:0 0 14px rgba(192,38,211,.65)}
[data-tpl="zentry-gaming"] .zg-rank-n{color:var(--zg-faint)}
/* ── brand tiles glow ── */
[data-tpl="zentry-gaming"] .zg-brand{
  transition:transform .22s,box-shadow .22s,border-color .22s,color .22s;
}
[data-tpl="zentry-gaming"] .zg-brand:hover{
  transform:translateY(-3px);border-color:var(--zg-mag);color:var(--zg-hot);
  box-shadow:0 0 30px -8px rgba(192,38,211,.65),0 14px 30px -16px rgba(0,0,0,.5);
}
[data-tpl="zentry-gaming"] .zg-brand-mono{
  display:grid;place-items:center;width:30px;height:30px;border-radius:9px;flex-shrink:0;
  background:linear-gradient(135deg,#C026D3,#7C3AED);color:#fff;font-weight:900;font-size:13px;
  box-shadow:0 0 16px -4px rgba(192,38,211,.7);
}
/* ── category tile icon ── */
[data-tpl="zentry-gaming"] .zg-cat-ico{
  display:grid;place-items:center;width:44px;height:44px;border-radius:13px;flex-shrink:0;
  background:linear-gradient(135deg,#C026D3,#7C3AED);color:#fff;
  box-shadow:0 10px 24px -10px rgba(192,38,211,.75);
  transition:transform .25s,box-shadow .25s;
}
[data-tpl="zentry-gaming"] .zg-cat:hover .zg-cat-ico{transform:scale(1.08) rotate(-3deg);box-shadow:0 12px 30px -8px rgba(192,38,211,.95)}
/* ── join band (magenta gradient) ── */
[data-tpl="zentry-gaming"] .zg-joinband{
  position:relative;overflow:hidden;
  background:linear-gradient(115deg,#C026D3 0%,#8B2FC9 52%,#7C3AED 100%);
  box-shadow:0 -18px 44px -24px rgba(192,38,211,.8),0 18px 44px -24px rgba(124,58,237,.8);
}
[data-tpl="zentry-gaming"] .zg-joinband::before{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:.45;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px);
}
[data-tpl="zentry-gaming"] .zg-join-chip{
  display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;
  background:rgba(20,6,31,.38);border:1px solid rgba(255,255,255,.2);color:#fff;
}
/* rails hide scrollbar (shared) */
[data-tpl="zentry-gaming"] .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="zentry-gaming"] .no-scrollbar::-webkit-scrollbar{display:none}
/* ── reduced motion: kill EVERY loop ── */
@media (prefers-reduced-motion:reduce){
  [data-tpl="zentry-gaming"] *,
  [data-tpl="zentry-gaming"] *::before,
  [data-tpl="zentry-gaming"] *::after{animation:none!important}
  [data-tpl="zentry-gaming"] .zg-brackets{opacity:1}
}
`;

/* ── category icon map (TemplateCategory.icon is a lucide name string) ── */
const CAT_ICONS: Record<string, React.ElementType> = {
  Gpu, Cpu, CircuitBoard, Laptop, Monitor, Fan, Gamepad2, Armchair, Headphones,
  Keyboard, Mouse, Joystick,
};

/* ── add-to-cart — POST /api/cart/items + "cart-updated" event
 *    (the novatrend-clean useTrendAdd pattern on the shared useCart hook) ── */
function useZgAdd() {
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

/* ── mini stat rows — HomeData products carry NO specs array, so the two
 *    live stats are derived from the product's own numbers (never faked) ── */
function miniStats(p: TemplateProduct): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (p.rating > 0) out.push({ label: "امتیاز", value: toFaDigits(p.rating.toLocaleString("fa-IR")) });
  if (p.soldCount > 0) out.push({ label: "کِیل", value: toFaDigits(p.soldCount.toLocaleString("fa-IR")) });
  if (out.length < 2 && p.reviewCount > 0) out.push({ label: "نظر", value: toFaDigits(p.reviewCount.toLocaleString("fa-IR")) });
  if (out.length < 2) out.push({ label: "موجودی", value: toFaDigits(p.stock.toLocaleString("fa-IR")) });
  return out.slice(0, 2);
}

/* ── next-mn helper (DEAL ZONE target when no global timer is set) ── */
function nextMidnight(): number {
  const n = new Date();
  n.setHours(24, 0, 0, 0);
  return n.getTime();
}

/* ── LIVE countdown — hydration-safe (SSR dashes), ticks every second;
 *    target = store.timerEndsAt ?? next midnight; an EXPIRED global timer
 *    gracefully rolls to the next midnight so the band never freezes. ── */
function DealCountdown({ iso }: { iso: string | null }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let target: number;
    const fixed = iso?.trim();
    if (fixed) {
      const t = new Date(fixed).getTime();
      target = !Number.isNaN(t) && t > Date.now() ? t : nextMidnight();
    } else {
      target = nextMidnight();
    }
    const tick = () => {
      let ms = target - Date.now();
      if (ms <= 0) {
        target = nextMidnight();
        ms = target - Date.now();
      }
      setLeft(ms);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);

  const pad = (n: number) => toFaDigits(String(n).padStart(2, "0"));
  const cells =
    left === null
      ? [
          { v: "—", l: "روز" },
          { v: "—", l: "ساعت" },
          { v: "—", l: "دقیقه" },
          { v: "—", l: "ثانیه" },
        ]
      : [
          ...(Math.floor(left / 86_400_000) > 0
            ? [{ v: toFaDigits(String(Math.floor(left / 86_400_000))), l: "روز" }]
            : []),
          { v: pad(Math.floor((left / 3_600_000) % 24)), l: "ساعت" },
          { v: pad(Math.floor((left / 60_000) % 60)), l: "دقیقه" },
          { v: pad(Math.floor((left / 1000) % 60)), l: "ثانیه" },
        ];

  return (
    <div dir="ltr" className="flex items-center gap-2" role="timer" aria-label="زمان باقی‌مانده تخفیف‌های زنده">
      {cells.map((c) => (
        <span key={c.l} className="zg-cell">
          <b>{c.v}</b>
          <i>{c.l}</i>
        </span>
      ))}
    </div>
  );
}

/* ── the signature curved neon swoosh (SVG, gradient stroke + glow) ── */
function Swoosh({ second = false }: { second?: boolean }) {
  const gid = useId();
  return (
    <svg
      className={cn("zg-swoosh", second && "zg-swoosh-2")}
      viewBox="0 0 1200 640"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7C3AED" stopOpacity="0" />
          <stop offset="0.32" stopColor="#C026D3" stopOpacity="0.9" />
          <stop offset="0.66" stopColor="#E879F9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M -90 472 C 250 300 520 612 1290 248" fill="none" stroke={`url(#${gid})`} strokeWidth="110" strokeLinecap="round" opacity="0.16" />
      <path d="M -90 428 C 268 244 540 556 1290 206" fill="none" stroke={`url(#${gid})`} strokeWidth="24" strokeLinecap="round" opacity="0.38" />
      <path d="M -90 502 C 236 338 508 642 1290 282" fill="none" stroke={`url(#${gid})`} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/* ── section head — mono code + big title + gradient underline + link ── */
function ZgHead({
  id, code, title, sub, href,
}: {
  id?: string;
  code: string;
  title: string;
  sub?: string;
  href?: string;
}) {
  return (
    <div className="mb-7">
      <p dir="ltr" className="zg-mono text-start">{`// ${code}`}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-2xl font-black tracking-tight text-[var(--zg-ink)] sm:text-3xl">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="zg-outline h-10 px-5 text-xs"
            aria-label={`مشاهده همه ${title}`}
          >
            همه
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      {sub && <p className="mt-2.5 max-w-3xl text-[13px] leading-7 text-[var(--zg-dim)]">{sub}</p>}
      <span className="zg-shead-line" aria-hidden />
    </div>
  );
}

/* ── floating HUD chip ── */
function HudChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("zg-chip", className)}>{children}</span>;
}

/* ── LIVE badge (green dot — the ONLY green in the template) ── */
function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="zg-live-badge">
      <i className="zg-live-dot" aria-hidden />
      {label}
    </span>
  );
}

/* ── PRODUCT CARD — dark glass · HUD brackets on hover · RGB conic border
 *    on featured · neon price · stock bar · ghost-neon add button ────── */
function ZgCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useZgAdd();
  const stats = miniStats(product);
  const stockPct = Math.min(100, Math.round((Math.min(product.stock, 25) / 25) * 100));
  return (
    <article className={cn("zg-card zg-hover-brackets group", product.featured && "zg-rgb")}>
      <div className="zg-card-in">
        <Link
          href={`/products/${product.slug}`}
          className="zg-stage block aspect-square"
          aria-label={product.name}
        >
          <span className="zg-brackets" aria-hidden />
          <span className="absolute inset-0 z-[5] grid place-items-center">
            {product.mainImage ? (
              <Image
                src={product.mainImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 23vw"
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
                loading="lazy"
              />
            ) : (
              <Package className="h-12 w-12 text-[var(--zg-faint)]" aria-hidden />
            )}
          </span>
          {product.discountPercent > 0 && (
            <span className="absolute start-3 top-3 z-[7] rounded-full bg-gradient-to-l from-[#C026D3] to-[#7C3AED] px-2.5 py-1 text-[10px] font-black text-white tabular-nums">
              {toFaDigits(product.discountPercent.toLocaleString("fa-IR"))}٪ تخفیف
            </span>
          )}
          {product.featured && (
            <span dir="ltr" className="zg-mono absolute end-3 top-3 z-[7] rounded-full border border-[var(--zg-line2)] bg-[var(--zg-chipbg)] px-2 py-1">
              PRO
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-x-3 bottom-3 z-[7] rounded-full bg-black/70 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur">
              ناموجود
            </span>
          )}
        </Link>

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--zg-dim)]">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--zg-mag)]" aria-hidden />
            <span className="truncate">{product.brand.name}</span>
          </p>
          <Link href={`/products/${product.slug}`} className="min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[var(--zg-ink)] transition-colors group-hover:text-[var(--zg-hot)]">
            {product.name}
          </Link>
          {product.rating > 0 && (
            <p className="flex items-center gap-1 text-[11px] font-bold text-[var(--zg-star)] tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {toFaDigits(product.rating.toLocaleString("fa-IR"))}
              {product.reviewCount > 0 && (
                <span className="font-normal text-[var(--zg-faint)]">({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))})</span>
              )}
            </p>
          )}
          {/* mini spec stat rows (derived from the live product numbers) */}
          <div className="flex flex-wrap gap-1.5">
            {stats.map((s) => (
              <span key={s.label} className="zg-stat">
                <i>{s.label}</i>
                <b>{s.value}</b>
              </span>
            ))}
          </div>

          <div className="mt-auto space-y-2.5 pt-1">
            {product.discountPercent > 0 && (
              <p className="zg-old text-[11px] leading-4">{formatPrice(product.price)}</p>
            )}
            <p className="zg-price text-[15px] font-black leading-5">
              {formatPrice(product.effectivePrice)}
              <span className="ms-1 text-[10px] font-medium text-[var(--zg-faint)]">تومان</span>
            </p>
            {/* thin neon stock bar — «موجودی x» */}
            <div>
              <p className="mb-1 flex items-center justify-between text-[9.5px] font-bold text-[var(--zg-faint)] tabular-nums">
                <span>موجودی {toFaDigits(product.stock.toLocaleString("fa-IR"))}</span>
                {product.inStock ? <span className="text-[var(--zg-live)]">آماده ارسال</span> : <span>ناموجود</span>}
              </p>
              <div className="zg-stock-track" role="img" aria-label={`موجودی ${product.stock} عدد`}>
                <div className="zg-stock-fill" style={{ width: `${product.inStock ? Math.max(stockPct, 6) : 0}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={!product.inStock}
              className={cn("zg-add", added && "zg-added")}
              aria-label={`افزودن ${product.name} به سبد خرید`}
            >
              {added ? (
                "افزوده شد ✓"
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  افزودن به سبد
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── DEAL ZONE rail card ─────────────────────────────────────────── */
function DealCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useZgAdd();
  return (
    <article className="zg-deal zg-hover-brackets group w-[236px]">
      <span className="zg-brackets" aria-hidden />
      <Link href={`/products/${product.slug}`} className="zg-stage block aspect-[4/3] overflow-hidden" aria-label={product.name}>
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="236px"
            className="object-contain p-3.5 transition-transform duration-500 group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center">
            <Flame className="h-9 w-9 text-white/40" aria-hidden />
          </span>
        )}
        <span className="absolute start-2.5 top-2.5 z-[6] rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#8B2FC9] tabular-nums">
          {toFaDigits(product.discountPercent.toLocaleString("fa-IR"))}٪
        </span>
      </Link>
      <div className="flex flex-col gap-2 p-3">
        <Link href={`/products/${product.slug}`} className="truncate text-[12px] font-bold text-white transition-colors group-hover:text-[#F5C6FF]">
          {product.name}
        </Link>
        <p className="flex items-baseline gap-2">
          <span className="text-[14px] font-black text-[#F5C6FF] tabular-nums drop-shadow-[0_0_10px_rgba(245,198,255,.5)]">
            {formatPrice(product.effectivePrice)}
            <span className="text-[9px] font-normal text-white/60"> تومان</span>
          </span>
          <span className="text-[10px] text-white/50 line-through tabular-nums">{formatPrice(product.price)}</span>
        </p>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border text-[11px] font-bold transition-all active:scale-95",
            added
              ? "border-transparent bg-white text-[#8B2FC9]"
              : "border-white/25 bg-white/10 text-white hover:border-white/70 hover:bg-white/20",
            !product.inStock && "cursor-not-allowed opacity-40"
          )}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              افزوده شد
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
              {product.inStock ? "خرید سریع" : "ناموجود"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ── LEADERBOARD row — neon rank + sold as «کِیل» ─────────────────── */
function LbRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useZgAdd();
  const medal = rank <= 3;
  return (
    <li className={cn("zg-lb-row zg-hover-brackets group", rank === 1 && "zg-lb-top1")}>
      <span className="zg-brackets" aria-hidden />
      <span dir="ltr" className={cn("zg-lb-rank", medal ? `zg-rank-${rank}` : "zg-rank-n")} aria-hidden>
        {`#${toFaDigits(rank)}`}
      </span>
      <Link href={`/products/${product.slug}`} className="zg-stage relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl" aria-hidden>
        {product.mainImage ? (
          <Image src={product.mainImage} alt="" fill sizes="56px" className="object-contain p-1.5" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-[var(--zg-faint)]">
            <Trophy className="h-6 w-6" />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="block truncate text-[13px] font-bold text-[var(--zg-ink)] transition-colors group-hover:text-[var(--zg-hot)]">
          {product.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-[var(--zg-dim)] tabular-nums">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-[var(--zg-star)] text-[var(--zg-star)]" aria-hidden />
            <b className="font-black text-[var(--zg-ink)]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
          </span>
          {product.soldCount > 0 && (
            <span className="rounded-full bg-[var(--zg-tint)] px-2 py-0.5 font-black text-[var(--zg-hot)]">
              {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} کِیل
            </span>
          )}
          <span className="hidden text-[var(--zg-faint)] sm:inline">{product.brand.name}</span>
        </p>
      </div>
      <p className="zg-price shrink-0 text-[14px] font-black">
        {formatPrice(product.effectivePrice)}
        <span className="text-[9px] font-normal text-[var(--zg-faint)]"> تومان</span>
      </p>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد خرید`}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] px-4 text-[11px] font-bold transition-all active:scale-95",
          added
            ? "border-transparent bg-gradient-to-l from-[#C026D3] to-[#7C3AED] text-white"
            : "border-[var(--zg-line2)] bg-[var(--zg-tint)] text-[var(--zg-ink)] hover:border-[var(--zg-mag)] hover:text-[var(--zg-hot)]",
          !product.inStock && "cursor-not-allowed opacity-40"
        )}
      >
        {added ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden />}
        {added ? "افزوده شد" : "افزودن"}
      </button>
    </li>
  );
}

/* ── FAQ accordion row ───────────────────────────────────────────── */
function ZgFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="zg-glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="zg-hover-brackets relative flex min-h-11 w-full items-center gap-3 p-4 text-start"
      >
        <span className="zg-brackets" aria-hidden />
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-l from-[#C026D3] to-[#7C3AED] shadow-[0_0_10px_rgba(192,38,211,.8)]" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[var(--zg-ink)]">{h}</span>
        <ChevronLeft
          className={cn("h-4 w-4 shrink-0 text-[var(--zg-faint)] transition-transform duration-300", open ? "-rotate-90 text-[var(--zg-hot)]" : "rotate-90")}
          aria-hidden
        />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[var(--zg-dim)]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════ TEMPLATE ═══════════════════════════════════ */
export function ZentryGamingTemplate({ data }: { data: HomeData }) {
  const reduced = useReducedMotion();
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["zentry-gaming"];

  /* hero inputs — slides[0] title/subtitle/CTA with designed fallbacks */
  const heroSlide = data.slides[0] ?? null;
  const heroProduct = data.featured[0] ?? data.bestsellers[0] ?? data.newest[0] ?? heroSlide?.product ?? null;
  const heroTitle = heroSlide?.title?.trim() || "قدرت بازی، در دست تو";
  const heroWords = heroTitle.split(" ");
  const heroLast = heroWords.length > 1 ? (heroWords.pop() as string) : null;
  const heroSubtitle =
    heroSlide?.subtitle?.trim() ||
    (store.announcementActive && store.announcement?.trim()) ||
    `از کارت گرافیک تا ست‌آپ کامل استریم — تجهیزات برنده‌ها با ضمانت اصالت کالا و ارسال سریع، مستقیم از ${store.storeName}.`;
  const primaryCta = { label: heroSlide?.ctaText?.trim() || "ورود به فروشگاه", href: heroSlide?.ctaUrl?.trim() || "/products" };

  /* DEAL ZONE — global countdown override (v25) */
  const timerIso =
    typeof store.timerEndsAt === "string" && store.timerEndsAt.trim() !== "" ? store.timerEndsAt : null;

  const proGear = data.featured.length > 0 ? data.featured : data.newest;
  const streamSpecials = data.exclusive.length > 0 ? data.exclusive : data.bestsellers.filter((p) => p.isSpecial);

  /* hero HUD chips — derived from the hero product's real name/numbers */
  const heroChips: string[] = [];
  if (heroProduct) {
    const hz = heroProduct.name.match(/(\d{3,4})\s*Hz/i)?.[1];
    if (hz) heroChips.push(`${toFaDigits(hz)}Hz`);
    if (/rtx|geforce/i.test(heroProduct.name)) heroChips.push("RTX");
    if (/4k|2160/i.test(heroProduct.name)) heroChips.push("4K");
    if (/ddr5/i.test(heroProduct.name)) heroChips.push("DDR5");
    if (heroProduct.rating > 0) heroChips.push(`${toFaDigits(heroProduct.rating.toLocaleString("fa-IR"))}★`);
    if (heroChips.length === 0) heroChips.push("PRO");
  }

  const rise = reduced ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } };
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 ||
    data.discounted.length > 0 || data.exclusive.length > 0;

  return (
    <div data-template-chrome="1" data-tpl="zentry-gaming" dir="rtl" className="isolate w-full">
      <style>{CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="zg-root w-full">
        <h1 className="sr-only">{`${store.storeName} — فروشگاه تجهیزات گیمینگ`}</h1>
        {/* root-level grain overlay (subtle, above static content, click-through) */}
        <span aria-hidden className="zg-grain z-[1]" />

        {/* ═══ ② HERO — display type + RGB-ring product panel + swoosh ═══ */}
        <section className="relative overflow-hidden" aria-labelledby="zg-hero">
          <Swoosh />
          <span aria-hidden className="zg-scan" />
          <span aria-hidden className="zg-scanbar" />

          <div className="relative z-[2] mx-auto w-full max-w-[1320px] px-4 pb-16 pt-10 sm:px-6 lg:pt-16">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* right (RTL) — massive Persian display type */}
              <motion.div {...rise} transition={{ type: "spring", stiffness: 52, damping: 16 }}>
                <p dir="ltr" className="zg-mono">{store.storeNameEn || "ZENTRY GAMING"}</p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--zg-line2)] bg-[var(--zg-tint)] px-4 py-2 text-[11px] font-black text-[var(--zg-ink)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--zg-mag)]" aria-hidden />
                  {store.storeName}
                </p>
                <h2 id="zg-hero" className="mt-5 text-[2.6rem] font-black leading-[1.08] tracking-tight text-[var(--zg-ink)] sm:text-6xl lg:text-[4.2rem]">
                  {heroWords.join(" ")}
                  {heroLast && (
                    <>
                      {" "}
                      <span className="zg-grad-text">{heroLast}</span>
                    </>
                  )}
                </h2>
                <p className="mt-6 max-w-xl text-[13.5px] leading-8 text-[var(--zg-dim)]">{heroSubtitle}</p>

                {/* dual CTAs — magenta gradient + outline */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link href={primaryCta.href} className="zg-cta">
                    <Zap className="h-[18px] w-[18px]" aria-hidden />
                    {primaryCta.label}
                  </Link>
                  <Link href="#zg-pro" className="zg-outline">
                    <Joystick className="h-[18px] w-[18px] text-[var(--zg-mag)]" aria-hidden />
                    مشاهده تجهیزات
                  </Link>
                </div>

                {/* hero stats line + online dot */}
                <dl className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
                  {[
                    { label: "محصول", value: counts.products },
                    { label: "دسته‌بندی", value: counts.categories },
                    { label: "برند", value: counts.brands },
                  ].map((s, i) => (
                    <div key={s.label} className={cn("flex items-baseline gap-1.5", i > 0 && "sm:border-e sm:border-[var(--zg-line)] sm:pe-7")}>
                      <dd className="text-2xl font-black tabular-nums text-[var(--zg-ink)]">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                      <dt className="text-[10.5px] font-medium text-[var(--zg-faint)]">{s.label}</dt>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <i className="zg-live-dot" aria-hidden />
                    <span className="text-[10.5px] font-bold text-[var(--zg-dim)]">سرور فروشگاه آنلاین است</span>
                  </div>
                </dl>
              </motion.div>

              {/* left (RTL) — hero product in an RGB-ring glass panel + HUD chips */}
              <motion.div {...rise} transition={{ type: "spring", stiffness: 52, damping: 16, delay: 0.12 }} className="relative mx-auto w-full max-w-[460px]">
                <span aria-hidden className="zg-hero-halo" />
                <div className="zg-hero-panel zg-brackets-on">
                  <span className="zg-brackets" aria-hidden />
                  {/* panel top bar — mono code + LIVE */}
                  <div className="flex items-center justify-between border-b border-[var(--zg-line)] px-5 py-3">
                    <p dir="ltr" className="zg-mono">HERO_LOADOUT</p>
                    <LiveBadge />
                  </div>
                  <Link
                    href={heroProduct ? `/products/${heroProduct.slug}` : "/products"}
                    className="zg-stage relative block aspect-square"
                    aria-label={heroProduct?.name ?? "فروشگاه"}
                  >
                    {heroProduct?.mainImage ? (
                      <Image
                        src={heroProduct.mainImage}
                        alt={heroProduct.name}
                        fill
                        priority
                        sizes="(max-width: 1024px) 86vw, 480px"
                        className="object-contain p-8"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-[var(--zg-faint)]">
                        <Gamepad2 className="h-20 w-20" aria-hidden />
                      </span>
                    )}
                    {heroProduct && (
                      <span className="absolute inset-x-5 bottom-4 z-[6] flex flex-wrap items-center justify-between gap-2">
                        <span className="zg-chip max-w-[70%] truncate font-sans text-[11px] font-bold">{heroProduct.name}</span>
                        <span className="zg-chip font-sans text-[12px] font-black text-[var(--zg-hot)] tabular-nums">
                          {formatPrice(heroProduct.effectivePrice)} تومان
                        </span>
                      </span>
                    )}
                  </Link>
                </div>

                {/* floating HUD stat chips */}
                {heroChips[0] && (
                  <HudChip className="zg-bob absolute -top-4 start-2 z-[7] hidden sm:inline-flex">
                    <Crosshair className="h-3.5 w-3.5 text-[var(--zg-mag)]" aria-hidden />
                    {heroChips[0]}
                  </HudChip>
                )}
                {heroChips[1] && (
                  <HudChip className="zg-bob-2 absolute -bottom-4 end-3 z-[7] hidden sm:inline-flex">{heroChips[1]}</HudChip>
                )}
                {heroChips[2] && (
                  <HudChip className="zg-bob absolute -start-3 top-[38%] z-[7] hidden lg:inline-flex">
                    {heroChips[2]}
                  </HudChip>
                )}
                {heroChips[3] && (
                  <HudChip className="zg-bob-2 absolute -end-2 top-[16%] z-[7] hidden lg:inline-flex">{heroChips[3]}</HudChip>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        <div className="relative z-[2] space-y-16 pb-20 pt-4">

          {/* ═══ ③ DEAL ZONE — live deals band (magenta gradient) ═══ */}
          {data.discounted.length > 0 && (
            <section className="zg-dealband relative" aria-labelledby="zg-deals">
              <div className="relative z-[2] mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                  <div className="min-w-0">
                    <p dir="ltr" className="zg-flicker zg-mono text-white/80">{`▚ DEAL ZONE ▞`}</p>
                    <h2 id="zg-deals" className="mt-1.5 flex flex-wrap items-center gap-3 text-2xl font-black text-white sm:text-3xl">
                      زون تخفیف‌های زنده
                      <LiveBadge />
                    </h2>
                    <p className="mt-2 max-w-2xl text-[12.5px] leading-7 text-white/75">
                      قیمت‌های امروز تا آخرین ثانیه معتبرند — قبل از پایان شمارش معکوس، لوت خودت را بردار.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="zg-join-chip text-[11px] font-black">
                      <Timer className="h-4 w-4" aria-hidden />
                      پایان
                    </span>
                    <DealCountdown iso={timerIso} />
                  </div>
                </div>

                {/* discounted products rail */}
                <div className="zg-rail mt-7">
                  {data.discounted.slice(0, 10).map((p) => (
                    <DealCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ═══ ④ CATEGORIES — HUD-bracket tiles grid ═══ */}
          {data.categories.length > 0 && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6" aria-labelledby="zg-cats">
              <Reveal>
                <ZgHead id="zg-cats" code="LOADOUT_ROUTES" title="مسیرهای لادی" sub="دسته‌بندی‌های فعال لابی — هر مسیر را باز کن و لوتت را انتخاب کن." href="/products" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.categories.slice(0, 8).map((c) => {
                    const Icon = CAT_ICONS[c.icon ?? ""] ?? Gamepad2;
                    return (
                      <Link
                        key={c.id}
                        href={`/products?category=${c.slug}`}
                        className="zg-cat zg-hover-brackets zg-glass group relative flex items-center gap-3.5 overflow-hidden rounded-2xl p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[var(--zg-line2)] hover:shadow-[0_18px_40px_-20px_rgba(192,38,211,.55)]"
                      >
                        <span className="zg-brackets" aria-hidden />
                        <span className="zg-cat-ico" aria-hidden>
                          <Icon className="h-[22px] w-[22px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-black text-[var(--zg-ink)]">{c.name}</span>
                          <span className="mt-0.5 block text-[10px] font-semibold text-[var(--zg-faint)] tabular-nums">
                            {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                          </span>
                        </span>
                        <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-[var(--zg-faint)] transition-all group-hover:-translate-x-0.5 group-hover:text-[var(--zg-mag)]" aria-hidden />
                      </Link>
                    );
                  })}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑤ «تجهیزات پرو» — RGB-border cards + stat rows ═══ */}
          {proGear.length > 0 && (
            <section id="zg-pro" className="mx-auto w-full max-w-[1320px] scroll-mt-24 px-4 sm:px-6" aria-labelledby="zg-pro-t">
              <Reveal>
                <ZgHead
                  id="zg-pro-t"
                  code="PRO_GEAR"
                  title="تجهیزات پرو"
                  sub="سخت‌افزارهایی که فرق بین برد و باخت را می‌سازند — با گارانتی اصالت و پشتیبانی حرفه‌ای."
                  href="/products?sort=rating"
                />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {proGear.slice(0, 8).map((p) => (
                    <ZgCard key={p.id} product={p} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑥ «استریمرهای ما / تجهیزات استریم» showcase band ═══ */}
          {(data.showcases.length > 0 || streamSpecials.length > 0) && (
            <section className="relative overflow-hidden border-y border-[var(--zg-line)] bg-[var(--zg-bg2)]" aria-labelledby="zg-stream">
              <Swoosh second />
              <span aria-hidden className="zg-scan opacity-30" />
              <div className="relative z-[2] mx-auto w-full max-w-[1320px] px-4 py-12 sm:px-6">
                <Reveal>
                  <ZgHead id="zg-stream" code="ON_AIR" title="استریمرهای ما" sub="تجهیزات استریم منتخب — همان چیزی که پشت هر پخش زنده‌ی حرفه‌ای می‌نشیند." href="/products?category=headset-stream" />
                  {data.showcases.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {data.showcases.slice(0, 2).map((s) => (
                        <Link
                          key={s.id}
                          href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                          className="zg-hover-brackets zg-glass group relative block overflow-hidden rounded-3xl border-[var(--zg-line)]"
                        >
                          <span className="zg-brackets" aria-hidden />
                          <span className="relative block aspect-[16/8] overflow-hidden">
                            <Image
                              src={s.image}
                              alt={s.title}
                              fill
                              sizes="(max-width: 640px) 92vw, 620px"
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                            <span className="absolute inset-0 bg-gradient-to-t from-[#14061F]/85 via-[#14061F]/25 to-transparent" />
                            <span className="absolute start-4 top-4 z-[6]">
                              <LiveBadge label="ON AIR" />
                            </span>
                          </span>
                          <span className="absolute inset-x-0 bottom-0 z-[6] flex flex-wrap items-end justify-between gap-3 p-5">
                            <span className="min-w-0">
                              <span className="block truncate text-lg font-black text-white">{s.title}</span>
                              {s.subtitle && <span className="mt-1 block max-w-md truncate text-[12px] text-white/75">{s.subtitle}</span>}
                            </span>
                            {s.product && (
                              <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-[#8B2FC9] tabular-nums">
                                {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                              </span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {streamSpecials.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          className="zg-hover-brackets zg-glass group relative flex items-center gap-4 overflow-hidden rounded-3xl p-4 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[var(--zg-line2)]"
                        >
                          <span className="zg-brackets" aria-hidden />
                          <span className="zg-stage relative block h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                            {p.mainImage ? (
                              <Image src={p.mainImage} alt={p.name} fill sizes="96px" className="object-contain p-2.5" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[var(--zg-faint)]">
                                <Radio className="h-8 w-8" aria-hidden />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--zg-tint)] px-2.5 py-1 text-[9.5px] font-black text-[var(--zg-hot)]">
                              <Radio className="h-3 w-3" aria-hidden />
                              تجهیزات استریم
                            </span>
                            <span className="mt-2 block text-[13px] font-black leading-6 line-clamp-2 text-[var(--zg-ink)]">{p.name}</span>
                            <span className="zg-price mt-1.5 block text-[14.5px] font-black tabular-nums">
                              {formatPrice(p.effectivePrice)}
                              <span className="text-[9.5px] font-normal text-[var(--zg-faint)]"> تومان</span>
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Reveal>
              </div>
            </section>
          )}

          {/* ═══ ⑦ «جدیدترین‌ها» grid ═══ */}
          {data.newest.length > 0 && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6" aria-labelledby="zg-new">
              <Reveal>
                <ZgHead id="zg-new" code="FRESH_DROPS" title="جدیدترین‌ها" sub="تازه‌ترین دراپ‌های لابی — اول از همه تو امتحان کن." href="/products?sort=newest" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.newest.slice(0, 8).map((p) => (
                    <ZgCard key={p.id} product={p} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑧ BESTSELLERS — LEADERBOARD (neon ranks · sold as کِیل) ═══ */}
          {data.bestsellers.length > 0 && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6" aria-labelledby="zg-lb">
              <Reveal>
                <ZgHead id="zg-lb" code="HALL_OF_FAME" title="بردبورد پرفروش‌ها" sub="رتبه‌بندی زنده بر اساس تعداد فروش — این ماه چه کسی صدرنشین است؟" href="/products?sort=bestselling" />
                <div className="zg-glass no-scrollbar max-h-[26rem] overflow-y-auto rounded-3xl p-3 sm:p-4">
                  <ul className="space-y-3">
                    {data.bestsellers.slice(0, 8).map((p, i) => (
                      <LbRow key={p.id} product={p} rank={i + 1} />
                    ))}
                  </ul>
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑨ BRANDS strip with glow logos ═══ */}
          {data.brands.length > 0 && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6" aria-label="برندهای همکار">
              <Reveal>
                <p dir="ltr" className="zg-mono mb-6 text-center">{`// SPONSORED_SQUADS`}</p>
                <ul className="flex flex-wrap justify-center gap-3">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/products?brand=${b.slug}`}
                        className="zg-brand zg-glass flex h-12 items-center gap-2.5 rounded-full px-5 text-[12.5px] font-black text-[var(--zg-ink)]"
                      >
                        {b.logo ? (
                          <span className="relative block h-7 w-7 overflow-hidden rounded-full">
                            <Image src={b.logo} alt={b.name} fill sizes="28px" className="object-contain p-0.5" loading="lazy" />
                          </span>
                        ) : (
                          <span className="zg-brand-mono" aria-hidden>
                            {b.name.trim().charAt(0)}
                          </span>
                        )}
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑩ FAQ ═══ */}
          {data.faq.length > 0 && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6" aria-labelledby="zg-faq">
              <Reveal>
                <ZgHead id="zg-faq" code="PLAYER_SUPPORT" title="پرسش‌های متداول" sub="قبل از باز کردن تیکت، جواب سوالت اینجاست." />
                <div className="no-scrollbar max-h-[26rem] space-y-3 overflow-y-auto pe-1">
                  {data.faq.map((f, i) => (
                    <ZgFaq key={i} h={f.h} p={f.p} n={i} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ⑪ JOIN COMMUNITY — magenta gradient CTA band ═══ */}
          <section className="zg-joinband relative" aria-labelledby="zg-join">
            <Swoosh second />
            <div className="relative z-[2] mx-auto w-full max-w-[1320px] px-4 py-14 sm:px-6">
              <Reveal>
                <div className="text-center">
                  <p dir="ltr" className="zg-mono text-white/80">{`// JOIN_THE_GUILD`}</p>
                  <h2 id="zg-join" className="mt-2 text-3xl font-black leading-snug text-white sm:text-4xl">
                    به گیلد <span className="text-white/60">{store.storeName}</span> بپیوند
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-8 text-white/80">
                    عضوهای گیلد از تخفیف‌های مخفی، اطلاع‌رسانی دراپ‌های جدید و پشتیبانی اولویت‌دار برای آپگرید رگشان استفاده می‌کنند. صدا را روشن کن و داخل شو.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                    <Link href="/products" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-[13.5px] font-black text-[#8B2FC9] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-14px_rgba(0,0,0,.5)] active:scale-95">
                      <Users className="h-[18px] w-[18px]" aria-hidden />
                      عضویت در گیلد
                    </Link>
                    <Link href="/products?discount=1" className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-white/40 px-8 text-[13.5px] font-black text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10 active:scale-95">
                      <Flame className="h-[18px] w-[18px]" aria-hidden />
                      مشاهده تخفیف‌ها
                    </Link>
                  </div>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
                    {[
                      { icon: ShieldCheck, t: "ضمانت اصالت کالا" },
                      { icon: Truck, t: "ارسال سریع به سراسر ایران" },
                      { icon: Headphones, t: "پشتیبانی ۲۴/۷" },
                      { icon: Gamepad2, t: "مشاوره ساخت رگ" },
                    ].map((c) => (
                      <span key={c.t} className="zg-join-chip text-[11px] font-bold">
                        <c.icon className="h-4 w-4" aria-hidden />
                        {c.t}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* empty state */}
          {!hasAnyProduct && (
            <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6">
              <div className="zg-glass rounded-3xl p-16 text-center">
                <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-[var(--zg-mag)] opacity-60" aria-hidden />
                <h2 className="text-lg font-black text-[var(--zg-ink)]">لابی هنوز خالی است</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--zg-dim)]">
                  تجهیزات در راه‌اند — به‌زودی اولین دراپ روی ویترین می‌نشیند…
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

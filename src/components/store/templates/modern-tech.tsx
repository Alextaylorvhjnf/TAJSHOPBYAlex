"use client";

/**
 * DEFAULT STOREFRONT TEMPLATE — «مدرن تِک» v25 · CYBER-LUXE DARK
 * ----------------------------------------------------------------
 * A futuristic "void-black" flagship storefront: electric-blue → cyan
 * neon glows, glass panels, HUD corner brackets, grid-field backdrops,
 * scanline dividers and live flash-deal countdowns. Fully self-contained
 * (zero shared-chrome dependencies) — everything is rendered from the
 * read-only HomeData contract with graceful empty-data handling.
 *
 * Section flow: announcement ticker → stories → cinematic hero slider →
 * category rail → stats HUD → flash deals (live timers) → exclusive
 * cinematic cards → featured flagship grid → bestseller rank rail →
 * newest hybrid list → AI consultant teaser → showcase duo → brands
 * marquee → FAQ → glowing closing divider.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { formatPrice, toFaDigits } from "@/lib/format";
import { useCart } from "@/hooks/use-store";
import { StoryViewer } from "../story-viewer";
import {
  Sparkles, TrendingUp, Flame, Star, Crown, Zap, Gem, HelpCircle,
  Smartphone, Laptop, Computer, Cpu, Monitor, Gamepad2,
  Headphones, BatteryCharging, Watch, Projector, Wifi, HardDrive,
  Keyboard, Mouse, Camera, Speaker, ChevronLeft, ChevronRight, ArrowLeft,
  BrainCircuit, Package, LayoutGrid, Award, ShoppingCart, Check, Plus,
  BadgeCheck,
} from "lucide-react";

/* ─────────────────────────── palette ─────────────────────────── */

const VOID = "#0B0E14"; // page background
const PANEL = "#161B26"; // raised surfaces
const BLUE = "#007AFF"; // electric blue
const CYAN = "#00D4FF"; // neon cyan
const GREY = "#A0AAB5"; // cool body text
const LINE = "rgba(255,255,255,0.07)"; // hairline borders

/** category slug → lucide icon (icon string travels in HomeData) */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Zap, headphones: Headphones, earbuds: Zap, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/** scoped CSS — everything lives under [data-tpl="modern-tech"] */
const CSS = `
[data-tpl="modern-tech"]{
  --mt-void:${VOID}; --mt-panel:${PANEL}; --mt-blue:${BLUE}; --mt-cyan:${CYAN};
  --mt-grey:${GREY}; --mt-line:${LINE};
  background:var(--mt-void); color:var(--mt-grey);
  -webkit-font-smoothing:antialiased;
}
[data-tpl="modern-tech"] :focus-visible{ outline:2px solid var(--mt-cyan); outline-offset:2px; }

/* grid-field backdrop (44px · 4% white) */
[data-tpl="modern-tech"] .mt-grid{
  background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);
  background-size:44px 44px;
}

/* radial glow orbs */
[data-tpl="modern-tech"] .mt-orb{ position:absolute; border-radius:9999px; pointer-events:none; filter:blur(80px); }

/* glass panel */
[data-tpl="modern-tech"] .mt-glass{
  background:rgba(255,255,255,0.03); border:1px solid var(--mt-line);
  -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px);
}

/* lifting card + luminous top hairline on hover */
[data-tpl="modern-tech"] .mt-lift{ position:relative; transition:transform .4s cubic-bezier(.2,.7,.3,1),border-color .4s,box-shadow .4s; }
[data-tpl="modern-tech"] .mt-lift::before{
  content:""; position:absolute; z-index:2; top:-1px; inset-inline:14%; height:1px;
  background:linear-gradient(90deg,transparent,var(--mt-cyan),transparent);
  opacity:0; transition:opacity .4s; pointer-events:none;
}
[data-tpl="modern-tech"] .mt-lift:hover{
  transform:translateY(-4px); border-color:rgba(0,212,255,0.35);
  box-shadow:0 18px 44px -18px rgba(0,212,255,0.28);
}
[data-tpl="modern-tech"] .mt-lift:hover::before{ opacity:1; }

/* HUD corner brackets */
[data-tpl="modern-tech"] .mt-hud i{
  position:absolute; width:22px; height:22px; border:0 solid rgba(0,212,255,0.85);
  pointer-events:none; z-index:3;
}
[data-tpl="modern-tech"] .mt-hud i.c1{ top:10px; inset-inline-start:10px; border-top-width:2px; border-inline-start-width:2px; border-start-start-radius:6px; }
[data-tpl="modern-tech"] .mt-hud i.c2{ top:10px; inset-inline-end:10px; border-top-width:2px; border-inline-end-width:2px; border-start-end-radius:6px; }
[data-tpl="modern-tech"] .mt-hud i.c3{ bottom:10px; inset-inline-start:10px; border-bottom-width:2px; border-inline-start-width:2px; border-end-start-radius:6px; }
[data-tpl="modern-tech"] .mt-hud i.c4{ bottom:10px; inset-inline-end:10px; border-bottom-width:2px; border-inline-end-width:2px; border-end-end-radius:6px; }

/* animated gradient border (hero CTA) */
[data-tpl="modern-tech"] .mt-cta{
  display:inline-block; padding:1.5px; border-radius:16px;
  background:linear-gradient(90deg,var(--mt-blue),var(--mt-cyan),#7EF9FF,var(--mt-blue));
  background-size:200% 100%;
  animation:mt-border 4.5s linear infinite;
}
[data-tpl="modern-tech"] .mt-cta:hover{ box-shadow:0 0 35px -8px rgba(0,212,255,0.5); }
[data-tpl="modern-tech"] .mt-cta > *{ border-radius:14.5px; }
@keyframes mt-border{ from{ background-position:0 0; } to{ background-position:200% 0; } }

/* scanline divider with travelling shimmer */
[data-tpl="modern-tech"] .mt-scanline{
  position:relative; height:1px; overflow:visible;
  background:linear-gradient(90deg,transparent,rgba(0,212,255,0.4),rgba(0,122,255,0.4),transparent);
}
[data-tpl="modern-tech"] .mt-scanline::after{
  content:""; position:absolute; top:-2px; left:-15%; width:130px; height:5px; filter:blur(4px);
  background:linear-gradient(90deg,transparent,rgba(0,212,255,0.9),transparent);
  animation:mt-scan 4.8s linear infinite;
}
@keyframes mt-scan{ from{ left:-15%; } to{ left:110%; } }

/* small glowing rule above section titles */
[data-tpl="modern-tech"] .mt-rule{
  width:34px; height:2px; border-radius:2px; margin-bottom:14px;
  background:linear-gradient(90deg,var(--mt-blue),var(--mt-cyan));
  box-shadow:0 0 14px rgba(0,212,255,0.55);
}

/* glowing numeric counter */
[data-tpl="modern-tech"] .mt-num{ font-variant-numeric:tabular-nums; text-shadow:0 0 24px rgba(0,212,255,0.45); }

/* discount pill */
[data-tpl="modern-tech"] .mt-pill{
  background:linear-gradient(135deg,var(--mt-blue),var(--mt-cyan));
  box-shadow:0 0 20px -3px rgba(0,212,255,0.65);
}

/* neon ring appearing on image hover */
[data-tpl="modern-tech"] .mt-ring{
  position:absolute; inset:10px; border-radius:16px; border:1px solid rgba(0,212,255,0.55);
  box-shadow:0 0 26px -6px rgba(0,212,255,0.55), inset 0 0 22px -12px rgba(0,212,255,0.6);
  opacity:0; transform:scale(1.04); transition:opacity .45s,transform .45s; pointer-events:none;
}
[data-tpl="modern-tech"] .group:hover .mt-ring, [data-tpl="modern-tech"] .group:focus-within .mt-ring{ opacity:1; transform:scale(1); }

/* live pulsing dot */
[data-tpl="modern-tech"] .mt-live{ animation:mt-pulse 1.8s ease-in-out infinite; }
@keyframes mt-pulse{
  0%,100%{ opacity:1; box-shadow:0 0 0 0 rgba(0,212,255,0.55); }
  50%{ opacity:.55; box-shadow:0 0 0 7px rgba(0,212,255,0); }
}

/* floating hero mini-card */
[data-tpl="modern-tech"] .mt-float{ animation:mt-float 6s ease-in-out infinite; }
@keyframes mt-float{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-10px); } }

/* hero title rise-in (re-mounted per slide via key) */
[data-tpl="modern-tech"] .mt-rise{ animation:mt-rise .8s cubic-bezier(.2,.7,.3,1) both; }
@keyframes mt-rise{ from{ opacity:0; transform:translateY(24px); } to{ opacity:1; transform:translateY(0); } }

/* infinite marquee (brands / announcement) */
[data-tpl="modern-tech"] .mt-marquee{ overflow:hidden; }
[data-tpl="modern-tech"] .mt-marquee-track{ display:flex; width:max-content; animation:mt-marquee var(--mt-mq,30s) linear infinite; }
[data-tpl="modern-tech"] .mt-marquee:hover .mt-marquee-track{ animation-play-state:paused; }
@keyframes mt-marquee{ from{ transform:translateX(0); } to{ transform:translateX(-50%); } }

/* FAQ native details */
[data-tpl="modern-tech"] details.mt-faq summary{ list-style:none; cursor:pointer; }
[data-tpl="modern-tech"] details.mt-faq summary::-webkit-details-marker{ display:none; }
[data-tpl="modern-tech"] details.mt-faq[open] .mt-faq-icon{ transform:rotate(45deg); }
[data-tpl="modern-tech"] .mt-faq-icon{ transition:transform .35s; }

/* tilt showcase banner */
[data-tpl="modern-tech"] .mt-tilt{ transition:transform .55s cubic-bezier(.2,.7,.3,1),box-shadow .55s; }
[data-tpl="modern-tech"] .mt-tilt:hover{ transform:perspective(900px) rotateX(3deg) rotateY(-3deg) translateY(-5px); box-shadow:0 26px 60px -24px rgba(0,212,255,0.35); }

/* neon scrollbar for horizontal rails */
[data-tpl="modern-tech"] .mt-scroll{ scrollbar-width:thin; scrollbar-color:rgba(0,212,255,0.35) rgba(255,255,255,0.04); }
[data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar{ height:6px; }
[data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-track{ background:rgba(255,255,255,0.04); border-radius:999px; }
[data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-thumb{ background:rgba(0,212,255,0.3); border-radius:999px; }
[data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-thumb:hover{ background:rgba(0,212,255,0.55); }
[data-tpl="modern-tech"] .mt-noscroll{ scrollbar-width:none; -ms-overflow-style:none; }
[data-tpl="modern-tech"] .mt-noscroll::-webkit-scrollbar{ display:none; }

/* sold-progress bar fill */
[data-tpl="modern-tech"] .mt-bar{
  background:linear-gradient(90deg,var(--mt-blue),var(--mt-cyan));
  box-shadow:0 0 12px -2px rgba(0,212,255,0.7);
  transition:width 1.2s cubic-bezier(.2,.7,.3,1);
}

@media (prefers-reduced-motion: reduce){
  [data-tpl="modern-tech"] *, [data-tpl="modern-tech"] *::before, [data-tpl="modern-tech"] *::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}

/* ═══ v26fix · LIGHT-MODE SKIN — html:not(.dark) only · dark design untouched ═══ */
html:not(.dark) [data-tpl="modern-tech"]{
  --mt-void:#F4F7FB; --mt-panel:#FFFFFF; --mt-blue:#007AFF; --mt-cyan:#00D4FF;
  --mt-grey:#525E6E; --mt-line:rgba(29,38,53,0.12);
  background:var(--mt-void); color:var(--mt-grey);
}
/* raw-hex surfaces */
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#161B26\\]{ background-color:#FFFFFF; }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#0D1119\\]{ background-color:#E9EFF7; }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#0F1420\\]{ background-color:#EDF1F8; }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#0B0E14\\]\\/90{ background-color:#F7FAFD; }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#0B0E14\\]\\/80{ background-color:rgba(255,255,255,0.88); }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#00D4FF\\]{ background-color:#0090C6; }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#00D4FF\\]\\/\\[0\\.07\\]{ background-color:rgba(0,114,168,0.08); }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#00D4FF\\]\\/\\[0\\.08\\]{ background-color:rgba(0,114,168,0.09); }
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#F5B54A\\]\\/\\[0\\.08\\]{ background-color:rgba(200,134,13,0.1); }
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#0B0E14\\]{ border-color:#F4F7FB; }
html:not(.dark) [data-tpl="modern-tech"] .border-t-\\[\\#00D4FF\\]{ border-top-color:#0072A8; }
/* raw-hex ink */
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#00D4FF\\]{ color:#0072A8; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#7EF9FF\\]{ color:#0090C6; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#A0AAB5\\]{ color:#525E6E; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#E8EDF5\\]{ color:#253244; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#39435A\\]{ color:#C3CDDC; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#F5B54A\\]{ color:#C8860D; }
html:not(.dark) [data-tpl="modern-tech"] .text-\\[\\#FFC247\\]{ color:#B45309; }
html:not(.dark) [data-tpl="modern-tech"] .text-white{ color:#1D2635; }
html:not(.dark) [data-tpl="modern-tech"] .text-white\\/\\[0\\.16\\]{ color:rgba(29,38,53,0.28); }
/* cyan / amber borders */
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#00D4FF\\]\\/25{ border-color:rgba(0,114,168,0.35); }
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#00D4FF\\]\\/30{ border-color:rgba(0,114,168,0.4); }
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#00D4FF\\]\\/35{ border-color:rgba(0,114,168,0.45); }
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#00D4FF\\]\\/40{ border-color:rgba(0,114,168,0.5); }
html:not(.dark) [data-tpl="modern-tech"] .border-\\[\\#F5B54A\\]\\/30{ border-color:rgba(200,134,13,0.35); }
/* white-alpha utilities -> ink-alpha */
html:not(.dark) [data-tpl="modern-tech"] .bg-white\\/\\[0\\.02\\]{ background-color:rgba(29,38,53,0.02); }
html:not(.dark) [data-tpl="modern-tech"] .bg-white\\/\\[0\\.03\\]{ background-color:rgba(29,38,53,0.03); }
html:not(.dark) [data-tpl="modern-tech"] .bg-white\\/\\[0\\.04\\]{ background-color:rgba(29,38,53,0.04); }
html:not(.dark) [data-tpl="modern-tech"] .bg-white\\/\\[0\\.07\\]{ background-color:rgba(29,38,53,0.08); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.06\\]{ border-color:rgba(29,38,53,0.1); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.07\\]{ border-color:rgba(29,38,53,0.11); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.08\\]{ border-color:rgba(29,38,53,0.12); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.09\\]{ border-color:rgba(29,38,53,0.13); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.1\\]{ border-color:rgba(29,38,53,0.14); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.12\\]{ border-color:rgba(29,38,53,0.16); }
html:not(.dark) [data-tpl="modern-tech"] .border-white\\/\\[0\\.14\\]{ border-color:rgba(29,38,53,0.18); }
/* hover / group-hover variants */
html:not(.dark) [data-tpl="modern-tech"] .hover\\:text-\\[\\#00D4FF\\]:hover{ color:#0072A8; }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:text-\\[\\#7EF9FF\\]:hover{ color:#0090C6; }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:bg-\\[\\#00D4FF\\]\\/\\[0\\.08\\]:hover{ background-color:rgba(0,114,168,0.08); }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:bg-\\[\\#00D4FF\\]\\/\\[0\\.06\\]:hover{ background-color:rgba(0,114,168,0.07); }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:border-\\[\\#00D4FF\\]\\/25:hover{ border-color:rgba(0,114,168,0.4); }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:border-\\[\\#00D4FF\\]\\/40:hover{ border-color:rgba(0,114,168,0.5); }
html:not(.dark) [data-tpl="modern-tech"] .hover\\:border-\\[\\#00D4FF\\]\\/45:hover{ border-color:rgba(0,114,168,0.55); }
html:not(.dark) [data-tpl="modern-tech"] .group-hover\\:text-\\[\\#00D4FF\\]:is(:where(.group):hover, :where(.group):hover *){ color:#0072A8; }
html:not(.dark) [data-tpl="modern-tech"] .group-hover\\:text-\\[\\#E8EDF5\\]:is(:where(.group):hover, :where(.group):hover *){ color:#253244; }
html:not(.dark) [data-tpl="modern-tech"] .group-hover\\:text-white:is(:where(.group):hover, :where(.group):hover *){ color:#1D2635; }
/* gradients — chrome blend strips + tinted ticker + rank gradient-text (accent gradients stay vivid) */
html:not(.dark) [data-tpl="modern-tech"] > .bg-gradient-to-b.to-\\[\\#0B0E14\\]{ --tw-gradient-to:#F4F7FB; }
html:not(.dark) [data-tpl="modern-tech"] > .bg-gradient-to-b.from-\\[\\#0B0E14\\]{ --tw-gradient-from:#F4F7FB; }
html:not(.dark) [data-tpl="modern-tech"] .from-\\[\\#007AFF\\]\\/\\[0\\.12\\]{ --tw-gradient-from:rgba(0,114,168,0.1); }
html:not(.dark) [data-tpl="modern-tech"] .via-\\[\\#0E1522\\]{ --tw-gradient-via:#E7EDF6; }
html:not(.dark) [data-tpl="modern-tech"] .to-\\[\\#00D4FF\\]\\/\\[0\\.12\\]{ --tw-gradient-to:rgba(0,114,168,0.1); }
html:not(.dark) [data-tpl="modern-tech"] .from-\\[\\#7EF9FF\\]{ --tw-gradient-from:#00D4FF; }
/* scoped helpers -> light */
html:not(.dark) [data-tpl="modern-tech"] .mt-grid{
  background-image:linear-gradient(rgba(29,38,53,0.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(29,38,53,0.055) 1px,transparent 1px);
}
html:not(.dark) [data-tpl="modern-tech"] .mt-glass{ background:rgba(255,255,255,0.65); border-color:rgba(29,38,53,0.12); }
html:not(.dark) [data-tpl="modern-tech"] .mt-lift:hover{ border-color:rgba(0,114,168,0.5); box-shadow:0 18px 44px -18px rgba(0,114,168,0.22); }
html:not(.dark) [data-tpl="modern-tech"] .mt-hud i{ border-color:rgba(0,114,168,0.7); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scanline{ background:linear-gradient(90deg,transparent,rgba(0,114,168,0.55),rgba(0,102,204,0.5),transparent); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scanline::after{ background:linear-gradient(90deg,transparent,rgba(0,140,205,0.85),transparent); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scroll{ scrollbar-color:rgba(0,114,168,0.4) rgba(29,38,53,0.06); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-track{ background:rgba(29,38,53,0.06); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-thumb{ background:rgba(0,114,168,0.35); }
html:not(.dark) [data-tpl="modern-tech"] .mt-scroll::-webkit-scrollbar-thumb:hover{ background:rgba(0,114,168,0.55); }
/* dark-surface restores — cinematic hero (photo overlays stay dark) */
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-\\[\\#E8EDF5\\]{ color:#E8EDF5; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-\\[\\#A0AAB5\\]{ color:#A0AAB5; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-\\[\\#00D4FF\\]{ color:#00D4FF; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-\\[\\#7EF9FF\\]{ color:#7EF9FF; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .text-\\[\\#39435A\\]{ color:#39435A; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .hover\\:text-\\[\\#00D4FF\\]:hover{ color:#00D4FF; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .hover\\:border-\\[\\#00D4FF\\]\\/40:hover{ border-color:rgba(0,212,255,0.4); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .bg-\\[\\#0F1420\\]{ background-color:#0F1420; }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .bg-white\\/\\[0\\.04\\]{ background-color:rgba(255,255,255,0.04); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .border-white\\/\\[0\\.09\\]{ border-color:rgba(255,255,255,0.09); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .border-white\\/\\[0\\.1\\]{ border-color:rgba(255,255,255,0.1); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .border-white\\/\\[0\\.12\\]{ border-color:rgba(255,255,255,0.12); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .border-\\[\\#00D4FF\\]\\/25{ border-color:rgba(0,212,255,0.25); }
html:not(.dark) [data-tpl="modern-tech"] section[aria-label="اسلایدر اصلی فروشگاه"] .mt-grid{
  background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);
}
/* gradient CTA pills keep their dark interior */
html:not(.dark) [data-tpl="modern-tech"] .mt-cta .text-white{ color:#fff; }
html:not(.dark) [data-tpl="modern-tech"] .mt-cta .hover\\:text-\\[\\#00D4FF\\]:hover{ color:#00D4FF; }
/* showcase image banners stay cinematic */
html:not(.dark) [data-tpl="modern-tech"] .mt-tilt .text-white{ color:#fff; }
html:not(.dark) [data-tpl="modern-tech"] .mt-tilt .text-\\[\\#A0AAB5\\]{ color:#A0AAB5; }
html:not(.dark) [data-tpl="modern-tech"] .mt-tilt .text-\\[\\#00D4FF\\]{ color:#00D4FF; }
html:not(.dark) [data-tpl="modern-tech"] .mt-tilt .border-white\\/\\[0\\.06\\]{ border-color:rgba(255,255,255,0.06); }
html:not(.dark) [data-tpl="modern-tech"] .mt-tilt .border-\\[\\#00D4FF\\]\\/40{ border-color:rgba(0,212,255,0.4); }
/* story chips: dark badge + video play keep white */
html:not(.dark) [data-tpl="modern-tech"] .bg-\\[\\#0B0E14\\].text-\\[\\#00D4FF\\]{ color:#00D4FF; }
html:not(.dark) [data-tpl="modern-tech"] .bg-black\\/55.text-white{ color:#fff; }
/* immersive story viewer overlay keeps its dark design */
html:not(.dark) [data-tpl="modern-tech"] .z-\\[100\\].fixed .text-white{ color:#fff; }
`;

/* ───────────────────── tiny building blocks ───────────────────── */

/** scroll-reveal wrapper (framer-motion · once) */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 0.7, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** decorative HUD corner brackets */
function HudCorners() {
  return (
    <span aria-hidden className="mt-hud">
      <i className="c1" /><i className="c2" /><i className="c3" /><i className="c4" />
    </span>
  );
}

/** scanline section divider */
function ScanDivider() {
  return <div aria-hidden className="mt-scanline" />;
}

/** section heading with kicker chip + glow rule */
function SectionHead({
  kicker, title, sub, icon: Icon, href, hrefLabel = "مشاهده همه",
}: {
  kicker: string; title: string; sub?: string; icon: React.ElementType;
  href?: string; hrefLabel?: string;
}) {
  return (
    <div className="mb-6">
      <div aria-hidden className="mt-rule" />
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/25 bg-[#00D4FF]/[0.07] px-3 py-1 text-[10.5px] font-bold text-[#00D4FF]">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {kicker}
          </p>
          <h2 className="text-[22px] font-black tracking-tight text-white sm:text-[27px]">{title}</h2>
          {sub ? <p className="mt-1.5 max-w-xl text-[12.5px] leading-6 text-[#A0AAB5]">{sub}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 text-[12px] font-bold text-[#E8EDF5] transition-colors hover:border-[#00D4FF]/45 hover:bg-[#00D4FF]/[0.08] hover:text-[#00D4FF]"
          >
            {hrefLabel}
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** rating stars with partial fill (amber against the cyan world) */
function Stars({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const star = <Star className="h-3.5 w-3.5" />;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`امتیاز ${rating.toLocaleString("fa-IR")} از ۵`}>
      <span className="relative inline-flex leading-none" dir="ltr" aria-hidden>
        <span className="flex gap-0.5 text-[#39435A]">{star}{star}{star}{star}{star}</span>
        <span className="absolute inset-y-0 start-0 flex gap-0.5 overflow-hidden text-[#F5B54A]" style={{ width: `${pct}%` }}>
          {star}{star}{star}{star}{star}
        </span>
      </span>
      {rating > 0 ? (
        <span className="text-[11px] font-bold tabular-nums text-[#E8EDF5]">
          {rating.toLocaleString("fa-IR")}
          {reviewCount ? <span className="font-normal text-[#A0AAB5]"> ({toFaDigits(reviewCount)} نظر)</span> : null}
        </span>
      ) : (
        <span className="text-[11px] text-[#A0AAB5]">جدید</span>
      )}
    </span>
  );
}

/* ───────────────── hydration-safe live helpers ───────────────── */

/** ticking clock — null on the server & first paint (hydration-safe) */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick); // first value lands on the next frame
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [active]);
  return now;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** single countdown digit box */
function CdBox({ v, label }: { v: string; label: string }) {
  return (
    <span className="grid min-w-[46px] place-items-center rounded-lg border border-white/[0.09] bg-[#0B0E14]/90 px-2 py-1.5">
      <span className="text-[15px] font-black tabular-nums leading-none text-[#7EF9FF]">{toFaDigits(v)}</span>
      <span className="mt-1 text-[8.5px] leading-none text-[#A0AAB5]">{label}</span>
    </span>
  );
}

/** per-product flash countdown (dashes until the client clock ticks) */
function Countdown({ deadline }: { deadline: string }) {
  const now = useNow(true);
  const parts = { h: "--", m: "--", s: "--" };
  if (now !== null) {
    const diff = Math.max(0, new Date(deadline).getTime() - now);
    const totalSec = Math.floor(diff / 1000);
    parts.h = pad2(Math.floor(totalSec / 3600));
    parts.m = pad2(Math.floor((totalSec % 3600) / 60));
    parts.s = pad2(totalSec % 60);
  }
  return (
    <div className="flex items-center gap-1" dir="ltr" aria-label="پایان تخفیف">
      <CdBox v={parts.h} label="ساعت" />
      <span className="text-[13px] font-black text-[#00D4FF]" aria-hidden>:</span>
      <CdBox v={parts.m} label="دقیقه" />
      <span className="text-[13px] font-black text-[#00D4FF]" aria-hidden>:</span>
      <CdBox v={parts.s} label="ثانیه" />
    </div>
  );
}

/** mount-only count-up (SSR renders the final value → no hydration diff) */
function useCountUp(target: number, duration = 1500) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    if (target <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3)))); // frame 0 ≈ 0 → rises to target
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ───────────────────────── hero slider ───────────────────────── */

function HeroSlider({ data }: { data: HomeData }) {
  const slides = data.slides;
  const [idx, setIdx] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [count]);

  const go = (n: number) => setIdx(((n % count) + count) % count);
  const s = slides[Math.min(idx, Math.max(0, count - 1))];

  return (
    <section aria-label="اسلایدر اصلی فروشگاه" className="relative h-[420px] w-full overflow-hidden sm:h-[560px]">
      {/* artworks (stacked crossfade · mobile art swap) */}
      {slides.map((sl, i) => (
        <div
          key={sl.id}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${i === idx ? "z-10 opacity-100" : "z-0 opacity-0"}`}
        >
          <Image
            src={sl.image}
            alt={sl.title}
            fill priority={i === 0}
            sizes="100vw"
            className={`object-cover ${sl.mobileImage ? "hidden sm:block" : ""}`}
          />
          {sl.mobileImage ? (
            <Image
              src={sl.mobileImage}
              alt={sl.title}
              fill priority={i === 0}
              sizes="100vw"
              className="object-cover sm:hidden"
            />
          ) : null}
        </div>
      ))}

      {/* cinematic overlays */}
      <div aria-hidden className="absolute inset-0 z-10 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-[#0B0E14]/15" />
      <div aria-hidden className="absolute inset-0 z-10 bg-gradient-to-l from-[#0B0E14]/80 via-[#0B0E14]/20 to-transparent" />
      <div aria-hidden className="absolute inset-0 z-10 mt-grid opacity-50 [mask-image:linear-gradient(to_top,black_20%,transparent_75%)]" />
      <div aria-hidden className="absolute inset-0 z-10 shadow-[inset_0_0_130px_rgba(11,14,20,0.85)]" />
      <div aria-hidden className="mt-orb -start-24 bottom-0 z-10 h-72 w-72 bg-[#007AFF]/20" />

      {/* HUD slide counter */}
      {count > 0 ? (
        <div className="absolute end-4 top-4 z-30 rounded-lg border border-white/[0.09] bg-[#0B0E14]/70 px-3 py-1.5 backdrop-blur-md">
          <span className="mt-num text-[12px] font-black text-[#7EF9FF]">{toFaDigits(pad2(idx + 1))}</span>
          <span className="mx-1 text-[11px] text-[#A0AAB5]" aria-hidden>/</span>
          <span className="text-[11px] tabular-nums text-[#A0AAB5]">{toFaDigits(pad2(count))}</span>
        </div>
      ) : null}

      {/* content */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:pb-20">
          {s ? (
            <>
              <p key={`k-${idx}`} className="mt-rise mb-4 inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/25 bg-[#0B0E14]/60 px-3.5 py-1.5 text-[11px] font-bold text-[#00D4FF] backdrop-blur-md">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                {data.store.storeNameEn || data.store.storeName} · مرکز تکنولوژی
              </p>
              <h1 key={`t-${idx}`} className="mt-rise max-w-2xl text-[30px] font-black leading-[1.2] tracking-tight text-white sm:text-5xl sm:leading-[1.15]">
                {s.title}
              </h1>
              {s.subtitle ? (
                <p key={`s-${idx}`} className="mt-rise mt-3.5 max-w-xl text-[13.5px] leading-7 text-[#A0AAB5] sm:text-[15px] sm:leading-8">
                  {s.subtitle}
                </p>
              ) : null}
              <div key={`c-${idx}`} className="mt-rise mt-7 flex flex-wrap items-center gap-3">
                <span className="mt-cta">
                  <Link
                    href={s.ctaUrl || "/products"}
                    className="flex h-12 items-center gap-2 bg-[#0B0E14]/92 px-7 text-[13.5px] font-black text-white transition-colors hover:text-[#00D4FF]"
                  >
                    {s.ctaText || "شروع خرید"}
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </span>
                <Link
                  href="/products"
                  className="inline-flex h-12 items-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 text-[13px] font-bold text-[#E8EDF5] backdrop-blur-md transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
                >
                  گشت‌وگذار در فروشگاه
                </Link>
              </div>
            </>
          ) : (
            /* no slides configured — static store intro hero */
            <>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/25 bg-[#0B0E14]/60 px-3.5 py-1.5 text-[11px] font-bold text-[#00D4FF] backdrop-blur-md">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                {data.store.storeNameEn || "TAJ"} · مرکز تکنولوژی
              </p>
              <h1 className="max-w-2xl text-[30px] font-black leading-[1.2] tracking-tight text-white sm:text-5xl sm:leading-[1.15]">
                {data.store.storeName}
              </h1>
              <p className="mt-3.5 max-w-xl text-[13.5px] leading-7 text-[#A0AAB5] sm:text-[15px]">
                مقصد بعدی شما برای خرید کالای دیجیتال — همیشه به‌روز، همیشه اصیل.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="mt-cta">
                  <Link href="/products" className="flex h-12 items-center gap-2 bg-[#0B0E14]/92 px-7 text-[13.5px] font-black text-white transition-colors hover:text-[#00D4FF]">
                    مشاهده محصولات
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* floating product mini-card (desktop) */}
      {s?.product ? (
        <Link
          href={`/products/${s.product.slug}`}
          className="mt-float absolute bottom-28 end-8 z-30 hidden w-64 rounded-2xl border border-white/[0.09] bg-[#0B0E14]/75 p-3 backdrop-blur-xl transition-colors hover:border-[#00D4FF]/50 lg:block"
        >
          <div className="flex items-center gap-3">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#0F1420]">
              {s.product.mainImage ? (
                <Image src={s.product.mainImage} alt={s.product.name} fill sizes="64px" className="object-contain p-1.5" />
              ) : (
                <span className="grid h-full place-items-center text-[#39435A]"><Package className="h-6 w-6" /></span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-white">{s.product.name}</span>
              <span className="mt-1.5 block">
                {s.product.discountPrice ? (
                  <>
                    <span className="block text-[10px] tabular-nums text-[#A0AAB5] line-through">{formatPrice(s.product.price)}</span>
                    <span className="block text-[13px] font-black tabular-nums text-[#00D4FF]">{formatPrice(s.product.discountPrice)}</span>
                  </>
                ) : (
                  <span className="block text-[13px] font-black tabular-nums text-white">{formatPrice(s.product.price)}</span>
                )}
              </span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-[#00D4FF]" aria-hidden />
          </div>
        </Link>
      ) : null}

      {/* arrows */}
      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(idx + 1)}
            aria-label="اسلاید بعدی"
            className="absolute end-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/[0.1] bg-[#0B0E14]/60 text-white backdrop-blur-md transition-all hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15 hover:text-[#00D4FF]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(idx - 1)}
            aria-label="اسلاید قبلی"
            className="absolute start-4 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/[0.1] bg-[#0B0E14]/60 text-white backdrop-blur-md transition-all hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15 hover:text-[#00D4FF]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}

      {/* dots */}
      {count > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2" role="tablist" aria-label="انتخاب اسلاید">
          {slides.map((sl, i) => (
            <button
              key={sl.id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`اسلاید ${toFaDigits(i + 1)}`}
              onClick={() => go(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-8 bg-gradient-to-l from-[#007AFF] to-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.6)]" : "w-2.5 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ───────────────────── flagship product card ───────────────────── */

function QuickAdd({ p, currency }: { p: TemplateProduct; currency: string }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onAdd = async () => {
    if (!p.inStock || busy) return;
    setBusy(true);
    try {
      await add.mutateAsync({ productId: p.id, quantity: 1 });
      setDone(true);
      window.setTimeout(() => setDone(false), 1300);
    } catch {
      /* toast handled by the useCart hook */
    } finally {
      setBusy(false);
    }
  };

  if (!p.inStock) {
    return (
      <span className="grid h-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[12px] font-bold text-[#A0AAB5]">
        فعلاً ناموجود
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      aria-label={`افزودن ${p.name} به سبد خرید`}
      className={`grid h-10 place-items-center rounded-xl text-[12.5px] font-black transition-all ${
        done
          ? "bg-gradient-to-l from-[#00D4FF] to-[#007AFF] text-[#04121C] shadow-[0_0_25px_-6px_rgba(0,212,255,0.7)]"
          : "border border-[#00D4FF]/35 bg-[#00D4FF]/[0.08] text-[#00D4FF] hover:bg-[#00D4FF]/15 hover:shadow-[0_0_22px_-8px_rgba(0,212,255,0.6)]"
      } ${busy ? "opacity-70" : ""}`}
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#00D4FF]/30 border-t-[#00D4FF]" aria-hidden />
      ) : done ? (
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden /> به سبد اضافه شد</span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4" aria-hidden />
          افزودن سریع
          <span className="sr-only">— قیمت {formatPrice(p.effectivePrice)} {currency}</span>
        </span>
      )}
    </button>
  );
}

/** THE flagship glass card — neon hover ring · zoom · glow pill */
function FlagshipCard({ p, currency }: { p: TemplateProduct; currency: string }) {
  return (
    <article className="mt-lift group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#161B26]">
      <Link
        href={`/products/${p.slug}`}
        className="relative block aspect-square overflow-hidden bg-[#0F1420]"
        aria-label={p.name}
      >
        {p.mainImage ? (
          <Image
            src={p.mainImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#39435A]"><Package className="h-12 w-12" aria-hidden /></span>
        )}
        <span className="mt-ring" aria-hidden />
        {p.discountPercent > 0 ? (
          <span className="mt-pill absolute start-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10.5px] font-black tabular-nums text-[#04121C]">
            {toFaDigits(p.discountPercent)}٪ تخفیف
          </span>
        ) : null}
        {!p.inStock ? (
          <span className="absolute end-3 top-3 z-10 rounded-full border border-white/[0.14] bg-[#0B0E14]/80 px-2.5 py-1 text-[10px] font-bold text-[#A0AAB5] backdrop-blur-md">
            ناموجود
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <p className="mb-1 flex items-center gap-1 text-[10.5px] text-[#A0AAB5]">
          <BadgeCheck className="h-3 w-3 text-[#00D4FF]" aria-hidden />
          {p.brand.name}
        </p>
        <Link href={`/products/${p.slug}`} className="line-clamp-2 min-h-11 text-[13px] font-bold leading-[1.7] text-[#E8EDF5] transition-colors hover:text-[#00D4FF]">
          {p.name}
        </Link>
        <div className="mt-2"><Stars rating={p.rating} reviewCount={p.reviewCount} /></div>

        <div className="mt-3 flex-1">
          {p.discountPercent > 0 ? (
            <>
              <p className="text-[11px] tabular-nums text-[#A0AAB5] line-through">{formatPrice(p.price)} {currency}</p>
              <p className="mt-0.5 text-[16px] font-black tabular-nums text-[#00D4FF]">
                {formatPrice(p.effectivePrice)}
                <span className="ms-1 text-[10.5px] font-normal text-[#A0AAB5]">{currency}</span>
              </p>
            </>
          ) : (
            <p className="text-[16px] font-black tabular-nums text-white">
              {formatPrice(p.effectivePrice)}
              <span className="ms-1 text-[10.5px] font-normal text-[#A0AAB5]">{currency}</span>
            </p>
          )}
        </div>

        <div className="mt-3"><QuickAdd p={p} currency={currency} /></div>
      </div>
    </article>
  );
}

/* ─────────────────── flash-deal card (live timer) ─────────────────── */

function DealCard({ p, deadline, currency }: { p: TemplateProduct; deadline: string | null; currency: string }) {
  const total = p.soldCount + p.stock;
  const pct = total > 0 ? Math.min(96, Math.max(6, Math.round((p.soldCount / total) * 100))) : 6;
  return (
    <article className="mt-lift group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#161B26]">
      <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden bg-[#0F1420]" aria-label={p.name}>
        {p.mainImage ? (
          <Image
            src={p.mainImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#39435A]"><Package className="h-12 w-12" aria-hidden /></span>
        )}
        <span className="mt-ring" aria-hidden />
        {p.discountPercent > 0 ? (
          <span className="mt-pill absolute start-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10.5px] font-black tabular-nums text-[#04121C]">
            {toFaDigits(p.discountPercent)}٪
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 pt-3">
        <p className="text-[10.5px] text-[#A0AAB5]">{p.brand.name}</p>
        <Link href={`/products/${p.slug}`} className="line-clamp-2 min-h-11 text-[13px] font-bold leading-[1.7] text-[#E8EDF5] transition-colors hover:text-[#00D4FF]">
          {p.name}
        </Link>

        {p.discountPercent > 0 ? (
          <p className="text-[11px] tabular-nums text-[#A0AAB5] line-through">{formatPrice(p.price)} {currency}</p>
        ) : null}
        <p className="text-[15.5px] font-black tabular-nums text-[#00D4FF]">
          {formatPrice(p.effectivePrice)}
          <span className="ms-1 text-[10.5px] font-normal text-[#A0AAB5]">{currency}</span>
        </p>

        {deadline ? <Countdown deadline={deadline} /> : null}

        {/* sold progress */}
        <div className="mt-auto pt-1">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#A0AAB5]">
            <span>
              {p.soldCount > 0
                ? `${toFaDigits(p.soldCount)} فروش رفته`
                : p.inStock ? "آماده ارسال" : "موجودی تمام شد"}
            </span>
            {p.inStock && p.stock > 0 && p.stock <= 5 ? (
              <span className="font-bold text-[#FFC247]">فقط {toFaDigits(p.stock)} عدد مانده</span>
            ) : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="mt-bar h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ──────────────────── exclusive cinematic card ──────────────────── */

function ExclusiveCard({ p, currency }: { p: TemplateProduct; currency: string }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#161B26]">
      <HudCorners />
      <div aria-hidden className="mt-orb -end-16 -top-16 h-64 w-64 bg-[#007AFF]/25" />
      <div className="grid sm:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8">
          <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#F5B54A]/30 bg-[#F5B54A]/[0.08] px-3 py-1 text-[10.5px] font-black text-[#F5B54A]">
            <Gem className="h-3.5 w-3.5" aria-hidden />
            انتخاب پرو
          </p>
          <p className="text-[11px] text-[#A0AAB5]">{p.brand.name} · {p.category.name}</p>
          <Link
            href={`/products/${p.slug}`}
            className="mt-1.5 text-[20px] font-black leading-9 tracking-tight text-white transition-colors hover:text-[#00D4FF] sm:text-[24px] sm:leading-[1.4]"
          >
            {p.name}
          </Link>
          <div className="mt-3"><Stars rating={p.rating} reviewCount={p.reviewCount} /></div>
          <p className="mt-4 text-[19px] font-black tabular-nums text-[#00D4FF]">
            {formatPrice(p.effectivePrice)}
            <span className="ms-1 text-[11px] font-normal text-[#A0AAB5]">{currency}</span>
          </p>
          <Link
            href={`/products/${p.slug}`}
            className="mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-gradient-to-l from-[#007AFF] to-[#00D4FF] px-6 text-[13px] font-black text-[#04121C] transition-all hover:shadow-[0_0_30px_-6px_rgba(0,212,255,0.7)]"
          >
            مشاهده و خرید
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="relative min-h-[190px] border-t border-white/[0.06] sm:min-h-0 sm:border-s sm:border-t-0">
          <div aria-hidden className="absolute inset-0 mt-grid opacity-40" />
          <div aria-hidden className="mt-orb left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 bg-[#00D4FF]/15" />
          {p.mainImage ? (
            <Image
              src={p.mainImage}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 640px"
              className="object-contain p-8"
              loading="lazy"
            />
          ) : (
            <span className="grid h-full place-items-center text-[#39435A]"><Gem className="h-14 w-14" aria-hidden /></span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────── bestseller rank rail card ─────────────────── */

function RankCard({ p, rank, currency }: { p: TemplateProduct; rank: number; currency: string }) {
  const top = rank <= 3;
  return (
    <article className="mt-lift group relative w-[205px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.07] bg-[#161B26] sm:w-[225px]">
      <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden bg-[#0F1420]" aria-label={p.name}>
        {p.mainImage ? (
          <Image
            src={p.mainImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 70vw, 225px"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#39435A]"><Package className="h-10 w-10" aria-hidden /></span>
        )}
        <span className="mt-ring" aria-hidden />
        <span
          aria-hidden
          className={`absolute start-2 top-2 z-10 select-none text-[26px] font-black leading-none tabular-nums ${
            top
              ? "bg-gradient-to-b from-[#7EF9FF] to-[#007AFF] bg-clip-text text-transparent [text-shadow:0_0_28px_rgba(0,212,255,0.45)]"
              : "text-white/[0.16]"
          }`}
        >
          {toFaDigits(pad2(rank))}
        </span>
      </Link>
      <div className="p-3.5">
        <Link href={`/products/${p.slug}`} className="line-clamp-1 text-[12.5px] font-bold text-[#E8EDF5] transition-colors hover:text-[#00D4FF]">
          {p.name}
        </Link>
        <p className="mt-1.5 text-[10.5px] text-[#A0AAB5]">
          {p.soldCount > 0 ? `${toFaDigits(p.soldCount)} خرید موفق` : p.brand.name}
        </p>
        <p className="mt-1 text-[14px] font-black tabular-nums text-[#00D4FF]">
          {formatPrice(p.effectivePrice)}
          <span className="ms-1 text-[9.5px] font-normal text-[#A0AAB5]">{currency}</span>
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────── main template ─────────────────────── */

export function ModernTechTemplate({ data }: { data: HomeData }) {
  const currency = data.store.currency || "تومان";

  /* v25: full-screen story viewer (progress bar + tap left/right + video
   * support) — clicking a story ring opens the viewer instead of navigating */
  const [storyIdx, setStoryIdx] = useState<number | null>(null);

  const tickerMsgs = useMemo(() => {
    const msgs = data.store.tickerMessages?.length
      ? data.store.tickerMessages
      : data.store.announcement
        ? [{ text: data.store.announcement, link: data.store.announcementLink }]
        : [];
    return msgs;
  }, [data.store.tickerMessages, data.store.announcement, data.store.announcementLink]);

  const showTicker = Boolean(data.store.announcementActive && tickerMsgs.length > 0);
  const tickerSpeed = data.store.tickerSpeed && data.store.tickerSpeed > 0 ? data.store.tickerSpeed : 22;

  const soldTotal = useMemo(
    () => data.bestsellers.reduce((sum, p) => sum + p.soldCount, 0),
    [data.bestsellers]
  );
  const hasStats = data.counts.products > 0 || data.counts.categories > 0 || data.counts.brands > 0 || soldTotal > 0;

  const deals = data.discounted.slice(0, 4);
  const featured = data.featured.slice(0, 8);
  const emptyCatalog =
    data.featured.length === 0 && data.newest.length === 0 &&
    data.bestsellers.length === 0 && data.discounted.length === 0;

  const half = (items: React.ReactNode[]) => <>{items}</>;
  const brandCycle = data.brands.length > 0
    ? Array.from({ length: Math.max(1, Math.ceil(6 / data.brands.length)) }).flatMap(() => data.brands)
    : [];
  const tickerCycle = tickerMsgs.length > 0
    ? Array.from({ length: Math.max(1, Math.ceil(4 / tickerMsgs.length)) }).flatMap(() => tickerMsgs)
    : [];

  return (
    <div data-tpl="modern-tech" className="relative isolate overflow-x-clip">
      <style>{CSS}</style>

      {/* soft blend from the theme chrome into the void (no-op in dark theme) */}
      <div aria-hidden className="h-14 bg-gradient-to-b from-background to-[#0B0E14]" />

      {/* 1 · announcement ticker — glowing glass strip */}
      {showTicker ? (
        <div className="relative z-20 border-b border-white/[0.06] bg-gradient-to-l from-[#007AFF]/[0.12] via-[#0E1522] to-[#00D4FF]/[0.12]">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#00D4FF]/50 to-transparent" />
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
            <span className="flex shrink-0 items-center gap-2 text-[11px] font-black text-[#00D4FF]">
              <span className="mt-live h-1.5 w-1.5 rounded-full bg-[#00D4FF]" aria-hidden />
              اعلان
            </span>
            <span className="sr-only">اعلان فروشگاه: </span>
            <div dir="ltr" className="mt-marquee min-w-0 flex-1 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
              <div className="mt-marquee-track" style={{ "--mt-mq": `${tickerSpeed}s` } as React.CSSProperties}>
                {half(tickerCycle.map((m, i) => (
                  <span key={`tk-${i}`} className="flex items-center gap-2 whitespace-nowrap px-5 py-0.5 text-[12px] font-medium text-[#E8EDF5]" dir="rtl">
                    <Sparkles className="h-3 w-3 shrink-0 text-[#00D4FF]" aria-hidden />
                    {m.link ? (
                      <Link href={m.link} className="transition-colors hover:text-[#00D4FF]">{m.text}</Link>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </span>
                )))}
                {half(tickerCycle.map((m, i) => (
                  <span key={`tk2-${i}`} className="flex items-center gap-2 whitespace-nowrap px-5 py-0.5 text-[12px] font-medium text-[#E8EDF5]" dir="rtl" aria-hidden>
                    <Sparkles className="h-3 w-3 shrink-0 text-[#00D4FF]" />
                    {m.text}
                  </span>
                )))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2 · stories — circular neon-ring avatars (v25: tap opens the
          immersive story viewer with progress bar + prev/next taps) */}
      {data.stories.length > 0 ? (
        <section aria-label="استوری‌های فروشگاه" className="mx-auto max-w-7xl px-4 pt-6">
          <Reveal>
            <div className="mt-scroll flex gap-4 overflow-x-auto pb-3">
              {data.stories.slice(0, 12).map((st, i) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStoryIdx(i)}
                  aria-label={`مشاهده استوری ${st.title}`}
                  className="group flex w-[72px] shrink-0 flex-col items-center gap-2 text-center"
                >
                  <span className="relative rounded-full bg-gradient-to-t from-[#007AFF] to-[#00D4FF] p-[2.5px] transition-shadow duration-300 group-hover:shadow-[0_0_22px_-4px_rgba(0,212,255,0.8)]">
                    <span className="relative block h-16 w-16 overflow-hidden rounded-full border-2 border-[#0B0E14] bg-[#0F1420]">
                      <Image src={st.image} alt={st.title} fill sizes="64px" className="object-cover" loading="lazy" />
                    </span>
                    {st.videoUrl && (
                      <span className="absolute inset-0 grid place-items-center" aria-hidden>
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white"><path d='M8 5v14l11-7z' /></svg>
                        </span>
                      </span>
                    )}
                    {st.badge ? (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0B0E14] px-2 py-px text-[8.5px] font-black text-[#00D4FF]">
                        {st.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-[10.5px] leading-4 text-[#A0AAB5] transition-colors group-hover:text-[#E8EDF5]">{st.title}</span>
                </button>
              ))}
            </div>
          </Reveal>
          {storyIdx !== null && (
            <StoryViewer stories={data.stories} startIndex={storyIdx} onClose={() => setStoryIdx(null)} />
          )}
        </section>
      ) : null}

      {/* 3 · cinematic hero */}
      <div className="mt-4 sm:mt-6">
        <HeroSlider data={data} />
      </div>

      {/* 4 · quick category rail — glass chips */}
      {data.categories.length > 0 ? (
        <section aria-label="دسته‌بندی‌های فروشگاه" className="mx-auto max-w-7xl px-4 pt-14 sm:pt-20">
          <Reveal>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-black tracking-tight text-white">
                <LayoutGrid className="h-4.5 w-4.5 text-[#00D4FF]" aria-hidden />
                مسیر سریع دسته‌ها
              </h2>
              <Link href="/products" className="text-[11.5px] font-bold text-[#00D4FF] transition-colors hover:text-[#7EF9FF]">
                همه محصولات
              </Link>
            </div>
            <div className="mt-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:flex-wrap lg:px-0">
              {data.categories.map((c) => {
                const Icon = CAT_ICONS[c.slug] ?? Zap;
                return (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    className="mt-lift group flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] py-2.5 pe-5 ps-3 backdrop-blur-xl transition-colors hover:border-[#00D4FF]/40"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#007AFF]/25 to-[#00D4FF]/[0.12] text-[#00D4FF] transition-colors group-hover:from-[#007AFF] group-hover:to-[#00D4FF] group-hover:text-[#04121C]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="whitespace-nowrap">
                      <span className="block text-[12.5px] font-black text-[#E8EDF5]">{c.name}</span>
                      <span className="mt-0.5 block text-[10px] tabular-nums text-[#A0AAB5]">{toFaDigits(c.productCount)} کالا</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 5 · stats HUD band */}
      {hasStats ? (
        <section aria-label="آمار فروشگاه" className="relative mt-14 overflow-hidden border-y border-white/[0.06] bg-[#0D1119] sm:mt-20">
          <div aria-hidden className="absolute inset-0 mt-grid opacity-25" />
          <div aria-hidden className="mt-orb start-[15%] -top-24 h-56 w-56 bg-[#007AFF]/[0.16]" />
          <div aria-hidden className="mt-orb end-[10%] -bottom-24 h-56 w-56 bg-[#00D4FF]/[0.12]" />
          <Reveal className="relative z-10">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-8 sm:gap-4 sm:py-10 lg:grid-cols-4">
              <StatCell icon={Package} label="کالای فعال" value={data.counts.products} suffix="+" />
              <StatCell icon={LayoutGrid} label="دسته‌بندی تخصصی" value={data.counts.categories} suffix="+" />
              <StatCell icon={Award} label="برند معتبر جهانی" value={data.counts.brands} suffix="+" />
              <StatCell icon={TrendingUp} label="خرید موفق تاج" value={soldTotal} suffix="" />
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 6 · flash deals — «پیشنهاد ویژه» with live countdowns */}
      {deals.length > 0 ? (
        <section aria-label="پیشنهادهای ویژه با زمان محدود" className="mx-auto max-w-7xl px-4 pt-14 sm:pt-20">
          <Reveal>
            <SectionHead
              kicker="فقط امروز"
              title="پیشنهادهای ویژه"
              sub="تخفیف‌های شگفت‌انگیز با زمان‌سنج زنده — فرصت بعدی همین حالا"
              icon={Flame}
              href="/products?discount=1"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {deals.map((p) => (
                <DealCard
                  key={p.id}
                  p={p}
                  deadline={p.discountEndsAt ?? data.store.timerEndsAt ?? null}
                  currency={currency}
                />
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 7 · exclusive — cinematic HUD cards */}
      {data.exclusive.length > 0 ? (
        <section aria-label="محصولات انحصاری" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead
              kicker="فقط در تاج"
              title="انتخاب‌های انحصاری"
              sub="پرچمدارهایی که فقط اینجا پیدایشان می‌کنید"
              icon={Gem}
            />
            <div className="grid gap-5 lg:grid-cols-2">
              {data.exclusive.slice(0, 2).map((p) => (
                <ExclusiveCard key={p.id} p={p} currency={currency} />
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 8 · featured flagship grid */}
      {featured.length > 0 ? (
        <section aria-label="محصولات ویژه" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead
              kicker="داغ‌ترین‌ها"
              title="محصولات ویژه"
              sub="انتخاب کارشناسان تاج برای بهترین تجربه"
              icon={Star}
              href="/products"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {featured.map((p) => (
                <FlagshipCard key={p.id} p={p} currency={currency} />
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 9 · bestsellers rank rail */}
      {data.bestsellers.length > 0 ? (
        <section aria-label="پرفروش‌ترین محصولات" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead
              kicker="رتبه‌بندی زنده"
              title="پرفروش‌ترین‌ها"
              sub="محبوب‌ترین‌های مشتریان تاج — بر اساس خرید واقعی"
              icon={TrendingUp}
              href="/products?sort=bestselling"
            />
            <div className="mt-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4">
              {data.bestsellers.map((p, i) => (
                <RankCard key={p.id} p={p} rank={i + 1} currency={currency} />
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 10 · newest arrivals — hybrid list-grid */}
      {data.newest.length > 0 ? (
        <section aria-label="جدیدترین محصولات" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead
              kicker="تازه رسیده‌ها"
              title="جدیدترین‌ها"
              sub="اولین‌هایی که تازه به ویت‌رین رسیده‌اند"
              icon={Sparkles}
              href="/products?sort=newest"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.newest.slice(0, 9).map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="mt-lift group flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-[#161B26] p-3"
                >
                  <span className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-xl bg-[#0F1420]">
                    {p.mainImage ? (
                      <Image
                        src={p.mainImage}
                        alt={p.name}
                        fill
                        sizes="74px"
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-[#39435A]"><Package className="h-7 w-7" aria-hidden /></span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="rounded-full border border-[#00D4FF]/25 bg-[#00D4FF]/[0.07] px-2 py-px text-[9px] font-black text-[#00D4FF]">جدید</span>
                      <span className="truncate text-[10px] text-[#A0AAB5]">{p.brand.name}</span>
                    </span>
                    <span className="mt-1 block truncate text-[13px] font-bold text-[#E8EDF5] transition-colors group-hover:text-[#00D4FF]">{p.name}</span>
                    <span className="mt-1 block text-[13.5px] font-black tabular-nums text-[#00D4FF]">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-[#A0AAB5]">{currency}</span>
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-[#39435A] transition-colors group-hover:text-[#00D4FF]" aria-hidden />
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 11 · AI consultant teaser */}
      <section aria-label="مشاور خرید با هوش مصنوعی" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0D1119] p-7 sm:p-10">
            <div aria-hidden className="absolute inset-0 mt-grid opacity-30" />
            <div aria-hidden className="mt-orb -start-20 -top-24 h-72 w-72 bg-[#007AFF]/25" />
            <div aria-hidden className="mt-orb -end-16 -bottom-28 h-72 w-72 bg-[#00D4FF]/20" />
            <HudCorners />
            <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#00D4FF] text-[#04121C] shadow-[0_0_35px_-8px_rgba(0,212,255,0.5)]">
                <BrainCircuit className="h-8 w-8" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/25 bg-[#00D4FF]/[0.07] px-3 py-0.5 text-[10.5px] font-black text-[#00D4FF]">
                  <span className="mt-live h-1.5 w-1.5 rounded-full bg-[#00D4FF]" aria-hidden />
                  آنلاین
                </p>
                <h2 className="text-[20px] font-black tracking-tight text-white sm:text-[24px]">مشاور خرید با هوش مصنوعی</h2>
                <p className="mt-2 max-w-lg text-[12.5px] leading-7 text-[#A0AAB5]">
                  بودجه‌ات را بگو، سلیقه‌ات را بپرس — مشاور هوشمند تاج در چند ثانیه بهترین گزینه‌ها را کنار هم می‌گذارد و کنارشان می‌ماند تا مطمئن خرید کنی.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col items-stretch gap-2.5 sm:w-auto sm:items-center">
                <a href="#taj-ai-anchor" className="mt-cta">
                  <span className="flex h-12 items-center gap-2 bg-[#0B0E14]/92 px-7 text-[13.5px] font-black text-white transition-colors hover:text-[#00D4FF]">
                    شروع گفتگو
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </span>
                </a>
                <p className="text-center text-[10.5px] text-[#A0AAB5]">چت هوشمند، همیشه پایین صفحه در دسترس است</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 12 · showcase duo — tilt glass banners */}
      {data.showcases.length > 0 ? (
        <section aria-label="ویترین‌های ویژه" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead kicker="ویترین تاج" title="کمپین‌های ویژه" sub="فرصت‌های منتخب این هفته" icon={Crown} />
            <div className="grid gap-5 md:grid-cols-2">
              {data.showcases.slice(0, 2).map((sc) => {
                const href = sc.buttonUrl || (sc.product ? `/products/${sc.product.slug}` : "/products");
                return (
                  <article key={sc.id} className="mt-tilt group relative h-48 overflow-hidden rounded-2xl border border-white/[0.08] sm:h-56">
                    <Image
                      src={sc.image}
                      alt={sc.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#0B0E14]/92 via-[#0B0E14]/45 to-transparent" />
                    <div aria-hidden className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
                    <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-7">
                      <h3 className="max-w-[240px] text-[17px] font-black leading-8 tracking-tight text-white sm:text-[19px]">{sc.title}</h3>
                      {sc.subtitle ? (
                        <p className="mt-1.5 max-w-[280px] text-[11.5px] leading-6 text-[#A0AAB5]">{sc.subtitle}</p>
                      ) : null}
                      <Link
                        href={href}
                        className="mt-4 inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border border-[#00D4FF]/40 bg-[#0B0E14]/70 px-5 text-[12px] font-black text-[#00D4FF] backdrop-blur-md transition-all hover:bg-[#00D4FF]/15 hover:shadow-[0_0_22px_-8px_rgba(0,212,255,0.7)]"
                      >
                        مشاهده
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 13 · brands marquee */}
      {data.brands.length > 0 ? (
        <section aria-label="برندهای همکار" className="pt-16 sm:pt-24">
          <Reveal>
            <div className="mx-auto mb-6 max-w-7xl px-4">
              <div className="mt-rule" />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[18px] font-black tracking-tight text-white sm:text-[22px]">
                  <Crown className="h-5 w-5 text-[#00D4FF]" aria-hidden />
                  برندهای همکار تاج
                </h2>
                <p className="text-[11.5px] text-[#A0AAB5]">اصالت هر کالا تضمین می‌شود</p>
              </div>
            </div>
            <div dir="ltr" className="mt-marquee [mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]">
              <div className="mt-marquee-track">
                {half(brandCycle.map((b) => (
                  <Link
                    key={`bm-${b.id}`}
                    href={`/products?brand=${b.slug}`}
                    className="group mx-2.5 grid h-16 w-40 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] transition-colors hover:border-[#00D4FF]/45 hover:bg-[#00D4FF]/[0.06]"
                  >
                    {b.logo ? (
                      <Image src={b.logo} alt={b.name} width={110} height={34} className="object-contain px-2 opacity-70 transition-opacity group-hover:opacity-100" loading="lazy" />
                    ) : b.image ? (
                      <Image src={b.image} alt={b.name} width={110} height={34} className="rounded-md object-cover px-2 opacity-70 transition-opacity group-hover:opacity-100" loading="lazy" />
                    ) : (
                      <span className="px-3 text-center text-[13px] font-black tracking-wide text-[#A0AAB5] transition-colors group-hover:text-white">{b.name}</span>
                    )}
                  </Link>
                )))}
                {half(brandCycle.map((b) => (
                  <Link
                    key={`bm2-${b.id}`}
                    href={`/products?brand=${b.slug}`}
                    aria-hidden
                    className="mx-2.5 grid h-16 w-40 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03]"
                  >
                    {b.logo ? (
                      <Image src={b.logo} alt={b.name} width={110} height={34} className="object-contain px-2 opacity-70" loading="lazy" />
                    ) : b.image ? (
                      <Image src={b.image} alt={b.name} width={110} height={34} className="rounded-md object-cover px-2 opacity-70" loading="lazy" />
                    ) : (
                      <span className="px-3 text-center text-[13px] font-black tracking-wide text-[#A0AAB5]">{b.name}</span>
                    )}
                  </Link>
                )))}
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* 14 · FAQ accordion-lite + info quick-links */}
      {data.faq.length > 0 ? (
        <section aria-label="سوالات متداول" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <Reveal>
            <SectionHead kicker="پاسخ سریع" title="سوالات متداول" sub="پرتکرارترین پرسش‌های مشتریان تاج" icon={HelpCircle} />
            <div className="grid gap-3 md:grid-cols-2">
              {data.faq.slice(0, 8).map((f, i) => (
                <details key={i} className="mt-faq group rounded-2xl border border-white/[0.07] bg-[#161B26] px-5 py-4 transition-colors hover:border-[#00D4FF]/25">
                  <summary className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-bold leading-6 text-[#E8EDF5]">{f.h}</span>
                    <span className="mt-faq-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/[0.08] text-[#00D4FF]">
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </summary>
                  <p className="mt-3 border-t border-white/[0.06] pt-3 text-[12.5px] leading-7 text-[#A0AAB5]">{f.p}</p>
                </details>
              ))}
            </div>
            {data.infoLinks && data.infoLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="text-[11.5px] text-[#A0AAB5]">راهنمای خرید:</span>
                {data.infoLinks.slice(0, 6).map((l) => (
                  <Link
                    key={l.slug}
                    href={`/info/${l.slug}`}
                    className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3.5 py-1.5 text-[11.5px] font-bold text-[#E8EDF5] transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
                  >
                    {l.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </Reveal>
        </section>
      ) : null}

      {/* empty catalog state */}
      {emptyCatalog ? (
        <section aria-label="فروشگاه در حال آماده‌سازی" className="mx-auto max-w-7xl px-4 pt-16 sm:pt-24">
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/[0.14] bg-[#0D1119] p-14 text-center">
            <div aria-hidden className="absolute inset-0 mt-grid opacity-20" />
            <div aria-hidden className="mt-orb left-1/2 top-0 h-56 w-56 -translate-x-1/2 bg-[#007AFF]/20" />
            <div className="relative z-10">
              <Crown className="mx-auto mb-4 h-12 w-12 text-[#00D4FF]" aria-hidden />
              <h2 className="text-lg font-black text-white">فروشگاه در حال آماده‌سازی است</h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-[#A0AAB5]">
                محصولات به‌زودی به ویت‌رین تاج اضافه می‌شوند. مدیر فروشگاه می‌تواند از
                <Link href="/admin" className="mx-1 font-bold text-[#00D4FF]">پنل مدیریت</Link>
                شروع به اضافه‌کردن کالاها کند.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* 15 · closing glowing divider */}
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:pt-20">
        <ScanDivider />
      </div>

      {/* soft blend back into the theme chrome */}
      <div aria-hidden className="h-14 bg-gradient-to-b from-[#0B0E14] to-background" />
    </div>
  );
}

/** glowing stat counter cell (HUD band) */
function StatCell({ icon: Icon, label, value, suffix }: { icon: React.ElementType; label: string; value: number; suffix: string }) {
  const n = useCountUp(value);
  return (
    <div className="mt-lift group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#007AFF]/30 to-[#00D4FF]/[0.15] text-[#00D4FF] transition-colors group-hover:from-[#007AFF] group-hover:to-[#00D4FF] group-hover:text-[#04121C]">
        <Icon className="h-5.5 w-5.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="mt-num block text-[24px] font-black leading-none text-white sm:text-[28px]">
          {n.toLocaleString("fa-IR")}{suffix}
        </span>
        <span className="mt-1.5 block truncate text-[11px] text-[#A0AAB5]">{label}</span>
      </span>
    </div>
  );
}

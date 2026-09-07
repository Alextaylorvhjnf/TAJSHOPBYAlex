"use client";

/**
 * TEMPLATE · autumn — «Autumn Glass» (v25 full rewrite)
 * ----------------------------------------------------------------
 * Warm dark hearth #161210 canvas with amber neon #F59E0B / #FB923C glow
 * accents. Signature = CSS falling-leaf particles (border-radius 0 70% 0 70%
 * leaf silhouettes drifting down), layered blurred amber orbs for depth,
 * HUD corner details on panels and amber gradient-text headings. Cards are
 * warm-tinted glass (bg-white/5 + backdrop-blur) that ignites on hover.
 * No registered features → no feat() gates; deal clocks use per-product
 * discountEndsAt only (hydration-safe).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Leaf, Flame, Package, Star, Sparkles, Wind, Check, ChevronLeft,
  TrendingUp, HelpCircle, BadgeCheck, Clock, Megaphone, ArrowLeft,
  ShieldCheck, ShoppingBasket, Gem, Timer,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ONE scoped style block — Autumn-Glass tokens, leaves, orbs, HUD */
const AUTUMN_GLASS_CSS = `
[data-tpl="autumn"]{
  --au-night:#161210;--au-amber:#F59E0B;--au-flame:#FB923C;
  --au-glass:rgba(255,255,255,.05);--au-brd:rgba(251,146,60,.18);--au-brd-soft:rgba(255,255,255,.1);
}
[data-tpl="autumn"] .au-glass{background:var(--au-glass);-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);border:1px solid var(--au-brd);box-shadow:0 18px 55px -25px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,236,210,.06)}
[data-tpl="autumn"] .au-glass-soft{background:rgba(255,255,255,.035);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--au-brd-soft)}
[data-tpl="autumn"] .au-amber-glow{color:var(--au-amber);text-shadow:0 0 18px rgba(245,158,11,.6),0 0 44px rgba(251,146,60,.28)}
[data-tpl="autumn"] .au-flame-glow{color:var(--au-flame);text-shadow:0 0 16px rgba(251,146,60,.6),0 0 40px rgba(245,158,11,.3)}
[data-tpl="autumn"] .au-grad-text{background:linear-gradient(100deg,#FFE9CC 8%,var(--au-amber) 52%,var(--au-flame) 94%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* falling leaves — leaf silhouette via asymmetric border-radius */
[data-tpl="autumn"] .au-leaf{position:absolute;top:-6vh;width:var(--au-s,16px);height:calc(var(--au-s,16px) * 1.18);border-radius:0% 70% 0% 70%;background:linear-gradient(135deg,var(--au-c1,#F59E0B),var(--au-c2,#B45309));opacity:var(--au-o,.75);animation:au-leaf-fall var(--au-dur,13s) linear var(--au-delay,0s) infinite;will-change:transform;pointer-events:none;box-shadow:inset -1px -2px 3px rgba(0,0,0,.35)}
@keyframes au-leaf-fall{
  0%{transform:translate3d(0,-8vh,0) rotate(0deg)}
  25%{transform:translate3d(-26px,22vh,0) rotate(70deg)}
  50%{transform:translate3d(18px,48vh,0) rotate(140deg)}
  75%{transform:translate3d(-30px,76vh,0) rotate(215deg)}
  100%{transform:translate3d(10px,112vh,0) rotate(290deg)}
}
/* layered blurred amber orbs — depth field */
[data-tpl="autumn"] .au-orb{position:absolute;border-radius:9999px;filter:blur(70px);pointer-events:none;animation:au-drift 20s ease-in-out infinite alternate}
@keyframes au-drift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-30px,26px) scale(1.1)}}
/* HUD corner brackets (amber) */
[data-tpl="autumn"] .au-hud{position:relative}
[data-tpl="autumn"] .au-hud::before,[data-tpl="autumn"] .au-hud::after{content:"";position:absolute;width:22px;height:22px;border-color:rgba(245,158,11,.55);border-style:solid;pointer-events:none}
[data-tpl="autumn"] .au-hud::before{top:10px;left:10px;border-width:1.5px 0 0 1.5px}
[data-tpl="autumn"] .au-hud::after{bottom:10px;right:10px;border-width:0 1.5px 1.5px 0}
/* warm glass card ignites on hover */
[data-tpl="autumn"] .au-card{transition:transform .35s cubic-bezier(.2,.7,.3,1),box-shadow .35s,border-color .35s}
[data-tpl="autumn"] .au-card:hover{transform:translateY(-5px);border-color:rgba(245,158,11,.55);box-shadow:0 24px 60px -26px rgba(0,0,0,.8),0 0 34px -12px rgba(245,158,11,.45),inset 0 1px 0 rgba(255,236,210,.09)}
/* amber CTA */
[data-tpl="autumn"] .au-cta{background:linear-gradient(135deg,#B45309 0%,#F59E0B 55%,#FBBF24 100%);color:#2A1602;box-shadow:0 0 26px -4px rgba(245,158,11,.6),0 12px 34px -12px rgba(180,83,9,.7);transition:transform .3s,box-shadow .3s}
[data-tpl="autumn"] .au-cta:hover{transform:translateY(-2px);box-shadow:0 0 36px 0 rgba(245,158,11,.75),0 16px 40px -12px rgba(180,83,9,.75)}
[data-tpl="autumn"] .au-btn-ghost{background:rgba(245,158,11,.08);border:1px solid rgba(251,146,60,.4);color:#FDE1C0;box-shadow:inset 0 0 22px rgba(245,158,11,.1);transition:all .3s}
[data-tpl="autumn"] .au-btn-ghost:hover{border-color:rgba(251,146,60,.85);box-shadow:0 0 26px -6px rgba(245,158,11,.6),inset 0 0 26px rgba(245,158,11,.16)}
/* ember divider */
[data-tpl="autumn"] .au-scan{position:relative;height:1px;background:linear-gradient(to left,transparent,rgba(245,158,11,.55),rgba(255,224,178,.9),rgba(251,146,60,.55),transparent);overflow:visible}
[data-tpl="autumn"] .au-scan::after{content:"";position:absolute;top:-2px;left:0;width:64px;height:5px;background:linear-gradient(to left,transparent,rgba(251,191,36,.85),transparent);filter:blur(3px);animation:au-scan 5.8s linear infinite}
@keyframes au-scan{0%{left:-8%}100%{left:104%}}
/* rails + scrollbars */
[data-tpl="autumn"] .au-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="autumn"] .au-rail::-webkit-scrollbar{display:none}
[data-tpl="autumn"] .au-scroll{scrollbar-width:thin;scrollbar-color:rgba(245,158,11,.38) transparent}
[data-tpl="autumn"] .au-scroll::-webkit-scrollbar{width:6px}
[data-tpl="autumn"] .au-scroll::-webkit-scrollbar-thumb{background:rgba(245,158,11,.32);border-radius:99px}
[data-tpl="autumn"] .au-scroll::-webkit-scrollbar-track{background:transparent}
/* marquee ticker */
[data-tpl="autumn"] .au-marquee{display:flex;width:max-content;animation:au-marquee var(--au-mq,24s) linear infinite;will-change:transform}
@keyframes au-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
/* flicker + pulse */
[data-tpl="autumn"] .au-blink{animation:au-blink 2.5s ease-in-out infinite}
@keyframes au-blink{0%,100%{opacity:1}50%{opacity:.34}}
[data-tpl="autumn"] .au-pulse{animation:au-pulse 2.7s ease-in-out infinite}
@keyframes au-pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.45)}55%{box-shadow:0 0 0 9px rgba(245,158,11,0)}}
/* faq */
[data-tpl="autumn"] .au-faq[open] .au-faq-ico{transform:rotate(180deg);color:var(--au-amber)}
[data-tpl="autumn"] .au-faq-ico{transition:transform .35s,color .35s}
[data-tpl="autumn"] :is(button,a,input,summary,[tabindex]):focus-visible{outline:2px solid rgba(245,158,11,.75);outline-offset:2px;border-radius:.5rem}
@media (prefers-reduced-motion:reduce){
  [data-tpl="autumn"] .au-leaf,[data-tpl="autumn"] .au-orb,[data-tpl="autumn"] .au-marquee,
  [data-tpl="autumn"] .au-blink,[data-tpl="autumn"] .au-pulse,[data-tpl="autumn"] .au-scan::after{animation:none!important}
  [data-tpl="autumn"] .au-card,[data-tpl="autumn"] .au-cta{transition:none!important}
}

/* ═══ v26fix · LIGHT-MODE SKIN — html:not(.dark) only · dark design untouched ═══ */
html:not(.dark) [data-tpl="autumn"]{
  --au-night:#FAF5EE;--au-amber:#F59E0B;--au-flame:#FB923C;--au-stories-bg:#FDFCF9;
  --au-glass:rgba(255,255,255,0.7);--au-brd:rgba(59,46,32,0.12);--au-brd-soft:rgba(59,46,32,0.09);
}
/* ═══ v27b-T5 · ROOT FLIP FIX — the [data-tpl] root element itself carries
   bg-[#161210] + text-white; the descendant rules below can never match the
   root (it is not its own descendant), so light mode kept the whole page
   dark with inherited white text. Compound (no-space) selectors fix it. ═══ */
html:not(.dark) [data-tpl="autumn"].bg-\\[\\#161210\\]{ background-color:#FAF5EE; }
html:not(.dark) [data-tpl="autumn"].text-white{ color:#3B2E20; }
/* raw-hex surfaces */
html:not(.dark) [data-tpl="autumn"] .bg-\\[\\#161210\\]{ background-color:#FAF5EE; }
html:not(.dark) [data-tpl="autumn"] .bg-\\[\\#1D1712\\]{ background-color:#F2EADC; }
html:not(.dark) [data-tpl="autumn"] .bg-white\\/5{ background-color:rgba(59,46,32,0.05); }
html:not(.dark) [data-tpl="autumn"] .border-white\\/10{ border-color:rgba(59,46,32,0.14); }
/* product-card image veil becomes a warm light fade (all other #161210 overlays sit on photos and stay dark) */
html:not(.dark) [data-tpl="autumn"] .from-\\[\\#161210\\]\\/55{ --tw-gradient-from:rgba(246,239,227,0.6); }
html:not(.dark) [data-tpl="autumn"] .from-\\[\\#161210\\]\\/85{ --tw-gradient-from:rgba(246,239,227,0.55); }
/* ink */
html:not(.dark) [data-tpl="autumn"] .text-white{ color:#3B2E20; }
html:not(.dark) [data-tpl="autumn"] .text-white\\/90{ color:rgba(59,46,32,0.9); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/85{ color:rgba(59,46,32,0.86); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/80{ color:rgba(59,46,32,0.8); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/75{ color:rgba(59,46,32,0.76); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/70{ color:rgba(59,46,32,0.7); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/65{ color:rgba(59,46,32,0.66); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/60{ color:rgba(59,46,32,0.6); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/55{ color:rgba(59,46,32,0.56); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/50{ color:rgba(59,46,32,0.5); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/45{ color:rgba(59,46,32,0.46); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/40{ color:rgba(59,46,32,0.4); }
html:not(.dark) [data-tpl="autumn"] .text-white\\/35{ color:rgba(59,46,32,0.36); }
/* amber / orange / emerald accents darkened for light */
html:not(.dark) [data-tpl="autumn"] .text-amber-200{ color:#A16207; }
html:not(.dark) [data-tpl="autumn"] .text-amber-200\\/90{ color:rgba(140,90,10,0.95); }
html:not(.dark) [data-tpl="autumn"] .text-amber-200\\/30{ color:rgba(140,90,10,0.3); }
html:not(.dark) [data-tpl="autumn"] .text-amber-200\\/25{ color:rgba(140,90,10,0.28); }
html:not(.dark) [data-tpl="autumn"] .text-amber-300{ color:#92600E; }
html:not(.dark) [data-tpl="autumn"] .text-amber-400{ color:#C26102; }
html:not(.dark) [data-tpl="autumn"] .text-amber-400\\/80{ color:rgba(194,97,2,0.8); }
html:not(.dark) [data-tpl="autumn"] .text-amber-500\\/40{ color:rgba(180,83,9,0.45); }
html:not(.dark) [data-tpl="autumn"] .text-amber-100\\/45{ color:rgba(124,74,14,0.5); }
html:not(.dark) [data-tpl="autumn"] .text-amber-100\\/50{ color:rgba(124,74,14,0.55); }
html:not(.dark) [data-tpl="autumn"] .text-amber-100\\/70{ color:rgba(124,74,14,0.72); }
html:not(.dark) [data-tpl="autumn"] .text-orange-400{ color:#C2410C; }
html:not(.dark) [data-tpl="autumn"] .text-emerald-300{ color:#047857; }
html:not(.dark) [data-tpl="autumn"] .fill-amber-400{ fill:#C26102; }
html:not(.dark) [data-tpl="autumn"] .bg-amber-400\\/70{ background-color:rgba(180,83,9,0.75); }
html:not(.dark) [data-tpl="autumn"] .border-amber-400\\/25{ border-color:rgba(194,97,2,0.3); }
html:not(.dark) [data-tpl="autumn"] .border-amber-400\\/30{ border-color:rgba(194,97,2,0.35); }
/* hovers */
html:not(.dark) [data-tpl="autumn"] .hover\\:text-white:hover{ color:#3B2E20; }
html:not(.dark) [data-tpl="autumn"] .hover\\:text-amber-200:hover{ color:#A16207; }
html:not(.dark) [data-tpl="autumn"] .hover\\:border-amber-400\\/40:hover{ border-color:rgba(194,97,2,0.45); }
/* scoped helpers -> light (au-cta / au-leaf / au-orb / scanline shimmer keep their warm identity) */
html:not(.dark) [data-tpl="autumn"] .au-glass{
  box-shadow:0 18px 55px -25px rgba(59,46,32,0.25), inset 0 1px 0 rgba(255,255,255,0.85);
}
html:not(.dark) [data-tpl="autumn"] .au-glass-soft{ background:rgba(255,255,255,0.62); }
html:not(.dark) [data-tpl="autumn"] .au-amber-glow{
  color:#B45309; text-shadow:0 0 18px rgba(245,158,11,0.28), 0 0 44px rgba(251,146,60,0.14);
}
html:not(.dark) [data-tpl="autumn"] .au-flame-glow{
  color:#FFF7ED; text-shadow:0 0 16px rgba(180,83,9,0.45);
}
/* v29.2 FIX: was "background:" shorthand — the shorthand RESETS background-clip
   to border-box, so light mode painted the gradient as a bar OVER the transparent
   text (titles «برگ‌های تازه» و… invisible). background-image keeps the clip:text. */
html:not(.dark) [data-tpl="autumn"] .au-grad-text{ background-image:linear-gradient(100deg,#8A5A10 8%,#B45309 52%,#C2530B 94%); }
html:not(.dark) [data-tpl="autumn"] .au-hud::before,
html:not(.dark) [data-tpl="autumn"] .au-hud::after{ border-color:rgba(180,83,9,0.5); }
html:not(.dark) [data-tpl="autumn"] .au-card:hover{
  border-color:rgba(180,83,9,0.6);
  box-shadow:0 24px 60px -26px rgba(59,46,32,0.35), 0 0 34px -12px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.7);
}
html:not(.dark) [data-tpl="autumn"] .au-btn-ghost{
  background:rgba(245,158,11,0.1); border-color:rgba(194,97,2,0.45); color:#92600E;
  box-shadow:inset 0 0 22px rgba(245,158,11,0.08);
}
html:not(.dark) [data-tpl="autumn"] .au-btn-ghost:hover{
  border-color:rgba(194,97,2,0.8); box-shadow:0 0 26px -6px rgba(180,83,9,0.45), inset 0 0 26px rgba(245,158,11,0.12);
}
html:not(.dark) [data-tpl="autumn"] .au-scan{
  background:linear-gradient(to left,transparent,rgba(180,83,9,0.55),rgba(120,75,20,0.8),rgba(180,83,9,0.55),transparent);
}
html:not(.dark) [data-tpl="autumn"] .au-scroll{ scrollbar-color:rgba(180,83,9,0.4) transparent; }
html:not(.dark) [data-tpl="autumn"] .au-scroll::-webkit-scrollbar-thumb{ background:rgba(180,83,9,0.35); }
html:not(.dark) [data-tpl="autumn"] .au-faq[open] .au-faq-ico{ color:#B45309; }
/* dark-surface restores — the warm hearth hero stage stays a dark panel */
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"]{
  --au-glass:rgba(255,255,255,0.05); --au-brd:rgba(251,146,60,0.18); --au-brd-soft:rgba(255,255,255,0.1);
}
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .au-glass{
  box-shadow:0 18px 55px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,236,210,0.06);
}
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .au-glass-soft{ background:rgba(255,255,255,0.035); }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .au-grad-text{ background-image:linear-gradient(100deg,#FFE9CC 8%,var(--au-amber) 52%,var(--au-flame) 94%); }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .au-amber-glow{
  color:#F59E0B; text-shadow:0 0 18px rgba(245,158,11,0.6), 0 0 44px rgba(251,146,60,0.28);
}
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .au-btn-ghost{
  background:rgba(245,158,11,0.08); border-color:rgba(251,146,60,0.4); color:#FDE1C0;
  box-shadow:inset 0 0 22px rgba(245,158,11,0.1);
}
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-white\\/50{ color:rgba(255,255,255,0.5); }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-amber-100{ color:#FEF3C7; }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-amber-400{ color:#FBBF24; }
html:not(.dark) [data-tpl="autumn"] section[aria-labelledby="aut-hero"] .text-orange-400{ color:#FB923C; }
/* image postcards (extra slides / showcases) keep dark overlays + white captions */
html:not(.dark) [data-tpl="autumn"] section[aria-label="اسلایدهای پاییزی"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="autumn"] section[aria-label="اسلایدهای پاییزی"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="autumn"] section[aria-label="کارت‌پستال‌های ویترین"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="autumn"] section[aria-label="کارت‌پستال‌های ویترین"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="autumn"] section[aria-label="کارت‌پستال‌های ویترین"] .au-amber-glow{ color:#F59E0B; }
/* image chips: rank / sold / discount / new keep dark + pale amber text */
html:not(.dark) [data-tpl="autumn"] .bg-black\\/60.text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="autumn"] .bg-black\\/65.text-white\\/75{ color:rgba(255,255,255,0.75); }
html:not(.dark) [data-tpl="autumn"] .bg-\\[\\#161210\\]\\/85.text-amber-200{ color:#FDE68A; }
html:not(.dark) [data-tpl="autumn"] .au-amber-glow.bg-\\[\\#161210\\]\\/80{ color:#F59E0B; }
/* stories play chip + immersive story viewer keep their dark design */
html:not(.dark) [data-tpl="autumn"] .bg-black\\/70.text-white{ color:#fff; }
html:not(.dark) [data-tpl="autumn"] .z-\\[100\\].fixed .text-white{ color:#fff; }
html:not(.dark) [data-tpl="autumn"] .z-\\[100\\].fixed .text-white\\/50{ color:rgba(255,255,255,0.5); }
`;

/* ── deterministic falling-leaf layer (hydration-safe) ────────────── */
function LeafLayer({ count = 4 }: { count?: number }) {
  const palettes = [
    { c1: "#F59E0B", c2: "#B45309" },
    { c1: "#FB923C", c2: "#C2410C" },
    { c1: "#FBBF24", c2: "#92400E" },
    { c1: "#EA580C", c2: "#7C2D12" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const p = palettes[i % palettes.length];
        return (
          <span
            key={i}
            className="au-leaf"
            style={
              {
                left: `${(i * 29 + 6) % 96}%`,
                "--au-s": `${11 + (i % 3) * 5}px`,
                "--au-c1": p.c1,
                "--au-c2": p.c2,
                "--au-dur": `${(11 + (i % 4) * 3.4).toFixed(1)}s`,
                "--au-delay": `${(-((i * 2.9) % 12)).toFixed(1)}s`,
                "--au-o": i % 2 === 0 ? 0.8 : 0.55,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/* ── hydration-safe per-product mini clock ────────────────────────── */
function EmberClock({ target }: { target: number }) {
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
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-200/90 tabular-nums" role="timer" aria-label="زمان باقی‌مانده برداشت">
      <Clock className="h-3 w-3" aria-hidden />
      {diff !== null && diff === 0 ? "پایان تخفیف" : cells.map((v) => toFaDigits(String(v).padStart(2, "0"))).join(":")}
    </span>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ──────── */
function useAutumnAdd() {
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

/* ── warm glass product tile (fills its grid area) ────────────────── */
function AmberCard({ product, big }: { product: TemplateProduct; big?: boolean }) {
  const { addToCart, added } = useAutumnAdd();
  const target = product.discountEndsAt ? new Date(product.discountEndsAt).getTime() : null;

  return (
    <article className={cn("au-card au-glass group relative flex h-full flex-col overflow-hidden rounded-3xl", !product.inStock && "grayscale-[0.45]")}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className={cn("relative block w-full overflow-hidden rounded-t-3xl bg-[#1D1712]", big ? "min-h-[220px] flex-1" : "aspect-square")}
      >
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes={big ? "(max-width: 1024px) 92vw, 46vw" : "(max-width: 640px) 50vw, 24vw"} className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06] md:p-7" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-amber-200/25">
            <Package className={cn("text-amber-200/25", big ? "h-16 w-16" : "h-11 w-11")} aria-hidden />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161210]/55 via-transparent to-transparent" />
        {product.discountPercent > 0 && (
          <span className="au-flame-glow absolute start-3 top-3 rounded-xl border border-orange-300/35 bg-orange-500/90 px-2.5 py-1 text-[10.5px] font-black text-white shadow-[0_0_20px_rgba(251,146,60,.5)]">
            {product.discountPercent.toLocaleString("fa-IR")}٪ برداشت
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-3 top-3 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[10px] font-bold text-white/75 backdrop-blur">ناموجود</span>
        )}
      </Link>

      <div className={cn("flex flex-1 flex-col p-4", big && "flex-1")}>
        <p className="flex items-center gap-1 text-[10.5px] text-amber-100/45">
          <BadgeCheck className="h-3 w-3 text-amber-400/80" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className={cn("mt-1 font-bold leading-6 text-white/90 line-clamp-2 transition-colors hover:text-amber-200", big ? "text-[15px]" : "text-[13px]", big ? "min-h-12" : "min-h-12")}>
          {product.name}
        </Link>
        {target !== null && product.discountPercent > 0 && (
          <p className="mt-2"><EmberClock target={target} /></p>
        )}
        <div className={cn("mt-auto flex items-end justify-between gap-2", big ? "pt-4" : "pt-3")}>
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[11px] leading-4 text-white/35 tabular-nums line-through">{formatPrice(product.price)}</span>
            )}
            <span className="au-amber-glow block text-[14px] font-black tabular-nums md:text-[15px]">
              {formatPrice(product.effectivePrice)}
              <span className="ms-1 text-[10px] font-normal text-white/40">تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "au-btn-ghost grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-all active:scale-95",
              added && "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBasket className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── HUD section header ───────────────────────────────────────────── */
function CozyHeader({
  icon: Icon, title, subtitle, href,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="au-pulse grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="au-grad-text truncate text-lg font-black tracking-tight md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="au-glass-soft flex h-11 shrink-0 items-center gap-1 rounded-xl px-3.5 text-xs font-bold text-amber-200 transition-colors hover:text-white">
          مشاهده همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── TEMPLATE ─────────────────────────────────────────────────────── */
export function AutumnTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);

  /* v20 ticker messages → announcement fallback; v22 tickerSpeed */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink }]
        : [];
  const mqDur = store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 24;

  const chrome = TEMPLATE_CHROME["autumn"];

  const stats = [
    { icon: Leaf, n: counts.products, label: "محصول پاییزی" },
    { icon: Wind, n: counts.categories, label: "دسته‌بندی" },
    { icon: Star, n: counts.brands, label: "برند" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="autumn" className="isolate w-full bg-[#161210] text-white">
      <style>{AUTUMN_GLASS_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* top blend from the light theme chrome into the warm hearth */}
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-background via-background/70 to-transparent" />

      {/* ═══ TICKER — نسیم پاییزی strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیه فروشگاه" className="mx-auto w-full max-w-[1440px] px-4 pb-3 pt-1">
          <div className="au-glass-soft flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2">
            <span className="au-blink flex shrink-0 items-center gap-1.5 text-[10px] font-black text-amber-400">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              نسیم پاییزی
            </span>
            <span className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
              <span className="au-marquee" style={{ "--au-mq": `${mqDur}s` } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex shrink-0 items-center gap-10 pe-10" aria-hidden={dup === 1}>
                    {tickerMsgs.map((m, i) => (
                      <Link key={`${dup}-${i}`} href={m.link ?? "/products"} tabIndex={dup === 1 ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[11.5px] font-bold text-white/70 transition-colors hover:text-amber-200">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-amber-400/70" />
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

      {/* ═══ HERO — hearth stage: orbs, leaves, ember grid ═══ */}
      <section className="relative mx-auto w-full max-w-[1440px] px-4 pt-2" aria-labelledby="aut-hero">
        <div className="au-hud relative isolate overflow-hidden rounded-[2.5rem] border border-amber-500/15 shadow-[0_40px_90px_-40px_rgba(0,0,0,.9)]">
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(178deg,#221A14_0%,#161210_55%,#120E0B_100%)]" />
          {/* layered blurred amber orbs — depth field */}
          <span aria-hidden className="au-orb -start-16 -top-10 h-64 w-64 bg-amber-500/20" style={{ animationDuration: "17s" }} />
          <span aria-hidden className="au-orb -end-10 top-16 h-52 w-52 bg-orange-400/15" style={{ animationDuration: "23s", animationDelay: "-6s" }} />
          <span aria-hidden className="au-orb bottom-0 left-1/3 h-56 w-72 bg-[#FB923C]/10" style={{ animationDuration: "26s", animationDelay: "-11s" }} />
          {/* ember grid floor */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-36 opacity-25 [background:repeating-linear-gradient(to_top,rgba(245,158,11,.16)_0,transparent_1px,transparent_26px),repeating-linear-gradient(to_right,rgba(245,158,11,.11)_0,transparent_1px,transparent_42px)] [mask-image:linear-gradient(to_top,black,transparent)]" />
          <LeafLayer />
          {/* ember horizon line */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(245,158,11,.9),rgba(255,224,178,.95),rgba(251,146,60,.8),transparent)]" />

          <div className="relative grid min-h-[420px] items-center gap-8 px-6 py-16 sm:min-h-[560px] sm:px-10 lg:grid-cols-[1.05fr_.95fr]">
            <div className="text-center lg:text-start">
              <p className="au-glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold text-amber-100">
                <Leaf className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                فصل طلایی {store.storeName}
              </p>
              <h1 id="aut-hero" className="au-grad-text text-3xl font-black leading-[1.4] sm:text-4xl md:text-5xl">
                برداشت پاییز، شیشه‌ای و گرم
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-8 text-white/60 sm:mx-auto lg:mx-0">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : `تخفیف‌های فصل را از میان ${toFaDigits(String(counts.products))} محصول منتخب بچینید؛ گرمای پاییز با عمق شیشه.`}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link href="/products" className="au-cta flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black">
                  <ShoppingBasket className="h-4 w-4" aria-hidden />
                  سبد برداشت
                </Link>
                <Link href="/products?discount=1" className="au-btn-ghost flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-bold">
                  <Flame className="h-4 w-4 text-orange-400" aria-hidden />
                  تخفیف‌های پاییزی
                </Link>
              </div>
              <ul className="mt-9 flex flex-wrap justify-center gap-2.5 lg:justify-start" aria-label="آمار فروشگاه">
                {stats.map((s) => (
                  <li key={s.label} className="au-glass-soft flex items-center gap-2 rounded-xl px-3.5 py-2">
                    <s.icon className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                    <span className="text-sm font-black tabular-nums text-white">{toFaDigits(String(s.n))}</span>
                    <span className="text-[10px] text-white/50">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* hero slide art panel */}
            {heroSlide && (
              <Link
                href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
                className="au-glass group relative hidden h-[340px] overflow-hidden rounded-[2rem] md:block md:h-[400px]"
                aria-label={heroSlide.title}
              >
                <SlideArt slide={heroSlide} sizes="44vw" priority className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161210]/92 via-[#161210]/25 to-transparent" />
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(245,158,11,.8),rgba(251,146,60,.7),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="text-lg font-black text-white">{heroSlide.title}</h3>
                  {heroSlide.subtitle && <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-white/65">{heroSlide.subtitle}</p>}
                  {heroSlide.ctaText && (
                    <span className="au-amber-glow mt-3 inline-flex items-center gap-1.5 text-xs font-black">
                      {heroSlide.ctaText}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══ STORIES ═══ */}
      {stories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="استوری‌های فروشگاه">
          <Reveal>
            <div className="au-glass rounded-[2rem] p-4 sm:p-5" style={{ "--background": "var(--au-stories-bg, #161210)" } as React.CSSProperties}>
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-400">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                استوری‌های پاییزی
              </p>
              <StoriesRow stories={stories} />
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EXTRA SLIDES DUO — postcards of the season ═══ */}
      {extraSlides.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="اسلایدهای پاییزی">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              {extraSlides.map((s) => (
                <Link
                  key={s.id}
                  href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="au-hud group relative flex h-[220px] flex-col justify-end overflow-hidden rounded-[2rem] border border-amber-500/15 sm:h-[260px]"
                >
                  <SlideArt slide={s} sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161210]/92 via-[#161210]/30 to-transparent" />
                  <div className="relative p-5 sm:p-6">
                    <h3 className="text-base font-black text-white sm:text-lg">{s.title}</h3>
                    {s.subtitle && <p className="mt-1 line-clamp-2 max-w-md text-[11.5px] leading-6 text-white/65">{s.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ CATEGORIES — amber glass tiles ═══ */}
      {data.categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-cats">
          <Reveal>
            <CozyHeader icon={Wind} title="نسیم دسته‌بندی‌ها" subtitle="هر کاشی، یک باغ پاییزی" href="/products" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {data.categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="au-card au-glass group relative flex flex-col items-center overflow-hidden rounded-2xl text-center">
                  <span className="relative block aspect-square w-full overflow-hidden bg-[#1D1712]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 30vw, 16vw" className="object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-lg font-black text-amber-200/30">{c.name.charAt(0)}</span>
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161210]/85 via-transparent to-transparent" />
                  </span>
                  <span className="flex w-full flex-col items-center gap-0.5 p-2.5">
                    <span className="w-full truncate text-[11.5px] font-bold text-white/85">{c.name}</span>
                    <span className="text-[9.5px] text-amber-100/50 tabular-nums">{toFaDigits(String(c.productCount))} کالا</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ DISCOUNTED — برداشت پاییزی ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-deals">
          <Reveal>
            <CozyHeader icon={Flame} title="برداشت پاییزی" subtitle="تخفیف‌هایی که برگشان ریخته" href="/products?discount=1" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.discounted.slice(0, 8).map((p) => <AmberCard key={p.id} product={p} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FEATURED — mosaic (hero tile 2×2) ═══ */}
      {data.featured.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-featured">
          <Reveal>
            <CozyHeader icon={Gem} title="نقش مایع ویترین" subtitle="چیدمان موزاییکی انتخاب‌های ویژه" href="/products" />
            <div className="grid gap-4 md:grid-cols-4 md:[grid-auto-rows:270px]">
              {data.featured.slice(0, 5).map((p, i) => (
                <div key={p.id} className={cn(i === 0 && "md:col-span-2 md:row-span-2")}>
                  <AmberCard product={p} big={i === 0} />
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EXCLUSIVE — glass lanterns ═══ */}
      {data.exclusive.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-exclusive">
          <Reveal>
            <CozyHeader icon={Sparkles} title="فانوس‌های انحصاری" subtitle="فقط در تاج الکترونیکس" />
            <div className="grid gap-4 md:grid-cols-2">
              {data.exclusive.slice(0, 2).map((p) => (
                <article key={p.id} className="au-hud au-glass group relative flex flex-col overflow-hidden rounded-[2rem] sm:flex-row">
                  <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square w-full shrink-0 bg-[#1D1712] sm:w-[46%]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, 28vw" className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-amber-200/25"><Package className="h-14 w-14" aria-hidden /></span>
                    )}
                    <span className="au-amber-glow absolute start-4 top-4 rounded-full border border-amber-400/40 bg-[#161210]/80 px-3 py-1 text-[10px] font-black backdrop-blur">انحصاری</span>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-6">
                    <p className="flex items-center gap-1 text-[10.5px] text-amber-100/45">
                      <BadgeCheck className="h-3 w-3 text-amber-400/80" aria-hidden />
                      {p.brand.name}
                    </p>
                    <Link href={`/products/${p.slug}`} className="mt-1.5 text-lg font-black leading-8 text-white line-clamp-2 transition-colors hover:text-amber-200">
                      {p.name}
                    </Link>
                    <p className="au-amber-glow mt-3 text-xl font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[11px] font-normal text-white/40">تومان</span>
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {p.rating > 0 && (
                        <li className="au-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-amber-200">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                          {p.rating.toLocaleString("fa-IR")} از ۵
                        </li>
                      )}
                      {p.soldCount > 0 && (
                        <li className="au-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white/60 tabular-nums">
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

      {/* ═══ BESTSELLERS — cozy rail ═══ */}
      {data.bestsellers.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-best">
          <Reveal>
            <CozyHeader icon={TrendingUp} title="خوش‌خوراک‌های فصل" subtitle="بر اساس فروش واقعی مشتریان" />
            <div className="au-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {data.bestsellers.slice(0, 10).map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="au-card au-glass group flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#1D1712]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="240px" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-amber-200/25"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute start-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border text-sm font-black tabular-nums",
                        i < 3
                          ? "border-amber-400/45 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,.35)]"
                          : "border-white/15 bg-black/60 text-white/60"
                      )}
                    >
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="min-h-11 text-[12.5px] font-bold leading-5 text-white/85 line-clamp-2">{p.name}</span>
                    <span className="mt-1 text-[10px] text-amber-100/50 tabular-nums">{toFaDigits(String(p.soldCount))} فروش موفق</span>
                    <span className="au-amber-glow mt-auto pt-2 text-[13.5px] font-black tabular-nums">
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

      {/* ═══ NEWEST — برگ تازه grid ═══ */}
      {data.newest.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-newest">
          <Reveal>
            <CozyHeader icon={Leaf} title="برگ‌های تازه" subtitle="به‌تازگی به ویترین افزوده شده" href="/products" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.newest.slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="au-card au-glass group flex flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#1D1712]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 50vw, 24vw" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-amber-200/25"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span className="au-blink absolute end-3 top-3 rounded-full border border-amber-400/40 bg-[#161210]/85 px-2.5 py-1 text-[9.5px] font-black text-amber-200 backdrop-blur">جدید</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="text-[10.5px] text-amber-100/45">{p.brand.name}</span>
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

      {/* ═══ SHOWCASES — warm postcards ═══ */}
      {data.showcases.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="کارت‌پستال‌های ویترین">
          <Reveal>
            <CozyHeader icon={Sparkles} title="کارت‌پستال‌های پاییزی" subtitle="پیشنهادهای ویژه فصل" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {data.showcases.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="au-hud group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[2rem] border border-amber-500/15"
                >
                  <Image src={s.image} alt={s.title} fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161210]/95 via-[#161210]/35 to-transparent" />
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(245,158,11,.85),rgba(251,146,60,.7),transparent)]" />
                  <div className="relative p-6">
                    <h3 className="text-lg font-black text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-6 text-white/65">{s.subtitle}</p>}
                    <span className="au-amber-glow mt-3 inline-flex items-center gap-1 text-xs font-black">
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

      {/* ═══ TRUST — کنج گرم ═══ */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="خدمات ویژه پاییزی">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "ضمانت اصالت", d: "گارانتی رسمی و خدمات پس از فروش روی همه کالاها" },
              { icon: Wind, t: "ارسال نسیمی", d: "تحویل سریع سفارش‌ها به سراسر کشور" },
              { icon: Leaf, t: "چیدمان ویژه", d: "بسته‌بندی پاییزی هدیه، رایگان روی سفارش‌ها" },
            ].map((f) => (
              <div key={f.t} className="au-glass-soft flex items-start gap-3 rounded-2xl p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-500/10 text-amber-400">
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

      {/* ═══ BRANDS — برگ‌گرد marquee ═══ */}
      {data.brands.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="برندهای همکار">
          <Reveal>
            <div className="au-glass rounded-[2rem] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-400">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </span>
                برندهای رنگ پاییز
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-amber-100/70 tabular-nums">
                  {toFaDigits(String(data.brands.length))} برند
                </span>
              </div>
              <div className="overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_5%,black_95%,transparent)]">
                <div className="au-marquee" style={{ "--au-mq": "27s" } as React.CSSProperties}>
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex shrink-0 gap-3 pe-3" aria-hidden={dup === 1}>
                      {data.brands.map((b) => (
                        <Link
                          key={`${dup}-${b.id}`}
                          href={`/products?brand=${b.slug}`}
                          tabIndex={dup === 1 ? -1 : undefined}
                          className="au-glass-soft flex h-12 shrink-0 items-center gap-2 rounded-full pe-5 ps-1.5 transition-colors hover:border-amber-400/40"
                        >
                          <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-[#1D1712]">
                            {b.logo || b.image ? (
                              <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="36px" className="object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[11px] font-black text-amber-100/50">{b.name.charAt(0)}</span>
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

      {/* ═══ FAQ — پتو accordion ═══ */}
      {data.faq.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="aut-faq">
          <Reveal>
            <CozyHeader icon={HelpCircle} title="پرسش‌های دنج" subtitle="پاسخ‌ها گرم مثل پتوی پاییزی" />
            <div className="grid gap-3 lg:grid-cols-2">
              {data.faq.map((f, i) => (
                <details key={i} className="au-faq au-glass-soft group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white/85 [&::-webkit-details-marker]:hidden">
                    {f.h}
                    <ChevronLeft className="au-faq-ico h-4 w-4 shrink-0 text-white/40" aria-hidden />
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
          <div className="au-glass rounded-[2rem] border-dashed p-16 text-center">
            <Leaf className="mx-auto mb-4 h-12 w-12 text-amber-500/40" aria-hidden />
            <h2 className="text-lg font-black text-white/85">ویترین در حال چیدمان است</h2>
            <p className="mt-2 text-sm leading-7 text-white/45">برگ‌های تازه به‌زودی روی موزاییک می‌نشینند…</p>
            <Link href="/products" className="au-cta mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
              مشاهده همه محصولات
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CLOSING — ember divider + bottom blend ═══ */}
      <div aria-hidden className="au-scan mx-auto mt-16 max-w-3xl" />
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-transparent via-background/70 to-background" />

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

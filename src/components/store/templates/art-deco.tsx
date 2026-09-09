"use client";

/**
 * TEMPLATE · art-deco — «Deco Neon» (v25 futurized rewrite)
 * ---------------------------------------------------------------------
 * 1920s geometric luxury beamed into the future: void black #0C0B09
 * canvas with GEOMETRIC GOLD NEON #D4AF37. Stepped frames (double CSS
 * borders + clip-path ziggurat corners), strictly symmetrical layouts,
 * a rotating sunburst radial behind the ceremonial hero title, gold
 * shimmer divider strips (stepped deco pattern via repeating-linear-
 * gradient with a travelling sheen), glowing ledger ranks and HUD
 * micro-labels («فصل ۰۱ …»). NOT plain e-commerce — a neon cathedral.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Diamond, Gem, Check, Plus, Package, ShoppingCart, Star, ChevronLeft,
  ShieldCheck, Truck, Headphones, Shapes, Smartphone, Laptop, Headphones as AudioIcon,
  Speaker, Watch, Camera, Tv, Gamepad2, Tablet, Cable,
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

/* ONE scoped style block — every rule prefixed dn- (deco neon) */
const ARTDECO_CSS = `
[data-tpl="art-deco"]{
  --dn-gold:#D4AF37;--dn-gold-hi:#F0D878;--dn-gold-deep:#8C7223;
  --dn-ink:#0C0B09;--dn-panel:#141009;--dn-ivory:#F3EEDF;
  background:#0C0B09;color:#F3EEDF;
}
[data-tpl="art-deco"] ::selection{background:rgba(212,175,55,.4);color:#FFF}
[data-tpl="art-deco"] a:focus-visible,[data-tpl="art-deco"] button:focus-visible,[data-tpl="art-deco"] summary:focus-visible{outline:2px solid #F0D878;outline-offset:3px}

/* rotating sunburst radial behind the hero title */
[data-tpl="art-deco"] .dn-sunburst{
  position:absolute;inset:-14%;pointer-events:none;
  background:
    radial-gradient(ellipse 62% 46% at 50% 44%,rgba(212,175,55,.18),transparent 68%),
    repeating-conic-gradient(from 0deg at 50% 44%,rgba(212,175,55,.075) 0deg 4deg,transparent 4deg 18deg);
  animation:dn-spin 90s linear infinite;
}
@keyframes dn-spin{to{transform:rotate(360deg)}}

/* gold shimmer divider strip — stepped deco pattern + travelling sheen */
[data-tpl="art-deco"] .dn-shimmer{
  position:relative;overflow:hidden;height:12px;
  background:repeating-linear-gradient(90deg,#F0D878 0 5px,#0C0B09 5px 9px,#D4AF37 9px 16px,#0C0B09 16px 20px,#8C7223 20px 27px,#0C0B09 27px 31px);
  box-shadow:0 0 20px rgba(212,175,55,.28);
}
[data-tpl="art-deco"] .dn-shimmer::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(100deg,transparent 20%,rgba(255,246,214,.9) 50%,transparent 80%);
  transform:translateX(-110%);animation:dn-sheen 7s ease-in-out infinite;
}
@keyframes dn-sheen{0%,55%{transform:translateX(-110%)}95%,100%{transform:translateX(110%)}}

/* stepped clip-path ziggurat corners */
[data-tpl="art-deco"] .dn-corner{
  position:absolute;width:20px;height:20px;z-index:2;opacity:.5;
  background:linear-gradient(135deg,#F5DE8A,#B8912E);
  clip-path:polygon(0 0,100% 0,100% 42%,42% 42%,42% 100%,0 100%);
  filter:drop-shadow(0 0 5px rgba(212,175,55,.5));
  transition:opacity .4s,filter .4s;
}
[data-tpl="art-deco"] .dn-corner-lg{width:30px;height:30px}
[data-tpl="art-deco"] .dn-corner-tl{top:7px;left:7px}
[data-tpl="art-deco"] .dn-corner-tr{top:7px;right:7px;transform:scaleX(-1)}
[data-tpl="art-deco"] .dn-corner-bl{bottom:7px;left:7px;transform:scaleY(-1)}
[data-tpl="art-deco"] .dn-corner-br{bottom:7px;right:7px;transform:scale(-1)}
[data-tpl="art-deco"] .dn-card:hover .dn-corner,[data-tpl="art-deco"] .dn-frame:hover .dn-corner{opacity:1;filter:drop-shadow(0 0 10px rgba(212,175,55,.85))}

/* neon product card */
[data-tpl="art-deco"] .dn-card{
  background:linear-gradient(168deg,#171309,#100E07);
  border:1px solid rgba(212,175,55,.22);
  transition:border-color .4s,box-shadow .4s,transform .4s;
}
[data-tpl="art-deco"] .dn-card:hover{
  border-color:rgba(212,175,55,.7);
  box-shadow:0 22px 48px -20px rgba(212,175,55,.42),0 0 30px -8px rgba(212,175,55,.25);
  transform:translateY(-3px);
}

/* gold neon CTA */
[data-tpl="art-deco"] .dn-cta{
  background:linear-gradient(165deg,#F5DE8A 0%,#D4AF37 55%,#A3821F 100%);color:#141005;
  box-shadow:inset 0 0 0 1px rgba(245,222,138,.55),0 10px 30px -10px rgba(212,175,55,.6);
  transition:transform .3s,box-shadow .3s,filter .3s;
}
[data-tpl="art-deco"] .dn-cta:hover{
  transform:translateY(-2px);filter:brightness(1.05);
  box-shadow:inset 0 0 0 1px rgba(245,222,138,.9),0 14px 38px -8px rgba(212,175,55,.8),0 0 26px rgba(212,175,55,.45);
}
[data-tpl="art-deco"] .dn-cta:active{transform:translateY(0) scale(.98)}

/* outline ghost button */
[data-tpl="art-deco"] .dn-ghost{border:1px solid rgba(212,175,55,.55);color:#E9DFB8;transition:all .3s}
[data-tpl="art-deco"] .dn-ghost:hover{background:rgba(212,175,55,.12);border-color:#D4AF37;box-shadow:0 0 18px rgba(212,175,55,.3);color:#F0D878}

/* add-to-cart button: ghost → floods gold on hover */
[data-tpl="art-deco"] .dn-add{border:1px solid rgba(212,175,55,.55);color:#E9DFB8;transition:all .3s}
[data-tpl="art-deco"] .dn-add:hover{background:linear-gradient(165deg,#F5DE8A 0%,#D4AF37 55%,#A3821F 100%);color:#141005;border-color:transparent;box-shadow:0 0 22px rgba(212,175,55,.5)}

/* neon display text */
[data-tpl="art-deco"] .dn-neon{text-shadow:0 0 14px rgba(212,175,55,.55),0 0 48px rgba(212,175,55,.3)}

/* gold price pill */
[data-tpl="art-deco"] .dn-price{background:linear-gradient(165deg,#F5DE8A,#D4AF37 60%,#A3821F);color:#141005}

/* infinite marquee (announcement / brands) */
[data-tpl="art-deco"] .dn-marq{overflow:hidden}
[data-tpl="art-deco"] .dn-marq-track{display:flex;width:max-content;animation:dn-marq var(--dn-mq,26s) linear infinite}
[data-tpl="art-deco"] .dn-marq:hover .dn-marq-track{animation-play-state:paused}
@keyframes dn-marq{to{transform:translateX(-50%)}}
[data-tpl="art-deco"] .dn-mask{-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}

/* rails & custom neon scrollbars */
[data-tpl="art-deco"] .dn-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="art-deco"] .dn-rail::-webkit-scrollbar{display:none}
[data-tpl="art-deco"] .dn-scroll{scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.45) transparent}
[data-tpl="art-deco"] .dn-scroll::-webkit-scrollbar{width:7px}
[data-tpl="art-deco"] .dn-scroll::-webkit-scrollbar-thumb{background:linear-gradient(#F0D878,#8C7223);border-radius:99px}
[data-tpl="art-deco"] .dn-scroll::-webkit-scrollbar-track{background:rgba(212,175,55,.08)}

/* ziggurat step + breathe */
[data-tpl="art-deco"] .dn-zig-step{width:4px;background:linear-gradient(#F0D878,#D4AF37);box-shadow:0 0 7px rgba(212,175,55,.55)}
[data-tpl="art-deco"] .dn-breathe{animation:dn-breathe 7s ease-in-out infinite}
@keyframes dn-breathe{0%,100%{opacity:.7}50%{opacity:1}}

/* framed plate (hero flanks / frieze) */
[data-tpl="art-deco"] .dn-plate{border:1px solid rgba(212,175,55,.4);transition:border-color .4s,box-shadow .4s}
[data-tpl="art-deco"] .dn-plate:hover{border-color:rgba(212,175,55,.9);box-shadow:0 16px 40px -14px rgba(212,175,55,.35),0 0 24px -6px rgba(212,175,55,.25)}

/* token blend for the shared StoriesRow on the black canvas */
[data-tpl="art-deco"] .dn-story-wrap{
  --background:#0C0B09;--foreground:#F3EEDF;--card:#171309;--muted:#221D12;
  --muted-foreground:#A99E77;--primary:#D4AF37;--border:rgba(212,175,55,.3);
}

/* native details FAQ */
[data-tpl="art-deco"] details.dn-faq summary{list-style:none;cursor:pointer}
[data-tpl="art-deco"] details.dn-faq summary::-webkit-details-marker{display:none}
[data-tpl="art-deco"] details.dn-faq .dn-faq-icon{transition:transform .35s}
[data-tpl="art-deco"] details.dn-faq[open] .dn-faq-icon{transform:rotate(45deg)}

/* ledger rank diamond */
[data-tpl="art-deco"] .dn-rank{transition:all .35s}

@media (prefers-reduced-motion:reduce){
  [data-tpl="art-deco"] .dn-sunburst,[data-tpl="art-deco"] .dn-shimmer::after,
  [data-tpl="art-deco"] .dn-marq-track,[data-tpl="art-deco"] .dn-breathe{animation:none!important}
  [data-tpl="art-deco"] .dn-card,[data-tpl="art-deco"] .dn-cta,[data-tpl="art-deco"] .dn-plate{transition:none!important}
}
/* ══ v26fix · LIGHT SKIN (html:not(.dark)) — dark rules above stay untouched ══
   Parchment gallery #F7F1E1 / ink #2E2A14; gold neon → deep #8C7223 with
   #A8862B highlights; cards → white parchment; shimmer gaps → cream. */
html:not(.dark) [data-tpl="art-deco"]{
  --dn-gold:#8C7223;--dn-gold-hi:#A8862B;--dn-gold-deep:#6B5518;
  --dn-ink:#F7F1E1;--dn-panel:#FFFFFF;--dn-ivory:#2E2A14;
  background:#F7F1E1;color:#2E2A14;
}
html:not(.dark) [data-tpl="art-deco"] ::selection{background:rgba(140,114,35,.28);color:#2E2A14}
html:not(.dark) [data-tpl="art-deco"] a:focus-visible,
html:not(.dark) [data-tpl="art-deco"] button:focus-visible,
html:not(.dark) [data-tpl="art-deco"] summary:focus-visible{outline-color:#8C7223}
/* sunburst + shimmer + corners → parchment gold */
html:not(.dark) [data-tpl="art-deco"] .dn-sunburst{
  background:
    radial-gradient(ellipse 62% 46% at 50% 44%,rgba(140,114,35,.14),transparent 68%),
    repeating-conic-gradient(from 0deg at 50% 44%,rgba(140,114,35,.06) 0deg 4deg,transparent 4deg 18deg);
}
html:not(.dark) [data-tpl="art-deco"] .dn-shimmer{
  background:repeating-linear-gradient(90deg,#D9BC55 0 5px,#F7F1E1 5px 9px,#C4A02F 9px 16px,#F7F1E1 16px 20px,#8C7223 20px 27px,#F7F1E1 27px 31px);
  box-shadow:0 0 20px rgba(140,114,35,.3);
}
html:not(.dark) [data-tpl="art-deco"] .dn-zig-step{box-shadow:0 0 7px rgba(140,114,35,.4)}
/* cards / plates → parchment */
html:not(.dark) [data-tpl="art-deco"] .dn-card{
  background:linear-gradient(168deg,#FFFFFF,#FBF8EC);
  border-color:rgba(140,114,35,.3);
}
html:not(.dark) [data-tpl="art-deco"] .dn-card:hover{
  border-color:rgba(140,114,35,.6);
  box-shadow:0 22px 48px -20px rgba(46,42,20,.25),0 0 26px -10px rgba(140,114,35,.22);
}
html:not(.dark) [data-tpl="art-deco"] .dn-plate{border-color:rgba(140,114,35,.45)}
html:not(.dark) [data-tpl="art-deco"] .dn-plate:hover{border-color:rgba(140,114,35,.75);box-shadow:0 16px 40px -14px rgba(46,42,20,.22),0 0 22px -8px rgba(140,114,35,.25)}
/* buttons — gold CTA stays; ghost/add go dark-bronze */
html:not(.dark) [data-tpl="art-deco"] .dn-cta{box-shadow:inset 0 0 0 1px rgba(245,222,138,.55),0 10px 30px -10px rgba(140,114,35,.5)}
html:not(.dark) [data-tpl="art-deco"] .dn-ghost{border-color:rgba(140,114,35,.6);color:#5C4A1E}
html:not(.dark) [data-tpl="art-deco"] .dn-ghost:hover{background:rgba(140,114,35,.1);border-color:#8C7223;color:#6B5518;box-shadow:0 0 18px rgba(140,114,35,.28)}
html:not(.dark) [data-tpl="art-deco"] .dn-add{border-color:rgba(140,114,35,.6);color:#5C4A1E}
html:not(.dark) [data-tpl="art-deco"] .dn-neon{text-shadow:0 0 14px rgba(140,114,35,.35),0 0 44px rgba(140,114,35,.18)}
html:not(.dark) [data-tpl="art-deco"] .dn-scroll{scrollbar-color:rgba(140,114,35,.45) transparent}
html:not(.dark) [data-tpl="art-deco"] .dn-scroll::-webkit-scrollbar-track{background:rgba(140,114,35,.06)}
/* story section tokens → parchment */
html:not(.dark) [data-tpl="art-deco"] .dn-story-wrap{
  --background:#F7F1E1;--foreground:#2E2A14;--card:#FFFFFF;--muted:#EFE8D2;
  --muted-foreground:#6B6045;--primary:#8C7223;--border:rgba(46,42,20,.18);
}
/* canvas / tiles / strips */
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#0C0B09\\]{background-color:#F7F1E1}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#0F0D07\\]{background-color:#FFFFFF}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#100E08\\]{background-color:#FDFBF2}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#0C0B09\\]\\/80{background-color:rgba(253,251,242,.9)}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#0C0B09\\]\\/85{background-color:rgba(253,251,242,.92)}
/* image scrims → parchment fades */
html:not(.dark) [data-tpl="art-deco"] .from-\\[\\#0C0B09\\]\\/85{--tw-gradient-from:rgba(247,241,225,.88)}
html:not(.dark) [data-tpl="art-deco"] .from-\\[\\#0C0B09\\]\\/50{--tw-gradient-from:rgba(247,241,225,.55)}
html:not(.dark) [data-tpl="art-deco"] .via-\\[\\#0C0B09\\]\\/10{--tw-gradient-via:rgba(247,241,225,.12)}
/* ivory text family → ink */
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#F3EEDF\\]{color:#2E2A14}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#F3EEDF\\]\\/70{color:rgba(46,42,20,.72)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#F3EEDF\\]\\/60{color:rgba(46,42,20,.62)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#F3EEDF\\]\\/55{color:rgba(46,42,20,.58)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#E9DFB8\\]{color:#5C4A1E}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#A99E77\\]{color:#6B6045}
/* gold family → deep deco gold */
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#D4AF37\\]{color:#8C7223}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#D4AF37\\]\\/80{color:rgba(140,114,35,.8)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#D4AF37\\]\\/50{color:rgba(140,114,35,.5)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#D4AF37\\]\\/40{color:rgba(140,114,35,.42)}
html:not(.dark) [data-tpl="art-deco"] .text-\\[\\#F0D878\\]{color:#A8862B}
html:not(.dark) [data-tpl="art-deco"] .fill-\\[\\#D4AF37\\]{fill:#A8862B}
html:not(.dark) [data-tpl="art-deco"] .hover\\:text-\\[\\#F0D878\\]:hover{color:#A8862B}
html:not(.dark) [data-tpl="art-deco"] .hover\\:bg-\\[\\#D4AF37\\]\\/\\[\\.06\\]:hover{background-color:rgba(140,114,35,.1)}
html:not(.dark) [data-tpl="art-deco"] .group:hover .group-hover\\:text-\\[\\#F0D878\\]{color:#A8862B}
/* gold hairlines / diamonds → deepened alpha */
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#D4AF37\\]\\/50{background-color:rgba(168,134,43,.55)}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#D4AF37\\]\\/40{background-color:rgba(168,134,43,.45)}
html:not(.dark) [data-tpl="art-deco"] .bg-\\[\\#D4AF37\\]\\/70{background-color:rgba(168,134,43,.72)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/10{border-color:rgba(140,114,35,.18)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/15{border-color:rgba(140,114,35,.22)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/20{border-color:rgba(140,114,35,.26)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/25{border-color:rgba(140,114,35,.3)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/30{border-color:rgba(140,114,35,.34)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/45{border-color:rgba(140,114,35,.48)}
html:not(.dark) [data-tpl="art-deco"] .border-\\[\\#D4AF37\\]\\/50{border-color:rgba(140,114,35,.52)}
html:not(.dark) [data-tpl="art-deco"] .divide-\\[\\#D4AF37\\]\\/20 > :not(:last-child){border-color:rgba(140,114,35,.26)}
/* gold glows softened */
html:not(.dark) [data-tpl="art-deco"] .shadow-\\[0_0_18px_rgba\\(212\\,175\\,55\\,\\.5\\)\\]{--tw-shadow:0 0 18px rgba(140,114,35,.35);box-shadow:0 0 18px rgba(140,114,35,.35)}
html:not(.dark) [data-tpl="art-deco"] .group:hover .group-hover\\:shadow-\\[0_0_16px_rgba\\(212\\,175\\,55\\,\\.45\\)\\]{--tw-shadow:0 0 16px rgba(140,114,35,.4);box-shadow:0 0 16px rgba(140,114,35,.4)}
html:not(.dark) [data-tpl="art-deco"] .group:hover .group-hover\\:shadow-\\[0_0_16px_rgba\\(212\\,175\\,55\\,\\.55\\)\\]{--tw-shadow:0 0 16px rgba(140,114,35,.45);box-shadow:0 0 16px rgba(140,114,35,.45)}
`;

/* ── stepped ziggurat divider — the signature deco silhouette ────── */
function Ziggurat({ className }: { className?: string }) {
  const steps = [4, 8, 12, 16, 20, 16, 12, 8, 4];
  return (
    <div aria-hidden className={cn("flex items-end justify-center gap-1", className)}>
      {steps.map((h, i) => (
        <span key={i} className="dn-zig-step" style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}

/* ── ceremonial section header with HUD chapter code ─────────────── */
function DecoHeader({ kicker, title, href }: { kicker: string; title: string; href?: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-[10px] font-bold tracking-[0.42em] text-[#D4AF37]">{kicker}</p>
      <h2 className="dn-neon mt-3 text-2xl font-black tracking-[0.1em] md:text-3xl">{title}</h2>
      <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
        <span className="h-px w-16 bg-[#D4AF37]/50" />
        <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" />
        <span className="h-px w-16 bg-[#D4AF37]/50" />
      </div>
      {href && (
        <Link
          href={href}
          className="dn-ghost mt-6 inline-flex h-11 items-center px-8 text-[11px] font-bold tracking-[0.2em]"
        >
          مشاهدهٔ مجموعه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useDecoAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = async (product: TemplateProduct) => {
    if (!product.inStock || added) return;
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

/* ── gold stars ──────────────────────────────────────────────────── */
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center justify-center gap-1.5 text-[10.5px] text-[#A99E77]">
      <Star className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" aria-hidden />
      <span className="font-bold text-[#F3EEDF]">{rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}</span>
      {count > 0 && <span className="tabular-nums">({toFaDigits(count.toLocaleString("fa-IR"))} نظر)</span>}
    </span>
  );
}

/* ── framed product card — stepped neon frame + ziggurat corners ─── */
function DecoCard({ product, className }: { product: TemplateProduct; className?: string }) {
  const { addToCart, added } = useDecoAdd();
  return (
    <article className={cn("dn-card group relative flex flex-col", !product.inStock && "grayscale-[0.45]", className)}>
      <span aria-hidden className="dn-corner dn-corner-tl" />
      <span aria-hidden className="dn-corner dn-corner-tr" />
      <span aria-hidden className="dn-corner dn-corner-bl" />
      <span aria-hidden className="dn-corner dn-corner-br" />
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative m-4 mb-0 block aspect-square overflow-hidden bg-[#0F0D07]"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
            className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#5C543A]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="dn-price absolute start-3 top-3 px-2.5 py-1 text-[10px] font-black tabular-nums">
            {toFaDigits(product.discountPercent)}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-[#0C0B09]/85 py-1.5 text-center text-[10px] font-bold tracking-[0.2em] text-[#A99E77]">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col items-center px-5 pb-6 pt-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] text-[#A99E77]">{product.brand.name}</p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-2 min-h-12 text-[13.5px] font-black leading-7 transition-colors hover:text-[#F0D878]"
        >
          {product.name}
        </Link>
        <div className="mt-3">
          <Stars rating={product.rating} count={product.reviewCount} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          {product.discountPercent > 0 && (
            <span className="text-[11px] text-[#A99E77] price-old tabular-nums">{formatPrice(product.price)}</span>
          )}
          <span className="dn-price px-3 py-1 text-[12px] font-black tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="text-[9px] font-normal"> تومان</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "mt-5 flex h-11 w-full items-center justify-center gap-2 border text-[11px] font-black tracking-[0.2em] transition-all",
            !product.inStock
              ? "cursor-not-allowed border-[#3A3626]/30 text-[#5C543A]"
              : added
                ? "dn-cta border-transparent"
                : "dn-add"
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> افزوده شد
            </>
          ) : product.inStock ? (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden /> افزودن به سبد
            </>
          ) : (
            "اتمام موجودی"
          )}
        </button>
      </div>
    </article>
  );
}

/* ── TEMPLATE ────────────────────────────────────────────────────── */
export function ArtDecoTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlides = data.slides.slice(0, 3);
  const totalSold = data.bestsellers.reduce((n, p) => n + p.soldCount, 0);
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  /* v20 ticker list → announcement fallback → own ceremonial default */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink ?? undefined }]
        : [];
  const tickerDur = store.tickerSpeed && store.tickerSpeed >= 6 ? store.tickerSpeed : 26;

  /* v18 chrome — bespoke art-deco header/footer */
  const chrome = TEMPLATE_CHROME["art-deco"];

  const stats = [
    { v: counts.products, l: "محصول" },
    { v: counts.brands, l: "برند" },
    { v: counts.categories, l: "دسته" },
    { v: totalSold, l: "فروش موفق" },
  ];

  const services = [
    { icon: Truck, t: "ارسال به سراسر کشور" },
    { icon: ShieldCheck, t: "ضمانت اصالت کالا" },
    { icon: Headphones, t: "پشتیبانی ۲۴/۷" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="art-deco" className="isolate w-full bg-[#0C0B09] text-[#F3EEDF]">
      <style>{ARTDECO_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      <div className="dn-shimmer" aria-hidden />

      {/* ═══ announcement ticker — gold neon broadcast strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیهٔ فروشگاه" className="border-b border-[#D4AF37]/20 bg-[#100E08]">
          <div dir="ltr" className="dn-marq dn-mask mx-auto max-w-6xl">
            <div className="dn-marq-track" style={{ "--dn-mq": `${tickerDur}s` } as React.CSSProperties}>
              {[0, 1].map((g) => (
                <div key={g} className="flex items-center" dir="rtl">
                  {tickerMsgs.map((m, i) => (
                    <span key={`${g}-${i}`} className="flex items-center gap-2.5 whitespace-nowrap px-6 py-2.5 text-[12px] text-[#E9DFB8]">
                      <Diamond className="h-2.5 w-2.5 shrink-0 text-[#D4AF37]" aria-hidden />
                      {m.link ? (
                        <Link href={m.link} className="transition-colors hover:text-[#F0D878]">
                          {m.text}
                        </Link>
                      ) : (
                        <span>{m.text}</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto w-full max-w-6xl">
        {/* ═══ HERO — symmetric gold cathedral with sunburst ═══ */}
        <section className="relative isolate overflow-hidden" aria-labelledby="ad-hero">
          <div aria-hidden className="dn-sunburst" />
          {/* symmetric deco backdrop — concentric rotated diamonds */}
          <span aria-hidden className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#D4AF37]/15" />
          <span aria-hidden className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#D4AF37]/10" />

          <div className="relative flex min-h-[420px] flex-col justify-center px-4 py-16 sm:min-h-[560px] md:py-24">
            {/* ornamental crown */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="dn-breathe mb-10 flex items-center justify-center gap-3"
              aria-hidden
            >
              <span className="h-px w-24 bg-[#D4AF37]/40 md:w-40" />
              <Gem className="h-3 w-3 text-[#D4AF37]" />
              <span className="h-2 w-2 rotate-45 bg-[#D4AF37]" />
              <Gem className="h-3 w-3 text-[#D4AF37]" />
              <span className="h-px w-24 bg-[#D4AF37]/40 md:w-40" />
            </motion.div>

            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
              {/* symmetric flank — framed slide plate */}
              <div className="hidden lg:block">
                {heroSlides[1] ? (
                  <Link
                    href={heroSlides[1].ctaUrl ?? "/products"}
                    aria-label={heroSlides[1].title}
                    className="dn-plate dn-frame group relative block p-2"
                  >
                    <span aria-hidden className="dn-corner dn-corner-tl" />
                    <span aria-hidden className="dn-corner dn-corner-br" />
                    <span className="relative block aspect-[3/4] overflow-hidden bg-[#0F0D07]">
                      <SlideArt
                        slide={heroSlides[1]}
                        alt={heroSlides[1].title}
                        fill
                        sizes="22vw"
                        className="object-cover opacity-85 transition-opacity duration-500 group-hover:opacity-100"
                        loading="lazy"
                      />
                    </span>
                  </Link>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center border border-[#D4AF37]/20 p-6 text-[#D4AF37]/40">
                    <Gem className="h-12 w-12" aria-hidden />
                  </div>
                )}
              </div>

              {/* center — ceremonial neon title */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="text-center"
              >
                <p className="text-[10px] font-bold tracking-[0.5em] text-[#D4AF37]">فروشگاه رسمی لوکس</p>
                <h1 id="ad-hero" className="dn-neon mt-5 text-4xl font-black leading-[1.25] tracking-[0.12em] sm:text-5xl md:text-6xl">
                  {store.storeName}
                </h1>
                <p dir="ltr" className="mt-4 text-[11px] font-bold uppercase tracking-[0.5em] text-[#D4AF37]/80">
                  {store.storeNameEn}
                </p>
                <Ziggurat className="mt-8 opacity-90" />
                <p className="mx-auto mt-8 max-w-md text-[13px] leading-8 text-[#F3EEDF]/70">
                  {store.announcementActive && store.announcement
                    ? store.announcement
                    : "هندسه‌ای دقیق از بهترین کالاهای دیجیتال؛ انتخاب‌شده با وسواس، عرضه‌شده با درخشش طلایی."}
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/products"
                    className="dn-cta flex h-12 items-center px-10 text-xs font-black tracking-[0.25em]"
                  >
                    تماشای گالری
                  </Link>
                  <Link
                    href="/products?discount=1"
                    className="dn-ghost flex h-12 items-center px-10 text-xs font-black tracking-[0.25em]"
                  >
                    تخفیف‌دارها
                  </Link>
                </div>
              </motion.div>

              <div className="hidden lg:block">
                {heroSlides[2] ? (
                  <Link
                    href={heroSlides[2].ctaUrl ?? "/products"}
                    aria-label={heroSlides[2].title}
                    className="dn-plate dn-frame group relative block p-2"
                  >
                    <span aria-hidden className="dn-corner dn-corner-tr" />
                    <span aria-hidden className="dn-corner dn-corner-bl" />
                    <span className="relative block aspect-[3/4] overflow-hidden bg-[#0F0D07]">
                      <SlideArt
                        slide={heroSlides[2]}
                        alt={heroSlides[2].title}
                        fill
                        sizes="22vw"
                        className="object-cover opacity-85 transition-opacity duration-500 group-hover:opacity-100"
                        loading="lazy"
                      />
                    </span>
                  </Link>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center border border-[#D4AF37]/20 p-6 text-[#D4AF37]/40">
                    <Gem className="h-12 w-12" aria-hidden />
                  </div>
                )}
              </div>
            </div>

            {/* symmetric stat colonnade — real counts */}
            <div className="mx-auto mt-16 grid w-full max-w-2xl grid-cols-2 divide-x divide-[#D4AF37]/20 border-y border-[#D4AF37]/25 py-6 text-center sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.l} className="px-2">
                  <p className="dn-neon text-xl font-black tabular-nums text-[#D4AF37] md:text-2xl">
                    {toFaDigits(s.v.toLocaleString("fa-IR"))}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-[0.3em] text-[#F3EEDF]/55">{s.l}</p>
                </div>
              ))}
            </div>

            {/* hero frieze — the leading slide as a gold-framed banner */}
            {heroSlides[0] && (
              <div className="dn-plate dn-frame relative mx-auto mt-12 max-w-3xl p-1.5">
                <span aria-hidden className="dn-corner dn-corner-lg dn-corner-tl" />
                <span aria-hidden className="dn-corner dn-corner-lg dn-corner-tr" />
                <span aria-hidden className="dn-corner dn-corner-lg dn-corner-bl" />
                <span aria-hidden className="dn-corner dn-corner-lg dn-corner-br" />
                <Link
                  href={heroSlides[0].ctaUrl ?? (heroSlides[0].product ? `/products/${heroSlides[0].product.slug}` : "/products")}
                  aria-label={heroSlides[0].title}
                  className="group relative block h-44 overflow-hidden bg-[#0F0D07] sm:h-56 md:h-64"
                >
                  <SlideArt
                    slide={heroSlides[0]}
                    alt={heroSlides[0].title}
                    fill
                    sizes="(max-width: 768px) 92vw, 768px"
                    className="object-cover transition-transform duration-[1600ms] group-hover:scale-[1.06]"
                    loading="lazy"
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0C0B09]/85 via-[#0C0B09]/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 p-5">
                    <span className="min-w-0 text-start">
                      <span className="block text-[10px] font-bold tracking-[0.35em] text-[#D4AF37]">رونق ویژه</span>
                      <span className="mt-1.5 block truncate text-lg font-black tracking-wide text-[#F3EEDF]">
                        {heroSlides[0].title}
                      </span>
                    </span>
                    {heroSlides[0].ctaText && (
                      <span className="dn-ghost hidden h-11 shrink-0 items-center px-6 text-[11px] font-bold tracking-[0.2em] sm:flex">
                        {heroSlides[0].ctaText}
                      </span>
                    )}
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* ziggurat step-out of the dark band */}
          <div className="relative flex items-end justify-center gap-1 pb-7" aria-hidden>
            {ZigguratSteps().map((h, i) => (
              <span key={i} className="dn-zig-step" style={{ height: `${h}px` }} />
            ))}
          </div>
        </section>

        {/* ═══ service plinth — HUD micro chips ═══ */}
        <section aria-label="خدمات فروشگاه" className="px-4 pt-6">
          <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {services.map((s) => (
              <li key={s.t} className="flex items-center justify-center gap-2.5 border border-[#D4AF37]/20 bg-[#100E08] px-4 py-3.5 text-[11.5px] font-bold text-[#E9DFB8]">
                <s.icon className="h-4 w-4 shrink-0 text-[#D4AF37]" aria-hidden />
                {s.t}
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="dn-story-wrap px-4 py-14" aria-label={`استوری‌های فروشگاه (${toFaDigits(counts.stories)} استوری)`}>
            <Reveal>
              <p className="mb-5 flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.4em] text-[#A99E77]">
                <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" aria-hidden />
                استوری‌های ویژه · {toFaDigits(counts.stories)}
                <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]" aria-hidden />
              </p>
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES — symmetric ziggurat tiles ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-cats">
            <Reveal>
              <DecoHeader kicker="فصل ۰۱" title="گالری دسته‌بندی‌ها" href="/products" />
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.map((c) => {
                  const Icon = catIcon(c.slug);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/products?category=${c.slug}`}
                        className="dn-card group relative flex min-h-32 flex-col items-center justify-center gap-3 p-5 text-center"
                      >
                        <span aria-hidden className="dn-corner dn-corner-tl" />
                        <span aria-hidden className="dn-corner dn-corner-br" />
                        <span className="grid h-11 w-11 rotate-45 place-items-center border border-[#D4AF37]/45 transition-all duration-500 group-hover:border-[#D4AF37] group-hover:shadow-[0_0_16px_rgba(212,175,55,.45)]">
                          <Icon className="h-5 w-5 -rotate-45 text-[#D4AF37]" aria-hidden />
                        </span>
                        <span className="text-[13px] font-black leading-6">{c.name}</span>
                        <span className="text-[10px] font-bold tracking-widest text-[#A99E77] tabular-nums">
                          {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — neon red-gold chamber ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-deals">
            <Reveal>
              <DecoHeader kicker="فصل ۰۲" title="تخفیف‌های کنگره‌دار" href="/products?discount=1" />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {data.discounted.slice(0, 6).map((p) => (
                  <div key={p.id} className="relative">
                    <span
                      aria-hidden
                      className="dn-price absolute -top-3.5 left-1/2 z-10 grid h-10 w-10 -translate-x-1/2 rotate-45 place-items-center shadow-[0_0_18px_rgba(212,175,55,.5)]"
                    >
                      <span className="-rotate-45 text-[10px] font-black tabular-nums">
                        {toFaDigits(p.discountPercent)}٪
                      </span>
                    </span>
                    <DecoCard product={p} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — golden selection grid ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-featured">
            <Reveal>
              <DecoHeader kicker="فصل ۰۳" title="انتخاب‌های طلایی" href="/products?sort=rating" />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured.slice(0, 6).map((p) => (
                  <DecoCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — cinematic treasure vault ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-exclusive">
            <Reveal>
              <DecoHeader kicker="فصل ۰۴" title="گنجینهٔ انحصاری" />
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {data.exclusive.slice(0, 2).map((p) => (
                  <article key={p.id} className="dn-card dn-frame group relative grid grid-cols-1 overflow-hidden sm:grid-cols-[190px_1fr]">
                    <span aria-hidden className="dn-corner dn-corner-tl" />
                    <span aria-hidden className="dn-corner dn-corner-tr" />
                    <span aria-hidden className="dn-corner dn-corner-bl" />
                    <span aria-hidden className="dn-corner dn-corner-br" />
                    <Link
                      href={`/products/${p.slug}`}
                      aria-label={p.name}
                      className="relative block aspect-square bg-[#0F0D07] sm:aspect-auto sm:h-full sm:min-h-[260px]"
                    >
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 92vw, 190px"
                          className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-[#5C543A]">
                          <Package className="h-12 w-12" aria-hidden />
                        </span>
                      )}
                      <span className="absolute start-3 top-3 flex items-center gap-1.5 bg-[#0C0B09]/80 px-2.5 py-1 text-[9.5px] font-black tracking-[0.18em] text-[#F0D878] backdrop-blur">
                        <Gem className="h-3 w-3" aria-hidden /> انحصاری
                      </span>
                    </Link>
                    <div className="flex flex-col justify-center p-6">
                      <p className="text-[10px] font-bold tracking-[0.3em] text-[#A99E77]">{p.brand.name}</p>
                      <Link href={`/products/${p.slug}`} className="mt-2 text-lg font-black leading-8 transition-colors hover:text-[#F0D878]">
                        {p.name}
                      </Link>
                      <div className="mt-2">
                        <Stars rating={p.rating} count={p.reviewCount} />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        {p.discountPercent > 0 && (
                          <span className="text-[11px] text-[#A99E77] price-old tabular-nums">{formatPrice(p.price)}</span>
                        )}
                        <span className="dn-price px-3 py-1 text-[12.5px] font-black tabular-nums">
                          {formatPrice(p.effectivePrice)}
                          <span className="text-[9px] font-normal"> تومان</span>
                        </span>
                      </div>
                      <p className="mt-4 text-[11.5px] leading-7 text-[#F3EEDF]/60">
                        برگزیدهٔ ویژهٔ {store.storeName}؛ موجودی محدود با اولویت ارسال.
                      </p>
                      <ExclusiveAdd product={p} />
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — glowing ledger ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-best">
            <Reveal>
              <DecoHeader kicker="فصل ۰۵" title="دفتر پرفروش‌ها" href="/products?sort=bestselling" />
              <ol className="dn-scroll mx-auto max-h-96 max-w-3xl overflow-y-auto border-y-2 border-[#D4AF37]/30 pe-1">
                {data.bestsellers.slice(0, 8).map((p, i) => (
                  <LedgerRow key={p.id} product={p} rank={i + 1} />
                ))}
              </ol>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST — quartet rail ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-newest">
            <Reveal>
              <DecoHeader kicker="فصل ۰۶" title="تازه‌رسیده‌ها" href="/products?sort=newest" />
              <div className="dn-rail -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2">
                {data.newest.slice(0, 8).map((p) => (
                  <DecoCard key={p.id} product={p} className="w-[262px] shrink-0 snap-start sm:w-[300px]" />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — deco exhibition panels ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-14" aria-label="ویترین‌های ویژه">
            <Reveal>
              <DecoHeader kicker="فصل ۰۷" title="تابلوهای نمایشگاه" />
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <article key={s.id} className="dn-card dn-frame group relative p-3">
                    <span aria-hidden className="dn-corner dn-corner-tl" />
                    <span aria-hidden className="dn-corner dn-corner-tr" />
                    <span aria-hidden className="dn-corner dn-corner-bl" />
                    <span aria-hidden className="dn-corner dn-corner-br" />
                    <div className="flex h-full flex-col">
                      <Link
                        href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                        aria-label={s.title}
                        className="relative block aspect-[16/10] overflow-hidden bg-[#0F0D07]"
                      >
                        <Image
                          src={s.image}
                          alt={s.title}
                          fill
                          sizes="(max-width: 1024px) 92vw, 46vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0C0B09]/50 to-transparent" />
                      </Link>
                      <div className="flex flex-1 flex-col items-center px-4 py-6 text-center">
                        <h3 className="dn-neon text-lg font-black tracking-[0.08em]">{s.title}</h3>
                        {s.subtitle && <p className="mt-2 max-w-sm text-[12px] leading-7 text-[#A99E77]">{s.subtitle}</p>}
                        {s.product && (
                          <p className="dn-price mt-4 px-3 py-1 text-[11px] font-black tabular-nums">
                            {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                          </p>
                        )}
                        <Link
                          href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                          className="dn-ghost mt-5 inline-flex h-11 items-center px-8 text-[11px] font-bold tracking-[0.2em]"
                        >
                          مشاهدهٔ تابلوی
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ — ornamental neon accordion ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-14" aria-labelledby="ad-faq">
            <Reveal>
              <DecoHeader kicker="فصل ۰۸" title="پرسش‌های متداول" />
              <div className="dn-card dn-frame relative mx-auto max-w-3xl p-5">
                <span aria-hidden className="dn-corner dn-corner-tl" />
                <span aria-hidden className="dn-corner dn-corner-tr" />
                <span aria-hidden className="dn-corner dn-corner-bl" />
                <span aria-hidden className="dn-corner dn-corner-br" />
                {data.faq.map((f, i) => (
                  <details key={i} className="dn-faq border-b border-[#D4AF37]/20 last:border-b-0">
                    <summary className="flex min-h-14 items-center gap-4 py-5">
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-[#D4AF37]/70" />
                      <span className="flex-1 text-[13px] font-black leading-7">{f.h}</span>
                      <Plus className="dn-faq-icon h-4 w-4 shrink-0 text-[#D4AF37]" aria-hidden />
                    </summary>
                    <p className="max-w-2xl pb-6 pe-6 ps-6 text-[12.5px] leading-8 text-[#F3EEDF]/70">{f.p}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — diamond marquee ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-8 border-t border-[#D4AF37]/20 px-4 py-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[10px] font-bold tracking-[0.4em] text-[#A99E77]">برندهای معتبر</p>
              <div dir="ltr" className="dn-marq dn-mask">
                <div className="dn-marq-track" style={{ "--dn-mq": "30s" } as React.CSSProperties}>
                  {[0, 1].map((g) => (
                    <div key={g} className="flex items-center" dir="rtl">
                      {data.brands.map((b) => (
                        <span key={`${g}-${b.id}`} className="flex items-center gap-3 px-6">
                          <Diamond className="h-1.5 w-1.5 text-[#D4AF37]/50" aria-hidden />
                          <Link
                            href={`/products?brand=${b.slug}`}
                            className="whitespace-nowrap text-[13px] font-black tracking-widest text-[#A99E77] transition-colors hover:text-[#F0D878]"
                          >
                            {b.name}
                          </Link>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="px-4 py-24">
            <div className="dn-card dn-frame relative mx-auto max-w-md p-10 text-center">
              <span aria-hidden className="dn-corner dn-corner-tl" />
              <span aria-hidden className="dn-corner dn-corner-tr" />
              <span aria-hidden className="dn-corner dn-corner-bl" />
              <span aria-hidden className="dn-corner dn-corner-br" />
              <Gem className="mx-auto h-10 w-10 text-[#D4AF37]/50" aria-hidden />
              <h2 className="dn-neon mt-4 text-lg font-black tracking-[0.1em]">گالری در حال چیدمان است</h2>
              <p className="mt-2 text-[13px] leading-8 text-[#A99E77]">آثار این مجموعه به‌زودی با درخشش طلایی به تالار می‌رسند…</p>
              <Ziggurat className="mt-8 opacity-70" />
            </div>
          </section>
        )}
      </main>

      <div className="dn-shimmer" aria-hidden />
      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

function ZigguratSteps() {
  return [4, 8, 12, 16, 20, 16, 12, 8, 4];
}

const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, smartphone: Smartphone, "mobile-phones": Smartphone, phones: Smartphone,
  laptop: Laptop, laptops: Laptop, notebook: Laptop, computer: Laptop,
  headphones: Headphones, headphone: Headphones, audio: AudioIcon, speaker: Speaker, speakers: Speaker,
  watch: Watch, watches: Watch, "smart-watch": Watch,
  camera: Camera, cameras: Camera,
  tv: Tv, television: Tv, monitor: Laptop,
  game: Gamepad2, gaming: Gamepad2, console: Gamepad2,
  tablet: Tablet, tablets: Tablet,
  accessories: Cable, accessory: Cable,
};

function catIcon(slug: string): React.ElementType {
  return CAT_ICONS[slug] ?? Shapes;
}

/* ledger row — glowing gold rank diamond + quick add */
function LedgerRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useDecoAdd();
  return (
    <li className="border-b border-[#D4AF37]/20 last:border-b-0">
      <div className="group flex min-h-14 items-center gap-4 py-4 transition-colors hover:bg-[#D4AF37]/[.06]">
        <span className="dn-rank grid h-9 w-9 shrink-0 rotate-45 place-items-center border border-[#D4AF37]/50 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:shadow-[0_0_16px_rgba(212,175,55,.55)]">
          <span className="-rotate-45 text-[11px] font-black tabular-nums text-[#D4AF37] group-hover:text-[#141005]">
            {toFaDigits(String(rank).padStart(2, "0"))}
          </span>
        </span>
        <Link href={`/products/${product.slug}`} className="min-w-0 flex-1 truncate text-[13.5px] font-black transition-colors group-hover:text-[#F0D878]">
          {product.name}
        </Link>
        {product.soldCount > 0 && (
          <span className="hidden shrink-0 text-[10px] font-bold tracking-widest text-[#A99E77] tabular-nums sm:block">
            {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
          </span>
        )}
        <span className="shrink-0 text-[12.5px] font-black tabular-nums text-[#D4AF37]">{formatPrice(product.effectivePrice)}</span>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center border transition-all",
            !product.inStock
              ? "cursor-not-allowed border-[#3A3626] text-[#5C543A]"
              : added
                ? "dn-cta border-transparent"
                : "dn-ghost"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </li>
  );
}

/* exclusive card add button */
function ExclusiveAdd({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useDecoAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد خرید`}
      className={cn(
        "mt-5 flex h-11 items-center justify-center gap-2 border text-[11px] font-black tracking-[0.2em] transition-all",
        !product.inStock
          ? "cursor-not-allowed border-[#3A3626] text-[#5C543A]"
          : added
            ? "dn-cta border-transparent"
            : "dn-add"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "اتمام موجودی"}
    </button>
  );
}

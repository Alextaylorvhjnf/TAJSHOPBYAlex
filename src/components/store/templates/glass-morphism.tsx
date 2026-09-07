"use client";

/**
 * TEMPLATE · glass-morphism — «Neo-Glass» (v25 full rewrite)
 * ---------------------------------------------------------
 * Cinematic frosted-OS storefront: cool off-white #F5F5F7 canvas, matte-black
 * #0A0A0A "sidebar" accent panels and ONE high-saturation accent — cinematic
 * red #C41E3A. Signature = a floating rounded-[2rem] glass "window" hero with
 * a docked glass nav-chip dock inside; media-forward tiles (rounded-[1.75rem])
 * carry gradient scrim overlays; deals & bestsellers sit on matte-black bands.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles, Package, Check, ChevronLeft, Flame, TrendingUp, HelpCircle,
  ShoppingBasket, Star, Layers, Gem, Home, ShoppingBag, Percent, CircleDot,
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

/* ONE scoped style block — Neo-Glass tokens, glass surfaces, ambient motion */
const NEO_GLASS_CSS = `
[data-tpl="glass-morphism"]{--ng-red:#C41E3A;--ng-ink:#0A0A0A;--ng-glass:rgba(255,255,255,.6);--ng-brd:rgba(255,255,255,.7)}
[data-tpl="glass-morphism"] .ng-glass{background:var(--ng-glass);-webkit-backdrop-filter:blur(40px) saturate(160%);backdrop-filter:blur(40px) saturate(160%);border:1px solid var(--ng-brd);box-shadow:0 16px 48px -16px rgba(0,0,0,.08)}
[data-tpl="glass-morphism"] .ng-glass-soft{background:rgba(255,255,255,.45);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.55);box-shadow:0 10px 32px -12px rgba(0,0,0,.08)}
[data-tpl="glass-morphism"] .ng-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="glass-morphism"] .ng-rail::-webkit-scrollbar{display:none}
[data-tpl="glass-morphism"] .ng-scroll{scrollbar-width:thin;scrollbar-color:rgba(10,10,10,.22) transparent}
[data-tpl="glass-morphism"] .ng-scroll::-webkit-scrollbar{width:6px}
[data-tpl="glass-morphism"] .ng-scroll::-webkit-scrollbar-thumb{background:rgba(10,10,10,.18);border-radius:99px}
[data-tpl="glass-morphism"] .ng-scroll::-webkit-scrollbar-track{background:transparent}
[data-tpl="glass-morphism"] .ng-bob{animation:ng-bob 6s ease-in-out infinite}
[data-tpl="glass-morphism"] .ng-bob-2{animation:ng-bob 7.5s ease-in-out 1.2s infinite}
[data-tpl="glass-morphism"] .ng-breathe{animation:ng-breathe 8s ease-in-out infinite}
[data-tpl="glass-morphism"] .ng-blink{animation:ng-blink 2.2s ease-in-out infinite}
[data-tpl="glass-morphism"] .ng-drift{animation:ng-drift 18s ease-in-out infinite alternate}
@keyframes ng-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes ng-breathe{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
@keyframes ng-blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ng-drift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-24px,20px) scale(1.08)}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="glass-morphism"] .ng-bob,[data-tpl="glass-morphism"] .ng-bob-2,[data-tpl="glass-morphism"] .ng-breathe,[data-tpl="glass-morphism"] .ng-blink,[data-tpl="glass-morphism"] .ng-drift{animation:none!important}
}

/* ═══ v26fix · DARK SKIN — additive only, light rendering untouched ═══
   Palette: bg #0E1014 / ink #E8EAEE. Frosted glass turns to smoked
   glass (dark translucent + light hairline borders); the cinematic red
   #C41E3A, the matte-black cinema bands, image scrims and white-on-red
   chips keep their identity. The shadcn token map mirrors the canvas
   math (templateCanvasVars) so the shared StoriesRow composes on the
   dark canvas too. CSS escapes are doubled (JS template literal). */
html.dark [data-tpl="glass-morphism"]{
  --ng-red:#C41E3A;--ng-ink:#E8EAEE;--ng-glass:rgba(20,22,27,.55);--ng-brd:rgba(232,234,238,.12);
  --background:#0E1014;--foreground:#E8EAEE;--card:#232428;--card-foreground:#E8EAEE;
  --popover:#2A2C2F;--popover-foreground:#E8EAEE;--secondary:#26282C;--secondary-foreground:#E8EAEE;
  --muted:#1F2124;--muted-foreground:#95979B;--accent:#2F3034;--accent-foreground:#E8EAEE;
  --border:rgba(232,234,238,.16);--input:rgba(232,234,238,.22);--ring:#86888C;
  background:#0E1014;color:#E8EAEE;
}

/* raw utility overrides — ink flips, red accent + dark bands kept */
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#F5F5F7\\]{background-color:#0E1014}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]{color:#E8EAEE}
html.dark [data-tpl="glass-morphism"] .hover\\:text-\\[\\#0A0A0A\\]:hover{color:#E8EAEE}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/75{color:rgba(232,234,238,.75)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/70{color:rgba(232,234,238,.7)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/60{color:rgba(232,234,238,.6)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/55{color:rgba(232,234,238,.55)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/50{color:rgba(232,234,238,.5)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/45{color:rgba(232,234,238,.45)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/40{color:rgba(232,234,238,.4)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/35{color:rgba(232,234,238,.35)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/30{color:rgba(232,234,238,.3)}
html.dark [data-tpl="glass-morphism"] .text-\\[\\#0A0A0A\\]\\/25{color:rgba(232,234,238,.25)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/\\[0\\.06\\]{background-color:rgba(232,234,238,.07)}
html.dark [data-tpl="glass-morphism"] .hover\\:bg-\\[\\#0A0A0A\\]\\/\\[0\\.06\\]:hover{background-color:rgba(232,234,238,.07)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/\\[0\\.05\\]{background-color:rgba(232,234,238,.06)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/\\[0\\.04\\]{background-color:rgba(232,234,238,.05)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/\\[0\\.03\\]{background-color:rgba(232,234,238,.04)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/15{background-color:rgba(232,234,238,.15)}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\]\\/10{background-color:rgba(232,234,238,.1)}
/* white-alpha panels on the page canvas → light-ink tints (the white
   circles on photos and the dark-band white/5 cards are untouched) */
html.dark [data-tpl="glass-morphism"] .bg-white\\/80{background-color:rgba(232,234,238,.09)}
html.dark [data-tpl="glass-morphism"] .bg-white\\/60{background-color:rgba(232,234,238,.08)}
html.dark [data-tpl="glass-morphism"] .bg-white\\/45{background-color:rgba(232,234,238,.06)}
/* matte-black chips/buttons on the page → inverted to light ink;
   the pure black cinema bands/ledger (no .text-white) stay black */
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#0A0A0A\\].text-white{background-color:#E8EAEE;color:#0A0A0A}
html.dark [data-tpl="glass-morphism"] .bg-\\[\\#C41E3A\\].hover\\:bg-\\[\\#0A0A0A\\]:hover{background-color:#E8EAEE;color:#0A0A0A}

/* helper classes — smoked glass variants */
html.dark [data-tpl="glass-morphism"] .ng-glass{box-shadow:0 16px 48px -16px rgba(0,0,0,.45)}
html.dark [data-tpl="glass-morphism"] .ng-glass-soft{
  background:rgba(18,20,24,.5);
  border-color:rgba(232,234,238,.1);
  box-shadow:0 10px 32px -12px rgba(0,0,0,.4);
}
html.dark [data-tpl="glass-morphism"] .ng-scroll{scrollbar-color:rgba(232,234,238,.25) transparent}
html.dark [data-tpl="glass-morphism"] .ng-scroll::-webkit-scrollbar-thumb{background:rgba(232,234,238,.22)}
`;

/* ── section header — black sidebar chip + red rule ──────────────── */
function NeoHeader({
  icon: Icon, title, subtitle, href, dark = false,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; dark?: boolean }) {
  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-[1.25rem]",
            dark ? "bg-[#C41E3A] text-white" : "bg-[#0A0A0A] text-white"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className={cn("truncate text-lg font-black tracking-tight md:text-xl", dark ? "text-white" : "text-[#0A0A0A]")}>
            {title}
          </h2>
          {subtitle && <p className={cn("mt-0.5 truncate text-xs", dark ? "text-white/50" : "text-[#0A0A0A]/50")}>{subtitle}</p>}
        </div>
        <span className="hidden h-8 w-px bg-[#C41E3A]/25 md:block" aria-hidden />
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-[1.25rem] px-4 text-xs font-black transition-all hover:-translate-y-0.5",
            dark ? "bg-white/10 text-white hover:bg-[#C41E3A]" : "ng-glass text-[#0A0A0A] hover:text-[#C41E3A]"
          )}
        >
          همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── add-to-cart — same POST /api/cart/items flow + cart-updated event ── */
function useNeoAdd() {
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

/* ── frosted media-forward product tile ──────────────────────────── */
function NeoTile({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNeoAdd();
  return (
    <article className={cn("ng-glass group flex h-full flex-col rounded-[1.75rem] transition-transform duration-300 hover:-translate-y-1", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-t-[1.75rem] bg-[#0A0A0A]/[0.03]">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#0A0A0A]/30">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute start-3 top-3 rounded-full bg-[#C41E3A] px-3 py-1 text-[10px] font-black text-white tabular-nums shadow-lg shadow-[#C41E3A]/30">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-[#0A0A0A]/80 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 truncate text-[10.5px] font-medium text-[#0A0A0A]/45">
          <Sparkles className="h-3 w-3 shrink-0 text-[#C41E3A]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 transition-colors hover:text-[#C41E3A]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[#0A0A0A]/45 tabular-nums">
            <Star className="h-3 w-3 fill-[#C41E3A] text-[#C41E3A]" aria-hidden />
            {toFaDigits(product.rating.toLocaleString("fa-IR"))} · {toFaDigits(product.reviewCount.toLocaleString("fa-IR"))} نظر
          </p>
        )}
        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <p className="min-w-0">
              {product.discountPercent > 0 && (
                <span className="block text-[11px] leading-4 text-[#0A0A0A]/35 line-through tabular-nums">{formatPrice(product.price)}</span>
              )}
              <span className="text-[14px] font-black tabular-nums text-[#0A0A0A]">
                {formatPrice(product.effectivePrice)}
                <span className="text-[10px] font-normal text-[#0A0A0A]/45"> تومان</span>
              </span>
            </p>
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={!product.inStock}
              aria-label={`افزودن ${product.name} به سبد`}
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-[1.25rem] transition-all active:scale-95",
                !product.inStock
                  ? "cursor-not-allowed bg-[#0A0A0A]/10 text-[#0A0A0A]/30"
                  : added
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-[#C41E3A] text-white shadow-lg shadow-[#C41E3A]/30 hover:bg-[#0A0A0A]"
              )}
            >
              {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBasket className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── dark-band deal tile (matte black accent cards) ──────────────── */
function NeoDarkTile({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNeoAdd();
  return (
    <article className={cn("group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#C41E3A]/50", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1.5rem] bg-black/40">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-white/25"><Package className="h-10 w-10" aria-hidden /></span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden />
        {product.discountPercent > 0 && (
          <span className="absolute start-3 top-3 rounded-full bg-[#C41E3A] px-3 py-1 text-[10px] font-black text-white tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪−
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <p className="truncate text-[10px] font-medium text-white/40">{product.brand.name}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-white line-clamp-2 transition-colors hover:text-[#ff8a9d]">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[10.5px] leading-4 text-white/30 line-through tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className="text-[13.5px] font-black text-white tabular-nums">
              {formatPrice(product.effectivePrice)}
              <span className="text-[9.5px] font-normal text-white/40"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] transition-all active:scale-95",
              !product.inStock ? "cursor-not-allowed bg-white/10 text-white/30" : added ? "bg-white text-[#0A0A0A]" : "bg-[#C41E3A] text-white hover:bg-[#ff5d75]"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBasket className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ item (glass accordion, red dot) ─────────────────────────── */
function NeoFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white/45">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#C41E3A]" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#0A0A0A]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#0A0A0A]/40 transition-transform duration-300", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#0A0A0A]/55">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function GlassMorphismTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);
  const floatProduct = data.discounted[0] ?? data.featured[0] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const chrome = TEMPLATE_CHROME["glass-morphism"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } };

  return (
    <div data-template-chrome="1" data-tpl="glass-morphism" className="isolate w-full bg-[#F5F5F7] text-[#0A0A0A]">
      <style>{NEO_GLASS_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px]">
        {/* ambient field — soft light orbs breathing behind the glass */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
          <span className="ng-breathe absolute -top-24 start-[6%] h-80 w-80 rounded-full bg-[#C41E3A]/[0.07] blur-3xl" />
          <span className="ng-drift absolute top-48 end-[4%] h-72 w-72 rounded-full bg-[#0A0A0A]/[0.05] blur-3xl" />
          <span className="absolute bottom-0 left-1/2 h-56 w-[38rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
        </div>

        {/* ═══ HERO — floating glass "window" with docked nav dock ═══ */}
        <motion.section
          {...rise}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
          className="relative px-3 pb-16 pt-4 sm:px-4"
          aria-labelledby="ng-hero"
        >
          <div className="ng-glass rounded-[2rem] p-2 sm:p-2.5">
            {/* window title bar */}
            <div className="flex h-12 items-center gap-3 px-4 sm:px-5">
              <span className="flex items-center gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#C41E3A]" />
                <span className="h-3 w-3 rounded-full bg-[#0A0A0A]/15" />
                <span className="h-3 w-3 rounded-full bg-[#0A0A0A]/15" />
              </span>
              <span dir="ltr" className="hidden truncate text-[10px] font-bold uppercase tracking-[0.32em] text-[#0A0A0A]/40 sm:block">
                {store.storeNameEn || "TAJ ELECTRONICS"}
              </span>
              <span className="ms-auto flex items-center gap-1.5 rounded-full bg-[#C41E3A]/10 px-3 py-1 text-[9.5px] font-black text-[#C41E3A]">
                <span className="ng-blink h-1.5 w-1.5 rounded-full bg-[#C41E3A]" aria-hidden />
                فروشگاه فعال
              </span>
            </div>

            {/* window body */}
            <div className="grid grid-cols-1 items-center gap-8 p-4 sm:p-6 lg:grid-cols-12 lg:gap-10">
              {/* copy */}
              <div className="lg:col-span-7">
                <span className="ng-glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black text-[#C41E3A]">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  تجربه خرید نئو-گلس
                </span>
                <h1 id="ng-hero" className="mt-5 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl md:text-[3.4rem]">
                  {store.storeName}
                </h1>
                <p dir="ltr" className="mt-2 text-[11px] font-bold uppercase tracking-[0.4em] text-[#0A0A0A]/35">
                  {store.storeNameEn}
                </p>
                <p className="mt-5 max-w-lg text-[13.5px] leading-8 text-[#0A0A0A]/60">
                  {store.announcementActive && store.announcement
                    ? store.announcement
                    : "پنل‌های شیشه‌ای شناور، نور سینمایی و یک لمس قرمز — ویترینی که تکنولوژی را مثل فیلم نشان می‌دهد."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/products"
                    className="flex h-12 items-center gap-2 rounded-[1.25rem] bg-[#C41E3A] px-7 text-sm font-black text-white shadow-xl shadow-[#C41E3A]/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#C41E3A]/35 active:scale-[0.98]"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden />
                    شروع خرید
                  </Link>
                  <Link href="/products?discount=1" className="ng-glass flex h-12 items-center gap-2 rounded-[1.25rem] px-7 text-sm font-black text-[#0A0A0A] transition-all hover:-translate-y-0.5 hover:text-[#C41E3A]">
                    <Flame className="h-4 w-4 text-[#C41E3A]" aria-hidden />
                    تخفیف‌های داغ
                  </Link>
                </div>
                {/* real mini stats */}
                <dl className="mt-8 flex flex-wrap gap-2.5">
                  {[
                    { k: "محصول", v: counts.products },
                    { k: "دسته‌بندی", v: counts.categories },
                    { k: "برند", v: counts.brands },
                  ].map((s) => (
                    <div key={s.k} className="ng-glass-soft flex items-baseline gap-1.5 rounded-full px-4 py-2">
                      <dt className="text-[10.5px] font-medium text-[#0A0A0A]/45">{s.k}</dt>
                      <dd className="text-[13px] font-black tabular-nums text-[#C41E3A]">{toFaDigits(s.v.toLocaleString("fa-IR"))}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* media tile with scrim */}
              <div className="relative lg:col-span-5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-[#0A0A0A]/[0.04]">
                  {heroSlide ? (
                    <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="group absolute inset-0">
                      <SlideArt slide={heroSlide} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 92vw, 40vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/65 via-[#0A0A0A]/10 to-transparent" aria-hidden />
                      <span className="ng-glass absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-[#0A0A0A]">{heroSlide.title}</span>
                          {heroSlide.subtitle && <span className="mt-0.5 block truncate text-[10.5px] text-[#0A0A0A]/50">{heroSlide.subtitle}</span>}
                        </span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[1rem] bg-[#C41E3A] text-white">
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="grid h-full place-items-center text-[#0A0A0A]/25">
                      <Package className="h-16 w-16" aria-hidden />
                    </div>
                  )}
                </div>
                {/* hero product price chip */}
                {heroSlide?.product && (
                  <Link
                    href={`/products/${heroSlide.product.slug}`}
                    className="ng-glass ng-bob-2 absolute -top-4 end-4 hidden items-center gap-2 rounded-full px-4 py-2.5 sm:flex"
                    aria-label={`${heroSlide.product.name} — ${formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)} تومان`}
                  >
                    <CircleDot className="h-3.5 w-3.5 text-[#C41E3A]" aria-hidden />
                    <span className="text-[11.5px] font-black tabular-nums text-[#0A0A0A]">{formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)} تومان</span>
                  </Link>
                )}
              </div>
            </div>

            {/* docked glass nav dock (signature) */}
            <div className="px-1 pb-1 sm:px-1.5 sm:pb-1.5">
              <nav aria-label="دسترسی سریع" className="ng-glass ng-rail flex items-center gap-1.5 overflow-x-auto rounded-[1.5rem] p-1.5">
                <Link href="/" className="flex h-10 shrink-0 items-center gap-1.5 rounded-[1.1rem] bg-[#C41E3A] px-4 text-[11.5px] font-black text-white">
                  <Home className="h-3.5 w-3.5" aria-hidden /> خانه
                </Link>
                <Link href="/products" className="flex h-10 shrink-0 items-center gap-1.5 rounded-[1.1rem] px-4 text-[11.5px] font-bold text-[#0A0A0A]/70 transition-colors hover:bg-[#0A0A0A]/[0.06] hover:text-[#0A0A0A]">
                  <Layers className="h-3.5 w-3.5" aria-hidden /> محصولات
                </Link>
                <Link href="/products?discount=1" className="flex h-10 shrink-0 items-center gap-1.5 rounded-[1.1rem] px-4 text-[11.5px] font-bold text-[#0A0A0A]/70 transition-colors hover:bg-[#0A0A0A]/[0.06] hover:text-[#0A0A0A]">
                  <Percent className="h-3.5 w-3.5" aria-hidden /> تخفیف‌دار
                </Link>
                {data.categories.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="flex h-10 shrink-0 items-center gap-1.5 rounded-[1.1rem] px-4 text-[11.5px] font-bold text-[#0A0A0A]/70 transition-colors hover:bg-[#0A0A0A]/[0.06] hover:text-[#0A0A0A]">
                    {c.name}
                    <span className="rounded-full bg-[#C41E3A]/10 px-1.5 py-px text-[9px] font-black text-[#C41E3A] tabular-nums">
                      {toFaDigits(c.productCount.toLocaleString("fa-IR"))}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* floating mini deal card — breaks the window bounds */}
          {floatProduct && floatProduct.mainImage && (
            <motion.div {...rise} transition={{ delay: 0.15, type: "spring", stiffness: 60, damping: 16 }}>
              <Link
                href={`/products/${floatProduct.slug}`}
                aria-label={floatProduct.name}
                className="ng-glass ng-bob absolute -bottom-7 start-2 hidden w-64 items-center gap-3 rounded-[1.5rem] p-3 sm:flex"
              >
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] bg-white/60">
                  <Image src={floatProduct.mainImage} alt={floatProduct.name} fill sizes="56px" className="object-contain p-1" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-black text-[#0A0A0A]">{floatProduct.name}</span>
                  <span className="text-[11px] font-black text-[#C41E3A] tabular-nums">{formatPrice(floatProduct.effectivePrice)} تومان</span>
                </span>
                {floatProduct.discountPercent > 0 && (
                  <span className="ms-auto shrink-0 rounded-full bg-[#C41E3A] px-2 py-1 text-[9px] font-black text-white tabular-nums">
                    {floatProduct.discountPercent.toLocaleString("fa-IR")}٪
                  </span>
                )}
              </Link>
            </motion.div>
          )}
        </motion.section>

        {/* ═══ extra slides — mini window tiles ═══ */}
        {extraSlides.length > 0 && (
          <section className="px-3 pb-6 sm:px-4" aria-label="اسلایدهای ویژه">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {extraSlides.map((s) => (
                <Link key={s.id} href={s.ctaUrl ?? "/products"} className="group relative block aspect-[16/8] overflow-hidden rounded-[1.75rem]">
                  <SlideArt slide={s} alt={s.title} fill sizes="(max-width: 640px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent" aria-hidden />
                  <span className="ng-glass absolute bottom-3 start-3 end-3 flex items-center justify-between gap-2 rounded-[1.25rem] px-4 py-2.5">
                    <span className="min-w-0 truncate text-[12px] font-black text-[#0A0A0A]">{s.title}</span>
                    {s.product && (
                      <span className="shrink-0 rounded-full bg-[#C41E3A]/10 px-2.5 py-1 text-[10px] font-black text-[#C41E3A] tabular-nums">
                        {formatPrice(s.product.discountPrice ?? s.product.price)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <NeoHeader icon={Sparkles} title="استوری‌های زنده" subtitle="برای دیدن، لمس کنید" />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES — media tiles with scrim ═══ */}
        {data.categories.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <NeoHeader icon={Layers} title="دوربین روی دسته‌ها" subtitle="مسیرهای اصلی فروشگاه" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <span className="ng-glass grid h-full place-items-center text-[#0A0A0A]/35">
                        <Layers className="h-10 w-10" aria-hidden />
                      </span>
                    )}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 via-[#0A0A0A]/15 to-transparent" aria-hidden />
                    <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-black text-white drop-shadow">{c.name}</span>
                        <span className="text-[10px] font-medium text-white/70 tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} محصول</span>
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/90 text-[#0A0A0A] transition-colors group-hover:bg-[#C41E3A] group-hover:text-white">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — frosted grid ═══ */}
        {data.featured.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-featured">
            <Reveal>
              <NeoHeader icon={Star} title="ویترین اصلی" subtitle="برجسته‌ترین‌ها پشت شیشه" href="/products?sort=rating" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <NeoTile key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — matte black cinema band ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-deals">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] p-5 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -top-24 start-[15%] h-64 w-64 rounded-full bg-[#C41E3A]/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 end-[10%] h-52 w-52 rounded-full bg-white/[0.06] blur-3xl" />
                <NeoHeader dark icon={Flame} title="سینمای تخفیف‌ها" subtitle="قرمز، داغ و محدود" href="/products?discount=1" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.discounted.slice(0, 8).map((p) => (
                    <NeoDarkTile key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — media glass panels ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-label="ویترین‌های فروشگاه">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <Link key={s.id} href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")} className="group relative block overflow-hidden rounded-[2rem]">
                    <span className="relative block aspect-[16/9] bg-[#0A0A0A]/[0.04]">
                      <Image src={s.image} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    </span>
                    <span className="ng-glass absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-[1.5rem] p-5">
                      <span className="min-w-0">
                        <span className="block truncate text-[16px] font-black text-[#0A0A0A]">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block line-clamp-1 text-[11.5px] text-[#0A0A0A]/50">{s.subtitle}</span>}
                      </span>
                      {s.product && (
                        <span className="shrink-0 rounded-full bg-[#C41E3A] px-3.5 py-2 text-[11px] font-black text-white tabular-nums">
                          {formatPrice(s.product.discountPrice ?? s.product.price)}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — tall cinema posters ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-exclusive">
            <Reveal>
              <NeoHeader icon={Gem} title="انتشارات انحصاری" subtitle="فقط اینجا پیدا می‌شوند" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {data.exclusive.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group relative block overflow-hidden rounded-[1.75rem]">
                    <span className="relative block aspect-[4/5] bg-[#0A0A0A]/[0.04]">
                      {p.mainImage ? (
                        <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 46vw, 31vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="ng-glass grid h-full place-items-center text-[#0A0A0A]/30"><Gem className="h-12 w-12" aria-hidden /></span>
                      )}
                    </span>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/75 via-[#0A0A0A]/10 to-transparent" aria-hidden />
                    <span className="absolute start-0 top-5 rounded-e-full bg-[#C41E3A] py-1.5 pe-4 ps-4 text-[9.5px] font-black text-white">انحصاری تاج</span>
                    <span className="absolute inset-x-4 bottom-4">
                      <span className="block truncate text-[14px] font-black text-white drop-shadow">{p.name}</span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-black tabular-nums text-white">{formatPrice(p.effectivePrice)} تومان</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#0A0A0A] transition-colors group-hover:bg-[#C41E3A] group-hover:text-white">
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST ═══ */}
        {data.newest.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-newest">
            <Reveal>
              <NeoHeader icon={Sparkles} title="تازه رسیده‌ها" subtitle="آخرین ورودی‌های ویترین" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <NeoTile key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — matte ledger ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-best">
            <Reveal>
              <NeoHeader icon={TrendingUp} title="صدرنشین‌ها" subtitle="پرفروش‌های واقعی این ماه" href="/products?sort=bestselling" />
              <div className="ng-scroll max-h-96 overflow-y-auto rounded-[2rem] bg-[#0A0A0A] p-3 sm:p-4">
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.slug}`} className="group flex min-w-0 items-center gap-3 rounded-[1.5rem] bg-white/[0.05] p-3 transition-all hover:bg-white/[0.09]">
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] text-[13px] font-black tabular-nums", i < 3 ? "bg-[#C41E3A] text-white" : "bg-white/10 text-white/60")}>
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        {p.mainImage && (
                          <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-black/30">
                            <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-1" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold text-white">{p.name}</span>
                          <span className="text-[11px] font-black text-white/40 tabular-nums">
                            {formatPrice(p.effectivePrice)} تومان · {toFaDigits(p.soldCount.toLocaleString("fa-IR"))} فروش
                          </span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-white/25 transition-all group-hover:-translate-x-0.5 group-hover:text-[#C41E3A]" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {data.faq.length > 0 && (
          <section className="px-3 py-10 sm:px-4" aria-labelledby="ng-faq">
            <Reveal>
              <NeoHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="پاسخ‌ها پشت همین شیشه" />
              <div className="ng-glass space-y-3 rounded-[2rem] p-4">
                {data.faq.map((f, i) => (
                  <NeoFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-2 px-3 pb-16 sm:px-4" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-5 text-center text-[11px] font-black tracking-[0.25em] text-[#0A0A0A]/40">برندهای روی جلد</p>
              <ul className="ng-rail flex flex-wrap justify-center gap-2.5">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link href={`/products?brand=${b.slug}`} className="ng-glass flex h-11 items-center rounded-[1.25rem] px-5 text-[12.5px] font-bold text-[#0A0A0A]/75 transition-all hover:-translate-y-0.5 hover:text-[#C41E3A]">
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        )}

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="px-3 pb-24 sm:px-4">
            <div className="ng-glass rounded-[2rem] p-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-[#C41E3A]/40" aria-hidden />
              <h2 className="text-lg font-black">پنجره ویترین هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#0A0A0A]/55">به‌زودی اولین محصولات روی شیشه می‌نشینند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

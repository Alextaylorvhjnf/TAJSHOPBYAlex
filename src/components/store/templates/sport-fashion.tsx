"use client";

/**
 * TEMPLATE · sport-fashion — «NovaTrend Sport Editorial» (v35 vertical)
 * ------------------------------------------------------------------------
 * WARM editorial sport storefront for the «اسپرت و پوشاک» vertical:
 * cream #FBF7F2 canvas, deep warm ink #201A14 and ONE energetic
 * coral→ember gradient (#FF6B4A→#E2542A). Signature = an organic morphing
 * coral blob carrying the hero product, a full-bleed coral marquee ticker,
 * best-sellers as a two-column editorial NUMBERED list (۰۱/۰۲/۰۳ gold
 * #B45309 numerals), dual rounded-[2.5rem] promo banners, product cards
 * with selectable size chips (S/M/L/XL) + wishlist hearts, a seasonal-sale
 * rail with red #DC2626 badges and a lookbook strip of tall story cards.
 * Deliberately NOTHING like the electronics stores — soft, curved, editorial.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShoppingCart, Heart, Check, ChevronLeft, Star, TrendingUp, Sparkles, Flame,
  Package, Layers, HelpCircle, BadgeCheck, Camera, Play,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart, useWishlist } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* selectable apparel sizes on the product cards */
const SIZES = ["S", "M", "L", "XL"] as const;

/* ONE scoped style block — warm editorial tokens, organic blob, marquee */
const SPORT_FASHION_CSS = `
[data-tpl="sport-fashion"]{--sf-coral:#FF6B4A;--sf-ember:#E2542A;--sf-ink:#201A14;--sf-cream:#FBF7F2;--sf-gold:#B45309;--sf-sale:#DC2626}
[data-tpl="sport-fashion"] .sf-cta{background:linear-gradient(135deg,#FF6B4A 0%,#E2542A 100%);color:#FFFFFF;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease,width .25s ease}
[data-tpl="sport-fashion"] .sf-cta:hover{filter:brightness(1.07)}
[data-tpl="sport-fashion"] .sf-ink-btn{background:#201A14;color:#FFFFFF;transition:background-color .2s ease,color .2s ease,transform .2s ease}
[data-tpl="sport-fashion"] .sf-ink-btn:hover{background:#3A322A}
[data-tpl="sport-fashion"] .sf-blob{background:linear-gradient(135deg,#FF6B4A 0%,#E2542A 100%);border-radius:38% 62% 56% 44%/46% 40% 60% 54%;animation:sf-morph 12s ease-in-out infinite}
[data-tpl="sport-fashion"] .sf-bob{animation:sf-bob 6s ease-in-out infinite}
[data-tpl="sport-fashion"] .sf-bob-2{animation:sf-bob 7.5s ease-in-out 1.3s infinite}
[data-tpl="sport-fashion"] .sf-render{filter:drop-shadow(0 34px 44px rgba(226,84,42,.36)) drop-shadow(0 12px 16px rgba(32,26,20,.15))}
[data-tpl="sport-fashion"] .sf-marquee{background:linear-gradient(90deg,#FF6B4A 0%,#E2542A 100%)}
[data-tpl="sport-fashion"] .sf-marquee-track{display:flex;width:max-content;animation:sf-marquee 26s linear infinite}
[data-tpl="sport-fashion"] .sf-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="sport-fashion"] .sf-rail::-webkit-scrollbar{display:none}
[data-tpl="sport-fashion"] .sf-scroll{scrollbar-width:thin;scrollbar-color:rgba(110,97,83,.3) transparent}
[data-tpl="sport-fashion"] .sf-scroll::-webkit-scrollbar{width:6px}
[data-tpl="sport-fashion"] .sf-scroll::-webkit-scrollbar-thumb{background:rgba(110,97,83,.25);border-radius:99px}
[data-tpl="sport-fashion"] .sf-scroll::-webkit-scrollbar-track{background:transparent}
@keyframes sf-morph{
  0%,100%{border-radius:38% 62% 56% 44%/46% 40% 60% 54%}
  33%{border-radius:60% 40% 42% 58%/52% 58% 42% 48%}
  66%{border-radius:44% 56% 62% 38%/40% 46% 54% 60%}
}
@keyframes sf-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes sf-marquee{from{transform:translateX(0)}to{transform:translateX(50%)}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="sport-fashion"] .sf-blob,[data-tpl="sport-fashion"] .sf-bob,[data-tpl="sport-fashion"] .sf-bob-2,[data-tpl="sport-fashion"] .sf-marquee-track{animation:none!important}
}

/* ═══ DARK-MODE SKIN (warm editorial above untouched) ═══
   Cream canvas → #14161C, cards → #1E1F25, warm ink → #EDEEF1 —
   the coral→ember accent, gold ranks and red sale badges keep their hue. */
html.dark [data-tpl="sport-fashion"]{
  --background:#14161C;
  --foreground:#EDEEF1;
  --card:#1E1F25;
  --card-foreground:#EDEEF1;
  --popover:#26272D;
  --popover-foreground:#EDEEF1;
  --secondary:#23242B;
  --secondary-foreground:#EDEEF1;
  --muted:#1C1D23;
  --muted-foreground:#A6A9B0;
  --accent:#2A2B32;
  --accent-foreground:#EDEEF1;
  --border:rgba(237,238,241,0.16);
  --input:rgba(237,238,241,0.22);
  --ring:#8C8D8F;
  background-color:#14161C;
  color:#EDEEF1;
}
/* warm ink ramp — deep ink → light ink, warm grays lifted */
html.dark [data-tpl="sport-fashion"] .text-\\[\\#201A14\\]{color:#EDEEF1}
html.dark [data-tpl="sport-fashion"] .text-\\[\\#6E6153\\]{color:#B0A79B}
html.dark [data-tpl="sport-fashion"] .text-\\[\\#A0907E\\]{color:#8D8478}
html.dark [data-tpl="sport-fashion"] .text-\\[\\#D8CBBB\\]{color:#6E675F}
/* coral re-declared AFTER the ink ramp so every accent keeps beating it */
html.dark [data-tpl="sport-fashion"] .text-\\[\\#FF6B4A\\]{color:#FF6B4A}
/* white cards → charcoal; cream wells step up in elevation */
html.dark [data-tpl="sport-fashion"] .bg-white{background-color:#1E1F25}
html.dark [data-tpl="sport-fashion"] .bg-white\\/90{background-color:rgba(30,31,37,0.92)}
html.dark [data-tpl="sport-fashion"] .bg-white\\/95{background-color:rgba(30,31,37,0.95)}
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#FBF7F2\\]{background-color:#14161C}
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#F5EEE5\\]{background-color:#1B1C23}
/* warm hairlines */
html.dark [data-tpl="sport-fashion"] .border-\\[\\#E9DFD3\\],
html.dark [data-tpl="sport-fashion"] .sm\\:border-\\[\\#E9DFD3\\]{border-color:rgba(237,238,241,0.14)}
html.dark [data-tpl="sport-fashion"] .border-\\[\\#E9DFD3\\]\\/80{border-color:rgba(237,238,241,0.11)}
html.dark [data-tpl="sport-fashion"] .border-\\[\\#E9DFD3\\]\\/60{border-color:rgba(237,238,241,0.09)}
html.dark [data-tpl="sport-fashion"] .divide-\\[\\#EEE6DA\\] > :not(:last-child),
html.dark [data-tpl="sport-fashion"] .divide-\\[\\#EEE6DA\\] > :not([hidden]) ~ :not([hidden]){border-color:rgba(237,238,241,0.09)}
/* accent tints gain alpha so they read on charcoal */
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#FF6B4A\\]\\/10{background-color:rgba(255,107,74,0.16)}
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#E9DFD3\\]\\/80{background-color:rgba(237,238,241,0.1)}
/* hover/group-hover states that must keep beating the overrides above */
html.dark [data-tpl="sport-fashion"] .hover\\:text-\\[\\#FF6B4A\\]:hover{color:#FF6B4A}
html.dark [data-tpl="sport-fashion"] .hover\\:bg-\\[\\#FF6B4A\\]:hover{background-color:#FF6B4A}
html.dark [data-tpl="sport-fashion"] .hover\\:border-\\[\\#FF6B4A\\]\\/50:hover{border-color:rgba(255,107,74,0.5)}
html.dark [data-tpl="sport-fashion"] .hover\\:border-\\[\\#FF6B4A\\]\\/40:hover{border-color:rgba(255,107,74,0.4)}
html.dark [data-tpl="sport-fashion"] .group-hover\\:bg-\\[\\#FF6B4A\\]:is(:where(.group):hover *){background-color:#FF6B4A}
html.dark [data-tpl="sport-fashion"] .group-hover\\:text-white:is(:where(.group):hover *){color:#FFFFFF}
/* the ink promo banner / footer CTA lifts one step so it still reads */
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#201A14\\]{background-color:#24252B}
/* ink button inverts (ink is light now) */
html.dark [data-tpl="sport-fashion"] .sf-ink-btn{background:#EDEEF1;color:#14161C}
html.dark [data-tpl="sport-fashion"] .sf-ink-btn:hover{background:#FFFFFF}
html.dark [data-tpl="sport-fashion"] .sf-scroll{scrollbar-color:rgba(237,238,241,0.22) transparent}
html.dark [data-tpl="sport-fashion"] .sf-scroll::-webkit-scrollbar-thumb{background:rgba(237,238,241,0.18)}
/* restore: white CTA pills inside the coral/ink promo banners keep their
   white surface + warm-ink label, exactly like light mode */
html.dark [data-tpl="sport-fashion"] .sf-cta .bg-white,
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#201A14\\] .bg-white{background-color:#FFFFFF}
html.dark [data-tpl="sport-fashion"] .sf-cta .text-\\[\\#201A14\\],
html.dark [data-tpl="sport-fashion"] .bg-\\[\\#201A14\\] .text-\\[\\#201A14\\]{color:#201A14}
`;

/* ── section header — editorial eyebrow + display title ──────────── */
function SportHeader({
  icon: Icon, title, subtitle, href, dark = false,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; dark?: boolean }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.22em] text-[#FF6B4A]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {subtitle ?? "اسپرت و پوشاک"}
        </p>
        <h2 className={cn("truncate text-2xl font-black tracking-tight md:text-[1.75rem]", dark ? "text-white" : "text-[#201A14]")}>{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-xs font-black transition-all hover:-translate-y-0.5",
            dark ? "bg-white/10 text-white hover:bg-[#FF6B4A]" : "border border-[#E9DFD3]/80 bg-white text-[#201A14] hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
          )}
        >
          همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useSportAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = async (product: TemplateProduct, size?: string | null) => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1, variant: size ?? null });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1400);
    } catch {
      /* toast handled by useCart */
    }
  };
  return { addToCart, added };
}

/* ── THE product card — curved editorial card, size chips, wishlist ─ */
function SportCard({ product, showSizes = true }: { product: TemplateProduct; showSizes?: boolean }) {
  const { addToCart, added } = useSportAdd();
  const { wishlist, toggle } = useWishlist();
  /* optimistic local override over the server-side wishlist state */
  const alreadyWished = wishlist?.some((w) => w.id === product.id) ?? false;
  const [wishOverride, setWishOverride] = useState<boolean | null>(null);
  const wished = wishOverride ?? alreadyWished;
  const [size, setSize] = useState<string | null>(null);

  const toggleWish = () => {
    const next = !wished;
    setWishOverride(next);
    toggle.mutate(product.id, { onError: () => setWishOverride(!next) });
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-[1.75rem] border border-[#E9DFD3]/80 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6B4A]/40 hover:shadow-[0_22px_50px_-22px_rgba(255,107,74,.45)]",
        !product.inStock && "grayscale-[0.35]"
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-[#F5EEE5]">
        <Link href={`/products/${product.slug}`} aria-label={product.name} className="absolute inset-0">
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
            <span className="grid h-full place-items-center text-[#D8CBBB]"><Package className="h-10 w-10" aria-hidden /></span>
          )}
        </Link>
        {product.discountPercent > 0 && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-[#DC2626] px-2.5 py-1 text-[10px] font-black text-white tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[#201A14]/85 py-1.5 text-center text-[10px] font-bold text-white">ناموجود</span>
        )}
        {/* wishlist heart — floats opposite the sale badge */}
        <button
          type="button"
          onClick={toggleWish}
          aria-label={wished ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          aria-pressed={wished}
          className="absolute end-2.5 top-2.5 z-[1] grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-all hover:scale-110 active:scale-95"
        >
          <Heart className={cn("h-4 w-4 transition-colors", wished ? "fill-[#FF6B4A] text-[#FF6B4A]" : "text-[#A0907E]")} aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-[#A0907E]">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#FF6B4A]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[#201A14] transition-colors hover:text-[#FF6B4A]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#A0907E] tabular-nums">
            <Star className="h-3 w-3 fill-[#B45309] text-[#B45309]" aria-hidden />
            <b className="font-black text-[#6E6153]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
            <span>({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))})</span>
          </p>
        )}

        {/* selectable size chips — S / M / L / XL */}
        {showSizes && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label={`انتخاب سایز ${product.name}`}>
            <span className="text-[10px] font-bold text-[#A0907E]">سایز:</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize((cur) => (cur === s ? null : s))}
                aria-pressed={size === s}
                className={cn(
                  "h-7 min-w-7 rounded-full border px-2 text-[10.5px] font-black transition-all active:scale-95",
                  size === s
                    ? "sf-cta border-transparent"
                    : "border-[#E9DFD3]/80 bg-white text-[#6E6153] hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[10.5px] leading-4 text-[#A0907E] line-through tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className="text-[14.5px] font-black tabular-nums text-[#201A14]">
              {formatPrice(product.effectivePrice)}
              <span className="text-[10px] font-normal text-[#A0907E]"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product, size)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-4 text-[11px] font-black text-white transition-all active:scale-95",
              !product.inStock
                ? "cursor-not-allowed bg-[#E9DFD3]/80 text-[#A0907E]"
                : "sf-cta shadow-[0_10px_24px_-10px_rgba(255,107,74,.55)]"
            )}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">افزوده شد ✓</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">افزودن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── bestseller LIST row — big gold ۰۱/۰۲ numerals + quick-add ────── */
function BestsellerRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useSportAdd();
  return (
    <li className="group flex items-center gap-3 py-3.5 first:pt-1 last:pb-1 sm:gap-4">
      <span className="w-14 shrink-0 text-center text-3xl font-black leading-none tabular-nums text-[#B45309] opacity-95" aria-hidden>
        {toFaDigits(String(rank).padStart(2, "0"))}
      </span>
      <Link href={`/products/${product.slug}`} className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[1.25rem] bg-[#F5EEE5]" aria-hidden>
        {product.mainImage ? (
          <Image src={product.mainImage} alt="" fill sizes="56px" className="object-contain p-1.5" />
        ) : (
          <span className="grid h-full place-items-center text-[#D8CBBB]"><Package className="h-6 w-6" /></span>
        )}
      </Link>
      <span className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="block truncate text-[13px] font-bold text-[#201A14] transition-colors hover:text-[#FF6B4A]">
          {product.name}
        </Link>
        <span className="mt-0.5 flex items-center gap-2 text-[10.5px] text-[#A0907E] tabular-nums">
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-[#B45309] text-[#B45309]" aria-hidden />
              <b className="font-black text-[#6E6153]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
            </span>
          )}
          <span>· {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش</span>
        </span>
        <span className="mt-1 block text-[13px] font-black tabular-nums text-[#201A14] lg:hidden">
          {formatPrice(product.effectivePrice)}
          <span className="text-[9.5px] font-normal text-[#A0907E]"> تومان</span>
        </span>
      </span>
      <span className="hidden shrink-0 text-[13.5px] font-black tabular-nums text-[#201A14] lg:block">
        {formatPrice(product.effectivePrice)}
        <span className="text-[9.5px] font-normal text-[#A0907E]"> تومان</span>
      </span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد`}
        className={cn(
          "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-black text-white transition-all active:scale-95 sm:px-5",
          !product.inStock
            ? "cursor-not-allowed bg-[#E9DFD3]/80 text-[#A0907E]"
            : added
              ? "sf-cta"
              : "sf-ink-btn group-hover:bg-[#FF6B4A] group-hover:text-white"
        )}
      >
        {added ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden />}
        <span className="hidden whitespace-nowrap sm:inline">{added ? "افزوده شد ✓" : "افزودن"}</span>
      </button>
    </li>
  );
}

/* ── FAQ item (clean accordion, coral caret) ─────────────────────── */
function SportFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E9DFD3]/80 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full sf-cta" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#201A14]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#A0907E] transition-transform duration-300", open ? "-rotate-90 text-[#FF6B4A]" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#6E6153]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function SportFashionTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();

  const heroSlide = data.slides[0] ?? null;
  const heroTitle = heroSlide?.title ?? "استایل تو، قانون تو";
  const heroProduct = data.featured[0] ?? data.bestsellers[0] ?? data.newest[0] ?? data.discounted[0] ?? null;
  const miniCardA = data.discounted[0] ?? null;
  const miniCardB = data.bestsellers.find((p) => p.id !== heroProduct?.id) ?? data.newest[1] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  /* marquee words — store announcement / ticker messages + fallbacks */
  const marqueeWords = Array.from(
    new Set(
      [
        store.storeName,
        ...(store.announcementActive && store.announcement ? [store.announcement] : []),
        ...(store.tickerMessages ?? []).map((m) => m.text).filter(Boolean),
        "ارسال اکسپرس به سراسر کشور",
        "۷ روز مهلت بازگشت بدون قید و شرط",
        "ضمانت اصالت کالا",
        "کالکشن جدید اسپرت و استریت‌ور",
      ].filter(Boolean)
    )
  ).slice(0, 8);

  /* two-column editorial bestseller list */
  const bestRows = data.bestsellers.slice(0, 10);
  const half = Math.ceil(bestRows.length / 2);
  const bestColA = bestRows.slice(0, half);
  const bestColB = bestRows.slice(half);

  const chrome = TEMPLATE_CHROME["sport-fashion"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  return (
    <div data-template-chrome="1" data-tpl="sport-fashion" dir="rtl" className="isolate w-full bg-[#FBF7F2] text-[#201A14]">
      <style>{SPORT_FASHION_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px]">
        {/* ═══ ① EDITORIAL HERO — right: display type · left: coral blob ═══ */}
        <motion.section
          {...rise}
          transition={{ type: "spring", stiffness: 55, damping: 15 }}
          className="relative px-4 pb-14 pt-8 sm:px-4"
          aria-labelledby="sf-hero"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* right column — giant display typography */}
            <div className="order-2 lg:order-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FF6B4A]/10 px-4 py-2 text-[11px] font-black text-[#FF6B4A]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                کالکشن جدید
              </span>
              <h1 id="sf-hero" className="mt-6 text-[2.5rem] font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-[4.1rem]">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-[13.5px] leading-8 text-[#6E6153]">
                {heroSlide?.subtitle ??
                  (store.announcementActive && store.announcement
                    ? store.announcement
                    : "از کفش دویدن حرفه‌ای تا استریت‌ور روزمره — پوشاک و اکسسوری ورزشی برندهای معتبر را این هفته با تخفیف‌های فصلی ببین.")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={heroSlide?.ctaUrl ?? "/products"}
                  className="sf-cta flex h-12 items-center gap-2 rounded-full px-8 text-sm font-black text-white shadow-[0_16px_40px_-14px_rgba(255,107,74,.6)] active:scale-[0.98]"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  {heroSlide?.ctaText ?? "خرید کالکشن جدید"}
                </Link>
                <Link
                  href="/products?discount=1"
                  className="flex h-12 items-center gap-2 rounded-full border border-[#E9DFD3]/80 bg-white px-8 text-sm font-black text-[#201A14] transition-all hover:-translate-y-0.5 hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
                >
                  <Flame className="h-4 w-4 text-[#FF6B4A]" aria-hidden />
                  تخفیف‌های فصلی
                </Link>
              </div>
              {/* editorial stats line */}
              <dl className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
                {[
                  { label: "محصول", value: counts.products },
                  { label: "دسته‌بندی", value: counts.categories },
                  { label: "برند", value: counts.brands },
                  { label: "استوری", value: counts.stories },
                ].map((s, i) => (
                  <div key={s.label} className={cn("flex items-baseline gap-1.5", i > 0 && "sm:border-e sm:border-[#E9DFD3] sm:pe-7")}>
                    <dd className="text-2xl font-black tabular-nums sm:text-[1.7rem]">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                    <dt className="text-[10.5px] font-medium text-[#A0907E]">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {/* left column — organic morphing blob + floating product */}
            <div className="order-1 lg:order-2">
              <div className="relative mx-auto aspect-square w-full max-w-[430px]">
                <span aria-hidden className="sf-blob absolute inset-6 opacity-90" />
                <span aria-hidden className="sf-blob absolute inset-10 bg-white/25 mix-blend-overlay" />

                {heroProduct?.mainImage ? (
                  <Link href={`/products/${heroProduct.slug}`} aria-label={heroProduct.name} className="sf-bob sf-render absolute inset-4 z-[2] grid place-items-center">
                    <span className="relative block h-[88%] w-[88%]">
                      <Image src={heroProduct.mainImage} alt={heroProduct.name} fill priority sizes="(max-width: 1024px) 80vw, 40vw" className="object-contain" />
                    </span>
                  </Link>
                ) : heroSlide ? (
                  <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="sf-bob absolute inset-4 z-[2]">
                    <span className="relative block h-full overflow-hidden rounded-[2.5rem] shadow-2xl">
                      <Image src={heroSlide.image} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 80vw, 40vw" className="object-cover" />
                    </span>
                  </Link>
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-white/80">
                    <Package className="h-16 w-16" aria-hidden />
                  </span>
                )}

                {/* floating mini card A — overlaps hero bounds (top) */}
                {miniCardA?.mainImage && (
                  <motion.div {...rise} transition={{ delay: 0.18 }}>
                    <Link
                      href={`/products/${miniCardA.slug}`}
                      aria-label={miniCardA.name}
                      className="sf-bob absolute -top-3 start-0 z-[3] hidden w-44 items-center gap-2.5 rounded-[1.5rem] border border-[#E9DFD3]/60 bg-white/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(32,26,20,.25)] backdrop-blur sm:flex"
                    >
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-[#F5EEE5]">
                        <Image src={miniCardA.mainImage} alt={miniCardA.name} fill sizes="48px" className="object-contain p-1" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[10.5px] font-bold text-[#201A14]">{miniCardA.name}</span>
                        {miniCardA.discountPercent > 0 && (
                          <span className="text-[9.5px] font-black text-[#DC2626] tabular-nums">
                            {miniCardA.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                          </span>
                        )}
                      </span>
                    </Link>
                  </motion.div>
                )}

                {/* floating mini card B — overlaps hero bounds (bottom) */}
                {miniCardB?.mainImage && (
                  <motion.div {...rise} transition={{ delay: 0.28 }}>
                    <Link
                      href={`/products/${miniCardB.slug}`}
                      aria-label={miniCardB.name}
                      className="sf-bob-2 absolute -bottom-6 end-0 z-[3] hidden w-48 items-center gap-2.5 rounded-[1.5rem] border border-[#E9DFD3]/60 bg-white/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(32,26,20,.25)] backdrop-blur sm:flex"
                    >
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-[#F5EEE5]">
                        <Image src={miniCardB.mainImage} alt={miniCardB.name} fill sizes="48px" className="object-contain p-1" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[10.5px] font-bold text-[#201A14]">{miniCardB.name}</span>
                        <span className="flex items-center gap-1 text-[9.5px] font-black text-[#B45309] tabular-nums">
                          <Star className="h-3 w-3 fill-[#B45309]" aria-hidden />
                          {toFaDigits(miniCardB.rating.toLocaleString("fa-IR"))} · پرفروش
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ═══ ② MARQUEE TICKER — full-bleed coral strip ═══ */}
      {marqueeWords.length > 0 && (
        <section aria-label="اطلاعیه‌های فروشگاه" className="sf-marquee relative overflow-hidden py-3">
          <div
            className="sf-marquee-track"
            style={store.tickerSpeed ? { animationDuration: `${store.tickerSpeed}s` } : undefined}
          >
            {[0, 1].map((dup) => (
              <ul key={dup} aria-hidden={dup === 1} className="flex items-center gap-10 px-5">
                {marqueeWords.map((w, i) => (
                  <li key={`${dup}-${i}`} className="flex items-center gap-10">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden />
                    <span className="whitespace-nowrap text-[12px] font-black tracking-wide text-white">{w}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>
      )}

      <div className="relative mx-auto w-full max-w-[1280px]">
        {/* ═══ ③ CATEGORIES — chip/photo cards ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <SportHeader icon={Layers} title="دسته‌بندی‌ها" subtitle="دسته‌بندی‌ها" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {data.categories.slice(0, 9).map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    className="group block overflow-hidden rounded-[1.75rem] border border-[#E9DFD3]/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6B4A]/40 hover:shadow-[0_20px_48px_-22px_rgba(255,107,74,.4)]"
                  >
                    <span className="relative block aspect-[4/3] bg-[#F5EEE5]">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-[#D8CBBB]"><Layers className="h-10 w-10" aria-hidden /></span>
                      )}
                      <span className="absolute bottom-2.5 end-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9.5px] font-black text-[#6E6153] tabular-nums backdrop-blur">
                        {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 p-3.5">
                      <span className="min-w-0 truncate text-[13px] font-black text-[#201A14]">{c.name}</span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F5EEE5] text-[#6E6153] transition-colors group-hover:bg-[#FF6B4A] group-hover:text-white">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ④ BESTSELLERS — editorial two-column NUMBERED list ═══ */}
        {bestRows.length > 0 && (
          <section className="px-4 py-12" aria-label="پرفروش‌های این هفته">
            <Reveal>
              <SportHeader icon={TrendingUp} title="پرفروش‌های این هفته" subtitle="پرفروش‌ها" href="/products?sort=bestselling" />
              <div className="rounded-[2.5rem] border border-[#E9DFD3]/80 bg-white p-3 sm:p-6">
                <div className="grid gap-x-12 lg:grid-cols-2">
                  <ul className="divide-y divide-[#EEE6DA]">
                    {bestColA.map((p, i) => (
                      <BestsellerRow key={p.id} product={p} rank={i + 1} />
                    ))}
                  </ul>
                  {bestColB.length > 0 && (
                    <ul className="divide-y divide-[#EEE6DA] lg:mt-0">
                      {bestColB.map((p, i) => (
                        <BestsellerRow key={p.id} product={p} rank={half + i + 1} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑤ SHOWCASES — dual rounded-[2.5rem] promo banners ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-12" aria-label="بنرهای تبلیغاتی">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s, i) => (
                  <Link
                    key={s.id}
                    href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    className={cn(
                      "group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-[2.5rem] p-7 sm:p-9",
                      i === 0 ? "sf-cta text-white" : "bg-[#201A14] text-white"
                    )}
                  >
                    <span aria-hidden className="sf-blob pointer-events-none absolute -bottom-16 -end-16 h-56 w-56 opacity-40" />
                    {s.image ? (
                      <span className="pointer-events-none absolute -top-6 -start-6 hidden h-40 w-40 overflow-hidden rounded-[2rem] opacity-90 sm:block">
                        <Image src={s.image} alt="" fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      </span>
                    ) : null}
                    <span className="relative z-[1] max-w-[70%]">
                      <span className="block text-[10.5px] font-black uppercase tracking-[0.25em] text-white/70">
                        {i === 0 ? "پروموی کورال" : "پروموی مشکی"}
                      </span>
                      <span className="mt-2 block text-2xl font-black leading-snug">{s.title}</span>
                      {s.subtitle && <span className="mt-2 block text-[12px] leading-6 text-white/75">{s.subtitle}</span>}
                    </span>
                    <span className="relative z-[1] mt-6 flex items-center justify-between gap-4">
                      <span className="flex h-11 items-center gap-1.5 rounded-full bg-white px-6 text-xs font-black text-[#201A14] transition-transform group-hover:-translate-y-0.5">
                        {s.product ? "خرید با تخفیف" : "مشاهده کنید"}
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                      {s.product && (
                        <span className={cn("rounded-full px-4 py-2 text-[12px] font-black text-white tabular-nums backdrop-blur", i === 0 ? "bg-[#201A14]/25" : "bg-white/15")}>
                          {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑥ NEWEST — product grid with size chips + wishlist ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-label="جدیدترین استایل‌ها">
            <Reveal>
              <SportHeader icon={Sparkles} title="جدیدترین استایل‌ها" subtitle="جدیدترین‌ها" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <SportCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑦ SEASONAL DEALS — rail with red sale badges ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-label="تخفیف‌های فصلی">
            <Reveal>
              <SportHeader icon={Flame} title="تخفیف‌های فصلی" subtitle="حراج فصل" href="/products?discount=1" />
              <div className="sf-rail -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
                {data.discounted.slice(0, 10).map((p) => (
                  <div key={p.id} className="w-[15.5rem] shrink-0 snap-start">
                    <SportCard product={p} showSizes={false} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑧ BRANDS strip ═══ */}
        {data.brands.length > 0 && (
          <section className="px-4 py-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[#A0907E]">برندهای کنار ما</p>
              <ul className="flex flex-wrap justify-center gap-3">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="flex h-12 items-center gap-2 rounded-full border border-[#E9DFD3]/80 bg-white px-5 text-[12.5px] font-black text-[#201A14] transition-all hover:-translate-y-0.5 hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
                    >
                      {b.logo ? (
                        <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-[#F5EEE5]">
                          <Image src={b.logo} alt={b.name} fill sizes="28px" className="object-contain p-0.5" />
                        </span>
                      ) : (
                        <BadgeCheck className="h-4 w-4 text-[#FF6B4A]" aria-hidden />
                      )}
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑨ LOOKBOOK — stories as tall cards ═══ */}
        {data.stories.length > 0 && (
          <section className="px-4 py-12" aria-label="لوک‌بوک و استوری‌ها">
            <Reveal>
              <SportHeader icon={Camera} title="لوک‌بوک این فصل" subtitle="استوری‌ها" />
              <div className="sf-rail -mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
                {data.stories.map((s) => (
                  <Link
                    key={s.id}
                    href={s.linkUrl ?? (s.product ? `/products/${s.product.slug}` : s.category ? `/products?category=${s.category.slug}` : "/products")}
                    aria-label={s.title}
                    className="group relative block aspect-[9/16] w-44 shrink-0 overflow-hidden rounded-[2rem] bg-[#F5EEE5] sm:w-52"
                  >
                    <Image src={s.image} alt={s.title} fill sizes="(max-width: 640px) 44vw, 208px" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#201A14]/80 via-[#201A14]/25 to-transparent" />
                    {s.videoUrl && (
                      <span className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#201A14] backdrop-blur">
                        <Play className="h-4 w-4 fill-[#201A14]" aria-hidden />
                      </span>
                    )}
                    {s.badge && (
                      <span className="absolute start-3 top-3 rounded-full bg-[#FF6B4A]/90 px-2.5 py-1 text-[9.5px] font-black text-white backdrop-blur">
                        {s.badge}
                      </span>
                    )}
                    <span className="absolute inset-x-4 bottom-4">
                      {s.category && <span className="mb-1 block text-[9.5px] font-black uppercase tracking-[0.18em] text-[#FF6B4A]">{s.category.name}</span>}
                      <span className="block text-[13px] font-black leading-6 text-white">{s.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑩ FAQ ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-12" aria-label="پرسش‌های متداول">
            <Reveal>
              <SportHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="سوالات شما" />
              <div className="sf-scroll max-h-96 space-y-3 overflow-y-auto pe-1">
                {data.faq.map((f, i) => (
                  <SportFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑪ FOOTER CTA — ink panel with coral blob ═══ */}
        <section className="px-4 py-14" aria-labelledby="sf-cta">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#201A14] px-7 py-12 text-center text-white sm:p-14">
              <span aria-hidden className="sf-blob pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 opacity-30" />
              <span aria-hidden className="sf-blob pointer-events-none absolute -top-28 -end-28 h-64 w-64 opacity-20" />
              <p dir="ltr" className="relative z-[1] text-[10.5px] font-black uppercase tracking-[0.4em] text-[#FF6B4A]">One Store · Endless Possibilities</p>
              <h2 id="sf-cta" className="relative z-[1] mt-3 text-2xl font-black leading-relaxed sm:text-3xl">
                آماده‌ای استایل این هفته‌ات را عوض کنی؟
              </h2>
              <p className="relative z-[1] mx-auto mt-3 max-w-xl text-[13px] leading-8 text-white/70">
                ویترین {store.storeName} هر هفته با کالکشن‌های تازه اسپرت و استریت‌ور به‌روز می‌شود؛ سایز و استایل مناسب تو را همین حالا پیدا کن.
              </p>
              <div className="relative z-[1] mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/products" className="sf-cta flex h-12 items-center gap-2 rounded-full px-8 text-sm font-black text-white shadow-[0_16px_40px_-14px_rgba(255,107,74,.6)] active:scale-[0.98]">
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  شروع خرید
                </Link>
                <Link
                  href="/products?sort=bestselling"
                  className="flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-sm font-black text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <TrendingUp className="h-4 w-4 text-[#FF6B4A]" aria-hidden />
                  پرفروش‌های هفته
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="px-4 pb-24">
            <div className="rounded-[2.5rem] border border-[#E9DFD3]/80 bg-white p-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-[#FF6B4A]/40" aria-hidden />
              <h2 className="text-lg font-black text-[#201A14]">ویترین {store.storeName} هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#6E6153]">به‌زودی کالکشن تازه اسپرت و استریت‌ور روی بوم کرم می‌نشیند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

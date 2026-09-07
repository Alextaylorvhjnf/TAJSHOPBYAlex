"use client";

/**
 * TEMPLATE · novatrend-clean — «NovaTrend Coral Clean» (v25 full rewrite)
 * ------------------------------------------------------------------------
 * Pure-white editorial-energetic storefront: near-black #1A1A1A display type,
 * cool-gray #6B7280/#9CA3AF meta, and ONE vibrant coral→orange accent
 * (#FF5733→#F97316). Signature = an organic morphing hero blob (asymmetric
 * border-radius) with floating product cards that overlap the hero bounds,
 * a 60/40 asymmetric hero split, best-sellers as editorial LIST rows with
 * rank numerals (gold #F59E0B) and dual rounded-[2.5rem] promo banners;
 * sale badges in red #EF4444. Generous whitespace everywhere.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShoppingCart, Package, Check, ChevronLeft, Star, TrendingUp, HelpCircle,
  Truck, ShieldCheck, Headphones, BadgeCheck, Sparkles, Flame, Gem, Layers,
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

/* ONE scoped style block — Coral Clean tokens, organic blob, pills */
const NOVATREND_CSS = `
[data-tpl="novatrend-clean"]{--tv-coral:#FF5733;--tv-orange:#F97316;--tv-ink:#1A1A1A}
[data-tpl="novatrend-clean"] .tv-blob{background:linear-gradient(135deg,#FF5733 0%,#F97316 100%);border-radius:40% 60% 55% 45%/48% 42% 58% 52%;animation:tv-morph 12s ease-in-out infinite}
[data-tpl="novatrend-clean"] .tv-cta{background:linear-gradient(135deg,#FF5733 0%,#F97316 100%);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
[data-tpl="novatrend-clean"] .tv-cta:hover{filter:brightness(1.06)}
[data-tpl="novatrend-clean"] .tv-ink-btn{background:#1A1A1A;color:#FFFFFF}
[data-tpl="novatrend-clean"] .tv-bob{animation:tv-bob 6s ease-in-out infinite}
[data-tpl="novatrend-clean"] .tv-bob-2{animation:tv-bob 7.5s ease-in-out 1.4s infinite}
[data-tpl="novatrend-clean"] .tv-render{filter:drop-shadow(0 30px 40px rgba(255,87,51,.35)) drop-shadow(0 10px 14px rgba(26,26,26,.15))}
[data-tpl="novatrend-clean"] .tv-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="novatrend-clean"] .tv-rail::-webkit-scrollbar{display:none}
[data-tpl="novatrend-clean"] .tv-scroll{scrollbar-width:thin;scrollbar-color:rgba(107,114,128,.3) transparent}
[data-tpl="novatrend-clean"] .tv-scroll::-webkit-scrollbar{width:6px}
[data-tpl="novatrend-clean"] .tv-scroll::-webkit-scrollbar-thumb{background:rgba(107,114,128,.25);border-radius:99px}
[data-tpl="novatrend-clean"] .tv-scroll::-webkit-scrollbar-track{background:transparent}
@keyframes tv-morph{
  0%,100%{border-radius:40% 60% 55% 45%/48% 42% 58% 52%}
  33%{border-radius:58% 42% 40% 60%/55% 48% 52% 45%}
  66%{border-radius:45% 55% 62% 38%/42% 58% 45% 55%}
}
@keyframes tv-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="novatrend-clean"] .tv-blob,[data-tpl="novatrend-clean"] .tv-bob,[data-tpl="novatrend-clean"] .tv-bob-2{animation:none!important}
}

/* ═══ v26fix · DARK-MODE SKIN (pure-white editorial above untouched) ═══
   Dark canvas #16171A / ink #EDEDEF. White cards become soft charcoal,
   cool-gray meta lifts to light grays — the coral→orange accent, the
   red sale badges, gold ranks and the promo banners keep their color. */
html.dark [data-tpl="novatrend-clean"]{
  --background:#16171A;
  --foreground:#EDEDEF;
  --card:#2A2B2D;
  --card-foreground:#EDEDEF;
  --popover:#313234;
  --popover-foreground:#EDEDEF;
  --secondary:#2D2E31;
  --secondary-foreground:#EDEDEF;
  --muted:#26272A;
  --muted-foreground:#9B9C9E;
  --accent:#353639;
  --accent-foreground:#EDEDEF;
  --border:rgba(237,237,239,0.16);
  --input:rgba(237,237,239,0.22);
  --ring:#8C8D8F;
  background-color:#16171A;
  color:#EDEDEF;
}
/* ink ramp — near-black → light ink, cool grays lifted */
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#1A1A1A\\]{color:#EDEDEF}
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#6B7280\\]{color:#A8ADB4}
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#9CA3AF\\]{color:#8B9199}
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#D1D5DB\\]{color:#6C7278}
html.dark [data-tpl="novatrend-clean"] .text-gray-300{color:#5B6167}
/* coral re-declared AFTER the gray ramp so the open-FAQ caret and every
   accent keep beating the (higher-specificity) ink overrides           */
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#FF5733\\]{color:#FF5733}
/* white cards → charcoal; wells & chips step up in elevation */
html.dark [data-tpl="novatrend-clean"] .bg-white{background-color:#1E1F23}
html.dark [data-tpl="novatrend-clean"] .bg-white\\/95{background-color:rgba(33,34,38,0.95)}
html.dark [data-tpl="novatrend-clean"] .bg-white\\/90{background-color:rgba(27,28,31,0.92)}
html.dark [data-tpl="novatrend-clean"] .bg-gray-50{background-color:#232429}
html.dark [data-tpl="novatrend-clean"] .bg-gray-100{background-color:#28292E}
/* hairlines */
html.dark [data-tpl="novatrend-clean"] .border-gray-200,
html.dark [data-tpl="novatrend-clean"] .sm\\:border-gray-200{border-color:rgba(237,237,239,0.13)}
html.dark [data-tpl="novatrend-clean"] .border-gray-200\\/80{border-color:rgba(237,237,239,0.1)}
html.dark [data-tpl="novatrend-clean"] .border-gray-200\\/70{border-color:rgba(237,237,239,0.09)}
html.dark [data-tpl="novatrend-clean"] .border-gray-100{border-color:rgba(237,237,239,0.07)}
html.dark [data-tpl="novatrend-clean"] .divide-gray-100 > :not(:last-child),
html.dark [data-tpl="novatrend-clean"] .divide-gray-100 > :not([hidden]) ~ :not([hidden]){border-color:rgba(237,237,239,0.08)}
/* accent tints gain a little alpha so they read on charcoal */
html.dark [data-tpl="novatrend-clean"] .bg-\\[\\#FF5733\\]\\/\\[0\\.08\\]{background-color:rgba(255,87,51,0.15)}
html.dark [data-tpl="novatrend-clean"] .bg-\\[\\#F59E0B\\]\\/10{background-color:rgba(245,158,11,0.16)}
html.dark [data-tpl="novatrend-clean"] .text-\\[\\#FF5733\\]\\/40{color:rgba(255,87,51,0.55)}
/* hover/group-hover states that must keep beating the overrides above */
html.dark [data-tpl="novatrend-clean"] .hover\\:text-\\[\\#FF5733\\]:hover{color:#FF5733}
html.dark [data-tpl="novatrend-clean"] .hover\\:bg-\\[\\#FF5733\\]:hover{background-color:#FF5733}
html.dark [data-tpl="novatrend-clean"] .hover\\:border-\\[\\#FF5733\\]:hover{border-color:#FF5733}
html.dark [data-tpl="novatrend-clean"] .hover\\:border-\\[\\#FF5733\\]\\/50:hover{border-color:rgba(255,87,51,0.5)}
html.dark [data-tpl="novatrend-clean"] .hover\\:border-\\[\\#FF5733\\]\\/40:hover{border-color:rgba(255,87,51,0.4)}
html.dark [data-tpl="novatrend-clean"] .hover\\:border-\\[\\#FF5733\\]\\/30:hover{border-color:rgba(255,87,51,0.3)}
html.dark [data-tpl="novatrend-clean"] .group-hover\\:bg-\\[\\#FF5733\\]:is(:where(.group):hover *){background-color:#FF5733}
html.dark [data-tpl="novatrend-clean"] .group-hover\\:text-white:is(:where(.group):hover *){color:#FFFFFF}
/* the «black promo» banner lifts one step so it still reads as a card */
html.dark [data-tpl="novatrend-clean"] .bg-\\[\\#1A1A1A\\]{background-color:#232428}
/* ink button inverts (ink is light now); scrollbar goes ink-alpha */
html.dark [data-tpl="novatrend-clean"] .tv-ink-btn{background:#EDEDEF;color:#16171A}
html.dark [data-tpl="novatrend-clean"] .tv-scroll{scrollbar-color:rgba(237,237,239,0.22) transparent}
html.dark [data-tpl="novatrend-clean"] .tv-scroll::-webkit-scrollbar-thumb{background:rgba(237,237,239,0.18)}
/* restore: the STAYING coral/black promo banners keep their white CTA
   pill with the near-black label, exactly like light mode */
html.dark [data-tpl="novatrend-clean"] .tv-cta .bg-white,
html.dark [data-tpl="novatrend-clean"] .bg-\\[\\#1A1A1A\\] .bg-white{background-color:#FFFFFF}
html.dark [data-tpl="novatrend-clean"] .tv-cta .text-\\[\\#1A1A1A\\],
html.dark [data-tpl="novatrend-clean"] .bg-\\[\\#1A1A1A\\] .text-\\[\\#1A1A1A\\]{color:#1A1A1A}
`;

/* ── section header — editorial eyebrow + big title ──────────────── */
function TrendHeader({
  icon: Icon, title, subtitle, href, dark = false,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; dark?: boolean }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={cn("mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.22em]", dark ? "text-[#F97316]" : "text-[#FF5733]")}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {subtitle ?? "نواترند"}
        </p>
        <h2 className={cn("truncate text-2xl font-black tracking-tight md:text-[1.7rem]", dark ? "text-white" : "text-[#1A1A1A]")}>{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-xs font-black transition-all hover:-translate-y-0.5",
            dark ? "bg-white/10 text-white hover:bg-[#F97316]" : "border border-gray-200 bg-white text-[#1A1A1A] hover:border-[#FF5733] hover:text-[#FF5733]"
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
function useTrendAdd() {
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

/* ── clean product card — coral hover, red sale badge ═══ ═══ ═══ ── */
function TrendCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useTrendAdd();
  return (
    <article className={cn("group flex h-full flex-col rounded-[1.75rem] border border-gray-200/80 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF5733]/40 hover:shadow-[0_20px_48px_-22px_rgba(255,87,51,.4)]", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1.5rem] bg-gray-50">
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
          <span className="grid h-full place-items-center text-gray-300"><Package className="h-10 w-10" aria-hidden /></span>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-[#EF4444] px-2.5 py-1 text-[10px] font-black text-white tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[#1A1A1A]/85 py-1.5 text-center text-[10px] font-bold text-white">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-[#9CA3AF]">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#FF5733]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[#1A1A1A] transition-colors hover:text-[#FF5733]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#9CA3AF] tabular-nums">
            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" aria-hidden />
            <b className="font-black text-[#6B7280]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
            <span>({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))})</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[10.5px] leading-4 text-[#9CA3AF] line-through tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className="text-[14.5px] font-black tabular-nums text-[#1A1A1A]">
              {formatPrice(product.effectivePrice)}
              <span className="text-[10px] font-normal text-[#9CA3AF]"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all active:scale-95",
              !product.inStock
                ? "cursor-not-allowed bg-gray-100 text-gray-300"
                : added
                  ? "tv-ink-btn"
                  : "tv-cta text-white shadow-[0_10px_24px_-10px_rgba(255,87,51,.55)]"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ item (clean accordion, coral caret) ─────────────────────── */
function TrendFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-gray-200/80 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full tv-cta" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#1A1A1A]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform duration-300", open ? "-rotate-90 text-[#FF5733]" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#6B7280]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function NovatrendCleanTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);
  const heroProduct = data.featured[0] ?? data.bestsellers[0] ?? data.newest[0] ?? null;
  const miniCardA = data.discounted[0] ?? null;
  const miniCardB = data.bestsellers.find((p) => p.id !== heroProduct?.id) ?? data.newest[1] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const chrome = TEMPLATE_CHROME["novatrend-clean"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  return (
    <div data-template-chrome="1" data-tpl="novatrend-clean" className="isolate w-full bg-white text-[#1A1A1A]">
      <style>{NOVATREND_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px]">
        {/* ═══ HERO — 60/40 asymmetric split + organic blob ═══ */}
        <motion.section {...rise} transition={{ type: "spring", stiffness: 55, damping: 15 }} className="relative px-4 pb-16 pt-6 sm:px-4" aria-labelledby="tv-hero">
          <div className="grid items-center gap-12 lg:grid-cols-5">
            {/* 60% — editorial copy */}
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FF5733]/[0.08] px-4 py-2 text-[11px] font-black text-[#FF5733]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                نواترند کورال
              </span>
              <h1 id="tv-hero" className="mt-6 text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.6rem]">
                {store.storeName}
              </h1>
              <p dir="ltr" className="mt-3 text-[11px] font-bold uppercase tracking-[0.4em] text-[#9CA3AF]">{store.storeNameEn}</p>
              <p className="mt-6 max-w-xl text-[13.5px] leading-8 text-[#6B7280]">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : "سفیدِ خالص، یک قطره کورال — انتخاب‌های شارژ این هفته را ببین؛ حراج‌های قرمز و پرفروش‌های طلایی منتظرت هستند."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="tv-cta flex h-12 items-center gap-2 rounded-full px-8 text-sm font-black text-white shadow-[0_16px_40px_-14px_rgba(255,87,51,.6)] active:scale-[0.98]">
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  شروع خرید
                </Link>
                <Link href="/products?discount=1" className="flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-8 text-sm font-black text-[#1A1A1A] transition-all hover:-translate-y-0.5 hover:border-[#FF5733]/50 hover:text-[#FF5733]">
                  <Flame className="h-4 w-4 text-[#FF5733]" aria-hidden />
                  حراج قرمز
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
                  <div key={s.label} className={cn("flex items-baseline gap-1.5", i > 0 && "sm:border-e sm:border-gray-200 sm:pe-7")}>
                    <dd className="text-2xl font-black tabular-nums sm:text-[1.7rem]">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                    <dt className="text-[10.5px] font-medium text-[#9CA3AF]">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {/* 40% — organic blob + overlapping product cards */}
            <div className="relative lg:col-span-2">
              <div className="relative mx-auto aspect-square w-full max-w-[420px]">
                {/* the morphing coral blob */}
                <span aria-hidden className="tv-blob absolute inset-6 opacity-90" />
                <span aria-hidden className="tv-blob absolute inset-10 bg-white/25 mix-blend-overlay" />

                {/* main render over the blob */}
                {heroProduct?.mainImage ? (
                  <Link href={`/products/${heroProduct.slug}`} aria-label={heroProduct.name} className="tv-bob tv-render absolute inset-4 z-[2] grid place-items-center">
                    <span className="relative block h-[88%] w-[88%]">
                      <Image src={heroProduct.mainImage} alt={heroProduct.name} fill priority sizes="(max-width: 1024px) 80vw, 34vw" className="object-contain" />
                    </span>
                  </Link>
                ) : heroSlide ? (
                  <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="tv-bob absolute inset-4 z-[2]">
                    <span className="relative block h-full overflow-hidden rounded-[2.5rem] shadow-2xl">
                      <SlideArt slide={heroSlide} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 80vw, 34vw" className="object-cover" />
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
                      className="tv-bob absolute -top-3 start-0 z-[3] hidden w-44 items-center gap-2.5 rounded-[1.5rem] border border-gray-100 bg-white/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(26,26,26,.25)] backdrop-blur sm:flex"
                    >
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-gray-50">
                        <Image src={miniCardA.mainImage} alt={miniCardA.name} fill sizes="48px" className="object-contain p-1" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[10.5px] font-bold text-[#1A1A1A]">{miniCardA.name}</span>
                        {miniCardA.discountPercent > 0 && (
                          <span className="text-[9.5px] font-black text-[#EF4444] tabular-nums">
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
                      className="tv-bob-2 absolute -bottom-6 end-0 z-[3] hidden w-48 items-center gap-2.5 rounded-[1.5rem] border border-gray-100 bg-white/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(26,26,26,.25)] backdrop-blur sm:flex"
                    >
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-gray-50">
                        <Image src={miniCardB.mainImage} alt={miniCardB.name} fill sizes="48px" className="object-contain p-1" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[10.5px] font-bold text-[#1A1A1A]">{miniCardB.name}</span>
                        <span className="flex items-center gap-1 text-[9.5px] font-black text-[#F59E0B] tabular-nums">
                          <Star className="h-3 w-3 fill-[#F59E0B]" aria-hidden />
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

        {/* ═══ trust strip ═══ */}
        <section className="px-4 py-6" aria-label="مزیت‌های فروشگاه">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { icon: Truck, t: "ارسال اکسپرس", d: "تحویل ۲۴ تا ۷۲ ساعته" },
                { icon: ShieldCheck, t: "ضمانت اصالت", d: "۱۰۰٪ کالای اورجینال" },
                { icon: Headphones, t: "پشتیبانی واقعی", d: "پاسخ در کمتر از ۱ ساعت" },
                { icon: BadgeCheck, t: "ضمانت بازگشت", d: "۷ روز مهلت بدون قید" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-3 rounded-[1.5rem] border border-gray-200/70 bg-white p-4 transition-colors hover:border-[#FF5733]/30">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF5733]/[0.08] text-[#FF5733]">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-black text-[#1A1A1A]">{f.t}</span>
                    <span className="block truncate text-[10.5px] text-[#9CA3AF]">{f.d}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ extra slides — editorial mini banners ═══ */}
        {extraSlides.length > 0 && (
          <section className="px-4 py-8" aria-label="بنرهای کوچک">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {extraSlides.map((s) => (
                <Link key={s.id} href={s.ctaUrl ?? "/products"} className="group relative block overflow-hidden rounded-[2.5rem]">
                  <span className="relative block aspect-[16/7] bg-gray-50">
                    <SlideArt slide={s} alt={s.title} fill sizes="(max-width: 640px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="absolute bottom-4 start-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 backdrop-blur">
                    <span className="max-w-[10rem] truncate text-[11.5px] font-black text-[#1A1A1A]">{s.title}</span>
                    {s.product && (
                      <span className="tv-cta shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-black text-white tabular-nums">
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
          <section className="px-4 py-10" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <TrendHeader icon={Sparkles} title="استوری‌های داغ" subtitle="برای دیدن، لمس کنید" />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-10" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <TrendHeader icon={Layers} title="دسته‌بندی‌های محبوب" subtitle="دسته‌بندی‌ها" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="group block overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#FF5733]/40 hover:shadow-[0_20px_48px_-22px_rgba(255,87,51,.4)]">
                    <span className="relative block aspect-[4/3] bg-gray-50">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-gray-300"><Layers className="h-10 w-10" aria-hidden /></span>
                      )}
                      <span className="absolute bottom-2.5 end-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9.5px] font-black text-[#6B7280] tabular-nums backdrop-blur">
                        {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 p-3.5">
                      <span className="min-w-0 truncate text-[13px] font-black text-[#1A1A1A]">{c.name}</span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-[#6B7280] transition-colors group-hover:bg-[#FF5733] group-hover:text-white">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ NEW ARRIVALS ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-new">
            <Reveal>
              <TrendHeader icon={Sparkles} title="تازه‌های رسیده" subtitle="جدیدترین‌ها" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <TrendCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — editorial LIST rows with rank numerals ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-best">
            <Reveal>
              <TrendHeader icon={TrendingUp} title="پرفروش‌های طلایی" subtitle="پرفروش‌ها" href="/products?sort=bestselling" />
              <div className="tv-scroll max-h-96 overflow-y-auto rounded-[2.5rem] border border-gray-200/80 bg-white p-3 sm:p-5">
                <ul className="divide-y divide-gray-100">
                  {data.bestsellers.slice(0, 10).map((p, i) => (
                    <BestsellerListRow key={p.id} product={p} rank={i + 1} />
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — red sale grid ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-deals">
            <Reveal>
              <TrendHeader icon={Flame} title="حراج قرمز نواترند" subtitle="تخفیف‌دارها" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <TrendCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — dual rounded-[2.5rem] promo banners ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-10" aria-label="بنرهای تبلیغاتی">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s, i) => (
                  <Link
                    key={s.id}
                    href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    className={cn(
                      "group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-[2.5rem] p-7 sm:p-9",
                      i === 0 ? "tv-cta text-white" : "bg-[#1A1A1A] text-white"
                    )}
                  >
                    <span className="tv-blob pointer-events-none absolute -bottom-16 -end-16 h-56 w-56 opacity-40" aria-hidden />
                    <span className="relative z-[1] max-w-[70%]">
                      <span className="block text-[10.5px] font-black uppercase tracking-[0.25em] text-white/70">
                        {i === 0 ? "پروموی کورال" : "پروموی مشکی"}
                      </span>
                      <span className="mt-2 block text-2xl font-black leading-snug">{s.title}</span>
                      {s.subtitle && <span className="mt-2 block text-[12px] leading-6 text-white/75">{s.subtitle}</span>}
                    </span>
                    <span className="relative z-[1] mt-6 flex items-center justify-between gap-4">
                      <span className="flex h-11 items-center gap-1.5 rounded-full bg-white px-6 text-xs font-black text-[#1A1A1A] transition-transform group-hover:-translate-y-0.5">
                        {s.product ? "خرید با تخفیف" : "مشاهده کنید"}
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                      {s.product && (
                        <span className="rounded-full bg-[#1A1A1A]/25 px-4 py-2 text-[12px] font-black text-white tabular-nums backdrop-blur">
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

        {/* ═══ FEATURED ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-featured">
            <Reveal>
              <TrendHeader icon={Star} title="منتخب سردبیر" subtitle="برجسته‌ها" href="/products?sort=rating" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <TrendCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — editorial cards ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-exclusive">
            <Reveal>
              <TrendHeader icon={Gem} title="انحصاری نواترند" subtitle="فقط اینجا" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {data.exclusive.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group relative flex items-center gap-5 overflow-hidden rounded-[2.5rem] border border-gray-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF5733]/40 hover:shadow-[0_22px_50px_-22px_rgba(255,87,51,.45)]"
                  >
                    <span className="relative block h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] bg-gray-50">
                      {p.mainImage ? (
                        <Image src={p.mainImage} alt={p.name} fill sizes="112px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-gray-300"><Gem className="h-10 w-10" aria-hidden /></span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-1 text-[9.5px] font-black text-[#F59E0B]">
                        <Gem className="h-3 w-3" aria-hidden />
                        عرضه انحصاری
                      </span>
                      <span className="mt-2 block text-[13.5px] font-black leading-6 line-clamp-2 text-[#1A1A1A]">{p.name}</span>
                      <span className="mt-1.5 block text-[15px] font-black tabular-nums text-[#FF5733]">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[10px] font-normal text-[#9CA3AF]"> تومان</span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="tv-faq">
            <Reveal>
              <TrendHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="سوالات شما" />
              <div className="tv-scroll max-h-96 space-y-3 overflow-y-auto pe-1">
                {data.faq.map((f, i) => (
                  <TrendFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-2 px-4 pb-16" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[#9CA3AF]">برندهای کنار ما</p>
              <ul className="tv-rail flex flex-wrap justify-center gap-3">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-[12.5px] font-black text-[#1A1A1A] transition-all hover:-translate-y-0.5 hover:border-[#FF5733]/50 hover:text-[#FF5733]"
                    >
                      {b.logo ? (
                        <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-gray-50">
                          <Image src={b.logo} alt={b.name} fill sizes="28px" className="object-contain p-0.5" />
                        </span>
                      ) : (
                        <BadgeCheck className="h-4 w-4 text-[#FF5733]" aria-hidden />
                      )}
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
          <section className="px-4 pb-24">
            <div className="rounded-[2.5rem] border border-gray-200/80 bg-white p-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-[#FF5733]/40" aria-hidden />
              <h2 className="text-lg font-black">ویترین نواترند هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#6B7280]">به‌زودی محصولات تازه روی بوم سفید می‌نشینند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── bestseller LIST row — editorial rank numerals + quick-add ───── */
function BestsellerListRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useTrendAdd();
  const gold = rank <= 3;
  return (
    <li className="group flex items-center gap-3 py-3 first:pt-1 last:pb-1 sm:gap-4 sm:px-2">
      <span
        className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-[1.25rem] text-xl font-black tabular-nums", gold ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-gray-100 text-[#D1D5DB]")}
        aria-hidden
      >
        {rank.toLocaleString("fa-IR")}
      </span>
      {gold && (
        <span className="hidden shrink-0 rounded-full bg-[#F59E0B] px-2.5 py-1 text-[9px] font-black text-white lg:inline-flex">پرفروش</span>
      )}
      <Link href={`/products/${product.slug}`} className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[1.25rem] bg-gray-50" aria-hidden>
        {product.mainImage ? (
          <Image src={product.mainImage} alt="" fill sizes="56px" className="object-contain p-1.5" />
        ) : (
          <span className="grid h-full place-items-center text-gray-300"><Package className="h-6 w-6" /></span>
        )}
      </Link>
      <span className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="block truncate text-[13px] font-bold text-[#1A1A1A] transition-colors hover:text-[#FF5733]">
          {product.name}
        </Link>
        <span className="mt-0.5 flex items-center gap-2 text-[10.5px] text-[#9CA3AF] tabular-nums">
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" aria-hidden />
              <b className="font-black text-[#6B7280]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
            </span>
          )}
          <span>· {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش</span>
        </span>
      </span>
      <span className="shrink-0 text-[13.5px] font-black tabular-nums text-[#1A1A1A]">
        {formatPrice(product.effectivePrice)}
        <span className="text-[9.5px] font-normal text-[#9CA3AF]"> تومان</span>
      </span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد`}
        className={cn(
          "hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-5 text-[11px] font-black transition-all active:scale-95 sm:flex",
          !product.inStock
            ? "cursor-not-allowed bg-gray-100 text-gray-300"
            : added
              ? "bg-[#F59E0B] text-white"
              : "tv-ink-btn hover:bg-[#FF5733]"
        )}
      >
        {added ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden />}
        {added ? "افزوده شد" : "افزودن"}
      </button>
    </li>
  );
}

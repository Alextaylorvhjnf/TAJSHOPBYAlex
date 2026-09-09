"use client";

/**
 * TEMPLATE · minimal-premium — «Minimal Mono Glass» (v25 futurized rewrite)
 * ---------------------------------------------------------------------
 * Ultra-clean futurism through subtraction: white canvas, near-black
 * #111111 type, huge whitespace, hairline dividers — and exactly ONE
 * neon accent (emerald #10B981) used surgically. Glass panels
 * (bg-white/60 + blur) for the featured picks, magnetic translate hover
 * on CTAs, tabular-nums stats and sticky-feel section labels that pin
 * to the top while content scrolls under them. Quiet, expensive, precise.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Package, ShoppingCart, ChevronLeft, Plus, Star } from "lucide-react";
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

/* ONE scoped style block — every rule prefixed mm- (minimal mono glass) */
const MINIMAL_CSS = `
[data-tpl="minimal-premium"]{
  --mm-ink:#111111;--mm-mute:#737373;--mm-line:#E9E9E9;--mm-accent:#10B981;
  background:#FFFFFF;color:#111111;
}
[data-tpl="minimal-premium"] ::selection{background:rgba(16,185,129,.22);color:#111111}
[data-tpl="minimal-premium"] a:focus-visible,[data-tpl="minimal-premium"] button:focus-visible,[data-tpl="minimal-premium"] summary:focus-visible{outline:2px solid #10B981;outline-offset:3px}

/* glass panel */
[data-tpl="minimal-premium"] .mm-glass{
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(17,17,17,.07);
  box-shadow:0 30px 70px -34px rgba(17,17,17,.25);
}

/* magnetic CTA — translate + emerald underline sweep */
[data-tpl="minimal-premium"] .mm-cta{
  position:relative;overflow:hidden;background:#111111;color:#FFFFFF;
  transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s;
}
[data-tpl="minimal-premium"] .mm-cta::after{
  content:"";position:absolute;inset-inline:0;bottom:0;height:2px;background:#10B981;
  transform:scaleX(0);transform-origin:center;transition:transform .45s cubic-bezier(.22,1,.36,1);
}
[data-tpl="minimal-premium"] .mm-cta:hover{
  transform:translate(-2px,-2px);
  box-shadow:6px 8px 0 -2px rgba(16,185,129,.9),0 18px 40px -18px rgba(17,17,17,.4);
}
[data-tpl="minimal-premium"] .mm-cta:hover::after{transform:scaleX(1)}
[data-tpl="minimal-premium"] .mm-cta:active{transform:translate(0,0)}

/* hairline ghost button */
[data-tpl="minimal-premium"] .mm-ghost{border:1px solid #E9E9E9;color:#111111;transition:all .3s}
[data-tpl="minimal-premium"] .mm-ghost:hover{border-color:#111111;box-shadow:4px 4px 0 -1px rgba(17,17,17,.12)}

/* sticky-feel section label */
[data-tpl="minimal-premium"] .mm-label{
  position:sticky;top:0;z-index:30;
  background:rgba(255,255,255,.86);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
}

/* emerald pulse dot */
[data-tpl="minimal-premium"] .mm-dot{
  width:7px;height:7px;border-radius:99px;background:#10B981;
  box-shadow:0 0 0 0 rgba(16,185,129,.5);animation:mm-pulse 2.8s infinite;
}
@keyframes mm-pulse{
  0%{box-shadow:0 0 0 0 rgba(16,185,129,.45)}
  70%{box-shadow:0 0 0 9px rgba(16,185,129,0)}
  100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}
}

/* numbers */
[data-tpl="minimal-premium"] .mm-num{font-variant-numeric:tabular-nums}

/* minimal product card */
[data-tpl="minimal-premium"] .mm-card{
  background:#FFFFFF;border:1px solid #E9E9E9;
  transition:border-color .35s,transform .4s cubic-bezier(.22,1,.36,1),box-shadow .35s;
}
[data-tpl="minimal-premium"] .mm-card:hover{
  border-color:#111111;transform:translateY(-4px);
  box-shadow:0 26px 60px -30px rgba(17,17,17,.28);
}

/* dark premium band */
[data-tpl="minimal-premium"] .mm-dark{
  background:#111111;color:#FFFFFF;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
}
[data-tpl="minimal-premium"] .mm-dark-card{
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  transition:border-color .35s,transform .35s,background .35s;
}
[data-tpl="minimal-premium"] .mm-dark-card:hover{
  border-color:rgba(16,185,129,.5);background:rgba(16,185,129,.07);transform:translateY(-3px);
}

/* rails & scroll */
[data-tpl="minimal-premium"] .mm-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="minimal-premium"] .mm-rail::-webkit-scrollbar{display:none}
[data-tpl="minimal-premium"] .mm-scroll{scrollbar-width:thin;scrollbar-color:rgba(16,185,129,.4) transparent}
[data-tpl="minimal-premium"] .mm-scroll::-webkit-scrollbar{width:6px}
[data-tpl="minimal-premium"] .mm-scroll::-webkit-scrollbar-thumb{background:rgba(16,185,129,.45);border-radius:99px}
[data-tpl="minimal-premium"] .mm-scroll::-webkit-scrollbar-track{background:transparent}

/* token blend for the shared StoriesRow on white */
[data-tpl="minimal-premium"] .mm-story-wrap{
  --background:#FFFFFF;--foreground:#111111;--card:#FFFFFF;--muted:#F5F5F5;
  --muted-foreground:#737373;--primary:#10B981;--border:#E9E9E9;
}

/* native details FAQ */
[data-tpl="minimal-premium"] details.mm-faq summary{list-style:none;cursor:pointer}
[data-tpl="minimal-premium"] details.mm-faq summary::-webkit-details-marker{display:none}
[data-tpl="minimal-premium"] details.mm-faq .mm-faq-icon{transition:transform .35s}
[data-tpl="minimal-premium"] details.mm-faq[open] .mm-faq-icon{transform:rotate(45deg)}

@media (prefers-reduced-motion:reduce){
  [data-tpl="minimal-premium"] .mm-dot{animation:none!important}
  [data-tpl="minimal-premium"] .mm-cta,[data-tpl="minimal-premium"] .mm-card,
  [data-tpl="minimal-premium"] .mm-dark-card{transition:none!important}
  [data-tpl="minimal-premium"] .mm-cta:hover{transform:none!important}
}

/* ═══ v26fix · DARK SKIN — additive only, light rendering untouched ═══
   Palette: bg #14161A / ink #EDEFF3. Emerald accent, orbs, image
   overlays and the near-black premium band keep their identity (the
   band is re-anchored one step deeper than the page so it still reads
   as "the dark band"). Every selector is scoped under html.dark. */
html.dark [data-tpl="minimal-premium"]{
  --mm-ink:#EDEFF3;--mm-mute:#A2AAB4;--mm-line:#2A2D33;--mm-accent:#10B981;
  background:#14161A;color:#EDEFF3;
}
html.dark [data-tpl="minimal-premium"] ::selection{background:rgba(16,185,129,.3);color:#EDEFF3}

/* raw utility overrides — neutrals flip, emerald family kept.
   NOTE: this CSS lives in a JS template literal — every CSS escape
   backslash must be doubled (\\[ → \[ at runtime) or the selector
   silently degrades to the unescaped, invalid form. */
html.dark [data-tpl="minimal-premium"] .bg-white{background-color:#14161A}
html.dark [data-tpl="minimal-premium"] .text-\\[\\#111111\\]{color:#EDEFF3}
html.dark [data-tpl="minimal-premium"] .fill-\\[\\#111111\\]{fill:#EDEFF3}
html.dark [data-tpl="minimal-premium"] .text-\\[\\#737373\\]{color:#A2AAB4}
html.dark [data-tpl="minimal-premium"] .text-\\[\\#A3A3A3\\]{color:#7A828C}
html.dark [data-tpl="minimal-premium"] .text-\\[\\#D4D4D4\\]{color:#555B64}
html.dark [data-tpl="minimal-premium"] .border-\\[\\#E9E9E9\\]{border-color:#2A2D33}
html.dark [data-tpl="minimal-premium"] .hover\\:border-\\[\\#111111\\]:hover{border-color:#EDEFF3}
html.dark [data-tpl="minimal-premium"] .bg-\\[\\#FAFAFA\\]{background-color:#1B1E24}
html.dark [data-tpl="minimal-premium"] .hover\\:bg-\\[\\#FAFAFA\\]:hover{background-color:#1B1E24}
/* white-alpha well inside the glass panel → light-ink tint */
html.dark [data-tpl="minimal-premium"] .bg-white\\/70{background-color:rgba(237,239,243,.06)}
/* header/footer fade band follows the dark canvas */
html.dark [data-tpl="minimal-premium"] .from-background{--tw-gradient-from:#14161A}

/* helper classes — dark variants */
html.dark [data-tpl="minimal-premium"] .mm-glass{
  background:rgba(23,26,32,.62);
  border-color:rgba(237,239,243,.08);
  box-shadow:0 30px 70px -34px rgba(0,0,0,.55);
}
html.dark [data-tpl="minimal-premium"] .mm-cta{background:#EDEFF3;color:#14161A}
html.dark [data-tpl="minimal-premium"] .mm-cta:hover{
  box-shadow:6px 8px 0 -2px rgba(16,185,129,.9),0 18px 40px -18px rgba(0,0,0,.5);
}
html.dark [data-tpl="minimal-premium"] .mm-ghost{border-color:#2A2D33;color:#EDEFF3}
html.dark [data-tpl="minimal-premium"] .mm-ghost:hover{border-color:#EDEFF3;box-shadow:4px 4px 0 -1px rgba(0,0,0,.45)}
html.dark [data-tpl="minimal-premium"] .mm-label{background:rgba(20,22,26,.88)}
html.dark [data-tpl="minimal-premium"] .mm-card{background:#191C21;border-color:#2A2D33}
html.dark [data-tpl="minimal-premium"] .mm-card:hover{
  border-color:rgba(237,239,243,.85);
  box-shadow:0 26px 60px -30px rgba(0,0,0,.6);
}
/* premium band: one step deeper than the page so it keeps its role */
html.dark [data-tpl="minimal-premium"] .mm-dark{
  background:#0B0D11;color:#EDEFF3;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
}
/* token blend for the shared StoriesRow on the dark canvas */
html.dark [data-tpl="minimal-premium"] .mm-story-wrap{
  --background:#14161A;--foreground:#EDEFF3;--card:#191C21;--muted:#1E2127;
  --muted-foreground:#A2AAB4;--primary:#10B981;--border:#2A2D33;
}
`;

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useMonoAdd() {
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

/* ── sticky-feel section label — the minimal signature ───────────── */
function SectionLabel({ code, title, href }: { code: string; title: string; href?: string }) {
  return (
    <div className="mm-label -mx-4 mb-10 flex items-center gap-3 border-b border-[#E9E9E9] px-4 py-4">
      <span aria-hidden className="h-4 w-1 shrink-0 bg-[#10B981]" />
      <h2 className="text-[13px] font-black uppercase tracking-[0.28em] text-[#111111]">{title}</h2>
      <span className="mm-num shrink-0 text-[10px] text-[#A3A3A3]">{code}</span>
      <span className="flex-1" />
      {href && (
        <Link
          href={href}
          className="flex h-9 shrink-0 items-center gap-1 text-[11px] font-bold text-[#737373] transition-colors hover:text-[#10B981]"
        >
          همه
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── stars ───────────────────────────────────────────────────────── */
function Stars({ rating, count, dark = false }: { rating: number; count: number; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-1 text-[11px]", dark ? "text-[#9C9C9C]" : "text-[#A3A3A3]")}>
      <Star className={cn("h-3.5 w-3.5", dark ? "fill-[#10B981] text-[#10B981]" : "fill-[#111111] text-[#111111]")} aria-hidden />
      <span className={cn("font-black", dark ? "text-white" : "text-[#111111]")}>
        {rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}
      </span>
      {count > 0 && <span className="mm-num">({toFaDigits(count.toLocaleString("fa-IR"))})</span>}
    </span>
  );
}

/* ── minimal product card ────────────────────────────────────────── */
function MonoCard({ product, className }: { product: TemplateProduct; className?: string }) {
  const { addToCart, added } = useMonoAdd();
  return (
    <article className={cn("mm-card group relative flex flex-col", !product.inStock && "grayscale-[0.45]", className)}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden bg-[#FAFAFA]"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#D4D4D4]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="mm-num absolute start-3 top-3 bg-[#10B981] px-2 py-0.5 text-[10px] font-black text-white">
            −{toFaDigits(product.discountPercent)}٪
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-[#111111]/85 py-1.5 text-center text-[10px] font-black tracking-[0.2em] text-white">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A3A3A3]">{product.brand.name}</p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1.5 min-h-12 text-[12.5px] font-bold leading-6 transition-colors hover:text-[#10B981]"
        >
          {product.name}
        </Link>
        <p className="mm-num mt-2 text-[14px] font-black">
          {product.discountPercent > 0 && (
            <span className="me-2 text-[10.5px] font-medium text-[#A3A3A3] price-old">{formatPrice(product.price)}</span>
          )}
          {formatPrice(product.effectivePrice)}
          <span className="text-[9px] font-normal text-[#A3A3A3]"> تومان</span>
        </p>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "mt-3.5 flex h-11 w-full items-center justify-center gap-2 text-[11px] font-black transition-all",
            !product.inStock
              ? "cursor-not-allowed border border-[#E9E9E9] text-[#D4D4D4]"
              : added
                ? "mm-cta"
                : "mm-ghost hover:border-[#111111]"
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> افزوده شد
            </>
          ) : product.inStock ? (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden /> افزودن
            </>
          ) : (
            "اتمام موجودی"
          )}
        </button>
      </div>
    </article>
  );
}

/* ── glass pick (featured panel) ─────────────────────────────────── */
function GlassPick({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useMonoAdd();
  return (
    <article className={cn("group relative flex flex-col p-4", !product.inStock && "grayscale-[0.45]")}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden bg-white/70"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#D4D4D4]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="mm-num absolute start-2 top-2 bg-[#10B981] px-2 py-0.5 text-[10px] font-black text-white">
            −{toFaDigits(product.discountPercent)}٪
          </span>
        )}
      </Link>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A3A3A3]">{product.brand.name}</p>
      <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[12.5px] font-bold leading-6 transition-colors hover:text-[#10B981]">
        {product.name}
      </Link>
      <div className="mt-1.5">
        <Stars rating={product.rating} count={product.reviewCount} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="mm-num text-[14px] font-black">
          {formatPrice(product.effectivePrice)}
          <span className="text-[9px] font-normal text-[#A3A3A3]"> تومان</span>
        </p>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center border transition-all",
            !product.inStock
              ? "cursor-not-allowed border-[#E9E9E9] text-[#D4D4D4]"
              : added
                ? "mm-cta"
                : "mm-ghost"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </article>
  );
}

/* ── TEMPLATE ────────────────────────────────────────────────────── */
export function MinimalPremiumTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const heroProduct = heroSlide?.product ?? data.featured[0] ?? data.exclusive[0] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["minimal-premium"];
  const totalSold = data.bestsellers.reduce((n, p) => n + p.soldCount, 0);

  return (
    <div data-template-chrome="1" data-tpl="minimal-premium" className="isolate w-full bg-white text-[#111111]">
      <style>{MINIMAL_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      <div aria-hidden className="h-6 bg-gradient-to-b from-background to-transparent" />

      <main className="mx-auto w-full max-w-6xl">
        {/* ═══ announcement — hairline strip, emerald dot ═══ */}
        {store.announcementActive && store.announcement && (
          <section aria-label="اطلاعیهٔ فروشگاه" className="border-b border-[#E9E9E9] px-4">
            <p className="mx-auto flex min-h-11 max-w-4xl items-center justify-center gap-3 py-2 text-center text-[12px] text-[#737373]">
              <span className="mm-dot shrink-0" aria-hidden />
              {store.announcementLink ? (
                <Link href={store.announcementLink} className="transition-colors hover:text-[#10B981]">
                  {store.announcement}
                </Link>
              ) : (
                <span>{store.announcement}</span>
              )}
            </p>
          </section>
        )}

        {/* ═══ HERO — huge whitespace, one emerald line, glass panel ═══ */}
        <section className="px-4 py-16 md:py-24" aria-labelledby="mp-hero">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            {/* copy */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="flex items-center gap-2.5 text-[10.5px] font-black uppercase tracking-[0.32em] text-[#737373]">
                <span className="mm-dot" aria-hidden />
                فروشگاه رسمی
              </p>
              <h1 id="mp-hero" className="mt-6 text-5xl font-black leading-[1.04] tracking-tighter md:text-7xl">
                {store.storeName}
              </h1>
              <div aria-hidden className="mt-8 h-0.5 w-16 bg-[#10B981]" />
              <p className="mt-8 max-w-md text-[13.5px] leading-8 text-[#737373]">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : "کمتر، اما بهتر. هر کالای این فروشگاه با معیارهای سخت‌گیرانهٔ ما انتخاب شده است — بدون حاشیه، فقط کیفیت."}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/products"
                  className="mm-cta flex h-12 items-center gap-2 px-10 text-xs font-black tracking-[0.14em]"
                >
                  مشاهدهٔ محصولات
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/products?discount=1" className="mm-ghost flex h-12 items-center px-8 text-xs font-black tracking-[0.14em]">
                  تخفیف‌دارها
                </Link>
              </div>
              {/* minimal stats — tabular-nums */}
              <dl className="mm-num mt-12 flex items-center gap-8 border-t border-[#E9E9E9] pt-6">
                {[
                  { v: counts.products, l: "محصول" },
                  { v: counts.brands, l: "برند" },
                  { v: totalSold, l: "فروش" },
                ].map((s) => (
                  <div key={s.l}>
                    <dd className="text-xl font-black md:text-2xl">{toFaDigits(s.v.toLocaleString("fa-IR"))}</dd>
                    <dt className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">{s.l}</dt>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* glass panel over emerald glow orbs */}
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="relative mx-auto w-full max-w-[520px]"
            >
              <span aria-hidden className="absolute -top-12 -end-8 h-48 w-48 rounded-full bg-[#10B981]/12 blur-3xl" />
              <span aria-hidden className="absolute -bottom-14 -start-10 h-56 w-56 rounded-full bg-[#34D399]/10 blur-3xl" />
              <div className="mm-glass relative h-[420px] p-6 sm:h-[560px]">
                {heroProduct?.mainImage ? (
                  <Image
                    src={heroProduct.mainImage}
                    alt={heroProduct.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 520px"
                    className="object-contain p-8"
                  />
                ) : heroSlide ? (
                  <SlideArt
                    slide={heroSlide}
                    alt={heroSlide.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 520px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center text-[#D4D4D4]">
                    <Package className="h-20 w-20" aria-hidden />
                  </span>
                )}
                {heroProduct && (
                  <div className="mm-glass absolute bottom-6 start-6 end-6 flex items-center justify-between gap-4 p-4">
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-black">{heroProduct.name}</span>
                      <span className="mm-num mt-0.5 block text-[13px] font-black text-[#10B981]">
                        {formatPrice(heroProduct.discountPrice ?? heroProduct.price)}
                        <span className="text-[9px] font-normal text-[#737373]"> تومان</span>
                      </span>
                    </span>
                    <Link
                      href={`/products/${heroProduct.slug}`}
                      className="mm-ghost flex h-11 shrink-0 items-center px-5 text-[11px] font-black"
                    >
                      مشاهده
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="mm-story-wrap px-4 py-12" aria-label={`استوری‌های فروشگاه (${toFaDigits(counts.stories)} استوری)`}>
            <SectionLabel code={`۰۱ / ${toFaDigits(counts.stories)}`} title="استوری‌ها" />
            <StoriesRow stories={stories} />
          </section>
        )}

        {/* ═══ CATEGORIES — numbered hairline rows ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-cats">
            <SectionLabel code="۰۲" title="دسته‌بندی‌ها" href="/products" />
            <ul className="grid grid-cols-1 md:grid-cols-2">
              {data.categories.map((c, i) => (
                <li key={c.id} className="border-b border-[#E9E9E9]">
                  <Link
                    href={`/products?category=${c.slug}`}
                    className="group flex min-h-14 items-center gap-4 py-4 transition-colors hover:bg-[#FAFAFA]"
                  >
                    <span className="mm-num w-8 shrink-0 text-[11px] font-black text-[#A3A3A3]">
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold transition-colors group-hover:text-[#10B981]">
                      {c.name}
                    </span>
                    <span className="mm-num shrink-0 text-[11px] text-[#A3A3A3]">
                      {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                    </span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-[#D4D4D4] transition-all duration-300 group-hover:-translate-x-1 group-hover:text-[#10B981]" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ═══ FEATURED — glass picks panel ═══ */}
        {data.featured.length > 0 && (
          <section className="relative overflow-hidden px-4 py-12" aria-labelledby="mp-featured">
            {/* ambient emerald orbs under the glass */}
            <span aria-hidden className="absolute start-1/4 top-10 h-40 w-40 rounded-full bg-[#10B981]/10 blur-3xl" />
            <span aria-hidden className="absolute end-10 bottom-10 h-56 w-56 rounded-full bg-[#34D399]/12 blur-3xl" />
            <div className="relative">
              <SectionLabel code="۰۳" title="برگزیده‌ها" href="/products?sort=rating" />
              <Reveal>
                <div className="mm-glass grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
                  {data.featured.slice(0, 3).map((p) => (
                    <GlassPick key={p.id} product={p} />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ DISCOUNTED — clean grid, surgical emerald marks ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-deals">
            <SectionLabel code="۰۴" title="تخفیف‌دارها" href="/products?discount=1" />
            <Reveal>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <MonoCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — near-black premium band ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-exclusive">
            <div className="mm-dark relative overflow-hidden rounded-[2rem] p-6 md:p-10">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.3em] text-[#9C9C9C]">
                    <span className="h-4 w-1 bg-[#10B981]" aria-hidden />
                    انحصاری
                  </p>
                  <h2 id="mp-exclusive" className="mt-2 text-2xl font-black tracking-tight text-white md:text-[1.7rem]">
                    انتخاب‌های کمیاب
                  </h2>
                </div>
                <span aria-hidden className="hidden h-0.5 w-24 bg-[#10B981] sm:block" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.exclusive.slice(0, 3).map((p) => (
                  <article key={p.id} className="mm-dark-card group flex flex-col p-4">
                    <Link
                      href={`/products/${p.slug}`}
                      aria-label={p.name}
                      className="relative mb-4 block aspect-square overflow-hidden bg-black/30"
                    >
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                          className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-[#3A3A3A]">
                          <Package className="h-12 w-12" aria-hidden />
                        </span>
                      )}
                    </Link>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9C9C9C]">{p.brand.name}</p>
                    <Link href={`/products/${p.slug}`} className="mt-1.5 text-[13px] font-bold leading-6 text-white transition-colors hover:text-[#34D399]">
                      {p.name}
                    </Link>
                    <p className="mm-num mt-2 text-[13.5px] font-black text-[#34D399]">
                      {formatPrice(p.effectivePrice)}
                      <span className="text-[9px] font-normal text-[#9C9C9C]"> تومان</span>
                    </p>
                    <DarkAdd product={p} />
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ BESTSELLERS — numbered ledger, max-h scroll ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-best">
            <SectionLabel code="۰۵" title="پرفروش‌ها" href="/products?sort=bestselling" />
            <ol className="mm-scroll mx-auto max-h-96 max-w-3xl overflow-y-auto pe-1">
              {data.bestsellers.slice(0, 8).map((p, i) => (
                <BestRow key={p.id} product={p} rank={i + 1} />
              ))}
            </ol>
          </section>
        )}

        {/* ═══ NEWEST — quiet grid ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-newest">
            <SectionLabel code="۰۶" title="تازه‌ها" href="/products?sort=newest" />
            <div className="mm-rail -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {data.newest.slice(0, 8).map((p) => (
                <MonoCard key={p.id} product={p} className="w-[220px] shrink-0 snap-start sm:w-[250px] lg:w-auto" />
              ))}
            </div>
          </section>
        )}

        {/* ═══ SHOWCASES — two hairline banners ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-12" aria-label="ویترین‌های ویژه">
            <SectionLabel code="۰۷" title="ویترین‌ها" />
            <Reveal>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <article key={s.id} className="group border border-[#E9E9E9] transition-colors hover:border-[#111111]">
                    <Link
                      href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className="relative block aspect-[16/10] overflow-hidden bg-[#FAFAFA]"
                    >
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        sizes="(max-width: 1024px) 92vw, 46vw"
                        className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </Link>
                    <div className="flex flex-col px-5 py-5">
                      <h3 className="text-[15px] font-black tracking-tight">{s.title}</h3>
                      {s.subtitle && <p className="mt-1.5 text-[12px] leading-7 text-[#737373]">{s.subtitle}</p>}
                      <div className="mt-4 flex items-center justify-between gap-4">
                        {s.product ? (
                          <p className="mm-num text-[13px] font-black">
                            {formatPrice(s.product.discountPrice ?? s.product.price)}
                            <span className="text-[9px] font-normal text-[#A3A3A3]"> تومان</span>
                          </p>
                        ) : (
                          <span />
                        )}
                        <Link
                          href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                          className="mm-ghost flex h-11 shrink-0 items-center gap-1.5 px-6 text-[11px] font-black"
                        >
                          مشاهده
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

        {/* ═══ FAQ — hairline accordion ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="mp-faq">
            <SectionLabel code="۰۸" title="پرسش‌های متداول" />
            <div className="mx-auto max-w-3xl">
              {data.faq.map((f, i) => (
                <details key={i} className="mm-faq border-b border-[#E9E9E9] last:border-b-0">
                  <summary className="flex min-h-14 items-center gap-4 py-5">
                    <span className="mm-num w-8 shrink-0 text-[11px] font-black text-[#A3A3A3]">
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                    <span className="flex-1 text-[13px] font-bold leading-6">{f.h}</span>
                    <Plus className="mm-faq-icon h-4 w-4 shrink-0 text-[#737373]" aria-hidden />
                  </summary>
                  <p className="pb-6 pe-6 ps-12 text-[12.5px] leading-8 text-[#737373]">{f.p}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ═══ BRANDS — single hairline row ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-6 border-t border-[#E9E9E9] px-4 py-12" aria-label="برندهای همکار">
            <p className="mb-6 text-center text-[10.5px] font-black uppercase tracking-[0.3em] text-[#A3A3A3]">برندها</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {data.brands.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/products?brand=${b.slug}`}
                    className="text-[12.5px] font-bold tracking-[0.12em] text-[#737373] transition-colors hover:text-[#10B981]"
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="px-4 py-24">
            <div className="mx-auto max-w-md border border-[#E9E9E9] p-12 text-center">
              <div aria-hidden className="mx-auto mb-6 h-0.5 w-12 bg-[#10B981]" />
              <h2 className="text-lg font-black tracking-tight">فروشگاه در حال آرایش است</h2>
              <p className="mt-2 text-[12.5px] leading-8 text-[#737373]">کالاهای برگزیده به‌زودی با سکوتِ همیشگی اضافه می‌شوند…</p>
            </div>
          </section>
        )}
      </main>

      <div aria-hidden className="h-6 bg-gradient-to-t from-background to-transparent" />
      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── bestseller row — tabular rank, emerald top-3 ═══ ═══ ═══ ═══ ─── */
function BestRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useMonoAdd();
  return (
    <li className="group flex min-h-14 items-center gap-4 border-b border-[#E9E9E9] py-4 transition-colors hover:bg-[#FAFAFA]">
      <span className={cn("mm-num w-8 shrink-0 text-[13px] font-black", rank <= 3 ? "text-[#10B981]" : "text-[#A3A3A3]")}>
        {toFaDigits(String(rank).padStart(2, "0"))}
      </span>
      <Link href={`/products/${product.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-bold transition-colors group-hover:text-[#10B981]">
        {product.name}
      </Link>
      {product.soldCount > 0 && (
        <span className="mm-num hidden shrink-0 text-[10.5px] text-[#A3A3A3] sm:block">
          {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
        </span>
      )}
      <span className="mm-num shrink-0 text-[12.5px] font-black">{formatPrice(product.effectivePrice)}</span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد خرید`}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center border transition-all",
          !product.inStock
            ? "cursor-not-allowed border-[#E9E9E9] text-[#D4D4D4]"
            : added
              ? "mm-cta"
              : "mm-ghost"
        )}
      >
        {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      </button>
    </li>
  );
}

/* ── dark band add button ────────────────────────────────────────── */
function DarkAdd({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useMonoAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد خرید`}
      className={cn(
        "mt-4 flex h-11 w-full items-center justify-center gap-2 border text-[11px] font-black transition-all",
        !product.inStock
          ? "cursor-not-allowed border-white/10 text-[#3A3A3A]"
          : added
            ? "border-transparent bg-[#10B981] text-white"
            : "border-white/25 text-white hover:border-[#10B981] hover:text-[#34D399]"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      {product.inStock ? (added ? "افزوده شد" : "افزودن") : "ناموجود"}
    </button>
  );
}

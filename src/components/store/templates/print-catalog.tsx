"use client";

/**
 * TEMPLATE · print-catalog — «Holo Catalog» (v25 futurized rewrite)
 * ---------------------------------------------------------------------
 * The print soul kept alive — paper #F7F5F0 sheets with double-rule
 * frames, dotted leader lines, code-numbered product rows and a subtle
 * grid-paper background — but every official seal is now a HOLOGRAPHIC
 * FOIL accent: animated rainbow gradients (conic-gradient + hue-rotate
 * keyframes) on badges and framing strips, sheets floating on layered
 * box-shadows. A formal catalog printed in the year 2100.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen, Hash, Check, Package, ShoppingCart, ChevronLeft, Plus, Star,
  Sparkle, FileText, Tag, Layers,
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

/* ONE scoped style block — every rule prefixed hc- (holo catalog) */
const HOLO_CSS = `
[data-tpl="print-catalog"]{
  --hc-paper:#F7F5F0;--hc-ink:#201E1B;--hc-mute:#6B675F;--hc-line:#DDD8CC;
  background:#F7F5F0;color:#201E1B;
}
[data-tpl="print-catalog"] ::selection{background:rgba(124,92,255,.25);color:#201E1B}
[data-tpl="print-catalog"] a:focus-visible,[data-tpl="print-catalog"] button:focus-visible,[data-tpl="print-catalog"] summary:focus-visible{outline:2px solid #7C5CFF;outline-offset:3px}

/* subtle grid paper */
[data-tpl="print-catalog"] .hc-gridbg{
  background-image:
    linear-gradient(rgba(32,30,27,.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(32,30,27,.045) 1px,transparent 1px);
  background-size:26px 26px;
}

/* paper sheet — double-rule frame + floating layered shadows */
[data-tpl="print-catalog"] .hc-sheet{
  background:#FFFFFF;
  border:1.5px solid #201E1B;
  outline:1px solid rgba(32,30,27,.4);
  outline-offset:4px;
  box-shadow:9px 11px 0 -3px rgba(32,30,27,.1),24px 30px 46px -22px rgba(32,30,27,.28);
  transition:box-shadow .4s,transform .4s;
}
[data-tpl="print-catalog"] .hc-sheet-hover:hover{
  transform:translateY(-4px);
  box-shadow:12px 15px 0 -3px rgba(32,30,27,.12),30px 38px 54px -22px rgba(32,30,27,.32);
}

/* holographic foil — animated rainbow (conic + hue-rotate) */
[data-tpl="print-catalog"] .hc-holo{
  background:conic-gradient(from 210deg,#FF5E78,#FFB627,#3DDC97,#18C5D6,#7C5CFF,#FF5E78);
  animation:hc-hue 9s linear infinite;
}
@keyframes hc-hue{to{filter:hue-rotate(360deg)}}

/* holo framing strip (thin rule) */
[data-tpl="print-catalog"] .hc-holo-rule{height:4px;background:conic-gradient(from 90deg,#FF5E78,#FFB627,#3DDC97,#18C5D6,#7C5CFF,#FF5E78);animation:hc-hue 9s linear infinite}

/* holo border frame — 2px padding trick */
[data-tpl="print-catalog"] .hc-holo-frame{padding:2px;background:conic-gradient(from 0deg,#FF5E78,#FFB627,#3DDC97,#18C5D6,#7C5CFF,#FF5E78);animation:hc-hue 10s linear infinite}
[data-tpl="print-catalog"] .hc-holo-frame>*{background:#FFFFFF}

/* holo badge — foil seal */
[data-tpl="print-catalog"] .hc-seal{
  background:conic-gradient(from 210deg,#FF5E78,#FFB627,#3DDC97,#18C5D6,#7C5CFF,#FF5E78);
  animation:hc-hue 9s linear infinite;color:#FFFFFF;
  text-shadow:0 1px 3px rgba(32,30,27,.45);
  box-shadow:0 6px 16px -6px rgba(124,92,255,.55);
}

/* dotted leader line */
[data-tpl="print-catalog"] .hc-leader{flex:1 1 auto;min-width:1.5rem;border-bottom:2px dotted rgba(32,30,27,.38);transform:translateY(-5px)}

/* code numbers */
[data-tpl="print-catalog"] .hc-code{font-variant-numeric:tabular-nums;letter-spacing:.16em;font-weight:700}

/* floating sheets */
[data-tpl="print-catalog"] .hc-float{animation:hc-float 6.5s ease-in-out infinite}
[data-tpl="print-catalog"] .hc-float-2{animation:hc-float 7.5s ease-in-out 1.2s infinite}
@keyframes hc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}

/* rails & scroll */
[data-tpl="print-catalog"] .hc-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="print-catalog"] .hc-rail::-webkit-scrollbar{display:none}
[data-tpl="print-catalog"] .hc-scroll{scrollbar-width:thin;scrollbar-color:rgba(124,92,255,.4) transparent}
[data-tpl="print-catalog"] .hc-scroll::-webkit-scrollbar{width:7px}
[data-tpl="print-catalog"] .hc-scroll::-webkit-scrollbar-thumb{background:linear-gradient(#18C5D6,#7C5CFF);border-radius:99px}
[data-tpl="print-catalog"] .hc-scroll::-webkit-scrollbar-track{background:rgba(32,30,27,.06)}

/* token blend for the shared StoriesRow on paper */
[data-tpl="print-catalog"] .hc-story-wrap{
  --background:#F7F5F0;--foreground:#201E1B;--card:#FFFFFF;--muted:#EFECE4;
  --muted-foreground:#6B675F;--primary:#6D5AE0;--border:#DDD8CC;
}

/* native details FAQ */
[data-tpl="print-catalog"] details.hc-faq summary{list-style:none;cursor:pointer}
[data-tpl="print-catalog"] details.hc-faq summary::-webkit-details-marker{display:none}
[data-tpl="print-catalog"] details.hc-faq .hc-faq-icon{transition:transform .35s}
[data-tpl="print-catalog"] details.hc-faq[open] .hc-faq-icon{transform:rotate(45deg)}

/* ink button */
[data-tpl="print-catalog"] .hc-btn{background:#201E1B;color:#FFFFFF;transition:transform .25s,box-shadow .25s}
[data-tpl="print-catalog"] .hc-btn:hover{transform:translateY(-2px);box-shadow:0 10px 22px -8px rgba(32,30,27,.5)}

/* marquee-less brand credit line */
[data-tpl="print-catalog"] .hc-brand-row{white-space:nowrap;overflow:hidden}

@media (prefers-reduced-motion:reduce){
  [data-tpl="print-catalog"] .hc-holo,[data-tpl="print-catalog"] .hc-holo-rule,
  [data-tpl="print-catalog"] .hc-holo-frame,[data-tpl="print-catalog"] .hc-seal,
  [data-tpl="print-catalog"] .hc-float,[data-tpl="print-catalog"] .hc-float-2{animation:none!important}
  [data-tpl="print-catalog"] .hc-sheet-hover,[data-tpl="print-catalog"] .hc-btn{transition:none!important}
}

/* ═══ v26fix · DARK SKIN — additive only, light rendering untouched ═══
   Palette: bg #1B1A17 / ink #EDEAE2 (aged-paper night print). Sheets
   become elevated warm-dark paper with light double-rule frames; the
   holographic foil seals/strips glow even stronger on dark; ink-fill
   buttons invert to paper-fill. CSS escapes are doubled (JS literal). */
html.dark [data-tpl="print-catalog"]{
  --hc-paper:#1B1A17;--hc-ink:#EDEAE2;--hc-mute:#A8A296;--hc-line:#34312B;
  background:#1B1A17;color:#EDEAE2;
}
html.dark [data-tpl="print-catalog"] ::selection{background:rgba(124,92,255,.3);color:#EDEAE2}

/* raw utility overrides — paper flips, holo foil + overlays kept */
html.dark [data-tpl="print-catalog"] .bg-\\[\\#F7F5F0\\]{background-color:#1B1A17}
html.dark [data-tpl="print-catalog"] .hover\\:bg-\\[\\#F7F5F0\\]:hover{background-color:#1B1A17}
html.dark [data-tpl="print-catalog"] .text-\\[\\#201E1B\\]{color:#EDEAE2}
html.dark [data-tpl="print-catalog"] .fill-\\[\\#201E1B\\]{fill:#EDEAE2}
html.dark [data-tpl="print-catalog"] .text-\\[\\#6B675F\\]{color:#A8A296}
html.dark [data-tpl="print-catalog"] .text-\\[\\#B9B4A8\\]{color:#797466}
html.dark [data-tpl="print-catalog"] .text-\\[\\#201E1B\\]\\/70{color:rgba(237,234,226,.7)}
html.dark [data-tpl="print-catalog"] .bg-\\[\\#201E1B\\]\\/30{background-color:rgba(237,234,226,.3)}
html.dark [data-tpl="print-catalog"] .border-\\[\\#201E1B\\]\\/50{border-color:rgba(237,234,226,.5)}
html.dark [data-tpl="print-catalog"] .border-\\[\\#DDD8CC\\]{border-color:#34312B}
/* ink frames flip to paper-white rules (the print signature) */
html.dark [data-tpl="print-catalog"] .border-\\[\\#201E1B\\]{border-color:#EDEAE2}
/* sheet surfaces (buttons, chips) sit on elevated dark paper */
html.dark [data-tpl="print-catalog"] .bg-\\[\\#FFFFFF\\]{background-color:#232220}
/* ink-fill hover inverts to paper-fill */
html.dark [data-tpl="print-catalog"] .hover\\:bg-\\[\\#201E1B\\]:hover{background-color:#EDEAE2}
html.dark [data-tpl="print-catalog"] .hover\\:text-\\[\\#FFFFFF\\]:hover{color:#1B1A17}
/* violet accents lighten one step for the dark paper */
html.dark [data-tpl="print-catalog"] .hover\\:text-\\[\\#6D5AE0\\]:hover{color:#9D8BFF}
/* header/footer fade band follows the dark canvas */
html.dark [data-tpl="print-catalog"] .from-background{--tw-gradient-from:#1B1A17}

/* helper classes — dark variants */
html.dark [data-tpl="print-catalog"] .hc-gridbg{
  background-image:
    linear-gradient(rgba(237,234,226,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(237,234,226,.05) 1px,transparent 1px);
}
html.dark [data-tpl="print-catalog"] .hc-sheet{
  background:#232220;
  border-color:#EDEAE2;
  outline-color:rgba(237,234,226,.3);
  box-shadow:9px 11px 0 -3px rgba(0,0,0,.4),24px 30px 46px -22px rgba(0,0,0,.5);
}
html.dark [data-tpl="print-catalog"] .hc-sheet-hover:hover{
  box-shadow:12px 15px 0 -3px rgba(0,0,0,.45),30px 38px 54px -22px rgba(0,0,0,.55);
}
html.dark [data-tpl="print-catalog"] .hc-holo-frame>*{background:#232220}
html.dark [data-tpl="print-catalog"] .hc-leader{border-bottom-color:rgba(237,234,226,.35)}
html.dark [data-tpl="print-catalog"] .hc-btn{background:#EDEAE2;color:#1B1A17}
html.dark [data-tpl="print-catalog"] .hc-btn:hover{box-shadow:0 10px 22px -8px rgba(0,0,0,.55)}
html.dark [data-tpl="print-catalog"] .hc-scroll::-webkit-scrollbar-track{background:rgba(237,234,226,.06)}
/* token blend for the shared StoriesRow on the dark paper */
html.dark [data-tpl="print-catalog"] .hc-story-wrap{
  --background:#1B1A17;--foreground:#EDEAE2;--card:#232220;--muted:#262420;
  --muted-foreground:#A8A296;--primary:#6D5AE0;--border:#34312B;
}
`;

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useHoloAdd() {
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

/* ── catalog section header — code + double rule ─────────────────── */
function CatalogHeader({
  icon: Icon, code, title, href,
}: { icon: React.ElementType; code: string; title: string; href?: string }) {
  return (
    <div className="mb-9">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-[#201E1B] bg-[#FFFFFF]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="hc-code text-[10.5px] uppercase text-[#6B675F]">{code}</p>
        <span aria-hidden className="hc-leader" />
        {href && (
          <Link
            href={href}
            className="flex h-11 shrink-0 items-center gap-1.5 border-2 border-[#201E1B] bg-[#FFFFFF] px-5 text-[11.5px] font-black transition-all hover:bg-[#201E1B] hover:text-[#FFFFFF]"
          >
            فهرست کامل
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <h2 className="mt-3 text-2xl font-black tracking-tight md:text-[1.7rem]">{title}</h2>
    </div>
  );
}

/* ── stars ───────────────────────────────────────────────────────── */
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[#6B675F]">
      <Star className="h-3.5 w-3.5 fill-[#201E1B] text-[#201E1B]" aria-hidden />
      <span className="font-black text-[#201E1B]">{rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}</span>
      {count > 0 && <span className="tabular-nums">({toFaDigits(count.toLocaleString("fa-IR"))})</span>}
    </span>
  );
}

/* ── catalog product card — code-numbered sheet entry ────────────── */
function CatalogCard({
  product, code, variant = "plain",
}: { product: TemplateProduct; code: string; variant?: "plain" | "deal" | "special" }) {
  const { addToCart, added } = useHoloAdd();
  return (
    <article className={cn("hc-sheet hc-sheet-hover group relative flex flex-col", variant === "deal" && "outline-[#E8590C]/50", !product.inStock && "grayscale-[0.45]")}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden border-b border-[#DDD8CC] bg-[#F7F5F0]"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#B9B4A8]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {variant === "deal" && product.discountPercent > 0 && (
          <span className="hc-seal absolute start-3 top-3 px-2.5 py-1 text-[10px] font-black tabular-nums">
            {toFaDigits(product.discountPercent)}٪ تخفیف
          </span>
        )}
        {variant === "special" && (
          <span className="hc-seal absolute start-3 top-3 px-2.5 py-1 text-[9.5px] font-black tracking-wider">
            برگزیدهٔ تحریریه
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-[#201E1B]/85 py-1.5 text-center text-[10px] font-black tracking-[0.2em] text-[#F7F5F0]">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="hc-code text-[#6B675F]">{code}</span>
          <span aria-hidden className="hc-leader" />
          <span className="shrink-0 font-bold text-[#6B675F]">{product.brand.name}</span>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="mt-2 min-h-12 text-[13px] font-black leading-6 transition-colors hover:text-[#6D5AE0]"
        >
          {product.name}
        </Link>
        <div className="mt-2">
          <Stars rating={product.rating} count={product.reviewCount} />
        </div>
        <div className="mt-3 flex items-end gap-2">
          {product.discountPercent > 0 && (
            <span className="text-[11px] text-[#6B675F] price-old tabular-nums">{formatPrice(product.price)}</span>
          )}
          <span className="text-[14px] font-black tabular-nums text-[#201E1B]">
            {formatPrice(product.effectivePrice)}
            <span className="text-[9.5px] font-normal text-[#6B675F]"> تومان</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 border-2 border-[#201E1B] text-[11px] font-black transition-all",
            !product.inStock
              ? "cursor-not-allowed text-[#B9B4A8]"
              : added
                ? "hc-btn"
                : "bg-[#FFFFFF] hover:bg-[#201E1B] hover:text-[#FFFFFF]"
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> افزوده شد
            </>
          ) : product.inStock ? (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden /> ثبت در سفارش
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
export function PrintCatalogTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const sideSlides = data.slides.slice(1, 3);
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["print-catalog"];

  const coverMeta = [
    { l: "شرح کالا", v: `${toFaDigits(counts.products.toLocaleString("fa-IR"))} قلم` },
    { l: "دسته‌بندی", v: `${toFaDigits(counts.categories.toLocaleString("fa-IR"))} بخش` },
    { l: "برندها", v: `${toFaDigits(counts.brands.toLocaleString("fa-IR"))} نام` },
  ];

  return (
    <div data-template-chrome="1" data-tpl="print-catalog" className="isolate w-full bg-[#F7F5F0] text-[#201E1B]">
      <style>{HOLO_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* blend the light chrome into the paper */}
      <div aria-hidden className="h-8 bg-gradient-to-b from-background to-transparent" />

      <main className="hc-gridbg mx-auto w-full max-w-6xl">
        {/* ═══ MASTHEAD — the catalog cover strip ═══ */}
        <section className="px-4 py-10" aria-labelledby="pc-mast">
          <Reveal>
            <div className="hc-sheet relative p-6 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="hc-seal inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10.5px] font-black tracking-[0.14em]">
                  <Sparkle className="h-3.5 w-3.5" aria-hidden />
                  نسخهٔ هولوگرافیک
                </span>
                <p className="hc-code text-[10.5px] uppercase text-[#6B675F]">
                  CAT · {store.storeNameEn} · {toFaDigits(counts.products.toLocaleString("fa-IR"))} ITEMS
                </p>
              </div>
              <motion.h1
                id="pc-mast"
                initial={reduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 text-4xl font-black leading-[1.15] tracking-tight md:text-6xl"
              >
                {store.storeName}
              </motion.h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-8 text-[#6B675F]">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : "کاتالوگ رسمی کالاهای دیجیتال؛ هر ورق با کد کالا، قیمت و مُهر هولوگرافیک رسمی عرضه می‌شود."}
              </p>
              {/* spec table with dotted leaders */}
              <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-3">
                {coverMeta.map((m) => (
                  <div key={m.l} className="flex items-center gap-2 text-[12px]">
                    <dt className="shrink-0 text-[#6B675F]">{m.l}</dt>
                    <span aria-hidden className="hc-leader" />
                    <dd className="shrink-0 font-black tabular-nums">{m.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="hc-holo-rule mt-8" aria-hidden />
            </div>
          </Reveal>
        </section>

        {/* ═══ HERO — the cover sheet + sample pages ═══ */}
        {heroSlide && (
          <section className="px-4 py-8" aria-labelledby="pc-hero">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* main cover sheet in a holo frame */}
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                  className="lg:col-span-2"
                >
                  <div className="hc-holo-frame">
                    <div className="hc-sheet relative">
                      <Link
                        href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
                        aria-label={heroSlide.title}
                        className="group relative block h-[420px] overflow-hidden bg-[#F7F5F0] sm:h-[560px]"
                      >
                        <SlideArt
                          slide={heroSlide}
                          alt={heroSlide.title}
                          fill
                          priority
                          sizes="(max-width: 1024px) 92vw, 62vw"
                          className="object-cover transition-transform duration-[1600ms] group-hover:scale-[1.05]"
                        />
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 border-t border-[#DDD8CC] px-5 py-4">
                        <h2 id="pc-hero" className="min-w-0 flex-1 truncate text-lg font-black tracking-tight">
                          {heroSlide.title}
                        </h2>
                        <span aria-hidden className="hidden hc-leader sm:block" />
                        {heroSlide.product && (
                          <span className="shrink-0 text-[13px] font-black tabular-nums">
                            {formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)}
                            <span className="text-[9.5px] font-normal text-[#6B675F]"> تومان</span>
                          </span>
                        )}
                        <Link
                          href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
                          className="hc-btn flex h-11 shrink-0 items-center px-6 text-[11.5px] font-black"
                        >
                          {heroSlide.ctaText ?? "مشاهدهٔ ورق"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* sample pages — secondary slides */}
                <div className="grid grid-rows-2 gap-6">
                  {sideSlides.map((s, i) => (
                    <Link
                      key={s.id}
                      href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className={cn("hc-sheet hc-sheet-hover group relative block overflow-hidden", i === 0 ? "hidden lg:block" : "hidden lg:block")}
                    >
                      <span className="relative block h-[190px] overflow-hidden bg-[#F7F5F0]">
                        <SlideArt
                          slide={s}
                          alt={s.title}
                          fill
                          sizes="31vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      </span>
                      <span className="flex items-center gap-2 border-t border-[#DDD8CC] px-4 py-3">
                        <span className="hc-code text-[9.5px] text-[#6B675F]">SAMPLE-{toFaDigits(i + 2)}</span>
                        <span aria-hidden className="hc-leader" />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-black">{s.title}</span>
                      </span>
                    </Link>
                  ))}
                  {sideSlides.length === 0 && (
                    <div className="hidden hc-sheet grid place-items-center p-8 text-center lg:grid">
                      <p className="text-[12px] leading-7 text-[#6B675F]">
                        <BookOpen className="mx-auto mb-3 h-8 w-8 text-[#B9B4A8]" aria-hidden />
                        صفحات نمونه به‌زودی به این کاتالوگ افزوده می‌شود.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ STORIES — the story supplement strip ═══ */}
        {stories.length > 0 && (
          <section className="hc-story-wrap px-4 py-12" aria-label={`ضمیمهٔ استوری (${toFaDigits(counts.stories)} استوری)`}>
            <Reveal>
              <CatalogHeader icon={BookOpen} code="SEC-00 · SUPPLEMENT" title={`ضمیمهٔ استوری · ${toFaDigits(counts.stories)} قسمت`} />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES — table of contents with dotted leaders ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-toc">
            <Reveal>
              <CatalogHeader icon={FileText} code="SEC-01 · INDEX" title="فهرست مطالب" href="/products" />
              <div className="hc-sheet p-5 md:p-8">
                <ul className="grid grid-cols-1 md:grid-cols-2">
                  {data.categories.map((c) => (
                    <li key={c.id} className="border-b border-dotted border-[#DDD8CC] md:odd:border-e md:[&:nth-last-child(-n+2)]:border-b-0">
                      <Link
                        href={`/products?category=${c.slug}`}
                        className="group flex min-h-14 items-center gap-3 px-2 py-3.5 transition-colors hover:bg-[#F7F5F0]"
                      >
                        <span className="grid h-2.5 w-2.5 shrink-0 rotate-45 place-items-center bg-[#7C5CFF]/70 transition-colors group-hover:bg-[#7C5CFF]" aria-hidden />
                        <span className="shrink-0 text-[13px] font-black">{c.name}</span>
                        <span aria-hidden className="hc-leader" />
                        <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-[#6B675F]">
                          {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — editorial picks with code numbers ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-featured">
            <Reveal>
              <CatalogHeader icon={Star} code="SEC-02 · EDITOR'S LIST" title="برگزیدهٔ تحریریه" href="/products?sort=rating" />
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured.slice(0, 6).map((p, i) => (
                  <CatalogCard key={p.id} product={p} code={`F-${toFaDigits(String(i + 1).padStart(2, "0"))}`} variant="special" />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — the sale page ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-deals">
            <Reveal>
              <CatalogHeader icon={Tag} code="SEC-03 · SALE LIST" title="صفحهٔ تخفیف‌ها" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p, i) => (
                  <CatalogCard key={p.id} product={p} code={`D-${toFaDigits(String(i + 1).padStart(2, "0"))}`} variant="deal" />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — holo-framed vault ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-exclusive">
            <Reveal>
              <CatalogHeader icon={Sparkle} code="SEC-04 · VAULT" title="کالاهای انحصاری" />
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {data.exclusive.slice(0, 2).map((p, xi) => (
                  <article key={p.id} className="hc-holo-frame">
                    <div className="hc-sheet group relative grid grid-cols-1 sm:grid-cols-[180px_1fr]">
                      <Link
                        href={`/products/${p.slug}`}
                        aria-label={p.name}
                        className="relative block aspect-square border-b border-[#DDD8CC] bg-[#F7F5F0] sm:aspect-auto sm:h-full sm:min-h-[240px] sm:border-b-0 sm:border-e"
                      >
                        {p.mainImage ? (
                          <Image
                            src={p.mainImage}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 92vw, 180px"
                            className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.05]"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-[#B9B4A8]">
                            <Package className="h-12 w-12" aria-hidden />
                          </span>
                        )}
                      </Link>
                      <div className="flex flex-col justify-center p-6">
                        <div className="flex items-center gap-2">
                          <span className="hc-seal px-2.5 py-1 text-[9.5px] font-black tracking-wider">انحصاری</span>
                          <span className="hc-code text-[10px] text-[#6B675F]">X-{toFaDigits(xi + 1)}</span>
                        </div>
                        <Link href={`/products/${p.slug}`} className="mt-3 text-lg font-black leading-8 transition-colors hover:text-[#6D5AE0]">
                          {p.name}
                        </Link>
                        <div className="mt-2">
                          <Stars rating={p.rating} count={p.reviewCount} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-[#6B675F]">
                          <span>{p.brand.name}</span>
                          <span aria-hidden className="hc-leader" />
                          <span className="font-black tabular-nums text-[13px] text-[#201E1B]">
                            {formatPrice(p.effectivePrice)}
                            <span className="text-[9.5px] font-normal text-[#6B675F]"> تومان</span>
                          </span>
                        </div>
                        <VaultAdd product={p} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — index table with codes ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-best">
            <Reveal>
              <CatalogHeader icon={Hash} code="SEC-05 · TOP INDEX" title="نمایهٔ پرفروش‌ها" href="/products?sort=bestselling" />
              <ol className="hc-sheet hc-scroll mx-auto max-h-96 overflow-y-auto p-3 pe-2 sm:p-5">
                {data.bestsellers.slice(0, 8).map((p, i) => (
                  <IndexRow key={p.id} product={p} code={`BS-${toFaDigits(String(i + 1).padStart(2, "0"))}`} />
                ))}
              </ol>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST — fresh arrivals sheet grid ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-newest">
            <Reveal>
              <CatalogHeader icon={Layers} code="SEC-06 · NEW STOCK" title="تازه‌های انبار" href="/products?sort=newest" />
              <div className="hc-rail -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {data.newest.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="w-[230px] shrink-0 snap-start sm:w-[260px] lg:w-auto">
                    <CatalogCard product={p} code={`NW-${toFaDigits(String(i + 1).padStart(2, "0"))}`} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — floating sheets ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-14" aria-label="ویترین‌های ویژه">
            <Reveal>
              <CatalogHeader icon={BookOpen} code="SEC-07 · BROADSHEET" title="برگه‌های تبلیغاتی" />
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                {data.showcases.slice(0, 2).map((s, i) => (
                  <article key={s.id} className={cn(i === 0 ? "hc-float" : "hc-float-2")}>
                    <div className="hc-sheet hc-sheet-hover group relative">
                      <Link
                        href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                        aria-label={s.title}
                        className="relative block aspect-[16/10] overflow-hidden bg-[#F7F5F0]"
                      >
                        <Image
                          src={s.image}
                          alt={s.title}
                          fill
                          sizes="(max-width: 1024px) 92vw, 46vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      </Link>
                      <div className="border-t border-[#DDD8CC] px-5 py-5">
                        <div className="flex items-center gap-2">
                          <h3 className="min-w-0 flex-1 truncate text-[15.5px] font-black tracking-tight">{s.title}</h3>
                          {s.product && (
                            <span className="shrink-0 text-[12px] font-black tabular-nums">
                              {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                            </span>
                          )}
                        </div>
                        {s.subtitle && (
                          <div className="mt-2 flex items-start gap-2 text-[12px] leading-7 text-[#6B675F]">
                            <span aria-hidden className="mt-3 hc-leader" />
                            <p className="min-w-0 flex-1">{s.subtitle}</p>
                          </div>
                        )}
                        <Link
                          href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                          className="mt-4 inline-flex h-11 items-center border-2 border-[#201E1B] bg-[#FFFFFF] px-6 text-[11.5px] font-black transition-all hover:bg-[#201E1B] hover:text-[#FFFFFF]"
                        >
                          سفارش این برگه
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

        {/* ═══ FAQ — questionnaire sheet ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="pc-faq">
            <Reveal>
              <CatalogHeader icon={FileText} code="SEC-08 · Q&A" title="پرسش‌نامه" />
              <div className="hc-sheet mx-auto max-w-3xl p-5 md:p-8">
                {data.faq.map((f, i) => (
                  <details key={i} className="hc-faq border-b border-dotted border-[#DDD8CC] last:border-b-0">
                    <summary className="flex min-h-14 items-center gap-3 py-4">
                      <span className="hc-code grid h-8 w-8 shrink-0 place-items-center border border-[#201E1B]/50 text-[11px] text-[#201E1B]">
                        Q{toFaDigits(i + 1)}
                      </span>
                      <span className="flex-1 text-[13px] font-black leading-6">{f.h}</span>
                      <Plus className="hc-faq-icon h-5 w-5 shrink-0 text-[#201E1B]" aria-hidden />
                    </summary>
                    <p className="pb-5 pe-6 ps-11 text-[12.5px] leading-8 text-[#6B675F]">{f.p}</p>
                  </details>
                ))}
                <div className="hc-holo-rule mt-6" aria-hidden />
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — credit line ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-8 border-t border-[#DDD8CC] px-4 py-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#6B675F]">اعتبار و امضا</p>
              <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {data.brands.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-8">
                    {i > 0 && <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-[#201E1B]/30" />}
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="text-[13px] font-black tracking-[0.12em] text-[#201E1B]/70 transition-colors hover:text-[#6D5AE0]"
                    >
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
          <section className="px-4 py-24">
            <div className="hc-sheet relative mx-auto max-w-md p-10 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-[#B9B4A8]" aria-hidden />
              <h2 className="mt-4 text-lg font-black tracking-wide">کاتالوگ در حال چاپ است</h2>
              <p className="mt-2 text-[13px] leading-8 text-[#6B675F]">ورق‌های تازهٔ این نسخه به‌زودی حروف‌چینی و منتشر می‌شوند…</p>
              <div className="hc-holo-rule mt-8" aria-hidden />
            </div>
          </section>
        )}
      </main>

      {/* blend back to the light chrome footer */}
      <div aria-hidden className="h-8 bg-gradient-to-t from-background to-transparent" />
      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── index row — code + dotted leader + quick add ────────────────── */
function IndexRow({ product, code }: { product: TemplateProduct; code: string }) {
  const { addToCart, added } = useHoloAdd();
  return (
    <li className="border-b border-dotted border-[#DDD8CC] last:border-b-0">
      <div className="group flex min-h-14 items-center gap-3 px-2 py-3.5 transition-colors hover:bg-[#F7F5F0]">
        <span className="hc-code shrink-0 text-[10.5px] text-[#6B675F]">{code}</span>
        <Link href={`/products/${product.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-black transition-colors group-hover:text-[#6D5AE0]">
          {product.name}
        </Link>
        <span aria-hidden className="hc-leader hidden sm:block" />
        {product.soldCount > 0 && (
          <span className="hidden shrink-0 text-[10.5px] font-bold tabular-nums text-[#6B675F] sm:block">
            {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
          </span>
        )}
        <span className="shrink-0 text-[12.5px] font-black tabular-nums">{formatPrice(product.effectivePrice)}</span>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center border-2 border-[#201E1B] transition-all",
            !product.inStock
              ? "cursor-not-allowed text-[#B9B4A8]"
              : added
                ? "hc-btn"
                : "bg-[#FFFFFF] hover:bg-[#201E1B] hover:text-[#FFFFFF]"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </li>
  );
}

/* vault add button */
function VaultAdd({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useHoloAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد خرید`}
      className={cn(
        "mt-5 flex h-11 w-full items-center justify-center gap-2 border-2 border-[#201E1B] text-[11px] font-black transition-all",
        !product.inStock
          ? "cursor-not-allowed text-[#B9B4A8]"
          : added
            ? "hc-btn"
            : "bg-[#FFFFFF] hover:bg-[#201E1B] hover:text-[#FFFFFF]"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      {product.inStock ? (added ? "ثبت شد" : "ثبت در سفارش") : "اتمام موجودی"}
    </button>
  );
}

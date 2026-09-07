"use client";

/**
 * TEMPLATE · editorial-magazine — «Editorial Future» (v25 futurized rewrite)
 * ---------------------------------------------------------------------
 * Clean editorial soul — white/ivory canvas with dramatic BLACK display
 * typography (font-black, tight leading, drop-cap first letter), asym-
 * metric columns, hairline rules — futurized with cyan #06B6D4 underline-
 * marker animations that sweep in on scroll, glowing pull-quote bars,
 * thin tech grid lines behind the masthead and article cards with
 * hover-reveal image zoom. A magazine typeset for the next decade.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Newspaper, Quote, Check, Package, ShoppingCart, ChevronLeft, Star,
  TrendingUp, BookOpen, Percent, Sparkles,
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

/* ONE scoped style block — every rule prefixed ef- (editorial future) */
const EDITORIAL_CSS = `
[data-tpl="editorial-magazine"]{
  --ef-ink:#0A0A0A;--ef-mute:#6E6E6E;--ef-cyan:#06B6D4;--ef-ivory:#FAFAF7;--ef-line:#E9E9E4;
  background:#FFFFFF;color:#0A0A0A;
}
[data-tpl="editorial-magazine"] ::selection{background:rgba(6,182,212,.28);color:#0A0A0A}
[data-tpl="editorial-magazine"] a:focus-visible,[data-tpl="editorial-magazine"] button:focus-visible{outline:2px solid #06B6D4;outline-offset:3px}

/* thin tech grid lines behind the masthead */
[data-tpl="editorial-magazine"] .ef-grid{
  background-image:
    linear-gradient(rgba(10,10,10,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(10,10,10,.05) 1px,transparent 1px);
  background-size:34px 34px;
}

/* cyan underline-marker — sweeps in on scroll-reveal, grows on hover */
[data-tpl="editorial-magazine"] .ef-marker{
  background-image:linear-gradient(to top,rgba(6,182,212,.42) 0 44%,transparent 44%);
  background-repeat:no-repeat;
  background-size:100% 100%;
  background-position:0 100%;
  transition:background-size .8s cubic-bezier(.22,1,.36,1);
}
[data-tpl="editorial-magazine"] .reveal-item:not(.is-visible) .ef-marker{background-size:0% 100%}
[data-tpl="editorial-magazine"] .ef-grow .ef-marker{background-size:0% 100%;transition:background-size .5s cubic-bezier(.22,1,.36,1)}
[data-tpl="editorial-magazine"] .ef-grow:hover .ef-marker,[data-tpl="editorial-magazine"] .ef-grow:focus-visible .ef-marker{background-size:100% 100%}

/* glowing pull-quote bar */
[data-tpl="editorial-magazine"] .ef-qbar{
  width:5px;border-radius:99px;
  background:linear-gradient(180deg,#06B6D4,#0E7490);
  box-shadow:0 0 18px rgba(6,182,212,.6),0 0 44px rgba(6,182,212,.3);
}

/* drop-cap first letter (RTL: floats inline-start = right) */
[data-tpl="editorial-magazine"] .ef-dropcap::first-letter{
  float:right;
  font-size:3.1em;line-height:.82;font-weight:900;color:#0A0A0A;
  margin-inline-end:.16em;
}

/* article card */
[data-tpl="editorial-magazine"] .ef-card{
  background:#FFFFFF;border:1px solid #E9E9E4;
  transition:border-color .35s,transform .35s,box-shadow .35s;
}
[data-tpl="editorial-magazine"] .ef-card:hover{
  border-color:#0A0A0A;transform:translateY(-4px);
  box-shadow:14px 20px 44px -18px rgba(10,10,10,.3);
}

/* black CTA with cyan sweep underline */
[data-tpl="editorial-magazine"] .ef-cta{position:relative;overflow:hidden;background:#0A0A0A;color:#FFFFFF;transition:transform .3s}
[data-tpl="editorial-magazine"] .ef-cta::after{
  content:"";position:absolute;inset-inline:0;bottom:0;height:3px;background:#06B6D4;
  transform:scaleX(0);transform-origin:right;transition:transform .45s cubic-bezier(.22,1,.36,1);
}
[data-tpl="editorial-magazine"] .ef-cta:hover{transform:translateY(-2px)}
[data-tpl="editorial-magazine"] .ef-cta:hover::after{transform:scaleX(1)}

/* outline CTA */
[data-tpl="editorial-magazine"] .ef-ghost{border:1.5px solid #0A0A0A;color:#0A0A0A;transition:all .3s}
[data-tpl="editorial-magazine"] .ef-ghost:hover{background:#0A0A0A;color:#FFFFFF}

/* rails & scroll */
[data-tpl="editorial-magazine"] .ef-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="editorial-magazine"] .ef-rail::-webkit-scrollbar{display:none}
[data-tpl="editorial-magazine"] .ef-scroll{scrollbar-width:thin;scrollbar-color:rgba(6,182,212,.45) transparent}
[data-tpl="editorial-magazine"] .ef-scroll::-webkit-scrollbar{width:7px}
[data-tpl="editorial-magazine"] .ef-scroll::-webkit-scrollbar-thumb{background:linear-gradient(#22D3EE,#0891B2);border-radius:99px}
[data-tpl="editorial-magazine"] .ef-scroll::-webkit-scrollbar-track{background:rgba(10,10,10,.05)}

/* token blend for the shared StoriesRow on white */
[data-tpl="editorial-magazine"] .ef-story-wrap{
  --background:#FFFFFF;--foreground:#0A0A0A;--card:#FFFFFF;--muted:#F4F4F0;
  --muted-foreground:#6E6E6E;--primary:#0891B2;--border:#E9E9E4;
}

/* price emphasis */
[data-tpl="editorial-magazine"] .ef-price{color:#0A0A0A}
[data-tpl="editorial-magazine"] .ef-price b{color:#0E7490}

/* cyan live dot */
[data-tpl="editorial-magazine"] .ef-dot{width:7px;height:7px;border-radius:99px;background:#06B6D4;box-shadow:0 0 0 0 rgba(6,182,212,.5);animation:ef-pulse 2.6s infinite}
@keyframes ef-pulse{
  0%{box-shadow:0 0 0 0 rgba(6,182,212,.45)}
  70%{box-shadow:0 0 0 9px rgba(6,182,212,0)}
  100%{box-shadow:0 0 0 0 rgba(6,182,212,0)}
}

/* editorial Q mark */
[data-tpl="editorial-magazine"] .ef-q{
  width:34px;height:34px;display:grid;place-items:center;
  border:1.5px solid #0A0A0A;color:#0A0A0A;font-weight:900;
}

@media (prefers-reduced-motion:reduce){
  [data-tpl="editorial-magazine"] .ef-dot{animation:none!important}
  [data-tpl="editorial-magazine"] .ef-marker{transition:none!important}
  [data-tpl="editorial-magazine"] .ef-card,[data-tpl="editorial-magazine"] .ef-cta{transition:none!important}
  [data-tpl="editorial-magazine"] .reveal-item:not(.is-visible) .ef-marker{background-size:100% 100%!important}
}

/* ═══ v26fix · DARK SKIN — additive only, light rendering untouched ═══
   Palette: bg #17181A / ink #EDEDE8. The dramatic BLACK display type
   flips to warm-paper white; hairlines become dark hairlines; the
   cyan markers, badges, image scrims and white-on-photo plates keep
   their identity (the photo CTA plate turns smoked glass). CSS
   escapes are doubled (JS template literal). */
html.dark [data-tpl="editorial-magazine"]{
  --ef-ink:#EDEDE8;--ef-mute:#A6A8AB;--ef-cyan:#06B6D4;--ef-ivory:#1E1F23;--ef-line:#2B2C30;
  background:#17181A;color:#EDEDE8;
}
html.dark [data-tpl="editorial-magazine"] ::selection{background:rgba(6,182,212,.32);color:#EDEDE8}

/* raw utility overrides — ink flips, cyan + photo overlays kept */
html.dark [data-tpl="editorial-magazine"] .bg-white{background-color:#17181A}
html.dark [data-tpl="editorial-magazine"] .text-\\[\\#0A0A0A\\]{color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .fill-\\[\\#0A0A0A\\]{fill:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .text-\\[\\#6E6E6E\\]{color:#A6A8AB}
html.dark [data-tpl="editorial-magazine"] .text-\\[\\#C8C8C2\\]{color:#6A6C70}
html.dark [data-tpl="editorial-magazine"] .text-\\[\\#0A0A0A\\]\\/90{color:rgba(237,237,232,.9)}
html.dark [data-tpl="editorial-magazine"] .text-\\[\\#0A0A0A\\]\\/75{color:rgba(237,237,232,.75)}
html.dark [data-tpl="editorial-magazine"] .bg-\\[\\#0A0A0A\\]\\/40{background-color:rgba(237,237,232,.4)}
html.dark [data-tpl="editorial-magazine"] .bg-\\[\\#FAFAF7\\]{background-color:#1E1F23}
html.dark [data-tpl="editorial-magazine"] .hover\\:bg-\\[\\#FAFAF7\\]:hover{background-color:#1E1F23}
html.dark [data-tpl="editorial-magazine"] .hover\\:text-\\[\\#0A0A0A\\]:hover{color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#E9E9E4\\]{border-color:#2B2C30}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#C8C8C2\\]{border-color:#45474B}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#0A0A0A\\]{border-color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .hover\\:border-\\[\\#0A0A0A\\]:hover{border-color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#0A0A0A\\]\\/85{border-color:rgba(237,237,232,.85)}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#0A0A0A\\]\\/25{border-color:rgba(237,237,232,.25)}
html.dark [data-tpl="editorial-magazine"] .border-\\[\\#0A0A0A\\]\\/15{border-color:rgba(237,237,232,.15)}
/* black hover-fills on rows/buttons invert to light ink */
html.dark [data-tpl="editorial-magazine"] .hover\\:bg-\\[\\#0A0A0A\\]:hover{background-color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .hover\\:text-white:hover{color:#17181A}
/* photo CTA plate becomes smoked glass (keeps light text on top) */
html.dark [data-tpl="editorial-magazine"] .bg-white\\/92{background-color:rgba(23,24,26,.92)}
/* header/footer fade band follows the dark canvas */
html.dark [data-tpl="editorial-magazine"] .from-background{--tw-gradient-from:#17181A}

/* helper classes — dark variants */
html.dark [data-tpl="editorial-magazine"] .ef-grid{
  background-image:
    linear-gradient(rgba(237,237,232,.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(237,237,232,.06) 1px,transparent 1px);
}
html.dark [data-tpl="editorial-magazine"] .ef-dropcap::first-letter{color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .ef-card{background:#1C1D20;border-color:#2B2C30}
html.dark [data-tpl="editorial-magazine"] .ef-card:hover{
  border-color:#EDEDE8;
  box-shadow:14px 20px 44px -18px rgba(0,0,0,.55);
}
/* black CTA inverts to paper-white; cyan sweep underline kept */
html.dark [data-tpl="editorial-magazine"] .ef-cta{background:#EDEDE8;color:#17181A}
html.dark [data-tpl="editorial-magazine"] .ef-ghost{border-color:#EDEDE8;color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .ef-ghost:hover{background:#EDEDE8;color:#17181A}
html.dark [data-tpl="editorial-magazine"] .ef-q{border-color:#EDEDE8;color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .ef-price{color:#EDEDE8}
html.dark [data-tpl="editorial-magazine"] .ef-price b{color:#22D3EE}
html.dark [data-tpl="editorial-magazine"] .ef-scroll::-webkit-scrollbar-track{background:rgba(237,237,232,.06)}
/* token blend for the shared StoriesRow on the dark canvas */
html.dark [data-tpl="editorial-magazine"] .ef-story-wrap{
  --background:#17181A;--foreground:#EDEDE8;--card:#1C1D20;--muted:#212226;
  --muted-foreground:#A6A8AB;--primary:#0891B2;--border:#2B2C30;
}
`;

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useEditorialAdd() {
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

/* ── editorial section header — kicker + marker-swept title ──────── */
function EditorialHeader({
  icon: Icon, kicker, title, href,
}: { icon: React.ElementType; kicker: string; title: string; href?: string }) {
  return (
    <div className="mb-9">
      <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.26em] text-[#6E6E6E]">
        <Icon className="h-4 w-4 text-[#06B6D4]" aria-hidden />
        {kicker}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2 className="ef-marker inline-block text-2xl font-black tracking-tight md:text-[1.75rem]">{title}</h2>
        {href && (
          <Link href={href} className="ef-grow flex h-11 shrink-0 items-center gap-1.5 text-[11.5px] font-black text-[#6E6E6E] transition-colors hover:text-[#0A0A0A]">
            <span className="ef-marker inline-block">همهٔ نوشتارها</span>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <div aria-hidden className="mt-4 border-t-2 border-[#0A0A0A]/85" />
      <div aria-hidden className="mt-0.5 border-t border-[#0A0A0A]/25" />
    </div>
  );
}

/* ── stars ───────────────────────────────────────────────────────── */
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[#6E6E6E]">
      <Star className="h-3.5 w-3.5 fill-[#0A0A0A] text-[#0A0A0A]" aria-hidden />
      <span className="font-black text-[#0A0A0A]">{rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}</span>
      {count > 0 && <span className="tabular-nums">({toFaDigits(count.toLocaleString("fa-IR"))})</span>}
    </span>
  );
}

/* ── article product card — hover-reveal image zoom ──────────────── */
function ArticleCard({ product, className }: { product: TemplateProduct; className?: string }) {
  const { addToCart, added } = useEditorialAdd();
  return (
    <article className={cn("ef-card group relative flex flex-col", !product.inStock && "grayscale-[0.45]", className)}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden bg-[#FAFAF7]"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
            className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#C8C8C2]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute start-3 top-3 bg-[#06B6D4] px-2.5 py-1 text-[10px] font-black tabular-nums text-white">
            {toFaDigits(product.discountPercent)}٪ تخفیف
          </span>
        )}
        {/* hover-reveal caption bar */}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-[#0A0A0A]/90 py-2 text-center text-[10.5px] font-black text-white backdrop-blur transition-transform duration-300 group-hover:translate-y-0">
          مشاهدهٔ گزارش کامل
        </span>
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-[#0A0A0A]/85 py-1.5 text-center text-[10px] font-black tracking-[0.2em] text-white">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6E6E6E]">{product.brand.name}</p>
        <Link
          href={`/products/${product.slug}`}
          className="ef-grow mt-2 min-h-12 text-[13.5px] font-black leading-7 text-[#0A0A0A]"
        >
          <span className="ef-marker inline">{product.name}</span>
        </Link>
        <div className="mt-2">
          <Stars rating={product.rating} count={product.reviewCount} />
        </div>
        <p className="ef-price mt-3 text-[14px] font-black tabular-nums">
          {product.discountPercent > 0 && (
            <span className="me-2 text-[11px] font-medium text-[#6E6E6E] price-old">{formatPrice(product.price)}</span>
          )}
          <b>{formatPrice(product.effectivePrice)}</b>
          <span className="text-[9.5px] font-normal text-[#6E6E6E]"> تومان</span>
        </p>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 text-[11px] font-black transition-all",
            !product.inStock
              ? "cursor-not-allowed border border-[#E9E9E4] text-[#C8C8C2]"
              : added
                ? "ef-cta"
                : "ef-ghost hover:text-white"
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
export function EditorialMagazineTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const leadSlide = data.slides[0] ?? null;
  const sideSlides = data.slides.slice(1, 3);
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["editorial-magazine"];
  const totalSold = data.bestsellers.reduce((n, p) => n + p.soldCount, 0);

  return (
    <div data-template-chrome="1" data-tpl="editorial-magazine" className="isolate w-full bg-white text-[#0A0A0A]">
      <style>{EDITORIAL_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      <div aria-hidden className="h-6 bg-gradient-to-b from-background to-transparent" />

      <main className="mx-auto w-full max-w-6xl">
        {/* ═══ MASTHEAD — tech grid + dramatic black type ═══ */}
        <section className="ef-grid relative border-b border-[#0A0A0A]/15 px-4 py-10" aria-labelledby="em-mast">
          <div aria-hidden className="absolute inset-x-0 top-0 border-t-[3px] border-[#0A0A0A]" />
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.3em] text-[#6E6E6E]">
                <span className="ef-dot" aria-hidden />
                نشریهٔ رسمی · نسخهٔ دیجیتال
              </p>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#6E6E6E]">
                {toFaDigits(counts.products.toLocaleString("fa-IR"))} کالا · {toFaDigits(counts.brands.toLocaleString("fa-IR"))} برند
              </p>
            </div>
            <motion.h1
              id="em-mast"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 text-5xl font-black leading-[1.02] tracking-tighter md:text-7xl"
            >
              {store.storeName}
            </motion.h1>
            <p dir="ltr" className="mt-3 text-[11px] font-black uppercase tracking-[0.5em] text-[#6E6E6E]">
              {store.storeNameEn} — DIGITAL EDITION
            </p>
            <p className="mt-5 max-w-2xl text-[13px] leading-8 text-[#6E6E6E]">
              {store.announcementActive && store.announcement
                ? store.announcement
                : "تحریریهٔ ما هر کالا را مثل یک گزارش بررسی می‌کند؛ آنچه به صفحه می‌رسد، ارزش خواندن دارد."}
            </p>
          </Reveal>
        </section>

        {/* ═══ HERO — asymmetric lead article + side column ═══ */}
        {leadSlide && (
          <section className="px-4 py-10" aria-labelledby="em-hero">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              {/* lead article */}
              <motion.article
                initial={reduced ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                className="lg:col-span-8"
              >
                <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.28em] text-[#06B6D4]">
                  <span className="ef-dot" aria-hidden />
                  {leadSlide.subtitle ?? "گزارش آغازین"}
                </p>
                <h2 id="em-hero" className="ef-marker inline-block mt-3 text-3xl font-black leading-[1.15] tracking-tight md:text-[2.6rem]">
                  {leadSlide.title}
                </h2>
                <Link
                  href={leadSlide.ctaUrl ?? (leadSlide.product ? `/products/${leadSlide.product.slug}` : "/products")}
                  aria-label={leadSlide.title}
                  className="group relative mt-6 block h-[420px] overflow-hidden bg-[#FAFAF7] sm:h-[560px]"
                >
                  <SlideArt
                    slide={leadSlide}
                    alt={leadSlide.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 62vw"
                    className="object-cover transition-transform duration-[1600ms] group-hover:scale-[1.06]"
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute bottom-5 start-5 flex items-center gap-3 bg-white/92 px-4 py-2 backdrop-blur">
                    <span className="text-[11px] font-black text-[#0A0A0A]">{leadSlide.ctaText ?? "ادامهٔ گزارش"}</span>
                    <ChevronLeft className="h-4 w-4 text-[#06B6D4]" aria-hidden />
                  </span>
                </Link>
                {leadSlide.product && (
                  <p className="ef-price mt-4 text-[15px] font-black tabular-nums">
                    <span className="text-[11px] font-medium text-[#6E6E6E]">کالای روی جلد — </span>
                    <b>{formatPrice(leadSlide.product.discountPrice ?? leadSlide.product.price)}</b>
                    <span className="text-[10px] font-normal text-[#6E6E6E]"> تومان</span>
                  </p>
                )}
              </motion.article>

              {/* side column — secondary articles + in-this-issue */}
              <aside className="lg:col-span-4">
                <div aria-hidden className="mb-6 border-t-2 border-[#0A0A0A]/85" />
                {sideSlides.map((s) => (
                  <Link
                    key={s.id}
                    href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    aria-label={s.title}
                    className="ef-grow group mb-6 flex items-start gap-4 border-b border-[#E9E9E4] pb-6"
                  >
                    <span className="relative block h-20 w-28 shrink-0 overflow-hidden bg-[#FAFAF7]">
                      <SlideArt
                        slide={s}
                        alt={s.title}
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9.5px] font-black uppercase tracking-[0.24em] text-[#06B6D4]">
                        {s.subtitle ?? "خبر کوتاه"}
                      </span>
                      <span className="ef-marker mt-1.5 block text-[13.5px] font-black leading-6">{s.title}</span>
                      {s.product && (
                        <span className="mt-1.5 block text-[11px] font-bold tabular-nums text-[#6E6E6E]">
                          {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
                {data.categories.length > 0 && (
                  <div className="bg-[#FAFAF7] p-5">
                    <p className="mb-4 text-[10.5px] font-black uppercase tracking-[0.28em] text-[#6E6E6E]">در این شماره</p>
                    <ul>
                      {data.categories.slice(0, 5).map((c) => (
                        <li key={c.id} className="border-b border-[#E9E9E4] py-2.5 last:border-b-0">
                          <Link
                            href={`/products?category=${c.slug}`}
                            className="ef-grow flex items-center gap-2 text-[12.5px] font-black"
                          >
                            <span className="ef-marker inline-block">{c.name}</span>
                            <span aria-hidden className="flex-1 border-b border-dotted border-[#C8C8C2] -translate-y-1" />
                            <span className="text-[10.5px] font-bold tabular-nums text-[#6E6E6E]">
                              {toFaDigits(c.productCount.toLocaleString("fa-IR"))}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* ═══ STORIES — newsreel strip ═══ */}
        {stories.length > 0 && (
          <section className="ef-story-wrap px-4 py-12" aria-label={`استوری خبری (${toFaDigits(counts.stories)} استوری)`}>
            <Reveal>
              <EditorialHeader icon={Newspaper} kicker="NEWSREEL" title={`استوری‌های خبری · ${toFaDigits(counts.stories)} قسمت`} />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ PULL-QUOTE BAND — glowing cyan bars + real stats ═══ */}
        <section className="px-4 py-12" aria-label="نقلقول تحریریه">
          <Reveal>
            <div className="flex items-stretch gap-5">
              <span aria-hidden className="ef-qbar shrink-0" />
              <div className="min-w-0">
                <Quote className="h-6 w-6 text-[#06B6D4]" aria-hidden />
                <blockquote className="mt-3 text-2xl font-black leading-[1.5] tracking-tight md:text-[1.8rem]">
                  {store.announcementActive && store.announcement
                    ? store.announcement
                    : "ما آینده را با دقت تحریریه می‌خریم؛ شما فقط آن را می‌خوانید و انتخاب می‌کنید."}
                </blockquote>
                <cite className="mt-3 block text-[11px] font-black not-italic uppercase tracking-[0.3em] text-[#6E6E6E]">
                  — تحریریهٔ {store.storeName}
                </cite>
              </div>
            </div>
            {/* stats hairline row — tabular-nums */}
            <dl className="mt-10 grid grid-cols-2 gap-y-6 border-t border-[#E9E9E4] pt-6 sm:grid-cols-4">
              {[
                { v: counts.products, l: "گزارش کالا" },
                { v: counts.categories, l: "بخش نشریه" },
                { v: counts.brands, l: "برند طرف قرارداد" },
                { v: totalSold, l: "خوانندهٔ خریدار" },
              ].map((s) => (
                <div key={s.l} className="text-center sm:text-start">
                  <dd className="text-2xl font-black tabular-nums md:text-3xl">{toFaDigits(s.v.toLocaleString("fa-IR"))}</dd>
                  <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6E6E6E]">{s.l}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* ═══ CATEGORIES — magazine sections with markers ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-cats">
            <Reveal>
              <EditorialHeader icon={BookOpen} kicker="SECTIONS" title="بخش‌های نشریه" href="/products" />
              <ul className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
                {data.categories.map((c) => (
                  <li key={c.id} className="border-b border-[#E9E9E4]">
                    <Link
                      href={`/products?category=${c.slug}`}
                      className="ef-grow flex min-h-14 items-center gap-3 py-3.5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center border-[1.5px] border-[#0A0A0A] text-[11px] font-black tabular-nums">
                        {toFaDigits(c.productCount.toLocaleString("fa-IR"))}
                      </span>
                      <span className="ef-marker min-w-0 flex-1 truncate text-[13.5px] font-black">{c.name}</span>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-[#6E6E6E] transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — editor's picks with drop-cap intro ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-featured">
            <Reveal>
              <EditorialHeader icon={Star} kicker="EDITOR'S PICKS" title="برگزیدهٔ تحریریه" href="/products?sort=rating" />
              <p className="ef-dropcap mb-10 max-w-3xl text-[13.5px] leading-9 text-[#6E6E6E]">
                هر شماره، تحریریهٔ {store.storeName} ده‌ها کالای دیجیتال را زیر ذره‌بین می‌برد؛ از کیفیت ساخت تا تجربهٔ
                کاربری و قیمت منصفانه. آنچه می‌بینید، فشردهٔ بهترین‌های این دوره است — با ضمانت اصالت و اولویت ارسال.
              </p>
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured.slice(0, 6).map((p) => (
                  <ArticleCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — feature spreads with quote bars ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-exclusive">
            <Reveal>
              <EditorialHeader icon={Quote} kicker="FEATURE SPREAD" title="گزارش‌های ویژهٔ انحصاری" />
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                {data.exclusive.slice(0, 2).map((p) => (
                  <article key={p.id} className="flex items-stretch gap-5 border border-[#E9E9E4] p-4 transition-colors hover:border-[#0A0A0A]">
                    <Link
                      href={`/products/${p.slug}`}
                      aria-label={p.name}
                      className="relative hidden w-[180px] shrink-0 overflow-hidden bg-[#FAFAF7] sm:block"
                    >
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt={p.name}
                          fill
                          sizes="180px"
                          className="object-contain p-5 transition-transform duration-700 hover:scale-[1.06]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-[#C8C8C2]">
                          <Package className="h-12 w-12" aria-hidden />
                        </span>
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <span aria-hidden className="ef-qbar mb-4 h-8 w-5" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#6E6E6E]">{p.brand.name}</p>
                      <Link href={`/products/${p.slug}`} className="ef-grow mt-1.5 text-xl font-black leading-8 tracking-tight">
                        <span className="ef-marker inline-block">{p.name}</span>
                      </Link>
                      <div className="mt-2">
                        <Stars rating={p.rating} count={p.reviewCount} />
                      </div>
                      <p className="mt-3 line-clamp-2 text-[12px] leading-7 text-[#6E6E6E]">
                        کالای انحصاریِ {store.storeName}؛ موجودی محدود، انتخاب‌شده توسط سردبیر فنی.
                      </p>
                      <p className="ef-price mt-3 text-[14px] font-black tabular-nums">
                        <b>{formatPrice(p.effectivePrice)}</b>
                        <span className="text-[9.5px] font-normal text-[#6E6E6E]"> تومان</span>
                      </p>
                      <div className="mt-auto pt-4">
                        <SpreadAdd product={p} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — offer rows with cyan prices ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-deals">
            <Reveal>
              <EditorialHeader icon={Percent} kicker="OFFERS" title="پیشنهادهای شمارهٔ جاری" href="/products?discount=1" />
              <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
                {data.discounted.slice(0, 8).map((p, i) => (
                  <OfferRow key={p.id} product={p} code={`OFF-${toFaDigits(String(i + 1).padStart(2, "0"))}`} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — most-read list ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-best">
            <Reveal>
              <EditorialHeader icon={TrendingUp} kicker="MOST READ" title="پرخواننده‌ترین‌های نشریه" href="/products?sort=bestselling" />
              <ol className="ef-scroll mx-auto max-h-96 max-w-4xl overflow-y-auto pe-1">
                {data.bestsellers.slice(0, 8).map((p, i) => (
                  <ReadRow key={p.id} product={p} rank={i + 1} />
                ))}
              </ol>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST — fresh dispatches (rail → grid) ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-newest">
            <Reveal>
              <EditorialHeader icon={Sparkles} kicker="FRESH DISPATCHES" title="تازه‌های تحریریه" href="/products?sort=newest" />
              <div className="ef-rail -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {data.newest.slice(0, 8).map((p) => (
                  <ArticleCard key={p.id} product={p} className="w-[230px] shrink-0 snap-start sm:w-[260px] lg:w-auto" />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — photo essays ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-12" aria-label="مقاله‌های تصویری">
            <Reveal>
              <EditorialHeader icon={BookOpen} kicker="PHOTO ESSAYS" title="مقاله‌های تصویری" />
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <article key={s.id} className="ef-card group relative overflow-hidden">
                    <Link
                      href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className="relative block aspect-[16/10] overflow-hidden bg-[#FAFAF7]"
                    >
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        sizes="(max-width: 1024px) 92vw, 46vw"
                        className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.06]"
                        loading="lazy"
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <span className="absolute bottom-0 start-0 p-5 text-white">
                        <span className="block text-[9.5px] font-black uppercase tracking-[0.28em] text-[#67E8F9]">PHOTO ESSAY</span>
                        <span className="mt-1.5 block text-xl font-black tracking-tight">{s.title}</span>
                      </span>
                    </Link>
                    {s.subtitle && <p className="border-t border-[#E9E9E4] px-5 py-4 text-[12px] leading-7 text-[#6E6E6E]">{s.subtitle}</p>}
                    {s.product && (
                      <p className="ef-price border-t border-[#E9E9E4] px-5 py-3.5 text-[12.5px] font-black tabular-nums">
                        <span className="text-[11px] font-medium text-[#6E6E6E]">کالای مرتبط — </span>
                        <b>{formatPrice(s.product.discountPrice ?? s.product.price)}</b>
                        <span className="text-[9.5px] font-normal text-[#6E6E6E]"> تومان</span>
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ — Q&A columns ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="em-faq">
            <Reveal>
              <EditorialHeader icon={BookOpen} kicker="Q&A" title="پرسش و پاسخ" />
              <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
                {data.faq.map((f, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="ef-q shrink-0 text-[13px]">{toFaDigits(i + 1)}</span>
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-black leading-7">{f.h}</h3>
                      <p className="mt-2 text-[12.5px] leading-8 text-[#6E6E6E]">{f.p}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — masthead credits ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-8 border-t-2 border-[#0A0A0A]/85 px-4 py-12" aria-label="برندهای همکار">
            <Reveal>
              <div aria-hidden className="mb-6 border-t border-[#0A0A0A]/25" />
              <p className="mb-6 text-center text-[10.5px] font-black uppercase tracking-[0.3em] text-[#6E6E6E]">
                اعتبار و امضای نشریه
              </p>
              <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {data.brands.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-8">
                    {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-[#0A0A0A]/40" />}
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="text-[13px] font-black tracking-[0.14em] text-[#0A0A0A]/75 transition-colors hover:text-[#06B6D4]"
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
            <div className="mx-auto max-w-md border border-[#E9E9E4] p-10 text-center">
              <Newspaper className="mx-auto h-10 w-10 text-[#C8C8C2]" aria-hidden />
              <h2 className="mt-4 text-xl font-black tracking-tight">این شماره در حال صفحه‌بندی است</h2>
              <p className="mt-2 text-[13px] leading-8 text-[#6E6E6E]">گزارش‌های بعدی به‌زودی به صفحه‌های نشریه افزوده می‌شوند…</p>
              <div aria-hidden className="mt-8 flex items-center justify-center gap-5">
                <span className="ef-qbar h-10" />
                <span className="ef-qbar h-6" />
                <span className="ef-qbar h-14" />
              </div>
            </div>
          </section>
        )}
      </main>

      <div aria-hidden className="h-6 bg-gradient-to-t from-background to-transparent" />
      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── offer row — code + dotted leader + cyan price ═══ ═══ ═══ ═══ ── */
function OfferRow({ product, code }: { product: TemplateProduct; code: string }) {
  const { addToCart, added } = useEditorialAdd();
  return (
    <div className="group flex min-h-14 items-center gap-3 border-b border-[#E9E9E4] py-3 transition-colors hover:bg-[#FAFAF7]">
      <span className="text-[9.5px] font-bold tracking-[0.18em] text-[#6E6E6E] tabular-nums">{code}</span>
      <Link href={`/products/${product.slug}`} className="ef-grow min-w-0 flex-1 truncate text-[13px] font-black">
        <span className="ef-marker inline-block">{product.name}</span>
      </Link>
      <span aria-hidden className="hidden flex-1 border-b border-dotted border-[#C8C8C2] -translate-y-1 md:block" />
      {product.discountPercent > 0 && (
        <span className="shrink-0 text-[11px] text-[#6E6E6E] price-old tabular-nums">{formatPrice(product.price)}</span>
      )}
      <span className="ef-price shrink-0 text-[13px] font-black tabular-nums">
        <b>{formatPrice(product.effectivePrice)}</b>
        <span className="text-[9px] font-normal text-[#6E6E6E]"> تومان</span>
      </span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد خرید`}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center border-[1.5px] border-[#0A0A0A] transition-all",
          !product.inStock
            ? "cursor-not-allowed text-[#C8C8C2]"
            : added
              ? "ef-cta"
              : "text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
        )}
      >
        {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

/* ── read row — giant rank numeral + leader ═══ ═══ ═══ ═══ ═══ ═══ ── */
function ReadRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useEditorialAdd();
  return (
    <li className="group flex min-h-16 items-center gap-4 border-b border-[#E9E9E4] py-4 transition-colors hover:bg-[#FAFAF7]">
      <span className="w-12 shrink-0 text-3xl font-black leading-none tracking-tighter text-[#0A0A0A]/90 md:text-4xl">
        {toFaDigits(String(rank).padStart(2, "0"))}
      </span>
      <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden border border-[#E9E9E4] bg-[#FAFAF7] sm:block">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="56px" className="object-contain p-2" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-[#C8C8C2]">
            <Package className="h-6 w-6" aria-hidden />
          </span>
        )}
      </span>
      <Link href={`/products/${product.slug}`} className="ef-grow min-w-0 flex-1 truncate text-[13.5px] font-black leading-6">
        <span className="ef-marker inline-block">{product.name}</span>
      </Link>
      {product.soldCount > 0 && (
        <span className="hidden shrink-0 text-[10.5px] font-bold tabular-nums text-[#6E6E6E] md:block">
          {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} خوانش
        </span>
      )}
      <span className="ef-price shrink-0 text-[13px] font-black tabular-nums">
        <b>{formatPrice(product.effectivePrice)}</b>
        <span className="text-[9px] font-normal text-[#6E6E6E]"> تومان</span>
      </span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد خرید`}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center border-[1.5px] border-[#0A0A0A] transition-all",
          !product.inStock
            ? "cursor-not-allowed text-[#C8C8C2]"
            : added
              ? "ef-cta"
              : "text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
        )}
      >
        {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      </button>
    </li>
  );
}

/* ── spread add button ───────────────────────────────────────────── */
function SpreadAdd({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useEditorialAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد خرید`}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 border-[1.5px] text-[11px] font-black transition-all",
        !product.inStock
          ? "cursor-not-allowed border-[#E9E9E4] text-[#C8C8C2]"
          : added
            ? "ef-cta border-transparent"
            : "ef-ghost border-[#0A0A0A] hover:text-white"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "اتمام موجودی"}
    </button>
  );
}

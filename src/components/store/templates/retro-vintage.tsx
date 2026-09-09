"use client";

/**
 * TEMPLATE · retro-vintage — «Retro-Future» (v25 futurized rewrite)
 * ---------------------------------------------------------------------
 * 70s retro-futurism broadcast from a chrome diner at the edge of the
 * galaxy: cream paper #F4EDD8 with halftone dot textures, warm neon
 * amber #FFB627 + burnt orange #E8590C glow accents, rounded retro
 * blobs, "space-age" arched cards (border-radius top 999px), and a
 * scanline CRT overlay sweeping the hero screen. Old dashed "postage"
 * frames are now GLOWING DASHED NEON borders. Pure CSS — no images.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Rocket, Radio, Star, Check, Package, ShoppingCart, ChevronLeft, Percent, Disc3, Plus,
  Truck, ShieldCheck, Headphones, Smartphone, Laptop, Speaker, Watch, Camera, Tv,
  Gamepad2, Tablet, Cable,
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

/* ONE scoped style block — every rule prefixed rf- (retro-future) */
const RETRO_CSS = `
[data-tpl="retro-vintage"]{
  --rf-amber:#FFB627;--rf-orange:#E8590C;--rf-ink:#3B2F1E;--rf-paper:#F4EDD8;--rf-card:#FBF5E4;
  background:#F4EDD8;color:#3B2F1E;
}
[data-tpl="retro-vintage"] ::selection{background:rgba(255,182,39,.5);color:#3B2F1E}
[data-tpl="retro-vintage"] a:focus-visible,[data-tpl="retro-vintage"] button:focus-visible,[data-tpl="retro-vintage"] summary:focus-visible{outline:2px solid #E8590C;outline-offset:3px}

/* halftone cream paper */
[data-tpl="retro-vintage"] .rf-paper{
  background-color:#F4EDD8;
  background-image:radial-gradient(rgba(59,47,30,.09) 1px,transparent 1.6px);
  background-size:13px 13px;
}

/* space-age arches */
[data-tpl="retro-vintage"] .rf-arch{border-radius:999px 999px 26px 26px}
[data-tpl="retro-vintage"] .rf-arch-img{border-radius:999px 999px 20px 20px}

/* CRT scanline overlay on the hero screen */
[data-tpl="retro-vintage"] .rf-crt{position:relative;overflow:hidden}
[data-tpl="retro-vintage"] .rf-crt::before{
  content:"";position:absolute;inset:0;z-index:2;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(59,30,6,.13) 0 2px,transparent 2px 6px);
  mix-blend-mode:multiply;
}
[data-tpl="retro-vintage"] .rf-crt::after{
  content:"";position:absolute;left:0;right:0;top:0;height:26%;z-index:3;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(255,214,130,.34),transparent);
  animation:rf-sweep 5.5s linear infinite;
}
@keyframes rf-sweep{from{transform:translateY(-140%)}to{transform:translateY(430%)}}

/* glowing dashed neon borders (the old postage frames, futurized) */
[data-tpl="retro-vintage"] .rf-dash{
  border:2px dashed #E8590C;
  box-shadow:0 0 14px rgba(232,89,12,.26),inset 0 0 14px rgba(255,182,39,.16);
  transition:box-shadow .35s,border-color .35s;
}
[data-tpl="retro-vintage"] .rf-dash:hover{border-color:#FFB627;box-shadow:0 0 26px rgba(255,182,39,.55),inset 0 0 20px rgba(255,182,39,.28)}
[data-tpl="retro-vintage"] .rf-dash-a{
  border:2px dashed #C98A1B;
  box-shadow:0 0 12px rgba(201,138,27,.25),inset 0 0 12px rgba(255,182,39,.14);
  transition:box-shadow .35s,border-color .35s;
}
[data-tpl="retro-vintage"] .rf-dash-a:hover{border-color:#FFB627;box-shadow:0 0 24px rgba(255,182,39,.5),inset 0 0 18px rgba(255,182,39,.24)}

/* retro blob */
[data-tpl="retro-vintage"] .rf-blob{
  background:linear-gradient(140deg,#FFB627 0%,#E8590C 70%);
  border-radius:47% 53% 58% 42%/52% 44% 56% 48%;
  box-shadow:0 24px 60px -20px rgba(232,89,12,.45);
  animation:rf-bob 9s ease-in-out infinite;
}
@keyframes rf-bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(3deg)}}

/* neon buttons */
[data-tpl="retro-vintage"] .rf-btn{
  background:linear-gradient(165deg,#FFC95C,#FFB627 45%,#E8590C);color:#3B2F1E;
  box-shadow:0 6px 0 -1px rgba(232,89,12,.55),0 14px 28px -8px rgba(232,89,12,.5);
  transition:transform .2s,box-shadow .2s,filter .2s;
}
[data-tpl="retro-vintage"] .rf-btn:hover{
  transform:translateY(-2px);filter:brightness(1.04);
  box-shadow:0 8px 0 -1px rgba(232,89,12,.6),0 18px 36px -8px rgba(232,89,12,.6),0 0 26px rgba(255,182,39,.55);
}
[data-tpl="retro-vintage"] .rf-btn:active{transform:translateY(1px)}
[data-tpl="retro-vintage"] .rf-btn-ghost{
  border:2px dashed #E8590C;color:#B34409;
  transition:all .3s;
}
[data-tpl="retro-vintage"] .rf-btn-ghost:hover{
  background:rgba(255,182,39,.18);border-color:#FFB627;color:#8A3608;
  box-shadow:0 0 18px rgba(255,182,39,.45);
}

/* warm neon text glow */
[data-tpl="retro-vintage"] .rf-glow{text-shadow:0 0 12px rgba(255,182,39,.6),0 0 36px rgba(232,89,12,.35)}
[data-tpl="retro-vintage"] .rf-flicker{animation:rf-flick 4.5s linear infinite}
@keyframes rf-flick{0%,100%{opacity:1}3%{opacity:.5}6%{opacity:1}54%{opacity:1}56%{opacity:.65}58%{opacity:1}}

/* retro product card */
[data-tpl="retro-vintage"] .rf-card{
  background:#FBF5E4;border:2px solid #E4D9BC;
  transition:border-color .35s,box-shadow .35s,transform .35s;
}
[data-tpl="retro-vintage"] .rf-card:hover{
  border-color:#FFB627;transform:translateY(-4px);
  box-shadow:0 18px 40px -16px rgba(232,89,12,.35),0 0 24px -4px rgba(255,182,39,.5);
}

/* percent badge — rotated sticker with amber glow */
[data-tpl="retro-vintage"] .rf-badge{
  background:linear-gradient(160deg,#FFC95C,#E8590C);color:#3B2F1E;
  box-shadow:0 6px 16px -4px rgba(232,89,12,.55),0 0 18px rgba(255,182,39,.4);
}

/* marquee / rails / scroll */
[data-tpl="retro-vintage"] .rf-marq{overflow:hidden}
[data-tpl="retro-vintage"] .rf-marq-track{display:flex;width:max-content;animation:rf-marq var(--rf-mq,22s) linear infinite}
[data-tpl="retro-vintage"] .rf-marq:hover .rf-marq-track{animation-play-state:paused}
@keyframes rf-marq{to{transform:translateX(-50%)}}
[data-tpl="retro-vintage"] .rf-mask{-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
[data-tpl="retro-vintage"] .rf-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="retro-vintage"] .rf-rail::-webkit-scrollbar{display:none}
[data-tpl="retro-vintage"] .rf-scroll{scrollbar-width:thin;scrollbar-color:rgba(232,89,12,.4) transparent}
[data-tpl="retro-vintage"] .rf-scroll::-webkit-scrollbar{width:7px}
[data-tpl="retro-vintage"] .rf-scroll::-webkit-scrollbar-thumb{background:linear-gradient(#FFB627,#E8590C);border-radius:99px}
[data-tpl="retro-vintage"] .rf-scroll::-webkit-scrollbar-track{background:rgba(232,89,12,.08)}

/* token blend for the shared StoriesRow on cream paper */
[data-tpl="retro-vintage"] .rf-story-wrap{
  --background:#F4EDD8;--foreground:#3B2F1E;--card:#FBF5E4;--muted:#EFE5C9;
  --muted-foreground:#8A7A55;--primary:#E8590C;--border:#E4D9BC;
}

/* native details FAQ */
[data-tpl="retro-vintage"] details.rf-faq summary{list-style:none;cursor:pointer}
[data-tpl="retro-vintage"] details.rf-faq summary::-webkit-details-marker{display:none}
[data-tpl="retro-vintage"] details.rf-faq .rf-faq-icon{transition:transform .35s}
[data-tpl="retro-vintage"] details.rf-faq[open] .rf-faq-icon{transform:rotate(45deg)}

/* dark exclusive cabin */
[data-tpl="retro-vintage"] .rf-cabin{
  background:linear-gradient(170deg,#33210F,#2B1A0C 60%,#241509);
  box-shadow:inset 0 0 60px rgba(232,89,12,.12);
}
[data-tpl="retro-vintage"] .rf-cabin-card{
  background:rgba(251,245,228,.06);border:1px solid rgba(255,182,39,.25);
  transition:border-color .35s,box-shadow .35s,transform .35s;
}
[data-tpl="retro-vintage"] .rf-cabin-card:hover{
  border-color:rgba(255,182,39,.7);transform:translateY(-3px);
  box-shadow:0 16px 36px -14px rgba(255,182,39,.35),0 0 22px -4px rgba(255,182,39,.3);
}

@media (prefers-reduced-motion:reduce){
  [data-tpl="retro-vintage"] .rf-crt::after,[data-tpl="retro-vintage"] .rf-blob,
  [data-tpl="retro-vintage"] .rf-marq-track,[data-tpl="retro-vintage"] .rf-flicker{animation:none!important}
  [data-tpl="retro-vintage"] .rf-card,[data-tpl="retro-vintage"] .rf-cabin-card,[data-tpl="retro-vintage"] .rf-btn{transition:none!important}
}

/* ═══ v26fix · DARK SKIN — additive only, light rendering untouched ═══
   Palette: bg #221B10 / ink #F0E6CE (deep toasted paper, warm cream
   ink). The amber/orange neon identity, CRT screen, image overlays and
   the dark exclusive cabin keep their colors — the cabin is re-anchored
   one step deeper than the page. CSS escapes are doubled because this
   CSS lives inside a JS template literal. */
html.dark [data-tpl="retro-vintage"]{
  --rf-amber:#FFB627;--rf-orange:#E8590C;--rf-ink:#F0E6CE;--rf-paper:#221B10;--rf-card:#2A2314;
  background:#221B10;color:#F0E6CE;
}
html.dark [data-tpl="retro-vintage"] ::selection{background:rgba(255,182,39,.4);color:#221B10}

/* raw utility overrides — paper neutrals flip, neon accents kept */
html.dark [data-tpl="retro-vintage"] .bg-\\[\\#F4EDD8\\]{background-color:#221B10}
html.dark [data-tpl="retro-vintage"] .bg-\\[\\#F4EDD8\\]\\/80{background-color:rgba(42,35,20,.8)}
html.dark [data-tpl="retro-vintage"] .text-\\[\\#3B2F1E\\]{color:#F0E6CE}
html.dark [data-tpl="retro-vintage"] .bg-\\[\\#FBF5E4\\]{background-color:#2A2314}
html.dark [data-tpl="retro-vintage"] .text-\\[\\#8A7A55\\]{color:#B7A87F}
html.dark [data-tpl="retro-vintage"] .text-\\[\\#6B5B39\\]{color:#CDBF98}
html.dark [data-tpl="retro-vintage"] .text-\\[\\#C9BB8E\\]{color:#8A7B57}
/* burnt-orange ghost text is too dim on the dark paper → lightened same hue */
html.dark [data-tpl="retro-vintage"] .text-\\[\\#B34409\\]{color:#FF9E45}
html.dark [data-tpl="retro-vintage"] .border-\\[\\#E4D9BC\\]{border-color:#3F361F}
html.dark [data-tpl="retro-vintage"] .border-\\[\\#D8CBA4\\]{border-color:#453C25}
/* header/footer fade band follows the dark canvas */
html.dark [data-tpl="retro-vintage"] .from-background{--tw-gradient-from:#221B10}

/* helper classes — dark variants */
html.dark [data-tpl="retro-vintage"] .rf-paper{
  background-color:#221B10;
  background-image:radial-gradient(rgba(240,230,206,.08) 1px,transparent 1.6px);
}
html.dark [data-tpl="retro-vintage"] .rf-btn-ghost{color:#FF9E45}
html.dark [data-tpl="retro-vintage"] .rf-btn-ghost:hover{color:#FFD98A}
html.dark [data-tpl="retro-vintage"] .rf-card{background:#2A2314;border-color:#3F361F}
/* exclusive cabin: one step deeper than the dark page, amber glow kept */
html.dark [data-tpl="retro-vintage"] .rf-cabin{
  background:linear-gradient(170deg,#191105,#140D03 60%,#0F0902);
}
/* token blend for the shared StoriesRow on the dark paper */
html.dark [data-tpl="retro-vintage"] .rf-story-wrap{
  --background:#221B10;--foreground:#F0E6CE;--card:#2A2314;--muted:#2E2617;
  --muted-foreground:#B7A87F;--primary:#E8590C;--border:#3F361F;
}
`;

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useRetroAdd() {
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

/* ── retro section header ────────────────────────────────────────── */
function RetroHeader({
  icon: Icon, kicker, title, href,
}: { icon: React.ElementType; kicker: string; title: string; href?: string }) {
  return (
    <div className="mb-9">
      <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.24em] text-[#E8590C]">
        <Icon className="h-4 w-4" aria-hidden />
        {kicker}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight md:text-[1.7rem]">{title}</h2>
        {href && (
          <Link
            href={href}
            className="rf-btn-ghost flex h-11 items-center gap-1.5 px-5 text-[11.5px] font-black"
          >
            همه
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── stars ───────────────────────────────────────────────────────── */
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[#8A7A55]">
      <Star className="h-3.5 w-3.5 fill-[#E8590C] text-[#E8590C]" aria-hidden />
      <span className="font-black text-[#3B2F1E]">{rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}</span>
      {count > 0 && <span className="tabular-nums">({toFaDigits(count.toLocaleString("fa-IR"))})</span>}
    </span>
  );
}

/* ── space-age arched product card ───────────────────────────────── */
function ArchCard({ product, dashed = false }: { product: TemplateProduct; dashed?: boolean }) {
  const { addToCart, added } = useRetroAdd();
  return (
    <article className={cn("group relative flex flex-col", dashed ? "rf-dash bg-[#FBF5E4]" : "rf-card", !product.inStock && "grayscale-[0.45]")}>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="rf-arch-img relative block aspect-square overflow-hidden border-b-2 border-[#E4D9BC] bg-[#F4EDD8]"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#C9BB8E]">
            <Package className="h-12 w-12" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="rf-badge absolute end-3 top-3 grid h-12 w-12 -rotate-6 place-items-center rounded-full text-[10px] font-black leading-none tabular-nums">
            {toFaDigits(product.discountPercent)}٪
            <span className="mt-0.5 block text-[8px] font-bold">تخفیف</span>
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-[#3B2F1E]/85 py-1.5 text-center text-[10px] font-black tracking-widest text-[#F4EDD8]">
            ناموجود
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-5 pt-4 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#8A7A55]">{product.brand.name}</p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1.5 min-h-12 text-[13px] font-black leading-6 transition-colors hover:text-[#E8590C]"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex justify-center">
          <Stars rating={product.rating} count={product.reviewCount} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          {product.discountPercent > 0 && (
            <span className="text-[11px] text-[#8A7A55] price-old tabular-nums">{formatPrice(product.price)}</span>
          )}
          <span className="text-[14px] font-black tabular-nums text-[#E8590C]">
            {formatPrice(product.effectivePrice)}
            <span className="text-[9.5px] font-normal text-[#8A7A55]"> تومان</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 text-[11px] font-black transition-all",
            !product.inStock
              ? "cursor-not-allowed border-2 border-dashed border-[#D8CBA4] text-[#C9BB8E]"
              : added
                ? "rf-btn"
                : "border-2 border-dashed border-[#E8590C] text-[#B34409] hover:bg-[#FFB627]/20 hover:shadow-[0_0_16px_rgba(255,182,39,.45)]"
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
export function RetroVintageTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const heroProduct = heroSlide?.product ?? data.featured[0] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  /* v20 ticker list → announcement fallback → retro broadcast default */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink ?? undefined }]
        : [{ text: "رادیو رترو — فرکانس خرید آینده، همین حالا فعال است." }];
  const tickerDur = store.tickerSpeed && store.tickerSpeed >= 6 ? store.tickerSpeed : 22;

  const chrome = TEMPLATE_CHROME["retro-vintage"];
  const totalSold = data.bestsellers.reduce((n, p) => n + p.soldCount, 0);

  const stats = [
    { v: counts.products, l: "کالا در مدار" },
    { v: counts.brands, l: "ایستگاه برند" },
    { v: totalSold, l: "مأموریت موفق" },
  ];

  const services = [
    { icon: Truck, t: "ارسال سراسری" },
    { icon: ShieldCheck, t: "ضمانت اصالت" },
    { icon: Headphones, t: "پشتیبانی ۲۴/۷" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="retro-vintage" className="isolate w-full bg-[#F4EDD8] text-[#3B2F1E]">
      <style>{RETRO_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* blend the light chrome into the cream paper */}
      <div aria-hidden className="h-8 bg-gradient-to-b from-background to-transparent" />

      <main className="rf-paper mx-auto w-full max-w-6xl">
        {/* ═══ retro radio ticker — glowing dashed amber strip ═══ */}
        <section aria-label="اطلاعیهٔ فروشگاه" className="px-4 pt-6">
          <div className="rf-dash-a flex items-center gap-3 bg-[#F4EDD8]/80 px-4 py-2.5">
            <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.18em] text-[#B34409]">
              <Radio className="h-4 w-4 rf-flicker text-[#E8590C]" aria-hidden />
              رادیو رترو
            </span>
            <div dir="ltr" className="rf-marq min-w-0 flex-1">
              <div className="rf-marq-track" style={{ "--rf-mq": `${tickerDur}s` } as React.CSSProperties}>
                {[0, 1].map((g) => (
                  <div key={g} className="flex items-center" dir="rtl">
                    {tickerMsgs.map((m, i) => (
                      <span key={`${g}-${i}`} className="flex items-center gap-2 whitespace-nowrap px-5 text-[12px] font-bold text-[#6B5B39]">
                        <Disc3 className="h-3 w-3 shrink-0 text-[#E8590C]" aria-hidden />
                        {m.link ? (
                          <Link href={m.link} className="transition-colors hover:text-[#E8590C]">
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
          </div>
        </section>

        {/* ═══ HERO — CRT screen + retro blob + arched media ═══ */}
        <section className="relative px-4 py-12 md:py-16" aria-labelledby="rv-hero">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* copy */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-center lg:text-start"
            >
              <p className="rf-dash-a inline-flex items-center gap-2 bg-[#F4EDD8]/80 px-4 py-2 text-[10.5px] font-black uppercase tracking-[0.2em] text-[#B34409]">
                <Rocket className="h-4 w-4 text-[#E8590C]" aria-hidden />
                آینده‌ای که دیروز می‌ساختیم
              </p>
              <h1 id="rv-hero" className="rf-glow mt-6 text-4xl font-black leading-[1.2] tracking-tight text-[#E8590C] sm:text-5xl md:text-6xl">
                {store.storeName}
              </h1>
              <p dir="ltr" className="mt-3 text-[11px] font-black uppercase tracking-[0.42em] text-[#C98A1B]">
                {store.storeNameEn}
              </p>
              <p className="mx-auto mt-6 max-w-md text-[13.5px] leading-8 text-[#6B5B39] lg:mx-0">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : "از اسپیکرهای کهکشانی تا ساعت‌های هوشمند آینده — هر کالا یک قطعه از رؤیای دیشب شماست."}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link href="/products" className="rf-btn flex h-12 items-center px-9 text-xs font-black tracking-[0.14em]">
                  پرواز به فروشگاه
                  <Rocket className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/products?discount=1" className="rf-btn-ghost flex h-12 items-center px-9 text-xs font-black tracking-[0.14em]">
                  حراج‌های کهکشانی
                </Link>
              </div>
              {/* real stats — HUD gauges */}
              <dl className="mt-10 flex items-center justify-center gap-6 lg:justify-start">
                {stats.map((s) => (
                  <div key={s.l} className="text-center lg:text-start">
                    <dd className="text-xl font-black tabular-nums text-[#E8590C] md:text-2xl">{toFaDigits(s.v.toLocaleString("fa-IR"))}</dd>
                    <dt className="mt-1 text-[9.5px] font-bold tracking-[0.18em] text-[#8A7A55]">{s.l}</dt>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* media — CRT screen in an arch, blob behind */}
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              className="relative mx-auto w-full max-w-[480px]"
            >
              <span aria-hidden className="rf-blob absolute -top-8 -end-6 h-40 w-40 opacity-80" />
              <span aria-hidden className="rf-blob absolute -bottom-10 -start-8 h-28 w-28 opacity-60 [animation-delay:-4s]" />
              <div className="rf-arch rf-dash relative border-[#E8590C] bg-[#F4EDD8] p-2.5">
                <div className="rf-crt rf-arch-img relative block h-[420px] overflow-hidden bg-[#2B1A0C] sm:h-[560px]">
                  {heroSlide ? (
                    <SlideArt
                      slide={heroSlide}
                      alt={heroSlide.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 92vw, 480px"
                      className="object-cover"
                    />
                  ) : heroProduct?.mainImage ? (
                    <Image
                      src={heroProduct.mainImage}
                      alt={heroProduct.name}
                      fill
                      priority
                      sizes="(max-width: 1024px) 92vw, 480px"
                      className="object-contain p-10"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[#FFB627]/50">
                      <Disc3 className="h-20 w-20" aria-hidden />
                    </span>
                  )}
                  {/* amber vignette + signal chip */}
                  <span aria-hidden className="absolute inset-0 z-[4] bg-gradient-to-t from-[#2B1A0C]/60 via-transparent to-[#FFB627]/10" />
                  <span className="absolute bottom-4 start-4 z-[5] flex items-center gap-2 bg-[#2B1A0C]/80 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-[#FFB627] backdrop-blur">
                    <span className="rf-flicker h-1.5 w-1.5 rounded-full bg-[#FFB627]" aria-hidden />
                    سیگنال آنالوگ · نسل ۳
                  </span>
                </div>
                {heroSlide?.product && (
                  <div className="rf-dash-a mt-3 flex items-center justify-between gap-3 bg-[#FBF5E4] px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-black">{heroSlide.product.name}</span>
                      <span className="text-[10px] font-bold tracking-widest text-[#8A7A55]">کالای پخش زنده</span>
                    </span>
                    <Link
                      href={`/products/${heroSlide.product.slug}`}
                      className="rf-btn flex h-10 shrink-0 items-center px-5 text-[11px] font-black"
                    >
                      {formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)} تومان
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ service chips ═══ */}
        <section aria-label="خدمات فروشگاه" className="px-4 pb-6">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {services.map((s) => (
              <li key={s.t} className="rf-dash-a flex items-center justify-center gap-2.5 bg-[#F4EDD8]/80 px-4 py-3.5 text-[11.5px] font-black text-[#6B5B39]">
                <s.icon className="h-4 w-4 shrink-0 text-[#E8590C]" aria-hidden />
                {s.t}
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="rf-story-wrap px-4 py-12" aria-label={`استوری‌های فروشگاه (${toFaDigits(counts.stories)} استوری)`}>
            <Reveal>
              <RetroHeader icon={Radio} kicker="کانال استوری" title={`پخش زندهٔ فروشگاه · ${toFaDigits(counts.stories)} استوری`} />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES — space-age arch tiles ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-cats">
            <Reveal>
              <RetroHeader icon={Disc3} kicker="کانال‌های خرید" title="دسته‌بندی‌های کهکشانی" href="/products" />
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.categories.map((c) => {
                  const Icon = catIcon(c.slug);
                  return (
                    <li key={c.id}>
                      <Link href={`/products?category=${c.slug}`} className="rf-card group flex flex-col items-center p-5 text-center">
                        <span className="rf-arch-img relative mb-4 grid h-16 w-16 place-items-center overflow-hidden border-2 border-[#E4D9BC] bg-[#F4EDD8] transition-all duration-500 group-hover:border-[#FFB627] group-hover:shadow-[0_0_20px_rgba(255,182,39,.5)]">
                          {c.image ? (
                            <Image
                              src={c.image}
                              alt={`تصویر دسته‌بندی ${c.name}`}
                              fill
                              sizes="64px"
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <Icon className="h-7 w-7 text-[#E8590C]" aria-hidden />
                          )}
                        </span>
                        <span className="text-[13px] font-black leading-6">{c.name}</span>
                        <span className="mt-1 text-[10px] font-bold tracking-[0.18em] text-[#8A7A55] tabular-nums">
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

        {/* ═══ DISCOUNTED — glowing dashed neon frames ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-deals">
            <Reveal>
              <RetroHeader icon={Percent} kicker="حراج کهکشانی" title="تخفیف‌های با فرکانس بالا" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <ArchCard key={p.id} product={p} dashed />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — arch cards ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-featured">
            <Reveal>
              <RetroHeader icon={Star} kicker="ستارگان ناوگان" title="محصولات ویژه" href="/products?sort=rating" />
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <ArchCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — retro cabin (dark band with amber neon) ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-exclusive">
            <Reveal>
              <div className="rf-cabin relative overflow-hidden rounded-[2.5rem] p-6 md:p-10">
                {/* inner glowing dashed neon frame */}
                <span aria-hidden className="pointer-events-none absolute inset-4 rounded-[1.8rem] border-2 border-dashed border-[#FFB627]/35" />
                <div className="mb-8 text-center">
                  <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-[#FFB627]">غرفهٔ انحصاری</p>
                  <h2 id="rv-exclusive" className="mt-2 text-2xl font-black tracking-tight text-[#F4EDD8] md:text-[1.7rem]">
                    کالاهای کم‌یابِ این کهکشان
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {data.exclusive.slice(0, 3).map((p) => (
                    <article key={p.id} className="rf-cabin-card group flex flex-col p-4">
                      <Link
                        href={`/products/${p.slug}`}
                        aria-label={p.name}
                        className="rf-arch-img relative mb-4 block aspect-square overflow-hidden border border-[#FFB627]/25 bg-[#241509]"
                      >
                        {p.mainImage ? (
                          <Image
                            src={p.mainImage}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-[#FFB627]/40">
                            <Package className="h-12 w-12" aria-hidden />
                          </span>
                        )}
                        <span className="absolute start-3 top-3 bg-[#FFB627] px-2.5 py-1 text-[9.5px] font-black tracking-[0.16em] text-[#3B2F1E]">
                          انحصاری
                        </span>
                      </Link>
                      <p className="text-[10px] font-bold tracking-[0.2em] text-[#C98A1B]">{p.brand.name}</p>
                      <Link href={`/products/${p.slug}`} className="mt-1.5 text-[13.5px] font-black leading-6 text-[#F4EDD8] transition-colors hover:text-[#FFB627]">
                        {p.name}
                      </Link>
                      <p className="mt-2 text-[13px] font-black tabular-nums text-[#FFB627]">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9.5px] font-normal text-[#C98A1B]"> تومان</span>
                      </p>
                      <CabinAdd product={p} />
                    </article>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — amber dial ledger ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-best">
            <Reveal>
              <RetroHeader icon={Rocket} kicker="رتبه‌های مدار" title="پرفروش‌های کهکشانی" href="/products?sort=bestselling" />
              <ol className="rf-card rf-scroll mx-auto max-h-96 max-w-3xl overflow-y-auto p-2 pe-1">
                {data.bestsellers.slice(0, 8).map((p, i) => (
                  <BestRow key={p.id} product={p} rank={i + 1} />
                ))}
              </ol>
            </Reveal>
          </section>
        )}

        {/* ═══ NEWEST — retro TV rail ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-newest">
            <Reveal>
              <RetroHeader icon={Disc3} kicker="تازه‌های مدار" title="جدیدترین کالاها" href="/products?sort=newest" />
              <div className="rf-rail -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2">
                {data.newest.slice(0, 8).map((p) => (
                  <div key={p.id} className="relative w-[220px] shrink-0 snap-start sm:w-[250px]">
                    <span className="rf-badge absolute -top-2 end-4 z-10 grid h-7 w-7 rotate-6 place-items-center rounded-full text-[8.5px] font-black">
                      جدید
                    </span>
                    <ArchCard product={p} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES — arched exhibition panels with neon dash ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-12" aria-label="ویترین‌های ویژه">
            <Reveal>
              <RetroHeader icon={Star} kicker="ویترین‌های رترو" title="پوسترهای فروشگاه" />
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <article key={s.id} className="rf-dash group relative bg-[#FBF5E4] p-3">
                    <Link
                      href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className="rf-arch-img relative block aspect-[16/11] overflow-hidden bg-[#F4EDD8]"
                    >
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        sizes="(max-width: 1024px) 92vw, 46vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        loading="lazy"
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#3B2F1E]/55 via-transparent to-[#FFB627]/10" />
                    </Link>
                    <div className="flex flex-1 flex-col items-center px-4 py-6 text-center">
                      <h3 className="text-lg font-black tracking-wide">{s.title}</h3>
                      {s.subtitle && <p className="mt-2 max-w-sm text-[12px] leading-7 text-[#8A7A55]">{s.subtitle}</p>}
                      {s.product && (
                        <p className="mt-3 text-[12px] font-black tabular-nums text-[#E8590C]">
                          {formatPrice(s.product.discountPrice ?? s.product.price)} تومان
                        </p>
                      )}
                      <Link
                        href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                        className="rf-btn-ghost mt-5 inline-flex h-11 items-center gap-1.5 px-8 text-[11.5px] font-black"
                      >
                        مشاهدهٔ پوستر
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ — retro accordion ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="rv-faq">
            <Reveal>
              <RetroHeader icon={Radio} kicker="دفترچهٔ راهنما" title="پرسش‌های متداول" />
              <div className="rf-card mx-auto max-w-3xl p-3 sm:p-5">
                {data.faq.map((f, i) => (
                  <details key={i} className="rf-faq border-b-2 border-dashed border-[#E4D9BC] last:border-b-0">
                    <summary className="flex min-h-14 items-center gap-4 py-4">
                      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFB627]/25 text-[#E8590C]">
                        <Disc3 className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-[13px] font-black leading-6">{f.h}</span>
                      <Plus className="rf-faq-icon h-5 w-5 shrink-0 text-[#E8590C]" aria-hidden />
                    </summary>
                    <p className="pb-5 pe-6 ps-12 text-[12.5px] leading-8 text-[#6B5B39]">{f.p}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — marquee ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-6 border-t-2 border-dashed border-[#E4D9BC] px-4 py-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[10.5px] font-black uppercase tracking-[0.24em] text-[#8A7A55]">حامیان کهکشانی</p>
              <div dir="ltr" className="rf-marq rf-mask">
                <div className="rf-marq-track" style={{ "--rf-mq": "28s" } as React.CSSProperties}>
                  {[0, 1].map((g) => (
                    <div key={g} className="flex items-center" dir="rtl">
                      {data.brands.map((b) => (
                        <span key={`${g}-${b.id}`} className="flex items-center gap-3 px-6">
                          <Star className="h-3 w-3 text-[#C98A1B]/60" aria-hidden />
                          <Link
                            href={`/products?brand=${b.slug}`}
                            className="whitespace-nowrap text-[13px] font-black tracking-widest text-[#8A7A55] transition-colors hover:text-[#E8590C]"
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
            <div className="rf-dash-a relative mx-auto max-w-md bg-[#FBF5E4] p-10 text-center">
              <Disc3 className="rf-flicker mx-auto h-12 w-12 text-[#C98A1B]" aria-hidden />
              <h2 className="mt-4 text-lg font-black tracking-wide">ایستگاه در حال تجهیز است</h2>
              <p className="mt-2 text-[13px] leading-8 text-[#8A7A55]">محصولات جدید به‌زودی از مدار خارجی به این کهکشان می‌رسند…</p>
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

/* ── helpers ─────────────────────────────────────────────────────── */

const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, smartphone: Smartphone, "mobile-phones": Smartphone, phones: Smartphone,
  laptop: Laptop, laptops: Laptop, notebook: Laptop, computer: Laptop,
  headphones: Headphones, headphone: Headphones, audio: Headphones, speaker: Speaker, speakers: Speaker,
  watch: Watch, watches: Watch, "smart-watch": Watch,
  camera: Camera, cameras: Camera,
  tv: Tv, television: Tv, monitor: Laptop,
  game: Gamepad2, gaming: Gamepad2, console: Gamepad2,
  tablet: Tablet, tablets: Tablet,
  accessories: Cable, accessory: Cable,
};

function catIcon(slug: string): React.ElementType {
  return CAT_ICONS[slug] ?? Package;
}

/* bestseller row — amber rank dial + quick add */
function BestRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useRetroAdd();
  return (
    <li className="border-b-2 border-dashed border-[#E4D9BC] last:border-b-0">
      <div className="group flex min-h-14 items-center gap-4 py-4 transition-colors hover:bg-[#FFB627]/10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#E8590C]/40 bg-[#FFB627]/15 text-[12px] font-black tabular-nums text-[#B34409] transition-all duration-300 group-hover:border-[#E8590C] group-hover:shadow-[0_0_16px_rgba(255,182,39,.55)]">
          {toFaDigits(String(rank).padStart(2, "0"))}
        </span>
        <Link href={`/products/${product.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-black transition-colors group-hover:text-[#E8590C]">
          {product.name}
        </Link>
        {product.soldCount > 0 && (
          <span className="hidden shrink-0 text-[10px] font-bold tracking-widest text-[#8A7A55] tabular-nums sm:block">
            {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
          </span>
        )}
        <span className="shrink-0 text-[12.5px] font-black tabular-nums text-[#E8590C]">{formatPrice(product.effectivePrice)}</span>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-dashed transition-all",
            !product.inStock
              ? "cursor-not-allowed border-[#D8CBA4] text-[#C9BB8E]"
              : added
                ? "rf-btn border-transparent"
                : "border-[#E8590C] text-[#B34409] hover:bg-[#FFB627]/25 hover:shadow-[0_0_14px_rgba(255,182,39,.5)]"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </li>
  );
}

/* exclusive cabin add button */
function CabinAdd({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useRetroAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد خرید`}
      className={cn(
        "mt-4 flex h-11 w-full items-center justify-center gap-2 border-2 border-dashed text-[11px] font-black transition-all",
        !product.inStock
          ? "cursor-not-allowed border-[#FFB627]/20 text-[#C98A1B]/50"
          : added
            ? "rf-btn border-transparent"
            : "border-[#FFB627]/60 text-[#FFB627] hover:bg-[#FFB627]/15 hover:shadow-[0_0_16px_rgba(255,182,39,.4)]"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "اتمام موجودی"}
    </button>
  );
}

"use client";

/**
 * TEMPLATE · nova-glass — «Nova Glass Lux» (v25 full rewrite)
 * -----------------------------------------------------------------
 * Luminous cool-slate glass lux storefront (#F0F4F8→#E2E8F0 canvas):
 * translucent white panels (rgba .4–.7 + blur 20px) with rgba(255,255,255,.5)
 * hairline borders, a METALLIC silver-gradient display headline, electric
 * blue→cyan gradient CTAs & progress bars, and the signature look — large
 * floating product renders that break their container bounds with huge soft
 * blue drop shadows. Popularity bars are driven by REAL rating data.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Gem, Package, Check, ChevronLeft, Star, TrendingUp, HelpCircle,
  ShoppingCart, BadgeCheck, Sparkles, Layers, PlayCircle, Award, Flame,
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

/* ONE scoped style block — Nova Glass tokens, glass surfaces, metal text */
const NOVA_GLASS_CSS = `
[data-tpl="nova-glass"]{--nv-blue:#3B82F6;--nv-cyan:#60A5FA;--nv-ink:#1E293B;--nv-steel:#64748B}
[data-tpl="nova-glass"] .nv-glass{background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,.5);box-shadow:0 18px 50px -18px rgba(30,41,59,.16)}
[data-tpl="nova-glass"] .nv-glass-lite{background:rgba(255,255,255,.4);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.45);box-shadow:0 12px 36px -14px rgba(30,41,59,.14)}
[data-tpl="nova-glass"] .nv-metal{background:linear-gradient(105deg,#E2E8F0 0%,#FFFFFF 30%,#CBD5E1 55%,#F8FAFC 78%,#CBD5E1 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 16px rgba(30,41,59,.25));animation:nv-sheen 9s ease-in-out infinite}
[data-tpl="nova-glass"] .nv-cta{background:linear-gradient(135deg,#3B82F6 0%,#60A5FA 100%)}
[data-tpl="nova-glass"] .nv-bar{background:linear-gradient(270deg,#3B82F6 0%,#60A5FA 100%)}
[data-tpl="nova-glass"] .nv-render{filter:drop-shadow(0 42px 55px rgba(59,130,246,.38)) drop-shadow(0 10px 18px rgba(30,41,59,.18))}
[data-tpl="nova-glass"] .nv-float{animation:nv-float 7s ease-in-out infinite}
[data-tpl="nova-glass"] .nv-blink{animation:nv-blink 2.4s ease-in-out infinite}
[data-tpl="nova-glass"] .nv-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="nova-glass"] .nv-rail::-webkit-scrollbar{display:none}
[data-tpl="nova-glass"] .nv-scroll{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.35) transparent}
[data-tpl="nova-glass"] .nv-scroll::-webkit-scrollbar{width:6px}
[data-tpl="nova-glass"] .nv-scroll::-webkit-scrollbar-thumb{background:rgba(100,116,139,.3);border-radius:99px}
[data-tpl="nova-glass"] .nv-scroll::-webkit-scrollbar-track{background:transparent}
@keyframes nv-float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(-.6deg)}}
@keyframes nv-sheen{0%,100%{background-position:0% 0}50%{background-position:100% 0}}
@keyframes nv-blink{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="nova-glass"] .nv-metal,[data-tpl="nova-glass"] .nv-float,[data-tpl="nova-glass"] .nv-blink{animation:none!important}
}

/* ═══ v26fix · DARK-MODE SKIN (light glass design above untouched) ═══
   Dark canvas #131A24 / ink #E5EBF4. The white glass panels turn into
   smoked glass, steel ink lifts to readable blues — the electric
   blue→cyan CTAs, the metallic chrome headline and the deep slate
   exclusive band keep their identity. */
html.dark [data-tpl="nova-glass"]{
  --nv-canvas-top:#131A24;
  --nv-canvas-bottom:#0F1520;
  --background:#131A24;
  --foreground:#E5EBF4;
  --card:#272E37;
  --card-foreground:#E5EBF4;
  --popover:#2E343D;
  --popover-foreground:#E5EBF4;
  --secondary:#2B313A;
  --secondary-foreground:#E5EBF4;
  --muted:#242A33;
  --muted-foreground:#959CA5;
  --accent:#333941;
  --accent-foreground:#E5EBF4;
  --border:rgba(229,235,244,0.16);
  --input:rgba(229,235,244,0.22);
  --ring:#878D96;
  color:#E5EBF4;
}
/* ink ramp — deep slate → light ink, steel → cool light steel */
html.dark [data-tpl="nova-glass"] .text-\\[\\#1E293B\\]{color:#E5EBF4}
html.dark [data-tpl="nova-glass"] .text-\\[\\#64748B\\]{color:#9CA8BA}
html.dark [data-tpl="nova-glass"] .text-\\[\\#94A3B8\\]{color:#8090A6}
/* the electric blue accent lifts to its cyan sibling on dark */
html.dark [data-tpl="nova-glass"] .text-\\[\\#3B82F6\\]{color:#60A5FA}
html.dark [data-tpl="nova-glass"] .fill-\\[\\#3B82F6\\]{fill:#60A5FA}
html.dark [data-tpl="nova-glass"] .text-\\[\\#3B82F6\\]\\/40{color:rgba(96,165,250,0.5)}
html.dark [data-tpl="nova-glass"] .hover\\:text-\\[\\#3B82F6\\]:hover{color:#60A5FA}
/* glass surfaces → smoked glass */
html.dark [data-tpl="nova-glass"] .bg-white\\/50{background-color:rgba(35,45,60,0.5)}
html.dark [data-tpl="nova-glass"] .bg-white\\/55{background-color:rgba(36,46,62,0.55)}
html.dark [data-tpl="nova-glass"] .bg-white\\/60{background-color:rgba(38,49,66,0.6)}
html.dark [data-tpl="nova-glass"] .bg-white\\/70{background-color:rgba(40,50,66,0.7)}
html.dark [data-tpl="nova-glass"] .hover\\:bg-white\\/80:hover{background-color:rgba(43,54,72,0.8)}
/* light slate slabs → dark slabs (image fallbacks, disabled chips, track) */
html.dark [data-tpl="nova-glass"] .bg-\\[\\#E2E8F0\\]{background-color:#202A38}
/* scoped helpers — glass + scrollbars go dark; metal/cta/bar keep */
html.dark [data-tpl="nova-glass"] .nv-glass{background:rgba(19,26,36,0.55);-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(229,235,244,0.14);box-shadow:0 18px 50px -18px rgba(0,0,0,0.5)}
html.dark [data-tpl="nova-glass"] .nv-glass-lite{background:rgba(19,26,36,0.4);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(229,235,244,0.12);box-shadow:0 12px 36px -14px rgba(0,0,0,0.45)}
html.dark [data-tpl="nova-glass"] .nv-scroll{scrollbar-color:rgba(229,235,244,0.22) transparent}
html.dark [data-tpl="nova-glass"] .nv-scroll::-webkit-scrollbar-thumb{background:rgba(229,235,244,0.18)}
`;

/* ── section header — glass chip + blue underline rule ───────────── */
function NovaHeader({
  icon: Icon, title, subtitle, href, dark = false,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; dark?: boolean }) {
  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-[1.25rem]",
            dark ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/30" : "nv-glass-lite text-[#3B82F6]"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className={cn("truncate text-lg font-black tracking-tight md:text-xl", dark ? "text-white" : "text-[#1E293B]")}>{title}</h2>
          {subtitle && <p className={cn("mt-0.5 truncate text-xs", dark ? "text-[#94A3B8]" : "text-[#64748B]")}>{subtitle}</p>}
        </div>
        <span className="hidden h-1.5 w-14 rounded-full bg-gradient-to-l from-[#3B82F6] to-[#60A5FA] md:block" aria-hidden />
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-[1.25rem] px-4 text-xs font-black transition-all hover:-translate-y-0.5",
            dark ? "bg-white/10 text-white hover:bg-[#3B82F6]" : "nv-glass text-[#1E293B] hover:text-[#3B82F6]"
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
function useNovaAdd() {
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

/* ── glass product card ──────────────────────────────────────────── */
function NovaCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNovaAdd();
  return (
    <article className={cn("nv-glass group flex h-full flex-col rounded-[1.75rem] transition-transform duration-300 hover:-translate-y-1", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-t-[1.75rem] bg-white/50">
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
          <span className="grid h-full place-items-center text-[#94A3B8]"><Package className="h-10 w-10" aria-hidden /></span>
        )}
        {product.discountPercent > 0 && (
          <span className="nv-cta absolute start-3 top-3 rounded-full px-3 py-1 text-[10px] font-black text-white tabular-nums shadow-lg shadow-[#3B82F6]/30">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-[#1E293B]/85 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 truncate text-[10.5px] font-medium text-[#64748B]">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#3B82F6]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[#1E293B] transition-colors hover:text-[#3B82F6]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[#64748B] tabular-nums">
            <Star className="h-3 w-3 fill-[#3B82F6] text-[#3B82F6]" aria-hidden />
            {toFaDigits(product.rating.toLocaleString("fa-IR"))} · {toFaDigits(product.reviewCount.toLocaleString("fa-IR"))} نظر
          </p>
        )}
        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <p className="min-w-0">
              {product.discountPercent > 0 && (
                <span className="block text-[11px] leading-4 text-[#94A3B8] line-through tabular-nums">{formatPrice(product.price)}</span>
              )}
              <span className="text-[14px] font-black tabular-nums text-[#1E293B]">
                {formatPrice(product.effectivePrice)}
                <span className="text-[10px] font-normal text-[#64748B]"> تومان</span>
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
                  ? "cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]"
                  : added
                    ? "bg-[#1E293B] text-white"
                    : "nv-cta text-white shadow-lg shadow-[#3B82F6]/30 hover:brightness-110"
              )}
            >
              {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── dark-band collection tile (deep slate lux band) ─────────────── */
function NovaDarkTile({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNovaAdd();
  return (
    <article className={cn("group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#60A5FA]/50", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1.5rem] bg-black/30">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-[#334155]"><Gem className="h-10 w-10" aria-hidden /></span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent" aria-hidden />
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <p className="truncate text-[10px] font-medium text-[#94A3B8]">{product.brand.name}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-white line-clamp-2 transition-colors hover:text-[#93C5FD]">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0">
            {product.discountPercent > 0 && <span className="block text-[10.5px] leading-4 text-[#64748B] line-through tabular-nums">{formatPrice(product.price)}</span>}
            <span className="text-[13.5px] font-black text-white tabular-nums">
              {formatPrice(product.effectivePrice)}
              <span className="text-[9.5px] font-normal text-[#94A3B8]"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] transition-all active:scale-95",
              !product.inStock ? "cursor-not-allowed bg-white/10 text-[#64748B]" : added ? "bg-white text-[#1E293B]" : "nv-cta text-white hover:brightness-110"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ item (glass accordion, blue accent) ─────────────────────── */
function NovaFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white/60">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full nv-cta" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#1E293B]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-300", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#64748B]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function NovaGlassTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);
  /* the signature floating render — a REAL product photo when we have one */
  const heroProduct = data.exclusive[0] ?? data.featured[0] ?? data.discounted[0] ?? data.newest[0] ?? null;
  const heroRender = heroProduct?.mainImage ?? heroSlide?.image ?? null;
  const heroRenderAlt = heroProduct?.name ?? heroSlide?.title ?? "";
  const heroRenderHref = heroProduct ? `/products/${heroProduct.slug}` : heroSlide?.ctaUrl ?? "/products";
  const heroPrice = heroProduct ? heroProduct.effectivePrice : heroSlide?.product ? heroSlide.product.discountPrice ?? heroSlide.product.price : null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const chrome = TEMPLATE_CHROME["nova-glass"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  /* REAL popularity data — bestsellers sorted by rating */
  const popularity = [...data.bestsellers].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const maxRating = 5;

  const statTiles = [
    { icon: Package, label: "محصول", value: counts.products },
    { icon: Layers, label: "دسته‌بندی", value: counts.categories },
    { icon: BadgeCheck, label: "برند", value: counts.brands },
    { icon: PlayCircle, label: "استوری", value: counts.stories },
  ];

  return (
    <div
      data-template-chrome="1"
      data-tpl="nova-glass"
      className="isolate w-full text-[#1E293B]"
      style={{ background: "linear-gradient(180deg,var(--nv-canvas-top,#F0F4F8) 0%,var(--nv-canvas-bottom,#E2E8F0) 100%)" }}
    >
      <style>{NOVA_GLASS_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px]">
        {/* ═══ HERO — glass lux panel + render breaking the bounds ═══ */}
        <motion.section {...rise} transition={{ type: "spring", stiffness: 55, damping: 15 }} className="relative px-4 pb-28 pt-10 sm:px-4" aria-labelledby="nv-hero">
          <div className="nv-glass relative rounded-[2.5rem] px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              {/* copy — metallic display headline */}
              <div className="lg:col-span-7">
                <span className="nv-glass-lite inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black text-[#3B82F6]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  نوا گلس لوکس
                </span>
                <h1 id="nv-hero" className="nv-metal mt-6 text-[2.6rem] font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.2rem]">
                  {store.storeName}
                </h1>
                <p dir="ltr" className="mt-3 text-[11px] font-bold uppercase tracking-[0.42em] text-[#64748B]">{store.storeNameEn}</p>
                <p className="mt-6 max-w-lg text-[13.5px] leading-8 text-[#64748B]">
                  {store.announcementActive && store.announcement
                    ? store.announcement
                    : "رفاقتِ نور و شیشه — محصولاتی که از قاب بیرون می‌زنند تا از نزدیک لمسشان کنید."}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/products" className="nv-cta flex h-12 items-center gap-2 rounded-[1.25rem] px-7 text-sm font-black text-white shadow-xl shadow-[#3B82F6]/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]">
                    <ShoppingCart className="h-4 w-4" aria-hidden />
                    ورود به ویترین
                  </Link>
                  <Link href="/products?sort=bestselling" className="nv-glass flex h-12 items-center gap-2 rounded-[1.25rem] px-7 text-sm font-black text-[#1E293B] transition-all hover:-translate-y-0.5 hover:text-[#3B82F6]">
                    <TrendingUp className="h-4 w-4 text-[#3B82F6]" aria-hidden />
                    محبوب‌ترین‌ها
                  </Link>
                </div>
              </div>

              {/* the floating render — breaks the glass panel bounds */}
              <div className="relative lg:col-span-5">
                {heroRender ? (
                  <Link href={heroRenderHref} aria-label={heroRenderAlt} className="group relative block">
                    <motion.div
                      {...rise}
                      transition={{ delay: 0.12, type: "spring", stiffness: 50, damping: 14 }}
                      className="nv-render nv-float relative z-[1] -mt-4 lg:-mt-24 lg:-mb-28"
                    >
                      <span className="relative block aspect-square">
                        <Image src={heroRender} alt={heroRenderAlt} fill priority sizes="(max-width: 1024px) 88vw, 42vw" className="object-contain transition-transform duration-500 group-hover:scale-[1.04]" />
                      </span>
                    </motion.div>
                  </Link>
                ) : (
                  <div className="grid aspect-square place-items-center text-[#94A3B8]">
                    <Package className="h-16 w-16" aria-hidden />
                  </div>
                )}
              </div>
            </div>

            {/* floating glass price / rating chips over the render */}
            {heroPrice != null && (
              <motion.div {...rise} transition={{ delay: 0.25 }} className="nv-glass nv-float absolute bottom-10 end-10 z-[2] hidden items-baseline gap-1.5 rounded-[1.25rem] px-5 py-3 sm:flex">
                <span className="text-[17px] font-black tabular-nums text-[#3B82F6]">{formatPrice(heroPrice)}</span>
                <span className="text-[10px] font-medium text-[#64748B]">تومان</span>
              </motion.div>
            )}
            {heroProduct && heroProduct.rating > 0 && (
              <motion.div {...rise} transition={{ delay: 0.32 }} className="nv-glass absolute end-10 top-10 z-[2] hidden items-center gap-2 rounded-full px-4 py-2.5 md:flex">
                <Star className="h-4 w-4 fill-[#3B82F6] text-[#3B82F6]" aria-hidden />
                <span className="text-[12px] font-black tabular-nums text-[#1E293B]">{toFaDigits(heroProduct.rating.toLocaleString("fa-IR"))}</span>
                <span className="text-[10px] text-[#64748B]">({toFaDigits(heroProduct.reviewCount.toLocaleString("fa-IR"))} نظر)</span>
              </motion.div>
            )}
          </div>

          {/* glass stat tiles — REAL counts */}
          <motion.dl {...rise} transition={{ delay: 0.2 }} className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statTiles.map((s) => (
              <div key={s.label} className="nv-glass group relative overflow-hidden rounded-[1.75rem] p-5">
                <s.icon className="h-6 w-6 text-[#3B82F6]" aria-hidden />
                <dd className="mt-3 text-2xl font-black tabular-nums text-[#1E293B] sm:text-3xl">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                <dt className="mt-1 text-[11px] font-medium text-[#64748B]">{s.label}</dt>
                <span className="nv-bar absolute inset-x-0 bottom-0 h-1" aria-hidden />
              </div>
            ))}
          </motion.dl>
        </motion.section>

        {/* ═══ HERO SLIDE — cinema glass media panel ═══ */}
        {heroSlide && heroProduct && (
          <section className="px-4 py-6" aria-label="اسلاید ویژه">
            <Reveal>
              <Link href={heroSlide.ctaUrl ?? "/products"} className="group relative block overflow-hidden rounded-[2.5rem]">
                <span className="relative block aspect-[21/9] min-h-56 bg-[#E2E8F0]">
                  <SlideArt slide={heroSlide} alt={heroSlide.title} fill sizes="92vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </span>
                <span className="nv-glass absolute bottom-5 start-5 end-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] p-5">
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-black text-[#1E293B]">{heroSlide.title}</span>
                    {heroSlide.subtitle && <span className="mt-1 block truncate text-[11.5px] text-[#64748B]">{heroSlide.subtitle}</span>}
                  </span>
                  {heroSlide.ctaText && (
                    <span className="nv-cta shrink-0 rounded-full px-5 py-2.5 text-[11px] font-black text-white">
                      {heroSlide.ctaText}
                    </span>
                  )}
                </span>
              </Link>
            </Reveal>
          </section>
        )}

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="px-4 py-10" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <NovaHeader icon={PlayCircle} title="استوری‌های شیشه‌ای" subtitle="لحظه‌های زنده فروشگاه" />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ POPULARITY — real rating bars ═══ */}
        {popularity.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-pop">
            <Reveal>
              <NovaHeader icon={TrendingUp} title="محبوبیت بر اساس امتیاز" subtitle="نمودار واقعی از امتیاز مشتریان" href="/products?sort=rating" />
              <div className="nv-glass rounded-[2rem] p-5 sm:p-7">
                <ul className="space-y-5">
                  {popularity.map((p, i) => (
                    <li key={p.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5">
                      <span className={cn("grid h-10 w-10 place-items-center rounded-[1rem] text-[13px] font-black tabular-nums", i < 3 ? "nv-cta text-white" : "bg-white/70 text-[#64748B]")}>
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/products/${p.slug}`} className="min-w-0 truncate text-[12.5px] font-bold text-[#1E293B] transition-colors hover:text-[#3B82F6]">
                            {p.name}
                          </Link>
                          <span className="flex shrink-0 items-center gap-2 text-[11px] text-[#64748B] tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-[#3B82F6] text-[#3B82F6]" aria-hidden />
                            <b className="font-black text-[#1E293B]">{toFaDigits(p.rating.toLocaleString("fa-IR"))}</b>
                            <span className="text-[#94A3B8]">({toFaDigits(p.reviewCount.toLocaleString("fa-IR"))} نظر)</span>
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]" role="img" aria-label={`امتیاز ${p.rating} از ۵`}>
                          <div className="nv-bar h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(4, Math.round((p.rating / maxRating) * 100))}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES — glass photo tiles ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-10" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <NovaHeader icon={Layers} title="قفسه‌های اصلی" subtitle="دسته‌بندی‌های فروشگاه" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="nv-glass group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-[#94A3B8]"><Layers className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E293B]/65 via-[#1E293B]/10 to-transparent" aria-hidden />
                    <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-black text-white drop-shadow">{c.name}</span>
                        <span className="text-[10px] font-medium text-white/75 tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} محصول</span>
                      </span>
                      <span className="nv-cta grid h-8 w-8 shrink-0 place-items-center rounded-full text-white">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED — glass case cards ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-featured">
            <Reveal>
              <NovaHeader icon={Star} title="ویترین ویژه" subtitle="سردبورای قفسه اول" href="/products?sort=rating" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <NovaCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED — blue-gradient deal cards ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-deals">
            <Reveal>
              <NovaHeader icon={Flame} title="پیشنهادهای نوا" subtitle="تخفیف‌های فعال این هفته" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <NovaCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — deep slate lux band ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-exclusive">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1E293B] p-5 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -top-24 end-[12%] h-72 w-72 rounded-full bg-[#3B82F6]/30 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 start-[8%] h-56 w-56 rounded-full bg-[#60A5FA]/20 blur-3xl" />
                <NovaHeader dark icon={Gem} title="کالکشن انحصاری نوا" subtitle="فقط برای مشتریان تاج" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.exclusive.slice(0, 4).map((p) => (
                    <NovaDarkTile key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES + extra slides — glass media banners ═══ */}
        {(data.showcases.length > 0 || extraSlides.length > 0) && (
          <section className="px-4 py-10" aria-label="ویترین‌های ویژه">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <Link key={s.id} href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")} className="group relative block overflow-hidden rounded-[2.5rem]">
                    <span className="relative block aspect-[16/9] bg-[#E2E8F0]">
                      <Image src={s.image} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    </span>
                    <span className="nv-glass absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-[1.75rem] p-5">
                      <span className="min-w-0">
                        <span className="block truncate text-[16px] font-black text-[#1E293B]">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block line-clamp-1 text-[11.5px] text-[#64748B]">{s.subtitle}</span>}
                      </span>
                      {s.product && (
                        <span className="nv-cta shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black text-white tabular-nums">
                          {formatPrice(s.product.discountPrice ?? s.product.price)}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
                {extraSlides.slice(0, 2 - Math.min(data.showcases.length, 2)).map((s) => (
                  <Link key={s.id} href={s.ctaUrl ?? "/products"} className="group relative block overflow-hidden rounded-[2.5rem]">
                    <span className="relative block aspect-[16/9] bg-[#E2E8F0]">
                      <SlideArt slide={s} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </span>
                    <span className="nv-glass absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-[1.75rem] p-5">
                      <span className="min-w-0">
                        <span className="block truncate text-[16px] font-black text-[#1E293B]">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block line-clamp-1 text-[11.5px] text-[#64748B]">{s.subtitle}</span>}
                      </span>
                      {s.product && (
                        <span className="nv-cta shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black text-white tabular-nums">
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

        {/* ═══ NEWEST ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-newest">
            <Reveal>
              <NovaHeader icon={Sparkles} title="تازه‌های ورودی" subtitle="آخرین محصولات رسیده" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <NovaCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS — glass ledger with quick-add ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-best">
            <Reveal>
              <NovaHeader icon={Award} title="پرفروش‌های نوا" subtitle="انتخاب واقعی مشتریان" href="/products?sort=bestselling" />
              <div className="nv-scroll nv-glass max-h-96 overflow-y-auto rounded-[2rem] p-3 sm:p-4">
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <BestsellerRow key={p.id} product={p} rank={i + 1} />
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nv-faq">
            <Reveal>
              <NovaHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="هر چه لازم است بدانید" />
              <div className="nv-glass space-y-3 rounded-[2rem] p-4">
                {data.faq.map((f, i) => (
                  <NovaFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS — glass logo tiles ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-2 px-4 pb-16" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-5 text-center text-[11px] font-black tracking-[0.3em] text-[#64748B]">همکاران لوکس ما</p>
              <ul className="nv-rail flex flex-wrap justify-center gap-2.5">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link href={`/products?brand=${b.slug}`} className="nv-glass flex h-14 items-center gap-2.5 rounded-[1.25rem] px-5 text-[12.5px] font-black text-[#1E293B] transition-all hover:-translate-y-0.5 hover:text-[#3B82F6]">
                      {b.logo ? (
                        <span className="relative block h-8 w-8 overflow-hidden rounded-lg bg-white/70">
                          <Image src={b.logo} alt={b.name} fill sizes="32px" className="object-contain p-0.5" />
                        </span>
                      ) : b.image ? (
                        <span className="relative block h-8 w-8 overflow-hidden rounded-lg bg-white/70">
                          <Image src={b.image} alt={b.name} fill sizes="32px" className="object-cover" />
                        </span>
                      ) : (
                        <BadgeCheck className="h-4 w-4 text-[#3B82F6]" aria-hidden />
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
            <div className="nv-glass rounded-[2.5rem] p-16 text-center">
              <Gem className="mx-auto mb-4 h-12 w-12 text-[#3B82F6]/40" aria-hidden />
              <h2 className="text-lg font-black">ویترین شیشه‌ای در حال آماده‌سازی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#64748B]">به‌زودی اولین رندرهای شناور اینجا فرود می‌آیند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── bestseller ledger row with quick-add ────────────────────────── */
function BestsellerRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { addToCart, added } = useNovaAdd();
  return (
    <li className="group flex min-w-0 items-center gap-3 rounded-[1.5rem] bg-white/55 p-3 transition-colors hover:bg-white/80">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] text-[13px] font-black tabular-nums", rank <= 3 ? "nv-cta text-white" : "bg-[#E2E8F0] text-[#64748B]")}>
        {rank.toLocaleString("fa-IR")}
      </span>
      <Link href={`/products/${product.slug}`} className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-white/60" aria-hidden>
        {product.mainImage ? (
          <Image src={product.mainImage} alt="" fill sizes="48px" className="object-contain p-1" />
        ) : (
          <span className="grid h-full place-items-center text-[#94A3B8]"><Package className="h-5 w-5" /></span>
        )}
      </Link>
      <span className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="block truncate text-[12.5px] font-bold text-[#1E293B] transition-colors hover:text-[#3B82F6]">
          {product.name}
        </Link>
        <span className="text-[11px] font-black text-[#64748B] tabular-nums">
          {formatPrice(product.effectivePrice)} تومان · {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
        </span>
      </span>
      <button
        type="button"
        onClick={() => addToCart(product)}
        disabled={!product.inStock}
        aria-label={`افزودن ${product.name} به سبد`}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] transition-all active:scale-95",
          !product.inStock ? "cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]" : added ? "bg-[#1E293B] text-white" : "nv-cta text-white hover:brightness-110"
        )}
      >
        {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
      </button>
    </li>
  );
}

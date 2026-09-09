"use client";

/**
 * TEMPLATE · nexora-tech — «Nexora Cyber-Minimal» (v25 full rewrite)
 * -------------------------------------------------------------------
 * Soft-lavender (#EDE9F6) minimal-cyber canvas. Deep #1A1A2E feature band,
 * purple blob orbs (#A78BFA→#7C3AED) breathing behind the hero, a floating
 * 3D-ish angled product collage with big soft shadows, big right-aligned
 * display type (RTL-natural), a REAL stats strip (tabular-nums) and ONE
 * signature accent used sparingly: electric lime #D4FF00 — pill CTAs,
 * rail arrows and price tags only.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkle, Truck, ShieldCheck, Headphones, CreditCard, Package, Check,
  ChevronLeft, ChevronRight, Star, TrendingUp, HelpCircle, ShoppingCart,
  BadgeCheck, Layers, Gem, Flame,
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

/* ONE scoped style block — Nexora tokens, orbs, lime accents, floats */
const NEXORA_CSS = `
[data-tpl="nexora-tech"]{--nx-lime:#D4FF00;--nx-ink:#1A1A2E;--nx-p1:#A78BFA;--nx-p2:#7C3AED}
[data-tpl="nexora-tech"] .nx-white{background:#FFFFFF;border:1px solid rgba(26,26,46,.08);box-shadow:0 14px 40px -18px rgba(26,26,46,.14)}
[data-tpl="nexora-tech"] .nx-dark{background:#1A1A2E}
[data-tpl="nexora-tech"] .nx-lime-btn{background:#D4FF00;color:#1A1A2E;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
[data-tpl="nexora-tech"] .nx-lime-btn:hover{filter:brightness(1.05)}
[data-tpl="nexora-tech"] .nx-tag{background:#D4FF00;color:#1A1A2E}
[data-tpl="nexora-tech"] .nx-orb{filter:blur(70px);will-change:transform}
[data-tpl="nexora-tech"] .nx-drift{animation:nx-drift 16s ease-in-out infinite alternate}
[data-tpl="nexora-tech"] .nx-drift-2{animation:nx-drift 22s ease-in-out -6s infinite alternate-reverse}
[data-tpl="nexora-tech"] .nx-float{animation:nx-float 6.5s ease-in-out infinite}
[data-tpl="nexora-tech"] .nx-float-2{animation:nx-float 7.5s ease-in-out -2s infinite}
[data-tpl="nexora-tech"] .nx-float-3{animation:nx-float 8.5s ease-in-out -4s infinite}
[data-tpl="nexora-tech"] .nx-shadow{box-shadow:0 36px 70px -22px rgba(124,58,237,.38),0 12px 28px -12px rgba(26,26,46,.22)}
[data-tpl="nexora-tech"] .nx-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="nexora-tech"] .nx-rail::-webkit-scrollbar{display:none}
[data-tpl="nexora-tech"] .nx-scroll{scrollbar-width:thin;scrollbar-color:rgba(26,26,46,.22) transparent}
[data-tpl="nexora-tech"] .nx-scroll::-webkit-scrollbar{width:6px}
[data-tpl="nexora-tech"] .nx-scroll::-webkit-scrollbar-thumb{background:rgba(26,26,46,.18);border-radius:99px}
[data-tpl="nexora-tech"] .nx-scroll::-webkit-scrollbar-track{background:transparent}
@keyframes nx-float{0%,100%{transform:translateY(0) rotate(var(--nx-rot,0deg))}50%{transform:translateY(-14px) rotate(var(--nx-rot,0deg))}}
@keyframes nx-drift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(40px,26px) scale(1.12)}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="nexora-tech"] .nx-drift,[data-tpl="nexora-tech"] .nx-drift-2,[data-tpl="nexora-tech"] .nx-float,[data-tpl="nexora-tech"] .nx-float-2,[data-tpl="nexora-tech"] .nx-float-3{animation:none!important}
}

/* ═══ v26fix · DARK-MODE SKIN (light lavender design above untouched) ═══
   Dark canvas #14141F / ink #E9EAF2. White cards & lavender tints become
   dark translucent surfaces; the lime #D4FF00 accent, the deep #1A1A2E
   feature bands and the purple orbs keep their identity. */
html.dark [data-tpl="nexora-tech"]{
  --background:#14141F;
  --foreground:#E9EAF2;
  --card:#282832;
  --card-foreground:#E9EAF2;
  --popover:#2F2F39;
  --popover-foreground:#E9EAF2;
  --secondary:#2C2C35;
  --secondary-foreground:#E9EAF2;
  --muted:#24242F;
  --muted-foreground:#9899A2;
  --accent:#34343D;
  --accent-foreground:#E9EAF2;
  --border:rgba(233,234,242,0.16);
  --input:rgba(233,234,242,0.22);
  --ring:#898A93;
  background-color:#14141F;
  color:#E9EAF2;
}
/* ink ramp — every #1A1A2E alpha step becomes translucent ink */
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]{color:#E9EAF2}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/25{color:rgba(233,234,242,0.27)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/30{color:rgba(233,234,242,0.32)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/35{color:rgba(233,234,242,0.37)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/40{color:rgba(233,234,242,0.42)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/45{color:rgba(233,234,242,0.47)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/50{color:rgba(233,234,242,0.54)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/55{color:rgba(233,234,242,0.6)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/60{color:rgba(233,234,242,0.66)}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#1A1A2E\\]\\/65{color:rgba(233,234,242,0.7)}
/* lavender surfaces → dark */
html.dark [data-tpl="nexora-tech"] .bg-\\[\\#EDE9F6\\]{background-color:#23232F}
html.dark [data-tpl="nexora-tech"] .bg-\\[\\#EDE9F6\\]\\/60{background-color:rgba(233,234,242,0.05)}
html.dark [data-tpl="nexora-tech"] .bg-\\[\\#EDE9F6\\]\\/50{background-color:rgba(233,234,242,0.04)}
html.dark [data-tpl="nexora-tech"] .hover\\:bg-\\[\\#EDE9F6\\]:hover{background-color:rgba(233,234,242,0.08)}
/* ink-alpha chips, dots & hairlines */
html.dark [data-tpl="nexora-tech"] .bg-\\[\\#1A1A2E\\]\\/10{background-color:rgba(233,234,242,0.08)}
html.dark [data-tpl="nexora-tech"] .border-\\[\\#1A1A2E\\]\\/15{border-color:rgba(233,234,242,0.16)}
html.dark [data-tpl="nexora-tech"] .border-\\[\\#1A1A2E\\]\\/10,
html.dark [data-tpl="nexora-tech"] .sm\\:border-\\[\\#1A1A2E\\]\\/10{border-color:rgba(233,234,242,0.12)}
/* white surfaces → dark */
html.dark [data-tpl="nexora-tech"] .bg-white{background-color:#23232F}
html.dark [data-tpl="nexora-tech"] .bg-white\\/50{background-color:rgba(233,234,242,0.06)}
/* purple accent lifted for the dark canvas */
html.dark [data-tpl="nexora-tech"] .text-\\[\\#7C3AED\\]{color:#A78BFA}
html.dark [data-tpl="nexora-tech"] .bg-\\[\\#7C3AED\\]{background-color:#A78BFA}
html.dark [data-tpl="nexora-tech"] .fill-\\[\\#7C3AED\\]{fill:#A78BFA}
html.dark [data-tpl="nexora-tech"] .text-\\[\\#7C3AED\\]\\/40{color:rgba(167,139,250,0.55)}
html.dark [data-tpl="nexora-tech"] .hover\\:text-\\[\\#7C3AED\\]:hover{color:#A78BFA}
html.dark [data-tpl="nexora-tech"] .hover\\:border-\\[\\#7C3AED\\]\\/40:hover{border-color:rgba(167,139,250,0.4)}
/* scoped helpers → dark surfaces (lime tags/buttons + nx-dark bands stay) */
html.dark [data-tpl="nexora-tech"] .nx-white{background:#1E1E2B;border:1px solid rgba(233,234,242,0.1);box-shadow:0 14px 40px -18px rgba(0,0,0,0.55)}
html.dark [data-tpl="nexora-tech"] .nx-shadow{box-shadow:0 36px 70px -22px rgba(124,58,237,0.4),0 12px 28px -12px rgba(0,0,0,0.5)}
html.dark [data-tpl="nexora-tech"] .nx-scroll{scrollbar-color:rgba(233,234,242,0.22) transparent}
html.dark [data-tpl="nexora-tech"] .nx-scroll::-webkit-scrollbar-thumb{background:rgba(233,234,242,0.18)}
`;

/* ── section header — dark square chip + lime tick ───────────────── */
function NexoraHeader({
  icon: Icon, title, subtitle, href, dark = false,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; dark?: boolean }) {
  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-[1rem]", dark ? "bg-[#D4FF00] text-[#1A1A2E]" : "nx-dark text-[#A78BFA]")}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className={cn("truncate text-lg font-black tracking-tight md:text-xl", dark ? "text-white" : "text-[#1A1A2E]")}>{title}</h2>
          {subtitle && <p className={cn("mt-0.5 truncate text-xs", dark ? "text-white/50" : "text-[#1A1A2E]/55")}>{subtitle}</p>}
        </div>
        <span className="hidden h-2 w-2 rounded-full bg-[#D4FF00] md:block" aria-hidden />
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black transition-all hover:-translate-y-0.5",
            dark ? "bg-white/10 text-white hover:bg-[#D4FF00] hover:text-[#1A1A2E]" : "nx-white text-[#1A1A2E] hover:text-[#7C3AED]"
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
function useNexoraAdd() {
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

/* ── white minimal product card with a lime price tag ────────────── */
function NexoraCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNexoraAdd();
  return (
    <article className={cn("nx-white group flex h-full flex-col rounded-[1.5rem] p-3.5 transition-transform duration-300 hover:-translate-y-1", !product.inStock && "grayscale-[0.4]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1.25rem] bg-[#EDE9F6]/60">
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
          <span className="grid h-full place-items-center text-[#1A1A2E]/25"><Package className="h-10 w-10" aria-hidden /></span>
        )}
        {product.discountPercent > 0 && (
          <span className="nx-tag absolute start-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪−
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[#1A1A2E]/85 py-1.5 text-center text-[10px] font-bold text-white">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-[#1A1A2E]/50">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#7C3AED]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 line-clamp-2 text-[#1A1A2E] transition-colors hover:text-[#7C3AED]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-[#1A1A2E]/50 tabular-nums">
            <Star className="h-3 w-3 fill-[#7C3AED] text-[#7C3AED]" aria-hidden />
            {toFaDigits(product.rating.toLocaleString("fa-IR"))} · {toFaDigits(product.reviewCount.toLocaleString("fa-IR"))} نظر
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[10px] leading-4 text-[#1A1A2E]/35 line-through tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className="nx-tag inline-flex items-baseline gap-1 rounded-[0.7rem] px-2.5 py-1 text-[12.5px] font-black tabular-nums">
              {formatPrice(product.effectivePrice)}
              <span className="text-[9px] font-medium">تومان</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all active:scale-95",
              !product.inStock
                ? "cursor-not-allowed bg-[#1A1A2E]/10 text-[#1A1A2E]/30"
                : added
                  ? "nx-dark text-[#D4FF00]"
                  : "nx-dark text-white hover:text-[#D4FF00]"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ item (white minimal accordion) ──────────────────────────── */
function NexoraFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", open ? "bg-[#D4FF00]" : "bg-[#7C3AED]")} />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#1A1A2E]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#1A1A2E]/40 transition-transform duration-300", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#1A1A2E]/60">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function NexoraTechTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;
  const railRef = useRef<HTMLDivElement>(null);
  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 2);
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  /* collage products (2–3 real renders) */
  const collage = [data.featured[0], data.discounted[0] ?? data.bestsellers[0], data.featured[1] ?? data.newest[0]]
    .filter(Boolean)
    .slice(0, 3) as TemplateProduct[];

  const railProducts = Array.from(
    new Map([...data.bestsellers, ...data.discounted].map((p) => [p.id, p])).values()
  ).slice(0, 12);

  const chrome = TEMPLATE_CHROME["nexora-tech"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  const railNext = () => railRef.current?.scrollBy({ left: -368, behavior: "smooth" });
  const railPrev = () => railRef.current?.scrollBy({ left: 368, behavior: "smooth" });

  const stats = [
    { label: "محصول", value: counts.products },
    { label: "دسته‌بندی", value: counts.categories },
    { label: "برند", value: counts.brands },
    { label: "استوری", value: counts.stories },
  ];

  return (
    <div data-template-chrome="1" data-tpl="nexora-tech" className="isolate w-full bg-[#EDE9F6] text-[#1A1A2E]">
      <style>{NEXORA_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px] overflow-visible">
        {/* ═══ HERO — lavender field, purple orbs, angled collage ═══ */}
        <motion.section {...rise} transition={{ type: "spring", stiffness: 55, damping: 15 }} className="relative px-4 pb-10 pt-6" aria-labelledby="nx-hero">
          {/* purple blob orbs behind the hero content */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <span className="nx-orb nx-drift absolute -top-16 start-[2%] h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, rgba(167,139,250,.55), rgba(124,58,237,.35) 70%, transparent)" }} />
            <span className="nx-orb nx-drift-2 absolute top-24 end-[-4%] h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle at 60% 40%, rgba(167,139,250,.45), rgba(124,58,237,.25) 70%, transparent)" }} />
            <span className="nx-orb nx-drift absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle at 50% 50%, rgba(196,181,253,.5), transparent 70%)" }} />
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* big right-aligned display type (RTL-natural) */}
            <div>
              <span className="nx-dark inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black text-white">
                <span className="h-2 w-2 rounded-full bg-[#D4FF00]" aria-hidden />
                نکسورا سایبر-مینیمال
              </span>
              <h1 id="nx-hero" className="mt-6 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                {store.storeName}
              </h1>
              <p dir="ltr" className="mt-4 text-[11px] font-bold uppercase tracking-[0.4em] text-[#1A1A2E]/40">{store.storeNameEn}</p>
              <p className="mt-6 max-w-xl text-[13.5px] leading-8 text-[#1A1A2E]/65">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : "مینیمالِ آرام، سایبرِ دقیق — تکنولوژی را با هوش و سبک انتخاب کنید."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/products" className="nx-lime-btn flex h-12 items-center gap-2 rounded-full px-7 text-sm font-black shadow-[0_14px_36px_-12px_rgba(212,255,0,.55)] active:scale-[0.98]">
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  شروع خرید
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/products?discount=1" className="flex h-12 items-center gap-2 rounded-full border border-[#1A1A2E]/15 bg-white/50 px-7 text-sm font-black text-[#1A1A2E] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:text-[#7C3AED]">
                  <Flame className="h-4 w-4 text-[#7C3AED]" aria-hidden />
                  تخفیف‌ها
                </Link>
              </div>

              {/* REAL stats strip */}
              <dl className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                {stats.map((s, i) => (
                  <div key={s.label} className={cn("flex items-baseline gap-2", i > 0 && "sm:border-e sm:border-[#1A1A2E]/10 sm:pe-6")}>
                    <dd className="text-2xl font-black tabular-nums sm:text-3xl">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                    <dt className="text-[11px] font-medium text-[#1A1A2E]/50">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {/* floating 3D-ish product collage */}
            <div className="relative h-[380px] sm:h-[440px] lg:h-[480px]">
              {collage.length >= 1 && collage[0].mainImage && (
                <motion.div {...rise} transition={{ delay: 0.1 }} className="absolute inset-x-[16%] top-[8%] z-[2]">
                  <Link href={`/products/${collage[0].slug}`} aria-label={collage[0].name} className="nx-white nx-shadow nx-float block rounded-[2rem] p-6 [--nx-rot:3deg]">
                    <span className="relative block aspect-square">
                      <Image src={collage[0].mainImage} alt={collage[0].name} fill priority sizes="(max-width: 1024px) 70vw, 34vw" className="object-contain" />
                    </span>
                    <span className="nx-tag mt-4 inline-flex rounded-full px-3.5 py-1.5 text-[12px] font-black tabular-nums">
                      {formatPrice(collage[0].effectivePrice)} تومان
                    </span>
                  </Link>
                </motion.div>
              )}
              {collage.length >= 2 && collage[1]?.mainImage && (
                <motion.div {...rise} transition={{ delay: 0.22 }} className="absolute start-0 bottom-[16%] z-[1] w-[38%]">
                  <Link href={`/products/${collage[1].slug}`} aria-label={collage[1].name} className="nx-white nx-shadow nx-float-2 block rounded-[1.5rem] p-4 [--nx-rot:-8deg]">
                    <span className="relative block aspect-square">
                      <Image src={collage[1].mainImage} alt={collage[1].name} fill sizes="38vw" className="object-contain" loading="lazy" />
                    </span>
                  </Link>
                </motion.div>
              )}
              {collage.length >= 3 && collage[2]?.mainImage && (
                <motion.div {...rise} transition={{ delay: 0.34 }} className="absolute end-0 top-0 z-[1] w-[34%]">
                  <Link href={`/products/${collage[2].slug}`} aria-label={collage[2].name} className="nx-white nx-shadow nx-float-3 block rounded-[1.5rem] p-4 [--nx-rot:7deg]">
                    <span className="relative block aspect-square">
                      <Image src={collage[2].mainImage} alt={collage[2].name} fill sizes="34vw" className="object-contain" loading="lazy" />
                    </span>
                  </Link>
                </motion.div>
              )}
              {collage.length === 0 && heroSlide && (
                <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="nx-white nx-shadow nx-float absolute inset-x-[12%] top-[10%] block overflow-hidden rounded-[2rem]">
                  <span className="relative block aspect-[4/3]">
                    <SlideArt slide={heroSlide} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 76vw, 42vw" className="object-cover" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </motion.section>

        {/* ═══ deep #1A1A2E feature band ═══ */}
        <section className="px-4 py-8" aria-label="خدمات کلیدی">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { icon: Truck, t: "ارسال سریع", d: "تحویل امن به سراسر کشور" },
                { icon: ShieldCheck, t: "گارانتی اصالت", d: "ضمانت رسمی کالاهای دیجیتال" },
                { icon: Headphones, t: "پشتیبانی ۲۴/۷", d: "مشاور تخصصی قبل از خرید" },
                { icon: CreditCard, t: "پرداخت امن", d: "درگاه مطمئن و چند مرحله‌ای" },
              ].map((f) => (
                <div key={f.t} className="nx-dark group rounded-[1.5rem] p-5 transition-transform duration-300 hover:-translate-y-1">
                  <span className="grid h-10 w-10 place-items-center rounded-[0.9rem] bg-white/10 text-[#A78BFA] transition-colors group-hover:bg-[#D4FF00] group-hover:text-[#1A1A2E]">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-[13.5px] font-black text-white">{f.t}</h3>
                  <p className="mt-1 text-[10.5px] leading-5 text-white/50">{f.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ hero slide banner (when the collage took the hero) ═══ */}
        {heroSlide && collage.length > 0 && (
          <section className="px-4 py-8" aria-label="بنر ویژه">
            <Reveal>
              <Link href={heroSlide.ctaUrl ?? "/products"} className="nx-white group relative block overflow-hidden rounded-[2rem]">
                <span className="relative block aspect-[21/9] min-h-52 bg-[#EDE9F6]">
                  <SlideArt slide={heroSlide} alt={heroSlide.title} fill sizes="92vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </span>
                <span className="nx-dark absolute bottom-5 start-5 flex max-w-[80%] items-center gap-4 rounded-[1.5rem] px-5 py-4">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-black text-white">{heroSlide.title}</span>
                    {heroSlide.subtitle && <span className="mt-0.5 block truncate text-[10.5px] text-white/55">{heroSlide.subtitle}</span>}
                  </span>
                  {heroSlide.ctaText && <span className="nx-tag shrink-0 rounded-full px-4 py-2 text-[10.5px] font-black">{heroSlide.ctaText}</span>}
                </span>
              </Link>
            </Reveal>
          </section>
        )}

        {/* ═══ STORIES ═══ */}
        {stories.length > 0 && (
          <section className="px-4 py-10" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <NexoraHeader icon={Sparkle} title="استوری‌های نکسورا" subtitle="برای دیدن، لمس کنید" />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ CATEGORIES ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-10" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <NexoraHeader icon={Layers} title="شاخه‌های فروشگاه" subtitle="دسته‌بندی‌های اصلی" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="nx-white group relative block overflow-hidden rounded-[1.5rem]">
                    <span className="relative block aspect-[4/3] bg-[#EDE9F6]/60">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-[#1A1A2E]/25"><Layers className="h-10 w-10" aria-hidden /></span>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2 p-3.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-black text-[#1A1A2E]">{c.name}</span>
                        <span className="text-[10px] text-[#1A1A2E]/50 tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} محصول</span>
                      </span>
                      <span className="nx-dark grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#A78BFA] transition-colors group-hover:bg-[#D4FF00] group-hover:text-[#1A1A2E]">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BEST RAIL — horizontal scroll + lime circular arrows ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-rail">
            <Reveal>
              <div className="mb-7 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="nx-dark grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] text-[#A78BFA]">
                    <TrendingUp className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 id="nx-rail" className="truncate text-lg font-black tracking-tight md:text-xl">برترین انتخاب‌های تاج</h2>
                    <p className="mt-0.5 truncate text-xs text-[#1A1A2E]/55">پرفروش‌های واقعی این ماه</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={railPrev}
                    aria-label="اسلاید قبلی"
                    className="nx-dark grid h-11 w-11 place-items-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={railNext}
                    aria-label="اسلاید بعدی"
                    className="nx-lime-btn grid h-11 w-11 place-items-center rounded-full shadow-[0_10px_28px_-10px_rgba(212,255,0,.6)] active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>
              <div ref={railRef} className="nx-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2" role="list" aria-label="ریل برترین محصولات">
                {railProducts.map((p) => (
                  <div key={p.id} className="w-56 shrink-0 snap-start sm:w-60" role="listitem">
                    <NexoraCard product={p} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[10.5px] text-[#1A1A2E]/40 sm:hidden">برای دیدن همه، به چپ بکشید</p>
            </Reveal>
          </section>
        )}

        {/* ═══ FEATURED ═══ */}
        {data.featured.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-featured">
            <Reveal>
              <NexoraHeader icon={Star} title="ویترین نکسورا" subtitle="برجسته‌های منتخب" href="/products?sort=rating" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.featured.slice(0, 8).map((p) => (
                  <NexoraCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ DISCOUNTED ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-deals">
            <Reveal>
              <NexoraHeader icon={Flame} title="پیشنهادهای لیمویی" subtitle="تخفیف‌های فعال این هفته" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <NexoraCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ EXCLUSIVE — deep dark band ═══ */}
        {data.exclusive.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-exclusive">
            <Reveal>
              <div className="nx-dark relative overflow-hidden rounded-[2.5rem] p-5 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -top-20 start-[18%] h-64 w-64 rounded-full bg-[#7C3AED]/40 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 end-[8%] h-56 w-56 rounded-full bg-[#A78BFA]/25 blur-3xl" />
                <NexoraHeader dark icon={Gem} title="انحصاری نکسورا" subtitle="فقط اینجا پیدا می‌شوند" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.exclusive.slice(0, 4).map((p) => (
                    <article key={p.id} className={cn("group flex h-full flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#D4FF00]/40", !p.inStock && "grayscale-[0.4]")}>
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square overflow-hidden rounded-[1.25rem] bg-black/30">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-[#A78BFA]"><Gem className="h-10 w-10" aria-hidden /></span>
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                        <p className="truncate text-[10px] font-medium text-white/40">{p.brand.name}</p>
                        <Link href={`/products/${p.slug}`} className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-white line-clamp-2 transition-colors hover:text-[#A78BFA]">
                          {p.name}
                        </Link>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                          <span className="nx-tag inline-flex items-baseline gap-1 rounded-[0.7rem] px-2.5 py-1 text-[12px] font-black tabular-nums">
                            {formatPrice(p.effectivePrice)}
                            <span className="text-[9px] font-medium">تومان</span>
                          </span>
                          <QuickAddDark product={p} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ SHOWCASES + extra slide ═══ */}
        {(data.showcases.length > 0 || extraSlides.length > 0) && (
          <section className="px-4 py-10" aria-label="ویترین‌های ویژه">
            <Reveal>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.showcases.slice(0, 2).map((s) => (
                  <Link key={s.id} href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")} className="nx-white group relative block overflow-hidden rounded-[2rem]">
                    <span className="relative block aspect-[16/9] bg-[#EDE9F6]/60">
                      <Image src={s.image} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    </span>
                    <span className="nx-dark absolute bottom-5 start-5 end-5 flex items-center justify-between gap-4 rounded-[1.5rem] p-5">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-black text-white">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block line-clamp-1 text-[11px] text-white/55">{s.subtitle}</span>}
                      </span>
                      {s.product && (
                        <span className="nx-tag shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black tabular-nums">
                          {formatPrice(s.product.discountPrice ?? s.product.price)}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
                {extraSlides.slice(0, 2 - Math.min(data.showcases.length, 2)).map((s) => (
                  <Link key={s.id} href={s.ctaUrl ?? "/products"} className="nx-white group relative block overflow-hidden rounded-[2rem]">
                    <span className="relative block aspect-[16/9] bg-[#EDE9F6]/60">
                      <SlideArt slide={s} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </span>
                    <span className="nx-dark absolute bottom-5 start-5 end-5 flex items-center justify-between gap-4 rounded-[1.5rem] p-5">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-black text-white">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block line-clamp-1 text-[11px] text-white/55">{s.subtitle}</span>}
                      </span>
                      {s.product && (
                        <span className="nx-tag shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black tabular-nums">
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
          <section className="px-4 py-10" aria-labelledby="nx-newest">
            <Reveal>
              <NexoraHeader icon={Sparkle} title="تازه‌های رسیده" subtitle="جدیدترین ورودی‌ها" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <NexoraCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BESTSELLERS ledger — lime ranks ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-best">
            <Reveal>
              <NexoraHeader icon={TrendingUp} title="جدول پرفروش‌ها" subtitle="رتبه واقعی بر اساس فروش" href="/products?sort=bestselling" />
              <div className="nx-scroll nx-white max-h-96 overflow-y-auto rounded-[2rem] p-3 sm:p-4">
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <li key={p.id} className="group flex min-w-0 items-center gap-3 rounded-[1.25rem] bg-[#EDE9F6]/50 p-3 transition-colors hover:bg-[#EDE9F6]">
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-black tabular-nums", i < 3 ? "nx-tag" : "nx-dark text-[#A78BFA]")}>
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                      {p.mainImage && (
                        <Link href={`/products/${p.slug}`} className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-white" aria-hidden>
                          <Image src={p.mainImage} alt="" fill sizes="48px" className="object-contain p-1" />
                        </Link>
                      )}
                      <span className="min-w-0 flex-1">
                        <Link href={`/products/${p.slug}`} className="block truncate text-[12.5px] font-bold text-[#1A1A2E] transition-colors hover:text-[#7C3AED]">
                          {p.name}
                        </Link>
                        <span className="text-[11px] font-black text-[#1A1A2E]/50 tabular-nums">
                          {formatPrice(p.effectivePrice)} تومان · {toFaDigits(p.soldCount.toLocaleString("fa-IR"))} فروش
                        </span>
                      </span>
                      <QuickAddInline product={p} />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="nx-faq">
            <Reveal>
              <NexoraHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="پاسخ‌های کوتاه و دقیق" />
              <div className="nx-white space-y-3 rounded-[2rem] p-4">
                {data.faq.map((f, i) => (
                  <NexoraFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ BRANDS ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-2 px-4 pb-16" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-5 text-center text-[11px] font-black tracking-[0.3em] text-[#1A1A2E]/45">برندهای همکار نکسورا</p>
              <ul className="nx-rail flex flex-wrap justify-center gap-2.5">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link href={`/products?brand=${b.slug}`} className="nx-white flex h-11 items-center gap-2 rounded-full px-5 text-[12.5px] font-black text-[#1A1A2E] transition-all hover:-translate-y-0.5 hover:text-[#7C3AED]">
                      {b.logo ? (
                        <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-[#EDE9F6]">
                          <Image src={b.logo} alt={b.name} fill sizes="28px" className="object-contain p-0.5" />
                        </span>
                      ) : (
                        <BadgeCheck className="h-4 w-4 text-[#7C3AED]" aria-hidden />
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
            <div className="nx-white rounded-[2rem] p-16 text-center">
              <Sparkle className="mx-auto mb-4 h-12 w-12 text-[#7C3AED]/40" aria-hidden />
              <h2 className="text-lg font-black">ویترین نکسورا هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#1A1A2E]/55">به‌زودی اولین محصولات روی این بوم بنفش می‌نشینند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

/* ── quick-add on the dark band (lime confirm state) ─────────────── */
function QuickAddDark({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNexoraAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد`}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all active:scale-95",
        !product.inStock ? "cursor-not-allowed bg-white/10 text-white/30" : added ? "nx-lime-btn" : "bg-white/10 text-white hover:bg-[#D4FF00] hover:text-[#1A1A2E]"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
    </button>
  );
}

/* ── inline quick-add for the ledger rows ────────────────────────── */
function QuickAddInline({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useNexoraAdd();
  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={!product.inStock}
      aria-label={`افزودن ${product.name} به سبد`}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all active:scale-95",
        !product.inStock ? "cursor-not-allowed bg-[#1A1A2E]/10 text-[#1A1A2E]/30" : added ? "nx-tag" : "nx-dark text-white hover:text-[#D4FF00]"
      )}
    >
      {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
    </button>
  );
}

"use client";

/**
 * TEMPLATE · taj-electronics-pro — «Taj Electronics Pro» (v35 vertical)
 * ------------------------------------------------------------------------
 * LIGHT premium tech commerce (NovaTech style): pure-white canvas #FFFFFF,
 * ink #1A1A24 and ONE violet accent gradient #7C3AED→#6D28D9 (buttons,
 * badges, price accents) — no other blue/indigo anywhere.
 *
 * Signature = an asymmetric two-column hero on a soft gradient-mesh panel
 * (pale lavender #F5F3FF → peach #FFF7ED) with two morphing blurred
 * organic blobs, a big floating product render (drop-shadow + slight
 * rotation + bob), a circular «فقط … تومان» price badge and a secondary
 * floating mini-card. Then: trust strip → photo category cards →
 * bestsellers horizontal snap rail → dual promo banners → newest grid →
 * red sale section with live countdown chip → brand chips → FAQ accordion
 * → violet contact/CTA band. Fully RTL, dark-mode skin included
 * (white → #23242B charcoal, ink → #ECEDF2, violet lifts to #A78BFA).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShoppingCart, Package, Check, ChevronLeft, Star, HelpCircle, Rocket,
  ShieldCheck, Headphones, BadgeCheck, Sparkles, TrendingUp, Layers, Cpu,
  Zap, Timer, Phone, Flame,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideHeroMedia } from "./slide-media";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ONE scoped style block — violet tokens, mesh, blobs, shimmer, pills */
const TAJ_CSS = `
[data-tpl="taj-electronics-pro"]{--taj-violet:#7C3AED;--taj-violet-deep:#6D28D9;--taj-ink:#1A1A24}
[data-tpl="taj-electronics-pro"] .taj-cta{background:linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
[data-tpl="taj-electronics-pro"] .taj-cta:hover{filter:brightness(1.07)}
[data-tpl="taj-electronics-pro"] .taj-added{background:#1A1A24;color:#FFFFFF}
[data-tpl="taj-electronics-pro"] .taj-mesh{background:linear-gradient(120deg,#F5F3FF 0%,#FFF7ED 100%)}
[data-tpl="taj-electronics-pro"] .taj-blob{border-radius:42% 58% 60% 40%/45% 40% 60% 55%;animation:taj-morph 13s ease-in-out infinite}
[data-tpl="taj-electronics-pro"] .taj-bob{animation:taj-bob 6s ease-in-out infinite}
[data-tpl="taj-electronics-pro"] .taj-bob-2{animation:taj-bob 7.5s ease-in-out 1.2s infinite}
[data-tpl="taj-electronics-pro"] .taj-render{filter:drop-shadow(0 32px 44px rgba(124,58,237,.32)) drop-shadow(0 10px 16px rgba(26,26,36,.18))}
[data-tpl="taj-electronics-pro"] .taj-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="taj-electronics-pro"] .taj-rail::-webkit-scrollbar{display:none}
[data-tpl="taj-electronics-pro"] .taj-shimmer{background:linear-gradient(110deg,rgba(124,58,237,.12) 8%,rgba(124,58,237,.32) 18%,rgba(124,58,237,.12) 33%);background-size:200% 100%;animation:taj-shimmer 2.6s linear infinite}
@keyframes taj-morph{
  0%,100%{border-radius:42% 58% 60% 40%/45% 40% 60% 55%}
  33%{border-radius:58% 42% 45% 55%/55% 60% 40% 45%}
  66%{border-radius:50% 50% 38% 62%/40% 55% 45% 60%}
}
@keyframes taj-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes taj-shimmer{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="taj-electronics-pro"] .taj-blob,
  [data-tpl="taj-electronics-pro"] .taj-bob,
  [data-tpl="taj-electronics-pro"] .taj-bob-2,
  [data-tpl="taj-electronics-pro"] .taj-shimmer{animation:none!important}
}

/* ═══ DARK-MODE SKIN (light premium canvas above untouched) ═══
   Canvas #191922 / ink #ECEDF2. White cards → soft charcoal #23242B,
   gray-50 wells → #2A2B33, cool grays lift; the violet accent, red sale
   badges and amber stars keep their color (violet lifts to #A78BFA). */
html.dark [data-tpl="taj-electronics-pro"]{
  --background:#191922;
  --foreground:#ECEDF2;
  --card:#23242B;
  --card-foreground:#ECEDF2;
  --popover:#2A2B33;
  --popover-foreground:#ECEDF2;
  --secondary:#2A2B33;
  --secondary-foreground:#ECEDF2;
  --muted:#232429;
  --muted-foreground:#9B9CA6;
  --accent:#2E2F39;
  --accent-foreground:#ECEDF2;
  --border:rgba(236,237,242,0.15);
  --input:rgba(236,237,242,0.2);
  --ring:#8B8D98;
  background-color:#191922;
  color:#ECEDF2;
}
/* ink ramp — near-black → light ink, cool grays lifted */
html.dark [data-tpl="taj-electronics-pro"] .text-\\[\\#1A1A24\\]{color:#ECEDF2}
html.dark [data-tpl="taj-electronics-pro"] .text-\\[\\#6B7280\\]{color:#A8ADB4}
html.dark [data-tpl="taj-electronics-pro"] .text-\\[\\#9CA3AF\\]{color:#8B9199}
html.dark [data-tpl="taj-electronics-pro"] .text-gray-400{color:#6C7278}
html.dark [data-tpl="taj-electronics-pro"] .text-gray-300{color:#5B6167}
/* violet re-declared AFTER the gray ramp so accents keep beating the
   (higher-specificity) ink overrides                                   */
html.dark [data-tpl="taj-electronics-pro"] .text-\\[\\#7C3AED\\]{color:#A78BFA}
html.dark [data-tpl="taj-electronics-pro"] .text-\\[\\#6D28D9\\]{color:#A78BFA}
/* white cards → charcoal; wells & chips step up in elevation */
html.dark [data-tpl="taj-electronics-pro"] .bg-white{background-color:#23242B}
html.dark [data-tpl="taj-electronics-pro"] .bg-white\\/95{background-color:rgba(35,36,43,0.95)}
html.dark [data-tpl="taj-electronics-pro"] .bg-white\\/90{background-color:rgba(35,36,43,0.92)}
html.dark [data-tpl="taj-electronics-pro"] .bg-\\[\\#F9FAFB\\]{background-color:#2A2B33}
html.dark [data-tpl="taj-electronics-pro"] .bg-gray-50{background-color:#2A2B33}
html.dark [data-tpl="taj-electronics-pro"] .bg-gray-100{background-color:#2A2B33}
/* hairlines */
html.dark [data-tpl="taj-electronics-pro"] .border-\\[\\#E5E7EB\\],
html.dark [data-tpl="taj-electronics-pro"] .border-gray-200{border-color:rgba(236,237,242,0.13)}
html.dark [data-tpl="taj-electronics-pro"] .border-gray-100{border-color:rgba(236,237,242,0.08)}
/* violet tint chips gain a little alpha so they read on charcoal */
html.dark [data-tpl="taj-electronics-pro"] .bg-\\[\\#F5F3FF\\]{background-color:rgba(124,58,237,0.16)}
/* empty star fills step down */
html.dark [data-tpl="taj-electronics-pro"] .fill-\\[\\#E5E7EB\\]{fill:#3A3B45}
/* hover/group-hover states that must keep beating the overrides above */
html.dark [data-tpl="taj-electronics-pro"] .hover\\:text-\\[\\#7C3AED\\]:hover{color:#A78BFA}
html.dark [data-tpl="taj-electronics-pro"] .hover\\:border-\\[\\#7C3AED\\]\\/40:hover{border-color:rgba(167,139,250,0.4)}
html.dark [data-tpl="taj-electronics-pro"] .hover\\:border-\\[\\#7C3AED\\]\\/50:hover{border-color:rgba(167,139,250,0.5)}
html.dark [data-tpl="taj-electronics-pro"] .group-hover\\:bg-\\[\\#7C3AED\\]:is(:where(.group):hover *){background-color:#7C3AED}
html.dark [data-tpl="taj-electronics-pro"] .group-hover\\:text-white:is(:where(.group):hover *){color:#FFFFFF}
/* avatar rings + mesh go dark-aware */
html.dark [data-tpl="taj-electronics-pro"] .border-white{border-color:#23242B}
html.dark [data-tpl="taj-electronics-pro"] .taj-mesh{background:linear-gradient(120deg,#221D31 0%,#252028 60%,#241E1A 100%)}
/* the "added" pill inverts (ink is light now) */
html.dark [data-tpl="taj-electronics-pro"] .taj-added{background:#ECEDF2;color:#191922}
`;

/* ── section header — violet eyebrow + big display title ─────────── */
function TajHeader({
  icon: Icon, title, eyebrow, href,
}: { icon: React.ElementType; title: string; eyebrow?: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {eyebrow ?? "فروشگاه"}
        </p>
        <h2 className="truncate text-2xl font-black tracking-tight text-[#1A1A24] md:text-[1.7rem]">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-5 text-xs font-black text-[#1A1A24] transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/50 hover:text-[#7C3AED]"
        >
          همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useTajAdd() {
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

/* ── amber rating stars (5-star row + numeric) ───────────────────── */
function TajStars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (rating <= 0) return null;
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <p className="mt-1.5 flex items-center gap-1" aria-label={`امتیاز ${toFaDigits(rating.toLocaleString("fa-IR"))} از ۵`}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn("h-3 w-3", i < full ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-[#E5E7EB] text-[#E5E7EB]")} />
        ))}
      </span>
      <b className="text-[10px] font-black text-[#6B7280] tabular-nums">{toFaDigits(rating.toLocaleString("fa-IR"))}</b>
      <span className="text-[9.5px] text-[#9CA3AF] tabular-nums">({toFaDigits(reviewCount.toLocaleString("fa-IR"))})</span>
    </p>
  );
}

/* ── product card — white rounded pill button, violet hover shadow ─ */
function TajCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useTajAdd();
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-[1.25rem] border border-[#E5E7EB] bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[#7C3AED]/40 hover:shadow-[0_20px_48px_-20px_rgba(124,58,237,.45)]",
        !product.inStock && "grayscale-[0.35]",
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1rem] bg-[#F9FAFB]">
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
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[#1A1A24]/85 py-1.5 text-center text-[10px] font-bold text-white">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-[#9CA3AF]">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#7C3AED]" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[#1A1A24] transition-colors hover:text-[#7C3AED]">
          {product.name}
        </Link>
        <TajStars rating={product.rating} reviewCount={product.reviewCount} />
        <div className="mt-auto pt-3">
          <p className="flex min-h-5 items-center justify-between gap-2">
            {product.discountPercent > 0 ? (
              <>
                <span className="text-[10.5px] leading-4 text-[#9CA3AF] line-through tabular-nums">{formatPrice(product.price)}</span>
                <span className="rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[10px] font-black text-[#EF4444] tabular-nums">
                  {product.discountPercent.toLocaleString("fa-IR")}٪−
                </span>
              </>
            ) : (
              <span />
            )}
          </p>
          <p className="text-[14.5px] font-black tabular-nums text-[#1A1A24]">
            {formatPrice(product.effectivePrice)}
            <span className="text-[10px] font-normal text-[#9CA3AF]"> تومان</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد`}
          className={cn(
            "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[12px] font-black transition-all active:scale-[0.97]",
            !product.inStock
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : added
                ? "taj-added"
                : "taj-cta text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,.6)]",
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
          {added ? "افزوده شد ✓" : "افزودن به سبد"}
        </button>
      </div>
    </article>
  );
}

/* ── FAQ item (clean accordion, violet caret) ─────────────────────── */
function TajFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#E5E7EB] bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F5F3FF] text-[10px] font-black text-[#7C3AED]">
          {toFaDigits(n + 1)}
        </span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#1A1A24]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform duration-300", open ? "-rotate-90 text-[#7C3AED]" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#6B7280]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ── hydration-safe countdown (red deal chip) ──────────────────────
 * iso = store.timerEndsAt (v25 override) OR the first deal's own
 * discountEndsAt; null → to-midnight default. Never read during SSR. */
const tajPad2 = (n: number) => String(n).padStart(2, "0");

function useTajCountdown(iso: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    let target: number;
    if (iso) {
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) return;
      target = t;
    } else {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      target = end.getTime();
    }
    const tick = () => setLeft(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

function TajDealTimer({ iso }: { iso: string | null }) {
  const left = useTajCountdown(iso);
  const ended = left !== null && left <= 0;
  const v =
    left === null
      ? { h: "—", m: "—", s: "—" }
      : ended
        ? { h: "۰۰", m: "۰۰", s: "۰۰" }
        : {
            h: toFaDigits(tajPad2(Math.floor(left / 3_600_000))),
            m: toFaDigits(tajPad2(Math.floor((left % 3_600_000) / 60_000))),
            s: toFaDigits(tajPad2(Math.floor((left % 60_000) / 1000))),
          };
  return (
    <span dir="ltr" role="timer" aria-label="زمان باقی‌مانده تا پایان حراج" className="inline-flex items-center gap-1.5 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 px-3.5 py-1.5 text-[11px] font-black tabular-nums text-[#EF4444]">
      <Timer className="h-3.5 w-3.5" aria-hidden />
      {v.h}:{v.m}:{v.s}
    </span>
  );
}

/* ══ TEMPLATE ══════════════════════════════════════════════════════ */
export function TajElectronicsProTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const stories: StoryItem[] = data.stories;

  /* hero wiring — slides[0] first, product images as floating render,
   * every array may be EMPTY (always fall back gracefully) */
  const heroSlide = data.slides[0] ?? null;
  const heroRenderProduct = heroSlide?.product ?? null;
  const heroFallback = data.featured[0] ?? data.bestsellers[0] ?? data.newest[0] ?? null;
  const heroImg = heroRenderProduct?.mainImage ?? heroFallback?.mainImage ?? null;
  const heroName = heroRenderProduct?.name ?? heroFallback?.name ?? null;
  const heroHref = heroRenderProduct
    ? `/products/${heroRenderProduct.slug}`
    : heroFallback
      ? `/products/${heroFallback.slug}`
      : "/products";
  const heroPrice = heroRenderProduct
    ? heroRenderProduct.discountPrice ?? heroRenderProduct.price
    : heroFallback
      ? heroFallback.effectivePrice
      : null;
  const miniProduct =
    data.featured[1] ?? data.bestsellers.find((p) => p.id !== heroFallback?.id) ?? data.newest[1] ?? null;
  const dealIso = store.timerEndsAt ?? data.discounted.find((p) => p.discountEndsAt)?.discountEndsAt ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  const chrome = TEMPLATE_CHROME["taj-electronics-pro"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  const trust = [
    { icon: Rocket, t: "ارسال سریع", d: "تحویل ۲۴ تا ۷۲ ساعته" },
    { icon: ShieldCheck, t: "پرداخت امن", d: "درگاه پرداخت معتبر" },
    { icon: BadgeCheck, t: "ضمانت اصالت", d: "۱۰۰٪ کالای اورجینال" },
    { icon: Headphones, t: "پشتیبانی ۲۴/۷", d: "پاسخگویی شبانه‌روزی" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="taj-electronics-pro" dir="rtl" className="isolate w-full bg-white text-[#1A1A24]">
      <style>{TAJ_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="relative mx-auto w-full max-w-[1280px]">

        {/* ═══ ② HERO — asymmetric two-column on gradient-mesh ═══ */}
        <motion.section {...rise} transition={{ type: "spring", stiffness: 55, damping: 15 }} className="px-4 pb-10 pt-6 sm:px-6" aria-labelledby="taj-hero">
          <div className="taj-mesh relative overflow-hidden rounded-[2.5rem] px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            {/* two blurred organic blobs over the mesh */}
            <span aria-hidden className="taj-blob absolute -start-24 -top-24 h-80 w-80 bg-[#7C3AED]/20 blur-3xl" />
            <span aria-hidden className="taj-blob absolute -bottom-28 -end-24 h-96 w-96 bg-[#F97316]/20 blur-3xl" />

            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              {/* RIGHT column (RTL start) — copy */}
              <motion.div {...rise} transition={{ delay: 0.08 }}>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F97316]/12 px-4 py-2 text-[11px] font-black text-[#F97316]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  جدید رسید
                </span>
                <h1 id="taj-hero" className="mt-6 text-4xl font-black leading-[1.14] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                  {heroSlide?.title?.trim() || "فناوری فردا، امروز"}
                </h1>
                <span aria-hidden className="taj-shimmer mt-5 block h-1.5 w-28 rounded-full" />
                <p className="mt-5 max-w-xl text-[13.5px] leading-8 text-[#6B7280]">
                  {heroSlide?.subtitle?.trim() || (store.announcementActive && store.announcement) ||
                    `پرچمدارهای دیجیتال، گجت‌های هوشمند و لوازم جانبی اورجینال با ضمانت اصالت و ارسال سریع، همه در ${store.storeName}.`}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={heroSlide?.ctaUrl ?? "/products"} className="taj-cta flex h-12 items-center gap-2 rounded-full px-8 text-sm font-black text-white shadow-[0_16px_40px_-14px_rgba(124,58,237,.6)] active:scale-[0.98]">
                    <ShoppingCart className="h-4 w-4" aria-hidden />
                    خرید کن
                  </Link>
                  <Link href="/products" className="flex h-12 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-8 text-sm font-black text-[#1A1A24] transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/50 hover:text-[#7C3AED]">
                    مشاهده محصولات
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                {/* social proof row */}
                <div className="mt-9 flex items-center gap-3">
                  <div className="flex items-center">
                    {[
                      { ch: "م", bg: "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9]" },
                      { ch: "س", bg: "bg-gradient-to-br from-[#6D28D9] to-[#4C1D95]" },
                      { ch: "ن", bg: "bg-gradient-to-br from-[#F59E0B] to-[#D97706]" },
                    ].map((a, i) => (
                      <span key={a.ch} aria-hidden className={cn("grid h-10 w-10 place-items-center rounded-full border-2 border-white text-[12px] font-black text-white", a.bg, i > 0 && "-ms-3")}>
                        {a.ch}
                      </span>
                    ))}
                  </div>
                  <p className="text-[12px] font-medium text-[#6B7280]">
                    <b className="font-black text-[#1A1A24]">+{toFaDigits(1200)}</b> مشتری خوشحال
                  </p>
                </div>
              </motion.div>

              {/* LEFT column (RTL end) — floating product render */}
              <motion.div {...rise} transition={{ delay: 0.18 }} className="relative">
                <div className="relative mx-auto aspect-square w-full max-w-[440px]">
                  {/* halo ring behind the render */}
                  <span aria-hidden className="absolute inset-4 rounded-full border-2 border-dashed border-[#7C3AED]/25" />
                  <span aria-hidden className="taj-blob absolute inset-8 bg-[#7C3AED]/10 blur-2xl" />

                  {heroImg ? (
                    <Link href={heroHref} aria-label={heroName ?? "محصول ویژه"} className="taj-bob absolute inset-0 z-[2] grid place-items-center">
                      <span className="taj-render relative block h-[86%] w-[86%] rotate-[3deg]">
                        <Image src={heroImg} alt={heroName ?? ""} fill priority sizes="(max-width: 1024px) 76vw, 42vw" className="object-contain" />
                      </span>
                    </Link>
                  ) : heroSlide ? (
                    <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="taj-bob absolute inset-4 z-[2]">
                      <span className="relative block h-full rotate-[2deg] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-24px_rgba(26,26,36,.4)]">
                        <SlideHeroMedia slide={heroSlide} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 76vw, 42vw" className="object-cover" />
                      </span>
                    </Link>
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[#7C3AED]/25">
                      <Cpu className="h-24 w-24" aria-hidden />
                    </span>
                  )}

                  {/* circular price badge */}
                  {heroPrice !== null && (
                    <motion.div {...rise} transition={{ delay: 0.28 }} className="absolute -top-3 end-1 z-[3] sm:end-4">
                      <Link
                        href={heroHref}
                        aria-label={`قیمت فقط ${formatPrice(heroPrice)} تومان`}
                        className="grid h-24 w-24 place-items-center rounded-full border border-[#E5E7EB] bg-white text-center shadow-[0_18px_40px_-16px_rgba(26,26,36,.3)] transition-transform hover:scale-105 sm:h-28 sm:w-28"
                      >
                        <span>
                          <span className="block text-[9.5px] font-bold text-[#9CA3AF]">فقط</span>
                          <span className="block text-[11px] font-black leading-4 tabular-nums text-[#7C3AED]">{formatPrice(heroPrice)}</span>
                          <span className="block text-[9px] text-[#9CA3AF]">تومان</span>
                        </span>
                      </Link>
                    </motion.div>
                  )}

                  {/* small secondary floating card */}
                  {miniProduct?.mainImage && (
                    <motion.div {...rise} transition={{ delay: 0.34 }}>
                      <Link
                        href={`/products/${miniProduct.slug}`}
                        aria-label={miniProduct.name}
                        className="taj-bob-2 absolute -bottom-5 start-0 z-[3] hidden w-52 items-center gap-2.5 rounded-[1.25rem] border border-[#E5E7EB] bg-white/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(26,26,36,.28)] backdrop-blur sm:flex"
                      >
                        <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[0.9rem] bg-[#F9FAFB]">
                          <Image src={miniProduct.mainImage} alt={miniProduct.name} fill sizes="48px" className="object-contain p-1" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[10.5px] font-bold text-[#1A1A24]">{miniProduct.name}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[9.5px] font-black text-[#7C3AED] tabular-nums">
                            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" aria-hidden />
                            {toFaDigits(miniProduct.rating.toLocaleString("fa-IR"))} · پرفروش
                          </span>
                        </span>
                      </Link>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* mini stats strip on the mesh (never hardcodes the name) */}
            <dl className="relative mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/60 pt-6">
              {[
                { label: "محصول", value: counts.products },
                { label: "دسته‌بندی", value: counts.categories },
                { label: "برند", value: counts.brands },
                { label: "استوری", value: counts.stories },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <dd className="text-xl font-black tabular-nums text-[#1A1A24] sm:text-2xl">{toFaDigits(s.value.toLocaleString("fa-IR"))}</dd>
                  <dt className="text-[10.5px] font-medium text-[#6B7280]">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </motion.section>

        {/* ═══ ③ trust strip ═══ */}
        <section className="px-4 py-8" aria-label="مزیت‌های فروشگاه">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {trust.map((f) => (
                <div key={f.t} className="flex items-center gap-3 rounded-[1.25rem] border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#7C3AED]/40">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-black text-[#1A1A24]">{f.t}</span>
                    <span className="block truncate text-[10.5px] text-[#9CA3AF]">{f.d}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ stories (only when the store has any) ═══ */}
        {stories.length > 0 && (
          <section className="px-4 py-8" aria-label="استوری‌های فروشگاه">
            <Reveal>
              <TajHeader icon={Sparkles} title="استوری‌های فروشگاه" eyebrow="برای دیدن، لمس کنید" />
              <StoriesRow stories={stories} />
            </Reveal>
          </section>
        )}

        {/* ═══ ④ categories — photo cards grid ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-10" aria-label="دسته‌بندی‌ها">
            <Reveal>
              <TajHeader icon={Layers} title="دسته‌بندی‌های فروشگاه" eyebrow="خرید بر اساس دسته" href="/products" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.categories.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    className="group block overflow-hidden rounded-[1.25rem] border border-[#E5E7EB] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#7C3AED]/40 hover:shadow-[0_20px_44px_-20px_rgba(124,58,237,.4)]"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden bg-[#F9FAFB]">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center text-[#7C3AED]/30"><Layers className="h-10 w-10" aria-hidden /></span>
                      )}
                      <span className="absolute bottom-2.5 end-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9.5px] font-black text-[#6B7280] tabular-nums backdrop-blur">
                        {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 p-3.5">
                      <span className="min-w-0 truncate text-[13px] font-black text-[#1A1A24]">{c.name}</span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F5F3FF] text-[#7C3AED] transition-colors group-hover:bg-[#7C3AED] group-hover:text-white">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑤ bestsellers — horizontal snap rail ═══ */}
        {data.bestsellers.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="taj-best">
            <Reveal>
              <TajHeader icon={TrendingUp} title="پرفروش‌های این هفته" eyebrow="محبوب‌ترین‌ها" href="/products?sort=bestselling" />
              <div className="taj-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
                {data.bestsellers.slice(0, 10).map((p) => (
                  <div key={p.id} className="w-56 shrink-0 snap-start sm:w-60">
                    <TajCard product={p} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑥ dual promo banners — gradient overlays ═══ */}
        {data.showcases.length > 0 && (
          <section className="px-4 py-10" aria-label="بنرهای تبلیغاتی">
            <Reveal>
              <div className={cn("grid grid-cols-1 gap-6", data.showcases.length > 1 && "lg:grid-cols-2")}>
                {data.showcases.slice(0, 2).map((s, i) => (
                  <Link
                    key={s.id}
                    href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-[2rem] p-7 text-white sm:p-9"
                  >
                    {s.image ? (
                      <Image src={s.image} alt={s.title} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <span aria-hidden className="taj-cta absolute inset-0" />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0",
                        i === 0
                          ? "bg-gradient-to-t from-[#6D28D9]/95 via-[#6D28D9]/40 to-[#1A1A24]/25"
                          : "bg-gradient-to-t from-[#1A1A24]/95 via-[#1A1A24]/50 to-[#1A1A24]/15",
                      )}
                    />
                    <span className="relative z-[1] max-w-[75%]">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black tracking-wide backdrop-blur">
                        <Flame className="h-3 w-3" aria-hidden />
                        پیشنهاد ویژه
                      </span>
                      <span className="mt-3 block text-2xl font-black leading-snug">{s.title}</span>
                      {s.subtitle && <span className="mt-2 block text-[12px] leading-6 text-white/80">{s.subtitle}</span>}
                    </span>
                    <span className="relative z-[1] mt-6 flex items-center justify-between gap-4">
                      <span className="flex h-11 items-center gap-1.5 rounded-full bg-white px-6 text-xs font-black text-[#6D28D9] transition-transform group-hover:-translate-y-0.5">
                        {s.product ? "خرید با تخفیف" : "مشاهده کنید"}
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                      {s.product && (
                        <span className="rounded-full bg-white/15 px-4 py-2 text-[12px] font-black text-white tabular-nums backdrop-blur">
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

        {/* ═══ ⑦ newest — 3/4 col grid ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="taj-new">
            <Reveal>
              <TajHeader icon={Sparkles} title="جدیدترین‌ها" eyebrow="تازه رسیده‌ها" href="/products?sort=newest" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.newest.slice(0, 8).map((p) => (
                  <TajCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑧ discounted — red sale badges + countdown chip ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="taj-deals">
            <Reveal>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.22em] text-[#EF4444]">
                    <Zap className="h-3.5 w-3.5" aria-hidden />
                    حراج
                  </p>
                  <h2 id="taj-deals" className="truncate text-2xl font-black tracking-tight text-[#1A1A24] md:text-[1.7rem]">تخفیف‌های ویژه</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-[11px] font-black text-[#EF4444] sm:inline">تا پایان:</span>
                  <TajDealTimer iso={dealIso} />
                  <Link href="/products?discount=1" className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 text-xs font-black text-[#1A1A24] transition-all hover:-translate-y-0.5 hover:border-[#EF4444]/50 hover:text-[#EF4444]">
                    همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <TajCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑨ brands strip ═══ */}
        {data.brands.length > 0 && (
          <section className="mt-2 px-4 pb-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[#9CA3AF]">برندهای کنار ما</p>
              <ul className="taj-rail flex flex-wrap justify-center gap-3">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="flex h-12 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 text-[12.5px] font-black text-[#1A1A24] transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/50 hover:text-[#7C3AED]"
                    >
                      {b.logo ? (
                        <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-[#F9FAFB]">
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

        {/* ═══ ⑩ FAQ accordion ═══ */}
        {data.faq.length > 0 && (
          <section className="px-4 py-10" aria-labelledby="taj-faq">
            <Reveal>
              <TajHeader icon={HelpCircle} title="پرسش‌های متداول" eyebrow="سوالات شما" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.faq.map((f, i) => (
                  <TajFaq key={i} h={f.h} p={f.p} n={i} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑪ contact / CTA band (violet gradient) ═══ */}
        <section className="px-4 py-10 pb-16" aria-label="تماس با فروشگاه">
          <Reveal>
            <div className="taj-cta relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-white sm:px-12">
              <span aria-hidden className="taj-blob absolute -start-24 -top-24 h-72 w-72 bg-white/15 blur-2xl" />
              <span aria-hidden className="taj-blob absolute -bottom-28 -end-20 h-80 w-80 bg-[#F5F3FF]/25 blur-2xl" />
              <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-lg">
                  <h2 className="text-2xl font-black leading-snug md:text-[1.8rem]">خرید امن از {store.storeName}</h2>
                  <p className="mt-3 text-[12.5px] leading-7 text-white/80">
                    تیم پشتیبانی ما آماده پاسخگویی به سؤالات شما درباره محصولات، سفارش‌ها و ارسال است؛ کالای اورجینال با ضمانت اصالت به دستتان می‌رسد.
                  </p>
                  {store.phone && (
                    <p dir="ltr" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-black tabular-nums backdrop-blur">
                      <Phone className="h-4 w-4" aria-hidden />
                      {toFaDigits(store.phone)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/products" className="flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-[#6D28D9] transition-transform hover:-translate-y-0.5">
                    مشاهده محصولات
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link href="/contact" className="flex h-12 items-center gap-2 rounded-full border border-white/40 px-7 text-sm font-black text-white transition-colors hover:bg-white/10">
                    تماس با ما
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* empty state — nothing seeded yet */}
        {!hasAnyProduct && (
          <section className="px-4 pb-24">
            <div className="rounded-[2.5rem] border border-[#E5E7EB] bg-white p-16 text-center">
              <Cpu className="mx-auto mb-4 h-12 w-12 text-[#7C3AED]/40" aria-hidden />
              <h2 className="text-lg font-black text-[#1A1A24]">ویترین فروشگاه هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#6B7280]">به‌زودی محصولات تازه اینجا می‌نشینند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

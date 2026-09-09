"use client";

/**
 * TEMPLATE · purple-mall — «پرپل نئون مال» (v25 · GameUp-style rewrite)
 * ---------------------------------------------------------------------
 * A deep-purple neon MALL on #1A1025 / #251B35 surfaces with magenta
 * (#D946EF) → violet (#8B5CF6) → cyan (#06B6D4) gradients.
 *
 * Signature pieces:
 *  - neon RING CAROUSEL hero — rotating conic-gradient ring framing the
 *    active slide art, orbit brand chips, ۰۱/۰۵ neon dots
 *  - circular badge carousel of categories — glowing double-ring borders
 *  - dense product MOSAIC (mixed tile spans) with gradient buy buttons
 *  - NUMBERED bestsellers ۰۱–۰۸ with glowing outline digits
 *  - exclusive glass rail, scan-grid texture, violet aurora washes
 *
 * The whole template family (chrome included) is forced into the purple
 * void palette by overriding the theme CSS vars inside the scoped <style>.
 * No registered features — pure presentation over HomeData.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag, Package, Check, ChevronLeft, ChevronRight, Star, Flame,
  ShoppingCart, Timer, Sparkles, BadgeCheck, Truck, ShieldCheck, Headphones,
  CreditCard, Smartphone, Laptop, Computer, Cpu, Monitor, Gamepad2, Watch,
  HardDrive, Keyboard, Mouse, Camera, Speaker, Wifi, BatteryCharging,
  Projector, Zap, TrendingUp, HelpCircle, Crown, LayoutGrid, PlayCircle,
  ArrowLeft, Gem,
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

/* category slug → lucide icon */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Zap, headphones: Headphones, earbuds: Zap, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/* ── hydration-safe countdown (dashes on SSR) ─────────────────────── */
function RingCountdown({ endsAt }: { endsAt?: string | null }) {
  const [left, setLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  useEffect(() => {
    const target = endsAt ? new Date(endsAt).getTime() : NaN;
    const compute = () => {
      let diff: number;
      if (Number.isFinite(target)) {
        diff = Math.max(0, target - Date.now());
      } else {
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        diff = Math.max(0, end.getTime() - now.getTime());
      }
      setLeft({
        h: toFaDigits(String(Math.floor(diff / 3_600_000)).padStart(2, "0")),
        m: toFaDigits(String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0")),
        s: toFaDigits(String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0")),
      });
    };
    compute();
    const t = window.setInterval(compute, 1000);
    return () => window.clearInterval(t);
  }, [endsAt]);
  return (
    <span className="flex items-center gap-1 tabular-nums" role="timer" aria-label="زمان باقی‌مانده">
      <Timer className="h-3.5 w-3.5 text-fuchsia-400" aria-hidden />
      {(left?.h ?? "—")}:{(left?.m ?? "—")}:{(left?.s ?? "—")}
    </span>
  );
}

/* ── neon section heading ─────────────────────────────────────────── */
function SectionHead({
  kicker, title, children, href, icon: Icon = Sparkles,
}: {
  kicker: string; title: string; children?: React.ReactNode; href?: string; icon?: React.ElementType;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-wide text-fuchsia-400">
          <Icon className="h-4 w-4" aria-hidden />
          {kicker}
        </p>
        <h2 className="mt-1.5 text-lg font-black leading-8 text-[#F5F3FF] md:text-[22px]">{title}</h2>
        {children}
      </div>
      {href && (
        <Link
          href={href}
          className="pm-ghost-btn group flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-bold text-violet-200 transition-colors"
        >
          مشاهده همه
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── product mosaic tile with the gradient buy button ─────────────── */
function MosaicTile({ product, big, hot }: { product: TemplateProduct; big?: boolean; hot?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const addToCart = async () => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch {
      /* toast handled by useCart */
    }
  };

  return (
    <article
      className={cn(
        "pm-tile group relative flex flex-col overflow-hidden rounded-3xl border border-violet-500/15 bg-[#251B35]/80",
        !product.inStock && "opacity-60 grayscale-[0.35]",
        big && "sm:col-span-2 sm:row-span-2"
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden">
        <span aria-hidden className="pm-tile-glow" />
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes={big ? "(max-width: 640px) 92vw, 44vw" : "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"}
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-violet-300/40">
            <Package className={big ? "h-16 w-16" : "h-10 w-10"} aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className={cn(
            "absolute start-3 top-3 rounded-xl px-2.5 py-1 text-[10px] font-black text-white tabular-nums",
            hot ? "pm-hot-badge" : "bg-violet-600/90"
          )}>
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-3 top-3 rounded-xl bg-[#1A1025]/90 px-2.5 py-1 text-[9.5px] font-bold text-violet-200">اتمام موجودی</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 pt-0">
        <p className="flex items-center gap-1 truncate text-[10px] font-bold text-violet-300/70">
          <BadgeCheck className="h-3 w-3 shrink-0 text-fuchsia-400" aria-hidden />
          {product.brand.name}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-10 text-[12.5px] font-bold leading-[19px] text-[#F5F3FF] transition-colors hover:text-fuchsia-300"
        >
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="flex items-center gap-1 text-[10px] text-violet-300/60 tabular-nums">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
            {toFaDigits(product.rating.toLocaleString("fa-IR"))}
            <span className="text-violet-300/40">({product.soldCount.toLocaleString("fa-IR")} فروش)</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[10px] leading-4 text-violet-300/50 price-old tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className={cn("font-black text-[#F5F3FF] tabular-nums", big ? "text-xl" : "text-[14.5px]", product.discountPercent > 0 && "text-fuchsia-300")}>
              {formatPrice(product.effectivePrice)}
              <span className="text-[9px] font-normal text-violet-300/60"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "pm-buy grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition-all active:scale-90",
              !product.inStock && "cursor-not-allowed opacity-40"
            )}
          >
            {added ? <Check className="h-5 w-5" aria-hidden /> : <ShoppingCart className="h-4.5 w-4.5" aria-hidden />}
          </button>
        </div>
        {big && product.inStock && (
          <button
            type="button"
            onClick={addToCart}
            className="pm-buy mt-1.5 hidden h-12 items-center justify-center gap-2 rounded-2xl text-[13px] font-black text-white sm:flex"
          >
            <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
            {added ? "به سبد اضافه شد" : "خرید سریع"}
          </button>
        )}
      </div>
    </article>
  );
}

/* ── numbered bestseller row (۰۱…۰۸ glowing outline digits) ───────── */
function RankRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const addToCart = async () => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch {
      /* toast handled by useCart */
    }
  };

  return (
    <article className="pm-rank-card group flex items-center gap-3 rounded-2xl border border-violet-500/10 bg-[#251B35]/60 p-3 transition-colors hover:border-fuchsia-500/40">
      <span className="pm-rank w-14 shrink-0 select-none text-center text-4xl font-black leading-none" aria-hidden>
        {toFaDigits(String(rank).padStart(2, "0"))}
      </span>
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-violet-500/25 bg-[#1E1530]"
      >
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="64px" className="object-contain p-1.5" loading="lazy" />
        ) : (
          <Package className="h-6 w-6 text-violet-300/40" aria-hidden />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="line-clamp-1 text-[12.5px] font-bold text-[#F5F3FF] transition-colors hover:text-fuchsia-300">
          {product.name}
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-[10px] text-violet-300/60 tabular-nums">
          <TrendingUp className="h-3 w-3 text-fuchsia-400" aria-hidden />
          {product.soldCount.toLocaleString("fa-IR")} فروش
          {product.discountPercent > 0 && (
            <span className="rounded-md bg-fuchsia-500/15 px-1.5 py-px font-black text-fuchsia-300">
              {product.discountPercent.toLocaleString("fa-IR")}٪
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-[13px] font-black text-[#F5F3FF] tabular-nums">
          {formatPrice(product.effectivePrice)}
          <span className="text-[9px] font-normal text-violet-300/60"> تومان</span>
        </p>
        <button
          type="button"
          onClick={addToCart}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد`}
          className={cn(
            "pm-buy grid h-9 w-9 place-items-center rounded-xl text-white transition-all active:scale-90",
            !product.inStock && "cursor-not-allowed opacity-40"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </article>
  );
}

/* ═════════════════════ TEMPLATE ═════════════════════ */
export function PurpleMallTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["purple-mall"];

  /* slide carousel state (auto-advance, pause on hover) */
  const slides = data.slides ?? [];
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const slideCount = slides.length;
  const activeSlide = slideCount > 0 ? slides[Math.min(slideIdx, slideCount - 1)] : null;

  useEffect(() => {
    if (slideCount <= 1 || paused) return;
    const t = window.setInterval(() => setSlideIdx((i) => (i + 1) % slideCount), 6000);
    return () => window.clearInterval(t);
  }, [slideCount, paused]);

  /* stories → shared row shape */
  const stories = useMemo<StoryItem[]>(() =>
    (data.stories ?? []).map((s) => ({
      id: s.id, title: s.title, image: s.image, videoUrl: s.videoUrl,
      duration: s.duration, linkUrl: s.linkUrl, badge: s.badge,
      product: s.product, category: s.category,
    })), [data.stories]);

  /* dense mosaic: discounted (hot) + featured, de-duplicated */
  const mosaic = useMemo(() => {
    const seen = new Set<string>();
    const out: { p: TemplateProduct; hot: boolean }[] = [];
    for (const p of [...(data.discounted ?? []), ...(data.featured ?? [])]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({ p, hot: p.discountPercent > 0 });
    }
    return out.slice(0, 13);
  }, [data.discounted, data.featured]);

  const bestsellers = (data.bestsellers ?? []).slice(0, 8);
  const newest = (data.newest ?? []).slice(0, 8);
  const exclusive = (data.exclusive ?? []).slice(0, 8);
  const hasAnyProduct =
    mosaic.length > 0 || bestsellers.length > 0 || newest.length > 0 || exclusive.length > 0;

  const benefits = [
    { icon: Truck, title: "ارسال سریع", text: "به سراسر ایران" },
    { icon: ShieldCheck, title: "ضمانت اصالت", text: "اورجینال و فاکتوردار" },
    { icon: CreditCard, title: "پرداخت امن", text: "درگاه معتبر بانکی" },
    { icon: Headphones, title: "پشتیبانی ۲۴/۷", text: "همیشه در دسترس" },
  ];

  const nextSlide = () => setSlideIdx((i) => (i + 1) % slideCount);
  const prevSlide = () => setSlideIdx((i) => (i - 1 + slideCount) % slideCount);

  return (
    <div data-template-chrome="1" data-tpl="purple-mall" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* NOTE: announcement/ticker is rendered by the template's own chrome
          header (H8 ticker) — never duplicated here. */}
      <div className="pm-shell relative w-full">
        {/* ambient aurora washes */}
        <span aria-hidden className="pm-aurora pm-aurora-a" />
        <span aria-hidden className="pm-aurora pm-aurora-b" />

        {/* ═══ 1 · NEON RING CAROUSEL HERO ═══ */}
        {activeSlide && (
          <section
            aria-labelledby="pm-hero"
            aria-roledescription="کاروسل حلقه نئونی"
            className="relative px-4 pb-10 pt-8 md:pt-12"
          >
            <h2 id="pm-hero" className="sr-only">اسلایدر اصلی فروشگاه</h2>
            <div
              ref={heroRef}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              className="pm-grid-bg relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.5rem] border border-violet-500/20 bg-[#251B35]/50 p-6 backdrop-blur-sm md:p-10 lg:grid-cols-[1.05fr_.95fr]"
            >
              {/* text column */}
              <div className="relative z-10 text-center lg:text-start">
                <p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-black text-fuchsia-300">
                  <Crown className="h-3.5 w-3.5" aria-hidden />
                  {store.storeName} · نئون مال دیجیتال
                </p>
                <h1 key={activeSlide.id} className="pm-title-glow mt-5 min-h-[2.6em] text-3xl font-black leading-[1.3] tracking-tight text-[#F5F3FF] sm:text-4xl md:min-h-[1.3em]">
                  {activeSlide.title}
                </h1>
                {activeSlide.subtitle && (
                  <p className="mx-auto mt-4 max-w-md text-[13px] leading-7 text-violet-200/70 lg:mx-0">{activeSlide.subtitle}</p>
                )}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Link
                    href={activeSlide.ctaUrl ?? (activeSlide.product ? `/products/${activeSlide.product.slug}` : "/products")}
                    className="pm-buy flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black text-white"
                  >
                    <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
                    {activeSlide.ctaText ?? "همین حالا بخرید"}
                  </Link>
                  {activeSlide.product && (
                    <p className="flex items-baseline gap-2 rounded-2xl border border-violet-500/25 bg-[#1A1025]/60 px-4 py-2.5">
                      {activeSlide.product.discountPrice && (
                        <span className="text-[11px] text-violet-300/50 price-old tabular-nums">{formatPrice(activeSlide.product.price)}</span>
                      )}
                      <span className="text-[15px] font-black text-cyan-300 tabular-nums">
                        {formatPrice(activeSlide.product.discountPrice ?? activeSlide.product.price)}
                        <span className="text-[10px] font-normal text-violet-300/60"> تومان</span>
                      </span>
                    </p>
                  )}
                </div>

                {/* neon ۰۱/۰N dots + arrows */}
                {slideCount > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2 lg:justify-start">
                    <button type="button" onClick={prevSlide} aria-label="اسلاید قبلی" className="pm-ghost-btn grid h-10 w-10 place-items-center rounded-full text-violet-200">
                      <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={i === slideIdx}
                        aria-label={`اسلاید ${toFaDigits(String(i + 1))}: ${s.title}`}
                        onClick={() => setSlideIdx(i)}
                        className={cn(
                          "flex h-11 items-center gap-1.5 rounded-full px-3 text-[11px] font-black tabular-nums transition-all",
                          i === slideIdx ? "pm-dot-active text-white" : "bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                        )}
                      >
                        {toFaDigits(String(i + 1).padStart(2, "0"))}
                        <span aria-hidden className={cn("h-1.5 rounded-full transition-all", i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-violet-500/40")} />
                      </button>
                    ))}
                    <button type="button" onClick={nextSlide} aria-label="اسلاید بعدی" className="pm-ghost-btn grid h-10 w-10 place-items-center rounded-full text-violet-200">
                      <ChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>

              {/* the glowing ring with the slide artwork inside */}
              <div className="relative mx-auto aspect-square w-full max-w-sm md:max-w-md">
                <span aria-hidden className="pm-ring-spin absolute inset-2 rounded-full" />
                <span aria-hidden className="pm-ring-glow absolute inset-2 rounded-full" />
                <div className="absolute inset-9 overflow-hidden rounded-full border border-violet-400/25 bg-[#1A1025] shadow-[0_0_60px_-15px_rgba(139,92,246,.6)] md:inset-10">
                  <SlideArt
                    key={activeSlide.id}
                    slide={activeSlide}
                    alt={activeSlide.title}
                    fill
                    sizes="(max-width: 1024px) 80vw, 460px"
                    className="object-cover"
                    priority
                  />
                  <span aria-hidden className="pm-ring-sheen" />
                </div>
                {/* orbit brand chips (desktop only) */}
                {(data.brands ?? []).slice(0, 3).map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/products?brand=${b.slug}`}
                    className={cn(
                      "pm-orbit-chip absolute z-10 hidden items-center gap-2 rounded-full border border-fuchsia-500/30 bg-[#1A1025]/90 px-3.5 py-2 text-[10.5px] font-bold text-violet-100 backdrop-blur md:flex",
                      i === 0 && "end-0 top-4",
                      i === 1 && "start-0 top-1/2",
                      i === 2 && "bottom-4 start-1/4"
                    )}
                  >
                    <span aria-hidden className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06B6D4]" />
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 2 · STORIES ═══ */}
        {stories.length > 0 && (
          <section className="relative px-4 py-6" aria-label="استوری‌های فروشگاه">
            <Reveal><StoriesRow stories={stories} /></Reveal>
          </section>
        )}

        {/* ═══ 3 · CATEGORY RING CAROUSEL (signature) ═══ */}
        {data.categories.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-rings">
            <Reveal>
              <SectionHead kicker="حلقه‌های خرید" title="دسته‌بندی‌ها را با حلقه‌های نئونی بگردید" href="/products" icon={LayoutGrid} />
              <div className="pm-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
                <Link href="/products" className="group flex w-[86px] shrink-0 snap-start flex-col items-center gap-2 text-center">
                  <span className="pm-ring-badge grid h-[86px] w-[86px] place-items-center rounded-full p-[3px] transition-transform duration-300 group-hover:scale-105">
                    <span className="pm-gradient-face grid h-full w-full place-items-center rounded-full text-white">
                      <LayoutGrid className="h-8 w-8" aria-hidden />
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-[#F5F3FF]">همه محصولات</span>
                  <span className="text-[9.5px] text-violet-300/60 tabular-nums">{counts.products.toLocaleString("fa-IR")} کالا</span>
                </Link>
                {data.categories.slice(0, 12).map((c) => {
                  const Icon = CAT_ICONS[c.slug] ?? Package;
                  return (
                    <Link key={c.id} href={`/products?category=${c.slug}`} className="group flex w-[86px] shrink-0 snap-start flex-col items-center gap-2 text-center">
                      <span className="pm-ring-badge grid h-[86px] w-[86px] place-items-center rounded-full p-[3px] transition-transform duration-300 group-hover:scale-105">
                        <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#251B35]">
                          {c.image ? (
                            <Image src={c.image} alt={c.name} fill sizes="86px" className="object-cover" loading="lazy" />
                          ) : (
                            <Icon className="h-7 w-7 text-fuchsia-300" aria-hidden />
                          )}
                        </span>
                      </span>
                      <span className="w-full truncate text-[11px] font-bold text-[#F5F3FF]">{c.name}</span>
                      <span className="text-[9.5px] text-violet-300/60 tabular-nums">{c.productCount.toLocaleString("fa-IR")} کالا</span>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 4 · DENSE FLASH MOSAIC ═══ */}
        {mosaic.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-mosaic">
            <Reveal>
              <SectionHead kicker="پیشنهاد شگفت‌انگیز" title="موزاییک داغ امروز" href="/products?discount=1" icon={Flame}>
                <p className="mt-1.5 flex items-center gap-2 text-[12px] font-bold text-violet-200/80">
                  <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_10px_#D946EF]" />
                  تا پایان امروز
                  <RingCountdown />
                </p>
              </SectionHead>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {mosaic.map(({ p, hot }, i) => (
                  <MosaicTile key={p.id} product={p} hot={hot} big={i === 0} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 5 · EXCLUSIVE GLASS RAIL ═══ */}
        {exclusive.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-exclusive">
            <Reveal>
              <SectionHead kicker="ویترین انحصاری" title="محصولات انحصاری مال" href="/products?special=1" icon={Gem} />
              <div className="pm-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
                {exclusive.map((p) => (
                  <article
                    key={p.id}
                    className="pm-glass-card group relative w-44 shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-violet-500/20 p-2.5 sm:w-52"
                  >
                    <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#1A1025]">
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 44vw, 200px"
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-violet-300/40"><Package className="h-12 w-12" aria-hidden /></span>
                      )}
                      <span className="absolute start-2 top-2 rounded-lg bg-gradient-to-l from-fuchsia-500 to-violet-600 px-2 py-0.5 text-[9px] font-black text-white">
                        انحصاری
                      </span>
                    </Link>
                    <div className="flex flex-col gap-1 p-2.5">
                      <Link href={`/products/${p.slug}`} className="line-clamp-1 text-[12.5px] font-bold text-[#F5F3FF] hover:text-fuchsia-300">
                        {p.name}
                      </Link>
                      <p className="text-[13px] font-black text-cyan-300 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9px] font-normal text-violet-300/60"> تومان</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 6 · NUMBERED BESTSELLERS ۰۱–۰۸ ═══ */}
        {bestsellers.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-best">
            <Reveal>
              <SectionHead kicker="جدول پرفروش‌ها" title="پرفروش‌های شماره‌دار مال" icon={Crown} />
              <div className="grid gap-3 md:grid-cols-2">
                {bestsellers.map((p, i) => (
                  <RankRow key={p.id} product={p} rank={i + 1} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 7 · NEWEST ARRIVALS ═══ */}
        {newest.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-new">
            <Reveal>
              <SectionHead kicker="تازه رسیده‌ها" title="جدیدترین‌های قفسه‌ها" href="/products?sort=newest" icon={Sparkles} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {newest.map((p) => (
                  <MosaicTile key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 8 · SHOWCASE BANNERS ═══ */}
        {(data.showcases ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-label="بنرهای ویترین فروشگاه">
            <Reveal>
              <div className="grid gap-4 md:grid-cols-2">
                {data.showcases.slice(0, 4).map((sc) => (
                  <Link
                    key={sc.id}
                    href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                    className="pm-showcase group relative block overflow-hidden rounded-[2rem] border border-violet-500/20"
                  >
                    <div className="relative aspect-[16/8]">
                      <Image src={sc.image} alt={sc.title} fill sizes="(max-width: 768px) 92vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#1A1025]/95 via-[#1A1025]/40 to-transparent" />
                    </div>
                    <div className="absolute inset-y-0 end-0 flex w-full max-w-[65%] flex-col justify-center gap-2 p-6 md:p-8">
                      <p className="text-[10.5px] font-black tracking-wide text-fuchsia-300">ویترین مال</p>
                      <h3 className="text-lg font-black leading-8 text-[#F5F3FF] md:text-xl">{sc.title}</h3>
                      {sc.subtitle && <p className="line-clamp-2 text-[12px] leading-6 text-violet-200/75">{sc.subtitle}</p>}
                      <span className="pm-buy mt-2 inline-flex h-11 w-fit items-center gap-2 rounded-2xl px-5 text-[12.5px] font-black text-white">
                        {sc.product ? "مشاهده و خرید" : "ببینید"}
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 9 · BENEFITS BAND ═══ */}
        <section className="relative px-4 py-8" aria-label="مزایای خرید">
          <Reveal>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {benefits.map((b) => (
                <div key={b.title} className="pm-glass-card flex items-center gap-3 rounded-2xl p-4">
                  <span className="pm-icon-badge grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
                    <b.icon className="h-5.5 w-5.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-black text-[#F5F3FF]">{b.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-violet-300/60">{b.text}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ 10 · FAQ ═══ */}
        {(data.faq ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="pm-faq">
            <Reveal>
              <SectionHead kicker="پرسش‌های پرتکرار" title="هرچه لازم است بدانید" icon={HelpCircle} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.faq.map((f, i) => (
                  <details key={i} className="pm-glass-card group rounded-2xl p-4">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-[13px] font-bold text-[#F5F3FF]">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-fuchsia-500/15 text-[11px] font-black text-fuchsia-300 tabular-nums">
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                      {f.h}
                      <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-violet-300/60 transition-transform group-open:-rotate-90" aria-hidden />
                    </summary>
                    <p className="mt-3 border-t border-violet-500/15 pt-3 text-[12.5px] leading-7 text-violet-200/70">{f.p}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ 11 · BRAND RING CHIPS + COUNTS ═══ */}
        <section className="relative px-4 py-10" aria-label="برندهای همکار و آمار فروشگاه">
          <Reveal>
            {(data.brands ?? []).length > 0 && (
              <ul className="mb-8 flex flex-wrap justify-center gap-2.5">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="pm-brand-chip flex h-11 items-center gap-2 rounded-full border border-violet-500/20 bg-[#251B35]/70 px-4 text-[12px] font-bold text-violet-100 transition-all hover:border-fuchsia-500/50 hover:text-fuchsia-200"
                    >
                      {b.logo ? (
                        <Image src={b.logo} alt={b.name} width={20} height={20} className="h-5 w-5 rounded-full object-contain" />
                      ) : (
                        <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-l from-fuchsia-500 to-cyan-400" />
                      )}
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { icon: Package, label: "کالا در مال", value: counts.products },
                { icon: LayoutGrid, label: "دسته‌بندی", value: counts.categories },
                { icon: BadgeCheck, label: "برند معتبر", value: counts.brands },
                { icon: PlayCircle, label: "استوری", value: counts.stories },
              ].map((s) => (
                <div key={s.label} className="pm-stat flex flex-col items-center gap-1 rounded-2xl p-4 text-center">
                  <s.icon className="h-5 w-5 text-fuchsia-300" aria-hidden />
                  <span className="text-xl font-black text-[#F5F3FF] tabular-nums">{toFaDigits(s.value.toLocaleString("fa-IR"))}</span>
                  <span className="text-[10.5px] text-violet-300/60">{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="relative px-4 py-24">
            <div className="mx-auto max-w-lg rounded-[2.5rem] border border-dashed border-violet-500/40 bg-[#251B35]/50 p-14 text-center">
              <ShoppingBag className="pm-title-glow mx-auto mb-4 h-12 w-12 text-fuchsia-400/70" aria-hidden />
              <h2 className="text-lg font-black text-[#F5F3FF]">نئون مال هنوز خاموش است</h2>
              <p className="mt-2 text-sm leading-7 text-violet-200/70">
                چراغ‌های قفسه‌ها به‌زودی روشن می‌شوند؛ تا آن زمان از{" "}
                <Link href="/products" className="font-bold text-fuchsia-300">آرشیو محصولات</Link> بازدید کنید.
              </p>
            </div>
          </section>
        )}
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS (single plain <style>) ═══ */}
      <style>{`
[data-tpl="purple-mall"] {
  --background: #1A1025;
  --foreground: #F5F3FF;
  --card: #251B35;
  --card-foreground: #F5F3FF;
  --muted: #2A1F3D;
  --muted-foreground: #B9A8D8;
  --border: rgba(139, 92, 246, 0.25);
  --input: rgba(139, 92, 246, 0.22);
  --primary: #D946EF;
  --primary-foreground: #FFFFFF;
  --accent: #2E2242;
  --accent-foreground: #F5F3FF;
  --popover: #251B35;
  --popover-foreground: #F5F3FF;
  background-color: #1A1025;
  color: #F5F3FF;
}
/* harmonize the chrome's violet accent utilities with the neon palette
   (light-mode variants would otherwise paint bright chips on the void) */
[data-tpl="purple-mall"] .bg-violet-100 { background-color: rgba(139, 92, 246, 0.16) !important; }
[data-tpl="purple-mall"] .hover\\:bg-violet-200:hover { background-color: rgba(139, 92, 246, 0.26) !important; }
[data-tpl="purple-mall"] .bg-violet-500\\/15 { background-color: rgba(139, 92, 246, 0.16) !important; }
[data-tpl="purple-mall"] .bg-violet-500\\/25 { background-color: rgba(139, 92, 246, 0.26) !important; }
[data-tpl="purple-mall"] .bg-violet-200 { background-color: rgba(167, 139, 250, 0.22) !important; }
[data-tpl="purple-mall"] .text-violet-700 { color: #C4B5FD !important; }
[data-tpl="purple-mall"] .text-violet-800 { color: #C4B5FD !important; }
[data-tpl="purple-mall"] .text-violet-600 { color: #C084FC !important; }
[data-tpl="purple-mall"] .text-violet-400 { color: #A78BFA !important; }
[data-tpl="purple-mall"] .text-violet-300 { color: #C4B5FD !important; }
[data-tpl="purple-mall"] .bg-violet-600 { background-color: #D946EF !important; color: #FFFFFF !important; }
[data-tpl="purple-mall"] .hover\\:bg-violet-700:hover { background-color: #C026D3 !important; }
[data-tpl="purple-mall"] .border-violet-300 { border-color: rgba(217, 70, 239, 0.35) !important; }
[data-tpl="purple-mall"] .border-violet-400\\/40 { border-color: rgba(217, 70, 239, 0.3) !important; }
[data-tpl="purple-mall"] .from-violet-500 { --tw-gradient-from: #8B5CF6 !important; }
[data-tpl="purple-mall"] .to-violet-700 { --tw-gradient-to: #D946EF !important; }

/* ── layout shell ── */
[data-tpl="purple-mall"] .pm-shell { position: relative; isolation: isolate; overflow: clip; }
[data-tpl="purple-mall"] .pm-rail { scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x mandatory; }
[data-tpl="purple-mall"] .pm-rail::-webkit-scrollbar { display: none; }

/* ── ambient aurora blobs ── */
[data-tpl="purple-mall"] .pm-aurora {
  position: absolute; border-radius: 9999px; filter: blur(110px);
  opacity: 0.22; pointer-events: none; z-index: -1;
}
[data-tpl="purple-mall"] .pm-aurora-a {
  width: 520px; height: 520px; top: -140px; inset-inline-end: -160px;
  background: #8B5CF6; animation: pm-float 16s ease-in-out infinite alternate;
}
[data-tpl="purple-mall"] .pm-aurora-b {
  width: 460px; height: 460px; top: 40%; inset-inline-start: -180px;
  background: #D946EF; opacity: 0.16; animation: pm-float 20s ease-in-out infinite alternate-reverse;
}
@keyframes pm-float {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-40px, 50px, 0) scale(1.15); }
}

/* ── hero: scan grid + glowing title ── */
[data-tpl="purple-mall"] .pm-grid-bg {
  background-image:
    linear-gradient(rgba(139, 92, 246, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.08) 1px, transparent 1px);
  background-size: 42px 42px;
}
[data-tpl="purple-mall"] .pm-title-glow { animation: pm-glow-in 1.1s ease both; }
@keyframes pm-glow-in {
  from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

/* ── the neon ring carousel ── */
[data-tpl="purple-mall"] .pm-ring-spin {
  background: conic-gradient(#D946EF, #8B5CF6, #06B6D4, #8B5CF6, #D946EF);
  filter: drop-shadow(0 0 18px rgba(217, 70, 239, 0.45));
  animation: pm-spin 14s linear infinite;
}
@keyframes pm-spin { to { transform: rotate(1turn); } }
[data-tpl="purple-mall"] .pm-ring-glow {
  background: conic-gradient(#D946EF, #8B5CF6, #06B6D4, #8B5CF6, #D946EF);
  filter: blur(26px);
  opacity: 0.55;
  animation: pm-breathe 5s ease-in-out infinite;
}
@keyframes pm-breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
[data-tpl="purple-mall"] .pm-ring-sheen {
  position: absolute; inset: 0; border-radius: 9999px;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.22), transparent 55%);
  pointer-events: none;
}
[data-tpl="purple-mall"] .pm-orbit-chip { animation: pm-chip-in 0.8s ease both; }
@keyframes pm-chip-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
[data-tpl="purple-mall"] .pm-dot-active {
  background: linear-gradient(90deg, #D946EF, #8B5CF6, #06B6D4);
  box-shadow: 0 6px 18px -6px rgba(139, 92, 246, 0.8);
}

/* ── category ring badges (double glowing ring) ── */
[data-tpl="purple-mall"] .pm-ring-badge {
  background: conic-gradient(#D946EF, #251B35, #06B6D4, #251B35, #8B5CF6, #251B35, #D946EF);
  box-shadow:
    0 0 0 1px rgba(217, 70, 239, 0.25),
    0 0 22px -4px rgba(139, 92, 246, 0.55),
    inset 0 0 12px rgba(217, 70, 239, 0.35);
}
[data-tpl="purple-mall"] .pm-gradient-face {
  background: linear-gradient(135deg, #D946EF, #8B5CF6 55%, #06B6D4);
  box-shadow: inset 0 0 18px rgba(26, 16, 37, 0.35);
}

/* ── gradient buy button (signature) ── */
[data-tpl="purple-mall"] .pm-buy {
  background-image: linear-gradient(90deg, #D946EF, #8B5CF6 55%, #06B6D4);
  background-size: 190% 100%;
  background-position: 0% 0%;
  box-shadow: 0 8px 22px -10px rgba(139, 92, 246, 0.75);
  transition: background-position 0.5s ease, box-shadow 0.3s ease, transform 0.15s ease;
}
[data-tpl="purple-mall"] .pm-buy:hover {
  background-position: 95% 0%;
  box-shadow: 0 12px 30px -10px rgba(217, 70, 239, 0.85);
}
[data-tpl="purple-mall"] .pm-buy:active { transform: scale(0.96); }
[data-tpl="purple-mall"] .pm-buy:disabled { cursor: not-allowed; }

/* ── tiles / glass cards ── */
[data-tpl="purple-mall"] .pm-tile { transition: transform 0.35s ease, border-color 0.3s ease, box-shadow 0.35s ease; }
[data-tpl="purple-mall"] .pm-tile:hover {
  transform: translateY(-4px);
  border-color: rgba(217, 70, 239, 0.45);
  box-shadow: 0 18px 44px -18px rgba(139, 92, 246, 0.65);
}
[data-tpl="purple-mall"] .pm-tile-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 35%, rgba(139, 92, 246, 0.22), transparent 65%);
  opacity: 0; transition: opacity 0.4s ease; pointer-events: none;
}
[data-tpl="purple-mall"] .pm-tile:hover .pm-tile-glow { opacity: 1; }
[data-tpl="purple-mall"] .pm-hot-badge {
  background: linear-gradient(90deg, #EF4444, #D946EF);
  box-shadow: 0 4px 14px -4px rgba(217, 70, 239, 0.8);
}
[data-tpl="purple-mall"] .pm-glass-card {
  background: linear-gradient(160deg, rgba(46, 34, 66, 0.85), rgba(37, 27, 53, 0.55));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.18);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
[data-tpl="purple-mall"] .pm-glass-card:hover { border-color: rgba(217, 70, 239, 0.4); box-shadow: 0 14px 36px -16px rgba(139, 92, 246, 0.6); }
[data-tpl="purple-mall"] .pm-icon-badge {
  background: linear-gradient(135deg, #D946EF, #8B5CF6);
  box-shadow: 0 6px 16px -6px rgba(139, 92, 246, 0.8);
}

/* ── numbered bestsellers: glowing outline digits ── */
[data-tpl="purple-mall"] .pm-rank {
  color: transparent;
  -webkit-text-stroke: 1.6px rgba(217, 70, 239, 0.65);
  text-shadow: 0 0 20px rgba(217, 70, 239, 0.35);
  font-variant-numeric: tabular-nums;
  transition: -webkit-text-stroke-color 0.3s ease, text-shadow 0.3s ease;
}
[data-tpl="purple-mall"] .pm-rank-card:hover .pm-rank {
  -webkit-text-stroke-color: #D946EF;
  text-shadow: 0 0 26px rgba(217, 70, 239, 0.65);
}
[data-tpl="purple-mall"] .pm-rank-card { transition: border-color 0.3s ease, background-color 0.3s ease; }
[data-tpl="purple-mall"] .pm-rank-card:hover { background-color: rgba(37, 27, 53, 0.95); }

/* ── misc atoms ── */
[data-tpl="purple-mall"] .pm-ghost-btn {
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(26, 16, 37, 0.6);
  transition: border-color 0.3s ease, background-color 0.3s ease;
}
[data-tpl="purple-mall"] .pm-ghost-btn:hover { border-color: rgba(217, 70, 239, 0.6); background: rgba(217, 70, 239, 0.12); }
[data-tpl="purple-mall"] .pm-brand-chip { backdrop-filter: blur(8px); }
[data-tpl="purple-mall"] .pm-stat {
  background: rgba(37, 27, 53, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.16);
  backdrop-filter: blur(8px);
}
[data-tpl="purple-mall"] .pm-showcase { background: #251B35; }
[data-tpl="purple-mall"] .pm-showcase:hover { box-shadow: 0 20px 50px -20px rgba(139, 92, 246, 0.7); }

@media (prefers-reduced-motion: reduce) {
  [data-tpl="purple-mall"] .pm-aurora,
  [data-tpl="purple-mall"] .pm-ring-spin,
  [data-tpl="purple-mall"] .pm-ring-glow,
  [data-tpl="purple-mall"] .pm-title-glow,
  [data-tpl="purple-mall"] .pm-orbit-chip { animation: none !important; }
}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════ */
html:not(.dark) [data-tpl="purple-mall"] {
  --background: #F7F2FA;
  --foreground: #31203F;
  --card: #FFFFFF;
  --card-foreground: #31203F;
  --muted: #F0E8F6;
  --muted-foreground: #6B5A85;
  --border: rgba(49, 32, 63, 0.14);
  --input: rgba(49, 32, 63, 0.16);
  --primary: #C026D3;
  --primary-foreground: #FFFFFF;
  --accent: #F0E8F6;
  --accent-foreground: #31203F;
  --popover: #FFFFFF;
  --popover-foreground: #31203F;
  background-color: #F7F2FA;
  color: #31203F;
}

/* ── chrome violet retunes → light-readable (dark rules above use !important, so must these) ── */
html:not(.dark) [data-tpl="purple-mall"] .text-violet-700 { color: #6D28D9 !important; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-800 { color: #6D28D9 !important; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-600 { color: #7C3AED !important; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-400 { color: #7C3AED !important; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-300 { color: #6D28D9 !important; }
html:not(.dark) [data-tpl="purple-mall"] .bg-violet-100 { background-color: rgba(139, 92, 246, 0.12) !important; }
html:not(.dark) [data-tpl="purple-mall"] .hover\\:bg-violet-200:hover { background-color: rgba(139, 92, 246, 0.2) !important; }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-300 { border-color: rgba(162, 28, 171, 0.4) !important; }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-400\\/40 { border-color: rgba(162, 28, 171, 0.35) !important; }

/* ── surfaces: purple glass → white cards + violet hairlines ── */
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#251B35\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#251B35\\]\\/80 { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#251B35\\]\\/70 { background-color: rgba(255, 255, 255, 0.9); }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#251B35\\]\\/60 { background-color: rgba(255, 255, 255, 0.88); }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#251B35\\]\\/50 { background-color: rgba(255, 255, 255, 0.8); }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#1A1025\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#1A1025\\]\\/90 { background-color: rgba(255, 255, 255, 0.92); }
html:not(.dark) [data-tpl="purple-mall"] .bg-\\[\\#1A1025\\]\\/60 { background-color: rgba(255, 255, 255, 0.72); }

/* ── ink & muted violet text → deep-violet scale (same hue family) ── */
html:not(.dark) [data-tpl="purple-mall"] .text-\\[\\#F5F3FF\\] { color: #31203F; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-100 { color: #4C1D95; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-200 { color: #6D28D9; }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-200\\/70 { color: rgba(109, 40, 217, 0.75); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-200\\/75 { color: rgba(109, 40, 217, 0.78); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-200\\/80 { color: rgba(109, 40, 217, 0.8); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-300\\/40 { color: rgba(109, 40, 217, 0.45); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-300\\/50 { color: rgba(109, 40, 217, 0.55); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-300\\/60 { color: rgba(109, 40, 217, 0.62); }
html:not(.dark) [data-tpl="purple-mall"] .text-violet-300\\/70 { color: rgba(109, 40, 217, 0.68); }
html:not(.dark) [data-tpl="purple-mall"] .text-fuchsia-300 { color: #C026D3; }
html:not(.dark) [data-tpl="purple-mall"] .text-fuchsia-400 { color: #C026D3; }
html:not(.dark) [data-tpl="purple-mall"] .text-fuchsia-400\\/70 { color: rgba(162, 28, 171, 0.75); }
html:not(.dark) [data-tpl="purple-mall"] .text-cyan-300 { color: #0E7490; }
html:not(.dark) [data-tpl="purple-mall"] .text-amber-400 { color: #B45309; }
html:not(.dark) [data-tpl="purple-mall"] .fill-amber-400 { fill: #F59E0B; }
html:not(.dark) [data-tpl="purple-mall"] .hover\\:text-fuchsia-300:hover { color: #C026D3; }
html:not(.dark) [data-tpl="purple-mall"] .hover\\:text-fuchsia-200:hover { color: #A21CAB; }

/* ── violet / fuchsia hairlines & tints ── */
html:not(.dark) [data-tpl="purple-mall"] .border-violet-500\\/10 { border-color: rgba(109, 40, 217, 0.14); }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-500\\/15 { border-color: rgba(109, 40, 217, 0.18); }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-500\\/20 { border-color: rgba(109, 40, 217, 0.2); }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-500\\/25 { border-color: rgba(109, 40, 217, 0.24); }
html:not(.dark) [data-tpl="purple-mall"] .border-violet-400\\/25 { border-color: rgba(139, 92, 246, 0.35); }
html:not(.dark) [data-tpl="purple-mall"] .border-fuchsia-500\\/30 { border-color: rgba(162, 28, 171, 0.35); }
html:not(.dark) [data-tpl="purple-mall"] .border-fuchsia-500\\/40 { border-color: rgba(162, 28, 171, 0.45); }
html:not(.dark) [data-tpl="purple-mall"] .hover\\:border-fuchsia-500\\/40:hover { border-color: rgba(162, 28, 171, 0.45); }
html:not(.dark) [data-tpl="purple-mall"] .hover\\:border-fuchsia-500\\/50:hover { border-color: rgba(162, 28, 171, 0.5); }
html:not(.dark) [data-tpl="purple-mall"] .bg-fuchsia-500\\/10 { background-color: rgba(217, 70, 239, 0.08); }
html:not(.dark) [data-tpl="purple-mall"] .bg-fuchsia-500\\/15 { background-color: rgba(217, 70, 239, 0.1); }
html:not(.dark) [data-tpl="purple-mall"] .bg-violet-500\\/40 { background-color: rgba(109, 40, 217, 0.35); }
html:not(.dark) [data-tpl="purple-mall"] .shadow-\\[0_0_60px_-15px_rgba\\(139\\,92\\,246\\,\\.6\\)\\] { --tw-shadow: 0 0 60px -15px rgba(139, 92, 246, 0.3); }

/* ── showcase image veil → light veil (same geometry) ── */
html:not(.dark) [data-tpl="purple-mall"] .from-\\[\\#1A1025\\]\\/95 { --tw-gradient-from: rgba(247, 242, 250, 0.96); }
html:not(.dark) [data-tpl="purple-mall"] .via-\\[\\#1A1025\\]\\/40 { --tw-gradient-via: rgba(247, 242, 250, 0.5); }

/* ── .text-white blanket → ink; restored on gradient/violet surfaces that STAY colored ── */
html:not(.dark) [data-tpl="purple-mall"] .text-white { color: #31203F; }
html:not(.dark) [data-tpl="purple-mall"] .pm-buy { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .pm-gradient-face { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .pm-icon-badge { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .pm-hot-badge.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .pm-dot-active.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .bg-violet-600\\/90.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .from-fuchsia-500.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .fill-white { fill: #FFFFFF; }

/* ── scoped helper classes → light variants ── */
html:not(.dark) [data-tpl="purple-mall"] .pm-aurora-a { opacity: 0.14; }
html:not(.dark) [data-tpl="purple-mall"] .pm-aurora-b { opacity: 0.1; }
html:not(.dark) [data-tpl="purple-mall"] .pm-ring-spin { filter: drop-shadow(0 0 18px rgba(217, 70, 239, 0.3)); }
html:not(.dark) [data-tpl="purple-mall"] .pm-ring-glow { opacity: 0.4; }
html:not(.dark) [data-tpl="purple-mall"] .pm-dot-active { box-shadow: 0 6px 18px -6px rgba(139, 92, 246, 0.4); }
html:not(.dark) [data-tpl="purple-mall"] .pm-ring-badge {
  background: conic-gradient(#D946EF, #F7F2FA, #06B6D4, #F7F2FA, #8B5CF6, #F7F2FA, #D946EF);
  box-shadow:
    0 0 0 1px rgba(217, 70, 239, 0.25),
    0 0 22px -4px rgba(139, 92, 246, 0.3),
    inset 0 0 12px rgba(217, 70, 239, 0.3);
}
html:not(.dark) [data-tpl="purple-mall"] .pm-buy { box-shadow: 0 8px 22px -10px rgba(139, 92, 246, 0.4); }
html:not(.dark) [data-tpl="purple-mall"] .pm-buy:hover { box-shadow: 0 12px 30px -10px rgba(217, 70, 239, 0.4); }
html:not(.dark) [data-tpl="purple-mall"] .pm-tile:hover {
  border-color: rgba(162, 28, 171, 0.4);
  box-shadow: 0 18px 44px -18px rgba(139, 92, 246, 0.25);
}
html:not(.dark) [data-tpl="purple-mall"] .pm-hot-badge { box-shadow: 0 4px 14px -4px rgba(217, 70, 239, 0.45); }
html:not(.dark) [data-tpl="purple-mall"] .pm-glass-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.88), rgba(247, 242, 250, 0.75));
  border-color: rgba(109, 40, 217, 0.16);
}
html:not(.dark) [data-tpl="purple-mall"] .pm-glass-card:hover { border-color: rgba(162, 28, 171, 0.35); box-shadow: 0 14px 36px -16px rgba(139, 92, 246, 0.25); }
html:not(.dark) [data-tpl="purple-mall"] .pm-icon-badge { box-shadow: 0 6px 16px -6px rgba(139, 92, 246, 0.4); }
html:not(.dark) [data-tpl="purple-mall"] .pm-rank-card:hover { background-color: rgba(247, 242, 250, 0.95); }
html:not(.dark) [data-tpl="purple-mall"] .pm-ghost-btn {
  border-color: rgba(109, 40, 217, 0.35);
  background: rgba(255, 255, 255, 0.68);
}
html:not(.dark) [data-tpl="purple-mall"] .pm-ghost-btn:hover { border-color: rgba(162, 28, 171, 0.55); background: rgba(217, 70, 239, 0.1); }
html:not(.dark) [data-tpl="purple-mall"] .pm-stat {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(109, 40, 217, 0.14);
}
html:not(.dark) [data-tpl="purple-mall"] .pm-showcase { background: #FFFFFF; }
html:not(.dark) [data-tpl="purple-mall"] .pm-showcase:hover { box-shadow: 0 20px 50px -20px rgba(139, 92, 246, 0.3); }
`}</style>
    </div>
  );
}

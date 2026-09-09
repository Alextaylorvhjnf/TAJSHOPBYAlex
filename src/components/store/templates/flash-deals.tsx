"use client";

/**
 * TEMPLATE · flash-deals — v25 «Red Urgency HUD» (FULL REWRITE)
 * ---------------------------------------------------------------------
 * A full-charcoal (#141019) urgency cockpit: a sticky-LOOKING full-bleed
 * countdown HUD bar right under the header (big tabular HH:MM:SS with
 * red glow + pulsing ENDS-SOON chip + hazard-stripe rails), deal cards
 * as dark glass with red neon hover, «٪تخفیف» hazard badges
 * (repeating-linear-gradient 45°), soldCount progress bars, quick-buy
 * buttons and per-card countdown clocks.
 *
 * Registered features (Admin → ظاهر): «timer» (HUD band digits +
 * per-card clocks) and «progress» (sale progress bars) — feat() gates.
 * v25: when data.store.timerEndsAt is set, every timer counts to THAT
 * moment (overrides per-product discountEndsAt / midnight default).
 * All countdowns are hydration-safe: dashes on the SSR frame, live
 * digits only after mount.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Zap, Timer, Package, Check, ChevronLeft, Flame, TrendingUp, HelpCircle,
  ShoppingCart, Sparkles, Gem, LayoutGrid, Radio, Gauge,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* v23/v25 feature flags (Admin → ظاهر → ویژگی‌های قالب) — missing key = ON */
const feat = (features: Record<string, boolean> | undefined, key: string) =>
  features ? features[key] !== false : true;

const pad2 = (n: number) => String(n).padStart(2, "0");

/* ── hydration-safe countdown ticks ─────────────────────────────────
 * iso = store.timerEndsAt (v25 override) OR the deal's own
 * discountEndsAt; null → to-midnight default. Never read during SSR. */
function useCountdown(iso: string | null) {
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

const split = (left: number) => ({
  h: toFaDigits(pad2(Math.floor(left / 3_600_000))),
  m: toFaDigits(pad2(Math.floor((left % 3_600_000) / 60_000))),
  s: toFaDigits(pad2(Math.floor((left % 60_000) / 1000))),
});

/* ── top HUD countdown band (big tabular digits + red glow) ──────── */
function CountdownBand({ store, timerOn }: { store: HomeData["store"]; timerOn: boolean }) {
  const left = useCountdown(store.timerEndsAt ?? null);
  const ended = left !== null && left <= 0;
  const v = left === null ? { h: "—", m: "—", s: "—" } : ended ? { h: "۰۰", m: "۰۰", s: "۰۰" } : split(left);

  const cells = [
    { v: v.h, l: "HH" },
    { v: v.m, l: "MM" },
    { v: v.s, l: "SS" },
  ];

  return (
    <section className="fd-band relative isolate overflow-hidden border-b-2 border-[#EF4444]/70 text-white" aria-labelledby="fd-hud">
      {/* red aura + HUD scanlines + hazard rails */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-30%,rgba(239,68,68,28%),transparent_65%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,transparent_0_3px,white_3px_4px)]" />
      <span aria-hidden className="fd-hazard absolute inset-x-0 bottom-0 h-1.5" />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="fd-glow-red grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#EF4444] to-[#B91C1C] shadow-[0_0_24px_-4px_rgba(239,68,68,75%)]">
            <Zap className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 id="fd-hud" className="flex items-center gap-2 text-base font-black leading-6 sm:text-lg">
              فروش فلش {store.storeName}
              <span className="fd-pulse hidden rounded-lg bg-[#F59E0B] px-2 py-0.5 text-[9px] font-black tracking-widest text-[#431407] sm:inline-block">
                ENDS SOON
              </span>
            </h1>
            <p className="truncate text-[10.5px] font-bold text-white/55">
              {store.announcementActive && store.announcement ? store.announcement : "قیمت‌ها ذوب شده‌اند — موجودی‌ها ذوب می‌شوند"}
            </p>
          </div>
        </div>

        {/* giant countdown digits (timer feature; dashes until mount) */}
        {timerOn && (
          <div className="flex items-center gap-2 sm:gap-2.5" role="timer" aria-label="زمان باقی‌مانده تا پایان فروش فلش">
            {cells.map((c, i) => (
              <span key={c.l} className="flex items-center gap-2 sm:gap-2.5">
                {i > 0 && <span aria-hidden className="fd-pulse text-xl font-black text-[#EF4444] sm:text-2xl">:</span>}
                <span className="fd-cell flex flex-col items-center rounded-xl border border-[#EF4444]/45 bg-black/45 px-2.5 py-1.5 backdrop-blur-sm sm:px-3.5 sm:py-2">
                  <span className="fd-digit text-2xl font-black leading-none tabular-nums sm:text-3xl md:text-4xl" aria-hidden>{c.v}</span>
                  <span className="mt-1 text-[8px] font-black tracking-widest text-[#EF4444]/70">{c.l}</span>
                </span>
              </span>
            ))}
            {ended && (
              <span className="ms-1 hidden rounded-lg bg-[#F59E0B]/15 px-2.5 py-1 text-[10px] font-black text-[#F59E0B] md:inline-block">کمپین پایان یافت</span>
            )}
          </div>
        )}
        {!timerOn && (
          <Link href="/products?discount=1" className="fd-buy flex h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-xs font-black text-white">
            دیدن تخفیف‌ها
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}

/* ── per-card mini countdown (red HUD clock) ─────────────────────── */
function DealClock({ iso }: { iso: string }) {
  const left = useCountdown(iso);
  if (left !== null && left <= 0) {
    return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-black text-white/60">پایان تخفیف</span>;
  }
  const v = left === null ? { h: "—", m: "—", s: "—" } : split(left);
  return (
    <span dir="ltr" className="fd-clock inline-flex items-center gap-1 rounded-full border border-[#EF4444]/40 bg-[#EF4444]/12 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#FCA5A5]" role="timer" aria-label="زمان باقی‌مانده تخفیف این محصول">
      <Timer className="h-3 w-3" aria-hidden />
      {v.h}:{v.m}:{v.s}
    </span>
  );
}

/* ── HUD section header ───────────────────────────────────────────── */
function HudHeader({ icon: Icon, title, subtitle, href }: { icon: React.ElementType; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="fd-glow-red grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[11px] font-bold text-white/50">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 text-[11px] font-black text-white/80 transition-colors hover:border-[#EF4444]/60 hover:text-[#FCA5A5]">
          همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── dark-glass deal card (hazard badge + progress + quick-buy) ──── */
function DealCard({
  product, big, showTimer, showProgress, storeDeadline,
}: {
  product: TemplateProduct;
  big?: boolean;
  showTimer?: boolean;
  showProgress?: boolean;
  storeDeadline?: string | null;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const deadline = storeDeadline ?? product.discountEndsAt ?? null;
  const total = product.soldCount + Math.max(product.stock, 1);
  const soldPct = Math.min(96, Math.max(5, Math.round((product.soldCount / total) * 100)));

  const addToCart = async () => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1000);
    } catch {
      /* toast handled by useCart */
    }
  };

  return (
    <article className={cn(
      "fd-card group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#EF4444]/60",
      !product.inStock && "grayscale-[0.45]",
    )}>
      {/* hazard-stripe discount ribbon + glowing «٪تخفیف» */}
      {product.discountPercent > 0 && (
        <span className="fd-hazard absolute start-0 top-4 z-10 rounded-e-xl px-3 py-1.5 text-[11px] font-black text-white shadow-[0_4px_16px_-4px_rgba(239,68,68,80%)] tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف فلش
        </span>
      )}
      {product.isSpecial && (
        <span className="fd-glow-amber absolute end-3 top-4 z-10 rounded-full bg-[#F59E0B] px-2.5 py-1 text-[9.5px] font-black text-[#431407]">
          انحصاری
        </span>
      )}
      <Link href={`/products/${product.slug}`} aria-label={product.name} className={cn("relative block bg-white/[0.03]", big ? "aspect-[4/3]" : "aspect-square")}>
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes={big ? "(max-width: 1024px) 92vw, 46vw" : "(max-width: 640px) 46vw, 23vw"}
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            priority={big}
            loading={big ? "eager" : "lazy"}
          />
        ) : (
          <span className="grid h-full place-items-center text-white/30"><Package className="h-12 w-12" aria-hidden /></span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/70 py-1.5 text-center text-[10px] font-bold text-white/90 backdrop-blur">تمام شد</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10.5px] font-bold text-white/45">{product.brand.name}</p>
        <Link href={`/products/${product.slug}`} className={cn("mt-1 font-bold leading-6 line-clamp-2 text-white transition-colors hover:text-[#FCA5A5]", big ? "min-h-14 text-[14.5px]" : "min-h-12 text-[13px]")}>
          {product.name}
        </Link>

        {/* per-card countdown (timer feature + a real deadline) */}
        {showTimer && deadline && (
          <div className="mt-2.5">
            <DealClock iso={deadline} />
          </div>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[11px] text-white/40 price-old tabular-nums">{formatPrice(product.price)}</span>
          <span className={cn("fd-glow-red-text font-black tabular-nums text-[#F87171]", big ? "text-xl" : "text-[15px]")}>
            {formatPrice(product.effectivePrice)}
            <span className="text-[10px] font-normal text-white/45"> تومان</span>
          </span>
        </div>

        {/* sold progress bar (progress feature) */}
        {showProgress && (
          <div className="mt-4" aria-label={`حدود ${toFaDigits(soldPct.toLocaleString("fa-IR"))} درصد موجودی فروخته شده`}>
            <div className="flex items-center justify-between text-[10px] font-bold text-white/50">
              <span className="tabular-nums">{toFaDigits(soldPct.toLocaleString("fa-IR"))}٪ فروخته شده</span>
              <span className={cn("tabular-nums", product.stock > 0 && product.stock < 5 && "fd-glow-red-text text-[#F87171]")}>
                {product.inStock ? `تنها ${toFaDigits(product.stock.toLocaleString("fa-IR"))} عدد` : "اتمام موجودی"}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="fd-bar h-full rounded-full transition-all duration-500"
                style={{ width: `${soldPct}%` }}
              />
            </div>
          </div>
        )}

        {/* urgency + quick-buy */}
        <div className="mt-auto pt-4">
          {product.stock > 0 && product.stock < 5 && (
            <p className="fd-pulse mb-2.5 flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-2 text-[10.5px] font-black text-[#F59E0B]">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              آخری‌های موجودی — دیر بجنب!
            </p>
          )}
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`خرید فوری ${product.name}`}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all active:scale-[0.98]",
              product.inStock
                ? added
                  ? "bg-emerald-600 text-white"
                  : "fd-buy text-white"
                : "cursor-not-allowed bg-white/10 text-white/40",
            )}
          >
            {added ? (
              <><Check className="h-4 w-4" aria-hidden /> افزوده شد</>
            ) : (
              <><ShoppingCart className="h-4 w-4" aria-hidden /> {product.inStock ? "خرید فوری" : "ناموجود"}</>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── dark FAQ item ────────────────────────────────────────────────── */
function HudFaq({ h, p }: { h: string; p: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-black transition-colors", open ? "bg-[#EF4444] text-white" : "bg-[#EF4444]/15 text-[#F87171]")}>؟</span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-white">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-white/50 transition-transform duration-300", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-white/60">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ TEMPLATE ═══════════════════ */
export function FlashDealsTemplate({ data }: { data: HomeData }) {
  const { store } = data;
  const stories: StoryItem[] = data.stories;
  const deals = data.discounted;
  const endingSoon = [...deals].sort((a, b) => a.stock - b.stock).slice(0, 6);
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["flash-deals"];

  /* v23/v25 features — timer (HUD digits + per-card clocks) + progress (sold bars) */
  const timerOn = feat(data.store.features, "timer");
  const progressOn = feat(data.store.features, "progress");

  /* v25: store-level countdown deadline overrides EVERY timer */
  const storeDeadline = store.timerEndsAt ?? null;

  /* hero deal = deepest active discount */
  const heroDeal = [...deals].sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null;
  const heroDeadline = storeDeadline ?? heroDeal?.discountEndsAt ?? null;
  const heroSoldPct = heroDeal
    ? Math.min(96, Math.max(5, Math.round((heroDeal.soldCount / (heroDeal.soldCount + Math.max(heroDeal.stock, 1))) * 100)))
    : 0;

  return (
    <div data-template-chrome="1" data-tpl="flash-deals" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* charcoal urgency world */}
      <div className="w-full bg-[#141019] text-white">
        {/* ═══ TOP COUNTDOWN HUD BAND (sticky-look, flush under header) ═══ */}
        <CountdownBand store={store} timerOn={timerOn} />

        <div className="mx-auto w-full max-w-[1280px] space-y-12 px-4 py-10 md:space-y-14 md:py-12">

          {/* ═══ HERO DEAL SPOTLIGHT ═══ */}
          {heroDeal && (
            <section aria-labelledby="fd-hero-deal">
              <Reveal>
                <div className="fd-card-hero relative grid gap-6 overflow-hidden rounded-[2rem] border border-[#EF4444]/35 bg-white/[0.04] p-6 backdrop-blur-md md:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(239,68,68,16%),transparent_60%)]" />
                  <span aria-hidden className="fd-hazard absolute inset-x-0 top-0 h-1" />
                  <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:text-start lg:items-center">
                    <Link href={`/products/${heroDeal.slug}`} aria-label={heroDeal.name} className="relative block h-44 w-44 shrink-0 overflow-hidden rounded-3xl border border-[#EF4444]/25 bg-black/30 md:h-56 md:w-56">
                      {heroDeal.mainImage ? (
                        <Image src={heroDeal.mainImage} alt={heroDeal.name} fill sizes="(max-width: 768px) 45vw, 240px" priority className="object-contain p-6" />
                      ) : (
                        <span className="grid h-full place-items-center text-white/30"><Package className="h-12 w-12" aria-hidden /></span>
                      )}
                    </Link>
                    <div className="min-w-0 text-center sm:text-start">
                      <span className="fd-hazard inline-flex rounded-xl px-3 py-1.5 text-[12px] font-black text-white shadow-[0_0_22px_-4px_rgba(239,68,68,85%)] tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
                        {heroDeal.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                      </span>
                      <h2 id="fd-hero-deal" className="mt-3 text-xl font-black leading-8 text-white md:text-2xl">
                        <Link href={`/products/${heroDeal.slug}`} className="transition-colors hover:text-[#FCA5A5]">{heroDeal.name}</Link>
                      </h2>
                      <p className="mt-1 text-[11px] font-bold text-white/50">{heroDeal.brand.name} · {heroDeal.category.name}</p>
                      <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:justify-start">
                        <span className="text-[13px] text-white/40 price-old tabular-nums">{formatPrice(heroDeal.price)}</span>
                        <span className="fd-glow-red-text text-3xl font-black tabular-nums text-[#F87171] md:text-4xl">
                          {formatPrice(heroDeal.effectivePrice)}
                          <span className="text-[11px] font-normal text-white/50"> تومان</span>
                        </span>
                      </p>
                      {timerOn && heroDeadline && (
                        <div className="mt-4 flex justify-center sm:justify-start">
                          <DealClock iso={heroDeadline} />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* sold gauge + quick-buy console */}
                  <div className="relative flex flex-col justify-center gap-5">
                    {progressOn && (
                      <div aria-label="درصد فروش این پیشنهاد">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-white/55">
                          <span className="tabular-nums">{toFaDigits(heroDeal.soldCount.toLocaleString("fa-IR"))} فروخته‌شده</span>
                          <span className="tabular-nums">{toFaDigits(heroDeal.stock.toLocaleString("fa-IR"))} باقی‌مانده</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                          <div className="fd-bar h-full rounded-full transition-all duration-500" style={{ width: `${heroSoldPct}%` }} />
                        </div>
                        <p className="fd-pulse mt-2 flex items-center gap-1.5 text-[10.5px] font-black text-[#F59E0B]">
                          <Gauge className="h-3.5 w-3.5" aria-hidden />
                          {toFaDigits(heroSoldPct.toLocaleString("fa-IR"))}٪ موجودی این پیشنهاد تمام شده است
                        </p>
                      </div>
                    )}
                    <Link
                      href={`/products/${heroDeal.slug}`}
                      className="fd-buy flex h-13 items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <Zap className="h-4.5 w-4.5" aria-hidden />
                      شکار این پیشنهاد
                    </Link>
                  </div>
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ CATEGORIES — hazard shelves ═══ */}
          {data.categories.length > 0 && (
            <section aria-labelledby="fd-cats">
              <Reveal>
                <HudHeader icon={LayoutGrid} title="قفسه‌های فروش فلش" subtitle="از هر دنیایی، یک تخفیف" href="/products" />
                <div className="taj-stagger grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {data.categories.slice(0, 12).map((c) => (
                    <Link
                      key={c.id}
                      href={`/products?category=${c.slug}`}
                      aria-label={c.name}
                      className="fd-card group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition-all hover:-translate-y-0.5 hover:border-[#EF4444]/60"
                    >
                      <span className="relative block aspect-square overflow-hidden bg-black/40">
                        {c.image ? (
                          <Image src={c.image} alt={`دسته‌بندی ${c.name}`} fill sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 12vw" className="object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-[#EF4444]/10 text-lg font-black text-[#EF4444]">{c.name.charAt(0)}</span>
                        )}
                      </span>
                      <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2">
                        <span className="truncate text-[11px] font-black text-white">{c.name}</span>
                        <span className="text-[9px] font-bold text-white/70 tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ FLASH GRID — discounted is the protagonist ═══ */}
          {deals.length > 0 && (
            <section aria-labelledby="fd-grid">
              <Reveal>
                <HudHeader icon={Zap} title="تخفیف‌های فلش امروز" subtitle="موجودی محدود، قیمت‌های ذوب‌شده" href="/products?discount=1" />
                <div className="taj-stagger grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {deals.slice(0, 6).map((p, i) => (
                    <DealCard key={p.id} product={p} big={i === 0} showTimer={timerOn} showProgress={progressOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ ENDING SOON — lowest stock rail ═══ */}
          {endingSoon.length > 0 && (
            <section aria-labelledby="fd-soon">
              <Reveal>
                <HudHeader icon={Flame} title="در حال اتمام" subtitle="این‌ها آخرین قطعه‌های انبارند" />
                <div className="taj-stagger flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {endingSoon.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="fd-card group flex w-64 shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#EF4444]/60"
                    >
                      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40">
                        {p.mainImage ? <Image src={p.mainImage} alt={p.name} fill sizes="64px" className="object-contain p-1.5" loading="lazy" /> : <Package className="m-auto h-5 w-5 text-white/40" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-white group-hover:text-[#FCA5A5]">{p.name}</span>
                        <span className="text-[11px] text-white/40 price-old tabular-nums">{formatPrice(p.price)}</span>
                        <span className="fd-glow-red-text block text-[13px] font-black text-[#F87171] tabular-nums">{formatPrice(p.effectivePrice)} تومان</span>
                      </span>
                      <span className="fd-pulse shrink-0 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2 py-1 text-[9.5px] font-black text-[#F59E0B] tabular-nums">
                        {p.stock > 0 ? `${toFaDigits(p.stock.toLocaleString("fa-IR"))} عدد` : "اتمام"}
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ NEWEST — fresh arrivals ═══ */}
          {data.newest.length > 0 && (
            <section aria-labelledby="fd-newest">
              <Reveal>
                <HudHeader icon={Sparkles} title="تازه‌رسیده‌ها" subtitle="تازه از خط تولید، تازه در نئون قرمز" href="/products?sort=newest" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.newest.slice(0, 8).map((p) => (
                    <DealCard key={p.id} product={p} showTimer={timerOn} showProgress={progressOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ SHOWCASES — hazard banners ═══ */}
          {data.showcases.length > 0 && (
            <section aria-label="بنرهای فروش ویژه">
              <Reveal>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {data.showcases.slice(0, 2).map((s) => (
                    <Link
                      key={s.id}
                      href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      className="fd-card group relative overflow-hidden rounded-3xl border border-white/10"
                    >
                      <span className="relative block aspect-[21/9] bg-black/40 md:aspect-[16/7]">
                        <Image src={s.image} alt={`بنر ${s.title}`} fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90" loading="lazy" />
                      </span>
                      <span aria-hidden className="fd-hazard absolute inset-x-0 bottom-0 h-1" />
                      <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6">
                        <span className="flex items-center gap-2">
                          <span className="fd-glow-amber rounded-lg bg-[#F59E0B] px-2.5 py-1 text-[10px] font-black text-[#431407]">بنر ویژه</span>
                          {s.product && (
                            <span className="fd-glow-red-text text-[12px] font-black text-[#F87171] tabular-nums">{formatPrice(s.product.discountPrice ?? s.product.price)} تومان</span>
                          )}
                        </span>
                        <span className="mt-2 text-lg font-black text-white md:text-xl">{s.title}</span>
                        {s.subtitle && <span className="mt-1 line-clamp-1 text-[11.5px] text-white/70">{s.subtitle}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ FEATURED — editor picks ═══ */}
          {data.featured.length > 0 && (
            <section aria-labelledby="fd-featured">
              <Reveal>
                <HudHeader icon={Radio} title="انتخاب سردبیر" subtitle="رادار سردبیر: چه چیزی ارزش خرید دارد" href="/products?sort=rating" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.featured.slice(0, 8).map((p) => (
                    <DealCard key={p.id} product={p} showTimer={timerOn} showProgress={progressOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ BESTSELLERS — hot list ═══ */}
          {data.bestsellers.length > 0 && (
            <section aria-labelledby="fd-best">
              <Reveal>
                <HudHeader icon={TrendingUp} title="پرفروش‌های همیشگی" subtitle="قهرمانان همیشگی فروش" href="/products?sort=bestselling" />
                <div className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <Link key={p.id} href={`/products/${p.slug}`} className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.05] p-3 transition-transform hover:-translate-y-0.5">
                      <span className="fd-glow-red grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-[12px] font-black text-white tabular-nums">
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-white group-hover:text-[#FCA5A5]">{p.name}</span>
                        <span className="fd-glow-red-text text-[11px] font-black text-[#F87171] tabular-nums">{formatPrice(p.effectivePrice)} تومان</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ EXCLUSIVE — isSpecial glass pods (v15) ═══ */}
          {data.exclusive.length > 0 && (
            <section aria-labelledby="fd-exclusive">
              <Reveal>
                <HudHeader icon={Gem} title="انحصاری‌های فلش" subtitle="فقط این‌جا — فقط این مدت" />
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.exclusive.slice(0, 8).map((p) => (
                    <DealCard key={p.id} product={p} showTimer={timerOn} showProgress={progressOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ STORIES (dark-scoped via --background override) ═══ */}
          {stories.length > 0 && (
            <section aria-label="استوری‌های فروشگاه" style={{ "--background": "var(--fd-char)" } as React.CSSProperties}>
              <Reveal>
                <StoriesRow stories={stories} />
              </Reveal>
            </section>
          )}

          {/* ═══ FAQ ═══ */}
          {data.faq.length > 0 && (
            <section aria-labelledby="fd-faq">
              <Reveal>
                <HudHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="قبل از شلیک، این‌ها را بخوانید" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <HudFaq key={i} h={f.h} p={f.p} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ BRANDS ═══ */}
          {data.brands.length > 0 && (
            <section className="border-t border-white/10 pt-10" aria-label="برندهای همکار">
              <Reveal>
                <ul className="flex flex-wrap justify-center gap-2.5">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link href={`/products?brand=${b.slug}`} className="fd-card flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-[12.5px] font-bold text-white/85 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#EF4444]/60 hover:text-[#FCA5A5]">
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
            <section className="py-16">
              <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-[#EF4444]/40 p-16 text-center">
                <span aria-hidden className="fd-hazard absolute inset-x-0 top-0 h-1.5" />
                <Timer className="mx-auto mb-4 h-12 w-12 text-[#EF4444]/60" aria-hidden />
                <h2 className="text-lg font-black text-white">هنوز هیچ پیشنهاد فلشی روشن نشده</h2>
                <p className="mt-2 text-sm leading-7 text-white/55">چراغ‌های قرمز فروش فلش به‌زودی روشن می‌شوند…</p>
              </div>
            </section>
          )}
        </div>
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* v25 scoped style — ONE plain <style> block, all rules under [data-tpl="flash-deals"] */}
      <style>{`
[data-tpl="flash-deals"] {
  --fd-red: #EF4444;
  --fd-red-deep: #B91C1C;
  --fd-amber: #F59E0B;
  --fd-char: #141019;
}
/* diagonal hazard stripes (45°) */
[data-tpl="flash-deals"] .fd-hazard {
  background: repeating-linear-gradient(45deg, var(--fd-red) 0 12px, var(--fd-red-deep) 12px 24px);
}
/* red neon glows */
[data-tpl="flash-deals"] .fd-glow-red { box-shadow: 0 0 24px -6px rgba(239,68,68,.8); }
[data-tpl="flash-deals"] .fd-glow-red-text { text-shadow: 0 0 16px rgba(239,68,68,.55); }
[data-tpl="flash-deals"] .fd-glow-amber { box-shadow: 0 0 20px -5px rgba(245,158,11,.8); }
[data-tpl="flash-deals"] .fd-digit { text-shadow: 0 0 22px rgba(239,68,68,.9), 0 0 44px rgba(239,68,68,.5); }
[data-tpl="flash-deals"] .fd-cell { box-shadow: inset 0 0 14px rgba(239,68,68,.14); }
[data-tpl="flash-deals"] .fd-clock { box-shadow: 0 0 14px -6px rgba(239,68,68,.55); }
/* dark glass cards → red neon hover */
[data-tpl="flash-deals"] .fd-card:hover {
  border-color: rgba(239,68,68,.6);
  box-shadow: 0 0 0 1px rgba(239,68,68,.28), 0 18px 44px -18px rgba(239,68,68,.42);
}
[data-tpl="flash-deals"] .fd-card-hero {
  box-shadow: 0 0 60px -24px rgba(239,68,68,.5), inset 0 1px 0 rgba(255,255,255,.06);
}
/* quick-buy gradient button */
[data-tpl="flash-deals"] .fd-buy {
  background-image: linear-gradient(135deg, #EF4444, #B91C1C);
  box-shadow: 0 12px 30px -12px rgba(239,68,68,.75);
}
[data-tpl="flash-deals"] .fd-buy:hover { background-image: linear-gradient(135deg, #F87171, #DC2626); }
/* sold progress bar (amber→red) */
[data-tpl="flash-deals"] .fd-bar {
  background-image: linear-gradient(to left, #F59E0B, #EF4444);
  box-shadow: 0 0 12px -3px rgba(239,68,68,.7);
}
/* pulsing urgency chips */
[data-tpl="flash-deals"] .fd-pulse { animation: fd-pulse 1.5s ease-in-out infinite; }
@keyframes fd-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .7; transform: scale(1.04); }
}
/* HUD band scanline shimmer */
[data-tpl="flash-deals"] .fd-band::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(100deg, transparent 40%, rgba(255,255,255,.045) 50%, transparent 60%);
  background-size: 260% 100%;
  animation: fd-scan 5.5s linear infinite;
}
@keyframes fd-scan { from { background-position: 200% 0; } to { background-position: -60% 0; } }
/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  [data-tpl="flash-deals"] .fd-pulse,
  [data-tpl="flash-deals"] .fd-band::after { animation: none !important; }
}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════ */
html:not(.dark) [data-tpl="flash-deals"] {
  --fd-red: #DC2626;
  --fd-red-deep: #B91C1C;
  --fd-amber: #F59E0B;
  --fd-char: #FBF4ED;
  --background: #FBF4ED;
  --foreground: #33211A;
  --card: #FFFFFF;
  --card-foreground: #33211A;
  --muted: #F3EADD;
  --muted-foreground: #6B564A;
  --border: rgba(51, 33, 26, 0.12);
  --input: rgba(51, 33, 26, 0.14);
  --primary: #B91C1C;
  --primary-foreground: #FFFFFF;
  --accent: #F3EADD;
  --accent-foreground: #33211A;
  --popover: #FFFFFF;
  --popover-foreground: #33211A;
  background-color: #FBF4ED;
  color: #33211A;
}

/* ── body canvas wrapper ── */
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#141019\\] { background-color: #FBF4ED; }

/* ── surfaces: white-alpha glass → white cards + ink hairlines; black wells → cream tints ── */
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/\\[0\\.045\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/\\[0\\.04\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/\\[0\\.05\\] { background-color: rgba(51, 33, 26, 0.035); }
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/\\[0\\.03\\] { background-color: rgba(51, 33, 26, 0.03); }
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.72); }
html:not(.dark) [data-tpl="flash-deals"] .bg-white\\/10 { background-color: rgba(51, 33, 26, 0.1); }
html:not(.dark) [data-tpl="flash-deals"] .border-white\\/10 { border-color: rgba(51, 33, 26, 0.12); }
html:not(.dark) [data-tpl="flash-deals"] .border-white\\/15 { border-color: rgba(51, 33, 26, 0.16); }
html:not(.dark) [data-tpl="flash-deals"] .bg-black\\/30 { background-color: rgba(51, 33, 26, 0.04); }
html:not(.dark) [data-tpl="flash-deals"] .bg-black\\/40 { background-color: rgba(51, 33, 26, 0.04); }
html:not(.dark) [data-tpl="flash-deals"] .bg-black\\/45 { background-color: rgba(51, 33, 26, 0.04); }

/* ── red & amber accents: same families, deepened for cream surfaces ── */
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#F87171\\] { color: #DC2626; }
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#FCA5A5\\] { color: #B91C1C; }
html:not(.dark) [data-tpl="flash-deals"] .hover\\:text-\\[\\#FCA5A5\\]:hover { color: #B91C1C; }
html:not(.dark) [data-tpl="flash-deals"] .group-hover\\:text-\\[\\#FCA5A5\\]\\:is\\(\\:where\\(\\.group\\)\\:hover \\*\\) { color: #B91C1C; }
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#F59E0B\\] { color: #B45309; }
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#EF4444\\] { color: #DC2626; }
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#EF4444\\]\\/60 { color: rgba(220, 38, 38, 0.7); }
html:not(.dark) [data-tpl="flash-deals"] .text-\\[\\#EF4444\\]\\/70 { color: rgba(220, 38, 38, 0.75); }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#EF4444\\]\\/10 { background-color: rgba(239, 68, 68, 0.08); }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#EF4444\\]\\/12 { background-color: rgba(239, 68, 68, 0.08); }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#EF4444\\]\\/15 { background-color: rgba(239, 68, 68, 0.1); }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#F59E0B\\]\\/10 { background-color: rgba(245, 158, 11, 0.1); }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#F59E0B\\]\\/15 { background-color: rgba(245, 158, 11, 0.12); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#EF4444\\]\\/70 { border-color: rgba(220, 38, 38, 0.5); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#EF4444\\]\\/45 { border-color: rgba(220, 38, 38, 0.38); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#EF4444\\]\\/40 { border-color: rgba(220, 38, 38, 0.35); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#EF4444\\]\\/35 { border-color: rgba(220, 38, 38, 0.3); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#EF4444\\]\\/25 { border-color: rgba(220, 38, 38, 0.24); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#F59E0B\\]\\/35 { border-color: rgba(180, 83, 9, 0.4); }
html:not(.dark) [data-tpl="flash-deals"] .border-\\[\\#F59E0B\\]\\/40 { border-color: rgba(180, 83, 9, 0.45); }
html:not(.dark) [data-tpl="flash-deals"] .hover\\:border-\\[\\#EF4444\\]\\/60:hover { border-color: rgba(220, 38, 38, 0.5); }

/* ── white-alpha text → ink-alpha (image-overlay whites restored below) ── */
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/30 { color: rgba(51, 33, 26, 0.32); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/40 { color: rgba(51, 33, 26, 0.42); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/45 { color: rgba(51, 33, 26, 0.47); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/50 { color: rgba(51, 33, 26, 0.52); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/55 { color: rgba(51, 33, 26, 0.57); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/60 { color: rgba(51, 33, 26, 0.62); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/80 { color: rgba(51, 33, 26, 0.8); }
html:not(.dark) [data-tpl="flash-deals"] .text-white\\/85 { color: rgba(51, 33, 26, 0.87); }

/* ── .text-white blanket → ink; restored on surfaces that STAY colored/dark ── */
html:not(.dark) [data-tpl="flash-deals"] .text-white { color: #33211A; }
html:not(.dark) [data-tpl="flash-deals"] .fd-buy.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .fd-hazard.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-emerald-600.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .from-\\[\\#EF4444\\].to-\\[\\#B91C1C\\] { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-\\[\\#EF4444\\].text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .bg-black\\/70.text-white\\/90 { color: rgba(255, 255, 255, 0.9); }
html:not(.dark) [data-tpl="flash-deals"] .fill-white { fill: #FFFFFF; }
/* category/showcase image overlays stay dark → keep their white/rose captions */
html:not(.dark) [data-tpl="flash-deals"] .from-black\\/80 .text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .from-black\\/80 .text-white\\/70 { color: rgba(255, 255, 255, 0.7); }
html:not(.dark) [data-tpl="flash-deals"] .from-black\\/85 .text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="flash-deals"] .from-black\\/85 .text-white\\/70 { color: rgba(255, 255, 255, 0.7); }
html:not(.dark) [data-tpl="flash-deals"] .from-black\\/85 .text-\\[\\#F87171\\] { color: #F87171; }

/* ── red neon glows → softened for light ── */
html:not(.dark) [data-tpl="flash-deals"] .shadow-\\[0_0_24px_-4px_rgba\\(239\\,68\\,68\\,75\\%\\)\\] { --tw-shadow: 0 0 24px -4px rgba(220, 38, 38, 0.4); }
html:not(.dark) [data-tpl="flash-deals"] .shadow-\\[0_0_22px_-4px_rgba\\(239\\,68\\,68\\,85\\%\\)\\] { --tw-shadow: 0 0 22px -4px rgba(220, 38, 38, 0.42); }
html:not(.dark) [data-tpl="flash-deals"] .shadow-\\[0_4px_16px_-4px_rgba\\(239\\,68\\,68\\,80\\%\\)\\] { --tw-shadow: 0 4px 16px -4px rgba(220, 38, 38, 0.4); }

/* ── scoped helper classes → light variants ── */
html:not(.dark) [data-tpl="flash-deals"] .fd-glow-red { box-shadow: 0 0 24px -6px rgba(220, 38, 38, 0.4); }
html:not(.dark) [data-tpl="flash-deals"] .fd-glow-red-text { text-shadow: 0 0 16px rgba(220, 38, 38, 0.22); }
html:not(.dark) [data-tpl="flash-deals"] .fd-glow-amber { box-shadow: 0 0 20px -5px rgba(180, 83, 9, 0.4); }
html:not(.dark) [data-tpl="flash-deals"] .fd-digit { text-shadow: 0 0 22px rgba(220, 38, 38, 0.3), 0 0 44px rgba(220, 38, 38, 0.15); }
html:not(.dark) [data-tpl="flash-deals"] .fd-cell { box-shadow: inset 0 0 14px rgba(220, 38, 38, 0.08); }
html:not(.dark) [data-tpl="flash-deals"] .fd-clock { box-shadow: 0 0 14px -6px rgba(220, 38, 38, 0.25); }
html:not(.dark) [data-tpl="flash-deals"] .fd-card:hover {
  border-color: rgba(220, 38, 38, 0.5);
  box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.12), 0 18px 44px -18px rgba(220, 38, 38, 0.16);
}
html:not(.dark) [data-tpl="flash-deals"] .fd-card-hero {
  box-shadow: 0 0 60px -24px rgba(220, 38, 38, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
html:not(.dark) [data-tpl="flash-deals"] .fd-buy { box-shadow: 0 12px 30px -12px rgba(220, 38, 38, 0.4); }
html:not(.dark) [data-tpl="flash-deals"] .fd-bar { box-shadow: 0 0 12px -3px rgba(220, 38, 38, 0.35); }
`}</style>
    </div>
  );
}

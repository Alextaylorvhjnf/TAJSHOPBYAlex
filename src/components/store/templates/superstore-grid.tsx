"use client";

/**
 * TEMPLATE · superstore-grid — «سوپرمارکت نئون ارزش» (v25 · neon value rewrite)
 * ------------------------------------------------------------------------
 * Charcoal #131318 superstore with yellow #FACC15 + red #EF4444 price-bomb
 * energy:
 *  - diagonal FLASH ribbons (skewed CSS strips) on the hero
 *  - PRICE-BOMB tiles — huge tabular-nums prices, red discount strike,
 *    rotated ribbon badges
 *  - hazard-stripe dividers between every aisle
 *  - organized density: aisle headers with icons + sticky-feel chip rail
 *    + 2/3/4/5-column tile grids
 *
 * The whole family (chrome included) is forced onto the charcoal palette
 * via CSS var overrides in the scoped <style>; the chrome's amber accent
 * is retuned to pure yellow. No registered features.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Check, ChevronLeft, Star, Flame, ShoppingCart, Timer, Zap,
  BadgeCheck, TrendingUp, HelpCircle, Smartphone, Laptop, Computer, Cpu,
  Monitor, Gamepad2, Watch, HardDrive, Keyboard, Mouse, Camera, Speaker,
  Wifi, BatteryCharging, Projector, Headphones, LayoutGrid, Store, Boxes,
  ShieldCheck, Truck, CreditCard, Headset, Gem, ArrowLeft, Siren, Percent,
  Sparkles, Rocket, Crown,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { RAIL_URLS } from "@/lib/templates/slide-targets";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";
/* v32 (14-a): shared scroll-animation system — staggered tiles, 3D flip
 * hero product, parallax ribbons, lights-on glow */
import { RevealOnScroll, FlipOnScroll, ParallaxBand, GlowOnScroll, sfxStagger, SCROLL_FX_CSS } from "./scroll-fx";

/* category slug → lucide icon */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Zap, headphones: Headphones, earbuds: Zap, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/* ── hydration-safe countdown ─────────────────────────────────────── */
function ValueCountdown({ endsAt }: { endsAt?: string | null }) {
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
    <p className="sg-timer flex items-center gap-2 px-4 py-2 text-[13px] font-black tabular-nums text-yellow-300" role="timer" aria-label="زمان باقی‌مانده فروش فلش">
      <Timer className="h-4 w-4" aria-hidden />
      {(left?.h ?? "—")}:{(left?.m ?? "—")}:{(left?.s ?? "—")}
    </p>
  );
}

/* ── aisle header with icon + hazard divider ──────────────────────── */
function AisleHead({
  icon: Icon, kicker, title, href, n,
}: { icon: React.ElementType; kicker: string; title: string; href?: string; n: number }) {
  return (
    <div className="sg-aisle mb-5">
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FACC15] text-[#131318] shadow-[0_8px_20px_-8px_rgba(250,204,21,.7)]">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-yellow-300/90">
            <span className="rounded bg-[#EF4444] px-1.5 py-px font-mono tabular-nums text-white" aria-hidden>
              {toFaDigits(String(n).padStart(2, "0"))}
            </span>
            {kicker}
          </p>
          <h2 className="mt-1 truncate text-[17px] font-black leading-7 text-zinc-50 md:text-xl">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="sg-chip group flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-black text-yellow-200">
            مشاهدهٔ همه
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
      <span aria-hidden className="sg-hazard mt-3 block h-1.5 w-full rounded-full" />
    </div>
  );
}

/* ── PRICE-BOMB tile ──────────────────────────────────────────────── */
function BombTile({ product, hero, i = 0 }: { product: TemplateProduct; hero?: boolean; i?: number }) {
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
    <RevealOnScroll
      variant="tilt"
      delay={sfxStagger(i, 65)}
      className={cn(hero && "sm:col-span-2 sm:row-span-2")}
    >
    <article
      className={cn(
        "sg-tile group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1A1A22]",
        !product.inStock && "opacity-55 grayscale-[0.4]"
      )}
    >
      {/* rotated ribbon discount badge */}
      {product.discountPercent > 0 && (
        <span aria-hidden className="sg-ribbon" />
      )}
      {product.discountPercent > 0 && (
        <span className={cn(
          "absolute z-10 font-black tabular-nums text-white",
          hero ? "start-5 top-5 rounded-xl bg-[#EF4444] px-3 py-1.5 text-[13px]" : "start-3 top-3 rounded-lg bg-[#EF4444] px-2 py-0.5 text-[10.5px]"
        )}>
          {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
        </span>
      )}
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square bg-[#131318]">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes={hero ? "(max-width: 640px) 92vw, 44vw" : "(max-width: 640px) 46vw, (max-width: 1024px) 23vw, 18vw"}
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-zinc-600">
            <Package className={hero ? "h-16 w-16" : "h-10 w-10"} aria-hidden />
          </span>
        )}
        {product.inStock && product.soldCount > 10 && (
          <span className="sg-value-badge absolute bottom-2 end-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black text-[#131318]">
            <TrendingUp className="h-3 w-3" aria-hidden />
            ارزش خرید
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-3 top-3 z-10 rounded-lg bg-zinc-700 px-2 py-0.5 text-[9px] font-bold text-zinc-200">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-[9.5px] font-bold text-zinc-500">
            <BadgeCheck className="h-3 w-3 shrink-0 text-yellow-400/80" aria-hidden />
            {product.brand.name}
          </p>
          {product.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-zinc-500 tabular-nums">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden />
              {toFaDigits(product.rating.toLocaleString("fa-IR"))}
            </span>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-[12.5px] font-bold leading-[19px] text-zinc-50 transition-colors hover:text-yellow-300">
          {product.name}
        </Link>
        <div className="mt-auto pt-1">
          {product.discountPercent > 0 && (
            <p className={cn("leading-5 text-[#F87171] price-old tabular-nums", hero ? "text-[13px]" : "text-[11px]")}>
              {formatPrice(product.price)} تومان
            </p>
          )}
          <p className={cn("font-black leading-7 text-yellow-300 tabular-nums", hero ? "text-3xl" : "text-[17px]")}>
            {formatPrice(product.effectivePrice)}
            <span className="text-[9.5px] font-normal text-zinc-500"> تومان</span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl text-[12px] font-black transition-all active:scale-[0.97]",
              hero ? "h-12" : "h-10",
              product.inStock
                ? added
                  ? "bg-emerald-500 text-[#052E1B]"
                  : "sg-buy text-[#131318]"
                : "cursor-not-allowed bg-zinc-800 text-zinc-500"
            )}
          >
            {added ? <Check className="h-4.5 w-4.5" aria-hidden /> : <ShoppingCart className="h-4.5 w-4.5" aria-hidden />}
            {product.inStock ? (added ? "به سبد رفت!" : "می‌خرم!") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
    </RevealOnScroll>
  );
}

/* ═════════════════════ TEMPLATE ═════════════════════ */
export function SuperstoreGridTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["superstore-grid"];

  const stories = useMemo<StoryItem[]>(() =>
    (data.stories ?? []).map((s) => ({
      id: s.id, title: s.title, image: s.image, videoUrl: s.videoUrl,
      duration: s.duration, linkUrl: s.linkUrl, badge: s.badge,
      product: s.product, category: s.category,
    })), [data.stories]);

  /* flash hero = biggest active discount (fallback: first discounted) */
  const flashHero = useMemo(() => {
    const pool = (data.discounted ?? []).filter((p) => p.inStock);
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => b.discountPercent - a.discountPercent)[0];
  }, [data.discounted]);
  const deals = useMemo(() => {
    const seen = new Set<string>();
    const out: TemplateProduct[] = [];
    for (const p of [...(data.discounted ?? []), ...(data.featured ?? [])]) {
      if (seen.has(p.id) || (flashHero && p.id === flashHero.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out.slice(0, 9);
  }, [data.discounted, data.featured, flashHero]);

  const bestsellers = (data.bestsellers ?? []).slice(0, 10);
  const newest = (data.newest ?? []).slice(0, 10);
  const exclusive = (data.exclusive ?? []).slice(0, 8);
  const hasAnyProduct = deals.length > 0 || bestsellers.length > 0 || newest.length > 0 || exclusive.length > 0;

  const benefits = [
    { icon: Truck, title: "ارسال سوپری", text: "سبک تا ۲۴ ساعت" },
    { icon: ShieldCheck, title: "ضمانت بازگشت", text: "۷ روز بی‌قید و شرط" },
    { icon: CreditCard, title: "پرداخت در محل", text: "تهران و کرج" },
    { icon: Headset, title: "خط سوپرمارکت", text: "پاسخ فوری" },
  ];

  let aisle = 0;
  const nextAisle = () => ++aisle;

  return (
    <div data-template-chrome="1" data-tpl="superstore-grid" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* NOTE: announcement/ticker renders inside the template's own H8
          chrome header — never duplicated in the body. */}
      <div className="sg-shell relative w-full">
        {/* ═══ 1 · FLASH HERO with diagonal ribbons ═══ */}
        {flashHero && (
          <section className="relative px-4 pb-8 pt-6 md:pt-8" aria-labelledby="sg-flash">
            <div className="sg-hero relative mx-auto grid max-w-7xl items-center gap-6 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-[#1A1A22] p-6 md:p-9 lg:grid-cols-[1fr_.8fr]">
              {/* diagonal flash ribbons — now riding the scroll (v32 14-a) */}
              <ParallaxBand className="sg-para" speed={0.1} range={90}>
                <span aria-hidden className="sg-flash sg-flash-a" />
              </ParallaxBand>
              <ParallaxBand className="sg-para" speed={0.06} range={70}>
                <span aria-hidden className="sg-flash sg-flash-b" />
              </ParallaxBand>
              {/* vertical value-tape ribbon drifting top-to-bottom */}
              <ParallaxBand className="sg-tape" speed={0.15} range={130} />
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#EF4444] px-4 py-1.5 text-[11px] font-black text-white">
                  <Siren className="h-4 w-4" aria-hidden />
                  فروش فلش سوپرمارکت
                </p>
                <h1 id="sg-flash" className="mt-4 line-clamp-2 text-2xl font-black leading-[1.35] text-zinc-50 md:text-[2rem]">
                  {flashHero.name}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-[12px] text-zinc-400">
                  <BadgeCheck className="h-4 w-4 text-yellow-400" aria-hidden />
                  {flashHero.brand.name}
                  <span className="text-zinc-600">/</span>
                  {flashHero.category.name}
                </p>
                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <p className="flex flex-col">
                    {flashHero.discountPercent > 0 && (
                      <span className="text-[14px] leading-6 text-[#F87171] price-old tabular-nums">
                        {formatPrice(flashHero.price)} تومان
                      </span>
                    )}
                    <span className="text-4xl font-black leading-none text-yellow-300 tabular-nums md:text-[2.75rem]">
                      {formatPrice(flashHero.effectivePrice)}
                      <span className="text-[13px] font-normal text-zinc-400"> تومان</span>
                    </span>
                  </p>
                  <ValueCountdown endsAt={flashHero.discountEndsAt ?? store.timerEndsAt ?? null} />
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/products/${flashHero.slug}`}
                    className="sg-buy flex h-12 items-center gap-2 rounded-xl px-7 text-[13.5px] font-black text-[#131318]"
                  >
                    <Zap className="h-5 w-5" aria-hidden />
                    قیمت بمبی — بزن بریم!
                  </Link>
                  <Link href="/products?discount=1" className="flex h-12 items-center gap-2 rounded-xl border border-yellow-400/40 px-5 text-[12.5px] font-black text-yellow-200 transition-colors hover:bg-yellow-400/10">
                    <Percent className="h-4.5 w-4.5" aria-hidden />
                    همهٔ تخفیف‌ها
                  </Link>
                </div>
              </div>
              <div className="sg-hero-visual relative mx-auto aspect-square w-full max-w-xs md:max-w-sm">
                {/* the flash product turns in like a page and its lights
                    ramp on (GlowOnScroll) — the v32 scroll-motion moment */}
                <GlowOnScroll color="#FACC15" size={54}>
                  <FlipOnScroll degrees={52} origin="start" className="h-full">
                    <Link href={`/products/${flashHero.slug}`} aria-label={flashHero.name} className="absolute inset-0 grid place-items-center">
                      {flashHero.mainImage ? (
                        <Image
                          src={flashHero.mainImage}
                          alt={flashHero.name}
                          fill
                          sizes="(max-width: 1024px) 70vw, 400px"
                          className="object-contain p-6 drop-shadow-[0_16px_40px_rgba(250,204,21,.25)]"
                          priority
                        />
                      ) : (
                        <Package className="h-20 w-20 text-zinc-600" aria-hidden />
                      )}
                    </Link>
                  </FlipOnScroll>
                </GlowOnScroll>
                <span aria-hidden className="sg-hero-ring absolute inset-3 rounded-[2rem] border-2 border-dashed border-yellow-400/25" />
              </div>
            </div>
          </section>
        )}

        {/* ═══ 2 · STICKY-FEEL CATEGORY CHIP RAIL ═══ */}
        {data.categories.length > 0 && (
          <section className="relative px-4 py-4" aria-label="قفسه‌های سوپرمارکت">
            <div className="sg-chipbar relative mx-auto flex max-w-7xl items-center gap-2 rounded-full border border-white/[0.08] bg-[#1A1A22]/90 px-3 py-2.5 backdrop-blur-xl">
              <Link href="/products" className="sg-chip-active flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-black text-[#131318]">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                همهٔ قفسه‌ها
              </Link>
              <span aria-hidden className="h-6 w-px shrink-0 bg-white/10" />
              <div className="sg-rail flex flex-1 gap-2 overflow-x-auto">
                {data.categories.slice(0, 14).map((c, ci) => {
                  const Icon = CAT_ICONS[c.slug] ?? Boxes;
                  return (
                    <RevealOnScroll key={c.id} variant="fade" delay={sfxStagger(ci, 45, 10)} className="shrink-0">
                      <Link
                        href={`/products?category=${c.slug}`}
                        className="sg-chip flex h-10 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-bold text-zinc-50"
                      >
                        <Icon className="h-4 w-4 text-yellow-400/90" aria-hidden />
                        {c.name}
                        <span className="text-[9.5px] font-normal text-zinc-500 tabular-nums">{c.productCount.toLocaleString("fa-IR")}</span>
                      </Link>
                    </RevealOnScroll>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 3 · STORIES ═══ */}
        {stories.length > 0 && (
          <section className="relative px-4 py-4" aria-label="استوری‌های فروشگاه">
            <Reveal><StoriesRow stories={stories} /></Reveal>
          </section>
        )}

        {/* ═══ 4 · AISLE 1 — flash deals grid ═══ */}
        {deals.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="sg-aisle1">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <div id="sg-aisle1">
                  <AisleHead icon={Flame} kicker="قفسهٔ تخفیف‌های فلش" title="بمب‌های قیمتی امروز" href="/products?discount=1" n={nextAisle()} />
                </div>
              </RevealOnScroll>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {flashHero && <BombTile product={flashHero} hero />}
                  {deals.map((p, i) => (
                    <BombTile key={p.id} product={p} i={i + 1} />
                  ))}
                </div>
            </div>
          </section>
        )}

        {/* ═══ 5 · AISLE 2 — bestsellers ═══ */}
        {bestsellers.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="sg-aisle2">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <div id="sg-aisle2">
                  <AisleHead icon={Crown} kicker="قفسهٔ پرفروش‌ها" title="چرخ‌های همیشه‌پرچرخ سوپر" href={RAIL_URLS.bestsellers} n={nextAisle()} />
                </div>
              </RevealOnScroll>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {bestsellers.map((p, i) => (
                    <BombTile key={p.id} product={p} i={i} />
                  ))}
                </div>
            </div>
          </section>
        )}

        {/* ═══ 6 · AISLE 3 — newest arrivals ═══ */}
        {newest.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="sg-aisle3">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <div id="sg-aisle3">
                  <AisleHead icon={Rocket} kicker="قفسهٔ تازه‌ها" title="تازه از کارتن، تازه به قفسه" href="/products?sort=newest" n={nextAisle()} />
                </div>
              </RevealOnScroll>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {newest.map((p, i) => (
                    <BombTile key={p.id} product={p} i={i} />
                  ))}
                </div>
            </div>
          </section>
        )}

        {/* ═══ 7 · AISLE 4 — exclusive rail ═══ */}
        {exclusive.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="sg-aisle4">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <div id="sg-aisle4">
                  <AisleHead icon={Gem} kicker="قفسهٔ ویژه" title="کالاهای انحصاری سوپرمارکت" href="/products?special=1" n={nextAisle()} />
                </div>
              </RevealOnScroll>
                <div className="sg-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                  {exclusive.map((p, i) => (
                    <RevealOnScroll key={p.id} variant="tilt" delay={sfxStagger(i, 70)} className="w-44 shrink-0 snap-start sm:w-48">
                    <article className="sg-tile group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1A1A22] p-2.5">
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[#131318]">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 44vw, 190px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-zinc-600"><Package className="h-10 w-10" aria-hidden /></span>
                        )}
                        <span className="absolute start-1.5 top-1.5 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[8.5px] font-black text-[#131318]">انحصاری</span>
                      </Link>
                      <p className="mt-2 line-clamp-1 text-[12px] font-bold text-zinc-50">{p.name}</p>
                      <p className="mt-1 text-[14px] font-black text-yellow-300 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9px] font-normal text-zinc-500"> تومان</span>
                      </p>
                    </article>
                    </RevealOnScroll>
                  ))}
                </div>
            </div>
          </section>
        )}

        {/* ═══ 8 · SHOWCASE BANNERS ═══ */}
        {(data.showcases ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-label="بنرهای فروشگاه">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.showcases.slice(0, 4).map((sc, i) => (
                    <RevealOnScroll key={sc.id} variant={i % 2 === 0 ? "start" : "end"} delay={sfxStagger(i, 90, 3)}>
                    <Link
                      href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                      className="sg-showcase group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1A1A22]"
                    >
                      <span aria-hidden className="sg-flash sg-flash-a" />
                      <div className="relative aspect-[16/7]">
                        <Image src={sc.image} alt={sc.title} fill sizes="(max-width: 768px) 92vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#131318]/95 via-[#131318]/40 to-transparent" />
                      </div>
                      <div className="absolute inset-y-0 end-0 flex w-full max-w-[62%] flex-col justify-center gap-1.5 p-5 md:p-7">
                        <p className="text-[9.5px] font-black tracking-[0.18em] text-yellow-300">سوپربزرگ بخرید</p>
                        <h3 className="text-[16px] font-black leading-7 text-zinc-50 md:text-lg">{sc.title}</h3>
                        {sc.subtitle && <p className="line-clamp-2 text-[11.5px] leading-6 text-zinc-400">{sc.subtitle}</p>}
                        <span className="sg-buy mt-1.5 inline-flex h-10 w-fit items-center gap-1.5 rounded-lg px-4 text-[11.5px] font-black text-[#131318]">
                          بزن بریم
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </Link>
                    </RevealOnScroll>
                  ))}
                </div>
              </RevealOnScroll>
            </div>
          </section>
        )}

        {/* ═══ 9 · BENEFITS + COUNTS ═══ */}
        <section className="relative px-4 py-8" aria-label="مزایا و آمار سوپرمارکت">
          <div className="mx-auto max-w-7xl">
            <RevealOnScroll>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {benefits.map((b, i) => (
                  <RevealOnScroll key={b.title} variant="zoom" delay={sfxStagger(i, 70)}>
                  <div className="flex h-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#1A1A22] p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-400/12 text-yellow-300 ring-1 ring-yellow-400/30">
                      <b.icon className="h-5.5 w-5.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-black text-zinc-50">{b.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{b.text}</span>
                    </span>
                  </div>
                  </RevealOnScroll>
                ))}
              </div>
              <div className="sg-stats mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { icon: Package, label: "کالا روی قفسه", value: counts.products },
                  { icon: LayoutGrid, label: "قفسه‌بندی", value: counts.categories },
                  { icon: BadgeCheck, label: "برند", value: counts.brands },
                  { icon: Sparkles, label: "استوری", value: counts.stories },
                ].map((s, i) => (
                  <RevealOnScroll key={s.label} variant="fade" delay={sfxStagger(i, 60)}>
                  <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.07] bg-[#1A1A22]/70 p-4">
                    <s.icon className="h-4.5 w-4.5 text-yellow-400/80" aria-hidden />
                    <span className="text-lg font-black text-zinc-50 tabular-nums">{toFaDigits(s.value.toLocaleString("fa-IR"))}</span>
                    <span className="text-[10.5px] text-zinc-500">{s.label}</span>
                  </div>
                  </RevealOnScroll>
                ))}
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* ═══ 10 · FAQ ═══ */}
        {(data.faq ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="sg-faq">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <AisleHead icon={HelpCircle} kicker="قفسهٔ پرسش‌ها" title="قبل از چرخ زدن بخوانید" n={nextAisle()} />
              </RevealOnScroll>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <RevealOnScroll key={i} variant="fade" delay={sfxStagger(i, 55, 6)}>
                    <details className="group rounded-xl border border-white/[0.07] bg-[#1A1A22] p-4">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-[12.5px] font-bold text-zinc-50">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#EF4444]/15 font-mono text-[10.5px] font-black text-[#F87171] tabular-nums">
                          {toFaDigits(String(i + 1).padStart(2, "0"))}
                        </span>
                        {f.h}
                        <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:-rotate-90" aria-hidden />
                      </summary>
                      <p className="mt-3 border-t border-white/[0.07] pt-3 text-[12px] leading-7 text-zinc-400">{f.p}</p>
                    </details>
                    </RevealOnScroll>
                  ))}
                </div>
            </div>
          </section>
        )}

        {/* ═══ 11 · BRAND CHIPS ═══ */}
        {(data.brands ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-label="برندهای سوپرمارکت">
            <div className="mx-auto max-w-7xl">
              <RevealOnScroll variant="start">
                <AisleHead icon={Store} kicker="قفسهٔ برندها" title="تأمین‌کننده‌های سوپر" n={nextAisle()} />
              </RevealOnScroll>
                <ul className="flex flex-wrap gap-2">
                  {data.brands.map((b, i) => (
                    <li key={b.id}>
                      <RevealOnScroll variant="fade" delay={sfxStagger(i, 45, 12)}>
                        <Link href={`/products?brand=${b.slug}`} className="sg-chip flex h-10 items-center gap-2 rounded-full px-4 text-[11.5px] font-bold text-zinc-50">
                          {b.logo ? (
                            <Image src={b.logo} alt={b.name} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-contain" />
                          ) : (
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          )}
                          {b.name}
                        </Link>
                      </RevealOnScroll>
                    </li>
                  ))}
                </ul>
            </div>
          </section>
        )}

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="relative px-4 py-24">
            <div className="mx-auto max-w-lg overflow-hidden rounded-[2rem] border border-dashed border-yellow-400/40 bg-[#1A1A22] p-14 text-center">
              <Store className="mx-auto mb-4 h-12 w-12 text-yellow-400/70" aria-hidden />
              <h2 className="text-lg font-black text-zinc-50">سوپرمارکت هنوز چیدمان نشده</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                قفسه‌ها خالی‌اند؛ از{" "}
                <Link href="/products" className="font-bold text-yellow-300">آرشیو کالاها</Link> دیدن کنید.
              </p>
            </div>
          </section>
        )}
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS (single plain <style>) + shared scroll-fx ═══ */}
      <style>{`
/* v32 (14-a): parallax ribbon plumbing — the sg-flash stripes + the new
   vertical value tape translate on scroll (translate3d only, composited) */
[data-tpl="superstore-grid"] .sg-para { position:absolute; inset:0; pointer-events:none; z-index:0; }
[data-tpl="superstore-grid"] .sg-tape {
  position:absolute; top:-12%; height:124%; width:54px; inset-inline-start:6%;
  pointer-events:none; z-index:0; border-radius:999px; filter:blur(1.5px);
  background:linear-gradient(180deg, transparent 0%, rgba(250,204,21,.16) 26%, rgba(239,68,68,.2) 62%, rgba(250,204,21,.06) 84%, transparent 100%);
}
html:not(.dark) [data-tpl="superstore-grid"] .sg-tape {
  background:linear-gradient(180deg, transparent 0%, rgba(202,138,4,.12) 26%, rgba(220,38,38,.14) 62%, rgba(202,138,4,.05) 84%, transparent 100%);
}
/* flip/glow hero plumbing — percentage heights down the static wrappers */
[data-tpl="superstore-grid"] .sg-hero-visual .sfx-glow,
[data-tpl="superstore-grid"] .sg-hero-visual .sfx-flip-wrap { height:100%; }

[data-tpl="superstore-grid"] {
  --background: #131318;
  --foreground: #F4F4F5;
  --card: #1A1A22;
  --card-foreground: #F4F4F5;
  --muted: #202029;
  --muted-foreground: #A1A1AC;
  --border: rgba(255, 255, 255, 0.09);
  --input: rgba(255, 255, 255, 0.1);
  --primary: #FACC15;
  --primary-foreground: #131318;
  --accent: #202029;
  --accent-foreground: #F4F4F5;
  --popover: #1A1A22;
  --popover-foreground: #F4F4F5;
  background-color: #131318;
  color: #F4F4F5;
}
/* retune the chrome's amber accent to pure value-yellow */
[data-tpl="superstore-grid"] .bg-amber-500 { background-color: #FACC15 !important; color: #131318 !important; }
[data-tpl="superstore-grid"] .hover\\:bg-amber-400:hover { background-color: #FDE047 !important; }
[data-tpl="superstore-grid"] .bg-amber-100 { background-color: rgba(250, 204, 21, 0.12) !important; }
[data-tpl="superstore-grid"] .hover\\:bg-amber-200:hover { background-color: rgba(250, 204, 21, 0.22) !important; }
[data-tpl="superstore-grid"] .bg-amber-200 { background-color: rgba(250, 204, 21, 0.2) !important; }
[data-tpl="superstore-grid"] .bg-amber-500\\/15 { background-color: rgba(250, 204, 21, 0.15) !important; }
[data-tpl="superstore-grid"] .bg-amber-500\\/25 { background-color: rgba(250, 204, 21, 0.25) !important; }
[data-tpl="superstore-grid"] .text-amber-800 { color: #FDE047 !important; }
[data-tpl="superstore-grid"] .text-amber-700 { color: #FDE047 !important; }
[data-tpl="superstore-grid"] .text-amber-400 { color: #FACC15 !important; }
[data-tpl="superstore-grid"] .text-amber-300 { color: #FDE047 !important; }
[data-tpl="superstore-grid"] .border-amber-300 { border-color: rgba(250, 204, 21, 0.4) !important; }
[data-tpl="superstore-grid"] .border-amber-400\\/40 { border-color: rgba(250, 204, 21, 0.35) !important; }
[data-tpl="superstore-grid"] .from-amber-400 { --tw-gradient-from: #FACC15 !important; }
[data-tpl="superstore-grid"] .to-amber-600 { --tw-gradient-to: #EAB308 !important; }
[data-tpl="superstore-grid"] .shadow-amber-500\\/25 { --tw-shadow-color: rgba(250, 204, 21, 0.25) !important; }

/* ── shell + rails ── */
[data-tpl="superstore-grid"] .sg-shell { position: relative; isolation: isolate; overflow: clip; }
[data-tpl="superstore-grid"] .sg-rail { scrollbar-width: none; -ms-overflow-style: none; }
[data-tpl="superstore-grid"] .sg-rail::-webkit-scrollbar { display: none; }

/* ── hazard-stripe divider ── */
[data-tpl="superstore-grid"] .sg-hazard {
  background: repeating-linear-gradient(
    -45deg,
    #FACC15 0 12px,
    #131318 12px 24px
  );
  opacity: 0.85;
  mask-image: linear-gradient(to left, transparent 2%, black 12%, black 88%, transparent 98%);
  -webkit-mask-image: linear-gradient(to left, transparent 2%, black 12%, black 88%, transparent 98%);
}

/* ── diagonal FLASH ribbons ── */
[data-tpl="superstore-grid"] .sg-flash {
  position: absolute; pointer-events: none; z-index: 0;
  transform: skewX(-18deg);
}
[data-tpl="superstore-grid"] .sg-flash-a {
  top: -20px; inset-inline-end: 14%; width: 120px; height: 160%;
  background: linear-gradient(180deg, #FACC15, #EAB308);
  opacity: 0.14;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 92%, 26% 84%, 0 76%, 0 60%, 26% 52%, 0 44%, 0 28%, 26% 20%, 0 12%);
}
[data-tpl="superstore-grid"] .sg-flash-b {
  top: -20px; inset-inline-end: 40%; width: 34px; height: 160%;
  background: #EF4444;
  opacity: 0.2;
}
[data-tpl="superstore-grid"] .sg-hero { box-shadow: 0 26px 70px -32px rgba(250, 204, 21, 0.4); }
[data-tpl="superstore-grid"] .sg-hero-ring { animation: sg-dash 30s linear infinite; }
@keyframes sg-dash { to { transform: rotate(1turn); } }
[data-tpl="superstore-grid"] .sg-timer {
  background: #EF4444;
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
}

/* ── the value buy button (yellow→red bomb) ── */
[data-tpl="superstore-grid"] .sg-buy {
  background: linear-gradient(135deg, #FACC15 55%, #F59E0B);
  box-shadow: 0 8px 22px -8px rgba(250, 204, 21, 0.8);
  transition: box-shadow 0.25s ease, transform 0.15s ease, background-position 0.4s ease;
  background-size: 160% 100%;
}
[data-tpl="superstore-grid"] .sg-buy:hover { box-shadow: 0 12px 28px -10px rgba(239, 68, 68, 0.7); background-position: 90% 0; }
[data-tpl="superstore-grid"] .sg-buy:active { transform: scale(0.97); }

/* ── tiles ── */
[data-tpl="superstore-grid"] .sg-tile { transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
[data-tpl="superstore-grid"] .sg-tile:hover {
  transform: translateY(-3px);
  border-color: rgba(250, 204, 21, 0.4);
  box-shadow: 0 16px 38px -18px rgba(250, 204, 21, 0.45);
}
[data-tpl="superstore-grid"] .sg-ribbon {
  position: absolute; z-index: 5; top: 12px; inset-inline-start: -34px;
  width: 120px; transform: rotate(-45deg);
  background: repeating-linear-gradient(-45deg, #EF4444 0 10px, #DC2626 10px 20px);
  height: 22px;
  box-shadow: 0 4px 10px -3px rgba(239, 68, 68, 0.8);
}
[data-tpl="superstore-grid"] .sg-value-badge {
  background: #FACC15;
  box-shadow: 0 4px 10px -3px rgba(250, 204, 21, 0.9);
}

/* ── sticky-feel chip bar ── */
[data-tpl="superstore-grid"] .sg-chipbar { box-shadow: 0 14px 40px -18px rgba(0, 0, 0, 0.9); }
[data-tpl="superstore-grid"] .sg-chip {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}
[data-tpl="superstore-grid"] .sg-chip:hover { background: rgba(250, 204, 21, 0.14); border-color: rgba(250, 204, 21, 0.45); color: #FDE047; }
[data-tpl="superstore-grid"] .sg-chip-active {
  background: #FACC15; border-color: #FACC15; color: #131318 !important;
  box-shadow: 0 6px 18px -6px rgba(250, 204, 21, 0.8);
}
[data-tpl="superstore-grid"] .sg-stats { background: transparent; }
[data-tpl="superstore-grid"] .sg-showcase:hover { box-shadow: 0 18px 44px -20px rgba(250, 204, 21, 0.55); }

@media (prefers-reduced-motion: reduce) {
  [data-tpl="superstore-grid"] .sg-hero-ring { animation: none !important; }
}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════ */
html:not(.dark) [data-tpl="superstore-grid"] {
  --background: #F5F5F7;
  --foreground: #1D1D24;
  --card: #FFFFFF;
  --card-foreground: #1D1D24;
  --muted: #ECECF2;
  --muted-foreground: #5C5C68;
  --border: rgba(29, 29, 36, 0.11);
  --input: rgba(29, 29, 36, 0.12);
  --primary: #FACC15;
  --primary-foreground: #131318;
  --accent: #ECECF2;
  --accent-foreground: #1D1D24;
  --popover: #FFFFFF;
  --popover-foreground: #1D1D24;
  background-color: #F5F5F7;
  color: #1D1D24;
}

/* ── chrome amber retunes → light-readable ambers (dark rules above use !important, so must these) ── */
html:not(.dark) [data-tpl="superstore-grid"] .text-amber-800 { color: #854D0E !important; }
html:not(.dark) [data-tpl="superstore-grid"] .text-amber-700 { color: #854D0E !important; }
html:not(.dark) [data-tpl="superstore-grid"] .text-amber-400 { color: #CA8A04 !important; }
html:not(.dark) [data-tpl="superstore-grid"] .text-amber-300 { color: #A16207 !important; }
html:not(.dark) [data-tpl="superstore-grid"] .hover\\:bg-amber-400:hover { background-color: #EAB308 !important; }
html:not(.dark) [data-tpl="superstore-grid"] .border-amber-300 { border-color: rgba(202, 138, 4, 0.42) !important; }
html:not(.dark) [data-tpl="superstore-grid"] .border-amber-400\\/40 { border-color: rgba(202, 138, 4, 0.48) !important; }

/* ── surfaces: raw-hex tiles/wells → light card surfaces ── */
html:not(.dark) [data-tpl="superstore-grid"] .bg-\\[\\#1A1A22\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="superstore-grid"] .bg-\\[\\#1A1A22\\]\\/90 { background-color: rgba(255, 255, 255, 0.92); }
html:not(.dark) [data-tpl="superstore-grid"] .bg-\\[\\#1A1A22\\]\\/70 { background-color: rgba(255, 255, 255, 0.82); }
html:not(.dark) [data-tpl="superstore-grid"] .bg-\\[\\#131318\\] { background-color: #F1F1F5; }

/* ── ink & muted text: zinc scale → ink scale (same neutral family) ── */
html:not(.dark) [data-tpl="superstore-grid"] .text-zinc-50 { color: #1D1D24; }
html:not(.dark) [data-tpl="superstore-grid"] .text-zinc-400 { color: #5C5C68; }
html:not(.dark) [data-tpl="superstore-grid"] .text-zinc-500 { color: #6B6B77; }
html:not(.dark) [data-tpl="superstore-grid"] .text-zinc-600 { color: #8A8A94; }
html:not(.dark) [data-tpl="superstore-grid"] .text-zinc-200 { color: #52525B; }
html:not(.dark) [data-tpl="superstore-grid"] .bg-zinc-700 { background-color: #DEDEE4; }
html:not(.dark) [data-tpl="superstore-grid"] .bg-zinc-800 { background-color: #E7E7EC; }

/* ── value-yellow accents: light-bg-readable dark gold (same hue family) ── */
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-300 { color: #A16207; }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-300\\/90 { color: rgba(161, 98, 7, 0.92); }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-200 { color: #A16207; }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-400 { color: #CA8A04; }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-400\\/90 { color: rgba(202, 138, 4, 0.92); }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-400\\/80 { color: rgba(202, 138, 4, 0.85); }
html:not(.dark) [data-tpl="superstore-grid"] .text-yellow-400\\/70 { color: rgba(161, 98, 7, 0.78); }
html:not(.dark) [data-tpl="superstore-grid"] .fill-yellow-400 { fill: #EAB308; }
html:not(.dark) [data-tpl="superstore-grid"] .hover\\:text-yellow-300:hover { color: #854D0E; }
html:not(.dark) [data-tpl="superstore-grid"] .border-yellow-400\\/20 { border-color: rgba(202, 138, 4, 0.3); }
html:not(.dark) [data-tpl="superstore-grid"] .border-yellow-400\\/25 { border-color: rgba(202, 138, 4, 0.35); }
html:not(.dark) [data-tpl="superstore-grid"] .border-yellow-400\\/40 { border-color: rgba(202, 138, 4, 0.5); }
html:not(.dark) [data-tpl="superstore-grid"] .bg-yellow-400\\/12 { background-color: rgba(234, 179, 8, 0.15); }
html:not(.dark) [data-tpl="superstore-grid"] .ring-yellow-400\\/30 { --tw-ring-color: rgba(202, 138, 4, 0.35); }
html:not(.dark) [data-tpl="superstore-grid"] .hover\\:bg-yellow-400\\/10:hover { background-color: rgba(234, 179, 8, 0.13); }

/* ── red accents: same red family, deepened for white surfaces ── */
html:not(.dark) [data-tpl="superstore-grid"] .text-\\[\\#F87171\\] { color: #DC2626; }
html:not(.dark) [data-tpl="superstore-grid"] .bg-\\[\\#EF4444\\]\\/15 { background-color: rgba(239, 68, 68, 0.1); }

/* ── white-alpha hairlines/dividers → ink-alpha ── */
html:not(.dark) [data-tpl="superstore-grid"] .border-white\\/\\[0\\.07\\] { border-color: rgba(29, 29, 36, 0.11); }
html:not(.dark) [data-tpl="superstore-grid"] .border-white\\/\\[0\\.08\\] { border-color: rgba(29, 29, 36, 0.13); }
html:not(.dark) [data-tpl="superstore-grid"] .bg-white\\/10 { background-color: rgba(29, 29, 36, 0.13); }

/* ── .text-white blanket → ink, restored where the surface STAYS colored (red pills/badges, story play badge) ── */
html:not(.dark) [data-tpl="superstore-grid"] .text-white { color: #1D1D24; }
html:not(.dark) [data-tpl="superstore-grid"] .text-white.bg-\\[\\#EF4444\\] { color: #FFFFFF; }
html:not(.dark) [data-tpl="superstore-grid"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="superstore-grid"] .fill-white { fill: #FFFFFF; }

/* ── showcase image-overlay gradient → light veil (same geometry) ── */
html:not(.dark) [data-tpl="superstore-grid"] .from-\\[\\#131318\\]\\/95 { --tw-gradient-from: rgba(245, 245, 247, 0.96); }
html:not(.dark) [data-tpl="superstore-grid"] .via-\\[\\#131318\\]\\/40 { --tw-gradient-via: rgba(245, 245, 247, 0.5); }
html:not(.dark) [data-tpl="superstore-grid"] .to-transparent { --tw-gradient-to: rgba(245, 245, 247, 0); }

/* ── yellow glows/shadows softened for light surfaces ── */
html:not(.dark) [data-tpl="superstore-grid"] .shadow-\\[0_8px_20px_-8px_rgba\\(250\\,204\\,21\\,\\.7\\)\\] { --tw-shadow: 0 8px 20px -8px rgba(234, 179, 8, 0.45); }
html:not(.dark) [data-tpl="superstore-grid"] .drop-shadow-\\[0_16px_40px_rgba\\(250\\,204\\,21\\,\\.25\\)\\] { --tw-drop-shadow: drop-shadow(0 16px 40px rgba(161, 98, 7, 0.22)); }

/* ── scoped helper classes → light variants (glass chips, softened glows) ── */
html:not(.dark) [data-tpl="superstore-grid"] .sg-hazard {
  background: repeating-linear-gradient(-45deg, #FACC15 0 12px, #1D1D24 12px 24px);
}
html:not(.dark) [data-tpl="superstore-grid"] .sg-hero { box-shadow: 0 26px 70px -32px rgba(202, 138, 4, 0.2); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-timer { color: #FFF8E1; }
html:not(.dark) [data-tpl="superstore-grid"] .sg-buy { box-shadow: 0 8px 22px -8px rgba(234, 179, 8, 0.5); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-buy:hover { box-shadow: 0 12px 28px -10px rgba(220, 38, 38, 0.38); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-tile:hover { border-color: rgba(202, 138, 4, 0.5); box-shadow: 0 16px 38px -18px rgba(29, 29, 36, 0.14); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-ribbon { box-shadow: 0 4px 10px -3px rgba(239, 68, 68, 0.45); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-value-badge { box-shadow: 0 4px 10px -3px rgba(234, 179, 8, 0.5); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-chipbar { box-shadow: 0 14px 40px -18px rgba(29, 29, 36, 0.16); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-chip { border-color: rgba(29, 29, 36, 0.13); background: rgba(255, 255, 255, 0.74); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-chip:hover { background: rgba(234, 179, 8, 0.13); border-color: rgba(202, 138, 4, 0.45); color: #854D0E; }
html:not(.dark) [data-tpl="superstore-grid"] .sg-chip-active { box-shadow: 0 6px 18px -6px rgba(234, 179, 8, 0.55); }
html:not(.dark) [data-tpl="superstore-grid"] .sg-showcase:hover { box-shadow: 0 18px 44px -20px rgba(202, 138, 4, 0.26); }
` + SCROLL_FX_CSS}</style>
    </div>
  );
}

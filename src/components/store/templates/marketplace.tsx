"use client";

/**
 * TEMPLATE · marketplace — «مارکت‌پلیس آینده» (v25 · futuristic dense rewrite)
 * ---------------------------------------------------------------------
 * A void-dark DENSE market: #0D1017 canvas, #151A24 panels, cyan #06B6D4
 * primary + white glass chips.
 *
 * Signature pieces:
 *  - «پیشنهاد روز» spotlight banner with an animated SCANLINE texture
 *    and a live countdown
 *  - sticky-feel category bar — a floating rounded-full glass-chip rail
 *  - price-forward dense grid (2/3/4/5 columns) with BIG tabular-nums
 *    prices and tiny neon status dots (in-stock #10B981)
 *  - compact bestseller stack, exclusive rail, cyan data-readout strips
 *
 * The whole family (chrome included) is forced into the void palette via
 * CSS var overrides in the scoped <style>; the chrome's orange accent
 * utilities are remapped to cyan. No registered features.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Check, ChevronLeft, Star, Flame, ShoppingCart, Timer, Zap,
  BadgeCheck, TrendingUp, HelpCircle, Sparkles, Smartphone, Laptop, Computer,
  Cpu, Monitor, Gamepad2, Watch, HardDrive, Keyboard, Mouse, Camera, Speaker,
  Wifi, BatteryCharging, Projector, Headphones, LayoutGrid, Search, Radar,
  Layers, Boxes, ShieldCheck, Truck, CreditCard, Headset, Gem, ArrowLeft,
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

/* category slug → lucide icon */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Zap, headphones: Headphones, earbuds: Zap, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/* ── hydration-safe countdown ─────────────────────────────────────── */
function MarketCountdown({ endsAt }: { endsAt?: string | null }) {
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
    <p className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-2 text-[13px] font-black tabular-nums text-cyan-200" role="timer" aria-label="زمان باقی‌مانده پیشنهاد روز">
      <Timer className="h-4 w-4" aria-hidden />
      {(left?.h ?? "—")}:{(left?.m ?? "—")}:{(left?.s ?? "—")}
    </p>
  );
}

/* ── section heading (data-readout style) ─────────────────────────── */
function MkHead({
  kicker, title, href, icon: Icon = Radar,
}: { kicker: string; title: string; href?: string; icon?: React.ElementType }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[10.5px] font-black tracking-[0.18em] text-cyan-300/90">
          <span aria-hidden className="mk-blink h-1.5 w-1.5 rounded-full bg-cyan-400" />
          {kicker}
        </p>
        <h2 className="mt-1.5 text-[17px] font-black leading-8 text-[#E6EAF2] md:text-xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="mk-chip group flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold text-cyan-100">
          همه
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── stock status dot ─────────────────────────────────────────────── */
function StatusDot({ product }: { product: TemplateProduct }) {
  if (!product.inStock) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
        <span aria-hidden className="mk-dot" style={{ background: "#64748B", boxShadow: "0 0 8px #64748B" }} />
        ناموجود
      </span>
    );
  }
  if (product.stock <= 5) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
        <span aria-hidden className="mk-dot" style={{ background: "#F59E0B", boxShadow: "0 0 8px #F59E0B" }} />
        {product.stock.toLocaleString("fa-IR")} عدد باقی‌مانده
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
      <span aria-hidden className="mk-dot" style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
      موجود در انبار
    </span>
  );
}

/* ── dense price-forward market tile ──────────────────────────────── */
function MarketTile({ product, dense }: { product: TemplateProduct; dense?: boolean }) {
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
        "mk-tile group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151A24]",
        !product.inStock && "opacity-55 grayscale-[0.4]"
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square bg-[#0D1017]">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes={dense
              ? "(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 18vw"
              : "(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"}
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-slate-600">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute start-2 top-2 rounded-lg bg-cyan-500 px-2 py-0.5 text-[10px] font-black text-[#032327] tabular-nums shadow-[0_4px_12px_-4px_rgba(6,182,212,.8)]">
            {product.discountPercent.toLocaleString("fa-IR")}٪-
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-2 top-2 rounded-lg bg-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-200">اتمام</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <StatusDot product={product} />
          {product.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-slate-400 tabular-nums">
              <Star className="h-3 w-3 fill-cyan-400 text-cyan-400" aria-hidden />
              {toFaDigits(product.rating.toLocaleString("fa-IR"))}
            </span>
          )}
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-10 text-[12px] font-bold leading-[18px] text-[#E6EAF2] transition-colors hover:text-cyan-300"
        >
          {product.name}
        </Link>
        <p className="flex items-center gap-1 truncate text-[9.5px] text-slate-500">
          <BadgeCheck className="h-3 w-3 shrink-0 text-cyan-500/70" aria-hidden />
          {product.brand.name}
        </p>
        <div className="mt-auto pt-1.5">
          {product.discountPercent > 0 && (
            <p className="text-[10.5px] leading-4 text-slate-500 price-old tabular-nums">{formatPrice(product.price)} تومان</p>
          )}
          <p className={cn(
            "font-black leading-6 text-[#E6EAF2] tabular-nums",
            dense ? "text-[15px]" : "text-[16px]",
            product.discountPercent > 0 && "text-cyan-300"
          )}>
            {formatPrice(product.effectivePrice)}
            <span className="text-[9.5px] font-normal text-slate-500"> تومان</span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition-all active:scale-[0.97]",
              product.inStock
                ? added
                  ? "bg-emerald-500 text-[#03231A]"
                  : "bg-cyan-500 text-[#032327] hover:bg-cyan-400"
                : "cursor-not-allowed bg-slate-800 text-slate-500"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
            {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── compact bestseller row ───────────────────────────────────────── */
function BestRow({ product, rank }: { product: TemplateProduct; rank: number }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#151A24] p-2.5 transition-colors hover:border-cyan-400/30"
    >
      <span className="w-6 shrink-0 text-center font-mono text-[13px] font-black text-cyan-400/80 tabular-nums" aria-hidden>
        {toFaDigits(String(rank).padStart(2, "0"))}
      </span>
      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/[0.06] bg-[#0D1017]">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="56px" className="object-contain p-1.5" loading="lazy" />
        ) : (
          <Package className="h-5 w-5 text-slate-600" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-[#E6EAF2] transition-colors group-hover:text-cyan-300">{product.name}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[9.5px] text-slate-500 tabular-nums">
          <TrendingUp className="h-3 w-3 text-cyan-500/70" aria-hidden />
          {product.soldCount.toLocaleString("fa-IR")} فروش
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-black text-cyan-300 tabular-nums">
        {formatPrice(product.effectivePrice)}
      </span>
    </Link>
  );
}

/* ═════════════════════ TEMPLATE ═════════════════════ */
export function MarketplaceTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["marketplace"];

  const stories = useMemo<StoryItem[]>(() =>
    (data.stories ?? []).map((s) => ({
      id: s.id, title: s.title, image: s.image, videoUrl: s.videoUrl,
      duration: s.duration, linkUrl: s.linkUrl, badge: s.badge,
      product: s.product, category: s.category,
    })), [data.stories]);

  /* spotlight = the hottest active discount (fallback: bestseller) */
  const spotlight = useMemo(() => {
    const pool = [...(data.discounted ?? []), ...(data.bestsellers ?? []), ...(data.featured ?? [])];
    return pool.find((p) => p.discountPercent > 0 && p.inStock) ?? pool[0] ?? null;
  }, [data.discounted, data.bestsellers, data.featured]);

  /* main dense shelf: newest + featured, de-duplicated */
  const shelf = useMemo(() => {
    const seen = new Set<string>();
    const out: TemplateProduct[] = [];
    for (const p of [...(data.featured ?? []), ...(data.newest ?? [])]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out.slice(0, 15);
  }, [data.featured, data.newest]);

  const deals = (data.discounted ?? []).slice(0, 10);
  const bestsellers = (data.bestsellers ?? []).slice(0, 6);
  const exclusive = (data.exclusive ?? []).slice(0, 8);
  const hasAnyProduct = shelf.length > 0 || deals.length > 0 || bestsellers.length > 0 || exclusive.length > 0;

  const benefits = [
    { icon: Truck, title: "ارسال اکسپرس", text: "تحویل ۲۴ ساعته تهران" },
    { icon: ShieldCheck, title: "ضمانت اصالت", text: "۱۰۰٪ اورجینال" },
    { icon: CreditCard, title: "پرداخت امن", text: "درگاه مستقیم بانکی" },
    { icon: Headset, title: "پشتیبانی مارکت", text: "۷ روز هفته" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="marketplace" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* NOTE: announcement/ticker renders inside the template's own H8
          chrome header — never duplicated in the body. */}
      <div className="mk-shell relative w-full">
        <span aria-hidden className="mk-mesh" />

        {/* ═══ 1 · «پیشنهاد روز» SPOTLIGHT (scanline banner) ═══ */}
        {spotlight && (
          <section className="relative px-4 pb-8 pt-6 md:pt-8" aria-labelledby="mk-spot">
            <div className="mk-spotlight relative mx-auto grid max-w-7xl items-center gap-6 overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#151A24] p-6 md:p-8 lg:grid-cols-[1fr_.85fr]">
              <span aria-hidden className="mk-scanlines" />
              <span aria-hidden className="mk-sweep" />
              <div className="relative z-10">
                <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] text-cyan-300">
                  <Flame className="h-4 w-4" aria-hidden />
                  پیشنهاد روز مارکت
                </p>
                <h1 id="mk-spot" className="mt-3 line-clamp-2 text-2xl font-black leading-[1.35] text-[#E6EAF2] md:text-3xl">
                  {spotlight.name}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-[12px] text-slate-400">
                  <BadgeCheck className="h-4 w-4 text-cyan-400" aria-hidden />
                  {spotlight.brand.name}
                  <span className="text-slate-600">/</span>
                  {spotlight.category.name}
                </p>
                <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <p className="flex items-baseline gap-2">
                    {spotlight.discountPercent > 0 && (
                      <span className="text-[13px] text-slate-500 price-old tabular-nums">{formatPrice(spotlight.price)}</span>
                    )}
                    <span className="text-3xl font-black leading-none text-cyan-300 tabular-nums md:text-4xl">
                      {formatPrice(spotlight.effectivePrice)}
                      <span className="text-[12px] font-normal text-slate-400"> تومان</span>
                    </span>
                    {spotlight.discountPercent > 0 && (
                      <span className="mk-pulse-off rounded-lg bg-cyan-500 px-2 py-1 text-[12px] font-black text-[#032327] tabular-nums">
                        {spotlight.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/products/${spotlight.slug}`}
                    className="flex h-12 items-center gap-2 rounded-xl bg-cyan-500 px-6 text-[13px] font-black text-[#032327] shadow-[0_10px_28px_-10px_rgba(6,182,212,.9)] transition-all hover:bg-cyan-400 active:scale-[0.98]"
                  >
                    <Zap className="h-4.5 w-4.5" aria-hidden />
                    خرید در یک ثانیه
                  </Link>
                  <MarketCountdown endsAt={spotlight.discountEndsAt ?? store.timerEndsAt ?? null} />
                </div>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-xs md:max-w-sm">
                <span aria-hidden className="mk-spot-ring absolute inset-4 rounded-full" />
                <Link href={`/products/${spotlight.slug}`} aria-label={spotlight.name} className="absolute inset-0 grid place-items-center">
                  {spotlight.mainImage ? (
                    <Image
                      src={spotlight.mainImage}
                      alt={spotlight.name}
                      fill
                      sizes="(max-width: 1024px) 70vw, 420px"
                      className="object-contain p-6 drop-shadow-[0_16px_40px_rgba(6,182,212,.35)]"
                      priority
                    />
                  ) : (
                    <Package className="h-20 w-20 text-slate-600" aria-hidden />
                  )}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══ 2 · STICKY-FEEL GLASS CATEGORY BAR ═══ */}
        {data.categories.length > 0 && (
          <section className="relative px-4 py-4" aria-label="دسته‌بندی‌های مارکت">
            <div className="mk-chipbar relative mx-auto flex max-w-7xl items-center gap-2 rounded-full border border-white/[0.08] bg-[#151A24]/85 px-3 py-2.5 backdrop-blur-xl">
              <span aria-hidden className="mk-chipbar-glow" />
              <Link href="/products" className="mk-chip mk-chip-active flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-black">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                همه
              </Link>
              <span aria-hidden className="h-6 w-px shrink-0 bg-white/10" />
              <div className="mk-rail flex flex-1 gap-2 overflow-x-auto">
                {data.categories.slice(0, 14).map((c) => {
                  const Icon = CAT_ICONS[c.slug] ?? Boxes;
                  return (
                    <Link
                      key={c.id}
                      href={`/products?category=${c.slug}`}
                      className="mk-chip flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-bold text-[#E6EAF2]"
                    >
                      <Icon className="h-4 w-4 text-cyan-400/80" aria-hidden />
                      {c.name}
                      <span className="text-[9.5px] font-normal text-slate-500 tabular-nums">{c.productCount.toLocaleString("fa-IR")}</span>
                    </Link>
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

        {/* ═══ 4 · DENSE MAIN SHELF (2/3/4/5 cols) ═══ */}
        {shelf.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="mk-shelf">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <MkHead kicker="SHELF // قفسهٔ اصلی" title="همهٔ کالاهای مارکت، متراکم و قیمت‌محور" href="/products" icon={Layers} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {shelf.map((p) => (
                    <MarketTile key={p.id} product={p} dense />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 5 · DEALS GRID + BESTSELLER STACK ═══ */}
        {deals.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="mk-deals">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_340px]">
              <Reveal>
                <MkHead kicker="HOT // تخفیف‌های فعال" title="پیشنهادهای شگفت با تایمر زنده" href="/products?discount=1" icon={Flame} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {deals.map((p) => (
                    <MarketTile key={p.id} product={p} dense />
                  ))}
                </div>
              </Reveal>
              {bestsellers.length > 0 && (
                <Reveal delay={80}>
                  <MkHead kicker="TOP // پرفروش‌ها" title="بیشترین فروش این هفته" icon={TrendingUp} />
                  <div className="flex flex-col gap-2">
                    {bestsellers.map((p, i) => (
                      <BestRow key={p.id} product={p} rank={i + 1} />
                    ))}
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        )}

        {/* ═══ 6 · EXCLUSIVE RAIL ═══ */}
        {exclusive.length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="mk-exclusive">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <MkHead kicker="VIP // ویترین انحصاری" title="کالاهای انحصاری مارکت" href="/products?special=1" icon={Gem} />
                <div className="mk-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                  {exclusive.map((p) => (
                    <article
                      key={p.id}
                      className="mk-tile group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151A24] p-2.5 sm:w-48"
                    >
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[#0D1017]">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 44vw, 190px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-slate-600"><Package className="h-10 w-10" aria-hidden /></span>
                        )}
                        <span className="absolute start-1.5 top-1.5 rounded-md bg-cyan-500/90 px-1.5 py-0.5 text-[8.5px] font-black text-[#032327]">انحصاری</span>
                      </Link>
                      <p className="mt-2 line-clamp-1 text-[12px] font-bold text-[#E6EAF2]">{p.name}</p>
                      <p className="mt-1 text-[13.5px] font-black text-cyan-300 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9px] font-normal text-slate-500"> تومان</span>
                      </p>
                    </article>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 7 · SHOWCASE BANNERS ═══ */}
        {(data.showcases ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-label="بنرهای فروشگاه">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.showcases.slice(0, 4).map((sc) => (
                    <Link
                      key={sc.id}
                      href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                      className="mk-showcase group relative block overflow-hidden rounded-2xl border border-white/[0.07]"
                    >
                      <div className="relative aspect-[16/7]">
                        <Image src={sc.image} alt={sc.title} fill sizes="(max-width: 768px) 92vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#0D1017]/95 via-[#0D1017]/45 to-transparent" />
                        <span aria-hidden className="mk-scanlines" />
                      </div>
                      <div className="absolute inset-y-0 end-0 flex w-full max-w-[62%] flex-col justify-center gap-1.5 p-5 md:p-7">
                        <p className="text-[9.5px] font-black tracking-[0.2em] text-cyan-300">SHOWCASE</p>
                        <h3 className="text-[16px] font-black leading-7 text-[#E6EAF2] md:text-lg">{sc.title}</h3>
                        {sc.subtitle && <p className="line-clamp-2 text-[11.5px] leading-6 text-slate-400">{sc.subtitle}</p>}
                        <span className="mt-1.5 inline-flex h-10 w-fit items-center gap-1.5 rounded-lg bg-cyan-500 px-4 text-[11.5px] font-black text-[#032327]">
                          مشاهده
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 8 · BENEFITS + COUNTS DATA STRIP ═══ */}
        <section className="relative px-4 py-8" aria-label="مزایا و آمار مارکت">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {benefits.map((b) => (
                  <div key={b.title} className="mk-panel flex items-center gap-3 rounded-2xl p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                      <b.icon className="h-5.5 w-5.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-black text-[#E6EAF2]">{b.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{b.text}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mk-datastrip mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] md:grid-cols-4">
                {[
                  { icon: Package, label: "کالای فعال", value: counts.products },
                  { icon: LayoutGrid, label: "دسته‌بندی", value: counts.categories },
                  { icon: BadgeCheck, label: "برند", value: counts.brands },
                  { icon: Sparkles, label: "استوری", value: counts.stories },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-center gap-3 bg-[#151A24] p-4">
                    <s.icon className="h-4.5 w-4.5 text-cyan-400/80" aria-hidden />
                    <span className="text-lg font-black text-[#E6EAF2] tabular-nums">{toFaDigits(s.value.toLocaleString("fa-IR"))}</span>
                    <span className="text-[10.5px] text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ 9 · FAQ ═══ */}
        {(data.faq ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-labelledby="mk-faq">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <MkHead kicker="FAQ // پرسش‌ها" title="پاسخ‌های سریع مارکت" icon={HelpCircle} />
                <div className="grid gap-2.5 md:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <details key={i} className="mk-panel group rounded-xl p-4">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-[12.5px] font-bold text-[#E6EAF2]">
                        <span className="font-mono text-[11px] font-black text-cyan-400/80 tabular-nums" aria-hidden>
                          {toFaDigits(String(i + 1).padStart(2, "0"))}
                        </span>
                        {f.h}
                        <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:-rotate-90" aria-hidden />
                      </summary>
                      <p className="mt-3 border-t border-white/[0.07] pt-3 text-[12px] leading-7 text-slate-400">{f.p}</p>
                    </details>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 10 · BRAND CHIPS ═══ */}
        {(data.brands ?? []).length > 0 && (
          <section className="relative px-4 py-8" aria-label="برندهای مارکت">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <MkHead kicker="BRANDS // برندها" title="تأمین‌کننده‌های رسمی" icon={BadgeCheck} />
                <ul className="flex flex-wrap gap-2">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/products?brand=${b.slug}`}
                        className="mk-chip flex h-10 items-center gap-2 rounded-full px-4 text-[11.5px] font-bold text-[#E6EAF2]"
                      >
                        {b.logo ? (
                          <Image src={b.logo} alt={b.name} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-contain" />
                        ) : (
                          <span aria-hidden className="mk-blink h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        )}
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>
        )}

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="relative px-4 py-24">
            <div className="mx-auto max-w-lg rounded-[2rem] border border-dashed border-cyan-400/30 bg-[#151A24] p-14 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-cyan-400/60" aria-hidden />
              <h2 className="text-lg font-black text-[#E6EAF2]">مارکت هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                قفسه‌ها در حال چیدمان‌اند؛ از{" "}
                <Link href="/products" className="font-bold text-cyan-300">آرشیو کامل</Link> دیدن کنید.
              </p>
            </div>
          </section>
        )}
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS (single plain <style>) ═══ */}
      <style>{`
[data-tpl="marketplace"] {
  --background: #0D1017;
  --foreground: #E6EAF2;
  --card: #151A24;
  --card-foreground: #E6EAF2;
  --muted: #1B2230;
  --muted-foreground: #8B93A7;
  --border: rgba(148, 163, 184, 0.14);
  --input: rgba(148, 163, 184, 0.14);
  --primary: #06B6D4;
  --primary-foreground: #032327;
  --accent: #1B2230;
  --accent-foreground: #E6EAF2;
  --popover: #151A24;
  --popover-foreground: #E6EAF2;
  background-color: #0D1017;
  color: #E6EAF2;
}
/* remap the chrome's ORANGE accent utilities to market cyan */
[data-tpl="marketplace"] .bg-orange-500 { background-color: #06B6D4 !important; }
[data-tpl="marketplace"] .hover\\:bg-orange-600:hover { background-color: #0891B2 !important; }
[data-tpl="marketplace"] .bg-orange-100 { background-color: rgba(6, 182, 212, 0.12) !important; }
[data-tpl="marketplace"] .hover\\:bg-orange-200:hover { background-color: rgba(6, 182, 212, 0.22) !important; }
[data-tpl="marketplace"] .bg-orange-200 { background-color: rgba(6, 182, 212, 0.2) !important; }
[data-tpl="marketplace"] .bg-orange-500\\/15 { background-color: rgba(6, 182, 212, 0.15) !important; }
[data-tpl="marketplace"] .bg-orange-500\\/25 { background-color: rgba(6, 182, 212, 0.25) !important; }
[data-tpl="marketplace"] .text-orange-700 { color: #67E8F9 !important; }
[data-tpl="marketplace"] .text-orange-600 { color: #22D3EE !important; }
[data-tpl="marketplace"] .text-orange-500 { color: #22D3EE !important; }
[data-tpl="marketplace"] .text-orange-400 { color: #22D3EE !important; }
[data-tpl="marketplace"] .text-orange-300 { color: #67E8F9 !important; }
[data-tpl="marketplace"] .border-orange-300 { border-color: rgba(6, 182, 212, 0.35) !important; }
[data-tpl="marketplace"] .border-orange-400\\/40 { border-color: rgba(6, 182, 212, 0.3) !important; }
[data-tpl="marketplace"] .from-orange-400 { --tw-gradient-from: #06B6D4 !important; }
[data-tpl="marketplace"] .to-orange-600 { --tw-gradient-to: #0E7490 !important; }
[data-tpl="marketplace"] .shadow-orange-500\\/25 { --tw-shadow-color: rgba(6, 182, 212, 0.25) !important; }

/* ── shell + rails ── */
[data-tpl="marketplace"] .mk-shell { position: relative; isolation: isolate; overflow: clip; }
[data-tpl="marketplace"] .mk-rail { scrollbar-width: none; -ms-overflow-style: none; }
[data-tpl="marketplace"] .mk-rail::-webkit-scrollbar { display: none; }

/* ── faint dot-mesh over the void ── */
[data-tpl="marketplace"] .mk-mesh {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-image: radial-gradient(rgba(148, 163, 184, 0.09) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.25) 40%, transparent 75%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.25) 40%, transparent 75%);
}

/* ── «پیشنهاد روز» spotlight: scanline texture + sweep beam ── */
[data-tpl="marketplace"] .mk-spotlight { box-shadow: 0 24px 70px -30px rgba(6, 182, 212, 0.5); }
[data-tpl="marketplace"] .mk-scanlines {
  position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(0deg, rgba(6, 182, 212, 0.06) 0 1px, transparent 1px 4px);
}
[data-tpl="marketplace"] .mk-sweep {
  position: absolute; inset-inline: 0; top: 0; height: 84px; pointer-events: none;
  background: linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.14), transparent);
  animation: mk-sweep-move 7s linear infinite;
}
@keyframes mk-sweep-move {
  0% { transform: translateY(-90px); }
  100% { transform: translateY(560px); }
}
[data-tpl="marketplace"] .mk-spot-ring {
  border: 1px dashed rgba(6, 182, 212, 0.4);
  border-radius: 9999px;
  animation: mk-spin 26s linear infinite;
}
@keyframes mk-spin { to { transform: rotate(1turn); } }
[data-tpl="marketplace"] .mk-pulse-off { animation: mk-pulse 2.2s ease-in-out infinite; }
@keyframes mk-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.5); } 50% { box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); } }

/* ── sticky-feel glass chip bar ── */
[data-tpl="marketplace"] .mk-chipbar { box-shadow: 0 14px 40px -18px rgba(0, 0, 0, 0.9); }
[data-tpl="marketplace"] .mk-chipbar-glow {
  position: absolute; inset: -1px; border-radius: 9999px; pointer-events: none;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.35), transparent 30%, transparent 70%, rgba(6, 182, 212, 0.35));
  opacity: 0.5;
}
[data-tpl="marketplace"] .mk-chip {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease;
  white-space: nowrap;
}
[data-tpl="marketplace"] .mk-chip:hover { background: rgba(6, 182, 212, 0.14); border-color: rgba(6, 182, 212, 0.4); color: #A5F3FC; }
[data-tpl="marketplace"] .mk-chip-active {
  background: #06B6D4; border-color: #06B6D4; color: #032327;
  box-shadow: 0 6px 18px -6px rgba(6, 182, 212, 0.8);
}
[data-tpl="marketplace"] .mk-chip-active:hover { background: #0891B2; color: #E8FDFF; }

/* ── dense tiles ── */
[data-tpl="marketplace"] .mk-tile { transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
[data-tpl="marketplace"] .mk-tile:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.35);
  box-shadow: 0 16px 36px -18px rgba(6, 182, 212, 0.5);
}

/* ── neon status dots ── */
[data-tpl="marketplace"] .mk-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 9999px;
  animation: mk-blink-dot 1.8s ease-in-out infinite;
}
@keyframes mk-blink-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
[data-tpl="marketplace"] .mk-blink { animation: mk-blink-dot 1.6s ease-in-out infinite; }

/* ── panels / strips ── */
[data-tpl="marketplace"] .mk-panel {
  background: rgba(21, 26, 36, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
}
[data-tpl="marketplace"] .mk-datastrip { background: rgba(255, 255, 255, 0.07); }
[data-tpl="marketplace"] .mk-showcase { background: #151A24; }
[data-tpl="marketplace"] .mk-showcase:hover { box-shadow: 0 18px 44px -20px rgba(6, 182, 212, 0.6); }

@media (prefers-reduced-motion: reduce) {
  [data-tpl="marketplace"] .mk-sweep,
  [data-tpl="marketplace"] .mk-spot-ring,
  [data-tpl="marketplace"] .mk-pulse-off,
  [data-tpl="marketplace"] .mk-dot,
  [data-tpl="marketplace"] .mk-blink { animation: none !important; }
}

/* ══ v26fix · LIGHT SKIN (html:not(.dark)) — dark rules above stay untouched ══
   Pearly market #F4F6FA / ink #1E2532; market cyan → #0891B2 (600) with
   #0E7490 (700) for small text; tiles → white; scrims → pearl fades. */
html:not(.dark) [data-tpl="marketplace"] {
  --background: #F4F6FA;
  --foreground: #1E2532;
  --card: #FFFFFF;
  --card-foreground: #1E2532;
  --muted: #EBEFF5;
  --muted-foreground: #5A6577;
  --border: rgba(30, 37, 50, 0.12);
  --input: rgba(30, 37, 50, 0.12);
  --primary: #0891B2;
  --primary-foreground: #032327;
  --accent: #E9EEF6;
  --accent-foreground: #1E2532;
  --popover: #FFFFFF;
  --popover-foreground: #1E2532;
  background-color: #F4F6FA;
  color: #1E2532;
}
/* chrome ORANGE accent remaps → light-mode cyan (must beat the !important void remaps above) */
html:not(.dark) [data-tpl="marketplace"] .bg-orange-500 { background-color: #0891B2 !important; }
html:not(.dark) [data-tpl="marketplace"] .hover\\:bg-orange-600:hover { background-color: #0E7490 !important; }
html:not(.dark) [data-tpl="marketplace"] .bg-orange-100 { background-color: rgba(8, 145, 178, 0.1) !important; }
html:not(.dark) [data-tpl="marketplace"] .hover\\:bg-orange-200:hover { background-color: rgba(8, 145, 178, 0.18) !important; }
html:not(.dark) [data-tpl="marketplace"] .bg-orange-200 { background-color: rgba(8, 145, 178, 0.14) !important; }
html:not(.dark) [data-tpl="marketplace"] .bg-orange-500\\/15 { background-color: rgba(8, 145, 178, 0.12) !important; }
html:not(.dark) [data-tpl="marketplace"] .bg-orange-500\\/25 { background-color: rgba(8, 145, 178, 0.2) !important; }
html:not(.dark) [data-tpl="marketplace"] .text-orange-700 { color: #0E7490 !important; }
html:not(.dark) [data-tpl="marketplace"] .text-orange-600 { color: #0E7490 !important; }
html:not(.dark) [data-tpl="marketplace"] .text-orange-500 { color: #0891B2 !important; }
html:not(.dark) [data-tpl="marketplace"] .text-orange-400 { color: #0891B2 !important; }
html:not(.dark) [data-tpl="marketplace"] .text-orange-300 { color: #0E7490 !important; }
html:not(.dark) [data-tpl="marketplace"] .border-orange-300 { border-color: rgba(8, 145, 178, 0.35) !important; }
html:not(.dark) [data-tpl="marketplace"] .border-orange-400\\/40 { border-color: rgba(8, 145, 178, 0.35) !important; }
html:not(.dark) [data-tpl="marketplace"] .from-orange-400 { --tw-gradient-from: #0891B2 !important; }
html:not(.dark) [data-tpl="marketplace"] .to-orange-600 { --tw-gradient-to: #0E7490 !important; }
html:not(.dark) [data-tpl="marketplace"] .shadow-orange-500\\/25 { --tw-shadow-color: rgba(8, 145, 178, 0.25) !important; }
/* shell + mesh + scan textures */
html:not(.dark) [data-tpl="marketplace"] .mk-mesh {
  background-image: radial-gradient(rgba(30, 37, 50, 0.12) 1px, transparent 1px);
}
html:not(.dark) [data-tpl="marketplace"] .mk-spotlight { box-shadow: 0 24px 70px -30px rgba(8, 145, 178, 0.35); }
html:not(.dark) [data-tpl="marketplace"] .mk-chipbar { box-shadow: 0 14px 40px -18px rgba(30, 37, 50, 0.3); }
html:not(.dark) [data-tpl="marketplace"] .mk-chip {
  border-color: rgba(30, 37, 50, 0.14);
  background: rgba(255, 255, 255, 0.8);
}
html:not(.dark) [data-tpl="marketplace"] .mk-chip:hover { color: #0E7490; }
html:not(.dark) [data-tpl="marketplace"] .mk-tile:hover {
  box-shadow: 0 16px 36px -18px rgba(8, 145, 178, 0.45);
}
html:not(.dark) [data-tpl="marketplace"] .mk-panel {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(30, 37, 50, 0.1);
}
html:not(.dark) [data-tpl="marketplace"] .mk-datastrip { background: rgba(30, 37, 50, 0.07); }
html:not(.dark) [data-tpl="marketplace"] .mk-showcase { background: #FFFFFF; }
html:not(.dark) [data-tpl="marketplace"] .mk-showcase:hover { box-shadow: 0 18px 44px -20px rgba(8, 145, 178, 0.45); }
/* raw hex utilities → pearl equivalents */
html:not(.dark) [data-tpl="marketplace"] .text-\\[\\#E6EAF2\\]{color:#1E2532}
html:not(.dark) [data-tpl="marketplace"] .bg-\\[\\#151A24\\]{background-color:#FFFFFF}
html:not(.dark) [data-tpl="marketplace"] .bg-\\[\\#151A24\\]\\/85{background-color:rgba(255,255,255,.9)}
html:not(.dark) [data-tpl="marketplace"] .bg-\\[\\#0D1017\\]{background-color:#F2F5FA}
/* showcase overlay → pearl scrim (headline goes ink) */
html:not(.dark) [data-tpl="marketplace"] .from-\\[\\#0D1017\\]\\/95{--tw-gradient-from:rgba(244,246,250,.97)}
html:not(.dark) [data-tpl="marketplace"] .via-\\[\\#0D1017\\]\\/45{--tw-gradient-via:rgba(244,246,250,.5)}
/* white-alpha hairlines → ink alphas */
html:not(.dark) [data-tpl="marketplace"] .border-white\\/\\[0\\.06\\]{border-color:rgba(30,37,50,.1)}
html:not(.dark) [data-tpl="marketplace"] .border-white\\/\\[0\\.07\\]{border-color:rgba(30,37,50,.11)}
html:not(.dark) [data-tpl="marketplace"] .border-white\\/\\[0\\.08\\]{border-color:rgba(30,37,50,.13)}
html:not(.dark) [data-tpl="marketplace"] .bg-white\\/10{background-color:rgba(30,37,50,.14)}
/* slate helpers → readable on pearl */
html:not(.dark) [data-tpl="marketplace"] .text-slate-400{color:#5A6577}
html:not(.dark) [data-tpl="marketplace"] .text-slate-200{color:#1E2532}
html:not(.dark) [data-tpl="marketplace"] .bg-slate-700{background-color:#E1E7F0}
html:not(.dark) [data-tpl="marketplace"] .bg-slate-800{background-color:#DDE4EE}
/* cyan family → light-mode cyan */
html:not(.dark) [data-tpl="marketplace"] .text-cyan-300{color:#0E7490}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-300\\/90{color:rgba(14,116,144,.95)}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-200{color:#0E7490}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-100{color:#0E7490}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-400{color:#0891B2}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-400\\/80{color:rgba(8,145,178,.85)}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-400\\/60{color:rgba(8,145,178,.62)}
html:not(.dark) [data-tpl="marketplace"] .text-cyan-500\\/70{color:rgba(8,145,178,.72)}
html:not(.dark) [data-tpl="marketplace"] .fill-cyan-400{fill:#0891B2}
html:not(.dark) [data-tpl="marketplace"] .bg-cyan-400{background-color:#06B6D4}
html:not(.dark) [data-tpl="marketplace"] .bg-cyan-400\\/10{background-color:rgba(8,145,178,.08)}
html:not(.dark) [data-tpl="marketplace"] .border-cyan-400\\/20{border-color:rgba(8,145,178,.25)}
html:not(.dark) [data-tpl="marketplace"] .border-cyan-400\\/25{border-color:rgba(8,145,178,.3)}
html:not(.dark) [data-tpl="marketplace"] .border-cyan-400\\/30{border-color:rgba(8,145,178,.35)}
html:not(.dark) [data-tpl="marketplace"] .hover\\:text-cyan-300:hover{color:#0E7490}
html:not(.dark) [data-tpl="marketplace"] .group:hover .group-hover\\:text-cyan-300{color:#0E7490}
html:not(.dark) [data-tpl="marketplace"] .hover\\:border-cyan-400\\/30:hover{border-color:rgba(8,145,178,.35)}
/* status colors deepen for white tiles */
html:not(.dark) [data-tpl="marketplace"] .text-amber-300{color:#B45309}
html:not(.dark) [data-tpl="marketplace"] .text-emerald-300{color:#047857}
`}</style>
    </div>
  );
}

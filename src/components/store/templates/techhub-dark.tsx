"use client";

/**
 * TEMPLATE · techhub-dark — v25 «Tech-Futurism» (FULL REWRITE)
 * ---------------------------------------------------------------------
 * Signature = a deep-space dark hero band (#0F0F1A) with glowing purple
 * orbs + an announcement ticker + a floating neon-ring tilt card of the
 * first featured product, then a LIGHT, airy product-grid zone
 * (bg-background + generous whitespace) that "slides over" the dark band
 * (rounded top sheet). Electric indigo → purple (#4F46E5 → #7C3AED)
 * buttons/SALE badges/active states, soft lavender (#EDE9FE) promo tiles.
 *
 * Registered features (Admin → ظاهر): «timer» (شگفت‌انگیز countdown card
 * + per-product deal clocks) and «glow» (neon halos: ring animation,
 * glow shadows, orb intensity) — both consumed via feat() gates.
 * v25: when data.store.timerEndsAt is set, every timer counts to THAT
 * moment (overrides per-product discountEndsAt / midnight defaults).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Truck, ShieldCheck, Lock, Headphones, Package, Check, ChevronLeft, Star,
  TrendingUp, HelpCircle, ShoppingCart, Timer, Flame, Zap, BadgeCheck,
  Sparkles, Gem, Layers, Megaphone, Cpu,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { ExclusiveShowcase } from "../exclusive-showcase";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* v23/v25 feature flags (Admin → ظاهر → ویژگی‌های قالب) — missing key = ON */
const feat = (features: Record<string, boolean> | undefined, key: string) =>
  features ? features[key] !== false : true;

/* ── v25 hydration-safe countdown ──────────────────────────────────
 * iso = store.timerEndsAt (v25 override) OR the product's own
 * discountEndsAt. null → شگفت‌انگیز defaults to tonight midnight.
 * SSR frame renders dashes (no Date.now() during render → no mismatch). */
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

const pad2 = (n: number) => String(n).padStart(2, "0");

/* big شگفت‌انگیز timer (dashes → live; «به پایان رسید» at zero) */
function SparkTimer({ iso, label }: { iso: string | null; label: string }) {
  const left = useCountdown(iso);
  if (left !== null && left <= 0) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-[#4F46E5]/25 bg-[#4F46E5]/8 px-4 py-3 text-[12px] font-black text-[#4F46E5] dark:text-[#A5B4FC]">
        <Flame className="h-4 w-4" aria-hidden />
        {label} به پایان رسید
      </p>
    );
  }
  const cells = left === null
    ? [{ v: "—", l: "ساعت" }, { v: "—", l: "دقیقه" }, { v: "—", l: "ثانیه" }]
    : [
        { v: toFaDigits(pad2(Math.floor(left / 3_600_000))), l: "ساعت" },
        { v: toFaDigits(pad2(Math.floor((left % 3_600_000) / 60_000))), l: "دقیقه" },
        { v: toFaDigits(pad2(Math.floor((left % 60_000) / 1000))), l: "ثانیه" },
      ];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2" role="timer" aria-label={`زمان باقی‌مانده تا ${label}`}>
        {cells.map((c, i) => (
          <span key={c.l} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-lg font-black text-[#7C3AED]/60">:</span>}
            <span className="tf-timer-cell flex w-16 flex-col items-center rounded-2xl border border-[#4F46E5]/30 bg-[#EEF2FF]/80 px-1 py-2.5 dark:border-[#7C3AED]/40 dark:bg-[#1B1B33]">
              <span className="text-xl font-black leading-none tabular-nums text-[#312E81] dark:text-[#C4B5FD]" aria-hidden>{c.v}</span>
              <span className="mt-1 text-[9px] font-bold text-[#6D6C8D] dark:text-[#8F8AB0]">{c.l}</span>
            </span>
          </span>
        ))}
      </div>
      <p className="text-[10.5px] font-bold text-muted-foreground">
        {iso ? `${label} — پایان کمپین زمان‌دار` : `${label} — تا نیمه‌شب امشب`}
      </p>
    </div>
  );
}

/* compact per-product deal clock (only rendered when a deadline exists) */
function MiniDealClock({ iso }: { iso: string }) {
  const left = useCountdown(iso);
  if (left !== null && left <= 0) {
    return <span className="rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[9.5px] font-black text-[#4F46E5] dark:text-[#A5B4FC]">پایان تخفیف</span>;
  }
  const v = left === null
    ? { h: "—", m: "—", s: "—" }
    : {
        h: toFaDigits(pad2(Math.floor(left / 3_600_000))),
        m: toFaDigits(pad2(Math.floor((left % 3_600_000) / 60_000))),
        s: toFaDigits(pad2(Math.floor((left % 60_000) / 1000))),
      };
  return (
    <span dir="ltr" className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#4F46E5] dark:text-[#A5B4FC]" role="timer" aria-label="زمان باقی‌مانده تخفیف این محصول">
      <Timer className="h-3 w-3" aria-hidden />
      {v.h}:{v.m}:{v.s}
    </span>
  );
}

/* ── floating neon-ring tilt card (hero visual) ───────────────────── */
function HeroTiltCard({ product, glowOn }: { product: TemplateProduct; glowOn: boolean }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 16, ry: (px - 0.5) * 16, active: true }); // ≤ ±8°
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, active: false });

  return (
    <div className="relative mx-auto w-fit [perspective:1100px]" style={{ perspective: "1100px" }}>
      {/* halo behind the card (glow feature) */}
      {glowOn && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,42%),transparent_68%)] blur-2xl" />
      )}
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
            : undefined,
          transition: tilt.active ? "transform 90ms ease-out" : "transform 560ms cubic-bezier(0.22,1,0.36,1)",
          transformStyle: "preserve-3d",
        }}
        className="relative rounded-[1.9rem] p-[2px]"
      >
        {/* rotating neon ring */}
        <span aria-hidden className="tf-ring absolute -inset-[2px] rounded-[2rem]" />
        <div className="relative flex w-[min(78vw,320px)] flex-col gap-4 rounded-[1.85rem] border border-white/10 bg-[#15152B]/90 p-5 text-white shadow-[0_30px_80px_-24px_rgba(15,15,26,80%)] backdrop-blur-xl sm:w-[340px]">
          <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-2xl bg-[#0F0F1A]" style={{ transform: "translateZ(24px)", transformStyle: "preserve-3d" }}>
            {product.mainImage ? (
              <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 70vw, 340px" priority className="object-contain p-6" />
            ) : (
              <span className="grid h-full place-items-center text-white/30"><Package className="h-14 w-14" aria-hidden /></span>
            )}
          </Link>
          {/* floating spec chips — lifted on the Z axis */}
          <div className="flex items-center justify-between gap-2" style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>
            <span className="flex items-center gap-1 rounded-full border border-[#A78BFA]/40 bg-[#A78BFA]/15 px-2.5 py-1 text-[10px] font-black text-[#DDD6FE]">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              {product.brand.name}
            </span>
            {product.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-[#818CF8]/40 bg-[#818CF8]/15 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#C7D2FE]">
                <Star className="h-3 w-3 fill-[#C7D2FE]" aria-hidden />
                {toFaDigits(product.rating.toLocaleString("fa-IR"))}
              </span>
            )}
          </div>
          <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
            <Link href={`/products/${product.slug}`} className="block truncate text-[13.5px] font-bold leading-6 text-white transition-colors hover:text-[#C4B5FD]">
              {product.name}
            </Link>
            <p className="mt-1.5 flex items-baseline justify-between gap-2">
              {product.discountPercent > 0 && (
                <span className="text-[11px] text-white/40 price-old tabular-nums">{formatPrice(product.price)}</span>
              )}
              <span className="text-lg font-black tabular-nums text-[#C4B5FD] [text-shadow:0_0_18px_rgba(139,92,246,45%)]">
                {formatPrice(product.effectivePrice)}
                <span className="text-[10px] font-normal text-white/50"> تومان</span>
              </span>
            </p>
            {product.discountPercent > 0 && (
              <span className="tf-grad mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black text-white">
                {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف ویژه
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── light-zone product card (SALE gradient badge + indigo hover) ─── */
function FuturCard({ product, badge, showTimer, storeDeadline }: {
  product: TemplateProduct;
  badge?: string;
  showTimer?: boolean;
  storeDeadline?: string | null;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const addToCart = async () => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1200);
    } catch {
      /* toast handled by useCart */
    }
  };

  const deadline = storeDeadline ?? product.discountEndsAt ?? null;

  return (
    <article className={cn(
      "tf-card group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[#4F46E5]/45 hover:shadow-[0_20px_46px_-20px_rgba(79,70,229,38%)]",
      !product.inStock && "grayscale-[0.4]",
    )}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="zoom-media relative block aspect-square overflow-hidden bg-muted/30">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw" className="object-contain p-5 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-11 w-11" aria-hidden /></span>
        )}
      </Link>
      {/* SALE / status badges */}
      <div className="absolute start-3 top-3 z-10 flex flex-col items-start gap-1.5">
        {product.discountPercent > 0 && (
          <span className="tf-grad rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-[0_6px_18px_-6px_rgba(124,58,237,70%)] tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {badge && (
          <span className="rounded-full bg-[#4F46E5]/10 px-2.5 py-1 text-[9.5px] font-black text-[#4F46E5] dark:bg-[#7C3AED]/25 dark:text-[#C4B5FD]">{badge}</span>
        )}
      </div>
      {!product.inStock && (
        <span className="absolute end-3 top-3 z-10 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-bold text-background">ناموجود</span>
      )}
      {/* per-product deal clock (timer feature + real deadline) */}
      {showTimer && deadline && (
        <span className="absolute end-3 bottom-2 z-10">
          <MiniDealClock iso={deadline} />
        </span>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <BadgeCheck className="h-3 w-3 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
          <span className="truncate">{product.brand.name}</span>
          {product.soldCount > 0 && (
            <span className="ms-auto shrink-0 tabular-nums">{toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش</span>
          )}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 transition-colors hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
          {product.name}
        </Link>
        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-muted-foreground tabular-nums">
            <Star className="h-3 w-3 fill-[#4F46E5] text-[#4F46E5] dark:fill-[#A5B4FC] dark:text-[#A5B4FC]" aria-hidden />
            {toFaDigits(product.rating.toLocaleString("fa-IR"))} از {toFaDigits(product.reviewCount.toLocaleString("fa-IR"))} نظر
          </p>
        )}
        <div className="mt-auto pt-4">
          <p className="flex items-baseline gap-2">
            {product.discountPercent > 0 && (
              <span className="text-[11px] text-muted-foreground price-old tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className={cn("text-[15px] font-black tabular-nums", product.discountPercent > 0 ? "text-[#4F46E5] dark:text-[#A5B4FC]" : "")}>
              {formatPrice(product.effectivePrice)}
              <span className="text-[10px] font-normal text-muted-foreground"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد خرید`}
            className={cn(
              "tf-grad mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-white transition-all active:scale-[0.98]",
              !product.inStock && "tf-grad-off cursor-not-allowed opacity-60",
              added && "tf-grad-added",
            )}
          >
            {added ? (
              <><Check className="h-4 w-4" aria-hidden /> افزوده شد</>
            ) : (
              <><ShoppingCart className="h-4 w-4" aria-hidden /> {product.inStock ? "افزودن به سبد" : "ناموجود"}</>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ accordion (light zone) ───────────────────────────────────── */
function FuturFaq({ h, p }: { h: string; p: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-black transition-colors", open ? "tf-grad text-white" : "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#A5B4FC]")}>؟</span>
        <span className="flex-1 text-[13px] font-bold leading-6">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-muted-foreground">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ TEMPLATE ═══════════════════ */
export function TechhubDarkTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["techhub-dark"];

  /* v23/v25 features — timer (شمارش معکوس شگفت‌انگیز) + glow (هالهٔ نئون) */
  const timerOn = feat(data.store.features, "timer");
  const glowOn = feat(data.store.features, "glow");

  /* v25: store-level countdown deadline overrides EVERY timer */
  const storeDeadline = store.timerEndsAt ?? null;

  /* hero visual = first featured product (fallback: first slide product) */
  const heroProduct = data.featured[0] ?? heroSlide?.product ?? null;

  /* flash deal = deepest active discount */
  const flashDeal = [...data.discounted].sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null;
  const flashDeadline = storeDeadline ?? flashDeal?.discountEndsAt ?? null;

  /* ticker messages (v20 admin marquee) — fallback: single announcement */
  const tickerItems =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink ?? undefined }]
        : [{ text: `${store.storeName} — مرکز تکنولوژی نسل جدید` }];

  const trustChips = [
    { icon: Truck, t: "ارسال سریع سراسری" },
    { icon: ShieldCheck, t: "ضمانت اصالت کالا" },
    { icon: Lock, t: "پرداخت امن و رمزنگاری‌شده" },
    { icon: Headphones, t: "پشتیبانی ۲۴/۷" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="techhub-dark" data-glow={glowOn ? "on" : "off"} className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* ═══ 1 · DEEP-SPACE HERO BAND (#0F0F1A + purple orbs) ═══ */}
      <section className="relative isolate overflow-hidden bg-[#0F0F1A] text-white" aria-labelledby="tf-hero">
        {/* glowing purple gradient orbs */}
        <span aria-hidden className="tf-orb pointer-events-none absolute -top-24 start-[8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,52%),transparent_66%)] blur-2xl" />
        <span aria-hidden className="tf-orb tf-orb-2 pointer-events-none absolute bottom-0 start-[42%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,45%),transparent_66%)] blur-2xl" />
        <span aria-hidden className="tf-orb tf-orb-3 pointer-events-none absolute -bottom-16 end-[6%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,30%),transparent_68%)] blur-3xl" />
        {/* faint starfield dots */}
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(196,181,253,35%)_1px,transparent_1px)] [background-size:34px_34px]" />

        {/* announcement ticker strip */}
        <div className="relative border-y border-white/10 bg-white/[0.04] py-2" aria-label="اطلاعیه‌های فروشگاه">
          <div className="tf-tick-mask overflow-hidden">
            <div className="tf-tick-track" style={{ "--tf-tspeed": `${store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 26}s` } as React.CSSProperties}>
              {[...tickerItems, ...tickerItems].map((m, i) => (
                <Link
                  key={i}
                  href={m.link ?? "/products"}
                  className="flex shrink-0 items-center gap-2 px-6 text-[11px] font-bold text-[#C7D2FE] transition-colors hover:text-white"
                >
                  <Megaphone className="h-3.5 w-3.5 text-[#A78BFA]" aria-hidden />
                  <span className="whitespace-nowrap">{m.text}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* split hero: text (start) + glowing product visual (end) */}
        <div className="relative mx-auto grid min-h-[420px] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:py-0">
          <div className="taj-slide-start relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#A78BFA]/35 bg-[#7C3AED]/15 px-4 py-2 text-[11px] font-black tracking-wide text-[#DDD6FE] backdrop-blur">
              <span aria-hidden className="tf-dot h-2 w-2 rounded-full bg-[#A78BFA]" />
              نسل جدید خرید دیجیتال · {store.storeName}
            </p>
            <h1 id="tf-hero" className="mt-5 text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              گجت‌های <span className="tf-hero-grad">آینده</span> را
              <br className="hidden sm:block" /> امروز به خانه بیاورید
            </h1>
            <p className="mt-5 max-w-xl text-[13px] leading-7 text-white/70 sm:text-sm sm:leading-8" dir="rtl">
              {store.announcementActive && store.announcement
                ? store.announcement
                : `در ${store.storeName} بیش از ${toFaDigits(counts.products.toLocaleString("fa-IR"))} کالای دیجیتال از ${toFaDigits(counts.brands.toLocaleString("fa-IR"))} برند معتبر — با ضمانت اصالت و قیمت منصفانه منتظر شماست.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/products" className="tf-grad tf-cta group flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black text-white shadow-[0_16px_38px_-14px_rgba(124,58,237,75%)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                <Cpu className="h-4.5 w-4.5" aria-hidden />
                کاوش در فروشگاه
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
              </Link>
              {flashDeal && (
                <a href="#tf-flash" className="flex h-12 items-center gap-2 rounded-2xl border border-[#A78BFA]/35 bg-white/5 px-6 text-sm font-bold text-[#DDD6FE] backdrop-blur transition-colors hover:bg-white/10 hover:text-white">
                  <Zap className="h-4 w-4 text-[#A78BFA]" aria-hidden />
                  پیشنهاد شگفت‌انگیز
                </a>
              )}
            </div>
            {/* live stats — real counts */}
            <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="آمار فروشگاه">
              {[
                { n: counts.products, l: "محصول" },
                { n: counts.categories, l: "دسته‌بندی" },
                { n: counts.brands, l: "برند" },
              ].map((s) => (
                <li key={s.l} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur">
                  <span className="text-sm font-black tabular-nums text-[#C4B5FD]">{toFaDigits(s.n.toLocaleString("fa-IR"))}</span>
                  <span className="text-[10px] font-bold text-white/60">{s.l}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* glowing floating tilt card */}
          {heroProduct && (
            <div className="relative pb-6 lg:pb-0">
              <HeroTiltCard product={heroProduct} glowOn={glowOn} />
            </div>
          )}
        </div>

        {/* trust chips below the split */}
        <div className="relative border-t border-white/10">
          <ul className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-3 px-4 py-5 sm:grid-cols-4 sm:px-6" aria-label="مزیت‌های خرید">
            {trustChips.map((c) => (
              <li key={c.t} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4F46E5]/25 to-[#7C3AED]/25 text-[#C4B5FD]">
                  <c.icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="min-w-0 text-[11px] font-bold leading-5 text-white/80">{c.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══ 2 · LIGHT GRID ZONE — sheet slides over the dark band ═══ */}
      <div className="relative z-10 -mt-5 rounded-t-[2.5rem] bg-background text-foreground shadow-[0_-18px_50px_-24px_rgba(15,15,26,45%)]">
        <div className="mx-auto w-full max-w-7xl space-y-14 px-4 py-14 sm:px-6 md:space-y-16 md:py-16">

          {/* 2.1 · شگفت‌انگیز card — timer feature + v25 deadline override */}
          {flashDeal && (
            <section id="tf-flash" aria-labelledby="tf-flash-t" className="scroll-mt-24">
              <Reveal>
                <div className="tf-flash-card relative grid items-center gap-6 overflow-hidden rounded-[2rem] p-[1.5px] md:gap-4 lg:grid-cols-[1.15fr_1fr]">
                  <div className="tf-flash-inner grid gap-6 rounded-[calc(2rem-1.5px)] p-6 md:p-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
                    <Link href={`/products/${flashDeal.slug}`} aria-label={flashDeal.name} className="relative mx-auto block h-40 w-40 shrink-0 self-center overflow-hidden rounded-3xl bg-background/60 p-2 md:h-52 md:w-52">
                      {flashDeal.mainImage ? (
                        <Image src={flashDeal.mainImage} alt={flashDeal.name} fill sizes="(max-width: 768px) 42vw, 220px" className="object-contain p-3" />
                      ) : (
                        <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-12 w-12" aria-hidden /></span>
                      )}
                    </Link>
                    <div className="min-w-0 text-center lg:text-start">
                      <p className="tf-dot-text flex items-center justify-center gap-1.5 text-[11px] font-black text-[#4F46E5] dark:text-[#A5B4FC] lg:justify-start">
                        <Flame className="h-3.5 w-3.5" aria-hidden />
                        پیشنهاد شگفت‌انگیز امروز
                      </p>
                      <h2 id="tf-flash-t" className="mt-2 text-xl font-black leading-8 md:text-2xl">
                        <Link href={`/products/${flashDeal.slug}`} className="transition-colors hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">{flashDeal.name}</Link>
                      </h2>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground">{flashDeal.brand.name} · موجودی: {toFaDigits(flashDeal.stock.toLocaleString("fa-IR"))} عدد</p>
                      <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 lg:justify-start">
                        <span className="text-[13px] text-muted-foreground price-old tabular-nums">{formatPrice(flashDeal.price)}</span>
                        <span className="text-3xl font-black tabular-nums text-[#4F46E5] dark:text-[#A5B4FC]">
                          {formatPrice(flashDeal.effectivePrice)}
                          <span className="text-[11px] font-normal text-muted-foreground"> تومان</span>
                        </span>
                      </p>
                      <Link href={`/products/${flashDeal.slug}`} className="tf-grad mt-5 inline-flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black text-white shadow-[0_16px_38px_-14px_rgba(124,58,237,75%)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                        <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
                        همین حالا بخر
                      </Link>
                    </div>
                  </div>
                  {/* countdown + sold gauge */}
                  <div className="flex flex-col items-center justify-center gap-5 rounded-[calc(2rem-1.5px)] p-6 md:p-8">
                    {timerOn && <SparkTimer iso={flashDeadline} label="پیشنهاد شگفت‌انگیز" />}
                    <div className="w-full max-w-xs" aria-label="درصد فروش این پیشنهاد">
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground">
                        <span className="tabular-nums">{toFaDigits(flashDeal.soldCount.toLocaleString("fa-IR"))} فروخته‌شده</span>
                        <span className="tabular-nums">{toFaDigits(flashDeal.stock.toLocaleString("fa-IR"))} باقی‌مانده</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#4F46E5]/10 dark:bg-[#7C3AED]/20">
                        <div className="tf-grad h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(96, Math.max(5, Math.round((flashDeal.soldCount / (flashDeal.soldCount + Math.max(flashDeal.stock, 1))) * 100)))}%` }} />
                      </div>
                    </div>
                    {!timerOn && (
                      <p className="text-center text-[12px] font-bold leading-6 text-muted-foreground">تخفیف عمیق تا پایان موجودی — بدون شمارش معکوس</p>
                    )}
                  </div>
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.2 · slide banner rail (data.slides) */}
          {data.slides.length > 0 && (
            <section aria-label="بنرهای فروشگاه">
              <Reveal>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {data.slides.map((s) => (
                    <Link
                      key={s.id}
                      href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className="group relative block h-28 w-64 shrink-0 overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:border-[#4F46E5]/50 sm:h-32 sm:w-80"
                    >
                      <SlideArt slide={s} alt={s.title} sizes="320px" className="object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/25 to-transparent" />
                      <span className="absolute inset-y-0 end-0 flex w-3/5 flex-col justify-center gap-1 p-4 text-end">
                        <span className="truncate text-[13px] font-black text-white">{s.title}</span>
                        {s.subtitle && <span className="truncate text-[10px] text-white/75">{s.subtitle}</span>}
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-[#C4B5FD]">
                          {s.ctaText ?? "مشاهده"}
                          <ChevronLeft className="h-3 w-3" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.3 · categories — clean photo tiles */}
          {data.categories.length > 0 && (
            <section aria-labelledby="tf-cats">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="tf-cats" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                      <Layers className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                      خرید بر اساس <span className="tf-hero-grad">دسته‌بندی</span>
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{toFaDigits(counts.categories.toLocaleString("fa-IR"))} دنیای دیجیتال — یک کلیک فاصله</p>
                  </div>
                  <Link href="/products" className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border px-4 text-[11px] font-black transition-colors hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
                    همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="taj-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {data.categories.slice(0, 12).map((c) => (
                    <Link key={c.id} href={`/products?category=${c.slug}`} aria-label={c.name} className="tf-cat group relative overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-1 hover:border-[#4F46E5]/50 hover:shadow-[0_18px_40px_-20px_rgba(79,70,229,40%)]">
                      <span className="relative block aspect-square overflow-hidden bg-muted/30">
                        {c.image ? (
                          <Image src={c.image} alt={`دسته‌بندی ${c.name}`} fill sizes="(max-width: 640px) 46vw, (max-width: 1280px) 23vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <span className="tf-promo grid h-full w-full place-items-center text-xl font-black">{c.name.charAt(0)}</span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2 p-3">
                        <span className="truncate text-[12px] font-black">{c.name}</span>
                        <span className="shrink-0 text-[9.5px] font-bold text-muted-foreground tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.4 · featured grid — SALE badges */}
          {data.featured.length > 0 && (
            <section aria-labelledby="tf-featured">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="tf-featured" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                      <Sparkles className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                      انتخاب‌های <span className="tf-hero-grad">ویژه</span> تاج
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">سردبیرهای ما این‌ها را برای شما چیدند</p>
                  </div>
                  <Link href="/products?sort=rating" className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border px-4 text-[11px] font-black transition-colors hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
                    همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.featured.slice(0, 8).map((p) => (
                    <FuturCard key={p.id} product={p} badge="ویژه" showTimer={timerOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.5 · lavender promo tiles (showcases) */}
          {data.showcases.length > 0 && (
            <section aria-labelledby="tf-promos">
              <Reveal>
                <h2 id="tf-promos" className="mb-6 flex items-center gap-2 text-xl font-black md:text-2xl">
                  <Zap className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                  کاشی‌های پیشنهاد
                </h2>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  {data.showcases.slice(0, 3).map((s, i) => (
                    <Link
                      key={s.id}
                      href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className={cn(
                        "tf-promo group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-[1.75rem] p-6 transition-transform duration-300 hover:-translate-y-1",
                        i === 0 && "lg:col-span-2 lg:min-h-52",
                      )}
                    >
                      {s.product?.mainImage && (
                        <span aria-hidden className="pointer-events-none absolute -top-4 start-1/2 hidden h-40 w-40 -translate-x-1/2 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 sm:block lg:start-auto lg:end-6 lg:translate-x-0">
                          <Image src={s.product.mainImage} alt="" fill sizes="180px" className="object-contain p-2 drop-shadow-[0_18px_28px_rgba(79,70,229,35%)]" loading="lazy" />
                        </span>
                      )}
                      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(139,92,246,22%),transparent_60%)]" />
                      <span className="relative">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-black text-[#4F46E5]">
                          <Zap className="h-3 w-3" aria-hidden />
                          پیشنهاد تک‌هاب
                        </span>
                        <span className="mt-2 block max-w-sm text-xl font-black leading-8 text-[#312E81] md:text-2xl">{s.title}</span>
                        {s.subtitle && <span className="mt-1 block max-w-md text-[12px] leading-6 text-[#4B4A72]">{s.subtitle}</span>}
                        <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-black text-[#4F46E5]">
                          {s.product ? `از ${formatPrice(s.product.discountPrice ?? s.product.price)} تومان` : (s.buttonUrl ? "مشاهده پیشنهاد" : "مشاهده")}
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.6 · discounted grid — with per-product deal clocks */}
          {data.discounted.length > 0 && (
            <section aria-labelledby="tf-deals">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="tf-deals" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                      <Flame className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                      تخفیف‌های <span className="tf-hero-grad">داغ</span> امروز
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">قیمت‌های آتش‌گیر — تا پایان موجودی</p>
                  </div>
                  <Link href="/products?discount=1" className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border px-4 text-[11px] font-black transition-colors hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
                    آرشیو تخفیف‌ها
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.discounted.slice(0, 8).map((p) => (
                    <FuturCard key={p.id} product={p} showTimer={timerOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.7 · bestsellers — numbered strip */}
          {data.bestsellers.length > 0 && (
            <section aria-labelledby="tf-best">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <h2 id="tf-best" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                    <TrendingUp className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                    پرفروش‌های این فصل
                  </h2>
                  <Link href="/products?sort=bestselling" className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border px-4 text-[11px] font-black transition-colors hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
                    همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <ol className="grid grid-cols-1 gap-3 rounded-[1.75rem] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.slug}`} className="group flex min-w-0 items-center gap-3 rounded-2xl bg-muted/30 p-3 transition-all hover:-translate-y-0.5 hover:bg-[#4F46E5]/8">
                        <span className="tf-grad grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-black text-white tabular-nums">
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold group-hover:text-[#4F46E5] dark:group-hover:text-[#A5B4FC]">{p.name}</span>
                          <span className="text-[11px] font-black text-[#4F46E5] tabular-nums dark:text-[#A5B4FC]">{formatPrice(p.effectivePrice)} تومان</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </section>
          )}

          {/* 2.8 · newest grid */}
          {data.newest.length > 0 && (
            <section aria-labelledby="tf-newest">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <h2 id="tf-newest" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                    <Timer className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                    تازه واردشده‌ها
                  </h2>
                  <Link href="/products?sort=newest" className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border px-4 text-[11px] font-black transition-colors hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
                    همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {data.newest.slice(0, 8).map((p) => (
                    <FuturCard key={p.id} product={p} badge="جدید" showTimer={timerOn} storeDeadline={storeDeadline} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.9 · exclusive (v15) — 3D showcase */}
          {data.exclusive.length > 0 && (
            <section aria-labelledby="tf-exclusive">
              <Reveal>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="tf-exclusive" className="flex items-center gap-2 text-xl font-black md:text-2xl">
                      <Gem className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                      انحصاری‌های <span className="tf-hero-grad">تاج</span>
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">کالاهای خاص — فقط این‌جا پیدا می‌شوند</p>
                  </div>
                </div>
                <ExclusiveShowcase products={data.exclusive} />
              </Reveal>
            </section>
          )}

          {/* 2.10 · stories */}
          {stories.length > 0 && (
            <section aria-label="استوری‌های فروشگاه">
              <Reveal>
                <StoriesRow stories={stories} />
              </Reveal>
            </section>
          )}

          {/* 2.11 · FAQ */}
          {data.faq.length > 0 && (
            <section aria-labelledby="tf-faq">
              <Reveal>
                <h2 id="tf-faq" className="mb-6 flex items-center gap-2 text-xl font-black md:text-2xl">
                  <HelpCircle className="h-6 w-6 text-[#4F46E5] dark:text-[#A5B4FC]" aria-hidden />
                  پرسش‌های متداول
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <FuturFaq key={i} h={f.h} p={f.p} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* 2.12 · brands */}
          {data.brands.length > 0 && (
            <section className="border-t border-border/60 pt-10" aria-label="برندهای همکار">
              <Reveal>
                <ul className="flex flex-wrap justify-center gap-2.5">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link href={`/products?brand=${b.slug}`} className="flex h-11 items-center rounded-2xl border bg-card px-5 text-[12.5px] font-bold transition-all hover:-translate-y-0.5 hover:border-[#4F46E5]/60 hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]">
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
            <section className="py-10">
              <div className="rounded-[2rem] border-2 border-dashed border-[#4F46E5]/30 p-16 text-center">
                <Cpu className="mx-auto mb-4 h-12 w-12 text-[#4F46E5]/50" aria-hidden />
                <h2 className="text-lg font-black">ایستگاه تک‌هاب هنوز راه‌اندازی نشده</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">چراغ‌های بنفش به‌زودی با محصولات روشن می‌شوند…</p>
              </div>
            </section>
          )}
        </div>
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* v25 scoped style — ONE plain <style> block, all rules under [data-tpl="techhub-dark"] */}
      <style>{`
[data-tpl="techhub-dark"] {
  --tf-indigo: #4F46E5;
  --tf-purple: #7C3AED;
  --tf-lav: #EDE9FE;
  --tf-ink: #312E81;
}
/* announcement ticker (RTL: 0 → +50% seamless duplicated copy) */
[data-tpl="techhub-dark"] .tf-tick-track {
  display: flex;
  width: max-content;
  animation: tf-tick var(--tf-tspeed, 26s) linear infinite;
}
[data-tpl="techhub-dark"] .tf-tick-mask { mask-image: linear-gradient(to left, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to left, transparent, black 5%, black 95%, transparent); }
@keyframes tf-tick { from { transform: translate3d(0,0,0); } to { transform: translate3d(50%,0,0); } }
/* floating purple orbs */
[data-tpl="techhub-dark"] .tf-orb { animation: tf-orb-float 14s ease-in-out infinite; opacity: .85; }
[data-tpl="techhub-dark"] .tf-orb-2 { animation-delay: -5s; animation-duration: 18s; }
[data-tpl="techhub-dark"] .tf-orb-3 { animation-delay: -9s; animation-duration: 22s; }
[data-tpl="techhub-dark"][data-glow="off"] .tf-orb { opacity: .3; }
@keyframes tf-orb-float {
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(0,-26px,0) scale(1.07); }
}
/* rotating neon ring around the hero tilt card (@property fallback = static ring) */
@property --tf-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
[data-tpl="techhub-dark"] .tf-ring {
  background: conic-gradient(from var(--tf-angle, 0deg),
    rgba(79,70,229,.06) 0deg, rgba(124,58,237,.9) 80deg, rgba(196,181,253,.95) 150deg,
    rgba(79,70,229,.12) 250deg, rgba(124,58,237,.45) 320deg, rgba(79,70,229,.06) 360deg);
  opacity: .9;
}
[data-tpl="techhub-dark"][data-glow="on"] .tf-ring {
  animation: tf-ring-spin 7s linear infinite;
  box-shadow: 0 0 46px -8px rgba(124,58,237,.6), 0 0 100px -26px rgba(79,70,229,.5);
}
[data-tpl="techhub-dark"][data-glow="off"] .tf-ring { opacity: .45; }
@keyframes tf-ring-spin { to { --tf-angle: 360deg; } }
/* electric indigo→purple gradient utilities */
[data-tpl="techhub-dark"] .tf-grad { background-image: linear-gradient(135deg, var(--tf-indigo), var(--tf-purple)); }
[data-tpl="techhub-dark"] .tf-grad:hover { background-image: linear-gradient(135deg, #6366F1, #8B5CF6); }
[data-tpl="techhub-dark"] .tf-grad-added { background-image: linear-gradient(135deg, #059669, #10B981) !important; }
[data-tpl="techhub-dark"] .tf-grad-off { background-image: linear-gradient(135deg, #6B7280, #9CA3AF) !important; }
[data-tpl="techhub-dark"] .tf-hero-grad {
  background-image: linear-gradient(120deg, var(--tf-indigo), var(--tf-purple) 55%, #A78BFA);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
/* CTA glow halo (feature-gated) */
[data-tpl="techhub-dark"][data-glow="on"] .tf-cta { box-shadow: 0 16px 38px -14px rgba(124,58,237,.75), 0 0 30px -6px rgba(79,70,229,.4); }
/* lavender promo tiles */
[data-tpl="techhub-dark"] .tf-promo {
  background-image: linear-gradient(140deg, #EDE9FE 0%, #E0E7FF 100%);
  color: var(--tf-ink);
}
/* شگفت‌انگیز card gradient frame */
[data-tpl="techhub-dark"] .tf-flash-card {
  background-image: linear-gradient(120deg, rgba(79,70,229,.55), rgba(124,58,237,.4) 40%, rgba(167,139,250,.55));
}
[data-tpl="techhub-dark"] .tf-flash-inner { background-color: var(--card); }
[data-tpl="techhub-dark"] .tf-flash-card > div { background-color: color-mix(in oklab, var(--card) 92%, var(--tf-purple) 8%); }
/* pulsing dot / breathing label */
[data-tpl="techhub-dark"] .tf-dot { animation: tf-blink 1.8s ease-in-out infinite; }
[data-tpl="techhub-dark"] .tf-dot-text { animation: tf-breathe 2.6s ease-in-out infinite; }
@keyframes tf-blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@keyframes tf-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
/* timer cells tiny glow */
[data-tpl="techhub-dark"][data-glow="on"] .tf-timer-cell { box-shadow: 0 0 18px -6px rgba(124,58,237,.45); }
/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  [data-tpl="techhub-dark"] .tf-tick-track,
  [data-tpl="techhub-dark"] .tf-orb,
  [data-tpl="techhub-dark"] .tf-ring,
  [data-tpl="techhub-dark"] .tf-dot,
  [data-tpl="techhub-dark"] .tf-dot-text { animation: none !important; }
}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════
   The light grid zone is token-based and already light-ready; this skin flips the
   deep-space hero band, tilt card, ticker and chrome canvas to light surfaces. */
html:not(.dark) [data-tpl="techhub-dark"] {
  --tf-indigo: #4F46E5;
  --tf-purple: #7C3AED;
  --tf-lav: #EDE9FE;
  --tf-ink: #312E81;
  --background: #F3F5FB;
  --foreground: #1B1E30;
  --card: #FFFFFF;
  --card-foreground: #1B1E30;
  --muted: #E9ECF6;
  --muted-foreground: #565B75;
  --border: rgba(27, 30, 48, 0.12);
  --input: rgba(27, 30, 48, 0.14);
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --accent: #E9ECF6;
  --accent-foreground: #1B1E30;
  --popover: #FFFFFF;
  --popover-foreground: #1B1E30;
  background-color: #F3F5FB;
  color: #1B1E30;
}

/* ── hero band + tilt-card well → light indigo surfaces ── */
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[\\#0F0F1A\\] { background-color: #ECEFFB; }
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[\\#15152B\\]\\/90 { background-color: rgba(255, 255, 255, 0.9); }
html:not(.dark) [data-tpl="techhub-dark"] .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.65); }
html:not(.dark) [data-tpl="techhub-dark"] .bg-white\\/\\[0\\.04\\] { background-color: rgba(255, 255, 255, 0.6); }
html:not(.dark) [data-tpl="techhub-dark"] .hover\\:bg-white\\/10:hover { background-color: rgba(255, 255, 255, 0.85); }
html:not(.dark) [data-tpl="techhub-dark"] .border-white\\/10 { border-color: rgba(27, 30, 48, 0.12); }

/* ── lavender/violet text → deep indigo (same hue family, ink-ready) ── */
html:not(.dark) [data-tpl="techhub-dark"] .text-\\[\\#C7D2FE\\] { color: #4F46E5; }
html:not(.dark) [data-tpl="techhub-dark"] .text-\\[\\#C4B5FD\\] { color: #4338CA; }
html:not(.dark) [data-tpl="techhub-dark"] .text-\\[\\#DDD6FE\\] { color: #4338CA; }
html:not(.dark) [data-tpl="techhub-dark"] .text-\\[\\#A78BFA\\] { color: #6D28D9; }
html:not(.dark) [data-tpl="techhub-dark"] .text-\\[\\#7C3AED\\]\\/60 { color: rgba(124, 58, 237, 0.75); }
html:not(.dark) [data-tpl="techhub-dark"] .fill-\\[\\#C7D2FE\\] { fill: #4F46E5; }
html:not(.dark) [data-tpl="techhub-dark"] .hover\\:text-\\[\\#C4B5FD\\]:hover { color: #4338CA; }
html:not(.dark) [data-tpl="techhub-dark"] .hover\\:text-white:hover { color: #1B1E30; }
html:not(.dark) [data-tpl="techhub-dark"] .border-\\[\\#A78BFA\\]\\/35 { border-color: rgba(124, 58, 237, 0.4); }
html:not(.dark) [data-tpl="techhub-dark"] .border-\\[\\#A78BFA\\]\\/40 { border-color: rgba(124, 58, 237, 0.45); }
html:not(.dark) [data-tpl="techhub-dark"] .border-\\[\\#818CF8\\]\\/40 { border-color: rgba(99, 102, 241, 0.5); }

/* ── white-alpha text → ink-alpha ── */
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/30 { color: rgba(27, 30, 48, 0.35); }
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/40 { color: rgba(27, 30, 48, 0.45); }
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/50 { color: rgba(27, 30, 48, 0.52); }
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/60 { color: rgba(27, 30, 48, 0.62); }
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/70 { color: rgba(27, 30, 48, 0.68); }
html:not(.dark) [data-tpl="techhub-dark"] .text-white\\/80 { color: rgba(27, 30, 48, 0.82); }

/* ── .text-white blanket → ink; restored on gradient CTAs, colored badges, dark image overlays ── */
html:not(.dark) [data-tpl="techhub-dark"] .text-white { color: #1B1E30; }
html:not(.dark) [data-tpl="techhub-dark"] .tf-grad.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .bg-destructive.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .bg-emerald-500.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .fill-white { fill: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .from-black\\/70 .text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="techhub-dark"] .from-black\\/70 .text-white\\/75 { color: rgba(255, 255, 255, 0.75); }
html:not(.dark) [data-tpl="techhub-dark"] .from-black\\/70 .text-\\[\\#C4B5FD\\] { color: #C4B5FD; }

/* ── purple orbs + glows softened for light surfaces ── */
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[radial-gradient\\(circle\\,rgba\\(79\\,70\\,229\\,52\\%\\)\\,transparent_66\\%\\)\\] { background-image: radial-gradient(circle, rgba(79, 70, 229, 0.24), transparent 66%); }
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[radial-gradient\\(circle\\,rgba\\(124\\,58\\,237\\,45\\%\\)\\,transparent_66\\%\\)\\] { background-image: radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 66%); }
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[radial-gradient\\(circle\\,rgba\\(167\\,139\\,250\\,30\\%\\)\\,transparent_68\\%\\)\\] { background-image: radial-gradient(circle, rgba(167, 139, 250, 0.18), transparent 68%); }
html:not(.dark) [data-tpl="techhub-dark"] .bg-\\[radial-gradient\\(circle\\,rgba\\(124\\,58\\,237\\,42\\%\\)\\,transparent_68\\%\\)\\] { background-image: radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 68%); }
html:not(.dark) [data-tpl="techhub-dark"] .shadow-\\[0_30px_80px_-24px_rgba\\(15\\,15\\,26\\,80\\%\\)\\] { --tw-shadow: 0 30px 80px -24px rgba(27, 30, 48, 0.22); }
html:not(.dark) [data-tpl="techhub-dark"] .shadow-\\[0_-18px_50px_-24px_rgba\\(15\\,15\\,26\\,45\\%\\)\\] { --tw-shadow: 0 -18px 50px -24px rgba(27, 30, 48, 0.16); }
html:not(.dark) [data-tpl="techhub-dark"] .shadow-\\[0_16px_38px_-14px_rgba\\(124\\,58\\,237\\,75\\%\\)\\] { --tw-shadow: 0 16px 38px -14px rgba(124, 58, 237, 0.4); }
html:not(.dark) [data-tpl="techhub-dark"] .shadow-\\[0_6px_18px_-6px_rgba\\(124\\,58\\,237\\,70\\%\\)\\] { --tw-shadow: 0 6px 18px -6px rgba(124, 58, 237, 0.4); }
html:not(.dark) [data-tpl="techhub-dark"] .drop-shadow-\\[0_18px_28px_rgba\\(79\\,70\\,229\\,35\\%\\)\\] { --tw-drop-shadow: drop-shadow(0 18px 28px rgba(79, 70, 229, 0.28)); }
html:not(.dark) [data-tpl="techhub-dark"] .\\[text-shadow\\:0_0_18px_rgba\\(139\\,92\\,246\\,45\\%\\)\\] { text-shadow: 0 0 18px rgba(99, 102, 241, 0.22); }

/* ── scoped helper classes → light variants ── */
html:not(.dark) [data-tpl="techhub-dark"] .tf-hero-grad {
  background-image: linear-gradient(120deg, #4F46E5, #7C3AED 55%, #6D28D9);
}
html:not(.dark) [data-tpl="techhub-dark"][data-glow="on"] .tf-cta { box-shadow: 0 16px 38px -14px rgba(124, 58, 237, 0.4), 0 0 30px -6px rgba(79, 70, 229, 0.22); }
html:not(.dark) [data-tpl="techhub-dark"][data-glow="on"] .tf-ring {
  box-shadow: 0 0 46px -8px rgba(124, 58, 237, 0.35), 0 0 100px -26px rgba(79, 70, 229, 0.25);
}
html:not(.dark) [data-tpl="techhub-dark"][data-glow="on"] .tf-timer-cell { box-shadow: 0 0 18px -6px rgba(124, 58, 237, 0.3); }
`}</style>
    </div>
  );
}

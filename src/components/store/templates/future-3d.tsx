"use client";

/**
 * TEMPLATE · future-3d — v25 «3D Neon Perspective» (FULL REWRITE)
 * ---------------------------------------------------------------------
 * A void (#0A0E1A) neon space: hero with THREE parallax depth layers
 * (framer-motion useScroll/useTransform — the first slider artwork as
 * the far layer, glow orbs mid, content near) standing on an animated
 * perspective floor grid (transform: perspective(800px) rotateX(60deg),
 * background-position scroll keyframes). Product cards are real 3D
 * tilt pods: mouse-driven rotateX/rotateY (max ±10°) with a spring
 * return, preserve-3d, image lifted translateZ(30px), floating spec
 * chips at translateZ(40px), and edge-light gradient borders (1px
 * padding trick). Neon cyan #22D3EE + violet #8B5CF6 rim lights, glass
 * panels with backdrop-blur. No registered features → no gates.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  Orbit, Sparkles, Star, Flame, TrendingUp, Package, BadgeCheck,
  ShoppingCart, Check, ChevronLeft, Layers, Boxes, HelpCircle, Crown, Zap, Gem,
} from "lucide-react";
import type { HomeData, TemplateProduct, TemplateShowcase } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ── glass neon section header ────────────────────────────────────── */
function NeonHeader({
  icon: Icon, title, subtitle, href,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="fd3-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#22D3EE]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[11px] font-bold text-white/50">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="group flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[#22D3EE]/25 bg-[#22D3EE]/8 px-4 text-xs font-bold text-[#67E8F9] transition-colors hover:bg-[#22D3EE]/15">
          مشاهده همه
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── 3D tilt product pod (±10°, preserve-3d, spring back) ────────── */
function TiltCard({ product, rim = "cyan" }: { product: TemplateProduct; rim?: "cyan" | "violet" }) {
  const reduced = useReducedMotion();
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  /* pointer → -1..1 → spring → rotate (max ±10°, springs back to 0) */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 170, damping: 16 });
  const sy = useSpring(my, { stiffness: 170, damping: 16 });
  const rotateX = useTransform(sy, [-1, 1], [10, -10]);
  const rotateY = useTransform(sx, [-1, 1], [-10, 10]);

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const addToCart = async () => {
    if (!product.inStock || busy) return;
    try {
      setBusy(true);
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1000);
    } catch {
      /* toast handled by useCart */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="[perspective:1000px]">
      <motion.article
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={cn(
          "fd3-frame group relative flex h-full flex-col rounded-[1.4rem] p-[1px]",
          !product.inStock && "grayscale-[0.45]",
          rim === "violet" && "fd3-frame-violet",
        )}
      >
        {/* edge-lit glass body (1px gradient border trick) */}
        <div className="fd3-body relative flex h-full flex-col rounded-[calc(1.4rem-1px)]">
          {/* media — lifted on the Z axis */}
          <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="relative">
            <Link
              href={`/products/${product.slug}`}
              aria-label={product.name}
              className="zoom-media relative block aspect-square overflow-hidden rounded-t-[calc(1.4rem-1px)] bg-white/[0.03]"
            >
              {product.mainImage ? (
                <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1280px) 30vw, 22vw" className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <span className="grid h-full place-items-center text-white/30"><Package className="h-10 w-10" aria-hidden /></span>
              )}
            </Link>
            {/* floating spec chips (translateZ pops them off the card) */}
            <span style={{ transform: "translateZ(44px)" }} className="absolute start-2.5 top-2.5 rounded-full bg-[#0A0E1A]/85 px-2.5 py-1 text-[9.5px] font-black text-[#67E8F9] shadow-[0_8px_20px_-8px_rgba(34,211,238,60%)] backdrop-blur">
              {product.discountPercent > 0 ? `${product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف` : "امتیاز بالا"}
            </span>
            {!product.inStock && (
              <span style={{ transform: "translateZ(44px)" }} className="absolute end-2.5 top-2.5 rounded-full bg-white/85 px-2.5 py-1 text-[9.5px] font-black text-[#0A0E1A] shadow-lg">
                ناموجود
              </span>
            )}
            {product.soldCount > 0 && (
              <span style={{ transform: "translateZ(38px)" }} className="absolute end-2.5 bottom-2.5 rounded-full border border-[#8B5CF6]/40 bg-[#0A0E1A]/85 px-2.5 py-1 text-[9px] font-black text-[#C4B5FD] shadow-[0_8px_20px_-8px_rgba(139,92,246,60%)] backdrop-blur tabular-nums">
                {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
              </span>
            )}
          </div>

          {/* body */}
          <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
            <p className="flex items-center gap-1 text-[10.5px] font-bold text-white/50">
              <BadgeCheck className="h-3 w-3 text-[#22D3EE]" aria-hidden />
              <span className="truncate">{product.brand.name}</span>
            </p>
            <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-white transition-colors hover:text-[#67E8F9]">
              {product.name}
            </Link>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/50 tabular-nums">
              <Star className="h-3.5 w-3.5 fill-[#22D3EE] text-[#22D3EE]" aria-hidden />
              <span className="font-black text-white/85">{product.rating > 0 ? toFaDigits(product.rating.toLocaleString("fa-IR")) : "جدید"}</span>
              {product.reviewCount > 0 && <span>({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))} نظر)</span>}
            </p>
            <div className="mt-auto pt-3" style={{ transform: "translateZ(18px)", transformStyle: "preserve-3d" }}>
              {product.discountPercent > 0 && (
                <p className="text-[11px] leading-4 text-white/40 price-old tabular-nums">{formatPrice(product.price)}</p>
              )}
              <p className={cn("text-[15px] font-black leading-6 tabular-nums", product.discountPercent > 0 ? "text-[#67E8F9]" : "text-white")}>
                {formatPrice(product.effectivePrice)}
                <span className="text-[10px] font-normal text-white/45"> تومان</span>
              </p>
              <button
                type="button"
                onClick={addToCart}
                disabled={!product.inStock || busy}
                aria-label={`افزودن ${product.name} به سبد خرید`}
                className={cn(
                  "mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all active:scale-[0.97]",
                  product.inStock
                    ? added
                      ? "bg-emerald-500 text-white"
                      : "fd3-buy text-[#06121A]"
                    : "cursor-not-allowed bg-white/10 text-white/40",
                )}
              >
                {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
                {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "ناموجود"}
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

/* ── showcase as a perspective glass panel ────────────────────────── */
function PerspectivePanel({ s, flip }: { s: TemplateShowcase; flip?: boolean }) {
  const href = s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products");
  return (
    <div className="[perspective:1300px]">
      <Link
        href={href}
        aria-label={s.title}
        className={cn(
          "fd3-panel group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-3xl p-6 transition-transform duration-500 md:min-h-[280px]",
          "[transform:rotateY(var(--panel-rot))] hover:[transform:rotateY(0deg)_scale(1.02)]",
        )}
        style={{ "--panel-rot": flip ? "5deg" : "-5deg" } as React.CSSProperties}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <Image src={s.image} alt="" fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover opacity-45 transition-opacity duration-500 group-hover:opacity-65" loading="lazy" />
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050810]/95 via-[#0A0E1A]/70 to-[#0A0E1A]/30" />
        {s.product?.mainImage && (
          <span style={{ transform: "translateZ(40px)" }} className="pointer-events-none absolute -top-6 end-4 hidden h-36 w-36">
            <Image src={s.product.mainImage} alt="" fill sizes="144px" className="object-contain opacity-90 drop-shadow-[0_22px_28px_rgba(34,211,238,35%)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" loading="lazy" />
          </span>
        )}
        <div style={{ transform: "translateZ(30px)" }} className="relative">
          <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#22D3EE]/35 bg-[#0A0E1A]/70 px-3 py-1 text-[10px] font-bold text-[#67E8F9] backdrop-blur">
            <Zap className="h-3 w-3" aria-hidden />
            ویترین آینده
          </p>
          <h3 className="text-lg font-black text-white md:text-xl">{s.title}</h3>
          {s.subtitle && <p className="mt-1.5 max-w-md text-xs leading-6 text-white/70">{s.subtitle}</p>}
          <span className="fd3-buy mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-xs font-black text-[#06121A] transition-transform group-hover:-translate-y-0.5">
            {s.product ? `از ${formatPrice(s.product.discountPrice ?? s.product.price)} تومان` : "مشاهده"}
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </div>
  );
}

/* ── glass FAQ item ───────────────────────────────────────────────── */
function FaqItem({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="fd3-glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 p-4 text-start"
      >
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black tabular-nums transition-colors", open ? "bg-[#22D3EE] text-[#06121A]" : "bg-[#22D3EE]/12 text-[#67E8F9]")}>
          {(n + 1).toLocaleString("fa-IR")}
        </span>
        <span className="flex-1 text-[13px] font-bold leading-6 text-white">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-white/50 transition-transform duration-300", open && "-rotate-90")} aria-hidden />
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
export function Future3DTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const heroSlide = data.slides[0] ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0;

  const chrome = TEMPLATE_CHROME["future-3d"];

  /* hero parallax — 3 depth layers drift subtly apart while scrolling */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yFar = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const yNear = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  const stats = [
    { icon: Boxes, n: counts.products, label: "محصول" },
    { icon: Layers, n: counts.categories, label: "دسته‌بندی" },
    { icon: Crown, n: counts.brands, label: "برند" },
    { icon: Sparkles, n: counts.stories, label: "استوری" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="future-3d" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* void neon world */}
      <div className="w-full bg-[#0A0E1A] text-white">
        {/* ═══ HERO — 3-layer parallax + perspective floor grid ═══ */}
        <section ref={heroRef} className="relative isolate overflow-hidden" aria-labelledby="f3d-hero-title">
          {/* LAYER 1 · far — the first slider artwork, faint and slow */}
          <motion.div style={{ y: yFar, opacity: heroFade }} className="absolute inset-0" aria-hidden>
            {heroSlide ? (
              <>
                <SlideArt slide={heroSlide} alt="" sizes="100vw" className="object-cover opacity-25" priority />
                <span className="absolute inset-0 bg-gradient-to-b from-[#0A0E1A]/70 via-[#0A0E1A]/60 to-[#0A0E1A]" />
              </>
            ) : (
              <span className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(34,211,238,30%)_1px,transparent_1px)] [background-size:30px_30px]" />
            )}
          </motion.div>

          {/* LAYER 2 · mid — neon glow orbs drifting faster */}
          <motion.div style={{ y: yMid }} className="absolute inset-0" aria-hidden>
            <span className="fd3-float pointer-events-none absolute -start-16 top-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,32%),transparent_68%)] blur-2xl" />
            <span className="fd3-float-2 pointer-events-none absolute end-24 top-1/3 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,36%),transparent_68%)] blur-2xl" />
            <span className="fd3-float-3 pointer-events-none absolute bottom-32 start-1/3 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,28%),transparent_70%)] blur-xl" />
          </motion.div>

          {/* LAYER 3 · near — content */}
          <motion.div style={{ y: yNear }} className="relative mx-auto flex min-h-[480px] w-full max-w-[1280px] flex-col justify-center px-4 py-16 sm:px-6 md:min-h-[560px]">
            <p className="fd3-glass inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold text-[#67E8F9]">
              <Orbit className="h-3.5 w-3.5 animate-spin text-[#22D3EE] [animation-duration:6s]" aria-hidden />
              تجربه خرید نسل بعد · {store.storeName}
            </p>
            <h1 id="f3d-hero-title" className="fd3-grad-text mt-5 max-w-2xl text-3xl font-black leading-[1.3] sm:text-4xl md:text-5xl">
              آینده را در <span className="fd3-grad-text">سه‌بُعد</span> لمس کنید
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 md:text-base md:leading-8" dir="rtl">
              {store.announcementActive && store.announcement
                ? store.announcement
                : `${store.storeName} — دیجیتال‌ترین فروشگاه الکترونیک؛ ${toFaDigits(counts.products.toLocaleString("fa-IR"))} کالا در مدار نئون.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/products" className="fd3-buy group flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-black text-[#06121A] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                <ShoppingCart className="h-4 w-4" aria-hidden />
                ورود به دنیای محصولات
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
              </Link>
              {stories.length > 0 && (
                <a href="#f3d-stories" className="fd3-glass flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition-colors hover:border-[#22D3EE]/40">
                  <Sparkles className="h-4 w-4 text-[#22D3EE]" aria-hidden />
                  استوری‌های زنده
                </a>
              )}
            </div>

            {/* stats chips — real counts on glass */}
            <ul className="mt-7 flex flex-wrap gap-2.5" aria-label="آمار فروشگاه">
              {stats.map((s) => (
                <li key={s.label} className="fd3-glass flex items-center gap-2 rounded-xl px-3.5 py-2">
                  <s.icon className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden />
                  <span className="text-sm font-black tabular-nums text-white">{toFaDigits(s.n.toLocaleString("fa-IR"))}</span>
                  <span className="text-[10px] font-bold text-white/55">{s.label}</span>
                </li>
              ))}
            </ul>

            {/* hero product — floating glass pod (uses the slide product) */}
            {heroSlide?.product?.mainImage && (
              <Link
                href={`/products/${heroSlide.product.slug}`}
                className="fd3-glass fd3-float group absolute bottom-24 end-6 hidden w-48 rounded-2xl p-3 text-white transition-transform duration-500 hover:-translate-y-2 md:block lg:end-14"
              >
                <span className="relative block aspect-square">
                  <Image src={heroSlide.product.mainImage} alt={heroSlide.product.name} fill sizes="192px" priority className="object-contain drop-shadow-[0_18px_28px_rgba(34,211,238,30%)]" />
                </span>
                <span className="mt-2 block truncate text-[11px] font-bold">{heroSlide.product.name}</span>
                <span className="text-xs font-black tabular-nums text-[#67E8F9]">
                  {formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)} تومان
                </span>
              </Link>
            )}
          </motion.div>

          {/* perspective floor grid — perspective(800px) rotateX(60°) + background-position scroll */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] overflow-hidden">
            <div className="fd3-floor absolute inset-x-[-50%] bottom-[-30%] h-[160%]" />
          </div>
          {/* horizon beam */}
          <span aria-hidden className="fd3-beam absolute inset-x-0 bottom-[45%] h-px" />
        </section>

        <div className="mx-auto w-full max-w-[1280px] space-y-14 px-4 py-14 sm:px-6 md:space-y-16">

          {/* ═══ SLIDE DECK — remaining slider art on glass chips ═══ */}
          {data.slides.length > 0 && (
            <section aria-label="اسلایدهای فروشگاه">
              <Reveal>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {data.slides.map((s) => (
                    <Link
                      key={s.id}
                      href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                      aria-label={s.title}
                      className="fd3-glass fd3-slide group relative block h-28 w-64 shrink-0 overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1 sm:h-32 sm:w-80"
                    >
                      <SlideArt slide={s} alt={s.title} sizes="320px" className="object-cover opacity-55 transition-opacity duration-500 group-hover:opacity-80" loading="lazy" />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#050810]/85 via-[#0A0E1A]/40 to-transparent" />
                      <span className="absolute inset-y-0 end-0 flex w-3/5 flex-col justify-center gap-1 p-4 text-end">
                        <span className="truncate text-[13px] font-black text-white">{s.title}</span>
                        {s.subtitle && <span className="truncate text-[10px] text-white/65">{s.subtitle}</span>}
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-[#67E8F9]">
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

          {/* ═══ STORIES (dark-scoped via --background override) ═══ */}
          {stories.length > 0 && (
            <section id="f3d-stories" className="scroll-mt-24" aria-label="استوری‌های فروشگاه" style={{ "--background": "var(--f3d-stories-bg, #0A0E1A)" } as React.CSSProperties}>
              <Reveal>
                <div className="fd3-glass rounded-[2rem] p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <span className="fd3-icon grid h-9 w-9 place-items-center rounded-xl text-[#22D3EE]">
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </span>
                      استوری‌های زنده فروشگاه
                      <span className="rounded-full bg-[#22D3EE]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#67E8F9] tabular-nums">
                        {toFaDigits(stories.length.toLocaleString("fa-IR"))} استوری
                      </span>
                    </p>
                  </div>
                  <StoriesRow stories={stories} />
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ CATEGORIES — glass portals ═══ */}
          {data.categories.length > 0 && (
            <section aria-labelledby="f3d-cats">
              <Reveal>
                <NeonHeader icon={Layers} title="دسته‌بندی‌های کهکشان" subtitle="پرتال ورود به هر دنیای دیجیتال" href="/products" />
                <div className="taj-stagger grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                  {data.categories.slice(0, 12).map((c) => (
                    <Link
                      key={c.id}
                      href={`/products?category=${c.slug}`}
                      aria-label={c.name}
                      className="fd3-glass fd3-cat group relative flex flex-col overflow-hidden rounded-2xl transition-all hover:-translate-y-1 hover:border-[#22D3EE]/50"
                    >
                      <span className="relative block aspect-square overflow-hidden bg-black/30">
                        {c.image ? (
                          <Image src={c.image} alt={`دسته‌بندی ${c.name}`} fill sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 12vw" className="object-cover opacity-75 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-lg font-black text-[#22D3EE]">{c.name.charAt(0)}</span>
                        )}
                      </span>
                      <span className="flex flex-col items-center gap-0.5 p-2 text-center">
                        <span className="w-full truncate text-[11.5px] font-bold text-white">{c.name}</span>
                        <span className="text-[9.5px] font-bold text-white/50 tabular-nums">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ FEATURED — 3D tilt pods ═══ */}
          {data.featured.length > 0 && (
            <section aria-labelledby="f3d-featured">
              <Reveal>
                <NeonHeader icon={Star} title="محصولات ویژه" subtitle="شاخص‌ترین انتخاب‌ها در فضای سه‌بعدی" href="/products?sort=rating" />
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {data.featured.slice(0, 8).map((p) => <TiltCard key={p.id} product={p} />)}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ SHOWCASES — perspective glass panels ═══ */}
          {data.showcases.length > 0 && (
            <section aria-label="ویترین‌های ویژه">
              <Reveal>
                <NeonHeader icon={Zap} title="ویترین‌های آینده" subtitle="پنل‌های پرسپکتیو با عمق واقعی" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {data.showcases.slice(0, 4).map((s, i) => <PerspectivePanel key={s.id} s={s} flip={i % 2 === 1} />)}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ EXCLUSIVE — violet-rim tilt pods (v15) ═══ */}
          {data.exclusive.length > 0 && (
            <section aria-labelledby="f3d-exclusive">
              <Reveal>
                <NeonHeader icon={Gem} title="محصولات انحصاری تاج" subtitle="کارت‌های سه‌بعدی تعاملی — فقط این‌جا" />
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {data.exclusive.slice(0, 8).map((p) => <TiltCard key={p.id} product={p} rim="violet" />)}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ NEWEST — fresh arrivals on tilt pods ═══ */}
          {data.newest.length > 0 && (
            <section aria-labelledby="f3d-newest">
              <Reveal>
                <NeonHeader icon={TrendingUp} title="تازه‌رسیده‌ها" subtitle="جدیدترین محصولات در مدار فروشگاه" href="/products?sort=newest" />
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {data.newest.slice(0, 8).map((p) => <TiltCard key={p.id} product={p} />)}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ DISCOUNTED — neon deal pods ═══ */}
          {data.discounted.length > 0 && (
            <section aria-labelledby="f3d-deals">
              <Reveal>
                <NeonHeader icon={Flame} title="پروژه تخفیف‌ها" subtitle="کارت‌های نئونی با لبهٔ درخشان" href="/products?discount=1" />
                <div className="taj-stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {data.discounted.slice(0, 8).map((p) => <TiltCard key={p.id} product={p} rim="violet" />)}
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ BESTSELLERS — numbered glass strip ═══ */}
          {data.bestsellers.length > 0 && (
            <section aria-labelledby="f3d-best">
              <Reveal>
                <NeonHeader icon={Crown} title="پرفروش‌های مدار" subtitle="بر اساس فروش واقعی" href="/products?sort=bestselling" />
                <ol className="taj-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.bestsellers.slice(0, 8).map((p, i) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.slug}`} className="fd3-glass flex min-w-0 items-center gap-3 rounded-2xl p-2.5 transition-all hover:-translate-y-0.5 hover:border-[#22D3EE]/50 hover:shadow-[0_14px_34px_-16px_rgba(34,211,238,45%)]">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#22D3EE]/12 text-[12px] font-black text-[#67E8F9] tabular-nums">
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/40">
                          {p.mainImage ? <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-1" loading="lazy" /> : <Package className="h-5 w-5 m-auto text-white/40" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-white">{p.name}</span>
                          <span className="text-[11px] font-black text-[#67E8F9] tabular-nums">{formatPrice(p.effectivePrice)} تومان</span>
                        </span>
                        {p.soldCount > 0 && (
                          <span className="hidden shrink-0 rounded-full bg-[#8B5CF6]/15 px-2 py-1 text-[9.5px] font-bold text-[#C4B5FD] tabular-nums sm:block">{toFaDigits(p.soldCount.toLocaleString("fa-IR"))} فروش</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </section>
          )}

          {/* ═══ BRANDS marquee ═══ */}
          {data.brands.length > 0 && (
            <section aria-label="برندهای همکار">
              <Reveal>
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] py-5 backdrop-blur-md [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
                  <div className="taj-marquee items-center gap-3" style={{ "--t-dur": "28s" } as React.CSSProperties}>
                    {data.brands.map((b) => (
                      <Link key={`a-${b.id}`} href={`/products?brand=${b.slug}`} className="flex h-14 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#0A0E1A]/80 px-5 text-xs font-bold text-white/70 transition-colors hover:border-[#22D3EE]/50 hover:text-[#67E8F9]">
                        <Crown className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden />
                        {b.name}
                      </Link>
                    ))}
                    {data.brands.map((b) => (
                      <Link key={`b-${b.id}`} href={`/products?brand=${b.slug}`} aria-hidden tabIndex={-1} className="flex h-14 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#0A0E1A]/80 px-5 text-xs font-bold text-white/70 transition-colors hover:border-[#22D3EE]/50 hover:text-[#67E8F9]">
                        <Crown className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden />
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ FAQ ═══ */}
          {data.faq.length > 0 && (
            <section aria-labelledby="f3d-faq">
              <Reveal>
                <NeonHeader icon={HelpCircle} title="پرسش‌های متداول" subtitle="پاسخ سریع در فرکانس فروشگاه" />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <FaqItem key={i} h={f.h} p={f.p} n={i} />
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* empty state */}
          {!hasAnyProduct && (
            <section>
              <div className="fd3-glass rounded-[2rem] p-16 text-center">
                <Orbit className="mx-auto mb-4 h-12 w-12 text-[#22D3EE]/60" aria-hidden />
                <h2 className="text-lg font-bold text-white">فضای فروشگاه در حال شکل‌گیری است</h2>
                <p className="mt-2 text-sm leading-7 text-white/55">محصولات به‌زودی در مدار قرار می‌گیرند…</p>
              </div>
            </section>
          )}
        </div>
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* v25 scoped style — ONE plain <style> block, all rules under [data-tpl="future-3d"] */}
      <style>{`
[data-tpl="future-3d"] {
  --f3d-cyan: #22D3EE;
  --f3d-violet: #8B5CF6;
  --f3d-ink: #06121A;
}
/* glass panels */
[data-tpl="future-3d"] .fd3-glass {
  background: rgba(13, 20, 38, 0.58);
  border: 1px solid rgba(148, 163, 255, 0.14);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
/* neon icon chip (cyan rim light) */
[data-tpl="future-3d"] .fd3-icon {
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid rgba(34, 211, 238, 0.3);
  box-shadow: 0 0 18px -4px rgba(34, 211, 238, 0.55);
}
/* cyan→violet gradient text */
[data-tpl="future-3d"] .fd3-grad-text {
  background-image: linear-gradient(120deg, #E0F7FF 0%, var(--f3d-cyan) 38%, var(--f3d-violet) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
/* cyan CTA (rim-lit) */
[data-tpl="future-3d"] .fd3-buy {
  background-image: linear-gradient(135deg, #67E8F9, var(--f3d-cyan));
  box-shadow: 0 12px 32px -12px rgba(34, 211, 238, 0.65);
}
[data-tpl="future-3d"] .fd3-buy:hover { background-image: linear-gradient(135deg, #A5F3FC, #22D3EE); }
/* ═ 3D tilt pod: edge-light gradient border via the 1px padding trick ═ */
[data-tpl="future-3d"] .fd3-frame {
  background-image: linear-gradient(165deg, rgba(34,211,238,.5) 0%, rgba(139,92,246,.3) 42%, rgba(34,211,238,.05) 62%, rgba(139,92,246,.4) 100%);
  transition: box-shadow .4s ease, background .4s ease;
  will-change: transform;
}
[data-tpl="future-3d"] .fd3-frame-violet {
  background-image: linear-gradient(165deg, rgba(139,92,246,.55) 0%, rgba(34,211,238,.28) 45%, rgba(139,92,246,.06) 66%, rgba(139,92,246,.5) 100%);
}
[data-tpl="future-3d"] .fd3-frame:hover {
  box-shadow:
    0 0 26px -4px rgba(34, 211, 238, 0.5),
    0 0 52px -14px rgba(139, 92, 246, 0.6),
    0 24px 48px -20px rgba(10, 14, 26, 0.9);
}
[data-tpl="future-3d"] .fd3-body {
  background: linear-gradient(170deg, rgba(13, 20, 38, 0.92), rgba(10, 14, 26, 0.9));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
/* showcase perspective panel glass */
[data-tpl="future-3d"] .fd3-panel {
  border: 1px solid rgba(148, 163, 255, 0.16);
  background: linear-gradient(165deg, rgba(13, 20, 38, 0.85), rgba(10, 14, 26, 0.92));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 30px 60px -26px rgba(10, 14, 26, 0.95);
}
[data-tpl="future-3d"] .fd3-slide { border: 1px solid rgba(148, 163, 255, 0.16); }
/* ═ perspective floor grid: perspective(800px) rotateX(60deg), animated by background-position ═ */
[data-tpl="future-3d"] .fd3-floor {
  background-image:
    linear-gradient(to top, rgba(34, 211, 238, 0.33) 1.5px, transparent 1.5px),
    linear-gradient(to right, rgba(139, 92, 246, 0.25) 1.5px, transparent 1.5px);
  background-size: 64px 64px;
  transform: perspective(800px) rotateX(60deg);
  transform-origin: top center;
  animation: fd3-grid-scroll 3.4s linear infinite;
  mask-image: linear-gradient(to top, black 30%, transparent 72%);
  -webkit-mask-image: linear-gradient(to top, black 30%, transparent 72%);
  opacity: .8;
}
@keyframes fd3-grid-scroll {
  from { background-position: 0 0, 0 0; }
  to   { background-position: 0 64px, 0 64px; }
}
/* horizon beam (cyan rim across the grid edge) */
[data-tpl="future-3d"] .fd3-beam {
  background-image: linear-gradient(to left, transparent, rgba(34, 211, 238, 0.85), rgba(139, 92, 246, 0.55), transparent);
  box-shadow: 0 0 18px 2px rgba(34, 211, 238, 0.35);
  animation: fd3-beam-breathe 5s ease-in-out infinite;
}
@keyframes fd3-beam-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: .55; }
}
/* floating glow orbs */
[data-tpl="future-3d"] .fd3-float { animation: fd3-float-kf 13s ease-in-out infinite; }
[data-tpl="future-3d"] .fd3-float-2 { animation: fd3-float-kf 17s ease-in-out -4s infinite; }
[data-tpl="future-3d"] .fd3-float-3 { animation: fd3-float-kf 21s ease-in-out -8s infinite; }
@keyframes fd3-float-kf {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -24px, 0) scale(1.07); }
}
/* reduced motion — freeze the world, keep it readable */
@media (prefers-reduced-motion: reduce) {
  [data-tpl="future-3d"] .fd3-floor,
  [data-tpl="future-3d"] .fd3-beam,
  [data-tpl="future-3d"] .fd3-float,
  [data-tpl="future-3d"] .fd3-float-2,
  [data-tpl="future-3d"] .fd3-float-3 { animation: none !important; }
}

/* ═══ v26fix · LIGHT-MODE SKIN — html:not(.dark) only · dark design untouched ═══ */
html:not(.dark) [data-tpl="future-3d"]{
  --f3d-cyan:#22D3EE; --f3d-violet:#8B5CF6; --f3d-ink:#06121A; --f3d-stories-bg:#FCFDFF;
}
/* body void + raw-hex surfaces */
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]{ background-color:#F3F6FC; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/80{ background-color:rgba(255,255,255,0.92); }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#22D3EE\\]\\/8{ background-color:rgba(8,145,178,0.08); }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#22D3EE\\]\\/10{ background-color:rgba(8,145,178,0.09); }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#22D3EE\\]\\/12{ background-color:rgba(8,145,178,0.1); }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#8B5CF6\\]\\/15{ background-color:rgba(109,40,217,0.1); }
html:not(.dark) [data-tpl="future-3d"] .bg-black\\/30{ background-color:rgba(27,36,55,0.06); }
html:not(.dark) [data-tpl="future-3d"] .bg-black\\/40{ background-color:rgba(27,36,55,0.06); }
html:not(.dark) [data-tpl="future-3d"] .bg-white\\/10{ background-color:rgba(27,36,55,0.07); }
html:not(.dark) [data-tpl="future-3d"] .bg-white\\/85{ background-color:rgba(255,255,255,0.95); }
html:not(.dark) [data-tpl="future-3d"] .bg-white\\/\\[0\\.03\\]{ background-color:rgba(27,36,55,0.03); }
html:not(.dark) [data-tpl="future-3d"] .bg-white\\/\\[0\\.04\\]{ background-color:rgba(27,36,55,0.04); }
/* ink + accents */
html:not(.dark) [data-tpl="future-3d"] .text-white{ color:#1B2437; }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/85{ color:rgba(27,36,55,0.86); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/70{ color:rgba(27,36,55,0.72); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/65{ color:rgba(27,36,55,0.66); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/60{ color:rgba(27,36,55,0.62); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/55{ color:rgba(27,36,55,0.56); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/50{ color:rgba(27,36,55,0.5); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/45{ color:rgba(27,36,55,0.46); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/40{ color:rgba(27,36,55,0.4); }
html:not(.dark) [data-tpl="future-3d"] .text-white\\/30{ color:rgba(27,36,55,0.3); }
html:not(.dark) [data-tpl="future-3d"] .text-\\[\\#22D3EE\\]{ color:#0891B2; }
html:not(.dark) [data-tpl="future-3d"] .text-\\[\\#22D3EE\\]\\/60{ color:rgba(8,145,178,0.6); }
html:not(.dark) [data-tpl="future-3d"] .text-\\[\\#67E8F9\\]{ color:#0E7490; }
html:not(.dark) [data-tpl="future-3d"] .text-\\[\\#C4B5FD\\]{ color:#6D28D9; }
html:not(.dark) [data-tpl="future-3d"] .text-\\[\\#0A0E1A\\]{ color:#1B2437; }
html:not(.dark) [data-tpl="future-3d"] .fill-\\[\\#22D3EE\\]{ fill:#0891B2; }
/* borders + hovers */
html:not(.dark) [data-tpl="future-3d"] .border-white\\/10{ border-color:rgba(27,36,55,0.14); }
html:not(.dark) [data-tpl="future-3d"] .border-\\[\\#22D3EE\\]\\/25{ border-color:rgba(8,145,178,0.35); }
html:not(.dark) [data-tpl="future-3d"] .border-\\[\\#22D3EE\\]\\/35{ border-color:rgba(8,145,178,0.45); }
html:not(.dark) [data-tpl="future-3d"] .border-\\[\\#8B5CF6\\]\\/40{ border-color:rgba(109,40,217,0.45); }
html:not(.dark) [data-tpl="future-3d"] .hover\\:text-\\[\\#67E8F9\\]:hover{ color:#0E7490; }
html:not(.dark) [data-tpl="future-3d"] .hover\\:bg-\\[\\#22D3EE\\]\\/15:hover{ background-color:rgba(8,145,178,0.14); }
html:not(.dark) [data-tpl="future-3d"] .hover\\:border-\\[\\#22D3EE\\]\\/40:hover{ border-color:rgba(8,145,178,0.5); }
html:not(.dark) [data-tpl="future-3d"] .hover\\:border-\\[\\#22D3EE\\]\\/50:hover{ border-color:rgba(8,145,178,0.55); }
/* gradients — hero far-layer veil becomes light (image overlays on slides/panels stay dark) */
html:not(.dark) [data-tpl="future-3d"] .from-\\[\\#0A0E1A\\]\\/70{ --tw-gradient-from:rgba(243,246,252,0.78); }
html:not(.dark) [data-tpl="future-3d"] .via-\\[\\#0A0E1A\\]\\/60{ --tw-gradient-via:rgba(243,246,252,0.66); }
html:not(.dark) [data-tpl="future-3d"] .to-\\[\\#0A0E1A\\]{ --tw-gradient-to:#F3F6FC; }
/* scoped helpers -> light (fd3-buy / fd3-frame rims / beam stay vivid) */
html:not(.dark) [data-tpl="future-3d"] .fd3-glass{
  background:rgba(255,255,255,0.72); border-color:rgba(27,36,55,0.14);
  box-shadow:0 18px 55px -25px rgba(27,36,55,0.28), inset 0 1px 0 rgba(255,255,255,0.85);
}
html:not(.dark) [data-tpl="future-3d"] .fd3-icon{
  background:rgba(8,145,178,0.1); border-color:rgba(8,145,178,0.35);
  box-shadow:0 0 18px -4px rgba(8,145,178,0.4);
}
html:not(.dark) [data-tpl="future-3d"] .fd3-grad-text{ background-image:linear-gradient(120deg,#0C5A78 0%,#0891B2 38%,#7C3AED 100%); }
html:not(.dark) [data-tpl="future-3d"] .fd3-body{ background:linear-gradient(170deg,rgba(255,255,255,0.95),rgba(243,246,252,0.9)); }
html:not(.dark) [data-tpl="future-3d"] .fd3-frame:hover{
  box-shadow:0 0 26px -4px rgba(34,211,238,0.5), 0 0 52px -14px rgba(139,92,246,0.55), 0 24px 48px -20px rgba(27,36,55,0.35);
}
html:not(.dark) [data-tpl="future-3d"] .fd3-floor{
  background-image:linear-gradient(to top,rgba(8,145,178,0.45) 1.5px,transparent 1.5px),
    linear-gradient(to right,rgba(124,58,237,0.3) 1.5px,transparent 1.5px);
}
/* dark-surface restores — showcase panels / slide chips / floating spec chips keep dark glass */
html:not(.dark) [data-tpl="future-3d"] .fd3-panel .text-white{ color:#fff; }
html:not(.dark) [data-tpl="future-3d"] .fd3-panel .text-white\\/70{ color:rgba(255,255,255,0.7); }
html:not(.dark) [data-tpl="future-3d"] .fd3-panel .text-\\[\\#67E8F9\\]{ color:#67E8F9; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/70.text-\\[\\#67E8F9\\]{ color:#67E8F9; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/70.border-\\[\\#22D3EE\\]\\/35{ border-color:rgba(34,211,238,0.35); }
html:not(.dark) [data-tpl="future-3d"] .fd3-slide .text-white{ color:#fff; }
html:not(.dark) [data-tpl="future-3d"] .fd3-slide .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="future-3d"] .fd3-slide .text-\\[\\#67E8F9\\]{ color:#67E8F9; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/85.text-\\[\\#67E8F9\\]{ color:#67E8F9; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/85.text-\\[\\#C4B5FD\\]{ color:#C4B5FD; }
html:not(.dark) [data-tpl="future-3d"] .bg-\\[\\#0A0E1A\\]\\/85.border-\\[\\#8B5CF6\\]\\/40{ border-color:rgba(139,92,246,0.4); }
/* stories play chip + immersive story viewer keep their dark design */
html:not(.dark) [data-tpl="future-3d"] .bg-black\\/70.text-white{ color:#fff; }
html:not(.dark) [data-tpl="future-3d"] .z-\\[100\\].fixed .text-white{ color:#fff; }
html:not(.dark) [data-tpl="future-3d"] .z-\\[100\\].fixed .text-white\\/50{ color:rgba(255,255,255,0.5); }
html:not(.dark) [data-tpl="future-3d"] .z-\\[100\\].fixed .bg-black\\/40{ background-color:rgba(0,0,0,0.4); }
`}</style>
    </div>
  );
}

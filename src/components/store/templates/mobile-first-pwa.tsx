"use client";

/**
 * TEMPLATE · mobile-first-pwa — «پرمیوم ریسپانسیو» (v32 · task 14-a FULL REDESIGN)
 * --------------------------------------------------------------------------------
 * The rejected "app shell in a 430px phone frame" concept is GONE. This is a
 * premium RESPONSIVE storefront — one fluid layout from 360px phones to
 * ultrawide desktops (no device frame, no app tab bar, no snap wheels):
 *
 *  · deep teal-charcoal canvas (#071314) with emerald #10B981 → teal #2DD4BF
 *    gradients (distinct family — no indigo/blue defaults, no other
 *    template's palette)
 *  · HERO with two ParallaxBand ribbons drifting vertically on scroll + a
 *    3D FlipOnScroll showcase card (the slide artwork "turns like a book
 *    page") + a glowing floating product chip (GlowOnScroll)
 *  · refined product grids (2/3/4/5 cols), image-led category tiles,
 *    numbered bestsellers, FlipOnScroll exclusive cards (alternating page
 *    turns), a full-bleed parallax showcase band, brand strip, FAQ
 *  · the whole page breathes through the shared scroll-fx system
 *    (./scroll-fx) — every entrance is SSR-safe (visible without JS) and
 *    disabled under prefers-reduced-motion
 *
 * The registry id stays `mobile-first-pwa` (DB rows, AUTH_VARIANT_MAP,
 * MEGA_MENU_STYLES, chrome config and content defaults keep resolving);
 * only its admin display name/desc changed («پرمیوم ریسپانسیو»).
 * The H6 chrome header + F8 footer ride their own tokens; the header is
 * retuned to the teal palette via CSS vars scoped to [data-chrome-header].
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Check, ChevronLeft, Star, Flame, ShoppingCart, Timer,
  BadgeCheck, TrendingUp, HelpCircle, Smartphone, Laptop, Computer, Cpu,
  Monitor, Gamepad2, Watch, HardDrive, Keyboard, Mouse, Camera, Speaker,
  Wifi, BatteryCharging, Projector, Headphones, LayoutGrid, Sparkles,
  Rocket, Boxes, Gem, Truck, ShieldCheck, Headphones as Support, CreditCard,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";
import { RevealOnScroll, FlipOnScroll, ParallaxBand, GlowOnScroll, sfxStagger, SCROLL_FX_CSS } from "./scroll-fx";

/* category slug → lucide icon (image-less category tiles) */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Timer, headphones: Headphones, earbuds: Timer, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/* ═══ 1 · section heading ═══════════════════════════════════════════ */
function PrHead({
  kicker, title, icon: Icon = Sparkles, id, href, hot = false, action,
}: {
  kicker: string; title: string; icon?: React.ElementType; id?: string; href?: string; hot?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 md:mb-6 md:gap-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className={cn("pr-kicker grid h-11 w-11 shrink-0 place-items-center rounded-2xl", hot && "pr-kicker-hot")} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={cn("pr-kick truncate text-[10px] font-black tracking-[0.18em]", hot && "pr-kick-hot")}>{kicker}</p>
          <h2 id={id} className="mt-1 truncate text-lg font-black leading-7 md:text-2xl md:leading-9">{title}</h2>
        </div>
      </div>
      {action ?? (href && (
        <Link href={href} className="pr-more hidden h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-[12px] font-black sm:flex">
          مشاهدهٔ همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

/* ═══ 2 · hydration-safe countdown chip ═════════════════════════════ */
function PrCountdown({ endsAt }: { endsAt?: string | null }) {
  const [left, setLeft] = useState<string | null>(null);
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
      setLeft(
        `${toFaDigits(String(Math.floor(diff / 3_600_000)).padStart(2, "0"))}:${toFaDigits(String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0"))}:${toFaDigits(String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0"))}`
      );
    };
    compute();
    const t = window.setInterval(compute, 1000);
    return () => window.clearInterval(t);
  }, [endsAt]);
  return (
    <p className="pr-timer flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-[12.5px] font-black tabular-nums" role="timer" aria-label="زمان باقی‌مانده">
      <Timer className="h-4 w-4" aria-hidden />
      {left ?? "—"}
    </p>
  );
}

/* ═══ 3 · premium product card ══════════════════════════════════════ */
function PremiumCard({ product }: { product: TemplateProduct }) {
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
    <article className={cn("pr-card group flex flex-col overflow-hidden rounded-3xl", !product.inStock && "opacity-55 grayscale-[0.35]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 18vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center">
            <Package className="h-10 w-10 pr-dim-icon" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="pr-off absolute start-3 top-3 rounded-xl px-2 py-1 text-[10.5px] font-black text-white tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {product.inStock ? (
          <span aria-hidden className="absolute end-3 top-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
        ) : (
          <span className="pr-stock-out absolute end-3 top-3 rounded-lg px-2 py-0.5 text-[9.5px] font-bold">اتمام موجودی</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="flex items-center gap-1 truncate text-[10.5px] font-bold pr-mute">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 pr-acc-soft" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-11 text-[13px] font-bold leading-[22px]">
          {product.name}
        </Link>
        <div className="mt-auto pt-1.5">
          {product.discountPercent > 0 && (
            <p className="text-[10.5px] leading-4 pr-mute price-old tabular-nums">{formatPrice(product.price)} تومان</p>
          )}
          <p className={cn("text-[15px] font-black leading-7 tabular-nums", product.discountPercent > 0 && "pr-acc")}>
            {formatPrice(product.effectivePrice)}
            <span className="text-[9.5px] font-normal pr-mute"> تومان</span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "pr-buy mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[12px] font-black text-white transition-all active:scale-[0.97]",
              !product.inStock && "cursor-not-allowed !bg-transparent !border !text-slate-500"
            )}
          >
            {added ? <Check className="h-4.5 w-4.5" aria-hidden /> : <ShoppingCart className="h-4.5 w-4.5" aria-hidden />}
            {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════ TEMPLATE ═══════════════════════ */
export function MobileFirstPwaTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["mobile-first-pwa"];

  /* optional per-template hero copy (Admin → محتوای قالب‌ها — additive) */
  const texts = data.templateContent?.texts ?? {};
  const tagline = data.templateContent?.brand?.tagline ?? "پرمیوم ریسپانسیو · تجربه‌ای یکپارچه از موبایل تا مانیتور";

  const slides = data.slides ?? [];
  const heroSlide = slides[0] ?? null;
  const railSlides = slides.slice(1, 6);

  const stories = useMemo<StoryItem[]>(() =>
    (data.stories ?? []).map((s) => ({
      id: s.id, title: s.title, image: s.image, videoUrl: s.videoUrl,
      duration: s.duration, linkUrl: s.linkUrl, badge: s.badge,
      product: s.product, category: s.category,
    })), [data.stories]);

  const deals = useMemo(() => {
    const seen = new Set<string>();
    const out: TemplateProduct[] = [];
    for (const p of [...(data.discounted ?? []), ...(data.featured ?? [])]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out.slice(0, 10);
  }, [data.discounted, data.featured]);
  const dealTimer = deals.find((p) => p.discountEndsAt)?.discountEndsAt ?? store.timerEndsAt ?? null;

  const featured = (data.featured ?? []).slice(0, 8);
  const bestsellers = (data.bestsellers ?? []).slice(0, 6);
  const exclusive = (data.exclusive ?? []).slice(0, 3);
  const newest = (data.newest ?? []).slice(0, 8);
  const showcases = (data.showcases ?? []).slice(0, 3);
  const hasAnyProduct = deals.length > 0 || featured.length > 0 || bestsellers.length > 0 || exclusive.length > 0 || newest.length > 0;

  /* hero showcase fallbacks: slide → featured product → pure gradient */
  const heroVisual = heroSlide ?? null;
  const heroProduct = heroSlide?.product ?? data.featured[0] ?? data.bestsellers[0] ?? null;
  const totalSold = (data.bestsellers ?? []).reduce((n, p) => n + p.soldCount, 0);

  const stats = [
    { v: counts.products, l: "کالای آمادهٔ ارسال" },
    { v: counts.brands, l: "برند معتبر" },
    { v: counts.categories, l: "دسته‌بندی فعال" },
    { v: totalSold, l: "فروش موفق" },
  ];

  const benefits = [
    { icon: Truck, t: "ارسال سریع به سراسر ایران" },
    { icon: ShieldCheck, t: "ضمانت اصالت کالا" },
    { icon: Support, t: "پشتیبانی ۲۴ ساعته" },
    { icon: CreditCard, t: "پرداخت امن و مطمئن" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="mobile-first-pwa" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* NOTE: the announcement/ticker renders inside the template's own H6
          chrome header — never duplicated in the body. */}

      <div className="relative w-full overflow-clip">
        {/* ambient top wash */}
        <span aria-hidden className="pr-aurora" />

        {/* ═══ 1 · HERO — parallax ribbons + flip showcase ═══ */}
        <section aria-labelledby="pr-hero" className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-10 md:pb-20 md:pt-16">
          {/* drifting ribbons — the "top-to-bottom" scroll motion */}
          <ParallaxBand className="pr-ribbon pr-ribbon-a" speed={0.22} range={150} />
          <ParallaxBand className="pr-ribbon pr-ribbon-b" speed={0.13} range={110} />

          <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            {/* copy column */}
            <RevealOnScroll variant="start" className="relative z-10 text-center lg:text-start">
              <p className="pr-eyebrow inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black">
                <Sparkles className="h-4 w-4" aria-hidden />
                {tagline}
              </p>
              <h1 id="pr-hero" className="mt-6 text-4xl font-black leading-[1.15] tracking-tight md:text-6xl md:leading-[1.08]">
                {texts.heroTitle ?? store.storeName}
              </h1>
              <p dir="ltr" className="mt-3 text-[11px] font-black uppercase tracking-[0.34em] pr-acc-soft">
                {store.storeNameEn} · PREMIUM RESPONSIVE
              </p>
              <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-8 pr-mute md:text-[14.5px] md:leading-9 lg:mx-0">
                {texts.heroSubtitle ?? (store.announcementActive && store.announcement
                  ? store.announcement
                  : "چیدمانی حرفه‌ای که با هر صفحه‌نمایشی هم‌قد می‌شود؛ از موبایل جیبی تا مانیتور بزرگ — با حرکت، عمق و نورِ زندهٔ اسکرول.")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
                <Link href="/products" className="pr-btn flex h-12 items-center gap-2 rounded-2xl px-8 text-[13px] font-black text-white">
                  ورود به فروشگاه
                  <ChevronLeft className="h-4.5 w-4.5" aria-hidden />
                </Link>
                <Link href="/products?discount=1" className="pr-btn-ghost flex h-12 items-center gap-2 rounded-2xl px-7 text-[13px] font-black">
                  <Flame className="h-4.5 w-4.5 pr-kick-hot-icon" aria-hidden />
                  پیشنهادهای ویژه
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.l} className="pr-stat rounded-2xl p-3.5 text-center lg:text-start">
                    <dd className="text-xl font-black tabular-nums pr-acc md:text-2xl">{toFaDigits(s.v.toLocaleString("fa-IR"))}</dd>
                    <dt className="mt-1 text-[10px] font-bold tracking-[0.08em] pr-mute">{s.l}</dt>
                  </div>
                ))}
              </dl>
            </RevealOnScroll>

            {/* visual column — the book-page flip showcase */}
            <div className="relative mx-auto w-full max-w-[520px]">
              <FlipOnScroll degrees={56} origin="start">
                <div className="pr-showcase relative">
                  <span aria-hidden className="pr-ring" />
                  <div className="pr-hero-card relative overflow-hidden rounded-[2rem]">
                    <Link
                      href={heroVisual?.ctaUrl ?? (heroProduct ? `/products/${heroProduct.slug}` : "/products")}
                      aria-label={heroVisual?.title ?? store.storeName}
                      className="group relative block aspect-[4/3]"
                    >
                      {heroVisual ? (
                        <SlideArt slide={heroVisual} alt={heroVisual.title} fill priority sizes="(max-width: 1024px) 92vw, 520px" className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.04]" />
                      ) : heroProduct?.mainImage ? (
                        <Image src={heroProduct.mainImage} alt={heroProduct.name} fill priority sizes="(max-width: 1024px) 92vw, 520px" className="object-contain p-10 transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                      ) : (
                        <span className="grid h-full place-items-center">
                          <Gem className="h-16 w-16 pr-dim-icon" aria-hidden />
                        </span>
                      )}
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04100F]/85 via-transparent to-transparent" />
                      {heroVisual && (
                        <span className="absolute bottom-4 start-4 end-4 flex flex-col gap-1">
                          <span className="line-clamp-1 text-[15px] font-black text-white">{heroVisual.title}</span>
                          {heroVisual.subtitle && <span className="line-clamp-1 text-[11.5px] text-white/70">{heroVisual.subtitle}</span>}
                        </span>
                      )}
                    </Link>
                  </div>

                  {/* floating product chip — lights ramp on with GlowOnScroll */}
                  {heroProduct && (
                    <GlowOnScroll className="absolute -bottom-7 -start-3 z-10 md:-start-8" color="#2DD4BF" size={34}>
                      <Link href={`/products/${heroProduct.slug}`} className="pr-float-card flex items-center gap-3 rounded-2xl p-3 pe-5">
                        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl">
                          {heroProduct.mainImage ? (
                            <Image src={heroProduct.mainImage} alt={heroProduct.name} fill sizes="56px" className="object-contain p-1" />
                          ) : (
                            <Package className="h-6 w-6 pr-dim-icon" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[150px] truncate text-[12px] font-black">{heroProduct.name}</span>
                          <span className="mt-0.5 block text-[13px] font-black tabular-nums pr-acc">
                            {formatPrice(heroProduct.discountPrice ?? heroProduct.price)}
                            <span className="text-[9px] font-normal pr-mute"> تومان</span>
                          </span>
                        </span>
                        <span className="sfx-lamp ms-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl pr-lamp" aria-hidden>
                          <ShoppingCart className="h-4 w-4" />
                        </span>
                      </Link>
                    </GlowOnScroll>
                  )}
                </div>
              </FlipOnScroll>
            </div>
          </div>
        </section>

        {/* ═══ 2 · benefits strip ═══ */}
        <section aria-label="خدمات فروشگاه" className="mx-auto w-full max-w-7xl px-4 pb-10">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <li key={b.t}>
                <RevealOnScroll variant="zoom" delay={sfxStagger(i, 60)}>
                  <div className="pr-chip flex h-12 items-center justify-center gap-2.5 rounded-2xl px-4 text-[11.5px] font-black">
                    <b.icon className="h-4.5 w-4.5 shrink-0 pr-acc" aria-hidden />
                    {b.t}
                  </div>
                </RevealOnScroll>
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ 3 · slides rail «کالکشن‌های ویژه» ═══ */}
        {railSlides.length > 0 && (
          <section aria-labelledby="pr-rail" className="mx-auto w-full max-w-7xl px-4 pb-12">
            <RevealOnScroll>
              <PrHead id="pr-rail" kicker="COLLECTIONS" title="کالکشن‌های ویژه" icon={Gem} href="/products" />
            </RevealOnScroll>
            <div className="pr-rail">
              {railSlides.map((s, i) => (
                <RevealOnScroll key={s.id} variant="tilt" delay={sfxStagger(i, 90)} className="w-40 shrink-0 snap-start sm:w-44">
                  <Link
                    href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                    aria-label={s.title}
                    className="pr-card group relative block aspect-[3/4] overflow-hidden rounded-3xl"
                  >
                    <SlideArt slide={s} alt={s.title} fill sizes="176px" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" loading="lazy" />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04100F]/90 via-[#04100F]/20 to-transparent" />
                    <span className="absolute bottom-3 start-3 end-3 flex flex-col gap-1">
                      <span className="line-clamp-2 text-[12.5px] font-black leading-5 text-white">{s.title}</span>
                      {s.subtitle && <span className="line-clamp-1 text-[10px] text-white/65">{s.subtitle}</span>}
                      <span className="pr-rail-cta mt-1.5 inline-flex h-9 w-fit items-center gap-1 rounded-xl px-3.5 text-[10.5px] font-black text-white">
                        {s.ctaText ?? "مشاهده"}
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </span>
                  </Link>
                </RevealOnScroll>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 4 · STORIES ═══ */}
        {stories.length > 0 && (
          <section aria-label={`استوری‌های فروشگاه (${toFaDigits(counts.stories)} استوری)`} className="mx-auto w-full max-w-7xl px-4 pb-12">
            <RevealOnScroll>
              <PrHead kicker="STORIES" title={`استوری‌های امروز · ${toFaDigits(counts.stories)} قسمت`} icon={Sparkles} />
              <StoriesRow stories={stories} />
            </RevealOnScroll>
          </section>
        )}

        {/* ═══ 5 · CATEGORIES — image-led tiles ═══ */}
        {data.categories.length > 0 && (
          <section aria-labelledby="pr-cats" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-cats" kicker="CATEGORIES" title="خرید بر اساس دسته‌بندی" icon={LayoutGrid} href="/products" />
            </RevealOnScroll>
            <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {data.categories.slice(0, 12).map((c, i) => {
                const Icon = CAT_ICONS[c.slug] ?? Boxes;
                return (
                  <li key={c.id}>
                    <RevealOnScroll variant="tilt" delay={sfxStagger(i, 60, 10)}>
                      <Link href={`/products?category=${c.slug}`} className="pr-card group relative block aspect-[4/5] overflow-hidden rounded-3xl">
                        {c.image ? (
                          <Image src={c.image} alt={`تصویر ${c.name}`} fill sizes="(max-width: 640px) 46vw, 16vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.08]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center pr-cat-void">
                            <Icon className="h-9 w-9 pr-acc" aria-hidden />
                          </span>
                        )}
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04100F]/92 via-[#04100F]/25 to-transparent" />
                        <span className="absolute bottom-3 start-3 end-3 text-center">
                          <span className="block truncate text-[12.5px] font-black text-white">{c.name}</span>
                          <span className="mt-0.5 block text-[9.5px] font-bold tabular-nums text-white/60">{toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا</span>
                        </span>
                      </Link>
                    </RevealOnScroll>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ═══ 6 · DEALS — the lights-on band ═══ */}
        {deals.length > 0 && (
          <section aria-labelledby="pr-deals" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-deals" kicker="FLASH DEALS" title="پیشنهادهای ویژهٔ امروز" icon={Flame} href="/products?discount=1" hot action={<PrCountdown endsAt={dealTimer} />} />
            </RevealOnScroll>
            <GlowOnScroll color="#2DD4BF" size={56}>
              <div className="pr-deal-band grid grid-cols-2 gap-3.5 rounded-[2rem] p-4 sm:grid-cols-3 md:p-6 lg:grid-cols-4 xl:grid-cols-5">
                {deals.map((p, i) => (
                  <RevealOnScroll key={p.id} variant="tilt" delay={sfxStagger(i, 55)}>
                    <PremiumCard product={p} />
                  </RevealOnScroll>
                ))}
              </div>
            </GlowOnScroll>
          </section>
        )}

        {/* ═══ 7 · FEATURED grid ═══ */}
        {featured.length > 0 && (
          <section aria-labelledby="pr-featured" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-featured" kicker="FOR YOU" title="منتخب فروشگاه" icon={Gem} href="/products?sort=rating" />
            </RevealOnScroll>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((p, i) => (
                <RevealOnScroll key={p.id} variant="tilt" delay={sfxStagger(i, 60)}>
                  <PremiumCard product={p} />
                </RevealOnScroll>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 8 · BESTSELLERS — numbered ledger ═══ */}
        {bestsellers.length > 0 && (
          <section aria-labelledby="pr-best" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-best" kicker="TOP CHART" title="پرفروش‌های این هفته" icon={TrendingUp} href="/products?sort=bestseller" />
            </RevealOnScroll>
            <RevealOnScroll variant="zoom">
              <div className="pr-card flex flex-col divide-y pr-divide rounded-3xl">
                {bestsellers.map((p, i) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group flex items-center gap-3.5 p-3.5 md:gap-4 md:p-4">
                    <span className="pr-rank w-8 shrink-0 text-center text-lg font-black tabular-nums md:text-xl" aria-hidden>
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                    <span className="pr-thumb relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl md:h-16 md:w-16">
                      {p.mainImage ? (
                        <Image src={p.mainImage} alt={p.name} fill sizes="64px" className="object-contain p-1.5" loading="lazy" />
                      ) : (
                        <Package className="h-6 w-6 pr-dim-icon" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold group-hover:pr-acc">{p.name}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold pr-mute tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                        {p.rating > 0 ? toFaDigits(p.rating.toLocaleString("fa-IR")) : "جدید"}
                        <span className="pr-dotsep" aria-hidden>·</span>
                        {p.soldCount.toLocaleString("fa-IR")} فروش
                      </span>
                    </span>
                    <span className="shrink-0 text-[13.5px] font-black tabular-nums pr-acc">{formatPrice(p.effectivePrice)}</span>
                  </Link>
                ))}
              </div>
            </RevealOnScroll>
          </section>
        )}

        {/* ═══ 9 · EXCLUSIVE — pages turning in the vault ═══ */}
        {exclusive.length > 0 && (
          <section aria-labelledby="pr-vip" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-vip" kicker="EXCLUSIVE" title="گاوصندوق انحصاری" icon={Gem} />
            </RevealOnScroll>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exclusive.map((p, i) => (
                <FlipOnScroll key={p.id} degrees={58} origin={i % 2 === 0 ? "start" : "end"} delay={sfxStagger(i, 130, 3)}>
                  <article className="pr-vip group flex flex-col overflow-hidden rounded-[1.75rem]">
                    <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[5/4]">
                      {p.mainImage ? (
                        <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw" className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.06]" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center"><Gem className="h-12 w-12 pr-dim-icon" aria-hidden /></span>
                      )}
                      <span className="pr-vip-chip absolute start-3 top-3 rounded-xl px-2.5 py-1 text-[9.5px] font-black tracking-[0.12em] text-white">انحصاری</span>
                    </Link>
                    <div className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${p.slug}`} className="line-clamp-1 text-[13.5px] font-black">{p.name}</Link>
                        <p className="mt-1 text-[14px] font-black tabular-nums pr-acc">
                          {formatPrice(p.effectivePrice)}
                          <span className="text-[9.5px] font-normal pr-mute"> تومان</span>
                        </p>
                      </div>
                      <Link href={`/products/${p.slug}`} className="pr-buy flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-5 text-[11.5px] font-black text-white">
                        مشاهده
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </FlipOnScroll>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 10 · NEWEST grid ═══ */}
        {newest.length > 0 && (
          <section aria-labelledby="pr-new" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead id="pr-new" kicker="JUST LANDED" title="تازه رسیدها" icon={Rocket} href="/products?sort=newest" />
            </RevealOnScroll>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {newest.map((p, i) => (
                <RevealOnScroll key={p.id} variant="tilt" delay={sfxStagger(i, 60)}>
                  <PremiumCard product={p} />
                </RevealOnScroll>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 11 · SHOWCASES — parallax band + duo ═══ */}
        {showcases.length > 0 && (
          <section aria-label="بنرهای ویژهٔ فروشگاه" className="pb-14">
            {/* full-bleed parallax feature */}
            {showcases[0] && (
              <div className="relative h-[380px] overflow-hidden md:h-[460px]">
                <ParallaxBand className="absolute inset-x-0 -top-[18%] h-[136%]" speed={0.2} range={120}>
                  <Image src={showcases[0].image} alt={showcases[0].title} fill sizes="100vw" className="object-cover" loading="lazy" />
                </ParallaxBand>
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04100F]/95 via-[#04100F]/45 to-[#04100F]/15" />
                <RevealOnScroll variant="zoom" className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center">
                  <h3 className="max-w-2xl text-2xl font-black leading-[1.3] text-white md:text-4xl">{showcases[0].title}</h3>
                  {showcases[0].subtitle && (
                    <p className="mt-3 max-w-xl text-[13px] leading-8 text-white/70">{showcases[0].subtitle}</p>
                  )}
                  <Link
                    href={showcases[0].buttonUrl ?? (showcases[0].product ? `/products/${showcases[0].product.slug}` : "/products")}
                    className="pr-btn mt-7 flex h-12 items-center gap-2 rounded-2xl px-8 text-[13px] font-black text-white"
                  >
                    {showcases[0].product ? "مشاهدهٔ کالا" : "مشاهدهٔ مجموعه"}
                    <ChevronLeft className="h-4.5 w-4.5" aria-hidden />
                  </Link>
                </RevealOnScroll>
              </div>
            )}
            {/* duo cards */}
            {showcases.length > 1 && (
              <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2">
                {showcases.slice(1, 3).map((sc, i) => (
                  <RevealOnScroll key={sc.id} variant={i === 0 ? "start" : "end"}>
                    <Link
                      href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                      className="pr-card group relative block overflow-hidden rounded-3xl"
                      aria-label={sc.title}
                    >
                      <span className="relative block aspect-[16/7]">
                        <Image src={sc.image} alt={sc.title} fill sizes="(max-width: 640px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#04100F]/90 via-[#04100F]/30 to-transparent" />
                      </span>
                      <span className="absolute inset-y-0 end-0 flex w-full max-w-[62%] flex-col justify-center gap-1.5 p-5">
                        <span className="line-clamp-1 text-[15px] font-black text-white">{sc.title}</span>
                        {sc.subtitle && <span className="line-clamp-2 text-[11px] leading-5 text-white/65">{sc.subtitle}</span>}
                        <span className="pr-rail-cta mt-1.5 inline-flex h-10 w-fit items-center gap-1.5 rounded-xl px-4 text-[11px] font-black text-white">
                          برو ببینیم
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  </RevealOnScroll>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══ 12 · BRANDS ═══ */}
        {(data.brands ?? []).length > 0 && (
          <section aria-label="برندهای موجود" className="mx-auto w-full max-w-7xl px-4 pb-14">
            <RevealOnScroll>
              <PrHead kicker="BRANDS" title="برندهای موجود در فروشگاه" icon={BadgeCheck} href="/products" />
              <ul className="flex flex-wrap gap-2.5">
                {(data.brands ?? []).map((b, i) => (
                  <li key={b.id}>
                    <RevealOnScroll variant="fade" delay={sfxStagger(i, 45, 12)}>
                      <Link href={`/products?brand=${b.slug}`} className="pr-chip flex h-11 items-center gap-2 rounded-full px-4.5 text-[12px] font-bold">
                        {b.logo ? (
                          <Image src={b.logo} alt={b.name} width={18} height={18} className="h-4.5 w-4.5 rounded-full object-contain" />
                        ) : (
                          <span aria-hidden className="h-2 w-2 rounded-full pr-acc-dot" />
                        )}
                        {b.name}
                      </Link>
                    </RevealOnScroll>
                  </li>
                ))}
              </ul>
            </RevealOnScroll>
          </section>
        )}

        {/* ═══ 13 · FAQ ═══ */}
        {(data.faq ?? []).length > 0 && (
          <section aria-labelledby="pr-faq" className="mx-auto w-full max-w-7xl px-4 pb-16">
            <RevealOnScroll>
              <PrHead id="pr-faq" kicker="HELP" title="سؤال دارید؟" icon={HelpCircle} />
              <div className="flex flex-col gap-2.5">
                {(data.faq ?? []).map((f, i) => (
                  <RevealOnScroll key={i} variant="fade" delay={sfxStagger(i, 50, 6)}>
                    <details className="pr-card group rounded-2xl p-4">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-[13px] font-bold">
                        <span className="pr-faq-n grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[11px] font-black tabular-nums">
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        {f.h}
                        <ChevronLeft className="ms-auto h-4.5 w-4.5 shrink-0 pr-mute transition-transform group-open:-rotate-90" aria-hidden />
                      </summary>
                      <p className="mt-3 border-t pr-divide pt-3 text-[12px] leading-7 pr-mute">{f.p}</p>
                    </details>
                  </RevealOnScroll>
                ))}
              </div>
            </RevealOnScroll>
          </section>
        )}

        {/* ═══ empty state ═══ */}
        {!hasAnyProduct && (
          <section className="mx-auto max-w-7xl px-4 py-20 text-center">
            <Gem className="mx-auto mb-5 h-14 w-14 pr-acc-soft" aria-hidden />
            <h2 className="text-lg font-black">قفسه‌ها هنوز در حال چیده‌شدن هستند</h2>
            <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-7 pr-mute">
              به‌زودی محصولات نمایشگاه پر می‌شوند؛ از{" "}
              <Link href="/products" className="font-black pr-acc">آرشیو محصولات</Link>{" "}
              بازدید کنید.
            </p>
          </section>
        )}
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS + shared scroll-fx system (single plain <style>) ═══ */}
      <style>{PREMIUM_CSS + SCROLL_FX_CSS}</style>
    </div>
  );
}

/* ═══════════════════════ scoped CSS ═══════════════════════
 * Token-driven (CSS vars on [data-tpl]) so the light-mode skin is one
 * small var block. Prefix pr- (premium responsive).                  */
const PREMIUM_CSS = `
[data-tpl="mobile-first-pwa"]{
  --pr-bg:#071314; --pr-surface:#0D1D1F; --pr-surface2:#122527; --pr-deep:#0A1719;
  --pr-ink:#E8F5F3; --pr-mute:#92B2B2; --pr-acc:#2DD4BF; --pr-acc-text:#34D399;
  --pr-line:rgba(148,199,196,.13); --pr-line2:rgba(148,199,196,.2);
  --pr-em:#10B981; --pr-rose:#FB7185; --pr-gold:#F5C46B;
  background-color:var(--pr-bg);
  color:var(--pr-ink);
}
[data-tpl="mobile-first-pwa"] ::selection{background:rgba(45,212,191,.32);color:#E8F5F3}
[data-tpl="mobile-first-pwa"] a:focus-visible,[data-tpl="mobile-first-pwa"] button:focus-visible,[data-tpl="mobile-first-pwa"] summary:focus-visible{outline:2px solid var(--pr-acc);outline-offset:3px}

/* headline gradient */
[data-tpl="mobile-first-pwa"] .pr-acc{color:var(--pr-acc)}
[data-tpl="mobile-first-pwa"] .pr-acc-soft{color:rgba(45,212,191,.75)}
[data-tpl="mobile-first-pwa"] .pr-acc-dot{background:var(--pr-acc)}
[data-tpl="mobile-first-pwa"] .pr-mute{color:var(--pr-mute)}
[data-tpl="mobile-first-pwa"] .pr-dim-icon{color:rgba(148,199,196,.4)}
[data-tpl="mobile-first-pwa"] .pr-dotsep{color:var(--pr-line2)}

/* ambient wash + parallax ribbons */
[data-tpl="mobile-first-pwa"] .pr-aurora{
  position:absolute; inset-inline:0; top:0; height:640px; pointer-events:none; z-index:0;
  background:
    radial-gradient(560px 300px at 78% 12%, rgba(16,185,129,.16), transparent 70%),
    radial-gradient(480px 280px at 18% 28%, rgba(45,212,191,.12), transparent 70%);
  filter:blur(28px);
}
[data-tpl="mobile-first-pwa"] .pr-ribbon{position:absolute; z-index:0; pointer-events:none; border-radius:999px; filter:blur(2px)}
[data-tpl="mobile-first-pwa"] .pr-ribbon-a{
  top:-12%; height:118%; width:min(15vw,150px); inset-inline-start:6%;
  background:linear-gradient(180deg, rgba(45,212,191,0) 0%, rgba(45,212,191,.14) 28%, rgba(16,185,129,.2) 55%, rgba(45,212,191,.05) 82%, rgba(45,212,191,0) 100%);
}
[data-tpl="mobile-first-pwa"] .pr-ribbon-b{
  top:-8%; height:112%; width:min(9vw,90px); inset-inline-end:10%;
  background:linear-gradient(180deg, rgba(16,185,129,0) 0%, rgba(16,185,129,.16) 40%, rgba(45,212,191,.1) 70%, rgba(16,185,129,0) 100%);
  filter:blur(6px); opacity:.8;
}

/* hero atoms */
[data-tpl="mobile-first-pwa"] .pr-eyebrow{
  border:1px solid rgba(45,212,191,.35);
  background:linear-gradient(90deg, rgba(16,185,129,.14), rgba(45,212,191,.08));
  color:var(--pr-acc);
}
[data-tpl="mobile-first-pwa"] .pr-stat{border:1px solid var(--pr-line); background:rgba(45,212,191,.04)}
[data-tpl="mobile-first-pwa"] .pr-showcase{margin-bottom:2rem}
[data-tpl="mobile-first-pwa"] .pr-ring{
  position:absolute; inset:-9% -7%; z-index:-1; border-radius:2.6rem;
  background:conic-gradient(from 120deg, rgba(45,212,191,.5), rgba(16,185,129,.08), rgba(45,212,191,.35), rgba(16,185,129,.05), rgba(45,212,191,.5));
  -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  mask:radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  animation:pr-spin 26s linear infinite;
}
@keyframes pr-spin{to{transform:rotate(1turn)}}
[data-tpl="mobile-first-pwa"] .pr-hero-card{
  border:1px solid rgba(45,212,191,.3);
  background:var(--pr-surface);
  box-shadow:0 42px 110px -48px rgba(16,185,129,.5), inset 0 1px 0 rgba(255,255,255,.04);
}
[data-tpl="mobile-first-pwa"] .pr-float-card{
  border:1px solid rgba(45,212,191,.4);
  background:linear-gradient(140deg, rgba(18,37,39,.96), rgba(10,23,25,.92));
  backdrop-filter:blur(14px);
  box-shadow:0 22px 60px -26px rgba(16,185,129,.55);
}
[data-tpl="mobile-first-pwa"] .pr-lamp{
  background:linear-gradient(135deg, var(--pr-em), var(--pr-acc));
  color:#fff;
  box-shadow:0 0 16px rgba(45,212,191,.55);
}

/* buttons */
[data-tpl="mobile-first-pwa"] .pr-btn{
  background-image:linear-gradient(100deg, var(--pr-em), var(--pr-acc));
  background-size:170% 100%;
  box-shadow:0 14px 34px -14px rgba(16,185,129,.65);
  transition:background-position .5s ease, box-shadow .3s ease, transform .2s ease;
}
[data-tpl="mobile-first-pwa"] .pr-btn:hover{background-position:90% 0; box-shadow:0 18px 44px -14px rgba(45,212,191,.7)}
[data-tpl="mobile-first-pwa"] .pr-btn-ghost{
  border:1px solid rgba(45,212,191,.4);
  background:rgba(45,212,191,.06);
  color:var(--pr-ink);
  transition:background-color .3s ease, border-color .3s ease;
}
[data-tpl="mobile-first-pwa"] .pr-btn-ghost:hover{background:rgba(45,212,191,.14); border-color:rgba(45,212,191,.6)}
[data-tpl="mobile-first-pwa"] .pr-kick-hot-icon{color:var(--pr-rose)}

/* section heads */
[data-tpl="mobile-first-pwa"] .pr-kicker{
  background:linear-gradient(135deg, var(--pr-em), var(--pr-acc));
  color:#fff;
  box-shadow:0 10px 26px -10px rgba(16,185,129,.7);
}
[data-tpl="mobile-first-pwa"] .pr-kicker-hot{background:linear-gradient(135deg, #F43F5E, #FB7185); box-shadow:0 10px 26px -10px rgba(244,63,94,.6)}
[data-tpl="mobile-first-pwa"] .pr-kick{color:rgba(45,212,191,.8)}
[data-tpl="mobile-first-pwa"] .pr-kick-hot{color:var(--pr-rose)}
[data-tpl="mobile-first-pwa"] .pr-more{border:1px solid var(--pr-line2); color:var(--pr-ink); background:rgba(45,212,191,.04); transition:background-color .25s ease, border-color .25s ease}
[data-tpl="mobile-first-pwa"] .pr-more:hover{background:rgba(45,212,191,.12); border-color:rgba(45,212,191,.5)}
[data-tpl="mobile-first-pwa"] .pr-timer{border:1px solid rgba(244,63,94,.4); background:rgba(244,63,94,.1); color:#FDA4AF}
[data-tpl="mobile-first-pwa"] .pr-faq-n{background:rgba(45,212,191,.12); color:var(--pr-acc)}

/* surfaces */
[data-tpl="mobile-first-pwa"] .pr-card{
  border:1px solid var(--pr-line);
  background:var(--pr-surface);
  transition:border-color .3s ease, transform .3s ease, box-shadow .3s ease;
}
[data-tpl="mobile-first-pwa"] .pr-card:hover{border-color:rgba(45,212,191,.45); transform:translateY(-3px); box-shadow:0 18px 44px -22px rgba(16,185,129,.5)}
[data-tpl="mobile-first-pwa"] .pr-chip{border:1px solid var(--pr-line); background:rgba(45,212,191,.05); backdrop-filter:blur(8px); transition:background-color .25s ease, border-color .25s ease}
[data-tpl="mobile-first-pwa"] .pr-chip:hover{background:rgba(45,212,191,.12); border-color:rgba(45,212,191,.5)}
[data-tpl="mobile-first-pwa"] .pr-divide{border-color:var(--pr-line)}
[data-tpl="mobile-first-pwa"] .pr-thumb{background:var(--pr-deep); border:1px solid var(--pr-line)}
[data-tpl="mobile-first-pwa"] .pr-rank{color:rgba(45,212,191,.55)}
[data-tpl="mobile-first-pwa"] .pr-stock-out{background:#334155; color:#CBD5E1}
[data-tpl="mobile-first-pwa"] .pr-off{background:linear-gradient(90deg, #F43F5E, #FB7185); box-shadow:0 6px 16px -6px rgba(244,63,94,.7)}
[data-tpl="mobile-first-pwa"] .pr-cat-void{background:radial-gradient(120px 120px at 50% 40%, rgba(45,212,191,.14), var(--pr-surface))}
[data-tpl="mobile-first-pwa"] .pr-buy{
  background-image:linear-gradient(100deg, var(--pr-em), var(--pr-acc));
  background-size:170% 100%;
  box-shadow:0 12px 28px -12px rgba(16,185,129,.7);
  transition:background-position .45s ease, box-shadow .3s ease;
}
[data-tpl="mobile-first-pwa"] .pr-buy:hover{background-position:90% 0}
[data-tpl="mobile-first-pwa"] .pr-rail-cta{background-image:linear-gradient(100deg, var(--pr-em), var(--pr-acc)); box-shadow:0 10px 24px -12px rgba(16,185,129,.8)}

/* deals band (GlowOnScroll target) */
[data-tpl="mobile-first-pwa"] .pr-deal-band{
  border:1px solid rgba(45,212,191,.28);
  background:
    radial-gradient(640px 220px at 85% -10%, rgba(16,185,129,.14), transparent 70%),
    linear-gradient(180deg, rgba(18,37,39,.9), rgba(13,29,31,.75));
}

/* vip flip cards */
[data-tpl="mobile-first-pwa"] .pr-vip{
  border:1px solid rgba(45,212,191,.3);
  background:linear-gradient(165deg, rgba(18,37,39,.96), rgba(10,23,25,.94));
  box-shadow:0 26px 70px -34px rgba(16,185,129,.45);
}
[data-tpl="mobile-first-pwa"] .pr-vip-chip{background:linear-gradient(90deg, #059669, #14B8A6)}

/* slides rail */
[data-tpl="mobile-first-pwa"] .pr-rail{
  display:flex; gap:14px;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none; -ms-overflow-style:none;
  padding-block:4px;
}
[data-tpl="mobile-first-pwa"] .pr-rail::-webkit-scrollbar{display:none}

/* group-hover on bestseller name */
[data-tpl="mobile-first-pwa"] .group:hover .group-hover\:pr-acc{color:var(--pr-acc)}

@media (prefers-reduced-motion: reduce){
  [data-tpl="mobile-first-pwa"] .pr-ring{animation:none !important}
}

/* ── retune the H6 chrome header onto the teal canvas (dark mode) ── */
[data-tpl="mobile-first-pwa"] [data-chrome-header]{
  --background:#E8F5F3;
  --foreground:#E8F5F3;
  --card:#0D1D1F;
  --card-foreground:#E8F5F3;
  --muted:#122527;
  --muted-foreground:#92B2B2;
  --border:rgba(148,199,196,.16);
  --input:rgba(148,199,196,.16);
  --primary:#10B981;
  --primary-foreground:#FFFFFF;
  --popover:#0D1D1F;
  --popover-foreground:#E8F5F3;
  --accent:#122527;
  --accent-foreground:#E8F5F3;
  background-color:#0A1719 !important;
  color:#E8F5F3;
}
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-100 { background-color: rgba(45,212,191,.13) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-200:hover { background-color: rgba(45,212,191,.22) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/15 { background-color: rgba(45,212,191,.14) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/25 { background-color: rgba(45,212,191,.24) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-600 { background-color: #10B981 !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-700:hover { background-color: #059669 !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500 { background-color: #2DD4BF !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-700 { color: #99F6E4 !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-600 { color: #2DD4BF !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-400 { color: #2DD4BF !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-300 { color: #5EEAD4 !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .border-violet-300 { border-color: rgba(45,212,191,.45) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .border-violet-400\\/40 { border-color: rgba(45,212,191,.4) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .from-violet-500 { --tw-gradient-from: #10B981 !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .to-violet-700 { --tw-gradient-to: #059669 !important; }

/* ═══ LIGHT-MODE SKIN (v26fix convention · additive — one var block + header retune) ═══ */
html:not(.dark) [data-tpl="mobile-first-pwa"]{
  --pr-bg:#F0F6F5; --pr-surface:#FFFFFF; --pr-surface2:#E9F2F1; --pr-deep:#F6FAF9;
  --pr-ink:#0E2B29; --pr-mute:#537371; --pr-acc:#0F766E; --pr-acc-text:#0D9488;
  --pr-line:rgba(14,43,41,.12); --pr-line2:rgba(14,43,41,.18);
  --pr-em:#0D9488; --pr-rose:#E11D48; --pr-gold:#B07318;
  background-color:#F0F6F5;
  color:#0E2B29;
}
html:not(.dark) [data-tpl="mobile-first-pwa"] ::selection{background:rgba(13,148,136,.25);color:#0E2B29}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-acc-soft{color:#0F766E}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-dim-icon{color:#7FA5A2}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-aurora{
  background:
    radial-gradient(560px 300px at 78% 12%, rgba(13,148,136,.12), transparent 70%),
    radial-gradient(480px 280px at 18% 28%, rgba(45,212,191,.14), transparent 70%);
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-ribbon-a{background:linear-gradient(180deg, rgba(13,148,136,0) 0%, rgba(13,148,136,.12) 30%, rgba(45,212,191,.2) 55%, rgba(13,148,136,.05) 82%, rgba(13,148,136,0) 100%)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-ribbon-b{background:linear-gradient(180deg, rgba(45,212,191,0) 0%, rgba(45,212,191,.18) 40%, rgba(13,148,136,.1) 70%, rgba(45,212,191,0) 100%)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-eyebrow{border-color:rgba(13,148,136,.4); background:linear-gradient(90deg, rgba(13,148,136,.1), rgba(45,212,191,.1)); color:#0F766E}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-stat{background:#FFFFFF; border-color:rgba(14,43,41,.1)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-hero-card{border-color:rgba(13,148,136,.3); background:#FFFFFF; box-shadow:0 36px 90px -44px rgba(13,148,136,.35)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-ring{opacity:.5}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-float-card{border-color:rgba(13,148,136,.4); background:linear-gradient(140deg, rgba(255,255,255,.97), rgba(233,242,241,.94)); box-shadow:0 22px 60px -26px rgba(13,148,136,.4)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-lamp{box-shadow:0 0 14px rgba(13,148,136,.4)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-btn{background-image:linear-gradient(100deg,#0D9488,#14B8A6); box-shadow:0 14px 34px -16px rgba(13,148,136,.5)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-btn-ghost{border-color:rgba(13,148,136,.45); background:rgba(13,148,136,.05); color:#0E2B29}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-btn-ghost:hover{background:rgba(13,148,136,.12)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-kick{color:#0F766E}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-kick-hot{color:#E11D48}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-timer{border-color:rgba(225,29,72,.35); background:rgba(225,29,72,.06); color:#BE123C}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-faq-n{background:rgba(13,148,136,.1); color:#0F766E}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-card{background:#FFFFFF}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-card:hover{border-color:rgba(13,148,136,.45); box-shadow:0 18px 44px -24px rgba(13,148,136,.3)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-chip{border-color:rgba(14,43,41,.12); background:rgba(255,255,255,.8)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-chip:hover{background:rgba(13,148,136,.08)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-thumb{background:#F6FAF9}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-rank{color:rgba(15,118,110,.6)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-buy{background-image:linear-gradient(100deg,#0D9488,#14B8A6); box-shadow:0 12px 28px -14px rgba(13,148,136,.55)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-rail-cta{background-image:linear-gradient(100deg,#0D9488,#14B8A6)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-off{background:linear-gradient(90deg,#E11D48,#F43F5E)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-stock-out{background:#E2E8F0; color:#475569}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-cat-void{background:radial-gradient(120px 120px at 50% 40%, rgba(45,212,191,.25), #FFFFFF)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-deal-band{
  border-color:rgba(13,148,136,.3);
  background:
    radial-gradient(640px 220px at 85% -10%, rgba(13,148,136,.1), transparent 70%),
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(233,242,241,.8));
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-vip{border-color:rgba(13,148,136,.32); background:linear-gradient(165deg, #FFFFFF, rgba(233,242,241,.95)); box-shadow:0 26px 70px -36px rgba(13,148,136,.35)}
html:not(.dark) [data-tpl="mobile-first-pwa"] .pr-vip-chip{background:linear-gradient(90deg,#0F766E,#0D9488)}
/* dark hero image veils stay (they sit ON photos) */

/* chrome header → light teal */
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header]{
  --background:#F0F6F5;
  --foreground:#0E2B29;
  --card:#FFFFFF;
  --card-foreground:#0E2B29;
  --muted:#E9F2F1;
  --muted-foreground:#537371;
  --border:rgba(14,43,41,.12);
  --input:rgba(14,43,41,.14);
  --primary:#0D9488;
  --primary-foreground:#FFFFFF;
  --popover:#FFFFFF;
  --popover-foreground:#0E2B29;
  --accent:#E9F2F1;
  --accent-foreground:#0E2B29;
  background-color:#F0F6F5 !important;
  color:#0E2B29;
}
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-100 { background-color: rgba(13,148,136,.1) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-200:hover { background-color: rgba(13,148,136,.18) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/15 { background-color: rgba(13,148,136,.1) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/25 { background-color: rgba(13,148,136,.2) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-600 { background-color: #0D9488 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-700:hover { background-color: #0F766E !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500 { background-color: #14B8A6 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-700 { color: #0F766E !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-600 { color: #0D9488 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-400 { color: #0D9488 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-300 { color: #0F766E !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .border-violet-300 { border-color: rgba(13,148,136,.45) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .border-violet-400\\/40 { border-color: rgba(13,148,136,.4) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .from-violet-500 { --tw-gradient-from: #0D9488 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .to-violet-700 { --tw-gradient-to: #0F766E !important; }
`;

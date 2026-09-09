"use client";

/**
 * TEMPLATE · startup-light — «استارتاپی گرا‌دینت» (v25 · gradient light rewrite)
 * --------------------------------------------------------------------------
 * A clean light startup surface (#F8FAFC canvas, white rounded-[2rem]
 * cards) with SOFT BLURRED COLOR BUBBLES — violet #8B5CF6, cyan #22D3EE,
 * amber #FBBF24 — drifting behind the content.
 *
 * Signature pieces:
 *  - gradient-text headline (violet→cyan) + soft-bubble hero
 *  - FLOATING PRODUCT COLLAGE around the hero slide card
 *  - benefits row (4 tinted icon circles)
 *  - airy product grids, exclusive float rail, pill stats
 *
 * The whole family (chrome included) is forced onto the light palette
 * via CSS var overrides in the scoped <style> so the design stays bright
 * in both site modes. No registered features.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package, Check, ChevronLeft, Star, Flame, ShoppingCart, BadgeCheck,
  TrendingUp, HelpCircle, Sparkles, Smartphone, Laptop, Computer, Cpu,
  Monitor, Gamepad2, Watch, HardDrive, Keyboard, Mouse, Camera, Speaker,
  Wifi, BatteryCharging, Projector, Headphones, LayoutGrid, Search, Gem,
  ShieldCheck, Truck, CreditCard, Headset, Rocket, ArrowLeft, Megaphone,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideCountdown, SlideHeroMedia, SLIDE_MEDIA_CSS } from "./slide-media";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* category slug → lucide icon */
const CAT_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone, laptop: Laptop, "desktop-pc": Computer, "pc-parts": Cpu,
  monitor: Monitor, console: Gamepad2, accessories: Headphones, powerbank: BatteryCharging,
  charger: Sparkles, headphones: Headphones, earbuds: Sparkles, "smart-watch": Watch,
  "smart-gadgets": Watch, projector: Projector, network: Wifi, storage: HardDrive,
  keyboard: Keyboard, mouse: Mouse, webcam: Camera, speaker: Speaker,
};

/* ── soft section heading ─────────────────────────────────────────── */
function SoftHead({
  kicker, title, href, icon: Icon = Sparkles,
}: { kicker: string; title: string; href?: string; icon?: React.ElementType }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11.5px] font-black text-violet-600">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          {kicker}
        </p>
        <h2 className="mt-2 text-xl font-black leading-9 text-slate-900 md:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[11.5px] font-bold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:shadow">
          مشاهدهٔ همه
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── airy product card (big rounded, soft shadow) ─────────────────── */
function AiryCard({ product, tint }: { product: TemplateProduct; tint?: "violet" | "cyan" | "amber" }) {
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
        "sl-card group flex flex-col rounded-[1.75rem] border border-slate-200/70 bg-white p-3.5",
        !product.inStock && "opacity-60 grayscale-[0.3]"
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-[1.375rem] bg-slate-50">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-slate-300">
            <Package className="h-11 w-11" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className={cn(
            "absolute start-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black text-white tabular-nums",
            tint === "amber" ? "bg-amber-400 text-amber-950" : "sl-gradient-btn"
          )}>
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {!product.inStock && (
          <span className="absolute end-2.5 top-2.5 rounded-full bg-slate-500 px-2.5 py-1 text-[9.5px] font-bold text-white">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 px-1.5 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10.5px] font-bold text-slate-400">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-11 text-[13px] font-bold leading-[20px] text-slate-800 transition-colors hover:text-violet-600">
          {product.name}
        </Link>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {product.rating > 0 ? (
            <span className="flex items-center gap-1 text-[10.5px] text-slate-400 tabular-nums">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {toFaDigits(product.rating.toLocaleString("fa-IR"))}
            </span>
          ) : (
            <span className="text-[10.5px] text-slate-300">جدید</span>
          )}
          <span className={cn("h-2 w-2 rounded-full", product.inStock ? "bg-emerald-400" : "bg-slate-300")} aria-hidden />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <p className="min-w-0">
            {product.discountPercent > 0 && (
              <span className="block text-[11px] leading-4 text-slate-400 price-old tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className={cn("text-[15px] font-black text-slate-900 tabular-nums", product.discountPercent > 0 && "text-violet-700")}>
              {formatPrice(product.effectivePrice)}
              <span className="text-[10px] font-normal text-slate-400"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "sl-gradient-btn grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition-all active:scale-90",
              !product.inStock && "cursor-not-allowed opacity-40"
            )}
          >
            {added ? <Check className="h-5 w-5" aria-hidden /> : <ShoppingCart className="h-4.5 w-4.5" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ═════════════════════ TEMPLATE ═════════════════════ */
export function StartupLightTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["startup-light"];

  const stories = useMemo<StoryItem[]>(() =>
    (data.stories ?? []).map((s) => ({
      id: s.id, title: s.title, image: s.image, videoUrl: s.videoUrl,
      duration: s.duration, linkUrl: s.linkUrl, badge: s.badge,
      product: s.product, category: s.category,
    })), [data.stories]);

  const slides = data.slides ?? [];
  const heroSlide = slides[0] ?? null;
  const collagePool = useMemo(() => {
    const seen = new Set<string>();
    const out: TemplateProduct[] = [];
    for (const p of [...(data.featured ?? []), ...(data.bestsellers ?? [])]) {
      if (seen.has(p.id) || !p.mainImage) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out.slice(0, 3);
  }, [data.featured, data.bestsellers]);

  const featured = (data.featured ?? []).slice(0, 8);
  const discounted = (data.discounted ?? []).slice(0, 8);
  const bestsellers = (data.bestsellers ?? []).slice(0, 6);
  const newest = (data.newest ?? []).slice(0, 8);
  const exclusive = (data.exclusive ?? []).slice(0, 8);
  const hasAnyProduct =
    featured.length > 0 || discounted.length > 0 || bestsellers.length > 0 ||
    newest.length > 0 || exclusive.length > 0;

  const benefits = [
    { icon: Truck, title: "ارسال سریع", text: "به سراسر ایران", tint: "violet" },
    { icon: ShieldCheck, title: "ضمانت اصالت", text: "اورجینال و فاکتوردار", tint: "cyan" },
    { icon: CreditCard, title: "پرداخت امن", text: "درگاه معتبر بانکی", tint: "amber" },
    { icon: Headset, title: "پشتیبانی ۲۴/۷", text: "همیشه در دسترس", tint: "violet" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="startup-light" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      <div className="sl-shell relative w-full">
        {/* drifting color bubbles */}
        <span aria-hidden className="sl-bubble" style={{ background: "#8B5CF6", width: 420, height: 420, top: -120, insetInlineEnd: "8%" }} />
        <span aria-hidden className="sl-bubble" style={{ background: "#22D3EE", width: 360, height: 360, top: 420, insetInlineStart: "4%", animationDelay: "-6s" }} />
        <span aria-hidden className="sl-bubble" style={{ background: "#FBBF24", width: 300, height: 300, top: 1050, insetInlineEnd: "12%", animationDelay: "-11s", opacity: 0.22 }} />

        {/* ═══ 1 · announcement (this template's chrome has no ticker) ═══ */}
        {store.announcementActive && store.announcement && (
          <section className="relative px-4 pt-6" aria-label="اطلاعیه فروشگاه">
            <div className="sl-announce mx-auto flex max-w-7xl items-center gap-3 rounded-full border border-violet-200/70 bg-white/80 px-5 py-3 backdrop-blur">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-l from-violet-500 to-cyan-400 text-white">
                <Megaphone className="h-4.5 w-4.5" aria-hidden />
              </span>
              {store.announcementLink ? (
                <Link href={store.announcementLink} className="min-w-0 truncate text-[12.5px] font-bold text-slate-700 hover:text-violet-600">
                  {store.announcement}
                </Link>
              ) : (
                <p className="min-w-0 truncate text-[12.5px] font-bold text-slate-700">{store.announcement}</p>
              )}
              <Sparkles className="ms-auto h-4 w-4 shrink-0 text-violet-300" aria-hidden />
            </div>
          </section>
        )}

        {/* ═══ 2 · HERO — gradient headline + floating collage ═══ */}
        <section className="relative px-4 pb-12 pt-8 md:pt-12" aria-labelledby="sl-hero">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_.92fr]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-center lg:text-start"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-[11.5px] font-black text-violet-700">
                <Rocket className="h-4 w-4" aria-hidden />
                {store.storeName} · تجربهٔ خرید نسل بعد
              </p>
              <h1 id="sl-hero" className="mt-5 min-h-[2.4em] text-[2rem] font-black leading-[1.3] tracking-tight sm:text-4xl md:min-h-[1.4em] md:text-[2.6rem]">
                {heroSlide?.title ? (
                  <>
                    {heroSlide.title.split(" ").slice(0, Math.max(2, heroSlide.title.split(" ").length - 2)).join(" ")}{" "}
                    <span className="sl-gradient-text">
                      {heroSlide.title.split(" ").slice(-2).join(" ")}
                    </span>
                  </>
                ) : (
                  <>
                    تکنولوژی را <span className="sl-gradient-text">گرم و روشن</span> بخرید
                  </>
                )}
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-[13.5px] leading-7 text-slate-500 lg:mx-0">
                {heroSlide?.subtitle ?? `دستگاه‌های هوشمند را با مشاورهٔ واقعی، قیمت شفاف و ارسال سریع از ${store.storeName} تهیه کنید.`}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href={heroSlide?.ctaUrl ?? (heroSlide?.product ? `/products/${heroSlide.product.slug}` : "/products")}
                  className="sl-gradient-btn flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black text-white"
                >
                  <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
                  {heroSlide?.ctaText ?? "شروع خرید"}
                </Link>
                <Link href="/products?discount=1" className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-[13px] font-bold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:shadow">
                  <Flame className="h-4.5 w-4.5 text-amber-500" aria-hidden />
                  تخفیف‌های داغ
                </Link>
              </div>
              {/* real counts strip */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                {[
                  { icon: Package, label: "کالا", value: counts.products },
                  { icon: LayoutGrid, label: "دسته‌بندی", value: counts.categories },
                  { icon: BadgeCheck, label: "برند", value: counts.brands },
                ].map((s) => (
                  <p key={s.label} className="flex items-center gap-2 text-slate-500">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-50 text-violet-500">
                      <s.icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">{toFaDigits(s.value.toLocaleString("fa-IR"))}</span>
                    <span className="text-[11px]">{s.label}</span>
                  </p>
                ))}
              </div>
            </motion.div>

            {/* hero slide card + floating collage */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
              className="relative mx-auto aspect-square w-full max-w-md"
            >
              <div className="sl-hero-card relative h-full w-full overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white shadow-[0_30px_80px_-40px_rgba(139,92,246,.45)]">
                {heroSlide ? (
                  /* v32: per-slide hero video + countdown chip */
                  <SlideHeroMedia slide={heroSlide} alt={heroSlide.title} fill sizes="(max-width: 1024px) 88vw, 460px" className="object-cover" priority />
                ) : (
                  <span className="grid h-full place-items-center text-slate-300">
                    <Package className="h-16 w-16" aria-hidden />
                  </span>
                )}
                {heroSlide?.countdownEnabled && heroSlide.countdownTarget ? (
                  <div className="absolute top-4 start-4 z-10">
                    <SlideCountdown target={heroSlide.countdownTarget} label={heroSlide.countdownLabel} />
                  </div>
                ) : null}
                {heroSlide?.product && (
                  <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between gap-3 rounded-3xl bg-white/85 px-5 py-3.5 backdrop-blur-xl">
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-black text-slate-800">{heroSlide.product.name}</span>
                      <span className="text-[14px] font-black text-violet-700 tabular-nums">
                        {formatPrice(heroSlide.product.discountPrice ?? heroSlide.product.price)}
                        <span className="text-[10px] font-normal text-slate-400"> تومان</span>
                      </span>
                    </span>
                    <Link href={`/products/${heroSlide.product.slug}`} className="sl-gradient-btn flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-[11.5px] font-black text-white">
                      خرید
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
              {/* floating mini product cards (decorative links) */}
              {collagePool[0] && (
                <Link
                  href={`/products/${collagePool[0].slug}`}
                  className="sl-float-card absolute -start-4 top-8 hidden w-36 rounded-3xl border border-slate-200/70 bg-white/90 p-2.5 shadow-xl backdrop-blur md:block"
                  style={{ animationDelay: "-2s" }}
                  aria-label={collagePool[0].name}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-slate-50">
                    <Image src={collagePool[0].mainImage!} alt={collagePool[0].name} fill sizes="144px" className="object-contain p-2" loading="lazy" />
                  </span>
                  <span className="mt-1.5 block truncate text-[10.5px] font-bold text-slate-700">{collagePool[0].name}</span>
                  <span className="text-[11px] font-black text-violet-700 tabular-nums">{formatPrice(collagePool[0].effectivePrice)}</span>
                </Link>
              )}
              {collagePool[1] && (
                <Link
                  href={`/products/${collagePool[1].slug}`}
                  className="sl-float-card absolute -end-3 bottom-16 hidden w-36 rounded-3xl border border-slate-200/70 bg-white/90 p-2.5 shadow-xl backdrop-blur md:block"
                  style={{ animationDelay: "-7s" }}
                  aria-label={collagePool[1].name}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-slate-50">
                    <Image src={collagePool[1].mainImage!} alt={collagePool[1].name} fill sizes="144px" className="object-contain p-2" loading="lazy" />
                  </span>
                  <span className="mt-1.5 block truncate text-[10.5px] font-bold text-slate-700">{collagePool[1].name}</span>
                  <span className="text-[11px] font-black text-cyan-600 tabular-nums">{formatPrice(collagePool[1].effectivePrice)}</span>
                </Link>
              )}
              {collagePool[2] && (
                <Link
                  href={`/products/${collagePool[2].slug}`}
                  className="sl-float-card absolute -top-6 end-8 hidden w-28 rounded-3xl border border-slate-200/70 bg-white/90 p-2 shadow-xl backdrop-blur lg:block"
                  style={{ animationDelay: "-4.5s" }}
                  aria-label={collagePool[2].name}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-slate-50">
                    <Image src={collagePool[2].mainImage!} alt={collagePool[2].name} fill sizes="112px" className="object-contain p-2" loading="lazy" />
                  </span>
                  <span className="mt-1 block truncate text-[9.5px] font-bold text-slate-600">{collagePool[2].name}</span>
                </Link>
              )}
            </motion.div>
          </div>
        </section>

        {/* ═══ 3 · BENEFITS ROW ═══ */}
        <section className="relative px-4 py-6" aria-label="مزایای خرید">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {benefits.map((b) => (
                  <div key={b.title} className="sl-card flex items-center gap-3.5 rounded-[1.75rem] p-5">
                    <span className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      b.tint === "violet" && "bg-violet-100 text-violet-600",
                      b.tint === "cyan" && "bg-cyan-100 text-cyan-600",
                      b.tint === "amber" && "bg-amber-100 text-amber-600"
                    )}>
                      <b.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black text-slate-800">{b.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">{b.text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ 4 · STORIES ═══ */}
        {stories.length > 0 && (
          <section className="relative px-4 py-6" aria-label="استوری‌های فروشگاه">
            <Reveal><StoriesRow stories={stories} /></Reveal>
          </section>
        )}

        {/* ═══ 5 · CATEGORY CARDS ═══ */}
        {data.categories.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-cats">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <SoftHead kicker="دسته‌بندی‌ها" title="از کجا شروع می‌کنید؟" href="/products" icon={LayoutGrid} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {data.categories.slice(0, 8).map((c) => {
                    const Icon = CAT_ICONS[c.slug] ?? Package;
                    return (
                      <Link
                        key={c.id}
                        href={`/products?category=${c.slug}`}
                        className="sl-card group flex flex-col overflow-hidden rounded-[1.75rem] p-4"
                      >
                        <span className="relative mb-3 block aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50">
                          {c.image ? (
                            <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw" className="object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          ) : (
                            <span className="grid h-full place-items-center bg-gradient-to-br from-violet-50 to-cyan-50 text-violet-400">
                              <Icon className="h-10 w-10" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-[13px] font-black text-slate-800 group-hover:text-violet-600">{c.name}</span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 tabular-nums">
                            {c.productCount.toLocaleString("fa-IR")} کالا
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 6 · FEATURED ═══ */}
        {featured.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-featured">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <SoftHead kicker="منتخب فروشگاه" title="محبوب‌ترین‌ها در این هفته" href="/products?featured=1" icon={Sparkles} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {featured.map((p) => (
                    <AiryCard key={p.id} product={p} />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 7 · DISCOUNT BANNER + GRID ═══ */}
        {discounted.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-deals">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <div className="sl-deals-banner relative mb-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[2rem] p-6 md:p-8">
                  <div className="relative z-10">
                    <p className="flex items-center gap-2 text-[11.5px] font-black text-white/90">
                      <Flame className="h-4 w-4" aria-hidden />
                      پیشنهاد شگفت‌انگیز
                    </p>
                    <h2 id="sl-deals" className="mt-2 text-xl font-black text-white md:text-2xl">تخفیف‌های فعال این هفته</h2>
                  </div>
                  <Link href="/products?discount=1" className="relative z-10 flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-[12.5px] font-black text-violet-700 shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]">
                    دیدن همه
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {discounted.map((p) => (
                    <AiryCard key={p.id} product={p} tint="amber" />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 8 · EXCLUSIVE FLOAT RAIL ═══ */}
        {exclusive.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-exclusive">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <SoftHead kicker="ویترین انحصاری" title="فقط اینجا پیدا می‌کنید" href="/products?special=1" icon={Gem} />
                <div className="sl-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                  {exclusive.map((p) => (
                    <article key={p.id} className="sl-card group flex w-48 shrink-0 snap-start flex-col rounded-[1.75rem] p-3 sm:w-56">
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-white to-cyan-50">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 44vw, 220px" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-slate-300"><Package className="h-12 w-12" aria-hidden /></span>
                        )}
                        <span className="sl-gradient-btn absolute start-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-black text-white">انحصاری</span>
                      </Link>
                      <p className="mt-3 line-clamp-1 px-1 text-[12.5px] font-bold text-slate-800">{p.name}</p>
                      <p className="mt-1 px-1 text-[14px] font-black text-violet-700 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[10px] font-normal text-slate-400"> تومان</span>
                      </p>
                    </article>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 9 · BESTSELLERS numbered soft list ═══ */}
        {bestsellers.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-best">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <SoftHead kicker="پرفروش‌ها" title="انتخاب مشتری‌های ما" href="/products?sort=bestseller" icon={TrendingUp} />
                <div className="grid gap-3 md:grid-cols-2">
                  {bestsellers.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="sl-card group flex items-center gap-4 rounded-[1.5rem] p-3.5"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-100 text-[15px] font-black text-violet-700 tabular-nums">
                        {toFaDigits(String(i + 1).padStart(2, "0"))}
                      </span>
                      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="64px" className="object-contain p-1.5" loading="lazy" />
                        ) : (
                          <Package className="h-6 w-6 text-slate-300" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-slate-800 group-hover:text-violet-600">{p.name}</span>
                        <span className="mt-1 block text-[11px] text-slate-400 tabular-nums">{p.soldCount.toLocaleString("fa-IR")} فروش موفق</span>
                      </span>
                      <span className="shrink-0 text-[13.5px] font-black text-slate-900 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9.5px] font-normal text-slate-400"> تومان</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 10 · NEWEST ═══ */}
        {newest.length > 0 && (
          <section className="relative px-4 py-10" aria-labelledby="sl-new">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <SoftHead kicker="تازه رسیده‌ها" title="آخرین ورودی‌های انبار" href="/products?sort=newest" icon={Rocket} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {newest.map((p) => (
                    <AiryCard key={p.id} product={p} />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ═══ 11 · SHOWCASES ═══ */}
        {(data.showcases ?? []).length > 0 && (
          <section className="relative px-4 py-10" aria-label="بنرهای فروشگاه">
            <div className="mx-auto max-w-7xl">
              <Reveal>
                <div className="grid gap-5 md:grid-cols-2">
                  {data.showcases.slice(0, 4).map((sc) => (
                    <Link
                      key={sc.id}
                      href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                      className="sl-showcase group relative block overflow-hidden rounded-[2rem] border border-slate-200/70"
                    >
                      <div className="relative aspect-[16/8]">
                        <Image src={sc.image} alt={sc.title} fill sizes="(max-width: 768px) 92vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-white/95 via-white/50 to-transparent" />
                      </div>
                      <div className="absolute inset-y-0 end-0 flex w-full max-w-[64%] flex-col justify-center gap-2 p-6 md:p-8">
                        <p className="text-[10.5px] font-black tracking-wide text-cyan-600">ویترین استارتاپی</p>
                        <h3 className="text-lg font-black leading-8 text-slate-900 md:text-xl">{sc.title}</h3>
                        {sc.subtitle && <p className="line-clamp-2 text-[12px] leading-6 text-slate-500">{sc.subtitle}</p>}
                        <span className="sl-gradient-btn mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-2xl px-5 text-[12px] font-black text-white">
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

        {/* ═══ 12 · BRANDS + FAQ ═══ */}
        <section className="relative px-4 py-10" aria-label="برندها و پرسش‌ها">
          <div className="mx-auto max-w-7xl">
            {(data.brands ?? []).length > 0 && (
              <Reveal>
                <SoftHead kicker="برندها" title="همراهان مطمئن ما" icon={BadgeCheck} />
                <ul className="mb-12 flex flex-wrap gap-2.5">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/products?brand=${b.slug}`}
                        className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[12px] font-bold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:shadow"
                      >
                        {b.logo ? (
                          <Image src={b.logo} alt={b.name} width={20} height={20} className="h-5 w-5 rounded-full object-contain" />
                        ) : (
                          <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-l from-violet-500 to-cyan-400" />
                        )}
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {(data.faq ?? []).length > 0 && (
              <Reveal>
                <SoftHead kicker="پرسش‌های پرتکرار" title="سؤال شما، جواب ما" icon={HelpCircle} />
                <div className="grid gap-4 md:grid-cols-2">
                  {data.faq.map((f, i) => (
                    <details key={i} className="sl-card group rounded-[1.5rem] p-5">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-[13px] font-bold text-slate-800">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-cyan-100 text-[11px] font-black text-violet-700 tabular-nums">
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        {f.h}
                        <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:-rotate-90" aria-hidden />
                      </summary>
                      <p className="mt-3 border-t border-slate-100 pt-3 text-[12.5px] leading-7 text-slate-500">{f.p}</p>
                    </details>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </section>

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="relative px-4 py-24">
            <div className="mx-auto max-w-lg rounded-[2.5rem] border border-dashed border-violet-200 bg-white/70 p-16 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-violet-300" aria-hidden />
              <h2 className="text-lg font-black text-slate-800">قفسه‌ها هنوز در حال چیدمان‌اند</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                به‌زودی اولین محصولات می‌رسند؛ فعلاً از{" "}
                <Link href="/products" className="font-bold text-violet-600">آرشیو محصولات</Link> دیدن کنید.
              </p>
            </div>
          </section>
        )}
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS (single plain <style>) ═══ */}
      <style>{`
[data-tpl="startup-light"] {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --accent: #F1F5F9;
  --accent-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  background-color: #F8FAFC;
  color: #0F172A;
}
/* keep the chrome's violet accent light even when the site runs dark */
[data-tpl="startup-light"] .bg-violet-500\\/15 { background-color: #F3E8FF !important; }
[data-tpl="startup-light"] .bg-violet-500\\/25 { background-color: #EDE9FE !important; }
[data-tpl="startup-light"] .hover\\:bg-violet-500\\/25:hover { background-color: #EDE9FE !important; }
[data-tpl="startup-light"] .text-violet-300 { color: #6D28D9 !important; }
[data-tpl="startup-light"] .text-violet-400 { color: #7C3AED !important; }
[data-tpl="startup-light"] .border-violet-400\\/40 { border-color: #C4B5FD !important; }

/* ── shell + rails ── */
[data-tpl="startup-light"] .sl-shell { position: relative; isolation: isolate; overflow: clip; }
[data-tpl="startup-light"] .sl-rail { scrollbar-width: none; -ms-overflow-style: none; }
[data-tpl="startup-light"] .sl-rail::-webkit-scrollbar { display: none; }

/* ── soft blurred color bubbles ── */
[data-tpl="startup-light"] .sl-bubble {
  position: absolute; border-radius: 9999px;
  filter: blur(90px); opacity: 0.3; z-index: -1; pointer-events: none;
  animation: sl-drift 18s ease-in-out infinite alternate;
}
@keyframes sl-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(50px, 70px, 0) scale(1.18); }
}

/* ── gradient text + buttons (violet→cyan) ── */
[data-tpl="startup-light"] .sl-gradient-text {
  background-image: linear-gradient(100deg, #7C3AED, #06B6D4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
[data-tpl="startup-light"] .sl-gradient-btn {
  background-image: linear-gradient(100deg, #7C3AED, #06B6D4);
  box-shadow: 0 10px 24px -10px rgba(124, 58, 237, 0.6);
  background-size: 170% 100%;
  transition: background-position 0.45s ease, box-shadow 0.3s ease, transform 0.15s ease;
}
[data-tpl="startup-light"] .sl-gradient-btn:hover {
  background-position: 90% 0;
  box-shadow: 0 14px 30px -12px rgba(6, 182, 212, 0.7);
}
[data-tpl="startup-light"] .sl-gradient-btn:active { transform: scale(0.96); }
[data-tpl="startup-light"] .sl-gradient-btn:disabled { cursor: not-allowed; }

/* ── airy cards ── */
[data-tpl="startup-light"] .sl-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 10px 30px -18px rgba(15, 23, 42, 0.18);
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.3s ease;
}
[data-tpl="startup-light"] .sl-card:hover {
  transform: translateY(-4px);
  border-color: rgba(167, 139, 250, 0.55);
  box-shadow: 0 24px 50px -22px rgba(124, 58, 237, 0.35);
}

/* ── floating collage cards ── */
[data-tpl="startup-light"] .sl-float-card {
  animation: sl-float 7s ease-in-out infinite;
}
@keyframes sl-float {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-14px) rotate(1.5deg); }
}

/* ── misc atoms ── */
[data-tpl="startup-light"] .sl-announce { box-shadow: 0 10px 30px -18px rgba(124, 58, 237, 0.4); }
[data-tpl="startup-light"] .sl-deals-banner {
  background-image: linear-gradient(105deg, #7C3AED, #8B5CF6 45%, #06B6D4);
  box-shadow: 0 26px 60px -30px rgba(124, 58, 237, 0.65);
}
[data-tpl="startup-light"] .sl-showcase { background: #FFFFFF; }
[data-tpl="startup-light"] .sl-showcase:hover { box-shadow: 0 24px 55px -25px rgba(124, 58, 237, 0.4); }
[data-tpl="startup-light"] .sl-hero-card { animation: sl-hero-in 0.8s ease both; }
@keyframes sl-hero-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

@media (prefers-reduced-motion: reduce) {
  [data-tpl="startup-light"] .sl-bubble,
  [data-tpl="startup-light"] .sl-float-card,
  [data-tpl="startup-light"] .sl-hero-card { animation: none !important; }
}

/* ═══ v26fix · DARK-MODE SKIN (v25 light design above is untouched) ═══
   Dark canvas #0E1420 / ink #E6EAF2. Slate text ramps to light ink,
   surfaces become translucent dark glass, the violet→cyan identity,
   bubbles and gradient CTAs keep their hue (only lifted for contrast). */
html.dark [data-tpl="startup-light"] {
  --background: #0E1420;
  --foreground: #E6EAF2;
  --card: #232833;
  --card-foreground: #E6EAF2;
  --muted: #1F2430;
  --muted-foreground: #9499A2;
  --border: rgba(230, 234, 242, 0.16);
  --input: rgba(230, 234, 242, 0.22);
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --accent: #2F343E;
  --accent-foreground: #E6EAF2;
  --popover: #2A2F3A;
  --popover-foreground: #E6EAF2;
  background-color: #0E1420;
  color: #E6EAF2;
}
/* slate ink ramp (kept as a ramp so hierarchy survives) */
html.dark [data-tpl="startup-light"] .text-slate-900 { color: #E9EEF5; }
html.dark [data-tpl="startup-light"] .text-slate-800 { color: #DCE3ED; }
html.dark [data-tpl="startup-light"] .text-slate-700 { color: #C6CFDC; }
html.dark [data-tpl="startup-light"] .text-slate-600 { color: #AAB5C6; }
html.dark [data-tpl="startup-light"] .text-slate-500 { color: #93A0B4; }
html.dark [data-tpl="startup-light"] .text-slate-400 { color: #8896AA; }
html.dark [data-tpl="startup-light"] .text-slate-300 { color: #61707F; }
/* white surfaces → elevated dark */
html.dark [data-tpl="startup-light"] .bg-white { background-color: #161E2B; }
html.dark [data-tpl="startup-light"] .bg-slate-50 { background-color: #1A2332; }
html.dark [data-tpl="startup-light"] .bg-slate-100 { background-color: rgba(230, 234, 242, 0.08); }
html.dark [data-tpl="startup-light"] .bg-slate-300 { background-color: #46536A; }
html.dark [data-tpl="startup-light"] .bg-white\\/80 { background-color: rgba(20, 27, 40, 0.82); }
html.dark [data-tpl="startup-light"] .bg-white\\/85 { background-color: rgba(17, 24, 36, 0.87); }
html.dark [data-tpl="startup-light"] .bg-white\\/90 { background-color: rgba(19, 26, 38, 0.9); }
html.dark [data-tpl="startup-light"] .bg-white\\/70 { background-color: rgba(21, 28, 41, 0.72); }
/* hairlines */
html.dark [data-tpl="startup-light"] .border-slate-200 { border-color: rgba(230, 234, 242, 0.13); }
html.dark [data-tpl="startup-light"] .border-slate-200\\/70 { border-color: rgba(230, 234, 242, 0.09); }
html.dark [data-tpl="startup-light"] .border-slate-100 { border-color: rgba(230, 234, 242, 0.07); }
html.dark [data-tpl="startup-light"] .border-violet-200 { border-color: rgba(167, 139, 250, 0.3); }
html.dark [data-tpl="startup-light"] .border-violet-200\\/70 { border-color: rgba(167, 139, 250, 0.22); }
html.dark [data-tpl="startup-light"] .hover\\:border-violet-300:hover { border-color: rgba(167, 139, 250, 0.45); }
/* violet / cyan / amber accents lifted for the dark canvas */
html.dark [data-tpl="startup-light"] .text-violet-600,
html.dark [data-tpl="startup-light"] .text-violet-500 { color: #A78BFA; }
html.dark [data-tpl="startup-light"] .text-violet-700 { color: #B79CF8; }
html.dark [data-tpl="startup-light"] .hover\\:text-violet-600:hover { color: #A78BFA; }
html.dark [data-tpl="startup-light"] .hover\\:text-violet-700:hover { color: #B79CF8; }
html.dark [data-tpl="startup-light"] .group-hover\\:text-violet-600:is(:where(.group):hover *) { color: #A78BFA; }
html.dark [data-tpl="startup-light"] .text-cyan-600 { color: #22D3EE; }
html.dark [data-tpl="startup-light"] .text-amber-600 { color: #FBBF24; }
html.dark [data-tpl="startup-light"] .bg-violet-100 { background-color: rgba(139, 92, 246, 0.2); }
html.dark [data-tpl="startup-light"] .bg-cyan-100 { background-color: rgba(34, 211, 238, 0.16); }
html.dark [data-tpl="startup-light"] .bg-amber-100 { background-color: rgba(251, 191, 36, 0.16); }
html.dark [data-tpl="startup-light"] .bg-violet-50 { background-color: rgba(139, 92, 246, 0.13); }
/* v25 pinned these two light-only with !important — re-lift on dark */
html.dark [data-tpl="startup-light"] .text-violet-300 { color: #C4B5FD !important; }
html.dark [data-tpl="startup-light"] .text-violet-400 { color: #A78BFA !important; }
/* tinted gradient wells → translucent dark tints (class names unchanged) */
html.dark [data-tpl="startup-light"] .from-violet-50 { --tw-gradient-from: rgba(139, 92, 246, 0.13); }
html.dark [data-tpl="startup-light"] .to-cyan-50 { --tw-gradient-to: rgba(34, 211, 238, 0.1); }
html.dark [data-tpl="startup-light"] .from-violet-100 { --tw-gradient-from: rgba(139, 92, 246, 0.24); }
html.dark [data-tpl="startup-light"] .to-cyan-100 { --tw-gradient-to: rgba(34, 211, 238, 0.18); }
html.dark [data-tpl="startup-light"] .via-white { --tw-gradient-via: rgba(230, 234, 242, 0.05); }
html.dark [data-tpl="startup-light"] .from-white\\/95 { --tw-gradient-from: rgba(14, 20, 32, 0.96); }
html.dark [data-tpl="startup-light"] .via-white\\/50 { --tw-gradient-via: rgba(14, 20, 32, 0.55); }
/* scoped helpers → dark glass (gradient CTAs/banner/bubbles stay as-is) */
html.dark [data-tpl="startup-light"] .sl-card {
  background: rgba(21, 28, 41, 0.85);
  border: 1px solid rgba(230, 234, 242, 0.09);
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.55);
}
html.dark [data-tpl="startup-light"] .sl-card:hover {
  border-color: rgba(167, 139, 250, 0.45);
  box-shadow: 0 24px 50px -22px rgba(139, 92, 246, 0.3);
}
html.dark [data-tpl="startup-light"] .sl-showcase { background: #161E2B; }
html.dark [data-tpl="startup-light"] .sl-announce { box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.6); }
html.dark [data-tpl="startup-light"] .sl-gradient-text { background-image: linear-gradient(100deg, #A78BFA, #22D3EE); }
/* restore: the deals banner STAYS a violet→cyan gradient, so its white
   CTA pill + deep-violet label keep their light-mode look */
html.dark [data-tpl="startup-light"] .sl-deals-banner .bg-white { background-color: #FFFFFF; }
html.dark [data-tpl="startup-light"] .sl-deals-banner .text-violet-700 { color: #6D28D9; }
` + SLIDE_MEDIA_CSS}</style>
    </div>
  );
}

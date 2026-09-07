"use client";

/**
 * TEMPLATE · mobile-first-pwa — «پوستهٔ اپ آینده» (v25 · futuristic app shell)
 * ---------------------------------------------------------------------------
 * The store as a FUTURISTIC PHONE APP:
 *  - desktop: a max-w-[430px] device-ish app column (rounded frame, notch
 *    hint, ambient glow) floating on a dark #090B10 workspace
 *  - mobile: the column IS the app (frame decorations hidden)
 *  - dark app UI #0E1117 with glass surfaces, big search hero,
 *    SNAP-SCROLL wheels (scroll-snap-type: x mandatory) for stories /
 *    categories / deals / VIP products, and a GLASS BOTTOM TAB BAR
 *    (خانه / دسته‌ها / سبد / پروفایل — real routes, sticky at the bottom
 *    of the app column, never fixed to the viewport; the layout owns the
 *    page chrome)
 *
 * The chrome header is retuned to the app's dark palette via CSS vars
 * scoped to [data-chrome-header] inside the template's <style>. The
 * app-style chrome footer already rides dark tokens — left untouched.
 * No registered features.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Check, ChevronLeft, Star, Flame, ShoppingCart, Timer, Zap,
  BadgeCheck, TrendingUp, HelpCircle, Smartphone, Laptop, Computer, Cpu,
  Monitor, Gamepad2, Watch, HardDrive, Keyboard, Mouse, Camera, Speaker,
  Wifi, BatteryCharging, Projector, Headphones, LayoutGrid, Search, Mic,
  Home, User, Gem, Sparkles, Rocket, Boxes, Bell, ArrowLeft,
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

/* ── app-style section heading ────────────────────────────────────── */
function AppHead({
  kicker, title, icon: Icon = Sparkles,
}: { kicker: string; title: string; icon?: React.ElementType }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <span className="mf-kicker-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white">
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black tracking-[0.14em] text-violet-300/80">{kicker}</p>
        <h2 className="mt-0.5 truncate text-[15.5px] font-black leading-7 text-[#E6EAF2]">{title}</h2>
      </div>
    </div>
  );
}

/* ── hydration-safe countdown chip ────────────────────────────────── */
function AppCountdown({ endsAt }: { endsAt?: string | null }) {
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
    <p className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[12px] font-black text-violet-200 tabular-nums" role="timer" aria-label="زمان باقی‌مانده">
      <Timer className="h-3.5 w-3.5" aria-hidden />
      {left ?? "—"}
    </p>
  );
}

/* ── compact app product tile (used in wheels + grids) ────────────── */
function AppTile({ product }: { product: TemplateProduct }) {
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
        "mf-card flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-[#161B26]",
        !product.inStock && "opacity-55 grayscale-[0.35]"
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square bg-[#0E1117]">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 46vw, 220px"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-slate-600">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute start-2 top-2 rounded-lg bg-violet-500 px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {product.inStock ? (
          <span aria-hidden className="absolute end-2 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
        ) : (
          <span className="absolute end-2 top-2 rounded-lg bg-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-200">اتمام</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
          <BadgeCheck className="h-3 w-3 shrink-0 text-violet-400/70" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-[12px] font-bold leading-[18px] text-[#E6EAF2]">
          {product.name}
        </Link>
        <div className="mt-auto pt-1">
          {product.discountPercent > 0 && (
            <p className="text-[10px] leading-4 text-slate-500 price-old tabular-nums">{formatPrice(product.price)} تومان</p>
          )}
          <p className={cn("text-[14.5px] font-black leading-6 text-[#E6EAF2] tabular-nums", product.discountPercent > 0 && "text-violet-300")}>
            {formatPrice(product.effectivePrice)}
            <span className="text-[9px] font-normal text-slate-500"> تومان</span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "mf-buy mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[11.5px] font-black text-white transition-all active:scale-[0.97]",
              !product.inStock && "cursor-not-allowed !bg-slate-800 !text-slate-500"
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

/* ═════════════════════ TEMPLATE ═════════════════════ */
export function MobileFirstPwaTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const chrome = TEMPLATE_CHROME["mobile-first-pwa"];

  /* app banner rotation */
  const slides = data.slides ?? [];
  const [bannerIdx, setBannerIdx] = useState(0);
  const banner = slides.length > 0 ? slides[Math.min(bannerIdx, slides.length - 1)] : null;
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => setBannerIdx((i) => (i + 1) % slides.length), 5500);
    return () => window.clearInterval(t);
  }, [slides.length]);

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

  const featured = (data.featured ?? []).slice(0, 6);
  const bestsellers = (data.bestsellers ?? []).slice(0, 6);
  const exclusive = (data.exclusive ?? []).slice(0, 8);
  const newest = (data.newest ?? []).slice(0, 6);
  const hasAnyProduct = deals.length > 0 || featured.length > 0 || bestsellers.length > 0 || exclusive.length > 0 || newest.length > 0;

  /* decorative bottom tab navigation — REAL routes */
  const tabs = [
    { href: "/", label: "خانه", icon: Home, active: true },
    { href: "/products", label: "دسته‌ها", icon: LayoutGrid, active: false },
    { href: "/cart", label: "سبد", icon: ShoppingCart, active: false },
    { href: "/account", label: "پروفایل", icon: User, active: false },
  ];

  return (
    <div data-template-chrome="1" data-tpl="mobile-first-pwa" className="w-full">
      <TemplateHeader data={data} cfg={chrome.header} />
      {/* NOTE: announcement/ticker renders inside the template's own H6
          chrome header — the in-app notice below is the app-style echo. */}
      <div className="mf-workspace relative w-full pb-10 pt-6 md:py-10">
        <span aria-hidden className="mf-glow" />

        {/* ═══ THE APP COLUMN (device frame on desktop) ═══ */}
        <div className="mf-app relative mx-auto flex w-full max-w-[430px] flex-col overflow-clip md:min-h-[80vh] md:rounded-[2.75rem] md:border md:border-white/10 md:shadow-[0_40px_120px_-40px_rgba(139,92,246,.45)]">
          {/* notch hint */}
          <span aria-hidden className="mf-notch absolute start-1/2 top-2.5 z-30 hidden h-6 w-24 -translate-x-1/2 rounded-full bg-black/90 md:block" />

          <div className="flex flex-1 flex-col gap-7 px-4 pb-6 pt-4 md:pt-12">
            {/* ═══ 1 · greeting + big search hero ═══ */}
            <section aria-labelledby="mf-hello" className="taj-slide-start">
              <div className="flex items-center gap-3">
                <span className="mf-avatar grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[17px] font-black text-white" aria-hidden>
                  {store.storeName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <h1 id="mf-hello" className="truncate text-[16px] font-black leading-6 text-[#E6EAF2]">
                    سلام، به {store.storeName} خوش آمدید
                  </h1>
                  <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-slate-500 tabular-nums">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                    اپ فعال · {toFaDigits(counts.products.toLocaleString("fa-IR"))} کالا آمادهٔ ارسال
                  </p>
                </div>
                {store.announcementActive && store.announcement && (
                  <span className="mf-notice relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-violet-200" title={store.announcement}>
                    <Bell className="h-4.5 w-4.5" aria-hidden />
                    <span aria-hidden className="mf-notice-dot absolute end-2 top-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  </span>
                )}
              </div>

              {/* big search hero — a real link styled as the app search field */}
              <Link
                href="/products"
                aria-label="جستجوی محصولات"
                className="mf-search mt-4 flex h-14 items-center gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.06] px-4 backdrop-blur-xl transition-colors hover:border-violet-400/50"
              >
                <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-400">جستجوی محصول، برند یا دسته…</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
                  <Mic className="h-4 w-4" aria-hidden />
                </span>
              </Link>

              {store.announcementActive && store.announcement && (
                <div className="mf-notice-card mt-3 flex items-center gap-2.5 rounded-2xl px-4 py-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden />
                  {store.announcementLink ? (
                    <Link href={store.announcementLink} className="min-w-0 truncate text-[11.5px] font-bold text-violet-100">
                      {store.announcement}
                    </Link>
                  ) : (
                    <p className="min-w-0 truncate text-[11.5px] font-bold text-violet-100">{store.announcement}</p>
                  )}
                </div>
              )}
            </section>

            {/* ═══ 2 · app banner (auto-rotating) ═══ */}
            {banner && (
              <section aria-label="بنرهای اسلایدی اپ" className="taj-slide-end">
                <div className="mf-banner relative overflow-hidden rounded-[1.75rem] border border-white/[0.07]">
                  <Link
                    href={banner.ctaUrl ?? (banner.product ? `/products/${banner.product.slug}` : "/products")}
                    aria-label={banner.title}
                    className="relative block aspect-[16/10]"
                  >
                    <SlideArt slide={banner} alt={banner.title} fill sizes="430px" className="object-cover" priority />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0E1117]/95 via-[#0E1117]/25 to-transparent" />
                    <span className="absolute bottom-3.5 start-4 end-4 flex flex-col gap-1">
                      <span className="line-clamp-1 text-[14px] font-black text-[#E6EAF2]">{banner.title}</span>
                      {banner.subtitle && <span className="line-clamp-1 text-[11px] text-slate-300/80">{banner.subtitle}</span>}
                      <span className="mf-buy mt-1.5 flex h-10 w-fit items-center gap-1.5 rounded-xl px-4 text-[11.5px] font-black text-white">
                        {banner.ctaText ?? "مشاهده"}
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                  {slides.length > 1 && (
                    <div className="absolute bottom-3 end-4 flex items-center gap-1.5" role="tablist" aria-label="انتخاب بنر">
                      {slides.map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={i === bannerIdx}
                          aria-label={`بنر ${toFaDigits(String(i + 1))}`}
                          onClick={() => setBannerIdx(i)}
                          className={cn("h-1.5 rounded-full transition-all", i === bannerIdx ? "w-5 bg-violet-400" : "w-1.5 bg-white/30")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ═══ 3 · STORIES WHEEL (snap) ═══ */}
            {stories.length > 0 && (
              <section aria-label="استوری‌های اپ">
                <AppHead kicker="STORIES" title="استوری‌های امروز" icon={Sparkles} />
                <StoriesRow stories={stories} />
              </section>
            )}

            {/* ═══ 4 · CATEGORY WHEEL (snap) ═══ */}
            {data.categories.length > 0 && (
              <section aria-label="دسته‌بندی‌های اپ">
                <AppHead kicker="CATEGORIES" title="دسته‌ها را بچرخانید" icon={LayoutGrid} />
                <div className="mf-wheel">
                  {data.categories.slice(0, 12).map((c) => {
                    const Icon = CAT_ICONS[c.slug] ?? Boxes;
                    return (
                      <Link key={c.id} href={`/products?category=${c.slug}`} className="flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5">
                        <span className="mf-cat-tile grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-[1.4rem] border border-white/[0.08] bg-[#161B26]">
                          {c.image ? (
                            <Image src={c.image} alt={c.name} fill sizes="64px" className="object-cover" loading="lazy" />
                          ) : (
                            <Icon className="h-6 w-6 text-violet-300" aria-hidden />
                          )}
                        </span>
                        <span className="w-full truncate text-center text-[10px] font-bold text-[#E6EAF2]">{c.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ═══ 5 · FLASH DEALS WHEEL (snap) ═══ */}
            {deals.length > 0 && (
              <section aria-labelledby="mf-deals">
                <div className="mb-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="mf-kicker-icon mf-kicker-hot grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white">
                      <Flame className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.14em] text-fuchsia-300/90">FLASH DEALS</p>
                      <h2 id="mf-deals" className="mt-0.5 truncate text-[15.5px] font-black leading-7 text-[#E6EAF2]">پیشنهادهای شگفت اپ</h2>
                    </div>
                  </div>
                  <AppCountdown endsAt={dealTimer} />
                </div>
                <div className="mf-wheel">
                  {deals.map((p) => (
                    <article key={p.id} className="mf-card group flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-[#161B26]">
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square bg-[#0E1117]">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="160px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-slate-600"><Package className="h-9 w-9" aria-hidden /></span>
                        )}
                        {p.discountPercent > 0 && (
                          <span className="mf-hot-chip absolute start-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
                            {p.discountPercent.toLocaleString("fa-IR")}٪
                          </span>
                        )}
                      </Link>
                      <div className="flex flex-col gap-1 p-3">
                        <Link href={`/products/${p.slug}`} className="line-clamp-2 min-h-9 text-[11.5px] font-bold leading-[17px] text-[#E6EAF2]">{p.name}</Link>
                        <p className={cn("text-[13.5px] font-black leading-6 tabular-nums", p.discountPercent > 0 ? "text-fuchsia-300" : "text-[#E6EAF2]")}>
                          {formatPrice(p.effectivePrice)}
                          <span className="text-[9px] font-normal text-slate-500"> تومان</span>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 6 · FEATURED GRID (2 cols inside the phone) ═══ */}
            {featured.length > 0 && (
              <section aria-labelledby="mf-featured">
                <AppHead kicker="FOR YOU" title="منتخب برای شما" icon={Gem} />
                <div className="grid grid-cols-2 gap-3">
                  {featured.map((p) => (
                    <AppTile key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 7 · BESTSELLERS LIST ═══ */}
            {bestsellers.length > 0 && (
              <section aria-labelledby="mf-best">
                <AppHead kicker="TOP CHART" title="پرفروش‌های این هفته" icon={TrendingUp} />
                <div className="mf-card flex flex-col divide-y divide-white/[0.06] rounded-3xl border border-white/[0.07]">
                  {bestsellers.map((p, i) => (
                    <Link key={p.id} href={`/products/${p.slug}`} className="group flex items-center gap-3 p-3">
                      <span className="w-6 shrink-0 text-center text-[13px] font-black text-violet-400/80 tabular-nums" aria-hidden>
                        {toFaDigits(String(i + 1).padStart(2, "0"))}
                      </span>
                      <span className="relative grid h-13 w-13 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0E1117]">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="52px" className="object-contain p-1" loading="lazy" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-600" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-[#E6EAF2] group-hover:text-violet-300">{p.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[9.5px] text-slate-500 tabular-nums">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                          {p.rating > 0 ? toFaDigits(p.rating.toLocaleString("fa-IR")) : "جدید"}
                          <span className="text-slate-600">·</span>
                          {p.soldCount.toLocaleString("fa-IR")} فروش
                        </span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-black text-violet-300 tabular-nums">{formatPrice(p.effectivePrice)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 8 · VIP EXCLUSIVE WHEEL (snap) ═══ */}
            {exclusive.length > 0 && (
              <section aria-labelledby="mf-vip">
                <AppHead kicker="VIP ONLY" title="فقط در اپ، فقط برای شما" icon={Gem} />
                <div className="mf-wheel">
                  {exclusive.map((p) => (
                    <article key={p.id} className="mf-vip-card group relative w-40 shrink-0 snap-start overflow-hidden rounded-3xl p-2.5">
                      <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#0E1117]">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt={p.name} fill sizes="160px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-slate-600"><Package className="h-9 w-9" aria-hidden /></span>
                        )}
                        <span className="absolute start-2 top-2 rounded-lg bg-gradient-to-l from-fuchsia-500 to-violet-600 px-2 py-0.5 text-[8.5px] font-black text-white">VIP</span>
                      </Link>
                      <p className="mt-2 line-clamp-1 text-[11.5px] font-bold text-[#E6EAF2]">{p.name}</p>
                      <p className="mt-0.5 text-[13px] font-black text-fuchsia-300 tabular-nums">
                        {formatPrice(p.effectivePrice)}
                        <span className="text-[9px] font-normal text-slate-500"> تومان</span>
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 9 · NEWEST GRID ═══ */}
            {newest.length > 0 && (
              <section aria-labelledby="mf-new">
                <AppHead kicker="JUST LANDED" title="تازه رسیدها" icon={Rocket} />
                <div className="grid grid-cols-2 gap-3">
                  {newest.map((p) => (
                    <AppTile key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 10 · SHOWCASE CARDS ═══ */}
            {(data.showcases ?? []).length > 0 && (
              <section aria-label="بنرهای ویژهٔ اپ">
                <AppHead kicker="MOMENTS" title="لحظه‌های ویژه" icon={Sparkles} />
                <div className="flex flex-col gap-3">
                  {data.showcases.slice(0, 3).map((sc) => (
                    <Link
                      key={sc.id}
                      href={sc.buttonUrl ?? (sc.product ? `/products/${sc.product.slug}` : "/products")}
                      className="mf-card relative block overflow-hidden rounded-3xl border border-white/[0.07]"
                    >
                      <div className="relative aspect-[16/8]">
                        <Image src={sc.image} alt={sc.title} fill sizes="430px" className="object-cover" loading="lazy" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#0E1117]/90 via-[#0E1117]/30 to-transparent" />
                      </div>
                      <div className="absolute inset-y-0 end-0 flex w-full max-w-[60%] flex-col justify-center gap-1 p-4">
                        <h3 className="text-[13.5px] font-black leading-6 text-[#E6EAF2]">{sc.title}</h3>
                        {sc.subtitle && <p className="line-clamp-2 text-[10.5px] leading-5 text-slate-400">{sc.subtitle}</p>}
                        <span className="mf-buy mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-xl px-3.5 text-[11px] font-black text-white">
                          برو
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 11 · BRAND CHIPS ═══ */}
            {(data.brands ?? []).length > 0 && (
              <section aria-label="برندهای اپ">
                <AppHead kicker="BRANDS" title="برندهای موجود" icon={BadgeCheck} />
                <ul className="flex flex-wrap gap-2">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link href={`/products?brand=${b.slug}`} className="mf-chip flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold text-[#E6EAF2]">
                        {b.logo ? (
                          <Image src={b.logo} alt={b.name} width={16} height={16} className="h-4 w-4 rounded-full object-contain" />
                        ) : (
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        )}
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ═══ 12 · FAQ ═══ */}
            {(data.faq ?? []).length > 0 && (
              <section aria-labelledby="mf-faq">
                <AppHead kicker="HELP" title="سؤال دارید؟" icon={HelpCircle} />
                <div className="flex flex-col gap-2">
                  {data.faq.map((f, i) => (
                    <details key={i} className="mf-card group rounded-2xl border border-white/[0.07] p-3.5">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 text-[12px] font-bold text-[#E6EAF2]">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[10.5px] font-black text-violet-300 tabular-nums">
                          {(i + 1).toLocaleString("fa-IR")}
                        </span>
                        {f.h}
                        <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:-rotate-90" aria-hidden />
                      </summary>
                      <p className="mt-2.5 border-t border-white/[0.06] pt-2.5 text-[11.5px] leading-6 text-slate-400">{f.p}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 13 · APP STATS ═══ */}
            <section aria-label="آمار اپ" className="pb-2">
              <div className="mf-stats grid grid-cols-4 gap-2">
                {[
                  { icon: Package, value: counts.products },
                  { icon: LayoutGrid, value: counts.categories },
                  { icon: BadgeCheck, value: counts.brands },
                  { icon: Sparkles, value: counts.stories },
                ].map((s) => (
                  <div key={s.value + s.icon.name} className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5">
                    <s.icon className="h-4 w-4 text-violet-300/80" aria-hidden />
                    <span className="text-[14px] font-black text-[#E6EAF2] tabular-nums">{toFaDigits(s.value.toLocaleString("fa-IR"))}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* empty state */}
            {!hasAnyProduct && (
              <section className="py-16 text-center">
                <Smartphone className="mx-auto mb-4 h-12 w-12 text-violet-400/60" aria-hidden />
                <h2 className="text-[15px] font-black text-[#E6EAF2]">اپ هنوز خالی است</h2>
                <p className="mt-2 text-[12px] leading-6 text-slate-500">
                  به‌زودی قفسه‌ها پر می‌شوند؛ از{" "}
                  <Link href="/products" className="font-bold text-violet-300">آرشیو محصولات</Link> بازدید کنید.
                </p>
              </section>
            )}
          </div>

          {/* ═══ GLASS BOTTOM TAB BAR — sticky within the app column ═══ */}
          <nav
            aria-label="ناوبری اپ"
            className="sticky bottom-0 z-30 mt-auto border-t border-white/[0.08] bg-[#0E1117]/85 backdrop-blur-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <ul className="grid grid-cols-4">
              {tabs.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-label={t.label}
                    aria-current={t.active ? "page" : undefined}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors",
                      t.active ? "text-violet-300" : "text-slate-500 hover:text-[#E6EAF2]"
                    )}
                  >
                    <span className={cn(
                      "grid h-9 w-14 place-items-center rounded-2xl transition-colors",
                      t.active && "bg-violet-500/20 shadow-[inset_0_0_0_1px_rgba(139,92,246,.4)]"
                    )}>
                      <t.icon className={cn("h-5 w-5", t.active && "drop-shadow-[0_0_8px_rgba(139,92,246,.8)]")} aria-hidden />
                    </span>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* desktop hint under the frame */}
        <p className="mx-auto mt-6 hidden max-w-[430px] items-center justify-center gap-2 text-center text-[10.5px] text-slate-600 md:flex">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          تجربهٔ اپ {store.storeName} — روی گوشی تمام‌صفحه نمایش داده می‌شود
        </p>
      </div>
      <TemplateFooter data={data} cfg={chrome.footer} />

      {/* ═══ scoped template CSS (single plain <style>) ═══ */}
      <style>{`
[data-tpl="mobile-first-pwa"] {
  background-color: #090B10;
}
/* retune the app-bar chrome header to the dark app palette (vars scoped
   to the header element only — the app-style footer keeps its own native
   dark tokens and must NOT be flipped) */
[data-tpl="mobile-first-pwa"] [data-chrome-header] {
  --background: #0E1117;
  --foreground: #E6EAF2;
  --card: #161B26;
  --card-foreground: #E6EAF2;
  --muted: #1A2029;
  --muted-foreground: #98A2B3;
  --border: rgba(148, 163, 184, 0.14);
  --input: rgba(148, 163, 184, 0.14);
  --primary: #8B5CF6;
  --primary-foreground: #FFFFFF;
  --popover: #161B26;
  --popover-foreground: #E6EAF2;
  --accent: #1A2029;
  --accent-foreground: #E6EAF2;
  background-color: #0E1117 !important;
  color: #E6EAF2;
}
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-100 { background-color: rgba(139, 92, 246, 0.16) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-200:hover { background-color: rgba(139, 92, 246, 0.26) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/15 { background-color: rgba(139, 92, 246, 0.16) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/25 { background-color: rgba(139, 92, 246, 0.26) !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-700 { color: #C4B5FD !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-600 { color: #A78BFA !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-400 { color: #A78BFA !important; }
[data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-300 { color: #C4B5FD !important; }

/* ── the app column: dark app tokens (scoped, footer-safe) ── */
[data-tpl="mobile-first-pwa"] .mf-app {
  --background: #0E1117;
  --foreground: #E6EAF2;
  --card: #161B26;
  --card-foreground: #E6EAF2;
  --muted: #1A2029;
  --muted-foreground: #98A2B3;
  --border: rgba(148, 163, 184, 0.14);
  --input: rgba(148, 163, 184, 0.14);
  --primary: #8B5CF6;
  --primary-foreground: #FFFFFF;
  --popover: #161B26;
  --popover-foreground: #E6EAF2;
  background-color: #0E1117;
  color: #E6EAF2;
}
[data-tpl="mobile-first-pwa"] .mf-workspace { position: relative; isolation: isolate; }

/* ambient glow behind the device frame */
[data-tpl="mobile-first-pwa"] .mf-glow {
  position: absolute; inset-inline: 0; top: 8%; height: 420px; z-index: -1;
  background:
    radial-gradient(300px 260px at 32% 40%, rgba(139, 92, 246, 0.28), transparent 70%),
    radial-gradient(260px 220px at 68% 60%, rgba(217, 70, 239, 0.2), transparent 70%);
  filter: blur(30px);
  pointer-events: none;
}

/* ── snap wheels ── */
[data-tpl="mobile-first-pwa"] .mf-wheel {
  display: flex; gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; -ms-overflow-style: none;
  padding-block: 4px;
}
[data-tpl="mobile-first-pwa"] .mf-wheel::-webkit-scrollbar { display: none; }

/* ── app atoms ── */
[data-tpl="mobile-first-pwa"] .mf-avatar {
  background: linear-gradient(135deg, #8B5CF6, #D946EF);
  box-shadow: 0 8px 22px -8px rgba(139, 92, 246, 0.8);
}
[data-tpl="mobile-first-pwa"] .mf-kicker-icon {
  background: linear-gradient(135deg, #8B5CF6, #D946EF);
  box-shadow: 0 6px 16px -6px rgba(139, 92, 246, 0.75);
}
[data-tpl="mobile-first-pwa"] .mf-kicker-hot {
  background: linear-gradient(135deg, #D946EF, #EF4444);
  box-shadow: 0 6px 16px -6px rgba(217, 70, 239, 0.75);
}
[data-tpl="mobile-first-pwa"] .mf-search { box-shadow: 0 14px 40px -22px rgba(139, 92, 246, 0.6); }
[data-tpl="mobile-first-pwa"] .mf-notice-card {
  border: 1px solid rgba(217, 70, 239, 0.25);
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.14), rgba(217, 70, 239, 0.08));
}
[data-tpl="mobile-first-pwa"] .mf-notice-dot { animation: mf-blink 1.6s ease-in-out infinite; }
@keyframes mf-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
[data-tpl="mobile-first-pwa"] .mf-banner { box-shadow: 0 18px 50px -24px rgba(139, 92, 246, 0.55); }

/* ── cards + buy buttons ── */
[data-tpl="mobile-first-pwa"] .mf-card { transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease; }
[data-tpl="mobile-first-pwa"] .mf-card:hover {
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 14px 34px -18px rgba(139, 92, 246, 0.55);
}
[data-tpl="mobile-first-pwa"] .mf-vip-card {
  border: 1px solid rgba(217, 70, 239, 0.25);
  background: linear-gradient(165deg, rgba(46, 34, 66, 0.8), rgba(22, 27, 38, 0.9));
}
[data-tpl="mobile-first-pwa"] .mf-buy {
  background-image: linear-gradient(100deg, #8B5CF6, #D946EF);
  box-shadow: 0 8px 20px -8px rgba(139, 92, 246, 0.75);
  background-size: 170% 100%;
  transition: background-position 0.45s ease, box-shadow 0.3s ease;
}
[data-tpl="mobile-first-pwa"] .mf-buy:hover { background-position: 90% 0; box-shadow: 0 10px 26px -8px rgba(217, 70, 239, 0.8); }
[data-tpl="mobile-first-pwa"] .mf-buy:disabled { cursor: not-allowed; }
[data-tpl="mobile-first-pwa"] .mf-hot-chip {
  background: linear-gradient(90deg, #EF4444, #D946EF);
  box-shadow: 0 4px 12px -4px rgba(217, 70, 239, 0.8);
}
[data-tpl="mobile-first-pwa"] .mf-chip {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}
[data-tpl="mobile-first-pwa"] .mf-chip:hover { background: rgba(139, 92, 246, 0.16); border-color: rgba(139, 92, 246, 0.45); }
[data-tpl="mobile-first-pwa"] .mf-stats { background: transparent; }
[data-tpl="mobile-first-pwa"] .mf-cat-tile { transition: border-color 0.3s ease, transform 0.3s ease; }
[data-tpl="mobile-first-pwa"] .mf-cat-tile:hover { border-color: rgba(139, 92, 246, 0.45); transform: translateY(-2px); }

@media (prefers-reduced-motion: reduce) {
  [data-tpl="mobile-first-pwa"] .mf-notice-dot { animation: none !important; }
}

/* ═══════════════ LIGHT-MODE SKIN (v26fix · additive only — dark rules above stay untouched) ═══════════════ */
html:not(.dark) [data-tpl="mobile-first-pwa"] {
  --background: #F4F7FB;
  --foreground: #1A2029;
  --card: #FFFFFF;
  --card-foreground: #1A2029;
  --muted: #E9EEF5;
  --muted-foreground: #566373;
  --border: rgba(26, 32, 41, 0.12);
  --input: rgba(26, 32, 41, 0.14);
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --accent: #E9EEF5;
  --accent-foreground: #1A2029;
  --popover: #FFFFFF;
  --popover-foreground: #1A2029;
  background-color: #F4F7FB;
  color: #1A2029;
}

/* ── app-bar chrome header retune → light app palette (dark rules above use !important, so must these) ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] {
  --background: #F4F7FB;
  --foreground: #1A2029;
  --card: #FFFFFF;
  --card-foreground: #1A2029;
  --muted: #E9EEF5;
  --muted-foreground: #566373;
  --border: rgba(26, 32, 41, 0.12);
  --input: rgba(26, 32, 41, 0.14);
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --popover: #FFFFFF;
  --popover-foreground: #1A2029;
  --accent: #E9EEF5;
  --accent-foreground: #1A2029;
  background-color: #F4F7FB !important;
  color: #1A2029;
}
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-100 { background-color: rgba(139, 92, 246, 0.12) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .hover\\:bg-violet-200:hover { background-color: rgba(139, 92, 246, 0.2) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/15 { background-color: rgba(139, 92, 246, 0.12) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .bg-violet-500\\/25 { background-color: rgba(139, 92, 246, 0.2) !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-700 { color: #6D28D9 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-600 { color: #7C3AED !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-400 { color: #7C3AED !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] [data-chrome-header] .text-violet-300 { color: #6D28D9 !important; }

/* ── the app column → light device surface ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-app {
  --background: #F4F7FB;
  --foreground: #1A2029;
  --card: #FFFFFF;
  --card-foreground: #1A2029;
  --muted: #E9EEF5;
  --muted-foreground: #566373;
  --border: rgba(26, 32, 41, 0.12);
  --input: rgba(26, 32, 41, 0.14);
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --popover: #FFFFFF;
  --popover-foreground: #1A2029;
  background-color: #FFFFFF;
  color: #1A2029;
}

/* ── surfaces & wells ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-\\[\\#161B26\\] { background-color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-\\[\\#0E1117\\] { background-color: #EEF2F8; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-\\[\\#0E1117\\]\\/85 { background-color: rgba(255, 255, 255, 0.9); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-white\\/\\[0\\.06\\] { background-color: rgba(26, 32, 41, 0.045); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-white\\/\\[0\\.03\\] { background-color: rgba(26, 32, 41, 0.03); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-white\\/30 { background-color: rgba(26, 32, 41, 0.28); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-slate-700 { background-color: #E2E8F0; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .\\!bg-slate-800 { background-color: #E3E9F2 !important; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .\\!text-slate-500 { color: #566373 !important; }

/* ── ink & muted slate text → ink scale ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-\\[\\#E6EAF2\\] { color: #1A2029; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .hover\\:text-\\[\\#E6EAF2\\]:hover { color: #1A2029; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-slate-200 { color: #475569; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-slate-300\\/80 { color: rgba(51, 65, 85, 0.8); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-slate-400 { color: #64748B; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-slate-500 { color: #566373; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-slate-600 { color: #6B7686; }

/* ── violet / fuchsia accents → light-readable (same hue families) ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-100 { color: #5B21B6; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-200 { color: #6D28D9; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-300 { color: #7C3AED; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-300\\/80 { color: rgba(124, 58, 237, 0.85); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-300\\/40 { color: rgba(124, 58, 237, 0.5); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-400\\/60 { color: rgba(124, 58, 237, 0.62); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-400\\/70 { color: rgba(124, 58, 237, 0.75); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-violet-400\\/80 { color: rgba(124, 58, 237, 0.85); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .group-hover\\:text-violet-300\\:is\\(\\:where\\(\\.group\\)\\:hover \\*\\) { color: #7C3AED; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .border-violet-400\\/30 { border-color: rgba(124, 58, 237, 0.35); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .hover\\:border-violet-400\\/50:hover { border-color: rgba(124, 58, 237, 0.5); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-fuchsia-300 { color: #C026D3; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-fuchsia-300\\/90 { color: rgba(192, 38, 211, 0.92); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-amber-400 { color: #B45309; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .fill-amber-400 { fill: #F59E0B; }

/* ── hairlines ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .border-white\\/10 { border-color: rgba(26, 32, 41, 0.12); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .md\\:border-white\\/10 { border-color: rgba(26, 32, 41, 0.12); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .border-white\\/\\[0\\.06\\] { border-color: rgba(26, 32, 41, 0.09); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .border-white\\/\\[0\\.07\\] { border-color: rgba(26, 32, 41, 0.1); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .border-white\\/\\[0\\.08\\] { border-color: rgba(26, 32, 41, 0.12); }
html:not(.dark) [data-tpl="mobile-first-pwa"] :where(.divide-white\\/\\[0\\.06\\] > :not(:last-child)) { border-color: rgba(26, 32, 41, 0.09); }

/* ── banner/showcase image veils → light veils (same geometry) ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .from-\\[\\#0E1117\\]\\/95 { --tw-gradient-from: rgba(244, 247, 251, 0.96); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .via-\\[\\#0E1117\\]\\/25 { --tw-gradient-via: rgba(244, 247, 251, 0.3); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .from-\\[\\#0E1117\\]\\/90 { --tw-gradient-from: rgba(244, 247, 251, 0.92); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .via-\\[\\#0E1117\\]\\/30 { --tw-gradient-via: rgba(244, 247, 251, 0.34); }

/* ── violet glows softened ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .md\\:shadow-\\[0_40px_120px_-40px_rgba\\(139\\,92\\,246\\,\\.45\\)\\] { --tw-shadow: 0 40px 120px -40px rgba(124, 58, 237, 0.3); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .drop-shadow-\\[0_0_8px_rgba\\(139\\,92\\,246\\,\\.8\\)\\] { --tw-drop-shadow: drop-shadow(0 0 8px rgba(124, 58, 237, 0.5)); }

/* ── .text-white blanket → ink; restored on gradient/violet surfaces that STAY colored ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .text-white { color: #1A2029; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-kicker-icon { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-avatar { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-buy { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-hot-chip { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-violet-500.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .from-fuchsia-500.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .bg-black\\/70.text-white { color: #FFFFFF; }
html:not(.dark) [data-tpl="mobile-first-pwa"] .fill-white { fill: #FFFFFF; }

/* ── scoped helper classes → light variants ── */
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-glow {
  background:
    radial-gradient(300px 260px at 32% 40%, rgba(139, 92, 246, 0.16), transparent 70%),
    radial-gradient(260px 220px at 68% 60%, rgba(217, 70, 239, 0.12), transparent 70%);
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-avatar { box-shadow: 0 8px 22px -8px rgba(124, 58, 237, 0.45); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-kicker-icon { box-shadow: 0 6px 16px -6px rgba(124, 58, 237, 0.4); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-kicker-hot { box-shadow: 0 6px 16px -6px rgba(217, 70, 239, 0.4); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-search { box-shadow: 0 14px 40px -22px rgba(124, 58, 237, 0.35); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-notice-card {
  border-color: rgba(217, 70, 239, 0.3);
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.1), rgba(217, 70, 239, 0.06));
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-banner { box-shadow: 0 18px 50px -24px rgba(124, 58, 237, 0.32); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-card:hover {
  border-color: rgba(124, 58, 237, 0.4);
  box-shadow: 0 14px 34px -18px rgba(124, 58, 237, 0.28);
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-vip-card {
  border-color: rgba(217, 70, 239, 0.3);
  background: linear-gradient(165deg, rgba(139, 92, 246, 0.07), rgba(255, 255, 255, 0.92));
}
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-buy { box-shadow: 0 8px 20px -8px rgba(124, 58, 237, 0.45); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-buy:hover { box-shadow: 0 10px 26px -8px rgba(217, 70, 239, 0.45); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-hot-chip { box-shadow: 0 4px 12px -4px rgba(217, 70, 239, 0.45); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-chip { border-color: rgba(26, 32, 41, 0.12); background: rgba(255, 255, 255, 0.72); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-chip:hover { background: rgba(139, 92, 246, 0.12); border-color: rgba(124, 58, 237, 0.45); }
html:not(.dark) [data-tpl="mobile-first-pwa"] .mf-cat-tile:hover { border-color: rgba(124, 58, 237, 0.45); }
`}</style>
    </div>
  );
}

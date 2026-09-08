"use client";

/**
 * TEMPLATE CHROME — the FIVE per-template MEGA MENU variants (v32 / 5-e)
 * -------------------------------------------------------------------
 * Replaces the single shared categories panel: every template family now
 * gets its own «دسته‌بندی‌ها» menu presentation, dispatched by
 * MegaMenuBody from the template's cfg.menuStyle (chrome/config.ts →
 * MEGA_MENU_STYLES for the full 25-template mapping):
 *
 *   tree             «درختی دیجی‌کالایی» — root-category rail on the
 *                    inline-start side (right in RTL); hovering a root
 *                    swaps its subcategory columns in 150ms.
 *   images           «تصویری بزرگ» — large image-led tiles in a 3–4 col
 *                    grid, name + count on a bottom gradient, hover zoom
 *                    (scale 1.05) + arrow slide-in.
 *   waterfall        «آبشاری» — masonry cascade of category cards with
 *                    staggered vertical offsets + gentle staggered fade-in.
 *   zoomfade         «زوم و محو» — collapsed vertical icon rail that
 *                    expands on hover (width transition); the category
 *                    content zooms in (scale .96→1 + fade) on each swap.
 *   waterfall-product «آبشاری + محصول کنار» — the cascade PLUS a side
 *                    panel (left edge in RTL) with a real featured product
 *                    (image, name, live prices, discount badge, tiny
 *                    «مشاهده» button).
 *
 * All five render the SAME data the old panel used (HomeData categories
 * with admin-managed images + branches, and brands) so admin image
 * management keeps flowing. The featured product of the fifth variant is
 * picked deterministically from the HomeData payload itself — the
 * discounted list is the products API's live-deal query (serializeProduct
 * pipeline: discount dead after its deadline, percent computed), and the
 * highest discountPercent wins (tie → newest, then featured best-seller)
 * — zero client fetches, no loading flash, always server-fresh.
 * Styling is pure token classes (bg-card / text-foreground / border-border
 * / accent classes) — the template canvas + chrome theme style them on
 * dark and light alike. CSS-only motion, one prefers-reduced-motion
 * kill-switch, 44px touch targets on chips, RTL-correct (logical
 * properties), Persian labels.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, ChevronLeft, Crown, Zap } from "lucide-react";
import type { HomeData, TemplateBrand, TemplateCategory, TemplateProduct } from "@/lib/templates/types";
import type { ChromeAccentClasses } from "./bits";
import type { MegaMenuStyle } from "./config";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ══ shared vocabulary ═══════════════════════════════════════════════ */

export type MegaVariantProps = {
  /** top-level categories (already sliced by the dispatcher) */
  cats: TemplateCategory[];
  /** store brands (already sliced by the dispatcher) */
  brands: TemplateBrand[];
  /** waterfall-product only: the deterministic featured product pick */
  product?: TemplateProduct | null;
  a?: ChromeAccentClasses;
  onDark?: boolean;
};

/** section heading + the «همه محصولات» shortcut (shared by all variants) */
function PanelHead({ a }: { a?: ChromeAccentClasses }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-muted-foreground">
        <LayoutGrid className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
        دسته‌بندی‌ها
      </p>
      <Link
        href="/products"
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
      >
        همه محصولات
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/** category photo or the designed letter fallback (admin-managed image) */
function CatThumb({
  c,
  className,
  imgClassName,
  sizes,
}: {
  c: TemplateCategory;
  className?: string;
  imgClassName?: string;
  sizes: string;
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-muted", className)}>
      {c.image ? (
        <Image src={c.image} alt={c.name} fill sizes={sizes} className={cn("object-cover", imgClassName)} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-b from-muted/70 to-muted/10 font-black text-muted-foreground/90">
          {c.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

/** branch chips under a category (children → category links, brands →
 *  filtered links). 44px touch targets per spec. */
function BranchChips({ c, a, align = "center", max = 4 }: { c: TemplateCategory; a?: ChromeAccentClasses; align?: "center" | "start"; max?: number }) {
  const branches = (c.branches ?? []).slice(0, max);
  if (branches.length === 0) return null;
  return (
    <div className={cn("mt-1.5 flex flex-wrap gap-1", align === "center" ? "justify-center" : "justify-start")}>
      {branches.map((b) => (
        <Link
          key={`${b.kind}-${b.slug}`}
          href={b.kind === "child" ? `/products?category=${b.slug}` : `/products?category=${c.slug}&brand=${b.slug}`}
          className={cn(
            "inline-flex min-h-11 max-w-full items-center truncate rounded-full border border-border/60 bg-muted/40 px-3.5 text-[11px] font-semibold leading-4 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          )}
        >
          {b.name}
        </Link>
      ))}
    </div>
  );
}

/** brands strip (logo chip + name) — the old panel's brand tiles, kept */
function BrandRow({ brands, a }: { brands: TemplateBrand[]; a?: ChromeAccentClasses }) {
  if (brands.length === 0) return null;
  return (
    <section aria-label="برندهای فروشگاه" className="border-t border-border/60 pt-3">
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-muted-foreground">
        <Crown className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
        برندها
      </p>
      <div className="grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-5 sm:grid-cols-6 lg:grid-cols-8">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/products?brand=${b.slug}`}
            className="group flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors hover:bg-muted/50"
          >
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted sm:h-10 sm:w-10">
              {b.logo || b.image ? (
                <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="40px" className="object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-[12px] font-black text-muted-foreground/90">
                  {b.name.charAt(0)}
                </span>
              )}
            </span>
            <span className="w-full truncate text-center text-[10.5px] font-bold leading-4 text-foreground">{b.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** bottom CTA — «مشاهده همه محصولات» */
function CtaBar({ a }: { a?: ChromeAccentClasses }) {
  return (
    <Link
      href="/products"
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[12.5px] font-black shadow-lg transition-all hover:-translate-y-0.5",
        a ? a.solid : "bg-primary text-primary-foreground"
      )}
    >
      مشاهده همه محصولات
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
    </Link>
  );
}

function EmptyCats() {
  return (
    <p className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
      دسته‌بندی‌ای برای نمایش وجود ندارد
    </p>
  );
}

/* ══ 1 · آبشاری — masonry cascade (shared by waterfall + waterfall-product) ══ */

function WaterfallColumns({ cats, a }: { cats: TemplateCategory[]; a?: ChromeAccentClasses }) {
  /* chunk round-robin into 4 column stacks — the CSS grid reflows them
   * 2/3/4-up per breakpoint while each column keeps its own cascade
   *  offset (the visible staggered vertical offsets of a waterfall).
   *  Compact horizontal cards keep the whole cascade inside the panel's
   *  scroll budget on desktop. */
  const cols: { c: TemplateCategory; i: number }[][] = [[], [], [], []];
  cats.forEach((c, i) => cols[i % 4].push({ c, i }));
  return (
    <div className="mm-wf-grid">
      {cols.map((col, k) => (
        <div key={k} className={cn("mm-wf-col", `mm-wf-k${k}`)}>
          {col.map(({ c, i }) => (
            <div key={c.id} className="mm-wf-tile" style={{ "--i": i } as CSSProperties}>
              <Link
                href={`/products?category=${c.slug}`}
                className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/70 bg-card/80 p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg"
              >
                <CatThumb
                  c={c}
                  sizes="(max-width: 420px) 96px, 88px"
                  className="h-16 w-16 shrink-0 rounded-xl border border-border/50"
                  imgClassName="transition-transform duration-300 group-hover:scale-110"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[12.5px] font-bold leading-5 text-foreground">{c.name}</span>
                  <span className="text-[10px] leading-4 tabular-nums text-muted-foreground">
                    {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                  </span>
                </span>
              </Link>
              <BranchChips c={c} a={a} align="start" max={2} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** آبشاری — cascading multi-column waterfall of category cards */
export function WaterfallMenu({ cats, brands, a }: MegaVariantProps) {
  return (
    <section aria-label="دسته‌بندی‌های فروشگاه" className="flex flex-col gap-3">
      <PanelHead a={a} />
      {cats.length > 0 ? <WaterfallColumns cats={cats} a={a} /> : <EmptyCats />}
      <BrandRow brands={brands} a={a} />
      <CtaBar a={a} />
    </section>
  );
}

/* ══ 2 · تصویری بزرگ — large image-led tiles ═════════════════════════ */

export function ImagesMenu({ cats, brands, a }: MegaVariantProps) {
  return (
    <section aria-label="دسته‌بندی‌های فروشگاه" className="flex flex-col gap-3">
      <PanelHead a={a} />
      {cats.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="mm-img-tile group relative block overflow-hidden rounded-2xl border border-border/70 bg-muted transition-all duration-300 hover:border-border hover:shadow-xl"
            >
              <span className="relative block aspect-[4/3] w-full">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 420px) 45vw, (max-width: 640px) 30vw, 280px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-gradient-to-b from-muted/70 to-muted/10 text-3xl font-black text-muted-foreground/90">
                    {c.name.charAt(0)}
                  </span>
                )}
              </span>
              {/* name + live count on a bottom gradient (over the photo —
                  readable on dark AND light templates alike) */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-8 text-white">
                <span className="truncate text-[13px] font-black leading-5 drop-shadow-sm">{c.name}</span>
                <span className="shrink-0 text-[10px] font-bold leading-4 tabular-nums text-white/85">
                  {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
                </span>
              </span>
              {/* hover: arrow slides in toward the caption corner */}
              <span className="mm-img-arrow" aria-hidden>
                <ChevronLeft className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyCats />
      )}
      <BrandRow brands={brands} a={a} />
      <CtaBar a={a} />
    </section>
  );
}

/* ══ 3 · درختی دیجی‌کالایی — root rail + subcategory columns ═════════ */

export function TreeMenu({ cats, brands, a }: MegaVariantProps) {
  const [activeId, setActiveId] = useState<string | null>(cats[0]?.id ?? null);
  const active = cats.find((c) => c.id === activeId) ?? cats[0];
  const children = (active?.branches ?? []).filter((b) => b.kind === "child");
  const brandBranches = (active?.branches ?? []).filter((b) => b.kind === "brand");

  return (
    <section aria-label="دسته‌بندی‌های فروشگاه" className="flex flex-col gap-3">
      <PanelHead a={a} />
      {cats.length === 0 ? (
        <EmptyCats />
      ) : (
        <div className="flex min-w-0 gap-3">
          {/* root rail — inline-START (first column on the RIGHT in RTL) */}
          <ul className="w-44 shrink-0 space-y-0.5 sm:w-52" aria-label="دسته‌بندی‌های اصلی">
            {cats.map((c) => {
              const isActive = c.id === active?.id;
              return (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.slug}`}
                    onMouseEnter={() => setActiveId(c.id)}
                    onFocus={() => setActiveId(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative flex min-h-11 min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-2 py-1.5 transition-colors",
                      isActive ? "bg-muted/70" : "hover:bg-muted/50"
                    )}
                  >
                    {/* slim highlighted active-root indicator */}
                    {isActive && (
                      <span className={cn("absolute inset-y-2 start-0 w-[3px] rounded-full", a ? a.dot : "bg-primary")} aria-hidden />
                    )}
                    <CatThumb c={c} sizes="48px" className="h-9 w-9 rounded-lg border border-border/60" />
                    <span className={cn("min-w-0 flex-1 truncate text-[12.5px] leading-5 text-foreground", isActive && "font-black")}>
                      {c.name}
                    </span>
                    <span className="shrink-0 text-[9.5px] leading-4 tabular-nums text-muted-foreground">
                      {toFaDigits(c.productCount.toLocaleString("fa-IR"))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* subcategory columns — swap smoothly (150ms) per hovered root */}
          <div className="mm-tree-pane min-w-0 flex-1 rounded-2xl border border-border/70 bg-background/50 p-3.5" key={active?.id ?? "none"}>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", a ? a.dot : "bg-primary")} aria-hidden />
                <span className="truncate text-[13px] font-black leading-5 text-foreground">{active?.name}</span>
                <span className="shrink-0 text-[10px] font-bold leading-4 tabular-nums text-muted-foreground">
                  {toFaDigits((active?.productCount ?? 0).toLocaleString("fa-IR"))} کالا
                </span>
              </p>
              {active && (
                <Link
                  href={`/products?category=${active.slug}`}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  مشاهده همه
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>

            {active && children.length + brandBranches.length > 0 ? (
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-0.5 lg:grid-cols-3">
                {children.map((b) => (
                  <Link
                    key={`child-${b.slug}`}
                    href={`/products?category=${b.slug}`}
                    className="group/sub flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="truncate text-[12px] font-bold leading-5 text-foreground">{b.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[9.5px] leading-4 tabular-nums text-muted-foreground">
                      {b.productCount != null ? toFaDigits(b.productCount.toLocaleString("fa-IR")) : ""}
                      <ChevronLeft className="h-3 w-3 opacity-0 transition-opacity group-hover/sub:opacity-70" aria-hidden />
                    </span>
                  </Link>
                ))}
                {brandBranches.length > 0 && (
                  <div className="col-span-1 rounded-xl border border-border/60 bg-muted/30 p-2.5 min-[420px]:col-span-2 lg:col-span-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-black tracking-wide text-muted-foreground">
                      <Crown className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
                      برندهای پرطرفدار {active.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {brandBranches.map((b) => (
                        <Link
                          key={`brand-${b.slug}`}
                          href={`/products?category=${active.slug}&brand=${b.slug}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-border/60 bg-card px-3.5 text-[11px] font-semibold leading-4 text-foreground transition-colors hover:border-foreground/30"
                        >
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              active && (
                <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-[11.5px] text-muted-foreground">
                  هنوز زیرشاخه‌ای برای این دسته ثبت نشده است —{" "}
                  <Link href={`/products?category=${active.slug}`} className="font-black text-primary hover:underline">
                    مشاهده محصولات {active.name}
                  </Link>
                </p>
              )
            )}
          </div>
        </div>
      )}
      <BrandRow brands={brands} a={a} />
      <CtaBar a={a} />
    </section>
  );
}

/* ══ 4 · زوم و محو — collapsible icon rail + zooming content ═════════ */

export function ZoomFadeMenu({ cats, brands, a }: MegaVariantProps) {
  const [activeId, setActiveId] = useState<string | null>(cats[0]?.id ?? null);
  const [wide, setWide] = useState(false);
  const active = cats.find((c) => c.id === activeId) ?? cats[0];

  return (
    <section
      aria-label="دسته‌بندی‌های فروشگاه"
      className="flex flex-col gap-3"
      onMouseEnter={() => setWide(true)}
      onMouseLeave={() => setWide(false)}
    >
      <PanelHead a={a} />
      {cats.length === 0 ? (
        <EmptyCats />
      ) : (
        <div className="flex min-w-0 items-start gap-3">
          {/* collapsed icon rail — expands (width transition) on hover */}
          <nav aria-label="دسته‌بندی‌های اصلی" className={cn("mm-zf-rail no-scrollbar shrink-0 space-y-0.5 overflow-y-auto", wide && "is-wide")}>
            {cats.map((c) => {
              const isActive = c.id === active?.id;
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  onMouseEnter={() => setActiveId(c.id)}
                  onFocus={() => setActiveId(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2 overflow-hidden rounded-xl px-1.5 py-1.5 transition-colors",
                    isActive ? "bg-muted/70" : "hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <span className={cn("absolute inset-y-2 start-0 w-[3px] rounded-full", a ? a.dot : "bg-primary")} aria-hidden />
                  )}
                  <CatThumb c={c} sizes="40px" className="h-10 w-10 rounded-xl border border-border/60" />
                  <span className="mm-zf-label min-w-0 flex-1 truncate text-[12px] font-bold leading-5 text-foreground">{c.name}</span>
                  <ChevronLeft className="mm-zf-caret h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              );
            })}
          </nav>

          {/* content — zooms in (scale .96→1 + fade) on every swap */}
          {active && (
            <div key={active.id} className="mm-zf-pane min-w-0 flex-1 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <div className="flex items-center gap-4">
                <CatThumb
                  c={active}
                  sizes="(min-width: 640px) 96px, 30vw"
                  className="hidden h-24 w-24 rounded-xl border border-border/60 sm:block"
                  imgClassName="transition-transform duration-500 hover:scale-105"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black leading-6 text-foreground">{active.name}</p>
                  <p className="text-[10.5px] leading-4 tabular-nums text-muted-foreground">
                    {toFaDigits(active.productCount.toLocaleString("fa-IR"))} کالا موجود
                  </p>
                  <BranchChips c={active} a={a} align="start" />
                </div>
              </div>
              <Link
                href={`/products?category=${active.slug}`}
                className={cn(
                  "mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl text-[12px] font-black transition-all hover:-translate-y-0.5",
                  a ? a.solid : "bg-primary text-primary-foreground"
                )}
              >
                مشاهده محصولات این دسته
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      )}
      <BrandRow brands={brands} a={a} />
    </section>
  );
}

/* ══ 5 · آبشاری + محصول کنار — waterfall + featured product panel ════ */

/** deterministic featured-product pick from the panel's OWN payload:
 *  highest live discount in data.discounted (ties → the newer, which is
 *  how the list is ordered); no live deals → the top featured product
 *  (featured best-seller, exactly what the storefront badge shows). */
export function pickMegaProduct(data: HomeData): TemplateProduct | null {
  const deals = data.discounted ?? [];
  let best: TemplateProduct | null = null;
  for (const p of deals) {
    if (p.discountPercent > 0 && (!best || p.discountPercent > best.discountPercent)) best = p;
  }
  return best ?? data.featured[0] ?? null;
}

function ProductSidePanel({ product, a }: { product: TemplateProduct | null; a?: ChromeAccentClasses }) {
  if (!product) return null;
  return (
    <aside aria-label="پیشنهاد ویژه" className="w-full shrink-0 rounded-2xl border border-border/70 bg-background/60 p-3 lg:sticky lg:top-0 lg:w-64">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-muted-foreground">
        <Zap className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
        پیشنهاد ویژه
      </p>
      <Link href={`/products/${product.slug}`} className="group block">
        <span className="relative block aspect-square w-full overflow-hidden rounded-xl border border-border/50 bg-muted">
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 256px, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-3xl font-black text-muted-foreground/90">
              {product.name.charAt(0)}
            </span>
          )}
          {product.discountPercent > 0 && (
            <span className="absolute start-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black leading-4 text-white shadow">
              {toFaDigits(product.discountPercent)}٪ تخفیف
            </span>
          )}
        </span>
        <span className="mt-2.5 block truncate text-[13px] font-black leading-5 text-foreground">{product.name}</span>
        {product.brand?.name && <span className="mt-0.5 block truncate text-[10.5px] leading-4 text-muted-foreground">{product.brand.name}</span>}
        <span className="mt-1.5 flex items-baseline justify-between gap-2">
          {product.discountPrice ? (
            <>
              <span className="text-[13px] font-black leading-5 tabular-nums text-rose-600 dark:text-rose-400">
                {formatPrice(product.discountPrice)} <span className="text-[9.5px] font-bold">تومان</span>
              </span>
              <span className="text-[10px] leading-4 text-muted-foreground line-through tabular-nums">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="text-[12.5px] font-black leading-5 tabular-nums text-foreground">
              {formatPrice(product.price)} <span className="text-[9.5px] font-bold">تومان</span>
            </span>
          )}
        </span>
      </Link>
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          "mt-2.5 flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[11.5px] font-black transition-all hover:-translate-y-0.5",
          a ? a.solid : "bg-primary text-primary-foreground"
        )}
      >
        مشاهده
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </aside>
  );
}

export function WaterfallProductMenu({ cats, brands, product = null, a }: MegaVariantProps) {
  return (
    /* RTL: the waterfall column (first child) sits on the right, the
       product side panel (last child) hugs the LEFT edge on lg screens */
    <section aria-label="دسته‌بندی‌های فروشگاه و پیشنهاد ویژه" className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <PanelHead a={a} />
        {cats.length > 0 ? <WaterfallColumns cats={cats} a={a} /> : <EmptyCats />}
        <BrandRow brands={brands} a={a} />
        <CtaBar a={a} />
      </div>
      <ProductSidePanel product={product} a={a} />
    </section>
  );
}

/* ══ scoped CSS (mm-*) — one block, reduced-motion kill-switch ═══════ */

const MM_CSS = `
/* آبشاری — masonry column stacks + per-column cascade offsets +
   staggered fade-in per tile */
.mm-wf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;align-items:start}
@media(min-width:640px){.mm-wf-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1024px){.mm-wf-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.mm-wf-col{display:flex;flex-direction:column;gap:.75rem;min-width:0}
/* the cascade — tuned per breakpoint so the wrap NEVER leaves holes:
   2-col (2×2 wrap): staggered PAIRS 0/24/0/24 (each row reads as an offset pair)
   3-col (3+1 wrap): cascade across row 1 (0/24/48), wrapped column flush at 0
   4-col (single row): the full waterfall 0/24/48/72 */
.mm-wf-k1{margin-top:1.5rem}
.mm-wf-k2{margin-top:0}
.mm-wf-k3{margin-top:1.5rem}
@media(min-width:640px){.mm-wf-k1{margin-top:1.5rem}.mm-wf-k2{margin-top:3rem}.mm-wf-k3{margin-top:0}}
@media(min-width:1024px){.mm-wf-k1{margin-top:1.5rem}.mm-wf-k2{margin-top:3rem}.mm-wf-k3{margin-top:4.5rem}}
.mm-wf-tile{animation:mm-rise .5s cubic-bezier(.2,.7,.3,1) both;animation-delay:calc(var(--i,0)*45ms)}
@keyframes mm-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
/* تصویری بزرگ — hover arrow slides in from the inline-end corner */
.mm-img-arrow{position:absolute;top:.6rem;inset-inline-end:.6rem;display:flex;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:9999px;background:rgba(255,255,255,.95);color:#0f172a;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);opacity:0;transform:translateX(-.5rem) scale(.9);transition:opacity .25s ease,transform .25s ease}
.mm-img-tile:hover .mm-img-arrow{opacity:1;transform:none}
/* درختی — 150ms pane swap (slides in from the left of the rail in RTL) */
.mm-tree-pane{animation:mm-swap .15s ease-out both}
@keyframes mm-swap{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
/* زوم و محو — rail width expansion + content zoom-in */
.mm-zf-rail{width:4.5rem;transition:width .3s cubic-bezier(.2,.7,.3,1)}
.mm-zf-rail.is-wide{width:12rem}
.mm-zf-rail .mm-zf-label,.mm-zf-rail .mm-zf-caret{opacity:0;transition:opacity .22s ease .04s;white-space:nowrap}
.mm-zf-rail.is-wide .mm-zf-label,.mm-zf-rail.is-wide .mm-zf-caret{opacity:1}
.mm-zf-pane{animation:mm-zoom .28s cubic-bezier(.2,.7,.3,1) both}
@keyframes mm-zoom{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
/* بستن پنل — zoom OUT + fade (the close counterpart of every open).
   Set on the shell by ChromeHeaderNav while the panel plays its exit; the
   enter animation (animate-in) is overridden by this higher-specificity
   attribute rule for the 180ms the node stays mounted. */
#chrome-mega-panel[data-closing="true"]{animation:mm-out .18s ease-in both}
@keyframes mm-out{to{opacity:0;transform:scale(.97) translateY(-4px)}}
/* kill-switch */
@media (prefers-reduced-motion:reduce){
  .mm-wf-tile,.mm-tree-pane,.mm-zf-pane{animation:none}
  #chrome-mega-panel[data-closing="true"]{animation:none}
  .mm-zf-rail{transition:none}
  .mm-zf-rail .mm-zf-label,.mm-zf-rail .mm-zf-caret{transition:none}
  .mm-img-tile .mm-img-arrow{transition:none}
}
`;

/* ══ the dispatcher — rendered by ChromeCategoriesPanel (bits.tsx) ════ */

export function MegaMenuBody({
  menuStyle,
  data,
  a,
  onDark,
}: {
  menuStyle?: MegaMenuStyle;
  data: HomeData;
  a?: ChromeAccentClasses;
  onDark?: boolean;
}) {
  const style: MegaMenuStyle = menuStyle ?? "tree";
  /* 8 brands = exactly one logo row at lg (keeps every variant inside the
   *  panel's scroll budget); 10 categories as before. */
  const shared: MegaVariantProps = {
    cats: data.categories.slice(0, 10),
    brands: data.brands.slice(0, 8),
    product: style === "waterfall-product" ? pickMegaProduct(data) : undefined,
    a,
    onDark,
  };
  let body: ReactNode;
  switch (style) {
    case "images":
      body = <ImagesMenu {...shared} />;
      break;
    case "waterfall":
      body = <WaterfallMenu {...shared} />;
      break;
    case "zoomfade":
      body = <ZoomFadeMenu {...shared} />;
      break;
    case "waterfall-product":
      body = <WaterfallProductMenu {...shared} />;
      break;
    case "tree":
    default:
      body = <TreeMenu {...shared} />;
      break;
  }
  return (
    <>
      <style data-mm-style={style} dangerouslySetInnerHTML={{ __html: MM_CSS }} />
      {body}
    </>
  );
}

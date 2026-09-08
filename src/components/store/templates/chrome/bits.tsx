"use client";

/**
 * TEMPLATE CHROME KIT — shared atoms (v18, duo-mode in v19)
 * ----------------------------------------
 * Building blocks for the per-template bespoke Header/Footer pair that
 * every non-default storefront template now renders (the template root
 * carries [data-template-chrome] which suppresses the shared storefront
 * chrome on the homepage only — see globals.css).
 *
 * Rules of the kit:
 * - Base surfaces ride the theme tokens (bg-background / bg-card /
 *   bg-foreground…) so all 6 color themes × light/dark keep composing;
 *   per-template ACCENT classes add the personality (same freedom the
 *   v15/v16 template bodies already use, e.g. violet/lime flourishes).
 * - v19 DUO MODE: every chrome header carries a light/dark toggle (next-themes);
 *   "dark"-tinted chrome flips to an elevated token surface when the site
 *   itself goes dark so it never becomes a blinding light bar.
 * - Only REAL data: store settings, live categories (with representative
 *   photos), live brands (photo chips), live cart count, real routes.
 * - The Alaruz Design credit (store-owner requirement) is baked into the
 *   shared footer credit atom — prominent and impossible to drop.
 * - Everything moves tastefully: marquee tickers, breathing dots and
 *   hover lifts — all neutralized by prefers-reduced-motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ShoppingCart, User, Search, Phone, Megaphone, Package, Crown, Sun, Moon,
  ChevronDown, ChevronLeft, Plus, Minus, Trash2, LayoutGrid,
} from "lucide-react";
import type { HomeData, TemplateCategory, TemplateBrand, TemplateStore } from "@/lib/templates/types";
import type { MegaMenuStyle } from "./config";
import { MegaMenuBody } from "./mega-menus";
import { useCart, useMe, type CartItemDTO } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ── Accent vocabulary (static Tailwind strings only) ─────────────── */

export type ChromeAccent =
  | "primary" | "violet" | "lime" | "amber" | "orange"
  | "rose" | "cyan" | "emerald" | "neutral";

export type ChromeAccentClasses = {
  solid: string;
  soft: string;
  softHover: string;
  text: string;
  border: string;
  dot: string;
  ring: string;
  edge: string;
};

export const ACCENT_CLASSES: Record<ChromeAccent, ChromeAccentClasses> = {
  primary: {
    solid: "bg-primary text-primary-foreground hover:opacity-90",
    soft: "bg-primary/10 text-primary dark:bg-primary/15",
    softHover: "hover:bg-primary/20 dark:hover:bg-primary/25",
    text: "text-primary",
    border: "border-primary/40 dark:border-primary/50",
    dot: "bg-primary",
    ring: "shadow-lg shadow-primary/20",
    edge: "bg-gradient-to-b from-primary to-primary/60",
  },
  violet: {
    solid: "bg-violet-600 text-white hover:bg-violet-700",
    soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    softHover: "hover:bg-violet-200 dark:hover:bg-violet-500/25",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-300 dark:border-violet-400/40",
    dot: "bg-violet-500",
    ring: "shadow-lg shadow-violet-600/25",
    edge: "bg-gradient-to-b from-violet-500 to-violet-700",
  },
  lime: {
    solid: "bg-lime-400 text-lime-950 hover:bg-lime-300",
    soft: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
    softHover: "hover:bg-lime-200 dark:hover:bg-lime-400/25",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-300 dark:border-lime-400/40",
    dot: "bg-lime-400",
    ring: "shadow-lg shadow-lime-500/25",
    edge: "bg-gradient-to-b from-lime-400 to-lime-600",
  },
  amber: {
    solid: "bg-amber-500 text-amber-950 hover:bg-amber-400",
    soft: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    softHover: "hover:bg-amber-200 dark:hover:bg-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-400/40",
    dot: "bg-amber-500",
    ring: "shadow-lg shadow-amber-500/25",
    edge: "bg-gradient-to-b from-amber-400 to-amber-600",
  },
  orange: {
    solid: "bg-orange-500 text-white hover:bg-orange-600",
    soft: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    softHover: "hover:bg-orange-200 dark:hover:bg-orange-500/25",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-400/40",
    dot: "bg-orange-500",
    ring: "shadow-lg shadow-orange-500/25",
    edge: "bg-gradient-to-b from-orange-400 to-orange-600",
  },
  rose: {
    solid: "bg-rose-500 text-white hover:bg-rose-600",
    soft: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    softHover: "hover:bg-rose-200 dark:hover:bg-rose-500/25",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-400/40",
    dot: "bg-rose-500",
    ring: "shadow-lg shadow-rose-500/25",
    edge: "bg-gradient-to-b from-rose-400 to-rose-600",
  },
  cyan: {
    solid: "bg-cyan-500 text-cyan-950 hover:bg-cyan-400",
    soft: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    softHover: "hover:bg-cyan-200 dark:hover:bg-cyan-500/25",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-300 dark:border-cyan-400/40",
    dot: "bg-cyan-500",
    ring: "shadow-lg shadow-cyan-500/25",
    edge: "bg-gradient-to-b from-cyan-400 to-cyan-600",
  },
  emerald: {
    solid: "bg-emerald-500 text-white hover:bg-emerald-600",
    soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    softHover: "hover:bg-emerald-200 dark:hover:bg-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-400/40",
    dot: "bg-emerald-500",
    ring: "shadow-lg shadow-emerald-500/25",
    edge: "bg-gradient-to-b from-emerald-400 to-emerald-600",
  },
  neutral: {
    solid: "bg-foreground text-background hover:opacity-90",
    soft: "bg-muted text-foreground",
    softHover: "hover:bg-muted/70",
    text: "text-foreground",
    border: "border-border",
    dot: "bg-foreground",
    ring: "shadow-lg shadow-foreground/15",
    edge: "bg-gradient-to-b from-foreground to-foreground/70",
  },
};

/* ── Surface treatments ───────────────────────────────────────────── */

export type ChromeTint = "light" | "dark" | "glass" | "elevated" | "theme";

/** v24: a template's own canvas colors — the chrome paints itself with
 *  these so the header/footer are the SAME COLOR as the theme body. */
export type ChromePalette = { bg: string; fg: string };

/** Inverted ("dark") chrome sits on bg-foreground like the shared footer.
 *  v19 "elevated": used when the site itself is DARK — a "dark"-tinted
 *  chrome becomes a raised token surface instead of inverting to a light
 *  bar (bg-foreground is LIGHT in dark mode, which would look wrong).
 *  v24 "theme": no classes at all — the surface colors come from inline
 *  style vars (see themeChromeStyle) matching the template palette. */
export function chromeSurface(tint: ChromeTint) {
  switch (tint) {
    case "dark":
      return "bg-foreground text-background border-white/10";
    case "glass":
      return "bg-card/75 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 border-border/60";
    case "elevated":
      return "bg-card text-card-foreground border-border";
    case "theme":
      return "";
    default:
      return "bg-background text-foreground border-border";
  }
}

/* ── v24: theme-palette color math (pure, client-safe) ────────────── */

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function isDarkColor(color: string): boolean {
  // CSS vars / non-hex values → assume a light surface (safe default)
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** linear blend a→b by ratio (0 = a, 1 = b); falls back to `b` on bad hex */
function mixHex(a: string, b: string, ratio: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return b;
  const t = Math.max(0, Math.min(1, ratio));
  return `#${toHex(ra[0] + (rb[0] - ra[0]) * t)}${toHex(ra[1] + (rb[1] - ra[1]) * t)}${toHex(ra[2] + (rb[2] - ra[2]) * t)}`;
}

/** #RRGGBB → rgba(r,g,b,a) (invalid → gray alpha) */
function hexAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(128,128,128,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/** Resolve the effective chrome palette: admin override colors win over
 *  the template's designed palette; a missing fg auto-contrasts with bg. */
export function resolveChromePalette(
  cfgPalette?: ChromePalette,
  ov?: { bg?: string; fg?: string }
): ChromePalette | null {
  const bg = (ov?.bg ?? "").trim() || cfgPalette?.bg || "";
  if (!bg) return null;
  const fg = (ov?.fg ?? "").trim() || cfgPalette?.fg || (isDarkColor(bg) ? "#F5F5F5" : "#111111");
  return { bg, fg };
}

/* ── v24: admin-override vocabularies (validated enums) ────────────── */

export const CHROME_ACCENTS = ["cyan", "violet", "rose", "amber", "orange", "lime", "emerald", "neutral", "primary"] as const;
export const CHROME_LOGOS = ["square", "round", "wordmark", "mono"] as const;
export const CHROME_ROWS = ["photos", "chips", "none"] as const;

/** pick a validated enum value from an untrusted admin string */
export function pickEnum<T extends readonly string[]>(
  list: T,
  value: unknown,
  fallback: T[number] | undefined
): T[number] | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

/** Inline colors + remapped CSS custom props that paint a chrome surface
 *  in the template palette (or the admin's custom colors). Token-based
 *  utilities INSIDE the chrome resolve consistently:
 *   - text-foreground / border-border / bg-card → palette-derived
 *   - text-background/xx sub-text → translucent ink (readable on the bg) */
export function themeChromeStyle(bg: string, fg: string): CSSProperties {
  const dark = isDarkColor(bg);
  const card = dark ? mixHex(bg, "#FFFFFF", 0.08) : mixHex(bg, "#000000", 0.045);
  const border = hexAlpha(fg, dark ? 0.16 : 0.14);
  const muted = mixHex(fg, bg, 0.42);
  return {
    backgroundColor: bg,
    color: fg,
    "--background": dark ? fg : bg,
    "--foreground": fg,
    "--card": card,
    "--border": border,
    "--muted-foreground": muted,
  } as CSSProperties;
}

/* ── Logo ─────────────────────────────────────────────────────────── */

export function ChromeLogo({
  store,
  style = "square",
  a,
  onDark,
  compact,
  mark,
}: {
  store: HomeData["store"];
  style?: "square" | "round" | "wordmark" | "mono";
  a?: ChromeAccentClasses;
  onDark?: boolean;
  compact?: boolean;
  /** v29: admin-uploaded brand logo — replaces the designed letter-mark
   *  (square/round show it as the emblem; wordmark/mono get a compact
   *  image chip beside the text). null = the template's own design. */
  mark?: string | null;
}) {
  const initial = store.storeName.trim().charAt(0) || "T";
  const img = mark || null;

  if (style === "wordmark") {
    return (
      <span className="flex items-center gap-2.5">
        {img && (
          <img
            src={img}
            alt={`${store.storeName} logo`}
            className={cn("shrink-0 object-contain", compact ? "h-9 w-9" : "h-11 w-11 md:h-12 md:w-12")}
          />
        )}
        <span className="flex flex-col items-center leading-none">
          <span className={cn("font-black tracking-tight", compact ? "text-lg" : "text-2xl md:text-3xl")}>
            {store.storeName}
          </span>
          <span dir="ltr" className={cn("mt-1 font-mono text-[9px] tracking-[0.35em]", onDark ? "text-background/50" : "text-muted-foreground")}>
            {store.storeNameEn || "TAJ"}
          </span>
        </span>
      </span>
    );
  }

  if (style === "mono") {
    return (
      <span className="flex items-center gap-2.5">
        {img && (
          <img
            src={img}
            alt={`${store.storeName} logo`}
            className={cn("shrink-0 object-contain", compact ? "h-8 w-8" : "h-9 w-9")}
          />
        )}
        <span className="flex flex-col leading-none" dir="ltr">
          <span className={cn("font-mono font-black uppercase tracking-[0.2em]", compact ? "text-sm" : "text-lg")}>
            {store.storeNameEn || "TAJ"}
          </span>
          <span className="mt-1 text-[9px] font-bold" dir="rtl">
            {store.storeName}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "grid place-items-center overflow-hidden border-2 font-black",
          style === "round" ? "rounded-full" : "rounded-xl",
          compact ? "h-10 w-10 text-base" : "h-11 w-11 text-lg md:h-12 md:w-12 md:text-xl",
          a ? a.border : "border-border",
          onDark ? "bg-white/10 text-background" : "bg-card text-foreground"
        )}
      >
        {img ? (
          <img src={img} alt={`${store.storeName} logo`} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn("font-black tracking-tight", compact ? "text-[15px]" : "text-base md:text-lg")}>
          {store.storeName}
        </span>
        <span dir="ltr" className={cn("font-mono text-[9px] tracking-[0.25em]", onDark ? "text-background/50" : "text-muted-foreground")}>
          {store.storeNameEn || "TAJ"}
        </span>
      </span>
    </span>
  );
}

/* ── Search (real GET form → /products?q=…) ───────────────────────── */

export function ChromeSearch({
  mode = "pill",
  a,
  onDark,
  className,
}: {
  mode?: "wide" | "pill" | "icon";
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
}) {
  if (mode === "icon") {
    return (
      <Link
        href="/products"
        aria-label="جستجوی محصولات"
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95",
          onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
          a && a.text
        )}
      >
        <Search className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  return (
    <form
      action="/products"
      method="get"
      role="search"
      aria-label="جستجوی محصولات فروشگاه"
      className={cn(
        "flex items-center gap-2",
        mode === "wide" ? "h-12 flex-1 rounded-2xl" : "h-11 w-full rounded-full md:w-56 lg:w-72",
        "border px-4",
        onDark ? "border-white/15 bg-white/10" : "border-border bg-card",
        className
      )}
    >
      <Search className={cn("h-4.5 w-4.5 shrink-0", a ? a.text : "text-muted-foreground")} aria-hidden />
      <input
        type="search"
        name="q"
        placeholder="جستجوی محصول، برند یا دسته‌بندی…"
        aria-label="عبارت جستجو"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none",
          "placeholder:text-muted-foreground/70",
          onDark ? "text-background placeholder:text-background/40" : "text-foreground"
        )}
      />
      <button
        type="submit"
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black transition-all active:scale-95",
          a ? a.solid : "bg-primary text-primary-foreground"
        )}
      >
        بگرد
      </button>
    </form>
  );
}

/* ── Cart (live count badge; v23 popover mini-cart for app-like chrome) ── */

/** v23 compact mini-cart row for the popover — same useCart mutations as the
 *  side drawer, denser presentation (image, name, qty stepper, line total). */
function CartPopRow({
  item,
  onUpdate,
  onRemove,
  busy,
}: {
  item: CartItemDTO;
  onUpdate: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const atMax = item.stock > 0 && item.quantity >= item.stock;
  return (
    <div className="flex gap-2.5 border-b border-border/60 p-2.5 last:border-0">
      <Link
        href={`/products/${item.slug}`}
        aria-label={item.name}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted/60"
      >
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="56px" className="object-contain p-1" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <Package className="h-5 w-5" aria-hidden />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1.5">
          <Link
            href={`/products/${item.slug}`}
            className="line-clamp-2 text-[11.5px] font-bold leading-4 transition-colors hover:text-primary"
          >
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={busy}
            aria-label={`حذف ${item.name} از سبد`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {/* quantity stepper — min 1, max real stock (same rules as the drawer) */}
          <div className="flex h-7 items-center rounded-lg border bg-background" role="group" aria-label="تعداد">
            <button
              type="button"
              onClick={() => onUpdate(item.id, item.quantity - 1)}
              disabled={busy || item.quantity <= 1}
              aria-label="کاهش تعداد"
              className="grid h-full w-7 place-items-center rounded-s-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Minus className="h-3 w-3" aria-hidden />
            </button>
            <span className="w-7 text-center text-[11px] font-bold tabular-nums">
              {item.quantity.toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              onClick={() => onUpdate(item.id, item.quantity + 1)}
              disabled={busy || atMax || !item.inStock}
              aria-label="افزایش تعداد"
              className="grid h-full w-7 place-items-center rounded-e-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <div className="text-end leading-4">
            {item.oldUnitPrice && (
              <p className="price-old text-[9.5px] tabular-nums text-muted-foreground">
                {formatPrice(item.oldUnitPrice)}
              </p>
            )}
            <p className="text-[12px] font-extrabold tabular-nums text-primary">
              {formatPrice(item.lineTotal)}
              <span className="text-[9px] font-normal text-muted-foreground"> تومان</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** v23: the basket button as a mini-cart POPOVER anchored under the icon
 *  (HeaderCfg.cartStyle "popover" — app-like templates). Pure presentation
 *  on top of the SAME useCart hook the side drawer uses — identical query
 *  cache + update/remove mutations, no duplicated cart logic. */
function ChromeCartPopover({
  a,
  onDark,
  className,
}: {
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { cart, isLoading, update, remove } = useCart();
  const items = cart?.items ?? [];
  const count = cart?.summary.itemCount ?? 0;
  const totals = cart?.totals;
  const busy = update.isPending || remove.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `سبد خرید — ${toFaDigits(count.toLocaleString("fa-IR"))} کالا (نمایش سریع)` : "سبد خرید (نمایش سریع)"}
          className={cn(
            "relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95",
            onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
            a && a.text,
            className
          )}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {count > 0 && (
            <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-black text-white animate-badge-pop">
              {toFaDigits(count.toLocaleString("fa-IR"))}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={10}
        aria-label="سبد خرید سریع"
        className={cn("w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl p-0 shadow-2xl", a && a.border)}
      >
        {/* head */}
        <div className="flex items-center gap-2.5 border-b p-3.5">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", a ? a.soft : "bg-primary/10 text-primary")}>
            <ShoppingCart className="h-4 w-4" aria-hidden />
          </span>
          <p className="flex flex-col leading-5">
            <span className="text-[13px] font-extrabold">سبد خرید شما</span>
            <span className="text-[10.5px] text-muted-foreground">
              {count > 0 ? `${toFaDigits(count.toLocaleString("fa-IR"))} قلم کالا` : "سبد خرید خالی است"}
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-3.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-4/5 rounded" />
                  <Skeleton className="h-3 w-2/5 rounded" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <ShoppingCart className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-[12.5px] font-extrabold">سبد خرید خالی است</p>
            <p className="text-[11px] leading-5 text-muted-foreground">هنوز محصولی به سبد اضافه نکرده‌اید.</p>
            <Button asChild size="sm" className={cn("mt-1.5 h-9 rounded-xl font-bold", a ? a.solid : null)}>
              <Link href="/products" onClick={() => setOpen(false)}>مشاهده محصولات</Link>
            </Button>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {items.map((item) => (
              <CartPopRow
                key={item.id}
                item={item}
                busy={busy}
                onUpdate={(id, quantity) => update.mutate({ id, quantity })}
                onRemove={(id) => remove.mutate(id)}
              />
            ))}
          </div>
        )}

        {items.length > 0 && totals && (
          <div className="space-y-2.5 border-t bg-muted/40 p-3.5">
            <div className="space-y-1 text-[11.5px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>جمع کالاها ({toFaDigits(count.toLocaleString("fa-IR"))} قلم)</span>
                <span className="tabular-nums">{formatPrice(totals.subtotal)} تومان</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-destructive">
                  <span>تخفیف</span>
                  <span className="tabular-nums">− {formatPrice(totals.discount)} تومان</span>
                </div>
              )}
              {totals.coupon?.valid && totals.coupon.discount > 0 && (
                <div className="flex items-center justify-between text-destructive">
                  <span>کوپن تخفیف</span>
                  <span className="tabular-nums">− {formatPrice(totals.coupon.discount)} تومان</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-1.5 text-[13px] font-extrabold">
                <span>مبلغ قابل پرداخت</span>
                <span className={cn("tabular-nums", a ? a.text : "text-primary")}>
                  {formatPrice(totals.total)}
                  <span className="text-[9px] font-normal text-muted-foreground"> تومان</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="h-9 rounded-xl font-bold">
                <Link href="/cart" onClick={() => setOpen(false)}>مشاهده سبد</Link>
              </Button>
              <Button asChild size="sm" className={cn("h-9 rounded-xl font-bold", a ? a.solid : null)}>
                <Link href="/checkout" onClick={() => setOpen(false)}>تسویه حساب</Link>
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ChromeCart({
  a,
  onDark,
  className,
  cartStyle = "drawer",
}: {
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
  /** v23: "popover" — the basket opens a mini-cart popover under the icon
   *  (app-like templates). "drawer" (default) keeps today's behavior — the
   *  Link to /cart with the live badge (shared storefront header keeps its
   *  side-opening Sheet drawer, untouched). */
  cartStyle?: "drawer" | "popover";
}) {
  const { cart } = useCart();
  const count = cart?.summary.itemCount ?? 0;

  if (cartStyle === "popover") {
    return <ChromeCartPopover a={a} onDark={onDark} className={className} />;
  }

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `سبد خرید — ${toFaDigits(count.toLocaleString("fa-IR"))} کالا` : "سبد خرید"}
      className={cn(
        "relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95",
        onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
        a && a.text,
        className
      )}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black text-white animate-badge-pop bg-destructive">
          {toFaDigits(count.toLocaleString("fa-IR"))}
        </span>
      )}
    </Link>
  );
}

/* ── Account / Theme toggle ─────────────────────────────────────── */

const emptySubscribe = () => () => {};

/** v19: light/dark mode switch for every template chrome — flips the same
 *  next-themes class the shared header uses, persisted per visitor. */
export function ChromeThemeToggle({
  a,
  onDark,
  className,
}: {
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // hydration-safe "mounted" flag without setState-in-effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const isDark = mounted ? (resolvedTheme ?? "light") === "dark" : false;
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "روشن کردن تم (حالت روشن)" : "تاریک کردن تم (حالت تاریک)"}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95",
        onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
        a && a.text,
        className
      )}
    >
      <span className="relative grid h-5 w-5 place-items-center">
        <Sun className={cn("h-5 w-5 transition-all duration-300", isDark ? "scale-100 rotate-0" : "absolute scale-0 -rotate-90")} aria-hidden />
        <Moon className={cn("h-5 w-5 transition-all duration-300", isDark ? "absolute scale-0 rotate-90" : "scale-100 rotate-0")} aria-hidden />
      </span>
    </button>
  );
}

export function ChromeAccount({
  a,
  onDark,
  className,
}: {
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
}) {
  /* v31 (gaming-cyber ask, applied kit-wide): logged-in visitors see their
   * REAL avatar + first name — the exact same /api/auth/me session hook
   * the shared storefront header uses (useMe → react-query, client-side,
   * 60s staleTime, cache shared with the storefront header). Anonymous
   * visitors keep the plain login icon link. SSR/hydration render the
   * anonymous icon (query starts unset), then the avatar swaps in. */
  const { data } = useMe();
  const user = data?.user;

  if (!user) {
    return (
      <Link
        href="/account"
        aria-label="حساب کاربری من"
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95",
          onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
          a && a.text,
          className
        )}
      >
        <User className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim() || "ت";

  return (
    <Link
      href="/account"
      aria-label={`حساب کاربری ${user.firstName ?? ""}`.trim()}
      className={cn(
        "group flex h-11 shrink-0 items-center gap-2.5 rounded-full ps-1.5 pe-3.5 transition-all hover:-translate-y-0.5 active:scale-95",
        onDark ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/60",
        a && a.text,
        className
      )}
    >
      {/* neon gradient ring — subtle scale + glow bloom on hover */}
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 p-[2px] shadow-[0_0_10px_rgba(168,85,247,.35)] transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_16px_rgba(168,85,247,.65)]">
        <Avatar className="h-full w-full rounded-full border-0 bg-background/85">
          <AvatarImage src={user.avatar ?? undefined} alt="" />
          <AvatarFallback className="bg-transparent text-[11px] font-black">{initials}</AvatarFallback>
        </Avatar>
      </span>
      <span className="hidden max-w-24 truncate text-xs font-bold sm:block">
        {user.firstName}
      </span>
    </Link>
  );
}

/* ── Announcement ticker (moving marquee — "alive") ───────────────── */

export type TickerMessage = { text: string; link?: string | null };

/** v20: the ticker rotates the admin-managed marquee message list (Settings
 *  → فروشگاه → پیام‌های نوار متحرک); when the list is empty it falls back
 *  to the single announcement message. Every message rides the same
 *  seamless infinite loop. */
export function resolveTickerMessages(
  store: Pick<TemplateStore, "announcement" | "announcementActive" | "announcementLink" | "tickerMessages">
): TickerMessage[] {
  const custom = (store.tickerMessages ?? []).filter((m) => m.text.trim().length > 0);
  if (custom.length > 0) return custom;
  if (store.announcementActive && store.announcement) {
    return [{ text: store.announcement, link: store.announcementLink ?? null }];
  }
  return [];
}

export function ChromeTicker({
  text,
  messages,
  a,
  dur = 26,
  onDark,
  className,
}: {
  /** legacy single-message prop (still supported) */
  text?: string;
  /** v20: full message list — takes precedence over `text` */
  messages?: TickerMessage[];
  a?: ChromeAccentClasses;
  dur?: number;
  onDark?: boolean;
  className?: string;
}) {
  const list: TickerMessage[] =
    messages && messages.length > 0
      ? messages
      : text
        ? [{ text }]
        : [];
  if (list.length === 0) return null;

  /* v20 coverage fix: a seamless 2-copy loop only fills the viewport when
     ONE copy is at least viewport-wide. Short message lists get repeated
     inside each copy (like the old v19 3× ticker) so the strip never runs
     empty at the loop point. ≥8 segments per copy ≈ 1,600px+. */
  const reps = Math.max(1, Math.ceil(8 / list.length));
  const groupList = Array.from({ length: reps }).flatMap(() => list);

  const seg = (m: TickerMessage, key: string) => {
    const inner = (
      <>
        <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{m.text}</span>
        <span aria-hidden className="opacity-40">•</span>
      </>
    );
    return m.link ? (
      <Link
        key={key}
        href={m.link}
        className="flex shrink-0 items-center gap-2 px-4 text-[11px] font-bold transition-colors hover:opacity-80"
      >
        {inner}
      </Link>
    ) : (
      <span key={key} className="flex shrink-0 items-center gap-2 px-4 text-[11px] font-bold">
        {inner}
      </span>
    );
  };

  /* two identical copies → the -50%/+50% (RTL) keyframe lands the 2nd copy
     exactly where the 1st started: a TRUE seamless infinite loop */
  const group = (ariaHidden: boolean) => (
    <div className="flex items-center" aria-hidden={ariaHidden || undefined}>
      {groupList.map((m, i) => seg(m, `${ariaHidden ? "d" : "g"}-${i}`))}
    </div>
  );

  return (
    <div
      className={cn(
        "overflow-hidden border-b",
        onDark ? "border-white/10 bg-white/5" : "border-border bg-muted",
        className
      )}
    >
      <div
        className="taj-marquee h-8 items-center"
        style={{ ["--t-dur" as string]: `${dur}s` }}
        aria-label={list.map((m) => m.text).join(" — ")}
      >
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

/* ── Category photo row (real photos, optional slow marquee) ──────── */

export function ChromeCategoryRow({
  categories,
  a,
  onDark,
  variant = "photos",
  marquee,
  max = 10,
  className,
}: {
  categories: TemplateCategory[];
  a?: ChromeAccentClasses;
  onDark?: boolean;
  variant?: "photos" | "tabs";
  marquee?: boolean;
  max?: number;
  className?: string;
}) {
  const list = categories.slice(0, max);
  if (list.length === 0) return null;

  const chip = (c: TemplateCategory) => (
    <Link
      key={c.id}
      href={`/products?category=${c.slug}`}
      className={cn(
        "group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-colors",
        variant === "tabs" ? "w-[92px]" : "w-[84px]",
        onDark ? "hover:bg-white/10" : "hover:bg-muted/70"
      )}
    >
      <span
        className={cn(
          "relative grid overflow-hidden border-2 transition-transform duration-300 group-hover:scale-105",
          variant === "tabs" ? "h-16 w-16 rounded-2xl" : "h-14 w-14 rounded-xl",
          onDark ? "border-white/15 bg-white/10" : "border-border bg-muted",
          a && a.border
        )}
      >
        {c.image ? (
          <Image src={c.image} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <span className={cn("grid h-full place-items-center text-sm font-black", onDark ? "text-background/70" : "text-muted-foreground")}>
            {c.name.charAt(0)}
          </span>
        )}
      </span>
      <span className={cn("max-w-full truncate text-[10.5px] font-bold", onDark ? "text-background/85" : "text-foreground")}>
        {c.name}
      </span>
      {variant === "tabs" && (
        <span className={cn("text-[9px] tabular-nums", onDark ? "text-background/50" : "text-muted-foreground")}>
          {toFaDigits(c.productCount.toLocaleString("fa-IR"))} کالا
        </span>
      )}
    </Link>
  );

  if (marquee) {
    return (
      <div className={cn("overflow-hidden py-1.5", className)} aria-label="دسته‌بندی‌های فروشگاه">
        <div className="taj-marquee" style={{ ["--t-dur" as string]: "46s" }}>
          <div className="flex gap-1.5 pe-1.5">{list.map(chip)}</div>
          <div className="flex gap-1.5 pe-1.5" aria-hidden>{list.map(chip)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto py-1.5", className)} aria-label="دسته‌بندی‌های فروشگاه">
      {list.map(chip)}
    </div>
  );
}

/* ── Text nav (category text links) ───────────────────────────────── */

export function ChromeTextNav({
  categories,
  a,
  className,
  max = 7,
  includeHome = true,
}: {
  categories: TemplateCategory[];
  a?: ChromeAccentClasses;
  className?: string;
  max?: number;
  includeHome?: boolean;
}) {
  const links: { href: string; label: string }[] = [];
  if (includeHome) links.push({ href: "/", label: "خانه" });
  links.push({ href: "/products", label: "همه محصولات" });
  for (const c of categories.slice(0, max)) {
    links.push({ href: `/products?category=${c.slug}`, label: c.name });
  }
  links.push({ href: "/products?discount=1", label: "تخفیف‌ها" });

  return (
    <nav aria-label="دسته‌بندی‌ها و صفحات" className={cn("no-scrollbar flex items-center gap-1 overflow-x-auto", className)}>
      {links.map((l) => (
        <Link
          key={l.href + l.label}
          href={l.href}
          className={cn(
            "flex h-9 shrink-0 items-center rounded-full px-3.5 text-[11.5px] font-bold transition-colors",
            a ? cn(a.soft, a.softHover) : "bg-muted hover:bg-muted/60"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/* ── v25: header nav buttons + the categories mega panel ─────────── */

const MEGA_OPEN_MS = 130;
const MEGA_CLOSE_MS = 260;

/** v25: the five primary header buttons — خانه / فروشگاه / دسته‌بندی‌ها
 *  (hover → categories mega panel) / درباره ما / تماس با ما — rendered by
 *  EVERY chrome header variant AND the shared storefront header, so the
 *  same navigation lives on every template. The panel opens on
 *  hover-intent, chevron tap and keyboard focus; closes on ESC /
 *  click-outside / leaving. «درباره ما» renders when the CMS page exists
 *  (infoLinks carries it). Responsive: below lg the row becomes a compact
 *  scrollable strip (no-scrollbar) — the panel still opens on tap. */
export function ChromeHeaderNav({
  data,
  a,
  onDark,
  showCategories = true,
  menuStyle,
  className,
}: {
  data: HomeData;
  a?: ChromeAccentClasses;
  onDark?: boolean;
  /** v24 admin toggle («منوی مگا»): false hides the categories dropdown
   *  trigger — the four plain links stay. Defaults to ON. */
  showCategories?: boolean;
  /** v32 (5-e): the active template's mega-menu VARIANT — threaded from
   *  the chrome config by header.tsx (cfg.menuStyle). Undefined (the
   *  shared storefront header / modern-tech default) renders the classic
   *  digikala tree. */
  menuStyle?: MegaMenuStyle;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  /* v32 (5-e): close = zoom-out + fade — instead of hard-unmounting the
   *  panel the moment `open` flips false, hide() flips it into a 180ms
   *  exit animation (data-closing → the mm-out keyframes in
   *  mega-menus.tsx) and unmounts right after. The hover-intent timings
   *  (130ms open / 260ms close grace) are untouched; every close path
   *  (hover-out grace, ESC, click-toggle, click-outside, link click) funnels
   *  through hide(), and measureAndOpen() aborts a pending exit so a fast
   *  re-hover never leaves a zombie timer behind. */
  const [exiting, setExiting] = useState(false);
  /* v26: viewport top (px) of the full-width mega overlay — measured from
   *  the trigger's bounding rect at open time so the panel attaches flush
   *  under the header bar on EVERY template and every device. */
  const [panelTop, setPanelTop] = useState(0);
  const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trigRef = useRef<HTMLButtonElement | null>(null);
  /* v32 (5-e) fix: ESC closes and returns focus to the trigger — but the
   *  wrap's onFocus auto-open would instantly re-open the panel when focus
   *  actually MOVES to the trigger (focus on an already-focused trigger is
   *  a no-op, so the usual Tab→Enter→Escape flow never hit this; only the
   *  focus-elsewhere-inside-the-nav edge did). The flag suppresses the
   *  auto-open for the synchronous focus the ESC handler itself issues. */
  const escFocus = useRef(false);
  /* v26: latest route, synced in an effect — a pending hover-intent timer
   *  must not open the mega on a page the user already navigated away to. */
  const pathRef = useRef<string | null>(null);

  /* hover-intent timers only — exitT is deliberately NOT touched: while
   * the panel plays its 180ms exit, hovering the fading panel must never
   * cancel the unmount (only measureAndOpen / navigation / unmount abort
   * an exit, and each resets `exiting`). */
  const clearTimers = () => {
    if (openT.current) clearTimeout(openT.current);
    if (closeT.current) clearTimeout(closeT.current);
    openT.current = null;
    closeT.current = null;
  };

  /* v32 (5-e): animated close — open flips false immediately (a11y state
   *  is honest), the panel stays mounted with data-closing for the 180ms
   *  mm-out animation, then unmounts. No-op when already closed/exiting. */
  const hide = () => {
    if (exitT.current) return;
    if (!open) return;
    clearTimers();
    setOpen(false);
    setExiting(true);
    exitT.current = setTimeout(() => {
      exitT.current = null;
      setExiting(false);
    }, 190);
  };

  /* v26: measure the trigger, then open the FULL-WIDTH fixed overlay. */
  const measureAndOpen = () => {
    if (exitT.current) {
      clearTimeout(exitT.current);
      exitT.current = null;
    }
    setExiting(false);
    const r = trigRef.current?.getBoundingClientRect();
    setPanelTop(r ? Math.round(r.bottom) : 0);
    setOpen(true);
  };

  const closeNow = () => {
    hide();
  };

  /* hover-intent: short delay in, slightly longer grace out */
  const openSoon = () => {
    if (closeT.current) {
      clearTimeout(closeT.current);
      closeT.current = null;
    }
    if (open) return;
    const pathAtHover = pathRef.current;
    openT.current = setTimeout(() => {
      /* route changed while the intent timer was pending → abort */
      if (pathAtHover !== null && pathAtHover !== pathRef.current) return;
      measureAndOpen();
    }, MEGA_OPEN_MS);
  };
  const closeSoon = () => {
    if (openT.current) {
      clearTimeout(openT.current);
      openT.current = null;
    }
    if (!open) return;
    /* route captured at schedule time — if the user navigated before the
     * grace elapsed, the panel is already hard-closed: abort instead of
     * resurrecting it via hide()'s exit animation. */
    const pathAtLeave = pathRef.current;
    closeT.current = setTimeout(() => {
      if (pathAtLeave !== null && pathAtLeave !== pathRef.current) return;
      hide();
    }, MEGA_CLOSE_MS);
  };

  /* click-outside while open */
  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Node && wrapRef.current && !wrapRef.current.contains(t)) {
        hide();
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  /* v26: the mega overlay is viewport-fixed — page scrolling would detach
   *  it from the header, so any scroll closes it; a window resize simply
   *  re-measures the trigger (panel stays usable). Scrolling the panel's
   *  own inner container does NOT fire window scroll, so tall panels on
   *  phones scroll their content without closing. */
  useEffect(() => {
    if (!open) return;
    const onScroll = () => closeNow();
    const onResize = () => {
      const r = trigRef.current?.getBoundingClientRect();
      setPanelTop(r ? Math.round(r.bottom) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  /* v26: the shared header survives client-side navigation — ANY route
   *  change (mega link, nav link, …) must close the full-width overlay so it
   *  never covers the new page. Render-time adjustment (React-endorsed
   *  "adjust state when a prop changes" pattern) instead of an effect;
   *  pending timers are inert (closeSoon is idempotent, openSoon's guard
   *  aborts stale hover-intents). */
  const pathname = usePathname();
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    /* hard close (no exit animation): the new page must never start under
     * the overlay. Pure state (the sanctioned adjust-during-render
     * pattern) — a pending hover-out timer can't resurrect the panel
     * afterwards because closeSoon aborts when the route changed since it
     * was scheduled, and exitT's own callback only ever clears state. */
    setOpen(false);
    setExiting(false);
  }

  /* never leave a pending timer behind on unmount */
  useEffect(
    () => () => {
      if (openT.current) clearTimeout(openT.current);
      if (closeT.current) clearTimeout(closeT.current);
      if (exitT.current) clearTimeout(exitT.current);
    },
    []
  );

  const about = (data.infoLinks ?? []).find((l) => l.slug === "about");

  const linkCls = cn(
    "flex h-10 shrink-0 items-center rounded-xl px-3 text-[12.5px] font-bold transition-colors",
    onDark ? "text-background/80" : "text-foreground/80",
    a ? a.softHover : onDark ? "hover:bg-white/10" : "hover:bg-muted"
  );

  return (
    <div
      ref={wrapRef}
      className={cn("relative flex min-w-0 flex-1 items-center", className)}
      onMouseLeave={closeSoon}
      onFocus={() => {
        if (escFocus.current) return;
        clearTimers();
        measureAndOpen();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) closeSoon();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          escFocus.current = true;
          hide();
          trigRef.current?.focus();
          escFocus.current = false;
        }
      }}
    >
      <nav aria-label="منوی اصلی" className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
        <Link href="/" className={linkCls}>
          خانه
        </Link>
        <Link href="/products" className={linkCls}>
          فروشگاه
        </Link>
        {showCategories && data.categories.length > 0 && (
          <span className="flex shrink-0 items-center" onMouseEnter={openSoon}>
            <button
              ref={trigRef}
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls="chrome-mega-panel"
              aria-label={open ? "بستن منوی دسته‌بندی‌ها" : "باز کردن منوی دسته‌بندی‌ها"}
              onClick={() => {
                clearTimers();
                if (open) hide();
                else measureAndOpen();
              }}
              className={cn(linkCls, "gap-1.5")}
            >
              <LayoutGrid className="h-3.5 w-3.5 opacity-70" aria-hidden />
              دسته‌بندی‌ها
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
                aria-hidden
              />
            </button>
          </span>
        )}
        {about && (
          <Link href={`/info/${about.slug}`} className={linkCls}>
            درباره ما
          </Link>
        )}
        <Link href="/contact" className={linkCls}>
          تماس با ما
        </Link>
      </nav>

      {(open || exiting) && (
        <ChromeCategoriesPanel
          data={data}
          menuStyle={menuStyle}
          closing={exiting && !open}
          a={a}
          onDark={onDark}
          style={{ position: "fixed", top: `${panelTop}px`, left: 0, right: 0, zIndex: 50 }}
          onMouseEnter={clearTimers}
          onMouseLeave={closeSoon}
          onNavigate={closeNow}
        />
      )}
    </div>
  );
}

/** v32 (5-e): the categories mega panel — now a thin SHELL. It keeps the
 *  full-width fixed overlay plumbing (dialog semantics, hover-intent /
 *  click-close behaviour, constrained self-scrolling body) and delegates
 *  its CONTENT to one of FIVE per-template menu styles rendered by
 *  MegaMenuBody (./mega-menus.tsx): درختی دیجی‌کالایی · تصویری بزرگ ·
 *  آبشاری · زوم و محو · آبشاری + محصول کنار. The style comes from the
 *  active template's chrome config (cfg.menuStyle, mapped for all 25
 *  templates in ./config.ts); the shared storefront header (modern-tech
 *  default) renders the classic tree. Same data as always — HomeData
 *  categories (admin-managed images + branches) and brands. */
export function ChromeCategoriesPanel({
  data,
  menuStyle,
  closing,
  a,
  onDark,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
}: {
  data: HomeData;
  /** v32 (5-e): the active template's mega-menu variant (undefined → tree) */
  menuStyle?: MegaMenuStyle;
  /** v32 (5-e): true while the panel plays its 180ms close animation
   *  (zoom-out + fade, see mm-out in mega-menus.tsx) — set by
   *  ChromeHeaderNav, which unmounts the node right after. */
  closing?: boolean;
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
  /** v26: fixed full-width positioning, measured by ChromeHeaderNav. */
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** v26: fires when any link inside is clicked — closes the overlay even
   *  on search-param-only navigations (e.g. /products?category=… …). */
  onNavigate?: () => void;
}) {
  return (
    <div
      id="chrome-mega-panel"
      role="dialog"
      aria-label="منوی دسته‌بندی‌ها و برندها"
      data-closing={closing ? "true" : undefined}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        /* close ONLY on real link clicks — not on empty panel space */
        const t = e.target;
        if (onNavigate && t instanceof Element && t.closest("a")) onNavigate();
      }}
      className={cn(
        "animate-in fade-in-0 slide-in-from-top-1 duration-150 rounded-b-2xl border border-t-0 bg-card text-card-foreground shadow-2xl",
        /* legacy anchor for any future non-fixed mount */
        !style && "absolute inset-x-0 top-full z-50 p-4 md:p-5",
        className
      )}
    >
      {/* constrained, self-scrolling body — full-width bar, centered content.
          The per-template menu style renders inside (see ./mega-menus.tsx). */}
      <div className="mx-auto flex max-h-[min(80dvh,44rem)] max-w-6xl flex-col gap-4 overflow-y-auto px-3 pb-4 pt-3 sm:px-5 md:pb-5 md:pt-4">
        <MegaMenuBody menuStyle={menuStyle} data={data} a={a} onDark={onDark} />
      </div>
    </div>
  );
}

/* ── Brand photo strip (marquee of real brand product photos) ─────── */

export function ChromeBrandStrip({
  brands,
  a,
  onDark,
  marquee = true,
  max = 12,
  dur = 38,
  className,
}: {
  brands: TemplateBrand[];
  a?: ChromeAccentClasses;
  onDark?: boolean;
  marquee?: boolean;
  max?: number;
  dur?: number;
  className?: string;
}) {
  const list = brands.slice(0, max);
  if (list.length === 0) return null;

  /* v20 coverage fix (same as ChromeTicker): repeat the chips inside each
     copy until one copy is comfortably viewport-wide (≥8 chips). */
  const reps = list.length >= 8 ? 1 : Math.ceil(8 / list.length);
  const groupList = Array.from({ length: reps }).flatMap((_, r) =>
    list.map((b) => ({ ...b, key: `${b.id}-r${r}` }))
  );

  const chip = (b: TemplateBrand, key: string) => (
    <Link
      key={key}
      href={`/products?brand=${b.slug}`}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-1 pe-4 ps-1 transition-all hover:-translate-y-0.5",
        onDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-border bg-card hover:shadow-md",
        a && a.border
      )}
    >
      <span className={cn("relative h-9 w-9 overflow-hidden rounded-full border", onDark ? "border-white/15 bg-white/10" : "border-border bg-muted")}>
        {b.logo || b.image ? (
          <Image src={(b.logo ?? b.image)!} alt="" fill sizes="36px" className="object-cover" />
        ) : (
          <span className={cn("grid h-full place-items-center text-[11px] font-black", onDark ? "text-background/70" : "text-muted-foreground")}>
            {b.name.charAt(0)}
          </span>
        )}
      </span>
      <span className={cn("whitespace-nowrap text-[12px] font-bold", onDark ? "text-background/85" : "text-foreground")}>
        {b.name}
      </span>
    </Link>
  );

  if (marquee) {
    return (
      <div className={cn("overflow-hidden", className)} aria-label="برندهای همکار فروشگاه">
        <div className="taj-marquee" style={{ ["--t-dur" as string]: `${dur}s` }}>
          <div className="flex gap-2.5 pe-2.5">{groupList.map((b) => chip(b, b.key))}</div>
          <div className="flex gap-2.5 pe-2.5" aria-hidden>{groupList.map((b) => chip(b, b.key + "-dup"))}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap justify-center gap-2.5", className)} aria-label="برندهای همکار فروشگاه">
      {list.map((b) => chip(b, b.id))}
    </div>
  );
}

/* ── Mandatory Alaruz Design credit (store-owner requirement) ─────── */

export function AlaruzCredit({
  onDark,
  a,
  className,
}: {
  onDark?: boolean;
  a?: ChromeAccentClasses;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-2", onDark ? "text-background/60" : "text-muted-foreground", className)}>
      <Crown className={cn("h-3.5 w-3.5 shrink-0", a ? a.text : "text-primary")} aria-hidden />
      <span>ساخته شده توسط تیم فنی حرفه‌ای</span>
      <a
        href="https://alaruzdesign.ir"
        target="_blank"
        rel="noopener noreferrer"
        title="طراحی و توسعه توسط Alaruz Design"
        className={cn(
          "group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-bold shadow-sm transition-all",
          "border-primary/40 bg-primary/15 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
        )}
        dir="ltr"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary transition-colors group-hover:bg-primary-foreground" aria-hidden />
        Alaruz Design
        <span aria-hidden className="text-[10px] leading-none transition-transform group-hover:-translate-y-0.5">↗</span>
      </a>
    </p>
  );
}

/* ── Small shared pieces ──────────────────────────────────────────── */

export function PhoneChip({
  phone,
  a,
  onDark,
  className,
}: {
  phone: string | null;
  a?: ChromeAccentClasses;
  onDark?: boolean;
  className?: string;
}) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/\s/g, "")}`}
      dir="ltr"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[12.5px] font-black tabular-nums transition-all hover:-translate-y-0.5",
        onDark ? "border-white/15 bg-white/10 hover:bg-white/20" : "border-border bg-card hover:shadow-md",
        a && a.text
      )}
      aria-label={`تماس با فروشگاه: ${phone}`}
    >
      <Phone className={cn("h-4 w-4", a ? a.text : "text-primary")} aria-hidden />
      {toFaDigits(phone)}
    </a>
  );
}

/** v27b: `text` (the ACTIVE template's per-template copyright override) —
 *  when present it replaces the default line. {year}/{storeName} are
 *  interpolated locally (server settings code must never be imported into
 *  client components); the year keeps Persian digits like the default. */
export function CopyrightLine({ storeName, onDark, text }: { storeName: string; onDark?: boolean; text?: string }) {
  const year = new Date().getFullYear();
  const custom = typeof text === "string" && text.trim() ? text.trim() : null;
  const line = custom
    ? custom.replaceAll("{year}", toFaDigits(String(year))).replaceAll("{storeName}", storeName)
    : `© ${toFaDigits(year.toLocaleString("fa-IR"))} ${storeName} — تمام حقوق محفوظ است.`;
  return (
    <p className={cn("flex items-center gap-1.5 text-[12px]", onDark ? "text-background/60" : "text-muted-foreground")}>
      <Package className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {line}
    </p>
  );
}

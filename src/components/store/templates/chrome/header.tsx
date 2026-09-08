"use client";

/**
 * TEMPLATE CHROME — bespoke per-template HEADER (v18)
 * ---------------------------------------------------
 * 8 genuinely different header layouts (bar / float / split / side /
 * center / app / ticket / mega), each parameterized by HeaderCfg (tint,
 * accent, ticker, category row, search mode, logo style…). Every
 * non-default template renders its own pair — see chrome/config.ts for
 * the per-template assignment (24 unique combinations).
 *
 * Functional parity on every layout: logo → /, category nav (real data),
 * search (GET /products?q=…), account → /account, cart → /cart with the
 * LIVE cart-count badge. 44px touch targets, RTL Persian, a11y labels.
 */

import Link from "next/link";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  Truck, ShieldCheck, Headphones, Star, Zap, ChevronLeft,
} from "lucide-react";
import type { ChromeAccent, ChromePalette } from "./bits";
import type { HomeData, ChromeHeaderOverride } from "@/lib/templates/types";
import { cn } from "@/lib/utils";
import {
  ACCENT_CLASSES, chromeSurface, isDarkColor, resolveChromePalette, themeChromeStyle, pickEnum, CHROME_ACCENTS, CHROME_LOGOS, CHROME_ROWS,
  type ChromeTint,
  ChromeLogo, ChromeSearch, ChromeAccount, ChromeCart, ChromeThemeToggle, ChromeTicker,
  ChromeCategoryRow, ChromeTextNav, ChromeHeaderNav, resolveTickerMessages, type TickerMessage,
} from "./bits";
import type { HeaderCfg } from "./config";

/* v24: merge the admin's per-template header overrides (Admin → ظاهر) onto
 * the designed config — unknown enum values are ignored, booleans default
 * to the template's own choice. The Alaruz credit is footer-only and is
 * NOT part of this system (permanent by design). */
function mergeHeaderCfg(cfg: HeaderCfg, ov?: ChromeHeaderOverride): HeaderCfg {
  if (!ov) return cfg;
  return {
    ...cfg,
    accent: pickEnum(CHROME_ACCENTS, ov.accent, cfg.accent) ?? cfg.accent,
    logo: pickEnum(CHROME_LOGOS, ov.logo, cfg.logo),
    categoryRow: pickEnum(CHROME_ROWS, ov.categoryRow, cfg.categoryRow),
    sticky: ov.sticky ?? cfg.sticky,
    ticker: ov.ticker ?? cfg.ticker,
    /* v25: the categories mega-menu button defaults ON for every template
     * (the admin can still hide just the dropdown trigger). */
    megaMenu: ov.megaMenu ?? cfg.megaMenu ?? true,
    showSearch: ov.showSearch ?? cfg.showSearch,
    showAccount: ov.showAccount ?? cfg.showAccount,
    showCart: ov.showCart ?? cfg.showCart,
    showThemeToggle: ov.showThemeToggle ?? cfg.showThemeToggle,
  };
}

/* v25: the shared primary nav lives in ChromeHeaderNav (bits.tsx) — the
 * five buttons خانه/فروشگاه/دسته‌بندی‌ها(hover mega)/درباره ما/تماس با ما
 * with the live categories mega panel. Rendered by every variant below. */

function getAccent(accent: ChromeAccent) {
  return ACCENT_CLASSES[accent];
}

/* mounted flag — keeps SSR and the hydration render identical (no
 * hydration mismatch) while still flipping to the resolved mode right
 * after mount */
const emptySubscribe = () => () => {};
function useSiteDark(): boolean {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  return mounted ? resolvedTheme === "dark" : false;
}

/** v19 duo-mode hook: resolves the ACTUAL site mode (light/dark) and maps
 *  the configured chrome tint onto it — a "dark"-tinted chrome renders as
 *  its inverted-bar look only in light mode; when the site itself is dark
 *  it becomes an elevated token surface (bg-card) so it never flips into a
 *  blinding light bar. v24 "theme" tint bypasses this entirely — the chrome
 *  is painted with the template/admin palette, whatever the site mode. */
function useChromeMode(cfg: HeaderCfg | FooterLike) {
  const siteDark = useSiteDark();
  const onDark = cfg.tint === "dark" && !siteDark;
  const tint: ChromeTint = cfg.tint === "dark" && siteDark ? "elevated" : cfg.tint;
  return { siteDark, onDark, tint };
}

type FooterLike = { tint: ChromeTint };

export function TemplateHeader({ data, cfg }: { data: HomeData; cfg: HeaderCfg }) {
  // v24: this template's admin overrides (keyed by cfg.id, attached in
  // chrome/config.ts at module load) — colors, accent, layout toggles
  const ov = cfg.id ? data.store.chromeOverridesMap?.[cfg.id]?.header : undefined;
  const eff = mergeHeaderCfg(cfg, ov);
  const a = getAccent(eff.accent);
  const store = data.store;
  const { siteDark, onDark: modeOnDark, tint: modeTint } = useChromeMode(eff);
  // v24 theme palette: admin colors > template's own canvas colors
  // v26fix: dual-mode — light mode swaps in the template's LIGHT half so the
  // chrome flips together with the template body + canvas (admin overrides
  // stay fixed in both modes)
  /* v27b-T5: mode-MATCHED palette pick. The old `siteDark ? palette :
   * paletteLight` assumed palette=native-DARK; for the native-LIGHT
   * templates (minimal-premium, startup-light, print-catalog …) it painted
   * their chrome with the LIGHT native half in dark mode — a white header
   * and footer bar on the dark canvas. Now the half whose darkness matches the
   * live site mode wins (native-dark keeps its exact old behavior). */
  const basePalette =
    eff.palette && eff.paletteLight
      ? isDarkColor(eff.palette.bg) === siteDark ? eff.palette : eff.paletteLight
      : siteDark ? eff.palette : (eff.paletteLight ?? eff.palette);
  const palette: ChromePalette | null = resolveChromePalette(basePalette, ov);
  const themeMode = eff.tint === "theme" && !!palette;
  const onDark = themeMode && palette ? isDarkColor(palette.bg) : modeOnDark;
  const tint: ChromeTint = themeMode ? "theme" : modeTint;
  const chromeStyle: CSSProperties | undefined = themeMode && palette ? themeChromeStyle(palette.bg, palette.fg) : undefined;
  const announcement = store.announcementActive && store.announcement ? store.announcement : null;
  // v20: admin-managed marquee message list (falls back to the announcement)
  const ticker = resolveTickerMessages(store);
  // v22: admin-controlled marquee speed (Settings → فروشگاه) — overrides every
  // template's own designed default when set (>= 6 seconds).
  const tickerDur = store.tickerSpeed && store.tickerSpeed >= 6 ? store.tickerSpeed : eff.tickerSpeed;
  const shared = { data, cfg: eff, a, onDark, tint, siteDark, announcement, ticker, tickerDur, chromeStyle };

  switch (eff.variant) {
    case 2: return <HeaderFloat {...shared} />;
    case 3: return <HeaderSplit {...shared} />;
    case 4: return <HeaderSide {...shared} />;
    case 5: return <HeaderCenter {...shared} />;
    case 6: return <HeaderApp {...shared} />;
    case 7: return <HeaderTicket {...shared} />;
    case 8: return <HeaderMega {...shared} />;
    case 1:
    default: return <HeaderBar {...shared} />;
  }
}

type VariantProps = {
  data: HomeData;
  cfg: HeaderCfg;
  a: ReturnType<typeof getAccent>;
  onDark: boolean;
  tint: ChromeTint;
  siteDark: boolean;
  announcement: string | null;
  /** v20: marquee message list for the ticker strip */
  ticker: TickerMessage[];
  /** v22: effective marquee duration — admin speed override or template default */
  tickerDur?: number;
  /** v24: theme-palette inline colors (tint "theme" only) */
  chromeStyle?: CSSProperties;
};

/* ═══ H1 · BAR — classic announcement + main row + category strip ═══ */
function HeaderBar({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header
      data-chrome-header=""
      style={chromeStyle}
      className={cn(
        "w-full border-b",
        chromeSurface(tint),
        cfg.sticky && "sticky top-0 z-40"
      )}
    >
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3 md:h-[72px] md:gap-5">
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="shrink-0">
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
          </Link>
          <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="hidden min-[560px]:flex" />
          <div className="ms-auto flex items-center gap-2">
            {cfg.showSearch !== false && <ChromeSearch mode="pill" a={a} onDark={onDark} className="hidden md:flex" />}
            {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
            {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
            {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
          </div>
        </div>
        {cfg.categoryRow === "photos" && (
          <div className="border-t md:border-t-0">
            <ChromeCategoryRow categories={data.categories} a={a} onDark={onDark} marquee={cfg.categoryMarquee} />
          </div>
        )}
        {cfg.categoryRow === "chips" && (
          <div className={cn("border-t py-2", onDark ? "border-white/10" : "border-border md:border-t-0")}>
            <ChromeTextNav categories={data.categories} a={a} />
          </div>
        )}
      </div>
    </header>
  );
}

/* ═══ H2 · FLOAT — floating rounded pill over the hero ══════════════ */
function HeaderFloat({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" className={cn("w-full px-4 pt-4 md:pt-6", cfg.sticky && "sticky top-0 z-40")}>
      {cfg.ticker && ticker.length > 0 && (
        <div className="mx-auto mb-3 max-w-7xl">
          <ChromeTicker messages={ticker} a={a} dur={tickerDur} className="rounded-full" />
        </div>
      )}
      <div
        style={chromeStyle}
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-2 rounded-2xl border p-2 shadow-xl md:gap-3 md:rounded-3xl md:p-2.5",
          chromeSurface(tint),
          a && a.ring
        )}
      >
        <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="shrink-0">
          <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} compact />
        </Link>
        <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="hidden min-[560px]:flex lg:flex" />
        <div className="ms-auto flex items-center gap-2">
          {cfg.showSearch !== false && <ChromeSearch mode="pill" a={a} onDark={onDark} className="hidden sm:flex" />}
          {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
          {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
          {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
        </div>
      </div>
      {cfg.categoryRow !== "none" && (
        <div className="mx-auto mt-3 max-w-7xl">
          {cfg.categoryRow === "photos" ? (
            <ChromeCategoryRow categories={data.categories} a={a} onDark={onDark} marquee={cfg.categoryMarquee} />
          ) : (
            <ChromeTextNav categories={data.categories} a={a} />
          )}
        </div>
      )}
    </header>
  );
}

/* ═══ H3 · SPLIT — editorial double-deck masthead ═══════════════════ */
function HeaderSplit({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" style={chromeStyle} className={cn("w-full border-b-2", chromeSurface(tint))}>
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
      <div className="mx-auto max-w-7xl px-4">
        {/* utility deck */}
        <div className={cn("flex h-9 items-center justify-between gap-3 border-b text-[10.5px] font-bold", onDark ? "border-white/10 text-background/60" : "border-border text-muted-foreground")}>
          <div className="flex items-center gap-4">
            <Link href="/track-order" className="transition-colors hover:opacity-70">پیگیری سفارش</Link>
            <Link href="/contact" className="transition-colors hover:opacity-70">تماس با ما</Link>
            <Link href="/info/faq" className="hidden transition-colors hover:opacity-70 sm:block">سوالات متداول</Link>
          </div>
          <div className="flex items-center gap-3">
            {data.store.phone && (
              <a href={`tel:${data.store.phone.replace(/\s/g, "")}`} dir="ltr" className="hidden tabular-nums sm:block">
                {data.store.phone}
              </a>
            )}
            <span className={cn("flex items-center gap-1.5", a && a.text)}>
              <Star className="h-3 w-3" aria-hidden />
              {data.counts.products.toLocaleString("fa-IR")} کالای منتخب
            </span>
          </div>
        </div>
        {/* masthead deck */}
        <div className="flex flex-wrap items-center gap-4 py-4 md:flex-nowrap md:gap-6 md:py-5">
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="shrink-0">
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "wordmark"} a={a} onDark={onDark} />
          </Link>
          {cfg.showSearch !== false && (
            <div className="order-3 w-full md:order-none md:flex-1">
              <ChromeSearch mode="wide" a={a} onDark={onDark} />
            </div>
          )}
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
            {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
            {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
          </div>
        </div>
        {/* category deck — v25: the five header buttons + categories mega */}
        <div className={cn("border-t py-1", onDark ? "border-white/10" : "border-border")}>
          <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="flex-none" />
        </div>
      </div>
    </header>
  );
}

/* ═══ H4 · SIDE — asymmetric with accent edge bar ═══════════════════ */
function HeaderSide({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" style={chromeStyle} className={cn("relative w-full border-b", chromeSurface(tint), cfg.sticky && "sticky top-0 z-40")}>
      <span aria-hidden className={cn("absolute inset-y-0 start-0 w-1.5", a.edge)} />
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
      <div className="mx-auto max-w-7xl px-4 ps-6">
        <div className="flex h-[68px] items-center gap-4 md:h-[76px]">
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="shrink-0">
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
          </Link>
          {/* v25: the five header buttons + categories mega (all sizes) */}
          <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="hidden min-[560px]:flex" />
          <div className="ms-auto flex items-center gap-2">
            {cfg.showSearch !== false && <ChromeSearch mode="icon" a={a} onDark={onDark} />}
            {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
            {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
            {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ═══ H5 · CENTER — stacked centered logo + nav + search ════════════ */
function HeaderCenter({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" style={chromeStyle} className={cn("w-full border-b", chromeSurface(tint))}>
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 pb-5 pt-6 md:gap-5 md:pb-6 md:pt-8">
        <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`}>
          <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "wordmark"} a={a} onDark={onDark} />
        </Link>
        <p className={cn("max-w-md text-center text-[11.5px] leading-6", onDark ? "text-background/60" : "text-muted-foreground")}>
          {announcement ?? "فروشگاه تخصصی کالای دیجیتال با ضمانت اصالت و ارسال سریع"}
        </p>
        <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} />
        <div className="flex w-full items-center justify-center gap-3">
          {cfg.showSearch !== false && (
            <div className="w-full max-w-md">
              <ChromeSearch mode="pill" a={a} onDark={onDark} />
            </div>
          )}
          {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
          {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
          {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
        </div>
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div className="mx-auto max-w-7xl px-4 py-2">
          <ChromeTextNav categories={data.categories} a={a} max={9} includeHome={false} />
        </div>
      </div>
    </header>
  );
}

/* ═══ H6 · APP — app-like top bar + scrollable photo tabs ═══════════ */
function HeaderApp({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" style={chromeStyle} className={cn("w-full border-b", chromeSurface(tint), "sticky top-0 z-40")}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3 md:h-16">
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="flex shrink-0 items-center gap-2.5">
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "round"} a={a} onDark={onDark} compact />
          </Link>
          <span className={cn("hidden items-center gap-1.5 text-[10px] font-black sm:flex", onDark ? "text-background/60" : "text-muted-foreground")}>
            <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
            پشتیبانی آنلاین
          </span>
          {/* v25: the five header buttons + categories mega */}
          <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="hidden min-[560px]:flex" />
          <div className="ms-auto flex items-center gap-2">
            {cfg.showSearch !== false && <ChromeSearch mode="icon" a={a} onDark={onDark} />}
            {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
            {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
            {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
          </div>
        </div>
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div className="mx-auto max-w-7xl px-4">
          <ChromeCategoryRow
            categories={data.categories}
            a={a}
            onDark={onDark}
            variant="tabs"
            marquee={cfg.categoryMarquee ?? false}
            max={12}
          />
        </div>
      </div>
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
    </header>
  );
}

/* ═══ H7 · TICKET — perforated ticket-stub with dashed zones ════════ */
function HeaderTicket({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" className="w-full px-4 pt-5">
      <div style={chromeStyle} className={cn("relative mx-auto max-w-7xl rounded-2xl border-2 border-dashed p-2 shadow-lg", chromeSurface(tint), a && a.border)}>
        {/* side notches — punch holes at the perforation line */}
        <span aria-hidden className={cn("absolute -start-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full border-2 border-dashed md:block", onDark ? "bg-background border-white/20" : "bg-background border-border")} style={{ background: "var(--background)" }} />
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:gap-0">
          {/* zone 1 · logo */}
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className={cn("flex shrink-0 items-center px-3 py-1.5 md:pe-6", onDark ? "md:border-e md:border-dashed md:border-white/15" : "md:border-e md:border-dashed md:border-border")}>
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
          </Link>
          {/* zone 2 · v25: the five header buttons + categories mega */}
          <div className={cn("flex min-w-0 flex-1 items-center px-3 py-1.5 md:pe-6 md:border-e md:border-dashed", onDark ? "border-white/15" : "border-border")}>
            <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} />
          </div>
          {/* zone 3 · search + actions */}
          <div className="flex flex-1 items-center gap-2 px-3 py-1.5">
            {cfg.showSearch !== false && (
              <div className="hidden flex-1 sm:block">
                <ChromeSearch mode="wide" a={a} onDark={onDark} className="h-10" />
              </div>
            )}
            <div className="flex items-center gap-2 sm:ms-auto">
              {cfg.showSearch !== false && <ChromeSearch mode="icon" a={a} onDark={onDark} className="sm:hidden" />}
              {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
              {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
              {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
            </div>
          </div>
        </div>
        {cfg.ticker && ticker.length > 0 && (
          <div className={cn("mt-2 border-t border-dashed pt-2", onDark ? "border-white/15" : "border-border")}>
            <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} className="border-b-0 rounded-none" />
          </div>
        )}
      </div>
    </header>
  );
}

/* ═══ H8 · MEGA — dense superstore: ticker + hotline + photo strip ══ */
function HeaderMega({ data, cfg, a, onDark, tint, announcement, ticker, tickerDur, chromeStyle }: VariantProps) {
  return (
    <header data-chrome-header="" style={chromeStyle} className={cn("w-full border-b", chromeSurface(tint), cfg.sticky && "sticky top-0 z-40")}>
      {cfg.ticker && ticker.length > 0 && (
        <ChromeTicker messages={ticker} a={a} onDark={onDark} dur={tickerDur} />
      )}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-[70px] items-center gap-3 md:h-[80px] md:gap-4">
          <Link href="/" aria-label={`صفحه اصلی ${data.store.storeName}`} className="shrink-0">
            <ChromeLogo store={data.store} mark={data.store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
          </Link>
          {cfg.showSearch !== false && <ChromeSearch mode="wide" a={a} onDark={onDark} className="hidden sm:flex" />}
          {data.store.phone && (
            <div className={cn("hidden shrink-0 flex-col items-end leading-5 xl:flex", onDark ? "text-background/60" : "text-muted-foreground")}>
              <span className="text-[10px] font-bold">پشتیبانی ۷ روز هفته</span>
              <a href={`tel:${data.store.phone.replace(/\s/g, "")}`} dir="ltr" className={cn("text-[13px] font-black tabular-nums", a && a.text)}>
                {data.store.phone}
              </a>
            </div>
          )}
          <div className="ms-auto flex items-center gap-2 sm:ms-0">
            {cfg.showThemeToggle !== false && <ChromeThemeToggle a={a} onDark={onDark} />}
            {cfg.showAccount !== false && <ChromeAccount a={a} onDark={onDark} />}
            {cfg.showCart !== false && <ChromeCart a={a} onDark={onDark} cartStyle={cfg.cartStyle} />}
          </div>
        </div>
        {/* mobile search row */}
        <div className={cn("border-t pb-3 pt-2 sm:hidden", onDark ? "border-white/10" : "border-border")}>
          {cfg.showSearch !== false && <ChromeSearch mode="wide" a={a} onDark={onDark} className="h-11" />}
        </div>
        {/* photo category strip */}
        <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
          <ChromeCategoryRow categories={data.categories} a={a} onDark={onDark} marquee={cfg.categoryMarquee ?? true} max={12} />
        </div>
        {/* feature strip */}
        <div className={cn("hidden items-center justify-between border-t py-1.5 text-[10.5px] font-bold md:flex", onDark ? "border-white/10 text-background/65" : "border-border text-muted-foreground")}>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Truck className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden /> ارسال سریع سراسر کشور</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden /> ضمانت اصالت کالا</span>
            <span className="flex items-center gap-1.5"><Headphones className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden /> پشتیبانی واقعی</span>
          </div>
          <Link href="/products?discount=1" className={cn("flex items-center gap-1", a && a.text)}>
            <Zap className="h-3.5 w-3.5" aria-hidden /> پیشنهادهای شگفت‌انگیز
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {/* v25: the five header buttons + categories mega */}
        <div className={cn("border-t py-1", onDark ? "border-white/10" : "border-border")}>
          <ChromeHeaderNav data={data} a={a} onDark={onDark} showCategories={cfg.megaMenu !== false} menuStyle={cfg.menuStyle} className="flex-none" />
        </div>
      </div>
    </header>
  );
}

/* end of chrome/header.tsx */

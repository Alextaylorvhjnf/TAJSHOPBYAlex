"use client";

/**
 * TEMPLATE CHROME — bespoke per-template FOOTER (v18)
 * ---------------------------------------------------
 * 8 genuinely different footer layouts (mega / center / minimal / band /
 * contact / columns / magazine / app), each parameterized by FooterCfg.
 * Every variant ends with the mandatory Alaruz Design credit chip
 * (store-owner requirement — prominent, never removable) and renders
 * only REAL data: live categories, live brand photo chips, real CMS
 * info-page links (v18 HomeData.infoLinks), store phone/announcement.
 *
 * The root element MUST be a <footer> that stays a DIRECT child of the
 * template root — globals.css gives it margin-top:auto so bespoke
 * chrome templates still stick the footer to the viewport bottom.
 *
 * v19: the bottom credit row carries data-copyright-bar so the floating
 * chat widget lifts clear of the Alaruz credit on EVERY template, the
 * brand strip is always an infinite marquee, and "dark"-tinted footers
 * become elevated token surfaces when the site itself is dark.
 */

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ShieldCheck, Truck, RotateCcw, Headphones, CreditCard, Phone,
  PackageSearch, MessageCircle, ShoppingCart, User, FileQuestion, ArrowLeft,
  Instagram, Send, Youtube, Twitter, Linkedin,
} from "lucide-react";
import type { HomeData, ChromeFooterOverride } from "@/lib/templates/types";
import type { ChromePalette } from "./bits";
import { cn } from "@/lib/utils";
import {
  ACCENT_CLASSES, chromeSurface, isDarkColor, resolveChromePalette, themeChromeStyle, pickEnum, CHROME_ACCENTS, CHROME_LOGOS, CHROME_ROWS,
  type ChromeAccent, type ChromeTint,
  ChromeLogo, ChromeBrandStrip, AlaruzCredit, PhoneChip, CopyrightLine, TelegramBotChip,
} from "./bits";
import type { FooterCfg } from "./config";

function getAccent(accent: ChromeAccent) {
  return ACCENT_CLASSES[accent];
}

/* v24: merge the admin's per-template footer overrides (Admin → ظاهر) onto
 * the designed config. NOTE: the Alaruz Design credit row is NOT part of
 * this system — it renders permanently in every footer variant. */
function mergeFooterCfg(cfg: FooterCfg, ov?: ChromeFooterOverride): FooterCfg {
  if (!ov) return cfg;
  const categories = Number.isFinite(ov.categories) ? Math.max(0, Math.min(12, Math.round(ov.categories as number))) : cfg.categories;
  return {
    ...cfg,
    accent: pickEnum(CHROME_ACCENTS, ov.accent, cfg.accent) ?? cfg.accent,
    logo: pickEnum(CHROME_LOGOS, ov.logo, cfg.logo),
    brandStrip: pickEnum(CHROME_ROWS, ov.brandStrip, cfg.brandStrip),
    trust: ov.trust ?? cfg.trust,
    round: ov.round ?? cfg.round,
    categories: categories as FooterCfg["categories"],
  };
}

export function TemplateFooter({ data, cfg }: { data: HomeData; cfg: FooterCfg }) {
  // v24: this template's admin overrides (keyed by cfg.id — see config.ts)
  const ov = cfg.id ? data.store.chromeOverridesMap?.[cfg.id]?.footer : undefined;
  const eff = mergeFooterCfg(cfg, ov);
  const a = getAccent(eff.accent);
  // v19 duo-mode — mounted gate keeps SSR + hydration renders identical
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const siteDark = mounted ? resolvedTheme === "dark" : false;
  // inverted footer bar only in light mode; in dark mode a "dark"-tinted
  // footer becomes an elevated token surface (never a light bar).
  // v24: tint "theme" bypasses duo-mode — the footer is painted with the
  // template/admin palette (same color as the storefront theme).
  const modeOnDark = eff.tint === "dark" && !siteDark;
  // v26fix: dual-mode — light mode swaps in the template's LIGHT half so the
  // footer flips together with the template body + canvas (admin overrides
  // stay fixed in both modes)
  /* v27b-T5: mode-MATCHED palette pick — the old `siteDark ? palette :
   * paletteLight` assumed palette=native-DARK; the native-LIGHT templates
   * (minimal-premium, startup-light, print-catalog …) got their LIGHT
   * native half in dark mode → white footer on the dark canvas. The half
   * whose darkness matches the live mode wins (native-dark unchanged). */
  const basePalette =
    eff.palette && eff.paletteLight
      ? isDarkColor(eff.palette.bg) === siteDark ? eff.palette : eff.paletteLight
      : siteDark ? eff.palette : (eff.paletteLight ?? eff.palette);
  const palette: ChromePalette | null = resolveChromePalette(basePalette, ov);
  const themeMode = eff.tint === "theme" && !!palette;
  const onDark = themeMode && palette ? isDarkColor(palette.bg) : modeOnDark;
  const tint: ChromeTint = themeMode ? "theme" : eff.tint === "dark" && siteDark ? "elevated" : eff.tint;
  const chromeStyle: CSSProperties | undefined = themeMode && palette ? themeChromeStyle(palette.bg, palette.fg) : undefined;
  const store = data.store;
  const announcement = store.announcementActive && store.announcement ? store.announcement : null;
  const shared = { data, cfg: eff, a, onDark, tint, siteDark, store, announcement, chromeStyle };

  switch (eff.variant) {
    case 2: return <FooterCenter {...shared} />;
    case 3: return <FooterMinimal {...shared} />;
    case 4: return <FooterBand {...shared} />;
    case 5: return <FooterContact {...shared} />;
    case 6: return <FooterColumns {...shared} />;
    case 7: return <FooterMagazine {...shared} />;
    case 8: return <FooterApp {...shared} />;
    case 1:
    default: return <FooterMega {...shared} />;
  }
}

type VariantProps = {
  data: HomeData;
  cfg: FooterCfg;
  a: ReturnType<typeof getAccent>;
  onDark: boolean;
  tint: ChromeTint;
  siteDark: boolean;
  store: HomeData["store"];
  announcement: string | null;
  /** v24: theme-palette inline colors (tint "theme" only) */
  chromeStyle?: CSSProperties;
};

/* real quick links shared by most variants */
function quickLinks(a: ReturnType<typeof getAccent>, onDark: boolean) {
  return [
    { href: "/products", label: "همه محصولات", icon: PackageSearch },
    { href: "/cart", label: "سبد خرید", icon: ShoppingCart },
    { href: "/account", label: "حساب من", icon: User },
    { href: "/track-order", label: "پیگیری سفارش", icon: Truck },
    { href: "/contact", label: "تماس با ما", icon: MessageCircle },
  ].map((l) => ({
    ...l,
    className: cn(
      "flex h-10 items-center gap-2 rounded-xl px-3 text-[12px] font-bold transition-all hover:-translate-y-0.5",
      onDark ? "bg-white/5 hover:bg-white/15" : "bg-card border border-border hover:shadow-md",
      a && a.text
    ),
  }));
}

/* v27b: per-template footer blurb — the ACTIVE template's footerText
 * override (Admin → تنظیمات → فوتر → «تنظیمات فوتر قالب فعال») wins over
 * the announcement fallback; global default when neither is set. */
function footerBlurb(store: HomeData["store"], announcement: string | null, fallback: string) {
  return store.footerContent?.footerText?.trim() || announcement || fallback;
}

/* v27b: one custom {label,url} link row (per-template footer links) —
 * internal (/…) hrefs use next/link, absolute http(s) targets render a
 * new-tab anchor. Class comes from the calling variant (exact mirror of
 * that variant's own link styling). */
function FooterCustomLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function infoLinkList(data: HomeData, count: number) {
  const links = (data.infoLinks ?? []).slice(0, count);
  return links.length > 0 ? links : [{ slug: "faq", title: "سوالات متداول" }];
}

/* ═══ F1 · MEGA — trust strip + 4 columns + brand strip + credit ════ */
function FooterMega({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  // v27b: per-template custom link columns (empty → column hidden, no gap)
  const customCustomer = store.footerContent?.customerLinks ?? [];
  const customStore = store.footerContent?.storeLinks ?? [];
  const hasCustomCols = customCustomer.length > 0 || customStore.length > 0;
  /* grid tracks follow the number of custom columns (0/1/2 extra) */
  const gridCols = customCustomer.length > 0 && customStore.length > 0
    ? "lg:grid-cols-[minmax(240px,1.6fr)_1fr_1fr] xl:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr_1fr_1fr]"
    : hasCustomCols
      ? "lg:grid-cols-[minmax(240px,1.6fr)_1fr_1fr] xl:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr_1fr]"
      : "lg:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr]";
  const trust = [
    { icon: ShieldCheck, title: "ضمانت اصالت", desc: "کالای اورجینال" },
    { icon: Truck, title: "ارسال سریع", desc: "سراسر ایران" },
    { icon: RotateCcw, title: "بازگشت کالا", desc: "۷ روز مهلت" },
    { icon: Headphones, title: "پشتیبانی", desc: "پاسخ‌گوی شما" },
  ];

  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint))}>
      {cfg.trust && (
        <div className={cn("border-b", onDark ? "border-white/10" : "border-border")}>
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 md:grid-cols-4 md:gap-4">
            {trust.map((t) => (
              <div key={t.title} className="flex items-center gap-2.5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", a ? a.soft : "bg-muted")}>
                  <t.icon className={cn("h-4 w-4", a && a.text)} aria-hidden />
                </span>
                <span className="flex flex-col leading-5">
                  <span className={cn("text-[12px] font-black", onDark ? "" : "")}>{t.title}</span>
                  <span className={cn("text-[10px]", onDark ? "text-background/50" : "text-muted-foreground")}>{t.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className={cn("grid gap-8 md:grid-cols-2 lg:gap-10", gridCols)}>
          {/* brand block */}
          <div>
            <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
              <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
            </Link>
            <p className={cn("mt-4 max-w-sm text-[12.5px] leading-7", onDark ? "text-background/60" : "text-muted-foreground")}>
              {footerBlurb(store, announcement, `${store.storeName} — فروشگاه تخصصی کالای دیجیتال با ضمانت اصالت، قیمت منصفانه و ارسال سریع.`)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PhoneChip phone={store.phone} a={a} onDark={onDark} />
              <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
              <span className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[11px] font-bold", onDark ? "border-white/15 bg-white/5 text-background/70" : "border-border bg-card text-muted-foreground")}>
                <CreditCard className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
                پرداخت امن
              </span>
            </div>
          </div>
          {/* categories column (real) */}
          {cfg.categories !== 0 && data.categories.length > 0 && (
            <nav aria-label="دسته‌بندی‌ها">
              <p className={cn("mb-3 text-[12.5px] font-black", a && a.text)}>دسته‌بندی‌ها</p>
              <ul className="space-y-2">
                {data.categories.slice(0, cfg.categories).map((c) => (
                  <li key={c.id}>
                    <Link href={`/products?category=${c.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {/* services column (real CMS links) */}
          <nav aria-label="خدمات مشتریان">
            <p className={cn("mb-3 text-[12.5px] font-black", a && a.text)}>خدمات مشتریان</p>
            <ul className="space-y-2">
              {infoLinkList(data, 6).map((l) => (
                <li key={l.slug}>
                  <Link href={`/info/${l.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* shopping column */}
          <nav aria-label="راهنمای خرید">
            <p className={cn("mb-3 text-[12.5px] font-black", a && a.text)}>خرید و پیگیری</p>
            <ul className="space-y-2">
              <li><Link href="/products" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>فروشگاه</Link></li>
              <li><Link href="/cart" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>سبد خرید</Link></li>
              <li><Link href="/track-order" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>پیگیری سفارش</Link></li>
              <li><Link href="/account" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>حساب کاربری</Link></li>
              <li><Link href="/contact" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>تماس با ما</Link></li>
            </ul>
          </nav>
          {/* v27b: per-template custom link columns — mirror the infoLinks
              columns above exactly; hidden (no gap) when empty */}
          {customCustomer.length > 0 && (
            <nav aria-label="خدمات مشتریان این قالب">
              <p className={cn("mb-3 text-[12.5px] font-black", a && a.text)}>خدمات مشتریان</p>
              <ul className="space-y-2">
                {customCustomer.map((l, i) => (
                  <li key={`c-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {customStore.length > 0 && (
            <nav aria-label="فروشگاه این قالب">
              <p className={cn("mb-3 text-[12.5px] font-black", a && a.text)}>فروشگاه</p>
              <ul className="space-y-2">
                {customStore.map((l, i) => (
                  <li key={`s-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <div className={cn("mt-8 border-t pt-6", onDark ? "border-white/10" : "border-border")}>
            <p className={cn("mb-3 text-[11px] font-black", onDark ? "text-background/60" : "text-muted-foreground")}>
              برندهای همکار ({data.counts.brands.toLocaleString("fa-IR")})
            </p>
            {/* v19: footer brand strip is ALWAYS an infinite marquee loop */}
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} />
          </div>
        )}
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F2 · CENTER — centered wordmark + links + brand chips ═════════ */
function FooterCenter({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  // v27b: per-template custom links — CENTER has no columns, so they join
  // the centered quick-links row, styled exactly like the infoLinks there
  const customCustomer = store.footerContent?.customerLinks ?? [];
  const customStore = store.footerContent?.storeLinks ?? [];
  const customLinkCls = cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground");
  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint), cfg.round && "rounded-t-[2.5rem] md:rounded-t-[3.5rem]")}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-10 text-center md:py-14">
        <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
          <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "wordmark"} a={a} onDark={onDark} />
        </Link>
        <p className={cn("max-w-md text-[12.5px] leading-7", onDark ? "text-background/60" : "text-muted-foreground")}>
          {footerBlurb(store, announcement, `${store.storeName} — انتخابی مطمئن برای کالای دیجیتال.`)}
        </p>
        <nav aria-label="پیوندهای سریع" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {quickLinks(a, onDark).map((l) => (
            <Link key={l.href} href={l.href} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
              {l.label}
            </Link>
          ))}
          {infoLinkList(data, 3).map((l) => (
            <Link key={l.slug} href={`/info/${l.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
              {l.title}
            </Link>
          ))}
          {/* v27b: per-template custom links (hidden when not configured) */}
          {customCustomer.map((l, i) => (
            <FooterCustomLink key={`c-${i}`} href={l.url} className={customLinkCls}>
              {l.label}
            </FooterCustomLink>
          ))}
          {customStore.map((l, i) => (
            <FooterCustomLink key={`s-${i}`} href={l.url} className={customLinkCls}>
              {l.label}
            </FooterCustomLink>
          ))}
        </nav>
        <PhoneChip phone={store.phone} a={a} onDark={onDark} />
        <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
        {/* v19: infinite brand marquee loop */}
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee max={8} dur={cfg.brandSpeed} />
        )}
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F3 · MINIMAL — compact light footer ═══════════════════════════ */
function FooterMinimal({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint))}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
            <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "mono"} a={a} onDark={onDark} compact />
          </Link>
          <nav aria-label="پیوندهای فوتر" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {quickLinks(a, onDark).slice(0, 4).map((l) => (
              <Link key={l.href} href={l.href} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                {l.label}
              </Link>
            ))}
            {infoLinkList(data, 2).map((l) => (
              <Link key={l.slug} href={`/info/${l.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                {l.title}
              </Link>
            ))}
          </nav>
          <PhoneChip phone={store.phone} a={a} onDark={onDark} />
          <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
        </div>
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <div className={cn("mt-6 border-t pt-5", onDark ? "border-white/10" : "border-border")}>
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} />
          </div>
        )}
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F4 · BAND — dark gradient band with rounded top ═══════════════ */
function FooterBand({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  return (
    <footer
      data-chrome-footer=""
      style={chromeStyle}
      className={cn(
        "relative w-full overflow-hidden border-t",
        chromeSurface(tint),
        cfg.round && "rounded-t-[2rem] md:rounded-t-[3rem]"
      )}
    >
      {/* soft accent glow — breathing */}
      <span aria-hidden className={cn("pointer-events-none absolute -top-24 end-1/4 h-56 w-56 rounded-full blur-3xl opacity-20 taj-breathe", a.dot)} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-12 lg:grid-cols-[minmax(260px,1.4fr)_2fr]">
        <div>
          <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
            <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
          </Link>
          <p className={cn("mt-4 max-w-sm text-[12.5px] leading-7", onDark ? "text-background/60" : "text-muted-foreground")}>
            {footerBlurb(store, announcement, "خرید مطمئن کالای دیجیتال با ضمانت اصالت و ارسال سریع.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PhoneChip phone={store.phone} a={a} onDark={onDark} />
            <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
            <span className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[11px] font-bold", onDark ? "border-white/15 bg-white/5 text-background/70" : "border-border bg-card text-muted-foreground")}>
              <ShieldCheck className={cn("h-3.5 w-3.5", a && a.text)} aria-hidden />
              ضمانت اصالت کالا
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <nav aria-label="خرید سریع">
            <p className={cn("mb-3 text-[12px] font-black", a && a.text)}>خرید سریع</p>
            <ul className="space-y-2.5">
              {quickLinks(a, onDark).slice(0, 4).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={cn("flex items-center gap-1.5 text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                    <ArrowLeft className="h-3 w-3 opacity-50" aria-hidden />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="خدمات">
            <p className={cn("mb-3 text-[12px] font-black", a && a.text)}>خدمات</p>
            <ul className="space-y-2.5">
              {infoLinkList(data, 4).map((l) => (
                <li key={l.slug}>
                  <Link href={`/info/${l.slug}`} className={cn("flex items-center gap-1.5 text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                    <ArrowLeft className="h-3 w-3 opacity-50" aria-hidden />
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="دسته‌بندی‌ها" className="col-span-2 sm:col-span-1">
            <p className={cn("mb-3 text-[12px] font-black", a && a.text)}>دسته‌بندی‌ها</p>
            <ul className="space-y-2.5">
              {data.categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/products?category=${c.slug}`} className={cn("flex items-center gap-1.5 text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                    <ArrowLeft className="h-3 w-3 opacity-50" aria-hidden />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      {cfg.brandStrip !== "none" && data.brands.length > 0 && (
        <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
          <div className="mx-auto max-w-7xl px-4 py-4">
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} max={10} />
          </div>
        </div>
      )}
      <div className={cn("relative border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F5 · CONTACT — contact-first cards ════════════════════════════ */
function FooterContact({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  const cards = [
    { icon: Phone, title: "تلفن پشتیبانی", value: store.phone ?? "—", href: store.phone ? `tel:${store.phone.replace(/\s/g, "")}` : null, ltr: true },
    { icon: FileQuestion, title: "پرسش‌های متداول", value: "پاسخ سریع سوال‌ها", href: "/info/faq", ltr: false },
    { icon: PackageSearch, title: "پیگیری سفارش", value: "وضعیت لحظه‌ای مرسوله", href: "/track-order", ltr: false },
    { icon: MessageCircle, title: "گفت‌وگو با ما", value: "فرم تماس و گفت‌وگوی زنده", href: "/contact", ltr: false },
  ];

  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint))}>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const inner = (
              <>
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", a ? a.soft : "bg-muted")}>
                  <c.icon className={cn("h-5 w-5", a && a.text)} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col leading-6">
                  <span className="text-[11px] font-bold opacity-70">{c.title}</span>
                  <span dir={c.ltr ? "ltr" : "rtl"} className="truncate text-[13px] font-black">{c.value}</span>
                </span>
              </>
            );
            return c.href ? (
              <a key={c.title} href={c.href} className={cn("flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-1", onDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-border bg-card hover:shadow-lg")}>
                {inner}
              </a>
            ) : (
              <div key={c.title} className={cn("flex items-center gap-3 rounded-2xl border p-4", onDark ? "border-white/10 bg-white/5" : "border-border bg-card")}>
                {inner}
              </div>
            );
          })}
        </div>
        <div className={cn("mt-8 flex flex-col items-start justify-between gap-5 border-t pt-7 md:flex-row md:items-center", onDark ? "border-white/10" : "border-border")}>
          <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
            <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "mono"} a={a} onDark={onDark} />
          </Link>
          <p className={cn("max-w-md text-[12px] leading-6", onDark ? "text-background/60" : "text-muted-foreground")}>
            {footerBlurb(store, announcement, `${store.storeName} — پاسخ‌گوی شما از انتخاب تا تحویل.`)}
          </p>
          <nav aria-label="پیوندهای فوتر" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {infoLinkList(data, 5).map((l) => (
              <Link key={l.slug} href={`/info/${l.slug}`} className={cn("text-[11.5px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>
                {l.title}
              </Link>
            ))}
            <Link href="/products" className={cn("text-[11.5px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/75" : "text-muted-foreground")}>فروشگاه</Link>
          </nav>
          <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
        </div>
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <div className={cn("mt-7 border-t pt-6", onDark ? "border-white/10" : "border-border")}>
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} />
          </div>
        )}
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F6 · COLUMNS — link columns + brand block ═══════════════════ */

/** v31 (gaming-cyber, cfg.social): REAL social icon row — the links come
 * from the public /api/store-info payload (admin → تنظیمات، same source
 * the shared server footer uses), fetched once client-side. Renders
 * nothing until the fetch resolves and at least one link exists — no
 * fabricated URLs. Icons carry the .gc-soc neon hover-glow class styled
 * in the gaming template's scoped CSS. */
function ChromeSocialRow({ onDark }: { onDark?: boolean }) {
  const [links, setLinks] = useState<{ key: string; href: string; label: string; icon: React.ElementType }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/store-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { social?: Record<string, string | null> } | null) => {
        if (!alive || !j?.social) return;
        const s = j.social;
        const out: { key: string; href: string; label: string; icon: React.ElementType }[] = [];
        if (s.instagram) out.push({ key: "instagram", href: s.instagram, label: "اینستاگرام", icon: Instagram });
        if (s.telegram) out.push({ key: "telegram", href: s.telegram, label: "تلگرام", icon: Send });
        if (s.whatsapp) out.push({ key: "whatsapp", href: s.whatsapp, label: "واتس‌اپ", icon: MessageCircle });
        if (s.youtube) out.push({ key: "youtube", href: s.youtube, label: "یوتیوب", icon: Youtube });
        if (s.twitter) out.push({ key: "twitter", href: s.twitter, label: "توییتر", icon: Twitter });
        if (s.linkedin) out.push({ key: "linkedin", href: s.linkedin, label: "لینکدین", icon: Linkedin });
        setLinks(out);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (links.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="شبکه‌های اجتماعی فروشگاه">
      {links.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          title={s.label}
          className={cn(
            "gc-soc grid h-10 w-10 place-items-center rounded-full border",
            onDark ? "border-white/15 bg-white/10" : "border-border bg-card"
          )}
        >
          <s.icon className="h-4.5 w-4.5" aria-hidden />
        </a>
      ))}
    </div>
  );
}

function FooterColumns({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  // v27b: per-template custom link columns (empty → column hidden, no gap)
  const customCustomer = store.footerContent?.customerLinks ?? [];
  const customStore = store.footerContent?.storeLinks ?? [];
  const hasCustomCols = customCustomer.length > 0 || customStore.length > 0;
  /* grid tracks follow the number of custom columns (0/1/2 extra) */
  const gridCols = customCustomer.length > 0 && customStore.length > 0
    ? "md:grid-cols-3 xl:grid-cols-5"
    : hasCustomCols
      ? "md:grid-cols-3 xl:grid-cols-4"
      : "md:grid-cols-3";
  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint))}>
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <div className={cn("grid gap-8", gridCols)}>
          <nav aria-label="دسته‌بندی‌ها">
            <p className={cn("mb-4 flex items-center gap-2 text-[13px] font-black", a && a.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
              دسته‌بندی‌ها
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {data.categories.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.slug}`}
                    className={cn("text-[12px] font-bold transition-all hover:-translate-y-0.5 hover:opacity-100", onDark ? "text-background/65 hover:text-background" : "text-muted-foreground hover:text-foreground")}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="خدمات مشتریان">
            <p className={cn("mb-4 flex items-center gap-2 text-[13px] font-black", a && a.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
              خدمات مشتریان
            </p>
            <ul className="space-y-2.5">
              {infoLinkList(data, 6).map((l) => (
                <li key={l.slug}>
                  <Link href={`/info/${l.slug}`} className={cn("text-[12px] font-bold transition-all hover:-translate-y-0.5", onDark ? "text-background/65 hover:text-background" : "text-muted-foreground hover:text-foreground")}>
                    {l.title}
                  </Link>
                </li>
              ))}
              <li><Link href="/track-order" className={cn("text-[12px] font-bold transition-all hover:-translate-y-0.5", onDark ? "text-background/65 hover:text-background" : "text-muted-foreground hover:text-foreground")}>پیگیری سفارش</Link></li>
            </ul>
          </nav>
          {/* v27b: per-template custom link columns — mirror the services
              column above exactly (dot + glow hover); hidden when empty */}
          {customCustomer.length > 0 && (
            <nav aria-label="خدمات مشتریان این قالب">
              <p className={cn("mb-4 flex items-center gap-2 text-[13px] font-black", a && a.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
                خدمات مشتریان
              </p>
              <ul className="space-y-2.5">
                {customCustomer.map((l, i) => (
                  <li key={`c-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-all hover:-translate-y-0.5", onDark ? "text-background/65 hover:text-background" : "text-muted-foreground hover:text-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {customStore.length > 0 && (
            <nav aria-label="فروشگاه این قالب">
              <p className={cn("mb-4 flex items-center gap-2 text-[13px] font-black", a && a.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
                فروشگاه
              </p>
              <ul className="space-y-2.5">
                {customStore.map((l, i) => (
                  <li key={`s-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-all hover:-translate-y-0.5", onDark ? "text-background/65 hover:text-background" : "text-muted-foreground hover:text-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div>
            {/* v29.2: FooterColumns (e.g. gaming-cyber footer) was the ONLY variant
                without a logo — the uploaded footer logo was invisible on those
                templates. Now the mark renders above the store-name column like
                every other variant (footerLogo → logo → monogram fallback). */}
            <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "square"} a={a} onDark={onDark} />
            <p className={cn("mb-4 mt-4 flex items-center gap-2 text-[13px] font-black", a && a.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full taj-breathe", a.dot)} aria-hidden />
              {store.storeName}
            </p>
            <p className={cn("text-[12px] leading-7", onDark ? "text-background/60" : "text-muted-foreground")}>
              {footerBlurb(store, announcement, "تجربهٔ خرید سریع و مطمئن کالای دیجیتال.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PhoneChip phone={store.phone} a={a} onDark={onDark} />
              <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
            </div>
            {/* v31: gaming social row — real links, neon hover glow */}
            {cfg.social && <ChromeSocialRow onDark={onDark} />}
            <Link
              href="/products"
              className={cn("mt-5 inline-flex h-11 items-center gap-2 rounded-2xl px-6 text-[12.5px] font-black taj-shine", a.solid)}
            >
              <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
              شروع خرید
              <ChevronLeftTurn />
            </Link>
          </div>
        </div>
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <div className={cn("mt-9 border-t pt-6", onDark ? "border-white/10" : "border-border")}>
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} />
          </div>
        )}
      </div>
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F7 · MAGAZINE — editorial columns with giant wordmark ═════════ */
function FooterMagazine({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  // v27b: per-template custom link columns (empty → column hidden, no gap)
  const customCustomer = store.footerContent?.customerLinks ?? [];
  const customStore = store.footerContent?.storeLinks ?? [];
  const hasCustomCols = customCustomer.length > 0 || customStore.length > 0;
  /* grid tracks follow the number of custom columns (0/1/2 extra) */
  const gridCols = customCustomer.length > 0 && customStore.length > 0
    ? "md:grid-cols-[minmax(240px,1.4fr)_1fr_1fr] xl:grid-cols-[minmax(240px,1.4fr)_1fr_1fr_1fr_1fr]"
    : hasCustomCols
      ? "md:grid-cols-[minmax(240px,1.4fr)_1fr_1fr] xl:grid-cols-[minmax(240px,1.4fr)_1fr_1fr_1fr]"
      : "md:grid-cols-[minmax(240px,1.4fr)_1fr_1fr]";
  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("relative w-full overflow-hidden border-t", chromeSurface(tint))}>
      <span
        aria-hidden
        dir="ltr"
        className={cn("pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center font-black leading-none tracking-tighter opacity-[0.05]", onDark ? "text-background" : "text-foreground")}
        style={{ fontSize: "clamp(80px, 14vw, 220px)" }}
      >
        {store.storeNameEn || "TAJ"}
      </span>
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className={cn("grid gap-8 md:gap-10", gridCols)}>
          <div>
            <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
              <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "wordmark"} a={a} onDark={onDark} />
            </Link>
            <p className={cn("mt-5 max-w-sm border-s-2 ps-4 text-[12.5px] leading-7", onDark ? "border-white/15 text-background/60" : "border-border text-muted-foreground")}>
              {footerBlurb(store, announcement, `تحریریهٔ ${store.storeName} — راهنمای خرید صادقانه برای کالای دیجیتال.`)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PhoneChip phone={store.phone} a={a} onDark={onDark} />
              <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
            </div>
          </div>
          <nav aria-label="ستون دسته‌بندی‌ها" className={cn("md:border-s md:ps-8", onDark ? "md:border-white/10" : "md:border-border")}>
            <p className={cn("mb-4 text-[12.5px] font-black", a && a.text)}>بخش‌های فروشگاه</p>
            <ul className="space-y-2.5">
              {data.categories.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link href={`/products?category=${c.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="ستون خدمات" className={cn("md:border-s md:ps-8", onDark ? "md:border-white/10" : "md:border-border")}>
            <p className={cn("mb-4 text-[12.5px] font-black", a && a.text)}>خدمات و راهنما</p>
            <ul className="space-y-2.5">
              {infoLinkList(data, 5).map((l) => (
                <li key={l.slug}>
                  <Link href={`/info/${l.slug}`} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                    {l.title}
                  </Link>
                </li>
              ))}
              <li><Link href="/track-order" className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>پیگیری سفارش</Link></li>
            </ul>
          </nav>
          {/* v27b: per-template custom link columns — mirror the editorial
              services column exactly (border-s rail); hidden when empty */}
          {customCustomer.length > 0 && (
            <nav aria-label="خدمات مشتریان این قالب" className={cn("md:border-s md:ps-8", onDark ? "md:border-white/10" : "md:border-border")}>
              <p className={cn("mb-4 text-[12.5px] font-black", a && a.text)}>خدمات مشتریان</p>
              <ul className="space-y-2.5">
                {customCustomer.map((l, i) => (
                  <li key={`c-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {customStore.length > 0 && (
            <nav aria-label="فروشگاه این قالب" className={cn("md:border-s md:ps-8", onDark ? "md:border-white/10" : "md:border-border")}>
              <p className={cn("mb-4 text-[12.5px] font-black", a && a.text)}>فروشگاه</p>
              <ul className="space-y-2.5">
                {customStore.map((l, i) => (
                  <li key={`s-${i}`}>
                    <FooterCustomLink href={l.url} className={cn("text-[12px] font-bold transition-colors hover:opacity-70", onDark ? "text-background/70" : "text-muted-foreground")}>
                      {l.label}
                    </FooterCustomLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        {cfg.brandStrip !== "none" && data.brands.length > 0 && (
          <div className={cn("mt-9 border-t pt-6", onDark ? "border-white/10" : "border-border")}>
            {/* v19: infinite brand marquee loop */}
          <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee max={9} dur={cfg.brandSpeed} />
          </div>
        )}
      </div>
      <div className={cn("relative border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* ═══ F8 · APP — app-style compact footer ═══════════════════════════ */
function FooterApp({ data, cfg, a, onDark, tint, store, announcement, chromeStyle }: VariantProps) {
  const tabs = [
    { href: "/products", label: "فروشگاه", icon: PackageSearch },
    { href: "/cart", label: "سبد خرید", icon: ShoppingCart },
    { href: "/track-order", label: "پیگیری", icon: Truck },
    { href: "/account", label: "حساب من", icon: User },
    { href: "/contact", label: "تماس", icon: MessageCircle },
  ];

  return (
    <footer data-chrome-footer="" style={chromeStyle} className={cn("w-full border-t", chromeSurface(tint), "rounded-t-[1.75rem] md:rounded-t-[2.5rem]")}>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <nav aria-label="دسترسی سریع اپ" className="grid grid-cols-5 gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-all hover:-translate-y-1",
                onDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-border bg-card hover:shadow-lg",
                a && a.border
              )}
            >
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl", a ? a.soft : "bg-muted")}>
                <t.icon className={cn("h-5 w-5", a && a.text)} aria-hidden />
              </span>
              <span className="text-[10.5px] font-black">{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-8 text-center">
        <Link href="/" aria-label={`صفحه اصلی ${store.storeName}`}>
          <ChromeLogo store={store} mark={store.footerLogo ?? store.logo ?? undefined} style={cfg.logo ?? "round"} a={a} onDark={onDark} compact />
        </Link>
        <p className={cn("max-w-sm text-[12px] leading-6", onDark ? "text-background/60" : "text-muted-foreground")}>
          {footerBlurb(store, announcement, `${store.storeName} — خرید کالای دیجیتال، به سادگی یک اپ.`)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <PhoneChip phone={store.phone} a={a} onDark={onDark} />
          <TelegramBotChip url={store.telegramBotUrl} a={a} onDark={onDark} />
          {infoLinkList(data, 2).map((l) => (
            <Link
              key={l.slug}
              href={`/info/${l.slug}`}
              className={cn("inline-flex h-10 items-center rounded-full border px-4 text-[11.5px] font-bold transition-all hover:-translate-y-0.5", onDark ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-border bg-card hover:shadow-md", a && a.text)}
            >
              {l.title}
            </Link>
          ))}
        </div>
      </div>
      {cfg.brandStrip !== "none" && data.brands.length > 0 && (
        <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
          <div className="mx-auto max-w-7xl px-4 py-4">
            <ChromeBrandStrip brands={data.brands} a={a} onDark={onDark} marquee dur={cfg.brandSpeed} max={10} />
          </div>
        </div>
      )}
      <div className={cn("border-t", onDark ? "border-white/10" : "border-border")}>
        <div data-copyright-bar className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4">
          <CopyrightLine storeName={store.storeName} onDark={onDark} text={store.footerContent?.copyrightText ?? undefined} />
          <AlaruzCredit onDark={onDark} a={a} />
        </div>
      </div>
    </footer>
  );
}

/* tiny helper so F6 CTA stays RTL-correct without extra imports */
function ChevronLeftTurn() {
  return <span aria-hidden className="text-[10px] leading-none">‹</span>;
}

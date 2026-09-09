"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMe, useCategories } from "@/hooks/use-store";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useBranding } from "@/components/providers/branding-provider";
import { TAJLogo } from "./logo";
import { CartDrawerButton } from "./cart-drawer";
import { ChromeHeaderNav } from "./templates/chrome/bits";
import { ChromeSkinStyle } from "./templates/chrome/header";
import { paletteAnnouncementStyle, paletteForMode, type TemplatePalette, type TemplatePalettePair } from "@/lib/templates/canvas";
import type { HomeData } from "@/lib/templates/types";
import { getCategoryIcon } from "@/lib/templates/category-icons";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Search, Heart, User, Sun, Moon, Menu, X, Package, LogIn, LogOut,
  Sparkles, ChevronLeft, MapPin, Phone, LayoutGrid, BadgeCheck, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const emptySubscribe = () => () => {};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // hydration-safe "mounted" flag without setState-in-effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="تغییر پوسته"
      className="h-11 w-11 rounded-full"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

type SuggestProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  brand: string;
  inStock: boolean;
};
type Suggest = {
  products: SuggestProduct[];
  categories: { name: string; slug: string }[];
};

function SearchBox({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const branding = useBranding();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1); // keyboard index over flat suggestion list
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* flat list: categories → products → "view all" */
  const items: { key: string; href: string }[] = (results?.categories ?? []).map((c) => ({
    key: `cat-${c.slug}`,
    href: `/products?category=${c.slug}`,
  }));
  items.push(...(results?.products ?? []).map((p) => ({ key: p.id, href: `/products/${p.slug}` })));
  const total = items.length + 1; // +1 = "view all results" action

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      setActive(-1);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        setResults(json);
        setOpen(true);
        setActive(-1);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = () => {
    if (q.trim().length > 0) {
      router.push(`/products?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
      onNavigate?.();
    }
  };

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQ("");
    onNavigate?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || total === 0) {
      if (e.key === "Enter") submit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < items.length) go(items[active].href);
      else submit();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  /* keep the active row in view while arrowing */
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    listRef.current.querySelector(`[data-sug="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const hasResults = (results?.products.length ?? 0) > 0 || (results?.categories.length ?? 0) > 0;

  return (
    <div ref={boxRef} className="relative flex-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative"
        role="search"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && hasResults && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={`جستجو در ${branding.storeName}… مثلاً: iPhone 17 Pro Max`}
          className="h-11 rounded-xl pe-11 ps-4 text-sm bg-card border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="جستجو"
          role="combobox"
          aria-expanded={open && !!results}
          aria-controls="search-suggest-list"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `sug-${active}` : undefined}
        />
        <button
          type="submit"
          aria-label="جستجو"
          className="absolute inset-y-0 end-1 my-auto grid place-items-center h-9 w-9 rounded-lg gold-surface text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {open && results && (
        <div
          id="search-suggest-list"
          role="listbox"
          ref={listRef}
          className="absolute z-50 mt-2 w-full rounded-2xl border bg-popover shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95"
        >
          {!hasResults && (
            <div className="p-5 text-sm text-muted-foreground text-center">
              محصولی برای «{q}» پیدا نشد
            </div>
          )}

          {results.categories.length > 0 && (
            <div className="p-2 border-b">
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-muted-foreground">دسته‌بندی‌ها</p>
              {results.categories.map((c, i) => {
                const CatIcon = getCategoryIcon(c.name, c.slug);
                return (
                <button
                  key={c.slug}
                  data-sug={i}
                  id={`sug-${i}`}
                  role="option"
                  aria-selected={active === i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/products?category=${c.slug}`)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-start transition-colors",
                    active === i ? "bg-accent" : "hover:bg-accent"
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CatIcon className="h-4 w-4" aria-hidden />
                  </span>
                  {c.name}
                  <span className="ms-auto text-[10px] font-bold text-muted-foreground">دسته‌بندی</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                );
              })}
            </div>
          )}

          {results.products.length > 0 && (
            <div className="max-h-80 overflow-y-auto p-2">
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-muted-foreground">محصولات</p>
              <div className="space-y-1">
                {results.products.map((p, i) => {
                  const idx = (results.categories.length ?? 0) + i;
                  return (
                    <button
                      key={p.id}
                      data-sug={idx}
                      id={`sug-${idx}`}
                      role="option"
                      aria-selected={active === idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(`/products/${p.slug}`)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors",
                        active === idx ? "bg-accent" : "hover:bg-accent"
                      )}
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="h-11 w-11 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
                      ) : (
                        <span className="grid h-11 w-11 rounded-lg bg-muted place-items-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold leading-5">{p.name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{p.brand}</span>
                          {p.inStock ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold text-primary">موجود</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-px text-[9px] font-bold text-destructive">ناموجود</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-extrabold text-primary tabular-nums">
                        {formatPrice(p.price)}
                        <span className="text-[9px] font-normal text-muted-foreground"> تومان</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            data-sug={total - 1}
            id={`sug-${total - 1}`}
            role="option"
            aria-selected={active === total - 1}
            onMouseEnter={() => setActive(total - 1)}
            onClick={submit}
            className={cn(
              "w-full border-t px-4 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
              active === total - 1 ? "bg-accent text-primary" : "text-primary hover:bg-accent"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            مشاهده همه نتایج جستجو
          </button>
        </div>
      )}

      {loading && open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border bg-popover shadow-2xl p-4 space-y-2.5">
          <div className="h-10 w-full rounded-lg shimmer" />
          <div className="h-10 w-full rounded-lg shimmer" />
          <div className="h-10 w-2/3 rounded-lg shimmer" />
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { data } = useMe();
  const router = useRouter();
  const { syncLogout } = useAuthSync();
  const user = data?.user;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("از حساب خود خارج شدید");
    // clear all client auth state (me/cart/wishlist) BEFORE the hard nav —
    // belt & braces: the reload resets everything anyway, but this keeps
    // any in-flight renders consistent
    syncLogout();
    window.location.href = "/";
  };

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="rounded-lg hidden sm:inline-flex">
          <Link href="/login">
            <LogIn className="h-4 w-4 me-1" /> ورود
          </Link>
        </Button>
        <Button asChild size="sm" className="rounded-lg gold-surface text-primary-foreground hidden sm:inline-flex hover:opacity-90">
          <Link href="/register">ثبت‌نام</Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="sm:hidden h-11 w-11 rounded-full" aria-label="حساب کاربری">
          <Link href="/login">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    );
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim() || "ت";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 ps-2 hover:bg-accent transition-colors min-h-11" aria-label="حساب کاربری">
          <span className="hidden md:block text-xs font-medium max-w-24 truncate">
            {user.firstName} {user.lastName}
          </span>
          <Avatar className="h-9 w-9 border border-primary/30">
            <AvatarImage src={user.avatar ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {user.phone ?? user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account"><User className="h-4 w-4 me-2" /> حساب کاربری</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders"><Package className="h-4 w-4 me-2" /> سفارش‌های من</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist"><Heart className="h-4 w-4 me-2" /> علاقه‌مندی‌ها</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/addresses"><MapPin className="h-4 w-4 me-2" /> آدرس‌ها</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 me-2" /> خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** count badge with pop animation on change (key remount) */
function CountBadge({ count, tone }: { count: number; tone: "primary" | "destructive" }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className={cn(
        "absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold grid place-items-center animate-badge-pop",
        tone === "primary" ? "gold-surface text-primary-foreground" : "bg-destructive text-white"
      )}
    >
      {count.toLocaleString("fa-IR")}
    </span>
  );
}

export function Header({
  chromeData,
  palette,
  paletteModes,
}: {
  /** v25: server-fetched live nav data (categories w/ photos, brands,
   *  infoLinks) from the (store) layout — powers the categories mega. */
  chromeData?: HomeData | null;
  /** v25: active template canvas palette — paints the announcement band. */
  palette?: TemplatePalette;
  /** v26fix: dual-mode pair — the announcement band follows the light/dark toggle */
  paletteModes?: TemplatePalettePair;
}) {
  const branding = useBranding();
  const { data: meData } = useMe();
  const { data: catData } = useCategories();
  /* v26fix: dual-mode palette — the announcement band follows the visitor's
   *  light/dark toggle (mounted guard keeps SSR + hydration identical) */
  const { resolvedTheme } = useTheme();
  const siteDark = useSyncExternalStore(
    () => () => {},
    () => resolvedTheme === "dark",
    () => false
  );
  const bandPalette = paletteForMode(paletteModes, siteDark) ?? palette;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // mobile expandable search bar
  const wishlistCount = meData?.counts?.wishlist ?? 0;

  /* v25: nav payload — prefer the server-fetched chromeData (has category
   *  photos + brands + CMS links); fall back to the client cache so the
   *  nav buttons never disappear. */
  const navData: HomeData | null =
    chromeData ??
    (catData
      ? ({
          store: { storeName: branding.storeName, storeNameEn: branding.storeNameEn ?? null },
          categories: catData.categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image ?? null,
            productCount: c.productCount,
            branches: c.branches ?? [],
          })),
          brands: [],
          infoLinks: [],
        } as unknown as HomeData)
      : null);
  const aboutLink = navData?.infoLinks?.find((l) => l.slug === "about");

  /* v32 (14-b): store-wide chrome look options (Admin → ظاهر → «هدر و فوتر»)
   * — the header SKIN (one scoped CSS layer over this structure) and the
   * actions placement. The nav item ORDER is applied inside ChromeHeaderNav
   * (bits.tsx) from the same settings object. Missing/«کلاسیک» = byte-
   * identical current header. */
  const storeChrome = chromeData?.store.storeChrome;
  const skin = storeChrome?.skin && storeChrome.skin !== "classic" ? storeChrome.skin : undefined;
  const actionsSplit = storeChrome?.actionsMode === "split";

  return (
    <header data-chrome-skin={skin} className="store-shell-header sticky top-0 z-40 w-full">
      {/* v32 (14-b): the header skin CSS (no-op for «کلاسیک») */}
      <ChromeSkinStyle skin={skin} />
      {/* announcement bar — branding-driven (Settings → فروشگاه).
          v25: painted with the template palette when one is active. */}
      {branding.announcementActive !== false && (
        <div
          className={cn("text-[11px] sm:text-xs", bandPalette ? "" : "bg-foreground text-background")}
          style={bandPalette ? paletteAnnouncementStyle(bandPalette.bg, bandPalette.fg) : undefined}
        >
          <div className="mx-auto max-w-7xl px-4 h-8 flex items-center justify-between gap-3">
            {branding.announcement ? (
              branding.announcementLink ? (
                <Link
                  href={branding.announcementLink}
                  className="flex min-w-0 items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{branding.announcement}</span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{branding.announcement}</span>
                </span>
              )
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">ارسال سریع به سراسر ایران</span>
              </span>
            )}
            <span className="hidden sm:flex items-center gap-4 shrink-0">
              <Link href="/track-order" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Package className="h-3.5 w-3.5" /> پیگیری سفارش
              </Link>
              {branding.phone && (
                <a
                  href={`tel:${branding.phone.replace(/[\s-]/g, "")}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  dir="ltr"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {branding.phone}
                </a>
              )}
            </span>
            <Link href="/track-order" className="sm:hidden flex items-center gap-1 hover:text-primary transition-colors shrink-0">
              <Package className="h-3.5 w-3.5" /> پیگیری
            </Link>
          </div>
        </div>
      )}

      {/* main header — premium glass */}
      <div data-chrome-surface="" className="glass border-b">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-16 md:h-[72px] flex items-center gap-1 sm:gap-2">
            {/* mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-11 w-11 rounded-full" aria-label="منو">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0">
                <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
                <div className="h-full overflow-y-auto">
                  <div className="p-4 border-b flex items-center justify-between">
                    <TAJLogo />
                  </div>
                  <nav className="p-3 space-y-1" aria-label="دسته‌بندی‌ها">
                    {catData?.categories.map((c) => {
                      const CatIcon = getCategoryIcon(c.name, c.slug);
                      return (
                      <Link
                        key={c.id}
                        href={`/products?category=${c.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CatIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.productCount.toLocaleString("fa-IR")}
                        </Badge>
                      </Link>
                      );
                    })}
                  </nav>
                  <div className="border-t p-3 space-y-1">
                    {/* v25: the primary header buttons, mobile sheet edition */}
                    <Link href="/" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold hover:bg-accent">
                      <LayoutGrid className="h-4 w-4" /> خانه
                    </Link>
                    {aboutLink && (
                      <Link href={`/info/${aboutLink.slug}`} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                        <BadgeCheck className="h-4 w-4" /> {aboutLink.title}
                      </Link>
                    )}
                    <Link href="/products" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                      <LayoutGrid className="h-4 w-4" /> همه محصولات
                    </Link>
                    <Link href="/track-order" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                      <Package className="h-4 w-4" /> پیگیری سفارش
                    </Link>
                    <Link href="/compare" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                      <Search className="h-4 w-4" /> مقایسه محصولات
                    </Link>
                    <Link href="/contact" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                      <Headphones className="h-4 w-4" /> تماس با ما
                    </Link>
                    {!meData?.user && (
                      <Link href="/login" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
                        <LogIn className="h-4 w-4" /> ورود / ثبت‌نام
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" aria-label={`${branding.storeName} — صفحه اصلی`} className="shrink-0">
              <TAJLogo compact className="md:hidden" />
              <TAJLogo className="hidden md:inline-flex" />
            </Link>

            {/* v32 (14-b): «مجزا» placement — the dark/light key beside the
                logo at the START of the row (RTL: next to the brand) */}
            {actionsSplit && <ThemeToggle />}

            {/* desktop search */}
            <div className="hidden md:flex flex-1 items-center max-w-2xl mx-2 lg:mx-4">
              <SearchBox />
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11 rounded-full relative"
                aria-label={searchOpen ? "بستن جستجو" : "جستجو"}
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </Button>
              {!actionsSplit && <ThemeToggle />}
              <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-full relative" aria-label={`علاقه‌مندی‌ها (${wishlistCount.toLocaleString("fa-IR")})`}>
                <Link href="/account/wishlist">
                  <Heart className="h-5 w-5" />
                  <CountBadge count={wishlistCount} tone="destructive" />
                </Link>
              </Button>
              {/* basket → mini-cart side drawer (v15) */}
              <CartDrawerButton />
              <UserMenu />
            </div>
          </div>

          {/* mobile expandable search bar */}
          {searchOpen && (
            <div className="md:hidden pb-3 animate-rise">
              <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
            </div>
          )}
        </div>

        {/* v25: primary nav row — خانه / فروشگاه / دسته‌بندی‌ها (hover → categories
            mega panel) / درباره ما / تماس با ما. Scrollable chip strip on mobile,
            full row on lg+. Painted by the template canvas (palette vars). */}
        <nav className="border-t border-border/60" aria-label="منوی اصلی">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex h-11 items-center">
              {navData ? (
                /* v26: no flex-none — the wrapper keeps its flex-1 + min-w-0
                 *  so the inner nav strip scrolls instead of overflowing the
                 *  page sideways on phones (RTL phantom 17px scroll). */
                <ChromeHeaderNav data={navData} />
              ) : (
                <div className="flex h-11 items-center gap-1 overflow-x-auto no-scrollbar">
                  <Link href="/" className="flex h-10 shrink-0 items-center rounded-xl px-3 text-[12.5px] font-bold transition-colors hover:bg-muted">خانه</Link>
                  <Link href="/products" className="flex h-10 shrink-0 items-center rounded-xl px-3 text-[12.5px] font-bold transition-colors hover:bg-muted">فروشگاه</Link>
                  <Link href="/contact" className="flex h-10 shrink-0 items-center rounded-xl px-3 text-[12.5px] font-bold transition-colors hover:bg-muted">تماس با ما</Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

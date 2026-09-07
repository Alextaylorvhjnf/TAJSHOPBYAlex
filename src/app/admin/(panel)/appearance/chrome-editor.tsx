"use client";

/**
 * v24 — ChromeEditorDialog · ویرایشگر «هدر و فوتر» هر قالب (Admin → ظاهر)
 * ---------------------------------------------------------------------------
 * Per-template chrome (header/footer) override editor. The Lead's backend:
 *   GET  /api/admin/templates → { ..., chrome: Record<tplId, {header?, footer?}> }
 *   PUT  /api/admin/templates { templateId, chrome: {header, footer} }  → save
 *   PUT  /api/admin/templates { templateId, chrome: null }             → reset
 * Initial form state mirrors the template's DESIGNED defaults
 * (TEMPLATE_PALETTES + TEMPLATE_CHROME) merged with the admin's saved
 * overrides — so nothing shifts unexpectedly on open. A live mini preview
 * paints both strips with the chosen colors while editing.
 * The Alaruz Design credit is permanent and NOT editable (locked notice).
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Loader2,
  Lock,
  MoonStar,
  Paintbrush,
  PanelTop,
  Palette,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/components/admin/api-client";
import { TEMPLATE_CHROME, TEMPLATE_PALETTES } from "@/components/store/templates/chrome/config";
import type { TemplateDef } from "@/lib/templates/registry";
import type {
  ChromeFooterOverride,
  ChromeHeaderOverride,
  ChromeOverrides,
} from "@/lib/templates/types";
import { cn } from "@/lib/utils";

/* ── option tables (value → Persian label) ─────────────────────────── */

const ACCENTS = [
  { value: "cyan", label: "فیروزه‌ای" },
  { value: "violet", label: "بنفش" },
  { value: "rose", label: "رزی" },
  { value: "amber", label: "کهربایی" },
  { value: "orange", label: "نارنجی" },
  { value: "lime", label: "لیمویی" },
  { value: "emerald", label: "زمرد" },
  { value: "neutral", label: "خنثی" },
  { value: "primary", label: "اصلی" },
] as const;

const LOGOS = [
  { value: "square", label: "مربع" },
  { value: "round", label: "گرد" },
  { value: "wordmark", label: "نوشتاری" },
  { value: "mono", label: "مونو" },
] as const;

const CATEGORY_ROWS = [
  { value: "photos", label: "عکس‌ها" },
  { value: "chips", label: "چیپ‌ها" },
  { value: "none", label: "بدون ردیف" },
] as const;

const BRAND_STRIPS = [
  { value: "photos", label: "عکس‌ها" },
  { value: "chips", label: "چیپ‌ها" },
  { value: "none", label: "بدون نوار" },
] as const;

const ACCENT_VALUES = ACCENTS.map((a) => a.value);
const LOGO_VALUES = LOGOS.map((l) => l.value);
const ROW_VALUES = CATEGORY_ROWS.map((r) => r.value);
const STRIP_VALUES = BRAND_STRIPS.map((b) => b.value);

/* ── form state types ───────────────────────────────────────────────── */

type Accent = (typeof ACCENTS)[number]["value"];
type LogoStyle = (typeof LOGOS)[number]["value"];
type RowMode = (typeof CATEGORY_ROWS)[number]["value"];

type HeaderState = {
  bg: string;
  fg: string;
  accent: Accent;
  logo: LogoStyle;
  sticky: boolean;
  ticker: boolean;
  categoryRow: RowMode;
  megaMenu: boolean;
  showSearch: boolean;
  showAccount: boolean;
  showCart: boolean;
  showThemeToggle: boolean;
};

type FooterState = {
  bg: string;
  fg: string;
  accent: Accent;
  logo: LogoStyle;
  trust: boolean;
  categories: number;
  brandStrip: RowMode;
  round: boolean;
};

/* ── helpers ─────────────────────────────────────────────────────────── */

/** modern-tech (default template) has no bespoke chrome entry — its own
 *  storefront canvas is Cyber-Luxe #0B0E14. */
const FALLBACK_PALETTE = { bg: "#0B0E14", fg: "#E6F1FF" };

function paletteOf(templateId: string): { bg: string; fg: string } {
  return TEMPLATE_PALETTES[templateId] ?? FALLBACK_PALETTE;
}

/** normalize a hand-typed hex string to #RRGGBB (for the native picker) */
function toHex6(v: string): string | null {
  const s = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`;
  if (/^#[0-9a-fA-F]{8}$/.test(s)) return s.slice(0, 7);
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return null;
}

/** hex + 2-digit alpha (for preview borders) — falls back to currentColor */
function alphaColor(v: string, alphaHex: string): string {
  const h = toHex6(v);
  return h ? `${h}${alphaHex}` : "currentColor";
}

/** keep only enum values the editor knows (defensive vs. junk) */
function pickEnum<T extends string>(v: unknown, allowed: readonly string[], fallback: T): T {
  return typeof v === "string" && allowed.includes(v) ? (v as T) : fallback;
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const text = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() ? v : fallback;
const clampCategories = (n: number) => Math.max(0, Math.min(12, Math.round(n)));

/* the template's DESIGNED defaults (what the storefront shows when the
   admin has saved nothing) — mirrors the chrome config fallback rules    */
function designedHeader(templateId: string): HeaderState {
  const cfg = TEMPLATE_CHROME[templateId]?.header;
  const pal = paletteOf(templateId);
  return {
    bg: pal.bg,
    fg: pal.fg,
    accent: (cfg?.accent ?? "neutral") as Accent,
    logo: (cfg?.logo ?? "square") as LogoStyle,
    sticky: cfg?.sticky ?? false,
    ticker: cfg?.ticker ?? false,
    categoryRow: (cfg?.categoryRow ?? "none") as RowMode,
    megaMenu: cfg?.megaMenu ?? false,
    showSearch: true,
    showAccount: true,
    showCart: true,
    showThemeToggle: true,
  };
}

function designedFooter(templateId: string): FooterState {
  const cfg = TEMPLATE_CHROME[templateId]?.footer;
  const pal = paletteOf(templateId);
  return {
    bg: pal.bg,
    fg: pal.fg,
    accent: (cfg?.accent ?? "neutral") as Accent,
    logo: (cfg?.logo ?? "square") as LogoStyle,
    trust: cfg?.trust ?? false,
    categories: cfg?.categories ?? 6,
    brandStrip: (cfg?.brandStrip ?? "photos") as RowMode,
    round: cfg?.round ?? false,
  };
}

/** designed defaults merged with the admin's SAVED override (if any) */
function mergeHeader(templateId: string, ov?: ChromeHeaderOverride): HeaderState {
  const d = designedHeader(templateId);
  if (!ov) return d;
  return {
    bg: text(ov.bg, d.bg),
    fg: text(ov.fg, d.fg),
    accent: pickEnum(ov.accent, ACCENT_VALUES, d.accent),
    logo: pickEnum(ov.logo, LOGO_VALUES, d.logo),
    sticky: bool(ov.sticky, d.sticky),
    ticker: bool(ov.ticker, d.ticker),
    categoryRow: pickEnum(ov.categoryRow, ROW_VALUES, d.categoryRow),
    megaMenu: bool(ov.megaMenu, d.megaMenu),
    showSearch: bool(ov.showSearch, d.showSearch),
    showAccount: bool(ov.showAccount, d.showAccount),
    showCart: bool(ov.showCart, d.showCart),
    showThemeToggle: bool(ov.showThemeToggle, d.showThemeToggle),
  };
}

function mergeFooter(templateId: string, ov?: ChromeFooterOverride): FooterState {
  const d = designedFooter(templateId);
  if (!ov) return d;
  const n = typeof ov.categories === "number" && Number.isFinite(ov.categories) ? ov.categories : d.categories;
  return {
    bg: text(ov.bg, d.bg),
    fg: text(ov.fg, d.fg),
    accent: pickEnum(ov.accent, ACCENT_VALUES, d.accent),
    logo: pickEnum(ov.logo, LOGO_VALUES, d.logo),
    trust: bool(ov.trust, d.trust),
    categories: clampCategories(n),
    brandStrip: pickEnum(ov.brandStrip, STRIP_VALUES, d.brandStrip),
    round: bool(ov.round, d.round),
  };
}

/** same loose color test the backend sanitizer applies */
const COLOR_RE = /^#?[0-9a-zA-Z(),.%\s_-]{3,32}$/;

/* ── tiny labeled primitives (page style) ───────────────────────────── */

function ColorRow({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          id={`${id}-picker`}
          type="color"
          aria-label={`${label} — انتخابگر رنگ`}
          value={(toHex6(value) ?? "#000000").toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <Input
          id={id}
          dir="ltr"
          inputMode="text"
          placeholder="#RRGGBB"
          className="h-11 rounded-lg font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** the two color pickers + the «هم‌رنگ قالب» ghost reset (both colors) */
function ColorFields({
  scopeId,
  bgLabel,
  fgLabel,
  bg,
  fg,
  palette,
  onBg,
  onFg,
}: {
  scopeId: string;
  bgLabel: string;
  fgLabel: string;
  bg: string;
  fg: string;
  palette: { bg: string; fg: string };
  onBg: (v: string) => void;
  onFg: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
          <Palette className="h-3.5 w-3.5 text-primary" />
          رنگ‌ها
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-[11px] font-bold"
          onClick={() => {
            onBg(palette.bg);
            onFg(palette.fg);
          }}
        >
          <Paintbrush className="h-3.5 w-3.5" />
          هم‌رنگ قالب
        </Button>
      </div>
      <ColorRow id={`${scopeId}-bg`} label={bgLabel} value={bg} onChange={onBg} />
      <ColorRow id={`${scopeId}-fg`} label={fgLabel} value={fg} onChange={onFg} />
    </div>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 transition-colors hover:border-primary/40"
    >
      <span className="text-xs font-bold">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

function SelectRow({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full rounded-lg text-xs font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ── live mini previews (instant color feedback) ─────────────────────── */

function LiveHeaderStrip({ header }: { header: HeaderState }) {
  return (
    <div
      dir="rtl"
      className="flex items-center justify-between gap-3 overflow-hidden rounded-lg px-4 py-2.5 shadow-sm transition-colors"
      style={{ backgroundColor: header.bg, color: header.fg }}
    >
      <span className="text-xs font-black tracking-tight">لوگو</span>
      <div className="flex items-center gap-3.5 text-[11px] font-bold">
        <span>خانه</span>
        <span>محصولات</span>
        {header.showSearch && <Search className="h-3.5 w-3.5" aria-hidden="true" />}
        {header.showAccount && <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
        {header.showCart && (
          <span className="relative inline-grid place-items-center rounded-md border border-current p-1">
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="absolute -top-1.5 -start-1.5 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">
              ۲
            </span>
          </span>
        )}
        {header.showThemeToggle && <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />}
      </div>
    </div>
  );
}

function LiveFooterStrip({ footer }: { footer: FooterState }) {
  return (
    <div
      dir="rtl"
      className={cn(
        "overflow-hidden px-4 py-3 shadow-sm transition-colors",
        footer.round ? "rounded-2xl" : "rounded-lg"
      )}
      style={{ backgroundColor: footer.bg, color: footer.fg }}
    >
      {footer.trust && (
        <p
          className="mb-2 border-b pb-1.5 text-center text-[10px] font-bold opacity-80"
          style={{ borderColor: alphaColor(footer.fg, "33") }}
        >
          ارسال سریع · ضمانت اصالت کالا · پشتیبانی ۲۴ ساعته
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span>دسته‌بندی‌ها</span>
          <span>تماس</span>
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span>ساخته شده توسط تیم فنی حرفه‌ای</span>
          {/* Alaruz Design credit — ALWAYS visible, never removable */}
          <span className="inline-flex items-center gap-0.5 rounded-full border border-current px-2 py-0.5 font-black">
            Alaruz Design ↗
          </span>
        </p>
      </div>
    </div>
  );
}

/* ── the editor form (remounts per template via key) ─────────────────── */

function ChromeEditorForm({
  template,
  saved,
  onClose,
}: {
  template: TemplateDef;
  saved?: ChromeOverrides;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const palette = paletteOf(template.id);

  const [header, setHeader] = useState<HeaderState>(() =>
    mergeHeader(template.id, saved?.header)
  );
  const [footer, setFooter] = useState<FooterState>(() =>
    mergeFooter(template.id, saved?.footer)
  );

  const setH = <K extends keyof HeaderState>(k: K, v: HeaderState[K]) =>
    setHeader((s) => ({ ...s, [k]: v }));
  const setF = <K extends keyof FooterState>(k: K, v: FooterState[K]) =>
    setFooter((s) => ({ ...s, [k]: v }));

  /** validate hand-typed colors client-side (mirrors backend sanitizer) */
  const validateColors = (): boolean => {
    const checks: [string, string][] = [
      ["رنگ پس‌زمینه هدر", header.bg],
      ["رنگ متن هدر", header.fg],
      ["رنگ پس‌زمینه فوتر", footer.bg],
      ["رنگ متن فوتر", footer.fg],
    ];
    for (const [label, v] of checks) {
      const t = v.trim();
      if (t && !COLOR_RE.test(t)) {
        toast.error(`${label} نامعتبر است — از کد HEX مثل #161210 استفاده کنید`);
        return false;
      }
    }
    return true;
  };

  const save = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/admin/templates", {
        method: "PUT",
        body: JSON.stringify({
          templateId: template.id,
          chrome: {
            header: {
              bg: header.bg.trim() || undefined,
              fg: header.fg.trim() || undefined,
              accent: header.accent,
              logo: header.logo,
              sticky: header.sticky,
              ticker: header.ticker,
              categoryRow: header.categoryRow,
              megaMenu: header.megaMenu,
              showSearch: header.showSearch,
              showAccount: header.showAccount,
              showCart: header.showCart,
              showThemeToggle: header.showThemeToggle,
            },
            footer: {
              bg: footer.bg.trim() || undefined,
              fg: footer.fg.trim() || undefined,
              accent: footer.accent,
              logo: footer.logo,
              trust: footer.trust,
              categories: footer.categories,
              brandStrip: footer.brandStrip,
              round: footer.round,
            },
          },
        }),
      }),
    onSuccess: () => {
      toast.success(`هدر و فوتر قالب ${template.nameFa} ذخیره شد`);
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  /** reset: chrome null → the storefront falls back to the designed palette */
  const reset = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/admin/templates", {
        method: "PUT",
        body: JSON.stringify({ templateId: template.id, chrome: null }),
      }),
    onSuccess: () => {
      toast.success("به رنگ‌های قالب بازنشانی شد");
      setHeader(designedHeader(template.id));
      setFooter(designedFooter(template.id));
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "بازنشانی ناموفق بود"),
  });

  const busy = save.isPending || reset.isPending;
  const scope = `chrome-${template.id}`;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="header">
        <TabsList className="h-auto w-full justify-start rounded-lg">
          <TabsTrigger value="header" className="flex-1 text-xs font-bold">
            هدر
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex-1 text-xs font-bold">
            فوتر
          </TabsTrigger>
        </TabsList>

        {/* ── هدر tab ── */}
        <TabsContent value="header" className="mt-3 space-y-3">
          <ColorFields
            scopeId={`${scope}-h`}
            bgLabel="رنگ پس‌زمینه هدر"
            fgLabel="رنگ متن و آیکون‌ها"
            bg={header.bg}
            fg={header.fg}
            palette={palette}
            onBg={(v) => setH("bg", v)}
            onFg={(v) => setH("fg", v)}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <SelectRow
              id={`${scope}-h-accent`}
              label="رنگ تاکیدی"
              value={header.accent}
              options={ACCENTS}
              onChange={(v) => setH("accent", v as Accent)}
            />
            <SelectRow
              id={`${scope}-h-logo`}
              label="سبک لوگو"
              value={header.logo}
              options={LOGOS}
              onChange={(v) => setH("logo", v as LogoStyle)}
            />
            <SelectRow
              id={`${scope}-h-catrow`}
              label="ردیف دسته‌بندی‌ها"
              value={header.categoryRow}
              options={CATEGORY_ROWS}
              onChange={(v) => setH("categoryRow", v as RowMode)}
            />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              اجزای هدر
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <SwitchRow id={`${scope}-h-sticky`} label="چسبیده به بالای صفحه" checked={header.sticky} onChange={(v) => setH("sticky", v)} />
              <SwitchRow id={`${scope}-h-ticker`} label="نوار اعلان متحرک" checked={header.ticker} onChange={(v) => setH("ticker", v)} />
              <SwitchRow id={`${scope}-h-mega`} label="منوی مگا" checked={header.megaMenu} onChange={(v) => setH("megaMenu", v)} />
              <SwitchRow id={`${scope}-h-search`} label="جستجو" checked={header.showSearch} onChange={(v) => setH("showSearch", v)} />
              <SwitchRow id={`${scope}-h-account`} label="حساب کاربری" checked={header.showAccount} onChange={(v) => setH("showAccount", v)} />
              <SwitchRow id={`${scope}-h-cart`} label="سبد خرید" checked={header.showCart} onChange={(v) => setH("showCart", v)} />
              <SwitchRow id={`${scope}-h-theme`} label="تغییر تم روشن/تاریک" checked={header.showThemeToggle} onChange={(v) => setH("showThemeToggle", v)} />
            </div>
          </div>
        </TabsContent>

        {/* ── فوتر tab ── */}
        <TabsContent value="footer" className="mt-3 space-y-3">
          <ColorFields
            scopeId={`${scope}-f`}
            bgLabel="رنگ پس‌زمینه فوتر"
            fgLabel="رنگ متن و آیکون‌ها"
            bg={footer.bg}
            fg={footer.fg}
            palette={palette}
            onBg={(v) => setF("bg", v)}
            onFg={(v) => setF("fg", v)}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <SelectRow
              id={`${scope}-f-accent`}
              label="رنگ تاکیدی"
              value={footer.accent}
              options={ACCENTS}
              onChange={(v) => setF("accent", v as Accent)}
            />
            <SelectRow
              id={`${scope}-f-logo`}
              label="سبک لوگو"
              value={footer.logo}
              options={LOGOS}
              onChange={(v) => setF("logo", v as LogoStyle)}
            />
            <SelectRow
              id={`${scope}-f-strip`}
              label="نوار برندها"
              value={footer.brandStrip}
              options={BRAND_STRIPS}
              onChange={(v) => setF("brandStrip", v as RowMode)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${scope}-f-cats`} className="text-xs font-bold">
                تعداد دسته‌بندی‌های فوتر
              </Label>
              <Input
                id={`${scope}-f-cats`}
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                dir="ltr"
                className="h-11 rounded-lg text-xs"
                value={String(footer.categories)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setF("categories", clampCategories(n));
                }}
              />
              <p className="text-[10px] leading-4 text-muted-foreground">
                ۰ تا ۱۲ — صفر یعنی ستون دسته‌بندی‌ها نمایش داده نشود.
              </p>
            </div>
            <SwitchRow id={`${scope}-f-trust`} label="نوار اعتماد بالای فوتر" checked={footer.trust} onChange={(v) => setF("trust", v)} />
            <SwitchRow id={`${scope}-f-round`} label="گوشه‌های گرد" checked={footer.round} onChange={(v) => setF("round", v)} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── live mini preview — updates instantly ── */}
      <div className="space-y-2 rounded-xl border p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
          <Eye className="h-3.5 w-3.5 text-primary" />
          پیش‌نمایش زنده
        </p>
        <LiveHeaderStrip header={header} />
        <LiveFooterStrip footer={footer} />
      </div>

      {/* ── locked Alaruz credit notice ── */}
      <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-5">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>اعتبار Alaruz Design در فوتر همه قالب‌ها همیشه نمایش داده می‌شود و قابل حذف نیست.</p>
      </div>

      {/* ── actions ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="h-11 flex-1 rounded-lg font-bold"
          disabled={busy}
          onClick={() => {
            if (validateColors()) save.mutate();
          }}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تغییرات
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-lg font-bold"
          disabled={busy}
          onClick={() => reset.mutate()}
        >
          {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          بازنشانی به رنگ قالب
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-lg font-bold"
          disabled={busy}
          onClick={onClose}
        >
          انصراف
        </Button>
      </div>
    </div>
  );
}

/* ── exported dialog (controlled by the parent page) ─────────────────── */

export function ChromeEditorDialog({
  template,
  chrome,
  onClose,
}: {
  template: TemplateDef | null;
  chrome?: Record<string, ChromeOverrides>;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <PanelTop className="h-5 w-5 text-primary" />
            ویرایش هدر و فوتر — {template?.nameFa}
          </DialogTitle>
          <DialogDescription className="text-xs leading-6">
            رنگ‌ها و اجزای هدر و فوتر همین قالب را تغییر دهید
          </DialogDescription>
        </DialogHeader>

        {template && (
          <ChromeEditorForm
            key={template.id}
            template={template}
            saved={chrome?.[template.id]}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

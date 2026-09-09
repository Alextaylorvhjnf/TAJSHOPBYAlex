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

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  GripVertical,
  Loader2,
  Lock,
  MoonStar,
  MousePointerClick,
  Paintbrush,
  PanelTop,
  Palette,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/components/admin/api-client";
import { ChromeSkinStyle } from "@/components/store/templates/chrome/header";
import {
  STORE_ACTIONS_MODES,
  STORE_HEADER_SKINS,
  STORE_HOVER_FX,
  STORE_NAV_ITEMS,
  TEMPLATE_CHROME,
  TEMPLATE_PALETTES,
} from "@/components/store/templates/chrome/config";
import type { TemplateDef } from "@/lib/templates/registry";
import type {
  ChromeFooterOverride,
  ChromeHeaderOverride,
  ChromeOverrides,
  StoreChromeData,
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

/* ══ v32 (14-b): STORE-WIDE look options — form state + previews ══════
 * Header SKIN + nav item ORDER + actions placement + product hover
 * effect. These are STORE-level (saved to StoreSettings.storeChrome via
 * the same PUT /api/admin/templates call the per-template chrome uses) —
 * they apply to the shared storefront header AND every template chrome
 * header, whatever template is active. */

type StoreLookState = {
  skin: string;
  navOrder: string[];
  actionsMode: string;
  productHover: string;
};

/** normalize a saved (possibly partial) nav order: known keys in their
 * stored order first, the remaining defaults after — the admin list always
 * shows exactly the 5 items. */
function normalizeNavOrder(order?: string[]): string[] {
  const base = STORE_NAV_ITEMS.map((i) => i.value);
  if (!order || order.length === 0) return base;
  const known = order.filter((k) => base.includes(k));
  const rest = base.filter((k) => !known.includes(k));
  return known.length > 0 ? [...known, ...rest] : base;
}

/** saved store-wide chrome merged with the designed defaults */
function mergeStoreLook(saved?: StoreChromeData): StoreLookState {
  return {
    skin: saved?.skin ?? "classic",
    navOrder: normalizeNavOrder(saved?.navOrder),
    actionsMode: saved?.actionsMode ?? "grouped",
    productHover: saved?.productHover ?? "none",
  };
}

const navLabel = (v: string) => STORE_NAV_ITEMS.find((i) => i.value === v)?.label ?? v;

/** decorative inline artwork for the hover previews (headphone glyph) */
const PREVIEW_PRODUCT_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f1f5f9'/%3E%3Cpath d='M30 72v-14a30 30 0 0 1 60 0v14' fill='none' stroke='%23334155' stroke-width='7' stroke-linecap='round'/%3E%3Crect x='22' y='68' width='16' height='26' rx='8' fill='%23334155'/%3E%3Crect x='82' y='68' width='16' height='26' rx='8' fill='%23334155'/%3E%3C/svg%3E";

/* ── live previews (REAL CSS — they react on hover) ─────────────────── */

/** mini header strip painted with the REAL skin CSS (the dialog injects the
 *  storefront skin stylesheet, so the facets / pills / hairline are exactly
 *  what the storefront will render). Nav items are href-less <a> elements —
 *  non-interactive, but they match the storefront pill selectors. */
function SkinPreviewStrip({ skin, dark }: { skin?: string; dark: string }) {
  return (
    <div dir="rtl" data-chrome-skin={skin && skin !== "classic" ? skin : undefined} className="overflow-hidden rounded-lg">
      <div
        data-chrome-surface=""
        className="flex items-center justify-between gap-2 border-b"
        style={{ backgroundColor: dark, color: "#E8EDF5" }}
      >
        <span className="px-2.5 text-[11px] font-black tracking-tight">تاج</span>
        <div data-chrome-nav="" className="flex min-w-0 flex-1 items-center justify-center py-1.5">
          <nav className="flex items-center gap-0.5">
            <a className="flex h-8 items-center rounded-xl px-2.5 text-[10.5px] font-bold">خانه</a>
            <a className="flex h-8 items-center rounded-xl px-2.5 text-[10.5px] font-bold">فروشگاه</a>
            <a className="flex h-8 items-center rounded-xl px-2.5 text-[10.5px] font-bold">دسته‌بندی‌ها</a>
          </nav>
        </div>
        <div className="flex items-center gap-2 px-2.5 text-current">
          <MoonStar className="h-3.5 w-3.5" aria-hidden />
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          <UserRound className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/** skin option card — the strip is a REAL preview (hover the pills!) */
function SkinOptionCard({
  option,
  selected,
  dark,
  onSelect,
}: {
  option: { value: string; label: string; desc: string };
  selected: boolean;
  dark: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-2.5 text-start transition-colors",
        selected ? "border-primary/60 ring-1 ring-primary/40" : "hover:border-primary/40"
      )}
    >
      <SkinPreviewStrip skin={option.value} dark={dark} />
      <span className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-black">{option.label}</span>
        {selected && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary">انتخاب شده</span>
        )}
      </span>
      <span className="text-[10px] leading-4 text-muted-foreground">{option.desc}</span>
    </button>
  );
}

/** actions placement option — mini row preview (RTL) */
function ActionsModeCard({
  option,
  selected,
  onSelect,
}: {
  option: { value: string; label: string; desc: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const split = option.value === "split";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col gap-2 rounded-xl border p-3 text-start transition-colors",
        selected ? "border-primary/60 ring-1 ring-primary/40" : "hover:border-primary/40"
      )}
    >
      <span dir="rtl" className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-2.5 py-2">
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-black">تاج</span>
          {split && <MoonStar className="h-3.5 w-3.5 text-primary" aria-hidden />}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {!split && <MoonStar className="h-3.5 w-3.5" aria-hidden />}
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          <UserRound className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
      <span className="text-xs font-black">{option.label}</span>
      <span className="text-[10px] leading-4 text-muted-foreground">{option.desc}</span>
    </button>
  );
}

/** ONE live mini product card — the REAL storefront CSS (globals.css
 *  [data-hover-fx] block) animates the image on hover. */
function HoverFxPreviewCard({ fx }: { fx: string }) {
  return (
    <div
      dir="rtl"
      data-hover-fx={fx && fx !== "none" ? fx : undefined}
      className="[&_[data-product-card]]:w-full"
    >
      <article
        data-product-card=""
        className="group card-hover relative flex w-full flex-col overflow-hidden rounded-xl border bg-card"
      >
        <div className="zoom-media relative block aspect-[4/3] overflow-hidden bg-muted/40">
          {/* inline SVG data-URI preview artwork (no network, no next/image) */}
          <img src={PREVIEW_PRODUCT_IMG} alt="" className="h-full w-full object-contain p-2.5" />
        </div>
        <div className="p-2.5">
          <p className="truncate text-[11px] font-bold leading-5">هدفون بی‌سیم تاج مدل Pro</p>
          <p className="text-[11px] font-extrabold tabular-nums text-primary">۲,۴۵۰,۰۰۰ تومان</p>
        </div>
      </article>
    </div>
  );
}

/** hover option card — hover the mini card to SEE the effect live */
function HoverFxOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: { value: string; label: string; desc: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border p-3 transition-colors",
        selected ? "border-primary/60 ring-1 ring-primary/40" : "hover:border-primary/40"
      )}
    >
      <HoverFxPreviewCard fx={option.value} />
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-dashed px-3 text-start transition-colors hover:border-primary/50"
      >
        <span className="text-xs font-black">{option.label}</span>
        {selected ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary">فعال</span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground">انتخاب</span>
        )}
      </button>
      <p className="text-[10px] leading-4 text-muted-foreground">{option.desc}</p>
    </div>
  );
}

/* ── dnd-kit sortable nav row (44px touch target, keyboard accessible) ── */

function SortableNavRow({ id, index }: { id: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-1.5 py-1",
        isDragging && "z-10 shadow-lg ring-1 ring-primary/40"
      )}
    >
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`جابه‌جایی ${navLabel(id)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <span className="flex-1 text-xs font-bold">{navLabel(id)}</span>
      <span className="pe-1 text-[10px] font-black tabular-nums text-muted-foreground">
        {(index + 1).toLocaleString("fa-IR")}
      </span>
    </li>
  );
}

/** the drag-and-drop nav ORDER editor (items snap vertically) */
function NavOrderEditor({
  order,
  onChange,
  onReset,
  scopeId,
}: {
  order: string[];
  onChange: (next: string[]) => void;
  onReset: () => void;
  scopeId: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const from = order.indexOf(String(active.id));
      const to = order.indexOf(String(over.id));
      if (from >= 0 && to >= 0) onChange(arrayMove(order, from, to));
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5 text-primary" />
          ترتیب دکمه‌های منوی اصلی
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-[11px] font-bold"
          onClick={onReset}
          aria-label={`بازنشانی ترتیب منو (${scopeId})`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          ترتیب پیش‌فرض
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5" aria-label="چیدمان منوی اصلی — با کشیدن جابه‌جا کنید">
            {order.map((k, i) => (
              <SortableNavRow key={k} id={k} index={i} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="text-[10px] leading-4 text-muted-foreground">
        دسته‌ها را بکشید و رها کنید (یا با کلید Tab + جهت‌ها جابه‌جا کنید) — خانه اول باشد یا فروشگاه، با سلیقهٔ خودتان.
      </p>
    </div>
  );
}

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

/** v32 (14-b): the header strip preview now reflects the store-wide look
 *  too — the REAL skin CSS (via the dialog's injected stylesheet), the
 *  admin-ordered nav labels and the actions placement. */
function LiveHeaderStrip({ header, look }: { header: HeaderState; look: StoreLookState }) {
  const skin = look.skin !== "classic" ? look.skin : undefined;
  const split = look.actionsMode === "split";
  return (
    <div dir="rtl" data-chrome-skin={skin} className="overflow-hidden rounded-lg shadow-sm">
      <div
        data-chrome-surface=""
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5 transition-colors"
        style={{ backgroundColor: header.bg, color: header.fg }}
      >
        <span className="flex items-center gap-2.5 text-xs font-black tracking-tight">
          لوگو
          {/* v32 (14-b): «مجزا» — the dark/light key at the row start */}
          {split && header.showThemeToggle && <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />}
        </span>
        <div data-chrome-nav="" className="flex min-w-0 flex-1 items-center justify-center">
          <nav className="no-scrollbar flex items-center gap-0.5 overflow-x-auto text-[11px] font-bold">
            {/* the admin-ordered primary nav labels */}
            {look.navOrder.map((k) => (
              <a key={k} className="flex h-8 shrink-0 items-center rounded-xl px-2.5">
                {navLabel(k)}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {header.showSearch && <Search className="h-3.5 w-3.5" aria-hidden="true" />}
          {!split && header.showThemeToggle && <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />}
          {header.showAccount && <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
          {header.showCart && (
            <span className="relative inline-grid place-items-center rounded-md border border-current p-1">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="absolute -top-1.5 -start-1.5 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">
                ۲
              </span>
            </span>
          )}
        </div>
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
  savedStoreChrome,
  onClose,
}: {
  template: TemplateDef;
  saved?: ChromeOverrides;
  /** v32 (14-b): the STORE-WIDE chrome look options (shared by every
   *  template's dialog — same value whichever card you opened it from). */
  savedStoreChrome?: StoreChromeData;
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
  /* v32 (14-b): store-wide look — skin / nav order / actions / hover fx.
   * `snapshot` = the last SAVED state (updated on save success) so the dirty
   * indicator is pure render state — no refs. */
  const [look, setLook] = useState<StoreLookState>(() => mergeStoreLook(savedStoreChrome));
  const [snapshot, setSnapshot] = useState(() => ({
    look: mergeStoreLook(savedStoreChrome),
    header: mergeHeader(template.id, saved?.header),
    footer: mergeFooter(template.id, saved?.footer),
  }));

  const setH = <K extends keyof HeaderState>(k: K, v: HeaderState[K]) =>
    setHeader((s) => ({ ...s, [k]: v }));
  const setF = <K extends keyof FooterState>(k: K, v: FooterState[K]) =>
    setFooter((s) => ({ ...s, [k]: v }));
  const setLookKey = <K extends keyof StoreLookState>(k: K, v: StoreLookState[K]) =>
    setLook((s) => ({ ...s, [k]: v }));

  /** v32 (14-b): dirty indicator — anything unsaved? */
  const dirty =
    JSON.stringify(look) !== JSON.stringify(snapshot.look) ||
    JSON.stringify(header) !== JSON.stringify(snapshot.header) ||
    JSON.stringify(footer) !== JSON.stringify(snapshot.footer);

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
          /* v32 (14-b): the store-wide chrome look rides the SAME save call —
           * header skin / nav item order / actions placement / product hover
           * effect (validated server-side by parseStoreChrome). */
          storeChrome: {
            skin: look.skin,
            navOrder: look.navOrder,
            actionsMode: look.actionsMode,
            productHover: look.productHover,
          },
        }),
      }),
    onSuccess: () => {
      toast.success(`هدر و فوتر قالب ${template.nameFa} ذخیره شد`);
      setSnapshot({ look: { ...look }, header: { ...header }, footer: { ...footer } });
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
      {/* v32 (14-b): inject the storefront skin stylesheet while the dialog is
          open — every skin preview card (and the live header strip) renders
          with the REAL CSS. A non-«کلاسیک» marker value injects the full sheet
          (all skins live in one stylesheet, scoped by data-chrome-skin). */}
      <ChromeSkinStyle skin={look.skin !== "classic" ? look.skin : "_all-skins"} />
      <Tabs defaultValue="header">
        <TabsList className="h-auto w-full justify-start rounded-lg">
          <TabsTrigger value="header" className="flex-1 text-xs font-bold">
            هدر
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex-1 text-xs font-bold">
            فوتر
          </TabsTrigger>
          <TabsTrigger value="hover" className="flex-1 text-xs font-bold">
            هاور محصولات
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

          {/* ── v32 (14-b): پوسته هدر — store-wide skin, LIVE previews ── */}
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                پوسته هدر (برای کل فروشگاه)
              </p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                روی همه قالب‌ها اعمال می‌شود
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {STORE_HEADER_SKINS.map((o) => (
                <SkinOptionCard
                  key={o.value}
                  option={o}
                  selected={look.skin === o.value}
                  dark={header.bg}
                  onSelect={() => setLookKey("skin", o.value)}
                />
              ))}
            </div>
            <p className="text-[10px] leading-4 text-muted-foreground">
              روی هر پیش‌نمایش ماوس ببرید — پوسته‌ها با CSS واقعی نمایش داده می‌شوند. «کلاسیک» یعنی ظاهر فعلی بدون تغییر.
            </p>
          </div>

          {/* ── v32 (14-b): ترتیب منو + جای کلیدها — drag & drop GUI ── */}
          <div className="space-y-3 rounded-xl border p-3">
            <NavOrderEditor
              order={look.navOrder}
              onChange={(next) => setLookKey("navOrder", next)}
              onReset={() => setLookKey("navOrder", normalizeNavOrder(undefined))}
              scopeId={scope}
            />
            <div className="space-y-2 border-t pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
                <PanelTop className="h-3.5 w-3.5 text-primary" />
                جای کلیدهای تاریک/روشن، سبد و حساب
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                {STORE_ACTIONS_MODES.map((o) => (
                  <ActionsModeCard
                    key={o.value}
                    option={o}
                    selected={look.actionsMode === o.value}
                    onSelect={() => setLookKey("actionsMode", o.value)}
                  />
                ))}
              </div>
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

        {/* ── v32 (14-b): هاور محصولات tab — LIVE mini card previews ── */}
        <TabsContent value="hover" className="mt-3 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-5">
            <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              هنگام هاور روی کارت محصولات فروشگاه چه اتفاقی بیفتد؟ روی هر کارت زیر ماوس ببرید تا افکت
              را زنده ببینید و سپس انتخاب کنید — روی همه صفحات فروشگاه (لیست محصولات، مرتبط‌ها و
              علاقه‌مندی‌ها) اعمال می‌شود.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {STORE_HOVER_FX.map((o) => (
              <HoverFxOptionCard
                key={o.value}
                option={o}
                selected={look.productHover === o.value}
                onSelect={() => setLookKey("productHover", o.value)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── live mini preview — updates instantly ── */}
      <div className="space-y-2 rounded-xl border p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
          <Eye className="h-3.5 w-3.5 text-primary" />
          پیش‌نمایش زنده
        </p>
        <LiveHeaderStrip header={header} look={look} />
        <LiveFooterStrip footer={footer} />
      </div>

      {/* ── locked Alaruz credit notice ── */}
      <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-5">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>اعتبار Alaruz Design در فوتر همه قالب‌ها همیشه نمایش داده می‌شود و قابل حذف نیست.</p>
      </div>

      {/* ── actions ── */}
      <div className="space-y-2">
        {dirty && (
          <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            تغییرات ذخیره‌نشده دارید
          </p>
        )}
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
    </div>
  );
}

/* ── exported dialog (controlled by the parent page) ─────────────────── */

export function ChromeEditorDialog({
  template,
  chrome,
  storeChrome,
  onClose,
}: {
  template: TemplateDef | null;
  chrome?: Record<string, ChromeOverrides>;
  /** v32 (14-b): the store-wide chrome look options (GET /api/admin/templates
   *  → storeChrome) — skin / nav order / actions placement / product hover. */
  storeChrome?: StoreChromeData;
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
            رنگ‌ها و اجزای هدر و فوتر همین قالب را تغییر دهید — پوسته هدر، ترتیب منو، جای کلیدها و
            افکت هاور محصولات برای کل فروشگاه ذخیره می‌شود.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <ChromeEditorForm
            key={template.id}
            template={template}
            saved={chrome?.[template.id]}
            savedStoreChrome={storeChrome}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * Admin Panel → ظاهر → تغییر قالب فروشگاه (spec §18–§24)
 * ------------------------------------------------------
 * Pick the storefront homepage TEMPLATE (layout family). Fully independent
 * from the color THEME (رنگ‌بندی) and — per spec §22 — applying a template
 * only writes StoreSettings.activeTemplate: products, stories, sliders,
 * showcases and settings are never touched.
 *
 * v35 (4-b): «صنف فروشگاه» section on top — picking a store VERTICAL is the
 * heavier sibling of template switching: it archives the current catalog and
 * imports that vertical's real products/categories/brands, points the flagship
 * template and re-personas the AI assistant (GET/PUT /api/admin/vertical).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Cpu, Orbit, Square, Smartphone, Leaf, Snowflake, Moon, Gamepad2, Crown, LayoutGrid,
  Shapes, Palette, Sparkles, Newspaper, Store, MoonStar, Zap, BookOpen, Rocket,
  Sparkle, Waves, ShoppingBag, Gem, ShoppingCart,
  Eye, Check, ExternalLink, Info, Loader2, SlidersHorizontal, Timer, PanelTop,
  Archive, Bot, LayoutTemplate, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, CardsSkeleton, EmptyState } from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import { toFaDigits } from "@/lib/format";
import type { TemplateDef } from "@/lib/templates/registry";
import type { ChromeOverrides, HomeData, StoreChromeData } from "@/lib/templates/types";
import { ChromeEditorDialog } from "./chrome-editor";
import { ModernTechTemplate } from "@/components/store/templates/modern-tech";
import { Future3DTemplate } from "@/components/store/templates/future-3d";
import { MinimalPremiumTemplate } from "@/components/store/templates/minimal-premium";
import { SocialCommerceTemplate } from "@/components/store/templates/social-commerce";
import { AutumnTemplate } from "@/components/store/templates/autumn";
import { ChristmasTemplate } from "@/components/store/templates/christmas";
import { YaldaNightTemplate } from "@/components/store/templates/yalda-night";
import { GamingCyberTemplate } from "@/components/store/templates/gaming-cyber";
import { LuxuryElectronicsTemplate } from "@/components/store/templates/luxury-electronics";
import { MarketplaceTemplate } from "@/components/store/templates/marketplace";
import { ArtDecoTemplate } from "@/components/store/templates/art-deco";
import { RetroVintageTemplate } from "@/components/store/templates/retro-vintage";
import { GlassMorphismTemplate } from "@/components/store/templates/glass-morphism";
import { EditorialMagazineTemplate } from "@/components/store/templates/editorial-magazine";
import { SuperstoreGridTemplate } from "@/components/store/templates/superstore-grid";
import { NeonNoirTemplate } from "@/components/store/templates/neon-noir";
import { FlashDealsTemplate } from "@/components/store/templates/flash-deals";
import { PrintCatalogTemplate } from "@/components/store/templates/print-catalog";
import { StartupLightTemplate } from "@/components/store/templates/startup-light";
import { MobileFirstPwaTemplate } from "@/components/store/templates/mobile-first-pwa";
import { NexoraTechTemplate } from "@/components/store/templates/nexora-tech";
import { TechhubDarkTemplate } from "@/components/store/templates/techhub-dark";
import { PurpleMallTemplate } from "@/components/store/templates/purple-mall";
import { NovaGlassTemplate } from "@/components/store/templates/nova-glass";
import { NovatrendCleanTemplate } from "@/components/store/templates/novatrend-clean";
/* v35 · vertical flagship storefronts (صنف‌های فروشگاه) */
import { TajElectronicsProTemplate } from "@/components/store/templates/taj-electronics-pro";
import { SportFashionTemplate } from "@/components/store/templates/sport-fashion";
import { BeautyGlowTemplate } from "@/components/store/templates/beauty-glow";
import { ZentryGamingTemplate } from "@/components/store/templates/zentry-gaming";
import { AutoPartsTemplate } from "@/components/store/templates/auto-parts";
import { Car, Shirt } from "lucide-react";

/** registry icon name → lucide component (registry stays pure data) */
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Cpu, Orbit, Square, Smartphone, Leaf, Snowflake, Moon, Gamepad2, Crown, LayoutGrid,
  Shapes, Palette, Sparkles, Newspaper, Store, MoonStar, Zap, BookOpen, Rocket,
  Sparkle, Waves, ShoppingBag, Gem, ShoppingCart,
  Car, Shirt,
};

/** template id → preview component (all bundled: this page previews any of them) */
const TEMPLATE_COMPONENTS: Record<string, (props: { data: HomeData }) => ReactNode> = {
  "modern-tech": ModernTechTemplate,
  "future-3d": Future3DTemplate,
  "minimal-premium": MinimalPremiumTemplate,
  "social-commerce": SocialCommerceTemplate,
  autumn: AutumnTemplate,
  christmas: ChristmasTemplate,
  "yalda-night": YaldaNightTemplate,
  "gaming-cyber": GamingCyberTemplate,
  "luxury-electronics": LuxuryElectronicsTemplate,
  marketplace: MarketplaceTemplate,
  "art-deco": ArtDecoTemplate,
  "retro-vintage": RetroVintageTemplate,
  "glass-morphism": GlassMorphismTemplate,
  "editorial-magazine": EditorialMagazineTemplate,
  "superstore-grid": SuperstoreGridTemplate,
  "neon-noir": NeonNoirTemplate,
  "flash-deals": FlashDealsTemplate,
  "print-catalog": PrintCatalogTemplate,
  "startup-light": StartupLightTemplate,
  "mobile-first-pwa": MobileFirstPwaTemplate,
  "nexora-tech": NexoraTechTemplate,
  "techhub-dark": TechhubDarkTemplate,
  "purple-mall": PurpleMallTemplate,
  "nova-glass": NovaGlassTemplate,
  "novatrend-clean": NovatrendCleanTemplate,
  /* v35 · vertical flagship storefronts */
  "taj-electronics-pro": TajElectronicsProTemplate,
  "sport-fashion": SportFashionTemplate,
  "beauty-glow": BeautyGlowTemplate,
  "zentry-gaming": ZentryGamingTemplate,
  "auto-parts": AutoPartsTemplate,
};

type TemplatesResponse = {
  templates: TemplateDef[];
  active: string;
  featureFlags?: Record<string, Record<string, boolean>>;
  timerEndsAt?: string | null;
  /** v24: saved per-template header/footer chrome overrides (empty = none) */
  chrome?: Record<string, ChromeOverrides>;
  /** v32 (14-b): store-wide chrome look options — header skin, nav item
   *  order, actions placement, product hover effect (shared by every
   *  «هدر و فوتر» dialog). */
  storeChrome?: StoreChromeData;
};

/* ── v23: per-template special-feature switches ──────────────────
 * Templates register their controllable effects (timer / glow / parallax…)
 * in the registry — the backend auto-detects them and the admin can turn
 * each one on/off per template. Saved flags live in StoreSettings. */
function TemplateFeatureToggles({
  template,
  flags,
  timerEndsAt,
}: {
  template: TemplateDef;
  flags: Record<string, boolean>;
  timerEndsAt?: string | null;
}) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of template.features ?? []) init[f.key] = flags[f.key] !== false;
    return init;
  });
  /* v25: admin-editable timer deadline for templates that register a
   * "timer" feature — datetime-local value (empty = template default). */
  const hasTimer = (template.features ?? []).some((f) => f.key === "timer");
  const [timerValue, setTimerValue] = useState<string>(() => {
    if (!hasTimer || !timerEndsAt) return "";
    try {
      const d = new Date(timerEndsAt);
      if (Number.isNaN(d.getTime())) return "";
      // datetime-local format: YYYY-MM-DDTHH:mm (local time)
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/admin/templates", {
        method: "PUT",
        body: JSON.stringify({
          templateId: template.id,
          features: local,
          ...(hasTimer
            ? { timerEndsAt: timerValue ? new Date(timerValue).toISOString() : null }
            : {}),
        }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  if (!template.features || template.features.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed p-3 space-y-2.5">
      <p className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        ویژگی‌های ویژهٔ این قالب
      </p>
      {template.features.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-xs font-bold">{f.labelFa}</span>
            {f.descFa && <span className="block text-[10px] leading-4 text-muted-foreground">{f.descFa}</span>}
          </span>
          <Switch
            checked={local[f.key] !== false}
            onCheckedChange={(v) => setLocal((s) => ({ ...s, [f.key]: v }))}
            aria-label={f.labelFa}
          />
        </label>
      ))}
      {hasTimer && (
        <div className="space-y-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
          <label htmlFor={`tpl-timer-${template.id}`} className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
            <Timer className="h-3.5 w-3.5" />
            زمان پایان شمارش معکوس
          </label>
          <Input
            id={`tpl-timer-${template.id}`}
            type="datetime-local"
            dir="ltr"
            className="rounded-lg text-left text-xs"
            value={timerValue}
            onChange={(e) => setTimerValue(e.target.value)}
          />
          <p className="text-[10px] leading-4 text-muted-foreground">
            {timerValue
              ? "همهٔ تایمرهای این قالب تا این زمان می‌شمارند (به وقت Tehran)."
              : "خالی = رفتار پیش‌فرض قالب (مهلت تخفیف واقعی هر محصول)."}
          </p>
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-lg text-xs font-bold"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
        ذخیرهٔ تنظیمات این قالب
      </Button>
    </div>
  );
}

/**
 * Device-frame scaled preview: renders the full 1280px storefront at
 * scale(0.5) (→ 640px visual, RTL-anchored via transformOrigin "top right")
 * inside a fixed-height scroll area. The negative bottom margin compensates
 * the transform's dead layout space so the scrollbar exactly matches the
 * visible (halved) content height.
 */
function ScaledPreview({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setContentH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      dir="rtl"
      className="h-[480px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner"
    >
      {/* overflow-hidden clips the invisible (unscaled) layout half so the
          scrollbar range exactly matches the 0.5× visual content height */}
      <div className="relative mx-auto w-[640px] overflow-hidden">
        <div
          ref={innerRef}
          className="pointer-events-none select-none"
          style={{
            width: 1280,
            transform: "scale(0.5)",
            transformOrigin: "top right",
            marginBottom: contentH > 0 ? -(contentH / 2) : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewDialog({
  template,
  data,
  onClose,
}: {
  template: TemplateDef | null;
  data: HomeData | undefined;
  onClose: () => void;
}) {
  const Comp = template ? TEMPLATE_COMPONENTS[template.id] : undefined;
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full max-w-6xl overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            پیش‌نمایش قالب «{template?.nameFa}»
          </DialogTitle>
          <DialogDescription className="text-xs leading-6">
            پیش‌نمایش با داده واقعی فروشگاه (محصولات، استوری‌ها و اسلایدرهای فعلی) — برای مشاهده رفتار
            واقعی واکنش‌گرا در موبایل و دسکتاپ، از دکمه پیش‌نمایش کامل استفاده کنید.
          </DialogDescription>
        </DialogHeader>

        {!data || !Comp ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <p className="text-center text-xs text-muted-foreground">در حال دریافت داده واقعی فروشگاه…</p>
          </div>
        ) : (
          <ScaledPreview>
            <Comp data={data} />
          </ScaledPreview>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            اعمال قالب هیچ داده‌ای را تغییر نمی‌دهد؛ فقط چیدمان صفحه اصلی عوض می‌شود.
          </p>
          <Button asChild size="sm" className="rounded-lg">
            <Link href={`/?template=${template?.id ?? ""}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              پیش‌نمایش کامل در تب جدید
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── v35 (4-b): «صنف فروشگاه» — store vertical picker ───────────────
 * The heavyweight sibling of template switching: applying a vertical
 * archives the current catalog and imports that vertical's REAL
 * products/categories/brands, switches the storefront to the vertical's
 * flagship template and re-personas the AI assistant. Contract (4-a):
 * GET /api/admin/vertical → { ok, data: { current, currentTemplate, verticals } }
 * PUT /api/admin/vertical { verticalId, renameStore } → { ok, data: { message,
 * products, categories, brands } } — counts always come from the API. */
type VerticalRow = {
  id: string;
  nameFa: string;
  nameEn: string;
  taglineFa: string;
  descFa: string;
  icon: string;
  templateId: string;
  productCount: number;
  categoryCount: number;
  brandCount: number;
};

type VerticalsResponse = {
  current: string;
  currentTemplate: string;
  verticals: VerticalRow[];
};

type VerticalApplyResponse = {
  message: string;
  products: number;
  categories: number;
  brands: number;
};

/** soft per-vertical icon tint (electronics violet / fashion coral / beauty
 *  rose / gaming fuchsia / autoparts orange — deliberately NO blue/indigo) */
const VERTICAL_TINTS: Record<string, string> = {
  electronics: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  fashion: "bg-[#FF6B4A]/15 text-[#E2542A] dark:text-[#FF8A66]",
  beauty: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  gaming: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
  autoparts: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

/** suggested store name per vertical — «نام فروشگاه هم مطابق صنف تنظیم شود» */
const VERTICAL_STORE_NAMES: Record<string, string> = {
  electronics: "تاج الکترونیکس",
  fashion: "تاج استایل",
  beauty: "بیوتی گلو",
  gaming: "زنتری استور",
  autoparts: "تاج پارتز",
};

function VerticalPickerSection({ templateNames }: { templateNames: Record<string, string> }) {
  const queryClient = useQueryClient();
  /* the vertical whose apply-confirm dialog is open */
  const [pendingVertical, setPendingVertical] = useState<VerticalRow | null>(null);
  /* «نام فروشگاه هم مطابق صنف تنظیم شود» — default checked */
  const [renameStore, setRenameStore] = useState(true);

  const { data: vData, isLoading: vLoading, isError: vIsError, error: vError } = useQuery({
    queryKey: ["admin", "vertical"],
    queryFn: () => apiFetch<{ data: VerticalsResponse }>("/api/admin/vertical"),
  });

  const applyVertical = useMutation({
    mutationFn: (input: { verticalId: string; renameStore: boolean }) =>
      apiFetch<{ data: VerticalApplyResponse }>("/api/admin/vertical", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (json) => {
      const d = json.data;
      const counts = `${toFaDigits(d?.products ?? 0)} محصول، ${toFaDigits(d?.categories ?? 0)} دسته و ${toFaDigits(d?.brands ?? 0)} برند جایگزین شد`;
      toast.success(d?.message ? `${d.message} — ${counts}` : counts);
      setPendingVertical(null);
      setRenameStore(true);
      /* refresh every admin query (this section + the template grid), then
       * hard-reload after ~1.2s so the server-driven template section and
       * preview catch the vertical's new flagship template */
      queryClient.invalidateQueries();
      window.setTimeout(() => window.location.reload(), 1200);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "اعمال صنف ناموفق بود"),
  });

  const verticals = vData?.data.verticals ?? [];
  const currentVertical = vData?.data.current ?? "";

  return (
    <section className="space-y-4" aria-label="صنف فروشگاه">
      {/* header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-black">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            صنف فروشگاه
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            موضوع فروشگاه را انتخاب کنید — دسته‌بندی‌ها، محصولات، قالب فروشگاه و هوش مصنوعی همه با صنف عوض می‌شوند
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          سفارش‌ها و تاریخچهٔ مشتریان دست‌نخورده می‌مانند
        </p>
      </div>

      {vIsError ? (
        <div className="flex items-start gap-2 rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            دریافت صنف‌های فروشگاه ناموفق بود{vError instanceof Error ? ` (${vError.message})` : ""} —
            بقیهٔ صفحه بدون تأثیر است.
          </p>
        </div>
      ) : vLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v) => {
            const isActive = v.id === currentVertical;
            const Icon = TEMPLATE_ICONS[v.icon] ?? Palette;
            const tint = VERTICAL_TINTS[v.id] ?? "bg-muted text-muted-foreground";
            return (
              <div
                key={v.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors",
                  isActive ? "border-primary/50 ring-1 ring-primary/30" : "hover:border-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tint)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black text-primary">
                      <Check className="h-3 w-3" />
                      صنف فعال
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-black">{v.nameFa}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground" dir="ltr">
                    {v.nameEn}
                  </p>
                </div>

                <p className="truncate text-xs font-bold">{v.taglineFa}</p>

                <p className="min-h-12 text-xs leading-6 text-muted-foreground line-clamp-2">
                  {v.descFa}
                </p>

                <p className="text-[11px] font-bold text-muted-foreground">
                  {toFaDigits(v.productCount)} محصول · {toFaDigits(v.categoryCount)} دسته ·{" "}
                  {toFaDigits(v.brandCount)} برند
                </p>

                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <LayoutTemplate className="h-3 w-3" />
                  قالب: {templateNames[v.templateId] ?? v.templateId}
                </span>

                <div className="mt-auto">
                  {isActive ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 w-full cursor-default rounded-lg font-bold"
                      disabled
                      aria-label="این صنف هم‌اکنون فعال است"
                    >
                      <Check className="h-4 w-4" />
                      فعال است
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-full rounded-lg font-bold hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                      disabled={applyVertical.isPending}
                      onClick={() => {
                        setRenameStore(true);
                        setPendingVertical(v);
                      }}
                    >
                      <Zap className="h-4 w-4" />
                      اعمال این صنف
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* apply-flow confirm dialog — the owner must not be surprised */}
      <Dialog open={!!pendingVertical} onOpenChange={(o) => !o && setPendingVertical(null)}>
        <DialogContent className="max-h-[92vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              اعمال صنف «{pendingVertical?.nameFa}»
            </DialogTitle>
            <DialogDescription className="text-xs leading-6">
              قبل از تأیید، دقیقاً بدانید چه اتفاقی می‌افتد — این عملیات کاتالوگ فروشگاه را بازنویسی می‌کند.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2.5">
            <li className="flex items-start gap-2 text-xs leading-6">
              <Archive className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                کاتالوگ فعلی آرشیو می‌شود (سفارش‌ها و تاریخچه دست‌نخورده می‌ماند) و محصولات واقعیِ صنف
                جدید جایگزین می‌شوند.
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs leading-6">
              <LayoutTemplate className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                قالب ویترین به قالب پرچمدار این صنف (
                {templateNames[pendingVertical?.templateId ?? ""] ?? pendingVertical?.templateId})
                تغییر می‌کند.
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs leading-6">
              <Bot className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>هوش مصنوعی فروشگاه با شخصیت متخصص همین صنف پاسخ می‌دهد.</span>
            </li>
          </ul>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
            <span className="min-w-0">
              <span className="block text-xs font-bold">نام فروشگاه هم مطابق صنف تنظیم شود</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                {pendingVertical && VERTICAL_STORE_NAMES[pendingVertical.id]
                  ? `نام پیشنهادی این صنف: «${VERTICAL_STORE_NAMES[pendingVertical.id]}»`
                  : "نام فروشگاه مطابق صنف جدید تنظیم می‌شود"}
              </span>
            </span>
            <Switch
              checked={renameStore}
              onCheckedChange={setRenameStore}
              aria-label="نام فروشگاه هم مطابق صنف تنظیم شود"
            />
          </label>

          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-bold leading-5 text-amber-600 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            این عملیات کاتالوگ را بازنویسی می‌کند — قبل از اعمال، از بخش پشتیبان‌گیری نسخهٔ پشتیبان تهیه کنید.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 w-full rounded-lg font-bold sm:w-auto"
              disabled={applyVertical.isPending}
              onClick={() => setPendingVertical(null)}
            >
              انصراف
            </Button>
            <Button
              className="gold-surface h-11 w-full rounded-lg font-bold text-primary-foreground hover:opacity-90 sm:w-auto"
              disabled={applyVertical.isPending}
              onClick={() =>
                pendingVertical &&
                applyVertical.mutate({ verticalId: pendingVertical.id, renameStore })
              }
            >
              {applyVertical.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {applyVertical.isPending ? "در حال اعمال…" : "اعمال صنف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function AdminAppearancePage() {
  const queryClient = useQueryClient();
  const [previewing, setPreviewing] = useState<TemplateDef | null>(null);
  /* v24: template whose header/footer chrome editor dialog is open */
  const [chromeEditing, setChromeEditing] = useState<TemplateDef | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => apiFetch<TemplatesResponse>("/api/admin/templates"),
  });

  // Real store data — fetched lazily (only once a preview is opened), shared
  // between all template cards. v5-f: the PREVIEWED template's own content is
  // applied server-side (?template=) so the dialog shows slides/texts/brand
  // exactly as /?template=<id> renders them.
  const { data: previewData } = useQuery({
    queryKey: ["admin", "templates", "preview", previewing?.id],
    queryFn: () =>
      apiFetch<{ data: HomeData }>(
        `/api/admin/templates/preview${previewing ? `?template=${previewing.id}` : ""}`,
      ),
    enabled: !!previewing,
    staleTime: 0,
  });

  const applyMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiFetch<{ message?: string }>("/api/admin/templates/active", {
        method: "PUT",
        body: JSON.stringify({ templateId }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "قالب فروشگاه اعمال شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "اعمال قالب ناموفق بود"),
  });

  const templates = data?.templates ?? [];
  const active = data?.active ?? "modern-tech";
  const featureFlags = data?.featureFlags ?? {};
  const chromeMap = data?.chrome ?? {};
  /* v35 (4-b): template id → nameFa, for the vertical cards' flagship chip */
  const templateNames: Record<string, string> = {};
  for (const t of templates) templateNames[t.id] = t.nameFa;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="تغییر قالب فروشگاه"
        desc="چیدمان صفحه اصلی را از بین ۲۵ قالب آماده انتخاب کنید — مستقل از رنگ‌بندی (تم رنگ) و بدون هیچ تغییری در داده‌ها"
      />

      {/* v35 (4-b): «صنف فروشگاه» — pick the store VERTICAL (catalog +
          flagship template + AI persona) before picking a template */}
      <VerticalPickerSection templateNames={templateNames} />

      {/* info card — spec §22 in plain Persian */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-[12.5px] leading-6">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
        <p>
          قالب فقط چیدمان را عوض می‌کند — محصولات، استوری‌ها، اسلایدرها و تنظیمات دست‌نخورده
          می‌مانند. رنگ‌بندی و حالت روشن/تاریک از بخش «تنظیمات» مدیریت می‌شود و روی همه قالب‌ها اعمال
          می‌گردد.
        </p>
      </div>

      {isError ? (
        <EmptyState
          title="خطا در دریافت قالب‌ها"
          desc={error instanceof Error ? error.message : undefined}
        />
      ) : isLoading ? (
        <CardsSkeleton count={9} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const isActive = t.id === active;
            const Icon = TEMPLATE_ICONS[t.icon] ?? Palette;
            const applying = applyMutation.isPending && applyMutation.variables === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors",
                  isActive ? "border-primary/50 ring-1 ring-primary/30" : "hover:border-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                      isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black text-primary">
                      <Check className="h-3 w-3" />
                      قالب فعال
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-black">{t.nameFa}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground" dir="ltr">
                    {t.nameEn}
                  </p>
                </div>

                <p className="min-h-10 text-xs leading-6 text-muted-foreground">{t.descFa}</p>

                <div className="flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* v23: auto-detected special features (timer/glow/…) toggles */}
                <TemplateFeatureToggles template={t} flags={featureFlags[t.id] ?? {}} timerEndsAt={data?.timerEndsAt} />

                {/* v24: per-template header/footer chrome editor (dialog) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-lg border-dashed text-xs font-bold"
                  onClick={() => setChromeEditing(t)}
                  aria-label={`ویرایش هدر و فوتر قالب ${t.nameFa}`}
                >
                  <PanelTop className="h-4 w-4 text-primary" />
                  هدر و فوتر
                  {chromeMap[t.id] ? (
                    <span className="ms-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
                      سفارشی
                    </span>
                  ) : null}
                </Button>

                <div className="mt-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg font-bold"
                    onClick={() => setPreviewing(t)}
                  >
                    <Eye className="h-4 w-4" />
                    پیش‌نمایش
                  </Button>
                  {isActive ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 cursor-default rounded-lg font-bold"
                      disabled
                      aria-label="این قالب هم‌اکنون فعال است"
                    >
                      <Check className="h-4 w-4" />
                      فعال است
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg font-bold gold-surface text-primary-foreground hover:opacity-90"
                      disabled={applyMutation.isPending}
                      onClick={() => applyMutation.mutate(t.id)}
                    >
                      {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
                      {applying ? "در حال اعمال…" : "اعمال قالب"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TemplatePreviewDialog
        template={previewing}
        data={previewData?.data}
        onClose={() => setPreviewing(null)}
      />

      {/* v24: per-template header/footer chrome editor dialog */}
      <ChromeEditorDialog
        template={chromeEditing}
        chrome={data?.chrome}
        storeChrome={data?.storeChrome}
        onClose={() => setChromeEditing(null)}
      />
    </div>
  );
}

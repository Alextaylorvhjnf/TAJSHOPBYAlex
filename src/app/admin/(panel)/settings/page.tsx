"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
// v27b (footer tab): template-scoped footer editor icons (kept as a separate
// import line so this edit stays local to the Footer tab work)
import { LayoutTemplate, RotateCcw } from "lucide-react";
import {
  Bot,
  Check,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  KeyRound,
  CreditCard,
  Eye,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Megaphone,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Phone,
  Plug,
  Plus,
  Power,
  RotateCw,
  Save,
  Send,
  PackageSearch,
  ShieldAlert,
  Sparkles,
  Store,
  Sun,
  Timer,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch } from "@/components/admin/api-client";
/* v29.2: REAL active-template live preview (was a static mockup) */
import { StoreLivePreview, ScaledFrame } from "@/components/admin/store-live-preview";
/* v29.2: repair-page live preview (RepairPage + real store data from the form) */
import { RepairPage, type MaintenanceScreenData } from "@/components/store/maintenance-templates";
import { resolveMaintenanceContent } from "@/lib/maintenance";
/* v29.2: Update Script tab panel (self-contained component from the updater) */
import { UpdatePanel } from "@/components/admin/update-panel";
/* v33 (2-c): Telegram store-bot tab panel (token/chat-id/enable + connection
 * test via /api/admin/settings/telegram(-test)) */
import { TelegramBotTab } from "./telegram-bot-tab";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOGO,
  THEME_IDS,
  THEME_META,
  renderCopyright,
  type ColorMode,
  type ThemeId,
} from "@/lib/settings";
// v29 (repair page): template registry + editable content defaults
import {
  MAINTENANCE_TEMPLATES,
  normalizeMaintenanceTemplateId,
  DEFAULT_MAINTENANCE_CONTENT,
  parseTemplateAiLogos,
} from "@/lib/maintenance";
// v29 (AI widget logo): full storefront template registry for the picker
import { TEMPLATE_DEFS } from "@/lib/templates/registry";

// ── types ──
// StoreSettings: the admin form shape. v20 adds `tickerMessages` — the raw
// JSON string column is parsed into editable `TickerRow`s below.
// v22 adds `tickerSpeed` — the admin-controlled marquee speed (seconds per loop).
interface StoreSettings {
  storeName: string;
  storeNameEn: string;
  logo: string | null;
  favicon: string | null;
  phone: string;
  email: string;
  address: string;
  instagram: string | null;
  telegram: string | null;
  telegramBotUrl: string | null;
  whatsapp: string | null;
  footerText: string;
  description: string | null;
  shippingFlat: number;
  freeShippingOver: number;
  taxPercent: number;
  currency: string;
  minOrderAmount: number;
  maintenanceMode: boolean;
  announcement: string | null;
  announcementActive: boolean;
  announcementLink: string | null;
  tickerMessages: string | null;
  tickerSpeed: number | null;
}

/** v20: one editable marquee message row */
interface TickerRow {
  text: string;
  link: string;
}

interface PaymentSettings {
  zarinpalEnabled: boolean;
  zarinpalSandbox: boolean;
  zarinpalMerchantId: string | null;
  zarinpalCurrency: "IRR" | "IRT";
  zarinpalReferrer: string | null;
  c2cEnabled: boolean;
  c2cCardNumber: string | null;
  c2cCardHolder: string | null;
  c2cIBAN: string | null;
  c2cAccountNumber: string | null;
  c2cInstructions: string | null;
}

interface AISettings {
  enabled: boolean;
  provider: "builtin" | "gapgpt";
  gapApiKey: string | null;
  hasGapKey: boolean;
  gapModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  /* v29: chat-widget logo (stored on StoreSettings, managed here) */
  aiWidgetLogo?: string | null;
  templateAiLogos?: string | null;
}

interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: number;
  security: "NONE" | "STARTTLS" | "SSL_TLS";
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  hasPassword: boolean;
  /** v27.1: ISO timestamp of the last successful save */
  updatedAt?: string | null;
}

function num(v: string): number {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  label,
  desc,
  checked,
  onChange,
  id,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function useSetting<T>(endpoint: string, queryKey: string) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: () => apiFetch<{ settings: T }>(endpoint),
  });
}

/* ═══════════════ v29 · repair-page editor (Store tab) ═══════════════ */

/** one-line guide note — used across the settings tabs (v29: «write a
 *  guide for every option» request). Keeps a single visual language. */
export function GuideNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 rounded-lg bg-muted/60 p-2.5 text-[11px] leading-5 text-muted-foreground", className)}>
      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
      <span>{children}</span>
    </p>
  );
}

/**
 * v29.2 · live preview dialog for ONE repair-page template — renders the
 * REAL RepairPage (the exact component closed visitors see) with the
 * store's own logo/contacts and the CURRENT form texts (even unsaved),
 * scaled into a device frame + a «باز کردن در تب جدید» link to the
 * /maintenance-preview demo route. Exactly like the store-template chooser
 * in ظاهر → تغییر قالب فروشگاه (the owner's request). */
function MaintenancePreviewDialog({
  tplId,
  form,
  onClose,
}: {
  tplId: string | null;
  form: StoreSettingsFull;
  onClose: () => void;
}) {
  const tpl = MAINTENANCE_TEMPLATES.find((t) => t.id === tplId) ?? null;
  const data: MaintenanceScreenData = {
    templateId: normalizeMaintenanceTemplateId(tplId),
    content: resolveMaintenanceContent(form.maintenanceContent),
    storeName: form.storeName?.trim() || "فروشگاه",
    logo: form.logo ?? null,
    phone: form.phone?.trim() || null,
    email: form.email?.trim() || null,
    workingHours: form.workingHours?.trim() || null,
  };
  return (
    <Dialog open={!!tpl} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            پیش‌نمایش زنده صفحهٔ تعمیر — قالب «{tpl?.nameFa}»
          </DialogTitle>
          <DialogDescription className="text-xs leading-6">
            همین صفحه را بازدیدکنندهٔ عادی وقتی حالت تعمیر روشن است می‌بیند — با متن‌ها، لوگو و اطلاعات تماسِ همین فرم (حتی ذخیره‌نشده).
          </DialogDescription>
        </DialogHeader>
        <ScaledFrame height={520}>
          <RepairPage data={data} />
        </ScaledFrame>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            دکمهٔ «پیگیری سفارش» در پیش‌نمایش واقعی به صفحهٔ /track-order می‌رود.
          </p>
          <Button asChild size="sm" className="rounded-lg">
            <Link href={`/maintenance-preview?template=${tplId ?? ""}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              باز کردن در تب جدید
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════ v32 (13-d) · «حالت تعمیر» — dedicated maintenance section ═══════════════ */

/**
 * v32 (13-d) · COMPACT square live template card («قالب صفحهٔ تعمیر» section) —
 * the owner asked for small cards instead of the v31 416px monsters: a
 * SQUARE mini-browser viewport (~aspect-square, 2×2 at ≥sm / 4 columns at
 * xl) renders the REAL repair-page template — the exact component closed
 * visitors see, with this form's own words/logo/contacts (even unsaved).
 * The page's real height is MEASURED with a ResizeObserver (it is h-dvh of
 * the admin window) and fitted with a CSS transform clamped to [0.16, 0.34],
 * transform-origin center — the whole page is always fully visible and the
 * horizontal overhang at 1280px logical width clips symmetrically (each
 * template centers its content). Clicking the card / «انتخاب این قالب»
 * writes maintenanceTemplate; «پیش‌نمایش زنده» opens the full-size
 * MaintenancePreviewDialog. The ACTIVE template wears the GOLDEN ring
 * («کادر طلایی») the owner asked for.
 */
function MaintenanceTemplateCard({
  tpl,
  active,
  form,
  onSelect,
  onPreview,
}: {
  tpl: (typeof MAINTENANCE_TEMPLATES)[number];
  active: boolean;
  form: StoreSettingsFull;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const measure = () => {
      const bh = box.clientHeight || 230;
      const ph = inner.offsetHeight || 900;
      setScale(Math.max(0.16, Math.min(0.34, bh / ph)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  /* the exact component closed visitors see — with this form's own words */
  const data: MaintenanceScreenData = {
    templateId: tpl.id,
    content: resolveMaintenanceContent(form.maintenanceContent),
    storeName: form.storeName?.trim() || "فروشگاه",
    logo: form.logo ?? null,
    phone: form.phone?.trim() || null,
    email: form.email?.trim() || null,
    workingHours: form.workingHours?.trim() || null,
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-2.5 transition-all duration-300",
        active
          ? "border-primary shadow-xl shadow-primary/25 ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "border-border hover:border-primary/50 hover:shadow-lg"
      )}
    >
      {/* the whole card top (mini browser + name + desc) is one select button */}
      <button
        type="button"
        onClick={onSelect}
        disabled={active}
        className="w-full cursor-pointer text-start disabled:cursor-default"
        aria-label={`انتخاب قالب ${tpl.nameFa}`}
      >
        {/* mini square browser viewport with the REAL template inside */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            className="flex h-6 items-center gap-1.5 border-b border-zinc-200 bg-zinc-100 px-2 dark:border-zinc-800 dark:bg-zinc-800/70"
            dir="ltr"
          >
            <span aria-hidden className="h-2 w-2 rounded-full bg-red-400/80" />
            <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400/80" />
            <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <span
              dir="ltr"
              className="ms-1 flex-1 truncate rounded bg-white/80 px-1.5 font-mono text-[8px] text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400"
            >
              {tpl.nameEn}
            </span>
          </div>
          <div ref={boxRef} className="relative aspect-square w-full overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <div
                ref={innerRef}
                className="pointer-events-none select-none [transform-origin:center]"
                style={{ width: 1280, transform: `scale(${scale})` }}
              >
                <RepairPage data={data} />
              </div>
            </div>
            {scale === 0 && <Skeleton className="absolute inset-0 z-10 rounded-none" />}
            {active && (
              <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-primary-foreground shadow-lg">
                <Check className="h-3 w-3" />
                فعال
              </span>
            )}
          </div>
        </div>

        {/* Persian name + one-line description */}
        <div className="flex items-center justify-between gap-1.5 px-0.5 pt-2">
          <p className="truncate text-xs font-black">{tpl.nameFa}</p>
          {!active && (
            <span dir="ltr" className="shrink-0 font-mono text-[8px] text-muted-foreground">
              {tpl.nameEn}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 px-0.5 text-[10px] leading-4 text-muted-foreground">{tpl.desc}</p>
      </button>

      <div className="flex items-center gap-1.5 pt-2">
        <Button
          type="button"
          size="sm"
          variant={active ? "outline" : "default"}
          disabled={active}
          className="h-8 flex-1 rounded-lg text-[10px] font-black"
          onClick={onSelect}
          aria-label={`انتخاب قالب ${tpl.nameFa}`}
        >
          {active && <Check className="h-3 w-3" />}
          {active ? "قالب فعال" : "انتخاب این قالب"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1 rounded-lg text-[10px] font-bold"
          onClick={onPreview}
          aria-label={`پیش‌نمایش زنده قالب ${tpl.nameFa}`}
        >
          <Eye className="h-3.5 w-3.5" />
          پیش‌نمایش زنده
        </Button>
      </div>
    </div>
  );
}

/**
 * v30 · «حالت تعمیر» tab — everything maintenance-related in one place
 * (it used to be squeezed inside the فروشگاه tab):
 *   ① وضعیت — the maintenance ON/OFF switch card (writes maintenanceMode)
 *   ② اطلاعات تماس و پیام‌ها — every editable word of the repair page +
 *      the phone/email/hours values shown on it
 *   ③ قالب صفحهٔ تعمیر — the 4 BIG live template cards
 * Saves through the same /api/admin/settings/store PUT as the other tabs.
 */
function MaintenanceTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<StoreSettingsFull>("/api/admin/settings/store", "admin-settings-store");
  const [form, setForm] = useState<StoreSettingsFull | null>(null);
  const [saving, setSaving] = useState(false);
  /* every editable word of the repair page (write-through to the JSON column) */
  const [texts, setTexts] = useState<MaintenanceContentForm>(() => parseMaintenanceContentForm(null));
  /* which template's LIVE full-size preview dialog is open */
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings && !form) {
      setForm(data.settings);
      setTexts(parseMaintenanceContentForm(data.settings.maintenanceContent));
    }
  }, [data, form]);

  const set = <K extends keyof StoreSettingsFull>(k: K, v: StoreSettingsFull[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  /* serialize immediately — every key with content goes into the JSON
   * column; a fully-empty form stores null (= all defaults). */
  const setText = (k: keyof MaintenanceContentForm, v: string) => {
    const next = { ...texts, [k]: v };
    setTexts(next);
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(next)) {
      if (val.trim()) cleaned[key] = val.trim();
    }
    set("maintenanceContent", Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null);
  };

  const def = (k: keyof MaintenanceContentForm) => DEFAULT_MAINTENANCE_CONTENT[k];

  const save = async () => {
    if (!form || saving) return;
    if (form.storeName.trim().length < 2) return toast.error("نام فروشگاه الزامی است");
    if (form.storeNameEn.trim().length < 2) return toast.error("نام انگلیسی فروشگاه الزامی است");
    setSaving(true);
    try {
      const msg = await putStoreSettings(form);
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["admin-settings-store"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        {/* v32 (13-d): matches the new COMPACT square template cards */}
        <div className="mx-auto grid w-full max-w-[36rem] grid-cols-2 gap-3 sm:gap-4 xl:mx-0 xl:max-w-none xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[21.5rem] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const selected = normalizeMaintenanceTemplateId(form.maintenanceTemplate);
  const on = form.maintenanceMode;

  return (
    <div className="space-y-4">
      {/* ── Section 1 · وضعیت — maintenance ON/OFF ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Power className="h-4 w-4 text-primary" />
            وضعیت
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-2xl border p-5 transition-colors",
              on ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-emerald-500/30 bg-emerald-500/[0.05]"
            )}
          >
            <span
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border",
                on ? "border-amber-500/40 bg-amber-500/15 text-amber-600" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              )}
            >
              {on ? <Wrench className="h-7 w-7" /> : <Store className="h-7 w-7" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black">{on ? "فروشگاه در حالت تعمیر است" : "فروشگاه باز است"}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                    on ? "border-amber-500/40 bg-amber-500/10 text-amber-600" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-amber-500" : "bg-emerald-500")} />
                  {on ? "حالت تعمیر فعال" : "فروشگاه آنلاین"}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                {on
                  ? "بازدیدکنندگان عادی به‌جای فروشگاه، صفحهٔ تعمیر با قالب انتخابی پایین را می‌بینند."
                  : "فروشگاه برای همهٔ بازدیدکنندگان باز است — با روشن کردن کلید، صفحهٔ تعمیر جای آن را می‌گیرد."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Switch id="mt-enabled" checked={on} onCheckedChange={(v) => set("maintenanceMode", v)} />
              <Label htmlFor="mt-enabled" className="cursor-pointer text-xs font-bold text-muted-foreground">
                {on ? "خاموش کردن" : "روشن کردن"}
              </Label>
            </div>
          </div>
          {on && (
            <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-xs leading-5 text-destructive">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              مدیرها با حساب خودشان همیشه فروشگاه کامل را می‌بینند — صفحهٔ «پیگیری سفارش» هم برای مشتری‌ها باز می‌ماند.
            </p>
          )}
          <GuideNote>
            در حالت تعمیر، کل فروشگاه برای مهمان‌ها بسته می‌شود و به‌جای آن صفحهٔ تعمیر (قالب انتخابی در بخش «انتخاب قالب») نمایش داده می‌شود؛ پنل مدیریت و صفحهٔ پیگیری سفارش در دسترس می‌مانند. تغییر وضعیت با دکمهٔ «ذخیره تنظیمات حالت تعمیر» ثبت می‌شود.
          </GuideNote>
        </CardContent>
      </Card>

      {/* ── Section 2 · اطلاعات تماس و پیام‌ها ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Phone className="h-4 w-4 text-primary" />
            اطلاعات تماس و پیام‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GuideNote>
            هر فیلد متنی که خالی بگذارید، همان واژهٔ پیش‌فرضِ طراحی (به‌صورت placeholder نشان داده می‌شود) روی صفحه می‌آید؛ برای بازگشت به پیش‌فرض متن را پاک کنید و ذخیره بزنید. تلفن، ایمیل و ساعات کاری همان مقادیر تب «فروشگاه» هستند و از همین‌جا هم قابل ویرایش‌اند.
          </GuideNote>

          <div className="grid gap-4 md:grid-cols-2">
            <p className="md:col-span-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <Pencil className="h-3.5 w-3.5 text-primary/70" />
              پیام‌های اصلی صفحه
            </p>
            <Field label="ادامهٔ عنوان (بعد از نام فروشگاه)" htmlFor="mt-titlesuffix" hint={`پیش‌فرض: ${def("titleSuffix")}`}>
              <Input id="mt-titlesuffix" className="rounded-lg" value={texts.titleSuffix} onChange={(e) => setText("titleSuffix", e.target.value)} placeholder={def("titleSuffix")} />
            </Field>
            <Field label="متن نشان (بَج) صفحه" htmlFor="mt-badge" hint={`پیش‌فرض: ${def("badge")}`}>
              <Input id="mt-badge" className="rounded-lg" value={texts.badge} onChange={(e) => setText("badge", e.target.value)} placeholder={def("badge")} />
            </Field>
            <div className="md:col-span-2">
              <Field label="توضیح اصلی صفحه" htmlFor="mt-desc" hint={`پیش‌فرض: ${def("description").slice(0, 60)}…`}>
                <Textarea id="mt-desc" rows={3} className="rounded-lg" value={texts.description} onChange={(e) => setText("description", e.target.value)} placeholder={def("description")} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="یادداشت پایین صفحه" htmlFor="mt-note" hint={`پیش‌فرض: ${def("footerNote")}`}>
                <Input id="mt-note" className="rounded-lg" value={texts.footerNote} onChange={(e) => setText("footerNote", e.target.value)} placeholder={def("footerNote")} />
              </Field>
            </div>

            <p className="md:col-span-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-primary/70" />
              اطلاعات تماس (روی صفحه تعمیر نمایش داده می‌شود)
            </p>
            <Field label="شماره تلفن" htmlFor="mt-phone" hint="همان تلفن تب «فروشگاه» — اینجا هم قابل ویرایش است">
              <Input id="mt-phone" dir="ltr" className="rounded-lg text-left" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="ایمیل" htmlFor="mt-email" hint="همان ایمیل تب «فروشگاه» — اینجا هم قابل ویرایش است">
              <Input id="mt-email" dir="ltr" className="rounded-lg text-left" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="ساعات کاری" htmlFor="mt-hours" hint="مثلاً: شنبه تا پنجشنبه ۱۰ تا ۱۸">
              <Input id="mt-hours" className="rounded-lg" value={form.workingHours ?? ""} onChange={(e) => set("workingHours", e.target.value)} />
            </Field>
            <Field label="برچسب تلفن" htmlFor="mt-phonelabel" hint={`پیش‌فرض: ${def("phoneLabel")}`}>
              <Input id="mt-phonelabel" className="rounded-lg" value={texts.phoneLabel} onChange={(e) => setText("phoneLabel", e.target.value)} placeholder={def("phoneLabel")} />
            </Field>
            <Field label="برچسب ایمیل" htmlFor="mt-emaillabel" hint={`پیش‌فرض: ${def("emailLabel")}`}>
              <Input id="mt-emaillabel" className="rounded-lg" value={texts.emailLabel} onChange={(e) => setText("emailLabel", e.target.value)} placeholder={def("emailLabel")} />
            </Field>
            <Field label="برچسب ساعات کاری" htmlFor="mt-hourslabel" hint={`پیش‌فرض: ${def("hoursLabel")}`}>
              <Input id="mt-hourslabel" className="rounded-lg" value={texts.hoursLabel} onChange={(e) => setText("hoursLabel", e.target.value)} placeholder={def("hoursLabel")} />
            </Field>

            <p className="md:col-span-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <PackageSearch className="h-3.5 w-3.5 text-primary/70" />
              بخش پیگیری سفارش
            </p>
            <Field label="عنوان بخش پیگیری سفارش" htmlFor="mt-tracktitle" hint={`پیش‌فرض: ${def("trackingTitle")}`}>
              <Input id="mt-tracktitle" className="rounded-lg" value={texts.trackingTitle} onChange={(e) => setText("trackingTitle", e.target.value)} placeholder={def("trackingTitle")} />
            </Field>
            <Field label="متن دکمهٔ پیگیری سفارش" htmlFor="mt-trackbtn" hint={`پیش‌فرض: ${def("trackingButton")} — دکمه به صفحه /track-order می‌رود`}>
              <Input id="mt-trackbtn" className="rounded-lg" value={texts.trackingButton} onChange={(e) => setText("trackingButton", e.target.value)} placeholder={def("trackingButton")} />
            </Field>
            <div className="md:col-span-2">
              <Field label="توضیح زیر عنوان پیگیری" htmlFor="mt-trackdesc" hint={`پیش‌فرض: ${def("trackingDesc")}`}>
                <Input id="mt-trackdesc" className="rounded-lg" value={texts.trackingDesc} onChange={(e) => setText("trackingDesc", e.target.value)} placeholder={def("trackingDesc")} />
              </Field>
            </div>

            <p className="md:col-span-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <Timer className="h-3.5 w-3.5 text-primary/70" />
              شمارش معکوس (فقط قالب «شمارش معکوس»)
            </p>
            <div className="md:col-span-2">
              <Field label="متن بالای شمارش معکوس" htmlFor="mt-etanote" hint={`پیش‌فرض: ${def("etaNote")}`}>
                <Input id="mt-etanote" className="rounded-lg" value={texts.etaNote} onChange={(e) => setText("etaNote", e.target.value)} placeholder={def("etaNote")} />
              </Field>
            </div>
            {/* v32 (13-d): admin-set countdown target — days + hours on top of
             * the refresh-proof 18:00 anchor (empty = the designed default) */}
            <Field label="تعداد روز شمارش" htmlFor="mt-cddays" hint="۰ تا ۳۶۵ — خالی = بدون روز اضافه">
              <Input
                id="mt-cddays"
                type="number"
                min={0}
                max={365}
                dir="ltr"
                className="rounded-lg"
                value={texts.countdownDays}
                onChange={(e) => setText("countdownDays", e.target.value)}
                placeholder="مثلاً ۲"
              />
            </Field>
            <Field label="تعداد ساعت شمارش" htmlFor="mt-cdhours" hint="۰ تا ۲۳ — خالی = بدون ساعت اضافه">
              <Input
                id="mt-cdhours"
                type="number"
                min={0}
                max={23}
                dir="ltr"
                className="rounded-lg"
                value={texts.countdownHours}
                onChange={(e) => setText("countdownHours", e.target.value)}
                placeholder="مثلاً ۶"
              />
            </Field>
            <div className="md:col-span-2">
              <GuideNote>
                اگر روز یا ساعت را تنظیم کنید، هدف شمارش معکوس «ساعت ۱۸:۰۰ (امروز یا فردا) به‌اضافهٔ مقدار شما» می‌شود و نوار پیشرفت و مراحل تعمیر کل همین مدت را پوشش می‌دهند. هر دو خالی = شمارش کوتاه پیش‌فرض تا ساعت ۱۸:۰۰.
              </GuideNote>
            </div>

            <p className="md:col-span-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <ImagePlus className="h-3.5 w-3.5 text-primary/70" />
              لوگوی صفحهٔ تعمیر
            </p>
            <div className="md:col-span-2">
              <ImageUpload
                label="لوگوی اختصاصی صفحهٔ تعمیر (اختیاری)"
                folder="branding"
                height={96}
                value={texts.logoUrl || null}
                onChange={(url) => setText("logoUrl", url ?? "")}
              />
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                خالی بگذارید تا لوگوی اصلی فروشگاه (تب «برندینگ») روی صفحهٔ تعمیر بیفتد؛ اگر آن هم تنظیم نشده باشد، آیکون آچارِ قالب نمایش داده می‌شود.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3 · قالب صفحهٔ تعمیر — the 4 COMPACT square live cards ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2.5 text-base font-black">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-4 w-4" />
              </span>
              قالب صفحهٔ تعمیر
            </CardTitle>
            <span className="text-[11px] font-bold text-muted-foreground">۴ قالب آماده</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <GuideNote>
            قالب ظاهر صفحه‌ای را که بازدیدکنندهٔ عادی در حالت تعمیر می‌بیند انتخاب کنید — هر کارت کوک، خودِ همان قالب را به‌صورت زنده و کامل در یک قاب مربعی نشان می‌دهد و با متن‌ها، لوگو و اطلاعات تماسِ همین فرم (حتی ذخیره‌نشده) به‌روز می‌شود. کارت فعال با کادر طلایی مشخص می‌شود؛ برای دیدن قالب در اندازهٔ واقعی، «پیش‌نمایش زنده» را بزنید.
          </GuideNote>
          {/* v32 (13-d): COMPACT square cards — 2×2 at ≥sm, 4 columns at xl */}
          <div className="mx-auto grid w-full max-w-[36rem] grid-cols-2 gap-3 sm:gap-4 xl:mx-0 xl:max-w-none xl:grid-cols-4">
            {MAINTENANCE_TEMPLATES.map((t) => (
              <MaintenanceTemplateCard
                key={t.id}
                tpl={t}
                active={selected === t.id}
                form={form}
                onSelect={() => set("maintenanceTemplate", t.id)}
                onPreview={() => setPreviewing(t.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات حالت تعمیر
        </Button>
      </div>

      {/* full-size live preview dialog (the real RepairPage, scaled device frame) */}
      <MaintenancePreviewDialog tplId={previewing} form={form} onClose={() => setPreviewing(null)} />
    </div>
  );
}

// ── Store tab ──
function StoreTab() {
  const queryClient = useQueryClient();
  /* v30: the repair-page template/texts now live in the dedicated
   * «حالت تعمیر» tab — this tab keeps the plain store fields (the form
   * still carries the FULL settings row, GET returns every column). */
  const { data, isLoading, isError, error } = useSetting<StoreSettingsFull>("/api/admin/settings/store", "admin-settings-store");
  const [form, setForm] = useState<StoreSettingsFull | null>(null);
  const [saving, setSaving] = useState(false);
  /* v20: editable marquee message rows (parsed once from the raw JSON column) */
  const [tickerRows, setTickerRows] = useState<TickerRow[]>([]);

  useEffect(() => {
    if (data?.settings && !form) {
      setForm(data.settings);
      try {
        const arr = data.settings.tickerMessages ? JSON.parse(data.settings.tickerMessages) : [];
        setTickerRows(
          Array.isArray(arr)
            ? arr
                .filter((m): m is { text: string; link?: string | null } => !!m && typeof m === "object" && typeof m.text === "string")
                .map((m) => ({ text: m.text, link: typeof m.link === "string" ? m.link : "" }))
            : []
        );
      } catch {
        setTickerRows([]);
      }
    }
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    if (form.storeName.trim().length < 2) return toast.error("نام فروشگاه الزامی است");
    if (form.storeNameEn.trim().length < 2) return toast.error("نام انگلیسی فروشگاه الزامی است");
    const cleanTicker = tickerRows
      .filter((t) => t.text.trim().length >= 2)
      .slice(0, 8)
      .map((t) => ({ text: t.text.trim(), link: t.link.trim() || null }));
    if (cleanTicker.length !== tickerRows.filter((t) => t.text.trim()).length) {
      return toast.error("متن هر پیام متحرک حداقل ۲ کاراکتر باشد (یا ردیف خالی را حذف کنید)");
    }
    setSaving(true);
    try {
      /* v29: the maintenance texts live in the form as a serialized JSON
       * string (the editor writes the column's wire format) — parse it into
       * the object the PUT endpoint's zod schema expects. */
      let maintenance: unknown = undefined;
      if (typeof form.maintenanceContent === "string" && form.maintenanceContent.trim()) {
        try {
          maintenance = JSON.parse(form.maintenanceContent);
        } catch {
          maintenance = null;
        }
      } else if (form.maintenanceContent && typeof form.maintenanceContent === "object") {
        maintenance = form.maintenanceContent;
      }
      const payload = {
        ...form,
        shippingFlat: Math.round(num(String(form.shippingFlat))),
        freeShippingOver: Math.round(num(String(form.freeShippingOver))),
        taxPercent: num(String(form.taxPercent)),
        minOrderAmount: Math.round(num(String(form.minOrderAmount))),
        tickerMessages: cleanTicker,
        tickerSpeed: Math.max(0, Math.round(Number(form.tickerSpeed ?? 0) || 0)),
        ...(maintenance !== undefined ? { maintenanceContent: maintenance } : {}),
      };
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/store", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(json.message ?? "تنظیمات ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-store"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
    );
  }

  const set = <K extends keyof StoreSettingsFull>(k: K, v: StoreSettingsFull[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Store className="h-4 w-4 text-primary" />
              هویت فروشگاه
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="نام فروشگاه *" htmlFor="s-name">
              <Input id="s-name" className="rounded-lg" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="نام انگلیسی *" htmlFor="s-nameen">
              <Input id="s-nameen" dir="ltr" className="rounded-lg text-left" value={form.storeNameEn} onChange={(e) => set("storeNameEn", e.target.value)} />
            </Field>
            <Field label="تلفن *" htmlFor="s-phone">
              <Input id="s-phone" dir="ltr" className="rounded-lg text-left" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="ایمیل *" htmlFor="s-email">
              <Input id="s-email" dir="ltr" className="rounded-lg text-left" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="آدرس *" htmlFor="s-address">
                <Input id="s-address" className="rounded-lg" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
              <Field label="اینستاگرام" htmlFor="s-ig">
                <Input id="s-ig" dir="ltr" className="rounded-lg text-left" value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@tajelectronics" />
              </Field>
              <Field label="تلگرام" htmlFor="s-tg">
                <Input id="s-tg" dir="ltr" className="rounded-lg text-left" value={form.telegram ?? ""} onChange={(e) => set("telegram", e.target.value)} placeholder="t.me/tajelectronics" />
              </Field>
              <Field label="واتس‌اپ" htmlFor="s-wa">
                <Input id="s-wa" dir="ltr" className="rounded-lg text-left" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="9891…" />
              </Field>
            </div>
            {/* v34.1: «خرید از ربات تلگرامی» — the footer pill button link.
                Empty = falls back to the configured bot's t.me username
                (Settings → ربات تلگرامی); set anything to override. */}
            <div className="sm:col-span-2">
              <Field
                label="لینک ربات خرید تلگرامی (دکمه فوتر)"
                htmlFor="s-tgbot"
                hint="وقتی پر باشد، در فوتر همه قالب‌ها دکمه «خرید از ربات تلگرامی» نمایش داده می‌شود — @username یا لینک t.me (خالی = خودکار از تنظیمات ربات تلگرامی، اگر ربات فعال باشد)"
              >
                <Input id="s-tgbot" dir="ltr" className="rounded-lg text-left" value={form.telegramBotUrl ?? ""} onChange={(e) => set("telegramBotUrl", e.target.value)} placeholder="@TajShopBot یا t.me/TajShopBot" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ImageUpload
                label="لوگوی فروشگاه"
                folder="misc"
                height={110}
                value={form.logo}
                onChange={(url) => set("logo", url)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Wrench className="h-4 w-4 text-primary" />
              ارسال، مالیات و متن‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="هزینه ارسال ثابت (تومان)" htmlFor="s-ship" hint={`فعلی: ${formatPrice(form.shippingFlat)} تومان`}>
              <Input id="s-ship" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={String(form.shippingFlat)}
                onChange={(e) => set("shippingFlat", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
            </Field>
            <Field label="ارسال رایگان بالای (تومان)" htmlFor="s-freeship" hint="۰ = غیرفعال">
              <Input id="s-freeship" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={String(form.freeShippingOver)}
                onChange={(e) => set("freeShippingOver", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
            </Field>
            <Field label="درصد مالیات (۰ = قیمت‌ها شامل مالیات)" htmlFor="s-tax">
              <Input id="s-tax" dir="ltr" inputMode="decimal" className="rounded-lg text-left" value={String(form.taxPercent)}
                onChange={(e) => set("taxPercent", Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} />
            </Field>
            <Field label="واحد پول" htmlFor="s-cur">
              <Input id="s-cur" className="rounded-lg" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </Field>
            <Field label="حداقل مبلغ سفارش (تومان)" htmlFor="s-minorder">
              <Input id="s-minorder" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={String(form.minOrderAmount)}
                onChange={(e) => set("minOrderAmount", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="متن فوتر *" htmlFor="s-footer">
                <Textarea id="s-footer" rows={2} className="rounded-lg" value={form.footerText} onChange={(e) => set("footerText", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="توضیحات فروشگاه (سئو)" htmlFor="s-desc">
                <Textarea id="s-desc" rows={2} className="rounded-lg" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/30 p-3.5">
              <Field label="پیام اطلاع‌رسانی (نوار بالای سایت + صفحه اصلی)" htmlFor="s-ann" hint="خالی = نمایش پیش‌فرض «ارسال سریع به سراسر ایران»">
                <Input id="s-ann" className="rounded-lg" value={form.announcement ?? ""} onChange={(e) => set("announcement", e.target.value)} placeholder="مثلاً: کد تخفیف خوش‌آمدگویی WELCOME10…" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2 items-end">
                <Field label="لینک اعلان (اختیاری)" htmlFor="s-annlink" hint="مسیر داخلی مثل /products یا آدرس کامل https">
                  <Input id="s-annlink" dir="ltr" className="rounded-lg text-left" value={form.announcementLink ?? ""} onChange={(e) => set("announcementLink", e.target.value)} placeholder="/products?discount=1" />
                </Field>
                <div className="pb-1">
                  <SwitchRow
                    id="s-annactive"
                    label="نمایش نوار اعلان"
                    desc="در هدر و صفحه اصلی اعمال می‌شود"
                    checked={form.announcementActive}
                    onChange={(v) => set("announcementActive", v)}
                  />
                </div>
              </div>
            </div>
            {/* v20 — marquee ticker messages: fully editable / deletable */}
            <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <Megaphone className="h-4 w-4 text-primary" />
                    پیام‌های نوار متحرک (مارکی)
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    این پیام‌ها به‌صورت حلقهٔ بی‌نهایت و یکنواخت در نوار متحرک سربرگ قالب‌ها نمایش داده می‌شوند.
                    اگر لیست خالی باشد، «پیام اطلاع‌رسانی» بالا نمایش داده می‌شود.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {tickerRows.length.toLocaleString("fa-IR")} پیام
                </span>
              </div>
              <div className="space-y-2">
                {tickerRows.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    پیامی ثبت نشده است — با دکمهٔ زیر پیام جدید اضافه کنید
                  </p>
                )}
                {tickerRows.map((t, idx) => (
                  <div key={idx} className="grid gap-2 rounded-lg border bg-card p-2 sm:grid-cols-[1.7fr_1fr_auto]">
                    <Input
                      className="rounded-lg"
                      placeholder="متن پیام (مثلاً: کد تخفیف خوش‌آمدگویی WELCOME10…)"
                      value={t.text}
                      maxLength={200}
                      onChange={(e) =>
                        setTickerRows((rows) => rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))
                      }
                    />
                    <Input
                      dir="ltr"
                      className="rounded-lg text-left"
                      placeholder="لینک (اختیاری) — /products یا https"
                      value={t.link}
                      maxLength={300}
                      onChange={(e) =>
                        setTickerRows((rows) => rows.map((r, i) => (i === idx ? { ...r, link: e.target.value } : r)))
                      }
                    />
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-md text-destructive hover:bg-destructive/10"
                        aria-label={`حذف پیام ${idx + 1}`}
                        onClick={() => setTickerRows((rows) => rows.filter((_, i) => i !== idx))}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-lg"
                  disabled={saving || tickerRows.length >= 8}
                  onClick={() => setTickerRows((rows) => [...rows, { text: "", link: "" }])}
                >
                  <Plus className="h-4 w-4" />
                  افزودن پیام متحرک {tickerRows.length >= 8 ? "(حداکثر ۸)" : ""}
                </Button>
                {/* v22 — admin-controlled marquee speed for the ticker strips */}
                <div className="grid gap-1.5 rounded-lg border bg-card p-2.5 sm:grid-cols-[1.2fr_1fr]">
                  <Label htmlFor="s-tickspeed" className="text-xs font-medium">سرعت حرکت نوار متحرک</Label>
                  <Select
                    value={String(form.tickerSpeed ?? 0)}
                    onValueChange={(v) => set("tickerSpeed", Number(v))}
                  >
                    <SelectTrigger id="s-tickspeed" className="w-full rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">پیش‌فرض قالب (هر قالب سرعت خودش)</SelectItem>
                      <SelectItem value="10">خیلی سریع (۱۰ ثانیه)</SelectItem>
                      <SelectItem value="16">سریع (۱۶ ثانیه)</SelectItem>
                      <SelectItem value="24">معمولی (۲۴ ثانیه)</SelectItem>
                      <SelectItem value="34">آرام (۳۴ ثانیه)</SelectItem>
                      <SelectItem value="46">خیلی آرام (۴۶ ثانیه)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-5 text-muted-foreground sm:col-span-2">
                    عدد کمتر = حرکت سریع‌تر. «پیش‌فرض قالب» یعنی هر قالب از سرعت طراحی‌شدهٔ خودش استفاده می‌کند.
                  </p>
                </div>
              </div>
            </div>
            {/* v30: maintenance moved to its own tab — leave a signpost */}
            <div className="sm:col-span-2">
              <GuideNote>
                حالت تعمیر، انتخاب قالب صفحه تعمیر و متن‌های آن به تب اختصاصی{" "}
                <Link href="?tab=maintenance" className="font-bold text-primary hover:opacity-80">«حالت تعمیر»</Link>{" "}
                منتقل شد.
              </GuideNote>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات فروشگاه
        </Button>
      </div>
      {/* v29.1: re-open the first-run install wizard (deploy-over-volume case) */}
      <InstallWizardCard />
    </div>
  );
}

/* ── v29.1: re-open the /install wizard from the panel ──────────────────
 * After deploying a new version over an existing Docker volume, /install
 * permanently redirects to / (the store is already marked installed) and
 * the admin can never re-run the wizard. This card un-locks it: the API
 * deletes ONLY the InstallationState flag row — products, orders, users
 * and settings are untouched. The wizard then creates a fresh admin (with
 * a one-time recovery phrase), re-applies default settings and imports the
 * demo catalog only when the catalog is empty. */
function InstallWizardCard() {
  const [confirming, setConfirming] = useState(false);
  const reopen = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string; redirect?: string; alreadyOpen?: boolean }>("/api/admin/settings/reinstall", {
        method: "PUT",
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "ویزارد نصب باز شد");
      window.location.href = json.redirect ?? "/install";
    },
    onError: (e) => {
      setConfirming(false);
      toast.error(e instanceof Error ? e.message : "بازکردن ویزارد ناموفق بود");
    },
  });
  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4.5 w-4.5 text-amber-500" />
          ویزارد نصب اولیه
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-6 text-muted-foreground">
          اگر بعد از ارتقای نسخه، صفحه <span className="font-mono" dir="ltr">/install</span> به فروشگاه ریدایرکت می‌شود (چون نصب قبلی قفل شده)،
          از اینجا ویزارد را دوباره باز کنید تا حساب مدیر تازه با «کد بازیابی یک‌بارمصرف» ساخته شود و پیش‌فرض‌های نسخه جدید اعمال گردد.
        </p>
        <GuideNote>
          فقط پرچم «نصب‌شده» به حالت «نصب‌نشده» برمی‌گردد — محصولات، سفارش‌ها، کاربران و تنظیمات فعلی هیچ تغییری نمی‌کنند. اگر کاتالوگ خالی باشد،
          ویزارد کاتالوگ نمونه را نصب می‌کند؛ در غیر این صورت داده‌های موجود دست نمی‌خورند. مدیران قبلی هم به کار خود ادامه می‌دهند.
        </GuideNote>
        <div className="flex flex-wrap items-center gap-2">
          {!confirming ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              onClick={() => setConfirming(true)}
            >
              <ShieldAlert className="h-4 w-4" />
              اجرای مجدد ویزارد نصب
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="rounded-lg bg-amber-600 text-white hover:bg-amber-600/90"
                disabled={reopen.isPending}
                onClick={() => reopen.mutate()}
              >
                {reopen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                بله، ویزارد را باز کن
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg" disabled={reopen.isPending} onClick={() => setConfirming(false)}>
                انصراف
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Payment tab ──
function PaymentTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<PaymentSettings>("/api/admin/settings/payment", "admin-settings-payment");
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/payment", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      toast.success(json.message ?? "تنظیمات ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-payment"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const testZarinpal = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const json = await apiFetch<{ success?: boolean; message?: string }>("/api/admin/settings/zarinpal-test", {
        method: "POST",
      });
      if (json.success) toast.success(json.message ?? "اتصال موفق");
      else toast.error(json.message ?? "اتصال ناموفق");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تست ناموفق بود");
    } finally {
      setTesting(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  const set = <K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <CreditCard className="h-4 w-4 text-primary" />
              درگاه زرین‌پال
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="pay-zp"
              label="فعال‌سازی زرین‌پال"
              desc="پرداخت آنلاین از طریق درگاه"
              checked={form.zarinpalEnabled}
              onChange={(v) => set("zarinpalEnabled", v)}
            />
            <SwitchRow
              id="pay-zpsb"
              label="حالت آزمایشی (Sandbox)"
              desc="برای تست بدون تراکنش واقعی"
              checked={form.zarinpalSandbox}
              onChange={(v) => set("zarinpalSandbox", v)}
            />
            <Field label="شناسه پذیرنده (Merchant ID)" htmlFor="pay-merchant" hint="۳۶ کاراکتر — از پنل زرین‌پال دریافت کنید">
              <Input id="pay-merchant" dir="ltr" type="password" className="rounded-lg font-mono text-left" value={form.zarinpalMerchantId ?? ""}
                onChange={(e) => set("zarinpalMerchantId", e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </Field>
            {/* v19: ZarinPal v4 docs — currency (IRR/IRT) + referrer_id */}
            <Field label="واحد مبلغ تراکنش (currency)" htmlFor="pay-zpcurrency" hint="IRR = مبلغ به ریال (پیش‌فرض؛ مبالغ فروشگاه به‌صورت خودکار ×۱۰ ارسال می‌شود) — IRT = مبلغ به تومان">
              <Select value={form.zarinpalCurrency ?? "IRR"} onValueChange={(v) => set("zarinpalCurrency", v as "IRR" | "IRT")}>
                <SelectTrigger id="pay-zpcurrency" className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRR">ریال (IRR)</SelectItem>
                  <SelectItem value="IRT">تومان (IRT)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="کد معرف (referrer_id)" htmlFor="pay-zpreferrer" hint="اختیاری — طبق راهنمای وب‌سرویس زرین‌پال">
              <Input id="pay-zpreferrer" dir="ltr" className="rounded-lg font-mono text-left" value={form.zarinpalReferrer ?? ""}
                onChange={(e) => set("zarinpalReferrer", e.target.value)} placeholder="xxxx" />
            </Field>
            <Button variant="outline" className="rounded-lg" onClick={testZarinpal} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              تست اتصال زرین‌پال
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              پرداخت کارت به کارت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="pay-c2c"
              label="فعال‌سازی کارت به کارت"
              desc="کاربران رسید واریز را ارسال می‌کنند"
              checked={form.c2cEnabled}
              onChange={(v) => set("c2cEnabled", v)}
            />
            <Field label="شماره کارت" htmlFor="pay-cardno">
              <Input id="pay-cardno" dir="ltr" className="rounded-lg font-mono text-left" value={form.c2cCardNumber ?? ""}
                onChange={(e) => set("c2cCardNumber", e.target.value)} placeholder="6037-9975-xxxx-xxxx" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="به نام (صاحب کارت)" htmlFor="pay-holder">
                <Input id="pay-holder" className="rounded-lg" value={form.c2cCardHolder ?? ""}
                  onChange={(e) => set("c2cCardHolder", e.target.value)} />
              </Field>
              <Field label="شماره حساب" htmlFor="pay-accno">
                <Input id="pay-accno" dir="ltr" className="rounded-lg font-mono text-left" value={form.c2cAccountNumber ?? ""}
                  onChange={(e) => set("c2cAccountNumber", e.target.value)} />
              </Field>
            </div>
            <Field label="شماره شبا" htmlFor="pay-iban">
              <Input id="pay-iban" dir="ltr" className="rounded-lg font-mono text-left" value={form.c2cIBAN ?? ""}
                onChange={(e) => set("c2cIBAN", e.target.value)} placeholder="IR" />
            </Field>
            <Field label="راهنمای پرداخت کارت به کارت" htmlFor="pay-inst" hint="در صفحه پرداخت به کاربر نمایش داده می‌شود">
              <Textarea id="pay-inst" rows={4} className="rounded-lg" value={form.c2cInstructions ?? ""}
                onChange={(e) => set("c2cInstructions", e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات پرداخت
        </Button>
      </div>
    </div>
  );
}

// ── AI tab ──
/** v27b: clickable model chips fed by GET /api/admin/ai/models — the list
 *  comes from the provider using the STORED key (server-side only), so the
 *  admin picks a model the account actually has instead of guessing. */
function ModelChips({
  models,
  current,
  onPick,
}: {
  models: string[] | null | undefined;
  current: string;
  onPick: (m: string) => void;
}) {
  if (!models || models.length === 0) return null;
  return (
    <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border bg-muted/30 p-2">
      <div className="flex flex-wrap gap-1.5">
        {models.slice(0, 24).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onPick(m)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors",
              m === current
                ? "border-primary/50 bg-primary/15 font-bold text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
            title={`انتخاب مدل ${m} — با یک کلیک در فیلد بالا ثبت می‌شود (برای اعمال، ذخیره کنید)`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {models.length.toLocaleString("fa-IR")} مدل در این حساب موجود است — با کلیک انتخاب و سپس «ذخیره» کنید
      </p>
    </div>
  );
}

function AITab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<AISettings>("/api/admin/settings/ai", "admin-settings-ai");
  const [form, setForm] = useState<AISettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  /* v28: the account's REAL GapGPT model list (server-side fetch with the
   * stored key — the key never reaches the browser). Auto-loads once a key exists. */
  const {
    data: modelsData,
    isLoading: modelsLoading,
    refetch: refetchModels,
    isRefetching: modelsRefetching,
  } = useQuery({
    queryKey: ["admin", "ai-models"],
    queryFn: () => apiFetch<{ gapgpt: string[] | null }>("/api/admin/ai/models"),
    enabled: !!(form?.hasGapKey || form?.gapApiKey),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (data?.settings && !form) {
      const s = data.settings;
      // v28: legacy provider rows (openai/gemini/auto) are presented as gapgpt
      const legacy = s.provider !== "builtin";
      setForm({
        ...s,
        provider: legacy ? "gapgpt" : "builtin",
      } as AISettings);
    }
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        provider: form.provider,
        gapApiKey: form.gapApiKey ?? null,
        gapModel: form.gapModel,
        temperature: form.temperature,
        maxTokens: Math.round(form.maxTokens),
        systemPrompt: form.systemPrompt || null,
        // v29: chat-widget logo + per-template enable map
        aiWidgetLogo: form.aiWidgetLogo ?? null,
        templateAiLogos: form.templateAiLogos ?? null,
      };
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/ai", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(json.message ?? "تنظیمات ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const testAI = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const json = await apiFetch<{ success?: boolean; message?: string }>("/api/ai/test", { method: "POST" });
      if (json.success) toast.success(json.message ?? "اتصال موفق");
      else toast.error(json.message ?? "اتصال ناموفق");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تست ناموفق بود");
    } finally {
      setTesting(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  const set = <K extends keyof AISettings>(k: K, v: AISettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const keyMasked = (form.gapApiKey ?? "").includes("•");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Bot className="h-4 w-4 text-primary" />
              دستیار هوش مصنوعی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="ai-enabled"
              label="فعال‌سازی دستیار"
              desc="ویجت گفتگو با مشتری در فروشگاه"
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
            />
            <Field label="سرویس دهنده" hint="GapGPT یک درگاه فارسی با پرداخت ریالی است — به GPT، Claude و Gemini دسترسی می‌دهد">
              <Select value={form.provider} onValueChange={(v) => set("provider", v as "builtin" | "gapgpt")}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">سرویس داخلی (پیش‌فرض)</SelectItem>
                  <SelectItem value="gapgpt">GapGPT API (کلید اختصاصی)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="کلید GapGPT API"
              htmlFor="ai-gap-key"
              hint={
                form.hasGapKey
                  ? keyMasked
                    ? "کلید ذخیره شده — برای تغییر، مقدار جدید وارد کنید"
                    : "کلید جدید ذخیره می‌شود"
                  : "کلیدی ثبت نشده — خالی = بدون کلید"
              }
            >
              <div className="space-y-1.5">
                <Input id="ai-gap-key" dir="ltr" type="password" className="rounded-lg font-mono text-left" value={form.gapApiKey ?? ""}
                  onChange={(e) => set("gapApiKey", e.target.value)} placeholder="کلید GapGPT…" />
                <a
                  href="https://gapgpt.app/platform-v2/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden />
                  ساخت و مدیریت کلید API در پنل GapGPT ← gapgpt.app/platform-v2/tokens
                </a>
              </div>
            </Field>
            <Field
              label="مدل GapGPT"
              htmlFor="ai-gap-model"
              hint="اگر مدل واردشده در حساب موجود نباشد، سیستم خودکار بهترین مدل موجود را انتخاب می‌کند — فهرست واقعی مدل‌های حساب شما پایین همین فیلد است"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input id="ai-gap-model" dir="ltr" className="h-11 rounded-lg font-mono text-left text-[15px]" value={form.gapModel}
                    onChange={(e) => set("gapModel", e.target.value)} placeholder="gpt-4o" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-lg"
                    aria-label="دریافت مجدد فهرست مدل‌های GapGPT"
                    title="دریافت مجدد فهرست مدل‌های حساب"
                    onClick={() => refetchModels()}
                    disabled={modelsRefetching}
                  >
                    <RotateCw className={cn("h-4 w-4", (modelsLoading || modelsRefetching) && "animate-spin")} />
                  </Button>
                </div>
                {(modelsLoading || modelsRefetching) && (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> دریافت فهرست مدل‌های حساب…
                  </p>
                )}
                {modelsData?.gapgpt == null && !modelsLoading && !modelsRefetching && (form.hasGapKey || !!form.gapApiKey) && (
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    فهرست مدل‌های GapGPT در دسترس نیست — کلید را ذخیره و «تست اتصال» را بزنید تا دلیل واقعی مشخص شود (کلید نامعتبر / اعتبار / اتصال سرور).
                  </p>
                )}
                <ModelChips models={modelsData?.gapgpt ?? undefined} current={form.gapModel} onPick={(m) => set("gapModel", m)} />
              </div>
            </Field>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">میزان خلاقیت (Temperature)</Label>
                <span className="text-xs font-bold text-primary tabular-nums">{form.temperature.toLocaleString("fa-IR")}</span>
              </div>
              <Slider
                value={[form.temperature]}
                min={0}
                max={2}
                step={0.1}
                onValueChange={(v) => set("temperature", v[0] ?? 0.7)}
                aria-label="Temperature"
              />
              <p className="text-[10px] text-muted-foreground">۰ = دقیق و متمرکز — ۲ = خلاق و متنوع</p>
            </div>
            <Field label="حداکثر توکن پاسخ" htmlFor="ai-tokens">
              <Input id="ai-tokens" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={String(form.maxTokens)}
                onChange={(e) => set("maxTokens", Number(e.target.value.replace(/[^\d]/g, "")) || 2048)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              پرامپت سیستم و تست
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="پرامپت سیستم (System Prompt)" htmlFor="ai-prompt">
              <Textarea id="ai-prompt" rows={8} className="rounded-lg" value={form.systemPrompt ?? ""}
                onChange={(e) => set("systemPrompt", e.target.value)}
                placeholder="خالی = پرامپت پیش‌فرض سیستم" />
            </Field>
            <Button variant="outline" className="rounded-lg" onClick={testAI} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              تست اتصال
            </Button>
            {/* v22: the manual knowledge-scan button is GONE — product indexing
                is now fully automatic: every product create/update/patch/duplicate
                refreshes its searchText (name, brand, category, specs, colors,
                variants) on save, so the AI widget instantly knows new products. */}
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                دانش دستیار هوشمند — ایندکس خودکار
              </p>
              <p className="text-[11px] leading-6 text-muted-foreground">
                نیازی به اسکن دستی نیست: هر محصولی که ذخیره یا ویرایش کنید (نام، برند، دسته، مشخصات، رنگ‌ها و ترکیب‌های رنگ×مشخصه)
                بلافاصله در دانش دستیار ایندکس می‌شود و ویجت همان لحظه به سوالات قیمت و موجودی آن پاسخ می‌دهد.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* v29: AI chat-widget LOGO — upload any image and choose which
          storefront templates render it (FAB + panel header + empty state) */}
      <AiWidgetLogoCard form={form} set={set} />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات هوش مصنوعی
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════ v29 · AI widget logo card (AI tab) ═══════════════ */

/**
 * «لوگوی دستیار هوشمند» — the admin uploads ANY image as the chat-widget
 * face and picks which templates render it (the CURRENT ACTIVE template
 * is highlighted first in the list). No upload = each template's own
 * designed assistant art (unchanged v28 behavior).
 */
function AiWidgetLogoCard({
  form,
  set,
}: {
  form: AISettings;
  set: <K extends keyof AISettings>(k: K, v: AISettings[K]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  /* the per-template enable map (null = ALL templates enabled — v28 users
   * get "applies everywhere" semantics until they pick otherwise) */
  const map = useMemo(() => parseTemplateAiLogos(form.templateAiLogos) ?? {}, [form.templateAiLogos]);
  const enabledCount = form.aiWidgetLogo ? (form.templateAiLogos === null || form.templateAiLogos === undefined ? TEMPLATE_DEFS.length : Object.values(map).filter(Boolean).length) : 0;

  const toggleTemplate = (id: string) => {
    const next: Record<string, boolean> = {};
    for (const t of TEMPLATE_DEFS) next[t.id] = id === t.id ? !(map[id] !== false) : map[t.id] !== false;
    set("templateAiLogos", JSON.stringify(next));
  };

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <Bot className="h-4 w-4 text-primary" />
          لوگوی دستیار هوشمند (ویجت چت)
          {form.aiWidgetLogo && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              فعال — {enabledCount.toLocaleString("fa-IR")} قالب
            </span>
          )}
        </CardTitle>
        <GuideNote>
          تصویر دلخواه خود (مثلاً لوگوی فروشگاه یا چهرهٔ دستیار) را بارگذاری کنید تا به‌جای آواتار پیش‌فرضِ قالب‌ها، روی دکمهٔ شناور دستیار و داخل پنل چت نمایش داده شود. اگر تصویری بارگذاری نکنید، هر قالب از طرح دستیار خودش استفاده می‌کند (رفتار پیش‌فرض).
        </GuideNote>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="space-y-3">
          <ImageUpload
            label="تصویر لوگوی دستیار"
            folder="branding"
            height={120}
            value={form.aiWidgetLogo ?? null}
            onChange={(url) => set("aiWidgetLogo", url)}
          />
          {/* live widget FAB preview */}
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
            <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full gold-surface text-primary-foreground shadow-lg shadow-primary/30">
              {form.aiWidgetLogo ? (
                <img src={form.aiWidgetLogo} alt="پیش‌نمایش لوگوی دستیار" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold">پیش‌نمایش دکمهٔ شناور</p>
              <p className="text-[10px] leading-4 text-muted-foreground">
                {form.aiWidgetLogo
                  ? "تصویر شما روی دکمه و هدر پنل چت نمایش داده می‌شود"
                  : "بدون تصویر — طرح پیش‌فرض قالب فعال"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold">این لوگو روی کدام قالب‌ها نمایش داده شود؟</p>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2.5 text-[11px]" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "نمایش انتخاب‌شده‌ها ▲" : `نمایش همهٔ قالب‌ها (${TEMPLATE_DEFS.length.toLocaleString("fa-IR")}) ▼`}
            </Button>
          </div>
          <GuideNote>
            به‌صورت پیش‌فرض لوگو روی «همهٔ قالب‌ها» اعمال می‌شود. با کلیک روی هر قالب فقط انتخاب‌شده‌ها را فعال می‌کنید؛ قالب فعال فعلی اولین مورد است و با پررنگ نشان داده می‌شود. هر تغییری با «ذخیره تنظیمات هوش مصنوعی» ثبت می‌شود.
          </GuideNote>
          {/* the ACTIVE template chip first, then the rest (scrollable) */}
          <div className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-3", expanded ? "max-h-96 overflow-y-auto" : "")}>
            {TEMPLATE_DEFS.map((t) => {
              const on = map[t.id] !== false;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTemplate(t.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex min-h-9 items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                    on
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30",
                    !form.aiWidgetLogo && "opacity-50"
                  )}
                  title={on ? "فعال — کلیک برای غیرفعال کردن" : "غیرفعال — کلیک برای فعال کردن"}
                >
                  <span className="truncate">{t.nameFa}</span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", on ? "bg-primary" : "bg-border")} />
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ── SMTP (Email) tab ──
function SMTPTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<SMTPSettings>("/api/admin/settings/smtp", "admin-settings-smtp");
  const [form, setForm] = useState<SMTPSettings | null>(null);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  /* v27.1: visible "saved" confirmation state (banner) */
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    if (!form.host.trim()) return toast.error("SMTP Host الزامی است");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        enabled: form.enabled,
        host: form.host,
        port: form.port,
        security: form.security,
        username: form.username,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo ?? "",
      };
      // only send a password when the admin typed a new one — the stored
      // password is never returned to the browser and never re-sent
      if (pw.trim() !== "") payload.password = pw;
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/smtp", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(json.message ?? "تنظیمات ذخیره شد");
      setPw("");
      /* v27.1: refetch + explicit justSaved state — the admin SEES the saved
       * credentials (host/port/username + password-saved chip + save time)
       * instead of an empty password field that looked "not saved". */
      const fresh = await queryClient.fetchQuery({
        queryKey: ["admin-settings-smtp"],
        queryFn: () => apiFetch<{ settings: SMTPSettings }>("/api/admin/settings/smtp"),
      });
      if (fresh?.settings) setForm(fresh.settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 6000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (testing) return;
    setTesting(true);
    try {
      // test the current form values (unsaved) — password falls back to the stored one
      const payload: Record<string, unknown> = {
        host: form?.host ?? "",
        port: form?.port ?? 587,
        security: form?.security ?? "STARTTLS",
        username: form?.username ?? "",
        fromName: form?.fromName ?? "",
        fromEmail: form?.fromEmail ?? "",
      };
      if (pw.trim() !== "") payload.password = pw;
      const json = await apiFetch<{ success?: boolean; message?: string }>("/api/admin/settings/smtp-test", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (json.success) toast.success(json.message ?? "اتصال موفق");
      else toast.error(json.message ?? "اتصال ناموفق");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تست ناموفق بود");
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (sendingTest) return;
    if (!testTo.trim()) return toast.error("ایمیل مقصد را وارد کنید");
    setSendingTest(true);
    try {
      const json = await apiFetch<{ success?: boolean; message?: string }>("/api/admin/settings/smtp-test-email", {
        method: "POST",
        body: JSON.stringify({ to: testTo.trim() }),
      });
      toast.success(json.message ?? "ایمیل ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ارسال ناموفق بود");
    } finally {
      setSendingTest(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  const set = <K extends keyof SMTPSettings>(k: K, v: SMTPSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      {/* v27.1: persistent saved-credentials banner — makes the save state
         unmistakable (host/port/username + password chip + save time) */}
      {(justSaved || (form.hasPassword && form.host)) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {justSaved ? "تنظیمات ایمیل با موفقیت ذخیره شد" : "تنظیمات ذخیره‌شده"}
          </span>
          {form.host && (
            <span dir="ltr" className="font-mono font-bold">{form.host}:{form.port}</span>
          )}
          {form.username && (
            <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{form.username}</span>
          )}
          {form.hasPassword && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold">رمز عبور: ذخیره شده ✓</span>
          )}
          {form.enabled && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-bold text-primary">SMTP فعال</span>
          )}
          {form.updatedAt && (
            <span className="ms-auto text-[11px] text-muted-foreground">
              آخرین ذخیره: {new Date(form.updatedAt).toLocaleString("fa-IR")}
            </span>
          )}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Mail className="h-4 w-4 text-primary" />
              سرور ایمیل (SMTP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="smtp-enabled"
              label="فعال‌سازی SMTP"
              desc="ارسال ایمیل بازیابی رمز عبور و ایمیل‌های سیستمی"
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SMTP Host *" htmlFor="smtp-host" hint="مثال: smtp.gmail.com">
                <Input id="smtp-host" dir="ltr" className="rounded-lg font-mono text-left" value={form.host}
                  onChange={(e) => set("host", e.target.value)} placeholder="smtp.example.com" />
              </Field>
              <Field label="پورت *" htmlFor="smtp-port" hint="۵۸۷ (STARTTLS) یا ۴۶۵ (SSL/TLS)">
                <Input id="smtp-port" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={String(form.port)}
                  onChange={(e) => set("port", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} placeholder="587" />
              </Field>
            </div>
            <Field label="نوع امنیت" htmlFor="smtp-sec">
              <Select value={form.security} onValueChange={(v) => set("security", v as SMTPSettings["security"])}>
                <SelectTrigger id="smtp-sec" className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTTLS">STARTTLS (پورت ۵۸۷)</SelectItem>
                  <SelectItem value="SSL_TLS">SSL/TLS (پورت ۴۶۵)</SelectItem>
                  <SelectItem value="NONE">بدون رمزنگاری (غیرفعال)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="نام کاربری" htmlFor="smtp-user" hint="معمولاً ایمیل کامل حساب ایمیل">
              <Input id="smtp-user" dir="ltr" className="rounded-lg font-mono text-left" value={form.username}
                onChange={(e) => set("username", e.target.value)} placeholder="user@example.com" />
            </Field>
            <Field
              label="رمز عبور SMTP"
              htmlFor="smtp-pass"
              hint={
                form.hasPassword
                  ? "رمز ذخیره شده — برای تغییر، مقدار جدید وارد کنید (خالی = بدون تغییر)"
                  : "رمز عبور حساب ایمیل — به‌صورت رمزنگاری‌شده ذخیره می‌شود"
              }
            >
              <div className="flex items-center gap-2">
                {form.hasPassword && pw === "" && (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                    <CheckCircle2 className="h-4 w-4" />
                    ••••••••
                  </span>
                )}
                <Input id="smtp-pass" dir="ltr" type="password" className="rounded-lg font-mono text-left" value={pw}
                  onChange={(e) => setPw(e.target.value)} placeholder={form.hasPassword ? "رمز جدید (اختیاری)" : ""} />
              </div>
            </Field>
            <p className="rounded-lg bg-muted p-3 text-[11px] leading-6 text-muted-foreground">
              برای Gmail می‌توانید از <span dir="ltr" className="font-mono">smtp.gmail.com</span> استفاده کنید.
              در صورت فعال بودن احراز هویت دومرحله‌ای، معمولاً باید از App Password استفاده شود —
              رمز معمولی حساب گوگل کار نمی‌کند.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Send className="h-4 w-4 text-primary" />
              فرستنده و تست
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="نام فرستنده" htmlFor="smtp-fromname" hint="نامی که کنار ایمیل فرستنده نمایش داده می‌شود">
              <Input id="smtp-fromname" className="rounded-lg" value={form.fromName}
                onChange={(e) => set("fromName", e.target.value)} placeholder="تاج الکترونیکس" />
            </Field>
            <Field label="ایمیل فرستنده *" htmlFor="smtp-from" hint="نشانی‌ای که ایمیل‌ها از آن ارسال می‌شوند">
              <Input id="smtp-from" dir="ltr" className="rounded-lg font-mono text-left" value={form.fromEmail}
                onChange={(e) => set("fromEmail", e.target.value)} placeholder="no-reply@example.com" />
            </Field>
            <Field label="ایمیل پاسخ (Reply-To)" htmlFor="smtp-replyto" hint="پاسخ‌ها به این نشانی می‌رسد — خالی = فرستنده">
              <Input id="smtp-replyto" dir="ltr" className="rounded-lg font-mono text-left" value={form.replyTo ?? ""}
                onChange={(e) => set("replyTo", e.target.value)} placeholder="support@example.com" />
            </Field>
            <Button variant="outline" className="rounded-lg" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              تست اتصال SMTP
            </Button>
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="smtp-testto" className="text-xs">ارسال ایمیل آزمایشی به:</Label>
              <div className="flex gap-2">
                <Input id="smtp-testto" dir="ltr" type="email" className="rounded-lg font-mono text-left" value={testTo}
                  onChange={(e) => setTestTo(e.target.value)} placeholder="email@example.com" />
                <Button variant="outline" className="rounded-lg shrink-0" onClick={sendTestEmail} disabled={sendingTest}>
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ارسال
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">ایمیل آزمایشی با تنظیمات ذخیره‌شده ارسال می‌شود — ابتدا ذخیره کنید.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات ایمیل
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════  NEW TABS (Task 31-a) ═══════════════════════════

/** full StoreSettings row (existing base fields + branding/footer fields) */
interface StoreSettingsFull extends StoreSettings {
  footerLogo?: string | null;
  shortDescription?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  mobile?: string | null;
  workingHours?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  copyrightText?: string | null;
  /* v29: repair-page template + editable texts (raw JSON string column —
   * parsed into an editable object before PUT) + AI-widget logo fields. */
  maintenanceTemplate?: string | null;
  maintenanceContent?: string | null;
  aiWidgetLogo?: string | null;
  templateAiLogos?: string | null;
}

/** v29: parsed shape of the maintenanceContent JSON column (all optional —
 *  empty string = the designed default word renders). */
interface MaintenanceContentForm {
  titleSuffix: string;
  badge: string;
  description: string;
  phoneLabel: string;
  emailLabel: string;
  hoursLabel: string;
  trackingTitle: string;
  trackingDesc: string;
  trackingButton: string;
  footerNote: string;
  /* v30: caption above the countdown digits (countdown-eta template) */
  etaNote: string;
  /* v32 (13-d): repair-page logo override + countdown target ("" = default) */
  logoUrl: string;
  countdownDays: string;
  countdownHours: string;
}

/** parse the raw JSON string into an editable all-strings form */
function parseMaintenanceContentForm(raw: string | null | undefined): MaintenanceContentForm {
  const empty: MaintenanceContentForm = {
    titleSuffix: "", badge: "", description: "", phoneLabel: "", emailLabel: "",
    hoursLabel: "", trackingTitle: "", trackingDesc: "", trackingButton: "", footerNote: "",
    etaNote: "", logoUrl: "", countdownDays: "", countdownHours: "",
  };
  if (!raw?.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<MaintenanceContentForm>;
    return { ...empty, ...(parsed ?? {}) };
  } catch {
    return empty;
  }
}

interface FooterLinkRow {
  id: string;
  section: "CUSTOMER" | "STORE";
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** PUTs the complete store-settings object (endpoint replaces it as a whole) */
async function putStoreSettings(form: StoreSettingsFull): Promise<string> {
  /* v27b fix (pre-existing round-trip bug): the settings row's
   * tickerMessages is a raw JSON STRING column, but the PUT endpoint's zod
   * schema expects the PARSED array (the فروشگاه tab already builds it).
   * Branding/Footer tabs seed the form straight from the GET row — parse
   * the string once here so their save round-trips cleanly. */
  let ticker: unknown = null;
  if (typeof form.tickerMessages === "string" && form.tickerMessages.trim()) {
    try {
      const parsed = JSON.parse(form.tickerMessages);
      ticker = Array.isArray(parsed) ? parsed : null;
    } catch {
      ticker = null;
    }
  }
  /* v29: the maintenanceContent column is a JSON STRING on the row —
   * tabs seeded from the GET row hold the raw string; parse it back into
   * the object the PUT endpoint expects (same round-trip pattern as the
   * ticker fix above). */
  let maintenance: unknown = undefined;
  if (typeof form.maintenanceContent === "string" && form.maintenanceContent.trim()) {
    try {
      maintenance = JSON.parse(form.maintenanceContent);
    } catch {
      maintenance = null;
    }
  } else if (form.maintenanceContent && typeof form.maintenanceContent === "object") {
    maintenance = form.maintenanceContent;
  }

  const payload = {
    ...form,
    shippingFlat: Math.round(num(String(form.shippingFlat))),
    freeShippingOver: Math.round(num(String(form.freeShippingOver))),
    taxPercent: num(String(form.taxPercent)),
    minOrderAmount: Math.round(num(String(form.minOrderAmount))),
    tickerMessages: ticker,
    ...(maintenance !== undefined ? { maintenanceContent: maintenance } : {}),
  };
  const json = await apiFetch<{ message?: string }>("/api/admin/settings/store", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json.message ?? "تنظیمات ذخیره شد";
}

// ── Branding tab ──
function BrandingTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<StoreSettingsFull>("/api/admin/settings/store", "admin-settings-store");
  const [form, setForm] = useState<StoreSettingsFull | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    if (form.storeName.trim().length < 2) return toast.error("نام فروشگاه الزامی است");
    if (form.storeNameEn.trim().length < 2) return toast.error("نام انگلیسی فروشگاه الزامی است");
    setSaving(true);
    try {
      const message = await putStoreSettings(form);
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["admin-settings-store"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const set = <K extends keyof StoreSettingsFull>(k: K, v: StoreSettingsFull[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      {/* live preview */}
      <Card className="border-primary/25">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Store className="h-4 w-4 text-primary" />
            پیش‌نمایش زنده هویت برند
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            نتیجهٔ نام‌ها، لوگو و خط کپی‌رایت — قبل از ذخیره همین‌جا دیده می‌شود
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
            <Image
              src={form.logo || DEFAULT_LOGO}
              alt="پیش‌نمایش لوگو"
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 rounded-xl border bg-card object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black">{form.storeName || "نام فروشگاه"}</p>
              <p dir="ltr" className="truncate text-left font-sans text-xs font-semibold text-muted-foreground">
                {form.storeNameEn || "Store Name"}
              </p>
              {form.shortDescription?.trim() && (
                <p className="mt-1 line-clamp-2 max-w-lg text-[11px] leading-5 text-muted-foreground">
                  {form.shortDescription}
                </p>
              )}
            </div>
            <Button size="sm" className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
              مشاهده محصولات
            </Button>
          </div>
          <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
            خط کپی‌رایت: {renderCopyright(form.copyrightText || "", form.storeName || "نام فروشگاه")}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Palette className="h-4 w-4 text-primary" />
              نام‌ها و متن‌های برند
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="نام فروشگاه *" htmlFor="br-name">
              <Input id="br-name" className="rounded-lg" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="نام انگلیسی *" htmlFor="br-nameen">
              <Input id="br-nameen" dir="ltr" className="rounded-lg text-left" value={form.storeNameEn} onChange={(e) => set("storeNameEn", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="توضیح کوتاه برند" htmlFor="br-short" hint="زیر نام فروشگاه در فوتر و معرفی برند">
                <Textarea id="br-short" rows={2} className="rounded-lg" value={form.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} />
              </Field>
            </div>
            <Field label="عنوان مرورگر (متا تایتل)" htmlFor="br-metatitle" hint="در تب مرورگر و نتایج گوگل">
              <Input id="br-metatitle" className="rounded-lg" value={form.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value)} placeholder="تاج الکترونیکس | فروشگاه کالای دیجیتال" />
            </Field>
            <Field label="متن کپی‌رایت" htmlFor="br-copyright" hint="{year} و {storeName} به‌صورت خودکار جایگزین می‌شوند">
              <Input id="br-copyright" dir="ltr" className="rounded-lg text-left" value={form.copyrightText ?? ""} onChange={(e) => set("copyrightText", e.target.value)} placeholder="© {year} {storeName}. All rights reserved." />
            </Field>
            <div className="sm:col-span-2">
              <Field label="توضیحات متا (سئو)" htmlFor="br-metadesc" hint="حداکثر ~۱۶۰ کاراکتر برای نتایج جستجو">
                <Textarea id="br-metadesc" rows={3} className="rounded-lg" value={form.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              لوگوها و آیکون‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GuideNote>
              هر سه تصویر اختیاری‌اند؛ با «ذخیره برندینگ» اعمال می‌شوند و تا وقتی دوباره عوضشان نکنید همان‌ها می‌مانند. برای حذف هر تصویر، روی سطل زبالهٔ کنارش بزنید و ذخیره کنید.
            </GuideNote>
            <ImageUpload
              label="لوگوی اصلی (هدر)"
              folder="branding"
              height={110}
              value={form.logo}
              onChange={(url) => set("logo", url)}
            />
            <GuideNote>
              لوگوی اصلی در هدر فروشگاه، صفحه تعمیر و پنل‌ها نمایش داده می‌شود. بهترین نتیجه: تصویر مربعی با پس‌زمینه ساده (PNG / WebP).
            </GuideNote>
            <ImageUpload
              label="لوگوی فوتر (اختیاری — خالی = لوگوی اصلی)"
              folder="branding"
              height={100}
              value={form.footerLogo}
              onChange={(url) => set("footerLogo", url)}
            />
            <GuideNote>
              اگر اینجا تصویری بارگذاری کنید، فوتر فروشگاه (هم فوتر مشترک و هم فوتر قالب‌ها) از همین تصویر استفاده می‌کند؛ خالی بگذارید تا همان لوگوی اصلی در فوتر بیفتد.
            </GuideNote>
            <ImageUpload
              label="فاوآیکون (اختیاری)"
              folder="branding"
              height={90}
              value={form.favicon}
              onChange={(url) => set("favicon", url)}
            />
            <GuideNote>
              فاوآیکون آیکنِ تب مرورگر و بوکمارک‌هاست — بهتر است PNG مربعی ۴۸×۴۸ یا بزرگ‌تر (تا ۵۱۲) باشد. پس از ذخیره، صفحه را با Ctrl+F5 رفرش کنید تا مرورگر آیکن جدید را نشان دهد (مرورگرها فاوآیکون را کش می‌کنند).
            </GuideNote>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره برندینگ
        </Button>
      </div>
    </div>
  );
}

// ── Appearance / theme tab ──

/** preview-only swatches (hex approximations of each theme palette) */
const THEME_PREVIEW: Record<ThemeId, { primary: string; ink: string; paper: string }> = {
  gold: { primary: "#C98A1B", ink: "#1C1917", paper: "#FDFBF7" },
  emerald: { primary: "#0F8A6D", ink: "#0B1210", paper: "#F2F7F5" },
  crimson: { primary: "#D43A47", ink: "#1A1012", paper: "#FBF5F5" },
  electric: { primary: "#2E6BFF", ink: "#0D1220", paper: "#F4F6FC" },
  royal: { primary: "#8B46D9", ink: "#150F1D", paper: "#F7F4FB" },
  neutral: { primary: "#2A2A2A", ink: "#1B1B1B", paper: "#F7F7F7" },
};

const COLOR_MODES: { value: ColorMode; label: string; icon: typeof Sun; desc: string }[] = [
  { value: "light", label: "روشن", icon: Sun, desc: "پس‌زمینه روشن" },
  { value: "dark", label: "تاریک", icon: Moon, desc: "پس‌زمینه تیره" },
  { value: "system", label: "سیستم", icon: Monitor, desc: "مطابق دستگاه کاربر" },
];

function AppearanceTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-settings-theme"],
    queryFn: () => apiFetch<{ settings: { themeId: ThemeId; colorMode: ColorMode } }>("/api/admin/settings/theme"),
  });
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [mode, setMode] = useState<ColorMode | null>(null);
  const [saving, setSaving] = useState(false);
  /** v29.2: the static 6-card mockup was replaced by StoreLivePreview —
   *  the REAL active template + real catalog data — so no separate product
   *  fetch is needed here anymore. */
  /** after a successful save, cleanup must keep the saved values (not restore the pre-mount ones) */
  const savedRef = useRef<{ theme: string; dark: boolean } | null>(null);

  useEffect(() => {
    if (data?.settings && !theme) {
      setTheme(data.settings.themeId);
      setMode(data.settings.colorMode);
    }
  }, [data, theme]);

  // live preview — temporarily re-theme the whole page with the unsaved selection
  useEffect(() => {
    if (!theme || !mode) return;
    const root = document.documentElement;
    const prevTheme = root.dataset.theme;
    const prevDark = root.classList.contains("dark");
    const dark =
      mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = theme;
    root.classList.toggle("dark", dark);
    return () => {
      const restore = savedRef.current ?? { theme: prevTheme, dark: prevDark };
      if (restore.theme) root.dataset.theme = restore.theme;
      else delete root.dataset.theme;
      root.classList.toggle("dark", restore.dark);
    };
  }, [theme, mode]);

  const dirty =
    !!data?.settings && (data.settings.themeId !== theme || data.settings.colorMode !== mode);

  const save = async () => {
    if (!theme || !mode || saving) return;
    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/theme", {
        method: "PUT",
        body: JSON.stringify({ themeId: theme, colorMode: mode }),
      });
      savedRef.current = {
        theme,
        dark: mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
      };
      toast.success(json.message ?? "پوسته ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-theme"] });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات پوسته" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !theme || !mode) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Palette className="h-4 w-4 text-primary" />
            پوسته رنگی سایت
          </CardTitle>
          <p className="text-xs text-muted-foreground">۶ پوسته آماده — انتخاب شما روی کل فروشگاه اعمال می‌شود</p>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="انتخاب پوسته" className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {THEME_IDS.map((id) => {
              const meta = THEME_META[id];
              const sw = THEME_PREVIEW[id];
              const selected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(id)}
                  className={cn(
                    "relative rounded-xl border-2 p-3 text-right transition-all",
                    selected ? "border-primary shadow-sm" : "border-border hover:border-primary/40"
                  )}
                >
                  {selected && (
                    <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {/* mini storefront mockup (preview-only swatches) */}
                  <span className="block overflow-hidden rounded-lg border" style={{ background: sw.paper }}>
                    <span className="flex items-center justify-between px-2 py-1.5" style={{ background: sw.ink }}>
                      <span className="text-[8px] font-black" style={{ color: sw.primary }}>تاج</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: sw.primary }} />
                    </span>
                    <span className="block space-y-1.5 p-2">
                      <span className="block h-1.5 w-3/4 rounded-full" style={{ background: sw.primary, opacity: 0.85 }} />
                      <span className="block h-1.5 w-1/2 rounded-full bg-black/15" />
                      <span className="flex gap-1 pt-1">
                        <span className="block h-3.5 w-9 rounded-full" style={{ background: sw.primary }} />
                        <span className="block h-3.5 w-9 rounded-full border border-black/10 bg-white/70" />
                      </span>
                    </span>
                  </span>
                  <p className="mt-2 text-xs font-bold">{meta.fa}</p>
                  <p className="text-[10px] font-medium text-muted-foreground" dir="ltr">{meta.en}</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{meta.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Monitor className="h-4 w-4 text-primary" />
            حالت نمایش پیش‌فرض
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="حالت نمایش" className="grid grid-cols-3 gap-3">
            {COLOR_MODES.map((m) => {
              const selected = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all",
                    selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                  )}
                >
                  <m.icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-bold", selected && "text-primary")}>{m.label}</span>
                  <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 rounded-lg bg-muted p-2.5 text-[11px] leading-5 text-muted-foreground">
            بازدیدکننده‌ها می‌توانند حالت روشن/تاریک را شخصاً تغییر دهند؛ انتخاب شما پیش‌فرض سایت است.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Sun className="h-4 w-4 text-primary" />
            پیش‌نمایش زنده فروشگاه
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            قالب فعال فروشگاه با کارت‌ها و محصولات واقعی خودش — پوسته و حالتِ انتخابی (حتی ذخیره‌نشده) همین‌جا اعمال می‌شود
          </p>
        </CardHeader>
        <CardContent>
          {/* v29.2: REAL active-template preview — was a static mockup header +
              6 generic cards («فقط یه چیز رو نشون می‌ده»). Now the ACTUAL
              storefront template renders with the REAL catalog data (the same
              payload the home page renders), so the admin sees exactly the
              product cards, hero and shape visitors see — and the selected
              theme/mode applies live via [data-theme] + .dark. */}
          <StoreLivePreview theme={theme ?? "gold"} mode={mode ?? "light"} />
          <p className="mt-2 rounded-lg bg-muted p-2.5 text-[11px] leading-5 text-muted-foreground">
            قالب فعالِ فروشگاه به‌صورت زنده و با همان کارت‌های محصولش رندر می‌شود — تغییر قالب از بخش
            «ظاهر» و رنگ از همین تب؛ خروجی هر تغییر همان لحظه در این پیش‌نمایش دیده می‌شود.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        {dirty && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            تغییرات ذخیره‌نشده دارید
          </p>
        )}
        <Button onClick={save} disabled={saving} className="gold-surface mr-auto rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره پوسته سایت
        </Button>
      </div>
    </div>
  );
}

// ── Footer tab ──
function FooterTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useSetting<StoreSettingsFull>("/api/admin/settings/store", "admin-settings-store");
  const [form, setForm] = useState<StoreSettingsFull | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      const message = await putStoreSettings(form);
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["admin-settings-store"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  const set = <K extends keyof StoreSettingsFull>(k: K, v: StoreSettingsFull[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      {/* v29: footer tab quick guide — «write a guide for every option» */}
      <GuideNote className="bg-primary/5">
        فوتر از سه لایه ساخته می‌شود: ۱) <b>قالب فعال</b> (کارت اول — تنظیمات اختصاصی همین قالب) ۲) <b>تنظیمات سراسری</b> (متن معرفی، کپی‌رایت، تماس و شبکه‌ها — پیش‌فرض همهٔ قالب‌ها) ۳) <b>لینک‌های سراسری</b> (ستون‌های مشتریان/فروشگاه). هرچه در لایهٔ بالاتر خالی باشد از لایهٔ پایین خوانده می‌شود؛ خالی بگذارید = پیش‌فرض.
      </GuideNote>
      {/* v27b: template-scoped footer content — the ACTIVE template's own
          footer (text/copyright/link columns) sits ABOVE the global card */}
      <TemplateFooterCard />

      <div className="flex items-center gap-3 pt-1">
        <h3 className="shrink-0 text-sm font-black">تنظیمات سراسری (پیش‌فرض همه قالب‌ها)</h3>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Link2 className="h-4 w-4 text-primary" />
              توضیحات فوتر و کپی‌رایت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="متن معرفی فوتر *" htmlFor="ft-text" hint="زیر لوگوی فوتر نمایش داده می‌شود">
              <Textarea id="ft-text" rows={3} className="rounded-lg" value={form.footerText} onChange={(e) => set("footerText", e.target.value)} />
            </Field>
            <Field label="متن کپی‌رایت" htmlFor="ft-copyright" hint="{year} و {storeName} به‌صورت خودکار جایگزین می‌شوند">
              <Input id="ft-copyright" dir="ltr" className="rounded-lg text-left" value={form.copyrightText ?? ""} onChange={(e) => set("copyrightText", e.target.value)} placeholder="© {year} {storeName}" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Store className="h-4 w-4 text-primary" />
              اطلاعات تماس فوتر
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="تلفن ثابت *" htmlFor="ft-phone">
              <Input id="ft-phone" dir="ltr" className="rounded-lg text-left" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="موبایل" htmlFor="ft-mobile">
              <Input id="ft-mobile" dir="ltr" className="rounded-lg text-left" value={form.mobile ?? ""} onChange={(e) => set("mobile", e.target.value)} placeholder="0912…" />
            </Field>
            <Field label="ایمیل *" htmlFor="ft-email">
              <Input id="ft-email" dir="ltr" className="rounded-lg text-left" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="ساعات کاری" htmlFor="ft-hours">
              <Input id="ft-hours" className="rounded-lg" value={form.workingHours ?? ""} onChange={(e) => set("workingHours", e.target.value)} placeholder="شنبه تا پنجشنبه، ۹ صبح تا ۱۸" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="آدرس *" htmlFor="ft-address">
                <Textarea id="ft-address" rows={2} className="rounded-lg" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" />
            شبکه‌های اجتماعی
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            تنها شبکه‌هایی که آدرس دارند در فوتر سایت نمایش داده می‌شوند — خالی = مخفی
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="اینستاگرام" htmlFor="ft-ig">
            <Input id="ft-ig" dir="ltr" className="rounded-lg text-left" value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/taj…" />
          </Field>
          <Field label="تلگرام" htmlFor="ft-tg">
            <Input id="ft-tg" dir="ltr" className="rounded-lg text-left" value={form.telegram ?? ""} onChange={(e) => set("telegram", e.target.value)} placeholder="https://t.me/taj…" />
          </Field>
          <Field label="واتس‌اپ" htmlFor="ft-wa">
            <Input id="ft-wa" dir="ltr" className="rounded-lg text-left" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="https://wa.me/98912…" />
          </Field>
          <Field label="یوتیوب" htmlFor="ft-yt">
            <Input id="ft-yt" dir="ltr" className="rounded-lg text-left" value={form.youtube ?? ""} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/@taj…" />
          </Field>
          <Field label="توییتر / X" htmlFor="ft-tw">
            <Input id="ft-tw" dir="ltr" className="rounded-lg text-left" value={form.twitter ?? ""} onChange={(e) => set("twitter", e.target.value)} placeholder="https://x.com/taj…" />
          </Field>
          <Field label="لینکدین" htmlFor="ft-in">
            <Input id="ft-in" dir="ltr" className="rounded-lg text-left" value={form.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/company/taj…" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات فوتر
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Link2 className="h-4 w-4 text-primary" />
            لینک‌های فوتر
          </CardTitle>
          <GuideNote>
            ستون‌های «خدمات مشتریان» و «فروشگاه» — فقط لینک‌های فعال نمایش داده می‌شوند. این ستون‌ها وقتی ظاهر می‌شوند که قالب فعال لینک اختصاصی خودش را نداشته باشد (کارت اول)؛ ترتیب نمایش با «چیدمان» تنظیم می‌شود (عدد کمتر = بالاتر).
          </GuideNote>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <FooterLinksSection section="CUSTOMER" title="خدمات مشتریان" />
          <FooterLinksSection section="STORE" title="فروشگاه" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Footer links CRUD (one column) ──
function FooterLinksSection({ section, title }: { section: "CUSTOMER" | "STORE"; title: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "footer-links"],
    queryFn: () => apiFetch<{ links: FooterLinkRow[] }>("/api/admin/footer-links"),
  });
  const links = (data?.links ?? [])
    .filter((l) => l.section === section)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "", sortOrder: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", url: "", sortOrder: "0" });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "footer-links"] });

  const add = async () => {
    if (busy) return;
    if (addForm.label.trim().length < 1) return toast.error("عنوان لینک الزامی است");
    if (addForm.url.trim().length < 1) return toast.error("آدرس لینک الزامی است");
    setBusy(true);
    try {
      await apiFetch("/api/admin/footer-links", {
        method: "POST",
        body: JSON.stringify({
          section,
          label: addForm.label.trim(),
          url: addForm.url.trim(),
          sortOrder: Number(addForm.sortOrder.replace(/[^\d]/g, "")) || 0,
          isActive: true,
        }),
      });
      toast.success("لینک اضافه شد");
      setAddForm({ label: "", url: "", sortOrder: "0" });
      setAddOpen(false);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/footer-links/${id}`, { method: "PUT", body: JSON.stringify(patch) });
      toast.success("لینک به‌روزرسانی شد");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/footer-links/${id}`, { method: "DELETE" });
      toast.success("لینک حذف شد");
      setConfirmId(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{title}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-lg px-2 text-[11px]"
          onClick={() => setAddOpen((o) => !o)}
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن
        </Button>
      </div>

      {addOpen && (
        <div className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-8 min-w-32 flex-1 rounded-lg text-xs"
              placeholder="عنوان (مثلاً پیگیری سفارش)"
              value={addForm.label}
              onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Input
              dir="ltr"
              className="h-8 min-w-40 flex-1 rounded-lg text-left text-xs font-mono"
              placeholder="/track یا https://…"
              value={addForm.url}
              onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
            />
            <Input
              dir="ltr"
              inputMode="numeric"
              className="h-8 w-20 rounded-lg text-left text-xs tabular-nums"
              placeholder="۰"
              value={addForm.sortOrder}
              onChange={(e) => setAddForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))}
              aria-label="ترتیب"
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" className="h-7 rounded-lg" onClick={() => setAddOpen(false)} disabled={busy}>
              انصراف
            </Button>
            <Button size="sm" className="h-7 rounded-lg gold-surface text-primary-foreground hover:opacity-90" onClick={add} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              افزودن لینک
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : links.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-[11px] text-muted-foreground">
          لینکی در این ستون ثبت نشده است
        </p>
      ) : (
        <div className="space-y-1.5">
          {links.map((l) => {
            if (editingId === l.id) {
              return (
                <div key={l.id} className="space-y-2 rounded-lg border border-primary/40 p-2.5">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="h-8 min-w-32 flex-1 rounded-lg text-xs"
                      value={editForm.label}
                      onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                      aria-label="عنوان لینک"
                    />
                    <Input
                      dir="ltr"
                      className="h-8 min-w-40 flex-1 rounded-lg text-left text-xs font-mono"
                      value={editForm.url}
                      onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                      aria-label="آدرس لینک"
                    />
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      className="h-8 w-20 rounded-lg text-left text-xs tabular-nums"
                      value={editForm.sortOrder}
                      onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))}
                      aria-label="ترتیب"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 rounded-lg" onClick={() => setEditingId(null)} disabled={busy}>
                      <X className="h-3.5 w-3.5" />
                      انصراف
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 rounded-lg gold-surface text-primary-foreground hover:opacity-90"
                      disabled={busy}
                      onClick={() => {
                        if (editForm.label.trim().length < 1) return toast.error("عنوان الزامی است");
                        if (editForm.url.trim().length < 1) return toast.error("آدرس الزامی است");
                        update(l.id, {
                          label: editForm.label.trim(),
                          url: editForm.url.trim(),
                          sortOrder: Number(editForm.sortOrder.replace(/[^\d]/g, "")) || 0,
                        }).then(() => setEditingId(null));
                      }}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      ذخیره
                    </Button>
                  </div>
                </div>
              );
            }
            if (confirmId === l.id) {
              return (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5">
                  <p className="text-xs font-bold text-destructive">حذف «{l.label}»؟</p>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 rounded-lg" onClick={() => setConfirmId(null)} disabled={busy}>
                      انصراف
                    </Button>
                    <Button variant="destructive" size="sm" className="h-7 rounded-lg" onClick={() => remove(l.id)} disabled={busy}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      حذف
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
                <p className={cn("text-xs font-bold", !l.isActive && "text-muted-foreground line-through")}>{l.label}</p>
                <p dir="ltr" className="min-w-0 flex-1 truncate text-left font-mono text-[11px] text-muted-foreground" title={l.url}>
                  {l.url}
                </p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                  ترتیب {l.sortOrder.toLocaleString("fa-IR")}
                </span>
                <Switch
                  checked={l.isActive}
                  onCheckedChange={(v) => update(l.id, { isActive: v })}
                  disabled={busy}
                  aria-label={`فعال بودن ${l.label}`}
                />
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    aria-label="ویرایش لینک"
                    onClick={() => {
                      setEditingId(l.id);
                      setConfirmId(null);
                      setEditForm({ label: l.label, url: l.url, sortOrder: String(l.sortOrder) });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="حذف لینک"
                    onClick={() => setConfirmId(l.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── v27b: per-template footer content (template-scoped editor) ──

/** one editable custom link row of a template's footer */
interface TplLinkRow {
  label: string;
  url: string;
}

interface TplFooterResp {
  active: string;
  templates: { id: string; nameFa: string }[];
  footers: Record<string, { footerText?: string; copyrightText?: string; customerLinks?: { label: string; url: string }[]; storeLinks?: { label: string; url: string }[] }>;
  defaults: { footerText: string | null; copyrightText: string | null };
}

/** one saved template footer entry (server shape of data.footers[id]) */
type TplFooterEntry = NonNullable<TplFooterResp["footers"][string]>;

/** v27b: «تنظیمات فوتر قالب فعال» — each template owns its footer content.
 *  The selection ALWAYS initializes from the ACTIVE template (when the
 *  admin applies another template in ظاهر, this card follows it); any of
 *  the 25 templates can still be edited ahead of time. Empty field = the
 *  global value from «تنظیمات سراسری» below.
 *  State model (no setState-in-effect): the selection is DERIVED — a manual
 *  pick is scoped to the active id it was made under, so a changed active
 *  template naturally overrides it; the editable form is a draft keyed by
 *  template + saved-seed identity, so it re-seeds from the server whenever
 *  the selection, the saved map or a refetch changes (also what makes a
 *  page reload persist). */
function TemplateFooterCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "template-footers"],
    queryFn: () => apiFetch<TplFooterResp>("/api/admin/template-footers"),
  });

  /* selection follows the ACTIVE template: a manual selection only survives
   * while the active id it was recorded under is still the active one. */
  const [manual, setManual] = useState<{ active: string; tpl: string } | null>(null);
  const selected = manual && data && manual.active === data.active ? manual.tpl : (data?.active ?? null);
  const onSelect = (tpl: string) => {
    setManual(data?.active ? { active: data.active, tpl } : null);
  };

  /* editable draft — expired (re-seeded from the server) whenever the
   * template or the saved entry object changes */
  const seed: TplFooterEntry | undefined = data && selected ? data.footers[selected] : undefined;
  type Draft = {
    for: string;
    seed: TplFooterEntry | undefined;
    footerText: string;
    copyrightText: string;
    customerRows: TplLinkRow[];
    storeRows: TplLinkRow[];
    confirmReset: boolean;
  };
  const [draft, setDraft] = useState<Draft | null>(null);
  const live = draft && draft.for === selected && draft.seed === seed ? draft : null;
  const footerText = live ? live.footerText : (seed?.footerText ?? "");
  const copyrightText = live ? live.copyrightText : (seed?.copyrightText ?? "");
  const customerRows = live ? live.customerRows : (seed?.customerLinks ?? []).map((l) => ({ label: l.label, url: l.url }));
  const storeRows = live ? live.storeRows : (seed?.storeLinks ?? []).map((l) => ({ label: l.label, url: l.url }));
  const confirmReset = live?.confirmReset ?? false;
  const patchDraft = (p: Partial<Draft>) =>
    setDraft({ for: selected ?? "", seed, footerText, copyrightText, customerRows, storeRows, confirmReset, ...p });
  const setFooterText = (v: string) => patchDraft({ footerText: v });
  const setCopyrightText = (v: string) => patchDraft({ copyrightText: v });
  const setCustomerRows = (rows: TplLinkRow[]) => patchDraft({ customerRows: rows });
  const setStoreRows = (rows: TplLinkRow[]) => patchDraft({ storeRows: rows });

  const save = useMutation({
    mutationFn: (payload: { footerText: string; copyrightText: string; customerLinks: TplLinkRow[]; storeLinks: TplLinkRow[] }) =>
      apiFetch<{ message?: string }>("/api/admin/template-footers", {
        method: "PUT",
        body: JSON.stringify({ templateId: selected, ...payload }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "تنظیمات فوتر قالب ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "template-footers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  const validate = () => {
    const columns: [string, TplLinkRow[]][] = [
      ["ستون مشتریان", customerRows],
      ["ستون فروشگاه", storeRows],
    ];
    for (const [name, rows] of columns) {
      for (const r of rows) {
        if (!r.label.trim()) return `${name}: عنوان لینک الزامی است`;
        if (!/^(\/|https?:\/\/)/i.test(r.url.trim())) return `${name}: آدرس لینک باید با / یا http شروع شود`;
      }
    }
    return null;
  };

  const submit = () => {
    if (!selected || save.isPending) return;
    const bad = validate();
    if (bad) return toast.error(bad);
    save.mutate({ footerText: footerText.trim(), copyrightText: copyrightText.trim(), customerLinks: customerRows, storeLinks: storeRows });
  };

  const activeDef = data?.templates.find((t) => t.id === data.active);
  const selectedDef = data?.templates.find((t) => t.id === selected);

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          تنظیمات فوتر قالب فعال
          {data && activeDef && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              قالب فعال: {activeDef.nameFa} | {data.active}
            </span>
          )}
        </CardTitle>
        <GuideNote>
          هر قالب فوتر اختصاصی خودش را دارد. قانون ساده: <b>هر فیلدی را خالی بگذارید، مقدار «تنظیمات سراسری» پایین همین تب به‌جای آن نمایش داده می‌شود</b> — پس برای استفاده از پیش‌فرض‌ها نیازی به تکرار متن‌ها نیست. با «بازنشانی این قالب» همهٔ فیلدهای همین قالب خالی و پیش‌فرض سراسری برمی‌گردد.
        </GuideNote>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <EmptyState title="خطا در دریافت تنظیمات فوتر قالب‌ها" desc={error instanceof Error ? error.message : undefined} />
        ) : isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <>
            <Field label="ویرایش فوتر کدام قالب؟" htmlFor="tf-template" hint="به‌صورت پیش‌فرض قالب فعال انتخاب می‌شود؛ با عوض کردن قالب فعال در بخش «ظاهر و پوسته»، همین انتخاب هم دنبال می‌کند.">
              <Select value={selected ?? ""} onValueChange={onSelect}>
                <SelectTrigger id="tf-template" className="h-11 rounded-lg">
                  <SelectValue placeholder="انتخاب قالب" />
                </SelectTrigger>
                <SelectContent>
                  {data.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nameFa} | {t.id}
                      {t.id === data.active ? " — فعال" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selected && selected !== data.active && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-medium text-amber-600">
                این قالب فعلاً فعال نیست — تغییرات ذخیره می‌شود و وقتی این قالب را در «ظاهر و پوسته» فعال کنید، همین فوتر نمایش داده می‌شود.
              </p>
            )}

            <Field
              label="متن معرفی فوتر این قالب"
              htmlFor="tf-text"
              hint={data.defaults.footerText ? `پیش‌فرض سراسری: ${data.defaults.footerText}` : undefined}
            >
              <Textarea
                id="tf-text"
                rows={3}
                className="rounded-lg"
                placeholder={data.defaults.footerText ?? "متن معرفی این قالب در فوتر…"}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
              />
            </Field>

            <Field
              label="متن کپی‌رایت این قالب"
              htmlFor="tf-copyright"
              hint="{year} و {storeName} به‌صورت خودکار جایگزین می‌شوند"
            >
              <Input
                id="tf-copyright"
                dir="ltr"
                className="h-11 rounded-lg text-left"
                placeholder={data.defaults.copyrightText ?? "© {year} {storeName}"}
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
              />
            </Field>

            <div className="grid gap-6 lg:grid-cols-2">
              <TemplateFooterLinksEditor title="لینک‌های فوتر این قالب — ستون مشتریان" rows={customerRows} onChange={setCustomerRows} />
              <TemplateFooterLinksEditor title="لینک‌های فوتر این قالب — ستون فروشگاه" rows={storeRows} onChange={setStoreRows} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {selectedDef ? `${selectedDef.nameFa} | ${selectedDef.id}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={confirmReset ? "destructive" : "outline"}
                  className="h-11 rounded-lg"
                  disabled={save.isPending || !selected}
                  onClick={() => {
                    if (!selected) return;
                    if (!confirmReset) return patchDraft({ confirmReset: true });
                    patchDraft({ confirmReset: false });
                    save.mutate({ footerText: "", copyrightText: "", customerLinks: [], storeLinks: [] });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  {confirmReset ? "تأیید بازنشانی به سراسری؟" : "بازنشانی این قالب"}
                </Button>
                <Button
                  type="button"
                  className="gold-surface h-11 rounded-lg text-primary-foreground hover:opacity-90"
                  onClick={submit}
                  disabled={save.isPending || !selected}
                >
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ذخیره فوتر این قالب
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** v27b: editable {label,url} rows for ONE template footer column (max 12) */
function TemplateFooterLinksEditor({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: TplLinkRow[];
  onChange: (rows: TplLinkRow[]) => void;
}) {
  const setRow = (i: number, patch: Partial<TplLinkRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => {
    if (rows.length >= 12) return toast.error("حداکثر ۱۲ لینک در هر ستون");
    onChange([...rows, { label: "", url: "" }]);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {rows.length.toLocaleString("fa-IR")} لینک
          </span>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2.5 text-[11px]" onClick={add}>
            <Plus className="h-3.5 w-3.5" />
            افزودن لینک
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3 text-center text-[11px] leading-5 text-muted-foreground">
          <p className="font-bold text-foreground/80">لینکی برای این قالب ثبت نشده</p>
          <p>این بخش را خالی بگذارید تا ستون سراسری (پایین همین تب) نمایش داده شود؛ یا با «افزودن لینک» لینک‌های اختصاصی همین قالب را بسازید.</p>
          <p className="text-[10px]">راهنما: عنوان = متنی که مشتری می‌بیند (مثلاً «رهگیری سفارش») — آدرس = مقصد لینک (داخلی مثل /track-order یا کامل مثل https://…)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <Input
                className="h-11 min-w-36 flex-1 rounded-lg"
                placeholder="مثلاً: رهگیری سفارش"
                value={r.label}
                onChange={(e) => setRow(i, { label: e.target.value })}
                aria-label={`عنوان لینک ${(i + 1).toLocaleString("fa-IR")}`}
              />
              <Input
                dir="ltr"
                className="h-11 min-w-44 flex-1 rounded-lg text-left font-mono text-xs"
                placeholder="مثلاً: /track-order"
                value={r.url}
                onChange={(e) => setRow(i, { url: e.target.value })}
                aria-label={`آدرس لینک ${(i + 1).toLocaleString("fa-IR")}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
                aria-label="حذف لینک"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* v29: the settings tabs persist in the URL (?tab=…) — refreshing the
 * browser while editing «برندینگ» no longer dumps you back on «فروشگاه».
 * The value is read once on mount (client-only) and pushed with
 * history.replaceState (no navigation, no re-render churn).
 * v29.2: added the «به‌روزرسانی» tab — the Update Script panel (the
 * owner's «یه دونه هم گزینه اضافه کنیم به اسم Update Script»). */
const SETTINGS_TABS = ["store", "maintenance", "branding", "appearance", "footer", "payment", "ai", "smtp", "telegram", "update"] as const;
type SettingsTabId = (typeof SETTINGS_TABS)[number];

function useSettingsTab(): [SettingsTabId, (v: string) => void] {
  const [tab, setTab] = useState<SettingsTabId>(() => {
    if (typeof window === "undefined") return "store";
    try {
      const q = new URLSearchParams(window.location.search).get("tab");
      return (SETTINGS_TABS as readonly string[]).includes(q ?? "") ? (q as SettingsTabId) : "store";
    } catch {
      return "store";
    }
  });
  const onTab = (v: string) => {
    setTab((SETTINGS_TABS as readonly string[]).includes(v) ? (v as SettingsTabId) : "store");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", v);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* private mode — tab state simply won't persist */
    }
  };
  return [tab, onTab];
}

export default function AdminSettingsPage() {
  const [tab, onTab] = useSettingsTab();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="تنظیمات"
        desc="فروشگاه، حالت تعمیر، برندینگ، پوسته، فوتر، درگاه‌های پرداخت، دستیار هوش مصنوعی، ایمیل و به‌روزرسانی اسکریپت"
      />
      <Tabs value={tab} onValueChange={onTab}>
        <TabsList className="h-auto flex-wrap justify-start rounded-lg">
          <TabsTrigger value="store" className="rounded-lg">فروشگاه</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-lg">حالت تعمیر</TabsTrigger>
          <TabsTrigger value="branding" className="rounded-lg">برندینگ</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">ظاهر و پوسته</TabsTrigger>
          <TabsTrigger value="footer" className="rounded-lg">فوتر</TabsTrigger>
          <TabsTrigger value="payment" className="rounded-lg">درگاه‌های پرداخت</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg">هوش مصنوعی</TabsTrigger>
          <TabsTrigger value="smtp" className="rounded-lg">ایمیل و SMTP</TabsTrigger>
          {/* v33 (2-c): Telegram store bot — token, admin chat ids, welcome text,
              enable + connection test + live status. */}
          <TabsTrigger value="telegram" className="rounded-lg">ربات تلگرامی</TabsTrigger>
          <TabsTrigger value="update" className="rounded-lg">به‌روزرسانی اسکریپت</TabsTrigger>
        </TabsList>
        <TabsContent value="store" className="mt-4"><StoreTab /></TabsContent>
        <TabsContent value="maintenance" className="mt-4"><MaintenanceTab /></TabsContent>
        <TabsContent value="branding" className="mt-4"><BrandingTab /></TabsContent>
        <TabsContent value="appearance" className="mt-4"><AppearanceTab /></TabsContent>
        <TabsContent value="footer" className="mt-4"><FooterTab /></TabsContent>
        <TabsContent value="payment" className="mt-4"><PaymentTab /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AITab /></TabsContent>
        <TabsContent value="smtp" className="mt-4"><SMTPTab /></TabsContent>
        <TabsContent value="telegram" className="mt-4"><TelegramBotTab /></TabsContent>
        {/* v29.2: Update Script — check for a new version, download + apply
            it (code-only; data/db/uploads never touched). Self-contained
            panel from @/components/admin/update-panel. */}
        <TabsContent value="update" className="mt-4"><UpdatePanel /></TabsContent>
      </Tabs>
    </div>
  );
}

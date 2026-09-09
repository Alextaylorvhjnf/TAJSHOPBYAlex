"use client";

/**
 * v32 · TEMPLATE CONTENT EDITOR 2.0 (Admin → محتوای قالب‌ها)
 * ---------------------------------------------------------------------------
 * Per-template dedicated content: slides / showcases / texts / links / brand.
 * MOVED here from the appearance page and upgraded:
 *
 *  • inputs are PRE-FILLED with the EFFECTIVE values — stored override →
 *    the template's DESIGNED defaults (DEFAULT_TEMPLATE_CONTENT) → the
 *    global entities (live slides/showcases/brand via /templates/preview);
 *    the editor is NEVER empty again.
 *  • every non-overridden field/row carries a small «پیش‌فرض» chip; Persian
 *    labels + where-used hints explain WHERE each item appears.
 *  • per-slide upgrades: optional COUNTDOWN (checkbox + datetime + label —
 *    the storefront renders a ticking روز/ساعت/دقیقه/ثانیه chip) and optional
 *    VIDEO (MP4/WebM/MOV ≤100MB → muted autoplay loop, image = poster).
 *  • each slide row shows a MINI LIVE PREVIEW (image/video + title/subtitle +
 *    the ticking countdown chip).
 *  • saving persists the full object; «بازنشانی به مقادیر پیش‌فرض» clears the
 *    row so designed defaults + global fallbacks apply again. The storefront
 *    pipeline itself is unchanged (template non-empty wins, empty falls back).
 */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Film, Images, Info, LayoutGrid, Link2, Loader2, MapPin,
  Plus, RotateCcw, Save, Sparkles, Timer, Trash2, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import { SlideCountdown } from "@/components/store/templates/slide-media";
import type { TemplateContentData, TemplateSlide } from "@/lib/templates/content";
import {
  getTemplateContentHints,
  getTemplateDefaultContent,
  getTemplateTextMeta,
} from "@/lib/templates/content";
import type { HomeData } from "@/lib/templates/types";

// ────────────────────────── editor state shapes ──────────────────────────
// All-string mirrors of TemplateContentData — empty string = «not set».

type EditableSlide = {
  image: string;
  title: string;
  subtitle: string;
  link: string;
  /* v32 countdown (datetime-local string in the input, ISO on save) */
  countdownEnabled: boolean;
  countdownTarget: string;
  countdownLabel: string;
  /* v32 slide video url */
  videoUrl: string;
};
type EditableShowcase = { image: string; title: string; link: string };
type EditableText = {
  key: string;
  value: string;
  /** Persian label from TEMPLATE_TEXT_META (key itself when unknown) */
  label: string;
  /** where this value shows up on the storefront */
  where?: string;
  /** image-valued keys (arenaImage, gearImage, …) get an upload tile */
  isImage: boolean;
};
type EditableLink = { label: string; url: string };
type EditableBrand = { name: string; tagline: string; logoImage: string };

type EditorState = {
  slides: EditableSlide[];
  showcases: EditableShowcase[];
  texts: EditableText[];
  links: EditableLink[];
  brand: EditableBrand;
};

const VIDEO_MAX = 100 * 1024 * 1024; // 100MB — slider hero videos

/** datetime-local value → ISO (null when empty/unparsable) */
function localToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → datetime-local input value ("" when unparsable) */
function isoToLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** stored/designed TemplateSlide → editable row */
function slideToEditable(s: TemplateSlide): EditableSlide {
  return {
    image: s.image ?? "",
    title: s.title ?? "",
    subtitle: s.subtitle ?? "",
    link: s.link ?? "",
    countdownEnabled: !!s.countdownEnabled,
    countdownTarget: isoToLocal(s.countdownTarget),
    countdownLabel: s.countdownLabel ?? "",
    videoUrl: s.videoUrl ?? "",
  };
}

/** a GLOBAL slide entity (HomeData shape) → editable row (no countdown/video) */
function globalSlideToEditable(g: HomeData["slides"][number]): EditableSlide {
  return {
    image: g.image ?? "",
    title: g.title ?? "",
    subtitle: g.subtitle ?? "",
    link: g.ctaUrl ?? "",
    countdownEnabled: false,
    countdownTarget: "",
    countdownLabel: "",
    videoUrl: "",
  };
}

function globalShowcaseToEditable(g: HomeData["showcases"][number]): EditableShowcase {
  return { image: g.image ?? "", title: g.title ?? "", link: g.buttonUrl ?? "" };
}

/** key looks like an image field (arenaImage, gearImage, heroImage…) */
function isImageKey(key: string): boolean {
  return /(^|_)(image|logo|art|banner)$/i.test(key);
}

/** editor state → the clean API payload (empty strings dropped everywhere) */
function toContentData(state: EditorState): TemplateContentData {
  const out: TemplateContentData = {};
  const slides = state.slides
    .filter((s) => s.image.trim())
    .map((s) => {
      const iso = s.countdownEnabled ? localToIso(s.countdownTarget) : null;
      return {
        image: s.image.trim(),
        ...(s.title.trim() ? { title: s.title.trim() } : {}),
        ...(s.subtitle.trim() ? { subtitle: s.subtitle.trim() } : {}),
        ...(s.link.trim() ? { link: s.link.trim() } : {}),
        ...(s.videoUrl.trim() ? { videoUrl: s.videoUrl.trim() } : {}),
        ...(iso
          ? {
              countdownEnabled: true,
              countdownTarget: iso,
              ...(s.countdownLabel.trim() ? { countdownLabel: s.countdownLabel.trim() } : {}),
            }
          : {}),
      };
    });
  if (slides.length > 0) out.slides = slides;
  const showcases = state.showcases
    .map((s) => ({ image: s.image.trim(), title: s.title.trim(), link: s.link.trim() }))
    .filter((s) => s.image);
  if (showcases.length > 0) {
    out.showcases = showcases.map((s) => ({
      image: s.image,
      ...(s.title ? { title: s.title } : {}),
      ...(s.link ? { link: s.link } : {}),
    }));
  }
  const texts: Record<string, string> = {};
  for (const t of state.texts) {
    const k = t.key.trim();
    const v = t.value.trim();
    if (k && v) texts[k] = v;
  }
  if (Object.keys(texts).length > 0) out.texts = texts;
  const links = state.links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label && l.url);
  if (links.length > 0) out.links = links;
  const brand: NonNullable<TemplateContentData["brand"]> = {};
  if (state.brand.name.trim()) brand.name = state.brand.name.trim();
  if (state.brand.tagline.trim()) brand.tagline = state.brand.tagline.trim();
  if (state.brand.logoImage.trim()) brand.logoImage = state.brand.logoImage.trim();
  if (Object.keys(brand).length > 0) out.brand = brand;
  return out;
}

// ────────────────────────── small building blocks ──────────────────────────

/** the «پیش‌فرض» chip — this value still equals its designed/global default */
function DefaultChip() {
  return (
    <span className="shrink-0 rounded-full border border-dashed bg-muted/60 px-2 py-0.5 text-[9px] font-black text-muted-foreground">
      پیش‌فرض
    </span>
  );
}

/** upload tile + URL input bound to the same value (both stay in sync) */
function ImageField({
  label,
  folder,
  value,
  onChange,
}: {
  label: string;
  folder: string;
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <ImageUpload
        label={label}
        folder={folder}
        height={96}
        value={value || null}
        onChange={(url) => onChange(url ?? "")}
        className="w-full shrink-0 sm:w-40"
      />
      <div className="flex-1 space-y-1.5 self-end">
        <Label className="text-[10px] font-medium text-muted-foreground">
          یا آدرس تصویر (URL / مسیر محلی)
        </Label>
        <Input
          dir="ltr"
          placeholder="/uploads/sliders/example.webp"
          className="rounded-lg text-left text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** v32 · slide VIDEO uploader (POST /api/upload folder=sliders, ≤100MB) */
function VideoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || uploading) return;
    if (!file.type.startsWith("video/")) {
      toast.error("فقط فایل ویدیویی مجاز است (MP4, WebM, MOV)");
      return;
    }
    if (file.size > VIDEO_MAX) {
      toast.error("حجم ویدیو باید حداکثر ۱۰۰ مگابایت باشد");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "sliders");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; message?: string }
        | null;
      if (!json || !json.ok || !json.url) {
        const generic =
          res.status === 413
            ? `حجم فایل بیش از حد مجاز مسیر ارسال است (${(file.size / 1024 / 1024).toFixed(1)}MB)`
            : `بارگذاری ویدیو ناموفق بود${res.status ? ` (خطای ${res.status})` : ""}`;
        throw new Error(json?.message ?? generic);
      }
      onChange(json.url);
      toast.success("ویدیوی اسلاید بارگذاری شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "بارگذاری ویدیو ناموفق بود");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium text-muted-foreground">
        ویدیوی اسلاید (اختیاری — MP4 / WebM / MOV، حداکثر ۱۰۰ مگابایت)
      </Label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="بارگذاری ویدیوی اسلاید"
          className={cn(
            "relative h-24 w-full shrink-0 overflow-hidden rounded-xl border-2 border-dashed transition-colors sm:w-40",
            value ? "border-border bg-muted/30" : "border-border bg-muted/30 hover:border-primary/50",
          )}
        >
          {value ? (
            <>
              <video
                src={value}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                role="button"
                tabIndex={0}
                aria-label="حذف ویدیو"
                className="absolute left-1.5 top-1.5 rounded-lg bg-destructive/90 p-1.5 text-white shadow transition hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange("");
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-black text-white backdrop-blur">
                <Film className="h-3 w-3" aria-hidden />
                ویدیو
              </span>
            </>
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px]">در حال بارگذاری…</span>
                </>
              ) : (
                <>
                  <Film className="h-6 w-6 text-primary/70" aria-hidden />
                  <span className="text-[10px] font-medium">انتخاب ویدیوی اسلاید</span>
                  <span className="text-[9px]">MP4 / WebM / MOV — حداکثر ۱۰۰MB</span>
                </>
              )}
            </span>
          )}
        </button>
        <div className="flex-1 space-y-1.5 self-end">
          <Label className="text-[10px] font-medium text-muted-foreground">
            یا آدرس ویدیو (URL / مسیر محلی)
          </Label>
          <Input
            dir="ltr"
            placeholder="/uploads/sliders/hero-clip.mp4"
            className="rounded-lg text-left text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
      <p className="text-[10px] leading-5 text-muted-foreground">
        وقتی ویدیو تنظیم شود، به‌جای تصویر و به‌صورت خودکار، بی‌صدا و حلقه‌ای پخش می‌شود؛ تصویر نقش
        پوستر را دارد.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/** v32 · mini LIVE preview of one slide (image/video + copy + ticking chip) */
function MiniSlidePreview({ s }: { s: EditableSlide }) {
  const iso = s.countdownEnabled ? localToIso(s.countdownTarget) : null;
  return (
    <div className="relative h-32 overflow-hidden rounded-xl border bg-zinc-950" dir="rtl">
      {s.videoUrl ? (
        <video
          src={s.videoUrl}
          poster={s.image || undefined}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : s.image ? (
        /* plain <img>: admin preview of arbitrary URLs — animated GIFs must
         * stay animated (next/image optimization would flatten them) */
        <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-zinc-700">
          <Images className="h-8 w-8" aria-hidden />
        </span>
      )}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
      />
      <span className="absolute inset-x-3 bottom-2.5 z-[1] flex flex-col items-start gap-1.5">
        {(s.title || s.subtitle) && (
          <span className="max-w-full">
            {s.title && (
              <span className="block truncate text-[11px] font-black text-white drop-shadow">
                {s.title}
              </span>
            )}
            {s.subtitle && (
              <span className="block truncate text-[9.5px] text-white/80 drop-shadow">
                {s.subtitle}
              </span>
            )}
          </span>
        )}
        {iso ? <SlideCountdown target={iso} label={s.countdownLabel} /> : null}
      </span>
    </div>
  );
}

function RowShell({
  index,
  count,
  onUp,
  onDown,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-muted text-[11px] font-black text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            disabled={index === 0}
            onClick={onUp}
            aria-label="انتقال به بالا"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            disabled={index === count - 1}
            onClick={onDown}
            aria-label="انتقال به پایین"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full rounded-lg border-dashed text-xs font-bold"
      onClick={onClick}
    >
      <Plus className="h-4 w-4 text-primary" />
      {label}
    </Button>
  );
}

function HintBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

// ────────────────────────── the editor ──────────────────────────

export function TemplateContentEditor({
  templateId,
  templateName,
  active,
}: {
  templateId: string;
  templateName: string;
  /** «قالب فعال» badge is rendered by the parent's selector */
  active?: boolean;
}) {
  const queryClient = useQueryClient();

  /* the template's STORED override row */
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "template-content", templateId],
    queryFn: () =>
      apiFetch<{ data: TemplateContentData }>(
        `/api/admin/templates/content?template=${encodeURIComponent(templateId)}`,
      ),
    staleTime: 15_000,
  });

  /* v32: live GLOBAL fallback values (real slides/showcases/brand, with the
   * template's own stored content already applied server-side — so when the
   * row is empty these ARE the globals the storefront would render) */
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["admin", "template-content", "fallback", templateId],
    queryFn: () =>
      apiFetch<{ data: HomeData }>(
        `/api/admin/templates/preview?template=${encodeURIComponent(templateId)}`,
      ),
    staleTime: 30_000,
  });

  /* local draft — only used while it belongs to the CURRENT template (the
   * parent remounts this editor on template switch via key={templateId}). */
  const [draft, setDraft] = useState<EditorState | null>(null);
  const [draftFor, setDraftFor] = useState("");

  /* ── effective baseline: stored → designed default → global ── */
  const defaults = useMemo(() => getTemplateDefaultContent(templateId), [templateId]);
  const textMeta = useMemo(() => getTemplateTextMeta(templateId), [templateId]);
  const hints = useMemo(() => getTemplateContentHints(templateId), [templateId]);
  const pv = preview?.data;

  const baseline = useMemo<EditorState | null>(() => {
    const stored = data?.data;
    if (!stored) return null;
    const slides = stored.slides?.length
      ? stored.slides.map(slideToEditable)
      : defaults.slides?.length
        ? defaults.slides.map(slideToEditable)
        : (pv?.slides ?? []).map(globalSlideToEditable);
    const showcases = stored.showcases?.length
      ? stored.showcases.map((s) => ({
          image: s.image ?? "",
          title: s.title ?? "",
          link: s.link ?? "",
        }))
      : defaults.showcases?.length
        ? defaults.showcases.map((s) => ({
            image: s.image ?? "",
            title: s.title ?? "",
            link: s.link ?? "",
          }))
        : (pv?.showcases ?? []).map(globalShowcaseToEditable);
    /* texts: designed keys first (in designed order), then extra custom keys */
    const designedTexts = defaults.texts ?? {};
    const customTexts = stored.texts ?? {};
    const keys: string[] = [];
    for (const k of Object.keys(designedTexts)) if (!keys.includes(k)) keys.push(k);
    for (const k of Object.keys(customTexts)) if (!keys.includes(k)) keys.push(k);
    const texts = keys.map((key) => ({
      key,
      value: customTexts[key] ?? designedTexts[key] ?? "",
      label: textMeta[key]?.label ?? key,
      where: textMeta[key]?.where,
      isImage: isImageKey(key),
    }));
    const links = (stored.links ?? []).map((l) => ({
      label: l.label ?? "",
      url: l.url ?? "",
    }));
    const brand = {
      name: stored.brand?.name ?? pv?.store.storeName ?? "",
      tagline: stored.brand?.tagline ?? defaults.brand?.tagline ?? "",
      logoImage: stored.brand?.logoImage ?? pv?.store.logo ?? "",
    };
    return { slides, showcases, texts, links, brand };
  }, [data, defaults, pv, textMeta]);

  const state: EditorState | null =
    draft && draftFor === templateId && baseline ? draft : baseline;

  /* prefill snapshots → the «پیش‌فرض» chips (rows that still equal their
   * designed/global defaults and are NOT stored overrides) */
  const prefillSlideJsons = useMemo(() => {
    const stored = data?.data;
    if (!stored || stored.slides?.length) return new Set<string>();
    const rows = defaults.slides?.length
      ? defaults.slides.map(slideToEditable)
      : (pv?.slides ?? []).map(globalSlideToEditable);
    return new Set(rows.map((r) => JSON.stringify(r)));
  }, [data, defaults, pv]);

  const prefillShowcaseJsons = useMemo(() => {
    const stored = data?.data;
    if (!stored || stored.showcases?.length) return new Set<string>();
    const rows = defaults.showcases?.length
      ? defaults.showcases.map((s) => ({
          image: s.image ?? "",
          title: s.title ?? "",
          link: s.link ?? "",
        }))
      : (pv?.showcases ?? []).map(globalShowcaseToEditable);
    return new Set(rows.map((r) => JSON.stringify(r)));
  }, [data, defaults, pv]);

  const designedTexts = useMemo(() => defaults.texts ?? {}, [defaults]);
  const brandDefaults = {
    name: pv?.store.storeName ?? "",
    tagline: defaults.brand?.tagline ?? "",
    logoImage: pv?.store.logo ?? "",
  };

  /* how many values are truly CUSTOM (differ from designed/global defaults) */
  const customCount = useMemo(() => {
    if (!state) return 0;
    let n = 0;
    for (const s of state.slides) if (!prefillSlideJsons.has(JSON.stringify(s))) n++;
    for (const s of state.showcases) if (!prefillShowcaseJsons.has(JSON.stringify(s))) n++;
    for (const t of state.texts) if (t.value.trim() && t.value !== designedTexts[t.key]) n++;
    n += state.links.length;
    if (state.brand.name.trim() && state.brand.name !== brandDefaults.name) n++;
    if (state.brand.tagline.trim() && state.brand.tagline !== brandDefaults.tagline) n++;
    if (state.brand.logoImage.trim() && state.brand.logoImage !== brandDefaults.logoImage) n++;
    return n;
  }, [state, prefillSlideJsons, prefillShowcaseJsons, designedTexts, pv, defaults]);

  const save = useMutation({
    mutationFn: (payload: TemplateContentData) =>
      apiFetch<{ message?: string }>("/api/admin/templates/content", {
        method: "PUT",
        body: JSON.stringify({ templateId, data: payload }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "محتوای اختصاصی قالب ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "template-content", templateId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  const reset = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/admin/templates/content", {
        method: "PUT",
        body: JSON.stringify({ templateId, data: {} }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "بازنشانی شد — مقادیر پیش‌فرض و سراسری دوباره اعمال می‌شوند");
      setDraftFor("");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "template-content", templateId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "بازنشانی ناموفق بود"),
  });

  const dirty = useMemo(
    () => !!state && JSON.stringify(toContentData(state)) !== JSON.stringify(toContentData(baseline ?? state)),
    [state, baseline],
  );

  // list helpers (immutable splice-style updates)
  const move = <T,>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };
  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    if (!baseline) return;
    setDraftFor(templateId);
    setDraft((d) => ({ ...(d ?? baseline), [key]: value }));
  };

  if (isError) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        خطا در دریافت محتوای قالب: {error instanceof Error ? error.message : "خطای نامشخص"}
      </p>
    );
  }
  if (isLoading || previewLoading || !state) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header row: template name + customization status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold">
          محتوای اختصاصی «{templateName}»
          {active && (
            <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
              قالب فعال
            </span>
          )}
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-black",
            customCount > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {customCount > 0
            ? `${customCount.toLocaleString("fa-IR")} مقدار سفارشی`
            : "بدون مقدار سفارشی — پیش‌فرض‌ها نمایش داده می‌شوند"}
        </span>
      </div>

      <HintBanner>
        فرم‌ها با <b>مقادیر طراحی‌شدهٔ همین قالب</b> و مقادیر سراسری پیش‌پر شده‌اند — چیزی که اینجا
        ذخیره می‌کنید فقط برای همین قالب استفاده می‌شود؛ «بازنشانی» همه‌چیز را به پیش‌فرض‌های طراحی
        و مقادیر سراسری برمی‌گرداند. فیلدهای با نشان «پیش‌فرض» هنوز دست‌نخورده‌اند.
      </HintBanner>

      <Tabs defaultValue="slides" dir="rtl" className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="slides" className="gap-1.5 rounded-lg text-[11px] font-bold">
            <Images className="h-3.5 w-3.5" />
            اسلایدرها
            {state.slides.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 text-[9px] font-black text-primary tabular-nums">
                {state.slides.length.toLocaleString("fa-IR")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="showcases" className="gap-1.5 rounded-lg text-[11px] font-bold">
            <LayoutGrid className="h-3.5 w-3.5" />
            شوکیس‌ها
            {state.showcases.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 text-[9px] font-black text-primary tabular-nums">
                {state.showcases.length.toLocaleString("fa-IR")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="texts" className="gap-1.5 rounded-lg text-[11px] font-bold">
            <Type className="h-3.5 w-3.5" />
            متن‌ها
            {state.texts.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 text-[9px] font-black text-primary tabular-nums">
                {state.texts.length.toLocaleString("fa-IR")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 rounded-lg text-[11px] font-bold">
            <Link2 className="h-3.5 w-3.5" />
            لینک‌ها
            {state.links.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 text-[9px] font-black text-primary tabular-nums">
                {state.links.length.toLocaleString("fa-IR")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5 rounded-lg text-[11px] font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            برند
          </TabsTrigger>
        </TabsList>

        {/* ── SLIDES ─────────────────────────────────────────── */}
        <TabsContent value="slides" className="mt-3 space-y-3">
          {hints?.slides && <HintBanner>{hints.slides}</HintBanner>}
          {state.slides.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
              هنوز اسلایدی برای این قالب موجود نیست — با دکمهٔ زیر اولین اسلاید را بسازید (یا در بخش
              «اسلایدرها» اسلاید سراسری تعریف کنید تا به‌عنوان پیش‌فرض همین قالب استفاده شود).
            </p>
          )}
          {state.slides.map((s, i) => {
            const isDefaultRow = prefillSlideJsons.has(JSON.stringify(s));
            return (
              <RowShell
                key={i}
                index={i}
                count={state.slides.length}
                onUp={() => update("slides", move(state.slides, i, i - 1))}
                onDown={() => update("slides", move(state.slides, i, i + 1))}
                onRemove={() => update("slides", state.slides.filter((_, j) => j !== i))}
              >
                {/* mini live preview — image/video + copy + ticking countdown */}
                <MiniSlidePreview s={s} />

                <ImageField
                  label={`تصویر اسلاید ${i + 1}`}
                  folder="sliders"
                  value={s.image}
                  onChange={(url) =>
                    update("slides", state.slides.map((x, j) => (j === i ? { ...x, image: url } : x)))
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  تصاویر متحرک <b>GIF</b> (تا ۵ مگابایت) پشتیبانی می‌شوند و انیمیشنشان حفظ می‌شود.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">عنوان</Label>
                    <Input
                      className="rounded-lg text-xs"
                      value={s.title}
                      placeholder="مثلاً: جشنوارهٔ بهاری"
                      onChange={(e) =>
                        update("slides", state.slides.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">زیرعنوان</Label>
                    <Input
                      className="rounded-lg text-xs"
                      value={s.subtitle}
                      placeholder="توضیح کوتاه روی اسلاید"
                      onChange={(e) =>
                        update("slides", state.slides.map((x, j) => (j === i ? { ...x, subtitle: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[10px] text-muted-foreground">لینک (اختیاری)</Label>
                    <Input
                      dir="ltr"
                      className="rounded-lg text-left text-xs"
                      value={s.link}
                      placeholder="/products?category=gaming"
                      onChange={(e) =>
                        update("slides", state.slides.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>

                {/* v32: slide video */}
                <VideoField
                  value={s.videoUrl}
                  onChange={(url) =>
                    update("slides", state.slides.map((x, j) => (j === i ? { ...x, videoUrl: url } : x)))
                  }
                />

                {/* v32: per-slide countdown */}
                <div className="space-y-2.5 rounded-xl border border-dashed p-3">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-black">
                      <Timer className="h-3.5 w-3.5 text-primary" aria-hidden />
                      شمارش معکوس این اسلاید
                      {isDefaultRow && <DefaultChip />}
                    </span>
                    <Checkbox
                      checked={s.countdownEnabled}
                      onCheckedChange={(v) =>
                        update(
                          "slides",
                          state.slides.map((x, j) =>
                            j === i ? { ...x, countdownEnabled: v === true } : x,
                          ),
                        )
                      }
                      aria-label="فعال‌سازی شمارش معکوس این اسلاید"
                    />
                  </label>
                  {s.countdownEnabled && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">زمان پایان</Label>
                        <Input
                          type="datetime-local"
                          dir="ltr"
                          className="rounded-lg text-left text-xs"
                          value={s.countdownTarget}
                          onChange={(e) =>
                            update(
                              "slides",
                              state.slides.map((x, j) =>
                                j === i ? { ...x, countdownTarget: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">
                          برچسب (مثلاً: تخفیف بهاره)
                        </Label>
                        <Input
                          className="rounded-lg text-xs"
                          value={s.countdownLabel}
                          placeholder="تخفیف بهاره"
                          onChange={(e) =>
                            update(
                              "slides",
                              state.slides.map((x, j) =>
                                j === i ? { ...x, countdownLabel: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <p className="text-[10px] leading-5 text-muted-foreground sm:col-span-2">
                        روی اسلاید، چیپ شیشه‌ای تاریک با شمارش زندهٔ روز/ساعت/دقیقه/ثانیه نمایش داده
                        می‌شود.
                      </p>
                    </div>
                  )}
                </div>
              </RowShell>
            );
          })}
          <AddButton
            label="افزودن اسلاید"
            onClick={() =>
              update("slides", [
                ...state.slides,
                {
                  image: "",
                  title: "",
                  subtitle: "",
                  link: "",
                  countdownEnabled: false,
                  countdownTarget: "",
                  countdownLabel: "",
                  videoUrl: "",
                },
              ])
            }
          />
        </TabsContent>

        {/* ── SHOWCASES ──────────────────────────────────────── */}
        <TabsContent value="showcases" className="mt-3 space-y-3">
          {hints?.showcases && <HintBanner>{hints.showcases}</HintBanner>}
          {state.showcases.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
              شوکیسی موجود نیست — با دکمهٔ زیر شوکیس اختصاصی این قالب را بسازید (یا در بخش
              «شوکیس‌ها» شوکیس سراسری تعریف کنید تا به‌عنوان پیش‌فرض استفاده شود).
            </p>
          )}
          {state.showcases.map((s, i) => {
            const isDefaultRow = prefillShowcaseJsons.has(JSON.stringify(s));
            return (
              <RowShell
                key={i}
                index={i}
                count={state.showcases.length}
                onUp={() => update("showcases", move(state.showcases, i, i - 1))}
                onDown={() => update("showcases", move(state.showcases, i, i + 1))}
                onRemove={() => update("showcases", state.showcases.filter((_, j) => j !== i))}
              >
                <ImageField
                  label={`تصویر شوکیس ${i + 1}`}
                  folder="showcases"
                  value={s.image}
                  onChange={(url) =>
                    update("showcases", state.showcases.map((x, j) => (j === i ? { ...x, image: url } : x)))
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      عنوان
                      {isDefaultRow && <DefaultChip />}
                    </Label>
                    <Input
                      className="rounded-lg text-xs"
                      value={s.title}
                      placeholder="مثلاً: تجهیزات ARGB"
                      onChange={(e) =>
                        update("showcases", state.showcases.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">لینک (اختیاری)</Label>
                    <Input
                      dir="ltr"
                      className="rounded-lg text-left text-xs"
                      value={s.link}
                      placeholder="/products?brand=muse"
                      onChange={(e) =>
                        update("showcases", state.showcases.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              </RowShell>
            );
          })}
          <AddButton
            label="افزودن شوکیس"
            onClick={() => update("showcases", [...state.showcases, { image: "", title: "", link: "" }])}
          />
        </TabsContent>

        {/* ── TEXTS ──────────────────────────────────────────── */}
        <TabsContent value="texts" className="mt-3 space-y-3">
          <HintBanner>
            متن‌ها و تصاویر طراحی‌شدهٔ این قالب — هر مقدار را که تغییر دهید فقط برای همین قالب ذخیره
            می‌شود؛ خالی بگذارید یا «بازگردانی» بزنید تا مقدار پیش‌فرض طراحی دوباره استفاده شود.
          </HintBanner>
          {state.texts.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
              این قالب متن طراحی‌شدهٔ قابل ویرایش ندارد — با دکمهٔ زیر کلید سفارشی اضافه کنید.
            </p>
          )}
          {state.texts.map((t, i) => {
            const isDefaultText = !!designedTexts[t.key] && t.value === designedTexts[t.key];
            const isDesignedKey = t.key in designedTexts;
            return (
              <div key={i} className="space-y-2 rounded-xl border bg-muted/20 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] font-black">{t.label || t.key || "کلید جدید"}</span>
                    {t.key && (
                      <code
                        dir="ltr"
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                      >
                        {t.key}
                      </code>
                    )}
                    {isDefaultText && <DefaultChip />}
                  </div>
                  {isDesignedKey ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-lg"
                      onClick={() =>
                        update(
                          "texts",
                          state.texts.map((x, j) =>
                            j === i ? { ...x, value: designedTexts[t.key] ?? "" } : x,
                          ),
                        )
                      }
                      aria-label="بازگردانی به مقدار پیش‌فرض"
                      title="بازگردانی به مقدار پیش‌فرض"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => update("texts", state.texts.filter((_, j) => j !== i))}
                      aria-label="حذف متن"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {t.where && (
                  <p className="flex items-center gap-1.5 text-[10px] leading-5 text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                    {t.where}
                  </p>
                )}
                {!isDesignedKey && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">کلید (مثل heroTitle)</Label>
                    <Input
                      dir="ltr"
                      className="rounded-lg text-left font-mono text-xs"
                      placeholder="customKey"
                      value={t.key}
                      onChange={(e) =>
                        update(
                          "texts",
                          state.texts.map((x, j) =>
                            j === i
                              ? { ...x, key: e.target.value, isImage: isImageKey(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                )}
                {t.isImage ? (
                  <ImageField
                    label={`تصویر (${t.label || t.key})`}
                    folder="sliders"
                    value={t.value}
                    onChange={(url) =>
                      update("texts", state.texts.map((x, j) => (j === i ? { ...x, value: url } : x)))
                    }
                  />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">
                      {isImageKey(t.key) ? "مقدار (کلید تصویری است — آدرس تصویر وارد کنید)" : "متن"}
                    </Label>
                    <Input
                      className="rounded-lg text-xs"
                      value={t.value}
                      placeholder={designedTexts[t.key] ?? "متن جایگزین برای این کلید"}
                      onChange={(e) =>
                        update("texts", state.texts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
          <AddButton
            label="افزودن کلید سفارشی"
            onClick={() =>
              update("texts", [...state.texts, { key: "", value: "", label: "", isImage: false }])
            }
          />
        </TabsContent>

        {/* ── LINKS ──────────────────────────────────────────── */}
        <TabsContent value="links" className="mt-3 space-y-3">
          <HintBanner>
            لینک‌های اضافهٔ این قالب — در قالب گیمینگ به‌عنوان دکمه‌های CTA کنار هیرو نمایش داده
            می‌شوند؛ بقیهٔ قالب‌ها فقط در صورت پشتیبانی رندرشان می‌کنند.
          </HintBanner>
          {state.links.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
              لینک اضافه‌ای تعریف نشده — دکمه‌های طراحی‌شدهٔ خود قالب کافی هستند.
            </p>
          )}
          {state.links.map((l, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3.5 sm:flex-row sm:items-end"
            >
              <div className="w-full space-y-1.5 sm:w-48">
                <Label className="text-[10px] text-muted-foreground">عنوان</Label>
                <Input
                  className="rounded-lg text-xs"
                  placeholder="مثلاً: فروشگاه فیزیکی"
                  value={l.label}
                  onChange={(e) =>
                    update("links", state.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">آدرس</Label>
                <Input
                  dir="ltr"
                  className="rounded-lg text-left text-xs"
                  placeholder="/contact یا https://…"
                  value={l.url}
                  onChange={(e) =>
                    update("links", state.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:text-destructive"
                onClick={() => update("links", state.links.filter((_, j) => j !== i))}
                aria-label="حذف لینک"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <AddButton
            label="افزودن لینک"
            onClick={() => update("links", [...state.links, { label: "", url: "" }])}
          />
        </TabsContent>

        {/* ── BRAND ──────────────────────────────────────────── */}
        <TabsContent value="brand" className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                نام برند این قالب
                {brandDefaults.name && state.brand.name === brandDefaults.name && <DefaultChip />}
              </Label>
              <Input
                className="rounded-lg text-xs"
                placeholder="خالی = نام سراسری فروشگاه"
                value={state.brand.name}
                onChange={(e) => update("brand", { ...state.brand, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                شعار (تگ‌لاین)
                {brandDefaults.tagline && state.brand.tagline === brandDefaults.tagline && <DefaultChip />}
              </Label>
              <Input
                className="rounded-lg text-xs"
                placeholder="خالی = شعار طراحی‌شدهٔ قالب"
                value={state.brand.tagline}
                onChange={(e) => update("brand", { ...state.brand, tagline: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              لوگوی این قالب
              {brandDefaults.logoImage && state.brand.logoImage === brandDefaults.logoImage && (
                <DefaultChip />
              )}
            </Label>
            <ImageField
              label="لوگوی این قالب"
              folder="branding"
              value={state.brand.logoImage}
              onChange={(url) => update("brand", { ...state.brand, logoImage: url })}
            />
          </div>
          <p className="text-[10px] leading-5 text-muted-foreground">
            نام و لوگو هنگام فعال بودن این قالب در هدر، فوتر و عنوان فروشگاه جایگزین برند سراسری
            می‌شوند؛ شعار به‌عنوان زیرتیتر هیرو در قالب‌هایی که پشتیبانی می‌کنند استفاده می‌شود.
          </p>
        </TabsContent>
      </Tabs>

      {/* ── action bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button
          size="sm"
          className="rounded-lg font-bold gold-surface text-primary-foreground hover:opacity-90"
          disabled={save.isPending}
          onClick={() => save.mutate(toContentData(state))}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیرهٔ محتوای اختصاصی
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg text-xs font-bold"
          disabled={reset.isPending}
          onClick={() => reset.mutate()}
        >
          {reset.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          بازنشانی به مقادیر پیش‌فرض
        </Button>
        {dirty && (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
            تغییرات ذخیره‌نشده دارید
          </span>
        )}
      </div>
    </div>
  );
}

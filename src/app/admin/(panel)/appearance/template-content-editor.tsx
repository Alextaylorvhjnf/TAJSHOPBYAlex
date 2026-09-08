"use client";

/**
 * v5-f · TEMPLATE CONTENT EDITOR (Admin → ظاهر → «محتوای اختصاصی قالب»)
 * ---------------------------------------------------------------------------
 * Per-template dedicated content: slides / showcases / texts / links / brand.
 * Every field is optional — empty means «fall back to the global value»
 * (global sliders/showcases/branding entities stay managed where they are).
 * One editor instance is mounted for the SELECTED template; switching the
 * selector above re-loads and re-hydrates the form.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Images, Info, LayoutGrid, Link2, Loader2, Plus,
  RotateCcw, Save, Sparkles, Trash2, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import type { TemplateContentData } from "@/lib/templates/content";

// ────────────────────────── editor state shapes ──────────────────────────
// All-string mirrors of TemplateContentData — empty string = «not set».

type EditableSlide = { image: string; title: string; subtitle: string; link: string };
type EditableShowcase = { image: string; title: string; link: string };
type EditableText = { key: string; value: string };
type EditableLink = { label: string; url: string };
type EditableBrand = { name: string; tagline: string; logoImage: string };

type EditorState = {
  slides: EditableSlide[];
  showcases: EditableShowcase[];
  texts: EditableText[];
  links: EditableLink[];
  brand: EditableBrand;
};

const EMPTY_EDITOR: EditorState = {
  slides: [],
  showcases: [],
  texts: [],
  links: [],
  brand: { name: "", tagline: "", logoImage: "" },
};

function fromContentData(data: TemplateContentData | undefined): EditorState {
  if (!data) return EMPTY_EDITOR;
  return {
    slides: (data.slides ?? []).map((s) => ({
      image: s.image ?? "",
      title: s.title ?? "",
      subtitle: s.subtitle ?? "",
      link: s.link ?? "",
    })),
    showcases: (data.showcases ?? []).map((s) => ({
      image: s.image ?? "",
      title: s.title ?? "",
      link: s.link ?? "",
    })),
    texts: Object.entries(data.texts ?? {}).map(([key, value]) => ({ key, value })),
    links: (data.links ?? []).map((l) => ({ label: l.label ?? "", url: l.url ?? "" })),
    brand: {
      name: data.brand?.name ?? "",
      tagline: data.brand?.tagline ?? "",
      logoImage: data.brand?.logoImage ?? "",
    },
  };
}

/** editor state → the clean API payload (empty strings dropped everywhere) */
function toContentData(state: EditorState): TemplateContentData {
  const out: TemplateContentData = {};
  const slides = state.slides
    .map((s) => ({
      image: s.image.trim(),
      title: s.title.trim(),
      subtitle: s.subtitle.trim(),
      link: s.link.trim(),
    }))
    .filter((s) => s.image);
  if (slides.length > 0) {
    out.slides = slides.map((s) => ({
      image: s.image,
      ...(s.title ? { title: s.title } : {}),
      ...(s.subtitle ? { subtitle: s.subtitle } : {}),
      ...(s.link ? { link: s.link } : {}),
    }));
  }
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

/** how many meaningful values are filled in (the «سفارشی» badge) */
function filledCount(state: EditorState): number {
  return (
    state.slides.filter((s) => s.image.trim()).length +
    state.showcases.filter((s) => s.image.trim()).length +
    state.texts.filter((t) => t.key.trim() && t.value.trim()).length +
    state.links.filter((l) => l.label.trim() && l.url.trim()).length +
    (state.brand.name.trim() || state.brand.tagline.trim() || state.brand.logoImage.trim() ? 1 : 0)
  );
}

// ────────────────────────── small building blocks ──────────────────────────

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

/** suggested text keys — the storefront consumers document what they honor */
const TEXT_PRESETS = [
  { key: "heroTitle", desc: "تیتر اصلی هیرو" },
  { key: "heroSubtitle", desc: "زیرتیتر هیرو" },
  { key: "ctaLabel", desc: "متن دکمهٔ اصلی" },
  { key: "bannerTitle", desc: "تیتر بنر تبلیغاتی" },
];

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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "template-content", templateId],
    queryFn: () =>
      apiFetch<{ data: TemplateContentData }>(
        `/api/admin/templates/content?template=${encodeURIComponent(templateId)}`,
      ),
    staleTime: 15_000,
  });

  /* local draft — only used while it belongs to the CURRENT template. The
   * parent remounts this editor on template switch (key={templateId}), so a
   * fresh mount simply renders the server snapshot until the row loads —
   * no reset effects needed. */
  const [draft, setDraft] = useState<EditorState | null>(null);
  const [draftFor, setDraftFor] = useState("");
  const serverState = useMemo(() => fromContentData(data?.data), [data]);
  const state: EditorState = draft && draftFor === templateId ? draft : serverState;

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
      toast.success(json.message ?? "بازنشانی شد — مقادیر سراسری استفاده می‌شود");
      setDraftFor(templateId);
      setDraft(EMPTY_EDITOR);
      queryClient.invalidateQueries({ queryKey: ["admin", "template-content", templateId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "بازنشانی ناموفق بود"),
  });

  const filled = useMemo(() => filledCount(state), [state]);
  const dirty = useMemo(
    () => JSON.stringify(toContentData(state)) !== JSON.stringify(data?.data ?? {}),
    [state, data],
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
    setDraftFor(templateId);
    setDraft((d) => ({ ...(d ?? serverState), [key]: value }));
  };

  if (isError) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        خطا در دریافت محتوای قالب: {error instanceof Error ? error.message : "خطای نامشخص"}
      </p>
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
            filled > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {filled > 0 ? `${filled.toLocaleString("fa-IR")} مقدار سفارشی` : "بدون محتوای اختصاصی"}
        </span>
      </div>

      <HintBanner>
        هر بخش اختیاری است — <b>خالی بگذارید تا مقادیر سراسری استفاده شود</b> (اسلایدرها،
        شوکیس‌ها و برند سراسری از بخش‌های مدیریت خودشان تغییر می‌کنند). هر مقداری که اینجا
        وارد کنید فقط برای همین قالب جایگزین می‌شود.
      </HintBanner>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="slides" dir="rtl" className="w-full">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
            <TabsTrigger value="slides" className="gap-1.5 rounded-lg text-[11px] font-bold">
              <Images className="h-3.5 w-3.5" />
              اسلایدها
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
            {state.slides.length === 0 && (
              <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                اسلایدی تعریف نشده — اسلایدهای سراسری (بخش «اسلایدرها») استفاده می‌شوند.
              </p>
            )}
            {state.slides.map((s, i) => (
              <RowShell
                key={i}
                index={i}
                count={state.slides.length}
                onUp={() => update("slides", move(state.slides, i, i - 1))}
                onDown={() => update("slides", move(state.slides, i, i + 1))}
                onRemove={() => update("slides", state.slides.filter((_, j) => j !== i))}
              >
                <ImageField
                  label={`تصویر اسلاید ${i + 1}`}
                  folder="sliders"
                  value={s.image}
                  onChange={(url) =>
                    update("slides", state.slides.map((x, j) => (j === i ? { ...x, image: url } : x)))
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">عنوان</Label>
                    <Input
                      className="rounded-lg text-xs"
                      value={s.title}
                      placeholder="مثلاً: جشنوارهٔ گیمینگ"
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
              </RowShell>
            ))}
            <AddButton
              label="افزودن اسلاید"
              onClick={() => update("slides", [...state.slides, { image: "", title: "", subtitle: "", link: "" }])}
            />
          </TabsContent>

          {/* ── SHOWCASES ──────────────────────────────────────── */}
          <TabsContent value="showcases" className="mt-3 space-y-3">
            {state.showcases.length === 0 && (
              <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                شوکیسی تعریف نشده — شوکیس‌های سراسری (بخش «شوکیس‌ها») استفاده می‌شوند.
              </p>
            )}
            {state.showcases.map((s, i) => (
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
                    <Label className="text-[10px] text-muted-foreground">عنوان</Label>
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
            ))}
            <AddButton
              label="افزودن شوکیس"
              onClick={() => update("showcases", [...state.showcases, { image: "", title: "", link: "" }])}
            />
          </TabsContent>

          {/* ── TEXTS ──────────────────────────────────────────── */}
          <TabsContent value="texts" className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">کلیدهای پرکاربرد:</span>
              {TEXT_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  dir="ltr"
                  disabled={state.texts.some((t) => t.key === p.key)}
                  onClick={() => update("texts", [...state.texts, { key: p.key, value: "" }])}
                  className="rounded-full border border-dashed px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
                  title={p.desc}
                >
                  {p.key}
                </button>
              ))}
            </div>
            {state.texts.length === 0 && (
              <p className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                متنی override نشده — متن‌های طراحی‌شدهٔ خود قالب نمایش داده می‌شوند.
              </p>
            )}
            {state.texts.map((t, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3.5 sm:flex-row sm:items-end"
              >
                <div className="w-full space-y-1.5 sm:w-44">
                  <Label className="text-[10px] text-muted-foreground">کلید</Label>
                  <Input
                    dir="ltr"
                    className="rounded-lg text-left font-mono text-xs"
                    placeholder="heroTitle"
                    value={t.key}
                    onChange={(e) =>
                      update("texts", state.texts.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">متن</Label>
                  <Input
                    className="rounded-lg text-xs"
                    placeholder="متن جایگزین برای این کلید"
                    value={t.value}
                    onChange={(e) =>
                      update("texts", state.texts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => update("texts", state.texts.filter((_, j) => j !== i))}
                  aria-label="حذف متن"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <AddButton
              label="افزودن متن"
              onClick={() => update("texts", [...state.texts, { key: "", value: "" }])}
            />
          </TabsContent>

          {/* ── LINKS ──────────────────────────────────────────── */}
          <TabsContent value="links" className="mt-3 space-y-3">
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
                <Label className="text-[10px] text-muted-foreground">نام برند این قالب</Label>
                <Input
                  className="rounded-lg text-xs"
                  placeholder="خالی = نام سراسری فروشگاه"
                  value={state.brand.name}
                  onChange={(e) => update("brand", { ...state.brand, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">شعار (تگ‌لاین)</Label>
                <Input
                  className="rounded-lg text-xs"
                  placeholder="خالی = شعار طراحی‌شدهٔ قالب"
                  value={state.brand.tagline}
                  onChange={(e) => update("brand", { ...state.brand, tagline: e.target.value })}
                />
              </div>
            </div>
            <ImageField
              label="لوگوی این قالب"
              folder="branding"
              value={state.brand.logoImage}
              onChange={(url) => update("brand", { ...state.brand, logoImage: url })}
            />
            <p className="text-[10px] leading-5 text-muted-foreground">
              نام و لوگو هنگام فعال بودن این قالب در هدر، فوتر و عنوان فروشگاه جایگزین برند سراسری
              می‌شوند؛ شعار به‌عنوان زیرتیتر هیرو در قالب‌هایی که پشتیبانی می‌کنند استفاده می‌شود.
            </p>
          </TabsContent>
        </Tabs>
      )}

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
          disabled={reset.isPending || filled === 0}
          onClick={() => reset.mutate()}
        >
          {reset.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          بازنشانی به مقادیر سراسری
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

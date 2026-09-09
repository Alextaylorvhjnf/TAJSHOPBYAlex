"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImageForUpload } from "@/lib/client-image";

/**
 * v29.3 (task 13-e): avatar upload tile for the account page.
 *
 * WHY a dedicated component: the generic ImageUpload tile hides its empty-state
 * content once a value exists and previews via an absolutely-positioned image —
 * inside a flex row that collapses the tile to ~0px width, so the admin could
 * NOT click it again (re-upload required «حذف آواتار» first) and never saw the
 * uploaded file. This tile:
 *  - is a real <button> with a FIXED size (h-24 w-24, ≥44px touch target) —
 *    clickable whether an avatar exists or not;
 *  - previews the picked file LOCALLY (object URL + filename + size in Persian)
 *    the instant it is chosen;
 *  - re-picking simply REPLACES the previous image (no delete-first);
 *  - uploads through the EXISTING flow (browser compression → POST /api/upload)
 *    and hands the fresh /uploads/<folder>/… url to onChange; the account page
 *    persists it with its usual «ذخیره اطلاعات» save;
 *  - surfaces every error via toast (Persian).
 */
interface AvatarUploadProps {
  /** current custom avatar url (e.g. /uploads/avatars/… or null = none) */
  value?: string | null;
  /** fired with the fresh uploaded url once the upload succeeds */
  onChange: (url: string) => void;
  /** upload folder: avatars (default) | misc … */
  folder?: string;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;

/** Persian human-readable file size — «۲٫۴ مگابایت» / «۳۱۰ کیلوبایت» */
const faNum = (n: number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n);

function faFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${faNum(bytes / 1024 / 1024)} مگابایت`;
  if (bytes >= 1024) return `${faNum(bytes / 1024)} کیلوبایت`;
  return `${faNum(bytes)} بایت`;
}

interface PendingFile {
  /** local object-url preview of the just-picked file */
  url: string;
  name: string;
  size: number;
}

export function AvatarUpload({
  value = null,
  onChange,
  folder = "avatars",
  disabled,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingFile | null>(null);

  /* never leak object URLs (kept until the next pick / unmount on purpose —
   * revoking while the <img> is still painting would flash a broken image) */
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled || uploading) return;
      if (!file.type.startsWith("image/")) {
        toast.error("فقط فایل تصویری مجاز است");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("حجم تصویر باید حداکثر ۵ مگابایت باشد");
        return;
      }

      /* 1) instant LOCAL preview — picture + filename + size (Persian) —
       * re-picking a different file simply replaces it. */
      const localUrl = URL.createObjectURL(file);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = localUrl;
      setPending({ url: localUrl, name: file.name, size: file.size });
      setUploading(true);
      try {
        /* 2) the existing upload flow: compress in-browser → POST /api/upload */
        const uploadFile = await compressImageForUpload(file);
        const form = new FormData();
        form.append("file", uploadFile);
        form.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; url?: string; message?: string }
          | null;
        if (!json || !json.ok || !json.url) {
          const generic =
            res.status === 413
              ? `حجم فایل بیش از حد مجاز مسیر ارسال است (${faNum(uploadFile.size / 1024 / 1024)}MB)`
              : `بارگذاری تصویر ناموفق بود${res.status ? ` (خطای ${res.status})` : ""}`;
          throw new Error(json?.message ?? generic);
        }
        onChange(json.url);
        toast.success("تصویر جدید جایگزین شد — برای ثبت نهایی «ذخیره اطلاعات» را بزنید");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "بارگذاری تصویر ناموفق بود");
      } finally {
        setUploading(false);
        setPending(null);
        /* reset so picking the SAME file again re-fires the change event */
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [folder, onChange, disabled, uploading]
  );

  const shown = pending?.url ?? value;

  return (
    <div className="flex items-center gap-3">
      {/* fixed-size, ALWAYS-clickable tile (h-24 w-24 → 96px ≥ 44px target) */}
      <button
        type="button"
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        disabled={disabled}
        aria-label={value ? "تعویض تصویر اختصاصی آواتار" : "بارگذاری تصویر اختصاصی آواتار"}
        title={value ? "تعویض تصویر" : "انتخاب تصویر"}
        className={cn(
          "relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed transition-all",
          "border-border bg-muted/40 hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {shown ? (
          <>
            <img
              src={shown}
              alt="تصویر انتخاب‌شدهٔ آواتار"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/85 py-1 text-[9px] font-bold text-foreground backdrop-blur-sm">
              <Camera className="h-3 w-3" />
              تعویض تصویر
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="h-7 w-7 text-primary/70" />
            <span className="text-[10px] font-bold">انتخاب تصویر</span>
            <span className="text-[9px]">JPG / PNG / WebP</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 z-10 grid place-items-center bg-background/70">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </span>
        )}
      </button>

      {/* live file info — filename + size in Persian while uploading */}
      <div className="min-w-0 flex-1">
        {pending ? (
          <>
            <p dir="ltr" className="truncate font-mono text-[11px] font-bold" title={pending.name}>
              {pending.name}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {faFileSize(pending.size)} — در حال بارگذاری…
            </p>
          </>
        ) : value ? (
          <p className="text-[10px] leading-4 text-muted-foreground">
            تصویر اختصاصی فعال است — برای تعویض، روی تصویر کلیک کنید
          </p>
        ) : (
          <p className="text-[10px] leading-4 text-muted-foreground">
            هر عکس دلخواهی (تا ۵ مگابایت) — با کلیک روی تصویر انتخاب می‌شود
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

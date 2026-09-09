"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  /** current video url (null = none) */
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const MAX_SIZE = 64 * 1024 * 1024; // 64MB — matches the backend cap
const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime"];

/** Story-video uploader with inline preview (POST /api/upload folder=videos) */
export function VideoUpload({ value, onChange, label, className, disabled }: VideoUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;
      if (!ACCEPTED.includes(file.type) && !/\.(mp4|webm|mov)$/i.test(file.name)) {
        toast.error("فقط ویدیو MP4 / WebM / MOV مجاز است");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("حجم ویدیو باید حداکثر ۶۴ مگابایت باشد");
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "videos");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; url?: string; message?: string }
          | null;
        if (!json || !json.ok || !json.url) {
          throw new Error(json?.message ?? "بارگذاری ویدیو ناموفق بود");
        }
        onChange(json.url);
        toast.success("ویدیو بارگذاری شد");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "بارگذاری ویدیو ناموفق بود");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, disabled]
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 p-4 text-center transition-colors",
          "border-border hover:border-primary/50",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {value ? (
          <div className="w-full space-y-2">
            <video
              src={value}
              controls
              playsInline
              preload="metadata"
              className="mx-auto max-h-44 w-full rounded-lg bg-black"
              aria-label="پیش‌نمایش ویدیوی استوری"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                {value}
              </span>
              <button
                type="button"
                aria-label="حذف ویدیو"
                className="shrink-0 rounded-lg bg-destructive/90 p-1.5 text-white shadow transition hover:opacity-80"
                onClick={() => onChange(null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs">در حال بارگذاری ویدیو…</span>
          </>
        ) : (
          <>
            <Video className="h-8 w-8 text-primary/70" />
            <span className="text-xs font-medium text-muted-foreground">
              ویدیوی استوری (اختیاری)
            </span>
            <span className="text-[10px] text-muted-foreground">
              MP4 / WebM / MOV — حداکثر ۶۴MB — با ویدیو، نوار پیشرفت و انتقال خودکار مطابق خود ویدیو پیش می‌رود
            </span>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {!value && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-4 text-xs font-bold transition-colors hover:border-primary/50 hover:text-primary"
          >
            <UploadCloud className="h-4 w-4" />
            انتخاب ویدیو
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImageForUpload } from "@/lib/client-image";

interface ImageUploadProps {
  /** current image url (null = empty) */
  value?: string | null;
  onChange: (url: string | null) => void;
  /** upload folder: products | sliders | brands | avatars | misc */
  folder?: string;
  label?: string;
  /** fixed height in px */
  height?: number;
  className?: string;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;

/** Single-image drag&drop uploader with preview (POST /api/upload) */
export function ImageUpload({
  value,
  onChange,
  folder = "misc",
  label,
  height = 120,
  className,
  disabled,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;
      if (!file.type.startsWith("image/")) {
        toast.error("فقط فایل تصویری مجاز است");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("حجم تصویر باید حداکثر ۵ مگابایت باشد");
        return;
      }
      setUploading(true);
      try {
        // v28: compress in the browser FIRST — oversized photos are rejected
        // by hosting/preview proxies (413) before they ever reach the app,
        // which showed as «بارگذاری تصویر ناموفق بود» for every large image.
        const uploadFile = await compressImageForUpload(file);
        const form = new FormData();
        form.append("file", uploadFile);
        form.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; url?: string; message?: string }
          | null;
        if (!json || !json.ok || !json.url) {
          // non-JSON body (proxy 413 / crashed request) → say WHY, with status
          const generic =
            res.status === 413
              ? `حجم فایل بیش از حد مجاز مسیر ارسال است (${(uploadFile.size / 1024 / 1024).toFixed(1)}MB)`
              : `بارگذاری تصویر ناموفق بود${res.status ? ` (خطای ${res.status})` : ""}`;
          throw new Error(json?.message ?? generic);
        }
        onChange(json.url);
        toast.success("تصویر بارگذاری شد");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "بارگذاری تصویر ناموفق بود");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [folder, onChange, disabled]
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? "بارگذاری تصویر"}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50",
          disabled && "pointer-events-none opacity-60"
        )}
        style={{ height }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {value ? (
          <div className="relative h-full w-full">
            <Image
              src={value}
              alt={label ?? "تصویر بارگذاری شده"}
              fill
              unoptimized
              className="object-contain p-1"
            />
            <button
              type="button"
              aria-label="حذف تصویر"
              className="absolute left-2 top-2 rounded-lg bg-destructive/90 p-1.5 text-white shadow transition hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {uploading ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs">در حال بارگذاری…</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-primary/70" />
                <span className="flex items-center gap-1 text-xs font-medium">
                  <ImagePlus className="h-3.5 w-3.5" />
                  انتخاب یا رها کردن تصویر
                </span>
                <span className="text-[10px]">JPG / PNG / WebP — حداکثر ۵MB</span>
              </>
            )}
          </div>
        )}
        {value && uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

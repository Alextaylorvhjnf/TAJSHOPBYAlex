"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { FileImage, Loader2, Paperclip, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TicketAttachment } from "@/lib/tickets";

/**
 * v16 ticket chat — shared attachment UI (customer account page + admin panel).
 * - `TicketAttachmentList` renders the attachments of a received message
 *   (image thumbnails → open in new tab; inline <video> players).
 * - `useTicketUploads` + `TicketAttachmentBar` power the reply box paperclip:
 *   client-side pre-checks (≤4 files, image ≤5MB, video ≤64MB), multipart
 *   upload to /api/tickets/upload, per-file loading state, removable chips.
 */

const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — mirrors lib/upload
const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64MB — mirrors lib/upload

/** Human-readable file size (Persian). */
export function formatAttachmentSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("fa-IR")} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت`;
}

/* ── rendering attachments of a message ──────────────────────── */

export function TicketAttachmentList({ attachments }: { attachments: TicketAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  const images = attachments.filter((a) => (a.kind ?? "image") !== "video");
  const videos = attachments.filter((a) => a.kind === "video");

  return (
    <div className="mt-2.5 space-y-2.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a, i) => (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener"
              aria-label={`نمایش ${a.name ?? "تصویر پیوست"}`}
              className="block max-w-[220px] overflow-hidden rounded-xl border border-border/70 bg-background transition-colors hover:border-primary/60"
            >
              <img src={a.url} alt={a.name ?? "پیوست تصویری"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <span className="flex items-center gap-1 border-t border-border/70 px-2 py-1 text-[10px] leading-4 text-muted-foreground">
                <FileImage className="h-3 w-3 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{a.name ?? "تصویر پیوست"}</span>
                {a.size ? <span className="shrink-0">· {formatAttachmentSize(a.size)}</span> : null}
              </span>
            </a>
          ))}
        </div>
      )}
      {videos.map((a, i) => (
        <figure key={`${a.url}-${i}`} className="max-w-[260px] overflow-hidden rounded-xl border border-border/70 bg-background">
          <video
            controls
            preload="metadata"
            src={a.url}
            aria-label={a.name ?? "ویدیوی پیوست"}
            className="aspect-video w-full bg-black"
          />
          <figcaption className="flex items-center gap-1 border-t border-border/70 px-2 py-1 text-[10px] leading-4 text-muted-foreground">
            <Video className="h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{a.name ?? "ویدیوی پیوست"}</span>
            {a.size ? <span className="shrink-0">· {formatAttachmentSize(a.size)}</span> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ── uploading attachments (reply box) ───────────────────────── */

export type PendingAttachment = {
  key: string;
  name: string;
  kind: "image" | "video";
  size: number;
  previewUrl: string; // local object URL for the chip thumbnail
  status: "uploading" | "done";
  url?: string; // server URL once uploaded
};

export function useTicketUploads() {
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const counter = useRef(0);

  const remove = useCallback((key: string) => {
    setPending((p) => {
      const item = p.find((x) => x.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return p.filter((x) => x.key !== key);
    });
  }, []);

  /** Drop every pending chip + free the preview object URLs (after a send). */
  const reset = useCallback(() => {
    setPending((p) => {
      for (const item of p) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
  }, []);

  const uploadOne = useCallback(async (file: File, key: string) => {
    const form = new FormData();
    form.append("file", file);
    let json: { ok?: boolean; url?: string; message?: string } | null = null;
    try {
      const res = await fetch("/api/tickets/upload", { method: "POST", body: form });
      json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string } | null;
    } catch {
      json = null;
    }
    if (!json || json.ok !== true || !json.url) {
      toast.error(json?.message ?? `بارگذاری «${file.name}» ناموفق بود`);
      setPending((p) => {
        const item = p.find((x) => x.key === key);
        if (item) URL.revokeObjectURL(item.previewUrl);
        return p.filter((x) => x.key !== key);
      });
      return;
    }
    setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "done" as const, url: json.url } : x)));
  }, []);

  /** File-input change handler — pre-checks then kicks off uploads. */
  const pick = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      const room = MAX_FILES - pending.length;
      if (room <= 0) {
        toast.error("حداکثر ۴ فایل در هر پیام می‌توانید بفرستید");
        return;
      }
      if (list.length > room) toast.error("حداکثر ۴ فایل در هر پیام می‌توانید بفرستید");
      for (const file of list.slice(0, room)) {
        const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
        if (kind === "image" && file.size > MAX_IMAGE_BYTES) {
          toast.error(`«${file.name}»: حجم تصویر باید حداکثر ۵ مگابایت باشد`);
          continue;
        }
        if (kind === "video" && file.size > MAX_VIDEO_BYTES) {
          toast.error(`«${file.name}»: حجم ویدیو باید حداکثر ۶۴ مگابایت باشد`);
          continue;
        }
        const item: PendingAttachment = {
          key: `f${Date.now().toString(36)}-${counter.current++}`,
          name: file.name,
          kind,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          status: "uploading",
        };
        setPending((p) => [...p, item]);
        void uploadOne(file, item.key);
      }
    },
    [pending.length, uploadOne]
  );

  /** Uploaded (done) attachments to attach to the outgoing message. */
  const attachments: TicketAttachment[] = useMemo(
    () =>
      pending
        .filter((x) => x.status === "done" && typeof x.url === "string")
        .map((x) => ({ url: x.url as string, name: x.name, kind: x.kind, size: x.size })),
    [pending]
  );

  const uploadingCount = useMemo(() => pending.filter((x) => x.status === "uploading").length, [pending]);

  return { pending, attachments, uploadingCount, inputRef, pick, remove, reset };
}

/** Paperclip button + hidden multi-file input + pending-attachment chips. */
export function TicketAttachmentBar({
  pending,
  uploadingCount,
  inputRef,
  onPick,
  onRemove,
  disabled,
}: {
  pending: PendingAttachment[];
  uploadingCount: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
}) {
  const full = pending.length >= MAX_FILES;
  return (
    <div className="space-y-2.5">
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((p) => (
            <div
              key={p.key}
              className="flex max-w-[250px] items-center gap-2 rounded-xl border bg-muted/40 py-1.5 pe-1 ps-1.5"
            >
              {p.kind === "image" ? (
                <img src={p.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Video className="h-5 w-5" aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold leading-4">{p.name}</span>
                <span className="block text-[10px] leading-4 text-muted-foreground">{formatAttachmentSize(p.size)}</span>
              </span>
              {p.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-label="در حال بارگذاری فایل" />
              ) : (
                <button
                  type="button"
                  onClick={() => onRemove(p.key)}
                  aria-label={`حذف پیوست ${p.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
          aria-label="افزودن پیوست تصویر یا ویدیو"
          title="افزودن پیوست تصویر یا ویدیو"
          className="h-11 w-11 shrink-0 rounded-xl"
        >
          <Paperclip className="h-4 w-4" aria-hidden />
        </Button>
        <p className="min-w-0 flex-1 text-[10px] leading-4 text-muted-foreground" aria-live="polite">
          {uploadingCount > 0
            ? `${uploadingCount.toLocaleString("fa-IR")} فایل در حال بارگذاری است…`
            : full
              ? "سقف ۴ فایل برای این پیام پر شده است"
              : "پیوست تصویر یا ویدیو — حداکثر ۴ فایل (تصویر تا ۵ و ویدیو تا ۶۴ مگابایت)"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          aria-label="انتخاب فایل پیوست"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
      </div>
    </div>
  );
}

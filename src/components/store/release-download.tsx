"use client";

/**
 * ReleaseDownload — v31 · local delivery widget
 *
 * The user asked to grab the released v31 build straight from THIS sandbox
 * chat session. Chat messages can't carry 19 MB attachments, so the zip is
 * served as a static asset from `public/downloads/` and this always-visible
 * floating button (bottom-right; the AI chat FAB owns bottom-left) hands it
 * over with one click — including the sha256 checksum so the download can
 * be verified byte-for-byte against the release manifest.
 *
 * Dev-only convenience: `public/downloads/` is git-ignored, so nothing here
 * ever reaches the GitHub repo or a customer-facing production build.
 */

import { useState } from "react";
import { Download, PackageCheck, X, Copy, Check, HardDriveDownload } from "lucide-react";

const SHA256 = "02cd4e008b352bab19f377ab4338cb7132b6962c10ba619f5de3f5eb220653a4";

const FILES = [
  {
    href: "/downloads/taj-electronics-v31.zip",
    filename: "taj-electronics-v31.zip",
    title: "نسخهٔ کامل v31",
    subtitle: "پکیج رسمی انتشار — ۲۵ قالب + پنل مدیریت + ویزارد نصب",
    size: "۱۹.۸ مگابایت",
    primary: true,
  },
  {
    href: "/downloads/Taj%20Electronics%20Main%20V13%20VC.zip",
    filename: "Taj Electronics Main V13 VC.zip",
    title: "نسخهٔ خط نصب یک‌خطی",
    subtitle: "همان v31 با نام سازگار دستور: unzip && bash install.sh",
    size: "۱۹.۸ مگابایت",
    primary: false,
  },
];

export function ReleaseDownload() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(SHA256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable in some iframe previews — the hash is still
       * visible in the panel for manual verification */
    }
  };

  return (
    <div className="rd-widget" dir="rtl">
      {/* floating launcher — bottom-right, mirrors the AI chat FAB on the left */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "بستن پنل دانلود نسخه" : "دانلود فایل نسخهٔ ۳۱"}
        aria-expanded={open}
        className="fixed right-5 bottom-5 z-50 grid place-items-center h-14 w-14 rounded-full gold-surface text-primary-foreground shadow-2xl shadow-primary/30 transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <PackageCheck className="h-6 w-6" />}
        {!open && (
          <span className="rd-ping absolute inset-0 rounded-full animate-ping bg-primary/30 [animation-duration:2.5s]" />
        )}
        {!open && (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1.5 rounded-full bg-card text-foreground border shadow text-[10px] font-black grid place-items-center">
            v31
          </span>
        )}
      </button>

      {/* download panel */}
      {open && (
        <div
          role="dialog"
          aria-label="دانلود نسخهٔ ۳۱ تاج الکترونیکس"
          className="fixed right-5 z-50 w-[min(400px,calc(100vw-2.5rem))] rounded-2xl glass shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          style={{ bottom: 88 }}
        >
          <div className="gold-surface px-4 py-3 text-primary-foreground flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black leading-5">دانلود مستقیم نسخهٔ ۳۱</p>
              <p className="text-[11px] font-bold opacity-90 leading-4">
                تاج الکترونیکس — نسخهٔ داخلی 26.0.0
              </p>
            </div>
          </div>

          <div className="p-3 space-y-2.5 bg-card/60">
            {FILES.map((f) => (
              <a
                key={f.filename}
                href={f.href}
                download={f.filename}
                className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-lg ${
                  f.primary
                    ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-background/60 hover:bg-muted/60"
                }`}
              >
                <span
                  className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${
                    f.primary ? "gold-surface text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <Download className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-black leading-5 ${f.primary ? "text-primary" : "text-foreground"}`}>
                    {f.title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground leading-4 truncate">
                    {f.subtitle}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5" dir="ltr">
                    {f.filename} · {f.size}
                  </span>
                </span>
              </a>
            ))}

            {/* checksum verification */}
            <div className="rounded-xl border bg-muted/40 p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[11px] font-bold text-muted-foreground">SHA-256 (برای تأیید صحت فایل)</p>
                <button
                  onClick={copyHash}
                  aria-label="کپی کد تأیید SHA-256"
                  className="grid place-items-center h-7 w-7 rounded-lg border bg-background text-muted-foreground hover:text-foreground hover:bg-card transition-colors shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground break-all leading-4" dir="ltr">
                {SHA256}
              </p>
            </div>

            <p className="text-[10px] text-muted-foreground leading-4 text-center px-1">
              هر دو فایل یکسان‌اند (Checksum برابر) — فقط نام فایل دوم برای دستور نصب یک‌خطی ساخته شده است.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

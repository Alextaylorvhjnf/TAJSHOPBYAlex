"use client";

/**
 * v32 — shared slide MEDIA + COUNTDOWN (template-content 2.0)
 * -----------------------------------------------------------------------
 * Two tiny presentation helpers used by the hero-slider templates:
 *
 *  ① SlideHeroMedia — renders the slide's optional VIDEO (uploaded via the
 *     template-content editor, ≤100MB) as a muted autoPlay loop <video> with
 *     the artwork as poster; without a video it falls back to the shared
 *     responsive <SlideArt> (desktop + optional mobile artwork). One-line
 *     surgical swap inside any hero: <SlideArt …> → <SlideHeroMedia …>.
 *
 *  ② SlideCountdown — the per-slide countdown chip (روز/ساعت/دقیقه/ثانیه in
 *     fa-IR digits) the admin arms with a checkbox + datetime in the editor.
 *     Dark glass chip with a subtle pulse, positioned over the slide. Ticks
 *     client-side (SSR renders stable dash placeholders until mount).
 *
 * Both are opt-in per slide (fields live on TemplateSlide): slides without
 * video/countdown render exactly as before.
 */

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toFaDigits } from "@/lib/format";
import { SlideArt } from "./slide-image";
import type { TemplateSlide } from "@/lib/templates/types";

/* ────────────────────────── countdown chip ────────────────────────── */

/** seconds left until an ISO target (null = not mounted yet / unparsable) */
function useSecondsLeft(target: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = Date.parse(target);
    if (Number.isNaN(end)) return;
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return left;
}

const UNITS = [
  { key: "d", label: "روز", div: 86_400 },
  { key: "h", label: "ساعت", div: 3_600 },
  { key: "m", label: "دقیقه", div: 60 },
  { key: "s", label: "ثانیه", div: 1 },
] as const;

export function SlideCountdown({
  target,
  label,
  className,
}: {
  /** ISO datetime to count down to */
  target: string;
  /** optional Persian chip label, e.g. «تخفیف بهاره» */
  label?: string | null;
  className?: string;
}) {
  const left = useSecondsLeft(target);
  const ended = left !== null && left <= 0;

  return (
    <div
      dir="rtl"
      role="timer"
      aria-label={label ? `${label} — زمان باقی‌مانده` : "زمان باقی‌مانده"}
      className={cn(
        /* dark glass chip + subtle pulse ring */
        "smc-chip inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl",
        "border border-white/15 bg-black/45 px-3.5 py-2 backdrop-blur-md",
        "shadow-[0_10px_36px_-12px_rgba(0,0,0,.8)]",
        className,
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-black text-white/80">
        <Timer className="smc-pulse h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
        {label}
      </span>
      {ended ? (
        <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10.5px] font-black text-white/70">
          پایان یافت
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1">
          {UNITS.map((u) => {
            /* SSR / pre-mount: stable dash placeholders (no layout shift) */
            const v =
              left === null
                ? "--"
                : toFaDigits(String(Math.floor(left / u.div) % (u.key === "d" ? Infinity : u.div)).padStart(2, "0"));
            return (
              <span key={u.key} className="flex items-center gap-0.5">
                <span className="min-w-[1.7em] rounded-md border border-white/12 bg-white/[0.07] px-1 py-0.5 text-center text-[11.5px] font-black tabular-nums text-white">
                  {v}
                </span>
                <span className="text-[8.5px] font-bold text-white/55">{u.label}</span>
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}

/* ────────────────────────── media (video | art) ────────────────────────── */

export function SlideHeroMedia({
  slide,
  alt,
  fill = true,
  sizes,
  priority,
  loading,
  className,
  style,
}: {
  slide: Pick<TemplateSlide, "image" | "mobileImage" | "title" | "videoUrl">;
  alt?: string;
  fill?: boolean;
  sizes: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  className?: string;
  style?: React.CSSProperties;
}) {
  const video = slide.videoUrl?.trim();

  if (video) {
    /* cinematic hero loop — muted + playsInline so autoplay is allowed
     * everywhere; the artwork doubles as the poster while it loads */
    return (
      <video
        src={video}
        poster={slide.image || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt ?? slide.title ?? undefined}
        className={cn(fill ? "absolute inset-0 h-full w-full" : "h-full w-full", className)}
        style={style}
      />
    );
  }

  return (
    <SlideArt
      slide={slide}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loading={loading}
      className={className}
      style={style}
    />
  );
}

/* tiny scoped CSS: the chip's soft pulse (reduced-motion safe) */
export const SLIDE_MEDIA_CSS = `
.smc-pulse{animation:smc-pulse 2.4s ease-in-out infinite}
@keyframes smc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.92)}}
@media (prefers-reduced-motion:reduce){.smc-pulse{animation:none}}
`;

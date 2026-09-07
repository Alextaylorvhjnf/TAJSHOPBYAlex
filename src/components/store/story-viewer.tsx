"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, Package, BadgeCheck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { storyHref, type StoryItem } from "./stories-row";

/** Fallback slide duration when a story has no admin-configured one. */
const DEFAULT_STORY_MS = 6000;
const SWIPE_PX = 48;
const TAP_MS = 250;

/** Per-story duration (spec §26): admin-configurable ms per slide. */
export function storyDuration(s: StoryItem | undefined): number {
  const d = s?.duration;
  return typeof d === "number" && d >= 1000 ? d : DEFAULT_STORY_MS;
}

/**
 * Full-screen Instagram-style story viewer.
 *
 * Rendered through a React **portal to document.body** — this is the
 * architectural fix for the broken viewer: when the viewer was rendered
 * inside the scroll-reveal wrapper (`.reveal-item` uses
 * `will-change: transform`), that wrapper became the containing block for
 * `position: fixed`, clipping the modal to the 116px-tall stories row
 * instead of the viewport. Portals also isolate the z-index stacking
 * context.
 *
 * Layout adapts by device:
 * - mobile: true full-bleed 100dvh (no overflow, native feel)
 * - desktop/tablet: centered 9:16 card (≤ 88vh) with rounded corners,
 *   dark stage backdrop — uses the available screen size intelligently
 *   without an oversized/broken modal
 *
 * Interactions: auto-advance + hold-to-pause, swipe (RTL), tap zones,
 * keyboard (← next / → prev / Esc), auto-close at the end,
 * prefers-reduced-motion → no auto-advance.
 */
export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  /* video story state: real duration (ms) once metadata loads; null until then */
  const [videoMs, setVideoMs] = useState<number | null>(null);
  /* if the video errors out, fall back to image-timer behavior */
  const [videoFailed, setVideoFailed] = useState(false);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  const columnRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointer = useRef<{ x: number; t: number } | null>(null);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  const story = stories[index];
  const href = story ? storyHref(story) : "/products";
  const isVideo = !!(story?.videoUrl && !videoFailed);

  // index via ref so `advance` stays referentially stable
  const indexRef = useRef(index);
  indexRef.current = index;

  const advance = useCallback(
    (dir: 1 | -1) => {
      const next = indexRef.current + dir;
      if (next < 0) return;
      if (next >= stories.length) {
        onClose();
        return;
      }
      elapsedRef.current = 0;
      startedAtRef.current = Date.now();
      setProgressKey((k) => k + 1);
      setIndex(next);
    },
    [stories.length, onClose]
  );

  /* auto-advance — duration matches the CSS `--story-duration` (per-story).
   * VIDEO stories advance on the <video> `ended` event instead (spec §10);
   * the image timer only runs when there is no playable video. */
  const duration = storyDuration(story);
  useEffect(() => {
    if (paused || reduced || !story) return;
    if (isVideo) return; // driven by onEnded
    const remaining = Math.max(250, duration - elapsedRef.current);
    const t = setTimeout(() => advance(1), remaining);
    return () => clearTimeout(t);
  }, [index, paused, reduced, story, advance, duration, isVideo]);

  /* reset per-video state when the story index changes */
  useEffect(() => {
    setVideoMs(null);
    setVideoFailed(false);
  }, [index]);

  /* pause/resume the video element with the hold state */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => setVideoFailed(true));
  }, [paused, index, isVideo]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        advance(1); // RTL: left = next
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        advance(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, onClose]);

  /* body scroll lock + focus + portal readiness */
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    columnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const holdStart = () => {
    elapsedRef.current = Math.min(duration, Date.now() - startedAtRef.current);
    setPaused(true);
  };
  const holdEnd = () => setPaused(false);

  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, t: Date.now() };
    holdStart();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    /* tap on the stage background (outside the card) = close — desktop */
    if (e.target === e.currentTarget) {
      pointer.current = null;
      holdEnd();
      onClose();
      return;
    }
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    const dx = e.clientX - p.x;

    /* horizontal swipe — RTL: finger-left = next */
    if (Math.abs(dx) > SWIPE_PX) {
      holdEnd();
      advance(dx < 0 ? 1 : -1);
      return;
    }
    /* taps on interactive children (close / links) keep their own behavior */
    if ((e.target as HTMLElement).closest("a,button")) {
      holdEnd();
      return;
    }
    if (Date.now() - p.t < TAP_MS) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const rel = (e.clientX - rect.left) / rect.width; // 0..1 within the card
      if (rel > 0.58) {
        holdEnd();
        advance(1); // start side (RTL) = next
      } else if (rel < 0.42) {
        holdEnd();
        advance(-1); // end side = prev
      } else {
        /* middle tap — resume (was paused by the hold) */
        setPaused(false);
      }
    } else {
      holdEnd(); // long hold released → resume
    }
  };

  if (!story) return null;
  if (!mounted) return null;

  const effective = story.product?.discountPrice ?? story.product?.price ?? null;

  const content = (
    <div
      className="fixed inset-0 z-[100] animate-fade"
      style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`استوری ${story.title}`}
    >
      {/* backdrop click = close */}
      <button
        type="button"
        aria-label="بستن استوری"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      {/* true pause for the CSS progress fill */}
      {paused && <style>{".story-viewer-paused .story-progress span.is-active::after{animation-play-state:paused}"}</style>}

      {/*
        Adaptive stage:
        - base (mobile): full-bleed column, h-dvh, w-full
        - sm+ (tablet/desktop): centered 9:16 card, height ≤ 86vh/86dvh,
          rounded-3xl with elevated shadow + subtle ring
      */}
      <div
        className="absolute inset-0 flex items-center justify-center sm:p-6 md:p-10"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointer.current = null;
          holdEnd();
        }}
      >
        <div
          ref={columnRef}
          tabIndex={-1}
          role="group"
          aria-label={`استوری ${index + 1} از ${stories.length}`}
          className={cn(
            "relative flex w-full flex-col overflow-hidden bg-black outline-none",
            "h-dvh",
            // tablet / desktop: elegant centered phone-like card
            "sm:h-[min(86vh,86dvh)] sm:w-auto sm:aspect-[9/16] sm:max-w-[26rem] sm:rounded-3xl sm:shadow-2xl sm:ring-1 sm:ring-white/15",
            paused && "story-viewer-paused"
          )}
        >
          {/* progress bars — for video stories the bar duration is the REAL
             video duration once metadata loads (spec §10) */}
          <div className="story-progress relative z-20 flex gap-1.5 px-3 pt-3">
            {stories.map((s, i) => (
              <span
                key={i === index ? `active-${progressKey}-${i}-${isVideo ? (videoMs ?? duration) : duration}` : s.id}
                className={cn(i < index && "is-done", i === index && "is-active")}
                style={
                  i === index && !reduced
                    ? ({ "--story-duration": `${(isVideo ? (videoMs ?? duration) : duration)}ms` } as React.CSSProperties)
                    : undefined
                }
              />
            ))}
          </div>

          {/* title / badge / close */}
          <div className="relative z-20 flex items-center gap-2 px-3 pb-2 pt-3 text-white">
            <span className="truncate text-[13px] font-bold [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{story.title}</span>
            {story.badge && (
              <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                {story.badge}
              </span>
            )}
            <span className="ms-auto hidden shrink-0 text-[10px] font-medium text-white/50 tabular-nums sm:block">
              {(index + 1).toLocaleString("fa-IR")} / {stories.length.toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن استوری"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* story media — full bleed. VIDEO stories (spec §10): <video> with
             poster = the story image; progress follows video.duration; ended →
             next story; muted autoplay (browser-policy safe). */}
          <div className="relative flex-1 overflow-hidden">
            {story.videoUrl && !videoFailed ? (
              <video
                key={story.id}
                ref={videoRef}
                src={story.videoUrl}
                poster={story.image}
                autoPlay
                muted
                playsInline
                preload="auto"
                aria-label={story.title}
                className={cn("h-full w-full object-cover", !reduced && "animate-fade")}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0.1) setVideoMs(Math.round(d * 1000));
                }}
                onEnded={() => advance(1)}
                onError={() => setVideoFailed(true)}
              />
            ) : (
              <Image
                key={story.id}
                src={story.image}
                alt={story.title}
                fill
                sizes="(max-width: 640px) 100vw, 420px"
                priority
                className={cn("object-cover", !reduced && "animate-fade")}
              />
            )}
            {/* brand-tinted scrim for legibility (token-driven) */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), color-mix(in oklab, var(--primary) 18%, transparent) 55%, transparent)" }}
            />
          </div>

          {/* pause indicator */}
          {paused && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                <Play className="h-6 w-6 fill-white" />
              </span>
            </div>
          )}

          {/* v25: prev/next chevrons INSIDE the card, visible on every screen
              size — tap the right (RTL start) side for the next story, the
              left side for the previous one. Interactive buttons keep their
              own behavior (the tap-zone handler skips a,button targets). */}
          <button
            type="button"
            aria-label="استوری بعدی"
            onClick={(e) => {
              e.stopPropagation();
              advance(1);
            }}
            className="absolute start-2.5 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:scale-105 hover:bg-black/65"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="استوری قبلی"
            onClick={(e) => {
              e.stopPropagation();
              advance(-1);
            }}
            className="absolute end-2.5 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:scale-105 hover:bg-black/65"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* product mini-card + CTA */}
          <div className="relative z-20 px-3 pb-5">
            {story.product ? (
              <Link
                href={`/products/${story.product.slug}`}
                onClick={onClose}
                className="glass group flex items-center gap-3 rounded-2xl p-2.5 text-card-foreground transition-transform active:scale-[0.98]"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {story.product.mainImage ? (
                    <Image src={story.product.mainImage} alt={story.product.name} fill sizes="48px" className="object-contain p-1" />
                  ) : (
                    <span className="grid h-full place-items-center text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <BadgeCheck className="h-3 w-3 text-primary" />
                    محصول مرتبط
                  </span>
                  <span className="block truncate text-[13px] font-bold leading-5">{story.product.name}</span>
                  {effective !== null && (
                    <span className="block text-[12px] font-extrabold text-primary tabular-nums">
                      {formatPrice(effective)} تومان
                    </span>
                  )}
                </span>
                <span className="gold-surface inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-3.5 text-[12px] font-bold text-primary-foreground transition-opacity group-hover:opacity-90">
                  مشاهده محصول
                  <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              </Link>
            ) : (
              <Link
                href={href}
                onClick={onClose}
                className="gold-surface group inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-[13px] font-bold text-primary-foreground shadow-lg transition-transform active:scale-[0.97]"
              >
                {story.category ? `مشاهده ${story.category.name}` : "مشاهده"}
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryViewer } from "./story-viewer";

export interface StoryItem {
  id: string;
  title: string;
  image: string;
  /** optional story video (spec §10) — viewer plays it, progress follows video */
  videoUrl?: string | null;
  /** per-story slide duration ms (spec §26) — falls back to 6s */
  duration?: number;
  linkUrl: string | null;
  badge: string | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice: number | null;
    mainImage: string | null;
  } | null;
  category?: { name: string; slug: string } | null;
}

/** Link resolution: linkUrl > product > category */
export function storyHref(s: StoryItem): string {
  if (s.linkUrl) return s.linkUrl;
  if (s.product) return `/products/${s.product.slug}`;
  if (s.category) return `/products?category=${s.category.slug}`;
  return "/products";
}

/* ── auto-scroll tuning ── */
const AUTO_PX_PER_SEC = 14; // slow, elegant, continuous

/**
 * Premium horizontal Stories scroller — Instagram-style.
 *
 * Supports an arbitrary number of stories (10, 15, 20+ — DB driven, no
 * code limits): the row becomes horizontally scrollable.
 *
 * - native touch swipe + momentum (overflow-x + snap)
 * - mouse wheel / trackpad → horizontal scroll (desktop)
 * - pointer drag-to-scroll (desktop)
 * - subtle continuous auto-movement (paused on hover / touch / drag /
 *   viewer-open / tab-hidden; respects prefers-reduced-motion; wraps to
 *   the start at the end like a premium carousel)
 * - hidden native scrollbar (no-scrollbar) with edge fade masks
 */
export function StoriesRow({ stories, className }: { stories: StoryItem[]; className?: string }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* interaction flags (refs — no re-render) */
  const hoveredRef = useRef(false);
  const touchingRef = useRef(false);
  const draggingRef = useRef(false);
  const dragPointer = useRef<{ id: number; startX: number; startScroll: number; moved: boolean } | null>(null);
  const rafRef = useRef<number | null>(null);
  /* ping-pong direction — smoother than a jump-wrap (RTL scrollLeft ∈ [min, 0]) */
  const autoDirRef = useRef(-1); // -1 = toward the left (next stories)
  /* fractional drift accumulator — browsers round `scrollLeft` assignments
     to integer pixels, so sub-pixel per-frame increments silently round to 0 */
  const driftAccRef = useRef(0);

  const canAutoScroll = !reduced && stories.length > 4;

  /* ── continuous auto-movement (rAF loop, ping-pong at the edges) ── */
  useEffect(() => {
    if (!canAutoScroll) return;
    let last = performance.now();
    const tick = (now: number) => {
      const row = rowRef.current;
      if (row) {
        const dt = Math.max(0, (now - last) / 1000);
        last = now;
        const idle =
          !hoveredRef.current && !touchingRef.current && !draggingRef.current && !document.hidden;
        if (idle && row.scrollWidth > row.clientWidth) {
          // RTL rows: scrollLeft is 0 at the start (right edge) and negative
          // toward the left. Ping-pong between the two edges — no jarring jump.
          const min = row.clientWidth - row.scrollWidth; // negative in RTL
          if (row.scrollLeft <= min + 1) autoDirRef.current = 1; // at far end → reverse
          else if (row.scrollLeft >= -1) autoDirRef.current = -1; // at start → forward
          driftAccRef.current += autoDirRef.current * AUTO_PX_PER_SEC * dt;
          if (Math.abs(driftAccRef.current) >= 1) {
            const apply = Math.trunc(driftAccRef.current);
            driftAccRef.current -= apply;
            row.scrollLeft += apply;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canAutoScroll]);

  /* ── wheel → horizontal scroll (desktop, non-passive) ── */
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal
      const canScroll = row.scrollWidth > row.clientWidth;
      if (!canScroll) return;
      // only hijack when the row itself is the scroll target context
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, []);

  /* ── drag-to-scroll (desktop pointer) ── */
  const onRowPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // native touch scroll
    const row = rowRef.current;
    if (!row) return;
    draggingRef.current = true;
    dragPointer.current = { id: e.pointerId, startX: e.clientX, startScroll: row.scrollLeft, moved: false };
  };

  const onRowPointerMove = (e: React.PointerEvent) => {
    const row = rowRef.current;
    const drag = dragPointer.current;
    if (!row || !drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) {
      row.scrollLeft = drag.startScroll - dx;
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragPointer.current;
    if (drag && drag.id === e.pointerId) {
      dragPointer.current = null;
      // delay re-enabling auto-scroll a bit after a drag
      window.setTimeout(() => (draggingRef.current = false), 900);
    } else {
      draggingRef.current = false;
    }
  };

  const scroll = useCallback((dir: "next" | "prev") => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>("[data-story-card]");
    const amount = (card?.offsetWidth ?? 88) + 16;
    row.scrollBy({ left: dir === "next" ? -amount : amount, behavior: "smooth" });
  }, []);

  const rowProps = {
    ref: rowRef,
    role: "list" as const,
    tabIndex: 0,
    "aria-label": "استوری‌های فروشگاه — برای مرور اسکرول کنید",
    // NOTE: no CSS scroll-snap here on purpose — snap points fight the
    // continuous auto-drift (each programmatic scrollLeft assignment
    // re-snaps to the nearest point and cancels the movement). Free
    // momentum scrolling also feels more native for a stories row.
    className: "flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl",
    onPointerDown: onRowPointerDown,
    onPointerMove: onRowPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onPointerLeave: (e: React.PointerEvent) => {
      endDrag(e);
      hoveredRef.current = false;
    },
    onPointerEnter: () => {
      hoveredRef.current = true;
    },
    onTouchStart: () => {
      touchingRef.current = true;
    },
    onTouchEnd: () => {
      // resume auto-scroll shortly after the gesture settles
      window.setTimeout(() => (touchingRef.current = false), 1200);
    },
  };

  if (stories.length === 0) return null;

  return (
    <section
      className={cn("relative group/stories", className)}
      aria-label="استوری‌های فروشگاه"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
    >
      {/* edge fade masks (top layer, pointer-events-none) */}
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-8 bg-gradient-to-l from-transparent to-background sm:w-12" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-8 bg-gradient-to-r from-transparent to-background sm:w-12" aria-hidden />

      <div {...rowProps}>
        {stories.map((s, i) => (
          <div key={s.id} data-story-card role="listitem" className="shrink-0">
            <button
              type="button"
              onClick={() => {
                // stop auto movement while the viewer is open (viewerIndex !== null)
                draggingRef.current = true;
                setViewerIndex(i);
              }}
              aria-label={`مشاهده استوری ${s.title}`}
              className="group/card flex w-20 sm:w-[88px] flex-col items-center gap-1.5 focus-visible:outline-offset-4"
            >
              <span className="story-ring relative block rounded-full p-[3px] transition-transform duration-300 group-hover/card:scale-105 group-active/card:scale-95">
                <span className="block h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-background bg-muted">
                  <Image
                    src={s.image}
                    alt={s.title}
                    width={72}
                    height={72}
                    sizes="72px"
                    priority={i < 2}
                    className="h-full w-full object-cover"
                  />
                </span>
                {s.videoUrl && (
                  <span
                    className="absolute bottom-0.5 end-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white backdrop-blur"
                    aria-label="استوری ویدیویی"
                  >
                    <Play className="h-2.5 w-2.5 fill-white" />
                  </span>
                )}
                {s.badge && (
                  <span className="absolute -bottom-1.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border bg-card px-2 py-px text-[9px] font-bold text-primary shadow-sm">
                    {s.badge}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium leading-4 text-muted-foreground group-hover/card:text-foreground">
                {s.category?.name ?? s.product?.name ?? s.title}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* desktop arrows (always available when row overflows) */}
      {stories.length > 5 && (
        <>
          <button
            type="button"
            onClick={() => scroll("prev")}
            aria-label="استوری‌های قبلی"
            className="absolute end-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border bg-card/95 shadow-lg backdrop-blur transition-all hover:scale-110 hover:border-primary/40 md:grid md:opacity-0 md:group-hover/stories:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("next")}
            aria-label="استوری‌های بعدی"
            className="absolute start-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border bg-card/95 shadow-lg backdrop-blur transition-all hover:scale-110 hover:border-primary/40 md:grid md:opacity-0 md:group-hover/stories:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          onClose={() => {
            setViewerIndex(null);
            window.setTimeout(() => (draggingRef.current = false), 600);
          }}
        />
      )}
    </section>
  );
}

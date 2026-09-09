"use client";

/**
 * SCROLL-FX — shared scroll-animation system (v32 · task 14-a)
 * ---------------------------------------------------------------------
 * One reusable kit powering the owner's requested scroll motion across
 * storefront templates:
 *   · <RevealOnScroll>  — fade / slide / zoom / 3D-tilt entrances with
 *                         stagger delays (fade-up by default)
 *   · <FlipOnScroll>    — 3D "book page" rotateY reveal (phones, catalog
 *                         pages, product showcases turning like a page)
 *   · <ParallaxBand>    — a ribbon/band translating vertically while the
 *                         visitor scrolls (rAF, transform-only, passive)
 *   · <GlowOnScroll>    — lights "ramp on" when scrolled into view (the
 *                         gaming-mouse effect: dim → glowing)
 *   · useInViewOnce()   — the IntersectionObserver hook behind it all
 *
 * SSR / no-JS safety (zero blank content, zero layout shift):
 *   The CSS defaults every element to FULLY VISIBLE. The hidden /
 *   "pre-reveal" states apply ONLY under `html.sfx-js` — a class the
 *   components add to <html> after mount, i.e. once JavaScript is really
 *   running. Server HTML, crawlers and JS-disabled visitors always see
 *   the finished page.
 *
 * prefers-reduced-motion: a hard CSS kill-switch (everything forced
 * visible, parallax JS bails entirely) + the rAF loop checks it too.
 *
 * HOW TO USE IN A TEMPLATE:
 *   1. import { RevealOnScroll, SCROLL_FX_CSS, … } from "./scroll-fx";
 *   2. append SCROLL_FX_CSS to the template's own scoped <style> block
 *      (it is class-scoped, so it is inert wherever the components are
 *      not rendered);
 *   3. wrap sections / cards / product showcases with the components.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══ 1 · the hook ═══════════════════════════════════════════════════ */

export type UseInViewOnceOptions = {
  /** fraction of the element that must be visible (default 0.15) */
  threshold?: number;
  /** IntersectionObserver rootMargin (default triggers slightly early) */
  rootMargin?: string;
};

/** IntersectionObserver one-shot: `inView` flips to true exactly once and
 *  stays true (entrances never re-hide). Falls back to visible when IO is
 *  unavailable. The returned ref must be attached to a real element. */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(
  { threshold = 0.15, rootMargin = "0px 0px -6% 0px" }: UseInViewOnceOptions = {},
) {
  const ref = useRef<T | null>(null);
  // Fallback: no IntersectionObserver (SSR pass + ancient browsers) → start
  // visible. Computed identically on server & client → no hydration mismatch,
  // and the effect never calls setState synchronously.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    markSfxRoot();
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView] as const;
}

/* Mark <html> as "JS is driving scroll-fx" — the gate the CSS keys on.
 * Idempotent, effect-time only (never during SSR, so hydration output of
 * the server-rendered <html> is untouched). */
function markSfxRoot() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("sfx-js");
  }
}

/** stagger helper — delay for child index `i` (caps so long grids don't
 *  wait forever): delay = min(i, cap) * step ms. */
export function sfxStagger(i: number, step = 70, cap = 8): number {
  return Math.min(i, cap) * step;
}

/* ═══ 2 · <RevealOnScroll> ═══════════════════════════════════════════ */

export type RevealVariant =
  | "fade" /* opacity only */
  | "up" /* slides up from below (default) */
  | "down" /* drops down from above */
  | "start" /* slides in from the inline-start edge (RIGHT in RTL fa) */
  | "end" /* slides in from the inline-end edge (LEFT in RTL fa) */
  | "zoom" /* scales up from 86% */
  | "tilt"; /* 3D perspective tilt + rise — product-card flavor */

export type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** entrance geometry (default "up") */
  variant?: RevealVariant;
  /** transition delay in ms — pair with sfxStagger() for grids */
  delay?: number;
  /** pass-through to the wrapper element */
  style?: CSSProperties;
} & UseInViewOnceOptions;

export function RevealOnScroll({
  children,
  className,
  variant = "up",
  delay = 0,
  threshold,
  rootMargin,
  style,
}: RevealOnScrollProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold, rootMargin });
  return (
    <div
      ref={ref}
      data-v={variant}
      className={cn("sfx-rv", inView && "sfx-in", className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  );
}

/* ═══ 3 · <FlipOnScroll> ═════════════════════════════════════════════ */

export type FlipOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** resting rotation before the flip lands (default 64°) */
  degrees?: number;
  /** which edge acts as the spine (default "start" = RIGHT in RTL — a
   *  Persian book page / phone turning over its right-hand spine) */
  origin?: "start" | "end";
  /** transition delay in ms */
  delay?: number;
  /** wrapper perspective in px (default 1500 — increase for subtler 3D) */
  perspective?: number;
  /** pass-through to the inner flipping element */
  style?: CSSProperties;
} & UseInViewOnceOptions;

export function FlipOnScroll({
  children,
  className,
  degrees = 64,
  origin = "start",
  delay = 0,
  perspective = 1500,
  threshold,
  rootMargin,
  style,
}: FlipOnScrollProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: threshold ?? 0.22, rootMargin });
  return (
    <div className="sfx-flip-wrap" style={{ "--sfx-persp": `${perspective}px` } as CSSProperties}>
      <div
        ref={ref}
        className={cn("sfx-flip", inView && "sfx-in", className)}
        style={{
          "--sfx-fd": `${origin === "start" ? degrees : -degrees}deg`,
          "--sfx-fo": origin === "start" ? "right center" : "left center",
          transitionDelay: delay ? `${delay}ms` : undefined,
          ...style,
        } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

/* ═══ 4 · <ParallaxBand> ═════════════════════════════════════════════ */

export type ParallaxBandProps = {
  children?: ReactNode;
  className?: string;
  /** 0…1 — how much of the scroll delta the band rides (default 0.16) */
  speed?: number;
  /** max absolute translate in px — keeps huge screens sane (default 130) */
  range?: number;
  /** pass-through to the band element */
  style?: CSSProperties;
};

/** A decorative ribbon that drifts vertically as the page scrolls
 *  (translate3d only — composited, no reflow). SSR renders it unmoved;
 *  prefers-reduced-motion leaves it pinned. Place inside an
 *  overflow-hidden parent; the band is usually absolutely positioned. */
export function ParallaxBand({ children, className, speed = 0.16, range = 130, style }: ParallaxBandProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let queued = false;
    const apply = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const centerDelta = rect.top + rect.height / 2 - vh / 2; /* + band below center */
      const y = Math.max(-range, Math.min(range, -centerDelta * speed));
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = window.requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [speed, range]);

  return (
    <div ref={ref} className={cn("sfx-parallax", className)} style={style}>
      {children}
    </div>
  );
}

/* ═══ 5 · <GlowOnScroll> ═════════════════════════════════════════════ */

export type GlowOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** glow color — any CSS color (default teal #2DD4BF) */
  color?: string;
  /** glow blur radius in px (default 46) */
  size?: number;
  /** dim the element until it lights up (default true — the "lights
   *  off → on" ramp). Children can opt into LED effects with .sfx-lamp */
  dim?: boolean;
  /** glow ramp delay in ms */
  delay?: number;
  style?: CSSProperties;
} & UseInViewOnceOptions;

export function GlowOnScroll({
  children,
  className,
  color,
  size,
  dim = true,
  delay = 0,
  threshold,
  rootMargin,
  style,
}: GlowOnScrollProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: threshold ?? 0.3, rootMargin });
  return (
    <div
      ref={ref}
      data-dim={dim ? "1" : undefined}
      className={cn("sfx-glow", inView && "sfx-in", className)}
      style={{
        ...(color ? ({ "--sfx-glow-color": color } as CSSProperties) : {}),
        ...(size ? ({ "--sfx-glow-size": `${size}px` } as CSSProperties) : {}),
        transitionDelay: delay ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══ 6 · the shared CSS ═════════════════════════════════════════════
 * Append into a template's scoped <style> (see file header). Class-
 * scoped + gated on html.sfx-js, so it is a no-op everywhere the
 * components are not mounted and for no-JS visitors.                  */
export const SCROLL_FX_CSS = `
/* ── scroll-fx (v32 · 14-a) — default state is VISIBLE; html.sfx-js (added by JS) enables entrances ── */
.sfx-rv,.sfx-flip,.sfx-glow,.sfx-parallax{will-change:auto}
html.sfx-js .sfx-rv{transition:opacity .75s cubic-bezier(.22,1,.36,1),transform .75s cubic-bezier(.22,1,.36,1)}
html.sfx-js .sfx-rv:not(.sfx-in){opacity:0}
html.sfx-js .sfx-rv[data-v="up"]:not(.sfx-in){transform:translate3d(0,38px,0)}
html.sfx-js .sfx-rv[data-v="down"]:not(.sfx-in){transform:translate3d(0,-32px,0)}
html.sfx-js .sfx-rv[data-v="start"]:not(.sfx-in){transform:translate3d(48px,0,0)}
html.sfx-js .sfx-rv[data-v="end"]:not(.sfx-in){transform:translate3d(-48px,0,0)}
html.sfx-js .sfx-rv[data-v="zoom"]:not(.sfx-in){transform:scale3d(.86,.86,.86)}
html.sfx-js .sfx-rv[data-v="tilt"]:not(.sfx-in){transform:perspective(900px) rotateX(10deg) translate3d(0,34px,-46px)}

/* 3D book-page flip — spine on the inline-start edge (right in RTL) */
html.sfx-js .sfx-flip-wrap{perspective:var(--sfx-persp,1500px)}
html.sfx-js .sfx-flip{transform-origin:var(--sfx-fo,right center);transition:transform 1.05s cubic-bezier(.22,1,.36,1),opacity .8s ease;backface-visibility:hidden}
html.sfx-js .sfx-flip:not(.sfx-in){opacity:0;transform:rotateY(var(--sfx-fd,64deg)) translateZ(-80px)}

/* lights ramp on — glow + (optional) desaturated wait state */
html.sfx-js .sfx-glow{--sfx-glow-color:#2DD4BF;--sfx-glow-size:46px;transition:box-shadow 1.15s ease,filter 1.15s ease}
html.sfx-js .sfx-glow:not(.sfx-in){box-shadow:0 0 0 0 transparent}
html.sfx-js .sfx-glow[data-dim="1"]:not(.sfx-in){filter:saturate(.45) brightness(.72)}
html.sfx-js .sfx-glow.sfx-in{box-shadow:0 0 var(--sfx-glow-size) calc(var(--sfx-glow-size)*.38) color-mix(in srgb,var(--sfx-glow-color) 55%,transparent)}
.sfx-lamp{transition:opacity .9s ease,color .9s ease,text-shadow .9s ease,box-shadow .9s ease,filter .9s ease}
html.sfx-js .sfx-glow[data-dim="1"]:not(.sfx-in) .sfx-lamp{opacity:.14}
html.sfx-js .sfx-glow.sfx-in .sfx-lamp{opacity:1}

/* hard kill-switch — reduced motion always shows the final state */
@media (prefers-reduced-motion: reduce){
  html.sfx-js .sfx-rv:not(.sfx-in){opacity:1!important;transform:none!important;transition:none!important}
  html.sfx-js .sfx-flip:not(.sfx-in){opacity:1!important;transform:none!important;transition:none!important}
  html.sfx-js .sfx-glow:not(.sfx-in){box-shadow:0 0 var(--sfx-glow-size) calc(var(--sfx-glow-size)*.38) color-mix(in srgb,var(--sfx-glow-color) 55%,transparent)!important;filter:none!important}
  html.sfx-js .sfx-glow[data-dim="1"]:not(.sfx-in) .sfx-lamp{opacity:1!important}
  html.sfx-js .sfx-rv,html.sfx-js .sfx-flip,html.sfx-js .sfx-glow{transition:none!important}
  .sfx-lamp{transition:none!important}
}
`;

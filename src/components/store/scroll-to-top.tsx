"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * ScrollToTop — deterministic "full page view from the top" on every
 * client-side navigation (reported issue: "when I roll into a new page it
 * shows the middle of the page").
 *
 * Why a component (and not CSS): App Router navigation normally scrolls to
 * top, but `html { scroll-behavior: smooth }` (removed in globals.css) used
 * to turn that into an animated scroll that could be interrupted mid-flight,
 * leaving the page at a middle offset. This component scrolls INSTANTLY
 * (behavior "auto") after every pathname/query change, so a new page always
 * opens fully at the top.
 *
 * Hash handling: if the URL carries an anchor (#something), we honor it by
 * scrolling the element into view instead of the page top.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // wait one frame so the new page's DOM is painted before scrolling
    const raf = requestAnimationFrame(() => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (hash && hash.length > 1) {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) {
          el.scrollIntoView({ block: "start" });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, searchParams]);

  return null;
}

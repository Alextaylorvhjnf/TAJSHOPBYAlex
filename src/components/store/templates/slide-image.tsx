"use client";

/**
 * v23 — responsive slider artwork (shared across ALL storefront templates)
 * -----------------------------------------------------------------------
 * The admin slider form has two image fields: «تصویر دسکتاپ (الزامی)» and
 * «تصویر موبایل (اختیاری)». This component renders BOTH artworks so phones
 * (<sm screens) finally see the admin's mobile image when one was uploaded;
 * ≥sm (and whenever no mobile art exists) the desktop artwork renders.
 *
 * One DOM node is always display:none so SSR output stays stable — templates
 * swap their single hero <Image> for <SlideArt> without touching layout:
 * every class/style (object-fit, kenburns, opacity, scale, …) is applied to
 * BOTH images, so the visual result is identical on desktop.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TemplateSlide } from "@/lib/templates/types";

export type SlideArtProps = {
  /** the slide carrying the desktop + optional mobile artwork */
  slide: Pick<TemplateSlide, "image" | "mobileImage" | "title">;
  /** alt text (defaults to the slide title) */
  alt?: string;
  /** next/image fill mode (default true — same as the hero images it replaces) */
  fill?: boolean;
  /** next/image sizes hint — keep the template's existing value */
  sizes: string;
  /** next/image priority (hero slides above the fold pass priority) */
  priority?: boolean;
  /** next/image loading strategy (defaults to next/image's "lazy") */
  loading?: "lazy" | "eager";
  /** layout/object classes (object-cover, taj-kenburns-loop, …) — BOTH images */
  className?: string;
  /** inline style (e.g. { "--t-dur": "16s" } kenburns vars) — BOTH images */
  style?: React.CSSProperties;
};

/** Responsive slider artwork — phones (<sm) get the admin's mobile image when
 *  one was uploaded; ≥sm (and whenever no mobile art exists) the desktop
 *  artwork renders. One DOM node is always display:none so SSR stays stable. */
export function SlideArt({ slide, alt, fill = true, sizes, priority, loading, className, style }: SlideArtProps) {
  const mobile = slide.mobileImage ?? null;
  const a = alt ?? slide.title ?? "";
  return (
    <>
      {mobile && (
        <Image
          src={mobile}
          alt={a}
          fill={fill}
          sizes={sizes}
          priority={priority}
          loading={loading}
          className={cn(className, "sm:hidden")}
          style={style}
        />
      )}
      <Image
        src={slide.image}
        alt={a}
        fill={fill}
        sizes={sizes}
        priority={priority}
        loading={loading}
        className={cn(className, mobile ? "hidden sm:block" : undefined)}
        style={style}
      />
    </>
  );
}

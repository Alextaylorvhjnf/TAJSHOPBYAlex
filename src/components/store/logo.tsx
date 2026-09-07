"use client";

import { useBranding } from "@/components/providers/branding-provider";
import { cn } from "@/lib/utils";

const DEFAULT_MARK = "/brand/logo-mark.webp";

/**
 * Image-based TAJ logo (branding-driven).
 * - mark: uploaded logo from settings, else the default brand emblem asset
 * - wordmark: store name from settings (never hardcoded)
 * variant "onDark" flips the wordmark for dark footer surfaces.
 */
export function TAJLogo({
  className,
  compact = false,
  variant = "default",
  showEn = true,
  size = "md",
  src,
}: {
  className?: string;
  compact?: boolean;
  variant?: "default" | "onDark";
  showEn?: boolean;
  size?: "sm" | "md" | "lg";
  /** v29: explicit mark override (e.g. the admin-uploaded FOOTER logo —
   *  empty/null falls back to branding.logo / the default emblem) */
  src?: string | null;
}) {
  const branding = useBranding();
  /* v29: an explicit src wins (the FOOTER passes its own uploaded logo);
   * otherwise the header/main logo logic is unchanged. */
  const mark = src || branding.logo || DEFAULT_MARK;
  const markSize = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <img
        src={mark}
        alt={`${branding.storeName} logo`}
        className={cn(markSize, "shrink-0 rounded-xl object-cover shadow-sm")}
        width={44}
        height={44}
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-base font-extrabold tracking-tight md:text-lg",
              variant === "onDark" ? "text-background" : "gold-text"
            )}
          >
            {branding.storeName}
          </span>
          {showEn && (
            <span
              className={cn(
                "mt-1 text-[9px] font-medium tracking-[0.22em] md:text-[10px]",
                variant === "onDark" ? "text-background/60" : "text-muted-foreground"
              )}
            >
              {branding.storeNameEn.toUpperCase()}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/** Mark-only variant (favicon-style, for tight spaces) */
export function TAJLogoMark({ className, src }: { className?: string; src?: string | null }) {
  const branding = useBranding();
  const mark = src || branding.logo || DEFAULT_MARK;
  return <img src={mark} alt={`${branding.storeName}`} className={cn("h-9 w-9 rounded-xl object-cover", className)} />;
}

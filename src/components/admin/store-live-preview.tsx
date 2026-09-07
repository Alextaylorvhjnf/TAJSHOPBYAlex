"use client";

/**
 * v29.2 · StoreLivePreview — REAL live-store preview for the admin settings.
 * ---------------------------------------------------------------------
 * The settings «ظاهر و پوسته» tab previously showed a STATIC mockup (fake
 * header + generic product cards) no matter which template was active. The
 * owner asked for the preview to show EXACTLY the active storefront template
 * with its real product cards and shape («دقیقاً همون قالبی که الان فعال
 * هست، با کارت‌های محصولش»).
 *
 * This component renders the ACTIVE template component (or a forced
 * templateId) with the REAL catalog data (same /api/admin/templates/preview
 * endpoint the Appearance page uses), scaled into a device frame. The
 * selected theme + color mode are applied via [data-theme]/.dark on the
 * wrapper so the admin sees the unsaved combination live.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Palette } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/lib/templates/types";
import { ModernTechTemplate } from "@/components/store/templates/modern-tech";
import { Future3DTemplate } from "@/components/store/templates/future-3d";
import { MinimalPremiumTemplate } from "@/components/store/templates/minimal-premium";
import { SocialCommerceTemplate } from "@/components/store/templates/social-commerce";
import { AutumnTemplate } from "@/components/store/templates/autumn";
import { ChristmasTemplate } from "@/components/store/templates/christmas";
import { YaldaNightTemplate } from "@/components/store/templates/yalda-night";
import { GamingCyberTemplate } from "@/components/store/templates/gaming-cyber";
import { LuxuryElectronicsTemplate } from "@/components/store/templates/luxury-electronics";
import { MarketplaceTemplate } from "@/components/store/templates/marketplace";
import { ArtDecoTemplate } from "@/components/store/templates/art-deco";
import { RetroVintageTemplate } from "@/components/store/templates/retro-vintage";
import { GlassMorphismTemplate } from "@/components/store/templates/glass-morphism";
import { EditorialMagazineTemplate } from "@/components/store/templates/editorial-magazine";
import { SuperstoreGridTemplate } from "@/components/store/templates/superstore-grid";
import { NeonNoirTemplate } from "@/components/store/templates/neon-noir";
import { FlashDealsTemplate } from "@/components/store/templates/flash-deals";
import { PrintCatalogTemplate } from "@/components/store/templates/print-catalog";
import { StartupLightTemplate } from "@/components/store/templates/startup-light";
import { MobileFirstPwaTemplate } from "@/components/store/templates/mobile-first-pwa";
import { NexoraTechTemplate } from "@/components/store/templates/nexora-tech";
import { TechhubDarkTemplate } from "@/components/store/templates/techhub-dark";
import { PurpleMallTemplate } from "@/components/store/templates/purple-mall";
import { NovaGlassTemplate } from "@/components/store/templates/nova-glass";
import { NovatrendCleanTemplate } from "@/components/store/templates/novatrend-clean";

/** template id → preview component (mirrors the Appearance page map) */
const TEMPLATE_COMPONENTS: Record<string, (props: { data: HomeData }) => ReactNode> = {
  "modern-tech": ModernTechTemplate,
  "future-3d": Future3DTemplate,
  "minimal-premium": MinimalPremiumTemplate,
  "social-commerce": SocialCommerceTemplate,
  autumn: AutumnTemplate,
  christmas: ChristmasTemplate,
  "yalda-night": YaldaNightTemplate,
  "gaming-cyber": GamingCyberTemplate,
  "luxury-electronics": LuxuryElectronicsTemplate,
  marketplace: MarketplaceTemplate,
  "art-deco": ArtDecoTemplate,
  "retro-vintage": RetroVintageTemplate,
  "glass-morphism": GlassMorphismTemplate,
  "editorial-magazine": EditorialMagazineTemplate,
  "superstore-grid": SuperstoreGridTemplate,
  "neon-noir": NeonNoirTemplate,
  "flash-deals": FlashDealsTemplate,
  "print-catalog": PrintCatalogTemplate,
  "startup-light": StartupLightTemplate,
  "mobile-first-pwa": MobileFirstPwaTemplate,
  "nexora-tech": NexoraTechTemplate,
  "techhub-dark": TechhubDarkTemplate,
  "purple-mall": PurpleMallTemplate,
  "nova-glass": NovaGlassTemplate,
  "novatrend-clean": NovatrendCleanTemplate,
};

/**
 * Device-frame scaled preview (same technique as the Appearance page):
 * the full 1280px storefront renders at scale(0.5) (→ 640px visual,
 * RTL-anchored via transformOrigin "top right") inside a fixed-height
 * scroll area; the negative bottom margin collapses the transform's dead
 * layout space so the scrollbar matches the visual height exactly.
 * v29.2: exported — also reused by the repair-page live-preview dialog.
 */
export function ScaledFrame({
  children,
  height = 480,
  scale = 0.5,
  logicalWidth = 1280,
}: {
  children: ReactNode;
  height?: number;
  scale?: number;
  logicalWidth?: number;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setContentH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      dir="rtl"
      className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner"
      style={{ height }}
    >
      <div className="relative mx-auto overflow-hidden" style={{ width: Math.round(logicalWidth * scale) }}>
        <div
          ref={innerRef}
          className="pointer-events-none select-none"
          style={{
            width: logicalWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top right",
            marginBottom: contentH > 0 ? -(contentH * (1 - scale)) : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function StoreLivePreview({
  /** force a specific template; default = the ACTIVE one from settings */
  templateId,
  /** theme id applied to the preview wrapper (unsaved selection) */
  theme,
  /** color mode applied to the preview wrapper (unsaved selection) */
  mode,
  height = 480,
  showFooterNote = true,
}: {
  templateId?: string | null;
  theme?: string | null;
  mode?: "light" | "dark" | "system";
  height?: number;
  showFooterNote?: boolean;
}) {
  /* active template id (not needed when a templateId is forced) */
  const { data: tplData } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => apiFetch<{ active?: string }>("/api/admin/templates"),
    staleTime: 30_000,
    enabled: !templateId,
  });
  /* real catalog data — the exact payload the storefront home renders */
  const { data: previewData, isLoading } = useQuery({
    queryKey: ["admin", "templates", "preview"],
    queryFn: () => apiFetch<{ data: HomeData }>("/api/admin/templates/preview"),
    staleTime: 60_000,
  });

  const activeId = templateId ?? tplData?.active ?? "modern-tech";
  const Comp = TEMPLATE_COMPONENTS[activeId] ?? ModernTechTemplate;
  const data = previewData?.data;
  const dark = mode === "dark";

  return (
    <div
      data-theme={theme ?? "gold"}
      className={cn("store-theme-preview overflow-hidden rounded-xl", dark && "dark")}
    >
      {!data || !Comp ? (
        <div className="space-y-3">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال دریافت داده واقعی فروشگاه…
          </p>
        </div>
      ) : (
        <ScaledFrame height={height}>
          <Comp data={data} />
        </ScaledFrame>
      )}
      {showFooterNote && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-card px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Palette className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            پیش‌نمایش زنده با قالب فعال و محصولات واقعی فروشگاه — دقیقاً همان چیزی که مشتری می‌بیند
          </p>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-primary hover:opacity-80"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            مشاهده فروشگاه در تب جدید
          </Link>
        </div>
      )}
    </div>
  );
}

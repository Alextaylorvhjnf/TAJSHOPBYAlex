/**
 * TEMPLATE RENDERER (spec §19) — server-side switchboard.
 * -------------------------------------------------------
 * Maps a template id → its client component. Because this file is a SERVER
 * component and every template is a "use client" module, Next.js treats each
 * template import as a separate client chunk: only the ACTIVE template's
 * JavaScript is downloaded by the visitor's browser — the other nine stay on
 * the server (code-splitting for free via the App Router client boundary).
 *
 * Unknown/future ids fall back to the default template (modern-tech), so a
 * stale StoreSettings.activeTemplate value can never break the storefront.
 */

import type { HomeData } from "@/lib/templates/types";
import { getTemplateDef } from "@/lib/templates/registry";
import { ModernTechTemplate } from "./modern-tech";
import { Future3DTemplate } from "./future-3d";
import { MinimalPremiumTemplate } from "./minimal-premium";
import { SocialCommerceTemplate } from "./social-commerce";
import { AutumnTemplate } from "./autumn";
import { ChristmasTemplate } from "./christmas";
import { YaldaNightTemplate } from "./yalda-night";
import { GamingCyberTemplate } from "./gaming-cyber";
import { LuxuryElectronicsTemplate } from "./luxury-electronics";
import { MarketplaceTemplate } from "./marketplace";
import { ArtDecoTemplate } from "./art-deco";
import { RetroVintageTemplate } from "./retro-vintage";
import { GlassMorphismTemplate } from "./glass-morphism";
import { EditorialMagazineTemplate } from "./editorial-magazine";
import { SuperstoreGridTemplate } from "./superstore-grid";
import { NeonNoirTemplate } from "./neon-noir";
import { FlashDealsTemplate } from "./flash-deals";
import { PrintCatalogTemplate } from "./print-catalog";
import { StartupLightTemplate } from "./startup-light";
import { MobileFirstPwaTemplate } from "./mobile-first-pwa";
import { NexoraTechTemplate } from "./nexora-tech";
import { TechhubDarkTemplate } from "./techhub-dark";
import { PurpleMallTemplate } from "./purple-mall";
import { NovaGlassTemplate } from "./nova-glass";
import { NovatrendCleanTemplate } from "./novatrend-clean";
/* v35 · vertical flagship storefronts (صنف‌های فروشگاه) */
import { TajElectronicsProTemplate } from "./taj-electronics-pro";
import { SportFashionTemplate } from "./sport-fashion";
import { BeautyGlowTemplate } from "./beauty-glow";
import { ZentryGamingTemplate } from "./zentry-gaming";
import { AutoPartsTemplate } from "./auto-parts";

export function TemplateRenderer({ id, data }: { id: string; data: HomeData }) {
  switch (getTemplateDef(id).id) {
    case "future-3d":
      return <Future3DTemplate data={data} />;
    case "minimal-premium":
      return <MinimalPremiumTemplate data={data} />;
    case "social-commerce":
      return <SocialCommerceTemplate data={data} />;
    case "autumn":
      return <AutumnTemplate data={data} />;
    case "christmas":
      return <ChristmasTemplate data={data} />;
    case "yalda-night":
      return <YaldaNightTemplate data={data} />;
    case "gaming-cyber":
      return <GamingCyberTemplate data={data} />;
    case "luxury-electronics":
      return <LuxuryElectronicsTemplate data={data} />;
    case "marketplace":
      return <MarketplaceTemplate data={data} />;
    case "art-deco":
      return <ArtDecoTemplate data={data} />;
    case "retro-vintage":
      return <RetroVintageTemplate data={data} />;
    case "glass-morphism":
      return <GlassMorphismTemplate data={data} />;
    case "editorial-magazine":
      return <EditorialMagazineTemplate data={data} />;
    case "superstore-grid":
      return <SuperstoreGridTemplate data={data} />;
    case "neon-noir":
      return <NeonNoirTemplate data={data} />;
    case "flash-deals":
      return <FlashDealsTemplate data={data} />;
    case "print-catalog":
      return <PrintCatalogTemplate data={data} />;
    case "startup-light":
      return <StartupLightTemplate data={data} />;
    case "mobile-first-pwa":
      return <MobileFirstPwaTemplate data={data} />;
    case "nexora-tech":
      return <NexoraTechTemplate data={data} />;
    case "techhub-dark":
      return <TechhubDarkTemplate data={data} />;
    case "purple-mall":
      return <PurpleMallTemplate data={data} />;
    case "nova-glass":
      return <NovaGlassTemplate data={data} />;
    case "novatrend-clean":
      return <NovatrendCleanTemplate data={data} />;
    /* v35 · vertical flagship storefronts */
    case "taj-electronics-pro":
      return <TajElectronicsProTemplate data={data} />;
    case "sport-fashion":
      return <SportFashionTemplate data={data} />;
    case "beauty-glow":
      return <BeautyGlowTemplate data={data} />;
    case "zentry-gaming":
      return <ZentryGamingTemplate data={data} />;
    case "auto-parts":
      return <AutoPartsTemplate data={data} />;
    case "modern-tech":
    default:
      return <ModernTechTemplate data={data} />;
  }
}

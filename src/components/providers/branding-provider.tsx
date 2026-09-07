"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FALLBACK_BRANDING, type Branding } from "@/lib/settings";

const BrandingContext = createContext<Branding>(FALLBACK_BRANDING);

/**
 * Central store-identity context — fed once per request by the root layout
 * (server). Header, footer, login, checkout, admin chrome and SEO-facing
 * surfaces all derive the store name/logo from here. NEVER hardcode the
 * store name in components.
 */
export function BrandingProvider({ branding, children }: { branding: Branding; children: ReactNode }) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

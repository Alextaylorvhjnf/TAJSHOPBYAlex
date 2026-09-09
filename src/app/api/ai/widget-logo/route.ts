import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/settings";
import { templateUsesAiLogo } from "@/lib/maintenance";

/**
 * v29.2 · LIVE AI-WIDGET LOGO endpoint (public, read-only).
 * ---------------------------------------------------------
 * The storefront layout computes the widget logo SERVER-side on page render,
 * so an admin-uploaded logo previously only appeared after the visitor
 * refreshed. The ChatWidget now polls this tiny endpoint (~6s while the tab
 * is visible + on window focus) and swaps the avatar the moment the settings
 * change — «بدون حتی رفرش مرورگر».
 *
 * Returns { logo: string | null } — the resolved logo for the ACTIVE
 * template (aiWidgetLogo only when enabled for that template), or null when
 * none/custom-disabled (the widget then falls back to the template art).
 * The settings getters cache for 1.5s, so a saved logo is visible on the
 * NEXT poll. Never throws (pre-install DB → { logo: null }).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const noStore = { "Cache-Control": "no-store" } as const;
  try {
    const s = await getStoreSettings();
    const template = s.activeTemplate || "modern-tech";
    const raw = (s as { aiWidgetLogo?: string | null }).aiWidgetLogo;
    const logo =
      raw?.trim() && templateUsesAiLogo((s as { templateAiLogos?: string | null }).templateAiLogos, template)
        ? raw.trim()
        : null;
    return NextResponse.json({ logo, template }, { headers: noStore });
  } catch {
    return NextResponse.json({ logo: null, template: null }, { headers: noStore });
  }
}

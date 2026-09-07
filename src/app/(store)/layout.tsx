import { redirect } from "next/navigation";
import { Header } from "@/components/store/header";
import Footer from "@/components/store/footer";
import { ChatWidget } from "@/components/store/chat-widget";
import { ScrollToTop } from "@/components/store/scroll-to-top";
import { ChromeHeaderGate, ChromeFooterGate } from "@/components/store/chrome-gate";
import { MaintenanceScreen } from "@/components/store/maintenance-screen";
import { getInstallStatus } from "@/lib/installer/state";
import { getAdminUser } from "@/lib/auth";
import { getStoreSettings, getThemeSafe } from "@/lib/settings";
import { getChromeData } from "@/lib/templates/home-data";
import { templateUsesAiLogo } from "@/lib/maintenance";
import { TEMPLATE_PALETTES } from "@/components/store/templates/chrome/config";
import { templateCanvasCss, templateCanvasCssModes, TEMPLATE_CANVAS_MODES, type TemplatePalette, type TemplatePalettePair } from "@/lib/templates/canvas";
import type { HomeData } from "@/lib/templates/types";

// dynamic rendering: the install gate + active-template chrome must be
// evaluated per request, never baked at build
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // First-run gate: not yet installed → send the visitor to the installer wizard
  const install = await getInstallStatus();
  if (install.needsSetup) redirect("/install");

  /* v20: template chrome follows the visitor EVERYWHERE. The homepage keeps
   * its v18 behavior (the active template renders its own bespoke chrome and
   * CSS-suppresses this shared pair); every OTHER page now swaps the shared
   * Header/Footer for the ACTIVE template's TemplateHeader/TemplateFooter via
   * the client gates — switching templates in admin restyles the whole store,
   * product pages included. The light getChromeData() payload (store +
   * categories + brands + info links) is now fetched for EVERY template so
   * the shared chrome (default modern-tech) gets the same live nav data. */
  let activeTemplate = "modern-tech";
  let chromeData: HomeData | null = null;
  let maintenance = false;
  let palette: TemplatePalette | undefined;
  let themeColorMode: "light" | "dark" | "system" = "light";
  /* v29: the admin-uploaded AI-widget logo — only applied to templates it
   * was enabled for (default: every template once uploaded). */
  let aiLogoForTemplate: string | null = null;
  try {
    const settings = await getStoreSettings();
    activeTemplate = settings.activeTemplate || "modern-tech";
    maintenance = !!settings.maintenanceMode;
    palette = TEMPLATE_PALETTES[activeTemplate];
    chromeData = await getChromeData();
    // v26fix: the admin-configured default mode (light/dark/system) — the
    // visitor's own toggle still wins client-side via next-themes
    themeColorMode = (await getThemeSafe()).colorMode;
    // v29: AI widget logo
    const rawLogo = (settings as { aiWidgetLogo?: string | null }).aiWidgetLogo;
    if (rawLogo?.trim() && templateUsesAiLogo((settings as { templateAiLogos?: string | null }).templateAiLogos, activeTemplate)) {
      aiLogoForTemplate = rawLogo.trim();
    }
  } catch {
    /* pre-install / DB not ready → fall through with the default chrome */
  }

  /* v25: maintenance mode actually closes the store for regular visitors.
   * Logged-in admins (any admin role) still see the full storefront so they
   * can verify the look and flip maintenance off again. /admin & /api stay
   * outside this layout and are always reachable.
   * v29: the children travel INTO the gate — /track-order stays open for
   * closed visitors (order tracing) while every other page shows the
   * admin-selected repair-page template. */
  if (maintenance) {
    const admin = await getAdminUser().catch(() => null);
    if (!admin) return <MaintenanceScreen>{children}</MaintenanceScreen>;
  }

  /* v25 · TEMPLATE CANVAS — the ENTIRE store (shared chrome + every inner
   * page + portal layers) renders with the active template's palette, so
   * product/cart/order/widget pages are never "white" while the homepage
   * is themed. Server-rendered :root block → no FOUC; unmounting the store
   * layout (navigating to /admin) removes it again. --primary keeps the
   * brand accent on every canvas.
   *
   * v26fix · DUAL-MODE: the canvas now flips with the visitor's light/dark
   * toggle — every template ships both a dark and a light palette; the
   * admin-configured default mode paints :root (pre-paint, no FOUC) and
   * html.dark / html:not(.dark) blocks take over after the next-themes
   * bootstrap sets the class. Switching to white now REALLY whitens the
   * whole template (and vice versa) on every store page. */
  const paletteModes: TemplatePalettePair | undefined = TEMPLATE_CANVAS_MODES[activeTemplate];
  const canvasCss = paletteModes
    ? templateCanvasCssModes(paletteModes, themeColorMode !== "light")
    : palette
      ? templateCanvasCss(palette.bg, palette.fg)
      : null;

  const gateProps = chromeData ? { templateId: activeTemplate, data: chromeData } : null;

  return (
    <div
      className="store-shell min-h-screen flex flex-col"
      data-chrome-template={activeTemplate}
    >
      {canvasCss && (
        <style
          data-template-canvas={activeTemplate}
          dangerouslySetInnerHTML={{ __html: canvasCss }}
        />
      )}
      <ScrollToTop />
      {gateProps ? (
        <ChromeHeaderGate {...gateProps}>
          <Header chromeData={chromeData} palette={palette} paletteModes={paletteModes} />
        </ChromeHeaderGate>
      ) : (
        <Header chromeData={chromeData} palette={palette} paletteModes={paletteModes} />
      )}
      <main className="flex-1">{children}</main>
      {gateProps ? (
        <ChromeFooterGate {...gateProps}>
          <Footer palette={palette} paletteModes={paletteModes} />
        </ChromeFooterGate>
      ) : (
        <Footer palette={palette} paletteModes={paletteModes} />
      )}
      {/* v28-T3: the AI chat widget is global but follows the active
       * template's visual skin + the store's CURRENT name (monogram
       * avatar, dynamic title/greeting).
       * v29: when the admin uploaded a custom AI-widget logo (Settings →
       * AI) and enabled it for THIS template, it overrides the skin art. */}
      <ChatWidget
        storeName={chromeData?.store?.storeName}
        templateId={activeTemplate}
        aiLogo={aiLogoForTemplate}
      />
    </div>
  );
}

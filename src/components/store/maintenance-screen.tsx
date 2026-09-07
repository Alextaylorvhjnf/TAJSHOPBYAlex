import { getStoreSettings } from "@/lib/settings";
import { resolveMaintenanceContent, normalizeMaintenanceTemplateId } from "@/lib/maintenance";
import { MaintenanceGate, type MaintenanceScreenData } from "./maintenance-templates";
import type { ReactNode } from "react";

/**
 * v25 · MAINTENANCE SCREEN (v29: template + fully admin-editable)
 * -----------------------------------------------------------------------
 * Rendered by the (store) layout when Settings → فروشگاه → حالت تعمیر is ON
 * and the visitor is NOT a logged-in admin. Regular visitors get the
 * selected repair-page TEMPLATE (tech-dark / minimal-light / neon-glass /
 * countdown-eta — admin picks it with a live preview in the settings) with
 * EVERY word editable from Settings → فروشگاه.
 *
 * v29: the old «ورود مدیران» button is gone — its slot is the «پیگیری
 * سفارش» button, and the /track-order page stays reachable through the
 * gate (MaintenanceGate) while everything else is closed. /admin, /api and
 * /install stay reachable outside this layout as before.
 */
export async function MaintenanceScreen({ children }: { children?: ReactNode }) {
  const s = await getStoreSettings();
  const content = resolveMaintenanceContent(s.maintenanceContent);

  const data: MaintenanceScreenData = {
    templateId: normalizeMaintenanceTemplateId(s.maintenanceTemplate),
    content,
    storeName: s.storeName?.trim() || "فروشگاه",
    logo: s.logo ?? null,
    phone: s.phone?.trim() || null,
    email: s.email?.trim() || null,
    workingHours: s.workingHours?.trim() || null,
  };

  return <MaintenanceGate data={data}>{children}</MaintenanceGate>;
}

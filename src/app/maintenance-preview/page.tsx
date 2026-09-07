import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import {
  MAINTENANCE_TEMPLATE_IDS,
  normalizeMaintenanceTemplateId,
  resolveMaintenanceContent,
} from "@/lib/maintenance";
import { RepairPage, type MaintenanceScreenData } from "@/components/store/maintenance-templates";

/**
 * v29.2 · /maintenance-preview — live DEMO of the repair (maintenance) page.
 * ---------------------------------------------------------------------
 * Admin-only page (regular visitors are redirected to the admin login).
 * Renders the admin-selected repair-page template — with the store's REAL
 * saved texts/logo/contacts — exactly as a closed visitor would see it, so
 * the admin can inspect every template and element («باز کردن در تب جدید»
 * from Settings → فروشگاه → قالب و متن‌های صفحه تعمیر).
 *
 * ?template=<id> — one of tech-dark | minimal-light | neon-glass |
 * countdown-eta (anything else falls back to the SAVED template).
 * This page never changes any setting — it is a pure preview.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "پیش‌نمایش صفحه تعمیر — پنل مدیریت",
  robots: { index: false, follow: false },
};

export default async function MaintenancePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  /* preview is admin-only — no session → login (never the store itself) */
  const admin = await getAdminUser().catch(() => null);
  if (!admin) redirect("/admin/login");

  const sp = await searchParams;
  const requested = (MAINTENANCE_TEMPLATE_IDS as readonly string[]).includes(sp.template ?? "")
    ? normalizeMaintenanceTemplateId(sp.template)
    : null;

  const s = await getStoreSettings();

  const data: MaintenanceScreenData = {
    templateId: requested ?? normalizeMaintenanceTemplateId(s.maintenanceTemplate),
    content: resolveMaintenanceContent(s.maintenanceContent),
    storeName: s.storeName?.trim() || "فروشگاه",
    logo: s.logo ?? null,
    phone: s.phone?.trim() || null,
    email: s.email?.trim() || null,
    workingHours: s.workingHours?.trim() || null,
  };

  return (
    <main className="min-h-screen bg-background">
      <RepairPage data={data} />
    </main>
  );
}

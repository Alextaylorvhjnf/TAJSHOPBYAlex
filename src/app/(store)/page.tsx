import { getStoreSettings } from "@/lib/settings";
import { getAdminUser } from "@/lib/auth";
import { getHomeData } from "@/lib/templates/home-data";
import { TEMPLATE_IDS } from "@/lib/templates/registry";
import { TemplateRenderer } from "@/components/store/templates/renderer";

// the storefront is fully data-driven (template + settings) — never cache at build
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const [settings, data] = await Promise.all([getStoreSettings(), getHomeData()]);

  // Live full-tab preview for admins: /?template=<id> renders that template
  // for this request only — never persisted (Admin → ظاهر → پیش‌نمایش کامل).
  let activeId = settings.activeTemplate;
  const requested = (await searchParams).template;
  if (requested && TEMPLATE_IDS.includes(requested)) {
    const admin = await getAdminUser();
    if (admin) activeId = requested;
  }

  return <TemplateRenderer id={activeId} data={data} />;
}

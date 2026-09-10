import { getStoreSettings } from "@/lib/settings";
import { getAdminUser } from "@/lib/auth";
import { getHomeData } from "@/lib/templates/home-data";
import { TEMPLATE_IDS } from "@/lib/templates/registry";
import { getTemplateContentData, applyTemplateContentToData } from "@/lib/templates/content";
import { TemplateRenderer } from "@/components/store/templates/renderer";

// the storefront is fully data-driven (template + settings) — never cache at build
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  /* v34.1: defense in depth — a broken boot (missing DATABASE_URL, unreadable
     db file, schema drift…) previously exploded into Next.js's generic English
     500 page. Every failure now lands on the Persian recovery card (see
     (store)/error.tsx) with a CTA into /install, whose wizard self-heals .env
     and pushes the schema. (Data loading only — JSX is returned OUTSIDE the
     try/catch so the error boundary owns rendering errors.) */
  let activeId = "modern-tech";
  let enriched: ReturnType<typeof applyTemplateContentToData> | null = null;
  try {
    const [settings, data] = await Promise.all([getStoreSettings(), getHomeData()]);
    activeId = settings.activeTemplate;

    // Live full-tab preview for admins: /?template=<id> renders that template
    // for this request only — never persisted (Admin → ظاهر → پیش‌نمایش کامل).
    const requested = (await searchParams).template;
    if (requested && TEMPLATE_IDS.includes(requested)) {
      const admin = await getAdminUser();
      if (admin) activeId = requested;
    }

    // v5-f: the resolved template's OWN content (slides/showcases/texts/
    // links/brand) activates for this request — template-specific values win,
    // empty fields fall back to the global entities. The preview override
    // above is honored: the PREVIEWED template's content is fetched.
    const templateContent = await getTemplateContentData(activeId);
    enriched = applyTemplateContentToData(data, templateContent);
  } catch (e) {
    console.error("[homepage] data load failed:", e);
    throw e;
  }

  return <TemplateRenderer id={activeId} data={enriched} />;
}

import { ok, fail } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import { getHomeData } from "@/lib/templates/home-data";
import { TEMPLATE_IDS } from "@/lib/templates/registry";
import { getTemplateContentData, applyTemplateContentToData } from "@/lib/templates/content";

/**
 * GET /api/admin/templates/preview[?template=<id>] — real store data
 * (HomeData) for the in-admin template previews. Admin-gated + never cached
 * by the browser (session-scoped response).
 * v5-f: with ?template=<id> the requested template's OWN content is applied
 * (slides/showcases/texts/links/brand — same merge the storefront renders),
 * so the admin sees the template exactly as /?template=<id> would show it.
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  const data = await getHomeData();

  const requested = new URL(req.url).searchParams.get("template");
  let templateId: string | null = null;
  if (requested && TEMPLATE_IDS.includes(requested)) {
    templateId = requested;
  } else {
    // no (or invalid) template → keep serving the ACTIVE template's content
    templateId = (await getStoreSettings()).activeTemplate;
  }
  const content = await getTemplateContentData(templateId);

  return ok({ data: applyTemplateContentToData(data, content) }, 200, { noStore: true });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { getStoreSettings, getFooterLinks, parseTemplateFooters, invalidateSettingsCache } from "@/lib/settings";
import { TEMPLATE_DEFS, TEMPLATE_IDS } from "@/lib/templates/registry";
import { logAdmin } from "@/lib/admin-log";

/** GET /api/admin/template-footers — v27b: everything the Footer tab's
 *  template-scoped editor needs:
 *  - active: the CURRENTLY applied template id (the tab always starts there)
 *  - templates: all 25 ids + Persian names (the editor's template Select)
 *  - footers: ALL saved per-template footer content overrides
 *  - defaults: the global footerText / copyrightText (placeholder hints)
 *  - footerLinks: the global FooterLink CMS rows (reference only)
 *  No API keys / secrets — pure footer content, admin-only. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  const settings = await getStoreSettings();
  const footerLinks = await getFooterLinks();
  return ok({
    active: settings.activeTemplate,
    templates: TEMPLATE_DEFS.map((t) => ({ id: t.id, nameFa: t.nameFa })),
    footers: parseTemplateFooters(settings.templateFooters),
    defaults: {
      footerText: settings.footerText,
      copyrightText: settings.copyrightText,
    },
    footerLinks,
  });
}

/**
 * v27b — PUT /api/admin/template-footers
 * Body: { templateId: string, footerText?: string | null,
 *         copyrightText?: string | null,
 *         customerLinks?: { label: string; url: string }[],
 *         storeLinks?: { label: string; url: string }[] }
 * Persists the COMPLETE footer-content override set for ONE template (the
 * whole entry is replaced — empty text/arrays simply drop that field).
 * Sanitized via the exact rules the renderer uses (parseTemplateFooters), so
 * a hand-crafted payload can never smuggle junk into the storefront.
 * All-empty payload = RESET (the template's entry is deleted → falls back
 * to the global footer). The whole map is read-modify-write — other
 * templates' entries are NEVER dropped.
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = (await req.json().catch(() => null)) as {
    templateId?: unknown;
    footerText?: unknown;
    copyrightText?: unknown;
    customerLinks?: unknown;
    storeLinks?: unknown;
  } | null;
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  if (!TEMPLATE_IDS.includes(templateId)) return fail("قالب نامعتبر است", 400);

  const def = TEMPLATE_DEFS.find((t) => t.id === templateId)!;

  /* Sanitize with the SAME parser the storefront uses — wrap the incoming
   * body as a one-template probe map and parse it. Rows/fields that fail
   * validation are dropped exactly like at render time. */
  const probe = JSON.stringify({
    [templateId]: {
      footerText: typeof body?.footerText === "string" ? body.footerText : undefined,
      copyrightText: typeof body?.copyrightText === "string" ? body.copyrightText : undefined,
      customerLinks: Array.isArray(body?.customerLinks) ? body.customerLinks : undefined,
      storeLinks: Array.isArray(body?.storeLinks) ? body.storeLinks : undefined,
    },
  });
  const entry = parseTemplateFooters(probe)[templateId];

  /* Reset path: every provided field empty/absent → delete the override. */
  const allEmpty =
    !(typeof body?.footerText === "string" && body.footerText.trim()) &&
    !(typeof body?.copyrightText === "string" && body.copyrightText.trim()) &&
    (Array.isArray(body?.customerLinks) ? body.customerLinks.length === 0 : true) &&
    (Array.isArray(body?.storeLinks) ? body.storeLinks.length === 0 : true);
  if (allEmpty && !entry) {
    const settings = await getStoreSettings();
    const all = parseTemplateFooters(settings.templateFooters);
    if (!all[templateId]) return ok({ message: `فوتر قالب «${def.nameFa}» از قبل روی پیش‌فرض سراسری است` });
    delete all[templateId];
    await db.storeSettings.update({
      where: { id: "main" },
      data: { templateFooters: Object.keys(all).length > 0 ? JSON.stringify(all) : null },
    });
    invalidateSettingsCache();
    await logAdmin(admin.id, "TEMPLATE_FOOTER_UPDATE", {
      entity: "template-footers",
      entityId: templateId,
      ip: getClientIp(req),
      metadata: { reset: true },
    });
    return ok({ message: `فوتر قالب «${def.nameFa}» به پیش‌فرض سراسری بازگشت` });
  }
  if (!entry) return fail("تنظیمات فوتر نامعتبر است", 400);

  /* Read-modify-write the WHOLE map — other templates' entries survive. */
  const settings = await getStoreSettings();
  const all = parseTemplateFooters(settings.templateFooters);
  all[templateId] = entry;
  await db.storeSettings.update({
    where: { id: "main" },
    data: { templateFooters: JSON.stringify(all) },
  });
  invalidateSettingsCache();
  await logAdmin(admin.id, "TEMPLATE_FOOTER_UPDATE", {
    entity: "template-footers",
    entityId: templateId,
    ip: getClientIp(req),
    metadata: entry,
  });
  return ok({ message: `تنظیمات فوتر قالب «${def.nameFa}» ذخیره شد` });
}

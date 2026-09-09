import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { getStoreSettings, parseTemplateFeatures, parseTemplateChrome, parseStoreChrome, invalidateSettingsCache } from "@/lib/settings";
import { TEMPLATE_DEFS, TEMPLATE_IDS } from "@/lib/templates/registry";
import { logAdmin } from "@/lib/admin-log";

/** GET /api/admin/templates — template registry + the currently active id
 *  + the admin's saved feature flags per template (v23) + the v25 global
 *  timer deadline (for templates that register a "timer" feature). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  const settings = await getStoreSettings();
  return ok({
    templates: TEMPLATE_DEFS,
    active: settings.activeTemplate,
    featureFlags: parseTemplateFeatures(settings.templateFeatures),
    timerEndsAt: (settings as { templateTimerEndsAt?: Date | null }).templateTimerEndsAt?.toISOString() ?? null,
    chrome: parseTemplateChrome((settings as { templateChrome?: string | null }).templateChrome),
    // v32 (14-b): store-wide chrome look options (header skin / nav order /
    // actions placement / product hover) — shared by every «هدر و فوتر» dialog
    storeChrome: parseStoreChrome((settings as { storeChrome?: string | null }).storeChrome),
  });
}

/**
 * v23 — PUT /api/admin/templates
 * Body: { templateId: string, features: { [featureKey]: boolean },
 *         timerEndsAt?: string | null }
 * Persists the admin's on/off choices for ONE template's registered special
 * features (timers, glow, parallax…). Only keys the template actually
 * declares are accepted — unknown keys are dropped.
 * v25: `timerEndsAt` (ISO string or null to clear) sets the GLOBAL countdown
 * deadline consumed by every template that registers a "timer" feature —
 * so the admin can edit the timer time, not just toggle it on/off.
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  if (!TEMPLATE_IDS.includes(templateId)) return fail("قالب نامعتبر است", 400);

  const def = TEMPLATE_DEFS.find((t) => t.id === templateId)!

  /* v25: timer deadline handling — only for templates with a timer feature.
   * Accepts an ISO string (validated, must be in the future to be useful but
   * past values are stored as-is so an expired timer simply reads "پایان یافت")
   * or null/"" to clear (back to template-designed defaults). */
  let timerUpdate: { templateTimerEndsAt?: Date | null } = {};
  if (body && "timerEndsAt" in body) {
    const hasTimerFeature = (def.features ?? []).some((f) => f.key === "timer");
    if (!hasTimerFeature) return fail("این قالب تایمر قابل تنظیم ندارد", 400);
    const raw = body.timerEndsAt;
    if (raw === null || raw === "") {
      timerUpdate = { templateTimerEndsAt: null };
    } else if (typeof raw === "string") {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return fail("تاریخ/ساعت تایمر نامعتبر است", 400);
      timerUpdate = { templateTimerEndsAt: d };
    } else {
      return fail("مقدار تایمر نامعتبر است", 400);
    }
  }

  const raw = body?.features;
  const incoming = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const allowedKeys = new Set((def.features ?? []).map((f) => f.key));
  const clean: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (allowedKeys.has(k)) clean[k] = v === false ? false : true;
  }

  /* v24: header/footer chrome overrides for this template — validated via
   * the same sanitizer used when rendering (parseTemplateChrome), so a
   * hand-crafted payload can never smuggle junk into the storefront.
   * `chrome: null` RESETS the template to its designed theme palette. */
  let chromeUpdate: Record<string, unknown> | null = null;
  let chromeReset = false;
  if (body && "chrome" in body) {
    if (body.chrome === null) {
      chromeReset = true;
    } else {
      const probe = JSON.stringify({ [templateId]: body.chrome ?? {} });
      const parsed = parseTemplateChrome(probe);
      const entry = parsed[templateId];
      chromeUpdate = entry ?? null;
      if (!chromeUpdate) return fail("تنظیمات هدر/فوتر نامعتبر است", 400);
    }
  }

  /* v32 (14-b): STORE-WIDE chrome look options (header skin / nav order /
   * actions placement / product hover) — validated with the same defensive
   * parser the renderer uses (parseStoreChrome), so a hand-crafted payload
   * can never smuggle junk into the storefront. `storeChrome: null` clears
   * everything back to the designed defaults. These are STORE-level: the
   * templateId is only needed for the log entry. */
  let storeChromeUpdate: Record<string, unknown> | null = null;
  let storeChromeReset = false;
  if (body && "storeChrome" in body) {
    if (body.storeChrome === null) {
      storeChromeReset = true;
    } else {
      const parsed = parseStoreChrome(JSON.stringify(body.storeChrome ?? {}));
      if (Object.keys(parsed).length === 0) return fail("تنظیمات ظاهر هدر نامعتبر است", 400);
      storeChromeUpdate = parsed as Record<string, unknown>;
    }
  }

  if (Object.keys(clean).length === 0 && Object.keys(timerUpdate).length === 0 && !chromeUpdate && !chromeReset && !storeChromeUpdate && !storeChromeReset) {
    return fail("هیچ ویژگی معتبری ارسال نشد", 400);
  }

  const settings = await getStoreSettings();
  const updateData: Record<string, unknown> = {};
  if (Object.keys(clean).length > 0) {
    const all = parseTemplateFeatures(settings.templateFeatures);
    // merge: keep flags of OTHER templates, replace this template's choices
    const merged = { ...all, [templateId]: clean };
    updateData.templateFeatures = JSON.stringify(merged);
  }
  if (chromeReset || chromeUpdate) {
    const allChrome = parseTemplateChrome((settings as { templateChrome?: string | null }).templateChrome);
    if (chromeReset) {
      delete allChrome[templateId];
    } else {
      allChrome[templateId] = chromeUpdate as { header?: Record<string, unknown>; footer?: Record<string, unknown> };
    }
    updateData.templateChrome = Object.keys(allChrome).length > 0 ? JSON.stringify(allChrome) : null;
  }
  if (storeChromeReset || storeChromeUpdate) {
    updateData.storeChrome = storeChromeReset ? null : JSON.stringify(storeChromeUpdate);
  }
  Object.assign(updateData, timerUpdate);
  await db.storeSettings.update({ where: { id: "main" }, data: updateData });
  invalidateSettingsCache();
  await logAdmin(admin.id, "TEMPLATE_FEATURES_UPDATE", {
    entity: "StoreSettings",
    entityId: templateId,
    ip: getClientIp(req),
    metadata: {
      features: clean,
      timerEndsAt: timerUpdate.templateTimerEndsAt?.toISOString() ?? undefined,
      chrome: chromeReset ? "reset" : chromeUpdate ?? undefined,
      storeChrome: storeChromeReset ? "reset" : storeChromeUpdate ?? undefined,
    },
  });
  return ok({ message: `تنظیمات ویژگی‌های «${def.nameFa}» ذخیره شد` });
}

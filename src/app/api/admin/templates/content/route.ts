import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { TEMPLATE_IDS, getTemplateDef } from "@/lib/templates/registry";
import {
  templateContentSchema,
  parseTemplateContent,
  sanitizeTemplateContent,
  hasTemplateContent,
} from "@/lib/templates/content";
import { logAdmin } from "@/lib/admin-log";

/**
 * v5-f · GET /api/admin/templates/content?template=<id>
 * One template's dedicated content blob (parsed + sanitized; empty object
 * when no row exists → the storefront falls back to the global entities).
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);

  const templateId = new URL(req.url).searchParams.get("template") ?? "";
  if (!TEMPLATE_IDS.includes(templateId)) return fail("قالب نامعتبر است", 400);

  const row = await db.templateContent.findUnique({
    where: { templateId },
    select: { data: true, updatedAt: true },
  });
  return ok(
    {
      data: parseTemplateContent(row?.data),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    },
    200,
    { noStore: true },
  );
}

/**
 * v5-f · PUT /api/admin/templates/content
 * Body: { templateId: string, data: TemplateContentData } — upserts the
 * template's own slides/showcases/texts/links/brand. `data: {}` resets the
 * template to the global values. Validation = the strict zod schema, then
 * the lenient sanitizer drops empty strings so the stored JSON stays clean.
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  if (!TEMPLATE_IDS.includes(templateId)) return fail("قالب نامعتبر است", 400);
  const def = getTemplateDef(templateId);

  if (body?.data === null || body?.data === undefined) {
    return fail("محتوای قالب ارسال نشده است", 400);
  }
  const parsed = templateContentSchema.safeParse(body.data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue?.message ?? "محتوای قالب نامعتبر است", 400);
  }
  const clean = sanitizeTemplateContent(parsed.data);
  const json = JSON.stringify(clean);

  await db.templateContent.upsert({
    where: { templateId },
    create: { templateId, data: json },
    update: { data: json },
  });

  // same revalidation surface as the template-active route: the storefront
  // homepage + every inner page's shared chrome must pick the new content
  // on the very next request
  revalidatePath("/", "layout");
  revalidatePath("/", "page");

  await logAdmin(admin.id, "TEMPLATE_CONTENT_UPDATE", {
    entity: "TemplateContent",
    entityId: templateId,
    ip: getClientIp(req),
    metadata: {
      reset: !hasTemplateContent(clean),
      slides: clean.slides?.length ?? 0,
      showcases: clean.showcases?.length ?? 0,
      texts: Object.keys(clean.texts ?? {}).length,
      links: clean.links?.length ?? 0,
      brand: clean.brand ? Object.keys(clean.brand).join(",") : undefined,
    },
  });
  return ok({
    message: hasTemplateContent(clean)
      ? `محتوای اختصاصی «${def.nameFa}» ذخیره شد`
      : `محتوای «${def.nameFa}» بازنشانی شد (مقادیر سراسری استفاده می‌شود)`,
  });
}

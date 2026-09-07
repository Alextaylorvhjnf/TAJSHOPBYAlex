import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { cmsPageUpdateSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

function serialize(page: Awaited<ReturnType<typeof db.cmsPage.findUnique>>) {
  if (!page) return null;
  let sections: { h: string; p: string }[] = [];
  try {
    sections = page.sections ? JSON.parse(page.sections) : [];
  } catch {
    sections = [];
  }
  return { ...page, sections };
}

export async function GET(_req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "pages")) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;
  const page = await db.cmsPage.findUnique({ where: { id } });
  if (!page) return fail("صفحه یافت نشد", 404);
  return ok({ page: serialize(page) });
}

export async function PUT(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "pages")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = cmsPageUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { sections, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (sections !== undefined) data.sections = JSON.stringify(sections);

  if (rest.slug) {
    const dupe = await db.cmsPage.findUnique({ where: { slug: rest.slug } });
    if (dupe && dupe.id !== id) return fail("صفحه‌ای با این اسلاگ وجود دارد", 409);
  }

  const page = await db.cmsPage.update({ where: { id }, data }).catch(() => null);
  if (!page) return fail("صفحه یافت نشد", 404);
  await logAdmin(admin.id, "CMS_PAGE_UPDATE", { entity: "CmsPage", entityId: id, ip: getClientIp(req) });
  return ok({ page: serialize(page), message: "صفحه به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "pages")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  await db.cmsPage.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "CMS_PAGE_DELETE", { entity: "CmsPage", entityId: id, ip: getClientIp(req) });
  return ok({ message: "صفحه حذف شد" });
}

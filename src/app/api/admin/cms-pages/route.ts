import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { cmsPageSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

function serialize(page: Awaited<ReturnType<typeof db.cmsPage.findFirst>>) {
  if (!page) return null;
  let sections: { h: string; p: string }[] = [];
  try {
    sections = page.sections ? JSON.parse(page.sections) : [];
  } catch {
    sections = [];
  }
  return { ...page, sections };
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "pages")) return fail("دسترسی لازم را ندارید", 403);
  const pages = await db.cmsPage.findMany({ orderBy: { sortOrder: "asc" } });
  return ok({ pages: pages.map(serialize) });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "pages")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = cmsPageSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { sections, ...rest } = parsed.data;
  const exists = await db.cmsPage.findUnique({ where: { slug: rest.slug } });
  if (exists) return fail("صفحه‌ای با این اسلاگ وجود دارد", 409);

  const page = await db.cmsPage.create({
    data: { ...rest, sections: JSON.stringify(sections) },
  });
  await logAdmin(admin.id, "CMS_PAGE_CREATE", { entity: "CmsPage", entityId: page.id, ip: getClientIp(req) });
  return ok({ page: serialize(page), message: "صفحه ایجاد شد" }, 201);
}

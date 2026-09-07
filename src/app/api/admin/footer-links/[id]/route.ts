import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { footerLinkUpdateSchema } from "@/lib/validators";
import { invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = footerLinkUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const data = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  const link = await db.footerLink.update({ where: { id }, data }).catch(() => null);
  if (!link) return fail("لینک یافت نشد", 404);
  invalidateSettingsCache();
  await logAdmin(admin.id, "FOOTER_LINK_UPDATE", { entity: "FooterLink", entityId: id, ip: getClientIp(req) });
  return ok({ link, message: "لینک فوتر به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  await db.footerLink.delete({ where: { id } }).catch(() => null);
  invalidateSettingsCache();
  await logAdmin(admin.id, "FOOTER_LINK_DELETE", { entity: "FooterLink", entityId: id, ip: getClientIp(req) });
  return ok({ message: "لینک فوتر حذف شد" });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { footerLinkSchema } from "@/lib/validators";
import { invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const links = await db.footerLink.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }] });
  return ok({ links });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = footerLinkSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const link = await db.footerLink.create({ data: parsed.data });
  invalidateSettingsCache();
  await logAdmin(admin.id, "FOOTER_LINK_CREATE", { entity: "FooterLink", entityId: link.id, ip: getClientIp(req) });
  return ok({ link, message: "لینک فوتر ایجاد شد" }, 201);
}

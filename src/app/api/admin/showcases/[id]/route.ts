import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { showcaseUpdateSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

function clean(data: ReturnType<typeof showcaseUpdateSchema.parse>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k === "subtitle" || k === "buttonText" || k === "buttonUrl" || k === "badge" || k === "productId") {
      out[k] = v === "" ? null : v;
    } else out[k] = v;
  }
  return out;
}

export async function PUT(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "showcases")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = showcaseUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const showcase = await db.promotionalShowcase
    .update({ where: { id }, data: clean(parsed.data) })
    .catch(() => null);
  if (!showcase) return fail("شوکیس یافت نشد", 404);
  await logAdmin(admin.id, "SHOWCASE_UPDATE", { entity: "PromotionalShowcase", entityId: id, ip: getClientIp(req) });
  return ok({ showcase, message: "شوکیس به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "showcases")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  await db.promotionalShowcase.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "SHOWCASE_DELETE", { entity: "PromotionalShowcase", entityId: id, ip: getClientIp(req) });
  return ok({ message: "شوکیس حذف شد" });
}

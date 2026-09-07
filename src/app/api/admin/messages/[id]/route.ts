import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { customerMessageStatusSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "messages")) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;
  const message = await db.customerMessage.findUnique({ where: { id } });
  if (!message) return fail("پیام یافت نشد", 404);
  return ok({ message });
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "messages")) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = customerMessageStatusSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const message = await db.customerMessage
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);
  if (!message) return fail("پیام یافت نشد", 404);
  await logAdmin(admin.id, "MESSAGE_STATUS_CHANGE", {
    entity: "CustomerMessage",
    entityId: id,
    ip: getClientIp(req),
    metadata: JSON.stringify({ status: parsed.data.status }),
  });
  return ok({ message, message_text: "وضعیت پیام به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "messages")) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;
  // only admins may permanently delete customer messages
  if (!["SUPER_ADMIN", "ADMIN"].includes(admin.role)) return fail("دسترسی لازم را ندارید", 403);

  await db.customerMessage.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "MESSAGE_DELETE", { entity: "CustomerMessage", entityId: id, ip: getClientIp(req) });
  return ok({ message: "پیام حذف شد" });
}

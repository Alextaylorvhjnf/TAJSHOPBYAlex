import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { deliveryMethodUpdateSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "delivery")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = deliveryMethodUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const existing = await db.deliveryMethod.findUnique({ where: { id } });
  if (!existing) return fail("روش ارسال پیدا نشد", 404);

  // cross-field ETA guard: a partial update may lower etaMaxDays below the
  // stored etaMinDays (or raise the min above the stored max)
  const etaMin = d.etaMinDays ?? existing.etaMinDays;
  const etaMax = d.etaMaxDays ?? existing.etaMaxDays;
  if (etaMax < etaMin) return fail("حداکثر روز ارسال نمی‌تواند کمتر از حداقل آن باشد", 400);

  await db.deliveryMethod.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.cost !== undefined ? { cost: d.cost } : {}),
      ...(d.etaMinDays !== undefined ? { etaMinDays: d.etaMinDays } : {}),
      ...(d.etaMaxDays !== undefined ? { etaMaxDays: d.etaMaxDays } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
    },
  });
  await logAdmin(admin.id, "DELIVERY_UPDATE", {
    entity: "DeliveryMethod",
    entityId: id,
    metadata: { name: d.name ?? existing.name, fields: Object.keys(d) },
    ip: getClientIp(req),
  });
  return ok({ message: "روش ارسال به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "delivery")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  // Order FK is SetNull + name/eta snapshots live on the order itself —
  // deleting a method never rewrites order history.
  await db.deliveryMethod.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "DELIVERY_DELETE", { entity: "DeliveryMethod", entityId: id, ip: getClientIp(req) });
  return ok({ message: "روش ارسال حذف شد" });
}

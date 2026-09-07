import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { couponSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "coupons")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = couponSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;
  if (d.code) {
    const dupe = await db.coupon.findFirst({ where: { code: d.code.toUpperCase(), NOT: { id } } });
    if (dupe) return fail("این کد قبلاً استفاده شده است", 409);
  }
  await db.coupon.update({
    where: { id },
    data: {
      ...(d.code ? { code: d.code.toUpperCase() } : {}),
      ...(d.type ? { type: d.type } : {}),
      ...(d.value !== undefined ? { value: d.value } : {}),
      ...(d.minAmount !== undefined ? { minAmount: d.minAmount } : {}),
      ...(d.maxUsage !== undefined ? { maxUsage: d.maxUsage } : {}),
      ...(d.perUserLimit !== undefined ? { perUserLimit: d.perUserLimit } : {}),
      ...(d.startsAt !== undefined ? { startsAt: d.startsAt ? new Date(d.startsAt) : null } : {}),
      ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt ? new Date(d.expiresAt) : null } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    },
  });
  await logAdmin(admin.id, "COUPON_UPDATE", { entity: "Coupon", entityId: id, ip: getClientIp(req) });
  return ok({ message: "کد تخفیف به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "coupons")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  await db.coupon.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "COUPON_DELETE", { entity: "Coupon", entityId: id, ip: getClientIp(req) });
  return ok({ message: "کد تخفیف حذف شد" });
}

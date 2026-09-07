import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { couponSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "coupons")) return fail("دسترسی لازم را ندارید", 403);
  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  return ok({ coupons: coupons.map((c) => ({ ...c, orderCount: c._count.orders })) });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "coupons")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;
  if (d.type === "PERCENT" && (d.value < 1 || d.value > 100)) return fail("درصد تخفیف باید بین ۱ تا ۱۰۰ باشد", 400);
  if (await db.coupon.findUnique({ where: { code: d.code.toUpperCase() } })) return fail("این کد قبلاً ایجاد شده است", 409);

  const coupon = await db.coupon.create({
    data: {
      code: d.code.toUpperCase(), type: d.type, value: d.value,
      minAmount: d.minAmount, maxUsage: d.maxUsage, perUserLimit: d.perUserLimit,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      isActive: d.isActive,
    },
  });
  await logAdmin(admin.id, "COUPON_CREATE", { entity: "Coupon", entityId: coupon.id, metadata: { code: coupon.code }, ip: getClientIp(req) });
  return ok({ id: coupon.id, message: "کد تخفیف ایجاد شد" }, 201);
}

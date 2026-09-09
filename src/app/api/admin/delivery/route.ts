import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";
import { deliveryMethodSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

/** v16 delivery system — admin CRUD (pattern follows /api/admin/coupons) */

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "delivery")) return fail("دسترسی لازم را ندارید", 403);
  const methods = await db.deliveryMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
  return ok({
    methods: methods.map((m) => {
      const { _count, ...rest } = m;
      return { ...rest, orderCount: _count.orders };
    }),
  });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "delivery")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = deliveryMethodSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const method = await db.deliveryMethod.create({
    data: {
      name: d.name,
      description: d.description ?? null,
      type: d.type,
      cost: d.cost,
      etaMinDays: d.etaMinDays,
      etaMaxDays: d.etaMaxDays,
      icon: d.icon ?? null,
      // schema has no .default() (Zod 4 partial trap) → server-side fallbacks
      isActive: d.isActive ?? true,
      sortOrder: d.sortOrder ?? 0,
    },
  });
  await logAdmin(admin.id, "DELIVERY_CREATE", {
    entity: "DeliveryMethod",
    entityId: method.id,
    metadata: { name: method.name, type: method.type, cost: method.cost },
    ip: getClientIp(req),
  });
  return ok({ id: method.id, message: "روش ارسال ایجاد شد" }, 201);
}

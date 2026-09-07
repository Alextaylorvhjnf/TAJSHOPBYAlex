import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, ORDER_WRITE, hasPermission } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { notify } from "@/lib/orders";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت", PAID: "پرداخت شده", PROCESSING: "در حال بررسی",
  CONFIRMED: "تأیید شده", READY_TO_SHIP: "آماده ارسال", SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده", CANCELLED: "لغو شده", REFUNDED: "برگشت خورده",
};

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "orders")) return fail("دسترسی لازم را ندارید", 403);

  const order = await db.order.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
    include: {
      items: true,
      payments: true,
      c2cPayment: true,
      user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
    },
  });
  if (!order) return fail("سفارش پیدا نشد", 404);

  return ok({ order });
}

const patchSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "CONFIRMED", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  trackingCode: z.string().max(60).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "orders")) return fail("دسترسی لازم را ندارید", 403);
  if (!ORDER_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  const order = await db.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] } });
  if (!order) return fail("سفارش پیدا نشد", 404);

  await db.order.update({
    where: { id: order.id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.trackingCode !== undefined ? { trackingCode: parsed.data.trackingCode } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    },
  });

  if (parsed.data.status && order.userId) {
    const fa = STATUS_FA[parsed.data.status] ?? parsed.data.status;
    await notify(order.userId, "وضعیت سفارش به‌روزرسانی شد", `وضعیت سفارش ${order.orderNumber} به «${fa}» تغییر کرد.`, "ORDER", "/account/orders");
  }
  await logAdmin(admin.id, "ORDER_STATUS_CHANGE", {
    entity: "Order", entityId: order.id,
    metadata: { from: order.status, to: parsed.data.status ?? order.status, tracking: parsed.data.trackingCode },
    ip: getClientIp(req),
  });
  return ok({ message: "وضعیت سفارش به‌روزرسانی شد" });
}

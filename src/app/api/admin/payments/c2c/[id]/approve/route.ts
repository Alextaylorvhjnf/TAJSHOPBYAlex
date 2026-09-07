import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, ORDER_WRITE, hasPermission } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { markOrderPaid, notify } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "payments")) return fail("دسترسی لازم را ندارید", 403);
  if (!ORDER_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const c2c = await db.cardToCardPayment.findUnique({ where: { id }, include: { order: true } });
  if (!c2c) return fail("پرداخت کارت به کارت پیدا نشد", 404);
  if (c2c.status !== "PENDING") return fail("این رسید قبلاً بررسی شده است", 409);

  await db.cardToCardPayment.update({
    where: { id },
    data: { status: "APPROVED", reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await markOrderPaid(c2c.orderId);
  if (c2c.userId) {
    await notify(c2c.userId, "پرداخت تأیید شد", `پرداخت کارت به کارت سفارش ${c2c.order.orderNumber} تأیید و سفارش وارد پردازش شد.`, "PAYMENT", "/account/orders");
  }
  await logAdmin(admin.id, "C2C_APPROVE", { entity: "CardToCardPayment", entityId: id, metadata: { order: c2c.order.orderNumber }, ip: getClientIp(req) });
  return ok({ message: "پرداخت تأیید شد و سفارش پرداخت‌شده علامت خورد" });
}

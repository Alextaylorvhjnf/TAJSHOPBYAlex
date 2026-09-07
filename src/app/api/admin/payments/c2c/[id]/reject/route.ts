import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, ORDER_WRITE, hasPermission } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { notify } from "@/lib/orders";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ reason: z.string().trim().min(5, "دلیل رد را وارد کنید (حداقل ۵ کاراکتر)").max(300) });

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "payments")) return fail("دسترسی لازم را ندارید", 403);
  if (!ORDER_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "دلیل رد الزامی است", 400);

  const c2c = await db.cardToCardPayment.findUnique({ where: { id }, include: { order: true } });
  if (!c2c) return fail("پرداخت کارت به کارت پیدا نشد", 404);
  if (c2c.status !== "PENDING") return fail("این رسید قبلاً بررسی شده است", 409);

  await db.cardToCardPayment.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: parsed.data.reason, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await db.order.update({ where: { id: c2c.orderId }, data: { paymentStatus: "REJECTED" } }).catch(() => null);
  if (c2c.userId) {
    await notify(
      c2c.userId,
      "رسید پرداخت رد شد",
      `رسید سفارش ${c2c.order.orderNumber} رد شد. دلیل: ${parsed.data.reason}`,
      "PAYMENT",
      "/account/orders"
    );
  }
  await logAdmin(admin.id, "C2C_REJECT", { entity: "CardToCardPayment", entityId: id, metadata: { reason: parsed.data.reason }, ip: getClientIp(req) });
  return ok({ message: "رسید رد شد و به کاربر اطلاع داده شد" });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت", PAID: "پرداخت شده", PROCESSING: "در حال بررسی",
  CONFIRMED: "تأیید شده", READY_TO_SHIP: "آماده ارسال", SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده", CANCELLED: "لغو شده", REFUNDED: "برگشت خورده",
};
const PAY_FA: Record<string, string> = {
  UNPAID: "پرداخت نشده", VERIFYING: "در حال بررسی رسید", PAID: "پرداخت شده",
  REJECTED: "رد شده", FAILED: "ناموفق", REFUNDED: "بازگشت وجه",
};

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`track:${ip}`, 10, 60_000).ok) return fail("درخواست‌های زیاد. کمی بعد تلاش کنید.", 429);

  const url = new URL(req.url);
  const orderNumber = (url.searchParams.get("orderNumber") ?? "").trim().toUpperCase();
  const phone = (url.searchParams.get("phone") ?? "").trim();
  if (!orderNumber || !phone) return fail("شماره سفارش و شماره موبایل الزامی است", 400);

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: true, c2cPayment: true },
  });
  if (!order) return fail("سفارشی با این شماره پیدا نشد", 404);
  if (order.phone !== phone) return fail("شماره موبایل با سفارش مطابقت ندارد", 403);

  return ok({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      statusFa: STATUS_FA[order.status] ?? order.status,
      paymentStatus: order.paymentStatus,
      paymentStatusFa: PAY_FA[order.paymentStatus] ?? order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      trackingCode: order.trackingCode,
      // v16 delivery snapshot
      deliveryMethodName: order.deliveryMethodName,
      deliveryEta: order.deliveryEta,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      c2c: order.c2cPayment
        ? {
            status: order.c2cPayment.status,
            rejectionReason: order.c2cPayment.rejectionReason,
            reviewedAt: order.c2cPayment.reviewedAt,
          }
        : null,
      refId: order.payments.find((p) => p.status === "VERIFIED")?.refId ?? null,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, image: i.image, total: i.total, color: i.color })),
      address: `${order.province}، ${order.city}، ${order.address}`,
    },
  });
}

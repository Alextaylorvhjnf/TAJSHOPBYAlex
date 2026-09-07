import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { zarinpalRequest, zarinpalGatewayAmount, type ZarinPalConfig } from "@/lib/zarinpal";
import { getPaymentSettings } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  const store = await cookies();
  const lastOrder = store.get("taj_last_order")?.value;
  const url = new URL(req.url);
  const phoneParam = url.searchParams.get("phone");

  const order = await db.order.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
    include: { items: true, payments: true, c2cPayment: true },
  });
  if (!order) return fail("سفارش پیدا نشد", 404);

  const authorized =
    (user && order.userId === user.id) ||
    (lastOrder && lastOrder === order.orderNumber) ||
    (phoneParam && phoneParam === order.phone);
  if (!authorized) return fail("دسترسی به این سفارش ندارید", 403);

  return ok({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      discount: order.discount,
      couponCode: order.couponCode,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      email: order.email,
      province: order.province,
      city: order.city,
      address: order.address,
      postalCode: order.postalCode,
      note: order.note,
      trackingCode: order.trackingCode,
      // v16 delivery snapshot
      deliveryMethodName: order.deliveryMethodName,
      deliveryType: order.deliveryType,
      deliveryEta: order.deliveryEta,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
      c2c: order.c2cPayment
        ? {
            status: order.c2cPayment.status,
            rejectionReason: order.c2cPayment.rejectionReason,
            amount: order.c2cPayment.amount,
            senderCard: order.c2cPayment.senderCard,
            trackingNumber: order.c2cPayment.trackingNumber,
          }
        : null,
      payment: order.payments.find((p) => p.status === "VERIFIED") ?? null,
    },
  });
}

/** Retry payment for a pending order (ZarinPal) */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  const store = await cookies();
  const lastOrder = store.get("taj_last_order")?.value;

  const order = await db.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] } });
  if (!order) return fail("سفارش پیدا نشد", 404);
  const authorized = (user && order.userId === user.id) || (lastOrder && lastOrder === order.orderNumber);
  if (!authorized) return fail("دسترسی به این سفارش ندارید", 403);
  if (order.paymentStatus === "PAID") return fail("این سفارش قبلاً پرداخت شده است", 409);
  if (order.paymentMethod !== "ZARINPAL") return fail("این سفارش پرداخت کارت به کارت است", 400);

  const paymentSettings = await getPaymentSettings();
  if (!paymentSettings.zarinpalEnabled || !paymentSettings.zarinpalMerchantId) {
    return fail("پرداخت آنلاین فعال نیست", 400);
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const callbackUrl = `${proto}://${host}/api/payments/zarinpal/callback?order=${order.orderNumber}`;

  const zcfg: ZarinPalConfig = {
    merchantId: paymentSettings.zarinpalMerchantId,
    sandbox: paymentSettings.zarinpalSandbox,
    currency: paymentSettings.zarinpalCurrency === "IRT" ? "IRT" : "IRR",
    referrerId: paymentSettings.zarinpalReferrer || undefined,
  };
  const gatewayAmount = zarinpalGatewayAmount(order.total, zcfg.currency);

  const zres = await zarinpalRequest(zcfg, {
    amount: gatewayAmount,
    callbackUrl,
    description: `پرداخت مجدد سفارش ${order.orderNumber} — تاج الکترونیکس`,
    mobile: order.phone,
    orderId: order.orderNumber,
  });

  await db.payment.create({
    data: {
      orderId: order.id,
      gateway: "ZARINPAL",
      amount: gatewayAmount,
      authority: zres.authority ?? null,
      status: zres.success ? "PENDING" : "FAILED",
      raw: JSON.stringify(zres.raw ?? {}).slice(0, 2000),
    },
  });

  if (zres.success && zres.paymentUrl) {
    return ok({ paymentUrl: zres.paymentUrl });
  }
  return fail(zres.message ?? "ایجاد تراکنش ناموفق بود", 502);
}

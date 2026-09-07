import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { zarinpalVerify, zarinpalGatewayAmount, type ZarinPalConfig } from "@/lib/zarinpal";
import { getPaymentSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

function redirectResult(orderNumber: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(new URL(`/checkout/success/${orderNumber}?${qs}`), 302);
}

/**
 * ZarinPal callback: ?order=TAJ-...&Authority=...&Status=OK|NOK
 * Verifies the transaction server-side and updates the order.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderNumber = (url.searchParams.get("order") ?? "").toUpperCase();
  const authority = url.searchParams.get("Authority") ?? url.searchParams.get("authority") ?? "";
  const status = (url.searchParams.get("Status") ?? url.searchParams.get("status") ?? "").toUpperCase();

  if (!orderNumber || !authority) {
    return NextResponse.redirect(new URL(`/track-order?error=missing`), 302);
  }

  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order) return redirectResult(orderNumber, { status: "failed", reason: "order-not-found" });

  const payment = await db.payment.findFirst({
    where: { authority, orderId: order.id },
    orderBy: { createdAt: "desc" },
  });

  // user cancelled at gateway
  if (status !== "OK") {
    if (payment && payment.status === "PENDING") {
      await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    }
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } }).catch(() => null);
    return redirectResult(orderNumber, { status: "cancelled" });
  }

  // duplicate callback / already verified → idempotent success redirect
  if (payment?.status === "VERIFIED" || order.paymentStatus === "PAID") {
    return redirectResult(orderNumber, { status: "success", ref: payment?.refId ?? "" });
  }

  const settings = await getPaymentSettings();
  if (!settings.zarinpalMerchantId) {
    return redirectResult(orderNumber, { status: "failed", reason: "merchant-missing" });
  }

  // v19: verify with the SAME currency unit the request was created with
  const zcfg: ZarinPalConfig = {
    merchantId: settings.zarinpalMerchantId,
    sandbox: settings.zarinpalSandbox,
    currency: settings.zarinpalCurrency === "IRT" ? "IRT" : "IRR",
    referrerId: settings.zarinpalReferrer || undefined,
  };
  const gatewayAmount = zarinpalGatewayAmount(order.total, zcfg.currency);

  const verify = await zarinpalVerify(zcfg, { amount: gatewayAmount, authority });

  const rawLog = JSON.stringify(verify.raw ?? {}).slice(0, 2000);

  if (verify.success) {
    if (payment) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "VERIFIED", refId: verify.refId ?? null, cardPan: verify.cardPan ?? null, raw: rawLog },
      });
    } else {
      await db.payment.create({
        data: { orderId: order.id, gateway: "ZARINPAL", amount: gatewayAmount, authority, status: "VERIFIED", refId: verify.refId ?? null, raw: rawLog },
      });
    }
    await markOrderPaid(order.id);
    return redirectResult(orderNumber, { status: "success", ref: verify.refId ?? "" });
  }

  if (payment) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", raw: rawLog } });
  }
  await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } }).catch(() => null);
  return redirectResult(orderNumber, { status: "failed", reason: verify.code ? String(verify.code) : "verify" });
}

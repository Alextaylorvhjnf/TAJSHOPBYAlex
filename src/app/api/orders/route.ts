import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getOrCreateCart, getCartWithProducts, serializeCart } from "@/lib/cart";
import { checkoutSchema } from "@/lib/validators";
import { computeTotals, deliveryEtaText, notify } from "@/lib/orders";
import { generateOrderNumber } from "@/lib/product";
import { getPaymentSettings, getStoreSettings } from "@/lib/settings";
import { zarinpalRequest, zarinpalGatewayAmount, type ZarinPalConfig } from "@/lib/zarinpal";
import { rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`order:${ip}`, 6, 60_000).ok) return fail("درخواست‌های زیاد. کمی بعد تلاش کنید.", 429);

  const user = await getAuthUser();
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const info = parsed.data;

  const cart = await getOrCreateCart(user);
  const withProducts = await getCartWithProducts(cart.id);
  const serialized = serializeCart(withProducts);
  if (serialized.items.length === 0) return fail("سبد خرید شما خالی است", 400);
  for (const item of serialized.items) {
    if (!item.inStock) return fail(`موجودی «${item.name}» کافی نیست`, 409);
  }

  const [store, paymentSettings] = await Promise.all([getStoreSettings(), getPaymentSettings()]);
  if (info.paymentMethod === "ZARINPAL" && !paymentSettings.zarinpalEnabled) {
    return fail("پرداخت آنلاین در حال حاضر فعال نیست. روش کارت به کارت را انتخاب کنید.", 400);
  }
  if (info.paymentMethod === "CARD_TO_CARD" && !paymentSettings.c2cEnabled) {
    return fail("پرداخت کارت به کارت در حال حاضر فعال نیست.", 400);
  }
  if (store.minOrderAmount > 0 && serialized.summary.subtotal < store.minOrderAmount) {
    return fail(`حداقل مبلغ سفارش ${store.minOrderAmount.toLocaleString("fa-IR")} تومان است`, 400);
  }

  // ── v16: validate the chosen delivery method (active only) ──
  // No deliveryMethodId → null → legacy v15 flat-shipping totals (back-compat).
  const deliveryMethod = info.deliveryMethodId
    ? await db.deliveryMethod.findFirst({ where: { id: info.deliveryMethodId, isActive: true } })
    : null;
  if (info.deliveryMethodId && !deliveryMethod) {
    return fail("روش ارسال انتخاب‌شده دیگر فعال نیست", 400);
  }

  const totals = await computeTotals(
    serialized.summary.subtotal,
    info.couponCode,
    user,
    false,
    deliveryMethod ? deliveryMethod.cost : null
  );
  if (info.couponCode && totals.coupon && !totals.coupon.valid) {
    return fail(totals.coupon.reason ?? "کد تخفیف قابل استفاده نیست", 400);
  }

  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: user?.id ?? null,
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      paymentMethod: info.paymentMethod,
      subtotal: totals.subtotal,
      discount: totals.discount,
      couponCode: info.couponCode?.toUpperCase() ?? null,
      couponId: totals.coupon?.valid ? totals.coupon.couponId : null,
      shippingCost: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      firstName: info.firstName,
      lastName: info.lastName,
      phone: info.phone,
      email: info.email || null,
      province: info.province,
      city: info.city,
      address: info.address,
      postalCode: info.postalCode || null,
      note: info.note || null,
      // v16 delivery snapshot — order history survives method edits/deletion
      deliveryMethodId: deliveryMethod?.id ?? null,
      deliveryMethodName: deliveryMethod?.name ?? null,
      deliveryType: deliveryMethod?.type ?? null,
      deliveryEta: deliveryMethod
        ? deliveryEtaText(deliveryMethod.etaMinDays, deliveryMethod.etaMaxDays)
        : null,
      items: {
        create: serialized.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          image: item.image,
          unitPrice: item.unitPrice,
          discount: item.oldUnitPrice ? (item.oldUnitPrice - item.unitPrice) * item.quantity : 0,
          quantity: item.quantity,
          color: item.color,
          total: item.lineTotal,
        })),
      },
    },
  });

  // bind order to this browser for guest success page / tracking
  const store2 = await cookies();
  store2.set("taj_last_order", order.orderNumber, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });

  if (user) {
    await notify(user.id, "سفارش ثبت شد", `سفارش ${order.orderNumber} با موفقیت ثبت شد. در انتظار پرداخت است.`, "ORDER", `/account/orders`);
  }

  // ── ZarinPal: create gateway request ──
  if (info.paymentMethod === "ZARINPAL" && paymentSettings.zarinpalMerchantId) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
    const callbackUrl = `${proto}://${host}/api/payments/zarinpal/callback?order=${order.orderNumber}`;

    // v19: full v4-API config — currency (IRR ریال / IRT تومان) + referrer_id
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
      description: `سفارش ${order.orderNumber} — فروشگاه تاج الکترونیکس`,
      mobile: info.phone,
      email: info.email || undefined,
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
      return ok({ orderNumber: order.orderNumber, total: order.total, paymentUrl: zres.paymentUrl, message: "در حال انتقال به درگاه پرداخت…" });
    }
    return fail(zres.message ?? "ایجاد تراکنش پرداخت ناموفق بود. از طریق پیگیری سفارش دوباره تلاش کنید.", 502, "GATEWAY_ERROR");
  }

  if (info.paymentMethod === "ZARINPAL") {
    return fail("شناسه پذیرندهٔ زرین‌پال تنظیم نشده است. با مدیر فروشگاه تماس بگیرید.", 400, "NO_MERCHANT");
  }

  // ── Card-to-Card ──
  return ok({
    orderNumber: order.orderNumber,
    total: order.total,
    paymentMethod: "CARD_TO_CARD",
    cardInfo: {
      cardNumber: paymentSettings.c2cCardNumber,
      cardHolder: paymentSettings.c2cCardHolder,
      iban: paymentSettings.c2cIBAN || null,
      accountNumber: paymentSettings.c2cAccountNumber || null,
      amount: order.total,
      instructions: paymentSettings.c2cInstructions,
      orderNumber: order.orderNumber,
      deliveryMethodName: order.deliveryMethodName,
      deliveryEta: order.deliveryEta,
    },
    message: "سفارش ثبت شد — اطلاعات کارت به کارت نمایش داده می‌شود",
  });
}

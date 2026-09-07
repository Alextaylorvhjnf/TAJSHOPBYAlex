import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";
import type { AuthUser } from "@/lib/auth";

// ─────────────────────────── Coupons ───────────────────────────

export type CouponResult = {
  valid: boolean;
  reason?: string;
  discount: number;
  couponId?: string;
};

export async function validateCoupon(code: string, subtotal: number, user: AuthUser | null): Promise<CouponResult> {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return { valid: false, reason: "کد تخفیف یافت نشد", discount: 0 };
  if (!coupon.isActive) return { valid: false, reason: "این کد تخفیف غیرفعال است", discount: 0 };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { valid: false, reason: "این کد تخفیف هنوز فعال نشده است", discount: 0 };
  if (coupon.expiresAt && coupon.expiresAt < now) return { valid: false, reason: "این کد تخفیف منقضی شده است", discount: 0 };
  if (coupon.minAmount && subtotal < coupon.minAmount)
    return {
      valid: false,
      reason: `حداقل مبلغ سبد خرید برای این کد ${coupon.minAmount.toLocaleString("fa-IR")} تومان است`,
      discount: 0,
    };
  if (coupon.maxUsage > 0 && coupon.usedCount >= coupon.maxUsage)
    return { valid: false, reason: "ظرفیت استفاده از این کد تخفیف تکمیل شده است", discount: 0 };
  if (user) {
    const usedByUser = await db.order.count({
      where: { userId: user.id, couponCode: coupon.code, paymentStatus: "PAID" },
    });
    if (usedByUser >= coupon.perUserLimit)
      return { valid: false, reason: "شما قبلاً از این کد تخفیف استفاده کرده‌اید", discount: 0 };
  }
  const discount =
    coupon.type === "PERCENT"
      ? Math.min(Math.floor((subtotal * coupon.value) / 100), subtotal)
      : Math.min(coupon.value, subtotal);
  return { valid: true, discount, couponId: coupon.id };
}

// ─────────────────────────── Totals ───────────────────────────

export type CartTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon?: CouponResult;
};

/** v16: Persian ETA snapshot for the chosen delivery method (store-info + order) */
export function deliveryEtaText(etaMinDays: number, etaMaxDays: number): string {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (etaMinDays === 0) {
    return etaMaxDays <= 1 ? "همان روز / ۲۴ ساعته" : `۱ تا ${fa(etaMaxDays)} روز کاری`;
  }
  return `${fa(etaMinDays)} تا ${fa(etaMaxDays)} روز کاری`;
}

export async function computeTotals(
  subtotal: number,
  couponCode: string | null | undefined,
  user: AuthUser | null,
  freeShippingCoupon = false,
  /** v16: selected DeliveryMethod.cost — a number (including 0 = free pickup)
   * replaces the flat rate as the shipping BASE. null/undefined keeps the
   * legacy v15 flat-shipping behavior so existing callers are unchanged. */
  deliveryCost: number | null = null
): Promise<CartTotals> {
  const store = await getStoreSettings();
  const coupon = couponCode ? await validateCoupon(couponCode, subtotal, user) : null;
  const discount = coupon?.valid ? coupon.discount : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  let shipping =
    deliveryCost === null || deliveryCost === undefined ? store.shippingFlat : deliveryCost;
  if (store.freeShippingOver > 0 && afterDiscount >= store.freeShippingOver) shipping = 0;
  if (subtotal === 0) shipping = 0;
  const tax = store.taxPercent > 0 ? Math.floor((afterDiscount * store.taxPercent) / 100) : 0;
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: afterDiscount + shipping + tax,
    coupon: coupon ?? undefined,
  };
}

// ─────────────────────────── Order payment finalize (idempotent) ───────────────────────────

export async function notify(userId: string, title: string, message: string, type: string, link?: string) {
  await db.notification.create({ data: { userId, title, message, type, link } }).catch(() => null);
}

/** Mark an order as paid — decrements stock, increments sold/coupon usage, notifies. Idempotent. */
export async function markOrderPaid(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "PAID") return order; // idempotent — prevents duplicate payment effects

  const updated = await db.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "PAID" },
  });

  // stock & sold counters
  for (const item of order.items) {
    if (!item.productId) continue;
    await db.product
      .update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity }, soldCount: { increment: item.quantity } },
      })
      .catch(() => null);
  }
  // coupon usage
  if (order.couponId) {
    await db.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } }).catch(() => null);
  }
  // clear user cart
  if (order.userId) {
    await db.cart.deleteMany({ where: { userId: order.userId } }).catch(() => null);
    await notify(
      order.userId,
      "پرداخت تأیید شد",
      `پرداخت سفارش ${order.orderNumber} با موفقیت تأیید شد. سفارش شما در حال پردازش است.`,
      "PAYMENT",
      `/account/orders`
    );
  }
  return updated;
}

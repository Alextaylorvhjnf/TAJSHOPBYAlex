import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getOrCreateCart, getCartWithProducts, serializeCart } from "@/lib/cart";
import { computeTotals } from "@/lib/orders";

export async function GET(req: Request) {
  const user = await getAuthUser();
  const cart = await getOrCreateCart(user);
  const withProducts = await getCartWithProducts(cart.id);
  const serialized = serializeCart(withProducts);

  const couponCode = new URL(req.url).searchParams.get("coupon");
  const totals = await computeTotals(serialized.summary.subtotal, couponCode, user);

  return ok(
    {
      ...serialized,
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        coupon: totals.coupon ? { valid: totals.coupon.valid, reason: totals.coupon.reason, discount: totals.coupon.discount } : null,
      },
      isGuest: !user,
    },
    200,
    { noStore: true } // session-scoped — never browser-cached
  );
}

export async function DELETE() {
  const user = await getAuthUser();
  const cart = await getOrCreateCart(user);
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  return ok({ message: "سبد خرید خالی شد" });
}

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "crypto";
import type { AuthUser } from "@/lib/auth";
import { GUEST_CART_COOKIE } from "@/lib/auth";

/** Get or create the active cart (user cart or guest cart via cookie) */
export async function getOrCreateCart(user: AuthUser | null) {
  if (user) {
    let cart = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
    if (!cart) {
      cart = await db.cart.create({ data: { userId: user.id }, include: { items: true } });
    }
    return cart;
  }
  const store = await cookies();
  let token = store.get(GUEST_CART_COOKIE)?.value;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    store.set(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  let cart = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  if (!cart) {
    cart = await db.cart.create({ data: { guestToken: token }, include: { items: true } });
  }
  return cart;
}

/** On login: merge guest cart items into user cart, then delete guest cart */
export async function mergeGuestCart(userId: string) {
  const store = await cookies();
  const token = store.get(GUEST_CART_COOKIE)?.value;
  if (!token) return;
  const guestCart = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await db.cart.delete({ where: { id: guestCart.id } }).catch(() => null);
    store.delete(GUEST_CART_COOKIE);
    return;
  }
  const userCart = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  for (const item of guestCart.items) {
    const existing = await db.cartItem.findFirst({
      where: { cartId: userCart.id, productId: item.productId, color: item.color },
    });
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(20, existing.quantity + item.quantity) },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          quantity: item.quantity,
          color: item.color,
          unitPrice: item.unitPrice,
        },
      });
    }
  }
  await db.cart.delete({ where: { id: guestCart.id } }).catch(() => null);
  store.delete(GUEST_CART_COOKIE);
}

export async function getCartWithProducts(cartId: string) {
  return db.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { category: { select: { name: true, slug: true } }, brand: { select: { name: true, slug: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function serializeCart(cart: Awaited<ReturnType<typeof getCartWithProducts>>) {
  if (!cart) return { items: [], summary: { itemCount: 0, subtotal: 0 } };
  const items = cart.items.map((item) => {
    // v19 per-option pricing: honor the per-item price snapshot (color
    // price + variant delta captured at add time) instead of recomputing
    // from the product base — different options of one product keep their
    // own prices in the cart, the drawer and the checkout totals.
    const effective = item.product.discountPrice ?? item.product.price;
    const unit = item.unitPrice > 0 ? item.unitPrice : effective;
    const delta = unit - effective;
    return {
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      sku: item.product.sku,
      image: item.product.mainImage,
      color: item.color,
      quantity: item.quantity,
      unitPrice: unit,
      // pre-discount reference for the SAME selection (base old price ± the
      // option delta) — null when the product has no discount
      oldUnitPrice: item.product.discountPrice ? item.product.price + delta : null,
      lineTotal: unit * item.quantity,
      stock: item.product.stock,
      inStock: item.product.stock >= item.quantity,
    };
  });
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, summary: { itemCount, subtotal } };
}

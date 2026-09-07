import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getOrCreateCart, getCartWithProducts, serializeCart } from "@/lib/cart";
import { updateCartSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  const cart = await getOrCreateCart(user);

  const item = await db.cartItem.findFirst({ where: { id, cartId: cart.id }, include: { product: true } });
  if (!item) return fail("این قلم در سبد شما نیست", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateCartSchema.safeParse(body);
  if (!parsed.success) return fail("مقدار نامعتبر است", 400);

  if (parsed.data.quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    if (parsed.data.quantity > item.product.stock) {
      return fail(`حداکثر ${item.product.stock} عدد موجود است`, 409);
    }
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });
  }

  const withProducts = await getCartWithProducts(cart.id);
  return ok(serializeCart(withProducts));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  const cart = await getOrCreateCart(user);
  const item = await db.cartItem.findFirst({ where: { id, cartId: cart.id } });
  if (!item) return fail("این قلم در سبد شما نیست", 404);
  await db.cartItem.delete({ where: { id: item.id } });
  const withProducts = await getCartWithProducts(cart.id);
  return ok(serializeCart(withProducts));
}

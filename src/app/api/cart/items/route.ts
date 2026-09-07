import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getOrCreateCart, getCartWithProducts, serializeCart } from "@/lib/cart";
import { addToCartSchema } from "@/lib/validators";

function parseJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  const body = await req.json().catch(() => null);
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { productId, quantity, color, variant } = parsed.data;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "PUBLISHED") return fail("محصول یافت نشد", 404);
  if (product.stock <= 0) return fail("این محصول فعلاً ناموجود است", 409);

  /* ── v19 per-option pricing (same rules as the product page) ──
   *  - a color with its own price OVERRIDES the base effective price
   *  - a selected variant (different spec) ADDS its priceDelta
   *  - the variant may carry its own stock ceiling (0 = unavailable)
   *
   *  ── v20 combination override (server is the source of truth) ──
   *  - VARIABLE product + non-empty combinations: the EXACT (color × variant)
   *    row wins — combo.price is the unit price, combo.stock is the ceiling
   *    (0 = ناموجود). No exact row → v19 rules above apply.
   *
   *  ── v26fix: per-combination discount (mirrors the product page) ──
   *  - when the exact row carries a discountPrice (number, 0 < it < price)
   *    that value IS the unit price for this cart line.                 */
  const colors = parseJSON<{ name: string; price?: number }[]>(product.colors, []);
  const variants = parseJSON<{ name: string; priceDelta: number; stock: number }[]>(product.variants, []);
  const combinations = parseJSON<
    { color: string | null; variant: string | null; price: number; stock?: number; discountPrice?: number }[]
  >(product.combinations, []);

  const selectedColor = color ? colors.find((c) => c.name === color) ?? null : null;
  const selectedVariant = variant ? variants.find((v) => v.name === variant) ?? null : null;

  const activeCombo =
    product.productType === "VARIABLE" && combinations.length > 0
      ? combinations.find((c) => (c.color ?? null) === (color ?? null) && (c.variant ?? null) === (variant ?? null)) ?? null
      : null;

  if (variant && !selectedVariant && !activeCombo) {
    return fail("گزینه انتخاب‌شده معتبر نیست", 400);
  }
  if (activeCombo) {
    if (activeCombo.stock === 0) {
      return fail("این ترکیب (رنگ × مشخصه) فعلاً ناموجود است", 409);
    }
  } else if (selectedVariant && selectedVariant.stock <= 0) {
    return fail("این گزینه فعلاً ناموجود است", 409);
  }

  const colorPrice = selectedColor?.price ?? null;
  const base = colorPrice ?? (product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price);
  const unitPrice = activeCombo
    ? activeCombo.discountPrice != null && activeCombo.discountPrice > 0 && activeCombo.discountPrice < activeCombo.price
      ? activeCombo.discountPrice
      : activeCombo.price
    : Math.max(0, base + (selectedVariant?.priceDelta ?? 0));

  // the cart row keeps the FULL selection as one label (color · variant) so
  // different specs of the same product stay separate rows with their own price
  const selectionLabel = [color, variant].filter(Boolean).join(" · ") || null;

  const cart = await getOrCreateCart(user);
  const existing = await db.cartItem.findFirst({
    where: { cartId: cart.id, productId, color: selectionLabel },
  });
  const newQty = (existing?.quantity ?? 0) + quantity;

  // stock ceiling: the exact combination stock (v20) or the variant stock
  // (v19) is stricter than the product stock
  const stockCeiling = activeCombo
    ? activeCombo.stock != null && activeCombo.stock > 0
      ? Math.min(activeCombo.stock, product.stock)
      : product.stock
    : selectedVariant && selectedVariant.stock > 0
      ? Math.min(selectedVariant.stock, product.stock)
      : product.stock;
  if (newQty > stockCeiling) {
    return fail(`حداکثر ${stockCeiling} عدد از این انتخاب در انبار موجود است`, 409);
  }

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty, unitPrice } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, productId, quantity, color: selectionLabel, unitPrice } });
  }
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } }).catch(() => null);

  const withProducts = await getCartWithProducts(cart.id);
  const serialized = serializeCart(withProducts);
  return ok({ ...serialized, message: "به سبد خرید اضافه شد" });
}

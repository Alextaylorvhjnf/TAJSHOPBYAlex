import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { serializeProduct, productInclude } from "@/lib/product";
import { z } from "zod";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: productInclude } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items: items.map((i) => serializeProduct(i.product)) });
}

const toggleSchema = z.object({ productId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("برای ذخیره در علاقه‌مندی‌ها ابتدا وارد شوید", 401);

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return fail("محصول یافت نشد", 404);

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId: parsed.data.productId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return ok({ added: false, message: "از علاقه‌مندی‌ها حذف شد" });
  }
  await db.wishlistItem.create({ data: { userId: user.id, productId: parsed.data.productId } });
  return ok({ added: true, message: "به علاقه‌مندی‌ها اضافه شد" });
}

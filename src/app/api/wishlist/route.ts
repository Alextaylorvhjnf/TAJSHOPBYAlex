import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { serializeProduct, productInclude } from "@/lib/product";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: productInclude } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items: items.map((i) => serializeProduct(i.product)) }, 200, { noStore: true });
}

import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 10 });

  const [total, orders] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { items: true, c2cPayment: true, payments: true },
    }),
  ]);

  return ok(
    {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        total: o.total,
        itemCount: o.items.length,
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, image: i.image })),
        trackingCode: o.trackingCode,
        c2cStatus: o.c2cPayment?.status ?? null,
        createdAt: o.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    200,
    { noStore: true } // session-scoped — never browser-cached
  );
}

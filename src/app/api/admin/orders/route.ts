import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "orders")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 15 });
  const status = url.searchParams.get("status") ?? "";
  const paymentStatus = url.searchParams.get("paymentStatus") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const paymentMethod = url.searchParams.get("paymentMethod") ?? "";

  const filters: Record<string, unknown>[] = [];
  if (status) filters.push({ status });
  if (paymentStatus) filters.push({ paymentStatus });
  if (paymentMethod) filters.push({ paymentMethod });
  if (q) {
    filters.push({
      OR: [{ orderNumber: { contains: q } }, { phone: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }],
    });
  }
  const where = filters.length ? { AND: filters as never[] } : {};

  const [total, orders] = await Promise.all([
    db.order.count({ where: where as never }),
    db.order.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { items: true, c2cPayment: true, user: { select: { email: true } } },
    }),
  ]);

  return ok({
    orders: orders.map((o) => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod, total: o.total, itemCount: o.items.length,
      customer: `${o.firstName} ${o.lastName}`, phone: o.phone, email: o.email ?? o.user?.email,
      c2cStatus: o.c2cPayment?.status ?? null, trackingCode: o.trackingCode,
      createdAt: o.createdAt,
    })),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  });
}

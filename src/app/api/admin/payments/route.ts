import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "payments")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 15 });
  const tab = url.searchParams.get("tab") ?? "all"; // all | gateway | c2c
  const status = url.searchParams.get("status") ?? "";

  const c2cFilters: Record<string, unknown>[] = [];
  if (status) c2cFilters.push({ status });
  const c2cWhere = { AND: c2cFilters as never[] };

  if (tab === "c2c") {
    const [total, c2cs] = await Promise.all([
      db.cardToCardPayment.count({ where: c2cWhere as never }),
      db.cardToCardPayment.findMany({
        where: c2cWhere as never,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: {
          order: { select: { orderNumber: true, total: true, status: true, phone: true, firstName: true, lastName: true } },
        },
      }),
    ]);
    return ok({
      c2cPayments: c2cs,
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
    });
  }

  if (tab === "gateway") {
    const payFilters: Record<string, unknown>[] = [];
    if (status) payFilters.push({ status });
    const [total, payments] = await Promise.all([
      db.payment.count({ where: { AND: payFilters as never[] } }),
      db.payment.findMany({
        where: { AND: payFilters as never[] },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { order: { select: { orderNumber: true, paymentStatus: true, phone: true } } },
      }),
    ]);
    return ok({ payments, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }

  // mixed: both
  const [gatewayPayments, c2cs] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" }, take: limit,
      include: { order: { select: { orderNumber: true, paymentStatus: true, phone: true } } },
    }),
    db.cardToCardPayment.findMany({
      orderBy: { createdAt: "desc" }, take: limit,
      include: { order: { select: { orderNumber: true, total: true, status: true, phone: true, firstName: true, lastName: true } } },
    }),
  ]);
  return ok({
    payments: gatewayPayments,
    c2cPayments: c2cs,
    total: gatewayPayments.length + c2cs.length, page, pages: 1,
  });
}

import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";

/**
 * Live dashboard stats.
 * GET /api/admin/stats?days=7|30|90  (default 30)
 * All data is REAL (from DB). No mocked numbers anywhere.
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") ?? "30") || 30));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

  const [
    totalSales, todaySales, monthSales, totalOrders, pendingOrders, paidOrders,
    totalUsers, totalProducts, lowStock, outOfStock, pendingC2C, unreadMessages,
    newCustomers30, pendingReviews,
    recentOrders, recentPayments, recentMessages,
    rangeOrders, topProducts, usersRaw, statusCounts,
  ] = await Promise.all([
    db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true }, _count: true }),
    db.order.aggregate({ where: { paymentStatus: "PAID", updatedAt: { gte: todayStart } }, _sum: { total: true } }),
    db.order.aggregate({ where: { paymentStatus: "PAID", updatedAt: { gte: monthStart } }, _sum: { total: true } }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { paymentStatus: "PAID" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count(),
    db.product.findMany({ where: { stock: { lte: 5, gt: 0 } }, select: { id: true, name: true, stock: true, sku: true }, take: 10, orderBy: { stock: "asc" } }),
    db.product.count({ where: { stock: { lte: 0 } } }),
    db.cardToCardPayment.count({ where: { status: "PENDING" } }),
    db.customerMessage.count({ where: { status: "NEW" } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30) } } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
    db.payment.findMany({ where: { status: { in: ["VERIFIED", "FAILED"] } }, orderBy: { createdAt: "desc" }, take: 6, include: { order: { select: { orderNumber: true } } } }),
    db.customerMessage.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: rangeStart } },
      select: { createdAt: true, total: true },
    }),
    db.product.findMany({ orderBy: { soldCount: "desc" }, take: 6, select: { name: true, soldCount: true, price: true, mainImage: true, categoryId: true, category: { select: { name: true } } } }),
    // customers per day for growth chart
    db.user.findMany({
      where: { role: "CUSTOMER", createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);

  // ── time series (sales + orders + customers) over the selected range ──
  const salesByDay: { date: string; total: number; count: number; customers: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const dayOrders = rangeOrders.filter((o) => o.createdAt >= d && o.createdAt < next);
    salesByDay.push({
      date: d.toISOString().slice(0, 10),
      total: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
      customers: usersRaw.filter((u) => u.createdAt >= d && u.createdAt < next).length,
    });
  }

  // ── sales by category (real revenue from paid orders) ──
  const paidOrderItems = await db.order.findMany({
    where: { paymentStatus: "PAID" },
    select: { items: { select: { productId: true, total: true } } },
  });
  const productIds = [...new Set(paidOrderItems.flatMap((o) => o.items.map((it) => it.productId)).filter(Boolean) as string[])];
  const catById = new Map<string, string>();
  if (productIds.length > 0) {
    const cats = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: { select: { name: true } } },
    });
    for (const c of cats) catById.set(c.id, c.category.name);
  }
  const catRevenue = new Map<string, number>();
  for (const o of paidOrderItems) {
    for (const it of o.items) {
      if (!it.productId) continue;
      const name = catById.get(it.productId) ?? "سایر";
      catRevenue.set(name, (catRevenue.get(name) ?? 0) + it.total);
    }
  }
  const salesByCategory = [...catRevenue.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return ok({
    stats: {
      totalSales: totalSales._sum.total ?? 0,
      totalPaidOrders: totalSales._count,
      todaySales: todaySales._sum.total ?? 0,
      monthSales: monthSales._sum.total ?? 0,
      totalOrders,
      pendingOrders,
      paidOrders,
      pendingC2C,
      pendingReviews,
      unreadMessages,
      newCustomers30,
      totalUsers,
      totalProducts,
      lowStockProducts: lowStock,
      outOfStock: outOfStock,
      pendingActions: pendingOrders + pendingC2C + pendingReviews + unreadMessages,
      generatedAt: new Date().toISOString(),
    },
    chart: { salesByDay, statusCounts, salesByCategory },
    recentOrders: recentOrders.map((o) => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod, total: o.total, itemCount: o.items.length,
      customer: `${o.firstName} ${o.lastName}`, phone: o.phone, createdAt: o.createdAt,
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id, orderNumber: p.order.orderNumber, amount: p.amount, status: p.status,
      refId: p.refId, gateway: p.gateway, createdAt: p.createdAt,
    })),
    recentMessages: recentMessages.map((m) => ({
      id: m.id, name: `${m.firstName} ${m.lastName}`, subject: m.subject, createdAt: m.createdAt,
    })),
    topProducts: topProducts.map((p) => ({
      name: p.name, soldCount: p.soldCount, price: p.price, mainImage: p.mainImage,
      category: p.category?.name ?? null,
    })),
  });
}

import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "users")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 15 });
  const q = (url.searchParams.get("q") ?? "").trim();
  const role = url.searchParams.get("role") ?? "";

  const filters: Record<string, unknown>[] = [];
  if (q) {
    filters.push({ OR: [{ email: { contains: q } }, { phone: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] });
  }
  if (role) filters.push({ role });
  const where = filters.length ? { AND: filters as never[] } : {};

  const [total, users] = await Promise.all([
    db.user.count({ where: where as never }),
    db.user.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        role: true, isBlocked: true, createdAt: true,
        orders: { select: { total: true, paymentStatus: true } },
      },
    }),
  ]);

  return ok({
    users: users.map((u) => ({
      id: u.id, email: u.email, phone: u.phone, firstName: u.firstName, lastName: u.lastName,
      role: u.role, isBlocked: u.isBlocked, createdAt: u.createdAt,
      orderCount: u.orders.length,
      totalSpent: u.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0),
    })),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  });
}

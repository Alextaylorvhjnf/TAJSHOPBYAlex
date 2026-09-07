import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "logs")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const [total, logs] = await Promise.all([
    db.adminLog.count(),
    db.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { admin: { select: { firstName: true, lastName: true, email: true, role: true } } },
    }),
  ]);
  return ok({
    logs: logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, entityId: l.entityId,
      ip: l.ip, metadata: l.metadata ? JSON.parse(l.metadata) : null, createdAt: l.createdAt,
      admin: l.admin ? `${l.admin.firstName ?? ""} ${l.admin.lastName ?? ""}`.trim() || l.admin.email : "—",
      adminRole: l.admin?.role,
    })),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  });
}

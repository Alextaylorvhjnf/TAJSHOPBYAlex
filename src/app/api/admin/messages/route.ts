import { db } from "@/lib/db";
import { ok, fail, parsePagination } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";

const VALID_STATUS = ["NEW", "READ", "REPLIED", "CLOSED"];

/**
 * Admin messages inbox.
 * GET /api/admin/messages                → paginated list (newest first)
 * GET /api/admin/messages?status=NEW     → filtered by status
 * GET /api/admin/messages?count=1        → lightweight unread badge count
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "messages")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);

  if (url.searchParams.get("count") === "1") {
    const unread = await db.customerMessage.count({ where: { status: "NEW" } });
    return ok({ count: unread });
  }

  const status = url.searchParams.get("status");
  const where = status && VALID_STATUS.includes(status) ? { status } : {};

  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const [messages, total, counts] = await Promise.all([
    db.customerMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    db.customerMessage.count({ where }),
    db.customerMessage.groupBy({ by: ["status"], _count: true }),
  ]);

  const statusCounts: Record<string, number> = { NEW: 0, READ: 0, REPLIED: 0, CLOSED: 0 };
  for (const c of counts) statusCounts[c.status] = c._count;

  return ok({
    messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    statusCounts,
  });
}

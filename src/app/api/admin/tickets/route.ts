import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { serializeTicketRow, ticketListInclude, isTicketStatus } from "@/lib/tickets";
import { normalizeFa } from "@/lib/search";

/**
 * GET /api/admin/tickets — staff ticket inbox.
 * Query params:
 *   ?status=OPEN|ANSWERED|CLOSED  (default: all except CLOSED)
 *   ?q=<search ticketNo/subject/user>  ?count=1 → only the open count
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 403);
  if (!hasPermission(admin, "tickets")) return fail("دسترسی لازم را ندارید", 403);

  const url = new URL(req.url);

  // lightweight badge endpoint
  if (url.searchParams.get("count") === "1") {
    const count = await db.supportTicket.count({ where: { status: "OPEN" } });
    return ok({ count });
  }

  const statusParam = url.searchParams.get("status") ?? "";
  const q = normalizeFa(url.searchParams.get("q") ?? "").trim();

  // Prisma where input — typed loosely, validated by isTicketStatus above
  const where: Record<string, unknown> = {};
  if (statusParam === "ALL") {
    // no status filter
  } else if (isTicketStatus(statusParam)) {
    where.status = statusParam;
  } else {
    // default view: everything that still needs attention
    where.status = { in: ["OPEN", "ANSWERED"] };
  }

  if (q.length >= 2) {
    const users = await db.user.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true },
      take: 50,
    });
    const orClause = [
      { ticketNo: { contains: q.toUpperCase() } },
      { subject: { contains: q } },
      { userId: { in: users.map((u) => u.id) } },
    ];
    if (where.status !== undefined) {
      // combine status + OR through an AND clause
      where.AND = [{ status: where.status }, { OR: orClause }];
      delete where.status;
    } else {
      where.OR = orClause;
    }
  }

  const tickets = await db.supportTicket.findMany({
    where: where as never,
    orderBy: [{ lastReplyAt: "desc" }],
    include: ticketListInclude,
    take: 100,
  });

  const [openCount, answeredCount, closedCount] = await Promise.all([
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.supportTicket.count({ where: { status: "ANSWERED" } }),
    db.supportTicket.count({ where: { status: "CLOSED" } }),
  ]);

  return ok({
    tickets: tickets.map(serializeTicketRow),
    counts: { openCount, answeredCount, closedCount },
  });
}

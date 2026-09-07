import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser, isAdminUser } from "@/lib/auth";
import { parseTicketAttachments } from "@/lib/tickets";

/**
 * GET /api/tickets/[id] — full thread.
 * - the ticket owner sees their own thread
 * - staff (admin roles) sees any ticket
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید.", 401, "AUTH_REQUIRED");

  const { id } = await params;
  const ticket = await db.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNo: id }] },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      },
    },
  });

  if (!ticket) return fail("تیکت پیدا نشد.", 404);
  const isStaff = isAdminUser(user);
  if (ticket.userId !== user.id && !isStaff) return fail("به این تیکت دسترسی ندارید.", 403);

  return ok({
    ticket: {
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      lastReplyAt: ticket.lastReplyAt.toISOString(),
      user: {
        id: ticket.user.id,
        name: `${ticket.user.firstName ?? ""} ${ticket.user.lastName ?? ""}`.trim() || "کاربر",
        phone: ticket.user.phone,
        email: ticket.user.email,
      },
      messages: ticket.messages.map((m) => ({
        id: m.id,
        body: m.body,
        isStaff: m.isStaff,
        createdAt: m.createdAt.toISOString(),
        // v16: parsed attachment array (null when the message has none / corrupt JSON)
        attachments: parseTicketAttachments(m.attachments),
        sender: m.sender
          ? {
              id: m.sender.id,
              name: `${m.sender.firstName ?? ""} ${m.sender.lastName ?? ""}`.trim() || (m.isStaff ? "پشتیبانی" : "کاربر"),
              role: m.sender.role,
            }
          : null,
      })),
    },
  });
}

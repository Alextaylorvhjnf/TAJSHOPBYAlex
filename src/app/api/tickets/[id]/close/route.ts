import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser, isAdminUser } from "@/lib/auth";

/**
 * POST /api/tickets/[id]/close — close a ticket.
 * The ticket owner or any staff member may close it.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید.", 401, "AUTH_REQUIRED");

  const { id } = await params;
  const ticket = await db.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNo: id }] },
    select: { id: true, ticketNo: true, userId: true, status: true },
  });
  if (!ticket) return fail("تیکت پیدا نشد.", 404);

  const isStaff = isAdminUser(user);
  if (ticket.userId !== user.id && !isStaff) return fail("به این تیکت دسترسی ندارید.", 403);

  await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: "CLOSED",
      lastReplyAt: new Date(),
      messages: {
        create: {
          senderId: null,
          isStaff: isStaff,
          body: isStaff ? "این تیکت توسط پشتیبانی بسته شد." : "این تیکت توسط کاربر بسته شد.",
        },
      },
    },
  });

  return ok({ message: "تیکت بسته شد." });
}

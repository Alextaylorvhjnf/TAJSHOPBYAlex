import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser, isAdminUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ticketReplySchema } from "@/lib/validators";
import { notify } from "@/lib/orders";

/**
 * POST /api/tickets/[id]/reply — add a message to a ticket thread.
 * - owner reply → status back to OPEN (reopens), notifies staff dashboard
 * - staff reply  → status ANSWERED + notification to the customer
 *   (visible in their profile / account → tickets, per store-owner spec)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید.", 401, "AUTH_REQUIRED");

  const isStaff = isAdminUser(user);
  const rl = rateLimit(`ticket-reply:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return fail("تعداد پیام‌های امروز شما به سقف رسیده است.", 429);

  const { id } = await params;
  const ticket = await db.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNo: id }] },
    select: { id: true, ticketNo: true, userId: true, subject: true, status: true },
  });
  if (!ticket) return fail("تیکت پیدا نشد.", 404);
  if (ticket.userId !== user.id && !isStaff) return fail("به این تیکت دسترسی ندارید.", 403);
  if (ticket.status === "CLOSED" && !isStaff) {
    return fail("این تیکت بسته شده است. در صورت نیاز تیکت جدیدی ثبت کنید.", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = ticketReplySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "متن پاسخ نامعتبر است", 400);

  const message = await db.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      isStaff,
      body: parsed.data.body,
      // v16: media attachments — JSON [{url,name,kind,size}], validated by
      // ticketReplySchema above (URLs are /uploads/tickets/… only)
      attachments: parsed.data.attachments?.length ? JSON.stringify(parsed.data.attachments) : null,
    },
  });

  const newStatus = isStaff ? "ANSWERED" : "OPEN";
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: newStatus, lastReplyAt: new Date() },
  });

  // staff answer → the customer gets a profile notification
  if (isStaff) {
    await notify(
      ticket.userId,
      `پاسخ تیکت ${ticket.ticketNo}`,
      `پشتیبانی به «${ticket.subject}» پاسخ داد.`,
      "INFO",
      "/account/tickets"
    ).catch(() => undefined);
  }

  return ok(
    {
      message: {
        id: message.id,
        body: message.body,
        isStaff: message.isStaff,
        createdAt: message.createdAt.toISOString(),
        // v16: echo the parsed attachment array back to the sender
        attachments: parsed.data.attachments ?? null,
        sender: {
          id: user.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || (isStaff ? "پشتیبانی" : "کاربر"),
          role: user.role,
        },
      },
      status: newStatus,
    },
    201
  );
}

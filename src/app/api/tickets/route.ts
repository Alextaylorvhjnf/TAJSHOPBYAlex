import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser, isAdminUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ticketCreateSchema } from "@/lib/validators";
import { makeTicketNo, serializeTicketRow, ticketListInclude } from "@/lib/tickets";

/** GET /api/tickets — the signed-in user's own tickets (newest activity first) */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید.", 401, "AUTH_REQUIRED");

  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: [{ lastReplyAt: "desc" }],
    include: ticketListInclude,
    take: 100,
  });

  return ok({
    tickets: tickets.map(serializeTicketRow),
    openCount: tickets.filter((t) => t.status === "OPEN").length,
  });
}

/** POST /api/tickets — open a new support ticket (auth required) */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("برای ثبت تیکت ابتدا وارد حساب کاربری خود شوید.", 401, "AUTH_REQUIRED");

  const rl = rateLimit(`ticket:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return fail("تعداد تیکت‌های امروز شما به سقف رسیده است. کمی بعد دوباره تلاش کنید.", 429);

  const body = await req.json().catch(() => null);
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { subject, message } = parsed.data;

  const ticket = await db.supportTicket.create({
    data: {
      ticketNo: await makeTicketNo(),
      userId: user.id,
      subject,
      messages: {
        create: {
          senderId: user.id,
          isStaff: false,
          body: message,
          // v16: media attachments — JSON [{url,name,kind,size}], validated by
          // ticketAttachmentSchema above (URLs are /uploads/tickets/… only)
          attachments: parsed.data.attachments?.length ? JSON.stringify(parsed.data.attachments) : null,
        },
      },
    },
    include: ticketListInclude,
  });

  return ok({ ticket: serializeTicketRow(ticket) }, 201);
}

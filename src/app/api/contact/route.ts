import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { contactMessageSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/auth";
import { makeTicketNo } from "@/lib/tickets";

/**
 * Contact form endpoint (v14.1 — ticketing system).
 *
 * Policy (store-owner requirement):
 * - ONLY logged-in users can send messages — guests get 401 + a friendly
 *   Persian message so the UI can show the login prompt.
 * - Every submission opens a SUPPORT TICKET (subject + first message);
 *   staff replies land in the customer's profile (account → tickets)
 *   and generate a notification.
 * - Server-side zod validation + in-memory rate limiting stay.
 * - The old honeypot ("company" max(0)) was removed — browser autofill
 *   filled it for real users and zod rejected the whole message
 *   ("Too big: expected string to have <=0 characters").
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return fail("برای ارسال پیام ابتدا وارد حساب کاربری خود شوید.", 401, "AUTH_REQUIRED");
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return fail("تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات ارسالی نامعتبر است", 400);

  const { firstName, lastName, email, phone, subject, message } = parsed.data;

  const ticket = await db.supportTicket.create({
    data: {
      ticketNo: await makeTicketNo(),
      userId: user.id,
      subject,
      // contact details travel with the first message so staff sees them
      // in one place; they also update the user profile cheaply (no
      // destructive overwrite — only filling previously-empty fields).
      messages: {
        create: {
          senderId: user.id,
          isStaff: false,
          body: `${message}\n\n—\nفرستنده: ${firstName} ${lastName}${phone ? ` | موبایل: ${phone}` : ""}${email ? ` | ایمیل: ${email}` : ""}`,
        },
      },
    },
    include: { messages: { take: 1 } },
  });

  // keep the user's profile contact fields filled when they were empty
  const patch: { firstName?: string; lastName?: string; email?: string; phone?: string } = {};
  if (!user.firstName && firstName) patch.firstName = firstName;
  if (!user.lastName && lastName) patch.lastName = lastName;
  if (!user.email && email) patch.email = email;
  if (!user.phone && phone) patch.phone = phone;
  if (Object.keys(patch).length > 0) {
    await db.user.update({ where: { id: user.id }, data: patch }).catch(() => undefined);
  }

  return ok(
    {
      ticketNo: ticket.ticketNo,
      message: `پیام شما با شماره پیگیری ${ticket.ticketNo} ثبت شد. پاسخ کارشناسان در بخش «تیکت‌های من» حساب کاربری شما نمایش داده می‌شود.`,
    },
    201
  );
}

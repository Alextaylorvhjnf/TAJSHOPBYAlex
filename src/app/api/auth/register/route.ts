import { db } from "@/lib/db";
import { ok, fail, getClientIp, getUserAgent } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { createSession, hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { mergeGuestCart } from "@/lib/cart";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`register:${ip}`, 5, 60_000).ok) {
    return fail("تلاش‌های زیاد. لطفاً یک دقیقه دیگر تلاش کنید.", 429);
  }
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  }
  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [...(email ? [{ email }] : []), { phone }] },
  });
  if (existing) {
    if (existing.phone === phone) return fail("این شماره موبایل قبلاً ثبت‌نام کرده است. وارد شوید.", 409);
    return fail("این ایمیل قبلاً ثبت‌نام کرده است. وارد شوید.", 409);
  }

  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone,
      passwordHash: await hashPassword(password),
      role: "CUSTOMER",
    },
  });

  await createSession(user.id, ip, getUserAgent(req));
  await mergeGuestCart(user.id);
  await db.notification.create({
    data: {
      userId: user.id,
      title: "به تاج الکترونیکس خوش آمدید",
      message: "حساب کاربری شما با موفقیت ایجاد شد. از خرید لذت ببرید!",
      type: "SYSTEM",
    },
  }).catch(() => null);

  return ok({
    user: { id: user.id, firstName, lastName, email: user.email, phone, role: user.role },
    message: "ثبت‌نام با موفقیت انجام شد",
  });
}

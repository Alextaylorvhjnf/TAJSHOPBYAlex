import { db, ensureRuntimeSchema } from "@/lib/db";
import { ok, fail, getClientIp, getUserAgent } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { createSession, verifyPassword, isAdminUser, recoveryCodeMatches } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { mergeGuestCart } from "@/lib/cart";
import { logAdmin } from "@/lib/admin-log";
import { normalizeFa } from "@/lib/search";

export async function POST(req: Request) {
  /* v29.1: the login query selects the v29 recoveryCodeHash column — on an
   * upgraded (v28) volume without `prisma db push` having run this would 500
   * («خطا در ارتباط با سرور») and lock every admin out. Heal first (cached). */
  await ensureRuntimeSchema();
  const ip = getClientIp(req);
  if (!rateLimit(`login:${ip}`, 8, 60_000).ok) {
    return fail("تلاش‌های زیاد. لطفاً یک دقیقه دیگر تلاش کنید.", 429);
  }
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  }
  const { identifier, password, recoveryCode } = parsed.data;
  const idn = identifier.replace(/\s/g, "");

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: idn }, { phone: idn }, { phone: `0${idn}` }],
    },
  });

  /* v29: recovery-phrase login («فراموشی رمز» on /admin/login). The phrase
   * is verified against its SHA-256 hash and REPLACES the password check —
   * the admin lands in the panel and is asked to set a new password. */
  if (recoveryCode) {
    const validCode = recoveryCodeMatches(recoveryCode, user?.recoveryCodeHash);
    if (!user || !validCode) {
      return fail("کد بازیابی معتبر نیست یا با این حساب مطابقت ندارد", 401);
    }
    if (user.isBlocked) {
      return fail("حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.", 403);
    }
    await createSession(user.id, ip, getUserAgent(req));
    if (isAdminUser(user)) {
      await logAdmin(user.id, "LOGIN_RECOVERY_CODE", { ip });
    }
    return ok({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      message: "با کد بازیابی وارد شدید — لطفاً از «حساب من» رمز عبور جدیدی تعیین کنید",
      redirect: isAdminUser(user) ? "/admin/account" : "/account",
      viaRecoveryCode: true,
    });
  }

  // constant-ish time: always run a compare
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const valid = await verifyPassword(password ?? "", hash);
  if (!user || !valid) {
    return fail("ایمیل/موبایل یا رمز عبور اشتباه است", 401);
  }
  if (user.isBlocked) {
    return fail("حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.", 403);
  }

  await createSession(user.id, ip, getUserAgent(req));
  await mergeGuestCart(user.id);
  if (isAdminUser(user)) {
    await logAdmin(user.id, "LOGIN", { ip });
  }

  return ok({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    message: "خوش آمدید!",
    // customers land on their dashboard; admins on the admin panel
    redirect: isAdminUser(user) ? "/admin" : "/account",
  });
}

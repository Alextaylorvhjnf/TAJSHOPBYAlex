import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAuthUser, verifyPassword, hashPassword, isAdminUser, SESSION_COOKIE } from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

/**
 * Change own password.
 * - Requires current password (session-hijack protection)
 * - Invalidates ALL other sessions of the user, keeps the current one alive
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`password-change:${ip}`, 5, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد شوید", 401);

  const body = await req.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full) return fail("کاربر پیدا نشد", 404);

  const valid = await verifyPassword(parsed.data.currentPassword, full.passwordHash);
  if (!valid) return fail("رمز عبور فعلی اشتباه است", 401);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Keep current session, kill all others
  const store = await cookies();
  const currentToken = store.get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId: user.id, ...(currentToken ? { token: { not: currentToken } } : {}) },
  });

  if (isAdminUser(user)) {
    await logAdmin(user.id, "PASSWORD_CHANGE", { entity: "User", entityId: user.id, ip });
  }

  return ok({ message: "رمز عبور با موفقیت تغییر کرد" });
}

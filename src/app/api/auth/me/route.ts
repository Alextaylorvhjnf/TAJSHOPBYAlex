import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser, publicUser, hashPassword, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { z } from "zod";
import { phoneSchema, emailSchema } from "@/lib/validators";
import { cookies } from "next/headers";

export async function GET() {
  // no-store: the browser must never serve a heuristically cached session
  // state (otherwise the header shows a stale user right after login/logout)
  const user = await getAuthUser();
  if (!user) return ok({ user: null }, 200, { noStore: true });
  const [notifUnread, wishlistCount, ordersCount] = await Promise.all([
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id } }),
  ]);
  return ok(
    { user: publicUser(user), counts: { notifications: notifUnread, wishlist: wishlistCount, orders: ordersCount } },
    200,
    { noStore: true }
  );
}

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: emailSchema.optional(),
  phone: phoneSchema.optional().nullable(),
  /* v27.1: profile avatar — a preset face (girl/man) from /avatars/ or a
   * previously uploaded image under /uploads/. null clears the avatar. */
  avatar: z
    .string()
    .max(300)
    .refine((v) => v.startsWith("/avatars/") || v.startsWith("/uploads/"), {
      message: "آواتار نامعتبر است",
    })
    .nullable()
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(72).optional().nullable(),
});

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const { firstName, lastName, email, phone, avatar, currentPassword, newPassword } = parsed.data;

  const data: Record<string, unknown> = { firstName, lastName, email: email || null };
  if (avatar !== undefined) data.avatar = avatar || null;
  if (phone) {
    const dupe = await db.user.findFirst({ where: { phone, NOT: { id: user.id } } });
    if (dupe) return fail("این شماره موبایل برای حساب دیگری ثبت شده است", 409);
    data.phone = phone;
  }
  if (email) {
    const dupe = await db.user.findFirst({ where: { email, NOT: { id: user.id } } });
    if (dupe) return fail("این ایمیل برای حساب دیگری ثبت شده است", 409);
  }
  if (newPassword) {
    if (!currentPassword) return fail("برای تغییر رمز عبور، رمز فعلی را وارد کنید", 400);
    const full = await db.user.findUnique({ where: { id: user.id } });
    const valid = full && (await verifyPassword(currentPassword, full.passwordHash));
    if (!valid) return fail("رمز عبور فعلی اشتباه است", 400);
    data.passwordHash = await hashPassword(newPassword);
  }

  const updated = await db.user.update({ where: { id: user.id }, data });

  // Security: password change → invalidate all OTHER sessions (keep current)
  if (newPassword) {
    const store = await cookies();
    const currentToken = store.get(SESSION_COOKIE)?.value;
    await db.session.deleteMany({
      where: { userId: user.id, ...(currentToken ? { token: { not: currentToken } } : {}) },
    });
  }

  return ok({ user: publicUser(updated), message: "اطلاعات حساب به‌روزرسانی شد" });
}

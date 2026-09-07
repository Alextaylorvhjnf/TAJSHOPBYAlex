import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAuthUser, isAdminUser, publicUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";

/** Update own profile (name / email / phone). Authenticated users only. */
export async function PATCH(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`profile:${ip}`, 10, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد شوید", 401);

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { firstName, lastName, email, phone, avatar } = parsed.data;

  // Uniqueness checks (email + phone) excluding self
  const clash = await db.user.findFirst({
    where: {
      id: { not: user.id },
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true, email: true, phone: true },
  });
  if (clash) {
    if (email && clash.email === email) return fail("این ایمیل قبلاً ثبت شده است", 409);
    if (phone && clash.phone === phone) return fail("این شماره موبایل قبلاً ثبت شده است", 409);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      firstName,
      lastName,
      email: email || null,
      phone,
      /* v29: admin profile avatar (presets / upload / store logo) — only
       * written when the client actually sent the field. */
      ...(avatar !== undefined ? { avatar: avatar || null } : {}),
    },
  });

  if (isAdminUser(user)) {
    await logAdmin(user.id, "PROFILE_UPDATE", { entity: "User", entityId: user.id, ip });
  }

  return ok({ user: publicUser(updated), message: "اطلاعات حساب به‌روزرسانی شد" });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAuthUser, isAdminUser, generateRecoveryCode, hashRecoveryCode } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";

/**
 * v29 · POST /api/account/recovery-code
 * -----------------------------------------------------------------------
 * (Re)generates the caller's one-time RECOVERY PHRASE. The plain phrase is
 * returned EXACTLY ONCE — afterwards only its SHA-256 hash lives in the DB
 * and it can never be viewed again (only replaced by regenerating).
 *
 * Managed from Admin → حساب من → «کد بازیابی حساب».
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`recovery-code:${ip}`, 5, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد شوید", 401);
  if (!isAdminUser(user)) return fail("کد بازیابی فقط برای حساب‌های مدیریتی فعال است", 403);

  const code = generateRecoveryCode();
  await db.user.update({
    where: { id: user.id },
    data: { recoveryCodeHash: hashRecoveryCode(code) },
  });

  if (isAdminUser(user)) {
    await logAdmin(user.id, "RECOVERY_CODE_GENERATED", { entity: "User", entityId: user.id, ip });
  }

  return ok({
    message: "کد بازیابی جدید ساخته شد — همین‌جا یک‌بار نمایش داده می‌شود و دیگر هرگز",
    recoveryCode: code,
    generatedAt: new Date().toISOString(),
  });
}

/** GET — whether a recovery phrase exists (never the phrase itself). */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد شوید", 401);
  if (!isAdminUser(user)) return fail("کد بازیابی فقط برای حساب‌های مدیریتی فعال است", 403);
  return ok({ hasRecoveryCode: !!user.recoveryCodeHash });
}

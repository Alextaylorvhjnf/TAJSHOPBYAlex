import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus, invalidateInstallCache } from "@/lib/installer/state";
import { runDbPush } from "@/lib/installer/db-setup";

/**
 * POST /api/install/database-setup — runs the project's existing migration
 * system (`prisma db push`) non-destructively (installer-only).
 */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-dbpush:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  try {
    const result = await runDbPush();
    invalidateInstallCache();
    return ok({ success: result.ok, message: result.message, log: result.log });
  } catch (e) {
    console.error("[installer] database-setup failed:", e);
    return fail("راه‌اندازی دیتابیس با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }
}

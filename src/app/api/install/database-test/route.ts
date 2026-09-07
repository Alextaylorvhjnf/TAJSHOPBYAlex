import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus } from "@/lib/installer/state";
import { getDbInfo } from "@/lib/installer/requirements";
import { db } from "@/lib/db";

/** POST /api/install/database-test — real connection probe (installer-only). */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-dbtest:${getClientIp(req)}`, 12, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const info = await getDbInfo();
  try {
    await db.$queryRaw`SELECT 1`;
    let tables = 0;
    try {
      const rows = (await db.$queryRawUnsafe(
        "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table'"
      )) as { c: number | bigint }[];
      tables = Number(rows[0]?.c ?? 0);
    } catch {
      /* sqlite_master not readable — treat as 0 */
    }
    return ok({
      success: true,
      message: info.exists
        ? "اتصال به دیتابیس با موفقیت برقرار شد"
        : "موتور دیتابیس فعال است؛ فایل در مرحله راه‌اندازی ساخته می‌شود",
      fileExists: info.exists,
      tables,
    });
  } catch (e) {
    console.error("[installer] database-test failed:", e);
    return ok({
      success: false,
      message: "اتصال به دیتابیس برقرار نشد. لطفاً مسیر فایل دیتابیس و دسترسی پوشه db را بررسی کنید.",
      fileExists: info.exists,
      tables: 0,
    });
  }
}

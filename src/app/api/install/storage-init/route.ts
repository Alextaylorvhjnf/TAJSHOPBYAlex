import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus } from "@/lib/installer/state";
import { initStorage } from "@/lib/installer/init";

/** POST /api/install/storage-init — ensures upload storage dirs (installer-only). */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-storage:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  try {
    const result = await initStorage();
    if (!result.writable) {
      return fail("پوشه ذخیره‌سازی قابل نوشتن نیست — دسترسی public/uploads را بررسی کنید.", 500);
    }
    return ok({ success: true, message: "فضای ذخیره‌سازی آماده شد", dirs: result.dirs.length });
  } catch (e) {
    console.error("[installer] storage-init failed:", e);
    return fail("آماده‌سازی فضای ذخیره‌سازی با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }
}

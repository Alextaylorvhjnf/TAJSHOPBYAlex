import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus } from "@/lib/installer/state";
import { checkRequirements } from "@/lib/installer/requirements";

/** POST /api/install/requirements — live system checks (installer-only). */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است. لطفاً از صفحه اصلی استفاده کنید.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-req:${getClientIp(req)}`, 12, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  try {
    const result = await checkRequirements();
    return ok(result);
  } catch (e) {
    console.error("[installer] requirements check failed:", e);
    return fail("بررسی پیش‌نیازها با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }
}

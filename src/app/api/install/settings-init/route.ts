import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus } from "@/lib/installer/state";
import { initSettings } from "@/lib/installer/init";

/** POST /api/install/settings-init — creates default settings rows (installer-only). */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-settings:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  try {
    const result = await initSettings();
    return ok({
      success: true,
      message: result.created.length
        ? "تنظیمات پیش‌فرض فروشگاه ایجاد شد"
        : "تنظیمات از قبل موجود بود — بدون تغییر",
      created: result.created,
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2021") {
      return fail("جدول‌های تنظیمات هنوز ساخته نشده‌اند — ابتدا گام «راه‌اندازی دیتابیس» را کامل کنید.", 400);
    }
    console.error("[installer] settings-init failed:", e);
    return fail("مقداردهی تنظیمات با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }
}

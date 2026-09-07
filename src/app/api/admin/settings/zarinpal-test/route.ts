import { ok, fail } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { getPaymentSettings } from "@/lib/settings";
import { zarinpalTest } from "@/lib/zarinpal";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  if (!rateLimit(`zptest:${admin.id}`, 3, 60_000).ok) return fail("تلاش‌های زیاد", 429);

  const settings = await getPaymentSettings();
  if (!settings.zarinpalMerchantId) {
    return fail("ابتدا شناسه پذیرنده (Merchant ID) را ذخیره کنید", 400);
  }
  const result = await zarinpalTest({
    merchantId: settings.zarinpalMerchantId,
    sandbox: settings.zarinpalSandbox,
    currency: settings.zarinpalCurrency === "IRT" ? "IRT" : "IRR",
    referrerId: settings.zarinpalReferrer || undefined,
  });
  return ok(result);
}

import { db } from "@/lib/db";
import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus, markInstalled, invalidateInstallCache } from "@/lib/installer/state";
import { completeSchema } from "@/lib/installer/schemas";

/**
 * POST /api/install/complete — writes the permanent installation lock.
 * Double-checked: state is re-verified immediately before writing.
 */
export async function POST(req: Request) {
  // double-check (fresh read, no cache)
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است. لطفاً از صفحه اصلی استفاده کنید.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-complete:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body ?? {});
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  try {
    await markInstalled(parsed.data.adminUserId);
  } catch (e) {
    console.error("[installer] complete failed:", e);
    return fail("ثبت نهایی نصب با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }

  // best-effort audit entry (installer completion)
  try {
    await db.adminLog.create({
      data: {
        adminId: parsed.data.adminUserId ?? "",
        action: "INSTALL_COMPLETED",
        entity: "InstallationState",
        entityId: "main",
        ip: getClientIp(req),
        metadata: JSON.stringify({ source: "installer" }),
      },
    });
  } catch {
    /* non-fatal — adminId may be absent */
  }

  invalidateInstallCache();
  return ok({ success: true, message: "نصب با موفقیت تکمیل و قفل شد", installed: true });
}

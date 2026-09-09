import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { invalidateInstallCache, getInstallStatus, INSTALLER_VERSION } from "@/lib/installer/state";
import { logAdmin } from "@/lib/admin-log";

/**
 * v29.1 — PUT /api/admin/settings/reinstall
 *
 * Re-opens the /install wizard on an ALREADY-INSTALLED store.
 *
 * WHY: when a new version is deployed over an existing Docker volume, the
 * old InstallationState row (installed=true) makes /install permanently
 * redirect (307) to / — the admin can never re-run the wizard to apply the
 * new defaults (demo catalog import, settings-init, a fresh admin account
 * with a one-time recovery phrase). This was reported on a live v28→v29
 * upgrade: «ویزارد نصب همون /install نیامد».
 *
 * SAFETY:
 *  - SUPER_ADMIN only (the same role level the installer itself creates).
 *  - Flips ONLY the InstallationState row to installed=false — products,
 *    orders, users, uploads and every setting are untouched.
 *  - IMPORTANT: the row is NOT deleted. state.ts legacy detection treats a
 *    missing row + existing admin users as "installed before the installer
 *    existed" and would immediately re-lock the wizard on the next request;
 *    an explicit installed=false row is the canonical "wizard is open"
 *    signal that wins over every fallback path.
 *  - The wizard itself is idempotent: it creates a NEW admin (the old ones
 *    keep working), settings-init only fills empty defaults, and the demo
 *    catalog import is skipped when products already exist.
 *  - The installer APIs refuse to run once the flag is set again (the
 *    wizard's final step re-locks it), so this cannot re-open attack
 *    surface persistently.
 */
export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (admin.role !== "SUPER_ADMIN") {
    return fail("فقط مدیر کل می‌تواند ویزارد نصب را باز کند", 403);
  }

  const status = await getInstallStatus(true);
  if (!status.installed) {
    return ok({ message: "ویزارد نصب از قبل باز است — به صفحه /install بروید", alreadyOpen: true });
  }

  /* explicit installed=false beats the legacy admin-detection fallback —
   * a deleted row would be instantly re-created as installed=true by any
   * deployment that already has admin users (v28 upgrades!). */
  await db.installationState.upsert({
    where: { id: "main" },
    create: { id: "main", installed: false, version: INSTALLER_VERSION },
    update: { installed: false, installedAt: null, adminUserId: null, version: INSTALLER_VERSION },
  });
  invalidateInstallCache();
  await logAdmin(admin.id, "INSTALL_WIZARD_REOPEN", {
    entity: "InstallationState",
    entityId: "main",
    ip: getClientIp(req),
    metadata: { note: "نصب قفل‌شده بود؛ پرچم نصب به «غیرنصب‌شده» برگردانده شد تا ویزارد دوباره اجرا شود. داده‌ها دست‌نخورده ماندند." },
  });

  return ok({
    message: "قفل نصب برداشته شد — ویزارد نصب دوباره در /install باز است",
    redirect: "/install",
  });
}

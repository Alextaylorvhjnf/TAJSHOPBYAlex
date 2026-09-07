import { db } from "@/lib/db";
import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus, INSTALLER_VERSION } from "@/lib/installer/state";
import { adminAccountSchema } from "@/lib/installer/schemas";
import { hashPassword, generateRecoveryCode, hashRecoveryCode } from "@/lib/auth";

function prismaCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return undefined;
}

/**
 * POST /api/install/create-admin — creates the first SUPER_ADMIN using the
 * application's existing auth system (bcrypt hash, User model). Idempotent:
 * re-submitting the same SUPER_ADMIN account reuses it (safe retry).
 */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-admin:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = adminAccountSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const { firstName, lastName, phone, email, password } = parsed.data;

  try {
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    /* v29: one-time recovery phrase for the fresh SUPER_ADMIN — generated
     * here, returned ONCE to the wizard (shown on the final step with a
     * «save it somewhere safe» warning) and stored only as a hash. A retry
     * that reuses an existing account keeps its old phrase (never printed
     * again — the admin can regenerate it from حساب من). */
    const recoveryCode = generateRecoveryCode();

    let user: { id: string; email: string | null; phone: string | null; firstName: string | null; lastName: string | null };
    if (existing) {
      if (existing.role === "SUPER_ADMIN") {
        // idempotent retry — reuse, never duplicate
        user = existing;
      } else {
        return fail(
          "کاربری با این ایمیل یا موبایل وجود دارد ولی مدیر کل نیست. ایمیل/موبایل دیگری وارد کنید.",
          409
        );
      }
    } else {
      user = await db.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          passwordHash: await hashPassword(password),
          role: "SUPER_ADMIN",
          recoveryCodeHash: hashRecoveryCode(recoveryCode),
        },
        select: { id: true, email: true, phone: true, firstName: true, lastName: true },
      });
    }

    /**
     * Persist the installation state row (installed=false) as soon as the admin
     * account exists. This makes the canonical flag row authoritative for all
     * subsequent lock checks, so the legacy "has admin users" detection can
     * never fire mid-wizard and prematurely lock the installer.
     */
    await db.installationState.upsert({
      where: { id: "main" },
      create: { id: "main", installed: false, adminUserId: user.id, version: INSTALLER_VERSION },
      update: { installed: false, adminUserId: user.id },
    });

    // audit via the existing AdminLog system (actor = the admin account)
    try {
      await db.adminLog.create({
        data: {
          adminId: user.id,
          action: "INSTALL_ADMIN_CREATED",
          entity: "User",
          entityId: user.id,
          ip: getClientIp(req),
          metadata: JSON.stringify({ source: "installer", reused: !!existing }),
        },
      });
    } catch {
      /* non-fatal */
    }

    const reused = !!existing;
    return ok({
      message: reused ? "حساب مدیر موجود برای این نصب استفاده شد" : "حساب مدیر کل با موفقیت ایجاد شد",
      user: { id: user.id, email: user.email, phone: user.phone },
      /* shown ONCE on the install DoneStep — for a reused (retry) account
       * no phrase is returned: it was already shown at its own creation. */
      ...(reused ? {} : { recoveryCode }),
    });
  } catch (e) {
    if (prismaCode(e) === "P2021" || prismaCode(e) === "P2022") {
      return fail("جدول کاربران هنوز ساخته نشده است — ابتدا گام «راه‌اندازی دیتابیس» را کامل کنید.", 400);
    }
    console.error("[installer] create-admin failed:", e);
    return fail("ایجاد حساب مدیر با خطا مواجه شد. لطفاً دوباره تلاش کنید.", 500);
  }
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import {
  getAdminUser,
  SETTINGS_WRITE,
  hashPassword,
  ADMIN_PERMISSIONS,
  MANAGER_ROLES,
} from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { phoneSchema, passwordSchema } from "@/lib/validators";
import { z } from "zod";

/**
 * v29.2 · MANAGERS — update (profile/role/permissions/block/password-reset)
 * and demote-to-customer (DELETE). Only ADMIN/SUPER_ADMIN reach here.
 */

type Params = { params: Promise<{ id: string }> };

const PERMISSION_KEYS: ReadonlySet<string> = new Set(ADMIN_PERMISSIONS.map((p) => p.key));

const updateSchema = z.object({
  firstName: z.string().trim().min(2, "نام حداقل ۲ کاراکتر باشد").max(60).optional(),
  lastName: z.string().trim().min(2, "نام خانوادگی حداقل ۲ کاراکتر باشد").max(60).optional(),
  phone: phoneSchema.optional().nullable(),
  role: z.enum(MANAGER_ROLES).optional(),
  permissions: z.array(z.string()).max(20, "حداکثر ۲۰ دسترسی").optional(),
  isBlocked: z.boolean().optional(),
  newPassword: passwordSchema.optional(),
});

/** active (unblocked) ADMIN/SUPER_ADMIN accounts OTHER than the given user */
function otherActiveAdmins(excludeId: string) {
  return db.user.count({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      isBlocked: false,
      NOT: { id: excludeId },
    },
  });
}

/** PUT — update a manager. SUPER_ADMIN accounts are only editable by a
 *  SUPER_ADMIN; nobody may EVER set SUPER_ADMIN through this API. */
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("مدیر پیدا نشد", 404);

  // a SUPER_ADMIN account is untouchable for anyone but a SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    return fail("تغییرات روی مدیر کل فقط توسط مدیر کل امکان‌پذیر است", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const isSelf = target.id === admin.id;
  const data: Record<string, unknown> = {};

  // ── self-protections ──
  if (isSelf && d.isBlocked === true) {
    return fail("نمی‌توانید حساب خودتان را مسدود کنید", 400);
  }
  if (isSelf && d.role !== undefined && d.role !== target.role) {
    return fail("سطح دسترسی حساب خودتان را نمی‌توانید تغییر دهید", 400);
  }
  if (isSelf && d.newPassword) {
    return fail("برای تغییر رمز خودتان از صفحه «حساب من» استفاده کنید (نیاز به رمز فعلی)", 400);
  }

  // ── role ──
  if (d.role !== undefined && d.role !== target.role) {
    if (d.role === "ADMIN" && admin.role !== "SUPER_ADMIN") {
      return fail("فقط مدیر کل می‌تواند نقش ADMIN (دسترسی کامل) بدهد", 403);
    }
    // demoting the LAST active admin would lock the panel — never allow it
    if ((target.role === "ADMIN" || target.role === "SUPER_ADMIN") && (await otherActiveAdmins(target.id)) === 0) {
      return fail("آخرین مدیر کل/مدیر فعال را نمی‌توان نقش‌اش را تغییر داد", 400);
    }
    data.role = d.role;
  }

  // ── blocking ──
  if (d.isBlocked !== undefined && d.isBlocked !== target.isBlocked) {
    if (
      d.isBlocked === true &&
      (target.role === "ADMIN" || target.role === "SUPER_ADMIN") &&
      (await otherActiveAdmins(target.id)) === 0
    ) {
      return fail("آخرین مدیر کل/مدیر فعال را نمی‌توان مسدود کرد", 400);
    }
    data.isBlocked = d.isBlocked;
  }

  // ── profile fields ──
  if (d.firstName !== undefined) data.firstName = d.firstName;
  if (d.lastName !== undefined) data.lastName = d.lastName;
  if (d.phone !== undefined) {
    if (d.phone) {
      const dupe = await db.user.findFirst({ where: { phone: d.phone, NOT: { id } } });
      if (dupe) return fail("این شماره موبایل برای حساب دیگری ثبت شده است", 409);
      data.phone = d.phone;
    } else {
      data.phone = null;
    }
  }

  // ── permissions ──
  const finalRole = (data.role as string) ?? target.role;
  if (d.permissions !== undefined) {
    const perms = [...new Set(d.permissions.filter((k) => typeof k === "string" && PERMISSION_KEYS.has(k)))];
    // ADMIN short-circuits every check — store nothing for full admins
    data.adminPermissions = finalRole === "ADMIN" || perms.length === 0 ? null : JSON.stringify(perms);
  } else if (data.role !== undefined && finalRole === "ADMIN") {
    data.adminPermissions = null; // promoted to ADMIN → list is meaningless
  }

  // ── manual password reset (admin hands the new password to the employee) ──
  if (d.newPassword) {
    data.passwordHash = await hashPassword(d.newPassword);
  }

  if (Object.keys(data).length === 0) {
    return fail("چیزی برای به‌روزرسانی ارسال نشده است", 400);
  }

  await db.user.update({ where: { id }, data });

  // password reset + blocking → force re-login everywhere for the target
  if (d.newPassword || data.isBlocked === true) {
    await db.session.deleteMany({ where: { userId: id } });
  }

  await logAdmin(admin.id, "MANAGER_UPDATE", {
    entity: "User",
    entityId: id,
    metadata: { fields: Object.keys(data), role: data.role ?? target.role },
    ip: getClientIp(req),
  });
  return ok({ message: "اطلاعات مدیر به‌روزرسانی شد" });
}

/** DELETE — DEMOTE, not destroy: the account becomes a normal CUSTOMER
 *  (adminPermissions cleared). Orders/tickets the manager handled stay intact. */
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("مدیر پیدا نشد", 404);

  if (target.id === admin.id) {
    return fail("نمی‌توانید حساب خودتان را از مدیریت خارج کنید", 400);
  }
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    return fail("خارج کردن مدیر کل از مدیریت فقط توسط مدیر کل امکان‌پذیر است", 403);
  }
  if ((target.role === "ADMIN" || target.role === "SUPER_ADMIN") && (await otherActiveAdmins(target.id)) === 0) {
    return fail("آخرین مدیر کل/مدیر فعال را نمی‌توان از مدیریت خارج کرد", 400);
  }

  await db.user.update({
    where: { id },
    data: {
      role: "CUSTOMER",
      adminPermissions: null,
    },
  });

  await logAdmin(admin.id, "MANAGER_REMOVE", {
    entity: "User",
    entityId: id,
    metadata: { email: target.email, previousRole: target.role },
    ip: getClientIp(req),
  });
  return ok({
    message: `«${`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || target.email}» از مدیریت خارج شد و به مشتری عادی تبدیل شد`,
  });
}

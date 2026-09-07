import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import {
  getAdminUser,
  SETTINGS_WRITE,
  hashPassword,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  MANAGER_ROLES,
  parseAdminPermissions,
} from "@/lib/auth";
import type { AdminPermissionKey } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { rateLimit } from "@/lib/rate-limit";
import { phoneSchema, passwordSchema } from "@/lib/validators";
import { z } from "zod";

/**
 * v29.2 · MANAGERS (افزودن مدیران) — list + create.
 * The MAIN admin creates staff accounts with a manually-chosen password and
 * granular permissions; the staff member then logs in like an employee and
 * works within the granted sections only.
 */

const PERMISSION_KEYS: ReadonlySet<string> = new Set(ADMIN_PERMISSIONS.map((p) => p.key));

/** validate + dedupe a permissions array (unknown keys dropped, ≤ 20, empty = role defaults) */
function normalizePermissions(raw: string[] | undefined): AdminPermissionKey[] {
  const list = (raw ?? []).filter((k): k is AdminPermissionKey => typeof k === "string" && PERMISSION_KEYS.has(k));
  return [...new Set(list)];
}

const createSchema = z.object({
  firstName: z.string().trim().min(2, "نام حداقل ۲ کاراکتر باشد").max(60),
  lastName: z.string().trim().min(2, "نام خانوادگی حداقل ۲ کاراکتر باشد").max(60),
  email: z.string().trim().email("ایمیل معتبر نیست").max(120),
  phone: phoneSchema.optional(),
  role: z.enum(MANAGER_ROLES),
  password: passwordSchema,
  permissions: z.array(z.string()).max(20, "حداکثر ۲۰ دسترسی").optional(),
});

/** GET — list every panel account (ADMIN_ROLES), viewable by ADMIN/SUPER_ADMIN only.
 *  NEVER returns passwordHash / recoveryCodeHash. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const managers = await db.user.findMany({
    where: { role: { in: ADMIN_ROLES } },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isBlocked: true,
      avatar: true,
      adminPermissions: true,
      createdAt: true,
      // newest session start ≈ last login (User has no lastLoginAt column)
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  return ok({
    managers: managers.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      role: m.role,
      isBlocked: m.isBlocked,
      avatar: m.avatar,
      adminPermissions: parseAdminPermissions(m.adminPermissions),
      createdAt: m.createdAt,
      lastLoginAt: m.sessions[0]?.createdAt ?? null,
    })),
  });
}

/** POST — create a manager (SETTINGS_WRITE; ADMIN role only by SUPER_ADMIN).
 *  The admin sets the password MANUALLY and hands the credentials to the
 *  employee — no email sending, no recovery phrase (that is a super-admin
 *  account feature). */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const ip = getClientIp(req);
  if (!rateLimit(`managers-create:${admin.id}:${ip}`, 10, 60 * 60_000).ok) {
    return fail("تعداد درخواست‌های ساخت مدیر زیاد است — یک ساعت دیگر تلاش کنید", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  // only the SUPER_ADMIN may mint full ADMIN accounts
  if (d.role === "ADMIN" && admin.role !== "SUPER_ADMIN") {
    return fail("فقط مدیر کل می‌تواند مدیر با دسترسی کامل (ADMIN) بسازد", 403);
  }

  const email = d.email.toLowerCase();
  // unique login identifier — also guarantees the email is not already an admin
  const [byEmail, byPhone] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true, role: true } }),
    d.phone ? db.user.findUnique({ where: { phone: d.phone }, select: { id: true } }) : null,
  ]);
  if (byEmail) {
    return fail(byEmail.role === "CUSTOMER"
      ? "این ایمیل برای یک حساب مشتری ثبت شده است — ایمیل دیگری انتخاب کنید"
      : "این ایمیل قبلاً برای یک مدیر ثبت شده است", 409);
  }
  if (byPhone) return fail("این شماره موبایل قبلاً ثبت شده است", 409);

  const permissions = normalizePermissions(d.permissions);

  const manager = await db.user.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email,
      phone: d.phone ?? null,
      role: d.role,
      passwordHash: await hashPassword(d.password),
      // empty list = role default permissions (stored as null)
      adminPermissions: permissions.length ? JSON.stringify(permissions) : null,
    },
  });

  await logAdmin(admin.id, "MANAGER_CREATE", {
    entity: "User",
    entityId: manager.id,
    metadata: { email, role: d.role, permissions },
    ip,
  });

  return ok(
    {
      manager: {
        id: manager.id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        phone: manager.phone,
        role: manager.role,
        isBlocked: manager.isBlocked,
        avatar: manager.avatar,
        adminPermissions: permissions,
        createdAt: manager.createdAt,
      },
      message: "مدیر ایجاد شد — رمز عبور را به وی تحویل دهید",
    },
    201
  );
}

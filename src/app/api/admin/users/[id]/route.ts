import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE, hashPassword, hasPermission } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-log";
import { passwordSchema } from "@/lib/validators";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  isBlocked: z.boolean().optional(),
  role: z.enum(["CUSTOMER", "SUPPORT", "ORDER_MANAGER", "PRODUCT_MANAGER", "ADMIN", "SUPER_ADMIN"]).optional(),
  newPassword: passwordSchema.optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "users")) return fail("دسترسی لازم را ندارید", 403);

  const user = await db.user.findFirst({
    where: { OR: [{ id }, { email: id }, { phone: id }] },
    select: {
      id: true, email: true, phone: true, firstName: true, lastName: true, role: true,
      isBlocked: true, createdAt: true, avatar: true,
      orders: { orderBy: { createdAt: "desc" }, take: 20, select: { orderNumber: true, total: true, status: true, paymentStatus: true, createdAt: true } },
      reviews: { take: 10, select: { rating: true, title: true, status: true, createdAt: true } },
    },
  });
  if (!user) return fail("کاربر پیدا نشد", 404);
  return ok({ user });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "users")) return fail("دسترسی لازم را ندارید", 403);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return fail("کاربر پیدا نشد", 404);
  if (user.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    return fail("تغییرات روی مدیر کل فقط توسط مدیر کل امکان‌پذیر است", 403);
  }
  if (user.id === admin.id && parsed.data.isBlocked === true) {
    return fail("نمی‌توانید حساب خودتان را مسدود کنید", 400);
  }

  // ── Password reset branch ──
  if (parsed.data.newPassword) {
    if (user.id === admin.id) {
      return fail("برای تغییر رمز خودتان از صفحه «حساب من» استفاده کنید (نیاز به رمز فعلی)", 400);
    }
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    // Force re-login everywhere for the target user
    await db.session.deleteMany({ where: { userId: id } });
    await logAdmin(admin.id, "USER_PASSWORD_RESET", { entity: "User", entityId: id, ip: getClientIp(req) });
    return ok({ message: "رمز عبور کاربر بازنشانی شد و همه نشست‌های او خاتمه یافت" });
  }

  await db.user.update({ where: { id }, data: parsed.data });
  if (parsed.data.isBlocked) {
    await db.session.deleteMany({ where: { userId: id } });
  }
  await logAdmin(admin.id, "USER_UPDATE", { entity: "User", entityId: id, metadata: parsed.data, ip: getClientIp(req) });
  return ok({ message: "کاربر به‌روزرسانی شد" });
}

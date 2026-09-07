import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { brandSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "brands")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = brandSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  if (parsed.data.slug) {
    const dupe = await db.brand.findFirst({ where: { slug: parsed.data.slug, NOT: { id } } });
    if (dupe) return fail("این slug قبلاً استفاده شده است", 409);
  }
  await db.brand.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.logo !== undefined ? { logo: parsed.data.logo } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  });
  await logAdmin(admin.id, "BRAND_UPDATE", { entity: "Brand", entityId: id, ip: getClientIp(req) });
  return ok({ message: "برند به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "brands")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const brand = await db.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!brand) return fail("برند پیدا نشد", 404);
  if (brand._count.products > 0) return fail("ابتدا محصولات این برند را منتقل کنید", 409);
  await db.brand.delete({ where: { id } });
  await logAdmin(admin.id, "BRAND_DELETE", { entity: "Brand", entityId: id, ip: getClientIp(req) });
  return ok({ message: "برند حذف شد" });
}

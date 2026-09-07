import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "categories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  if (d.slug) {
    const dupe = await db.category.findFirst({ where: { slug: d.slug, NOT: { id } } });
    if (dupe) return fail("این slug قبلاً استفاده شده است", 409);
  }
  if (d.parentId === id) return fail("دسته‌بندی نمی‌تواند والد خودش باشد", 400);

  await db.category.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.slug ? { slug: d.slug } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.image !== undefined ? { image: d.image } : {}),
      ...(d.parentId !== undefined ? { parentId: d.parentId } : {}),
      ...(d.specTemplate !== undefined ? { specTemplate: d.specTemplate?.length ? JSON.stringify(d.specTemplate) : null } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    },
  });
  await logAdmin(admin.id, "CATEGORY_UPDATE", { entity: "Category", entityId: id, ip: getClientIp(req) });
  return ok({ message: "دسته‌بندی به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "categories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!category) return fail("دسته‌بندی پیدا نشد", 404);
  if (category._count.products > 0) return fail("ابتدا محصولات این دسته را منتقل یا حذف کنید", 409);
  if (category._count.children > 0) return fail("ابتدا زیردسته‌های این دسته را حذف کنید", 409);

  await db.category.delete({ where: { id } });
  await logAdmin(admin.id, "CATEGORY_DELETE", { entity: "Category", entityId: id, metadata: { name: category.name }, ip: getClientIp(req) });
  return ok({ message: "دسته‌بندی حذف شد" });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "categories")) return fail("دسترسی لازم را ندارید", 403);
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } }, parent: { select: { name: true } } },
  });
  return ok({
    categories: categories.map((c) => ({
      ...c,
      productCount: c._count.products,
      parentName: c.parent?.name ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "categories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;
  if (await db.category.findUnique({ where: { slug: d.slug } })) return fail("این slug قبلاً استفاده شده است", 409);

  const category = await db.category.create({
    data: {
      name: d.name, slug: d.slug, description: d.description ?? null, icon: d.icon ?? null,
      image: d.image ?? null, parentId: d.parentId ?? null,
      specTemplate: d.specTemplate?.length ? JSON.stringify(d.specTemplate) : null,
      sortOrder: d.sortOrder, isActive: d.isActive,
    },
  });
  await logAdmin(admin.id, "CATEGORY_CREATE", { entity: "Category", entityId: category.id, metadata: { name: d.name }, ip: getClientIp(req) });
  return ok({ id: category.id, message: "دسته‌بندی ایجاد شد" }, 201);
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { brandSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "brands")) return fail("دسترسی لازم را ندارید", 403);
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return ok({ brands: brands.map((b) => ({ ...b, productCount: b._count.products })) });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "brands")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  if (await db.brand.findUnique({ where: { slug: parsed.data.slug } })) return fail("این slug قبلاً استفاده شده است", 409);

  const brand = await db.brand.create({
    data: {
      name: parsed.data.name, slug: parsed.data.slug,
      logo: parsed.data.logo ?? null, description: parsed.data.description ?? null,
      isActive: parsed.data.isActive,
    },
  });
  await logAdmin(admin.id, "BRAND_CREATE", { entity: "Brand", entityId: brand.id, ip: getClientIp(req) });
  return ok({ id: brand.id, message: "برند ایجاد شد" }, 201);
}

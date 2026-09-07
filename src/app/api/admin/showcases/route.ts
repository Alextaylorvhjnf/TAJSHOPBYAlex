import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { showcaseSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "showcases")) return fail("دسترسی لازم را ندارید", 403);
  const showcases = await db.promotionalShowcase.findMany({
    orderBy: { sortOrder: "asc" },
    include: { product: { select: { id: true, name: true, slug: true, mainImage: true } } },
  });
  return ok({ showcases });
}

function clean(data: ReturnType<typeof showcaseSchema.parse>) {
  return {
    ...data,
    subtitle: data.subtitle || null,
    buttonText: data.buttonText || null,
    buttonUrl: data.buttonUrl || null,
    badge: data.badge || null,
    productId: data.productId || null,
  };
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "showcases")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = showcaseSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const showcase = await db.promotionalShowcase.create({ data: clean(parsed.data) });
  await logAdmin(admin.id, "SHOWCASE_CREATE", { entity: "PromotionalShowcase", entityId: showcase.id, ip: getClientIp(req) });
  return ok({ showcase, message: "شوکیس ایجاد شد" }, 201);
}

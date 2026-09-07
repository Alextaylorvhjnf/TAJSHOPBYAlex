import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { sliderSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "sliders")) return fail("دسترسی لازم را ندارید", 403);
  const sliders = await db.slider.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { product: { select: { id: true, name: true, slug: true } } },
  });
  return ok({ sliders });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "sliders")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = sliderSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const slider = await db.slider.create({
    data: {
      title: d.title, subtitle: d.subtitle ?? null,
      desktopImage: d.desktopImage, mobileImage: d.mobileImage ?? null,
      buttonText: d.buttonText ?? null, buttonUrl: d.buttonUrl ?? null,
      badge: d.badge ?? null, productId: d.productId ?? null,
      sortOrder: d.sortOrder, isActive: d.isActive,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
    },
  });
  await logAdmin(admin.id, "SLIDER_CREATE", { entity: "Slider", entityId: slider.id, ip: getClientIp(req) });
  return ok({ id: slider.id, message: "اسلایدر ایجاد شد" }, 201);
}

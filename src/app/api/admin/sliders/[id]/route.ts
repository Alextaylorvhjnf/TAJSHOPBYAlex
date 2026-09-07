import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { sliderSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "sliders")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = sliderSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  await db.slider.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.subtitle !== undefined ? { subtitle: d.subtitle } : {}),
      ...(d.desktopImage ? { desktopImage: d.desktopImage } : {}),
      ...(d.mobileImage !== undefined ? { mobileImage: d.mobileImage } : {}),
      ...(d.buttonText !== undefined ? { buttonText: d.buttonText } : {}),
      ...(d.buttonUrl !== undefined ? { buttonUrl: d.buttonUrl } : {}),
      ...(d.badge !== undefined ? { badge: d.badge } : {}),
      ...(d.productId !== undefined ? { productId: d.productId } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      ...(d.startsAt !== undefined ? { startsAt: d.startsAt ? new Date(d.startsAt) : null } : {}),
      ...(d.endsAt !== undefined ? { endsAt: d.endsAt ? new Date(d.endsAt) : null } : {}),
    },
  });
  await logAdmin(admin.id, "SLIDER_UPDATE", { entity: "Slider", entityId: id, ip: getClientIp(req) });
  return ok({ message: "اسلایدر به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "sliders")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  await db.slider.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "SLIDER_DELETE", { entity: "Slider", entityId: id, ip: getClientIp(req) });
  return ok({ message: "اسلایدر حذف شد" });
}

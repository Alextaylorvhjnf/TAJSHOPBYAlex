import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { refreshProductRating } from "@/lib/product";
import { logAdmin } from "@/lib/admin-log";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({ action: z.enum(["APPROVE", "REJECT"]) });

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "reviews")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("عملیات نامعتبر است", 400);

  const review = await db.review.findUnique({ where: { id } });
  if (!review) return fail("دیدگاه پیدا نشد", 404);

  const newStatus = parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED";
  await db.review.update({ where: { id }, data: { status: newStatus } });
  await refreshProductRating(review.productId);
  await logAdmin(admin.id, `REVIEW_${parsed.data.action}`, { entity: "Review", entityId: id, ip: getClientIp(req) });
  return ok({ message: parsed.data.action === "APPROVE" ? "دیدگاه تأیید شد" : "دیدگاه رد شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "reviews")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const review = await db.review.findUnique({ where: { id } });
  if (!review) return fail("دیدگاه پیدا نشد", 404);
  await db.review.delete({ where: { id } });
  await refreshProductRating(review.productId);
  await logAdmin(admin.id, "REVIEW_DELETE", { entity: "Review", entityId: id, ip: getClientIp(req) });
  return ok({ message: "دیدگاه حذف شد" });
}

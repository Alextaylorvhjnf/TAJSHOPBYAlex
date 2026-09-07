import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const addressSchema = z.object({
  title: z.string().max(60).optional(),
  receiverName: z.string().max(100).optional().nullable(),
  phone: z.string().max(15).optional().nullable(),
  province: z.string().min(2).max(50).optional(),
  city: z.string().min(2).max(50).optional(),
  address: z.string().min(10).max(400).optional(),
  postalCode: z.string().max(10).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const existing = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return fail("آدرس پیدا نشد", 404);

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  if (parsed.data.isDefault) {
    await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }
  await db.address.update({ where: { id }, data: parsed.data });
  return ok({ message: "آدرس به‌روزرسانی شد" });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const existing = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return fail("آدرس پیدا نشد", 404);
  await db.address.delete({ where: { id } });
  return ok({ message: "آدرس حذف شد" });
}

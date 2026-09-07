import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const addressSchema = z.object({
  title: z.string().max(60).default("آدرس من"),
  receiverName: z.string().max(100).optional().nullable(),
  phone: z.string().max(15).optional().nullable(),
  province: z.string().min(2).max(50),
  city: z.string().min(2).max(50),
  address: z.string().min(10).max(400),
  postalCode: z.string().max(10).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return ok({ addresses });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  if (parsed.data.isDefault) {
    await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }
  const address = await db.address.create({ data: { ...parsed.data, userId: user.id } });
  return ok({ id: address.id, message: "آدرس ذخیره شد" }, 201);
}

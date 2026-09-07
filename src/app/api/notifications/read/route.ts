import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return ok({ notifications }, 200, { noStore: true });
}

const schema = z.object({ id: z.string().optional() });

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید", 401);
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (parsed.success && parsed.data.id) {
    await db.notification.updateMany({ where: { id: parsed.data.id, userId: user.id }, data: { isRead: true } });
  } else {
    await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  }
  return ok({ message: "اعلان‌ها خوانده شد" });
}

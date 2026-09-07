import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { storyUpdateSchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

type Params = { params: Promise<{ id: string }> };

function clean(data: ReturnType<typeof storyUpdateSchema.parse>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k === "expiresAt") out[k] = v ? new Date(v as string) : null;
    else if (k === "linkUrl" || k === "badge" || k === "productId" || k === "categoryId" || k === "videoUrl") out[k] = v === "" ? null : v;
    else out[k] = v;
  }
  return out;
}

export async function PUT(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "stories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = storyUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const story = await db.story.update({ where: { id }, data: clean(parsed.data) }).catch(() => null);
  if (!story) return fail("استوری یافت نشد", 404);
  await logAdmin(admin.id, "STORY_UPDATE", { entity: "Story", entityId: id, ip: getClientIp(req) });
  return ok({ story, message: "استوری به‌روزرسانی شد" });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "stories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);
  const { id } = await params;

  await db.story.delete({ where: { id } }).catch(() => null);
  await logAdmin(admin.id, "STORY_DELETE", { entity: "Story", entityId: id, ip: getClientIp(req) });
  return ok({ message: "استوری حذف شد" });
}

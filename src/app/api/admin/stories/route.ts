import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, PRODUCT_WRITE, hasPermission } from "@/lib/auth";
import { storySchema } from "@/lib/validators";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "stories")) return fail("دسترسی لازم را ندارید", 403);
  const stories = await db.story.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      product: { select: { id: true, name: true, slug: true, mainImage: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  return ok({ stories });
}

function clean(data: ReturnType<typeof storySchema.parse>) {
  return {
    ...data,
    videoUrl: data.videoUrl || null,
    linkUrl: data.linkUrl || null,
    badge: data.badge || null,
    productId: data.productId || null,
    categoryId: data.categoryId || null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  };
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "stories")) return fail("دسترسی لازم را ندارید", 403);
  if (!PRODUCT_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = storySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const story = await db.story.create({ data: clean(parsed.data) });
  await logAdmin(admin.id, "STORY_CREATE", { entity: "Story", entityId: story.id, ip: getClientIp(req) });
  return ok({ story, message: "استوری ایجاد شد" }, 201);
}

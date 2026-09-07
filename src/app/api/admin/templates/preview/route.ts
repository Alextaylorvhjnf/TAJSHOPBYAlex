import { ok, fail } from "@/lib/api";
import { getAdminUser, hasPermission } from "@/lib/auth";
import { getHomeData } from "@/lib/templates/home-data";

/**
 * GET /api/admin/templates/preview — real store data (HomeData) for the
 * in-admin template previews. Admin-gated + never cached by the browser
 * (session-scoped response).
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!hasPermission(admin, "appearance")) return fail("دسترسی لازم را ندارید", 403);
  const data = await getHomeData();
  return ok({ data }, 200, { noStore: true });
}

import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { listProviderModels } from "@/lib/ai";

/**
 * v27b — "list the models this account actually has" for the admin AI
 * settings model pickers.
 *
 * The stored keys are read SERVER-SIDE ONLY (listProviderModels pulls them
 * from the DB) — no key value is ever returned to the browser. Admin-only.
 * null = the listing itself failed (invalid key / no egress / region block)
 * so the UI falls back to the free-text model input.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  try {
    const { gapgpt } = await listProviderModels();
    return ok({
      gapgpt,
    });
  } catch (e) {
    return fail(`دریافت فهرست مدل‌ها ناموفق بود: ${String(e instanceof Error ? e.message : e).slice(0, 160)}`, 502);
  }
}

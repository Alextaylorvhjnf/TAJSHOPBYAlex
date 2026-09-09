import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { testAIConnection } from "@/lib/ai";
import { logAdmin } from "@/lib/admin-log";

/**
 * AI connection test (spec §39) — meaningful diagnostics, never a bare
 * "check your API key". Admin-only. Uses the SAVED settings (so the
 * admin tests exactly what production will use).
 * v20: every test outcome (success AND failure, with the full analyzed
 * message) is written to the admin activity log.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const result = await testAIConnection();
  await logAdmin(admin.id, result.success ? "AI_TEST_OK" : "AI_TEST_FAIL", {
    entity: "ai",
    ip: getClientIp(req),
    metadata: { success: result.success, message: result.message },
  });
  return ok({ success: result.success, message: result.message });
}

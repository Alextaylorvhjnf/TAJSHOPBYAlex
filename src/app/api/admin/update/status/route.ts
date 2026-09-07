import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { readUpdateState, restartMarkerExists, consumeRestartMarker } from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/update/status — any admin role.
 * Returns the persisted state file (or idle). The db/update-pending-restart.json
 * marker (written right before the process exits) is consumed here: the FIRST
 * successful poll after the app restarted shows «در حال راه‌اندازی مجدد…»
 * so the panel keeps waiting instead of showing a stale "done".
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const state = readUpdateState();
  if (restartMarkerExists() && (state.phase === "done" || state.phase === "idle")) {
    await consumeRestartMarker();
    return ok(
      {
        state: {
          ...state,
          phase: "restarting" as const,
          percent: 100,
          message: "در حال راه‌اندازی مجدد — چند لحظه صبر کنید و صفحه را رفرش کنید",
        },
        pendingRestart: true,
      },
      200,
      { noStore: true }
    );
  }
  return ok({ state }, 200, { noStore: true });
}

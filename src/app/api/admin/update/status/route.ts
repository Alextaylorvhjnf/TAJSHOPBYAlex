import { ok, fail } from "@/lib/api";
import { getAdminUser } from "@/lib/auth";
import { readUpdateState, writeIdleState, restartMarkerExists, consumeRestartMarker } from "@/lib/updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/update/status — any admin role.
 * Returns the persisted state file (or idle). The db/update-pending-restart.json
 * marker (written right before the process exits) is consumed here: the FIRST
 * successful poll after the app restarted shows «در حال راه‌اندازی مجدد…»
 * so the panel keeps waiting instead of showing a stale "done".
 *
 * v35 · STALE "done"/"error" auto-reset: a terminal phase whose finishedAt is
 * older than 10 minutes can only be a leftover from a previous session — the
 * running version comparison also proves the update landed. In that case the
 * state file is reset to idle so a fresh page load shows the normal check UI
 * (the live panel that RAN the update already showed the success card).
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  let state = readUpdateState();
  if (state.phase === "done" || state.phase === "error") {
    const ageMs = state.finishedAt ? Date.now() - new Date(state.finishedAt).getTime() : Number.POSITIVE_INFINITY;
    if (ageMs > 10 * 60_000) state = writeIdleState();
  }

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

/**
 * v35 · POST /api/admin/update/status — ACKNOWLEDGE a terminal state.
 * The update panel calls this once on MOUNT when it finds a leftover
 * done/error phase (a previous session already showed that banner) — the
 * state is reset to idle and the caller immediately refetches, so after a
 * page refresh the «بررسی به‌روزرسانی» flow is available again instead of
 * being stuck on «به‌روزرسانی کامل شد» forever.
 */
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);

  const state = readUpdateState();
  if (state.phase !== "done" && state.phase !== "error") {
    return ok({ state }, 200, { noStore: true });
  }
  const cleared = writeIdleState();
  return ok({ state: cleared, acknowledged: true }, 200, { noStore: true });
}

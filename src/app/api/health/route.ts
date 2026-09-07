import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Lightweight liveness/readiness endpoint for Docker healthchecks & monitoring.
 *
 * - Returns HTTP 200 as long as the Next.js server process is responding.
 * - `database` reports SQLite connectivity ("ok" | "unavailable") — informational:
 *   during a fresh install the wizard (not the healthcheck) owns DB setup, so a
 *   DB hiccup must NOT take the whole container to "unhealthy" and hide the
 *   installer from the user.
 * - Never exposes secrets, env vars, stack traces or credentials.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "unavailable" = "unavailable";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    /* app is alive; DB state is reported in the body only */
  }

  return NextResponse.json(
    { status: "ok", database },
    { headers: { "Cache-Control": "no-store" } }
  );
}

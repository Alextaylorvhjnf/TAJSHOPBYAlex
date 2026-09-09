import { Prisma } from "@prisma/client";
import { db, ensureRuntimeSchema } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/auth";

/**
 * Installation state (installer lock).
 *
 * Source of truth: InstallationState DB row (id="main", installed=true).
 *
 * Detection order:
 *  1. InstallationState row → its `installed` flag (canonical).
 *  2. Table missing (P2021/P2022) → legacy detection: any existing admin user
 *     means the app was installed before the installer existed → grandfather it
 *     as installed (best-effort persist the flag row).
 *  3. User table also missing → fresh database → not installed.
 *  4. Any OTHER error (locked file, IO, transient) → fail-open as installed so
 *     a running production store is NEVER accidentally redirected to /install.
 */

export const INSTALLER_VERSION = "1.0.0";

export type InstallSource = "flag" | "legacy" | "fresh" | "unknown";

export interface InstallStatus {
  installed: boolean;
  /** true → the /install wizard should run */
  needsSetup: boolean;
  source: InstallSource;
  version?: string | null;
  installedAt?: Date | null;
}

let cache: { at: number; status: InstallStatus } | null = null;
const CACHE_TTL = 5_000;

export function invalidateInstallCache() {
  cache = null;
}

function prismaCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return undefined;
}

/** v33/v34.1: DB cannot even be initialized (env var missing, file unopenable,
 * engine failure). Not transient — the store is down either way, so the
 * wizard is the only surface that can repair it. */
function isDbInitError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  const msg = String((e as Error)?.message ?? e);
  return /Environment variable not found|unable to open database file|Engine.*not (?:found|started)/i.test(msg);
}

async function compute(): Promise<InstallStatus> {
  // v29.1: heal missing v29 columns first (upgraded volumes) — never let a
  // schema drift turn into a fail-open "installed" verdict that hides the
  // wizard behind a 307 redirect.
  await ensureRuntimeSchema();
  // 1) canonical flag row
  try {
    const row = await db.installationState.findUnique({ where: { id: "main" } });
    if (row) {
      return {
        installed: row.installed,
        needsSetup: !row.installed,
        source: "flag",
        version: row.version,
        installedAt: row.installedAt,
      };
    }
    // row missing (but table exists) → fall through to legacy detection
  } catch (e) {
    if (isDbInitError(e)) {
      // v33/v34.1: database unreachable at the client level (no DATABASE_URL /
      // bad path) → the store cannot run; route to the wizard for self-repair
      // (its first step rewrites .env with a canonical DATABASE_URL).
      return { installed: false, needsSetup: true, source: "fresh" };
    }
    const code = prismaCode(e);
    if (code !== "P2021" && code !== "P2022") {
      // unknown/transient error → fail-open: never break the live store
      return { installed: true, needsSetup: false, source: "unknown" };
    }
    // installer table not created yet → continue to legacy detection
  }

  // 2) legacy: deployment that predates the installer (has admin users)
  try {
    const admins = await db.user.count({ where: { role: { in: ADMIN_ROLES } } });
    if (admins > 0) {
      // grandfather as installed + persist flag (best-effort; table may be absent)
      try {
        await db.installationState.upsert({
          where: { id: "main" },
          create: { id: "main", installed: true, version: INSTALLER_VERSION },
          update: {},
        });
      } catch {
        /* pre-db-push environment — flag row can be written later */
      }
      return { installed: true, needsSetup: false, source: "legacy" };
    }
    return { installed: false, needsSetup: true, source: "fresh" };
  } catch (e) {
    if (isDbInitError(e)) {
      return { installed: false, needsSetup: true, source: "fresh" };
    }
    const code = prismaCode(e);
    if (code === "P2021" || code === "P2022") {
      // users table absent → truly fresh database
      return { installed: false, needsSetup: true, source: "fresh" };
    }
    return { installed: true, needsSetup: false, source: "unknown" };
  }
}

export async function getInstallStatus(force = false): Promise<InstallStatus> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.status;
  const status = await compute();
  cache = { at: Date.now(), status };
  return status;
}

/** Persist the installation lock. Called ONLY by /api/install/complete. */
export async function markInstalled(adminUserId?: string): Promise<void> {
  await db.installationState.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      installed: true,
      installedAt: new Date(),
      adminUserId: adminUserId ?? null,
      version: INSTALLER_VERSION,
    },
    update: {
      installed: true,
      installedAt: new Date(),
      ...(adminUserId ? { adminUserId } : {}),
      version: INSTALLER_VERSION,
    },
  });
  invalidateInstallCache();
}

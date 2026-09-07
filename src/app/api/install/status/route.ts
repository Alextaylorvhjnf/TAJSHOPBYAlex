import { ok } from "@/lib/api";
import { getInstallStatus } from "@/lib/installer/state";
import { getDbInfo } from "@/lib/installer/requirements";

/** Public: current installation status (drives first-run redirect + wizard). */
export async function GET() {
  const status = await getInstallStatus();
  const db = await getDbInfo();
  return ok({
    installed: status.installed,
    needsSetup: status.needsSetup,
    source: status.source,
    version: status.version ?? null,
    installedAt: status.installedAt ?? null,
    db,
  });
}

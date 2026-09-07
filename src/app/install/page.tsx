import { redirect } from "next/navigation";
import { getInstallStatus } from "@/lib/installer/state";
import { InstallWizard } from "@/components/installer/wizard";

export const dynamic = "force-dynamic";

/**
 * /install — first-run installation wizard.
 * Once installation is complete this route permanently redirects to / (§14)
 * and all installer APIs refuse to run.
 */
export default async function InstallPage() {
  /* v29.1: force=true — the page must never act on a ≤5s-old cached verdict.
   * Right after an admin re-opens the wizard from the panel (reinstall API),
   * the browser lands here immediately; a stale cached "installed=true" would
   * bounce them to / instead of showing the wizard. */
  const status = await getInstallStatus(true);
  if (!status.needsSetup) redirect("/");

  return <InstallWizard />;
}

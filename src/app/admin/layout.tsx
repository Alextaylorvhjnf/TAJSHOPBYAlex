import { redirect } from "next/navigation";
import { getInstallStatus } from "@/lib/installer/state";
import { AdminThemeSync } from "@/components/admin/admin-theme";
// admin-v20.css is imported by the (panel) layout for the FINNOVA look;
// it is ALSO imported here so the redesigned /admin/login page (outside
// the (panel) group) gets its keyframes + theme vars. Same module →
// bundled once.
import "./(panel)/admin-v20.css";
// v32 (Task 13-b): the redesigned panel skin (4 accent themes + shell
// restyles) — also loaded on /admin/login so the whole /admin tree and
// the no-flash boot script below share one cascade.
import "./(panel)/admin-v32.css";

// dynamic rendering: the install gate must be evaluated per request, never baked at build
export const dynamic = "force-dynamic";

/**
 * v17/v20 — runs BEFORE first paint (plain synchronous script, no module):
 * applies the admin's saved panel theme (v20 default «فینوا» — the
 * FINNOVA reference look) so there is zero gold→theme flash on load.
 * AdminThemeSync then keeps the attribute in sync and removes it when
 * the user leaves /admin routes, guaranteeing the storefront never
 * inherits admin theme tokens.
 */
const ADMIN_THEME_BOOT = `(function(){try{var t=localStorage.getItem("taj-admin-theme");if(t==="excel-dark"){t="saas-dark";}else if(t!=="finnova"&&t!=="saas-dark"){t="finnova";}document.documentElement.setAttribute("data-admin-theme",t);var a=localStorage.getItem("taj-admin-accent");if(a!=="purple"&&a!=="pink"&&a!=="charcoal"&&a!=="red"){a="purple";}document.documentElement.setAttribute("data-admin-accent",a);}catch(e){document.documentElement.setAttribute("data-admin-theme","finnova");document.documentElement.setAttribute("data-admin-accent","purple");}})();`;

/**
 * Pass-through guard for ALL /admin routes (login + panel).
 * When the app is not installed yet, admins are sent to the installer wizard.
 * Once installed this layout renders children unchanged (zero visual impact).
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const install = await getInstallStatus();
  if (install.needsSetup) redirect("/install");
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOT }} />
      <AdminThemeSync />
      {children}
    </>
  );
}

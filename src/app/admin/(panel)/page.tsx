import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { DashboardV32 } from "./dashboard-v32";

// The dashboard greets the logged-in admin by name + the live store name,
// so it must render per request (session + settings), never at build.
export const dynamic = "force-dynamic";

/**
 * v32 (Task 13-b) — admin dashboard, fully redesigned after the
 * Peoplexio HR + Finnova invoice references:
 * • welcome gradient banner (server-resolved store name, dismissable
 *   until the next app version via localStorage)
 * • 4 KPI stat cards with trend arrows vs the previous period + real
 *   recharts sparklines
 * • area «فروش N روز اخیر» + donut «سهم وضعیت سفارش‌ها» + bar
 *   «سفارش‌های هفتگی» charts
 * • Finnova-style split panel: dark «سفارش‌های اخیر» list (right) +
 *   glass/gradient detail card of the selected order (left)
 * • «محصولات پرفروش» + operational cards — all REAL data.
 * The heavy lifting is client-side (dashboard-v32.tsx, TanStack Query
 * against /api/admin/stats); this server wrapper only resolves the
 * store name + the admin's first name.
 */
export default async function AdminDashboardPage() {
  const [settings, user] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: "main" }, select: { storeName: true } }),
    getAuthUser(),
  ]);
  const storeName = settings?.storeName?.trim() || "تاج الکترونیکس";
  const firstName = user?.firstName?.trim() || null;
  return <DashboardV32 storeName={storeName} firstName={firstName} />;
}

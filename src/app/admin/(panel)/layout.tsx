import { redirect } from "next/navigation";
import { getAuthUser, isAdminUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import type { Metadata } from "next";
// v23 ZYWRA admin design system (scoped to the admin shell wrapper;
// theme vars live in the same file — light “finnova” + dark “saas-dark”)
import "./admin-v20.css";

export const metadata: Metadata = {
  title: "پنل مدیریت",
};

/** v29.2: safely parse User.adminPermissions (JSON array of permission keys)
 *  for the client shell. Bad/missing data → null (role default access). */
function parsePermissions(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter((k): k is string => typeof k === "string");
  } catch {
    return null;
  }
}

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || !isAdminUser(user)) {
    redirect("/admin/login");
  }
  return (
    <AdminShell
      user={{
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar, // v29: profile avatar in the sidebar
        // v29.2: granular permissions → the sidebar gates staff managers
        permissions: parsePermissions(user.adminPermissions),
      }}
    >
      {children}
    </AdminShell>
  );
}

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { AccountSidebar } from "@/components/store/account-sidebar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login?redirect=/account");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 min-w-0 lg:grid-cols-[250px_1fr] gap-6">
        <AccountSidebar user={{ firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar }} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

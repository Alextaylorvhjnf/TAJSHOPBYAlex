"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Package, Heart, MapPin, Bell, LogOut, Crown, TicketCheck } from "lucide-react";
import { toast } from "sonner";

const ITEMS = [
  { href: "/account", label: "اطلاعات حساب", icon: User, exact: true },
  { href: "/account/orders", label: "سفارش‌های من", icon: Package },
  { href: "/account/tickets", label: "تیکت‌های من", icon: TicketCheck },
  { href: "/account/wishlist", label: "علاقه‌مندی‌ها", icon: Heart },
  { href: "/account/addresses", label: "آدرس‌های من", icon: MapPin },
  { href: "/account/notifications", label: "اعلان‌ها", icon: Bell },
];

export function AccountSidebar({ user }: { user: { firstName: string | null; lastName: string | null; role: string; avatar?: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("خارج شدید");
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="lg:sticky lg:top-32 h-fit">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="hero-mesh p-5 text-center">
          {user.avatar ? (
            /* v27.1: the customer's picked avatar face */
            <span className="mx-auto mb-2 block h-14 w-14 overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg">
              { }
              <img src={user.avatar} alt="آواتار" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl gold-surface text-primary-foreground text-lg font-black mb-2">
              {`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim() || "ت"}
            </span>
          )}
          <p className="text-sm font-bold text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-[11px] text-white/60 mt-1 flex items-center justify-center gap-1">
            <Crown className="h-3 w-3 text-amber-300" /> مشتری تاج الکترونیکس
          </p>
        </div>
        <nav className="p-2.5 space-y-1">
          {ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "bg-primary/12 text-primary font-bold" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            خروج از حساب
          </button>
        </nav>
      </div>
    </aside>
  );
}

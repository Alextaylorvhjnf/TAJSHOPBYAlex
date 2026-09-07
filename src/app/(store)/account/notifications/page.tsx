"use client";

import { useNotifications } from "@/hooks/use-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Bell, Package, CreditCard, Info, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  ORDER: { icon: Package, color: "text-primary bg-primary/12" },
  PAYMENT: { icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/12" },
  SYSTEM: { icon: Info, color: "text-muted-foreground bg-muted" },
  INFO: { icon: Bell, color: "text-muted-foreground bg-muted" },
};

export default function NotificationsPage() {
  const { notifications, markRead, isLoading } = useNotifications();

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const items = notifications ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2.5">
          <Bell className="h-6 w-6 text-primary" /> اعلان‌ها
        </h1>
        {hasUnread && (
          <Button onClick={() => markRead.mutate(undefined)} variant="outline" size="sm" className="rounded-lg">
            <CheckCheck className="h-4 w-4 me-1.5" /> خواندن همه
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-14 text-center">
          <Bell className="mx-auto h-14 w-14 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-bold">اعلانی ندارید</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const t = TYPE_ICON[n.type] ?? TYPE_ICON.INFO;
            return (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn(
                  "block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40",
                  !n.isRead && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("grid place-items-center h-10 w-10 rounded-xl shrink-0", t.color)}>
                    <t.icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-[13px]", !n.isRead && "font-black")}>{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-6">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

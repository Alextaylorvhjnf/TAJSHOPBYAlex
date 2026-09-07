"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPrice, formatDate, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Package, Loader2, ChevronLeft, CreditCard, Wallet, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetch("/api/orders/mine").then((r) => r.json()),
  });

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-black">سفارش‌های من</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-14 text-center">
          <PackageX className="mx-auto h-14 w-14 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-bold">هنوز سفارشی ثبت نکرده‌اید</p>
          <Button asChild className="mt-5 gold-surface text-primary-foreground rounded-xl">
            <Link href="/products">شروع خرید</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: { id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string; total: number; itemCount: number; createdAt: string; items: { name: string; image: string | null }[] }) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.orderNumber}`}
              className="block rounded-2xl border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/12 text-primary">
                    <Package className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold" dir="ltr">{o.orderNumber}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(o.createdAt)} — {o.itemCount.toLocaleString("fa-IR")} کالا
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-bold rounded-full px-2.5 py-1 bg-muted text-muted-foreground">
                    {o.paymentMethod === "ZARINPAL" ? (
                      <><Wallet className="h-3 w-3 inline me-1" />زرین‌پال</>
                    ) : (
                      <><CreditCard className="h-3 w-3 inline me-1" />کارت به کارت</>
                    )}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold rounded-full px-2.5 py-1",
                    o.paymentStatus === "PAID" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : o.paymentStatus === "REJECTED" ? "bg-destructive/12 text-destructive"
                      : "bg-primary/12 text-primary"
                  )}>
                    {PAYMENT_STATUS_FA[o.paymentStatus] ?? o.paymentStatus}
                  </span>
                  <span className="text-sm font-black text-primary tabular-nums">
                    {formatPrice(o.total)} <span className="text-[10px] font-normal text-muted-foreground">تومان</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                وضعیت: <span className="font-bold text-foreground">{ORDER_STATUS_FA[o.status] ?? o.status}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

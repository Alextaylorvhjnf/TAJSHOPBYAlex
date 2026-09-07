"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { formatPrice, formatDateTime, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, ChevronLeft, Truck, RefreshCcw, Receipt, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReceiptForm } from "@/components/store/receipt-form";

export default function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetch(`/api/orders/${id}`).then((r) => r.json()),
  });

  const retry = async () => {
    const res = await fetch(`/api/orders/${id}`, { method: "POST" });
    const json = await res.json();
    if (json.ok && json.paymentUrl) window.location.href = json.paymentUrl;
    else toast.error(json.message ?? "خطا");
  };

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const order = data?.order;
  if (!order) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="text-sm font-bold">سفارش پیدا نشد</p>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const canReceipt = order.paymentMethod === "CARD_TO_CARD" && !isPaid && order.c2c?.status !== "PENDING";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/account/orders" className="hover:text-primary flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> سفارش‌های من
        </Link>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-black" dir="ltr">{order.orderNumber}</h1>
            <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[11px] font-bold rounded-full px-3 py-1.5",
              isPaid ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-primary/12 text-primary")}>
              {PAYMENT_STATUS_FA[order.paymentStatus] ?? order.paymentStatus}
            </span>
            <span className="text-[11px] font-bold rounded-full px-3 py-1.5 bg-muted text-muted-foreground">
              {ORDER_STATUS_FA[order.status] ?? order.status}
            </span>
          </div>
        </div>

        {order.trackingCode && (
          <p className="mt-4 text-xs bg-primary/8 rounded-xl p-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            کد رهگیری پست: <span className="font-black text-primary" dir="ltr">{order.trackingCode}</span>
          </p>
        )}
      </div>

      {/* C2C rejection reason */}
      {order.c2c?.status === "REJECTED" && order.c2c.rejectionReason && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">رسید پرداخت رد شد</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-6">دلیل رد: {order.c2c.rejectionReason}</p>
        </div>
      )}

      {/* payment info */}
      {order.payment && order.payment.refId && (
        <div className="rounded-2xl border bg-card p-4 text-xs">
          <p className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            شماره پیگیری بانکی: <span className="font-bold tabular-nums" dir="ltr">{order.payment.refId}</span>
            {order.payment.cardPan && <> — کارت پرداخت‌کننده: <span dir="ltr">{order.payment.cardPan}</span></>}
          </p>
        </div>
      )}

      {/* items */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-extrabold mb-4">اقلام سفارش</h2>
        <div className="space-y-3">
          {order.items.map((i: { name: string; quantity: number; image: string | null; total: number; color: string | null }, idx: number) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="relative h-14 w-14 rounded-xl bg-muted/50 overflow-hidden shrink-0">
                {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain p-1.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{i.name}</p>
                {i.color && <p className="text-[11px] text-muted-foreground">انتخاب: {i.color}</p>}
                <p className="text-[11px] text-muted-foreground">تعداد: {i.quantity.toLocaleString("fa-IR")}</p>
              </div>
              <span className="text-[13px] font-bold tabular-nums shrink-0">{formatPrice(i.total)}</span>
            </div>
          ))}
        </div>

        <div className="border-t mt-4 pt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><span className="text-muted-foreground">جمع کالاها</span><span className="tabular-nums">{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف {order.couponCode ? `(${order.couponCode})` : ""}</span><span className="tabular-nums">{formatPrice(order.discount)}</span></div>}
          {order.deliveryMethodName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">روش ارسال</span>
              <span className="font-medium">{order.deliveryMethodName}{order.deliveryEta ? ` — ${order.deliveryEta}` : ""}</span>
            </div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">ارسال</span><span className="tabular-nums">{order.shippingCost === 0 ? "رایگان" : formatPrice(order.shippingCost)}</span></div>
          <div className="flex justify-between font-black text-primary text-base pt-1"><span>مبلغ کل</span><span className="tabular-nums">{formatPrice(order.total)} تومان</span></div>
        </div>
      </div>

      {/* address */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-extrabold mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> آدرس تحویل
        </h2>
        <p className="text-[13px] leading-7 text-muted-foreground">
          {order.firstName} {order.lastName} — {order.phone}
          <br />
          {order.province}، {order.city}، {order.address}
          {order.postalCode && <> — کد پستی: <span dir="ltr">{order.postalCode}</span></>}
        </p>
      </div>

      {canReceipt && (
        <ReceiptForm orderNumber={order.orderNumber} total={order.total} />
      )}

      {order.paymentMethod === "ZARINPAL" && !isPaid && (
        <Button onClick={retry} className="w-full h-12 rounded-xl gold-surface text-primary-foreground font-bold">
          <RefreshCcw className="h-4 w-4 me-2" /> پرداخت مجدد
        </Button>
      )}
    </div>
  );
}

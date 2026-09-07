"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatDateTime, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PackageSearch, Loader2, ChevronLeft, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ReceiptForm } from "@/components/store/receipt-form";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  statusFa: string;
  paymentStatus: string;
  paymentStatusFa: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  trackingCode: string | null;
  deliveryMethodName: string | null;
  deliveryEta: string | null;
  createdAt: string;
  updatedAt: string;
  c2c: { status: string; rejectionReason: string | null; reviewedAt: string | null } | null;
  refId: string | null;
  items: { name: string; quantity: number; image: string | null; total: number; color: string | null }[];
  address: string;
};

const TIMELINE = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptKey, setReceiptKey] = useState(0);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim().toUpperCase())}&phone=${encodeURIComponent(phone.trim())}`
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "سفارش پیدا نشد");
      setOrder(json.order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? TIMELINE.indexOf(order.status) : -1;
  const isCancelled = order && ["CANCELLED", "REFUNDED"].includes(order.status);
  const canSubmitReceipt =
    order && order.paymentMethod === "CARD_TO_CARD" && order.paymentStatus !== "PAID" && order.c2c?.status !== "PENDING";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center mb-8">
        <span className="mx-auto mb-4 grid place-items-center h-14 w-14 rounded-2xl bg-primary/12 text-primary">
          <PackageSearch className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-black">پیگیری سفارش</h1>
        <p className="text-sm text-muted-foreground mt-2">
          شماره سفارش و شماره موبایل ثبت‌شده در سفارش را وارد کنید
        </p>
      </div>

      <form onSubmit={track} className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5">شماره سفارش *</Label>
            <Input required dir="ltr" placeholder="TAJ-XXXXXX-XXXX" value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)} className="h-11 rounded-xl text-left" />
          </div>
          <div>
            <Label className="text-xs mb-1.5">شماره موبایل ثبت‌شده *</Label>
            <Input required dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" placeholder="09123456789"
              value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl text-left" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "پیگیری سفارش"}
        </Button>
        {error && (
          <p className="text-xs text-destructive text-center bg-destructive/10 rounded-lg py-2.5">{error}</p>
        )}
      </form>

      {order && (
        <div className="mt-6 space-y-5">
          {/* status card */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">وضعیت سفارش</p>
                <p className="text-base font-black">{order.statusFa}</p>
              </div>
              <span className={cn(
                "text-xs font-bold rounded-full px-3 py-1.5",
                order.paymentStatus === "PAID" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                  : order.paymentStatus === "REJECTED" ? "bg-destructive/12 text-destructive"
                  : "bg-primary/12 text-primary"
              )}>
                {PAYMENT_STATUS_FA[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>

            {/* timeline */}
            {!isCancelled ? (
              <div className="flex items-center">
                {TIMELINE.map((s, i) => (
                  <div key={s} className="flex-1 flex items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={cn(
                        "grid place-items-center h-8 w-8 rounded-full border-2 transition-colors",
                        i <= currentStep ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"
                      )}>
                        {i <= currentStep ? <CheckCircle2 className="h-4 w-4" /> : i === 0 ? <Clock className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                      </span>
                      <span className={cn("text-[9px] text-center leading-3 max-w-16", i <= currentStep && "font-bold")}>
                        {ORDER_STATUS_FA[s]}
                      </span>
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div className={cn("flex-1 h-0.5 mx-1 mb-4 rounded", i < currentStep ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs font-bold">
                <XCircle className="h-4 w-4" /> این سفارش {order.statusFa} است.
              </p>
            )}

            {order.deliveryMethodName && (
              <p className="mt-4 text-xs bg-muted/60 rounded-xl p-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span>
                  روش ارسال: <span className="font-bold">{order.deliveryMethodName}</span>
                  {order.deliveryEta && <span className="text-muted-foreground"> — {order.deliveryEta}</span>}
                </span>
              </p>
            )}
            {order.trackingCode && (
              <p className="mt-4 text-xs bg-primary/8 rounded-xl p-3">
                کد رهگیری پست: <span className="font-black text-primary" dir="ltr">{order.trackingCode}</span>
              </p>
            )}
            {order.refId && (
              <p className="mt-2 text-xs text-muted-foreground">
                شماره پیگیری پرداخت: <span dir="ltr">{order.refId}</span>
              </p>
            )}
          </div>

          {/* C2C rejection */}
          {order.c2c?.status === "REJECTED" && order.c2c.rejectionReason && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" /> رسید پرداخت رد شد
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-6">دلیل رد: {order.c2c.rejectionReason}</p>
            </div>
          )}

          {/* items + total */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-extrabold mb-4">اقلام سفارش</p>
            <div className="space-y-3">
              {order.items.map((i, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="relative h-12 w-12 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                    {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-contain p-1" />}
                  </span>
                  <span className="flex-1 text-[13px] font-medium truncate">
                    {i.name} × {i.quantity.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums shrink-0">{formatPrice(i.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold">مبلغ کل</span>
              <span className="text-lg font-black text-primary tabular-nums">{formatPrice(order.total)} تومان</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">ثبت سفارش: {formatDateTime(order.createdAt)}</p>
            <p className="text-[11px] text-muted-foreground">آخرین بروزرسانی: {formatDateTime(order.updatedAt)}</p>
          </div>

          {canSubmitReceipt && (
            <ReceiptForm key={receiptKey} orderNumber={order.orderNumber} total={order.total} onSubmitted={() => setReceiptKey((k) => k + 1)} />
          )}

          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline" className="rounded-xl h-11">
              <Link href="/products">
                <ChevronLeft className="h-4 w-4 me-1 rotate-180" /> ادامه خرید
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

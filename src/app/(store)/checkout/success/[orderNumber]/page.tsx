"use client";

import { use, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPrice, formatDateTime, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Loader2, Receipt, RefreshCcw, Package, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ReceiptForm } from "@/components/store/receipt-form";

type OrderData = {
  order: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    subtotal: number;
    discount: number;
    shippingCost: number;
    firstName: string;
    lastName: string;
    items: { name: string; quantity: number; image: string | null; total: number; color: string | null }[];
    c2c: { status: string; rejectionReason: string | null; senderCard: string; amount: number } | null;
    payment: { refId: string | null; cardPan: string | null } | null;
    createdAt: string;
  };
};

export default function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orderNumber } = use(params);
  const sp = use(searchParams);
  const qc = useQueryClient();
  const status = sp.status ?? "";
  const refId = sp.ref ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => fetch(`/api/orders/${orderNumber}`).then((r) => r.json()) as Promise<OrderData>,
  });

  const retryPayment = async () => {
    const res = await fetch(`/api/orders/${orderNumber}`, { method: "POST" });
    const json = await res.json();
    if (json.ok && json.paymentUrl) {
      window.location.href = json.paymentUrl;
    } else {
      toast.error(json.message ?? "خطا در ایجاد پرداخت");
    }
  };

  const order = data?.order;
  const isPaid = order?.paymentStatus === "PAID";
  const isC2C = order?.paymentMethod === "CARD_TO_CARD";
  const c2cPending = order?.c2c && order.c2c.status === "PENDING";
  const c2cRejected = order?.c2c && order.c2c.status === "REJECTED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {isLoading ? (
        <div className="rounded-3xl border bg-card p-14 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        </div>
      ) : !order ? (
        <div className="rounded-3xl border border-dashed p-14 text-center">
          <p className="text-sm font-bold">سفارش پیدا نشد یا دسترسی ندارید</p>
          <Button asChild className="mt-5 gold-surface text-primary-foreground rounded-xl">
            <Link href="/">بازگشت به فروشگاه</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* status hero */}
          <div className={cn(
            "rounded-3xl border overflow-hidden",
            isPaid ? "border-emerald-500/40" : status === "failed" ? "border-destructive/40" : "border-primary/40"
          )}>
            <div className="p-7 text-center">
              {isPaid ? (
                <>
                  <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-3" />
                  <h1 className="text-xl font-black">پرداخت با موفقیت انجام شد</h1>
                  {order.payment?.refId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      شماره پیگیری بانکی: <span className="font-bold tabular-nums" dir="ltr">{order.payment.refId}</span>
                    </p>
                  )}
                </>
              ) : status === "failed" ? (
                <>
                  <XCircle className="mx-auto h-16 w-16 text-destructive mb-3" />
                  <h1 className="text-xl font-black">پرداخت ناموفق بود</h1>
                  <p className="text-xs text-muted-foreground mt-2 leading-6">
                    مبلغی از حساب شما کسر نشده است. می‌توانید دوباره تلاش کنید.
                  </p>
                </>
              ) : status === "cancelled" ? (
                <>
                  <XCircle className="mx-auto h-16 w-16 text-muted-foreground mb-3" />
                  <h1 className="text-xl font-black">پرداخت لغو شد</h1>
                  <p className="text-xs text-muted-foreground mt-2">شما پرداخت را در درگاه بانکی لغو کردید.</p>
                </>
              ) : c2cPending ? (
                <>
                  <Clock className="mx-auto h-16 w-16 text-primary mb-3" />
                  <h1 className="text-xl font-black">رسید شما در حال بررسی است</h1>
                  <p className="text-xs text-muted-foreground mt-2 leading-6">
                    رسید پرداخت شما ثبت شده و توسط اپراتور بررسی می‌شود. نتیجه از طریق اعلان‌ها اعلام می‌شود.
                  </p>
                </>
              ) : c2cRejected ? (
                <>
                  <XCircle className="mx-auto h-16 w-16 text-destructive mb-3" />
                  <h1 className="text-xl font-black">رسید پرداخت رد شد</h1>
                  <p className="text-xs text-muted-foreground mt-2 leading-6">
                    دلیل رد: <span className="text-destructive font-bold">{order.c2c?.rejectionReason}</span>
                    <br /> می‌توانید رسید جدید ارسال کنید یا از روش آنلاین پرداخت کنید.
                  </p>
                </>
              ) : isC2C ? (
                <>
                  <Receipt className="mx-auto h-16 w-16 text-primary mb-3" />
                  <h1 className="text-xl font-black">در انتظار پرداخت کارت به کارت</h1>
                </>
              ) : (
                <>
                  <Clock className="mx-auto h-16 w-16 text-primary mb-3" />
                  <h1 className="text-xl font-black">سفارش در انتظار پرداخت است</h1>
                </>
              )}

              <p className="mt-4 text-sm">
                شماره سفارش:{" "}
                <span className="font-black text-primary" dir="ltr">{order.orderNumber}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(order.createdAt)}</p>
            </div>

            {refId && !isPaid && (
              <p className="bg-muted/60 py-2.5 text-xs">شماره پیگیری بانکی: <span dir="ltr">{refId}</span></p>
            )}
          </div>

          {/* items summary */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> اقلام سفارش ({order.items.length.toLocaleString("fa-IR")})
            </h2>
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
            <div className="border-t mt-4 pt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-muted-foreground">جمع کالاها</span><span className="tabular-nums">{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف</span><span className="tabular-nums">{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">ارسال</span><span className="tabular-nums">{order.shippingCost === 0 ? "رایگان" : formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between font-black text-primary text-base pt-1">
                <span>مبلغ کل</span><span className="tabular-nums">{formatPrice(order.total)} تومان</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              وضعیت سفارش: <span className="font-bold">{ORDER_STATUS_FA[order.status] ?? order.status}</span> —
              وضعیت پرداخت: <span className="font-bold">{PAYMENT_STATUS_FA[order.paymentStatus] ?? order.paymentStatus}</span>
            </p>
          </div>

          {/* C2C receipt form */}
          {isC2C && !isPaid && !c2cPending && (
            <ReceiptForm orderNumber={order.orderNumber} total={order.total} onSubmitted={() => qc.invalidateQueries({ queryKey: ["order", orderNumber] })} />
          )}

          {/* actions */}
          <div className="flex flex-col gap-2.5">
            {!isPaid && order.paymentMethod === "ZARINPAL" && (
              <Button onClick={retryPayment} className="h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
                <RefreshCcw className="h-4 w-4 me-2" /> پرداخت مجدد با زرین‌پال
              </Button>
            )}
            {/* NOTE: exactly ONE submit button for the C2C receipt — the
                ReceiptForm above contains it («ارسال رسید برای بررسی»).
                A second link-button here pointed back to this same page and
                duplicated the action (reported by the store owner). */}
            {!isPaid && isC2C && !c2cPending && (
              <p className="text-[11px] text-center text-muted-foreground leading-5">
                اطلاعات کارت به کارت در صفحه پیگیری سفارش موجود است.
              </p>
            )}
            <Button asChild variant="outline" className="h-11 rounded-xl">
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

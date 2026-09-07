"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  ReceiptText,
  Save,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  AdminThumb,
  C2CStatusBadge,
  EmptyState,
  GatewayPayBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { formatDateTime, formatPrice, ORDER_STATUS_FA } from "@/lib/format";

interface OrderItemRow {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  discount: number;
  quantity: number;
  color: string | null;
  total: number;
}

interface FullOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingCost: number;
  tax: number;
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  province: string;
  city: string;
  address: string;
  postalCode: string | null;
  note: string | null;
  trackingCode: string | null;
  // v16 delivery snapshot
  deliveryMethodName: string | null;
  deliveryType: string | null;
  deliveryEta: string | null;
  createdAt: string;
  items: OrderItemRow[];
  payments: {
    id: string;
    gateway: string;
    amount: number;
    authority: string | null;
    refId: string | null;
    cardPan: string | null;
    status: string;
    createdAt: string;
  }[];
  c2cPayment: {
    id: string;
    senderName: string;
    senderPhone: string;
    senderCard: string;
    trackingNumber: string | null;
    amount: number;
    paidAt: string;
    receiptImage: string;
    status: string;
    rejectionReason: string | null;
    reviewedAt: string | null;
  } | null;
  user: { id: string; email: string | null; phone: string | null; firstName: string | null; lastName: string | null } | null;
}

export function OrderDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [statusValue, setStatusValue] = useState<string>("");
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [orderNote, setOrderNote] = useState<string>("");
  const [receiptFull, setReceiptFull] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => apiFetch<{ order: FullOrder }>(`/api/admin/orders/${id}`),
  });

  // sync form fields when the loaded order changes (render-phase adjustment)
  const order = data?.order;
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (order && syncedId !== order.id) {
    setSyncedId(order.id);
    setStatusValue(order.status);
    setTrackingCode(order.trackingCode ?? "");
    setOrderNote(order.note ?? "");
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "order", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const saveStatus = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusValue || undefined,
          trackingCode: trackingCode.trim() || null,
          note: orderNote.trim() || null,
        }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "سفارش به‌روزرسانی شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const approveC2C = useMutation({
    mutationFn: (c2cId: string) =>
      apiFetch<{ message?: string }>(`/api/admin/payments/c2c/${c2cId}/approve`, { method: "POST" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "پرداخت تأیید شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تأیید ناموفق بود"),
  });

  const rejectC2C = useMutation({
    mutationFn: (c2cId: string) =>
      apiFetch<{ message?: string }>(`/api/admin/payments/c2c/${c2cId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "رسید رد شد");
      setRejectOpen(false);
      setRejectReason("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "رد ناموفق بود"),
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild className="rounded-lg">
          <Link href="/admin/orders"><ArrowRight className="h-4 w-4" />بازگشت به سفارش‌ها</Link>
        </Button>
        <EmptyState title="سفارش پیدا نشد" desc={error instanceof Error ? error.message : undefined} />
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const c2c = order.c2cPayment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-mr-2 rounded-lg text-muted-foreground">
            <Link href="/admin/orders"><ArrowRight className="h-4 w-4" />بازگشت</Link>
          </Button>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-black md:text-2xl">
            سفارش <span className="font-mono text-primary" dir="ltr">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </h1>
          <p className="text-xs text-muted-foreground">
            ثبت شده در {formatDateTime(order.createdAt)}
            {order.user && " — سفارش حساب کاربری ثبت‌شده"}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-left">
          <p className="text-[11px] text-muted-foreground">مبلغ کل</p>
          <p className="text-lg font-black tabular-nums">{formatPrice(order.total)} تومان</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Customer info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <UserRound className="h-4 w-4 text-primary" />
              اطلاعات مشتری
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="نام و نام خانوادگی" value={`${order.firstName} ${order.lastName}`} />
            <Row label="موبایل" value={order.phone} mono />
            <Row label="ایمیل" value={order.email ?? "—"} mono />
            <Row label="استان / شهر" value={`${order.province} — ${order.city}`} />
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{order.address}</span>
            </div>
            {order.postalCode && <Row label="کد پستی" value={order.postalCode} mono />}
            {order.note && (
              <div className="rounded-lg border border-dashed p-2.5 text-xs">
                <span className="text-muted-foreground">یادداشت مشتری: </span>
                {order.note}
              </div>
            )}
            {order.trackingCode && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-2.5 text-xs">
                <Truck className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>کد رهگیری پستی: </span>
                <span className="font-mono font-bold" dir="ltr">{order.trackingCode}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Package className="h-4 w-4 text-primary" />
              اقلام سفارش ({order.items.length.toLocaleString("fa-IR")} قلم)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="p-2.5 text-right font-bold">محصول</th>
                    <th className="p-2.5 text-right font-bold">رنگ</th>
                    <th className="p-2.5 text-right font-bold">تعداد</th>
                    <th className="p-2.5 text-right font-bold">قیمت واحد</th>
                    <th className="p-2.5 text-right font-bold">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-b last:border-0">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <AdminThumb src={it.image} alt={it.name} size={36} />
                          <div className="min-w-0">
                            {it.productId ? (
                              <Link href={`/admin/products/${it.productId}`} className="block max-w-[200px] truncate text-xs font-bold hover:text-primary">
                                {it.name}
                              </Link>
                            ) : (
                              <span className="text-xs font-bold">{it.name}</span>
                            )}
                            <span className="block font-mono text-[10px] text-muted-foreground" dir="ltr">{it.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 text-xs">{it.color ?? "—"}</td>
                      <td className="p-2.5 text-xs tabular-nums">{formatPrice(it.quantity)}</td>
                      <td className="p-2.5 text-xs tabular-nums">
                        {formatPrice(it.unitPrice)} تومان
                      </td>
                      <td className="p-2.5 text-xs font-bold tabular-nums">
                        {formatPrice(it.total)} تومان
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="space-y-1.5 border-t p-4 text-sm">
              <Row label="جمع اقلام" value={`${formatPrice(order.subtotal)} تومان`} />
              {order.discount > 0 && (
                <Row
                  label={`تخفیف${order.couponCode ? ` (کد ${order.couponCode})` : ""}`}
                  value={`${formatPrice(order.discount)} تومان`}
                  tone="text-emerald-600"
                />
              )}
              {order.deliveryMethodName && (
                <Row
                  label="روش ارسال"
                  value={`${order.deliveryMethodName}${order.deliveryEta ? ` — ${order.deliveryEta}` : ""}`}
                />
              )}
              <Row label="هزینه ارسال" value={`${formatPrice(order.shippingCost)} تومان`} />
              <Row label="مالیات" value={`${formatPrice(order.tax)} تومان`} />
              <div className="flex items-center justify-between border-t pt-2 font-black">
                <span>مبلغ قابل پرداخت</span>
                <span className="tabular-nums text-primary">{formatPrice(order.total)} تومان</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <CreditCard className="h-4 w-4 text-primary" />
              اطلاعات پرداخت
              <span className="text-[11px] font-normal text-muted-foreground">
                ({order.paymentMethod === "CARD_TO_CARD" ? "کارت به کارت" : "درگاه زرین‌پال"})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.paymentMethod === "CARD_TO_CARD" && c2c && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <button
                    type="button"
                    className="relative shrink-0 overflow-hidden rounded-lg border transition hover:opacity-80"
                    onClick={() => setReceiptFull(true)}
                    aria-label="نمایش رسید در اندازه کامل"
                  >
                    <AdminThumb src={c2c.receiptImage} alt="رسید واریز" size={64} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                      <ImageIcon className="h-5 w-5 text-white" />
                    </span>
                  </button>
                  <div className="grid flex-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                    <Row label="واریزکننده" value={c2c.senderName} />
                    <Row label="شماره کارت" value={c2c.senderCard} mono />
                    <Row label="مبلغ واریزی" value={`${formatPrice(c2c.amount)} تومان`} />
                    <Row label="تاریخ واریز" value={formatDateTime(c2c.paidAt)} />
                    {c2c.trackingNumber && <Row label="شماره پیگیری" value={c2c.trackingNumber} mono />}
                    <div><C2CStatusBadge status={c2c.status} /></div>
                  </div>
                </div>
                {c2c.status === "REJECTED" && c2c.rejectionReason && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                    <p className="font-bold">دلیل رد رسید:</p>
                    <p className="mt-1">{c2c.rejectionReason}</p>
                    {c2c.reviewedAt && (
                      <p className="mt-1 text-[11px] opacity-80">بررسی: {formatDateTime(c2c.reviewedAt)}</p>
                    )}
                  </div>
                )}
                {c2c.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => approveC2C.mutate(c2c.id)}
                      disabled={approveC2C.isPending}
                    >
                      {approveC2C.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      تأیید پرداخت
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-lg"
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      رد پرداخت
                    </Button>
                  </div>
                )}
              </div>
            )}

            {order.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">تراکنش‌های درگاه:</p>
                {order.payments.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3 text-xs">
                    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                      <Row label="مبلغ" value={`${formatPrice(p.amount / 10)} تومان`} />
                      <Row label="درگاه" value={p.gateway} mono />
                      {p.refId && <Row label="شماره مرجع" value={p.refId} mono />}
                      {p.cardPan && <Row label="کارت پرداخت‌کننده" value={p.cardPan} mono />}
                      <Row label="تاریخ" value={formatDateTime(p.createdAt)} />
                      <div className="flex items-center gap-2">
                        <GatewayPayBadge status={p.status} />
                      </div>
                    </div>
                    {p.authority && (
                      <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground" dir="ltr" title={p.authority}>
                        Authority: {p.authority}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.payments.length === 0 && !c2c && (
              <p className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                هنوز پرداختی برای این سفارش ثبت نشده است
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status change form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <ReceiptText className="h-4 w-4 text-primary" />
              تغییر وضعیت و ارسال
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>وضعیت سفارش</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_FA).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking">کد رهگیری پستی</Label>
              <Input id="tracking" dir="ltr" className="rounded-lg text-left" value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)} placeholder="مثلاً ۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-note">یادداشت داخلی</Label>
              <Textarea id="order-note" rows={3} className="rounded-lg" value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)} placeholder="یادداشت برای تیم (به کاربر نمایش داده نمی‌شود)" />
            </div>
            <Button
              className="gold-surface w-full rounded-lg text-primary-foreground hover:opacity-90"
              onClick={() => saveStatus.mutate()}
              disabled={saveStatus.isPending}
            >
              {saveStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تغییرات
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Full receipt dialog */}
      <Dialog open={receiptFull} onOpenChange={setReceiptFull}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>رسید واریز کارت به کارت</DialogTitle>
            <DialogDescription>
              سفارش <span className="font-mono" dir="ltr">{order.orderNumber}</span> — {c2c ? `${c2c.senderName} / ${formatPrice(c2c.amount)} تومان` : ""}
            </DialogDescription>
          </DialogHeader>
          {c2c && (
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border bg-muted/30 p-2">

              <img src={c2c.receiptImage} alt="رسید کامل واریز" className="mx-auto max-h-[65vh] w-auto rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>رد رسید پرداخت</DialogTitle>
            <DialogDescription>
              دلیل رد به کاربر اطلاع داده می‌شود — حداقل ۵ کاراکتر بنویسید
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            className="rounded-lg"
            placeholder="مثلاً: مبلغ واریزشده با مبلغ سفارش مطابقت ندارد"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setRejectOpen(false)}>انصراف</Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              disabled={rejectC2C.isPending || rejectReason.trim().length < 5}
              onClick={() => c2c && rejectC2C.mutate(c2c.id)}
            >
              {rejectC2C.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              رد رسید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className={`truncate font-medium ${tone ?? ""} ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : undefined} title={value}>
        {value}
      </span>
    </div>
  );
}

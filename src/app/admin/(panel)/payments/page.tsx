"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, CreditCard, Loader2, ReceiptText, XCircle } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminThumb,
  C2CStatusBadge,
  EmptyState,
  GatewayPayBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type C2CPaymentRow, type GatewayPaymentRow, type Paginated } from "@/components/admin/api-client";
import { formatDateTime, formatPrice } from "@/lib/format";

interface PaymentsResponse extends Paginated {
  payments?: GatewayPaymentRow[];
  c2cPayments?: C2CPaymentRow[];
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [receiptFull, setReceiptFull] = useState<C2CPaymentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<C2CPaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "payments", { tab, status, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (status !== "all") params.set("status", status);
      if (page > 1) params.set("page", String(page));
      return apiFetch<PaymentsResponse>(`/api/admin/payments?${params.toString()}`);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/payments/c2c/${id}/approve`, { method: "POST" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "پرداخت تأیید شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تأیید ناموفق بود"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/payments/c2c/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "رسید رد شد");
      setRejectTarget(null);
      setRejectReason("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "رد ناموفق بود"),
  });

  const gatewayPayments = data?.payments ?? [];
  const c2cPayments = data?.c2cPayments ?? [];

  const statusOptions = tab === "gateway" || tab === "all" ? ["PENDING", "VERIFIED", "FAILED", "CANCELLED"] : ["PENDING", "APPROVED", "REJECTED"];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="پرداخت‌ها"
        desc="تراکنش‌های درگاه بانکی و رسیدهای کارت به کارت"
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setStatus("all"); setPage(1); }}>
        <TabsList className="rounded-lg">
          <TabsTrigger value="all" className="rounded-lg">همه</TabsTrigger>
          <TabsTrigger value="gateway" className="rounded-lg">درگاه زرین‌پال</TabsTrigger>
          <TabsTrigger value="c2c" className="rounded-lg">کارت به کارت</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          {/* status filter */}
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
            <div className="w-48">
              <Label className="mb-1.5 block text-xs text-muted-foreground">وضعیت</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s === "PENDING" ? "در انتظار" : s === "VERIFIED" ? "موفق" : s === "FAILED" ? "ناموفق" : s === "CANCELLED" ? "لغو شده" : s === "APPROVED" ? "تأیید شده" : "رد شده"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              {tab === "gateway" ? "مبالغ درگاه به ریال ثبت می‌شوند و به تومان نمایش داده می‌شوند" : tab === "c2c" ? "رسیدهای ارسالی کاربران برای بررسی" : "همه پرداخت‌ها به تفکیک نوع"}
            </p>
          </div>

          {isError ? (
            <EmptyState title="خطا در دریافت پرداخت‌ها" desc={error instanceof Error ? error.message : undefined} />
          ) : isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <>
              {/* Gateway payments */}
              {(tab === "gateway" || tab === "all") && (
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <CreditCard className="h-4 w-4 text-primary" />
                      تراکنش‌های درگاه
                    </CardTitle>
                    {tab === "gateway" && data && (
                      <span className="text-xs text-muted-foreground">{formatPrice(data.total)} تراکنش</span>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 pb-2">
                    {gatewayPayments.length === 0 ? (
                      <p className="p-6 text-center text-xs text-muted-foreground">تراکنشی یافت نشد</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                              <th className="p-2.5 text-right font-bold">شماره سفارش</th>
                              <th className="p-2.5 text-right font-bold">مبلغ (تومان)</th>
                              <th className="p-2.5 text-right font-bold">درگاه</th>
                              <th className="p-2.5 text-right font-bold">وضعیت</th>
                              <th className="p-2.5 text-right font-bold">Authority</th>
                              <th className="p-2.5 text-right font-bold">شماره مرجع</th>
                              <th className="p-2.5 text-right font-bold">تاریخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gatewayPayments.map((p) => (
                              <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                                <td className="p-2.5 font-mono text-xs font-bold text-primary" dir="ltr">{p.order?.orderNumber ?? "—"}</td>
                                <td className="p-2.5 text-xs tabular-nums">
                                  {formatPrice(p.amount / 10)}
                                  <span className="mr-1 text-[10px] text-muted-foreground">(ریال: {formatPrice(p.amount)})</span>
                                </td>
                                <td className="p-2.5 text-xs">{p.gateway}</td>
                                <td className="p-2.5"><GatewayPayBadge status={p.status} /></td>
                                <td className="p-2.5 max-w-[140px]">
                                  <span className="block truncate font-mono text-[10px] text-muted-foreground" dir="ltr" title={p.authority ?? ""}>
                                    {p.authority ? `${p.authority.slice(0, 10)}…` : "—"}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-xs" dir="ltr">{p.refId ?? "—"}</td>
                                <td className="p-2.5 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* C2C payments */}
              {(tab === "c2c" || tab === "all") && (
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <ReceiptText className="h-4 w-4 text-primary" />
                      رسیدهای کارت به کارت
                    </CardTitle>
                    {tab === "c2c" && data && (
                      <span className="text-xs text-muted-foreground">{formatPrice(data.total)} رسید</span>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 pb-2">
                    {c2cPayments.length === 0 ? (
                      <p className="p-6 text-center text-xs text-muted-foreground">رسیدی یافت نشد</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                              <th className="p-2.5 text-right font-bold">رسید</th>
                              <th className="p-2.5 text-right font-bold">شماره سفارش</th>
                              <th className="p-2.5 text-right font-bold">واریزکننده</th>
                              <th className="p-2.5 text-right font-bold">شماره کارت</th>
                              <th className="p-2.5 text-right font-bold">مبلغ</th>
                              <th className="p-2.5 text-right font-bold">تاریخ واریز</th>
                              <th className="p-2.5 text-right font-bold">وضعیت</th>
                              <th className="p-2.5 text-right font-bold">عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c2cPayments.map((c) => (
                              <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                                <td className="p-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setReceiptFull(c)}
                                    aria-label="نمایش رسید"
                                    className="transition hover:opacity-80"
                                  >
                                    <AdminThumb src={c.receiptImage} alt="رسید واریز" size={40} />
                                  </button>
                                </td>
                                <td className="p-2.5">
                                  <p className="font-mono text-xs font-bold text-primary" dir="ltr">{c.order?.orderNumber ?? "—"}</p>
                                  {c.trackingNumber && (
                                    <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{c.trackingNumber}</p>
                                  )}
                                </td>
                                <td className="p-2.5 text-xs">{c.senderName}</td>
                                <td className="p-2.5 font-mono text-xs" dir="ltr">
                                  {c.senderCard ? c.senderCard.replace(/(\d{4})(?=\d)/g, "$1-") : "—"}
                                </td>
                                <td className="p-2.5 whitespace-nowrap text-xs tabular-nums">
                                  {formatPrice(c.amount)} تومان
                                  {c.order && c.amount !== c.order.total && (
                                    <span className={"block text-[10px] " + (c.amount < c.order.total ? "text-destructive" : "text-amber-600")}>
                                      سفارش: {formatPrice(c.order.total)}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(c.paidAt)}</td>
                                <td className="p-2.5">
                                  <C2CStatusBadge status={c.status} />
                                  {c.status === "REJECTED" && c.rejectionReason && (
                                    <p className="mt-1 max-w-[160px] text-[10px] text-destructive" title={c.rejectionReason}>دلیل: {c.rejectionReason}</p>
                                  )}
                                  {c.status !== "PENDING" && c.reviewedAt && (
                                    <p className="text-[10px] text-muted-foreground">بررسی: {formatDateTime(c.reviewedAt)}</p>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {c.status === "PENDING" ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={() => approveMutation.mutate(c.id)}
                                        disabled={approveMutation.isPending}
                                        title="تأیید پرداخت"
                                      >
                                        {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                        تأیید
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-8 rounded-lg"
                                        onClick={() => setRejectTarget(c)}
                                        title="رد پرداخت"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        رد
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">بررسی شده</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {data && tab !== "all" && data.pages > 1 && (
            <AdminPagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          )}
        </TabsContent>
      </Tabs>

      {/* Full receipt dialog */}
      <Dialog open={!!receiptFull} onOpenChange={(o) => !o && setReceiptFull(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>رسید واریز کارت به کارت</DialogTitle>
            <DialogDescription>
              {receiptFull && (
                <>
                  سفارش <span className="font-mono" dir="ltr">{receiptFull.order?.orderNumber}</span> —{" "}
                  {receiptFull.senderName} / {formatPrice(receiptFull.amount)} تومان
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {receiptFull && (
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border bg-muted/30 p-2">

              <img src={receiptFull.receiptImage} alt="رسید کامل واریز" className="mx-auto max-h-[65vh] w-auto rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
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
            <Button variant="outline" className="rounded-lg" onClick={() => setRejectTarget(null)}>انصراف</Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              disabled={rejectMutation.isPending || rejectReason.trim().length < 5}
              onClick={() => rejectTarget && rejectMutation.mutate(rejectTarget.id)}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              رد رسید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

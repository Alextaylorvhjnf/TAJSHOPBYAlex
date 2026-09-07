"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Search, ShoppingCart } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  C2CStatusBadge,
  EmptyState,
  OrderStatusBadge,
  PaymentStatusBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type OrderRow, type Paginated } from "@/components/admin/api-client";
import { formatDateTime, formatPrice, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/format";

interface OrdersResponse extends Paginated {
  orders: OrderRow[];
}

const PAYMENT_METHOD_FA: Record<string, string> = {
  ZARINPAL: "زرین‌پال",
  CARD_TO_CARD: "کارت به کارت",
};

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "orders", { q: debouncedQ, status, paymentStatus, paymentMethod, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (status !== "all") params.set("status", status);
      if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
      if (paymentMethod !== "all") params.set("paymentMethod", paymentMethod);
      if (page > 1) params.set("page", String(page));
      const s = params.toString();
      return apiFetch<OrdersResponse>(`/api/admin/orders${s ? `?${s}` : ""}`);
    },
  });

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="سفارش‌ها"
        desc={`${data ? data.total.toLocaleString("fa-IR") : "…"} سفارش ثبت شده — مدیریت و پیگیری سفارش‌ها`}
      />

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="o-search" className="text-xs text-muted-foreground">جستجو</Label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="o-search" className="rounded-lg pr-9" placeholder="شماره سفارش، نام یا موبایل"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">وضعیت سفارش</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(ORDER_STATUS_FA).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">وضعیت پرداخت</Label>
          <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(PAYMENT_STATUS_FA).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">روش پرداخت</Label>
          <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPage(1); }}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="ZARINPAL">زرین‌پال</SelectItem>
              <SelectItem value="CARD_TO_CARD">کارت به کارت</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState title="خطا در دریافت سفارش‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="سفارشی یافت نشد"
          desc="با تغییر فیلترها دوباره جستجو کنید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => { setSearch(""); setStatus("all"); setPaymentStatus("all"); setPaymentMethod("all"); }}>
              <ShoppingCart className="h-4 w-4" />
              پاک کردن فیلترها
            </Button>
          }
        />
      ) : (
        <AdminTable
          headers={["شماره سفارش", "مشتری", "موبایل", "اقلام", "مبلغ کل", "روش پرداخت", "پرداخت", "وضعیت", "تاریخ", ""]}
        >
          {orders.map((o) => (
            <tr key={o.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold text-primary hover:underline" dir="ltr">{o.orderNumber}</Link>
                {o.c2cStatus && (
                  <span className="mt-1 block"><C2CStatusBadge status={o.c2cStatus} /></span>
                )}
              </td>
              <td className="p-3 text-xs">{o.customer}</td>
              <td className="p-3 font-mono text-xs text-muted-foreground" dir="ltr">{o.phone}</td>
              <td className="p-3 text-xs tabular-nums">{formatPrice(o.itemCount)}</td>
              <td className="p-3 whitespace-nowrap text-xs font-bold tabular-nums">
                {formatPrice(o.total)} تومان
              </td>
              <td className="p-3 text-xs">{PAYMENT_METHOD_FA[o.paymentMethod] ?? o.paymentMethod}</td>
              <td className="p-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
              <td className="p-3"><OrderStatusBadge status={o.status} /></td>
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
              <td className="p-3">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="مشاهده سفارش">
                  <Link href={`/admin/orders/${o.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {data && <AdminPagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
    </div>
  );
}

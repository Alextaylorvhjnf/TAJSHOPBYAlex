"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  CreditCard,
  ListTodo,
  Mail,
  Package,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminThumb,
  CardsSkeleton,
  CountUp,
  EmptyState,
  GatewayPayBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  StatCard,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import {
  ColorStatCard,
  HealthBar,
  MiniAreaChart,
  MiniBarChart,
  RoundStat,
  ZywraStatCard,
  type ZywraTrend,
} from "@/components/admin/dashboard-visuals";
import {
  formatDateTime,
  formatPrice,
  ORDER_STATUS_FA,
  PAYMENT_STATUS_FA,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsResponse {
  ok: true;
  stats: {
    totalSales: number;
    totalPaidOrders: number;
    todaySales: number;
    monthSales: number;
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    pendingC2C: number;
    pendingReviews: number;
    unreadMessages: number;
    newCustomers30: number;
    totalUsers: number;
    totalProducts: number;
    lowStockProducts: { id: string; name: string; stock: number; sku: string }[];
    outOfStock: number;
    pendingActions: number;
    generatedAt: string;
  };
  chart: {
    salesByDay: { date: string; total: number; count: number; customers: number }[];
    statusCounts: { status: string; _count: number }[];
    salesByCategory: { name: string; revenue: number }[];
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    itemCount: number;
    customer: string;
    phone: string;
    createdAt: string;
  }[];
  recentPayments: {
    id: string;
    orderNumber: string;
    amount: number;
    status: string;
    refId: string | null;
    gateway: string;
    createdAt: string;
  }[];
  recentMessages: { id: string; name: string; subject: string; createdAt: string }[];
  topProducts: {
    name: string;
    soldCount: number;
    price: number;
    mainImage: string | null;
    category: string | null;
  }[];
}

const RANGES = [
  { days: 7, label: "۷ روز" },
  { days: 30, label: "۳۰ روز" },
  { days: 90, label: "۹۰ روز" },
] as const;

const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

const FALLBACK_CHART = ["#C98A1B", "#0D9488", "#D97706", "#059669", "#E11D48"];

/** reads chart color tokens from CSS vars — re-reads when the storefront
 *  theme/mode OR the v17/v20 admin panel theme ([data-admin-theme]) changes */
function useChartColors(): string[] {
  const [colors, setColors] = useState<string[]>(FALLBACK_CHART);

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next = CHART_VARS.map(
        (v, i) => cs.getPropertyValue(v).trim() || FALLBACK_CHART[i]
      );
      setColors(next);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-admin-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return colors;
}

function faDate(d: string) {
  return new Date(d).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

function compactFa(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fa-IR")}M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString("fa-IR")}K`;
  return v.toLocaleString("fa-IR");
}

function timeAgo(iso: string | null | undefined, tick: number): string {
  if (!iso) return "—";
  void tick; // re-computed on interval ticks
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "—";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "همین حالا";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m.toLocaleString("fa-IR")} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h.toLocaleString("fa-IR")} ساعت پیش`;
  return `${Math.floor(h / 24).toLocaleString("fa-IR")} روز پیش`;
}

function PriceCountUp({ value }: { value: number }) {
  return (
    <>
      <CountUp value={value} format={formatPrice} /> تومان
    </>
  );
}

/**
 * Honest trend for the Zywra stat cards: compares the sum of the last
 * 12 days against the PREVIOUS 12 days of the same real series (needs a
 * 30/90-day range). No synthetic/random data is ever displayed.
 */
function windowTrend(series: number[]): ZywraTrend | null {
  const W = 12;
  if (series.length < W * 2) return null;
  const recent = series.slice(-W).reduce((a, b) => a + b, 0);
  const prev = series.slice(-W * 2, -W).reduce((a, b) => a + b, 0);
  if (prev === 0) return recent > 0 ? { pct: 100, dir: "up", label: "نسبت به ۱۲ روز قبل" } : null;
  const pct = Math.round(((recent - prev) / prev) * 100);
  if (pct === 0) return null;
  return { pct, dir: pct > 0 ? "up" : "down", label: "نسبت به ۱۲ روز قبل" };
}

/* ═ recent orders — the reference "invoice table": pill tab row
   (active = slate-900/white ↔ white/slate-900) + 12px uppercase
   headers + 48px zebra rows (styling via admin-v20.css) ═ */
const ORDER_TABS = [
  { id: "all", label: "همه" },
  { id: "open", label: "در انتظار" },
  { id: "paid", label: "پرداخت‌شده" },
] as const;

type OrderFilter = (typeof ORDER_TABS)[number]["id"];

function RecentOrdersCard({
  orders,
  filter,
  onFilter,
}: {
  orders: StatsResponse["recentOrders"];
  filter: OrderFilter;
  onFilter: (f: OrderFilter) => void;
}) {
  const emptyText =
    filter === "open"
      ? "سفارش در انتظاری ندارید"
      : filter === "paid"
        ? "سفارش پرداخت‌شده‌ای ندارید"
        : "سفارشی ثبت نشده است";
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold">آخرین سفارش‌ها</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatPrice(orders.length)} سفارش اخیر — برای جزئیات، شماره سفارش را باز کنید
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="tablist" aria-label="فیلتر سفارش‌ها">
            {ORDER_TABS.map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onFilter(t.id)}
                  className="zy-tab"
                  data-active={active || undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="rounded-[10px] text-primary hover:text-primary"
          >
            <Link href="/admin/orders">مشاهده همه</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {orders.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-start font-medium">شماره</th>
                  <th className="px-4 py-3 text-start font-medium">مشتری</th>
                  <th className="px-4 py-3 text-start font-medium">مبلغ</th>
                  <th className="px-4 py-3 text-start font-medium">پرداخت</th>
                  <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-start font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                        dir="ltr"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.customer}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatPrice(o.total)} تومان</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [tick, setTick] = useState(0);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const chartColors = useChartColors();

  // relative "last updated" refreshes every 30s
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "stats", days],
    queryFn: () => apiFetch<StatsResponse>(`/api/admin/stats?days=${days}`),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const pieColors = useMemo(
    () => [...chartColors, ...chartColors].slice(0, 8),
    [chartColors]
  );

  if (isError) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="خطا در دریافت آمار"
          desc={error instanceof Error ? error.message : "دوباره تلاش کنید"}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-44 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[240px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
        <CardsSkeleton count={8} />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  const s = data.stats;
  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? "۳۰ روز";
  // store-health ratios for the progress-bar card
  const healthyStock = Math.max(0, s.totalProducts - s.lowStockProducts.length - s.outOfStock);
  const stockPct = s.totalProducts ? (healthyStock / s.totalProducts) * 100 : 0;
  const lowPct = s.totalProducts ? (s.lowStockProducts.length / s.totalProducts) * 100 : 0;
  const pieData = data.chart.statusCounts
    .filter((c) => c._count > 0)
    .map((c) => ({ name: ORDER_STATUS_FA[c.status] ?? c.status, value: c._count, key: c.status }));
  const hasSales = data.chart.salesByDay.some((d) => d.total > 0 || d.count > 0);
  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: 12,
  };

  // ── Zywra stat-card series (REAL daily numbers, last 12 days) ──
  const byDay = data.chart.salesByDay;
  const totals12 = byDay.slice(-12).map((d) => d.total);
  const counts12 = byDay.slice(-12).map((d) => d.count);
  const customers12 = byDay.slice(-12).map((d) => d.customers);
  const salesTrend = windowTrend(byDay.map((d) => d.total));
  const ordersTrend = windowTrend(byDay.map((d) => d.count));
  const customersTrend = windowTrend(byDay.map((d) => d.customers));

  // tab filter for the recent-orders table (replaces the v20 filter toggle)
  const isOpenOrder = (o: StatsResponse["recentOrders"][number]) =>
    o.paymentStatus !== "PAID" ||
    o.status === "PENDING_PAYMENT" ||
    o.status === "PROCESSING";
  const listOrders =
    orderFilter === "all"
      ? data.recentOrders
      : orderFilter === "open"
        ? data.recentOrders.filter((o) => isOpenOrder(o))
        : data.recentOrders.filter((o) => o.paymentStatus === "PAID");

  return (
    <div className="space-y-6">
      {/* header row — segmented range control (reference view-toggle) + live status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="zy-segment" role="tablist" aria-label="بازه زمانی نمودارها">
          {RANGES.map((r) => {
            const active = days === r.days;
            return (
              <button
                key={r.days}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDays(r.days)}
                className="zy-segment-btn"
                data-active={active || undefined}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            زنده
          </span>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString("fa-IR") : undefined}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            آخرین به‌روزرسانی: {timeAgo(s.generatedAt, tick)}
          </span>
        </div>
      </div>

      {/* ═ ZYWRA stat cards — 16px radius, tinted 40×40 icon squares,
         28px/700 tabular values, trend pills + REAL mini charts ═ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ZywraStatCard
          label="فروش کل (پرداخت‌شده)"
          value={<PriceCountUp value={s.totalSales} />}
          icon={BadgeDollarSign}
          tone="red"
          trend={salesTrend}
          sub={`${formatPrice(s.totalPaidOrders)} سفارش پرداخت‌شده`}
          chart={<MiniBarChart data={totals12} ariaLabel="فروش روزانه ۱۲ روز اخیر" />}
        />
        <ZywraStatCard
          label="سفارش‌های فروشگاه"
          value={<CountUp value={s.totalOrders} />}
          icon={ShoppingBag}
          tone="indigo"
          trend={ordersTrend}
          sub={`${formatPrice(s.paidOrders)} پرداخت‌شده • ${formatPrice(s.pendingOrders)} در انتظار`}
          chart={<MiniBarChart data={counts12} ariaLabel="تعداد سفارش ۱۲ روز اخیر" />}
        />
        <ZywraStatCard
          label="مشتریان جدید (۳۰ روز)"
          value={<CountUp value={s.newCustomers30} />}
          icon={Users}
          tone="cyan"
          trend={customersTrend}
          sub={`${formatPrice(s.totalUsers)} کاربر ثبت‌شده`}
          chart={<MiniAreaChart data={customers12} ariaLabel="ثبت‌نام روزانه ۱۲ روز اخیر" />}
        />
        <ZywraStatCard
          label="سفارش‌های پرداخت‌شده"
          value={<CountUp value={s.paidOrders} />}
          icon={PackageCheck}
          tone="emerald"
          sub={`${formatPrice(s.pendingOrders)} در انتظار پرداخت`}
          breakdown={pieData.slice(0, 5).map((p, i) => ({
            label: p.name,
            value: p.value.toLocaleString("fa-IR"),
            color: pieColors[i % pieColors.length],
          }))}
        />
      </div>

      {/* Charts row 1: revenue + status pie */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-4 w-4 text-primary" />
              فروش {rangeLabel} گذشته
            </CardTitle>
            <p className="text-xs text-muted-foreground">مبالغ به تومان — سفارش‌های پرداخت‌شده</p>
          </CardHeader>
          <CardContent>
            {!hasSales ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-xs text-muted-foreground">فروشی در این بازه ثبت نشده است</p>
              </div>
            ) : (
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart.salesByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashSalesArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={faDate}
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      reversed
                    />
                    <YAxis
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v: number) => compactFa(v)}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [`${formatPrice(Number(value))} تومان`, "فروش"]}
                      labelFormatter={(l: string) =>
                        new Date(l).toLocaleDateString("fa-IR", { weekday: "long", month: "long", day: "numeric" })
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="total" stroke={chartColors[0]} strokeWidth={2.5} fill="url(#dashSalesArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">وضعیت سفارش‌ها</CardTitle>
            <p className="text-xs text-muted-foreground">توزیع سفارش‌ها بر اساس وضعیت</p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-xs text-muted-foreground">سفارشی ثبت نشده است</p>
              </div>
            ) : (
              <div className="relative h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={entry.key} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string, name: string) => [`${Number(value).toLocaleString("fa-IR")} سفارش`, name]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* donut center label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-black tabular-nums">{formatPrice(s.totalOrders)}</p>
                  <p className="text-[10px] text-muted-foreground">کل سفارش‌ها</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {pieData.map((p, i) => (
                <span key={p.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                  {p.name}: {p.value.toLocaleString("fa-IR")}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═ recent orders — reference invoice table with pill tabs ═ */}
      <RecentOrdersCard
        orders={listOrders}
        filter={orderFilter}
        onFilter={setOrderFilter}
      />

      {/* ═ v27.1 ROUND STATISTICS — the «Analytics Admin UI» reference photo's
         circular icon badges strip (real numbers, click-through to pages) ═ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RoundStat
          label="کل سفارش‌های فروشگاه"
          value={<CountUp value={s.totalOrders} />}
          icon={ShoppingCart}
          tone="pink"
          href="/admin/orders"
        />
        <RoundStat
          label={`مشتریان جدید (۳۰ روز) — ${formatPrice(s.totalUsers)} کاربر`}
          value={<CountUp value={s.newCustomers30} />}
          icon={Users}
          tone="purple"
          href="/admin/users"
        />
        <RoundStat
          label={s.pendingOrders > 0 ? "در انتظار پرداخت" : "سفارش در انتظار پرداخت ندارید"}
          value={<CountUp value={s.pendingOrders} />}
          icon={Activity}
          tone="blue"
          href="/admin/orders"
        />
        <RoundStat
          label={s.pendingC2C > 0 ? "رسید کارت به کارت در انتظار — بررسی فوری" : "رسید کارت به کارت در انتظار"}
          value={<CountUp value={s.pendingC2C} />}
          icon={ReceiptText}
          tone="orange"
          href="/admin/payments"
        />
      </div>

      {/* ═ v27.1 COLORFUL CARDS — the reference photo's signature solid
         gradient cards (pink/purple/blue/orange) with REAL mini charts
         and values for the other operational metrics ═ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ColorStatCard
          title="فروش امروز"
          value={<PriceCountUp value={s.todaySales} />}
          icon={TrendingUp}
          tone="pink"
          sub={`${formatPrice(s.paidOrders)} سفارش پرداخت‌شده`}
          chart={<MiniBarChart data={totals12} ariaLabel="فروش روزانه ۱۲ روز اخیر" />}
        />
        <ColorStatCard
          title="فروش این ماه"
          value={<PriceCountUp value={s.monthSales} />}
          icon={BadgeDollarSign}
          tone="purple"
          sub="مبالغ به تومان — پرداخت‌شده"
          chart={<MiniAreaChart data={byDay.slice(-30).map((d) => d.total)} ariaLabel="روند فروش ۳۰ روز اخیر" />}
        />
        <ColorStatCard
          title="محصولات فروشگاه"
          value={<CountUp value={s.totalProducts} />}
          icon={Package}
          tone="blue"
          sub={`${formatPrice(s.totalProducts - s.outOfStock)} موجود • ${formatPrice(s.outOfStock)} ناموجود`}
          chart={<MiniBarChart data={counts12} ariaLabel="تعداد سفارش ۱۲ روز اخیر" />}
        />
        <ColorStatCard
          title="اقدامات در انتظار"
          value={<CountUp value={s.pendingActions} />}
          icon={ListTodo}
          tone="orange"
          sub={`${formatPrice(s.pendingReviews)} دیدگاه • ${formatPrice(s.unreadMessages)} پیام جدید`}
          chart={<MiniBarChart data={customers12} ariaLabel="ثبت‌نام روزانه ۱۲ روز اخیر" />}
        />
      </div>

      {/* remaining operational metrics — compact grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="کالای رو به اتمام"
          value={`${formatPrice(s.lowStockProducts.length)} مورد`}
          icon={AlertTriangle}
          tone={s.lowStockProducts.length > 0 ? "warning" : "default"}
        />
        <StatCard
          title="کالای ناموجود"
          value={<CountUp value={s.outOfStock} />}
          icon={Ban}
          tone={s.outOfStock > 0 ? "danger" : "default"}
        />
        <StatCard title="درگاه پرداخت" value="زرین‌پال" icon={CreditCard} hint="پرداخت امن و آنلاین" />
        <Link href="/admin/messages" className="block" aria-label="مشاهده پیام‌های مشتریان">
          <StatCard
            title="پیام‌های جدید"
            value={<CountUp value={s.unreadMessages} />}
            icon={Mail}
            tone={s.unreadMessages > 0 ? "danger" : "default"}
            hint={s.unreadMessages > 0 ? "مشاهده صندوق پیام‌ها" : "پیام خوانده‌نشده ندارید"}
          />
        </Link>
        <Link href="/admin/reviews" className="block" aria-label="مشاهده دیدگاه‌های در انتظار">
          <StatCard
            title="دیدگاه‌های در انتظار"
            value={<CountUp value={s.pendingReviews} />}
            icon={Star}
            tone={s.pendingReviews > 0 ? "warning" : "default"}
            hint={s.pendingReviews > 0 ? "نیازمند بررسی" : "موردی در انتظار نیست"}
          />
        </Link>
      </div>

      {/* Charts row 2: orders bar + customers line + category bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">سفارش‌های روزانه</CardTitle>
            <p className="text-xs text-muted-foreground">تعداد سفارش در {rangeLabel} گذشته</p>
          </CardHeader>
          <CardContent>
            {!hasSales ? (
              <div className="flex h-56 items-center justify-center">
                <p className="text-xs text-muted-foreground">سفارشی در این بازه ثبت نشده است</p>
              </div>
            ) : (
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart.salesByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashOrdersBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors[1]} stopOpacity={1} />
                        <stop offset="100%" stopColor={chartColors[1]} stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={faDate} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" reversed />
                    <YAxis
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v: number) => v.toLocaleString("fa-IR")}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [`${Number(value).toLocaleString("fa-IR")} سفارش`, "سفارش"]}
                      labelFormatter={(l: string) =>
                        new Date(l).toLocaleDateString("fa-IR", { weekday: "long", month: "long", day: "numeric" })
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="count" fill="url(#dashOrdersBar)" radius={[8, 8, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">رشد مشتریان</CardTitle>
            <p className="text-xs text-muted-foreground">ثبت‌نام روزانه در {rangeLabel} گذشته</p>
          </CardHeader>
          <CardContent>
            {!data.chart.salesByDay.some((d) => d.customers > 0) ? (
              <div className="flex h-56 items-center justify-center">
                <p className="text-xs text-muted-foreground">مشتری جدیدی در این بازه ثبت‌نام نکرده است</p>
              </div>
            ) : (
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chart.salesByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={faDate} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" reversed />
                    <YAxis
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v: number) => v.toLocaleString("fa-IR")}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [`${Number(value).toLocaleString("fa-IR")} مشتری`, "مشتری جدید"]}
                      labelFormatter={(l: string) =>
                        new Date(l).toLocaleDateString("fa-IR", { weekday: "long", month: "long", day: "numeric" })
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Line type="monotone" dataKey="customers" stroke={chartColors[2]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">فروش بر اساس دسته‌بندی</CardTitle>
            <p className="text-xs text-muted-foreground">درآمد کل — پرداخت‌شده‌ها</p>
          </CardHeader>
          <CardContent>
            {data.chart.salesByCategory.length === 0 ? (
              <div className="flex h-56 items-center justify-center">
                <p className="text-xs text-muted-foreground">فروشی برای دسته‌بندی‌ها ثبت نشده است</p>
              </div>
            ) : (
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart.salesByCategory} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashCategoryBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={chartColors[3]} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={chartColors[3]} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v: number) => compactFa(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [`${formatPrice(Number(value))} تومان`, "درآمد"]}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="revenue" fill="url(#dashCategoryBar)" radius={8} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* store health + top products + payments + messages */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-4 w-4 text-primary" />
              سلامت فروشگاه
            </CardTitle>
            <p className="text-xs text-muted-foreground">نمای کلی وضعیت سفارش‌ها و انبار</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthBar
              label="سفارش‌های پرداخت‌شده"
              value={`${formatPrice(s.paidOrders)} از ${formatPrice(s.totalOrders)}`}
              pct={s.totalOrders ? (s.paidOrders / s.totalOrders) * 100 : 0}
              color={chartColors[1]}
            />
            <HealthBar
              label="موجودی سالم انبار"
              value={`${formatPrice(healthyStock)} از ${formatPrice(s.totalProducts)}`}
              pct={stockPct}
              color={chartColors[0]}
            />
            <HealthBar
              label="اقلام رو به اتمام"
              value={`${formatPrice(s.lowStockProducts.length)} کالا`}
              pct={lowPct}
              color={chartColors[2]}
            />
            {s.lowStockProducts.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-[10px] font-bold text-muted-foreground">کالاهای رو به اتمام (موجودی ۵ یا کمتر)</p>
                <div className="max-h-36 space-y-1.5 overflow-y-auto">
                  {s.lowStockProducts.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{p.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{p.sku}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums",
                          p.stock <= 2
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-500/15 text-amber-600"
                        )}
                      >
                        {formatPrice(p.stock)} عدد
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" asChild className="w-full rounded-lg text-primary">
                  <Link href="/admin/products">مشاهده همه محصولات</Link>
                </Button>
              </div>
            )}
            {s.lowStockProducts.length === 0 && (
              <p className="border-t pt-3 text-center text-xs text-muted-foreground">موردی رو به اتمام وجود ندارد</p>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">پرفروش‌ترین محصولات</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {data.topProducts.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">محصولی به فروش نرسیده است</p>
            )}
            {data.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 rounded-lg border p-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-black text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <AdminThumb src={p.mainImage} alt={p.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{p.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {p.category && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        {p.category}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatPrice(p.price)} تومان
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-emerald-600 tabular-nums">
                  {formatPrice(p.soldCount)} فروش
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">آخرین تراکنش‌های درگاه</CardTitle>
            <Button variant="ghost" size="sm" asChild className="rounded-lg text-primary">
              <Link href="/admin/payments">مشاهده همه</Link>
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {data.recentPayments.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">تراکنشی ثبت نشده است</p>
            )}
            {data.recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold" dir="ltr">{p.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                </div>
                <span className="text-xs font-bold tabular-nums">
                  {formatPrice(p.amount / 10)} تومان
                </span>
                <GatewayPayBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">آخرین پیام‌ها</CardTitle>
            <Button variant="ghost" size="sm" asChild className="rounded-lg text-primary">
              <Link href="/admin/messages" className="flex items-center gap-1.5">
                مشاهده همه
                {s.unreadMessages > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-black leading-4 text-white tabular-nums">
                    {s.unreadMessages.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {data.recentMessages.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">پیام جدیدی دریافت نشده است</p>
            )}
            {data.recentMessages.map((m) => (
              <Link
                key={m.id}
                href="/admin/messages"
                className="flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{m.subject}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.name}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                  {timeAgo(m.createdAt, tick)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

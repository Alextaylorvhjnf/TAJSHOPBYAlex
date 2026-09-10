"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Ban,
  ChevronLeft,
  ListTodo,
  Mail,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminThumb,
  CountUp,
  EmptyState,
  GatewayPayBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import {
  formatDateTime,
  formatPrice,
  ORDER_STATUS_FA,
  PAYMENT_STATUS_FA,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   v32 DASHBOARD CLIENT (Task 13-b) — Peoplexio + Finnova reference
   redesign. Every number is REAL (TanStack Query → /api/admin/stats);
   every label is Persian and every number renders in fa-IR digits.
   Entrance animations use framer-motion and respect the reduced-motion
   preference (no WebGL anywhere).
   ═══════════════════════════════════════════════════════════════════ */

/** dismissal persists until the NEXT app version (key embeds 26.0.0) */
const WELCOME_DISMISS_KEY = "taj-admin-welcome-dismissed-26.0.0";

interface OrderItemDTO {
  name: string;
  sku: string;
  image: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface RecentOrderDTO {
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
  subtotal: number;
  shipping: number;
  discount: number;
  city: string;
  province: string;
  items: OrderItemDTO[];
}

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
  recentOrders: RecentOrderDTO[];
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
const FALLBACK_CHART = ["#7C3AED", "#A78BFA", "#10B981", "#EC4899", "#F59E0B"];

/** reads chart tokens from CSS vars — re-reads when the storefront theme,
 *  the admin light/dark mode OR the v32 accent ([data-admin-accent]) changes */
function useChartColors(): string[] {
  const [colors, setColors] = useState<string[]>(FALLBACK_CHART);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next = CHART_VARS.map((v, i) => cs.getPropertyValue(v).trim() || FALLBACK_CHART[i]);
      setColors(next);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-admin-theme", "data-admin-accent"],
    });
    return () => obs.disconnect();
  }, []);
  return colors;
}

/* ── small Persian helpers ───────────────────────────────────────── */

function faDate(d: string) {
  return new Date(d).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

function compactFa(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}K`;
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

interface Trend {
  pct: number;
  dir: "up" | "down";
}

/** compares the LAST half of the loaded range against the PREVIOUS half —
 *  an honest «نسبت به دورهٔ قبل» with no synthetic data. */
function periodTrend(series: number[]): Trend | null {
  const n = series.length;
  if (n < 8) return null;
  const half = Math.floor(n / 2);
  const recent = series.slice(half).reduce((a, b) => a + b, 0);
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  if (prev === 0) return recent > 0 ? { pct: 100, dir: "up" } : null;
  const pct = Math.round(((recent - prev) / prev) * 100);
  if (pct === 0) return null;
  return { pct, dir: pct > 0 ? "up" : "down" };
}

function PriceCountUp({ value }: { value: number }) {
  return (
    <>
      <CountUp value={value} format={formatPrice} /> تومان
    </>
  );
}

/* ── framer-motion entrance wrapper (reduced-motion aware) ───────── */

function FadeIn({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── recharts mini sparkline (accent gradient, unique def id) ────── */

function Sparkline({ data, color, ariaLabel }: { data: number[]; color: string; ariaLabel: string }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (data.length < 2) return null;
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div dir="ltr" className="h-12 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark${gid})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── KPI stat card (Finnova-style: icon chip + big value + trend +
     real sparkline; surface from .av32-kpi in admin-v32.css) ─────── */

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  sub,
  spark,
  sparkColor,
  sparkLabel,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof TrendingUp;
  trend?: Trend | null;
  sub?: string;
  spark?: number[];
  sparkColor?: string;
  sparkLabel?: string;
}) {
  const TrendIcon = trend?.dir === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="av32-kpi relative flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-1.5 text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span className="av32-kpi-chip grid shrink-0 place-items-center">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2.5 truncate text-[26px] font-bold leading-9 tabular-nums">{value}</p>
      <p className="mt-1 flex min-h-[26px] flex-wrap items-center gap-1.5">
        {trend ? (
          <>
            <span
              className={cn("zy-trend", trend.dir === "up" ? "zy-trend-up" : "zy-trend-down")}
              dir="ltr"
            >
              <TrendIcon className="h-3.5 w-3.5" strokeWidth={2} />
              {Math.abs(trend.pct).toLocaleString("fa-IR")}%
            </span>
            <span className="text-xs text-muted-foreground">نسبت به دورهٔ قبل</span>
          </>
        ) : (
          sub && <span className="text-xs text-muted-foreground">{sub}</span>
        )}
      </p>
      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Sparkline data={spark} color={sparkColor ?? "#7C3AED"} ariaLabel={sparkLabel ?? "روند اخیر"} />
        </div>
      )}
    </div>
  );
}

/* ── welcome banner (gradient + glow blobs + dismissable) ────────── */

/** dismissal lives in localStorage and is read via useSyncExternalStore —
 *  hydration-safe (server snapshot = visible) with no setState-in-effect. */
function useWelcomeDismissed(): [boolean, () => void] {
  const dismissed = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => {
      try {
        return localStorage.getItem(WELCOME_DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );
  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(WELCOME_DISMISS_KEY, "1");
    } catch {
      /* private mode — hides for this session via the state below */
    }
    window.dispatchEvent(new Event("storage")); // re-render subscribers
  }, []);
  return [dismissed, dismiss];
}

function WelcomeBanner({ storeName, firstName }: { storeName: string; firstName: string | null }) {
  const [dismissed, dismiss] = useWelcomeDismissed();
  // computed once; suppressHydrationWarning covers the server/client
  // timezone difference on this single decorative chip
  const [today] = useState(() =>
    new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" })
  );
  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="av32-welcome mb-6 flex flex-wrap items-center justify-between gap-4 p-6 md:p-7"
        >
          {/* decorative glow blobs */}
          <span aria-hidden className="pointer-events-none absolute -top-16 -start-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 -end-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          <div className="relative min-w-0">
            <p className="text-2xl font-black leading-relaxed md:text-[28px]">
              سلام {firstName || storeName} 👋
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white/90 md:text-[15px]">
              به پنل مدیریت {storeName} خوش آمدید
            </p>
            <p className="mt-1 text-xs text-white/70">نمایش کلی و لحظه‌ای عملکرد فروشگاه</p>
          </div>

          <div className="relative flex items-center gap-3">
            <span
              suppressHydrationWarning
              className="av32-welcome-glass hidden rounded-full px-4 py-2 text-[12px] font-bold text-white/90 sm:inline-flex"
            >
              {today}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="بستن خوش‌آمدگویی (تا نسخهٔ بعدی نمایش داده نمی‌شود)"
              title="بستن (تا نسخهٔ بعدی نمایش داده نمی‌شود)"
              className="av32-welcome-glass grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/25 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Finnova split panel: dark list (right) + glass detail (left) ── */

const ORDER_TABS = [
  { id: "all", label: "همه" },
  { id: "open", label: "در انتظار" },
  { id: "paid", label: "پرداخت‌شده" },
] as const;

type OrderFilter = (typeof ORDER_TABS)[number]["id"];

const isOpenOrder = (o: RecentOrderDTO) =>
  o.paymentStatus !== "PAID" || o.status === "PENDING_PAYMENT" || o.status === "PROCESSING";

function RecentOrdersSplit({ orders }: { orders: RecentOrderDTO[] }) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listOrders = useMemo(
    () =>
      filter === "all"
        ? orders
        : filter === "open"
          ? orders.filter(isOpenOrder)
          : orders.filter((o) => o.paymentStatus === "PAID"),
    [orders, filter]
  );

  // keep a valid selection as the filter/data changes
  const selected = useMemo(() => {
    const found = listOrders.find((o) => o.id === selectedId);
    return found ?? listOrders[0] ?? null;
  }, [listOrders, selectedId]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* RIGHT (first in RTL DOM): the dark «سفارش‌های اخیر» list */}
      <div className="av32-panel flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">سفارش‌های اخیر</p>
            <p className="mt-0.5 text-[11px] text-[var(--av-panel-dark-muted,#A5A3C8)]">
              {listOrders.length.toLocaleString("fa-IR")} سفارش — برای جزئیات انتخاب کنید
            </p>
          </div>
          <div className="flex items-center gap-1" role="tablist" aria-label="فیلتر سفارش‌ها">
            {ORDER_TABS.map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                    active
                      ? "bg-white text-[var(--av-panel-dark,#1E1B4B)]"
                      : "text-[var(--av-panel-dark-muted,#A5A3C8)] hover:bg-white/10 hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[420px] min-h-[220px] flex-1 overflow-y-auto p-2">
          {listOrders.length === 0 ? (
            <p className="px-3 py-10 text-center text-xs text-[var(--av-panel-dark-muted,#A5A3C8)]">
              سفارشی در این دسته نیست
            </p>
          ) : (
            listOrders.map((o) => {
              const initials = o.customer.trim().slice(0, 1) || "؟";
              const active = selected?.id === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  data-selected={active || undefined}
                  aria-pressed={active}
                  className="av32-panel-row rounded-xl"
                >
                  <span className="av32-panel-avatar" aria-hidden>
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-mono text-xs font-bold" dir="ltr">
                        {o.orderNumber}
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </span>
                    <span className="mt-1 block truncate text-[11px]">
                      {o.customer} — {o.itemCount.toLocaleString("fa-IR")} قلم
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-xs font-bold tabular-nums text-white">
                      {formatPrice(o.total)}
                    </span>
                    <span className="block text-[10px] tabular-nums">
                      تومان
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-white/10 p-2.5">
          <Link
            href="/admin/orders"
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold text-[var(--av-panel-dark-muted,#A5A3C8)] transition-colors hover:bg-white/10 hover:text-white"
          >
            مشاهده همه سفارش‌ها
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* LEFT (second in RTL DOM): glass/gradient detail card */}
      <div className="av32-glass min-w-0 p-5 md:p-6">
        {!selected ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <p className="text-sm text-white/75">سفارشی برای نمایش انتخاب نشده است</p>
          </div>
        ) : (
          <div className="relative flex h-full min-h-[280px] flex-col">
            {/* header: number + badges + customer */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-lg font-black text-white" dir="ltr">
                  # {selected.orderNumber}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="av32-glass-chip px-2.5 py-1 text-[10.5px] font-bold text-white">
                    {ORDER_STATUS_FA[selected.status] ?? selected.status}
                  </span>
                  <span className="av32-glass-chip px-2.5 py-1 text-[10.5px] font-bold text-white">
                    {PAYMENT_STATUS_FA[selected.paymentStatus] ?? selected.paymentStatus}
                  </span>
                </p>
              </div>
              <div className="text-end">
                <p className="max-w-[220px] truncate text-sm font-bold text-white">{selected.customer}</p>
                <p className="mt-0.5 text-[11px] text-white/70">{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>

            {/* line items — glass panes */}
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {selected.items.slice(0, 6).map((it, i) => (
                <div key={`${it.sku}-${i}`} className="av32-glass-pane flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
                    <Package className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-white">{it.name}</span>
                    <span className="mt-0.5 block text-[10.5px] tabular-nums text-white/75">
                      {it.quantity.toLocaleString("fa-IR")} × {formatPrice(it.unitPrice)}
                      {it.color ? ` — ${it.color}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-white">
                    {formatPrice(it.total)}
                  </span>
                </div>
              ))}
              {selected.items.length === 0 && (
                <p className="col-span-2 rounded-xl border border-dashed border-white/25 p-4 text-center text-xs text-white/70">
                  ردیفی برای این سفارش ثبت نشده است
                </p>
              )}
            </div>

            {/* totals */}
            <div className="mt-4 space-y-2 rounded-xl border border-white/15 bg-white/10 p-4 text-xs">
              <div className="flex items-center justify-between text-white/80">
                <span>جمع اقلام</span>
                <span className="tabular-nums">{formatPrice(selected.subtotal)} تومان</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span>هزینهٔ ارسال</span>
                <span className="tabular-nums">{formatPrice(selected.shipping)} تومان</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex items-center justify-between text-white/80">
                  <span>تخفیف</span>
                  <span className="tabular-nums">{formatPrice(selected.discount)} تومان</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/15 pt-2.5">
                <span className="font-bold text-white">مبلغ نهایی</span>
                <span className="text-base font-black tabular-nums text-white">
                  {formatPrice(selected.total)} تومان
                </span>
              </div>
            </div>

            {/* footer actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-white/70">
                {selected.province} — {selected.city}
              </p>
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-white px-4 text-[12.5px] font-bold text-[#1E1B4B] hover:bg-white/90"
              >
                <Link href={`/admin/orders/${selected.id}`}>
                  مشاهده سفارش
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── weekly buckets from a 90-day daily series ───────────────────── */

function weeklySeries(salesByDay: { date: string; count: number; total: number }[]) {
  const weeks: { start: string; label: string; count: number; total: number }[] = [];
  const arr = [...salesByDay];
  while (arr.length > 0 && weeks.length < 8) {
    const chunk = arr.length > 7 ? arr.splice(arr.length - 7, 7) : arr.splice(0, arr.length);
    weeks.unshift({
      start: chunk[0].date,
      label: faDate(chunk[0].date),
      count: chunk.reduce((s, d) => s + d.count, 0),
      total: chunk.reduce((s, d) => s + d.total, 0),
    });
  }
  return weeks;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function DashboardV32({
  storeName,
  firstName,
}: {
  storeName: string;
  firstName: string | null;
}) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [tick, setTick] = useState(0);
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

  // dedicated 90-day series for the weekly bar chart («سفارش‌های هفتگی»)
  const { data: weeklyData } = useQuery({
    queryKey: ["admin", "stats", 90, "weekly"],
    queryFn: () => apiFetch<StatsResponse>("/api/admin/stats?days=90"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });

  const pieColors = useMemo(() => [...chartColors, ...chartColors].slice(0, 8), [chartColors]);

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
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const s = data.stats;
  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? "۳۰ روز";
  const byDay = data.chart.salesByDay;

  // KPI series (REAL daily numbers; sparklines take the last 12 days)
  const totals12 = byDay.slice(-12).map((d) => d.total);
  const counts12 = byDay.slice(-12).map((d) => d.count);
  const customers12 = byDay.slice(-12).map((d) => d.customers);
  const salesTrend = periodTrend(byDay.map((d) => d.total));
  const ordersTrend = periodTrend(byDay.map((d) => d.count));
  const customersTrend = periodTrend(byDay.map((d) => d.customers));

  const pieData = data.chart.statusCounts
    .filter((c) => c._count > 0)
    .map((c) => ({ name: ORDER_STATUS_FA[c.status] ?? c.status, value: c._count, key: c.status }));

  const weeks = weeklySeries(weeklyData?.chart.salesByDay ?? []);
  const hasSales = byDay.some((d) => d.total > 0 || d.count > 0);
  const hasWeekly = weeks.some((w) => w.count > 0);

  // store-health ratios for the progress-bar card
  const healthyStock = Math.max(0, s.totalProducts - s.lowStockProducts.length - s.outOfStock);
  const stockPct = s.totalProducts ? (healthyStock / s.totalProducts) * 100 : 0;
  const lowPct = s.totalProducts ? (s.lowStockProducts.length / s.totalProducts) * 100 : 0;

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: 12,
  };

  return (
    <div className="space-y-6">
      {/* welcome banner — dismissable until the next app version */}
      <WelcomeBanner storeName={storeName} firstName={firstName} />

      {/* header row — segmented range control + live status */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div className="zy-segment" role="tablist" aria-label="بازهٔ زمانی نمودارها">
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
      </FadeIn>

      {/* ═ 4 KPI stat cards — trend arrows + real sparklines ═ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FadeIn delay={0.04}>
          <KpiCard
            label="فروش کل (پرداخت‌شده)"
            value={<PriceCountUp value={s.totalSales} />}
            icon={BadgeDollarSign}
            trend={salesTrend}
            sub={`${formatPrice(s.totalPaidOrders)} سفارش پرداخت‌شده`}
            spark={totals12}
            sparkColor={chartColors[0]}
            sparkLabel="فروش روزانهٔ ۱۲ روز اخیر"
          />
        </FadeIn>
        <FadeIn delay={0.08}>
          <KpiCard
            label="سفارش‌ها"
            value={<CountUp value={s.totalOrders} />}
            icon={ShoppingBag}
            trend={ordersTrend}
            sub={`${formatPrice(s.paidOrders)} پرداخت‌شده • ${formatPrice(s.pendingOrders)} در انتظار`}
            spark={counts12}
            sparkColor={chartColors[1]}
            sparkLabel="تعداد سفارش ۱۲ روز اخیر"
          />
        </FadeIn>
        <FadeIn delay={0.12}>
          <KpiCard
            label="مشتریان جدید (۳۰ روز)"
            value={<CountUp value={s.newCustomers30} />}
            icon={Users}
            trend={customersTrend}
            sub={`${formatPrice(s.totalUsers)} کاربر ثبت‌شده`}
            spark={customers12}
            sparkColor={chartColors[3]}
            sparkLabel="ثبت‌نام روزانهٔ ۱۲ روز اخیر"
          />
        </FadeIn>
        <FadeIn delay={0.16}>
          <KpiCard
            label="سفارش‌های پرداخت‌شده"
            value={<CountUp value={s.paidOrders} />}
            icon={PackageCheck}
            trend={periodTrend(byDay.map((d) => d.count))}
            sub={`${formatPrice(s.pendingOrders)} در انتظار پرداخت`}
            spark={counts12}
            sparkColor={chartColors[4]}
            sparkLabel="سفارش‌های پرداخت‌شدهٔ ۱۲ روز اخیر"
          />
        </FadeIn>
      </div>

      {/* ═ charts row: area «فروش N روز اخیر» + donut «سهم وضعیت» ═ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn delay={0.1} className="min-w-0 lg:col-span-2">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <TrendingUp className="h-4 w-4 text-primary" />
                فروش {rangeLabel} اخیر
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
                    <AreaChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashSalesArea32" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.45} />
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
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={chartColors[0]}
                        strokeWidth={2.5}
                        fill="url(#dashSalesArea32)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.14} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">سهم وضعیت سفارش‌ها</CardTitle>
              <p className="text-xs text-muted-foreground">توزیع سفارش‌ها بر اساس وضعیت</p>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-xs text-muted-foreground">سفارشی ثبت نشده است</p>
                </div>
              ) : (
                <>
                  <div className="relative h-56 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={entry.key} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | string, name: string) => [
                            `${Number(value).toLocaleString("fa-IR")} سفارش`,
                            name,
                          ]}
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-black tabular-nums">{formatPrice(s.totalOrders)}</p>
                      <p className="text-[10px] text-muted-foreground">کل سفارش‌ها</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pieData.map((p, i) => (
                      <span key={p.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                        {p.name}: {p.value.toLocaleString("fa-IR")}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* ═ Finnova split panel: dark recent-orders list (right) +
         glass/gradient detail card (left) ═ */}
      <FadeIn delay={0.18}>
        <RecentOrdersSplit orders={data.recentOrders} />
      </FadeIn>

      {/* ═ second chart row: weekly orders bar + customers line + category ═ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn delay={0.1} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">سفارش‌های هفتگی</CardTitle>
              <p className="text-xs text-muted-foreground">هفته‌های ۹۰ روز اخیر — شروع هفته</p>
            </CardHeader>
            <CardContent>
              {!hasWeekly ? (
                <div className="flex h-56 items-center justify-center">
                  <p className="text-xs text-muted-foreground">سفارشی در این بازه ثبت نشده است</p>
                </div>
              ) : (
                <div className="h-56 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashWeeklyBar32" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors[1]} stopOpacity={1} />
                          <stop offset="100%" stopColor={chartColors[1]} stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
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
                        labelFormatter={(l: string) => `هفتهٔ ${l}`}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="count" fill="url(#dashWeeklyBar32)" radius={[8, 8, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.14} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">رشد مشتریان</CardTitle>
              <p className="text-xs text-muted-foreground">ثبت‌نام روزانه در {rangeLabel} گذشته</p>
            </CardHeader>
            <CardContent>
              {!byDay.some((d) => d.customers > 0) ? (
                <div className="flex h-56 items-center justify-center">
                  <p className="text-xs text-muted-foreground">مشتری جدیدی در این بازه ثبت‌نام نکرده است</p>
                </div>
              ) : (
                <div className="h-56 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        </FadeIn>

        <FadeIn delay={0.18} className="min-w-0">
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
                        <linearGradient id="dashCategoryBar32" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={chartColors[3]} stopOpacity={0.4} />
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
                      <Bar dataKey="revenue" fill="url(#dashCategoryBar32)" radius={8} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* ═ operational row: v35 RESPONSIVE — 2×2 at ≥lg (bigger, readable
          cards — the 4-column xl row crammed images/text into each other);
          each card gets wider rows, larger thumbnails and wrapped meta. ═ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* محصولات پرفروش */}
        <FadeIn delay={0.08} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold">محصولات پرفروش</CardTitle>
              <Button variant="ghost" size="sm" asChild className="rounded-lg text-primary hover:text-primary">
                <Link href="/admin/products">مشاهده همه</Link>
              </Button>
            </CardHeader>
            <CardContent className="max-h-[28rem] space-y-2.5 overflow-y-auto">
              {data.topProducts.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">محصولی به فروش نرسیده است</p>
              )}
              {data.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="av32-rank shrink-0" aria-hidden>
                    {(i + 1).toLocaleString("fa-IR")}
                  </span>
                  <AdminThumb src={p.mainImage} alt={p.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-bold leading-5">{p.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.category && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {p.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatPrice(p.price)} تومان
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 tabular-nums">
                    {formatPrice(p.soldCount)} فروش
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        {/* سلامت فروشگاه */}
        <FadeIn delay={0.12} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Activity className="h-4 w-4 text-primary" />
                سلامت فروشگاه
              </CardTitle>
              <p className="text-xs text-muted-foreground">نمای کلی وضعیت سفارش‌ها و انبار</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <HealthBarRow
                label="سفارش‌های پرداخت‌شده"
                value={`${formatPrice(s.paidOrders)} از ${formatPrice(s.totalOrders)}`}
                pct={s.totalOrders ? (s.paidOrders / s.totalOrders) * 100 : 0}
                color={chartColors[1]}
              />
              <HealthBarRow
                label="موجودی سالم انبار"
                value={`${formatPrice(healthyStock)} از ${formatPrice(s.totalProducts)}`}
                pct={stockPct}
                color={chartColors[0]}
              />
              <HealthBarRow
                label="اقلام رو به اتمام"
                value={`${formatPrice(s.lowStockProducts.length)} کالا`}
                pct={lowPct}
                color={chartColors[2]}
              />
              {s.lowStockProducts.length > 0 && (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-[10px] font-bold text-muted-foreground">کالاهای رو به اتمام (موجودی ۵ یا کمتر)</p>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto">
                    {s.lowStockProducts.slice(0, 8).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-bold leading-5">{p.name}</p>
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
                <div className="grid grid-cols-2 gap-2 border-t pt-3">
                  <span className="flex items-center gap-1.5 rounded-lg border p-2 text-[11px] font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {formatPrice(s.lowStockProducts.length)} رو به اتمام
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg border p-2 text-[11px] font-bold">
                    <Ban className="h-3.5 w-3.5 text-destructive" />
                    {formatPrice(s.outOfStock)} ناموجود
                  </span>
                  <span className="col-span-2 flex items-center gap-1.5 rounded-lg border p-2 text-[11px] font-bold">
                    <ListTodo className="h-3.5 w-3.5 text-primary" />
                    {formatPrice(s.pendingActions)} اقدام در انتظار
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* آخرین تراکنش‌ها */}
        <FadeIn delay={0.16} className="min-w-0">
          <Card className="min-w-0">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold">آخرین تراکنش‌های درگاه</CardTitle>
              <Button variant="ghost" size="sm" asChild className="rounded-lg text-primary">
                <Link href="/admin/payments">مشاهده همه</Link>
              </Button>
            </CardHeader>
            <CardContent className="max-h-[28rem] space-y-2.5 overflow-y-auto">
              {data.recentPayments.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">تراکنشی ثبت نشده است</p>
              )}
              {data.recentPayments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border p-3">
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
        </FadeIn>

        {/* آخرین پیام‌ها */}
        <FadeIn delay={0.2} className="min-w-0">
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
            <CardContent className="max-h-[28rem] space-y-2.5 overflow-y-auto">
              {data.recentMessages.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">پیام جدیدی دریافت نشده است</p>
              )}
              {data.recentMessages.map((m) => (
                <Link
                  key={m.id}
                  href="/admin/messages"
                  className="flex items-start gap-2.5 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold leading-5">{m.subject}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.name}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                    {timeAgo(m.createdAt, tick)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

/* ── slim rounded progress bar (Peoplexio progress-stat style) ───── */

function HealthBarRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
        <span className="text-[11px] font-black tabular-nums">{value}</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundImage: `linear-gradient(90deg, ${color}B3, ${color})`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight, Inbox, type LucideIcon } from "lucide-react";
import {
  formatPrice,
  ORDER_STATUS_FA,
  PAYMENT_STATUS_FA,
  ROLE_FA,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   v23 — ZYWRA route registry.
   The topbar (admin-shell) shows the ACTIVE route's title + subtitle;
   these maps hold the exact titles every panel page passes to
   AdminPageHeader, so the page-level header can deduplicate itself
   against the topbar and render its actions row only.
   ═══════════════════════════════════════════════════════════════ */

export const ADMIN_ROUTE_TITLES: Record<string, string> = {
  "/admin": "داشبورد",
  "/admin/products": "محصولات",
  "/admin/categories": "دسته‌بندی‌ها",
  "/admin/brands": "برندها",
  "/admin/orders": "سفارش‌ها",
  "/admin/payments": "پرداخت‌ها",
  "/admin/coupons": "کدهای تخفیف",
  "/admin/delivery": "روش‌های ارسال",
  "/admin/users": "کاربران",
  "/admin/reviews": "دیدگاه‌ها",
  "/admin/sliders": "اسلایدر صفحه اصلی",
  "/admin/stories": "استوری‌ها",
  "/admin/showcases": "شوکیس‌های تبلیغاتی",
  "/admin/pages": "صفحات محتوایی",
  "/admin/tickets": "تیکت‌های پشتیبانی",
  "/admin/messages": "پیام‌های مشتریان",
  "/admin/appearance": "تغییر قالب فروشگاه",
  "/admin/settings": "تنظیمات",
  "/admin/managers": "مدیران",
  "/admin/logs": "گزارش فعالیت مدیران",
  "/admin/account": "حساب من",
};

export const ADMIN_ROUTE_DESCS: Record<string, string> = {
  "/admin": "نمای کلی و لحظه‌ای عملکرد فروشگاه",
  "/admin/products": "مدیریت کاتالوگ، قیمت‌ها و موجودی محصولات",
  "/admin/categories": "ساختار دسته‌بندی محصولات فروشگاه",
  "/admin/brands": "برندهای همکار و لوگوی آن‌ها",
  "/admin/orders": "پیگیری، پردازش و ارسال سفارش‌ها",
  "/admin/payments": "تراکنش‌های درگاه و رسیدهای کارت به کارت",
  "/admin/coupons": "کدهای تخفیف و کمپین‌های فروش",
  "/admin/delivery": "روش‌های ارسال و هزینه‌های آن",
  "/admin/users": "کاربران، نقش‌ها و سطح دسترسی",
  "/admin/reviews": "دیدگاه‌های مشتریان و تأیید آن‌ها",
  "/admin/sliders": "اسلایدرها و بنرهای صفحه اصلی",
  "/admin/stories": "استوری‌های تصویری فروشگاه",
  "/admin/showcases": "شوکیس‌های ویژه معرفی محصولات",
  "/admin/pages": "صفحات محتوایی و راهنمای فروشگاه",
  "/admin/tickets": "تیکت‌های پشتیبانی مشتریان",
  "/admin/messages": "پیام‌های دریافتی از فرم تماس",
  "/admin/appearance": "انتخاب قالب ظاهری فروشگاه",
  "/admin/settings": "تنظیمات فروشگاه، پرداخت و پشتیبانی",
  "/admin/managers": "افزودن مدیران و تعیین سطوح دسترسی",
  "/admin/logs": "گزارش فعالیت‌های مدیران و سیستم",
  "/admin/account": "اطلاعات حساب و امنیت ورود شما",
};

export interface AdminRouteMatch {
  href: string;
  title: string;
}

/** Resolves a pathname to its canonical admin route (exact match
 *  first, then longest prefix — /admin/orders/x → /admin/orders). */
export function matchAdminRoute(pathname: string): AdminRouteMatch | null {
  if (ADMIN_ROUTE_TITLES[pathname]) {
    return { href: pathname, title: ADMIN_ROUTE_TITLES[pathname] };
  }
  const keys = Object.keys(ADMIN_ROUTE_TITLES).sort((a, b) => b.length - a.length);
  for (const href of keys) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      return { href, title: ADMIN_ROUTE_TITLES[href] };
    }
  }
  return null;
}

// ── Page header (24px/700 title + 14px slate-500 subtitle per the
//    Zywra reference; dedupes itself against the shell topbar) ──
export function AdminPageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const route = matchAdminRoute(pathname);
  // the shell topbar already shows this exact route title + subtitle
  if (route && route.title === title) {
    if (!actions) return null;
    return <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>;
  }
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Stat card (12px radius, tinted icon chip, bold tabular value) ──
export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "gold" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    gold: "bg-primary/12 text-primary",
    success: "bg-emerald-500/12 text-emerald-600",
    warning: "bg-amber-500/15 text-amber-600",
    danger: "bg-destructive/12 text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tones[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-2.5 text-lg font-bold tabular-nums md:text-xl">
        {typeof value === "number" ? formatPrice(value) : value}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Skeletons ──
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
      <div className="flex justify-center">
        <Skeleton className="h-5 w-40" style={{ width: `${cols * 30}px` }} />
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

// ── Empty state ──
export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/60" />
      <p className="font-bold">{title}</p>
      {desc && <p className="max-w-sm text-xs text-muted-foreground">{desc}</p>}
      {action}
    </div>
  );
}

// ── Badges ──
const ORDER_STATUS_TONE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  PAID: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  PROCESSING: "bg-primary/15 text-primary border-primary/25",
  CONFIRMED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  READY_TO_SHIP: "bg-teal-500/15 text-teal-600 border-teal-500/25",
  SHIPPED: "bg-teal-500/15 text-teal-600 border-teal-500/25",
  DELIVERED: "bg-emerald-600/15 text-emerald-700 border-emerald-600/25",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  REFUNDED: "bg-destructive/15 text-destructive border-destructive/25",
};

const PAYMENT_STATUS_TONE: Record<string, string> = {
  UNPAID: "bg-muted text-muted-foreground border-border",
  VERIFYING: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  PAID: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/25",
  FAILED: "bg-destructive/15 text-destructive border-destructive/25",
  REFUNDED: "bg-destructive/15 text-destructive border-destructive/25",
};

function ToneBadge({ label, tone }: { label: string; tone?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-semibold", tone ?? "")}
    >
      {label}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <ToneBadge label={ORDER_STATUS_FA[status] ?? status} tone={ORDER_STATUS_TONE[status]} />;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <ToneBadge label={PAYMENT_STATUS_FA[status] ?? status} tone={PAYMENT_STATUS_TONE[status]} />;
}

export function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    PUBLISHED: "منتشر",
    ARCHIVED: "بایگانی",
  };
  const tone: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground border-border",
    PUBLISHED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    ARCHIVED: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  };
  return <ToneBadge label={map[status] ?? status} tone={tone[status]} />;
}

export function GatewayPayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "در انتظار",
    VERIFIED: "موفق",
    FAILED: "ناموفق",
    CANCELLED: "لغو شده",
  };
  const tone: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    VERIFIED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    FAILED: "bg-destructive/15 text-destructive border-destructive/25",
    CANCELLED: "bg-muted text-muted-foreground border-border",
  };
  return <ToneBadge label={map[status] ?? status} tone={tone[status]} />;
}

export function C2CStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "در انتظار بررسی",
    APPROVED: "تأیید شده",
    REJECTED: "رد شده",
  };
  const tone: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    APPROVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    REJECTED: "bg-destructive/15 text-destructive border-destructive/25",
  };
  return <ToneBadge label={map[status] ?? status} tone={tone[status]} />;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "در انتظار بررسی",
    APPROVED: "تأیید شده",
    REJECTED: "رد شده",
  };
  const tone: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    APPROVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    REJECTED: "bg-destructive/15 text-destructive border-destructive/25",
  };
  return <ToneBadge label={map[status] ?? status} tone={tone[status]} />;
}

export function RoleBadge({ role }: { role: string }) {
  const tone: Record<string, string> = {
    SUPER_ADMIN: "bg-primary/15 text-primary border-primary/25",
    ADMIN: "bg-primary/10 text-primary border-primary/20",
    SUPPORT: "bg-teal-500/15 text-teal-600 border-teal-500/25",
    ORDER_MANAGER: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    PRODUCT_MANAGER: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    CUSTOMER: "bg-muted text-muted-foreground border-border",
  };
  return <ToneBadge label={ROLE_FA[role] ?? role} tone={tone[role]} />;
}

// ── Log action badge (color by prefix) ──
export function LogActionBadge({ action }: { action: string }) {
  let tone = "bg-muted text-muted-foreground border-border";
  let prefix = "";
  if (action.startsWith("PRODUCT")) {
    tone = "bg-primary/15 text-primary border-primary/25";
    prefix = "محصول";
  } else if (action.startsWith("ORDER")) {
    tone = "bg-emerald-500/15 text-emerald-600 border-emerald-500/25";
    prefix = "سفارش";
  } else if (action.startsWith("C2C")) {
    tone = "bg-destructive/15 text-destructive border-destructive/25";
    prefix = "کارت به کارت";
  } else if (action.startsWith("SETTINGS")) {
    tone = "bg-amber-500/15 text-amber-600 border-amber-500/25";
    prefix = "تنظیمات";
  } else if (action.startsWith("LOGIN")) {
    tone = "bg-muted text-muted-foreground border-border";
    prefix = "ورود";
  } else if (action.startsWith("USER")) {
    tone = "bg-teal-500/15 text-teal-600 border-teal-500/25";
    prefix = "کاربر";
  } else if (action.startsWith("REVIEW")) {
    tone = "bg-amber-500/15 text-amber-700 border-amber-500/25";
    prefix = "دیدگاه";
  } else if (action.startsWith("AI")) {
    tone = "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25";
    prefix = "هوش مصنوعی";
  }
  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-semibold", tone)}>
      {prefix ? `${prefix} · ` : ""}
      <span dir="ltr" className="font-mono text-[10px]">{action}</span>
    </Badge>
  );
}

// ── Image thumbnail (safe for any host: unoptimized) ──
export function AdminThumb({
  src,
  alt,
  className,
  size = 40,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-md border bg-muted/50", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-[10px] text-muted-foreground">بدون عکس</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn("rounded-md border object-cover", className)}
    />
  );
}

// ── Pagination ──
export function AdminPagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total?: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const pageButtons: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i++) pageButtons.push(i);
  return (
    <Pagination className="mt-4">
      <PaginationContent className="gap-1">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onPage(page - 1);
            }}
            aria-disabled={page <= 1}
            className={cn("gap-1", page <= 1 && "pointer-events-none opacity-50")}
          >
            <span className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> قبلی
            </span>
          </PaginationPrevious>
        </PaginationItem>
        {pageButtons.map((p) => (
          <PaginationItem key={p}>
            <Button
              variant={p === page ? "default" : "outline"}
              size="icon"
              className={cn("h-8 w-8 rounded-[10px]", p === page && "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p.toLocaleString("fa-IR")}
            </Button>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < pages) onPage(page + 1);
            }}
            aria-disabled={page >= pages}
            className={cn("gap-1", page >= pages && "pointer-events-none opacity-50")}
          >
            <span className="flex items-center gap-1">
              بعدی <ChevronRight className="h-4 w-4" />
            </span>
          </PaginationNext>
        </PaginationItem>
        {total !== undefined && (
          <PaginationItem className="hidden text-xs text-muted-foreground sm:block">
            <span>مجموع: {total.toLocaleString("fa-IR")} مورد</span>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

// ── Table shell with mobile horizontal scroll ──
export function AdminTable({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {headers.map((h) => (
                <TableHead key={h} className="text-right text-xs font-medium whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
      {caption && <p className="border-t p-3 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

// ── Animated number counter (rAF, ease-out, respects reduced motion) ──
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const fmt = format ?? ((n: number) => n.toLocaleString("fa-IR"));
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DURATION = 600; // ms
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // reduced motion → jump straight to the final value on the first frame
      const t = reduced ? 1 : Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={cn("tabular-nums", className)}>{fmt(display)}</span>;
}

// ── Customer-message status badge ──
const MESSAGE_STATUS_FA: Record<string, string> = {
  NEW: "جدید",
  READ: "خوانده‌شده",
  REPLIED: "پاسخ داده شده",
  CLOSED: "بسته",
};

const MESSAGE_STATUS_TONE: Record<string, string> = {
  NEW: "bg-destructive/15 text-destructive border-destructive/25",
  READ: "bg-muted text-muted-foreground border-border",
  REPLIED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  CLOSED: "bg-muted/60 text-muted-foreground/80 border-border",
};

export function MessageStatusBadge({ status }: { status: string }) {
  return (
    <ToneBadge label={MESSAGE_STATUS_FA[status] ?? status} tone={MESSAGE_STATUS_TONE[status]} />
  );
}


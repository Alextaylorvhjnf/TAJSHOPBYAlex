"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell,
  CreditCard,
  ExternalLink,
  FileClock,
  FileText,
  FolderTree,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Package,
  Palette,
  PlayCircle,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Tag,
  Ticket,
  TicketCheck,
  Truck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { ROLE_FA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/components/admin/api-client";
import { useBranding } from "@/components/providers/branding-provider";
import { AdminThemeModeToggle } from "@/components/admin/admin-theme";
import { ADMIN_ROUTE_DESCS, matchAdminRoute } from "@/components/admin/ui-bits";

export interface AdminShellUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  /** v29: admin profile avatar (presets / upload / site logo) — rendered in
   *  the sidebar profile card; null = the initials fallback. */
  avatar?: string | null;
  /** v29.2: granular permission keys (parsed User.adminPermissions JSON).
   *  null/empty = the role's default access. Only staff roles use it —
   *  ADMIN/SUPER_ADMIN always see everything. */
  permissions?: string[] | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** v29.2: permission key gating this item for staff managers
   *  (undefined = always visible, e.g. dashboard + account). */
  perm?: string;
}

interface NavGroup {
  id: string;
  /** null = top-level item without a group header (e.g. dashboard) */
  label: string | null;
  items: NavItem[];
}

/* ── ZYWRA sidebar navigation (v23) ────────────────────────────────
   Reference: “Invoice Management SaaS Dashboard | Zywra Studio”.
   • desktop lg+ → fixed 260px sidebar on the START side (right in RTL)
   • md (768–1023) → same rail collapsed to 80px icons
   • below md     → hidden; the topbar hamburger opens the Sheet with
     the full grouped tree (same 20 v17 routes, all reachable).
   Look & feel (light/dark via --zy-* vars in admin-v20.css):
   11px slate-400 section labels, 44px/10px-radius items, active =
   indigo-50 bg + indigo-600 text + 3px START border + icon chip. */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "root",
    label: null,
    items: [{ href: "/admin", label: "داشبورد", icon: LayoutDashboard, exact: true }],
  },
  {
    id: "products",
    label: "محصولات",
    items: [
      { href: "/admin/products", label: "همه محصولات", icon: Package, perm: "products" },
      { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree, perm: "categories" },
      { href: "/admin/brands", label: "برندها", icon: Tag, perm: "brands" },
    ],
  },
  {
    id: "orders",
    label: "سفارش‌ها و پرداخت",
    items: [
      { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag, perm: "orders" },
      { href: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard, perm: "payments" },
      { href: "/admin/coupons", label: "کد تخفیف", icon: Ticket, perm: "coupons" },
      { href: "/admin/delivery", label: "روش‌های ارسال", icon: Truck, perm: "delivery" },
    ],
  },
  {
    id: "customers",
    label: "مشتریان",
    items: [
      { href: "/admin/users", label: "کاربران", icon: Users, perm: "users" },
      { href: "/admin/reviews", label: "دیدگاه‌ها", icon: MessageSquare, perm: "reviews" },
    ],
  },
  {
    id: "content",
    label: "محتوا",
    items: [
      { href: "/admin/sliders", label: "اسلایدرها", icon: Images, perm: "sliders" },
      { href: "/admin/stories", label: "استوری‌ها", icon: PlayCircle, perm: "stories" },
      { href: "/admin/showcases", label: "شوکیس‌ها", icon: LayoutTemplate, perm: "showcases" },
      { href: "/admin/pages", label: "صفحات", icon: FileText, perm: "pages" },
    ],
  },
  {
    id: "messages",
    label: "پیام‌ها و پشتیبانی",
    items: [
      { href: "/admin/tickets", label: "تیکت‌های پشتیبانی", icon: TicketCheck, perm: "tickets" },
      { href: "/admin/messages", label: "پیام‌های مشتریان", icon: MessagesSquare, perm: "messages" },
    ],
  },
  {
    id: "settings",
    label: "تنظیمات",
    items: [
      { href: "/admin/appearance", label: "تغییر قالب فروشگاه", icon: Palette, perm: "appearance" },
      { href: "/admin/settings", label: "تنظیمات", icon: Settings, perm: "settings" },
      // v29.2: staff-manager accounts + granular permissions (admin-only)
      { href: "/admin/managers", label: "مدیران", icon: UserCog, perm: "settings" },
      { href: "/admin/logs", label: "گزارش‌ها", icon: FileClock, perm: "logs" },
      { href: "/admin/account", label: "حساب من", icon: UserRound },
    ],
  },
];

/* ── v29.2 · client-side permission gate ───────────────────────────
   Deliberately a tiny local copy of the server-side rules in lib/auth.ts
   (ROLE_DEFAULT_PERMISSIONS / hasPermission). lib/auth imports
   next/headers cookies, so it can NEVER be imported from a client
   component — the duplication is intentional and self-contained. */
const ROLE_DEFAULT_PERMS: Record<string, string[]> = {
  PRODUCT_MANAGER: ["products", "categories", "brands", "reviews"],
  ORDER_MANAGER: ["orders", "payments", "coupons", "delivery"],
  SUPPORT: ["tickets", "messages", "reviews"],
};

function hasPanelAccess(user: AdminShellUser, perm?: string): boolean {
  if (!perm) return true; // dashboard + account are always visible
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  const list = user.permissions;
  if (list && list.length > 0) return list.includes(perm);
  return (ROLE_DEFAULT_PERMS[user.role] ?? []).includes(perm);
}

/** route-aware topbar CTA (reference: indigo-600 button, 10px radius) */
const ROUTE_CTAS: Record<string, { href: string; label: string }> = {
  "/admin": { href: "/admin/products/new", label: "محصول جدید" },
};

/** Live unread customer-messages badge (polls every 60s, shared query key) */
function useUnreadMessages() {
  const { data } = useQuery({
    queryKey: ["admin", "messages", "unread"],
    queryFn: () => apiFetch<{ count: number }>("/api/admin/messages?count=1"),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
  return data?.count ?? 0;
}

/** Live OPEN support-tickets badge (polls every 60s) */
function useOpenTickets() {
  const { data } = useQuery({
    queryKey: ["admin", "tickets", "unread"],
    queryFn: () => apiFetch<{ count: number }>("/api/admin/tickets?count=1"),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
  return data?.count ?? 0;
}

/* ── v31 · ADMIN NOTIFICATION BELL (Task 5-b) ──────────────────────────
   The topbar bell is now a Popover: it lists the logged-in admin's OWN
   notifications (/api/notifications/read, polled every 2 min) with an
   unread dot + Persian time-ago; clicking one marks it read and navigates
   to notification.link. The legacy ticket/message counters move into the
   popover footer (same pages as before) and the bell carries a numeric
   unread badge (or the old red dot when only tickets/messages are new).
   Deliberately surgical: only the bell cluster of the topbar changes. */

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

/** Persian relative time — «۳ دقیقه پیش» / «۲ روز پیش» / date fallback */
function faTimeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "همین حالا";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min.toLocaleString("fa-IR")} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr.toLocaleString("fa-IR")} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day.toLocaleString("fa-IR")} روز پیش`;
  return d.toLocaleDateString("fa-IR");
}

const NOTIF_TYPE_ICON: Record<string, typeof Bell> = {
  SYSTEM: RefreshCw,
  ORDER: ShoppingBag,
  PAYMENT: CreditCard,
};

/** the logged-in admin's own notifications (polls every 2 min, silent) */
function useAdminNotifications(): AdminNotification[] {
  const { data } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => apiFetch<{ notifications: AdminNotification[] }>("/api/notifications/read"),
    refetchInterval: 120_000,
    staleTime: 30_000,
    retry: false,
  });
  return data?.notifications ?? [];
}

function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useAdminNotifications();
  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
  const unreadMsgs = useUnreadMessages();
  const openTickets = useOpenTickets();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
  };

  const openNotification = async (n: AdminNotification) => {
    setOpen(false);
    if (!n.isRead) {
      try {
        await apiFetch("/api/notifications/read", {
          method: "POST",
          body: JSON.stringify({ id: n.id }),
        });
        refresh();
      } catch {
        /* marking read failed — still navigate */
      }
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read", { method: "POST", body: JSON.stringify({}) });
      refresh();
    } catch {
      /* silent */
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="اعلان‌ها و پیام‌ها"
          title="اعلان‌ها و پیام‌ها"
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {unreadNotifs > 0 ? (
            <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white tabular-nums ring-2 ring-card">
              {unreadNotifs > 99 ? "۹۹+" : unreadNotifs.toLocaleString("fa-IR")}
            </span>
          ) : unreadMsgs + openTickets > 0 ? (
            <span aria-hidden className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" dir="rtl" className="w-80 rounded-xl p-0">
        {/* header — count + mark-all-read */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="flex items-center gap-2 text-xs font-bold">
            اعلان‌ها
            {unreadNotifs > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] tabular-nums">
                {unreadNotifs.toLocaleString("fa-IR")}
              </Badge>
            )}
          </p>
          {unreadNotifs > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded text-[11px] font-medium text-primary hover:underline"
            >
              خواندن همه
            </button>
          )}
        </div>

        {/* the list — unread dot + title + message + time-ago; click = read + navigate */}
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              اعلان جدیدی ندارید
            </p>
          ) : (
            notifications.slice(0, 12).map((n) => {
              const Icon = NOTIF_TYPE_ICON[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void openNotification(n)}
                  className="flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2.5 text-right transition-colors last:border-0 hover:bg-muted/60"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {!n.isRead && (
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      )}
                      <span className={cn("truncate text-xs font-bold", !n.isRead && "text-foreground")}>
                        {n.title}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-5 text-muted-foreground">
                      {n.message}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground/80">
                      {faTimeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* footer — the legacy ticket/message counters stay one click away */}
        <div className="grid grid-cols-2 gap-1 border-t p-1.5">
          <Link
            href="/admin/messages"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessagesSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {unreadMsgs > 0 ? (
              <span className="text-foreground">{unreadMsgs.toLocaleString("fa-IR")} پیام خوانده‌نشده</span>
            ) : (
              <span>پیام‌های مشتریان</span>
            )}
          </Link>
          <Link
            href="/admin/tickets"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <TicketCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {openTickets > 0 ? (
              <span className="text-foreground">{openTickets.toLocaleString("fa-IR")} تیکت باز</span>
            ) : (
              <span>تیکت‌های پشتیبانی</span>
            )}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function isItemActive(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

/* ── sidebar nav tree — shared by the desktop rail and the mobile Sheet.
   labels="responsive": icons-only at md, full labels at lg (desktop rail).
   labels="always": full labels at every size (mobile Sheet). */
function SidebarNav({
  groups,
  pathname,
  labels,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  labels: "responsive" | "always";
  onNavigate?: () => void;
}) {
  const unread = useUnreadMessages();
  const openTickets = useOpenTickets();
  const responsive = labels === "responsive";

  return (
    <nav aria-label="ناوبری پنل مدیریت" className="flex flex-col gap-0.5 pb-2">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <div
              aria-hidden
              className={cn("mx-4 my-2 h-px bg-border", responsive && "md:block lg:hidden")}
            />
          )}
          {group.label !== null && (
            <p className={cn("zy-nav-label", responsive && "hidden lg:block")}>{group.label}</p>
          )}
          <div className="flex flex-col gap-0.5 px-2">
            {group.items.map((item) => {
              const active = isItemActive(pathname, item);
              const badge =
                item.href === "/admin/messages"
                  ? unread
                  : item.href === "/admin/tickets"
                    ? openTickets
                    : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "zy-nav-link relative flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium outline-none transition-colors",
                    responsive && "md:justify-center md:px-1 lg:justify-start lg:px-3"
                  )}
                >
                  <span className="zy-nav-icon">
                    <item.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      responsive && "hidden lg:block"
                    )}
                  >
                    {item.label}
                  </span>
                  {badge > 0 && (
                    <>
                      {/* rail-mode dot */}
                      {responsive && (
                        <span
                          aria-hidden
                          className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 md:block lg:hidden"
                        />
                      )}
                      <span
                        className={cn(
                          "rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white tabular-nums",
                          responsive ? "hidden lg:inline-flex" : "ms-auto inline-flex"
                        )}
                        aria-label={`${badge.toLocaleString("fa-IR")} مورد جدید`}
                      >
                        {badge.toLocaleString("fa-IR")}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ── bottom profile card (bg slate-50/slate-800, 12px radius, 36px
   avatar + 8px emerald status dot) opening the user dropdown ── */
function ProfileMenu({
  user,
  onLogout,
  loggingOut,
  compact,
}: {
  user: AdminShellUser;
  onLogout: () => void;
  loggingOut: boolean;
  compact?: boolean;
}) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر";
  const initials = name.slice(0, 1);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="منوی حساب کاربری"
          className={cn(
            "zy-profile flex w-full items-center gap-3 p-2.5 text-start outline-none",
            compact && "md:justify-center lg:justify-start"
          )}
        >
          <span className="relative shrink-0">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-xs font-bold text-white">
              {user.avatar ? (
                <img src={user.avatar} alt={`آواتار ${name}`} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span
              aria-hidden
              className="zy-avatar-dot absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-emerald-500"
            />
          </span>
          <span className={cn("min-w-0 flex-1", compact && "hidden lg:block")}>
            <span className="block truncate text-[13px] font-semibold">{name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {ROLE_FA[user.role] ?? user.role}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          <span className="block truncate font-bold text-foreground">{name}</span>
          {ROLE_FA[user.role] ?? user.role}
          <span className="block truncate font-mono text-[10px]" dir="ltr">
            {user.email ?? user.phone}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/account">
            <UserRound className="h-4 w-4 ml-2" />
            حساب من
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 ml-2" />
            مشاهده فروشگاه
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} disabled={loggingOut} className="text-destructive">
          <LogOut className="h-4 w-4 ml-2" />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── circular topbar icon button (36px, bg card, 1px border) ── */
function TopIconButton({
  href,
  onClick,
  label,
  dot,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className
  );
  const inner = (
    <>
      {children}
      {dot && (
        <span
          aria-hidden
          className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"
        />
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {inner}
    </button>
  );
}

/* ── brand mark: v27.1 — the admin panel now shows the SITE LOGO (the same
   uploaded logo + store name as the storefront, sourced from the branding
   context). Falls back to the gradient monogram tile when no logo is
   uploaded, so a fresh install still looks branded. ── */
function BrandMark({ compact = false }: { compact?: boolean }) {
  const branding = useBranding();
  const storeName = branding.storeName?.trim() || "تاج الکترونیکس";
  const storeNameEn = branding.storeNameEn?.trim() || "TAJ Electronics";
  const initial = storeName.slice(0, 1);
  return (
    <span className="flex shrink-0 items-center gap-3">
      {branding.logo ? (
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border bg-card shadow-sm">
          { }
          <img src={branding.logo} alt={`${storeName} logo`} className="h-full w-full object-cover" width={40} height={40} />
        </span>
      ) : (
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-lg font-black text-white shadow-lg shadow-indigo-500/25"
        >
          {initial}
        </span>
      )}
      <span className={cn("flex-col leading-tight", compact ? "hidden lg:flex" : "flex")}>
        <span className="max-w-[150px] truncate text-[15px] font-extrabold text-foreground">{storeName}</span>
        <span className={cn("text-[11px] font-medium text-muted-foreground", compact && "lg:hidden")}>
          {compact ? "پنل مدیریت" : "پنل مدیریت فروشگاه"}
        </span>
        <span className={cn("hidden text-[9px] font-medium tracking-[0.18em] text-muted-foreground/70", !compact && "sm:inline")} dir="ltr">
          {storeNameEn.toUpperCase()}
        </span>
      </span>
    </span>
  );
}

export function AdminShell({ user, children }: { user: AdminShellUser; children: ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* v29.2: sidebar sections this account may see (permission-filtered).
   * ADMIN/SUPER_ADMIN see everything; staff managers see only their
   * granted sections (or their role's defaults). */
  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasPanelAccess(user, i.perm)) }))
        .filter((g) => g.items.length > 0),
    [user]
  );

  /* v29.2: INSTANT avatar sync — the account page fires the
   * "taj:admin-avatar" CustomEvent right after a successful profile save,
   * so the sidebar picture updates immediately (no manual refresh).
   * router.refresh() still re-syncs via the user.avatar prop below. */
  const [liveAvatar, setLiveAvatar] = useState(user.avatar);
  useEffect(() => {
    const onAvatar = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar?: string | null }>).detail;
      setLiveAvatar(detail?.avatar ?? null);
    };
    window.addEventListener("taj:admin-avatar", onAvatar);
    return () => window.removeEventListener("taj:admin-avatar", onAvatar);
  }, []);
  useEffect(() => {
    setLiveAvatar(user.avatar);
  }, [user.avatar]);
  const liveUser = useMemo(() => ({ ...user, avatar: liveAvatar }), [user, liveAvatar]);

  // topbar title + subtitle from the shared route registry
  const route = matchAdminRoute(pathname);
  const title = route?.title ?? "پنل مدیریت";
  const desc =
    route?.href === "/admin"
      ? user.firstName?.trim()
        ? `سلام ${user.firstName.trim()} — ${ADMIN_ROUTE_DESCS["/admin"]}`
        : ADMIN_ROUTE_DESCS["/admin"]
      : (route && ADMIN_ROUTE_DESCS[route.href]) || "پنل مدیریت تاج الکترونیکس";
  const cta = ROUTE_CTAS[pathname];

  // every admin-page navigation opens at the very top of the page
  // (same fix as the storefront ScrollToTop — no smooth-scroll hijacking)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  // route change closes the mobile drawer
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* v31 · AUTO UPDATE POLL (Task 5-b) — calls /api/admin/update/poll once
   * ~20s after mount and then every 10 minutes while any admin page is
   * open. The endpoint itself throttles the real GitHub fetch to one per
   * 10 minutes and creates the admin notifications server-side, so this
   * fire-and-forget call merely WARMS that check; when it reports
   * hasUpdate the bell's notification list is refetched immediately.
   * Silent failures — polling must never block or disturb the UI. */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/update/poll");
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; hasUpdate?: boolean }
          | null;
        if (cancelled || !json?.ok || !json.hasUpdate) return;
        void queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      } catch {
        /* silent */
      }
    };
    const early = setTimeout(() => void poll(), 20_000);
    const interval = setInterval(() => void poll(), 10 * 60_000);
    return () => {
      cancelled = true;
      clearTimeout(early);
      clearInterval(interval);
    };
  }, [queryClient]);

  /* v26: REAL data refresh — the old router.refresh() only re-rendered
   *  server components and never re-ran the TanStack Query hooks every
   *  admin page uses, so the button looked dead. Now it invalidates the
   *  WHOLE query cache (every useQuery on the current page refetches its
   *  data from the backend APIs) plus router.refresh() for the server
   *  components, with a visible spinning state so the admin sees it work. */
  const refreshData = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries(); // refetch ALL active queries
      router.refresh(); // also refresh server-rendered data
    } finally {
      // keep the spinner visible for a beat so the click gives feedback
      setTimeout(() => setRefreshing(false), 450);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="admin-v20 flex min-h-screen bg-background text-foreground">
      {/* ═ ZYWRA sidebar — START side (right in RTL), 260px / 80px rail ═ */}
      <aside className="zy-sidebar hidden md:sticky md:top-0 md:flex md:h-screen md:w-20 md:shrink-0 md:flex-col lg:w-[260px]">
        {/* logo area — 72px */}
        <div className="flex h-[72px] shrink-0 items-center justify-center px-4 lg:justify-start lg:px-5">
          <Link
            href="/admin"
            aria-label="داشبورد پنل مدیریت"
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark compact />
          </Link>
        </div>

        {/* scrollable grouped nav */}
        <ScrollArea className="min-h-0 flex-1">
          <SidebarNav groups={visibleGroups} pathname={pathname} labels="responsive" />
        </ScrollArea>

        {/* bottom profile card */}
        <div className="shrink-0 p-3">
          <ProfileMenu user={liveUser} onLogout={logout} loggingOut={loggingOut} compact />
        </div>
      </aside>

      {/* ═ main column: 64px topbar + page content ═ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-topbar sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="باز کردن منو"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </SheetTrigger>

            {/* mobile drawer — full vertical nav (Zywra look) */}
            <SheetContent
              side="right"
              className="zy-sidebar flex w-[288px] flex-col gap-0 overflow-y-auto p-0"
            >
              <SheetTitle className="sr-only">منوی پنل مدیریت</SheetTitle>
              <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 px-4">
                <BrandMark />
                <AdminThemeModeToggle />
              </div>
              <ScrollArea className="min-h-0 flex-1 px-3">
                <SidebarNav
                  groups={visibleGroups}
                  pathname={pathname}
                  labels="always"
                  onNavigate={() => setMobileOpen(false)}
                />
              </ScrollArea>
              <div className="shrink-0 border-t border-border p-3">
                <ProfileMenu user={liveUser} onLogout={logout} loggingOut={loggingOut} />
              </div>
            </SheetContent>
          </Sheet>

          {/* page title (24px/700) + subtitle (14px slate-500) */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">{title}</h1>
            <p className="hidden truncate text-sm text-muted-foreground sm:block">{desc}</p>
          </div>

          {/* action cluster (end side): circular icon buttons, segmented
              mode toggle, palette picker + the indigo CTA */}
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <TopIconButton
              onClick={refreshData}
              label="به‌روزرسانی داده‌ها"
              className="hidden md:flex"
            >
              <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} strokeWidth={1.75} />
            </TopIconButton>
            {/* v31: the bell now opens the admin's own notifications Popover
                (ticket/message counters live in its footer — see the
                NotificationBell component above) */}
            <NotificationBell />
            <AdminThemeModeToggle />
            {/* v27.1: admin appearance is JUST light/dark now — the v17/v23
                multi-theme palette picker was removed per the new design */}
            {cta && (
              <Button
                asChild
                size="sm"
                className="zy-cta hidden h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-sm hover:bg-[var(--zy-primary-hover,var(--primary))] sm:inline-flex"
              >
                <Link href={cta.href}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  {cta.label}
                </Link>
              </Button>
            )}
          </div>
        </header>

        {/* page content — 24–32px padding on the flex-1 canvas */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 pb-16 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

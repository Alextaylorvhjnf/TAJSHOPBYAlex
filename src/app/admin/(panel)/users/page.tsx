"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Search, UserRound, Users } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type Paginated, type UserRow } from "@/components/admin/api-client";
import { formatDateTime, formatPrice, ROLE_FA } from "@/lib/format";

interface UsersResponse extends Paginated {
  users: UserRow[];
}

const ROLE_OPTIONS = ["CUSTOMER", "SUPPORT", "ORDER_MANAGER", "PRODUCT_MANAGER", "ADMIN", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // current admin — for permission-aware controls
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me"),
  });
  const currentRole = meData?.user?.role ?? "";
  const canManage = currentRole === "SUPER_ADMIN" || currentRole === "ADMIN";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users", { q: debouncedQ, role, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (role !== "all") params.set("role", role);
      if (page > 1) params.set("page", String(page));
      const s = params.toString();
      return apiFetch<UsersResponse>(`/api/admin/users${s ? `?${s}` : ""}`);
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<{ message?: string }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "کاربر به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کاربران"
        desc={`${data ? data.total.toLocaleString("fa-IR") : "…"} کاربر — نقش‌ها، دسترسی و وضعیت حساب‌ها`}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Label htmlFor="u-search" className="mb-1.5 block text-xs text-muted-foreground">جستجو</Label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="u-search" className="rounded-lg pr-9" placeholder="نام، ایمیل یا موبایل"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="w-44">
          <Label className="mb-1.5 block text-xs text-muted-foreground">نقش</Label>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_FA[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState title="خطا در دریافت کاربران" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : users.length === 0 ? (
        <EmptyState
          title="کاربری یافت نشد"
          desc="با تغییر فیلترها دوباره جستجو کنید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => { setSearch(""); setRole("all"); }}>
              <Users className="h-4 w-4" />
              پاک کردن فیلترها
            </Button>
          }
        />
      ) : (
        <AdminTable
          headers={["کاربر", "موبایل / ایمیل", "نقش", "سفارش‌ها", "مجموع خرید", "وضعیت", "تاریخ عضویت", ""]}
          caption={!canManage ? "تغییر نقش و وضعیت مسدودی فقط برای مدیر کل / مدیر فعال است" : undefined}
        >
          {users.map((u) => (
            <tr key={u.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${u.isBlocked ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/admin/users/${u.id}`} className="block max-w-[160px] truncate text-sm font-bold hover:text-primary">
                      {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "بی‌نام"}
                    </Link>
                    {u.isBlocked && (
                      <span className="text-[10px] font-bold text-destructive">حساب مسدود است</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-3">
                <p className="font-mono text-xs" dir="ltr">{u.phone ?? "—"}</p>
                <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{u.email ?? "—"}</p>
              </td>
              <td className="p-3">
                <Select
                  value={u.role}
                  onValueChange={(v) => patchMutation.mutate({ id: u.id, body: { role: v } })}
                  disabled={!canManage || patchMutation.isPending || u.role === "SUPER_ADMIN"}
                >
                  <SelectTrigger className="h-8 w-36 rounded-lg text-xs" aria-label={`نقش ${u.firstName ?? ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem
                        key={r}
                        value={r}
                        disabled={r === "SUPER_ADMIN" && currentRole !== "SUPER_ADMIN"}
                      >
                        {ROLE_FA[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3 text-xs tabular-nums">{formatPrice(u.orderCount)}</td>
              <td className="p-3 whitespace-nowrap text-xs tabular-nums">
                {u.totalSpent > 0 ? (
                  <span className="font-bold text-emerald-600">{formatPrice(u.totalSpent)} تومان</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!u.isBlocked}
                    onCheckedChange={(active) => patchMutation.mutate({ id: u.id, body: { isBlocked: !active } })}
                    disabled={!canManage || patchMutation.isPending || u.id === meData?.user?.id}
                    aria-label={`فعال بودن حساب ${u.firstName ?? ""}`}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {u.isBlocked ? "مسدود" : "فعال"}
                  </span>
                </div>
              </td>
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
              <td className="p-3">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="مشاهده جزئیات">
                  <Link href={`/admin/users/${u.id}`}>
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

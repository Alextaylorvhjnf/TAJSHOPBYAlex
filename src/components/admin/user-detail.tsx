"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, KeyRound, Loader2, Package, Save, Shuffle, Star, UserRound } from "lucide-react";
import {
  AdminTable,
  EmptyState,
  OrderStatusBadge,
  PaymentStatusBadge,
  RoleBadge,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { formatDateTime, formatPrice, ROLE_FA } from "@/lib/format";

interface UserDetailData {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isBlocked: boolean;
    createdAt: string;
    avatar: string | null;
    orders: {
      orderNumber: string;
      total: number;
      status: string;
      paymentStatus: string;
      createdAt: string;
    }[];
    reviews: {
      rating: number;
      title: string | null;
      status: string;
      createdAt: string;
    }[];
  };
}

const ROLE_OPTIONS = ["CUSTOMER", "SUPPORT", "ORDER_MANAGER", "PRODUCT_MANAGER", "ADMIN", "SUPER_ADMIN"];

export function UserDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("");
  const [blocked, setBlocked] = useState<boolean>(false);

  // Password reset dialog state
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => apiFetch<UserDetailData>(`/api/admin/users/${id}`),
  });

  const user = data?.user;
  // sync form fields when the loaded user changes (render-phase adjustment)
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (user && syncedId !== user.id) {
    setSyncedId(user.id);
    setRole(user.role);
    setBlocked(user.isBlocked);
  }

  const currentRole = meData?.user?.role ?? "";
  const canManage = currentRole === "SUPER_ADMIN" || currentRole === "ADMIN";
  const isSelf = meData?.user?.id === id;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role, isBlocked: blocked }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pw = "";
    const rnd = new Uint32Array(14);
    crypto.getRandomValues(rnd);
    for (let i = 0; i < 14; i++) pw += chars[rnd[i] % chars.length];
    setNewPw(pw);
    setNewPwConfirm(pw);
  };

  const resetPwMutation = useMutation({
    mutationFn: (pw: string) =>
      apiFetch<{ message?: string }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword: pw }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "رمز بازنشانی شد");
      setPwOpen(false);
      setNewPw("");
      setNewPwConfirm("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "بازنشانی ناموفق بود"),
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild className="rounded-lg">
          <Link href="/admin/users"><ArrowRight className="h-4 w-4" />بازگشت به کاربران</Link>
        </Button>
        <EmptyState title="کاربر پیدا نشد" desc={error instanceof Error ? error.message : undefined} />
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const paidTotal = user.orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-mr-2 rounded-lg text-muted-foreground">
            <Link href="/admin/users"><ArrowRight className="h-4 w-4" />بازگشت</Link>
          </Button>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-black md:text-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
              <UserRound className="h-5 w-5 text-primary" />
            </span>
            {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "بی‌نام"}
            <RoleBadge role={user.role} />
            {user.isBlocked && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive">مسدود</span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">عضویت: {formatDateTime(user.createdAt)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile + management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">اطلاعات و مدیریت حساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <InfoRow label="موبایل" value={user.phone ?? "—"} mono />
              <InfoRow label="ایمیل" value={user.email ?? "—"} mono />
              <InfoRow label="سفارش‌ها" value={`${formatPrice(user.orders.length)} سفارش`} />
              <InfoRow label="مجموع خرید (پرداخت‌شده)" value={`${formatPrice(paidTotal)} تومان`} />
            </div>
            <div className="space-y-1.5 rounded-lg border p-3">
              <Label className="text-xs">نقش کاربر</Label>
              <Select value={role} onValueChange={setRole} disabled={!canManage || user.role === "SUPER_ADMIN"}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} disabled={r === "SUPER_ADMIN" && currentRole !== "SUPER_ADMIN"}>
                      {ROLE_FA[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canManage && <p className="text-[10px] text-muted-foreground">تغییر نقش فقط توسط مدیر کل / مدیر</p>}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-xs">مسدودسازی حساب</Label>
                <p className="text-[10px] text-muted-foreground">نشست‌های کاربر خاتمه می‌یابد</p>
              </div>
              <Switch checked={!blocked} onCheckedChange={(v) => setBlocked(!v)} disabled={!canManage || isSelf} />
            </div>
            <Button
              className="gold-surface w-full rounded-lg text-primary-foreground hover:opacity-90"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !canManage || (role === user.role && blocked === user.isBlocked)}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تغییرات
            </Button>

            {canManage && !isSelf && (user.role !== "SUPER_ADMIN" || currentRole === "SUPER_ADMIN") && (
              <Button
                variant="outline"
                className="w-full rounded-lg"
                onClick={() => setPwOpen(true)}
              >
                <KeyRound className="h-4 w-4" />
                بازنشانی رمز عبور
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Password reset dialog */}
        <Dialog open={pwOpen} onOpenChange={(v) => { setPwOpen(v); if (!v) { setNewPw(""); setNewPwConfirm(""); } }}>
          <DialogContent className="max-w-md rounded-xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                بازنشانی رمز عبور
              </DialogTitle>
              <DialogDescription>
                رمز جدید برای «{`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "بی‌نام"}» تعیین کنید. همه نشست‌های فعال این کاربر خاتمه می‌یابد.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs">رمز عبور جدید (حداقل ۸ کاراکتر)</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-pw"
                    dir="ltr"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="rounded-lg"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    onClick={generatePassword}
                    aria-label="تولید رمز تصادفی"
                    title="تولید رمز تصادفی"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw-confirm" className="text-xs">تکرار رمز جدید</Label>
                <Input
                  id="new-pw-confirm"
                  dir="ltr"
                  value={newPwConfirm}
                  onChange={(e) => setNewPwConfirm(e.target.value)}
                  className="rounded-lg"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setPwOpen(false)} disabled={resetPwMutation.isPending}>
                انصراف
              </Button>
              <Button
                className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
                onClick={() => {
                  if (newPw.length < 8) return toast.error("رمز باید حداقل ۸ کاراکتر باشد");
                  if (newPw !== newPwConfirm) return toast.error("تکرار رمز مطابقت ندارد");
                  resetPwMutation.mutate(newPw);
                }}
                disabled={resetPwMutation.isPending || newPw.length < 8 || newPw !== newPwConfirm}
              >
                {resetPwMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                بازنشانی رمز
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Package className="h-4 w-4 text-primary" />
              سفارش‌های کاربر (۲۰ سفارش اخیر)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {user.orders.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">سفارشی ثبت نشده است</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="p-2.5 text-right font-bold">شماره</th>
                      <th className="p-2.5 text-right font-bold">مبلغ</th>
                      <th className="p-2.5 text-right font-bold">پرداخت</th>
                      <th className="p-2.5 text-right font-bold">وضعیت</th>
                      <th className="p-2.5 text-right font-bold">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map((o) => (
                      <tr key={o.orderNumber} className="border-b last:border-0">
                        <td className="p-2.5 font-mono text-xs text-primary" dir="ltr">{o.orderNumber}</td>
                        <td className="p-2.5 text-xs tabular-nums">{formatPrice(o.total)} تومان</td>
                        <td className="p-2.5"><PaymentStatusBadge status={o.paymentStatus} /></td>
                        <td className="p-2.5"><OrderStatusBadge status={o.status} /></td>
                        <td className="p-2.5 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Star className="h-4 w-4 text-primary" />
            دیدگاه‌های کاربر (۱۰ دیدگاه اخیر)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.reviews.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">دیدگاهی ثبت نشده است</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {user.reviews.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={"h-3.5 w-3.5 " + (s < r.rating ? "fill-primary text-primary" : "text-muted-foreground/40")} />
                      ))}
                    </div>
                    {r.title && <p className="mt-1 truncate text-xs font-bold">{r.title}</p>}
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <span className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                    (r.status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : r.status === "REJECTED"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-600")
                  }>
                    {r.status === "APPROVED" ? "تأیید شده" : r.status === "REJECTED" ? "رد شده" : "در انتظار"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium" dir={mono ? "ltr" : undefined} title={value}>{value}</span>
    </div>
  );
}

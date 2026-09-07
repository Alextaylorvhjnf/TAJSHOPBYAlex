"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type CouponRow } from "@/components/admin/api-client";
import { formatDate, formatPrice } from "@/lib/format";

interface CouponFormState {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minAmount: string;
  maxUsage: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY: CouponFormState = {
  code: "",
  type: "PERCENT",
  value: "",
  minAmount: "0",
  maxUsage: "0",
  perUserLimit: "1",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v: string): number {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function CouponDialog({ coupon, onClose }: { coupon: CouponRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CouponFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code,
        type: coupon.type === "FIXED" ? "FIXED" : "PERCENT",
        value: String(coupon.value),
        minAmount: String(coupon.minAmount ?? 0),
        maxUsage: String(coupon.maxUsage ?? 0),
        perUserLimit: String(coupon.perUserLimit ?? 1),
        startsAt: toLocalInput(coupon.startsAt),
        expiresAt: toLocalInput(coupon.expiresAt),
        isActive: coupon.isActive,
      });
    } else {
      setForm(EMPTY);
    }
  }, [coupon]);

  const save = async () => {
    if (saving) return;
    const code = form.code.trim().toUpperCase();
    if (code.length < 3) return toast.error("کد تخفیف حداقل ۳ کاراکتر باشد (حروف و اعداد)");
    if (!/^[A-Za-z0-9-]+$/.test(code)) return toast.error("کد تخفیف فقط می‌تواند شامل حروف، عدد و خط تیره باشد");
    const value = num(form.value);
    if (value <= 0) return toast.error("مقدار تخفیف باید عددی مثبت باشد");
    if (form.type === "PERCENT" && (value < 1 || value > 100)) return toast.error("درصد تخفیف باید بین ۱ تا ۱۰۰ باشد");
    setSaving(true);
    try {
      const payload = {
        code,
        type: form.type,
        value,
        minAmount: num(form.minAmount),
        maxUsage: num(form.maxUsage),
        perUserLimit: Math.max(1, num(form.perUserLimit)),
        startsAt: fromLocalInput(form.startsAt),
        expiresAt: fromLocalInput(form.expiresAt),
        isActive: form.isActive,
      };
      const json = await apiFetch<{ message?: string }>(
        coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons",
        { method: coupon ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "کد تخفیف ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{coupon ? `ویرایش کد «${coupon.code}»` : "کد تخفیف جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          کدهای درصدی بین ۱ تا ۱۰۰ اعمال می‌شوند — کدهای مبلغی به تومان هستند
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-code">کد *</Label>
          <Input id="c-code" dir="ltr" className="rounded-lg font-mono text-left" value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TAJ-1404" />
        </div>
        <div className="space-y-1.5">
          <Label>نوع تخفیف</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENT" | "FIXED" }))}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">درصدی</SelectItem>
              <SelectItem value="FIXED">مبلغی (تومان)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-value">مقدار *</Label>
          <div className="relative">
            <Input id="c-value" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value.replace(/[^\d]/g, "") }))} placeholder={form.type === "PERCENT" ? "20" : "500000"} />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {form.type === "PERCENT" ? "٪" : "تومان"}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-min">حداقل مبلغ سفارش (تومان)</Label>
          <Input id="c-min" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.minAmount}
            onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value.replace(/[^\d]/g, "") }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-max">حداکثر تعداد استفاده</Label>
          <Input id="c-max" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.maxUsage}
            onChange={(e) => setForm((f) => ({ ...f, maxUsage: e.target.value.replace(/[^\d]/g, "") }))} />
          <p className="text-[10px] text-muted-foreground">۰ = بدون محدودیت</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-peruser">سقف استفاده هر کاربر</Label>
          <Input id="c-peruser" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.perUserLimit}
            onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value.replace(/[^\d]/g, "") }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-start">تاریخ شروع</Label>
          <Input id="c-start" type="datetime-local" dir="ltr" className="rounded-lg text-left" value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-exp">تاریخ انقضا</Label>
          <Input id="c-exp" type="datetime-local" dir="ltr" className="rounded-lg text-left" value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
          <Label htmlFor="c-active">فعال</Label>
          <Switch id="c-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-lg" onClick={onClose}>انصراف</Button>
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          ذخیره
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => apiFetch<{ coupons: CouponRow[] }>("/api/admin/coupons"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/coupons/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/coupons/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "کد تخفیف حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const coupons = data?.coupons ?? [];
  const now = new Date();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کدهای تخفیف"
        desc={`${coupons.length.toLocaleString("fa-IR")} کد تخفیف ثبت شده است`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            کد تخفیف جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت کدهای تخفیف" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="کد تخفیفی ثبت نشده است"
          desc="برای برگزاری کمپین تخفیف، نخستین کد را بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <Ticket className="h-4 w-4" />
              کد تخفیف جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["کد", "نوع", "مقدار", "حداقل سفارش", "استفاده", "سقف هر کاربر", "اعتبار", "فعال", "عملیات"]}>
          {coupons.map((c) => {
            const expired = c.expiresAt ? new Date(c.expiresAt) < now : false;
            return (
              <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <Badge variant="outline" className="bg-primary/10 font-mono text-primary" dir="ltr">{c.code}</Badge>
                </td>
                <td className="p-3 text-xs">{c.type === "PERCENT" ? "درصدی" : "مبلغی"}</td>
                <td className="p-3 text-xs font-bold tabular-nums">
                  {c.type === "PERCENT" ? `${formatPrice(c.value)}٪` : `${formatPrice(c.value)} تومان`}
                </td>
                <td className="p-3 text-xs tabular-nums">
                  {c.minAmount > 0 ? `${formatPrice(c.minAmount)} تومان` : "—"}
                </td>
                <td className="p-3 text-xs tabular-nums">
                  {formatPrice(c.usedCount)}
                  {c.maxUsage > 0 ? ` / ${formatPrice(c.maxUsage)}` : " / ∞"}
                </td>
                <td className="p-3 text-xs tabular-nums">{formatPrice(c.perUserLimit)}</td>
                <td className="p-3 text-[11px] text-muted-foreground">
                  {c.expiresAt ? (
                    <span className={expired ? "font-bold text-destructive" : ""}>
                      {expired ? "منقضی شده" : `تا ${formatDate(c.expiresAt)}`}
                    </span>
                  ) : (
                    "بدون انقضا"
                  )}
                </td>
                <td className="p-3">
                  <Switch
                    checked={c.isActive && !expired}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, isActive: v })}
                    disabled={toggleMutation.isPending || expired}
                    aria-label={`فعال بودن ${c.code}`}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="ویرایش"
                      onClick={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" aria-label="حذف"
                      onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <CouponDialog coupon={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کد تخفیف</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف کد «{deleteTarget?.code}» مطمئن هستید؟ سفارشات قبلی با این کد دست‌نخورده می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

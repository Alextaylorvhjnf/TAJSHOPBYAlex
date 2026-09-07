"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type DeliveryMethodRow } from "@/components/admin/api-client";
import { formatPrice } from "@/lib/format";
import {
  DELIVERY_TYPE_FA,
  DELIVERY_TYPE_TONE,
  deliveryEtaLabel,
  deliveryIcon,
  KNOWN_DELIVERY_ICONS,
} from "@/lib/delivery";
import { DELIVERY_TYPES } from "@/lib/validators";

interface DeliveryFormState {
  name: string;
  type: string;
  cost: string;
  etaMinDays: string;
  etaMaxDays: string;
  description: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: DeliveryFormState = {
  name: "",
  type: "POST",
  cost: "0",
  etaMinDays: "1",
  etaMaxDays: "5",
  description: "",
  icon: "",
  sortOrder: "0",
  isActive: true,
};

function num(v: string): number {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function DeliveryDialog({ method, onClose }: { method: DeliveryMethodRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DeliveryFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (method) {
      setForm({
        name: method.name,
        type: DELIVERY_TYPES.includes(method.type as never) ? method.type : "POST",
        cost: String(method.cost),
        etaMinDays: String(method.etaMinDays),
        etaMaxDays: String(method.etaMaxDays),
        description: method.description ?? "",
        icon: method.icon ?? "",
        sortOrder: String(method.sortOrder),
        isActive: method.isActive,
      });
    } else {
      setForm(EMPTY);
    }
  }, [method]);

  const save = async () => {
    if (saving) return;
    const name = form.name.trim();
    if (name.length < 2) return toast.error("نام روش ارسال باید حداقل ۲ حرف باشد");
    const cost = num(form.cost);
    const etaMin = num(form.etaMinDays);
    const etaMax = num(form.etaMaxDays);
    if (etaMin > 30) return toast.error("حداقل روز ارسال حداکثر می‌تواند ۳۰ باشد");
    if (etaMax > 60) return toast.error("حداکثر روز ارسال حداکثر می‌تواند ۶۰ باشد");
    if (etaMax < etaMin) return toast.error("حداکثر روز ارسال نمی‌تواند کمتر از حداقل آن باشد");
    if (form.description.trim().length > 300) return toast.error("توضیحات حداکثر ۳۰۰ کاراکتر است");
    if (num(form.sortOrder) > 999) return toast.error("ترتیب نمایش حداکثر ۹۹۹ است");

    setSaving(true);
    try {
      const payload = {
        name,
        type: form.type,
        cost,
        etaMinDays: etaMin,
        etaMaxDays: etaMax,
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        sortOrder: num(form.sortOrder),
        isActive: form.isActive,
      };
      const json = await apiFetch<{ message?: string }>(
        method ? `/api/admin/delivery/${method.id}` : "/api/admin/delivery",
        { method: method ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "روش ارسال ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const PreviewIcon = deliveryIcon(form.icon);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{method ? `ویرایش «${method.name}»` : "روش ارسال جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          روش‌های فعال هنگام تسویه حساب به مشتری نمایش داده می‌شوند — هزینه‌ها به تومان
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dm-name">نام روش ارسال *</Label>
          <Input id="dm-name" className="rounded-lg" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً پست پیشتاز" />
        </div>
        <div className="space-y-1.5">
          <Label>نوع ارسال</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DELIVERY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{DELIVERY_TYPE_FA[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dm-cost">هزینه ارسال (تومان)</Label>
          <div className="relative">
            <Input id="dm-cost" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value.replace(/[^\d]/g, "") }))} placeholder="55000" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">تومان</span>
          </div>
          <p className="text-[10px] text-muted-foreground">۰ = ارسال رایگان (مثلاً تحویل حضوری)</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dm-eta-min">حداقل روز</Label>
            <Input id="dm-eta-min" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.etaMinDays}
              onChange={(e) => setForm((f) => ({ ...f, etaMinDays: e.target.value.replace(/[^\d]/g, "") }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dm-eta-max">حداکثر روز</Label>
            <Input id="dm-eta-max" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.etaMaxDays}
              onChange={(e) => setForm((f) => ({ ...f, etaMaxDays: e.target.value.replace(/[^\d]/g, "") }))} />
          </div>
          <p className="text-[10px] text-muted-foreground col-span-2">۰ روز = همان روز / ۲۴ ساعته</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dm-desc">توضیحات (اختیاری)</Label>
          <Textarea id="dm-desc" rows={2} className="rounded-lg resize-none" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="مثلاً مناسب کالاهای کوچک تا ۲ کیلوگرم" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dm-icon">آیکون (اختیاری)</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-primary" aria-hidden="true">
              <PreviewIcon className="h-5 w-5" />
            </span>
            <Input id="dm-icon" dir="ltr" list="dm-icon-list" className="rounded-lg text-left" value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Truck" />
          </div>
          <datalist id="dm-icon-list">
            {KNOWN_DELIVERY_ICONS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <p className="text-[10px] text-muted-foreground">نام آیکون لوسید — نام‌های نامعتبر با آیکون بسته نمایش داده می‌شوند</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dm-sort">ترتیب نمایش</Label>
          <Input id="dm-sort" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))} />
          <p className="text-[10px] text-muted-foreground">اعداد کوچک‌تر بالاتر نمایش داده می‌شوند</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
          <div>
            <Label htmlFor="dm-active">فعال</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">روش‌های غیرفعال در تسویه حساب نمایش داده نمی‌شوند</p>
          </div>
          <Switch id="dm-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
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

export default function AdminDeliveryPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryMethodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryMethodRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "delivery"],
    queryFn: () => apiFetch<{ methods: DeliveryMethodRow[] }>("/api/admin/delivery"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/delivery/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/delivery/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "روش ارسال حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const methods = data?.methods ?? [];
  const activeCount = methods.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="روش‌های ارسال"
        desc={`${methods.length.toLocaleString("fa-IR")} روش ارسال ثبت شده است (${activeCount.toLocaleString("fa-IR")} فعال)`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            روش ارسال جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت روش‌های ارسال" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : methods.length === 0 ? (
        <EmptyState
          title="روش ارسالی ثبت نشده است"
          desc="تا زمانی که روشی اضافه نشود، هزینه ارسال ثابت تنظیمات فروشگاه اعمال می‌شود"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <Truck className="h-4 w-4" />
              روش ارسال جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["روش ارسال", "نوع", "هزینه", "زمان تحویل", "ترتیب", "سفارش‌ها", "فعال", "عملیات"]}>
          {methods.map((m) => {
            const Icon = deliveryIcon(m.icon);
            return (
              <tr key={m.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{m.name}</p>
                      {m.description && (
                        <p className="max-w-[220px] truncate text-[10px] text-muted-foreground" title={m.description}>
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className={DELIVERY_TYPE_TONE[m.type] ?? ""}>
                    {DELIVERY_TYPE_FA[m.type] ?? m.type}
                  </Badge>
                </td>
                <td className="p-3 text-xs font-bold tabular-nums whitespace-nowrap">
                  {m.cost === 0 ? "رایگان" : `${formatPrice(m.cost)} تومان`}
                </td>
                <td className="p-3 text-xs whitespace-nowrap">{deliveryEtaLabel(m.etaMinDays, m.etaMaxDays)}</td>
                <td className="p-3 text-xs tabular-nums">{formatPrice(m.sortOrder)}</td>
                <td className="p-3 text-xs tabular-nums">{formatPrice(m.orderCount)}</td>
                <td className="p-3">
                  <Switch
                    checked={m.isActive}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: m.id, isActive: v })}
                    disabled={toggleMutation.isPending}
                    aria-label={`فعال بودن ${m.name}`}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="ویرایش"
                      onClick={() => {
                        setEditing(m);
                        setDialogOpen(true);
                      }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" aria-label="حذف"
                      onClick={() => setDeleteTarget(m)}>
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
        {dialogOpen && <DeliveryDialog method={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف روش ارسال</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.name}» مطمئن هستید؟ سفارش‌های قبلی نام روش ارسال خود را حفظ می‌کنند.
              {(deleteTarget?.orderCount ?? 0) > 0 && (
                <span className="mt-1.5 block font-bold text-amber-600 dark:text-amber-400">
                  این روش در {formatPrice(deleteTarget?.orderCount ?? 0)} سفارش استفاده شده است.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

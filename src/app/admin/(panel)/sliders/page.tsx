"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Images, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  AdminThumb,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch, type ProductRow, type SliderRow } from "@/components/admin/api-client";
import { formatDate } from "@/lib/format";

interface SliderFormState {
  title: string;
  subtitle: string;
  desktopImage: string | null;
  mobileImage: string | null;
  buttonText: string;
  buttonUrl: string;
  badge: string;
  productId: string;
  sortOrder: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const EMPTY: SliderFormState = {
  title: "",
  subtitle: "",
  desktopImage: null,
  mobileImage: null,
  buttonText: "",
  buttonUrl: "",
  badge: "",
  productId: "none",
  sortOrder: "0",
  isActive: true,
  startsAt: "",
  endsAt: "",
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

function SliderDialog({
  slider,
  onClose,
}: {
  slider: SliderRow | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SliderFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slider) {
      setForm({
        title: slider.title,
        subtitle: slider.subtitle ?? "",
        desktopImage: slider.desktopImage,
        mobileImage: slider.mobileImage,
        buttonText: slider.buttonText ?? "",
        buttonUrl: slider.buttonUrl ?? "",
        badge: slider.badge ?? "",
        productId: slider.productId ?? "none",
        sortOrder: String(slider.sortOrder ?? 0),
        isActive: slider.isActive,
        startsAt: toLocalInput(slider.startsAt),
        endsAt: toLocalInput(slider.endsAt),
      });
    } else {
      setForm(EMPTY);
    }
  }, [slider]);

  const { data: productsData } = useQuery({
    queryKey: ["admin", "products", "for-slider"],
    queryFn: () => apiFetch<{ items: ProductRow[] }>("/api/admin/products?limit=60"),
  });
  const products = productsData?.items ?? [];

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 2) return toast.error("عنوان اسلاید الزامی است");
    if (!form.desktopImage) return toast.error("تصویر دسکتاپ الزامی است");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        desktopImage: form.desktopImage,
        mobileImage: form.mobileImage,
        buttonText: form.buttonText.trim() || null,
        buttonUrl: form.buttonUrl.trim() || null,
        badge: form.badge.trim() || null,
        productId: form.productId === "none" ? null : form.productId,
        sortOrder: Number(form.sortOrder.replace(/[^\d-]/g, "")) || 0,
        isActive: form.isActive,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
      };
      const json = await apiFetch<{ message?: string }>(
        slider ? `/api/admin/sliders/${slider.id}` : "/api/admin/sliders",
        { method: slider ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "اسلایدر ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "sliders"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{slider ? `ویرایش اسلاید «${slider.title}»` : "اسلاید جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          اسلایدهای صفحه اصلی — تصویر دسکتاپ الزامی است
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sl-title">عنوان *</Label>
          <Input id="sl-title" className="rounded-lg" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="مثلاً: فروش ویژه لپ‌تاپ‌های گیمینگ" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sl-sub">زیرعنوان</Label>
          <Input id="sl-sub" className="rounded-lg" value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="تصویر دسکتاپ (الزامی) *"
            folder="sliders"
            height={130}
            value={form.desktopImage}
            onChange={(url) => setForm((f) => ({ ...f, desktopImage: url }))}
          />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="تصویر موبایل (اختیاری)"
            folder="sliders"
            height={110}
            value={form.mobileImage}
            onChange={(url) => setForm((f) => ({ ...f, mobileImage: url }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-btntext">متن دکمه</Label>
          <Input id="sl-btntext" className="rounded-lg" value={form.buttonText}
            onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))} placeholder="مشاهده و خرید" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-btnurl">لینک دکمه</Label>
          <Input id="sl-btnurl" dir="ltr" className="rounded-lg text-left" value={form.buttonUrl}
            onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))} placeholder="/products/laptops" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-badge">برچسب (Badge)</Label>
          <Input id="sl-badge" className="rounded-lg" value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="تخفیف تا ۳۰٪" />
        </div>
        <div className="space-y-1.5">
          <Label>محصول مرتبط (اختیاری)</Label>
          <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون محصول —</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-sort">ترتیب نمایش</Label>
          <Input id="sl-sort" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="sl-active">فعال</Label>
          <Switch id="sl-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-start">تاریخ شروع نمایش</Label>
          <Input id="sl-start" type="datetime-local" dir="ltr" className="rounded-lg text-left" value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-end">تاریخ پایان نمایش</Label>
          <Input id="sl-end" type="datetime-local" dir="ltr" className="rounded-lg text-left" value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
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

export default function AdminSlidersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SliderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SliderRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "sliders"],
    queryFn: () => apiFetch<{ sliders: SliderRow[] }>("/api/admin/sliders"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/sliders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "sliders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/sliders/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "اسلایدر حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "sliders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const sliders = data?.sliders ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="اسلایدر صفحه اصلی"
        desc={`${sliders.length.toLocaleString("fa-IR")} اسلاید — بنرهای تبلیغاتی صفحه اصلی`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            اسلاید جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت اسلایدرها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : sliders.length === 0 ? (
        <EmptyState
          title="اسلایدی ثبت نشده است"
          desc="برای نمایش بنر در صفحه اصلی، نخستین اسلاید را بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <Images className="h-4 w-4" />
              اسلاید جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["تصویر", "عنوان", "محصول مرتبط", "ترتیب", "برنامه نمایش", "فعال", "عملیات"]}>
          {sliders.map((s) => (
            <tr key={s.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <AdminThumb src={s.desktopImage} alt={s.title} size={44} />
                  {s.mobileImage && <AdminThumb src={s.mobileImage} alt={`${s.title} - موبایل`} size={44} />}
                </div>
              </td>
              <td className="p-3">
                <p className="text-sm font-bold">{s.title}</p>
                {s.subtitle && <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>}
                {s.badge && (
                  <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{s.badge}</span>
                )}
              </td>
              <td className="p-3 text-xs">{s.product?.name ?? "—"}</td>
              <td className="p-3 text-xs tabular-nums">{s.sortOrder.toLocaleString("fa-IR")}</td>
              <td className="p-3 text-[11px] text-muted-foreground">
                {s.startsAt ? `از ${formatDate(s.startsAt)}` : "بدون محدودیت"}
                {s.endsAt ? ` / تا ${formatDate(s.endsAt)}` : ""}
              </td>
              <td className="p-3">
                <Switch
                  checked={s.isActive}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, isActive: v })}
                  disabled={toggleMutation.isPending}
                  aria-label={`فعال بودن ${s.title}`}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="ویرایش"
                    onClick={() => {
                      setEditing(s);
                      setDialogOpen(true);
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" aria-label="حذف"
                    onClick={() => setDeleteTarget(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <SliderDialog slider={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف اسلایدر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف اسلاید «{deleteTarget?.title}» مطمئن هستید؟
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

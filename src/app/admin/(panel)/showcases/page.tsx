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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Link2, Loader2, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  AdminThumb,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { ProductPicker } from "@/components/admin/product-picker";
import { apiFetch } from "@/components/admin/api-client";

interface ShowcaseRow {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  buttonText: string | null;
  buttonUrl: string | null;
  badge: string | null;
  productId: string | null;
  sortOrder: number;
  isActive: boolean;
  product: { id: string; name: string; slug: string; mainImage: string | null } | null;
}

interface ShowcaseFormState {
  title: string;
  subtitle: string;
  image: string | null;
  buttonText: string;
  buttonUrl: string;
  badge: string;
  productId: string | null;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: ShowcaseFormState = {
  title: "",
  subtitle: "",
  image: null,
  buttonText: "",
  buttonUrl: "",
  badge: "",
  productId: null,
  sortOrder: "0",
  isActive: true,
};

function ShowcaseDialog({ showcase, onClose }: { showcase: ShowcaseRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ShowcaseFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showcase) {
      setForm({
        title: showcase.title,
        subtitle: showcase.subtitle ?? "",
        image: showcase.image,
        buttonText: showcase.buttonText ?? "",
        buttonUrl: showcase.buttonUrl ?? "",
        badge: showcase.badge ?? "",
        productId: showcase.productId,
        sortOrder: String(showcase.sortOrder ?? 0),
        isActive: showcase.isActive,
      });
    } else {
      setForm(EMPTY);
    }
  }, [showcase]);

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 1) return toast.error("عنوان شوکیس الزامی است");
    if (!form.image) return toast.error("تصویر شوکیس الزامی است");
    const link = form.buttonUrl.trim();
    if (link && !link.startsWith("/") && !link.startsWith("https://")) {
      return toast.error("لینک دکمه باید داخلی (شروع با /) یا https باشد");
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image: form.image,
        buttonText: form.buttonText.trim() || null,
        buttonUrl: link || null,
        badge: form.badge.trim() || null,
        productId: form.productId || null,
        sortOrder: Number(form.sortOrder.replace(/[^\d]/g, "")) || 0,
        isActive: form.isActive,
      };
      const json = await apiFetch<{ message?: string }>(
        showcase ? `/api/admin/showcases/${showcase.id}` : "/api/admin/showcases",
        { method: showcase ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "شوکیس ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "showcases"] });
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
        <DialogTitle>{showcase ? `ویرایش شوکیس «${showcase.title}»` : "شوکیس جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          بنرهای عرضی صفحه اصلی — تصویر با نسبت عریض ۲۱:۹ بهترین نتیجه را دارد
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-title">عنوان *</Label>
          <Input
            id="sc-title"
            className="rounded-lg"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: دنیای گیمینگ را تجربه کن"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-sub">زیرعنوان</Label>
          <Input
            id="sc-sub"
            className="rounded-lg"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            placeholder="مثلاً: تجهیزات حرفه‌ای با ضمانت اصالت"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="تصویر بنر (الزامی) * — نسبت عریض ۲۱:۹"
            folder="showcases"
            height={130}
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-btntext">متن دکمه</Label>
          <Input
            id="sc-btntext"
            className="rounded-lg"
            value={form.buttonText}
            onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
            placeholder="مشاهده و خرید"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-btnurl">لینک دکمه</Label>
          <Input
            id="sc-btnurl"
            dir="ltr"
            className="rounded-lg text-left"
            value={form.buttonUrl}
            onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
            placeholder="/products/gaming"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-badge">برچسب (Badge)</Label>
          <Input
            id="sc-badge"
            className="rounded-lg"
            value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
            placeholder="پیشنهاد ویژه"
          />
        </div>
        <div className="space-y-1.5">
          <Label>محصول مرتبط (اختیاری)</Label>
          <ProductPicker
            value={form.productId}
            onChange={(id) => setForm((f) => ({ ...f, productId: id }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-sort">ترتیب نمایش</Label>
          <Input
            id="sc-sort"
            dir="ltr"
            inputMode="numeric"
            className="rounded-lg text-left"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="sc-active">فعال</Label>
          <Switch
            id="sc-active"
            checked={form.isActive}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-lg" onClick={onClose}>
          انصراف
        </Button>
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          ذخیره
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AdminShowcasesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcaseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShowcaseRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "showcases"],
    queryFn: () => apiFetch<{ showcases: ShowcaseRow[] }>("/api/admin/showcases"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/showcases/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "showcases"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/showcases/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "شوکیس حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "showcases"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const showcases = data?.showcases ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="شوکیس‌های تبلیغاتی"
        desc={`${showcases.length.toLocaleString("fa-IR")} شوکیس — بنرهای عرضی صفحه اصلی`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            شوکیس جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت شوکیس‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : showcases.length === 0 ? (
        <EmptyState
          title="شوکیسی ثبت نشده است"
          desc="برای نمایش بنر عرضی در صفحه اصلی، نخستین شوکیس را بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <LayoutTemplate className="h-4 w-4" />
              شوکیس جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["تصویر", "عنوان", "دکمه (CTA)", "محصول مرتبط", "ترتیب", "فعال", "عملیات"]}>
          {showcases.map((s) => (
            <tr key={s.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <AdminThumb src={s.image} alt={s.title} size={64} className="w-20" />
              </td>
              <td className="max-w-56 p-3">
                <p className="text-sm font-bold">{s.title}</p>
                {s.subtitle && <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>}
                {s.badge && (
                  <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {s.badge}
                  </span>
                )}
              </td>
              <td className="max-w-48 p-3 text-xs">
                {s.buttonText || s.buttonUrl ? (
                  <div className="space-y-0.5">
                    {s.buttonText && (
                      <span className="flex items-center gap-1.5">
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {s.buttonText}
                      </span>
                    )}
                    {s.buttonUrl && (
                      <span dir="ltr" className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.buttonUrl}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-xs">{s.product?.name ?? "—"}</td>
              <td className="p-3 text-xs tabular-nums">{s.sortOrder.toLocaleString("fa-IR")}</td>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    aria-label="ویرایش"
                    onClick={() => {
                      setEditing(s);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="حذف"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <ShowcaseDialog showcase={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شوکیس</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف شوکیس «{deleteTarget?.title}» مطمئن هستید؟
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

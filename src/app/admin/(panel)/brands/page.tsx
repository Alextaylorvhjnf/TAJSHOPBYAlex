"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Award, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  AdminThumb,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch, type BrandRow } from "@/components/admin/api-client";

interface BrandFormState {
  name: string;
  slug: string;
  logo: string | null;
  description: string;
  isActive: boolean;
}

const EMPTY: BrandFormState = { name: "", slug: "", logo: null, description: "", isActive: true };

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

function BrandDialog({ brand, onClose }: { brand: BrandRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandFormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
        description: brand.description ?? "",
        isActive: brand.isActive,
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY);
      setSlugTouched(false);
    }
  }, [brand]);

  const save = async () => {
    if (saving) return;
    if (form.name.trim().length < 1) return toast.error("نام برند الزامی است");
    if (!form.slug.trim()) return toast.error("اسلاگ الزامی است (حروف انگلیسی و خط تیره)");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        logo: form.logo,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      const json = await apiFetch<{ message?: string }>(
        brand ? `/api/admin/brands/${brand.id}` : "/api/admin/brands",
        { method: brand ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{brand ? `ویرایش برند «${brand.name}»` : "برند جدید"}</DialogTitle>
        <DialogDescription className="text-xs">برند سازنده محصولات فروشگاه</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">نام *</Label>
            <Input id="brand-name" className="rounded-lg" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-slug">اسلاگ *</Label>
            <Input id="brand-slug" dir="ltr" className="rounded-lg text-left" value={form.slug}
              onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
              placeholder="samsung" />
          </div>
        </div>
        <ImageUpload
          label="لوگو برند"
          folder="brands"
          height={110}
          value={form.logo}
          onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
        />
        <div className="space-y-1.5">
          <Label htmlFor="brand-desc">توضیحات</Label>
          <Textarea id="brand-desc" rows={2} className="rounded-lg" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="brand-active">فعال</Label>
          <Switch id="brand-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
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

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: () => apiFetch<{ brands: BrandRow[] }>("/api/admin/brands"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/brands/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/brands/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const brands = data?.brands ?? [];
  const perPage = 12;
  const pages = Math.max(1, Math.ceil(brands.length / perPage));
  const paged = brands.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="برندها"
        desc={`${brands.length.toLocaleString("fa-IR")} برند ثبت شده است`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            برند جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت برندها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : paged.length === 0 ? (
        <EmptyState
          title="برندی ثبت نشده است"
          desc="برای معرفی سازنده محصولات، نخستین برند را بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <Award className="h-4 w-4" />
              برند جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["برند", "اسلاگ", "تعداد محصول", "فعال", "عملیات"]}>
          {paged.map((b) => (
            <tr key={b.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <AdminThumb src={b.logo} alt={b.name} size={36} className="rounded-full" />
                  <span className="text-sm font-bold">{b.name}</span>
                </div>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground" dir="ltr">{b.slug}</td>
              <td className="p-3 text-xs tabular-nums">{b.productCount.toLocaleString("fa-IR")}</td>
              <td className="p-3">
                <Switch
                  checked={b.isActive}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: b.id, isActive: v })}
                  disabled={toggleMutation.isPending}
                  aria-label={`فعال بودن ${b.name}`}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="ویرایش"
                    onClick={() => {
                      setEditing(b);
                      setDialogOpen(true);
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" aria-label="حذف"
                    onClick={() => setDeleteTarget(b)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {pages > 1 && <AdminPagination page={page} pages={pages} total={brands.length} onPage={setPage} />}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <BrandDialog brand={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف برند</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف برند «{deleteTarget?.name}» مطمئن هستید؟ برندهایی که محصول دارند قابل حذف نیستند.
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

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
import {
  BatteryCharging,
  Camera,
  Computer,
  Cpu,
  FolderTree,
  FolderPlus,
  Gamepad2,
  Headphones,
  Ear,
  Keyboard,
  Laptop,
  ListChecks,
  Loader2,
  MemoryStick,
  Monitor,
  Mouse,
  Pencil,
  Plus,
  Printer,
  Projector,
  Router,
  Server,
  Smartphone,
  Speaker,
  Trash2,
  Tv,
  Usb,
  Watch,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  EmptyState,
  TableSkeleton,
  AdminTable,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch, type CategoryRow } from "@/components/admin/api-client";

/* ── v27.1: lucide icon registry ────────────────────────────────────
   The Category.icon column stores LUCIDE ICON NAMES (e.g. "Smartphone").
   Before v27.1 the admin table rendered that name as RAW TEXT next to the
   Farsi title — which looked like English/Farsi titles stacked "in each
   other". The map below renders the stored name as the actual icon. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Computer,
  Cpu,
  Monitor,
  Gamepad2,
  Headphones,
  BatteryCharging,
  Zap,
  Ear,
  Watch,
  Projector,
  Camera,
  Keyboard,
  MemoryStick,
  Mouse,
  Printer,
  Router,
  Server,
  Speaker,
  Tv,
  Usb,
  Wifi,
};
/* DB legacy: the singular "Headphone" name maps to the same icon */
CATEGORY_ICONS.Headphone = Headphones;

/** icon names offered in the category dialog dropdown */
const ICON_OPTIONS = Object.keys(CATEGORY_ICONS);

/** renders a stored icon name as the real lucide icon (or the emoji itself
 *  when the value isn't a known icon name — legacy emoji values keep working) */
function CategoryGlyph({ name }: { name: string | null }) {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  const Icon = CATEGORY_ICONS[trimmed];
  if (Icon) return <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />;
  // emoji / short custom glyph → render as text (legacy data support)
  if (trimmed.length <= 4) return <span className="text-sm leading-none">{trimmed}</span>;
  return <FolderTree className="h-4 w-4" strokeWidth={1.9} aria-hidden />;
}

interface CategoryFormState {
  name: string;
  slug: string;
  icon: string;
  image: string | null;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
  specTemplate: { key: string; label: string }[];
}

const EMPTY: CategoryFormState = {
  name: "",
  slug: "",
  icon: "none",
  image: null,
  description: "",
  parentId: "none",
  sortOrder: "0",
  isActive: true,
  specTemplate: [],
};

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

function CategoryDialog({
  category,
  categories,
  onClose,
}: {
  category: CategoryRow | null; // null = create
  categories: CategoryRow[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      let template: { key: string; label: string }[] = [];
      try {
        template = category.specTemplate ? JSON.parse(category.specTemplate) : [];
      } catch {
        template = [];
      }
      setForm({
        name: category.name,
        slug: category.slug,
        icon: category.icon ?? "none",
        image: category.image ?? null,
        description: category.description ?? "",
        parentId: category.parentId ?? "none",
        sortOrder: String(category.sortOrder ?? 0),
        isActive: category.isActive,
        specTemplate: template,
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY);
      setSlugTouched(false);
    }
  }, [category]);

  const save = async () => {
    if (saving) return;
    if (form.name.trim().length < 2) return toast.error("نام دسته‌بندی حداقل ۲ کاراکتر باشد");
    if (!form.slug.trim()) return toast.error("اسلاگ الزامی است (حروف انگلیسی و خط تیره)");
    if (form.sortOrder === "") form.sortOrder = "0";
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        icon: form.icon === "none" ? null : form.icon,
        image: form.image,
        description: form.description.trim() || null,
        parentId: form.parentId === "none" ? null : form.parentId,
        sortOrder: Number(form.sortOrder.replace(/[^\d-]/g, "")) || 0,
        isActive: form.isActive,
        specTemplate: form.specTemplate.filter((s) => s.key.trim() && s.label.trim()),
      };
      const json = await apiFetch<{ message?: string }>(
        category ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
        { method: category ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const others = categories.filter((c) => c.id !== category?.id);

  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{category ? `ویرایش دسته‌بندی «${category.name}»` : "دسته‌بندی جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          دسته‌بندی برای گروه‌بندی محصولات و اعمال فیلترها استفاده می‌شود
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">نام (فارسی) *</Label>
          <Input id="cat-name" className="rounded-lg" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">اسلاگ (انگلیسی) *</Label>
          <Input id="cat-slug" dir="ltr" className="rounded-lg text-left" value={form.slug}
            onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
            placeholder="mobile-phones" />
        </div>
        <div className="space-y-1.5">
          <Label>آیکون (اختیاری)</Label>
          <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون آیکون —</SelectItem>
              {ICON_OPTIONS.map((name) => (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <CategoryGlyph name={name} />
                    <span dir="ltr" className="font-mono text-xs">{name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>دسته والد</Label>
          <Select value={form.parentId} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}>
            <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون والد —</SelectItem>
              {others.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-sort">ترتیب نمایش</Label>
          <Input id="cat-sort" dir="ltr" inputMode="numeric" className="rounded-lg text-left" value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="cat-active">فعال</Label>
          <Switch id="cat-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
        </div>
        {/* v27.1: category photo — shown in the storefront mega menu cards */}
        <div className="sm:col-span-2">
          <ImageUpload
            label="عکس دسته‌بندی (اختیاری)"
            folder="categories"
            height={120}
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            عکس دسته‌بندی در کارت‌های دسته‌بندی منوی فروشگاه (مگامنو) نمایش داده می‌شود
          </p>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="cat-desc">توضیحات</Label>
          <Textarea id="cat-desc" rows={2} className="rounded-lg" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-sm">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
              قالب مشخصات فنی
            </Label>
            <Button type="button" variant="outline" size="sm" className="rounded-lg"
              onClick={() => setForm((f) => ({ ...f, specTemplate: [...f.specTemplate, { key: "", label: "" }] }))}>
              <Plus className="h-3.5 w-3.5" />
              افزودن مشخصه
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            هنگام ایجاد محصول از این قالب برای پیش‌پر کردن مشخصات استفاده می‌شود
          </p>
          {form.specTemplate.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input dir="ltr" className="rounded-lg text-left text-xs" placeholder="key"
                value={s.key}
                onChange={(e) => setForm((f) => {
                  const t = [...f.specTemplate];
                  t[idx] = { ...t[idx], key: e.target.value };
                  return { ...f, specTemplate: t };
                })} />
              <Input className="rounded-lg text-xs" placeholder="عنوان فارسی"
                value={s.label}
                onChange={(e) => setForm((f) => {
                  const t = [...f.specTemplate];
                  t[idx] = { ...t[idx], label: e.target.value };
                  return { ...f, specTemplate: t };
                })} />
              <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-md text-destructive hover:bg-destructive/10" aria-label="حذف"
                onClick={() => setForm((f) => ({ ...f, specTemplate: f.specTemplate.filter((_, i) => i !== idx) }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<{ categories: CategoryRow[] }>("/api/admin/categories"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const categories = data?.categories ?? [];
  const perPage = 12;
  const pages = Math.max(1, Math.ceil(categories.length / perPage));
  const paged = categories.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        desc={`${categories.length.toLocaleString("fa-IR")} دسته‌بندی ثبت شده است`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            دسته‌بندی جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت دسته‌بندی‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : paged.length === 0 ? (
        <EmptyState
          title="دسته‌بندی‌ای ثبت نشده است"
          desc="برای گروه‌بندی محصولات، نخستین دسته‌بندی را بسازید"
        />
      ) : (
        <AdminTable headers={["دسته‌بندی", "اسلاگ", "دسته والد", "تعداد محصول", "ترتیب", "فعال", "عملیات"]}>
          {paged.map((c) => (
            <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                {/* v27.1: photo → real lucide icon → placeholder, with the
                    Farsi title as the ONLY text (icon names are never shown
                    as text again — that caused the FA/EN overlap). */}
                <div className="flex items-center gap-2.5">
                  {c.image ? (
                    <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      { }
                      <img src={c.image} alt={`عکس ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CategoryGlyph name={c.icon} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{c.name}</span>
                    {c.description && (
                      <span className="block max-w-[220px] truncate text-[11px] text-muted-foreground">{c.description}</span>
                    )}
                  </span>
                </div>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground" dir="ltr">{c.slug}</td>
              <td className="p-3 text-xs">{c.parentName ?? "—"}</td>
              <td className="p-3 text-xs tabular-nums">{c.productCount.toLocaleString("fa-IR")}</td>
              <td className="p-3 text-xs tabular-nums">{c.sortOrder.toLocaleString("fa-IR")}</td>
              <td className="p-3">
                <Switch
                  checked={c.isActive}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, isActive: v })}
                  disabled={toggleMutation.isPending}
                  aria-label={`فعال بودن ${c.name}`}
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
          ))}
        </AdminTable>
      )}

      {pages > 1 && (
        <AdminPagination page={page} pages={pages} total={categories.length} onPage={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && (
          <CategoryDialog
            category={editing}
            categories={categories}
            onClose={() => setDialogOpen(false)}
          />
        )}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف دسته‌بندی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف دسته‌بندی «{deleteTarget?.name}» مطمئن هستید؟
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

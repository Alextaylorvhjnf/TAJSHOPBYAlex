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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Link2, Loader2, LayoutTemplate, Pencil, Plus, Trash2, Video } from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  AdminThumb,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { ImageUpload } from "@/components/admin/image-upload";
import { VideoUpload } from "@/components/admin/video-upload";
import { ProductPicker } from "@/components/admin/product-picker";
import { apiFetch } from "@/components/admin/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StoryRow {
  id: string;
  title: string;
  image: string;
  videoUrl: string | null;
  duration: number;
  linkUrl: string | null;
  badge: string | null;
  productId: string | null;
  categoryId: string | null;
  expiresAt: string | null;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  product: { id: string; name: string; slug: string; mainImage: string | null } | null;
  category: { id: string; name: string; slug: string } | null;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface StoryFormState {
  title: string;
  image: string | null;
  videoUrl: string | null;
  duration: string; // seconds — "3" … "10"
  linkUrl: string;
  badge: string;
  productId: string | null;
  categoryId: string | null;
  expiresAt: string; // datetime-local
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: StoryFormState = {
  title: "",
  image: null,
  videoUrl: null,
  duration: "6",
  linkUrl: "",
  badge: "",
  productId: null,
  categoryId: null,
  expiresAt: "",
  sortOrder: "0",
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

function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function StoryDialog({ story, onClose }: { story: StoryRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoryFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (story) {
      setForm({
        title: story.title,
        image: story.image,
        videoUrl: story.videoUrl,
        duration: String(Math.min(10, Math.max(3, Math.round((story.duration ?? 6000) / 1000))) ),
        linkUrl: story.linkUrl ?? "",
        badge: story.badge ?? "",
        productId: story.productId,
        categoryId: story.categoryId,
        expiresAt: toLocalInput(story.expiresAt),
        sortOrder: String(story.sortOrder ?? 0),
        isActive: story.isActive,
      });
    } else {
      setForm(EMPTY);
    }
  }, [story]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "for-story"],
    queryFn: () => apiFetch<{ categories: CategoryItem[] }>("/api/categories"),
  });
  const categories = categoriesData?.categories ?? [];

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 1) return toast.error("عنوان استوری الزامی است");
    if (!form.image) return toast.error("تصویر استوری الزامی است");
    const link = form.linkUrl.trim();
    if (link && !link.startsWith("/") && !link.startsWith("https://")) {
      return toast.error("لینک باید داخلی (شروع با /) یا https باشد");
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        image: form.image,
        // story video (spec §10) — null = image-only story
        videoUrl: form.videoUrl || null,
        // per-story auto-advance duration (spec §26) — sent as ms
        duration: Math.min(10000, Math.max(3000, (Number(form.duration) || 6) * 1000)),
        linkUrl: link || null,
        badge: form.badge.trim() || null,
        productId: form.productId || null,
        categoryId: form.categoryId || null,
        expiresAt: fromLocalInput(form.expiresAt),
        sortOrder: Number(form.sortOrder.replace(/[^\d]/g, "")) || 0,
        isActive: form.isActive,
      };
      const json = await apiFetch<{ message?: string }>(
        story ? `/api/admin/stories/${story.id}` : "/api/admin/stories",
        { method: story ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "استوری ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "stories"] });
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
        <DialogTitle>{story ? `ویرایش استوری «${story.title}»` : "استوری جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          استوری‌های دایره‌ای بالای صفحه اصلی — تصویر مربعی (نسبت ۱:۱) بهترین نتیجه را دارد
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="st-title">عنوان *</Label>
          <Input
            id="st-title"
            className="rounded-lg"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: تخفیف‌های ویژه امروز"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="تصویر استوری (الزامی) *"
            folder="stories"
            height={120}
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            تصویر همیشه لازم است — برای استوری ویدیویی به‌عنوان کاور (Poster) استفاده می‌شود
          </p>
        </div>
        <div className="sm:col-span-2">
          <VideoUpload
            label="ویدیوی استوری (اختیاری)"
            value={form.videoUrl}
            onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>مدت نمایش اسلاید (ثانیه)</Label>
          <Select
            dir="rtl"
            value={form.duration}
            onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 4, 5, 6, 7, 8, 10].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} ثانیه
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">پس از این مدت، به‌صورت خودکار به استوری بعدی می‌رود</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-link">لینک سفارشی (اختیاری)</Label>
          <Input
            id="st-link"
            dir="ltr"
            className="rounded-lg text-left"
            value={form.linkUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
            placeholder="/products/laptops یا https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-badge">برچسب (Badge)</Label>
          <Input
            id="st-badge"
            className="rounded-lg"
            value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
            placeholder="جدید"
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
          <Label>دسته‌بندی مرتبط (اختیاری)</Label>
          <Select
            value={form.categoryId ?? "none"}
            onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "none" ? null : v }))}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="— بدون دسته —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون دسته —</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-expires">تاریخ انقضا (اختیاری)</Label>
          <Input
            id="st-expires"
            type="datetime-local"
            dir="ltr"
            className="rounded-lg text-left"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          />
          <p className="text-[10px] text-muted-foreground">بعد از این تاریخ، استوری در سایت نمایش داده نمی‌شود</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-sort">ترتیب نمایش</Label>
          <Input
            id="st-sort"
            dir="ltr"
            inputMode="numeric"
            className="rounded-lg text-left"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="st-active">فعال</Label>
          <Switch
            id="st-active"
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

export default function AdminStoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoryRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "stories"],
    queryFn: () => apiFetch<{ stories: StoryRow[] }>("/api/admin/stories"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/stories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "stories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/stories/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "استوری حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "stories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const stories = data?.stories ?? [];

  const linkTarget = (s: StoryRow) => {
    if (s.productId && s.product) return `محصول: ${s.product.name}`;
    if (s.categoryId && s.category) return `دسته: ${s.category.name}`;
    if (s.linkUrl) return s.linkUrl;
    return null;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="استوری‌ها"
        desc={`${stories.length.toLocaleString("fa-IR")} استوری — دایره‌های استوری بالای صفحه اصلی (تصویری + ویدیویی)`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            استوری جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت استوری‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : stories.length === 0 ? (
        <EmptyState
          title="استوری‌ای ثبت نشده است"
          desc="برای نمایش استوری در صفحه اصلی، نخستین استوری را بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <LayoutTemplate className="h-4 w-4" />
              استوری جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["تصویر", "عنوان", "مقصد لینک", "انقضا", "بازدید", "ترتیب", "فعال", "عملیات"]}>
          {stories.map((s) => {
            const target = linkTarget(s);
            const expired = isExpired(s.expiresAt);
            return (
              <tr key={s.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <AdminThumb src={s.image} alt={s.title} size={44} className="rounded-full" />
                </td>
                <td className="p-3">
                  <p className="text-sm font-bold">{s.title}</p>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {s.videoUrl && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-px text-[9px] font-bold text-primary">
                        <Video className="h-2.5 w-2.5" />
                        ویدیویی
                      </span>
                    )}
                    {s.badge && (
                      <span className="inline-block rounded-full bg-primary/15 px-2 py-px text-[10px] font-bold text-primary">
                        {s.badge}
                      </span>
                    )}
                  </span>
                </td>
                <td className="max-w-48 p-3 text-xs">
                  {target ? (
                    <span className="flex items-center gap-1.5" title={s.linkUrl ?? undefined}>
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span
                        className={cn(
                          "truncate",
                          s.productId || s.categoryId ? "" : "font-mono text-[11px] text-muted-foreground"
                        )}
                      >
                        {target}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-[11px]">
                  {s.expiresAt ? (
                    <span className={cn("flex flex-col", expired ? "font-bold text-destructive" : "text-muted-foreground")}>
                      {formatDate(s.expiresAt)}
                      {expired && <span>منقضی شده</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">بدون انقضا</span>
                  )}
                </td>
                <td className="p-3 text-xs tabular-nums">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    {s.viewCount.toLocaleString("fa-IR")}
                  </span>
                </td>
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
            );
          })}
        </AdminTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <StoryDialog story={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف استوری</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف استوری «{deleteTarget?.title}» مطمئن هستید؟
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

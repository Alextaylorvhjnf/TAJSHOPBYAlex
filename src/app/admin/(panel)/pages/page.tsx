"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Crown,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";

interface CmsSection {
  h: string;
  p: string;
}

interface CmsPageRow {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  sections: CmsSection[];
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** allowed page icons (lucide names stored in DB) */
const PAGE_ICONS: { name: string; fa: string; icon: LucideIcon }[] = [
  { name: "Crown", fa: "تاج", icon: Crown },
  { name: "Compass", fa: "راهنما", icon: Compass },
  { name: "Truck", fa: "ارسال", icon: Truck },
  { name: "RotateCcw", fa: "بازگشت", icon: RotateCcw },
  { name: "HelpCircle", fa: "سؤالات متداول", icon: HelpCircle },
  { name: "FileText", fa: "مستندات", icon: FileText },
  { name: "ShieldCheck", fa: "امنیت و قوانین", icon: ShieldCheck },
  { name: "Headphones", fa: "پشتیبانی", icon: Headphones },
  { name: "Sparkles", fa: "ویژه", icon: Sparkles },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PAGE_ICONS.map((i) => [i.name, i.icon])
);

const SLUG_RE = /^[a-z0-9-]+$/;

interface CmsFormState {
  slug: string;
  title: string;
  icon: string; // "none" | icon name
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
  isActive: boolean;
  sections: CmsSection[];
}

const EMPTY: CmsFormState = {
  slug: "",
  title: "",
  icon: "FileText",
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
  isActive: true,
  sections: [],
};

function moveSection(sections: CmsSection[], from: number, to: number): CmsSection[] {
  if (to < 0 || to >= sections.length) return sections;
  const next = [...sections];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function CmsPageDialog({ page, onClose }: { page: CmsPageRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CmsFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (page) {
      setForm({
        slug: page.slug,
        title: page.title,
        icon: page.icon ?? "FileText",
        seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        sortOrder: String(page.sortOrder ?? 0),
        isActive: page.isActive,
        sections: (page.sections ?? []).map((s) => ({ h: s.h, p: s.p })),
      });
    } else {
      setForm(EMPTY);
    }
  }, [page]);

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 1) return toast.error("عنوان صفحه الزامی است");
    const cleanedSections = form.sections
      .map((s) => ({ h: s.h.trim(), p: s.p.trim() }))
      .filter((s) => s.h.length > 0 || s.p.length > 0);
    if (cleanedSections.some((s) => s.h.length < 1 || s.p.length < 1)) {
      return toast.error("عنوان و متن هر بخش باید تکمیل شود (بخش‌های خالی را حذف کنید)");
    }
    if (cleanedSections.length > 40) return toast.error("حداکثر ۴۰ بخش مجاز است");
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      icon: form.icon === "none" ? null : form.icon,
      sections: cleanedSections,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      sortOrder: Number(form.sortOrder.replace(/[^\d]/g, "")) || 0,
      isActive: form.isActive,
    };
    if (!page) {
      if (!SLUG_RE.test(form.slug.trim())) {
        return toast.error("اسلاگ فقط حروف کوچک انگلیسی، عدد و خط تیره");
      }
      payload.slug = form.slug.trim();
    }
    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>(
        page ? `/api/admin/cms-pages/${page.id}` : "/api/admin/cms-pages",
        { method: page ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      toast.success(json.message ?? "صفحه ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "cms-pages"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const setSection = (i: number, patch: Partial<CmsSection>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{page ? `ویرایش صفحه «${page.title}»` : "صفحه محتوایی جدید"}</DialogTitle>
        <DialogDescription className="text-xs">
          صفحات اطلاعاتی فروشگاه — آدرس نمایش: <span dir="ltr" className="font-mono">/info/{"{slug}"}</span>
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cp-title">عنوان صفحه *</Label>
          <Input
            id="cp-title"
            className="rounded-lg"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: درباره ما"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-slug">اسلاگ (آدرس) {page ? "—غیرقابل تغییر" : "*"}</Label>
          <Input
            id="cp-slug"
            dir="ltr"
            className="rounded-lg text-left font-mono"
            value={form.slug}
            readOnly={!!page}
            disabled={!!page}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
            placeholder="about-us"
          />
        </div>
        <div className="space-y-1.5">
          <Label>آیکون صفحه</Label>
          <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون آیکون —</SelectItem>
              {PAGE_ICONS.map((i) => (
                <SelectItem key={i.name} value={i.name}>
                  <span className="flex items-center gap-2">
                    <i.icon className="h-3.5 w-3.5" />
                    {i.fa}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-sort">ترتیب نمایش</Label>
          <Input
            id="cp-sort"
            dir="ltr"
            inputMode="numeric"
            className="rounded-lg text-left"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value.replace(/[^\d]/g, "") }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-seotitle">عنوان سئو (اختیاری)</Label>
          <Input
            id="cp-seotitle"
            className="rounded-lg"
            value={form.seoTitle}
            onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
            placeholder="خالی = عنوان صفحه"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-seodesc">توضیحات سئو (اختیاری)</Label>
          <Input
            id="cp-seodesc"
            className="rounded-lg"
            value={form.seoDescription}
            onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
            placeholder="خلاصه‌ای برای نتایج جستجو"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
          <div className="space-y-0.5">
            <Label htmlFor="cp-active">فعال</Label>
            <p className="text-[11px] text-muted-foreground">صفحات غیرفعال در فوتر و آدرس مستقیم نمایش داده نمی‌شوند</p>
          </div>
          <Switch
            id="cp-active"
            checked={form.isActive}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
        </div>

        {/* sections editor */}
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">بخش‌های محتوا ({form.sections.length.toLocaleString("fa-IR")})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-lg"
              onClick={() => setForm((f) => ({ ...f, sections: [...f.sections, { h: "", p: "" }] }))}
              disabled={form.sections.length >= 40}
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن بخش
            </Button>
          </div>
          {form.sections.length === 0 && (
            <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-[11px] text-muted-foreground">
              بخشی اضافه نشده است — هر صفحه از چند بخش «عنوان + متن» تشکیل می‌شود
            </p>
          )}
          {form.sections.map((sec, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-muted-foreground">بخش {(i + 1).toLocaleString("fa-IR")}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    aria-label="انتقال به بالا"
                    disabled={i === 0}
                    onClick={() => setForm((f) => ({ ...f, sections: moveSection(f.sections, i, i - 1) }))}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    aria-label="انتقال به پایین"
                    disabled={i === form.sections.length - 1}
                    onClick={() => setForm((f) => ({ ...f, sections: moveSection(f.sections, i, i + 1) }))}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="حذف بخش"
                    onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                className="rounded-lg"
                value={sec.h}
                onChange={(e) => setSection(i, { h: e.target.value })}
                placeholder="عنوان بخش (مثلاً: شرایط ارسال)"
                aria-label={`عنوان بخش ${i + 1}`}
              />
              <Textarea
                className="rounded-lg"
                rows={4}
                value={sec.p}
                onChange={(e) => setSection(i, { p: e.target.value })}
                placeholder="متن بخش…"
                aria-label={`متن بخش ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-lg" onClick={onClose}>
          انصراف
        </Button>
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          ذخیره صفحه
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AdminCmsPagesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsPageRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "cms-pages"],
    queryFn: () => apiFetch<{ pages: CmsPageRow[] }>("/api/admin/cms-pages"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/cms-pages/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "cms-pages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/cms-pages/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "صفحه حذف شد");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "cms-pages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const pages = data?.pages ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="صفحات محتوایی"
        desc={`${pages.length.toLocaleString("fa-IR")} صفحه — درباره ما، قوانین، سؤالات متداول و…`}
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            صفحه جدید
          </Button>
        }
      />

      {isError ? (
        <EmptyState title="خطا در دریافت صفحات" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : pages.length === 0 ? (
        <EmptyState
          title="صفحه‌ای ثبت نشده است"
          desc="صفحات محتوایی در فوتر سایت و مسیر /info/{slug} نمایش داده می‌شوند"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setDialogOpen(true)}>
              <FileText className="h-4 w-4" />
              صفحه جدید
            </Button>
          }
        />
      ) : (
        <AdminTable headers={["آیکون", "عنوان", "اسلاگ", "بخش‌ها", "ترتیب", "فعال", "عملیات"]}>
          {pages.map((p) => {
            const Icon = (p.icon && ICON_MAP[p.icon]) || FileText;
            return (
              <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </td>
                <td className="p-3">
                  <p className="text-sm font-bold">{p.title}</p>
                  {p.seoTitle && <p className="text-[11px] text-muted-foreground">{p.seoTitle}</p>}
                </td>
                <td className="p-3">
                  <Link
                    href={`/info/${p.slug}`}
                    target="_blank"
                    className="group inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                    dir="ltr"
                  >
                    /info/{p.slug}
                    <ExternalLink className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
                  </Link>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="tabular-nums">
                    {p.sections.length.toLocaleString("fa-IR")} بخش
                  </Badge>
                </td>
                <td className="p-3 text-xs tabular-nums">{p.sortOrder.toLocaleString("fa-IR")}</td>
                <td className="p-3">
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, isActive: v })}
                    disabled={toggleMutation.isPending}
                    aria-label={`فعال بودن ${p.title}`}
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
                        setEditing(p);
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
                      onClick={() => setDeleteTarget(p)}
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
        {dialogOpen && <CmsPageDialog page={editing} onClose={() => setDialogOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف صفحه محتوایی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف صفحه «{deleteTarget?.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
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

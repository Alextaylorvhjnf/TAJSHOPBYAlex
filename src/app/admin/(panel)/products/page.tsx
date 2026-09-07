"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Copy,
  ExternalLink,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  AdminThumb,
  EmptyState,
  ProductStatusBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type Paginated, type ProductRow } from "@/components/admin/api-client";
import { formatPrice } from "@/lib/format";

interface ProductsResponse extends Paginated {
  items: ProductRow[];
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "products", { q: debouncedQ, status, lowStock, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (status && status !== "all") params.set("status", status);
      if (lowStock) params.set("lowStock", "1");
      if (page > 1) params.set("page", String(page));
      const s = params.toString();
      return apiFetch<ProductsResponse>(`/api/admin/products${s ? `?${s}` : ""}`);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<{ message?: string }>(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "به‌روزرسانی شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "محصول کپی شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "کپی ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "محصول حذف شد");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const products = data?.items ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="محصولات"
        desc={`${data ? data.total.toLocaleString("fa-IR") : "…"} محصول در کاتالوگ`}
        actions={
          <Button asChild className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              محصول جدید
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Label htmlFor="p-search" className="mb-1.5 block text-xs text-muted-foreground">جستجو</Label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="p-search"
              className="rounded-lg pr-9"
              placeholder="نام، SKU یا عبارت…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">وضعیت</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="PUBLISHED">منتشر شده</SelectItem>
              <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
              <SelectItem value="ARCHIVED">بایگانی</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex h-9 items-center gap-2">
          <Checkbox
            id="p-lowstock"
            checked={lowStock}
            onCheckedChange={(c) => {
              setLowStock(c === true);
              setPage(1);
            }}
          />
          <Label htmlFor="p-lowstock" className="cursor-pointer text-xs">فقط رو به اتمام</Label>
        </div>
      </div>

      {isError ? (
        <EmptyState title="خطا در دریافت محصولات" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : products.length === 0 ? (
        <EmptyState
          title="محصولی یافت نشد"
          desc="با تغییر فیلترها جستجو کنید یا محصول جدیدی بسازید"
          action={
            <Button asChild variant="outline" size="sm" className="mt-2 rounded-lg">
              <Link href="/admin/products/new">
                <Package className="h-4 w-4" />
                محصول جدید
              </Link>
            </Button>
          }
        />
      ) : (
        <AdminTable
          headers={["محصول", "دسته / برند", "قیمت", "موجودی", "وضعیت", "ویژه", "عملیات"]}
          caption="برای انتشار سریع یا تغییر وضعیت، از منوی عملیات استفاده کنید"
        >
          {products.map((p) => (
            <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <AdminThumb src={p.mainImage} alt={p.name} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/products/${p.id}`} className="block max-w-[220px] truncate text-sm font-bold hover:text-primary">
                        {p.name}
                      </Link>
                      {/* v20: product type badge — ساده (muted) / متغیر (violet) */}
                      <span
                        className={
                          "shrink-0 rounded-full px-1.5 py-px text-[9px] font-black " +
                          (p.productType === "VARIABLE"
                            ? "bg-violet-500/15 text-violet-600"
                            : "bg-muted text-muted-foreground")
                        }
                        title={p.productType === "VARIABLE" ? "محصول متغیر — قیمت هر ترکیب رنگ × مشخصه" : "محصول ساده — قیمت واحد"}
                      >
                        {p.productType === "VARIABLE" ? "متغیر" : "ساده"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">{p.sku}</span>
                  </div>
                </div>
              </td>
              <td className="p-3">
                <p className="text-xs">{p.category?.name ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">{p.brand?.name ?? "—"}</p>
              </td>
              <td className="p-3 whitespace-nowrap">
                {p.discountPrice && p.discountPrice < p.price ? (
                  <div>
                    <p className="text-xs font-black text-emerald-600 tabular-nums">
                      {formatPrice(p.discountPrice)} تومان
                    </p>
                    <p className="text-[11px] text-muted-foreground line-through tabular-nums">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs tabular-nums">{formatPrice(p.price)} تومان</p>
                )}
              </td>
              <td className="p-3">
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums " +
                    (p.stock === 0
                      ? "bg-destructive/15 text-destructive"
                      : p.stock <= 5
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-emerald-500/15 text-emerald-600")
                  }
                >
                  {formatPrice(p.stock)} عدد
                </span>
              </td>
              <td className="p-3"><ProductStatusBadge status={p.status} /></td>
              <td className="p-3">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={p.featured ? "حذف از ویژه‌ها" : "افزودن به ویژه‌ها"}
                    title={p.featured ? "محصول ویژه (Star) — حذف" : "محصول ویژه (Star) — افزودن"}
                    onClick={() => patchMutation.mutate({ id: p.id, body: { featured: !p.featured } })}
                    disabled={patchMutation.isPending}
                    className="rounded-md p-1.5 transition hover:bg-muted"
                  >
                    <Star className={"h-4 w-4 " + (p.featured ? "fill-primary text-primary" : "text-muted-foreground")} />
                  </button>
                  {/* v19: isSpecial (پیشنهاد ویژه) toggle with a visible badge so
                      admins see the special state right in the list */}
                  <button
                    type="button"
                    aria-label={p.isSpecial ? "حذف پیشنهاد ویژه" : "پیشنهاد ویژه کردن"}
                    title={p.isSpecial ? "پیشنهاد ویژه — حذف" : "پیشنهاد ویژه — افزودن"}
                    onClick={() => patchMutation.mutate({ id: p.id, body: { isSpecial: !p.isSpecial } })}
                    disabled={patchMutation.isPending}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1.5 transition hover:bg-muted"
                  >
                    <Sparkles className={"h-4 w-4 " + (p.isSpecial ? "fill-primary text-primary" : "text-muted-foreground")} />
                    {p.isSpecial && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-black text-primary">ویژه</span>
                    )}
                  </button>
                </div>
              </td>
              <td className="p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="عملیات">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground">عملیات محصول</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/products/${p.id}`}>
                        <Pencil className="h-4 w-4 ml-2" />
                        ویرایش
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/products/${p.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4 ml-2" />
                        مشاهده در سایت
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateMutation.mutate(p.id)} disabled={duplicateMutation.isPending}>
                      <Copy className="h-4 w-4 ml-2" />
                      کپی محصول
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        patchMutation.mutate({
                          id: p.id,
                          body: { status: p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
                        })
                      }
                      disabled={patchMutation.isPending}
                    >
                      <UploadCloud className="h-4 w-4 ml-2" />
                      {p.status === "PUBLISHED" ? "لغو انتشار" : "انتشار"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {data && (
        <AdminPagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف محصول</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
              اگر محصول در سفارش‌ها استفاده شده باشد، به‌جای حذف بایگانی می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              حذف قطعی
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

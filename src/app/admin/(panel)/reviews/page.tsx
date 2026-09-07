"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CheckCircle2, MessageSquareText, Star, Trash2, XCircle } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminThumb,
  EmptyState,
  ReviewStatusBadge,
} from "@/components/admin/ui-bits";
import { apiFetch, type Paginated, type ReviewRow } from "@/components/admin/api-client";
import { formatDateTime } from "@/lib/format";
import { AiStudioCard } from "./ai-studio";

interface ReviewsResponse extends Paginated {
  reviews: ReviewRow[];
}

/* v24: the v23 AI comment generator dialog was reworked into the AI COMMENT
 * STUDIO — see ./ai-studio.tsx (coverage status + progress, provider chips,
 * batch generation with live per-product log + single-product mode + recent
 * comments feed). The reviews table / moderation below is unchanged. */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`امتیاز ${rating} از ۵`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-3.5 w-3.5 " + (i < rating ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "reviews", { status, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (page > 1) params.set("page", String(page));
      const s = params.toString();
      return apiFetch<ReviewsResponse>(`/api/admin/reviews${s ? `?${s}` : ""}`);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
  };

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) =>
      apiFetch<{ message?: string }>(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "انجام شد");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "عملیات ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "دیدگاه حذف شد");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "حذف ناموفق بود"),
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="دیدگاه‌ها"
        desc={`${data ? data.total.toLocaleString("fa-IR") : "…"} دیدگاه — بررسی و تأیید دیدگاه‌های کاربران`}
      />

      <AiStudioCard />

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <TabsList className="rounded-lg">
          <TabsTrigger value="PENDING" className="rounded-lg">در انتظار بررسی</TabsTrigger>
          <TabsTrigger value="APPROVED" className="rounded-lg">تأیید شده</TabsTrigger>
          <TabsTrigger value="REJECTED" className="rounded-lg">رد شده</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg">همه</TabsTrigger>
        </TabsList>
      </Tabs>

      {isError ? (
        <EmptyState title="خطا در دریافت دیدگاه‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="دیدگاهی یافت نشد"
          desc={status === "PENDING" ? "دیدگاهی در انتظار بررسی نیست" : "در این دسته دیدگاهی وجود ندارد"}
          action={
            status !== "all" ? (
              <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setStatus("all")}>
                <MessageSquareText className="h-4 w-4" />
                نمایش همه
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <AdminThumb src={r.product?.mainImage} alt={r.product?.name ?? "محصول"} size={48} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.product ? (
                          <Link href={`/products/${r.product.slug}`} target="_blank" className="truncate text-sm font-bold hover:text-primary">
                            {r.product.name}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold">محصول حذف‌شده</span>
                        )}
                        <ReviewStatusBadge status={r.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {`${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""}`.trim() || "کاربر"}
                        </span>
                        <Stars rating={r.rating} />
                        <span>{formatDateTime(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => actionMutation.mutate({ id: r.id, action: "APPROVE" })}
                        disabled={actionMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        تأیید
                      </Button>
                    )}
                    {r.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-amber-600 hover:bg-amber-500/10"
                        onClick={() => actionMutation.mutate({ id: r.id, action: "REJECT" })}
                        disabled={actionMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        رد
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(r)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-muted/40 p-3">
                  {r.title && <p className="mb-1 text-sm font-bold">{r.title}</p>}
                  <p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">{r.comment}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && <AdminPagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف دیدگاه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این دیدگاه مطمئن هستید؟ امتیاز محصول پس از حذف بازمحاسبه می‌شود.
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

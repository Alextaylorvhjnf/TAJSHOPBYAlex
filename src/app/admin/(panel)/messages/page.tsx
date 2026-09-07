"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  CheckCheck,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MailOpen,
  MessagesSquare,
  Phone,
  Save,
  Trash2,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  EmptyState,
  MessageStatusBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, qs } from "@/components/admin/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MessageRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  ip: string | null;
  createdAt: string;
}

interface MessagesResponse {
  messages: MessageRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  statusCounts: { NEW: number; READ: number; REPLIED: number; CLOSED: number };
}

type StatusFilter = "ALL" | "NEW" | "READ" | "REPLIED" | "CLOSED";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "NEW", label: "جدید" },
  { value: "READ", label: "خوانده‌شده" },
  { value: "REPLIED", label: "پاسخ داده شده" },
  { value: "CLOSED", label: "بسته" },
];

function fullName(m: MessageRow): string {
  return `${m.firstName} ${m.lastName}`.trim() || "مشتری";
}

function initials(m: MessageRow): string {
  return fullName(m).slice(0, 1);
}

function contact(m: MessageRow): string {
  return m.email ?? m.phone ?? "—";
}

function MessageDialog({
  message: initial,
  canDelete,
  onClose,
}: {
  message: MessageRow;
  canDelete: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<MessageRow>(initial);
  const [note, setNote] = useState(initial.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    setMsg(initial);
    setNote(initial.adminNote ?? "");
  }, [initial]);

  const invalidate = () => {
    // prefix-invalidates the list queries AND the sidebar unread badge
    queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
  };

  const patch = async (payload: { status?: string; adminNote?: string }, silent = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const json = await apiFetch<{ message?: MessageRow | string; message_text?: string }>(
        `/api/admin/messages/${initial.id}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
      if (json.message && typeof json.message === "object") {
        setMsg(json.message);
        if (payload.adminNote !== undefined) setNote(json.message.adminNote ?? "");
      }
      if (!silent) toast.success(json.message_text ?? "وضعیت پیام به‌روزرسانی شد");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const json = await apiFetch<{ message?: string }>(`/api/admin/messages/${initial.id}`, {
        method: "DELETE",
      });
      toast.success((typeof json.message === "string" && json.message) || "پیام حذف شد");
      invalidate();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  // auto mark-as-read when a NEW message is opened
  useEffect(() => {
    if (initial.status !== "NEW" || markedRef.current === initial.id) return;
    markedRef.current = initial.id;
    patch({ status: "READ" }, true);
  }, [initial, patch]);

  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span className="truncate">{msg.subject}</span>
          <MessageStatusBadge status={msg.status} />
        </DialogTitle>
        <DialogDescription className="text-xs">
          پیام از {fullName(msg)} — {formatDateTime(msg.createdAt)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* sender meta */}
        <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-xs">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span dir="ltr" className="truncate font-mono">{msg.email ?? "—"}</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span dir="ltr" className="truncate font-mono">{msg.phone ?? "—"}</span>
          </p>
          {msg.ip && (
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground sm:col-span-2">
              <span className="shrink-0">IP:</span>
              <span dir="ltr" className="font-mono">{msg.ip}</span>
            </p>
          )}
        </div>

        {/* body */}
        <div className="rounded-lg bg-muted p-3">
          <p className="whitespace-pre-wrap text-sm leading-7">{msg.message}</p>
        </div>

        {/* admin note */}
        <div className="space-y-1.5">
          <Label htmlFor="msg-note" className="text-xs">
            یادداشت مدیر (داخلی — برای مشتری نمایش داده نمی‌شود)
          </Label>
          <Textarea
            id="msg-note"
            rows={3}
            className="rounded-lg"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً: با مشتری تلفنی تماس گرفته شد…"
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={busy || note === (msg.adminNote ?? "")}
              onClick={() => patch({ adminNote: note })}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              ذخیره یادداشت
            </Button>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {msg.status === "NEW" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={busy}
              onClick={() => patch({ status: "READ" })}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              علامت خوانده‌شده
            </Button>
          )}
          {msg.status !== "REPLIED" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-emerald-600 hover:bg-emerald-500/10"
              disabled={busy}
              onClick={() => patch({ status: "REPLIED" })}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              پاسخ داده شد
            </Button>
          )}
          {msg.status !== "CLOSED" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={busy}
              onClick={() => patch({ status: "CLOSED" })}
            >
              <Lock className="h-3.5 w-3.5" />
              بستن
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto rounded-lg text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف پیام
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پیام</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف پیام «{msg.subject}» از {fullName(msg)} مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}

export default function AdminMessagesPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MessageRow | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me"),
  });
  const canDelete =
    meData?.user?.role === "SUPER_ADMIN" || meData?.user?.role === "ADMIN";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "messages", "list", status, page],
    queryFn: () =>
      apiFetch<MessagesResponse>(
        `/api/admin/messages${qs({ status: status === "ALL" ? undefined : status, page, limit: 20 })}`
      ),
  });

  // shared unread badge (same key as sidebar → single polled request)
  const { data: unreadData } = useQuery({
    queryKey: ["admin", "messages", "unread"],
    queryFn: () => apiFetch<{ count: number }>("/api/admin/messages?count=1"),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
  const unread = unreadData?.count ?? 0;

  const messages = data?.messages ?? [];
  const counts = data?.statusCounts ?? { NEW: 0, READ: 0, REPLIED: 0, CLOSED: 0 };
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="پیام‌های مشتریان"
        desc="پیام‌های فرم تماس با ما — جدیدترین‌ها در بالا"
        actions={
          unread > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              {unread.toLocaleString("fa-IR")} پیام خوانده‌نشده
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <MailOpen className="h-3.5 w-3.5" />
              پیام خوانده‌نشده ندارید
            </span>
          )
        }
      />

      {/* status tabs with counts */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="فیلتر وضعیت پیام‌ها">
        {STATUS_TABS.map((t) => {
          const count =
            t.value === "ALL"
              ? pagination?.total ?? counts.NEW + counts.READ + counts.REPLIED + counts.CLOSED
              : counts[t.value];
          const active = status === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={cn(
                "flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.value === "NEW" && count > 0 && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden />
              )}
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-black tabular-nums">
                {count.toLocaleString("fa-IR")}
              </span>
            </button>
          );
        })}
      </div>

      {isError ? (
        <EmptyState title="خطا در دریافت پیام‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : messages.length === 0 ? (
        <EmptyState
          title="پیامی یافت نشد"
          desc={
            status === "ALL"
              ? "هنوز پیامی از فرم تماس با ما ارسال نشده است"
              : "در این وضعیت پیامی وجود ندارد"
          }
          action={
            status !== "ALL" && (
              <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setStatus("ALL")}>
                <MessagesSquare className="h-4 w-4" />
                نمایش همه پیام‌ها
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="max-h-[32rem] overflow-y-auto">
            {messages.map((m) => (
              <li key={m.id} className="border-b last:border-0">
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="flex w-full items-start gap-3 p-3.5 text-right transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  aria-label={`مشاهده پیام ${m.subject}`}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black",
                      m.status === "NEW" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {initials(m)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{fullName(m)}</span>
                      {m.status === "NEW" && (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-label="جدید" />
                      )}
                      <MessageStatusBadge status={m.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{m.subject}</span>
                    <span dir="ltr" className="mt-0.5 block truncate text-right font-mono text-[11px] text-muted-foreground">
                      {contact(m)}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <AdminPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPage={setPage}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && <MessageDialog message={selected} canDelete={canDelete} onClose={() => setSelected(null)} />}
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader, EmptyState, TableSkeleton } from "@/components/admin/ui-bits";
import { apiFetch, qs } from "@/components/admin/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TicketAttachmentBar,
  TicketAttachmentList,
  useTicketUploads,
} from "@/components/tickets/ticket-attachments";
import type { TicketAttachment } from "@/lib/tickets";
import {
  TicketCheck, Loader2, Search, SendHorizonal, XCircle, ShieldCheck, User, Clock, CheckCircle2, Paperclip,
} from "lucide-react";

interface TicketRow {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: string;
  lastReplyAt: string;
  messageCount: number;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  lastMessage: { body: string; isStaff: boolean; createdAt: string; hasAttachments?: boolean } | null;
}

interface ThreadMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  attachments: TicketAttachment[] | null;
  sender: { id: string; name: string; role: string } | null;
}

interface ThreadData {
  ticket: {
    id: string;
    ticketNo: string;
    subject: string;
    status: string;
    createdAt: string;
    user: { name: string; phone: string | null; email: string | null };
    messages: ThreadMessage[];
  };
}

const STATUS_FA: Record<string, string> = {
  OPEN: "در انتظار پاسخ",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};
const STATUS_CLASS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  ANSWERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

type StatusFilter = "" | "OPEN" | "ANSWERED" | "CLOSED" | "ALL";

const FILTER_TABS: { key: StatusFilter; label: string; countKey?: "openCount" | "answeredCount" | "closedCount" }[] = [
  { key: "", label: "فعال" },
  { key: "OPEN", label: "در انتظار پاسخ", countKey: "openCount" },
  { key: "ANSWERED", label: "پاسخ داده شده", countKey: "answeredCount" },
  { key: "CLOSED", label: "بسته", countKey: "closedCount" },
  { key: "ALL", label: "همه" },
];

export default function AdminTicketsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const att = useTicketUploads();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tickets", status, search],
    queryFn: () =>
      apiFetch<{ tickets: TicketRow[]; counts: { openCount: number; answeredCount: number; closedCount: number } }>(
        `/api/admin/tickets${qs({ status: status || undefined, q: search || undefined })}`
      ),
    refetchInterval: 8_000, // live inbox — statuses / previews stay fresh
  });

  // live chat: poll the open thread while the dialog is mounted
  // (enabled: !!openId guards polling when the dialog is closed)
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["admin", "tickets", "thread", openId],
    queryFn: () => apiFetch<ThreadData>(`/api/tickets/${openId}`),
    enabled: !!openId,
    refetchInterval: 2500,
  });

  // auto-scroll the dialog thread: instant on open, smooth on new messages
  const listRef = useRef<HTMLDivElement | null>(null);
  const firstPaint = useRef(true);
  const threadMessages = thread?.ticket?.messages ?? [];
  useEffect(() => {
    firstPaint.current = true; // per-ticket reset
  }, [openId]);
  useEffect(() => {
    if (threadMessages.length === 0) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstPaint.current ? "auto" : "smooth" });
    firstPaint.current = false;
  }, [threadMessages.length, openId]);

  const tickets = data?.tickets ?? [];
  const counts = data?.counts;

  const sendReply = async () => {
    const body = reply.trim();
    if ((!body && att.attachments.length === 0) || !openId) return;
    if (att.uploadingCount > 0) {
      toast.error("ابتدا بارگذاری فایل‌ها تمام شود");
      return;
    }
    setSending(true);
    try {
      await apiFetch(`/api/tickets/${openId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          attachments: att.attachments.length > 0 ? att.attachments : undefined,
        }),
      });
      setReply("");
      att.reset();
      toast.success("پاسخ ارسال شد و برای مشتری اعلان ثبت شد");
      // instant refetch of list + thread (prefix invalidation)
      await qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!openId) return;
    try {
      await apiFetch(`/api/tickets/${openId}/close`, { method: "POST" });
      toast.success("تیکت بسته شد");
      await qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const activeThread = thread?.ticket;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="تیکت‌های پشتیبانی"
        desc="گفتگو با مشتریان — پاسخ شما در حساب کاربری مشتری و اعلان‌های او نمایش داده می‌شود."
      />

      {/* search + filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
          }}
          className="relative min-w-52 flex-1"
        >
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی شماره تیکت، موضوع یا مشتری…"
            className="h-10 rounded-xl ps-9"
            aria-label="جستجوی تیکت‌ها"
          />
        </form>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-colors",
              status === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            aria-pressed={status === tab.key}
          >
            {tab.label}
            {tab.countKey && counts && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {(counts[tab.countKey] ?? 0).toLocaleString("fa-IR")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* list */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="تیکتی یافت نشد"
          desc="با تغییر فیلتر یا جستجو دوباره تلاش کنید."
        />
      ) : (
        <div className="max-h-[62vh] space-y-2.5 overflow-y-auto pe-1">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className="w-full rounded-2xl border bg-card p-4 text-start transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-black tabular-nums" dir="ltr">{t.ticketNo}</span>
                <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-bold", STATUS_CLASS[t.status] ?? "")}>
                  {STATUS_FA[t.status] ?? t.status}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                  <User className="h-3 w-3" aria-hidden /> {t.userName}
                  {t.userPhone && <span className="font-mono text-[10px]" dir="ltr">· {t.userPhone}</span>}
                </span>
                <span className="ms-auto flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                  <Clock className="h-3 w-3" aria-hidden /> {formatDateTime(t.lastReplyAt)}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] font-bold leading-6">{t.subject}</p>
              {t.lastMessage && (
                <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  {t.lastMessage.isStaff
                    ? <span className="shrink-0 font-bold text-primary">پاسخ شما: </span>
                    : <span className="shrink-0 font-bold">مشتری: </span>}
                  <span className="min-w-0 line-clamp-1">{t.lastMessage.body.replace(/\n+/g, " ").slice(0, 130) || "فایل پیوست"}</span>
                  {t.lastMessage.hasAttachments && (
                    <Paperclip className="h-3 w-3 shrink-0 text-primary" aria-label="این پیام فایل پیوست دارد" />
                  )}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* thread dialog */}
      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden" dir="rtl">
          {threadLoading || !activeThread ? (
            <div className="grid h-56 place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex max-h-[80vh] flex-col">
              <DialogHeader className="border-b p-4">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-black tabular-nums" dir="ltr">
                    {activeThread.ticketNo}
                  </span>
                  <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-bold", STATUS_CLASS[activeThread.status] ?? "")}>
                    {STATUS_FA[activeThread.status] ?? activeThread.status}
                  </span>
                  {/* live-chat indicator — customer replies appear automatically */}
                  <span
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                    title="پیام‌های جدید بدون نیاز به بارگذاری مجدد صفحه نمایش داده می‌شود"
                  >
                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    گفتگوی زنده
                  </span>
                  <span className="text-muted-foreground">— {activeThread.subject}</span>
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" aria-hidden /> {activeThread.user.name}
                  </span>
                  {activeThread.user.phone && <span dir="ltr" className="font-mono">{activeThread.user.phone}</span>}
                  {activeThread.user.email && <span dir="ltr" className="font-mono">{activeThread.user.email}</span>}
                  <span>ثبت: {formatDateTime(activeThread.createdAt)}</span>
                </DialogDescription>
              </DialogHeader>

              {/* messages (live — auto-scrolls when new ones arrive) */}
              <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {activeThread.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.isStaff ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-7",
                        m.isStaff ? "border border-primary/30 bg-primary/8" : "bg-primary text-primary-foreground"
                      )}
                    >
                      <p
                        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold"
                        style={{ color: m.isStaff ? "var(--primary)" : "var(--primary-foreground)" }}
                      >
                        {m.isStaff ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : <User className="h-3.5 w-3.5" aria-hidden />}
                        {m.isStaff ? (m.sender?.name ?? "پشتیبانی") : activeThread.user.name}
                        <span className="opacity-60">· {formatDateTime(m.createdAt)}</span>
                      </p>
                      {m.body.length > 0 &&
                        m.body.split("\n").map((line, i) => (
                          <p key={i} className={cn("whitespace-pre-wrap", line.trim() === "" && "h-2")}>{line}</p>
                        ))}
                      {m.attachments && m.attachments.length > 0 && <TicketAttachmentList attachments={m.attachments} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* reply box */}
              <div className="space-y-3 border-t p-4">
                {activeThread.status !== "CLOSED" ? (
                  <>
                    <TicketAttachmentBar
                      pending={att.pending}
                      uploadingCount={att.uploadingCount}
                      inputRef={att.inputRef}
                      onPick={att.pick}
                      onRemove={att.remove}
                      disabled={sending}
                    />
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={3}
                      placeholder={
                        att.attachments.length > 0
                          ? "می‌توانید بدون متن، فقط پیوست بفرستید…"
                          : "پاسخ پشتیبانی را بنویسید — به‌محض ارسال برای مشتری اعلان ثبت می‌شود…"
                      }
                      aria-label="پاسخ پشتیبانی"
                      className="rounded-xl leading-7"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={sendReply}
                        disabled={sending || att.uploadingCount > 0 || (reply.trim().length === 0 && att.attachments.length === 0)}
                        className="h-11 rounded-xl gold-surface text-primary-foreground hover:opacity-90 px-6"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4 me-2" />}
                        {sending ? "در حال ارسال…" : "ارسال پاسخ"}
                      </Button>
                      <Button onClick={closeTicket} variant="outline" className="h-11 rounded-xl px-5 text-xs">
                        <XCircle className="h-4 w-4 me-1.5" /> بستن تیکت
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> این تیکت بسته شده است.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TicketCheck, Loader2, Plus, SendHorizonal, XCircle, Headphones, ChevronLeft, User, ShieldCheck, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TicketAttachmentBar,
  TicketAttachmentList,
  useTicketUploads,
} from "@/components/tickets/ticket-attachments";
import type { TicketAttachment } from "@/lib/tickets";

type TicketRow = {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: string;
  lastReplyAt: string;
  messageCount: number;
  lastMessage: { body: string; isStaff: boolean; createdAt: string; hasAttachments?: boolean } | null;
};

type ThreadMessage = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  attachments: TicketAttachment[] | null;
  sender: { id: string; name: string; role: string } | null;
};

type ThreadData = {
  ticket: {
    id: string;
    ticketNo: string;
    subject: string;
    status: string;
    createdAt: string;
    user: { name: string };
    messages: ThreadMessage[];
  };
};

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

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.ok === false) throw new Error(json.message ?? "خطا در ارتباط با سرور");
  return json as T;
};

/* ── ticket list ─────────────────────────────────────────────── */
function TicketList({ onOpen }: { onOpen: (t: TicketRow) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: () => fetchJson<{ tickets: TicketRow[]; openCount: number }>("/api/tickets"),
    refetchInterval: 10_000, // keep statuses / last-message previews fresh
  });

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tickets = data?.tickets ?? [];
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <TicketCheck className="h-7 w-7" />
        </span>
        <h3 className="text-sm font-black">هنوز تیکتی ثبت نکرده‌اید</h3>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          سؤال یا درخواست خود را به‌صورت تیکت ثبت کنید تا پاسخ کارشناسان دقیقاً همین‌جا نمایش داده شود.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onOpen(t)}
          className="w-full rounded-2xl border bg-card p-4 text-start transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-black tabular-nums" dir="ltr">
              {t.ticketNo}
            </span>
            <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-bold", STATUS_CLASS[t.status] ?? "")}>
              {STATUS_FA[t.status] ?? t.status}
            </span>
            <span className="ms-auto text-[10px] text-muted-foreground tabular-nums">
              {formatDateTime(t.lastReplyAt)}
            </span>
          </div>
          <p className="mt-2 text-[13.5px] font-bold leading-6">{t.subject}</p>
          {t.lastMessage && (
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
              {t.lastMessage.isStaff && <span className="shrink-0 font-bold text-primary">پشتیبانی: </span>}
              <span className="min-w-0 line-clamp-1">{t.lastMessage.body.slice(0, 120) || "فایل پیوست"}</span>
              {t.lastMessage.hasAttachments && (
                <Paperclip className="h-3 w-3 shrink-0 text-primary" aria-label="این پیام فایل پیوست دارد" />
              )}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            {t.messageCount.toLocaleString("fa-IR")} پیام
            <ChevronLeft className="h-3 w-3" aria-hidden />
          </p>
        </button>
      ))}
    </div>
  );
}

/* ── thread view ─────────────────────────────────────────────── */
function TicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const att = useTicketUploads();

  // live chat: poll the thread while it is mounted (unmounts on back →
  // polling stops automatically; refetchIntervalInBackground stays false)
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "thread", id],
    queryFn: () => fetchJson<ThreadData>(`/api/tickets/${id}`),
    refetchInterval: 2500,
  });

  // auto-scroll: instant on first load, smooth when new messages arrive
  const listRef = useRef<HTMLDivElement | null>(null);
  const firstPaint = useRef(true);
  const messages = data?.ticket.messages ?? [];
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior });
    });
  };
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(firstPaint.current ? "auto" : "smooth");
    firstPaint.current = false;
  }, [messages.length, id]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body && att.attachments.length === 0) return;
    if (att.uploadingCount > 0) {
      toast.error("ابتدا بارگذاری فایل‌ها تمام شود");
      return;
    }
    setSending(true);
    try {
      await fetchJson(`/api/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          attachments: att.attachments.length > 0 ? att.attachments : undefined,
        }),
      });
      setReply("");
      att.reset();
      toast.success("پاسخ شما ثبت شد");
      scrollToBottom("smooth");
      await qc.invalidateQueries({ queryKey: ["tickets"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    try {
      await fetchJson(`/api/tickets/${id}/close`, { method: "POST" });
      toast.success("تیکت بسته شد");
      await qc.invalidateQueries({ queryKey: ["tickets"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return null;
  const t = data.ticket;
  const closed = t.status === "CLOSED";

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 rounded-lg px-2 text-xs">
            <ChevronLeft className="h-4 w-4" aria-hidden /> بازگشت
          </Button>
          <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-black tabular-nums" dir="ltr">{t.ticketNo}</span>
          <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-bold", STATUS_CLASS[t.status] ?? "")}>
            {STATUS_FA[t.status] ?? t.status}
          </span>
          {/* live-chat indicator — new messages appear automatically */}
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
        </div>
        <h2 className="mt-3 text-[15px] font-black leading-7">{t.subject}</h2>
        <p className="mt-1 text-[10.5px] text-muted-foreground">ثبت شده در {formatDateTime(t.createdAt)}</p>
      </div>

      {/* messages (live — auto-scrolls when new ones arrive) */}
      <div ref={listRef} className="max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl border bg-card p-4" aria-live="polite">
        {t.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.isStaff ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-7",
                m.isStaff
                  ? "border border-primary/30 bg-primary/8"
                  : "bg-primary text-primary-foreground rounded-bl-md"
              )}
            >
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold" style={{ color: m.isStaff ? "var(--primary)" : "var(--primary-foreground)" }}>
                {m.isStaff ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : <User className="h-3.5 w-3.5" aria-hidden />}
                {m.isStaff ? "پشتیبانی تاج" : "شما"}
                <span className="opacity-60">· {formatDateTime(m.createdAt)}</span>
              </p>
              {m.body.length > 0 &&
                m.body.split("\n").map((line, i) => (
                  <p key={i} className={cn(line.trim() === "" && "h-2")}>{line}</p>
                ))}
              {m.attachments && m.attachments.length > 0 && <TicketAttachmentList attachments={m.attachments} />}
            </div>
          </div>
        ))}
      </div>

      {/* reply box / closed notice */}
      {closed ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-5 text-center text-xs leading-6 text-muted-foreground">
          این تیکت بسته شده است. برای درخواست جدید از دکمه «تیکت جدید» استفاده کنید.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
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
            placeholder={att.attachments.length > 0 ? "می‌توانید بدون متن، فقط پیوست بفرستید…" : "پاسخ خود را بنویسید…"}
            aria-label="پاسخ به تیکت"
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
        </div>
      )}
    </div>
  );
}

/* ── new ticket form ─────────────────────────────────────────── */
function NewTicketForm({ onDone }: { onDone: (id: string) => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const att = useTicketUploads();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 2) {
      setError("موضوع باید حداقل ۲ حرف باشد.");
      return;
    }
    if (message.trim().length < 10 && att.attachments.length === 0) {
      setError("پیام باید حداقل ۱۰ حرف باشد یا فایل پیوست داشته باشید.");
      return;
    }
    if (att.uploadingCount > 0) {
      setError("ابتدا بارگذاری فایل‌ها تمام شود.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const json = await fetchJson<{ ticket: TicketRow }>("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          attachments: att.attachments.length > 0 ? att.attachments : undefined,
        }),
      });
      toast.success(`تیکت ${json.ticket.ticketNo} ثبت شد`);
      att.reset();
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      onDone(json.ticket.id);
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="space-y-1.5">
        <label htmlFor="nt-subject" className="text-[12px] font-bold">
          موضوع <span className="text-destructive">*</span>
        </label>
        <Input
          id="nt-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="مثلاً: سؤال درباره گارانتی گوشی"
          className="h-11 rounded-xl"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="nt-message" className="text-[12px] font-bold">
          پیام شما{att.attachments.length === 0 && message.trim().length < 10 && <span className="text-destructive"> *</span>}
        </label>
        <Textarea
          id="nt-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={att.attachments.length > 0 ? "می‌توانید بدون متن، فقط پیوست بفرستید…" : "درخواست خود را کامل توضیح دهید…"}
          className="rounded-xl leading-7"
        />
      </div>
      <TicketAttachmentBar
        pending={att.pending}
        uploadingCount={att.uploadingCount}
        inputRef={att.inputRef}
        onPick={att.pick}
        onRemove={att.remove}
        disabled={sending}
      />
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[12px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={sending || att.uploadingCount > 0}
        className="h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 px-8"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketCheck className="h-4 w-4 me-2" />}
        {sending ? "در حال ثبت…" : "ثبت تیکت"}
      </Button>
    </form>
  );
}

/* ── page ────────────────────────────────────────────────────── */
export default function MyTicketsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-lg font-black">
          <TicketCheck className="h-6 w-6 text-primary" /> تیکت‌های من
        </h1>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="h-10 rounded-xl gold-surface text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4 me-1.5" /> تیکت جدید
          </Button>
        )}
      </div>

      {creating ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <Headphones className="h-4 w-4 text-primary" /> تیکت جدید
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)} className="h-8 rounded-lg px-2 text-xs">
              انصراف
            </Button>
          </div>
          <NewTicketForm
            onDone={(id) => {
              setCreating(false);
              setOpenId(id);
            }}
          />
        </div>
      ) : openId ? (
        <TicketThread id={openId} onBack={() => setOpenId(null)} />
      ) : (
        <TicketList onOpen={(t) => setOpenId(t.id)} />
      )}

      <p className="text-[11px] leading-6 text-muted-foreground">
        پاسخ‌های پشتیبانی به‌صورت اعلان نیز برای شما ثبت می‌شود. تاریخچه کامل گفتگو همیشه در همین صفحه نگه داشته می‌شود.
      </p>
    </div>
  );
}

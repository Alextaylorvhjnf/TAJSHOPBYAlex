"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** profile shape passed from the server (publicUser) */
type SessionUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const PHONE_RE = /^0?9\d{9}$|^0\d{2,3}-?\d{7,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f: FormState): string | null {
  if (f.firstName.trim().length < 2) return "نام باید حداقل ۲ حرف باشد";
  if (f.lastName.trim().length < 2) return "نام خانوادگی باید حداقل ۲ حرف باشد";
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) return "ایمیل معتبر نیست";
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) return "شماره تماس معتبر نیست";
  if (f.subject.trim().length < 2) return "موضوع باید حداقل ۲ حرف باشد";
  if (f.message.trim().length < 10) return "پیام باید حداقل ۱۰ حرف باشد";
  return null;
}

/**
 * Contact form (v14.1):
 * - rendered ONLY for logged-in users (the page shows a login gate otherwise)
 * - name/email/phone are PREFILLED from the session profile
 * - submission opens a support ticket — the ticket number is shown
 * - no honeypot anymore (it broke real submissions via browser autofill)
 */
export function ContactForm({ user }: { user: SessionUser }) {
  const [form, setForm] = useState<FormState>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNo, setTicketNo] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({ ok: false, message: "خطای شبکه" }))) as {
        ok: boolean;
        message?: string;
        ticketNo?: string;
      };
      if (!res.ok || json.ok === false) {
        // 401 (session expired) / 429 rate-limit / validation come from the API
        setError(json.message ?? "ارسال پیام ناموفق بود. کمی بعد دوباره تلاش کنید.");
        toast.error(json.message ?? "ارسال پیام ناموفق بود");
        return;
      }
      toast.success(json.message ?? "پیام شما با موفقیت ثبت شد");
      setTicketNo(json.ticketNo ?? null);
      setForm((f) => ({ ...f, subject: "", message: "" }));
      setTouched(false);
    } catch {
      setError("خطای شبکه — اتصال اینترنت خود را بررسی کنید.");
      toast.error("خطای شبکه");
    } finally {
      setLoading(false);
    }
  };

  const invalid = (key: keyof FormState): boolean => {
    if (!touched) return false;
    return (
      (key === "firstName" && form.firstName.trim().length < 2) ||
      (key === "lastName" && form.lastName.trim().length < 2) ||
      (key === "email" && !!form.email.trim() && !EMAIL_RE.test(form.email.trim())) ||
      (key === "phone" && !!form.phone.trim() && !PHONE_RE.test(form.phone.trim())) ||
      (key === "subject" && form.subject.trim().length < 2) ||
      (key === "message" && form.message.trim().length < 10)
    );
  };

  if (ticketNo) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
        <h3 className="text-sm font-black">پیام شما ثبت شد</h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          شماره پیگیری تیکت شما: <span className="font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{ticketNo}</span>
          <br />
          پاسخ کارشناسان در بخش «تیکت‌های من» حساب کاربری شما نمایش داده می‌شود.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Button asChild className="h-11 rounded-xl gold-surface text-primary-foreground hover:opacity-90 px-6">
            <a href="/account/tickets">مشاهده تیکت‌های من</a>
          </Button>
          <Button variant="outline" className="h-11 rounded-xl px-6" onClick={() => setTicketNo(null)}>
            ارسال پیام دیگر
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cf-first" className="text-[12px] font-bold">
            نام <span className="text-destructive">*</span>
          </label>
          <Input
            id="cf-first"
            value={form.firstName}
            onChange={set("firstName")}
            className={cn("h-11 rounded-xl", invalid("firstName") && "border-destructive focus-visible:ring-destructive/40")}
            placeholder="مثلاً: علی"
            autoComplete="given-name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cf-last" className="text-[12px] font-bold">
            نام خانوادگی <span className="text-destructive">*</span>
          </label>
          <Input
            id="cf-last"
            value={form.lastName}
            onChange={set("lastName")}
            className={cn("h-11 rounded-xl", invalid("lastName") && "border-destructive focus-visible:ring-destructive/40")}
            placeholder="مثلاً: رضایی"
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cf-email" className="text-[12px] font-bold">
            ایمیل <span className="text-muted-foreground font-normal">(اختیاری)</span>
          </label>
          <Input
            id="cf-email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={set("email")}
            className={cn("h-11 rounded-xl text-start", invalid("email") && "border-destructive focus-visible:ring-destructive/40")}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cf-phone" className="text-[12px] font-bold">
            شماره تماس <span className="text-muted-foreground font-normal">(اختیاری)</span>
          </label>
          <Input
            id="cf-phone"
            dir="ltr"
            inputMode="tel"
            value={form.phone}
            onChange={set("phone")}
            className={cn("h-11 rounded-xl text-start", invalid("phone") && "border-destructive focus-visible:ring-destructive/40")}
            placeholder="09121234567"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-subject" className="text-[12px] font-bold">
          موضوع <span className="text-destructive">*</span>
        </label>
        <Input
          id="cf-subject"
          value={form.subject}
          onChange={set("subject")}
          className={cn("h-11 rounded-xl", invalid("subject") && "border-destructive focus-visible:ring-destructive/40")}
          placeholder="مثلاً: پیگیری سفارش TAJ-XXXX"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-message" className="text-[12px] font-bold">
          پیام شما <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="cf-message"
          value={form.message}
          onChange={set("message")}
          rows={5}
          className={cn("rounded-xl leading-7", invalid("message") && "border-destructive focus-visible:ring-destructive/40")}
          placeholder="پیام خود را کامل توضیح دهید…"
          required
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[12px] font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full sm:w-auto rounded-xl gold-surface px-8 text-[13px] font-bold text-primary-foreground hover:opacity-90 shadow-lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
            در حال ارسال…
          </>
        ) : (
          <>
            <Send className="h-4 w-4 me-2" />
            ارسال پیام
          </>
        )}
      </Button>
    </form>
  );
}

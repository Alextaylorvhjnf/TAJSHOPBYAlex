"use client";

import { useEffect, useState, useRef } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UploadCloud, Loader2, ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ReceiptForm({
  orderNumber,
  total,
  onSubmitted,
}: {
  orderNumber: string;
  total: number;
  onSubmitted?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // NOTE: paidAt must NOT be initialized with `new Date()` in useState —
  // SSR and client hydration resolve different clocks (ms apart), which
  // React 19 reports as an input `value` attribute hydration mismatch
  // ("A tree hydrated but some attributes…"). Empty on the first paint,
  // filled once after mount (hydration-safe).
  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    senderCard: "",
    trackingNumber: "",
    amount: String(total),
    paidAt: "",
  });

  useEffect(() => {
    setForm((f) => (f.paidAt ? f : { ...f, paidAt: new Date().toISOString().slice(0, 16) }));
  }, []);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("فقط تصویر رسید قابل ارسال است");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("حجم تصویر باید حداکثر ۵ مگابایت باشد");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("تصویر رسید را انتخاب کنید");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      fd.append("orderNumber", orderNumber);
      fd.append("senderName", form.senderName);
      fd.append("senderPhone", form.senderPhone);
      fd.append("senderCard", form.senderCard.replace(/\s/g, ""));
      fd.append("trackingNumber", form.trackingNumber);
      fd.append("amount", form.amount.replace(/\D/g, ""));
      fd.append("paidAt", new Date(form.paidAt).toISOString());

      const res = await fetch("/api/payments/c2c/receipt", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "خطا در ارسال رسید");
      toast.success(json.message ?? "رسید ارسال شد");
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
        <h3 className="text-base font-black">رسید شما ارسال شد</h3>
        <p className="text-xs text-muted-foreground mt-2 leading-6">
          کارشناسان ما رسید را بررسی می‌کنند و نتیجه از طریق اعلان اعلام می‌شود.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <UploadCloud className="h-5 w-5 text-primary" /> ارسال رسید پرداخت کارت به کارت
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs mb-1.5">نام و نام خانوادگی پرداخت‌کننده *</Label>
          <Input required minLength={3} value={form.senderName}
            onChange={(e) => setForm({ ...form, senderName: e.target.value })} className="h-10 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">شماره موبایل *</Label>
          <Input required dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" placeholder="09123456789"
            value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}
            className="h-10 rounded-lg text-left" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">شماره کارت پرداخت‌کننده *</Label>
          <Input required dir="ltr" inputMode="numeric" pattern="[0-9]{16}" placeholder="603799•••••••••"
            value={form.senderCard} onChange={(e) => setForm({ ...form, senderCard: e.target.value })}
            className="h-10 rounded-lg text-left" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">مبلغ پرداختی (تومان) *</Label>
          <Input required dir="ltr" inputMode="numeric" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })}
            className="h-10 rounded-lg text-left tabular-nums" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">شماره پیگیری / سریال رسید (اختیاری)</Label>
          <Input dir="ltr" value={form.trackingNumber}
            onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} className="h-10 rounded-lg text-left" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">تاریخ پرداخت *</Label>
          <Input type="datetime-local" required dir="ltr" value={form.paidAt}
            onChange={(e) => setForm({ ...form, paidAt: e.target.value })} className="h-10 rounded-lg text-left" />
        </div>
      </div>

      {/* receipt image */}
      <div>
        <Label className="text-xs mb-1.5">تصویر رسید *</Label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "w-full rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            preview ? "border-primary/50 bg-primary/5" : "hover:border-primary/40 hover:bg-accent/50"
          )}
        >
          {preview ? (
            <div className="space-y-2">
              <img src={preview} alt="پیش‌نمایش رسید" className="mx-auto max-h-40 rounded-lg object-contain" />
              <p className="text-[11px] text-primary font-bold">{file?.name} — برای تغییر کلیک کنید</p>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">تصویر رسید را انتخاب کنید (JPG/PNG/WEBP — حداکثر ۵MB)</p>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          aria-label="انتخاب تصویر رسید"
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "ارسال رسید برای بررسی"}
      </Button>

      <p className="text-[11px] text-muted-foreground leading-5">
        مبلغ سفارش شما: <span className="font-bold text-foreground">{formatPrice(total)} تومان</span> — حتماً همین مبلغ را واریز کنید.
      </p>
    </form>
  );
}

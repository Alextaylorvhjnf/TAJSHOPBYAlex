"use client";

import { useState } from "react";
import Link from "next/link";
import { TAJLogo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSentMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "خطا در بازیابی رمز عبور");
      setSentMessage(json.message);
      toast.success("لینک بازیابی ارسال شد");
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <TAJLogo className="mb-8 justify-center w-full [&>span]:items-center" />
        <div className="rounded-3xl border bg-card p-7 shadow-sm">
          <h1 className="text-lg font-black mb-1.5 text-center">بازیابی رمز عبور</h1>
          <p className="text-xs text-muted-foreground text-center mb-6 leading-6">
            ایمیل یا شماره موبایل حساب خود را وارد کنید
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="forgot-identifier" className="text-xs mb-1.5">ایمیل یا شماره موبایل</Label>
              <Input id="forgot-identifier" required dir="auto" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-5 w-5 me-2" /> ارسال لینک بازیابی</>}
            </Button>
          </form>

          {sentMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-4" role="status">
              <MailCheck className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-6" dir="auto">{sentMessage}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
              <p className="text-[11px] text-destructive leading-6" dir="auto">{error}</p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-5">
            <Link href="/login" className="text-primary font-bold">بازگشت به ورود</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

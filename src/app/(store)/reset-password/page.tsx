"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TAJLogo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, CheckCircle2, ShieldAlert, LogIn } from "lucide-react";
import { toast } from "sonner";

const INVALID_TOKEN_MESSAGE = "این لینک بازیابی رمز عبور معتبر نیست یا منقضی شده است.";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("تکرار رمز عبور مطابقت ندارد");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // invalid / expired / already-used link → same safe message, no details
        setInvalid(true);
        toast.error(json.message ?? INVALID_TOKEN_MESSAGE);
        return;
      }
      setDone(true);
      toast.success("رمز عبور شما با موفقیت تغییر کرد");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">{INVALID_TOKEN_MESSAGE}</p>
        <Button asChild className="gold-surface text-primary-foreground rounded-xl">
          <Link href="/forgot-password">درخواست مجدد</Link>
        </Button>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <ShieldAlert className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-6">{INVALID_TOKEN_MESSAGE}</p>
        </div>
        <Button asChild className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
          <Link href="/forgot-password">درخواست لینک جدید</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-6">
            رمز عبور شما با موفقیت تغییر کرد. برای ورود از رمز عبور جدید استفاده کنید.
          </p>
        </div>
        <Button asChild className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
          <Link href="/login"><LogIn className="h-5 w-5 me-2" /> ورود به حساب</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="reset-pw" className="text-xs mb-1.5">رمز عبور جدید (حداقل ۸ کاراکتر)</Label>
        <Input id="reset-pw" required type="password" dir="ltr" minLength={8} value={password}
          onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl text-left" />
      </div>
      <div>
        <Label htmlFor="reset-pw2" className="text-xs mb-1.5">تکرار رمز عبور جدید</Label>
        <Input id="reset-pw2" required type="password" dir="ltr" minLength={8} value={confirm}
          onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl text-left" />
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-5 w-5 me-2" /> تغییر رمز عبور</>}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <TAJLogo className="mb-8 justify-center w-full [&>span]:items-center" />
        <div className="rounded-3xl border bg-card p-7 shadow-sm">
          <h1 className="text-lg font-black mb-1.5 text-center">تعیین رمز عبور جدید</h1>
          <p className="text-xs text-muted-foreground text-center mb-6">رمز جدید حساب خود را وارد کنید</p>
          <Suspense fallback={<div className="h-44" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

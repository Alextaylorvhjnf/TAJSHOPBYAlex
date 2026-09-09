"use client";

/**
 * LOGIN FORM (task 5-d) — extracted 1:1 from the old (store)/login/page.tsx.
 * ALL logic is byte-identical: fields, validation, /api/auth/login call,
 * toasts, redirect precedence (?redirect → json.redirect → /account),
 * the already-authenticated fast-path. Only the surrounding presentation
 * moved to AuthShell — this file is pure form markup.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useMe } from "@/hooks/use-store";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { syncLogin } = useAuthSync();
  const { data: meData } = useMe();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });

  // already authenticated → skip the form, go straight to the dashboard
  useEffect(() => {
    if (meData?.user) router.replace("/account");
  }, [meData?.user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "خطا در ورود");

      // 1 · sync auth state instantly (header updates without refresh)
      syncLogin(json.user);
      toast.success(`خوش آمدید ${json.user.firstName}!`);

      // 2 · straight to the authenticated dashboard — no intermediate state
      //    admin → /admin | explicit ?redirect → honored | customer → /account
      const requested = sp.get("redirect");
      const target =
        requested && requested !== "/" ? requested : json.redirect && json.redirect !== "/" ? json.redirect : "/account";
      router.push(target);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="identifier" className="text-xs mb-1.5">ایمیل یا شماره موبایل</Label>
        <Input id="identifier" required dir="auto" placeholder="09123456789" value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })} className="h-11 rounded-xl" autoFocus />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" className="text-xs">رمز عبور</Label>
          <Link href="/forgot-password" className="text-[11px] text-primary font-bold hover:opacity-75">فراموشی رمز؟</Link>
        </div>
        <Input id="password" type="password" required dir="ltr" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 rounded-xl text-left" />
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 me-2" /> ورود به حساب</>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        حساب کاربری ندارید؟{" "}
        <Link href="/register" className="text-primary font-bold">ثبت‌نام کنید</Link>
      </p>
    </form>
  );
}

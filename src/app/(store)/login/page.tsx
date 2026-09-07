"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TAJLogo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useMe } from "@/hooks/use-store";

function LoginForm() {
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

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] grid lg:grid-cols-2">
      {/* form side */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <TAJLogo className="mb-8 justify-center w-full [&>span]:items-center" />
          <div className="rounded-3xl border bg-card p-7 shadow-sm">
            <h1 className="text-lg font-black mb-1.5 text-center">ورود به تاج الکترونیکس</h1>
            <p className="text-xs text-muted-foreground text-center mb-6">به حساب خود وارد شوید</p>
            <Suspense fallback={<div className="h-56" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      {/* brand side */}
      <div className="hidden lg:flex hero-mesh relative items-center justify-center p-10">
        <div className="max-w-md text-center space-y-6">
          <Sparkles className="mx-auto h-12 w-12 text-amber-300" />
          <h2 className="text-2xl font-black text-white leading-10">
            سبد خرید، علاقه‌مندی‌ها و
            <br /> سفارش‌هایتان همیشه همراه شما
          </h2>
          <p className="text-sm text-white/60 leading-8">
            با عضویت در تاج الکترونیکس از تخفیف‌های اختصاصی اعضا، پیگیری لحظه‌ای سفارش‌ها
            و مشاوره هوشمند خرید بهره‌مند شوید.
          </p>
        </div>
      </div>
    </div>
  );
}

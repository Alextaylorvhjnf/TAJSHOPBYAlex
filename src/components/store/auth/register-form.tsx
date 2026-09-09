"use client";

/**
 * REGISTER FORM (task 5-d) — extracted 1:1 from the old (store)/register/page.tsx.
 * ALL logic is byte-identical: fields (firstName/lastName/phone/email/password),
 * validation attributes, /api/auth/register call with email||undefined, toasts,
 * post-register redirect to /account, the already-authenticated fast-path.
 * Only the surrounding presentation moved to AuthShell.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useMe } from "@/hooks/use-store";

export function RegisterForm() {
  const router = useRouter();
  const { syncLogin } = useAuthSync();
  const { data: meData } = useMe();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", password: "",
  });

  // already authenticated → straight to the dashboard
  useEffect(() => {
    if (meData?.user) router.replace("/account");
  }, [meData?.user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "خطا در ثبت‌نام");

      // session established server-side — reflect it in the UI instantly
      syncLogin(json.user);
      toast.success("ثبت‌نام با موفقیت انجام شد — خوش آمدید!");

      // auth state established → straight to the user dashboard
      router.push("/account");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5">نام</Label>
          <Input required minLength={2} value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs mb-1.5">نام خانوادگی</Label>
          <Input required minLength={2} value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-11 rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-1.5">شماره موبایل</Label>
        <Input required dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" placeholder="09123456789"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="h-11 rounded-xl text-left" />
      </div>
      <div>
        <Label className="text-xs mb-1.5">ایمیل (اختیاری)</Label>
        <Input type="email" dir="ltr" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl text-left" />
      </div>
      <div>
        <Label className="text-xs mb-1.5">رمز عبور (حداقل ۸ کاراکتر)</Label>
        <Input required type="password" dir="ltr" minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 rounded-xl text-left" />
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5 me-2" /> ایجاد حساب کاربری</>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="text-primary font-bold">وارد شوید</Link>
      </p>
    </form>
  );
}

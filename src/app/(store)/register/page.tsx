"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TAJLogo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useMe } from "@/hooks/use-store";

export default function RegisterPage() {
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
    <div className="min-h-[70vh] grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <TAJLogo className="mb-8 justify-center w-full [&>span]:items-center" />
          <div className="rounded-3xl border bg-card p-7 shadow-sm">
            <h1 className="text-lg font-black mb-1.5 text-center">ثبت‌نام در تاج الکترونیکس</h1>
            <p className="text-xs text-muted-foreground text-center mb-6">در کمتر از یک دقیقه عضو شوید</p>
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
          </div>
        </div>
      </div>

      <div className="hidden lg:flex hero-mesh relative items-center justify-center p-10">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-2xl font-black text-white leading-10">
            به خانواده تاج
            <br /> خوش آمدید
          </h2>
          <ul className="text-sm text-white/70 space-y-3 text-start mx-auto max-w-xs">
            {["پیگیری لحظه‌ای سفارش‌ها", "ذخیره علاقه‌مندی‌ها و سبد خرید", "اطلاع از تخفیف‌های ویژه اعضا", "مشاوره خرید با هوش مصنوعی"].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-store";
import { Loader2, Save, KeyRound, Check, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AVATAR_GROUPS, AVATAR_PRESETS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const { data, isLoading, refetch } = useMe();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  /* v27.1: chosen avatar preset (null = keep cleared/no avatar) */
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setForm({
        firstName: data.user.firstName ?? "",
        lastName: data.user.lastName ?? "",
        email: data.user.email ?? "",
        phone: data.user.phone ?? "",
      });
      if (!avatarDirty) setAvatar(data.user.avatar ?? null);
    }
  }, [data, avatarDirty]);

  const pickAvatar = (src: string) => {
    setAvatar((cur) => (cur === src ? null : src));
    setAvatarDirty(true);
  };

  const clearAvatar = () => {
    setAvatar(null);
    setAvatarDirty(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          // only send the avatar when the user actually touched it
          ...(avatarDirty ? { avatar: avatar ?? null } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message);
      toast.success(json.message);
      setAvatarDirty(false);
      void refetch();
      /* v29 avatar-sync fix: the account SIDEBAR (server-rendered in the
       * account layout) used to keep the OLD avatar after a save while the
       * header (client `me` query) already showed the NEW one — they never
       * matched. router.refresh() re-renders the server sidebar so every
       * surface shows the same avatar at the same time. */
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email || undefined, currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message);
      toast.success("رمز عبور تغییر کرد");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-black">اطلاعات حساب کاربری</h1>

      <form onSubmit={save} className="rounded-2xl border bg-card p-5 space-y-5">
        <h2 className="text-sm font-extrabold">اطلاعات شخصی</h2>

        {/* v27.1: avatar picker — pick a face (girl/man) for the profile */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <ImageIcon className="h-4 w-4 text-primary" />
              آواتار پروفایل
            </p>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-destructive hover:bg-destructive/10"
                onClick={clearAvatar}>
                <Trash2 className="h-3.5 w-3.5 me-1" /> حذف آواتار
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            یک چهره برای آواتار خود انتخاب کنید — در منوی حساب و هدر سایت نمایش داده می‌شود
          </p>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4 md:grid-cols-8">
            {AVATAR_GROUPS.map((g) =>
              AVATAR_PRESETS.filter((p) => p.group === g.id).map((p) => {
                const active = avatar === p.src;
                return (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => pickAvatar(p.src)}
                    aria-pressed={active}
                    aria-label={p.label}
                    title={p.label}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all hover:scale-105",
                      active
                        ? "border-primary shadow-lg shadow-primary/25"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    { }
                    <img src={p.src} alt={p.label} className="h-full w-full object-cover" loading="lazy" />
                    {active && (
                      <span className="absolute bottom-1 end-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5">نام</Label>
            <Input required minLength={2} value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-10 rounded-lg" />
          </div>
          <div>
            <Label className="text-xs mb-1.5">نام خانوادگی</Label>
            <Input required minLength={2} value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-10 rounded-lg" />
          </div>
          <div>
            <Label className="text-xs mb-1.5">شماره موبایل</Label>
            <Input dir="ltr" inputMode="numeric" pattern="09[0-9]{9}" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-lg text-left" />
          </div>
          <div>
            <Label className="text-xs mb-1.5">ایمیل</Label>
            <Input type="email" dir="ltr" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg text-left" />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gold-surface text-primary-foreground hover:opacity-90 rounded-lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 me-1.5" /> ذخیره تغییرات</>}
        </Button>
      </form>

      <form onSubmit={changePw} className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-extrabold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> تغییر رمز عبور
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5">رمز عبور فعلی</Label>
            <Input required type="password" dir="ltr" value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className="h-10 rounded-lg text-left" />
          </div>
          <div>
            <Label className="text-xs mb-1.5">رمز عبور جدید (حداقل ۸ کاراکتر)</Label>
            <Input required type="password" dir="ltr" minLength={8} value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className="h-10 rounded-lg text-left" />
          </div>
        </div>
        <Button type="submit" disabled={pwSaving || !pw.currentPassword || !pw.newPassword} variant="outline" className="rounded-lg">
          {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "تغییر رمز عبور"}
        </Button>
      </form>
    </div>
  );
}

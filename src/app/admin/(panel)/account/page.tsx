"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BadgeCheck,
  Copy,
  Eye,
  EyeOff,
  ImageIcon,
  KeyRound,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { AdminPageHeader, RoleBadge } from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { AvatarUpload } from "@/components/admin/avatar-upload";
import { formatDateTime } from "@/lib/format";
import { useBranding } from "@/components/providers/branding-provider";
import { AVATAR_GROUPS, AVATAR_PRESETS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface MeUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
}

function Field({ label, hint, htmlFor, children }: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminAccountPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  /* v29: admin profile avatar (presets / site logo / custom upload) */
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  /* v29: one-time recovery phrase reveal */
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const branding = useBranding();
  /* does this account already have a recovery phrase? (never the phrase itself) */
  const { data: recoveryStatus } = useQuery({
    queryKey: ["admin", "recovery-code-status"],
    queryFn: () => apiFetch<{ hasRecoveryCode: boolean }>("/api/account/recovery-code"),
  });
  const hasRecoveryCode = !!recoveryStatus?.hasRecoveryCode;

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: MeUser | null }>("/api/auth/me"),
  });

  const user = data?.user;
  // Sync form fields when profile loads (render-phase adjustment — no setState-in-effect)
  const [synced, setSynced] = useState(false);
  if (user && !synced) {
    setSynced(true);
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    if (!avatarDirty) setAvatar(user.avatar ?? null);
  }

  const profileMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          /* v29: only send the avatar when the admin actually touched it */
          ...(avatarDirty ? { avatar: avatar ?? null } : {}),
        }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "ذخیره شد");
      /* v29.2: INSTANT sidebar avatar sync — the AdminShell listens for this
       * event and re-renders the profile card picture without any refresh. */
      window.dispatchEvent(
        new CustomEvent("taj:admin-avatar", { detail: { avatar: avatar ?? null } })
      );
      setAvatarDirty(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.refresh(); // refresh shell (avatar + name in sidebar)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود"),
  });

  /* v29: generate/regenerate the one-time recovery phrase (shown ONCE) */
  const generateRecovery = async () => {
    if (recoveryBusy) return;
    setRecoveryBusy(true);
    try {
      const json = await apiFetch<{ message?: string; recoveryCode?: string }>("/api/account/recovery-code", {
        method: "POST",
      });
      if (json.recoveryCode) {
        setRecoveryCode(json.recoveryCode);
        setCopied(false);
        queryClient.invalidateQueries({ queryKey: ["me"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "recovery-code-status"] });
      } else {
        toast.success(json.message ?? "کد بازیابی ساخته شد");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ساخت کد بازیابی ناموفق بود");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const copyRecovery = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      toast.success("کد بازیابی کپی شد");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("کپی ناموفق — دستی انتخاب و کپی کنید");
    }
  };

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "رمز عبور تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تغییر رمز ناموفق بود"),
  });

  const saveProfile = () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error("نام و نام خانوادگی باید حداقل ۲ کاراکتر باشند");
      return;
    }
    if (!/^09\d{9}$/.test(phone.trim())) {
      toast.error("شماره موبایل معتبر نیست (مثال: 09123456789)");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("ایمیل معتبر نیست");
      return;
    }
    profileMutation.mutate();
  };

  const changePassword = () => {
    if (newPassword.length < 8) {
      toast.error("رمز جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تکرار رمز جدید مطابقت ندارد");
      return;
    }
    passwordMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="حساب من"
        desc="مدیریت اطلاعات ورود و امنیت حساب مدیر"
      />

      {/* Identity summary — v29: real avatar (preset/upload/site logo) */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-lg font-black text-primary">
            {avatar ? (
              <img src={avatar} alt="آواتار مدیر" className="h-full w-full object-cover" />
            ) : (
              (user.firstName ?? "م").slice(0, 1)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">{`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "بی‌نام"}</p>
              <RoleBadge role={user.role} />
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
              {user.email ?? user.phone}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">عضویت: {formatDateTime(user.createdAt)}</p>
        </CardContent>
      </Card>

      {/* v29: avatar picker — presets + site logo + custom upload (mirrors the
          customers' account page, plus the store-logo option for admins) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <ImageIcon className="h-4 w-4 text-primary" />
            آواتار مدیر
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            چهرهٔ حساب شما — در منوی کناری پنل، «حساب من» و هدر سایت (وقتی وارد فروشگاه باشید) نمایش داده می‌شود. با «ذخیره اطلاعات» ثبت می‌شود.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {AVATAR_GROUPS.map((g) =>
              AVATAR_PRESETS.filter((p) => p.group === g.id).map((p) => {
                const active = avatar === p.src;
                return (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => {
                      setAvatar((cur) => (cur === p.src ? null : p.src));
                      setAvatarDirty(true);
                    }}
                    aria-pressed={active}
                    aria-label={p.label}
                    title={p.label}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-2xl border-2 transition-all hover:scale-105",
                      active
                        ? "border-primary shadow-lg shadow-primary/25"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={p.src} alt={p.label} className="h-full w-full object-cover" loading="lazy" />
                    {active && (
                      <span className="absolute bottom-0.5 end-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <BadgeCheck className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
            {/* site-logo option */}
            <button
              type="button"
              onClick={() => {
                const siteLogo = branding.logo || "/brand/logo-mark.webp";
                setAvatar((cur) => (cur === siteLogo ? null : siteLogo));
                setAvatarDirty(true);
              }}
              aria-pressed={avatar === (branding.logo || "/brand/logo-mark.webp")}
              title="لوگوی فروشگاه"
              className={cn(
                "relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 bg-muted/40 transition-all hover:scale-105",
                avatar === (branding.logo || "/brand/logo-mark.webp")
                  ? "border-primary shadow-lg shadow-primary/25"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img src={branding.logo || "/brand/logo-mark.webp"} alt="لوگوی فروشگاه" className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 bg-background/85 py-0.5 text-[7px] font-bold text-muted-foreground">
                لوگوی فروشگاه
              </span>
            </button>
          </div>
          {/* v29.3 (13-e): dedicated avatar tile — always clickable, local
              preview (image + filename + size), re-pick REPLACES the previous
              image; no «حذف آواتار» needed first. The generic ImageUpload used
              to collapse to ~0px width here (absolute-positioned preview inside
              a flex row) making it unclickable after the first upload. */}
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold">تصویر اختصاصی (اختیاری)</p>
              <p className="text-[10px] leading-4 text-muted-foreground">
                انتخاب دستی اولویت دارد — با کلیک روی تصویر، هر زمان می‌توانید تصویر جدیدی را جایگزین کنید (JPG / PNG / WebP تا ۵MB)
              </p>
            </div>
            <AvatarUpload
              folder="avatars"
              value={avatar?.startsWith("/uploads/") ? avatar : null}
              onChange={(url) => {
                setAvatar(url);
                setAvatarDirty(true);
              }}
            />
          </div>
          {avatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 rounded-lg px-4 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setAvatar(null);
                setAvatarDirty(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف آواتار
            </Button>
          )}
        </CardContent>
      </Card>

      {/* v29: recovery phrase — the one-time «کلید نجات» of this account */}
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4 text-amber-600" />
            کد بازیابی حساب (عبارت بازیابی)
          </CardTitle>
          <p className="text-[11px] leading-5 text-muted-foreground">
            اگر روزی رمز عبور را فراموش کردید، با همین عبارت از صفحهٔ ورود مدیران («فراموشی رمز عبور؟») وارد شوید و رمز جدید بگذارید. عبارت فقط <b>یک بار</b> هنگام ساخت نمایش داده می‌شود و دیگر هرگز قابل مشاهته نیست — آن را جای امنی یادداشت کنید.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {recoveryCode ? (
            <div className="space-y-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="flex items-center gap-1.5 text-xs font-black text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                همین حالا ذخیره‌اش کنید — این تنها بار نمایش است!
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <code dir="ltr" className="flex-1 select-all break-all font-mono text-sm font-bold tracking-wide">
                  {recoveryCode}
                </code>
                <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg" onClick={copyRecovery} aria-label="کپی کد بازیابی">
                  {copied ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] leading-5 text-muted-foreground">
                با «تولید کد جدید» می‌توانید هر زمان عبارت را باطل و عبارت تازه بسازید (عبارت قبلی دیگر کار نمی‌کند).
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
              {hasRecoveryCode ? (
                <>این حساب یک کد بازیابی فعال دارد (به‌صورت رمزشده ذخیره شده و قابل نمایش نیست). «تولید کد جدید» عبارت قبلی را باطل می‌کند.</>
              ) : (
                <>این حساب هنوز کد بازیابی ندارد — پیشنهاد می‌کنیم همین حالا یکی بسازید.</>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={recoveryCode ? "outline" : "default"}
              className="rounded-lg"
              onClick={generateRecovery}
              disabled={recoveryBusy}
            >
              {recoveryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {recoveryCode ? "تولید کد جدید (باطل کردن قبلی)" : hasRecoveryCode ? "باطل و ساخت کد جدید" : "ساخت کد بازیابی"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <UserRound className="h-4 w-4 text-primary" />
              اطلاعات حساب (ایمیل / موبایل برای ورود)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام" htmlFor="acc-first">
                <Input id="acc-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-lg" />
              </Field>
              <Field label="نام خانوادگی" htmlFor="acc-last">
                <Input id="acc-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-lg" />
              </Field>
            </div>
            <Field label="ایمیل (اختیاری)" htmlFor="acc-email" hint="می‌توانید با ایمیل یا موبایل وارد شوید">
              <Input id="acc-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" placeholder="admin@example.com" />
            </Field>
            <Field label="شماره موبایل" htmlFor="acc-phone" hint="شماره موبایل برای ورود و پیگیری سفارش‌ها">
              <Input id="acc-phone" dir="ltr" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg" placeholder="09123456789" />
            </Field>
            <Button
              className="gold-surface w-full rounded-lg text-primary-foreground hover:opacity-90"
              onClick={saveProfile}
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره اطلاعات
            </Button>
          </CardContent>
        </Card>

        {/* Password form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <KeyRound className="h-4 w-4 text-primary" />
              تغییر رمز عبور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="رمز عبور فعلی" htmlFor="acc-cur">
              <div className="relative">
                <Input
                  id="acc-cur"
                  type={showCurrent ? "text" : "password"}
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-lg pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showCurrent ? "پنهان کردن رمز" : "نمایش رمز"}
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="رمز عبور جدید" htmlFor="acc-new" hint="حداقل ۸ کاراکتر">
              <div className="relative">
                <Input
                  id="acc-new"
                  type={showNew ? "text" : "password"}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-lg pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showNew ? "پنهان کردن رمز" : "نمایش رمز"}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="تکرار رمز عبور جدید" htmlFor="acc-confirm">
              <Input
                id="acc-confirm"
                type={showNew ? "text" : "password"}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-lg"
                autoComplete="new-password"
              />
            </Field>
            <Button
              className="w-full rounded-lg"
              variant="outline"
              onClick={changePassword}
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              تغییر رمز عبور
            </Button>
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              پس از تغییر رمز، همه نشست‌های دیگر این حساب خاتمه می‌یابند و فقط همین مرورگر وارد می‌ماند.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

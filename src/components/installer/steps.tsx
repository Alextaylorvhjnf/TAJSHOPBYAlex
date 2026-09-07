"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Database as DatabaseIcon,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Package,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Banner,
  Field,
  LogView,
  RunIcon,
  StatusIcon,
  passwordStrength,
  type AdminFormState,
  type DbInfo,
  type DbSetupResult,
  type DbTestResult,
  type RequirementItem,
  type RunStep,
} from "@/components/installer/bits";
import { cn } from "@/lib/utils";

/* ───────── Step 1 — Welcome ───────── */

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-6 py-4 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/12"
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </motion.div>
      <div className="space-y-2">
        <h2 className="text-xl font-black md:text-2xl">به جادوی نصب خوش آمدید</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          فروشگاه شما تنها در چند گام ساده آماده می‌شود؛ بدون نیاز به دانش فنی یا اجرای دستورات.
        </p>
      </div>
      <ul className="mx-auto grid max-w-sm gap-2 text-right text-xs text-muted-foreground">
        {[
          "بررسی خودکار پیش‌نیازهای سرور",
          "راه‌اندازی خودکار دیتابیس و جدول‌ها",
          "ساخت حساب مدیر کل",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {t}
          </li>
        ))}
      </ul>
      <Button
        onClick={onStart}
        className="gold-surface h-11 w-full max-w-xs rounded-xl text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90"
      >
        شروع نصب
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ───────── Step 2 — Requirements ───────── */

export function RequirementsStep({
  loading,
  items,
  ready,
  onRetry,
  onContinue,
}: {
  loading: boolean;
  items: RequirementItem[];
  ready: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const criticalFails = items.filter((i) => i.critical && i.status === "fail");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <ShieldCheck className="h-5 w-5 text-primary" />
          بررسی پیش‌نیازهای سیستم
        </h2>
        <p className="text-xs text-muted-foreground">محیط سرور به‌صورت خودکار بررسی می‌شود — نیازی به کار خاصی ندارید.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                item.status === "fail" && item.critical && "border-destructive/30 bg-destructive/5",
                item.status === "warn" && "border-amber-500/25 bg-amber-500/5"
              )}
            >
              <StatusIcon status={item.status} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                  {item.label}
                  {item.status === "pass" && <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">تأیید شد</span>}
                  {item.status === "warn" && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">هشدار</span>}
                  {item.status === "fail" && <span className="text-[10px] font-medium text-destructive">ناموفق</span>}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      {criticalFails.length > 0 && !loading && (
        <Banner kind="error">
          <p className="font-bold">نصب نمی‌تواند ادامه یابد:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {criticalFails.map((f) => (
              <li key={f.id}>{f.detail}</li>
            ))}
          </ul>
          <p className="mt-1.5">پس از رفع مشکل، «بررسی مجدد» را بزنید. جزئیات برای پشتیبانی در لاگ سرور ثبت می‌شود.</p>
        </Banner>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onRetry} disabled={loading} className="h-10 flex-1 rounded-xl text-xs">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          بررسی مجدد
        </Button>
        <Button
          onClick={onContinue}
          disabled={loading || !ready}
          className="gold-surface h-10 flex-1 rounded-xl text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          ادامه
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ───────── Step 3 — Database ───────── */

export function DatabaseStep({
  dbInfo,
  test,
  testing,
  onTest,
  setup,
  settingUp,
  onSetup,
  onContinue,
}: {
  dbInfo: DbInfo | null;
  test: DbTestResult | null;
  testing: boolean;
  onTest: () => void;
  setup: DbSetupResult | null;
  settingUp: boolean;
  onSetup: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <DatabaseIcon className="h-5 w-5 text-primary" />
          راه‌اندازی دیتابیس
        </h2>
        <p className="text-xs text-muted-foreground">
          دیتابیس برنامه <b>SQLite</b> است — بدون نیاز به سرور، نام کاربری یا رمز جداگانه.
        </p>
      </div>

      <div className="grid gap-2 rounded-xl border bg-muted/40 p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            نوع دیتابیس
          </span>
          <span className="font-bold">SQLite (فایل محلی)</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">مسیر فایل</span>
          <span className="truncate font-mono text-[10px]" dir="ltr" title={dbInfo?.path ?? "—"}>
            {dbInfo?.path ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">وضعیت فایل</span>
          <span className={cn("font-bold", dbInfo?.exists ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {dbInfo?.exists ? "موجود" : "هنوز ایجاد نشده (طبیعی)"}
          </span>
        </div>
      </div>

      <Banner kind="info">
        <span className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          نصب <b>غیرمخرب</b> است؛ اگر داده‌هایی در دیتابیس وجود داشته باشد، حفظ می‌شوند و هیچ جدول یا داده‌ای حذف نمی‌شود.
        </span>
      </Banner>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onTest} disabled={testing || settingUp} className="h-10 flex-1 rounded-xl text-xs">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseIcon className="h-4 w-4" />}
          تست اتصال
        </Button>
        <Button
          onClick={onSetup}
          disabled={settingUp || testing}
          className="gold-surface h-10 flex-1 rounded-xl text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          {settingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {settingUp ? "در حال اجرای مایگریشن‌ها…" : "راه‌اندازی دیتابیس"}
        </Button>
      </div>

      {test && !settingUp && (
        <Banner kind={test.success ? "success" : "error"}>
          {test.message}
          {test.success && test.tables > 0 && <span className="mt-0.5 block text-[10px] opacity-80">جدول‌های موجود: {test.tables} — حفظ می‌شوند</span>}
        </Banner>
      )}

      {(settingUp || setup) && (
        <div className="space-y-2">
          <LogView
            lines={
              settingUp
                ? ["$ prisma db push --skip-generate", "در حال اعمال اسکیمای دیتابیس…"]
                : ["$ prisma db push --skip-generate", ...(setup?.log ?? [])]
            }
            running={settingUp}
          />
          {setup && !settingUp && <Banner kind={setup.success ? "success" : "error"}>{setup.message}</Banner>}
        </div>
      )}

      {setup?.success && !settingUp && (
        <Button onClick={onContinue} className="gold-surface h-11 w-full rounded-xl text-sm font-bold text-primary-foreground hover:opacity-90">
          ادامه
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ───────── Step 4 — Admin account ───────── */

export function AdminStep({
  form,
  onChange,
  errors,
  onSubmit,
  demoCatalog,
  onDemoCatalogChange,
}: {
  form: AdminFormState;
  onChange: (patch: Partial<AdminFormState>) => void;
  errors: Partial<Record<keyof AdminFormState, string>>;
  onSubmit: () => void;
  /* v29: demo-catalog option (default on) */
  demoCatalog: boolean;
  onDemoCatalogChange: (v: boolean) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const strength = passwordStrength(form.password);
  const valid =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    /^09\d{9}$/.test(form.phone.trim()) &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.password.length >= 8 &&
    /[A-Za-z]/.test(form.password) &&
    /\d/.test(form.password) &&
    form.password === form.passwordConfirm;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <UserRound className="h-5 w-5 text-primary" />
          ساخت حساب مدیر کل
        </h2>
        <p className="text-xs text-muted-foreground">
          از این حساب برای ورود به پنل مدیریت استفاده می‌شود — بالاترین سطح دسترسی برنامه.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام" htmlFor="ins-first" error={errors.firstName}>
          <Input id="ins-first" value={form.firstName} onChange={(e) => onChange({ firstName: e.target.value })} className="rounded-xl" placeholder="مثلاً: رضا" autoComplete="given-name" />
        </Field>
        <Field label="نام خانوادگی" htmlFor="ins-last" error={errors.lastName}>
          <Input id="ins-last" value={form.lastName} onChange={(e) => onChange({ lastName: e.target.value })} className="rounded-xl" placeholder="مثلاً: محمدی" autoComplete="family-name" />
        </Field>
      </div>

      <Field label="نام کاربری (شماره موبایل)" htmlFor="ins-phone" hint="با این شماره یا ایمیل وارد پنل می‌شوید" error={errors.phone}>
        <div className="relative">
          <Input
            id="ins-phone"
            dir="ltr"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d]/g, "") })}
            className="rounded-xl pr-9"
            placeholder="09123456789"
            autoComplete="tel"
          />
          <Smartphone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </Field>

      <Field label="ایمیل مدیر" htmlFor="ins-email" hint="برای ورود و بازیابی رمز عبور" error={errors.email}>
        <div className="relative">
          <Input
            id="ins-email"
            dir="ltr"
            type="email"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="rounded-xl pr-9"
            placeholder="admin@example.com"
            autoComplete="email"
          />
          <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="رمز عبور" htmlFor="ins-pw" hint="حداقل ۸ کاراکتر، شامل حرف و عدد" error={errors.password}>
          <div className="relative">
            <Input
              id="ins-pw"
              dir="ltr"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
              className="rounded-xl pr-9"
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={showPw ? "پنهان کردن رمز" : "نمایش رمز"}
              onClick={() => setShowPw((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {form.password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full transition-all duration-300", strength.tone)} style={{ width: `${strength.pct}%` }} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </Field>
        <Field label="تکرار رمز عبور" htmlFor="ins-pw2" error={errors.passwordConfirm}>
          <Input
            id="ins-pw2"
            dir="ltr"
            type={showPw ? "text" : "password"}
            value={form.passwordConfirm}
            onChange={(e) => onChange({ passwordConfirm: e.target.value })}
            className="rounded-xl"
            autoComplete="new-password"
          />
        </Field>
      </div>

      <Banner kind="warn">
        <span className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          رمز عبور به‌صورت امن (bcrypt) ذخیره می‌شود و هرگز به‌صورت متنی نگه‌داری نمی‌شود. آن را در جای امنی یادداشت کنید.
        </span>
      </Banner>

      {/* v29 · demo catalog option — applies the shipped demo content
          (37 products with galleries, 21 categories, 16 brands, 3 sliders,
          16 stories, CMS pages, footer links, coupons, delivery methods)
          right after the admin account is created */}
      <label
        htmlFor="ins-demo-catalog"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 transition-colors hover:bg-primary/10"
      >
        <Checkbox
          id="ins-demo-catalog"
          checked={demoCatalog}
          onCheckedChange={(v) => onDemoCatalogChange(v === true)}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Package className="h-4 w-4 text-primary" />
            نصب کاتالوگ نمونه فروشگاه
          </span>
          <span className="block text-[11px] leading-relaxed text-muted-foreground">
            ۳۷ محصول نمونه (همراه با گالری تصاویر)، ۲۱ دسته‌بندی، ۱۶ برند، اسلایدرها، استوری‌ها، صفحات راهنما و روش‌های ارسال —
            برای تست و نمایش فروشگاه. بعداً می‌توانید همه را از پنل مدیریت ویرایش یا حذف کنید. اگر فروشگاه خالی می‌خواهید، این گزینه را خاموش کنید.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={!valid} className="gold-surface h-11 w-full rounded-xl text-sm font-bold text-primary-foreground hover:opacity-90">
        <UserRound className="h-4 w-4" />
        ایجاد حساب و شروع نصب نهایی
      </Button>
    </form>
  );
}

/* ───────── Step 5 — Installing (real progress) ───────── */

export function InstallingStep({ steps, onRetry, retrying }: { steps: RunStep[]; onRetry: () => void; retrying: boolean }) {
  const failed = steps.find((s) => s.status === "failed");
  const doneCount = steps.filter((s) => s.status === "done").length;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Rocket className="h-5 w-5 text-primary" />
          نصب نهایی در حال انجام است
        </h2>
        <p className="text-xs text-muted-foreground">لطفاً این صفحه را نبندید — هر مرحله یک عملیات واقعی روی سرور است.</p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="gold-surface h-full transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-sm",
              s.status === "failed" && "border-destructive/30 bg-destructive/5",
              s.status === "running" && "border-primary/30 bg-primary/5",
              s.status === "done" && "border-emerald-500/25 bg-emerald-500/5"
            )}
          >
            <RunIcon status={s.status} />
            <span className={cn("flex-1 font-medium", s.status === "pending" && "text-muted-foreground")}>{s.label}</span>
            {s.status === "done" && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">انجام شد</span>}
          </motion.li>
        ))}
      </ol>

      {failed && (
        <div className="space-y-3">
          <Banner kind="error">
            <p className="font-bold">نصب در این مرحله متوقف شد.</p>
            <p className="mt-0.5">{failed.error ?? "خطای نامشخص — لطفاً دوباره تلاش کنید."}</p>
          </Banner>
          <Button onClick={onRetry} disabled={retrying} className="gold-surface h-10 w-full rounded-xl text-xs font-bold text-primary-foreground hover:opacity-90">
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            تلاش مجدد از همین مرحله
          </Button>
        </div>
      )}
    </div>
  );
}

/* ───────── Step 6 — Done ───────── */

/* ═══════════ v29 · one-time recovery phrase card (install DoneStep) ═══════════ */

/**
 * «کد بازیابی حساب» — shown EXACTLY ONCE at the end of the installation.
 * The admin is told to save it somewhere safe: if the password is ever
 * forgotten, this phrase logs them in from /admin/login → «فراموشی رمز».
 * It is never displayed again (only a SHA-256 hash lives in the DB) —
 * regenerating from «حساب من» invalidates this one.
 */
function RecoveryCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* manual copy fallback */
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 text-right"
      role="alert"
    >
      <p className="flex items-center gap-2 text-sm font-black text-amber-600">
        <KeyRound className="h-4 w-4" />
        کد بازیابی حساب مدیر — همین حالا در جای امن ذخیره کنید!
      </p>
      <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
        اگر روزی رمز عبور را فراموش کردید، با این عبارت از صفحهٔ ورود مدیران («رمز عبور را فراموش کرده‌اید؟ ورود با کد بازیابی») وارد شوید و رمز جدید تعیین کنید.
        این کد <b>فقط همین یک‌بار</b> نمایش داده می‌شود، در دیتابیس فقط نسخهٔ رمزشدهٔ آن ذخیره می‌شود و دیگر هرگز قابل مشاهته نیست.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border bg-card p-3">
        <code dir="ltr" className="flex-1 select-all break-all font-mono text-sm font-black tracking-wide">
          {code}
        </code>
        <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg" onClick={copy} aria-label="کپی کد بازیابی">
          {copied ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        نکته: از «پنل مدیریت ← حساب من ← کد بازیابی» می‌توانید هر زمان کد جدیدی بسازید (کد قبلی باطل می‌شود).
      </p>
    </motion.div>
  );
}

export function DoneStep({
  admin,
  recoveryCode,
}: {
  admin: { email: string | null; phone: string | null; firstName?: string | null; lastName?: string | null } | null;
  /* v29: the one-time recovery phrase — NULL for a reused retry account */
  recoveryCode?: string | null;
}) {
  // hydration-safe read of a client-only value (window.location.origin):
  // server snapshot returns "" and React adopts the client snapshot post-hydration
  const emptySubscribe = () => () => {};
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ""
  );
  const name = `${admin?.firstName ?? ""} ${admin?.lastName ?? ""}`.trim() || "مدیر کل";

  return (
    <div className="space-y-6 py-4 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="relative mx-auto"
      >
        <motion.span
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-emerald-500/40"
        />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-11 w-11 text-emerald-500" />
        </span>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-xl font-black md:text-2xl">نصب با موفقیت تکمیل شد</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          فروشگاه <b>تاج الکترونیکس</b> نصب شد و آماده استفاده است.
        </p>
      </div>

      <div className="grid gap-2 rounded-xl border bg-muted/40 p-4 text-right text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">حساب مدیر کل</span>
          <span className="font-bold">{name}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">ایمیل (نام کاربری)</span>
          <span className="truncate font-mono text-[11px]" dir="ltr">{admin?.email ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">موبایل (نام کاربری)</span>
          <span className="font-mono text-[11px]" dir="ltr">{admin?.phone ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">آدرس فروشگاه</span>
          <span className="truncate font-mono text-[11px]" dir="ltr">{origin || "/"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">آدرس پنل مدیریت</span>
          <span className="font-mono text-[11px]" dir="ltr">{origin}/admin</span>
        </div>
      </div>

      {/* v29: ONE-TIME recovery phrase — «کلید نجات» the admin must save */}
      {recoveryCode && <RecoveryCodeCard code={recoveryCode} />}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild className="gold-surface h-11 rounded-xl text-sm font-bold text-primary-foreground hover:opacity-90">
          <a href="/admin">
            ورود به پنل مدیریت
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl text-sm font-bold">
          <a href="/">
            مشاهده فروشگاه
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <Banner kind="success">
        <span className="flex items-start gap-1.5">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          برای امنیت، دسترسی به <span dir="ltr" className="font-mono">/install</span> از این پس برای همیشه غیرفعال است و نصب مجدد ممکن نیست.
          تنظیمات درگاه پرداخت و هوش مصنوعی را بعد از ورود، از «پنل مدیریت ← تنظیمات» انجام دهید.
        </span>
      </Banner>
    </div>
  );
}

/* ───────── Already installed fallback ───────── */

export function AlreadyInstalledScreen() {
  return (
    <div className="space-y-6 py-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12">
        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
      </span>
      <h2 className="text-lg font-black">نصب قبلاً تکمیل شده است</h2>
      <p className="text-sm text-muted-foreground">لطفاً به‌طور عادی وارد برنامه شوید.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild className="gold-surface h-11 rounded-xl text-sm font-bold text-primary-foreground hover:opacity-90">
          <a href="/">مشاهده فروشگاه</a>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl text-sm font-bold">
          <a href="/admin">پنل مدیریت</a>
        </Button>
      </div>
    </div>
  );
}

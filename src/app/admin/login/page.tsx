"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  LogIn,
  Server,
  ShieldAlert,
  Smartphone,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "PRODUCT_MANAGER", "ORDER_MANAGER"];

const REMEMBER_KEY = "taj-admin-login-id";

/* ═══ TAJ — Cyberpunk Access Terminal · scoped al-* styles (v25-A1) ═══ */
const TERMINAL_CSS = `
/* HUD corner brackets — cyan top / magenta bottom */
.al-br { position: absolute; width: 22px; height: 22px; pointer-events: none; }
.al-br-tl { top: -6px; right: -6px; border-top: 2px solid #22D3EE; border-right: 2px solid #22D3EE; filter: drop-shadow(0 0 6px rgba(34,211,238,.65)); }
.al-br-tr { top: -6px; left: -6px; border-top: 2px solid #22D3EE; border-left: 2px solid #22D3EE; filter: drop-shadow(0 0 6px rgba(34,211,238,.65)); }
.al-br-bl { bottom: -6px; right: -6px; border-bottom: 2px solid #E879F9; border-right: 2px solid #E879F9; filter: drop-shadow(0 0 6px rgba(232,121,249,.6)); }
.al-br-br { bottom: -6px; left: -6px; border-bottom: 2px solid #E879F9; border-left: 2px solid #E879F9; filter: drop-shadow(0 0 6px rgba(232,121,249,.6)); }

/* CRT scanline overlay (subtle, static) */
.al-scanlines { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 1px, transparent 3px); }

/* slow scan-beam sweep across the card */
.al-beam { position: absolute; left: 0; right: 0; top: -120px; height: 96px; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(34,211,238,.05) 42%, rgba(34,211,238,.1) 50%, rgba(34,211,238,.05) 58%, transparent); animation: al-beam 7s linear infinite; }
@keyframes al-beam { to { top: 110%; } }

/* animated dual-neon gradient title */
.al-title { background: linear-gradient(90deg, #22D3EE 0%, #E879F9 50%, #22D3EE 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: al-shine 5s linear infinite; filter: drop-shadow(0 0 16px rgba(34,211,238,.35)) drop-shadow(0 0 26px rgba(232,121,249,.22)); }
@keyframes al-shine { to { background-position: 200% center; } }

/* typing-cursor block */
.al-cursor::after { content: ""; display: inline-block; width: 9px; height: 15px; margin-right: 7px; vertical-align: -2px; background: #22D3EE; box-shadow: 0 0 10px rgba(34,211,238,.9); animation: al-blink 1.1s steps(2, start) infinite; }
@keyframes al-blink { 50% { opacity: 0; } }

/* pulsing green secure dot */
.al-dot { position: relative; display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #34D399; box-shadow: 0 0 8px rgba(52,211,153,.9); }
.al-dot::after { content: ""; position: absolute; inset: -4px; border-radius: 9999px; border: 1px solid rgba(52,211,153,.65); animation: al-ping 2s cubic-bezier(0,0,.2,1) infinite; }
@keyframes al-ping { 0% { transform: scale(.45); opacity: 1; } 80%, 100% { transform: scale(1.5); opacity: 0; } }

/* neon brand tile */
.al-logo { border: 1px solid rgba(34,211,238,.4); background: linear-gradient(160deg, rgba(34,211,238,.14), rgba(232,121,249,.08)); box-shadow: 0 0 18px -4px rgba(34,211,238,.5), inset 0 0 12px rgba(34,211,238,.12); text-shadow: 0 0 12px rgba(34,211,238,.8); }

/* mono (terminal) font */
.al-mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }

/* submit — flowing cyan→magenta gradient + pulsing glow */
.al-submit { display: flex; align-items: center; justify-content: center; gap: .5rem; width: 100%; height: 3rem; border: none; border-radius: 12px; font-size: .875rem; font-weight: 800; color: #03131A; background: linear-gradient(90deg, #06B6D4, #22D3EE 32%, #E879F9 68%, #06B6D4 100%); background-size: 220% auto; box-shadow: 0 0 24px -6px rgba(34,211,238,.6), 0 0 24px -8px rgba(232,121,249,.45); animation: al-flow 4.5s linear infinite, al-pulse 2.8s ease-in-out infinite; transition: filter .2s ease, transform .15s ease; cursor: pointer; }
.al-submit:hover:not(:disabled) { filter: brightness(1.12); }
.al-submit:active:not(:disabled) { transform: translateY(1px); }
.al-submit:disabled { cursor: not-allowed; opacity: .7; }
.al-submit:focus-visible { outline: 2px solid #22D3EE; outline-offset: 3px; }
@keyframes al-flow { to { background-position: 220% center; } }
@keyframes al-pulse { 0%, 100% { box-shadow: 0 0 22px -6px rgba(34,211,238,.55), 0 0 22px -8px rgba(232,121,249,.4); } 50% { box-shadow: 0 0 44px -6px rgba(34,211,238,.8), 0 0 44px -8px rgba(232,121,249,.6); } }

/* floating glass stat chips (decorative side panel) */
.al-chip { display: inline-flex; align-items: center; gap: .5rem; padding: .5rem .9rem; border-radius: 9999px; border: 1px solid rgba(34,211,238,.28); background: rgba(2,8,16,.62); backdrop-filter: blur(10px); color: rgba(165,243,252,.92); font-size: .75rem; font-weight: 700; box-shadow: 0 0 20px -8px rgba(34,211,238,.45); }
.al-chip svg { color: #22D3EE; filter: drop-shadow(0 0 6px rgba(34,211,238,.7)); }
.al-f1 { animation: al-float 6s ease-in-out infinite; }
.al-f2 { animation: al-float 7.5s ease-in-out infinite .7s; }
.al-f3 { animation: al-float 8.5s ease-in-out infinite 1.4s; }
@keyframes al-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

/* loader box (auth check) */
.al-loaderbox { position: relative; border: 1px solid rgba(34,211,238,.35); border-radius: 16px; background: rgba(0,0,0,.55); backdrop-filter: blur(12px); box-shadow: 0 0 44px -12px rgba(34,211,238,.7); }

/* reduced motion — kill all movement */
@media (prefers-reduced-motion: reduce) {
  .al-beam, .al-title, .al-cursor::after, .al-dot::after, .al-submit, .al-f1, .al-f2, .al-f3 { animation: none !important; }
}
`;

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  /* v29: «فراموشی رمز عبور؟» — login with the one-time RECOVERY PHRASE
   * instead of the password (admins save it from the install DoneStep or
   * حساب من → کد بازیابی). */
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  // already logged-in admin → straight to the panel
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { ok?: boolean; user?: { role?: string } | null }) => {
        if (cancelled) return;
        if (j?.ok && j.user?.role && ADMIN_ROLES.includes(j.user.role)) {
          router.replace("/admin");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [router]);

  // "remember me" → prefill the identifier (client-only, no auth change)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setIdentifier(saved);
        setRemember(true);
      }
    } catch {
      /* private mode — ignore */
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!identifier.trim()) {
      setFormError("ایمیل یا شماره موبایل را وارد کنید");
      toast.error("ایمیل یا شماره موبایل را وارد کنید");
      return;
    }
    /* v29: recovery-phrase login — no password needed; the code replaces it */
    if (recoveryMode) {
      if (recoveryCode.trim().length < 6) {
        setFormError("کد بازیابی را کامل وارد کنید");
        toast.error("کد بازیابی را کامل وارد کنید");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim(), recoveryCode: recoveryCode.trim() }),
        });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string; user?: { role?: string }; redirect?: string }
          | null;
        if (!json || !json.ok) {
          setFormError(json?.message ?? "ورود با کد بازیابی ناموفق بود");
          toast.error(json?.message ?? "ورود با کد بازیابی ناموفق بود");
          return;
        }
        if (!json.user?.role || !ADMIN_ROLES.includes(json.user.role)) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
          setFormError("کد بازیابی فقط برای حساب‌های مدیریتی است");
          toast.error("کد بازیابی فقط برای حساب‌های مدیریتی است");
          return;
        }
        toast.success(json.message ?? "با کد بازیابی وارد شدید — رمز جدید تعیین کنید");
        router.push(json.redirect ?? "/admin/account");
        router.refresh();
      } catch {
        setFormError("خطا در ارتباط با سرور");
        toast.error("خطا در ارتباط با سرور");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!password) {
      setFormError("رمز عبور را وارد کنید");
      toast.error("رمز عبور را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; user?: { role?: string } }
        | null;
      if (!json || !json.ok) {
        setFormError(json?.message ?? "ورود ناموفق بود");
        toast.error(json?.message ?? "ورود ناموفق بود");
        return;
      }
      if (!json.user?.role || !ADMIN_ROLES.includes(json.user.role)) {
        // logged in, but not an admin — kick the session out
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        setFormError("شما دسترسی مدیریت ندارید");
        toast.error("شما دسترسی مدیریت ندارید");
        return;
      }
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, identifier.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* private mode — ignore */
      }
      toast.success("خوش آمدید! در حال انتقال به پنل…");
      router.push("/admin");
      router.refresh();
    } catch {
      setFormError("خطا در ارتباط با سرور");
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
        <style>{TERMINAL_CSS}</style>
        <Image
          src="/images/cyberpunk-login-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div aria-hidden className="absolute inset-0 bg-black/65" />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative h-16 w-16">
            <span aria-hidden className="al-br al-br-tl" />
            <span aria-hidden className="al-br al-br-tr" />
            <span aria-hidden className="al-br al-br-bl" />
            <span aria-hidden className="al-br al-br-br" />
            <span className="al-loaderbox grid h-16 w-16 place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-300" strokeWidth={1.75} />
            </span>
          </div>
          <p className="text-sm font-medium text-cyan-100/80">در حال بررسی دسترسی…</p>
          <p dir="ltr" aria-hidden className="al-mono text-[10px] tracking-widest text-cyan-300/50">
            &gt; AUTH_SESSION: CHECKING
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black text-white lg:flex-row">
      <style>{TERMINAL_CSS}</style>

      {/* ═ Full-bleed cyberpunk city background + readability overlays ═ */}
      <Image
        src="/images/cyberpunk-login-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_100%_at_18%_50%,transparent_25%,rgba(0,0,0,.72)_100%)]"
      />

      {/* ═ Login column — right side in RTL (first flex child) ═ */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:min-h-screen lg:px-10 xl:px-14">
        <div className="w-full max-w-md">
          <div className="relative">
            {/* HUD corner brackets */}
            <span aria-hidden className="al-br al-br-tl" />
            <span aria-hidden className="al-br al-br-tr" />
            <span aria-hidden className="al-br al-br-bl" />
            <span aria-hidden className="al-br al-br-br" />

            {/* dark glass terminal card */}
            <section
              aria-labelledby="al-login-title"
              className="relative overflow-hidden rounded-[10px] border border-cyan-400/30 bg-black/70 p-6 shadow-[0_0_60px_-15px_rgba(34,211,238,0.7)] backdrop-blur-2xl sm:p-8"
            >
              <div aria-hidden className="al-scanlines" />
              <div aria-hidden className="al-beam" />

              <div className="relative">
                {/* brand + secure status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="al-logo grid h-11 w-11 place-items-center rounded-xl text-xl font-black text-cyan-300"
                    >
                      ت
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-extrabold text-white">تاج الکترونیکس</span>
                      <span
                        dir="ltr"
                        className="al-mono block text-[10px] font-medium tracking-[0.22em] text-cyan-300/60"
                      >
                        TAJ · SECURE ADMIN
                      </span>
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                    <span aria-hidden className="al-dot" />
                    اتصال امن برقرار است
                  </span>
                </div>

                {/* static terminal boot log */}
                <div
                  dir="ltr"
                  aria-hidden
                  className="al-mono mt-5 space-y-0.5 border-t border-white/10 pt-4 text-left text-[10px] leading-[1.7] text-white/60"
                >
                  <p>
                    <span className="text-fuchsia-300/70">&gt;</span>{" "}
                    <span className="text-cyan-300/80">AUTH_GATE</span>
                    <span className="text-white/40">:</span>{" "}
                    <span className="text-emerald-300/70">READY</span>
                  </p>
                  <p>
                    <span className="text-fuchsia-300/70">&gt;</span>{" "}
                    <span className="text-cyan-300/80">FIREWALL</span>
                    <span className="text-white/40">:</span>{" "}
                    <span className="text-emerald-300/70">ACTIVE</span>
                  </p>
                  <p>
                    <span className="text-fuchsia-300/70">&gt;</span>{" "}
                    <span className="text-cyan-300/80">UPLINK</span>
                    <span className="text-white/40">:</span>{" "}
                    <span className="text-emerald-300/70">SECURE</span>
                  </p>
                </div>

                {/* animated neon title */}
                <div className="mt-6 space-y-2.5 text-center">
                  <h1 id="al-login-title" className="al-title text-[1.75rem] font-black leading-tight sm:text-4xl">
                    دسترسی مدیران
                  </h1>
                  <p className="al-cursor text-xs font-medium text-cyan-100/70">
                    سامانه دسترسی امن — نسخه ۲۵
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                  {formError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-300"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className="text-xs font-bold text-cyan-100/85">
                      شناسه مدیر
                    </Label>
                    <div className="relative">
                      <Fingerprint
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50"
                        strokeWidth={1.75}
                      />
                      <Input
                        id="identifier"
                        dir="ltr"
                        className="h-11 rounded-[10px] border-white/15 bg-black/50 pl-10 text-left text-sm text-white caret-cyan-300 placeholder:text-white/35 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20 dark:bg-black/50"
                        placeholder="admin@tajelectronics.ir"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* v29: recovery mode swaps the password for the one-time
                      recovery phrase field (same terminal look). */}
                  {recoveryMode ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="recovery-code" className="text-xs font-bold text-amber-200/90">
                        کد بازیابی (عبارت بازیابی)
                      </Label>
                      <div className="relative">
                        <KeyRound
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/60"
                          strokeWidth={1.75}
                        />
                        <Input
                          id="recovery-code"
                          dir="ltr"
                          className="h-11 rounded-[10px] border-amber-400/25 bg-black/50 pl-10 text-left font-mono text-sm text-amber-100 caret-amber-300 placeholder:text-white/35 focus-visible:border-amber-400/60 focus-visible:ring-amber-400/20 dark:bg-black/50"
                          placeholder="amber-falcon-quartz-river-123"
                          autoComplete="off"
                          spellCheck={false}
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <p className="text-[10px] leading-4 text-white/50">
                        عبارتی که هنگام نصب یا از «حساب من» ساختید و یک‌بار نمایش داده شد — با آن وارد شوید و از «حساب من» رمز جدید بگذارید.
                      </p>
                    </div>
                  ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold text-cyan-100/85">
                      رمز عبور
                    </Label>
                    <div className="relative">
                      <Lock
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50"
                        strokeWidth={1.75}
                      />
                      <Input
                        id="password"
                        dir="ltr"
                        type={showPassword ? "text" : "password"}
                        className="h-11 rounded-[10px] border-white/15 bg-black/50 pl-10 pr-11 text-left text-sm text-white caret-cyan-300 placeholder:text-white/35 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20 dark:bg-black/50"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-cyan-200/60 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                  )}

                  {/* v29: forgot-password toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMode((v) => !v);
                        setFormError(null);
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-bold text-amber-200/80 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg px-1"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                      {recoveryMode ? "بازگشت به ورود با رمز عبور" : "رمز عبور را فراموش کرده‌اید؟ ورود با کد بازیابی"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="remember"
                      className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-white/60"
                    >
                      <Checkbox
                        id="remember"
                        checked={remember}
                        onCheckedChange={(v) => setRemember(v === true)}
                        disabled={submitting}
                        className="border-white/25 data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black dark:data-[state=checked]:border-cyan-400 dark:data-[state=checked]:bg-cyan-400"
                      />
                      مرا به خاطر بسپار
                    </label>
                    <span className="hidden items-center gap-1 text-[11px] text-white/45 sm:flex">
                      <Smartphone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      فقط حساب‌های مدیریتی
                    </span>
                  </div>

                  <button type="submit" disabled={submitting} className="al-submit">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        در حال ورود…
                      </>
                    ) : (
                      <>
                        {recoveryMode ? "ورود با کد بازیابی" : "ورود به پنل مدیریت"}
                        <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* below the card — back to store + Alaruz credit */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-4 text-xs font-bold text-slate-300 backdrop-blur transition-colors hover:border-cyan-400/40 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              بازگشت به فروشگاه
            </Link>
            <a
              href="https://alaruz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300/70 underline-offset-4 transition-colors hover:text-cyan-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-sm"
            >
              طراحی و توسعه: Alaruz
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </a>
          </div>
        </div>
      </main>

      {/* ═ Decorative side panel — left side in RTL (lg+) ═ */}
      <aside
        aria-hidden
        className="relative z-10 hidden w-[44%] flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
      >
        <Image
          src="/images/cyberpunk-grid.png"
          alt=""
          fill
          sizes="45vw"
          loading="eager"
          className="object-cover opacity-30"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(165deg,rgba(0,0,0,.82)_0%,rgba(0,0,0,.35)_45%,rgba(0,0,0,.85)_100%)]"
        />
        <div aria-hidden className="al-scanlines opacity-70" />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent"
        />

        <div className="relative">
          <p dir="ltr" className="al-mono text-left text-[10px] tracking-[0.3em] text-cyan-300/50">
            &gt; TAJ://ADMIN_TERMINAL · v25
          </p>
        </div>

        <div className="relative max-w-md space-y-8 py-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold text-fuchsia-300/90">
              <Zap className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              پنل مدیریت نسل ۲۵
            </span>
            <h2 className="text-4xl font-black leading-[1.3] text-white xl:text-[2.75rem]">
              میز فرماندهی
              <span className="al-title block">فروشگاه آینده</span>
            </h2>
            <p className="text-sm leading-7 text-slate-300/85">
              محصولات، سفارش‌ها، پرداخت‌ها و امنیت — همه‌چیز از یک ترمینال واحد، با رابط نسل ۲۵
              تاج الکترونیکس.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="al-chip al-f1">
              <Activity className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              مانیتورینگ ۲۴/۷
            </span>
            <span className="al-chip al-f2">
              <LockKeyhole className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              رمزنگاری AES-256
            </span>
            <span className="al-chip al-f3">
              <Server className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              آپ‌تایم ۹۹/۹٪
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <p className="text-xs text-white/45">© تاج الکترونیکس — تمامی حقوق محفوظ است</p>
          <p dir="ltr" className="al-mono text-[10px] text-cyan-300/40">
            SEC://TAJ-N25
          </p>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { CheckCircle2, ChevronRight, Database as DatabaseIcon, Moon, Rocket, ShieldCheck, Sparkles, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAJLogo } from "@/components/store/logo";
import {
  AdminStep,
  AlreadyInstalledScreen,
  DatabaseStep,
  DoneStep,
  InstallingStep,
  RequirementsStep,
  WelcomeStep,
} from "@/components/installer/steps";
import {
  ApiError,
  apiGet,
  apiPost,
  type AdminFormState,
  type DbInfo,
  type DbSetupResult,
  type DbTestResult,
  type RequirementItem,
  type RunStep,
} from "@/components/installer/bits";
import { cn } from "@/lib/utils";

type Step = "welcome" | "requirements" | "database" | "admin" | "installing" | "done";

const STEPS: { id: Step; label: string; icon: typeof Sparkles }[] = [
  { id: "welcome", label: "خوش‌آمد", icon: Sparkles },
  { id: "requirements", label: "پیش‌نیازها", icon: ShieldCheck },
  { id: "database", label: "دیتابیس", icon: DatabaseIcon },
  { id: "admin", label: "حساب مدیر", icon: UserRound },
  { id: "installing", label: "نصب", icon: Rocket },
  { id: "done", label: "پایان", icon: CheckCircle2 },
];

interface StatusResponse {
  installed: boolean;
  needsSetup: boolean;
  db: DbInfo;
}

interface AdminResponse {
  reused?: boolean;
  user: { id: string; email: string | null; phone: string | null; firstName?: string | null; lastName?: string | null };
  /* v29: one-time recovery phrase — returned ONLY here (shown on the final
   * step, then never again; only its hash is stored). */
  recoveryCode?: string;
}

const EMPTY_FORM: AdminFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

export function InstallWizard() {
  const { setTheme } = useTheme();

  const [step, setStep] = useState<Step>("welcome");
  const [already, setAlready] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  // requirements
  const [reqLoading, setReqLoading] = useState(false);
  const [reqItems, setReqItems] = useState<RequirementItem[]>([]);
  const [reqReady, setReqReady] = useState(false);

  // database
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [dbTest, setDbTest] = useState<DbTestResult | null>(null);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbSetup, setDbSetup] = useState<DbSetupResult | null>(null);
  const [dbSettingUp, setDbSettingUp] = useState(false);

  // admin form
  const [form, setForm] = useState<AdminFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AdminFormState, string>>>({});

  // install run
  const [runSteps, setRunSteps] = useState<RunStep[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [doneAdmin, setDoneAdmin] = useState<AdminResponse["user"] | null>(null);
  const createdUserIdRef = useRef<string | null>(null);
  const payloadRef = useRef<AdminFormState>(EMPTY_FORM);
  /* v29: the one-time recovery phrase, kept for the final DoneStep */
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  /* v29: apply the shipped demo catalog (37 products, brands, sliders, …)
   * during the final install sequence — on by default, can be turned off
   * for a completely empty store */
  const [demoCatalog, setDemoCatalog] = useState(true);
  const demoCatalogRef = useRef(demoCatalog);
  demoCatalogRef.current = demoCatalog;

  /* boot: verify install state once (race-safe fallback — the server page guard is authoritative) */
  useEffect(() => {
    let cancelled = false;
    apiGet<StatusResponse>("/api/install/status")
      .then((res) => {
        if (cancelled) return;
        setDbInfo(res.db ?? null);
        if (res.installed) setAlready(true);
      })
      .catch(() => {
        /* server-side page guard already handles redirect */
      })
      .finally(() => {
        if (!cancelled) setBootChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runRequirements = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await apiPost<{ requirements: RequirementItem[]; ready: boolean; db: DbInfo }>(
        "/api/install/requirements"
      );
      setReqItems(res.requirements ?? []);
      setReqReady(!!res.ready);
      setDbInfo(res.db ?? null);
    } catch (e) {
      setReqItems([]);
      setReqReady(false);
      setReqError(e instanceof ApiError ? e.message : "بررسی پیش‌نیازها ناموفق بود");
    } finally {
      setReqLoading(false);
    }
  }, []);

  const startInstall = () => {
    setStep("requirements");
    void runRequirements();
  };

  const testDatabase = async () => {
    setDbTesting(true);
    setDbTest(null);
    try {
      const res = await apiPost<DbTestResult>("/api/install/database-test");
      setDbTest(res);
    } catch (e) {
      setDbTest({ success: false, message: e instanceof ApiError ? e.message : "تست اتصال ناموفق بود", fileExists: false, tables: 0 });
    } finally {
      setDbTesting(false);
    }
  };

  const setupDatabase = async () => {
    setDbSettingUp(true);
    setDbSetup(null);
    try {
      const res = await apiPost<DbSetupResult>("/api/install/database-setup");
      setDbSetup(res);
    } catch (e) {
      setDbSetup({ success: false, message: e instanceof ApiError ? e.message : "راه‌اندازی دیتابیس ناموفق بود", log: [] });
    } finally {
      setDbSettingUp(false);
    }
  };

  const validateAdminForm = (): boolean => {
    const errs: Partial<Record<keyof AdminFormState, string>> = {};
    if (form.firstName.trim().length < 2) errs.firstName = "نام باید حداقل ۲ کاراکتر باشد";
    if (form.lastName.trim().length < 2) errs.lastName = "نام خانوادگی باید حداقل ۲ کاراکتر باشد";
    if (!/^09\d{9}$/.test(form.phone.trim())) errs.phone = "شماره موبایل معتبر نیست (مثال: 09123456789)";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "ایمیل معتبر نیست";
    if (form.password.length < 8) errs.password = "رمز عبور باید حداقل ۸ کاراکتر باشد";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = "رمز عبور باید شامل حرف و عدد باشد";
    if (form.password !== form.passwordConfirm) errs.passwordConfirm = "تکرار رمز عبور مطابقت ندارد";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── final install sequence — every phase is a REAL API operation ── */
  const runSequence = async (from: number) => {
    const phases: { id: string; label: string; run: () => Promise<void> }[] = [
      {
        id: "admin",
        label: "ایجاد حساب مدیر",
        run: async () => {
          const res = await apiPost<AdminResponse>("/api/install/create-admin", payloadRef.current);
          createdUserIdRef.current = res.user.id;
          setDoneAdmin(res.user);
          setRecoveryCode(res.recoveryCode ?? null);
        },
      },
      {
        id: "settings",
        label: "مقداردهی تنظیمات فروشگاه",
        run: async () => {
          await apiPost("/api/install/settings-init");
        },
      },
      {
        id: "catalog",
        label: "نصب کاتالوگ نمونه فروشگاه",
        run: async () => {
          /* v29: applies the shipped demo catalog (products, categories,
           * brands, sliders, stories, …) — skipped if the admin unchecked
           * the option or the catalog already exists (Docker first-boot) */
          if (!demoCatalogRef.current) return;
          try {
            await apiPost("/api/install/demo-catalog", {});
          } catch {
            /* non-fatal: a failed demo import must never block install —
             * the store simply starts empty and products can be added from
             * the admin panel */
          }
        },
      },
      {
        id: "storage",
        label: "آماده‌سازی فضای ذخیره‌سازی",
        run: async () => {
          await apiPost("/api/install/storage-init");
        },
      },
      {
        id: "lock",
        label: "ثبت وضعیت نصب و قفل نصب",
        run: async () => {
          await apiPost("/api/install/complete", { adminUserId: createdUserIdRef.current ?? undefined });
        },
      },
      {
        id: "verify",
        label: "بررسی نهایی سلامت برنامه",
        run: async () => {
          const res = await apiGet<{ installed: boolean }>("/api/install/status");
          if (!res.installed) throw new ApiError("نصب هنوز تکمیل نشده است — دوباره تلاش کنید");
        },
      },
    ];

    setRunSteps(phases.map((p, i) => ({ id: p.id, label: p.label, status: i < from ? "done" : ("pending" as const) })));
    for (let i = from; i < phases.length; i++) {
      setRunSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s)));
      try {
        await phases[i].run();
        setRunSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s)));
      } catch (e) {
        if (e instanceof ApiError && e.code === "ALREADY_INSTALLED") {
          // idempotent retry — installation already recorded; treat as success
          setRunSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s)));
          continue;
        }
        const msg =
          e instanceof ApiError
            ? e.message
            : "عملیات با خطا مواجه شد — جزئیات فنی برای امنیت نمایش داده نمی‌شود";
        setRunSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "failed", error: msg } : s)));
        return;
      }
    }
    setStep("done");
  };

  const submitAdmin = () => {
    if (!validateAdminForm()) return;
    payloadRef.current = form;
    setStep("installing");
    void runSequence(0);
  };

  const retryFromFailure = () => {
    const failedIdx = runSteps.findIndex((s) => s.status === "failed");
    if (failedIdx < 0) return;
    setRetrying(true);
    void runSequence(failedIdx).finally(() => setRetrying(false));
  };

  const activeIdx = STEPS.findIndex((s) => s.id === step);
  const canGoBack = step === "database" || step === "admin";
  const goBack = () => {
    if (step === "database") setStep("requirements");
    else if (step === "admin") setStep("database");
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/60 px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-primary/5 blur-3xl" aria-hidden />

      <div className="relative mx-auto w-full max-w-2xl">
        {/* header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TAJLogo />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="تغییر پوسته روشن/تاریک"
            className="h-9 w-9 rounded-xl"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>
        </div>

        {/* card */}
        <div className="rounded-3xl border bg-card/95 shadow-2xl backdrop-blur">
          {/* stepper */}
          <div className="border-b p-4 md:px-8">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground md:hidden">
              <span>
                گام {Math.min(activeIdx + 1, STEPS.length)} از {STEPS.length}
              </span>
              <span className="font-bold text-foreground">{STEPS[activeIdx]?.label}</span>
            </div>
            <ol className="hidden items-center md:flex" aria-label="مراحل نصب">
              {STEPS.map((s, i) => {
                const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "future";
                return (
                  <li key={s.id} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300",
                          state === "done" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          state === "active" && "gold-surface border-primary/40 text-primary-foreground shadow-lg",
                          state === "future" && "border-border bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {state === "done" ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          state === "active" ? "text-primary" : state === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className={cn("mx-1 h-0.5 flex-1 rounded-full", i < activeIdx ? "bg-emerald-500/50" : "bg-border")} />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted md:hidden">
              <div
                className="gold-surface h-full transition-all duration-500"
                style={{ width: `${((activeIdx + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* body */}
          <div className="p-5 md:p-8">
            {already ? (
              <AlreadyInstalledScreen />
            ) : !bootChecked ? (
              <div className="flex h-48 items-center justify-center">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="text-sm font-medium text-muted-foreground"
                >
                  در حال بررسی وضعیت نصب…
                </motion.span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {step === "welcome" && <WelcomeStep onStart={startInstall} />}
                  {step === "requirements" && (
                    <RequirementsStep
                      loading={reqLoading}
                      items={reqItems}
                      ready={reqReady}
                      onRetry={() => void runRequirements()}
                      onContinue={() => setStep("database")}
                    />
                  )}
                  {reqError && step === "requirements" && !reqLoading && reqItems.length === 0 && (
                    <p className="mt-2 text-xs text-destructive">{reqError}</p>
                  )}
                  {step === "database" && (
                    <DatabaseStep
                      dbInfo={dbInfo}
                      test={dbTest}
                      testing={dbTesting}
                      onTest={() => void testDatabase()}
                      setup={dbSetup}
                      settingUp={dbSettingUp}
                      onSetup={() => void setupDatabase()}
                      onContinue={() => setStep("admin")}
                    />
                  )}
                  {step === "admin" && (
                    <AdminStep
                      form={form}
                      onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                      errors={formErrors}
                      onSubmit={submitAdmin}
                      demoCatalog={demoCatalog}
                      onDemoCatalogChange={setDemoCatalog}
                    />
                  )}
                  {step === "installing" && (
                    <InstallingStep steps={runSteps} onRetry={retryFromFailure} retrying={retrying} />
                  )}
                  {step === "done" && <DoneStep admin={doneAdmin} recoveryCode={recoveryCode} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* back footer */}
          {canGoBack && (
            <div className="border-t p-4 md:px-8">
              <Button variant="ghost" size="sm" onClick={goBack} className="rounded-lg text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
                بازگشت
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          جادوی نصب اولیه — نسخه ۱٫۰٫۰ · تاج الکترونیکس
        </p>
      </div>
    </div>
  );
}

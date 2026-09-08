"use client";

/* ────────────────────────────────────────────────────────────────────────
 * v29.2 · «اسکریپت به‌روزرسانی (Update Script)» admin panel (Task 5-b)
 * ────────────────────────────────────────────────────────────────────────
 * Self-contained client card (rendered by another agent inside a settings
 * TabsContent — no props, no imports from the settings page file).
 *
 * Flow: save manifest URL (PUT /api/admin/update/config) → «بررسی
 * به‌روزرسانی» (GET check) → confirm dialog → POST apply → poll
 * /api/admin/update/status every 2s while a phase is active → success /
 * error card. Data (db/, .env, uploads) is never touched by the update.
 * ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  Github,
  HelpCircle,
  Loader2,
  RotateCw,
  Save,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from "lucide-react";

/* ── types (mirror the API responses) ── */

interface UpdateConfig {
  manifestUrl: string | null;
  effectiveUrl: string;
  source: "store" | "env" | "github" | "default";
  defaultManifestUrl: string;
}

interface UpdateCheck {
  current: string;
  latest: string;
  available: boolean;
  notes: string | null;
  zipUrl: string | null;
  sha256: string | null;
  manifestUrl: string;
  manifestSource: string;
  resolvedUrl: string;
  releasedAt: string | null;
  minAppVersion: string | null;
  /** "standalone" = prebuilt Docker runtime (panel shows update.sh hint) */
  runtime?: "source" | "standalone";
}

/** v31 · background poll response (GET /api/admin/update/poll — the server
 * itself throttles the real GitHub fetch to once per 10 minutes, so this
 * cheap call can repeat every 5 minutes without hammering the remote). */
interface UpdatePoll {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  lastCheckedAt: string | null;
  error?: string;
}

type UpdatePhase =
  | "idle"
  | "downloading"
  | "verifying"
  | "extracting"
  | "backing-up"
  | "applying"
  | "migrating"
  | "restarting"
  | "done"
  | "error";

interface UpdateState {
  phase: UpdatePhase;
  percent: number;
  message: string;
  version?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  log: string[];
}

const ACTIVE_PHASES: UpdatePhase[] = [
  "downloading",
  "verifying",
  "extracting",
  "backing-up",
  "applying",
  "migrating",
  "restarting",
];

const STEPS: { key: UpdatePhase; label: string }[] = [
  { key: "downloading", label: "دانلود فایل به‌روزرسانی" },
  { key: "verifying", label: "بررسی چک‌سام SHA-256" },
  { key: "extracting", label: "استخراج و بررسی امنیتی فایل‌ها" },
  { key: "backing-up", label: "پشتیبان‌گیری از فایل‌های فعلی" },
  { key: "applying", label: "اعمال فایل‌های جدید" },
  { key: "migrating", label: "مهاجرت دیتابیس (بدون دست‌زدن به داده‌ها)" },
  { key: "restarting", label: "راه‌اندازی مجدد فروشگاه" },
];

/** mirror of GITHUB_MANIFEST_URL in src/lib/updater.ts (server-only) */
const GITHUB_DEFAULT_HINT =
  "https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main/updates/update-manifest.json";

const SOURCE_LABELS: Record<string, string> = {
  store: "تنظیم‌شده در پنل",
  env: "متغیر محیطی سرور",
  github: "گیت‌هاب رسمی اسکریپت",
  default: "فایل همراه اسکریپت",
};

/* ── tiny local helpers ── */

/** same visual language as the settings-page GuideNote — implemented locally
 * so this card stays self-contained and importable anywhere. */
function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 rounded-lg bg-muted/60 p-2.5 text-[11px] leading-5 text-muted-foreground", className)}>
      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
      <span>{children}</span>
    </p>
  );
}

function faDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fa-IR");
}

/** loose semver compare for the client-side minAppVersion hint */
function compareVersionsLocal(a: string, b: string): number {
  const norm = (v: string) =>
    v.trim().replace(/^v/i, "").split(/[-+]/)[0].split(".").map((s) => parseInt(s, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/* ═══════════════════════════ the panel ═══════════════════════════ */

export function UpdatePanel() {
  const [checkResult, setCheckResult] = useState<UpdateCheck | null>(null);
  const handledKey = useRef<string | null>(null);

  /* v31 · AUTO-DETECT — the background poll flips this when a newer version
   * appears WITHOUT the admin pressing «بررسی به‌روزرسانی»; the result card
   * then carries a «به‌روزرسانی جدید شناسایی شد» badge. The next manual check
   * clears it. */
  const [autoDetected, setAutoDetected] = useState(false);
  /** latest version already auto-handled (prevents repeat auto-checks) */
  const autoPolled = useRef<string | null>(null);

  /* ── manifest URL config ── */
  const configQuery = useQuery({
    queryKey: ["admin-update-config"],
    queryFn: () => apiFetch<UpdateConfig>("/api/admin/update/config"),
  });
  /* editedUrl = null → untouched → show the server value (derived state, no effect) */
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const urlValue = editedUrl ?? configQuery.data?.manifestUrl ?? "";

  const saveConfig = useMutation({
    mutationFn: (value: string) =>
      apiFetch<{ message?: string }>("/api/admin/update/config", {
        method: "PUT",
        body: JSON.stringify({ manifestUrl: value.trim() ? value.trim() : null }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "آدرس مانیفست ذخیره شد");
      setEditedUrl(null); // fall back to the (refetched) server value
      void configQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ذخیرهٔ آدرس مانیفست ناموفق بود"),
  });

  /* ── check ── */
  const check = useMutation({
    mutationFn: () => apiFetch<UpdateCheck>("/api/admin/update/check"),
    onSuccess: (data) => setCheckResult(data),
    onError: (e) => toast.error(e instanceof Error ? e.message : "بررسی به‌روزرسانی ناموفق بود"),
  });

  /* ── status (polled every 2s while a phase is active — interval derived
   * from the data itself, kicked off with a refetch() on apply start) ── */
  const statusQuery = useQuery({
    queryKey: ["admin-update-status"],
    queryFn: () => apiFetch<{ state: UpdateState; pendingRestart?: boolean }>("/api/admin/update/status"),
    refetchInterval: (query) => {
      const ph = query.state.data?.state?.phase;
      return ph && ACTIVE_PHASES.includes(ph) ? 2000 : false;
    },
    retry: 1,
  });
  const state: UpdateState | null = statusQuery.data?.state ?? null;
  const phase = state?.phase ?? null;
  const busy = !!phase && (ACTIVE_PHASES.includes(phase) || phase === "done");

  useEffect(() => {
    if (!phase || !state) return;
    if (phase === "done") {
      const key = `${state.version ?? ""}|${state.finishedAt ?? ""}`;
      if (handledKey.current !== key) {
        handledKey.current = key;
        toast.success(`به‌روزرسانی ${state.version ?? ""} با موفقیت نصب شد`);
        check.mutate(); // refresh current-vs-latest after the update
      }
    }
    if (phase === "error") {
      const key = `err|${state.finishedAt ?? ""}|${state.error ?? ""}`;
      if (handledKey.current !== key) {
        handledKey.current = key;
        toast.error("به‌روزرسانی با خطا متوقف شد — جزئیات در کارت زیر");
      }
    }
  }, [phase, state?.finishedAt, state?.error]);

  /* ── apply ── */
  const apply = useMutation({
    mutationFn: () =>
      apiFetch<{ started: boolean; version?: string; message?: string }>("/api/admin/update/apply", {
        method: "POST",
        body: JSON.stringify({
          version: checkResult?.latest,
          zipUrl: checkResult?.zipUrl,
          sha256: checkResult?.sha256 ?? undefined,
        }),
      }),
    onSuccess: (json) => {
      // kick off the 2s polling loop (the interval then sustains itself)
      void statusQuery.refetch();
      toast.success(json.message ?? "فرآیند به‌روزرسانی آغاز شد");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "شروع به‌روزرسانی ناموفق بود"),
  });

  const stepIndex = phase ? STEPS.findIndex((s) => s.key === phase) : -1;
  const canApply =
    !!checkResult?.available && !!checkResult?.zipUrl && !busy && !apply.isPending;
  const needsMinVersion =
    !!checkResult?.available &&
    !!checkResult?.minAppVersion &&
    checkResult.current &&
    compareVersionsLocal(checkResult.current, checkResult.minAppVersion) < 0;

  /* ── v31 · background auto-poll ──────────────────────────────────
   * GET /api/admin/update/poll ~3s after mount and then every 5 minutes.
   * When it reports a new version that the visible card does not already
   * show, the FULL /check is silently re-run so the details card (and the
   * «دانلود و نصب به‌روزرسانی» button) refresh themselves without the admin
   * pressing anything. Completely silent on failure — polling must never
   * disturb the manual flow or the 7-step install progress. */
  const busyRef = useRef(busy);
  const checkPendingRef = useRef(check.isPending);
  const checkResultRef = useRef<UpdateCheck | null>(checkResult);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    checkPendingRef.current = check.isPending;
  }, [check.isPending]);
  useEffect(() => {
    checkResultRef.current = checkResult;
  }, [checkResult]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (busyRef.current || checkPendingRef.current) return; // never fight a running install/check
      let data: UpdatePoll;
      try {
        data = await apiFetch<UpdatePoll>("/api/admin/update/poll");
      } catch {
        return; // silent
      }
      if (cancelled || !data.hasUpdate || !data.latest) return;
      if (autoPolled.current === data.latest) return; // already auto-handled
      const shown = checkResultRef.current;
      if (shown && shown.available && shown.latest === data.latest) {
        autoPolled.current = data.latest; // card already shows this version
        return;
      }
      autoPolled.current = data.latest;
      // fetch the full manifest details SILENTLY (no toast, no button spinner)
      try {
        const full = await apiFetch<UpdateCheck>("/api/admin/update/check");
        if (cancelled) return;
        if (full.available && full.latest === data.latest) {
          setAutoDetected(true);
          setCheckResult(full);
        }
      } catch {
        /* silent — next interval retries */
      }
    };
    const early = setTimeout(() => void poll(), 3_000);
    const interval = setInterval(() => void poll(), 5 * 60_000);
    return () => {
      cancelled = true;
      clearTimeout(early);
      clearInterval(interval);
    };
  }, []);

  /* ═══════ render ═══════ */

  return (
    <div className="space-y-4">
      <Card id="update-script-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Wrench className="h-4.5 w-4.5" />
            </span>
            اسکریپت به‌روزرسانی (Update Script)
          </CardTitle>
          <Note>
            از این بخش نسخهٔ اسکریپت فروشگاه را بررسی و به‌روز کنید. فایل به‌روزرسانی (ZIP) از سروری که مانیفست
            در آن قرار دارد دانلود، با چک‌سام SHA-256 تأیید، از فایل‌های فعلی پشتیبان گرفته و سپس فقط روی
            <span className="font-bold"> کدها </span>
            اعمال می‌شود. دیتابیس (سفارش‌ها، کاربران، محصولات)، فایل <span dir="ltr" className="font-mono">.env</span> و
            پوشهٔ <span dir="ltr" className="font-mono">uploads/</span> هرگز دست نمی‌خورند. راهنمای کامل انتشار
            در فایل <span dir="ltr" className="font-mono">UPDATE-GUIDE.md</span> پروژه است.
          </Note>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── manifest URL config ── */}
          <div className="space-y-1.5">
            <Label htmlFor="update-manifest-url" className="text-xs font-medium">
              آدرس مانیفست به‌روزرسانی (update-manifest.json)
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="update-manifest-url"
                dir="ltr"
                className="rounded-lg font-mono text-xs"
                placeholder="https://raw.githubusercontent.com/user/repo/main/update-manifest.json"
                value={urlValue}
                onChange={(e) => setEditedUrl(e.target.value)}
                disabled={configQuery.isLoading || saveConfig.isPending}
                maxLength={500}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-lg"
                disabled={configQuery.isLoading || saveConfig.isPending || editedUrl === null}
                onClick={() => editedUrl !== null && saveConfig.mutate(editedUrl)}
              >
                {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره آدرس
              </Button>
            </div>
            {configQuery.isLoading ? (
              <Skeleton className="h-4 w-2/3" />
            ) : (
              <p className="text-[11px] leading-5 text-muted-foreground">
                {configQuery.data?.manifestUrl ? (
                  <>
                    فعال (ذخیره‌شده در پنل): <span dir="ltr" className="font-mono">{configQuery.data.manifestUrl}</span>
                  </>
                ) : (
                  <>
                    پیش‌فرض فعال ({SOURCE_LABELS[configQuery.data?.source ?? "github"] ?? "گیت‌هاب رسمی"}):{" "}
                    <span dir="ltr" className="font-mono">{configQuery.data?.effectiveUrl ?? GITHUB_DEFAULT_HINT}</span>
                    {" "}— همین حالا بدون تنظیم، از گیت‌هاب رسمی اسکریپت بررسی می‌شود
                  </>
                )}
              </p>
            )}
          </div>

          {/* ── check button ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
              disabled={check.isPending || busy}
              onClick={() => {
                setAutoDetected(false); // manual check → leave auto-detected mode
                check.mutate();
              }}
            >
              {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              بررسی به‌روزرسانی
            </Button>
            {check.isPending && <span className="text-xs text-muted-foreground">در حال دریافت مانیفست…</span>}
          </div>

          {/* ── check result ── */}
          {checkResult && (
            <div
              className={cn(
                "space-y-3 rounded-xl border p-4",
                checkResult.available ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">نسخهٔ فعلی شما</p>
                  <p dir="ltr" className="font-mono text-sm font-bold">{checkResult.current}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">آخرین نسخهٔ موجود</p>
                  <p dir="ltr" className={cn("font-mono text-sm font-bold", checkResult.available && "text-emerald-600")}>
                    {checkResult.latest}
                  </p>
                </div>
                {faDate(checkResult.releasedAt) && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">تاریخ انتشار</p>
                    <p className="text-sm font-bold">{faDate(checkResult.releasedAt)}</p>
                  </div>
                )}
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  {autoDetected && checkResult.available && (
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      <ScanSearch className="h-3.5 w-3.5" />
                      به‌روزرسانی جدید شناسایی شد
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-bold",
                      checkResult.available
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {checkResult.available ? "به‌روزرسانی در دسترس است" : "شما در آخرین نسخه هستید"}
                  </span>
                </div>
              </div>

              {checkResult.notes && (
                <div className="rounded-lg bg-card p-3">
                  <p className="mb-1 text-[11px] font-bold text-muted-foreground">یادداشت‌های نسخه:</p>
                  <p className="whitespace-pre-line text-xs leading-6">{checkResult.notes}</p>
                </div>
              )}

              {checkResult.available && !checkResult.zipUrl && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  مانیفست نسخهٔ جدید را اعلام کرده اما آدرس فایل ZIP (zipUrl) ندارد — از سازندهٔ بسته بخواهید فایل را بارگذاری کند.
                </p>
              )}
              {needsMinVersion && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  این نسخه حداقل به نسخهٔ{" "}
                  <span dir="ltr" className="font-mono">{checkResult.minAppVersion}</span> نیاز دارد — ابتدا آن نسخه را نصب کنید.
                </p>
              )}
              {checkResult.runtime === "standalone" && (
                <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 p-2.5 text-[11px] leading-5 text-primary">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
                  نصب داکری (standalone) شناسایی شد: دکمهٔ نصب، فایل‌های عمومی (public) و ساختار دیتابیس را داخل کانتینر اعمال می‌کند؛ برای اعمال کامل کدهای برنامه (src) همین فایل ZIP از گیت‌هاب را با اسکریپت{" "}
                  <span dir="ltr" className="font-mono">./update.sh</span> روی سرور نصب کنید — حجم‌های دیتا در هر دو مسیر دست‌نخورده می‌مانند.
                </p>
              )}

              {checkResult.available && !!checkResult.zipUrl && !busy && (
                <div className="space-y-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={!canApply}
                        className="h-11 w-full rounded-lg bg-lime-500 text-base font-bold text-lime-950 shadow-lg shadow-lime-500/20 hover:bg-lime-400 sm:w-auto sm:min-w-56"
                      >
                        <Download className="h-5 w-5" />
                        دانلود و نصب به‌روزرسانی
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5 text-lime-600" />
                          نصب نسخهٔ {checkResult.latest}؟
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-right leading-6">
                          <span className="block">
                            قبل از اعمال، از فایل‌های فعلی پشتیبان گرفته می‌شود
                            <span dir="ltr" className="font-mono"> (db/update-backup-…) </span>
                            و چک‌سام فایل ZIP بررسی می‌شود
                            {checkResult.sha256 ? " (چک‌سام موجود است ✓)" : " (چک‌سام در مانیفست موجود نیست — بدون تأیید ادامه می‌دهد)"}.
                          </span>
                          <span className="flex items-start gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-700">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            دیتابیس (سفارش‌ها، کاربران، محصولات)، فایل .env و uploads/ هیچ تغییری نمی‌کنند.
                          </span>
                          <span className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            در پایان، فروشگاه حدود ۳۰ ثانیه برای راه‌اندازی مجدد در دسترس نخواهد بود و بعد خودش برمی‌گردد.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-lg bg-lime-500 font-bold text-lime-950 hover:bg-lime-400"
                          onClick={() => apply.mutate()} // dialog closes; progress card takes over
                        >
                          {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          بله، شروع به‌روزرسانی
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    فقط مدیر ارشد (SUPER_ADMIN) می‌تواند به‌روزرسانی را اجرا کند. پیشرفت به‌صورت زنده از همین پنل دنبال می‌شود.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                مانیفست: <span dir="ltr" className="font-mono">{checkResult.manifestUrl}</span>
              </p>
            </div>
          )}

          {/* ── live progress ── */}
          {busy && state && (
            <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {phase === "done" ? "به‌روزرسانی کامل شد" : state.message || "در حال اجرا…"}
                </p>
                {state.version && (
                  <span dir="ltr" className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                    v{state.version}
                  </span>
                )}
              </div>
              <Progress value={Math.max(2, state.percent)} className="h-2" aria-label="پیشرفت به‌روزرسانی" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{state.percent.toLocaleString("fa-IR")}٪</span>
                {busy && statusQuery.isError && <span>در انتظار پاسخ سرور…</span>}
              </div>
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {STEPS.map((s, i) => {
                  const done = phase === "done" || i < stepIndex;
                  const current = i === stepIndex && phase !== "done";
                  return (
                    <li
                      key={s.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                        current && "border-primary/40 bg-primary/10 font-bold text-primary",
                        done && "border-emerald-500/25 bg-emerald-500/5 text-emerald-600",
                        !done && !current && "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : current ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-current opacity-30" aria-hidden />
                      )}
                      {s.label}
                    </li>
                  );
                })}
              </ol>
              {phase === "done" ? (
                <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="flex items-start gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    راه‌اندازی مجدد در حال انجام است — چند لحظه صبر کنید و صفحه را رفرش کنید.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => window.location.reload()}
                  >
                    <RotateCw className="h-4 w-4" />
                    رفرش صفحه
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] leading-4 text-muted-foreground">
                  پس از اتمام، فروشگاه حدود ۳۰ ثانیه برای راه‌اندازی مجدد در دسترس نیست و بعد خودکار برمی‌گردد. این پنجره را نبندید.
                </p>
              )}
            </div>
          )}

          {/* ── error card ── */}
          {phase === "error" && state && (
            <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4" role="alert">
              <p className="flex items-start gap-2 text-sm font-bold text-destructive">
                <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                به‌روزرسانی با خطا متوقف شد
              </p>
              <p className="text-xs leading-6 text-destructive/90">{state.error || state.message || "خطای ناشناخته"}</p>
              <Note className="bg-emerald-500/5">
                هیچ داده‌ای تغییر نکرده است — اگر فایل‌ها جای‌گذاری شده باشند، پشتیبان در{" "}
                <span dir="ltr" className="font-mono">db/update-backup-…</span> موجود است (راهنمای بازگشت در UPDATE-GUIDE.md).
                مشکل را برطرف کنید و دوباره «بررسی به‌روزرسانی» را اجرا کنید.
              </Note>
              {state.log.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="rounded-lg text-[11px]">
                      <ChevronDown className="h-3.5 w-3.5" />
                      گزارش کامل ({state.log.length.toLocaleString("fa-IR")} خط)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre
                      dir="ltr"
                      className="mt-2 max-h-56 overflow-y-auto rounded-lg bg-muted p-3 text-left text-[10px] leading-5 text-muted-foreground"
                    >
                      {state.log.join("\n")}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* ── publishing guide (summary of UPDATE-GUIDE.md) ── */}
          <Collapsible>
            <div className="rounded-xl border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-xl p-3 text-right text-xs font-bold hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  <CloudUpload className="h-4 w-4 text-primary" />
                  راهنمای انتشار به‌روزرسانی (برای سازندهٔ بسته)
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 border-t px-3 pb-3 pt-3 text-[11px] leading-6 text-muted-foreground">
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5">
                    <p className="flex items-center gap-1.5 font-bold text-foreground">
                      <Github className="h-3.5 w-3.5" />
                      گزینهٔ ۱ — گیت‌هاب (پیشنهادی)
                    </p>
                    <p>
                      یک ریپازیتوری مثل <span dir="ltr" className="font-mono">taj-updates</span> بسازید؛ فایل{" "}
                      <span dir="ltr" className="font-mono">update-manifest.json</span> و ZIP نسخه را در آن بگذارید
                      (فایل خام در شاخهٔ main، یا بهتر: در GitHub Releases و آدرس مستقیم فایل ضمیمه). آدرس raw مانیفست
                      را در فیلد بالا ذخیره کنید. رایگان، سریع و بدون نیاز به هاست اضافه.
                    </p>
                  </div>
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5">
                    <p className="flex items-center gap-1.5 font-bold text-foreground">
                      <CloudUpload className="h-3.5 w-3.5" />
                      گزینهٔ ۲ — سرور / هاست خودتان (cPanel و…)
                    </p>
                    <p>
                      فایل‌ها را در مسیری مثل{" "}
                      <span dir="ltr" className="font-mono">public_html/updates/</span> آپلود کنید و آدرس{" "}
                      <span dir="ltr" className="font-mono">https://shoping.alexvshop.ir/updates/update-manifest.json</span>{" "}
                      را در فیلد بالا ذخیره کنید.
                    </p>
                  </div>
                  <ul className="list-inside list-disc space-y-1 pr-1">
                    <li>
                      ZIP فقط شامل فایل‌های تغییرکرده با مسیر کامل:{" "}
                      <span dir="ltr" className="font-mono">src/… ، public/… ، prisma/schema.prisma</span> و فایل‌های پیکربندی.
                    </li>
                    <li>
                      هرگز <span dir="ltr" className="font-mono">db/</span>،{" "}
                      <span dir="ltr" className="font-mono">.env</span> یا{" "}
                      <span dir="ltr" className="font-mono">uploads/</span> در ZIP نباشد — به‌روزرسان خودش اینها را رد می‌کند.
                    </li>
                    <li>
                      چک‌سام: <span dir="ltr" className="font-mono">sha256sum file.zip</span> و مقدار آن در فیلد{" "}
                      <span dir="ltr" className="font-mono">sha256</span> مانیفست.
                    </li>
                    <li>اگر package.json تغییر کرده باشد، بعد از به‌روزرسانی یک‌بار bun install را در کانتینر اجرا کنید.</li>
                  </ul>
                  <p>شرح کامل قالب مانیفست، ساخت بسته و بازگشت (rollback) در فایل UPDATE-GUIDE.md پروژه آمده است.</p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}

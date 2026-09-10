"use client";

/* ────────────────────────────────────────────────────────────────────────
 * v35 · «اسکریپت به‌روزرسانی (Update Script)» admin panel — CLEAN REWRITE
 * ────────────────────────────────────────────────────────────────────────
 * Self-contained client card (rendered inside a settings TabsContent —
 * no props, no imports from the settings page file).
 *
 * v35 changes (owner request):
 *   • NO channel/source disclosure — nothing in this UI reveals where the
 *     update comes from or any repo/URL. The panel only speaks about
 *     «نسخهٔ جدید» and its features.
 *   • The heavy backup wizard + ZIP download flow was REMOVED — the
 *     install is a simple confirm → apply → live progress → done.
 *   • STUCK «به‌روزرسانی کامل شد» FIXED: on mount, a leftover terminal
 *     done/error state from a PREVIOUS session is acknowledged via
 *     POST /api/admin/update/status (server resets the state file) and the
 *     panel immediately refetches — after a refresh the normal
 *     «بررسی به‌روزرسانی» flow is available again. The LIVE flow (the same
 *     page that ran the update) still shows the full success card.
 *   • Simplified step labels — no checksum/file-path jargon.
 * ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Download,
  HelpCircle,
  Loader2,
  PackageCheck,
  RotateCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

/* ── types (mirror the API responses) ── */

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
  runtime?: "source" | "standalone";
}

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
  { key: "downloading", label: "دریافت نسخهٔ جدید" },
  { key: "verifying", label: "تأیید سلامت فایل‌ها" },
  { key: "extracting", label: "آماده‌سازی فایل‌های جدید" },
  { key: "backing-up", label: "پشتیبان‌گیری خودکار" },
  { key: "applying", label: "نصب فایل‌های جدید" },
  { key: "migrating", label: "به‌روزرسانی ساختار داده‌ها" },
  { key: "restarting", label: "راه‌اندازی مجدد فروشگاه" },
];

/* ── tiny local helpers ── */

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

/* ── v32 (Task 13-a) · structured changelog rendering ───────────────────────
 * Manifest `notes` are parsed into paragraphs and bullet lists so the admin
 * sees the FEATURES of the new version as a clean list. */
type NotesBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

const NOTES_BULLET_RE = /^(?:[-•*–—]|[۰-۹0-9]+\s*[.)\u2013-])\s*(.+)$/u;

function parseManifestNotes(raw: string): NotesBlock[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks: NotesBlock[] = [];
  for (const line of lines) {
    const m = line.match(NOTES_BULLET_RE);
    if (m) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") last.items.push(m[1].trim());
      else blocks.push({ kind: "ul", items: [m[1].trim()] });
      continue;
    }
    const clauses = line
      .split(/(?:،|؛|,)\s*|\s+—\s*/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (line.length >= 80 && clauses.length >= 3) {
      blocks.push({ kind: "ul", items: clauses });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}

/* ═══════════════════════════ the panel ═══════════════════════════ */

export function UpdatePanel() {
  const [checkResult, setCheckResult] = useState<UpdateCheck | null>(null);
  const handledKey = useRef<string | null>(null);

  /* v31 · AUTO-DETECT — the background poll flips this when a newer version
   * appears WITHOUT the admin pressing «بررسی به‌روزرسانی». */
  const [autoDetected, setAutoDetected] = useState(false);
  const autoPolled = useRef<string | null>(null);

  /* v32 · «on latest» snapshot from the background poll. */
  const [upToDateLatest, setUpToDateLatest] = useState<string | null>(null);

  /* ── check ── */
  const check = useMutation({
    mutationFn: () => apiFetch<UpdateCheck>("/api/admin/update/check"),
    onSuccess: (data) => setCheckResult(data),
    onError: (e) => toast.error(e instanceof Error ? e.message : "بررسی به‌روزرسانی ناموفق بود"),
  });

  /* ── status (polled every 2s while a phase is active) ── */
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

  /* ══ v35 · STALE TERMINAL STATE → ACKNOWLEDGE ON MOUNT ═══════════════
   * A done/error phase that is ALREADY present when this panel mounts can
   * only be a leftover from a previous session/page load (the live flow sets
   * it while THIS page is open). POST-dismiss it server-side and refetch —
   * the admin gets the normal check UI back after a refresh, exactly as
   * requested. Runs exactly once per mount. */
  const mountDismissedRef = useRef(false);
  useEffect(() => {
    if (mountDismissedRef.current) return;
    if (phase !== "done" && phase !== "error") return;
    mountDismissedRef.current = true;
    void (async () => {
      try {
        await apiFetch("/api/admin/update/status", { method: "POST" });
        await statusQuery.refetch();
      } catch {
        /* silent — the GET route's stale-reset also covers this */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
   * Silent re-check ~3s after mount, then every 5 minutes. When a new
   * version appears the details card refreshes without the admin pressing
   * anything. */
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
      if (busyRef.current || checkPendingRef.current) return;
      let data: UpdatePoll;
      try {
        data = await apiFetch<UpdatePoll>("/api/admin/update/poll");
      } catch {
        return;
      }
      if (cancelled) return;
      if (data.hasUpdate) {
        setUpToDateLatest(null);
      } else if (data.latest) {
        setUpToDateLatest(data.latest);
      }
      if (!data.hasUpdate || !data.latest) return;
      if (autoPolled.current === data.latest) return;
      const shown = checkResultRef.current;
      if (shown && shown.available && shown.latest === data.latest) {
        autoPolled.current = data.latest;
        return;
      }
      autoPolled.current = data.latest;
      try {
        const full = await apiFetch<UpdateCheck>("/api/admin/update/check");
        if (cancelled) return;
        if (full.available && full.latest === data.latest) {
          setAutoDetected(true);
          setCheckResult(full);
        }
      } catch {
        /* silent */
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

  /* ═════════════ render ═════════════ */

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
            نسخهٔ اسکریپت فروشگاه خود را از این بخش بررسی و به‌روز کنید. به‌روزرسانی فقط روی
            <span className="font-bold"> کدها </span>
            اعمال می‌شود — دیتابیس (سفارش‌ها، کاربران، محصولات)، تنظیمات و فایل‌های بارگذاری‌شدهٔ شما
            همیشه محفوظ می‌مانند و هیچ تغییری نمی‌کنند.
          </Note>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── check button ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
              disabled={check.isPending || busy}
              onClick={() => {
                setAutoDetected(false);
                check.mutate();
              }}
            >
              {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              بررسی به‌روزرسانی
            </Button>
            {check.isPending && <span className="text-xs text-muted-foreground">در حال بررسی نسخهٔ جدید…</span>}
          </div>

          {/* ── always-visible «on latest» line ── */}
          {!busy && !checkResult?.available && upToDateLatest && (
            <p className="flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              شما از آخرین نسخهٔ اسکریپت استفاده می‌کنید
              (نسخهٔ <span dir="ltr" className="font-mono">{upToDateLatest}</span>)
            </p>
          )}

          {/* ── check result: new version features ── */}
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

              {/* the new version's features */}
              {checkResult.notes && (
                <div className="rounded-lg bg-card p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    قابلیت‌ها و تغییرات نسخهٔ جدید:
                  </p>
                  <div className="space-y-2">
                    {parseManifestNotes(checkResult.notes).map((block, i) =>
                      block.kind === "p" ? (
                        <p key={i} className="text-xs leading-6 text-foreground/90">
                          {block.text}
                        </p>
                      ) : (
                        <ul key={i} className="space-y-1 pr-1">
                          {block.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs leading-6 text-foreground/90">
                              <CheckCircle2 className="mt-1.5 h-3 w-3 shrink-0 text-emerald-500/70" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                </div>
              )}

              {checkResult.available && !checkResult.zipUrl && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  بستهٔ نسخهٔ جدید هنوز آماده نشده است — کمی بعد دوباره بررسی کنید.
                </p>
              )}
              {needsMinVersion && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  این نسخه حداقل به نسخهٔ{" "}
                  <span dir="ltr" className="font-mono">{checkResult.minAppVersion}</span> نیاز دارد — ابتدا آن نسخه را نصب کنید.
                </p>
              )}

              {/* ── simple install confirm ── */}
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
                        نصب نسخه جدید
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
                            نسخهٔ جدید روی کدهای فروشگاه اعمال می‌شود و همهٔ قابلیت‌های فهرست‌شده فعال می‌شوند.
                          </span>
                          <span className="flex items-start gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-700">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            دیتابیس (سفارش‌ها، کاربران، محصولات)، تنظیمات و فایل‌های بارگذاری‌شدهٔ شما هیچ تغییری نمی‌کنند.
                          </span>
                          <span className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            در پایان، فروشگاه چند لحظه برای راه‌اندازی مجدد در دسترس نخواهد بود و بعد خودش برمی‌گردد.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-lg bg-lime-500 font-bold text-lime-950 hover:bg-lime-400"
                          onClick={() => apply.mutate()}
                        >
                          {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                          شروع به‌روزرسانی
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    فقط مدیر ارشد (SUPER_ADMIN) می‌تواند به‌روزرسانی را اجرا کند. پیشرفت به‌صورت زنده از همین پنل دنبال می‌شود.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── live progress ── */}
          {busy && state && (
            <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {phase === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
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
                {statusQuery.isError && <span>در انتظار پاسخ سرور…</span>}
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
                  <p className="flex items-start gap-1.5 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                    اسکریپت شما به آخرین نسخه به‌روز شد
                    {state.version && (
                      <span dir="ltr" className="font-mono">(نسخهٔ {state.version})</span>
                    )}
                  </p>
                  <p className="text-[11px] leading-5 text-emerald-700/80">
                    برای بارگذاری قابلیت‌های جدید، صفحه را رفرش کنید — فروشگاه چند لحظه برای راه‌اندازی مجدد در دسترس نیست.
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
                  پس از اتمام، فروشگاه چند لحظه برای راه‌اندازی مجدد در دسترس نیست و بعد خودکار برمی‌گردد. این پنجره را نبندید.
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
                هیچ داده‌ای تغییر نکرده است. مشکل را برطرف کنید و دوباره «بررسی به‌روزرسانی» را اجرا کنید.
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

        </CardContent>
      </Card>
    </div>
  );
}

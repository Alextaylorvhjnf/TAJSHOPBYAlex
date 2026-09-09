"use client";

/* ────────────────────────────────────────────────────────────────────────
 * v32 · «اسکریپت به‌روزرسانی (Update Script)» admin panel
 * (Task 5-b + 10-a + 13-a)
 * ────────────────────────────────────────────────────────────────────────
 * Self-contained client card (rendered by another agent inside a settings
 * TabsContent — no props, no imports from the settings page file).
 *
 * v32 (Task 13-a) · ZERO configuration: the update channel is PERMANENTLY
 * HARD-WIRED to the owner's official GitHub repo — the manifest URL lives
 * only in src/lib/updater.ts (GITHUB_MANIFEST_URL). This panel has ONE
 * «بررسی به‌روزرسانی» button (real GitHub fetch) → on-latest chip, an
 * update card (version + structured changelog + «نصب نسخه جدید») → POST
 * apply → poll /api/admin/update/status every 2s while a phase is active →
 * success / error card. Data (db/, .env, uploads) is never touched.
 *
 * v32 (Task 10-a): the confirm dialog became a backup wizard — a checkbox
 * (default CHECKED) offers a FULL pre-update backup: GET /api/admin/backup
 * builds a ZIP (db + .env + uploads) in memory, the dialog swaps to a live
 * 5-item checklist, the admin downloads the ZIP as a blob, then «بکاپ را
 * دانلود کردم» starts the apply. Unchecking the box (or «بدون بکاپ ادامه
 * بده» after an error) applies directly — the previous behavior. On mount
 * the existing 3s poll also feeds a small «شما از آخرین نسخهٔ اسکریپت
 * استفاده می‌کنید» status line under the check button.
 * ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileArchive,
  Github,
  HardDriveDownload,
  HelpCircle,
  Loader2,
  PackageCheck,
  RotateCw,
  ScanSearch,
  ShieldCheck,
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

/* ── v32 · pre-update full backup (Task 10-a) ──
 * The install dialog's backup step animates through this itemized checklist
 * (honest pacing: each step ~700ms) while the real GET /api/admin/backup
 * runs; when the fetch resolves, ALL steps complete and the ZIP download
 * button + follow-up «ادامهٔ به‌روزرسانی» appear. */
const BACKUP_STEPS: string[] = [
  "اطلاعات فروشگاه و تنظیمات",
  "مشتریان و کاربران",
  "برندها و دسته‌بندی‌ها",
  "محصولات و سفارش‌ها",
  "بسته‌بندی فایل ZIP",
];

/** Gregorian yyyy-MM-dd for the downloaded backup filename. */
function backupDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Persian human-readable file size (بایت / کیلوبایت / مگابایت). */
function faBytes(n: number): string {
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت`;
  const kb = n / 1024;
  if (kb >= 1) return `${kb.toLocaleString("fa-IR", { maximumFractionDigits: 0 })} کیلوبایت`;
  return `${n.toLocaleString("fa-IR")} بایت`;
}

/** mirror of GITHUB_MANIFEST_URL in src/lib/updater.ts (server-only) —
 * shown to the admin as the hard-wired channel, NOT editable. */
const GITHUB_CHANNEL_HINT =
  "https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main/updates/update-manifest.json";

/* ── v32 (Task 13-a) · structured changelog rendering ───────────────────────
 * Manifest `notes` arrive as raw text (single long line or multi-line with
 * bullets). Rendering it as one whitespace-pre-line blob is ugly — instead
 * it is parsed into paragraphs and bullet lists:
 *   • lines starting with - • * – — or ۱. / 1) … → bullet items (<ul>)
 *   • other lines → paragraphs (<p>)
 *   • a LONG single line whose only structure is «،» / «؛» / "," / " — "
 *     separators (the classic one-line changelog) → itemized into bullets */
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
    // one long comma/em-dash-separated line → itemized changelog
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

  /* v32 · «on latest» snapshot from the background poll — set INSIDE the
   * existing poll() (no second loop). When the 3s early poll reports
   * hasUpdate === false with a known latest version, a small always-visible
   * status line appears under the check button; an update report or an
   * error keeps it hidden/cleared (silent). */
  const [upToDateLatest, setUpToDateLatest] = useState<string | null>(null);

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

  /* ══ v32 · PRE-UPDATE FULL BACKUP FLOW (Task 10-a) ══════════════════
   * The install dialog became a 2-step wizard: «تأیید» (checkbox, default
   * checked) → «بکاپ» (live checklist + ZIP download + follow-up apply) or
   * directly the existing apply mutation when the checkbox is unchecked.
   * Honest animation: steps advance ~700ms while GET /api/admin/backup
   * runs; the fetch resolving completes every step. */
  type BackupDialogStep = "confirm" | "backup" | "error";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<BackupDialogStep>("confirm");
  const [wantBackup, setWantBackup] = useState(true);
  const [backupStage, setBackupStage] = useState(0); // completed BACKUP_STEPS count
  const [backupReady, setBackupReady] = useState(false);
  const [backupBlob, setBackupBlob] = useState<Blob | null>(null);
  const [backupZipSize, setBackupZipSize] = useState<number | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const backupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backupAbortRef = useRef<AbortController | null>(null);

  const stopBackupAnimation = () => {
    if (backupTimerRef.current) {
      clearInterval(backupTimerRef.current);
      backupTimerRef.current = null;
    }
  };

  useEffect(() => () => stopBackupAnimation(), []);

  /** reset the dialog to its initial «confirm» state (called on every close) */
  const resetBackupDialog = () => {
    backupAbortRef.current?.abort();
    backupAbortRef.current = null;
    stopBackupAnimation();
    setDialogStep("confirm");
    setWantBackup(true);
    setBackupStage(0);
    setBackupReady(false);
    setBackupBlob(null);
    setBackupZipSize(null);
    setBackupError(null);
    setDownloadStarted(false);
  };

  /** fetch the ZIP (plain fetch — NOT the JSON apiFetch) + drive the animation */
  const startBackup = async () => {
    const ac = new AbortController();
    backupAbortRef.current?.abort();
    backupAbortRef.current = ac;
    setDialogStep("backup");
    setBackupError(null);
    setBackupBlob(null);
    setBackupZipSize(null);
    setBackupReady(false);
    setDownloadStarted(false);
    setBackupStage(0);
    stopBackupAnimation();
    backupTimerRef.current = setInterval(() => {
      setBackupStage((s) => Math.min(s + 1, BACKUP_STEPS.length - 1)); // hold on the last step until the fetch resolves
    }, 700);
    try {
      const res = await fetch("/api/admin/backup", { signal: ac.signal });
      if (!res.ok) {
        let msg = `خطا در ارتباط با سرور (${res.status})`;
        try {
          const json = (await res.json()) as { message?: string } | null;
          if (json?.message) msg = json.message;
        } catch {
          /* non-JSON body — keep the generic message */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (ac.signal.aborted) return;
      stopBackupAnimation();
      setBackupBlob(blob);
      setBackupZipSize(blob.size);
      setBackupStage(BACKUP_STEPS.length);
      setBackupReady(true);
    } catch (e) {
      if (ac.signal.aborted) return; // dialog closed — state already reset
      stopBackupAnimation();
      setBackupError(e instanceof Error ? e.message : "دریافت بکاپ ناموفق بود");
      setDialogStep("error");
    } finally {
      if (backupAbortRef.current === ac) backupAbortRef.current = null;
    }
  };

  /** blob → objectURL → a.click() — the browser saves it as a file. The
   * download itself cannot be observed; revealing the follow-up button
   * right after it starts is the honest approximation. */
  const downloadBackup = () => {
    if (!backupBlob) return;
    const url = URL.createObjectURL(backupBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taj-backup-${backupDateStamp()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setDownloadStarted(true);
  };

  /** close the dialog (manual — Radix does NOT fire onOpenChange for
   * programmatic open-state changes), reset its state and start the apply. */
  const closeAndApply = () => {
    setDialogOpen(false);
    resetBackupDialog();
    apply.mutate(); // progress card takes over
  };

  const backupPercent = backupReady
    ? 100
    : Math.max(6, Math.round((backupStage / BACKUP_STEPS.length) * 100));

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
      if (cancelled) return;
      /* v32 · «on latest» snapshot for the always-visible status line —
       * recorded ONLY when the poll truly reports no update with a known
       * latest version; the moment an update appears the line is cleared
       * (the auto-detect flow takes over). Poll errors keep it untouched. */
      if (data.hasUpdate) {
        setUpToDateLatest(null);
      } else if (data.latest) {
        setUpToDateLatest(data.latest);
      }
      if (!data.hasUpdate || !data.latest) return;
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
            از این بخش نسخهٔ اسکریپت فروشگاه را بررسی و به‌روز کنید. فایل به‌روزرسانی (ZIP) همیشه از مخزن رسمی
            گیت‌هاب سازنده دانلود، با چک‌سام SHA-256 تأیید، از فایل‌های فعلی پشتیبان گرفته و سپس فقط روی
            <span className="font-bold"> کدها </span>
            اعمال می‌شود. دیتابیس (سفارش‌ها، کاربران، محصولات)، فایل <span dir="ltr" className="font-mono">.env</span> و
            پوشهٔ <span dir="ltr" className="font-mono">uploads/</span> هرگز دست نمی‌خورند. راهنمای کامل انتشار
            در فایل <span dir="ltr" className="font-mono">UPDATE-GUIDE.md</span> پروژه است.
          </Note>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── v32 (Task 13-a) · update channel — HARD-WIRED, read-only
              info (the URL config UI was removed; the source of truth is
              GITHUB_MANIFEST_URL in src/lib/updater.ts) ── */}
          <p className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            <Github className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span>
              کانال به‌روزرسانی به‌صورت ثابت روی مخزن رسمی گیت‌هاب سازنده تنظیم شده و قابل تغییر نیست:{" "}
              <span dir="ltr" className="font-mono">{GITHUB_CHANNEL_HINT}</span>
            </span>
          </p>

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

          {/* ── v32 · always-visible «on latest» line (set by the background
              poll — hidden while an update is available or an install runs) ── */}
          {!busy && !checkResult?.available && upToDateLatest && (
            <p className="flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              شما از آخرین نسخهٔ اسکریپت استفاده می‌کنید
              (نسخهٔ <span dir="ltr" className="font-mono">{upToDateLatest}</span>)
            </p>
          )}

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
                  <p className="mb-2 text-[11px] font-bold text-muted-foreground">تغییرات و یادداشت‌های نسخه:</p>
                  {/* v32 (Task 13-a) · structured changelog — paragraphs and
                      bullet lists parsed from the manifest notes, not one
                      whitespace-pre-line blob (see parseManifestNotes). */}
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
                  {/* v32 · controlled 2-step install dialog: «تأیید» (backup
                      checkbox, default checked) → «بکاپ» (live checklist + ZIP
                      download + follow-up apply) — or the apply mutation
                      directly when the checkbox is unchecked. */}
                  <AlertDialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) resetBackupDialog(); // abort in-flight backup, back to «تأیید»
                    }}
                  >
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

                      {/* ── step 1 · تأیید + بکاپ؟ ── */}
                      {dialogStep === "confirm" && (
                        <>
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

                          {/* v32 · pre-update full-backup checkbox (default CHECKED) */}
                          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                            <Checkbox
                              id="pre-update-backup"
                              checked={wantBackup}
                              onCheckedChange={(v) => setWantBackup(v === true)}
                              className="mt-1"
                            />
                            <Label htmlFor="pre-update-backup" className="cursor-pointer text-xs font-medium leading-6">
                              مایلم قبل از به‌روزرسانی بکاپ کامل فروشگاه دریافت کنم
                              <span className="font-bold text-emerald-600"> (پیشنهاد می‌شود)</span>
                            </Label>
                          </div>

                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
                            <Button
                              type="button"
                              className="rounded-lg bg-lime-500 font-bold text-lime-950 hover:bg-lime-400"
                              disabled={apply.isPending}
                              onClick={() => {
                                if (wantBackup) {
                                  void startBackup(); // stay inside the dialog → backup step
                                } else {
                                  closeAndApply();
                                }
                              }}
                            >
                              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              ادامه
                            </Button>
                          </AlertDialogFooter>
                        </>
                      )}

                      {/* ── step 2 · بکاپ کامل (same dialog, content swaps) ── */}
                      {dialogStep === "backup" && (
                        <>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <FileArchive className="h-5 w-5 text-emerald-600" />
                              بکاپ کامل فروشگاه — نسخهٔ {checkResult.latest}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-right leading-6">
                              فایل پشتیبان کامل (دیتابیس + فایل <span dir="ltr" className="font-mono">.env</span> + همهٔ
                              <span dir="ltr" className="font-mono"> uploads</span>) روی سرور ساخته می‌شود و روی رایانهٔ شما ذخیره می‌گردد.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          {/* live progress — itemized checklist */}
                          <div className="space-y-3 rounded-xl border bg-muted/30 p-3" aria-live="polite">
                            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                {!backupReady ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                                {!backupReady ? "در حال تهیهٔ بکاپ کامل…" : "بکاپ آماده است"}
                              </span>
                              <span>{backupPercent.toLocaleString("fa-IR")}٪</span>
                            </div>
                            <Progress value={Math.max(3, backupPercent)} className="h-2" aria-label="پیشرفت بکاپ" />
                            <ul className="space-y-1.5">
                              {BACKUP_STEPS.map((label, i) => {
                                const done = backupReady || i < backupStage;
                                const current = !backupReady && i === backupStage;
                                return (
                                  <li
                                    key={label}
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
                                    {label}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {/* ZIP ready → download, then the follow-up apply button */}
                          {backupReady && (
                            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                              <p className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                                <span className="flex items-center gap-1.5">
                                  <FileArchive className="h-3.5 w-3.5" />
                                  فایل بکاپ آماده شد
                                </span>
                                {backupZipSize !== null && <span>حجم: {faBytes(backupZipSize)}</span>}
                              </p>
                              <Button
                                type="button"
                                className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
                                onClick={downloadBackup}
                              >
                                <HardDriveDownload className="h-5 w-5" />
                                دانلود فایل بکاپ (ZIP)
                              </Button>
                              {downloadStarted && (
                                <AlertDialogAction
                                  className="mt-1 w-full rounded-lg bg-lime-500 font-bold text-lime-950 hover:bg-lime-400"
                                  onClick={() => apply.mutate()} // dialog closes; progress card takes over
                                >
                                  {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                                  بکاپ را دانلود کردم — ادامهٔ به‌روزرسانی
                                </AlertDialogAction>
                              )}
                            </div>
                          )}

                          {!backupReady && (
                            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              داده‌های فروشگاه دست نمی‌خورند؛ در پایان به‌روزرسانی، فروشگاه حدود ۳۰ ثانیه برای راه‌اندازی مجدد
                              در دسترس نخواهد بود — این پنجره را نبندید.
                            </p>
                          )}

                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
                          </AlertDialogFooter>
                        </>
                      )}

                      {/* ── step 3 · خطای بکاپ — retry یا ادامهٔ بدون بکاپ ── */}
                      {dialogStep === "error" && (
                        <>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-5 w-5" />
                              تهیهٔ بکاپ ناموفق بود
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2 text-right leading-6">
                              <span className="block">{backupError ?? "دریافت بکاپ ناموفق بود"}</span>
                              <span className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                در پایان، فروشگاه حدود ۳۰ ثانیه برای راه‌اندازی مجدد در دسترس نخواهد بود و بعد خودش برمی‌گردد.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-lg"
                              onClick={() => void startBackup()}
                            >
                              <RotateCw className="h-4 w-4" />
                              تلاش مجدد بکاپ
                            </Button>
                            <AlertDialogAction
                              className="rounded-lg bg-lime-500 font-bold text-lime-950 hover:bg-lime-400"
                              onClick={() => apply.mutate()} // dialog closes; progress card takes over
                            >
                              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              بدون بکاپ ادامه بده
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </>
                      )}
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    فقط مدیر ارشد (SUPER_ADMIN) می‌تواند به‌روزرسانی را اجرا کند. پیشرفت به‌صورت زنده از همین پنل دنبال می‌شود.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                کانال به‌روزرسانی (گیت‌هاب رسمی): <span dir="ltr" className="font-mono">{checkResult.manifestUrl}</span>
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
                /* v32 (Task 13-a) · post-install finished state — the required
                   success line + «رفرش صفحه» so the new features actually load. */
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

        </CardContent>
      </Card>
    </div>
  );
}

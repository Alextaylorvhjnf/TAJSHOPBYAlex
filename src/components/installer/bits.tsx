"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── shared types ───────── */

export interface RequirementItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  critical: boolean;
}

export interface DbInfo {
  type: "sqlite";
  path: string | null;
  exists: boolean;
}

export interface DbTestResult {
  success: boolean;
  message: string;
  fileExists: boolean;
  tables: number;
}

export interface DbSetupResult {
  success: boolean;
  message: string;
  log: string[];
}

export interface AdminFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface RunStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  error?: string;
}

/* ───────── API helpers ───────── */

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function parse(res: Response) {
  const json = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { ok?: boolean; message?: string; code?: string })
    | null;
  if (!json) throw new ApiError("پاسخ سرور نامعتبر است");
  if (json.ok === false) throw new ApiError(json.message ?? "خطای نامشخص", json.code);
  return json;
}

export async function apiGet<T = Record<string, unknown>>(path: string): Promise<T> {
  try {
    return (await parse(await fetch(path, { cache: "no-store" }))) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("خطای شبکه — ارتباط با سرور برقرار نشد");
  }
}

export async function apiPost<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  try {
    return (await parse(
      await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
    )) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("خطای شبکه — ارتباط با سرور برقرار نشد");
  }
}

/* ───────── UI bits ───────── */

export function StatusIcon({ status, className }: { status: "pass" | "warn" | "fail"; className?: string }) {
  if (status === "pass") return <CheckCircle2 className={cn("h-5 w-5 text-emerald-500", className)} />;
  if (status === "warn") return <AlertTriangle className={cn("h-5 w-5 text-amber-500", className)} />;
  return <XCircle className={cn("h-5 w-5 text-destructive", className)} />;
}

export function RunIcon({ status }: { status: RunStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />;
  if (status === "running") return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />;
  if (status === "failed") return <XCircle className="h-5 w-5 shrink-0 text-destructive" />;
  return <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />;
}

export function LogView({ lines, running, className }: { lines: string[]; running?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines.length, running]);
  return (
    <div
      ref={ref}
      dir="ltr"
      role="log"
      aria-label="گزارش عملیات"
      className={cn(
        "max-h-56 overflow-y-auto rounded-xl border bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300",
        className
      )}
    >
      {lines.length === 0 && !running && <p className="text-zinc-500">—</p>}
      {lines.map((l, i) => (
        <p key={i} className="whitespace-pre-wrap break-all">
          {l}
        </p>
      ))}
      {running && <p className="text-primary">▍</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Banner({
  kind,
  children,
}: {
  kind: "success" | "error" | "info" | "warn";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-primary/25 bg-primary/8 text-foreground",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-xl border p-3 text-xs leading-relaxed", styles)}>
      {children}
    </div>
  );
}

export function passwordStrength(pw: string): { label: string; pct: number; tone: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "ضعیف", pct: 30, tone: "bg-destructive" };
  if (score === 3) return { label: "متوسط", pct: 60, tone: "bg-amber-500" };
  return { label: "قوی", pct: 100, tone: "bg-emerald-500" };
}

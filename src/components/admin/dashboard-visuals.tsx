"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Dashboard visual primitives (v17) — photo-faithful widgets used
   ONLY by the admin dashboard page:

   • HeroKpi        — big gradient KPI cards from the «excel dashboard»
                      reference photo (cyan→green / yellow→peach /
                      pink→red gradients + frosted icon chip + glow blobs).
                      All colors come from the per-theme --kpi-N-* CSS
                      variables, so the SaaS themes automatically render
                      them as flat tinted cards (photo 2 style).
   • AdminMetricCard— compact metric card from the «Crextio SaaS» photo:
                      tinted icon chip, big tabular number, trend pill.
   • HealthBar      — slim rounded progress bars from photo 1.
   ═══════════════════════════════════════════════════════════════ */

/** Gradient hero KPI card — photo 1 style, theme-driven via --kpi-N-* vars. */
export function HeroKpi({
  index,
  title,
  value,
  sub,
  href,
  linkLabel,
  icon: Icon,
}: {
  index: 1 | 2 | 3;
  title: string;
  value: ReactNode;
  sub?: string;
  href?: string;
  linkLabel?: string;
  icon: LucideIcon;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-5 shadow-lg"
      style={{
        background: `var(--kpi-${index}-bg)`,
        color: `var(--kpi-${index}-fg)`,
        borderColor: "var(--kpi-border)",
      }}
    >
      {/* decorative glow blobs — the photo's soft color wash */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full blur-2xl"
        style={{ background: `var(--kpi-${index}-icon)`, opacity: 0.3 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -right-8 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `var(--kpi-${index}-icon)`, opacity: 0.22 }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold opacity-80">{title}</p>
          <p
            className="mt-2 truncate text-2xl font-black tabular-nums md:text-[27px]"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.16)" }}
          >
            {value}
          </p>
          {sub && <p className="mt-1 text-[11px] font-medium opacity-80">{sub}</p>}
          {href && linkLabel && (
            <Link
              href={href}
              className="mt-2.5 inline-flex items-center gap-0.5 text-[11px] font-bold underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
            >
              {linkLabel}
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm"
          style={{ background: `var(--kpi-${index}-chip)`, color: `var(--kpi-${index}-chip-fg)` }}
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </div>
  );
}

/** Compact SaaS metric card — photo 2 style (icon chip + big number + trend pill). */
export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  tone = "primary",
  trend,
  trendDir = "up",
  sub,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "violet" | "info";
  /** small pill, e.g. «+۱۲ این ماه» */
  trend?: string;
  trendDir?: "up" | "down";
  sub?: string;
}) {
  const chips: Record<string, string> = {
    primary: "bg-primary/12 text-primary",
    success: "bg-emerald-500/12 text-emerald-600",
    warning: "bg-amber-500/15 text-amber-600",
    danger: "bg-destructive/12 text-destructive",
    violet: "bg-violet-500/12 text-violet-600",
    info: "bg-cyan-500/12 text-cyan-600",
  };
  const TrendIcon = trendDir === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", chips[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black",
              trendDir === "up"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{title}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

/** Slim rounded progress bar — photo 1 «visitors» style. */
export function HealthBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  /** 0–100, clamped */
  pct: number;
  /** resolved hex or css color */
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
        <span className="text-[11px] font-black tabular-nums">{value}</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundImage: `linear-gradient(90deg, ${color}B3, ${color})`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   v23 — ZYWRA dashboard widgets («Invoice Management SaaS
   Dashboard | Zywra Studio» reference):
   • ZywraStatCard — white 16px card, p-24px, 14px/500 label,
     40×40 rounded-xl tinted icon square (indigo/red/cyan/emerald),
     28px/700 tabular value, 13px trend pill + a real-data mini chart.
   • MiniBarChart   — 12 rounded-t bars, indigo-400→indigo-500 by value.
   • MiniAreaChart  — smooth indigo-500 line + dots + soft area +
     dashed grid.
   All charts render REAL numbers passed by the dashboard page.
   ═══════════════════════════════════════════════════════════════ */

export interface ZywraTrend {
  /** signed percent change, e.g. 12 or -8 */
  pct: number;
  dir: "up" | "down";
  /** gray suffix, e.g. «نسبت به ۱۲ روز قبل» */
  label: string;
}

export function ZywraStatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
  sub,
  chart,
  breakdown,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: "red" | "indigo" | "cyan" | "emerald";
  trend?: ZywraTrend | null;
  sub?: string;
  /** mini chart node (MiniBarChart / MiniAreaChart) */
  chart?: ReactNode;
  /** mini breakdown rows for the 4th card */
  breakdown?: { label: string; value: string; color: string }[];
}) {
  const TrendIcon = trend?.dir === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="zy-stat-card flex min-w-0 flex-col border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", `zy-tint-${tone}`)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-3 truncate text-[28px] font-bold leading-10 tabular-nums">{value}</p>
      {trend ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn("zy-trend", trend.dir === "up" ? "zy-trend-up" : "zy-trend-down")}
            dir="ltr"
          >
            <TrendIcon className="h-3.5 w-3.5" strokeWidth={2} />
            {Math.abs(trend.pct).toLocaleString("fa-IR")}%
          </span>
          <span className="text-xs text-muted-foreground">{trend.label}</span>
        </p>
      ) : sub ? (
        <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
      ) : null}
      {chart && (
        <div dir="ltr" className="mt-4">
          {chart}
        </div>
      )}
      {breakdown && breakdown.length > 0 && (
        <ul className="mt-4 space-y-2 border-t pt-4">
          {breakdown.map((b) => (
            <li key={b.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                <span className="truncate">{b.label}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">{b.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── tiny SVG helpers (no chart lib — crisp at any card width) ── */

function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** bar path with only the TOP corners rounded */
function roundedTopBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rad}`,
    `Q ${x} ${y} ${x + rad} ${y}`,
    `L ${x + w - rad} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rad}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

/** catmull-rom → cubic bezier smooth path */
function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** 10–12 rounded-t bars, color interpolated indigo-400→indigo-500 */
export function MiniBarChart({ data, ariaLabel }: { data: number[]; ariaLabel: string }) {
  if (data.length === 0) {
    return <p className="py-3 text-center text-[10px] text-muted-foreground">بدون داده</p>;
  }
  const W = 260;
  const H = 84;
  const n = data.length;
  const slot = W / n;
  const barW = Math.min(slot - 5, 18);
  const max = Math.max(...data, 0);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
    >
      {data.map((v, i) => {
        const x = i * slot + (slot - barW) / 2;
        const ratio = max > 0 ? v / max : 0;
        const h = Math.max(ratio * (H - 4), v > 0 ? 4 : 2);
        return (
          <path
            key={i}
            d={roundedTopBarPath(x, H - h, barW, h, 3)}
            fill={lerpHex("#818CF8", "#6366F1", ratio)}
          />
        );
      })}
    </svg>
  );
}

/** smooth indigo line + dots + soft area fill + dashed grid */
export function MiniAreaChart({ data, ariaLabel }: { data: number[]; ariaLabel: string }) {
  if (data.length === 0) {
    return <p className="py-3 text-center text-[10px] text-muted-foreground">بدون داده</p>;
  }
  const W = 260;
  const H = 96;
  const top = 8;
  const bottom = 10;
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? (W - 12) / (data.length - 1) : 0;
  const pts = data.map((v, i) => ({
    x: 6 + i * step,
    y: top + (H - top - bottom) * (1 - v / max),
  }));
  const line = smoothLinePath(pts);
  const area =
    data.length > 1
      ? `${line} L ${pts[pts.length - 1].x} ${H - 2} L ${pts[0].x} ${H - 2} Z`
      : "";
  const gridYs = [top, top + (H - top - bottom) / 2, H - bottom];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
    >
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1={2}
          x2={W - 2}
          y1={y}
          y2={y}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="4 6"
        />
      ))}
      {area && <path d={area} fill="rgba(99,102,241,0.15)" />}
      {data.length > 1 && (
        <path
          d={line}
          fill="none"
          stroke="#6366F1"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={data.length > 14 ? 2 : 2.5}
          fill="#6366F1"
          stroke="var(--card)"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   v27.1 — «Analytics Admin UI» reference widgets:
   • ColorStatCard — the photo's signature SOLID gradient cards (pink /
     purple / blue / orange), white text, frosted icon chip, date range
     and a real mini chart. Used for the colorful card row under the
     charts ("for other things").
   • RoundStat     — the photo's circular icon badges (round statistics):
     a gradient ring + icon + big value + label, in a responsive strip.
   ═══════════════════════════════════════════════════════════════ */

export type ColorTone = "pink" | "purple" | "blue" | "orange";

const TONE_GRADIENTS: Record<ColorTone, string> = {
  pink: "linear-gradient(135deg, #DB2777 0%, #EC4899 100%)",
  purple: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
  blue: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
  orange: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)",
};

export function ColorStatCard({
  title,
  value,
  icon: Icon,
  tone,
  sub,
  chart,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: ColorTone;
  /** small gray line under the value (e.g. «این ماه») */
  sub?: string;
  /** real mini chart (MiniBarChart / MiniAreaChart) */
  chart?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5"
      style={{ background: TONE_GRADIENTS[tone] }}
    >
      {/* decorative glow blob */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -end-10 h-28 w-28 rounded-full bg-white/25 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white/85">{title}</p>
          <p className="mt-2 truncate text-[26px] font-black leading-8 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-[11px] font-medium text-white/75">{sub}</p>}
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
      </div>
      {chart && (
        <div dir="ltr" className="relative mt-3 rounded-xl bg-white/10 p-2">
          {chart}
        </div>
      )}
    </div>
  );
}

/** circular gradient icon badge + value + label (the photo's round stats) */
export function RoundStat({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: ColorTone;
  href?: string;
}) {
  const inner = (
    <>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-md"
        style={{ background: TONE_GRADIENTS[tone] }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black leading-6 tabular-nums">{value}</span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

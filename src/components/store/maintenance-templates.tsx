"use client";

/**
 * v31 (task 10-b) · REPAIR (maintenance) PAGE TEMPLATES + GATE
 * -----------------------------------------------------------------------
 * The (store) layout closes the shop for regular visitors while Settings →
 * «حالت تعمیر» tab is ON. This file owns the PRESENTATION of that closed
 * state:
 *
 *  ① MaintenanceGate (client) — wraps the whole store tree. Normally it
 *     renders the selected repair-page template (tech-dark / minimal-light /
 *     neon-glass / countdown-eta — admin picks, every word editable). But
 *     /track-order stays OPEN so closed visitors can still trace orders:
 *     there the children render inside a light "open shell" instead.
 *
 *  ② The old «ورود مدیران» button is GONE — its slot is the «پیگیری سفارش»
 *     button (links to /track-order, which the gate keeps reachable).
 *     Admins reach /admin directly.
 *
 * v31 (10-b): all four templates were re-polished into fuller, prettier
 * full-screen pages (animated HUD grid + radar, editorial minimal, aurora
 * glassmorphism, hero countdown with pulsing seconds) — the data contract,
 * the gate, the OpenShell and the live-ETA countdown LOGIC are unchanged, so
 * maintenance-screen.tsx / /maintenance-preview keep working untouched.
 * Presentation-layer only — switching templates never touches store data.
 * Scoped CSS uses the `mtx-`/`ngx-`/`cdx-`/`mlx-` prefixed namespaces.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Wrench, Phone, Mail, Clock, PackageSearch, ArrowLeft, Check, Sparkles, Timer } from "lucide-react";
import { useBranding } from "@/components/providers/branding-provider";
import type { MaintenanceTemplateId } from "@/lib/maintenance";

export interface MaintenanceScreenData {
  templateId: MaintenanceTemplateId;
  /** fully-resolved content (defaults merged server-side) */
  content: {
    titleSuffix: string;
    badge: string;
    description: string;
    phoneLabel: string;
    emailLabel: string;
    hoursLabel: string;
    trackingTitle: string;
    trackingDesc: string;
    trackingButton: string;
    footerNote: string;
    /** v30: caption above the countdown digits (countdown-eta template) */
    etaNote: string;
  };
  storeName: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  workingHours: string | null;
}

/* ══════════════════ THE GATE ══════════════════ */

export function MaintenanceGate({ data, children }: { data: MaintenanceScreenData; children: ReactNode }) {
  const pathname = usePathname();

  /* /track-order stays OPEN through the maintenance gate — closed visitors
   * can still trace their orders (v29 requirement). It renders inside a
   * minimal "open shell" (logo bar + page + tiny footer). */
  if (pathname === "/track-order") {
    return <OpenShell>{children}</OpenShell>;
  }

  return <RepairPage data={data} />;
}

/** the selected template (kept dumb — all data arrives as props) */
export function RepairPage({ data }: { data: MaintenanceScreenData }) {
  switch (data.templateId) {
    case "minimal-light":
      return <MinimalLightRepair data={data} />;
    case "neon-glass":
      return <NeonGlassRepair data={data} />;
    case "countdown-eta":
      return <CountdownEtaRepair data={data} />;
    case "tech-dark":
    default:
      return <TechDarkRepair data={data} />;
  }
}

/* ══════════════════ shared bits ══════════════════ */

/** the store logo (uploaded image) with the Wrench fallback mark */
function LogoMark({ data, box, img }: { data: MaintenanceScreenData; box: string; img: string }) {
  return (
    <div className={box}>
      {data.logo ? (
        <img src={data.logo} alt={`${data.storeName} logo`} className={img} />
      ) : (
        <Wrench className="h-8 w-8" />
      )}
    </div>
  );
}

function TrackingBlock({
  content,
  tone,
}: {
  content: MaintenanceScreenData["content"];
  tone: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={
        dark
          ? "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md"
          : "relative rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_10px_40px_-18px_rgba(0,0,0,.25)]"
      }
    >
      {/* dark tone: a thin gold hairline on the top edge, like a lit rim */}
      {dark && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      )}
      <div className="flex items-center gap-3.5">
        <span
          className={
            dark
              ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10"
              : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10"
          }
        >
          <PackageSearch className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className={dark ? "text-sm font-black text-white/90" : "text-sm font-black text-stone-800"}>
            {content.trackingTitle}
          </p>
          <p className={dark ? "mt-1 text-xs leading-5 text-zinc-400" : "mt-1 text-xs leading-5 text-muted-foreground"}>
            {content.trackingDesc}
          </p>
        </div>
      </div>
      <Link
        href="/track-order"
        className={
          dark
            ? "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-primary-foreground shadow-[0_0_26px_-6px_rgba(245,158,11,.65)] transition hover:brightness-110 hover:shadow-[0_0_38px_-6px_rgba(245,158,11,.9)]"
            : "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/40 hover:brightness-105"
        }
      >
        {content.trackingButton}
        <ArrowLeft className="h-3.5 w-3.5 opacity-70" />
      </Link>
    </div>
  );
}

/* ══════════════════ Template 1 · tech-dark — HUD / terminal diagnostics ══════════════════ */

const TECH_CSS = `
@keyframes mtx-grid { from { background-position: 0 0; } to { background-position: 44px 44px; } }
@keyframes mtx-scan { 0% { top: -14%; } 100% { top: 114%; } }
@keyframes mtx-led { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@keyframes mtx-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes mtx-radar { to { transform: rotate(360deg); } }
@keyframes mtx-shine { 0% { transform: translateX(170%); } 100% { transform: translateX(-170%); } }
@keyframes mtx-glitch-a { 0%, 90.5%, 95.5%, 100% { opacity: 0; clip-path: inset(0 0 0 0); transform: none; } 91% { opacity: .9; clip-path: inset(8% 0 64% 0); transform: translateX(2px); } 93% { opacity: .9; clip-path: inset(56% 0 22% 0); transform: translateX(-2px); } }
@keyframes mtx-glitch-b { 0%, 91.5%, 96.5%, 100% { opacity: 0; clip-path: inset(0 0 0 0); transform: none; } 92% { opacity: .8; clip-path: inset(62% 0 12% 0); transform: translateX(-2px); } 94% { opacity: .8; clip-path: inset(18% 0 56% 0); transform: translateX(2px); } }
.mtx-grid { animation: mtx-grid 9s linear infinite; }
.mtx-scan { position: absolute; left: 0; right: 0; height: 96px; background: linear-gradient(to bottom, transparent, rgba(52, 211, 153, .13), rgba(34, 211, 238, .05), transparent); box-shadow: 0 1px 0 rgba(52, 211, 153, .32); animation: mtx-scan 6.5s linear infinite; }
.mtx-led { animation: mtx-led 1.6s ease-in-out infinite; }
.mtx-caret { animation: mtx-caret 1.1s steps(1) infinite; }
.mtx-radar { animation: mtx-radar 5.5s linear infinite; }
.mtx-glitch { position: relative; }
.mtx-glitch::before, .mtx-glitch::after { content: attr(data-text); position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.mtx-glitch::before { color: #22d3ee; animation: mtx-glitch-a 4.6s steps(1) infinite; }
.mtx-glitch::after { color: #fb7185; animation: mtx-glitch-b 4.6s steps(1) infinite; }
.mtx-bar { position: relative; overflow: hidden; }
.mtx-bar::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, .5) 50%, transparent 70%); animation: mtx-shine 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .mtx-grid, .mtx-scan, .mtx-led, .mtx-caret, .mtx-radar, .mtx-glitch::before, .mtx-glitch::after, .mtx-bar::after { animation: none !important; } }
`;

function TechDarkRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  const diagnostics: { label: string; status: string; ok: boolean }[] = [
    { label: "CHECK_DATABASE", status: "OK", ok: true },
    { label: "CHECK_API_GATEWAY", status: "OK", ok: true },
    { label: "CHECK_INVENTORY", status: "OK", ok: true },
    { label: "REPAIR_MODE", status: "ACTIVE", ok: false },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070a] text-zinc-100 flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: TECH_CSS }} />
      {/* slowly-panning engineering grid + neon ambience */}
      <div aria-hidden className="mtx-grid pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(52,211,153,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      {/* corner radar sweep (decorative HUD accent) */}
      <div aria-hidden className="pointer-events-none absolute -left-48 top-1/2 hidden h-[30rem] w-[30rem] -translate-y-1/2 opacity-40 md:block">
        <span className="absolute inset-0 rounded-full border border-emerald-500/20" />
        <span className="absolute inset-[16%] rounded-full border border-emerald-500/15" />
        <span className="absolute inset-[32%] rounded-full border border-emerald-500/10" />
        <span className="mtx-radar absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(52,211,153,.25),transparent_80deg,transparent_360deg)]" />
      </div>
      {/* sweeping scan line */}
      <div aria-hidden className="mtx-scan pointer-events-none absolute inset-x-0" />

      <main className="relative z-10 w-full max-w-xl">
        {/* HUD panel with corner brackets */}
        <div className="relative rounded-[28px] border border-emerald-500/20 bg-[#070b0e]/85 p-6 shadow-[0_0_80px_-20px_rgba(16,185,129,.5)] backdrop-blur-md sm:p-8">
          <span aria-hidden className="absolute -top-px -right-px h-7 w-7 rounded-tr-[28px] border-t-2 border-r-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -top-px -left-px h-7 w-7 rounded-tl-[28px] border-t-2 border-l-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -bottom-px -right-px h-7 w-7 rounded-br-[28px] border-b-2 border-r-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -bottom-px -left-px h-7 w-7 rounded-bl-[28px] border-b-2 border-l-2 border-emerald-400/70" />

          {/* system status bar + LEDs */}
          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-4" dir="ltr">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-emerald-500/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,.6)]" />
              MAINT.SYS v31
            </span>
            <span className="flex items-center gap-4 font-mono text-[9px] tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,.6)]" />
                POWER
              </span>
              <span className="mtx-led flex items-center gap-1.5" style={{ animationDuration: "1.2s" }}>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,.55)]" />
                NETWORK
              </span>
              <span className="mtx-led flex items-center gap-1.5" style={{ animationDuration: "2.4s" }}>
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,.5)]" />
                SERVICE
              </span>
            </span>
          </div>

          <div className="mt-7 text-center">
            <LogoMark
              data={data}
              box="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_45px_-8px_rgba(16,185,129,.7)]"
              img="h-12 w-12 rounded-xl object-contain"
            />

            <p className="mb-3 font-mono text-[10px] tracking-[0.25em] text-cyan-400/90" dir="ltr">
              [ {content.badge} ]
            </p>

            <h1
              className="mtx-glitch text-3xl font-black leading-tight sm:text-4xl"
              data-text={`${data.storeName} ${content.titleSuffix}`}
            >
              {data.storeName}{" "}
              <span className="bg-gradient-to-l from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {content.titleSuffix}
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">{content.description}</p>
          </div>

          {/* diagnostics terminal window */}
          <div
            className="mt-7 overflow-hidden rounded-2xl border border-emerald-500/15 bg-black/50 font-mono text-[11px] leading-6 backdrop-blur-sm"
            dir="ltr"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </span>
              <span className="text-[9px] tracking-widest text-zinc-500">~/maintenance — diagnostics.log</span>
            </div>
            <div className="p-4">
              {diagnostics.map((d) => (
                <p key={d.label} className="flex items-center whitespace-nowrap text-zinc-400">
                  <span className="text-emerald-500/80">&gt;</span>
                  <span className="ms-2">{d.label}</span>
                  <span className="mx-3 flex-1 overflow-hidden border-b border-dotted border-zinc-700/80" />
                  <span
                    className={
                      d.ok
                        ? "rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px text-[10px] font-bold text-emerald-400"
                        : "rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[10px] font-bold text-amber-400"
                    }
                  >
                    {d.status}
                  </span>
                </p>
              ))}
              <p className="mt-1 flex items-center text-emerald-400">
                <span>&gt;</span>
                <span className="ms-2">restore_service</span>
                <span className="mtx-caret ms-1 inline-block h-4 w-[7px] bg-emerald-400" />
              </p>

              {/* glowing progress indicators */}
              <div className="mt-4 space-y-2.5">
                <div>
                  <div className="mb-1 flex justify-between text-[9px] tracking-wider text-zinc-500">
                    <span>SYSTEM_RESTORE</span>
                    <span className="text-emerald-400">68%</span>
                  </div>
                  <div className="mtx-bar h-1.5 rounded-full bg-emerald-500/10">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,.6)]" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[9px] tracking-wider text-zinc-500">
                    <span>FRONTEND_CACHE</span>
                    <span className="text-cyan-400">41%</span>
                  </div>
                  <div className="mtx-bar h-1.5 rounded-full bg-cyan-500/10">
                    <div className="h-full w-[41%] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,.5)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* contacts as glass panels */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {data.phone && (
              <a
                href={`tel:${data.phone}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start backdrop-blur-md transition hover:border-emerald-400/50 hover:bg-emerald-500/[0.07] hover:shadow-[0_0_28px_-8px_rgba(52,211,153,.55)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Phone className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold tracking-wide text-zinc-500">{content.phoneLabel}</span>
                  <span dir="ltr" className="block truncate font-mono text-sm font-bold tabular-nums text-emerald-100">
                    {data.phone}
                  </span>
                </span>
              </a>
            )}
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-cyan-500/[0.07] hover:shadow-[0_0_28px_-8px_rgba(34,211,238,.55)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold tracking-wide text-zinc-500">{content.emailLabel}</span>
                  <span dir="ltr" className="block truncate font-mono text-sm font-bold text-cyan-100">
                    {data.email}
                  </span>
                </span>
              </a>
            )}
          </div>

          {data.workingHours && (
            <p className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/25 bg-black/30 p-3.5 text-xs leading-5 text-zinc-400">
              <Clock className="h-4 w-4 shrink-0 text-emerald-400/80" />
              {content.hoursLabel}: <span className="font-bold text-emerald-200/90">{data.workingHours}</span>
            </p>
          )}

          <div className="mt-6">
            <TrackingBlock content={content} tone="dark" />
          </div>

          <p className="mt-6 text-center text-[11px] tracking-wide text-zinc-600">{content.footerNote}</p>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════ Template 2 · minimal-light — airy editorial restraint ══════════════════ */

const MINIMAL_CSS = `
@keyframes mlx-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
.mlx-up { animation: mlx-up .8s cubic-bezier(.22, .68, .36, 1) both; }
@media (prefers-reduced-motion: reduce) { .mlx-up { animation: none !important; } }
`;

function MinimalLightRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafaf9] text-stone-900 flex items-center justify-center px-4 py-16" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: MINIMAL_CSS }} />
      {/* whisper-soft ambient light + a thin editorial frame */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(245,158,11,.08),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-5 rounded-[2rem] border border-stone-200/70 sm:inset-8" />

      <main className="relative z-10 w-full max-w-xl text-center">
        <div className="mlx-up" style={{ animationDelay: "0ms" }}>
          <LogoMark
            data={data}
            box="mx-auto mb-8 grid h-16 w-16 place-items-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[0_12px_40px_-16px_rgba(0,0,0,.2)]"
            img="h-10 w-10 rounded-full object-contain"
          />
        </div>

        <p
          className="mlx-up mb-6 inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-white px-4 py-1.5 text-[11px] font-bold tracking-[0.16em] text-stone-500 shadow-sm"
          style={{ animationDelay: "70ms" }}
        >
          <span className="h-1 w-1 rounded-full bg-amber-500" />
          {content.badge}
        </p>

        <h1 className="mlx-up text-[2.5rem] font-semibold leading-[1.3] tracking-tight text-stone-800 sm:text-5xl" style={{ animationDelay: "140ms" }}>
          {data.storeName}
          <span className="mt-2 block text-xl font-light text-stone-400 sm:text-2xl">{content.titleSuffix}</span>
        </h1>

        {/* the single thin gold accent rule with a center diamond */}
        <div aria-hidden className="mlx-up mx-auto mt-8 flex items-center justify-center gap-3" style={{ animationDelay: "210ms" }}>
          <span className="h-px w-14 bg-stone-300" />
          <span className="h-1.5 w-1.5 rotate-45 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,.6)]" />
          <span className="h-px w-14 bg-stone-300" />
        </div>

        <p className="mlx-up mx-auto mt-7 max-w-md text-[15px] leading-8 text-stone-500" style={{ animationDelay: "280ms" }}>
          {content.description}
        </p>

        {/* elegant inline contact row, separated by hairlines */}
        <div className="mlx-up mt-10 flex flex-wrap items-center justify-center gap-y-6" style={{ animationDelay: "350ms" }}>
          {data.phone && (
            <a href={`tel:${data.phone}`} className="group flex flex-col items-center gap-1.5 px-7 transition">
              <span className="text-[10px] font-bold tracking-[0.14em] text-stone-400">{content.phoneLabel}</span>
              <span dir="ltr" className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-stone-700 transition group-hover:text-amber-700">
                <Phone className="h-3.5 w-3.5 text-amber-600" />
                {data.phone}
              </span>
            </a>
          )}
          {data.phone && data.email && <span aria-hidden className="hidden h-10 w-px bg-stone-200 sm:block" />}
          {data.email && (
            <a href={`mailto:${data.email}`} className="group flex flex-col items-center gap-1.5 px-7 transition">
              <span className="text-[10px] font-bold tracking-[0.14em] text-stone-400">{content.emailLabel}</span>
              <span dir="ltr" className="flex items-center gap-1.5 text-sm font-bold text-stone-700 transition group-hover:text-amber-700">
                <Mail className="h-3.5 w-3.5 text-amber-600" />
                {data.email}
              </span>
            </a>
          )}
          {(data.phone || data.email) && data.workingHours && <span aria-hidden className="hidden h-10 w-px bg-stone-200 sm:block" />}
          {data.workingHours && (
            <p className="flex flex-col items-center gap-1.5 px-7">
              <span className="text-[10px] font-bold tracking-[0.14em] text-stone-400">{content.hoursLabel}</span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                {data.workingHours}
              </span>
            </p>
          )}
        </div>

        <div className="mlx-up mx-auto mt-11 max-w-sm" style={{ animationDelay: "420ms" }}>
          <TrackingBlock content={content} tone="light" />
        </div>

        <p className="mlx-up mt-9 text-[11px] tracking-[0.08em] text-stone-400" style={{ animationDelay: "480ms" }}>
          {content.footerNote}
        </p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 3 · neon-glass — aurora glassmorphism ══════════════════ */

const NEON_CSS = `
@keyframes ngx-orb1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-40px, 48px) scale(1.15); } }
@keyframes ngx-orb2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(48px, -36px) scale(1.1); } }
@keyframes ngx-orb3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-30px, -40px) scale(1.18); } }
@keyframes ngx-hue { 0%, 100% { filter: blur(70px) hue-rotate(0deg); } 50% { filter: blur(70px) hue-rotate(26deg); } }
@keyframes ngx-ring { to { transform: rotate(360deg); } }
@keyframes ngx-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes ngx-twinkle { 0%, 100% { opacity: .15; transform: scale(.8); } 50% { opacity: .9; transform: scale(1.15); } }
.ngx-blob { position: absolute; border-radius: 9999px; filter: blur(70px); opacity: .55; will-change: transform; }
.ngx-blob-1 { width: 28rem; height: 28rem; background: #d946ef; top: -10rem; right: -8rem; animation: ngx-orb1 14s ease-in-out infinite, ngx-hue 18s ease-in-out infinite; }
.ngx-blob-2 { width: 24rem; height: 24rem; background: #22d3ee; opacity: .4; bottom: -9rem; left: -7rem; animation: ngx-orb2 17s ease-in-out infinite, ngx-hue 22s ease-in-out infinite reverse; }
.ngx-blob-3 { width: 16rem; height: 16rem; background: #fb7185; opacity: .35; top: 30%; left: 16%; animation: ngx-orb3 12s ease-in-out infinite; }
.ngx-glass { background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .12); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.ngx-ring { position: absolute; left: 50%; top: 50%; width: 220%; aspect-ratio: 1; transform: translate(-50%, -50%); background: conic-gradient(from 0deg, transparent 0deg, #d946ef 55deg, #22d3ee 110deg, transparent 165deg, transparent 360deg); animation: ngx-ring 7s linear infinite; }
.ngx-bob { animation: ngx-bob 5.5s ease-in-out infinite; }
.ngx-star { position: absolute; border-radius: 9999px; background: white; animation: ngx-twinkle 3.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ngx-blob-1, .ngx-blob-2, .ngx-blob-3, .ngx-ring, .ngx-bob, .ngx-star { animation: none !important; } }
`;

function NeonGlassRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0714] text-white flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: NEON_CSS }} />
      {/* aurora mesh: layered gradient sky + drifting hue-shifting orbs + stars */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_10%,#1b0f33_0%,transparent_60%),radial-gradient(110%_80%_at_20%_90%,#101033_0%,transparent_55%)]" />
      <div aria-hidden className="ngx-blob ngx-blob-1 pointer-events-none" />
      <div aria-hidden className="ngx-blob ngx-blob-2 pointer-events-none" />
      <div aria-hidden className="ngx-blob ngx-blob-3 pointer-events-none" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="ngx-star left-[18%] top-[22%] h-1 w-1" />
        <span className="ngx-star left-[76%] top-[30%] h-1.5 w-1.5" style={{ animationDelay: "1.2s" }} />
        <span className="ngx-star left-[30%] top-[68%] h-1 w-1" style={{ animationDelay: "2.1s" }} />
        <span className="ngx-star left-[62%] bottom-[14%] h-1 w-1" style={{ animationDelay: ".6s" }} />
        <span className="ngx-star left-[48%] top-[10%] h-1.5 w-1.5" style={{ animationDelay: "1.8s" }} />
        <span className="ngx-star left-[86%] top-[58%] h-1 w-1" style={{ animationDelay: "2.7s" }} />
      </div>

      <main className="relative z-10 w-full max-w-lg">
        {/* glass card wrapped in an animated conic-gradient ring border */}
        <div className="relative overflow-hidden rounded-[32px] p-[1.5px] shadow-[0_0_90px_-20px_rgba(217,70,239,.45)]">
          <span aria-hidden className="ngx-ring" />
          <div className="relative rounded-[31px] border border-white/10 bg-[#0d0920]/80 p-7 backdrop-blur-2xl sm:p-9">
            <div className="text-center">
              {/* floating logo chip */}
              <LogoMark
                data={data}
                box="ngx-bob mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-fuchsia-400/30 bg-white/[0.07] text-fuchsia-300 shadow-[0_0_38px_-6px_rgba(217,70,239,.6)] backdrop-blur-xl"
                img="h-12 w-12 rounded-2xl object-contain"
              />

              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 px-3.5 py-1.5 text-[10px] font-black tracking-wide text-fuchsia-300 shadow-[0_0_20px_-4px_rgba(217,70,239,.6)]">
                <Sparkles className="h-3 w-3" />
                {content.badge}
              </span>

              <h1 className="mt-4 text-3xl font-black leading-tight [filter:drop-shadow(0_0_18px_rgba(232,121,249,.4))] sm:text-[2.6rem]">
                {data.storeName}{" "}
                <span className="bg-gradient-to-l from-fuchsia-400 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                  {content.titleSuffix}
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/60">{content.description}</p>

              {/* contact chips as glass pills */}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="ngx-glass flex items-center gap-3 rounded-2xl px-4 py-3 text-start transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-300">
                      <Phone className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold text-white/50">{content.phoneLabel}</span>
                      <span dir="ltr" className="block truncate text-sm font-bold tabular-nums text-white/90">{data.phone}</span>
                    </span>
                  </a>
                )}
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="ngx-glass flex items-center gap-3 rounded-2xl px-4 py-3 text-start transition hover:border-cyan-400/50 hover:bg-cyan-500/10"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold text-white/50">{content.emailLabel}</span>
                      <span dir="ltr" className="block truncate text-sm font-bold text-white/90">{data.email}</span>
                    </span>
                  </a>
                )}
              </div>

              {data.workingHours && (
                <p className="ngx-glass mt-3 flex items-center justify-center gap-2 rounded-2xl p-3.5 text-[11px] font-bold text-white/70">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  {content.hoursLabel}: <span className="text-white">{data.workingHours}</span>
                </p>
              )}

              <div className="mt-7">
                <TrackingBlock content={content} tone="dark" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/40">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 4 · countdown-eta — live ETA countdown hero ══════════════════ */

const CD_CSS = `
@keyframes cdx-flip { 0% { transform: translateY(-58%); opacity: 0; filter: blur(6px); } 100% { transform: translateY(0); opacity: 1; filter: blur(0); } }
@keyframes cdx-shine { 0% { transform: translateX(160%); } 100% { transform: translateX(-160%); } }
@keyframes cdx-step { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0); } 50% { box-shadow: 0 0 0 7px rgba(245, 158, 11, .16); } }
@keyframes cdx-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes cdx-dot { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.cdx-flip { animation: cdx-flip .45s cubic-bezier(.21, 1.02, .55, 1) both; }
.cdx-box { position: relative; overflow: hidden; }
.cdx-box::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .12) 50%, transparent 65%); animation: cdx-shine 3.4s ease-in-out infinite; }
.cdx-step-live { animation: cdx-step 1.7s ease-in-out infinite; }
.cdx-seconds { animation: cdx-pulse 1s ease-in-out infinite; }
.cdx-dot { animation: cdx-dot 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .cdx-flip, .cdx-box::after, .cdx-step-live, .cdx-seconds, .cdx-dot { animation: none !important; } }
`;

/** next 18:00 local — a stable, refresh-proof ETA target (rolls to tomorrow after 18:00) */
function nextEta(now: number): number {
  const t = new Date(now);
  t.setHours(18, 0, 0, 0);
  if (t.getTime() <= now) t.setDate(t.getDate() + 1);
  return t.getTime();
}

function CdUnit({ value, label, ready, hero = false }: { value: number; label: string; ready: boolean; hero?: boolean }) {
  const text = ready ? String(Math.max(0, value)).padStart(2, "0") : "--";
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className={
          hero
            ? "cdx-box cdx-seconds grid h-24 w-[5.5rem] place-items-center rounded-2xl border border-primary/30 bg-primary/[0.07] shadow-[0_0_30px_-8px_rgba(245,158,11,.55)] sm:h-28 sm:w-28"
            : "cdx-box grid h-20 w-[4.6rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24"
        }
        dir="ltr"
      >
        <span
          key={text}
          className={
            hero
              ? "cdx-flip font-mono text-[2.6rem] font-black tabular-nums text-primary [text-shadow:0_0_24px_rgba(245,158,11,.55)] sm:text-[2.9rem]"
              : "cdx-flip font-mono text-4xl font-black tabular-nums text-primary [text-shadow:0_0_22px_rgba(245,158,11,.45)] sm:text-[2.6rem]"
          }
        >
          {text}
        </span>
      </div>
      <span className={hero ? "text-[11px] font-black text-primary/90" : "text-[11px] font-bold text-zinc-400"}>{label}</span>
    </div>
  );
}

function CountdownEtaRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  const steps = ["تشخیص عیب", "آماده‌سازی قطعات", "تعمیر", "تست نهایی"];
  /** the repair window = the final 8 hours before the ETA (progress source) */
  const WINDOW = 8 * 60 * 60 * 1000;

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const eta = useMemo(() => (now === null ? nextEta(Date.now()) : nextEta(now)), [now]);
  const remaining = now === null ? null : Math.max(0, eta - now);
  const days = remaining === null ? 0 : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  /** 0 → 1 across the last 8 hours before reopening (clamped) */
  const progress = remaining === null ? 0 : Math.min(1, Math.max(0, 1 - remaining / WINDOW));
  const currentStep = Math.min(3, Math.floor(progress * 4));
  const etaTime =
    remaining !== null
      ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(eta))
      : "…";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0e14] text-zinc-100 flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CD_CSS }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:26px_26px]" />
      {/* giant faint clock rings behind the hero */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.07]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.09]" />
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-2xl text-center">
        {/* repair stages */}
        <div className="mx-auto mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const live = i === currentStep;
            return (
              <span key={s} className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={
                    done
                      ? "grid h-7 w-7 place-items-center rounded-full border border-primary/60 bg-primary text-primary-foreground"
                      : live
                        ? "cdx-step-live grid h-7 w-7 place-items-center rounded-full border border-primary/60 bg-primary/20 text-primary"
                        : "grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-500"
                  }
                  aria-label={`مرحله ${i + 1}: ${s}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`hidden text-[10px] font-bold sm:inline ${done || live ? "text-zinc-300" : "text-zinc-500"}`}>{s}</span>
                {i < steps.length - 1 && (
                  <span aria-hidden className={`h-px w-3 sm:w-7 ${done ? "bg-primary/60" : "bg-zinc-800"}`} />
                )}
              </span>
            );
          })}
        </div>

        <LogoMark
          data={data}
          box="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_40px_-10px_rgba(245,158,11,.6)]"
          img="h-12 w-12 rounded-2xl object-contain"
        />

        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[10px] font-black text-primary">
          {content.badge}
        </span>

        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
          {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-md text-sm leading-7 text-zinc-400">{content.description}</p>

        {/* ── the live ETA countdown (hero panel) ── */}
        <div className="mx-auto mt-8 max-w-xl">
          <div className="relative rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
            <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <p className="mb-6 flex items-center justify-center gap-2 text-xs font-black text-zinc-200">
              <Timer className="cdx-dot h-4 w-4 shrink-0 text-primary" />
              {content.etaNote}
            </p>
            <div className="flex items-start justify-center gap-2.5 sm:gap-4" dir="rtl">
              <CdUnit value={days} label="روز" ready={remaining !== null} />
              <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
              <CdUnit value={hours} label="ساعت" ready={remaining !== null} />
              <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
              <CdUnit value={minutes} label="دقیقه" ready={remaining !== null} />
              <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
              <CdUnit value={seconds} label="ثانیه" ready={remaining !== null} hero />
            </div>

            {/* elapsed → eta progress bar with a glowing head */}
            <div className="mt-8">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary to-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,.55)] transition-[width] duration-700"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_14px_4px_rgba(245,158,11,.7)]"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-zinc-500">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3 text-primary/70" />
                  در حال ارتقا
                </span>
                <span className="text-primary">
                  {Math.round(progress * 100).toLocaleString("fa-IR")}٪
                </span>
                <span>بازگشایی: {etaTime}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-7 grid max-w-sm gap-2.5 sm:grid-cols-2">
          {data.phone && (
            <a
              href={`tel:${data.phone}`}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/[0.07]"
            >
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="text-[10px] font-bold text-zinc-500">{content.phoneLabel}: </span>
                <span dir="ltr" className="tabular-nums text-zinc-100">{data.phone}</span>
              </span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/[0.07]"
            >
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="text-[10px] font-bold text-zinc-500">{content.emailLabel}: </span>
                <span dir="ltr" className="text-zinc-100">{data.email}</span>
              </span>
            </a>
          )}
        </div>

        {data.workingHours && (
          <p className="mx-auto mt-2.5 flex max-w-sm items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-400">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            {content.hoursLabel}: <span className="font-bold text-zinc-200">{data.workingHours}</span>
          </p>
        )}

        <div className="mx-auto mt-8 max-w-sm">
          <TrackingBlock content={content} tone="dark" />
        </div>

        <p className="mt-6 text-[10px] text-zinc-600">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ the OPEN SHELL (track-order during maintenance) ══════════════════ */

/**
 * Minimal chrome around /track-order while the store is closed — brand bar
 * on top (logo + store name + «فروشگاه در حال تعمیر» chip), the page itself
 * untouched, tiny footer with copyright. No storefront nav leaks.
 */
function OpenShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  return (
    <div className="store-shell min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label={branding.storeName}>
            <img
              src={branding.logo || "/brand/logo-mark.webp"}
              alt={`${branding.storeName} logo`}
              className="h-9 w-9 rounded-xl border object-cover shadow-sm"
            />
            <span className="flex flex-col leading-none">
              <span className="gold-text text-base font-extrabold md:text-lg">{branding.storeName}</span>
              <span className="mt-1 text-[9px] font-medium tracking-[0.22em] text-muted-foreground md:text-[10px]">
                {branding.storeNameEn.toUpperCase()}
              </span>
            </span>
          </Link>
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary">
            <Wrench className="h-3.5 w-3.5" />
            فروشگاه در حالت تعمیر است
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-auto border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} {branding.storeName}</span>
          <Link href="/" className="inline-flex items-center gap-1 font-bold transition hover:text-primary">
            بازگشت به فروشگاه
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* re-export for the admin chooser preview icons */
export { Wrench as MaintenanceWrenchIcon };

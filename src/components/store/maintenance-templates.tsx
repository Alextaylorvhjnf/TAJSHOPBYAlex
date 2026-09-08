"use client";

/**
 * v30 · REPAIR (maintenance) PAGE TEMPLATES + GATE
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
 * v30: all four templates were fully redesigned (HUD terminal, minimal
 * light, neon glass, live countdown) — the data contract is unchanged, so
 * maintenance-screen.tsx / /maintenance-preview keep working untouched.
 * Presentation-layer only — switching templates never touches store data.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Wrench, Phone, Mail, Clock, PackageSearch, ArrowLeft, Check } from "lucide-react";
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
          ? "rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          : "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={
            dark
              ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10"
              : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10"
          }
        >
          <PackageSearch className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className={dark ? "text-sm font-black text-white/90" : "text-sm font-black text-stone-800"}>
            {content.trackingTitle}
          </p>
          <p className={dark ? "mt-0.5 text-xs leading-5 text-zinc-400" : "mt-0.5 text-xs leading-5 text-muted-foreground"}>
            {content.trackingDesc}
          </p>
        </div>
      </div>
      <Link
        href="/track-order"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 hover:shadow-primary/40"
      >
        {content.trackingButton}
        <ArrowLeft className="h-3.5 w-3.5 opacity-70" />
      </Link>
    </div>
  );
}

/* ══════════════════ Template 1 · tech-dark — HUD / terminal diagnostics ══════════════════ */

const TECH_CSS = `
@keyframes td-scan { 0% { top: -12%; } 100% { top: 112%; } }
@keyframes td-led { 0%, 100% { opacity: 1; } 50% { opacity: .2; } }
@keyframes td-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes td-shine { 0% { transform: translateX(160%); } 100% { transform: translateX(-160%); } }
@keyframes td-glitch-a { 0%, 90.5%, 95.5%, 100% { opacity: 0; clip-path: inset(0 0 0 0); transform: none; } 91% { opacity: .9; clip-path: inset(8% 0 64% 0); transform: translateX(2px); } 93% { opacity: .9; clip-path: inset(56% 0 22% 0); transform: translateX(-2px); } }
@keyframes td-glitch-b { 0%, 91.5%, 96.5%, 100% { opacity: 0; clip-path: inset(0 0 0 0); transform: none; } 92% { opacity: .8; clip-path: inset(62% 0 12% 0); transform: translateX(-2px); } 94% { opacity: .8; clip-path: inset(18% 0 56% 0); transform: translateX(2px); } }
.td-scan { position: absolute; left: 0; right: 0; height: 88px; background: linear-gradient(to bottom, transparent, rgba(52, 211, 153, .12), rgba(34, 211, 238, .04), transparent); box-shadow: 0 1px 0 rgba(52, 211, 153, .35); animation: td-scan 6.5s linear infinite; }
.td-led { animation: td-led 1.6s ease-in-out infinite; }
.td-caret { animation: td-caret 1.1s steps(1) infinite; }
.td-glitch { position: relative; }
.td-glitch::before, .td-glitch::after { content: attr(data-text); position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.td-glitch::before { color: #22d3ee; animation: td-glitch-a 4.2s steps(1) infinite; }
.td-glitch::after { color: #fb7185; animation: td-glitch-b 4.2s steps(1) infinite; }
.td-bar { position: relative; overflow: hidden; }
.td-bar::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, .45) 50%, transparent 70%); animation: td-shine 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .td-scan, .td-led, .td-caret, .td-glitch::before, .td-glitch::after, .td-bar::after { animation: none !important; } }
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
    <div className="relative min-h-screen overflow-hidden bg-[#050608] text-zinc-100 flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: TECH_CSS }} />
      {/* faint engineering grid + neon ambience */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(52,211,153,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      {/* sweeping scan line */}
      <div aria-hidden className="td-scan pointer-events-none absolute inset-x-0" />

      <main className="relative z-10 w-full max-w-xl">
        {/* HUD panel with corner brackets */}
        <div className="relative rounded-3xl border border-emerald-500/25 bg-[#070a0d]/90 p-6 shadow-[0_0_70px_-18px_rgba(16,185,129,.45)] backdrop-blur-sm sm:p-8">
          <span aria-hidden className="absolute -top-px -right-px h-6 w-6 rounded-tr-3xl border-t-2 border-r-2 border-emerald-400/80" />
          <span aria-hidden className="absolute -top-px -left-px h-6 w-6 rounded-tl-3xl border-t-2 border-l-2 border-emerald-400/80" />
          <span aria-hidden className="absolute -bottom-px -right-px h-6 w-6 rounded-br-3xl border-b-2 border-r-2 border-emerald-400/80" />
          <span aria-hidden className="absolute -bottom-px -left-px h-6 w-6 rounded-bl-3xl border-b-2 border-l-2 border-emerald-400/80" />

          {/* system status LEDs */}
          <div className="flex items-center justify-between" dir="ltr">
            <span className="font-mono text-[10px] tracking-widest text-emerald-500/70">MAINT.SYS v30</span>
            <span className="flex items-center gap-4 font-mono text-[9px] tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,.6)]" />
                POWER
              </span>
              <span className="td-led flex items-center gap-1.5" style={{ animationDuration: "1.2s" }}>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,.55)]" />
                NETWORK
              </span>
              <span className="td-led flex items-center gap-1.5" style={{ animationDuration: "2.4s" }}>
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
              className="td-glitch text-3xl font-black leading-tight sm:text-4xl"
              data-text={`${data.storeName} ${content.titleSuffix}`}
            >
              {data.storeName} <span className="text-emerald-400">{content.titleSuffix}</span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">{content.description}</p>
          </div>

          {/* diagnostics log */}
          <div className="mt-7 rounded-2xl border border-emerald-500/15 bg-black/40 p-4 font-mono text-[11px] leading-6" dir="ltr">
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
              <span className="td-caret ms-1 inline-block h-4 w-[7px] bg-emerald-400" />
            </p>

            {/* glowing progress indicators */}
            <div className="mt-4 space-y-2.5">
              <div>
                <div className="mb-1 flex justify-between text-[9px] tracking-wider text-zinc-500">
                  <span>SYSTEM_RESTORE</span>
                  <span className="text-emerald-400">68%</span>
                </div>
                <div className="td-bar h-1.5 rounded-full bg-emerald-500/10">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,.6)]" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[9px] tracking-wider text-zinc-500">
                  <span>FRONTEND_CACHE</span>
                  <span className="text-cyan-400">41%</span>
                </div>
                <div className="td-bar h-1.5 rounded-full bg-cyan-500/10">
                  <div className="h-full w-[41%] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,.5)]" />
                </div>
              </div>
            </div>
          </div>

          {/* contacts as terminal chips */}
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {data.phone && (
              <a
                href={`tel:${data.phone}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-xs font-bold transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
              >
                <Phone className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-200/70">{content.phoneLabel}:</span>
                <span dir="ltr" className="font-mono tracking-wide">{data.phone}</span>
              </a>
            )}
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2.5 text-xs font-bold transition hover:border-cyan-400/60 hover:bg-cyan-500/10"
              >
                <Mail className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-200/70">{content.emailLabel}:</span>
                <span dir="ltr" className="font-mono tracking-wide">{data.email}</span>
              </a>
            )}
          </div>

          {data.workingHours && (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-500/25 bg-black/30 p-3 text-[11px] leading-5 text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-emerald-400/80" />
              {content.hoursLabel}: <span className="font-bold text-emerald-200/90">{data.workingHours}</span>
            </p>
          )}

          <div className="mt-6">
            <TrackingBlock content={content} tone="dark" />
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-wider text-zinc-600" dir="ltr">
            {content.footerNote}
          </p>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════ Template 2 · minimal-light — Apple-like restraint ══════════════════ */

const MINIMAL_CSS = `
@keyframes ml-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.ml-up { animation: ml-up .7s cubic-bezier(.22, .68, .36, 1) both; }
@media (prefers-reduced-motion: reduce) { .ml-up { animation: none !important; } }
`;

function MinimalLightRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbfbfa] text-stone-900 flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: MINIMAL_CSS }} />
      {/* whisper-soft ambient light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_0%,rgba(245,158,11,.07),transparent_70%)]" />

      <main className="relative z-10 w-full max-w-xl text-center">
        <div className="ml-up" style={{ animationDelay: "0ms" }}>
          <LogoMark
            data={data}
            box="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl border border-stone-200/90 bg-white text-stone-500 shadow-[0_10px_30px_-12px_rgba(0,0,0,.15)]"
            img="h-10 w-10 rounded-xl object-contain"
          />
        </div>

        <p className="ml-up mb-4 text-[11px] font-bold tracking-[0.18em] text-stone-400" style={{ animationDelay: "60ms" }}>
          {content.badge}
        </p>

        <h1 className="ml-up text-4xl font-black leading-[1.25] tracking-tight sm:text-[2.75rem]" style={{ animationDelay: "120ms" }}>
          {data.storeName} <span className="text-stone-400">{content.titleSuffix}</span>
        </h1>

        {/* the single thin gold accent line */}
        <div aria-hidden className="ml-up mx-auto mt-6 h-[3px] w-16 rounded-full bg-gradient-to-l from-amber-400 via-amber-500 to-amber-600 shadow-[0_2px_10px_rgba(245,158,11,.45)]" style={{ animationDelay: "180ms" }} />

        <p className="ml-up mx-auto mt-6 max-w-md text-[15px] leading-8 text-stone-500" style={{ animationDelay: "240ms" }}>
          {content.description}
        </p>

        {/* elegant contact row */}
        <div className="ml-up mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3" style={{ animationDelay: "320ms" }}>
          {data.phone && (
            <a href={`tel:${data.phone}`} className="group flex items-center gap-2 text-sm transition hover:text-amber-700">
              <Phone className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-stone-400">{content.phoneLabel}</span>
              <span dir="ltr" className="font-bold tabular-nums">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a href={`mailto:${data.email}`} className="group flex items-center gap-2 text-sm transition hover:text-amber-700">
              <Mail className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-stone-400">{content.emailLabel}</span>
              <span dir="ltr" className="font-bold">{data.email}</span>
            </a>
          )}
          {data.workingHours && (
            <p className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-stone-400">{content.hoursLabel}</span>
              <span className="font-bold">{data.workingHours}</span>
            </p>
          )}
        </div>

        <div className="ml-up mx-auto mt-10 max-w-sm" style={{ animationDelay: "400ms" }}>
          <TrackingBlock content={content} tone="light" />
        </div>

        <p className="ml-up mt-8 text-[11px] tracking-wide text-stone-400" style={{ animationDelay: "480ms" }}>
          {content.footerNote}
        </p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 3 · neon-glass — fuchsia/cyan glassmorphism ══════════════════ */

const NEON_CSS = `
@keyframes ng-orb1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-36px, 42px) scale(1.14); } }
@keyframes ng-orb2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(44px, -32px) scale(1.1); } }
@keyframes ng-orb3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-28px, -36px) scale(1.18); } }
@keyframes ng-ring { to { transform: rotate(360deg); } }
@keyframes ng-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
.ng-blob { position: absolute; border-radius: 9999px; filter: blur(70px); opacity: .55; will-change: transform; }
.ng-blob-1 { width: 27rem; height: 27rem; background: #d946ef; top: -9rem; right: -7rem; animation: ng-orb1 13s ease-in-out infinite; }
.ng-blob-2 { width: 22rem; height: 22rem; background: #22d3ee; opacity: .4; bottom: -8rem; left: -6rem; animation: ng-orb2 16s ease-in-out infinite; }
.ng-blob-3 { width: 15rem; height: 15rem; background: #fb7185; opacity: .35; top: 32%; left: 18%; animation: ng-orb3 11s ease-in-out infinite; }
.ng-glass { background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .12); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.ng-ring { position: absolute; left: 50%; top: 50%; width: 220%; aspect-ratio: 1; transform: translate(-50%, -50%); background: conic-gradient(from 0deg, transparent 0deg, #d946ef 55deg, #22d3ee 110deg, transparent 165deg, transparent 360deg); animation: ng-ring 7s linear infinite; }
.ng-bob { animation: ng-bob 5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ng-blob, .ng-blob-2, .ng-blob-3, .ng-ring, .ng-bob { animation: none !important; } }
`;

function NeonGlassRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0714] text-white flex items-center justify-center p-4 py-10" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: NEON_CSS }} />
      {/* floating fuchsia / cyan / rose gradient orbs */}
      <div aria-hidden className="ng-blob ng-blob-1 pointer-events-none" />
      <div aria-hidden className="ng-blob ng-blob-2 pointer-events-none" />
      <div aria-hidden className="ng-blob ng-blob-3 pointer-events-none" />

      <main className="relative z-10 w-full max-w-lg">
        {/* glass card wrapped in an animated conic-gradient ring border */}
        <div className="relative overflow-hidden rounded-[30px] p-[1.5px]">
          <span aria-hidden className="ng-ring" />
          <div className="relative rounded-[29px] border border-white/10 bg-[#0c0818]/85 p-7 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-9">
            <div className="text-center">
              {/* floating logo chip */}
              <div className="ng-bob mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-fuchsia-400/30 bg-white/[0.07] text-fuchsia-300 shadow-[0_0_38px_-6px_rgba(217,70,239,.6)] backdrop-blur-xl">
                {data.logo ? (
                  <img src={data.logo} alt={`${data.storeName} logo`} className="h-12 w-12 rounded-2xl object-contain" />
                ) : (
                  <Wrench className="h-8 w-8" />
                )}
              </div>

              <span className="inline-block rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 px-3.5 py-1 text-[10px] font-black tracking-wide text-fuchsia-300">
                {content.badge}
              </span>

              <h1 className="mt-4 text-3xl font-black leading-tight [filter:drop-shadow(0_0_16px_rgba(232,121,249,.35))] sm:text-4xl">
                {data.storeName}{" "}
                <span className="bg-gradient-to-l from-fuchsia-400 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                  {content.titleSuffix}
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/60">{content.description}</p>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="ng-glass flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:border-fuchsia-400/50"
                  >
                    <Phone className="h-4 w-4 text-fuchsia-300" />
                    <span dir="ltr" className="tabular-nums">{data.phone}</span>
                  </a>
                )}
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="ng-glass flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:border-cyan-400/50"
                  >
                    <Mail className="h-4 w-4 text-cyan-300" />
                    <span dir="ltr">{data.email}</span>
                  </a>
                )}
              </div>

              {data.workingHours && (
                <p className="ng-glass mt-2.5 flex items-center justify-center gap-1.5 rounded-xl p-3 text-[11px] font-bold text-white/70">
                  <Clock className="h-3.5 w-3.5 text-cyan-300" />
                  {content.hoursLabel}: <span className="text-white">{data.workingHours}</span>
                </p>
              )}

              <div className="mt-7">
                <TrackingBlock content={content} tone="dark" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/40">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 4 · countdown-eta — live ETA countdown ══════════════════ */

const CD_CSS = `
@keyframes cd-flip { 0% { transform: translateY(-64%); opacity: 0; filter: blur(5px); } 100% { transform: translateY(0); opacity: 1; filter: blur(0); } }
@keyframes cd-shine { 0% { transform: translateX(150%); } 100% { transform: translateX(-150%); } }
@keyframes cd-step { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0); } 50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, .18); } }
.cd-flip { animation: cd-flip .5s cubic-bezier(.21, 1.02, .55, 1) both; }
.cd-box { position: relative; overflow: hidden; }
.cd-box::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .14) 50%, transparent 65%); animation: cd-shine 3.2s ease-in-out infinite; }
.cd-step-live { animation: cd-step 1.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .cd-flip, .cd-box::after, .cd-step-live { animation: none !important; } }
`;

/** next 18:00 local — a stable, refresh-proof ETA target (rolls to tomorrow after 18:00) */
function nextEta(now: number): number {
  const t = new Date(now);
  t.setHours(18, 0, 0, 0);
  if (t.getTime() <= now) t.setDate(t.getDate() + 1);
  return t.getTime();
}

function CdUnit({ value, label, ready }: { value: number; label: string; ready: boolean }) {
  const text = ready ? String(Math.max(0, value)).padStart(2, "0") : "--";
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className="cd-box grid h-20 w-[4.6rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24"
        dir="ltr"
      >
        <span key={text} className="cd-flip font-mono text-4xl font-black tabular-nums text-primary [text-shadow:0_0_22px_rgba(245,158,11,.45)] sm:text-[2.6rem]">
          {text}
        </span>
      </div>
      <span className="text-[11px] font-bold text-zinc-400">{label}</span>
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
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-2xl text-center">
        <div className="mx-auto mb-5 flex items-center justify-center gap-2">
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
                        ? "cd-step-live grid h-7 w-7 place-items-center rounded-full border border-primary/60 bg-primary/20 text-primary"
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

        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-[10px] font-black text-primary">
          {content.badge}
        </span>

        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
          {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-md text-sm leading-7 text-zinc-400">{content.description}</p>

        {/* ── the live ETA countdown ── */}
        <div className="mx-auto mt-8 max-w-lg">
          <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-300">
            <Clock className="h-4 w-4 text-primary" />
            {content.etaNote}
          </p>
          <div className="flex items-start justify-center gap-2.5 sm:gap-4" dir="rtl">
            <CdUnit value={days} label="روز" ready={remaining !== null} />
            <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
            <CdUnit value={hours} label="ساعت" ready={remaining !== null} />
            <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
            <CdUnit value={minutes} label="دقیقه" ready={remaining !== null} />
            <span aria-hidden className="pt-6 font-mono text-3xl font-black text-zinc-700 sm:pt-7 sm:text-4xl">:</span>
            <CdUnit value={seconds} label="ثانیه" ready={remaining !== null} />
          </div>

          {/* elapsed → eta progress bar */}
          <div className="mt-7">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary to-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,.5)] transition-[width] duration-700"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-zinc-500">
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

        <div className="mx-auto mt-7 grid max-w-sm gap-2.5 sm:grid-cols-2">
          {data.phone && (
            <a
              href={`tel:${data.phone}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold transition hover:border-primary/50"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span dir="ltr" className="tabular-nums">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold transition hover:border-primary/50"
            >
              <Mail className="h-4 w-4 text-primary" />
              <span dir="ltr">{data.email}</span>
            </a>
          )}
        </div>

        {data.workingHours && (
          <p className="mx-auto mt-2.5 flex max-w-sm items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
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

"use client";

/**
 * v32 (task 13-d) · REPAIR (maintenance) PAGE TEMPLATES + GATE — «حالت تعمیر ۲.۰»
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
 * v32 (13-d) — maintenance-mode 2.0:
 *   • ONE-SCREEN COMPACT: every template root is h-dvh + overflow-hidden +
 *     flex-centered — the page NEVER scrolls on desktop fullscreen (≥1280×800),
 *     laptop (1366×768), tablet or mobile (≥360px). Typography uses clamp(),
 *     contact rows wrap gracefully, the tracking block is a compact bar, and
 *     each template's scoped CSS ships two short-viewport tiers
 *     (.Xx-hide-780 / .Xx-hide-660) that retire secondary bits instead of
 *     ever letting the page grow taller than the screen.
 *   • LOGO CHAIN: content.logoUrl (admin upload, «لوگوی صفحهٔ تعمیر») →
 *     the store's own brand logo → the wrench mark as the last fallback.
 *   • COUNTDOWN CONFIG: content.countdownDays / countdownHours (admin-set)
 *     extend the refresh-proof next-18:00 anchor — "18:00 + N days M hours" —
 *     and the progress window stretches to the whole configured duration.
 *     Unset → the exact v31 behavior.
 * The data contract is ADDITIVE-only (new optional content keys), the gate,
 * the OpenShell and /maintenance-preview keep working untouched.
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
    /** v32 (13-d): repair-page logo override ("" = store logo → wrench mark) */
    logoUrl: string;
    /** v32 (13-d): countdown target — days/hours on top of the next-18:00 anchor */
    countdownDays: string;
    countdownHours: string;
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

/**
 * v32 (13-d): the LOGO CHAIN — the admin-uploaded repair-page logo
 * (maintenanceContent.logoUrl) → the store's own brand logo → the wrench
 * mark as the very last fallback.
 */
function LogoMark({
  data,
  box,
  img,
  icon = "h-6 w-6",
}: {
  data: MaintenanceScreenData;
  box: string;
  img: string;
  icon?: string;
}) {
  const src = data.content.logoUrl?.trim() || data.logo?.trim() || null;
  return (
    <div className={box}>
      {src ? <img src={src} alt={`${data.storeName} logo`} className={img} /> : <Wrench className={icon} />}
    </div>
  );
}

/** v32 (13-d): the tracking block as a COMPACT horizontal bar — icon + title
 * + clamped description + button in one wrap-friendly row (was a tall card). */
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
          ? "relative flex flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 backdrop-blur-md"
          : "relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#e6dcc6] bg-white/80 px-3.5 py-3 shadow-[0_12px_36px_-20px_rgba(0,0,0,.28)]"
      }
    >
      {/* dark tone: a thin gold hairline on the top edge, like a lit rim */}
      {dark && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      )}
      <span
        className={
          dark
            ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 sm:h-10 sm:w-10"
            : "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 sm:h-10 sm:w-10"
        }
      >
        <PackageSearch className="h-4.5 w-4.5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={dark ? "text-xs font-black text-white/90" : "text-xs font-black text-[#2b2118]"}>{content.trackingTitle}</p>
        <p
          className={
            dark
              ? "mt-0.5 line-clamp-1 text-[10.5px] leading-4 text-zinc-400 sm:line-clamp-2"
              : "mt-0.5 line-clamp-1 text-[10.5px] leading-4 text-stone-500 sm:line-clamp-2"
          }
        >
          {content.trackingDesc}
        </p>
      </div>
      <Link
        href="/track-order"
        className={
          dark
            ? "inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-black text-primary-foreground shadow-[0_0_22px_-8px_rgba(245,158,11,.7)] transition hover:brightness-110 sm:h-10 sm:w-auto sm:flex-none"
            : "inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-black text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-105 sm:h-10 sm:w-auto sm:flex-none"
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
/* v32 (13-d): one-screen tiers — retire secondary bits on short viewports
 * (laptop 768 / small phones) so the page NEVER has to scroll. */
@media (max-height: 780px) { .mtx-hide-780 { display: none !important; } }
@media (max-height: 660px) { .mtx-hide-660 { display: none !important; } }
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
    <div
      className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#05070a] p-3 text-zinc-100 sm:p-4"
      dir="rtl"
    >
      <style dangerouslySetInnerHTML={{ __html: TECH_CSS }} />
      {/* slowly-panning engineering grid + neon ambience */}
      <div aria-hidden className="mtx-grid pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(52,211,153,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-36 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      {/* corner radar sweep (decorative HUD accent) */}
      <div aria-hidden className="mtx-hide-780 pointer-events-none absolute -left-40 top-1/2 hidden h-[24rem] w-[24rem] -translate-y-1/2 opacity-40 lg:block">
        <span className="absolute inset-0 rounded-full border border-emerald-500/20" />
        <span className="absolute inset-[16%] rounded-full border border-emerald-500/15" />
        <span className="absolute inset-[32%] rounded-full border border-emerald-500/10" />
        <span className="mtx-radar absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(52,211,153,.25),transparent_80deg,transparent_360deg)]" />
      </div>
      {/* sweeping scan line */}
      <div aria-hidden className="mtx-scan pointer-events-none absolute inset-x-0" />

      <main className="relative z-10 w-full max-w-lg">
        {/* HUD panel with corner brackets */}
        <div className="relative rounded-[24px] border border-emerald-500/20 bg-[#070b0e]/85 p-4 shadow-[0_0_60px_-24px_rgba(16,185,129,.5)] backdrop-blur-md sm:p-5">
          <span aria-hidden className="absolute -top-px -right-px h-5 w-5 rounded-tr-[24px] border-t-2 border-r-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -top-px -left-px h-5 w-5 rounded-tl-[24px] border-t-2 border-l-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -bottom-px -right-px h-5 w-5 rounded-br-[24px] border-b-2 border-r-2 border-emerald-400/70" />
          <span aria-hidden className="absolute -bottom-px -left-px h-5 w-5 rounded-bl-[24px] border-b-2 border-l-2 border-emerald-400/70" />

          {/* system status bar + LEDs */}
          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5" dir="ltr">
            <span className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-emerald-500/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,.6)]" />
              MAINT.SYS v32
            </span>
            <span className="flex items-center gap-3 font-mono text-[8px] tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,.6)]" />
                POWER
              </span>
              <span className="mtx-led flex items-center gap-1.5" style={{ animationDuration: "1.2s" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,.55)]" />
                NETWORK
              </span>
              <span className="mtx-led flex items-center gap-1.5" style={{ animationDuration: "2.4s" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,.5)]" />
                SERVICE
              </span>
            </span>
          </div>

          <div className="mt-4 text-center">
            <LogoMark
              data={data}
              box="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_35px_-8px_rgba(16,185,129,.7)] sm:h-12 sm:w-12"
              img="h-7 w-7 rounded-xl object-contain sm:h-8 sm:w-8"
              icon="h-5 w-5 sm:h-6 sm:w-6"
            />

            <p className="mb-2 font-mono text-[9px] tracking-[0.25em] text-cyan-400/90" dir="ltr">
              [ {content.badge} ]
            </p>

            <h1
              className="mtx-glitch text-[clamp(1.15rem,0.9rem+2vw,1.9rem)] font-black leading-snug"
              data-text={`${data.storeName} ${content.titleSuffix}`}
            >
              {data.storeName}{" "}
              <span className="bg-gradient-to-l from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {content.titleSuffix}
              </span>
            </h1>

            <p className="mx-auto mt-2 line-clamp-2 max-w-md text-[11.5px] leading-5 text-zinc-400 sm:line-clamp-3">
              {content.description}
            </p>
          </div>

          {/* diagnostics terminal window */}
          <div
            className="mt-3.5 overflow-hidden rounded-xl border border-emerald-500/15 bg-black/50 font-mono text-[10px] leading-[18px] backdrop-blur-sm sm:leading-[19px]"
            dir="ltr"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              </span>
              <span className="text-[8px] tracking-widest text-zinc-500">~/maintenance — diagnostics.log</span>
            </div>
            <div className="px-3 py-2 sm:py-2.5">
              {diagnostics.map((d) => (
                <p key={d.label} className="flex items-center whitespace-nowrap text-zinc-400">
                  <span className="text-emerald-500/80">&gt;</span>
                  <span className="ms-2">{d.label}</span>
                  <span className="mx-3 flex-1 overflow-hidden border-b border-dotted border-zinc-700/80" />
                  <span
                    className={
                      d.ok
                        ? "rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px text-[9px] font-bold text-emerald-400"
                        : "rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold text-amber-400"
                    }
                  >
                    {d.status}
                  </span>
                </p>
              ))}
              <p className="mt-0.5 flex items-center text-emerald-400">
                <span>&gt;</span>
                <span className="ms-2">restore_service</span>
                <span className="mtx-caret ms-1 inline-block h-3.5 w-[6px] bg-emerald-400" />
              </p>

              {/* glowing progress indicators */}
              <div className="mtx-hide-780 mt-3 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-[8px] tracking-wider text-zinc-500">
                    <span>SYSTEM_RESTORE</span>
                    <span className="text-emerald-400">68%</span>
                  </div>
                  <div className="mtx-bar h-1.5 rounded-full bg-emerald-500/10">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,.6)]" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[8px] tracking-wider text-zinc-500">
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

          {/* contacts as glass chips */}
          <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
            {data.phone && (
              <a
                href={`tel:${data.phone}`}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-start backdrop-blur-md transition hover:border-emerald-400/50 hover:bg-emerald-500/[0.07] sm:p-2.5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 sm:h-9 sm:w-9">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold tracking-wide text-zinc-500">{content.phoneLabel}</span>
                  <span dir="ltr" className="block truncate font-mono text-xs font-bold tabular-nums text-emerald-100">
                    {data.phone}
                  </span>
                </span>
              </a>
            )}
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-start backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-cyan-500/[0.07] sm:p-2.5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 sm:h-9 sm:w-9">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold tracking-wide text-zinc-500">{content.emailLabel}</span>
                  <span dir="ltr" className="block truncate font-mono text-xs font-bold text-cyan-100">
                    {data.email}
                  </span>
                </span>
              </a>
            )}
          </div>

          {data.workingHours && (
            <p className="mtx-hide-780 mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/25 bg-black/30 p-2.5 text-[11px] leading-5 text-zinc-400">
              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              {content.hoursLabel}: <span className="font-bold text-emerald-200/90">{data.workingHours}</span>
            </p>
          )}

          <div className="mt-3.5">
            <TrackingBlock content={content} tone="dark" />
          </div>

          <p className="mtx-hide-660 mt-3 text-center text-[10px] tracking-wide text-zinc-600">{content.footerNote}</p>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════ Template 2 · minimal-light — premium warm editorial ══════════════════ */

const MINIMAL_CSS = `
@keyframes mlx-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mlx-glow { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
.mlx-up { animation: mlx-up .7s cubic-bezier(.22, .68, .36, 1) both; }
.mlx-glow { animation: mlx-glow 2.6s ease-in-out infinite; }
/* v32 (13-d): one-screen tiers (see tech-dark) */
@media (max-height: 780px) { .mlx-hide-780 { display: none !important; } }
@media (max-height: 660px) { .mlx-hide-660 { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .mlx-up, .mlx-glow { animation: none !important; } }
`;

/**
 * v32 (13-d) redesign — «مینیمال روشن» is now a PREMIUM EDITORIAL page:
 * warm off-white paper (#f8f5ee), a thin double hairline frame with gold
 * corner ticks, big display typography with a light gold suffix, a hairline
 * gold rule with diamond, and an asymmetric two-column layout on desktop
 * (headline block · contact "ledger" + tracking bar) that stacks on mobile.
 */
function MinimalLightRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div
      className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#f8f5ee] px-5 py-6 text-[#2b2118] sm:px-8"
      dir="rtl"
    >
      <style dangerouslySetInnerHTML={{ __html: MINIMAL_CSS }} />
      {/* warm ambient washes — gold from the top-right, umber bottom-left */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_85%_0%,rgba(217,119,6,.10),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_0%_100%,rgba(120,53,15,.06),transparent_70%)]" />
      {/* thin editorial hairline frame */}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[1.6rem] border border-[#e3dac4] sm:inset-5" />
      {/* four gold corner ticks — refined asymmetric accents */}
      <span aria-hidden className="pointer-events-none absolute right-6 top-6 h-3.5 w-3.5 border-t border-r border-amber-600/60 sm:right-8 sm:top-8" />
      <span aria-hidden className="pointer-events-none absolute left-6 top-6 h-3.5 w-3.5 border-t border-l border-amber-600/60 sm:left-8 sm:top-8" />
      <span aria-hidden className="pointer-events-none absolute bottom-6 right-6 h-3.5 w-3.5 border-b border-r border-amber-600/60 sm:bottom-8 sm:right-8" />
      <span aria-hidden className="pointer-events-none absolute bottom-6 left-6 h-3.5 w-3.5 border-b border-l border-amber-600/60 sm:bottom-8 sm:left-8" />

      <main className="relative z-10 grid w-full max-w-3xl items-center gap-7 lg:grid-cols-[1.15fr,1fr] lg:gap-10">
        {/* ── right column (RTL start) · display headline block ── */}
        <div className="mlx-up text-center lg:text-start">
          <LogoMark
            data={data}
            box="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#e3dac4] bg-white text-stone-400 shadow-[0_10px_30px_-14px_rgba(0,0,0,.25)] lg:mx-0"
            img="h-8 w-8 rounded-full object-contain"
            icon="h-5 w-5"
          />

          <p className="mb-3.5 inline-flex items-center gap-2.5 text-[9.5px] font-bold tracking-[0.28em] text-amber-700/90">
            <span aria-hidden className="h-px w-7 bg-amber-600/50" />
            {content.badge}
            <span aria-hidden className="h-px w-7 bg-amber-600/50" />
          </p>

          <h1 className="text-[clamp(1.8rem,1.2rem+3vw,3.3rem)] font-black leading-[1.18] tracking-tight text-[#2b2118]">
            {data.storeName}
          </h1>
          <p className="mt-1.5 text-[clamp(1rem,0.9rem+1vw,1.5rem)] font-light text-amber-800/80">{content.titleSuffix}</p>

          {/* the single thin gold accent rule with a center diamond */}
          <div aria-hidden className="mx-auto mt-4.5 flex items-center justify-center gap-3 lg:mx-0">
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/70" />
            <span className="mlx-glow h-1.5 w-1.5 rotate-45 bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,.55)]" />
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/70" />
          </div>

          <p className="mx-auto mt-4 line-clamp-3 max-w-md text-[12.5px] leading-6.5 text-stone-500 sm:leading-7 lg:mx-0">
            {content.description}
          </p>

          <p className="mlx-hide-660 mt-5 text-[9.5px] font-medium tracking-[0.18em] text-stone-400/90 lg:text-start">
            {content.footerNote}
          </p>
        </div>

        {/* ── left column · contact ledger + tracking bar ── */}
        <div className="mlx-up" style={{ animationDelay: "120ms" }}>
          <div className="rounded-2xl border border-[#e3dac4] bg-white/70 px-4 backdrop-blur-sm sm:px-5">
            {data.phone && (
              <a
                href={`tel:${data.phone}`}
                className="group flex items-center justify-between gap-3 border-b border-[#ece2cd] py-3 transition"
              >
                <span className="flex shrink-0 items-center gap-2 text-[10.5px] font-bold tracking-[0.08em] text-amber-800/90">
                  <Phone className="h-3.5 w-3.5 text-amber-600/80" />
                  {content.phoneLabel}
                </span>
                <span dir="ltr" className="min-w-0 truncate text-[13px] font-bold tabular-nums text-[#2b2118] transition group-hover:text-amber-800">
                  {data.phone}
                </span>
              </a>
            )}
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="group flex items-center justify-between gap-3 border-b border-[#ece2cd] py-3 transition"
              >
                <span className="flex shrink-0 items-center gap-2 text-[10.5px] font-bold tracking-[0.08em] text-amber-800/90">
                  <Mail className="h-3.5 w-3.5 text-amber-600/80" />
                  {content.emailLabel}
                </span>
                <span dir="ltr" className="min-w-0 truncate text-[13px] font-bold text-[#2b2118] transition group-hover:text-amber-800">
                  {data.email}
                </span>
              </a>
            )}
            {data.workingHours && (
              <p className="flex items-center justify-between gap-3 py-3">
                <span className="flex shrink-0 items-center gap-2 text-[10.5px] font-bold tracking-[0.08em] text-amber-800/90">
                  <Clock className="h-3.5 w-3.5 text-amber-600/80" />
                  {content.hoursLabel}
                </span>
                <span className="min-w-0 truncate text-[13px] font-bold text-[#2b2118]">{data.workingHours}</span>
              </p>
            )}
          </div>

          <div className="mt-4">
            <TrackingBlock content={content} tone="light" />
          </div>
        </div>
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
@keyframes ngx-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes ngx-twinkle { 0%, 100% { opacity: .15; transform: scale(.8); } 50% { opacity: .9; transform: scale(1.15); } }
.ngx-blob { position: absolute; border-radius: 9999px; filter: blur(70px); opacity: .55; will-change: transform; }
.ngx-blob-1 { width: 24rem; height: 24rem; background: #d946ef; top: -9rem; right: -7rem; animation: ngx-orb1 14s ease-in-out infinite, ngx-hue 18s ease-in-out infinite; }
.ngx-blob-2 { width: 20rem; height: 20rem; background: #22d3ee; opacity: .4; bottom: -8rem; left: -6rem; animation: ngx-orb2 17s ease-in-out infinite, ngx-hue 22s ease-in-out infinite reverse; }
.ngx-blob-3 { width: 14rem; height: 14rem; background: #fb7185; opacity: .35; top: 28%; left: 14%; animation: ngx-orb3 12s ease-in-out infinite; }
.ngx-glass { background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .12); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.ngx-ring { position: absolute; left: 50%; top: 50%; width: 220%; aspect-ratio: 1; transform: translate(-50%, -50%); background: conic-gradient(from 0deg, transparent 0deg, #d946ef 55deg, #22d3ee 110deg, transparent 165deg, transparent 360deg); animation: ngx-ring 7s linear infinite; }
.ngx-bob { animation: ngx-bob 5.5s ease-in-out infinite; }
.ngx-star { position: absolute; border-radius: 9999px; background: white; animation: ngx-twinkle 3.4s ease-in-out infinite; }
/* v32 (13-d): one-screen tiers (see tech-dark) */
@media (max-height: 780px) { .ngx-hide-780 { display: none !important; } }
@media (max-height: 660px) { .ngx-hide-660 { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .ngx-blob-1, .ngx-blob-2, .ngx-blob-3, .ngx-ring, .ngx-bob, .ngx-star { animation: none !important; } }
`;

function NeonGlassRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#0a0714] p-3 text-white sm:p-4" dir="rtl">
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

      <main className="relative z-10 w-full max-w-md">
        {/* glass card wrapped in an animated conic-gradient ring border */}
        <div className="relative overflow-hidden rounded-[28px] p-[1.5px] shadow-[0_0_80px_-24px_rgba(217,70,239,.45)]">
          <span aria-hidden className="ngx-ring" />
          <div className="relative rounded-[27px] border border-white/10 bg-[#0d0920]/80 p-5 backdrop-blur-2xl sm:p-6">
            <div className="text-center">
              {/* floating logo chip */}
              <LogoMark
                data={data}
                box="ngx-bob mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-fuchsia-400/30 bg-white/[0.07] text-fuchsia-300 shadow-[0_0_32px_-6px_rgba(217,70,239,.6)] backdrop-blur-xl"
                img="h-9 w-9 rounded-xl object-contain"
                icon="h-6 w-6"
              />

              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 px-3 py-1 text-[9.5px] font-black tracking-wide text-fuchsia-300 shadow-[0_0_20px_-4px_rgba(217,70,239,.6)]">
                <Sparkles className="h-3 w-3" />
                {content.badge}
              </span>

              <h1 className="mt-3 text-[clamp(1.35rem,1rem+2.2vw,2.1rem)] font-black leading-tight [filter:drop-shadow(0_0_16px_rgba(232,121,249,.4))]">
                {data.storeName}{" "}
                <span className="bg-gradient-to-l from-fuchsia-400 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                  {content.titleSuffix}
                </span>
              </h1>
              <p className="mx-auto mt-2 line-clamp-2 max-w-md text-[12px] leading-6 text-white/60 sm:line-clamp-3">
                {content.description}
              </p>

              {/* contact chips as glass pills */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="ngx-glass flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-300">
                      <Phone className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold text-white/50">{content.phoneLabel}</span>
                      <span dir="ltr" className="block truncate text-xs font-bold tabular-nums text-white/90">{data.phone}</span>
                    </span>
                  </a>
                )}
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="ngx-glass flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition hover:border-cyan-400/50 hover:bg-cyan-500/10"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold text-white/50">{content.emailLabel}</span>
                      <span dir="ltr" className="block truncate text-xs font-bold text-white/90">{data.email}</span>
                    </span>
                  </a>
                )}
              </div>

              {data.workingHours && (
                <p className="ngx-hide-780 ngx-glass mt-2 flex items-center justify-center gap-2 rounded-xl p-2.5 text-[10.5px] font-bold text-white/70">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  {content.hoursLabel}: <span className="text-white">{data.workingHours}</span>
                </p>
              )}

              <div className="mt-4">
                <TrackingBlock content={content} tone="dark" />
              </div>
            </div>
          </div>
        </div>

        <p className="ngx-hide-660 mt-4 text-center text-[10px] text-white/40">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 4 · countdown-eta — configurable ETA hero ══════════════════ */

const CD_CSS = `
@keyframes cdx-flip { 0% { transform: translateY(-58%); opacity: 0; filter: blur(6px); } 100% { transform: translateY(0); opacity: 1; filter: blur(0); } }
@keyframes cdx-shine { 0% { transform: translateX(160%); } 100% { transform: translateX(-160%); } }
@keyframes cdx-step { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0); } 50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, .16); } }
@keyframes cdx-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes cdx-dot { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.cdx-flip { animation: cdx-flip .45s cubic-bezier(.21, 1.02, .55, 1) both; }
.cdx-box { position: relative; overflow: hidden; }
.cdx-box::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .12) 50%, transparent 65%); animation: cdx-shine 3.4s ease-in-out infinite; }
.cdx-step-live { animation: cdx-step 1.7s ease-in-out infinite; }
.cdx-seconds { animation: cdx-pulse 1s ease-in-out infinite; }
.cdx-dot { animation: cdx-dot 1.4s ease-in-out infinite; }
/* v32 (13-d): one-screen tiers (see tech-dark) */
@media (max-height: 780px) { .cdx-hide-780 { display: none !important; } }
@media (max-height: 660px) { .cdx-hide-660 { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .cdx-flip, .cdx-box::after, .cdx-step-live, .cdx-seconds, .cdx-dot { animation: none !important; } }
`;

/** next 18:00 local — the stable, refresh-proof ETA ANCHOR (rolls to
 * tomorrow after 18:00). v32 (13-d): the admin's countdownDays/countdownHours
 * are ADDED on top of this anchor, so the target stays deterministic and
 * refresh-proof even when a custom duration is configured. */
function nextEta(now: number): number {
  const t = new Date(now);
  t.setHours(18, 0, 0, 0);
  if (t.getTime() <= now) t.setDate(t.getDate() + 1);
  return t.getTime();
}

/** v32 (13-d): the admin-configured countdown offset in ms (0 = unset →
 * the designed "next 18:00" countdown). Values arrive as strings from the
 * maintenanceContent JSON column; they are clamped defensively. */
function configuredCountdownMs(days: string, hours: string): number {
  const d = Math.max(0, Math.min(365, Math.floor(Number(days) || 0)));
  const h = Math.max(0, Math.min(23, Math.floor(Number(hours) || 0)));
  return d * 86_400_000 + h * 3_600_000;
}

function CdUnit({ value, label, ready, hero = false }: { value: number; label: string; ready: boolean; hero?: boolean }) {
  const text = ready ? String(Math.max(0, value)).padStart(2, "0") : "--";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={
          hero
            ? "cdx-box cdx-seconds grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/[0.07] shadow-[0_0_26px_-8px_rgba(245,158,11,.55)] sm:h-[4.5rem] sm:w-[4.5rem]"
            : "cdx-box grid h-[3.25rem] w-[3.25rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] sm:h-16 sm:w-16"
        }
        dir="ltr"
      >
        <span
          className={
            hero
              ? "cdx-flip font-mono text-[1.55rem] font-black tabular-nums text-primary [text-shadow:0_0_20px_rgba(245,158,11,.55)] sm:text-3xl"
              : "cdx-flip font-mono text-xl font-black tabular-nums text-primary [text-shadow:0_0_18px_rgba(245,158,11,.45)] sm:text-[1.65rem]"
          }
        >
          {text}
        </span>
      </div>
      <span className={hero ? "text-[9px] font-black text-primary/90" : "text-[9px] font-bold text-zinc-400"}>{label}</span>
    </div>
  );
}

function CountdownEtaRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  const steps = ["تشخیص عیب", "آماده‌سازی قطعات", "تعمیر", "تست نهایی"];

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* v32 (13-d): admin-set target — next-18:00 anchor + configured offset */
  const extraMs = useMemo(
    () => configuredCountdownMs(content.countdownDays, content.countdownHours),
    [content.countdownDays, content.countdownHours]
  );
  const eta = useMemo(() => (now === null ? nextEta(Date.now()) : nextEta(now)) + extraMs, [now, extraMs]);
  const remaining = now === null ? null : Math.max(0, eta - now);
  const days = remaining === null ? 0 : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  /** the progress window = the whole configured countdown (min 8h — the v31
   * default window), so the bar + repair stages span the full ETA */
  const WINDOW = Math.max(8 * 3_600_000, extraMs);
  const progress = remaining === null ? 0 : Math.min(1, Math.max(0, 1 - remaining / WINDOW));
  const currentStep = Math.min(3, Math.floor(progress * 4));
  const etaTime =
    remaining !== null
      ? new Intl.DateTimeFormat(
          "fa-IR",
          extraMs >= 86_400_000 ? { weekday: "long", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" }
        ).format(new Date(eta))
      : "…";

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#0a0e14] p-3 text-zinc-100 sm:p-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CD_CSS }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:26px_26px]" />
      {/* giant faint clock rings behind the hero */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.07] sm:block" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[17rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.09] sm:block" />
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-lg text-center">
        {/* repair stages */}
        <div className="mx-auto mb-4 flex items-center justify-center gap-1.5">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const live = i === currentStep;
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className={
                    done
                      ? "grid h-6 w-6 place-items-center rounded-full border border-primary/60 bg-primary text-[9px] font-black text-primary-foreground"
                      : live
                        ? "cdx-step-live grid h-6 w-6 place-items-center rounded-full border border-primary/60 bg-primary/20 text-[9px] font-black text-primary"
                        : "grid h-6 w-6 place-items-center rounded-full border border-zinc-700 text-[9px] font-bold text-zinc-500"
                  }
                  aria-label={`مرحله ${i + 1}: ${s}`}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={`hidden text-[9px] font-bold sm:inline ${done || live ? "text-zinc-300" : "text-zinc-500"}`}>{s}</span>
                {i < steps.length - 1 && (
                  <span aria-hidden className={`h-px w-2 sm:w-5 ${done ? "bg-primary/60" : "bg-zinc-800"}`} />
                )}
              </span>
            );
          })}
        </div>

        <LogoMark
          data={data}
          box="mx-auto mb-2.5 grid h-12 w-12 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_32px_-10px_rgba(245,158,11,.6)]"
          img="h-8 w-8 rounded-xl object-contain"
          icon="h-6 w-6"
        />

        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[9.5px] font-black text-primary">
          {content.badge}
        </span>

        <h1 className="mt-2.5 text-[clamp(1.3rem,1rem+1.8vw,1.95rem)] font-black leading-tight">
          {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
        </h1>
        <p className="cdx-hide-780 mx-auto mt-2 line-clamp-2 max-w-md text-[11.5px] leading-5 text-zinc-400">
          {content.description}
        </p>

        {/* ── the live ETA countdown (hero panel) ── */}
        <div className="mx-auto mt-3.5">
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md sm:p-5">
            <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <p className="mb-3.5 flex items-center justify-center gap-2 text-[11px] font-black text-zinc-200">
              <Timer className="cdx-dot h-4 w-4 shrink-0 text-primary" />
              {content.etaNote}
            </p>
            <div className="flex items-start justify-center gap-1.5 sm:gap-3" dir="rtl">
              <CdUnit value={days} label="روز" ready={remaining !== null} />
              <span aria-hidden className="pt-3 font-mono text-xl font-black text-zinc-700 sm:pt-4 sm:text-2xl">:</span>
              <CdUnit value={hours} label="ساعت" ready={remaining !== null} />
              <span aria-hidden className="pt-3 font-mono text-xl font-black text-zinc-700 sm:pt-4 sm:text-2xl">:</span>
              <CdUnit value={minutes} label="دقیقه" ready={remaining !== null} />
              <span aria-hidden className="pt-3 font-mono text-xl font-black text-zinc-700 sm:pt-4 sm:text-2xl">:</span>
              <CdUnit value={seconds} label="ثانیه" ready={remaining !== null} hero />
            </div>

            {/* elapsed → eta progress bar with a glowing head */}
            <div className="mt-4">
              <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary to-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,.55)] transition-[width] duration-700"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_4px_rgba(245,158,11,.7)]"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-zinc-500">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3 text-primary/70" />
                  در حال ارتقا
                </span>
                <span className="text-primary">{Math.round(progress * 100).toLocaleString("fa-IR")}٪</span>
                <span>بازگشایی: {etaTime}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-3.5 flex max-w-md flex-wrap justify-center gap-2">
          {data.phone && (
            <a
              href={`tel:${data.phone}`}
              className="inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/[0.07]"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="text-[9px] font-bold text-zinc-500">{content.phoneLabel}: </span>
                <span dir="ltr" className="tabular-nums text-zinc-100">{data.phone}</span>
              </span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/[0.07]"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="text-[9px] font-bold text-zinc-500">{content.emailLabel}: </span>
                <span dir="ltr" className="text-zinc-100">{data.email}</span>
              </span>
            </a>
          )}
        </div>

        {data.workingHours && (
          <p className="cdx-hide-780 mx-auto mt-2 inline-flex max-w-full items-center gap-1.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-[10px] text-zinc-400">
            <Clock className="h-3 w-3 shrink-0 text-primary/70" />
            {content.hoursLabel}: <span className="font-bold text-zinc-200">{data.workingHours}</span>
          </p>
        )}

        <div className="mx-auto mt-3.5 max-w-md">
          <TrackingBlock content={content} tone="dark" />
        </div>

        <p className="cdx-hide-780 mt-3 text-[9.5px] text-zinc-600">{content.footerNote}</p>
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

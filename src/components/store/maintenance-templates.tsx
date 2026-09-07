"use client";

/**
 * v29 · REPAIR (maintenance) PAGE TEMPLATES + GATE
 * -----------------------------------------------------------------------
 * The (store) layout closes the shop for regular visitors while Settings →
 * فروشگاه → «حالت تعمیر» is ON. This file owns the PRESENTATION of that
 * closed state:
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
 * Presentation-layer only — switching templates never touches store data.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wrench, Phone, Mail, Clock, PackageSearch, ArrowLeft } from "lucide-react";
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

function TrackingBlock({
  content,
  tone,
}: {
  content: MaintenanceScreenData["content"];
  tone: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <div className={dark ? "border-t border-white/10 pt-6" : "border-t pt-6"}>
      <p className={dark ? "mb-1.5 text-[11px] text-zinc-500" : "mb-1.5 text-[11px] text-muted-foreground"}>
        {content.trackingTitle}
      </p>
      <p className={dark ? "mb-3.5 text-xs leading-6 text-zinc-400" : "mb-3.5 text-xs leading-6 text-muted-foreground"}>
        {content.trackingDesc}
      </p>
      <Link
        href="/track-order"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 hover:shadow-primary/40"
      >
        <PackageSearch className="h-4 w-4" />
        {content.trackingButton}
        <ArrowLeft className="h-3.5 w-3.5 opacity-70" />
      </Link>
    </div>
  );
}

/* ══════════════════ Template 1 · tech-dark (the v25–v28 look, preserved) ══════════════════ */

function TechDarkRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a10] text-zinc-100 flex items-center justify-center p-4" dir="rtl">
      {/* ambient grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-[-8rem] h-96 w-96 rounded-full bg-primary/15 blur-3xl" />

      <main className="relative z-10 w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-primary/40 bg-primary/10 shadow-[0_0_45px_-8px] shadow-primary/60">
          {data.logo ? (
            <img src={data.logo} alt={`${data.storeName} logo`} className="h-12 w-12 rounded-2xl object-contain" />
          ) : (
            <Wrench className="h-9 w-9 text-primary" />
          )}
        </div>

        <h1 className="text-3xl font-black leading-tight sm:text-4xl">
          {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">{content.description}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {data.phone && (
            <a
              href={`tel:${data.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs font-bold transition hover:border-primary/50 hover:bg-zinc-900"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span dir="ltr">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs font-bold transition hover:border-primary/50 hover:bg-zinc-900"
            >
              <Mail className="h-4 w-4 text-primary" />
              <span dir="ltr">{data.email}</span>
            </a>
          )}
        </div>

        {data.workingHours && (
          <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-3 text-[11px] leading-5 text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            {content.hoursLabel}: <span className="font-bold text-zinc-200">{data.workingHours}</span>
          </p>
        )}

        <div className="mt-8">
          <TrackingBlock content={content} tone="dark" />
        </div>

        <p className="mt-6 text-[10px] text-zinc-600">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 2 · minimal-light ══════════════════ */

function MinimalLightRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir="rtl">
      {/* soft paper texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />

      <main className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border bg-card p-8 text-center shadow-xl shadow-black/5">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
            {data.logo ? (
              <img src={data.logo} alt={`${data.storeName} logo`} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <Wrench className="h-7 w-7 text-primary" />
            )}
          </div>

          <span className="inline-block rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[10px] font-bold text-primary">
            {content.badge}
          </span>

          <h1 className="mt-4 text-2xl font-black leading-tight">
            {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
          </h1>
          <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{content.description}</p>

          <div className="mt-6 space-y-2.5 rounded-2xl bg-muted/50 p-4 text-right">
            {data.phone && (
              <a href={`tel:${data.phone}`} className="flex items-center gap-2.5 text-xs font-bold transition hover:text-primary">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="text-muted-foreground">{content.phoneLabel}:</span>
                <span dir="ltr">{data.phone}</span>
              </a>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="flex items-center gap-2.5 text-xs font-bold transition hover:text-primary">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="text-muted-foreground">{content.emailLabel}:</span>
                <span dir="ltr">{data.email}</span>
              </a>
            )}
            {data.workingHours && (
              <p className="flex items-center gap-2.5 text-xs font-bold">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="text-muted-foreground">{content.hoursLabel}:</span>
                {data.workingHours}
              </p>
            )}
          </div>

          <div className="mt-6">
            <TrackingBlock content={content} tone="light" />
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 3 · neon-glass ══════════════════ */

const NEON_CSS = `
@keyframes ng-float { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.15); } }
@keyframes ng-float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,30px) scale(1.1); } }
@keyframes ng-spin { to { transform: rotate(360deg); } }
.ng-blob { position:absolute; border-radius:9999px; filter:blur(70px); opacity:.5; will-change:transform; }
.ng-blob-1 { width:26rem; height:26rem; background:hsl(var(--primary)/.5); top:-8rem; right:-6rem; animation:ng-float 12s ease-in-out infinite; }
.ng-blob-2 { width:22rem; height:22rem; background:#7C3AED; opacity:.35; bottom:-7rem; left:-5rem; animation:ng-float2 14s ease-in-out infinite; }
.ng-blob-3 { width:16rem; height:16rem; background:#0EA5E9; opacity:.3; top:30%; left:20%; animation:ng-float 16s ease-in-out infinite reverse; }
.ng-glass { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); }
.ng-ring { animation:ng-spin 9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .ng-blob,.ng-blob-2,.ng-blob-3,.ng-ring { animation:none !important; } }
`;

function NeonGlassRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070d] text-white flex items-center justify-center p-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: NEON_CSS }} />
      {/* floating gradient blobs */}
      <div aria-hidden className="ng-blob ng-blob-1 pointer-events-none" />
      <div aria-hidden className="ng-blob ng-blob-2 pointer-events-none" />
      <div aria-hidden className="ng-blob ng-blob-3 pointer-events-none" />

      <main className="relative z-10 w-full max-w-lg">
        <div className="ng-glass rounded-[28px] p-8 text-center shadow-2xl shadow-black/40">
          {/* rotating dashed ring + logo */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            <span aria-hidden className="ng-ring absolute inset-0 rounded-full border-2 border-dashed border-white/20" />
            <span className="absolute inset-2 grid place-items-center rounded-full ng-glass">
              {data.logo ? (
                <img src={data.logo} alt={`${data.storeName} logo`} className="h-12 w-12 rounded-full object-contain" />
              ) : (
                <Wrench className="h-8 w-8 text-primary" />
              )}
            </span>
          </div>

          <span className="inline-block rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 text-[10px] font-black tracking-wide text-primary">
            {content.badge}
          </span>

          <h1 className="mt-4 text-3xl font-black leading-tight">
            {data.storeName} <span className="bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">{content.titleSuffix}</span>
          </h1>
          <p className="mt-3.5 text-sm leading-7 text-white/60">{content.description}</p>

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {data.phone && (
              <a href={`tel:${data.phone}`} className="ng-glass flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:border-primary/50">
                <Phone className="h-4 w-4 text-primary" />
                <span dir="ltr">{data.phone}</span>
              </a>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="ng-glass flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:border-primary/50">
                <Mail className="h-4 w-4 text-primary" />
                <span dir="ltr">{data.email}</span>
              </a>
            )}
          </div>

          {data.workingHours && (
            <p className="ng-glass mt-2.5 flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-[11px] font-bold text-white/70">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {content.hoursLabel}: <span className="text-white">{data.workingHours}</span>
            </p>
          )}

          <div className="mt-7">
            <TrackingBlock content={content} tone="dark" />
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/35">{content.footerNote}</p>
      </main>
    </div>
  );
}

/* ══════════════════ Template 4 · countdown-eta ══════════════════ */

const ETA_CSS = `
@keyframes eta-slide { 0% { left:-35%; } 100% { left:100%; } }
@keyframes eta-pulse-dot { 0%,100% { opacity:.25; } 50% { opacity:1; } }
.eta-bar { position:relative; height:8px; border-radius:9999px; background:rgba(255,255,255,.08); overflow:hidden; }
.eta-bar::after { content:""; position:absolute; top:0; bottom:0; width:35%; border-radius:9999px; background:linear-gradient(90deg,transparent,hsl(var(--primary)),transparent); animation:eta-slide 2.2s ease-in-out infinite; }
.eta-dot { animation:eta-pulse-dot 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .eta-bar::after,.eta-dot { animation:none !important; } }
`;

function CountdownEtaRepair({ data }: { data: MaintenanceScreenData }) {
  const { content } = data;
  const steps = ["بررسی", "ارتقا", "تست", "بازگشت"];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f16] text-zinc-100 flex items-center justify-center p-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: ETA_CSS }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <main className="relative z-10 w-full max-w-xl text-center">
        <div className="mx-auto mb-5 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`eta-dot grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black ${i < 3 ? "border-primary/50 bg-primary/15 text-primary" : "border-zinc-700 text-zinc-500"}`} style={{ animationDelay: `${i * 0.45}s` }}>
                {i + 1}
              </span>
              <span className="text-[10px] font-bold text-zinc-500">{s}</span>
              {i < steps.length - 1 && <span className="h-px w-5 bg-zinc-800 sm:w-8" aria-hidden />}
            </span>
          ))}
        </div>

        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl border border-primary/30 bg-primary/10">
          {data.logo ? (
            <img src={data.logo} alt={`${data.storeName} logo`} className="h-12 w-12 rounded-2xl object-contain" />
          ) : (
            <Wrench className="h-9 w-9 text-primary" />
          )}
        </div>

        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-[10px] font-black text-primary">{content.badge}</span>

        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
          {data.storeName} <span className="text-primary">{content.titleSuffix}</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-md text-sm leading-7 text-zinc-400">{content.description}</p>

        {/* the promise bar */}
        <div className="mx-auto mt-7 max-w-sm">
          <div className="eta-bar" />
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-zinc-500">
            <span>در حال ارتقا</span>
            <span className="text-primary">{content.footerNote}</span>
          </div>
        </div>

        <div className="mx-auto mt-7 grid max-w-sm gap-2.5 sm:grid-cols-2">
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold transition hover:border-primary/50">
              <Phone className="h-4 w-4 text-primary" />
              <span dir="ltr">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a href={`mailto:${data.email}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold transition hover:border-primary/50">
              <Mail className="h-4 w-4 text-primary" />
              <span dir="ltr">{data.email}</span>
            </a>
          )}
        </div>

        {data.workingHours && (
          <p className="mx-auto mt-3 max-w-sm flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            {content.hoursLabel}: <span className="font-bold text-zinc-200">{data.workingHours}</span>
          </p>
        )}

        <div className="mx-auto mt-8 max-w-sm">
          <TrackingBlock content={content} tone="dark" />
        </div>
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

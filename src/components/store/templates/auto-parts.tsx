"use client";

/**
 * TEMPLATE · auto-parts — «انبار قطعه» (v35 · industrial garage vertical)
 * ---------------------------------------------------------------------------
 * DARK-NATIVE workshop storefront for the «قطعات خودرو» vertical:
 *  · charcoal #131511 canvas (with a light-mode skin → #F4F4F0), safety-orange
 *    #F97316 + deeper #EA580C accent, steel-gray #9CA3AF secondary — NO
 *    blue/violet/neon anywhere;
 *  · industrial grammar: hazard-stripe dividers (animated on promo banners),
 *    chamfered steel-plate hero panel (clip-path) with pulsing corner rivets,
 *    mono part-number chips, stencil-kicker section heads with Latin codes,
 *    technical spec-table product cards and torque-gauge stock meters;
 *  · car-model COMPATIBILITY band (پراید/سمند/۲۰۶/… → /products?q=…) —
 *    the after-market's #1 question, answered before the fold;
 *  · rails: پرفروش‌ترین قطعات → تازه رسیده‌ها → «پیشنهاد مکانیک‌ها»
 *    (discount rail with orange sale badges) + brands/FAQ/CTA band;
 *  · cart via the shared useCart hook (novatrend's useTrendAdd pattern),
 *    chrome via TEMPLATE_CHROME["auto-parts"], reveal on scroll, all CSS
 *    scoped under [data-tpl="auto-parts"], prefers-reduced-motion contract,
 *    Persian digits everywhere, graceful empty fallbacks, and the store
 *    name ALWAYS from data.store.storeName (never hardcoded).
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck, Battery, BatteryCharging, Car, Check, ChevronLeft, CircleDot, Cog,
  Disc3, Droplets, Flame, Gauge, Headphones, Lightbulb, Package, PackageCheck,
  Plus, RotateCcw, Ruler, Search, ShieldCheck, Star, Truck, Waves, Wrench, Zap,
} from "lucide-react";
import type { HomeData, TemplateCategory, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ══ ALL custom CSS — one plain <style> tag, scoped under [data-tpl] ══ */
const AP_CSS = `
/* ═══ tokens — dark garage (NATIVE) ═══ */
[data-tpl="auto-parts"]{
  --ap-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --ap-bg:#131511;
  --ap-panel:rgba(255,255,255,.03);
  --ap-panel-solid:#191C16;
  --ap-panel-2:#20241B;
  --ap-line:rgba(239,242,233,.10);
  --ap-line-strong:rgba(239,242,233,.24);
  --ap-ink:#EFF2E9;
  --ap-dim:#9CA3AF;
  --ap-faint:#6F7566;
  --ap-orange:#F97316;
  --ap-orange-2:#EA580C;
  --ap-on-orange:#131511;
  --ap-shadow:0 20px 44px -18px rgba(0,0,0,.7);
  background:#131511;color:#EFF2E9;
}
/* ═══ LIGHT-mode skin — workshop paper ═══ */
html:not(.dark) [data-tpl="auto-parts"]{
  --ap-bg:#F4F4F0;
  --ap-panel:#FFFFFF;
  --ap-panel-solid:#FFFFFF;
  --ap-panel-2:#ECECE2;
  --ap-line:rgba(30,32,36,.13);
  --ap-line-strong:rgba(30,32,36,.30);
  --ap-ink:#1E2024;
  --ap-dim:#5C6470;
  --ap-faint:#8B9199;
  --ap-on-orange:#FFFFFF;
  --ap-shadow:0 18px 40px -24px rgba(30,32,36,.3);
  background:#F4F4F0;color:#1E2024;
}
[data-tpl="auto-parts"] .ap-root{
  position:relative;background:var(--ap-bg);color:var(--ap-ink);
}
/* faint blueprint grid over the whole canvas */
[data-tpl="auto-parts"] .ap-root::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:
    linear-gradient(var(--ap-line) 1px,transparent 1px),
    linear-gradient(90deg,var(--ap-line) 1px,transparent 1px);
  background-size:56px 56px,56px 56px;opacity:.35;
}
/* ═══ stencil heads ═══ */
[data-tpl="auto-parts"] .ap-kicker{
  display:inline-flex;align-items:center;gap:7px;
  font-family:var(--ap-mono);font-size:9.5px;font-weight:800;
  letter-spacing:.24em;text-transform:uppercase;color:var(--ap-orange);
}
[data-tpl="auto-parts"] .ap-title{font-weight:900;color:var(--ap-ink);letter-spacing:-.005em}
[data-tpl="auto-parts"] .ap-mono{font-family:var(--ap-mono)}
/* ═══ hazard stripes ═══ */
[data-tpl="auto-parts"] .ap-hazard{
  display:block;height:4px;width:100%;
  background:repeating-linear-gradient(45deg,var(--ap-orange) 0 8px,transparent 8px 16px);
  opacity:.6;
}
[data-tpl="auto-parts"] .ap-hazard-scroll{
  display:block;height:6px;width:100%;
  background:repeating-linear-gradient(45deg,var(--ap-orange) 0 8px,rgba(0,0,0,.28) 8px 16px);
  animation:ap-hazard-scroll 1.7s linear infinite;
}
@keyframes ap-hazard-scroll{to{background-position:22.63px 0}}
/* ═══ steel-plate hero panel (chamfered clip-path) ═══ */
[data-tpl="auto-parts"] .ap-plate{
  position:relative;
  clip-path:polygon(0 22px,22px 0,calc(100% - 22px) 0,100% 22px,100% calc(100% - 22px),calc(100% - 22px) 100%,22px 100%,0 calc(100% - 22px));
  background:linear-gradient(150deg,#282D22,#171A14 62%);
  box-shadow:var(--ap-shadow);
}
html:not(.dark) [data-tpl="auto-parts"] .ap-plate{background:linear-gradient(150deg,#FFFFFF,#E7E7DB 62%)}
[data-tpl="auto-parts"] .ap-plate-grid{
  background:
    linear-gradient(rgba(239,242,233,.07) 1px,transparent 1px),
    linear-gradient(90deg,rgba(239,242,233,.07) 1px,transparent 1px),
    radial-gradient(130% 90% at 50% -10%,rgba(249,115,22,.16),transparent 58%);
  background-size:26px 26px,26px 26px,auto,auto;
}
html:not(.dark) [data-tpl="auto-parts"] .ap-plate-grid{
  background:
    linear-gradient(rgba(30,32,36,.09) 1px,transparent 1px),
    linear-gradient(90deg,rgba(30,32,36,.09) 1px,transparent 1px),
    radial-gradient(130% 90% at 50% -10%,rgba(249,115,22,.14),transparent 58%);
  background-size:26px 26px,26px 26px,auto,auto;
}
/* corner rivets — pulse an orange ring */
[data-tpl="auto-parts"] .ap-rivet{
  position:absolute;width:11px;height:11px;border-radius:999px;
  background:radial-gradient(circle at 35% 35%,#E8ECE0,#767B6E 58%,#3A3E33);
  animation:ap-rivet-pulse 3s ease-in-out infinite;
}
html:not(.dark) [data-tpl="auto-parts"] .ap-rivet{
  background:radial-gradient(circle at 35% 35%,#FFFFFF,#9CA3AF 58%,#5C6470);
}
@keyframes ap-rivet-pulse{
  0%,100%{box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 0 0 rgba(249,115,22,0)}
  50%{box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 0 7px rgba(249,115,22,.3)}
}
/* orange highlight bar behind one hero word */
[data-tpl="auto-parts"] .ap-hl{position:relative;z-index:0;display:inline-block}
[data-tpl="auto-parts"] .ap-hl::after{
  content:"";position:absolute;inset-inline:1px;bottom:.05em;height:.32em;
  background:var(--ap-orange);opacity:.9;z-index:-1;
}
/* ═══ squared product card ═══ */
[data-tpl="auto-parts"] .ap-card{
  border:2px solid var(--ap-line);
  background:var(--ap-panel);
  border-radius:10px;
  transition:border-color .2s ease,transform .22s ease,box-shadow .22s ease;
}
[data-tpl="auto-parts"] .ap-card:hover{
  border-color:rgba(249,115,22,.55);
  transform:translateY(-3px);
  box-shadow:var(--ap-shadow);
}
/* steel-grid image bay */
[data-tpl="auto-parts"] .ap-bay{
  background:
    linear-gradient(var(--ap-line) 1px,transparent 1px),
    linear-gradient(90deg,var(--ap-line) 1px,transparent 1px),
    radial-gradient(120% 90% at 50% 0%,rgba(249,115,22,.07),transparent 60%),
    var(--ap-panel-solid);
  background-size:20px 20px,20px 20px,auto,auto;
}
/* part-number chip */
[data-tpl="auto-parts"] .ap-sku{
  display:inline-flex;align-items:center;gap:4px;flex-shrink:0;
  padding:2px 7px;border:1px solid var(--ap-line-strong);border-radius:4px;
  background:var(--ap-panel-solid);
  font-family:var(--ap-mono);font-size:8.5px;font-weight:700;
  letter-spacing:.14em;color:var(--ap-dim);
}
/* technical spec rows */
[data-tpl="auto-parts"] .ap-spec{
  display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding:4.5px 0;border-bottom:1px dashed var(--ap-line);font-size:10.5px;
}
[data-tpl="auto-parts"] .ap-spec:last-child{border-bottom-color:transparent}
[data-tpl="auto-parts"] .ap-spec-k{color:var(--ap-dim);flex-shrink:0;font-weight:600}
[data-tpl="auto-parts"] .ap-spec-v{color:var(--ap-ink);font-weight:700;text-align:end;min-width:0}
/* compatibility chip */
[data-tpl="auto-parts"] .ap-compat{
  display:inline-flex;align-items:center;gap:5px;flex-shrink:0;
  padding:3px 9px;border-radius:5px;
  background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.4);
  color:var(--ap-orange);font-size:10px;font-weight:800;white-space:nowrap;
}
/* stock gauge — torque-meter stripes */
[data-tpl="auto-parts"] .ap-gauge{
  position:relative;height:6px;border-radius:99px;overflow:hidden;
  background:rgba(156,163,175,.22);
}
[data-tpl="auto-parts"] .ap-gauge-fill{
  position:absolute;inset-block:0;inset-inline-start:0;border-radius:99px;
  background:repeating-linear-gradient(90deg,var(--ap-orange) 0 9px,var(--ap-orange-2) 9px 12px);
}
/* orange sale badge */
[data-tpl="auto-parts"] .ap-sale{
  display:inline-flex;align-items:center;gap:3px;flex-shrink:0;
  padding:3px 8px;border-radius:5px;background:var(--ap-orange);
  color:var(--ap-on-orange);font-size:10px;font-weight:900;tabular-nums;
}
/* steel chips (car models / brands) */
[data-tpl="auto-parts"] .ap-chip{
  display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
  padding:9px 15px;border:1.5px solid var(--ap-line-strong);border-radius:7px;
  background:var(--ap-panel);color:var(--ap-ink);
  font-size:12.5px;font-weight:700;
  transition:border-color .18s ease,color .18s ease,transform .18s ease,background-color .18s ease;
}
[data-tpl="auto-parts"] .ap-chip:hover{
  border-color:var(--ap-orange);color:var(--ap-orange);transform:translateY(-2px);
}
/* buttons */
[data-tpl="auto-parts"] .ap-btn-primary{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  background:var(--ap-orange);color:var(--ap-on-orange);
  border-radius:7px;font-weight:900;
  transition:background-color .18s ease,transform .18s ease,box-shadow .18s ease;
}
[data-tpl="auto-parts"] .ap-btn-primary:hover{
  background:var(--ap-orange-2);transform:translateY(-2px);
  box-shadow:0 16px 34px -14px rgba(249,115,22,.6);
}
[data-tpl="auto-parts"] .ap-btn-outline{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border:2px solid var(--ap-line-strong);color:var(--ap-dim);
  border-radius:7px;font-weight:800;
  transition:border-color .18s ease,color .18s ease,transform .18s ease;
}
[data-tpl="auto-parts"] .ap-btn-outline:hover{border-color:var(--ap-dim);color:var(--ap-ink);transform:translateY(-2px)}
/* add-to-cart morph */
[data-tpl="auto-parts"] .ap-add{
  display:flex;height:42px;width:100%;align-items:center;justify-content:center;gap:7px;
  border-radius:7px;background:var(--ap-orange);color:var(--ap-on-orange);
  font-size:12px;font-weight:900;
  transition:background-color .2s ease,transform .15s ease;
}
[data-tpl="auto-parts"] .ap-add:hover:not(:disabled){background:var(--ap-orange-2)}
[data-tpl="auto-parts"] .ap-add:active:not(:disabled){transform:scale(.98)}
[data-tpl="auto-parts"] .ap-add:disabled{opacity:.45;cursor:not-allowed}
[data-tpl="auto-parts"] .ap-add[data-added="1"]{background:var(--ap-panel-2);color:var(--ap-orange);border:2px solid var(--ap-orange)}
/* category tile — orange top edge on hover */
[data-tpl="auto-parts"] .ap-tile{
  position:relative;overflow:hidden;
  border:2px solid var(--ap-line);border-radius:10px;background:var(--ap-panel);
  transition:border-color .2s ease,transform .2s ease,background-color .2s ease;
}
[data-tpl="auto-parts"] .ap-tile::before{
  content:"";position:absolute;inset-inline:0;top:0;height:3px;
  background:var(--ap-orange);transform:scaleX(0);transform-origin:inline-start;
  transition:transform .22s ease;
}
[data-tpl="auto-parts"] .ap-tile:hover{border-color:rgba(249,115,22,.5);transform:translateY(-3px)}
[data-tpl="auto-parts"] .ap-tile:hover::before{transform:scaleX(1)}
/* promo banner — hazard frame */
[data-tpl="auto-parts"] .ap-promo{
  position:relative;border:2px solid var(--ap-line-strong);border-radius:10px;
  background:var(--ap-panel);overflow:hidden;
  transition:border-color .2s ease,transform .2s ease;
}
[data-tpl="auto-parts"] .ap-promo:hover{border-color:rgba(249,115,22,.55);transform:translateY(-3px)}
/* FAQ <details> */
[data-tpl="auto-parts"] .ap-faq{
  border:1.5px solid var(--ap-line);border-radius:9px;background:var(--ap-panel);
}
[data-tpl="auto-parts"] .ap-faq summary{
  cursor:pointer;list-style:none;
}
[data-tpl="auto-parts"] .ap-faq summary::-webkit-details-marker{display:none}
[data-tpl="auto-parts"] .ap-faq[open] .ap-faq-plus{transform:rotate(45deg)}
[data-tpl="auto-parts"] .ap-faq-plus{transition:transform .2s ease}
/* CTA band */
[data-tpl="auto-parts"] .ap-band{
  background:linear-gradient(135deg,var(--ap-orange),var(--ap-orange-2));
  color:var(--ap-on-orange);
}
[data-tpl="auto-parts"] .ap-band .ap-band-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  background:var(--ap-bg);color:var(--ap-ink);
  border-radius:7px;font-weight:900;
  transition:transform .18s ease,box-shadow .18s ease;
}
[data-tpl="auto-parts"] .ap-band .ap-band-btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}
/* horizontal rail */
[data-tpl="auto-parts"] .ap-rail{
  display:flex;gap:14px;overflow-x:auto;
  scrollbar-width:none;-ms-overflow-style:none;
  padding-bottom:4px;
}
[data-tpl="auto-parts"] .ap-rail::-webkit-scrollbar{display:none}
/* reduced-motion contract */
@media (prefers-reduced-motion:reduce){
  [data-tpl="auto-parts"] .ap-hazard-scroll,
  [data-tpl="auto-parts"] .ap-rivet{animation:none!important}
  [data-tpl="auto-parts"] .ap-card,
  [data-tpl="auto-parts"] .ap-chip,
  [data-tpl="auto-parts"] .ap-tile,
  [data-tpl="auto-parts"] .ap-promo{transition:none!important}
}
`;

/* ── car compatibility — parsed from the product NAME (TemplateProduct
 *    carries no spec rows; the DB names embed the model like every real
 *    after-market listing does) ─────────────────────────────────────── */
const CAR_MODELS: [RegExp, string][] = [
  [/پراید|pride/i, "پراید"],
  [/تیبا|tiba/i, "تیبا"],
  [/رانا|runna/i, "رانا"],
  [/سمند|ef7|دنا/i, "سمند / دنا"],
  [/۲۰۷|207/, "پژو ۲۰۷"],
  [/۲۰۶|206|tu5/i, "پژو ۲۰۶"],
  [/پارس|۴۰۵|405/, "پژو پارس / ۴۰۵"],
  [/تویوتا|کرولا|corolla/i, "تویوتا"],
  [/هیوندای|اکسنت|النترا|hyundai/i, "هیوندای"],
  [/کیا|kia/i, "کیا"],
  [/رنو|renault|لوگان|l90/i, "رنو"],
];
function compatOf(name: string): string {
  for (const [re, label] of CAR_MODELS) if (re.test(name)) return label;
  return "همهٔ خودروها";
}

/* ── deterministic pseudo part-number from the DB id (cuid) — the
 *    mono chip is presentational, stable across renders ─────────────── */
function partNo(id: string): string {
  const hex = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `AP-${hex.padStart(6, "0")}`;
}

/* ── category icon resolver (DB icon name → lucide, slug fallback) ─── */
const CAT_ICONS: Record<string, React.ElementType> = {
  Disc3, Droplets, BatteryCharging, Waves, Car, Lightbulb, CircleDot, Cog,
  Package, Gauge, Zap, Battery,
  "brake-pads": Disc3,
  "filters-oil": Droplets,
  "electrical-battery": BatteryCharging,
  suspension: Waves,
  "body-options": Car,
  lights: Lightbulb,
  "tires-rims": CircleDot,
  "engine-parts": Cog,
  "car-accessories": Package,
};
function catIcon(c: TemplateCategory): React.ElementType {
  return CAT_ICONS[c.icon ?? ""] ?? CAT_ICONS[c.slug] ?? Wrench;
}

/* ── cart hook — novatrend's useTrendAdd pattern (per-card instance) ─ */
function useWrenchAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = async (product: TemplateProduct) => {
    if (!product.inStock) return;
    try {
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1100);
    } catch {
      /* toast handled by useCart */
    }
  };
  return { addToCart, added };
}

/* ── section head — stencil kicker + hazard divider ────────────────── */
function ShopHead({
  icon: Icon, kicker, title, href,
}: { icon: React.ElementType; kicker: string; title: string; href?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-[var(--ap-line-strong)] bg-[var(--ap-panel)] text-[var(--ap-orange)]">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="ap-kicker">
              <Ruler className="h-3 w-3" aria-hidden />
              {kicker}
            </p>
            <h2 className="ap-title mt-1 truncate text-[17px] leading-7 md:text-xl">{title}</h2>
          </div>
        </div>
        {href && (
          <Link
            href={href}
            className="group flex h-10 shrink-0 items-center gap-1.5 rounded-md border-2 border-[var(--ap-line)] px-4 text-[11.5px] font-extrabold text-[var(--ap-dim)] transition-colors hover:border-[var(--ap-orange)] hover:text-[var(--ap-orange)]"
          >
            مشاهدهٔ همه
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
      <span className="ap-hazard mt-4 block" aria-hidden />
    </div>
  );
}

/* ── industrial product card — spec table + stock gauge + SKU chip ─── */
function PartCard({ product, rail = false }: { product: TemplateProduct; rail?: boolean }) {
  const { addToCart, added } = useWrenchAdd();
  const car = compatOf(product.name);
  const gaugePct = product.inStock
    ? Math.min(100, Math.max(10, Math.round((product.stock / 60) * 100)))
    : 0;

  return (
    <article className={cn("ap-card flex h-full flex-col p-3", rail && "w-[236px] shrink-0 sm:w-[252px]")}>
      {/* part-number chip — mono, top-left */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="ap-sku" title="شماره فنی">
          <Wrench className="h-2.5 w-2.5" aria-hidden />
          {partNo(product.id)}
        </span>
        {product.discountPercent > 0 && (
          <span className="ap-sale">
            <Flame className="h-3 w-3" aria-hidden />
            {toFaDigits(product.discountPercent.toLocaleString("fa-IR"))}٪ تخفیف
          </span>
        )}
      </div>

      {/* image bay — steel grid + object-contain */}
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="ap-bay relative block aspect-square overflow-hidden rounded-md"
      >
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes={rail ? "252px" : "(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"}
            className="object-contain p-4 transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[var(--ap-faint)]">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-md bg-[rgba(19,21,17,.85)] py-1.5 text-center text-[10px] font-bold text-[var(--ap-ink)]">
            ناموجود — برای استعلام تماس بگیرید
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        {/* brand row + rating */}
        <p className="flex items-center justify-between gap-2 text-[10px]">
          <span className="flex min-w-0 items-center gap-1 text-[var(--ap-dim)]">
            <BadgeCheck className="h-3 w-3 shrink-0 text-[var(--ap-orange)]" aria-hidden />
            <span className="truncate font-bold">{product.brand.name}</span>
          </span>
          {product.rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 tabular-nums text-[var(--ap-dim)]">
              <Star className="h-3 w-3 fill-[var(--ap-orange)] text-[var(--ap-orange)]" aria-hidden />
              <b className="text-[var(--ap-ink)]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
              <span>({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))})</span>
            </span>
          )}
        </p>

        {/* name */}
        <Link
          href={`/products/${product.slug}`}
          className="mt-1.5 min-h-11 text-[12.5px] font-bold leading-6 line-clamp-2 text-[var(--ap-ink)] transition-colors hover:text-[var(--ap-orange)]"
        >
          {product.name}
        </Link>

        {/* compatibility chip */}
        <p className="mt-2 flex items-center gap-1.5">
          <span className="ap-compat">
            <Car className="h-3 w-3" aria-hidden />
            {car}
          </span>
          {product.soldCount > 0 && (
            <span className="text-[10px] font-semibold text-[var(--ap-faint)] tabular-nums">
              {toFaDigits(product.soldCount.toLocaleString("fa-IR"))} فروش
            </span>
          )}
        </p>

        {/* mini spec table — 2 technical rows */}
        <div className="mt-2.5">
          <div className="ap-spec">
            <span className="ap-spec-k">برند</span>
            <span className="ap-spec-v truncate">{product.brand.name}</span>
          </div>
          <div className="ap-spec">
            <span className="ap-spec-k">گروه کالا</span>
            <span className="ap-spec-v truncate">{product.category.name}</span>
          </div>
        </div>

        {/* price */}
        <div className="mt-auto pt-3">
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-black tabular-nums text-[var(--ap-ink)]">
              {formatPrice(product.effectivePrice)}
              <span className="ms-1 text-[9.5px] font-bold text-[var(--ap-dim)]">تومان</span>
            </span>
            {product.discountPercent > 0 && (
              <span className="text-[11px] font-semibold tabular-nums text-[var(--ap-dim)] line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </p>

          {/* stock gauge — torque meter */}
          <div className="mt-2">
            <div className="ap-gauge" role="presentation">
              <i className="ap-gauge-fill" style={{ width: `${gaugePct}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-[var(--ap-dim)]">
              {product.inStock ? `موجودی: ${toFaDigits(product.stock.toLocaleString("fa-IR"))} عدد` : "موجودی انبار: صفر"}
            </p>
          </div>

          {/* add to cart — orange, morphs to ✓ */}
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            data-added={added ? "1" : "0"}
            className="ap-add mt-2.5"
            aria-label={added ? "افزوده شد" : `افزودن ${product.name} به سبد`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                افزوده شد ✓
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                افزودن به سبد
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── ② HERO — industrial headline + steel-plate product panel ──────── */
function GarageHero({ data }: { data: HomeData }) {
  const reduced = useReducedMotion();
  const slide = data.slides[0];
  const hero = slide?.product ?? data.featured[0] ?? null;
  const art = hero?.mainImage ?? slide?.image ?? null;

  const title = slide?.title?.trim() || "قطعهٔ اصل، بدون واسطه";
  const words = title.split(/\s+/).filter(Boolean);
  const hlWord =
    words.find((w) => /اصل|واسطه|اورجینال|تضمین|امن|انبار|مستقیم/.test(w)) ??
    (words.length > 1 ? words[Math.floor(words.length / 2)] : words[0]);
  const subtitle =
    slide?.subtitle?.trim() ||
    "قطعات یدکی با شماره فنی دقیق برای پراید، سمند، پژو، تویوتا و هیوندای؛ قبل از ارسال سازگاری‌شان را چک می‌کنیم.";
  const ctaUrl = slide?.ctaUrl?.trim() || "/products";
  const ctaLabel = slide?.ctaText?.trim() || "سفارش قطعه";

  return (
    <section className="relative mx-auto w-full max-w-[1360px] px-4 pt-10 sm:pt-14" aria-label="معرفی فروشگاه">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* right (RTL start) — stencil headline */}
        <Reveal>
          <p className="ap-kicker">
            <Wrench className="h-3 w-3" aria-hidden />
            WORKSHOP · DIRECT SUPPLY
          </p>
          <h2 className="ap-title mt-3 text-[26px] leading-[1.35] sm:text-4xl sm:leading-[1.3]">
            {words.map((w, i) => (
              <span key={i} className={cn(w === hlWord && "ap-hl")}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          <p className="mt-4 max-w-xl text-[13.5px] leading-7 text-[var(--ap-dim)]">{subtitle}</p>

          {/* mono readout chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="ap-sku">
              <PackageCheck className="h-2.5 w-2.5" aria-hidden />
              {toFaDigits(data.counts.products.toLocaleString("fa-IR"))} قطعه در انبار
            </span>
            <span className="ap-sku">
              <Ruler className="h-2.5 w-2.5" aria-hidden />
              {toFaDigits(data.counts.categories.toLocaleString("fa-IR"))} گروه کالا
            </span>
            <span className="ap-sku">
              <Truck className="h-2.5 w-2.5" aria-hidden />
              ارسال به سراسر ایران
            </span>
          </div>

          {/* dual CTAs — solid orange + outline steel */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={ctaUrl} className="ap-btn-primary h-12 px-7 text-[13.5px]">
              {ctaLabel}
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="#ap-faq" className="ap-btn-outline h-12 px-6 text-[12.5px]">
              <Search className="h-4 w-4" aria-hidden />
              استعلام قیمت
            </Link>
          </div>
        </Reveal>

        {/* left (RTL end) — steel plate with rivets + floating part number */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="ap-plate">
            {/* corner rivets */}
            <span className="ap-rivet" style={{ top: 10, insetInlineStart: 10 }} aria-hidden />
            <span className="ap-rivet" style={{ top: 10, insetInlineEnd: 10, animationDelay: ".7s" }} aria-hidden />
            <span className="ap-rivet" style={{ bottom: 10, insetInlineStart: 10, animationDelay: "1.3s" }} aria-hidden />
            <span className="ap-rivet" style={{ bottom: 10, insetInlineEnd: 10, animationDelay: "1.9s" }} aria-hidden />

            <div className="ap-plate-grid flex aspect-[5/4] items-center justify-center p-8 sm:p-10">
              {art ? (
                <div className="relative h-full w-full">
                  <Image
                    src={art}
                    alt={hero?.name ?? title}
                    fill
                    sizes="(max-width: 1024px) 92vw, 520px"
                    className="object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,.45)]"
                    priority
                  />
                </div>
              ) : (
                <div className="grid place-items-center gap-4 text-center">
                  <Wrench className="h-20 w-20 text-[var(--ap-orange)]" aria-hidden />
                  <p className="text-[13px] font-black text-[var(--ap-dim)]">
                    {data.store.storeName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* floating part-number chip + hero price */}
          {hero && (
            <div className="absolute -bottom-4 start-4 flex items-center gap-2 rounded-md border-2 border-[var(--ap-line-strong)] bg-[var(--ap-panel-solid)] px-3 py-2 shadow-[var(--ap-shadow)]">
              <span className="ap-sku border-0 bg-transparent p-0 text-[9.5px]">{partNo(hero.id)}</span>
              <span className="h-3 w-px bg-[var(--ap-line-strong)]" aria-hidden />
              <Link
                href={`/products/${hero.slug}`}
                className="max-w-[150px] truncate text-[11px] font-bold text-[var(--ap-ink)] hover:text-[var(--ap-orange)] sm:max-w-[220px]"
              >
                {hero.name}
              </Link>
              <span className="h-3 w-px bg-[var(--ap-line-strong)]" aria-hidden />
              <span className="shrink-0 text-[11.5px] font-black tabular-nums text-[var(--ap-orange)]">
                {formatPrice(hero.discountPrice ?? hero.price)}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      <span className="ap-hazard-scroll mt-12 block" aria-hidden />
    </section>
  );
}

/* ── ③ compatibility band — «قطعه مناسب خودروی خود را پیدا کنید» ──── */
const CAR_CHIPS: { fa: string; q: string }[] = [
  { fa: "پراید", q: "پراید" },
  { fa: "سمند", q: "سمند" },
  { fa: "پژو ۲۰۶", q: "۲۰۶" },
  { fa: "پژو پارس", q: "پارس" },
  { fa: "۲۰۷", q: "۲۰۷" },
  { fa: "رانا", q: "رانا" },
  { fa: "تیبا", q: "تیبا" },
  { fa: "تویوتا", q: "تویوتا" },
  { fa: "هیوندای", q: "هیوندای" },
  { fa: "کیا", q: "کیا" },
  { fa: "رنو", q: "رنو" },
  { fa: "مزدا", q: "مزدا" },
];
function CompatBand() {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-12" aria-label="جستجو بر اساس خودرو">
      <Reveal>
        <div className="ap-card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--ap-orange)] text-[var(--ap-on-orange)]">
                <Car className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="ap-kicker">FIND BY CAR</p>
                <h2 className="ap-title mt-0.5 text-[15.5px] leading-6">قطعهٔ مناسب خودروی خود را پیدا کنید</h2>
              </div>
            </div>
            <Link
              href="/products"
              className="group flex h-9 items-center gap-1.5 text-[11.5px] font-extrabold text-[var(--ap-orange)]"
            >
              مشاهدهٔ کل انبار
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/products"
              className="ap-chip !border-[var(--ap-orange)] !text-[var(--ap-orange)]"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              جستجوی شماره فنی
            </Link>
            {CAR_CHIPS.map((c) => (
              <Link key={c.q} href={`/products?q=${encodeURIComponent(c.q)}`} className="ap-chip">
                {c.fa}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── ④ categories — steel tiles, orange top edge on hover ──────────── */
function CategoryTiles({ data }: { data: HomeData }) {
  if (data.categories.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="دسته‌بندی قطعات">
      <Reveal>
        <ShopHead icon={PackageCheck} kicker="PARTS AISLES" title="دسته‌بندی قطعات" href="/products" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {data.categories.map((c) => {
            const Icon = catIcon(c);
            return (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="ap-tile group flex flex-col items-start gap-3 p-4"
              >
                <span className="grid h-12 w-12 place-items-center rounded-md border-2 border-[var(--ap-line)] bg-[var(--ap-panel-solid)] text-[var(--ap-orange)] transition-colors group-hover:border-[var(--ap-orange)]">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-black text-[var(--ap-ink)] group-hover:text-[var(--ap-orange)]">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-[10.5px] font-semibold tabular-nums text-[var(--ap-dim)]">
                    {toFaDigits(c.productCount.toLocaleString("fa-IR"))} قطعه
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑤ bestsellers — «پرفروش‌ترین قطعات» spec-table cards ─────────── */
function BestSellers({ data }: { data: HomeData }) {
  const items = data.bestsellers.slice(0, 8);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="پرفروش‌ترین قطعات">
      <Reveal>
        <ShopHead icon={Flame} kicker="BEST SELLERS" title="پرفروش‌ترین قطعات" href="/products?sort=bestselling" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <PartCard key={p.id} product={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑥ service / assurance strip ──────────────────────────────────── */
const SERVICES: { icon: React.ElementType; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "گارانتی اصالت", text: "همهٔ قطعات با پلمب و کد رهگیری" },
  { icon: Truck, title: "ارسال به سراسر ایران", text: "تهران ۲۴ ساعته، شهرستان ۲ تا ۴ روز" },
  { icon: Headphones, title: "مشاور فنی رایگان", text: "شماره فنی بفرست، سازگاری را چک می‌کنیم" },
  { icon: RotateCcw, title: "۷ روز مهلت مرجوعی", text: "اگر قطعه سازگار نبود، بدون قید و شرط" },
];
function ServiceStrip() {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="خدمات فروشگاه">
      <Reveal>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.title} className="ap-card flex items-center gap-3.5 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--ap-panel-2)] text-[var(--ap-orange)]">
                <s.icon className="h-5.5 w-5.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[13px] font-black text-[var(--ap-ink)]">{s.title}</h3>
                <p className="mt-0.5 text-[10.5px] leading-5 text-[var(--ap-dim)]">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑦ dual promo banners — hazard-stripe frames ───────────────────── */
function PromoBanners({ data }: { data: HomeData }) {
  const sc = data.showcases.slice(0, 2);
  const banners: { key: string; title: string; subtitle: string | null; image: string | null; url: string; tag: string }[] = sc.map((s, i) => ({
    key: s.id || `sc-${i}`,
    title: s.title?.trim() || (i === 0 ? "بازبینی کامل سیستم ترمز" : "لاستیک و رینگ — آمادهٔ نصب"),
    subtitle: s.subtitle?.trim() || null,
    image: s.image,
    url: s.buttonUrl?.trim() || (i === 0 ? "/products?category=brake-pads" : "/products?category=tires-rims"),
    tag: i === 0 ? "SERVICE BULLETIN 01" : "SERVICE BULLETIN 02",
  }));
  if (banners.length === 0) {
    banners.push(
      {
        key: "promo-brake",
        title: "بازبینی کامل سیستم ترمز",
        subtitle: "لنت و دیسک پرفروش انبار، با گارانتی اصالت",
        image: null,
        url: "/products?category=brake-pads",
        tag: "SERVICE BULLETIN 01",
      },
      {
        key: "promo-tires",
        title: "لاستیک و رینگ — آمادهٔ نصب",
        subtitle: "مجموعهٔ ۴ حلقه با ارسال سریع",
        image: null,
        url: "/products?category=tires-rims",
        tag: "SERVICE BULLETIN 02",
      },
    );
  }
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="پیشنهادهای ویژه">
      <Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <Link key={b.key} href={b.url} className="ap-promo group block">
              <span className="ap-hazard-scroll block" aria-hidden />
              <div className="flex items-center gap-4 p-5 sm:p-6">
                {b.image && (
                  <span className="ap-bay relative h-20 w-20 shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-24">
                    <Image
                      src={b.image}
                      alt={b.title}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                      loading="lazy"
                    />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="ap-kicker">{b.tag}</p>
                  <h3 className="ap-title mt-1.5 text-[15px] leading-7 group-hover:text-[var(--ap-orange)]">
                    {b.title}
                  </h3>
                  {b.subtitle && (
                    <p className="mt-1 truncate text-[11.5px] text-[var(--ap-dim)]">{b.subtitle}</p>
                  )}
                  <p className="mt-2.5 flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--ap-orange)]">
                    مشاهدهٔ قطعات
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                  </p>
                </div>
                <Gauge className="hidden h-9 w-9 shrink-0 text-[var(--ap-line-strong)] sm:block" aria-hidden />
              </div>
              <span className="ap-hazard block" aria-hidden />
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑧ newest — «تازه رسیده‌ها» ───────────────────────────────────── */
function NewestGrid({ data }: { data: HomeData }) {
  const items = data.newest.slice(0, 8);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="تازه رسیده‌ها">
      <Reveal>
        <ShopHead icon={Package} kicker="NEW ARRIVALS" title="تازه رسیده‌ها" href="/products?sort=newest" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <PartCard key={p.id} product={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑨ discounted rail — «پیشنهاد مکانیک‌ها» ───────────────────────── */
function MechanicsRail({ data }: { data: HomeData }) {
  const items = data.discounted.slice(0, 12);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="پیشنهاد مکانیک‌ها">
      <Reveal>
        <ShopHead icon={Wrench} kicker="MECHANIC PICKS" title="پیشنهاد مکانیک‌ها" href="/products?discount=1" />
        <div className="ap-rail">
          {items.map((p) => (
            <PartCard key={p.id} product={p} rail />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑩ brands strip — steel chips ─────────────────────────────────── */
function BrandStrip({ data }: { data: HomeData }) {
  if (data.brands.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pt-14" aria-label="برندها">
      <Reveal>
        <ShopHead icon={BadgeCheck} kicker="IN-STOCK BRANDS" title="برندهای موجود در انبار" />
        <div className="flex flex-wrap gap-2.5">
          {data.brands.map((b) => (
            <Link key={b.id} href={`/products?brand=${b.slug}`} className="ap-chip">
              {b.logo ? (
                <Image src={b.logo} alt={b.name} width={18} height={18} className="rounded-sm object-contain" />
              ) : (
                <Disc3 className="h-3.5 w-3.5 text-[var(--ap-orange)]" aria-hidden />
              )}
              {b.name}
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑪ FAQ — technical, mono-indexed <details> ─────────────────────── */
const FALLBACK_FAQ: { h: string; p: string }[] = [
  {
    h: "چطور مطمئن شوم قطعه با خودروی من سازگار است؟",
    p: "مدل و تیپ خودرو را از نوار «قطعه مناسب خودروی خود را پیدا کنید» انتخاب کنید یا نام قطعه را برای مشاور فنی بفرستید؛ شماره فنی و سازگاری را قبل از ارسال چک می‌کنیم.",
  },
  {
    h: "ارسال سفارش چند روز طول می‌کشد؟",
    p: "سفارش‌های تهران ۲۴ تا ۴۸ ساعته و شهرستان‌ها ۲ تا ۴ روز کاری با باربری ارسال می‌شوند؛ قطعات سنگین مثل باتری و رینگ با پالت ارسال می‌شوند.",
  },
  {
    h: "اگر قطعه برای خودرویم مناسب نبود چه؟",
    p: "تا ۷ روز از زمان تحویل امکان مرجوعی دارید؛ کافی است پلمب کارخانه باز نشده باشد. هزینهٔ ارسال مرجوعی قطعهٔ ناسازگار با ما است.",
  },
];
function FaqSection({ data }: { data: HomeData }) {
  const items = data.faq.length > 0 ? data.faq : FALLBACK_FAQ;
  return (
    <section id="ap-faq" className="mx-auto w-full max-w-[1360px] scroll-mt-24 px-4 pt-14" aria-label="پرسش‌های پرتکرار">
      <Reveal>
        <ShopHead icon={Headphones} kicker="TECH FAQ" title="پرسش‌های پرتکرار" />
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((f, i) => (
            <details key={i} className="ap-faq group">
              <summary className="flex items-center gap-3 p-4">
                <span className="ap-sku">Q-{toFaDigits(String(i + 1).padStart(2, "0"))}</span>
                <h3 className="min-w-0 flex-1 text-[12.5px] font-black leading-6 text-[var(--ap-ink)]">{f.h}</h3>
                <Plus className="ap-faq-plus h-4 w-4 shrink-0 text-[var(--ap-orange)]" aria-hidden />
              </summary>
              <p className="border-t border-dashed border-[var(--ap-line)] p-4 text-[11.5px] leading-6 text-[var(--ap-dim)]">
                {f.p}
              </p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── ⑫ CTA band — safety orange ───────────────────────────────────── */
function CtaBand({ data }: { data: HomeData }) {
  return (
    <section className="mx-auto mt-14 w-full max-w-[1360px] px-4" aria-label="دعوت به خرید">
      <Reveal>
        <div className="ap-band relative overflow-hidden rounded-xl">
          <span className="ap-hazard-scroll block" aria-hidden />
          <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="min-w-0">
              <p className="ap-mono text-[10px] font-black tracking-[.24em] opacity-80">HOTLINE · READY TO SHIP</p>
              <h2 className="mt-2 text-lg font-black leading-8 sm:text-2xl">
                قطعهٔ لازمت را پیدا نکردی؟ از {data.store.storeName} بپرس
              </h2>
              <p className="mt-1.5 text-[12px] leading-6 opacity-90">
                شماره فنی یا عکس قطعه را برای مشاور فنی بفرست تا قیمت و موجودی را در چند دقیقه استعلام کنی.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {data.store.phone && (
                <a
                  href={`tel:${data.store.phone.replace(/[^0-9+]/g, "")}`}
                  className="ap-band-btn h-12 px-6 text-[12.5px]"
                >
                  {toFaDigits(data.store.phone)}
                </a>
              )}
              <Link href="/products" className="ap-band-btn h-12 px-6 text-[12.5px]">
                ورود به انبار قطعات
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <span className="ap-hazard block" aria-hidden />
        </div>
      </Reveal>
    </section>
  );
}

/* ══ TEMPLATE ════════════════════════════════════════════════════════ */
export function AutoPartsTemplate({ data }: { data: HomeData }) {
  const chrome = TEMPLATE_CHROME["auto-parts"];
  const hasAnyProduct =
    data.featured.length > 0 ||
    data.newest.length > 0 ||
    data.bestsellers.length > 0 ||
    data.discounted.length > 0;

  return (
    <div data-template-chrome="1" data-tpl="auto-parts" dir="rtl" className="w-full">
      <style>{AP_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />
      <h1 className="sr-only">{`${data.store.storeName} — قطعات یدکی و لوازم خودرو`}</h1>

      <div className="ap-root w-full pb-14">
        {/* ② hero — stencil headline + steel plate */}
        <GarageHero data={data} />

        {/* ③ compatibility band — find parts by car model */}
        <CompatBand />

        {/* ④ categories — steel tiles */}
        <CategoryTiles data={data} />

        {/* ⑤ bestsellers — spec-table cards */}
        <BestSellers data={data} />

        {/* ⑥ service / assurance strip */}
        <ServiceStrip />

        {/* ⑦ dual promo banners — hazard frames */}
        <PromoBanners data={data} />

        {/* ⑧ newest grid */}
        <NewestGrid data={data} />

        {/* ⑨ discounted rail — «پیشنهاد مکانیک‌ها» */}
        <MechanicsRail data={data} />

        {/* ⑩ brands strip — steel chips */}
        <BrandStrip data={data} />

        {/* ⑪ FAQ */}
        <FaqSection data={data} />

        {/* ⑫ CTA band */}
        <CtaBand data={data} />

        {/* empty-store fallback */}
        {!hasAnyProduct && data.categories.length === 0 && (
          <p className="mx-auto mt-16 max-w-md rounded-lg border-2 border-dashed border-[var(--ap-line-strong)] p-8 text-center text-[12px] font-bold leading-7 text-[var(--ap-dim)]">
            انبار در حال تجهیز است؛ به‌زودی قطعات با شماره فنی و گارانتی اصالت اضافه می‌شوند.
          </p>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

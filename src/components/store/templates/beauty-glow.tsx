"use client";

/**
 * TEMPLATE · beauty-glow — «Beauty Glow» (v35 · صنف آرایشی و بهداشتی)
 * ------------------------------------------------------------------------
 * Soft-luxury cosmetics storefront: blush-white #FFF9F7 canvas, deep plum
 * ink #2A1B20 and DUAL accents — rose #E8A0B4 (primary: gradients, pills,
 * glows) + gold #C9A063 (highlights: hairlines, badges, stars). Signature =
 * an elegant serif-feel hero with a GLASS PODIUM (rounded-3xl, backdrop-
 * blur, gold ring) floating over a soft radial rose blob with CSS sparkle
 * particles, a ۳-step «روتین پوست» ritual rail with gold numerals, a
 * rose→gold GIFT banner and glass-pink product cards with skin-type chips.
 * Spa-like: generous whitespace, soft rose-tinted shadows, pills everywhere.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles, ShoppingCart, Check, ChevronLeft, Star, Package, Droplets, Sun,
  Gift, Truck, ShieldCheck, BadgeCheck, Heart, Mail, Gem, HelpCircle,
  Flower2, Palette, Smile, SprayCan, Scissors, Bath,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { SlideCountdown, SlideHeroMedia, SLIDE_MEDIA_CSS } from "./slide-media";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ══ ONE scoped style block — rose/gold tokens, blob, sparkles, pills ══ */
const BEAUTY_CSS = `
[data-tpl="beauty-glow"]{--bt-rose:#E8A0B4;--bt-rose-2:#D47E9B;--bt-rose-deep:#B85C79;--bt-gold:#C9A063;--bt-gold-deep:#A8834A;--bt-ink:#2A1B20;--bt-muted:#8D7176;--bt-canvas:#FFF9F7}
[data-tpl="beauty-glow"] .bt-cta{background:linear-gradient(135deg,#E8A0B4 0%,#D47E9B 100%);color:#FFFFFF;box-shadow:0 14px 34px -14px rgba(212,126,155,.65);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
[data-tpl="beauty-glow"] .bt-cta:hover{filter:brightness(1.05);transform:translateY(-1px)}
[data-tpl="beauty-glow"] .bt-ok{background:linear-gradient(135deg,#C9A063 0%,#B8924F 100%);color:#FFFFFF}
[data-tpl="beauty-glow"] .bt-gold-btn{border:1.5px solid rgba(201,160,99,.55);color:#A8834A;background:rgba(255,255,255,.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:all .2s ease}
[data-tpl="beauty-glow"] .bt-gold-btn:hover{transform:translateY(-1px);border-color:rgba(232,160,180,.7)}
[data-tpl="beauty-glow"] .bt-sale{background:linear-gradient(135deg,#D47E9B,#B85C79);color:#FFFFFF;box-shadow:0 8px 20px -8px rgba(184,92,121,.6)}
[data-tpl="beauty-glow"] .bt-vip{background:linear-gradient(135deg,#C9A063,#A8834A);color:#FFFFFF;box-shadow:0 8px 20px -8px rgba(168,131,74,.6)}
[data-tpl="beauty-glow"] .bt-glass{background:rgba(255,255,255,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(232,160,180,.3)}
[data-tpl="beauty-glow"] .bt-pod{background:rgba(255,255,255,.42);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1.5px solid rgba(201,160,99,.55);box-shadow:0 34px 70px -30px rgba(184,92,121,.5),inset 0 1px 0 rgba(255,255,255,.8)}
[data-tpl="beauty-glow"] .bt-blob{background:radial-gradient(circle at 38% 32%,rgba(232,160,180,.6) 0%,rgba(232,160,180,.22) 52%,rgba(255,249,247,0) 76%);border-radius:46% 54% 58% 42%/50% 44% 56% 50%;animation:bt-blob 16s ease-in-out infinite}
[data-tpl="beauty-glow"] .bt-blob-2{background:radial-gradient(circle at 60% 70%,rgba(201,160,99,.32) 0%,rgba(201,160,99,.1) 48%,rgba(255,249,247,0) 74%);border-radius:54% 46% 42% 58%/46% 56% 44% 54%;animation:bt-blob 20s ease-in-out 2s infinite reverse}
[data-tpl="beauty-glow"] .bt-podium{animation:bt-podium 7s ease-in-out infinite}
[data-tpl="beauty-glow"] .bt-spark{position:absolute;border-radius:9999px;background:radial-gradient(circle,#FFFFFF 0%,rgba(232,160,180,.95) 60%);box-shadow:0 0 14px rgba(232,160,180,.85);animation:bt-sparkle 4.5s ease-in-out infinite;pointer-events:none}
[data-tpl="beauty-glow"] .bt-imgwell{background:radial-gradient(circle at 50% 30%,#F9E4E9 0%,#FCF0ED 58%,#FFF9F7 100%)}
[data-tpl="beauty-glow"] .bt-gold-line{height:1px;background:linear-gradient(to left,transparent,rgba(201,160,99,.65),transparent)}
[data-tpl="beauty-glow"] .bt-price-chip{background:rgba(255,255,255,.92);color:#2A1B20}
[data-tpl="beauty-glow"] .bt-input{background:rgba(255,255,255,.94);color:#2A1B20;box-shadow:inset 0 2px 6px rgba(184,92,121,.12)}
[data-tpl="beauty-glow"] .bt-gift{background:linear-gradient(118deg,#D47E9B 0%,#E8A0B4 42%,#E9C09A 74%,#C9A063 100%)}
[data-tpl="beauty-glow"] .bt-news{background:linear-gradient(132deg,#D47E9B 0%,#E8A0B4 55%,#D98AA4 100%)}
[data-tpl="beauty-glow"] .bt-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="beauty-glow"] .bt-rail::-webkit-scrollbar{display:none}
@keyframes bt-blob{
  0%,100%{border-radius:46% 54% 58% 42%/50% 44% 56% 50%;transform:scale(1) rotate(0deg)}
  33%{border-radius:56% 44% 44% 56%/48% 56% 44% 52%;transform:scale(1.04) rotate(2deg)}
  66%{border-radius:42% 58% 52% 48%/54% 42% 58% 46%;transform:scale(.98) rotate(-2deg)}
}
@keyframes bt-podium{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-11px) scale(1.015)}}
@keyframes bt-sparkle{0%,100%{opacity:.15;transform:translateY(0) scale(.6)}50%{opacity:1;transform:translateY(-16px) scale(1.15)}}
@media (prefers-reduced-motion:reduce){
  [data-tpl="beauty-glow"] .bt-blob,[data-tpl="beauty-glow"] .bt-blob-2,
  [data-tpl="beauty-glow"] .bt-podium,[data-tpl="beauty-glow"] .bt-spark,
  [data-tpl="beauty-glow"] .bt-cta,[data-tpl="beauty-glow"] .bt-gold-btn{animation:none!important;transition:none!important}
}

/* ══ DARK-MODE SKIN — blush → deep plum (canvas #221618, cards #2B1D21,
      ink #F5E9E6). The rose/gold accents, badges and gradient bands keep
      their color; only the blush surfaces and the ink ramp flip. ══════ */
html.dark [data-tpl="beauty-glow"]{
  --background:#221618;
  --foreground:#F5E9E6;
  --card:#2B1D21;
  --card-foreground:#F5E9E6;
  --popover:#2F2024;
  --popover-foreground:#F5E9E6;
  --secondary:#2B1D21;
  --secondary-foreground:#F5E9E6;
  --muted:#27191D;
  --muted-foreground:#B7A0A5;
  --accent:#332327;
  --accent-foreground:#F5E9E6;
  --border:rgba(245,233,230,.15);
  --input:rgba(245,233,230,.22);
  --ring:#C9A063;
  background-color:#221618;
  color:#F5E9E6;
}
/* ink ramp — plum ink → light rose-cream, muted lifts */
html.dark [data-tpl="beauty-glow"] .text-\\[\\#2A1B20\\]{color:#F5E9E6}
html.dark [data-tpl="beauty-glow"] .text-\\[\\#8D7176\\]{color:#B7A0A5}
/* accents re-declared AFTER the ramp so they keep beating it */
html.dark [data-tpl="beauty-glow"] .text-\\[\\#B85C79\\]{color:#E8A0B4}
html.dark [data-tpl="beauty-glow"] .text-\\[\\#A8834A\\]{color:#C9A063}
/* blush surfaces → deep-plum cards & wells */
html.dark [data-tpl="beauty-glow"] .bg-\\[\\#FFF9F7\\]{background-color:#221618}
html.dark [data-tpl="beauty-glow"] .bg-white{background-color:#2B1D21}
html.dark [data-tpl="beauty-glow"] .bg-white\\/70{background-color:rgba(43,29,33,.74)}
/* rose/gold tints gain a little alpha so they read on plum */
html.dark [data-tpl="beauty-glow"] .bg-\\[\\#E8A0B4\\]\\/10{background-color:rgba(232,160,180,.16)}
html.dark [data-tpl="beauty-glow"] .bg-\\[\\#E8A0B4\\]\\/15{background-color:rgba(232,160,180,.2)}
html.dark [data-tpl="beauty-glow"] .bg-\\[\\#C9A063\\]\\/10{background-color:rgba(201,160,99,.16)}
/* glass + podium + wells flip to plum glass; gold ring keeps its warmth */
html.dark [data-tpl="beauty-glow"] .bt-glass{background:rgba(43,29,33,.62);border-color:rgba(232,160,180,.22)}
html.dark [data-tpl="beauty-glow"] .bt-pod{background:rgba(43,29,33,.6);border-color:rgba(201,160,99,.5);box-shadow:0 34px 70px -30px rgba(0,0,0,.6),inset 0 1px 0 rgba(245,233,230,.08)}
html.dark [data-tpl="beauty-glow"] .bt-imgwell{background:radial-gradient(circle at 50% 30%,#312027 0%,#291A1E 58%,#221618 100%)}
html.dark [data-tpl="beauty-glow"] .bt-blob{background:radial-gradient(circle at 38% 32%,rgba(184,92,121,.42) 0%,rgba(184,92,121,.14) 52%,rgba(34,22,24,0) 76%)}
html.dark [data-tpl="beauty-glow"] .bt-blob-2{background:radial-gradient(circle at 60% 70%,rgba(201,160,99,.22) 0%,rgba(201,160,99,.07) 48%,rgba(34,22,24,0) 74%)}
html.dark [data-tpl="beauty-glow"] .bt-gold-btn{background:rgba(43,29,33,.55);color:#C9A063}
html.dark [data-tpl="beauty-glow"] .bt-price-chip{background:rgba(34,22,24,.88);color:#F5E9E6}
/* the staying gradient bands (gift / newsletter / sale pills) keep their
   white CTA pill with plum ink label, exactly like light mode */
html.dark [data-tpl="beauty-glow"] .bt-gift .bg-white,
html.dark [data-tpl="beauty-glow"] .bt-news .bg-white{background-color:#FFFFFF}
html.dark [data-tpl="beauty-glow"] .bt-gift .text-\\[\\#2A1B20\\],
html.dark [data-tpl="beauty-glow"] .bt-news .text-\\[\\#2A1B20\\]{color:#2A1B20}
`;

/* ── category icon map — vertical seeds → lucide glyphs (fallback Gem) ── */
const CAT_ICONS: Record<string, React.ElementType> = {
  Droplets, Flower2, Sun, Palette, Smile, SprayCan, Scissors, Bath, Gift, Sparkles,
};
function catIcon(name: string | null): React.ElementType {
  return (name && CAT_ICONS[name]) || Gem;
}

/* ── section header — rose eyebrow + serif title + gold «همه» pill ──── */
function GlowHeader({
  icon: Icon, title, eyebrow, href,
}: { icon: React.ElementType; title: string; eyebrow: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.2em] text-[#B85C79]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl font-bold leading-snug tracking-tight text-[#2A1B20] md:text-[1.8rem]">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="bt-gold-btn flex h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-xs font-bold"
        >
          همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ─────── */
function useGlowAdd() {
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

/* ── skin-type chips derived from the product NAME (render contract
      carries no specs; the vertical seed bakes types into the names) ── */
function skinChips(name: string): string[] {
  const chips: string[] = [];
  if (name.includes("همه انواع پوست")) return ["همه پوست‌ها"];
  if (name.includes("چرب")) chips.push("پوست چرب");
  if (name.includes("خشک")) chips.push("پوست خشک");
  if (name.includes("مختلط")) chips.push("پوست مختلط");
  if (name.includes("حساس")) chips.push("پوست حساس");
  return chips.slice(0, 2).length > 0 ? chips.slice(0, 2) : ["همه پوست‌ها"];
}

/* ── glass-pink product card — skin chips, gold stars, rose pill ──── */
function BeautyCard({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useGlowAdd();
  const skins = skinChips(product.name);
  const stars = Math.round(product.rating);
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-[1.75rem] border border-[#E8A0B4]/25 bg-white/70 p-3.5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#E8A0B4]/50 hover:shadow-[0_26px_58px_-26px_rgba(212,126,155,.7)]",
        !product.inStock && "grayscale-[0.35]"
      )}
    >
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="bt-imgwell relative block aspect-square overflow-hidden rounded-[1.5rem]">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full place-items-center text-[#E8A0B4]/50">
            <Package className="h-10 w-10" aria-hidden />
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="bt-sale absolute start-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        )}
        {product.isSpecial && (
          <span className="bt-vip absolute end-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black">
            <Gem className="h-3 w-3" aria-hidden />
            ویژه
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[#2A1B20]/85 py-1.5 text-center text-[10px] font-bold text-white">ناموجود</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-[#8D7176]">
          <BadgeCheck className="h-3 w-3 shrink-0 text-[#B85C79]" aria-hidden />
          {product.brand.name}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1 min-h-12 text-[13px] font-bold leading-6 line-clamp-2 text-[#2A1B20] hover:underline hover:decoration-[#E8A0B4] hover:underline-offset-4"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skins.map((s) => (
            <span key={s} className="rounded-full bg-[#E8A0B4]/10 px-2.5 py-0.5 text-[9.5px] font-medium text-[#B85C79]">
              {s}
            </span>
          ))}
        </div>
        {product.rating > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#8D7176] tabular-nums">
            <span className="flex items-center gap-0.5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className={cn("h-3 w-3", i < stars ? "fill-[#C9A063] text-[#C9A063]" : "fill-[#F0DCC8] text-[#F0DCC8]")} />
              ))}
            </span>
            <b className="font-bold text-[#A8834A]">{toFaDigits(product.rating.toLocaleString("fa-IR"))}</b>
            <span>({toFaDigits(product.reviewCount.toLocaleString("fa-IR"))})</span>
          </p>
        )}
        <div className="mt-auto pt-3">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            {product.discountPercent > 0 && (
              <span className="text-[10.5px] leading-4 text-[#8D7176] line-through tabular-nums">{formatPrice(product.price)}</span>
            )}
            <span className="text-[14.5px] font-black tabular-nums text-[#2A1B20]">
              {formatPrice(product.effectivePrice)}
              <span className="text-[10px] font-normal text-[#8D7176]"> تومان</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد`}
            className={cn(
              "mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.98]",
              !product.inStock
                ? "cursor-not-allowed bg-[#E8A0B4]/10 text-[#8D7176]"
                : added
                  ? "bt-ok"
                  : "bt-cta"
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                افزوده شد ✓
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" aria-hidden />
                افزودن به سبد
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── FAQ item — glass accordion, rose caret ────────────────────────── */
function GlowFaq({ h, p, n }: { h: string; p: string; n: number }) {
  const [open, setOpen] = useState(n === 0);
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E8A0B4]/25 bg-white/70 backdrop-blur">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 p-4 text-start">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#E8A0B4]" />
        <span className="flex-1 text-[13px] font-bold leading-6 text-[#2A1B20]">{h}</span>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-[#8D7176] transition-transform duration-300", open ? "-rotate-90 text-[#B85C79]" : "rotate-90")} aria-hidden />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[12.5px] leading-7 text-[#8D7176]">{p}</p>
        </div>
      </div>
    </div>
  );
}

/* ══ TEMPLATE ════════════════════════════════════════════════════════ */
export function BeautyGlowTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const reduced = useReducedMotion();
  const [subscribed, setSubscribed] = useState(false);

  const heroSlide = data.slides[0] ?? null;
  const heroTitle = heroSlide?.title ?? "درخشش طبیعی تو";
  const heroSub =
    heroSlide?.subtitle ??
    (store.announcementActive && store.announcement
      ? store.announcement
      : "از پاکسازی ملایم تا ضدآفتاب روزانه؛ روتین حرفه‌ای پوست، آرایش دلخواهت و عطر امضایت — همه اصل و با مشاوره خواهرانه، از یک جا.");
  const heroProduct = data.featured[0] ?? data.bestsellers[0] ?? data.newest[0] ?? null;
  const chipProduct =
    data.bestsellers.find((p) => p.id !== heroProduct?.id) ?? data.newest[1] ?? data.discounted[0] ?? null;
  const popular =
    data.bestsellers.length > 0 ? data.bestsellers : data.featured.length > 0 ? data.featured : data.newest;
  const giftProduct =
    [...data.featured, ...data.bestsellers, ...data.newest, ...data.discounted].find(
      (p) => p.category.slug === "gift-sets" && p.mainImage
    ) ?? null;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;
  const productCountChip =
    counts.products > 0 ? `+${toFaDigits(counts.products.toLocaleString("fa-IR"))} محصول اصل` : "محصولات اصل و اورجینال";

  /* fallback skin FAQ — shown only when the store has none of its own */
  const faqItems =
    data.faq.length > 0
      ? data.faq
      : [
          { h: "چه ضدآفتابی برای پوست چرب مناسب است؟", p: "پوست‌های چرب بهتر است از ضدآفتاب‌های ژلی، بی‌رنگ و سبک با فرمول non-comedogenic استفاده کنند که منافذ را نمی‌بندند. اگر آرایش می‌کنید، ضدآفتاب‌های بی‌رنگ زیر کرم پودر حالت سنگین ایجاد نمی‌کنند." },
          { h: "ترتیب درست روتین مراقبت پوست چیست؟", p: "ابتدا شوینده یا آب میسلار، سپس تونر، بعد سرم (ویتامین C صبح / هیالورونیک شب) و در پایان کرم مرطوب‌کننده و ضدآفتاب. قاعده کلی: از رقیق به غلیظ." },
          { h: "سرم ویتامین C را چه زمانی و چطور استفاده کنم؟", p: "بهترین زمان صبح، بعد از پاکسازی و قبل از کرم مرطوب‌کننده است؛ و حتماً روی آن ضدآفتاب بزنید. شروع کار با روز یک‌بار و مقدار کمی، به پوست فرصت سازگاری می‌دهد." },
        ];

  const chrome = TEMPLATE_CHROME["beauty-glow"];
  const rise = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  return (
    <div data-template-chrome="1" data-tpl="beauty-glow" dir="rtl" className="isolate w-full bg-[#FFF9F7] text-[#2A1B20]">
      <style>{BEAUTY_CSS + SLIDE_MEDIA_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      <div className="mx-auto w-full max-w-[1280px]">
        {/* ═══ ① HERO — serif headline + rose blob / glass podium ═══ */}
        <motion.section {...rise} transition={{ type: "spring", stiffness: 55, damping: 15 }} className="relative px-4 pb-16 pt-6 sm:px-4" aria-labelledby="bt-hero">
          <div className="grid items-center gap-12 lg:grid-cols-5">
            {/* copy — visually right in RTL */}
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E8A0B4]/10 px-4 py-2 text-[11px] font-bold text-[#B85C79]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                مراقبت حرفه‌ای
              </span>
              <h1 id="bt-hero" className="mt-6 font-serif text-4xl font-bold leading-[1.2] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                {heroTitle}
              </h1>
              <p className="mt-3 text-[12px] font-bold tracking-[0.14em] text-[#A8834A]">
                {store.storeName}
                <span dir="ltr" className="ms-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[#8D7176]">{store.storeNameEn}</span>
              </p>
              <p className="mt-6 max-w-xl text-[13.5px] leading-8 text-[#8D7176]">{heroSub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="bt-cta flex h-12 items-center gap-2 rounded-full px-8 text-sm font-bold text-white active:scale-[0.98]">
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  شروع روتین پوست
                </Link>
                <Link href="/products?category=gift-sets" className="bt-gold-btn flex h-12 items-center gap-2 rounded-full px-8 text-sm font-bold">
                  <Gift className="h-4 w-4" aria-hidden />
                  ست‌های هدیه
                </Link>
              </div>
              {/* 4 mini stat chips */}
              <ul className="mt-9 flex flex-wrap gap-2.5">
                {[
                  { icon: BadgeCheck, t: productCountChip },
                  { icon: Truck, t: "ارسال سریع" },
                  { icon: Heart, t: "مشاور پوست رایگان" },
                  { icon: ShieldCheck, t: "ضمانت اصالت کالا" },
                ].map((s) => (
                  <li key={s.t} className="bt-glass flex h-9 items-center gap-1.5 rounded-full px-4 text-[10.5px] font-bold text-[#B85C79]">
                    <s.icon className="h-3.5 w-3.5" aria-hidden />
                    {s.t}
                  </li>
                ))}
              </ul>
            </div>

            {/* visual — rose blob + GLASS PODIUM + sparkles (left in RTL) */}
            <div className="relative lg:col-span-2">
              <div className="relative mx-auto aspect-square w-full max-w-[430px]">
                <span aria-hidden className="bt-blob absolute inset-2" />
                <span aria-hidden className="bt-blob-2 absolute inset-10" />

                {/* sparkle particles */}
                {[
                  { top: "10%", start: "16%", s: 10, d: 0 },
                  { top: "24%", start: "82%", s: 7, d: 1.2 },
                  { top: "52%", start: "8%", s: 8, d: 2.1 },
                  { top: "66%", start: "88%", s: 6, d: 0.6 },
                  { top: "6%", start: "56%", s: 9, d: 1.7 },
                  { top: "40%", start: "94%", s: 5, d: 2.6 },
                ].map((sp, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="bt-spark z-[1]"
                    style={{ top: sp.top, insetInlineStart: sp.start, width: sp.s, height: sp.s, animationDelay: `${sp.d}s` }}
                  />
                ))}

                {/* glass podium with gold ring */}
                {heroProduct?.mainImage ? (
                  <Link
                    href={`/products/${heroProduct.slug}`}
                    aria-label={heroProduct.name}
                    className="bt-podium bt-pod absolute inset-x-7 bottom-6 top-[24%] z-[2] block overflow-hidden rounded-3xl"
                  >
                    <span className="bt-gold-line absolute inset-x-8 top-3" aria-hidden />
                    <span className="relative block h-full w-full">
                      <Image src={heroProduct.mainImage} alt={heroProduct.name} fill priority sizes="(max-width: 1024px) 80vw, 34vw" className="object-contain p-8" />
                    </span>
                    <span className="bt-price-chip absolute bottom-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[11px] font-black tabular-nums backdrop-blur">
                      {formatPrice(heroProduct.effectivePrice)} تومان
                    </span>
                  </Link>
                ) : heroSlide ? (
                  <Link href={heroSlide.ctaUrl ?? "/products"} aria-label={heroSlide.title} className="bt-podium bt-pod absolute inset-x-7 bottom-6 top-[24%] z-[2] block overflow-hidden rounded-3xl">
                    <span className="relative block h-full w-full">
                      <SlideHeroMedia slide={heroSlide} alt={heroSlide.title} fill priority sizes="(max-width: 1024px) 80vw, 34vw" className="object-cover" />
                    </span>
                    {heroSlide.countdownEnabled && heroSlide.countdownTarget ? (
                      <span className="absolute inset-x-3 bottom-3 z-[3] flex justify-center">
                        <SlideCountdown target={heroSlide.countdownTarget} label={heroSlide.countdownLabel} />
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <span className="bt-podium bt-pod absolute inset-x-7 bottom-6 top-[24%] z-[2] grid place-items-center overflow-hidden rounded-3xl">
                    <Sparkles className="h-16 w-16 text-[#E8A0B4]" aria-hidden />
                  </span>
                )}

                {/* small glass product chip — floats over the blob */}
                {chipProduct?.mainImage && (
                  <Link
                    href={`/products/${chipProduct.slug}`}
                    aria-label={chipProduct.name}
                    className="bt-glass absolute -top-3 start-0 z-[3] hidden w-48 items-center gap-2.5 rounded-[1.25rem] p-2.5 shadow-[0_18px_44px_-18px_rgba(212,126,155,.55)] sm:flex"
                  >
                    <span className="bt-imgwell relative block h-11 w-11 shrink-0 overflow-hidden rounded-[0.85rem]">
                      <Image src={chipProduct.mainImage} alt={chipProduct.name} fill sizes="44px" className="object-contain p-1" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10.5px] font-bold text-[#2A1B20]">{chipProduct.name}</span>
                      <span className="mt-0.5 block text-[10px] font-black tabular-nums text-[#A8834A]">
                        {formatPrice(chipProduct.effectivePrice)} تومان
                      </span>
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ═══ ③ RITUAL — «روتین پوست در ۳ قدم» with gold numerals ═══ */}
        <section className="px-4 py-12" aria-labelledby="bt-ritual">
          <Reveal>
            <GlowHeader icon={Droplets} title="روتین پوست در ۳ قدم" eyebrow="روتین طلایی" />
            <div className="relative">
              <span aria-hidden className="bt-gold-line absolute inset-x-14 top-8 hidden lg:block" />
              <div className="relative grid gap-5 sm:grid-cols-3">
                {[
                  { n: "۱", icon: Droplets, t: "پاکسازی ملایم", d: "با فوم شوینده یا آب میسلار، آرایش و آلودگی روز را بدون خشک‌کردن پوست پاک کن." },
                  { n: "۲", icon: Sparkles, t: "درمان با سرم", d: "سرم ویتامین C صبح‌ها و هیالورونیک شب‌ها، دغدغه اصلی پوستت را هدف می‌گیرد." },
                  { n: "۳", icon: Sun, t: "آبرسانی و ضدآفتاب", d: "کرم مرطوب‌کننده رطوبت را قفل می‌کند؛ ضدآفتاب مهم‌ترین و آخرین قدم روز است." },
                ].map((s) => (
                  <div key={s.n} className="flex flex-col items-start gap-4 rounded-[1.75rem] border border-[#E8A0B4]/25 bg-white/70 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#E8A0B4]/50 hover:shadow-[0_24px_54px_-26px_rgba(212,126,155,.65)]">
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#E8A0B4]/35 bg-[#E8A0B4]/15">
                      <span className="text-2xl font-black tabular-nums text-[#A8834A]">{s.n}</span>
                    </span>
                    <p className="flex items-center gap-2 text-[14px] font-bold text-[#2A1B20]">
                      <s.icon className="h-4 w-4 text-[#B85C79]" aria-hidden />
                      {s.t}
                    </p>
                    <p className="text-[12px] leading-7 text-[#8D7176]">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══ ④ CATEGORIES — soft glass cards, rose icon circles ═══ */}
        {data.categories.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="bt-cats">
            <Reveal>
              <GlowHeader icon={Flower2} title="دسته‌بندی‌های مراقبت و زیبایی" eyebrow="قفسه‌های ما" href="/products" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.categories.slice(0, 9).map((c) => {
                  const Icon = catIcon(c.icon);
                  return (
                    <Link
                      key={c.id}
                      href={`/products?category=${c.slug}`}
                      className="group flex items-center gap-4 rounded-[1.75rem] border border-[#E8A0B4]/25 bg-white/70 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#E8A0B4]/50 hover:shadow-[0_24px_54px_-26px_rgba(212,126,155,.65)]"
                    >
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#E8A0B4]/15 text-[#B85C79] transition-colors group-hover:bg-[#E8A0B4]/25">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-[#2A1B20]">{c.name}</span>
                        <span className="mt-1 block text-[10.5px] tabular-nums text-[#8D7176]">
                          {toFaDigits(c.productCount.toLocaleString("fa-IR"))} محصول
                        </span>
                      </span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#C9A063]/40 text-[#A8834A] transition-colors group-hover:border-[#E8A0B4]/60 group-hover:text-[#B85C79]">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑤ POPULAR — «محصولات محبوب» grid ═══ */}
        {popular.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="bt-popular">
            <Reveal>
              <GlowHeader icon={Star} title="محصولات محبوب" eyebrow="محبوب‌های مشتری‌ها" href="/products?sort=bestselling" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {popular.slice(0, 8).map((p) => (
                  <BeautyCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑥ GIFT BANNER — gradient rose→gold band ═══ */}
        <section className="px-4 py-12" aria-label="ست‌های هدیه">
          <Reveal>
            <Link href="/products?category=gift-sets" className="bt-gift group relative flex min-h-56 flex-col justify-between gap-6 overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-10 lg:flex-row lg:items-center">
              <span aria-hidden className="bt-blob-2 absolute -bottom-20 -start-16 h-64 w-64 opacity-70" />
              <span aria-hidden className="bt-spark" style={{ top: "18%", insetInlineStart: "30%", width: 8, height: 8 }} />
              <span aria-hidden className="bt-spark" style={{ top: "62%", insetInlineStart: "46%", width: 6, height: 6, animationDelay: "1.4s" }} />
              <span className="relative z-[1] max-w-lg">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-[10.5px] font-bold backdrop-blur">
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                  ست‌های هدیه
                </span>
                <span className="mt-3 block font-serif text-2xl font-bold leading-snug sm:text-3xl">هدیه‌ای که پوست را خوشحال می‌کند</span>
                <span className="mt-2 block max-w-md text-[12.5px] leading-7 text-white/85">
                  ست‌های آماده روتین پوست و آرایش با جعبه شیک — انتخاب مطمئن برای تولد، سالگرد و هدیه‌های اداری.
                </span>
              </span>
              <span className="relative z-[1] flex items-center gap-4">
                {giftProduct?.mainImage ? (
                  <span className="bt-pod hidden h-28 w-28 shrink-0 overflow-hidden rounded-3xl sm:block">
                    <span className="relative block h-full w-full">
                      <Image src={giftProduct.mainImage} alt={giftProduct.name} fill sizes="112px" className="object-contain p-3" />
                    </span>
                  </span>
                ) : (
                  <span className="bt-pod hidden h-28 w-28 shrink-0 place-items-center rounded-3xl sm:grid">
                    <Gift className="h-10 w-10 text-[#C9A063]" aria-hidden />
                  </span>
                )}
                <span className="flex h-12 items-center gap-1.5 rounded-full bg-white px-7 text-xs font-black text-[#2A1B20] transition-transform group-hover:-translate-y-0.5">
                  مشاهده ست‌ها
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </span>
              </span>
            </Link>
          </Reveal>
        </section>

        {/* ═══ ⑦ NEWEST — «جدیدترین‌ها» rail ═══ */}
        {data.newest.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="bt-new">
            <Reveal>
              <GlowHeader icon={Sparkles} title="جدیدترین‌ها" eyebrow="تازه رسیده‌ها" href="/products?sort=newest" />
              <div className="bt-rail -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
                {data.newest.slice(0, 12).map((p) => (
                  <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[240px]">
                    <BeautyCard product={p} />
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑧ DISCOUNTED — «پیشنهاد ویژه» rose/gold badges ═══ */}
        {data.discounted.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="bt-deals">
            <Reveal>
              <GlowHeader icon={Gem} title="پیشنهاد ویژه" eyebrow="حراج گل‌رنگ" href="/products?discount=1" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.discounted.slice(0, 8).map((p) => (
                  <BeautyCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑨ BRANDS — round logo chips ═══ */}
        {data.brands.length > 0 && (
          <section className="px-4 pb-6 pt-12" aria-label="برندهای همکار">
            <Reveal>
              <p className="mb-8 text-center text-[11px] font-bold tracking-[0.3em] text-[#8D7176]">برندهای مورد اعتماد ما</p>
              <span aria-hidden className="bt-gold-line mx-auto mb-8 block w-40" />
              <ul className="flex flex-wrap justify-center gap-3">
                {data.brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/products?brand=${b.slug}`}
                      className="flex h-14 items-center gap-2.5 rounded-full border border-[#E8A0B4]/25 bg-white/70 px-6 text-[12.5px] font-bold text-[#2A1B20] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#E8A0B4]/60 hover:shadow-[0_18px_40px_-20px_rgba(212,126,155,.6)]"
                    >
                      {b.logo ? (
                        <span className="relative block h-9 w-9 overflow-hidden rounded-full bg-white">
                          <Image src={b.logo} alt={b.name} fill sizes="36px" className="object-contain p-0.5" />
                        </span>
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E8A0B4]/15 text-[13px] font-black text-[#B85C79]">
                          {b.name.charAt(0)}
                        </span>
                      )}
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        )}

        {/* ═══ ⑩ FAQ — «سوالات متداول پوست» accordion ═══ */}
        <section className="px-4 py-12" aria-labelledby="bt-faq">
          <Reveal>
            <GlowHeader icon={HelpCircle} title="سوالات متداول پوست" eyebrow="مراقبت درست" />
            <div className="grid gap-3 lg:grid-cols-2">
              {faqItems.slice(0, 6).map((f, i) => (
                <GlowFaq key={i} h={f.h} p={f.p} n={i} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ ⑪ NEWSLETTER — rose gradient CTA band ═══ */}
        <section className="px-4 pb-16 pt-6" aria-labelledby="bt-news">
          <Reveal>
            <div className="bt-news relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-white sm:px-12">
              <span aria-hidden className="bt-blob absolute -top-24 -end-16 h-72 w-72 opacity-60" />
              <span aria-hidden className="bt-spark" style={{ top: "22%", insetInlineStart: "12%", width: 9, height: 9 }} />
              <span aria-hidden className="bt-spark" style={{ top: "68%", insetInlineStart: "82%", width: 7, height: 7, animationDelay: "1.8s" }} />
              <div className="relative z-[1] mx-auto max-w-xl text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-white/20 text-white backdrop-blur">
                  <Mail className="h-6 w-6" aria-hidden />
                </span>
                <h2 id="bt-news" className="mt-5 font-serif text-2xl font-bold sm:text-3xl">عضویت در باشگاه زیبایی</h2>
                <p className="mt-3 text-[12.5px] leading-7 text-white/85">
                  نک‌های کوتاه مراقبت پوست، معرفی محصولات تازه و تخفیف‌های مخصوص اعضا — هفته‌ای یک ایمیل، بدون اسپم.
                </p>
                {subscribed ? (
                  <p className="mx-auto mt-6 flex h-12 max-w-md items-center justify-center gap-2 rounded-full bg-white text-[12.5px] font-bold text-[#2A1B20]">
                    <Check className="h-4 w-4 text-[#B85C79]" aria-hidden />
                    عضویتت ثبت شد! به‌زودی اولین نک مراقبت می‌رسد.
                  </p>
                ) : (
                  <form
                    className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubscribed(true);
                    }}
                  >
                    <input
                      type="email"
                      required
                      dir="ltr"
                      placeholder="you@example.com"
                      aria-label="ایمیل برای عضویت در خبرنامه"
                      className="bt-input h-12 flex-1 rounded-full px-5 text-start text-[12.5px] outline-none placeholder:text-[#8D7176]"
                    />
                    <button type="submit" className="h-12 shrink-0 rounded-full bg-white px-8 text-xs font-black text-[#2A1B20] transition-transform hover:-translate-y-0.5 active:scale-[0.98]">
                      عضویت
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Reveal>
        </section>

        {/* empty state */}
        {!hasAnyProduct && (
          <section className="px-4 pb-24">
            <div className="rounded-[2.5rem] border border-[#E8A0B4]/25 bg-white/70 p-16 text-center backdrop-blur">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-[#E8A0B4]/60" aria-hidden />
              <h2 className="font-serif text-lg font-bold">ویترین {store.storeName} هنوز خالی است</h2>
              <p className="mt-2 text-sm leading-7 text-[#8D7176]">به‌زودی محصولات مراقبت پوست و آرایش روی بوم گل‌رنگ می‌نشینند…</p>
            </div>
          </section>
        )}
      </div>

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

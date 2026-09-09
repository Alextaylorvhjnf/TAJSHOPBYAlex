"use client";

/**
 * TEMPLATE · social-commerce — «Social Neon Feed» (v25 full rewrite)
 * ----------------------------------------------------------------
 * Dark-glass social feed #101014. Signature = VERTICAL STORY TILES with
 * magenta→orange gradient rings and Instagram-style gradient SCRUB BARS
 * on top, a masonry 2/3-col product feed with price chips + quick-add,
 * like/bookmark micro-interactions (scale bounce, local state only) and
 * neon hashtag chips built from real categories/brands.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart, Bookmark, Package, Check, ChevronLeft, Flame, TrendingUp,
  HelpCircle, BadgeCheck, Sparkles, MessageCircle, Share2, Megaphone,
  Play, Hash, ShoppingBag, CirclePlus, Eye,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { RAIL_URLS } from "@/lib/templates/slide-targets";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { type StoryItem } from "../stories-row";
import { StoryViewer } from "../story-viewer";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ONE scoped style block — Social-Neon-Feed tokens, rings, bounce, glow */
const SOCIAL_NEON_CSS = `
[data-tpl="social-commerce"]{
  --sc-dark:#101014;--sc-panel:#16161C;--sc-magenta:#FF006E;--sc-orange:#FF8A00;--sc-cyan:#22D3EE;
  --sc-glass:rgba(255,255,255,.05);--sc-brd:rgba(255,255,255,.14);--sc-brd-soft:rgba(255,255,255,.1);
}
[data-tpl="social-commerce"] .sc-glass{background:var(--sc-glass);-webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);border:1px solid var(--sc-brd);box-shadow:0 18px 55px -25px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.06)}
[data-tpl="social-commerce"] .sc-glass-soft{background:rgba(255,255,255,.03);border:1px solid var(--sc-brd-soft)}
/* vibrant gradient story ring (magenta→orange) */
[data-tpl="social-commerce"] .sc-ring{position:relative;padding:2px;border-radius:1.5rem;background:conic-gradient(from 210deg,#FF006E,#FF8A00,#FFD600,#FF006E);box-shadow:0 0 22px -4px rgba(255,0,110,.55),0 0 34px -8px rgba(255,138,0,.4);transition:box-shadow .35s,transform .35s}
[data-tpl="social-commerce"] .sc-ring:hover{box-shadow:0 0 30px -2px rgba(255,0,110,.75),0 0 44px -6px rgba(255,138,0,.6);transform:translateY(-3px)}
[data-tpl="social-commerce"] .sc-ring-inner{border-radius:calc(1.5rem - 2px);overflow:hidden;background:var(--sc-panel)}
/* small avatar ring */
[data-tpl="social-commerce"] .sc-ring-sm{padding:2px;border-radius:9999px;background:conic-gradient(from 210deg,#FF006E,#FF8A00,#FFD600,#FF006E)}
[data-tpl="social-commerce"] .sc-ring-sm-inner{border-radius:9999px;overflow:hidden;background:var(--sc-panel)}
/* gradient scrub bars on story tiles */
[data-tpl="social-commerce"] .sc-scrub{display:flex;gap:3px;padding:8px 8px 0}
[data-tpl="social-commerce"] .sc-scrub i{display:block;height:3px;flex:1;border-radius:99px;background:rgba(255,255,255,.28)}
[data-tpl="social-commerce"] .sc-scrub i.on{background:linear-gradient(to left,#FF8A00,#FF006E);box-shadow:0 0 8px rgba(255,0,110,.7)}
[data-tpl="social-commerce"] .sc-scrub i.half{background:linear-gradient(to left,rgba(255,138,0,.9) 50%,rgba(255,255,255,.28) 50%)}
/* like/bookmark micro-interaction — scale bounce */
[data-tpl="social-commerce"] .sc-bounce{animation:sc-bounce .45s cubic-bezier(.34,1.56,.64,1)}
@keyframes sc-bounce{0%{transform:scale(1)}40%{transform:scale(1.38)}100%{transform:scale(1)}}
[data-tpl="social-commerce"] .sc-liked{color:#FF2E7E;fill:#FF2E7E;filter:drop-shadow(0 0 8px rgba(255,46,126,.75))}
[data-tpl="social-commerce"] .sc-saved{color:#FFD600;fill:#FFD600;filter:drop-shadow(0 0 8px rgba(255,214,0,.7))}
/* neon hashtag chips */
[data-tpl="social-commerce"] .sc-tag{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:99px;border:1px solid rgba(255,138,0,.35);background:rgba(255,0,110,.08);color:#FFB4D2;font-size:9.5px;font-weight:800;white-space:nowrap;transition:all .3s}
[data-tpl="social-commerce"] .sc-tag:hover{border-color:rgba(255,138,0,.8);box-shadow:0 0 16px -4px rgba(255,0,110,.6);color:#FFD9E8}
[data-tpl="social-commerce"] a.sc-tag{text-decoration:none}
/* gradient CTA + ghost */
[data-tpl="social-commerce"] .sc-cta{background:linear-gradient(135deg,#FF006E 0%,#FF4D2E 55%,#FF8A00 100%);color:#FFF;box-shadow:0 0 24px -4px rgba(255,0,110,.6),0 12px 32px -12px rgba(255,77,46,.7);transition:transform .3s,box-shadow .3s}
[data-tpl="social-commerce"] .sc-cta:hover{transform:translateY(-2px);box-shadow:0 0 34px 0 rgba(255,0,110,.75),0 16px 38px -12px rgba(255,138,0,.7)}
[data-tpl="social-commerce"] .sc-btn-ghost{background:rgba(255,255,255,.05);border:1px solid rgba(34,211,238,.4);color:#A5F3FC;box-shadow:inset 0 0 20px rgba(34,211,238,.1);transition:all .3s}
[data-tpl="social-commerce"] .sc-btn-ghost:hover{border-color:rgba(34,211,238,.85);box-shadow:0 0 24px -6px rgba(34,211,238,.6),inset 0 0 24px rgba(34,211,238,.15)}
/* feed card */
[data-tpl="social-commerce"] .sc-card{transition:transform .35s cubic-bezier(.2,.7,.3,1),box-shadow .35s,border-color .35s}
[data-tpl="social-commerce"] .sc-card:hover{transform:translateY(-4px);border-color:rgba(255,0,110,.4);box-shadow:0 22px 58px -26px rgba(0,0,0,.85),0 0 30px -12px rgba(255,0,110,.4)}
/* neon divider */
[data-tpl="social-commerce"] .sc-scan{position:relative;height:1px;background:linear-gradient(to left,transparent,rgba(255,0,110,.6),rgba(255,214,0,.85),rgba(255,138,0,.6),transparent);overflow:visible}
[data-tpl="social-commerce"] .sc-scan::after{content:"";position:absolute;top:-2px;left:0;width:64px;height:5px;background:linear-gradient(to left,transparent,rgba(255,138,0,.85),transparent);filter:blur(3px);animation:sc-scan 5.2s linear infinite}
@keyframes sc-scan{0%{left:-8%}100%{left:104%}}
/* rails + scrollbars */
[data-tpl="social-commerce"] .sc-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="social-commerce"] .sc-rail::-webkit-scrollbar{display:none}
[data-tpl="social-commerce"] .sc-scroll{scrollbar-width:thin;scrollbar-color:rgba(255,0,110,.35) transparent}
[data-tpl="social-commerce"] .sc-scroll::-webkit-scrollbar{width:6px}
[data-tpl="social-commerce"] .sc-scroll::-webkit-scrollbar-thumb{background:rgba(255,0,110,.3);border-radius:99px}
[data-tpl="social-commerce"] .sc-scroll::-webkit-scrollbar-track{background:transparent}
/* marquee ticker */
[data-tpl="social-commerce"] .sc-marquee{display:flex;width:max-content;animation:sc-marquee var(--sc-mq,22s) linear infinite;will-change:transform}
@keyframes sc-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
/* live pulse + blink */
[data-tpl="social-commerce"] .sc-live{position:relative}
[data-tpl="social-commerce"] .sc-live::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 0 0 rgba(255,0,110,.6);animation:sc-live 2.4s ease-out infinite}
@keyframes sc-live{0%{box-shadow:0 0 0 0 rgba(255,0,110,.6)}70%{box-shadow:0 0 0 9px rgba(255,0,110,0)}100%{box-shadow:0 0 0 0 rgba(255,0,110,0)}}
[data-tpl="social-commerce"] .sc-blink{animation:sc-blink 2.2s ease-in-out infinite}
@keyframes sc-blink{0%,100%{opacity:1}50%{opacity:.3}}
/* faq */
[data-tpl="social-commerce"] .sc-faq[open] .sc-faq-ico{transform:rotate(180deg);color:var(--sc-magenta)}
[data-tpl="social-commerce"] .sc-faq-ico{transition:transform .35s,color .35s}
[data-tpl="social-commerce"] :is(button,a,input,summary,[tabindex]):focus-visible{outline:2px solid rgba(255,138,0,.8);outline-offset:2px;border-radius:.5rem}
@media (prefers-reduced-motion:reduce){
  [data-tpl="social-commerce"] .sc-bounce,[data-tpl="social-commerce"] .sc-live::after,
  [data-tpl="social-commerce"] .sc-blink,[data-tpl="social-commerce"] .sc-marquee,
  [data-tpl="social-commerce"] .sc-scan::after{animation:none!important}
  [data-tpl="social-commerce"] .sc-card,[data-tpl="social-commerce"] .sc-cta,
  [data-tpl="social-commerce"] .sc-ring,[data-tpl="social-commerce"] .sc-tag{transition:none!important}
}

/* ═══ v26fix · LIGHT-MODE SKIN — html:not(.dark) only · dark design untouched ═══ */
html:not(.dark) [data-tpl="social-commerce"]{
  --sc-dark:#F7F7F9;--sc-panel:#FFFFFF;--sc-magenta:#FF006E;--sc-orange:#FF8A00;--sc-cyan:#22D3EE;
  --sc-glass:rgba(255,255,255,0.72);--sc-brd:rgba(25,25,34,0.12);--sc-brd-soft:rgba(25,25,34,0.09);
}
/* ═══ v27b-T5 · ROOT FLIP FIX — the [data-tpl] root element itself carries
   bg-[#101014] + text-white; the descendant rules below can never match the
   root (it is not its own descendant), so light mode kept the whole page
   dark with inherited white text. Compound (no-space) selectors fix it. ═══ */
html:not(.dark) [data-tpl="social-commerce"].bg-\\[\\#101014\\]{ background-color:#F7F7F9; }
html:not(.dark) [data-tpl="social-commerce"].text-white{ color:#191922; }
/* raw-hex surfaces + accents */
html:not(.dark) [data-tpl="social-commerce"] .bg-\\[\\#101014\\]{ background-color:#F7F7F9; }
html:not(.dark) [data-tpl="social-commerce"] .bg-\\[\\#15151B\\]{ background-color:#F1F2F6; }
html:not(.dark) [data-tpl="social-commerce"] .bg-\\[\\#FF006E\\]\\/10{ background-color:rgba(255,0,110,0.08); }
html:not(.dark) [data-tpl="social-commerce"] .bg-\\[\\#FF8A00\\]\\/80{ background-color:rgba(194,97,0,0.85); }
html:not(.dark) [data-tpl="social-commerce"] .bg-white\\/\\[0\\.03\\]{ background-color:rgba(25,25,34,0.03); }
html:not(.dark) [data-tpl="social-commerce"] .border-\\[\\#FF8A00\\]\\/30{ border-color:rgba(194,97,0,0.35); }
html:not(.dark) [data-tpl="social-commerce"] .border-white\\/10{ border-color:rgba(25,25,34,0.14); }
/* ink */
html:not(.dark) [data-tpl="social-commerce"] .text-white{ color:#191922; }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/90{ color:rgba(25,25,34,0.9); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/85{ color:rgba(25,25,34,0.86); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/80{ color:rgba(25,25,34,0.8); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/75{ color:rgba(25,25,34,0.76); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/70{ color:rgba(25,25,34,0.7); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/65{ color:rgba(25,25,34,0.66); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/60{ color:rgba(25,25,34,0.6); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/55{ color:rgba(25,25,34,0.56); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/50{ color:rgba(25,25,34,0.5); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/45{ color:rgba(25,25,34,0.46); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/40{ color:rgba(25,25,34,0.4); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/30{ color:rgba(25,25,34,0.3); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/25{ color:rgba(25,25,34,0.25); }
html:not(.dark) [data-tpl="social-commerce"] .text-white\\/20{ color:rgba(25,25,34,0.2); }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FF2E7E\\]{ color:#D61A5E; }
html:not(.dark) [data-tpl="social-commerce"] .fill-\\[\\#FF2E7E\\]{ fill:#D61A5E; }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FF8A00\\]{ color:#C26100; }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FF8A00\\]\\/40{ color:rgba(194,97,0,0.45); }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FFB4D2\\]{ color:#C2186E; }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FFB4D2\\]\\/60{ color:rgba(140,20,75,0.65); }
html:not(.dark) [data-tpl="social-commerce"] .text-\\[\\#FFD9E8\\]{ color:#A4135C; }
html:not(.dark) [data-tpl="social-commerce"] .text-emerald-300{ color:#047857; }
/* hovers */
html:not(.dark) [data-tpl="social-commerce"] .hover\\:text-white:hover{ color:#191922; }
html:not(.dark) [data-tpl="social-commerce"] .hover\\:text-white\\/70:hover{ color:rgba(25,25,34,0.7); }
html:not(.dark) [data-tpl="social-commerce"] .hover\\:text-white\\/80:hover{ color:rgba(25,25,34,0.8); }
html:not(.dark) [data-tpl="social-commerce"] .hover\\:text-\\[\\#FFB4D2\\]:hover{ color:#C2186E; }
/* gradient-text stops (FeedHeader) deepened; CTA/ring gradients stay vivid */
html:not(.dark) [data-tpl="social-commerce"] .via-\\[\\#FF8A00\\]{ --tw-gradient-via:#D96A00; }
html:not(.dark) [data-tpl="social-commerce"] .to-\\[\\#FFD600\\]{ --tw-gradient-to:#C79100; }
/* scoped helpers -> light */
html:not(.dark) [data-tpl="social-commerce"] .sc-glass{
  box-shadow:0 18px 55px -25px rgba(25,25,34,0.25), inset 0 1px 0 rgba(255,255,255,0.85);
}
html:not(.dark) [data-tpl="social-commerce"] .sc-glass-soft{ background:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="social-commerce"] .sc-liked{ color:#D61A5E; fill:#D61A5E; filter:drop-shadow(0 0 8px rgba(214,26,94,0.5)); }
html:not(.dark) [data-tpl="social-commerce"] .sc-saved{ color:#E6A800; fill:#E6A800; filter:drop-shadow(0 0 8px rgba(230,168,0,0.5)); }
html:not(.dark) [data-tpl="social-commerce"] .sc-tag{
  border-color:rgba(194,97,0,0.4); background:rgba(255,0,110,0.07); color:#C2186E;
}
html:not(.dark) [data-tpl="social-commerce"] .sc-tag:hover{ border-color:rgba(194,97,0,0.7); box-shadow:0 0 16px -4px rgba(214,26,94,0.45); color:#A4135C; }
html:not(.dark) [data-tpl="social-commerce"] .sc-btn-ghost{
  background:rgba(34,211,238,0.08); border-color:rgba(8,145,178,0.45); color:#0E7490;
  box-shadow:inset 0 0 20px rgba(8,145,178,0.08);
}
html:not(.dark) [data-tpl="social-commerce"] .sc-btn-ghost:hover{
  border-color:rgba(8,145,178,0.8); box-shadow:0 0 24px -6px rgba(8,145,178,0.5), inset 0 0 24px rgba(8,145,178,0.12);
}
html:not(.dark) [data-tpl="social-commerce"] .sc-card:hover{
  border-color:rgba(214,26,94,0.45);
  box-shadow:0 22px 58px -26px rgba(25,25,34,0.3), 0 0 30px -12px rgba(255,0,110,0.35);
}
html:not(.dark) [data-tpl="social-commerce"] .sc-scan{
  background:linear-gradient(to left,transparent,rgba(214,26,94,0.55),rgba(180,125,0,0.8),rgba(194,97,0,0.55),transparent);
}
/* dark-surface restores — image tiles / hero / sponsored posts / image chips keep dark */
html:not(.dark) [data-tpl="social-commerce"] .sc-ring .text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] .sc-ring .text-white\\/85{ color:rgba(255,255,255,0.85); }
html:not(.dark) [data-tpl="social-commerce"] .sc-ring .text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست پین‌شده"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست پین‌شده"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست پین‌شده"] .text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست‌های اسپانسری"] .text-\\[\\#FF8A00\\]{ color:#FF8A00; }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست‌های اسپانسری"] .text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست‌های اسپانسری"] .text-white\\/65{ color:rgba(255,255,255,0.65); }
html:not(.dark) [data-tpl="social-commerce"] section[aria-label="پست‌های اسپانسری"] .text-white\\/85{ color:rgba(255,255,255,0.85); }
html:not(.dark) [data-tpl="social-commerce"] .bg-black\\/45.text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] .bg-black\\/60 .text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] .bg-black\\/60 .text-white\\/60{ color:rgba(255,255,255,0.6); }
html:not(.dark) [data-tpl="social-commerce"] .bg-black\\/55.text-\\[\\#FFB4D2\\]{ color:#FFB4D2; }
html:not(.dark) [data-tpl="social-commerce"] .bg-black\\/70.text-white\\/75{ color:rgba(255,255,255,0.75); }
/* gradient pills (magenta/orange) keep white text */
html:not(.dark) [data-tpl="social-commerce"] .from-\\[\\#FF006E\\].text-white{ color:#fff; }
/* immersive story viewer overlay keeps its dark design */
html:not(.dark) [data-tpl="social-commerce"] .z-\\[100\\].fixed .text-white{ color:#fff; }
html:not(.dark) [data-tpl="social-commerce"] .z-\\[100\\].fixed .text-white\\/50{ color:rgba(255,255,255,0.5); }
`;

/* merge product lists into one deduped feed (newest first, then the rest) */
function buildFeed(data: HomeData): TemplateProduct[] {
  const seen = new Set<string>();
  const feed: TemplateProduct[] = [];
  for (const p of [...data.newest, ...data.featured, ...data.discounted, ...data.bestsellers]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      feed.push(p);
    }
  }
  return feed.slice(0, 16);
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ──────── */
function useSocialAdd() {
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

/* ── vertical story tile — gradient ring + scrub bars ─────────────── */
function StoryTile({ story, index, onOpen }: { story: StoryItem; index: number; onOpen: (i: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="sc-ring group block w-[148px] shrink-0 snap-start text-start sm:w-[164px]"
      aria-label={`استوری ${story.title}`}
    >
      <div className="sc-ring-inner relative block aspect-[9/16]">
        <Image src={story.image} alt={story.title} fill sizes="164px" className="object-cover" loading="lazy" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />

        {/* gradient scrub bars — like a live story */}
        <span aria-hidden className="sc-scrub absolute inset-x-0 top-0">
          <i className={index === 0 ? "on" : ""} />
          <i className={index === 1 ? "half" : ""} />
          <i />
        </span>

        {/* play affordance for video stories */}
        {story.videoUrl && (
          <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur transition-transform duration-300 group-hover:scale-110">
            <Play className="h-5 w-5 fill-white" aria-hidden />
          </span>
        )}

        {/* badge + title + duration */}
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
          {story.badge && (
            <span className="sc-blink w-fit rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF8A00] px-2 py-0.5 text-[8.5px] font-black text-white">
              {story.badge}
            </span>
          )}
          <span className="line-clamp-2 text-[11px] font-black leading-4 text-white">{story.title}</span>
          {story.product && (
            <span className="w-fit rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white/85 backdrop-blur tabular-nums">
              {formatPrice(story.product.discountPrice ?? story.product.price)}
            </span>
          )}
          <span className="mt-0.5 flex items-center gap-1 text-[8.5px] font-bold text-white/60 tabular-nums">
            <Play className="h-2.5 w-2.5 fill-white/60" aria-hidden />
            {toFaDigits(String(Math.round((story.duration ?? 6000) / 1000)))} ثانیه
          </span>
        </span>
      </div>
    </button>
  );
}

/* ── feed post — image + price chip + actions ══════════════════════ */
function PostCard({ product, variant }: { product: TemplateProduct; variant: number }) {
  const { addToCart, added } = useSocialAdd();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pop, setPop] = useState(0);

  const ratio = variant % 3 === 0 ? "3/4.6" : variant % 3 === 1 ? "3/4" : "3/4.2";
  const hashtags = [`#${product.category.name.replace(/\s+/g, "_")}`, `#${product.brand.name.replace(/\s+/g, "_")}`];

  const toggleLike = () => {
    setLiked((v) => !v);
    setPop((n) => n + 1);
  };
  const toggleSave = () => {
    setSaved((v) => !v);
    setPop((n) => n + 1);
  };

  return (
    <article className={cn("sc-card sc-glass mb-3 break-inside-avoid overflow-hidden rounded-[1.5rem]", !product.inStock && "grayscale-[0.4]")}>
      {/* header row — avatar ring + brand + share */}
      <div className="flex items-center gap-2.5 p-3">
        <span className="sc-ring-sm shrink-0">
          <span className="sc-ring-sm-inner grid h-9 w-9 place-items-center text-[11px] font-black text-[#FFB4D2]">
            {product.brand.name.charAt(0)}
          </span>
        </span>
        <Link href={`/products?brand=${product.brand.slug}`} className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[12px] font-black text-white/90">
            {product.brand.name}
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#FF8A00]" aria-hidden />
          </p>
          <p className="truncate text-[9.5px] text-white/40">{product.category.name}</p>
        </Link>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "حذف از ذخیره‌شده‌ها" : "ذخیره پست"}
          aria-pressed={saved}
          className="grid h-9 w-9 place-items-center rounded-full text-white/40 transition-colors hover:text-white/70"
        >
          <Bookmark key={`sv-${pop}`} className={cn("h-4.5 w-4.5 h-[18px] w-[18px] transition-all", saved ? "sc-bounce sc-saved" : "")} aria-hidden />
        </button>
      </div>

      {/* tall image with neon hashtag chips + price chip */}
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block bg-[#15151B]">
        <span className="relative block w-full" style={{ aspectRatio: ratio }}>
          {product.mainImage ? (
            <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 24vw" className="object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full place-items-center text-white/20"><Package className="h-12 w-12" aria-hidden /></span>
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
          {/* hashtags over the artwork */}
          <span className="absolute start-2.5 top-2.5 flex flex-wrap gap-1.5">
            {hashtags.map((t) => (
              <span key={t} className="sc-tag" aria-hidden>#{t.slice(1)}</span>
            ))}
          </span>
          {/* discount flash */}
          {product.discountPercent > 0 && (
            <span className="absolute end-2.5 top-2.5 rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF4D2E] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_0_18px_rgba(255,0,110,.6)]">
              {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
            </span>
          )}
          {!product.inStock && (
            <span className="absolute end-2.5 bottom-12 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[10px] font-bold text-white/75 backdrop-blur">ناموجود</span>
          )}
          {/* price chip */}
          <span className="absolute start-2.5 bottom-2.5 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/60 px-3 py-1.5 backdrop-blur">
            <span className="text-[13px] font-black text-white tabular-nums">{formatPrice(product.effectivePrice)}</span>
            <span className="text-[8.5px] text-white/60">تومان</span>
          </span>
          {product.soldCount > 0 && (
            <span className="absolute end-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-bold text-[#FFB4D2] backdrop-blur tabular-nums">
              <Flame className="h-3 w-3" aria-hidden />
              {toFaDigits(String(product.soldCount))} خرید
            </span>
          )}
        </span>
      </Link>

      {/* footer row — like + quick add */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-label={liked ? "برداشتن پسند" : "پسندیدن پست"}
          aria-pressed={liked}
          className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors", liked ? "text-[#FF2E7E]" : "text-white/40 hover:text-white/80")}
        >
          <Heart key={`lk-${pop}`} className={cn("h-5 w-5 transition-all", liked ? "sc-bounce sc-liked" : "")} aria-hidden />
        </button>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12px] font-bold leading-5 text-white/85">{product.name}</span>
          {product.rating > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-white/40 tabular-nums">
              <Eye className="h-3 w-3" aria-hidden />
              {product.rating.toLocaleString("fa-IR")} از ۵
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11px] font-black transition-all active:scale-95",
            product.inStock ? (added ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300" : "sc-cta") : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
          )}
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <CirclePlus className="h-4 w-4" aria-hidden />}
          {product.inStock ? (added ? "افزوده شد" : "افزودن") : "ناموجود"}
        </button>
      </div>
    </article>
  );
}

/* ── section header ════════════════════════════════════════════════ */
function FeedHeader({
  icon: Icon, title, subtitle, href, live,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string; live?: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#FF8A00]/30 bg-[#FF006E]/10 text-[#FF8A00]", live && "sc-live")}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="truncate bg-gradient-to-l from-[#FF006E] via-[#FF8A00] to-[#FFD600] bg-clip-text text-lg font-black text-transparent md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="sc-glass-soft flex h-11 shrink-0 items-center gap-1 rounded-xl px-3.5 text-xs font-bold text-[#FFB4D2] transition-colors hover:text-white">
          مشاهده همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── TEMPLATE ══════════════════════════════════════════════════════ */
export function SocialCommerceTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  /* v25: tap a story tile → immersive viewer (progress bar + prev/next) */
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const feed = buildFeed(data);
  const hot = [...data.bestsellers].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4);
  const totalSold = data.bestsellers.reduce((n, p) => n + p.soldCount, 0);
  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);
  const hasAnyProduct = feed.length > 0 || data.exclusive.length > 0;

  /* v20 ticker messages → announcement fallback; v22 tickerSpeed */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink }]
        : [];
  const mqDur = store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 22;

  const chrome = TEMPLATE_CHROME["social-commerce"];

  return (
    <div data-template-chrome="1" data-tpl="social-commerce" className="isolate w-full bg-[#101014] text-white">
      <style>{SOCIAL_NEON_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* top blend from the light theme chrome into the dark feed */}
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-background via-background/70 to-transparent" />

      {/* ═══ TICKER — story broadcast strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیه فروشگاه" className="mx-auto w-full max-w-[1440px] px-4 pb-3 pt-1">
          <div className="sc-glass-soft flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2">
            <span className="sc-live flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF8A00] px-2.5 py-1 text-[10px] font-black text-white">
              <span className="sc-blink h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              زنده
            </span>
            <span className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
              <span className="sc-marquee" style={{ "--sc-mq": `${mqDur}s` } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex shrink-0 items-center gap-10 pe-10" aria-hidden={dup === 1}>
                    {tickerMsgs.map((m, i) => (
                      <Link key={`${dup}-${i}`} href={m.link ?? "/products"} tabIndex={dup === 1 ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[11.5px] font-bold text-white/70 transition-colors hover:text-[#FFB4D2]">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-[#FF8A00]/80" />
                        {m.text}
                      </Link>
                    ))}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </section>
      )}

      {/* ═══ HERO — pinned post (first real slide) ═══ */}
      {heroSlide && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-2" aria-label="پست پین‌شده">
          <div className="grid gap-4 lg:grid-cols-3">
            <Link
              href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
              className="sc-card sc-glass group relative block h-[300px] overflow-hidden rounded-[2rem] sm:h-[420px] lg:col-span-2 lg:h-[460px]"
              aria-label={heroSlide.title}
            >
              <SlideArt slide={heroSlide} sizes="(max-width: 1024px) 96vw, 64vw" priority className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#101014]/95 via-[#101014]/25 to-transparent" />
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,#FF006E,#FFD600,#FF8A00,transparent)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF8A00] px-3 py-1 text-[10px] font-black text-white">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  پست پین‌شده
                </p>
                <h2 className="text-xl font-black text-white sm:text-2xl md:text-3xl">{heroSlide.title}</h2>
                {heroSlide.subtitle && <p className="mt-1.5 line-clamp-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">{heroSlide.subtitle}</p>}
                {heroSlide.ctaText && (
                  <span className="sc-cta mt-5 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
                    {heroSlide.ctaText}
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </div>
            </Link>
            {extraSlides.map((s) => (
              <Link
                key={s.id}
                href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                className="sc-card sc-glass group relative hidden h-[460px] overflow-hidden rounded-[2rem] lg:block"
                aria-label={s.title}
              >
                <Image src={s.image} alt={s.title} fill sizes="32vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#101014]/92 via-[#101014]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="sc-tag mb-2 inline-flex">#{s.title.slice(0, 14).replace(/\s+/g, "_")}</span>
                  <h3 className="text-base font-black text-white">{s.title}</h3>
                  {s.subtitle && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/60">{s.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ STORIES — vertical tiles with gradient scrub bars ═══ */}
      {stories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-labelledby="sc-stories">
          <FeedHeader icon={Play} title="استوری‌های زنده" subtitle="برای تماشا لمس کنید" href="/products" live />
          <div className="sc-rail flex snap-x gap-4 overflow-x-auto pb-2">
            {stories.slice(0, 12).map((s, i) => (
              <StoryTile key={s.id} story={s} index={i} onOpen={(idx) => setStoryIdx(idx)} />
            ))}
          </div>
          {storyIdx !== null && (
            <StoryViewer stories={stories} startIndex={storyIdx} onClose={() => setStoryIdx(null)} />
          )}
        </section>
      )}

      {/* ═══ CATEGORIES — neon hashtag chips ═══ */}
      {data.categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-label="دسته‌بندی‌ها به سبک هشتگ">
          <FeedHeader icon={Hash} title="هشتگ‌های داغ" subtitle="دنبال کنید، بخرید" />
          <div className="sc-scroll flex flex-wrap gap-2.5">
            {data.categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="sc-tag flex items-center gap-2 !rounded-full !py-1.5 !pe-4 !ps-1.5 !text-[11px]"
              >
                <span className="sc-ring-sm">
                  <span className="sc-ring-sm-inner relative block h-8 w-8 overflow-hidden">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="32px" className="object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-[11px] font-black text-[#FFB4D2]">{c.name.charAt(0)}</span>
                    )}
                  </span>
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[11.5px] font-black text-[#FFD9E8]">#{c.name.replace(/\s+/g, "_")}</span>
                  <span className="text-[9px] text-[#FFB4D2]/60 tabular-nums">{toFaDigits(String(c.productCount))} پست</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SOCIAL PROOF — داغِ الان ═══ */}
      {hot.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-label="محبوب‌ترین‌های شبکه">
          <FeedHeader icon={TrendingUp} title="داغِ الان" subtitle="ترند واقعی کاربران" live />
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {hot.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.slug}`} className="sc-card sc-glass-soft flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl p-2.5">
                  <span className="sc-ring-sm shrink-0">
                    <span className="sc-ring-sm-inner relative block h-12 w-12 overflow-hidden">
                      {p.mainImage ? <Image src={p.mainImage} alt={p.name} fill sizes="48px" className="object-contain p-1" loading="lazy" /> : <Package className="m-auto h-5 w-5 text-white/30" aria-hidden />}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-black text-white/90">{p.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/45 tabular-nums">
                      <span className="inline-flex items-center gap-0.5 font-bold text-[#FF8A00]">
                        <Flame className="h-3 w-3" aria-hidden />
                        {toFaDigits(String(p.soldCount))} خرید
                      </span>
                      {p.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Heart className="h-3 w-3 fill-[#FF2E7E] text-[#FF2E7E]" aria-hidden />
                          {p.rating.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-black text-white/70 tabular-nums">{formatPrice(p.effectivePrice)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {totalSold > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40 tabular-nums">
              <BadgeCheck className="h-3.5 w-3.5 text-[#FF8A00]" aria-hidden />
              مجموع {toFaDigits(String(totalSold))} خرید موفق ثبت‌شده در این شبکه
            </p>
          )}
        </section>
      )}

      {/* ═══ VERTICAL MASONRY FEED ═══ */}
      {feed.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-labelledby="sc-feed">
          <FeedHeader icon={Sparkles} title="فید محصولات" subtitle="پست‌های خریدنی، بی‌وقفه" href={RAIL_URLS.newest} />
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
            {feed.map((p, i) => <PostCard key={p.id} product={p} variant={i} />)}
          </div>
        </section>
      )}

      {/* ═══ SHOWCASES — sponsored posts ═══ */}
      {data.showcases.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-label="پست‌های اسپانسری">
          <FeedHeader icon={Share2} title="پست‌های اسپانسری" subtitle="همکاری با برندها" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.showcases.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                className="sc-card sc-glass group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[1.75rem] md:min-h-[260px]"
              >
                <Image src={s.image} alt={s.title} fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#101014]/95 via-[#101014]/35 to-transparent" />
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,#FF006E,#FFD600,#FF8A00,transparent)]" />
                <div className="relative p-5 md:p-6">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black text-white/85 backdrop-blur">
                    <Sparkles className="h-3 w-3 text-[#FFD600]" aria-hidden />
                    تبلیغ ویژه
                  </span>
                  <h3 className="text-lg font-black text-white">{s.title}</h3>
                  {s.subtitle && <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-6 text-white/65">{s.subtitle}</p>}
                  <span className="mt-3 inline-flex items-center gap-1 bg-gradient-to-l from-[#FF006E] to-[#FF8A00] bg-clip-text text-xs font-black text-transparent">
                    مشاهده پست
                    <ChevronLeft className="h-4 w-4 text-[#FF8A00] transition-transform group-hover:-translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ EXCLUSIVE — creator collab cards ═══ */}
      {data.exclusive.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-labelledby="sc-exclusive">
          <FeedHeader icon={BadgeCheck} title="انحصاری‌های فروشگاه" subtitle={`فقط در ${store.storeName}`} />
          <div className="grid gap-4 md:grid-cols-2">
            {data.exclusive.slice(0, 2).map((p) => (
              <article key={p.id} className="sc-card sc-glass group relative flex flex-col overflow-hidden rounded-[1.75rem] sm:flex-row">
                <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square w-full shrink-0 bg-[#15151B] sm:w-[46%]">
                  {p.mainImage ? (
                    <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, 28vw" className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                  ) : (
                    <span className="grid h-full place-items-center text-white/25"><Package className="h-14 w-14" aria-hidden /></span>
                  )}
                  <span className="absolute start-4 top-4 rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF8A00] px-3 py-1 text-[10px] font-black text-white shadow-[0_0_18px_rgba(255,0,110,.5)]">انحصاری</span>
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-6">
                  <p className="flex items-center gap-1 text-[10.5px] text-white/45">
                    <BadgeCheck className="h-3 w-3 text-[#FF8A00]" aria-hidden />
                    {p.brand.name}
                  </p>
                  <Link href={`/products/${p.slug}`} className="mt-1.5 text-lg font-black leading-8 text-white line-clamp-2 transition-colors hover:text-[#FFB4D2]">
                    {p.name}
                  </Link>
                  <p className="mt-2 text-xl font-black text-white tabular-nums">
                    {formatPrice(p.effectivePrice)}
                    <span className="ms-1 text-[11px] font-normal text-white/40">تومان</span>
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {p.rating > 0 && (
                      <li className="sc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-[#FFB4D2]">
                        <Heart className="h-3 w-3 fill-[#FF2E7E] text-[#FF2E7E]" aria-hidden />
                        {p.rating.toLocaleString("fa-IR")} از ۵
                      </li>
                    )}
                    {p.soldCount > 0 && (
                      <li className="sc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white/60 tabular-nums">
                        {toFaDigits(String(p.soldCount))} خرید
                      </li>
                    )}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ═══ FAQ — community Q&A ═══ */}
      {data.faq.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-labelledby="sc-faq">
          <FeedHeader icon={MessageCircle} title="پرسش‌های جامعه" subtitle="کاربران پرسیدند، ما جواب دادیم" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.faq.map((f, i) => (
              <details key={i} className="sc-faq sc-glass-soft group rounded-2xl px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white/85 [&::-webkit-details-marker]:hidden">
                  {f.h}
                  <ChevronLeft className="sc-faq-ico h-4 w-4 shrink-0 text-white/40" aria-hidden />
                </summary>
                <p className="mt-3 border-t border-white/10 pt-3 text-[12px] leading-7 text-white/55">{f.p}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ═══ BRANDS — follow chips marquee ═══ */}
      {data.brands.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-label="برندهای دنبال‌شده">
          <FeedHeader icon={Share2} title="برندهای دنبال‌شده" subtitle="در فیدتان بمانند" />
          <div className="sc-glass rounded-[2rem] p-4 sm:p-5">
            <div className="overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_5%,black_95%,transparent)]">
              <div className="sc-marquee" style={{ "--sc-mq": "28s" } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex shrink-0 gap-3 pe-3" aria-hidden={dup === 1}>
                    {data.brands.map((b) => (
                      <Link
                        key={`${dup}-${b.id}`}
                        href={`/products?brand=${b.slug}`}
                        tabIndex={dup === 1 ? -1 : undefined}
                        className="sc-card sc-glass-soft flex h-12 shrink-0 items-center gap-2 rounded-full pe-5 ps-1.5"
                      >
                        <span className="sc-ring-sm">
                          <span className="sc-ring-sm-inner relative block h-9 w-9 overflow-hidden">
                            {b.logo || b.image ? (
                              <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="36px" className="object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[11px] font-black text-[#FFB4D2]">{b.name.charAt(0)}</span>
                            )}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs font-black text-white/85">{b.name}</span>
                        <span className="rounded-full bg-gradient-to-l from-[#FF006E] to-[#FF8A00] px-2.5 py-0.5 text-[9px] font-black text-white">دنبال</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FOLLOW CTA BAR ═══ */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-12" aria-label="دنبال کردن فروشگاه">
        <div className="sc-card sc-glass relative flex flex-col items-start gap-4 overflow-hidden rounded-[2rem] p-6 sm:flex-row sm:items-center md:p-8">
          <span aria-hidden className="pointer-events-none absolute -start-10 -top-16 h-44 w-44 rounded-full bg-[#FF006E]/20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -end-12 -bottom-20 h-44 w-44 rounded-full bg-[#FF8A00]/15 blur-3xl" />
          <span className="sc-ring shrink-0">
            <span className="sc-ring-sm-inner grid h-16 w-16 place-items-center rounded-[calc(1.5rem-2px)]">
              <Heart className="h-7 w-7 fill-[#FF2E7E] text-[#FF2E7E]" aria-hidden />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white">{store.storeName} را دنبال کنید</h3>
            <p className="mt-1 text-xs leading-6 text-white/50">
              {store.announcementActive && store.announcement
                ? store.announcement
                : `استوری‌های جدید، تخفیف‌ها و ${toFaDigits(String(counts.products))} پست خریدنی را از دست ندهید.`}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 tabular-nums">
              <span className="sc-tag">{toFaDigits(String(counts.stories))} استوری</span>
              <span className="sc-tag">{toFaDigits(String(counts.products))} محصول</span>
              <span className="sc-tag">{toFaDigits(String(counts.brands))} برند</span>
            </p>
          </div>
          <Link
            href={store.announcementActive && store.announcementLink ? store.announcementLink : "/contact"}
            className="sc-cta flex h-12 shrink-0 items-center gap-2 rounded-xl px-7 text-sm font-black"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            عضویت در باشگاه
          </Link>
        </div>
      </section>

      {/* ═══ EMPTY STATE ═══ */}
      {!hasAnyProduct && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12">
          <div className="sc-glass rounded-[2rem] border-dashed p-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-[#FF8A00]/40" aria-hidden />
            <h2 className="text-lg font-black text-white/85">فید در حال ساخت است</h2>
            <p className="mt-2 text-sm leading-7 text-white/45">به‌زودی اولین پست‌ها منتشر می‌شوند…</p>
            <Link href="/products" className="sc-cta mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
              مشاهده همه محصولات
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CLOSING — neon divider + bottom blend ═══ */}
      <div aria-hidden className="sc-scan mx-auto mt-16 max-w-3xl" />
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-transparent via-background/70 to-background" />

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

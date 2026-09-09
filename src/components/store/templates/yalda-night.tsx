"use client";

/**
 * TEMPLATE · yalda-night — «Yalda Cyber Night» (v25 full rewrite)
 * ----------------------------------------------------------------
 * Midnight-blue #0D1226 starfield with twinkling CSS stars, glass panels
 * edged with pomegranate-red #E11D48 neon glows and gold #FBBF24 accents.
 * Signature = a HOLOGRAPHIC POMEGRANATE ORB (pure CSS radial sphere with
 * pulsing glow + rotating ring) floating in the hero beside a glowing
 * Hafez verse; «شب بلند» countdown runs on per-product discountEndsAt
 * (yalda registers no timer feature → no store.timerEndsAt override).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Moon, Star, Package, Sparkles, Check, ChevronLeft, Flame, TrendingUp,
  HelpCircle, BadgeCheck, Quote, Timer, Clock, Megaphone, ArrowLeft,
  ShieldCheck, Gem, Citrus,
} from "lucide-react";
import type { HomeData, TemplateProduct } from "@/lib/templates/types";
import { RAIL_URLS } from "@/lib/templates/slide-targets";
import { useCart } from "@/hooks/use-store";
import { formatPrice, toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { StoriesRow, type StoryItem } from "../stories-row";
import { SlideArt } from "./slide-image";
import { TemplateHeader } from "./chrome/header";
import { TemplateFooter } from "./chrome/footer";
import { TEMPLATE_CHROME } from "./chrome/config";

/* ONE scoped style block — Yalda-Cyber-Night tokens, star field, orb */
const YALDA_CYBER_CSS = `
[data-tpl="yalda-night"]{
  --yc-night:#0D1226;--yc-panel:#121831;--yc-red:#E11D48;--yc-gold:#FBBF24;
  --yc-glass:rgba(255,255,255,.06);--yc-brd:rgba(255,255,255,.18);--yc-brd-soft:rgba(255,255,255,.11);
}
[data-tpl="yalda-night"] .yc-glass{background:var(--yc-glass);-webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);border:1px solid var(--yc-brd);box-shadow:0 18px 55px -25px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.07)}
[data-tpl="yalda-night"] .yc-glass-soft{background:rgba(255,255,255,.035);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--yc-brd-soft)}
[data-tpl="yalda-night"] .yc-red-glow{color:var(--yc-red);text-shadow:0 0 18px rgba(225,29,72,.65),0 0 44px rgba(225,29,72,.3)}
[data-tpl="yalda-night"] .yc-gold-glow{color:var(--yc-gold);text-shadow:0 0 16px rgba(251,191,36,.6),0 0 40px rgba(251,191,36,.28)}
[data-tpl="yalda-night"] .yc-grad-text{background:linear-gradient(100deg,#FDE7EF 10%,var(--yc-red) 48%,var(--yc-gold) 92%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* v28 · خوانایی هیرو — ستونِ متن همیشه بالای همهٔ لایه‌های تزئینی */
[data-tpl="yalda-night"] .yc-hero-copy{position:relative;z-index:10}
[data-tpl="yalda-night"] .yc-hero-copy .yc-glass{background:rgba(9,13,26,.55)}
[data-tpl="yalda-night"] .yc-hero-copy .yc-glass-soft{background:rgba(9,13,26,.46);border-color:rgba(255,255,255,.16)}
[data-tpl="yalda-night"] .yc-hero-copy .yc-verse{text-shadow:0 1px 3px rgba(4,6,14,.92),0 0 20px rgba(251,191,36,.5),0 0 8px rgba(225,29,72,.35)}
[data-tpl="yalda-night"] h1.yc-grad-text{background:linear-gradient(100deg,#FFF1F5 6%,#FF4D6D 48%,#FFC247 94%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 16px rgba(5,8,18,.55))}
/* v28 · قاب هنر واقعی — عکس انار/هندوانه با حلقهٔ هولوگرافیک مهارشده در ستون */
[data-tpl="yalda-night"] .yc-art-frame{position:relative;border-radius:2.5rem;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 30px rgba(225,29,72,.42),0 0 72px rgba(225,29,72,.22),0 36px 84px -36px rgba(0,0,0,.9)}
[data-tpl="yalda-night"] .yc-art-frame::before{content:"";position:absolute;inset:-10px;border-radius:calc(2.5rem + 10px);border:1px solid transparent;background:conic-gradient(from 0deg,rgba(251,191,36,0),rgba(251,191,36,.75),rgba(225,29,72,.4),rgba(251,191,36,0)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:yc-ring-spin 11s linear infinite}
[data-tpl="yalda-night"] .yc-fruit-card{position:absolute;bottom:-8px;inset-inline-end:-16px;width:112px;border-radius:1.25rem;border:1.5px solid rgba(251,191,36,.6);box-shadow:0 0 24px rgba(251,191,36,.4),0 20px 44px -20px rgba(0,0,0,.85)}
@media (min-width:768px){
  [data-tpl="yalda-night"] .yc-art-col{width:360px}
  [data-tpl="yalda-night"] .yc-fruit-card{width:132px;inset-inline-end:-24px}
}
[data-tpl="yalda-night"] .yc-moon-pos{top:-1.75rem;inset-inline-end:1.5rem}
[data-tpl="yalda-night"] .yc-sofreh{position:relative;display:block;margin-top:1rem;height:7rem;overflow:hidden;border-radius:2rem}
[data-tpl="yalda-night"] .yc-sofreh-cap{position:absolute;inset-block:0;inset-inline-start:0;max-width:78%}
@media (min-width:640px){[data-tpl="yalda-night"] .yc-sofreh{height:9rem}}
/* starfield — twinkling dots (hydration-safe: deterministic positions) */
[data-tpl="yalda-night"] .yc-star{position:absolute;border-radius:9999px;background:#FFF;box-shadow:0 0 6px rgba(251,241,199,.9),0 0 12px rgba(255,255,255,.45);opacity:var(--yc-o,.85);animation:yc-twinkle var(--yc-dur,3s) ease-in-out var(--yc-delay,0s) infinite;pointer-events:none}
@keyframes yc-twinkle{0%,100%{opacity:var(--yc-o,.85);transform:scale(1)}50%{opacity:.15;transform:scale(.66)}}
/* holographic pomegranate orb — pure CSS sphere */
[data-tpl="yalda-night"] .yc-orb{
  position:relative;border-radius:9999px;
  background:
    radial-gradient(circle at 30% 26%, rgba(255,235,240,.95) 0%, rgba(255,255,255,.28) 9%, rgba(255,140,165,.4) 18%, transparent 30%),
    radial-gradient(circle at 68% 70%, rgba(88,3,24,.85) 0%, transparent 52%),
    radial-gradient(circle at 44% 40%, #E11D48 0%, #A50F2F 46%, #5B0718 78%, #3A0410 100%);
  box-shadow:
    0 0 34px rgba(225,29,72,.6),0 0 80px rgba(225,29,72,.35),
    inset -14px -18px 40px rgba(20,0,6,.75),inset 10px 12px 26px rgba(255,255,255,.16);
  animation:yc-orb-float 8s ease-in-out infinite;
}
[data-tpl="yalda-night"] .yc-orb::before{
  content:"";position:absolute;inset:-14%;border-radius:9999px;
  border:1px solid transparent;
  background:conic-gradient(from 0deg,rgba(251,191,36,.0),rgba(251,191,36,.75),rgba(225,29,72,.35),rgba(251,191,36,0)) border-box;
  -webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  animation:yc-ring-spin 11s linear infinite;
}
[data-tpl="yalda-night"] .yc-orb::after{
  content:"";position:absolute;left:16%;top:14%;width:22%;height:12%;border-radius:9999px;
  background:radial-gradient(ellipse,rgba(255,255,255,.9),transparent 70%);
  transform:rotate(-24deg);filter:blur(1px);
}
@keyframes yc-orb-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-14px) rotate(2deg)}}
@keyframes yc-ring-spin{to{transform:rotate(360deg)}}
/* moon halo */
[data-tpl="yalda-night"] .yc-moon{animation:yc-float 9s ease-in-out infinite}
@keyframes yc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
/* poetry glow */
[data-tpl="yalda-night"] .yc-verse{color:#FFE9EE;text-shadow:0 0 22px rgba(251,191,36,.55),0 0 8px rgba(225,29,72,.4);animation:yc-breathe 7s ease-in-out infinite}
@keyframes yc-breathe{0%,100%{opacity:.92}50%{opacity:1}}
/* countdown cell */
[data-tpl="yalda-night"] .yc-cell{display:flex;flex-direction:column;align-items:center;min-width:3.25rem;padding:.4rem .35rem;border-radius:.9rem;background:rgba(225,29,72,.1);border:1px solid rgba(251,191,36,.4);box-shadow:inset 0 0 18px rgba(225,29,72,.16),0 0 22px -8px rgba(225,29,72,.5)}
[data-tpl="yalda-night"] .yc-cell b{font-size:.95rem;font-weight:900;line-height:1;color:#FCD9E1;text-shadow:0 0 14px rgba(225,29,72,.85);font-variant-numeric:tabular-nums}
/* neon edge glow on cards */
[data-tpl="yalda-night"] .yc-card{border:1px solid rgba(225,29,72,.28)!important;transition:transform .35s cubic-bezier(.2,.7,.3,1),box-shadow .35s,border-color .35s}
[data-tpl="yalda-night"] .yc-card:hover{transform:translateY(-5px);border-color:rgba(251,191,36,.55)!important;box-shadow:0 24px 60px -26px rgba(0,0,0,.85),0 0 30px -10px rgba(225,29,72,.55),inset 0 1px 0 rgba(255,255,255,.09)}
/* gold CTA */
[data-tpl="yalda-night"] .yc-cta{background:linear-gradient(135deg,#C98A1B 0%,#FBBF24 52%,#FDE68A 100%);color:#2A1204;box-shadow:0 0 26px -4px rgba(251,191,36,.6),0 12px 34px -12px rgba(201,138,27,.7);transition:transform .3s,box-shadow .3s}
[data-tpl="yalda-night"] .yc-cta:hover{transform:translateY(-2px);box-shadow:0 0 36px 0 rgba(251,191,36,.75),0 16px 40px -12px rgba(201,138,27,.75)}
[data-tpl="yalda-night"] .yc-btn-ghost{background:rgba(225,29,72,.1);border:1px solid rgba(251,191,36,.45);color:#FCD9E1;box-shadow:inset 0 0 22px rgba(225,29,72,.14);transition:all .3s}
[data-tpl="yalda-night"] .yc-btn-ghost:hover{border-color:rgba(251,191,36,.9);box-shadow:0 0 26px -6px rgba(251,191,36,.65),inset 0 0 26px rgba(225,29,72,.2)}
/* divider — night horizon */
[data-tpl="yalda-night"] .yc-scan{position:relative;height:1px;background:linear-gradient(to left,transparent,rgba(225,29,72,.55),rgba(251,191,36,.85),rgba(225,29,72,.55),transparent);overflow:visible}
[data-tpl="yalda-night"] .yc-scan::after{content:"";position:absolute;top:-2px;left:0;width:60px;height:5px;background:linear-gradient(to left,transparent,rgba(251,191,36,.8),transparent);filter:blur(3px);animation:yc-scan 6s linear infinite}
@keyframes yc-scan{0%{left:-8%}100%{left:104%}}
/* rails + scrollbars */
[data-tpl="yalda-night"] .yc-rail{scrollbar-width:none;-ms-overflow-style:none}
[data-tpl="yalda-night"] .yc-rail::-webkit-scrollbar{display:none}
[data-tpl="yalda-night"] .yc-scroll{scrollbar-width:thin;scrollbar-color:rgba(251,191,36,.4) transparent}
[data-tpl="yalda-night"] .yc-scroll::-webkit-scrollbar{width:6px}
[data-tpl="yalda-night"] .yc-scroll::-webkit-scrollbar-thumb{background:rgba(251,191,36,.35);border-radius:99px}
[data-tpl="yalda-night"] .yc-scroll::-webkit-scrollbar-track{background:transparent}
/* marquee ticker */
[data-tpl="yalda-night"] .yc-marquee{display:flex;width:max-content;animation:yc-marquee var(--yc-mq,26s) linear infinite;will-change:transform}
@keyframes yc-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
/* lantern pulse */
[data-tpl="yalda-night"] .yc-pulse{animation:yc-pulse 2.8s ease-in-out infinite}
@keyframes yc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.45)}55%{box-shadow:0 0 0 9px rgba(251,191,36,0)}}
[data-tpl="yalda-night"] .yc-blink{animation:yc-blink 2.2s ease-in-out infinite}
@keyframes yc-blink{0%,100%{opacity:1}50%{opacity:.32}}
/* faq */
[data-tpl="yalda-night"] .yc-faq[open] .yc-faq-ico{transform:rotate(180deg);color:var(--yc-gold)}
[data-tpl="yalda-night"] .yc-faq-ico{transition:transform .35s,color .35s}
[data-tpl="yalda-night"] :is(button,a,input,summary,[tabindex]):focus-visible{outline:2px solid rgba(251,191,36,.75);outline-offset:2px;border-radius:.5rem}
@media (prefers-reduced-motion:reduce){
  [data-tpl="yalda-night"] .yc-star,[data-tpl="yalda-night"] .yc-orb,[data-tpl="yalda-night"] .yc-orb::before,[data-tpl="yalda-night"] .yc-art-frame::before,
  [data-tpl="yalda-night"] .yc-moon,[data-tpl="yalda-night"] .yc-verse,[data-tpl="yalda-night"] .yc-marquee,
  [data-tpl="yalda-night"] .yc-pulse,[data-tpl="yalda-night"] .yc-blink,[data-tpl="yalda-night"] .yc-scan::after{animation:none!important}
  [data-tpl="yalda-night"] .yc-card,[data-tpl="yalda-night"] .yc-cta{transition:none!important}
}
/* ══ v26fix · LIGHT SKIN (html:not(.dark)) — dark rules above stay untouched ══
   Cream «سفرهٔ یلدا» canvas #F7F3EA / ink #232B4D; pomegranate → #BE123C,
   gold → #B45309; glass → white translucent + ink hairlines; glows softened. */
html:not(.dark) [data-tpl="yalda-night"]{
  --yc-night:#F7F3EA;--yc-panel:#FFFFFF;--yc-red:#BE123C;--yc-gold:#B45309;
  --yc-glass:rgba(255,255,255,.8);--yc-brd:rgba(35,43,77,.16);--yc-brd-soft:rgba(35,43,77,.1);
  background:#F7F3EA;color:#232B4D;
}
/* helpers — light glass + ink hairlines + softened neon */
html:not(.dark) [data-tpl="yalda-night"] .yc-glass{box-shadow:0 18px 55px -30px rgba(35,43,77,.3),inset 0 1px 0 rgba(255,255,255,.9)}
html:not(.dark) [data-tpl="yalda-night"] .yc-glass-soft{background:rgba(255,255,255,.66)}
html:not(.dark) [data-tpl="yalda-night"] .yc-red-glow{color:#BE123C;text-shadow:0 0 12px rgba(225,29,72,.22)}
html:not(.dark) [data-tpl="yalda-night"] .yc-gold-glow{color:#A16207;text-shadow:0 0 10px rgba(180,83,9,.22)}
html:not(.dark) [data-tpl="yalda-night"] .yc-grad-text{background:linear-gradient(100deg,#5C1F5E 6%,#BE123C 48%,#8A5A0B 98%);-webkit-background-clip:text;background-clip:text;color:transparent}
html:not(.dark) [data-tpl="yalda-night"] .yc-star{background:#EAB308;box-shadow:0 0 6px rgba(234,179,8,.55),0 0 12px rgba(234,179,8,.3)}
html:not(.dark) [data-tpl="yalda-night"] .yc-orb{box-shadow:0 0 28px rgba(225,29,72,.4),0 0 64px rgba(225,29,72,.22),inset -14px -18px 40px rgba(20,0,6,.75),inset 10px 12px 26px rgba(255,255,255,.16)}
html:not(.dark) [data-tpl="yalda-night"] .yc-verse{color:#6D1B36;text-shadow:0 0 16px rgba(180,83,9,.22),0 0 6px rgba(225,29,72,.12)}
html:not(.dark) [data-tpl="yalda-night"] .yc-cell{background:rgba(225,29,72,.06);border-color:rgba(180,83,9,.35);box-shadow:inset 0 0 14px rgba(225,29,72,.07),0 0 16px -8px rgba(225,29,72,.22)}
html:not(.dark) [data-tpl="yalda-night"] .yc-cell b{color:#9F1239;text-shadow:0 0 10px rgba(225,29,72,.28)}
html:not(.dark) [data-tpl="yalda-night"] .yc-card{border-color:rgba(190,18,60,.2)!important}
html:not(.dark) [data-tpl="yalda-night"] .yc-card:hover{border-color:rgba(180,83,9,.45)!important;box-shadow:0 24px 60px -28px rgba(35,43,77,.32),0 0 26px -12px rgba(225,29,72,.25),inset 0 1px 0 rgba(255,255,255,.85)}
html:not(.dark) [data-tpl="yalda-night"] .yc-cta{box-shadow:0 0 22px -6px rgba(217,154,30,.5),0 12px 30px -14px rgba(180,83,9,.5)}
html:not(.dark) [data-tpl="yalda-night"] .yc-cta:hover{box-shadow:0 0 30px 0 rgba(217,154,30,.55),0 16px 36px -12px rgba(180,83,9,.55)}
html:not(.dark) [data-tpl="yalda-night"] .yc-btn-ghost{background:rgba(225,29,72,.05);border-color:rgba(180,83,9,.4);color:#9F1239;box-shadow:inset 0 0 16px rgba(225,29,72,.06)}
html:not(.dark) [data-tpl="yalda-night"] .yc-btn-ghost:hover{border-color:rgba(180,83,9,.75);box-shadow:0 0 20px -8px rgba(180,83,9,.4),inset 0 0 18px rgba(225,29,72,.1)}
html:not(.dark) [data-tpl="yalda-night"] .yc-scan{background:linear-gradient(to left,transparent,rgba(190,18,60,.35),rgba(180,83,9,.55),rgba(190,18,60,.35),transparent)}
html:not(.dark) [data-tpl="yalda-night"] .yc-scroll{scrollbar-color:rgba(180,83,9,.4) transparent}
html:not(.dark) [data-tpl="yalda-night"] .yc-scroll::-webkit-scrollbar-thumb{background:rgba(180,83,9,.35)}
html:not(.dark) [data-tpl="yalda-night"] :is(button,a,input,summary,[tabindex]):focus-visible{outline-color:rgba(180,83,9,.8)}
/* canvas / tiles / hero gradients */
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[\\#0D1226\\]{background-color:#F7F3EA}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[\\#10162E\\]{background-color:#FFFFFF}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[\\#0D1226\\]\\/80{background-color:rgba(252,250,244,.88)}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[\\#0D1226\\]\\/85{background-color:rgba(252,250,244,.92)}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[linear-gradient\\(178deg\\,\\#131B38_0\\%\\,\\#0D1226_52\\%\\,\\#0A0E1E_100\\%\\)\\]{background-image:linear-gradient(178deg,#FCFAF4 0%,#F7F3EA 52%,#EFE9DB 100%)}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[linear-gradient\\(to_top\\,rgba\\(225\\,29\\,72\\,\\.16\\)\\,transparent\\)\\]{background-image:linear-gradient(to top,rgba(225,29,72,.08),transparent)}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[linear-gradient\\(to_left\\,transparent\\,rgba\\(225\\,29\\,72\\,\\.8\\)\\,rgba\\(251\\,191\\,36\\,\\.85\\)\\,transparent\\)\\]{background-image:linear-gradient(to left,transparent,rgba(190,18,60,.55),rgba(180,83,9,.6),transparent)}
html:not(.dark) [data-tpl="yalda-night"] .bg-\\[linear-gradient\\(to_left\\,transparent\\,rgba\\(225\\,29\\,72\\,\\.7\\)\\,rgba\\(251\\,191\\,36\\,\\.8\\)\\,transparent\\)\\]{background-image:linear-gradient(to left,transparent,rgba(190,18,60,.5),rgba(180,83,9,.55),transparent)}
/* image scrims (from-/via-) → cream fades so overlay captions go ink */
html:not(.dark) [data-tpl="yalda-night"] .from-\\[\\#0D1226\\]\\/55{--tw-gradient-from:rgba(252,250,244,.6)}
html:not(.dark) [data-tpl="yalda-night"] .from-\\[\\#0D1226\\]\\/85{--tw-gradient-from:rgba(252,250,244,.88)}
html:not(.dark) [data-tpl="yalda-night"] .from-\\[\\#0D1226\\]\\/90{--tw-gradient-from:rgba(252,250,244,.92)}
html:not(.dark) [data-tpl="yalda-night"] .from-\\[\\#0D1226\\]\\/95{--tw-gradient-from:rgba(252,250,244,.96)}
html:not(.dark) [data-tpl="yalda-night"] .via-\\[\\#0D1226\\]\\/20{--tw-gradient-via:rgba(252,250,244,.22)}
html:not(.dark) [data-tpl="yalda-night"] .via-\\[\\#0D1226\\]\\/30{--tw-gradient-via:rgba(252,250,244,.32)}
html:not(.dark) [data-tpl="yalda-night"] .via-\\[\\#0D1226\\]\\/35{--tw-gradient-via:rgba(252,250,244,.36)}
/* white/ink alphas — every white-alpha utility → ink-alpha */
html:not(.dark) [data-tpl="yalda-night"] .text-white{color:#232B4D}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/90{color:rgba(35,43,77,.92)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/85{color:rgba(35,43,77,.87)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/80{color:rgba(35,43,77,.82)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/75{color:rgba(35,43,77,.78)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/70{color:rgba(35,43,77,.72)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/65{color:rgba(35,43,77,.68)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/60{color:rgba(35,43,77,.62)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/55{color:rgba(35,43,77,.58)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/50{color:rgba(35,43,77,.55)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/45{color:rgba(35,43,77,.5)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/40{color:rgba(35,43,77,.45)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/35{color:rgba(35,43,77,.4)}
html:not(.dark) [data-tpl="yalda-night"] .text-white\\/30{color:rgba(35,43,77,.35)}
html:not(.dark) [data-tpl="yalda-night"] .hover\\:text-white:hover{color:#232B4D}
html:not(.dark) [data-tpl="yalda-night"] .border-white\\/15{border-color:rgba(35,43,77,.18)}
html:not(.dark) [data-tpl="yalda-night"] .border-white\\/10{border-color:rgba(35,43,77,.12)}
html:not(.dark) [data-tpl="yalda-night"] .bg-white\\/5{background-color:rgba(35,43,77,.05)}
html:not(.dark) [data-tpl="yalda-night"] .bg-white\\/\\[0\\.03\\]{background-color:rgba(35,43,77,.03)}
/* dark scrims on images → light scrim + ink text (blanket handles ink) */
html:not(.dark) [data-tpl="yalda-night"] .bg-black\\/65{background-color:rgba(252,250,244,.9)}
html:not(.dark) [data-tpl="yalda-night"] .bg-black\\/60{background-color:rgba(252,250,244,.88)}
/* rose family → deep pomegranate readable on cream */
html:not(.dark) [data-tpl="yalda-night"] .text-rose-100{color:#9F1239}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-100\\/50{color:rgba(159,18,57,.55)}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-100\\/70{color:rgba(159,18,57,.72)}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-200{color:#BE123C}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-200\\/25{color:rgba(190,18,60,.3)}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-200\\/30{color:rgba(190,18,60,.35)}
html:not(.dark) [data-tpl="yalda-night"] .hover\\:text-rose-200:hover{color:#BE123C}
html:not(.dark) [data-tpl="yalda-night"] .text-rose-400{color:#E11D48}
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-600\\/15{background-color:rgba(225,29,72,.1)}
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-500\\/10{background-color:rgba(225,29,72,.08)}
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-400\\/80{background-color:rgba(225,29,72,.8)}
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-300{background-color:#F43F5E}
html:not(.dark) [data-tpl="yalda-night"] .border-rose-300\\/30{border-color:rgba(190,18,60,.35)}
html:not(.dark) [data-tpl="yalda-night"] .border-rose-300\\/35{border-color:rgba(190,18,60,.4)}
html:not(.dark) [data-tpl="yalda-night"] .border-rose-300\\/40{border-color:rgba(190,18,60,.45)}
/* amber family → readable gold */
html:not(.dark) [data-tpl="yalda-night"] .text-amber-200{color:#A16207}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-200\\/90{color:rgba(161,98,7,.9)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-200\\/80{color:rgba(161,98,7,.82)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-200\\/60{color:rgba(161,98,7,.62)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-300{color:#B45309}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-300\\/80{color:rgba(180,83,9,.8)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-300\\/70{color:rgba(180,83,9,.72)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-300\\/40{color:rgba(180,83,9,.45)}
html:not(.dark) [data-tpl="yalda-night"] .text-amber-400\\/50{color:rgba(180,83,9,.5)}
html:not(.dark) [data-tpl="yalda-night"] .fill-amber-300{fill:#B45309}
html:not(.dark) [data-tpl="yalda-night"] .hover\\:text-amber-200:hover{color:#A16207}
html:not(.dark) [data-tpl="yalda-night"] .bg-amber-200{background-color:#F59E0B}
html:not(.dark) [data-tpl="yalda-night"] .bg-amber-200\\/10{background-color:rgba(161,98,7,.1)}
html:not(.dark) [data-tpl="yalda-night"] .bg-amber-400\\/10{background-color:rgba(180,83,9,.09)}
html:not(.dark) [data-tpl="yalda-night"] .bg-amber-400\\/15{background-color:rgba(180,83,9,.13)}
html:not(.dark) [data-tpl="yalda-night"] .bg-amber-500\\/10{background-color:rgba(217,119,6,.1)}
html:not(.dark) [data-tpl="yalda-night"] .border-amber-300\\/25{border-color:rgba(180,83,9,.28)}
html:not(.dark) [data-tpl="yalda-night"] .border-amber-300\\/30{border-color:rgba(180,83,9,.32)}
html:not(.dark) [data-tpl="yalda-night"] .border-amber-300\\/40{border-color:rgba(180,83,9,.42)}
html:not(.dark) [data-tpl="yalda-night"] .border-amber-300\\/45{border-color:rgba(180,83,9,.46)}
html:not(.dark) [data-tpl="yalda-night"] .hover\\:border-amber-300\\/40:hover{border-color:rgba(180,83,9,.4)}
/* emerald «added» state */
html:not(.dark) [data-tpl="yalda-night"] .text-emerald-300{color:#047857}
html:not(.dark) [data-tpl="yalda-night"] .bg-emerald-500\\/20{background-color:rgba(16,185,129,.15)}
html:not(.dark) [data-tpl="yalda-night"] .border-emerald-400\\/40{border-color:rgba(5,150,105,.4)}
/* decorative hero column (seeds/moon) */
html:not(.dark) [data-tpl="yalda-night"] .bg-white{background-color:#F59E0B}
html:not(.dark) [data-tpl="yalda-night"] .shadow-\\[0_0_10px_rgba\\(255\\,255\\,255\\,\\.9\\)\\]{--tw-shadow:0 0 10px rgba(245,158,11,.7);box-shadow:0 0 10px rgba(245,158,11,.7)}
html:not(.dark) [data-tpl="yalda-night"] .shadow-\\[0_40px_90px_-40px_rgba\\(0\\,0\\,0\\,\\.9\\)\\]{--tw-shadow:0 40px 90px -40px rgba(35,43,77,.45);box-shadow:0 40px 90px -40px rgba(35,43,77,.45)}
html:not(.dark) [data-tpl="yalda-night"] .\\[box-shadow\\:0_0_30px_rgba\\(251\\,191\\,36\\,\\.35\\)\\]{box-shadow:0 0 30px rgba(180,83,9,.3)}
/* restores — text on surfaces that STAY colored in light mode */
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-600\\/90.text-white{color:#fff}
html:not(.dark) [data-tpl="yalda-night"] .bg-rose-500.text-white,
html:not(.dark) [data-tpl="yalda-night"] .bg-orange-500.text-white,
html:not(.dark) [data-tpl="yalda-night"] .bg-violet-600.text-white,
html:not(.dark) [data-tpl="yalda-night"] .bg-emerald-500.text-white,
html:not(.dark) [data-tpl="yalda-night"] .bg-destructive.text-white{color:#fff}
/* ══ v28 · خوانایی هیرو + قاب هنر واقعی — نسخهٔ روشن ══ */
html:not(.dark) [data-tpl="yalda-night"] .yc-hero-copy .yc-glass{background:rgba(255,255,255,.78)}
html:not(.dark) [data-tpl="yalda-night"] .yc-hero-copy .yc-glass-soft{background:rgba(255,255,255,.72);border-color:rgba(35,43,77,.15)}
html:not(.dark) [data-tpl="yalda-night"] .yc-hero-copy .yc-verse{text-shadow:0 1px 2px rgba(255,255,255,.9),0 0 14px rgba(180,83,9,.2)}
html:not(.dark) [data-tpl="yalda-night"] h1.yc-grad-text{filter:none}
html:not(.dark) [data-tpl="yalda-night"] .yc-art-frame{border-color:rgba(35,43,77,.16);box-shadow:0 0 22px rgba(225,29,72,.26),0 0 54px rgba(225,29,72,.13),0 30px 64px -34px rgba(35,43,77,.5)}
html:not(.dark) [data-tpl="yalda-night"] .yc-art-frame::before{background:conic-gradient(from 0deg,rgba(180,83,9,0),rgba(180,83,9,.6),rgba(190,18,60,.32),rgba(180,83,9,0)) border-box}
html:not(.dark) [data-tpl="yalda-night"] .yc-fruit-card{border-color:rgba(180,83,9,.62);box-shadow:0 0 18px rgba(180,83,9,.32),0 18px 38px -20px rgba(35,43,77,.45)}
`;

/* ── deterministic twinkling starfield (hydration-safe) ───────────── */
function Starfield({ count = 30 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 53 + 7) % 100;
        const top = (i * 29 + 3) % 64;
        const size = i % 5 === 0 ? 3 : 2;
        return (
          <span
            key={i}
            className="yc-star"
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                "--yc-dur": `${(2.2 + (i % 6) * 0.8).toFixed(1)}s`,
                "--yc-delay": `${(-((i * 0.77) % 7)).toFixed(1)}s`,
                "--yc-o": i % 3 === 0 ? 0.9 : 0.55,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/* ── hydration-safe countdown — per-product deadlines only ────────── */
function NightClock({
  target,
  size = "md",
}: { target: number | null; size?: "md" | "sm" }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, []);

  const diff = target !== null && now !== null ? Math.max(0, target - now) : null;
  const done = diff !== null && diff === 0;

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-200">
        <Timer className="h-3.5 w-3.5" aria-hidden />
        پایان تخفیف
      </span>
    );
  }

  const cells = [
    { v: diff === null ? null : Math.floor(diff / 3_600_000), l: "ساعت" },
    { v: diff === null ? null : Math.floor((diff % 3_600_000) / 60_000), l: "دقیقه" },
    { v: diff === null ? null : Math.floor((diff % 60_000) / 1000), l: "ثانیه" },
  ];

  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-200/90 tabular-nums" role="timer" aria-label="زمان باقی‌مانده پیشنهاد شب یلدا">
        <Clock className="h-3 w-3" aria-hidden />
        {cells.map((c) => toFaDigits(String(c.v ?? 0).padStart(2, "0"))).join(":")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" role="timer" aria-label="شمارش معکوس شب بلند">
      {cells.map((c, i) => (
        <span key={c.l} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-sm font-black text-amber-400/50">:</span>}
          <span className="yc-cell">
            <b aria-hidden>{c.v === null ? "—" : toFaDigits(String(c.v).padStart(2, "0"))}</b>
            <span className="mt-0.5 text-[8.5px] font-bold text-white/50">{c.l}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── add-to-cart — POST /api/cart/items + cart-updated event ──────── */
function useYaldaAdd() {
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

/* ── «سبد یلدا» — pomegranate-glow glass tile ─────────────────────── */
function YaldaTile({ product }: { product: TemplateProduct }) {
  const { addToCart, added } = useYaldaAdd();
  const target = product.discountEndsAt ? new Date(product.discountEndsAt).getTime() : null;

  return (
    <article className={cn("yc-card yc-glass group relative flex flex-col overflow-hidden rounded-3xl", !product.inStock && "grayscale-[0.45]")}>
      <Link href={`/products/${product.slug}`} aria-label={product.name} className="relative block aspect-square overflow-hidden rounded-t-3xl bg-[#10162E]">
        {product.mainImage ? (
          <Image src={product.mainImage} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 24vw" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
        ) : (
          <span className="grid h-full place-items-center text-rose-200/25"><Package className="h-11 w-11" aria-hidden /></span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1226]/55 via-transparent to-transparent" />
        {product.discountPercent > 0 && (
          <span className="yc-red-glow absolute end-3 top-3 rounded-xl border border-rose-300/35 bg-rose-600/90 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_0_22px_rgba(225,29,72,.55)]">
            {product.discountPercent.toLocaleString("fa-IR")}٪
          </span>
        )}
        {!product.inStock && (
          <span className="absolute start-3 top-3 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[10px] font-bold text-white/75 backdrop-blur">ناموجود</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-[10.5px] text-rose-100/50">
          <BadgeCheck className="h-3 w-3 text-amber-300/80" aria-hidden />
          {product.brand.name}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 min-h-12 text-[13px] font-bold leading-6 text-white/90 line-clamp-2 transition-colors hover:text-rose-200">
          {product.name}
        </Link>
        {target !== null && product.discountPercent > 0 && (
          <p className="mt-2">
            <NightClock target={target} size="sm" />
          </p>
        )}
        <div className="mt-auto pt-3">
          {product.discountPercent > 0 && (
            <p className="text-[11px] leading-4 text-white/35 tabular-nums line-through">{formatPrice(product.price)}</p>
          )}
          <p className="yc-gold-glow text-[15px] font-black tabular-nums">
            {formatPrice(product.effectivePrice)}
            <span className="ms-1 text-[10px] font-normal text-white/40">تومان</span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label={`افزودن ${product.name} به سبد یلدا`}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97]",
              product.inStock ? (added ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300" : "yc-btn-ghost") : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
            )}
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <Gem className="h-4 w-4" aria-hidden />}
            {product.inStock ? (added ? "افزوده شد" : "افزودن به سبد یلدا") : "ناموجود"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── night section header ─────────────────────────────────────────── */
function NightHeader({
  icon: Icon, title, subtitle, href,
}: { icon: React.ElementType; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="yc-pulse grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="yc-grad-text truncate text-lg font-black tracking-tight md:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="yc-glass-soft flex h-11 shrink-0 items-center gap-1 rounded-xl px-3.5 text-xs font-bold text-rose-200 transition-colors hover:text-white">
          مشاهده همه
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ── TEMPLATE ─────────────────────────────────────────────────────── */
export function YaldaNightTemplate({ data }: { data: HomeData }) {
  const { store, counts } = data;
  const stories: StoryItem[] = data.stories;
  const hasAnyProduct =
    data.featured.length > 0 || data.newest.length > 0 || data.bestsellers.length > 0 || data.discounted.length > 0 || data.exclusive.length > 0;

  /* «شب بلند» countdown — deepest-discount product's deadline (no registered
     timer feature → per-product contract only, no store.timerEndsAt override) */
  const longNightDeal = [...data.discounted]
    .filter((p) => p.discountEndsAt)
    .sort((a, b) => (a.discountPercent < b.discountPercent ? 1 : -1))[0] ?? null;
  const longNightTarget = longNightDeal?.discountEndsAt ? new Date(longNightDeal.discountEndsAt).getTime() : null;

  const heroSlide = data.slides[0] ?? null;
  const extraSlides = data.slides.slice(1, 3);

  /* v20 ticker messages → announcement fallback; v22 tickerSpeed */
  const tickerMsgs =
    store.tickerMessages && store.tickerMessages.length > 0
      ? store.tickerMessages
      : store.announcementActive && store.announcement
        ? [{ text: store.announcement, link: store.announcementLink }]
        : [];
  const mqDur = store.tickerSpeed && store.tickerSpeed > 0 ? store.tickerSpeed : 26;

  const chrome = TEMPLATE_CHROME["yalda-night"];

  const stats = [
    { icon: Star, n: counts.products, label: "میوه سفره دیجیتال" },
    { icon: Moon, n: counts.categories, label: "دسته‌بندی" },
    { icon: Gem, n: counts.brands, label: "برند" },
  ];

  return (
    <div data-template-chrome="1" data-tpl="yalda-night" className="isolate w-full bg-[#0D1226] text-white">
      <style>{YALDA_CYBER_CSS}</style>
      <TemplateHeader data={data} cfg={chrome.header} />

      {/* top blend from theme chrome into midnight */}
      <div aria-hidden className="pointer-events-none h-10 w-full bg-gradient-to-b from-background to-transparent" />

      {/* ═══ TICKER — شب‌پخش strip ═══ */}
      {tickerMsgs.length > 0 && (
        <section aria-label="اطلاعیه فروشگاه" className="mx-auto w-full max-w-[1440px] px-4 pb-3 pt-1">
          <div className="yc-glass-soft flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2">
            <span className="yc-blink flex shrink-0 items-center gap-1.5 text-[10px] font-black text-amber-300">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              پخش شبانه
            </span>
            <span className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
              <span className="yc-marquee" style={{ "--yc-mq": `${mqDur}s` } as React.CSSProperties}>
                {[0, 1].map((dup) => (
                  <span key={dup} className="flex shrink-0 items-center gap-10 pe-10" aria-hidden={dup === 1}>
                    {tickerMsgs.map((m, i) => (
                      <Link key={`${dup}-${i}`} href={m.link ?? "/products"} tabIndex={dup === 1 ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[11.5px] font-bold text-white/70 transition-colors hover:text-amber-200">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-rose-400/80" />
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

      {/* ═══ HERO — starfield night + real Yalda fruit art + glowing verse ═══ */}
      <section className="relative mx-auto w-full max-w-[1440px] px-4 pt-2" aria-labelledby="yc-hero">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/15 shadow-[0_40px_90px_-40px_rgba(0,0,0,.9)]">
          <div aria-hidden className="absolute inset-0 z-0 bg-[linear-gradient(178deg,#131B38_0%,#0D1226_52%,#0A0E1E_100%)]" />
          <Starfield />
          {/* مهِ افق و سحابی‌ها — همیشه سمتِ هنر و همیشه زیر ستون متن (z-0) */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 z-0 h-36 bg-[linear-gradient(to_top,rgba(225,29,72,.16),transparent)]" />
          <span aria-hidden className="absolute -end-24 bottom-10 z-0 h-64 w-64 rounded-full bg-rose-600/15 blur-3xl" />
          <span aria-hidden className="absolute -start-20 bottom-6 z-0 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative grid min-h-[420px] items-center gap-8 px-6 py-16 sm:min-h-[560px] sm:px-10 lg:grid-cols-[1.1fr_.9fr]">
            {/* ستون متن — z-10، بالای هر لایهٔ تزئینی */}
            <div className="yc-hero-copy relative z-10 text-center lg:text-start">
              <p className="yc-glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold text-rose-100">
                <Moon className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                شب بلند، سفره‌ی گرم {store.storeName}
              </p>
              <h1 id="yc-hero" className="yc-grad-text text-3xl font-black leading-[1.4] sm:text-4xl md:text-5xl">
                شب یلدای سایبری را بیدار بمان
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-8 text-white/75 sm:mx-auto lg:mx-0">
                {store.announcementActive && store.announcement
                  ? store.announcement
                  : `تا سپیده‌دم، ${toFaDigits(String(counts.products))} محصول منتخب با تخفیف‌های ویژه شب بلند روی سفره دیجیتال چیده شده‌اند.`}
              </p>

              {/* glowing Hafez verse */}
              <figure className="yc-glass-soft mt-6 max-w-lg rounded-2xl px-5 py-4 text-center sm:mx-auto lg:mx-0 lg:text-start">
                <Quote className="mb-1 h-4 w-4 text-amber-300/70" aria-hidden />
                <blockquote className="yc-verse text-[13px] font-bold leading-8">
                  بلبل ز نالید و گل از شکایتِ سحر
                  <br />
                  آگاه بودیم و خفتیم ای دلِ فریب‌خورده
                </blockquote>
                <figcaption className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-amber-200/60">— حافظ</figcaption>
              </figure>

              {/* «شب بلند» countdown — per-product deadline */}
              {longNightTarget !== null && (
                <div className="yc-glass mt-7 flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4 sm:justify-center lg:justify-start">
                  <p className="flex items-center gap-2 text-[10.5px] font-black tracking-[0.18em] text-amber-200/80">
                    <Flame className="h-3.5 w-3.5 text-rose-400" aria-hidden />
                    شمارش معکوس شب بلند
                  </p>
                  <NightClock target={longNightTarget} />
                </div>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link href="/products" className="yc-cta flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-black">
                  <Citrus className="h-4 w-4" aria-hidden />
                  سفره دیجیتال
                </Link>
                <Link href="/products?discount=1" className="yc-btn-ghost flex h-12 items-center gap-2 rounded-2xl px-7 text-sm font-bold">
                  <Flame className="h-4 w-4 text-rose-400" aria-hidden />
                  تخفیف‌های شب یلدا
                </Link>
              </div>

              <ul className="mt-9 flex flex-wrap justify-center gap-2.5 lg:justify-start" aria-label="آمار فروشگاه">
                {stats.map((s) => (
                  <li key={s.label} className="yc-glass-soft flex items-center gap-2 rounded-xl px-3.5 py-2">
                    <s.icon className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    <span className="text-sm font-black tabular-nums text-white">{toFaDigits(String(s.n))}</span>
                    <span className="text-[10px] text-white/70">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ستون هنر — انار و هندوانهٔ واقعی شب یلدا */}
            <div className="yc-art-col relative z-[1] mx-auto hidden w-[300px] flex-col items-center sm:flex">
              <div className="yc-art-frame relative w-full">
                <Image
                  src="/images/yalda/pomegranate.png"
                  alt="انار شب یلدا روی حریر شب‌رنگ با نور شمع"
                  width={864}
                  height={1152}
                  sizes="(min-width: 768px) 360px, 300px"
                  priority
                  className="aspect-[3/4] w-full rounded-[2.5rem] object-cover"
                />
              </div>
              {/* هندوانه — جفتِ میوهٔ شب یلدا */}
              <figure className="yc-fruit-card rotate-6">
                <Image
                  src="/images/yalda/watermelon.png"
                  alt="هندوانهٔ شب یلدا"
                  width={1152}
                  height={864}
                  sizes="132px"
                  className="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
                />
              </figure>
              {/* دانه‌های شناور انار */}
              <span aria-hidden className="absolute start-6 top-14 h-3 w-3 rounded-full bg-rose-300 shadow-[0_0_12px_rgba(251,147,172,.9)]" style={{ animation: "yc-float 6s ease-in-out -1s infinite" }} />
              <span aria-hidden className="absolute -end-3 top-24 h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,.9)]" style={{ animation: "yc-float 7s ease-in-out -3s infinite" }} />
              <span aria-hidden className="absolute bottom-20 start-10 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.9)]" style={{ animation: "yc-float 8s ease-in-out -5s infinite" }} />
              {/* هلال ماه */}
              <span aria-hidden className="yc-moon yc-moon-pos absolute grid h-16 w-16 place-items-center rounded-full bg-amber-200/10 text-amber-200/80 [box-shadow:0_0_30px_rgba(251,191,36,.35)]">
                <Moon className="h-8 w-8" />
              </span>
            </div>
          </div>
        </div>

        {/* نوار «سفرهٔ یلدا» — نمایش سفرهٔ واقعی میوه‌ها */}
        <Link href="/products?discount=1" aria-label="دیدن تخفیف‌های سفرهٔ یلدا" className="yc-sofreh group block overflow-hidden border border-white/15">
          <Image src="/images/yalda/sofreh.png" alt="سفرهٔ شب یلدا با انار، هندوانه و میوه‌های خشک" fill sizes="(max-width: 640px) 92vw, 1360px" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#0D1226]/85 via-[#0D1226]/35 to-transparent" />
          <span className="yc-sofreh-cap absolute inset-y-0 start-0 flex flex-col justify-center gap-1 p-5 text-start sm:p-7">
            <span className="yc-red-glow text-sm font-black sm:text-base">سفرهٔ یلدا</span>
            <span className="text-[11px] leading-5 text-white/80 sm:text-xs">انار و هندوانه و میوه‌های خشک — چیده‌شده با تخفیف‌های شب بلند</span>
            <span className="yc-gold-glow text-[11px] font-black">دیدن میوه‌های سفره</span>
          </span>
        </Link>
      </section>

      {/* ═══ STORIES — فانوس‌های شب ═══ */}
      {stories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="استوری‌های فروشگاه">
          <Reveal>
            <div className="yc-glass rounded-[2rem] p-4 sm:p-5" style={{ "--background": "var(--yc-night)" } as React.CSSProperties}>
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-amber-300">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                فانوس‌های شب یلدا
              </p>
              <StoriesRow stories={stories} />
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ HERO SLIDE CINEMA + EXTRA DUO ═══ */}
      {heroSlide && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="اسلایدر شبانه">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-3">
              <Link
                href={heroSlide.ctaUrl ?? (heroSlide.product ? `/products/${heroSlide.product.slug}` : "/products")}
                className="group relative block h-[240px] overflow-hidden rounded-[2rem] border border-white/15 sm:h-[320px] lg:col-span-2 lg:h-[360px]"
              >
                <SlideArt slide={heroSlide} sizes="(max-width: 1024px) 96vw, 64vw" priority className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1226]/95 via-[#0D1226]/30 to-transparent" />
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(225,29,72,.8),rgba(251,191,36,.85),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="yc-red-glow mb-2 inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black">
                    <Star className="h-3 w-3" aria-hidden />
                    اسلاید شب
                  </p>
                  <h3 className="text-xl font-black text-white sm:text-2xl">{heroSlide.title}</h3>
                  {heroSlide.subtitle && <p className="mt-1.5 line-clamp-2 max-w-xl text-xs leading-6 text-white/65">{heroSlide.subtitle}</p>}
                  {heroSlide.ctaText && (
                    <span className="yc-gold-glow mt-4 inline-flex items-center gap-1.5 text-xs font-black">
                      {heroSlide.ctaText}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </span>
                  )}
                </div>
              </Link>
              {extraSlides.map((s) => (
                <Link
                  key={s.id}
                  href={s.ctaUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="group relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/15 lg:block"
                >
                  <SlideArt slide={s} sizes="32vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1226]/90 via-[#0D1226]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-base font-black text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/60">{s.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ CATEGORIES — سبد انار tiles ═══ */}
      {data.categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-cats">
          <Reveal>
            <NightHeader icon={Moon} title="سبدهای دسته‌بندی" subtitle="هر سبد، یک قلمرو شبانه" href="/products" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {data.categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="yc-card yc-glass group relative flex flex-col items-center overflow-hidden rounded-2xl text-center">
                  <span className="relative block aspect-square w-full overflow-hidden bg-[#10162E]">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 30vw, 16vw" className="object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-lg font-black text-rose-200/30">{c.name.charAt(0)}</span>
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1226]/85 via-transparent to-transparent" />
                  </span>
                  <span className="flex w-full flex-col items-center gap-0.5 p-2.5">
                    <span className="w-full truncate text-[11.5px] font-bold text-white/85">{c.name}</span>
                    <span className="text-[9.5px] text-rose-100/50 tabular-nums">{toFaDigits(String(c.productCount))} کالا</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ DISCOUNTED — تخفیف‌های شب بلند ═══ */}
      {data.discounted.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-deals">
          <Reveal>
            <NightHeader icon={Flame} title="تخفیف‌های شب بلند" subtitle="تا سپیده‌دم معتبر است" href="/products?discount=1" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.discounted.slice(0, 8).map((p) => <YaldaTile key={p.id} product={p} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FEATURED — سبد یلدا ═══ */}
      {data.featured.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-basket">
          <Reveal>
            <NightHeader icon={Sparkles} title="سبد یلدا" subtitle="انتخاب‌های ویژه برای شب بلند" href={RAIL_URLS.featured} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.featured.slice(0, 8).map((p) => <YaldaTile key={p.id} product={p} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EXCLUSIVE — انحصاری‌های شب ═══ */}
      {data.exclusive.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-exclusive">
          <Reveal>
            <NightHeader icon={Gem} title="انحصاری‌های شب بلند" subtitle="فقط در تاج — تا سپیده‌دم" />
            <div className="grid gap-4 md:grid-cols-2">
              {data.exclusive.slice(0, 2).map((p) => (
                <article key={p.id} className="yc-card yc-glass group relative flex flex-col overflow-hidden rounded-[2rem] sm:flex-row">
                  <Link href={`/products/${p.slug}`} aria-label={p.name} className="relative block aspect-square w-full shrink-0 bg-[#10162E] sm:w-[46%]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 92vw, 28vw" className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-rose-200/30"><Package className="h-14 w-14" aria-hidden /></span>
                    )}
                    <span className="yc-gold-glow absolute start-4 top-4 rounded-full border border-amber-300/40 bg-[#0D1226]/80 px-3 py-1 text-[10px] font-black backdrop-blur">انحصاری</span>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-6">
                    <p className="flex items-center gap-1 text-[10.5px] text-rose-100/50">
                      <BadgeCheck className="h-3 w-3 text-amber-300/80" aria-hidden />
                      {p.brand.name}
                    </p>
                    <Link href={`/products/${p.slug}`} className="mt-1.5 text-lg font-black leading-8 text-white line-clamp-2 transition-colors hover:text-rose-200">
                      {p.name}
                    </Link>
                    <p className="yc-gold-glow mt-3 text-xl font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[11px] font-normal text-white/40">تومان</span>
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {p.rating > 0 && (
                        <li className="yc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-amber-200">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                          {p.rating.toLocaleString("fa-IR")} از ۵
                        </li>
                      )}
                      {p.soldCount > 0 && (
                        <li className="yc-glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white/60 tabular-nums">
                          {toFaDigits(String(p.soldCount))} فروش
                        </li>
                      )}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ BESTSELLERS — آنچه شب‌ها خریده‌اند ═══ */}
      {data.bestsellers.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-best">
          <Reveal>
            <NightHeader icon={TrendingUp} title="آنچه شب‌ها خریده‌اند" subtitle="بر اساس فروش واقعی مشتریان" />
            <div className="yc-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {data.bestsellers.slice(0, 10).map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="yc-card yc-glass group flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#10162E]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="240px" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-rose-200/30"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute start-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border text-sm font-black tabular-nums",
                        i < 3
                          ? "border-amber-300/45 bg-amber-400/15 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,.35)]"
                          : "border-white/15 bg-black/60 text-white/60"
                      )}
                    >
                      {toFaDigits(String(i + 1).padStart(2, "0"))}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="min-h-11 text-[12.5px] font-bold leading-5 text-white/85 line-clamp-2">{p.name}</span>
                    <span className="mt-1 text-[10px] text-rose-100/50 tabular-nums">{toFaDigits(String(p.soldCount))} فروش موفق</span>
                    <span className="yc-gold-glow mt-auto pt-2 text-[13.5px] font-black tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-white/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ NEWEST — تازه‌های شب ═══ */}
      {data.newest.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-newest">
          <Reveal>
            <NightHeader icon={Moon} title="تازه‌های شب" subtitle="به‌تازگی روی سفره چیده شده" href={RAIL_URLS.newest} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.newest.slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="yc-card yc-glass group flex flex-col overflow-hidden rounded-3xl">
                  <span className="relative block aspect-square overflow-hidden bg-[#10162E]">
                    {p.mainImage ? (
                      <Image src={p.mainImage} alt={p.name} fill sizes="(max-width: 640px) 50vw, 24vw" className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-rose-200/30"><Package className="h-10 w-10" aria-hidden /></span>
                    )}
                    <span className="yc-blink absolute end-3 top-3 rounded-full border border-rose-300/40 bg-[#0D1226]/85 px-2.5 py-1 text-[9.5px] font-black text-rose-200 backdrop-blur">جدید</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="text-[10.5px] text-rose-100/50">{p.brand.name}</span>
                    <span className="mt-1 min-h-11 text-[12.5px] font-bold leading-5 text-white/85 line-clamp-2">{p.name}</span>
                    <span className="mt-auto pt-2 text-[13.5px] font-black text-white tabular-nums">
                      {formatPrice(p.effectivePrice)}
                      <span className="ms-1 text-[9.5px] font-normal text-white/40">تومان</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ SHOWCASES — بنرهای شبانه ═══ */}
      {data.showcases.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="بنرهای شبانه">
          <Reveal>
            <NightHeader icon={Moon} title="بنرهای شبانه" subtitle="ویترین‌های ویژه یلدا" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {data.showcases.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  href={s.buttonUrl ?? (s.product ? `/products/${s.product.slug}` : "/products")}
                  className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/15"
                >
                  <Image src={s.image} alt={s.title} fill sizes="(max-width: 768px) 92vw, 46vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1226]/95 via-[#0D1226]/35 to-transparent" />
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(to_left,transparent,rgba(225,29,72,.7),rgba(251,191,36,.8),transparent)]" />
                  <div className="relative p-6">
                    <h3 className="text-lg font-black text-white">{s.title}</h3>
                    {s.subtitle && <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-6 text-white/65">{s.subtitle}</p>}
                    <span className="yc-gold-glow mt-3 inline-flex items-center gap-1 text-xs font-black">
                      مشاهده
                      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ TRUST — ضمانت شبانه ═══ */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="خدمات ویژه شب یلدا">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "ضمانت اصالت", d: "همه کالاها با گارانتی رسمی و خدمات پس از فروش" },
              { icon: Moon, t: "پشتیبانی تا سپیده", d: "مشاوران ما بیدارند تا پایان شب بلند" },
              { icon: Gem, t: "بسته‌بندی یلدا", d: "سبد هدیه انار و هندوانه، رایگان روی سفارش‌ها" },
            ].map((f) => (
              <div key={f.t} className="yc-glass-soft flex items-start gap-3 rounded-2xl p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-400/10 text-amber-300">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-white/90">{f.t}</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/45">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══ BRANDS — شب‌گرد marquee ═══ */}
      {data.brands.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-label="برندهای همکار">
          <Reveal>
            <div className="yc-glass rounded-[2rem] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-amber-300">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </span>
                برندهای ستاره‌ی شب
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-rose-100/70 tabular-nums">
                  {toFaDigits(String(data.brands.length))} برند
                </span>
              </div>
              <div className="overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_5%,black_95%,transparent)]">
                <div className="yc-marquee" style={{ "--yc-mq": "28s" } as React.CSSProperties}>
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex shrink-0 gap-3 pe-3" aria-hidden={dup === 1}>
                      {data.brands.map((b) => (
                        <Link
                          key={`${dup}-${b.id}`}
                          href={`/products?brand=${b.slug}`}
                          tabIndex={dup === 1 ? -1 : undefined}
                          className="yc-glass-soft flex h-12 shrink-0 items-center gap-2 rounded-full pe-5 ps-1.5 transition-colors hover:border-amber-300/40"
                        >
                          <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-[#10162E]">
                            {b.logo || b.image ? (
                              <Image src={(b.logo ?? b.image)!} alt={b.name} fill sizes="36px" className="object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-full place-items-center text-[11px] font-black text-rose-100/50">{b.name.charAt(0)}</span>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-xs font-bold text-white/80">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ FAQ — پرسش‌های شبانه ═══ */}
      {data.faq.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14" aria-labelledby="yc-faq">
          <Reveal>
            <NightHeader icon={HelpCircle} title="پرسش‌های شبانه" subtitle="پاسخ‌ها روشن مثل ماه" />
            <div className="grid gap-3 lg:grid-cols-2">
              {data.faq.map((f, i) => (
                <details key={i} className="yc-faq yc-glass-soft group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white/85 [&::-webkit-details-marker]:hidden">
                    {f.h}
                    <ChevronLeft className="yc-faq-ico h-4 w-4 shrink-0 text-white/40" aria-hidden />
                  </summary>
                  <p className="mt-3 border-t border-white/10 pt-3 text-[12px] leading-7 text-white/55">{f.p}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!hasAnyProduct && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-14">
          <div className="yc-glass rounded-[2rem] border-dashed p-16 text-center">
            <Moon className="mx-auto mb-4 h-12 w-12 text-amber-300/40" aria-hidden />
            <h2 className="text-lg font-black text-white/85">سفره هنوز آماده نیست</h2>
            <p className="mt-2 text-sm leading-7 text-white/45">میوه‌های دیجیتال شب یلدا به‌زودی چیده می‌شوند…</p>
            <Link href="/products" className="yc-cta mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-xs font-black">
              مشاهده همه محصولات
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CLOSING — divider + bottom blend ═══ */}
      <div aria-hidden className="yc-scan mx-auto mt-16 max-w-3xl" />
      <div aria-hidden className="pointer-events-none h-12 w-full bg-gradient-to-b from-transparent to-background" />

      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

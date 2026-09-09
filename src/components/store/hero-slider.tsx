"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/stores";
// v33 (2-d): pure client-safe helper — a bare "/products" buttonUrl is
// resolved from the button text/title/badge into a filtered product list.
import { smartSliderUrl } from "@/lib/templates/slide-targets";

export type SliderSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  desktopImage: string;
  mobileImage: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  badge: string | null;
  product: { id: string; name: string; slug: string; price: number; discountPrice: number | null; mainImage: string | null } | null;
};

const AUTOPLAY_MS = 6500;

export function HeroSlider({ slides }: { slides: SliderSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const consult = useChatStore((s) => s.consultProduct);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || reduced || slides.length < 2) return;
    timer.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [next, paused, reduced, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index];

  return (
    <section
      className="relative rounded-3xl overflow-hidden hero-mesh border border-border/60 shadow-xl"
      aria-roledescription="carousel"
      aria-label="اسلایدر اصلی تاج الکترونیکس"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[380px] sm:h-[420px] md:h-[460px] lg:h-[520px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next();
              else if (info.offset.x > 60) prev();
            }}
          >
            {/* background images */}
            {slide.mobileImage && (
              <Image
                src={slide.mobileImage}
                alt=""
                fill
                priority
                sizes="(max-width: 639px) 92vw, 0px"
                className="object-cover sm:hidden opacity-60"
              />
            )}
            <Image
              src={slide.desktopImage}
              alt={slide.title}
              fill
              priority
              sizes={slide.mobileImage ? "(min-width: 640px) 92vw, 0px" : "92vw"}
              className={cn("object-cover", slide.mobileImage ? "hidden sm:block opacity-70" : "opacity-70")}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/10" />

            {/* content */}
            <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col justify-center">
              <div className="max-w-xl">
                {slide.badge && (
                  <motion.span
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold glass text-white mb-4"
                  >
                    <Zap className="h-3 w-3 text-primary" />
                    {slide.badge}
                  </motion.span>
                )}
                <motion.h2
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-black text-white leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.4)]"
                >
                  {slide.title}
                </motion.h2>
                {slide.subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="mt-3 text-sm sm:text-base text-white/80 leading-7 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]"
                  >
                    {slide.subtitle}
                  </motion.p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  className="mt-6 flex flex-wrap items-center gap-3"
                >
                  {slide.buttonText && (
                    <Button asChild size="lg" className="gold-surface text-primary-foreground hover:opacity-90 rounded-xl h-12 px-7 font-bold shadow-lg">
                      <Link href={smartSliderUrl({ buttonUrl: slide.buttonUrl, text: slide.buttonText, title: slide.title, badge: slide.badge })}>
                        <ShoppingCart className="h-5 w-5 me-2" />
                        {slide.buttonText}
                      </Link>
                    </Button>
                  )}
                  {slide.product && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="glass text-white border-white/30 hover:bg-white/15 rounded-xl h-12 px-6 font-bold"
                      onClick={() => consult({ id: slide.product!.id, name: slide.product!.name, slug: slide.product!.slug })}
                    >
                      <Sparkles className="h-4 w-4 me-2 text-primary" />
                      مشاوره خرید AI
                    </Button>
                  )}
                </motion.div>
              </div>

              {/* linked product mini-card */}
              {slide.product && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="hidden md:block absolute bottom-8 left-10 glass rounded-2xl p-3 w-64 shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative h-14 w-14 rounded-xl bg-white/10 overflow-hidden shrink-0">
                      {slide.product.mainImage && (
                        <Image src={slide.product.mainImage} alt={slide.product.name} fill sizes="56px" className="object-contain p-1" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-white/60">محصول مرتبط</p>
                      <Link href={`/products/${slide.product.slug}`} className="block text-[13px] font-bold text-white truncate hover:text-primary transition-colors">
                        {slide.product.name}
                      </Link>
                      <p className="text-sm font-extrabold text-primary tabular-nums mt-0.5">
                        {(slide.product.discountPrice ?? slide.product.price).toLocaleString("fa-IR")} تومان
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* nav arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="اسلاید قبلی"
              className="absolute top-1/2 -translate-y-1/2 right-3 grid place-items-center h-10 w-10 rounded-full glass text-white hover:bg-white/25 transition-colors z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="اسلاید بعدی"
              className="absolute top-1/2 -translate-y-1/2 left-3 grid place-items-center h-10 w-10 rounded-full glass text-white hover:bg-white/25 transition-colors z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* pagination */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-0 left-0 flex items-center justify-center gap-2 z-10">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`اسلاید ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Package } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  buttonText: string | null;
  buttonUrl: string | null;
  badge: string | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice: number | null;
    mainImage: string | null;
  } | null;
}

/**
 * Animated promotional showcase blocks (homepage, below hero).
 * - image background with slow ken-burns/parallax on hover (GPU transforms)
 * - brand-tinted dark gradient overlay (color-mix with var(--primary))
 * - animated title (rise on view) + CTA + badge chip + linked product chip
 * - whole card is one link (buttonUrl OR product link)
 */
export function ShowcaseDuo({ showcases }: { showcases: ShowcaseItem[] }) {
  const reduced = useReducedMotion();
  if (showcases.length === 0) return null;

  const items = showcases.slice(0, 4);

  return (
    <section aria-label="نمایشگاه‌های ویژه" className="grid gap-4 md:grid-cols-2">
      {items.map((s) => {
        const href = s.buttonUrl || (s.product ? `/products/${s.product.slug}` : "/products");
        const price = s.product ? (s.product.discountPrice ?? s.product.price) : null;
        return (
          <Link
            key={s.id}
            href={href}
            aria-label={s.title}
            className="group relative block min-h-[240px] overflow-hidden rounded-3xl border shadow-lg card-hover"
          >
            {/* media with slow parallax zoom on hover (GPU only) */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={s.image}
                alt={s.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={cn(
                  "object-cover",
                  !reduced && "transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07] group-hover:-translate-y-2"
                )}
              />
            </div>

            {/* brand-tinted dark gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(250deg, rgba(0,0,0,0.06) 0%, color-mix(in oklab, var(--primary) 26%, rgba(0,0,0,0.5)) 46%, rgba(0,0,0,0.8) 100%)",
              }}
            />

            {/* content */}
            <div className="relative flex min-h-[240px] flex-col justify-end p-6 md:p-8">
              {s.badge && (
                <motion.span
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45 }}
                  className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold text-white backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {s.badge}
                </motion.span>
              )}

              <motion.h3
                initial={reduced ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-md text-xl font-black leading-8 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] md:text-2xl md:leading-9"
              >
                {s.title}
              </motion.h3>

              {s.subtitle && (
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: 0.16 }}
                  className="mt-2 max-w-md text-[12.5px] leading-6 text-white/75 line-clamp-2"
                >
                  {s.subtitle}
                </motion.p>
              )}

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="mt-5 flex flex-wrap items-center gap-3"
              >
                {s.buttonText && (
                  <span className="gold-surface inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-[13px] font-bold text-primary-foreground shadow-lg transition-all group-hover:shadow-xl group-active:scale-[0.97]">
                    {s.buttonText}
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                )}
                {s.product && (
                  <span className="glass inline-flex h-11 max-w-[220px] items-center gap-2 rounded-xl px-3 text-[12px] font-bold text-card-foreground">
                    <Package className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{s.product.name}</span>
                    {price !== null && (
                      <span className="shrink-0 tabular-nums text-primary">{formatPrice(price)}</span>
                    )}
                  </span>
                )}
              </motion.div>
            </div>

            {/* subtle shine sweep */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0",
                !reduced &&
                  "opacity-0 transition-opacity duration-700 group-hover:opacity-100 [background:radial-gradient(60%_60%_at_75%_20%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)]"
              )}
            />
          </Link>
        );
      })}
    </section>
  );
}

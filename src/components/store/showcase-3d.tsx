"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { useCart, useWishlist } from "@/hooks/use-store";
import { useChatStore } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Star, ShoppingCart, Heart, Check, Crown, Zap, Sparkles, Package, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductCardData } from "./product-card";

/**
 * Premium 3D product showcase rail — used for the flagship homepage
 * sections (پرفروش‌ترین‌ها / پیشنهاد ویژه). Data is 100% real DB products.
 *
 * Subtle 3D: perspective wrapper + pointer-tracked tilt (≤ 7°), the product
 * image lifted on its own translateZ layer, a gradient sheen that follows
 * the pointer, growing depth shadow. All transforms are GPU-composited and
 * completely disabled under prefers-reduced-motion. No spinning gimmicks —
 * cards stay readable and clickable.
 */

const RANK_STYLES = [
  { chip: "bg-gradient-to-b from-amber-300 to-primary text-primary-foreground", label: "۱" },
  { chip: "bg-gradient-to-b from-slate-200 to-slate-400 text-foreground", label: "۲" },
  { chip: "bg-gradient-to-b from-amber-600 to-amber-800 text-white", label: "۳" },
];

function Tilt3DCard({ product, rank, soldLabel }: { product: ProductCardData; rank?: number; soldLabel?: string }) {
  const reduced = useReducedMotion();
  const { add } = useCart();
  const { toggle: toggleWish, wishlist } = useWishlist();
  const consultProduct = useChatStore((s) => s.consultProduct);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sheen: 50, active: false });
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const inWishlist = (wishlist ?? []).some((w) => w.id === product.id);
  const rankStyle = rank !== undefined && rank < 3 ? RANK_STYLES[rank] : null;

  /* pointer-tracked tilt — max ±7°, sheen position in % */
  const onMove = (e: React.MouseEvent) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    setTilt({
      rx: (0.5 - py) * 10, // top → tilt back
      ry: (px - 0.5) * 12, // right → rotate right (subtle)
      sheen: px * 100,
      active: true,
    });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, sheen: 50, active: false });

  const addToCart = async () => {
    if (!product.inStock || adding) return;
    try {
      setAdding(true);
      await add.mutateAsync({ productId: product.id, quantity: 1, color: product.colors?.[0]?.name ?? null });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 700);
    } catch {
      /* toast handled by useCart */
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="w-[252px] sm:w-[272px] shrink-0 snap-start"
      style={{ perspective: "1100px" }}
      role="listitem"
    >
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateY(-6px)`
            : undefined,
          transition: tilt.active ? "transform 80ms ease-out" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "group relative h-full flex flex-col rounded-2xl border bg-card overflow-visible",
          "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]",
          tilt.active && "shadow-[0_30px_60px_-25px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
          "transition-shadow duration-500"
        )}
      >
        {/* pointer-following gradient sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at ${tilt.sheen}% 20%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 65%)`,
          }}
        />

        {/* media layer — lifted toward the viewer */}
        <div
          style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
          className="relative m-2.5 rounded-xl overflow-hidden bg-gradient-to-b from-muted/60 to-muted/20"
        >
          <Link href={`/products/${product.slug}`} aria-label={product.name} className="block">
            <span className="relative block aspect-[4/3] zoom-media">
              {product.mainImage ? (
                <Image
                  src={product.mainImage}
                  alt={product.name}
                  fill
                  sizes="272px"
                  className="object-contain p-4"
                />
              ) : (
                <span className="grid h-full place-items-center text-muted-foreground">
                  <Package className="h-10 w-10" />
                </span>
              )}
            </span>
          </Link>

          {/* rank chip (پرفروش ۱/۲/۳) */}
          {rankStyle && (
            <span
              style={{ transform: "translateZ(40px)" }}
              className={cn(
                "absolute top-2.5 start-2.5 grid h-8 w-8 place-items-center rounded-full text-[13px] font-black shadow-lg ring-2 ring-background/70",
                rankStyle.chip
              )}
              aria-label={`رتبه ${rank! + 1}`}
            >
              {rankStyle.label}
            </span>
          )}

          {/* discount badge */}
          {product.discountPercent > 0 && (
            <span
              style={{ transform: "translateZ(36px)" }}
              className="absolute top-2.5 end-2.5 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black text-white shadow-lg"
            >
              {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
            </span>
          )}

          {/* floating quick actions */}
          <div style={{ transform: "translateZ(44px)" }} className="absolute bottom-2.5 end-2.5 flex flex-col gap-1.5 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
            <button
              type="button"
              onClick={() => toggleWish.mutate(product.id)}
              aria-label={inWishlist ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full glass shadow-md transition-colors",
                inWishlist ? "text-destructive" : "text-foreground hover:text-destructive"
              )}
            >
              <Heart className={cn("h-4 w-4", inWishlist && "fill-destructive")} />
            </button>
            <button
              type="button"
              onClick={() => consultProduct({ id: product.id, name: product.name, slug: product.slug })}
              aria-label="مشاوره خرید با هوش مصنوعی"
              className="grid h-9 w-9 place-items-center rounded-full glass shadow-md text-primary transition-colors hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* content layer */}
        <div className="flex flex-1 flex-col px-4 pb-4 pt-1">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            {product.brand && (
              <>
                <BadgeCheck className="h-3 w-3 text-primary" />
                <span className="truncate">{product.brand.name}</span>
              </>
            )}
            {soldLabel && (
              <span className="ms-auto inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px font-bold text-primary">
                <Zap className="h-2.5 w-2.5" />
                {soldLabel}
              </span>
            )}
          </div>

          <Link href={`/products/${product.slug}`} className="mt-1.5">
            <h3 className="text-[13px] font-bold leading-6 line-clamp-2 min-h-12 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-semibold text-foreground">
              {product.rating > 0 ? product.rating.toLocaleString("fa-IR") : "جدید"}
            </span>
            {!!product.reviewCount && <span>({product.reviewCount.toLocaleString("fa-IR")} نظر)</span>}
          </div>

          <div className="mt-auto pt-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {product.discountPercent > 0 && (
                <p className="text-[11px] text-muted-foreground price-old tabular-nums leading-4">
                  {formatPrice(product.price)}
                </p>
              )}
              <p className="text-[15px] font-black text-primary tabular-nums leading-6">
                {formatPrice(product.effectivePrice)}
                <span className="text-[10px] font-normal text-muted-foreground"> تومان</span>
              </p>
            </div>
            <Button
              size="sm"
              onClick={addToCart}
              disabled={!product.inStock || adding}
              aria-label={`افزودن ${product.name} به سبد`}
              className={cn(
                "h-9 w-9 shrink-0 rounded-xl gold-surface text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95",
                justAdded && "bg-emerald-500 text-white hover:bg-emerald-500"
              )}
            >
              {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            </Button>
          </div>
          {!product.inStock && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-center text-[10.5px] font-bold text-destructive">
              فعلاً ناموجود
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Showcase3DSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[252px] sm:w-[272px] shrink-0">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal rail of 3D showcase cards.
 * `soldCounts` — optional parallel array of real sold-count numbers for the
 * "n فروش" chip (پرفروش‌ترین‌ها sections).
 */
export function Showcase3DRail({
  products,
  soldCounts,
}: {
  products: ProductCardData[];
  soldCounts?: number[];
}) {
  if (products.length === 0) return null;
  return (
    <div
      className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-proximity pb-3 -mx-1 px-1"
      role="list"
      aria-label="لیست محصولات ویژه"
    >
      {products.map((p, i) => (
        <Tilt3DCard
          key={p.id}
          product={p}
          rank={i < 3 ? i : undefined}
          soldLabel={soldCounts?.[i] && soldCounts[i] > 0 ? `${soldCounts[i].toLocaleString("fa-IR")} فروش` : undefined}
        />
      ))}
    </div>
  );
}

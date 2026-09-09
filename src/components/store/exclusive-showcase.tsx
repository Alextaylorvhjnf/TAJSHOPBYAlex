"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { useCart, useWishlist } from "@/hooks/use-store";
import { useChatStore } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Star, ShoppingCart, Heart, Check, Gem, Sparkles, Package, BadgeCheck, Rotate3d,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TemplateProduct } from "@/lib/templates/types";

/**
 * EXCLUSIVE PRODUCT SHOWCASE (v15, user request) — «محصولات انحصاری»
 * large premium cards with a real 3D-viewing feel:
 *
 *  · pointer-tracked card tilt (±8°, GPU-composited, disabled for
 *    prefers-reduced-motion and touch pointers)
 *  · the product media floats on its own translateZ depth layer and, while
 *    hovered, continuously SWINGS (taj-exclusive-swing) so the shopper can
 *    inspect it from both sides — the "نمای سه‌بعدی" affordance
 *  · pointer-following gold sheen + growing depth shadow
 *  · floating quick actions (wishlist / AI consult) raised above the media
 *
 * Data is 100% real DB products (HomeData.exclusive = PUBLISHED + isSpecial)
 * — presentation only, no data mutation.
 */

function Exclusive3DCard({ product }: { product: TemplateProduct }) {
  const reduced = useReducedMotion();
  const { add } = useCart();
  const { toggle: toggleWish, wishlist } = useWishlist();
  const consultProduct = useChatStore((s) => s.consultProduct);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sheen: 50, active: false });
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const inWishlist = (wishlist ?? []).some((w) => w.id === product.id);

  /* pointer-tracked tilt — max ±8°, sheen position in % */
  const onMove = (e: React.MouseEvent) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    setTilt({
      rx: (0.5 - py) * 8,
      ry: (px - 0.5) * 12,
      sheen: px * 100,
      active: true,
    });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, sheen: 50, active: false });

  const addToCart = async () => {
    if (!product.inStock || adding) return;
    try {
      setAdding(true);
      await add.mutateAsync({ productId: product.id, quantity: 1 });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 900);
    } catch {
      /* toast handled by useCart */
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="snap-start"
      style={{ perspective: "1200px" }}
      role="listitem"
    >
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateY(-8px)`
            : undefined,
          transition: tilt.active ? "transform 90ms ease-out" : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "group relative h-full flex flex-col rounded-3xl border border-primary/25 bg-card overflow-visible",
          "shadow-[0_14px_38px_-20px_rgba(0,0,0,0.4)]",
          tilt.active && "shadow-[0_38px_70px_-28px_color-mix(in_oklab,var(--primary)_50%,transparent)]",
          "transition-shadow duration-500"
        )}
      >
        {/* pointer-following gold sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(480px circle at ${tilt.sheen}% 18%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 65%)`,
          }}
        />

        {/* media depth layer — floats above the card; while hovered it swings
            continuously (taj-exclusive-swing, gated by .group:hover + reduced-motion)
            so the shopper can inspect the product from both sides */}
        <div
          style={{ transform: "translateZ(34px)", transformStyle: "preserve-3d" }}
          className={cn(
            "relative m-3 rounded-2xl overflow-hidden bg-gradient-to-b from-primary/8 via-muted/50 to-muted/10 transition-transform duration-500",
            !reduced && "exclusive-media-swing"
          )}
        >
          <Link href={`/products/${product.slug}`} aria-label={product.name} className="block">
            <span className="relative block aspect-[4/3] zoom-media">
              {product.mainImage ? (
                <Image
                  src={product.mainImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                  className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <span className="grid h-full place-items-center text-muted-foreground">
                  <Package className="h-12 w-12" />
                </span>
              )}
            </span>
          </Link>

          {/* exclusive chip — gold, raised above the media */}
          <span
            style={{ transform: "translateZ(46px)" }}
            className="absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full gold-surface text-primary-foreground px-3 py-1.5 text-[10px] font-black shadow-lg"
          >
            <Gem className="h-3 w-3" />
            انحصاری تاج
          </span>

          {/* discount badge */}
          {product.discountPercent > 0 && (
            <span
              style={{ transform: "translateZ(42px)" }}
              className="absolute top-3 end-3 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black text-white shadow-lg"
            >
              {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
            </span>
          )}

          {/* 3D viewing chip — spins its icon on hover */}
          <span
            style={{ transform: "translateZ(40px)" }}
            className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[10px] font-bold text-primary shadow-md border border-primary/30"
          >
            <Rotate3d className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" />
            نمای سه‌بعدی
          </span>

          {/* floating quick actions */}
          <div
            style={{ transform: "translateZ(50px)" }}
            className="absolute bottom-3 end-3 flex flex-col gap-1.5 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
          >
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
        <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            {product.brand && (
              <>
                <BadgeCheck className="h-3 w-3 text-primary" />
                <span className="truncate">{product.brand.name}</span>
              </>
            )}
            <span className="ms-auto shrink-0 rounded-full bg-primary/10 px-2 py-px font-bold text-primary">
              {product.category?.name}
            </span>
          </div>

          <Link href={`/products/${product.slug}`} className="mt-2">
            <h3 className="text-[14px] font-extrabold leading-7 line-clamp-2 min-h-14 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-semibold text-foreground">
              {product.rating > 0 ? product.rating.toLocaleString("fa-IR") : "جدید"}
            </span>
            {!!product.reviewCount && <span>({product.reviewCount.toLocaleString("fa-IR")} نظر)</span>}
            {product.soldCount > 0 && (
              <span className="ms-auto inline-flex items-center gap-0.5 font-bold text-primary">
                {product.soldCount.toLocaleString("fa-IR")} فروش موفق
              </span>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-dashed border-primary/20 mt-4">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {product.discountPercent > 0 && (
                  <p className="text-[11px] text-muted-foreground price-old tabular-nums leading-4">
                    {formatPrice(product.price)}
                  </p>
                )}
                <p className="text-[16px] font-black text-primary tabular-nums leading-7">
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
                  "h-10 px-4 gap-1.5 rounded-xl gold-surface text-primary-foreground font-bold shadow-md transition-transform hover:scale-[1.03] active:scale-95",
                  justAdded && "bg-emerald-500 text-white hover:bg-emerald-500"
                )}
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" /> افزوده شد
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    {product.inStock ? "افزودن به سبد" : "ناموجود"}
                  </>
                )}
              </Button>
            </div>
            {!product.inStock && (
              <p className="mt-2.5 rounded-lg bg-destructive/10 px-2 py-1 text-center text-[10.5px] font-bold text-destructive">
                فعلاً ناموجود — برای اطلاع از موجودی با پشتیبانی در تماس باشید
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Responsive grid of exclusive 3D-viewing cards (1 / 2 / 3 columns). */
export function ExclusiveShowcase({ products }: { products: TemplateProduct[] }) {
  if (products.length === 0) return null;
  return (
    <div
      role="list"
      aria-label="محصولات انحصاری با نمای سه‌بعدی"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      {products.map((p) => (
        <Exclusive3DCard key={p.id} product={p} />
      ))}
    </div>
  );
}

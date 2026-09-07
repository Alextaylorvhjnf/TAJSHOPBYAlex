"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, useWishlist } from "@/hooks/use-store";
import { useChatStore, useCompareStore } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Heart, ShoppingCart, Eye, Sparkles, Star, GitCompareArrows, Package, BadgeCheck, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  stock: number;
  inStock: boolean;
  rating: number;
  reviewCount?: number;
  mainImage: string | null;
  colors?: { name: string; hex?: string }[];
  brand?: { name: string; slug: string };
  category?: { name: string; slug: string };
  shortDescription?: string | null;
  isSpecial?: boolean;
  featured?: boolean;
};

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-6 w-28 rounded" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
      <span className="font-semibold text-foreground">{rating > 0 ? rating.toLocaleString("fa-IR") : "جدید"}</span>
      {count ? <span>({count.toLocaleString("fa-IR")} نظر)</span> : null}
    </span>
  );
}

export function ProductCard({ product, className }: { product: ProductCardData; className?: string }) {
  const { add } = useCart();
  const { toggle: toggleWish, wishlist } = useWishlist();
  const consultProduct = useChatStore((s) => s.consultProduct);
  const compare = useCompareStore();
  const [quickView, setQuickView] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [wishPop, setWishPop] = useState(0); // increments per toggle → key remount + animation
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const inWishlist = (wishlist ?? []).some((w) => w.id === product.id);
  const inCompare = compare.ids.includes(product.id);
  const selectedColor = product.colors?.[0]?.name ?? null;

  const addToCart = async () => {
    if (!product.inStock || adding) return;
    try {
      setAdding(true);
      await add.mutateAsync({ productId: product.id, quantity: 1, color: selectedColor });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 600);
    } catch {
      /* toast handled by the useCart hook */
    } finally {
      setAdding(false);
    }
  };

  const onWishlist = async () => {
    setWishBusy(true);
    try {
      await toggleWish.mutateAsync(product.id);
      setWishPop((n) => n + 1);
    } finally {
      setWishBusy(false);
    }
  };

  return (
    <>
      <article
        className={cn(
          "group relative rounded-2xl border bg-card overflow-hidden card-hover flex flex-col",
          !product.inStock && "grayscale-[0.4]",
          className
        )}
      >
        {/* badges */}
        <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
          {product.discountPercent > 0 && (
            <Badge className="bg-destructive text-white shadow-sm font-bold tabular-nums">
              {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
            </Badge>
          )}
          {product.isSpecial && (
            <Badge className="gold-surface text-primary-foreground shadow-sm font-bold">پیشنهاد ویژه</Badge>
          )}
          {!product.inStock && (
            <Badge variant="secondary" className="shadow-sm font-bold">ناموجود</Badge>
          )}
        </div>

        {/* wishlist + compare (always visible quick actions) */}
        <div className="absolute top-3 end-3 z-10 flex flex-col gap-1.5">
          <button
            onClick={onWishlist}
            disabled={wishBusy}
            aria-label={inWishlist ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            aria-pressed={inWishlist}
            className={cn(
              "grid place-items-center h-9 w-9 rounded-full glass shadow-sm transition-all hover:scale-110",
              inWishlist && "text-destructive"
            )}
          >
            <Heart
              key={`${product.id}-${wishPop}`}
              className={cn("h-4 w-4", inWishlist && "fill-destructive", wishPop > 0 && "animate-heart-pop")}
            />
          </button>
          <button
            onClick={() => {
              compare.toggle(product.id);
              toast.success(inCompare ? "از مقایسه حذف شد" : compare.ids.length >= 3 && !inCompare ? "حداکثر ۳ محصول قابل مقایسه است" : "به مقایسه اضافه شد");
            }}
            aria-label="افزودن به مقایسه"
            title="افزودن به مقایسه"
            className={cn(
              "grid place-items-center h-9 w-9 rounded-full glass shadow-sm transition-all hover:scale-110",
              inCompare && "text-primary"
            )}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
        </div>

        {/* image — zoom-media handles hover zoom (GPU transform) */}
        <Link
          href={`/products/${product.slug}`}
          className="zoom-media block relative aspect-square bg-muted/40 overflow-hidden"
          aria-label={product.name}
        >
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-4"
              loading="lazy"
            />
          ) : (
            <span className="grid h-full place-items-center text-muted-foreground">
              <Package className="h-12 w-12" />
            </span>
          )}
        </Link>

        {/* quick view on hover */}
        <button
          onClick={() => setQuickView(true)}
          className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 bg-foreground/85 text-background backdrop-blur text-xs font-medium py-2 flex items-center justify-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" /> مشاهده سریع
        </button>

        {/* body */}
        <div className="flex flex-col flex-1 p-4 pt-3">
          <div className="mb-1 flex items-center gap-2">
            {product.brand && (
              <span className="min-w-0 truncate text-[11px] text-muted-foreground flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
                {product.brand.name}
              </span>
            )}
            {product.inStock && (
              <span className="ms-auto shrink-0 rounded-full bg-primary/10 px-2 py-px text-[9px] font-bold text-primary">
                موجود
              </span>
            )}
          </div>
          <Link href={`/products/${product.slug}`} className="text-[13px] font-medium leading-6 line-clamp-2 min-h-12 hover:text-primary transition-colors">
            {product.name}
          </Link>

          <div className="mt-2 flex items-center justify-between">
            <Stars rating={product.rating} count={product.reviewCount} />
            {product.colors && product.colors.length > 0 && (
              <span className="flex items-center gap-1">
                {product.colors.slice(0, 4).map((c, i) => (
                  <span
                    key={i}
                    title={c.name}
                    className="h-3 w-3 rounded-full border border-border shadow-inner"
                    style={{ background: c.hex ?? "var(--muted)" }}
                  />
                ))}
              </span>
            )}
          </div>

          <div className="mt-3 flex-1" />

          {/* price */}
          <div className="mb-3">
            {product.discountPercent > 0 ? (
              <>
                <p className="text-xs text-muted-foreground price-old tabular-nums">
                  {formatPrice(product.price)} تومان
                </p>
                <p className="text-[15px] font-extrabold text-primary tabular-nums">
                  {formatPrice(product.effectivePrice)}
                  <span className="text-[11px] font-normal text-muted-foreground"> تومان</span>
                </p>
              </>
            ) : (
              <p className="text-[15px] font-extrabold tabular-nums">
                {formatPrice(product.price)}
                <span className="text-[11px] font-normal text-muted-foreground"> تومان</span>
              </p>
            )}
          </div>

          {/* actions */}
          <div className="flex gap-1.5">
            <Button
              onClick={addToCart}
              disabled={!product.inStock || adding}
              className={cn(
                "flex-1 h-9 rounded-lg gold-surface text-primary-foreground hover:opacity-90 text-xs font-bold",
                justAdded && "animate-badge-pop"
              )}
            >
              {justAdded ? <Check className="h-4 w-4 me-1" /> : <ShoppingCart className="h-4 w-4 me-1" />}
              {product.inStock ? (justAdded ? "افزوده شد" : "افزودن به سبد") : "ناموجود"}
            </Button>
            <Button
              onClick={() => consultProduct({ id: product.id, name: product.name, slug: product.slug })}
              variant="outline"
              className="h-9 rounded-lg border-primary/40 text-primary hover:bg-primary/10 hover:text-primary text-xs font-bold"
              title="مشاوره با دستیار هوشمند"
              aria-label={`مشاوره خرید ${product.name}`}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </article>

      {/* quick view dialog */}
      <Dialog open={quickView} onOpenChange={setQuickView}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>مشاهده سریع {product.name}</DialogTitle>
            <DialogDescription>مشاهده سریع محصول</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/40">
              {product.mainImage ? (
                <Image src={product.mainImage} alt={product.name} fill sizes="300px" className="object-contain p-4" />
              ) : (
                <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-16 w-16" /></span>
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] text-muted-foreground mb-1">{product.brand?.name}</p>
              <h3 className="text-sm font-bold leading-6">{product.name}</h3>
              <div className="mt-2"><Stars rating={product.rating} count={product.reviewCount} /></div>
              {product.shortDescription && (
                <p className="mt-3 text-xs leading-6 text-muted-foreground line-clamp-4">{product.shortDescription}</p>
              )}
              <div className="mt-3">
                {product.discountPercent > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground price-old tabular-nums">{formatPrice(product.price)} تومان</p>
                    <p className="text-lg font-extrabold text-primary tabular-nums">{formatPrice(product.effectivePrice)} تومان</p>
                  </>
                ) : (
                  <p className="text-lg font-extrabold tabular-nums">{formatPrice(product.price)} تومان</p>
                )}
              </div>
              <div className="mt-auto pt-4 flex flex-col gap-2">
                <Button onClick={addToCart} disabled={!product.inStock} className="gold-surface text-primary-foreground hover:opacity-90 h-10 rounded-lg">
                  <ShoppingCart className="h-4 w-4 me-1.5" />
                  {product.inStock ? "افزودن به سبد خرید" : "ناموجود"}
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-lg">
                  <Link href={`/products/${product.slug}`}>مشاهده صفحه محصول</Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

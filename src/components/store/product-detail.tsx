"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useCart, useWishlist } from "@/hooks/use-store";
import { useChatStore, useCompareStore } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Heart, Sparkles, Zap, Star, GitCompareArrows, Package, Truck, ShieldCheck, ChevronLeft, Minus, Plus,
  Check, Loader2, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type P = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  stock: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  mainImage: string | null;
  images: { url: string; alt?: string }[];
  colors: { name: string; hex?: string; price?: number }[];
  /** v19: selectable options with their own price (e.g. capacity) */
  variants: { name: string; priceDelta: number; stock: number }[];
  /** v20: SIMPLE | VARIABLE — VARIABLE products may carry a combination matrix */
  productType?: "SIMPLE" | "VARIABLE";
  /** v20: exact per color×spec combination prices (VARIABLE products only;
   *  empty/missing = the v19 legacy color/delta rules apply).
   *  v26fix: rows may carry their own discountPrice — when 0 < discountPrice < price
   *  it becomes that row's unit price (old price struck through). */
  combinations?: { color: string | null; variant: string | null; price: number; stock?: number; discountPrice?: number }[];
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
};

export function ProductGallery({ product }: { product: P }) {
  const images = product.images.length > 0 ? product.images : product.mainImage ? [{ url: product.mainImage }] : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const activeImage = images[active]?.url ?? product.mainImage;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-muted/40 border cursor-crosshair"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMouseMove}
      >
        {activeImage ? (
          <Image
            src={activeImage}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6 transition-transform duration-200"
            style={zoom ? { transform: "scale(1.8)", transformOrigin: origin } : undefined}
          />
        ) : (
          <span className="grid h-full place-items-center text-muted-foreground">
            <Package className="h-20 w-20" />
          </span>
        )}
        {product.discountPercent > 0 && (
          <Badge className="absolute top-4 start-4 bg-destructive text-white font-bold shadow">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </Badge>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`تصویر ${i + 1}`}
              className={cn(
                "relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 bg-muted/40 transition-all",
                i === active ? "border-primary" : "border-transparent hover:border-border"
              )}
            >
              <Image src={img.url} alt={img.alt ?? product.name} fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BuyBox({ product }: { product: P }) {
  const { add } = useCart();
  const { toggle: toggleWish, wishlist } = useWishlist();
  const consultProduct = useChatStore((s) => s.consultProduct);
  const router = useRouter();
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  /* v19: variant option (e.g. capacity/spec) — default to the first that has stock */
  const [variant, setVariant] = useState<string | null>(
    (product.variants.find((v) => v.stock > 0) ?? product.variants[0])?.name ?? null
  );
  const [qty, setQty] = useState(1);

  const inWishlist = (wishlist ?? []).some((w) => w.id === product.id);

  /* v19: the selected variant may carry its own stock ceiling */
  const selectedVariant = product.variants.find((v) => v.name === variant) ?? null;
  const variantStock = selectedVariant && selectedVariant.stock > 0 ? selectedVariant.stock : null;

  /* ── v20: per-combination pricing (VARIABLE products with a matrix) ──
   *  The exact (selected color × selected variant) row wins: combo.price is
   *  the EXACT unit price and combo.stock is the availability ceiling
   *  (0 = ناموجود). No exact row (or no matrix at all) → the v19 legacy
   *  rules below keep working untouched. */
  const combos =
    product.productType === "VARIABLE" && product.combinations && product.combinations.length > 0
      ? product.combinations
      : null;
  const activeCombo = combos
    ? combos.find((c) => (c.color ?? null) === (color ?? null) && (c.variant ?? null) === (variant ?? null)) ?? null
    : null;
  const comboStock = activeCombo && typeof activeCombo.stock === "number" ? activeCombo.stock : null;
  const comboOut = activeCombo !== null && comboStock === 0;

  /* v20 chip availability: with a matrix, a color/variant chip is ناموجود only
   * when ALL of its combination rows are stock 0 (rows without stock =
   * unknown → still selectable). Without a matrix → the v19 rules. */
  const colorOutOfStock = (name: string) => {
    if (!combos) return false;
    const rows = combos.filter((c) => c.color === name);
    return rows.length > 0 && rows.every((c) => c.stock === 0);
  };
  const variantOutOfStock = (name: string) => {
    if (!combos) return false;
    const rows = combos.filter((c) => c.variant === name);
    return rows.length > 0 && rows.every((c) => c.stock === 0);
  };

  const maxQty = comboOut
    ? 1
    : comboStock != null && comboStock > 0
      ? Math.max(1, Math.min(comboStock, product.stock))
      : Math.max(1, variantStock ?? product.stock);

  /** clamp helper — min 1, max available stock (never 0 / negative / > stock) */
  const clampQty = (v: number) => Math.max(1, Math.min(maxQty, Math.round(v) || 1));
  const setQuantity = (v: number) => setQty(clampQty(v));

  /* v19 per-option pricing + v20 combination override:
   * - v20: an exact (color × variant) matrix row is the EXACT unit price
   * - v19: a color with its own price OVERRIDES the base effective price
   * - v19: a selected option (variant) adds its priceDelta on top
   * - the API recomputes the same value server-side (single source of truth) */
  const selectedColor = product.colors.find((c) => c.name === color) ?? null;
  const colorPrice = selectedColor?.price ?? null;
  const variantDelta = selectedVariant?.priceDelta ?? 0;
  /* v26fix: the exact combination may carry its OWN discount — when
   * discountPrice is a number with 0 < it < price it becomes the unit price
   * (old price struck through + live percent badge below, mirroring the
   * product-level discount; the cart API enforces the exact same rule). */
  const comboDiscount =
    activeCombo &&
    typeof activeCombo.discountPrice === "number" &&
    activeCombo.discountPrice > 0 &&
    activeCombo.discountPrice < activeCombo.price
      ? activeCombo.discountPrice
      : null;
  const unitPrice = activeCombo
    ? comboDiscount ?? activeCombo.price
    : Math.max(0, (colorPrice ?? product.effectivePrice) + variantDelta);
  /* total = unit price × quantity — updates instantly with qty changes */
  const totalPrice = unitPrice * qty;
  /* v20: an exact combination price replaces the base discount display;
   *  v26fix: a per-combination discount shows its own saving amount */
  const saving = activeCombo
    ? comboDiscount != null
      ? (activeCombo.price - comboDiscount) * qty
      : 0
    : colorPrice == null
      ? (product.price - product.effectivePrice) * qty
      : 0;

  const addToCart = () => {
    if (!product.stock) return;
    if (comboOut) {
      toast.error("این ترکیب (رنگ × مشخصه) فعلاً ناموجود است");
      return;
    }
    if (!activeCombo && selectedVariant && selectedVariant.stock <= 0) {
      toast.error("این گزینه فعلاً ناموجود است");
      return;
    }
    if (qty > maxQty) {
      toast.error(`حداکثر ${maxQty.toLocaleString("fa-IR")} عدد موجود است`);
      return;
    }
    add.mutate({ productId: product.id, quantity: qty, color, variant });
  };

  const buyNow = async () => {
    if (!product.stock) return;
    if (comboOut) {
      toast.error("این ترکیب (رنگ × مشخصه) فعلاً ناموجود است");
      return;
    }
    if (!activeCombo && selectedVariant && selectedVariant.stock <= 0) {
      toast.error("این گزینه فعلاً ناموجود است");
      return;
    }
    if (qty > maxQty) {
      toast.error(`حداکثر ${maxQty.toLocaleString("fa-IR")} عدد موجود است`);
      return;
    }
    try {
      // wait for the cart mutation so the cart page always shows the item
      await add.mutateAsync({ productId: product.id, quantity: qty, color, variant });
      router.push("/cart");
    } catch {
      /* toast already shown by the mutation */
    }
  };

  return (
    <div className="space-y-5">
      {/* rating + sold */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-border"
              )}
            />
          ))}
          <span className="font-bold text-foreground ms-1">
            {product.rating > 0 ? product.rating.toLocaleString("fa-IR") : "جدید"}
          </span>
          {product.reviewCount > 0 && <span>({product.reviewCount.toLocaleString("fa-IR")} دیدگاه)</span>}
        </span>
        {product.soldCount > 5 && (
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
            {product.soldCount.toLocaleString("fa-IR")} فروش موفق
          </span>
        )}
      </div>

      {/* colors — v19: options with a dedicated price show it live */}
      {product.colors.length > 0 && (
        <div>
          <p className="text-[13px] font-bold mb-2">
            رنگ: <span className="text-muted-foreground font-medium">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => {
              /* v20: ناموجود when ALL combinations of this color are stock 0 */
              const out = colorOutOfStock(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  disabled={out}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all",
                    color === c.name ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40",
                    out && "opacity-40 cursor-not-allowed line-through"
                  )}
                >
                  <span className="h-4 w-4 rounded-full border shadow-inner" style={{ background: c.hex ?? "#999" }} />
                  {c.name}
                  {typeof c.price === "number" && c.price > 0 && !combos && (
                    <span className={cn("text-[10px] font-bold tabular-nums", color === c.name ? "text-primary" : "text-muted-foreground")}>
                      {formatPrice(c.price)} تومان
                    </span>
                  )}
                  {out && <span className="text-[9px] font-black text-destructive">ناموجود</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* v19 — variant options (different specs, different price) */}
      {product.variants.length > 0 && (
        <div>
          <p className="text-[13px] font-bold mb-2">
            انتخاب مشخصه: <span className="text-muted-foreground font-medium">{variant}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              /* v20: ناموجود when ALL combinations of this variant are stock 0 */
              const out = combos ? variantOutOfStock(v.name) : v.stock <= 0;
              const active = variant === v.name;
              return (
                <button
                  key={v.name}
                  onClick={() => setVariant(v.name)}
                  disabled={out}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                    active ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40",
                    out && "opacity-40 cursor-not-allowed line-through"
                  )}
                  aria-pressed={active}
                >
                  {v.name}
                  {v.priceDelta !== 0 && !combos && (
                    <span className={cn("text-[10px] font-bold tabular-nums", active ? "text-primary" : "text-muted-foreground")}>
                      {v.priceDelta > 0 ? "+" : "−"}{formatPrice(Math.abs(v.priceDelta))}
                    </span>
                  )}
                  {out && <span className="text-[9px] font-black text-destructive">ناموجود</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* stock + qty */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {product.stock > 0 ? (
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              موجود در انبار ({product.stock.toLocaleString("fa-IR")} عدد)
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              فعلاً ناموجود
            </p>
          )}
        </div>
        {product.stock > 0 && (
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1" role="group" aria-label="انتخاب تعداد">
            <button
              onClick={() => setQuantity(qty - 1)}
              disabled={qty <= 1}
              className="grid place-items-center h-9 w-9 rounded-lg hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="کاهش تعداد"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value === "" || Number.isNaN(v)) return; // let the user clear mid-edit
                setQuantity(v);
              }}
              onBlur={(e) => {
                // normalize on blur (empty → 1, out-of-range → clamp)
                setQuantity(Number(e.target.value));
              }}
              aria-label="تعداد"
              className="w-12 bg-transparent text-center text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary/30 rounded-lg py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={() => setQuantity(qty + 1)}
              disabled={qty >= maxQty}
              className="grid place-items-center h-9 w-9 rounded-lg hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="افزایش تعداد"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* price — total = unit price × quantity (live) */}
      <div className="rounded-2xl border bg-card p-5 space-y-2">
        {activeCombo && comboDiscount != null ? (
          /* v26fix: per-combination discount — old price struck-through + live percent */
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground price-old tabular-nums">
              {formatPrice(activeCombo.price)} تومان
            </p>
            <Badge className="bg-destructive/15 text-destructive font-bold border-0 shrink-0">
              {Math.round(((activeCombo.price - comboDiscount) / activeCombo.price) * 100).toLocaleString("fa-IR")}٪ تخفیف
            </Badge>
          </div>
        ) : (product.discountPercent > 0 && colorPrice == null && !activeCombo) && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground price-old tabular-nums">
              {formatPrice(product.price + variantDelta)} تومان
            </p>
            <Badge className="bg-destructive/15 text-destructive font-bold border-0 shrink-0">
              {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
            </Badge>
          </div>
        )}
        <div className="flex items-end justify-between gap-3">
          <div>
            {qty > 1 && (
              <p className="text-[11px] text-muted-foreground mb-1 tabular-nums">
                {formatPrice(unitPrice)} × {qty.toLocaleString("fa-IR")}
              </p>
            )}
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-primary tabular-nums leading-none">
                {formatPrice(totalPrice)}
              </p>
              <span className="text-xs text-muted-foreground mb-1">تومان</span>
            </div>
          </div>
          {saving > 0 && (
            <Badge className="bg-primary/10 text-primary font-bold border-0 shrink-0">
              {formatPrice(saving)} تومان سود شما
            </Badge>
          )}
        </div>
        <p className="text-[10.5px] text-muted-foreground pt-1 border-t">
          {(activeCombo || colorPrice != null || variantDelta !== 0) && "قیمت برای انتخاب فعلی — "}
          {qty > 1 ? "مبلغ قابل پرداخت برای کل تعداد" : "مبلغ قابل پرداخت"}
        </p>
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          onClick={addToCart}
          disabled={!product.stock || add.isPending}
          className="h-12 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 font-bold"
          variant="outline"
        >
          <ShoppingCart className="h-5 w-5 me-2" />
          افزودن به سبد
        </Button>
        <Button
          onClick={buyNow}
          disabled={!product.stock}
          className="h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold shadow-lg"
        >
          <Zap className="h-5 w-5 me-2" />
          خرید سریع
        </Button>
      </div>

      {/* AI consult + wishlist + compare */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => consultProduct({ id: product.id, name: product.name, slug: product.slug })}
        className="w-full h-12 rounded-xl bg-gradient-to-l from-primary/20 via-primary/10 to-transparent border border-primary/40 flex items-center justify-center gap-2 text-[13px] font-bold text-primary hover:bg-primary/15 transition-colors"
      >
        <Sparkles className="h-5 w-5" />
        مشاوره با دستیار هوشمند این محصول
      </motion.button>

      <div className="grid grid-cols-2 gap-2.5">
        <Button
          variant="outline"
          onClick={() => toggleWish.mutate(product.id)}
          className={cn("h-10 rounded-xl", inWishlist && "text-destructive border-destructive/40")}
        >
          <Heart className={cn("h-4 w-4 me-1.5", inWishlist && "fill-destructive")} />
          {inWishlist ? "در علاقه‌مندی‌ها" : "علاقه‌مندی"}
        </Button>
        {/* v23: مقایسه now opens the compare dialog — manual table compare
            + AI smart compare (previously a dead toggle with no feedback) */}
        <CompareDialog product={product} />
      </div>

      {/* trust */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: ShieldCheck, label: "اصالت کالا" },
          { icon: Truck, label: "ارسال سریع" },
          { icon: Zap, label: "پرداخت امن" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border bg-card py-3 px-2">
            <t.icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
            <p className="text-[11px] font-medium text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        شناسه کالا: <span dir="ltr" className="font-mono">{product.sku}</span>
      </p>
    </div>
  );
}

/* ── v23: COMPARE DIALOG ───────────────────────────────────────────
 * The مقایسه button now WORKS: it opens a dialog offering
 *  ① مقایسه دستی — pick rivals (max 3 total) → /compare table page
 *  ② مقایسه هوشمند — pick ONE rival → the AI widget compares both from
 *     real store data (LLM path + deterministic fallback)
 * ─────────────────────────────────────────────────────────────── */
function CompareDialog({ product }: { product: P }) {
  const compare = useCompareStore();
  const compareProducts = useChatStore((s) => s.compareProducts);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [aiPick, setAiPick] = useState<string | null>(null);
  const inList = compare.ids.includes(product.id);

  /* rivals = best-sellers from the SAME category (real products, live data) */
  const { data, isLoading } = useQuery({
    queryKey: ["compare-rivals", product.category.slug, product.id],
    queryFn: () =>
      fetch(`/api/products?category=${product.category.slug}&sort=bestselling&limit=24`).then((r) => r.json()) as Promise<{
        items: { id: string; name: string; slug: string; effectivePrice: number; mainImage: string | null; stock: number }[];
      }>,
    enabled: open,
    staleTime: 60_000,
  });
  const rivals = (data?.items ?? []).filter((p) => p.id !== product.id).slice(0, 10);

  const toggleId = (id: string, name: string) => {
    const ids = compare.ids;
    if (ids.includes(id)) {
      compare.toggle(id);
      toast.info(`«${name}» از لیست مقایسه حذف شد`);
      return;
    }
    if (ids.length >= 3) {
      toast.error("حداکثر ۳ محصول قابل مقایسه است — اول یکی را حذف کنید");
      return;
    }
    compare.toggle(id);
    toast.success(`«${name}» به مقایسه اضافه شد (${Math.min(ids.length + 1, 3).toLocaleString("fa-IR")} از ۳)`);
  };

  const goComparePage = () => {
    if (!inList) compare.toggle(product.id); // always include the current product
    setOpen(false);
    router.push("/compare");
  };

  const runAiCompare = () => {
    const rival = rivals.find((r) => r.id === aiPick);
    if (!rival) {
      toast.error("اول یک محصول برای مقایسه انتخاب کنید");
      return;
    }
    setOpen(false);
    compareProducts(
      { id: product.id, name: product.name, slug: product.slug },
      { id: rival.id, name: rival.name, slug: rival.slug }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("h-10 rounded-xl w-full", inList && "border-primary/50 text-primary")}>
          <GitCompareArrows className="h-4 w-4 me-1.5" />
          {inList ? "در لیست مقایسه" : "مقایسه"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            مقایسه «{product.name}»
          </DialogTitle>
          <DialogDescription className="text-xs leading-6">
            رقیب‌ها را از همین دسته انتخاب کنید — یا مقایسه را به دستیار هوشمند بسپارید.
          </DialogDescription>
        </DialogHeader>

        {/* ① manual compare */}
        <section className="space-y-3" aria-label="مقایسه دستی">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-extrabold flex items-center gap-1.5">
              <span className="grid place-items-center h-6 w-6 rounded-lg bg-primary/12 text-primary text-[11px] font-black">۱</span>
              مقایسه دستی (جدول مشخصات)
            </p>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {compare.ids.length.toLocaleString("fa-IR")} از ۳ انتخاب شده
            </span>
          </div>

          {/* current product row */}
          <button
            onClick={() => toggleId(product.id, product.name)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-2.5 text-start transition-colors",
              inList ? "border-primary/50 bg-primary/5" : "hover:border-primary/40"
            )}
            aria-pressed={inList}
          >
            <span className="relative h-12 w-12 shrink-0 rounded-lg bg-muted/50 overflow-hidden">
              {product.mainImage ? (
                <Image src={product.mainImage} alt={product.name} fill sizes="48px" className="object-contain p-1" />
              ) : (
                <Package className="h-5 w-5 m-3.5 text-muted-foreground" />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold line-clamp-1">{product.name}</span>
              <span className="text-[10px] text-muted-foreground">این محصول — {formatPrice(product.effectivePrice)} تومان</span>
            </span>
            <span className={cn("grid place-items-center h-5 w-5 rounded-md border shrink-0", inList ? "bg-primary text-primary-foreground border-primary" : "")}>
              {inList && <Check className="h-3.5 w-3.5" />}
            </span>
          </button>

          {/* rivals */}
          {isLoading ? (
            <div className="h-24 grid place-items-center rounded-xl border border-dashed">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rivals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-dashed leading-6">
              محصول دیگری در «{product.category.name}» موجود نیست.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {rivals.map((r) => {
                const sel = compare.ids.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleId(r.id, r.name)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border p-2.5 text-start transition-colors",
                      sel ? "border-primary/50 bg-primary/5" : "hover:border-primary/40"
                    )}
                    aria-pressed={sel}
                  >
                    <span className="relative h-12 w-12 shrink-0 rounded-lg bg-muted/50 overflow-hidden">
                      {r.mainImage ? (
                        <Image src={r.mainImage} alt={r.name} fill sizes="48px" className="object-contain p-1" />
                      ) : (
                        <Package className="h-5 w-5 m-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold line-clamp-1">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatPrice(r.effectivePrice)} تومان — {r.stock > 0 ? "موجود" : "ناموجود"}</span>
                    </span>
                    <span className={cn("grid place-items-center h-5 w-5 rounded-md border shrink-0", sel ? "bg-primary text-primary-foreground border-primary" : "")}>
                      {sel && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Button onClick={goComparePage} className="w-full h-11 rounded-xl font-bold" disabled={compare.ids.length === 0}>
            <GitCompareArrows className="h-4 w-4 me-1.5" />
            مشاهده جدول مقایسه
            {compare.ids.length > 0 && ` (${compare.ids.length.toLocaleString("fa-IR")})`}
          </Button>
        </section>

        {/* ② AI compare */}
        <section className="space-y-3 pt-2 border-t" aria-label="مقایسه با هوش مصنوعی">
          <p className="text-[13px] font-extrabold flex items-center gap-1.5">
            <span className="grid place-items-center h-6 w-6 rounded-lg bg-primary/12 text-primary text-[11px] font-black">۲</span>
            مقایسه با دستیار هوشمند
          </p>
          <p className="text-[11px] text-muted-foreground leading-6 -mt-1.5">
            یک رقیب انتخاب کنید؛ دستیار تفاوت‌ها، نقاط قوت و انتخاب نهایی را از داده‌های واقعی فروشگاه تحلیل می‌کند.
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {rivals.slice(0, 5).map((r) => (
              <button
                key={r.id}
                onClick={() => setAiPick(r.id === aiPick ? null : r.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-start text-xs font-medium transition-colors",
                  aiPick === r.id ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"
                )}
                aria-pressed={aiPick === r.id}
              >
                <Crown className={cn("h-4 w-4 shrink-0", aiPick === r.id ? "text-primary" : "text-muted-foreground/50")} />
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{formatPrice(r.effectivePrice)} تومان</span>
              </button>
            ))}
          </div>
          <Button
            onClick={runAiCompare}
            disabled={!aiPick}
            className="w-full h-11 rounded-xl font-bold bg-gradient-to-l from-primary/25 via-primary/15 to-primary/5 border border-primary/40 text-primary hover:from-primary/30"
          >
            <Sparkles className="h-4 w-4 me-1.5" />
            مقایسه هوشمند
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export function ProductBreadcrumb({ product }: { product: P }) {
  return (
    <nav aria-label="مسیر" className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <Link href="/" className="hover:text-primary transition-colors">خانه</Link>
      <ChevronLeft className="h-3 w-3" />
      <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary transition-colors">
        {product.category.name}
      </Link>
      <ChevronLeft className="h-3 w-3" />
      <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
    </nav>
  );
}

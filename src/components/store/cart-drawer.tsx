"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, type CartItemDTO } from "@/hooks/use-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Trash2, Plus, Minus, Package, BadgeCheck, LogIn, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mini-cart side drawer (user request v15): tapping the basket icon in the
 * header opens a slide-in cart panel from the side (physical left edge — the
 * same side the basket icon lives on in the RTL header) instead of forcing a
 * full-page navigation. The shopper can review, tweak quantities and remove
 * items without leaving the current page; the full /cart page stays available
 * for the detailed flow.
 *
 * Data + mutations come from the existing useCart hook — no new API.
 */

/** count badge with pop animation on change (same behavior as the header) */
function CartCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold grid place-items-center animate-badge-pop gold-surface text-primary-foreground"
    >
      {count.toLocaleString("fa-IR")}
    </span>
  );
}

function CartItemRow({
  item,
  onUpdate,
  onRemove,
  busy,
}: {
  item: CartItemDTO;
  onUpdate: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const atMax = item.stock > 0 && item.quantity >= item.stock;
  return (
    <div className="flex gap-3 p-3.5 border-b border-border/60 last:border-0">
      <Link
        href={`/products/${item.slug}`}
        className="relative h-[72px] w-[72px] shrink-0 rounded-xl overflow-hidden bg-muted/60 border"
        aria-label={item.name}
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="72px" className="object-contain p-1.5" />
        ) : (
          <span className="grid h-full place-items-center text-muted-foreground">
            <Package className="h-6 w-6" />
          </span>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${item.slug}`}
            className="text-[12.5px] font-bold leading-5 line-clamp-2 hover:text-primary transition-colors"
          >
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={busy}
            aria-label={`حذف ${item.name} از سبد`}
            className="grid place-items-center h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          {item.color && (
            <span className="rounded-full bg-muted px-1.5 py-px font-medium">{item.color}</span>
          )}
          {!item.inStock && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-px font-bold text-destructive">
              ناموجود
            </span>
          )}
          {atMax && item.inStock && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-px font-bold text-amber-600 dark:text-amber-400">
              حداکثر موجودی
            </span>
          )}
        </p>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {/* quantity stepper — min 1, max real stock */}
          <div className="flex items-center rounded-lg border bg-background h-8" role="group" aria-label="تعداد">
            <button
              type="button"
              onClick={() => onUpdate(item.id, item.quantity - 1)}
              disabled={busy || item.quantity <= 1}
              aria-label="کاهش تعداد"
              className="grid place-items-center h-full w-8 rounded-s-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center text-[12px] font-bold tabular-nums">
              {item.quantity.toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              onClick={() => onUpdate(item.id, item.quantity + 1)}
              disabled={busy || atMax || !item.inStock}
              aria-label="افزایش تعداد"
              className="grid place-items-center h-full w-8 rounded-e-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-end leading-5">
            {item.oldUnitPrice && (
              <p className="text-[10px] text-muted-foreground price-old tabular-nums">
                {formatPrice(item.oldUnitPrice)}
              </p>
            )}
            <p className="text-[13px] font-extrabold text-primary tabular-nums">
              {formatPrice(item.lineTotal)}
              <span className="text-[9px] font-normal text-muted-foreground"> تومان</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawerBody({ onNavigate }: { onNavigate: () => void }) {
  const { cart, isLoading, update, remove } = useCart();
  const items = cart?.items ?? [];
  const busy = update.isPending || remove.isPending;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-[72px] w-[72px] rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-3 w-2/5 rounded" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <span className="grid place-items-center h-20 w-20 rounded-3xl bg-primary/10 text-primary mb-4">
          <ShoppingCart className="h-9 w-9" />
        </span>
        <p className="text-sm font-extrabold">سبد خرید شما خالی است</p>
        <p className="mt-2 text-xs text-muted-foreground leading-6">
          هنوز محصولی به سبد اضافه نکرده‌اید.
          <br />
          از میان محصولات فروشگاه انتخاب کنید.
        </p>
        <SheetClose asChild>
          <Button asChild size="sm" className="mt-5 rounded-xl gold-surface text-primary-foreground hover:opacity-90">
            <Link href="/products" onClick={onNavigate}>
              <BadgeCheck className="h-4 w-4 me-1.5" />
              مشاهده محصولات
            </Link>
          </Button>
        </SheetClose>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((item) => (
        <CartItemRow
          key={item.id}
          item={item}
          busy={busy}
          onUpdate={(id, q) => update.mutate({ id, quantity: q })}
          onRemove={(id) => remove.mutate(id)}
        />
      ))}
    </div>
  );
}

function CartDrawerFooter({ onNavigate }: { onNavigate: () => void }) {
  const { cart } = useCart();
  const items = cart?.items ?? [];
  if (items.length === 0) return null;

  const { totals, isGuest } = cart!;

  return (
    <div className="border-t bg-card/70 p-4 space-y-3">
      {/* totals */}
      <div className="space-y-1.5 text-[12.5px]">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>جمع کالاها ({(cart!.summary.itemCount).toLocaleString("fa-IR")} قلم)</span>
          <span className="tabular-nums">{formatPrice(totals.subtotal)} تومان</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex items-center justify-between text-destructive">
            <span>تخفیف</span>
            <span className="tabular-nums">− {formatPrice(totals.discount)} تومان</span>
          </div>
        )}
        {totals.coupon?.valid && totals.coupon.discount > 0 && (
          <div className="flex items-center justify-between text-destructive">
            <span>کوپن تخفیف</span>
            <span className="tabular-nums">− {formatPrice(totals.coupon.discount)} تومان</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 border-t font-extrabold text-[14px]">
          <span>مبلغ قابل پرداخت</span>
          <span className="text-primary tabular-nums">
            {formatPrice(totals.total)}
            <span className="text-[10px] font-normal text-muted-foreground"> تومان</span>
          </span>
        </div>
      </div>

      {isGuest && (
        <p className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-3 py-2 text-[11px] font-medium text-primary">
          <LogIn className="h-3.5 w-3.5 shrink-0" />
          برای ثبت نهایی سفارش، ورود به حساب لازم است
        </p>
      )}

      {/* actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <SheetClose asChild>
          <Button asChild variant="outline" size="sm" className="h-10 rounded-xl font-bold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
            <Link href="/cart" onClick={onNavigate}>سبد کامل</Link>
          </Button>
        </SheetClose>
        <SheetClose asChild>
          <Button asChild size="sm" className="h-10 rounded-xl gold-surface text-primary-foreground font-bold hover:opacity-90">
            <Link href="/checkout" onClick={onNavigate}>
              <ShieldCheck className="h-4 w-4 me-1.5" />
              تسویه حساب
            </Link>
          </Button>
        </SheetClose>
      </div>
    </div>
  );
}

/** The header basket button — same icon/badge look, now opens the mini-cart side drawer. */
export function CartDrawerButton() {
  const [open, setOpen] = useState(false);
  const { cart } = useCart();
  const itemCount = cart?.summary.itemCount ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full relative"
          aria-label={`سبد خرید (${itemCount.toLocaleString("fa-IR")})`}
        >
          <ShoppingCart className="h-5 w-5" />
          <CartCountBadge count={itemCount} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[min(420px,92vw)] sm:max-w-[420px] p-0 gap-0 border-e flex flex-col"
      >
        {/* drawer header */}
        <div className="shrink-0 border-b bg-gradient-to-l from-primary/15 to-transparent pe-12">
          <SheetTitle className="flex items-center gap-2.5 p-4">
            <span className="grid place-items-center h-9 w-9 rounded-xl gold-surface text-primary-foreground shrink-0">
              <ShoppingCart className="h-4.5 w-4.5" />
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-extrabold">سبد خرید</span>
              <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                {itemCount > 0
                  ? `${itemCount.toLocaleString("fa-IR")} قلم کالا در سبد`
                  : "سبد خرید شما خالی است"}
              </span>
            </span>
          </SheetTitle>
        </div>

        <CartDrawerBody onNavigate={() => setOpen(false)} />
        <CartDrawerFooter onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

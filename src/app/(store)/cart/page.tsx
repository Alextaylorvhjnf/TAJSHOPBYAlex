"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/hooks/use-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Trash2, Minus, Plus, Package, ArrowLeft, ShoppingBag, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-store";

export default function CartPage() {
  const { cart, isLoading, update, remove, clear } = useCart();
  const { data: me } = useMe();

  const items = cart?.items ?? [];
  const totals = cart?.totals;
  const freeShippingGap = totals && totals.subtotal > 0 && totals.shipping > 0 ? 0 : 0;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="grid grid-cols-1 min-w-0 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-3xl border border-dashed p-16 text-center">
          <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/40 mb-5" />
          <h1 className="text-xl font-black">سبد خرید شما خالی است</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-7">
            هنوز محصولی به سبد خرید اضافه نکرده‌اید.
          </p>
          <Button asChild size="lg" className="mt-7 gold-surface text-primary-foreground hover:opacity-90 rounded-xl">
            <Link href="/products">
              <ShoppingBag className="h-5 w-5 me-2" /> شروع خرید
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black flex items-center gap-2.5">
          <ShoppingCart className="h-6 w-6 text-primary" />
          سبد خرید
          <span className="text-sm font-medium text-muted-foreground">
            ({cart?.summary.itemCount.toLocaleString("fa-IR")} قلم)
          </span>
        </h1>
        <button onClick={() => clear.mutate()} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5" /> خالی کردن سبد
        </button>
      </div>

      <div className="grid grid-cols-1 min-w-0 lg:grid-cols-[1fr_360px] gap-6">
        {/* items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={cn("rounded-2xl border bg-card p-4 flex gap-4", !item.inStock && "border-destructive/40 bg-destructive/5")}>
              <Link href={`/products/${item.slug}`} className="relative h-24 w-24 shrink-0 rounded-xl bg-muted/40 overflow-hidden">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill sizes="96px" className="object-contain p-2" />
                ) : (
                  <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-8 w-8" /></span>
                )}
              </Link>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/products/${item.slug}`} className="text-[13px] font-bold leading-6 line-clamp-2 hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                    {item.color && (
                      <p className="text-[11px] text-muted-foreground mt-1">انتخاب: {item.color}</p>
                    )}
                    {!item.inStock && (
                      <p className="text-[11px] text-destructive font-bold mt-1">موجودی کافی نیست — تعداد را کم کنید</p>
                    )}
                  </div>
                  <button
                    onClick={() => remove.mutate(item.id)}
                    aria-label="حذف از سبد"
                    className="grid place-items-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1 rounded-xl border p-1">
                    <button
                      onClick={() => update.mutate({ id: item.id, quantity: item.quantity - 1 })}
                      disabled={update.isPending}
                      className="grid place-items-center h-8 w-8 rounded-lg hover:bg-accent"
                      aria-label="کاهش"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold tabular-nums">{item.quantity.toLocaleString("fa-IR")}</span>
                    <button
                      onClick={() => update.mutate({ id: item.id, quantity: Math.min(item.stock, item.quantity + 1) })}
                      disabled={update.isPending || item.quantity >= item.stock}
                      className="grid place-items-center h-8 w-8 rounded-lg hover:bg-accent disabled:opacity-40"
                      aria-label="افزایش"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-end">
                    {item.oldUnitPrice && (
                      <p className="text-[11px] text-muted-foreground price-old tabular-nums">
                        {formatPrice(item.oldUnitPrice * item.quantity)}
                      </p>
                    )}
                    <p className="text-[15px] font-extrabold text-primary tabular-nums">
                      {formatPrice(item.lineTotal)}
                      <span className="text-[10px] font-normal text-muted-foreground"> تومان</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-32 h-fit rounded-2xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-extrabold">خلاصه سفارش</h2>

          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">جمع کل کالاها</span>
              <span className="font-bold tabular-nums">{formatPrice(totals?.subtotal)} تومان</span>
            </div>
            {(totals?.discount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>تخفیف</span>
                <span className="font-bold tabular-nums">{formatPrice(totals?.discount)} تومان</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" /> هزینه ارسال
              </span>
              <span className="font-bold tabular-nums">
                {(totals?.shipping ?? 0) === 0 ? "رایگان" : `${formatPrice(totals?.shipping)} تومان`}
              </span>
            </div>
            {(totals?.tax ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مالیات</span>
                <span className="font-bold tabular-nums">{formatPrice(totals?.tax)} تومان</span>
              </div>
            )}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-bold">مبلغ قابل پرداخت</span>
              <span className="text-lg font-black text-primary tabular-nums">
                {formatPrice(totals?.total)}
                <span className="text-[11px] font-normal text-muted-foreground"> تومان</span>
              </span>
            </div>
          </div>

          {!me?.user && (
            <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-xl p-3 leading-5">
              حساب کاربری دارید؟ <Link href="/login" className="text-primary font-bold">وارد شوید</Link> تا سبد خرید شما ذخیره شود.
            </p>
          )}

          <Button
            asChild
            size="lg"
            disabled={items.some((i) => !i.inStock)}
            className="w-full gold-surface text-primary-foreground hover:opacity-90 rounded-xl h-12 font-bold text-sm"
          >
            <Link href="/checkout">
              ادامه فرآیند خرید
              <ArrowLeft className="h-4 w-4 ms-2 me-0 rotate-180" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full rounded-xl h-11">
            <Link href="/products">ادامه خرید</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

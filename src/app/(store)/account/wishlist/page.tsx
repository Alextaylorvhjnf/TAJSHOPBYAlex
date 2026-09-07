"use client";

import { useWishlist } from "@/hooks/use-store";
import { ProductCard } from "@/components/store/product-card";
import { Loader2, Heart, PackageX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { wishlist, isLoading, toggle } = useWishlist();

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const items = wishlist ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-black flex items-center gap-2.5">
        <Heart className="h-5.5 w-5.5 h-6 w-6 text-destructive fill-destructive" />
        علاقه‌مندی‌ها
        <span className="text-sm font-medium text-muted-foreground">({items.length.toLocaleString("fa-IR")})</span>
      </h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-14 text-center">
          <PackageX className="mx-auto h-14 w-14 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-bold">لیست علاقه‌مندی‌های شما خالی است</p>
          <p className="text-xs text-muted-foreground mt-2">با کلیک روی قلب هر محصول آن را ذخیره کنید</p>
          <Button asChild className="mt-5 gold-surface text-primary-foreground rounded-xl">
            <Link href="/products">مشاهده محصولات</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                discountPrice: p.discountPrice,
                effectivePrice: p.discountPrice ?? p.price,
                discountPercent: p.discountPrice ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0,
                stock: p.stock,
                inStock: p.stock > 0,
                rating: p.rating,
                mainImage: p.mainImage,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

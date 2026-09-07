"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useCompareStore } from "@/lib/stores";
import { useChatStore } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { GitCompareArrows, X, Trash2, Sparkles, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Product = {
  id: string; name: string; slug: string; image: string | null;
  price: number; discountPrice: number | null; effectivePrice: number;
  stock: number; rating: number; brand: { name: string }; category: { name: string };
  specifications: { key: string; label: string; value: string }[];
};

export default function ComparePage() {
  const { ids, remove, clear } = useCompareStore();
  const consult = useChatStore((s) => s.consultProduct);

  const { data, isLoading } = useQuery({
    queryKey: ["compare", ids.join(",")],
    queryFn: () => fetch(`/api/products?ids=${ids.join(",")}`).then((r) => r.json()) as Promise<{ items: Product[]; ok: boolean }>,
    enabled: ids.length >= 1,
  });

  const products = data?.items ?? [];

  // union of all spec keys
  const specKeys: { key: string; label: string }[] = [];
  products.forEach((p) => {
    p.specifications.forEach((s) => {
      if (!specKeys.some((k) => k.key === s.key)) specKeys.push({ key: s.key, label: s.label });
    });
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black flex items-center gap-2.5">
          <GitCompareArrows className="h-6 w-6 text-primary" />
          مقایسه محصولات
          {ids.length > 0 && <span className="text-sm font-medium text-muted-foreground">({ids.length.toLocaleString("fa-IR")})</span>}
        </h1>
        {ids.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear} className="rounded-lg">
            <Trash2 className="h-4 w-4 me-1.5" /> پاک کردن لیست
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="rounded-2xl border bg-card h-64 grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && ids.length === 0 && (
        <div className="rounded-3xl border border-dashed p-16 text-center">
          <GitCompareArrows className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-bold">لیست مقایسه خالی است</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-7">
            از دکمه مقایسه روی کارت محصولات، حداکثر ۳ محصول به این لیست اضافه کنید.
          </p>
          <Button asChild size="lg" className="mt-6 gold-surface text-primary-foreground hover:opacity-90 rounded-xl">
            <Link href="/products">مشاهده محصولات</Link>
          </Button>
        </div>
      )}

      {!isLoading && ids.length > 0 && products.length > 0 && (
        <div className="rounded-3xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-36 p-4 text-start text-xs text-muted-foreground">محصول</th>
                  {products.map((p) => (
                    <th key={p.id} className="p-4 align-top min-w-52">
                      <div className="relative">
                        <button
                          onClick={() => remove(p.id)}
                          aria-label="حذف از مقایسه"
                          className="absolute top-0 end-0 grid place-items-center h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Link href={`/products/${p.slug}`} className="block">
                          <span className="relative block aspect-square rounded-xl bg-muted/50 overflow-hidden mb-3">
                            {p.image ? (
                              <Image src={p.image} alt={p.name} fill sizes="200px" className="object-contain p-3" />
                            ) : (
                              <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></span>
                            )}
                          </span>
                          <p className="text-[13px] font-bold line-clamp-2 leading-6 hover:text-primary transition-colors">{p.name}</p>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 text-xs font-bold bg-muted/20">قیمت</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4">
                      <p className="text-sm font-black text-primary tabular-nums">
                        {formatPrice(p.effectivePrice)} <span className="text-[10px] font-normal text-muted-foreground">تومان</span>
                      </p>
                      {p.discountPrice && (
                        <p className="text-[11px] text-muted-foreground price-old tabular-nums mt-0.5">{formatPrice(p.price)}</p>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/10">
                  <td className="p-4 text-xs font-bold bg-muted/20">برند / دسته</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-xs">{p.brand.name} — {p.category.name}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-xs font-bold bg-muted/20">موجودی</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className={cn("text-xs font-bold", p.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                        {p.stock > 0 ? `موجود (${p.stock.toLocaleString("fa-IR")})` : "ناموجود"}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/10">
                  <td className="p-4 text-xs font-bold bg-muted/20">امتیاز</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-xs font-bold">
                      {p.rating > 0 ? `${p.rating.toLocaleString("fa-IR")} از ۵` : "جدید"}
                    </td>
                  ))}
                </tr>
                {specKeys.map((sk, i) => (
                  <tr key={sk.key} className={i % 2 === 0 ? "border-b" : "border-b bg-muted/10"}>
                    <td className="p-4 text-xs font-bold bg-muted/20">{sk.label}</td>
                    {products.map((p) => {
                      const spec = p.specifications.find((s) => s.key === sk.key);
                      return <td key={p.id} className="p-4 text-xs text-muted-foreground">{spec?.value ?? "—"}</td>;
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="p-4 bg-muted/20" />
                  {products.map((p) => (
                    <td key={p.id} className="p-4">
                      <Button
                        onClick={() => consult({ id: p.id, name: p.name, slug: p.slug })}
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-primary/40 text-primary hover:bg-primary/10 w-full"
                      >
                        <Sparkles className="h-3.5 w-3.5 me-1.5" /> تحلیل AI
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, X, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Item = { name: string; slug: string; count: number };

const SORTS = [
  { value: "newest", label: "جدیدترین" },
  { value: "bestselling", label: "پرفروش‌ترین" },
  { value: "rating", label: "بهترین امتیاز" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "discount", label: "بیشترین تخفیف" },
];

export function ProductsToolbar({ categories, brands, total }: { categories: Item[]; brands: Item[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);

  const current = (key: string, fallback = "") => sp.get(key) ?? fallback;

  const update = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    params.delete("page"); // reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeCategory = current("category");
  const activeBrand = current("brand");
  const hasFilters = ["category", "brand", "min", "max", "inStock", "discount", "q"].some((k) => sp.get(k));

  const FiltersPanel = (
    <div className="space-y-6">
      {/* categories */}
      <div>
        <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> دسته‌بندی
        </h3>
        <div className="space-y-1">
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => update({ category: activeCategory === c.slug ? null : c.slug })}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2 text-[13px] text-start transition-colors",
                activeCategory === c.slug ? "bg-primary/12 font-bold text-primary" : "hover:bg-accent"
              )}
            >
              <span className="flex items-center gap-1.5">
                {activeCategory === c.slug && <Check className="h-3.5 w-3.5" />}
                {c.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{c.count.toLocaleString("fa-IR")}</span>
            </button>
          ))}
        </div>
      </div>

      {/* brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold mb-3">برند</h3>
          <div className="flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <button
                key={b.slug}
                onClick={() => update({ brand: activeBrand === b.slug ? null : b.slug })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  activeBrand === b.slug
                    ? "border-primary bg-primary/12 text-primary"
                    : "hover:border-primary/40 hover:text-primary"
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* price */}
      <div>
        <h3 className="text-[13px] font-bold mb-3">محدوده قیمت (تومان)</h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const min = (e.currentTarget.elements.namedItem("min") as HTMLInputElement).value.replace(/\D/g, "");
            const max = (e.currentTarget.elements.namedItem("max") as HTMLInputElement).value.replace(/\D/g, "");
            update({ min: min || null, max: max || null });
          }}
        >
          <Input name="min" defaultValue={current("min")} inputMode="numeric" placeholder="از" className="h-9 text-xs" aria-label="حداقل قیمت" />
          <Input name="max" defaultValue={current("max")} inputMode="numeric" placeholder="تا" className="h-9 text-xs" aria-label="حداکثر قیمت" />
          <Button type="submit" size="sm" className="gold-surface text-primary-foreground hover:opacity-90 rounded-lg h-9 shrink-0">
            اعمال
          </Button>
        </form>
      </div>

      {/* toggles */}
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] cursor-pointer hover:bg-accent">
          فقط کالاهای موجود
          <input
            type="checkbox"
            checked={sp.get("inStock") === "1"}
            onChange={(e) => update({ inStock: e.target.checked ? "1" : null })}
            className="accent-[color:var(--primary)] h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] cursor-pointer hover:bg-accent">
          فقط تخفیف‌دارها
          <input
            type="checkbox"
            checked={sp.get("discount") === "1"}
            onChange={(e) => update({ discount: e.target.checked ? "1" : null })}
            className="accent-[color:var(--primary)] h-4 w-4"
          />
        </label>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => router.push(pathname)}>
          <X className="h-4 w-4 me-1" /> حذف همه فیلترها
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* sort bar */}
      <div className="lg:hidden flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setMobileFilters(true)}>
          <Filter className="h-4 w-4 me-1" /> فیلترها
          {hasFilters && <Badge className="ms-1 h-4 min-w-4 px-1 text-[9px] gold-surface text-primary-foreground">•</Badge>}
        </Button>
        <select
          value={current("sort", "newest")}
          onChange={(e) => update({ sort: e.target.value })}
          className="h-9 rounded-lg border bg-card text-xs px-2"
          aria-label="مرتب‌سازی"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-32 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-extrabold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> فیلتر محصولات
            </p>
          </div>
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">مرتب‌سازی</Label>
            <select
              value={current("sort", "newest")}
              onChange={(e) => update({ sort: e.target.value })}
              className="w-full h-9 rounded-lg border bg-card text-xs px-2"
              aria-label="مرتب‌سازی"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {FiltersPanel}
        </div>
      </aside>

      {/* mobile filters sheet */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-5 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-extrabold">فیلترها ({total.toLocaleString("fa-IR")} نتیجه)</p>
              <button onClick={() => setMobileFilters(false)} aria-label="بستن">
                <X className="h-5 w-5" />
              </button>
            </div>
            {FiltersPanel}
            <Button className="w-full mt-5 gold-surface text-primary-foreground rounded-lg" onClick={() => setMobileFilters(false)}>
              نمایش نتایج
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

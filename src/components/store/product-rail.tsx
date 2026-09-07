"use client";

import { useRef } from "react";
import { ProductCard, ProductCardData } from "./product-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductRail({ products }: { products: ProductCardData[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "next" | "prev") => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("[data-product-card]");
    const amount = (card?.offsetWidth ?? 260) + 16;
    rail.scrollBy({ left: dir === "next" ? -amount : amount, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative group/rail">
      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 snap-x snap-mandatory"
        role="list"
        aria-label="لیست محصولات"
      >
        {products.map((p) => (
          <div key={p.id} data-product-card role="listitem" className="w-[228px] sm:w-[248px] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {products.length > 3 && (
        <>
          <button
            onClick={() => scroll("prev")}
            aria-label="اسکرول به محصولات قبلی"
            className="absolute top-1/3 -right-2 grid h-11 w-11 place-items-center rounded-full glass shadow-lg transition-all hover:scale-110 hover:border-primary/40 md:opacity-0 md:group-hover/rail:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("next")}
            aria-label="اسکرول به محصولات بعدی"
            className="absolute top-1/3 -left-2 grid h-11 w-11 place-items-center rounded-full glass shadow-lg transition-all hover:scale-110 hover:border-primary/40 md:opacity-0 md:group-hover/rail:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

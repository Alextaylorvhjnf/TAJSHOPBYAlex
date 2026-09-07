"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch, type ProductRow } from "@/components/admin/api-client";
import { cn } from "@/lib/utils";

/**
 * Searchable product combobox (loads up to 100 products once, filters client-side).
 * value = product id or null ("none").
 */
export function ProductPicker({
  value,
  onChange,
  placeholder = "انتخاب محصول (اختیاری)",
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin", "products", "for-picker"],
    queryFn: () => apiFetch<{ items: ProductRow[] }>("/api/admin/products?limit=100"),
  });
  const products = data?.items ?? [];
  const selected = products.find((p) => p.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between rounded-lg font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <PackageSearch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-right">{selected ? selected.name : placeholder}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder="جستجوی نام یا SKU محصول…" />
          <CommandList className="max-h-64">
            <CommandEmpty>محصولی یافت نشد</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                — بدون محصول —
              </CommandItem>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku}`}
                  onSelect={(current) => {
                    const found = products.find((x) => `${x.name} ${x.sku}` === current);
                    onChange(found ? found.id : null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-3.5 w-3.5", value === p.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{p.name}</span>
                  {p.sku && (
                    <span dir="ltr" className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {p.sku}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

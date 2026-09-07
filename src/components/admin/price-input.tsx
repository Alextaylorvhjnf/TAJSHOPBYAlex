"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Persian (۰-۹) + Arabic-Indic (٠-٩) digits → ASCII */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function faDigitsToEn(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

/** 20000000 → "20,000,000" (3-by-3 grouping, plain digit string in) */
export function groupDigits(plain: string): string {
  return plain.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * v20 — money input for the admin product form.
 * - value is a PLAIN numeric string in state ("20000000")
 * - displays it grouped 3-by-3 with commas ("20,000,000") while typing
 * - accepts Persian/Arabic digits and converts them on the fly
 * - strips anything that is not a digit (commas are re-added for display only)
 */
export function PriceInput({
  value,
  onChange,
  id,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (plain: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Input
      id={id}
      dir="ltr"
      inputMode="numeric"
      aria-label={ariaLabel}
      className={cn("rounded-lg text-left tabular-nums", className)}
      placeholder={placeholder ?? "۲۰٬۰۰۰٬۰۰۰"}
      value={value ? groupDigits(value) : ""}
      onChange={(e) => onChange(faDigitsToEn(e.target.value).replace(/[^\d]/g, ""))}
    />
  );
}

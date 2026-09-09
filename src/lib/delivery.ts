import {
  Bike,
  Container,
  Mailbox,
  Package,
  Rocket,
  Store,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * v16 delivery system — client-safe shared helpers.
 * Used by the admin delivery page and the storefront checkout.
 * (Server-side ETA text lives in src/lib/orders.ts — that module imports Prisma.)
 */

/** Persian label per DeliveryMethod.type (POST | COURIER | FREIGHT | EXPRESS | PICKUP) */
export const DELIVERY_TYPE_FA: Record<string, string> = {
  POST: "پستی",
  COURIER: "پیک و کوریور",
  FREIGHT: "باربری",
  EXPRESS: "اکسپرس",
  PICKUP: "تحویل حضوری",
};

/** Badge tone per type (mirrors the ui-bits ToneBadge palette) */
export const DELIVERY_TYPE_TONE: Record<string, string> = {
  POST: "bg-primary/15 text-primary border-primary/25",
  COURIER: "bg-teal-500/15 text-teal-600 border-teal-500/25",
  FREIGHT: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  EXPRESS: "bg-destructive/15 text-destructive border-destructive/25",
  PICKUP: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
};

/**
 * Lucide icons selectable for delivery methods (static map — importing the
 * whole lucide barrel would bloat the client bundle; unknown names fall back
 * to the package icon). Keys match the names seeded by scripts/seed.ts.
 */
const DELIVERY_ICONS: Record<string, LucideIcon> = {
  Package,
  Mailbox,
  Truck,
  Zap,
  Container,
  Bike,
  Rocket,
  Store,
};

export const KNOWN_DELIVERY_ICONS = Object.keys(DELIVERY_ICONS);

/** Resolve a stored lucide icon name → component (fallback: Package) */
export function deliveryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Package;
  return DELIVERY_ICONS[name] ?? Package;
}

/** Persian ETA label for admin rows/lists (0 min → «همان روز») */
export function deliveryEtaLabel(etaMinDays: number, etaMaxDays: number): string {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (etaMinDays === 0) return etaMaxDays <= 1 ? "همان روز" : `۱ تا ${fa(etaMaxDays)} روز کاری`;
  return `${fa(etaMinDays)} تا ${fa(etaMaxDays)} روز کاری`;
}

/** Client-safe formatting helpers */

export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("fa-IR");
}

export function formatPriceLabel(n: number | null | undefined): string {
  return `${formatPrice(n)} تومان`;
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function toFaDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  PROCESSING: "در حال بررسی",
  CONFIRMED: "تأیید شده",
  READY_TO_SHIP: "آماده ارسال",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
  REFUNDED: "برگشت خورده",
};

export const PAYMENT_STATUS_FA: Record<string, string> = {
  UNPAID: "پرداخت نشده",
  VERIFYING: "در حال بررسی رسید",
  PAID: "پرداخت شده",
  REJECTED: "رد شده",
  FAILED: "ناموفق",
  REFUNDED: "بازگشت وجه",
};

export const ROLE_FA: Record<string, string> = {
  CUSTOMER: "مشتری",
  SUPPORT: "پشتیبانی",
  ORDER_MANAGER: "مدیر سفارش‌ها",
  PRODUCT_MANAGER: "مدیر محصولات",
  ADMIN: "مدیر",
  SUPER_ADMIN: "مدیر کل",
};

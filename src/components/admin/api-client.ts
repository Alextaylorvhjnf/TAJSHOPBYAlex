"use client";

import type { ProductDTO } from "@/lib/product";
import { compressImageForUpload } from "@/lib/client-image";

/** Fetch helper that unwraps the {ok,...} envelope and throws Persian errors */
export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: isForm ? init?.headers : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  const obj = json as { ok?: boolean; message?: string } | null;
  if (!obj || obj.ok !== true) {
    throw new Error(obj?.message ?? `خطا در ارتباط با سرور (${res.status})`);
  }
  return json as T;
}

/** File upload via multipart POST /api/upload */
export async function uploadImage(file: File, folder: string): Promise<string> {
  // v28: compress in the browser first (see lib/client-image.ts) so large
  // photos pass restrictive proxies that 413 big request bodies.
  const uploadFile = await compressImageForUpload(file);
  const form = new FormData();
  form.append("file", uploadFile);
  form.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string } | null;
  if (!json || !json.ok || !json.url) {
    const generic =
      res.status === 413
        ? `حجم فایل بیش از حد مجاز مسیر ارسال است (${(uploadFile.size / 1024 / 1024).toFixed(1)}MB)`
        : `بارگذاری تصویر ناموفق بود${res.status ? ` (خطای ${res.status})` : ""}`;
    throw new Error(json?.message ?? generic);
  }
  return json.url;
}

// ── Shared admin DTO types ──

export type AdminRoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SUPPORT"
  | "PRODUCT_MANAGER"
  | "ORDER_MANAGER"
  | "CUSTOMER";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  parentName?: string | null;
  specTemplate: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface ProductRow extends ProductDTO {
  reviews?: unknown[];
  orderCount?: number;
  wishlistCount?: number;
  viewCount?: number;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  itemCount: number;
  customer: string;
  phone: string;
  email: string | null;
  c2cStatus: string | null;
  trackingCode: string | null;
  createdAt: string;
}

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface GatewayPaymentRow {
  id: string;
  orderId: string;
  gateway: string;
  amount: number; // Rials
  authority: string | null;
  refId: string | null;
  cardPan: string | null;
  status: string;
  createdAt: string;
  order: { orderNumber: string; paymentStatus: string; phone: string };
}

export interface C2CPaymentRow {
  id: string;
  orderId: string;
  userId: string | null;
  senderName: string;
  senderPhone: string;
  senderCard: string;
  trackingNumber: string | null;
  amount: number; // Toman
  paidAt: string;
  receiptImage: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    total: number;
    status: string;
    phone: string;
    firstName: string;
    lastName: string;
  };
}

export interface SliderRow {
  id: string;
  title: string;
  subtitle: string | null;
  desktopImage: string;
  mobileImage: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  badge: string | null;
  productId: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
}

export interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number;
  minAmount: number;
  maxUsage: number;
  usedCount: number;
  perUserLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

export interface DeliveryMethodRow {
  id: string;
  name: string;
  description: string | null;
  type: string; // POST | COURIER | FREIGHT | EXPRESS | PICKUP
  cost: number; // Toman
  etaMinDays: number;
  etaMaxDays: number;
  icon: string | null; // lucide icon name
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  orderCount: number;
}

export interface ReviewRow {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string;
  status: string;
  createdAt: string;
  product: { name: string; slug: string; mainImage: string | null } | null;
  user: { firstName: string | null; lastName: string | null } | null;
}

export interface LogRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: string;
  adminRole: string | null;
}

export interface Paginated {
  total: number;
  page: number;
  pages: number;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

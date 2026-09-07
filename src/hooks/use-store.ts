"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CartItemDTO = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  oldUnitPrice: number | null;
  lineTotal: number;
  stock: number;
  inStock: boolean;
};

export type CartResponse = {
  items: CartItemDTO[];
  summary: { itemCount: number; subtotal: number };
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    coupon: { valid: boolean; reason?: string; discount: number } | null;
  };
  isGuest: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T & { ok: boolean; message?: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({ ok: false, message: "خطای شبکه" }));
  if (!res.ok || json.ok === false) {
    throw new Error(json.message ?? `خطا (${res.status})`);
  }
  return json as T & { ok: boolean; message?: string };
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: null | { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; role: string; avatar: string | null }; counts?: { notifications: number; wishlist: number; orders: number } }>("/api/auth/me"),
    staleTime: 60_000,
  });
}

export function useCart() {
  const qc = useQueryClient();
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: () => api<CartResponse>("/api/cart"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const add = useMutation({
    mutationFn: (payload: { productId: string; quantity?: number; color?: string | null; variant?: string | null }) =>
      api("/api/cart/items", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      invalidate();
      if (data.message) toast.success(data.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/cart/items/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => api("/api/cart", { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return { cart: cart.data, isLoading: cart.isLoading, refetch: cart.refetch, add, update, remove, clear };
}

export function useWishlist() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () =>
      api<{ items: { id: string; name: string; slug: string; price: number; discountPrice: number | null; mainImage: string | null; stock: number; rating: number }[] }>(
        "/api/wishlist"
      ),
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: (productId: string) => api<{ added: boolean }>("/api/wishlist/toggle", { method: "POST", body: JSON.stringify({ productId }) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      if (res.message) toast.success(res.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { wishlist: data?.items, isLoading, toggle };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api<{
        categories: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          image: string | null;
          productCount: number;
          /** v26: mega-menu branches (children + top brands) */
          branches?: { name: string; slug: string; kind: "brand" | "child"; productCount?: number }[];
        }[];
      }>("/api/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useNotifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<{ notifications: { id: string; title: string; message: string; type: string; isRead: boolean; link: string | null; createdAt: string }[] }>(
        "/api/notifications/read"
      ),
    retry: false,
  });
  const markRead = useMutation({
    mutationFn: (id?: string) => api("/api/notifications/read", { method: "POST", body: JSON.stringify(id ? { id } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return { notifications: data?.notifications, markRead, isLoading };
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Product context passed to the AI advisor. The backend re-fetches the
 * FULL product data (specs, price, stock, reviews…) from the DB by `id`,
 * so only display info lives here. `slug` lets the widget detect route
 * changes away from the product page and drop a stale context.
 */
export type ChatProductContext = {
  id: string;
  name: string;
  slug?: string;
} | null;

type ChatStore = {
  open: boolean;
  productContext: ChatProductContext;
  unread: number;
  /** increments on every `consultProduct` call — drives the widget's auto-send effect */
  consultSeq: number;
  /** v23: an AI-compare pair — {a: current product, b: rival}. Set by the
   *  product page compare dialog; the widget auto-sends a compare question
   *  with context.compareWithId = b.id (server builds a side-by-side answer). */
  comparePair: { a: NonNullable<ChatProductContext>; b: NonNullable<ChatProductContext> } | null;
  /** increments on every `compareProducts` call — drives the widget's auto-send effect */
  compareSeq: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  consultProduct: (product: NonNullable<ChatProductContext>) => void;
  compareProducts: (a: NonNullable<ChatProductContext>, b: NonNullable<ChatProductContext>) => void;
  clearCompare: () => void;
  clearContext: () => void;
  bumpUnread: () => void;
  clearUnread: () => void;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      open: false,
      productContext: null,
      unread: 0,
      consultSeq: 0,
      comparePair: null,
      compareSeq: 0,
      setOpen: (open) => set({ open, ...(open ? { unread: 0 } : {}) }),
      toggle: () => set((s) => ({ open: !s.open, ...(!s.open ? { unread: 0 } : {}) })),
      consultProduct: (product) =>
        set((s) => ({ open: true, productContext: product, unread: 0, consultSeq: s.consultSeq + 1 })),
      compareProducts: (a, b) =>
        // productContext = a so the page-context stays coherent while the
        // compare pair drives the auto-sent question + the request body
        set((s) => ({ open: true, productContext: a, comparePair: { a, b }, unread: 0, compareSeq: s.compareSeq + 1 })),
      clearCompare: () => set({ comparePair: null }),
      clearContext: () => set({ productContext: null }),
      bumpUnread: () => set((s) => (s.open ? s : { unread: s.unread + 1 })),
      clearUnread: () => set({ unread: 0 }),
    }),
    // skipHydration: keep the first client render identical to SSR (initial
    // state), preventing React hydration mismatches when localStorage holds
    // persisted state. Rehydrated post-mount by <StoreHydrator/>.
    { name: "taj-chat", partialize: (s) => ({ unread: s.unread }), skipHydration: true }
  )
);

type CompareStore = {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCompareStore = create<CompareStore>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((i) => i !== id) : s.ids.length >= 3 ? s.ids : [...s.ids, id],
        })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((i) => i !== id) })),
      clear: () => set({ ids: [] }),
    }),
    // skipHydration — same hydration-safety rationale as useChatStore
    { name: "taj-compare", skipHydration: true }
  )
);

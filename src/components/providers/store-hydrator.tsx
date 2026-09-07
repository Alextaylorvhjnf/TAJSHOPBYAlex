"use client";

import { useEffect } from "react";
import { useChatStore, useCompareStore } from "@/lib/stores";

/**
 * Rehydrates the persisted zustand stores AFTER React hydration.
 *
 * Both stores are created with `persist(…, { skipHydration: true })` so the
 * first client render stays identical to the SSR output (no hydration
 * mismatch). This component is the "post-mount" rehydration step referenced
 * in stores.ts — without it, persisted state (taj-compare ids, taj-chat
 * unread badge) was silently lost on every reload.
 */
export function StoreHydrator() {
  useEffect(() => {
    // `persist.rehydrate()` reads localStorage and merges it into the store
    // after mount — safe: React has already hydrated, this only triggers a
    // normal client-side re-render.
    try {
      void useCompareStore.persist.rehydrate();
    } catch {
      /* corrupted storage — keep defaults */
    }
    try {
      void useChatStore.persist.rehydrate();
    } catch {
      /* corrupted storage — keep defaults */
    }
  }, []);
  return null;
}

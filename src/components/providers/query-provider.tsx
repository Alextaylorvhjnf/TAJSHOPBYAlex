"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useChatStore, useCompareStore } from "@/lib/stores";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Rehydrate persisted zustand stores AFTER hydration completes.
  // The stores use skipHydration so the first client render matches the
  // server-rendered HTML exactly; this effect restores any persisted state
  // (compare list / chat unread badge) without hydration mismatches.
  useEffect(() => {
    void useChatStore.persist.rehydrate();
    void useCompareStore.persist.rehydrate();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

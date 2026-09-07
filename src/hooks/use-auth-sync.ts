"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Shared auth-state synchronization.
 *
 * ROOT-CAUSE FIX for the "header still shows Login/Register after
 * login/register" bug: the header's auth state comes from the React Query
 * `["me"]` cache (staleTime 60s). The old login/register pages only did
 * `router.push + router.refresh` — a soft navigation does NOT remount the
 * Header client component and does NOT refetch a *fresh* React Query
 * entry, so the stale `{user: null}` kept rendering until a manual full
 * browser refresh.
 *
 * After every successful auth mutation we now:
 *  1. write the new user into the `["me"]` cache (instant header update)
 *  2. invalidate cart / wishlist / notifications (guest → user data swap,
 *     guest cart was merged server-side)
 *  3. `router.refresh()` so server components re-render with the session
 */
export function useAuthSync() {
  const qc = useQueryClient();
  const router = useRouter();

  const syncLogin = (user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    avatar?: string | null;
  }) => {
    // 1 · immediately update the shared `me` cache → header reacts at once
    qc.setQueryData(["me"], {
      ok: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar ?? null,
      },
      counts: { notifications: 0, wishlist: 0, orders: 0 },
    });
    // 2 · server merged the guest cart & has user-scoped data now
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["wishlist"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    // 3 · refresh server components (metadata, SSR content)
    router.refresh();
  };

  const syncLogout = () => {
    qc.setQueryData(["me"], { ok: true, user: null });
    qc.removeQueries({ queryKey: ["cart"] });
    qc.removeQueries({ queryKey: ["wishlist"] });
    qc.removeQueries({ queryKey: ["notifications"] });
  };

  return { syncLogin, syncLogout };
}

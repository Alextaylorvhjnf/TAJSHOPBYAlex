"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Admin panel theme engine (v17 ids · v23 «Zywra» skins).
   The active theme lives as [data-admin-theme] on <html> (set by the
   inline no-flash script in app/admin/layout.tsx before first paint)
   and is persisted in localStorage("taj-admin-theme").
   It exists ONLY on /admin routes — leaving the panel removes the
   attribute, so the storefront never sees these colors.

   v23: the default «finnova» id now carries the ZYWRA LIGHT skin and
   «saas-dark» carries ZYWRA DARK (same var contract, reskinned in
   admin-v20.css) — matching the “Invoice Management SaaS Dashboard
   | Zywra Studio” reference in both modes. The sun/moon toggle in the
   topbar switches between these two. The 3 legacy v17 photo themes
   (excel-dark/light, saas-light) still switch exactly as before.
   ═══════════════════════════════════════════════════════════════ */

export const ADMIN_THEME_STORAGE_KEY = "taj-admin-theme";

export interface AdminThemeDef {
  id: "finnova" | "excel-dark" | "excel-light" | "saas-dark" | "saas-light";
  name: string;
  desc: string;
  /** [surface, card, primary] mini preview swatches */
  swatch: [string, string, string];
}

export const ADMIN_THEMES: AdminThemeDef[] = [
  {
    id: "finnova",
    name: "زیورا — روشن",
    desc: "پنل سفید با اکسنت ایندیگو (مرجع v23 — پیش‌فرض)",
    swatch: ["#F8FAFC", "#FFFFFF", "#4F46E5"],
  },
  {
    id: "saas-dark",
    name: "زیورا — تیره",
    desc: "همان چیدمان زیورا روی سرمه‌ای اسلیت (مرجع v23)",
    swatch: ["#0F172A", "#1E293B", "#6366F1"],
  },
  {
    id: "excel-dark",
    name: "اکسل — تیره",
    desc: "تم قدیمی v17: کارت‌های گرادیانی روی زغال‌سنگی",
    swatch: ["#131418", "#1F2025", "#7B61FF"],
  },
  {
    id: "excel-light",
    name: "اکسل — روشن",
    desc: "تم قدیمی v17: همان داشبورد گرافیکی روشن",
    swatch: ["#F2F3F7", "#FFFFFF", "#7B61FF"],
  },
  {
    id: "saas-light",
    name: "SaaS — روشن",
    desc: "تم قدیمی v17: پنل مینیمال با آبی سلطنتی",
    swatch: ["#F1F5F9", "#FFFFFF", "#2563EB"],
  },
];

/** Themes whose Zywra/legacy palette is a DARK mode. */
const DARK_ADMIN_THEMES: AdminThemeDef["id"][] = ["saas-dark", "excel-dark"];

export const DEFAULT_ADMIN_THEME: AdminThemeDef["id"] = "finnova";

function isThemeId(v: unknown): v is AdminThemeDef["id"] {
  return ADMIN_THEMES.some((t) => t.id === v);
}

/** v27.1: the panel appearance is JUST light & dark now. Legacy ids that
 *  may still live in a visitor's localStorage are normalized to the two
 *  kept skins so nothing ever falls back unexpectedly. */
const LEGACY_THEME_MAP: Partial<Record<AdminThemeDef["id"], AdminThemeDef["id"]>> = {
  "excel-dark": "saas-dark",
  "excel-light": "finnova",
  "saas-light": "finnova",
};

function normalizeThemeId(v: unknown): AdminThemeDef["id"] {
  if (typeof v !== "string") return DEFAULT_ADMIN_THEME;
  const legacy = LEGACY_THEME_MAP[v as AdminThemeDef["id"]];
  if (legacy) return legacy;
  return isThemeId(v) ? v : DEFAULT_ADMIN_THEME;
}

export function applyAdminTheme(id: AdminThemeDef["id"]) {
  const normalized = normalizeThemeId(id);
  document.documentElement.setAttribute("data-admin-theme", normalized);
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, normalized);
  } catch {
    /* private mode etc. — attribute still applies for this session */
  }
}

/** Reads the currently applied theme id from <html>. */
export function currentAdminTheme(): AdminThemeDef["id"] {
  const attr = document.documentElement.getAttribute("data-admin-theme");
  return normalizeThemeId(attr);
}

/**
 * Mount once inside the admin root layout:
 * • on mount  → keep <html data-admin-theme> in sync with localStorage
 * • on unmount (leaving /admin) → remove the attribute so the
 *   storefront renders with its own theme tokens again.
 */
export function AdminThemeSync() {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    applyAdminTheme(normalizeThemeId(stored));
    return () => {
      document.documentElement.removeAttribute("data-admin-theme");
    };
  }, []);
  return null;
}

/** Stateful hook for pickers — updates <html> + localStorage.
 *  useSyncExternalStore: hydration-safe (server snapshot = default theme),
 *  auto-syncs across components AND browser tabs (storage + attribute events). */
const themeStore = {
  subscribe(cb: () => void) {
    const obs = new MutationObserver(cb);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-admin-theme"],
    });
    window.addEventListener("storage", cb);
    return () => {
      obs.disconnect();
      window.removeEventListener("storage", cb);
    };
  },
  getSnapshot: (): AdminThemeDef["id"] => currentAdminTheme(),
  getServerSnapshot: (): AdminThemeDef["id"] => DEFAULT_ADMIN_THEME,
};

export function useAdminTheme() {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  );
  const setTheme = useCallback((id: AdminThemeDef["id"]) => {
    applyAdminTheme(id); // attribute change re-renders every subscriber
  }, []);
  return [theme, setTheme] as const;
}

/**
 * Sun/moon segmented toggle for the topbar (v23): flips the panel
 * between ZYWRA LIGHT (finnova) and ZYWRA DARK (saas-dark). Keeps the
 * same storage/attribute machinery as the full picker.
 */
export function AdminThemeModeToggle() {
  const [theme, setTheme] = useAdminTheme();
  const isDark = DARK_ADMIN_THEMES.includes(theme);
  return (
    <div className="zy-segment" role="group" aria-label="حالت روشن یا تیره پنل مدیریت">
      <button
        type="button"
        className="zy-segment-btn"
        data-active={!isDark || undefined}
        aria-pressed={!isDark}
        aria-label="حالت روشن"
        title="حالت روشن"
        onClick={() => setTheme("finnova")}
      >
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="zy-segment-btn"
        data-active={isDark || undefined}
        aria-pressed={isDark}
        aria-label="حالت تیره"
        title="حالت تیره"
        onClick={() => setTheme("saas-dark")}
      >
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

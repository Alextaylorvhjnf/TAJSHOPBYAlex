"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider — receives the admin-configured default mode from the
 * root server layout. Visitors may still toggle light/dark locally
 * (persisted in localStorage by next-themes); admin mode is the default.
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={defaultTheme === "system"}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

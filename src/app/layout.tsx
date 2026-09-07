import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import { Toaster } from "sonner";
import { getBrandingSafe, getThemeSafe, DEFAULT_FAVICON } from "@/lib/settings";
import "./globals.css";

/** mime by file extension — an uploaded favicon may be png/jpg/webp/svg */
function faviconMime(url: string): string | undefined {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

// Identity is DB-driven (Admin → Settings → Branding). Safe fallbacks keep
// the first-run /install wizard renderable before the DB is initialized.
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSafe();
  const title = branding.metaTitle || branding.storeName;
  /* v29 favicon fix: when the admin uploaded a custom favicon it must be
   * THE tab/bookmark icon — the previous metadata also declared the static
   * /brand/favicon-32.png + favicon-16.png entries and browsers picked
   * those instead of (or cached over) the custom upload. With a custom
   * favicon present we now emit ONLY it (icon + apple + shortcut). */
  const customFavicon = branding.favicon?.trim() || null;
  const faviconType = customFavicon ? faviconMime(customFavicon) : "image/png";
  const icons: Metadata["icons"] = customFavicon
    ? {
        icon: [{ url: customFavicon, ...(faviconType ? { type: faviconType } : {}) }],
        shortcut: [{ url: customFavicon, ...(faviconType ? { type: faviconType } : {}) }],
        apple: [{ url: customFavicon }],
      }
    : {
        icon: [
          { url: DEFAULT_FAVICON, type: "image/png" },
          { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
          { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
        ],
        apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      };
  return {
    title: {
      default: `${title} | فروشگاه آنلاین کالای دیجیتال`,
      template: `%s | ${title}`,
    },
    description: branding.description,
    keywords: [branding.storeName, branding.storeNameEn, "فروشگاه آنلاین", "موبایل", "لپ تاپ", "کالای دیجیتال", "کنسول بازی"],
    applicationName: branding.storeName,
    openGraph: {
      title: `${branding.storeName} | ${branding.storeNameEn}`,
      description: branding.shortDescription || branding.description,
      siteName: branding.storeName,
      type: "website",
      locale: "fa_IR",
      images: [{ url: "/brand/og-1200x630.png", width: 1200, height: 630, alt: branding.storeName }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${branding.storeName} | ${branding.storeNameEn}`,
      description: branding.shortDescription || branding.description,
    },
    icons,
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1913" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [branding, theme] = await Promise.all([getBrandingSafe(), getThemeSafe()]);

  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={theme.themeId}
      className={theme.colorMode === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider defaultTheme={theme.colorMode}>
          <QueryProvider>
            <BrandingProvider branding={branding}>
              <StoreHydrator />
              {children}
            </BrandingProvider>
          </QueryProvider>
        </ThemeProvider>
        <Toaster position="top-center" richColors closeButton expand={false} dir="rtl" />
      </body>
    </html>
  );
}

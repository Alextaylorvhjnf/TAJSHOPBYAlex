"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * v33: (store) error boundary — previously ANY server-side throw (DB glitch,
 * schema drift, …) surfaced as Next.js's generic English
 * "Application error: a server-side exception has occurred" page with a bare
 * digest. Visitors now get a Persian recovery card with retry + wizard link.
 */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront] render error:", error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-8 text-muted-foreground" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold text-foreground">خطای موقت در نمایش فروشگاه</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          بارگذاری صفحه با خطا مواجه شد. معمولاً با تلاش مجدد برطرف می‌شود؛
          اگر ادامه داشت، ویزارد نصب را اجرا کنید تا پیکربندی ترمیم شود.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground/70" dir="ltr">
            digest: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 min-w-44 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          تلاش مجدد
        </button>
        <Link href="/install" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          ویزارد نصب
        </Link>
      </div>
    </div>
  );
}

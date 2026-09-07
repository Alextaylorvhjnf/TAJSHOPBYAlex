"use client";

/**
 * v20 · CHROME GATES — the active template's bespoke header/footer on EVERY
 * store page, not just the homepage.
 * -----------------------------------------------------------------------
 * The user story: switching the storefront template used to only restyle
 * the homepage — product/cart/checkout pages kept the standard chrome. Now
 * the (store) layout wraps the shared Header/Footer in these gates:
 *
 *   - homepage ("/")         → children (the template root renders its OWN
 *                              chrome and CSS-suppresses the shared pair
 *                              via [data-template-chrome] — unchanged since
 *                              v18, zero double-header risk)
 *   - default template       → children (standard chrome, byte-identical)
 *   - any other page + a     → TemplateHeader / TemplateFooter with the
 *     non-default template     template's live chrome config and the light
 *                              getChromeData() payload (store/categories/
 *                              brands/infoLinks — real data, live cart badge)
 *
 * Client component (needs usePathname); the layout passes the server-fetched
 * chrome data + active template id as plain serializable props.
 */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { HomeData } from "@/lib/templates/types";
import { TemplateHeader } from "@/components/store/templates/chrome/header";
import { TemplateFooter } from "@/components/store/templates/chrome/footer";
import { TEMPLATE_CHROME } from "@/components/store/templates/chrome/config";

export function ChromeHeaderGate({
  templateId,
  data,
  children,
}: {
  templateId: string;
  data: HomeData;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const chrome = TEMPLATE_CHROME[templateId];
  if (!chrome || pathname === "/") return <>{children}</>;
  return <TemplateHeader data={data} cfg={chrome.header} />;
}

export function ChromeFooterGate({
  templateId,
  data,
  children,
}: {
  templateId: string;
  data: HomeData;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const chrome = TEMPLATE_CHROME[templateId];
  if (!chrome || pathname === "/") return <>{children}</>;
  return (
    <div className="mt-auto w-full">
      <TemplateFooter data={data} cfg={chrome.footer} />
    </div>
  );
}

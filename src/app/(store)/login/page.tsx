import { Suspense } from "react";
import { getStoreSettings } from "@/lib/settings";
import { getAdminUser } from "@/lib/auth";
import { TEMPLATE_IDS } from "@/lib/templates/registry";
import { getAuthStyle } from "@/lib/templates/auth-styles";
import { AuthShell } from "@/components/store/auth/auth-shell";
import { LoginForm } from "@/components/store/auth/login-form";

// the auth skin follows the active template — resolve per request, never cache
export const dynamic = "force-dynamic";

export const metadata = { title: "ورود" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  /* template resolution — same mechanism as (store)/page.tsx: the active
   * template from StoreSettings, with the admin-gated `?template=<id>`
   * full-tab preview override (never persisted). */
  let activeId: string | undefined;
  try {
    activeId = (await getStoreSettings()).activeTemplate;
  } catch {
    /* pre-install / DB not ready → default auth style (clean-light) */
  }
  const requested = (await searchParams).template;
  if (requested && TEMPLATE_IDS.includes(requested)) {
    const admin = await getAdminUser().catch(() => null);
    if (admin) activeId = requested;
  }

  const style = getAuthStyle(activeId);

  return (
    <AuthShell
      variant={style.variant}
      templateId={activeId}
      accent={style.accent}
      accent2={style.accent2}
      bg1={style.bg1}
      bg2={style.bg2}
      title="ورود به تاج الکترونیکس"
      subtitle="به حساب خود وارد شوید"
      brand={{
        headline: "سبد خرید، علاقه‌مندی‌ها و سفارش‌هایتان همیشه همراه شما",
        body: "با عضویت در تاج الکترونیکس از تخفیف‌های اختصاصی اعضا، پیگیری لحظه‌ای سفارش‌ها و مشاوره هوشمند خرید بهره‌مند شوید.",
      }}
    >
      <Suspense fallback={<div className="h-56" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

import { Suspense } from "react";
import { getStoreSettings } from "@/lib/settings";
import { getAdminUser } from "@/lib/auth";
import { TEMPLATE_IDS } from "@/lib/templates/registry";
import { getAuthStyle } from "@/lib/templates/auth-styles";
import { AuthShell } from "@/components/store/auth/auth-shell";
import { RegisterForm } from "@/components/store/auth/register-form";

// the auth skin follows the active template — resolve per request, never cache
export const dynamic = "force-dynamic";

export const metadata = { title: "ثبت‌نام" };

export default async function RegisterPage({
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
      title="ثبت‌نام در تاج الکترونیکس"
      subtitle="در کمتر از یک دقیقه عضو شوید"
      brand={{
        headline: "به خانواده تاج خوش آمدید",
        points: [
          "پیگیری لحظه‌ای سفارش‌ها",
          "ذخیره علاقه‌مندی‌ها و سبد خرید",
          "اطلاع از تخفیف‌های ویژه اعضا",
          "مشاوره خرید با هوش مصنوعی",
        ],
      }}
    >
      <Suspense fallback={<div className="h-72" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

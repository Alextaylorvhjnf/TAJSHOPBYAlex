import { ok } from "@/lib/api";
import { db } from "@/lib/db";
import { deliveryEtaText } from "@/lib/orders";
import { getBranding, getFooterLinks, getPaymentSettings, getStoreSettings, getSocialLinks } from "@/lib/settings";
import { getTemplateContentData } from "@/lib/templates/content";

/** Public store info (no secrets) — used by checkout + contact page.
 * v32 (13-g): also returns { activeTemplate, aiWidgetImage } so the global
 * floating AI chat widget can resolve its THEME-AWARE art client-side —
 * activeTemplate is the live template id, aiWidgetImage is that template's
 * own content override (templateContent.texts.aiWidgetImage, Admin → ظاهر →
 * محتوای اختصاصی قالب) or null (the widget then falls back to its
 * per-template default persona). Additive fields — existing consumers
 * unaffected. */
export async function GET() {
  const [branding, payment, store, footerLinks, deliveryMethods] = await Promise.all([
    getBranding(),
    getPaymentSettings(),
    getStoreSettings(),
    getFooterLinks(),
    // v16: active delivery methods for checkout selection (sortOrder asc)
    db.deliveryMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        cost: true,
        etaMinDays: true,
        etaMaxDays: true,
        icon: true,
        description: true,
      },
    }),
  ]);
  const social = getSocialLinks(store);

  /* v32 (13-g): theme-aware AI-widget art — the ACTIVE template's own
   * content override (templateContent.texts.aiWidgetImage) resolved
   * server-side; null → the widget's per-template default persona.
   * getTemplateContentData never throws (pre-install → empty content). */
  const activeTemplate = store.activeTemplate || "modern-tech";
  let aiWidgetImage: string | null = null;
  try {
    aiWidgetImage = (await getTemplateContentData(activeTemplate))?.texts?.aiWidgetImage?.trim() || null;
  } catch {
    aiWidgetImage = null;
  }

  return ok({
    branding: {
      storeName: branding.storeName,
      storeNameEn: branding.storeNameEn,
      logo: branding.logo,
      shortDescription: branding.shortDescription,
    },
    contact: {
      phone: branding.phone,
      mobile: branding.mobile,
      email: branding.email,
      address: branding.address,
      workingHours: branding.workingHours,
    },
    social,
    footerLinks,
    paymentMethods: {
      zarinpal: payment.zarinpalEnabled && !!payment.zarinpalMerchantId,
      cardToCard: payment.c2cEnabled,
    },
    activeTemplate,
    aiWidgetImage,
    shipping: { flat: store.shippingFlat, freeOver: store.freeShippingOver },
    minOrderAmount: store.minOrderAmount,
    storePhone: store.phone,
    deliveryMethods: deliveryMethods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      cost: m.cost,
      etaMinDays: m.etaMinDays,
      etaMaxDays: m.etaMaxDays,
      etaText: deliveryEtaText(m.etaMinDays, m.etaMaxDays),
      icon: m.icon,
      description: m.description,
    })),
  });
}

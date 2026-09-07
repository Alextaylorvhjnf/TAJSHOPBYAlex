import { ok } from "@/lib/api";
import { db } from "@/lib/db";
import { deliveryEtaText } from "@/lib/orders";
import { getBranding, getFooterLinks, getPaymentSettings, getStoreSettings, getSocialLinks } from "@/lib/settings";

/** Public store info (no secrets) — used by checkout + contact page */
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

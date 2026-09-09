import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, ok, getClientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getInstallStatus } from "@/lib/installer/state";
import { existsSync, statSync } from "fs";
import path from "path";

/**
 * POST /api/install/demo-catalog — v29 demo-catalog installer step.
 *
 * Applies the SHIPPED demo catalog (db/catalog-seed.db — the same pristine
 * catalog database that has always shipped with the zip; Docker seeds it via
 * docker-entrypoint.sh) into the live database during the install wizard, so
 * a fresh store starts with the full v28 demo content:
 *
 *   21 categories · 16 brands · 37 products (93 gallery images) ·
 *   3 sliders · 16 stories · 2 showcases · 8 CMS pages · 12 footer links ·
 *   2 coupons · 8 delivery methods + demo store/payment settings.
 *
 * Safety rules:
 *   • runs ONLY while the installer is unlocked (before /api/install/complete)
 *   • NON-destructive & idempotent: if the live database already has
 *     products, NOTHING is imported or overwritten (Docker first-boot seed
 *     therefore results in a clean «already present» skip)
 *   • never touches users, sessions, orders or the admin account
 *   • demo settings are merged only into empty/default fields — values the
 *     admin has already configured stay untouched
 */
export async function POST(req: Request) {
  const status = await getInstallStatus(true);
  if (status.installed) {
    return fail("نصب این برنامه قبلاً تکمیل شده است.", 403, "ALREADY_INSTALLED");
  }
  if (!rateLimit(`install-catalog:${getClientIp(req)}`, 6, 60_000).ok) {
    return fail("درخواست‌های زیاد. یک دقیقه دیگر تلاش کنید.", 429);
  }

  /* locate the shipped seed database (repo layout + docker image layout) */
  const candidates = [
    path.join(process.cwd(), "db", "catalog-seed.db"),
    path.join(process.cwd(), "db-seed", "catalog.db"),
  ];
  const seedPath = candidates.find((p) => existsSync(p) && statSync(p).size > 0);
  if (!seedPath) {
    return fail("فایل کاتالوگ نمونه (catalog-seed.db) پیدا نشد — از نصب داده‌های نمونه صرف‌نظر می‌شود.", 404, "SEED_NOT_FOUND");
  }

  try {
    /* idempotence — an already-populated catalog is never touched */
    const existing = await db.product.count();
    if (existing > 0) {
      return ok({
        applied: false,
        skipped: "catalog-exists",
        message: `کاتالوگ فروشگاه از قبل موجود است (${existing} محصول) — داده‌های نمونه دوباره اعمال نشد.`,
        counts: { products: existing },
      });
    }

    /* second Prisma client pointed at the shipped seed database */
    const seed = new PrismaClient({
      datasources: { db: { url: `file:${seedPath}` } },
      log: [],
    } as ConstructorParameters<typeof PrismaClient>[0]);

    const imported: Record<string, number> = {};

    try {
      /* parents first (FK-safe order) */
      const [categories, brands] = await Promise.all([seed.category.findMany(), seed.brand.findMany()]);
      await db.category.createMany({ data: categories });
      await db.brand.createMany({ data: brands });
      imported.categories = categories.length;
      imported.brands = brands.length;

      const products = await seed.product.findMany();
      await db.product.createMany({ data: products });
      imported.products = products.length;

      const images = await seed.productImage.findMany();
      await db.productImage.createMany({ data: images });
      imported.galleryImages = images.length;

      const [sliders, stories, showcases, cms, footerLinks, coupons, delivery] = await Promise.all([
        seed.slider.findMany(),
        seed.story.findMany(),
        seed.promotionalShowcase.findMany(),
        seed.cmsPage.findMany(),
        seed.footerLink.findMany(),
        seed.coupon.findMany(),
        seed.deliveryMethod.findMany(),
      ]);
      await db.slider.createMany({ data: sliders });
      await db.story.createMany({ data: stories });
      await db.promotionalShowcase.createMany({ data: showcases });
      await db.cmsPage.createMany({ data: cms });
      await db.footerLink.createMany({ data: footerLinks });
      await db.coupon.createMany({ data: coupons });
      await db.deliveryMethod.createMany({ data: delivery });
      imported.sliders = sliders.length;
      imported.stories = stories.length;
      imported.showcases = showcases.length;
      imported.cmsPages = cms.length;
      imported.footerLinks = footerLinks.length;
      imported.coupons = coupons.length;
      imported.deliveryMethods = delivery.length;

      /* demo store settings — merged ONLY into empty fields; the admin's own
       * values (store name, template, maintenance, branding, …) are kept */
      const seedSettings = await seed.storeSettings.findFirst();
      const liveSettings = await db.storeSettings.findFirst();
      if (seedSettings && liveSettings) {
        const demoFields = [
          "shortDescription", "description", "phone", "email", "address",
          "workingHours", "instagram", "telegram", "whatsapp", "youtube",
          "twitter", "linkedin", "footerText", "announcement", "announcementLink",
          "tickerMessages", "templateFeatures", "aiReviewReplier",
        ] as const;
        const patch: Record<string, unknown> = {};
        for (const f of demoFields) {
          const v = (seedSettings as Record<string, unknown>)[f];
          const live = (liveSettings as Record<string, unknown>)[f];
          const liveEmpty = live === null || live === undefined || live === "" || live === "[]";
          if (v !== null && v !== undefined && v !== "" && liveEmpty) patch[f] = v;
        }
        if (seedSettings.announcement && !liveSettings.announcement) {
          patch.announcement = seedSettings.announcement;
          patch.announcementActive = true;
        }
        if (seedSettings.tickerMessages && !liveSettings.tickerMessages) {
          patch.tickerMessages = seedSettings.tickerMessages;
        }
        if (Object.keys(patch).length) {
          await db.storeSettings.update({ where: { id: liveSettings.id }, data: patch });
          imported.demoSettings = Object.keys(patch).length;
        }
      }

      /* demo payment settings (demo ZarinPal merchant + card-to-card card) —
       * only into fields the admin has not configured yet */
      const seedPay = await seed.paymentSettings.findFirst();
      const livePay = await db.paymentSettings.findFirst();
      if (seedPay && livePay) {
        const payFields = [
          "zarinpalMerchantId", "c2cCardNumber", "c2cCardHolder",
          "c2cIBAN", "c2cAccountNumber", "c2cInstructions",
        ] as const;
        const patch: Record<string, unknown> = {};
        for (const f of payFields) {
          const v = (seedPay as Record<string, unknown>)[f];
          const live = (livePay as Record<string, unknown>)[f];
          if (v !== null && v !== undefined && v !== "" && (live === null || live === undefined || live === "")) patch[f] = v;
        }
        if (Object.keys(patch).length) {
          await db.paymentSettings.update({ where: { id: livePay.id }, data: patch });
          imported.demoPaymentFields = Object.keys(patch).length;
        }
      }
    } finally {
      await seed.$disconnect().catch(() => {});
    }

    return ok({
      applied: true,
      counts: imported,
      message:
        `کاتالوگ نمونه نصب شد: ${imported.products} محصول، ${imported.categories} دسته‌بندی، ${imported.brands} برند، ` +
        `${imported.sliders} اسلایدر، ${imported.stories} استوری و ${imported.deliveryMethods} روش ارسال.`,
    });
  } catch (e) {
    console.error("[installer] demo-catalog failed:", e);
    return fail("نصب داده‌های نمونه با خطا مواجه شد — می‌توانید ادامه دهید و بعداً از پنل مدیریت محصولات را افزودید.", 500);
  }
}

import Link from "next/link";
import { db } from "@/lib/db";
import { getBranding, getFooterLinks, getStoreSettings, getSocialLinks, renderCopyright, getTemplateFooterContent, type TemplateFooterContent } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { TAJLogo } from "./logo";
import { FooterNav } from "./footer-nav";
import { paletteFooterStyle, isDarkColor, sharedFooterCss, type TemplatePalette, type TemplatePalettePair } from "@/lib/templates/canvas";
import {
  Crown, Instagram, Send, MessageCircle, Youtube, Twitter, Linkedin,
  ShieldCheck, Truck, RotateCcw, Headphones, CreditCard, Lock,
} from "lucide-react";

/**
 * CMS-driven footer (server component) — dense, balanced and fully
 * responsive.
 *
 * Content sources (NOTHING is hardcoded except the Alaruz Design credit):
 * - branding / contact / socials ……… StoreSettings (admin → تنظیمات)
 * - customer & store link columns ……… FooterLink CMS (admin → فوتر)
 * - categories column ………………………… DB (active root categories)
 *
 * The single intentional hardcode is the Alaruz Design development credit
 * at the very bottom — it must NOT be editable/removable from the admin.
 *
 * v25: `palette` — when the active template defines a canvas palette, the
 * shared footer paints itself with it (same color as the theme) instead of
 * the default inverted ink surface. The Alaruz credit stays exactly as is.
 *
 * v27b: `templateFooters` — the ACTIVE template's per-template footer
 * content (Admin → تنظیمات → فوتر → «تنظیمات فوتر قالب فعال») takes
 * priority over the global values here too: footerText replaces the brand
 * blurb, copyrightText replaces the copyright line input, and non-empty
 * customerLinks/storeLinks arrays replace the global FooterLink columns.
 * Empty/absent override = the global value renders exactly as before.
 */
function toNavItems(links: { label: string; url: string }[] | undefined, section: "CUSTOMER" | "STORE") {
  return (links ?? []).map((l, i) => ({
    id: `tpl-${section.toLowerCase()}-${i}`,
    section,
    label: l.label,
    url: l.url,
    sortOrder: i,
    isActive: true,
  }));
}

export default async function Footer({
  palette,
  paletteModes,
}: {
  palette?: TemplatePalette;
  /** v26fix: dual-mode pair — when present the footer flips with the light/dark toggle */
  paletteModes?: TemplatePalettePair;
}) {
  const [branding, footerLinks, settings] = await Promise.all([
    getBranding(),
    getFooterLinks(),
    getStoreSettings(),
  ]);
  const social = getSocialLinks(settings);
  /* v27b: the ACTIVE template's footer content overrides (fall back to the
   * global branding/CMS values field-by-field) */
  const tf: TemplateFooterContent = getTemplateFooterContent(settings.templateFooters, settings.activeTemplate);
  const brandBlurb = tf.footerText?.trim() || branding.shortDescription;
  const copyrightLine = renderCopyright(tf.copyrightText?.trim() || branding.copyrightText, branding.storeName);
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    take: 9,
    select: { id: true, name: true, slug: true },
  });

  const customerLinks = tf.customerLinks?.length
    ? toNavItems(tf.customerLinks, "CUSTOMER")
    : footerLinks.filter((l) => l.section === "CUSTOMER");
  const storeLinks = tf.storeLinks?.length
    ? toNavItems(tf.storeLinks, "STORE")
    : footerLinks.filter((l) => l.section === "STORE");

  const socials: { key: string; href: string; label: string; icon: React.ElementType }[] = [];
  if (social.instagram) socials.push({ key: "instagram", href: social.instagram, label: "اینستاگرام", icon: Instagram });
  if (social.telegram) socials.push({ key: "telegram", href: social.telegram, label: "تلگرام", icon: Send });
  if (social.whatsapp) socials.push({ key: "whatsapp", href: social.whatsapp, label: "واتس‌اپ", icon: MessageCircle });
  if (social.youtube) socials.push({ key: "youtube", href: social.youtube, label: "یوتیوب", icon: Youtube });
  if (social.twitter) socials.push({ key: "twitter", href: social.twitter, label: "توییتر", icon: Twitter });
  if (social.linkedin) socials.push({ key: "linkedin", href: social.linkedin, label: "لینکدین", icon: Linkedin });

  const trust = [
    { icon: ShieldCheck, title: "ضمانت اصالت کالا", desc: "تمام محصولات اورجینال" },
    { icon: Truck, title: "ارسال سریع", desc: "به سراسر ایران" },
    { icon: RotateCcw, title: "۷ روز مهلت بازگشت", desc: "بدون قید و شرط" },
    { icon: Headphones, title: "پشتیبانی واقعی", desc: "پاسخگوی شما هستیم" },
  ];

  /* v25: palette mode — footer surface follows the active template theme.
   * v26fix: with a dual-mode pair the footer is painted by a scoped CSS
   * block (data-shared-footer) that flips with html.dark / html:not(.dark)
   * — a server component can't read the client toggle, but CSS can. The
   * single-palette path keeps the legacy inline style. */
  const rootStyle = palette && !paletteModes ? paletteFooterStyle(palette.bg, palette.fg) : undefined;
  const logoVariant = palette && !isDarkColor(palette.bg) ? "default" : "onDark";

  return (
    <footer
      data-shared-footer={paletteModes ? "" : undefined}
      className={cn(
        "store-shell-footer mt-auto",
        palette ? "text-foreground" : "bg-foreground text-background/90"
      )}
      style={rootStyle}
    >
      {paletteModes && (
        <style data-shared-footer-css dangerouslySetInnerHTML={{ __html: sharedFooterCss(paletteModes, isDarkColor(palette?.bg ?? "#000000")) }} />
      )}
      {/* trust strip — compact (PC: roomier gutters) */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 md:py-5 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {trust.map((f) => (
            <div key={f.title} className="flex items-center gap-2.5">
              <span className="grid place-items-center h-9 w-9 rounded-lg bg-primary/15 text-primary shrink-0">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="flex flex-col leading-5">
                <span className="text-[12px] font-bold">{f.title}</span>
                <span className="text-[10px] text-background/55">{f.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* main grid — dense: brand block + 4 CMS columns (collapsible on mobile).
          PC responsiveness (v15): columns flow 1 → 2 (md) → 4 (lg) inside
          FooterNav, wider gaps at lg/xl, brand rail gets more breathing room. */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(280px,2fr)_3fr] lg:gap-10 xl:grid-cols-[minmax(320px,2fr)_3fr] xl:gap-14">
          {/* brand block — always visible */}
          <div>
            {/* v29: the admin-uploaded FOOTER logo (Branding → «لوگوی فوتر»)
                renders here; empty = the main logo, exactly as before */}
            <TAJLogo variant={logoVariant} src={branding.footerLogo} />
            {brandBlurb && (
              <p className="mt-3 text-[12.5px] leading-7 text-background/60 max-w-sm">
                {brandBlurb}
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={`${s.label} ${branding.storeName}`}
                    className="grid place-items-center h-9 w-9 rounded-lg bg-white/10 transition-colors hover:bg-primary/80 hover:text-primary-foreground"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
            {/* security / payment mini badges */}
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[10.5px] font-medium text-background/70">
                <Lock className="h-3 w-3 text-primary" />
                پرداخت امن
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[10.5px] font-medium text-background/70">
                <CreditCard className="h-3 w-3 text-primary" />
                درگاه بانکی معتبر
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[10.5px] font-medium text-background/70">
                <Crown className="h-3 w-3 text-primary" />
                {branding.storeName}
              </span>
            </div>
          </div>

          {/* CMS columns — accordion on mobile, grid on md+ */}
          <FooterNav
            categories={categories}
            customerLinks={customerLinks}
            storeLinks={storeLinks}
            contact={{
              phone: branding.phone,
              mobile: branding.mobile,
              email: branding.email,
              address: branding.address,
              workingHours: branding.workingHours,
            }}
            storeName={branding.storeName}
          />
        </div>
      </div>

      {/* copyright bar — Alaruz Design credit is intentionally hardcoded
          (store-owner requirement): rendered as a clearly visible signature
          chip, gold-accented and clickable, so the credit is prominent
          rather than buried in tiny faint text.
          data-copyright-bar: anchor used by the floating chat widget to lift
          itself clear of this bar instead of covering the credit (v15). */}
      <div className="border-t border-white/10">
        <div
          data-copyright-bar
          className="mx-auto max-w-7xl px-4 py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-[12px] text-background/60">
          <p className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
            {copyrightLine}
          </p>
          <p className="flex items-center gap-2.5">
            <span dir="ltr" className="font-bold tracking-wide">{branding.storeNameEn}</span>
            <span className="text-background/25" aria-hidden>|</span>
            <span className="flex items-center gap-2">
              <span className="text-background/55">ساخته شده توسط تیم فنی حرفه‌ای</span>
              <a
                href="https://alaruzdesign.ir"
                target="_blank"
                rel="noopener noreferrer"
                title="طراحی و توسعه توسط Alaruz Design"
                className="group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 font-bold text-primary shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
                dir="ltr"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary transition-colors group-hover:bg-primary-foreground" aria-hidden />
                Alaruz Design
                <span aria-hidden className="text-[10px] leading-none transition-transform group-hover:-translate-y-0.5">↗</span>
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

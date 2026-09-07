import type { Metadata } from "next";
import { getBranding, getStoreSettings, getSocialLinks } from "@/lib/settings";
import { getAuthUser, publicUser } from "@/lib/auth";
import { Phone, Smartphone, Mail, MapPin, Clock, Headphones, Instagram, Send, MessageCircle, Youtube, Twitter, Linkedin } from "lucide-react";
import { Reveal } from "@/components/store/reveal";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "تماس با ما" };
}

export default async function ContactPage() {
  const [branding, settings, user] = await Promise.all([getBranding(), getStoreSettings(), getAuthUser()]);
  const social = getSocialLinks(settings);

  type InfoItem = { icon: React.ElementType; title: string; value: string; href?: string; ltr?: boolean };

  const infos: InfoItem[] = [];
  if (branding.phone)
    infos.push({ icon: Phone, title: "تلفن ثابت", value: branding.phone, href: `tel:${branding.phone.replace(/[\s-]/g, "")}`, ltr: true });
  if (branding.mobile)
    infos.push({ icon: Smartphone, title: "موبایل", value: branding.mobile, href: `tel:${branding.mobile.replace(/[\s-]/g, "")}`, ltr: true });
  if (branding.email)
    infos.push({ icon: Mail, title: "ایمیل", value: branding.email, href: `mailto:${branding.email}`, ltr: true });
  if (branding.address)
    infos.push({ icon: MapPin, title: "نشانی", value: branding.address });
  if (branding.workingHours)
    infos.push({ icon: Clock, title: "ساعات کاری", value: branding.workingHours });

  const socials: { key: string; href: string; label: string; icon: React.ElementType }[] = [];
  if (social.instagram) socials.push({ key: "instagram", href: social.instagram, label: "اینستاگرام", icon: Instagram });
  if (social.telegram) socials.push({ key: "telegram", href: social.telegram, label: "تلگرام", icon: Send });
  if (social.whatsapp) socials.push({ key: "whatsapp", href: social.whatsapp, label: "واتس‌اپ", icon: MessageCircle });
  if (social.youtube) socials.push({ key: "youtube", href: social.youtube, label: "یوتیوب", icon: Youtube });
  if (social.twitter) socials.push({ key: "twitter", href: social.twitter, label: "توییتر", icon: Twitter });
  if (social.linkedin) socials.push({ key: "linkedin", href: social.linkedin, label: "لینکدین", icon: Linkedin });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-10 space-y-10">
      {/* hero */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl hero-mesh border p-8 md:p-12" aria-labelledby="contact-hero-title">
          <div className="absolute -start-16 -top-16 opacity-20 pointer-events-none">
            <Headphones className="h-56 w-56 text-primary" strokeWidth={0.8} />
          </div>
          <h1 id="contact-hero-title" className="text-2xl md:text-3xl font-black text-white">
            تماس با {branding.storeName}
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-7 text-white/75">
            سؤال، پیشنهاد یا نیاز به مشاوره دارید؟ کارشناسان {branding.storeName} در ساعات کاری پاسخگوی شما هستند و
            دستیار هوشمند ما ۲۴ ساعته در دسترس است. فرم زیر را تکمیل کنید تا در اولین فرصت پاسخ بگیرید.
          </p>
        </section>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* info cards */}
        <div className="lg:col-span-2 space-y-4">
          {infos.map((info, i) => (
            <Reveal key={info.title} delay={i * 60}>
              <div className="flex items-start gap-4 rounded-2xl border bg-card p-5 card-hover h-full">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <info.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-muted-foreground">{info.title}</p>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="mt-1 block text-[14px] font-bold leading-6 transition-colors hover:text-primary"
                      dir={info.ltr ? "ltr" : undefined}
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] font-medium leading-6">{info.value}</p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}

          {socials.length > 0 && (
            <Reveal delay={infos.length * 60}>
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-[11px] font-bold text-muted-foreground mb-3">ما را در شبکه‌های اجتماعی دنبال کنید</p>
                <div className="flex items-center gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={`${s.label} ${branding.storeName}`}
                      className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <s.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>

        {/* form */}
        <Reveal className="lg:col-span-3" delay={120}>
          <section className="rounded-3xl border bg-card p-6 md:p-8" aria-labelledby="contact-form-title">
            <h2 id="contact-form-title" className="text-lg font-black">ارسال پیام</h2>
            {user ? (
              <>
                <p className="mt-1.5 text-xs text-muted-foreground leading-6">
                  پیام شما به‌صورت تیکت پشتیبانی ثبت می‌شود و پاسخ کارشناسان در بخش «تیکت‌های من» حساب کاربری شما نمایش داده می‌شود.
                </p>
                <ContactForm user={publicUser(user)} />
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
                <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Headphones className="h-7 w-7" />
                </span>
                <h3 className="text-sm font-black">برای ارسال پیام وارد حساب خود شوید</h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                  پیام‌ها فقط برای اعضای واردشده فعال است تا بتوانیم پاسخ را دقیقاً در حساب شما ثبت کنیم و گفتگو کامل و قابل پیگیری باشد.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <a
                    href={`/login?next=${encodeURIComponent("/contact")}`}
                    className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    ورود به حساب
                  </a>
                  <a
                    href="/register"
                    className="inline-flex h-11 items-center rounded-xl border px-6 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
                  >
                    ساخت حساب جدید
                  </a>
                </div>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}

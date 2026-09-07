"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Phone, Smartphone, Mail, MapPin, Clock, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FooterLinkItem } from "@/lib/settings";

type ContactInfo = {
  phone: string;
  mobile: string | null;
  email: string;
  address: string;
  workingHours: string;
};

/**
 * Footer navigation — server-fed (CMS links / DB categories / settings
 * contact info). On mobile the link columns collapse into native-feeling
 * accordions; on ≥md they are always expanded and the headers become
 * non-interactive labels. Only visual behavior lives here — ALL content
 * is CMS/DB driven.
 */
function FooterSection({
  title,
  children,
  open,
  onToggle,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/10 md:border-0 pb-1 md:pb-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-start md:cursor-default md:pointer-events-none"
      >
        <h3 className="text-[13px] font-extrabold text-primary">{title}</h3>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-background/60 transition-transform duration-300 md:hidden",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out md:!grid-rows-[1fr] md:!opacity-100 md:!pt-4",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden md:overflow-visible">{children}</div>
      </div>
    </div>
  );
}

export function FooterNav({
  categories,
  customerLinks,
  storeLinks,
  contact,
  storeName,
}: {
  categories: { id: string; name: string; slug: string }[];
  customerLinks: FooterLinkItem[];
  storeLinks: FooterLinkItem[];
  contact: ContactInfo;
  storeName: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  const linkCls =
    "text-[12.5px] text-background/60 hover:text-primary transition-colors leading-6";

  /* PC responsiveness (v15): 4 link columns run 1 → 2 (md) → 4 (lg) with
     wider gutters at lg/xl so narrow-laptop widths stay balanced. */
  return (
    <div className="grid gap-2 md:grid-cols-2 md:gap-x-6 md:gap-y-8 lg:grid-cols-4 lg:gap-8 xl:gap-10">
      <FooterSection title="دسته‌بندی‌ها" open={open === "cats"} onToggle={() => toggle("cats")}>
        <ul className="space-y-1 pb-3 md:pb-0">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/products?category=${c.slug}`} className={linkCls}>
                {c.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/products" className={cn(linkCls, "font-bold")}>
              همه محصولات ←
            </Link>
          </li>
        </ul>
      </FooterSection>

      <FooterSection title="خدمات مشتریان" open={open === "customer"} onToggle={() => toggle("customer")}>
        <ul className="space-y-1 pb-3 md:pb-0">
          {customerLinks.map((l) => (
            <li key={l.id}>
              <Link href={l.url} className={linkCls}>
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/track-order" className={linkCls}>
              پیگیری سفارش
            </Link>
          </li>
        </ul>
      </FooterSection>

      <FooterSection title="فروشگاه" open={open === "store"} onToggle={() => toggle("store")}>
        <ul className="space-y-1 pb-3 md:pb-0">
          {storeLinks.map((l) => (
            <li key={l.id}>
              <Link href={l.url} className={linkCls}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </FooterSection>

      <FooterSection title="تماس با ما" open={open === "contact"} onToggle={() => toggle("contact")}>
        <ul className="space-y-2 pb-3 md:pb-0 text-[12.5px] text-background/60">
          {contact.phone && (
            <li>
              <a
                href={`tel:${contact.phone.replace(/[\s-]/g, "")}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                {contact.phone}
              </a>
            </li>
          )}
          {contact.mobile && (
            <li>
              <a
                href={`tel:${contact.mobile.replace(/[\s-]/g, "")}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
                dir="ltr"
              >
                <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" />
                {contact.mobile}
              </a>
            </li>
          )}
          {contact.email && (
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 hover:text-primary transition-colors break-all"
                dir="ltr"
              >
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                {contact.email}
              </a>
            </li>
          )}
          {contact.address && (
            <li className="flex items-start gap-2 leading-6">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
              {contact.address}
            </li>
          )}
          {contact.workingHours && (
            <li className="flex items-start gap-2 leading-6">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
              {contact.workingHours}
            </li>
          )}
          <li>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 font-bold text-primary hover:opacity-80 transition-opacity"
            >
              فرم تماس با {storeName}
              <ChevronLeft className="h-3 w-3" />
            </Link>
          </li>
        </ul>
      </FooterSection>
    </div>
  );
}

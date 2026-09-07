/**
 * v29 · MAINTENANCE (REPAIR) PAGE — template registry + content model.
 * -----------------------------------------------------------------------
 * The (store) layout closes the shop for regular visitors while Settings →
 * فروشگاه → «حالت تعمیر» is ON. Instead of a single hardcoded screen the
 * admin can now pick one of several REPAIR-PAGE TEMPLATES (each previewed
 * inside the admin panel) and EVERY word on the page is editable from
 * Settings → فروشگاه → «قالب و متن‌های صفحه تعمیر».
 *
 * The old «ورود مدیران» button is GONE — its place is taken by the
 * «پیگیری سفارش» button so closed visitors can still trace their orders
 * (the /track-order page stays open through the maintenance gate).
 *
 * Presentation-layer only: switching templates never touches store data.
 */

// ─────────────────────────── Content model ───────────────────────────

/** every editable word on the repair page (null/missing = designed default) */
export interface MaintenanceContent {
  /** highlighted suffix after the store name, e.g. «در حالت تعمیر» */
  titleSuffix?: string;
  /** small pill/badge text, e.g. «در حال ارتقا» */
  badge?: string;
  /** main paragraph */
  description?: string;
  /** label before the phone contact */
  phoneLabel?: string;
  /** label before the email contact */
  emailLabel?: string;
  /** label before the working hours, e.g. «ساعات کاری» */
  hoursLabel?: string;
  /** heading of the order-tracking block, e.g. «پیگیری سفارش» */
  trackingTitle?: string;
  /** helper line under the tracking heading */
  trackingDesc?: string;
  /** the tracking button label, e.g. «پیگیری سفارش» */
  trackingButton?: string;
  /** tiny bottom note */
  footerNote?: string;
}

/** designed defaults — byte-identical to the v25–v28 screen wording */
export const DEFAULT_MAINTENANCE_CONTENT: Required<MaintenanceContent> = {
  titleSuffix: "در حالت تعمیر است",
  badge: "در حال ارتقای سامانه",
  description:
    "فروشگاه برای بازدیدکنندگان عادی بسته می‌شود — ما در حال ارتقای سامانه هستیم و به‌زودی با تجربه‌ای بهتر بازمی‌گردیم. از صبر شما سپاسگزاریم 🙏",
  phoneLabel: "تلفن",
  emailLabel: "ایمیل",
  hoursLabel: "ساعات کاری",
  trackingTitle: "سفارش ثبت کرده‌اید؟",
  trackingDesc: "حتی هنگام تعمیر، وضعیت سفارش خود را با شماره سفارش و موبایل پیگیری کنید.",
  trackingButton: "پیگیری سفارش",
  footerNote: "به‌زودی بازمی‌گردیم — از صبر شما سپاسگزاریم",
};

/** parse + merge the raw JSON column with the defaults (never throws) */
export function resolveMaintenanceContent(raw: string | null | undefined): Required<MaintenanceContent> {
  if (!raw?.trim()) return { ...DEFAULT_MAINTENANCE_CONTENT };
  try {
    const parsed = JSON.parse(raw) as MaintenanceContent;
    return { ...DEFAULT_MAINTENANCE_CONTENT, ...(parsed ?? {}) };
  } catch {
    return { ...DEFAULT_MAINTENANCE_CONTENT };
  }
}

// ─────────────────────────── Template registry ───────────────────────────

export const MAINTENANCE_TEMPLATE_IDS = ["tech-dark", "minimal-light", "neon-glass", "countdown-eta"] as const;
export type MaintenanceTemplateId = (typeof MAINTENANCE_TEMPLATE_IDS)[number];

export interface MaintenanceTemplateDef {
  id: MaintenanceTemplateId;
  /** Farsi name shown in the admin chooser */
  nameFa: string;
  /** english slug shown next to the name */
  nameEn: string;
  /** one-line description for the admin */
  desc: string;
}

/** admin-facing registry (order = display order in the chooser) */
export const MAINTENANCE_TEMPLATES: MaintenanceTemplateDef[] = [
  {
    id: "tech-dark",
    nameFa: "تک تاریک",
    nameEn: "tech-dark",
    desc: "همان نمای v28 — شبکه نئونی تیره، لوگو آبی و دکمه پیگیری طلایی (پیش‌فرض)",
  },
  {
    id: "minimal-light",
    nameFa: "مینیمال روشن",
    nameEn: "minimal-light",
    desc: "کارت سفید تمیز و آرام — مناسب برندهایی که سادگی را می‌پسندند",
  },
  {
    id: "neon-glass",
    nameFa: "شیشه‌ای نئون",
    nameEn: "neon-glass",
    desc: "گرادیان‌های شناور و کارت شیشه‌ای — حس مدرن و فان‌تزی‌تر",
  },
  {
    id: "countdown-eta",
    nameFa: "شمارش معکوس",
    nameEn: "countdown-eta",
    desc: "خط پیشرفت متحرک + تأکید روی زمان بازگشتن — حس «به‌زودی» قوی‌تر",
  },
];

export function normalizeMaintenanceTemplateId(v: string | null | undefined): MaintenanceTemplateId {
  return (MAINTENANCE_TEMPLATE_IDS as readonly string[]).includes(v ?? "")
    ? (v as MaintenanceTemplateId)
    : "tech-dark";
}

// ─────────────────────────── AI widget logo map ───────────────────────────

/**
 * v29: which templates the custom AI-widget logo applies to.
 * null map (or missing key) = the logo applies to ALL templates when set.
 */
export function templateUsesAiLogo(raw: string | null | undefined, templateId: string): boolean {
  if (!raw?.trim()) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (!parsed || typeof parsed !== "object") return true;
    return parsed[templateId] !== false;
  } catch {
    return true;
  }
}

/** parse the raw template→bool map (null = all true) */
export function parseTemplateAiLogos(raw: string | null | undefined): Record<string, boolean> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

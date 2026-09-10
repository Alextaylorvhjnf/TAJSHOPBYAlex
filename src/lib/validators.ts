import { z } from "zod";
import { MAINTENANCE_TEMPLATE_IDS } from "@/lib/maintenance";
import { VERTICAL_IDS } from "@/lib/verticals/types";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09123456789)");

export const emailSchema = z.string().trim().email("ایمیل معتبر نیست").or(z.literal(""));

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(72, "رمز عبور حداکثر ۷۲ کاراکتر");

const name = z.string().trim().min(2, "حداقل ۲ کاراکتر").max(60);

export const registerSchema = z.object({
  firstName: name,
  lastName: name,
  email: emailSchema.optional(),
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3, "ایمیل یا شماره موبایل را وارد کنید"),
    // v29: password becomes optional when a recoveryCode is supplied
    // (the «فراموشی رمز» flow on the admin login sends no password).
    password: z.string().optional(),
    recoveryCode: z.string().trim().min(6, "کد بازیابی را وارد کنید").max(120).optional(),
  })
  .refine((v) => (v.password && v.password.length > 0) || !!v.recoveryCode, {
    message: "رمز عبور را وارد کنید",
    path: ["password"],
  });

export const forgotSchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

// ── SMTP (Admin Panel → تنظیمات → ایمیل و SMTP) ──
// NOTE: no `.default("")` here — with Zod 4 a default fires even inside
// .partial() and would wipe unsent fields to "" on partial updates.
export const SMTP_SECURITY_OPTIONS = ["NONE", "STARTTLS", "SSL_TLS"] as const;

export const smtpSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().min(1, "SMTP Host الزامی است").max(255),
  port: z.number().int("پورت باید عدد باشد").min(1, "پورت معتبر نیست").max(65535, "پورت معتبر نیست"),
  security: z.enum(SMTP_SECURITY_OPTIONS),
  username: z.string().trim().max(320),
  // "" یا مقدار ماسک‌شده = حفظ رمز ذخیره‌شده؛ مقدار جدید = ذخیره (رمزنگاری‌شده)
  password: z.string().max(1024).optional(),
  fromName: z.string().trim().max(120),
  /* v35: empty fromEmail is now VALID at the schema level — the admin can
   * save credentials first and fill the sender later. isSmtpConfigured()
   * still guards actual SENDING until the field is completed. This removes
   * the "flaky save" (a half-filled form silently failing validation). */
  fromEmail: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "ایمیل فرستنده معتبر نیست"),
  replyTo: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "ایمیل پاسخ معتبر نیست")
    .nullable()
    .optional(),
});

/** v35: connection-test payload — ONLY the fields a connection test needs.
 *  Sender identity (fromEmail/fromName/replyTo) is explicitly NOT part of
 *  the test, so an admin who just typed host/port/user/pass can test the
 *  connection immediately without a full form failing validation. */
export const smtpConnectionTestSchema = z.object({
  host: z.string().trim().min(1, "SMTP Host الزامی است").max(255),
  port: z.number().int().min(1, "پورت معتبر نیست").max(65535),
  security: z.enum(SMTP_SECURITY_OPTIONS).optional(),
  username: z.string().trim().max(320).optional(),
  password: z.string().max(1024).optional(),
});

export const smtpTestEmailSchema = z.object({
  to: z.string().trim().email("ایمیل مقصد معتبر نیست"),
});

export const profileUpdateSchema = z.object({
  firstName: name,
  lastName: name,
  email: emailSchema.optional(),
  phone: phoneSchema,
  /* v29: admin profile avatar — a preset face from /avatars/, an uploaded
   * image under /uploads/, or the store's own logo from /brand/. null clears. */
  avatar: z
    .string()
    .max(300)
    .refine((v) => v.startsWith("/avatars/") || v.startsWith("/uploads/") || v.startsWith("/brand/"), {
      message: "آواتار نامعتبر است",
    })
    .nullable()
    .optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی را وارد کنید"),
  newPassword: passwordSchema,
});

export const adminPasswordResetSchema = z.object({
  newPassword: passwordSchema,
});

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  color: z.string().max(60).nullable().optional(),
  /** v19: selected variant option (e.g. capacity) — different spec, different price */
  variant: z.string().max(80).nullable().optional(),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const checkoutSchema = z.object({
  firstName: name,
  lastName: name,
  phone: phoneSchema,
  email: emailSchema.optional(),
  province: z.string().trim().min(2, "استان را وارد کنید"),
  city: z.string().trim().min(2, "شهر را وارد کنید"),
  address: z.string().trim().min(10, "آدرس کامل را وارد کنید").max(500),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد")
    .or(z.literal(""))
    .optional(),
  note: z.string().max(500).optional().nullable(),
  // v16: optional id of the admin-managed DeliveryMethod chosen at checkout
  deliveryMethodId: z.string().trim().max(50).optional().nullable(),
  paymentMethod: z.enum(["ZARINPAL", "CARD_TO_CARD"]),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

export const c2cReceiptSchema = z.object({
  orderNumber: z.string().trim().min(4),
  senderName: name,
  senderPhone: phoneSchema,
  senderCard: z.string().trim().regex(/^\d{16}$/, "شماره کارت باید ۱۶ رقم باشد"),
  trackingNumber: z.string().trim().max(30).optional().nullable(),
  amount: z.number().int().positive("مبلغ را وارد کنید"),
  paidAt: z.string().min(4),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  comment: z.string().trim().min(5, "حداقل ۵ کاراکتر").max(1000),
});

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
  context: z
    .object({
      productId: z.string().nullable().optional(),
      page: z.string().max(120).nullable().optional(),
      /** v23: second product for AI compare requests (from the product page
       *  compare dialog) — the server builds a side-by-side context. */
      compareWithId: z.string().max(60).nullable().optional(),
    })
    .optional(),
});

// ── Admin schemas ──

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(200),
  sku: z.string().trim().min(2).max(60),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  price: z.number().int().positive("قیمت باید عدد مثبت باشد"),
  discountPrice: z.number().int().positive().nullable().optional(),
  /** v23: flash-sale deadline (ISO string). While in the future the discount
   *  is LIVE; after it passes the product is no longer on sale (price falls
   *  back to the base price everywhere). null = classic always-on discount. */
  discountEndsAt: z.string().datetime().nullable().optional(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).default(5),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  colors: z.array(z.object({ name: z.string().max(50), hex: z.string().max(20).optional(), price: z.number().int().min(0).optional() })).optional(),
  variants: z.array(z.object({ name: z.string().max(80), priceDelta: z.number().int().default(0), stock: z.number().int().default(0), sku: z.string().max(60).optional() })).optional(),
  // v20: SIMPLE (one price) | VARIABLE (color×spec combination pricing).
  // NOTE: same PUT/.partial() caveat as status above — the admin form ALWAYS
  // sends productType explicitly, and the update route only writes it when set.
  productType: z.enum(["SIMPLE", "VARIABLE"]).default("SIMPLE"),
  // v20: per color×variant combination prices — each row is the EXACT absolute
  // price (Toman) for that color + specification (e.g. مشکی + 8/256 = 20,000,000).
  // color/variant null = "(بدون رنگ)" / "(بدون مشخصه)" rows. stock 0 = ناموجود.
  // v26fix: optional per-combination discount price — when set (0 < it < price)
  // the storefront/cart use it as that row's unit price.
  combinations: z
    .array(
      z.object({
        color: z.string().max(50).nullable().optional(),
        variant: z.string().max(80).nullable().optional(),
        price: z.number().int().min(0),
        discountPrice: z.number().int().min(0).optional(),
        stock: z.number().int().min(0).optional(),
      })
    )
    .max(60)
    .optional(),
  specifications: z.array(z.object({ key: z.string().max(80), label: z.string().max(120), value: z.string().max(500), group: z.string().max(120).optional() })).optional(),
  tags: z.array(z.string().max(60)).optional(),
  mainImage: z.string().max(500).optional().nullable(),
  images: z.array(z.object({ url: z.string().max(500), alt: z.string().max(200).optional() })).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  featured: z.boolean().default(false),
  isSpecial: z.boolean().default(false),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.string().max(400).optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(60).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  parentId: z.string().nullable().optional(),
  specTemplate: z.array(z.object({ key: z.string().max(80), label: z.string().max(120) })).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100),
  logo: z.string().max(500).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const sliderSchema = z.object({
  title: z.string().trim().min(2).max(150),
  subtitle: z.string().max(300).optional().nullable(),
  desktopImage: z.string().min(3).max(500),
  mobileImage: z.string().max(500).optional().nullable(),
  buttonText: z.string().max(60).optional().nullable(),
  buttonUrl: z.string().max(500).optional().nullable(),
  badge: z.string().max(60).optional().nullable(),
  productId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9-]+$/),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  minAmount: z.number().int().min(0).default(0),
  maxUsage: z.number().int().min(0).default(0),
  perUserLimit: z.number().int().min(1).default(1),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().min(2).max(100),
  storeNameEn: z.string().min(2).max(100),
  logo: z.string().max(500).optional().nullable(),
  favicon: z.string().max(500).optional().nullable(),
  footerLogo: z.string().max(500).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  metaTitle: z.string().max(120).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
  phone: z.string().max(30),
  mobile: z.string().max(30).optional().nullable(),
  email: z.string().max(120),
  address: z.string().max(300),
  workingHours: z.string().max(120).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  telegram: z.string().max(200).optional().nullable(),
  // v34.1: Telegram shopping-bot link for the footer «خرید از ربات تلگرامی»
  // button — accepts @username, t.me/… links or any full https URL.
  telegramBotUrl: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .refine((v) => !v || v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://") || v.startsWith("@") || /^t\.me\//i.test(v), {
      message: "لینک ربات باید @username، t.me/… یا آدرس کامل https باشد",
    }),
  whatsapp: z.string().max(200).optional().nullable(),
  youtube: z.string().max(200).optional().nullable(),
  twitter: z.string().max(200).optional().nullable(),
  linkedin: z.string().max(200).optional().nullable(),
  footerText: z.string().max(300),
  description: z.string().max(500).optional().nullable(),
  shippingFlat: z.number().int().min(0),
  freeShippingOver: z.number().int().min(0),
  taxPercent: z.number().min(0).max(100),
  currency: z.string().max(20),
  minOrderAmount: z.number().int().min(0),
  maintenanceMode: z.boolean().default(false),
  announcement: z.string().max(300).optional().nullable(),
  // announcement bar controls (Settings → فروشگاه)
  announcementActive: z.boolean().default(true),
  announcementLink: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .refine((v) => !v || v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://"), {
      message: "لینک اعلان باید مسیر داخلی (/…) یا آدرس کامل https باشد",
    }),
  // v20: marquee ticker messages (Settings → فروشگاه) — admin managed list;
  // each row rotates inside the template header ticker strips. Empty/omitted
  // = fall back to the single announcement message.
  tickerMessages: z
    .array(
      z.object({
        text: z.string().trim().min(2, "متن پیام حداقل ۲ کاراکتر باشد").max(200),
        link: z
          .string()
          .max(300)
          .optional()
          .nullable()
          .refine((v) => !v || v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://"), {
            message: "لینک پیام باید مسیر داخلی (/…) یا آدرس کامل https باشد",
          }),
      })
    )
    .max(8, "حداکثر ۸ پیام متحرک")
    .optional()
    .nullable(),
  // v22: admin-controlled marquee speed (seconds per loop, lower = faster).
  // 0/null = keep each template's own designed default speed.
  tickerSpeed: z
    .number()
    .int()
    .min(0, "سرعت نامعتبر است")
    .max(120, "حداکثر ۱۲۰ ثانیه")
    .optional()
    .nullable(),
  copyrightText: z.string().max(300).optional(),
  /* v29 · maintenance (repair) page — template + every editable word.
   * Empty string / null on a content key = the designed default. */
  maintenanceTemplate: z.enum(MAINTENANCE_TEMPLATE_IDS).optional(),
  maintenanceContent: z
    .object({
      titleSuffix: z.string().max(200).optional().nullable(),
      badge: z.string().max(120).optional().nullable(),
      description: z.string().max(800).optional().nullable(),
      phoneLabel: z.string().max(60).optional().nullable(),
      emailLabel: z.string().max(60).optional().nullable(),
      hoursLabel: z.string().max(60).optional().nullable(),
      trackingTitle: z.string().max(120).optional().nullable(),
      trackingDesc: z.string().max(300).optional().nullable(),
      trackingButton: z.string().max(60).optional().nullable(),
      footerNote: z.string().max(200).optional().nullable(),
      /* v30: caption above the countdown digits (countdown-eta template) */
      etaNote: z.string().max(200).optional().nullable(),
      /* v32 (13-d): repair-page logo override + countdown target (strings;
       * empty/omitted = designed fallback) */
      logoUrl: z.string().max(500).optional().nullable(),
      countdownDays: z.string().max(8).optional().nullable(),
      countdownHours: z.string().max(8).optional().nullable(),
      /* v35: EXACT countdown target — ISO datetime string chosen by the admin
       * (datetime-local input). Empty/omitted = legacy anchor behavior. */
      endsAt: z.string().max(40).optional().nullable(),
    })
    .optional()
    .nullable(),
  /* v29 · AI widget logo (image + which templates use it). Stored on
   * StoreSettings but managed from the AI tab (the PUT there also writes
   * these two fields). */
  aiWidgetLogo: z.string().max(500).optional().nullable(),
  templateAiLogos: z.string().max(8000).optional().nullable(),
});

// ── Theme engine ──
export const THEME_IDS = ["gold", "emerald", "crimson", "electric", "royal", "neutral"] as const;

export const themeSettingsSchema = z.object({
  themeId: z.enum(THEME_IDS),
  colorMode: z.enum(["light", "dark", "system"]),
});

// ── Footer CMS ──
export const footerLinkSchema = z.object({
  section: z.enum(["CUSTOMER", "STORE"]),
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(300),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const footerLinkUpdateSchema = footerLinkSchema.partial();

// ── CMS pages ──
export const CMS_SECTION_MAX = 40;

export const cmsSectionSchema = z.object({
  h: z.string().trim().min(1).max(200),
  p: z.string().trim().min(1).max(4000),
});

export const cmsPageSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "اسلاگ فقط حروف کوچک انگلیسی، عدد و خط تیره"),
  title: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(40).optional().nullable(),
  sections: z.array(cmsSectionSchema).max(CMS_SECTION_MAX).default([]),
  seoTitle: z.string().max(120).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const cmsPageUpdateSchema = cmsPageSchema.partial();

// ── Contact form (logged-in users → SupportTicket) ──
// v14.1: the honeypot field ("company": z.string().max(0)) was REMOVED —
// browser autofill filled the hidden input for real logged-in users and
// zod then rejected the whole message with
// "Too big: expected string to have <=0 characters" (reported bug).
// Contact is now auth-gated, which covers spam far better than a honeypot.
export const contactMessageSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().email("ایمیل معتبر نیست").max(120).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^0?9\d{9}$|^0\d{2,3}-?\d{7,8}$/, "شماره تماس معتبر نیست")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(3000),
});

export const customerMessageStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED", "CLOSED"]),
  adminNote: z.string().max(2000).optional().nullable(),
});

// ── Support tickets (v14.1 ticketing system) ──
// v16: media attachments — every message may carry up to 4 files
// (images / videos uploaded via /api/tickets/upload into /uploads/tickets/).
// `body` becomes optional when at least one attachment is present.
export const ticketAttachmentSchema = z.object({
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v.startsWith("/uploads/tickets/"), "آدرس فایل پیوست نامعتبر است"),
  name: z.string().trim().max(120).optional(),
  // image | video
  kind: z.enum(["image", "video"]).optional(),
  size: z.number().int().min(0).max(64 * 1024 * 1024).optional(),
});

export const ticketCreateSchema = z
  .object({
    subject: z.string().trim().min(2, "موضوع باید حداقل ۲ حرف باشد").max(120),
    message: z.string().trim().max(3000).optional().default(""),
    attachments: z.array(ticketAttachmentSchema).max(4, "حداکثر ۴ فایل در هر پیام").optional(),
  })
  .refine(
    (v) => (v.message && v.message.length >= 10) || (v.attachments && v.attachments.length > 0),
    { message: "پیام باید حداقل ۱۰ حرف باشد یا فایل پیوست داشته باشد" }
  );

export const ticketReplySchema = z
  .object({
    body: z.string().trim().max(3000).optional().default(""),
    attachments: z.array(ticketAttachmentSchema).max(4, "حداکثر ۴ فایل در هر پیام").optional(),
  })
  .refine(
    (v) => (v.body && v.body.length > 0) || (v.attachments && v.attachments.length > 0),
    { message: "متن پیام یا فایل پیوست لازم است" }
  );

export const TICKET_STATUSES = ["OPEN", "ANSWERED", "CLOSED"] as const;

// ── Delivery methods (v16 delivery system) ──
// POST | COURIER | FREIGHT | EXPRESS | PICKUP
export const DELIVERY_TYPES = ["POST", "COURIER", "FREIGHT", "EXPRESS", "PICKUP"] as const;

// NOTE (Zod 4): no `.default()` on the base fields — a default fires even
// inside .partial() and would silently overwrite unsent fields on partial
// updates (same trap documented on smtpSettingsSchema above). The create API
// applies fallbacks server-side instead.
const deliveryMethodBase = z.object({
  name: z.string().trim().min(2, "نام روش ارسال باید حداقل ۲ حرف باشد").max(80),
  description: z.string().trim().max(300).optional().nullable(),
  type: z.enum(DELIVERY_TYPES),
  cost: z.number().int().min(0, "هزینه ارسال باید عددی نامنفی باشد"),
  etaMinDays: z.number().int().min(0).max(30, "بازه روز نامعتبر است"),
  etaMaxDays: z.number().int().min(0).max(60, "بازه روز نامعتبر است"),
  icon: z.string().trim().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const deliveryMethodSchema = deliveryMethodBase.refine((v) => v.etaMaxDays >= v.etaMinDays, {
  message: "حداکثر روز ارسال نمی‌تواند کمتر از حداقل آن باشد",
  path: ["etaMaxDays"],
});

export const deliveryMethodUpdateSchema = deliveryMethodBase.partial();

// ── Stories ──
export const storySchema = z.object({
  title: z.string().trim().min(1).max(80),
  image: z.string().trim().min(1).max(500),
  // optional story video (spec §10) — /uploads/videos/... or https URL
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/uploads/") || v.startsWith("https://"), "آدرس ویدیو باید داخلی یا https باشد")
    .optional()
    .nullable(),
  // per-story slide duration (ms) — admin configurable, spec §26 (3s … 10s)
  duration: z.number().int().min(3000).max(10000).default(6000),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), "لینک باید داخلی یا https باشد")
    .optional()
    .or(z.literal("")),
  badge: z.string().trim().max(30).optional().nullable(),
  productId: z.string().max(50).optional().nullable(),
  categoryId: z.string().max(50).optional().nullable(),
  expiresAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const storyUpdateSchema = storySchema.partial();

// ── Storefront template switching (Appearance → تغییر قالب فروشگاه) ──
import { TEMPLATE_IDS, DEFAULT_TEMPLATE_ID } from "@/lib/templates/registry";
export const templateApplySchema = z.object({
  templateId: z.enum(TEMPLATE_IDS as [string, ...string[]]).default(DEFAULT_TEMPLATE_ID),
});

// ── Promotional showcases ──
export const showcaseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional().nullable(),
  image: z.string().trim().min(1).max(500),
  buttonText: z.string().trim().max(40).optional().nullable(),
  buttonUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), "لینک باید داخلی یا https باشد")
    .optional()
    .or(z.literal("")),
  badge: z.string().trim().max(30).optional().nullable(),
  productId: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const showcaseUpdateSchema = showcaseSchema.partial();

export const paymentSettingsSchema = z.object({
  zarinpalEnabled: z.boolean().default(false),
  zarinpalSandbox: z.boolean().default(true),
  zarinpalMerchantId: z.string().max(80).optional().nullable(),
  // v19 (ZarinPal v4 docs): IRR = مبلغ به ریال (پیش‌فرض) | IRT = مبلغ به تومان
  zarinpalCurrency: z.enum(["IRR", "IRT"]).default("IRR"),
  // v19: کد معرف (referrer_id) — اختیاری
  zarinpalReferrer: z.string().max(60).optional().nullable(),
  c2cEnabled: z.boolean().default(true),
  c2cCardNumber: z.string().max(30).optional(),
  c2cCardHolder: z.string().max(100).optional(),
  c2cIBAN: z.string().max(40).optional(),
  c2cAccountNumber: z.string().max(30).optional(),
  c2cInstructions: z.string().max(1000).optional(),
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  // v28: builtin | gapgpt (GapGPT API — https://api.gapgpt.app/v1,
  // OpenAI-compatible; the old openai/gemini/auto providers were removed)
  provider: z.enum(["builtin", "gapgpt"]).default("builtin"),
  gapApiKey: z.string().max(300).optional().nullable(),
  gapModel: z.string().max(80).default("gpt-4o"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(256).max(32768).default(2048),
  systemPrompt: z.string().max(6000).optional().nullable(),
  /* v29: AI chat-widget logo — an uploaded image used as the widget's
   * face (FAB + panel header + empty state) + the per-template map of
   * which storefront templates render it. Both live on StoreSettings. */
  aiWidgetLogo: z
    .string()
    .max(500)
    .refine((v) => v.startsWith("/uploads/") || v.startsWith("/brand/"), { message: "لوگوی دستیار نامعتبر است" })
    .optional()
    .nullable(),
  templateAiLogos: z
    .string()
    .max(8000)
    .refine(
      (v) => {
        if (!v?.trim()) return true;
        try {
          const parsed = JSON.parse(v);
          return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
        } catch {
          return false;
        }
      },
      { message: "نقشه قالب‌های لوگوی دستیار نامعتبر است" },
    )
    .optional()
    .nullable(),
});

/* v35 · «صنف فروشگاه» — vertical switch */
export const verticalApplySchema = z.object({
  verticalId: z.enum(VERTICAL_IDS, { message: "صنف انتخابی نامعتبر است" }),
  renameStore: z.boolean().optional(),
});

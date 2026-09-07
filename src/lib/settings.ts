import { db, ensureRuntimeSchema } from "@/lib/db";

/* v29.1: every settings getter first awaits the runtime schema self-heal —
 * an upgraded (v28) database volume missing the new columns would otherwise
 * throw P2022 and 500 the storefront. Cached per process, so free afterwards. */

type StoreSettingsT = Awaited<ReturnType<typeof db.storeSettings.findUnique>>;
type PaymentSettingsT = Awaited<ReturnType<typeof db.paymentSettings.findUnique>>;
type AiSettingsT = Awaited<ReturnType<typeof db.aiSettings.findUnique>>;
type SmtpSettingsT = Awaited<ReturnType<typeof db.smtpSettings.findUnique>>;
type ThemeSettingsT = Awaited<ReturnType<typeof db.themeSettings.findUnique>>;
type FooterLinkT = Awaited<ReturnType<typeof db.footerLink.findFirst>>;
export type FooterLinkRow = Awaited<ReturnType<typeof db.footerLink.findMany>>;

/* v29.2 FIX (SMTP « رمز ذخیره نمی‌شود »): the cache used ONE shared `at`
 * timestamp for every settings type. Any other getter (store/theme — run on
 * every page render) refreshed `at`, so a STALE cached row (e.g. the SMTP
 * row captured BEFORE the admin saved a new password) stayed "fresh"
 * indefinitely → test-connection authenticated with the OLD password →
 * «کانفیگ اشتباه است», then after some quiet seconds it worked again →
 * the exact flaky behavior the admin reported.
 * Now every entry carries its OWN `at`, so each type expires exactly after
 * the TTL. SMTP additionally bypasses the cache entirely (a single-row
 * SQLite read — the credentials must ALWAYS be the just-saved ones). */
interface CacheEntry<T> {
  at: number;
  value: T;
}

const cache: {
  store?: CacheEntry<NonNullable<StoreSettingsT>>;
  payment?: CacheEntry<NonNullable<PaymentSettingsT>>;
  ai?: CacheEntry<NonNullable<AiSettingsT>>;
  smtp?: CacheEntry<NonNullable<SmtpSettingsT>>;
  theme?: CacheEntry<NonNullable<ThemeSettingsT>>;
  footerLinks?: CacheEntry<FooterLinkRow>;
} = {};
/* v28: 15s → 1.5s. Template/appearance switches must be visible on the
 * NEXT page view, not "several refreshes later". In dev, route-handler and
 * page bundles keep separate module instances of this file, so
 * invalidateSettingsCache() from an admin API never reaches the page-side
 * cache — expiry is the only cross-instance mechanism and 15s felt stale.
 * Cost: at most ONE extra single-row SQLite read per 1.5s — negligible.
 * In production (shared bundle) invalidation is additionally instant. */
const TTL = 1_500;

export function invalidateSettingsCache() {
  cache.store = undefined;
  cache.payment = undefined;
  cache.ai = undefined;
  cache.smtp = undefined;
  cache.theme = undefined;
  cache.footerLinks = undefined;
}

function fresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.at < TTL;
}

export async function getStoreSettings(): Promise<NonNullable<StoreSettingsT>> {
  await ensureRuntimeSchema();
  if (fresh(cache.store)) return cache.store.value;
  let s = await db.storeSettings.findUnique({ where: { id: "main" } });
  if (!s) s = await db.storeSettings.create({ data: { id: "main" } });
  cache.store = { at: Date.now(), value: s };
  return s;
}

export async function getPaymentSettings(): Promise<NonNullable<PaymentSettingsT>> {
  await ensureRuntimeSchema();
  if (fresh(cache.payment)) return cache.payment.value;
  let s = await db.paymentSettings.findUnique({ where: { id: "main" } });
  if (!s) s = await db.paymentSettings.create({ data: { id: "main" } });
  cache.payment = { at: Date.now(), value: s };
  return s;
}

export async function getAISettings(): Promise<NonNullable<AiSettingsT>> {
  await ensureRuntimeSchema();
  if (fresh(cache.ai)) return cache.ai.value;
  let s = await db.aiSettings.findUnique({ where: { id: "main" } });
  if (!s) s = await db.aiSettings.create({ data: { id: "main" } });
  cache.ai = { at: Date.now(), value: s };
  return s;
}

export async function getSmtpSettings(): Promise<NonNullable<SmtpSettingsT>> {
  await ensureRuntimeSchema();
  /* v29.2: NEVER cached — see the note above the cache declaration. The
   * SMTP row must reflect the very latest PUT (test-connection + every
   * send authenticate with these credentials). One single-row read. */
  let s = await db.smtpSettings.findUnique({ where: { id: "main" } });
  if (!s) s = await db.smtpSettings.create({ data: { id: "main" } });
  return s;
}

// ─────────────────────────── Theme engine ───────────────────────────

export const THEME_IDS = ["gold", "emerald", "crimson", "electric", "royal", "neutral"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export type ColorMode = "light" | "dark" | "system";

export const THEME_META: Record<ThemeId, { fa: string; en: string; desc: string }> = {
  gold: { fa: "طلایی سلطنتی", en: "Royal Gold", desc: "هویت اصلی تاج — طلایی، زغالی و عاجی" },
  emerald: { fa: "زمرد", en: "Emerald", desc: "سبز زمردی، مشکی و سفید — تازه و مطمئن" },
  crimson: { fa: "یاقوتی سرخ", en: "Crimson", desc: "قرمز امضادار، مشکی و سفید — پرانرژی" },
  electric: { fa: "آبی الکتریکی", en: "Electric", desc: "آبی الکتریکی، مشکی و سفید — تکنولوژیک" },
  royal: { fa: "بنفش سلطنتی", en: "Royal Purple", desc: "بنفش سلطنتی، مشکی و سفید — لوکس" },
  neutral: { fa: "خنثی مینیمال", en: "Minimal Neutral", desc: "تک‌رنگ مینیمال، مشکی و سفید — آرام" },
};

export async function getThemeSettings(): Promise<{
  themeId: ThemeId;
  colorMode: ColorMode;
}> {
  if (fresh(cache.theme)) {
    return normalizeTheme(cache.theme.value);
  }
  let t = await db.themeSettings.findUnique({ where: { id: "main" } });
  if (!t) t = await db.themeSettings.create({ data: { id: "main" } });
  cache.theme = { at: Date.now(), value: t };
  return normalizeTheme(t);
}

function normalizeTheme(t: NonNullable<ThemeSettingsT>): { themeId: ThemeId; colorMode: ColorMode } {
  const themeId = (THEME_IDS as readonly string[]).includes(t.themeId) ? (t.themeId as ThemeId) : "gold";
  const colorMode: ColorMode = t.colorMode === "dark" || t.colorMode === "system" ? t.colorMode : "light";
  return { themeId, colorMode };
}

// ─────────────────────────── Branding (centralized) ───────────────────────────

export interface Branding {
  storeName: string;
  storeNameEn: string;
  logo: string | null; // custom uploaded logo URL (falls back to default asset)
  footerLogo: string | null;
  favicon: string | null;
  shortDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  copyrightText: string;
  phone: string;
  mobile: string | null;
  email: string;
  address: string;
  workingHours: string;
  announcement: string | null;
  /** announcement bar master switch (Settings → فروشگاه) */
  announcementActive: boolean;
  /** optional link target for the announcement */
  announcementLink: string | null;
  /** v20: admin-managed marquee ticker messages (rotate in template
   *  header ticker strips). Empty array = fall back to `announcement`. */
  tickerMessages: { text: string; link?: string | null }[];
  currency: string;
}

export const DEFAULT_LOGO = "/brand/logo-mark.webp";
export const DEFAULT_FAVICON = "/brand/favicon-48.png";

/**
 * Central branding source — every surface (header, footer, login, checkout,
 * SEO metadata, admin) must derive the store identity from here.
 * `{year}` / `{storeName}` in copyrightText are interpolated.
 */
export async function getBranding(): Promise<Branding> {
  const s = await getStoreSettings();
  return {
    storeName: s.storeName?.trim() || "تاج الکترونیکس",
    storeNameEn: s.storeNameEn?.trim() || "TAJ Electronics",
    logo: s.logo,
    footerLogo: s.footerLogo ?? s.logo,
    favicon: s.favicon,
    shortDescription: s.shortDescription ?? s.footerText,
    description:
      s.metaDescription ??
      s.description ??
      "فروشگاه آنلاین کالای دیجیتال با ضمانت اصالت کالا، پرداخت امن و ارسال سریع",
    metaTitle: s.metaTitle ?? s.storeName,
    metaDescription:
      s.metaDescription ?? s.description ?? "فروشگاه آنلاین کالای دیجیتال با ضمانت اصالت کالا",
    copyrightText: s.copyrightText || "© {year} {storeName}. All rights reserved.",
    phone: s.phone,
    mobile: s.mobile,
    email: s.email,
    address: s.address,
    workingHours: s.workingHours ?? "شنبه تا پنجشنبه، ۹ صبح تا ۱۸",
    announcement: s.announcement,
    announcementActive: s.announcementActive ?? true,
    announcementLink: s.announcementLink,
    tickerMessages: parseTickerMessages(s.tickerMessages),
    currency: s.currency,
  };
}

/** v20: parse the StoreSettings.tickerMessages JSON column into a safe
 *  list (invalid JSON / wrong shape → empty list → fallback to the single
 *  announcement message). */
export function parseTickerMessages(json: string | null | undefined): { text: string; link?: string | null }[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((m): m is { text: string; link?: string | null } =>
        !!m && typeof m === "object" && typeof (m as { text?: unknown }).text === "string" && (m as { text: string }).text.trim().length > 0
      )
      .slice(0, 8)
      .map((m) => ({
        text: (m.text ?? "").toString().trim().slice(0, 200),
        link: typeof m.link === "string" && m.link.trim() ? m.link.trim() : null,
      }));
  } catch {
    return [];
  }
}

/** v23: parse StoreSettings.templateFeatures JSON into a safe map —
 * { "<templateId>": { "<featureKey>": boolean } }. Invalid JSON/wrong shape
 * → empty map (every template feature stays ON). */
export function parseTemplateFeatures(json: string | null | undefined): Record<string, Record<string, boolean>> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Record<string, Record<string, boolean>> = {};
    for (const [tpl, flags] of Object.entries(obj as Record<string, unknown>)) {
      if (!tpl || !flags || typeof flags !== "object" || Array.isArray(flags)) continue;
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(flags as Record<string, unknown>)) {
        if (typeof k === "string" && k.length > 0 && k.length <= 40) clean[k.slice(0, 40)] = v === false ? false : true;
      }
      out[tpl.slice(0, 40)] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

/** v23: resolve the ACTIVE template's feature flags for the storefront.
 * Missing key = feature ON (the template's designed default). */
export function resolveTemplateFeatures(
  json: string | null | undefined,
  templateId: string | null | undefined
): Record<string, boolean> {
  const all = parseTemplateFeatures(json);
  return all[templateId ?? ""] ?? {};
}

/** v24: parse StoreSettings.templateChrome JSON into a safe per-template
 * header/footer override map — { "<templateId>": { header: {...}, footer: {...} } }.
 * Invalid JSON / wrong shape → empty map (every template renders its designed
 * theme-matched chrome). Colors are validated as CSS-color-ish strings. */
export function parseTemplateChrome(json: string | null | undefined): Record<string, {
  header?: Record<string, unknown>;
  footer?: Record<string, unknown>;
}> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const isColor = (v: unknown) => typeof v === "string" && /^#?[0-9a-zA-Z(),.%\s_-]{3,32}$/.test(v.trim());
    const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
    const out: Record<string, { header?: Record<string, unknown>; footer?: Record<string, unknown> }> = {};
    for (const [tpl, entry] of Object.entries(obj as Record<string, unknown>)) {
      if (!tpl || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const e = entry as { header?: unknown; footer?: unknown };
      const clean: { header?: Record<string, unknown>; footer?: Record<string, unknown> } = {};
      for (const half of ["header", "footer"] as const) {
        const raw = e[half];
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const src = raw as Record<string, unknown>;
        const dst: Record<string, unknown> = {};
        if (isColor(src.bg)) dst.bg = (src.bg as string).trim();
        if (isColor(src.fg)) dst.fg = (src.fg as string).trim();
        for (const k of ["accent", "logo", "categoryRow", "brandStrip"]) {
          if (typeof src[k] === "string" && (src[k] as string).length <= 16) dst[k] = src[k];
        }
        for (const k of ["sticky", "ticker", "megaMenu", "showSearch", "showAccount", "showCart", "showThemeToggle", "trust", "round"]) {
          const b = bool(src[k]);
          if (b !== undefined) dst[k] = b;
        }
        const n = num(src.categories);
        if (n !== undefined) dst.categories = Math.max(0, Math.min(12, Math.round(n)));
        if (Object.keys(dst).length > 0) clean[half] = dst;
      }
      if (clean.header || clean.footer) out[tpl.slice(0, 40)] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

/* ─────────────────────────── v27b: per-template footer content ─────────────────────────── */

/** v27b: per-template footer CONTENT overrides (Admin → تنظیمات → فوتر →
 * «تنظیمات فوتر قالب فعال»). Stored in StoreSettings.templateFooters as
 * { "<templateId>": { footerText?, copyrightText?, customerLinks?, storeLinks? } }.
 * Missing field = the global value (footerText/copyrightText from
 * StoreSettings, link columns from the FooterLink CMS) is used. */
export interface TemplateFooterContent {
  footerText?: string;
  copyrightText?: string;
  customerLinks?: { label: string; url: string }[];
  storeLinks?: { label: string; url: string }[];
}

/** v27b: sanitize one { label, url } row — label required (≤80), url must be
 * a relative path or an absolute http(s) link (≤300). Rows missing either
 * are dropped (the renderer can't show a link without a target). */
function sanitizeFooterLinkRow(raw: unknown): { label: string; url: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { label?: unknown; url?: unknown };
  if (typeof r.label !== "string" || !r.label.trim()) return null;
  if (typeof r.url !== "string") return null;
  const url = r.url.trim();
  if (!url || url.length > 300 || !(/^(\/|https?:\/\/)/i.test(url))) return null;
  return { label: r.label.trim().slice(0, 80), url: url.slice(0, 300) };
}

function sanitizeFooterLinkArray(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeFooterLinkRow)
    .filter((r): r is { label: string; url: string } => r !== null)
    .slice(0, 12);
}

/** v27b: parse StoreSettings.templateFooters JSON into a safe per-template
 * footer-content map — same defensive style as parseTemplateChrome (invalid
 * JSON / wrong shape → empty map = every template uses the global footer).
 * Strings are trimmed + capped, url rows validated, arrays capped at 12. */
export function parseTemplateFooters(json: string | null | undefined): Record<string, TemplateFooterContent> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Record<string, TemplateFooterContent> = {};
    for (const [tpl, entry] of Object.entries(obj as Record<string, unknown>)) {
      if (!tpl || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const src = entry as { footerText?: unknown; copyrightText?: unknown; customerLinks?: unknown; storeLinks?: unknown };
      const clean: TemplateFooterContent = {};
      if (typeof src.footerText === "string" && src.footerText.trim()) clean.footerText = src.footerText.trim().slice(0, 500);
      if (typeof src.copyrightText === "string" && src.copyrightText.trim()) clean.copyrightText = src.copyrightText.trim().slice(0, 200);
      const customer = sanitizeFooterLinkArray(src.customerLinks);
      if (customer.length > 0) clean.customerLinks = customer;
      const store = sanitizeFooterLinkArray(src.storeLinks);
      if (store.length > 0) clean.storeLinks = store;
      if (Object.keys(clean).length > 0) out[tpl.slice(0, 40)] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

/** v27b: resolve the ACTIVE template's footer content overrides (empty
 * object when nothing is saved for it → global footer values win). */
export function getTemplateFooterContent(
  json: string | null | undefined,
  templateId: string | null | undefined
): TemplateFooterContent {
  return parseTemplateFooters(json)[templateId ?? ""] ?? {};
}

/** resolve copyright text with current year + store name */
export function renderCopyright(text: string, storeName: string): string {
  return text.replaceAll("{year}", String(new Date().getFullYear())).replaceAll("{storeName}", storeName);
}

// ─────────────────────────── Footer CMS ───────────────────────────

export interface FooterLinkItem {
  id: string;
  section: "CUSTOMER" | "STORE";
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export async function getFooterLinks(): Promise<FooterLinkItem[]> {
  if (fresh(cache.footerLinks)) {
    return toFooterItems(cache.footerLinks.value);
  }
  const rows = await db.footerLink.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }] });
  cache.footerLinks = { at: Date.now(), value: rows };
  return toFooterItems(rows);
}

function toFooterItems(rows: FooterLinkRow): FooterLinkItem[] {
  return rows
    .filter((r) => r.isActive)
    .map((r) => ({
      id: r.id,
      section: (r.section === "STORE" ? "STORE" : "CUSTOMER") as "CUSTOMER" | "STORE",
      label: r.label,
      url: r.url,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
}

export interface SocialLinks {
  instagram: string | null;
  telegram: string | null;
  whatsapp: string | null;
  youtube: string | null;
  twitter: string | null;
  linkedin: string | null;
}

export function getSocialLinks(s: NonNullable<StoreSettingsT>): SocialLinks {
  return {
    instagram: s.instagram,
    telegram: s.telegram,
    whatsapp: s.whatsapp,
    youtube: s.youtube,
    twitter: s.twitter,
    linkedin: s.linkedin,
  };
}

// ─────────────────────────── Install-safe fallbacks ───────────────────────────
// Before the DB schema exists (first-run /install wizard), the root layout must
// still render. These safe variants fall back to defaults instead of throwing.

export const FALLBACK_BRANDING: Branding = {
  storeName: "تاج الکترونیکس",
  storeNameEn: "TAJ Electronics",
  logo: null,
  footerLogo: null,
  favicon: null,
  shortDescription: "فروشگاه تخصصی کالای دیجیتال با ضمانت اصالت کالا",
  description: "فروشگاه آنلاین کالای دیجیتال با ضمانت اصالت کالا",
  metaTitle: "تاج الکترونیکس",
  metaDescription: "فروشگاه آنلاین کالای دیجیتال با ضمانت اصالت کالا",
  copyrightText: "© {year} {storeName}. All rights reserved.",
  phone: "021-91000000",
  mobile: null,
  email: "support@tajelectronics.ir",
  address: "تهران، خیابان ولیعصر، مرکز رایانه پردیس",
  workingHours: "شنبه تا پنجشنبه، ۹ صبح تا ۱۸",
  announcement: null,
  announcementActive: true,
  announcementLink: null,
  tickerMessages: [],
  currency: "تومان",
};

export async function getBrandingSafe(): Promise<Branding> {
  try {
    return await getBranding();
  } catch {
    return FALLBACK_BRANDING;
  }
}

export async function getThemeSafe(): Promise<{ themeId: ThemeId; colorMode: ColorMode }> {
  try {
    return await getThemeSettings();
  } catch {
    return { themeId: "gold", colorMode: "light" };
  }
}

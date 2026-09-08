/**
 * v5-f · PER-TEMPLATE CONTENT MODEL (Admin → ظاهر → «محتوای اختصاصی قالب»)
 * ---------------------------------------------------------------------------
 * Every one of the 25 storefront templates can carry its OWN dedicated
 * slides, showcases, texts, links and brand — stored as one JSON blob per
 * template in the `TemplateContent` table and editable from the admin
 * appearance page. While a template is active (or admin-previewed via
 * /?template=<id>), its template-specific values WIN over the shared global
 * entities (Slider / PromotionalShowcase / StoreSettings brand); every empty
 * field falls back to the global value.
 *
 * This module is PURE (client-safe: only zod + type imports — the db is
 * imported lazily inside the async server helper), so the admin editor can
 * import the types/schemas while the storefront imports the merge helpers.
 */

import { z } from "zod";
import type { HomeData, TemplateStore } from "./types";

// ─────────────────────────── content types ───────────────────────────

/** one admin-editable hero/slider slide of THIS template */
export type TemplateSlide = {
  /** image URL (uploaded via /api/upload or a local /uploads path) */
  image: string;
  title?: string;
  subtitle?: string;
  /** optional link target (internal path or https URL) */
  link?: string;
};

/** one admin-editable showcase artwork of THIS template */
export type TemplateShowcase = {
  image: string;
  title?: string;
  link?: string;
};

/** a plain CTA/link chip (e.g. rendered next to the hero CTAs) */
export type TemplateLink = { label: string; url: string };

/**
 * free-form copy overrides keyed by well-known keys — each template decides
 * which keys it honors (gaming-cyber: heroTitle / heroSubtitle / ctaLabel).
 */
export type TemplateTexts = Record<string, string>;

/** the template's own brand presentation */
export type TemplateBrand = {
  name?: string;
  tagline?: string;
  logoImage?: string;
};

/** the whole per-template content blob (all sections optional) */
export type TemplateContentData = {
  slides?: TemplateSlide[];
  showcases?: TemplateShowcase[];
  texts?: TemplateTexts;
  links?: TemplateLink[];
  brand?: TemplateBrand;
};

// ─────────────────────────── zod schemas ───────────────────────────
// Strict versions validate the admin PUT payload (unknown keys dropped,
// Persian error messages); the lenient sanitizer below cleans stored JSON.

export const templateSlideSchema = z.object({
  image: z
    .string({ error: "تصویر اسلاید الزامی است" })
    .trim()
    .min(1, "تصویر اسلاید الزامی است")
    .max(1000),
  title: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(300).optional(),
  link: z.string().trim().max(1000).optional(),
});

export const templateShowcaseSchema = z.object({
  image: z
    .string({ error: "تصویر شوکیس الزامی است" })
    .trim()
    .min(1, "تصویر شوکیس الزامی است")
    .max(1000),
  title: z.string().trim().max(200).optional(),
  link: z.string().trim().max(1000).optional(),
});

export const templateLinkSchema = z.object({
  label: z
    .string({ error: "عنوان لینک الزامی است" })
    .trim()
    .min(1, "عنوان لینک الزامی است")
    .max(120),
  url: z
    .string({ error: "آدرس لینک الزامی است" })
    .trim()
    .min(1, "آدرس لینک الزامی است")
    .max(1000),
});

export const templateTextsSchema = z.record(
  z.string().trim().min(1).max(64),
  z.string().trim().max(600),
);

export const templateBrandSchema = z.object({
  name: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(300).optional(),
  logoImage: z.string().trim().max(1000).optional(),
});

export const templateContentSchema = z.object({
  slides: z.array(templateSlideSchema).max(16, "حداکثر ۱۶ اسلاید").optional(),
  showcases: z.array(templateShowcaseSchema).max(16, "حداکثر ۱۶ شوکیس").optional(),
  texts: templateTextsSchema.optional(),
  links: z.array(templateLinkSchema).max(24, "حداکثر ۲۴ لینک").optional(),
  brand: templateBrandSchema.optional(),
});

// ─────────────────────────── helpers ───────────────────────────

/** a content object with every section empty (the fallback-to-global state) */
export function emptyTemplateContent(): TemplateContentData {
  return {};
}

/** true when the blob carries at least one meaningful value */
export function hasTemplateContent(content: TemplateContentData | null | undefined): boolean {
  if (!content) return false;
  if (content.slides?.length) return true;
  if (content.showcases?.length) return true;
  if (content.links?.length) return true;
  if (content.texts && Object.keys(content.texts).length > 0) return true;
  const b = content.brand;
  if (b && (b.name?.trim() || b.tagline?.trim() || b.logoImage?.trim())) return true;
  return false;
}

/**
 * Lenient cleaner for arbitrary JSON → a safe TemplateContentData: invalid
 * list entries are dropped (not the whole blob), empty strings removed,
 * unknown keys ignored. Used for stored rows AND to normalize a validated
 * PUT payload (so "" fields are stored as absent, never as dead weight).
 */
export function sanitizeTemplateContent(value: unknown): TemplateContentData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyTemplateContent();
  const raw = value as Record<string, unknown>;
  const out: TemplateContentData = {};

  const cleanList = <T>(items: unknown, schema: z.ZodType<T>): T[] => {
    if (!Array.isArray(items)) return [];
    const list: T[] = [];
    for (const item of items.slice(0, 16)) {
      const parsed = schema.safeParse(item);
      if (parsed.success) list.push(parsed.data);
    }
    return list;
  };

  if (Array.isArray(raw.slides)) {
    const slides = cleanList(raw.slides, templateSlideSchema).filter((s) => s.image);
    if (slides.length > 0) out.slides = slides;
  }
  if (Array.isArray(raw.showcases)) {
    const showcases = cleanList(raw.showcases, templateShowcaseSchema).filter((s) => s.image);
    if (showcases.length > 0) out.showcases = showcases;
  }
  if (Array.isArray(raw.links)) {
    const links = cleanList(raw.links, templateLinkSchema).filter((l) => l.label && l.url);
    if (links.length > 0) out.links = links;
  }
  if (raw.texts && typeof raw.texts === "object" && !Array.isArray(raw.texts)) {
    const texts: TemplateTexts = {};
    for (const [k, v] of Object.entries(raw.texts as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const key = k.trim().slice(0, 64);
      const val = v.trim().slice(0, 600);
      if (key && val) texts[key] = val;
    }
    if (Object.keys(texts).length > 0) out.texts = texts;
  }
  if (raw.brand && typeof raw.brand === "object" && !Array.isArray(raw.brand)) {
    const parsed = templateBrandSchema.safeParse(raw.brand);
    if (parsed.success) {
      const brand: TemplateBrand = {};
      if (parsed.data.name?.trim()) brand.name = parsed.data.name.trim();
      if (parsed.data.tagline?.trim()) brand.tagline = parsed.data.tagline.trim();
      if (parsed.data.logoImage?.trim()) brand.logoImage = parsed.data.logoImage.trim();
      if (Object.keys(brand).length > 0) out.brand = brand;
    }
  }
  return out;
}

/** safe JSON parse of a stored TemplateContent.data row → sanitized content */
export function parseTemplateContent(raw: string | null | undefined): TemplateContentData {
  if (!raw) return emptyTemplateContent();
  try {
    return sanitizeTemplateContent(JSON.parse(raw));
  } catch {
    return emptyTemplateContent();
  }
}

/**
 * SERVER helper — db lookup of one template's content (parsed, or empty when
 * no row / invalid JSON). The db client is imported lazily so this module
 * stays client-safe for the admin editor.
 */
export async function getTemplateContentData(templateId: string): Promise<TemplateContentData> {
  try {
    const { db } = await import("@/lib/db");
    const row = await db.templateContent.findUnique({
      where: { templateId },
      select: { data: true },
    });
    return parseTemplateContent(row?.data);
  } catch {
    // pre-install / db not ready → global fallbacks render
    return emptyTemplateContent();
  }
}

// ───────────────────── storefront merge (fallback-aware) ─────────────────────

/** alias the HomeData shapes so the per-template ones keep their names */
type HomeSlide = HomeData["slides"][number];
type HomeShowcase = HomeData["showcases"][number];

function toHomeSlide(s: TemplateSlide, i: number): HomeSlide {
  return {
    id: `tpl-slide-${i}`,
    title: s.title?.trim() || "",
    subtitle: s.subtitle?.trim() || null,
    image: s.image,
    mobileImage: null,
    ctaText: null,
    ctaUrl: s.link?.trim() || null,
    product: null,
  };
}

function toHomeShowcase(s: TemplateShowcase, i: number): HomeShowcase {
  return {
    id: `tpl-showcase-${i}`,
    title: s.title?.trim() || "",
    subtitle: null,
    image: s.image,
    buttonUrl: s.link?.trim() || null,
    product: null,
  };
}

/**
 * Effective slides/showcases for a template: template-specific entries win
 * (mapped into the HomeData slide/showcase shapes so every template renders
 * them with its normal code paths); empty → the global entities flow on
 * unchanged.
 */
export function mergeWithFallbacks(
  content: TemplateContentData,
  globalSlides: HomeSlide[],
  globalShowcases: HomeShowcase[],
): { slides: HomeSlide[]; showcases: HomeShowcase[] } {
  const tplSlides = (content.slides ?? []).filter((s) => s.image?.trim());
  const tplShowcases = (content.showcases ?? []).filter((s) => s.image?.trim());
  return {
    slides: tplSlides.length > 0 ? tplSlides.map(toHomeSlide) : globalSlides,
    showcases: tplShowcases.length > 0 ? tplShowcases.map(toHomeShowcase) : globalShowcases,
  };
}

/** brand override for the store block (name + logo; tagline stays on content) */
export function applyTemplateBrandToStore<T extends TemplateStore>(store: T, content: TemplateContentData): T {
  const brand = content.brand;
  if (!brand) return store;
  const name = brand.name?.trim();
  const logo = brand.logoImage?.trim();
  if (!name && !logo) return store;
  return {
    ...store,
    ...(name ? { storeName: name } : {}),
    ...(logo ? { logo, footerLogo: logo } : {}),
  };
}

/**
 * Full storefront wiring for one request: swap slides/showcases when the
 * template carries its own, override the store brand, and attach the raw
 * content blob so templates can read texts/links/brand directly. Never
 * mutates the input; with empty content the result is behavior-identical to
 * the global pipeline (only the additive templateContent field appears).
 */
export function applyTemplateContentToData(data: HomeData, content: TemplateContentData): HomeData {
  const { slides, showcases } = mergeWithFallbacks(content, data.slides, data.showcases);
  return {
    ...data,
    store: applyTemplateBrandToStore(data.store, content),
    slides,
    showcases,
    templateContent: hasTemplateContent(content) ? content : emptyTemplateContent(),
  };
}

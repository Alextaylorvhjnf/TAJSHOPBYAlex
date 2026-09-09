/**
 * v23 — AI COMMENT GENERATOR («تولید دیدگاه هوشمند»)
 * ---------------------------------------------------
 * Admin-facing engine that writes realistic Persian product comments:
 *
 *  1. VISION: the product's main image is analyzed with the vision model
 *     (z-ai SDK) — what the product is, its presentation style and the
 *     likely audience gender → commenters get girl / boy / mixed names.
 *  2. TEXT: the LLM (GapGPT when an API key is placed, builtin engine
 *     otherwise) receives the REAL product data (name, specs, colors,
 *     price, stock, description) + the vision analysis and writes N
 *     distinct comments + a store reply for each one.
 *  3. STORAGE: each comment becomes a synthetic customer user + an
 *     APPROVED Review row carrying the store reply (replyAuthorName =
 *     the admin-chosen persona, default = store name); the product's
 *     rating/reviewCount are recomputed from real aggregates.
 *
 * Server-only (fs + db + SDK). Never imported by client code.
 */

import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { serializeProduct, productInclude, refreshProductRating } from "@/lib/product";
import { getAISettings, getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { callGapGPTAuto } from "@/lib/ai";

export type GeneratedComment = {
  name: string;
  gender: "female" | "male" | "mixed";
  rating: number;
  title: string | null;
  comment: string;
  reply: string;
};

export type GenerateResult = {
  created: number;
  comments: { name: string; rating: number; title: string | null; comment: string; reply: string; replyBy: string }[];
  vision: { analyzed: boolean; what: string; audience: string } | null;
  replierName: string;
  /** v24 (v28): which provider wrote the comments (gapgpt | builtin) */
  provider: string;
};

/* ── vision: analyze the product's main image (audience/product detection) ── */

type VisionAnalysis = { what: string; audience: "female" | "male" | "mixed"; features: string };

const VISION_PROMPT = `Analyze this product photo for an e-commerce review-generator. Answer ONLY with compact JSON (no markdown):
{"what":"<what the product is + visible model/design details, max 20 words>","audience":"female|male|mixed","features":"<visual style: colors, design vibe, max 15 words>"}
Rules for "audience": judge from the product type AND how it is presented in the image (lifestyle/context/gender-coded design) — "female" when it clearly targets women, "male" for men, otherwise "mixed".`;

async function analyzeProductImage(imageUrl: string | null): Promise<VisionAnalysis | null> {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return null;
  const abs = path.join(process.cwd(), "public", imageUrl);
  if (!fs.existsSync(abs)) return null;
  try {
    const buf = fs.readFileSync(abs);
    if (buf.byteLength > 6 * 1024 * 1024) return null; // keep VLM payload sane
    const mime = abs.endsWith(".png") ? "image/png" : abs.endsWith(".webp") ? "image/webp" : abs.endsWith(".gif") ? "image/gif" : "image/jpeg";
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const res = await zai.chat.completions.createVision({
      model: "glm-4.5v",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: `data:${mime};base64,${buf.toString("base64")}` } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });
    const raw = (res.choices?.[0]?.message?.content ?? "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { what?: string; audience?: string; features?: string };
    const audience = parsed.audience === "female" || parsed.audience === "male" ? parsed.audience : "mixed";
    return {
      what: (parsed.what ?? "").toString().slice(0, 160),
      audience,
      features: (parsed.features ?? "").toString().slice(0, 160),
    };
  } catch (e) {
    console.error("[AI REVIEWS] vision analysis failed:", e);
    return null;
  }
}

/* ── text: the comment writer — v28 GapGPT + builtin fallback ──────────
 * Uses the admin's GapGPT key (model auto-resolution included); when the
 * key is missing or fails, the always-available builtin engine writes the
 * comments — a failing key never blocks generation. */

async function callGapKey(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const { text } = await callGapGPTAuto(apiKey, model, system, [{ role: "user", content: user }], 0.9, 4096);
  return text;
}

async function callReviewLLM(system: string, user: string): Promise<{ text: string; provider: string }> {
  const ai = await getAISettings();
  const gapKey = (ai.gapApiKey ?? "").trim();
  const gapModel = ai.gapModel || "gpt-4o";
  // v28: legacy provider rows (openai/gemini/auto) count as gapgpt when a key exists
  const wantsGap = gapKey && (ai.provider === "gapgpt" || ai.provider === "openai" || ai.provider === "gemini" || ai.provider === "auto");

  if (wantsGap) {
    try {
      const text = await callGapKey(gapKey, gapModel, system, user);
      if (text.trim()) return { text, provider: "gapgpt" };
      console.warn("[ai-reviews] gapgpt returned empty — trying builtin");
    } catch (e) {
      console.warn(`[ai-reviews] gapgpt failed (${String(e).slice(0, 200)}) — trying builtin`);
    }
  }

  // builtin engine (z-ai SDK) — works with zero configuration
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();
  const res = await zai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.9,
    maxTokens: 4096,
  });
  return { text: res.choices?.[0]?.message?.content ?? "", provider: "builtin" };
}

const WRITER_SYSTEM = `تو «موتور تولید دیدگاه واقع‌گرایانه» فروشگاه الکترونیک هستی. دیدگاه‌هایی می‌نویسی که از کاربران واقعی ایرانی خریده‌اند و استفاده کرده‌اند — نه تبلیغ، نه متن آماده.
قوانین آهنین:
1. فقط بر اساس داده‌های واقعی محصولی که داده‌شده بنویس — هیچ عدد/مشخصه‌ای از خودت نساز.
2. لحن هر دیدگاه متفاوت باشد: یکی هیجانی و صمیمی، یکی فنی و دقیق، یکی مصرف‌کنندهٔ عادی، یکی مقایسه‌ای با مدل قبلی‌اش.
3. امتیازها صادقانه: بیشتر ۴ و ۵، گاهی ۳ با دلیل مشخص — هرگز همه ۵ نشود.
4. هر دیدگاه حکایت شخصی کوتاه داشته باشد (مثلاً برای چه کاری خرید، بعد دو هفته چطور بود).
5. نام‌ها نام کوچک فارسیِ رایج و متمایز باشند — دقیقاً مطابق جنسیت تعیین‌شده برای همان دیدگاه.
6. پاسخ فروشگاه: ۲ تا ۳ جمله رسمی-مودبانه که مستقیم به نکتهٔ همان دیدگاه جواب می‌دهد (تشکر + پاسخ به دغدغه + یک نکتهٔ خدمات). از نام فروشگاه در پاسخ استفاده نکن (خودش جدا چاپ می‌شود).
7. خروجی فقط و فقط JSON خالص باشد — بدون markdown، بدون توضیح اضافه.
فرمت خروجی:
[{"name":"نام","gender":"female|male","rating":4,"title":"عنوان کوتاه","comment":"متن دیدگاه ۴۰ تا ۱۲۰ کلمه","reply":"پاسخ فروشگاه"}]`;

/** Parse the LLM output defensively — drops malformed rows. */
function parseComments(raw: string, count: number): GeneratedComment[] {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as Record<string, unknown>[];
    const out: GeneratedComment[] = [];
    for (const r of arr) {
      const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
      const comment = typeof r.comment === "string" ? r.comment.trim().slice(0, 900) : "";
      const reply = typeof r.reply === "string" ? r.reply.trim().slice(0, 500) : "";
      const rating = Number(r.rating);
      if (!name || comment.length < 20 || !Number.isInteger(rating) || rating < 1 || rating > 5) continue;
      out.push({
        name,
        gender: r.gender === "female" || r.gender === "male" ? r.gender : "mixed",
        rating,
        title: typeof r.title === "string" && r.title.trim() ? r.title.trim().slice(0, 90) : null,
        comment,
        reply,
      });
      if (out.length >= count) break;
    }
    return out;
  } catch {
    return [];
  }
}

/* ── public entry: generate + store ── */

export async function generateAndStoreAiReviews(opts: {
  productId: string;
  count: number;
  adminId: string;
  replierName?: string | null;
}): Promise<GenerateResult> {
  const count = Math.max(1, Math.min(5, Math.round(opts.count)));
  const product = await db.product.findUnique({ where: { id: opts.productId }, include: productInclude });
  if (!product) throw new Error("محصول یافت نشد");

  const [store, ai] = await Promise.all([getStoreSettings(), getAISettings()]);
  if (!ai.enabled) throw new Error("دستیار هوشمند در تنظیمات غیرفعال است");

  const replierName = (opts.replierName ?? "").trim() || store.aiReviewReplier?.trim() || store.storeName;

  const dto = serializeProduct(product);
  const vision = await analyzeProductImage(dto.mainImage);

  const audienceHint =
    vision?.audience === "female"
      ? "تصویر و کاربرد محصول مخاطب زن دارد — همهٔ نام‌ها زنانه باشند."
      : vision?.audience === "male"
        ? "تصویر و کاربرد محصول مخاطب مرد دارد — همهٔ نام‌ها مردانه باشند."
        : "مخاطب محصول ترکیبی است — حدود نیمی از نام‌ها زنانه و نیمی مردانه باشند.";

  const specLines = dto.specifications.slice(0, 10).map((s) => `${s.label}: ${s.value}`).join("\n") || "—";
  const userPrompt = [
    `محصول: ${dto.name}`,
    `برند: ${dto.brand.name} | دسته: ${dto.category.name}`,
    `قیمت: ${dto.effectivePrice.toLocaleString("fa-IR")} تومان${dto.discountPercent > 0 ? ` (تخفیف ${dto.discountPercent}٪)` : ""}`,
    `موجودی: ${dto.stock > 0 ? `${dto.stock} عدد` : "ناموجود"}`,
    `رنگ‌ها: ${dto.colors.map((c) => c.name).join("، ") || "—"}`,
    `مشخصات واقعی:\n${specLines}`,
    `توضیح کوتاه: ${dto.shortDescription ?? "—"}`,
    vision ? `تحلیل تصویر محصول: ${vision.what} | سبک بصری: ${vision.features}` : "تصویر محصول در دسترس نیست — فقط از داده‌های متنی استفاده کن.",
    "",
    audienceHint,
    "",
    `${count.toLocaleString("fa-IR")} دیدگاه + پاسخ فروشگاه برای هرکدام بنویس. JSON خالص.`,
  ].join("\n");

  const raw = await callReviewLLM(WRITER_SYSTEM, userPrompt);
  const comments = parseComments(raw.text, count);
  if (comments.length === 0) {
    throw new Error("پاسخ هوش مصنوعی قابل تفسیر نبود — دوباره تلاش کنید (یا مدل/کلید را بررسی کنید)");
  }

  // persist replier persona so the next run defaults to it
  if (replierName !== store.aiReviewReplier) {
    await db.storeSettings.update({ where: { id: "main" }, data: { aiReviewReplier: replierName } });
    invalidateSettingsCache();
  }

  const stored: GenerateResult["comments"] = [];
  for (const c of comments) {
    // synthetic customer identity for the commenter (unique per comment)
    const uname = `ai_${c.name.replace(/\s+/g, "")}_${randomBytes(4).toString("hex")}`;
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    const user = await db.user.create({
      data: {
        email: `${uname.toLowerCase()}@customers.taj.ai`,
        passwordHash,
        firstName: c.name,
        role: "CUSTOMER",
      },
    });
    const review = await db.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: c.rating,
        title: c.title,
        comment: c.comment,
        status: "APPROVED",
        replyText: c.reply,
        replyAuthorName: replierName,
        repliedAt: new Date(),
        // v24: flag AI-written comments so the studio can count commented
        // products and auto-detect products without an AI comment yet
        source: "AI",
      },
    });
    stored.push({
      name: c.name,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      reply: review.replyText ?? "",
      replyBy: replierName,
    });
  }

  await refreshProductRating(product.id);

  return {
    created: stored.length,
    comments: stored,
    vision: vision ? { analyzed: true, what: vision.what, audience: vision.audience } : null,
    replierName,
    provider: raw.provider,
  };
}

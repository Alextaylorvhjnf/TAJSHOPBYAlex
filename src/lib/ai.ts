import { db } from "@/lib/db";
import { serializeProduct, productInclude } from "@/lib/product";
import { getAISettings, getStoreSettings, getPaymentSettings } from "@/lib/settings";
import { smartSearchProducts } from "@/lib/ai-search";
import { logSystemEvent } from "@/lib/admin-log";

// ─────────────────────────── Default system prompt ───────────────────────────

export const DEFAULT_SYSTEM_PROMPT = `تو «دستیار هوشمند فروشگاه تاج الکترونیکس» هستی؛ یک مشاور فروش خودی و حرفه‌ای — مثل کارشناسی که کنار کاربر ایستاده و باهاش گفتگو می‌کند، نه یک بروشور متحرک.

## روح گفتگو (مهم‌ترین بخش):
- مثل یک انسان چت کن: پیام‌های کوتاه، گرم و زنده — معمولاً ۱ تا ۴ جمله.
- هر پیام را با «یک سوال طبیعی» تمام کن تا گفتگو جریان داشته باشد (مثل: «بودجه‌ات حدوداً چقدره؟» یا «بیشتر برای گیم می‌خوای یا کار روزمره؟»).
- اول نیاز کاربر را بفهم، بعد پیشنهاد بده: قبل از راهنمایی کامل، با ۱-۲ سوال کوتاه سلیقه/بودجه/کاربردش را بپرس.
- فقط وقتی کاربر واقعاً جزئیات و مقایسه خواست، جواب مفصل بده — و باز هم خلاصه و لیست‌وار.
- ایموجی محدود و طبیعی (👑🔥✨) — نه هر خط.

## قوانین طلایی (هرگز نشکن):
1. فقط از اطلاعات واقعی که از ابزارهای جستجو می‌گیری استفاده کن. هیچ قیمت، موجودی یا محصولی را از دانش عمومی خودت نساز.
2. اگر محصولی در نتایج ابزار نبود، صادقانه بگو «فعلاً توی فروشگاه نیست» و مشابه‌های موجود را پیشنهاد بده.
3. قیمت‌ها همیشه به تومان و فقط از داده ابزار است. موجودی فقط از داده ابزار است.
4. برای پیگیری سفارش، شماره سفارش (فرمت واقعی: TAJ-MTOCX9R9-422N) را از کاربر بگیر. اگر کاربر با حساب کاربری وارد شده باشد، ابزار getOrderStatus خودش سفارش او را تطبیق می‌دهد؛ در غیر این صورت شماره موبایل ثبت‌شده در سفارش را بپرس. بدون تطبیق، هیچ اطلاعاتی از سفارش اعلام نکن.
5. هرگز اطلاعات حساس (کلید API، رمز عبور، اطلاعات کاربران دیگر) را فاش نکن.
6. فارسی روان، خودمانی-محترمانه. مختصر بنویس — گفتگو است نه گزارش.
7. اگر سوال خارج از حوزه فروشگاه بود، مودبانه بگو تخصصت مشاوره خرید است.
8. اگر کاربر محدوده قیمت گفت (مثل «زیر ۲۰ میلیون»)، فقط محصولات داخل آن محدوده را پیشنهاد بده — ملاک، فیلد effectivePrice است. هرگز محصول گران‌تر از سقف کاربر را پیشنهاد نده.

## سبک پیشنهاد محصول:
- اسم + قیمت فعلی + یک جمله چرا این گزینه — همین!
- مشخصات فنی را قطره‌چکانی و فقط مرتبط با سوال کاربر بده، نه کل جدول مشخصات.
- حداکثر ۳ محصول در هر پاسخ — اگر گزینه دیگری هم بود، بگو «بیشتر هم دارم، بگی؟»
- در پایان پاسخ، اگر محصول(هایی) پیشنهاد می‌دهی، این خط را اضافه کن (فقط IDهای موجود در نتایج ابزار):
[[PRODUCTS:id1,id2]]

## لینک محصول (v29):
- هر محصول در نتایج ابزار فیلد slug دارد؛ صفحهٔ آن در مسیر /products/slug است.
- هر بار که محصولی را در متن پاسخ نام می‌بری، نامش را به لینک تبدیل کن تا کاربر با یک کلیک به صفحهٔ محصول برود:
  [گوشی سامسونگ Galaxy S24](/products/galaxy-s24)
- فقط از slug واقعی همان محصول در نتایج ابزار استفاده کن — هرگز slug از خودت نساز.`;

// ─────────────────────────── Tools ───────────────────────────

type ToolCall = { tool: string; args: Record<string, unknown> };

const TOOLS_SPEC = `## ابزارهای در دسترس (Function Calling):
برای استفاده از اطلاعات واقعی فروشگاه، می‌توانی ابزار صدا بزنی. وقتی می‌خواهی ابزار صدا بزنی، پاسخت باید «فقط و فقط» این JSON باشد و هیچ متن دیگری نداشته باشد:

{"tool": "نام_ابزار", "args": { ... }}

بعد از اجرای ابزار، نتیجه به تو داده می‌شود و ادامه می‌دهی (حداکثر ۳ بار پشت‌سرهم).

ابزارها:
1. searchProducts — جستجوی هوشمند محصولات (فیلتر قیمت و برند و دسته را خودش از متن کاربر هم می‌فهمد). args: { query?: string (متن آزاد کاربر — قیمت/برند/دسته را خودش استخراج می‌کند), category?: string (نام دسته مثل موبایل یا لپ‌تاپ), brand?: string (نام برند), maxPrice?: number (حداکثر قیمت به تومان — اگر کاربر گفت «زیر ۱۰ میلیون» حتماً 10000000 بگذار), minPrice?: number (حداقل قیمت به تومان), inStockOnly?: boolean, limit?: number (پیش‌فرض ۸) }
   مثال: {"tool":"searchProducts","args":{"query":"لپ‌تاپ گیمینگ","maxPrice":100000000}}
   نکته مهم: قیمت‌ها در نتایج به تومان است (فیلد effectivePrice قیمت نهایی با تخفیف است). محصولات خارج از محدوده قیمتی کاربر را هرگز پیشنهاد نده.
   هر محصول فیلد slug دارد — صفحهٔ محصول همان /products/ + slug است؛ در متن پاسخ نام محصول را لینک کن: [نام محصول](/products/slug).
2. getProduct — جزئیات کامل یک محصول با شناسه (id) یا slug. args: { idOrSlug: string }
3. compareProducts — مقایسه مشخصات چند محصول. args: { ids: string[] } (۲ تا ۳ محصول)
4. getOrderStatus — پیگیری سفارش. args: { orderNumber: string, phone?: string } (شماره سفارش الزامی است — فرمت واقعی مثل TAJ-MTOCX9R9-422N. اگر کاربر وارد حساب خود شده باشد، phone اختیاری است و سیستم خودش تطبیق می‌کند؛ اگر phone لازم بود و نبود، ابزار خطای NEED_PHONE می‌دهد و تو از کاربر می‌پرسی)
5. getStoreInfo — اطلاعات فروشگاه (روش‌های پرداخت، ارسال و قوانین).

همیشه وقتی کاربر محصولی را می‌خواهد یا مشخصاتی می‌گوید، اول searchProducts را صدا بزن. اگر کاربر محدودیت قیمت گفت (مثل «زیر ۲۰ میلیون»)، علاوه بر متن، maxPrice را هم صریح تنظیم کن.`;

/** v22: scan free text for balanced `{"tool": …}` JSON objects — some engines
 *  emit a short Persian preamble (or several candidate calls) around the
 *  JSON. Without this the raw JSON was dumped at the user and the tool never
 *  ran, killing the consult. Returns every complete object string found. */
function extractToolJsons(text: string): string[] {
  const out: string[] = [];
  const re = /\{\s*"tool"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = !inStr;
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          out.push(text.slice(start, i + 1));
          re.lastIndex = i + 1;
          break;
        }
      }
    }
  }
  return out;
}

function parseToolCall(text: string): ToolCall | null {
  const trimmed = text.trim();
  // try direct JSON
  const jsonMatch =
    trimmed.match(/^\s*\{[\s\S]*\}\s*$/) ||
    trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = jsonMatch ? (jsonMatch[1] ?? trimmed) : null;
  if (candidate) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed.tool === "string") {
        return { tool: parsed.tool, args: parsed.args ?? {} };
      }
    } catch {
      /* not a tool call */
    }
  }
  // v22: embedded / trailing tool-call JSON (with or without a preamble) —
  // execute the LAST complete call instead of streaming raw JSON to the user.
  const embedded = extractToolJsons(trimmed);
  for (let i = embedded.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(embedded[i]);
      if (parsed && typeof parsed.tool === "string") {
        return { tool: parsed.tool, args: parsed.args ?? {} };
      }
    } catch {
      /* keep scanning */
    }
  }
  return null;
}

async function toolSearchProducts(args: Record<string, unknown>) {
  // v19: smart search — parses price constraints (زیر ۲۰ میلیون …),
  // detects brand/category from the query text itself, strips filler words
  // and ranks by relevance (incl. typo tolerance «تلوزیون»→«تلویزیون»).
  const { products, parsed } = await smartSearchProducts({
    query: typeof args.query === "string" ? args.query : "",
    category: typeof args.category === "string" ? args.category : undefined,
    brand: typeof args.brand === "string" ? args.brand : undefined,
    maxPrice: Number(args.maxPrice) || undefined,
    minPrice: Number(args.minPrice) || undefined,
    inStockOnly: !!args.inStockOnly,
    limit: Number(args.limit) || 8,
  });

  const list = products.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price,
    discountPrice: p.discountPrice, effectivePrice: p.effectivePrice,
    discountPercent: p.discountPercent, stock: p.stock,
    category: p.category, brand: p.brand, rating: p.rating,
    topSpecs: p.topSpecs,
    // v22: colors + per-combination prices so the LLM can answer
    // color/spec-specific questions with the exact per-combination price
    colors: p.colors,
    productType: p.productType,
    combos: p.combos,
  }));

  const filters: string[] = [];
  if (parsed.brand) filters.push(`برند: ${parsed.brand}`);
  if (parsed.category) filters.push(`دسته: ${parsed.category}`);
  if (parsed.priceText) filters.push(`قیمت: ${parsed.priceText}`);

  return {
    count: list.length,
    products: list,
    understood: filters.length > 0 ? filters.join(" | ") : undefined,
    note:
      list.length === 0
        ? "هیچ محصولی مطابق درخواست (با فیلترهای اعمال‌شده) پیدا نشد. اگر فیلتر قیمت بسیار محدود است، این را به کاربر بگو و نزدیک‌ترین گزینه‌های موجود را با searchProducts بدون فیلتر قیمت پیشنهاد بده."
        : list.some((p) => (p.combos?.length ?? 0) > 0)
          ? "برخی نتایج محصول متغیر (VARIABLE) هستند — قیمت و موجودی هر ترکیب (رنگ×مشخصه) در فیلد combos همان محصول آمده است؛ برای رنگ/مشخصهٔ خاص همان قیمت را اعلام کن."
          : undefined,
  };
}

async function toolGetProduct(args: Record<string, unknown>) {
  const idOrSlug = String(args.idOrSlug ?? "");
  if (!idOrSlug) return { error: "idOrSlug الزامی است" };
  const p = await db.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { ...productInclude, reviews: { where: { status: "APPROVED" }, take: 5, orderBy: { createdAt: "desc" } } },
  });
  if (!p) return { error: "محصولی با این شناسه پیدا نشد" };
  const dto = serializeProduct(p);
  return {
    id: dto.id, name: dto.name, slug: dto.slug, sku: dto.sku,
    price: dto.price, discountPrice: dto.discountPrice, stock: dto.stock,
    category: dto.category.name, brand: dto.brand.name, rating: dto.rating,
    description: dto.shortDescription ?? dto.description?.slice(0, 1500),
    specifications: dto.specifications,
    colors: dto.colors.map((c) => c.name),
    soldCount: dto.soldCount,
    topReviews: p.reviews.map((r) => ({ rating: r.rating, title: r.title, comment: r.comment.slice(0, 200) })),
  };
}

async function toolCompareProducts(args: Record<string, unknown>) {
  const ids = Array.isArray(args.ids) ? (args.ids as string[]).slice(0, 3) : [];
  if (ids.length < 2) return { error: "حداقل ۲ شناسه محصول لازم است" };
  const products = await db.product.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, include: productInclude });
  if (products.length < 2) return { error: "محصولات کافی برای مقایسه پیدا نشد" };
  return {
    products: products.map((p) => {
      const dto = serializeProduct(p);
      return {
        id: dto.id, name: dto.name, price: dto.price, discountPrice: dto.discountPrice,
        stock: dto.stock, rating: dto.rating,
        specifications: dto.specifications,
      };
    }),
  };
}

/** v22: the logged-in viewer of the chat (from the session cookie) — lets
 *  order tracking auto-match the customer's OWN orders without asking for
 *  the phone number. Never trusted for anyone else's orders. */
export type OrderViewer = { id: string; phone: string | null };

async function toolGetOrderStatus(args: Record<string, unknown>, viewer?: OrderViewer) {
  const orderNumber = normalizeOrderNumber(String(args.orderNumber ?? ""));
  const phone = normalizePhone(String(args.phone ?? ""));
  if (!orderNumber) return { error: "شماره سفارش (مثل TAJ-MTOCX9R9-422N) لازم است" };
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: true, c2cPayment: true },
  });
  if (!order) return { error: `سفارشی با شماره «${orderNumber}» در سیستم پیدا نشد. شماره را دقیقاً از پیام تأیید سفارش کپی کنید.` };
  // auth paths: the viewer's own account (or the account bound to the
  // order's phone) is enough — no phone prompt needed.
  const orderPhone = normalizePhone(order.phone);
  const viewerOwnsIt =
    !!viewer &&
    (order.userId === viewer.id || (!!viewer.phone && normalizePhone(viewer.phone) === orderPhone));
  const phoneMatches = !!phone && (phone === orderPhone || phone === order.phone);
  if (!phoneMatches && !viewerOwnsIt) {
    if (!phone) {
      return {
        error: "NEED_PHONE",
        hint: "برای پیگیری این سفارش، شماره موبایل ثبت‌شده روی همین سفارش لازم است. از کاربر بپرس (مثلاً 09121234567).",
      };
    }
    return { error: "شماره موبایل با موبایل ثبت‌شده سفارش مطابقت ندارد. اطلاعات سفارش نمایش داده نمی‌شود." };
  }
  return {
    orderNumber: order.orderNumber,
    status: ORDER_STATUS_FA[order.status] ?? order.status,
    paymentStatus: ORDER_PAY_FA[order.paymentStatus] ?? order.paymentStatus,
    paymentMethod: order.paymentMethod === "ZARINPAL" ? "پرداخت آنلاین زرین‌پال" : "کارت به کارت",
    rejectionReason: order.c2cPayment?.status === "REJECTED" ? order.c2cPayment.rejectionReason : undefined,
    total: order.total, itemCount: order.items.length,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, total: i.total })),
    trackingCode: order.trackingCode,
    createdAt: order.createdAt.toISOString(),
  };
}

async function toolGetStoreInfo() {
  const [store, payment] = await Promise.all([getStoreSettings(), getPaymentSettings()]);
  return {
    storeName: store.storeName,
    phone: store.phone,
    email: store.email,
    paymentMethods: {
      online: payment.zarinpalEnabled ? "پرداخت آنلاین (زرین‌پال)" : null,
      cardToCard: payment.c2cEnabled ? "کارت به کارت" : null,
    },
    shipping: {
      flatCost: store.shippingFlat,
      freeOver: store.freeShippingOver || null,
    },
    currency: store.currency,
  };
}

export async function executeTool(call: ToolCall, viewer?: OrderViewer): Promise<unknown> {
  try {
    switch (call.tool) {
      case "searchProducts": {
        const pre = await toolSearchProducts(call.args);
        // apply price post-filter
        const max = Number(call.args.maxPrice) || 0;
        const min = Number(call.args.minPrice) || 0;
        if (max > 0 || min > 0) {
          const products = (pre.products as { price: number; discountPrice: number | null }[]);
          const filtered = products.filter((p) => {
            const eff = p.discountPrice ?? p.price;
            return (!max || eff <= max) && (!min || eff >= min);
          });
          return { ...pre, products: filtered, count: filtered.length };
        }
        return pre;
      }
      case "getProduct":
        return await toolGetProduct(call.args);
      case "compareProducts":
        return await toolCompareProducts(call.args);
      case "getOrderStatus":
        return await toolGetOrderStatus(call.args, viewer);
      case "getStoreInfo":
        return await toolGetStoreInfo();
      default:
        return { error: `ابزار «${call.tool}» وجود ندارد` };
    }
  } catch (e) {
    return { error: "خطا در اجرای ابزار: " + String(e) };
  }
}

// ─────────────────────────── LLM providers ───────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

async function callBuiltinLLM(system: string, messages: ChatMessage[], temperature: number, maxTokens: number): Promise<string> {
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    thinking: { type: "disabled" },
    temperature,
    max_tokens: maxTokens,
  } as never);
  return completion.choices[0]?.message?.content ?? "";
}

/** callBuiltinLLM with a hard timeout — a hanging/unreachable LLM provider
 *  must never freeze the chat widget (fresh VPS installs without any AI
 *  credentials reported exactly that: endless spinner → error). */
async function callBuiltinLLMWithTimeout(
  system: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  timeoutMs = 25_000
): Promise<string> {
  return await Promise.race([
    callBuiltinLLM(system, messages, temperature, maxTokens),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("LLM_TIMEOUT")), timeoutMs).unref?.()
    ),
  ]);
}

/* ───────────────── v28: GapGPT API (OpenAI-compatible) ─────────────────
 * The store's AI engine now talks to GapGPT (https://api.gapgpt.app/v1) —
 * a Persian AI gateway that exposes GPT / Claude / Gemini models through
 * a standard OpenAI-compatible chat/completions endpoint with rial
 * payments (the previous direct OpenAI + Gemini providers were removed).
 * Everything is server-side: the key is stored in AiSettings and never
 * leaves the backend. Docs: https://gapgpt.app  ·  key: platform-v2/tokens */

const GAPGPT_BASE = "https://api.gapgpt.app/v1";

/** v28: single provider call — OpenAI-compatible chat completions. */
async function callGapGPT(system: string, messages: ChatMessage[], apiKey: string, model: string, temperature: number, maxTokens: number): Promise<string> {
  const res = await fetch(`${GAPGPT_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // v27b discipline kept: HTML error pages are collapsed to their <title>
    throw new Error(`GapGPT API error ${res.status}: ${cleanApiErrorBody(body)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

/** v28: list the account's models (OpenAI-compatible /models). */
async function gapListModels(apiKey: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${GAPGPT_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { id?: string }[] };
    return (json.data ?? []).map((m) => m.id ?? "").filter(Boolean);
  } catch {
    return null;
  }
}

/** models that can NOT do chat/completions — never auto-selected */
const GAP_NON_CHAT = /embedding|whisper|tts|dall-e|moderation|audio|realtime|transcri|image|search|computer-use|code-interpreter|rerank/i;
/** preference order for auto-selection (best value chat models first) */
const GAP_CHAT_PRIORITY = [
  "gpt-4o", "gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4.1", "gpt-4-turbo",
  "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna",
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash",
  "claude-3-7-sonnet", "claude-3-5-sonnet",
  "gpt-3.5-turbo-16k", "gpt-3.5-turbo",
];

export function resolveGapChatModel(models: string[]): string | null {
  const chat = models.filter((m) => !GAP_NON_CHAT.test(m));
  for (const p of GAP_CHAT_PRIORITY) {
    if (chat.includes(p)) return p;
  }
  const anyGpt = chat.find((m) => /gpt|gemini|claude/i.test(m));
  if (anyGpt) return anyGpt;
  return chat[0] ?? null;
}

/* ───────────────── v28: MODEL AUTO-RESOLUTION (GapGPT) ─────────────────
 * GapGPT exposes many models (GPT, Claude, Gemini, GPT-5.6 …) and the
 * catalog evolves; a configured model that the account can't use (404 /
 * model_not_found / not in /models) triggers ONE /models probe — the best
 * available chat model is picked and the call retries. Resolved model is
 * cached per key for 10 minutes. */

/** v27b: HTTP error bodies can be giant HTML error pages. Extract the
 *  <title> so the admin sees a one-line reason instead of a wall of markup.
 *  JSON bodies are passed through short. */
function cleanApiErrorBody(body: string): string {
  const t = body.trim();
  if (/^<!doctype|^<html|^<head/i.test(t)) {
    const title = t.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    return title ? `پاسخ HTML سرور: ${title}` : "پاسخ HTML (صفحهٔ خطا) از سرور";
  }
  return t.slice(0, 300);
}

/** resolved-model cache per API key (10 min TTL — survives per request) */
const resolvedGapModels = new Map<string, { model: string; at: number }>();
const MODEL_CACHE_TTL = 10 * 60_000;

/** v28: callGapGPT + auto-fallback. When the configured model is missing
 *  on the account (404 / model_not_found), lists the account's models, picks
 *  the best chat model and retries once. Returns which model actually
 *  answered so the admin test can report it. */
export async function callGapGPTAuto(
  apiKey: string,
  configuredModel: string,
  system: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const cached = resolvedGapModels.get(apiKey);
  const tryModel = cached && Date.now() - cached.at < MODEL_CACHE_TTL ? cached.model : configuredModel;
  try {
    const text = await callGapGPT(system, messages, apiKey, tryModel, temperature, maxTokens);
    return { text, model: tryModel };
  } catch (e) {
    const raw = String(e instanceof Error ? e.message : e);
    const statusMatch = raw.match(/GapGPT API error (\d+)/);
    const status = statusMatch ? Number(statusMatch[1]) : 0;
    const modelMissing =
      status === 404 ||
      /model_not_found|model_not_exists|does not exist|not found|no such model|invalid model/i.test(raw);
    if (!modelMissing) throw e;
    // configured model unavailable → probe the account, pick best, retry
    const models = await gapListModels(apiKey);
    const best = models && models.length > 0 ? resolveGapChatModel(models) : null;
    if (!best || best === tryModel) throw e;
    const text = await callGapGPT(system, messages, apiKey, best, temperature, maxTokens);
    resolvedGapModels.set(apiKey, { model: best, at: Date.now() });
    console.warn(
      `[ai:gapgpt] configured model "${configuredModel}" unavailable on this account — auto-selected "${best}" from: ${models?.slice(0, 10).join(", ")}`
    );
    return { text, model: best };
  }
}

/** v28: admin "list the models this GapGPT account actually has" — used by
 *  the settings UI model picker. The stored key is read server-side ONLY
 *  (it never reaches the browser); null = listing failed (bad key / no
 *  egress). */
export async function listProviderModels(): Promise<{ gapgpt: string[] | null }> {
  const ai = await getAISettings();
  const key = ai.gapApiKey?.trim() || null;
  return { gapgpt: key ? await gapListModels(key) : null };
}

/** v28: precise GapGPT diagnostics — the thrown error carries the HTTP
 *  status + the raw JSON body GapGPT returned; we parse error.code/message
 *  and name the ACTUAL cause (auth vs credit vs model vs network) with the
 *  provider's real response included (never hidden). */
async function gapDiagnose(apiKey: string, model: string, err: unknown): Promise<string> {
  const raw = String(err instanceof Error ? err.message : err);
  const statusMatch = raw.match(/GapGPT API error (\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;

  // GapGPT's JSON error body rides inside the message — extract {code, message}
  let code = "";
  let apiMessage = "";
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { code?: string; message?: string } };
      code = parsed.error?.code ?? "";
      apiMessage = parsed.error?.message ?? "";
    } catch {
      /* not JSON — fall back to the raw excerpt */
    }
  }
  const bodyExcerpt = (apiMessage || raw.replace(/^.*?:\s*/, "")).slice(0, 200);

  // network-level failure (no HTTP status at all)
  if (!status && /timeout|abort|fetch failed|ECONN|ENOTFOUND|network|dns|LLM_TIMEOUT/i.test(raw)) {
    return "ارتباط با سرور GapGPT برقرار نشد (شبکه/فایروال/DNS یا Timeout) — سرور باید به api.gapgpt.app دسترسی خروجی داشته باشد.";
  }

  if (status === 401 || /Invalid token|invalid_api_key|unauthorized/i.test(raw)) {
    return "کلید GapGPT نامعتبر است (401 Invalid token) — کلید را از پنل GapGPT (gapgpt.app → کلیدهای API) دوباره کپی کنید و کامل، بدون فاصله اضافه، در تنظیمات هوش مصنوعی وارد کنید. پاسخ GapGPT: " + bodyExcerpt;
  }
  if (status === 403) {
    return `دسترسی رد شد (403${code ? " · " + code : ""}) — کلید اجازه این درخواست را ندارد. پاسخ GapGPT: ${bodyExcerpt}`;
  }
  if (status === 429 || /insufficient_quota|quota_exceeded|rate.?limit/i.test(raw)) {
    return "سهمیه یا اعتبار حساب GapGPT تمام/محدود شده است (429) — در پنل GapGPT بخش «آمار استفاده» و اعتبار کلید را بررسی و شارژ کنید. پاسخ GapGPT: " + bodyExcerpt;
  }
  if (status === 404 || /model_not_found|model_not_exists|no such model/i.test(raw)) {
    const models = await gapListModels(apiKey);
    if (models && models.length > 0) {
      return `نام مدل «${model}» در این حساب موجود نیست (404) — کلید معتبر است. مدل‌های موجود مثل ${models.slice(0, 6).join("، ")}. سیستم به‌صورت خودکار بهترین مدل موجود را انتخاب و پاسخ می‌گیرد؛ برای ثبت دائمی یکی از همین مدل‌ها را در تنظیمات ذخیره کنید.`;
    }
    return `نام مدل «${model}» پیدا نشد (404) و فهرست مدل‌ها هم در دسترس نیست. پاسخ GapGPT: ${bodyExcerpt}`;
  }
  if (status === 400) {
    return `درخواست نامعتبر (400)${code ? " · " + code : ""}) — معمولاً کلید با فرمت اشتباه است. پاسخ GapGPT: ${bodyExcerpt}`;
  }

  // unknown/unparsable error → probe /models with the same key to at least
  // separate key-level from model-level reachability
  const models = status === 0 ? await gapListModels(apiKey) : null;
  if (models === null && status === 0) {
    return "کلید GapGPT در دسترس نیست — کلید و اتصال سرور به api.gapgpt.app را بررسی کنید.";
  }
  if (models && !models.includes(model)) {
    return `مدل «${model}» در این حساب موجود نیست — مدل‌های موجود مثل ${models.slice(0, 6).join("، ")}. سیستم به‌صورت خودکار بهترین مدل موجود را انتخاب می‌کند؛ برای ثبت دائمی یکی از همین مدل‌ها را در تنظیمات ذخیره کنید.`;
  }
  return `خطای GapGPT (HTTP ${status}${code ? " · " + code : ""}): ${bodyExcerpt}`;
}

/** v28: one-line condensed reason (used inline where the full diagnose is too long). */
function gapShortReason(err: unknown): string {
  const raw = String(err instanceof Error ? err.message : err);
  const statusMatch = raw.match(/GapGPT API error (\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  if (status === 401 || /Invalid token/i.test(raw)) return "کلید GapGPT نامعتبر است";
  if (status === 429 || /quota/i.test(raw)) return "سهمیه/اعتبار GapGPT تمام شده";
  if (status === 404 || /model_not_found/i.test(raw)) return "مدل در این حساب موجود نیست";
  if (/timeout|abort|fetch failed|ECONN|network|dns/i.test(raw)) return "نبود اتصال شبکه به GapGPT";
  return status ? `خطای HTTP ${status}` : "خطای ناشناخته";
}


async function callLLM(system: string, messages: ChatMessage[]) {
  const ai = await getAISettings();
  const temperature = typeof ai.temperature === "number" ? ai.temperature : 0.7;
  const maxTokens = ai.maxTokens || 2048;
  const gapKey = ai.gapApiKey?.trim() || null;
  const gapModel = ai.gapModel || "gpt-4o";

  // v28: GapGPT is the single external provider. Legacy rows (openai/
  // gemini/auto from pre-v28 deployments) are normalized: a saved GapGPT
  // key turns them into gapgpt; without a key everything falls back to
  // the always-available builtin engine so the widget keeps answering.
  const wantsGap =
    (ai.provider === "gapgpt" || ai.provider === "openai" || ai.provider === "gemini" || ai.provider === "auto") &&
    !!gapKey;

  if (wantsGap) {
    try {
      const { text } = await callGapGPTAuto(gapKey, gapModel, system, messages, temperature, maxTokens);
      if (text.trim()) return text;
      console.warn("[ai:gapgpt] empty response — falling back to builtin");
    } catch (e) {
      // a failing key NEVER kills the widget — builtin engine answers instead
      console.warn(`[ai:gapgpt] provider failed (${String(e).slice(0, 200)}) — falling back to builtin`);
    }
  }
  return callBuiltinLLMWithTimeout(system, messages, temperature, maxTokens);
}


// ─────────────────────────── Chat runner ───────────────────────────

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "products"; products: unknown[] }
  | { type: "done" }
  | { type: "error"; message: string };

export async function buildSystemPrompt(productContext?: string): Promise<string> {
  const [aiSettings, store] = await Promise.all([getAISettings(), getStoreSettings()]);
  const base = aiSettings.systemPrompt?.trim() ? aiSettings.systemPrompt.trim() : DEFAULT_SYSTEM_PROMPT;
  const parts = [
    base,
    `\n\n## اطلاعات فروشگاه: نام: ${store.storeName} | تماس: ${store.phone} | واحد پول: ${store.currency}`,
  ];
  if (productContext) {
    parts.push(
      `\n\n## زمینه محصول (کاربر همین حالا در صفحه این محصول است):\n${productContext}`,
      `\n### شیوه مشاوره روی این محصول:
کاربر روی دکمه «مشاوره با دستیار هوشمند این محصول» کلیک کرده. مثل یک مشاور واقعی باهاش گفتگو کن — نه گزارش:
- پیام اول: ۲-۳ جمله زنده — این محصول چیه، یه نکته جذاب واقعی از مشخصاتش، و شرایط فعلی خریدش (قیمت/موجودی).
- بعدش یک سوال بپرس که مشاوره را شخصی کن (مثل: «اصلاً برای چه کاری می‌خوایش؟ گیمه یا کار روزمره؟»).
- مشخصات فنی را بعداً و فقط موارد مرتبط با جواب کاربر بگو — قطره‌چکانی، نه کل جدول.
- اگر کاربر جایگزین خواست، اون‌موقع با searchProducts گزینه‌های واقعی پیدا کن و برای هرکدوم ۱-۲ خط بگو.
همیشه از داده‌های زمینه بالا و ابزارها استفاده کن؛ هیچ عدد یا مشخصاتی را از دانش عمومی خودت نساز.`
    );
  }
  parts.push(`\n\n${TOOLS_SPEC}`);
  return parts.join("");
}

export async function buildProductContext(productId: string): Promise<string | null> {
  const p = await db.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }] },
    include: productInclude,
  });
  if (!p) return null;
  const dto = serializeProduct(p);
  const specs = dto.specifications.map((s) => `${s.label}: ${s.value}`).join("\n") || "بدون مشخصات ثبت‌شده";
  return [
    `ID: ${dto.id}`,
    `نام: ${dto.name}`,
    `برند: ${dto.brand.name} | دسته: ${dto.category.name}`,
    `قیمت اصلی: ${dto.price.toLocaleString("fa-IR")} ${"تومان"}`,
    dto.discountPrice ? `قیمت با تخفیف: ${dto.discountPrice.toLocaleString("fa-IR")} تومان (تخفیف ${dto.discountPercent}٪)` : "بدون تخفیف",
    `موجودی انبار: ${dto.stock > 0 ? `${dto.stock} عدد موجود` : "ناموجود"}`,
    `رنگ‌ها: ${dto.colors.map((c) => c.name).join("، ") || "بدون رنگ"}`,
    `امتیاز کاربران: ${dto.rating} از ۵ (${dto.reviewCount} نظر)`,
    `تعداد فروش: ${dto.soldCount}`,
    `توضیح کوتاه: ${dto.shortDescription ?? "—"}`,
    `مشخصات فنی:\n${specs}`,
    `توضیحات کامل: ${(dto.description ?? "—").slice(0, 2000)}`,
  ].join("\n");
}

const MAX_TOOL_ROUNDS = 4;

// ─────────────────── Deterministic intent routing (spec §40–§42) ───────────────────
// Order tracking + product search/price/availability MUST work WITHOUT any
// LLM. Intent routing runs BEFORE the LLM; order requests NEVER reach it
// (spec §41 — the AI must never be trusted to determine order status).

const ORDER_INTENT_RE = /(پیگیری\s*(سفارش)?|سفارش\s*من|سفارشم|شماره\s*سفارش|کد\s*سفارش|کد\s*پیگیری|کد\s*رهگیری|رهگیری\s*مرسوله|کجاست|order\s*track)/i;
const GREETING_ONLY_RE = /^(سلام+|درود|هی|سلام علیکم|سلام‌علیکم|سلام.\s*چه خبر|سلام\s+خوبی)[!.،؟\s]*$/;
// Short, direct catalog questions — deterministic instant answers.
// Consultations (مشاوره/مقایسه/کدوم…) keep the rich LLM path.
const CONSULT_RE = /(مشاوره|مقایسه|کدوم|کدام|بهتره|تفاوت|مناسبه|پیشنهاد|راهنمایی|انتخاب|意见|فرق)/;
const QUICK_Q_RE = /(قیمت|چنده|چند است|چند|موجوده|موجود هست|موجودی|استوک|دارید|دارین|دارم|انبار|گرون|ارزون|قیمته|قیمتش|بهای|هزینه|میلیون|زیر [0-9۰-۹]|تا [0-9۰-۹]|بالای [0-9۰-۹])/;

/* v29.1: anaphora / follow-up detection — the user is talking ABOUT the
 * products from the previous turns («قیمتشونو ندادی», «همون قرمزش رو بگو»,
 * «نگفتی گرون‌تره یا ارزون‌تر») instead of naming a product. These must NOT
 * be literal-searched (the reported bug: «قیمتشونو ندادی» was searched as a
 * product name and answered «محصولی مطابق پیدا نشد»). They are routed to
 * the LLM path, which carries the chat history and can re-use its own
 * previous answer (and its tools) to respond conversationally. */
const FOLLOWUP_RE = /(‌|\s)*(قیمت|قیمتا|قیمت‌ها|چند|موجود|موجودی|رنگ|حافظه|گارانتی|موجودیه)(‌|\s)*(شون|اش|شان|شونو|هاشون|هاش|اونا|اون‌ها)|قیمتشون|قیمتاشون|قیمت‌هاشون|چندشون|چنداشون|ندادی|ندادی؟|نداشتید|نگفتی|نگفتید|نگرداندی|چیکار|تکرارش کن|دوباره بگو|بگو قیمت|قیمت بده|همون|همونایی|همونا|همینا|همین‌ها|اینای|اینایی|ایناش|اونا|اونایی|دومی|سومی|چهارمی|پس چی|خب پس|حالا چی/;

/* ── v22 order-number / phone extraction ──────────────────────────────────
 * ROOT CAUSE of the reported bug: the old ORDER_NUM_RE (/TAJ-?\s?(\d{2,8})/)
 * only matched TAJ-<digits>, but REAL order numbers are TAJ-<base36>-<4>
 * (e.g. TAJ-MTOCX9R9-422N — see generateOrderNumber()). A bare order number
 * therefore never matched the order intent, fell into PRODUCT search and the
 * widget answered «محصولی مطابق پیدا نشد». These helpers understand the real
 * format, Persian digits, and every common phone spelling. */

/** Persian (۰-۹) + Arabic-Indic (٠-٩) digits → Latin (users paste Persian digits). */
function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Clean up a raw order-number value (tool args) → "TAJ-XXX-YYY" shape. */
function normalizeOrderNumber(raw: string): string {
  const trimmed = toLatinDigits(raw).toUpperCase().trim();
  if (!trimmed) return "";
  const extracted = extractOrderNumber(trimmed);
  return extracted ?? trimmed.replace(/\s+/g, "");
}

/** Find a full TAJ order number inside free text → "TAJ-MTOCX9R9-422N" | null. */
function extractOrderNumber(text: string): string | null {
  if (!/TAJ/i.test(text)) return null;
  const m = toLatinDigits(text)
    .toUpperCase()
    .match(/TAJ\s*-?\s*[A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)*/);
  if (!m) return null;
  return m[0].replace(/\s+/g, "");
}

/** Normalize any phone spelling (+98…/0098…/98…/9…/09…) → "09XXXXXXXXX". */
function normalizePhone(raw: string): string {
  const compact = toLatinDigits(String(raw ?? "")).replace(/[\s\-()._]/g, "");
  const m = compact.match(/(?:\+98|0098|98)?0?9[0-9]{9}/);
  if (!m) return compact;
  let p = m[0];
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  else if (p.startsWith("0098")) p = "0" + p.slice(4);
  else if (p.startsWith("98")) p = "0" + p.slice(2);
  else if (!p.startsWith("0")) p = "0" + p;
  return p;
}

/** Find an Iranian mobile number inside free text (Persian digits too) → "09XXXXXXXXX" | null. */
function extractPhone(text: string): string | null {
  const compact = toLatinDigits(text).replace(/[\s\-()._]/g, "");
  const m = compact.match(/(?<![0-9])(?:\+98|0098|98)?0?9[0-9]{9}(?![0-9])/);
  if (!m) return null;
  return normalizePhone(m[0]);
}

function lastUserMessage(history: ChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].content;
  }
  return "";
}

function faNum(n: number): string {
  return n.toLocaleString("fa-IR");
}

const ORDER_STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت", PAID: "پرداخت شده", PROCESSING: "در حال بررسی",
  CONFIRMED: "تأیید شده", READY_TO_SHIP: "آماده ارسال", SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده", CANCELLED: "لغو شده", REFUNDED: "برگشت خورده",
};
const ORDER_PAY_FA: Record<string, string> = {
  UNPAID: "پرداخت نشده", VERIFYING: "در حال بررسی رسید", PAID: "پرداخت شده",
  REJECTED: "رد شده", FAILED: "ناموفق", REFUNDED: "بازگشت وجه",
};

/** Render the tracking summary from a tool getOrderStatus payload. */
function orderStatusLines(result: Record<string, unknown>, lead?: string): string {
  const items = Array.isArray(result.items) ? (result.items as { name: string; quantity: number }[]) : [];
  const lines: string[] = [];
  if (lead) lines.push(lead, "");
  lines.push(
    `📦 **وضعیت سفارش ${result.orderNumber}**`,
    `• وضعیت: **${result.status}**`,
    `• پرداخت: ${result.paymentMethod} — **${result.paymentStatus}**`
  );
  if (result.rejectionReason) lines.push(`• دلیل رد رسید: ${result.rejectionReason}`);
  lines.push(`• اقلام (${faNum(items.length)}): ${items.map((i) => `${i.name} ×${faNum(i.quantity)}`).join("، ")}`);
  lines.push(`• مبلغ کل: **${faNum(Number(result.total))} تومان**`);
  if (result.trackingCode) lines.push(`• کد رهگیری مرسوله: \`${result.trackingCode}\``);
  const created = new Date(String(result.createdAt));
  if (!isNaN(created.getTime())) lines.push(`• تاریخ ثبت: ${created.toLocaleDateString("fa-IR")}`);
  lines.push("", "برای جزئیات بیشتر و تاریخچهٔ کامل، صفحهٔ [پیگیری سفارش](/track-order) هم در دسترس شماست.");
  return lines.join("\n");
}

/** Deterministic order-tracking conversation (NO LLM involved).
 *  v22: understands REAL order numbers (TAJ-MTOCX9R9-422N), Persian digits,
 *  stitches order-number + phone across conversation turns, auto-tracks the
 *  logged-in customer's own orders (session match — no phone prompt), and
 *  always asks for ONLY the missing piece. */
async function* deterministicOrderFlow(
  userText: string,
  priorUserTexts: string[] = [],
  viewer?: OrderViewer
): AsyncGenerator<ChatEvent> {
  const currentOrderNum = extractOrderNumber(userText);
  const currentPhone = extractPhone(userText);
  // multi-turn stitching: the widget asked for the missing piece and the
  // user answered with ONLY that — combine with what they sent earlier in
  // this same conversation (last 6 user turns).
  const prior = priorUserTexts.slice(-6).map(toLatinDigits).join(" \n ");
  const orderNum = currentOrderNum ?? extractOrderNumber(prior);
  const phone = currentPhone ?? extractPhone(prior);

  if (orderNum) {
    // viewer auto-match works even without a phone
    const result = (await toolGetOrderStatus(
      { orderNumber: orderNum, ...(phone ? { phone } : {}) },
      viewer
    )) as Record<string, unknown>;
    if (result && result.error === "NEED_PHONE") {
      yield {
        type: "delta",
        text: `شماره سفارش **${orderNum}** دریافت شد ✅\nبرای نمایش وضعیت، فقط **شماره موبایل ثبت‌شده روی همین سفارش** را بفرستید (مثل 09121234567).`,
      };
      yield { type: "done" };
      return;
    }
    if (result && typeof result.error === "string") {
      yield { type: "delta", text: `⚠️ ${result.error}` };
      yield { type: "done" };
      return;
    }
    yield { type: "delta", text: orderStatusLines(result) };
    yield { type: "done" };
    return;
  }

  if (phone) {
    yield {
      type: "delta",
      text: `شماره موبایل **${phone}** دریافت شد ✅\nحالا **شماره سفارش** را هم بفرستید (مثل TAJ-MTOCX9R9-422N) تا وضعیت کامل را نمایش دهم.`,
    };
    yield { type: "done" };
    return;
  }

  // intent with nothing usable — logged-in customers see their LATEST order
  if (viewer) {
    const latest = await db.order.findFirst({
      where: {
        OR: [
          { userId: viewer.id },
          ...(viewer.phone ? [{ phone: normalizePhone(viewer.phone) }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true, c2cPayment: true },
    });
    if (latest) {
      const payload = await toolGetOrderStatus(
        { orderNumber: latest.orderNumber, phone: latest.phone },
        viewer
      );
      if (payload && typeof (payload as Record<string, unknown>).error !== "string") {
        yield { type: "delta", text: orderStatusLines(payload as Record<string, unknown>, "آخرین سفارش ثبت‌شدهٔ شما:") };
        yield { type: "done" };
        return;
      }
    }
    yield {
      type: "delta",
      text: "حساب شما هنوز سفارشی ثبت‌شده ندارد. اگر سفارش را به‌عنوان مهمان ثبت کرده‌اید، **شماره سفارش + شماره موبایل** آن را بفرستید تا پیگیری کنم.",
    };
    yield { type: "done" };
    return;
  }

  yield {
    type: "delta",
    text:
      "برای پیگیری سفارش این دو مورد را بفرستید:\n• **شماره سفارش** (مثل TAJ-MTOCX9R9-422N)\n• **شماره موبایل** ثبت‌شده روی سفارش (مثل 09121234567)\n\u200dنکته: اگر با حساب کاربری خود وارد شده باشید، فقط شماره سفارش کافی است — سیستم خودش سفارش شما را تطبیق می‌دهد.",
  };
  yield { type: "done" };
}

/** Deterministic catalog answer — used for quick questions and as the
 *  NO-LLM fallback (spec §40/§42: safe catalog-based response).
 *  v19: rides the SMART search engine — price constraints (زیر ۲۰ میلیون …),
 *  brand/category detection, filler-word stripping and typo-tolerant
 *  relevance ranking, so answers are correct even without any LLM. */
/** v20: standalone filler WORDS removed from the query before searching.
 *  NEVER regex-replace these as substrings — «می» inside «میلیون» would
 *  mutate it into «لیون» and silently destroy the price parser. */
const CLEAN_STRIP_WORDS = new Set([
  "مشاوره", "کامل", "درباره‌ی", "درباره", "راجع", "لطفاً", "لطفا",
  "بده", "بگو", "معرفی", "نگاهی", "بنداز",
  "میخوام", "میخواهم", "بخوام", "بخواهم", "می", "خوام", "خواستم", "کنم", "بگیرم", "بخرم",
]);

function stripFillerWords(query: string): string {
  return query
    .replace(/[؟?!.،,«»"']+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .filter((w) => {
      const squashed = w.replace(/\u200c/g, "");
      return !CLEAN_STRIP_WORDS.has(w) && !CLEAN_STRIP_WORDS.has(squashed);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function* deterministicCatalogAnswer(query: string): AsyncGenerator<ChatEvent> {
  // strip common question words so the search query is the product name itself
  const clean = stripFillerWords(query);
  if (!clean || clean.length < 2) {
    yield {
      type: "delta",
      text: "برای جستجوی محصول، نام یا مدل کالا را بفرستید (مثلاً: «آیفون» یا «هدفون سونی»).",
    };
    yield { type: "done" };
    return;
  }
  const { products, parsed } = await smartSearchProducts({ query: clean, limit: 6 });

  /* v20 relevance gate: a SPECIFIC model query («Galaxy S24 Ultra 512»)
     must not be padded with weak matches (a Galaxy A55 that only shares the
     generic words گوشی/ظرفیت/گیگابایت). Keep only products that cover ≥75%
     of the top product's distinct-keyword coverage. Generic one-word queries
     (top coverage < 2) keep the full ranked list. */
  const topCov = products[0]?.matchedKeywords ?? 0;
  const strong =
    topCov >= 2
      ? products.filter((p) => p.matchedKeywords >= Math.ceil(topCov * 0.75) && p.score >= Math.max(3, products[0].score * 0.45))
      : products;
  const shown = (strong.length > 0 ? strong : products).slice(0, 4);

  if (shown.length === 0) {
    const filterBits = [
      parsed.category ? `دسته «${parsed.category}»` : null,
      parsed.brand ? `برند «${parsed.brand}»` : null,
      parsed.priceText,
    ].filter(Boolean);
    const filterText = filterBits.length > 0 ? ` با فیلتر ${filterBits.join(" و ")}` : "";
    yield {
      type: "delta",
      text: `فعلاً محصولی مطابق «${parsed.cleanText || clean}»${filterText} در فروشگاه موجود نیست.\nمی‌توانید دسته‌بندی‌ها را از صفحه [محصولات](/products) مرور کنید یا محدودیت را کمی بازتر کنید.`,
    };
    yield { type: "done" };
    return;
  }

  /* v20 — CONSULTING tone (not a search dump): when the user asks about one
     specific product, answer like a human sales consultant (availability,
     price, stock, key specs, honest advice) instead of echoing their own
     question back with «X محصول مطابق پیدا کردم». */
  const constraint = parsed.priceText ? ` (${parsed.priceText})` : "";
  const lines: string[] = [];

  if (shown.length === 1) {
    const p = shown[0];
    const specEntries = Object.entries(p.topSpecs).slice(0, 3);
    // v22: VARIABLE products are priced per color×spec combination — show
    // the real per-combination prices instead of a single base price.
    const combos = (p.combos ?? []).filter((c) => c.price > 0).slice(0, 6);
    lines.push(
      p.stock > 0 ? "بله، این کالا الان در فروشگاه موجوده ✅" : "این کالا در فروشگاه ثبت شده ولی فعلاً ناموجود ❌",
      "",
      /* v29.1: product name is a real link → /products/slug (the chat
       * RichText renderer turns [label](/path) into clickable Links) */
      `[${p.name}](/products/${p.slug})`
    );
    if (combos.length > 0) {
      const prices = combos.map((c) => c.price);
      lines.push(
        `• قیمت: از ${faNum(Math.min(...prices))} تا ${faNum(Math.max(...prices))} تومان (بسته به رنگ/مشخصه)`
      );
      for (const c of combos) {
        lines.push(
          `  ◦ ${c.label}: **${faNum(c.price)} تومان**${c.stock === 0 ? " — ناموجود" : c.stock != null ? ` — ${faNum(c.stock)} عدد` : ""}`
        );
      }
    } else {
      lines.push(
        `• قیمت: ${faNum(p.effectivePrice)} تومان${p.discountPercent > 0 ? ` (با تخفیف ${faNum(p.discountPercent)}٪ — قیمت اصلی ${faNum(p.price)})` : ""}`
      );
    }
    lines.push(
      `• موجودی: ${p.stock > 0 ? `${faNum(p.stock)} عدد در انبار` : "ناموجود"}`,
      `• برند: ${p.brand} — دسته: ${p.category}`
    );
    if ((p.colors ?? []).length > 0) {
      lines.push(`• رنگ‌های ثبت‌شده: ${p.colors!.join("، ")}`);
    }
    if (specEntries.length > 0) {
      lines.push("• مشخصات کلیدی: " + specEntries.map(([k, v]) => `${k} ${v}`).join("، "));
    }
    lines.push(
      "",
      p.stock > 0
        ? "برای دیدن تصاویر و ثبت سفارش، کارت زیر را باز کنید. اگر سوالی درباره رنگ، مشخصات یا مقایسه با مدل‌های مشابه دارید، بپرسید."
        : "اگر بخواهید، مشابه‌های موجود همین دسته را معرفی می‌کنم — فقط بگویید بودجه‌تان چقدر است."
    );
  } else {
    lines.push(
      `${faNum(shown.length)} گزینهٔ مرتبط پیدا کردم${constraint} — خلاصهٔ مقایسه:`,
      ""
    );
    for (const p of shown) {
      lines.push(
        /* v29.1: clickable product link instead of bare bold name */
        `• [${p.name}](/products/${p.slug}) — ${faNum(p.effectivePrice)} تومان${p.discountPercent > 0 ? ` (تخفیف ${faNum(p.discountPercent)}٪)` : ""} — ${p.stock > 0 ? `✅ ${faNum(p.stock)} عدد موجود` : "❌ ناموجود"}`
      );
    }
    lines.push(
      "",
      "کدام برای بودجه و نیاز شما مناسب‌تر است بگویید تا کامل مقایسه‌شان کنم؛ کارت‌های زیر هم برای مشاهده جزئیات آماده‌اند:"
    );
  }

  // [[PRODUCTS:…]] marker is parsed by emitProductsAndText into product cards
  lines.push(`[[PRODUCTS:${shown.slice(0, 3).map((p) => p.id).join(",")}]]`);
  yield* emitProductsAndText("", lines.join("\n"));
}

/** v20: deterministic full product consultation — the fallback when the LLM
 *  engine is unavailable but the user asked for a consult from a PRODUCT
 *  PAGE (context.productId). Builds a real consultation (price, stock, key
 *  specs, rating, honest alternatives from the same category) from live DB
 *  data — never a search-style echo. */
async function* deterministicProductConsult(productId: string): AsyncGenerator<ChatEvent> {
  const p = await db.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }], status: "PUBLISHED" },
    include: productInclude,
  });
  if (!p) {
    yield* deterministicCatalogAnswer("");
    return;
  }
  const dto = serializeProduct(p);
  const specEntries = dto.specifications.slice(0, 5);
  // v22: VARIABLE products — the per color×spec combination price matrix
  const combos = dto.productType === "VARIABLE" ? dto.combinations.filter((c) => c.price > 0).slice(0, 8) : [];
  const comboPrices = combos.map((c) => c.price);

  const lines: string[] = [
    `بررسی کامل «**${dto.name}**» به‌عنوان مشاور خرید:`,
    "",
    combos.length > 0
      ? `💰 **قیمت:** بسته به ترکیب رنگ×مشخصه — از ${faNum(Math.min(...comboPrices))} تا ${faNum(Math.max(...comboPrices))} تومان:`
      : `💰 **قیمت:** ${faNum(dto.effectivePrice)} تومان${dto.discountPercent > 0 ? ` — با تخفیف ${faNum(dto.discountPercent)}٪ (قیمت اصلی ${faNum(dto.price)})` : ""}`,
    `📦 **موجودی:** ${dto.stock > 0 ? `${faNum(dto.stock)} عدد در انبار — آماده ارسال` : "فعلاً ناموجود"}`,
    `🏷️ **برند و دسته:** ${dto.brand.name} — ${dto.category.name}`,
  ];
  if (combos.length > 0) {
    for (const c of combos) {
      lines.push(
        `  ◦ ${[c.color, c.variant].filter(Boolean).join(" / ")}: **${faNum(c.price)} تومان**${c.stock === 0 ? " — ناموجود" : c.stock != null ? ` — ${faNum(c.stock)} عدد` : ""}`
      );
    }
    lines.push("");
  }
  if (dto.rating > 0) {
    lines.push(`⭐ **امتیاز کاربران:** ${faNum(dto.rating)} از ۵${dto.reviewCount > 0 ? ` (${faNum(dto.reviewCount)} دیدگاه)` : ""}`);
  }
  if (specEntries.length > 0) {
    lines.push("", "🔑 **مشخصات کلیدی:**");
    for (const s of specEntries) lines.push(`• ${s.label}: ${s.value}`);
  }
  if (dto.colors.length > 0) {
    lines.push(`🎨 **رنگ‌های موجود:** ${dto.colors.map((c) => c.name).join("، ")}`);
  }

  // honest alternatives from the same category (max 2, real data only).
  // NOTE: smartSearchProducts expects the category NAME (not slug) for the
  // explicit filter — see detectTaxonomy.
  const { products: alts } = await smartSearchProducts({
    category: dto.category.name,
    limit: 4,
    inStockOnly: dto.stock === 0,
  });
  const alternatives = alts.filter((a) => a.id !== dto.id).slice(0, 2);
  if (alternatives.length > 0) {
    lines.push(
      "",
      "🔄 **جایگزین‌های واقعی همین دسته** (برای مقایسه):",
      ...alternatives.map((a) => `• ${a.name} — ${faNum(a.effectivePrice)} تومان${a.stock > 0 ? " — موجود" : ""}`),
      ""
    );
    lines.push(
      `[[PRODUCTS:${[dto.id, ...alternatives.map((a) => a.id)].join(",")}]]`
    );
  } else {
    lines.push("", `[[PRODUCTS:${dto.id}]]`);
  }

  lines.push(
    "",
    "اگر بودجه یا استفادهٔ خاصی مدنظرتان است بگویید — همین‌جا مقایسهٔ دقیق و پیشنهاد نهایی می‌دهم."
  );
  yield* emitProductsAndText("", lines.join("\n"));
}

/* ── v23: deterministic side-by-side COMPARE (no LLM required) ──────────
 * Powers «مقایسه» on the product page + the chat fallback: real data only
 * (price, stock, rating, sold, spec-union, colors), an honest spec-by-spec
 * verdict, and a final «which one for whom» recommendation. */
async function* deterministicCompareConsult(productIdA: string, productIdB: string): AsyncGenerator<ChatEvent> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", OR: [{ id: productIdA }, { slug: productIdA }, { id: productIdB }, { slug: productIdB }] },
    include: productInclude,
  });
  const a = rows.find((r) => r.id === productIdA || r.slug === productIdA);
  const b = rows.find((r) => r.id === productIdB || r.slug === productIdB);
  if (!a || !b) {
    yield {
      type: "delta",
      text: "یکی از محصولات مقایسه پیدا نشد — ممکن است حذف یا غیرفعال شده باشد.",
    };
    yield { type: "done" };
    return;
  }
  const A = serializeProduct(a);
  const B = serializeProduct(b);

  // spec union (label-keyed) — only keys that differ or exist on both
  const specMap = new Map<string, { label: string; a?: string; b?: string }>();
  for (const s of A.specifications) specMap.set(s.key, { label: s.label, a: s.value });
  for (const s of B.specifications) {
    const hit = specMap.get(s.key);
    if (hit) hit.b = s.value;
    else specMap.set(s.key, { label: s.label, b: s.value });
  }
  const diffs = [...specMap.values()].filter((s) => (s.a ?? "—") !== (s.b ?? "—"));

  const lines: string[] = [
    `⚖️ **مقایسهٔ واقعی «${A.name}» و «${B.name}»:**`,
    "",
    `💰 **قیمت:** ${faNum(A.effectivePrice)} تومان${A.discountPercent > 0 ? ` (تخفیف ${faNum(A.discountPercent)}٪)` : ""} ← در برابر ${faNum(B.effectivePrice)} تومان${B.discountPercent > 0 ? ` (تخفیف ${faNum(B.discountPercent)}٪)` : ""}`,
    A.effectivePrice !== B.effectivePrice
      ? `  ◦ ${A.effectivePrice < B.effectivePrice ? A.name : B.name} **ارزان‌تر** است (${faNum(Math.abs(A.effectivePrice - B.effectivePrice))} تومان اختلاف).`
      : "  ◦ قیمت هر دو یکسان است.",
    `📦 **موجودی:** ${A.stock > 0 ? `${faNum(A.stock)} عدد` : "ناموجود"} ← ${B.stock > 0 ? `${faNum(B.stock)} عدد` : "ناموجود"}`,
    A.rating > 0 || B.rating > 0
      ? `⭐ **امتیاز کاربران:** ${A.rating > 0 ? `${faNum(A.rating)} از ۵${A.reviewCount > 0 ? ` (${faNum(A.reviewCount)} دیدگاه)` : ""}` : "بدون امتیاز"} ← ${B.rating > 0 ? `${faNum(B.rating)} از ۵${B.reviewCount > 0 ? ` (${faNum(B.reviewCount)} دیدگاه)` : ""}` : "بدون امتیاز"}`
      : "",
    `🔥 **فروش واقعی:** ${faNum(A.soldCount)} ← ${faNum(B.soldCount)}`,
  ].filter((l) => l !== "");

  if (diffs.length > 0) {
    lines.push("", "🔑 **تفاوت‌های کلیدی (م از مشخصات واقعی):**");
    for (const d of diffs.slice(0, 6)) {
      lines.push(`• ${d.label}: ${A.name.split(" ").slice(0, 2).join(" ")} → **${d.a ?? "—"}** | ${B.name.split(" ").slice(0, 2).join(" ")} → **${d.b ?? "—"}**`);
    }
  }
  if (A.colors.length > 0 || B.colors.length > 0) {
    lines.push(`🎨 **رنگ‌ها:** ${A.colors.map((c) => c.name).join("، ") || "—"} ← ${B.colors.map((c) => c.name).join("، ") || "—"}`);
  }

  // honest verdict heuristic: rating weight > sold weight > value
  const scoreA = A.rating * 2 + Math.min(A.soldCount, 500) / 250 + (A.effectivePrice < B.effectivePrice ? 0.5 : 0);
  const scoreB = B.rating * 2 + Math.min(B.soldCount, 500) / 250 + (B.effectivePrice < A.effectivePrice ? 0.5 : 0);
  const winner = scoreA === scoreB ? null : scoreA > scoreB ? A : B;
  lines.push(
    "",
    winner
      ? `🏆 **جمع‌بندی:** با توجه به امتیاز کاربران، فروش واقعی و ارزش قیمت، **${winner.name}** انتخاب منطقی‌تری است — اما اگر ${winner === A ? B.name : A.name} بودجه/نیاز خاص شما را دقیق‌تر پوشش می‌دهد (مشخصات بالا را ببینید)، همان انتخاب درست‌تری است.`
      : "🏆 **جمع‌بندی:** این دو در داده‌های واقعی فروشگاه تقریباً هم‌ترازند — انتخاب به بودجه و اولویت مشخصات شما بستگی دارد.",
    "برای تحلیل عمیق‌ترِ نیاز شخصی‌تان (کاربری، بودجه، اولویت) بگویید تا دقیق‌تر راهنمایی کنم."
  );
  yield* emitProductsAndText("", lines.join("\n"));
}

/** Shared helper: parse [[PRODUCTS:…]] markers in `text` → emit a
 *  `products` event (real product cards) + stream the remaining text. */
async function* emitProductsAndText(_unused: string, text: string): AsyncGenerator<ChatEvent> {
  const productIds = new Set<string>();
  const cleaned = text.replace(/\[\[PRODUCTS:([a-zA-Z0-9,\s-]+)\]\]/g, (_m, ids: string) => {
    ids.split(",").forEach((id) => {
      const t = id.trim();
      if (t) productIds.add(t);
    });
    return "";
  }).trim();
  if (productIds.size > 0) {
    const products = await db.product.findMany({
      where: { id: { in: [...productIds].slice(0, 4) }, status: "PUBLISHED" },
      include: productInclude,
    });
    if (products.length > 0) {
      yield {
        type: "products",
        products: products.map((p) => {
          const dto = serializeProduct(p);
          return {
            id: dto.id, name: dto.name, slug: dto.slug, price: dto.price,
            discountPrice: dto.discountPrice, effectivePrice: dto.effectivePrice,
            discountPercent: dto.discountPercent, stock: dto.stock,
            image: dto.mainImage, rating: dto.rating, brand: dto.brand.name,
          };
        }),
      };
    }
  }
  const words = (cleaned || text).split(/(\s+)/);
  let buffer = "";
  for (const w of words) {
    buffer += w;
    if (buffer.length >= 6) {
      yield { type: "delta", text: buffer };
      buffer = "";
      await new Promise((r) => setTimeout(r, 12));
    }
  }
  if (buffer) yield { type: "delta", text: buffer };
  yield { type: "done" };
}

export async function* runAIChat(
  history: ChatMessage[],
  productContext?: string,
  /** v20: the productId from the chat request context — lets the LLM-fallback
   *  deliver a full deterministic consultation of THAT product instead of a
   *  generic search answer. */
  contextProductId?: string,
  /** v22: the logged-in viewer (from the session cookie) — order tracking
   *  auto-matches the customer's OWN orders; product consults stay identical. */
  viewer?: OrderViewer,
  /** v23: second product of an AI-compare request — the fallback path then
   *  emits a deterministic side-by-side comparison instead of a single-product
   *  consult. The LLM path already receives both products via productContext. */
  compareWithId?: string
): AsyncGenerator<ChatEvent> {
  const ai = await getAISettings();
  if (!ai.enabled) {
    yield { type: "error", message: "دستیار هوشمند در حال حاضر غیرفعال است." };
    return;
  }

  const system = await buildSystemPrompt(productContext);
  const messages: ChatMessage[] = [...history.slice(-20)];
  const lastMsg = lastUserMessage(messages);

  /* ── Layer 1: deterministic routing (spec §42) ── */

  // v22: prior user turns — lets a bare phone/order-number answer be
  // stitched with what the user already sent (multi-turn tracking).
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);
  const priorUserTexts = userTurns.slice(0, -1);
  const priorHasOrderNum = priorUserTexts.some((t) => !!extractOrderNumber(toLatinDigits(t)));
  const lastIsPhoneOnly = !!extractPhone(lastMsg);
  const lastHasOrderNum = !!extractOrderNumber(lastMsg);

  // Order requests are ALWAYS deterministic — never sent to any LLM (§41).
  // v22: a bare order number (real TAJ-XXXX-XXXX format) or a bare phone
  // that follows an order number both route here too — they used to fall
  // through to product search and produced the reported irrelevant answers.
  if (ORDER_INTENT_RE.test(lastMsg) || lastHasOrderNum || (lastIsPhoneOnly && priorHasOrderNum)) {
    yield* deterministicOrderFlow(lastMsg, priorUserTexts, viewer);
    return;
  }

  // Bare greeting — instant canned answer, no LLM round-trip.
  if (GREETING_ONLY_RE.test(lastMsg.trim())) {
    const proGreeting = ai.provider === "gapgpt" && !!ai.gapApiKey?.trim();
    yield {
      type: "delta",
      text:
        `سلام! 👋 من ${proGreeting ? "ایجنت فروش پرو" : "دستیار خرید"} فروشگاه هستم.\n\nمی‌توانم:\n• محصول موردنظرتان را پیدا کنم (نام، مدل، رنگ یا مشخصات را بفرستید)\n• قیمت و موجودی را همان لحظه بررسی کنم\n• سفارشتان را پیگیری کنم (اگر وارد حساب خود باشید فقط شماره سفارش کافی است)\n• در انتخاب و مقایسه کالاها راهنمایی‌تان کنم`,
    };
    yield { type: "done" };
    return;
  }

  // Short, direct price/availability question → instant catalog answer.
  // Consultations (rich questions) keep the LLM path.
  // v29.1: follow-up references to earlier products (قیمتشونو ندادی…)
  // skip the fast lane — only when there IS history to refer back to.
  const hasHistory = messages.length > 1;
  const isFollowUp = hasHistory && FOLLOWUP_RE.test(lastMsg);
  const isShortQuick =
    lastMsg.trim().length <= 60 &&
    QUICK_Q_RE.test(lastMsg) &&
    !CONSULT_RE.test(lastMsg) &&
    !isFollowUp &&
    !productContext;
  if (isShortQuick) {
    yield* deterministicCatalogAnswer(lastMsg);
    return;
  }

  let finalText = "";
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const raw = await callLLM(system, messages);
      const text = (raw ?? "").trim();
      if (!text) {
        yield { type: "error", message: "پاسخی از هوش مصنوعی دریافت نشد. لطفاً دوباره تلاش کنید." };
        return;
      }
      const toolCall = parseToolCall(text);
      if (toolCall && round < MAX_TOOL_ROUNDS) {
        const result = await executeTool(toolCall, viewer);
        messages.push({ role: "assistant", content: text });
        messages.push({
          role: "user",
          content: `نتیجه ابزار ${toolCall.tool}:\n${JSON.stringify(result).slice(0, 6000)}\n\nاگر اطلاعات کافی است، پاسخ نهایی فارسی را بده و در صورت پیشنهاد محصول، نشانگر [[PRODUCTS:...]] را در انتها اضافه کن. اگر نیاز به ابزار دیگری هست، فقط JSON ابزار بعدی را بفرست.`,
        });
        continue;
      }
      finalText = text;
      break;
    }
  } catch (e) {
    /* ── Layer 2 fallback (spec §42): LLM unavailable → safe catalog-based
       response. Order tracking / product search / price / availability keep
       working WITHOUT any LLM — never a dead end. v14.1 hardening: the
       fallback itself is also guarded, and the old dead-end error text
       ("خطا در پردازش پاسخ هوش مصنوعی.") can never be the ONLY outcome —
       the user always gets either a real catalog answer, a helpful
       capabilities message, or a precise provider-specific diagnostic. */
    console.error("[AI fallback]", e);
    // v20: surface the engine failure (with an analysis) to the admin
    // activity log — "گزارش فعالیت مدیران" → AI_ENGINE_FALLBACK
    await logSystemEvent("AI_ENGINE_FALLBACK", {
      entity: "ai",
      metadata: {
        provider: ai.provider,
        engine: ai.provider === "gapgpt" ? (ai.gapModel || "gpt-4o") : "builtin",
        error: String(e instanceof Error ? e.message : e).slice(0, 220),
        analysis: classifyEngineError(ai.provider, e),
        fallback: "پاسخ قطعی از کاتالوگ واقعی (بدون LLM)",
      },
    });
    // v20: product-page consult → full deterministic consultation of the
    // product the user is looking at (price/stock/specs/alternatives)
    // v23: AI-compare requests → deterministic side-by-side comparison
    if (contextProductId && compareWithId) {
      try {
        yield* deterministicCompareConsult(contextProductId, compareWithId);
        return;
      } catch (e2) {
        console.error("[AI fallback] compare consult failed too", e2);
      }
    }
    if (contextProductId) {
      try {
        yield* deterministicProductConsult(contextProductId);
        return;
      } catch (e2) {
        console.error("[AI fallback] product consult failed too", e2);
      }
    }
    const query = lastMsg.trim();
    if (query.length >= 2) {
      try {
        yield* deterministicCatalogAnswer(query);
        return;
      } catch (e2) {
        console.error("[AI fallback] catalog answer failed too", e2);
      }
    }
    // graceful last resort — still tells the user what DOES work
    const providerHint =
      ai.provider === "gapgpt" && ai.gapApiKey
        ? "ارتباط با GapGPT برقرار نشد (کلید، مدل یا اعتبار حساب را در تنظیمات بررسی کنید)."
        : "موتور مشاوره غنی موقتاً در دسترس نیست.";
    yield {
      type: "delta",
      text:
        `${providerHint}\n\nاما این کارها هم‌اکنون کار می‌کنند (بدون هوش مصنوعی):\n` +
        `• **جستجوی محصول و قیمت** — نام کالا را بفرستید (مثلاً «آیفون»)\n` +
        `• **پیگیری سفارش** — شماره سفارش (مثل TAJ-MTOCX9R9-422N) + موبایل؛ اگر وارد حساب خود باشید فقط شماره سفارش کافی است\n` +
        `• **اطلاعات فروشگاه** — ساعات کاری و روش‌های پرداخت`,
    };
    yield { type: "done" };
    return;
  }

  if (!finalText) finalText = "متأسفانه پاسخ مناسبی پیدا نکردم. سوال را دقیق‌تر بپرسید.";

  // extract product markers
  const markerRegex = /\[\[PRODUCTS:([a-zA-Z0-9,\s-]+)\]\]/g;
  const productIds = new Set<string>();
  finalText = finalText.replace(markerRegex, (_m, ids: string) => {
    ids.split(",").forEach((id) => {
      const t = id.trim();
      if (t) productIds.add(t);
    });
    return "";
  }).trim();

  if (productIds.size > 0) {
    const products = await db.product.findMany({
      where: { id: { in: [...productIds].slice(0, 4) }, status: "PUBLISHED" },
      include: productInclude,
    });
    if (products.length > 0) {
      const dtos = products.map((p) => {
        const dto = serializeProduct(p);
        return {
          id: dto.id,
          name: dto.name,
          slug: dto.slug,
          price: dto.price,
          discountPrice: dto.discountPrice,
          effectivePrice: dto.effectivePrice,
          discountPercent: dto.discountPercent,
          stock: dto.stock,
          image: dto.mainImage,
          rating: dto.rating,
          brand: dto.brand.name,
        };
      });
      yield { type: "products", products: dtos };
    }
  }

  // stream text in small chunks for real-time feel
  const words = finalText.split(/(\s+)/);
  let buffer = "";
  for (const w of words) {
    buffer += w;
    if (buffer.length >= 6) {
      yield { type: "delta", text: buffer };
      buffer = "";
      await new Promise((r) => setTimeout(r, 15));
    }
  }
  if (buffer) yield { type: "delta", text: buffer };
  yield { type: "done" };
}

/** Admin "تست اتصال" (spec §39) — meaningful diagnostics, never a bare
 *  "check your API key". For GapGPT failures gapDiagnose probes the
 *  account's /models endpoint with the SAME key to pinpoint the actual
 *  cause (key-level vs model-level vs quota vs network) — the raw error
 *  body excerpt is always included (never hidden). Builtin-engine
 *  failures are CLASSIFIED into a short Persian reason. */
export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  const ai = await getAISettings();
  const gapKey = ai.gapApiKey?.trim() || null;
  const wantsGap = ai.provider === "gapgpt" || ai.provider === "openai" || ai.provider === "gemini" || ai.provider === "auto";
  try {
    if (wantsGap && gapKey) {
      const configured = ai.gapModel || "gpt-4o";
      // auto model resolution — a model the account doesn't have (404)
      // transparently falls back to the account's best available chat model.
      const { text, model } = await callGapGPTAuto(
        gapKey,
        configured,
        "You are a test. Reply with the single word: OK",
        [{ role: "user", content: "ping" }],
        0,
        64
      );
      if (!text) return { success: false, message: `پاسخی از مدل ${model} دریافت نشد (بدنه خالی)` };
      if (model !== configured) {
        return {
          success: true,
          message:
            `اتصال موفق به GapGPT «${model}» — پاسخ: ${text.slice(0, 40)}\n` +
            `نکته: مدل تنظیم‌شده «${configured}» در این حساب موجود نبود؛ سیستم بهترین مدل موجود را خودکار انتخاب کرد. ` +
            `برای ثبت دائمی، مدل «${model}» را در تنظیمات ذخیره کنید.`,
        };
      }
      return { success: true, message: `اتصال موفق به GapGPT «${model}» — پاسخ: ${text.slice(0, 40)}` };
    }
    if (wantsGap && !gapKey) {
      return { success: false, message: "سرویس GapGPT انتخاب شده ولی کلیدی ثبت نشده — کلید API خود را از gapgpt.app (کلیدهای API) بسازید و در تنظیمات وارد کنید." };
    }
    const out = await callBuiltinLLMWithTimeout("Reply with the single word: OK", [{ role: "user", content: "ping" }], 0, 64, 15_000);
    return { success: !!out, message: out ? `اتصال موفق (موتور داخلی) — پاسخ: ${out.slice(0, 40)}` : "پاسخی دریافت نشد" };
  } catch (e) {
    if (gapKey) {
      const diagnosis = await gapDiagnose(gapKey, ai.gapModel || "gpt-4o", e);
      return { success: false, message: diagnosis };
    }
    // builtin engine — classify precisely instead of dumping a raw SDK
    // stack trace on the admin
    const analysis = classifyEngineError("builtin", e);
    return { success: false, message: analysis };
  }
}


// ───────────────── v26: AI-suggested product specs (admin product form) ─────────────────

/** v26: «پیشنهاد هوشمند مشخصات» — asks the CONFIGURED provider chain
 *  (GapGPT with builtin fallback — the key is read from backend settings only,
 *  never from the client) for the specification rows that fit a product
 *  based on its REAL category + name. Returns normalized {key, label}
 *  rows; throws a Persian error when the model output can't be parsed. */
export async function suggestProductSpecs(input: {
  categoryName: string;
  productName?: string;
}): Promise<{ key: string; label: string }[]> {
  const system =
    "You are a product-data specialist for a Persian electronics store. " +
    "Given a product category (and optionally a product name), list the technical " +
    "specification attributes a buyer would expect for that exact kind of product. " +
    "Answer ONLY with a strict JSON array like " +
    '[{"key":"cpu","label":"\u067e\u0631\u062f\u0627\u0632\u0646\u062f\u0647"}] — ' +
    "key = short lowercase english identifier (snake_case, latin letters/digits/_ only), " +
    "label = natural Persian label. 4-10 rows. No markdown, no commentary.";
  const user =
    `Category: ${input.categoryName}` + (input.productName?.trim() ? `\nProduct: ${input.productName.trim()}` : "") +
    "\nDecide from the REAL nature of this category/product (a mobile needs camera/battery specs, a laptop needs gpu/ssd, a powerbank needs capacity/ports…).";

  const out = await callLLM(system, [{ role: "user", content: user }]);
  if (!out.trim()) throw new Error("\u067e\u0627\u0633\u062e\u06cc \u0627\u0632 \u0645\u0648\u062a\u0648\u0631 \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06cc \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f");

  // robust extraction: strip code fences, take the outermost [ … ]
  const cleaned = out.replace(/```[a-zA-Z]*|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("\u062e\u0631\u0648\u062c\u06cc \u0645\u0648\u062f\u0644 \u0642\u0627\u0644\u0628 JSON \u0645\u0639\u062a\u0628\u0631 \u0646\u0628\u0648\u062f");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("\u062e\u0631\u0648\u062c\u06cc \u0645\u0648\u062f\u0644 \u0642\u0627\u0644\u0628 JSON \u0645\u0639\u062a\u0628\u0631 \u0646\u0628\u0648\u062f");
  }
  if (!Array.isArray(parsed)) throw new Error("\u062e\u0631\u0648\u062c\u06cc \u0645\u0648\u062f\u0644 \u0642\u0627\u0644\u0628 JSON \u0645\u0639\u062a\u0628\u0631 \u0646\u0628\u0648\u062f");

  // normalize + dedupe + cap
  const seen = new Set<string>();
  const rows: { key: string; label: string }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { key?: unknown; label?: unknown };
    const key = String(rec.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
    const label = String(rec.label ?? "").trim().slice(0, 100);
    if (!key || !label || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, label });
    if (rows.length >= 12) break;
  }
  if (rows.length === 0) throw new Error("\u0645\u0634\u062e\u0635\u0627\u062a \u0645\u0639\u062a\u0628\u0631\u06cc \u0627\u0632 \u067e\u0627\u0633\u062e \u0645\u062f\u0644 \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0646\u0634\u062f");
  return rows;
}

// ───────────────── v27b: AI product completion (admin product form) ─────────────────

/** v27b: «تکمیل مشخصات محصول با هوش مصنوعی» — the admin types the product
 *  name, the AI fills EVERYTHING it reliably knows about that exact product.
 *  Golden rules (user requirements 12–14):
 *  - never fabricate: unknown/gibberish product → { found: false }, fields stay empty
 *  - never output prices / stock / image URLs (admin-owned)
 *  - never change the product NAME (admin-owned)
 *  - suggested brand/category must come from the store's REAL lists
 *  - variants may be SUGGESTED (attrs only — no price/stock) */
export interface AIProductCompletion {
  found: boolean;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
  specifications?: { key: string; label: string; value: string }[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  suggestedBrand?: string;
  suggestedCategory?: string;
  variants?: { attrs: { label: string; value: string }[] }[];
  notes?: string;
}

const COMPLETION_SYSTEM =
  "You are a product-data specialist for a Persian (Farsi) electronics store. " +
  "The store admin has typed a product NAME; your job is to fill the product record " +
  "with REAL, verifiable public knowledge about that exact product.\n\n" +
  "STRICT RULES:\n" +
  "1. If you do NOT have reliable knowledge of this exact product (fictional name, " +
  "unrecognizable, or you are unsure) respond with the single JSON object " +
  '{"found": false} and nothing else. NEVER fabricate or guess.\n' +
  "2. NEVER output prices, stock quantities, or image URLs — those belong to the admin.\n" +
  "3. Do NOT change, translate or normalize the product name.\n" +
  "4. All descriptive text must be natural, fluent Persian (Farsi). Spec keys are " +
  "lowercase english snake_case; spec labels are Persian.\n" +
  "5. suggestedBrand / suggestedCategory MUST be copied EXACTLY from the provided " +
  "real lists; if nothing matches, omit the field.\n" +
  "6. Variants (if the product is known to come in real variations — colors, storage, " +
  "RAM sizes…) may be suggested as attribute rows WITHOUT prices or stock.\n\n" +
  "Respond ONLY with a strict JSON object, no markdown, no commentary:\n" +
  "{\n" +
  '  "found": true,\n' +
  '  "shortDescription": "یک جملهٔ کوتاه فارسی",\n' +
  '  "description": "توضیحات کامل ۲ تا ۴ پاراگراف فارسی",\n' +
  '  "highlights": ["ویژگی برجسته ۱", "ویژگی ۲"],\n' +
  '  "specifications": [{"key":"display_size","label":"اندازه صفحه","value":"۷ اینچ"}],\n' +
  '  "tags": ["برند", "نوع محصول"],\n' +
  '  "seoTitle": "…", "seoDescription": "…", "seoKeywords": "…",\n' +
  '  "suggestedBrand": "…", "suggestedCategory": "…",\n' +
  '  "variants": [{"attrs":[{"label":"رنگ","value":"مشکی"},{"label":"حافظه","value":"256GB"}]}],\n' +
  '  "notes": "یادداشت کوتاه برای مدیر (اختیاری)"\n' +
  "}";

export async function suggestProductCompletion(input: {
  name: string;
  categoryNames?: string[];
  brandNames?: string[];
}): Promise<AIProductCompletion> {
  const user =
    `Product name (admin-typed, do not change): ${input.name.trim()}\n` +
    (input.categoryNames?.length ? `Real store categories (copy exactly if suggesting): ${input.categoryNames.slice(0, 40).join(" | ")}` : "") +
    (input.brandNames?.length ? `\nReal store brands (copy exactly if suggesting): ${input.brandNames.slice(0, 60).join(" | ")}` : "") +
    "\nFill what you RELIABLY know about this exact product. Unknown → {\"found\": false}.";

  const out = await callLLM(COMPLETION_SYSTEM, [{ role: "user", content: user }]);
  if (!out.trim()) throw new Error("پاسخی از موتور هوش مصنوعی دریافت نشد");

  // robust extraction: strip code fences, take the outermost { … }
  const cleaned = out.replace(/```[a-zA-Z]*|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("خروجی مدل قالب JSON معتبر نبود");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("خروجی مدل قالب JSON معتبر نبود");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("خروجی مدل قالب JSON معتبر نبود");
  const r = parsed as Record<string, unknown>;

  if (r.found !== true) return { found: false, notes: typeof r.notes === "string" ? r.notes.slice(0, 300) : undefined };

  const str = (v: unknown, max: number): string | undefined => {
    if (typeof v !== "string") return undefined;
    const s = v.replace(/[<>]/g, "").trim();
    return s ? s.slice(0, max) : undefined;
  };
  const strList = (v: unknown, maxItems: number, maxLen: number): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const items = v
      .map((x) => (typeof x === "string" ? x.replace(/[<>]/g, "").trim().slice(0, maxLen) : ""))
      .filter(Boolean)
      .slice(0, maxItems);
    return items.length ? items : undefined;
  };

  const specifications: { key: string; label: string; value: string }[] | undefined = Array.isArray(r.specifications)
    ? (r.specifications as Record<string, unknown>[])
        .map((row) => ({
          key: String(row?.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60),
          label: String(row?.label ?? "").replace(/[<>]/g, "").trim().slice(0, 100),
          value: String(row?.value ?? "").replace(/[<>]/g, "").trim().slice(0, 400),
        }))
        .filter((row) => row.key && row.label && row.value)
        .slice(0, 24)
    : undefined;

  const variants: { attrs: { label: string; value: string }[] }[] | undefined = Array.isArray(r.variants)
    ? (r.variants as Record<string, unknown>[])
        .map((row) => {
          const attrs = Array.isArray(row?.attrs)
            ? (row.attrs as Record<string, unknown>[])
                .map((a) => ({
                  label: String(a?.label ?? "").replace(/[<>]/g, "").trim().slice(0, 40),
                  value: String(a?.value ?? "").replace(/[<>]/g, "").trim().slice(0, 80),
                }))
                .filter((a) => a.label && a.value)
                .slice(0, 6)
            : [];
          return { attrs };
        })
        .filter((v) => v.attrs.length > 0)
        .slice(0, 10)
    : undefined;

  return {
    found: true,
    shortDescription: str(r.shortDescription, 500),
    description: str(r.description, 8000),
    highlights: strList(r.highlights, 8, 120),
    specifications: specifications && specifications.length ? specifications : undefined,
    tags: strList(r.tags, 12, 50),
    seoTitle: str(r.seoTitle, 200),
    seoDescription: str(r.seoDescription, 400),
    seoKeywords: str(r.seoKeywords, 400),
    suggestedBrand: str(r.suggestedBrand, 80),
    suggestedCategory: str(r.suggestedCategory, 80),
    variants: variants && variants.length ? variants : undefined,
    notes: str(r.notes, 300),
  };
}

// ───────────────── v28: AI SEO completion (admin product form SEO card) ─────────────────

export interface AIProductSeo {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

const SEO_SYSTEM =
  "You are an SEO specialist for a Persian (Farsi) e-commerce store. " +
  "Given a product's REAL data (name, brand, category, short description), write the three " +
  "SEO fields for its product page.\n" +
  "STRICT RULES:\n" +
  "1. Write ONLY from the provided data — NEVER invent specifications, numbers, prices or features that were not given.\n" +
  "2. Natural, fluent Persian marketing copy — no keyword stuffing.\n" +
  "3. seoTitle: max 60 characters, includes the product name + brand/category, attractive.\n" +
  "4. seoDescription: 2 sentences, max 160 characters, includes the product name + main benefit from the given data + a call to action (خرید/مشاهده).\n" +
  "5. seoKeywords: 6-10 relevant Persian keywords separated by Persian comma (،), derived from the given name/brand/category/short description.\n" +
  "Respond ONLY with a strict JSON object, no markdown: " +
  '{"seoTitle":"…","seoDescription":"…","seoKeywords":"…، …، …"}';

export async function suggestProductSeo(input: {
  name: string;
  brandName?: string;
  categoryName?: string;
  shortDescription?: string;
}): Promise<AIProductSeo> {
  const user =
    `Product name (do not change): ${input.name.trim()}` +
    (input.brandName ? `\nBrand: ${input.brandName}` : "") +
    (input.categoryName ? `\nCategory: ${input.categoryName}` : "") +
    (input.shortDescription?.trim() ? `\nShort description: ${input.shortDescription.trim().slice(0, 400)}` : "") +
    "\nWrite the three SEO fields from this data only.";

  const out = await callLLM(SEO_SYSTEM, [{ role: "user", content: user }]);
  if (!out.trim()) throw new Error("پاسخی از موتور هوش مصنوعی دریافت نشد");

  const cleaned = out.replace(/```[a-zA-Z]*|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("خروجی مدل قالب JSON معتبر نبود");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("خروجی مدل قالب JSON معتبر نبود");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("خروجی مدل قالب JSON معتبر نبود");
  const r = parsed as Record<string, unknown>;
  const clean = (v: unknown, max: number): string => {
    const s = typeof v === "string" ? v.replace(/[<>]/g, "").trim() : "";
    return s.slice(0, max);
  };
  const seoTitle = clean(r.seoTitle, 120);
  const seoDescription = clean(r.seoDescription, 400);
  const seoKeywords = clean(r.seoKeywords, 400);
  if (!seoTitle && !seoDescription && !seoKeywords) throw new Error("مدل هیچ فیلد سئویی تولید نکرد");
  return { seoTitle, seoDescription, seoKeywords };
}

/** v20 (v28): turn ANY engine error into a short, actionable Persian
 *  diagnosis — used by the admin connection test AND the system activity
 *  log so the admin always sees an analyzed reason, never a raw stack. */
function classifyEngineError(provider: string, err: unknown): string {
  const gapStatus = String(err).match(/GapGPT API error (\d+)/);
  if (gapStatus) {
    const s = gapStatus[1];
    const why = s === "401" ? "کلید GapGPT نامعتبر است" : s === "429" ? "سهمیه/اعتبار حساب GapGPT تمام شده" : s === "404" ? "مدل GapGPT اشتباه است" : `خطای HTTP ${s} از سرویس GapGPT`;
    return `${why} — کلید و مدل را در تنظیمات هوش مصنوعی بررسی کنید.`;
  }
  const raw = String(err instanceof Error ? err.message : err);
  if (/config|z-ai-config|configuration file/i.test(raw)) {
    return "سرور شما برای موتور داخلی هوش مصنوعی مجاز نیست — فایل پیکربندی موتور (.z-ai-config) روی این سرور یافت نشد. راه‌حل: از تب هوش مصنوعی، سرویس «GapGPT API» را با کلید اختصاصی خودتان انتخاب کنید — پاسخ‌گویی به مشتری‌ها ادامه می‌یابد.";
  }
  /* v34.1: 403/401 from the builtin engine (z-ai-web-dev-sdk gateway) on a
     FOREIGN server — the classic «تست هوش مصنوعی ارور 403 می‌دهد» report.
     Say exactly what it means and how to fix it, instead of dumping the
     raw SDK error. */
  if (/status\s*40[13]|forbidden|unauthorized|\b403\b/i.test(raw)) {
    return (
      "موتور داخلی هوش مصنوعی فقط در محیط دموی ساختِ همین نسخه فعال است و روی سرور شما مجاز نیست (خطای ۴۰۳). " +
      "راه‌حل قطعی: از تنظیمات ← تب «هوش مصنوعی»، سرویس‌دهنده را روی «GapGPT API» بگذارید و کلید API خود را از gapgpt.app بسازید و وارد کنید، سپس دوباره تست بگیرید. " +
      "تا آن موقع ویجت چت فروشگاه به‌صورت خودکار با موتور قطعی داخلی (جستجوی محصول، قیمت، موجودی و پیگیری سفارش) به مشتری‌ها پاسخ می‌دهد."
    );
  }
  if (/timeout|LLM_TIMEOUT|abort/i.test(raw)) {
    return "پاسخ موتور هوش مصنوعی بیش از حد طول کشید (Timeout) — دوباره تلاش کنید.";
  }
  /* v34.1: rate-limited builtin gateway (429) — transient, a retry fixes it */
  if (/status\s*429|too many requests/i.test(raw)) {
    return "موتور هوش مصنوعی موقتاً پردازش‌های زیاد دارد (۴۲۹) — چند لحظه بعد دوباره تست بگیرید.";
  }
  if (/fetch failed|ECONN|ENOTFOUND|network|dns/i.test(raw)) {
    return provider === "gapgpt"
      ? "سرور شما به GapGPT دسترسی ندارد (شبکه/DNS/فایروال) — دسترسی خروجی به api.gapgpt.app لازم است."
      : "ارتباط با موتور داخلی برقرار نشد (شبکه/DNS).";
  }
  return `خطای موتور هوش مصنوعی: ${raw.slice(0, 160)}`;
}

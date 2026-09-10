/**
 * TAJ Electronics — v33 · Telegram bot FLOWS (router + state machine)
 * -----------------------------------------------------------------------
 * handleUpdate() → handleMessage / handlePhoto / handleCallback.
 * Conversation state lives on TelegramSubscriber.state/stateData; the cart
 * on TelegramSubscriber.cart (JSON).
 */

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getPaymentSettings } from "@/lib/settings";
import { computeTotals, deliveryEtaText } from "@/lib/orders";
import { generateOrderNumber } from "@/lib/product";
import { zarinpalRequest, zarinpalGatewayAmount, type ZarinPalConfig } from "@/lib/zarinpal";
import {
  esc,
  fa,
  price,
  kb,
  siteUrl,
  parseCart,
  setCart,
  setState,
  parseStateData,
  upsertSubscriber,
  getBotSettings,
  shortName,
  rateLimit,
  adminChatIds,
  loadLocalImage,
  storeName,
} from "./common";
import { tgSendMessage, tgAnswerCallback, tgDownloadFile, tgSetReplyKeyboard, tgSendChatAction } from "./api";
import {
  sendWelcome,
  sendHelp,
  sendShop,
  sendProductListCards,
  sendProduct,
  sendColorPicker,
  sendCart,
  sendCompare,
  getProduct,
  sendOrderView,
  sendTrackPrompt,
  sendProductList,
} from "./views";
import { handleAITurn, aiIntro } from "./ai-chat";
import { sendTicketsMenu, ticketFlowText, ticketFlowCallback, ticketNeedsAccount } from "./tickets-bot";
import { adminFlowCallback, adminFlowText, adminFlowPhoto } from "./admin";
import { saveImageUpload } from "@/lib/upload";
import type { TelegramSendCtx } from "./view-types";
import { BOT_STATES } from "./types";
import type { InlineButton, TgCallbackQuery, TgMessage, TgUpdate, TgUser } from "./types";
import type { CheckoutForm } from "./flow-types";
import type { TelegramBotSettings, TelegramSubscriber } from "@prisma/client";

/** Alias so flow signatures stay short. */
type Ctx = TelegramSendCtx;

// ─────────────────────────── send-context factory ───────────────────────────

export function makeCtx(token: string, chatId: string, sub: TelegramSubscriber, settings: TelegramBotSettings): TelegramSendCtx {
  return {
    token,
    chatId,
    sub,
    settings,
    cartItems: parseCart(sub),
    send: async (text, keyboard) => {
      await tgSendMessage(token, chatId, text, { keyboard: keyboard ?? undefined });
    },
    edit: async (messageId, text, keyboard) => {
      const { tgEditMessage } = await import("./api");
      const r = await tgEditMessage(token, chatId, messageId, text, { keyboard: keyboard ?? undefined });
      return r.ok;
    },
  };
}

// ─────────────────────────── entry point ───────────────────────────

export async function handleUpdate(token: string, update: TgUpdate): Promise<void> {
  const settings = await getBotSettings();
  const msg = update.message ?? update.edited_message;
  if (msg?.chat?.type && msg.chat.type !== "private") return; // 1:1 DM shop only
  const from: TgUser | undefined = msg?.from ?? update.callback_query?.from;
  const chatId = msg?.chat ? String(msg.chat.id) : update.callback_query ? String(update.callback_query.from.id) : null;
  if (!chatId || !from || from.is_bot) return;

  const sub = await upsertSubscriber(chatId, from);
  if (sub.isBlocked) return;
  const isAdmin = adminChatIds(settings).has(chatId);

  if (update.callback_query) {
    await handleCallback(token, update.callback_query, sub, isAdmin);
    return;
  }
  if (msg) {
    if (msg.photo?.length) {
      await handlePhoto(token, msg, sub, isAdmin);
      return;
    }
    if (msg.text) {
      await handleMessage(token, msg, sub, isAdmin);
      return;
    }
  }
}

// ─────────────────────────── text router ───────────────────────────

/** Reply-keyboard buttons → equivalent command.
 * v35: regexes accept BOTH the old v33 labels (still pinned on users' screens)
 * and the modernized v35 labels — no identifier changes. */
const TEXT_ROUTES: [RegExp, string][] = [
  [/^🛍 (?:کاتالوگ|فروشگاه)$/, "/shop"],
  [/^🔍 جستجو$/, "/search"],
  [/^(?:🧠|🤖) مشاور AI$/, "/ai"],
  [/^🛒 سبد خرید$/, "/cart"],
  [/^📦 پیگیری سفارش$/, "/track"],
  [/^(?:🆘|🎫) پشتیبانی$/, "/tickets"],
  [/^ℹ️ راهنما$/, "/help"],
  [/^🌐 وب‌سایت$/, "/site"],
  [/^🛠 پنل مدیریت$/, "/admin"],
];

/** v35: /start deep-link payload (t.me/<bot>?start=…). p_<productId> opens
 * the product card, c_<categorySlug> the category list — both reuse existing
 * view functions (no new queries); anything else falls back to welcome. */
async function handleStartPayload(token: string, ctx: TelegramSendCtx, sub: TelegramSubscriber, isAdmin: boolean, payload: string): Promise<void> {
  await tgSetReplyKeyboard(token, ctx.chatId, isAdmin);
  const product = payload.match(/^p[_-]([A-Za-z0-9_-]{4,64})$/);
  const category = payload.match(/^c[_-]([A-Za-z0-9_-]{1,64})$/);
  if (product) {
    const p = await getProduct(product[1]);
    if (p) {
      await sendProduct(makeCtx(token, ctx.chatId, sub, ctx.settings), p.id);
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    }
  }
  if (category) {
    await sendProductListCards(makeCtx(token, ctx.chatId, sub, ctx.settings), "cat", category[1], 1);
    await setState(sub, BOT_STATES.IDLE, null);
    return;
  }
  await sendWelcome(makeCtx(token, ctx.chatId, sub, ctx.settings));
  await setState(sub, BOT_STATES.IDLE, null);
}

export async function handleMessage(token: string, msg: TgMessage, sub: TelegramSubscriber, isAdmin: boolean): Promise<void> {
  const ctx = makeCtx(token, String(msg.chat.id), sub, await getBotSettings());
  const raw = (msg.text ?? "").trim();
  if (!raw) return;
  if (raw.length > 1500) {
    await ctx.send("پیام خیلی طولانی است 🙂 لطفاً کوتاه‌تر بفرستید.");
    return;
  }
  if (!rateLimit(`msg:${ctx.chatId}`, 25, 60_000)) {
    await ctx.send("⏳ پیام‌های زیادی فرستادید؛ چند لحظه بعد دوباره تلاش کنید.");
    return;
  }

  // command normalization: /start@MyBot → /start
  const slash = raw.startsWith("/") ? raw.split("@")[0].toLowerCase() : null;

  // v35: deep links — t.me/<bot>?start=p_<productId> / c_<categorySlug>
  // arrive as "/start <payload>" (slash ≠ "/start" there, so match on raw)
  const deepLink = raw.match(/^\/start(?:@[\w]+)?\s+(\S+)\s*$/i);
  if (deepLink) {
    await handleStartPayload(token, ctx, sub, isAdmin, deepLink[1]);
    return;
  }

  // global commands (work in ANY state)
  switch (slash) {
    case "/start":
      await tgSetReplyKeyboard(token, ctx.chatId, isAdmin);
      await sendWelcome(makeCtx(token, ctx.chatId, sub, ctx.settings));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "/shop":
      await sendShop(makeCtx(token, ctx.chatId, sub, ctx.settings));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "/search":
      await ctx.send("🔍 نام یا مدل محصول را بفرستید:", kb([[{ text: "⬅️ انصراف", callback_data: "nx" }]]));
      await setState(sub, BOT_STATES.SEARCH, null);
      return;
    case "/ai":
      await aiIntro(ctx);
      await setState(sub, BOT_STATES.AI, null);
      return;
    case "/cart":
      await sendCart(makeCtx(token, ctx.chatId, sub, ctx.settings));
      return;
    case "/track":
      await sendTrackPrompt(makeCtx(token, ctx.chatId, sub, ctx.settings));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "/tickets":
      await sendTicketsMenu(makeCtx(token, ctx.chatId, sub, ctx.settings));
      return;
    case "/help":
      await sendHelp(makeCtx(token, ctx.chatId, sub, ctx.settings));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "/site":
      await ctx.send(`🌐 فروشگاه را در مرورگر باز کنید:\n${siteUrl()}`);
      return;
    case "/admin":
      if (isAdmin) {
        const { sendAdminMenu } = await import("./admin");
        await sendAdminMenu(makeCtx(token, ctx.chatId, sub, ctx.settings));
      } else {
        await ctx.send("⛔️ این بخش فقط برای مدیران فروشگاه است.");
      }
      return;
    case "/end":
    case "/cancel":
    case "/exit":
      await setState(sub, BOT_STATES.IDLE, null);
      await ctx.send("✅ حالت گفتگو بسته شد. از منوی پایین استفاده کنید.");
      return;
  }

  // reply-keyboard text buttons → route like commands
  for (const [re, cmd] of TEXT_ROUTES) {
    if (re.test(raw)) {
      await handleMessage(token, { ...msg, text: cmd } as TgMessage, sub, isAdmin);
      return;
    }
  }

  // admin-only textual states first (their replies go to the admin console)
  if (isAdmin) {
    const handled = await adminFlowText(ctx, raw);
    if (handled) return;
  }

  // ── state machine ──
  switch (sub.state) {
    case BOT_STATES.AI: {
      // v35: typing indicator while the LLM turn runs (ai-chat.ts untouched)
      void tgSendChatAction(token, ctx.chatId, "typing");
      await handleAITurn(ctx, raw);
      return;
    }
    case BOT_STATES.SEARCH: {
      await doSearch(ctx, raw);
      return;
    }
    case BOT_STATES.COMPARE_SELECT: {
      const data = parseStateData<{ baseId: string }>(sub) ?? { baseId: "" };
      await doSearch(ctx, raw, data.baseId);
      return;
    }
    case BOT_STATES.LINK_PHONE: {
      const phone = raw.replace(/[^\d+]/g, "");
      if (!/^(\+?98|0)?9\d{9}$/.test(phone)) {
        await ctx.send("📱 شماره موبایل معتبر نیست. مثال: <code>09121234567</code> یا «انصراف» را بفرستید.");
        return;
      }
      const normalized = phone.startsWith("+98") ? `0${phone.slice(3)}` : phone.startsWith("98") ? `0${phone.slice(2)}` : phone.startsWith("0") ? phone : `0${phone}`;
      const user = await db.user.findUnique({ where: { phone: normalized } });
      if (!user) {
        await ctx.send("😕 حسابی با این شماره در فروشگاه پیدا نشد.\nاول در وب‌سایت ثبت‌نام کنید یا شماره را دوباره بفرستید.");
        return;
      }
      await ctx.send("🔑 حالا رمز عبور حساب خود را بفرستید:");
      await setState(sub, BOT_STATES.LINK_PASS, { userId: user.id });
      return;
    }
    case BOT_STATES.LINK_PASS: {
      const data = parseStateData<{ userId: string }>(sub);
      const user = data ? await db.user.findUnique({ where: { id: data.userId } }) : null;
      if (!user) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("فرصت اتصال منقضی شد. دوباره از «حساب من» شروع کنید.");
        return;
      }
      const ok = await verifyPassword(raw, user.passwordHash);
      if (!ok) {
        await ctx.send("❌ رمز عبور اشتباه است. دوباره بفرستید یا «انصراف».");
        return;
      }
      if (user.isBlocked) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("⛔️ حساب شما مسدود است. با پشتیبانی تماس بگیرید.");
        return;
      }
      await db.telegramSubscriber.update({ where: { id: sub.id }, data: { userId: user.id } });
      await setState(sub, BOT_STATES.IDLE, null);
      await ctx.send(`✅ حساب <b>${esc(user.firstName ?? "")} ${esc(user.lastName ?? "")}</b> به تلگرام شما متصل شد!\nاز این پس پیگیری سفارش، تیکت و خرید با حساب شما انجام می‌شود. 🎉`);
      return;
    }
    // checkout form steps
    case BOT_STATES.CO_NAME:
    case BOT_STATES.CO_PHONE:
    case BOT_STATES.CO_PROVINCE:
    case BOT_STATES.CO_CITY:
    case BOT_STATES.CO_ADDRESS:
    case BOT_STATES.CO_POSTAL:
    case BOT_STATES.CO_NOTE: {
      if (/^(انصراف|لغو)$/i.test(raw)) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ ثبت سفارش لغو شد. سبد خرید شما حفظ شد.");
        return;
      }
      await checkoutStep(ctx, sub.state, raw);
      return;
    }
    case BOT_STATES.AWAIT_RECEIPT: {
      await ctx.send("📷 لطفاً <b>عکس رسید</b> را بفرستید (فایل عکس)، یا «انصراف» برای لغو.");
      return;
    }
    // ticket flows
    case BOT_STATES.TK_SUBJECT:
    case BOT_STATES.TK_BODY:
    case BOT_STATES.TK_REPLY: {
      await ticketFlowText(ctx, sub.state, raw);
      return;
    }
  }

  // bare order number while idle → tracking shortcut
  if (/^TAJ-[A-Z0-9]{4,}-[A-Z0-9]{2,}$/i.test(raw.trim())) {
    await sendOrderView(makeCtx(token, ctx.chatId, sub, ctx.settings), raw);
    return;
  }

  // default: gentle hint
  await ctx.send(
    "🤔 متوجه نشدم. از منوی پایین استفاده کنید، نام محصول را برای جستجو بفرستید، یا برای گفتگوی هوشمند /ai را بزنید.",
    kb([
      [{ text: "🔍 جستجوی همین عبارت", callback_data: "m:search" }],
      [{ text: "🤖 مشاور AI", callback_data: "m:ai" }, { text: "🛍 فروشگاه", callback_data: "m:shop" }],
    ])
  );
}

// ─────────────────────────── search ───────────────────────────

async function doSearch(ctx: TelegramSendCtx, q: string, compareBaseId?: string): Promise<void> {
  const clean = q.trim().slice(0, 80);
  if (clean.length < 2) {
    await ctx.send("عبارت جستجو خیلی کوتاه است؛ دقیق‌تر بنویسید:");
    return;
  }
  const where = { OR: [{ name: { contains: clean } }, { searchText: { contains: clean } }] };
  const total = await db.product.count({ where: { ...where, status: "PUBLISHED" } });
  if (total === 0) {
    await ctx.send(
      `🔍 برای «${esc(clean)}» محصولی پیدا نکردم.\nمی‌توانید از مشاور هوشمند بپرسید 👇`,
      kb([
        [{ text: "🤖 بپرس از مشاور AI", callback_data: "m:ai" }],
        [{ text: "🛍 فروشگاه", callback_data: "m:shop" }],
      ])
    );
    await setState(ctx.sub, BOT_STATES.IDLE, null);
    return;
  }
  if (compareBaseId) {
    // compare-select mode: results carry ⚖️ buttons
    const items = await db.product.findMany({
      where: { ...where, status: "PUBLISHED" },
      orderBy: { soldCount: "desc" },
      take: 8,
      select: { id: true, name: true, price: true, discountPrice: true },
    });
    const rows: InlineButton[][] = items.map((p) => [
      { text: `⚖️ ${p.name.slice(0, 30)} — ${price(p.discountPrice ?? p.price)}`, callback_data: `cmpx:${p.id}` },
    ]);
    rows.push([{ text: "⬅️ انصراف", callback_data: "nx" }]);
    await ctx.send("برای مقایسه، محصول دوم را انتخاب کنید:", kb(rows));
    return;
  }
  await setState(ctx.sub, BOT_STATES.SEARCH, { q: clean });
  await sendProductList(ctx, "q", clean, 1);
  await ctx.send("👆 برای دیدن جزئیات هر محصول، جستجوی دقیق‌تر بفرستید یا از فروشگاه دسته را انتخاب کنید.");
}

// ─────────────────────────── cart / add-to-cart ───────────────────────────

export async function addToCartFlow(ctx: TelegramSendCtx, productId: string, color?: string): Promise<void> {
  const p = await getProduct(productId);
  if (!p) {
    await ctx.send("😕 محصول پیدا نشد.");
    return;
  }
  if (p.stock <= 0) {
    await ctx.send("❌ این محصول فعلاً ناموجود است.");
    return;
  }
  const eff = p.discountPrice && (!p.discountEndsAt || p.discountEndsAt.getTime() > Date.now()) ? p.discountPrice : null;
  const unit = eff ?? p.price;
  const items = ctx.cartItems;
  const existing = items.findIndex((i) => i.productId === productId && (i.color ?? "") === (color ?? ""));
  if (existing >= 0) items[existing].qty += 1;
  else items.push({ productId, name: p.name, price: unit, qty: 1, color, image: p.mainImage });
  await setCart(ctx.sub, items);
  await ctx.send(
    `✅ <b>${esc(p.name)}</b>${color ? ` (${esc(color)})` : ""} به سبد اضافه شد.`,
    kb([
      [{ text: "🛒 سبد خرید", callback_data: "m:cart" }, { text: "✅ ثبت سفارش", callback_data: "co" }],
      [{ text: "🛍 ادامه خرید", callback_data: "m:shop" }],
    ])
  );
}

// ─────────────────────────── checkout ───────────────────────────

const CO_STEPS: { state: string; next: string; label: string; optional?: boolean; hint?: string }[] = [
  { state: BOT_STATES.CO_NAME, next: BOT_STATES.CO_PHONE, label: "نام و نام خانوادگی گیرنده" },
  { state: BOT_STATES.CO_PHONE, next: BOT_STATES.CO_PROVINCE, label: "شماره موبایل", hint: "مثال: 09121234567" },
  { state: BOT_STATES.CO_PROVINCE, next: BOT_STATES.CO_CITY, label: "استان", hint: "مثال: تهران" },
  { state: BOT_STATES.CO_CITY, next: BOT_STATES.CO_ADDRESS, label: "شهر" },
  { state: BOT_STATES.CO_ADDRESS, next: BOT_STATES.CO_POSTAL, label: "نشانی کامل پستی" },
  { state: BOT_STATES.CO_POSTAL, next: BOT_STATES.CO_NOTE, label: "کد پستی", optional: true, hint: "۱۰ رقم — با دکمه «بدون کد پستی» رد شوید" },
  { state: BOT_STATES.CO_NOTE, next: "__PAY__", label: "یادداشت سفارش", optional: true, hint: "اختیاری — با دکمه «بدون یادداشت» رد شوید" },
];

async function checkoutStep(ctx: TelegramSendCtx, state: string, value: string): Promise<void> {
  const step = CO_STEPS.find((s) => s.state === state);
  if (!step) {
    await setState(ctx.sub, BOT_STATES.IDLE, null);
    return;
  }
  const form = parseStateData<CheckoutForm>(ctx.sub) ?? {};
  // validation
  if (state === BOT_STATES.CO_PHONE) {
    const phone = value.replace(/[^\d+]/g, "");
    if (!/^(\+?98|0)?9\d{9}$/.test(phone)) {
      await ctx.send("📱 شماره معتبر نیست. مثال: <code>09121234567</code>");
      return;
    }
    value = phone.startsWith("+98") ? `0${phone.slice(3)}` : phone.startsWith("98") ? `0${phone.slice(2)}` : phone.startsWith("0") ? phone : `0${phone}`;
  }
  if (state === BOT_STATES.CO_POSTAL && !/^\d{10}$/.test(value.replace(/\D/g, ""))) {
    await ctx.send("📮 کد پستی باید ۱۰ رقم باشد (یا «بدون کد پستی» را بزنید).");
    return;
  }
  if (state === BOT_STATES.CO_NAME && value.length < 3) {
    await ctx.send("✍️ نام کامل‌تری بنویسید (حداقل ۳ حرف).");
    return;
  }
  if (state === BOT_STATES.CO_ADDRESS && value.length < 10) {
    await ctx.send("🏠 نشانی کامل‌تری بنویسید (خیابان، پلاک و…).");
    return;
  }

  // save this field
  const fieldMap: Record<string, keyof CheckoutForm> = {
    [BOT_STATES.CO_NAME]: "firstName",
    [BOT_STATES.CO_PHONE]: "phone",
    [BOT_STATES.CO_PROVINCE]: "province",
    [BOT_STATES.CO_CITY]: "city",
    [BOT_STATES.CO_ADDRESS]: "address",
    [BOT_STATES.CO_POSTAL]: "postalCode",
    [BOT_STATES.CO_NOTE]: "note",
  };
  const field = fieldMap[state];
  if (field === "firstName") {
    const parts = value.split(/\s+/);
    form.firstName = parts.shift();
    form.lastName = parts.join(" ") || "—";
  } else {
    (form as Record<string, unknown>)[field] = value;
  }

  // next step
  if (step.next === "__PAY__") {
    await setState(ctx.sub, BOT_STATES.IDLE, form);
    await askPaymentMethod(ctx, form);
    return;
  }
  const nextStep = CO_STEPS.find((s) => s.state === step.next)!;
  const rows: InlineButton[][] = [];
  if (nextStep.optional) rows.push([{ text: `⏭ بدون ${nextStep.label}`, callback_data: "coskip" }]);
  rows.push([{ text: "⬅️ انصراف", callback_data: "nx" }]);
  // v35: numbered step CTA («قدم N از ۷» — same Persian-digit style as step 1)
  const nextIdx = CO_STEPS.findIndex((s) => s.state === nextStep.state) + 1;
  await ctx.send(`✅ ثبت شد.\n\n<strong>قدم ${fa(nextIdx)} از ${fa(CO_STEPS.length)} — ${nextStep.label}:</strong>\n${nextStep.hint ?? ""}`, kb(rows));
  await setState(ctx.sub, nextStep.state, form);
}

export async function startCheckout(ctx: TelegramSendCtx): Promise<void> {
  if (ctx.cartItems.length === 0) {
    await ctx.send("🛒 سبد خرید خالی است. اول محصول اضافه کنید.", kb([[{ text: "🛍 فروشگاه", callback_data: "m:shop" }]]));
    return;
  }
  const linked = ctx.sub.userId ? await db.user.findUnique({ where: { id: ctx.sub.userId } }) : null;
  const form: CheckoutForm = {};
  if (linked) {
    form.firstName = linked.firstName ?? undefined;
    form.lastName = linked.lastName ?? undefined;
    form.phone = linked.phone ?? undefined;
  }
  const subtotal = ctx.cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const rows: InlineButton[][] = [
    [{ text: "۱) ➡️ شروع ثبت سفارش", callback_data: "co" }],
    [{ text: "⬅️ بازگشت به سبد", callback_data: "m:cart" }],
  ];
  await ctx.send(
    [
      "🧾 <b>ثبت سفارش</b>",
      "",
      `🛒 ${fa(ctx.cartItems.length)} قلم · جمع: <b>${price(subtotal)}</b>`,
      linked
        ? `👤 با حساب «${esc(shortName(ctx.sub))}» (${esc(linked.phone ?? "")})`
        : "👤 بدون حساب سایت (خرید مهمان — یا از «حساب من» وصل شوید)",
      "",
      "چند قدم کوتاه اطلاعات ارسال را می‌پرسیم (حدود ۱ دقیقه).",
    ].join("\n"),
    kb(rows)
  );
}

async function askPaymentMethod(ctx: TelegramSendCtx, form: CheckoutForm): Promise<void> {
  const payment = await getPaymentSettings();
  const methods: InlineButton[] = [];
  if (payment.zarinpalEnabled && payment.zarinpalMerchantId) methods.push({ text: "💳 پرداخت آنلاین (زرین‌پال)", callback_data: "copay:ZARINPAL" });
  if (payment.c2cEnabled) methods.push({ text: "🧾 پرداخت کارت‌به‌کارت", callback_data: "copay:CARD_TO_CARD" });
  if (methods.length === 0) {
    await ctx.send("⛔️ فعلاً هیچ روش پرداختی در فروشگاه فعال نیست. با پشتیبانی تماس بگیرید (از منوی پایین).");
    return;
  }
  const subtotal = ctx.cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const rows: InlineButton[][] = [methods, [{ text: "⬅️ انصراف", callback_data: "nx" }]];
  await ctx.send(
    [
      "🧾 <b>خلاصه سفارش</b>",
      "",
      `👤 ${esc(form.firstName ?? "")} ${esc(form.lastName ?? "")}`,
      `📱 ${esc(form.phone ?? "")}`,
      `📍 ${esc(form.province ?? "")} — ${esc(form.city ?? "")}`,
      `🏠 ${esc(form.address ?? "")}`,
      form.postalCode ? `📮 ${esc(form.postalCode)}` : null,
      "",
      `🛒 جمع اقلام: ${price(subtotal)}`,
      "🚚 هزینه ارسال در مرحله بعد محاسبه و نمایش داده می‌شود",
      "",
      "<strong>روش پرداخت را انتخاب کنید:</strong>",
    ]
      .filter((l) => l !== null)
      .join("\n"),
    kb(rows)
  );
}

export async function finalizeOrder(ctx: TelegramSendCtx, method: "ZARINPAL" | "CARD_TO_CARD"): Promise<void> {
  const form = parseStateData<CheckoutForm>(ctx.sub);
  if (!form || !form.firstName || !form.phone || !form.address) {
    await ctx.send("اطلاعات سفارش کامل نیست. از «🛒 سبد خرید → ثبت سفارش» دوباره شروع کنید.");
    return;
  }
  const items = ctx.cartItems;
  if (items.length === 0) {
    await ctx.send("🛒 سبد خرید خالی است.");
    return;
  }
  for (const it of items) {
    const p = await db.product.findUnique({ where: { id: it.productId }, select: { stock: true, name: true } });
    if (!p || p.stock < it.qty) {
      await ctx.send(`❌ موجودی «${esc(it.name)}» کافی نیست (یا حذف شده). سبد را اصلاح کنید.`);
      await sendCart(ctx);
      return;
    }
  }

  // totals: same engine as the website (coupon via linked user, shipping flat)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const linkedUser = ctx.sub.userId ? await db.user.findUnique({ where: { id: ctx.sub.userId } }) : null;
  const delivery = (await db.deliveryMethod.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })) ?? null;
  const totals = await computeTotals(subtotal, null, linkedUser, false, delivery ? delivery.cost : null);
  const orderNumber = generateOrderNumber();

  const order = await db.order.create({
    data: {
      orderNumber,
      userId: ctx.sub.userId,
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      paymentMethod: method,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingCost: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      firstName: form.firstName,
      lastName: form.lastName ?? "—",
      phone: form.phone,
      email: null,
      province: form.province ?? "—",
      city: form.city ?? "—",
      address: form.address,
      postalCode: form.postalCode ?? null,
      note: (form.note ? form.note + " " : "") + `[سفارش از ربات تلگرام · مشترک ${ctx.sub.chatId}]`,
      deliveryMethodId: delivery?.id ?? null,
      deliveryMethodName: delivery?.name ?? null,
      deliveryType: delivery?.type ?? null,
      deliveryEta: delivery ? deliveryEtaText(delivery.etaMinDays, delivery.etaMaxDays) : null,
      items: {
        create: items.map((it) => ({
          productId: it.productId,
          name: it.name,
          sku: `TG-${ctx.sub.chatId.slice(-6)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          image: it.image ?? null,
          unitPrice: it.price,
          discount: 0,
          quantity: it.qty,
          color: it.color ?? null,
          total: it.price * it.qty,
        })),
      },
    },
  });

  // snapshot the cart ON the order then empty it (order history keeps everything)
  await setCart(ctx.sub, []);
  const ctx2 = makeCtx(ctx.token, ctx.chatId, ctx.sub, ctx.settings);

  if (method === "ZARINPAL") {
    const payment = await getPaymentSettings();
    const zcfg: ZarinPalConfig = {
      merchantId: payment.zarinpalMerchantId ?? "",
      sandbox: payment.zarinpalSandbox,
      currency: payment.zarinpalCurrency === "IRT" ? "IRT" : "IRR",
      referrerId: payment.zarinpalReferrer || undefined,
    };
    const gatewayAmount = zarinpalGatewayAmount(order.total, zcfg.currency);
    const callbackUrl = `${siteUrl()}/api/payments/zarinpal/callback?order=${order.orderNumber}`;
    const zres = await zarinpalRequest(zcfg, {
      amount: gatewayAmount,
      callbackUrl,
      description: `سفارش ${order.orderNumber} — ربات تلگرام`,
      mobile: form.phone,
      orderId: order.orderNumber,
    });
    await db.payment.create({
      data: {
        orderId: order.id,
        gateway: "ZARINPAL",
        amount: gatewayAmount,
        authority: zres.authority ?? null,
        status: zres.success ? "PENDING" : "FAILED",
        raw: JSON.stringify(zres.raw ?? {}).slice(0, 2000),
      },
    });
    if (zres.success && zres.paymentUrl) {
      await ctx2.send(
        [
          `✅ <b>سفارش شما با موفقیت ثبت شد!</b>`,
          "",
          `🧾 شناسه پیگیری: <code>${esc(order.orderNumber)}</code>`,
          `💰 مبلغ قابل پرداخت: <b>${price(order.total)}</b>`,
          "",
          "💳 برای پرداخت، روی دکمه زیر بزنید تا به درگاه زرین‌پال بروید:",
          "پس از پرداخت، تأییدیه همین‌جا برایتان ارسال می‌شود. 🙏",
        ].join("\n"),
        kb([
          [{ text: "💳 پرداخت آنلاین (زرین‌پال)", url: zres.paymentUrl }],
          [{ text: "📦 پیگیری سفارش", callback_data: `or:${order.orderNumber}` }],
          [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }],
        ])
      );
    } else {
      await ctx2.send(
        [
          `⚠️ سفارش <code>${esc(order.orderNumber)}</code> ثبت شد اما درگاه پرداخت موقتاً پاسخ نداد.`,
          `مبلغ: <b>${price(order.total)}</b>`,
          "از بخش پیگیری سفارش دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
        ].join("\n"),
        kb([[{ text: "📦 پیگیری سفارش", callback_data: `or:${order.orderNumber}` }]])
      );
    }
    return;
  }

  // CARD_TO_CARD
  const payment = await getPaymentSettings();
  const masked = (payment.c2cCardNumber ?? "").replace(/\s/g, "");
  const pretty = masked.replace(/(\d{4})(?=\d)/g, "$1 ");
  await ctx2.send(
    [
      `✅ <b>سفارش شما با موفقیت ثبت شد!</b>`,
      "",
      `🧾 شناسه پیگیری: <code>${esc(order.orderNumber)}</code>`,
      `💰 مبلغ قابل واریز: <b>${price(order.total)}</b>`,
      "",
      "🏦 <b>اطلاعات کارت به کارت:</b>",
      `<code>${esc(pretty || "—")}</code>`,
      payment.c2cCardHolder ? `👤 به نام: ${esc(payment.c2cCardHolder)}` : null,
      payment.c2cIBAN ? `💳 شبا: <code>${esc(payment.c2cIBAN)}</code>` : null,
      "",
      "📷 پس از واریز، <b>عکس رسید</b> را همین‌جا در همین چت بفرستید تا مدیر بررسی و سفارش شما را تأیید کند.",
      esc(payment.c2cInstructions ?? ""),
    ]
      .filter((l) => l !== null)
      .join("\n"),
    kb([[{ text: "📦 پیگیری سفارش", callback_data: `or:${order.orderNumber}` }], [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]])
  );
  await setState(ctx.sub, BOT_STATES.AWAIT_RECEIPT, { orderId: order.id, orderNumber });
}

// ─────────────────────────── photo (card-to-card receipt) ───────────────────────────

export async function handlePhoto(token: string, msg: TgMessage, sub: TelegramSubscriber, isAdmin: boolean): Promise<void> {
  const ctx = makeCtx(token, String(msg.chat.id), sub, await getBotSettings());

  // admin photos (e.g. broadcast with image) — future feature; route to admin
  if (isAdmin) {
    const handled = await adminFlowPhoto(ctx, msg);
    if (handled) return;
  }

  const state = sub.state;
  const data = parseStateData<{ orderId: string; orderNumber: string }>(sub);

  if (state !== BOT_STATES.AWAIT_RECEIPT || !data?.orderId) {
    await ctx.send("📷 عکس دریافت شد؛ اگر می‌خواهید رسید کارت به کارت بفرستید، ابتدا سفارش ثبت کنید و منتظر پیام درخواست رسید بمانید.");
    return;
  }

  const fileId = msg.photo?.[msg.photo.length - 1]?.file_id;
  if (!fileId) return;
  const order = await db.order.findUnique({ where: { id: data.orderId }, include: { c2cPayment: true } });
  if (!order) {
    await setState(sub, BOT_STATES.IDLE, null);
    await ctx.send("سفارش مربوطه پیدا نشد.");
    return;
  }
  if (order.c2cPayment) {
    await ctx.send("✅ رسید این سفارش قبلاً ثبت و در انتظار بررسی مدیر است.");
    return;
  }

  await ctx.send("⏳ در حال دریافت عکس رسید…");
  const dl = await tgDownloadFile(token, fileId);
  if (!dl.ok || !dl.buffer) {
    await ctx.send("⚠️ دریافت عکس از تلگرام ناموفق بود. لطفاً دوباره بفرستید.");
    return;
  }
  try {
    const file = new File([new Uint8Array(dl.buffer)], "receipt.jpg", { type: "image/jpeg" });
    const saved = await saveImageUpload(file, "receipts");
    if (!saved.ok) {
      await ctx.send(`⚠️ ذخیره عکس ناموفق بود: ${esc(saved.message)}`);
      return;
    }
    await db.cardToCardPayment.create({
      data: {
        orderId: order.id,
        userId: ctx.sub.userId,
        senderName: shortName(sub),
        senderPhone: order.phone,
        senderCard: "رسید تلگرام",
        amount: order.total,
        paidAt: new Date(),
        receiptImage: saved.url,
        status: "PENDING",
        note: `ارسال شده از ربات تلگرام (چت ${ctx.sub.chatId})`,
      },
    });
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "VERIFYING" } });
    await setState(sub, BOT_STATES.IDLE, null);
    await ctx.send(
      [
        "✅ <b>رسید شما دریافت و ثبت شد!</b>",
        "",
        `🧾 سفارش: <code>${esc(order.orderNumber)}</code>`,
        "🕐 پس از بررسی و تأیید مدیر، نتیجه همین‌جا اعلام و سفارش وارد پردازش می‌شود.",
        "🙏 از صبر و شکیبایی شما سپاسگزاریم.",
      ].join("\n"),
      kb([[{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]])
    );
    // notify the admins (receipt card with approve/reject)
    const { notifyAdminsNewReceipt } = await import("./watcher");
    await notifyAdminsNewReceipt(order.id);
  } catch (e) {
    console.error("[TG receipt]", e);
    await ctx.send("⚠️ خطایی در ثبت رسید پیش آمد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.");
  }
}

// ─────────────────────────── callback router ───────────────────────────

/** v35: heads the callback router actually handles. Used to decide whether the
 * early spinner-stop answer is safe — unknown heads instead get a friendly
 * Persian toast + hint message (never silent). Keep in sync with the switch
 * in handleCallback below. */
const KNOWN_CALLBACK_HEADS = new Set([
  "a", "m", "p", "pa", "pc", "cr", "cmp", "cmpx", "cq", "crm",
  "cartclear", "co", "coskip", "couseaccount", "copay", "or", "nx",
  "t", "tr", "tknew", "link",
]);

export async function handleCallback(token: string, cb: TgCallbackQuery, sub: TelegramSubscriber, isAdmin: boolean): Promise<void> {
  const data = cb.data ?? "";
  const chatId = String(cb.from.id);
  const ctx = makeCtx(token, chatId, sub, await getBotSettings());
  const [head, a, b, c] = data.split(":");
  // stop the spinner (fire and forget) for known heads; unknown heads get
  // a Persian toast + hint message in the fall-through branch below
  if (KNOWN_CALLBACK_HEADS.has(head)) void tgAnswerCallback(token, cb.id);

  try {
    // admin namespace
    if (head === "a") {
      if (!isAdmin) {
        await ctx.send("⛔️ فقط مدیران به این بخش دسترسی دارند.");
        return;
      }
      await adminFlowCallback(ctx, data);
      return;
    }

    switch (head) {
      case "m":
        return void (await menuCallback(ctx, sub, a, b, c));
      case "p":
        return void (await sendProduct(ctx, a));
      case "pa":
        return void (await addToCartFlow(ctx, a, undefined));
      case "pc":
        return void (await sendColorPicker(ctx, a));
      case "cr":
        return void (await addWithColor(ctx, a, Number(b)));
      case "cmp":
        return void (await startCompare(ctx, a));
      case "cmpx":
        return void (await runCompare(ctx, a));
      case "cq": {
        const idx = Number(a);
        const dir = b === "+" ? 1 : -1;
        const items = ctx.cartItems;
        if (items[idx]) {
          items[idx].qty = Math.min(10, Math.max(1, items[idx].qty + dir));
          await setCart(sub, items);
        }
        await sendCart(makeCtx(token, chatId, sub, ctx.settings));
        return;
      }
      case "crm": {
        const idx = Number(a);
        const items = ctx.cartItems;
        if (items[idx]) {
          items.splice(idx, 1);
          await setCart(sub, items);
        }
        await sendCart(makeCtx(token, chatId, sub, ctx.settings));
        return;
      }
      case "cartclear":
        await setCart(sub, []);
        await ctx.send("🧹 سبد خرید خالی شد.");
        return;
      case "co":
        return void (await checkoutStart(ctx, sub));
      case "coskip":
        return void (await checkoutSkip(ctx, sub));
      case "couseaccount":
        return void (await checkoutUseAccount(ctx, sub));
      case "copay":
        return void (await finalizeOrder(ctx, a as "ZARINPAL" | "CARD_TO_CARD"));
      case "or":
        return void (await sendOrderView(ctx, a));
      case "nx":
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ عملیات لغو شد. از منوی پایین استفاده کنید.");
        return;
      case "t":
      case "tr":
      case "tknew":
        return void (await ticketFlowCallback(ctx, head, a));
      case "link":
        await ctx.send("📱 شماره موبایل حساب فروشگاه خود را بفرستید:\n(مثال: <code>09121234567</code>)", kb([[{ text: "⬅️ انصراف", callback_data: "nx" }]]));
        await setState(sub, BOT_STATES.LINK_PHONE, null);
        return;
    }
    // unknown / expired button — toast + hint message instead of silence
    await tgAnswerCallback(token, cb.id, "این دکمه منقضی شده — /start را بزنید");
    await ctx.send("🤔 این دکمه منقضی شده است. /start بزنید تا منوی تازه بیاید.");
  } catch (e) {
    console.error("[TG callback]", data, e);
    await ctx.send("⚠️ خطایی پیش آمد. دوباره تلاش کنید.");
  }
}

async function menuCallback(ctx: TelegramSendCtx, sub: TelegramSubscriber, a: string, b: string | undefined, c: string | undefined): Promise<void> {
  switch (a) {
    case "main":
      await sendWelcome(ctx);
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "shop":
    case "cats":
      await sendShop(ctx);
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "cat":
      await sendProductListCards(ctx, "cat", b, Number(c ?? 1));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "all":
    case "new":
    case "disc":
    case "spec":
    case "feat":
      await sendProductListCards(ctx, a as "all", undefined, Number(b ?? 1));
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "q": {
      const data = parseStateData<{ q: string }>(sub);
      if (data?.q) await sendProductListCards(ctx, "q", data.q, Number(b ?? 1));
      else await ctx.send("🔍 عبارت جستجو را بفرستید:");
      return;
    }
    case "ai":
      await aiIntro(ctx);
      await setState(sub, BOT_STATES.AI, null);
      return;
    case "search":
      await ctx.send("🔍 نام یا مدل محصول را بفرستید:", kb([[{ text: "⬅️ انصراف", callback_data: "nx" }]]));
      await setState(sub, BOT_STATES.SEARCH, null);
      return;
    case "cmp":
      // v35: menu-level compare entry — the actual side-by-side starts from a
      // product card («⚖️ مقایسه با…»); guide the user to pick a product first
      await ctx.send(
        "🆚 <b>مقایسه محصولات</b>\nیک محصول را انتخاب کنید و در صفحه آن دکمه «⚖️ مقایسه با…» را بزنید تا با محصول دیگری مقایسه شود.",
        kb([
          [{ text: "🗂 همه محصولات", callback_data: "m:all:1" }, { text: "🔍 جستجو", callback_data: "m:search" }],
          [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }],
        ])
      );
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "cart":
      await sendCart(ctx);
      return;
    case "track":
      await sendTrackPrompt(ctx);
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "tickets":
      await sendTicketsMenu(ctx);
      return;
    case "help":
      await sendHelp(ctx);
      await setState(sub, BOT_STATES.IDLE, null);
      return;
    case "site":
      await ctx.send(`🌐 فروشگاه را در مرورگر باز کنید:\n${siteUrl()}`);
      return;
    case "account": {
      const linked = sub.userId ? await db.user.findUnique({ where: { id: sub.userId } }) : null;
      if (linked) {
        await ctx.send(
          [
            "👤 <b>حساب متصل شما</b>",
            `نام: ${esc(linked.firstName ?? "")} ${esc(linked.lastName ?? "")}`,
            `موبایل: ${esc(linked.phone ?? "")}`,
            linked.email ? `ایمیل: ${esc(linked.email)}` : null,
          ]
            .filter((l) => l !== null)
            .join("\n"),
          kb([[{ text: "🔌 قطع اتصال", callback_data: "unlink" }, { text: "⬅️ منوی اصلی", callback_data: "m:main" }]])
        );
      } else {
        await ctx.send(
          ["👤 <b>اتصال حساب فروشگاه</b>", "", "با اتصال حساب: پیگیری سفارش‌های خودتان، ثبت و پیگیری تیکت و خرید با حساب شما انجام می‌شود.", "", "📱 شماره موبایل حساب + رمز عبور لازم است."].join("\n"),
          kb([[{ text: "🔌 اتصال حساب", callback_data: "link" }], [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]])
        );
        await setState(sub, BOT_STATES.LINK_PHONE, null);
      }
      return;
    }
    case "unlink":
      await db.telegramSubscriber.update({ where: { id: sub.id }, data: { userId: null } });
      await ctx.send("🔌 اتصال حساب قطع شد.");
      return;
    case "notif": {
      const next = !sub.notifyNewProducts;
      await db.telegramSubscriber.update({ where: { id: sub.id }, data: { notifyNewProducts: next } });
      await ctx.send(
        next
          ? "🔔 اطلاع‌رسانی محصولات جدید: <b>روشن</b> — با هر محصول جدید پیام می‌گیرید."
          : "🔕 اطلاع‌رسانی محصولات جدید: <b>خاموش</b> — دیگر پیام محصول جدید نمی‌گیرید.",
        kb([[{ text: next ? "🔕 خاموش کردن" : "🔔 روشن کردن", callback_data: "m:notif" }]])
      );
      return;
    }
    default:
      await ctx.send("🤔 دکمه نامعتبر. /start بزنید.");
  }
}

async function checkoutStart(ctx: TelegramSendCtx, sub: TelegramSubscriber): Promise<void> {
  if (ctx.cartItems.length === 0) {
    await ctx.send("🛒 سبد خرید خالی است.", kb([[{ text: "🛍 فروشگاه", callback_data: "m:shop" }]]));
    return;
  }
  const form: CheckoutForm = {};
  const linked = sub.userId ? await db.user.findUnique({ where: { id: sub.userId } }) : null;
  if (linked) {
    form.firstName = linked.firstName ?? undefined;
    form.lastName = linked.lastName ?? undefined;
    form.phone = linked.phone ?? undefined;
  }
  const first = CO_STEPS[0];
  const rows: InlineButton[][] = [];
  if (linked?.phone) {
    rows.push([{ text: "👤 از اطلاعات حساب من استفاده کن", callback_data: "couseaccount" }]);
  }
  rows.push([{ text: "⬅️ انصراف", callback_data: "nx" }]);
  await ctx.send(
    `📝 <strong>قدم ۱ از ۷ — ${first.label}:</strong>\n${first.hint ?? ""}`,
    kb(rows)
  );
  await setState(sub, first.state, form);
}

/** «از اطلاعات حساب من استفاده کن» — prefill name/phone from the linked
 * account and jump straight to the province step. */
async function checkoutUseAccount(ctx: TelegramSendCtx, sub: TelegramSubscriber): Promise<void> {
  const linked = sub.userId ? await db.user.findUnique({ where: { id: sub.userId } }) : null;
  if (!linked?.phone) {
    await ctx.send("حسابی متصل نیست — اطلاعات را دستی وارد کنید:");
    return;
  }
  const form: CheckoutForm = {
    firstName: linked.firstName ?? "—",
    lastName: linked.lastName ?? "—",
    phone: linked.phone,
  };
  const step = CO_STEPS.find((st) => st.state === BOT_STATES.CO_PROVINCE)!;
  const stepIdx = CO_STEPS.findIndex((st) => st.state === step.state) + 1;
  await ctx.send(
    `✅ نام و موبایل از حساب شما پر شد.\n\n<strong>قدم ${fa(stepIdx)} از ${fa(CO_STEPS.length)} — ${step.label}:</strong>\n${step.hint ?? ""}`,
    kb([[{ text: "⬅️ انصراف", callback_data: "nx" }]])
  );
  await setState(sub, step.state, form);
}

async function checkoutSkip(ctx: TelegramSendCtx, sub: TelegramSubscriber): Promise<void> {
  const state = sub.state;
  const step = CO_STEPS.find((s) => s.state === state);
  if (!step || !step.optional) {
    await ctx.send("این قدم قابل رد شدن نیست.");
    return;
  }
  // proceed without the optional field
  const nextStep = CO_STEPS.find((s) => s.state === step.next);
  if (!nextStep) {
    const form = parseStateData<CheckoutForm>(sub) ?? {};
    await askPaymentMethod(ctx, form);
    await setState(sub, BOT_STATES.IDLE, form);
    return;
  }
  const rows: InlineButton[][] = [];
  if (nextStep.optional) rows.push([{ text: `⏭ بدون ${nextStep.label}`, callback_data: "coskip" }]);
  rows.push([{ text: "⬅️ انصراف", callback_data: "nx" }]);
  const nextIdx = CO_STEPS.findIndex((s) => s.state === nextStep.state) + 1;
  await ctx.send(`✅ رد شد.\n\n<strong>قدم ${fa(nextIdx)} از ${fa(CO_STEPS.length)} — ${nextStep.label}:</strong>\n${nextStep.hint ?? ""}`, kb(rows));
  await setState(sub, nextStep.state, parseStateData<CheckoutForm>(sub) ?? {});
}

async function addWithColor(ctx: TelegramSendCtx, productId: string, colorIdx: number): Promise<void> {
  const p = await getProduct(productId);
  if (!p) {
    await ctx.send("😕 محصول پیدا نشد.");
    return;
  }
  const colors = (await import("./views")).parseColors(p);
  const color = colors[colorIdx] ?? colors[0];
  await addToCartFlow(ctx, productId, color);
}

async function startCompare(ctx: TelegramSendCtx, productId: string): Promise<void> {
  const p = await getProduct(productId);
  if (!p) {
    await ctx.send("😕 محصول پیدا نشد.");
    return;
  }
  await ctx.send(
    [`⚖️ <b>مقایسه محصولات</b>`, "", `محصول پایه: <b>${esc(p.name)}</b> (${price(p.discountPrice ?? p.price)})`, "", "حالا نام یا مدل <b>محصول دوم</b> را بفرستید تا نتیجه مقایسه را ببینید:"].join("\n"),
    kb([[{ text: "⬅️ انصراف", callback_data: `p:${productId}` }]])
  );
  await setState(ctx.sub, BOT_STATES.COMPARE_SELECT, { baseId: productId });
}

async function runCompare(ctx: TelegramSendCtx, otherId: string): Promise<void> {
  const data = parseStateData<{ baseId: string }>(ctx.sub);
  await setState(ctx.sub, BOT_STATES.IDLE, null);
  const baseId = data?.baseId;
  if (!baseId) {
    await ctx.send("🤔 محصول پایه مشخص نیست. دوباره از صفحه محصول «مقایسه با…» را بزنید.");
    return;
  }
  const [p1, p2] = await Promise.all([getProduct(baseId), getProduct(otherId)]);
  if (!p1 || !p2) {
    await ctx.send("😕 یکی از محصولات پیدا نشد.");
    return;
  }
  await sendCompare(ctx, p1, p2);
}

// re-export for admin/tickets flows
export { ticketNeedsAccount, storeName };

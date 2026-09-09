/**
 * TAJ Electronics — v33 · Telegram bot VIEWS
 * -----------------------------------------------------------------------
 * Pure renderers: every list/card here turns a Prisma row into Telegram
 * HTML text + inline keyboard. Flows (flows.ts / admin.ts) call them.
 *
 * Callback-data grammar (≤64 bytes):
 *   m:main m:shop m:cats:<pg> m:cat:<slug>:<pg> m:all:<pg> m:new:<pg>
 *   m:disc:<pg> m:spec:<pg> m:feat:<pg> m:ai m:search m:cart m:track
 *   m:tickets m:help m:site m:notif
 *   p:<productId> pa:<productId> pc:<productId> cr:<productId>:<colorIdx>
 *   cmp:<productId>
 *   cq:<idx>:+ / cq:<idx>:- / crm:<idx>
 *   co copay:<ZARINPAL|CARD_TO_CARD>
 *   t:<ticketId> tr:<ticketId> tknew
 *   or:<orderNumber> (user tracking detail)
 *   a:menu a:stats a:orders:<filter>:<pg> a:ord:<orderId> a:st:<orderId>:<STATUS>
 *   a:note:<orderId> a:c2c:<pg> a:c2cok:<payId> a:c2cno:<payId>
 *   a:tickets:<pg> a:tk:<ticketId> a:tr:<ticketId> a:bc
 *   nx (cancel current flow)
 */

import { db } from "@/lib/db";
import { esc, fa, price, kb, siteUrl, loadLocalImage, storeName, fmtDate } from "./common";
import { tgSendPhoto } from "./api";
import type { InlineButton } from "./types";
import type { TelegramSendCtx } from "./view-types";
import { ORDER_STATUS_EMOJI, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "./types";
import type { Order, Prisma } from "@prisma/client";

const PER_PAGE = 6;

// ─────────────────────────── product queries ───────────────────────────

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  discountPrice: true,
  discountEndsAt: true,
  stock: true,
  shortDescription: true,
  mainImage: true,
  rating: true,
  reviewCount: true,
  soldCount: true,
  featured: true,
  isSpecial: true,
  colors: true,
  specifications: true,
  brand: { select: { name: true } },
  category: { select: { name: true, slug: true } },
} as const;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export type { ProductRow };

function effPrice(p: ProductRow): number {
  const live = p.discountPrice && (!p.discountEndsAt || p.discountEndsAt.getTime() > Date.now()) ? p.discountPrice : null;
  return live ?? p.price;
}

function liveDiscount(p: ProductRow): number | null {
  if (!p.discountPrice) return null;
  if (p.discountEndsAt && p.discountEndsAt.getTime() <= Date.now()) return null;
  return p.discountPrice;
}

export async function countProducts(where: Prisma.ProductWhereInput): Promise<number> {
  return db.product.count({ where: { ...where, status: "PUBLISHED" } });
}

export async function listProducts(where: Prisma.ProductWhereInput, page: number): Promise<ProductRow[]> {
  return db.product.findMany({
    where: { ...where, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    select: productSelect,
  });
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  return db.product.findFirst({ where: { id, status: "PUBLISHED" }, select: productSelect });
}

// ─────────────────────────── main menu / welcome / help ───────────────────────────

export async function sendWelcome(ctx: TelegramSendCtx) {
  const s = await storeName();
  const custom = ctx.settings.welcomeText?.trim();
  const name = esc(ctx.sub.firstName || ctx.sub.username || "دوست");
  const text = custom
    ? custom.replace(/\{name\}/g, name).replace(/\{store\}/g, esc(s))
    : [
        `👑 <b>به ${esc(s)} خوش آمدید، ${name}!</b>`,
        "",
        "🛍 فروشگاه کامل، همین‌جا داخل تلگرام:",
        "• 📱 کاتالوگ محصولات و جدیدترین‌ها",
        "• 🔍 جستجو و 🤖 مشاور خرید هوش مصنوعی",
        "• ⚖️ مقایسه محصولات",
        "• 🛒 سبد خرید و پرداخت (زرین‌پال / کارت به کارت)",
        "• 📦 پیگیری سفارش و 🎫 پشتیبانی",
        "",
        "از منوی پایین استفاده کنید یا 👇",
      ].join("\n");
  await ctx.send(
    text,
    kb([
      [{ text: "🛍 فروشگاه", callback_data: "m:shop" }, { text: "🆕 تازه‌ها", callback_data: "m:new:1" }],
      [{ text: "🏷 تخفیف‌دارها", callback_data: "m:disc:1" }, { text: "⭐ ویژه‌ها", callback_data: "m:spec:1" }],
      [{ text: "🤖 مشاور AI", callback_data: "m:ai" }, { text: "📦 پیگیری سفارش", callback_data: "m:track" }],
    ])
  );
}

export async function sendHelp(ctx: TelegramSendCtx) {
  const s = await storeName();
  const text = [
    `ℹ️ <b>راهنمای ربات ${esc(s)}</b>`,
    "",
    "🛍 <b>فروشگاه</b> — دسته‌بندی‌ها، همه محصولات، جدیدترین‌ها، تخفیف‌دارها و ویژه‌ها",
    "🔍 <b>جستجو</b> — نام محصول را بفرستید تا در کاتالوگ پیدا کنم",
    "🤖 <b>مشاور AI</b> — سوال بپرسید: «گوشی زیر ۲۰ میلیون برای گیم چه دارید؟» — با داده واقعی فروشگاه جواب می‌دهد",
    "⚖️ <b>مقایسه</b> — در صفحه هر محصول دکمه «مقایسه با…» را بزنید",
    "🛒 <b>سبد خرید</b> — افزودن، تعداد، حذف و ثبت سفارش",
    "💳 <b>پرداخت</b> — همان روش‌های فعال سایت: درگاه زرین‌پال یا کارت به کارت (ارسال عکس رسید)",
    "📦 <b>پیگیری سفارش</b> — با شماره سفارش (مثل TAJ-XXXX-XXXX)",
    "🎫 <b>پشتیبانی</b> — ثبت تیکت و گفتگو با پشتیبانی از داخل تلگرام",
    "",
    "🔔 با ثبت هر <b>محصول جدید</b>، برای شما پیام اطلاع‌رسانی می‌فرستیم (قابل خاموش کردن از تنظیمات اعلان).",
    "",
    `🌐 وب‌سایت کامل: ${siteUrl()}`,
  ].join("\n");
  await ctx.send(
    text,
    kb([
      [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }],
      [{ text: "🔔 تنظیمات اعلان", callback_data: "m:notif" }],
    ])
  );
}

// ─────────────────────────── shop / categories ───────────────────────────

export async function sendShop(ctx: TelegramSendCtx) {
  const cats = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
  });
  const rows: InlineButton[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    const pair = cats.slice(i, i + 2).map((c) => ({
      text: `${c.name}${c._count.products ? ` (${fa(c._count.products)})` : ""}`,
      callback_data: `m:cat:${c.slug}:1`,
    }));
    rows.push(pair);
  }
  rows.push([
    { text: "🗂 همه محصولات", callback_data: "m:all:1" },
    { text: "🆕 تازه‌ها", callback_data: "m:new:1" },
  ]);
  rows.push([{ text: "🏷 تخفیف‌دارها", callback_data: "m:disc:1" }, { text: "⭐ ویژه‌ها", callback_data: "m:spec:1" }]);
  rows.push([{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]);
  await ctx.send("🛍 <b>فروشگاه</b>\nیک دسته را انتخاب کنید:", kb(rows));
}

// ─────────────────────────── generic product list ───────────────────────────

export type ListKind = "all" | "new" | "disc" | "spec" | "feat" | "cat" | "q";

export const PER_PAGE_PRODUCTS = PER_PAGE;

async function buildListWhere(kind: ListKind, arg: string | undefined): Promise<{ where: Prisma.ProductWhereInput; title: string }> {
  const now = new Date();
  switch (kind) {
    case "all":
    case "new":
      return { where: {}, title: "🗂 همه محصولات" };
    case "disc":
      return { where: { discountPrice: { not: null }, OR: [{ discountEndsAt: null }, { discountEndsAt: { gte: now } }] }, title: "🏷 تخفیف‌دارها" };
    case "spec":
      return { where: { isSpecial: true }, title: "⭐ محصولات ویژه" };
    case "feat":
      return { where: { featured: true }, title: "✨ پیشنهادهای ویژه" };
    case "cat": {
      const cat = await db.category.findUnique({ where: { slug: arg ?? "" }, select: { id: true, name: true } });
      if (!cat) return { where: { id: "___none___" }, title: "دسته نامعتبر" };
      const children = await db.category.findMany({ where: { parentId: cat.id }, select: { id: true } });
      return {
        where: { OR: [{ categoryId: cat.id }, ...(children.length ? [{ categoryId: { in: children.map((c) => c.id) } }] : [])] },
        title: `📱 ${cat.name}`,
      };
    }
    case "q": {
      const q = (arg ?? "").trim();
      return { where: { OR: [{ name: { contains: q } }, { searchText: { contains: q } }] }, title: `🔍 نتایج «${q}»` };
    }
  }
}

function listKeyboard(kind: ListKind, arg: string | undefined, page: number, pages: number): ReturnType<typeof kb> {
  const tag = kind === "cat" ? `m:cat:${arg}` : kind === "q" ? `m:q:${encodeURIComponent(arg ?? "")}` : `m:${kind}`;
  const nav: InlineButton[] = [];
  if (page > 1) nav.push({ text: "◀️ قبلی", callback_data: `${tag}:${page - 1}` });
  if (page < pages) nav.push({ text: "بعدی ▶️", callback_data: `${tag}:${page + 1}` });
  const rows: InlineButton[][] = [];
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⬅️ بازگشت به فروشگاه", callback_data: "m:shop" }]);
  return kb(rows);
}

/** Send (or edit) a product LIST page. */
export async function sendProductList(ctx: TelegramSendCtx, kind: ListKind, arg: string | undefined, page: number, editMessageId?: number) {
  const { where, title } = await buildListWhere(kind, arg);
  const [total, items] = await Promise.all([countProducts(where), listProducts(where, page)]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageSafe = Math.min(Math.max(1, page), pages);

  if (total === 0) {
    const text = `${title}\n\n😕 محصولی پیدا نشد.`;
    const back = kb([[{ text: "⬅️ فروشگاه", callback_data: "m:shop" }]]);
    if (editMessageId) await ctx.edit(editMessageId, text, back);
    else await ctx.send(text, back);
    return;
  }

  const lines = [`${title} — ${fa(total)} محصول`, ""];
  for (const p of items) {
    const d = liveDiscount(p);
    lines.push(`🔸 <b>${esc(p.name)}</b>`);
    lines.push(`   ${d ? `<s>${fa(p.price)}</s> <b>${price(effPrice(p))}</b> 🔥` : `<b>${price(effPrice(p))}</b>`}${p.stock > 0 ? "" : " · ناموجود"}`);
  }
  lines.push("", `صفحه ${fa(pageSafe)} از ${fa(pages)}`);
  const keyboard = listKeyboard(kind, arg, pageSafe, pages);

  if (editMessageId) {
    const ok = await ctx.edit(editMessageId, lines.join("\n"), keyboard);
    if (!ok) await ctx.send(lines.join("\n"), keyboard);
  } else {
    await ctx.send(lines.join("\n"), keyboard);
  }
}

/** For product lists, each item is tappable → send the product card. */
export async function sendProductListCards(ctx: TelegramSendCtx, kind: ListKind, arg: string | undefined, page: number) {
  const { where, title } = await buildListWhere(kind, arg);
  const [total, items] = await Promise.all([countProducts(where), listProducts(where, page)]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const lines = [`${title} — روی هر محصول بزنید:`, `(${fa(total)} محصول · صفحه ${fa(page)} از ${fa(pages)})`];
  await ctx.send(lines.join("\n"), listKeyboard(kind, arg, page, pages));
  for (const p of items) {
    await sendProduct(ctx, p.id);
  }
}

// ─────────────────────────── product card ───────────────────────────

export function parseColors(p: ProductRow): string[] {
  if (!p.colors) return [];
  try {
    const arr = JSON.parse(p.colors);
    if (Array.isArray(arr)) return arr.map((c) => String((c as { name?: string })?.name ?? c)).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

export function parseSpecs(p: ProductRow): { key: string; label: string; value: string }[] {
  if (!p.specifications) return [];
  try {
    const arr = JSON.parse(p.specifications);
    if (!Array.isArray(arr)) return [];
    return (arr as { key?: string; label?: string; value?: string }[])
      .filter((s) => s && s.value != null)
      .map((s) => ({ key: String(s.key ?? ""), label: String(s.label ?? s.key ?? ""), value: String(s.value) }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export async function sendProduct(ctx: TelegramSendCtx, productId: string) {
  const p = await getProduct(productId);
  if (!p) {
    await ctx.send("😕 این محصول دیگر موجود نیست.");
    return;
  }
  const d = liveDiscount(p);
  const colors = parseColors(p);
  const specs = parseSpecs(p).slice(0, 8);

  const lines = [
    `<b>📦 ${esc(p.name)}</b>`,
    `🏷 ${esc(p.brand.name)} · ${esc(p.category.name)}`,
    "",
    d
      ? `<s>${fa(p.price)}</s> → <b>${price(effPrice(p))}</b> (${fa(Math.round((1 - d / p.price) * 100))}٪ تخفیف 🔥)`
      : `<b>${price(effPrice(p))}</b>`,
    p.stock > 0 ? `✅ موجود در انبار (${fa(p.stock)} عدد)` : "❌ فعلاً ناموجود",
    p.rating > 0 ? `⭐ ${fa(p.rating)} از ۵ (${fa(p.reviewCount)} نظر) · ${fa(p.soldCount)} فروش` : "🆕 محصول جدید",
  ];
  if (p.shortDescription) lines.push("", `📝 ${esc(p.shortDescription).slice(0, 300)}`);
  if (specs.length) {
    lines.push("", "<b>📋 مشخصات کلیدی</b>");
    for (const s of specs) lines.push(`• ${esc(s.label)}: ${esc(s.value)}`);
  }

  const actions: InlineButton[] = [];
  if (p.stock > 0) {
    actions.push({ text: "🛒 افزودن به سبد", callback_data: `pa:${p.id}` });
    if (colors.length > 1) actions.push({ text: "🎨 انتخاب رنگ", callback_data: `pc:${p.id}` });
  }
  actions.push({ text: "⚖️ مقایسه با…", callback_data: `cmp:${p.id}` });

  const rows: InlineButton[][] = [];
  if (actions.length) rows.push(actions.slice(0, 2));
  if (actions.length > 2) rows.push(actions.slice(2));
  rows.push([{ text: "🌐 مشاهده در وب‌سایت", url: `${siteUrl()}/products/${p.slug}` }]);
  rows.push([{ text: "⬅️ بازگشت", callback_data: "m:shop" }]);

  const caption = lines.join("\n").slice(0, 1024);
  if (p.mainImage) {
    const img = loadLocalImage(p.mainImage);
    const r = await tgSendPhoto(
      ctx.token,
      ctx.chatId,
      img.buffer ? { buffer: img.buffer, filename: "product.jpg" } : { url: p.mainImage },
      caption,
      { keyboard: kb(rows) }
    );
    if (!r.ok) await ctx.send(lines.join("\n"), kb(rows));
  } else {
    await ctx.send(lines.join("\n"), kb(rows));
  }
}

export async function sendColorPicker(ctx: TelegramSendCtx, productId: string) {
  const p = await getProduct(productId);
  if (!p) {
    await ctx.send("😕 محصول پیدا نشد.");
    return;
  }
  const colors = parseColors(p);
  if (colors.length === 0) {
    await ctx.send("این محصول رنگ‌بندی ندارد.");
    return;
  }
  const rows = colors.slice(0, 8).map((c, i) => [{ text: `🎨 ${c}`, callback_data: `cr:${p.id}:${i}` }]);
  rows.push([{ text: "⬅️ انصراف", callback_data: `p:${p.id}` }]);
  await ctx.send("🎨 رنگ موردنظر را انتخاب کنید:", kb(rows));
}

// ─────────────────────────── cart ───────────────────────────

export async function sendCart(ctx: TelegramSendCtx) {
  const items = ctx.cartItems;
  if (items.length === 0) {
    await ctx.send("🛒 <b>سبد خرید شما خالی است.</b>\nاز فروشگاه محصول اضافه کنید 👇", kb([[{ text: "🛍 فروشگاه", callback_data: "m:shop" }]]));
    return;
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const lines = ["🛒 <b>سبد خرید شما</b>", ""];
  items.forEach((item, idx) => {
    lines.push(`${fa(idx + 1)}. <b>${esc(item.name)}</b>${item.color ? ` · ${esc(item.color)}` : ""}`);
    lines.push(`    ${price(item.price)} × ${fa(item.qty)} = <b>${price(item.price * item.qty)}</b>`);
  });
  lines.push("", `💰 جمع کل (بدون هزینه ارسال): <b>${price(subtotal)}</b>`, "", "برای تغییر تعداد، دکمه‌های کنار هر محصول:");
  const rows: InlineButton[][] = items.slice(0, 10).map((item, idx) => [
    { text: item.name.slice(0, 16) + (item.name.length > 16 ? "…" : ""), callback_data: `p:${item.productId}` },
    { text: "➕", callback_data: `cq:${idx}:+` },
    { text: "➖", callback_data: `cq:${idx}:-` },
    { text: "🗑", callback_data: `crm:${idx}` },
  ]);
  rows.push([{ text: "✅ ثبت سفارش", callback_data: "co" }]);
  rows.push([{ text: "🛍 ادامه خرید", callback_data: "m:shop" }, { text: "🧹 خالی کردن سبد", callback_data: "cartclear" }]);
  await ctx.send(lines.join("\n"), kb(rows));
}

// ─────────────────────────── compare ───────────────────────────

export async function sendCompare(ctx: TelegramSendCtx, p1: ProductRow, p2: ProductRow) {
  const specs1 = new Map(parseSpecs(p1).map((s) => [s.key || s.label, s]));
  const specs2 = new Map(parseSpecs(p2).map((s) => [s.key || s.label, s]));
  const allKeys: string[] = [];
  for (const s of [...parseSpecs(p1), ...parseSpecs(p2)]) {
    const k = s.key || s.label;
    if (!allKeys.includes(k)) allKeys.push(k);
  }
  const lines = [
    "⚖️ <b>مقایسه دو محصول</b>",
    "",
    `🔹 <b>${esc(p1.name)}</b>`,
    `🔶 <b>${esc(p2.name)}</b>`,
    "",
    `💰 قیمت: <b>${price(effPrice(p1))}</b>  |  <b>${price(effPrice(p2))}</b>`,
    `📦 موجودی: ${p1.stock > 0 ? "✅" : "❌"}  |  ${p2.stock > 0 ? "✅" : "❌"}`,
    `⭐ امتیاز: ${fa(p1.rating)}  |  ${fa(p2.rating)}`,
    `🏷 برند: ${esc(p1.brand.name)}  |  ${esc(p2.brand.name)}`,
  ];
  for (const k of allKeys.slice(0, 12)) {
    const s1 = specs1.get(k);
    const s2 = specs2.get(k);
    lines.push(`• ${esc(s1?.label ?? k)}: ${esc(s1?.value ?? "—")} | ${esc(s2?.value ?? "—")}`);
  }
  const rows: InlineButton[][] = [
    [
      { text: "🛒 اولی", callback_data: `pa:${p1.id}` },
      { text: "🛒 دومی", callback_data: `pa:${p2.id}` },
    ],
    [
      { text: "🌐 اولی", url: `${siteUrl()}/products/${p1.slug}` },
      { text: "🌐 دومی", url: `${siteUrl()}/products/${p2.slug}` },
    ],
    [{ text: "⬅️ بازگشت", callback_data: "m:shop" }],
  ];
  await ctx.send(lines.join("\n"), kb(rows));
}

// ─────────────────────────── order (customer view) ───────────────────────────

const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  c2cPayment: true,
} as const;

type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function findOrder(orderNumber: string): Promise<FullOrder | null> {
  return db.order.findUnique({ where: { orderNumber: orderNumber.trim().toUpperCase() }, include: orderInclude });
}

/** admin paths address orders by id */
export async function findOrderById(id: string): Promise<FullOrder | null> {
  return db.order.findUnique({ where: { id }, include: orderInclude });
}

export function renderOrderText(order: FullOrder): string {
  const lines = [
    `📦 <b>سفارش ${esc(order.orderNumber)}</b>`,
    `${ORDER_STATUS_EMOJI[order.status] ?? "•"} وضعیت: <b>${ORDER_STATUS_FA[order.status] ?? order.status}</b>`,
    `💳 پرداخت: ${PAYMENT_STATUS_FA[order.paymentStatus] ?? order.paymentStatus}`,
    "",
    "<b>اقلام:</b>",
  ];
  for (const it of order.items) lines.push(`• ${esc(it.name)}${it.color ? ` (${esc(it.color)})` : ""} × ${fa(it.quantity)} — ${price(it.total)}`);
  lines.push("", `💰 جمع کل: <b>${price(order.total)}</b>`);
  if (order.deliveryMethodName) lines.push(`🚚 ارسال: ${esc(order.deliveryMethodName)}`);
  if (order.trackingCode) lines.push(`📮 کد رهگیری پستی: ${esc(order.trackingCode)}`);
  if (order.note) lines.push(`📝 یادداشت: ${esc(order.note)}`);
  lines.push("", `🗓 ${fmtDate(order.createdAt)}`);
  return lines.join("\n");
}

export async function sendOrderView(ctx: TelegramSendCtx, orderNumber: string) {
  const o = await findOrder(orderNumber);
  if (!o) {
    await ctx.send("😕 سفارشی با این شماره پیدا نشد.\nشماره را دقیقاً از پیام تأیید سفارش کپی کنید (مثل <code>TAJ-XXXXX-XXXX</code>).");
    return;
  }
  await ctx.send(renderOrderText(o), kb([[{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]]));
}

export async function sendTrackPrompt(ctx: TelegramSendCtx) {
  const subsOrders = ctx.sub.userId
    ? await db.order.findMany({ where: { userId: ctx.sub.userId }, orderBy: { createdAt: "desc" }, take: 5, select: { orderNumber: true, status: true, total: true } })
    : [];
  const lines = ["📦 <b>پیگیری سفارش</b>", "", "شماره سفارش خود را بفرستید (مثل <code>TAJ-MTOCX9R9-422N</code>):"];
  const rows: InlineButton[][] = [];
  if (subsOrders.length) {
    lines.push("", "<b>سفارش‌های اخیر شما:</b>");
    for (const o of subsOrders) {
      lines.push(`• <code>${esc(o.orderNumber)}</code> — ${ORDER_STATUS_FA[o.status] ?? o.status} (${price(o.total)})`);
      rows.push([{ text: `${ORDER_STATUS_EMOJI[o.status] ?? "•"} ${o.orderNumber}`, callback_data: `or:${o.orderNumber}` }]);
    }
  }
  rows.push([{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]);
  await ctx.send(lines.join("\n"), kb(rows));
}

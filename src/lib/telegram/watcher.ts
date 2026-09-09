/**
 * TAJ Electronics — v33 · Telegram bot OUTBOUND watcher
 * -----------------------------------------------------------------------
 * Zero-touch notifications: this module WATCHES the database (snapshot diff,
 * every 12s) instead of hooking into existing routes — the storefront and
 * admin APIs stay 100% untouched (the owner's «به چیزای دیگه دست نزن» rule).
 *
 * Emits:
 *   • order status changes          → push to the order's linked subscriber
 *   • ZarinPal payment VERIFIED     → paid receipt push to the customer
 *   • card-to-card receipts         → admin queue push (with photo + buttons)
 *   • c2c APPROVED / REJECTED       → push to the customer
 *   • new published products        → broadcast to opted-in subscribers
 *   • new tickets / customer replies→ push to admin chats
 *   • staff ticket replies          → push to the ticket owner
 * Also exports direct helpers used by the bot flows themselves.
 */

import { db } from "@/lib/db";
import { adminChatIds, botToken, esc, fa, price, kb, fmtDate } from "./common";
import { tgSendMessage, tgSendPhoto } from "./api";
import { ORDER_STATUS_EMOJI, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "./types";

let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

// in-memory snapshots (rebuilt on process start — first pass = baseline only)
const orderSnapshot = new Map<string, { status: string; paymentStatus: string }>();
const paymentSnapshot = new Map<string, string>();
const c2cSnapshot = new Map<string, string>();
const ticketMessageSnapshot = new Set<string>();
const productSnapshot = new Set<string>();
let lastProductScan = new Date();
let baselineDone = false;

async function sendToAdmins(text: string, keyboard?: ReturnType<typeof kb>): Promise<void> {
  const s = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  if (!s?.enabled) return;
  const token = botToken(s);
  if (!token) return;
  for (const chatId of adminChatIds(s)) {
    await tgSendMessage(token, chatId, text, { keyboard });
  }
}

async function sendToUser(userId: string | null, text: string, keyboard?: ReturnType<typeof kb>): Promise<void> {
  if (!userId) return;
  const s = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  if (!s?.enabled) return;
  const token = botToken(s);
  if (!token) return;
  const sub = await db.telegramSubscriber.findFirst({ where: { userId, isBlocked: false } });
  if (!sub) return;
  await tgSendMessage(token, sub.chatId, text, { keyboard });
}

// ─────────────────────────── watchers ───────────────────────────

async function watchOrders(token: string): Promise<void> {
  const since = baselineDone ? new Date(Date.now() - 6 * 60_000) : new Date(0);
  const orders = await db.order.findMany({
    where: { updatedAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, userId: true, total: true },
  });
  for (const o of orders) {
    const prev = orderSnapshot.get(o.id);
    orderSnapshot.set(o.id, { status: o.status, paymentStatus: o.paymentStatus });
    if (!prev || !baselineDone) continue;
    if (prev.status !== o.status) {
      // push to customer
      await sendToUser(
        o.userId,
        [
          `${ORDER_STATUS_EMOJI[o.status] ?? "•"} <b>به‌روزرسانی وضعیت سفارش</b>`,
          "",
          `🧾 سفارش: <code>${esc(o.orderNumber)}</code>`,
          `📦 وضعیت جدید: <b>${ORDER_STATUS_FA[o.status] ?? o.status}</b>`,
          `💰 مبلغ: ${price(o.total)}`,
          "",
          "برای جزئیات بیشتر، همین‌جا دکمه زیر را بزنید یا از منوی «📦 پیگیری سفارش» استفاده کنید. 🙏",
        ].join("\n"),
        kb([[{ text: "📦 مشاهده سفارش", callback_data: `or:${o.orderNumber}` }]])
      );
    }
  }
}

async function watchPayments(token: string): Promise<void> {
  const payments = await db.payment.findMany({
    where: { gateway: "ZARINPAL", updatedAt: { gte: new Date(Date.now() - 6 * 60_000) } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: { order: { select: { id: true, orderNumber: true, userId: true, total: true } } },
  });
  for (const p of payments) {
    const prev = paymentSnapshot.get(p.id);
    paymentSnapshot.set(p.id, p.status);
    if (!prev || !baselineDone) continue;
    if (prev !== "VERIFIED" && p.status === "VERIFIED" && p.order) {
      await sendToUser(
        p.order.userId,
        [
          "💳 <b>پرداخت شما تأیید شد!</b>",
          "",
          `🧾 سفارش: <code>${esc(p.order.orderNumber)}</code>`,
          `💰 مبلغ: ${price(p.order.total)}`,
          p.refId ? `✅ شماره پیگیری بانکی: <code>${esc(p.refId)}</code>` : null,
          "",
          "سفارش شما وارد پردازش شد و وضعیت‌های بعدی همین‌جا اعلام می‌شود. از خرید شما سپاسگزاریم 🙏",
        ]
          .filter((l) => l !== null)
          .join("\n"),
        kb([[{ text: "📦 مشاهده سفارش", callback_data: `or:${p.order.orderNumber}` }]])
      );
    }
  }
}

async function watchC2c(token: string): Promise<void> {
  const rows = await db.cardToCardPayment.findMany({
    where: { updatedAt: { gte: new Date(Date.now() - 6 * 60_000) } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: { order: { select: { id: true, orderNumber: true, userId: true, total: true } } },
  });
  for (const r of rows) {
    const prev = c2cSnapshot.get(r.id);
    c2cSnapshot.set(r.id, r.status);
    if (!prev || !baselineDone) continue;
    if (prev === "PENDING" && r.status === "APPROVED") {
      await sendToUser(
        r.userId,
        [
          "✅ <b>پرداخت کارت به کارت شما تأیید شد!</b>",
          "",
          `🧾 سفارش: <code>${esc(r.order.orderNumber)}</code>`,
          "سفارش شما وارد پردازش شد و تا تحویل، مراحلش همین‌جا اعلام می‌شود. 🙏",
        ].join("\n"),
        kb([[{ text: "📦 مشاهده سفارش", callback_data: `or:${r.order.orderNumber}` }]])
      );
    } else if (prev === "PENDING" && r.status === "REJECTED") {
      await sendToUser(
        r.userId,
        [
          "❌ <b>رسید پرداخت تأیید نشد</b>",
          "",
          `🧾 سفارش: <code>${esc(r.order.orderNumber)}</code>`,
          r.rejectionReason ? ` دلیل: ${esc(r.rejectionReason)}` : "",
          "",
          "در صورت پرداخت اشتباه مبلغی، با پشتیبانی تماس بگیرید تا بررسی شود. 🙏",
        ].join("\n"),
        kb([[{ text: "🎫 پشتیبانی", callback_data: "m:tickets" }]])
      );
    }
  }
}

async function watchTickets(token: string): Promise<void> {
  const messages = await db.supportTicketMessage.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 6 * 60_000) } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { ticket: { select: { id: true, ticketNo: true, subject: true, userId: true } } },
  });
  for (const m of messages) {
    if (ticketMessageSnapshot.has(m.id) || !baselineDone) {
      ticketMessageSnapshot.add(m.id);
      continue;
    }
    ticketMessageSnapshot.add(m.id);
    if (m.isStaff) {
      // staff reply → push to the ticket owner
      await sendToUser(
        m.ticket.userId,
        [
          "🛟 <b>پاسخ پشتیبانی به تیکت شما</b>",
          "",
          `🎫 تیکت: <code>${esc(m.ticket.ticketNo)}</code> — ${esc(m.ticket.subject.slice(0, 40))}`,
          `💬 ${esc(m.body.slice(0, 400))}`,
          "",
          "برای ادامه گفتگو همین‌جا پاسخ دهید. 🙏",
        ].join("\n"),
        kb([[{ text: "💬 پاسخ به تیکت", callback_data: `tr:${m.ticket.id}` }]])
      );
    } else {
      // customer message → push to admins
      const user = m.senderId ? await db.user.findUnique({ where: { id: m.senderId }, select: { firstName: true, lastName: true } }) : null;
      await sendToAdmins(
        [
          "🎫 <b>پیام جدید در تیکت</b>",
          "",
          `🎫 <code>${esc(m.ticket.ticketNo)}</code> — ${esc(m.ticket.subject.slice(0, 40))}`,
          `👤 ${esc(user?.firstName ?? "")} ${esc(user?.lastName ?? "")}`,
          `💬 ${esc(m.body.slice(0, 300))}`,
        ].join("\n"),
        kb([[{ text: "💬 مشاهده و پاسخ", callback_data: `a:tk:${m.ticket.id}` }]])
      );
    }
  }
}

async function watchNewProducts(token: string): Promise<void> {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED", createdAt: { gte: new Date(Date.now() - 6 * 60_000) } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, name: true, price: true, discountPrice: true, mainImage: true, slug: true, category: { select: { name: true } } },
  });
  for (const p of products) {
    if (productSnapshot.has(p.id) || !baselineDone) {
      productSnapshot.add(p.id);
      continue;
    }
    productSnapshot.add(p.id);
    // broadcast to opted-in subscribers
    const subs = await db.telegramSubscriber.findMany({ where: { isBlocked: false, notifyNewProducts: true }, select: { chatId: true } });
    const eff = p.discountPrice ?? p.price;
    const text = [
      "🆕 <b>محصول جدید در فروشگاه!</b>",
      "",
      `📦 <b>${esc(p.name)}</b>`,
      `🏷 ${esc(p.category.name)}`,
      `💰 ${price(eff)}`,
      "",
      "برای دیدن جزئیات و خرید، دکمه زیر را بزنید 👇",
    ].join("\n");
    const keyboard = kb([[{ text: "🔎 مشاهده و خرید", callback_data: `p:${p.id}` }]]);
    const { loadLocalImage } = await import("./common");
    for (const s of subs.slice(0, 500)) {
      if (p.mainImage) {
        const img = loadLocalImage(p.mainImage);
        const r = img.buffer || img.url
          ? await tgSendPhoto(token, s.chatId, img.buffer ? { buffer: img.buffer, filename: "product.jpg" } : { url: img.url! }, text, { keyboard })
          : { ok: false as const };
        if (!r.ok) await tgSendMessage(token, s.chatId, text, { keyboard });
      } else {
        await tgSendMessage(token, s.chatId, text, { keyboard });
      }
      await new Promise((r) => setTimeout(r, 45)); // Telegram flood limits
    }
  }
  lastProductScan = new Date();
}

// ─────────────────────────── loop ───────────────────────────

async function scanOnce(): Promise<void> {
  const s = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  const token = s?.enabled ? botToken(s) : null;
  if (!token) {
    baselineDone = false;
    return;
  }
  try {
    await Promise.all([
      watchOrders(token),
      watchPayments(token),
      watchC2c(token),
      watchTickets(token),
      watchNewProducts(token),
    ]);
    baselineDone = true;
  } catch (e) {
    console.error("[TG watcher]", e);
  }
}

/** Start the outbound watcher (idempotent — safe to call multiple times). */
export function startTelegramWatcher(): void {
  if (running) return;
  running = true;
  scanOnce().catch(() => null); // baseline immediately
  timer = setInterval(() => {
    scanOnce().catch(() => null);
  }, 12_000);
  if (typeof timer.unref === "function") timer.unref();
}

// ─────────────────────────── direct helpers (called by flows) ───────────────────────────

/** New c2c receipt → push the receipt card to every admin chat. */
export async function notifyAdminsNewReceipt(orderId: string): Promise<void> {
  const s = await db.telegramBotSettings.findUnique({ where: { id: "main" } });
  const token = s?.enabled ? botToken(s) : null;
  if (!token) return;
  const r = await db.cardToCardPayment.findUnique({ where: { orderId }, include: { order: true } });
  if (!r) return;
  const caption = [
    "🧾 <b>رسید پرداخت جدید (کارت به کارت)</b>",
    "",
    `📦 سفارش: <code>${esc(r.order.orderNumber)}</code>`,
    `💰 مبلغ: <b>${price(r.amount)}</b>`,
    `👤 واریز‌کننده: ${esc(r.senderName)} · ${esc(r.senderPhone)}`,
    `🗓 ${fmtDate(r.paidAt)}`,
    r.note ? `📝 ${esc(r.note)}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
  const keyboard = kb([
    [
      { text: "✅ تأیید پرداخت", callback_data: `a:c2cok:${r.id}` },
      { text: "❌ رد", callback_data: `a:c2cno:${r.id}` },
    ],
    [{ text: "🔎 سفارش", callback_data: `a:ord:${r.orderId}` }],
  ]);
  const { loadLocalImage } = await import("./common");
  for (const chatId of adminChatIds(s!)) {
    if (r.receiptImage) {
      const img = loadLocalImage(r.receiptImage);
      const res = img.buffer || img.url
        ? await tgSendPhoto(token, chatId, img.buffer ? { buffer: img.buffer, filename: "receipt.jpg" } : { url: img.url! }, caption, { keyboard })
        : { ok: false as const };
      if (!res.ok) await tgSendMessage(token, chatId, caption, { keyboard });
    } else {
      await tgSendMessage(token, chatId, caption, { keyboard });
    }
  }
}

/** New ticket (from Telegram or the website) → push to admins. */
export async function notifyAdminsNewTicket(ticketId: string): Promise<void> {
  const t = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { firstName: true, lastName: true } }, messages: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!t) return;
  await sendToAdmins(
    [
      "🎫 <b>تیکت جدید ثبت شد</b>",
      "",
      `🎫 <code>${esc(t.ticketNo)}</code> — ${esc(t.subject.slice(0, 50))}`,
      `👤 ${esc(t.user.firstName ?? "")} ${esc(t.user.lastName ?? "")}`,
      t.messages[0] ? `💬 ${esc(t.messages[0].body.slice(0, 300))}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n"),
    kb([[{ text: "💬 مشاهده و پاسخ", callback_data: `a:tk:${t.id}` }]])
  );
}

/** Customer replied to a ticket → push to admins. */
export async function notifyAdminsTicketReply(ticketId: string): Promise<void> {
  const t = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!t) return;
  await sendToAdmins(
    [
      "💬 <b>پاسخ جدید مشتری در تیکت</b>",
      "",
      `🎫 <code>${esc(t.ticketNo)}</code> — ${esc(t.subject.slice(0, 40))}`,
      t.messages[0] ? `💬 ${esc(t.messages[0].body.slice(0, 300))}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n"),
    kb([[{ text: "💬 مشاهده و پاسخ", callback_data: `a:tk:${t.id}` }]])
  );
}

/** Staff (bot-admin) replied → push to the ticket owner (watcher also catches
 * this, but the direct push is instant and richer). */
export async function notifyTicketCustomerReply(ticketId: string): Promise<void> {
  // the 12s watcher covers it — this hook exists for instant delivery if needed
  const t = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!t) return;
  await sendToUser(
    t.userId,
    [
      "🛟 <b>پاسخ پشتیبانی به تیکت شما</b>",
      "",
      `🎫 تیکت: <code>${esc(t.ticketNo)}</code> — ${esc(t.subject.slice(0, 40))}`,
      `💬 ${esc(t.messages[0]?.body.slice(0, 400) ?? "")}`,
      "",
      "برای ادامه گفتگو همین‌جا پاسخ دهید. 🙏",
    ].join("\n"),
    kb([[{ text: "💬 پاسخ به تیکت", callback_data: `tr:${t.id}` }]])
  );
}

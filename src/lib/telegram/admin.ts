/**
 * TAJ Electronics — v33 · Telegram bot ADMIN console
 * -----------------------------------------------------------------------
 * Opens for the chat ids listed in TelegramBotSettings.adminChatId.
 * Order management (list/detail/status/notes), card-to-card receipt
 * approvals, support-ticket replies, quick stats and broadcast.
 */

import { db } from "@/lib/db";
import { markOrderPaid, notify } from "@/lib/orders";
import { esc, fa, price, kb, parseStateData, setState, fmtDate, loadLocalImage } from "./common";
import { tgSendPhoto, tgSendMessage } from "./api";
import { findOrderById, renderOrderText } from "./views";
import type { TelegramSendCtx } from "./view-types";
import { BOT_STATES, ORDER_STATUS_EMOJI, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "./types";
import type { InlineButton, TgMessage } from "./types";
import type { Prisma } from "@prisma/client";

const ORDERS_PER_PAGE = 6;
const TICKETS_PER_PAGE = 6;

const ORDER_FILTERS: Record<string, { label: string; where: Prisma.OrderWhereInput }> = {
  all: { label: "همه", where: {} },
  pending: { label: "در انتظار پرداخت", where: { status: "PENDING_PAYMENT" } },
  paid: { label: "پرداخت‌شده", where: { status: "PAID" } },
  processing: { label: "در پردازش", where: { status: "PROCESSING" } },
  shipped: { label: "ارسال‌شده", where: { status: "SHIPPED" } },
  delivered: { label: "تحویل‌شده", where: { status: "DELIVERED" } },
  cancelled: { label: "لغو‌شده", where: { status: "CANCELLED" } },
  verifying: { label: "رسید در انتظار بررسی", where: { paymentStatus: "VERIFYING" } },
};

const STATUS_FLOW = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "CONFIRMED",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

// ─────────────────────────── menu ───────────────────────────

export async function sendAdminMenu(ctx: TelegramSendCtx): Promise<void> {
  const [openOrders, pendingReceipts, openTickets, todayOrders, todayRevenue] = await Promise.all([
    db.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAID", "PROCESSING"] } } }),
    db.cardToCardPayment.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { createdAt: { gte: startOfToday() } } }),
    db.order.aggregate({
      where: { createdAt: { gte: startOfToday() }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
  ]);
  await ctx.send(
    [
      "🛠 <b>پنل مدیریت فروشگاه</b>",
      "",
      `📦 سفارش‌های فعال: <b>${fa(openOrders)}</b>`,
      `🧾 رسیدهای در انتظار: <b>${fa(pendingReceipts)}</b>`,
      `🎫 تیکت‌های باز: <b>${fa(openTickets)}</b>`,
      `🛒 سفارش‌های امروز: <b>${fa(todayOrders)}</b> (فروش پرداخت‌شده: <b>${price(todayRevenue._sum.total ?? 0)}</b>)`,
      "",
      "چه کاری انجام دهیم؟",
    ].join("\n"),
    kb([
      [{ text: "📦 سفارش‌ها", callback_data: "a:orders:all:1" }],
      [{ text: "🧾 رسیدهای کارت به کارت", callback_data: "a:c2c:1" }],
      [{ text: "🎫 تیکت‌ها", callback_data: "a:tickets:1" }],
      [{ text: "📊 وضعیت فروشگاه", callback_data: "a:stats" }],
      [{ text: "📣 ارسال پیام به مشترکین", callback_data: "a:bc" }],
      [{ text: "⬅️ منوی مشتری", callback_data: "m:main" }],
    ])
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────── stats ───────────────────────────

export async function sendAdminStats(ctx: TelegramSendCtx): Promise<void> {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 864e5);
  const [totalOrders, paidOrders, revenue, subscribers, products, lowStock, pendingC2c, openTickets] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { paymentStatus: "PAID" } }),
    db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
    db.telegramSubscriber.count({ where: { isBlocked: false } }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: "PUBLISHED", stock: { lte: 5 } } }),
    db.cardToCardPayment.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
  ]);
  const monthRevenue = await db.order.aggregate({ where: { paymentStatus: "PAID", createdAt: { gte: monthAgo } }, _sum: { total: true } });
  await ctx.send(
    [
      "📊 <b>وضعیت فروشگاه</b>",
      "",
      `🛒 کل سفارش‌ها: <b>${fa(totalOrders)}</b> (پرداخت‌شده: ${fa(paidOrders)})`,
      `💰 فروش کل (پرداخت‌شده): <b>${price(revenue._sum.total ?? 0)}</b>`,
      `📅 فروش ۳۰ روز اخیر: <b>${price(monthRevenue._sum.total ?? 0)}</b>`,
      "",
      `📱 مشترکین ربات: <b>${fa(subscribers)}</b>`,
      `📦 محصولات فعال: <b>${fa(products)}</b> (کم‌موجود: ${fa(lowStock)})`,
      `🧾 رسیدهای در انتظار: <b>${fa(pendingC2c)}</b> · 🎫 تیکت‌های باز: <b>${fa(openTickets)}</b>`,
      `🕐 ${fmtDate(now)}`,
    ].join("\n"),
    kb([[{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]])
  );
}

// ─────────────────────────── orders ───────────────────────────

export async function sendAdminOrders(ctx: TelegramSendCtx, filter: string, page: number): Promise<void> {
  const f = ORDER_FILTERS[filter] ?? ORDER_FILTERS.all;
  const [total, orders] = await Promise.all([
    db.order.count({ where: f.where }),
    db.order.findMany({
      where: f.where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
      include: { items: true, _count: { select: { items: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  const lines = [`📦 <b>سفارش‌ها — ${f.label}</b> (${fa(total)})`, `صفحه ${fa(page)} از ${fa(pages)}`, ""];
  const rows: InlineButton[][] = [];
  for (const o of orders) {
    lines.push(
      `${ORDER_STATUS_EMOJI[o.status] ?? "•"} <code>${esc(o.orderNumber)}</code> — ${price(o.total)} · ${PAYMENT_STATUS_FA[o.paymentStatus] ?? o.paymentStatus}`
    );
    lines.push(`   ${esc(o.firstName)} ${esc(o.lastName)} · ${esc(o.phone)}`);
    rows.push([{ text: `🔎 ${o.orderNumber}`, callback_data: `a:ord:${o.id}` }]);
  }
  const nav: InlineButton[] = [];
  if (page > 1) nav.push({ text: "◀️ قبلی", callback_data: `a:orders:${filter}:${page - 1}` });
  if (page < pages) nav.push({ text: "بعدی ▶️", callback_data: `a:orders:${filter}:${page + 1}` });
  if (nav.length) rows.push(nav);
  const filters: InlineButton[] = Object.entries(ORDER_FILTERS)
    .slice(0, 8)
    .map(([k, v]) => ({ text: v.label, callback_data: `a:orders:${k}:1` }));
  rows.push(filters.slice(0, 4));
  if (filters.length > 4) rows.push(filters.slice(4));
  rows.push([{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]);
  await ctx.send(lines.join("\n"), kb(rows));
}

export async function sendAdminOrderDetail(ctx: TelegramSendCtx, orderId: string): Promise<void> {
  const o = await findOrderById(orderId);
  if (!o) {
    await ctx.send("😕 سفارش پیدا نشد.");
    return;
  }
  const rows: InlineButton[][] = [];
  // status-change buttons (skip the current status)
  const others = STATUS_FLOW.filter((s) => s !== o.status);
  const first = others.slice(0, 4);
  const second = others.slice(4, 8);
  if (first.length) rows.push(first.map((s) => ({ text: `${ORDER_STATUS_EMOJI[s]} ${ORDER_STATUS_FA[s]}`, callback_data: `a:st:${o.id}:${s}` })));
  if (second.length) rows.push(second.map((s) => ({ text: `${ORDER_STATUS_EMOJI[s]} ${ORDER_STATUS_FA[s]}`, callback_data: `a:st:${o.id}:${s}` })));
  rows.push([
    { text: "📝 افزودن یادداشت", callback_data: `a:note:${o.id}` },
  ]);
  rows.push([{ text: "⬅️ سفارش‌ها", callback_data: "a:orders:all:1" }]);
  await ctx.send(renderOrderText(o), kb(rows));
}

export async function setOrderStatus(ctx: TelegramSendCtx, orderId: string, status: string): Promise<void> {
  const o = await findOrderById(orderId);
  if (!o || !STATUS_FLOW.includes(status)) {
    await ctx.send("😕 وضعیت نامعتبر است.");
    return;
  }
  const data: Prisma.OrderUpdateInput = { status };
  if (status === "SHIPPED") data.paymentStatus = o.paymentStatus === "UNPAID" ? "UNPAID" : o.paymentStatus;
  await db.order.update({ where: { id: orderId }, data });
  // keep the website notifications in sync
  if (o.userId) {
    await notify(
      o.userId,
      "وضعیت سفارش به‌روزرسانی شد",
      `وضعیت سفارش ${o.orderNumber} به «${ORDER_STATUS_FA[status]}» تغییر کرد.`,
      "ORDER",
      "/account/orders"
    );
  }
  await ctx.send(`✅ وضعیت سفارش <code>${esc(o.orderNumber)}</code> به «<b>${ORDER_STATUS_FA[status]}</b>» تغییر کرد.`, kb([[{ text: "🔎 سفارش", callback_data: `a:ord:${orderId}` }]]));
  // customer push happens in the watcher (status snapshot) — fire-and-forget
}

export async function appendOrderNote(ctx: TelegramSendCtx, orderId: string, note: string): Promise<void> {
  const o = await findOrderById(orderId);
  if (!o) {
    await ctx.send("😕 سفارش پیدا نشد.");
    return;
  }
  const stamp = fmtDate(new Date());
  const extra = `[${stamp} · از ربات تلگرام] ${note.trim().slice(0, 500)}`;
  const merged = o.note ? `${o.note}\n${extra}` : extra;
  await db.order.update({ where: { id: orderId }, data: { note: merged } });
  await setState(ctx.sub, BOT_STATES.IDLE, null);
  await ctx.send("✅ یادداشت به سفارش اضافه شد.", kb([[{ text: "🔎 سفارش", callback_data: `a:ord:${orderId}` }]]));
}

// ─────────────────────────── c2c receipts ───────────────────────────

export async function sendAdminC2cQueue(ctx: TelegramSendCtx, page: number): Promise<void> {
  const [total, rows] = await Promise.all([
    db.cardToCardPayment.count({ where: { status: "PENDING" } }),
    db.cardToCardPayment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      skip: (page - 1) * 5,
      include: { order: { include: { items: true } } },
    }),
  ]);
  if (total === 0) {
    await ctx.send("✅ هیچ رسید کارت به کارتی در انتظار بررسی نیست.", kb([[{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]]));
    return;
  }
  await ctx.send(`🧾 <b>رسیدهای در انتظار بررسی</b> — ${fa(total)} مورد`, kb([[{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]]));
  for (const r of rows) {
    const caption = [
      `🧾 <b>رسید پرداخت کارت به کارت</b>`,
      `📦 سفارش: <code>${esc(r.order.orderNumber)}</code>`,
      `💰 مبلغ: <b>${price(r.amount)}</b>`,
      `👤 واریز‌کننده: ${esc(r.senderName)} · ${esc(r.senderPhone)}`,
      `🗓 ${fmtDate(r.paidAt)}`,
      r.note ? `📝 ${esc(r.note)}` : null,
    ]
      .filter((x) => x !== null)
      .join("\n");
    const buttons = kb([
      [
        { text: "✅ تأیید پرداخت", callback_data: `a:c2cok:${r.id}` },
        { text: "❌ رد", callback_data: `a:c2cno:${r.id}` },
      ],
      [{ text: "🔎 سفارش", callback_data: `a:ord:${r.orderId}` }],
    ]);
    // receipt image from disk (or URL fallback)
    if (r.receiptImage) {
      const img = loadLocalImage(r.receiptImage);
      const res = await tgSendPhoto(
        ctx.token,
        ctx.chatId,
        img.buffer ? { buffer: img.buffer, filename: "receipt.jpg" } : { url: r.receiptImage },
        caption,
        { keyboard: buttons }
      );
      if (!res.ok) await ctx.send(caption, buttons);
    } else {
      await ctx.send(caption, buttons);
    }
  }
}

export async function approveC2c(ctx: TelegramSendCtx, paymentId: string): Promise<void> {
  const c2c = await db.cardToCardPayment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!c2c) return void (await ctx.send("😕 رسید پیدا نشد."));
  if (c2c.status !== "PENDING") return void (await ctx.send("این رسید قبلاً بررسی شده است."));
  const adminUser = ctx.sub.userId;
  await db.cardToCardPayment.update({
    where: { id: paymentId },
    data: { status: "APPROVED", reviewedBy: adminUser, reviewedAt: new Date() },
  });
  await markOrderPaid(c2c.orderId);
  if (c2c.userId) {
    await notify(c2c.userId, "پرداخت تأیید شد", `پرداخت کارت به کارت سفارش ${c2c.order.orderNumber} تأیید و سفارش وارد پردازش شد.`, "PAYMENT", "/account/orders");
  }
  await ctx.send(
    `✅ پرداخت سفارش <code>${esc(c2c.order.orderNumber)}</code> تأیید و سفارش پرداخت‌شده علامت خورد.`,
    kb([[{ text: "🧾 رسیدهای بعدی", callback_data: "a:c2c:1" }]])
  );
}

export async function rejectC2c(ctx: TelegramSendCtx, paymentId: string, reason: string): Promise<void> {
  const c2c = await db.cardToCardPayment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!c2c) return void (await ctx.send("😕 رسید پیدا نشد."));
  if (c2c.status !== "PENDING") return void (await ctx.send("این رسید قبلاً بررسی شده است."));
  await db.cardToCardPayment.update({
    where: { id: paymentId },
    data: { status: "REJECTED", rejectionReason: reason, reviewedBy: ctx.sub.userId, reviewedAt: new Date() },
  });
  await db.order.update({ where: { id: c2c.orderId }, data: { paymentStatus: "REJECTED" } });
  if (c2c.userId) {
    await notify(
      c2c.userId,
      "پرداخت رد شد",
      `رسید پرداخت سفارش ${c2c.order.orderNumber} تأیید نشد: ${reason}`,
      "PAYMENT",
      "/account/orders"
    );
  }
  await ctx.send(`❌ رسید سفارش <code>${esc(c2c.order.orderNumber)}</code> رد شد.`, kb([[{ text: "🧾 رسیدهای بعدی", callback_data: "a:c2c:1" }]]));
}

// ─────────────────────────── tickets (admin) ───────────────────────────

export async function sendAdminTickets(ctx: TelegramSendCtx, page: number): Promise<void> {
  const [total, tickets] = await Promise.all([
    db.supportTicket.count({ where: { status: { in: ["OPEN", "ANSWERED"] } } }),
    db.supportTicket.findMany({
      where: { status: { in: ["OPEN", "ANSWERED"] } },
      orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
      skip: (page - 1) * TICKETS_PER_PAGE,
      take: TICKETS_PER_PAGE,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);
  if (total === 0) {
    await ctx.send("✅ هیچ تیکت بازی ندارید.", kb([[{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]]));
    return;
  }
  const lines = [`🎫 <b>تیکت‌های پشتیبانی</b> — ${fa(total)} مورد`, ""];
  const rows: InlineButton[][] = [];
  for (const t of tickets) {
    const badge = t.status === "OPEN" ? "🟠" : "🟢";
    lines.push(`${badge} <code>${esc(t.ticketNo)}</code> — ${esc(t.subject.slice(0, 40))}`);
    lines.push(`   ${esc(t.user.firstName ?? "")} ${esc(t.user.lastName ?? "")} · آخرین پیام: ${esc(t.messages[0]?.body.slice(0, 50) ?? "—")}`);
    rows.push([{ text: `${badge} ${t.ticketNo}`, callback_data: `a:tk:${t.id}` }]);
  }
  rows.push([{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]);
  await ctx.send(lines.join("\n"), kb(rows));
}

export async function sendAdminTicketThread(ctx: TelegramSendCtx, ticketId: string): Promise<void> {
  const t = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
    },
  });
  if (!t) {
    await ctx.send("😕 تیکت پیدا نشد.");
    return;
  }
  const lines = [
    `🎫 <b>تیکت ${esc(t.ticketNo)}</b> — ${t.status === "OPEN" ? "🟠 در انتظار پاسخ" : t.status === "ANSWERED" ? "🟢 پاسخ داده شده" : "⚪️ بسته"}`,
    `👤 ${esc(t.user.firstName ?? "")} ${esc(t.user.lastName ?? "")} · ${esc(t.user.phone ?? "")}`,
    `📌 ${esc(t.subject)}`,
    "",
  ];
  for (const m of t.messages.slice(-8)) {
    lines.push(`<b>${m.isStaff ? "🛟 پشتیبانی" : "👤 مشتری"}</b> (${fmtDate(m.createdAt)}):`);
    lines.push(esc(m.body.slice(0, 400)));
    lines.push("");
  }
  const rows: InlineButton[][] = [];
  if (t.status !== "CLOSED") {
    rows.push([{ text: "💬 پاسخ به مشتری", callback_data: `a:tr:${t.id}` }]);
  }
  rows.push([{ text: t.status === "CLOSED" ? "🔄 بازگشایی تیکت" : "🔒 بستن تیکت", callback_data: `a:tclose:${t.id}` }]);
  rows.push([{ text: "⬅️ تیکت‌ها", callback_data: "a:tickets:1" }]);
  await ctx.send(lines.join("\n").slice(0, 4000), kb(rows));
}

export async function adminReplyTicket(ctx: TelegramSendCtx, ticketId: string, body: string): Promise<void> {
  const t = await db.supportTicket.findUnique({ where: { id: ticketId }, include: { user: true } });
  if (!t) {
    await setState(ctx.sub, BOT_STATES.IDLE, null);
    await ctx.send("😕 تیکت پیدا نشد.");
    return;
  }
  // staff message on behalf of the linked admin account (or system sender)
  await db.supportTicketMessage.create({
    data: {
      ticketId,
      senderId: ctx.sub.userId,
      isStaff: true,
      body: body.trim().slice(0, 2000),
    },
  });
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "ANSWERED", lastReplyAt: new Date() } });
  await notify(t.userId, "پاسخ پشتیبانی", `تیکت ${t.ticketNo} پاسخ داده شد.`, "SYSTEM", "/account/tickets");
  await setState(ctx.sub, BOT_STATES.IDLE, null);
  await ctx.send("✅ پاسخ ثبت و برای مشتری ارسال شد.", kb([[{ text: "⬅️ تیکت‌ها", callback_data: "a:tickets:1" }]]));
  const { notifyTicketCustomerReply } = await import("./watcher");
  await notifyTicketCustomerReply(ticketId);
}

// ─────────────────────────── broadcast ───────────────────────────

export async function adminBroadcast(ctx: TelegramSendCtx, text: string): Promise<void> {
  const msg = text.trim().slice(0, 3000);
  if (msg.length < 3) {
    await ctx.send("متن پیام خیلی کوتاه است.");
    return;
  }
  await setState(ctx.sub, BOT_STATES.IDLE, null);
  const subs = await db.telegramSubscriber.findMany({ where: { isBlocked: false, notifyNewProducts: true }, select: { chatId: true } });
  await ctx.send(`📣 در حال ارسال به <b>${fa(subs.length)}</b> مشترک…`);
  let sent = 0;
  for (const s of subs.slice(0, 500)) {
    const r = await tgSendMessage(ctx.token, s.chatId, msg, {});
    if (r.ok) sent += 1;
    await new Promise((r2) => setTimeout(r2, 40)); // Telegram flood limits
  }
  await ctx.send(`✅ پیام همگانی برای <b>${fa(sent)}</b> مشترک ارسال شد.`, kb([[{ text: "⬅️ پنل مدیریت", callback_data: "a:menu" }]]));
}

// ─────────────────────────── state/callback routers ───────────────────────────

/** Admin TEXTUAL states — returns true when the message was consumed. */
export async function adminFlowText(ctx: TelegramSendCtx, text: string): Promise<boolean> {
  const sub = ctx.sub;
  switch (sub.state) {
    case BOT_STATES.ADMIN_NOTE: {
      const data = parseStateData<{ orderId: string }>(sub);
      if (!data?.orderId) {
        await setState(sub, BOT_STATES.IDLE, null);
        return true;
      }
      if (/^(انصراف|لغو)$/i.test(text)) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ لغو شد.");
        return true;
      }
      await appendOrderNote(ctx, data.orderId, text);
      return true;
    }
    case BOT_STATES.ADMIN_TICKET_REPLY: {
      const data = parseStateData<{ ticketId: string }>(sub);
      if (!data?.ticketId) {
        await setState(sub, BOT_STATES.IDLE, null);
        return true;
      }
      if (/^(انصراف|لغو)$/i.test(text)) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ لغو شد.");
        return true;
      }
      await adminReplyTicket(ctx, data.ticketId, text);
      return true;
    }
    case BOT_STATES.ADMIN_BROADCAST: {
      if (/^(انصراف|لغو)$/i.test(text)) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ ارسال همگانی لغو شد.");
        return true;
      }
      await adminBroadcast(ctx, text);
      return true;
    }
    case BOT_STATES.ADMIN_REJECT: {
      const data = parseStateData<{ paymentId: string }>(sub);
      if (!data?.paymentId) {
        await setState(sub, BOT_STATES.IDLE, null);
        return true;
      }
      if (/^(انصراف|لغو)$/i.test(text)) {
        await setState(sub, BOT_STATES.IDLE, null);
        await ctx.send("✅ لغو شد.");
        return true;
      }
      await rejectC2c(ctx, data.paymentId, text.trim().slice(0, 300));
      return true;
    }
    default:
      return false;
  }
}

/** Admin photos — reserved for future broadcast-with-image; consumes nothing yet. */
export async function adminFlowPhoto(_ctx: TelegramSendCtx, _msg: TgMessage): Promise<boolean> {
  return false;
}

/** Admin CALLBACK router (data starts with "a:"). */
export async function adminFlowCallback(ctx: TelegramSendCtx, data: string): Promise<void> {
  const parts = data.split(":");
  const a = parts[1] ?? "";
  const b = parts[2];
  const c = parts[3];
  switch (a) {
    case "menu":
      return void (await sendAdminMenu(ctx));
    case "stats":
      return void (await sendAdminStats(ctx));
    case "orders":
      return void (await sendAdminOrders(ctx, b ?? "all", Number(c ?? 1)));
    case "ord":
      return void (await sendAdminOrderDetail(ctx, b ?? ""));
    case "st":
      return void (await setOrderStatus(ctx, b ?? "", (c ?? "").toUpperCase()));
    case "note":
      await ctx.send("📝 یادداشت را برای این سفارش بفرستید:", kb([[{ text: "⬅️ انصراف", callback_data: `a:ord:${b}` }]]));
      await setState(ctx.sub, BOT_STATES.ADMIN_NOTE, { orderId: b });
      return;
    case "sendord": {
      const o = await findOrderById(b ?? "");
      if (!o) return void (await ctx.send("😕 سفارش پیدا نشد."));
      await ctx.send("📋 برای اطلاع مشتری از طریق خود ربات، وضعیت همین‌جا به‌روزرسانی شود؟ (یادداشت/وضعیت بالا همین کار را می‌کند)");
      return;
    }
    case "c2c":
      return void (await sendAdminC2cQueue(ctx, Number(b ?? 1)));
    case "c2cok":
      return void (await approveC2c(ctx, b ?? ""));
    case "c2cno":
      await ctx.send("✍️ دلیل رد این رسید را بنویسید (به مشتری اطلاع داده می‌شود):", kb([[{ text: "⬅️ انصراف", callback_data: "a:c2c:1" }]]));
      await setState(ctx.sub, BOT_STATES.ADMIN_REJECT, { paymentId: b });
      return;
    case "tickets":
      return void (await sendAdminTickets(ctx, Number(b ?? 1)));
    case "tk":
      return void (await sendAdminTicketThread(ctx, b ?? ""));
    case "tr":
      await ctx.send("💬 متن پاسخ به مشتری را بفرستید:", kb([[{ text: "⬅️ انصراف", callback_data: `a:tk:${b}` }]]));
      await setState(ctx.sub, BOT_STATES.ADMIN_TICKET_REPLY, { ticketId: b });
      return;
    case "tclose": {
      const t = await db.supportTicket.findUnique({ where: { id: b ?? "" } });
      if (!t) return void (await ctx.send("😕 تیکت پیدا نشد."));
      const next = t.status === "CLOSED" ? "OPEN" : "CLOSED";
      await db.supportTicket.update({ where: { id: t.id }, data: { status: next } });
      await ctx.send(next === "CLOSED" ? "🔒 تیکت بسته شد." : "🔄 تیکت بازگشایی شد.");
      await sendAdminTicketThread(ctx, t.id);
      return;
    }
    case "bc":
      await ctx.send(
        ["📣 <b>ارسال پیام همگانی</b>", "", "متن پیام را بفرستید تا برای همه مشترکین ربات ارسال شود (حداکثر ۳۰۰۰ حرف):"].join("\n"),
        kb([[{ text: "⬅️ انصراف", callback_data: "a:menu" }]])
      );
      await setState(ctx.sub, BOT_STATES.ADMIN_BROADCAST, {});
      return;
    default:
      await ctx.send("🤔 دکمه نامعتبر.");
  }
}

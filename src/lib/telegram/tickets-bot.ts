/**
 * TAJ Electronics — v33 · Telegram bot TICKETS flow
 * -----------------------------------------------------------------------
 * Customer side: list own tickets (linked account), open a new ticket,
 * reply to a ticket — all from inside Telegram.
 * Admin replies happen in admin.ts (ADMIN_TICKET_REPLY state).
 */

import { db } from "@/lib/db";
import { makeTicketNo } from "@/lib/tickets";
import { esc, fa, kb, parseStateData, setState, shortName, rateLimit, fmtDate } from "./common";
import type { TelegramSendCtx } from "./view-types";
import { BOT_STATES } from "./types";
import type { TelegramBotSettings, TelegramSubscriber } from "@prisma/client";
import type { InlineButton } from "./types";

const threadInclude = {
  user: { select: { firstName: true, lastName: true, phone: true } },
  messages: { orderBy: { createdAt: "asc" as const }, take: 30 },
} as const;

type Thread = {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: Date;
  lastReplyAt: Date;
  user: { firstName: string | null; lastName: string | null; phone: string | null };
  messages: { senderId: string | null; isStaff: boolean; body: string; createdAt: Date }[];
};

export function ticketNeedsAccount(ctx: TelegramSendCtx): boolean {
  return !ctx.sub.userId;
}

export async function sendTicketsMenu(ctx: TelegramSendCtx): Promise<void> {
  if (!ctx.sub.userId) {
    await ctx.send(
      [
        "🎫 <b>پشتیبانی فروشگاه</b>",
        "",
        "برای ثبت و پیگیری تیکت، ابتدا حساب فروشگاه خود را به تلگرام متصل کنید:",
        "📱 شماره موبایل حساب + رمز عبور لازم است.",
      ].join("\n"),
      kb([
        [{ text: "🔌 اتصال حساب", callback_data: "link" }],
        [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }],
      ])
    );
    return;
  }
  const tickets = await db.supportTicket.findMany({
    where: { userId: ctx.sub.userId },
    orderBy: { lastReplyAt: "desc" },
    take: 8,
    select: { id: true, ticketNo: true, subject: true, status: true },
  });
  const lines = ["🎫 <b>پشتیبانی و تیکت‌های شما</b>", ""];
  const rows: InlineButton[][] = [];
  if (tickets.length === 0) {
    lines.push("تیکتی ندارید. با دکمه زیر تیکت جدید ثبت کنید:");
  } else {
    lines.push("<b>تیکت‌های شما:</b>");
    for (const t of tickets) {
      const fa = statusFa(t.status);
      lines.push(`• <code>${esc(t.ticketNo)}</code> — ${esc(t.subject.slice(0, 30))} · ${fa}`);
      rows.push([{ text: `${emoji(t.status)} ${t.ticketNo} · ${t.subject.slice(0, 22)}`, callback_data: `t:${t.id}` }]);
    }
  }
  rows.push([{ text: "➕ ثبت تیکت جدید", callback_data: "tknew" }]);
  rows.push([{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]);
  await ctx.send(lines.join("\n"), kb(rows));
}

function statusFa(s: string): string {
  return s === "OPEN" ? "🟠 در انتظار پاسخ" : s === "ANSWERED" ? "🟢 پاسخ داده شده" : "⚪️ بسته";
}
function emoji(s: string): string {
  return s === "OPEN" ? "🟠" : s === "ANSWERED" ? "🟢" : "⚪️";
}

export async function sendTicketThread(ctx: TelegramSendCtx, ticketId: string): Promise<void> {
  const t = ctx.sub.userId
    ? ((await db.supportTicket.findFirst({ where: { id: ticketId, userId: ctx.sub.userId }, include: threadInclude })) as Thread | null)
    : null;
  if (!t) {
    await ctx.send("😕 تیکت پیدا نشد.");
    return;
  }
  const lines = [
    `🎫 <b>تیکت ${esc(t.ticketNo)}</b> — ${statusFa(t.status)}`,
    `📌 موضوع: ${esc(t.subject)}`,
    "",
  ];
  for (const m of t.messages.slice(-10)) {
    const who = m.isStaff ? "🛟 پشتیبانی" : "👤 شما";
    lines.push(`<b>${who}</b> (${fmtDate(m.createdAt)}):`);
    lines.push(esc(m.body.slice(0, 400)));
    lines.push("");
  }
  const rows: InlineButton[][] = [];
  if (t.status !== "CLOSED") rows.push([{ text: "💬 پاسخ به این تیکت", callback_data: `tr:${t.id}` }]);
  rows.push([{ text: "⬅️ تیکت‌های من", callback_data: "m:tickets" }]);
  await ctx.send(lines.join("\n").slice(0, 4000), kb(rows));
}

/** ── textual state handlers ── */
export async function ticketFlowText(ctx: TelegramSendCtx, state: string, text: string): Promise<void> {
  if (/^(انصراف|لغو)$/i.test(text)) {
    await setState(ctx.sub, BOT_STATES.IDLE, null);
    await ctx.send("✅ عملیات تیکت لغو شد.");
    return;
  }
  switch (state) {
    case BOT_STATES.TK_SUBJECT: {
      const subject = text.trim().slice(0, 120);
      if (subject.length < 3) {
        await ctx.send("📌 موضوع کوتاه است؛ دقیق‌تر بنویسید:");
        return;
      }
      await ctx.send("📝 حالا متن کامل تیکت را بفرستید:");
      await setState(ctx.sub, BOT_STATES.TK_BODY, { subject });
      return;
    }
    case BOT_STATES.TK_BODY: {
      const data = parseStateData<{ subject: string }>(ctx.sub);
      if (!data?.subject || !ctx.sub.userId) {
        await setState(ctx.sub, BOT_STATES.IDLE, null);
        await ctx.send("اطلاعات تیکت ناقص است — دوباره از «🎫 پشتیبانی» شروع کنید.");
        return;
      }
      if (!rateLimit(`tk:${ctx.sub.chatId}`, 10, 3600_000)) {
        await ctx.send("⏳ تعداد تیکت‌های امروز شما به سقف رسیده است.");
        return;
      }
      const body = text.trim().slice(0, 2000);
      const ticket = await db.supportTicket.create({
        data: {
          ticketNo: await makeTicketNo(),
          userId: ctx.sub.userId,
          subject: data.subject,
          status: "OPEN",
          messages: {
            create: {
              senderId: ctx.sub.userId,
              isStaff: false,
              body: `${body}\n\n— ارسال شده از ربات تلگرام`,
            },
          },
        },
      });
      await setState(ctx.sub, BOT_STATES.IDLE, null);
      await ctx.send(
        [
          "✅ <b>تیکت شما ثبت شد!</b>",
          "",
          `🎫 شماره تیکت: <code>${esc(ticket.ticketNo)}</code>`,
          "پشتیبانی به‌زودی پاسخ می‌دهد؛ پاسخ همین‌جا برایتان ارسال می‌شود. 🙏",
        ].join("\n"),
        kb([[{ text: "🎫 تیکت‌های من", callback_data: "m:tickets" }], [{ text: "⬅️ منوی اصلی", callback_data: "m:main" }]])
      );
      // notify admins
      const { notifyAdminsNewTicket } = await import("./watcher");
      await notifyAdminsNewTicket(ticket.id);
      return;
    }
    case BOT_STATES.TK_REPLY: {
      const data = parseStateData<{ ticketId: string }>(ctx.sub);
      if (!data?.ticketId || !ctx.sub.userId) {
        await setState(ctx.sub, BOT_STATES.IDLE, null);
        await ctx.send("تیکت مربوطه پیدا نشد.");
        return;
      }
      const ticket = await db.supportTicket.findFirst({ where: { id: data.ticketId, userId: ctx.sub.userId } });
      if (!ticket) {
        await setState(ctx.sub, BOT_STATES.IDLE, null);
        await ctx.send("😕 تیکت پیدا نشد.");
        return;
      }
      if (ticket.status === "CLOSED") {
        await setState(ctx.sub, BOT_STATES.IDLE, null);
        await ctx.send("⚪️ این تیکت بسته شده است. تیکت جدید ثبت کنید.");
        return;
      }
      await db.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: ctx.sub.userId,
          isStaff: false,
          body: `${text.trim().slice(0, 2000)}\n\n— پاسخ از ربات تلگرام`,
        },
      });
      await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN", lastReplyAt: new Date() },
      });
      await setState(ctx.sub, BOT_STATES.IDLE, null);
      await ctx.send("✅ پاسخ شما به تیکت ارسال شد. پشتیبانی به‌زودی بررسی می‌کند.");
      const { notifyAdminsTicketReply } = await import("./watcher");
      await notifyAdminsTicketReply(ticket.id);
      return;
    }
  }
}

/** ── callback handlers ── */
export async function ticketFlowCallback(ctx: TelegramSendCtx, head: string, arg: string | undefined): Promise<void> {
  switch (head) {
    case "t":
      if (arg) await sendTicketThread(ctx, arg);
      return;
    case "tr": {
      if (!ctx.sub.userId) {
        await ctx.send("ابتدا حساب خود را متصل کنید.", kb([[{ text: "🔌 اتصال حساب", callback_data: "link" }]]));
        return;
      }
      if (!arg) return;
      const ticket = await db.supportTicket.findFirst({ where: { id: arg, userId: ctx.sub.userId } });
      if (!ticket) {
        await ctx.send("😕 تیکت پیدا نشد.");
        return;
      }
      await ctx.send("💬 متن پاسخ خود را بفرستید:", kb([[{ text: "⬅️ انصراف", callback_data: `t:${arg}` }]]));
      await setState(ctx.sub, BOT_STATES.TK_REPLY, { ticketId: arg });
      return;
    }
    case "tknew": {
      if (!ctx.sub.userId) {
        await ctx.send(
          "برای ثبت تیکت ابتدا حساب خود را متصل کنید 👇",
          kb([[{ text: "🔌 اتصال حساب", callback_data: "link" }]])
        );
        await setState(ctx.sub, BOT_STATES.LINK_PHONE, null);
        return;
      }
      await ctx.send("📌 <b>موضوع تیکت</b> را بفرستید (مثلاً: پیگیری سفارش / سوال درباره محصول):", kb([[{ text: "⬅️ انصراف", callback_data: "nx" }]]));
      await setState(ctx.sub, BOT_STATES.TK_SUBJECT, {});
      return;
    }
  }
}

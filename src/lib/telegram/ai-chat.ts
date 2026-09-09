/**
 * TAJ Electronics — v33 · Telegram bot ↔ store AI bridge.
 * Runs the SAME consultation engine as the website chat widget
 * (src/lib/ai.ts runAIChat: deterministic routing, tool calls, LLM, product
 * markers) and renders the final text + product cards in Telegram.
 */

import { esc, kb, fmtDate } from "./common";
import { db } from "@/lib/db";
import { runAIChat, type OrderViewer } from "@/lib/ai";
import { parseStateData, setState } from "./common";
import { tgSendMessage } from "./api";
import type { TelegramSendCtx } from "./view-types";
import { BOT_STATES } from "./types";
import { sendProduct } from "./views";
import type { Prisma } from "@prisma/client";

type HistoryTurn = { role: "user" | "assistant"; content: string };
type AiStateData = { history?: HistoryTurn[] };

export async function aiIntro(ctx: TelegramSendCtx): Promise<void> {
  await ctx.send(
    [
      "🤖 <b>مشاور خرید هوشمند</b>",
      "",
      "هر سوالی درباره محصولات، قیمت‌ها، مقایسه یا پیگیری سفارش دارید بپرسید —",
      "با اطلاعات <b>واقعی و لحظه‌ای فروشگاه</b> جواب می‌دهم.",
      "",
      "مثال‌ها:",
      "• «گوشی زیر ۲۰ میلیون برای بازی چه دارید؟»",
      "• «تفاوت آیفون ۱۵ و گلکسی S24 چیه؟»",
      "• «سفارش TAJ-XXXX-XXXX کجاست؟»",
      "",
      "برای پایان گفتگو /end را بفرستید.",
    ].join("\n"),
    kb([[{ text: "⬅️ پایان گفتگو", callback_data: "nx" }]])
  );
}

export async function handleAITurn(ctx: TelegramSendCtx, userText: string): Promise<void> {
  if (/^(end|خروج|پایان|بستن)$/i.test(userText.trim())) {
    await setState(ctx.sub, BOT_STATES.IDLE, null);
    await ctx.send("✅ گفتگو با مشاور بسته شد. از منوی پایین استفاده کنید.");
    return;
  }

  const data = parseStateData<AiStateData>(ctx.sub) ?? {};
  const history: HistoryTurn[] = [...(data.history ?? []), { role: "user" as const, content: userText }].slice(-12);

  await ctx.send("🤖 …");

  let viewer: OrderViewer | undefined;
  if (ctx.sub.userId) {
    const u = await db.user.findUnique({ where: { id: ctx.sub.userId }, select: { id: true, phone: true, isBlocked: true } });
    if (u && !u.isBlocked) viewer = { id: u.id, phone: u.phone };
  }

  let answer = "";
  let products: { id: string }[] = [];
  try {
    for await (const ev of runAIChat(history, undefined, undefined, viewer)) {
      if (ev.type === "delta") answer += ev.text;
      else if (ev.type === "error") answer = ev.message;
      else if (ev.type === "products") products = (ev.products as { id: string }[]) ?? [];
    }
  } catch (e) {
    console.error("[TG AI]", e);
    answer = "⚠️ مشاور هوشمند موقتاً پاسخگو نیست. لطفاً کمی بعد دوباره بپرسید یا از جستجوی ساده استفاده کنید.";
  }

  if (!answer.trim()) answer = "متوجه نشدم — سوال را دقیق‌تر بپرسید.";

  // persist history (assistant turn too)
  history.push({ role: "assistant", content: answer.slice(0, 800) });
  await setState(ctx.sub, BOT_STATES.AI, { history: history.slice(-12) });

  await tgSendMessage(ctx.token, ctx.chatId, answer.slice(0, 4000), { disablePreview: true });

  // product cards suggested by the AI (max 4)
  for (const p of products.slice(0, 4)) {
    try {
      await sendProduct(ctx, p.id);
    } catch {
      /* product card is best-effort */
    }
  }
}

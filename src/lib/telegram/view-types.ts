/**
 * TAJ Electronics — v33 · Telegram bot view types + local constants
 */

import type { TelegramBotSettings, TelegramSubscriber } from "@prisma/client";
import type { BotCartItem, InlineKeyboard } from "./types";
import { ORDER_STATUS_EMOJI, ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "./types";

export type { InlineKeyboard, BotCartItem, ORDER_STATUS_FA as ORDER_STATUS };

export type { ORDER_STATUS_EMOJI, PAYMENT_STATUS_FA };

/** Everything a view/flow needs to talk to one Telegram chat. */
export type TelegramSendCtx = {
  token: string;
  chatId: string;
  sub: TelegramSubscriber;
  settings: TelegramBotSettings;
  /** pre-parsed cart rows of this subscriber */
  cartItems: BotCartItem[];
  /** send a NEW message */
  send: (text: string, keyboard?: InlineKeyboard | null) => Promise<void>;
  /** edit an existing bot message; returns false when edit failed (caller may re-send) */
  edit: (messageId: number, text: string, keyboard?: InlineKeyboard | null) => Promise<boolean>;
};

export const TICKET_STATUS_FA_LOCAL: Record<string, string> = {
  OPEN: "🟠 در انتظار پاسخ",
  ANSWERED: "🟢 پاسخ داده شده",
  CLOSED: "⚪️ بسته شده",
};

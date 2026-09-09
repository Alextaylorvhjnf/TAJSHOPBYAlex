/**
 * TAJ Electronics — v33 · Telegram bot shared types
 */

export type TgUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
};

export type TgChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  first_name?: string;
  last_name?: string;
  username?: string;
  title?: string;
};

export type TgMessageEntity = { type: string; offset: number; length: number };

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size: number }[]; // ascending sizes
  document?: { file_id: string; file_name?: string; mime_type?: string };
  reply_to_message?: TgMessage;
};

export type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
  my_chat_member?: { chat: TgChat; from: TgUser };
};

/** Inline keyboard — rows of buttons. */
export type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};
export type InlineKeyboard = { rows: InlineButton[][] };

/** In-memory bot cart row (persisted as JSON on TelegramSubscriber.cart). */
export type BotCartItem = {
  productId: string;
  name: string;
  price: number; // effective unit price (Toman)
  qty: number;
  color?: string;
  image?: string | null;
};

/** Checkout form state (JSON on TelegramSubscriber.stateData). */
export type CheckoutForm = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  note?: string;
  paymentMethod?: "ZARINPAL" | "CARD_TO_CARD";
};

export const BOT_STATES = {
  IDLE: "",
  AI: "ai",
  SEARCH: "search",
  LINK_PHONE: "link:phone",
  LINK_PASS: "link:pass",
  CO_NAME: "co:name",
  CO_PHONE: "co:phone",
  CO_PROVINCE: "co:province",
  CO_CITY: "co:city",
  CO_ADDRESS: "co:address",
  CO_POSTAL: "co:postal",
  CO_NOTE: "co:note",
  AWAIT_RECEIPT: "await_receipt",
  TK_SUBJECT: "tk:subject",
  TK_BODY: "tk:body",
  TK_REPLY: "tkreply",
  ADMIN_NOTE: "admin:note",
  ADMIN_TICKET_REPLY: "admin:tkreply",
  ADMIN_BROADCAST: "admin:bc",
  ADMIN_REJECT: "admin:reject",
  COMPARE_SELECT: "cmp",
} as const;

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال پردازش",
  CONFIRMED: "تأیید شده",
  READY_TO_SHIP: "آماده ارسال",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
  REFUNDED: "بازپرداخت شده",
};

export const ORDER_STATUS_EMOJI: Record<string, string> = {
  PENDING_PAYMENT: "⏳",
  PAID: "💰",
  PROCESSING: "⚙️",
  CONFIRMED: "✅",
  READY_TO_SHIP: "📦",
  SHIPPED: "🚚",
  DELIVERED: "🏠",
  CANCELLED: "❌",
  REFUNDED: "↩️",
};

export const PAYMENT_STATUS_FA: Record<string, string> = {
  UNPAID: "پرداخت نشده",
  VERIFYING: "در حال بررسی رسید",
  PAID: "پرداخت شده",
  REJECTED: "رد شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت",
};

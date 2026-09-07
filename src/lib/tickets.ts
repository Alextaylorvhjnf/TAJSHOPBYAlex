import { db } from "@/lib/db";
import { TICKET_STATUSES } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

/**
 * Support-ticket domain helpers (v14.1 ticketing system).
 * Shared by /api/contact, /api/tickets*, /api/admin/tickets*.
 */

const TICKET_NO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

/** Generate the next unique human-friendly ticket number: TCK-XXXXXX */
export async function makeTicketNo(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += TICKET_NO_ALPHABET[Math.floor(Math.random() * TICKET_NO_ALPHABET.length)];
    }
    const ticketNo = `TCK-${code}`;
    const exists = await db.supportTicket.findUnique({ where: { ticketNo }, select: { id: true } });
    if (!exists) return ticketNo;
  }
  // astronomically unlikely — fall back to a cuid-suffixed number
  return `TCK-${Date.now().toString(36).toUpperCase()}`;
}

export const TICKET_STATUS_FA: Record<string, string> = {
  OPEN: "در انتظار پاسخ",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  ANSWERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export function isTicketStatus(v: string): boolean {
  return (TICKET_STATUSES as readonly string[]).includes(v);
}

/** Parsed ticket-message attachment — stored as JSON [{url,name,kind,size}]. */
export type TicketAttachment = {
  url: string;
  name?: string;
  kind?: string; // "image" | "video"
  size?: number;
};

/** Safe-parse a message's attachments JSON column (null when absent/corrupt/empty). */
export function parseTicketAttachments(raw: string | null): TicketAttachment[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const list = parsed.filter(
      (a): a is TicketAttachment =>
        typeof a === "object" && a !== null && typeof (a as { url?: unknown }).url === "string" && (a as { url: string }).url.length > 0
    );
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

/** Ticket list row — all fields the UI needs, nothing more. */
export type TicketRow = {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: string;
  lastReplyAt: string;
  messageCount: number;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  lastMessage: { body: string; isStaff: boolean; createdAt: string; hasAttachments: boolean } | null;
};

const ticketListInclude = {
  user: { select: { firstName: true, lastName: true, phone: true, email: true } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { body: true, isStaff: true, createdAt: true, attachments: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

export function serializeTicketRow(t: {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: Date;
  lastReplyAt: Date;
  user: { firstName: string | null; lastName: string | null; phone: string | null; email: string | null };
  messages: { body: string; isStaff: boolean; createdAt: Date; attachments: string | null }[];
  _count: { messages: number };
}): TicketRow {
  const last = t.messages[0];
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    lastReplyAt: t.lastReplyAt.toISOString(),
    messageCount: t._count.messages,
    userName: `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim() || "کاربر",
    userPhone: t.user.phone,
    userEmail: t.user.email,
    lastMessage: last
      ? {
          body: last.body,
          isStaff: last.isStaff,
          createdAt: last.createdAt.toISOString(),
          // same parse the thread GET uses → indicator can never disagree
          // with the actual rendered attachments
          hasAttachments: parseTicketAttachments(last.attachments) != null,
        }
      : null,
  };
}

export { ticketListInclude };

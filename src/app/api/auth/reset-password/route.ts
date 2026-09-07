import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { resetSchema } from "@/lib/validators";
import { hashPassword, isAdminUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/admin-log";
import { sha256Hex } from "@/lib/crypto-secret";
import crypto from "crypto";

const INVALID_TOKEN = "این لینک بازیابی رمز عبور معتبر نیست یا منقضی شده است.";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`reset:${ip}`, 10, 15 * 60_000).ok) {
    return fail("تلاش‌های زیاد. لطفاً کمی بعد تلاش کنید.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  // v2 lookup: SHA-256 hash of the submitted token (raw token is never stored).
  let record = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256Hex(parsed.data.token) },
  });

  // Legacy fallback: rows created before the hash upgrade stored the raw token.
  // On match the row is transparently upgraded so it never holds the raw token again.
  if (!record) {
    const legacy = await db.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
    if (legacy && !legacy.tokenHash) {
      record = await db.passwordResetToken
        .update({
          where: { id: legacy.id },
          data: { tokenHash: sha256Hex(parsed.data.token), token: `v2:${crypto.randomBytes(16).toString("hex")}` },
        })
        .catch(() => legacy); // concurrent upgrade — keep the legacy row
    }
  }

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    // One generic reason for every invalid case — no technical details (§11).
    return fail(INVALID_TOKEN, 400);
  }

  // Single atomic finalization: mark used first so a concurrent submission
  // with the same token can never reset twice (§10 one-time use).
  const consumed = await db.passwordResetToken
    .updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    .catch(() => ({ count: 0 }));

  if (!consumed || consumed.count === 0) {
    return fail(INVALID_TOKEN, 400);
  }

  // Reuse the application's ONLY password hashing mechanism (§12).
  await db.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  // Password changed → all sessions of the account are terminated (§13).
  await db.session.deleteMany({ where: { userId: record.userId } });

  // In-app confirmation notification (existing Notification model).
  await db.notification
    .create({
      data: {
        userId: record.userId,
        title: "تغییر رمز عبور",
        message: "رمز عبور حساب شما با موفقیت تغییر کرد. اگر این عمل را انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.",
        type: "SYSTEM",
      },
    })
    .catch(() => null);

  const user = await db.user.findUnique({ where: { id: record.userId } }).catch(() => null);
  if (user && isAdminUser(user)) {
    await logAdmin(user.id, "PASSWORD_RESET", { entity: "User", entityId: user.id, ip });
  }

  console.log(`[AUTH] password reset completed (user: ${record.userId})`);

  return ok({ message: "رمز عبور شما با موفقیت تغییر کرد." });
}

import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { c2cReceiptSchema } from "@/lib/validators";
import { saveImageUpload } from "@/lib/upload";
import { rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { notify } from "@/lib/orders";

/** Submit card-to-card payment receipt (multipart/form-data) */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`c2c:${ip}`, 5, 60_000).ok) return fail("درخواست‌های زیاد. کمی بعد تلاش کنید.", 429);

  const user = await getAuthUser();
  const form = await req.formData().catch(() => null);
  if (!form) return fail("فرم ارسال نشده است", 400);

  const file = form.get("receipt");
  if (!(file instanceof File)) return fail("تصویر رسید الزامی است", 400);

  const paidAtRaw = String(form.get("paidAt") ?? "");
  const parsed = c2cReceiptSchema.safeParse({
    orderNumber: String(form.get("orderNumber") ?? ""),
    senderName: String(form.get("senderName") ?? ""),
    senderPhone: String(form.get("senderPhone") ?? ""),
    senderCard: String(form.get("senderCard") ?? "").replace(/\s/g, ""),
    trackingNumber: String(form.get("trackingNumber") ?? "") || null,
    amount: Number(String(form.get("amount") ?? "0").replace(/[^\d]/g, "")),
    paidAt: paidAtRaw,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);

  const order = await db.order.findUnique({ where: { orderNumber: parsed.data.orderNumber.toUpperCase() } });
  if (!order) return fail("سفارش پیدا نشد", 404);
  if (order.paymentMethod !== "CARD_TO_CARD") return fail("این سفارش برای پرداخت کارت به کارت ثبت نشده است", 400);
  if (order.paymentStatus === "PAID") return fail("این سفارش قبلاً پرداخت شده است", 409);

  const existing = await db.cardToCardPayment.findUnique({ where: { orderId: order.id } });
  if (existing && existing.status === "PENDING") {
    return fail("رسید این سفارش در حال بررسی است. نتیجه به‌زودی اعلام می‌شود.", 409);
  }
  if (existing && existing.status === "APPROVED") {
    return fail("پرداخت این سفارش تأیید شده است", 409);
  }

  // ownership: logged-in owner OR phone match OR last-order cookie
  const store = await cookies();
  const lastOrder = store.get("taj_last_order")?.value;
  const authorized =
    (user && order.userId === user.id) ||
    order.phone === parsed.data.senderPhone ||
    (lastOrder === order.orderNumber);
  if (!authorized) return fail("اطلاعات ارسالی با سفارش مطابقت ندارد", 403);

  const upload = await saveImageUpload(file, "receipts");
  if (!upload.ok) return fail(upload.message, 400);

  const paidAt = new Date(parsed.data.paidAt);
  const data = {
    orderId: order.id,
    userId: user?.id ?? order.userId,
    senderName: parsed.data.senderName,
    senderPhone: parsed.data.senderPhone,
    senderCard: parsed.data.senderCard,
    trackingNumber: parsed.data.trackingNumber,
    amount: parsed.data.amount,
    paidAt: isNaN(paidAt.getTime()) ? new Date() : paidAt,
    receiptImage: upload.url,
    status: "PENDING" as const,
  };

  if (existing) {
    await db.cardToCardPayment.update({ where: { id: existing.id }, data });
  } else {
    await db.cardToCardPayment.create({ data });
  }

  await db.order.update({ where: { id: order.id }, data: { paymentStatus: "VERIFYING" } });
  // clear the buyer's cart now that a receipt is pending review
  if (order.userId) {
    await db.cart.deleteMany({ where: { userId: order.userId } }).catch(() => null);
    await notify(order.userId, "رسید دریافت شد", `رسید پرداخت سفارش ${order.orderNumber} دریافت شد و در حال بررسی است.`, "PAYMENT", "/account/orders");
  }

  return ok({ message: "رسید شما با موفقیت ارسال شد و پس از بررسی تأیید می‌شود" });
}

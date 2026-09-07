import { getStoreSettings } from "@/lib/settings";
import { getBaseUrl } from "@/lib/mailer";

/**
 * Branded, RTL, email-client-safe HTML templates (inline CSS, table layout).
 * The raw reset token appears ONLY inside the reset URL — never as plain text.
 */

const GOLD = "#c9a227";
const GOLD_DARK = "#a8861a";
const INK = "#1c1917";
const MUTED = "#78716c";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(opts: {
  preheader: string;
  headerTitle: string;
  headerSub?: string;
  logoUrl?: string | null;
  bodyHtml: string;
  storeName: string;
  storeNameEn: string;
  supportEmail: string;
  supportPhone: string;
}) {
  const logo = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="${escapeHtml(opts.storeName)}" width="52" height="52" style="display:block;border-radius:12px;max-width:52px;max-height:52px" />`
    : `<div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,.18);color:#fff;font-size:26px;line-height:52px;text-align:center;font-weight:800">ت</div>`;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(opts.headerTitle)} — ${escapeHtml(opts.storeName)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Tahoma,'Segoe UI',Arial,sans-serif;direction:rtl">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
  <!-- header -->
  <tr><td style="background:linear-gradient(135deg,${GOLD} 0%,${GOLD_DARK} 100%);background-color:${GOLD};padding:26px 28px">
    <table role="presentation" width="100%"><tr>
      <td style="width:60px;vertical-align:middle">${logo}</td>
      <td style="vertical-align:middle;padding-inline-start:14px">
        <div style="color:#ffffff;font-size:19px;font-weight:800">${escapeHtml(opts.storeName)}</div>
        <div style="color:rgba(255,255,255,.85);font-size:11px;letter-spacing:1px">${escapeHtml(opts.storeNameEn)}</div>
        ${opts.headerSub ? `<div style="color:#ffffff;font-size:14px;font-weight:700;margin-top:8px">${escapeHtml(opts.headerSub)}</div>` : ""}
      </td>
    </tr></table>
  </td></tr>
  <!-- body -->
  <tr><td style="padding:28px 28px 8px;font-size:14px;line-height:2.1;color:${INK}">
    ${opts.bodyHtml}
  </td></tr>
  <!-- footer -->
  <tr><td style="padding:20px 28px 26px;border-top:1px solid #e7e5e4;margin-top:18px">
    <div style="font-size:12px;color:${MUTED};line-height:2;text-align:center">
      ${escapeHtml(opts.storeName)} — ${escapeHtml(opts.storeNameEn)}<br/>
      ${escapeHtml(opts.supportEmail)} &nbsp;|&nbsp; ${escapeHtml(opts.supportPhone)}
    </div>
  </td></tr>
</table>
<div style="max-width:560px;margin:14px auto 0;font-size:11px;color:${MUTED};text-align:center;line-height:1.9">
این ایمیل به‌صورت خودکار ارسال شده است؛ لطفاً به آن پاسخ ندهید.
</div>
</td></tr>
</table>
</body>
</html>`;
}

/** Password-recovery email (the only place the reset URL exists). */
export async function renderPasswordResetEmail(args: {
  req: Request;
  resetToken: string;
  expiresInMinutes: number;
  userName?: string | null;
}): Promise<{ html: string; text: string; subject: string }> {
  const store = await getStoreSettings();
  const base = getBaseUrl(args.req);
  const resetUrl = `${base}/reset-password?token=${args.resetToken}`;
  const greeting = args.userName ? `کاربر گرامی ${escapeHtml(args.userName)}،` : "کاربر گرامی،";
  const expiresInFa = args.expiresInMinutes.toLocaleString("fa-IR");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-weight:800;font-size:16px">بازیابی رمز عبور</p>
    <p style="margin:0 0 18px;color:${MUTED}">${greeting}</p>
    <p style="margin:0 0 18px">درخواستی برای تغییر رمز عبور حساب شما دریافت شده است.<br/>برای انتخاب رمز عبور جدید روی دکمه زیر کلیک کنید:</p>
    <table role="presentation" width="100%" style="margin:6px 0 22px"><tr><td align="center">
      <a href="${resetUrl}"
         style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 44px;border-radius:12px;border-bottom:3px solid ${GOLD_DARK}">
        تغییر رمز عبور
      </a>
    </td></tr></table>
    <p style="margin:0 0 8px;color:${MUTED};font-size:12.5px">اگر دکمه کار نکرد، این نشانی را در مرورگر خود باز کنید:</p>
    <p style="margin:0 0 18px;direction:ltr;text-align:left;word-break:break-all;font-size:11.5px;color:${MUTED}">${resetUrl}</p>
    <p style="margin:0 0 6px;color:${MUTED};font-size:12.5px">این لینک برای مدت محدودی (${expiresInFa} دقیقه) معتبر است و فقط یک بار قابل استفاده است.</p>
    <p style="margin:0;color:${MUTED};font-size:12.5px">اگر این درخواست توسط شما ارسال نشده است، این ایمیل را نادیده بگیرید — رمز عبور شما تغییری نمی‌کند.</p>`;

  const text = [
    `${store.storeName} — بازیابی رمز عبور`,
    "",
    greeting,
    "درخواستی برای تغییر رمز عبور حساب شما دریافت شده است.",
    "برای انتخاب رمز عبور جدید از نشانی زیر استفاده کنید:",
    resetUrl,
    "",
    `این لینک برای مدت محدودی (${expiresInFa} دقیقه) معتبر است و فقط یک بار قابل استفاده است.`,
    "اگر این درخواست توسط شما ارسال نشده است، این ایمیل را نادیده بگیرید.",
  ].join("\n");

  return {
    html: shell({
      preheader: "بازیابی رمز عبور — لینک محدود و یک‌بارمصرف",
      headerTitle: "بازیابی رمز عبور",
      logoUrl: store.logo ? absolutize(store.logo, base) : null,
      bodyHtml,
      storeName: store.storeName,
      storeNameEn: store.storeNameEn,
      supportEmail: store.email,
      supportPhone: store.phone,
    }),
    text,
    subject: `بازیابی رمز عبور — ${store.storeName}`,
  };
}

/** Test email sent from Admin Panel → تنظیمات → ایمیل و SMTP. */
export async function renderTestEmail(args: { req: Request }): Promise<{ html: string; text: string; subject: string }> {
  const store = await getStoreSettings();
  const base = getBaseUrl(args.req);
  const bodyHtml = `
    <p style="margin:0 0 6px;font-weight:800;font-size:16px">ایمیل آزمایشی</p>
    <p style="margin:0 0 18px">این یک ایمیل آزمایشی از تنظیمات SMTP فروشگاه <b>${escapeHtml(store.storeName)}</b> است.</p>
    <p style="margin:0;color:${MUTED};font-size:12.5px">اگر این ایمیل را دریافت کرده‌اید، تنظیمات ایمیل فروشگاه به‌درستی کار می‌کند.</p>`;
  const text = `ایمیل آزمایشی از ${store.storeName}\nاگر این ایمیل را دریافت کرده‌اید، تنظیمات SMTP به‌درستی کار می‌کند.`;
  return {
    html: shell({
      preheader: "ایمیل آزمایشی تنظیمات SMTP",
      headerTitle: "ایمیل آزمایشی",
      logoUrl: store.logo ? absolutize(store.logo, base) : null,
      bodyHtml,
      storeName: store.storeName,
      storeNameEn: store.storeNameEn,
      supportEmail: store.email,
      supportPhone: store.phone,
    }),
    text,
    subject: `ایمیل آزمایشی — ${store.storeName}`,
  };
}

function absolutize(url: string, base: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

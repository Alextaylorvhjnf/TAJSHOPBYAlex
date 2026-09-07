import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSmtpSettings, getStoreSettings } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto-secret";

/**
 * Real SMTP delivery (nodemailer) driven entirely by Admin-Panel settings
 * (تنظیمات → ایمیل و SMTP). Nothing SMTP-related is hard-coded.
 *
 * The stored SMTP password is AES-256-GCM encrypted at rest and is decrypted
 * only here, server-side — it is never returned to any client.
 */

export type SmtpSecurity = "NONE" | "STARTTLS" | "SSL_TLS";

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string | null; // decrypted, server-side only
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
};

/** true when the stored settings are enabled AND contain the minimum required fields */
export function isSmtpConfigured(s: {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string | null;
  fromEmail: string;
}): boolean {
  return (
    s.enabled &&
    s.host.trim().length > 0 &&
    Number.isFinite(s.port) &&
    s.port > 0 &&
    s.port <= 65535 &&
    s.username.trim().length > 0 &&
    !!s.password &&
    s.fromEmail.trim().length > 3
  );
}

/** Read + decrypt the stored SMTP settings into a server-side config object. */
export async function resolveSmtpConfig(): Promise<SmtpConfig> {
  const s = await getSmtpSettings();
  return {
    enabled: s.enabled,
    host: s.host.trim(),
    port: s.port,
    security: (["NONE", "STARTTLS", "SSL_TLS"].includes(s.security) ? s.security : "STARTTLS") as SmtpSecurity,
    username: s.username,
    password: decryptSecret(s.password),
    fromName: s.fromName,
    fromEmail: s.fromEmail,
    replyTo: s.replyTo || null,
  };
}

function buildTransport(cfg: Pick<SmtpConfig, "host" | "port" | "security" | "username" | "password">): Transporter {
  // v28: port/security auto-reconciliation — the #1 real-world misconfig.
  // SMTP convention: 465 = implicit TLS, 587/25/2525 = STARTTLS. When the two
  // disagree (e.g. security=SSL_TLS on port 587) every send fails with
  // ECONNREFUSED/greeting-timeout even though the credentials are perfect.
  // The port wins (it is what the server actually speaks), and the
  // correction is logged so misconfigurations remain visible.
  let secure = cfg.security === "SSL_TLS"; // implicit TLS (typically port 465)
  let requireTLS = cfg.security === "STARTTLS"; // upgrade a plain connection (typically port 587)
  if (cfg.port === 465 && !secure) {
    secure = true;
    requireTLS = false;
    console.log(`[SMTP] port 465 → implicit TLS (security was ${cfg.security}, auto-corrected)`);
  } else if ((cfg.port === 587 || cfg.port === 25 || cfg.port === 2525) && secure) {
    secure = false;
    requireTLS = true;
    console.log(`[SMTP] port ${cfg.port} → STARTTLS (security was ${cfg.security}, auto-corrected)`);
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure,
    requireTLS, // upgrade a plain connection (typically port 587)
    auth: cfg.password ? { user: cfg.username, pass: cfg.password } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });
}

export type SmtpTestResult = { success: boolean; message: string };

/** Open a real SMTP connection and authenticate (transporter.verify). */
export async function smtpTestConnection(cfg: SmtpConfig): Promise<SmtpTestResult> {
  if (!cfg.host || !cfg.port) {
    return { success: false, message: "Host و Port الزامی هستند" };
  }
  try {
    const transporter = buildTransport(cfg);
    await transporter.verify();
    return { success: true, message: "اتصال SMTP با موفقیت برقرار شد" };
  } catch (err) {
    // full technical reason stays in server logs; user gets a safe, actionable message
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`[SMTP] connection test failed (host: ${cfg.host}:${cfg.port}): ${reason}`);
    const isAuth = /EAUTH|535|authentication|authoriz/i.test(reason);
    return {
      success: false,
      message: isAuth
        ? "احراز هویت SMTP ناموفق بود — نام کاربری و رمز عبور را بررسی کنید"
        : "اتصال SMTP برقرار نشد. لطفاً Host، Port، نام کاربری، رمز عبور و نوع امنیت را بررسی کنید",
    };
  }
}

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** v28: map a nodemailer failure to a precise, actionable Persian diagnosis.
 *  The REAL server response is always quoted (never hidden) — the #1 cause of
 *  "اتصال موفق ولی ارسال ناموفق" is an envelope problem the verify() test
 *  can never see (verify only connects + authenticates; sendMail adds the
 *  MAIL FROM / RCPT TO / DATA phases). */
export function diagnoseSmtpSendError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = Number((err as { responseCode?: number })?.responseCode ?? (raw.match(/\b(5\d{2}|4\d{2})\b/)?.[1] ?? 0));
  const resp = raw.replace(/\s+/g, " ").trim();

  // sender/from rejected — the classic Gmail & shared-hosting behavior:
  // verify() passes but MAIL FROM is refused because fromEmail is not a
  // mailbox of the authenticated account
  if (/sender|from address|mail from must equal|not owned by|553|550 5\.7\.[13]/i.test(resp) && /reject|not|fail|denied|invalid|must equal|owned/i.test(resp)) {
    return `سرور SMTP فرستنده (From) را رد کرد — آدرس «از» باید یکی از صندوق‌های همان حساب SMTP باشد. پاسخ سرور: ${resp.slice(0, 200)}`;
  }
  if (code === 550 && /user unknown|no such|recipient|recipient address|mailbox/i.test(resp)) {
    return `آدرس گیرنده توسط سرور پذیرفته نشد (550) — ایمیل مقصد را بررسی کنید. پاسخ سرور: ${resp.slice(0, 200)}`;
  }
  if (code === 550 || /relay|relaying/i.test(resp)) {
    return `سرور SMTP ارسال به این گیرنده را رد کرد (Relay ممنوع — معمولاً گیرنده خارج از دامنهٔ سرور است و relay باز نیست). پاسخ سرور: ${resp.slice(0, 200)}`;
  }
  if (code === 554 || /blacklist|spam|blocked/i.test(resp)) {
    return `پیام توسط سرور/گیرنده مسدود شد (Anti-Spam/Blacklist). پاسخ سرور: ${resp.slice(0, 200)}`;
  }
  if (code === 552) {
    return `حجم پیام بیش از حد مجاز سرور است (552). پاسخ سرور: ${resp.slice(0, 200)}`;
  }
  if (/EAUTH|535|authentication/i.test(resp)) {
    return "احراز هویت SMTP در حین ارسال ناموفق بود — نام کاربری و رمز عبور را بررسی کنید.";
  }
  if (/ETIMEDOUT|timeout|ESOCKET/i.test(resp)) {
    return `پاسخ سرور در حین ارسال قطع شد (Timeout) — معمولاً فایروال یا محدودیت Host. جزئیات: ${resp.slice(0, 200)}`;
  }
  if (/ECONNECTION|ECONNREFUSED|EHOSTUNREACH|ENOTFOUND/i.test(resp)) {
    return "اتصال به سرور SMTP در حین ارسال قطع شد — Host و Port را بررسی کنید.";
  }
  return `خطای SMTP در حین ارسال: ${resp.slice(0, 260)}`;
}

/** v28: does this failure look like the server rejecting the From address?
 *  (sender rejected / not owned by the authenticated user) — such failures
 *  are safely retryable with the authenticated USERNAME as the sender. */
function isSenderRejection(reason: string): boolean {
  return (
    /\b553\b/.test(reason) ||
    /sender (address )?(rejected|not accepted|not permitted)/i.test(reason) ||
    /mail from must equal authorized user/i.test(reason) ||
    /not owned by|does not match the account|mismatch.*sender|sender.*mismatch/i.test(reason)
  );
}

/** Send an email through the configured SMTP server. Throws on failure.
 *  v28: when the server rejects the configured From address (the classic
 *  «تست اتصال موفق ولی ارسال ناموفق» — Gmail/shared hosts require
 *  MAIL FROM = authenticated username), the send is automatically retried
 *  ONCE with the username as the sender and replyTo preserved, so mail
 *  delivery still works; the admin keeps a clear log line. */
export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const cfg = await resolveSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  const store = await getStoreSettings();
  const fromName = cfg.fromName || store.storeName || store.storeNameEn || store.storeName;
  const transporter = buildTransport(cfg);
  const base = {
    to: args.to,
    replyTo: cfg.replyTo || undefined,
    subject: args.subject,
    html: args.html,
    text: args.text ?? undefined,
  };
  try {
    await transporter.sendMail({ ...base, from: `"${fromName}" <${cfg.fromEmail}>` });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // From-address rejection → retry once with the authenticated username
    if (cfg.username && cfg.username.includes("@") && isSenderRejection(reason)) {
      console.warn(`[SMTP] From <${cfg.fromEmail}> rejected (${reason.slice(0, 160)}) — retrying with authenticated username <${cfg.username}>`);
      try {
        await transporter.sendMail({
          ...base,
          from: `"${fromName}" <${cfg.username}>`,
          replyTo: cfg.replyTo || cfg.fromEmail || undefined,
        });
        console.log(`[SMTP] delivered via username-sender fallback <${cfg.username}>`);
        return;
      } catch (err2) {
        transporter.close();
        throw new Error(diagnoseSmtpSendError(err2));
      }
    }
    transporter.close();
    throw new Error(diagnoseSmtpSendError(err));
  }
  transporter.close();
}

/**
 * Production base URL — NEVER hard-coded.
 * Priority: NEXT_PUBLIC_SITE_URL (when it points at a real deployment) →
 * request Host / X-Forwarded-* headers (proxies, PaaS, cPanel) → localhost.
 */
export function getBaseUrl(req: Request): string {
  const envUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (/^https?:\/\//i.test(envUrl) && !/localhost|127\.0\.0\.1/i.test(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && !/^\d+\.\d+\.\d+\.\d+$/.test(host.split(":")[0] ?? "")) {
    const isLocal = /localhost|127\.0\.0\.1/i.test(host);
    const proto = req.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }
  return envUrl ? envUrl.replace(/\/+$/, "") : "http://localhost:3000";
}

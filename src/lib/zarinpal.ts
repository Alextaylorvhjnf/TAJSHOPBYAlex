/** ZarinPal Payment Gateway — v4 API (https://payment.zarinpal.com/pg/v4/payment)
 *
 * v19: full alignment with the official ZarinPal v4 integration guide —
 * optional `currency` (IRR = amounts in Rials, the default/legacy behavior
 * of this app; IRT = amounts in Tomans) and optional `referrer_id`
 * (کد معرف) are forwarded exactly as documented, and verify() must be
 * called with the SAME amount/unit that the request was created with
 * (code 100 = success, 101 = already verified). */

export type ZarinPalCurrency = "IRR" | "IRT";

export type ZarinPalConfig = {
  merchantId: string;
  sandbox: boolean;
  /** v19: IRR (default) or IRT — see the currency row in the v4 docs */
  currency?: ZarinPalCurrency;
  /** v19: optional referrer_id (کد معرف) */
  referrerId?: string;
};

export type ZarinPalRequestResult = {
  success: boolean;
  authority?: string;
  code?: number;
  message?: string;
  paymentUrl?: string;
  raw?: unknown;
};

export type ZarinPalVerifyResult = {
  success: boolean;
  code?: number;
  refId?: string;
  cardPan?: string;
  message?: string;
  raw?: unknown;
};

function base(cfg: ZarinPalConfig) {
  return cfg.sandbox ? "https://sandbox.zarinpal.com/pg/v4/payment" : "https://payment.zarinpal.com/pg/v4/payment";
}

function startPayBase(cfg: ZarinPalConfig) {
  return cfg.sandbox ? "https://sandbox.zarinpal.com/pg/StartPay" : "https://payment.zarinpal.com/pg/StartPay";
}

/** Convert a store total (TOMAN) into the gateway amount for the configured
 *  currency unit: IRT → as-is (Tomans), IRR → ×10 (Rials). */
export function zarinpalGatewayAmount(totalToman: number, currency: ZarinPalCurrency = "IRR"): number {
  return currency === "IRT" ? Math.round(totalToman) : Math.round(totalToman * 10);
}

/** Create a payment request. `amount` must be in the CONFIGURED unit
 *  (Rials for IRR — use zarinpalGatewayAmount(); Tomans for IRT). */
export async function zarinpalRequest(
  cfg: ZarinPalConfig,
  params: {
    amount: number;
    callbackUrl: string;
    description: string;
    mobile?: string;
    email?: string;
    orderId?: string;
  }
): Promise<ZarinPalRequestResult> {
  try {
    const res = await fetch(`${base(cfg)}/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: cfg.merchantId,
        amount: params.amount,
        currency: cfg.currency ?? "IRR",
        description: params.description,
        callback_url: params.callbackUrl,
        ...(cfg.referrerId ? { referrer_id: cfg.referrerId } : {}),
        metadata: { mobile: params.mobile, email: params.email, order_id: params.orderId },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      data?: { authority?: string; code?: number; message?: string } | null;
      errors?: { code?: number; message?: string } | unknown[] | null;
    };
    const authority = json?.data?.authority;
    const code = json?.data?.code;
    if (authority && code === 100) {
      return {
        success: true,
        authority,
        code,
        paymentUrl: `${startPayBase(cfg)}/${authority}`,
        raw: json,
      };
    }
    const errMsg =
      (json?.data && typeof json.data === "object" && "message" in json.data && json.data.message) ||
      (Array.isArray(json?.errors) && json.errors[0] && (json.errors[0] as { message?: string }).message) ||
      "درگاه پرداخت در دسترس نیست";
    return { success: false, code, message: String(errMsg), raw: json };
  } catch (e) {
    return { success: false, message: "ارتباط با درگاه پرداخت برقرار نشد", raw: String(e) };
  }
}

/** Verify a payment. `amount` must equal the amount of the ORIGINAL request
 *  (same currency unit). code 100 = success, 101 = already verified. */
export async function zarinpalVerify(
  cfg: ZarinPalConfig,
  params: { amount: number; authority: string }
): Promise<ZarinPalVerifyResult> {
  try {
    const res = await fetch(`${base(cfg)}/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: cfg.merchantId,
        amount: params.amount,
        authority: params.authority,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      data?: { code?: number; ref_id?: number | string; card_pan?: string; message?: string } | null;
      errors?: { code?: number; message?: string }[] | null;
    };
    const code = json?.data?.code;
    if (code === 100 || code === 101) {
      return {
        success: true,
        code,
        refId: json?.data?.ref_id ? String(json.data.ref_id) : undefined,
        cardPan: json?.data?.card_pan ?? undefined,
        raw: json,
      };
    }
    const errMsg =
      json?.data?.message ||
      (Array.isArray(json?.errors) && json.errors[0]?.message) ||
      "تراکنش تأیید نشد";
    return { success: false, code, message: String(errMsg), raw: json };
  } catch (e) {
    return { success: false, message: "ارتباط با درگاه پرداخت برقرار نشد", raw: String(e) };
  }
}

/** Lightweight connectivity/credentials test for admin panel */
export async function zarinpalTest(cfg: ZarinPalConfig): Promise<{ success: boolean; message: string; code?: number }> {
  const r = await zarinpalRequest(cfg, {
    amount: 10000,
    callbackUrl: "https://example.com/callback",
    description: "تست اتصال درگاه تاج الکترونیکس",
  });
  if (r.success) return { success: true, message: `اتصال موفق (کد ${r.code}) — Authority: ${r.authority?.slice(0, 12)}…` };
  return { success: false, message: r.message ?? "اتصال ناموفق", code: r.code };
}

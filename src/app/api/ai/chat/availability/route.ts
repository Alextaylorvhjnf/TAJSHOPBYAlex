import { ok } from "@/lib/api";
import { getAISettings } from "@/lib/settings";

/**
 * Public lightweight AI availability check (no secrets exposed).
 * v22: also reports the widget MODE —
 *   • mode "pro"   → the admin placed a GapGPT API key → the widget presents
 *                    itself as the full "Shop Agent Pro" (LLM-powered consults
 *                    on top of the always-on deterministic engine)
 *   • mode "smart" → no key → the smart deterministic engine still answers
 *                    product/price/stock/tracking questions by itself
 */
export async function GET() {
  const settings = await getAISettings();
  // v28: pro mode = a GapGPT key is wired (legacy provider rows count too)
  const pro =
    settings.enabled &&
    !!settings.gapApiKey?.trim() &&
    (settings.provider === "gapgpt" ||
      settings.provider === "openai" ||
      settings.provider === "gemini" ||
      settings.provider === "auto");
  return ok({
    enabled: settings.enabled,
    mode: pro ? "pro" : "smart",
    provider: settings.provider,
  });
}

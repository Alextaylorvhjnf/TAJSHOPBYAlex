import { db } from "@/lib/db";
import { ok, fail, getClientIp } from "@/lib/api";
import { getAdminUser, SETTINGS_WRITE } from "@/lib/auth";
import { aiSettingsSchema } from "@/lib/validators";
import { getAISettings, getStoreSettings, invalidateSettingsCache } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  const settings = await getAISettings();
  /* v29: the chat-widget logo fields live on StoreSettings (they affect the
   * storefront widget, not the AI provider) but are managed from this tab. */
  const store = await getStoreSettings();
  return ok({
    settings: {
      ...settings,
      // never expose the full key to the client — only a masked hint
      gapApiKey: settings.gapApiKey ? `${settings.gapApiKey.slice(0, 6)}••••${settings.gapApiKey.slice(-4)}` : null,
      hasGapKey: !!settings.gapApiKey,
      aiWidgetLogo: store.aiWidgetLogo ?? null,
      templateAiLogos: store.templateAiLogos ?? null,
    },
  });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("دسترسی غیرمجاز", 401);
  if (!SETTINGS_WRITE.includes(admin.role as never)) return fail("دسترسی لازم را ندارید", 403);

  const body = await req.json().catch(() => null);
  const parsed = aiSettingsSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  const d = parsed.data;

  const current = await getAISettings();
  // keep the existing key if the client sends the masked placeholder back
  const data = { ...d } as Record<string, unknown>;
  if (typeof d.gapApiKey === "string" && /•/.test(d.gapApiKey)) {
    delete data.gapApiKey;
  }
  if (d.gapApiKey === "") data.gapApiKey = null;
  // v28: switching to the GapGPT provider clears the removed legacy
  // providers' keys so nothing stale keeps answering
  if (d.provider === "gapgpt") {
    data.openaiApiKey = null;
    data.geminiApiKey = null;
  }

  /* v29: pull the widget-logo fields OUT of the AiSettings payload — they
   * belong to StoreSettings (the AI tab edits them in place). */
  const { aiWidgetLogo, templateAiLogos, ...aiData } = data as Record<string, unknown>;

  await db.aiSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...aiData },
    update: aiData,
  });

  /* v29: persist the chat-widget logo + its per-template map on the store
   * settings row (only when the client actually sent the fields — the tab
   * always sends them together with the rest of the form). */
  if (aiWidgetLogo !== undefined || templateAiLogos !== undefined) {
    const storeUpdate: Record<string, unknown> = {};
    if (aiWidgetLogo !== undefined) storeUpdate.aiWidgetLogo = (aiWidgetLogo as string) || null;
    if (templateAiLogos !== undefined) {
      const raw = String(templateAiLogos ?? "").trim();
      storeUpdate.templateAiLogos = raw || null;
    }
    await db.storeSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...storeUpdate },
      update: storeUpdate,
    });
  }
  invalidateSettingsCache();
  await logAdmin(admin.id, "SETTINGS_AI_UPDATE", { entity: "AISettings", metadata: { provider: d.provider ?? current.provider }, ip: getClientIp(req) });
  return ok({ message: "تنظیمات هوش مصنوعی ذخیره شد" });
}

import { ok, fail, getClientIp } from "@/lib/api";
import { chatSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { getAISettings } from "@/lib/settings";
import { runAIChat, buildProductContext, type OrderViewer } from "@/lib/ai";
import { logSystemEvent } from "@/lib/admin-log";
import { getAuthUser } from "@/lib/auth";

/** AI chat — Server-Sent Events stream with tool calling */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`chat:${ip}`, 15, 60_000).ok) {
    return fail("پیام‌های زیاد در مدت کوتاه. کمی صبر کنید.", 429);
  }

  const settings = await getAISettings();
  if (!settings.enabled) return fail("دستیار هوشمند فعال نیست", 503, "AI_DISABLED");

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return fail("درخواست نامعتبر است", 400);

  const { messages, context } = parsed.data;

  let productContext: string | null = null;
  if (context?.productId) {
    productContext = await buildProductContext(context.productId);
  }
  // v23: AI-compare request (product page → مقایسه → هوش مصنوعی) — build the
  // second product's context and a side-by-side directive so the LLM compares
  // the two from REAL store data. The deterministic fallback path (no LLM)
  // receives compareWithId separately and emits a full comparison too.
  if (context?.compareWithId && context?.productId) {
    const second = await buildProductContext(context.compareWithId);
    if (second) {
      productContext = `${productContext ?? ""}\n\n## محصول مقایسه (کاربر خواسته این دو را مقایسه کنید):\n${second}\n\n### دستور ویژه مقایسه:
پاسخ باید یک مقایسه ساخت‌یافته بین «محصول زمینه» و «محصول مقایسه» باشد: تفاوت‌های کلیدی قیمت/مشخصات/موجودی/امتیاز، جمع‌بندی صادقانه و اینکه هر کدام برای چه کاربری مناسب‌تر است. فقط از داده‌های همین زمینه استفاده کن.`;
    }
  }

  // v22: the logged-in viewer (the session cookie rides along on this
  // same-origin fetch) — lets order tracking auto-match the customer's OWN
  // orders with zero friction (no phone prompt). Never exposed in the body.
  let viewer: OrderViewer | undefined;
  try {
    const user = await getAuthUser();
    if (user && !user.isBlocked) {
      viewer = { id: user.id, phone: user.phone };
    }
  } catch {
    /* anonymous chat stays fully supported */
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of runAIChat(messages, productContext ?? undefined, context?.productId ?? undefined, viewer, context?.compareWithId ?? undefined)) {
          send(event);
        }
      } catch (e) {
        send({ type: "error", message: "خطای غیرمنتظره در پردازش گفتگو" });
        console.error("[AI CHAT]", e);
        // v20: unexpected chat-pipeline failures also land in the admin
        // activity log (analyzed) — "say it to the admin in the log field"
        await logSystemEvent("AI_ERROR", {
          entity: "ai",
          ip,
          metadata: {
            stage: "chat-stream",
            error: String(e instanceof Error ? e.message : e).slice(0, 220),
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

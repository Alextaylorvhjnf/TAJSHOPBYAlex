"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/lib/stores";
import { useCart } from "@/hooks/use-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkles, X, SendHorizonal, ShoppingCart, Crown, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWidgetSkin, getWidgetAvatar, isFarsiStoreName, storeMonogram, WIDGET_SKIN_CSS } from "./widget-skins";

type ChatProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  stock: number;
  image: string | null;
  rating: number;
  brand: string;
};

type Message =
  | { id: string; role: "user"; text: string; products?: ChatProduct[] }
  | { id: string; role: "assistant"; text: string; products?: ChatProduct[] };

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Footer-aware lift (v15): the floating widget used to sit ON TOP of the
 * footer's copyright bar (covering the Alaruz Design credit) once the user
 * scrolled to the page bottom. We measure how much of the
 * `[data-copyright-bar]` element is inside the viewport (scroll/resize,
 * rAF-throttled) and lift the floating button + chat panel by exactly that
 * amount — capped so an unusually tall bar can never push the widget out
 * of reach.
 */
function useFooterOverlap(cap = 150) {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const bar = document.querySelector<HTMLElement>("[data-copyright-bar]");
      if (!bar) {
        setOverlap(0);
        return;
      }
      const rect = bar.getBoundingClientRect();
      const visible = Math.min(Math.max(0, window.innerHeight - rect.top), rect.height);
      setOverlap(Math.min(visible, cap));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [cap]);
  return overlap;
}

/** safe mini-markdown (bold + internal links + lists) — no HTML injection.
 *  v22: [text](/internal-path) markdown links render as real Links; only
 *  relative in-app paths are honored (external/JS URLs stay plain text). */
const MD_LINK_RE = /\[([^\]]+)\]\((\/[^()\s]*)\)/g;

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isBullet = /^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed);
        const content = trimmed.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
        // split on bold segments, then on safe internal links inside each
        const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const rendered = parts.flatMap<ReactNode>((p, j) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return [<strong key={j} className="font-bold text-primary">{p.slice(2, -2)}</strong>];
          }
          // 2 capture groups → [text, label, href, text, label, href, …]
          const segments = p.split(MD_LINK_RE);
          const out: ReactNode[] = [];
          for (let k = 0; k < segments.length; k += 3) {
            if (segments[k]) out.push(<span key={`${j}-${k}`}>{segments[k]}</span>);
            const label = segments[k + 1];
            const href = segments[k + 2];
            if (label !== undefined && href !== undefined) {
              out.push(
                <Link key={`${j}-${k}-l`} href={href} className="font-bold text-primary underline underline-offset-2 hover:opacity-80">
                  {label || href}
                </Link>
              );
            }
          }
          return out.length > 0 ? out : [<span key={j} />];
        });
        if (isBullet) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span className="leading-6">{rendered}</span>
            </div>
          );
        }
        if (trimmed === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="leading-6">
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

function ProductCardsInChat({ products }: { products: ChatProduct[] }) {
  const { add } = useCart();
  return (
    <div className="space-y-2 mt-2">
      {products.map((p) => (
        <div key={p.id} className="rounded-xl border bg-card overflow-hidden group">
          <div className="flex gap-3 p-2.5">
            <Link href={`/products/${p.slug}`} className="relative h-16 w-16 shrink-0 rounded-lg bg-muted/50 overflow-hidden">
              {p.image ? (
                <Image src={p.image} alt={p.name} fill sizes="64px" className="object-contain p-1" />
              ) : (
                <span className="grid h-full place-items-center text-muted-foreground"><Package className="h-5 w-5" /></span>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/products/${p.slug}`} className="block text-xs font-bold leading-5 line-clamp-2 hover:text-primary transition-colors">
                {p.name}
              </Link>
              <p className="text-[11px] text-muted-foreground mt-0.5">{p.brand}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-extrabold text-primary tabular-nums">
                  {formatPrice(p.discountPrice ?? p.price)}
                  <span className="text-[10px] font-normal text-muted-foreground"> تومان</span>
                </span>
                <span className={cn("text-[10px] font-bold", p.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {p.stock > 0 ? `موجود (${p.stock.toLocaleString("fa-IR")})` : "ناموجود"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t divide-x divide-x-reverse">
            <Button
              asChild
              variant="ghost"
              className="h-8 rounded-none text-[11px] font-bold hover:bg-primary/10 hover:text-primary"
            >
              <Link href={`/products/${p.slug}`}>مشاهده محصول</Link>
            </Button>
            <Button
              onClick={() => add.mutate({ productId: p.id, quantity: 1 })}
              disabled={p.stock <= 0 || add.isPending}
              variant="ghost"
              className="h-8 rounded-none text-[11px] font-bold hover:bg-primary/10 hover:text-primary"
            >
              <ShoppingCart className="h-3.5 w-3.5 me-1" /> افزودن به سبد
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const QUICK_SUGGESTIONS_SMART = [
  "پرفروش‌ترین گوشی‌ها رو بگو",
  "لپ‌تاپ گیمینگ تا ۶۰ میلیون",
  "سفارشم کجاست؟",
];
const QUICK_SUGGESTIONS_PRO = [
  "مخصوص بودجه‌م مشاوره خرید بده",
  "گلکسی A55 رنگ آبی چنده؟",
  "سفارشم رو پیگیری کن",
];

export function ChatWidget({
  storeName,
  templateId,
  aiLogo,
}: {
  storeName?: string;
  templateId?: string;
  /** v29: admin-uploaded AI-widget logo (Settings → AI → «لوگوی دستیار
   *  هوشمند») — when set it replaces the template's assistant art on the
   *  FAB, panel header and empty state. null = per-template design. */
  aiLogo?: string | null;
} = {}) {
  const { open, setOpen, productContext, clearContext, unread, consultSeq, comparePair, compareSeq, clearCompare, bumpUnread } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  /** v29.2: LIVE logo — polls /api/ai/widget-logo so an admin-uploaded logo
   *  appears on the storefront WITHOUT a browser refresh (the server-computed
   *  `aiLogo` prop only updates on the next full page render). Initialized
   *  from the prop, then kept fresh by the poller below. */
  const [liveLogo, setLiveLogo] = useState<string | null | undefined>(aiLogo);
  /** v22: "pro" = GapGPT key placed (Shop Agent Pro) · "smart" = the
   *  deterministic engine alone — both modes fully answer catalog +
   *  order-tracking questions. */
  const [aiMode, setAiMode] = useState<"pro" | "smart">("smart");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const handledConsultRef = useRef(0);
  const footerOverlap = useFooterOverlap();

  useEffect(() => {
    setLiveLogo(aiLogo);
  }, [aiLogo]);

  /* ── v29.2: live logo poller ──────────────────────────────────
   * Every ~6s while the tab is VISIBLE (+ immediately on window focus)
   * fetch the resolved widget logo. When the admin saves a new logo in
   * Settings → AI, the storefront FAB/panel header swaps within seconds —
   * no refresh. Offline/pre-install failures keep the current value. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/ai/widget-logo", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { logo?: string | null };
        if (!cancelled && typeof j.logo !== "undefined") setLiveLogo(j.logo);
      } catch {
        /* offline — keep showing whatever we have */
      }
    };
    const id = window.setInterval(poll, 6_000);
    window.addEventListener("focus", poll);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", poll);
    };
  }, []);

  /* ── v23: proactive cart reminder ─────────────────────────────
   * "you put a product in your cart — time to shine and buy!" — when the
   * visitor has items waiting, the widget gently pings them once per cart
   * state (max twice a session): an injected assistant message + unread
   * badge + a dismissible teaser bubble on the floating button. */
  const { cart } = useCart();
  const cartCount = cart?.summary.itemCount ?? 0;
  const [cartTeaser, setCartTeaser] = useState(false);
  const cartNudge = useRef<{ epoch: number; timer: ReturnType<typeof setTimeout> | null; shown: number }>({
    epoch: -1,
    timer: null,
    shown: 0,
  });
  useEffect(() => {
    const st = cartNudge.current;
    if (cartCount <= 0) {
      if (st.timer) clearTimeout(st.timer);
      st.timer = null;
      st.epoch = -1; // fresh schedule once items return
      setCartTeaser(false);
      return;
    }
    if (st.epoch === cartCount) return; // this cart state is already handled
    st.epoch = cartCount;
    if (st.timer) clearTimeout(st.timer);
    if (st.shown >= 2) return; // politeness cap: 2 nudges per session
    st.timer = setTimeout(() => {
      st.timer = null;
      if (st.shown >= 2) return;
      st.shown += 1;
      const countFa = cartCount.toLocaleString("fa-IR");
      const msg: Message = {
        id: uid(),
        role: "assistant",
        text: `🛒 **سبد خریدت ${countFa} قلم کالای منتظرتو داره — وقت درخشیدنه!** ✨\nهمین حالا [مشاهدهٔ سبد](/cart) یا مستقیم [تسویه کن](/checkout) و بترکون! 😉`,
      };
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      if (!open) {
        bumpUnread();
        setCartTeaser(true);
      }
    }, 75_000);
  }, [cartCount, open, bumpUnread]);
  useEffect(() => () => {
    if (cartNudge.current.timer) clearTimeout(cartNudge.current.timer);
  }, []);

  // load history + availability
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const saved = localStorage.getItem("taj-chat-history");
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
    fetch("/api/ai/chat/availability")
      .then((r) => r.json())
      .then((j) => {
        setAiAvailable(j.enabled !== false);
        setAiMode(j.mode === "pro" ? "pro" : "smart");
      })
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("taj-chat-history", JSON.stringify(messages.slice(-40)));
    } catch { /* ignore */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, streaming]);

  useEffect(() => {
    if (open && !streaming) inputRef.current?.focus();
  }, [open, streaming]);

  // ── context freshness: drop the product context once the user navigates
  // away from that product's page, so a later question is NOT answered with
  // the previous product's context (e.g. consulted PS5 → browsed laptops).
  const pathname = usePathname();
  useEffect(() => {
    if (!productContext) return;
    if (productContext.slug && pathname !== `/products/${productContext.slug}`) {
      // allow the query param variant some products use (?color=…)
      if (!pathname.startsWith(`/products/${productContext.slug}`)) clearContext();
    }
  }, [pathname, productContext, clearContext]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming) return;
      setInput("");
      const userMsg: Message = { id: uid(), role: "user", text: content };
      const assistantId = uid();
      setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", text: "" }]);
      setStreaming(true);

      const history = [...messages, userMsg]
        .filter((m) => m.text.trim().length > 0)
        .slice(-14)
        .map((m) => ({ role: m.role, content: m.text }));

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context: {
              productId: productContext?.id ?? null,
              // v23: an active compare pair sends the rival id — the server
              // builds both products into the context (AI + fallback paths)
              compareWithId: comparePair?.b?.id ?? null,
              page: typeof window !== "undefined" ? window.location.pathname : null,
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ message: "خطا در ارتباط با دستیار" }));
          throw new Error(err.message ?? "خطا در ارتباط با دستیار");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;
        while (!done) {
          const { value, done: rDone } = await reader.read();
          if (rDone) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(5).trim());
              if (event.type === "delta") {
                setMessages((m) =>
                  m.map((msg) => (msg.id === assistantId ? { ...msg, text: msg.text + event.text } : msg))
                );
              } else if (event.type === "products") {
                setMessages((m) =>
                  m.map((msg) => (msg.id === assistantId ? { ...msg, products: event.products as ChatProduct[] } : msg))
                );
              } else if (event.type === "error") {
                throw new Error(event.message);
              } else if (event.type === "done") {
                done = true;
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // aborted by user — keep partial text
        } else {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId && !msg.text
                ? { ...msg, text: `⚠️ ${(e as Error).message}` }
                : msg
            )
          );
        }
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, productContext, comparePair]
  );

  // ── v23: proactive AI-compare auto-send — the product page compare dialog
  // sets {a, b}; the widget opens and asks the compare question immediately
  // (context.compareWithId rides along so the server answers with BOTH
  // products — LLM path AND deterministic fallback).
  const handledCompareRef = useRef(0);
  useEffect(() => {
    if (compareSeq === 0) return;
    if (compareSeq === handledCompareRef.current) return;
    if (streaming) return; // in flight — the effect retries once streaming ends
    if (!comparePair) {
      handledCompareRef.current = compareSeq;
      return;
    }
    handledCompareRef.current = compareSeq;
    const { a, b } = comparePair;
    void send(`«${a.name}» و «${b.name}» رو دقیق با هم مقایسه کن — تفاوت‌ها، نقاط قوت هر کدوم و کدوم بهتره؟`).then(() => {
      clearCompare(); // one shot — later questions keep normal product context
    });
  }, [compareSeq, comparePair, streaming, send, clearCompare]);

  // ── proactive consultation: "مشاوره با دستیار هوشمند این محصول" opens
  // the widget AND automatically asks about the product — the user should
  // NOT have to type anything. The server re-fetches full product data
  // (specs/price/stock/reviews) from the DB via context.productId and the
  // system prompt instructs the model to deliver a complete consultation.
  useEffect(() => {
    if (consultSeq === 0) return;
    if (consultSeq === handledConsultRef.current) return; // already handled
    if (streaming) return; // a reply is in flight — retry when it finishes
    if (!productContext) {
      handledConsultRef.current = consultSeq; // nothing to consult about
      return;
    }
    handledConsultRef.current = consultSeq;
    void send(`سلام! درباره‌ی «${productContext.name}» مشاوره کامل می‌خوام.`);
  }, [consultSeq, productContext, streaming, send]);

  const suggestions = productContext
    ? ["ارزش خرید داره؟", "نقاط قوت و ضعفش چیه؟", "با چی مقایسه‌اش کن"]
    : aiMode === "pro"
      ? QUICK_SUGGESTIONS_PRO
      : QUICK_SUGGESTIONS_SMART;

  /* v28-T3: dynamic store branding — the widget takes the store's CURRENT
   * name (admin renames → widget re-brands on the next request) for the
   * title/greeting/aria-labels, and builds its logo as a MONOGRAM from the
   * name's initials ("alex vpn" → "AV", «تاج الکترونیکس» → «تا"). The
   * visual skin follows the ACTIVE storefront template (25 ids → 10 skins
   * via widget-skins.ts); with no skin the original gold-surface look is
   * kept as the fallback. */
  const rawName = typeof storeName === "string" ? storeName.trim() : "";
  const displayName = rawName || "فروشگاه";
  const monogram = rawName ? storeMonogram(rawName) : "";
  const skin = getWidgetSkin(templateId);
  /* v27.1: cool per-template AI assistant avatar (robot/girl art) — shown in
   * the header + empty state; Farsi store names also use it on the FAB
   * (Latin names keep their monogram).
   * v29: the admin-uploaded custom logo (aiLogo) overrides the art EVERYWHERE
   * (FAB + header + empty state), for any store name.
   * v29.2: liveLogo = same override, but refreshed live via the poller above. */
  const assistantAvatar = liveLogo || getWidgetAvatar(skin);
  const farsiName = isFarsiStoreName(rawName);
  const hasCustomLogo = !!liveLogo;

  if (aiAvailable === false) return null;

  return (
    <div data-wskin={skin}>
      <style dangerouslySetInnerHTML={{ __html: WIDGET_SKIN_CSS }} />
      {/* floating button — lifted clear of the footer copyright bar while it
          is in view (v15) so it never covers the Alaruz Design credit */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "بستن دستیار هوشمند" : `گفتگو با دستیار هوشمند ${displayName}`}
        style={{ bottom: 20 + footerOverlap }}
        className={cn(
          "cw-fab fixed left-5 z-50 grid place-items-center h-14 w-14 rounded-full gold-surface text-primary-foreground shadow-2xl shadow-primary/30 transition-[bottom,transform] duration-300 hover:scale-105 active:scale-95",
          open && "rotate-90"
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : assistantAvatar && (farsiName || hasCustomLogo) ? (
          /* v27.1: Farsi store name → the cool AI assistant logo on the FAB.
           * v29: with a custom uploaded logo it always shows (any name). */
          <img src={assistantAvatar} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : monogram ? (
          <span className="text-lg font-black leading-none">{monogram}</span>
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold grid place-items-center">
            {unread.toLocaleString("fa-IR")}
          </span>
        )}
        {!open && <span className="cw-ping absolute inset-0 rounded-full animate-ping bg-primary/30 [animation-duration:2.5s]" />}
      </button>

      {/* v23: cart-reminder teaser bubble — dismissible, sits above the
          floating button while the widget is closed */}
      {cartTeaser && !open && (
        <div
          style={{ bottom: 88 + footerOverlap }}
          className="cw-teaser fixed left-5 z-50 max-w-[260px] rounded-2xl rounded-bl-md gold-surface text-primary-foreground px-4 py-2.5 text-[12px] font-bold leading-6 shadow-2xl shadow-primary/40 animate-in fade-in slide-in-from-bottom-2"
          role="status"
        >
          🛒 سبد خریدت منتظرته — وقت درخشیدنه! ✨
          <button
            onClick={() => setCartTeaser(false)}
            aria-label="بستن یادآور"
            className="absolute -top-2 -right-2 grid place-items-center h-6 w-6 rounded-full bg-card text-foreground border shadow"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* panel — follows the same footer-aware lift (capped lower so the
          open panel always fits the viewport) */}
      <div
        style={{ bottom: 96 + Math.min(footerOverlap, 90) }}
        className={cn(
          "cw-panel fixed left-5 z-50 flex flex-col w-[min(400px,calc(100vw-2.5rem))] h-[min(600px,calc(100dvh-8rem))] rounded-2xl glass shadow-2xl border overflow-hidden transition-all duration-300 origin-bottom-left",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"
        )}
        role="dialog"
        aria-label={`دستیار هوشمند ${displayName}`}
      >
        {/* header */}
        <div className="cw-head flex items-center gap-3 p-3.5 border-b bg-gradient-to-l from-primary/15 to-transparent shrink-0">
          <span
            className={cn(
              "cw-avatar relative grid place-items-center h-10 w-10 rounded-xl text-primary-foreground shrink-0 overflow-hidden",
              aiMode === "pro" ? "cw-avatar-pro bg-gradient-to-br from-amber-500 via-primary to-primary/70 shadow-lg shadow-primary/30" : "gold-surface"
            )}
          >
            {assistantAvatar ? (
              /* v27.1: the template's AI assistant face (robot/girl art) */
              <img src={assistantAvatar} alt="" className="h-full w-full object-cover" />
            ) : monogram ? (
              <span className="text-lg font-black leading-none">{monogram}</span>
            ) : aiMode === "pro" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Crown className="h-5 w-5" />
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              {aiMode === "pro" ? "ایجنت فروش پرو" : `دستیار هوشمند ${displayName}`}
              {aiMode === "pro" && (
                <span className="rounded-full bg-gradient-to-l from-amber-500 to-amber-400 px-1.5 py-px text-[9px] font-black tracking-wide text-amber-950 shadow-sm">
                  PRO
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {aiMode === "pro"
                ? "مشاور فروش حرفه‌ای — موتور GapGPT فعال"
                : "مشاور خرید ۲۴ ساعته — متصل به انبار"}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              aria-label="پاک کردن گفتگو"
              className="grid place-items-center h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="بستن"
            className="grid place-items-center h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* product context chip */}
        {productContext && (
          <div className="flex items-center gap-2 px-3.5 py-2 border-b bg-primary/10 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[11px] font-medium flex-1 min-w-0 truncate">
              {"مشاوره درباره:"} <span className="font-bold">{productContext.name}</span>
            </p>
            <button onClick={clearContext} aria-label="حذف زمینه" className="shrink-0">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <span
                className={cn(
                  "cw-avatar mx-auto mb-3 grid place-items-center h-14 w-14 rounded-2xl text-primary-foreground overflow-hidden",
                  aiMode === "pro" ? "cw-avatar-pro bg-gradient-to-br from-amber-500 via-primary to-primary/70 shadow-lg shadow-primary/30" : "gold-surface"
                )}
              >
                {assistantAvatar ? (
                  <img src={assistantAvatar} alt="" className="h-full w-full object-cover" />
                ) : monogram ? (
                  <span className="text-lg font-black leading-none">{monogram}</span>
                ) : aiMode === "pro" ? (
                  <Sparkles className="h-7 w-7" />
                ) : (
                  <Crown className="h-7 w-7" />
                )}
              </span>
              <p className="text-sm font-bold">
                {aiMode === "pro"
                  ? `سلام! من ایجنت فروش پرو ${displayName} هستم ✨`
                  : `سلام! من دستیار ${displayName} هستم 👑`}
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-6 px-4">
                {aiMode === "pro"
                  ? "مشاورهٔ پیشرفته خرید، مقایسهٔ دقیق و پیگیری سفارش — همه با اطلاعات لحظه‌ای فروشگاه."
                  : "می‌تونم محصولات رو جستجو کنم، قیمت و موجودی هر رنگ/مشخصه رو بگم یا سفارشت رو پیگیری کنم."}
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px]",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-bl-md"
                    : "bg-card border rounded-br-md shadow-sm"
                )}
              >
                {m.text ? <RichText text={m.text} /> : streaming ? (
                  <span className="flex items-center gap-1 py-1">
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary/60" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary/60" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary/60" />
                  </span>
                ) : null}
                {m.products && m.products.length > 0 && <ProductCardsInChat products={m.products} />}
              </div>
            </div>
          ))}
        </div>

        {/* suggestions */}
        {messages.length === 0 && !streaming && (
          <div className="px-3.5 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[11px] font-medium rounded-full border px-3 py-1.5 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="p-3 border-t flex items-end gap-2 shrink-0 bg-card/60"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="سوال خود را بنویسید…"
            aria-label="پیام به دستیار هوشمند"
            className="flex-1 resize-none max-h-28 min-h-10 rounded-xl border bg-background px-3.5 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            type="submit"
            size="icon"
            disabled={streaming || input.trim().length === 0}
            className="cw-send h-10 w-10 rounded-xl gold-surface text-primary-foreground hover:opacity-90 shrink-0"
            aria-label="ارسال"
          >
            {streaming ? (
              <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

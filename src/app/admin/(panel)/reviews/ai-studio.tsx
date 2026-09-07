"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  CheckCircle2,
  History,
  Loader2,
  Sparkles,
  Square,
  Star,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { ProductPicker } from "@/components/admin/product-picker";
import { apiFetch } from "@/components/admin/api-client";

/* ── v24: AI COMMENT STUDIO ─────────────────────────────────────────
 * Live coverage of AI comments across ALL products: status readout
 * («برای ۴۵ محصول از ۶۰ دیدگاه نوشته‌ام»), dual-key provider chips,
 * a client-driven batch loop with a streaming per-product log — plus
 * the v23 single-product generator kept as «انتخاب محصول» mode.
 * Backends: GET /api/admin/reviews/ai-status + POST /api/admin/reviews/generate
 * (single = { productId }, batch = { productIds[] }, engine picks
 * GapGPT → builtin and reports which one wrote). */

const fa = (n: number) => n.toLocaleString("fa-IR");

const PROVIDER_FA: Record<string, string> = {
  gapgpt: "GapGPT",
  builtin: "موتور داخلی",
};

/** UI-driven batch size (backend accepts up to 8 per POST) */
const BATCH_SIZE = 3;

type AiStatus = {
  total: number;
  commented: number;
  pendingCount: number;
  pendingProducts: { id: string; name: string; mainImage: string | null }[];
  recentComments: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
    productName: string;
    productSlug: string | null;
    author: string;
  }[];
  providers: {
    enabled: boolean;
    provider: string;
    gapConfigured: boolean;
  };
};

type GenResult = {
  created: number;
  provider?: string;
  comments: { name: string; rating: number; title: string | null; comment: string; reply: string; replyBy: string }[];
  vision: { analyzed: boolean; what: string; audience: string } | null;
  replierName: string;
};

type BatchResult = {
  results: { productId: string; name: string; ok: boolean; created: number; provider?: string; error?: string }[];
  provider: string | null;
  created: number;
  totals: { total: number; commented: number };
};

type LogRow = { productId: string; name: string; ok: boolean; created: number; provider?: string; error?: string };

function ProviderChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold " +
        (ok
          ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
          : "border-destructive/30 bg-destructive/5 text-destructive")
      }
    >
      <span className={"h-2 w-2 shrink-0 rounded-full " + (ok ? "bg-emerald-500" : "bg-destructive/70")} aria-hidden="true" />
      {label}: {ok ? "✓ فعال" : "✗ بدون کلید"}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`امتیاز ${rating} از ۵`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-3.5 w-3.5 " + (i < rating ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </div>
  );
}

export function AiStudioCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "single">("all");
  const [productId, setProductId] = useState<string | null>(null);
  const [count, setCount] = useState("3");
  const [replierName, setReplierName] = useState("");
  const [result, setResult] = useState<GenResult | null>(null);

  /* live batch-run state (all-products mode) */
  const stopRef = useRef(false);
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  const [running, setRunning] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [done, setDone] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusIsError,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["admin", "reviews", "ai-status"],
    queryFn: () => apiFetch<AiStatus>("/api/admin/reviews/ai-status"),
    refetchOnWindowFocus: false,
  });

  const pendingCount = status?.pendingCount ?? 0;

  /* keep the streaming log pinned to its newest row */
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logRows, inFlight]);

  /* ── single-product mode (v23 behavior, kept intact) ── */
  const generate = useMutation({
    mutationFn: () =>
      apiFetch<GenResult>("/api/admin/reviews/generate", {
        method: "POST",
        body: JSON.stringify({
          productId,
          count: Math.min(5, Math.max(1, Number(count) || 3)),
          replierName: replierName.trim() || null,
        }),
      }),
    onSuccess: (json) => {
      setResult(json as GenResult);
      toast.success(`${fa((json as GenResult).created)} دیدگاه هوشمند ساخته و منتشر شد`);
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void refetchStatus();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تولید ناموفق بود"),
  });

  const run = () => {
    if (!productId) {
      toast.error("اول یک محصول انتخاب کنید");
      return;
    }
    setResult(null);
    generate.mutate();
  };

  /* ── all-products mode: client-driven batch loop ──
   * pendingProducts (oldest-first) → POSTs of BATCH_SIZE productIds →
   * per-product log rows + live «{done} از {total}» readout, until
   * finished / stopped / engine failure. */
  const runAll = async () => {
    if (running) return;
    const products = status?.pendingProducts ?? [];
    if (products.length === 0) {
      toast.error("محصول بدون دیدگاه هوشمند باقی نمانده است");
      return;
    }
    const cnt = Math.min(5, Math.max(1, Number(count) || 3));
    const replier = replierName.trim() || null;

    stopRef.current = false;
    setRunning(true);
    setLogRows([]);
    setLastProvider(null);
    setDone(status?.commented ?? 0);
    setRunTotal(status?.total ?? 0);

    let created = 0;
    let okProducts = 0;
    let aborted = false;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      if (stopRef.current) break;
      const batch = products.slice(i, i + BATCH_SIZE);
      setInFlight(true);
      try {
        const res = await apiFetch<BatchResult>("/api/admin/reviews/generate", {
          method: "POST",
          body: JSON.stringify({ productIds: batch.map((p) => p.id), count: cnt, replierName: replier }),
        });
        setLogRows((prev) => [...prev, ...res.results]);
        if (res.provider) setLastProvider(res.provider);
        created += res.created;
        okProducts += res.results.filter((r) => r.ok).length;
        setDone(res.totals.commented);
        setRunTotal(res.totals.total);
        if (res.results.length > 0 && res.results.every((r) => !r.ok)) {
          // whole batch failed → keys/engine problem; stop with a clear error
          const firstError = res.results.find((r) => r.error)?.error;
          toast.error("تولید ناموفق بود — کلیدها را بررسی کنید", { description: firstError });
          aborted = true;
          break;
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "تولید ناموفق بود — کلیدها را بررسی کنید");
        aborted = true;
        break;
      } finally {
        setInFlight(false);
      }
    }

    setInFlight(false);
    setRunning(false);
    if (created > 0) queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    void refetchStatus();

    if (stopRef.current) {
      toast.info("تولید دیدگاه متوقف شد");
    } else if (!aborted && created > 0) {
      toast.success(`${fa(created)} دیدگاه برای ${fa(okProducts)} محصول نوشته شد ✨`);
    }
  };

  const stop = () => {
    stopRef.current = true; // checked between batches
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold">استودیو نظرات هوشمند</p>
              <p className="text-[11px] leading-5 text-muted-foreground">
                {status
                  ? `پوشش فعلی: ${fa(status.commented)} محصول از ${fa(status.total)} — تولید گروهی دیدگاه با پیشرفت زنده`
                  : "تحلیل تصویر محصول، دیدگاه واقع‌گرایانه با نام مناسب + پاسخ خودکار فروشگاه"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="h-11 rounded-lg font-bold"
            aria-label="باز کردن استودیو نظرات هوشمند"
          >
            <Sparkles className="h-4 w-4" />
            ورود به استودیو
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setResult(null);
            void refetchStatus();
          } else if (running) {
            stopRef.current = true; // closing the dialog mid-run stops the loop
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              استودیو نظرات هوشمند
            </DialogTitle>
            <DialogDescription className="text-xs leading-6">
              برای همهٔ محصولاتِ بدون دیدگاه، گروهی نظر واقع‌گرایانه بنویس — با آپدیت زندهٔ پیشرفت، موتور GapGPT و فید آخرین دیدگاه‌ها.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── status / coverage card ── */}
            {statusLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : statusIsError ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-bold text-destructive">
                  {statusError instanceof Error ? statusError.message : "خطا در دریافت وضعیت استودیو"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 rounded-lg"
                  onClick={() => void refetchStatus()}
                >
                  تلاش مجدد
                </Button>
              </div>
            ) : status ? (
              <Card className="border-primary/25 bg-primary/5">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-extrabold">
                      برای {fa(status.commented)} محصول از {fa(status.total)} دیدگاه نوشته‌ام
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {fa(status.pendingCount)} محصول بدون دیدگاه هوشمند
                    </p>
                  </div>
                  <Progress
                    value={status.total > 0 ? (status.commented / status.total) * 100 : 0}
                    className="h-2.5"
                    aria-label={`پیشرفت پوشش دیدگاه هوشمند: ${fa(status.commented)} از ${fa(status.total)} محصول`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <ProviderChip label="GapGPT" ok={status.providers.gapConfigured} />
                    {status.providers.provider && (
                      <Badge variant="secondary" className="rounded-md text-[10px]">
                        موتور تنظیمات: {PROVIDER_FA[status.providers.provider] ?? status.providers.provider}
                      </Badge>
                    )}
                    {lastProvider && (
                      <Badge variant="outline" className="rounded-md border-primary/40 text-[10px] text-primary">
                        آخرین موتور: {PROVIDER_FA[lastProvider] ?? lastProvider}
                      </Badge>
                    )}
                  </div>
                  {!status.providers.enabled && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-600">
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                      دستیار هوشمند در تنظیمات غیرفعال است
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* ── mode tabs ── */}
            <Tabs value={mode} onValueChange={(v) => setMode(v === "single" ? "single" : "all")}>
              <TabsList className="h-11 w-full rounded-lg">
                <TabsTrigger value="all" className="rounded-lg" disabled={running}>
                  همه محصولات
                </TabsTrigger>
                <TabsTrigger value="single" className="rounded-lg" disabled={running}>
                  انتخاب محصول
                </TabsTrigger>
              </TabsList>

              {/* ── all-products mode: batch run ── */}
              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-studio-count" className="text-xs font-bold">
                      تعد دیدگاه برای هر محصول
                    </Label>
                    <Input
                      id="ai-studio-count"
                      type="number"
                      min={1}
                      max={5}
                      inputMode="numeric"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      onBlur={() => setCount(String(Math.min(5, Math.max(1, Number(count) || 3))))}
                      disabled={running}
                      className="rounded-lg"
                      aria-label="تعداد دیدگاه برای هر محصول (۱ تا ۵)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-studio-replier" className="text-xs font-bold">
                      نام پاسخ‌دهنده فروشگاه
                    </Label>
                    <Input
                      id="ai-studio-replier"
                      value={replierName}
                      onChange={(e) => setReplierName(e.target.value)}
                      placeholder="پیش‌فرض: نام فروشگاه"
                      maxLength={60}
                      disabled={running}
                      className="rounded-lg"
                    />
                  </div>
                </div>

                {statusLoading ? (
                  <Button disabled className="h-11 w-full rounded-lg font-bold">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال بررسی وضعیت…
                  </Button>
                ) : running ? (
                  <div className="space-y-2.5 rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        در حال نوشتن… {fa(done)} از {fa(runTotal)}
                      </p>
                      <Button
                        variant="outline"
                        onClick={stop}
                        className="h-11 rounded-lg border-destructive/40 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="توقف تولید گروهی دیدگاه"
                      >
                        <Square className="h-4 w-4" />
                        توقف
                      </Button>
                    </div>
                    <Progress
                      value={runTotal > 0 ? (done / runTotal) * 100 : 0}
                      aria-label={`پیشرفت نوشتن گروهی: ${fa(done)} از ${fa(runTotal)}`}
                    />
                  </div>
                ) : (
                  <Button
                    onClick={() => void runAll()}
                    disabled={pendingCount === 0}
                    className="h-11 w-full rounded-lg font-bold"
                    aria-label={
                      pendingCount === 0
                        ? "همه محصولات دیدگاه هوشمند دارند"
                        : `نوشتن دیدگاه برای ${fa(pendingCount)} محصول`
                    }
                  >
                    {pendingCount === 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        همه محصولات دیدگاه دارند ✓
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        نوشتن دیدگاه برای {fa(pendingCount)} محصول
                      </>
                    )}
                  </Button>
                )}

                {(logRows.length > 0 || inFlight) && (
                  <div
                    ref={logBoxRef}
                    role="log"
                    aria-live="polite"
                    aria-label="گزارش زندهٔ تولید دیدگاه"
                    className="max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-2"
                  >
                    {logRows.map((r, i) => (
                      <div
                        key={`${r.productId}-${i}`}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-muted/50 px-2.5 py-2 text-[11px]"
                      >
                        {r.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="موفق" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label="ناموفق" />
                        )}
                        <span className="max-w-[45%] truncate font-bold">{r.name}</span>
                        {r.ok ? (
                          <span className="text-muted-foreground">{fa(r.created)} دیدگاه</span>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-destructive">{r.error ?? "ناموفق"}</span>
                        )}
                        {r.ok && r.provider && (
                          <Badge variant="secondary" className="ms-auto shrink-0 rounded-md px-1.5 text-[9px]">
                            {PROVIDER_FA[r.provider] ?? r.provider}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {inFlight && (
                      <p className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        در حال نوشتن دیدگاه‌ها…
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── single-product mode (v23 generator) ── */}
              <TabsContent value="single" className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">محصول (الزامی)</Label>
                  <ProductPicker
                    value={productId}
                    onChange={setProductId}
                    placeholder="انتخاب محصول…"
                    disabled={generate.isPending}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">تعداد دیدگاه</Label>
                    <Select value={count} onValueChange={setCount} disabled={generate.isPending}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4", "5"].map((n) => (
                          <SelectItem key={n} value={n}>
                            {fa(Number(n))} دیدگاه
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">نام پاسخ‌دهنده (شخصیت فروشگاه)</Label>
                    <Input
                      value={replierName}
                      onChange={(e) => setReplierName(e.target.value)}
                      placeholder="پیش‌فرض: نام فروشگاه"
                      maxLength={60}
                      className="rounded-lg"
                      disabled={generate.isPending}
                    />
                  </div>
                </div>

                <Button
                  onClick={run}
                  disabled={generate.isPending || !productId}
                  className="h-11 w-full rounded-lg font-bold"
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> در حال تحلیل و نوشتن…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 me-1.5" /> شروع تولید
                    </>
                  )}
                </Button>

                {result && (
                  <div className="space-y-2.5 border-t pt-1">
                    <p className="flex flex-wrap items-center gap-2 pt-1.5 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {fa(result.created)} دیدگاه ساخته شد و منتشر است
                      {result.provider && (
                        <Badge variant="secondary" className="rounded-md text-[10px]">
                          موتور: {PROVIDER_FA[result.provider] ?? result.provider}
                        </Badge>
                      )}
                      {result.vision?.audience && (
                        <Badge variant="secondary" className="rounded-md text-[10px]">
                          مخاطب:{" "}
                          {result.vision.audience === "female"
                            ? "زنانه"
                            : result.vision.audience === "male"
                              ? "مردانه"
                              : "ترکیبی"}
                        </Badge>
                      )}
                    </p>
                    {result.comments.map((c, i) => (
                      <div key={i} className="space-y-1.5 rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold">
                            {c.name} — <Stars rating={c.rating} />
                          </p>
                        </div>
                        {c.title && <p className="text-[11px] font-bold text-muted-foreground">{c.title}</p>}
                        <p className="line-clamp-3 text-[11.5px] leading-6 text-muted-foreground">{c.comment}</p>
                        <div className="rounded-lg border border-primary/25 bg-primary/8 p-2">
                          <p className="mb-0.5 text-[10px] font-bold text-primary">پاسخ {c.replyBy}:</p>
                          <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{c.reply}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* ── recent AI comments feed ── */}
            {status?.recentComments && status.recentComments.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <History className="h-3.5 w-3.5 text-primary" />
                  آخرین دیدگاه‌های هوشمند
                </p>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-1.5">
                  {status.recentComments.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-muted/40 px-2.5 py-2 text-[11px]"
                    >
                      <span className="flex shrink-0 items-center gap-1 font-bold">
                        <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                        {fa(c.rating)}
                      </span>
                      <span className="shrink-0 font-bold">{c.author}</span>
                      <span className="shrink-0 text-muted-foreground">روی</span>
                      {c.productSlug ? (
                        <Link
                          href={`/products/${c.productSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-bold text-primary hover:underline"
                        >
                          {c.productName}
                        </Link>
                      ) : (
                        <span className="truncate font-bold">{c.productName}</span>
                      )}
                      <span className="hidden w-full text-[10.5px] leading-5 text-muted-foreground line-clamp-1 sm:block">
                        {c.comment}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

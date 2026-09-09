"use client";

/**
 * v33 (task 2-c) · Settings tab «ربات تلگرامی» — full management UI for the
 * store's Telegram bot: bot token (write-only — masked on read, kept when
 * the field is left empty), admin chat ids, custom welcome text, enable
 * switch, «تست اتصال» (getMe + test message, same toast pattern as the
 * zarinpal-test button), a live connection-status card fed by the same
 * react-query cache, and a step-by-step Persian setup guide.
 *
 * Self-contained on purpose: Field / SwitchRow / the useSetting-style query
 * are local copies of the settings-page atoms (page.tsx keeps its own
 * private ones — no circular import, no page.tsx API changes beyond the
 * tab wiring itself).
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  MessageCircle,
  Plug,
  Save,
  Send,
} from "lucide-react";
import { EmptyState } from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ── the GET /api/admin/settings/telegram shape (token never travels back) ── */
interface TelegramSettings {
  botTokenSet: boolean;
  botTokenMasked: string | null;
  adminChatId: string | null;
  enabled: boolean;
  welcomeText: string | null;
  connectionStatus: "OK" | "ERROR" | "OFF";
  connectionError: string | null;
  lastOkAt: string | null;
  lastErrorAt: string | null;
  botUsername: string | null;
}

/* ── local copies of the settings-page atoms (same classes, same look) ── */

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  label,
  desc,
  checked,
  onChange,
  id,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {desc && <p className="text-[11px] leading-5 text-muted-foreground">{desc}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ── the setup guide (accordion, opened by default) ── */

const SETUP_STEPS = [
  "در تلگرام @BotFather را باز کنید و /newbot بفرستید؛ نام و یوزرنیم (پایان با «bot») انتخاب کنید.",
  "توکن نمایش‌داده‌شده را کپی و در همین صفحه وارد کنید و ذخیره بزنید.",
  "به @userinfobot پیام بدهید تا «Id» عددی خودتان را بگیرید.",
  "ربات خود را در تلگرام باز کنید، /start بزنید و یک پیام بفرستید.",
  "شناسه عددی خود را در «شناسه چت ادمین» ذخیره کنید و «تست اتصال» بزنید.",
  "حالا ربات فعال است: مشتریان با /start فروشگاه را می‌بینند و شما پنل مدیریت سفارش‌ها را دریافت می‌کنید.",
];

const BOT_FEATURES = [
  "کاتالوگ محصولات",
  "جستجو با هوش مصنوعی",
  "مقایسه",
  "سبد خرید و پرداخت (زرین‌پال/کارت‌به‌کارت طبق تنظیمات سایت)",
  "پیگیری سفارش",
  "ثبت و پاسخ تیکت",
  "اطلاع‌رسانی محصولات جدید",
];

export function TelegramBotTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-settings-telegram"],
    queryFn: () => apiFetch<{ settings: TelegramSettings }>("/api/admin/settings/telegram"),
  });
  const [form, setForm] = useState<TelegramSettings | null>(null);
  /* the token field is write-only: empty = keep the stored token (the raw
   * token is never returned by the API, so re-saving can never wipe it) */
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  /* save/test both refresh the row the same way the SMTP tab does — the
   * admin immediately SEES the new mask / status / bot username. */
  const refetch = async () => {
    const fresh = await queryClient.fetchQuery({
      queryKey: ["admin-settings-telegram"],
      queryFn: () => apiFetch<{ settings: TelegramSettings }>("/api/admin/settings/telegram"),
    });
    if (fresh?.settings) setForm(fresh.settings);
  };

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        adminChatId: form.adminChatId ?? "",
        enabled: form.enabled,
        welcomeText: form.welcomeText ?? "",
      };
      // only send the token when the admin actually typed one — never re-send
      if (botToken.trim() !== "") payload.botToken = botToken.trim();
      const json = await apiFetch<{ message?: string }>("/api/admin/settings/telegram", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(json.message ?? "تنظیمات ربات تلگرام ذخیره شد");
      setBotToken("");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const json = await apiFetch<{ success?: boolean; message?: string }>("/api/admin/settings/telegram-test", {
        method: "POST",
      });
      if (json.success) toast.success(json.message ?? "اتصال موفق");
      else toast.error(json.message ?? "اتصال ناموفق");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تست ناموفق بود");
    } finally {
      setTesting(false);
    }
  };

  if (isError) return <EmptyState title="خطا در دریافت تنظیمات" desc={error instanceof Error ? error.message : undefined} />;
  if (isLoading || !form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  const set = <K extends keyof TelegramSettings>(k: K, v: TelegramSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  /* the status card tracks the QUERY (not the local form) so it stays live:
   * window-focus refetches and the bot poller's writes both surface here. */
  const status = data?.settings ?? form;
  const hasSavedToken = form.botTokenSet || botToken.trim() !== "";

  return (
    <div className="space-y-4">
      {/* ۱) معرفی ربات */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold">
            🤖 ربات تلگرام فروشگاه
            {status.connectionStatus === "OK" ? (
              <Badge className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">متصل</Badge>
            ) : status.connectionStatus === "ERROR" ? (
              <Badge variant="destructive">خطا</Badge>
            ) : (
              <Badge variant="secondary">خاموش</Badge>
            )}
          </CardTitle>
          <p className="text-[11px] leading-5 text-muted-foreground">
            فروشگاه، پیگیری سفارش، پشتیبانی و هوش مصنوعی شما — داخل تلگرام
          </p>
        </CardHeader>
      </Card>

      {/* ۲) هشدار مهم میزبانی داخل ایران */}
      <Card className="border-amber-500/40 bg-amber-500/[0.06]">
        <CardContent className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          <p className="text-[11px] leading-6 text-amber-700 dark:text-amber-400">
            📢 توجه مهم: اگر فروشگاه شما روی سروری داخل ایران میزبانی می‌شود، به دلیل فیلترینگ تلگرام در ایران،
            اتصال ربات برقرار نخواهد شد و این قابلیت قابل استفاده نیست. برای استفاده از ربات، لطفاً فروشگاه خود را
            روی یک سرور خارجی میزبانی کنید؛ سرورهای ترکیه، آلمان و انگلیس گزینه‌های مناسبی هستند و پینگ و سرعت
            خوبی هم دارند. از همراهی و بردباری شما سپاسگزاریم 🙏
          </p>
        </CardContent>
      </Card>

      {/* ۳) فرم تنظیمات */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Send className="h-4 w-4 text-primary" />
              اتصال ربات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="توکن ربات"
              htmlFor="tg-token"
              hint="از @BotFather در تلگرام"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    id="tg-token"
                    dir="ltr"
                    type={showToken ? "text" : "password"}
                    className="rounded-lg font-mono text-left"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="مثال: 123456789:AAH8sk…"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-lg"
                    onClick={() => setShowToken((v) => !v)}
                    aria-label={showToken ? "پنهان کردن توکن" : "نمایش توکن"}
                    title={showToken ? "پنهان کردن توکن" : "نمایش توکن"}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {form.botTokenSet && form.botTokenMasked && (
                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] leading-5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    توکن ذخیره‌شده: <span dir="ltr" className="font-mono">{form.botTokenMasked}</span>
                    — برای حفظ توکن فعلی، این فیلد را خالی بگذارید
                  </p>
                )}
              </div>
            </Field>
            <Field
              label="شناسه چت ادمین"
              htmlFor="tg-chatid"
              hint="۱) در تلگرام به @userinfobot پیام بدهید و شناسه عددی خود را بردارید ۲) ربات خودتان را باز کنید و /start بزنید ۳) همان شناسه را اینجا وارد کنید. پنل مدیریت ربات (سفارش‌ها، تیکت‌ها، رسیدها) فقط برای این شناسه‌ها باز می‌شود."
            >
              <Input
                id="tg-chatid"
                dir="ltr"
                className="rounded-lg font-mono text-left"
                value={form.adminChatId ?? ""}
                onChange={(e) => set("adminChatId", e.target.value)}
                placeholder="مثال: 123456789 یا چند شناسه با کاما: 123,456"
                autoComplete="off"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <MessageCircle className="h-4 w-4 text-primary" />
              پیام و فعال‌سازی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="پیام خوش‌آمد سفارشی"
              htmlFor="tg-welcome"
              hint="خالی = پیام پیش‌فرض. {name} = نام کاربر، {store} = نام فروشگاه"
            >
              <Textarea
                id="tg-welcome"
                rows={4}
                className="rounded-lg"
                value={form.welcomeText ?? ""}
                onChange={(e) => set("welcomeText", e.target.value)}
                placeholder="سلام {name} 👋 به {store} خوش آمدید!"
              />
            </Field>
            <SwitchRow
              id="tg-enabled"
              label="ربات فعال باشد"
              desc="پس از فعال‌سازی، ربات ظرف حداکثر ۳۰ ثانیه شروع به کار می‌کند و به پیام‌ها پاسخ می‌دهد."
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
            />
          </CardContent>
        </Card>
      </div>

      {/* ۴) دکمه‌ها */}
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={testConnection}
            disabled={testing || !hasSavedToken}
            title={hasSavedToken ? "بررسی توکن ذخیره‌شده در تلگرام" : "ابتدا توکن ربات را ذخیره کنید"}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            تست اتصال
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره تنظیمات
          </Button>
        </div>
      </div>
      <p className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
        «تست اتصال» با توکن ذخیره‌شده انجام می‌شود — ابتدا ذخیره کنید.
      </p>

      {/* ۵) وضعیت اتصال */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Bot className="h-4 w-4 text-primary" />
            وضعیت اتصال ربات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {status.connectionStatus === "OK" ? (
              <Badge className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">متصل</Badge>
            ) : status.connectionStatus === "ERROR" ? (
              <Badge variant="destructive">خطا</Badge>
            ) : (
              <Badge variant="secondary">خاموش</Badge>
            )}
            {status.connectionStatus === "OK" && (
              <>
                {status.botUsername && (
                  <span dir="ltr" className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    @{status.botUsername}
                  </span>
                )}
                {status.lastOkAt && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    آخرین اتصال موفق: {new Date(status.lastOkAt).toLocaleString("fa-IR")}
                  </span>
                )}
              </>
            )}
            {status.connectionStatus === "ERROR" && (
              <>
                {status.connectionError && (
                  <span
                    dir="ltr"
                    className="max-w-full truncate rounded-lg bg-destructive/10 px-2 py-1 font-mono text-[11px] text-destructive"
                    title={status.connectionError}
                  >
                    {status.connectionError}
                  </span>
                )}
                {status.lastErrorAt && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                    آخرین خطا: {new Date(status.lastErrorAt).toLocaleString("fa-IR")}
                  </span>
                )}
              </>
            )}
            {status.connectionStatus === "OFF" && (
              <span className="text-[11px] leading-5 text-muted-foreground">
                هنوز تست اتصال انجام نشده یا توکن تازه ذخیره شده — دکمهٔ «تست اتصال» را بزنید.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ۶) راهنمای راه‌اندازی قدم‌به‌قدم */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <HelpCircle className="h-4 w-4 text-primary" />
            راهنمای راه‌اندازی قدم‌به‌قدم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="setup">
            <AccordionItem value="setup">
              <AccordionTrigger className="text-right text-xs font-bold hover:no-underline">
                شش قدم تا راه‌اندازی ربات
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ol className="space-y-2.5">
                  {SETUP_STEPS.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          "border border-primary/25 bg-primary/10 text-[11px] font-bold text-primary tabular-nums"
                        )}
                        aria-hidden
                      >
                        {toFaDigits(i + 1)}
                      </span>
                      <span className="text-[12px] leading-6 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="features">
              <AccordionTrigger className="text-right text-xs font-bold hover:no-underline">
                قابلیت‌های ربات
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {BOT_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <MessageCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                      <span className="text-[12px] leading-6 text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

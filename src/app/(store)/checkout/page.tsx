"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCart, useMe, type CartResponse } from "@/hooks/use-store";
import { formatPrice } from "@/lib/format";
import { deliveryIcon } from "@/lib/delivery";
import { cn } from "@/lib/utils";
import {
  CreditCard, Wallet, Tag, ArrowRight, Loader2, Check, User, MapPin, Info, ShieldCheck, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const PROVINCES = [
  "تهران", "البرز", "اصفهان", "خراسان رضوی", "فارس", "آذربایجان شرقی", "آذربایجان غربی",
  "گیلان", "مازندران", "خوزستان", "کرمان", "یزد", "قم", "کرمانشاه", "هرمزگان", "همدان",
  "سیستان و بلوچستان", "لرستان", "اردبیل", "قزوین", "مرکزی", "زنجان", "بوشهر", "گلستان",
  "کردستان", "چهارمحال و بختیاری", "خراسان شمالی", "خراسان جنوبی", "ایلام", "سمنان",
];

type StoreInfo = {
  paymentMethods: { zarinpal: boolean; cardToCard: boolean };
  shipping: { flat: number; freeOver: number };
  minOrderAmount: number;
  storePhone: string;
  deliveryMethods?: DeliveryMethodDto[]; // v16 — absent when none are active
};

type DeliveryMethodDto = {
  id: string;
  name: string;
  type: string;
  cost: number;
  etaMinDays: number;
  etaMaxDays: number;
  etaText: string;
  icon: string | null;
  description: string | null;
};

type CardInfo = {
  cardNumber: string;
  cardHolder: string;
  iban: string | null;
  accountNumber: string | null;
  amount: number;
  instructions: string;
  orderNumber: string;
  deliveryMethodName?: string | null; // v16 snapshot shown on the result card
  deliveryEta?: string | null;
};

export default function CheckoutPage() {
  const { cart: baseCart, isLoading, refetch } = useCart();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  /* v16: selected admin-managed delivery method (null = flat shipping) */
  const [deliveryMethodId, setDeliveryMethodId] = useState<string | null>(null);

  /* spec §16 — after a coupon is applied, the totals (subtotal / discount /
   * shipping / payable) MUST reflect it in the frontend preview. The base
   * useCart query has no coupon context, so a coupon-aware cart query takes
   * over the summary while items stay shared. The final amount is ALWAYS
   * re-validated server-side at order creation (POST /api/orders couponCode). */
  const { data: couponCart } = useQuery({
    queryKey: ["cart", "coupon-preview", couponApplied],
    queryFn: async () => {
      const r = await fetch(`/api/cart?coupon=${encodeURIComponent(couponApplied as string)}`);
      return (await r.json()) as { ok: boolean } & CartResponse;
    },
    enabled: !!couponApplied,
  });
  const cart = couponApplied && couponCart?.ok ? couponCart : baseCart;

  const { data: storeInfo } = useQuery({
    queryKey: ["store-info"],
    queryFn: () => fetch("/api/store-info").then((r) => r.json()) as Promise<{ ok: boolean } & StoreInfo>,
  });

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    province: "تهران", city: "", address: "", postalCode: "", note: "",
  });

  // prefill from user profile
  useEffect(() => {
    if (me?.user) {
      setForm((f) => ({
        ...f,
        firstName: f.firstName || (me.user!.firstName ?? ""),
        lastName: f.lastName || (me.user!.lastName ?? ""),
        phone: f.phone || (me.user!.phone ?? ""),
        email: f.email || (me.user!.email ?? ""),
      }));
    }
  }, [me]);

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetch("/api/account/addresses").then((r) => r.json()),
    enabled: !!me?.user,
  });

  // coupon preview in totals
  const { totals } = cart ?? {};
  const couponPreview = totals?.coupon;

  /* ── v16 delivery methods ──
   * Default-select the first method once the list arrives (only if nothing
   * is selected yet), re-select the first if the stored selection vanishes
   * (method deactivated/deleted server-side), and clear the selection when
   * no active methods remain — the preview then falls back to flat shipping,
   * which is exactly what the server charges without a deliveryMethodId. */
  const deliveryMethods = storeInfo?.deliveryMethods;
  const hasDeliveryMethods = !!deliveryMethods && deliveryMethods.length > 0;
  useEffect(() => {
    if (!deliveryMethods || deliveryMethods.length === 0) {
      if (deliveryMethodId) setDeliveryMethodId(null);
      return;
    }
    if (!deliveryMethodId || !deliveryMethods.some((m) => m.id === deliveryMethodId)) {
      setDeliveryMethodId(deliveryMethods[0].id);
    }
  }, [deliveryMethods, deliveryMethodId]);

  const selectedDelivery = deliveryMethods?.find((m) => m.id === deliveryMethodId) ?? null;
  /* free-shipping threshold preview — the server applies the same rule in
   * computeTotals() at order creation, overriding the method cost when met */
  const freeShippingOver = storeInfo?.shipping.freeOver ?? 0;
  const freeShippingPreview =
    freeShippingOver > 0 && (totals?.subtotal ?? 0) - (totals?.discount ?? 0) >= freeShippingOver;
  /* when methods exist the selected method's cost replaces the flat rate in
   * the preview (and therefore in the payable row); otherwise v15 flat exact */
  const previewShipping = !hasDeliveryMethods
    ? (totals?.shipping ?? 0)
    : freeShippingPreview
      ? 0
      : (selectedDelivery?.cost ?? deliveryMethods?.[0]?.cost ?? 0);
  const previewTotal = !hasDeliveryMethods
    ? (totals?.total ?? 0)
    : (totals?.total ?? 0) - (totals?.shipping ?? 0) + previewShipping;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon.trim(), subtotal: cart?.summary.subtotal ?? 0 }),
    });
    const json = await res.json();
    if (json.ok) {
      setCouponApplied(coupon.trim().toUpperCase());
      toast.success(json.message);
      refetch();
    } else {
      toast.error(json.message ?? "کد تخفیف نامعتبر است");
    }
  };
  const items = cart?.items ?? [];
  const pm = storeInfo?.paymentMethods;

  const submitOrder = async (paymentMethod: "ZARINPAL" | "CARD_TO_CARD") => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          postalCode: form.postalCode || undefined,
          note: form.note || undefined,
          email: form.email || undefined,
          deliveryMethodId: deliveryMethodId ?? undefined,
          paymentMethod,
          couponCode: couponApplied ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "خطا در ثبت سفارش");
      }
      if (json.paymentUrl) {
        toast.success("در حال انتقال به درگاه پرداخت زرین‌پال…");
        window.location.href = json.paymentUrl;
        return;
      }
      if (json.cardInfo) {
        setCardInfo(json.cardInfo);
        setCouponApplied(null);
        qc.invalidateQueries({ queryKey: ["cart"] });
        toast.success(`سفارش ${json.orderNumber} ثبت شد`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (cardInfo) {
    return <C2CResult card={cardInfo} />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="h-8 w-40 rounded-lg animate-pulse bg-muted" />
        <div className="h-96 rounded-2xl animate-pulse bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-3xl border border-dashed p-16 text-center">
          <h1 className="text-lg font-bold">سبد خرید خالی است</h1>
          <Button asChild className="mt-6 gold-surface text-primary-foreground rounded-xl">
            <Link href="/products">مشاهده محصولات</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-black mb-6 flex items-center gap-2.5">
        <ShieldCheck className="h-6 w-6 text-primary" /> تکمیل خرید
      </h1>

      {/* v20 responsive fix: an explicit base grid-cols-1 (minmax(0,1fr))
          replaces the implicit auto track, which sized itself to the items'
          max-content (~414px) and pushed the page 55px past a 375px
          viewport (RTL → leftward phantom scroll). */}
      <div className="grid grid-cols-1 min-w-0 lg:grid-cols-[1fr_380px] gap-6">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const selected = document.querySelector<HTMLInputElement>('input[name="paymentMethod"]:checked')?.value;
            if (!selected) {
              toast.error("روش پرداخت را انتخاب کنید");
              return;
            }
            submitOrder(selected as "ZARINPAL" | "CARD_TO_CARD");
          }}
        >
          {/* customer info */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold mb-4 flex items-center gap-2">
              <User className="h-4.5 w-4.5 h-5 w-5 text-primary" /> اطلاعات خریدار
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-xs mb-1.5">نام *</Label>
                <Input id="firstName" required minLength={2} value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs mb-1.5">نام خانوادگی *</Label>
                <Input id="lastName" required minLength={2} value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs mb-1.5">شماره موبایل *</Label>
                <Input id="phone" required dir="ltr" inputMode="numeric" placeholder="09123456789"
                  pattern="09[0-9]{9}" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-lg text-left" />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs mb-1.5">ایمیل (اختیاری)</Label>
                <Input id="email" type="email" dir="ltr" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg text-left" />
              </div>
            </div>
          </section>

          {/* address */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> آدرس تحویل
            </h2>

            {addresses?.addresses?.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {addresses.addresses.map((a: { id: string; title: string; province: string; city: string; address: string; postalCode: string | null }) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, province: a.province, city: a.city, address: a.address, postalCode: a.postalCode ?? "" }))}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-medium hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province" className="text-xs mb-1.5">استان *</Label>
                <select
                  id="province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className="w-full h-10 rounded-lg border bg-card px-3 text-sm"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="city" className="text-xs mb-1.5">شهر *</Label>
                <Input id="city" required minLength={2} value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address" className="text-xs mb-1.5">آدرس کامل *</Label>
                <Textarea id="address" required minLength={10} rows={2} value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg resize-none" />
              </div>
              <div>
                <Label htmlFor="postalCode" className="text-xs mb-1.5">کد پستی (اختیاری)</Label>
                <Input id="postalCode" dir="ltr" inputMode="numeric" pattern="[0-9]{10}" value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="h-10 rounded-lg text-left" />
              </div>
              <div>
                <Label htmlFor="note" className="text-xs mb-1.5">توضیحات سفارش (اختیاری)</Label>
                <Input id="note" value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })} className="h-10 rounded-lg" />
              </div>
            </div>
          </section>

          {/* delivery method — v16 (only rendered when active admin-defined methods exist; otherwise the legacy flat rate applies) */}
          {hasDeliveryMethods && deliveryMethods && (
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="delivery-heading">
              <h2 id="delivery-heading" className="text-sm font-extrabold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> روش ارسال
              </h2>
              <RadioGroup
                name="deliveryMethod"
                value={deliveryMethodId ?? ""}
                onValueChange={setDeliveryMethodId}
                className="grid gap-3"
                dir="rtl"
              >
                {deliveryMethods.map((m) => {
                  const OptionIcon = deliveryIcon(m.icon);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border p-4 min-h-[44px] cursor-pointer transition-all has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={m.id} id={`dm-${m.id}`} className="mt-0.5" />
                      <OptionIcon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{m.etaText}</p>
                        {m.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-5">{m.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-[11px] font-bold tabular-nums">
                        {m.cost === 0 ? "رایگان" : formatPrice(m.cost)}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </section>
          )}

          {/* payment method */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> روش پرداخت
            </h2>
            <RadioGroup defaultValue={pm?.zarinpal ? "ZARINPAL" : "CARD_TO_CARD"} name="paymentMethod" className="grid sm:grid-cols-2 gap-3" dir="rtl">
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
                  !pm?.zarinpal && "opacity-40 pointer-events-none"
                )}
              >
                <RadioGroupItem value="ZARINPAL" id="pay-zarinpal" className="mt-0.5" disabled={!pm?.zarinpal} />
                <div>
                  <p className="text-[13px] font-bold flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-primary" /> پرداخت آنلاین (زرین‌پال)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-5">
                    پرداخت امن با تمام کارت‌های عضو شتاب؛ تأیید خودکار و فوری.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
                  !pm?.cardToCard && "opacity-40 pointer-events-none"
                )}
              >
                <RadioGroupItem value="CARD_TO_CARD" id="pay-c2c" className="mt-0.5" disabled={!pm?.cardToCard} />
                <div>
                  <p className="text-[13px] font-bold flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" /> کارت به کارت
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-5">
                    واریز به حساب فروشگاه و ارسال رسید؛ تأیید دستی توسط اپراتور.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </section>

          <Button type="submit" disabled={submitting || items.some((i) => !i.inStock)} className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold text-sm">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                پرداخت و ثبت سفارش
                <ArrowRight className="h-4 w-4 ms-2 rotate-180" />
              </>
            )}
          </Button>
        </form>

        {/* summary */}
        <aside className="lg:sticky lg:top-32 h-fit space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-extrabold">خلاصه سفارش</h2>
            <div className="space-y-2.5 max-h-52 overflow-y-auto">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate">{i.name} × {i.quantity.toLocaleString("fa-IR")}</span>
                  <span className="shrink-0 tabular-nums font-medium">{formatPrice(i.lineTotal)}</span>
                </div>
              ))}
            </div>

            {/* coupon */}
            <div className="flex gap-2">
              <Input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="کد تخفیف"
                className="h-9 text-xs rounded-lg"
                aria-label="کد تخفیف"
              />
              <Button type="button" onClick={applyCoupon} variant="outline" className="h-9 rounded-lg text-xs shrink-0">
                <Tag className="h-3.5 w-3.5 me-1" /> اعمال
              </Button>
            </div>
            {couponPreview && couponPreview.valid && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> کد {couponApplied} اعمال شد
              </p>
            )}

            <div className="space-y-2 text-[13px] border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع کالاها</span>
                <span className="font-bold tabular-nums">{formatPrice(totals?.subtotal)}</span>
              </div>
              {(totals?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>تخفیف</span>
                  <span className="font-bold tabular-nums">{formatPrice(totals?.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ارسال</span>
                {/* v16: with delivery methods → selected method cost (free-shipping
                  * threshold wins); without → exact v15 flat behavior */}
                <span className="font-bold tabular-nums">
                  {!hasDeliveryMethods
                    ? (totals?.shipping ?? 0) === 0
                      ? "رایگان"
                      : formatPrice(totals?.shipping)
                    : freeShippingPreview
                      ? "رایگان (تخفیف ارسال)"
                      : previewShipping === 0
                        ? "رایگان"
                        : formatPrice(previewShipping)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2.5">
                <span className="font-bold">قابل پرداخت</span>
                <span className="font-black text-primary text-lg tabular-nums">{formatPrice(previewTotal)} تومان</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 bg-muted/60 rounded-xl p-3 leading-5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            با ثبت سفارش، قوانین فروشگاه تاج الکترونیکس را می‌پذیرید.
          </p>
        </aside>
      </div>
    </div>
  );
}

function C2CResult({ card }: { card: CardInfo }) {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} کپی شد`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("کپی ناموفق — به‌صورت دستی وارد کنید");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border bg-card overflow-hidden">
        <div className="hero-mesh p-6 text-center">
          <Check className="mx-auto h-14 w-14 text-emerald-400 mb-3" />
          <h1 className="text-lg font-black text-white">سفارش شما ثبت شد!</h1>
          <p className="text-xs text-white/70 mt-2">
            شماره سفارش: <span className="font-bold text-amber-300" dir="ltr">{card.orderNumber}</span>
          </p>
          {card.deliveryMethodName && (
            <p className="text-xs text-white/70 mt-1 flex items-center justify-center gap-1.5">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              روش ارسال: <span className="font-bold text-amber-200">{card.deliveryMethodName}</span>
              {card.deliveryEta && <span>— {card.deliveryEta}</span>}
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
            <h2 className="text-sm font-extrabold mb-1">پرداخت کارت به کارت</h2>
            <p className="text-[11px] text-muted-foreground mb-4 leading-5">{card.instructions}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-card border p-3.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">شماره کارت</p>
                  <p className="text-base font-black tracking-wider tabular-nums" dir="ltr">{card.cardNumber}</p>
                </div>
                <Button onClick={() => copy(card.cardNumber, "شماره کارت")} size="sm" variant="outline" className="rounded-lg">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 me-1" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  کپی
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card border p-3.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">نام صاحب حساب</p>
                  <p className="text-sm font-bold">{card.cardHolder}</p>
                </div>
              </div>

              {card.iban && (
                <div className="flex items-center justify-between rounded-xl bg-card border p-3.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground">شماره شبا</p>
                    <p className="text-sm font-bold tabular-nums" dir="ltr">{card.iban}</p>
                  </div>
                  <Button onClick={() => copy(card.iban!, "شماره شبا")} size="sm" variant="outline" className="rounded-lg">کپی</Button>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-destructive/8 border border-destructive/30 p-3.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">مبلغ قابل واریز</p>
                  <p className="text-lg font-black text-destructive tabular-nums">{formatPrice(card.amount)} تومان</p>
                </div>
                <Button onClick={() => copy(String(card.amount), "مبلغ")} size="sm" variant="outline" className="rounded-lg">کپی</Button>
              </div>
            </div>
          </div>

          <p className="text-xs leading-6 text-muted-foreground">
            پس از واریز، از بخش <Link href={`/checkout/success/${card.orderNumber}`} className="text-primary font-bold">ارسال رسید سفارش</Link> یا صفحه
            <Link href="/track-order" className="text-primary font-bold"> پیگیری سفارش </Link>
            تصویر رسید را ارسال کنید تا پرداخت شما تأیید شود.
          </p>

          <Button asChild className="w-full h-12 rounded-xl gold-surface text-primary-foreground hover:opacity-90 font-bold">
            <Link href={`/checkout/success/${card.orderNumber}`}>ارسال رسید پرداخت</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

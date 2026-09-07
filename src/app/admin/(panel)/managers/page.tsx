"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Ban,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
  UserRound,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  EmptyState,
  RoleBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import { formatDateTime, ROLE_FA } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   v29.2 · مدیران و دسترسی‌ها (managers & granular permissions)

   NOTE: the permission metadata below is a CLIENT-side copy of the
   server-side source of truth in src/lib/auth.ts (ADMIN_PERMISSIONS /
   ROLE_DEFAULT_PERMISSIONS). lib/auth imports next/headers cookies, so
   it must never be bundled into a client component — the tiny static
   duplication here is intentional and self-contained.
   ═══════════════════════════════════════════════════════════════ */

const PERMISSIONS: { key: string; labelFa: string }[] = [
  { key: "products", labelFa: "محصولات" },
  { key: "categories", labelFa: "دسته‌بندی‌ها" },
  { key: "brands", labelFa: "برندها" },
  { key: "orders", labelFa: "سفارش‌ها" },
  { key: "payments", labelFa: "پرداخت‌ها" },
  { key: "coupons", labelFa: "کدهای تخفیف" },
  { key: "delivery", labelFa: "روش‌های ارسال" },
  { key: "users", labelFa: "کاربران مشتری" },
  { key: "reviews", labelFa: "دیدگاه‌ها" },
  { key: "sliders", labelFa: "اسلایدرها" },
  { key: "stories", labelFa: "استوری‌ها" },
  { key: "showcases", labelFa: "شوکیس‌ها" },
  { key: "pages", labelFa: "صفحات محتوا" },
  { key: "tickets", labelFa: "تیکت‌های پشتیبانی" },
  { key: "messages", labelFa: "پیام‌های مشتریان" },
  { key: "appearance", labelFa: "قالب و ظاهر" },
  { key: "settings", labelFa: "تنظیمات فروشگاه" },
  { key: "logs", labelFa: "گزارش‌ها" },
];

const PERM_LABEL = new Map(PERMISSIONS.map((p) => [p.key, p.labelFa]));

const ROLE_DEFAULTS: Record<string, string[]> = {
  PRODUCT_MANAGER: ["products", "categories", "brands", "reviews"],
  ORDER_MANAGER: ["orders", "payments", "coupons", "delivery"],
  SUPPORT: ["tickets", "messages", "reviews"],
};

const PERMISSION_GROUPS: { id: string; label: string; items: { key: string; labelFa: string }[] }[] = [
  {
    id: "catalog",
    label: "محصولات",
    items: PERMISSIONS.filter((p) => ["products", "categories", "brands"].includes(p.key)),
  },
  {
    id: "orders",
    label: "سفارش و پرداخت",
    items: PERMISSIONS.filter((p) => ["orders", "payments", "coupons", "delivery"].includes(p.key)),
  },
  {
    id: "customers",
    label: "مشتریان",
    items: PERMISSIONS.filter((p) => ["users", "reviews"].includes(p.key)),
  },
  {
    id: "content",
    label: "محتوا",
    items: PERMISSIONS.filter((p) => ["sliders", "stories", "showcases", "pages"].includes(p.key)),
  },
  {
    id: "support",
    label: "پشتیبانی",
    items: PERMISSIONS.filter((p) => ["tickets", "messages"].includes(p.key)),
  },
  {
    id: "settings",
    label: "تنظیمات",
    items: PERMISSIONS.filter((p) => ["appearance", "settings", "logs"].includes(p.key)),
  },
];

const ROLE_OPTIONS = [
  { value: "SUPPORT", label: "پشتیبانی" },
  { value: "ORDER_MANAGER", label: "مدیر سفارش‌ها" },
  { value: "PRODUCT_MANAGER", label: "مدیر محصولات" },
  { value: "ADMIN", label: "مدیر کل (دسترسی کامل)" },
];

interface ManagerRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isBlocked: boolean;
  avatar: string | null;
  adminPermissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

/** what the row actually shows: "ALL" for full admins, else the effective list */
function effectivePermissions(m: ManagerRow): "ALL" | { source: "custom" | "default"; keys: string[] } {
  if (m.role === "ADMIN" || m.role === "SUPER_ADMIN") return "ALL";
  if (m.adminPermissions.length > 0) return { source: "custom", keys: m.adminPermissions };
  return { source: "default", keys: ROLE_DEFAULTS[m.role] ?? [] };
}

/* ── grouped permission checkbox grid (shared by both dialogs) ── */
function PermissionGrid({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const has = (k: string) => value.includes(k);
  const toggle = (k: string) => onChange(has(k) ? value.filter((x) => x !== k) : [...value, k]);
  const toggleGroup = (keys: string[], on: boolean) => {
    const next = new Set(value);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange([...next]);
  };
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((g) => {
        const keys = g.items.map((i) => i.key);
        const allOn = keys.every((k) => has(k));
        return (
          <div key={g.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold">{g.label}</p>
              <button
                type="button"
                onClick={() => toggleGroup(keys, !allOn)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors",
                  allOn
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {allOn ? "فعال شد" : "همه"}
              </button>
            </div>
            <div className="mt-2 grid gap-1">
              {g.items.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition-colors hover:bg-muted/50"
                >
                  <Checkbox checked={has(p.key)} onCheckedChange={() => toggle(p.key)} aria-label={p.labelFa} />
                  {p.labelFa}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── expandable permission chips (table rows + mobile cards) ── */
function PermissionsCell({ m }: { m: ManagerRow }) {
  const eff = effectivePermissions(m);
  if (eff === "ALL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
        <ShieldCheck className="h-3.5 w-3.5" />
        دسترسی کامل
      </span>
    );
  }
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {eff.keys.length.toLocaleString("fa-IR")} دسترسی
          {eff.source === "default" && <span className="text-[10px]">(پیش‌فرض نقش)</span>}
          <ChevronsUpDown className="h-3 w-3" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 flex max-w-[280px] flex-wrap gap-1">
          {eff.keys.length === 0 ? (
            <span className="text-[11px] text-destructive">بدون هیچ دسترسی</span>
          ) : (
            eff.keys.map((k) => (
              <Badge key={k} variant="outline" className="rounded-full border-transparent bg-muted px-2 py-0 text-[10px] font-semibold text-muted-foreground">
                {PERM_LABEL.get(k) ?? k}
              </Badge>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── create dialog: the MAIN admin sets credentials MANUALLY ── */
function ManagerCreateDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("SUPPORT");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(ROLE_DEFAULTS.SUPPORT);
  const [saving, setSaving] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { role: string } | null }>("/api/auth/me"),
  });
  const isSuperAdmin = meData?.user?.role === "SUPER_ADMIN";

  const save = async () => {
    if (saving) return;
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return toast.error("نام و نام خانوادگی حداقل ۲ کاراکتر باشند");
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("ایمیل معتبر نیست");
    if (phone.trim() && !/^09\d{9}$/.test(phone.trim())) return toast.error("شماره موبایل معتبر نیست (مثال: 09123456789)");
    if (password.length < 8) return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>("/api/admin/managers", {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          role,
          password,
          permissions,
        }),
      });
      toast.success(json.message ?? "مدیر ایجاد شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "managers"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ایجاد مدیر ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>افزودن مدیر جدید</DialogTitle>
        <DialogDescription className="text-xs leading-5">
          نام، ایمیل و رمز دلخواه را تعیین کنید و خودتان به کارمند تحویل دهید — او با همین اطلاعات وارد پنل می‌شود.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mgr-first">نام *</Label>
            <Input id="mgr-first" className="rounded-lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-last">نام خانوادگی *</Label>
            <Input id="mgr-last" className="rounded-lg" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mgr-email">ایمیل (نام کاربری ورود) *</Label>
          <Input id="mgr-email" type="email" dir="ltr" className="rounded-lg text-left" placeholder="reza@taj.test" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mgr-phone">شماره موبایل (اختیاری)</Label>
            <Input id="mgr-phone" dir="ltr" inputMode="numeric" className="rounded-lg" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>نقش *</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                // prefill the new role's default permissions (admin can still adjust)
                const defaults = ROLE_DEFAULTS[v];
                if (defaults) setPermissions(defaults);
                if (v === "ADMIN") setPermissions([]);
              }}
            >
              <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} disabled={r.value === "ADMIN" && !isSuperAdmin}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mgr-pass">رمز عبور *</Label>
          <div className="relative">
            <Input
              id="mgr-pass"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              className="rounded-lg pr-10 text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">حداقل ۸ کاراکتر — این رمز را دستی به کارمند اعلام کنید.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-bold">دسترسی‌ها</Label>
            <button
              type="button"
              className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                const defaults = ROLE_DEFAULTS[role];
                setPermissions(defaults ? defaults : []);
              }}
            >
              پیش‌فرضِ نقش
            </button>
          </div>
          {role === "ADMIN" ? (
            <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] leading-5 text-muted-foreground">
              نقش «مدیر کل» به همهٔ بخش‌ها دسترسی دارد — انتخاب دسترسی لازم نیست.
            </p>
          ) : (
            <>
              <PermissionGrid value={permissions} onChange={setPermissions} />
              <p className="text-[11px] text-muted-foreground">
                بدون هیچ انتخابی، دسترسی‌های پیش‌فرض نقش اعمال می‌شود.
              </p>
            </>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-lg" onClick={onClose}>انصراف</Button>
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          افزودن مدیر
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ── edit dialog: profile + role + permissions (+ separate password reset) ── */
function ManagerEditDialog({ manager, onClose }: { manager: ManagerRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("SUPPORT");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  /* separate «تغییر رمز» action */
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me"),
  });
  const me = meData?.user;
  const isSelf = me?.id === manager.id;
  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const targetIsSuper = manager.role === "SUPER_ADMIN";

  useEffect(() => {
    setFirstName(manager.firstName ?? "");
    setLastName(manager.lastName ?? "");
    setPhone(manager.phone ?? "");
    setRole(manager.role);
    setPermissions(
      manager.role === "ADMIN" || manager.role === "SUPER_ADMIN" ? [] : manager.adminPermissions
    );
    setNewPassword("");
  }, [manager]);

  const save = async () => {
    if (saving) return;
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return toast.error("نام و نام خانوادگی حداقل ۲ کاراکتر باشند");
    }
    if (phone.trim() && !/^09\d{9}$/.test(phone.trim())) return toast.error("شماره موبایل معتبر نیست");
    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>(`/api/admin/managers/${manager.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          role,
          permissions: role === "ADMIN" ? [] : permissions,
        }),
      });
      toast.success(json.message ?? "ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "managers"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (pwBusy) return;
    if (newPassword.length < 8) return toast.error("رمز جدید باید حداقل ۸ کاراکتر باشد");
    setPwBusy(true);
    try {
      const json = await apiFetch<{ message?: string }>(`/api/admin/managers/${manager.id}`, {
        method: "PUT",
        body: JSON.stringify({ newPassword }),
      });
      toast.success(json.message ?? "رمز عبور تغییر کرد");
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تغییر رمز ناموفق بود");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{`ویرایش «${`${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || manager.email}»`}</DialogTitle>
        <DialogDescription className="text-xs" dir="ltr">
          {manager.email}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edt-first">نام *</Label>
            <Input id="edt-first" className="rounded-lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edt-last">نام خانوادگی *</Label>
            <Input id="edt-last" className="rounded-lg" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edt-phone">شماره موبایل</Label>
            <Input id="edt-phone" dir="ltr" inputMode="numeric" className="rounded-lg" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>نقش</Label>
            <Select value={role} onValueChange={(v) => { setRole(v); const d = ROLE_DEFAULTS[v]; if (d && permissions.length === 0) setPermissions(d); }} disabled={isSelf || (targetIsSuper && !isSuperAdmin)}>
              <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(targetIsSuper ? [{ value: "SUPER_ADMIN", label: "مدیر کل (دسترسی کامل)" }] : ROLE_OPTIONS).map((r) => (
                  <SelectItem key={r.value} value={r.value} disabled={r.value === "ADMIN" && !isSuperAdmin}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && <p className="text-[10px] text-muted-foreground">نقش حساب خودتان قابل تغییر نیست</p>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-bold">دسترسی‌ها</Label>
            {role !== "ADMIN" && role !== "SUPER_ADMIN" && (
              <button
                type="button"
                className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  const defaults = ROLE_DEFAULTS[role];
                  setPermissions(defaults ? defaults : []);
                }}
              >
                پیش‌فرضِ نقش
              </button>
            )}
          </div>
          {role === "ADMIN" || role === "SUPER_ADMIN" ? (
            <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] leading-5 text-muted-foreground">
              نقش «مدیر کل» به همهٔ بخش‌ها دسترسی دارد.
            </p>
          ) : (
            <>
              <PermissionGrid value={permissions} onChange={setPermissions} />
              <p className="text-[11px] text-muted-foreground">
                بدون هیچ انتخابی، دسترسی‌های پیش‌فرض نقش ({ROLE_FA[role] ?? role}) اعمال می‌شود.
              </p>
            </>
          )}
        </div>

        {/* separate password-reset action (manual hand-off to the employee) */}
        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            تغییر رمز عبور
          </p>
          {isSelf ? (
            <p className="text-[11px] leading-5 text-muted-foreground">
              برای تغییر رمز خودتان از صفحهٔ «حساب من» استفاده کنید (نیاز به رمز فعلی).
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    className="rounded-lg pr-10 text-left"
                    placeholder="رمز جدید (حداقل ۸ کاراکتر)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" className="shrink-0 rounded-lg" onClick={resetPassword} disabled={pwBusy || newPassword.length < 8}>
                  {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  ثبت رمز جدید
                </Button>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                رمز جدید را به کارمند اعلام کنید — همهٔ نشست‌های او خاتمه می‌یابد و باید دوباره وارد شود.
              </p>
            </>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-lg" onClick={onClose}>انصراف</Button>
        <Button onClick={save} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          ذخیره تغییرات
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ── row actions (shared by table + mobile cards) ── */
function RowActions({
  m,
  meId,
  onEdit,
  onRemove,
  onToggleBlock,
  busy,
}: {
  m: ManagerRow;
  meId?: string;
  onEdit: () => void;
  onRemove: () => void;
  onToggleBlock: () => void;
  busy?: boolean;
}) {
  const isSelf = m.id === meId;
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="ویرایش" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-lg", m.isBlocked ? "text-emerald-600 hover:bg-emerald-500/10" : "text-amber-600 hover:bg-amber-500/10")}
        aria-label={m.isBlocked ? "رفع مسدودی" : "مسدود کردن"}
        title={m.isBlocked ? "رفع مسدودی" : "مسدود کردن"}
        onClick={onToggleBlock}
        disabled={isSelf || busy}
      >
        {m.isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
        aria-label="خارج کردن از مدیریت"
        title="خارج کردن از مدیریت"
        onClick={onRemove}
        disabled={isSelf || busy}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ManagerAvatar({ m }: { m: ManagerRow }) {
  const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "مدیر";
  return (
    <span className={cn(
      "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full",
      m.isBlocked ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
    )}>
      {m.avatar ? (
        <img src={m.avatar} alt={`آواتار ${name}`} className="h-full w-full object-cover" />
      ) : (
        <UserRound className="h-4 w-4" />
      )}
    </span>
  );
}

export default function AdminManagersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagerRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ManagerRow | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me"),
  });
  const meId = meData?.user?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "managers"],
    queryFn: () => apiFetch<{ managers: ManagerRow[] }>("/api/admin/managers"),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      apiFetch<{ message?: string }>(`/api/admin/managers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isBlocked }),
      }),
    onSuccess: (json) => {
      toast.success(json.message ?? "وضعیت حساب به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "managers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message?: string }>(`/api/admin/managers/${id}`, { method: "DELETE" }),
    onSuccess: (json) => {
      toast.success(json.message ?? "از مدیریت خارج شد");
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "managers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "عملیات ناموفق بود"),
  });

  const managers = data?.managers ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیران"
        desc="افزودن مدیران و تعیین سطوح دسترسی"
        actions={
          <Button
            className="gold-surface rounded-lg text-primary-foreground hover:opacity-90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            افزودن مدیر
          </Button>
        }
      />

      {/* guide (local GuideNote-style) */}
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-6 text-muted-foreground">
            مدیر کل می‌تواند برای کارمندان خود <b>حساب مدیر</b> بسازد: نام، ایمیل و <b>رمز دلخواه</b> را تعیین و دستی به کارمند تحویل دهید و مشخص کنید به کدام بخش‌های پنل دسترسی داشته باشد. مدیر جدید با همان ایمیل و رمز وارد پنل می‌شود و فقط در بخش‌های مجاز تغییر ایجاد می‌کند. «خارج کردن از مدیریت» حساب را به مشتری عادی تبدیل می‌کند — سفارش‌ها و تیکت‌هایی که مدیریت کرده دست‌نخورده می‌مانند.
          </p>
        </CardContent>
      </Card>

      {isError ? (
        <EmptyState
          title="دسترسی ندارید"
          desc={error instanceof Error && error.message !== "خطا در ارتباط با سرور (403)"
            ? error.message
            : "مشاهده و مدیریت مدیران فقط برای مدیر کل و مدیران با دسترسی تنظیمات ممکن است."}
        />
      ) : isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : managers.length === 0 ? (
        <EmptyState
          title="هنوز مدیری ثبت نشده است"
          desc="نخستین حساب مدیر را برای تیم خود بسازید"
          action={
            <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setCreateOpen(true)}>
              <UserCog className="h-4 w-4" />
              افزودن مدیر
            </Button>
          }
        />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block">
            <AdminTable headers={["مدیر", "نقش", "دسترسی‌ها", "وضعیت", "آخرین ورود", "عملیات"]}>
              {managers.map((m) => (
                <tr key={m.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <ManagerAvatar m={m} />
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate text-sm font-bold">
                          {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "بی‌نام"}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{m.email ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><RoleBadge role={m.role} /></td>
                  <td className="p-3"><PermissionsCell m={m} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          m.isBlocked ? "bg-destructive/12 text-destructive" : "bg-emerald-500/12 text-emerald-600"
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", m.isBlocked ? "bg-destructive" : "bg-emerald-500")} />
                        {m.isBlocked ? "مسدود" : "فعال"}
                      </span>
                      {m.id === meId && <span className="text-[10px] font-bold text-muted-foreground">(شما)</span>}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {m.lastLoginAt ? formatDateTime(m.lastLoginAt) : "—"}
                  </td>
                  <td className="p-3">
                    <RowActions
                      m={m}
                      meId={meId}
                      onEdit={() => { setEditing(m); setEditOpen(true); }}
                      onRemove={() => setRemoveTarget(m)}
                      onToggleBlock={() => blockMutation.mutate({ id: m.id, isBlocked: !m.isBlocked })}
                      busy={blockMutation.isPending || removeMutation.isPending}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>
          </div>

          {/* mobile cards */}
          <div className="grid gap-3 md:hidden">
            {managers.map((m) => (
              <Card key={m.id} className={m.isBlocked ? "border-destructive/30" : undefined}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2.5">
                    <ManagerAvatar m={m} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-bold">
                          {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "بی‌نام"}
                        </p>
                        {m.id === meId && <span className="text-[10px] font-bold text-muted-foreground">(شما)</span>}
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">{m.email ?? "—"}</p>
                    </div>
                    <RoleBadge role={m.role} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <PermissionsCell m={m} />
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", m.isBlocked ? "bg-destructive/12 text-destructive" : "bg-emerald-500/12 text-emerald-600")}>
                      {m.isBlocked ? "مسدود" : "فعال"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {m.lastLoginAt ? `آخرین ورود: ${formatDateTime(m.lastLoginAt)}` : `عضویت: ${formatDateTime(m.createdAt)}`}
                    </p>
                    <RowActions
                      m={m}
                      meId={meId}
                      onEdit={() => { setEditing(m); setEditOpen(true); }}
                      onRemove={() => setRemoveTarget(m)}
                      onToggleBlock={() => blockMutation.mutate({ id: m.id, isBlocked: !m.isBlocked })}
                      busy={blockMutation.isPending || removeMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && <ManagerCreateDialog onClose={() => setCreateOpen(false)} />}
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {editOpen && editing && <ManagerEditDialog manager={editing} onClose={() => setEditOpen(false)} />}
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>خارج کردن از مدیریت</AlertDialogTitle>
            <AlertDialogDescription>
              «{`${removeTarget?.firstName ?? ""} ${removeTarget?.lastName ?? ""}`.trim() || removeTarget?.email}» به مشتری عادی تبدیل می‌شود و دیگر به پنل مدیریت دسترسی نخواهد داشت. حساب و تاریخچهٔ او حذف نمی‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              disabled={removeMutation.isPending}
            >
              خارج کردن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

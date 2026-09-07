"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/admin/image-upload";
import { apiFetch, type BrandRow, type CategoryRow, type ProductRow } from "@/components/admin/api-client";
import { PriceInput } from "@/components/admin/price-input";
import { productSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Info,
  Layers,
  Plus,
  ListChecks,
  Loader2,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  Images as ImagesIcon,
} from "lucide-react";

type SpecRow = { key: string; label: string; value: string; group: string };
type ColorRow = { name: string; hex: string; price: string };
/** v19: variant options — different spec, different price (e.g. capacity) */
type VariantRow = { name: string; priceDelta: string; stock: string };
type GalleryImage = { url: string; alt: string };
/** v20: one color × specification combination — the EXACT absolute price
 *  (Toman) for that pair; price/stock are held as strings while editing.
 *  v26fix: each row also carries its OWN discount price (string while editing,
 *  empty = no discount for this combination). */
type ComboRow = { color: string | null; variant: string | null; price: string; discountPrice: string; stock: string };

/* ── v27b: FLAT VARIANT SYSTEM ─────────────────────────────────
 * The user story: «محصول → Variants → + افزودن Variant → مشخصات + قیمت +
 * موجودی». ONE list, ONE price system — each variant is a row with its OWN
 * dynamic attributes (رنگ / حافظه / RAM / …) plus its own price, discount
 * and stock. On save the rows map onto the store's combination contract
 * (color + variant-string + price/discount/stock) so the storefront pickers,
 * cart and AI search keep working unchanged. */
type VariantAttr = { label: string; value: string; hex: string };
type VariantItem = { uid: string; attrs: VariantAttr[]; price: string; discountPrice: string; stock: string };

/** suggested attribute names — offered via <datalist> in each attr row */
const ATTR_LABEL_SUGGESTIONS = [
  "رنگ", "حافظه", "RAM", "ظرفیت", "سایز", "مدل", "جنس", "نوع", "توان", "ولتاژ", "ابعاد", "تراکم",
];

function isColorLabel(label: string): boolean {
  return /رنگ|color/i.test(label.trim());
}

/** per-attribute value placeholder — tells the admin exactly what to type */
function attrValuePlaceholder(label: string): string {
  const l = label.trim();
  if (isColorLabel(l)) return "رنگ محصول را وارد کنید (مثلاً نارنجی)";
  if (/حافظه|ظرفیت|storage|rom/i.test(l)) return "مثلاً 128GB";
  if (/ram|رم/i.test(l)) return "مثلاً 8GB";
  if (/سایز|اندازه|size/i.test(l)) return "مثلاً ۱۵.۶ اینچ";
  if (/مدل|model/i.test(l)) return "مثلاً A2549";
  return "مقدار این مشخصه را وارد کنید (مثلاً 8GB)";
}

let variantUidCounter = 0;
function newVariantUid(): string {
  variantUidCounter += 1;
  return `vr-${Date.now().toString(36)}-${variantUidCounter}`;
}

/** v27b: map the flat variant rows onto the store's data contract
 *  (combinations + color/variant chip lists + derived base price & stock).
 *  Returns null when no row is complete enough to sell. Duplicate
 *  (رنگ × مشخصه) pairs keep the FIRST row. */
function deriveVariablePayload(
  rows: VariantItem[]
):
  | {
      price: number;
      stock: number;
      colors: { name: string; hex: string }[];
      variants: { name: string; priceDelta: number; stock: number }[];
      combinations: { color: string | null; variant: string | null; price: number; stock?: number; discountPrice?: number }[];
    }
  | null {
  const seen = new Set<string>();
  const valid: { color: string | null; variantStr: string | null; row: VariantItem; hex: string }[] = [];
  for (const r of rows) {
    const attrs = r.attrs.filter((a) => a.label.trim() && a.value.trim());
    if (attrs.length === 0) continue;
    if (toInt(r.price) <= 0) continue;
    const colorAttr = attrs.find((a) => isColorLabel(a.label));
    const color = colorAttr ? colorAttr.value.trim() : null;
    const others = attrs.filter((a) => a !== colorAttr);
    const variantStr =
      others.length === 1
        ? others[0].value.trim().slice(0, 80)
        : others.map((a) => `${a.label.trim()}: ${a.value.trim()}`).join(" · ").slice(0, 80);
    const key = `${color ?? ""}▸${variantStr}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({ color, variantStr: variantStr || null, row: r, hex: colorAttr?.hex || "#000000" });
    if (valid.length >= 60) break; // zod combinations cap
  }
  if (valid.length === 0) return null;
  const combinations = valid.map((v) => ({
    color: v.color,
    variant: v.variantStr,
    price: toInt(v.row.price),
    ...(v.row.stock.trim() !== "" ? { stock: toInt(v.row.stock) } : {}),
    ...(v.row.discountPrice.trim() !== "" ? { discountPrice: toInt(v.row.discountPrice) } : {}),
  }));
  const colorsMap = new Map<string, string>();
  for (const v of valid) if (v.color) colorsMap.set(v.color, v.hex);
  const variantsAgg = new Map<string, number>();
  for (const v of valid)
    if (v.variantStr)
      variantsAgg.set(v.variantStr, (variantsAgg.get(v.variantStr) ?? 0) + (v.row.stock.trim() !== "" ? toInt(v.row.stock) : 0));
  return {
    price: Math.min(...valid.map((v) => toInt(v.row.price))),
    stock: valid.reduce((sum, v) => sum + (v.row.stock.trim() !== "" ? toInt(v.row.stock) : 0), 0),
    colors: [...colorsMap.entries()].map(([name, hex]) => ({ name, hex })),
    variants: [...variantsAgg.entries()].map(([name, stock]) => ({ name, priceDelta: 0, stock })),
    combinations,
  };
}

/** edit-prefill: saved combinations (or legacy colors × variants) → flat rows */
function buildVariantRowsFromProduct(p: ProductRow): VariantItem[] {
  const combos = p.combinations ?? [];
  const colorHexOf = (name: string) =>
    (p.colors ?? []).find((c) => c.name === name)?.hex || "#000000";
  if (combos.length > 0) {
    return combos.map((c) => ({
      uid: newVariantUid(),
      attrs: [
        ...(c.color ? [{ label: "رنگ", value: c.color, hex: colorHexOf(c.color) }] : []),
        ...(c.variant ? [{ label: "مشخصه", value: c.variant, hex: "" }] : []),
        ...(!c.color && !c.variant ? [{ label: "", value: "", hex: "" }] : []),
      ],
      price: c.price != null ? String(c.price) : "",
      discountPrice: c.discountPrice != null ? String(c.discountPrice) : "",
      stock: c.stock != null ? String(c.stock) : "",
    }));
  }
  // legacy v19 product (colors and/or variant options, no combination rows)
  const colors = (p.colors ?? []).filter((c) => c && c.name);
  const variants = (p.variants ?? []).filter((v) => v && v.name);
  if (colors.length === 0 && variants.length === 0) return [];
  const basePrice = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
  const rows: VariantItem[] = [];
  const colorSide = colors.length ? colors : [null];
  const variantSide = variants.length ? variants : [null];
  for (const c of colorSide) {
    for (const v of variantSide) {
      rows.push({
        uid: newVariantUid(),
        attrs: [
          ...(c ? [{ label: "رنگ", value: c.name, hex: c.hex || "#000000" }] : []),
          ...(v ? [{ label: "مشخصه", value: v.name, hex: "" }] : []),
        ],
        price: String(c?.price || Math.max(0, basePrice + (v?.priceDelta ?? 0))),
        discountPrice: "",
        stock: String(v?.stock ?? ""),
      });
    }
  }
  return rows;
}

interface FormState {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  price: string;
  discountPrice: string;
  /** v23: flash-sale deadline — datetime-local string ("YYYY-MM-DDTHH:mm").
   *  Empty = always-on discount. After the deadline the product is no
   *  longer on sale (every surface falls back to the base price). */
  discountEndsAt: string;
  stock: string;
  minStock: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  isSpecial: boolean;
  shortDescription: string;
  description: string;
  mainImage: string | null;
  images: GalleryImage[];
  colors: ColorRow[];
  /** v19: per-spec options with their own price */
  variants: VariantRow[];
  /** v20: SIMPLE (one price) | VARIABLE (per-variant pricing) */
  productType: "SIMPLE" | "VARIABLE";
  /** v20: combination price matrix rows (strings while editing) */
  combinations: ComboRow[];
  /** v27b: flat variant list — the SINGLE editing surface for VARIABLE products */
  variantRows: VariantItem[];
  specifications: SpecRow[];
  tags: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  sku: "",
  categoryId: "",
  brandId: "",
  price: "",
  discountPrice: "",
  discountEndsAt: "",
  /* v26fix (task 4): NO prefilled 0/1 values — inputs stay empty with
   * descriptive Persian placeholders; the legacy defaults (stock 0 /
   * minStock 5) are re-applied at submit time instead. */
  stock: "",
  minStock: "",
  status: "DRAFT",
  featured: false,
  isSpecial: false,
  shortDescription: "",
  description: "",
  mainImage: null,
  images: [],
  colors: [],
  variants: [],
  productType: "SIMPLE",
  combinations: [],
  variantRows: [],
  specifications: [],
  tags: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function toInt(v: string): number {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** v23: ISO date (string or Date) → datetime-local input value ("YYYY-MM-DDTHH:mm"). */
function isoToLocalInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** v19: signed integer parse for variant price deltas (can be negative) */
function toIntSigned(v: string): number {
  const negative = /^\s*-/.test(v);
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}

/** v26fix (task 5): the WHOLE datetime field is clickable — a click anywhere
 *  on the wrapper opens the browser picker (showPicker), not just the tiny
 *  calendar icon. Older browsers that lack showPicker throw → fallback to
 *  plain focus(). The clear button must stay OUTSIDE this wrapper. */
function DateTimeField({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className="relative min-w-0 flex-1 cursor-pointer"
      onClick={() => {
        const el = ref.current;
        if (!el) return;
        try {
          el.showPicker();
        } catch {
          el.focus();
        }
      }}
    >
      <Input
        ref={ref}
        id={id}
        type="datetime-local"
        dir="ltr"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** v20: smart per-spec value hints for the مشخصات فنی editor — every row gets
 *  a placeholder that makes sense for ITS spec type (ram → «۸ گیگابایت»,
 *  os → «Android 15 / iOS 18» …) plus a tiny unit chip. Keys are normalized
 *  (lowercase, trim, [_- ] squashed); aliases share one hint. */
const SPEC_HINTS: Record<string, { ph: string; unit: string }> = {
  cpu: { ph: "مقدار (مثلاً Core i7-13700H)", unit: "پردازنده" },
  processor: { ph: "مقدار (مثلاً Snapdragon 8 Gen 3)", unit: "پردازنده" },
  gpu: { ph: "مقدار (مثلاً RTX 4060)", unit: "گرافیک" },
  graphics: { ph: "مقدار (مثلاً Adreno 750)", unit: "گرافیک" },
  ram: { ph: "مقدار (مثلاً ۸ گیگابایت)", unit: "گیگابایت" },
  memory: { ph: "مقدار (مثلاً ۸ گیگابایت)", unit: "گیگابایت" },
  storage: { ph: "مقدار (مثلاً ۲۵۶ گیگابایت)", unit: "گیگابایت" },
  rom: { ph: "مقدار (مثلاً ۲۵۶ گیگابایت)", unit: "گیگابایت" },
  display: { ph: "مقدار (مثلاً ۶.۱ اینچ OLED)", unit: "اینچ" },
  screen: { ph: "مقدار (مثلاً ۶.۱ اینچ OLED)", unit: "اینچ" },
  displaysize: { ph: "مقدار (مثلاً ۶.۱ اینچ)", unit: "اینچ" },
  screensize: { ph: "مقدار (مثلاً ۶.۱ اینچ)", unit: "اینچ" },
  camera: { ph: "مقدار (مثلاً ۴۸ مگاپیکسل)", unit: "مگاپیکسل" },
  battery: { ph: "مقدار (مثلاً ۵۰۰۰ میلی‌آمپر)", unit: "میلی‌آمپرساعت" },
  os: { ph: "مقدار (مثلاً Android 15 / iOS 18)", unit: "سیستم‌عامل" },
  network: { ph: "مقدار (مثلاً 5G)", unit: "شبکه" },
  refresh: { ph: "مقدار (مثلاً ۱۲۰ هرتز)", unit: "هرتز" },
  refreshrate: { ph: "مقدار (مثلاً ۱۲۰ هرتز)", unit: "هرتز" },
  resolution: { ph: "مقدار (مثلاً ۲۵۶۰×۱۴۴۰)", unit: "پیکسل" },
  weight: { ph: "مقدار (مثلاً ۱۸۹ گرم)", unit: "گرم" },
  ports: { ph: "مقدار (مثلاً USB-C ×2)", unit: "درگاه" },
  sim: { ph: "مقدار (مثلاً دو سیم‌کارت)", unit: "سیم‌کارت" },
  charging: { ph: "مقدار (مثلاً ۴۵ وات)", unit: "وات" },
  audio: { ph: "مقدار (مثلاً Dolby Atmos)", unit: "صدا" },
};

function specHint(key: string): { ph: string; unit: string } {
  const norm = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return SPEC_HINTS[norm] ?? { ph: "مقدار (متن آزاد)", unit: "" };
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children, desc }: { title: string; icon: ReactNode; children: ReactNode; desc?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {icon}
          </span>
          {title}
          {desc && <span className="text-[11px] font-normal text-muted-foreground">— {desc}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!productId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  /** v26fix (task 7): loading state of the «پیشنهاد هوشمند AI» button */
  const [suggesting, setSuggesting] = useState(false);
  /** v27b (T2): loading state of the «تکمیل مشخصات با هوش مصنوعی» button */
  const [aiCompleting, setAiCompleting] = useState(false);
  /** v28: loading state of the SEO card «تکمیل سئو با هوش مصنوعی» button */
  const [aiSeoRunning, setAiSeoRunning] = useState(false);

  const { data: catsData } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<{ categories: CategoryRow[] }>("/api/admin/categories"),
  });
  const { data: brandsData } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: () => apiFetch<{ brands: BrandRow[] }>("/api/admin/brands"),
  });
  const { data: prodData, isLoading: prodLoading } = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => apiFetch<{ product: ProductRow }>(`/api/admin/products/${productId}`),
    enabled: isEdit,
  });

  const categories = catsData?.categories ?? [];
  const brands = brandsData?.brands ?? [];

  // Prefill on edit
  useEffect(() => {
    if (!prodData?.product) return;
    const p = prodData.product;
    setForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: p.category?.id ?? "",
      brandId: p.brand?.id ?? "",
      price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : "",
      discountEndsAt: isoToLocalInput(p.discountEndsAt ?? null),
      stock: String(p.stock),
      minStock: String(p.minStock ?? 5),
      status: (p.status as FormState["status"]) ?? "DRAFT",
      featured: !!p.featured,
      isSpecial: !!p.isSpecial,
      shortDescription: p.shortDescription ?? "",
      description: p.description ?? "",
      mainImage: p.mainImage,
      images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "" })),
      colors: (p.colors ?? []).map((c) => ({ name: c.name, hex: c.hex || "#000000", price: c.price ? String(c.price) : "" })),
      variants: (p.variants ?? []).map((v) => ({
        name: v.name,
        priceDelta: String(v.priceDelta ?? 0),
        stock: String(v.stock ?? 0),
      })),
      // v20: product type + combination matrix (numbers → editable strings)
      productType: p.productType === "VARIABLE" ? "VARIABLE" : "SIMPLE",
      combinations: (p.combinations ?? []).map((c) => ({
        color: c.color ?? null,
        variant: c.variant ?? null,
        price: c.price != null ? String(c.price) : "",
        // v26fix: per-combination discount price (absent on legacy rows)
        discountPrice: c.discountPrice != null ? String(c.discountPrice) : "",
        stock: c.stock != null ? String(c.stock) : "",
      })),
      // v27b: flat variant rows for VARIABLE products (combinations → rows;
      // legacy colors × variants products are converted too)
      variantRows: p.productType === "VARIABLE" ? buildVariantRowsFromProduct(p) : [],
      specifications: (p.specifications ?? []).map((s) => ({
        key: s.key,
        label: s.label,
        value: s.value,
        group: s.group ?? "",
      })),
      tags: (p.tags ?? []).join("، "),
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      seoKeywords: p.seoKeywords ?? "",
    });
    setSlugTouched(true);
  }, [prodData]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };

  // category spec template
  const loadSpecTemplate = () => {
    if (!form.categoryId) {
      toast.error("ابتدا دسته‌بندی را انتخاب کنید");
      return;
    }
    const cat = categories.find((c) => c.id === form.categoryId);
    if (!cat?.specTemplate) {
      toast.error("این دسته‌بندی قالب مشخصاتی ندارد");
      return;
    }
    let template: { key: string; label: string }[] = [];
    try {
      template = JSON.parse(cat.specTemplate);
    } catch {
      toast.error("قالب مشخصات دسته‌بندی نامعتبر است");
      return;
    }
    setForm((f) => {
      const existingKeys = new Set(f.specifications.map((s) => s.key));
      const rows = template
        .filter((t) => !existingKeys.has(t.key))
        .map((t) => ({ key: t.key, label: t.label, value: "", group: "" }));
      return { ...f, specifications: [...f.specifications, ...rows] };
    });
    toast.success("قالب مشخصات دسته‌بندی اعمال شد");
  };

  /** v26fix (task 7): «پیشنهاد هوشمند AI» — asks the backend (which owns the AI
   *  provider keys — they never reach the browser) for spec rows that fit the
   *  REAL category/product, then merges the rows whose key isn't present yet. */
  const suggestSpecs = async () => {
    if (suggesting) return;
    if (!form.categoryId) {
      toast.error("ابتدا دسته‌بندی را انتخاب کنید");
      return;
    }
    setSuggesting(true);
    try {
      const json = await apiFetch<{ rows?: { key: string; label: string }[]; source?: string; note?: string }>(
        "/api/admin/products/suggest-specs",
        {
          method: "POST",
          body: JSON.stringify({
            categoryId: form.categoryId,
            ...(form.name.trim() ? { productName: form.name.trim() } : {}),
          }),
        }
      );
      if (json.note) toast.info(json.note);
      const rows = (json.rows ?? []).filter(
        (r) => r && typeof r.key === "string" && r.key.trim() && typeof r.label === "string" && r.label.trim()
      );
      const existingKeys = new Set(form.specifications.map((s) => s.key));
      const fresh = rows
        .filter((r) => !existingKeys.has(r.key))
        .map((r) => ({ key: r.key.trim(), label: r.label.trim(), value: "", group: "" }));
      if (fresh.length === 0) {
        toast.info("مشخصهٔ جدیدی برای افزودن نبود — همهٔ پیشنهادها از قبل موجودند");
        return;
      }
      setForm((f) => ({ ...f, specifications: [...f.specifications, ...fresh] }));
      toast.success(`${fresh.length.toLocaleString("fa-IR")} مشخصهٔ پیشنهادی هوش مصنوعی اضافه شد`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "دریافت پیشنهاد هوش مصنوعی ناموفق بود");
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    if (saving) return;
    // Persian client-side validation for required basics
    if (form.name.trim().length < 2) return toast.error("نام محصول حداقل ۲ کاراکتر باشد");
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) return toast.error("اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");
    if (form.sku.trim().length < 2) return toast.error("کد انبار (SKU) حداقل ۲ کاراکتر باشد");
    if (form.productType === "SIMPLE" && toInt(form.price) <= 0)
      return toast.error("قیمت باید عددی مثبت باشد");
    if (!form.categoryId) return toast.error("دسته‌بندی محصول را انتخاب کنید");
    if (!form.brandId) return toast.error("برند محصول را انتخاب کنید");
    const tags = form.tags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);

    /* ── v27b: VARIABLE products — derive EVERYTHING from the flat variant
     * rows (ONE price system). color = the رنگ attribute; the other attrs
     * become the variant string (1 attr → value, 2+ → «label: value» pairs);
     * base price = min variant price; total stock = sum of variant stocks.
     * SIMPLE products keep the saved rows untouched (passthrough, no loss). */
    const variableDerived =
      form.productType === "VARIABLE"
        ? deriveVariablePayload(form.variantRows)
        : null;
    if (form.productType === "VARIABLE" && !variableDerived) {
      return toast.error("برای محصول متغیر حداقل یک Variant با مشخصه‌های پرشده و قیمت معتبر لازم است");
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      price: variableDerived ? variableDerived.price : toInt(form.price),
      discountPrice: variableDerived ? null : form.discountPrice ? toInt(form.discountPrice) : null,
      discountEndsAt: variableDerived ? null : form.discountEndsAt ? new Date(form.discountEndsAt).toISOString() : null,
      stock: variableDerived ? variableDerived.stock : form.stock.trim() ? toInt(form.stock) : 0,
      // v26fix: empty minStock keeps the legacy default (5) on save
      minStock: form.minStock.trim() ? toInt(form.minStock) : 5,
      categoryId: form.categoryId,
      brandId: form.brandId,
      colors: variableDerived
        ? variableDerived.colors
        : form.colors
            .filter((c) => c.name.trim())
            .map((c) => ({
              name: c.name.trim(),
              hex: c.hex || undefined,
              // v19: optional dedicated price for this color (absolute, Toman)
              ...(c.price.trim() && toInt(c.price) > 0 ? { price: toInt(c.price) } : {}),
            })),
      // v19: variant options (different specs → different price)
      variants: variableDerived
        ? variableDerived.variants
        : form.variants
            .filter((v) => v.name.trim())
            .map((v) => ({
              name: v.name.trim(),
              priceDelta: toIntSigned(v.priceDelta),
              stock: toInt(v.stock),
            })),
      // v20: product type + combination matrix (numbers, not strings)
      productType: form.productType,
      combinations: variableDerived ? variableDerived.combinations : form.combinations.map((c) => ({
        color: c.color,
        variant: c.variant,
        price: toInt(c.price),
        ...(c.stock.trim() !== "" ? { stock: toInt(c.stock) } : {}),
        ...(c.discountPrice.trim() !== "" ? { discountPrice: toInt(c.discountPrice) } : {}),
      })),
      specifications: form.specifications
        .filter((s) => s.key.trim() && s.label.trim() && s.value.trim())
        .map((s) => ({
          key: s.key.trim(),
          label: s.label.trim(),
          value: s.value.trim(),
          ...(s.group.trim() ? { group: s.group.trim() } : {}),
        })),
      tags: tags.length ? tags : undefined,
      mainImage: form.mainImage,
      images: form.images.filter((i) => i.url).map((i) => ({ url: i.url, alt: i.alt || undefined })),
      status: form.status,
      featured: form.featured,
      isSpecial: form.isSpecial,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      seoKeywords: form.seoKeywords.trim() || null,
    };

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "اطلاعات فرم نامعتبر است");
      return;
    }
    if (!payload.slug) {
      toast.error("اسلاگ (آدرس یکتا) الزامی است");
      return;
    }

    setSaving(true);
    try {
      const json = await apiFetch<{ message?: string }>(
        isEdit ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      toast.success(json.message ?? "محصول ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      router.push("/admin/products");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره محصول ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const effectivePrice = useMemo(() => {
    const price = toInt(form.price);
    const discount = form.discountPrice ? toInt(form.discountPrice) : null;
    return discount && discount < price && price > 0 ? discount : price;
  }, [form.price, form.discountPrice]);

  /* ── v27b: flat variant list (VARIABLE products) — the ONE editing surface.
   *  The old dual system (رنگ‌ها editor + مشخصه‌ها editor + generated
   *  combination matrix) is replaced by a single list where each Variant
   *  carries its own attributes + price + discount + stock. */
  const isVariable = form.productType === "VARIABLE";

  /* derived preview of the VARIABLE pricing (live summary in the price card) */
  const variablePreview = useMemo(
    () => (isVariable ? deriveVariablePayload(form.variantRows) : null),
    [isVariable, form.variantRows]
  );

  /** live duplicate detection — two rows resolving to the same (رنگ × مشخصه)
   *  key would collide on the storefront; warn inline instead of failing late */
  const duplicateRowUids = useMemo(() => {
    const seen = new Map<string, string>();
    const dup = new Set<string>();
    for (const r of form.variantRows) {
      const attrs = r.attrs.filter((a) => a.label.trim() && a.value.trim());
      if (attrs.length === 0) continue;
      const colorAttr = attrs.find((a) => isColorLabel(a.label));
      const color = colorAttr ? colorAttr.value.trim() : null;
      const others = attrs.filter((a) => a !== colorAttr);
      const variantStr = others.length === 1 ? others[0].value.trim() : others.map((a) => `${a.label.trim()}: ${a.value.trim()}`).join(" · ");
      const key = `${color ?? ""}▸${variantStr}`;
      if (seen.has(key)) dup.add(r.uid);
      else seen.set(key, r.uid);
    }
    return dup;
  }, [form.variantRows]);

  const patchVariantRow = (uid: string, patch: Partial<Omit<VariantItem, "uid" | "attrs">>) =>
    setForm((f) => ({
      ...f,
      variantRows: f.variantRows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)),
    }));

  const patchVariantAttr = (uid: string, attrIdx: number, patch: Partial<VariantAttr>) =>
    setForm((f) => ({
      ...f,
      variantRows: f.variantRows.map((r) =>
        r.uid === uid
          ? { ...r, attrs: r.attrs.map((a, i) => (i === attrIdx ? { ...a, ...patch } : a)) }
          : r
      ),
    }));

  const addVariantRow = () =>
    setForm((f) => ({
      ...f,
      variantRows: [
        ...f.variantRows,
        { uid: newVariantUid(), attrs: [{ label: "", value: "", hex: "#000000" }], price: "", discountPrice: "", stock: "" },
      ],
    }));

  const removeVariantRow = (uid: string) =>
    setForm((f) => ({ ...f, variantRows: f.variantRows.filter((r) => r.uid !== uid) }));

  const addVariantAttr = (uid: string) =>
    setForm((f) => ({
      ...f,
      variantRows: f.variantRows.map((r) => (r.uid === uid ? { ...r, attrs: [...r.attrs, { label: "", value: "", hex: "#000000" }] } : r)),
    }));

  const removeVariantAttr = (uid: string, attrIdx: number) =>
    setForm((f) => ({
      ...f,
      variantRows: f.variantRows.map((r) => (r.uid === uid ? { ...r, attrs: r.attrs.filter((_, i) => i !== attrIdx) } : r)),
    }));

  const moveVariantRow = (uid: string, dir: -1 | 1) =>
    setForm((f) => {
      const idx = f.variantRows.findIndex((r) => r.uid === uid);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= f.variantRows.length) return f;
      const rows = [...f.variantRows];
      [rows[idx], rows[target]] = [rows[target], rows[idx]];
      return { ...f, variantRows: rows };
    });

  /* ── v27b (T2): «تکمیل مشخصات محصول با هوش مصنوعی» ──
   *  Admin types the NAME, clicks one button, the backend AI chain fills every
   *  field it RELIABLY knows. Rules (user req 12–14): unknown product →
   *  nothing filled + honest notice; name/price/images NEVER touched; only
   *  EMPTY fields are filled (existing content wins); brand/category are
   *  auto-selected only when they match a REAL store record and none is
   *  selected yet. */
  const aiComplete = async () => {
    if (aiCompleting) return;
    if (form.name.trim().length < 2) return toast.error("ابتدا نام محصول را وارد کنید (حداقل ۲ کاراکتر)");
    setAiCompleting(true);
    try {
      const json = await apiFetch<{ completion?: {
        found: boolean;
        shortDescription?: string;
        description?: string;
        highlights?: string[];
        specifications?: { key: string; label: string; value: string }[];
        tags?: string[];
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
        suggestedBrand?: string;
        suggestedCategory?: string;
        variants?: { attrs: { label: string; value: string }[] }[];
        notes?: string;
      } }>(
        "/api/admin/products/ai-complete",
        { method: "POST", body: JSON.stringify({ name: form.name.trim() }) }
      );
      const c = json.completion;
      if (!c || !c.found) {
        toast.info(
          `اطلاعات معتبری دربارهٔ «${form.name.trim()}» پیدا نشد — هیچ فیلدی تغییر نکرد و مقادیر ساختگی تولید نشد.` +
          (c?.notes ? `\n${c.notes}` : "")
        );
        return;
      }

      const filled: string[] = [];
      const skipped: string[] = [];
      const next: FormState = { ...form };

      const fillText = (key: "shortDescription" | "description" | "seoTitle" | "seoDescription" | "seoKeywords", label: string, value?: string) => {
        if (!value || !value.trim()) return;
        if (String(next[key] ?? "").trim()) {
          skipped.push(label);
          return;
        }
        (next[key] as string) = value.trim();
        filled.push(label);
      };
      fillText("shortDescription", "توضیح کوتاه", c.shortDescription);
      fillText("description", "توضیحات کامل", c.description);
      fillText("seoTitle", "عنوان سئو", c.seoTitle);
      fillText("seoDescription", "توضیحات متا", c.seoDescription);
      fillText("seoKeywords", "کلمات کلیدی", c.seoKeywords);

      // ویژگی‌های برجسته → appended to the description (only when it was empty)
      if (c.highlights?.length && !next.description.trim()) {
        next.description = `${next.description}${c.description ? "\n\n" : ""}ویژگی‌های برجسته:\n${c.highlights.map((h) => `• ${h}`).join("\n")}`;
        if (!c.description) filled.push("ویژگی‌های محصول");
      }

      // tags → merged (unique)
      if (c.tags?.length) {
        const cur = next.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean);
        const merged = [...cur];
        for (const t of c.tags) if (!merged.includes(t)) merged.push(t);
        if (merged.length > cur.length) {
          next.tags = merged.join("، ");
          filled.push("برچسب‌ها");
        }
      }

      // specifications → merge NEW keys only (existing values win)
      if (c.specifications?.length) {
        const existingKeys = new Set(next.specifications.map((s) => s.key));
        const fresh = c.specifications
          .filter((s) => s && s.key && s.label && s.value && !existingKeys.has(s.key))
          .map((s) => ({ key: s.key, label: s.label, value: s.value, group: "" }));
        if (fresh.length > 0) {
          next.specifications = [...next.specifications, ...fresh];
          filled.push(`مشخصات فنی (${fresh.length.toLocaleString("fa-IR")} مورد)`);
        }
      }

      // brand / category → auto-select ONLY when nothing is selected AND the
      // suggestion matches a REAL store record
      if (c.suggestedBrand && !next.brandId) {
        const match = brands.find((b) => b.name.trim() === c.suggestedBrand!.trim() || b.name.trim().includes(c.suggestedBrand!.trim()));
        if (match) {
          next.brandId = match.id;
          filled.push(`برند (${match.name})`);
        }
      }
      if (c.suggestedCategory && !next.categoryId) {
        const match = categories.find((cat) => cat.name.trim() === c.suggestedCategory!.trim() || cat.name.trim().includes(c.suggestedCategory!.trim()));
        if (match) {
          next.categoryId = match.id;
          filled.push(`دسته‌بندی (${match.name})`);
        }
      }

      // variants → suggested attribute rows (prices/stock stay EMPTY for the admin)
      if (next.productType === "VARIABLE" && next.variantRows.length === 0 && c.variants?.length) {
        next.variantRows = c.variants.map((v) => ({
          uid: newVariantUid(),
          attrs: v.attrs.map((a) => ({ label: a.label, value: a.value, hex: isColorLabel(a.label) ? "#000000" : "" })),
          price: "",
          discountPrice: "",
          stock: "",
        }));
        filled.push(`Variantهای پیشنهادی (${c.variants.length.toLocaleString("fa-IR")} مورد — قیمت و موجودی را وارد کنید)`);
      }

      setForm(next);
      if (c.notes) toast.info(c.notes);
      toast.success(
        filled.length > 0
          ? `${filled.length.toLocaleString("fa-IR")} فیلد تکمیل شد: ${filled.join("، ")}` +
            (skipped.length > 0 ? `\n${skipped.length.toLocaleString("fa-IR")} فیلد از قبل پر بود و دست نخورد (${skipped.join("، ")})` : "")
          : "هوش مصنوعی اطلاعاتی برای تکمیل نداشت — فیلدهای پرشده را دست نزد"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تکمیل مشخصات ناموفق بود");
    } finally {
      setAiCompleting(false);
    }
  };

  /* ── v28: «تکمیل سئو با هوش مصنوعی» (SEO card) ──
   *  One click → the AI (GapGPT chain, server-side) writes the three SEO
   *  fields from the product's REAL data (name/brand/category/short desc).
   *  Strict no-fabrication: the backend prompt only uses the provided
   *  fields. The three fields are OVERWRITTEN together (explicit SEO action). */
  const aiSeo = async () => {
    if (aiSeoRunning) return;
    if (form.name.trim().length < 2) return toast.error("ابتدا نام محصول را وارد کنید (حداقل ۲ کاراکتر)");
    setAiSeoRunning(true);
    try {
      const brandName = brands.find((b) => b.id === form.brandId)?.name;
      const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
      const json = await apiFetch<{ seo?: { seoTitle?: string; seoDescription?: string; seoKeywords?: string } }>(
        "/api/admin/products/ai-seo",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            brandName: brandName || undefined,
            categoryName: categoryName || undefined,
            shortDescription: form.shortDescription.trim() || undefined,
          }),
        }
      );
      const seo = json.seo;
      if (!seo || (!seo.seoTitle && !seo.seoDescription && !seo.seoKeywords)) {
        toast.error("هوش مصنوعی فیلد سئویی تولید نکرد — دوباره تلاش کنید");
        return;
      }
      setForm((f) => ({
        ...f,
        seoTitle: seo.seoTitle?.trim() || f.seoTitle,
        seoDescription: seo.seoDescription?.trim() || f.seoDescription,
        seoKeywords: seo.seoKeywords?.trim() || f.seoKeywords,
      }));
      toast.success(
        "فیلدهای سئو با هوش مصنوعی نوشته شد — قبل از ذخیره بازبینی کنید" +
        (brandName || categoryName ? " (بر پایهٔ نام، برند و دستهٔ واقعی محصول)" : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تکمیل سئو ناموفق بود");
    } finally {
      setAiSeoRunning(false);
    }
  };

  if (isEdit && prodLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black md:text-2xl">
            {isEdit ? `ویرایش: ${form.name || "محصول"}` : "محصول جدید"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isEdit ? "ویرایش اطلاعات کامل محصول" : "ایجاد محصول جدید در کاتالوگ فروشگاه"}
          </p>
          {isEdit && prodData?.product && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{formatFa(prodData.product.viewCount ?? 0)} بازدید</span>
              <span className="rounded-full bg-muted px-2 py-0.5">{formatFa(prodData.product.orderCount ?? 0)} سفارش</span>
              <span className="rounded-full bg-muted px-2 py-0.5">{formatFa(prodData.product.wishlistCount ?? 0)} علاقه‌مندی</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-lg" onClick={() => router.push("/admin/products")}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره محصول
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Basic info */}
        <SectionCard title="اطلاعات اصلی" icon={<Info className="h-3.5 w-3.5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 sm:col-span-2">
              {/* v27b: name (admin-owned) + one-click AI completion — the AI
                  fills the OTHER fields from this name; it never changes it. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Field label="نام محصول *" htmlFor="p-name" hint="نام را شما تعیین می‌کنید — هوش مصنوعی نام را تغییر نمی‌دهد">
                    <Input id="p-name" className="h-11 rounded-lg text-[15px]" value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="مثلاً: Google Nest Hub 7-inch" />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-lg border-primary/40 font-bold"
                  onClick={aiComplete}
                  disabled={aiCompleting}
                  title="تکمیل خودکار توضیحات، مشخصات، برچسب‌ها و سئو بر اساس نام محصول — قیمت و تصویر را خودتان وارد می‌کنید"
                >
                  {aiCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                  {aiCompleting ? "در حال تکمیل…" : "تکمیل مشخصات با هوش مصنوعی"}
                </Button>
              </div>
            </div>
            <Field label="اسلاگ (آدرس یکتا) *" htmlFor="p-slug" hint={form.slug ? `/products/${form.slug}` : "به‌صورت خودکار از نام تولید می‌شود"}>
              <Input id="p-slug" dir="ltr" className="rounded-lg text-left" value={form.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
                placeholder="samsung-galaxy-s24" />
            </Field>
            <Field label="کد انبار (SKU) *" htmlFor="p-sku">
              <Input id="p-sku" dir="ltr" className="h-11 rounded-lg text-left text-[15px] md:text-[15px]" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="کد انبار SKU" />
            </Field>
            <Field label="دسته‌بندی *">
              <Select
                value={form.categoryId}
                onValueChange={(v) => {
                  // v26fix (task 7): ALWAYS merge the category's spec template —
                  // rows whose key is not already present get appended, and a
                  // Persian toast reports how many landed (fa-IR digits).
                  const cat = categories.find((c) => c.id === v);
                  let added: { key: string; label: string; value: string; group: string }[] = [];
                  if (cat?.specTemplate) {
                    try {
                      const template = JSON.parse(cat.specTemplate) as { key?: string; label?: string }[];
                      if (Array.isArray(template)) {
                        const existingKeys = new Set(form.specifications.map((s) => s.key));
                        added = template
                          .filter((t) => t && typeof t.key === "string" && t.key.trim() && !existingKeys.has(t.key))
                          .map((t) => ({ key: t.key!.trim(), label: typeof t.label === "string" ? t.label : "", value: "", group: "" }));
                      }
                    } catch {
                      /* invalid template — ignore */
                    }
                  }
                  setForm((f) => ({ ...f, categoryId: v, specifications: [...f.specifications, ...added] }));
                  if (added.length > 0) {
                    toast.success(`${added.length.toLocaleString("fa-IR")} مشخصهٔ ${cat?.name ?? "دسته‌بندی"} اضافه شد`);
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-lg"><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && <p className="p-2 text-xs text-muted-foreground">دسته‌بندی‌ای ثبت نشده است</p>}
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.parentName ? ` (${c.parentName})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="برند *">
              <Select value={form.brandId} onValueChange={(v) => set("brandId", v)}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue placeholder="انتخاب برند" /></SelectTrigger>
                <SelectContent>
                  {brands.length === 0 && <p className="p-2 text-xs text-muted-foreground">برندی ثبت نشده است</p>}
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* Price & stock */}
        <SectionCard title="قیمت و موجودی" icon={<Star className="h-3.5 w-3.5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* v20: product type — SIMPLE (single price) | VARIABLE (per-variant pricing) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">نوع محصول</Label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1" role="group" aria-label="نوع محصول">
                <button
                  type="button"
                  onClick={() => set("productType", "SIMPLE")}
                  aria-pressed={form.productType === "SIMPLE"}
                  className={"rounded-lg px-3 py-2 text-xs font-bold transition-all " + (form.productType === "SIMPLE"
                    ? "border border-primary/30 bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground")}
                >
                  محصول ساده
                </button>
                <button
                  type="button"
                  onClick={() => set("productType", "VARIABLE")}
                  aria-pressed={form.productType === "VARIABLE"}
                  className={"rounded-lg px-3 py-2 text-xs font-bold transition-all " + (form.productType === "VARIABLE"
                    ? "border border-primary/30 bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground")}
                >
                  محصول متغیر (دارای Variant)
                </button>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                {isVariable
                  ? "قیمت و موجودی هر Variant در بخش «گونه‌های محصول» (پایین صفحه) تعیین می‌شود — این بخش به‌صورت خودکار محاسبه می‌شود و نیازی به وارد کردن دوباره نیست."
                  : "یک قیمت واحد برای کل محصول — رنگ‌ها و گزینه‌های ذخیره‌شده بدون تغییر می‌مانند."}
              </p>
            </div>
            {isVariable ? (
              /* v27b: ONE price system — VARIABLE products derive base price &
               * stock from the variant list below; no second price box exists. */
              <div className="sm:col-span-2 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                  <Layers className="h-3.5 w-3.5" />
                  قیمت و موجودی این محصول از Variantها محاسبه می‌شود
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">قیمت پایه (کمترین قیمت Variantها)</p>
                    <p className="mt-0.5 text-sm font-black tabular-nums">
                      {variablePreview ? `${variablePreview.price.toLocaleString("fa-IR")} تومان` : "— Variant با قیمت معتبر وارد کنید"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">موجودی کل (مجموع موجودی Variantها)</p>
                    <p className="mt-0.5 text-sm font-black tabular-nums">
                      {variablePreview ? `${variablePreview.stock.toLocaleString("fa-IR")} عدد` : "—"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {variablePreview
                    ? `${variablePreview.combinations.length.toLocaleString("fa-IR")} Variant معتبر آماده ذخیره است${variablePreview.combinations.some((c) => c.discountPrice) ? " — برخی Variantها تخفیف اختصاصی دارند" : ""}`
                    : "هنوز Variant کاملی وارد نشده — در بخش «گونه‌های محصول» دکمهٔ «افزودن Variant» را بزنید."}
                </p>
              </div>
            ) : (
              <>
            <Field label="قیمت (تومان) *" htmlFor="p-price">
              <PriceInput id="p-price" className="h-11 text-[15px] md:text-[15px]" value={form.price} onChange={(v) => set("price", v)} placeholder="قیمت را به تومان وارد کنید (مثلاً ۲۵٬۰۰۰٬۰۰۰)" />
            </Field>
            <Field label="قیمت با تخفیف (تومان)" htmlFor="p-discount" hint="خالی = بدون تخفیف">
              <PriceInput id="p-discount" className="h-11 text-[15px] md:text-[15px]" value={form.discountPrice} onChange={(v) => set("discountPrice", v)} placeholder="قیمت با تخفیف را به تومان وارد کنید — خالی = بدون تخفیف" />
            </Field>
            {/* v23: flash-sale deadline — while live the discount shows a live
                countdown in the storefront (gaming template deal cards); after
                it passes the product automatically stops being on sale */}
            <Field
              label="پایان تخفیف شگفت‌انگیز (اختیاری)"
              htmlFor="p-deadline"
              hint={form.discountEndsAt ? "پس از این زمان، تخفیف خودکار غیرفعال می‌شود" : "خالی = تخفیف دائمی"}
            >
              <div className="flex items-center gap-2">
                {/* v26fix (task 5): the ENTIRE field opens the picker (not just
                    the calendar icon); the «حذف» button stays outside it */}
                <DateTimeField
                  id="p-deadline"
                  value={form.discountEndsAt}
                  onChange={(v) => set("discountEndsAt", v)}
                  className="h-11 rounded-lg text-left text-[15px] md:text-[15px]"
                />
                {form.discountEndsAt && (
                  <Button type="button" variant="ghost" size="sm" className="rounded-lg shrink-0" onClick={() => set("discountEndsAt", "")}>
                    حذف
                  </Button>
                )}
              </div>
            </Field>
            <Field label="موجودی انبار *" htmlFor="p-stock">
              <Input id="p-stock" dir="ltr" inputMode="numeric" className="h-11 rounded-lg text-left text-[15px] tabular-nums md:text-[15px]" value={form.stock}
                onChange={(e) => set("stock", e.target.value.replace(/[^\d]/g, ""))} placeholder="تعداد موجودی را وارد کنید" />
            </Field>
              </>
            )}
            <Field label="حداقل موجودی (هشدار اتمام)" htmlFor="p-minstock">
              <Input id="p-minstock" dir="ltr" inputMode="numeric" className="h-11 rounded-lg text-left text-[15px] tabular-nums md:text-[15px]" value={form.minStock}
                onChange={(e) => set("minStock", e.target.value.replace(/[^\d]/g, ""))} placeholder="حداقل موجودی برای هشدار را وارد کنید (عدد)" />
            </Field>
            {!isVariable && (
              <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                قیمت نهایی فروش:{" "}
                <span className="font-black text-foreground tabular-nums">
                  {effectivePrice ? effectivePrice.toLocaleString("fa-IR") : "—"} تومان
                </span>
                {form.discountPrice && toInt(form.discountPrice) < toInt(form.price) && toInt(form.price) > 0 && (
                  <span className="text-emerald-600"> ({Math.round(((toInt(form.price) - toInt(form.discountPrice)) / toInt(form.price)) * 100).toLocaleString("fa-IR")}٪ تخفیف)</span>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status & flags */}
        <SectionCard title="وضعیت و ویژگی‌ها" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <div className="space-y-4">
            <Field label="وضعیت محصول">
              <Select value={form.status} onValueChange={(v) => set("status", v as FormState["status"])}>
                <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                  <SelectItem value="PUBLISHED">منتشر شده</SelectItem>
                  <SelectItem value="ARCHIVED">بایگانی شده</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="p-featured" className="flex items-center gap-1.5 text-sm">محصول ویژه <Star className="h-3.5 w-3.5 text-primary" /></Label>
                <p className="text-[11px] text-muted-foreground">در بخش «محصولات ویژه» صفحه اصلی نمایش داده می‌شود</p>
              </div>
              <Switch id="p-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="p-special" className="flex items-center gap-1.5 text-sm">پیشنهاد ویژه</Label>
                <p className="text-[11px] text-muted-foreground">با برچسب تخفیف ویژه در فروشگاه نمایش داده می‌شود</p>
              </div>
              <Switch id="p-special" checked={form.isSpecial} onCheckedChange={(v) => set("isSpecial", v)} />
            </div>
          </div>
        </SectionCard>

        {/* Descriptions */}
        <SectionCard title="توضیحات" icon={<ListChecks className="h-3.5 w-3.5" />}>
          <div className="space-y-4">
            <Field label="توضیح کوتاه" htmlFor="p-short" hint="حداکثر ۵۰۰ کاراکتر — در کارت محصول و نتایج جستجو">
              <Textarea id="p-short" rows={1} className="rounded-lg" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="خلاصه‌ای یک‌خطی از محصول" />
            </Field>
            <Field label="توضیحات کامل" htmlFor="p-desc">
              <Textarea id="p-desc" rows={6} className="rounded-lg" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="توضیحات کامل محصول، مشخصات و مزایا…" />
            </Field>
            <Field label="برچسب‌ها (با کاما جدا کنید)" htmlFor="p-tags" hint="مثال: سامسونگ، گوشی، پرچمدار">
              <Input id="p-tags" className="rounded-lg" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* Images */}
      <SectionCard title="تصاویر محصول" icon={<ImagesIcon className="h-3.5 w-3.5" />} desc="تصویر اصلی و گالری">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <ImageUpload
              label="تصویر اصلی"
              folder="products"
              height={160}
              value={form.mainImage}
              onChange={(url) => set("mainImage", url)}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              اگر خالی باشد، اولین تصویر گالری به‌عنوان اصلی انتخاب می‌شود.
            </p>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-medium">گالری تصاویر</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => set("images", [...form.images, { url: "", alt: "" }])}
              >
                افزودن تصویر
              </Button>
            </div>
            {form.images.length === 0 && (
              <p className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                هنوز تصویری به گالری اضافه نشده است
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {form.images.map((img, idx) => (
                <div key={idx} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      تصویر {(idx + 1).toLocaleString("fa-IR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" aria-label="جابه‌جایی به بالا"
                        disabled={idx === 0}
                        onClick={() => setForm((f) => {
                          const imgs = [...f.images];
                          [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]];
                          return { ...f, images: imgs };
                        })}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" aria-label="جابه‌جایی به پایین"
                        disabled={idx === form.images.length - 1}
                        onClick={() => setForm((f) => {
                          const imgs = [...f.images];
                          [imgs[idx + 1], imgs[idx]] = [imgs[idx], imgs[idx + 1]];
                          return { ...f, images: imgs };
                        })}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10" aria-label="حذف تصویر"
                        onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <ImageUpload
                    folder="products"
                    height={110}
                    value={img.url || null}
                    onChange={(url) =>
                      setForm((f) => {
                        if (!url) return { ...f, images: f.images.filter((_, i) => i !== idx) };
                        const imgs = [...f.images];
                        imgs[idx] = { ...imgs[idx], url };
                        return { ...f, images: imgs };
                      })
                    }
                  />
                  <Input
                    dir="ltr"
                    className="mt-2 rounded-lg text-left text-xs"
                    placeholder="متن جایگزین (alt)"
                    value={img.alt}
                    onChange={(e) =>
                      setForm((f) => {
                        const imgs = [...f.images];
                        imgs[idx] = { ...imgs[idx], alt: e.target.value };
                        return { ...f, images: imgs };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── v27b: گونه‌های محصول (Variantها) — the SINGLE editing surface for
          VARIABLE products. One list: + افزودن Variant → مشخصه‌ها (رنگ،
          حافظه، RAM، …) + قیمت + تخفیف + موجودی. No second price system:
          base price/stock are derived automatically on save. */}
      {isVariable && (
        <SectionCard title="گونه‌های محصول (Variantها)" icon={<Layers className="h-3.5 w-3.5" />} desc="هر Variant مشخصات، قیمت و موجودی مستقل خودش را دارد">
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-[12px] leading-6 text-muted-foreground">
              <span className="font-bold text-foreground">سه‌گام ساده:</span>{" "}
              ۱) دکمهٔ «افزودن Variant» را بزنید
              <span className="mx-1 text-primary">←</span>
              ۲) مشخصه‌های همان Variant را پر کنید (مثلاً رنگ: نارنجی، حافظه: 128GB)
              <span className="mx-1 text-primary">←</span>
              ۳) قیمت و موجودی همان Variant را وارد کنید — هر Variant قیمت مستقل خودش را دارد.
            </p>
          </div>

          {/* suggested attribute names for the label inputs */}
          <datalist id="variant-attr-labels">
            {ATTR_LABEL_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <div className="space-y-3">
            {form.variantRows.length === 0 && (
              <p className="rounded-xl border border-dashed bg-muted/30 p-5 text-center text-xs leading-6 text-muted-foreground">
                هنوز Variantی تعریف نشده است — دکمهٔ «افزودن Variant» را بزنید تا اولین گونهٔ محصول را بسازید.<br />
                مثال: Variant ۱ → رنگ: نارنجی، حافظه: 128GB، قیمت: ۴۵٬۰۰۰٬۰۰۰ تومان، موجودی: ۱۲
              </p>
            )}
            {form.variantRows.map((row, idx) => {
              const isDup = duplicateRowUids.has(row.uid);
              const summary = row.attrs
                .filter((a) => a.label.trim() && a.value.trim())
                .map((a) => `${a.label.trim()}: ${a.value.trim()}`)
                .join(" · ");
              const rowPrice = toInt(row.price);
              const rowDiscount = row.discountPrice.trim() ? toInt(row.discountPrice) : 0;
              const rowPercent = rowPrice > 0 && rowDiscount > 0 && rowDiscount < rowPrice
                ? Math.round(((rowPrice - rowDiscount) / rowPrice) * 100)
                : 0;
              return (
                <div
                  key={row.uid}
                  className={cn("rounded-xl border p-3.5 space-y-3", isDup && "border-2 border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20")}
                >
                  {/* variant header: number + live summary + reorder + delete */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-[12px] font-black text-primary tabular-nums">
                      {(idx + 1).toLocaleString("fa-IR")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold" title={summary || "Variant بدون مشخصه"}>
                      {summary || "مشخصه‌ها را در پایین وارد کنید…"}
                    </span>
                    {isDup && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-600">
                        تکراری — با Variant دیگری همسان است
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" disabled={idx === 0} aria-label="جابه‌جایی Variant به بالا"
                        onClick={() => moveVariantRow(row.uid, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" disabled={idx === form.variantRows.length - 1} aria-label="جابه‌جایی Variant به پایین"
                        onClick={() => moveVariantRow(row.uid, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10" aria-label={`حذف Variant ${(idx + 1).toLocaleString("fa-IR")}`}
                        onClick={() => removeVariantRow(row.uid)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* attribute rows: [نام مشخصه] [مقدار] [رنگ؟] [حذف] */}
                  <div className="space-y-2">
                    {row.attrs.map((a, ai) => (
                      <div key={ai} className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(180px,1.6fr)_auto]">
                        <Input
                          list="variant-attr-labels"
                          className="h-11 rounded-lg text-[15px]"
                          placeholder="نام مشخصه (رنگ، حافظه، RAM…)"
                          value={a.label}
                          onChange={(e) => patchVariantAttr(row.uid, ai, { label: e.target.value })}
                        />
                        <Input
                          className="h-11 rounded-lg text-[15px]"
                          placeholder={attrValuePlaceholder(a.label)}
                          value={a.value}
                          onChange={(e) => patchVariantAttr(row.uid, ai, { value: e.target.value })}
                        />
                        <div className="flex items-center gap-1">
                          {isColorLabel(a.label) && (
                            <input
                              type="color"
                              aria-label={`کد رنگ ${a.value || (ai + 1).toLocaleString("fa-IR")}`}
                              className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
                              value={a.hex || "#000000"}
                              onChange={(e) => patchVariantAttr(row.uid, ai, { hex: e.target.value })}
                            />
                          )}
                          <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-md text-destructive hover:bg-destructive/10" aria-label="حذف این مشخصه"
                            onClick={() => removeVariantAttr(row.uid, ai)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => addVariantAttr(row.uid)}>
                      <Plus className="h-3.5 w-3.5" />
                      افزودن مشخصه
                    </Button>
                  </div>

                  {/* per-variant price / discount / stock — ONE price system */}
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-2.5 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">قیمت این Variant (تومان) *</Label>
                      <PriceInput
                        ariaLabel={`قیمت Variant ${(idx + 1).toLocaleString("fa-IR")} — ${summary || "بدون عنوان"}`}
                        className="h-11 text-[15px]"
                        placeholder="قیمت را به تومان وارد کنید"
                        value={row.price}
                        onChange={(price) => patchVariantRow(row.uid, { price })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">قیمت با تخفیف</Label>
                      <div className="flex items-center gap-1.5">
                        <PriceInput
                          ariaLabel={`قیمت با تخفیف Variant ${(idx + 1).toLocaleString("fa-IR")}`}
                          className="h-11 text-[15px]"
                          placeholder="قیمت با تخفیف — خالی = بدون تخفیف"
                          value={row.discountPrice}
                          onChange={(discountPrice) => patchVariantRow(row.uid, { discountPrice })}
                        />
                        {rowPercent > 0 && (
                          <span title={`${rowPercent.toLocaleString("fa-IR")}٪ تخفیف`} className="shrink-0 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-emerald-600">
                            {rowPercent.toLocaleString("fa-IR")}٪
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">موجودی این Variant</Label>
                      <Input
                        inputMode="numeric"
                        dir="ltr"
                        className="h-11 rounded-lg text-left text-[15px] tabular-nums"
                        placeholder="تعداد موجودی را وارد کنید"
                        value={row.stock}
                        onChange={(e) => patchVariantRow(row.uid, { stock: e.target.value.replace(/[^\d]/g, "") })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <Button type="button" className="w-full rounded-lg font-bold gold-surface text-primary-foreground hover:opacity-90" onClick={addVariantRow}>
              <Plus className="h-4 w-4" />
              افزودن Variant
            </Button>

            {form.variantRows.length > 0 && (
              <p className="text-center text-[11px] leading-5 text-muted-foreground">
                {variablePreview
                  ? `${variablePreview.combinations.length.toLocaleString("fa-IR")} Variant معتبر · قیمت پایه ${variablePreview.price.toLocaleString("fa-IR")} تومان · مجموع موجودی ${variablePreview.stock.toLocaleString("fa-IR")} عدد`
                  : "هنوز Variant کاملی نیست — حداقل یک Variant با مشخصه‌های پرشده و قیمت لازم است."}
              </p>
            )}
          </div>
        </SectionCard>
      )}

              <SectionCard title="مشخصات فنی" icon={<ListChecks className="h-3.5 w-3.5" />}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">جدول مشخصات صفحه محصول</p>
            <div className="flex flex-wrap items-center gap-2">
              {/* v26fix (task 7): AI suggests the specs that fit the REAL category/product */}
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={suggestSpecs} disabled={suggesting}>
                {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                پیشنهاد هوشمند AI
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={loadSpecTemplate}>
                از قالب دسته‌بندی
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {form.specifications.length === 0 && (
              <p className="rounded-xl border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                مشخصه‌ای تعریف نشده است
              </p>
            )}
            {form.specifications.map((s, idx) => {
              /* v20: smart per-key placeholder + unit chip (ram → «۸ گیگابایت»، os → «Android 15» …) */
              const hint = specHint(s.key);
              return (
              <div key={idx} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-2">
                <Input dir="ltr" className="rounded-lg text-left text-xs" placeholder="کلید (انگلیسی) مثل screen_size"
                  value={s.key}
                  onChange={(e) => setForm((f) => {
                    const specs = [...f.specifications];
                    specs[idx] = { ...specs[idx], key: e.target.value };
                    return { ...f, specifications: specs };
                  })} />
                <Input className="rounded-lg text-xs" placeholder="عنوان فارسی (اندازه صفحه)"
                  value={s.label}
                  onChange={(e) => setForm((f) => {
                    const specs = [...f.specifications];
                    specs[idx] = { ...specs[idx], label: e.target.value };
                    return { ...f, specifications: specs };
                  })} />
                <div className="flex items-center gap-1.5">
                  <Input className="min-w-0 flex-1 rounded-lg text-xs" placeholder={hint.ph}
                    value={s.value}
                    onChange={(e) => setForm((f) => {
                      const specs = [...f.specifications];
                      specs[idx] = { ...specs[idx], value: e.target.value };
                      return { ...f, specifications: specs };
                    })} />
                  {hint.unit && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {hint.unit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input className="rounded-lg text-xs" placeholder="گروه (اختیاری)"
                    value={s.group}
                    onChange={(e) => setForm((f) => {
                      const specs = [...f.specifications];
                      specs[idx] = { ...specs[idx], group: e.target.value };
                      return { ...f, specifications: specs };
                    })} />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-md text-destructive hover:bg-destructive/10" aria-label="حذف مشخصه"
                    onClick={() => setForm((f) => ({ ...f, specifications: f.specifications.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              );
            })}
            <Button type="button" variant="outline" className="w-full rounded-lg"
              onClick={() => setForm((f) => ({ ...f, specifications: [...f.specifications, { key: "", label: "", value: "", group: "" }] }))}>
              افزودن مشخصه
            </Button>
          </div>
        </SectionCard>

      {/* SEO — v28: one-click AI fill (GapGPT) from the product's real data */}
      <SectionCard title="بهینه‌سازی موتورهای جستجو (SEO)" icon={<Search className="h-3.5 w-3.5" />}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-5 text-muted-foreground">
            هوش مصنوعی سه فیلد سئو (عنوان، توضیحات متا و کلمات کلیدی) را از نام، برند، دسته و توضیح کوتاه واقعی محصول می‌نویسد.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-bold"
            onClick={aiSeo}
            disabled={aiSeoRunning}
          >
            {aiSeoRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            تکمیل سئو با هوش مصنوعی
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان سئو" htmlFor="p-seo-title" hint="خالی = نام محصول">
            <Input id="p-seo-title" className="rounded-lg" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
          </Field>
          <Field label="کلمات کلیدی" htmlFor="p-seo-key" hint="با کاما جدا کنید">
            <Input id="p-seo-key" className="rounded-lg" value={form.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="توضیحات متا" htmlFor="p-seo-desc">
              <Textarea id="p-seo-desc" rows={3} className="rounded-lg" value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </Field>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button variant="outline" className="rounded-lg" onClick={() => router.push("/admin/products")}>
          انصراف
        </Button>
        <Button onClick={submit} disabled={saving} className="gold-surface rounded-lg text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره محصول
        </Button>
      </div>
    </div>
  );
}

function formatFa(n: number): string {
  return n.toLocaleString("fa-IR");
}

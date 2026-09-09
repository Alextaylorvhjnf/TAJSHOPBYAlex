"use client";

/**
 * Admin Panel → محتوای قالب‌ها (v32 · per-template content 2.0)
 * -----------------------------------------------------------------------
 * Dedicated page for each template's OWN content (slides / showcases /
 * texts / links / brand) — MOVED here from the appearance page so template
 * picking and per-template content editing live in separate places.
 *
 * • template select with a «قالب فعال» badge + ?template=<id> deep-link
 *   (plain window.history.replaceState — same pattern as settings?tab=)
 * • the editor itself pre-fills with effective values (stored override →
 *   designed default → global entity) and previews every slide live
 * • storefront preview semantics are kept: /?template=<id> renders this
 *   template + its content for admins only
 * • permission: "appearance" (same gate as before — APIs enforce it)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Images, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, EmptyState } from "@/components/admin/ui-bits";
import { apiFetch } from "@/components/admin/api-client";
import type { TemplateDef } from "@/lib/templates/registry";
import { TemplateContentEditor } from "./template-content-editor";

type TemplatesResponse = {
  templates: TemplateDef[];
  active: string;
};

export default function AdminTemplateContentPage() {
  /* v5-f semantics kept: null = follow the ACTIVE template until the admin
   * picks another one (or arrives via ?template=<id>) — the deep-link is read
   * from location.search at first client render (same approach as settings
   * ?tab=; SSR renders the active template, hydration upgrades to the link) */
  const [templateId, setTemplateId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return new URLSearchParams(window.location.search).get("template");
    } catch {
      return null;
    }
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => apiFetch<TemplatesResponse>("/api/admin/templates"),
  });

  const templates = useMemo(() => data?.templates ?? [], [data]);
  const active = data?.active ?? "modern-tech";
  const selected = templateId ?? active;
  const selectedDef = templates.find((t) => t.id === selected);

  const select = (id: string) => {
    setTemplateId(id);
    /* keep the URL shareable without remounting the page */
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("template", id);
      window.history.replaceState(null, "", url);
    } catch {
      /* history API unavailable — selection still works */
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="محتوای قالب‌ها"
        desc="محتوای اختصاصی هر قالب — اسلایدرها، شوکیس‌ها، متن‌ها، لینک‌ها و برند؛ با مقادیر پیش‌فرض طراحی‌شده و پیش‌نمایش زنده"
      />

      {/* info card — what "dedicated content" means, in plain Persian */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-[12.5px] leading-6">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
        <p>
          هر قالب می‌تواند اسلایدرها، شوکیس‌ها، متن‌ها، لینک‌ها و برندِ مخصوص خودش را داشته باشد —
          فرم‌ها با <b>مقادیر طراحی‌شدهٔ همان قالب</b> و مقادیر سراسری پیش‌پر می‌شوند (هرگز خالی نیستند)؛
          فقط چیزهایی که تغییر دهید ذخیره می‌شوند و به‌محض فعال شدن قالب، همین محتوا جایگزین مقادیر
          سراسری می‌شود.
        </p>
      </div>

      {isError ? (
        <EmptyState
          title="خطا در دریافت قالب‌ها"
          desc={error instanceof Error ? error.message : undefined}
        />
      ) : isLoading ? (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <Images className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black">انتخاب قالب برای ویرایش محتوا</p>
                <p className="mt-0.5 max-w-xl text-[11px] leading-5 text-muted-foreground">
                  محتوای هر قالب مستقل از قالب فعال ذخیره می‌شود — با انتخاب و ذخیره، همین محتوا در
                  نمایش همان قالب استفاده خواهد شد.
                </p>
              </div>
            </div>
            <div className="flex w-full items-end gap-2 sm:w-auto">
              <div className="w-full sm:w-64">
                <Label className="sr-only">انتخاب قالب</Label>
                <Select value={selected} onValueChange={select}>
                  <SelectTrigger className="rounded-lg" aria-label="انتخاب قالب برای ویرایش محتوا">
                    <SelectValue placeholder="قالب موردنظر را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span className="truncate">{t.nameFa}</span>
                          {t.id === active && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary">
                              قالب فعال
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg font-bold">
                <Link href={`/?template=${selected}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  پیش‌نمایش قالب
                </Link>
              </Button>
            </div>
          </div>

          {selectedDef ? (
            <TemplateContentEditor
              key={selected}
              templateId={selected}
              templateName={selectedDef.nameFa}
              active={selected === active}
            />
          ) : (
            <EmptyState title="قالب یافت نشد" desc="قالب انتخاب‌شده در فهرست قالب‌ها موجود نیست." />
          )}
        </div>
      )}

      {/* reassurance footer note */}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
        پیش‌نمایش زندهٔ هر قالب فقط برای مدیران فعال است — مشتریان همیشه قالب فعال فروشگاه را
        می‌بینند.
      </p>
    </div>
  );
}

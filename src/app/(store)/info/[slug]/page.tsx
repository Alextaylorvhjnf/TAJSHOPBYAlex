import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  Crown, Compass, Truck, RotateCcw, HelpCircle, FileText, ShieldCheck, Headphones, Phone, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Reveal } from "@/components/store/reveal";

export const dynamic = "force-dynamic";

/** allowed lucide icon names (admin picks the name, we render it safely) */
const ICONS: Record<string, React.ElementType> = {
  Crown, Compass, Truck, RotateCcw, HelpCircle, FileText, ShieldCheck, Headphones, Phone,
};

function parseSections(json: string | null | undefined): { h: string; p: string }[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as { h: string; p: string }[]) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.cmsPage.findUnique({
    where: { slug },
    select: { title: true, seoTitle: true, seoDescription: true },
  });
  if (!page) return { title: "صفحه مورد نظر یافت نشد" };
  return {
    title: page.seoTitle ?? page.title,
    ...(page.seoDescription ? { description: page.seoDescription } : {}),
  };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "contact") redirect("/contact");

  const page = await db.cmsPage.findUnique({ where: { slug } });
  if (!page || !page.isActive) notFound();

  const sections = parseSections(page.sections);
  const Icon = ICONS[page.icon ?? ""] ?? Sparkles;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* breadcrumb */}
      <nav aria-label="مسیر صفحه" className="mb-6">
        <ol className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">خانه</Link>
          </li>
          <li aria-hidden className="text-muted-foreground/50">/</li>
          <li className="font-bold text-foreground">{page.title}</li>
        </ol>
      </nav>

      {/* header */}
      <div className="text-center mb-10">
        <span className="mx-auto mb-4 grid place-items-center h-14 w-14 rounded-2xl bg-primary/12 text-primary animate-pop">
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-black">{page.title}</h1>
      </div>

      {/* sections */}
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <Reveal key={i} delay={Math.min(i, 4) * 50}>
              <section className="rounded-2xl border bg-card p-6 card-hover">
                <h2 className="text-[15px] font-extrabold mb-3 flex items-center gap-2.5 leading-6">
                  <span className="grid place-items-center h-7 w-7 rounded-lg bg-primary/12 text-primary text-[11px] font-black shrink-0">
                    {(i + 1).toLocaleString("fa-IR")}
                  </span>
                  {s.h}
                </h2>
                <p className="text-[13px] leading-8 text-muted-foreground">{s.p}</p>
              </section>
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          محتوای این صفحه به‌زودی تکمیل می‌شود.
        </p>
      )}

      {/* back to support hub */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/contact"
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-primary/40 px-5 text-[13px] font-bold text-primary transition-colors hover:bg-primary/10"
        >
          نیاز به کمک بیشتری دارید؟ تماس با ما
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

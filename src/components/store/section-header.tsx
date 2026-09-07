import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-safe section header (icons are lucide elements — render fine in RSC) */
export function SectionHeader({
  title, subtitle, icon: Icon, href, accent, as = "h2",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  href?: string;
  accent?: string;
  /** Heading level: h2 for homepage sections, h1 for top-level listing pages */
  as?: "h1" | "h2";
}) {
  const Heading = as;
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn("grid place-items-center h-10 w-10 rounded-xl", accent ?? "bg-primary/12 text-primary")}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <Heading className={cn("font-extrabold", as === "h1" ? "text-xl md:text-2xl" : "text-lg md:text-xl")}>{title}</Heading>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="group flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-opacity">
          مشاهده همه
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  );
}

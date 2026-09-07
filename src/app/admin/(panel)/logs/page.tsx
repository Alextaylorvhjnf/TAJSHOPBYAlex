"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, ScrollText } from "lucide-react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  EmptyState,
  LogActionBadge,
  RoleBadge,
  TableSkeleton,
} from "@/components/admin/ui-bits";
import { apiFetch, type LogRow, type Paginated } from "@/components/admin/api-client";
import { formatDateTime } from "@/lib/format";

interface LogsResponse extends Paginated {
  logs: LogRow[];
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [metaTarget, setMetaTarget] = useState<LogRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "logs", page],
    queryFn: () =>
      apiFetch<LogsResponse>(`/api/admin/logs${page > 1 ? `?page=${page}` : ""}`),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="گزارش فعالیت مدیران"
        desc={`${data ? data.total.toLocaleString("fa-IR") : "…"} رکورد — تمام عملیات انجام‌شده در پنل (فقط خواندنی)`}
      />

      {isError ? (
        <EmptyState title="خطا در دریافت گزارش‌ها" desc={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="گزارشی ثبت نشده است"
          desc="عملیات مدیران به‌مرور در این بخش ثبت می‌شود"
          action={
            <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ScrollText className="h-4 w-4" />
              گزارش فعالیت
            </span>
          }
        />
      ) : (
        <AdminTable headers={["عملیات", "مدیر", "موجودیت", "IP", "جزئیات", "تاریخ"]}>
          {logs.map((l) => (
            <tr key={l.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="p-3"><LogActionBadge action={l.action} /></td>
              <td className="p-3">
                <p className="text-xs font-bold">{l.admin}</p>
                {l.adminRole && <RoleBadge role={l.adminRole} />}
              </td>
              <td className="p-3 text-xs">
                {l.entity ?? "—"}
                {l.entityId && (
                  <span className="block max-w-[120px] truncate font-mono text-[10px] text-muted-foreground" dir="ltr" title={l.entityId}>
                    {l.entityId}
                  </span>
                )}
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground" dir="ltr">{l.ip ?? "—"}</td>
              <td className="p-3">
                {l.metadata ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setMetaTarget(l)}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    مشاهده
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      )}

      {data && <AdminPagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}

      <Dialog open={!!metaTarget} onOpenChange={(o) => !o && setMetaTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>جزئیات عملیات</DialogTitle>
            <DialogDescription className="text-xs">
              {metaTarget && (
                <span className="font-mono" dir="ltr">{metaTarget.action}</span>
              )}{" "}
              — {metaTarget?.admin} — {metaTarget ? formatDateTime(metaTarget.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72 rounded-xl border bg-muted/40 p-3">
            <pre dir="ltr" className="text-left font-mono text-[11px] leading-5">
              {metaTarget?.metadata ? JSON.stringify(metaTarget.metadata, null, 2) : "—"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { NextResponse } from "next/server";

/**
 * JSON success envelope. Pass `noStore: true` (or explicit headers) for
 * session-scoped GET endpoints — the browser must never heuristically
 * cache those (stale auth/user data after login/logout otherwise).
 */
export function ok<T extends Record<string, unknown>>(
  data: T,
  status = 200,
  opts?: { headers?: Record<string, string>; noStore?: boolean }
) {
  const headers = new Headers(opts?.headers);
  if (opts?.noStore) {
    headers.set("Cache-Control", "no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
  }
  return NextResponse.json({ ok: true, ...data }, { status, headers });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, message, code }, { status });
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function getUserAgent(req: Request): string {
  return (req.headers.get("user-agent") ?? "").slice(0, 250);
}

export function parsePagination(url: URL, defaults = { page: 1, limit: 12 }) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? String(defaults.page)) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(defaults.limit)) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

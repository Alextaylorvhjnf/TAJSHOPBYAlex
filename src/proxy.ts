import { NextRequest, NextResponse } from "next/server";

/**
 * Edge proxy (Next.js 16 `proxy` convention — replaces the deprecated
 * `middleware` file): cheap gate for /admin — real role checks happen
 * server-side in the (panel) layout + every admin API route.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = req.cookies.get("taj_session")?.value;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

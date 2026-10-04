import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/config/session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/dashboard") || pathname.startsWith("/families");

  // Only gate private routes by cookie presence. Valid-session checks and
  // login/register redirects happen in Server Components so a stale cookie
  // cannot bounce between /login and /dashboard forever.
  if (isPrivate && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/families/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/config/session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/dashboard") || pathname.startsWith("/families");

  if (isPrivate && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/families/:path*", "/login", "/register"],
};

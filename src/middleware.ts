import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Check for session cookie (authjs.session-token or __Secure- prefixed in production)
  const sessionCookie = req.cookies.get("authjs.session-token") ||
                        req.cookies.get("__Secure-authjs.session-token");
  const isLoggedIn = !!sessionCookie;

  const isOnDashboard =
    req.nextUrl.pathname.startsWith("/bots") ||
    req.nextUrl.pathname.startsWith("/templates") ||
    req.nextUrl.pathname.startsWith("/billing") ||
    req.nextUrl.pathname.startsWith("/settings");
  const isOnAuth = req.nextUrl.pathname.startsWith("/login");
  const isOnApi = req.nextUrl.pathname.startsWith("/api");

  // Allow API routes
  if (isOnApi) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from login page
  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/bots", req.url));
  }

  // Redirect non-logged-in users to login page for protected routes
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};

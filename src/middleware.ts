import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/icon.") ||
    pathname.startsWith("/apple-icon.")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!isLoggedIn && !isPublic && pathname !== "/" && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!isLoggedIn && pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isLoggedIn && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/lists";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = isLoggedIn ? "/lists" : "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|json|lottie)$).*)",
  ],
};

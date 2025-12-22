import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("gg_token")?.value;
  const path = req.nextUrl.pathname;

  // Proteksi dashboard (user harus login)
  if (path.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Proteksi login (user sudah login tidak boleh balik ke login)
  if (path === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

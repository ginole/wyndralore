import { NextRequest, NextResponse } from "next/server";
import { ANON_COOKIE } from "@/lib/analytics";

// Assigns an anonymous visitor id cookie so analytics can stitch a funnel across a visit
// without any PII. Runs only on page navigations, not asset/api requests.
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(ANON_COOKIE)) {
    const anonId = crypto.randomUUID();
    res.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|cards/).*)"],
};

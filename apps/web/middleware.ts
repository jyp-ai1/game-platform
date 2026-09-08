import { NextResponse, type NextRequest } from "next/server";

/** Official Snake play always enters WORLD on the flagship route. No PRACTICE/STAGE. */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname !== "/games/snake/play") return NextResponse.next();

  const requested = (url.searchParams.get("room") || url.searchParams.get("invite") || "WORLD").toUpperCase();
  const room = requested === "PRACTICE" || requested === "STAGE" ? "WORLD" : requested;
  const dest = url.clone();
  dest.pathname = "/flagship/snake-io/play";
  dest.search = "";
  dest.searchParams.set("room", room);
  if (url.searchParams.get("invite") || url.searchParams.get("source")?.toLowerCase() === "invite") {
    dest.searchParams.set("source", "invite");
  }
  if (url.searchParams.get("debug") === "1") dest.searchParams.set("debug", "1");
  return NextResponse.redirect(dest);
}

export const config = {
  matcher: ["/games/snake/play"],
};

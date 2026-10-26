import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { isPanelPath, toAdminPath } from "@/lib/panel-path";
import { readAdminSecret } from "@/lib/panel-secret";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function hidden() {
  return new NextResponse("Хуудас олдсонгүй.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function proxy(request: NextRequest) {
  if (isSupabaseConfigured()) return updateSupabaseSession(request);
  return updateLocalSession(request);
}

async function updateLocalSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = readAdminSecret();
  const panel = `/${secret}`;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isLogin = pathname === "/login";

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return hidden();

  if (isPanelPath(pathname, secret)) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== "admin" && session.role !== "cook") return hidden();
    const internalPath = toAdminPath(pathname, secret);
    const headers = new Headers(request.headers);
    headers.set("x-admin-path", internalPath);
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (!session && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "employee" ? "/" : panel;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|meals|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};

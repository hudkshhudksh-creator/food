import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { isPanelPath, toAdminPath } from "@/lib/panel-path";
import { readAdminSecret } from "@/lib/panel-secret";
import { refreshSupabaseAuth } from "@/lib/supabase/middleware";

function hidden() {
  return new NextResponse("Хуудас олдсонгүй.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function withCookies(target: NextResponse, source?: NextResponse | null) {
  source?.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = readAdminSecret();
  const panel = `/${secret}`;
  const isLogin = pathname === "/login";

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const local = token ? await verifySession(token) : null;
  let role = local?.role ?? null;
  let supabaseResponse: NextResponse | null = null;

  if (isSupabaseConfigured()) {
    const refreshed = await refreshSupabaseAuth(request);
    supabaseResponse = refreshed.response;
    if (!role) role = refreshed.role;
  }

  const staff = role === "admin" || role === "cook";
  const isInternalAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isSecretPanel = isPanelPath(pathname, secret);

  if (isInternalAdmin || isSecretPanel) {
    if (!staff) {
      if (!role && isSecretPanel) {
        return withCookies(redirectTo(request, "/login", pathname), supabaseResponse);
      }
      return hidden();
    }
    const internalPath = isSecretPanel ? toAdminPath(pathname, secret) : pathname;
    const headers = new Headers(request.headers);
    headers.set("x-admin-path", internalPath);
    if (isSecretPanel) {
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      return withCookies(NextResponse.rewrite(url, { request: { headers } }), supabaseResponse);
    }
    return withCookies(NextResponse.next({ request: { headers } }), supabaseResponse);
  }

  if (!role && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return withCookies(NextResponse.rewrite(url), supabaseResponse);
  }

  if (!role && !isLogin) {
    return withCookies(redirectTo(request, "/login", pathname), supabaseResponse);
  }

  if (role && isLogin) {
    return withCookies(redirectTo(request, role === "employee" ? "/" : panel), supabaseResponse);
  }

  return withCookies(NextResponse.next({ request }), supabaseResponse);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|meals|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPanelPath, toAdminPath } from "@/lib/panel-path";
import { readAdminSecret } from "@/lib/panel-secret";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    role = data?.role ?? "employee";
  }

  const { pathname } = request.nextUrl;
  const secret = readAdminSecret();
  const panel = `/${secret}`;
  const isLogin = pathname === "/login";

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse("Хуудас олдсонгүй.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (isPanelPath(pathname, secret)) {
    if (!user || (role !== "admin" && role !== "cook")) {
      if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(redirectUrl);
      }
      return new NextResponse("Хуудас олдсонгүй.", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const headers = new Headers(request.headers);
    headers.set("x-admin-path", toAdminPath(pathname, secret));
    const url = request.nextUrl.clone();
    url.pathname = toAdminPath(pathname, secret);
    const rewritten = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.getAll().forEach((cookie) => {
      rewritten.cookies.set(cookie.name, cookie.value);
    });
    return rewritten;
  }

  if (!user && !isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "admin" ? panel : role === "cook" ? `${panel}/meals` : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

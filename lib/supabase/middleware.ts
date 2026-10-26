import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/types";

export async function refreshSupabaseAuth(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { response, role: null as Role | null };
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
    if (!user) return { response, role: null as Role | null };

    const meta = user.user_metadata ?? {};
    const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    const rawRole = data?.role || meta.role;
    const role: Role = rawRole === "admin" ? "admin" : rawRole === "cook" ? "cook" : "employee";
    return { response, role };
  } catch {
    return { response, role: null as Role | null };
  }
}

import { isSupabaseConfigured } from "@/lib/config";
import { readSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/data/local";
import { getSupabaseUser } from "@/lib/data/supabase-repo";
import type { SessionUser } from "@/types";

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) return getSupabaseUser();
  const session = await readSession();
  if (!session) return null;
  return getUserById(session.sub);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const error = new Error("UNAUTHORIZED");
    throw error;
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "cook") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

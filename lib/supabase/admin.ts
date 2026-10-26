import { createClient } from "@supabase/supabase-js";

function envPick(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (!value?.trim()) continue;
    if (names.some((name) => key === name || key.endsWith(`_${name}`))) return value.trim();
  }
}

export function createAdminClient() {
  const url = envPick(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "STORAGE_SUPABASE_URL"]);
  const key = envPick([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  ]);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

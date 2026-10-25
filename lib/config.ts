export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDemoLoginVisible() {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

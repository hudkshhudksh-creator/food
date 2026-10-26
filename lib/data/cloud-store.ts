import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreData } from "@/types";

const TABLE = "app_store";

let tableAttempted = false;

async function ensureTable() {
  if (tableAttempted) return;
  tableAttempted = true;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) return;
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { ssl: "require", max: 1, idle_timeout: 5, connect_timeout: 8 });
    await sql`
      create table if not exists public.app_store (
        id integer primary key default 1 check (id = 1),
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `;
    await sql.end({ timeout: 5 });
  } catch {
    // Table may already exist, or the database URL is not available.
  }
}

export async function loadCloudStore(): Promise<StoreData | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  await ensureTable();
  const { data, error } = await admin.from(TABLE).select("data").eq("id", 1).maybeSingle();
  if (error || !data?.data || typeof data.data !== "object") return null;
  return data.data as StoreData;
}

export async function saveCloudStore(store: StoreData) {
  const admin = createAdminClient();
  if (!admin) return;
  await ensureTable();
  const { error } = await admin.from(TABLE).upsert({
    id: 1,
    data: store,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

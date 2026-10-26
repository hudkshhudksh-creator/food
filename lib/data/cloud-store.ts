import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreData } from "@/types";

const TABLE = "app_store";

function databaseUrl() {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_POSTGRES_URL;
  if (direct) return direct;
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB || "postgres";
  if (host && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:5432/${database}?sslmode=require`;
  }
  return undefined;
}

async function withSql<T>(fn: (sql: import("postgres").Sql) => Promise<T>): Promise<T | null> {
  const url = databaseUrl();
  if (!url) return null;
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    ssl: url.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function ensureTable(sql: import("postgres").Sql) {
  await sql`
    create table if not exists public.app_store (
      id integer primary key default 1 check (id = 1),
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
}

export async function loadCloudStore(): Promise<StoreData | null> {
  const fromPg = await withSql(async (sql) => {
    await ensureTable(sql);
    const rows = await sql<{ data: StoreData }[]>`select data from public.app_store where id = 1`;
    return rows[0]?.data ?? null;
  }).catch(() => null);
  if (fromPg?.users?.length) return fromPg;

  const admin = createAdminClient();
  if (!admin) return fromPg;
  const { data, error } = await admin.from(TABLE).select("data").eq("id", 1).maybeSingle();
  if (error || !data?.data || typeof data.data !== "object") return fromPg;
  return data.data as StoreData;
}

export async function saveCloudStore(store: StoreData) {
  const saved = await withSql(async (sql) => {
    await ensureTable(sql);
    const payload = JSON.parse(JSON.stringify(store)) as import("postgres").JSONValue;
    await sql`
      insert into public.app_store (id, data, updated_at)
      values (1, ${sql.json(payload)}, now())
      on conflict (id) do update
        set data = excluded.data,
            updated_at = now()
    `;
    return true;
  }).catch(() => false);
  if (saved) return;

  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.from(TABLE).upsert({
    id: 1,
    data: store,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

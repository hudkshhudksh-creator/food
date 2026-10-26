import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreData } from "@/types";

const TABLE = "app_store";

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

function addUrl(urls: string[], value?: string) {
  const url = value?.trim();
  if (url && !urls.includes(url)) urls.push(url);
}

function poolScore(url: string) {
  let score = 0;
  const pooler = url.includes("pooler.supabase.com");
  if (pooler && url.includes(":5432")) score += 15;
  if (pooler && url.includes(":6543")) score += 8;
  if (url.includes("pgbouncer=true")) score += 2;
  if (/db\.[^/]*supabase\.co/i.test(url) && !pooler) score -= 8;
  return score;
}

function expandUrl(url: string) {
  const variants = [url];
  if (url.includes(":6543")) {
    variants.push(url.replace(":6543", ":5432").replace("pgbouncer=true&", "").replace("&pgbouncer=true", "").replace("?pgbouncer=true", ""));
  }
  if (url.includes("pooler.supabase.com") && url.includes(":5432") && url.includes("pgbouncer=true")) {
    variants.push(url.replace("pgbouncer=true&", "").replace("&pgbouncer=true", "").replace("?pgbouncer=true", ""));
  }
  return variants;
}

function databaseUrls() {
  const urls: string[] = [];
  const found: string[] = [];
  addUrl(found, process.env.POSTGRES_URL);
  addUrl(found, process.env.POSTGRES_PRISMA_URL);
  addUrl(found, process.env.DATABASE_URL);
  addUrl(found, process.env.SUPABASE_DATABASE_URL);
  addUrl(found, process.env.POSTGRES_URL_NO_SSL);
  addUrl(found, process.env.POSTGRES_URL_NON_POOLING);

  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (/(POSTGRES_URL|DATABASE_URL|SUPABASE_DATABASE_URL)/i.test(key) && !/(HOST|USER|PASSWORD|DATABASE)$/i.test(key)) {
      addUrl(found, value);
    }
  }

  const host = envPick(["POSTGRES_HOST", "SUPABASE_HOST"]);
  const user = envPick(["POSTGRES_USER", "SUPABASE_USER"]);
  const password = envPick(["POSTGRES_PASSWORD", "SUPABASE_PASSWORD"]);
  const database = envPick(["POSTGRES_DATABASE", "POSTGRES_DB", "SUPABASE_DB"]) || "postgres";
  if (host && user && password) {
    addUrl(found, `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:6543/${database}?sslmode=require&pgbouncer=true`);
    addUrl(found, `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:5432/${database}?sslmode=require`);
  }

  for (const url of found) {
    for (const variant of expandUrl(url)) addUrl(urls, variant);
  }

  return urls.sort((a, b) => poolScore(b) - poolScore(a));
}

async function withSql<T>(fn: (sql: import("postgres").Sql) => Promise<T>): Promise<T | null> {
  const urls = databaseUrls();
  if (!urls.length) return null;
  const postgres = (await import("postgres")).default;
  for (const url of urls) {
    const sql = postgres(url, {
      ssl: url.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 5,
      connect_timeout: 8,
      prepare: false,
    });
    try {
      return await fn(sql);
    } catch {
      // Vercel cannot reach the IPv6-only direct host; try the next URL.
    } finally {
      await sql.end({ timeout: 5 }).catch(() => undefined);
    }
  }
  return null;
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
  });
  if (fromPg?.users?.length) return fromPg;
  const fromBlob = await loadBlobStore();
  if (fromBlob?.users?.length) return fromBlob;

  const admin = createAdminClient();
  if (!admin) return fromPg;
  const { data, error } = await admin.from(TABLE).select("data").eq("id", 1).maybeSingle();
  if (error || !data?.data || typeof data.data !== "object") return fromPg;
  return data.data as StoreData;
}

async function loadBlobStore(): Promise<StoreData | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "food-store.json", token, limit: 5 });
    const blob = blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return (await res.json()) as StoreData;
  } catch {
    return null;
  }
}

async function saveBlobStore(store: StoreData) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put("food-store.json", JSON.stringify(store), {
      access: "private",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function provisionAuthUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  branchId?: string;
}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  if (admin) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone ?? "",
        role: input.role,
        branch_id: input.branchId ?? "",
      },
    });
    if (error && !/already|registered|exists/i.test(error.message)) throw error;
    return;
  }
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
  });
  if (saved) return true;
  if (await saveBlobStore(store)) return true;

  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.from(TABLE).upsert({
    id: 1,
    data: store,
    updated_at: new Date().toISOString(),
  });
  if (error) return false;
  return true;
}

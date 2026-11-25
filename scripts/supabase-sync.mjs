// One-time (idempotent — safe to rerun) Supabase setup:
//   1. Creates the schema in Supabase Postgres if it does not exist.
//   2. Backfills every row from the legacy local SQLite store (data/app.db).
// Supabase rows win on conflict, so reruns never overwrite cloud data.
// Usage: DATABASE_URL="postgres://..." node scripts/supabase-sync.mjs
import postgres from "postgres";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (Supabase → Settings → Database → Connection string).");
  process.exit(1);
}
const sql = postgres(url, {
  prepare: false,
  ssl: /(localhost|127\.0\.0\.1)/.test(url) ? false : { rejectUnauthorized: false },
});

const DDL = [
  `create table if not exists users (
    id text primary key,
    email text not null unique,
    name text not null,
    password_hash text not null default '',
    avatar_color text not null default '#1084fe',
    plan text not null default 'free',
    created_at bigint not null
  )`,
  `create table if not exists sessions (
    token text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at bigint not null
  )`,
  `create index if not exists sessions_user_idx on sessions(user_id)`,
  `create table if not exists projects (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    name text not null,
    instructions text not null default '',
    created_at bigint not null
  )`,
  `create index if not exists projects_user_idx on projects(user_id)`,
  `create table if not exists chats (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    project_id text references projects(id) on delete set null,
    title text not null default 'New chat',
    mode text not null default 'fast',
    private integer not null default 0,
    created_at bigint not null,
    updated_at bigint not null
  )`,
  `create index if not exists chats_user_idx on chats(user_id)`,
  `create index if not exists chats_project_idx on chats(project_id)`,
  `create table if not exists messages (
    id text primary key,
    chat_id text not null references chats(id) on delete cascade,
    role text not null,
    content text not null,
    mode text,
    sources integer,
    created_at bigint not null
  )`,
  `create index if not exists messages_chat_idx on messages(chat_id)`,
  `create table if not exists settings (
    user_id text primary key references users(id) on delete cascade,
    theme text not null default 'system',
    wrap_code integer not null default 0,
    reduce_motion integer not null default 0,
    show_suggestions integer not null default 1,
    custom_instructions text not null default '',
    memory integer not null default 1,
    improved_model integer not null default 0,
    notifications integer not null default 1,
    language text not null default 'Auto'
  )`,
  `create table if not exists generations (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    prompt text not null,
    kind text not null default 'image',
    created_at bigint not null
  )`,
  `create index if not exists generations_user_idx on generations(user_id)`,
];

const TABLES = ["users", "sessions", "projects", "chats", "messages", "settings", "generations"];

for (const stmt of DDL) {
  await sql.unsafe(stmt);
}
console.log("Schema ensured.");

const sqlitePath = path.join(process.cwd(), "data", "app.db");
if (fs.existsSync(sqlitePath)) {
  const lite = new Database(sqlitePath, { readonly: true });
  let total = 0;
  for (const table of TABLES) {
    const rows = lite.prepare(`select * from ${table}`).all();
    for (const row of rows) {
      const cols = Object.keys(row);
      const colsSql = cols.map((c) => `"${c.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())}"`).join(", ");
      const vals = cols.map((c) => row[c] ?? null);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await sql.unsafe(
        `insert into ${table} (${colsSql}) values (${placeholders}) on conflict do nothing`,
        vals,
      );
    }
    total += rows.length;
    console.log(`${table}: ${rows.length} rows`);
  }
  lite.close();
  console.log(`Backfill complete — ${total} rows copied (existing Supabase rows left untouched).`);
} else {
  console.log("No legacy SQLite store found — skipping backfill.");
}

await sql.end();

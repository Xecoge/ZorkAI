import { pool } from "@/lib/db/client";

// The production database predates the admin tables (it was created by an
// earlier sync), and the workspace cannot reach Supabase's Postgres directly,
// so the app upgrades its own schema on first use. Every statement is
// idempotent and the whole set runs once per server instance.
const STATEMENTS = [
  `alter table users add column if not exists role text not null default 'user'`,
  `alter table users add column if not exists status text not null default 'active'`,
  `alter table users add column if not exists status_reason text not null default ''`,
  `alter table users add column if not exists status_until bigint`,
  `create table if not exists admin_audit (
     id text primary key,
     actor_id text not null,
     actor_email text not null default '',
     action text not null,
     target_id text,
     detail text not null default '',
     created_at bigint not null
   )`,
  `create index if not exists admin_audit_created_idx on admin_audit (created_at)`,
  `create table if not exists app_settings (
     key text primary key,
     value text not null default '',
     updated_at bigint not null
   )`,
];

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const statement of STATEMENTS) {
        await pool.unsafe(statement);
      }
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

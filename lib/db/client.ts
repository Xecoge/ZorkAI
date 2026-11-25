import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

// Serverless hosts (Vercel) have a read-only project dir; use /tmp there.
const dataDir = process.env.VERCEL
  ? "/tmp/data"
  : path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "app.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#1084fe',
  plan TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  mode TEXT NOT NULL DEFAULT 'fast',
  private INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_project_idx ON chats(project_id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  mode TEXT,
  sources INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id);
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  wrap_code INTEGER NOT NULL DEFAULT 0,
  reduce_motion INTEGER NOT NULL DEFAULT 0,
  show_suggestions INTEGER NOT NULL DEFAULT 1,
  custom_instructions TEXT NOT NULL DEFAULT '',
  memory INTEGER NOT NULL DEFAULT 1,
  improved_model INTEGER NOT NULL DEFAULT 0,
  notifications INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'Auto'
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS generations_user_idx ON generations(user_id);
`);

// Keep the demo account available on fresh serverless databases.
if (process.env.VERCEL) {
  const existing = sqlite
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("demo@demo.ai");
  if (!existing) {
    const salt = randomBytes(16).toString("hex");
    const passwordHash = `${salt}:${scryptSync("demo1234", salt, 64).toString("hex")}`;
    const userId = `usr_${randomBytes(12).toString("hex")}`;
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO users (id, email, name, password_hash, avatar_color, plan, created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(userId, "demo@demo.ai", "Demo User", passwordHash, "#8e4ec6", "free", Date.now());
    sqlite.prepare("INSERT OR IGNORE INTO settings (user_id) VALUES (?)").run(userId);
  }
}

export const db = drizzle(sqlite);
export { sqlite };

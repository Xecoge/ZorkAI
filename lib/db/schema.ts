import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").notNull().default("#1084fe"),
  plan: text("plan").notNull().default("free"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull().default(""),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

export const chats = sqliteTable(
  "chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull().default("New chat"),
    mode: text("mode").notNull().default("fast"),
    private: integer("private").notNull().default(0),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("chats_user_idx").on(t.userId), index("chats_project_idx").on(t.projectId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    mode: text("mode"),
    sources: integer("sources"),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("messages_chat_idx").on(t.chatId)],
);

export const settings = sqliteTable("settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"),
  wrapCode: integer("wrap_code").notNull().default(0),
  reduceMotion: integer("reduce_motion").notNull().default(0),
  showSuggestions: integer("show_suggestions").notNull().default(1),
  customInstructions: text("custom_instructions").notNull().default(""),
  memory: integer("memory").notNull().default(1),
  improvedModel: integer("improved_model").notNull().default(0),
  notifications: integer("notifications").notNull().default(1),
  language: text("language").notNull().default("Auto"),
});

export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    kind: text("kind").notNull().default("image"),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("generations_user_idx").on(t.userId)],
);

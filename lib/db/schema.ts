import { pgTable, text, integer, bigint, doublePrecision, index } from "drizzle-orm/pg-core";

// Schema for Supabase Postgres. Timestamps are epoch milliseconds (number) and
// boolean flags are integers, matching the previous SQLite values so existing
// data and API payloads keep the same shape.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").notNull().default("#1084fe"),
  plan: text("plan").notNull().default("free"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull().default(""),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull().default("New chat"),
    mode: text("mode").notNull().default("fast"),
    private: integer("private").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("chats_user_idx").on(t.userId), index("chats_project_idx").on(t.projectId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    mode: text("mode"),
    sources: integer("sources"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("messages_chat_idx").on(t.chatId)],
);

export const settings = pgTable("settings", {
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

export const generations = pgTable(
  "generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    kind: text("kind").notNull().default("image"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("generations_user_idx").on(t.userId)],
);

// --- Billing, credits and model usage (added 2026-11-26) ---

export const userCredits = pgTable("user_credits", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),
  unlimited: integer("unlimited").notNull().default(0),
  balance: doublePrecision("balance").notNull().default(0),
  monthlyAllowance: doublePrecision("monthly_allowance").notNull().default(0),
  usedThisPeriod: doublePrecision("used_this_period").notNull().default(0),
  tokensIn: bigint("tokens_in", { mode: "number" }).notNull().default(0),
  tokensOut: bigint("tokens_out", { mode: "number" }).notNull().default(0),
  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // grant | hold | charge | refund | subscription
    model: text("model"),
    credits: doublePrecision("credits").notNull(), // signed: negative = spent
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    balanceAfter: doublePrecision("balance_after"),
    description: text("description"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("credit_transactions_user_idx").on(t.userId, t.createdAt)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(), // plus | pro | max
    status: text("status").notNull().default("active"), // active | canceled | past_due
    provider: text("provider").notNull().default("stripe"),
    providerRef: text("provider_ref"),
    pricePaidCents: integer("price_paid_cents").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    renewsAt: bigint("renews_at", { mode: "number" }),
    canceledAt: bigint("canceled_at", { mode: "number" }),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

export const modelUsage = pgTable(
  "model_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    requests: integer("requests").notNull().default(0),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    credits: doublePrecision("credits").notNull().default(0),
    periodMonth: text("period_month").notNull(), // e.g. 2026-11
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("model_usage_user_idx").on(t.userId, t.periodMonth)],
);

export const billingHistory = pgTable(
  "billing_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // payment | refund | subscription_change
    plan: text("plan"),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("paid"), // paid | failed | refunded | pending
    provider: text("provider").notNull().default("stripe"),
    providerRef: text("provider_ref"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("billing_history_user_idx").on(t.userId, t.createdAt)],
);

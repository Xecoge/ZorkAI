import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "data", "app.db"));
db.pragma("foreign_keys = ON");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
const id = (p) => `${p}_${randomBytes(12).toString("hex")}`;
const now = Date.now();

// Demo account: demo@demo.ai / demo1234 (seed data only)
const userId = id("usr");
db.prepare(
  "INSERT OR REPLACE INTO users (id, email, name, password_hash, avatar_color, plan, created_at) VALUES (?,?,?,?,?,?,?)",
).run(userId, "demo@demo.ai", "Demo User", hashPassword("demo1234"), "#8e4ec6", "free", now);

db.prepare("INSERT OR REPLACE INTO settings (user_id) VALUES (?)").run(userId);

const projectId = id("prj");
db.prepare(
  "INSERT INTO projects (id, user_id, name, instructions, created_at) VALUES (?,?,?,?,?)",
).run(projectId, userId, "Product Research", "Focus on B2B SaaS onboarding patterns.", now - 86400e3 * 6);

const chats = [
  { title: "Linear vs Notion onboarding patterns", mode: "expert", days: 0.2, messages: [
    ["user", "Compare how Linear and Notion onboard a brand-new team. Where do they differ?"],
    ["assistant", `**Short answer:** Linear optimizes for *immediate product literacy*; Notion optimizes for *reducing blank-page anxiety*.

| Dimension | Linear | Notion |
| --- | --- | --- |
| Path to first result | Create own issue (title-only dialog) | Create own doc (type title) |
| Teaching method | Do the real workflow | Use the real editor + guides |
| Risk of lost progress | New issue can "disappear" into Backlog | Many competing first actions |

**Takeaways**

- The highest-leverage empty-state work is pre-seeding meaningful content, not beautiful illustrations alone.
- Watch the two common failure modes: the first object landing outside the default view, and too many parallel next steps competing for attention.`],
  ]},
  { title: "Getting started with Grok", mode: "fast", days: 1.1, messages: [
    ["user", "What can this app do?"],
    ["assistant", `Quite a lot — here's the quick map:

1. **Chat** — ask anything, attach files, switch between Auto, Fast, Expert and Heavy modes.
2. **Projects** — group related chats with shared instructions.
3. **Imagine** — generate images from a prompt.
4. **Settings** — theme, custom instructions, privacy controls.

Try the composer on the home screen to see each mode in action.`],
  ]},
  { title: "Five SaaS pricing page patterns", mode: "fast", days: 2.4, messages: [
    ["user", "Summarize five pricing page patterns that convert well for B2B SaaS."],
    ["assistant", `1. **Anchor high** — put the premium tier first so mid-tier reads as reasonable.
2. **Feature parity table** — shows what changes between tiers, reduces support load.
3. **Usage meter preview** — exposes limits before purchase, cuts refund requests.
4. **Annual toggle with two months free** — the standard discount framing.
5. **Social proof near the CTA** — a logo row or quote within one viewport of the button.`],
  ]},
  { title: "Calm isometric design studio brief", mode: "fast", days: 3.7, messages: [
    ["user", "Draft a one-paragraph brief for a calm, isometric illustration system."],
    ["assistant", `Create a small isometric illustration system in muted neutrals with a single blue accent (#1084fe). Scenes depict quiet software workspaces — desks, panels, floating cards — drawn on an 8px grid with two shadow levels and no gradients. The mood: calm, precise, product-led.`],
  ]},
];

for (const c of chats) {
  const chatId = id("chat");
  const created = now - c.days * 86400e3;
  db.prepare(
    "INSERT INTO chats (id, user_id, project_id, title, mode, private, created_at, updated_at) VALUES (?,?,?,?,?,0,?,?)",
  ).run(chatId, userId, c.days === 0.2 ? null : projectId, c.title, c.mode, created, created + 60e3);
  let t = created;
  for (const [role, content] of c.messages) {
    t += 30e3;
    db.prepare(
      "INSERT INTO messages (id, chat_id, role, content, mode, sources, created_at) VALUES (?,?,?,?,?,?,?)",
    ).run(id("msg"), chatId, role, content, role === "assistant" ? c.mode : null, role === "assistant" ? 47 : null, t);
  }
}

console.log("Seeded: demo@demo.ai / demo1234 with 4 chats and 1 project");

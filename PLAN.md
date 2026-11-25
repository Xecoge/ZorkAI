# Grok-Inspired AI Website — Plan

## Goal and users

A premium, independently implemented AI-chat website inspired by the grok.com experience
researched in `grok-research/` (13 real screenshots studied as the primary source of
truth). Users: people who arrive logged out, try the composer, then sign in and work in a
full chat workspace (chats, projects, modes, settings). "Working" = real persistence
(create a chat, send a message, reload, it is still there), polished visuals matching the
researched design system, responsive at 360–1440px, light + dark.

## Scope

In scope: logged-out landing, sign-in/sign-up, app shell (sidebar expanded/collapsed,
topbar, account menu), chat workspace (markdown, code, tables, actions, attachments UI,
mode picker, streaming states), projects, library, imagine, settings modal, search,
dashboard (usage), API integration layer with a clean provider interface.

Out of scope for now: real OAuth providers (email code flow stubbed to a local session),
real LLM calls when no provider key exists (falls back to a clearly-labeled echo provider),
teams/billing purchases, voice audio (UI-only), bots beyond the seeded Grok Bot.

## Architecture

- **Next.js 15 App Router + TypeScript + Tailwind v4** — repo default stack, fast to build.
- **SQLite via better-sqlite3 + Drizzle ORM** — real durable store, zero external services.
- **Auth**: signed HTTP-only session cookie (HMAC via Node crypto); accounts table with
  scrypt password hashing; email "code" step simulated locally. Server-side session read.
- **API routes** (`app/api/*`): `auth/register|login|logout|session`, `chats` (list/create),
  `chats/[id]` (get/rename/delete), `chats/[id]/messages` (list/post → provider stream),
  `projects`, `settings`, `search`, `usage`.
- **AI provider interface** (`lib/ai/provider.ts`): `complete(messages, mode, context)`.
  Implementations: OpenAI-compatible when `AI_API_KEY`+`AI_BASE_URL` are set; otherwise a
  deterministic local provider (markdown-rich demo answers) so the product works offline.
- **Routes**: `/` (logged-out landing, redirects signed-in users to `/app`),
  `/sign-in`, `/sign-up`, `/app` (new chat home), `/app/chat/[id]` (chat),
  `/app/projects`, `/app/projects/[id]`, `/app/library`, `/app/imagine`, `/app/search`,
  `/app/dashboard` (usage), `/app/settings` opens the modal over any page.
- **Design system** (`app/globals.css`): tokens from the research (`--accent #1084fe`,
  light base #FFFFFF / pane #F7F7F5, dark #1A1A1A / #141414, borders #E4E4E0/#2A2A2A),
  radii 12/28 + full, two shadow levels, type scale 12–28px, next/font Inter + Geist Mono
  (X-VF/universalSans not redistributable), class-based dark mode honoring system.

## Risks and assumptions

- Fonts: Grok's proprietary faces are not available; Inter is the documented fallback.
- Real model calls depend on env (`AI_API_KEY`); default offline provider is labeled as
  demo in code, never presented as Grok output.
- Suggestion rows / mode list match the November 2026 captures (Auto/Fast/Expert/Heavy).

## Phases

## Phase 1: Thin vertical slice — landing → auth → chat persisted end to end

- [x] Scaffold Next.js + Tailwind + Drizzle/SQLite, design tokens, fonts
- [x] DB schema (users, sessions, chats, messages, projects, settings) + migration + seed
- [x] Auth: register/login/logout/session routes + session cookie + sign-in/sign-up pages
- [x] Logged-out landing matching screenshot 01/03, `POST /api/chats`, `GET/POST /api/chats/[id]/messages`
- [x] `/app` shell + composer that creates a chat and sends a message; reply persisted
- Acceptance: user signs up, types a prompt on the landing page, lands in `/app/chat/[id]`,
  sees the stored reply, reloads, and it is still there. **Verified 2026-11-25**: build
  green, API flow and browser flow both confirmed (landing prompt → `/app/chat/[id]?q=` →
  reply rendered and reloaded from the DB at 390px and 1280px, light + dark).

## Phase 2: App shell and chat workspace

- [ ] Sidebar (expanded/collapsed, sections, chats, projects, account row, mobile drawer)
- [ ] Topbar (search, Private toggle, right-panel icon) + account menu popover
- [ ] Chat view: markdown/code/table rendering, copy/thumbs/overflow actions, sources row,
  follow-up chips, regenerate, streaming states, attachments UI, auto-scroll
- [ ] Mode picker dropdown (Auto/Fast/Expert/Heavy with descriptions, upgrade gating)
- Acceptance: full conversation flow with actions works at 1280px and 390px.

## Phase 3: Secondary surfaces

- [ ] Projects list + project page (tabs, chats with timestamps)
- [ ] Library, Imagine (generation UI wired to provider interface), Search, Dashboard usage
- [ ] Settings modal (Account, Appearance with working theme, Behavior, Notifications,
  Customize, Data Controls, Connect Apps, Skills, Automations) persisted to DB
- Acceptance: every sidebar destination renders real data; theme choice persists.

## Phase 4: Polish and verification

- [ ] Empty/loading/error states everywhere, skeletons, reduced-motion support
- [ ] Browser checks at 390/1280 (light + dark), overflow/focus/contrast fixes
- [ ] `npm run build` green; end-to-end persistence re-verified
- Acceptance: build passes, browser scenarios pass, screenshots compared to research.

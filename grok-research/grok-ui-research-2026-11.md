# Grok.com — Complete Visual & UX Research Report

**Target:** grok.com (xAI) as of November 2026
**Compiled:** 2026-11-24
**Screenshots:** `grok-research/screenshots/` (all real captures — my own live captures plus third-party captures of the logged-in app; no AI-generated recreations)

## Evidence legend

- **VERIFIED (live)** — captured directly from grok.com / accounts.x.ai by this research on 2026-11-24 (headless Chromium, desktop 1440×900 light+dark, mobile 390×844, plus raw HTML/CSS extraction).
- **REPORTED (capture)** — real screenshot of the logged-in app captured by an independent tracking service (Screenrove, 2026-11; AI Interface Library, week of 2026-11-16) and cross-checked against written reports.
- **NOT CONFIRMED** — could not be verified; stated explicitly where relevant.

---

## 1. Logged-out experience

**Screenshot:** `grok-research-01-loggedout-desktop-light.png`, `grok-research-02-loggedout-desktop-dark.png`, `grok-research-03-loggedout-mobile.png` — VERIFIED (live)

Layout (light and dark verified live):

- Top bar: Grok glyph logo (slashed-circle “Ø”-style mark) at far left; far right a **settings gear icon** (opens cookie/privacy preferences), a **“Sign in”** pill button (transparent, thin border) and a **“Sign up”** solid near-black pill button. In dark mode the pair inverts (Sign in = light pill, Sign up = white-on-dark solid).
- Centered hero: greeting headline **“What’s on the agenda today?”** (~28–32px, medium weight, dark gray `#3a3a35` on `#F9F8F6` paper background).
- Below it the composer: one rounded-full pill bar with a **“+”** circle button (left, gray), placeholder **“Ask, create images, or build anything…”** (desktop) / **“Ask anything…”** (mobile), and a **send arrow (↑)** in a light gray circle at right.
- Below the composer, 3 **suggestion rows** as plain text lines with small icons (desktop shows icons only on mobile in some variants): “Create an image”, “Write or edit”, “Search the web”. The mobile capture showed “Check email and calendar” instead of “Write or edit” in one variant — the suggestion list is dynamic.
- Footer: “By messaging Grok, you agree to our Terms and Privacy Policy” + “Your privacy choices” link.
- **No sidebar, no model picker pill, no chat history** when logged out. The mode/mode-picker data is still shipped in the page payload (see §3) but the pill is not rendered.
- Dark mode follows system `prefers-color-scheme` (verified live: switching emulation flips it without an account): background `#1A1A1A`/`#141414` tones, same layout.
- Mobile: same stack, tighter spacing, a top banner “View in the Grok app · Open Grok” can appear; suggestions show icons.

**Free-tier behavior:** logged-out and free accounts get **Fast mode only**; Expert/Heavy prompt an upgrade (REPORTED — felloai.com, updated 2026-11-17: “Logged out, only Fast is available, and the other three ask you to upgrade”).

## 2. Authentication flow

**Screenshot:** `grok-research-04-signin-accounts-xai.png` — VERIFIED (live)

- “Sign in” routes to **`accounts.x.ai/sign-in?return_to=...`** (grok.com/sign-in redirects there).
- Page: white canvas, xAI “X-swoosh” logo top-left, centered **“Log into your account”** headline, legal line “By continuing, you agree to the SpaceXSI Terms of Service, Privacy Policy, and Cookie Policy. Your privacy choices”.
- Five stacked rounded-full buttons, each with a brand icon on the left: **Login with Google / Login with X / Login with Apple / Login with GitHub / Login with email**.
- Footer: “Don’t have an account? **Sign up**”.
- Email login continues to a code/verification step (NOT CONFIRMED — not walked through in this research).

## 3. Model selector / mode picker

The picker is a **modes** menu, not a raw model list. Verified from the shipped page payload on 2026-11-24 (primary source) and corroborated by felloai.com (updated 2026-11-17) and ByteForward (2026-10-02):

| Mode | Description shown in menu | Icon | Access |
|---|---|---|---|
| **Auto** | “Chooses Fast or Expert” | three-dots | Paid tiers |
| **Fast** | “Quick responses” | ⚡ lightning bolt | Default; free & logged-out |
| **Expert** | “Thinks hard · Grok 4.7” | 💡 lightbulb | Paid; Grok 4.7 since 3 Oct 2026 |
| **Heavy** | “Team of Experts · Grok 4.7” | 👥 people | Top tiers |

- Default selection: **Fast**. An October 1 screenshot menu also contained a **Build** entry (REPORTED — ByteForward); the November payload shows the four above, so Build may have moved to the bot/app picker.
- Selection UI: the current mode name (“Fast”) with a chevron sits inside the composer at the right, next to the mic icon. Clicking opens a small rounded card dropdown; picking a mode immediately applies it to the conversation (REPORTED for the in-chat behavior; the closed/open states are described from payload + third-party reports — I could not open the menu logged-out).
- Grok 4.7: released 21 Sep 2026, knowledge cutoff May 2026, 500k context (docs.x.ai). Model lineage on grok.com in 2026: Grok 4.5 (Jul) → 4.6 (Aug) → 4.7 (Sep/Oct). **NOT CONFIRMED:** whether x.ai/pricing still says “Grok 4.6 model” in the SuperGrok card (was still inconsistent as of early October per sources).

## 4. Chat interface

**Screenshot:** `grok-research-06-loggedin-chat-messages.jpg` — REPORTED (capture)

- **Column:** centered single column (~764px wide per Screenrove’s measurement), generous line height, body 15px.
- **User messages:** right-aligned rounded-full gray pills, one per message, with a small send/play arrow on hover at the left of the pill. Clicking a pill turns it back into an editable input.
- **AI replies:** plain text on the canvas (no bubble), full markdown: headings, bullet lists, **tables** (thin row separators), **code blocks** (rounded rectangle, dark-on-light in light mode, header with language), inline code in rounded gray chips, *italics* used for emphasis inside bullets.
- **Under each reply:** a compact meta row — source icon(s) with **“47 sources”**-style count (X logo + web icons when both used), then **copy**, **thumbs up**, **thumbs down**, **“…” overflow** buttons (small, gray, ~16px icons).
- **Suggested follow-ups:** rounded-full outlined pill chips under the reply, right-aligned (e.g. “Analyze Linear’s keyboard shortcuts”, “Explore Slack onboarding flows”), controlled by the “Show suggestions” setting.
- **Streaming states:** “Thinking”, “Planning next moves”, “Working” spinner phases (REPORTED — @blankspeaker UI-change post, 2026-10-09).
- **Composer (in chat):** same rounded-full bar — “+” circle (attachments: **“Add files, skills, and connectors”** — VERIFIED aria-label), placeholder “Ask, create images, or build anything…”, right side: mode pill (“Fast ⌄”), **microphone** icon, and a circular send button that becomes a **blue voice-wave widget** in idle state.
- **Temporary chats:** top-right “Private” toggle (dashed-circle icon) starts chats that don’t save to history (REPORTED — visible in both logged-in captures).

## 5. Sidebar and navigation

**Screenshots:** `grok-research-05-loggedin-home-sidebar.jpg` (expanded, light), `grok-research-09-loggedin-dark-desktop-2026-11-16.png` (expanded, dark) — REPORTED (captures)

Expanded sidebar (left, ~275px, same paper background as content, thin right border):

1. Top: **sidebar-toggle icon** and **search icon** (magnifier opens chat search).
2. **“+ New chat”** — rounded-full card with blue plus circle; the primary action.
3. (Nov 16 week capture also shows **“Imagine”** with a “New” badge in dark mode — rollout flag varies by account.)
4. **Library** (grid icon) — generated images/files library.
5. **Grok Bot** section header with **“+ Create a bot”** (bot icons listed beneath in the dark capture, plus “Show more”).
6. **Projects** section header with **“+ New Project”**; existing projects listed as folder rows.
7. **Chats** section header; history as plain text rows, active chat highlighted with a gray rounded background.
8. Bottom: **account row** — round avatar, account name (“Screenrove Test”), and a **grid-plus icon** (app/bot picker) at right.

Collapsed state: the toggle shrinks the sidebar to icon rail (NOT CONFIRMED — no capture; the toggle icon is verified in the top-left of both captures).

Top bar: left = sidebar toggle + search (over content); right = **“Grok Bot”** account-context chip, **“Private”** temporary-chat toggle, **panel icon** (opens right-side detail panel — added week of 2026-11-09 per AI Interface Library).

Change log (REPORTED — ai-portal-library.dev): week of 2026-11-09 removed Chat, Automations and Plugins from the side menu, added New chat / New Project / grid-plus icon; “Grok Bot” removed from the top bar on 2026-10-26 (now an account-context chip).

## 6. Settings and personalization

**Screenshot:** `grok-research-07-settings-appearance-modal.jpg` — REPORTED (capture)

Settings opens as a **large rounded modal sheet** (not a full page) over a dimmed backdrop, with:

- Left rail: search field at top, then sections with icons: **Account, Appearance, Behavior, Notifications, Customize, Connect Apps, Skills, Automations, Data Controls**.
- Right pane per section. Verified Appearance pane contents:
  - **Theme** dropdown — System / Light / Dark.
  - **Wrap Long Code Blocks** toggle — “Wrap long lines in code blocks by default”.
  - **Reduce motion** toggle.
  - **Show suggestions** toggle (on by default) — “Starter prompts on new chats and follow-ups under replies”.
- Customize = custom instructions/personalization; Data Controls = history/memory controls (NOT CONFIRMED — pane contents not captured).
- Bottom bar of the modal: **“Get 50% off Premium · Fewer rate limits, more capabilities”** with a black **Upgrade** button (free account).
- Automations lives **inside settings** (moved there in the redesign, REPORTED — @blankspeaker).
- Billing/usage: **grok.com/dashboard** shows remaining usage and next reset (REPORTED — cursor.com docs describing the shared pool).

**Plans (REPORTED — docs.x.ai/x-subscription/pricing, updated 2026-10-11; x.ai/pricing):** Free $0 · Plus $8/mo · Premium $30/mo (4×, adds Grok Bot, image/video gen, faster replies) · Super $100/mo (15×, 1080p 15s video, priority access) · Ultra $200/mo (50×) · Teams $30+/seat. One shared **weekly** usage pool covers Chat, Imagine, Voice, Bot and Cursor. Legacy SuperGrok/X Premium plans continue.

## 7. Other features

- **Projects:** a project is a workspace page — big centered project title, same composer, tabs **Suggested / Recent / Instructions / Automations / Files** plus a “+” and “Show more” list of the project’s chats with timestamps (`grok-research-08-project-page.jpg` — REPORTED).
- **Bots:** “Grok Bot” section and third-party/persona bots with emoji avatars, selectable from the composer dropdown (“Message Bot”) and the grid-plus picker (`grok-research-09…png` — REPORTED).
- **Imagine (images/video):** sidebar entry (with “New” badge in the Nov 16 dark capture); dedicated generation UI (NOT CONFIRMED — no capture of the Imagine screen itself).
- **Voice mode:** the idle send button becomes a blue **voice waveform widget** (visible in captures); full-screen voice mode exists in the apps (NOT CONFIRMED — web screen not captured).
- **Library:** generated artifacts with search (verified as sidebar item; the redesigned Library adds a title, full search bar and tighter three-column grid — REPORTED).
- **Skills / Connect Apps:** attach skills and connectors to messages via the “+” menu (VERIFIED aria-label “Add files, skills, and connectors”).
- **Automations:** scheduled runs, inside Settings (REPORTED).
- **Build/apps:** apps built with Grok publish to grok.me (REPORTED — third-party; web entry point not confirmed in November).

## 8. Visual design system

Two independent measurements agree; values below combine my CSS-token extraction (VERIFIED, from grok.com’s shipped CSS on 2026-11-24) with Screenrove’s 2026-11-19 computed-style capture (REPORTED).

**Color tokens (exact, from shipped CSS):**

| Token | Light | Dark |
|---|---|---|
| `--grok-accent` | `#1084fe` (hover `#0b6fd6`, disabled `#9dc9f5`) | same |
| base (canvas) | `#FFFFFF` | `#1A1A1A` |
| pane (sidebar/sheets) | `#F7F7F5` | `#141414` |
| elevated surfaces | `#FFFFFF` | `#1F1F1F` |
| text primary | `#0F0F0D` | `#F5F5F2` |
| text secondary | `#5A5A55` | `#A0A09B` |
| text tertiary/disabled | `#8B8B85` | `#6B6B66` |
| borders | `#E4E4E0` | `#2A2A2A` |
| chrome/scroll | `#ECECEA` | `#262626` |
| danger | `#E5484D` · warning `#F5A623` | same |

Screenrove describes the shared canvas as `#F9F8F6` for both sidebar and content with dark mode `#1D1D1D` — the difference from the tokens above is measurement surface (their capture measured the app shell, mine the token sheet); treat the tokens as ground truth for components.

**Typography:** custom variable sans **“X-VF”** exposed as `universalSans` / `universalSansDisplay` (fallback Inter); mono is **Geist Mono** (fallback IBM Plex Mono). Scale (tokens): 12, 13, 14, **15 (body)**, 16, 18, 20, 24, **28 (page title / greeting)** px; weights regular 400 / medium 500 / semibold 600. Slight positive tracking on body, tight on display.

**Shape & elevation:** radii 4, 8, 12, 16, 20, 24, **28px** — the composer, suggestion pills, user message pills and buttons are all fully-rounded (999px/28px); cards/modals 20–28px. Two shadow levels: subtle card shadow (0 1px 3px rgba(0,0,0,.06)) and a large modal shadow. Inputs and buttons use 1px `#E4E4E0` borders; primary buttons are solid near-black (light) / white-on-dark.

**States:** `--grok-*` tokens define hover (one step darker/lighter), active (two steps), disabled (30% accent, gray text), selected (gray fill pill), focus (default browser ring, 2px). Toggles are iOS-style pills; the “on” state is near-black in light mode.

**Motion:** short ease transitions on hover (~150ms); streaming reply fade-in; “Thinking / Planning next moves / Working” phase spinner; Reduce motion setting honored.

**Responsive:** desktop = fixed left sidebar + centered 764px column; tablet ≈ desktop; mobile (<768px) = no sidebar, top bar with logo + Sign in/Sign up, composer spans full width minus 16px margins, suggestion rows with icons (VERIFIED at 390×844, and mobile capture from AI Interface Library).

## 9. Screenshot index

All in `grok-research/screenshots/`:

**Group A — captured live from grok.com this research (2026-11-24):**
1. `grok-research-01-loggedout-desktop-light.png` — logged-out homepage, light
2. `grok-research-02-loggedout-desktop-dark.png` — logged-out homepage, dark
3. `grok-research-03-loggedout-mobile.png` — logged-out homepage, 390×844
4. `grok-research-04-signin-accounts-xai.png` — accounts.x.ai sign-in

**Group B — third-party captures of the logged-in app (real screenshots, not mockups):**
5. `grok-research-05-loggedin-home-sidebar.jpg` — logged-in home, expanded sidebar, light (Screenrove)
6. `grok-research-06-loggedin-chat-messages.jpg` — chat with tables, follow-up chips, action row (Screenrove)
7. `grok-research-07-settings-appearance-modal.jpg` — settings modal, Appearance tab (Screenrove)
8. `grok-research-08-project-page.jpg` — project workspace page (Screenrove)
9. `grok-research-09-loggedin-dark-desktop-2026-11-16.png` — logged-in dark, bots, Imagine “New” badge, invite card (AI Interface Library, week 2026-11-16)
10. `grok-research-10-mobile-2026-11-16.png` — mobile app week capture (AI Interface Library)

**Group C — x.ai marketing site (context for brand voice):**
11. `grok-research-11-xai-marketing-home.webp`, `grok-research-12-xai-marketing-models.webp` (Grok 4.7 announcement), `grok-research-13-xai-marketing-pricing.webp`

**Missing visual references (NOT CONFIRMED — no authentic capture found):** model dropdown in the open state, collapsed sidebar, Data Controls/Customize settings panes, Imagine screen, full-screen voice mode, account menu popover, mobile web logged-in.

## Sources

- Live captures of https://grok.com and https://accounts.x.ai (2026-11-24, this research; HTML/CSS token extraction)
- https://ai-portal-library.dev/portals/grok — weekly UI screenshots + change log (week of 2026-11-16)
- https://screenrove.com/grok/design — measured design system, captured 2026-11-19; captures at https://screenrove.com/grok
- https://docs.x.ai/x-subscription/pricing (updated 2026-10-11) and https://x.ai/pricing — plans and usage pool
- https://docs.x.ai/docs/models — Grok 4.7/4.6/4.5, Imagine image/video, Voice API specs
- https://felloai.com/how-to-download-and-use-grok-4-on-your-mac-without-x-subscription/ (updated 2026-11-17) — mode picker states, free-tier limits
- https://bytefwd.com/grok-4-7-consumer-app-screenshots/ (2026-10-02) — Expert/Heavy tooltips, Build menu entry
- https://twiscan.com/en/x/blankspeaker/2108607409552027859 (2026-10-09) — redesign change list

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ZorkLogo } from "@/components/zork-logo";
import { PrivacyChoicesModal } from "@/components/privacy-footer";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PanelLeft, Search, SquarePen, Library, Plus, Folder, FolderOpen, Mic, Settings,
  LogOut, CircleUser, Sun, Moon, Monitor, Check, Grid2x2Plus, ChevronDown, ChevronUp, X, Sparkles,
} from "lucide-react";
import { SettingsModal } from "./settings-modal";
import { MODES } from "@/lib/ai/provider";

type SidebarData = {
  chats: { id: string; title: string; updatedAt: number; projectId: string | null }[];
  projects: { id: string; name: string }[];
};

export type User = { id: string; email: string; name: string; plan: string; avatarColor: string };
export type Settings = {
  theme: string; wrapCode: number; reduceMotion: number; showSuggestions: number;
  customInstructions: string; memory: number; improvedModel: number; notifications: number; language: string;
};

type ShellCtx = {
  user: User;
  sidebar: SidebarData;
  openSearch: () => void;
  openSettings: (pane?: string) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  theme: string;
  setTheme: (t: string) => void;
};
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () =>
  useContext(Ctx) as ShellCtx & { settings: Settings };

export function AppShell({ user, initialSettings, children }: {
  user: User;
  initialSettings: Settings;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [settingsPane, setSettingsPane] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<SidebarData>({ chats: [], projects: [] });
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [theme, setThemeState] = useState<string>(initialSettings.theme);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/chats").then((r) => r.json()).then((d) => setSidebar({ chats: d.chats || [], projects: [] })).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((d) =>
      setSidebar((s) => ({ ...s, projects: ((d.projects || []) as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name })) })),
    ).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("grokish-theme", theme); } catch {}
    fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) }).catch(() => {});
  }, [theme]);

  const ctx = useMemo<ShellCtx>(() => ({
    user, sidebar, openSearch: () => setSearchOpen(true), openSettings: (pane = "Account") => setSettingsPane(pane),
    settings, setSettings, theme, setTheme: setThemeState,
  }), [user, sidebar, settings, theme]);

  function refreshSidebar() {
    fetch("/api/chats").then((r) => r.json()).then((d) => setSidebar((s) => ({ ...s, chats: d.chats || [] }))).catch(() => {});
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="h-dvh flex bg-pane overflow-hidden">
        {/* Mobile drawer backdrop */}
        {mobileNav && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileNav(false)} aria-hidden="true" />}
        {/* Sidebar */}
        <aside
          className={`shrink-0 flex-col border-r border-line bg-pane transition-[width] duration-300 overflow-hidden ${
            mobileNav
              ? "fixed inset-y-0 left-0 z-40 w-[300px] flex"
              : `hidden md:flex ${sidebarOpen ? "w-[275px]" : "w-0"}`
          }`}
        >
          {mobileNav && (
            <button aria-label="Close menu" onClick={() => setMobileNav(false)} className="absolute right-3 top-3 z-50 w-9 h-9 grid place-items-center rounded-full hover:bg-hover md:hidden">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className={`flex items-center gap-1 px-3 pt-3 pb-2 ${!mobileNav && !sidebarOpen ? "opacity-0" : ""}`}>
            <ZorkLogo height={30} className="mr-auto ml-0.5" />
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-hover text-secondary transition-colors"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search chats"
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-hover text-secondary transition-colors"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          </div>

          <nav className={`flex-1 overflow-y-auto px-3 pb-3 ${!mobileNav && !sidebarOpen ? "opacity-0" : ""}`}>
            <Link
              href="/app"
              onClick={() => setMobileNav(false)}
              className="mt-1 flex items-center gap-2.5 h-10 px-3 rounded-xl bg-bg border border-line shadow-card text-[14px] font-medium hover:bg-hover transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-accent text-white grid place-items-center">
                <Plus className="w-3 h-3" strokeWidth={3} />
              </span>
              New chat
            </Link>

            <SideLink href="/app/imagine" icon={Sparkles} label="Imagine" badge="New" onClick={() => setMobileNav(false)} />
            <SideLink href="/app/library" icon={Library} label="Library" onClick={() => setMobileNav(false)} />

            <SectionTitle>Projects</SectionTitle>
            {sidebar.projects.map((p) => (
              <SideChat key={p.id} href={`/app/projects/${p.id}`} label={p.name} icon={FolderOpen} active={pathname === `/app/projects/${p.id}`} onClick={() => setMobileNav(false)} />
            ))}
            <SideLink href="/app/projects" icon={Plus} label="New Project" onClick={() => setMobileNav(false)} />

            <SectionTitle>Chats</SectionTitle>
            {sidebar.chats.map((c) => (
              <SideChat key={c.id} href={`/app/chat/${c.id}`} label={c.title} active={pathname === `/app/chat/${c.id}`} onClick={() => setMobileNav(false)} />
            ))}
          </nav>

          <div className={`px-3 pb-2 pt-2 border-t border-line ${!mobileNav && !sidebarOpen ? "opacity-0" : ""}`}>
            <AccountMenu user={user} />
            <div className="mt-1 px-3 pb-1 flex items-center gap-2 text-[11px] text-tertiary">
              <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
              <span aria-hidden="true">·</span>
              <button onClick={() => setPrivacyOpen(true)} className="hover:text-text transition-colors">
                Privacy choices
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg relative">
          <div className="md:hidden absolute left-3 top-3 z-30 flex gap-1">
            <button onClick={() => setMobileNav(true)} aria-label="Open menu" className="w-10 h-10 grid place-items-center rounded-xl hover:bg-hover text-secondary">
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className="w-10 h-10 grid place-items-center rounded-xl hover:bg-hover text-secondary">
              <Search className="w-[18px] h-[18px]" />
            </button>
          </div>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Expand sidebar"
              className="hidden md:grid absolute left-3 top-3 z-30 w-9 h-9 place-items-center rounded-lg hover:bg-hover text-secondary transition-colors"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
          )}
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {privacyOpen && <PrivacyChoicesModal onClose={() => setPrivacyOpen(false)} />}
      {settingsPane && (
        <SettingsModal pane={settingsPane} setPane={setSettingsPane} onClose={() => setSettingsPane(null)} />
      )}
      <SidebarRefresh ctxValue={{ refreshSidebar }} />
    </Ctx.Provider>
  );
}

// Lets chat creation refresh the sidebar list without a full reload.
let refreshFn: (() => void) | null = null;
export function refreshChats() {
  refreshFn?.();
}
function SidebarRefresh({ ctxValue }: { ctxValue: { refreshSidebar: () => void } }) {
  refreshFn = ctxValue.refreshSidebar;
  return null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pt-5 pb-1 text-[12px] font-medium text-tertiary">{children}</p>;
}

function SideLink({ href, icon: Icon, label, badge, onClick }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mt-0.5 flex items-center gap-2.5 h-9 px-3 rounded-xl text-[14px] text-text hover:bg-hover transition-colors"
    >
      <Icon className="w-[17px] h-[17px] text-secondary" />
      <span className="truncate">{label}</span>
      {badge && <span className="ml-auto text-[11px] text-secondary bg-hover rounded-full px-2 py-0.5">{badge}</span>}
    </Link>
  );
}

function SideChat({ href, label, active, icon: Icon, onClick }: { href: string; label: string; active?: boolean; icon?: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`mt-0.5 flex items-center gap-2.5 h-9 px-3 rounded-xl text-[14px] transition-colors ${
        active ? "bg-selected font-medium" : "text-text hover:bg-hover"
      }`}
    >
      {Icon ? <Icon className="w-[17px] h-[17px] text-secondary shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { openSettings, theme, setTheme } = useShellSafe();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    router.push("/");
    router.refresh();
  }

  const themes = [
    { id: "system", label: "System", Icon: Monitor },
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 h-11 px-2 rounded-xl hover:bg-hover transition-colors"
      >
        <span
          className="w-7 h-7 rounded-full grid place-items-center text-white text-[12px] font-semibold shrink-0"
          style={{ background: user.avatarColor }}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate text-[14px] font-medium">{user.name}</span>
        <Grid2x2Plus className="w-[18px] h-[18px] text-secondary ml-auto shrink-0" />
      </button>

      {open && (
        <div className="pop-in absolute bottom-14 left-0 right-0 z-50 rounded-2xl border border-line bg-bg shadow-pop p-1.5 text-[14px]">
          <div className="px-3 py-2 border-b border-line mb-1">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-[12px] text-tertiary truncate">{user.email}</p>
          </div>
          <MenuItem icon={CircleUser} label="Account" onClick={() => { setOpen(false); openSettings("Account"); }} />
          <div className="relative">
            <MenuItem icon={themeOpen ? ChevronUp : ChevronDown} label="Theme" onClick={() => setThemeOpen((v) => !v)} chevron />
            {themeOpen && (
              <div className="pb-1">
                {themes.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); setThemeOpen(false); }}
                    className="w-full flex items-center gap-2.5 h-8 pl-9 pr-3 rounded-lg text-[13px] hover:bg-hover transition-colors"
                  >
                    <Icon className="w-4 h-4 text-secondary" />
                    <span className="flex-1 text-left">{label}</span>
                    {theme === id && <Check className="w-4 h-4 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <MenuItem icon={Settings} label="Settings" onClick={() => { setOpen(false); openSettings("Account"); }} />
          <MenuItem icon={LogOut} label="Log out" onClick={logout} />
        </div>
      )}
    </div>
  );
}

function useShellSafe(): { openSettings: (pane?: string) => void; theme: string; setTheme: (t: string) => void } {
  const ctx = useShell();
  return ctx ?? { openSettings: () => {}, theme: "system", setTheme: () => {} };
}

function MenuItem({ icon: Icon, label, onClick, chevron }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; chevron?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl hover:bg-hover transition-colors text-left"
    >
      <Icon className="w-[16px] h-[16px] text-secondary" />
      <span className="flex-1">{label}</span>
    </button>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ chats: { id: string; title: string }[]; messages: { id: string; chatId: string; content: string }[]; projects: { id: string; name: string }[] }>({ chats: [], messages: [], projects: [] });
  useEffect(() => {
    if (!q.trim()) { setResults({ chats: [], messages: [], projects: [] }); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setResults).catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/20" onClick={onClose}>
      <div className="pop-in w-full max-w-[560px] rounded-2xl border border-line bg-bg shadow-pop overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 h-[52px] border-b border-line">
          <Search className="w-[16px] h-[16px] text-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, messages and projects..."
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto p-1.5">
          {!q.trim() && <p className="px-3 py-6 text-center text-[13px] text-tertiary">Type to search your history.</p>}
          {q.trim() && results.chats.length === 0 && results.messages.length === 0 && results.projects.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-tertiary">No results for “{q}”.</p>
          )}
          {results.chats.map((c) => (
            <Link key={c.id} href={`/app/chat/${c.id}`} onClick={onClose} className="flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-hover text-[14px]">
              <SquarePen className="w-4 h-4 text-secondary" />
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
          {results.projects.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`} onClick={onClose} className="flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-hover text-[14px]">
              <Folder className="w-4 h-4 text-secondary" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          {results.messages.map((m) => (
            <Link key={m.id} href={`/app/chat/${m.chatId}`} onClick={onClose} className="flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-hover text-[14px]">
              <Search className="w-4 h-4 text-secondary shrink-0" />
              <span className="truncate text-secondary">{m.content.slice(0, 80)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { User, Sun, SlidersHorizontal, Bell, SlidersVertical, Plug, Library, Clock, ShieldCheck, Search, X, ChevronLeft, Sparkles } from "lucide-react";
import { useShell, type Settings } from "./app-shell";

type Patch = (body: Partial<Settings>) => void;

const PANES = [
  { id: "Account", icon: User, hint: "Name, email and plan" },
  { id: "Appearance", icon: Sun, hint: "Theme and code display" },
  { id: "Behavior", icon: SlidersHorizontal, hint: "Motion and suggestions" },
  { id: "Notifications", icon: Bell, hint: "Task completion alerts" },
  { id: "Customize", icon: SlidersVertical, hint: "Instructions and language" },
  { id: "Connect Apps", icon: Plug, hint: "Calendars, email, storage" },
  { id: "Skills", icon: Library, hint: "Extend what the assistant can do" },
  { id: "Automations", icon: Clock, hint: "Scheduled recurring prompts" },
  { id: "Data Controls", icon: ShieldCheck, hint: "Memory and training" },
];

export function SettingsModal({ pane, setPane, onClose }: { pane: string; setPane: (p: string) => void; onClose: () => void }) {
  const { user, settings, setSettings, theme, setTheme } = useShell();
  const [filter, setFilter] = useState("");
  const [tierNotice, setTierNotice] = useState(false);
  // Mobile drill-down: the nav list and a section never share the small screen.
  const [showSection, setShowSection] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function patch(body: Partial<Settings>) {
    setSettings({ ...settings, ...body });
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const d = await r.json();
        setSettings(d.settings);
      }
    } catch {
      // Optimistic value stays; server truth is reloaded the next time settings open.
    }
  }

  const visible = PANES.filter((p) => (p.id + " " + p.hint).toLowerCase().includes(filter.toLowerCase()));

  function selectSection(id: string) {
    setPane(id);
    setShowSection(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 fade-in flex items-center justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="settings-pop w-full max-w-[820px] h-[min(640px,calc(100dvh-24px))] md:h-[min(620px,85vh)] rounded-2xl border border-line bg-bg shadow-pop overflow-hidden flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 flex">
          {/* Navigation column — desktop always; on mobile shown until a section opens */}
          <div className={`${showSection ? "hidden md:flex" : "flex"} w-full md:w-[248px] shrink-0 flex-col border-r border-line p-3 min-h-0`}>
            <div className="flex items-center justify-between pl-2 pr-1 pt-1 pb-2 md:hidden">
              <h2 className="text-[17px] font-semibold tracking-tight">Settings</h2>
              <button onClick={onClose} aria-label="Close settings" className="w-9 h-9 grid place-items-center rounded-full hover:bg-hover text-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-pane border border-line shrink-0">
              <Search className="w-4 h-4 text-tertiary" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search"
                aria-label="Search settings"
                className="flex-1 bg-transparent outline-none text-[14px] min-w-0"
              />
            </div>
            <nav className="overflow-y-auto -mx-1 px-1 mt-2" aria-label="Settings sections">
              {visible.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => selectSection(id)}
                  className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-[14px] transition-colors ${
                    pane === id ? "bg-selected font-medium" : "hover:bg-hover"
                  }`}
                >
                  <Icon className="w-[16px] h-[16px] text-secondary shrink-0" />
                  <span className="truncate">{id}</span>
                </button>
              ))}
              {visible.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-tertiary">No sections match “{filter}”.</p>}
            </nav>
          </div>

          {/* Content column — on mobile shown after picking a section, with a back button */}
          <div className={`${showSection ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 min-h-0`}>
            <div className="flex items-center gap-1 px-4 md:px-6 pt-3 pb-2 shrink-0">
              <button
                onClick={() => setShowSection(false)}
                aria-label="Back to settings navigation"
                className="md:hidden w-9 h-9 -ml-2 grid place-items-center rounded-full hover:bg-hover text-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[17px] font-semibold tracking-tight">{pane}</h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="ml-auto w-9 h-9 grid place-items-center rounded-full hover:bg-hover text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-6">
              <div key={pane} className="rise-in">
                {pane === "Account" && <AccountPane user={user} />}
                {pane === "Appearance" && <AppearancePane settings={settings} patch={patch} theme={theme} setTheme={setTheme} />}
                {pane === "Behavior" && (
                  <ToggleList
                    settings={settings}
                    patch={patch}
                    keys={[
                      ["reduceMotion", "Reduce motion", "Minimize animations across the app"],
                      ["showSuggestions", "Show suggestions", "Starter prompts on new chats and follow-ups under replies"],
                    ]}
                  />
                )}
                {pane === "Notifications" && (
                  <ToggleList settings={settings} patch={patch} keys={[["notifications", "Push notifications", "Get notified when long tasks finish"]]} />
                )}
                {pane === "Customize" && <CustomizePane settings={settings} patch={patch} />}
                {pane === "Connect Apps" && <EmptyPane icon={Plug} text="Connect calendars, email and storage so the assistant can act for you." />}
                {pane === "Skills" && <EmptyPane icon={Library} text="Skills extend what the assistant can do. Install skills from the library." />}
                {pane === "Automations" && <EmptyPane icon={Clock} text="Schedule recurring prompts and get the results where you want them." />}
                {pane === "Data Controls" && (
                  <ToggleList
                    settings={settings}
                    patch={patch}
                    keys={[
                      ["memory", "Memory", "Let the assistant remember details across chats"],
                      ["improvedModel", "Improve the model for everyone", "Allow new conversations to be used for training"],
                    ]}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line px-4 md:px-6 py-3 flex items-center gap-3 shrink-0">
          <p className="text-[13px] font-medium whitespace-nowrap">Get 50% off Premium</p>
          <p className="text-[13px] text-tertiary truncate hidden sm:block">Fewer rate limits, more capabilities</p>
          <button
            onClick={() => setTierNotice(true)}
            aria-label="Upgrade to Premium"
            className="ml-auto h-8 px-4 rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[13px] font-medium hover:opacity-85 transition-opacity"
          >
            Upgrade
          </button>
        </div>
        {tierNotice && (
          <div className="px-4 md:px-6 pb-3 -mt-1 text-[12px] text-tertiary" role="status">
            Billing is not enabled on this deployment — every plan currently has the same limits.
          </div>
        )}
      </div>
    </div>
  );
}

function AccountPane({ user }: { user: { name: string; email: string; plan: string; avatarColor?: string } }) {
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="pt-2">
      <div className="flex items-center gap-4 pb-5">
        <span
          className="w-12 h-12 rounded-full grid place-items-center text-[18px] font-semibold text-white shrink-0"
          style={{ backgroundColor: user.avatarColor || "#1084fe" }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-medium truncate">{user.name || "Not set"}</p>
          <p className="text-[13px] text-tertiary truncate">{user.email || "—"}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-line divide-y divide-line">
        <Row label="Name" value={user.name || "Not set"} />
        <Row label="Email" value={user.email || "—"} />
        <Row label="Plan" value={user.plan === "free" ? "Free" : user.plan} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-[14px] text-secondary">{label}</span>
      <span className="text-[14px] font-medium truncate">{value}</span>
    </div>
  );
}

function AppearancePane({ settings, patch, theme, setTheme }: { settings: Settings; patch: Patch; theme: string; setTheme: (t: string) => void }) {
  const options = ["System", "Light", "Dark"];
  return (
    <div className="pt-2 flex flex-col gap-3">
      <p className="text-[13px] text-secondary">Appearance</p>
      <div className="rounded-2xl border border-line divide-y divide-line">
        <div className="flex items-center justify-between gap-4 px-4 py-2 min-h-[52px]">
          <span className="text-[14px]">Theme</span>
          <div className="flex gap-1 p-1 rounded-full bg-pane" role="radiogroup" aria-label="Theme">
            {options.map((o) => {
              const id = o.toLowerCase();
              return (
                <button
                  key={o}
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => setTheme(id)}
                  className={`h-7 px-3 rounded-full text-[13px] transition-colors ${theme === id ? "bg-bg shadow-card font-medium" : "text-secondary hover:text-text"}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
        <ToggleRow
          label="Wrap Long Code Blocks"
          hint="Wrap long lines in code blocks by default"
          on={!!settings.wrapCode}
          onChange={(v) => patch({ wrapCode: v ? 1 : 0 })}
        />
      </div>
    </div>
  );
}

function ToggleList({ settings, patch, keys }: { settings: Settings; patch: Patch; keys: [keyof Settings, string, string][] }) {
  return (
    <div className="pt-2 rounded-2xl border border-line divide-y divide-line">
      {keys.map(([k, label, hint]) => (
        <ToggleRow key={k} label={label} hint={hint} on={!!settings[k]} onChange={(v) => patch({ [k]: v ? 1 : 0 } as Partial<Settings>)} />
      ))}
    </div>
  );
}

function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px]">{label}</p>
        {hint && <p className="text-[13px] text-tertiary">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`w-[38px] h-[22px] shrink-0 rounded-full p-[3px] transition-colors ${on ? "bg-text" : "bg-chrome"}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-bg shadow-card transition-transform ${on ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

const LANGUAGES = ["Auto", "English", "Español", "Français", "Deutsch", "Português", "Русский", "中文", "日本語"];

function CustomizePane({ settings, patch }: { settings: Settings; patch: Patch }) {
  const [instructions, setInstructions] = useState(settings.customInstructions);
  const [saved, setSaved] = useState(false);
  return (
    <div className="pt-2 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-secondary">Custom instructions</p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={(e) => {
            if (e.target.value !== settings.customInstructions) {
              patch({ customInstructions: e.target.value });
              setSaved(true);
            }
          }}
          rows={6}
          placeholder="How should the assistant respond? Tone, format, context about you or your team…"
          className="w-full rounded-2xl border border-line bg-transparent p-4 text-[14px] outline-none focus:border-accent transition-colors resize-none"
        />
        <p className="text-[12px] text-tertiary" role="status">{saved ? "Saved." : "Saved automatically when you click outside the field."}</p>
      </div>
      <div className="rounded-2xl border border-line divide-y divide-line">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-[14px]">Language</span>
          <select
            value={settings.language || "Auto"}
            onChange={(e) => patch({ language: e.target.value })}
            aria-label="Preferred language"
            className="h-9 px-3 rounded-xl bg-pane border border-line text-[14px] outline-none focus:border-accent transition-colors max-w-[160px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function EmptyPane({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="pt-12 pb-8 text-center flex flex-col items-center gap-3">
      <span className="w-12 h-12 rounded-2xl border border-line grid place-items-center text-secondary">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-[14px] text-secondary max-w-[360px]">{text}</p>
      <p className="text-[12px] text-tertiary flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" /> Nothing connected yet on this deployment.
      </p>
    </div>
  );
}

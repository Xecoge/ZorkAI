"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, User, Sun, SlidersHorizontal, Bell, SlidersVertical, Plug, Library, Clock, ShieldCheck } from "lucide-react";
import { useShell, type Settings } from "./app-shell";

type Patch = (body: Partial<Settings>) => void;

const PANES = [
  { id: "Account", icon: User },
  { id: "Appearance", icon: Sun },
  { id: "Behavior", icon: SlidersHorizontal },
  { id: "Notifications", icon: Bell },
  { id: "Customize", icon: SlidersVertical },
  { id: "Connect Apps", icon: Plug },
  { id: "Skills", icon: Library },
  { id: "Automations", icon: Clock },
  { id: "Data Controls", icon: ShieldCheck },
];

export function SettingsModal({ pane, setPane, onClose }: { pane: string; setPane: (p: string) => void; onClose: () => void }) {
  const { user, settings, setSettings, theme, setTheme } = useShell();
  const [filter, setFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body: Partial<Settings>) {
    const next = { ...settings, ...body };
    setSettings(next);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (body.theme) router.refresh();
  }

  const visible = PANES.filter((p) => p.id.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/25 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div
        className="w-full max-w-[760px] h-[min(600px,80vh)] rounded-2xl border border-line bg-bg shadow-pop overflow-hidden flex flex-col md:flex-row rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-line p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-pane border border-line">
            <Search className="w-4 h-4 text-tertiary" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent outline-none text-[14px] min-w-0"
            />
          </div>
          <div className="overflow-y-auto -mx-1 px-1">
            {visible.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPane(id)}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-[14px] transition-colors ${
                  pane === id ? "bg-selected font-medium" : "hover:bg-hover"
                }`}
              >
                <Icon className="w-[16px] h-[16px] text-secondary" />
                {id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <h2 className="text-[17px] font-semibold tracking-tight">{pane}</h2>
            <button onClick={onClose} aria-label="Close settings" className="w-8 h-8 grid place-items-center rounded-full hover:bg-hover text-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {pane === "Account" && <AccountPane user={user} />}
            {pane === "Appearance" && <AppearancePane settings={settings} patch={patch} theme={theme} setTheme={setTheme} />}
            {pane === "Behavior" && <ToggleList settings={settings} patch={patch} keys={[["wrapCode", "Wrap Long Code Blocks", "Wrap long lines in code blocks by default"], ["reduceMotion", "Reduce motion", "Minimize animations across the app"]]} />}
            {pane === "Notifications" && <ToggleList settings={settings} patch={patch} keys={[["notifications", "Push notifications", "Get notified when long tasks finish"]]} />}
            {pane === "Customize" && <CustomizePane settings={settings} patch={patch} />}
            {pane === "Connect Apps" && <EmptyPane text="Connect calendars, email and storage so the assistant can act for you." />}
            {pane === "Skills" && <EmptyPane text="Skills extend what the assistant can do. Install skills from the library." />}
            {pane === "Automations" && <EmptyPane text="Schedule recurring prompts and get the results where you want them." />}
            {pane === "Data Controls" && <ToggleList settings={settings} patch={patch} keys={[["memory", "Memory", "Let the assistant remember details across chats"], ["improvedModel", "Improve the model for everyone", "Allow new conversations to be used for training"]]} />}
          </div>
          <div className="border-t border-line px-6 py-3 flex items-center gap-3">
            <p className="text-[13px] font-medium">Get 50% off Premium</p>
            <p className="text-[13px] text-tertiary truncate hidden sm:block">Fewer rate limits, more capabilities</p>
            <button className="ml-auto h-8 px-4 rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[13px] font-medium hover:opacity-85 transition-opacity">
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountPane({ user }: { user: { name: string; email: string; plan: string } }) {
  return (
    <div className="pt-2 flex flex-col gap-4 text-[14px]">
      <Row label="Name" value={user.name} />
      <Row label="Email" value={user.email} />
      <Row label="Plan" value={user.plan === "free" ? "Free" : user.plan} />
      <Row label="Member since" value="November 2026" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
      <span className="text-secondary">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function AppearancePane({ settings, patch, theme, setTheme }: { settings: Settings; patch: Patch; theme: string; setTheme: (t: string) => void }) {
  const options = ["System", "Light", "Dark"];
  return (
    <div className="pt-2">
      <p className="text-[13px] text-secondary mb-3">Appearance</p>
      <div className="rounded-2xl border border-line divide-y divide-line">
        <div className="flex items-center justify-between gap-4 px-4 h-[52px]">
          <span className="text-[14px]">Theme</span>
          <div className="flex gap-1 p-1 rounded-full bg-pane">
            {options.map((o) => {
              const id = o.toLowerCase();
              return (
                <button
                  key={o}
                  onClick={() => setTheme(id)}
                  className={`h-7 px-3 rounded-full text-[13px] transition-colors ${theme === id ? "bg-bg shadow-card font-medium" : "text-secondary hover:text-text"}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
        <ToggleRow label="Wrap Long Code Blocks" hint="Wrap long lines in code blocks by default" on={!!settings.wrapCode} onChange={(v) => patch({ wrapCode: v ? 1 : 0 })} />
        <ToggleRow label="Reduce motion" hint="Minimize animations across the app" on={!!settings.reduceMotion} onChange={(v) => patch({ reduceMotion: v ? 1 : 0 })} />
        <ToggleRow label="Show suggestions" hint="Starter prompts on new chats and follow-ups under replies" on={!!settings.showSuggestions} onChange={(v) => patch({ showSuggestions: v ? 1 : 0 })} />
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
        {hint && <p className="text-[13px] text-tertiary truncate">{hint}</p>}
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

function CustomizePane({ settings, patch }: { settings: Settings; patch: Patch }) {
  return (
    <div className="pt-2 flex flex-col gap-3">
      <p className="text-[13px] text-secondary">Custom instructions</p>
      <textarea
        defaultValue={settings.customInstructions}
        onBlur={(e) => patch({ customInstructions: e.target.value })}
        rows={6}
        placeholder="How should the assistant respond? Tone, format, context about you or your team…"
        className="w-full rounded-2xl border border-line bg-transparent p-4 text-[14px] outline-none focus:border-accent transition-colors resize-none"
      />
      <p className="text-[12px] text-tertiary">Saved automatically when you click outside the field.</p>
    </div>
  );
}

function EmptyPane({ text }: { text: string }) {
  return (
    <div className="pt-10 text-center">
      <p className="text-[14px] text-secondary max-w-[360px] mx-auto">{text}</p>
      <p className="mt-2 text-[12px] text-tertiary">Nothing connected yet on this deployment.</p>
    </div>
  );
}

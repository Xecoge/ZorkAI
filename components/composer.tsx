"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Mic, Paperclip, ImagePlus, Globe, Check, ChevronDown, Sparkles, Hammer, Gauge, Brain, Scale, Users } from "lucide-react";

const MODES = [
  { id: "auto", label: "Auto", description: "Chooses Fast or Expert", paid: true, icon: Scale },
  { id: "fast", label: "Fast", description: "Quick responses", paid: false, icon: Gauge },
  { id: "expert", label: "Expert", description: "Thinks hard", paid: true, icon: Brain },
  { id: "heavy", label: "Heavy", description: "Team of Experts", paid: true, icon: Users },
  { id: "build", label: "Build", description: "Ship a working prototype", paid: true, icon: Hammer },
];

export function Composer({ onSend, busy, mode, setMode, modelSelector }: {
  onSend: (text: string) => void;
  busy: boolean;
  mode: string;
  setMode: (m: string) => void;
  modelSelector?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [value]);

  function submit() {
    const v = value.trim();
    if (!v || busy) return;
    onSend(v);
    setValue("");
  }

  const current = MODES.find((m) => m.id === mode) || MODES[1];
  const CurrentIcon = current.icon;

  return (
    <div className="w-full max-w-[756px] mx-auto relative">
      <div className="flex items-end gap-2 rounded-[28px] bg-bg border border-line shadow-card pl-3 pr-3 py-2.5 focus-within:shadow-pop transition-shadow">
        <div className="relative">
          <button
            type="button"
            aria-label="Add attachment"
            onClick={() => setAttachOpen((v) => !v)}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-pane text-secondary hover:bg-hover transition-colors"
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>
          {attachOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAttachOpen(false)} />
              <div className="pop-in absolute bottom-12 left-0 z-50 w-[220px] rounded-2xl border border-line bg-bg shadow-pop p-1.5 text-[14px]">
                <AttachItem icon={Paperclip} label="Attach file" hint="Needs a storage provider" onClick={() => setNotice("File attachments need a storage provider on this deployment.")} />
                <AttachItem icon={ImagePlus} label="Upload image" hint="Needs a storage provider" onClick={() => setNotice("Image uploads need a storage provider on this deployment.")} />
                <AttachItem icon={Globe} label="Search the web" hint="Latest sources" onClick={() => { setAttachOpen(false); onSend("Search the web: "); }} />
              </div>
            </>
          )}
        </div>

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask, create images, or build anything..."
          aria-label="Message"
          className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-tertiary resize-none py-2.5 max-h-[220px] min-w-0"
        />

        <div className="flex items-center gap-1 pb-0.5 shrink-0">
          {modelSelector}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="xq-mode-btn h-9 px-2.5 flex items-center gap-1 rounded-full text-[14px] font-medium hover:bg-hover transition-colors"
            >
              <CurrentIcon className="xq-mode-icon w-3.5 h-3.5 text-secondary" />
              {current.label}
              <ChevronDown className={`w-3.5 h-3.5 text-tertiary transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="pop-in absolute bottom-11 right-0 z-50 w-[260px] rounded-2xl border border-line bg-bg shadow-pop p-1.5">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setMode(m.id); setMenuOpen(false); }}
                        className={`xq-mode-btn w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-hover transition-colors text-left ${active ? "bg-hover xq-mode-active" : ""}`}
                      >
                        <Icon className="xq-mode-icon w-4 h-4 mt-0.5 shrink-0 text-secondary" />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5 text-[14px] font-medium">
                            {m.label}
                            {m.paid && <Sparkles className="w-3 h-3 text-tertiary" />}
                          </span>
                          <span className="block text-[12px] text-tertiary truncate">{m.description}</span>
                        </span>
                        {active && <Check className="w-4 h-4 text-accent mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Voice mode"
            onClick={() => setNotice("Voice mode needs a speech provider on this deployment.")}
            className="w-9 h-9 grid place-items-center rounded-full text-secondary hover:bg-hover transition-colors"
          >
            <Mic className="w-[17px] h-[17px]" />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || busy}
            aria-label="Send message"
            className="w-10 h-10 grid place-items-center rounded-full bg-accent text-white hover:bg-[var(--accent-hover)] disabled:bg-[var(--accent-disabled)] transition-colors"
          >
            <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {notice && (
        <p role="status" className="mt-2 px-4 text-[13px] text-secondary text-center">
          {notice}
        </p>
      )}
    </div>
  );
}

function AttachItem({ icon: Icon, label, hint, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-hover transition-colors text-left"
    >
      <Icon className="w-[16px] h-[16px] text-secondary" />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block text-[12px] text-tertiary">{hint}</span>
      </span>
    </button>
  );
}

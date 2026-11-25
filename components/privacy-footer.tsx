"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Check, ShieldCheck } from "lucide-react";

export const PRIVACY_CATEGORIES: { key: string; label: string; locked?: boolean; desc: string }[] = [
  {
    key: "essential",
    label: "Essential",
    locked: true,
    desc: "Keeps you signed in and stores your settings. Always on.",
  },
  {
    key: "memory",
    label: "Memory & personalization",
    desc: "Lets Zork remember details across chats to tailor replies.",
  },
  {
    key: "training",
    label: "Improve the model",
    desc: "Allows new conversations to be used for product training.",
  },
  {
    key: "notifications",
    label: "Notifications",
    desc: "Alerts you when long tasks finish.",
  },
];

export type PrivacyValues = { memory: boolean; training: boolean; notifications: boolean };

const STORE_KEY = "zork-privacy";

function readLocal(): PrivacyValues {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as PrivacyValues;
  } catch {}
  return { memory: true, training: false, notifications: true };
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="underline decoration-line underline-offset-2 hover:text-text transition-colors">
      {children}
    </Link>
  );
}

/** Footer control + modal: real preference switches, persisted to the
    account when signed in, otherwise to this browser's local storage. */
export function PrivacyFooter() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-1 underline decoration-line underline-offset-2 hover:text-text transition-colors">
        Your privacy choices
      </button>
      {open && <PrivacyChoicesModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function PrivacyChoicesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/25 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your privacy choices"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] flex justify-center">
        <PrivacyChoicesCard onClose={onClose} inOverlay />
      </div>
    </div>
  );
}

export function PrivacyChoicesCard({ onClose, inOverlay = false }: { onClose: () => void; inOverlay?: boolean }) {
  const [values, setValues] = useState<PrivacyValues | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const [where, setWhere] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Signed-in users get their saved choices from the account; the
    // signed-out landing page falls back to this browser's storage.
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error("signed out");
        return r.json();
      })
      .then((d) => {
        setWhere("your account");
        setValues({
          memory: !!d.settings.memory,
          training: !!d.settings.improvedModel,
          notifications: !!d.settings.notifications,
        });
      })
      .catch(() => {
        setWhere("this browser");
        setValues(readLocal());
      });
  }, []);

  async function save() {
    if (!values) return;
    setSaved("saving");
    const body = { memory: values.memory, improvedModel: values.training, notifications: values.notifications };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(values));
    } catch {}
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setWhere("your account");
    } catch {}
    setSaved("done");
    setTimeout(onClose, 700);
  }

  return (
    <div
      className={`w-full max-w-[520px] max-h-[85vh] overflow-y-auto rounded-2xl border border-line bg-bg shadow-pop ${inOverlay ? "rise-in" : ""}`}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <ShieldCheck className="w-5 h-5 text-secondary" />
        <button onClick={onClose} aria-label="Close privacy choices" className="w-8 h-8 grid place-items-center rounded-full hover:bg-hover text-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 pb-2">
        <h2 className="text-[19px] font-semibold tracking-tight">Your privacy choices</h2>
        <p className="mt-1.5 text-[13px] text-secondary leading-relaxed">
          Choose how Zork may use your data. Essential processing is always on; everything else here is optional and can
          be changed at any time. Preferences are saved to {where || "your account"}.
        </p>
      </div>
      <div className="px-6 pb-4">
        <div className="rounded-2xl border border-line divide-y divide-line">
          {PRIVACY_CATEGORIES.map((c) => {
            const on = c.locked ? true : values ? values[c.key as keyof PrivacyValues] : false;
            return (
              <div key={c.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[14px]">{c.label}</p>
                  <p className="text-[12px] text-tertiary">{c.desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={c.label}
                  disabled={c.locked}
                  onClick={() => setValues((v) => (v ? { ...v, [c.key]: !on } : v))}
                  className={`w-[38px] h-[22px] shrink-0 rounded-full p-[3px] transition-colors ${on ? "bg-text" : "bg-chrome"} ${c.locked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-bg shadow-card transition-transform ${on ? "translate-x-4" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-tertiary">
          Details in our <FooterLink href="/privacy">Privacy Policy</FooterLink>.
        </p>
      </div>
      <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2">
        <button onClick={onClose} className="h-9 px-4 rounded-full border border-line text-[14px] font-medium hover:bg-hover transition-colors">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!values || saved === "saving"}
          className="h-9 px-4 rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[14px] font-medium hover:opacity-85 disabled:opacity-50 transition-opacity inline-flex items-center gap-1.5"
        >
          {saved === "done" ? <Check className="w-4 h-4" /> : null}
          {saved === "done" ? "Saved" : saved === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

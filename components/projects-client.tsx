"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not create the project."); return; }
    setOpen(false);
    setName("");
    setInstructions("");
    router.push(`/app/projects/${data.project.id}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-accent text-white text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-colors"
      >
        <Plus className="w-4 h-4" /> New Project
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/25 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={create}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-2xl border border-line bg-bg shadow-pop p-6 rise-in"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">New Project</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full hover:bg-hover text-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              required
              className="w-full h-11 px-4 rounded-xl border border-line bg-transparent text-[14px] outline-none focus:border-accent transition-colors mb-3"
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions the assistant should follow in every chat of this project…"
              rows={4}
              className="w-full rounded-xl border border-line bg-transparent p-3.5 text-[14px] outline-none focus:border-accent transition-colors resize-none mb-3"
            />
            {error && <p role="alert" className="text-[13px] text-danger mb-3">{error}</p>}
            <button
              disabled={busy || !name.trim()}
              className="h-10 w-full rounded-full bg-accent text-white text-[14px] font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
            >
              {busy ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

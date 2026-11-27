"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Zap } from "lucide-react";
import { MODELS, planAllows, type PlanId } from "@/lib/ai/config";

export function ModelSelector({ model, setModel, plan }: { model: string; setModel: (id: string) => void; plan: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const planId = (plan as PlanId) || "free";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="xq-mode-btn h-8 px-2.5 min-w-0 max-w-[44vw] min-[420px]:max-w-none flex items-center gap-1.5 rounded-full border border-line text-[13px] font-medium hover:bg-hover transition-colors"
      >
        <Zap className="xq-mode-icon w-3.5 h-3.5 shrink-0 text-accent" />
        <span className="truncate">{current.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Model"
          className="pop-in absolute bottom-10 left-0 z-50 w-[260px] max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-bg shadow-pop p-1.5"
        >
          {MODELS.map((m) => {
            const active = m.id === model;
            const locked = !planAllows(planId, m);
            return (
              <button
                key={m.id}
                role="option"
                aria-selected={active}
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  setModel(m.id);
                  setOpen(false);
                }}
                className={`xq-mode-btn w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? "bg-hover xq-mode-active" : "hover:bg-hover"
                } ${locked ? "opacity-45 cursor-not-allowed" : ""}`}
              >
                <span className="truncate text-[14px] font-medium">{m.name}</span>
                {active && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles, Lock, Zap } from "lucide-react";
import { MODELS, type ModelEntry } from "@/lib/ai/config";

export type ModelInfo = ModelEntry & { allowed: boolean };

export function ModelSelector({  model,
  setModel,
  plan,
}: {
  model: string;
  setModel: (id: string) => void;
  plan: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];
  void plan;

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
          className="pop-in absolute bottom-10 left-0 z-50 w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-bg shadow-pop p-1.5"
        >
          {(MODELS as ModelInfo[]).map((m) => {
            const active = m.id === model;
            const locked = !m.allowed;
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
                className={`xq-mode-btn w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? "bg-hover xq-mode-active" : "hover:bg-hover"
                } ${locked ? "opacity-45 cursor-not-allowed" : ""}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium">
                    {m.name}
                    {m.minPlan !== "free" && <Sparkles className="w-3 h-3 text-tertiary" aria-label={`${m.minPlan} plan`} />}
                  </span>
                  <span className="block text-[12px] text-tertiary truncate">{m.description}</span>
                  <span className="block text-[11px] text-tertiary mt-0.5">
                    {m.creditsPer1kIn}/{m.creditsPer1kOut} credits per 1K in/out tokens
                  </span>
                </span>
                {locked ? (
                  <Lock className="w-3.5 h-3.5 text-tertiary mt-1 shrink-0" aria-label={`Requires ${m.minPlan}`} />
                ) : (
                  active && <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                )}
              </button>
            );
          })}
          <p className="px-3 py-2 text-[11px] text-tertiary border-t border-line mt-1">
            Your plan: <span className="capitalize">{plan}</span>. Locked models unlock with an upgrade.
          </p>
        </div>
      )}
    </div>
  );
}

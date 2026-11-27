"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Zap } from "lucide-react";
import { MODELS, planAllows, normalizePlan } from "@/lib/ai/config";

const VISIBLE_LIMIT = 60;

export function ModelSelector({ model, setModel, plan }: { model: string; setModel: (id: string) => void; plan: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const planId = normalizePlan(plan);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODELS.slice(0, VISIBLE_LIMIT);
    return MODELS.filter((m) => m.name.toLowerCase().includes(q)).slice(0, VISIBLE_LIMIT);
  }, [query]);

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
          className="pop-in absolute bottom-10 left-0 z-50 w-[280px] max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-bg shadow-pop p-1.5"
        >
          <div className="flex items-center gap-2 h-8 px-2.5 mb-1 rounded-xl bg-pane border border-line">
            <Search className="w-3.5 h-3.5 text-tertiary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Поиск среди ${MODELS.length} моделей`}
              aria-label="Поиск модели"
              className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
            />
          </div>
          <div className="max-h-[46vh] overflow-y-auto overscroll-contain">
            {matches.map((m) => {
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
                  className={`xq-mode-btn w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                    active ? "bg-hover xq-mode-active" : "hover:bg-hover"
                  } ${locked ? "opacity-45 cursor-not-allowed" : ""}`}
                >
                  <span className="truncate text-[13.5px] font-medium">{m.name}</span>
                  {active && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>
              );
            })}
            {matches.length === 0 && <p className="px-3 py-4 text-[13px] text-tertiary">Ничего не найдено.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

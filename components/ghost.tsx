"use client";

import { useEffect, useRef, useState } from "react";
import { statusLabel, type Lang, type StatusStage } from "@/lib/thinking";

// The Xecoge ghost — the visual identity of the AI thinking indicator.
// Pure SVG, ~1 KB, animated only with transform/opacity (GPU-friendly,
// respects prefers-reduced-motion via the CSS classes in globals.css).
export function Ghost({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`xq-ghost ${className}`}
    >
      <path
        d="M12 2.5c-4.6 0-8 3.6-8 8.2v9.1c0 1.2 1.4 1.9 2.4 1.1l1.4-1.1c.5-.4 1.2-.4 1.7 0l1.2 1c.8.6 1.9.6 2.6 0l1.2-1c.5-.4 1.2-.4 1.7 0l1.4 1.1c1 .8 2.4.1 2.4-1.1v-9.1c0-4.6-3.4-8.2-8-8.2Z"
        fill="currentColor"
      />
      <circle cx="9.2" cy="10.4" r="1.25" fill="var(--bg, #0A0A0B)" />
      <circle cx="14.8" cy="10.4" r="1.25" fill="var(--bg, #0A0A0B)" />
    </svg>
  );
}

// Ghost + orbiting particle, reused for loading states at different intensity.
export function GhostLoader({ size = 34, intensity = "normal" }: { size?: number; intensity?: "subtle" | "normal" | "strong" }) {
  return (
    <span className={`xq-ghost-wrap xq-intensity-${intensity} inline-grid place-items-center`} style={{ width: size, height: size }}>
      <span className="xq-orbit absolute inset-0">
        <span className="xq-orbit-dot" />
      </span>
      <Ghost size={Math.round(size * 0.62)} />
    </span>
  );
}

const STAGE_ORDER: StatusStage[] = ["thinking", "analyzing", "planning", "processing", "searching", "preparing", "generating"];

// Animated status label next to the ghost. Stages fade/slide in and out
// (fade + slight vertical movement, ~180 ms), no layout jump.
export function GhostStatus({ stage, lang }: { stage: StatusStage; lang: Lang }) {
  const [display, setDisplay] = useState(stage);
  const [leaving, setLeaving] = useState(false);
  const prev = useRef(stage);

  useEffect(() => {
    if (prev.current === stage) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setDisplay(stage);
      setLeaving(false);
      prev.current = stage;
    }, 160);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <span className="inline-flex items-center gap-2.5 text-[14px] text-secondary select-none" role="status" aria-live="polite">
      <GhostLoader size={26} intensity="normal" />
      <span className={`xq-status-text inline-block ${leaving ? "xq-status-leave" : "xq-status-enter"}`}>
        {statusLabel(display, lang)}
      </span>
    </span>
  );
}

export function nextStage(current: StatusStage): StatusStage {
  const i = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)];
}

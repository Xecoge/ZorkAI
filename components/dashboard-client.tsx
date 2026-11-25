"use client";

import { useEffect, useState } from "react";

export function DashboardClient() {
  const [data, setData] = useState<{ usage: { used: number; pool: number; chatCount: number; msgCount: number; projectCount: number; imageCount: number }; plan: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/usage").then((r) => r.json()).then(setData).catch(() => setError("Usage could not be loaded."));
  }, []);

  if (error) return <p role="alert" className="text-[13px] text-danger">{error}</p>;
  if (!data) return <UsageSkeleton />;

  const { usage, plan } = data;
  const pct = Math.min(100, Math.round((usage.used / usage.pool) * 100));

  return (
    <div className="pt-2">
      <div className="rounded-2xl border border-line p-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[14px] text-secondary">Weekly usage · {plan === "free" ? "Free" : plan} plan</p>
          <p className="text-[13px] text-tertiary tabular-nums">{usage.used} / {usage.pool} requests</p>
        </div>
        <div className="h-2 rounded-full bg-chrome overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-[13px] text-tertiary">One shared pool across chat and imagine. Resets Monday.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <Stat label="Chats this week" value={usage.chatCount} />
        <Stat label="Messages this week" value={usage.msgCount} />
        <Stat label="Projects" value={usage.projectCount} />
        <Stat label="Images this week" value={usage.imageCount} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-[24px] font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-[12px] text-tertiary mt-0.5">{label}</p>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div className="pt-2 animate-pulse">
      <div className="h-[120px] rounded-2xl bg-pane border border-line" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[90px] rounded-2xl bg-pane border border-line" />
        ))}
      </div>
    </div>
  );
}

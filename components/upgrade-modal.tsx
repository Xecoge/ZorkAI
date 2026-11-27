"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Sparkles, Ghost as GhostIcon } from "lucide-react";
import { GhostLoader } from "./ghost";

export type PlanOffer = {
  id: string;
  name: string;
  priceCents: number;
  priceAfterPromoCents: number;
  promoPercent: number;
  monthlyCredits: number;
  buildRuns: number;
  features: string[];
  blurb: string;
};

// One offer only: Max. Activating it is free during launch, permanent, and
// stored in the database, so it follows the account across every device.
export function UpgradeModal({
  open,
  currentPlan,
  onClose,
}: {
  open: boolean;
  currentPlan: string;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<PlanOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(currentPlan === "max");
  const [notice, setNotice] = useState("");
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  useEffect(() => clearCloseTimer, []);

  useEffect(() => {
    if (!open) return;
    clearCloseTimer();
    setClosing(false);
    setActivated(currentPlan === "max");
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        const max = (d.plans ?? []).find((p: PlanOffer) => p.id === "max");
        setPlan(max ?? null);
      })
      .catch(() => setNotice("Could not load the plan."));
  }, [open, currentPlan]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!open) return null;

  function close() {
    setClosing(true);
    clearCloseTimer();
    closeTimer.current = setTimeout(onClose, 170);
  }

  async function activate() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/upgrade", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "Could not activate Max right now.");
        return;
      }
      setActivated(true);
      setNotice(data.already ? "Max is already active on this account." : "Max activated — yours forever.");
      setTimeout(() => window.location.reload(), 1100);
    } catch {
      setNotice("Could not activate Max right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/55 flex items-center justify-center px-3 py-6 overflow-y-auto ${closing ? "" : "fade-in"}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Get Max"
    >
      <div
        className={`w-full max-w-[460px] rounded-3xl border border-line bg-[#1c1c21] text-white shadow-pop p-5 md:p-7 my-auto ${closing ? "xq-modal-exit" : "xq-modal-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7cc0ff] rounded-full border border-[#7cc0ff33] px-2.5 py-1">
              <GhostIcon className="w-3.5 h-3.5" /> Launch offer — free forever
            </p>
            <h2 className="text-[24px] font-semibold tracking-tight mt-3">Max</h2>
            <p className="text-[14px] text-[#e8e9ee] mt-1">One activation. Stays on your account for good.</p>
          </div>
          <button onClick={close} aria-label="Close Max dialog" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10 text-white/85 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-[#1084fe] bg-[#1084fe0d] p-5 mt-6 flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-semibold tracking-tight">$0</span>
            <span className="text-[13px] text-[#c9cad1]">{activated ? "already yours" : "one time — no card"}</span>
          </div>
          {plan ? (
            <ul className="flex flex-col gap-2 text-[13px] text-[#edeef2]">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1084fe] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 flex justify-center">
              <GhostLoader size={28} />
            </div>
          )}
          <button
            onClick={activate}
            disabled={activated || busy}
            className={`h-10 rounded-full text-[14px] font-medium transition-opacity ${
              activated ? "bg-white/10 text-white/70 cursor-default" : "bg-white text-[#101013] hover:opacity-85 disabled:opacity-60"
            }`}
          >
            {activated ? "Max is active" : busy ? "Activating…" : "Activate Max — free"}
          </button>
          <p className="text-[11px] text-[#b9bbc4] leading-relaxed">
            Activation is stored in your account and never expires. Paid renewals open later; nothing is charged now.
          </p>
        </div>

        {notice && (
          <p role="status" className="mt-4 text-[13px] text-[#ffb86b] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" /> {notice}
          </p>
        )}
      </div>
    </div>
  );
}

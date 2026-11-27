"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Sparkles } from "lucide-react";
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

// The plan ladder: Free → Plus → Pro → Max (Xecoge Max is granted by staff,
// never sold). Picking a paid plan opens Stripe Checkout when payments are
// configured; until then the dialog says so instead of pretending.
export function UpgradeModal({
  open,
  currentPlan,
  onClose,
}: {
  open: boolean;
  currentPlan: string;
  onClose: () => void;
}) {
  const [plans, setPlans] = useState<PlanOffer[]>([]);
  const [busy, setBusy] = useState("");
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
    setNotice("");
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        const list: PlanOffer[] = d.plans ?? [];
        setPlans(list.filter((p) => p.id !== "xmax"));
      })
      .catch(() => setNotice("Could not load the plans."));
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!open) return null;

  function close() {
    setClosing(true);
    clearCloseTimer();
    closeTimer.current = setTimeout(onClose, 170);
  }

  async function choose(planId: string) {
    setBusy(planId);
    setNotice("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data.error || "Could not start checkout.");
    } catch {
      setNotice("Could not start checkout.");
    } finally {
      setBusy("");
    }
  }

  const price = (p: PlanOffer) =>
    p.id === "free" ? "$0" : `$${(p.priceAfterPromoCents / 100).toFixed(0)}`;

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/55 flex items-center justify-center px-3 py-6 overflow-y-auto ${closing ? "" : "fade-in"}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Plans"
    >
      <div
        className={`w-full max-w-[720px] rounded-3xl border border-line bg-[#1c1c21] text-white shadow-pop p-5 md:p-7 my-auto ${closing ? "xq-modal-exit" : "xq-modal-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7cc0ff] rounded-full border border-[#7cc0ff33] px-2.5 py-1">
              <Sparkles className="w-3.5 h-3.5" /> Plans
            </p>
            <h2 className="text-[24px] font-semibold tracking-tight mt-3">Pick your plan</h2>
            <p className="text-[14px] text-[#e8e9ee] mt-1">Change plans any time. The launch promotion is already applied.</p>
          </div>
          <button onClick={close} aria-label="Close plans dialog" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10 text-white/85 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="py-10 flex justify-center">
            <GhostLoader size={28} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 mt-6">
            {plans.map((p) => {
              const active = p.id === currentPlan;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 flex flex-col gap-3 ${active ? "border-[#1084fe] bg-[#1084fe0d]" : "border-line bg-white/[0.03]"}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[16px] font-semibold">{p.name}</span>
                    <span className="text-[13px] text-[#c9cad1]">
                      {p.id !== "free" && p.promoPercent > 0 && (
                        <s className="mr-1.5 opacity-60">${(p.priceCents / 100).toFixed(0)}</s>
                      )}
                      {price(p)}
                      {p.id !== "free" && "/mo"}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#b9bbc4]">{p.blurb}</p>
                  <ul className="flex flex-col gap-1.5 text-[12.5px] text-[#edeef2]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#1084fe] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => choose(p.id)}
                    disabled={active || busy !== ""}
                    className={`mt-auto h-9 rounded-full text-[13px] font-medium transition-opacity ${
                      active ? "bg-white/15 text-white/90 cursor-default" : "bg-white text-[#101013] hover:opacity-85 disabled:opacity-60"
                    }`}
                  >
                    {active ? "Current plan" : busy === p.id ? "Opening checkout…" : p.id === "free" ? "Switch to Free" : `Choose ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {notice && (
          <p role="status" className="mt-4 text-[13px] text-[#ffb86b] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {notice}
          </p>
        )}

        <p className="text-[11px] text-[#b9bbc4] leading-relaxed mt-4">
          Xecoge Max is granted by the owner from the admin panel, not sold here.
        </p>
      </div>
    </div>
  );
}

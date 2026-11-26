"use client";

import { useEffect, useState } from "react";
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

const money = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

// Centered upgrade modal: premium dark cards, entrance/exit animation,
// original + discounted pricing, real checkout when Stripe is configured.
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
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setNotice("Could not load plans."));
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(t);
  }, [notice]);

  if (!open) return null;

  function close() {
    setClosing(true);
    setTimeout(onClose, 170);
  }

  async function checkout(planId: string) {
    setBusyPlan(planId);
    setNotice("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data.error || "Checkout is unavailable right now.");
    } catch {
      setNotice("Checkout is unavailable right now.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/55 flex items-center justify-center px-3 py-6 overflow-y-auto ${closing ? "" : "fade-in"}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade your plan"
    >
      <div
        className={`w-full max-w-[880px] rounded-3xl border border-line bg-[#101013] text-white shadow-pop p-5 md:p-7 my-auto ${closing ? "xq-modal-exit" : "xq-modal-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7cc0ff] rounded-full border border-[#7cc0ff33] px-2.5 py-1">
              <GhostIcon className="w-3.5 h-3.5" /> Limited offer — 50% OFF Premium
            </p>
            <h2 className="text-[24px] font-semibold tracking-tight mt-3">Choose your plan</h2>
            <p className="text-[14px] text-white/70 mt-1">More credits, frontier models and higher limits. Cancel anytime.</p>
          </div>
          <button onClick={close} aria-label="Close upgrade dialog" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10 text-white/70 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-6">
          {plans.length === 0 ? (
            <div className="md:col-span-3 py-14 flex justify-center">
              <GhostLoader size={36} />
            </div>
          ) : (
            plans.filter((p) => p.id !== "free").map((p) => {
              const isCurrent = p.id === currentPlan;
              const highlight = p.id === "pro";
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                    highlight ? "border-[#1084fe] bg-[#1084fe0d]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  {highlight && (
                    <span className="absolute -top-2.5 left-4 text-[11px] font-semibold bg-[#1084fe] text-white rounded-full px-2 py-0.5">
                      Most popular
                    </span>
                  )}
                  <div>
                    <p className="text-[15px] font-semibold">{p.name}</p>
                    <p className="text-[12px] text-white/50">{p.blurb}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-semibold tracking-tight">{money(p.priceAfterPromoCents)}</span>
                    <span className="text-[14px] text-white/40 line-through">{money(p.priceCents)}</span>
                    <span className="text-[12px] text-white/50">/mo</span>
                  </div>
                  <ul className="flex flex-col gap-2 text-[13px] text-white/85">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#1084fe] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => checkout(p.id)}
                    disabled={isCurrent || busyPlan !== null}
                    className={`mt-auto h-10 rounded-full text-[14px] font-medium transition-opacity ${
                      isCurrent
                        ? "bg-white/10 text-white/50 cursor-default"
                        : "bg-white text-[#101013] hover:opacity-85 disabled:opacity-60"
                    }`}
                  >
                    {busyPlan === p.id ? "Opening checkout…" : isCurrent ? "Current plan" : `Get ${p.name}`}
                  </button>
                </div>
              );
            })
          )}
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
